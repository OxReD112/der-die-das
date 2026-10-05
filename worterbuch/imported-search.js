/* Search index stays separate from the application's own dictionary. */
(() => {
  "use strict";
  const url = new URL("../open%20data/dictionary-de-autocomplete/words.json", document.currentScript.src);
  const normalize = word => String(word).trim().normalize("NFC").toLocaleLowerCase("de-DE");
  let index = null, pending = null;
  function load() {
    if (index) return Promise.resolve();
    if (pending) return pending;
    pending = fetch(url).then(response => {
      if (!response.ok) throw new Error("Imported word index unavailable");
      return response.json();
    }).then(words => {
      if (!Array.isArray(words) || !words.every(word => typeof word === "string")) throw new Error("Invalid imported word index");
      index = words.map(word => ({word, key:normalize(word)}));
      index.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    }).catch(error => { pending = null; throw error; });
    return pending;
  }
  function search(query, excluded, limit = 12) {
    const key = normalize(query);
    if (!index || !key) return [];
    let low = 0, high = index.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (index[middle].key < key) low = middle + 1;
      else high = middle;
    }
    const matches = [], seen = new Set();
    for (let i = low; i < index.length && index[i].key.startsWith(key) && matches.length < limit; i++) {
      const item = index[i];
      if (excluded.has(item.key) || seen.has(item.key)) continue;
      seen.add(item.key);
      matches.push({word:item.word, type:"imported"});
    }
    return matches;
  }
  window.DeutschImportedSearch = {load, search};
})();
