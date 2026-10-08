/* A quiet thank-you for resolving a meaning, independent of dictionary data. */
(() => {
  "use strict";
  const KEY = "bibliothek-meaning-thanks-v1";
  const phrases = ["Mensch 1 : 0 Maschine", "Punkt für dich!", "Du 1 : 0 Algorithmus", "Computer sagt danke.", "Da war ich wohl überfragt.", "Gut, dass du mitdenkst!"];
  function create({storage, now = Date.now, random = Math.random} = {}) {
    let state = {count:0, threshold:3, lastShown:0, lastPhrase:-1};
    try {
      const saved = JSON.parse(storage?.getItem(KEY));
      if (saved && Number.isInteger(saved.count) && saved.count >= 0 &&
          Number.isInteger(saved.threshold) && saved.threshold >= 3 && saved.threshold <= 12 &&
          Number.isFinite(saved.lastShown) && saved.lastShown >= 0 &&
          Number.isInteger(saved.lastPhrase) && saved.lastPhrase >= -1 && saved.lastPhrase < phrases.length) state = saved;
    } catch (_) {}
    const save = () => { try { storage?.setItem(KEY, JSON.stringify(state)); } catch (_) {} };
    return Object.freeze({
      selected() { state.count = Math.min(state.count + 1, state.threshold); save(); },
      message(canShow) {
        const time = now();
        if (!canShow || state.count < state.threshold || state.lastPhrase >= 0 && time - state.lastShown < 600000) return null;
        const available = phrases.map((_, index) => index).filter(index => index !== state.lastPhrase);
        const index = available[Math.floor(random() * available.length)];
        state = {count:0, threshold:7 + Math.floor(random() * 6), lastShown:time, lastPhrase:index};
        save();
        return phrases[index];
      }
    });
  }
  window.BibliothekMeaningThanks = Object.freeze({create});
})();
