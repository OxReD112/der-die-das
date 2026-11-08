/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  // 07.11.2026: versioned data files go through the reader's data cache (resolver/data-cache.js); without it — plain fetch
  const dataFetch = (input, options) => (typeof window !== "undefined" && window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
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
  // D19 (16.10.2026): part caches are bounded. A parsed part takes ~0.19 MB of
  // memory (a phone tab grew to ~800 MB in half an hour of reading); only the
  // most recently used parts are kept. An evicted part is requested again when
  // needed (normally answered by the browser's HTTP cache); the data is the
  // same file, so results do not change. 160 -> 60 (16.10.2026): in Safari on
  // the iPhone JS memory still levelled off at ~190-230 MB with 160 parts.
  const partLimit = 60;
  function keepPart(map, key, value) {
    map.delete(key); map.set(key, value);
    while (map.size > partLimit) map.delete(map.keys().next().value);
    return value;
  }
  // D22 (25.10.2026): the dictionary has 8 192 small parts (~15 KB JSON each, was 1 024 × ~118 KB), so its cache is
  // bounded by the size of the kept JSON text (UTF-16 code units, about its bytes), not by the number of parts: 2 MB
  // (was 60 × ~118 KB ≈ 7 MB; parsed JSON takes about four times its text in memory). The junk template records of
  // 1–3 MB that flushed a 2 MB cache (de-ndecl, no-table-tags, strong …) were removed from the data the same day
  // (open data/tools/remove_template_rows.py); the largest part is now haben's, ~350 KB. Reading simulation: 2 MB loads
  // 3 % more parts than an unbounded cache (Documentation/QA/Speed_Junk_2026-10-25). Parts still loading are never
  // evicted (the sentence warm-up would lose them). The verb-form parts keep their own limit above (partLimit).
  const dictionaryBytesLimit = 2 * 1024 * 1024;
  const cache = new Map(), cacheBytes = new Map();
  let cachedBytes = 0;
  function dropDictionaryPart(index) {
    cache.delete(index);
    if (cacheBytes.has(index)) { cachedBytes -= cacheBytes.get(index); cacheBytes.delete(index); }
  }
  function trimDictionaryCache(keep) {
    for (const index of [...cache.keys()]) {
      if (cachedBytes <= dictionaryBytesLimit) break;
      if (index !== keep && cacheBytes.has(index)) dropDictionaryPart(index);
    }
  }
  function keepDictionaryPart(index, value) {
    cache.delete(index); cache.set(index, value);
    trimDictionaryCache(index);
    return value;
  }
  const verbFormsBase = new URL("data/fallback-verb-forms/", document.currentScript.src);
  // Versions in the data addresses (26.10.2026): the reader's data cache (bibliothek/dictionary-cache-sw.js) keeps a
  // versioned file for good — a changed data file needs a new version here (dev/bibliothek/tools/data-versions.json).
  const verbFormsVersion = "1024-1";
  const separableUrl = new URL("data/separable-index.json?v=20261108-base-forms-2", document.currentScript.src);
  let separablePromise = null, verbMembershipPromise = null;
  function separableEntries() {
    if (!separablePromise) separablePromise = dataFetch(separableUrl).then(response => {
      if (!response.ok) throw new Error("Separable index unavailable");
      return response.json();
    }).then(data => {
      // format 2 (speed chat 08.11): a list of base forms is written once and an entry names it by number — the rows given back
      // are those of format 1 ([verb, particle, base forms, meanings, derived?]), the lists shared between the verbs of one base
      if (data.format_version === 2 && Array.isArray(data.entries) && Array.isArray(data.stems)) {
        const rows = data.entries.map(([word,prefix,stems,...rest]) => {
          if (!Array.isArray(data.stems[stems])) throw new Error("Invalid separable index");
          return [word,prefix,data.stems[stems],...rest]; });
        return rows;
      }
      if (data.format_version !== 1 || !Array.isArray(data.entries)) throw new Error("Invalid separable index");
      return data.entries;
    }).catch(error => { separablePromise = null; throw error; });
    return separablePromise;
  }
  // A2 (15.10.2026): agreed verb + preposition pairs (exercise list, reference 4.9).
  const verbPrepositionUrl = new URL("data/verb-prepositions.json?v=20261015-a2-1", document.currentScript.src);
  let verbPrepositionPromise = null;
  function verbPrepositions() {
    if (!verbPrepositionPromise) verbPrepositionPromise = dataFetch(verbPrepositionUrl).then(response => {
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
    if(!superlativePromise)superlativePromise=dataFetch(superlativeUrl).then(r=>{
      if(!r.ok)throw Error('Superlative index unavailable');return r.json();
    }).then(d=>{
      if(d.format_version!==1||!d.records||typeof d.records!=='object')throw Error('Invalid superlative index');
      for(const rows of Object.values(d.records))if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!['adj','adv'].includes(r[1])||!Array.isArray(r[2])||r[2].some(m=>typeof m!=='string')))throw Error('Invalid superlative evidence');
      return d.records;
    }).catch(e=>{superlativePromise=null;throw e;});
    return (await superlativePromise)[String(word).normalize('NFC').toLowerCase()]||[];
  }
  // FNV-1a over the UTF-8 bytes. D22 (25.10.2026): the dictionary parts are 8 192 (open data/dictionary-de-json/manifest.json,
  // partition_count; the old part of a word is its new part & 1023); since 07.11 32 768. The verb-form rows come from the same
  // parts (verbFormLinks); of fallback-verb-forms the reader reads only the manifest — the membership filter (mayBeVerb).
  const fnv = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash;
  };
  const dictionaryPartition = word => fnv(word) & 32767;
  // hex text of a filter → bytes (speed chat 08.11): one pass over the characters; before, match(/../g) made 131 072 /
  // 262 144 two-letter strings and parsed each (~36 / ~97 ms and ~12 / ~28 MB of garbage in cloud node; the same bytes).
  // The text is checked as /^[0-9a-f]+$/ before.
  const hexBytes=s=>{const v=c=>c<58?c-48:c-87,out=new Uint8Array(s.length>>1);for(let i=0;i<out.length;i++)out[i]=v(s.charCodeAt(2*i))<<4|v(s.charCodeAt(2*i+1));return out;};
  async function mayBeVerb(word) {
    try {
      if(!verbMembershipPromise)verbMembershipPromise=dataFetch(new URL(`manifest.json?v=${verbFormsVersion}`,verbFormsBase)).then(r=>{if(!r.ok)throw Error('Verb membership unavailable');return r.json();}).then(d=>{const m=d.membership;if(m?.format!=='bloom-fnv1a-v1'||m.bits!==1048576||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid verb membership');return {...m,bitmap:hexBytes(m.bitmap)};}).catch(e=>{verbMembershipPromise=null;throw e;});
      const m=await verbMembershipPromise,key=String(word).normalize('NFC').toLowerCase();let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
      const step=(Math.imul(h^0x9e3779b9,2246822519)>>>0)|1;
      for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(m.bitmap[bit>>>3]&(1<<(bit&7))))return false;}
      return true;
    } catch (_) { return true; } // Missing filter preserves the full lookup path.
  }
  // G48 (23.10.2026, reference C6): spellings that may be a part of a compound or the base of a derived word (Bloom
  // filter, dev/bibliothek/scripts/build-word-formation-parts.cjs; same hashing as the verb membership). Missing or
  // invalid filter: no word formation at all (never a download per letter position).
  const wordPartsUrl=new URL('data/word-formation-parts.json?v=20261023-g48-1',document.currentScript.src);
  let wordPartsPromise=null;
  function wordParts() {
    if(!wordPartsPromise)wordPartsPromise=dataFetch(wordPartsUrl).then(r=>{if(!r.ok)throw Error('Word parts unavailable');return r.json();}).then(d=>{const m=d.membership;
      if(d.format_version!==1||m?.format!=='bloom-fnv1a-v1'||m.bits!==2097152||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid word parts');
      const bitmap=hexBytes(m.bitmap);
      return Object.freeze({has(word){const key=String(word).normalize('NFC').toLowerCase();let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
        const step=(Math.imul(h^0x9e3779b9,2246822519)>>>0)|1;for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(bitmap[bit>>>3]&(1<<(bit&7))))return false;}return true;}});
    }).catch(e=>{wordPartsPromise=null;throw e;});
    return wordPartsPromise;
  }
  // The gender of an external noun (export 2.0.0: entries[i][4].g — m / f / n; p = plural only): der / die / das, '?' for
  // several genders (homonyms: Leiter, Heide), null when none is recorded.
  async function nounGender(word) {
    const data=await record(String(word).normalize('NFC').toLowerCase());
    // The genders of the noun senses (senses[i][5]) and of the entries; a form line («plural of Nachricht») does not count.
    // (advisor 07.11: nor an obsolete / archaic sense — Farm «ферма» is die; der Farm «Farn», «barque» are obsolete)
    const genders=new Set([...(data?.entries||[]).map(e=>e?.[4]?.g),...(data?.senses||[]).filter(s=>s[2]==='noun'&&!(Array.isArray(s[6])&&s[6].some(l=>/^(?:obsolete|archaic)$/iu.test(l)))&&!/\b(?:plural|singular|genitive|dative|accusative|nominative|inflection|form|spelling) of\b/iu.test(String(s[3]||''))).map(s=>s[5])].filter(g=>['m','f','n'].includes(g)));
    return genders.size===1?({m:'der',f:'die',n:'das'})[[...genders][0]]:genders.size>1?'?':null;
  }
  const auxiliaryFormsUrl=new URL('data/auxiliary-verb-forms.json?v=20261008-f4-1',document.currentScript.src);
  let auxiliaryFormsPromise=null;
  async function auxiliaryInflections(word) {
    if(!auxiliaryFormsPromise)auxiliaryFormsPromise=dataFetch(auxiliaryFormsUrl).then(r=>{
      if(!r.ok)throw Error('Auxiliary morphology unavailable');return r.json();
    }).then(d=>{if(d.format_version!==1||!d.records)throw Error('Invalid auxiliary morphology');return d.records;}).catch(e=>{auxiliaryFormsPromise=null;throw e;});
    const rows=(await auxiliaryFormsPromise)[String(word).normalize('NFC').toLowerCase()]||[];
    return rows.map(([lemma,person,number,tense,mood])=>({lemma,person,number,tense,mood}));
  }
  // Speed chat 07.11.2026: the verb-form table (data/fallback-verb-forms/NNNN.json) was a copy of the external dictionary's
  // own inflection rows — all 106 773 forms rebuild byte for byte from the form's own record by the builder's rule
  // (dev/bibliothek/scripts/build-fallback-verb-forms.cjs; regression verb-forms-from-dictionary-qa.cjs). The rows are read
  // from that record now: the reader asks the same part for the word anyway, so one request fewer per word. (The builder's
  // «lemma has a verb sense» condition holds for every such row of this dictionary — the regression checks it.)
  const VERB_FORM_KINDS = ["indicative","subjunctive","imperative","infinitive","infinitive-zu","participle"];
  async function verbFormLinks(word) {
    const spelling = String(word).normalize("NFC").toLowerCase();
    const data = await record(spelling), rows = [];
    for (const [rawForm,rawLemma,rawTags] of data?.inflections || []) {
      const form = String(rawForm || "").normalize("NFC").toLowerCase(), lemma = String(rawLemma || "").normalize("NFC").toLowerCase();
      const tags = String(rawTags || "").split(",").filter(Boolean);
      if (form !== spelling || !/^[\p{L}\p{M}]+$/u.test(form) || !/^[\p{L}\p{M}]+$/u.test(lemma) ||
        tags.some(t => t === "auxiliary" || t.startsWith("error-")) || !tags.some(t => VERB_FORM_KINDS.includes(t))) continue;
      const value = [spelling,lemma,[...new Set(tags)].sort().join(",")];
      if (!rows.some(row => row[1] === value[1] && row[2] === value[2])) rows.push(value);
    }
    return rows;
  }
  // Speed (26.10.2026): several independent lookups that a step used to make one after another (one network wait each)
  // are started together and read in the old order — the results are the same, failures surface at the same place.
  function startAll(keys, ask) {
    const pending = new Map();
    for (const key of keys) if (!pending.has(key)) { const p = ask(key); p.catch(() => {}); pending.set(key,p); }
    return pending;
  }
  async function derivedVerbGroups(word, issues = null) {
    let links;
    try { links = await verbFormLinks(word); } catch (error) { issues?.push({source:'verb-forms',message:String(error.message || error)}); return []; }
    const groups = [], lemmaList = [...new Set(links.map(row=>row[1]))], pending = startAll(lemmaList, lemma => lexicalGroups(lemma));
    for(const lemma of lemmaList) {
      const lexical = (await pending.get(lemma)).filter(g=>g.pos === "verb" && g.meanings.length);
      groups.push(...lexical);
      const data = {inflections:links.filter(row=>row[1] === lemma),senses:[[0,word,"verb",`inflection of ${lemma}:`,0]]};
      groups.push({kind:"form-note",word,pos:"verb",meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:inflectionEvidence(word,data.inflections,groupsFor(word,data))});
    }
    return groups;
  }
  // G9 (21.10.2026, user): senses the reader never shows (coarse slang standing in for a name:
  // Johannes «penis», Petrus «large key»). A row applies only while its gloss still matches;
  // without the list every lookup works as before.
  const hiddenSensesUrl = new URL("data/fallback-hidden-senses.json?v=20261022-nm-1", document.currentScript.src);
  let hiddenSensesPromise = null;
  function hiddenSenses() {
    if (!hiddenSensesPromise) hiddenSensesPromise = dataFetch(hiddenSensesUrl).then(response => {
      if (!response.ok) throw new Error("Hidden sense list unavailable");
      return response.json();
    }).then(data => {
      if (data.format_version !== 1 || !Array.isArray(data.entries)) throw new Error("Invalid hidden sense list");
      const bySpelling = new Map();
      // A malformed row is skipped; the others still apply.
      for (const r of data.entries) {
        if (!Array.isArray(r) || typeof r[0] !== "string" || !Number.isInteger(r[1]) || typeof r[2] !== "string") continue;
        bySpelling.set(r[0],[...(bySpelling.get(r[0]) || []),[r[1],r[2]]]);
      }
      return bySpelling;
    }).catch(() => { hiddenSensesPromise = null; const none = new Map(); none.failed = true; return none; }); // retried with the next part
    return hiddenSensesPromise;
  }
  // G45 (22.10.2026, user; DICTIONARY_DATA_FOR_RESOLVER 3.3): a word that is a personal name (Jürgen, Johannes, Bimbo,
  // Kalle) never shows its noun senses labelled slang / rude / colloquial — they stand in for the name and are hurtful
  // (Johannes «penis», Bimbo — a slur). Only personal names (not surnames or places: so, ja, Haus, Fuchs keep theirs);
  // «dated» alone does not hide (Händel «ссоры», Till). Never hidden: Mark «марка», Klause «келья», Michel.
  const personalName = /\b(?:given name|nickname for someone named)\b/iu;
  const hiddenLabels = new Set(["vulgar","obscene","offensive","derogatory","slur","ethnic","slang","colloquial","informal","familiar"]);
  const keepNameSenses = new Set(["mark","klause","michel"]);
  function withoutNameSlang(records) {
    for (const [spelling,data] of Object.entries(records)) {
      const senses = data?.senses;
      if (!Array.isArray(senses) || keepNameSenses.has(spelling) ||
          !senses.some(s => s[2] === "name" && personalName.test(String(s[3])))) continue;
      const kept = senses.filter(s => !(s[2] === "noun" && Array.isArray(s[6]) && s[6].some(l => hiddenLabels.has(l))));
      if (kept.length !== senses.length) records[spelling] = {...data,senses:kept};
    }
    return records;
  }
  function withoutHiddenSenses(records, hidden) {
    withoutNameSlang(records);
    for (const [spelling,rows] of hidden) {
      const data = Object.prototype.hasOwnProperty.call(records,spelling) ? records[spelling] : null;
      if (!Array.isArray(data?.senses)) continue;
      const senses = data.senses.filter(s => !rows.some(([id,gloss]) => s[0] === id && s[3] === gloss));
      if (senses.length !== data.senses.length) records[spelling] = {...data,senses};
    }
    return records;
  }
  function dictionaryPart(index) {
    if (cache.has(index)) return keepDictionaryPart(index,cache.get(index));
    let bytes = 0;
    const promise = Promise.all([dataFetch(new URL(`parts/${String(index).padStart(4, "0")}.json?v=32768-1`, base))
      .then(response => {
        if (!response.ok) throw new Error("Fallback dictionary unavailable");
        // The text length bounds the cache; a response without text() (test stand-ins) counts as an average part.
        if (typeof response.text !== "function") { bytes = 16 * 1024; return response.json(); }
        return response.text().then(text => { bytes = text.length; return JSON.parse(text); });
      }),hiddenSenses()]).then(([data,hidden]) => {
        if (data.format_version !== 1 || data.partition !== index) throw new Error("Invalid dictionary partition");
        // A part built without the list is not kept: the next request builds it again with the list (Dirne «whore»).
        if (hidden.failed) Promise.resolve().then(() => { if (cache.get(index) === promise) dropDictionaryPart(index); });
        else if (cache.get(index) === promise && !cacheBytes.has(index)) {
          cacheBytes.set(index, bytes); cachedBytes += bytes;
          trimDictionaryCache(index);
        }
        return withoutHiddenSenses(data.records,hidden);
      }).catch(error => { if (cache.get(index) === promise) dropDictionaryPart(index); throw error; });
    observePending(promise);
    return keepDictionaryPart(index,promise);
  }

  async function record(word) {
    const index = dictionaryPartition(word);
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
    return match[2].normalize("NFC").toLowerCase();
  }
  function groupsFor(word, data) {
    observe('groups-build', {word});
    const byPos = new Map(), labelsByPos = new Map(), reflexiveByPos = new Map(), genderByPos = new Map();
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0]-b[0])) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) { byPos.set(pos, []); labelsByPos.set(pos, {}); reflexiveByPos.set(pos, {}); genderByPos.set(pos, {}); }
      byPos.get(pos).push(row[3]);
      // G16 (fc122e9): the gender of a noun sense (column 5: m / f / n, several — m:n)
      if (typeof row[5] === "string" && row[5] && !(row[3] in genderByPos.get(pos))) genderByPos.get(pos)[row[3]] = row[5];
      // G45 (2), reference 2.A: usage labels of the sense (index 6, fc122e9) travel with its meaning text.
      if (Array.isArray(row[6]) && row[6].length) labelsByPos.get(pos)[row[3]] = [...row[6]];
      // 27.10.2026 (reflexive marks, 2f3859a): a verb sense used with sich (column 8: acc / dat / opt) — read by meaning-display only
      // when sich is linked with the verb and our card has no field `reflexive`.
      if (["acc","dat","opt"].includes(row[7]) && !(row[3] in reflexiveByPos.get(pos))) reflexiveByPos.get(pos)[row[3]] = row[7];
    }
    // Auxiliary rows (haben: ~9 300, sein: ~1 500 "auxiliary of <verb>" links) never name a
    // lemma inside a sense, and comparing every sense with each of them cost seconds in browsers.
    const mappedLemmas = (data?.inflections || []).filter(row => !String(row[2] || "").split(",").includes("auxiliary")).map(row => row[1]);
    return [...byPos].map(([pos, values]) => {
      const reference = value => !!referenceLemma(value) || /^inflection of\b/iu.test(value) || mappedLemmas.some(lemma =>
        value.toLowerCase().includes(` of ${lemma.toLowerCase()}`) &&
        /\b(?:present|past|preterite|participle|imperative|singular|plural|dative|accusative|genitive|nominative|infinitive|comparative|superlative)\b/iu.test(value));
      const hasReference = values.some(reference);
      const grammarTokens = new Set(["first","second","third","person","singular","plural","present","past","preterite","perfect","imperfect","imperative","indicative","subjunctive","participle","nominative","accusative","dative","genitive","infinitive","positive","comparative","superlative","masculine","feminine","neuter","definite","indefinite","weak","strong","mixed","all","case","gender","dependent","independent","subordinate","clause","zu"]);
      const continuation = value => {
        const tokens = value.toLowerCase().replace(/\bsubjunctive\s+(?:ii|i)\b/gu, "subjunctive").split(/[\s,;:/().-]+/u).filter(Boolean);
        const declensionNote = /^(?:weak|strong|mixed)(?:[\s/-]|$)/iu.test(value.trim()) && tokens.length > 1;
        return (hasReference || declensionNote) && tokens.length > 0 && tokens.every(token => token === "degree" || grammarTokens.has(token));
      };
      const notes = [...new Set(values.filter(value => reference(value) || continuation(value)))];
      const meanings = [...new Set(values.filter(value => !notes.includes(value)))], all = labelsByPos.get(pos) || {};
      const labels = Object.fromEntries(meanings.filter(m => all[m]).map(m => [m,all[m]]));
      const marks = reflexiveByPos.get(pos) || {}, reflexive = Object.fromEntries(meanings.filter(m => marks[m]).map(m => [m,marks[m]]));
      const noun = pos === "noun" ? nounFacts(word, data, meanings.map(m => genderByPos.get(pos)[m])) : null;
      return {word,pos,meanings,formNotes:notes,...(Object.keys(labels).length ? {labels} : {}),...(Object.keys(reflexive).length ? {reflexive} : {}),
        ...(noun ? {noun} : {})};
    });
  }
  // G16 + G69 (advisor 25.10.2026, rules of DICTIONARY_DATA_FOR_RESOLVER 3.1): the article of an external noun and its
  // singular / plural spellings, from the English export (entries[i][4]: g — m / f / n / p, several m:f; decl — eight cells
  // nominative / accusative / dative / genitive singular, then plural; a cell is ending alternatives split by «/», a leading
  // number drops that many letters first: haus 3äuser → häuser, «-» no form). The gender of the meanings is the noun's gender
  // (die See «sea», der See «lake»); meanings of several genders or a meaning with two genders — no article; no gender at the
  // meanings — the word's one gender. A noun declined like an adjective (strong / weak alternatives -r / -m / -n in the
  // singular: die Angestellte, der Angestellte) — no article, its gender follows the meaning.
  function nounFacts(word, data, meaningGenders) {
    const facts = (data?.entries || []).map(e => e?.[4]).filter(f => f && typeof f === "object");
    const decls = facts.flatMap(f => [f.decl,...(Array.isArray(f.alt) ? f.alt.map(a => a?.[1]) : [])]).filter(d => typeof d === "string" && d.split("|").length === 8);
    const lower = String(word).normalize("NFC").toLowerCase();
    const spell = cell => cell.split("/").filter(a => a !== "-").map(a => { const m = a.match(/^(\d*)(.*)$/u), n = Number(m[1] || 0);
      return (n ? lower.slice(0, -n) : lower) + m[2]; });
    const singular = new Set(), plural = new Set();
    for (const d of decls) d.split("|").forEach((cell, i) => spell(cell).forEach(f => (i < 4 ? singular : plural).add(f)));
    const adjectival = decls.some(d => d.split("|").slice(0, 4).some(cell => { const alts = cell.split("/").map(a => a.replace(/^\d+/u, ""));
      return alts.length > 1 && alts.some(a => /[rm]$/u.test(a)) && alts.some(a => /n$/u.test(a)); }));
    const marked = meaningGenders.filter(Boolean);
    let gender = null;
    if (marked.length) { const kinds = new Set(marked); gender = kinds.size === 1 && /^[mfn]$/u.test(marked[0]) ? marked[0] : null; }
    else { const kinds = new Set(facts.map(f => f.g).filter(Boolean)); gender = kinds.size === 1 && /^[mfn]$/u.test([...kinds][0]) ? [...kinds][0] : null; }
    // (reviewer 27.10: a headword that is also a function word or a letter — Ach, Es, Du, Nein, Wenn, O, H — or a nominalized
    // adjective form (was Schönes, Neues) is no plain noun: no article; two letters or less — no article)
    const closed = (data?.senses || []).some(s => ["intj","pron","article","prep","conj","character","det","particle","postp","num"].includes(s[2]));
    const nominalized = (data?.senses || []).some(s => s[2] === "noun" && /^nominalization of\b/iu.test(String(s[3] || "")));
    const article = !adjectival && !closed && !nominalized && lower.length > 2 && gender ? {m:"der",f:"die",n:"das"}[gender] : null;
    return article || singular.size || plural.size ? {article, singular:[...singular], plural:[...plural]} : null;
  }
  // Evidence belongs to the clicked spelling, not to permanent dictionary cards.
  function noteReferencesLemma(note,lemma) {
    const text=note.toLowerCase(),marker=` of ${lemma.toLowerCase()}`,index=text.indexOf(marker);
    return index>=0&&/^(?:$|[\s:(“"])/u.test(text.slice(index+marker.length));
  }
  function inflectionEvidence(form, mappings, groups) {
    const result = [];
    for (const [spelling, lemma, rawTags] of mappings) {
      if (spelling.normalize("NFC").toLowerCase() !== form.toLowerCase()) continue;
      const positions = groups.filter(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,lemma):
          note.toLowerCase().includes(` of ${lemma.toLowerCase()}`)));
      for (const group of positions) {
        const analyses = [String(rawTags || "").split(",").filter(Boolean)];
        // Some exports store only one analysis in the mapping, with the others
        // in continuation notes. Only attach those when the lemma is unambiguous.
        if (group.pos==='verb'?new Set(group.formNotes.map(referenceLemma).filter(Boolean)).size === 1:new Set(mappings.map(row=>row[1])).size === 1) {
          for (const note of group.formNotes) {
            // A second explicit analysis (e.g. past participle) may coexist
            // with a finite structured mapping of the same spelling.
            if (/\bof\b/iu.test(note) && referenceLemma(note) !== lemma.toLowerCase()) continue;
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
    return !(data?.senses || []).length && String(row[0]).normalize('NFC').toLowerCase() === word.toLowerCase() &&
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
      return nounOnly && String(row[0]).normalize('NFC').toLowerCase() === word.toLowerCase() &&
        tags.some(tag => ['nominative','accusative','genitive','dative','singular','plural'].includes(tag)) &&
        tags.every(tag => nounTags.has(tag));
    };
    const mappings = (data?.inflections || []).filter(row =>
      !String(row[2] || "").split(",").some(tag => tag === "auxiliary" || tag.startsWith("error-")) &&
      (nounMapping(row) || adjectiveDeclension(word,data,row) || direct.some(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,String(row[1])):
          note.toLowerCase().includes(` of ${String(row[1]).toLowerCase()}`)))));
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
    const w = String(word).normalize("NFC").toLowerCase(), result = [];
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
  // #29 (links chat 04.11, RESOLVER2_TASK_PARTICIPLE_FORMS): a verb head of the Russian dictionary alone (überbauen, rezipieren,
  // enthäuten — no English record) confirms a participle hypothesis of a word the English dictionary does not know at all; its group
  // has no English meaning (the Russian one comes with the enrichment, as for the Russian-only separable verbs — abformen).
  async function russianVerb(lemma) {
    try { const r = await window.BibliothekRussianTranslations?.lookup(lemma,"verb"); return !!r?.meanings?.length; } catch (_) { return false; }
  }
  async function weakVerbGroups(word, unknown = false) {
    const form = String(word).normalize("NFC").toLowerCase(), groups = [], seen = new Set();
    const hypotheses = weakHypotheses(form), pending = startAll(hypotheses.map(h => h.lemma), lemma => lexicalGroups(lemma));
    for (const {lemma,rows} of hypotheses) {
      const key = lemma+"|"+JSON.stringify(rows);
      if (seen.has(key)) continue; seen.add(key);
      let lexical = (await pending.get(lemma)).filter(g => g.pos === "verb" && g.word === lemma && g.meanings.length);
      if (!lexical.length && unknown && rows.every(tags => tags.includes("participle")) && await russianVerb(lemma))
        lexical = [{word:lemma,pos:"verb",meanings:[],russianOnly:true}];
      if (!lexical.length) continue;
      if (!groups.some(g => g.word === lemma && !g.kind)) groups.push(...lexical.map(g => ({...g,derived:"regular-weak-form"})));
      groups.push({kind:"form-note",derived:"regular-weak-form",word,pos:"verb",meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:rows.map(tags => ({form,lemma,pos:"verb",tags:[...tags,...(tags.includes("participle") ? [] : ["indicative"])],
          person:tags.find(t => /-person$/u.test(t)) || null,number:tags.find(t => ["singular","plural"].includes(t)) || null,
          // (#29: a past participle carries «past» like the dictionary's own rows — gebaut —; without it the reader took it for a
          // present participle and built no Perfekt / passive group)
          tense:tags.find(t => ["present","past"].includes(t) && (!tags.includes("participle") || t === "past")) || null,
          mood:tags.includes("participle") ? null : "indicative",source:"regular-weak-form"}))});
    }
    return groups;
  }
  async function withWeakVerb(word, groups) {
    if (groups.some(g => g.pos === "verb")) return groups;
    try { return [...groups,...await weakVerbGroups(word,!groups.length)]; } catch (_) { return groups; }
  }
  // #29 (links chat 04.11): a word the dictionaries do not know that is a particle + a recorded participle of a simple verb, where
  // particle + verb is a verb of the separable index (Russian-only ones too): ab + geformt → abformen, ein + gesungen → einsingen
  // (strong verbs too — the participle is the simple verb's recorded one, nothing is guessed).
  let separableByPrefix = null;
  async function separableParticipleGroups(word) {
    const form = String(word).normalize("NFC").toLowerCase(), groups = [];
    if (!separableByPrefix) separableByPrefix = separableEntries().then(rows => {
      const map = new Map();
      for (const row of rows) { const [lemma,prefix] = row; if (!/^[\p{Ll}]+$/u.test(lemma)) continue;
        if (!map.has(prefix)) map.set(prefix,new Map()); map.get(prefix).set(lemma,row); }
      return map;
    }).catch(e => { separableByPrefix = null; throw e; });
    const byPrefix = await separableByPrefix;
    for (const [prefix,lemmas] of byPrefix) {
      if (!form.startsWith(prefix) || form.length < prefix.length+4) continue;
      const rest = form.slice(prefix.length);
      if (!await mayBeVerb(rest)) continue;
      const links = (await verbFormLinks(rest)).filter(([,,tags]) => String(tags).split(",").includes("participle"));
      for (const lemma of [...new Set(links.map(row => row[1]))]) {
        const row = lemmas.get(prefix+lemma);
        if (!row || groups.some(g => g.word === row[0])) continue;
        const meanings = row[3] || [];
        groups.push({word:row[0],pos:"verb",meanings,...(meanings.length ? {} : {russianOnly:true}),derived:"separable-participle"});
        groups.push({kind:"form-note",derived:"separable-participle",word,pos:"verb",meanings:[`inflection of ${row[0]}:`],lemmas:[row[0]],
          inflections:links.filter(l => l[1] === lemma).map(([,,tags]) => { const t = String(tags).split(",");
            return {form,lemma:row[0],pos:"verb",tags:t,person:null,number:null,tense:t.includes("past") ? "past" : t.includes("present") ? "present" : null,mood:null,source:"separable-participle"}; })});
      }
    }
    return groups;
  }
  // B4 (15.10.2026): a lowercase spelling the export does not know at all
  // (zypriotischen, warzigeres) may be a regular declined form of an adjective
  // headword: -e/-en/-em/-er/-es, also after a comparative -er or a superlative
  // -st/-est. Only an explicit adjective headword confirms a hypothesis; the
  // stripped word is never offered as a noun or a verb (Rose -> Ros, oben -> ob).
  const adjectiveEndings = ["en","em","er","es","e"];
  function adjectiveHypotheses(word) {
    const w = String(word).normalize("NFC").toLowerCase(), result = [];
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
    const form = String(word).normalize("NFC").toLowerCase(), groups = [], seen = new Set();
    const hypotheses = adjectiveHypotheses(form), pending = startAll(hypotheses.map(h => h.base), base => lexicalGroups(base));
    for (const {base,ending,degree} of hypotheses) {
      const key = base+"|"+degree;
      if (seen.has(key)) continue; seen.add(key);
      const lexical = (await pending.get(base)).filter(g => g.pos === "adj" && g.word === base && g.meanings.length);
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
    if (!groups.length) { try { const separable = await separableParticipleGroups(word); if (separable.length) return separable; } catch (_) {} }
    const withVerb = await withWeakVerb(word,groups);
    if (withVerb.length) return withVerb;
    try { return await adjectiveEndingGroups(word); } catch (_) { return withVerb; }
  }
  async function lookupGroups(word, issues = null) {
    observe('lookup', {word});
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLowerCase()])];
    // Both spellings at once (Der / der, Zum / zum: the capital one mostly has no record). For a word of the sentence the
    // warm-up has requested both already, so the extra part costs nothing there; measured: requests −0.1 %, one wait less.
    const records = startAll(candidates, candidate => record(candidate));
    for (const candidate of candidates) {
      const data = await records.get(candidate);
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
        if (group.labels) target.labels = {...(target.labels || {}),...group.labels};
        if (group.reflexive) target.reflexive = {...(target.reflexive || {}),...group.reflexive};
        if (group.noun && !target.noun) target.noun = group.noun;
      }
      if (merged.size || notes.length) return [...merged.values(),...notes];
      if (meanings(data).length) return [{word:candidate,pos:"",meanings:meanings(data),unresolved:true}];
    }
    return derivedVerbGroups(String(word).normalize("NFC").trim().toLowerCase(),issues);
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
  // G9 (21.10.2026): order of the record's own senses between an ordinary noun / adjective and a name of this
  // spelling. True when the ordinary reading comes first (wolf, müller, rapunzel), false when the name comes first
  // (jürgen, johannes, mars, schnabel), null without a name. Spelling variants, clippings and abbreviations
  // (obsolete form of Dill, initialism of …) are no ordinary reading.
  const variantGloss = /^(?:(?:obsolete|archaic|dated|alternative|apocopic|euphemistic|eye-dialect|nonstandard|misspelling)\b[^:]*?\b(?:form|spelling) of|clipping of|ellipsis of|initialism of|abbreviation of|acronym of|shorthand of|short for)\b/iu;
  async function nameReadingOrder(word, pos = null) {
    const spellings = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLowerCase()])];
    let order = null;
    for (const spelling of spellings) {
      let data; try { data = await record(spelling); } catch (_) { return null; }
      const senses = data?.senses || [];
      if (!senses.some(s => s[2] === "name")) continue;
      const ordinary = senses.filter(s => (pos ? s[2] === pos : ["noun","adj"].includes(s[2])) && !variantGloss.test(String(s[3]).trim())).map(s => s[4] ?? 0);
      // A surname listed first is no evidence (Schnabel: «a surname», then «beak»); a given name or a place is (Jürgen, Mars).
      const surname = s => /\bsurname\b/iu.test(String(s[3])) && !/\b(?:given name|city|town|village|municipality|river|region|country|planet|island|mountain|district|state|province|character)\b/iu.test(String(s[3]));
      const firstOrdinary = ordinary.length ? Math.min(...ordinary) : Infinity;
      const first = ordinary.length > 0 && senses.every(s => s[2] !== "name" || (s[4] ?? 0) > firstOrdinary || surname(s));
      order = order === null ? first : order && first;
    }
    return order;
  }
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
        const key = target.normalize('NFC').toLowerCase();
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
    return {meanings:await expand(values,new Set([String(word).normalize('NFC').toLowerCase()])),references,unresolved};
  }
  // B16 (15.10.2026): verbs whose Perfekt the export forms with haben / sein
  // (structured "auxiliary" rows of the haben and sein records).
  const auxiliarySets = new Map();
  async function perfectAuxiliaries(lemma) {
    const key = String(lemma).normalize("NFC").toLowerCase(), result = [];
    // Speed (26.10.2026): both records are requested at once (one network wait, not two); checked in the old order.
    for (const auxiliary of ["haben","sein"]) {
      if (!auxiliarySets.has(auxiliary)) {
        const pending = record(auxiliary).then(data => new Set((data?.inflections || [])
          .filter(row => String(row[2] || "").split(",").includes("auxiliary") && row[0] === auxiliary)
          .map(row => String(row[1]).normalize("NFC").toLowerCase()))).catch(error => {auxiliarySets.delete(auxiliary);throw error;});
        pending.catch(() => {});   // a failure is reported by the await below, never as an unhandled rejection
        auxiliarySets.set(auxiliary,pending);
      }
    }
    for (const auxiliary of ["haben","sein"]) if ((await auxiliarySets.get(auxiliary)).has(key)) result.push(auxiliary);
    // #29 (05.11): a verb of the separable index without auxiliary rows of its own (abformen, einsingen — Russian-only) takes those
    // of its simple verb (formen, singen): hat … abgeformt.
    if (!result.length) {
      try {
        const row = (await separableEntries()).find(r => r[0] === key);
        if (row && key.startsWith(row[1]) && key.length > row[1].length) {
          const base = key.slice(row[1].length);
          for (const auxiliary of ["haben","sein"]) if ((await auxiliarySets.get(auxiliary)).has(base)) result.push(auxiliary);
        }
      } catch (_) { /* no index: no auxiliary, as before */ }
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
  const lowerSpelling = word => String(word).normalize("NFC").toLowerCase();
  async function peek(word) {
    try {
      const records = await dictionaryPart(dictionaryPartition(word));
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
      // (a word without a record has no verb-form rows either: they are read from its record since 07.11)
      const verbLinked = false;
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
  // G68 (24.10.2026): any record of the spelling, also one with only a variant note (beileibe = bei Leibe) — a whole word
  // known to the dictionary is never explained by its parts.
  async function hasRecord(word) { try { return !!(await record(String(word || "").normalize("NFC").toLowerCase())); } catch (_) { return false; } }
  // #21 (05.11): a record that only says «diminutive of X» (täschchen — tasche, geisslein — geiss) shows no meaning of its own;
  // the base it names, for the diminutive card of the resolver (word formation).
  async function diminutiveBase(word) {
    try {
      const data = await record(String(word || "").normalize("NFC").toLowerCase());
      const rows = (data?.inflections || []).filter(row => String(row[2] || "").split(",").includes("diminutive"));
      const bases = [...new Set(rows.map(row => row[1]))];
      return bases.length === 1 ? bases[0] : null;
    } catch (_) { return null; }
  }
  async function lookupFacts(word) { const issues = []; return {groups:await lookup(word,issues),issues}; }
  window.DeutschFallbackDictionary = {wordParts,hasRecord,diminutiveBase,nounGender,nameReadingOrder,lookupFacts,warm,perfectAuxiliaries,verbPrepositions,separableFormEvidence,auxiliaryInflections,lookup, lookupEntry, separableEntries, mayBeVerb, spellingTranslation, superlativeEntries};
})();
