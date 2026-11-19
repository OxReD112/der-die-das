/* Wortschatz — the rules, without the page (19.11.2026). Before 19.11 they lived in wortschatz.js next to the screen;
   the page now asks this file and draws what it returns, and the native app runs it as it is (JavaScriptCore), as
   answer-rules.js of Vielseitige Verben / Pronomen. Same rules, same texts, same order of Math.random (the app checks
   itself against the site with a repeatable «random»): shuffling the round in build(), pickOne() of the typo hints,
   shuffling in prepareTomorrowNotifications().

   Nothing of the page here: no DOM, network, media queries, speech or timers. Needs (loaded before): DeutschDay
   (components/deutsch-day-v1.js), getTranslation (components/deutsch-translation-v1.js); when they are there:
   DeutschWortschatzDue, WortschatzCollection (collection.js), WortschatzMeanings (meanings.js). Storage: localStorage
   wortsternSRSv03 (progress), deutschHomeStatsV1 (Home tile), deutschProgressV1 («Fortschritt»),
   deutschNotificationPoolV1 / deutschNotificationDoneV1 (notifications; sending them to the server stays on the page).

   On load: the collection (old Starter-Set progress moved once), WORDS (= window.WORDS), the progress, «seen».

   The round — the file keeps it (queue, idx, completed, sessionTotal, failedToday, closedToday, peekedToday,
   hintsUsed, caseHinted, ghostShown); the page only asks and draws:
     start()            → "choose" (no words) | "done" (nothing due: call build(), the round is over at once) | "start"
     startNote()        the grey line of the start screen: "" | "Noch 8 neue Wörter" | "Keine neuen Wörter mehr"
     build(cards?)      a new round (today's due words, shuffled; or the given new words)
     card()             the card to show, or null when the round is over → done(); resets the card's tries:
                        { card, counter: "3 / 12 heute", bar: 25 (percent), sentence: parts, translation, canPeek }
     peek()             👁 tapped → the gaps filled faintly (parts), or null when not offered
     check(typedRaw)    the answer → { kind, … } and moves the word on (level, due date, queue), as before:
                        "empty"     nothing typed — nothing happens
                        "copySlip"  copying after 👁, not yet exact — the field shakes
                        "caseHint"  a noun typed in lower case, first time — hint «Fast. Nomen schreibt man groß.»
                        "almost"    a typo at level 2+ — hint (one of HINT_FIRST / HINT_LAST), the text stays
                        "neutral"   copied after 👁 — neutral answer screen, the word comes back at the end
                        "good" / "bad"  the answer screen; "bad" has diff: { top: parts, bottom: parts }
                        the answer screen kinds also carry: card, answer (parts), translation, base, meaning, auch, grammar
     next()             Weiter
     done(canAddWords)  the round is over → { score, counter, button: { text, action: "learn" | "add" } | null, note }
                        (writes the Home status; the page then sends «done» and calls prepareTomorrowNotifications)
     addFive()          «5 neue Wörter lernen» → the new cards (the page then calls build(them)), or null
     applyEditedCard(fresh) / applyDeletedCard(id)  ✎ in the round → true / "empty" (collection empty: reload) / false
   Parts of a sentence: [{ kind: "plain" | "blank" | "target" | "ghost", text, before?, after? }]
     sentence (blankParts): "plain" text is page markup as written in the card (the page puts it in as it is, as before);
       "blank" = the gap, with the punctuation that sticks to it (before / after)
     answer (revealParts) and ghost (ghostParts): "plain" is text (the page escapes it); "target" / "ghost" = the word
   Parts of the letter diff: [{ kind: "same" | "wrong" | "missing" | "absent", text }] ("absent" = a letter you left out,
     shown as a red „_“). A quite different word: top = [{ wrong, whole typed }], bottom = [{ same, whole right }].
   auch(card) → { label: "auch: ", shown: [..], more: N, all: [..] } | null — the other meanings (2 shown, «+N» opens all).
   Also: normalize, keepCase, targetParts, targets, isNoun, blankAtStart, caseRight, isClose, osa, loose, diffParts,
   rec, save, activeCards, dueCount, newWordsLeft, newWordsLabel, cardsLabel, publishStatus, publishProgress,
   prepareTomorrowNotifications, writeNotificationDone, germanVoiceScore, pickGermanVoice(voices), VOICE_RATE. */
(function (root) {
  "use strict";

  const STORE = "wortsternSRSv03",
    HOME_STATS = "deutschHomeStatsV1",
    PROGRESS = "deutschProgressV1";
  const getT = (item, field) => root.getTranslation(item, field);

  /* Own word collection (collection.js). 2026-10-26: there is no built-in set any more — without an own
     collection WORDS is empty and the start screen asks „Where do you want to start?“ (word sets / own words).
     Old Starter-Set progress is moved into an own collection once, before anything reads it.
     Everything below (deck, due count, notifications, progress) works on WORDS, so nothing else changes. */
  if (root.WortschatzCollection && root.WortschatzCollection.needsLegacyMove()) root.WortschatzCollection.migrateLegacy("legacy/starter-set.js?v=1");
  root.WORDS = root.WortschatzCollection && root.WortschatzCollection.isOwn() ? root.WortschatzCollection.cards() : [];
  const WORDS = root.WORDS;
  // Words that still carry the whole line of meanings (older cards, words from Bibliothek) or a guessed one:
  // split / correct them in the background (meanings.js). The open session sees the change at once.
  if (root.WortschatzMeanings && WORDS.length)
    root.WortschatzMeanings.fixCollection()
      .then(changes => {
        const by = new Map(changes.map(x => [x.id, x]));
        WORDS.forEach(w => {
          const x = by.get(w.id);
          if (!x) return;
          w.translation = x.translation;
          w.otherMeanings = x.otherMeanings;
          if (x.meaningGuess) w.meaningGuess = true;
          else delete w.meaningGuess;
        });
      })
      .catch(() => {});

  // Calendar days "YYYY-MM-DD" in local time: the shared helper (components/deutsch-day-v1.js), same as Home.
  const day = () => root.DeutschDay.key();
  const add = n => root.DeutschDay.key(-n);

  function publishStatus(done = false) {
    try {
      const today = day();
      /* The due-word rule lives in components/deutsch-wortschatz-due-v1.js (shared with Home).
         If that file didn't load, fall back to counting here the same way. */
      let remaining;
      if (root.DeutschWortschatzDue) {
        remaining = root.DeutschWortschatzDue.count(state, new Set(WORDS.map(c => c.id))).remaining;
      } else {
        remaining = activeCards().filter(c => rec(c).due <= today).length;
      }
      const status = {
        date: today,
        done: !!done || remaining === 0,
        remaining,
        updatedAt: Date.now()
      };
      const home = JSON.parse(localStorage.getItem(HOME_STATS) || "{}");
      home.wortschatz = status;
      localStorage.setItem(HOME_STATS, JSON.stringify(home));
    } catch (e) {}
  }
  // Simple SRS: first success -> tomorrow, then +8, +20, +45, +90 days.
  // A mistake resets the card: it stays in today's session until answered correctly, then returns tomorrow.
  // Level 6 = FULLY LEARNED: the word also passed the 90-day review (6 correct reviews in a row).
  // After level 5 the interval stays 90 days; reaching level 6 only marks the word as learned.
  // Review pace (2026-10-26, collection.js → PACES): Standard 1 · 8 · 20 · 45 · 90, Intensiv 1 · 3 · 7 · 21 · 45.
  // Both have 5 steps, so a word's level and „learned“ mean the same in both; a change applies to the next reviews.
  let steps = (root.WortschatzCollection && root.WortschatzCollection.PACES[root.WortschatzCollection.getPace()]) || [1, 8, 20, 45, 90];
  function setPace(pace) {
    if (root.WortschatzCollection && root.WortschatzCollection.PACES[pace]) steps = root.WortschatzCollection.PACES[pace];
  }
  const LEARNED_LEVEL = 6; // 5 steps + 1
  const INITIAL_WORDS = 10,
    ADD_BATCH = 5;
  let state = { cards: {}, activeIds: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && saved.cards && Array.isArray(saved.activeIds)) state = saved;
  } catch (e) {}
  // „seen“ (2026-10-26): the word has been shown at least once, so 👁 is offered only at its very first showing.
  // Words that already moved up a level were seen before; old words still at level 0 may get the eye once.
  for (const k in state.cards) if (state.cards[k] && state.cards[k].level > 0) state.cards[k].seen = true;
  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
    publishProgress();
  }
  // Progress summary for Home (Documentation/PROGRESS_TRACKER.md, section 7):
  // total = words in the active collection (kept for old readers, not shown) · started = words in the active set ·
  // sitzt = level 3+ (passed the 8-day review) · learned = level 6 · collection = name of the active collection (v2.106).
  const SITZT_LEVEL = 3;
  function publishProgress() {
    try {
      const ids = new Set(WORDS.map(c => c.id));
      const mine = state.activeIds.filter(id => ids.has(id));
      const lvl = id => state.cards[id]?.level || 0;
      const started = mine.length;
      const sitzt = mine.filter(id => lvl(id) >= SITZT_LEVEL).length;
      const learned = mine.filter(id => lvl(id) >= LEARNED_LEVEL).length;
      let collection = "";
      try {
        if (root.WortschatzCollection && root.WortschatzCollection.isOwn())
          collection = String(root.WortschatzCollection.get().name || getT({ n: { en: "My Words", ru: "Мои слова" } }, "n"));
      } catch (e) {}
      let data = null;
      try {
        data = JSON.parse(localStorage.getItem(PROGRESS) || "null");
      } catch (e) {}
      if (!data || typeof data !== "object" || !data.exercises || typeof data.exercises !== "object")
        data = { format: 1, exercises: {} };
      const today = day();
      data.exercises.wortschatz = {
        summary: {
          kind: "words",
          total: ids.size,
          started,
          sitzt,
          learned,
          collection,
          sicher: learned,
          items: ids.size,
          itemsSicher: learned,
          updated: today,
          recent: []
        }
      };
      localStorage.setItem(PROGRESS, JSON.stringify(data));
    } catch (e) {}
  }
  function ensureDeck() {
    if (!state.activeIds.length) {
      state.activeIds = WORDS.slice(0, INITIAL_WORDS).map(c => c.id);
      save();
    }
  }
  function rec(c) {
    if (!state.cards[c.id]) state.cards[c.id] = { level: 0, due: day() };
    return state.cards[c.id];
  }
  let hintsUsed = 0,
    caseHinted = false;
  let queue = [],
    idx = 0,
    current = null,
    sessionTotal = 0,
    completed = 0,
    failedToday = new Set(),
    closedToday = new Set(),
    peekedToday = new Set(),
    ghostShown = false,
    peekOffered = false;
  function normalize(s) {
    return s
      .trim()
      .toLocaleLowerCase("de-DE")
      .replace(/\s*,\s*/g, " ")
      .replace(/\s+/g, " ");
  }
  // ===== TYPO TOLERANCE (2026-09-25, see Documentation/DECISIONS.md) =====
  // Only for words at level 2+. Levels 0-1 stay strict (exact answer only).
  // A close answer never counts as right. It gets a hint (red frame + shake, text stays) and up to 2 more tries.
  // After that it is wrong and the word starts again from level 0, like any mistake
  // (the "Nur Tippfehler" button that kept the level was removed 2026-10-23, author's decision).
  const TOLERANT_FROM_LEVEL = 2,
    MAX_HINTS = 2;
  // Hint texts: short, informal, kind. One picked at random.
  const HINT_FIRST = ["Sooo nah dran!", "Ups, fast! Nochmal?", "Die Buchstaben machen Quatsch.", "Knapp! Du hast es gleich."];
  const HINT_LAST = ["Ein Blick noch. Keine Panik.", "Einmal noch, ganz in Ruhe."];
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  // Damerau (OSA) distance: missing / extra / wrong letter or two neighbouring letters swapped = 1 slip.
  function osa(x, y) {
    const a = [...x],
      b = [...y],
      d = Array.from({ length: a.length + 1 }, (_, i) => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) d[i][0] = i;
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[a.length][b.length];
  }
  // Common learner slips, flattened (sounds the same / known trap). Used ONLY to decide whether to give the hint:
  // sch-ch-sh-sc, ß-ss-s, double-single consonant, ck-k, tz-z-ts, silent h, i-ie, v-f-w, ä-e, äu-eu, umlaut dots,
  // d-t / b-p / g-k at the end of a word, chs-ks-x, qu-kw, ph-f, th-t, dt-t.
  function loose(s) {
    return s
      .replace(/ß/g, "ss")
      .replace(/äu/g, "eu")
      .replace(/ä/g, "e")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/chs/g, "ks")
      .replace(/x/g, "ks")
      .replace(/sch/g, "S")
      .replace(/sh|sc|ch/g, "S")
      .replace(/qu/g, "kw")
      .replace(/ph/g, "f")
      .replace(/th/g, "t")
      .replace(/dt/g, "t")
      .replace(/ck/g, "k")
      .replace(/tz|ts/g, "z")
      .replace(/ie/g, "i")
      .replace(/([aeiouy])h(?![aeiouy])/g, "$1")
      .replace(/[vw]/g, "f")
      .replace(/d\b/g, "t")
      .replace(/b\b/g, "p")
      .replace(/g\b/g, "k")
      .replace(/([bcdfgklmnprstz])\1+/g, "$1");
  }
  const letterCount = s => s.replace(/\s/g, "").length;
  // Slips allowed for the hint: 1-3 letters none (exact only), 4-6 letters 1, 7-10 letters 2, 11+ letters 3.
  function slipAllowance(n) {
    return n <= 3 ? 0 : n <= 6 ? 1 : n <= 10 ? 2 : 3;
  }
  // Another word from the list typed exactly = a mix-up, not a typo -> no hint.
  let listAnswers = null;
  function isOtherListWord(y, target) {
    if (!listAnswers) listAnswers = new Set(WORDS.flatMap(c => targets(c)).map(normalize));
    return y !== normalize(target) && listAnswers.has(y);
  }
  function isClose(typed, target) {
    const t = normalize(target),
      y = typed,
      n = letterCount(t),
      allow = slipAllowance(n);
    if (!allow || y === t) return false;
    if (loose(y)[0] !== loose(t)[0]) return false; // the first letter must be right (sch/sh, v/f, ä/e count as the same)
    if (isOtherListWord(y, target)) return false;
    // scrambled order: exactly the right letters, 5+ letters
    const sorted = s => [...s.replace(/\s/g, "")].sort().join("");
    if (n >= 5 && sorted(y) === sorted(t)) return true;
    const d = Math.min(osa(y, t), osa(loose(y), loose(t)));
    if (letterCount(y) < Math.ceil(n / 2) || n - d < Math.ceil(n / 2)) return false; // at least half the letters right
    if (d <= allow) return true;
    // wrong ending: same beginning, only the last few letters differ
    let p = 0;
    while (p < y.length && p < t.length && y[p] === t[p]) p++;
    return p >= 4 && y.length - p <= 3 && t.length - p <= 3;
  }
  function targetParts(c) {
    return (c.target || "")
      .split(" / ")
      .map(x => x.trim())
      .filter(Boolean);
  }
  function targets(c) {
    const parts = targetParts(c);
    // With several blanks, the slash separates the pieces of ONE separable verb,
    // not alternative answers. The learner types both pieces in one field.
    if ((c.blank.match(/_____/g) || []).length > 1) return [parts.join(" ")];
    return parts;
  }
  function activeCards() {
    const ids = new Set(state.activeIds);
    return WORDS.filter(c => ids.has(c.id));
  }

  /* Notifications: tomorrow's pool and today's «done» are written here; sending them to the server stays on the page. */
  function writeNotificationDone() {
    const event = { date: day(), done: true, completedAt: Date.now() };
    try {
      localStorage.setItem("deutschNotificationDoneV1", JSON.stringify(event));
    } catch (e) {}
    return event;
  }
  function prepareTomorrowNotifications(limit = 4) {
    const tomorrow = add(1);
    const candidates = activeCards().filter(c => rec(c).due === tomorrow);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const notifications = shuffled.slice(0, Math.min(4, limit)).map(c => ({
      id: c.id,
      sentence: c.revealed || c.sentence || "",
      translation: getT(c, "sentenceTranslation")
    }));
    const pool = { date: tomorrow, notifications, createdAt: Date.now() };
    try {
      localStorage.setItem("deutschNotificationPoolV1", JSON.stringify(pool));
      console.log("[German Learning] Tomorrow notification pool:", pool);
    } catch (e) {
      console.warn("[German Learning] Could not save notification pool:", e);
    }
    return pool;
  }

  function build(cards = null) {
    ensureDeck();
    queue = (cards || activeCards().filter(c => rec(c).due <= day())).sort(() => Math.random() - 0.5);
    idx = 0;
    sessionTotal = queue.length;
    completed = 0;
    failedToday = new Set();
    closedToday = new Set();
    peekedToday = new Set();
    publishStatus(queue.length === 0);
    publishProgress();
  }
  // The gap keeps the punctuation next to it on its line (02.11.2026: „gutem ___ .“ — the full stop went alone to the next line).
  // "plain" parts are the card's text as written (the page puts them in as markup, as before 19.11).
  function blankParts(c) {
    const out = [],
      re = /([^\s\p{L}\p{N}]*)_____([^\s\p{L}\p{N}]*)/gu,
      s = c.blank;
    let pos = 0,
      m;
    while ((m = re.exec(s))) {
      if (m.index > pos) out.push({ kind: "plain", text: s.slice(pos, m.index) });
      out.push({ kind: "blank", before: m[1], after: m[2] });
      pos = m.index + m[0].length;
    }
    if (pos < s.length) out.push({ kind: "plain", text: s.slice(pos) });
    return out;
  }
  // The answer's parts are marked in the sentence. They are searched in the plain sentence, left to right, as whole
  // word starts - never inside markup already added (2026-10-23: „an“ of „melde … an“ was found inside „<span“ and broke
  // the line). A part that isn't found (the other alternative of „A / B“) is skipped.
  function revealParts(c) {
    const text = String(c.revealed || ""),
      out = [];
    let pos = 0;
    for (const t of targetParts(c)) {
      const e = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = new RegExp("(^|[^\\p{L}])(" + e + ")", "u").exec(text.slice(pos)); // word start (an ≠ k-an-n); may end inside a word (eigen-e)
      if (!m) continue;
      const start = pos + m.index + m[1].length;
      out.push({ kind: "plain", text: text.slice(pos, start) }, { kind: "target", text: t });
      pos = start + t.length;
    }
    out.push({ kind: "plain", text: text.slice(pos) });
    return out;
  }
  // The gaps filled with the hidden words, faintly: taken from the cloze marks in order ({{c1::schlage}} … {{c1::vor}});
  // without them, the first answer split into words when that matches the number of gaps. No words → the gaps (blankParts).
  function ghostParts(c) {
    const blanks = (String(c.blank || "").match(/_____/g) || []).length;
    let words = [...String(c.sentence || "").matchAll(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g)].map(m => m[1]);
    if (words.length !== blanks) {
      const first = (targetParts(c)[0] || "").split(/\s+/).filter(Boolean);
      words = first.length === blanks ? first : blanks === 1 ? [targetParts(c)[0] || ""] : [];
    }
    if (!words.length) return blankParts(c);
    const pieces = String(c.blank).split("_____"),
      out = [];
    pieces.forEach((p, i) => {
      out.push({ kind: "plain", text: p });
      if (i < pieces.length - 1) out.push({ kind: "ghost", text: words[i] || "" });
    });
    return out;
  }
  // The letters stand column by column (02.11.2026): a letter you left out is a red „_“ in your row, a letter you
  // added leaves a gap in the right row — both rows are always the same length, so in the monospace font every
  // letter sits exactly above its partner.
  function diffParts(typed, correct) {
    const a = [...typed],
      b = [...correct],
      m = a.length,
      n = b.length,
      dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = m; i >= 0; i--)
      for (let j = n; j >= 0; j--) {
        if (i === m) dp[i][j] = n - j;
        else if (j === n) dp[i][j] = m - i;
        else if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1];
        else dp[i][j] = 1 + Math.min(dp[i + 1][j + 1], dp[i + 1][j], dp[i][j + 1]);
      }
    let i = 0,
      j = 0;
    const top = [],
      bottom = [];
    while (i < m || j < n) {
      if (i < m && j < n && a[i] === b[j]) {
        top.push({ kind: "same", text: a[i] });
        bottom.push({ kind: "same", text: b[j] });
        i++;
        j++;
        continue;
      }
      const sub = i < m && j < n ? dp[i + 1][j + 1] : 1e9,
        del = i < m ? dp[i + 1][j] : 1e9,
        ins = j < n ? dp[i][j + 1] : 1e9;
      if (sub <= del && sub <= ins) {
        top.push({ kind: "wrong", text: a[i] });
        bottom.push({ kind: "missing", text: b[j] });
        i++;
        j++;
      } else if (del <= ins) {
        top.push({ kind: "wrong", text: a[i] });
        bottom.push({ kind: "gap", text: " " });
        i++;
      } else {
        top.push({ kind: "absent", text: "_" });
        bottom.push({ kind: "missing", text: b[j] });
        j++;
      }
    }
    // 03.11 (Alena, A + B): a quite different word (under 60 % of the right letters match) is not compared letter by letter —
    // what you typed in red, the right word whole; and the right word never has holes (no gap under an extra letter).
    const same = bottom.filter(s => s.kind === "same").length;
    if (same < n * 0.6) return { top: [{ kind: "wrong", text: typed }], bottom: [{ kind: "same", text: correct }] };
    return { top, bottom: bottom.filter(s => s.kind !== "gap") };
  }
  /* Capital letters (18.11.2026, Alena: «нужно только, чтобы существительные были с большой буквы, всё остальное
     принимается в любом случае»): only a noun must start with a capital letter. Every word of the answer that is
     written with a capital is a noun — except the first word when the gap starts the sentence (there the capital only
     starts the sentence, unless the card itself is a noun). Such a noun typed in lower case gets one more try with the
     hint «Fast. Nomen schreibt man groß.», the second time it is a mistake. Anything else may be typed in any case
     (Gestern / gestern, LAUFEN …). 03.11–18.11 the case of every word was checked. */
  const keepCase = s => s.trim().replace(/\s*,\s*/g, " ").replace(/\s+/g, " ");
  const isNoun = c => c.pos === "Substantiv" || /^(der|die|das)\s/i.test(c.base || "");
  function blankAtStart(c) {
    const before = String(c.blank || "").split("_____")[0].trim();
    return !before || /[.!?:„“"»«]$/.test(before);
  }
  const startsUpper = w => /^[A-ZÄÖÜ]/.test(w);
  const ARTICLE = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein|keine|keinen|keinem|keiner)$/i;
  function caseRight(c, typedKeep, target) {
    const want = keepCase(target).split(" "),
      got = typedKeep.split(" ");
    return want.every((w, i) => {
      if (!startsUpper(w)) return true; // a small word may be typed in any case
      if (i === 0 && blankAtStart(c) && (!isNoun(c) || ARTICLE.test(w))) return true; // a capital that only starts the sentence (Der Hund …)
      return startsUpper(got[i] || ""); // a noun: its first letter must be a capital
    });
  }
  const CASE_HINT = "Fast. Nomen schreibt man groß."; // only a noun in lower case is ever held back (18.11)
  const lowerFirst = s => s.charAt(0).toLocaleLowerCase("de-DE") + s.slice(1);

  /* „auch: …“ (2026-10-26): the word's other meanings, quiet, under the trained one. Up to 2 shown (first synonym of each);
     more → „+N“, a tap shows them all. */
  function auch(c) {
    const M = root.WortschatzMeanings;
    const others = M ? M.parts(getT(c, "otherMeanings"), ";") : [];
    if (!others.length) return null;
    const first = s => M.parts(s, ",")[0] || s;
    const shown = others.length <= 2 ? others : others.slice(0, 2).map(first);
    return { label: "auch: ", shown, more: others.length > 2 ? others.length - 2 : 0, all: others };
  }
  // What every answer screen shows under the answer (the card as it is now).
  function answerScreen(c) {
    return {
      card: c,
      answer: revealParts(c),
      translation: getT(c, "sentenceTranslation"),
      base: c.base,
      meaning: getT(c, "translation"),
      auch: auch(c),
      grammar: getT(c, "grammar")
    };
  }

  /* 👁 — first showing of a new word (2026-10-26): try to remember it yourself, or tap the eye and copy it. */
  function setupPeek() {
    ghostShown = false;
    const r = rec(current);
    peekOffered = r.level === 0 && !r.seen && !failedToday.has(current.id) && !peekedToday.has(current.id);
    return peekOffered;
  }
  function card() {
    if (idx >= queue.length) return null;
    current = queue[idx];
    const out = {
      card: current,
      counter: `${completed} / ${sessionTotal} heute`,
      bar: sessionTotal ? (completed / sessionTotal) * 100 : 100,
      sentence: blankParts(current),
      translation: getT(current, "sentenceTranslation")
    };
    hintsUsed = 0;
    caseHinted = false;
    out.canPeek = setupPeek();
    return out;
  }
  function peek() {
    if (!current || ghostShown || !peekOffered) return null;
    ghostShown = true;
    peekedToday.add(current.id);
    return ghostParts(current);
  }
  // Copying is not an answer: a slip only shakes the field; done → neutral answer screen, level and date stay,
  // the word comes back at the end of this session with an empty gap.
  function checkCopy(typed) {
    const matched = targets(current).find(t => normalize(t) === typed);
    if (!matched) return { kind: "copySlip" };
    ghostShown = false;
    const out = Object.assign({ kind: "neutral" }, answerScreen(current));
    rec(current).seen = true;
    if (!queue.slice(idx + 1).some(c => c.id === current.id)) queue.push(current);
    save();
    return out;
  }
  function check(typedRaw) {
    let typed = normalize(typedRaw);
    if (!typed) return { kind: "empty" };
    if (ghostShown) return checkCopy(typed);
    const typedKeep = keepCase(typedRaw);
    const opts = targets(current),
      matched = opts.find(t => normalize(t) === typed);
    let ok = !!matched;
    if (ok && !caseRight(current, typedKeep, matched)) {
      if (!caseHinted) {
        caseHinted = true;
        return { kind: "caseHint", hint: CASE_HINT };
      }
      ok = false;
    }
    const r = rec(current);
    const tolerant = (r.level || 0) >= TOLERANT_FROM_LEVEL && !failedToday.has(current.id);
    if (!ok && tolerant && hintsUsed < MAX_HINTS && opts.some(t => isClose(typed, t))) {
      hintsUsed++;
      return { kind: "almost", hint: pickOne(hintsUsed >= MAX_HINTS ? HINT_LAST : HINT_FIRST) };
    }
    // For an error, compare against the closest accepted answer so the highlighted difference is useful.
    let correct = opts[0] || "";
    if (matched) correct = matched;
    else if (opts.length > 1) correct = [...opts].sort((x, y) => osa(typed, normalize(x)) - osa(typed, normalize(y)))[0];
    const out = Object.assign({ kind: ok ? "good" : "bad", typed: typedKeep, correct: keepCase(correct), diff: null }, answerScreen(current));
    if (!ok) {
      // letters in their real case (03.11.2026): „zustand“ → „Zustand“ marks the z; a free first letter at the
      // start of the sentence is not marked
      const right = keepCase(correct),
        freeFirst = blankAtStart(current) && !isNoun(current) && lowerFirst(typedKeep).charAt(0) === lowerFirst(right).charAt(0),
        mine = freeFirst ? right.charAt(0) + typedKeep.slice(1) : typedKeep;
      out.diff = diffParts(mine, right);
    }
    r.seen = true;
    if (ok) {
      if (failedToday.has(current.id)) {
        r.level = 0;
        r.due = add(1);
      } else {
        r.level = Math.min(r.level + 1, LEARNED_LEVEL);
        r.due = add(steps[Math.min(r.level - 1, steps.length - 1)]);
      }
      if (!closedToday.has(current.id)) {
        closedToday.add(current.id);
        completed++;
      }
    } else {
      failedToday.add(current.id);
      r.level = 0;
      r.due = day();
      // Reinsert once at the end. It remains one of today's unique cards, so the total never grows.
      if (!queue.slice(idx + 1).some(c => c.id === current.id)) queue.push(current);
    }
    save();
    publishStatus();
    return out;
  }
  function next() {
    idx++;
  }
  /* ✎ on the answer screen (own words only): edit the card you're looking at. The session keeps running —
     the corrected text shows at once; WORDS and the queue hold the same card objects, so a card that
     comes back later in this round is already corrected. Progress is not touched. */
  function applyEditedCard(fresh) {
    if (!current || !fresh || fresh.id !== current.id) return false;
    Object.assign(current, fresh);
    return true;
  }
  /* Delete Word from the ✎ window (2026-10-26): the word leaves the collection (collection.js removes it and its
     progress), today's queue and the counter; the session goes on with the next word (or „Fertig für heute“).
     "empty": the collection is empty now → the page reloads („Where do you want to start?“). */
  function applyDeletedCard(id) {
    if (!current || current.id !== id) return false;
    delete state.cards[id];
    state.activeIds = state.activeIds.filter(x => x !== id);
    const w = WORDS.findIndex(c => c.id === id);
    if (w >= 0) WORDS.splice(w, 1);
    if (!WORDS.length) {
      save();
      return "empty";
    }
    queue = queue.filter((c, k) => k < idx || c.id !== id);
    sessionTotal = Math.max(0, sessionTotal - 1);
    if (closedToday.delete(id)) completed = Math.max(0, completed - 1);
    failedToday.delete(id);
    peekedToday.delete(id);
    save();
    publishStatus(idx >= queue.length);
    return true;
  }
  function newWordsLeft() {
    const ids = new Set(state.activeIds);
    return WORDS.filter(c => !ids.has(c.id)).length;
  }
  function newWordsLabel(n) {
    return n === 1 ? "1 neues Wort" : n + " neue Wörter";
  }
  /* The round is over. New words (step 6, 2026-09-26): the button says how many it really adds (+ 3 neue Wörter /
     + 1 neues Wort); with 10 or fewer left a note „Noch 8 neue Wörter“; with none left, an own collection gets
     „+ Neue Wörter“ (opens the collection window to add or import), else „Alle Wörter sind schon dabei.“
     v2.97: „… lernen“ = take new words into today's practice; „＋“ only for adding words to the set.
     canAddWords: the page can open the collection window (own collection). */
  function done(canAddWords) {
    publishStatus(true);
    const out = {
      counter: `${sessionTotal} / ${sessionTotal} heute`,
      score: sessionTotal ? `${sessionTotal} / ${sessionTotal} geschafft` : "", // v2.99: no „Gerade ist nichts fällig.“
      sessionTotal,
      button: null,
      note: ""
    };
    const remaining = newWordsLeft();
    const own = !!(root.WortschatzCollection && root.WortschatzCollection.isOwn() && canAddWords);
    if (remaining) {
      out.button = { action: "learn", text: remaining >= ADD_BATCH ? ADD_BATCH + " neue Wörter lernen" : newWordsLabel(remaining) + " lernen" };
      // v2.99: the note whenever 10 or fewer are left — also when the button already says the number (to make it clear)
      out.note = remaining <= 10 ? "Noch " + newWordsLabel(remaining) : "";
    } else if (own) {
      out.button = { action: "add", text: "＋ Neue Wörter" };
      out.note = "Alle Wörter sind schon dabei.";
    } else {
      out.note = "Alle Wörter sind schon dabei.";
    }
    return out;
  }
  function addFive() {
    const fresh = WORDS.filter(c => !state.activeIds.includes(c.id)).slice(0, ADD_BATCH);
    if (!fresh.length) return null;
    fresh.forEach(c => {
      state.activeIds.push(c.id);
      state.cards[c.id] = { level: 0, due: day() };
    });
    save();
    publishStatus(false);
    return fresh;
  }
  function dueCount() {
    return activeCards().filter(c => rec(c).due <= day()).length;
  }
  function cardsLabel(n) {
    return n === 1 ? "1 Karte" : n + " Karten";
  }
  /* START (2026-09-26): the session no longer starts on load. Cards due -> start screen; Starten -> build().
     Nothing due -> straight to "Fertig für heute" (the page calls build(), the round is over at once).
     No words -> „Where do you want to start?“ */
  function start() {
    if (!WORDS.length) {
      publishStatus(true);
      publishProgress();
      return "choose";
    }
    ensureDeck();
    const n = dueCount();
    publishStatus(n === 0);
    publishProgress();
    return n ? "start" : "done";
  }
  function startNote() {
    const left = newWordsLeft();
    return left > 10 ? "" : left ? "Noch " + newWordsLabel(left) : "Keine neuen Wörter mehr";
  }

  /* GERMAN VOICE ONLY (2026-09-27): a German voice is picked here instead of letting the phone choose; no German
     voice → null (the page hides the speaker). BEST VOICE FIRST (2026-11-07, Alena): Premium > Enhanced (Apple; the
     name is translated into the phone's language, so voiceURI is checked too) > any other voice, de-DE before other
     German, on-device before online (online voices fall silent offline). Apple's Eloquence novelty voices go last.
     voices: [{ voiceURI, name, lang, localService }] (the browser's voice list on the site). Ties keep the list order. */
  function germanVoiceScore(v) {
    const id = `${v.voiceURI || ""} ${v.name || ""}`;
    let score = 0;
    if (/premium/i.test(id)) score += 40;
    else if (/enhanced|erweitert|verbessert|улучш/i.test(id)) score += 30;
    if (/eloquence/i.test(v.voiceURI || "")) score -= 50;
    if (/^de[-_]DE$/i.test(v.lang || "")) score += 4;
    if (v.localService) score += 2;
    return score;
  }
  function pickGermanVoice(voices) {
    const de = (voices || []).filter(v => /^de([-_]|$)/i.test(v.lang || ""));
    let best = -Infinity,
      voice = null;
    for (const v of de) {
      const s = germanVoiceScore(v);
      if (s > best) {
        best = s;
        voice = v;
      }
    }
    return voice;
  }

  // Global names other files use (collection-window.js: the pace window, the progress after a change).
  root.WortschatzSetPace = setPace;
  root.publishWortschatzProgress = publishProgress;

  root.WortschatzRules = {
    STORE,
    LEARNED_LEVEL,
    INITIAL_WORDS,
    ADD_BATCH,
    SITZT_LEVEL,
    TOLERANT_FROM_LEVEL,
    MAX_HINTS,
    HINT_FIRST,
    HINT_LAST,
    CASE_HINT,
    VOICE_RATE: 0.88,
    get state() {
      return state;
    },
    get words() {
      return WORDS;
    },
    current: () => current,
    round: () => ({ queue, idx, sessionTotal, completed, failedToday, closedToday, peekedToday, hintsUsed, caseHinted, ghostShown }),
    start,
    startNote,
    build,
    card,
    peek,
    check,
    next,
    done,
    addFive,
    applyEditedCard,
    applyDeletedCard,
    auch,
    setPace,
    normalize,
    keepCase,
    targetParts,
    targets,
    isNoun,
    blankAtStart,
    caseRight,
    isClose,
    osa,
    loose,
    blankParts,
    revealParts,
    ghostParts,
    diffParts,
    rec,
    save,
    ensureDeck,
    activeCards,
    dueCount,
    newWordsLeft,
    newWordsLabel,
    cardsLabel,
    publishStatus,
    publishProgress,
    prepareTomorrowNotifications,
    writeNotificationDone,
    germanVoiceScore,
    pickGermanVoice
  };
})(typeof window !== "undefined" ? window : globalThis);
