/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  const base = new URL("../open%20data/dictionary-de-json/", document.currentScript.src);
  const cache = new Map();
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function record(word) {
    const index = partition(word);
    if (!cache.has(index)) {
      const promise = fetch(new URL(`parts/${String(index).padStart(4, "0")}.json`, base))
        .then(response => {
          if (!response.ok) throw new Error("Fallback dictionary unavailable");
          return response.json();
        }).then(data => {
          if (data.format_version !== 1 || data.partition !== index) throw new Error("Invalid dictionary partition");
          return data.records;
        }).catch(error => { cache.delete(index); throw error; });
      cache.set(index, promise);
    }
    const records = await cache.get(index);
    return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
  }
  function meanings(data) {
    const ordered = [...(data?.senses || [])].sort((a, b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0] - b[0]);
    return [...new Set(ordered.map(row => row[3]))];
  }
  function groupsFor(word, data) {
    const byPos = new Map();
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0]-b[0])) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(row[3]);
    }
    const mappedLemmas = (data?.inflections || []).map(row => row[1]);
    return [...byPos].map(([pos, values]) => {
      const reference = value => /^inflection of\b/iu.test(value) || mappedLemmas.some(lemma =>
        value.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`) &&
        /\b(?:present|past|preterite|participle|imperative|singular|plural|dative|accusative|genitive|nominative|infinitive|comparative|superlative)\b/iu.test(value));
      const hasReference = values.some(reference);
      const grammarTokens = new Set(["first","second","third","person","singular","plural","present","past","preterite","perfect","imperfect","imperative","indicative","subjunctive","participle","nominative","accusative","dative","genitive","infinitive","positive","comparative","superlative","masculine","feminine","neuter","definite","indefinite","weak","strong","dependent","independent","subordinate","clause","zu"]);
      const continuation = value => {
        const tokens = value.toLowerCase().split(/[\s,;:/().-]+/u).filter(Boolean);
        return hasReference && tokens.length > 0 && tokens.every(token => grammarTokens.has(token));
      };
      const notes = [...new Set(values.filter(value => reference(value) || continuation(value)))];
      return {word,pos,meanings:[...new Set(values.filter(value => !notes.includes(value)))],formNotes:notes};
    });
  }
  async function lookup(word) {
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE")])];
    for (const candidate of candidates) {
      const data = await record(candidate);
      if (!data) continue;
      const direct = groupsFor(candidate,data);
      // The export also contains auxiliary relations and malformed form mappings.
      // Only grammatical references support resolving this spelling to another lemma.
      const mappings = (data.inflections || []).filter(row =>
        !String(row[2] || "").split(",").some(tag => tag === "auxiliary" || tag.startsWith("error-")) &&
        direct.some(group => group.formNotes.some(note =>
          note.toLocaleLowerCase("de-DE").includes(` of ${String(row[1]).toLocaleLowerCase("de-DE")}`))));
      const describedPositions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
      const groups = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(async lemma => {
        const mapped = groupsFor(lemma,await record(lemma));
        // A verb inflection must not inherit unrelated noun senses of its lemma.
        return mapped.filter(group => !describedPositions.size || describedPositions.has(group.pos));
      }))).flat();
      const usable = [...groups,...direct].filter(group => group.meanings.length);
      const notes = direct.filter(group => group.formNotes.length).map(group => ({
        kind:"form-note",word:candidate,pos:group.pos,meanings:group.formNotes,
        lemmas:[...new Set(mappings.map(row => row[1]))]
      }));
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
    return [];
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  window.DeutschFallbackDictionary = {lookup, lookupEntry};
})();
