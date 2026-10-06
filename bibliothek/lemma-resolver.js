/* Resolve only dictionary-backed forms. No suffix stripping or context guesses. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const posMap = { adj:"Adjektiv", adv:"Adverb", conj:"Konjunktion", pron:"Pronomen", noun:"Nomen", verb:"Verb", adjective:"Adjektiv", adverb:"Adverb", conjunction:"Konjunktion", pronoun:"Pronomen" };
  function create(entries, fallback) {
    const forms = new Map(), lemmas = new Map(), byId = new Map(entries.map(entry => [String(entry.id),entry]));
    function add(map, form, entry) {
      const key = norm(form);
      if (!key) return;
      const matches = map.get(key) || [];
      if (!matches.some(item => item.id === entry.id)) matches.push(entry);
      map.set(key, matches);
    }
    for (const entry of entries) {
      add(lemmas, entry.word, entry); add(forms, entry.word, entry);
      for (const form of entry.search_forms || []) add(forms, form, entry);
      if (entry.type === "Nomen" && entry.plural && entry.plural !== "—") {
        for (const plural of entry.plural.split(/\s*,\s*/)) {
          add(forms, plural, entry);
          if (/^[\p{L}\p{M}]+$/u.test(plural) && !/[ns]$/iu.test(plural)) add(forms, plural + "n", entry);
        }
      }
      if (entry.type === "Verb") {
        for (const group of Object.values(entry.forms || {})) {
          for (const form of Object.values(group || {})) {
            // Do not index a separated verb's stem as the whole verb.
            const clean = String(form).replace(/[.!?]+$/g, "").trim();
            if (/^[\p{L}\p{M}]+$/u.test(clean)) add(forms, clean, entry);
          }
        }
        const participle = String(entry.perfect_form || "").trim().split(/\s+/).pop();
        if (participle) add(forms, participle, entry);
      }
    }
    const mainCandidate = item => ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item });
    async function resolve(word) {
      const exact = forms.get(norm(word)) || [];
      let candidates = exact.map(mainCandidate), error = null, unresolvedMeanings = [];
      if (!exact.length) {
        try {
          for (const group of await fallback.lookup(word)) {
            if (group.unresolved) { unresolvedMeanings.push(...group.meanings); continue; }
            const main = (lemmas.get(norm(group.word)) || []).filter(item => !group.pos || item.type === (posMap[group.pos] || group.pos));
            if (main.length) candidates.push(...main.map(mainCandidate));
            else candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings});
          }
        } catch (e) { error = e; }
      }
      candidates = candidates.filter((c,i,all) => all.findIndex(x => window.BibliothekVocabulary.identity(x) === window.BibliothekVocabulary.identity(c)) === i);
      return { form:word, status:candidates.length === 1 ? "resolved" : candidates.length ? "ambiguous" : "unresolved", candidates, selected:candidates.length === 1 ? candidates[0] : null, unresolvedMeanings, error };
    }
    return Object.freeze({ resolve, entry:id => byId.get(String(id)) || null, match:word => (forms.get(norm(word)) || []).map(mainCandidate) });
  }
  window.BibliothekLemmaResolver = Object.freeze({ create });
})();
