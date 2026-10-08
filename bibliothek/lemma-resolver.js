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
    async function tokenAnalyses(word) {
      const key = norm(word), result = [...(verbAnalyses.get(key) || [])];
      for(const entry of zuForms.get(key)||[])result.push({entry,base:norm(entry.word).replace(/^sich\s+/u,''),compound:[],kind:'infinitive',tense:'Infinitiv',zu:true,detached:false});
      if (grammaticalWords.has(key) || prepositions.has(key) || result.some(a=>a.entry&&!a.detached&&ownOnlyVerbs.has(a.base))) return result;
      // Capitalised dictionary nouns are not silently reinterpreted as predicates.
      if (!result.length && word[0] !== key[0] && (forms.get(key) || []).some(e=>e.type === 'Nomen')) return result;
      if(!result.length && fallback.mayBeVerb && !lookupCache.has(key) && !await fallback.mayBeVerb(word))return result;
      let groups;
      try { groups = await lexicalLookup(word); } catch (_) { return result; }
      const evidence = groups.filter(g=>g.kind === 'form-note').flatMap(g=>g.inflections || []);
      for (const g of groups.filter(g=>!g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length)) {
        const base = norm(g.word).replace(/^sich\s+/u,''), candidate = {source:'fallback',lemma:g.word,pos:g.pos,posLabel:'Verb',meanings:g.meanings,
          translation:{en:g.meanings.join('; '),ru:''},reflexiveLexical:{baseLemma:base,evidence:/^sich\s+/u.test(norm(g.word))?'dictionary-reflexive-lemma':'base-verb-only'}};
        const common = {base,candidate,compound:[]};
        for (const a of evidence.filter(a=>norm(a.lemma) === base && canonicalPos(a.pos) === 'Verb')) {
          const person = a.person && a.number ? ({'first-person':a.number === 'plural'?'wir':'ich','second-person':a.number === 'plural'?'ihr':'du','third-person':a.number === 'plural'?'sie':'er/sie/es'})[a.person] : null;
          const kind = a.tags.includes('participle') ? 'participle' : a.mood === 'imperative' ? 'imperative' : a.tags.includes('infinitive')||a.tags.includes('infinitive-zu') ? 'infinitive' : person ? 'finite' : null;
          if (kind) {
            const row={...common,kind,person:person || (kind === 'imperative' ? a.number === 'plural'?'ihr':'du' : null),tense:a.tense === 'past'||a.tense === 'preterite'?'Präteritum':'Präsens',zu:a.tags.includes('infinitive-zu'),detached:false};
            result.push(row);
            // Explicit regular second-person evidence can disambiguate a
            // syncretic third-person spelling omitted from the export tags.
            const stem=base.replace(/(?:en|n)$/u,''),second=stem+(/[sßxz]$/u.test(stem)?'t':'st');
            if(kind==='finite'&&a.tense==='present'&&a.mood==='indicative'&&key===stem+'t') {
              let proven=person==='du'&&key===second;
              if(!proven&&person==='ihr')try {
                const secondGroups=await lexicalLookup(second);
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
              const replacement=a.compound?.length?helpers.filter(h=>h.analysis.base==='haben'):[];
              if(modal.length===1||replacement.length===1) {
                const h=modal[0]||replacement[0];controller=h.index;control=h.analysis;componentIndices.push(controller);tense=replacement.length?(control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt'):control.tense;
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
            const spans=[...new Set(indices)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}));
            const caseName=['mir','dir'].includes(words[pronoun])?'Dativ':['mich','dich'].includes(words[pronoun])?'Akkusativ':'Akkusativ/Dativ';
            const tokenSpan=i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
            if(attempt)attempt.stage='linked';
            relations.push({...candidate,reflexiveUnconfirmed:false,construction:{id:'reflexive-verb',lemma:candidate.lemma,label:unresolvedLassen?'Mögliche Reflexivgruppe':'Reflexiv',...(unresolvedLassen?{confidence:'tentative'}:{}),
              note:unresolvedLassen?{ru:'Возможная возвратная группа с lassen; требуется выбор',en:'Possible reflexive lassen group; selection required'}:{ru:'Возвратная конструкция',en:'Reflexive construction'},spans,tense,reflexiveCase:caseName,
              verb:tokenSpan(v),pronoun:tokenSpan(pronoun),
              ...(a.detached?{prefix:tokenSpan(componentIndices.find(i=>i!==v&&words[i]===a.prefix))}:{}),
              subject:subject.index===null?null:{text:tokens[subject.index][0],start:tokens[subject.index].index,end:tokens[subject.index].index+tokens[subject.index][0].length},
              lexicalSenseConfirmed:reflexiveEntries.has(a.entry)||/^sich\s+/u.test(norm(candidate.lemma)),
              ...(complement?{complement:{...complement}}:{})},_lexicalIndices:[v,...componentIndices.filter(i=>i!==controller)],_pronounIndex:pronoun});
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
    function separableCandidates(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return [];
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return [];
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const gap = (a,b) => sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index);
      const hard = (a,b) => /[;:.!?…“”„"«»()]/u.test(gap(a,b)) || boundaries.has(norm(tokens[b][0]));
      const soft = (a,b) => /,/u.test(gap(a,b)) || /\s[–—]\s/u.test(gap(a,b));
      const competingVerb = i => {
        const entries = forms.get(norm(tokens[i][0])) || [];
        if (norm(tokens[i][0]) === "bitte" || /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && entries.some(e => e.type === "Nomen")) return false;
        return entries.some(e => e.type === "Verb") || separatedForms.has(norm(tokens[i][0]));
      };
      const results = [];
      for (let i = 0; i < tokens.length-1; i++) {
        const possible = separatedForms.get(norm(tokens[i][0])) || [];
        if (!possible.length) continue;
        let start = i;
        while (start > 0 && !hard(start-1,start) && !soft(start-1,start)) start--;
        if (i > start && /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && (forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Nomen")) continue;
        if (tokens.slice(start,i).some(t => (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" &&
          ["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten","lassen"].includes(e.word)))) continue;
        let crossed = false;
        for (let j = i+1; j < tokens.length; j++) {
          if (hard(j-1,j)) break;
          if (soft(j-1,j)) crossed = true;
          // A particle must close its local segment; otherwise it may be a preposition.
          const closes = j === tokens.length-1 || hard(j,j+1) || soft(j,j+1);
          const pairs = closes ? possible.filter(pair => pair.prefix === norm(tokens[j][0])) : [];
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
      return {candidates:marked,preferred,evidence:preferred ? "attributive-modifier-agreement" : "ambiguous-attributive-modifier",blocked:!preferred};
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
        preferred:favoured.length === 1 ? favoured[0] : favoured.filter(c => c.source === "main").length === 1 ? favoured.find(c => c.source === "main") : null,evidence
      } : unchanged;
      // Internal capitals favour a noun, but sentence/quotation starts do not.
      // Keep homographic verbs/adjectives available for manual correction.
      const prefix = sentence.slice(0,tokens[index].index);
      const startsUtterance = index === 0 || /[.!?…]\s*[«„“"‘»”]*\s*$/u.test(prefix) ||
        /[«„“"‘]\s*$/u.test(prefix);
      if (nouns.length && /^[A-ZÄÖÜ]/u.test(word) && !startsUtterance)
        return {...choose(nouns,"internal-capital-noun"),blocked:nouns.length > 1 &&
          nouns.filter(c => c.source === "main").length !== 1};
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
      const finiteOnly = verbs.filter(c => candidateFinite(c));
      if (finiteOnly.length && !nouns.length) return choose(finiteOnly,"validated-finite-form");
      return unchanged;
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
      const separated = separableCandidates(word, context);
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
          for (const group of await directLookup) {
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
      // Resolve all forms/mapped lemmas first; own coverage is occurrence-wide,
      // not a comparison between differently worded translation strings.
      // A recognised merged lexical card covers both modifier POS headers.
      // Coverage is lemma-scoped: a homographic verb or another lemma survives.
      const merged = candidates.filter(c => c.source === "main" && c.item.reading_policy === "merged");
      candidates = candidates.filter(c => c.source !== "fallback" || !["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
        !merged.some(m => [m.lemma,...(m.item.search_forms || [])].some(lemma => norm(lemma) === norm(c.lemma))));
      const coveredParts = new Set(candidates.filter(c => c.source === "main" && !reflexiveEntries.has(c.item)).map(c => canonicalPos(c.pos)));
      if (coveredParts.size) {
        // A known base verb does not cover a reconstructed complete verb
        // missing from ours (stellt … bereit -> bereitstellen, not stellen).
        const uncoveredCompleteVerb = separated.length === 1 && separated[0].source === "fallback" ? separated[0] : null;
        candidates = candidates.filter(c => c.source === "main" || c.reflexiveUnconfirmed || c.construction?.id === "reflexive-verb" || c === uncoveredCompleteVerb || separated.some(pair => pair.source === "fallback" && window.BibliothekVocabulary.identity(pair) === window.BibliothekVocabulary.identity(c)) ||
          knownPartsOfSpeech.has(canonicalPos(c.pos)) && !coveredParts.has(canonicalPos(c.pos)));
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
      const group = zuGroup(word,context) || werdenGroup(word,context) || verbGroup(word,context);
      // Joined zu forms can belong to a complete verb missing from ours;
      // keep that recognised target rather than guessing from its stem.
      if (group?.main?.importedSeparable && !candidates.some(c=>norm(c.lemma) === norm(group.main.word) && canonicalPos(c.pos) === "Verb"))
        candidates.push(mainCandidate(group.main));
      if (group) {
        const {roles,main,marker,meaning,meaningLemma,...construction} = group;
        candidates = candidates.map(c => {
          if (c.reflexiveUnconfirmed || c.construction?.id === "reflexive-verb") return c;
          if (group.marker && c.lemma === "zu" && canonicalPos(c.pos) === "particle")
            return {...c,construction,translation:{en:"infinitive marker",ru:"частица инфинитива"}};
          return roles.some(e => norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos))
            ? {...c,construction,...(c.lemma === (group.meaningLemma || "werden") && group.meaning ? {translation:group.meaning} : {})} : c;
        });
      }
      // Base verbs from either dictionary are eligible for later contextual
      // analysis; eligibility does not assert a reflexive sense or create an ID.
      candidates = candidates.map(c => canonicalPos(c.pos) === "Verb" && !c.reflexiveLexical
        ? {...c,reflexiveLexical:{baseLemma:norm(c.lemma).replace(/^sich\s+/u,""),
          evidence:/^sich\s+/u.test(norm(c.lemma)) ? "dictionary-reflexive-lemma" : "base-verb-only"}}
        : c);
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
      const grouped = candidates.filter(c => c.construction && !["separable-verb","reflexive-verb"].includes(c.construction.id));
      let preferred = people ? people.length === 1 ? people[0] : null : nominalizedNoun || (grammatical.blocked ? null : reflexiveVerb || ranked.preferred || (grouped.length === 1 ? grouped[0] : null) || (separated.length === 1 && separated[0].construction.confidence !== "tentative" ? candidates.find(c => same(c,separated[0])) : null) || grammatical.preferred || (exact.length === 1 && !reflexiveEntries.has(exact[0]) ? candidates.find(c => same(c,mainCandidate(exact[0]))) : null));
      if (preferred?.construction?.confidence === "tentative") preferred = null;
      if (preferred) candidates = [preferred,...candidates.filter(c => c !== preferred)];
      const derivedOnly = candidates.length === 1 && derived.some(e => e.id === candidates[0].dictionaryId) && !dictionaryForms.has(candidates[0].dictionaryId);
      const selected = people ? preferred : nominalizedNoun || (grammatical.blocked || derivedOnly && !preferred ? null : candidates.length === 1 ? candidates[0].reflexiveUnconfirmed || candidates[0].construction?.confidence === "tentative" ? null : candidates[0] : preferred);
      const resolution = { preferred, evidence:people ? people.length === 1 ? "nominalized-person-agreement" : "ambiguous-nominalized-person" : nominalizedNoun ? nominalizedNoun.usage.kind === "adjective" ? "nominalized-adjective-after-indefinite" : "nominalized-infinitive-after-das" : reflexiveVerb ? "reflexive-subject-agreement" : ranked.evidence || (separated.some(c => c.construction.confidence !== "tentative") ? "separated-verb-pair" : separated.length ? "tentative-separated-verb-pair" : grammatical.evidence), form:word, formNotes, inflections, status:selected && candidates.length === 1 ? "resolved" : candidates.length ? "ambiguous" : "unresolved", candidates, selected, unresolvedMeanings, error };
      // Enrich only after all morphology, ranking and selection are complete.
      if (window.BibliothekRussianTranslations)
        await window.BibliothekRussianTranslations.enrich(resolution,window.DeutschTranslation?.getLang?.() || "en");
      return resolution;
    }
    return Object.freeze({ resolve, prepareSeparable, entry:id => byId.get(String(id)) || null,
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
  window.BibliothekLemmaResolver = Object.freeze({ create, savedCandidate });
})();
