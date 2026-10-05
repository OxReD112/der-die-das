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
  async function lookup(word) {
    // Exact stored key first, then the reader's normalized lowercase candidate.
    const candidates = [...new Set([String(word).trim(), String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE")])];
    for (const candidate of candidates) {
      const data = await record(candidate);
      if (!data) continue;
      const lemmas = [...new Set((data.inflections || []).map(row => row[1]))];
      const groups = await Promise.all(lemmas.map(async lemma => ({word: lemma, meanings: meanings(await record(lemma))})));
      const usable = groups.filter(group => group.meanings.length);
      // Preserve direct senses when mappings have no usable lemma definitions.
      if (usable.length) return usable;
      const direct = meanings(data);
      if (direct.length) return [{word: candidate, meanings: direct}];
    }
    return [];
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  window.DeutschFallbackDictionary = {lookup, lookupEntry};
})();
