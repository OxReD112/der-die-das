/* Deutsch voice (09.11.2026, Alena): German text read aloud with a German voice only — never the phone's own
   language. The same choice as in Wortschatz (wortschatz.js, «GERMAN VOICE ONLY» / «BEST VOICE FIRST»):
   Premium > Enhanced (Apple translates the name into the phone's language, so voiceURI is checked too) > any other,
   de-DE before other German, on-device before online (online voices fall silent offline), Apple's Eloquence
   novelty voices (Eddy, Flo, Grandma, …) last. No German voice on the device → available() is false and speak()
   does nothing. The voice list can arrive late: it is checked again on voiceschanged and a few times after load.

   DeutschVoice.available()      → true when a German voice was found
   DeutschVoice.speak(text)      → reads the text (stops what was being read); false if it could not
   DeutschVoice.onChange(fn)     → fn(available) whenever the answer may have changed */
(() => {
  "use strict";
  if (window.DeutschVoice) return;
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const listeners = new Set();
  let voice = null;
  function score(v) {
    const id = `${v.voiceURI || ""} ${v.name || ""}`;
    let s = 0;
    if (/premium/i.test(id)) s += 40;
    else if (/enhanced|erweitert|verbessert|улучш/i.test(id)) s += 30;
    if (/eloquence/i.test(v.voiceURI || "")) s -= 50;
    if (/^de[-_]DE$/i.test(v.lang || "")) s += 4;
    if (v.localService) s += 2;
    return s;
  }
  function pick() {
    let best = -Infinity, found = null;
    for (const v of synth ? synth.getVoices() : []) {
      if (!/^de([-_]|$)/i.test(v.lang || "")) continue;
      const s = score(v);
      if (s > best) { best = s; found = v; } // ties keep the list order
    }
    const changed = found !== voice;
    voice = found;
    if (changed) listeners.forEach(fn => { try { fn(!!voice); } catch (_) {} });
  }
  pick();
  if (synth) {
    synth.addEventListener("voiceschanged", pick);
    [500, 1500, 4000].forEach(ms => setTimeout(pick, ms));
  }
  window.DeutschVoice = Object.freeze({
    available: () => !!voice,
    speak(text) {
      const words = String(text || "").trim();
      if (!voice || !words) return false;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(words);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.88;
      synth.speak(u);
      return true;
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  });
})();
