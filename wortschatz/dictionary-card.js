/* Shared Wörterbuch → Wortschatz card fields for dictionary and reading imports. */
(() => {
  "use strict";
  const CODES = Object.freeze({
    MISSING: "DICTIONARY_ENTRY_MISSING",
    EXCLUDED: "DICTIONARY_ENTRY_EXCLUDED",
    INVALID: "DICTIONARY_CLOZE_INVALID"
  });

  function problem(item, code, reason) {
    return {code, dictionaryId: item?.id ?? null,
      base: String(item?.word || item?.infinitive || "").trim(), reason};
  }

  // Shared eligibility check: no fallback to forms or book context.
  function check(item) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return {available: false, error: problem(item, CODES.MISSING, "Dictionary entry is missing")};
    if (item.wortschatz_excluded === true)
      return {available: false, error: problem(item, CODES.EXCLUDED, "Entry is excluded from Wortschatz")};
    const invalid = reason => ({available: false, error: problem(item, CODES.INVALID, reason)});
    const cloze = item.example_cloze;
    if (typeof cloze !== "string" || !cloze.trim()) return invalid("example_cloze must be a non-empty string");
    const parts = [...cloze.matchAll(/\{\{c1::([^{}]+)\}\}/g)];
    if (!parts.length) return invalid("example_cloze must contain a non-empty c1 answer");
    for (const [, answer] of parts) {
      if (answer !== answer.trim()) return invalid("Cloze answer has surrounding spaces");
      if (answer.includes("::")) return invalid("Cloze hints and nested markers are not supported");
      if (!/^[\p{L}\p{N}].*[\p{L}\p{N}]$|^[\p{L}\p{N}]$/u.test(answer))
        return invalid("Cloze answer must start and end with a letter or number");
    }
    const revealed = cloze.replace(/\{\{c1::([^{}]+)\}\}/g, "$1");
    if (/[{}]/.test(revealed)) return invalid("Malformed cloze marker or unsupported cN");
    if (typeof item.example_de !== "string" || revealed !== item.example_de)
      return invalid("Cloze does not exactly restore example_de");
    return {available: true, error: null};
  }

  function create(item, lang = window.DeutschTranslation?.getLang?.() || "en") {
    const result = check(item);
    if (!result.available) {
      const error = new Error(result.error.reason);
      Object.assign(error, result.error);
      throw error;
    }
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
    const translatedValue = (ru, en) => lang === "ru" ? ru || en || "" : en || ru || "";
    return {
      sentence: item.example_cloze,
      translation: translatedValue(item.translation_ru, item.translation_en),
      sentenceTranslation: translatedValue(item.example_ru, item.example_en),
      base,
      grammar,
      pos
    };
  }

  window.WortschatzDictionaryCard=Object.freeze({create, check, CODES});
})();
