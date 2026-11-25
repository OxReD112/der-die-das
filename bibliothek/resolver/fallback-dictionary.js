/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  // Versioned data files go through the reader's data cache (resolver/data-cache.js); without it — plain fetch.
  const dataFetch = (input, options) => (typeof window !== "undefined" && window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
  let diagnosticPending = null;
  // Track a pending part request for the diagnostics (only when a diagnostics sink is set).
  function observePending(pending) {
    if (typeof window.BibliothekAnalysisDiagnostics !== 'function') return;
    diagnosticPending ||= new WeakSet();
    diagnosticPending.add(pending);
    pending.then(() => diagnosticPending.delete(pending), () => diagnosticPending.delete(pending));
  }
  // The cache state of a key for the diagnostics: miss, pending or hit.
  const cacheState = (cache, key) => !cache.has(key) ? 'miss'
    : diagnosticPending?.has(cache.get(key)) ? 'pending' : 'hit';
  let silent = false;
  // Send one diagnostics event to the sink (not while a warm-up reads silently).
  function observe(type, detail = {}) {
    const sink = window.BibliothekAnalysisDiagnostics;
    if (silent || typeof sink !== 'function') return;
    try { sink({component:'fallback',type,
      time:typeof performance !== 'undefined' ? performance.now() : Date.now(),...detail}); } catch (_) {}
  }

  const base = new URL("../../open%20data/dictionary-de-json/", document.currentScript.src);
  // Part caches are bounded. A parsed part takes ~0.19 MB of memory; only the
  // most recently used parts are kept. An evicted part is requested again when
  // needed (normally answered by the browser's HTTP cache); the data is the
  // same file, so results do not change. 60 parts: with 160, JS memory in Safari on the iPhone
  // levels off at ~190-230 MB.
  const partLimit = 60;
  // Keep a verb-form part as the most recent one; drop the oldest beyond partLimit.
  function keepPart(map, key, value) {
    map.delete(key); map.set(key, value);
    while (map.size > partLimit) map.delete(map.keys().next().value);
    return value;
  }
  // The dictionary has 32 768 small parts, so its cache is bounded by the size of the kept JSON text (UTF-16 code units, about its
  // bytes), not by the number of parts: 2 MB (parsed JSON takes about four times its text in memory); the largest part is haben's,
  // ~350 KB. Parts still loading are never evicted (the sentence warm-up would lose them). The verb-form parts keep their own limit
  // above (partLimit).
  const dictionaryBytesLimit = 2 * 1024 * 1024;
  const cache = new Map(), cacheBytes = new Map();
  let cachedBytes = 0;
  // Drop one dictionary part from the cache and from the byte count.
  function dropDictionaryPart(index) {
    cache.delete(index);
    if (cacheBytes.has(index)) { cachedBytes -= cacheBytes.get(index); cacheBytes.delete(index); }
  }
  // Drop the oldest dictionary parts (never keep, never one still loading) until the cache fits dictionaryBytesLimit.
  function trimDictionaryCache(keep) {
    for (const index of [...cache.keys()]) {
      if (cachedBytes <= dictionaryBytesLimit) break;
      if (index !== keep && cacheBytes.has(index)) dropDictionaryPart(index);
    }
  }
  // Keep a dictionary part as the most recent one and trim the cache.
  function keepDictionaryPart(index, value) {
    cache.delete(index); cache.set(index, value);
    trimDictionaryCache(index);
    return value;
  }
  const verbFormsBase = new URL("data/fallback-verb-forms/", document.currentScript.src);
  // Versions in the data addresses: the reader's data cache (bibliothek/dictionary-cache-sw.js) keeps a
  // versioned file for good — a changed data file needs a new version here (dev/bibliothek/tools/data-versions.json).
  const verbFormsVersion = "1024-2";   // membership filter format bloom-fnv1a-v2 (high-bit step): a page that hashes another way rejects the
  // file and answers «maybe», as without a filter.
  const separableUrl = new URL("data/separable-index.json?v=20261108-own-nouns-1", document.currentScript.src);
  let separablePromise = null, verbMembershipPromise = null;
  // The separable index (data/separable-index.json), loaded once: particle + verb rows.
  function separableEntries() {
    if (!separablePromise) separablePromise = dataFetch(separableUrl).then(response => {
      if (!response.ok) throw new Error("Separable index unavailable");
      return response.json();
    }).then(data => {
      // format 2: a list of base forms is written once and an entry names it by number — the rows given back
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
  // Verb + preposition data file (verb-prepositions.json): only its named word classes are read here.
  const verbPrepositionUrl = new URL("data/verb-prepositions.json?v=20261124-pairs-ours-2-clean", document.currentScript.src);
  let verbPrepositionPromise = null;
  // «classes»: named closed lists of words that several rules share — one notion, one list (indefinite-quantity: halten
  // von, haben + zu, the card choice of halten). A row's requires_any is a list of words or the name of a class; the rows come with the
  // class's words.
  function verbPrepositionFile() {
    if (!verbPrepositionPromise) verbPrepositionPromise = dataFetch(verbPrepositionUrl).then(response => {
      if (!response.ok) throw new Error("Verb preposition list unavailable");
      return response.json();
    }).then(data => {
      // Is v a list of strings?
      const words = v => Array.isArray(v) && v.every(w => typeof w === "string");
      // (a class may carry its polarity — {pos, neg}; its words are both)
      const polar = v => v && typeof v === "object" && !Array.isArray(v) && words(v.pos) && words(v.neg);
      if (data.classes && (typeof data.classes !== "object" || !Object.values(data.classes).every(v => words(v) || polar(v)))) throw new Error("Invalid verb preposition list");
      const classes = Object.fromEntries(Object.entries(data.classes || {}).map(([k,v]) => [k, polar(v) ? [...v.pos,...v.neg] : v]));
      const polarity = Object.fromEntries(Object.entries(data.classes || {}).filter(([,v]) => polar(v)).map(([k,v]) => [k, {neg:v.neg}]));
      // (the pairs live in our records — their conditions in the elements, read by the resolver
      // (lemma-resolver.js complementFact); this file keeps the classes only, entries: [])
      if (data.format_version !== 1 || !Array.isArray(data.entries) || typeof classes !== "object" || !Object.values(classes).every(words))
        throw new Error("Invalid verb preposition list");
      return {classes, polarity, entries:data.entries};
    }).catch(error => { verbPrepositionPromise = null; throw error; });
    return verbPrepositionPromise;
  }
  // The entries, the word classes and their polarity of the verb + preposition data file.
  function verbPrepositions() { return verbPrepositionFile().then(d => d.entries); }
  function wordClasses() { return verbPrepositionFile().then(d => d.classes); }
  function wordClassPolarity() { return verbPrepositionFile().then(d => d.polarity); }
  const superlativeUrl=new URL('data/superlative-index.json?v=20261008-l07-1',document.currentScript.src);
  let superlativePromise=null;
  // The superlative index (data/superlative-index.json) row of a word, loaded once.
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
  // FNV-1a over the UTF-8 bytes. The dictionary parts: open data/dictionary-de-json/manifest.json, partition_count (32 768).
  // The verb-form rows come from the same
  // parts (verbFormLinks); of fallback-verb-forms the reader reads only the manifest — the membership filter (mayBeVerb).
  const fnv = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash;
  };
  // The dictionary part of a word: FNV-1a hash & 32767.
  const dictionaryPartition = word => fnv(word) & 32767;
  // hex text of a filter → bytes in one pass over the characters (no two-letter strings per byte).
  // The text is checked as /^[0-9a-f]+$/ before.
  const hexBytes=s=>{const v=c=>c<58?c-48:c-87,out=new Uint8Array(s.length>>1);for(let i=0;i<out.length;i++)out[i]=v(s.charCodeAt(2*i))<<4|v(s.charCodeAt(2*i+1));return out;};
  // May the word be a recorded verb form? Bloom filter of the verb-form manifest; true when the filter is missing.
  async function mayBeVerb(word) {
    try {
      if(!verbMembershipPromise)verbMembershipPromise=dataFetch(new URL(`manifest.json?v=${verbFormsVersion}`,verbFormsBase)).then(r=>{if(!r.ok)throw Error('Verb membership unavailable');return r.json();}).then(d=>{const m=d.membership;if(m?.format!=='bloom-fnv1a-v2'||m.bits!==1048576||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid verb membership');return {...m,bitmap:hexBytes(m.bitmap)};}).catch(e=>{verbMembershipPromise=null;throw e;});
      const m=await verbMembershipPromise,key=String(word).normalize('NFC').toLowerCase();let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
      const step=((Math.imul(h^0x9e3779b9,2246822519)>>>0)>>>13)|1;   // the high bits — the builders hash the same way
      for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(m.bitmap[bit>>>3]&(1<<(bit&7))))return false;}
      return true;
    } catch (_) { return true; } // Missing filter preserves the full lookup path.
  }
  // Spellings that may be a part of a compound or the base of a derived word (Bloom
  // filter, dev/bibliothek/scripts/build-word-formation-parts.cjs; same hashing as the verb membership). Missing or
  // invalid filter: no word formation at all (never a download per letter position).
  const wordPartsUrl=new URL('data/word-formation-parts.json?v=20261110-step-1',document.currentScript.src);
  let wordPartsPromise=null;
  // The word-formation filter, loaded once: may a spelling be a part of a compound (mayBePart)?
  function wordParts() {
    if(!wordPartsPromise)wordPartsPromise=dataFetch(wordPartsUrl).then(r=>{if(!r.ok)throw Error('Word parts unavailable');return r.json();}).then(d=>{const m=d.membership;
      if(d.format_version!==1||m?.format!=='bloom-fnv1a-v2'||m.bits!==2097152||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid word parts');
      const bitmap=hexBytes(m.bitmap);
      return Object.freeze({has(word){const key=String(word).normalize('NFC').toLowerCase();let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
        const step=((Math.imul(h^0x9e3779b9,2246822519)>>>0)>>>13)|1;for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(bitmap[bit>>>3]&(1<<(bit&7))))return false;}return true;}});
    }).catch(e=>{wordPartsPromise=null;throw e;});
    return wordPartsPromise;
  }
  // Two grammatical classes of nouns — time and measure — complete by grammar, not by corpus
  // (data/noun-classes.json, dev/bibliothek/scripts/build-noun-classes.py): {time: Set, timeUnit: Set, timePoint: Set, measure: Set}
  // of lowercase spellings. Missing or invalid file: empty classes (no time / measure sign).
  const nounClassesUrl=new URL('data/noun-classes.json?v=20261124-links-1',document.currentScript.src);
  let nounClassesPromise=null;
  // The noun classes (time, measure), loaded once; empty sets when the file is missing.
  function nounClasses() {
    if(!nounClassesPromise)nounClassesPromise=dataFetch(nounClassesUrl).then(r=>{if(!r.ok)throw Error('Noun classes unavailable');return r.json();}).then(d=>{
      if(d.format_version!==1||!d.time||!d.measure)throw Error('Invalid noun classes');
      // All forms of the given class groups as one set.
      const set=groups=>new Set(groups.flatMap(g=>(g||[]).flatMap(e=>e.forms||[])));
      return Object.freeze({time:set(Object.values(d.time)),timeUnit:set([d.time.unit]),timePoint:set([d.time.point]),measure:set(Object.values(d.measure)),money:set([d.measure.money])});
    }).catch(e=>{nounClassesPromise=null;throw e;});
    return nounClassesPromise;
  }
  // The gender of an external noun (export 2.0.0: entries[i][4].g — m / f / n; p = plural only): der / die / das, '?' for
  // several genders (homonyms: Leiter, Heide), null when none is recorded.
  async function nounGender(word) {
    const data=await record(String(word).normalize('NFC').toLowerCase());
    // The genders of the noun senses (senses[i][5]) and of the entries; a form line («plural of Nachricht») does not count.
    // (nor an obsolete / archaic sense — Farm «ферма» is die; der Farm «Farn», «barque» are obsolete)
    const genders=new Set([...(data?.entries||[]).map(e=>e?.[4]?.g),...(data?.senses||[]).filter(s=>s[2]==='noun'&&!(Array.isArray(s[6])&&s[6].some(l=>/^(?:obsolete|archaic)$/iu.test(l)))&&!/\b(?:plural|singular|genitive|dative|accusative|nominative|inflection|form|spelling) of\b/iu.test(String(s[3]||''))).map(s=>s[5])].filter(g=>['m','f','n'].includes(g)));
    return genders.size===1?({m:'der',f:'die',n:'das'})[[...genders][0]]:genders.size>1?'?':null;
  }
  const auxiliaryFormsUrl=new URL('data/auxiliary-verb-forms.json?v=20261008-f4-1',document.currentScript.src);
  let auxiliaryFormsPromise=null;
  // The morphology rows of the auxiliaries (data/auxiliary-forms.json) for a word, loaded once.
  async function auxiliaryInflections(word) {
    if(!auxiliaryFormsPromise)auxiliaryFormsPromise=dataFetch(auxiliaryFormsUrl).then(r=>{
      if(!r.ok)throw Error('Auxiliary morphology unavailable');return r.json();
    }).then(d=>{if(d.format_version!==1||!d.records)throw Error('Invalid auxiliary morphology');return d.records;}).catch(e=>{auxiliaryFormsPromise=null;throw e;});
    const rows=(await auxiliaryFormsPromise)[String(word).normalize('NFC').toLowerCase()]||[];
    return rows.map(([lemma,person,number,tense,mood])=>({lemma,person,number,tense,mood}));
  }
  // The verb-form rows of a word are rebuilt from the word's own record by the builder's rule (106 773 forms, byte for
  // byte as dev/bibliothek/scripts/build-fallback-verb-forms.cjs builds them; regression verb-forms-from-dictionary-qa.cjs):
  // the reader asks the same part for the word anyway, so no separate table is read. (The builder's
  // «lemma has a verb sense» condition holds for every such row of this dictionary — the regression checks it.)
  const VERB_FORM_KINDS = ["indicative","subjunctive","imperative","infinitive","infinitive-zu","participle"];
  // The verb-form rows of a word read from its own record: [form, lemma, tags] of each finite / infinite form.
  async function verbFormLinks(word) {
    const spelling = String(word).normalize("NFC").toLowerCase();
    const data = await record(spelling), rows = [];
    for (const [rawForm,rawLemma,rawTags] of data?.inflections || []) {
      const form = String(rawForm || "").normalize("NFC").toLowerCase(), lemma = String(rawLemma || "").normalize("NFC").toLowerCase();
      const tags = String(rawTags || "").split(",").filter(Boolean);
      // (a form of fewer than three letters is no verb form: the external table of amtshandeln has the stray
      // pieces st, et, en (St. Gallen, et cum spiritu → «amtshandeln · Präteritum»)
      if (form.length < 3 || form !== spelling || !/^[\p{L}\p{M}]+$/u.test(form) || !/^[\p{L}\p{M}]+$/u.test(lemma) ||
        tags.some(t => t === "auxiliary" || t.startsWith("error-")) || !tags.some(t => VERB_FORM_KINDS.includes(t))) continue;
      const value = [spelling,lemma,[...new Set(tags)].sort().join(",")];
      if (!rows.some(row => row[1] === value[1] && row[2] === value[2])) rows.push(value);
    }
    return rows;
  }
  // Several independent lookups of a step are started together and read in a fixed order — the results are the same as one
  // after another, failures surface at the same place.
  function startAll(keys, ask) {
    const pending = new Map();
    for (const key of keys) if (!pending.has(key)) { const p = ask(key); p.catch(() => {}); pending.set(key,p); }
    return pending;
  }
  // The lexical groups of the lemmas a verb form links to, with its form tags (the external verb card of a form).
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
  // Senses the reader never shows (coarse slang standing in for a name:
  // Johannes «penis», Petrus «large key»). A row applies only while its gloss still matches;
  // without the list every sense is shown.
  const hiddenSensesUrl = new URL("data/fallback-hidden-senses.json?v=20261022-nm-1", document.currentScript.src);
  let hiddenSensesPromise = null;
  // The hidden-sense list (senses the reader never shows), loaded once as a Map spelling → rows.
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
  // A word that is a personal name (Jürgen, Johannes, Bimbo,
  // Kalle) never shows its noun senses labelled slang / rude / colloquial — they stand in for the name and are hurtful
  // (Johannes «penis», Bimbo — a slur). Only personal names (not surnames or places: so, ja, Haus, Fuchs keep theirs);
  // «dated» alone does not hide (Händel «ссоры», Till). Never hidden: Mark «марка», Klause «келья», Michel.
  const personalName = /\b(?:given name|nickname for someone named)\b/iu;
  const hiddenLabels = new Set(["vulgar","obscene","offensive","derogatory","slur","ethnic","slang","colloquial","informal","familiar"]);
  const keepNameSenses = new Set(["mark","klause","michel"]);
  // Drop the slang / rude noun senses of a personal-name record (see above); keepNameSenses keep theirs.
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
  // Drop the hidden senses (and name slang) from the records of one part, in place.
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
  // One dictionary part (parts/NNNN.json), parsed, cleaned of hidden senses and kept in the bounded cache.
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

  // The record of one spelling from its part, or null.
  async function record(word) {
    const index = dictionaryPartition(word);
    observe('partition-cache', {cache:'dictionary',key:index,word,state:cacheState(cache,index),size:cache.size});
    const records = await dictionaryPart(index);
    return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
  }
  // The distinct meaning texts of a record in the dictionary's order.
  function meanings(data) {
    const ordered = [...(data?.senses || [])].sort((a, b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0] - b[0]);
    return [...new Set(ordered.map(row => row[3]))];
  }
  // The lemma named by a grammatical reference («plural of Haus», «past participle of gehen»), or null.
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
  // The lexical groups of a record by part of speech: meanings, labels, genders, reflexive and transitivity marks, spellings.
  function groupsFor(word, data) {
    observe('groups-build', {word});
    const byPos = new Map(), labelsByPos = new Map(), reflexiveByPos = new Map(), genderByPos = new Map(), transitivityByPos = new Map(), transitivityOfByPos = new Map();
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0]-b[0])) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) { byPos.set(pos, []); labelsByPos.set(pos, {}); reflexiveByPos.set(pos, {}); genderByPos.set(pos, {}); transitivityByPos.set(pos, new Set()); }
      byPos.get(pos).push(row[3]);
      // the gender of a noun sense (column 5: m / f / n, several — m:n)
      if (typeof row[5] === "string" && row[5] && !(row[3] in genderByPos.get(pos))) genderByPos.get(pos)[row[3]] = row[5];
      // usage labels of the sense (index 6) travel with its meaning text.
      if (Array.isArray(row[6]) && row[6].length) labelsByPos.get(pos)[row[3]] = [...row[6]];
      // a verb sense used with sich (column 8: acc / dat / opt) — read by meaning-display only
      // when sich is linked with the verb and our card has no field `reflexive`.
      if (["acc","dat","opt"].includes(row[7]) && !(row[3] in reflexiveByPos.get(pos))) reflexiveByPos.get(pos)[row[3]] = row[7];
      // the transitivity tags of the senses (column 9: transitive / intransitive / both), as a set
      // per part of speech — read only by the resolver's transitiveOnly
      if (["transitive","intransitive","both"].includes(row[8])) transitivityByPos.get(pos).add(row[8]);
      // (the same tag per meaning — the meaning choice with an object in the part)
      if (["transitive","intransitive","both"].includes(row[8])) { if (!transitivityOfByPos.has(pos)) transitivityOfByPos.set(pos, {}); if (!(row[3] in transitivityOfByPos.get(pos))) transitivityOfByPos.get(pos)[row[3]] = row[8]; }
    }
    // Auxiliary rows (haben: ~9 300, sein: ~1 500 "auxiliary of <verb>" links) never name a
    // lemma inside a sense, and comparing every sense with each of them cost seconds in browsers.
    const mappedLemmas = (data?.inflections || []).filter(row => !String(row[2] || "").split(",").includes("auxiliary")).map(row => row[1]);
    return [...byPos].map(([pos, values]) => {
      // Is a meaning text a grammatical reference to another lemma?
      const reference = value => !!referenceLemma(value) || /^inflection of\b/iu.test(value) || mappedLemmas.some(lemma =>
        value.toLowerCase().includes(` of ${lemma.toLowerCase()}`) &&
        /\b(?:present|past|preterite|participle|imperative|singular|plural|dative|accusative|genitive|nominative|infinitive|comparative|superlative)\b/iu.test(value));
      const hasReference = values.some(reference);
      const grammarTokens = new Set(["first","second","third","person","singular","plural","present","past","preterite","perfect","imperfect","imperative","indicative","subjunctive","participle","nominative","accusative","dative","genitive","infinitive","positive","comparative","superlative","masculine","feminine","neuter","definite","indefinite","weak","strong","mixed","all","case","gender","dependent","independent","subordinate","clause","zu"]);
      // Is a meaning text only a continuation of grammar words («first-person singular», «strong declension») after a reference?
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
      // the gender of each noun meaning, when the meanings have more than one gender (die Heide «heath»,
      // der Heide «heathen»): the resolver keeps the meanings of the gender its determiner agrees with
      const meaningGenders = pos === "noun" ? Object.fromEntries(meanings.map(m => [m,genderByPos.get(pos)[m]]).filter(([,g]) => typeof g === "string" && /^[mfn](?::[mfn])*$/u.test(g))) : {};
      const genderSet = new Set(Object.values(meaningGenders).flatMap(g => g.split(":")));
      // (the heading keeps the dictionary's own spelling — EU-Kommission, DNA-Test, SUV, not Eu-kommission / Suv) the written
      // form of the entry (entries[i][4].w), when it is this very word with capitals inside
      const fitsWord = w => typeof w === "string" && w.toLowerCase() === String(word).toLowerCase() && /\p{Lu}/u.test(w.slice(1));
      const entry = (data?.entries || []).find(e => fitsWord(e?.[4]?.w)), written = entry?.[4]?.w;
      // the other spellings the entry gives (alt: Gau beside GAU, Aids beside AIDS, Ufo beside UFO) — the resolver takes the one
      // the text uses; the entry may join two words (der Gau «shire» and der GAU)
      const spellings = written ? [...new Set([written,...(entry[4].alt || []).map(a => a?.[2]).filter(a => typeof a === "string" && a && a.toLowerCase() === written.toLowerCase())])] : [];
      return {word,pos,meanings,formNotes:notes,...(written ? {written} : {}),...(spellings.length > 1 ? {spellings} : {}),...(Object.keys(labels).length ? {labels} : {}),...(Object.keys(reflexive).length ? {reflexive} : {}),
        ...(noun ? {noun} : {}),...(genderSet.size > 1 ? {meaningGenders} : {}),...(transitivityByPos.get(pos)?.size ? {transitivity:[...transitivityByPos.get(pos)].sort()} : {}),
        ...(transitivityOfByPos.get(pos) ? {transitivityOf:Object.fromEntries(meanings.filter(m => m in transitivityOfByPos.get(pos)).map(m => [m,transitivityOfByPos.get(pos)[m]]))} : {})};
    });
  }
  // The article of an external noun and its
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
    // The spellings a declension cell gives (alternatives by «/», a leading number drops that many letters).
    const spell = cell => cell.split("/").filter(a => a !== "-").map(a => { const m = a.match(/^(\d*)(.*)$/u), n = Number(m[1] || 0);
      return (n ? lower.slice(0, -n) : lower) + m[2]; });
    const singular = new Set(), plural = new Set();
    for (const d of decls) d.split("|").forEach((cell, i) => spell(cell).forEach(f => (i < 4 ? singular : plural).add(f)));
    // the cases of each form by gender, from the declension of each gender (the slots: nominative,
    // accusative, dative, genitive — singular, then plural): eines Dachs is das Dach, not der Dachs «badger» (des Dachses)
    const CASES = ["nominative","accusative","dative","genitive"];
    const cases = {};
    const byGender = facts.flatMap(f => [...(typeof f.decl === "string" && /^[mfn]$/u.test(String(f.g || "")) ? [[f.g, f.decl]] : []),
      ...(Array.isArray(f.alt) ? f.alt.filter(a => /^[mfn]$/u.test(String(a?.[0] || "")) && typeof a?.[1] === "string") : [])]);
    for (const [g, d] of byGender) if (d.split("|").length === 8) d.split("|").forEach((cell, i) => spell(cell).forEach(f => {
      const slot = ((cases[g] ||= {})[f] ||= {singular:[], plural:[]})[i < 4 ? "singular" : "plural"];
      if (!slot.includes(CASES[i % 4])) slot.push(CASES[i % 4]);
    }));
    const adjectival = decls.some(d => d.split("|").slice(0, 4).some(cell => { const alts = cell.split("/").map(a => a.replace(/^\d+/u, ""));
      return alts.length > 1 && alts.some(a => /[rm]$/u.test(a)) && alts.some(a => /n$/u.test(a)); }));
    const marked = meaningGenders.filter(Boolean);
    let gender = null;
    if (marked.length) { const kinds = new Set(marked); gender = kinds.size === 1 && /^[mfn]$/u.test(marked[0]) ? marked[0] : null; }
    else { const kinds = new Set(facts.map(f => f.g).filter(Boolean)); gender = kinds.size === 1 && /^[mfn]$/u.test([...kinds][0]) ? [...kinds][0] : null; }
    // (a headword that is also a function word or a letter — Ach, Es, Du, Nein, Wenn, O, H — or a nominalized
    // adjective form (was Schönes, Neues) is no plain noun: no article; two letters or less — no article)
    const closed = (data?.senses || []).some(s => ["intj","pron","article","prep","conj","character","det","particle","postp","num"].includes(s[2]));
    const nominalized = (data?.senses || []).some(s => s[2] === "noun" && /^nominalization of\b/iu.test(String(s[3] || "")));
    const article = !adjectival && !closed && !nominalized && lower.length > 2 && gender ? {m:"der",f:"die",n:"das"}[gender] : null;
    return article || singular.size || plural.size ? {article, singular:[...singular], plural:[...plural], ...(Object.keys(cases).length ? {cases} : {})} : null;
  }
  // Evidence belongs to the clicked spelling, not to permanent dictionary cards.
  function noteReferencesLemma(note,lemma) {
    const text=note.toLowerCase(),marker=` of ${lemma.toLowerCase()}`,index=text.indexOf(marker);
    return index>=0&&/^(?:$|[\s:(“"])/u.test(text.slice(index+marker.length));
  }
  // The form tags a structured mapping gives this spelling, for the groups of its lemma.
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
  // The export stores most declined adjective forms (warzige,
  // bilaterale, schlenkerigere, arbeitsfähigster) only as a structured row
  // without any sense. A row with declension tags (strong/weak/mixed) and only
  // case, gender, number, degree tags links the spelling to an adjective; the
  // target must still be an explicit adjective headword.
  const adjectiveTags = new Set(['nominative','accusative','genitive','dative','singular','plural',
    'definite','indefinite','strong','weak','mixed','masculine','feminine','neuter','without-article','comparative','superlative']);
  // Is a structured row a declined form of an adjective (declension tags, a record without senses)?
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
  // Notes «declined form of X» for an adjective headword this sense-less spelling is a declined form of.
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
  // The form mappings of a record: its explicit grammatical references and the structured rows that may stand for one.
  function formMappings(word, data, direct) {
    // Some lossless export rows contain only a structured noun inflection,
    // with no textual sense to repeat that link. Case/number tags establish
    // a nominal relation; target lexical groups must still explicitly be nouns.
    const nounOnly = !(data?.senses || []).length;
    const nounTags = new Set(['nominative','accusative','genitive','dative','singular','plural',
      'definite','indefinite','strong','weak','mixed','masculine','feminine','neuter']);
    // Is a structured row a noun inflection (case / number tags) of this spelling of a noun-only record?
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
  // asLemma: the word is the lemma a form link named (geführt → führen). It is read as that
  // headword: when it has its own meanings in the linked part of speech, its own form links are not followed again — führen is
  // also the Konjunktiv II of fahren, and that reading belongs to the spelling führen, not to geführt / führt / führten.
  async function lexicalGroups(word, visited = new Set(), asLemma = null) {
    if (visited.has(word) || visited.size >= 4) return [];
    const next = new Set([...visited,word]), data = await record(word);
    const direct = groupsFor(word,data);
    // (only for verbs: a noun / adjective lemma keeps its links — Beteiligten → beteiligter, Alliierten — there the further link
    // keeps the masculine card next to the feminine one)
    const headword = !!asLemma && asLemma.has("verb") && direct.some(group => group.meanings.length && group.pos === "verb");
    const mappings = headword ? [] : formMappings(word,data,direct);
    const positions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
    structuredPositions(word,data,mappings,positions);
    const mapped = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(lemma => lexicalGroups(lemma,next,positions.size ? positions : null)))).flat();
    return [...direct.filter(group => group.meanings.length),...mapped.filter(group => !positions.size || positions.has(group.pos))];
  }
  // Regular weak forms of an external verb that the export lists
  // only as an adjective or not at all (betrachtete, erwähnte, verordnete). The
  // lemma must be an explicit verb headword; only spellings without any verb
  // reading are derived. Present 3rd sg / 2nd pl in -t is the same spelling as
  // the participle of verbs without ge- (erwähnt), so both are offered.
  const inseparablePrefixes = /^(?:be|emp|ent|er|ge|miss|ver|zer|hinter|über|unter|wider)/u;
  const separablePrefixes = ["zurück","vorbei","herum","heraus","herein","hinaus","hinein","weiter","zusammen","ab","an","auf","aus","bei","dar","ein","fest","fort","her","hin","los","mit","nach","vor","weg","zu"];
  const weakEndings = [["test",[["second-person","singular","past"]]],["ten",[["first-person","plural","past"],["third-person","plural","past"]]],
    ["tet",[["second-person","plural","past"]]],["te",[["first-person","singular","past"],["third-person","singular","past"]]]];
  // Weak-verb hypotheses of a spelling: {lemma, rows of form tags} for each weak ending it has.
  function weakHypotheses(word) {
    const w = String(word).normalize("NFC").toLowerCase(), result = [];
    // The infinitives a weak stem may have: stem + en, and stem + n after -el / -er.
    const lemmas = stem => [stem+"en",...(/(?:el|er)$/u.test(stem) ? [stem+"n"] : [])];
    // Record a weak-verb hypothesis for a stem (at least two letters), with an optional prefix.
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
  // A verb head of the Russian dictionary alone (überbauen, rezipieren,
  // enthäuten — no English record) confirms a participle hypothesis of a word the English dictionary does not know at all; its group
  // has no English meaning (the Russian one comes with the enrichment, as for the Russian-only separable verbs — abformen).
  async function russianVerb(lemma) {
    try { const r = await window.BibliothekRussianTranslations?.lookup(lemma,"verb"); return !!r?.meanings?.length; } catch (_) { return false; }
  }
  // The groups of the weak-verb hypotheses that an explicit verb headword confirms.
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
          // (a past participle carries «past» like the dictionary's own rows — gebaut —; without it the reader would take it for a
          // present participle and built no Perfekt / passive group)
          tense:tags.find(t => ["present","past"].includes(t) && (!tags.includes("participle") || t === "past")) || null,
          mood:tags.includes("participle") ? null : "indicative",source:"regular-weak-form"}))});
    }
    return groups;
  }
  // The groups, plus weak-verb groups when none of them is a verb.
  async function withWeakVerb(word, groups) {
    if (groups.some(g => g.pos === "verb")) return groups;
    try { return [...groups,...await weakVerbGroups(word,!groups.length)]; } catch (_) { return groups; }
  }
  // A word the dictionaries do not know that is a particle + a recorded participle of a simple verb, where
  // particle + verb is a verb of the separable index (Russian-only ones too): ab + geformt → abformen, ein + gesungen → einsingen
  // (strong verbs too — the participle is the simple verb's recorded one, nothing is guessed).
  let separableByPrefix = null;
  // Groups of a particle + recorded participle of a simple verb whose joined verb is in the separable index (ab + geformt → abformen).
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
  // A lowercase spelling the export does not know at all
  // (zypriotischen, warzigeres) may be a regular declined form of an adjective
  // headword: -e/-en/-em/-er/-es, also after a comparative -er or a superlative
  // -st/-est. Only an explicit adjective headword confirms a hypothesis; the
  // stripped word is never offered as a noun or a verb (Rose -> Ros, oben -> ob).
  const adjectiveEndings = ["en","em","er","es","e"];
  // Adjective-ending hypotheses of a lowercase spelling: {base, ending, degree}.
  function adjectiveHypotheses(word) {
    const w = String(word).normalize("NFC").toLowerCase(), result = [];
    // Record an adjective hypothesis: base, ending and degree (a base of at least three letters).
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
  // The groups of the adjective hypotheses that an explicit adjective headword confirms.
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
  // The groups of a word: its own records, then (lowercase only) weak verbs, participles and adjective endings.
  async function lookup(word, issues = null) {
    const groups = await lookupGroups(word,issues);
    // Lowercase spellings only: a capital inside a sentence is a noun (Fronten, Rechte).
    if (!/^\p{Ll}/u.test(String(word).normalize("NFC").trim())) return groups;
    if (!groups.length) { try { const separable = await separableParticipleGroups(word); if (separable.length) return separable; } catch (_) {} }
    const withVerb = await withWeakVerb(word,groups);
    if (withVerb.length) return withVerb;
    try { return await adjectiveEndingGroups(word); } catch (_) { return withVerb; }
  }
  // The groups of the records of a spelling (as written and in lower case) and of the forms they link to.
  async function lookupGroups(word, issues = null) {
    observe('lookup', {word});
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLowerCase()])];
    // Both spellings at once (Der / der, Zum / zum: the capital one mostly has no record). For a word of the sentence the
    // warm-up has requested both already, so the extra part costs nothing there.
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
        const mapped = await lexicalGroups(lemma,new Set([candidate]),describedPositions.size ? describedPositions : null);
        // A verb inflection must not inherit unrelated noun senses of its lemma.
        // A form of an initialism written in capitals (LIFe, plural of LIF — key «life») only for a spelling with a
        // capital after the first letter: the keys are lower case, so Life / life of the text would read as LIFe
        return mapped.filter(group => (!describedPositions.size || describedPositions.has(group.pos)) &&
          !(typeof group.written === "string" && [group.written,...(group.spellings || [])].every(sp => /^\p{Lu}{2,}$/u.test(sp)) && !/\p{Lu}/u.test(String(word).normalize("NFC").trim().slice(1))));
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
        if (group.transitivity) target.transitivity = [...new Set([...(target.transitivity || []),...group.transitivity])].sort();
        if (group.transitivityOf) target.transitivityOf = {...(target.transitivityOf || {}),...group.transitivityOf};
        if (group.noun && !target.noun) target.noun = group.noun;
        if (group.meaningGenders) target.meaningGenders = {...(target.meaningGenders || {}),...group.meaningGenders};
        if (group.written && !target.written) target.written = group.written;
        if (group.spellings && !target.spellings) target.spellings = group.spellings;
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
  // Order of the record's own senses between an ordinary noun / adjective and a name of this
  // spelling. True when the ordinary reading comes first (wolf, müller, rapunzel), false when the name comes first
  // (jürgen, johannes, mars, schnabel), null without a name. Spelling variants, clippings and abbreviations
  // (obsolete form of Dill, initialism of …) are no ordinary reading.
  const variantGloss = /^(?:(?:obsolete|archaic|dated|alternative|apocopic|euphemistic|eye-dialect|nonstandard|misspelling)\b[^:]*?\b(?:form|spelling) of|clipping of|ellipsis of|initialism of|abbreviation of|acronym of|shorthand of|short for)\b/iu;
  // true when the ordinary reading of the spelling comes before its name, false when the name comes first, null without a name.
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
  // A masculine noun whose plural in -(e)n is only a plural: the record of the
  // stem + s / es is «genitive singular of <lemma>» (a strong singular: des Staates, des Investors, des Schmerzes) and the record of the
  // form calls it a plural with no singular reading (Staaten «plural of Staat»; not Menschen, Patienten, Namen, Nachbarn — weak or mixed,
  // «accusative/dative/genitive singular of …»). False when a record is missing or cannot be read.
  async function strongEnPlural(form, lemma) {
    const f = String(form || "").normalize("NFC").toLowerCase(), l = String(lemma || "").normalize("NFC").toLowerCase();
    if (!/n$/u.test(f) || f === l || !/^\p{L}+$/u.test(l)) return false;
    // The noun senses of a spelling's record (lowercase), or null when the record cannot be read.
    const nounSenses = async w => { let d; try { d = await record(w); } catch (_) { return null; } return (d?.senses || []).filter(s => s[2] === "noun").map(s => String(s[3] || "").trim().toLowerCase()); };
    const [s1, s2, own] = await Promise.all([nounSenses(l + "s"), nounSenses(l + "es"), nounSenses(f)]);
    if (!s1 || !s2 || !own) return false;
    const genitive = [...s1, ...s2].some(x => x.startsWith(`genitive singular of ${l}`) && !/^\p{L}/u.test(x.slice(`genitive singular of ${l}`.length)));
    return genitive && own.some(x => /\bplural\b/u.test(x)) && !own.some(x => /\bsingular\b/u.test(x));
  }
  // The meaning texts of a spelling's record.
  async function lookupEntry(word) { return meanings(await record(word)); }
  // The lemma a spelling note names («alternative spelling of X», «formerly standard spelling of X»), or null.
  function spellingReference(value) {
    const text = String(value || '').trim();
    const direct = /^(?:(?:Switzerland and Liechtenstein )?standard|alternative|obsolete|archaic|dated) spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*)\.?$/iu.exec(text);
    const former = /^Formerly standard spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*) which was deprecated in the spelling reform \(Rechtschreibreform\) of \d{4}\.?$/iu.exec(text);
    return (direct || former)?.[1] || null;
  }
  // Display enrichment only: keep the original lemma, POS, identity and rank.
  async function spellingTranslation(word, pos, values) {
    const references = [], unresolved = [];
    // Follow the spelling notes of the meanings to their targets (at most once per word).
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
  // Verbs whose Perfekt the export forms with haben / sein
  // (structured "auxiliary" rows of the haben and sein records).
  const auxiliarySets = new Map();
  // haben / sein — the auxiliaries the export gives a verb's Perfekt, from the auxiliary records.
  async function perfectAuxiliaries(lemma) {
    const key = String(lemma).normalize("NFC").toLowerCase(), result = [];
    // Both records are requested at once (one network wait, not two) and checked in a fixed order.
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
    // A verb of the separable index without auxiliary rows of its own (abformen, einsingen — Russian-only) takes those
    // of its simple verb (formen, singen): hat … abgeformt.
    if (!result.length) {
      try {
        const row = (await separableEntries()).find(r => r[0] === key);
        if (row && key.startsWith(row[1]) && key.length > row[1].length) {
          const base = key.slice(row[1].length);
          for (const auxiliary of ["haben","sein"]) if ((await auxiliarySets.get(auxiliary)).has(base)) result.push(auxiliary);
        }
      } catch (_) { /* no index: no auxiliary */ }
    }
    return result;
  }
  // Warm-up for the words of a sentence. Lookups walk the
  // words and their hypotheses one by one, so on a phone every part file would be a
  // separate wait. The warm-up starts the same part requests at once (the same
  // promises record() and verbFormLinks() would create later) and follows the
  // links of the records it finds: the lemma of a form, the lemmas of a verb
  // form, weak-verb and adjective-ending hypotheses. It returns nothing and no
  // lookup reads anything from it, so results are those of the lookups alone;
  // a failed request is dropped from the cache and requested again by the next lookup.
  const lowerSpelling = word => String(word).normalize("NFC").toLowerCase();
  // The record of a spelling if its part is loaded or loads, else null (no error).
  async function peek(word) {
    try {
      const records = await dictionaryPart(dictionaryPartition(word));
      return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
    } catch (_) { return null; }
  }
  // The lemmas a record's form mappings link to (diagnostics silent).
  function linkedLemmas(word, data) {
    silent = true;
    try { return [...new Set(formMappings(word,data,groupsFor(word,data)).map(row => row[1]))]; }
    catch (_) { return []; } finally { silent = false; }
  }
  // Warm the parts of the lemmas a record links to (up to four steps).
  async function warmLexical(word, visited) {
    if (visited.has(word) || visited.size >= 4) return;
    const data = await peek(word);
    if (!data) return;
    const next = new Set([...visited,word]);
    await Promise.all(linkedLemmas(word,data).map(lemma => warmLexical(lemma,next)));
  }
  const warming = new Map();
  // Warm one word: its part, its hypotheses and the records they link to; one promise per spelling.
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
      // (a word without a record has no verb-form rows either: they are read from its record)
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
  // Warm all words of a sentence.
  function warm(words) { return Promise.all([...new Set(words)].map(warmWord)).then(() => {}); }
  // Any record of the spelling, also one with only a variant note (beileibe = bei Leibe) — a whole word
  // known to the dictionary is never explained by its parts.
  async function hasRecord(word) { try { return !!(await record(String(word || "").normalize("NFC").toLowerCase())); } catch (_) { return false; } }
  // A record that only says «diminutive of X» (täschchen — tasche, geisslein — geiss) shows no meaning of its own;
  // the base it names, for the diminutive card of the resolver (word formation).
  async function diminutiveBase(word) {
    try {
      const data = await record(String(word || "").normalize("NFC").toLowerCase());
      const rows = (data?.inflections || []).filter(row => String(row[2] || "").split(",").includes("diminutive"));
      const bases = [...new Set(rows.map(row => row[1]))];
      return bases.length === 1 ? bases[0] : null;
    } catch (_) { return null; }
  }
  // «form of X» by the Kaikki link — the record's own row [form, base, tags]: a diminutive, a
  // feminine, an alternative (obsolete / dated / archaic, colloquial / regional, apocopic) form. One function for all kinds; only when
  // every meaning of the record in this part of speech is a pointer to that base (Mäuslein «diminutive of Maus», Mörsel «obsolete form
  // of Mörser», nich, Krämerin «female equivalent of Krämer»): a record with a meaning of its own keeps it. Not an abbreviation (ma →
  // Magistratsabteilung) and not a form of the word (plural, a case, a person). Several bases — the one with a record in the same part of
  // speech (gülden → golden, not gilden / gilten); still several — none. → {base, kind} or null; kind: diminutive | feminine |
  // obsolete | colloquial | short | form.
  const FORM_OF_GRAMMAR = /^(?:plural|singular|nominative|accusative|genitive|dative|masculine|neuter|strong|weak|mixed|definite|indefinite|first-person|second-person|third-person|present|preterite|past|participle|imperative|infinitive|subjunctive-i|subjunctive-ii|indicative|comparative|superlative|positive|predicative|attributive|without-article|subordinate-clause|zu|multiword-construction)$/u;
  // the English meanings of a word in one part of speech (the record's groups) — for the check of a shared meaning
  async function meaningsOf(word, pos) {
    try { return [...new Set((await lexicalGroups(String(word || "").normalize("NFC").toLowerCase())).filter(group => group.pos === pos).flatMap(group => group.meanings || []).map(String))]; }
    catch (_) { return []; }
  }
  // The base a «form of X» record points to: {base, kind, en} or null (the rule above FORM_OF_GRAMMAR).
  async function formOfLink(word, pos) {
    try {
      const key = String(word || "").normalize("NFC").toLowerCase(), data = await record(key);
      if (!data) return null;
      const senses = (data.senses || []).filter(row => row[2] === pos);
      const rows = (data.inflections || []).filter(row => row[0] === key && row[1] && row[1] !== key).map(row => ({base:row[1], tags:String(row[2] || "").split(",").filter(Boolean)}))
        .filter(row => !row.tags.includes("abbreviation") && !row.tags.includes("initialism") &&
          (row.tags.includes("diminutive") || row.tags.includes("alternative") || row.tags.length === 1 && row.tags[0] === "feminine") &&
          !row.tags.some(tag => tag !== "feminine" && tag !== "neuter" && FORM_OF_GRAMMAR.test(tag)));
      if (!senses.length) return null;
      // no Kaikki link — the English text as the spare: every meaning «alternative / obsolete / … spelling of X» of
      // one X (spellingReference); then the same display (the base's text in the popup language)
      if (!rows.length) {
        // (and «apocopic / alternative / obsolete … form of X» without a link — Treu «apocopic form of Treue»)
        const formReference = gloss => { const m = String(gloss || "").trim().match(/^(?:apocopic|alternative|obsolete|archaic|dated|rare) form of ([\p{L}\p{M}-]+)/iu); return m ? m[1] : null; };
        const targets = senses.map(row => spellingReference(row[3]) || formReference(row[3]));
        if (targets.some(t => !t)) return null;
        const keys = [...new Set(targets.map(t => t.normalize("NFC").toLowerCase()))];
        if (keys.length !== 1 || keys[0] === key || /\s/u.test(keys[0])) return null;
        const kind = senses.some(row => /^(?:obsolete|archaic|dated|formerly standard)\b/iu.test(String(row[3] || "").trim())) ? "obsolete" :
          senses.some(row => /^apocopic\b/iu.test(String(row[3] || "").trim())) ? "short" : "form";
        rows.push({base:keys[0], tags:[], kind});
      }
      let bases = [...new Set(rows.map(row => row.base))];
      if (bases.length > 1) {
        const same = [];
        for (const base of bases) { const other = await record(base); if ((other?.senses || []).some(row => row[2] === pos)) same.push(base); }
        bases = same;
      }
      // (a base of several words — wachliegen → wach liegen — is an expression, not a word to point to)
      if (bases.length !== 1 || /\s/u.test(bases[0])) return null;
      const base = bases[0], tags = rows.filter(row => row.base === base).flatMap(row => row.tags);
      // (every meaning names the base: «diminutive of Maus», «pronunciation spelling of nicht, representing …»)
      const named = new RegExp(`(?:^|\\s)of ${base.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?![\\p{L}\\p{M}])`, "iu");
      if (!senses.every(row => named.test(String(row[3] || "")))) return null;
      // (an abbreviation / initialism / clipping by its meaning — WSL «abbreviation of wahrscheinlich» — is no form of the word)
      if (senses.some(row => /^(?:abbreviation|initialism|acronym|clipping)\b/iu.test(String(row[3] || "")))) return null;
      const kind = rows.find(row => row.kind)?.kind || (tags.includes("diminutive") ? "diminutive" : tags.includes("feminine") && !tags.includes("alternative") ? "feminine" :
        tags.some(tag => /^(?:obsolete|dated|archaic)$/u.test(tag)) ? "obsolete" :
        tags.some(tag => /^(?:colloquial|informal|regional|dialectal|nonstandard|pronunciation-spelling)$/u.test(tag)) ? "colloquial" :
        tags.includes("apocopic") ? "short" : "form");
      // (the base's English meanings — the text of an English popup and of a language without the base's text)
      let en = [];
      try { en = [...new Set((await lexicalGroups(base)).filter(group => group.pos === pos).flatMap(group => group.meanings || []).map(String))]; } catch (_) { en = []; }
      // (the base must be a word of its own, not another form or pointer — Wär → wäre, ND → net: its meanings are only «… of X»)
      const baseRecord = await record(base);
      const baseSenses = (baseRecord?.senses || []).filter(row => row[2] === pos).map(row => String(row[3] || ""));
      // Is a meaning only a pointer to another word («… form of X», «diminutive of X», ending in a colon)?
      const pointer = x => /:$/u.test(x) || /^[^,;]*\b(?:form|spelling|inflection|singular|plural|person|subjunctive|participle|imperative|tense|diminutive|equivalent|contraction|clipping|abbreviation|synonym)\b[^,;]* of \S/iu.test(x);
      if (baseSenses.length && baseSenses.every(pointer)) return null;
      return {base:pos === "noun" || pos === "name" ? base.charAt(0).toUpperCase() + base.slice(1) : base, kind, en};
    } catch (_) { return null; }
  }
  // The groups of a word with the issues met on the way (the resolver's fact lookup).
  async function lookupFacts(word) { const issues = []; return {groups:await lookup(word,issues),issues}; }
  // May the word be a verb form the reader can read — a recorded form (the filter), or a weak form
  // the lookup builds itself (weakHypotheses: vorankündigtet, nopptest) whose infinitive is in the filter. The filter holds
  // only recorded forms; a built form is checked by its infinitive.
  async function mayBeVerbForm(word) {
    if (await mayBeVerb(word)) return true;
    for (const hypothesis of weakHypotheses(word)) if (await mayBeVerb(hypothesis.lemma)) return true;
    return false;
  }
  window.DeutschFallbackDictionary = {nounClasses,strongEnPlural,mayBeVerbForm,wordParts,hasRecord,diminutiveBase,formOfLink,meaningsOf,nounGender,nameReadingOrder,lookupFacts,warm,perfectAuxiliaries,verbPrepositions,wordClasses,wordClassPolarity,separableFormEvidence,auxiliaryInflections,lookup,lookupEntry,separableEntries,mayBeVerb,spellingTranslation,superlativeEntries};
})();
