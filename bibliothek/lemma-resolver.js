/* Dictionary-backed candidates, pronoun clues and separable verb groups. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const formsOf = entry => ({...(entry?.lookup_forms || {}),...(entry?.forms || {})});
  const posMap = { adj:"Adjektiv", adv:"Adverb", conj:"Konjunktion", pron:"Pronomen", det:"Pronomen", noun:"Nomen", name:"Nomen", verb:"Verb", adjective:"Adjektiv", adverb:"Adverb", conjunction:"Konjunktion", pronoun:"Pronomen" };
  const ownOnlyVerbs = new Set(["haben","sein"]);
  const canonicalPos = value => posMap[value] || value || "";
  // Only identified grammatical classes may supplement an existing own match.
  const knownPartsOfSpeech = new Set(["Verb","Nomen","Pronomen","Adjektiv","Adverb","Konjunktion",
    "prep","num","intj","particle","article"]);
  function savedCandidate(saved, resolution) {
    const exact = resolution.candidates.find(c => window.BibliothekVocabulary.identity(c) === saved);
    if (exact) return exact;
    let identity;
    try { identity = JSON.parse(saved); } catch (_) { return null; }
    if (!Array.isArray(identity)) return null;
    if (identity[0] === "main") return resolution.candidates.find(c => c.item?.alias_ids?.includes(identity[1])) || null;
    if (identity[0] !== "fallback") return null;
    const own = resolution.candidates.filter(c => c.source === "main" &&
      norm(c.lemma) === norm(identity[1]) && canonicalPos(c.pos) === canonicalPos(identity[2]));
    return own.length === 1 ? own[0] : null;
  }
  function calendarDateLength(word,tail) {
    if(!['am','zum'].includes(norm(word)))return 0;
    const date=String(tail).match(/^[ \t]+([1-9]|[12][0-9]|3[01])\.[ \t]+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?=$|[^\p{L}\p{M}])/u);
    if(!date)return 0;
    const limit={Februar:29,April:30,Juni:30,September:30,November:30}[date[2]]||31;
    return Number(date[1])<=limit?date[0].length:0;
  }
  function create(entries, fallback) {
    const forms = new Map(), lemmas = new Map(), zuForms = new Map(), separatedForms = new Map(), byId = new Map(entries.map(entry => [String(entry.id),entry]));
    // Lexical discovery is dictionary-driven; contextual confirmation is separate.
    const reflexivePronouns = new Set(["mich","mir","dich","dir","sich","uns","euch"]);
    const reflexiveEntries = new Set(entries.filter(e => e.type === "Verb" && /^sich\s+/u.test(norm(e.word))));
    const reflexiveLemmas = new Map();
    for (const entry of reflexiveEntries) {
      const base = norm(entry.word).replace(/^sich\s+/u, "");
      const rows = reflexiveLemmas.get(base) || [];
      rows.push(entry); reflexiveLemmas.set(base, rows);
    }
    const reflexiveForms = new Map();
    const verbAnalyses = new Map(), separableBases = new Map();
    const modalLemmas = new Set(["können","müssen","dürfen","sollen","wollen","mögen"]);
    function addAnalysis(form, row) {
      const key = norm(form), rows = verbAnalyses.get(key) || [];
      if (!rows.some(r => r.entry === row.entry && r.kind === row.kind && r.person === row.person && r.tense === row.tense && r.detached === row.detached)) rows.push(row);
      verbAnalyses.set(key, rows);
    }
    function indexVerb(entry) {
      const base = norm(entry.word).replace(/^sich\s+/u,""), phrase = base.split(/\s+/u);
      const common = {entry,base,compound:phrase.length > 1 ? phrase.slice(0,-1) : []};
      const table = formsOf(entry);
      let prefix = entry.separable_prefix || null;
      for (const [tense,group] of Object.entries(table)) for (const [person,value] of Object.entries(group || {})) {
        const parts = norm(value).replace(/[.!?]+$/u,"").split(/\s+/u), stem = parts[0];
        if (!/^[\p{L}\p{M}]+$/u.test(stem)) continue;
        const tail = parts.at(-1);
        const detached = parts.length > 1 && !reflexivePronouns.has(tail) && tail !== "sie" && phrase.length === 1 && base.startsWith(tail);
        if (detached) prefix = tail;
        const row = {...common,person:person === "Sie" ? "sie" : person,kind:tense === "Imperativ" ? "imperative" : "finite",tense,prefix:detached ? tail : null,detached};
        addAnalysis(stem,row);
        if (detached && tense !== "Imperativ") addAnalysis(tail+stem,{...row,detached:false});
        // Dictionary-backed regular short imperatives; do not invent irregular stems.
        if (tense === "Präsens" && person === "ich" && stem.endsWith("e")) {
          const second = norm(group.du).split(/\s+/u)[0].replace(/(?:est|st|t)$/u,"");
          if (second === stem.slice(0,-1) && !/[dt]$/u.test(second)) addAnalysis(stem.slice(0,-1),{...row,person:"du",kind:"imperative",tense:"Imperativ"});
        }
        if (tense === "Präsens" && person === "ihr") addAnalysis(stem,{...row,kind:"imperative",tense:"Imperativ"});
      }
      const infinitive = phrase.at(-1);
      addAnalysis(infinitive,{...common,kind:"infinitive",tense:"Infinitiv",prefix:null,detached:false});
      if (prefix && phrase.length === 1) addAnalysis(prefix+"zu"+base.slice(prefix.length),{...common,kind:"infinitive",tense:"Infinitiv",zu:true,detached:false});
      const participle = norm(entry.perfect_form).split(/\s+/u).at(-1);
      if (participle) addAnalysis(participle,{...common,kind:"participle",tense:"Partizip II",detached:false});
    }
    function addReflexive(form,row) {
      const key = norm(form), rows = reflexiveForms.get(key) || [];
      if (!rows.some(r => r.entry === row.entry && r.person === row.person && r.pronoun === row.pronoun && r.tense === row.tense)) rows.push(row);
      reflexiveForms.set(key,rows);
    }
    // Derived modifiers are not exact verb forms: keep their role separate from
    // the dictionary identity, and require nominal context before choosing them.
    const modifiers = new Map(), endings = ["e","en","em","er","es"];
    function addModifier(stem, entry, kind) {
      if (!/^[\p{L}\p{M}]+$/u.test(stem)) return;
      for (const ending of endings) {
        const key = norm(stem + ending), rows = modifiers.get(key) || [];
        if (!rows.some(row => row.entry.id === entry.id && row.kind === kind && row.ending === ending))
          rows.push({entry,kind,ending,base:stem});
        modifiers.set(key,rows);
      }
    }
    function add(map, form, entry) {
      const key = norm(form);
      if (!key) return;
      const matches = map.get(key) || [];
      if (!matches.some(item => item.id === entry.id)) matches.push(entry);
      map.set(key, matches);
    }
    for (const entry of entries) {
      for (const id of entry.alias_ids || []) byId.set(String(id),entry);
      add(lemmas, entry.word, entry); add(forms, entry.word, entry);
      for (const form of entry.search_forms || []) add(forms, form, entry);
      if (entry.type === "Adjektiv") {
        const word = norm(entry.word);
        // Invariant colour/loan adjectives do not acquire regular endings.
        if (!new Set(["rosa","lila","prima","extra","super","gratis","klasse"]).has(word)) {
          const stem = word === "hoch" ? "hoh" : word.endsWith("e") ? word.slice(0,-1) : word;
          addModifier(stem,entry,"adjective");
          if (word.endsWith("el")) addModifier(word.slice(0,-2)+"l",entry,"adjective");
          if (["teuer","sauer"].includes(word)) addModifier(word.slice(0,-2)+"r",entry,"adjective");
        }
        if (entry.comparative) addModifier(norm(entry.comparative),entry,"comparative");
        if (entry.superlative) addModifier(norm(entry.superlative).replace(/^am /u,"").replace(/en$/u,""),entry,"superlative");
      }
      if (entry.type === "Nomen" && entry.plural && entry.plural !== "—") {
        for (const plural of entry.plural.split(/\s*,\s*/)) {
          add(forms, plural, entry);
          if (/^[\p{L}\p{M}]+$/u.test(plural) && !/[ns]$/iu.test(plural)) add(forms, plural + "n", entry);
        }
      }
      if (entry.type === "Verb") {
        indexVerb(entry);
        if (reflexiveEntries.has(entry)) {
          for (const [tense,group] of Object.entries(formsOf(entry))) for (const [person,form] of Object.entries(group || {})) {
            const parts = norm(form).replace(/[.!?]+$/u, "").split(/\s+/u);
            const pronoun = parts.find(part => reflexivePronouns.has(part));
            if (pronoun && /^[\p{L}\p{M}]+$/u.test(parts[0])) {
              const row = {entry,tense,person,pronoun,simple:parts.length === 2};
              addReflexive(parts[0],row);
              // A dictionary-backed detached prefix also proves its joined form.
              const base = norm(entry.word).replace(/^sich\s+/u, "");
              const prefix = parts.at(-1);
              if (parts.length === 3 && parts[1] === pronoun && base.startsWith(prefix) && !base.includes(" "))
                addReflexive(prefix + parts[0],{...row,simple:false});
            }
          }
          addReflexive(norm(entry.word).replace(/^sich\s+/u,""),{entry,tense:"Infinitiv"});
          const participle = String(entry.perfect_form || "").trim().split(/\s+/u).pop();
          if (participle) addReflexive(participle,{entry,tense:"Partizip II"});
        }
        const provenPrefixes = new Set(entry.separable_prefix ? [entry.separable_prefix] : []);
        for (const [tense,group] of Object.entries(formsOf(entry))) {
          for (const form of Object.values(group || {})) {
            // Do not index a separated verb's stem as the whole verb.
            const clean = String(form).replace(/[.!?]+$/g, "").trim();
            if (/^[\p{L}\p{M}]+$/u.test(clean)) add(forms, clean, entry);
            const parts = clean.split(/\s+/);
            if (parts.length === 2 && parts.every(part => /^[\p{L}\p{M}]+$/u.test(part)) &&
              !entry.word.includes(" ") && norm(entry.word).startsWith(norm(parts[1]))) {
              const stem = norm(parts[0]), prefix = norm(parts[1]);
              provenPrefixes.add(prefix);
              const pairs = separatedForms.get(stem) || [];
              if (!pairs.some(pair => pair.entry.id === entry.id && pair.prefix === prefix)) pairs.push({entry,prefix});
              separatedForms.set(stem,pairs);
              if (tense !== "Imperativ") add(forms,prefix + stem,entry);
            }
          }
        }
        for (const prefix of provenPrefixes) {
          if (norm(entry.word).startsWith(prefix)) {
            const zuForm = prefix + "zu" + norm(entry.word).slice(prefix.length);
            add(forms,zuForm,entry); add(zuForms,zuForm,entry);
          }
        }
        // Reviewed form from the Vielseitige Verben table: passive uses
        // worden; ordinary becoming retains geworden.
        if (norm(entry.word) === "werden") add(forms,"worden",entry);
        const participle = String(entry.perfect_form || "").trim().split(/\s+/).pop();
        if (participle) add(forms, participle, entry);
        if (participle) addModifier(participle,entry,"participle-II");
        const infinitive = norm(entry.word);
        if (/^[\p{L}\p{M}]+(?:en|eln|ern)$/u.test(infinitive) || ["sein","tun"].includes(infinitive))
          addModifier(({sein:"seiend",tun:"tuend"})[infinitive] || infinitive+"d",entry,"participle-I");
      }
    }
    const mainCandidate = item => item.importedSeparable ? {
      source:"fallback",lemma:item.word,pos:"verb",posLabel:"Verb",meanings:item.meanings,
      translation:{en:item.meanings.join("; "),ru:""}
    } : ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, posLabel:item.parts_of_speech?.join(" / ") || item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item,
      ...(reflexiveEntries.has(item) ? {reflexiveLexical:{baseLemma:norm(item.word).replace(/^sich\s+/u,""),evidence:"dictionary-reflexive-lemma"}} : {}) });
    const grammaticalWords = new Set(['ich','du','er','sie','es','wir','ihr','man','wer','mich','mir','dich','dir','sich','uns','euch','der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','zu','und','oder','aber','denn','sondern','doch','weil','dass','wenn','ob','als','bevor','nachdem']);
    const prepositions = new Set(['mit','für','von','an','auf','bei','zu','ohne','gegen','um','über','unter','neben','zwischen','nach','aus','in','vor','hinter','seit','durch','im','am','beim','zum','zur','vom','ins','ans','aufs']);
    const lookupCache = new Map(), grammarCache = new Map();
    let lookupFailures = 0;
    function lexicalLookup(word) {
      const key = norm(word);
      if (!lookupCache.has(key)) {
        if (lookupCache.size >= 512) lookupCache.delete(lookupCache.keys().next().value);
        const pending = Promise.resolve().then(()=>fallback.lookup(word));
        lookupCache.set(key,pending);
        pending.catch(()=>{lookupFailures++;if (lookupCache.get(key) === pending) lookupCache.delete(key);});
      }
      return lookupCache.get(key);
    }
    // Shared morphology inventory. Discovery never implies a syntactic role or
    // an automatic sense choice. IDs remain those of the underlying dictionary.
    async function collectMorphology(word, {discoverModifiers = false, external = true} = {}) {
      const key = norm(word), analyses = [], candidates = [], errors = [];
      const addCandidate = candidate => {
        const id = window.BibliothekVocabulary.identity(candidate);
        if (!candidates.some(c => window.BibliothekVocabulary.identity(c) === id)) candidates.push(candidate);
      };
      const addRow = row => {
        if (!analyses.some(a => JSON.stringify(a) === JSON.stringify(row))) analyses.push(row);
      };
      for (const entry of forms.get(key) || []) {
        addCandidate(mainCandidate(entry));
        addRow({form:word,lemma:entry.word,pos:entry.type,dictionaryId:entry.id,
          source:'main',kind:key === norm(entry.word) ? 'lemma' : 'dictionary-form',evidence:'dictionary-index'});
      }
      for (const {entry,base,kind,person,tense,zu,detached} of verbAnalyses.get(key) || [])
        addRow({form:word,lemma:entry.word,pos:'Verb',dictionaryId:entry.id,source:'main',
          kind,base,person,tense,zu,detached,evidence:'dictionary-verb-table'});
      for (const {entry,base,kind,ending} of modifiers.get(key) || []) {
        addCandidate(mainCandidate(entry));
        addRow({form:word,lemma:entry.word,pos:entry.type,dictionaryId:entry.id,source:'main',
          kind,base,ending,evidence:'dictionary-derived-modifier'});
      }
      const read = async form => {
        try { return await lexicalLookup(form); }
        catch (error) { errors.push({form,message:String(error.message || error)}); return []; }
      };
      const groups = external ? await read(word) : [];
      const lexical = groups.filter(g => !g.kind && !g.unresolved && g.meanings?.length);
      const candidateFor = group => {
        const own = (lemmas.get(norm(group.word)) || []).filter(e => e.type === canonicalPos(group.pos));
        const found = own.length ? own.map(mainCandidate) : [{source:'fallback',lemma:group.word,
          pos:group.pos,posLabel:canonicalPos(group.pos),meanings:[...group.meanings],
          translation:{en:group.meanings.join('; '),ru:''}}];
        for (const candidate of found) addCandidate(candidate);
        return found;
      };
      for (const group of lexical) {
        candidateFor(group);
        if (norm(group.word) === key) addRow({form:word,lemma:group.word,pos:canonicalPos(group.pos),
          source:'fallback',kind:'lemma',evidence:'dictionary-lexeme'});
      }
      const inflections = groups.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || []);
      for (const row of inflections) {
        // An explicit form relation and a lexical target must agree on POS.
        if (norm(row.form) !== key || !lexical.some(g => norm(g.word) === norm(row.lemma) && canonicalPos(g.pos) === canonicalPos(row.pos))) continue;
        addRow({...row,form:word,pos:canonicalPos(row.pos),tags:[...(row.tags || [])],
          kind:'inflection',evidence:'dictionary-inflection-link'});
      }
      if (discoverModifiers && external && /^[\p{L}\p{M}]+$/u.test(key)) {
        // Suffix removal generates bounded lookup hypotheses only. A lexical
        // adjective or an explicit participle link must confirm each result.
        const hypotheses = new Map();
        for (const ending of endings) if (key.endsWith(ending) && key.length > ending.length+1) {
          const stem = key.slice(0,-ending.length);
          for (const base of [stem,stem+'e']) {
            const rows = hypotheses.get(base) || []; rows.push({stem,ending}); hypotheses.set(base,rows);
          }
        }
        for (const [base,relations] of hypotheses) {
          const discovered = await read(base);
          for (const group of discovered.filter(g => !g.kind && !g.unresolved && g.meanings?.length &&
            canonicalPos(g.pos) === 'Adjektiv' && norm(g.word) === base)) {
            // Keep the same invariant-adjective policy as the own index.
            if (new Set(['rosa','lila','prima','extra','super','gratis','klasse']).has(base)) continue;
            const stem = base === 'hoch' ? 'hoh' : base.endsWith('e') ? base.slice(0,-1) : base;
            for (const relation of relations.filter(r => r.stem === stem)) {
              const targets = candidateFor(group);
              for (const target of targets) addRow({form:word,lemma:target.lemma,pos:'Adjektiv',
                source:target.source,...(target.dictionaryId ? {dictionaryId:target.dictionaryId} : {}),
                kind:'adjective',base:stem,ending:relation.ending,evidence:'verified-lexeme-regular-ending'});
            }
          }
          const links = discovered.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
            .filter(r => norm(r.form) === base && canonicalPos(r.pos) === 'Verb' && r.tags?.includes('participle'));
          for (const link of links) for (const group of discovered.filter(g => !g.kind && !g.unresolved &&
            g.meanings?.length && canonicalPos(g.pos) === 'Verb' && norm(g.word) === norm(link.lemma)))
            for (const relation of relations.filter(r => r.stem === base))
              for (const target of candidateFor(group)) addRow({form:word,lemma:target.lemma,pos:'Verb',
                source:target.source,...(target.dictionaryId ? {dictionaryId:target.dictionaryId} : {}),
                kind:'participle-declined',base,ending:relation.ending,tags:[...link.tags],
                evidence:'verified-participle-link-regular-ending'});
        }
      }
      return {form:word,analyses,candidates,groups,inflections,errors};
    }
    async function tokenAnalyses(word, lookup = lexicalLookup) {
      const key = norm(word), result = [...(verbAnalyses.get(key) || [])];
      for(const entry of zuForms.get(key)||[])result.push({entry,base:norm(entry.word).replace(/^sich\s+/u,''),compound:[],kind:'infinitive',tense:'Infinitiv',zu:true,detached:false});
      // Own-only display policy does not imply complete grammatical morphology.
      // Keep fallback person/mood evidence for auxiliaries out of UI candidates,
      // while allowing it to control a confirmed lexical participle.
      if (grammaticalWords.has(key) || prepositions.has(key)) return result;
      const ownAuxiliary=result.find(a=>a.entry&&!a.detached&&ownOnlyVerbs.has(a.base));
      if(ownAuxiliary) {
        try {
          const evidence=fallback.auxiliaryInflections?await fallback.auxiliaryInflections(word):[];
          for(const a of evidence.filter(a=>a.lemma===ownAuxiliary.base)) {
            const person=({'first-person':a.number==='plural'?'wir':'ich','second-person':a.number==='plural'?'ihr':'du','third-person':a.number==='plural'?'sie':'er/sie/es'})[a.person];
            const tense=/^subjunctive/u.test(a.mood||'')?a.mood==='subjunctive-ii'||a.tense==='past'||a.tense==='preterite'?'Konjunktiv II':'Konjunktiv I':a.tense==='past'||a.tense==='preterite'?'Präteritum':'Präsens';
            if(person&&!result.some(r=>r.base===a.lemma&&r.kind==='finite'&&r.person===person&&r.tense===tense))result.push({...ownAuxiliary,kind:'finite',person,tense,mood:a.mood});
          }
        } catch (_) { /* Own morphology remains usable when the supplement is unavailable. */ }
        return result;
      }

      // Capitalised dictionary nouns are not silently reinterpreted as predicates.
      if (!result.length && word[0] !== key[0] && (forms.get(key) || []).some(e=>e.type === 'Nomen')) return result;
      if(!result.length && fallback.mayBeVerb && !lookupCache.has(key) && !await fallback.mayBeVerb(word))return result;
      let groups;
      try { groups = await lookup(word); } catch (_) { return result; }
      const evidence = groups.filter(g=>g.kind === 'form-note').flatMap(g=>g.inflections || []);
      for (const g of groups.filter(g=>!g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length)) {
        const base = norm(g.word).replace(/^sich\s+/u,''), candidate = {source:'fallback',lemma:g.word,pos:g.pos,posLabel:'Verb',meanings:g.meanings,
          translation:{en:g.meanings.join('; '),ru:''},reflexiveLexical:{baseLemma:base,evidence:/^sich\s+/u.test(norm(g.word))?'dictionary-reflexive-lemma':'base-verb-only'}};
        const common = {base,candidate,compound:[]};
        for (const a of evidence.filter(a=>norm(a.lemma) === base && canonicalPos(a.pos) === 'Verb')) {
          const person = a.person && a.number ? ({'first-person':a.number === 'plural'?'wir':'ich','second-person':a.number === 'plural'?'ihr':'du','third-person':a.number === 'plural'?'sie':'er/sie/es'})[a.person] : null;
          const kind = a.tags.includes('participle') ? 'participle' : a.mood === 'imperative' ? 'imperative' : a.tags.includes('infinitive')||a.tags.includes('infinitive-zu') ? 'infinitive' : person ? 'finite' : null;
          if (kind) {
            const row={...common,kind,person:person || (kind === 'imperative' ? a.number === 'plural'?'ihr':'du' : null),tense:/^subjunctive/u.test(a.mood || '') ? a.mood === 'subjunctive-ii' || a.tense === 'past' || a.tense === 'preterite' ? 'Konjunktiv II' : 'Konjunktiv I' : a.tense === 'past'||a.tense === 'preterite'?'Präteritum':'Präsens',mood:a.mood,zu:a.tags.includes('infinitive-zu'),detached:false};
            result.push(row);
            // Explicit regular second-person evidence can disambiguate a
            // syncretic third-person spelling omitted from the export tags.
            const stem=base.replace(/(?:en|n)$/u,''),second=stem+(/[sßxz]$/u.test(stem)?'t':'st');
            if(kind==='finite'&&a.tense==='present'&&a.mood==='indicative'&&key===stem+'t') {
              let proven=person==='du'&&key===second;
              if(!proven&&person==='ihr')try {
                const secondGroups=await lookup(second);
                proven=secondGroups.filter(g=>g.kind==='form-note').flatMap(g=>g.inflections||[]).some(r=>norm(r.lemma)===base&&r.person==='second-person'&&r.number==='singular'&&r.tense==='present'&&r.mood==='indicative');
              } catch (_) { /* Missing evidence does not imply regularity. */ }
              if(proven)result.push({...row,person:'er/sie/es'});
            }
          }
        }
        if (key === base) {
          result.push({...common,kind:'infinitive',tense:'Infinitiv',detached:false});
          if (/^[\p{L}\p{M}]+(?:en|eln|ern)$/u.test(base)) for (const person of ['wir','sie']) result.push({...common,kind:'finite',person,tense:'Präsens',detached:false});
        }
      }
      return result;
    }
    const subjectPersons = {ich:['ich'],du:['du'],er:['er/sie/es'],sie:['er/sie/es','sie'],es:['er/sie/es'],wir:['wir'],ihr:['ihr'],man:['er/sie/es'],wer:['er/sie/es'],was:['er/sie/es']};
    const pronounPersons = {mich:'ich',mir:'ich',dich:'du',dir:'du',sich:'third',uns:'wir',euch:'ihr'};
    const determiners = /^(?:der|die|das|ein|eine|kein|keine|mein(?:e)?|dein(?:e)?|sein(?:e)?|ihr(?:e)?|unser(?:e)?|euer(?:e)?|viele|beide|alle|einige|mehrere|etliche|diese|dieser|dieses|dessen|deren)$/u;
    async function analyseReflexiveSentence(sentence,diagnostic=null) {
      const tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)], words = tokens.map(t=>norm(t[0]));
      if (!words.some(w=>reflexivePronouns.has(w))) return [];
      const analyses = await Promise.all(tokens.map(t=>tokenAnalyses(t[0])));
      // Morphological homographs such as meine/meinen and Buch/Arbeit must
      // remain determiners/nouns inside an identifiable noun phrase.
      for(let i=0;i<tokens.length;i++) {
        if (/^(?:mein|dein|sein|ihr|unser|euer)(?:e|en|em|er|es)?$/u.test(words[i]) &&
          tokens.slice(i+1,i+4).some(t=>t[0][0]!==norm(t[0])[0]&&(forms.get(norm(t[0]))||[]).some(e=>e.type==='Nomen')))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]&&(forms.get(words[i])||[]).some(e=>e.type==='Nomen')&&
          i>0&&(determiners.test(words[i-1])||prepositions.has(words[i-1])))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]) {
          let d=i-1;
          while(d>=0&&i-d<=3&&!/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d])&&/[\p{L}\p{M}]+(?:e|en|em|er|es)$/u.test(words[d]))d--;
          const nominal=(forms.get(words[i])||[]).some(e=>e.type==='Nomen') || prepositions.has(words[d]) ||
            /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d]);
          if(nominal&&d>=0&&i-d<=3&&(/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d])||prepositions.has(words[d]))) {analyses[i]=[];if(!prepositions.has(words[d]))analyses[d]=[];for(let j=d+1;j<i;j++)analyses[j]=[];}
        }
      }
      // A dictionary noun at the end of a written hyphen compound retains
      // its nominal role even when its spelling has a verbal continuation.
      for(let i=1;i<tokens.length;i++)if(tokens[i][0][0]!==words[i][0]&&
        tokens[i-1][0][0]!==words[i-1][0]&&
        /^\s*-\s*$/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index))) {
        const nominal=(forms.get(words[i])||[]).some(e=>e.type==='Nomen')||
          (await lexicalLookup(tokens[i][0]).catch(()=>[])).some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen');
        if(nominal)analyses[i]=[];
      }
      // Verified adjective/adverb modifiers inside a determiner+noun phrase
      // retain their nominal role even when their spelling is also a verb form.
      for(let i=0;i<tokens.length;i++)if(tokens[i][0][0]!==words[i][0]&&(forms.get(words[i])||[]).some(e=>e.type==='Nomen')){
        let d=i-1;while(d>=0&&i-d<=8&&(modifiers.has(words[d])||(forms.get(words[d])||[]).some(e=>['Adjektiv','Adverb'].includes(e.type))))d--;
        if(d>=0&&determiners.test(words[d])&&i-d<=8&&!/[,;:.!?]/u.test(sentence.slice(tokens[d].index,tokens[i].index)))for(let j=d+1;j<i;j++)analyses[j]=[];
      }
      const subordinators = new Set(['weil','dass','wenn','ob','als','bevor','nachdem','obwohl','während','sobald','damit','bis']);
      const coordinators = new Set(['und','oder','aber','denn','sondern']);
      const clauses = [];let start = 0, relation = 'root';
      for (let i=1;i<tokens.length;i++) {
        const gap = sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index);
        const nextBoundary=tokens.findIndex((t,j)=>j>i&&(/[,;:.!?…]/u.test(sentence.slice(tokens[j-1].index+tokens[j-1][0].length,t.index))||subordinators.has(words[j])||coordinators.has(words[j])));
        const leftFinite=analyses.slice(start,i).some(rows=>rows.some(a=>a.kind==='finite'));
        const rightFinite=analyses.slice(i+1,nextBoundary<0?tokens.length:nextBoundary).some(rows=>rows.some(a=>a.kind==='finite'));
        const nominalCoord=words[i]==='und'&&!/[,;:.!?]/u.test(gap)&&(!leftFinite||!rightFinite)&&
          (tokens[i-1][0][0]!==words[i-1][0]||subjectPersons[words[i-1]])&&
          (tokens[i+1]?.[0][0]!==words[i+1]?.[0]||subjectPersons[words[i+1]]);
        if (/[,;:.!?…“”„"«»()–—]/u.test(gap) || subordinators.has(words[i]) || coordinators.has(words[i])&&!nominalCoord) {
          clauses.push({start,end:i-1,relation});
          start=i;relation=/[;:.!?…]/u.test(gap)?'root':subordinators.has(words[i])?'subordinate':coordinators.has(words[i])?'coordinate':/^\s*,\s*$/u.test(gap)?'comma':'boundary';
        }
      }
      clauses.push({start,end:tokens.length-1,relation});
      // A comma-delimited nominal apposition without a predicate does not
      // sever an unfinished subject from its following finite predicate.
      for(let i=1;i+1<clauses.length;i++){
        const prior=clauses[i-1],aside=clauses[i],next=clauses[i+1];
        const verbal=c=>analyses.slice(c.start,c.end+1).some(rows=>rows.some(a=>['finite','participle','infinitive'].includes(a.kind)));
        if(aside.relation==='comma'&&next.relation==='comma'&&!verbal(prior)&&!verbal(aside)&&verbal(next)&&
          tokens[aside.start][0][0]!==words[aside.start][0]&&!subjectPersons[words[aside.start]]&&!['der','die','das'].includes(words[aside.start])){
          prior.insertions=[...(prior.insertions||[]),{start:aside.start,end:aside.end}];prior.end=next.end;clauses.splice(i,2);i--;
        }
      }
      for(const c of clauses)c.relative=c.relation==='comma'&&['der','die','das','den','dem','dessen','deren'].includes(words[c.start])&&
        (!(forms.get(words[c.start+1])||[]).some(e=>e.type==='Nomen')||['dessen','deren'].includes(words[c.start]));
      // A detached spelling may lack its own record while the proven joined
      // spelling has explicit inflection evidence in fallback (maßt ... an).
      for(const clause of clauses) for(let i=clause.start;i<clause.end;i++) {
        for(const pair of separatedForms.get(words[i]) || []) {
          if(words[clause.end]!==pair.prefix)continue;
          const joined=pair.prefix+words[i];
          for(const row of await tokenAnalyses(joined))if(row.base===norm(pair.entry.word))
            analyses[i].push({...row,prefix:pair.prefix,detached:true});
        }
      }
      if(diagnostic){diagnostic.tokens=tokens.map((t,i)=>({text:t[0],start:t.index,analyses:analyses[i].map(a=>({base:a.base,kind:a.kind,person:a.person,tense:a.tense}))}));diagnostic.clauses=clauses;diagnostic.attempts=[];}
      const beforePrep = i=>i>0&&prepositions.has(words[i-1]);
      function subjects(clause,person,inherit=true) {
        const firstFinite=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>analyses[i].some(a=>a.kind==='finite'));
        const conjunction=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>i>clause.start&&i<clause.end&&words[i]==='und'&&(firstFinite===undefined||i<firstFinite));
        if(conjunction!==undefined){
          const left={start:clause.start,end:conjunction-1},right={start:conjunction+1,end:firstFinite===undefined?clause.end:firstFinite-1};
          const l=['ich','du','wir','ihr','er/sie/es','sie'].flatMap(p=>subjects(left,p,false));
          const r=['ich','du','wir','ihr','er/sie/es','sie'].flatMap(p=>subjects(right,p,false));
          if(l.length===1&&r.length===1){const collective=[l[0].person,r[0].person].some(p=>['ich','wir'].includes(p))?'wir':[l[0].person,r[0].person].some(p=>['du','ihr'].includes(p))?'ihr':'sie';return collective===person?[{index:l[0].index,person,coordinated:true}]:[];}
          return [];
        }
        const found=[];let personal=false;
        for(let i=clause.start;i<=clause.end;i++) {
          if(clause.insertions?.some(r=>i>=r.start&&i<=r.end)||beforePrep(i))continue;
          if(words[i]==='ihr' && (forms.get(words[i+1])||[]).some(e=>e.type==='Nomen'))continue;
          if(subjectPersons[words[i]])personal=true;
          if((subjectPersons[words[i]] || []).includes(person)) {
            if(tokens[i][0]==='Sie'&&i!==clause.start&&person!=='sie')continue;
            // ihr before a noun is possessive, not a personal subject.
            if(words[i]==='ihr' && (forms.get(words[i+1])||[]).some(e=>e.type==='Nomen'))continue;
            found.push({index:i,person});
          }
        }
        if(personal) {
          // Later sie/es can be ordinary objects; do not reinterpret them as
          // additional subjects when an earlier personal subject is explicit.
          const first=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>subjectPersons[words[i]]&&!beforePrep(i)&&!(words[i]==='ihr'&&(forms.get(words[i+1])||[]).some(e=>e.type==='Nomen')));
          return found.filter(s=>s.index===first);
        }
        if(clause.relative&&['der','die','das'].includes(words[clause.start])&&
          (person==='er/sie/es'||person==='sie'&&words[clause.start]==='die'))return [{index:clause.start,person}];
        if(!['er/sie/es','sie'].includes(person)){
          const ci=clauses.indexOf(clause),prior=clauses[ci-1];
          if(inherit&&prior&&clause.relation==='coordinate'&&words[clause.start]==='und'&&!subjects(clause,'er/sie/es',false).length&&!subjects(clause,'sie',false).length)return subjects(prior,person);
          return [];
        }
        for(let i=clause.start;i<=clause.end;i++) {
          if(clause.insertions?.some(r=>i>=r.start&&i<=r.end)||beforePrep(i))continue;
          // Nouns within a prepositional/genitive phrase cannot become a
          // second subject merely because their article also has nominative uses.
          let embedded=false;
          for(let j=i-1;j>=clause.start;j--){
            if(analyses[j].some(a=>a.kind==='finite'))break;
            if(prepositions.has(words[j])&&!(words[j]==='vor'&&words[j+1]==='allem')){embedded=true;break;}
          }
          if(embedded)continue;
          if(!clause.insertions?.some(r=>i+1>=r.start&&i+1<=r.end)&&tokens[i+1]?.[0][0]!==words[i+1]?.[0]&&!analyses[i+1]?.length&&!determiners.test(words[i+1])&&!prepositions.has(words[i+1]))continue;
          const nounEntries=(forms.get(words[i])||[]).filter(e=>e.type==='Nomen');
          let det=i-1;while(det>=clause.start&&i-det<=8&&!prepositions.has(words[det])&&!reflexivePronouns.has(words[det])&&!determiners.test(words[det])&&!(analyses[det]||[]).length)det--;
          const hasDeterminer=det>=clause.start&&determiners.test(words[det]);
          if(hasDeterminer&&beforePrep(det))continue;
          if(hasDeterminer) {
            const eligible=nounEntries.filter(e=>{
              const plural=String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words[i]) &&
                (norm(e.word)!==words[i]||e.plural_only||words[det]==='die'&&e.article!=='die');
              if(plural&&!/^(?:die|viele|beide|alle|einige|mehrere|etliche|diese|\w+e)$/u.test(words[det]))return false;
              if(!plural&&['der','die','das','ein','eine','dieser','diese','dieses'].includes(words[det])) {
                const expected={der:['der','ein','dieser'],die:['die','eine','diese'],das:['das','ein','dieses']}[e.article];
                if(expected&&!expected.includes(words[det]))return false;
              }
              return plural?person==='sie':norm(e.word)===words[i]&&(person==='er/sie/es'||e.article==='die'&&!e.plural);
            });
            if(eligible.length||!nounEntries.length&&tokens[i][0][0]!==words[i][0]&&!analyses[i].length)found.push({index:i,person});
          } else if(nounEntries.some(e=>String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words[i])&&(norm(e.word)!==words[i]||e.plural_only))&&person==='sie')found.push({index:i,person});
          else if(!nounEntries.length && tokens[i][0][0]!==words[i][0] && !analyses[i].length && !grammaticalWords.has(words[i]) && !prepositions.has(words[i]) && !determiners.test(words[i]) &&
            !(forms.get(words[i])||[]).some(e=>['Adverb','Adjektiv','Pronomen'].includes(e.type)) && (i===clause.start||i>clause.start&&tokens[i-1][0][0]!==words[i-1][0]||analyses[i+1]?.some(a=>a.kind==='finite')||analyses[i-1]?.some(a=>a.kind==='finite')) && person==='er/sie/es') found.push({index:i,person});
        }
        if(!found.length&&inherit&&clause.relation==='coordinate'&&words[clause.start]==='und'){
          const ci=clauses.indexOf(clause),prior=clauses[ci-1];
          const explicitNominal=subjects(clause,'er/sie/es',false).length||subjects(clause,'sie',false).length;
          if(prior&&!explicitNominal){const previousSubjects=subjects(prior,person);if(previousSubjects.length===1)return previousSubjects;}
        }
        return found;
      }
      function subjectFor(clause,a,controller,allowImplicit) {
        const s=subjects(clause,a.person);
        if(s.length===1)return s[0];
        if(!s.length&&allowImplicit&&a.kind==='imperative'&&['du','ihr'].includes(a.person)&&
          (controller===clause.start||words[clause.start]==='bitte'))return {index:null,person:a.person,implicit:true};
        return null;
      }
      const relations=[];
      for(let ci=0;ci<clauses.length;ci++) {
        const clause=clauses[ci], previous=ci>0?clauses[ci-1]:null;
        const inherited=ci>1&&clause.relation==='comma'&&previous.relative&&
          !analyses.slice(clauses[ci-2].start,clauses[ci-2].end+1).some(rows=>rows.some(a=>['finite','infinitive','participle'].includes(a.kind)))
          ? clauses[ci-2] : null;
        for(let v=clause.start;v<=clause.end;v++) {
          let rows=[...analyses[v]];
          for(const a of analyses[v])for(const entry of reflexiveLemmas.get(a.base)||[])
            rows.push({...a,entry,candidate:null});
          for(const a of analyses[v])for(const pair of separableBases.get(a.base)||[]) {
            const own=reflexiveLemmas.get(norm(pair.entry.word))||[];
            for(const entry of own.length?own:[pair.entry])rows.push({...a,entry,candidate:null,base:norm(pair.entry.word),prefix:pair.prefix,detached:true,compound:[]});
          }
          // Prefer the perfect reading of a homographic finite form when a
          // matching auxiliary is present; competing predicates still block it.
          let helpers=[];
          for(let i=clause.start;i<=clause.end;i++)if(i!==v)for(const a of analyses[i])if(a.kind==='finite')helpers.push({index:i,analysis:a});
          helpers=helpers.filter((h,i,all)=>all.findIndex(x=>x.index===h.index&&x.analysis.base===h.analysis.base&&x.analysis.person===h.analysis.person)===i);
          helpers=helpers.filter(h=>subjects(clause,h.analysis.person).length===1||inherited&&subjects(inherited,h.analysis.person).length===1);
          for(const a of rows) {
            // Copulas/auxiliaries alone do not establish a lexical reflexive verb.
            if((['haben','sein','werden'].includes(a.base)||modalLemmas.has(a.base))&&!a.compound?.length)continue;
            const attempt=diagnostic?{verbStart:tokens[v].index,base:a.base,kind:a.kind,stage:'components'}:null;if(attempt)diagnostic.attempts.push(attempt);
            const componentIndices=[v];
            if(a.detached) {
              const p=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).filter(i=>i>v&&words[i]===a.prefix&&i===clause.end);
              if(p.length!==1)continue;componentIndices.push(p[0]);
            }
            let complete=true;
            for(const term of a.compound||[]) {
              const matches=[];for(let i=clause.start;i<=clause.end;i++)if(i!==v&&words[i]===term)matches.push(i);
              if(matches.length!==1){complete=false;break;}componentIndices.push(matches[0]);
            }
            if(!complete)continue;
            if(attempt)attempt.stage='controller';
            let controller=v,control=a,subjectClause=inherited&&!subjects(clause,a.person).length?inherited:clause,tense=a.tense,zuIndex=null;
            if(a.kind==='participle') {
              const auxiliary=norm(a.entry?.auxiliary || '').split(/\s+/u)[0];
              const h=helpers.filter(h=>['haben','sein'].includes(h.analysis.base)&&(!auxiliary||h.analysis.base===auxiliary));
              if(h.length!==1)continue;controller=h[0].index;control=h[0].analysis;
              tense=control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt';componentIndices.push(controller);
            } else if(a.kind==='infinitive') {
              const marker=a.zu||words[v-1]==='zu';
              const modal=helpers.filter(h=>modalLemmas.has(h.analysis.base));
              // Werden controls a bare lexical infinitive, never a participle
              // (passive) or a zu-infinitive. Forms must come from the dictionary.
              const future=marker?[]:helpers.filter(h=>h.analysis.base==='werden'&&
                ['Präsens','Konjunktiv I','Konjunktiv II'].includes(h.analysis.tense));
              if(marker&&helpers.some(h=>h.analysis.base==='werden'))continue;
              if(future.length&&v>clause.start&&tokens[v][0][0]!==words[v][0]) {
                const nominal=(forms.get(words[v])||[]).some(e=>e.type==='Nomen')||
                  (await lexicalLookup(tokens[v][0])).some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen');
                if(nominal)continue;
              }
              const replacement=a.compound?.length?helpers.filter(h=>h.analysis.base==='haben'):[];
              if(modal.length+future.length===1||replacement.length===1) {
                const h=modal[0]||future[0]||replacement[0];controller=h.index;control=h.analysis;componentIndices.push(controller);tense=replacement.length?(control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt'):future.length?control.tense==='Konjunktiv II'?'Konjunktiv II':control.tense==='Konjunktiv I'?'Futur I (Konjunktiv I)':'Futur I':control.tense;
              } else if(marker) {
                let host=helpers.filter(h=>!componentIndices.includes(h.index));
                if(!host.length&&previous&&clause.relation==='comma') {
                  subjectClause=previous;
                  host=[];for(let i=previous.start;i<=previous.end;i++)for(const row of analyses[i])if(row.kind==='finite')host.push({index:i,analysis:row});
                }
                // Equivalent inflection analyses of the same host are not two verbs.
                host=host.filter((h,i,all)=>all.findIndex(x=>x.index===h.index&&x.analysis.person===h.analysis.person&&x.analysis.base===h.analysis.base)===i);
                host=host.filter(h=>subjects(subjectClause,h.analysis.person).length===1);
                if(host.length!==1)continue;controller=host[0].index;control=host[0].analysis;tense='zu-Infinitiv';
                if(words[v-1]==='zu')zuIndex=v-1;
              } else continue;
            } else if(a.kind!=='finite'&&a.kind!=='imperative')continue;
            if(!control.person)continue;
            if(attempt){attempt.stage='subject';attempt.person=control.person;attempt.subjectCandidates=subjects(subjectClause,control.person);}
            let subject=subjectFor(subjectClause,control,controller,true);
            if(!subject)continue;
            // An infinitival comma clause can have an explicit accusative
            // controller; third-person objects cannot be resolved to sich safely.
            if(a.kind==='infinitive'&&tense==='zu-Infinitiv'&&subjectClause!==clause) {
              const objects=[];for(let i=subjectClause.start;i<=subjectClause.end;i++)if(['mich','dich','uns','euch'].includes(words[i])&&!beforePrep(i))objects.push(i);
              if(objects.length===1)subject={index:objects[0],person:pronounPersons[words[objects[0]]],objectController:true};
              else if(objects.length>1)continue;
              else if(Array.from({length:subjectClause.end-subjectClause.start+1},(_,k)=>words[subjectClause.start+k]).some(w=>['den','dem','einen','einem','ihn','ihm','ihr'].includes(w)))continue;
            }
            if(attempt)attempt.stage='pronoun';
            const pronouns=[];
            for(let p=clause.start;p<=clause.end;p++)if(reflexivePronouns.has(words[p])&&!beforePrep(p)) {
              const per=pronounPersons[words[p]];
              if(per===subject.person||per==='third'&&['er/sie/es','sie'].includes(subject.person))pronouns.push(p);
            }
            if(attempt)attempt.pronounStarts=pronouns.map(i=>tokens[i].index);
            if(pronouns.length!==1)continue;
            if(attempt)attempt.stage='competing-predicate';
            const pronoun=pronouns[0];
            // The predicate, its auxiliary/modal and documented compound pieces
            // form one group. Any other verbal head makes the attachment unsafe.
            let unresolvedLassen=false;
            const allowed=new Set([...componentIndices,controller]);if(zuIndex!==null)allowed.add(zuIndex);
            // In a modal + bare infinitive + lassen bracket, the inner
            // infinitive is part of the same predicate, not a second clause.
            // Keep lassen as the construction head; do not relabel the inner
            // verb as a lexical 'sich …' sense or infer its semantic controller.
            if(a.base==='lassen'&&a.kind==='infinitive'&&modalLemmas.has(control.base)&&!a.compound?.length){
              const inner=[];
              for(let i=clause.start;i<v;i++)if(i!==controller&&analyses[i].some(r=>r.kind==='infinitive'&&!r.zu&&r.base===words[i])&&words[i-1]!=='zu')inner.push(i);
              if(inner.length!==1)continue;
              componentIndices.push(inner[0]);allowed.add(inner[0]);unresolvedLassen=true;
            }

            // A dictionary-proven participle after a graded state description
            // (mich sehr gut beraten) is a complement, not an independent verb.
            // Require the local right edge and an uninterrupted modifier phrase;
            // a bare infinitive, object, preposition or coordination is insufficient.
            const predicativeParticiple=i=>a.base!=='lassen'&&i>pronoun+1&&
              Array.from({length:clause.end-i},(_,k)=>i+1+k).every(j=>allowed.has(j))&&
              analyses[i].some(r=>r.kind==='participle')&&
              ['gut','schlecht','sehr','besonders','völlig','vollkommen','ausreichend'].includes(words[i-1])&&
              Array.from({length:i-pronoun-1},(_,k)=>pronoun+1+k).every(j=>
                !analyses[j].length&&!prepositions.has(words[j])&&
                (forms.get(words[j])||[]).some(e=>['Adjektiv','Adverb'].includes(e.type)))&&
              !helpers.some(h=>h.index!==i&&!allowed.has(h.index));
            const competingIndices=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).filter(i=>
              !allowed.has(i)&&!predicativeParticiple(i)&&analyses[i].some(r=>
                ['infinitive','participle'].includes(r.kind)||r.kind==='finite'&&subjects(clause,r.person).length));
            const competing=competingIndices.length>0;
            if(attempt)attempt.competing=competingIndices.map(i=>tokens[i][0]);
            if(competing)continue;
            if(a.kind==='finite'&&helpers.some(h=>['haben','sein'].includes(h.analysis.base))&&rows.some(r=>r.kind==='participle'))continue;
            const candidate=a.entry?mainCandidate(a.entry):a.candidate;if(!candidate)continue;
            const indices=[...componentIndices,pronoun];if(zuIndex!==null)indices.push(zuIndex);
            let complement=null;
            for(let i=pronoun+1;i<clause.end;i++) {
              const c=(a.entry?.complements||[]).find(c=>norm(c.pattern.split(/\s+/u)[0])===words[i]);
              if(c){complement=c;indices.push(i);break;}
              if(prepositions.has(words[i])||analyses[i].length)break;
            }
            // Agreement establishes attachment, not the meaning 'oneself'.
            // A bare plural object of a base verb also permits 'each other'.
            // Restrict this safeguard to the local bare-object pattern; richer
            // complements and lexical reflexive entries retain existing analysis.
            const lexicalSenseConfirmed=reflexiveEntries.has(a.entry)||/^sich\s+/u.test(norm(candidate.lemma));
            const pluralSubject=['wir','ihr','sie'].includes(subject.person);
            const selfMarker=['selbst','selber'].includes(words[pronoun+1])?pronoun+1:null;
            const mutualMarker=words[pronoun+1]==='gegenseitig'?pronoun+1:null;
            const clauseClosed=clause.end===words.length-1||/[,.!?;:]/u.test(sentence.slice(tokens[clause.end].index+tokens[clause.end][0].length,tokens[clause.end+1].index));
            const bareObject=clauseClosed&&Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k)
              .every(i=>allowed.has(i)||i===pronoun||i===subject.index||i===selfMarker||i===mutualMarker);
            const reflexiveAmbiguity=pluralSubject&&(mutualMarker!==null||
              !lexicalSenseConfirmed&&selfMarker===null&&bareObject);
            if(selfMarker!==null)indices.push(selfMarker);
            if(mutualMarker!==null)indices.push(mutualMarker);
            const tentative=unresolvedLassen||reflexiveAmbiguity;
            const spans=[...new Set(indices)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}));
            const caseName=['mir','dir'].includes(words[pronoun])?'Dativ':['mich','dich'].includes(words[pronoun])?'Akkusativ':'Akkusativ/Dativ';
            const tokenSpan=i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
            if(attempt)attempt.stage='linked';
            relations.push({...candidate,reflexiveUnconfirmed:false,construction:{id:'reflexive-verb',lemma:candidate.lemma,label:reflexiveAmbiguity?'Reflexiv / reziprok':unresolvedLassen?'Mögliche Reflexivgruppe':'Reflexiv',...(tentative?{confidence:'tentative'}:{}),...(unresolvedLassen?{attachmentOnly:true}:{}),...(reflexiveAmbiguity?{interpretation:mutualMarker!==null?'reciprocal':'reflexive-or-reciprocal'}:{}),
              note:reflexiveAmbiguity?{ru:mutualMarker!==null?'Взаимное употребление: друг друга; возвратное значение не подтверждено':'Возможно «себя» или «друг друга»; требуется выбор',en:mutualMarker!==null?'Reciprocal use: each other; reflexive sense unconfirmed':'May mean oneself or each other; selection required'}:unresolvedLassen?{ru:'Возможная возвратная группа с lassen; требуется выбор',en:'Possible reflexive lassen group; selection required'}:{ru:'Возвратная конструкция',en:'Reflexive construction'},spans,tense,reflexiveCase:caseName,
              verb:tokenSpan(v),pronoun:tokenSpan(pronoun),
              ...(a.detached?{prefix:tokenSpan(componentIndices.find(i=>i!==v&&words[i]===a.prefix))}:{}),
              subject:subject.index===null?null:{text:tokens[subject.index][0],start:tokens[subject.index].index,end:tokens[subject.index].index+tokens[subject.index][0].length},
              lexicalSenseConfirmed:lexicalSenseConfirmed&&!reflexiveAmbiguity,
              ...(complement?{complement:{...complement}}:{})},_lexicalIndices:[v,...componentIndices.filter(i=>i!==controller&&(!unresolvedLassen||i===v))],_pronounIndex:pronoun});
          }
        }
      }
      // Multiple morphological analyses can describe the same attachment.
      const unique=relations.filter((r,i,all)=>all.findIndex(x=>window.BibliothekVocabulary.identity(x)===window.BibliothekVocabulary.identity(r)&&JSON.stringify(x.construction.spans)===JSON.stringify(r.construction.spans))===i);
      return unique.filter(r=>!unique.some(x=>x!==r&&x._pronounIndex===r._pronounIndex&&x._lexicalIndices.some(i=>r._lexicalIndices.includes(i))&&
        (x.construction.spans.length>r.construction.spans.length && r.construction.spans.every(s=>x.construction.spans.some(t=>t.start===s.start)) ||
          x.construction.lexicalSenseConfirmed&&!r.construction.lexicalSenseConfirmed ||
          x.source==='main'&&r.source==='fallback'&&norm(x.lemma)===norm(r.lemma))));
    }
    function hasReflexivePronoun(sentence) {
      for (const token of String(sentence || '').matchAll(/[\p{L}\p{M}]+/gu))
        if (reflexivePronouns.has(norm(token[0]))) return true;
      return false;
    }
    async function reflexiveCandidates(word,context) {
      if(!context||!Number.isInteger(context.tokenOffset))return [];
      const sentence=String(context.sentence||''),key=norm(word);
      // Sentence analysis cannot produce a reflexive group without a pronoun.
      // Check before importing forms or downloading the verb membership filter.
      if (!hasReflexivePronoun(sentence)) return [];
      try { await prepareSeparable(); } catch (_) { /* Own evidence remains usable offline. */ }
      if(!reflexivePronouns.has(key)&&!verbAnalyses.has(key)&&!zuForms.has(key)&&!separatedForms.has(key)){
        if(word[0]!==key[0]&&(forms.get(key)||[]).some(e=>e.type==='Nomen'))return [];
        if(fallback.mayBeVerb&&!await fallback.mayBeVerb(word))return [];
      }
      if(!grammarCache.has(sentence)) {
        if(grammarCache.size>=64)grammarCache.delete(grammarCache.keys().next().value);
        const failures=lookupFailures,pending=analyseReflexiveSentence(sentence);
        grammarCache.set(sentence,pending);
        pending.then(()=>{if(lookupFailures!==failures&&grammarCache.get(sentence)===pending)grammarCache.delete(sentence);},()=>grammarCache.delete(sentence));
      }
      const groups=await grammarCache.get(sentence),clicked=[...sentence.matchAll(/[\p{L}\p{M}]+/gu)].findIndex(t=>t.index===context.tokenOffset&&norm(t[0])===norm(word));
      return groups.filter(c=>clicked===c._pronounIndex||c._lexicalIndices.includes(clicked)).map(({_lexicalIndices,_pronounIndex,...c})=>({...c,translation:{...c.translation},construction:{...c.construction,spans:c.construction.spans.map(s=>({...s}))}}));
    }
    // Reviewed action nouns have their own identity; never borrow a verb ID.
    const infinitiveNouns = {
      lesen:{en:"reading (the act of reading)",ru:"чтение"},
      schreiben:{en:"writing (the act of writing)",ru:"написание; процесс письма"},
      warten:{en:"waiting (the act of waiting)",ru:"ожидание"},
      anrufen:{en:"calling (the act of making a phone call)",ru:"действие: звонить по телефону"}
    };
    function infinitiveNoun(word, context) {
      const base = norm(word), translation = infinitiveNouns[base];
      if (!translation || !/^[A-ZÄÖÜ]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && t[0] === word);
      if (index < 1 || norm(tokens[index-1][0]) !== "das" ||
        !/^\s+$/u.test(sentence.slice(tokens[index-1].index+tokens[index-1][0].length,tokens[index].index))) return null;
      // Do not select an action noun as a modifier of a following known noun.
      const next = tokens[index+1];
      if (next && /^\s+$/u.test(sentence.slice(tokens[index].index+word.length,next.index)) &&
        (forms.get(norm(next[0])) || []).some(e => e.type === "Nomen")) return null;
      const lemma = base.charAt(0).toLocaleUpperCase("de-DE")+base.slice(1);
      const verb = (lemmas.get(base) || []).find(e => e.type === "Verb");
      const usage = {role:"nominalized",kind:"infinitive",base,form:word,baseDictionaryId:verb?.id || null};
      return {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation:{...translation},usage,
        item:{word:lemma,article:"das",type:"Nomen",translation_en:translation.en,translation_ru:translation.ru,
          usage_note_en:`Nominalized infinitive of ${base}.`,usage_note_ru:`Субстантивированный инфинитив ${base}.`}};
    }
    function adjectiveNoun(word, context) {
      const definitions = {
        Neues:{marker:"etwas",base:"neu",en:"something new",ru:"что-то новое"},
        Besonderes:{marker:"nichts",base:"besondere",en:"nothing special",ru:"ничего особенного"}
      };
      const definition = definitions[word];
      if (!definition || !context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && t[0] === word);
      const joined = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      if (index < 1 || norm(tokens[index-1][0]) !== definition.marker || !joined(index-1,index)) return null;
      const next = tokens[index+1];
      if (next && joined(index,index+1) && ((forms.get(norm(next[0])) || []).some(e => e.type === "Nomen") || modifiers.has(norm(next[0])))) return null;
      const ownBase = (lemmas.get(definition.base) || []).find(e => e.type === "Adjektiv");
      const translation = {en:definition.en,ru:definition.ru};
      return {source:"fallback",lemma:word,pos:"noun",posLabel:"Nomen",translation,
        usage:{role:"nominalized",kind:"adjective",base:definition.base,baseDictionaryId:ownBase?.id || null,form:word,marker:definition.marker},
        item:{word,type:"Nomen",translation_en:translation.en,translation_ru:translation.ru}};
    }
    function personNouns(word, context) {
      const match = /^(reisend|arbeitslos|bekannt)(e|en|er|em|es)$/u.exec(norm(word));
      if (!match || !/^[A-ZÄÖÜ]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && t[0] === word);
      const joined = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      if (index < 1 || !joined(index-1,index)) return null;
      const next = tokens[index+1];
      if (next && joined(index,index+1) && ((forms.get(norm(next[0])) || []).some(e => e.type === "Nomen") || modifiers.has(norm(next[0])))) return null;
      const determiner = norm(tokens[index-1][0]);
      const definite = ["der","die","den","dem","des"].includes(determiner);
      const mixed = /^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(e|en|em|er|es)?$/u.exec(determiner);
      if (!definite && !mixed) return null;
      const tail = mixed?.[1] || "";
      const table = {
        male:[["der","","er","e"],["den","en","en","en"],["dem","em","em","en"],["des","es","en","en"]],
        female:[["die","e","e","e"],["die","e","e","e"],["der","er","er","en"],["der","er","er","en"]],
        plural:[["die","e","e","en"],["die","e","e","en"],["den","en","en","en"],["der","er","er","en"]]
      };
      const prep = index > 1 && joined(index-2,index-1) ? norm(tokens[index-2][0]) : "";
      const governed = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,für:1,durch:1,gegen:1,ohne:1,um:1}[prep];
      const analyses = [];
      for (const [gender,rows] of Object.entries(table)) rows.forEach(([article,mixedTail,strong,weak],caseIndex) => {
        if (governed !== undefined && governed !== caseIndex || definite && article !== determiner || mixed && mixedTail !== tail) return;
        if (gender === "plural" && mixed && determiner.startsWith("ein")) return;
        const ending = definite || mixed && tail ? weak : strong;
        if (match[2] === ending) analyses.push({gender,caseIndex});
      });
      if (!analyses.length) return null;
      const definitions = {
        reisend:{male:["Reisender","traveller","путешественник"],female:["Reisende","female traveller","путешественница"],base:"reisen"},
        arbeitslos:{male:["Arbeitsloser","unemployed person","безработный"],female:["Arbeitslose","unemployed woman","безработная"],base:"arbeitslos"},
        bekannt:{male:["Bekannte","acquaintance","знакомый"],female:["Bekannte","female acquaintance","знакомая"],base:"bekannt"}
      };
      const definition = definitions[match[1]];
      return ["male","female"].flatMap(gender => {
        const compatible = analyses.filter(a => a.gender === gender || a.gender === "plural");
        if (!compatible.length) return [];
        const [lemma,en,ru] = definition[gender], article = gender === "male" ? "der" : "die";
        const own = (lemmas.get(norm(lemma)) || []).find(e => e.type === "Nomen" && e.article === article);
        const usage = {role:"nominalized",kind:"person",base:definition.base,form:word,
          number:compatible.every(a=>a.gender === "plural") ? "plural" : compatible.every(a=>a.gender !== "plural") ? "singular" : "ambiguous"};
        const candidate = own ? mainCandidate(own) : {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation:{en,ru},
          item:{word:lemma,article,type:"Nomen",translation_en:en,translation_ru:ru}};
        return [{...candidate,usage}];
      });
    }
    let preparation = null;
    function prepareSeparable() {
      if (!fallback.separableEntries) return Promise.resolve();
      if (!preparation) preparation = fallback.separableEntries().then(rows => {
        for (const [word,prefix,stems,meanings] of rows) {
          const own = (lemmas.get(norm(word)) || []).filter(e => e.type === "Verb");
          const items = own.length ? own : [{id:`imported:${word}`,word,type:"Verb",importedSeparable:true,meanings}];
          const bases = separableBases.get(norm(word.slice(prefix.length))) || [];
          for (const entry of items) if (!bases.some(row=>row.entry.id===entry.id)) bases.push({entry,prefix});
          separableBases.set(norm(word.slice(prefix.length)),bases);
          for (const item of items) {
            add(forms,word,item);
            add(forms,prefix+"zu"+word.slice(prefix.length),item);
            add(zuForms,prefix+"zu"+word.slice(prefix.length),item);
            for (const stem of stems) {
              add(forms,prefix+stem,item);
              const pairs = separatedForms.get(stem) || [];
              if (!pairs.some(p=>p.entry.id===item.id && p.prefix===prefix)) pairs.push({entry:item,prefix});
              separatedForms.set(stem,pairs);
            }
          }
        }
      }).catch(error => { preparation = null; throw error; });
      return preparation;
    }
    const separableNounEvidence = new Map();
    function scanSeparableCandidates(word, context, secondary = false, pendingNouns = new Set(), nounEvidence = separableNounEvidence) {
      if (!context || !Number.isInteger(context.tokenOffset)) return [];
      const sentence = String(context.separableSentence || context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return [];
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const passable = new Set(["und","oder","aber","als"]);
      const gap = (a,b) => sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index);
      const hard = (a,b) => /[;:.!?…“”„"«»()]/u.test(gap(a,b)) || boundaries.has(norm(tokens[b][0]));
      const soft = (a,b) => /,/u.test(gap(a,b)) || /\s(?:[–—]|--)\s/u.test(gap(a,b));
      const stops = (a,b) => hard(a,b) && !(secondary && passable.has(norm(tokens[b][0])) &&
        !/[;:.!?…“”„"«»()]/u.test(gap(a,b)));
      const nominalParticle = (i,j) => norm(tokens[j][0]) === "vorbei" &&
        /\bkein weg(?: daran)?$/u.test(tokens.slice(i+1,j).map(t => norm(t[0])).join(" "));
      const competingVerb = i => {
        if (context.separableNominalOffsets?.has(tokens[i].index)) return false;
        const entries = forms.get(norm(tokens[i][0])) || [];
        if (norm(tokens[i][0]) === "bitte" || /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && entries.some(e => e.type === "Nomen")) return false;
        const possibleVerb = entries.some(e => e.type === "Verb") || separatedForms.has(norm(tokens[i][0]));
        if (!secondary || !possibleVerb) return possibleVerb;
        // Lexical ambiguity is only bypassed in the tentative second pass.
        if (!entries.some(e => e.type === "Verb") && entries.some(e => ["Adjektiv","Adverb"].includes(e.type))) return false;
        if (/^[A-ZÄÖÜ]/u.test(tokens[i][0])) {
          const key = norm(tokens[i][0]);
          if (!nounEvidence.has(key)) pendingNouns.add(tokens[i][0]);
          if (nounEvidence.get(key)) return false;
        }
        return true;
      };
      // A non-final particle can close the verbal bracket before a proven
      // adverbial continuation. Bare determiners/nouns remain preposition uses.
      const trailingAdverbial = j => {
        // A lexical adverb can itself modify the following adverb (weiter abwärts).
        if ((forms.get(norm(tokens[j][0])) || []).some(e => ["Adverb","Adjektiv"].includes(e.type))) return false;
        let end = j + 1;
        while (end < tokens.length && !hard(end-1,end) && !soft(end-1,end)) end++;
        const entriesAt = k => forms.get(norm(tokens[k][0])) || [];
        // Temporal prepositions also take bare adverbs: ab morgen, vor heute.
        if (["ab","vor","nach","seit","von","bis","über","auf","für","zu"].includes(norm(tokens[j][0])) &&
            !prepositions.has(norm(tokens[j+1][0])) && !["wegen","trotz","während","innerhalb","außerhalb"].includes(norm(tokens[j+1][0]))) return false;
        const tailPreps = new Set([...prepositions,"wegen","trotz","während","innerhalb","außerhalb"]);
        const det = /^(?:der|die|das|den|dem|des|(?:ein|kein|mein|dein|sein|ihr|unser|euer)(?:e|en|em|er|es)?|(?:dies|jen)(?:e|en|em|er|es))$/u;
        let k = j + 1;
        while (k < end) {
          if (!/^\s+$/u.test(gap(k-1,k))) return false;
          const key = norm(tokens[k][0]), entries = entriesAt(k);
          if (tailPreps.has(key)) {
            let head = k + 1;
            if (head < end && det.test(norm(tokens[head][0]))) head++;
            const first = head;
            while (head < end && head-first < 2 && !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) &&
              (modifiers.get(norm(tokens[head][0])) || []).length) head++;
            if (head >= end || !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) ||
                !entriesAt(head).some(e => e.type === "Nomen")) return false;
            for (let h = k; h < head; h++) if (!/^\s+$/u.test(gap(h,h+1))) return false;
            k = head + 1;
          } else {
            if (/^[A-ZÄÖÜ]/u.test(tokens[k][0]) || det.test(key) ||
                !entries.some(e => e.type === "Adverb") || entries.some(e => e.type === "Verb") ||
                (verbAnalyses.get(key) || []).some(a => ["finite","infinitive","participle"].includes(a.kind))) return false;
            k++;
          }
        }
        return end > j+1;
      };
      const results = [];
      for (let i = 0; i < tokens.length-1; i++) {
        const possible = separatedForms.get(norm(tokens[i][0])) || [];
        if (!possible.length) continue;
        // Only inspect paths that can contribute to this clicked occurrence.
        if (secondary && selected !== i && (i >= selected || !possible.some(pair => pair.prefix === norm(tokens[selected][0])))) continue;
        if (secondary && !tokens.some((t,j) => j > i &&
          (j === tokens.length-1 || hard(j,j+1) || soft(j,j+1) || trailingAdverbial(j)) &&
          possible.some(pair => pair.prefix === norm(t[0])) && !nominalParticle(i,j))) continue;
        let start = i;
        while (start > 0 && !hard(start-1,start) && !soft(start-1,start)) start--;
        // Internal capitals belong to a nominal phrase even when the noun is
        // only in fallback (Sparten ... aus). A quoted noun after an article
        // remains nominal although the quote starts a new local segment.
        if (/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && (i > start || i > 0 &&
          /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)$/u.test(norm(tokens[i-1][0])))) continue;
        // Short imperatives can be adjective homographs (besser). They must
        // not steal a particle from an earlier finite predicate in the segment.
        const stemEntries = forms.get(norm(tokens[i][0])) || [];
        if (stemEntries.some(e => ["Adjektiv","Adverb"].includes(e.type)) &&
            !(verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "finite") &&
            tokens.slice(start,i).some(t => (verbAnalyses.get(norm(t[0])) || []).some(a => a.kind === "finite"))) {
          if (selected === i) results.shortImperativeConflict = true;
          continue;
        }
        if (tokens.slice(start,i).some(t => (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" &&
          ["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten","lassen"].includes(e.word)))) continue;
        let crossed = secondary;
        for (let j = i+1; j < tokens.length; j++) {
          if (stops(j-1,j)) break;
          if (soft(j-1,j)) crossed = true;
          // A particle must close its local segment; otherwise it may be a preposition.
          const closes = j === tokens.length-1 || hard(j,j+1) || soft(j,j+1);
          const trailing = !closes && possible.some(pair => pair.prefix === norm(tokens[j][0])) && trailingAdverbial(j);
          // "kein Weg (daran) vorbei" belongs to führen, not vorbeifahren.
          const pairs = (closes || trailing) && !nominalParticle(i,j) && !/^[A-ZÄÖÜ]/u.test(tokens[j][0]) ? possible.filter(pair => pair.prefix === norm(tokens[j][0])) : [];
          if (pairs.length) {
            if (selected === i || selected === j) for (const pair of pairs) {
              const spans = [i,j].map(k => ({text:tokens[k][0],start:tokens[k].index,end:tokens[k].index + tokens[k][0].length}));
              results.push({...mainCandidate(pair.entry),construction:{id:"separable-verb",spans,
                ...(crossed ? {confidence:"tentative"} : {})}});
            }
            // A completed primary bracket must not consume a later particle.
            if (!crossed) break;
          }
          if (competingVerb(j)) break;
        }
      }
      return results;
    }
    function separableCandidates(word, context) {
      const primary = scanSeparableCandidates(word,context);
      return primary.length ? primary : scanSeparableCandidates(word,context,true);
    }
    async function resolveSeparableCandidates(word, context) {
      context = await separableScope(context);
      const primary = scanSeparableCandidates(word,context);
      if (primary.length || !context) return primary;
      const nounEvidence = new Map(separableNounEvidence);
      // Fetch only capitalised possible blockers on relevant paths. Reuse the
      // shared lexical cache; do not load every noun in the sentence/corpus.
      for (;;) {
        const pending = new Set(), candidates = scanSeparableCandidates(word,context,true,pending,nounEvidence);
        if (!pending.size) return candidates;
        await Promise.all([...pending].map(async form => {
          const groups = await lexicalLookup(form);
          if (separableNounEvidence.size >= 512) separableNounEvidence.delete(separableNounEvidence.keys().next().value);
          const isNoun = groups.some(g => canonicalPos(g.pos) === "Nomen" && g.kind !== "form-note" && !g.unresolved);
          nounEvidence.set(norm(form),isNoun);
          separableNounEvidence.set(norm(form),isNoun);
        }));
      }
    }
    async function separableScope(context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return context;
      const original = String(context.sentence || '');
      const ranges = [], nominal = new Set();
      const hasPredicate = async text => {
        for (const t of text.matchAll(/[\p{L}\p{M}]+/gu)) {
          if ((await tokenAnalyses(t[0])).some(a => ['finite','infinitive','imperative'].includes(a.kind))) return true;
        }
        return false;
      };
      // Only balanced, non-predicative parenthetical fragments are transparent.
      for (const match of original.matchAll(/\([^()]*\)/gu)) {
        if (!await hasPredicate(match[0]) && !/[;:.!?]/u.test(match[0])) ranges.push([match.index,match.index+match[0].length]);
      }
      // A closed subordinate insertion owns its predicates and particles.
      // Unmarked comma clauses and unfinished insertions retain the old guards.
      for (const match of original.matchAll(/,\s*(?:wie|während|obwohl)\b[^,;:.!?]*,/gu)) {
        const inner=[...match[0].matchAll(/[\p{L}\p{M}]+/gu)];
        const tail=inner.at(-1);
        const finite=tail&&(await tokenAnalyses(tail[0])).some(a=>a.kind==='finite');
        if (finite && inner.length>=3) ranges.push([match.index,match.index+match[0].length]);
      }
      let chars = original.split('');
      const containing = ranges.find(([a,b])=>context.tokenOffset>=a&&context.tokenOffset<b);
      if (containing) {
        const [a,b]=containing;
        chars=chars.map((c,i)=>i>a&&i<b-1?c:' ');
      } else for (const [a,b] of ranges) for(let i=a;i<b;i++) chars[i]=' ';
      const sentence=chars.join(''), scoped=[...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const morphologyCache=new Map();
      const morphologyAt=i=>{
        if(!morphologyCache.has(i)) morphologyCache.set(i,collectMorphology(scoped[i][0],{discoverModifiers:true}));
        return morphologyCache.get(i);
      };
      // A homographic verb spelling is not a predicate when a nominal frame
      // confirms its noun role. Require both lexical noun evidence and an
      // immediately preceding determiner or verified declined adjective.
      for(let i=1;i<scoped.length;i++) {
        const t=scoped[i], key=norm(t[0]);
        if(!/^[A-ZÄÖÜ]/u.test(t[0]) || !separatedForms.has(key) &&
          !(forms.get(key)||[]).some(e=>e.type==='Verb')) continue;
        if(!/^\s+$/u.test(sentence.slice(scoped[i-1].index+scoped[i-1][0].length,t.index))) continue;
        const previous=scoped[i-1][0];
        const frame=determiners.test(norm(previous)) ||
          !/^[A-ZÄÖÜ]/u.test(previous) && (await morphologyAt(i-1)).analyses.some(a=>
            canonicalPos(a.pos)==='Adjektiv' && ['adjective','participle-declined'].includes(a.kind));
        if(!frame) continue;
        if((await morphologyAt(i)).candidates.some(c=>canonicalPos(c.pos)==='Nomen' &&
          !/^gerund of /iu.test(c.translation?.en||''))) nominal.add(t.index);
      }
      // A verified comparative after a finite predicate in the same clause
      // is a modifier, not a second unintroduced finite verb or imperative.
      // Clause-initial comparisons and forms after auxiliaries stay ambiguous.
      const clauseWords=new Set(['und','oder','aber','denn','sondern','doch','weil','dass','wenn','ob','als','bevor','nachdem']);
      const auxiliaries=new Set(['haben','sein','werden','können','müssen','dürfen','sollen','wollen','mögen','möchten','lassen']);
      for(let i=1;i<scoped.length;i++) {
        const t=scoped[i],key=norm(t[0]);
        if(/^[A-ZÄÖÜ]/u.test(t[0]) || !separatedForms.has(key) &&
          !(forms.get(key)||[]).some(e=>e.type==='Verb')) continue;
        if(!(await morphologyAt(i)).analyses.some(a=>canonicalPos(a.pos)==='Adjektiv' && a.tags?.includes('comparative'))) continue;
        for(let j=i-1;j>=0;j--) {
          if(/[,;:.!?…“”„"«»()]/u.test(sentence.slice(scoped[j].index+scoped[j][0].length,t.index)) ||
            clauseWords.has(norm(scoped[j][0]))) break;
          const finite=(await tokenAnalyses(scoped[j][0])).filter(a=>a.kind==='finite');
          if(finite.length) {
            if(finite.every(a=>!auxiliaries.has(a.base)) && !nominal.has(scoped[j].index)) nominal.add(t.index);
            break;
          }
        }
      }
      // Declined participles are transparent only with lexical morphology and
      // a following verified noun head in the same nominal segment.
      for (let i=0;i<scoped.length;i++) {
        const t=scoped[i], entries=forms.get(norm(t[0]))||[];
        if (!entries.some(e=>e.type==='Verb') && !separatedForms.has(norm(t[0]))) continue;
        if (!/(?:e|en|em|er|es)$/u.test(norm(t[0])) || /^[A-ZÄÖÜ]/u.test(t[0])) continue;
        const morphology=await morphologyAt(i);
        if (!morphology.analyses.some(a=>a.kind==='participle-declined')) continue;
        let determined=false;
        for(let j=i-1;j>=0&&i-j<=6;j--) {
          if (/[,;:.!?]/u.test(sentence.slice(scoped[j].index,t.index))) break;
          if (determiners.test(norm(scoped[j][0]))) {determined=true;break;}
          // A completed noun head before the word indicates a predicate,
          // not a modifier of the later object (der Mann besetzte das Haus).
          if (/^[A-ZÄÖÜ]/u.test(scoped[j][0])) break;
        }
        if (!determined) continue;
        for(let j=i+1;j<scoped.length&&j-i<=35;j++) {
          if (/[,;:.!?]/u.test(sentence.slice(t.index,scoped[j].index))) break;
          if (!/^[A-ZÄÖÜ]/u.test(scoped[j][0])) continue;
          const groups=await lexicalLookup(scoped[j][0]);
          if (groups.some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen')) {nominal.add(t.index);break;}
        }
      }
      return {...context,separableSentence:sentence,separableNominalOffsets:nominal};
    }
    function zuGroup(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t=>t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","um","ohne","statt","anstatt"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      let start = selected, end = selected;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const verbs = i => matches(i).filter(e=>e.type === "Verb");
      const finite = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].some(t=>Object.values(formsOf(e)[t] || {}).some(f=>norm(f) === norm(tokens[i][0])));
      const indices = Array.from({length:end-start+1},(_,i)=>start+i);
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && (verbs(end+2).length || norm(tokens[end+2]?.[0]) === "zu")) return null;
      const heads = indices.flatMap(i=>verbs(i).filter(e=>["haben","sein"].includes(e.word) && finite(e,i)).map(e=>({i,e})));
      const nounComplements = new Set(["lust","zeit","angst","gelegenheit","möglichkeit","recht","grund","chance","mut","erlaubnis","plan","absicht","wunsch","interesse","freude","problem","schwierigkeit","geld"]);
      const mannerWords = new Set(["leicht","schwer","einfach","gut","schlecht","kaum","unmöglich"]);
      const result = [];
      for (const head of heads) {
        let tail = head.i === end ? end-1 : end;
        let lexical = head.e, participleIndex = null;
        const past = verbs(tail).filter(e=>["haben","sein"].includes(e.word) && norm(e.auxiliary) === head.e.word && norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[tail][0]));
        if (past.length === 1) {
          // Conditional past is not labelled as ordinary Perfekt.
          if (!["Präsens","Präteritum"].some(t=>Object.values(formsOf(head.e)[t] || {}).some(f=>norm(f) === norm(tokens[head.i][0])))) continue;
          lexical = past[0]; participleIndex = tail; tail--;
        }
        if (tail <= start || tail === head.i || !/^[a-zäöü]/u.test(tokens[tail][0])) continue;
        const joined = zuForms.get(norm(tokens[tail][0])) || [];
        const marker = norm(tokens[tail-1]?.[0]) === "zu" && tail-1 !== head.i ? tail-1 : null;
        const main = joined.length ? joined : marker !== null ? verbs(tail).filter(e=>norm(e.word) === norm(tokens[tail][0])) : [];
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1) continue;
        const linked = [head.i,tail,...(marker !== null ? [marker] : []),...(participleIndex !== null ? [participleIndex] : [])];
        if (!linked.includes(selected)) continue;
        const other = indices.filter(i=>!linked.includes(i));
        // A noun/adjective with its own infinitive complement is a different
        // construction: Lust/Zeit zu lesen, bereit/froh zu gehen, etc.
        if (lexical.word === "haben" && other.some(i=>nounComplements.has(norm(tokens[i][0])) || norm(tokens[i][0]) === "vor")) continue;
        if (lexical.word === "sein" && other.some(i=>!mannerWords.has(norm(tokens[i][0])) &&
          (matches(i).some(e=>e.type === "Adjektiv") || ["bereit","fähig","willig","entschlossen","froh","stolz"].includes(norm(tokens[i][0]))))) continue;
        const possessiveBeforeNoun = i => /^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(norm(tokens[i][0])) &&
          i+1 <= end && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && matches(i+1).some(e=>e.type === "Nomen");
        if (other.some(i=>(verbs(i).length || separatedForms.has(norm(tokens[i][0]))) && !possessiveBeforeNoun(i) &&
          !(/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && matches(i).some(e=>e.type === "Nomen")))) continue;
        const modal = lexical.word === "haben";
        const tense = participleIndex !== null ? ["Präteritum"].some(t=>Object.values(formsOf(head.e)[t] || {}).some(f=>norm(f) === norm(tokens[head.i][0]))) ? "Plusquamperfekt · " : "Perfekt · " : "";
        // A recognised connection does not establish obligation (e.g. nichts zu tun).
        const note = modal ? {en:`${tense}haben + zu + infinitive`,ru:`${tense}haben + zu + инфинитив`} :
          {en:`${tense}sein + zu · possibility / necessity`,ru:`${tense}sein + zu · возможность / необходимость`};
        result.push({id:modal ? "haben-zu" : "sein-zu",note,lemma:main[0].word,
          meaningLemma:lexical.word,meaning:modal || selected !== (participleIndex ?? head.i) ? null : {en:"can / must be",ru:"можно / нужно"},
          marker:selected === marker,main:main[0],roles:[head.e,lexical,...main],
          spans:[...new Set(linked)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return result.length === 1 ? result[0] : null;
    }
    function werdenGroup(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      let start = selected, end = selected;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const verbs = i => matches(i).filter(e=>e.type === "Verb");
      const finite = (e,i,tense) => Object.values(formsOf(e)[tense] || {}).some(f => norm(f) === norm(tokens[i][0]));
      const tenses = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].filter(t=>finite(e,i,t));
      const predicate = i => matches(i).filter(e=>e.type === "Adjektiv" || e.type === "Nomen" && /^[A-ZÄÖÜ]/u.test(tokens[i][0]));
      const participles = i => verbs(i).filter(e=>norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]));
      const infinitives = i => verbs(i).filter(e=>norm(e.word) === norm(tokens[i][0]) && /^[a-zäöü]/u.test(tokens[i][0]));
      const indices = Array.from({length:end-start+1},(_,i)=>start+i);
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && verbs(end+2).length) return null;
      const heads = indices.flatMap(i=>verbs(i).filter(e=>["werden","sein"].includes(e.word) && tenses(e,i).length).map(e=>({i,e})));
      const result = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        let main = [], linked = [], roles = [], id, note, meaning;
        if (head.e.word === "werden") {
          const tense = tenses(head.e,head.i);
          if (tense.includes("Konjunktiv II")) {
            main = infinitives(tail); id = "werden-conditional";
            note = {en:"Konjunktiv II",ru:"Konjunktiv II"};
            meaning = {en:"would",ru:"бы"};
          } else if (tense.includes("Präsens") && infinitives(tail).length) {
            main = infinitives(tail); id = "werden-future";
            // wohl supports inference; without it, both readings stay possible.
            const guess = indices.some(i=>norm(tokens[i][0]) === "wohl");
            note = guess ? {en:"Inference",ru:"Предположение"} : {en:"Future / inference",ru:"Будущее / предположение"};
            meaning = guess ? {en:"probably",ru:"вероятно"} : {en:"will / probably",ru:"будет / вероятно"};
          } else if (participles(tail).length) {
            main = participles(tail); id = "werden-passive";
            note = {en:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`,ru:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`};
            meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
          } else if (!verbs(tail).length) {
            main = predicate(tail); id = "werden-become";
            note = {en:"Becoming",ru:"Становление"};
          }
          linked = [head.i,tail]; roles = [head.e,...main];
        } else if (!tenses(head.e,head.i).includes("Konjunktiv II")) {
          const tailWord = norm(tokens[tail][0]);
          const werden = verbs(tail).filter(e=>e.word === "werden");
          if (werden.length !== 1 || tail-1 === head.i) continue;
          const tense = finite(head.e,head.i,"Präteritum") ? "Plusquamperfekt" : "Perfekt";
          if (tailWord === "worden") {
            main = participles(tail-1); id = "werden-passive-perfect";
            note = {en:`Passiv · ${tense}`,ru:`Passiv · ${tense}`};
            meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
          } else if (tailWord === "geworden" && !verbs(tail-1).length) {
            main = predicate(tail-1); id = "werden-become-perfect";
            note = {en:`${tense} · becoming`,ru:`${tense} · становление`};
          }
          linked = [head.i,tail-1,tail]; roles = [head.e,...main,...werden];
        }
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1 || !linked.includes(selected)) continue;
        const possessiveBeforeNoun = i => /^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(norm(tokens[i][0])) &&
          i+1 <= end && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && matches(i+1).some(e=>e.type === "Nomen");
        if (indices.some(i=>!linked.includes(i) && (verbs(i).length || separatedForms.has(norm(tokens[i][0]))) &&
          !possessiveBeforeNoun(i) && !(/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && matches(i).some(e=>e.type === "Nomen")))) continue;
        result.push({id,note,meaning:head.e.word === "werden" && selected !== head.i ? null : meaning,lemma:main[0].word,roles,spans:[...linked].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return result.length === 1 ? result[0] : null;
    }
    // Grammar probes must not evict the reader's lexical/display cache.
    const lassenLookupCache=new Map();
    function lassenLexicalLookup(word) {
      const key=norm(word);
      if(!lassenLookupCache.has(key)) {
        if(lassenLookupCache.size>=128)lassenLookupCache.delete(lassenLookupCache.keys().next().value);
        const pending=Promise.resolve().then(()=>fallback.lookup(word));lassenLookupCache.set(key,pending);
        pending.catch(()=>{if(lassenLookupCache.get(key)===pending)lassenLookupCache.delete(key);});
      }
      return lassenLookupCache.get(key);
    }
    // Lassen selects a bare infinitive. Structure does not decide permission,
    // causation or the controller of an accompanying personal pronoun.
    // Reviewed historical spellings, scoped to proven lassen chains. This is
    // not a global ss/ß rewrite and never corrects arbitrary input typos.
    const lassenHistoricalForms = new Map([['läßt','lässt'],['laß','lass'],['mußten','mussten']]);
    const lassenForm = word => lassenHistoricalForms.get(norm(word)) || word;
    async function lassenGroup(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset) || (!candidates.some(c=>canonicalPos(c.pos)==='Verb') && !lassenHistoricalForms.has(norm(word)))) return null;
      const sentence=String(context.sentence || ""),tokens=[...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      if(!tokens.some(t=>(forms.get(norm(lassenForm(t[0])))||[]).some(e=>e.type==='Verb'&&e.word==='lassen')))return null;
      const clicked=tokens.findIndex(t=>t.index===context.tokenOffset&&norm(t[0])===norm(word));
      if(clicked<0)return null;
      const boundaries=new Set(['und','oder','aber','denn','sondern','doch','weil','dass','daß','wenn','ob','bevor','nachdem','obwohl','während','falls','damit','sobald']);
      // A comma introducing an additive phrase need not close the verbal
      // bracket. But auch wenn introduces a separate subordinate clause;
      // its initial auch must not be pulled into the preceding verbal bracket.
      // Other finite predicates below still block attachment.
      const connected=(a,b)=>!/[;:.!?…“”„"«»()–—]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index)) && (!/,/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index)) || ['auch','noch'].includes(norm(tokens[b][0])) && !(norm(tokens[b][0])==='auch'&&norm(tokens[b+1]?.[0])==='wenn'));
      const nominalAls=i=>norm(tokens[i]?.[0])==='als' &&
        [i+1,i+2].some(j=>tokens[j] && /^[A-ZÄÖÜ]/u.test(tokens[j][0]) &&
          (forms.get(norm(tokens[j][0]))||[]).some(e=>e.type==='Nomen')) &&
        (i+1===tokens.length-1 || !subjectPersons[norm(tokens[i+1]?.[0])]);
      const boundary=i=>boundaries.has(norm(tokens[i]?.[0])) || norm(tokens[i]?.[0])==='als'&&!nominalAls(i);
      let start=clicked,end=clicked;
      while(start>0&&connected(start-1,start)&&!boundary(start-1))start--;
      while(end+1<tokens.length&&connected(end,end+1)&&!boundary(end+1))end++;
      const indices=Array.from({length:end-start+1},(_,i)=>start+i),analyses=await Promise.all(indices.map(i=>tokenAnalyses(lassenForm(tokens[i][0]),lassenLexicalLookup)));
      const rows=i=>analyses[i-start]||[], words=i=>norm(lassenForm(tokens[i]?.[0] || ""));
      const finite=i=>rows(i).filter(a=>['finite','imperative'].includes(a.kind)&&!a.detached);
      const infinitives=i=>rows(i).filter(a=>a.kind==='infinitive'&&!a.zu&&!a.detached&&a.base===words(i)&&words(i-1)!=='zu'&&/^[a-zäöü]/u.test(tokens[i]?.[0]||''));
      const outerBases=new Set(['haben','werden','können','müssen','dürfen','sollen','wollen','mögen','möchten']);
      const groups=[];
      for(const l of indices.filter(i=>rows(i).some(a=>a.base==='lassen'))) {
        let part,outer=null,headRows=[],tense;
        // End-position finite modal/werden controls the replacement bracket.
        if(l===end-1&&words(l)==='lassen'&&finite(end).some(a=>outerBases.has(a.base)&&a.base!=='haben')) {
          part=l-1;outer=end;headRows=finite(end).filter(a=>outerBases.has(a.base)&&a.base!=='haben');
        } else if(l===end&&words(l)==='lassen'&&infinitives(l).some(a=>a.base==='lassen')) {
          const helpers=indices.filter(i=>i!==l&&i!==l-1&&finite(i).some(a=>outerBases.has(a.base)));
          if(helpers.length===1){outer=helpers[0];headRows=finite(outer).filter(a=>outerBases.has(a.base));part=l-1;}
          else {headRows=finite(l).filter(a=>a.base==='lassen');part=l-1;}
        } else {headRows=finite(l).filter(a=>a.base==='lassen');part=l===end?l-1:end;}
        // Clause-final lassen is also an infinitive. A finite reading needs
        // its own agreeing plural subject; do not invent an omitted helper
        // after a comma or borrow a subject from an earlier clause.
        if(outer===null && l===end && words(l)==='lassen') {
          const pluralSubject=indices.some(i=>i!==l && ['wir','sie'].includes(words(i))) ||
            indices.some(i=>i!==l && /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && ['die','diese','jene'].includes(words(i-1)) &&
              (forms.get(words(i))||[]).some(e=>e.type==='Nomen'&&String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words(i))));
          if(!pluralSubject)continue;
        }
        if(part<start||part===outer||part===l||!headRows.length)continue;
        const inner=infinitives(part),bases=new Set(inner.map(a=>a.base));
        if(!inner.length||bases.size!==1)continue;
        // The own möchten card and the Konjunktiv II of mögen describe
        // the same finite paradigm. Share structural proof, retaining both
        // dictionary identities and the formal Konjunktiv II analysis.
        const moechteHead=outer!==null && headRows.some(a=>a.base==='möchten'&&a.entry&&a.tense==='Präsens') &&
          headRows.some(a=>a.base==='mögen'&&a.entry&&a.tense==='Konjunktiv II') &&
          headRows.every(a=>['möchten','mögen'].includes(a.base));
        // Generic fallback "subjunctive" tags are not evidence for Konjunktiv I
        // here. Our paired form tables prove the finite present/KII readings;
        // mechanically generated imperative readings do not control this bracket.
        if(moechteHead)headRows=headRows.filter(a=>a.kind==='finite'&&a.entry&&
          (a.base==='möchten'&&a.tense==='Präsens'||a.base==='mögen'&&a.tense==='Konjunktiv II'));
        const headBases=new Set(headRows.map(a=>moechteHead?'mögen':a.base));if(headBases.size!==1)continue;
        if(moechteHead&&subjectPersons[words(start)]&&!headRows.some(a=>subjectPersons[words(start)].includes(a.person)))continue;
        const head=moechteHead?headRows.find(a=>a.base==='mögen'):headRows[0],linked=[l,part,...(outer!==null?[outer]:[])];
        // Conditional/reported perfect replacement needs its own tense label.
        if(outer!==null&&head.base==='haben'&&!headRows.some(a=>['Präsens','Präteritum'].includes(a.tense)))continue;
        if(!linked.includes(clicked))continue;
        const ownNoun=i=>/^[A-ZÄÖÜ]/u.test(tokens[i][0])&&(forms.get(words(i))||[]).some(e=>e.type==='Nomen');
        const possessive=i=>/^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(words(i))&&i+1<=end&&ownNoun(i+1);
        const attributive=async i=>{
          if(!(modifiers.get(words(i))||[]).some(a=>a.kind.startsWith('participle-')))return false;
          let noun=i+1;
          // The final component supplies the gender of a hyphenated noun.
          if(noun+1<=end && /^-$/u.test(sentence.slice(tokens[noun].index+tokens[noun][0].length,tokens[noun+1].index)))noun++;
          if(!tokens[noun] || !/^[A-ZÄÖÜ]/u.test(tokens[noun][0]))return false;
          const own=(forms.get(words(noun))||[]).filter(e=>e.type==='Nomen');
          let imported=[];
          if(!own.length)try{imported=await lassenLexicalLookup(tokens[noun][0]);}catch(_){return false;}
          if(!own.length&&!imported.some(g=>!g.kind&&!g.unresolved&&g.meanings?.length&&canonicalPos(g.pos)==='Nomen'))return false;
          const gender=own.map(e=>e.article);
          for(let j=i-1;j>=start&&i-j<=8;j--){
            if(subjectPersons[words(j)] || !ownNoun(j)&&finite(j).length)return false;
            if(['der','die','das','den','dem','des'].includes(words(j)))return (words(i).endsWith('e')&&(!own.length||gender.includes(words(j)))) ||
              (words(i).endsWith('en')&&['den','dem','des'].includes(words(j)));
          }
          return false;
        };
        // In an imperative, mal between its head and object is a modal particle;
        // it is not a second imperative of malen.
        const modalParticle=i=>words(i)==='mal'&&head.kind==='imperative'&&l<i&&i<part;
        let competing=false;
        for(const i of indices)if(!linked.includes(i)&&rows(i).some(a=>['finite','imperative','infinitive','participle'].includes(a.kind))&&
          !ownNoun(i)&&!possessive(i)&&!modalParticle(i)&&!await attributive(i)){competing=true;break;}
        if(competing)continue;
        if(['und','oder'].includes(words(end+1))) {
          let independent=words(end+2)==='zwar';
          const next=end+2,subject=words(next);
          if(!independent && next<tokens.length) {
            let headIndex=next+1,persons=subjectPersons[subject];
            if(!persons && ['der','die','das','ein','eine'].includes(subject) && tokens[headIndex] &&
              /^[A-ZÄÖÜ]/u.test(tokens[headIndex][0]) && (forms.get(words(headIndex))||[]).some(e=>e.type==='Nomen')) {
              persons=['er/sie/es','sie'];headIndex++;
            }
            if(persons && headIndex<tokens.length && connected(next,headIndex)) {
              const nextRows=await tokenAnalyses(lassenForm(tokens[headIndex][0]),lassenLexicalLookup);
              independent=!nextRows.some(a=>a.kind==='infinitive') && nextRows.some(a=>a.kind==='finite'&&!a.detached&&persons.includes(a.person));
            }
          }
          // A second finite predicate can reuse an explicit personal subject.
          // Require agreement with both heads and exclude infinitive homographs.
          if(!independent && next<tokens.length && words(end+1)==='und' && subjectPersons[words(start)] && start<(outer??l)) {
            const nextRows=await tokenAnalyses(lassenForm(tokens[next][0]),lassenLexicalLookup);
            independent=connected(end+1,next) && !nextRows.some(a=>a.kind==='infinitive') &&
              nextRows.some(a=>a.kind==='finite'&&!a.detached&&headRows.some(h=>h.person===a.person)&&subjectPersons[words(start)].includes(a.person));
          }
          // A modal can govern a separate coordinated infinitive. Keep the
          // lassen spans local; the other infinitive is not a lassen complement.
          // Only a single bare infinitive, optionally preceded by dictionary
          // adverbs, proves this narrow continuation. Extra verbs remain blocked.
          if(!independent && next<tokens.length && outer!==null && modalLemmas.has(head.base) && words(end+1)==='und') {
            let tail=next;
            while(tail+1<tokens.length&&connected(tail,tail+1)&&!boundary(tail+1))tail++;
            const tailRows=await Promise.all(Array.from({length:tail-next+1},(_,k)=>tokenAnalyses(lassenForm(tokens[next+k][0]),lassenLexicalLookup)));
            const last=tailRows[tail-next]||[];
            independent=connected(end+1,next) && last.some(a=>a.kind==='infinitive'&&!a.zu&&!a.detached&&a.base===words(tail)&&a.base!=='lassen') &&
              /^[a-zäöü]/u.test(tokens[tail][0]) && words(tail-1)!=='zu' &&
              tailRows.slice(0,-1).every((rs,k)=>!rs.length&&(forms.get(words(next+k))||[]).some(e=>e.type==='Adverb'));
          }
          if(!independent)continue;
        }
        const lexical=[...new Map(inner.map(a=>[a.entry?.id||a.base,a.entry||{word:a.base,type:'Verb'}])).values()];
        const lassen=(forms.get(words(l))||[]).filter(e=>e.type==='Verb'&&e.word==='lassen');
        if(!lassen.length)continue;
        const helpers=headRows.map(a=>a.entry).filter(Boolean);
        tense=outer===null?head.tense:head.base==='haben'?headRows.some(a=>a.tense==='Präteritum')?'Plusquamperfekt':'Perfekt':head.base==='werden'?headRows.some(a=>a.tense==='Konjunktiv II')?'Konjunktiv II':'Futur I':head.tense;
        const replacement=outer!==null&&head.base==='haben';
        groups.push({id:'lassen-infinitive',label:replacement?tense+' · lassen':tense==='Futur I'||tense==='Konjunktiv II'?tense+' · lassen':'lassen + Infinitiv',tense,lemma:inner[0].base,roles:[...lassen,...lexical,...helpers],
          note:{ru:(replacement?tense+' · haben + Infinitiv + lassen':outer!==null?tense+' · ':'')+(replacement?'':'lassen + инфинитив')+' · значение определяется контекстом'+(moechteHead?' · möchte: форма Konjunktiv II от mögen; отдельная карточка möchten':''),en:(replacement?tense+' · haben + infinitive + lassen':outer!==null?tense+' · ':'')+(replacement?'':'lassen + infinitive')+' · meaning depends on context'+(moechteHead?' · möchte: Konjunktiv II form of mögen; separate möchten card':'')},
          spans:[...new Set(linked)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return groups.length===1?groups[0]:null;
    }
    // A perfect infinitive belongs to Futur II only when its lexical verb
    // explicitly licenses the final auxiliary. Never infer this from proximity.
    function futurePerfectGroup(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const clicked = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (clicked < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","sobald"]);
      const connected = (a,b) => !/[,;:.!?…“”„"«»()–—]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      let start=clicked,end=clicked;
      while(start>0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while(end+1<tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches=i=>(forms.get(norm(tokens[i]?.[0])) || []);
      const verbs=i=>matches(i).filter(e=>e.type === "Verb");
      const indices=Array.from({length:end-start+1},(_,i)=>start+i);
      const heads=indices.flatMap(i=>verbs(i).filter(e=>e.word === "werden" && Object.values(formsOf(e).Präsens || {}).some(f=>norm(f) === norm(tokens[i][0]))).map(e=>({i,e})));
      const groups=[];
      for(const head of heads) {
        const helper=head.i===end ? end-1 : end, part=helper-1;
        if(part<start || part===head.i || helper===head.i) continue;
        const auxiliaries=verbs(helper).filter(e=>["haben","sein"].includes(e.word) && norm(tokens[helper][0])===e.word && /^[a-zäöü]/u.test(tokens[helper][0]));
        if(auxiliaries.length !== 1) continue;
        const aux=auxiliaries[0];
        const main=verbs(part).filter(e=>norm(e.auxiliary)===aux.word &&
          norm(String(e.perfect_form || "").trim().split(/\s+/u).pop())===norm(tokens[part][0]) && /^[a-zäöü]/u.test(tokens[part][0]));
        const bases=new Set(main.map(e=>norm(e.word).replace(/^sich\s+/u,"")));
        if(!main.length || bases.size !== 1) continue;
        const linked=[head.i,part,helper];
        if(!linked.includes(clicked)) continue;
        // Declined modifiers and noun phrases are not competing predicates.
        // Unclassified verb homographs, coordination and extra verbs block proof.
        if(indices.some(i=>!linked.includes(i) && (verbs(i).length || separatedForms.has(norm(tokens[i][0]))) &&
          !(/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && matches(i).some(e=>e.type === "Nomen")) &&
          !(/^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(norm(tokens[i][0])) && i+1<=end && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && matches(i+1).some(e=>e.type === "Nomen")))) continue;
        if(["und","oder"].includes(norm(tokens[end+1]?.[0])) && verbs(end+2).length) continue;
        groups.push({id:"werden-future-perfect",label:"Futur II",tense:"Futur II",lemma:[...bases][0],roles:[head.e,...main,aux],
          note:{ru:"Futur II · завершённое действие в будущем / предположение о завершённом действии",en:"Futur II · completed future action / inference about a completed event"},
          meaning:clicked===head.i ? {ru:"вспомогательный глагол Futur II",en:"Futur II auxiliary"} : null,
          spans:linked.sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return groups.length===1 ? groups[0] : null;
    }
    // Deliberately small clause-local patterns. No proximity-only attachment.
    function verbGroup(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      let start = selected, end = selected;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => (forms.get(norm(tokens[i]?.[0])) || []).filter(e => e.type === "Verb");
      const finiteTenses = (e,i) => ["Präsens","Präteritum"].filter(tense => Object.values(formsOf(e)[tense] || {}).some(f => norm(f) === norm(tokens[i][0])));
      const infinitives = i => matches(i).filter(e => norm(e.word) === norm(tokens[i][0]) && /^[a-zäöü]/u.test(tokens[i][0]));
      const modals = new Set(["können","müssen","dürfen","sollen","wollen","mögen","möchten"]);
      const indices = Array.from({length:end-start+1},(_,i)=>start+i);
      const heads = indices.flatMap(i => matches(i).filter(e => (["haben","sein"].includes(e.word) || modals.has(e.word)) && finiteTenses(e,i).length).map(e=>({i,e})));
      // Shared auxiliaries across coordination need a broader analysis.
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && matches(end+2).length) return null;
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        let linked = [], roles = [], id, label, main;
        if (modals.has(head.e.word)) {
          main = infinitives(tail);
          id = "modal-group"; label = "Modal";
          linked = [head.i,tail]; roles = [head.e,...main];
        } else {
          const modal = infinitives(tail).filter(e=>modals.has(e.word));
          const base = tail-1 !== head.i ? infinitives(tail-1) : [];
          if (head.e.word === "haben" && modal.length === 1 && base.length === 1) {
            main = base; id = "modal-perfect";
            linked = [head.i,tail-1,tail]; roles = [head.e,...base,...modal];
          } else {
            main = matches(tail).filter(e => norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[tail][0]) && norm(e.auxiliary) === head.e.word);
            id = "perfect-group"; linked = [head.i,tail]; roles = [head.e,...main];
          }
          label = finiteTenses(head.e,head.i).includes("Präteritum") ? "Plusquamperfekt" : "Perfekt";
        }
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1 || !linked.includes(selected)) continue;
        // A second possible verb outside the group makes attachment uncertain.
        if (indices.some(i => !linked.includes(i) && (matches(i).length || separatedForms.has(norm(tokens[i][0]))) &&
          !(/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && (forms.get(norm(tokens[i][0])) || []).some(e=>e.type === "Nomen")))) continue;
        groups.push({id,label,lemma:main[0].word,roles,spans:[...linked].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return groups.length === 1 ? groups[0] : null;
    }
    function contextualRank(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset)) return {candidates, preferred:null, evidence:null};
      const tokens = [...String(context.sentence || "").matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (index < 0 || !/^(sein|seine|seinen|seinem|seiner|seines|seins|ihr|ihre|ihren|ihrem|ihrer|ihres|ihrs)$/u.test(norm(word)))
        return {candidates, preferred:null, evidence:null};
      // Punctuation blocks clues: do not join separate clauses or quoted phrases.
      const adjacent = (a,b) => !/[,;:.!?“”„"()]/u.test(context.sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index));
      const next = index + 1, previous = index - 1;
      const boundaryWords = new Set(["und","oder","aber","denn","sondern","weil","dass","wenn","ob","doch"]);
      let start = index, end = index;
      while (start > 0 && adjacent(start-1,start) && !boundaryWords.has(norm(tokens[start-1][0]))) start--;
      while (end + 1 < tokens.length && adjacent(end,end+1) && !boundaryWords.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const isAdjective = i => matches(i).some(e => e.type === "Adjektiv") ||
        ["e","en","em","er","es"].some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      let nounPhrase = false;
      for (let i = next; i < tokens.length && i <= next + 2; i++) {
        if (!adjacent(i-1,i)) break;
        if (matches(i).some(e => e.type === "Nomen") && /^[A-ZÄÖÜ]/u.test(tokens[i][0])) { nounPhrase = true; break; }
        if (!isAdjective(i)) break;
      }
      const modalLemmas = ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden"];
      const finiteForm = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II"].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? [group[person]] : Object.values(group)).some(form => form && norm(form) === norm(tokens[i][0]));
      });
      const clauseIndices = Array.from({length:end-start+1},(_,i)=>start+i);
      const modalInClause = clauseIndices.some(i => i !== index && matches(i).some(e => e.type === "Verb" && modalLemmas.includes(e.word) && finiteForm(e,i)));
      const dativeLemmas = ["helfen","danken","gefallen","gehören","vertrauen","antworten"];
      const hasDativeComplement = e => dativeLemmas.includes(e.word) || (e.complements || []).some(c => c.pattern === "Dativ");
      const dativePrepositions = ["mit","bei","von","zu","aus","nach","seit","gegenüber","neben","an","auf","hinter","in","über","unter","vor","zwischen"];
      const personalSubjects = new Set(["ich","du","er","sie","es","wir","ihr"]);
      const hasSubjectBefore = verbIndex => clauseIndices.some(i => i !== index && i < verbIndex && personalSubjects.has(norm(tokens[i][0])) && !(i > start && dativePrepositions.includes(norm(tokens[i-1][0])))) ||
        // A name directly before the finite verb is useful evidence, but a
        // dictionary noun may be a fronted object and must not settle the role.
        verbIndex > start && /^[A-ZÄÖÜ]/u.test(tokens[verbIndex-1][0]) && !matches(verbIndex-1).length;
      let coordinatedStart = Math.max(0,start-2);
      while (coordinatedStart > 0 && adjacent(coordinatedStart-1,coordinatedStart) && !boundaryWords.has(norm(tokens[coordinatedStart-1][0]))) coordinatedStart--;
      const coordinatedFirst = tokens[coordinatedStart]?.[0] || "";
      const inheritedSubject = previous === start && start > 0 && norm(tokens[start-1][0]) === "und" &&
        (personalSubjects.has(norm(coordinatedFirst)) || coordinatedStart < start-2 && /^[A-ZÄÖÜ]/u.test(coordinatedFirst) && !matches(coordinatedStart).length);
      const dativeFinite = clauseIndices.some(i => i < index && index-i <= 3 &&
        matches(i).some(e => e.type === "Verb" && hasDativeComplement(e) && finiteForm(e,i)) &&
        tokens.slice(i+1,index).every(t => ["nicht","auch","noch","schon","wirklich","mehr"].includes(norm(t[0]))) &&
        (hasSubjectBefore(i) || inheritedSubject || !matches(i).some(e => e.type === "Verb" && finiteForm(e,i,"ihr"))));
      const dativeFollowing = next <= end && hasSubjectBefore(next) && matches(next).some(e =>
        e.type === "Verb" && hasDativeComplement(e) && finiteForm(e,next));
      const dativePreposition = previous >= start && dativePrepositions.includes(norm(tokens[previous][0]));
      const perfectDative = clauseIndices.some(i => i > index && matches(i).some(e => e.type === "Verb" && hasDativeComplement(e) &&
        norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]))) &&
        clauseIndices.some(i => i < index && matches(i).some(e => e.type === "Verb" && ["haben","sein"].includes(e.word) && finiteForm(e,i)));
      let ids = [], evidence = null;
      if (nounPhrase) {
        ids = norm(word).startsWith("sein") ? ["pronoun-013"] : ["pronoun-014","pronoun-015"];
        evidence = "possessive-before-noun";
      } else if (norm(word) === "sein" && previous >= 0 && adjacent(previous,index) &&
        (isAdjective(previous) || matches(previous).some(e => e.type === "Verb" &&
          modalLemmas.includes(e.word)))) {
        ids = candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
        evidence = "sein-after-predicate-or-modal";
      } else if (norm(word) === "sein" && modalInClause && index === end) {
        ids = candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
        evidence = "sein-clause-final-after-modal";
      } else if (norm(word) === "ihr" && (dativePreposition || dativeFinite || dativeFollowing)) {
        ids = ["pronoun-004"]; evidence = dativePreposition ? "ihr-after-preposition" : "ihr-with-dative-finite-verb";
      } else if (norm(word) === "ihr" && [previous,next].some(i => i >= start && i <= end &&
        matches(i).some(e => e.type === "Verb" && finiteForm(e,i,"ihr")))) {
        ids = ["pronoun-007"]; evidence = "ihr-next-to-plural-verb";
      } else if (norm(word) === "ihr" && (perfectDative || previous >= start && previous >= 0 &&
        matches(previous).some(e => e.type === "Verb" && dativeLemmas.includes(e.word)))) {
        ids = ["pronoun-004"]; evidence = perfectDative ? "ihr-in-dative-perfect-group" : "ihr-after-dative-verb";
      }
      const favoured = candidates.filter(c => ids.includes(c.dictionaryId));
      if (!favoured.length) return {candidates, preferred:null, evidence:null};
      return {candidates:[...favoured,...candidates.filter(c => !favoured.includes(c))],
        preferred:favoured.length === 1 ? favoured[0] : null, evidence};
    }
    function nominalRank(word, tokens, index, start, end, matches, candidates) {
      const unchanged = {candidates,preferred:null,evidence:null};
      // Capitals inside a clause can signal nominalisation. Sentence-initial
      // capitals alone are not evidence for or against an attributive use.
      if (/^[A-ZÄÖÜ]/u.test(word) && index !== start) return unchanged;
      const rows = modifiers.get(norm(word)) || [];
      const analyses = candidates.flatMap(candidate => {
        const own = rows.filter(row => row.entry.id === candidate.dictionaryId);
        if (own.length) return own.map(row => ({candidate,...row}));
        if (canonicalPos(candidate.pos) !== "Adjektiv") return [];
        return endings.filter(ending => [norm(candidate.lemma),norm(candidate.lemma)+"er"]
          .some(stem => norm(word) === stem+ending)).map(ending => ({candidate,ending,kind:"adjective"}));
      });
      if (!analyses.length) return unchanged;
      const modifierAt = i => (modifiers.get(norm(tokens[i]?.[0])) || []).length > 0;
      let head = index+1;
      while (head <= end && head-index <= 3 && !matches(head).some(e => e.type === "Nomen") && modifierAt(head)) head++;
      if (head > end || head-index > 3) return unchanged;
      const nouns = matches(head).filter(e => e.type === "Nomen");
      if (!nouns.length) return unchanged;
      let left = index-1;
      while (left >= start && index-left <= 3 && modifierAt(left)) left--;
      const determiner = left >= start ? norm(tokens[left][0]) : "";
      const definite = ["der","die","das","den","dem","des"].includes(determiner);
      const ein = /^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(determiner);
      const demonstrative = /^(?:dies|jen)(?:e|en|em|er|es)$/u.test(determiner);
      const articleKind = definite || demonstrative ? "weak" : ein ? "mixed" : "strong";
      const determinerEnding = ein ? determiner.replace(/^(?:kein|mein|dein|sein|ihr|unser|euer|eur|ein)/u,"") :
        demonstrative ? determiner.replace(/^(?:dies|jen)/u,"") : "";
      // Each row describes N/A/D/G, without claiming a unique case when the
      // local phrase permits several. Genitive masculine/neuter uses -en.
      const table = {
        der:[["der","","er","e"],["den","en","en","en"],["dem","em","em","en"],["des","es","en","en"]],
        die:[["die","e","e","e"],["die","e","e","e"],["der","er","er","en"],["der","er","er","en"]],
        das:[["das","","es","e"],["das","","es","e"],["dem","em","em","en"],["des","es","en","en"]],
        plural:[["die",null,"e","en"],["die",null,"e","en"],["den",null,"en","en"],["der",null,"er","en"]]
      };
      const caseByPrep = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,für:1,durch:1,gegen:1,ohne:1,um:1};
      const prepIndex = articleKind === "strong" ? left : left-1;
      const governedCase = prepIndex >= start ? caseByPrep[norm(tokens[prepIndex][0])] : undefined;
      const allowed = new Set();
      for (const noun of nouns) {
        const pluralForms = String(noun.plural || "").split(/\s*,\s*/).filter(p => p && p !== "—");
        const isPlural = pluralForms.some(p => norm(p) === norm(tokens[head][0]) || !/[ns]$/iu.test(p) && norm(p)+"n" === norm(tokens[head][0]));
        const isSingular = norm(noun.word) === norm(tokens[head][0]) || !isPlural;
        const genders = ["der","die","das"].includes(noun.article) ? [noun.article] : ["der","die","das"];
        for (const key of [...(isSingular ? genders : []),...(isPlural ? ["plural"] : [])]) {
          table[key].forEach(([article,einEnding,strong,weak],caseIndex) => {
            if (governedCase !== undefined && governedCase !== caseIndex) return;
            if (definite && article !== determiner) return;
            if (demonstrative && determinerEnding !== ({der:"er",die:"e",das:"es",den:"en",dem:"em",des:"es"})[article]) return;
            if (ein && determinerEnding !== (key === "plural" ? ({die:"e",den:"en",der:"er"})[article] : einEnding)) return;
            const expected = articleKind === "strong" || articleKind === "mixed" && !determinerEnding ? strong : weak;
            // All modifiers must admit the same analysis, not independently
            // borrow incompatible cases from an ambiguous article.
            for (let i = left+1; i < head; i++) {
              const options = i === index ? analyses : modifiers.get(norm(tokens[i]?.[0])) || [];
              if (!options.some(row => row.ending === expected)) return;
            }
            allowed.add(expected);
          });
        }
      }
      const compatible = analyses.filter(row => allowed.has(row.ending));
      if (!compatible.length) return unchanged;
      const favoured = [...new Set(compatible.map(row => row.candidate))];
      const marked = candidates.map(candidate => {
        const row = compatible.find(row => row.candidate === candidate && row.kind.startsWith("participle-"));
        return row ? {...candidate,usage:{kind:row.kind,role:"attributive",form:word,base:row.base,head:tokens[head][0]}} : candidate;
      });
      const preferred = favoured.length === 1 ? marked[candidates.indexOf(favoured[0])] : null;
      return {candidates:marked,preferred,compatibleAdjectives:[...new Set(compatible
        .filter(row => canonicalPos(row.candidate.pos) === "Adjektiv")
        .map(row => marked[candidates.indexOf(row.candidate)]))],
        evidence:preferred ? "attributive-modifier-agreement" : "ambiguous-attributive-modifier",blocked:!preferred};
    }
    // Positive evidence only: fill an unresolved adjective/participle choice.
    // Existing finite, reflexive, perfect and passive decisions take precedence.
    async function unresolvedModifierChoice(word, context, candidates, grammatical) {
      const adjectives = candidates.filter(c => canonicalPos(c.pos) === "Adjektiv");
      const verbs = candidates.filter(c => canonicalPos(c.pos) === "Verb");
      if (!adjectives.length || !verbs.length || !Number.isInteger(context?.tokenOffset)) return null;
      if (candidates.some(c => c.construction)) return null;
      const uniqueAdjective = choices => {
        if (choices.filter(c => c.item?.reading_policy === "separate").length > 1) return null;
        if (new Set(choices.map(c => norm(c.lemma))).size !== 1) return null;
        if (choices.length === 1) return choices[0];
        const own = choices.filter(c => c.source === "main");
        return own.length === 1 ? own[0] : null;
      };
      if (grammatical.evidence === "ambiguous-attributive-modifier") {
        const candidate = uniqueAdjective(grammatical.compatibleAdjectives || []);
        if (candidate) return {candidate,evidence:"attributive-lexical-adjective"};
      }
      const sentence = String(context.sentence || "");
      const tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (index < 1 || !["ganz","sehr","ziemlich","völlig"].includes(norm(tokens[index-1][0]))) return null;
      if (/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[index-1].index+tokens[index-1][0].length,tokens[index].index))) return null;
      const candidate = uniqueAdjective(adjectives);
      if (!candidate) return null;
      const targetAnalyses = await tokenAnalyses(word);
      // Grading cannot settle an independently possible finite/infinitive verb.
      if (!targetAnalyses.some(a => a.kind === "participle") ||
          targetAnalyses.some(a => ["finite","infinitive","imperative"].includes(a.kind))) return null;
      // Do not infer absence of a construction from a truncated local clause.
      // Conservatively retain choice when any helper occurs in the sentence;
      // full coordinated/parenthesised attachment is outside this narrow rule.
      for (let i = 0; i < tokens.length; i++) {
        if (i === index) continue;
        const analyses = await tokenAnalyses(tokens[i][0]);
        if (analyses.some(a => ["haben","sein","werden"].includes(a.base) &&
            ["finite","infinitive","participle"].includes(a.kind))) return null;
      }
      return {candidate,evidence:"graded-lexical-adjective-without-auxiliary"};
    }
    // Add a choice only from an explicit, case-compatible noun phrase.
    // Existing resolutions and verb/particle constructions remain authoritative.
    async function unresolvedPrepositionChoice(word, context, candidates) {
      const caseByPrep = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,seit:2,für:1,durch:1,gegen:1,ohne:1,um:1};
      const governedCase = caseByPrep[norm(word)];
      if (governedCase === undefined || !Number.isInteger(context?.tokenOffset) ||
          candidates.some(c => c.construction || canonicalPos(c.pos) === "Verb")) return null;
      const choices = candidates.filter(c => canonicalPos(c.pos) === "prep" && norm(c.lemma) === norm(word));
      if (choices.length !== 1) return null;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (index < 0 || !tokens[index+2]) return null;
      const det = norm(tokens[index+1][0]);
      const definite = ["der","die","das","den","dem","des"].includes(det);
      const ein = det.match(/^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(e|en|em|er|es)?$/u);
      const demonstrative = det.match(/^(?:dies|jen)(e|en|em|er|es)$/u);
      if (!definite && !ein && !demonstrative) return null;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      let head = index+2;
      while (head < tokens.length && head-index <= 4 && !matches(head).some(e => e.type === "Nomen") &&
          (modifiers.get(norm(tokens[head][0])) || []).length) head++;
      if (!tokens[head] || head-index > 4 || !/^[A-ZÄÖÜ]/u.test(tokens[head][0])) return null;
      // Whitespace only: no attachment through punctuation, quotes or hyphens.
      for (let i=index;i<head;i++)
        if (!/^\s+$/u.test(sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index))) return null;
      const table = {
        der:[["den","en","en"],["dem","em","en"]],
        die:[["die","e","e"],["der","er","en"]],
        das:[["das","","es"],["dem","em","en"]],
        plural:[["die","e","en"],["den","en","en"]]
      };
      // A plural spelling may also be a weak singular (Namen, Kollegen).
      // Require an explicit dictionary form link instead of guessing an ending.
      let nounForms = [];
      try {
        const groups = await lexicalLookup(tokens[head][0]);
        nounForms = groups.flatMap(g => g.kind === "form-note" ? g.inflections || [] : []);
      } catch (_) { return null; }
      const compatible = matches(head).filter(e => e.type === "Nomen").some(noun => {
        const raw = norm(tokens[head][0]);
        const plurals = String(noun.plural || "").split(/\s*,\s*/).map(norm);
        const plural = plurals.some(p => p && p !== "—" && (p === raw || !/[ns]$/u.test(p) && p+"n" === raw));
        const keys = [...(plural ? ["plural"] : []),...((!plural || nounForms.some(row => canonicalPos(row.pos) === "Nomen" && norm(row.lemma) === norm(noun.word) && row.number === "singular")) && table[noun.article] ? [noun.article] : [])];
        return keys.some(key => {
          const [article,einEnding,demEnding] = table[key][governedCase-1];
          if (definite ? det !== article : ein ? (ein[1] || "") !== einEnding : demonstrative[1] !== demEnding) return false;
          if (ein && key === "plural" && /^ein(?:e|en)?$/u.test(det)) return false;
          for (let i=index+2;i<head;i++) {
            const expected = governedCase === 2 || key === "plural" || key === "der" ? "en" :
              key === "das" && ein && !ein[1] ? "es" : "e";
            if (!(modifiers.get(norm(tokens[i][0])) || []).some(row => row.ending === expected)) return false;
          }
          return true;
        });
      });
      return compatible ? choices[0] : null;
    }
    // Shared, dictionary-backed attachment for taps on either end of a noun phrase.
    // This is presentation metadata, not a construction or a new vocabulary identity.
    const attachmentLookupCache = new Map();
    function attachmentLookup(word) {
      const key = norm(word);
      if (!attachmentLookupCache.has(key)) {
        if (attachmentLookupCache.size >= 128) attachmentLookupCache.delete(attachmentLookupCache.keys().next().value);
        const pending = Promise.resolve().then(() => fallback.lookup(word));
        attachmentLookupCache.set(key,pending);
        pending.catch(() => { if (attachmentLookupCache.get(key) === pending) attachmentLookupCache.delete(key); });
      }
      return attachmentLookupCache.get(key);
    }
    async function nounPhraseStructure(word, context, candidates, externalModifiers = false) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const sentence = String(context.sentence || ''), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const clicked = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (clicked < 0) return null;
      const definite = new Set(['der','die','das','den','dem','des']);
      const isArticle = definite.has(norm(word));
      if (!isArticle && !candidates.some(c => canonicalPos(c.pos) === 'Nomen')) return null;
      const adjacent = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const modifier = async i => {
        if ((modifiers.get(norm(tokens[i]?.[0])) || []).length) return true;
        if (!externalModifiers || !tokens[i] || !/^[a-zäöüß]/u.test(tokens[i][0])) return false;
        try {
          const groups = await attachmentLookup(tokens[i][0]);
          return groups.some(g => g.kind === 'form-note' && canonicalPos(g.pos) === 'Adjektiv' &&
            g.inflections?.some(a => canonicalPos(a.pos) === 'Adjektiv' && norm(a.form) === norm(tokens[i][0])));
        } catch (_) { return false; }
      };
      let det = clicked, head = clicked;
      if (isArticle) {
        head++;
        while (tokens[head] && head-det <= 3 && !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) &&
            (modifiers.get(norm(tokens[head][0])) || []).length) head++;
      } else {
        det--;
        while (det >= 0 && clicked-det <= 3 && !definite.has(norm(tokens[det][0])) &&
            await modifier(det)) det--;
      }
      if (det < 0 || !tokens[head] || head-det > 3 || head <= det ||
          !definite.has(norm(tokens[det][0])) || !/^[A-ZÄÖÜ]/u.test(tokens[head][0])) return null;
      // A relative pronoun can precede its own subject (…, die Ämter haben).
      // Clause-initial attachment after a comma needs a wider syntactic parse.
      if (det > 0 && /,/u.test(sentence.slice(tokens[det-1].index+tokens[det-1][0].length,tokens[det].index))) return null;
      // The final component sets the gender of a hyphenated compound;
      // do not explain März-Gruppe as the masculine noun März.
      if (/^\s*[-–]\s*[\p{L}\p{M}]/u.test(sentence.slice(tokens[head].index+tokens[head][0].length))) return null;
      for (let i=det;i<head;i++) if (!adjacent(i,i+1)) return null;
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      return {sentence,tokens,det,head,adjacent,span};
    }
    async function externalNounArticleLink(word,context,candidate,allCandidates) {
      if (candidate?.source !== 'fallback' || !['noun','Nomen'].includes(candidate.pos)) return null;
      const structure = await nounPhraseStructure(word,context,[candidate],true);
      if (!structure || structure.head !== structure.tokens.findIndex(t => t.index === context.tokenOffset)) return null;
      const {sentence,tokens,det,head,adjacent,span} = structure;
      const article = norm(tokens[det][0]);
      const prep = det > 0 && adjacent(det-1,det) ? norm(tokens[det-1][0]) : '';
      // A relative clause can begin with a preposition: …, auf den Juden … .
      if (prep && det > 1 && /,/u.test(sentence.slice(tokens[det-2].index+tokens[det-2][0].length,tokens[det-1].index))) return null;
      // A nominal homograph before another capitalised word may be a modifier
      // (der Berliner Zeitung); a previous noun choice does not prove attachment.
      if (allCandidates.some(c => canonicalPos(c.pos) === 'Adjektiv') &&
          /^\s+[`'“”„"]*\s*[A-ZÄÖÜ]/u.test(sentence.slice(tokens[head].index+tokens[head][0].length))) return null;
      // The export can omit the modifier POS (Londoner Finanzministerium).
      // A following confirmed common noun leaves the clicked head unproven.
      if (tokens[head+1] && /^[A-ZÄÖÜ]/u.test(tokens[head+1][0]) && adjacent(head,head+1)) {
        try {
          const following = await attachmentLookup(tokens[head+1][0]);
          if ((forms.get(norm(tokens[head+1][0])) || []).some(e => e.type === 'Nomen') ||
              following.some(g => g.kind !== 'form-note' && g.pos === 'noun')) return null;
        } catch (_) { return null; }
      }
      const dative = new Set(['mit','bei','von','zu','aus','nach','seit']);
      const accusative = new Set(['für','durch','gegen','ohne','um']);
      if (dative.has(prep) && !['dem','der','den'].includes(article) ||
          accusative.has(prep) && !['den','die','das'].includes(article)) return null;
      const endings = {der:['e','en'],die:['e','en'],das:['e'],den:['en'],dem:['en'],des:['en']};
      for (let i=det+1;i<head;i++) if (!endings[article].some(e => norm(tokens[i][0]).endsWith(e))) return null;
      return {article:tokens[det][0],noun:tokens[head][0],spans:[span(det),span(head)]};
    }
    async function nounPhrase(word, context, candidates) {
      const structure = await nounPhraseStructure(word,context,candidates);
      if (!structure) return [];
      const {sentence,tokens,det,head,adjacent,span} = structure;
      const surface = norm(tokens[head][0]);
      let groups;
      try { groups = await lexicalLookup(tokens[head][0]); } catch (_) { return []; }
      const analyses = groups.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
        .filter(a => canonicalPos(a.pos) === 'Nomen');
      const nouns = [...(forms.get(surface) || []).filter(e => e.type === 'Nomen'),
        ...groups.filter(g => g.kind !== 'form-note' && canonicalPos(g.pos) === 'Nomen')
          .flatMap(g => (lemmas.get(norm(g.word)) || []).filter(e => e.type === 'Nomen'))];
      const table = {der:['der','den','dem','des'],die:['die','die','der','der'],
        das:['das','das','dem','des'],plural:['die','die','den','der']};
      const caseNames = ['nominative','accusative','dative','genitive'];
      const governed = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,seit:2,für:1,durch:1,gegen:1,ohne:1,um:1,
        innerhalb:3,außerhalb:3,aufgrund:3};
      const prep = det > 0 && adjacent(det-1,det) ? norm(tokens[det-1][0]) : '';
      const twoWay = new Set(['in','an','auf','unter','über','vor','hinter','neben','zwischen']);
      const result = [];
      for (const noun of [...new Map(nouns.map(e => [e.id,e])).values()]) {
        if (!table[noun.article]) continue;
        const rows = analyses.filter(a => norm(a.lemma) === norm(noun.word));
        const plurals = String(noun.plural || '').split(/\s*,\s*/u).map(norm);
        const plural = plurals.some(p => p && p !== '—' && (p === surface || !/[ns]$/u.test(p) && p+'n' === surface)) || rows.some(a => a.number === 'plural');
        const singular = !noun.plural_only && (surface === norm(noun.word) || rows.some(a => a.number === 'singular'));
        for (const key of [...(singular ? [noun.article] : []),...(plural ? ['plural'] : [])]) {
          let cases = table[key].flatMap((form,i) => form === norm(tokens[det][0]) ? [i] : []);
          if (governed[prep] !== undefined) cases = cases.filter(i => i === governed[prep]);
          if (twoWay.has(prep)) cases = cases.filter(i => i === 1 || i === 2);
          // Structured case tags may be split across rows; only use tags with
          // a compatible number, and never transfer plural evidence to singular.
          const tagged = rows.filter(a => !a.number || a.number === (key === 'plural' ? 'plural' : 'singular'))
            .flatMap(a => a.tags || []).filter(t => caseNames.includes(t));
          if (tagged.length) cases = cases.filter(i => tagged.includes(caseNames[i]));
          cases = cases.filter(i => {
            for (let m=det+1;m<head;m++) {
              const ending = i >= 2 || key === 'plural' || key === 'der' && i === 1 ? 'en' : 'e';
              if (!(modifiers.get(norm(tokens[m][0])) || []).some(row => row.ending === ending)) return false;
            }
            // Dative plural of a dictionary plural that can acquire -n.
            if (key === 'plural' && i === 2 && plurals.some(p => p === surface && !/[ns]$/u.test(p))) return false;
            return true;
          });
          if (cases.length) result.push({dictionaryId:noun.id,lemma:noun.word,baseArticle:noun.article,
            gender:({der:'masculine',die:'feminine',das:'neuter'})[noun.article],number:key === 'plural' ? 'plural' : 'singular',
            cases:cases.map(i => caseNames[i]),article:tokens[det][0],noun:tokens[head][0],spans:[span(det),span(head)]});
        }
      }
      return result;
    }
    function grammarRank(word, context, candidates, inflections = []) {
      const unchanged = {candidates,preferred:null,evidence:null};
      if (!context || !Number.isInteger(context.tokenOffset)) return unchanged;
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (index < 0) return unchanged;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      let start = index, end = index;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const nominal = nominalRank(word,tokens,index,start,end,matches,candidates);
      if (nominal.evidence) return nominal;
      // These are different learning senses. Generic syntax is not sufficient
      // to silently choose between them; retain the reader's meaning choice.
      if (candidates.filter(c => c.item?.reading_policy === "separate").length > 1) return unchanged;
      const isVerb = c => (posMap[c.pos] || c.pos) === "Verb";
      const verbs = candidates.filter(isVerb), nouns = candidates.filter(c => (posMap[c.pos] || c.pos) === "Nomen");
      const finite = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II"].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? [group[person]] : Object.values(group)).some(form => {
          if (!form) return false;
          const parts = norm(form).split(/\s+/);
          return norm(tokens[i][0]) === (parts.length === 2 ? parts[1]+parts[0] : norm(form));
        });
      });
      const importedFinite = (candidate,person) => inflections.some(row =>
        norm(row.form) === norm(word) && norm(row.lemma) === norm(candidate.lemma) &&
        (posMap[row.pos] || row.pos) === "Verb" &&
        !row.tags.some(tag => ["infinitive","participle","imperative"].includes(tag)) &&
        row.person && row.number && (row.tense || /^subjunctive/u.test(row.mood || "")) &&
        (!person || ({ich:"first-person:singular",du:"second-person:singular","er/sie/es":"third-person:singular",wir:"first-person:plural",ihr:"second-person:plural",sie:"third-person:plural"})[person] === `${row.person}:${row.number}`));
      const candidateFinite = (candidate,person) => candidate.item && finite(candidate.item,index,person) || importedFinite(candidate,person);
      const choose = (favoured,evidence) => favoured.length ? {
        candidates:[...favoured,...candidates.filter(c => !favoured.includes(c))],
        preferred:favoured.length === 1 ? favoured[0] :
          new Set(favoured.map(c => `${norm(c.lemma)}:${canonicalPos(c.pos)}`)).size === 1 && favoured.filter(c => c.source === "main").length === 1
            ? favoured.find(c => c.source === "main") : null,evidence
      } : unchanged;
      // Internal capitals favour a noun, but sentence/quotation starts do not.
      // Keep homographic verbs/adjectives available for manual correction.
      const prefix = sentence.slice(0,tokens[index].index);
      const startsUtterance = index === 0 || /[.!?…]\s*[«„“"‘»”]*\s*$/u.test(prefix) ||
        /[«„“"‘]\s*$/u.test(prefix);
      if (nouns.length && /^[A-ZÄÖÜ]/u.test(word) && !startsUtterance)
        return {...choose(nouns,"internal-capital-noun"),blocked:new Set(nouns.map(c => norm(c.lemma))).size > 1 ||
          nouns.length > 1 && nouns.filter(c => c.source === "main").length !== 1};
      // Our dictionary stores separate exercise cards for adjectives and
      // adverbs. Prefer a card only when local syntax supports its use; retain
      // all alternatives so a reader can correct the inference.
      const adjectives = candidates.filter(c => canonicalPos(c.pos) === "Adjektiv");
      const adverbs = candidates.filter(c => canonicalPos(c.pos) === "Adverb");
      const clauseVerbs = tokens.slice(start,end+1).flatMap((_,offset) =>
        matches(start+offset).filter(e => e.type === "Verb"));
      // In findet das schön, das is the object pronoun, not an article
      // introducing a noun or surname. Resolve the adjective before noun clues.
      if (adjectives.length && index > start &&
          ["das","es","ihn","sie","mich","dich","uns","euch"].includes(norm(tokens[index-1][0])) &&
          clauseVerbs.some(e => norm(e.word) === "finden"))
        return choose(adjectives,"object-predicative-adjective");
      if (adjectives.length && adverbs.length &&
          new Set([...adjectives,...adverbs].map(c => norm(c.lemma))).size === 1 &&
          candidates.every(c => ["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
            c.source === "fallback" && canonicalPos(c.pos) === "Nomen")) {
        const nounAfter = index < end && matches(index+1).some(e => e.type === "Nomen");
        const copulas = new Set(["sein","werden","bleiben"]);
        const auxiliaries = new Set(["sein","haben","werden","können","müssen","dürfen","sollen","wollen","mögen"]);
        // A lexical verb (including a dictionary-backed participle) is stronger
        // evidence than an auxiliary: ist spät aufgestanden -> adverb.
        // Lexical readings precede copula clues. These rules apply only to
        // dictionary-backed ADJ/ADV alternatives; nominal agreement ran above.
        const next = norm(tokens[index+1]?.[0]);
        let following = index+1;
        while (following <= end && ["sehr","so","zu","ganz","besonders"].includes(norm(tokens[following][0]))) following++;
        const modifiesAdjective = following <= end &&
          matches(following).some(e => e.type === "Adjektiv");
        if (norm(word) === "eigentlich" ||
            norm(word) === "gar" && (/^(?:nicht|nichts|kein(?:e|en|em|er|es)?)$/u.test(next) || modifiesAdjective || next === "normal") ||
            norm(word) === "wirklich" && (modifiesAdjective || next === "sehr" || next === "willkommen"))
          return choose(adverbs,"lexical-adverb-modifier");
        // These verbs can take a predicative adjective (findet es schön,
        // macht ihn glücklich). Leave that distinction to the reader.
        const predicateComplements = new Set(["finden","machen","halten","nennen","fühlen","wirken","scheinen","aussehen"]);
        if (clauseVerbs.some(e => predicateComplements.has(norm(e.word)))) return unchanged;
        if (["spät","früh"].includes(norm(word)) &&
            tokens.slice(start,index).some(t => norm(t[0]) === "es") &&
            clauseVerbs.some(e => norm(e.word) === "sein"))
          return choose(adverbs,"temporal-adverb");
        const lexicalVerb = clauseVerbs.some(e => !auxiliaries.has(norm(e.word)) && !copulas.has(norm(e.word)));
        if (!nounAfter && lexicalVerb) return choose(adverbs,"adverbial-verb-modifier");
        if (!nounAfter && clauseVerbs.some(e => copulas.has(norm(e.word))) &&
            !clauseVerbs.some(e => !copulas.has(norm(e.word))))
          return choose(adjectives,"predicative-adjective");
      }
      const adjective = i => modifiers.has(norm(tokens[i]?.[0])) || matches(i).some(e => e.type === "Adjektiv") ||
        ["e","en","em","er","es"].some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      const determiners = new Set(["der","die","das","dem","den","des","ein","eine","einem","einen","einer","eines","mein","dein","sein","ihr","unser","euer","kein","keine","dieses","dieser","diese"]);
      let determinerIndex = index-1;
      while (determinerIndex >= start && index-determinerIndex <= 3 && adjective(determinerIndex)) determinerIndex--;
      const rawDeterminer = norm(tokens[determinerIndex]?.[0]);
      const contractions = {im:"dem",am:"dem",beim:"dem",vom:"dem",zum:"dem",zur:"der",ins:"das",ans:"das",aufs:"das",durchs:"das",fürs:"das",ums:"das",übers:"das",unters:"das",hinterm:"dem",überm:"dem",unterm:"dem"};
      const determiner = contractions[rawDeterminer] || rawDeterminer;
      const inflectedDeterminer = /^(?:mein|dein|sein|ihr|unser|euer|eur|kein|dies|jen)(?:e|en|em|er|es)?$/u.test(determiner);
      // After stronger contextual rules, lowercase spelling favours an adjective
      // over a noun. Keep every candidate available for manual correction.
      // Sentence-initial capitals provide no evidence between these two roles.
      if (adjectives.length && nouns.length && candidates.every(c =>
          ["Adjektiv","Nomen"].includes(canonicalPos(c.pos)))) {
        if (/^[a-zäöüß]/u.test(word)) return choose(adjectives,"lowercase-adjective-over-noun");
        if (index === 0) return {...unchanged,blocked:true,evidence:"sentence-initial-adjective-noun-ambiguity"};
      }
      // A dictionary noun after a determiner is useful evidence even when the
      // reader's text omits capitals (mein buch, ein gutes essen).
      if (nouns.length && determinerIndex >= start && (determiners.has(determiner) || inflectedDeterminer)) {
        const compatible = nouns.filter(c => {
          if (!c.item?.article) return true;
          const plural = String(c.item.plural || "").split(/\s*,\s*/).some(p => norm(p) === norm(word) || norm(p)+"n" === norm(word));
          if (plural && (["die","der","den"].includes(determiner) || /(?:e|en|er)$/u.test(determiner) && inflectedDeterminer)) return true;
          if (norm(c.item.word) !== norm(word)) return false;
          const articles = {der:["der","den","dem","des","ein","einen","einem","eines"],die:["die","der","eine","einer"],das:["das","dem","des","ein","einem","eines"]};
          return inflectedDeterminer || (articles[c.item.article] || []).includes(determiner);
        });
        if (compatible.length) return choose(compatible,"noun-after-determiner");
      }
      const clauseIndices = Array.from({length:end-start+1},(_,i)=>start+i);
      const modal = clauseIndices.some(i => i < index && matches(i).some(e => e.type === "Verb" &&
        ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden","lassen"].includes(e.word) && finite(e,i)));
      if (modal && /^[a-zäöü]/u.test(word)) {
        const infinitives = verbs.filter(c => norm(c.lemma) === norm(word));
        if (infinitives.length) return choose(infinitives,"infinitive-in-modal-group");
      }
      const auxiliaries = clauseIndices.flatMap(i => matches(i).filter(e => e.type === "Verb" && ["haben","sein"].includes(e.word) && finite(e,i)));
      const participles = verbs.filter(c => c.item && auxiliaries.some(e => e.word === c.item.auxiliary) &&
        norm(String(c.item.perfect_form || "").split(/\s+/).pop()) === norm(word));
      if (participles.length) {
        const prepositions = new Set(["in","an","auf","über","unter","vor","hinter","neben","zwischen","für","durch","gegen","ohne","um","mit","bei","von","zu","aus","nach","seit"]);
        const accusativePronouns = new Set(["mich","dich","ihn","etwas","nichts"]);
        const accusativeDeterminers = new Set(["den","einen","meinen","deinen","seinen","ihren","unseren","euren","keinen","diesen","jenen"]);
        const accusative = clauseIndices.some(i => i !== index && !(i > start && prepositions.has(norm(tokens[i-1][0]))) &&
          (accusativePronouns.has(norm(tokens[i][0])) || accusativeDeterminers.has(norm(tokens[i][0])) && (() => {
            let nounIndex = i+1;
            while (nounIndex < index && nounIndex-i <= 3 && adjective(nounIndex)) nounIndex++;
            // den Kindern / den Autos may be dative plurals; do not use them
            // as evidence for an accusative verb. This clue is deliberately narrow.
            return nounIndex < index && /^[A-ZÄÖÜ]/u.test(tokens[nounIndex][0]) && !/[ns]$/iu.test(tokens[nounIndex][0]);
          })()));
        const dative = clauseIndices.some(i => ["mir","dir","ihm","ihr","uns","euch","ihnen"].includes(norm(tokens[i][0])));
        if (accusative) {
          const transitive = participles.filter(c => (c.item.complements || []).some(comp => comp.pattern === "Akkusativ"));
          if (transitive.length) return choose(transitive,"participle-with-accusative-object");
        } else if (dative) {
          const recipients = participles.filter(c => (c.item.complements || []).some(comp => comp.pattern === "Dativ"));
          if (recipients.length) return choose(recipients,"participle-with-dative-complement");
        }
        // An auxiliary does not settle hören vs gehören: both can use gehört.
        return choose(participles,"auxiliary-and-participle");
      }
      const subjectPersons = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
      const finiteCandidates = verbs.filter(c => [index-1,index+1].some(i => i >= start && i <= end &&
        (subjectPersons[norm(tokens[i][0])] || []).some(person => candidateFinite(c,person))));
      if (finiteCandidates.length) return choose(finiteCandidates,"finite-verb-with-subject");
      // A local article + dictionary noun can establish third-person agreement.
      // Keep distant/competing subjects and any auxiliary bracket unresolved here.
      const nounSubjects = [];
      for (let i=start+1;i<=end;i++) {
        const article=norm(tokens[i-1][0]), surface=norm(tokens[i][0]);
        if (!['der','die','das'].includes(article) || !/^[A-ZÄÖÜ]/u.test(tokens[i][0])) continue;
        const readings=matches(i).filter(e=>e.type==='Nomen').flatMap(e=>{
          const singular=surface===norm(e.word)&&article===norm(e.article);
          const plural=surface===norm(e.plural)&&article==='die';
          return [...(singular?['er/sie/es']:[]),...(plural?['sie']:[])];
        });
        const persons=[...new Set(readings)];
        if(persons.length===1)nounSubjects.push({index:i,person:persons[0]});
      }
      const otherSubject=Array.from({length:end-start+1},(_,k)=>start+k).some(i=>
        i!==index && subjectPersons[norm(tokens[i][0])] && norm(tokens[i][0])!=='sie' &&
        !['der','die','das'].includes(norm(tokens[i][0])));
      const otherVerb=Array.from({length:end-start+1},(_,k)=>start+k).some(i=>i!==index&&
        matches(i).some(e=>e.type==='Verb'));
      if(nounSubjects.length===1&&!otherSubject&&!otherVerb&&
        !['und','oder','aber','sondern','doch'].includes(norm(tokens[start-1]?.[0]))) {
        const subject=nounSubjects[0];
        const before=subject.index===index-1&&subject.index-1===start;
        const after=subject.index===index+2&&index===start;
        if(before||after) {
          const agreed=verbs.filter(c=>candidateFinite(c,subject.person));
          if(agreed.length)return choose(agreed,'finite-verb-with-noun-subject');
        }
      }
      const finiteOnly = verbs.filter(c => candidateFinite(c));
      const participleAlternative = verbs.some(c =>
        c.item && norm(String(c.item.perfect_form || "").split(/\s+/u).at(-1)) === norm(word) ||
        inflections.some(row => norm(row.lemma) === norm(c.lemma) && row.tags.includes("participle")));
      // Restored homographs may be finite verbs AND participles of another
      // lemma. Without the subject evidence above, keep that ambiguity even
      // when a parenthesis separates the participle from its auxiliary.
      if (finiteOnly.length && !nouns.length && !participleAlternative)
        return choose(finiteOnly,"validated-finite-form");
      return unchanged;
    }
    const contractionForms = {im:['in','dem'],am:['an','dem'],ans:['an','das'],ins:['in','das'],beim:['bei','dem'],zum:['zu','dem'],zur:['zu','der'],vom:['von','dem']};
    const superlatives = new Map();
    for (const entry of entries) {
      const explicit=norm(entry.superlative).replace(/^am /u,'');
      const forms=entry.search_forms||[];
      const verified=[explicit,...forms.filter(f=>/sten$/u.test(f)&&forms.includes(f.slice(0,-1)))].filter(f=>/^[\p{L}\p{M}]+$/u.test(f));
      if(!['Adjektiv','Adverb'].includes(entry.type))continue;
      for(const form of new Set(verified)){const rows=superlatives.get(form)||[];rows.push(entry);superlatives.set(form,rows);}
    }
    function contractionExtraContext(word,tail) {
      if(calendarDateLength(word,tail))return 'calendar-date';
      const opener=tail.match(/^[ \t]+("|„|“|«|»|``)/u);
      if(!opener)return null;
      const closer={'"':'"','„':'“','“':'”','«':'»','»':'«','``':"''"}[opener[1]];
      const start=opener[0].length,close=tail.indexOf(closer,start);
      if(close<0||close-start>160)return null;
      const content=tail.slice(start,close);
      if(/[.!?;:\n\r]/u.test(content))return null;
      // Quoted noun phrases, not arbitrary quoted sentences or superlatives.
      const tokens=[...content.matchAll(/[\p{L}\p{M}]+(?:[0-9]+)?(?:-[\p{L}\p{M}]+)*/gu)].slice(0,4);
      let end=0;
      for(const t of tokens) {
        if(/[^\s]/u.test(content.slice(end,t.index)))return null;
        end=t.index+t[0].length;
        const rows=forms.get(norm(t[0]))||[];
        if(/^[A-ZÄÖÜ]/u.test(t[0]))return !rows.length||rows.some(e=>e.type==='Nomen')?'quoted-noun-phrase':null;
        if(grammaticalWords.has(norm(t[0]))||rows.some(e=>e.type==='Verb')&&!modifiers.has(norm(t[0])))return null;
        if(!rows.some(e=>['Adjektiv','Adverb'].includes(e.type))&&!modifiers.has(norm(t[0]))&&!/en$/u.test(t[0]))return null;
      }
      return null;
    }
    async function contractionRule(word,context,candidates) {
      const parts=contractionForms[norm(word)];
      if (!parts) return null;
      const sentence=String(context?.sentence||''), offset=context?.tokenOffset;
      const tail=Number.isInteger(offset)?sentence.slice(offset+word.length):'';
      const extraContext=contractionExtraContext(word,tail);
      const nearby=[...tail.matchAll(/[\p{L}\p{M}]+/gu)].slice(0,4);
      const local=[];let end=0;
      for(const t of nearby){if(/[^\s]/u.test(tail.slice(end,t.index)))break;local.push(t);end=t.index+t[0].length;}
      const next=local[0];
      let bases=norm(word)==='am'&&next?superlatives.get(norm(next[0]))||[]:[];
      // Already available lexical data only; no neighbour lookup or recursive resolution.
      let nominal=false,windowExhausted=false;
      for(const t of local){
        const rows=forms.get(norm(t[0]))||[];
        if(/^[A-ZÄÖÜ]/u.test(t[0])){nominal=!rows.length||rows.some(e=>e.type==='Nomen');break;}
        if(grammaticalWords.has(norm(t[0]))||rows.some(e=>e.type==='Verb')&&!modifiers.has(norm(t[0]))||
          !rows.some(e=>['Adjektiv','Adverb'].includes(e.type))&&!modifiers.has(norm(t[0]))&&!/en$/u.test(t[0]))break;
        if(t===local[3])windowExhausted=true;
      }
      // Expand missing own evidence only; retain all established own decisions.
      // One shared compact-index fetch, never a lexical lookup of the neighbour.
      if(norm(word)==='am'&&next&&!nominal&&!bases.length&&/^[a-zäöüß].*sten$/u.test(next[0])&&fallback.superlativeEntries) {
        try {
          const rows=await fallback.superlativeEntries(next[0]);
          const unique=new Map();
          for(const [lemma,pos,meanings]of rows) {
            if(!unique.has(norm(lemma)))unique.set(norm(lemma),{word:lemma,type:pos==='adj'?'Adjektiv':'Adverb',translation_en:meanings.join('; '),translation_ru:'',fallbackSuperlative:true});
          }
          bases=[...unique.values()];
        } catch (_) { /* Missing optional evidence preserves the old explicit choice. */ }
      }
      const component=(lemmas.get(parts[0])||[]).map(mainCandidate).find(c=>c.pos==='prep') || null;
      let translation={en:'',ru:''};
      if(component)translation={...component.translation};
      else {
        // The contraction's own component must not lose its meaning when
        // contextual morphology evicts an unrelated entry from the LRU cache.
        // Lookup the expansion's preposition, never a neighbouring noun.
        try {const g=(await lexicalLookup(parts[0])).find(g=>g.pos==='prep'&&!g.unresolved&&g.kind!=='form-note');if(g)translation.en=g.meanings.join('; ');}catch(_){}
      }
      const contraction={source:'fallback',lemma:norm(word),pos:'contraction',posLabel:'contraction',translation,
        explanation:{kind:'contraction',expansion:parts.join(' '),componentLemma:parts[0],componentId:component?.dictionaryId||null},
        construction:{id:'preposition-article',lemma:norm(word),label:'Preposition + article',note:{ru:`${norm(word)} = ${parts.join(' ')}`,en:`${norm(word)} = ${parts.join(' ')}`},spans:Number.isInteger(offset)?[{text:word,start:offset,end:offset+word.length}]:[]}};
      const supers=bases.map(e=>({...mainCandidate(e),source:'fallback',dictionaryId:undefined,item:e.fallbackSuperlative?undefined:e,lemma:`am ${next[0]}`,pos:'superlative-construction',posLabel:'Superlative',
        explanation:{kind:'superlative',baseLemma:e.word,baseId:e.id,...(e.fallbackSuperlative?{evidence:"fallback-structured-superlative"}:{})},
        construction:{id:'am-superlative',lemma:e.word,label:'Superlative',note:{ru:'Превосходная степень',en:'Superlative'},spans:[{text:word,start:offset,end:offset+word.length},{text:next[0],start:offset+word.length+next.index,end:offset+word.length+next.index+next[0].length}]}}));
      const competitors=candidates.filter(c=>c.pos!=='contraction'&&!(norm(c.lemma)===norm(word)&&['prep','particle'].includes(c.pos)) &&
        !(['noun','name'].includes(c.pos)&&/\b(?:acronym|initialism) of\b/iu.test(c.translation?.en||'')&&word!==word.toUpperCase()));
      const uncertainSuper=norm(word)==='am'&&next&&!nominal&&!bases.length&&/sten$/u.test(norm(next[0]));
      const confidentSuper=bases.length===1&&!nominal&&/^[a-zäöüß]/u.test(next[0]);
      const choice=!context||!local.length&&!extraContext||competitors.length>0||uncertainSuper||bases.length>1||bases.length>0&&!nominal&&windowExhausted;
      const result=confidentSuper?[...supers,...competitors]:[contraction,...(!nominal?supers:[]),...competitors];
      return {candidates:result,selected:choice?null:confidentSuper?supers[0]:contraction,evidence:choice?'contraction-choice':confidentSuper?bases[0].fallbackSuperlative?'fallback-am-superlative':'dictionary-am-superlative':extraContext||'preposition-article'};
    }
    function withoutSuperlativeFormRecord(word,context,candidates,inflections) {
      // Lowercase attributive use only; nominalized forms are a separate task.
      if(!context||!Number.isInteger(context.tokenOffset)||!/^[a-zäöüß]/u.test(word))return candidates;
      const next=String(context.sentence||'').slice(context.tokenOffset+word.length).match(/^[ \t]+([\p{L}\p{M}]+)/u);
      if(!next||!/^[A-ZÄÖÜ]/u.test(next[1]))return candidates;
      const known=forms.get(norm(next[1]))||[];
      const compound=/^[ \t]+-[ \t]+[A-ZÄÖÜ][\p{L}\p{M}]+/u.test(String(context.sentence).slice(context.tokenOffset+word.length+next[0].length));
      if(known.length&&!known.some(e=>e.type==='Nomen')&&!compound)return candidates;
      const bases=new Set(inflections.filter(a=>norm(a.form)===norm(word)&&canonicalPos(a.pos)==='Adjektiv'&&a.tags?.includes('superlative')).map(a=>norm(a.lemma)));
      if(bases.size!==1)return candidates;
      const base=[...bases][0];
      if(!candidates.some(c=>canonicalPos(c.pos)==='Adjektiv'&&norm(c.lemma)===base&&norm(c.lemma)!==norm(word)))return candidates;
      const grammar=new Set(['strong','weak','mixed','nominative','accusative','genitive','dative','masculine','feminine','neuter','singular','plural','all','case','gender','superlative','degree']);
      return candidates.filter(c=>{
        if(c.source!=='fallback'||canonicalPos(c.pos)!=='Adjektiv'||norm(c.lemma)!==norm(word))return true;
        const meanings=c.meanings||[c.translation?.en||''];
        const pure=meanings.length>0&&meanings.every(m=>{
          const tokens=norm(m).split(/[\s,;\/-]+/u).filter(Boolean);
          return tokens.includes('superlative')&&tokens.includes('degree')&&tokens.every(t=>grammar.has(t));
        });
        return !pure;
      });
    }
    async function reverseSuperlative(word,context) {
      if(!context||!/sten$/u.test(norm(word))||!Number.isInteger(context.tokenOffset))return null;
      const prefix=String(context.sentence||'').slice(0,context.tokenOffset);
      const previous=prefix.match(/(?:^|[^\p{L}\p{M}])(am|Am)[ \t]+$/u);
      if(!previous)return null;
      const offset=prefix.length-previous[1].length-previous[0].match(/[ \t]+$/u)[0].length;
      const result=await contractionRule(previous[1],{...context,tokenOffset:offset},[]);
      if(!result?.candidates.some(c=>c.construction?.id==='am-superlative'))return null;
      if(result.selected?.construction?.id!=='am-superlative'&&result.selected)return null;
      return {...result,candidates:result.candidates.filter(c=>c.construction?.id==='am-superlative')};
    }
    async function resolve(word, context) {
      if(context){
        if(fallback.mayBeVerb && hasReflexivePronoun(context.sentence))fallback.mayBeVerb(word);
        if(!ownOnlyVerbs.has(norm(word))&&!(forms.get(norm(word))||[]).some(e=>e.type==='Verb'&&ownOnlyVerbs.has(norm(e.word))))lexicalLookup(word).catch(()=>{});
      }
      let preparationError = null;
      if (context) try { await prepareSeparable(); } catch (e) { preparationError = e; }
      const exact = [...(forms.get(norm(word)) || [])];
      // The age entry is a bound suffix, never the archaic standalone jährig.
      // Accept numeric and common spelled-out number compounds, including endings.
      const ageEntry = entries.find(e => e.word === "-jährig");
      const unit = "(?:ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)";
      const tens = "(?:zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)";
      const number = `(?:${unit}(?:hundert|tausend))?(?:${unit}und${tens}|${unit}|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|${tens})`;
      if (ageEntry && new RegExp(`^(?:[1-9][0-9]*-|${number})jährig(?:e|en|em|er|es)?$`,"u").test(norm(word)) && !exact.some(e=>e.id===ageEntry.id)) exact.push(ageEntry);
      const derived = (modifiers.get(norm(word)) || []).map(row => row.entry);
      const dictionaryForms = new Set(exact.map(e => e.id));
      const ownOnlyVerb = ownOnlyVerbs.has(norm(word)) || exact.some(item => item.type === "Verb" && ownOnlyVerbs.has(norm(item.word)));
      let separated = [];
      try { separated = await resolveSeparableCandidates(word,context); } catch (e) { preparationError ||= e; }
      // Independent clicked-word lookup overlaps sentence morphology; reuse
      // the same promise in both paths instead of serial network round trips.
      const directLookup=!ownOnlyVerb&&(!exact.length||context||reflexiveForms.has(norm(word)))?lexicalLookup(word):null;
      directLookup?.catch(()=>{});
      const reflexive = await reflexiveCandidates(word,context);
      let candidates = [...separated,...exact.map(mainCandidate),...derived.map(mainCandidate)], error = preparationError, unresolvedMeanings = [], formNotes = [], inflections = [];
      // Interactive lookup checks missing parts of speech; word-only callers keep
      // their existing main-first behaviour and avoid unnecessary downloads.
      if (!ownOnlyVerb && (!exact.length || context || reflexiveForms.has(norm(word)))) {
        try {
          // Use the common source collector without enabling new role choices.
          // The next stage can consume its verified modifier discoveries.
          await directLookup;
          const morphology = await collectMorphology(word);
          if (morphology.errors.length) throw new Error(morphology.errors.map(e=>e.message).join('; '));
          for (const group of morphology.groups) {
            if (ownOnlyVerbs.has(norm(group.word)) || group.kind === "form-note" && group.inflections?.some(row => ownOnlyVerbs.has(norm(row.lemma)))) continue;
            if (group.kind === "form-note") { formNotes.push(group); inflections.push(...(group.inflections || [])); continue; }
            const partOfSpeech = canonicalPos(group.pos);
            if (group.unresolved) { unresolvedMeanings.push(...group.meanings); continue; }
            const main = (lemmas.get(norm(group.word)) || []).filter(item => partOfSpeech && item.type === partOfSpeech);
            for (const item of main) dictionaryForms.add(item.id);
            candidates.push(...main.map(mainCandidate));
            if (group.meanings.length) candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",posLabel:partOfSpeech,
              translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings,
              ...(partOfSpeech === "Verb" && /^sich\s+/u.test(norm(group.word)) && norm(word) !== norm(group.word)
                ? {reflexiveUnconfirmed:true} : {})});
          }
        } catch (e) { error = e; }
      }
      // Replace conditional reflexive entries before POS coverage can hide
      // their non-reflexive counterparts. Unconfirmed senses remain available
      // for manual selection but cannot rank or resolve themselves.
      // L01 attributive participles have independent noun-phrase evidence;
      // they must not require an explicit reflexive pronoun in the text.
      const attributed = derived.some(e=>reflexiveEntries.has(e))
        ? grammarRank(word,context,candidates,inflections).candidates.filter(c=>reflexiveEntries.has(c.item) && c.usage?.role === "attributive") : [];
      candidates = candidates.filter(c => !reflexiveEntries.has(c.item) || norm(word) === norm(c.lemma));
      // Mapped fallback lemmas and reconstructed separated verbs can supply
      // candidates even when the own finite-form table is incomplete.
      const lexicalEntries = new Set((reflexiveForms.get(norm(word)) || []).map(row=>row.entry));
      for (const c of candidates) if (canonicalPos(c.pos) === "Verb")
        for (const entry of reflexiveLemmas.get(norm(c.lemma)) || []) lexicalEntries.add(entry);
      for (const analysis of inflections)
        for (const entry of reflexiveLemmas.get(norm(analysis.lemma)) || []) lexicalEntries.add(entry);
      const conditional = [...lexicalEntries]
        .filter(entry => ![...reflexive,...attributed].some(c=>c.dictionaryId === entry.id))
        .map(entry=>({...mainCandidate(entry),reflexiveUnconfirmed:true}));
      candidates.push(...reflexive,...attributed,...conditional);
      // Own coverage applies to a lexical lemma/POS, never an entire POS.
      // A recognised merged lexical card covers both modifier POS headers.
      // Coverage is lemma-scoped: a homographic verb or another lemma survives.
      const merged = candidates.filter(c => c.source === "main" && c.item.reading_policy === "merged");
      candidates = candidates.filter(c => c.source !== "fallback" || !["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
        !merged.some(m => [m.lemma,...(m.item.search_forms || [])].some(lemma => norm(lemma) === norm(c.lemma))));
      const lexicalKey = c => `${norm(c.lemma)}:${canonicalPos(c.pos)}`;
      const coveredLexemes = new Set(candidates.filter(c => c.source === "main" && !reflexiveEntries.has(c.item)).map(lexicalKey));
      if (coveredLexemes.size) {
        // A known base verb does not cover a reconstructed complete verb
        // missing from ours (stellt … bereit -> bereitstellen, not stellen).
        const uncoveredCompleteVerb = separated.length === 1 && separated[0].source === "fallback" ? separated[0] : null;
        candidates = candidates.filter(c => c.source === "main" || c.reflexiveUnconfirmed || c.construction?.id === "reflexive-verb" || c === uncoveredCompleteVerb || separated.some(pair => pair.source === "fallback" && window.BibliothekVocabulary.identity(pair) === window.BibliothekVocabulary.identity(c)) ||
          knownPartsOfSpeech.has(canonicalPos(c.pos)) && !coveredLexemes.has(lexicalKey(c)));
        unresolvedMeanings = [];
      }
      candidates = [...reflexive,...candidates.filter(c=>!reflexive.some(r=>window.BibliothekVocabulary.identity(r)===window.BibliothekVocabulary.identity(c)))];
      candidates = candidates.filter((c,i,all) => all.findIndex(x => window.BibliothekVocabulary.identity(x) === window.BibliothekVocabulary.identity(c)) === i);
      const nominalizedNoun = infinitiveNoun(word,context) || adjectiveNoun(word,context);
      if (nominalizedNoun) {
        const identity = window.BibliothekVocabulary.identity(nominalizedNoun);
        candidates = [nominalizedNoun,...candidates.filter(c => window.BibliothekVocabulary.identity(c) !== identity)];
      }
      const people = personNouns(word,context);
      if (people) {
        const identities = new Set(people.map(c => window.BibliothekVocabulary.identity(c)));
        candidates = [...people,...candidates.filter(c => !identities.has(window.BibliothekVocabulary.identity(c)))];
      }
      const group = futurePerfectGroup(word,context) || await lassenGroup(word,context,candidates) || zuGroup(word,context) || werdenGroup(word,context) || verbGroup(word,context);
      // Historical form aliases enter the UI only after a full chain is proven.
      // Keep the original token and offsets for highlighting and saved choices.
      if(group?.id==='lassen-infinitive' && lassenHistoricalForms.has(norm(word))) {
        for(const entry of group.roles.filter(e=>e.id && (forms.get(norm(lassenForm(word)))||[]).some(f=>f.id===e.id)))
          if(!candidates.some(c=>c.dictionaryId===entry.id))candidates.push(mainCandidate(entry));
      }
      // Joined zu forms can belong to a complete verb missing from ours;
      // keep that recognised target rather than guessing from its stem.
      if (group?.main?.importedSeparable && !candidates.some(c=>norm(c.lemma) === norm(group.main.word) && canonicalPos(c.pos) === "Verb"))
        candidates.push(mainCandidate(group.main));
      if (group) {
        const {roles,main,marker,meaning,meaningLemma,...construction} = group;
        candidates = candidates.map(c => {
          if ((c.reflexiveUnconfirmed && group.id !== "werden-future-perfect") || c.construction?.id === "reflexive-verb" && !(group.id==='lassen-infinitive'&&c.construction.attachmentOnly)) return c;
          if (group.marker && c.lemma === "zu" && canonicalPos(c.pos) === "particle")
            return {...c,construction,translation:{en:"infinitive marker",ru:"частица инфинитива"}};
          return roles.some(e => norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos) &&
            (!["werden-future-perfect","lassen-infinitive"].includes(group.id) || !c.dictionaryId || e.id === c.dictionaryId))
            ? {...c,construction,...(c.lemma === (group.meaningLemma || "werden") && group.meaning ? {translation:group.meaning} : {})} : c;
        });
      }
      // Base verbs from either dictionary are eligible for later contextual
      // analysis; eligibility does not assert a reflexive sense or create an ID.
      candidates = candidates.map(c => canonicalPos(c.pos) === "Verb" && !c.reflexiveLexical
        ? {...c,reflexiveLexical:{baseLemma:norm(c.lemma).replace(/^sich\s+/u,""),
          evidence:/^sich\s+/u.test(norm(c.lemma)) ? "dictionary-reflexive-lemma" : "base-verb-only"}}
        : c);
      // A verb-form link must not import its target's nominalized noun sense.
      // Keep direct homographs and targets explicitly linked by a noun form note.
      candidates = candidates.filter(c => {
        if (c.source !== "fallback" || canonicalPos(c.pos) !== "Nomen" ||
            !/^gerund of /i.test(c.translation?.en || "") || norm(c.lemma) === norm(word)) return true;
        const lemma = norm(c.lemma).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reference = new RegExp('\\bof\\s+' + lemma + '(?=$|[\\s:(“"])', 'u');
        return formNotes.some(g => canonicalPos(g.pos) === "Nomen" &&
          g.meanings.some(note => reference.test(norm(note))));
      });
      candidates=withoutSuperlativeFormRecord(word,context,candidates,inflections);
      const unconfirmed = candidates.filter(c => c.reflexiveUnconfirmed);
      const grammatical = grammarRank(word, context, candidates.filter(c => !c.reflexiveUnconfirmed), inflections);
      const ranked = contextualRank(word, context, grammatical.candidates);
      candidates = [...ranked.candidates,...unconfirmed];
      // The feminine personal pronoun's dative form means her, not she.
      if (norm(word) === "ihr") {
        const candidate = candidates.find(c => c.dictionaryId === "pronoun-004");
        if (candidate) candidate.translation = {en:"her (dative)",ru:"ей (дательный падеж)"};
      }
      const same = (a,b) => window.BibliothekVocabulary.identity(a) === window.BibliothekVocabulary.identity(b);
      const reflexiveVerb = reflexive.length === 1 && !reflexivePronouns.has(norm(word))
        ? candidates.find(c=>same(c,reflexive[0])) : null;
      const grouped = candidates.filter(c => c.construction && !(c.reflexiveUnconfirmed && c.construction.id === "werden-future-perfect") && !["separable-verb","reflexive-verb"].includes(c.construction.id));
      const exactChoice = exact.length === 1 && !reflexiveEntries.has(exact[0]) ? candidates.find(c => same(c,mainCandidate(exact[0]))) : null;
      const competingLexeme = exactChoice && candidates.some(c => canonicalPos(c.pos) === canonicalPos(exactChoice.pos) && norm(c.lemma) !== norm(exactChoice.lemma));
      // Card preference follows our dictionary convention only for a proven
      // lassen bracket and the paired finite form, not for standalone mögen.
      const moechteCard=group?.id==='lassen-infinitive'&&group.tense==='Konjunktiv II'&&
        grouped.some(c=>c.source==='main'&&c.lemma==='mögen') &&
        (verbAnalyses.get(norm(word))||[]).some(a=>a.base==='mögen'&&a.kind==='finite'&&a.tense==='Konjunktiv II')
          ? grouped.find(c=>c.source==='main'&&c.lemma==='möchten'&&(verbAnalyses.get(norm(word))||[]).some(a=>a.entry?.id===c.dictionaryId&&a.kind==='finite'&&a.tense==='Präsens')) : null;
      let preferred = people ? people.length === 1 ? people[0] : null : nominalizedNoun || (grammatical.blocked ? null : moechteCard || reflexiveVerb || ranked.preferred || (grouped.length === 1 ? grouped[0] : null) || (separated.length === 1 && separated[0].construction.confidence !== "tentative" ? candidates.find(c => same(c,separated[0])) : null) || grammatical.preferred || (!competingLexeme ? exactChoice : null));
      const needsReflexiveChoice = !reflexivePronouns.has(norm(word)) && candidates.some(c=>c.construction?.id === "reflexive-verb" && c.construction.interpretation && c.construction.confidence === "tentative");
      const needsSeparableChoice = candidates.some(c => c.construction?.id === "separable-verb" && c.construction.confidence === "tentative");
      // A plausible detached particle makes the base meaning uncertain too.
      // Saved occurrence choices are restored by the reader after resolution.
      if (preferred?.construction?.confidence === "tentative" || needsSeparableChoice || needsReflexiveChoice || separated.shortImperativeConflict) preferred = null;
      if (preferred) candidates = [preferred,...candidates.filter(c => c !== preferred)];
      const derivedOnly = candidates.length === 1 && derived.some(e => e.id === candidates[0].dictionaryId) && !dictionaryForms.has(candidates[0].dictionaryId);
      const selected = needsSeparableChoice || needsReflexiveChoice ? null : people ? preferred : nominalizedNoun || (grammatical.blocked || derivedOnly && !preferred ? null : candidates.length === 1 ? candidates[0].reflexiveUnconfirmed || candidates[0].construction?.confidence === "tentative" ? null : candidates[0] : preferred);
      const resolution = { preferred, evidence:needsReflexiveChoice ? "reflexive-reciprocal-choice" : people ? people.length === 1 ? "nominalized-person-agreement" : "ambiguous-nominalized-person" : nominalizedNoun ? nominalizedNoun.usage.kind === "adjective" ? "nominalized-adjective-after-indefinite" : "nominalized-infinitive-after-das" : reflexiveVerb ? "reflexive-subject-agreement" : ranked.evidence || (separated.some(c => c.construction.confidence !== "tentative") ? "separated-verb-pair" : separated.length ? "tentative-separated-verb-pair" : grammatical.evidence), form:word, formNotes, inflections, status:selected && candidates.length === 1 ? "resolved" : candidates.length ? "ambiguous" : "unresolved", candidates, selected, unresolvedMeanings, error };
      if (!resolution.selected && !people && !nominalizedNoun && !needsReflexiveChoice && !needsSeparableChoice) {
        const modifierChoice = await unresolvedModifierChoice(word,context,candidates,grammatical);
        if (modifierChoice) {
          resolution.selected = resolution.preferred = modifierChoice.candidate;
          resolution.evidence = modifierChoice.evidence;
          resolution.candidates = [modifierChoice.candidate,...candidates.filter(c => !same(c,modifierChoice.candidate))];
        }
      }
      if (!resolution.selected && !needsReflexiveChoice && !needsSeparableChoice) {
        const preposition = await unresolvedPrepositionChoice(word,context,candidates);
        if (preposition) {
          resolution.selected = resolution.preferred = preposition;
          resolution.evidence = "preposition-before-noun-phrase";
          resolution.candidates = [preposition,...resolution.candidates.filter(c => c !== preposition)];
        }
      }
      if (fallback.spellingTranslation) await Promise.all(candidates.filter(c => c.source === "fallback").map(async c => {
        try {
          const display = await fallback.spellingTranslation(c.lemma,c.pos,c.meanings || [c.translation?.en || '']);
          if (!display) return;
          c.spellingReferences = display.references;
          c.translation = {...c.translation,en:display.meanings.join('; ')};
          if (display.unresolved.length) c.spellingTranslationUnavailable = true;
        } catch (_) {
          c.translation = {...c.translation,en:''};
          c.spellingTranslationUnavailable = true;
        }
      }));
      const contractionResult=await contractionRule(word,context,candidates)||await reverseSuperlative(word,context);
      if(contractionResult)Object.assign(resolution,contractionResult,{preferred:contractionResult.selected,status:contractionResult.selected?'resolved':'ambiguous'});
      const phrases = await nounPhrase(word,context,resolution.candidates);
      const articlePhrase = phrases.length && new Set(phrases.map(p => `${p.lemma}:${p.baseArticle}`)).size === 1;
      resolution.candidates = resolution.candidates.map(c => {
        const related = canonicalPos(c.pos) === 'Nomen' ? phrases.filter(p => p.dictionaryId === c.dictionaryId) :
          c.pos === 'article' && articlePhrase ? phrases : [];
        return related.length ? {...c,nounPhrase:related} : c;
      });
      const identity = c => window.BibliothekVocabulary.identity(c);
      if (resolution.selected) resolution.selected = resolution.candidates.find(c => identity(c) === identity(resolution.selected)) || resolution.selected;
      if (resolution.preferred) resolution.preferred = resolution.candidates.find(c => identity(c) === identity(resolution.preferred)) || resolution.preferred;
      if (!resolution.selected && articlePhrase) {
        const linked = resolution.candidates.filter(c => c.nounPhrase &&
          (c.pos === 'article' || canonicalPos(c.pos) === 'Nomen'));
        if (linked.length === 1 && !resolution.candidates.some(c => c.construction?.confidence === 'tentative')) {
          resolution.selected = resolution.preferred = linked[0];
          resolution.evidence = linked[0].pos === 'article' ? 'definite-article-noun-agreement' : 'noun-definite-article-agreement';
          resolution.candidates = [linked[0],...resolution.candidates.filter(c => c !== linked[0])];
        }
      }
      // External attachment is display-only: no new selection, gender or case.
      const unlinked = resolution.candidates;
      resolution.candidates = await Promise.all(unlinked.map(async c => {
        const link = await externalNounArticleLink(word,context,c,unlinked);
        return link ? {...c,nounArticleLink:link} : c;
      }));
      if (resolution.selected) resolution.selected = resolution.candidates.find(c => identity(c) === identity(resolution.selected)) || resolution.selected;
      if (resolution.preferred) resolution.preferred = resolution.candidates.find(c => identity(c) === identity(resolution.preferred)) || resolution.preferred;
      // Enrich only after all morphology, ranking and selection are complete.
      if (window.BibliothekRussianTranslations)
        await window.BibliothekRussianTranslations.enrich({...resolution,candidates:resolution.candidates.filter(c=>!c.explanation)},window.DeutschTranslation?.getLang?.() || "en");
      return resolution;
    }
    return Object.freeze({ resolve, prepareSeparable,
      // Diagnostic consumers must not mutate cached groups or dictionary items.
      morphology:async (word,options) => JSON.parse(JSON.stringify(await collectMorphology(word,options))),
      entry:id => byId.get(String(id)) || null,
      matchSeparable:(word,context) => separatedForms.has(norm(word)) ? separableCandidates(word,context) : [],
      matchReflexive:reflexiveCandidates,
      diagnoseReflexive:async sentence=>{await prepareSeparable();const diagnostic={};await analyseReflexiveSentence(sentence,diagnostic);return diagnostic;},
      reflexiveMorphology:async word => (await tokenAnalyses(word)).map(({entry,candidate,...a})=>({...a,lemma:entry?.word||candidate?.lemma})),
      // Read-only discovery diagnostics, including unsupported/missing data.
      reflexiveInventory:() => [...reflexiveEntries].map(entry => ({dictionaryId:entry.id,lemma:entry.word,
        baseLemma:norm(entry.word).replace(/^sich\s+/u,""),source:"main",
        forms:[...reflexiveForms].flatMap(([form,rows]) => rows.filter(row=>row.entry===entry)
          .map(({entry:ignored,...analysis})=>({form,...analysis}))),
        warnings:[...(!Object.keys(formsOf(entry)).length ? ["missing-form-table"] : []),
          ...(norm(entry.word).replace(/^sich\s+/u,"").includes(" ") ? ["compound-layout-not-confirmed"] : [])]})),
      match:word => (forms.get(norm(word)) || []).map(entry=>({...mainCandidate(entry),
        ...(reflexiveEntries.has(entry) && norm(word) !== norm(entry.word) ? {reflexiveUnconfirmed:true} : {})})) });
  }
  window.BibliothekLemmaResolver = Object.freeze({ create, savedCandidate, calendarDateLength });
})();
