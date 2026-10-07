/* Alternatives are curated per sentence: a valid conjugation alone is not enough.
   Only the expected meaning counts towards exercise progress. */
(function () {
  function normalize(value) {
    return String(value || "").normalize("NFC").trim().toLowerCase();
  }
  function assess(item, value) {
    const answer = normalize(value);
    if (!answer) return { kind: "empty" };
    if (answer === normalize(item.answer)) return { kind: "expected" };
    const alternative = (item.alternativeAnswers || []).find(option => normalize(option.answer) === answer);
    return alternative ? { kind: "alternative", alternative } : { kind: "incorrect" };
  }
  window.ModalAnswerRules = { normalize, assess };
})();
