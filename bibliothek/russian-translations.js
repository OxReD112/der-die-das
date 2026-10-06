/* Translation enrichment only: never creates or ranks lemma candidates. */
(() => {
  "use strict";
  const base = new URL("../open%20data/dictionary-de-ru-json/", document.currentScript.src);
  const cache = new Map();
  const posAliases = {Verb:"verb",Nomen:"noun",Adjektiv:"adj",Adverb:"adv",Pronomen:"pron",Konjunktion:"conj",
    adjective:"adj",adverb:"adv",pronoun:"pron",conjunction:"conj"};
  const posOf = value => posAliases[value] || value;
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function records(word) {
    const index = partition(word);
    if (!cache.has(index)) {
      const request = fetch(new URL(`parts/${String(index).padStart(4,"0")}.json`,base))
        .then(response => {
          if (!response.ok) throw new Error("Russian translations unavailable");
          return response.json();
        }).then(data => {
          if (data.format_version !== 1 || data.partition !== index || !data.records || typeof data.records !== "object")
            throw new Error("Invalid Russian translation partition");
          return data.records;
        }).catch(error => { cache.delete(index); throw error; });
      cache.set(index,request);
    }
    const data = await cache.get(index);
    return Object.prototype.hasOwnProperty.call(data,word) ? data[word] : [];
  }
  async function lookup(lemma, partOfSpeech) {
    const word = String(lemma || "").normalize("NFC").trim(), pos = posOf(partOfSpeech);
    if (!word || !pos) return null;
    // English noun keys are often lowercase. Only nouns may use an initial
    // capital alias; never casefold the entire Russian dictionary or merge POS.
    const spellings = [...new Set(pos === "noun"
      ? [word.charAt(0).toLocaleUpperCase("de-DE") + word.slice(1),word]
      : [word,word.toLocaleLowerCase("de-DE")])];
    for (const spelling of spellings) {
      const matched = (await records(spelling)).filter(row => row.word === spelling && row.pos === pos);
      const entries = matched.map(row => ({recordId:row.record_id,word:row.word,pos:row.pos,sourceUrl:row.source_url,
        senses:row.senses.filter(s => s.display_status === "translation" && Array.isArray(s.data?.glosses))
          .map(s => ({senseIndex:s.sense_index,sourceId:s.data.id,glosses:s.data.glosses.filter(g => typeof g === "string" && g.trim())}))
          .filter(s => s.glosses.length)})).filter(row => row.senses.length);
      if (entries.length) return {language:"ru",source:"Russian Wiktionary / Kaikki.org",entries,
        meanings:[...new Set(entries.flatMap(row => row.senses.flatMap(s => s.glosses)))]};
    }
    return null;
  }
  async function enrich(resolution, language) {
    if (language !== "ru") return resolution;
    const pending = new Map();
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.translation?.ru).map(async candidate => {
      const key = JSON.stringify([candidate.lemma,posOf(candidate.pos)]);
      if (!pending.has(key)) pending.set(key,lookup(candidate.lemma,candidate.pos));
      try {
        const result = await pending.get(key);
        if (result) {
          candidate.translation = {...candidate.translation,ru:result.meanings.join("; ")};
          candidate.russianTranslation = result;
        }
      } catch (_) {
        // An optional translation failure cannot turn a resolved English word
        // into a lookup failure or alter a saved choice.
        candidate.russianTranslationError = "unavailable";
      }
    }));
    return resolution;
  }
  window.BibliothekRussianTranslations = Object.freeze({lookup,enrich});
})();
