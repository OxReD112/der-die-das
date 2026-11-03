/* Alternatives are curated per sentence: a valid conjugation alone is not enough.
   Only the expected meaning counts towards exercise progress. */
(function () {
  function normalize(value) {
    return String(value || "").normalize("NFC").trim().toLowerCase();
  }
  /* Capital letters (03.11.2026, Alena): a capital here only starts the sentence (Konntest du …?), so a small first
     letter is fine there; otherwise the case must be as written (Kann in mid-sentence is wrong). */
  function caseRight(value, written) {
    const v = String(value || "").normalize("NFC").trim(),
      w = String(written || "").normalize("NFC").trim();
    if (v === w) return true;
    return /^[A-ZÄÖÜ]/.test(w) && v.charAt(0).toLocaleUpperCase("de-DE") + v.slice(1) === w;
  }
  function assess(item, value) {
    const answer = normalize(value);
    if (!answer) return { kind: "empty" };
    if (answer === normalize(item.answer)) return caseRight(value, item.answer) ? { kind: "expected" } : { kind: "incorrect" };
    const alternative = (item.alternativeAnswers || []).find(option => normalize(option.answer) === answer);
    if (alternative && !caseRight(value, alternative.answer)) return { kind: "incorrect" };
    return alternative ? { kind: "alternative", alternative } : { kind: "incorrect" };
  }
  window.ModalAnswerRules = { normalize, assess };
})();
