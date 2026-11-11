/* Deutsch voice v2 (11.11.2026, Alena — prototype for reading a book aloud, bibliothek/vorlesen-test.html).
   Everything of v1 (deutsch-voice-v1.js) unchanged — the same voice choice, available(), speak(text), onChange(fn) —
   plus one sentence at a time with events, for the reader's read-aloud:

   DeutschVoice.speakSentence(text, {onWord, onEnd})
       → reads one sentence (stops what was being read); onWord(charIndex) when the browser reports the start of a
         word (Safari, Firefox; Chrome only partly — the reader then marks the sentence only); onEnd() once, when the
         sentence is over or failed. Returns false when there is no German voice.
   DeutschVoice.stop()           → stops reading; no onEnd for the stopped sentence

   One sentence at a time on purpose: Chrome cuts long utterances (~15 s), and iOS pause()/resume() are unreliable —
   a pause is stop(), continuing is the same sentence again. A watchdog ends a sentence whose «end» never comes
   (Safari sometimes drops it). */
(() => {
  "use strict";
  if (window.DeutschVoice) return;
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const listeners = new Set();
  const RATE = 0.88;
  let voice = null, current = null;
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
  function utterance(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = RATE;
    return u;
  }
  function stop() {
    if (current) { current.cancelled = true; clearTimeout(current.watchdog); current = null; }
    if (synth) synth.cancel();
  }
  window.DeutschVoice = Object.freeze({
    available: () => !!voice,
    speak(text) {
      const words = String(text || "").trim();
      if (!voice || !words) return false;
      stop();
      synth.speak(utterance(words));
      return true;
    },
    speakSentence(text, {onWord, onEnd} = {}) {
      const words = String(text || "");
      if (!voice || !words.trim()) return false;
      stop();
      const job = {cancelled: false, watchdog: 0, done: false};
      const finish = () => {
        if (job.done || job.cancelled) return;
        job.done = true;
        clearTimeout(job.watchdog);
        if (current === job) current = null;
        try { onEnd?.(); } catch (_) {}
      };
      // ~70 ms per character at this rate is slow speech; +4 s for a slow voice start.
      const arm = () => { clearTimeout(job.watchdog); job.watchdog = setTimeout(finish, words.length * 90 / RATE + 4000); };
      const u = utterance(words);
      u.onstart = arm;
      u.onboundary = event => {
        if (job.cancelled || job.done) return;
        arm();
        if (event.name && event.name !== "word") return;
        try { onWord?.(event.charIndex); } catch (_) {}
      };
      u.onend = finish;
      u.onerror = event => { if (event.error !== "interrupted" && event.error !== "canceled") finish(); };
      current = job;
      arm();
      synth.speak(u);
      return true;
    },
    stop,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  });
})();
