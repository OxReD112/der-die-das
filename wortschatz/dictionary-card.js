/* Shared Wörterbuch → Wortschatz card fields for dictionary and reading imports. */
(() => {
  "use strict";
  function create(item, lang = window.DeutschTranslation?.getLang?.() || "en") {
    const aliases={Nomen:"noun",Substantiv:"noun",Verb:"verb",Adjektiv:"adjective",Adverb:"adverb",Konjunktion:"conjunction",Pronomen:"pronoun"};
    item={...item,type:aliases[item.type] || item.type};
    const word = String(item.word || item.infinitive || "").trim();
    const base = item.type === "noun" ? [item.article, word].filter(Boolean).join(" ") : word;
    let grammar = "";
    if (item.type === "noun" && item.plural_only) grammar = base + " ⋅ nur im Plural";
    else if (item.type === "noun" && (!item.plural || String(item.plural).trim() === "—")) grammar = base + " ⋅ ohne Plural";
    else if (item.type === "noun")
      grammar = base + " ⋅ " + String(item.plural).split(/\s*,\s*/).map(form => "die " + form.replace(/^(?:der|die|das)\s+/i, "")).join(", ");
    else if (item.type === "verb" && item.perfect_form) grammar = item.perfect_form;
    else if (item.type === "adjective" && (item.comparative || item.superlative))
      grammar = [item.comparative, item.superlative].filter(Boolean).join(" · ");
    const pos = ({ noun: "Substantiv", verb: "Verb", adjective: "Adjektiv" })[item.type] || "Andere";
    const candidates = new Set([word.toLocaleLowerCase("de-DE")]);
    const addForms = value => {
      if (typeof value === "string") value.split(/[\s,;·!]+/).filter(Boolean).forEach(part => candidates.add(part.toLocaleLowerCase("de-DE")));
      else if (value && typeof value === "object") Object.values(value).forEach(addForms);
    };
    addForms(item.type === "pronoun" ? item.search_forms : item.forms);
    addForms(item.lookup_forms);
    const sentence = String(item.example_de || "");
    const marked = sentence.replace(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu, token => {
      const key = token.toLocaleLowerCase("de-DE");
      if (!candidates.has(key)) return token;
      candidates.delete(key);
      return "{{c1::" + token + "}}";
    });
    const translatedValue = (ru, en) => lang === "ru" ? ru || en || "" : en || ru || "";
    return {
      sentence: marked,
      translation: translatedValue(item.translation_ru, item.translation_en),
      sentenceTranslation: translatedValue(item.example_ru, item.example_en),
      base,
      grammar,
      pos
    };
  }

  window.WortschatzDictionaryCard=Object.freeze({create});
})();
