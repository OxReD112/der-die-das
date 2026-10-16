/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  let diagnosticPending = null;
  function observePending(pending) {
    if (typeof window.BibliothekAnalysisDiagnostics !== 'function') return;
    diagnosticPending ||= new WeakSet();
    diagnosticPending.add(pending);
    pending.then(() => diagnosticPending.delete(pending), () => diagnosticPending.delete(pending));
  }
  const cacheState = (cache, key) => !cache.has(key) ? 'miss'
    : diagnosticPending?.has(cache.get(key)) ? 'pending' : 'hit';
  let silent = false;
  function observe(type, detail = {}) {
    const sink = window.BibliothekAnalysisDiagnostics;
    if (silent || typeof sink !== 'function') return;
    try { sink({component:'fallback',type,
      time:typeof performance !== 'undefined' ? performance.now() : Date.now(),...detail}); } catch (_) {}
  }

  const base = new URL("../../open%20data/dictionary-de-json/", document.currentScript.src);
  const cache = new Map();
  const verbFormCache = new Map();
  const verbFormsBase = new URL("data/fallback-verb-forms/", document.currentScript.src);
  const separableUrl = new URL("data/separable-index.json?v=20261009-reviewed-forms-2", document.currentScript.src);
  let separablePromise = null, verbMembershipPromise = null;
  function separableEntries() {
    if (!separablePromise) separablePromise = fetch(separableUrl).then(response => {
      if (!response.ok) throw new Error("Separable index unavailable");
      return response.json();
    }).then(data => {
      if (data.format_version !== 1 || !Array.isArray(data.entries)) throw new Error("Invalid separable index");
      return data.entries;
    }).catch(error => { separablePromise = null; throw error; });
    return separablePromise;
  }
  // A2 (15.10.2026): agreed verb + preposition pairs (exercise list, reference 4.9).
  const verbPrepositionUrl = new URL("data/verb-prepositions.json?v=20261015-a2-1", document.currentScript.src);
  let verbPrepositionPromise = null;
  function verbPrepositions() {
    if (!verbPrepositionPromise) verbPrepositionPromise = fetch(verbPrepositionUrl).then(response => {
      if (!response.ok) throw new Error("Verb preposition list unavailable");
      return response.json();
    }).then(data => {
      if (data.format_version !== 1 || !Array.isArray(data.entries) || data.entries.some(r => !Array.isArray(r) || r.length !== 3 || r.some(v => typeof v !== "string")))
        throw new Error("Invalid verb preposition list");
      return data.entries;
    }).catch(error => { verbPrepositionPromise = null; throw error; });
    return verbPrepositionPromise;
  }
  const superlativeUrl=new URL('data/superlative-index.json?v=20261008-l07-1',document.currentScript.src);
  let superlativePromise=null;
  async function superlativeEntries(word) {
    if(!superlativePromise)superlativePromise=fetch(superlativeUrl).then(r=>{
      if(!r.ok)throw Error('Superlative index unavailable');return r.json();
    }).then(d=>{
      if(d.format_version!==1||!d.records||typeof d.records!=='object')throw Error('Invalid superlative index');
      for(const rows of Object.values(d.records))if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!['adj','adv'].includes(r[1])||!Array.isArray(r[2])||r[2].some(m=>typeof m!=='string')))throw Error('Invalid superlative evidence');
      return d.records;
    }).catch(e=>{superlativePromise=null;throw e;});
    return (await superlativePromise)[String(word).normalize('NFC').toLocaleLowerCase('de-DE')]||[];
  }
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function mayBeVerb(word) {
    try {
      if(!verbMembershipPromise)verbMembershipPromise=fetch(new URL('manifest.json',verbFormsBase)).then(r=>{if(!r.ok)throw Error('Verb membership unavailable');return r.json();}).then(d=>{const m=d.membership;if(m?.format!=='bloom-fnv1a-v1'||m.bits!==1048576||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid verb membership');return {...m,bitmap:Uint8Array.from(m.bitmap.match(/../g),s=>parseInt(s,16))};}).catch(e=>{verbMembershipPromise=null;throw e;});
      const m=await verbMembershipPromise,key=String(word).normalize('NFC').toLocaleLowerCase('de-DE');let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
      const step=(Math.imul(h^0x9e3779b9,2246822519)>>>0)|1;
      for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(m.bitmap[bit>>>3]&(1<<(bit&7))))return false;}
      return true;
    } catch (_) { return true; } // Missing filter preserves the full lookup path.
  }
  const auxiliaryFormsUrl=new URL('data/auxiliary-verb-forms.json?v=20261008-f4-1',document.currentScript.src);
  let auxiliaryFormsPromise=null;
  async function auxiliaryInflections(word) {
    if(!auxiliaryFormsPromise)auxiliaryFormsPromise=fetch(auxiliaryFormsUrl).then(r=>{
      if(!r.ok)throw Error('Auxiliary morphology unavailable');return r.json();
    }).then(d=>{if(d.format_version!==1||!d.records)throw Error('Invalid auxiliary morphology');return d.records;}).catch(e=>{auxiliaryFormsPromise=null;throw e;});
    const rows=(await auxiliaryFormsPromise)[String(word).normalize('NFC').toLocaleLowerCase('de-DE')]||[];
    return rows.map(([lemma,person,number,tense,mood])=>({lemma,person,number,tense,mood}));
  }
  function verbFormPart(index) {
    if (!verbFormCache.has(index)) {
      const pending = fetch(new URL(`${String(index).padStart(4,"0")}.json`,verbFormsBase)).then(response => {
        if (!response.ok) throw new Error("Fallback verb morphology unavailable");
        return response.json();
      }).then(data => {
        if(data.format_version !== 1 || data.partition !== index)throw new Error("Invalid fallback verb morphology partition");
        return data.records;
      }).catch(error=>{verbFormCache.delete(index);throw error;});
      observePending(pending);
      verbFormCache.set(index,pending);
    }
    return verbFormCache.get(index);
  }
  async function verbFormLinks(word) {
    const spelling = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), index = partition(spelling);
    observe('partition-cache', {cache:'verb-forms',key:index,word:spelling,state:cacheState(verbFormCache,index),size:verbFormCache.size});
    const rows = (await verbFormPart(index))[spelling] || [];
    return rows.map(([lemma,tags])=>[spelling,lemma,tags]);
  }
  async function derivedVerbGroups(word, issues = null) {
    let links;
    try { links = await verbFormLinks(word); } catch (error) { issues?.push({source:'verb-forms',message:String(error.message || error)}); return []; }
    const groups = [];
    for(const lemma of [...new Set(links.map(row=>row[1]))]) {
      const lexical = (await lexicalGroups(lemma)).filter(g=>g.pos === "verb" && g.meanings.length);
      groups.push(...lexical);
      const data = {inflections:links.filter(row=>row[1] === lemma),senses:[[0,word,"verb",`inflection of ${lemma}:`,0]]};
      groups.push({kind:"form-note",word,pos:"verb",meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:inflectionEvidence(word,data.inflections,groupsFor(word,data))});
    }
    return groups;
  }
  function dictionaryPart(index) {
    if (!cache.has(index)) {
      const promise = fetch(new URL(`parts/${String(index).padStart(4, "0")}.json`, base))
        .then(response => {
          if (!response.ok) throw new Error("Fallback dictionary unavailable");
          return response.json();
        }).then(data => {
          if (data.format_version !== 1 || data.partition !== index) throw new Error("Invalid dictionary partition");
          return data.records;
        }).catch(error => { cache.delete(index); throw error; });
      observePending(promise);
      cache.set(index, promise);
    }
    return cache.get(index);
  }
  async function record(word) {
    const index = partition(word);
    observe('partition-cache', {cache:'dictionary',key:index,word,state:cacheState(cache,index),size:cache.size});
    const records = await dictionaryPart(index);
    return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
  }
  function meanings(data) {
    const ordered = [...(data?.senses || [])].sort((a, b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0] - b[0]);
    return [...new Set(ordered.map(row => row[3]))];
  }
  function referenceLemma(value) {
    const match = /^(.*?) of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*):?$/iu.exec(value.trim());
    if (!match) return null;
    const prefix = match[1].toLowerCase();
    const grammar = new Set(["strong","weak","mixed","nominative","accusative","genitive","dative","masculine","feminine","neuter","singular","plural","all","case","gender","comparative","superlative","degree","first","second","third","person","present","past","preterite","participle","imperative","indicative","subjunctive","i","ii","dependent","independent","subordinate","clause","infinitive","positive","definite","indefinite"]);
    const tokens = prefix.split(/[\s/-]+/u).filter(Boolean);
    if (prefix !== "inflection" && !(tokens.length >= 2 && tokens.every(token => grammar.has(token)) &&
      /\b(?:singular|plural|participle|imperative|infinitive|degree)\b/u.test(prefix))) return null;
    return match[2].normalize("NFC").toLocaleLowerCase("de-DE");
  }
  function groupsFor(word, data) {
    observe('groups-build', {word});
    const byPos = new Map();
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0]-b[0])) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(row[3]);
    }
    // Auxiliary rows (haben: ~9 300, sein: ~1 500 "auxiliary of <verb>" links) never name a
    // lemma inside a sense, and comparing every sense with each of them cost seconds in browsers.
    const mappedLemmas = (data?.inflections || []).filter(row => !String(row[2] || "").split(",").includes("auxiliary")).map(row => row[1]);
    return [...byPos].map(([pos, values]) => {
      const reference = value => !!referenceLemma(value) || /^inflection of\b/iu.test(value) || mappedLemmas.some(lemma =>
        value.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`) &&
        /\b(?:present|past|preterite|participle|imperative|singular|plural|dative|accusative|genitive|nominative|infinitive|comparative|superlative)\b/iu.test(value));
      const hasReference = values.some(reference);
      const grammarTokens = new Set(["first","second","third","person","singular","plural","present","past","preterite","perfect","imperfect","imperative","indicative","subjunctive","participle","nominative","accusative","dative","genitive","infinitive","positive","comparative","superlative","masculine","feminine","neuter","definite","indefinite","weak","strong","mixed","all","case","gender","dependent","independent","subordinate","clause","zu"]);
      const continuation = value => {
        const tokens = value.toLowerCase().replace(/\bsubjunctive\s+(?:ii|i)\b/gu, "subjunctive").split(/[\s,;:/().-]+/u).filter(Boolean);
        const declensionNote = /^(?:weak|strong|mixed)(?:[\s/-]|$)/iu.test(value.trim()) && tokens.length > 1;
        return (hasReference || declensionNote) && tokens.length > 0 && tokens.every(token => token === "degree" || grammarTokens.has(token));
      };
      const notes = [...new Set(values.filter(value => reference(value) || continuation(value)))];
      return {word,pos,meanings:[...new Set(values.filter(value => !notes.includes(value)))],formNotes:notes};
    });
  }
  // Evidence belongs to the clicked spelling, not to permanent dictionary cards.
  function noteReferencesLemma(note,lemma) {
    const text=note.toLocaleLowerCase('de-DE'),marker=` of ${lemma.toLocaleLowerCase('de-DE')}`,index=text.indexOf(marker);
    return index>=0&&/^(?:$|[\s:(“"])/u.test(text.slice(index+marker.length));
  }
  function inflectionEvidence(form, mappings, groups) {
    const result = [];
    for (const [spelling, lemma, rawTags] of mappings) {
      if (spelling.normalize("NFC").toLocaleLowerCase("de-DE") !== form.toLocaleLowerCase("de-DE")) continue;
      const positions = groups.filter(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,lemma):
          note.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`)));
      for (const group of positions) {
        const analyses = [String(rawTags || "").split(",").filter(Boolean)];
        // Some exports store only one analysis in the mapping, with the others
        // in continuation notes. Only attach those when the lemma is unambiguous.
        if (group.pos==='verb'?new Set(group.formNotes.map(referenceLemma).filter(Boolean)).size === 1:new Set(mappings.map(row=>row[1])).size === 1) {
          for (const note of group.formNotes) {
            // A second explicit analysis (e.g. past participle) may coexist
            // with a finite structured mapping of the same spelling.
            if (/\bof\b/iu.test(note) && referenceLemma(note) !== lemma.toLocaleLowerCase("de-DE")) continue;
            const tags = note.toLowerCase().match(/(?:first|second|third)(?:\/(?:first|second|third))*-person|singular|plural|present|past|preterite|imperative|indicative|infinitive|participle|subjunctive(?:\s+(?:ii|i))?/gu) || [];
            const combined = tags.find(tag => tag.includes("/"));
            const alternatives = combined ? combined.replace(/-person$/u,"").split("/").map(person=>person+"-person") : [null];
            for (const person of alternatives) analyses.push(tags.map(tag => (tag === combined ? person : tag).replace(/\s+/gu,"-")));
          }
        }
        for (const tags of analyses) {
          const person = tags.find(tag => /^(?:first|second|third)-person$/u.test(tag)) || null;
          const number = tags.find(tag => ["singular","plural"].includes(tag)) || null;
          const tense = tags.find(tag => ["present","past","preterite"].includes(tag)) || null;
          const mood = tags.find(tag => /^(?:indicative|imperative|subjunctive(?:-i|-ii)?)$/u.test(tag)) || null;
          const evidence = {form,lemma,pos:group.pos,tags,person,number,tense,mood,source:"Wiktionary"};
          if (tags.length && !result.some(row => JSON.stringify(row) === JSON.stringify(evidence))) result.push(evidence);
        }
      }
    }
    return result;
  }
  // B4 (15.10.2026): the export stores most declined adjective forms (warzige,
  // bilaterale, schlenkerigere, arbeitsfähigster) only as a structured row
  // without any sense. A row with declension tags (strong/weak/mixed) and only
  // case, gender, number, degree tags links the spelling to an adjective; the
  // target must still be an explicit adjective headword.
  const adjectiveTags = new Set(['nominative','accusative','genitive','dative','singular','plural',
    'definite','indefinite','strong','weak','mixed','masculine','feminine','neuter','without-article','comparative','superlative']);
  function adjectiveDeclension(word, data, row) {
    const tags = String(row[2] || '').split(',').filter(Boolean);
    return !(data?.senses || []).length && String(row[0]).normalize('NFC').toLocaleLowerCase('de-DE') === word.toLocaleLowerCase('de-DE') &&
      tags.some(tag => ['strong','weak','mixed'].includes(tag)) && tags.every(tag => adjectiveTags.has(tag));
  }
  // Positions a sense-less record may describe through its structured rows.
  function structuredPositions(word, data, mappings, positions) {
    if ((data?.senses || []).length || !mappings.length) return positions;
    if (mappings.some(row => !adjectiveDeclension(word,data,row) ||
      String(row[2] || '').split(',').every(tag => tag !== 'without-article' && tag !== 'comparative' && tag !== 'superlative'))) positions.add('noun');
    if (mappings.some(row => adjectiveDeclension(word,data,row))) positions.add('adj');
    return positions;
  }
  function adjectiveNotes(word, data, mappings, groups) {
    const notes = [];
    for (const lemma of new Set(mappings.filter(row => adjectiveDeclension(word,data,row)).map(row => row[1]))) {
      if (!groups.some(group => group.pos === 'adj' && group.word === lemma && group.meanings.length)) continue;
      const rows = mappings.filter(row => row[1] === lemma && adjectiveDeclension(word,data,row));
      notes.push({kind:'form-note',word,pos:'adj',meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:rows.map(row => {
          const tags = String(row[2] || '').split(',').filter(Boolean);
          return {form:word,lemma,pos:'adj',tags,person:null,number:tags.find(tag => ['singular','plural'].includes(tag)) || null,
            tense:null,mood:null,source:'Wiktionary'};
        })});
    }
    return notes;
  }
  function formMappings(word, data, direct) {
    // Some lossless export rows contain only a structured noun inflection,
    // with no textual sense to repeat that link. Case/number tags establish
    // a nominal relation; target lexical groups must still explicitly be nouns.
    const nounOnly = !(data?.senses || []).length;
    const nounTags = new Set(['nominative','accusative','genitive','dative','singular','plural',
      'definite','indefinite','strong','weak','mixed','masculine','feminine','neuter']);
    const nounMapping = row => {
      const tags = String(row[2] || '').split(',').filter(Boolean);
      return nounOnly && String(row[0]).normalize('NFC').toLocaleLowerCase('de-DE') === word.toLocaleLowerCase('de-DE') &&
        tags.some(tag => ['nominative','accusative','genitive','dative','singular','plural'].includes(tag)) &&
        tags.every(tag => nounTags.has(tag));
    };
    const mappings = (data?.inflections || []).filter(row =>
      !String(row[2] || "").split(",").some(tag => tag === "auxiliary" || tag.startsWith("error-")) &&
      (nounMapping(row) || adjectiveDeclension(word,data,row) || direct.some(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,String(row[1])):
          note.toLocaleLowerCase("de-DE").includes(` of ${String(row[1]).toLocaleLowerCase("de-DE")}`)))));
    // Only an explicit, whole grammatical reference can supply a missing link.
    // No stemming, prose references, or replacement of structured mappings.
    if (!mappings.length && !(data?.inflections || []).length) {
      for (const group of direct) for (const note of group.formNotes) {
        const lemma = referenceLemma(note);
        if (lemma) mappings.push([word,lemma,""]);
      }
    }
    return mappings;
  }
  async function lexicalGroups(word, visited = new Set()) {
    if (visited.has(word) || visited.size >= 4) return [];
    const next = new Set([...visited,word]), data = await record(word);
    const direct = groupsFor(word,data), mappings = formMappings(word,data,direct);
    const positions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
    structuredPositions(word,data,mappings,positions);
    const mapped = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(lemma => lexicalGroups(lemma,next)))).flat();
    return [...direct.filter(group => group.meanings.length),...mapped.filter(group => !positions.size || positions.has(group.pos))];
  }
  // B3 (15.10.2026): regular weak forms of an external verb that the export lists
  // only as an adjective or not at all (betrachtete, erwähnte, verordnete). The
  // lemma must be an explicit verb headword; only spellings without any verb
  // reading are derived. Present 3rd sg / 2nd pl in -t is the same spelling as
  // the participle of verbs without ge- (erwähnt), so both are offered.
  const inseparablePrefixes = /^(?:be|emp|ent|er|ge|miss|ver|zer|hinter|über|unter|wider)/u;
  const separablePrefixes = ["zurück","vorbei","herum","heraus","herein","hinaus","hinein","weiter","zusammen","ab","an","auf","aus","bei","dar","ein","fest","fort","her","hin","los","mit","nach","vor","weg","zu"];
  const weakEndings = [["test",[["second-person","singular","past"]]],["ten",[["first-person","plural","past"],["third-person","plural","past"]]],
    ["tet",[["second-person","plural","past"]]],["te",[["first-person","singular","past"],["third-person","singular","past"]]]];
  function weakHypotheses(word) {
    const w = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), result = [];
    const lemmas = stem => [stem+"en",...(/(?:el|er)$/u.test(stem) ? [stem+"n"] : [])];
    const add = (stem,rows,prefix = "") => { if (stem.length >= 2) for (const lemma of lemmas(stem)) result.push({lemma:prefix+lemma,rows}); };
    for (const [ending,rows] of weakEndings) if (w.endsWith(ending)) {
      const stem = w.slice(0,-ending.length);
      add(stem,rows);
      if (stem.endsWith("e") && /[dt]e$|[^aeiouäöülr][mn]e$/u.test(stem)) add(stem.slice(0,-1),rows);
    }
    // Participles only with a visible marker (ge-, an inseparable prefix, -iert);
    // a bare -t spelling (recht, Furcht) is not derived.
    if (/t$/u.test(w)) {
      const participle = [["past","participle"]];
      const stems = [w.slice(0,-1),...(/[dt]et$/u.test(w) ? [w.slice(0,-2)] : [])];
      for (const stem of stems) {
        if (stem.startsWith("ge") && stem.length > 4) add(stem.slice(2),participle);
        else if (inseparablePrefixes.test(stem) || /ier$/u.test(stem)) add(stem,participle);
        for (const prefix of separablePrefixes) if (stem.startsWith(prefix+"ge")) add(stem.slice(prefix.length+2),participle,prefix);
      }
    }
    return result;
  }
  async function weakVerbGroups(word) {
    const form = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), groups = [], seen = new Set();
    for (const {lemma,rows} of weakHypotheses(form)) {
      const key = lemma+"|"+JSON.stringify(rows);
      if (seen.has(key)) continue; seen.add(key);
      const lexical = (await lexicalGroups(lemma)).filter(g => g.pos === "verb" && g.word === lemma && g.meanings.length);
      if (!lexical.length) continue;
      if (!groups.some(g => g.word === lemma && !g.kind)) groups.push(...lexical.map(g => ({...g,derived:"regular-weak-form"})));
      groups.push({kind:"form-note",derived:"regular-weak-form",word,pos:"verb",meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:rows.map(tags => ({form,lemma,pos:"verb",tags:[...tags,...(tags.includes("participle") ? [] : ["indicative"])],
          person:tags.find(t => /-person$/u.test(t)) || null,number:tags.find(t => ["singular","plural"].includes(t)) || null,
          tense:tags.find(t => ["present","past"].includes(t) && !tags.includes("participle")) || null,
          mood:tags.includes("participle") ? null : "indicative",source:"regular-weak-form"}))});
    }
    return groups;
  }
  async function withWeakVerb(word, groups) {
    if (groups.some(g => g.pos === "verb")) return groups;
    try { return [...groups,...await weakVerbGroups(word)]; } catch (_) { return groups; }
  }
  // B4 (15.10.2026): a lowercase spelling the export does not know at all
  // (zypriotischen, warzigeres) may be a regular declined form of an adjective
  // headword: -e/-en/-em/-er/-es, also after a comparative -er or a superlative
  // -st/-est. Only an explicit adjective headword confirms a hypothesis; the
  // stripped word is never offered as a noun or a verb (Rose -> Ros, oben -> ob).
  const adjectiveEndings = ["en","em","er","es","e"];
  function adjectiveHypotheses(word) {
    const w = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), result = [];
    const add = (base,ending,degree) => {
      if (base.length < 3) return;
      result.push({base,ending,degree});
      // leise -> leisen: the headword keeps its final -e.
      if (!base.endsWith("e")) result.push({base:base+"e",ending,degree});
    };
    for (const ending of adjectiveEndings) if (w.endsWith(ending) && w.length > ending.length+2) {
      const stem = w.slice(0,-ending.length);
      add(stem,ending,null);
      if (stem.endsWith("er")) add(stem.slice(0,-2),ending,"comparative");
      if (/[^s]est$/u.test(stem)) add(stem.slice(0,-3),ending,"superlative");
      if (stem.endsWith("st")) add(stem.slice(0,-2),ending,"superlative");
    }
    return result;
  }
  async function adjectiveEndingGroups(word) {
    const form = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), groups = [], seen = new Set();
    for (const {base,ending,degree} of adjectiveHypotheses(form)) {
      const key = base+"|"+degree;
      if (seen.has(key)) continue; seen.add(key);
      const lexical = (await lexicalGroups(base)).filter(g => g.pos === "adj" && g.word === base && g.meanings.length);
      if (!lexical.length) continue;
      if (!groups.some(g => g.word === base && !g.kind)) groups.push(...lexical.map(g => ({...g,derived:"regular-adjective-ending"})));
      groups.push({kind:"form-note",derived:"regular-adjective-ending",word,pos:"adj",meanings:[`inflection of ${base}:`],lemmas:[base],
        inflections:[{form,lemma:base,pos:"adj",tags:degree ? [degree] : [],ending,person:null,number:null,tense:null,mood:null,source:"regular-adjective-ending"}]});
    }
    return groups;
  }
  async function lookup(word, issues = null) {
    const groups = await lookupGroups(word,issues);
    // Lowercase spellings only: a capital inside a sentence is a noun (Fronten, Rechte).
    if (!/^\p{Ll}/u.test(String(word).normalize("NFC").trim())) return groups;
    const withVerb = await withWeakVerb(word,groups);
    if (withVerb.length) return withVerb;
    try { return await adjectiveEndingGroups(word); } catch (_) { return withVerb; }
  }
  async function lookupGroups(word, issues = null) {
    observe('lookup', {word});
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE")])];
    for (const candidate of candidates) {
      const data = await record(candidate);
      if (!data) continue;
      const direct = groupsFor(candidate,data);
      // The export also contains auxiliary relations and malformed form mappings.
      // Only grammatical references support resolving this spelling to another lemma.
      const mappings = formMappings(candidate,data,direct);
      const evidence = inflectionEvidence(candidate,mappings,direct);
      const describedPositions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
      structuredPositions(candidate,data,mappings,describedPositions);
      const groups = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(async lemma => {
        const mapped = await lexicalGroups(lemma,new Set([candidate]));
        // A verb inflection must not inherit unrelated noun senses of its lemma.
        return mapped.filter(group => !describedPositions.size || describedPositions.has(group.pos));
      }))).flat();
      const usable = [...groups,...direct].filter(group => group.meanings.length);
      const notes = [...direct.filter(group => group.formNotes.length).map(group => ({
        kind:"form-note",word:candidate,pos:group.pos,meanings:group.formNotes,
        lemmas:[...new Set(mappings.map(row => row[1]))],
        inflections:evidence.filter(row => row.pos === group.pos)
      })),...adjectiveNotes(candidate,data,mappings,groups)];
      const merged = new Map();
      for (const group of usable) {
        const key = JSON.stringify([group.word,group.pos]);
        if (!merged.has(key)) merged.set(key,{word:group.word,pos:group.pos,meanings:[]});
        const target = merged.get(key);
        target.meanings = [...new Set([...target.meanings,...group.meanings])];
      }
      if (merged.size || notes.length) return [...merged.values(),...notes];
      if (meanings(data).length) return [{word:candidate,pos:"",meanings:meanings(data),unresolved:true}];
    }
    return derivedVerbGroups(String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE"),issues);
  }
  // Verify a hypothesis against lexical and inflection records, without
  // changing imported records or requiring membership in the derived index.
  async function separableFormEvidence(form, prefix, lemma) {
    const simplePrefixes = new Set(['ab','an','auf','aus','ein','mit','nach','vor','weg','zu','zurück','her','hin','fort','los','fest']);
    if (!lemma.startsWith(prefix) || !/^[\p{L}\p{M}]+$/u.test(form+prefix+lemma)) return null;
    const lexical=(await lexicalGroups(lemma)).filter(g=>g.pos==='verb'&&g.word===lemma&&g.meanings.length);
    if (!lexical.length) return null;
    const joined=await record(prefix+form);
    const links=(joined?.inflections||[]).filter(([f,l,tags])=>f===prefix+form&&l===lemma&&
      /(?:^|,)(?:present|past|preterite|imperative|indicative|subjunctive|subjunctive-ii)(?:,|$)/u.test(tags)&&
      !/(?:^|,)(?:participle|infinitive-zu)(?:,|$)/u.test(tags));
    if (!links.length) return null;
    let separation='unambiguous-prefix-and-explicit-inflection';
    if (!simplePrefixes.has(prefix)) {
      const zu=await record(prefix+'zu'+lemma.slice(prefix.length));
      if (!(zu?.inflections||[]).some(([f,l,tags])=>l===lemma&&String(tags).split(',').includes('infinitive-zu'))) return null;
      separation='explicit-zu-infinitive-and-inflection';
    }
    return {lemma,prefix,meanings:[...new Set(lexical.flatMap(g=>g.meanings))],evidence:separation};
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  function spellingReference(value) {
    const text = String(value || '').trim();
    const direct = /^(?:(?:Switzerland and Liechtenstein )?standard|alternative|obsolete|archaic|dated) spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*)\.?$/iu.exec(text);
    const former = /^Formerly standard spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*) which was deprecated in the spelling reform \(Rechtschreibreform\) of \d{4}\.?$/iu.exec(text);
    return (direct || former)?.[1] || null;
  }
  // Display enrichment only: keep the original lemma, POS, identity and rank.
  async function spellingTranslation(word, pos, values) {
    const references = [], unresolved = [];
    async function expand(meanings, visited) {
      const result = [];
      for (const value of meanings) {
        const target = spellingReference(value);
        if (!target) { result.push(value); continue; }
        references.push({note:value,target});
        const key = target.normalize('NFC').toLocaleLowerCase('de-DE');
        if (visited.has(key) || visited.size >= 4) { unresolved.push(target); continue; }
        const next = new Set([...visited,key]);
        let groups = [];
        for (const spelling of [...new Set([target,key])]) {
          groups = (await lexicalGroups(spelling)).filter(group => group.pos === pos);
          if (groups.length) break;
        }
        const translated = await expand(groups.flatMap(group => group.meanings),next);
        if (!translated.length) unresolved.push(target);
        result.push(...translated);
      }
      return [...new Set(result)];
    }
    if (!values.some(spellingReference)) return null;
    return {meanings:await expand(values,new Set([String(word).normalize('NFC').toLocaleLowerCase('de-DE')])),references,unresolved};
  }
  // B16 (15.10.2026): verbs whose Perfekt the export forms with haben / sein
  // (structured "auxiliary" rows of the haben and sein records).
  const auxiliarySets = new Map();
  async function perfectAuxiliaries(lemma) {
    const key = String(lemma).normalize("NFC").toLocaleLowerCase("de-DE"), result = [];
    for (const auxiliary of ["haben","sein"]) {
      if (!auxiliarySets.has(auxiliary)) auxiliarySets.set(auxiliary,record(auxiliary).then(data => new Set((data?.inflections || [])
        .filter(row => String(row[2] || "").split(",").includes("auxiliary") && row[0] === auxiliary)
        .map(row => String(row[1]).normalize("NFC").toLocaleLowerCase("de-DE")))).catch(error => {auxiliarySets.delete(auxiliary);throw error;}));
      if ((await auxiliarySets.get(auxiliary)).has(key)) result.push(auxiliary);
    }
    return result;
  }
  // D4 (16.10.2026): warm-up for the words of a sentence. Lookups walk the
  // words and their hypotheses one by one, so on a phone every part file was a
  // separate wait. The warm-up starts the same part requests at once (the same
  // promises record() and verbFormLinks() would create later) and follows the
  // links of the records it finds: the lemma of a form, the lemmas of a verb
  // form, weak-verb and adjective-ending hypotheses. It returns nothing and no
  // lookup reads anything from it, so results are those of the lookups alone;
  // a failed request is dropped from the cache and requested again as before.
  const lowerSpelling = word => String(word).normalize("NFC").toLocaleLowerCase("de-DE");
  async function peek(word) {
    try {
      const records = await dictionaryPart(partition(word));
      return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
    } catch (_) { return null; }
  }
  function linkedLemmas(word, data) {
    silent = true;
    try { return [...new Set(formMappings(word,data,groupsFor(word,data)).map(row => row[1]))]; }
    catch (_) { return []; } finally { silent = false; }
  }
  async function warmLexical(word, visited) {
    if (visited.has(word) || visited.size >= 4) return;
    const data = await peek(word);
    if (!data) return;
    const next = new Set([...visited,word]);
    await Promise.all(linkedLemmas(word,data).map(lemma => warmLexical(lemma,next)));
  }
  const warming = new Map();
  function warmWord(word) {
    const spelling = String(word).normalize("NFC").trim();
    if (!spelling) return Promise.resolve();
    if (warming.has(spelling)) return warming.get(spelling);
    if (warming.size >= 2048) warming.delete(warming.keys().next().value);
    const pending = (async () => {
      const lower = lowerSpelling(spelling), candidates = [...new Set([spelling,lower])];
      const records = await Promise.all(candidates.map(peek));
      await Promise.all(candidates.map((candidate,i) => records[i] &&
        Promise.all(linkedLemmas(candidate,records[i]).map(lemma => warmLexical(lemma,new Set([candidate]))))));
      let verbLinked = false;
      if (!records.some(Boolean)) {
        try {
          const lemmas = [...new Set(((await verbFormPart(partition(lower)))[lower] || []).map(row => row[0]))];
          verbLinked = lemmas.length > 0;
          await Promise.all(lemmas.map(lemma => warmLexical(lemma,new Set())));
        } catch (_) {}
      }
      if (!/^\p{Ll}/u.test(spelling)) return;
      const verb = verbLinked || records.some(data => (data?.senses || []).some(row => row[2] === "verb"));
      const hypotheses = [...(verb ? [] : weakHypotheses(spelling).map(h => h.lemma)),
        ...(records.some(Boolean) || verbLinked ? [] : adjectiveHypotheses(spelling).map(h => h.base))];
      await Promise.all([...new Set(hypotheses)].map(lemma => warmLexical(lemma,new Set())));
    })().catch(() => {});
    warming.set(spelling,pending);
    return pending;
  }
  function warm(words) { return Promise.all([...new Set(words)].map(warmWord)).then(() => {}); }
  async function lookupFacts(word) { const issues = []; return {groups:await lookup(word,issues),issues}; }
  window.DeutschFallbackDictionary = {lookupFacts,warm,perfectAuxiliaries,verbPrepositions,separableFormEvidence,auxiliaryInflections,lookup, lookupEntry, separableEntries, mayBeVerb, spellingTranslation, superlativeEntries};
})();
