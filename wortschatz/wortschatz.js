/* Wortschatz · game logic (v2.108). Styles: wortschatz.css. Word collection: collection.js + collection-window.js.
   Loaded last, after the components, words.js and the collection files. */
// App-side keyboard bridge: the reusable component only emits intent.
let ignoreContinueClickUntil = 0;
document.getElementById("continue")?.addEventListener("pointerdown", () => { ignoreContinueClickUntil = 0; }, true);
document.addEventListener("click", e => {
  if (isTouchDevice() && Date.now() < ignoreContinueClickUntil && e.target.closest("#continue")) {
    e.preventDefault(); e.stopImmediatePropagation(); ignoreContinueClickUntil = 0;
  }
}, true);
document.addEventListener("deutsch-keyboard-input", e => {
  const k = e.detail?.key || "",
    input = document.getElementById("answerInput");
  if (!input) return;
  if (k === "BACK") {
    input.value = input.value.slice(0, -1);
    return;
  }
  if (k === "OK") {
    if (input.value.trim()) ignoreContinueClickUntil = Date.now() + 1000;
    check();
    return;
  }
  if (k === "SPACE") {
    if (input.value.length && !input.value.endsWith(" ")) input.value += " ";
    return;
  }
  if (k) input.value += k;
});
function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

document.getElementById("desktopCheck").style.display = isTouchDevice() ? "none" : ""; // Prüfen only without a touch screen

/* Keyboard above the Home button (see the CSS block KEYBOARD ABOVE THE HOME BUTTON): when a long sentence on a
   small screen leaves no room for the keyboard at its place, sentence + translation shrink just enough (down to
   80%). Measured for every card, and again when the screen size changes. */
const SHORT_SCREEN = window.matchMedia("(max-height: 559px), (max-width: 340px) and (max-height: 609px)");
function fitTopZone() {
  const zone = document.querySelector("#question .topZone"),
    kb = document.getElementById("keyboard");
  if (!zone) return;
  zone.style.zoom = "";
  if (!kb || !kb.classList.contains("is-touch") || !kb.classList.contains("show") || SHORT_SCREEN.matches) return;
  if (document.getElementById("study").style.display === "none" || document.getElementById("question").classList.contains("hidden")) return;
  const over = document.documentElement.scrollHeight - innerHeight;
  if (over <= 0) return;
  const h = zone.offsetHeight;
  zone.style.zoom = Math.max(0.8, (h - over) / h).toFixed(3);
}
addEventListener("resize", fitTopZone);
async function loadKeyboardComponent() {
  const mount = document.getElementById("keyboardMount");
  if (!mount) return false;
  const r = await fetch("../components/deutsch-keyboard-v2.60.html");
  if (!r.ok) throw new Error("Keyboard component failed to load");
  const text = await r.text();
  const tpl = document.createElement("template");
  tpl.innerHTML = text;
  const scripts = [];
  tpl.content.querySelectorAll("script").forEach(s => {
    scripts.push(s.textContent);
    s.remove();
  });
  mount.appendChild(tpl.content);
  for (const code of scripts) {
    const s = document.createElement("script");
    s.textContent = code;
    document.body.appendChild(s);
  }
  const kb = document.getElementById("keyboard");
  window.deutschKeyboardReady = true;
  kb.classList.add("show"); // component itself stays hidden unless it detected a touch device
  fitTopZone();
  return true;
}

const $ = id => document.getElementById(id),
  STORE = "wortsternSRSv03",
  HOME_STATS = "deutschHomeStatsV1";
/* Own word collection (collection.js). 2026-10-26: there is no built-in set any more — without an own
   collection WORDS is empty and the start screen asks „Where do you want to start?“ (word sets / own words).
   Old Starter-Set progress is moved into an own collection once, before anything reads it.
   Everything below (deck, due count, notifications, progress) works on WORDS, so nothing else changes. */
if (window.WortschatzCollection && WortschatzCollection.needsLegacyMove()) WortschatzCollection.migrateLegacy("legacy/starter-set.js?v=1");
window.WORDS = window.WortschatzCollection && WortschatzCollection.isOwn() ? WortschatzCollection.cards() : [];
// Words that still carry the whole line of meanings (older cards, words from Bibliothek) or a guessed one:
// split / correct them in the background (meanings.js). The open session sees the change at once.
if (window.WortschatzMeanings && WORDS.length)
  WortschatzMeanings.fixCollection()
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

function publishWortschatzStatus(done = false) {
  try {
    const today = day();
    /* The due-word rule lives in components/deutsch-wortschatz-due-v1.js (shared with Home).
       If that file didn't load, fall back to counting here the same way. */
    let remaining;
    if (window.DeutschWortschatzDue) {
      remaining = DeutschWortschatzDue.count(state, new Set(WORDS.map(c => c.id))).remaining;
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
let steps = (window.WortschatzCollection && WortschatzCollection.PACES[WortschatzCollection.getPace()]) || [1, 8, 20, 45, 90];
window.WortschatzSetPace = pace => {
  if (window.WortschatzCollection && WortschatzCollection.PACES[pace]) steps = WortschatzCollection.PACES[pace];
};
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
// Calendar days "YYYY-MM-DD" in local time: the shared helper (components/deutsch-day-v1.js), same as Home.
const day = () => DeutschDay.key();
const add = n => DeutschDay.key(-n);
function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
  publishWortschatzProgress();
}
// Progress summary for Home (Documentation/PROGRESS_TRACKER.md, section 7):
// total = words in the active collection (kept for old readers, not shown) · started = words in the active set ·
// sitzt = level 3+ (passed the 8-day review) · learned = level 6 · collection = name of the active collection (v2.106).
const SITZT_LEVEL = 3;
function publishWortschatzProgress() {
  try {
    const ids = new Set(WORDS.map(c => c.id));
    const mine = state.activeIds.filter(id => ids.has(id));
    const lvl = id => state.cards[id]?.level || 0;
    const started = mine.length;
    const sitzt = mine.filter(id => lvl(id) >= SITZT_LEVEL).length;
    const learned = mine.filter(id => lvl(id) >= LEARNED_LEVEL).length;
    let collection = "";
    try {
      if (window.WortschatzCollection && WortschatzCollection.isOwn())
        collection = String(WortschatzCollection.get().name || "My Words");
    } catch (e) {}
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem("deutschProgressV1") || "null");
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
    localStorage.setItem("deutschProgressV1", JSON.stringify(data));
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
let hintsUsed = 0;
let queue = [],
  idx = 0,
  current = null,
  sessionTotal = 0,
  completed = 0,
  failedToday = new Set(),
  closedToday = new Set(),
  peekedToday = new Set(),
  ghostShown = false;
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
const HINT_FIRST = [
  "Sooo nah dran!",
  "Ups, fast! Nochmal?",
  "Die Buchstaben machen Quatsch.",
  "Knapp! Du hast es gleich."
];
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
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
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
const NOTIFICATION_SERVER = "https://german-learning-notifications.d45zgw2cgh.workers.dev";
const NOTIFICATION_USER_KEY = "deutschNotificationUserIdV1";
const NOTIFICATION_DEVICE_KEY = "deutschNotificationDeviceIdV1";

function getNotificationUserId() {
  let id = localStorage.getItem(NOTIFICATION_USER_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID ? crypto.randomUUID() : "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    } catch (e) {
      id = "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(NOTIFICATION_USER_KEY, id);
  }
  return id;
}

function getNotificationDeviceId() {
  let id = localStorage.getItem(NOTIFICATION_DEVICE_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID ? crypto.randomUUID() : "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    } catch (e) {
      id = "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(NOTIFICATION_DEVICE_KEY, id);
  }
  return id;
}

async function syncNotificationPool(pool) {
  try {
    const response = await fetch(NOTIFICATION_SERVER + "/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getNotificationUserId(),
        deviceId: getNotificationDeviceId(),
        date: pool.date,
        notifications: pool.notifications.map(item => ({
          id: item.id,
          de: item.sentence,
          ru: item.translation
        }))
      })
    });
    if (!response.ok) throw new Error("pool-" + response.status);
    console.log("[German Learning] Notification pool synced:", pool.date);
    return true;
  } catch (e) {
    console.warn("[German Learning] Could not sync notification pool:", e);
    return false;
  }
}

async function publishNotificationDone() {
  const event = { date: day(), done: true, completedAt: Date.now() };
  try {
    localStorage.setItem("deutschNotificationDoneV1", JSON.stringify(event));
    const response = await fetch(NOTIFICATION_SERVER + "/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getNotificationUserId(),
        deviceId: getNotificationDeviceId(),
        date: event.date
      })
    });
    if (!response.ok) throw new Error("done-" + response.status);
    console.log("[German Learning] DONE synced:", event);
  } catch (e) {
    console.warn("[German Learning] Could not sync DONE event:", e);
  }
  return event;
}

function prepareTomorrowNotifications(limit = 4) {
  const tomorrow = add(1);
  const candidates = activeCards().filter(c => rec(c).due === tomorrow);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const notifications = shuffled.slice(0, Math.min(4, limit)).map(c => ({
    id: c.id,
    sentence: c.revealed || c.sentence || "",
    translation: getTranslation(c, "sentenceTranslation")
  }));
  const pool = { date: tomorrow, notifications, createdAt: Date.now() };
  try {
    localStorage.setItem("deutschNotificationPoolV1", JSON.stringify(pool));
    console.log("[German Learning] Tomorrow notification pool:", pool);
  } catch (e) {
    console.warn("[German Learning] Could not save notification pool:", e);
  }
  syncNotificationPool(pool);
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
  publishWortschatzStatus(queue.length === 0);
  publishWortschatzProgress();
  render();
}
function blankHTML(c) {
  return c.blank.replace(/_____/g, "<span class='blank' aria-label='missing word'></span>");
}
// The answer's parts are marked in the sentence. They are searched in the plain sentence, left to right, as whole
// word starts - never inside markup already added (2026-10-23: „an“ of „melde … an“ was found inside „<span“ and broke
// the line). A part that isn't found (the other alternative of „A / B“) is skipped.
function revealHTML(c) {
  const text = String(c.revealed || "");
  let out = "",
    pos = 0;
  for (const t of targetParts(c)) {
    const e = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp("(^|[^\\p{L}])(" + e + ")", "u").exec(text.slice(pos)); // word start (an ≠ k-an-n); may end inside a word (eigen-e)
    if (!m) continue;
    const start = pos + m.index + m[1].length;
    out += esc(text.slice(pos, start)) + "<span class='target'>" + esc(t) + "</span>";
    pos = start + t.length;
  }
  return out + esc(text.slice(pos));
}
function render() {
  if (idx >= queue.length) {
    showDone();
    return;
  }
  current = queue[idx];
  $("counter").textContent = `${completed} / ${sessionTotal} heute`;
  $("bar").style.width = `${sessionTotal ? (completed / sessionTotal) * 100 : 100}%`;
  $("sentence").innerHTML = blankHTML(current);
  $("translation").textContent = getTranslation(current, "sentenceTranslation");
  $("answerInput").value = "";
  hintsUsed = 0;
  $("answerInput").classList.remove("almost", "nudge");
  $("almostHint").classList.remove("show");
  $("almostHint").textContent = "";
  $("question").classList.remove("hidden");
  setupPeek();
  $("feedback").className = "feedback";
  $("feedbackShell").className = "feedbackShell";
  $("feedbackShell").style.transform = "";
  $("feedbackShell").style.opacity = "";
  if (window.deutschKeyboardReady) {
    $("keyboard").classList.add("show");
  }
  fitTopZone();
  if (innerWidth >= 700) setTimeout(() => $("answerInput").focus(), 30);
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function diffHTML(typed, correct) {
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
    j = 0,
    top = [],
    bottom = [];
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      top.push(`<span class="diffSame">${esc(a[i])}</span>`);
      bottom.push(`<span class="diffSame">${esc(b[j])}</span>`);
      i++;
      j++;
      continue;
    }
    const sub = i < m && j < n ? dp[i + 1][j + 1] : 1e9,
      del = i < m ? dp[i + 1][j] : 1e9,
      ins = j < n ? dp[i][j + 1] : 1e9;
    if (sub <= del && sub <= ins) {
      top.push(`<span class="diffWrong">${esc(a[i])}</span>`);
      bottom.push(`<span class="diffMissing">${esc(b[j])}</span>`);
      i++;
      j++;
    } else if (del <= ins) {
      top.push(`<span class="diffWrong">${esc(a[i])}</span>`);
      i++;
    } else {
      bottom.push(`<span class="diffMissing">${esc(b[j])}</span>`);
      j++;
    }
  }
  return [top.join(""), bottom.join("")];
}
// The answer as shown in green: lower case like the typed text, but a noun (base „der/die/das …“) starts with a capital.
function shownAnswer(c, text) {
  const t = normalize(text);
  return /^(der|die|das)\s/i.test(String((c && c.base) || ""))
    ? t.charAt(0).toLocaleUpperCase("de-DE") + t.slice(1)
    : t;
}
/* 👁 — first showing of a new word (2026-10-26): try to remember it yourself, or tap the eye and copy it. */
function setupPeek() {
  ghostShown = false;
  const r = rec(current),
    can = r.level === 0 && !r.seen && !failedToday.has(current.id) && !peekedToday.has(current.id);
  $("ghostEye").classList.toggle("show", can);
  $("ghostEye").classList.remove("used");
  $("question").classList.toggle("peek", can);
}
$("ghostEye").onclick = e => {
  e.preventDefault();
  if (!current || ghostShown || !$("ghostEye").classList.contains("show")) return;
  ghostShown = true;
  peekedToday.add(current.id);
  $("sentence").innerHTML = ghostHTML(current);
  $("ghostEye").classList.add("used");
  fitTopZone();
  if (innerWidth >= 700) $("answerInput").focus();
};
// The gaps filled with the hidden words, faintly: taken from the cloze marks in order ({{c1::schlage}} … {{c1::vor}});
// without them, the first answer split into words when that matches the number of gaps.
function ghostHTML(c) {
  const blanks = (String(c.blank || "").match(/_____/g) || []).length;
  let words = [...String(c.sentence || "").matchAll(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g)].map(m => m[1]);
  if (words.length !== blanks) {
    const first = (targetParts(c)[0] || "").split(/\s+/).filter(Boolean);
    words = first.length === blanks ? first : blanks === 1 ? [targetParts(c)[0] || ""] : [];
  }
  if (!words.length) return blankHTML(c);
  let i = 0;
  return esc(c.blank).replace(/_____/g, () => "<span class='ghost'>" + esc(words[i++] || "") + "</span>");
}
// Copying is not an answer: a slip only shakes the field; done → neutral answer screen, level and date stay,
// the word comes back at the end of this session with an empty gap.
function checkCopy(typed) {
  const matched = targets(current).find(t => normalize(t) === typed),
    f = $("answerInput");
  if (!matched) {
    f.classList.add("almost");
    f.classList.remove("nudge");
    void f.offsetWidth;
    f.classList.add("nudge");
    return;
  }
  ghostShown = false;
  $("question").classList.add("hidden");
  $("keyboard")?.classList.remove("show");
  $("feedbackShell").className = "feedbackShell show";
  $("feedback").className = "feedback show neutral";
  $("answerSentence").innerHTML = revealHTML(current);
  $("answerTranslation").textContent = getTranslation(current, "sentenceTranslation");
  $("targetForm").textContent = shownAnswer(current, matched);
  $("targetForm").style.display = "inline-block";
  $("typedDiff").innerHTML = "";
  $("correctDiff").innerHTML = "";
  $("base").textContent = current.base;
  $("meaning").textContent = getTranslation(current, "translation");
  drawAuch();
  $("grammar").textContent = getTranslation(current, "grammar");
  fitAnswer();
  rec(current).seen = true;
  if (!queue.slice(idx + 1).some(c => c.id === current.id)) queue.push(current);
  save();
  updateEditButton();
}
function check() {
  let typed = normalize($("answerInput").value);
  if (!typed) return;
  if (ghostShown) return checkCopy(typed);
  const opts = targets(current),
    matched = opts.find(t => normalize(t) === typed);
  let ok = !!matched;
  const r = rec(current);
  const tolerant = (r.level || 0) >= TOLERANT_FROM_LEVEL && !failedToday.has(current.id);
  if (!ok && tolerant && hintsUsed < MAX_HINTS && opts.some(t => isClose(typed, t))) {
    hintsUsed++;
    $("almostHint").textContent = pickOne(hintsUsed >= MAX_HINTS ? HINT_LAST : HINT_FIRST);
    $("almostHint").classList.add("show");
    const f = $("answerInput");
    f.classList.add("almost");
    f.classList.remove("nudge");
    void f.offsetWidth;
    f.classList.add("nudge");
    return;
  }
  // For an error, compare against the closest accepted answer so the highlighted difference is useful.
  let correct = opts[0] || "";
  if (!ok && opts.length > 1) {
    correct = [...opts].sort((x, y) => osa(typed, normalize(x)) - osa(typed, normalize(y)))[0];
  } else if (ok) correct = matched;
  $("question").classList.add("hidden");
  $("keyboard")?.classList.remove("show");
  $("feedbackShell").className = "feedbackShell show";
  $("feedback").className = "feedback show " + (ok ? "good" : "bad");
  $("answerSentence").innerHTML = revealHTML(current);
  $("answerTranslation").textContent = getTranslation(current, "sentenceTranslation");
  $("targetForm").textContent = shownAnswer(current, correct);
  $("targetForm").style.display = ok ? "inline-block" : "none";
  if (!ok) {
    const [top, bottom] = diffHTML(typed, normalize(correct));
    $("typedDiff").innerHTML = top;
    $("correctDiff").innerHTML = bottom;
  } else {
    $("typedDiff").innerHTML = "";
    $("correctDiff").innerHTML = "";
  }
  $("base").textContent = current.base;
  $("meaning").textContent = getTranslation(current, "translation");
  drawAuch();
  $("grammar").textContent = getTranslation(current, "grammar");
  fitAnswer();
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
  publishWortschatzStatus();
  updateEditButton();
}
/* ✎ on the answer screen (own words only): edit the card you're looking at. The session keeps running —
   the corrected text shows at once; WORDS and the queue hold the same card objects, so a card that
   comes back later in this round is already corrected. Progress is not touched. */
function updateEditButton() {
  const b = $("editCard");
  if (!b) return;
  b.classList.toggle("own", !!(current && window.WortschatzCollectionWindow && String(current.id).charAt(0) === "u"));
}
function applyEditedCard(fresh) {
  if (!current || !fresh || fresh.id !== current.id) return;
  Object.assign(current, fresh);
  $("answerSentence").innerHTML = revealHTML(current);
  $("answerTranslation").textContent = getTranslation(current, "sentenceTranslation");
  $("base").textContent = current.base;
  $("meaning").textContent = getTranslation(current, "translation");
  drawAuch();
  $("grammar").textContent = getTranslation(current, "grammar");
  if ($("targetForm").style.display !== "none")
    $("targetForm").textContent = shownAnswer(current, targets(current).join(" "));
  fitAnswer();
}
/* Delete Word from the ✎ window (2026-10-26): the word leaves the collection (collection.js removes it and its
   progress), today's queue and the counter; the session goes on with the next word (or „Fertig für heute“). */
function applyDeletedCard(id) {
  if (!current || current.id !== id) return;
  delete state.cards[id];
  state.activeIds = state.activeIds.filter(x => x !== id);
  const w = WORDS.findIndex(c => c.id === id);
  if (w >= 0) WORDS.splice(w, 1);
  if (!WORDS.length) {
    save();
    location.reload(); // the collection is empty now → „Where do you want to start?“
    return;
  }
  queue = queue.filter((c, k) => k < idx || c.id !== id);
  sessionTotal = Math.max(0, sessionTotal - 1);
  if (closedToday.delete(id)) completed = Math.max(0, completed - 1);
  failedToday.delete(id);
  peekedToday.delete(id);
  save();
  publishWortschatzStatus(idx >= queue.length);
  render();
}
/* „auch: …“ (2026-10-26): the word's other meanings, quiet, under the trained one. Up to 2 shown (first synonym of each);
   more → „+N“, a tap shows them all. */
function drawAuch() {
  const box = $("auch");
  if (!box) return;
  box.textContent = "";
  const others = window.WortschatzMeanings ? WortschatzMeanings.parts(getTranslation(current, "otherMeanings"), ";") : [];
  if (!others.length) return;
  const first = s => (window.WortschatzMeanings.parts(s, ",")[0] || s);
  const label = document.createElement("b");
  label.textContent = "auch: ";
  box.appendChild(label);
  const shown = others.length <= 2 ? others : others.slice(0, 2).map(first);
  box.appendChild(document.createTextNode(shown.join(" · ")));
  if (others.length > 2) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "auchMore";
    more.textContent = "+" + (others.length - 2);
    more.setAttribute("aria-label", "Alle Bedeutungen zeigen");
    more.onclick = e => {
      e.stopPropagation();
      box.textContent = "";
      box.appendChild(label);
      box.appendChild(document.createTextNode(others.join(" · ")));
    };
    box.appendChild(document.createTextNode(" · "));
    box.appendChild(more);
  }
}
/* Long words (2026-10-26): a word wider than the answer area gets a smaller font instead of running off the edge. */
function fitWide(el, widthOf) {
  if (!el) return;
  el.style.fontSize = "";
  const box = $("feedback").clientWidth,
    w = widthOf(el);
  if (box && w > box) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = Math.max(12, Math.floor((fs * box) / w * 0.97)) + "px";
  }
}
function fitAnswer() {
  if (!$("feedback").classList.contains("show")) return;
  const scroll = el => el.scrollWidth;
  fitWide($("targetForm"), scroll);
  fitWide($("typedDiff"), scroll);
  fitWide($("correctDiff"), scroll);
  fitWide($("answerSentence"), el => Math.max(0, ...[...el.querySelectorAll(".target")].map(t => t.getBoundingClientRect().width)));
}
addEventListener("resize", fitAnswer);
if ($("editCard"))
  $("editCard").onclick = e => {
    e.stopPropagation();
    if (current) WortschatzCollectionWindow.editInSession(current, applyEditedCard, applyDeletedCard);
  };
function showDone() {
  publishWortschatzStatus(true);
  if (sessionTotal > 0) {
    publishNotificationDone();
    prepareTomorrowNotifications();
  }
  $("study").style.display = "none";
  $("done").className = "done show";
  $("counter").textContent = `${sessionTotal} / ${sessionTotal} heute`;
  $("bar").style.width = "100%";
  $("doneScore").textContent = sessionTotal ? `${sessionTotal} / ${sessionTotal} geschafft` : ""; // v2.99: no „Gerade ist nichts fällig.“ — „Fertig für heute. Komm morgen wieder.“ says it
  /* New words (step 6, 2026-09-26): the button says how many it really adds (+ 3 neue Wörter / + 1 neues Wort);
    with 6–10 left, a grey line „Noch 8 neue Wörter“ (start screen: 1–10); with none left, an own collection gets
    „+ Neue Wörter“ (opens the collection window to add or import), the built-in set keeps „Alle Wörter sind schon dabei.“ */
  const remaining = newWordsLeft();
  const own = !!(window.WortschatzCollection && WortschatzCollection.isOwn() && window.WortschatzCollectionWindow);
  const btn = $("addWords"),
    note = $("allAdded");
  /* v2.97: „… lernen“ = take new words into today's practice; „＋“ only for adding words to the set */
  if (remaining) {
    btn.textContent = remaining >= ADD_BATCH ? ADD_BATCH + " neue Wörter lernen" : newWordsLabel(remaining) + " lernen";
    btn.style.display = "block";
    // v2.99: red note whenever 10 or fewer are left — also when the button already says the number (to make it clear)
    const showNote = remaining <= 10;
    note.textContent = showNote ? "Noch " + newWordsLabel(remaining) : "";
    note.style.display = showNote ? "block" : "none";
  } else if (own) {
    btn.textContent = "＋ Neue Wörter";
    btn.style.display = "block";
    note.textContent = "Alle Wörter sind schon dabei.";
    note.style.display = "block";
  } else {
    btn.style.display = "none";
    note.textContent = "Alle Wörter sind schon dabei.";
    note.style.display = "block";
  }
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.refreshButtons(); // started count may have changed
  layoutDone();
}
/* Done screen height (v2.97): from its top down to 28px above the version number, so the buttons sit low
   and the DEINE WÖRTER block is centred between „Fertig für heute.“ and the buttons. */
function layoutDone() {
  const inner = $("doneInner"),
    vm = document.querySelector(".version-mark");
  if (!inner || !$("done").classList.contains("show")) return;
  inner.style.minHeight = "";
  const top = inner.getBoundingClientRect().top,
    vmTop = vm ? vm.getBoundingClientRect().top : innerHeight;
  inner.style.minHeight = Math.max(0, Math.round(vmTop - top - 28)) + "px";
}
addEventListener("resize", layoutDone);
function newWordsLeft() {
  const ids = new Set(state.activeIds);
  return WORDS.filter(c => !ids.has(c.id)).length;
}
function newWordsLabel(n) {
  return n === 1 ? "1 neues Wort" : n + " neue Wörter";
}
function addFive() {
  const fresh = WORDS.filter(c => !state.activeIds.includes(c.id)).slice(0, ADD_BATCH);
  if (!fresh.length) return;
  fresh.forEach(c => {
    state.activeIds.push(c.id);
    state.cards[c.id] = { level: 0, due: day() };
  });
  save();
  publishWortschatzStatus(false);
  $("done").className = "done";
  $("study").style.display = "flex";
  build(fresh);
}
function next() {
  idx++;
  render();
}
$("addWords").onclick = () => {
  if (newWordsLeft()) addFive();
  else if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.open();
};
$("desktopCheck").onclick = check;
$("continue").onclick = next;
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || innerWidth < 700) return;
  if (!$("feedback").classList.contains("show")) return;
  e.preventDefault();
  next();
});
$("answerInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    check();
  }
});
/* GERMAN VOICE ONLY (2026-09-27): we pick a German voice ourselves instead of letting
   the phone choose. If the device has no German voice, the speaker icon is hidden
   (body.noGermanVoice) and tapping the sentence does nothing - never a wrong-language voice.
   The voice list can arrive late, so we re-check on voiceschanged and a few times after load. */
let germanVoice = null;
function pickGermanVoice() {
  const voices = "speechSynthesis" in window ? speechSynthesis.getVoices() : [];
  const de = voices.filter(v => /^de([-_]|$)/i.test(v.lang || ""));
  const isDeDE = v => /^de[-_]DE$/i.test(v.lang);
  germanVoice =
    de.find(v => isDeDE(v) && v.localService) ||
    de.find(isDeDE) ||
    de.find(v => v.localService) ||
    de[0] ||
    null;
  document.body.classList.toggle("noGermanVoice", !germanVoice);
}
pickGermanVoice();
if ("speechSynthesis" in window) {
  speechSynthesis.addEventListener("voiceschanged", pickGermanVoice);
  [500, 1500, 4000].forEach(ms => setTimeout(pickGermanVoice, ms));
}
function speakCurrent() {
  if (!germanVoice) return;
  speechSynthesis.cancel();
  let u = new SpeechSynthesisUtterance(current.revealed);
  u.voice = germanVoice;
  u.lang = germanVoice.lang;
  u.rate = 0.88;
  speechSynthesis.speak(u);
}
$("feedback").addEventListener("click", e => {
  if (e.target.closest("#answerTop,#speakTop")) speakCurrent();
});
/* START SCREEN (2026-09-26): the session no longer starts on load.
   Cards due -> start screen with today's count; Starten -> the same build() as before.
   Nothing due -> straight to "Fertig für heute", exactly as before.
   The keyboard loads in the background; render() shows it once it's ready. */
const START_ABOUT = {
  text: {
    en: "Helps you remember words in real sentences. Each word comes back just before you'd forget it - and less and less often over time.",
    ru: "Помогает запоминать слова в живых предложениях. Каждое слово возвращается как раз перед тем, как забудется, - и со временем всё реже."
  }
};
$("aboutText").textContent = getTranslation(START_ABOUT, "text");
$("aboutToggle").onclick = () => {
  const a = $("startAbout"),
    open = !a.classList.contains("open");
  a.classList.toggle("open", open);
  $("aboutToggle").setAttribute("aria-expanded", open ? "true" : "false");
};
function dueCount() {
  return activeCards().filter(c => rec(c).due <= day()).length;
}
function cardsLabel(n) {
  return n === 1 ? "1 Karte" : n + " Karten";
}
function showStart() {
  if (!WORDS.length) return showChoose();
  ensureDeck();
  const n = dueCount();
  publishWortschatzStatus(n === 0);
  publishWortschatzProgress();
  if (!n) {
    build();
    return;
  } // nothing due -> "Fertig für heute" as before
  // v2.102: no „Heute: 12 Karten“ — the session counter shows it once you start
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.refreshButtons(); // „15 / 217 Wörter angefangen“
  const left = newWordsLeft();
  $("startNote").textContent = left > 10 ? "" : left ? "Noch " + newWordsLabel(left) : "Keine neuen Wörter mehr";
  $("done").className = "done";
  $("study").style.display = "none";
  $("start").classList.add("show");
  layoutStart();
}
/* Start screen height (v2.96): fill the space down to the „Worum geht's?“ description, so Starten sits low
   and the DEINE WÖRTER block is centred between the title and the buttons (flex + margin:auto). */
function layoutStart() {
  const st = $("choose").classList.contains("show") ? $("choose") : $("start"),
    about = $("startAbout");
  if (!st || !st.classList.contains("show")) return;
  st.style.minHeight = "";
  if (about) about.classList.add("measure"); // measure as if unfolded (v2.105): buttons never move when it opens
  const top = st.getBoundingClientRect().top,
    aboutTop = about ? about.getBoundingClientRect().top : innerHeight;
  if (about) about.classList.remove("measure");
  st.style.minHeight = Math.max(0, Math.round(aboutTop - top - 36)) + "px";
}
addEventListener("resize", layoutStart);
/* CHOOSE SCREEN (2026-10-26): no words yet → word sets (quick start) or own words. Same layout as the start
   screen; the set lines use the start screen's collection-line look (no frames). */
function showChoose() {
  publishWortschatzStatus(true);
  publishWortschatzProgress();
  $("done").className = "done";
  $("study").style.display = "none";
  $("start").classList.remove("show");
  $("choose").classList.add("show");
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.fillChoose($("chooseSets"), $("chooseOwn"));
  layoutStart();
}
function startSession() {
  $("start").classList.remove("show");
  $("study").style.display = "flex";
  build();
}
$("startBtn").onclick = startSession;
showStart();
// Desktop: Enter on the start screen = Starten
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && $("start").classList.contains("show") && !$("collModal").classList.contains("open")) {
    e.preventDefault();
    startSession();
  }
});
loadKeyboardComponent().catch(e => console.error(e));

function goBackToHome() {
  try {
    if (window.parent && window.parent !== window) {
      if (typeof window.parent.closeApp === "function") {
        window.parent.closeApp();
        return;
      }
      const parentDoc = window.parent.document;
      const shell = parentDoc.getElementById("appShell");
      const frame = parentDoc.getElementById("appFrame");
      if (shell && frame) {
        shell.classList.remove("open");
        shell.setAttribute("aria-hidden", "true");
        parentDoc.documentElement.classList.remove("app-open");
        frame.src = "about:blank";
        return;
      }
    }
  } catch (e) {}
  window.parent.postMessage({ type: "deutsch:home" }, "*");
}
document.getElementById("homeBack").onclick = goBackToHome;
