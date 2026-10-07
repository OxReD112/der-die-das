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
    // Reviewed L04 pilot. These forms are conditional lexical candidates,
    // never unconditional matches just because their participle is one token.
    const reflexivePilot = {"verb-060":"sich freuen","verb-061":"sich interessieren",
      "verb-068":"sich entscheiden","verb-091":"sich erinnern","verb-155":"sich kümmern","verb-235":"sich beeilen"};
    const reflexiveEntries = new Set(entries.filter(e => e.type === "Verb" && reflexivePilot[e.id] === e.word));
    const reflexiveForms = new Map();
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
        if (reflexiveEntries.has(entry)) {
          for (const [tense,group] of Object.entries(formsOf(entry))) for (const [person,form] of Object.entries(group || {})) {
            const parts = norm(form).split(/\s+/u);
            if (parts.length === 2 && /^[\p{L}\p{M}]+$/u.test(parts[0]) && ["mich","dich","sich","uns","euch"].includes(parts[1]))
              addReflexive(parts[0],{entry,tense,person,pronoun:parts[1]});
          }
          addReflexive(entry.word.slice(5),{entry,tense:"Infinitiv"});
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
    } : ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, posLabel:item.parts_of_speech?.join(" / ") || item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item });
    function reflexiveCandidates(word,context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return [];
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const clicked = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (clicked < 0) return [];
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      let start = clicked, end = clicked;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const subjects = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
      const results = [];
      for (let v = start; v <= end; v++) for (const row of reflexiveForms.get(norm(tokens[v][0])) || []) {
        if (!["Präsens","Präteritum","Konjunktiv II"].includes(row.tense)) continue;
        for (const subject of [v-1,v+1]) {
          if (subject < start || subject > end || !(subjects[norm(tokens[subject][0])] || []).includes(row.person)) continue;
          const pronoun = subject === v-1 ? v+1 : v+2;
          if (pronoun > end || norm(tokens[pronoun][0]) !== row.pronoun) continue;
          // A preceding preposition or another personal subject means this
          // is not the simple subject/finite/reflexive layout of the pilot.
          if (subject === v-1 && subject > start &&
            (["mit","für","von","an","auf","bei","zu","ohne","gegen","um","über","unter","neben","zwischen","nach","aus"].includes(norm(tokens[subject-1][0])) || subjects[norm(tokens[subject-1][0])])) continue;
          let competing = false;
          for (let i = start; i <= end; i++) if (![v,subject,pronoun].includes(i) &&
            ((forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Verb") || reflexiveForms.has(norm(tokens[i][0])))) competing = true;
          if (competing) continue;
          const indices = [v,pronoun];
          const complement = (row.entry.complements || []).find(c => norm(c.pattern.split(/\s+/u)[0]) === norm(tokens[pronoun+1]?.[0]));
          // Only attach a directly following, documented preposition with a
          // following complement token. The preposition alone proves no case.
          if (complement && pronoun+2 <= end) indices.push(pronoun+1);
          if (!indices.slice(0,2).includes(clicked)) continue;
          const spans = indices.sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}));
          if (!results.some(c => c.dictionaryId === row.entry.id && JSON.stringify(c.construction.spans) === JSON.stringify(spans)))
            results.push({...mainCandidate(row.entry),construction:{id:"reflexive-verb",lemma:row.entry.word,label:"Reflexiv",
              note:{ru:"Возвратная конструкция",en:"Reflexive construction"},spans,
              ...(complement && indices.length === 3 ? {complement:{...complement}} : {})}});
        }
      }
      return results;
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
      const reflexive = reflexiveCandidates(word,context);
      let candidates = [...separated,...exact.map(mainCandidate),...derived.map(mainCandidate)], error = preparationError, unresolvedMeanings = [], formNotes = [], inflections = [];
      // Interactive lookup checks missing parts of speech; word-only callers keep
      // their existing main-first behaviour and avoid unnecessary downloads.
      if (!ownOnlyVerb && (!exact.length || context || reflexiveForms.has(norm(word)))) {
        try {
          for (const group of await fallback.lookup(word)) {
            if (ownOnlyVerbs.has(norm(group.word)) || group.kind === "form-note" && group.inflections?.some(row => ownOnlyVerbs.has(norm(row.lemma)))) continue;
            if (group.kind === "form-note") { formNotes.push(group); inflections.push(...(group.inflections || [])); continue; }
            const partOfSpeech = canonicalPos(group.pos);
            if (group.unresolved) { unresolvedMeanings.push(...group.meanings); continue; }
            const main = (lemmas.get(norm(group.word)) || []).filter(item => partOfSpeech && item.type === partOfSpeech);
            for (const item of main) dictionaryForms.add(item.id);
            candidates.push(...main.map(mainCandidate));
            if (group.meanings.length) candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",posLabel:partOfSpeech,
              translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings});
          }
        } catch (e) { error = e; }
      }
      // Replace only the reviewed pilot entries before POS coverage can hide
      // their non-reflexive counterparts. Unconfirmed senses remain available
      // for manual selection but cannot rank or resolve themselves.
      // L01 attributive participles have independent noun-phrase evidence;
      // they must not require an explicit reflexive pronoun in the text.
      const attributed = derived.some(e=>reflexiveEntries.has(e))
        ? grammarRank(word,context,candidates,inflections).candidates.filter(c=>reflexiveEntries.has(c.item) && c.usage?.role === "attributive") : [];
      candidates = candidates.filter(c => !reflexiveEntries.has(c.item) || norm(word) === norm(c.lemma));
      const conditional = [...new Set((reflexiveForms.get(norm(word)) || []).map(row=>row.entry))]
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
        candidates = candidates.filter(c => c.source === "main" || c === uncoveredCompleteVerb || separated.some(pair => pair.source === "fallback" && window.BibliothekVocabulary.identity(pair) === window.BibliothekVocabulary.identity(c)) ||
          knownPartsOfSpeech.has(canonicalPos(c.pos)) && !coveredParts.has(canonicalPos(c.pos)));
        unresolvedMeanings = [];
      }
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
          if (c.reflexiveUnconfirmed) return c;
          if (group.marker && c.lemma === "zu" && canonicalPos(c.pos) === "particle")
            return {...c,construction,translation:{en:"infinitive marker",ru:"частица инфинитива"}};
          return roles.some(e => norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos))
            ? {...c,construction,...(c.lemma === (group.meaningLemma || "werden") && group.meaning ? {translation:group.meaning} : {})} : c;
        });
      }
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
      const reflexiveVerb = reflexive.length === 1 && !["mich","dich","sich","uns","euch"].includes(norm(word))
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
      match:word => (forms.get(norm(word)) || []).map(entry=>({...mainCandidate(entry),
        ...(reflexiveEntries.has(entry) && norm(word) !== norm(entry.word) ? {reflexiveUnconfirmed:true} : {})})) });
  }
  window.BibliothekLemmaResolver = Object.freeze({ create, savedCandidate });
})();
