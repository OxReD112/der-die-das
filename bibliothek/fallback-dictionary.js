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
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0))) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) byPos.set(pos, new Set());
      byPos.get(pos).add(row[3]);
    }
    return [...byPos].map(([pos, values]) => ({ word, pos, meanings:[...values] }));
  }
  async function lookup(word) {
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE")])];
    for (const candidate of candidates) {
      const data = await record(candidate);
      if (!data) continue;
      const lemmas = [...new Set((data.inflections || []).map(row => row[1]))];
      const groups = (await Promise.all(lemmas.map(async lemma => groupsFor(lemma, await record(lemma))))).flat();
      // Keep direct lexical meanings too; a spelling may also be an inflected form.
      const direct = groupsFor(candidate, data).filter(group => !lemmas.length ||
        (data.senses || []).some(row => (row[2] || "") === group.pos && !lemmas.some(lemma => row[3].includes(` of ${lemma}`))));
      const usable = [...groups, ...direct];
      if (usable.length) return usable.filter((g,i,all) => all.findIndex(x => x.word === g.word && x.pos === g.pos) === i);
      // Definitions of a form are useful for lookup but cannot establish a lemma.
      if (meanings(data).length) return [{word:candidate, pos:"", meanings:meanings(data), unresolved:true}];
    }
    return [];
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  window.DeutschFallbackDictionary = {lookup, lookupEntry};
})();
