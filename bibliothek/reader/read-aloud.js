/* Read aloud (11.11.2026, Alena — PROTOTYPE, only in bibliothek/vorlesen-test.html; bibliothek.html is not changed).
   The button left of the page number reads the open book with the device's German voice (components/deutsch-voice-v2.js),
   one sentence at a time, from the first sentence that starts on the visible page.

   - The sentence being read is marked; the word too where the browser reports words (Safari, Firefox).
   - Pages turn by themselves; at the end of a chapter the next one opens and reading goes on. Headings are read.
   - A tap on a word pauses reading and opens the usual popup; after the popup reading waits for the button (Alena 11.11).
   - Leaving the book or hiding the page stops / pauses reading.

   Works only through the reader's own page: words are span.reading-word with data-token-offset = position of the word's
   first character in its paragraph ([data-paragraph]); the boundary event's charIndex + the sentence start = that offset.
   Pages are turned by clicking the reader's own (hidden) page buttons, so pagination and saving the position stay the
   reader's. Sentences are cut like the popup cuts them (Intl.Segmenter + BibliothekLemmaResolver.abbreviationEnd). */
(() => {
  "use strict";
  const voice = window.DeutschVoice;
  const $ = id => document.getElementById(id);
  const button = $("read-aloud-toggle"), text = $("reading-text"), viewport = $("page-viewport");
  const view = $("reading-view"), nextPage = $("page-next"), prevPage = $("page-previous");
  if (!button || !text || !voice?.speakSentence) return;

  const LABEL = {start: "Vorlesen", pause: "Vorlesen pausieren", resume: "Weiter vorlesen"};
  let state = "idle";              // idle | reading | paused
  let place = null;                // {paragraph: element, sentence: index}
  let run = 0;                     // bumped on every stop: late callbacks of an old run are ignored

  // ---------- sentences ----------
  function sentencesOf(paragraph) {
    const whole = paragraph.textContent || "";
    const parts = [];
    if (typeof Intl.Segmenter === "function") {
      const resolver = window.BibliothekLemmaResolver;
      for (const part of new Intl.Segmenter("de", {granularity: "sentence"}).segment(whole)) {
        const last = parts[parts.length - 1];
        if (last && resolver?.abbreviationEnd?.(last.text, part.segment)) last.text += part.segment;
        else parts.push({start: part.index, text: part.segment});
      }
    } else {
      const re = /[^.!?…]+[.!?…]+["»«“”')\]]*\s*|[^.!?…]+$/g;
      let m;
      while ((m = re.exec(whole))) parts.push({start: m.index, text: m[0]});
    }
    return parts.map(p => {
      const lead = p.text.length - p.text.trimStart().length;
      return {start: p.start + lead, text: p.text.trim()};
    }).filter(p => /[\p{L}\p{N}]/u.test(p.text));
  }
  const paragraphs = () => [...text.querySelectorAll("[data-paragraph]")];
  const wordsIn = (paragraph, from, to) => [...paragraph.querySelectorAll(".reading-word")]
    .filter(w => { const o = Number(w.dataset.tokenOffset); return o >= from && o < to; });

  // ---------- marks ----------
  function clearMarks() {
    text.querySelectorAll(".is-spoken, .is-spoken-word").forEach(w => w.classList.remove("is-spoken", "is-spoken-word"));
  }
  function markSentence(paragraph, sentence) {
    clearMarks();
    const words = wordsIn(paragraph, sentence.start, sentence.start + sentence.text.length);
    words.forEach(w => w.classList.add("is-spoken"));
    return words;
  }

  // ---------- pages ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function side(node) {
    const r = node.getClientRects()[0], v = viewport.getBoundingClientRect();
    if (!r) return 0;
    if (r.left >= v.right - 1) return 1;
    if (r.right <= v.left + 1) return -1;
    return 0;
  }
  async function show(node, myRun) {
    for (let i = 0; i < 40 && myRun === run; i++) {
      const s = side(node);
      if (!s) return true;
      const btn = s > 0 ? nextPage : prevPage;
      if (btn.disabled) return false;
      btn.click();
      await wait(300);
    }
    return false;
  }
  function firstVisibleWord() {
    return [...text.querySelectorAll(".reading-word")].find(w => side(w) === 0) || null;
  }
  function onLastPage() {
    const m = /(\d+)\s*\/\s*(\d+)/.exec($("page-status")?.textContent || "");
    return !m || Number(m[1]) >= Number(m[2]);
  }
  function chapterChanged() {
    return new Promise(resolve => {
      const obs = new MutationObserver(() => { obs.disconnect(); clearTimeout(t); setTimeout(() => resolve(true), 350); });
      const t = setTimeout(() => { obs.disconnect(); resolve(false); }, 8000);
      obs.observe(text, {childList: true});
    });
  }
  async function nextChapter(myRun) {
    // Go to the last page of this chapter; one more turn there opens the next chapter (the reader's own boundary).
    for (let i = 0; i < 400 && myRun === run && !onLastPage(); i++) { nextPage.click(); await wait(300); }
    if (myRun !== run || nextPage.disabled) return false;
    const changed = chapterChanged();
    nextPage.click();
    return changed;
  }

  // ---------- reading ----------
  async function readFrom(start) {
    const myRun = ++run;
    place = start;
    while (myRun === run && place) {
      const sentences = sentencesOf(place.paragraph);
      const sentence = sentences[place.sentence];
      if (!sentence) {
        const list = paragraphs(), next = list[list.indexOf(place.paragraph) + 1];
        if (next) { place = {paragraph: next, sentence: 0}; continue; }
        if (!(await nextChapter(myRun)) || myRun !== run) { if (myRun === run) finish(); return; }
        const first = paragraphs()[0];
        if (!first) { finish(); return; }
        place = {paragraph: first, sentence: 0};
        continue;
      }
      const words = markSentence(place.paragraph, sentence);
      if (words[0]) await show(words[0], myRun);
      if (myRun !== run) return;
      const ended = await new Promise(resolve => {
        const ok = voice.speakSentence(sentence.text, {
          onWord: charIndex => {
            if (myRun !== run) return;
            const offset = sentence.start + charIndex;
            const word = words.find(w => {
              const o = Number(w.dataset.tokenOffset);
              return o <= offset && offset < o + w.textContent.length;
            }) || words.find(w => Number(w.dataset.tokenOffset) >= offset);
            if (!word) return;
            text.querySelectorAll(".is-spoken-word").forEach(w => w.classList.remove("is-spoken-word"));
            word.classList.add("is-spoken-word");
            if (side(word) > 0) show(word, myRun);
          },
          onEnd: () => resolve(true)
        });
        if (!ok) resolve(false);
      });
      if (myRun !== run) return;
      if (!ended) { finish(); return; }
      place = {paragraph: place.paragraph, sentence: place.sentence + 1};
    }
  }
  function startPlace() {
    const word = firstVisibleWord();
    if (!word) { const p = paragraphs()[0]; return p ? {paragraph: p, sentence: 0} : null; }
    const paragraph = word.closest("[data-paragraph]"), offset = Number(word.dataset.tokenOffset);
    const list = sentencesOf(paragraph);
    let index = list.findIndex(s => offset < s.start + s.text.length);
    if (index < 0) index = 0;
    // A sentence that began on the previous page is skipped: start with the first one that starts here.
    if (list[index] && list[index].start < offset && index + 1 < list.length) index += 1;
    return {paragraph, sentence: index};
  }

  // ---------- states ----------
  function setState(next) {
    state = next;
    button.dataset.state = next;
    button.setAttribute("aria-label", next === "reading" ? LABEL.pause : next === "paused" ? LABEL.resume : LABEL.start);
    button.title = button.getAttribute("aria-label");
    button.setAttribute("aria-pressed", next === "reading" ? "true" : "false");
    document.body.classList.toggle("is-reading-aloud", next === "reading");
  }
  function pause() {
    if (state !== "reading") return;
    run++;
    voice.stop();
    text.querySelectorAll(".is-spoken-word").forEach(w => w.classList.remove("is-spoken-word"));
    setState("paused");
  }
  function finish() {
    run++;
    voice.stop();
    clearMarks();
    place = null;
    setState("idle");
  }
  button.addEventListener("click", () => {
    if (state === "reading") { pause(); return; }
    // Continue where the pause was if that sentence is still on screen; otherwise from the visible page.
    const resume = state === "paused" && place?.paragraph?.isConnected &&
      wordsIn(place.paragraph, 0, Infinity).some(w => w.classList.contains("is-spoken") && side(w) === 0);
    const from = resume ? place : startPlace();
    if (!from) return;
    setState("reading");
    readFrom(from);
  });

  // A tap on a word while reading: pause first; the reader opens its popup as usual.
  text.addEventListener("click", event => {
    if (state === "reading" && event.target.closest?.(".reading-word")) pause();
  }, true);
  // Leaving the book stops; another app or tab pauses.
  new MutationObserver(() => { if (view.hidden && state !== "idle") finish(); })
    .observe(view, {attributes: true, attributeFilter: ["hidden"]});
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  // A chapter opened by hand (contents, chapter buttons) while not reading: the old place is gone.
  new MutationObserver(() => { if (state === "paused" && !place?.paragraph?.isConnected) finish(); })
    .observe(text, {childList: true});

  const sync = available => { button.hidden = !available; if (!available && state !== "idle") finish(); };
  sync(voice.available());
  voice.onChange(sync);
  setState("idle");
})();
