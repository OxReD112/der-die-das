/* Verben mit Präpositionen — script. Markup: index.html · styles: verben_mit_praepositionen.css
   Verbs: verbs.js (window.VERBEN_MIT_PRAEPOSITIONEN). When this file changes, raise its ?v= in index.html,
   the Präpositionen page's verben_mit_praepositionen/index.html?v= and the Home tile's praepositionen/?v=

   A card: meaning (Your Language) + verb → type the preposition → pick the case (Akkusativ / Dativ;
   skipped for arbeiten als + Nominativ) → answer with the example sentence. */

const DATA = window.VERBEN_MIT_PRAEPOSITIONEN || [];
const $ = id => document.getElementById(id);

function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}
const IS_TOUCH = isTouchDevice();
document.documentElement.classList.toggle("is-touch", IS_TOUCH);

// Phone sideways / large text: the round flows from the top instead of the two zones (see the CSS)
const SHORT_SCREEN = window.matchMedia("(max-height: 559px)");

/* ===== START-SCREEN DESCRIPTION ===== „Worum geht's?“, in the user's language so it is surely understood */
const START_ABOUT = {
  text: {
    en: "Some verbs always come with the same preposition. A little practice helps you remember which one - and the case after it.",
    ru: "Некоторые глаголы всегда идут с определённым предлогом. Немного практики - и легче запомнить, с каким именно и какой после него падеж."
  }
};
$("aboutText").textContent = getTranslation(START_ABOUT, "text");

/* ===== CASES =====
   The case buttons are built from the cases that occur in the verbs (currently Akkusativ + Dativ).
   A verb whose case has no button (arbeiten als + Nominativ) skips the case step. */
const CASE_ORDER = ["Akkusativ", "Dativ", "Genitiv"];
const CHOICE_CASES = CASE_ORDER.filter(c => DATA.some(x => x.case === c));
const asksCase = x => CHOICE_CASES.includes(x.case);

/* ===== STATS (weak spots) =====
   Preposition and case are tracked separately per verb ("<id>|prep", "<id>|case") over the last 5 rounds.
   They drive the „Noch üben“ list on the summary (and seeded the difficulty scores once, below). */
const STATS_STORE = "verbenPraepStatsV1";
const SESSION_WINDOW = 5,
  MIN_ATTEMPTS = 2,
  ERROR_THRESHOLD = 0.4;
let statsStore = { sessions: [] };
try {
  statsStore = JSON.parse(localStorage.getItem(STATS_STORE) || '{"sessions":[]}');
} catch (e) {
  statsStore = { sessions: [] };
}
if (!statsStore || typeof statsStore !== "object") statsStore = { sessions: [] };
if (!Array.isArray(statsStore.sessions)) statsStore.sessions = [];

function saveStats() {
  try {
    localStorage.setItem(STATS_STORE, JSON.stringify(statsStore));
  } catch (e) {}
}

function currentStats() {
  const map = {};
  statsStore.sessions.forEach((session, s) => {
    const weight = s + 1; // newer rounds count more
    for (const [key, v] of Object.entries(session.answers || {})) {
      if (!map[key]) map[key] = { wc: 0, ww: 0, attempts: 0 };
      map[key].wc += (v.correct || 0) * weight;
      map[key].ww += (v.wrong || 0) * weight;
      map[key].attempts += (v.correct || 0) + (v.wrong || 0);
    }
  });
  for (const v of Object.values(map)) {
    const total = v.wc + v.ww;
    v.errorRate = total ? v.ww / total : 0;
    v.weak = v.attempts >= MIN_ATTEMPTS && v.errorRate >= ERROR_THRESHOLD;
  }
  return map;
}

/* ===== DIFFICULTY per verb (Documentation/PROGRESS_TRACKER.md) =====
   Common scale 1–4: wrong +1, right −0.5. A verb counts as right only if preposition AND case are right.
   Stored inside the same key (verbenPraepStatsV1 → .difficulty), so Backup already covers it.
   Format marker "__format": 2. Old data has none → the starting scores are seeded ONCE from the
   session stats: 1 + error rate × 3, rounded to 0.5 (never missed → 1, always missed → 4). */
const DIFFICULTY_FORMAT = 2;
if (statsStore.__format !== DIFFICULTY_FORMAT || !statsStore.difficulty || typeof statsStore.difficulty !== "object") {
  const stats = currentStats(),
    seeded = {};
  DATA.forEach(x => {
    const p = stats[x.id + "|prep"],
      c = stats[x.id + "|case"];
    if (!p && !c) return;
    const err = Math.max(p?.errorRate || 0, c?.errorRate || 0);
    seeded[x.id] = Math.min(4, Math.max(1, Math.round((1 + err * 3) * 2) / 2));
  });
  statsStore.difficulty = seeded;
  statsStore.__format = DIFFICULTY_FORMAT;
  saveStats();
}
function weightFor(x) {
  return Math.max(1, Number(statsStore.difficulty[x.id] || 1));
}
function updateDifficulty(x, ok) {
  let d = weightFor(x);
  d = ok ? Math.max(1, d - 0.5) : Math.min(4, d + 1);
  statsStore.difficulty[x.id] = Number(d.toFixed(2));
  saveStats();
}

/* ===== PROGRESS (one item per verb) ===== guarded: the exercise keeps working if the helper is missing */
const PROGRESS_ID = "verbenMitPraepositionen";
const hasProgress = () => typeof window.DeutschProgress === "object";
if (hasProgress()) {
  DeutschProgress.init(
    PROGRESS_ID,
    DATA.map(x => ({ key: x.id, label: `${x.verb} ${x.preposition} + ${x.case}` }))
  );
}

/* ===== DAILY STATS (Home: „Heute“) ===== */
const DAILY_STATS_KEY = "deutschDailyStatsV1";
function recordDaily(correct) {
  try {
    const today = DeutschDay.key();
    let data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
    if (data.date !== today) data = { date: today };
    if (!data.verbenMitPraepositionen) data.verbenMitPraepositionen = { answers: 0, correct: 0 };
    data.verbenMitPraepositionen.answers++;
    if (correct) data.verbenMitPraepositionen.correct++;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ===== SESSION ===== */
let session = [],
  index = 0,
  phase = "type", // "type" → "case" (if the verb asks for one) → "answer"
  typed = "";
let prepOK = false,
  caseOK = null,
  chosenCase = null,
  caseShownAt = 0;
let score = { full: 0, prep: 0, cas: 0, casTotal: 0 },
  sessionAnswers = {},
  liveSession = null;

// Weighted sampling without replacement by the verb's difficulty score (like Artikel)
function buildSession(size) {
  return DATA.map(x => ({ x, k: -Math.log(Math.max(Math.random(), 1e-12)) / weightFor(x) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.min(size, DATA.length))
    .map(o => o.x);
}

// Stats are saved after every answer, so leaving mid-round keeps them.
// The round is added to the history on its first answer (empty rounds never are).
function mark(key, ok) {
  const v = sessionAnswers[key] || { correct: 0, wrong: 0 };
  if (ok) v.correct++;
  else v.wrong++;
  sessionAnswers[key] = v;
  if (!liveSession) {
    liveSession = { date: DeutschDay.key(), answers: sessionAnswers };
    statsStore.sessions.push(liveSession);
    if (statsStore.sessions.length > SESSION_WINDOW) statsStore.sessions = statsStore.sessions.slice(-SESSION_WINDOW);
  }
  saveStats();
}

const norm = s =>
  s
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
// ae / oe / ue count as ä / ö / ü
function prepMatches(input, target) {
  const a = norm(input),
    b = norm(target);
  return a === b || a.replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü") === b;
}

/* ===== SCREENS ===== */
const inRound = () => !$("game").classList.contains("hidden");

// Every screen and every new card starts at the top (on short screens the panel scrolls)
function scrollToTop() {
  document.querySelector(".app").scrollTop = 0;
}

function showScreen(id) {
  ["start", "game", "done"].forEach(s => $(s).classList.toggle("hidden", s !== id));
  scrollToTop();
}

function start(size) {
  session = buildSession(size);
  index = 0;
  score = { full: 0, prep: 0, cas: 0, casTotal: 0 };
  sessionAnswers = {};
  liveSession = null;
  showScreen("game");
  render();
}

/* ===== QUESTION ===== */
function render() {
  const x = session[index];
  phase = "type";
  typed = "";
  prepOK = false;
  caseOK = null;
  chosenCase = null;
  $("counter").textContent = index + 1 + " / " + session.length;
  $("bar").style.width = (index / session.length) * 100 + "%";
  $("verb").textContent = x.verb;
  $("meaning").textContent = getTranslation(x, "meaning");
  buildGap();
  // The slot for „+ Kasus“ is always reserved, so the meaning and the line never move
  $("caseLine").className = "case-line off";
  $("caseLine").innerHTML = "&nbsp;";
  $("caseLine").setAttribute("aria-hidden", "true");
  $("caseQuestion").classList.add("off");
  $("caseStep").classList.add("hidden");
  paintGap();
  $("check").classList.remove("hidden");
  $("feedback").className = "feedback hidden";
  $("finalFeedback").classList.add("hidden");
  $("prepFeedback").classList.remove("hidden");
  if (window.deutschKeyboardReady) $("keyboard").classList.add("show");
  $("kbZone").classList.remove("kb-off");
  fitSentence();
  placeQuestion();
  scrollToTop();
  focusGap();
}

// The blank under the verb: a hidden mirror gives it its width, a real text field sits on top of it
function buildGap() {
  const gap = $("gap");
  gap.className = "gap typing";
  const mirror = document.createElement("span");
  mirror.className = "gap-mirror";
  mirror.id = "gapMirror";
  const input = document.createElement("input");
  input.className = "gap-input";
  input.id = "gapInput";
  input.type = "text";
  input.placeholder = " ";
  input.maxLength = 20;
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "Präposition");
  gap.replaceChildren(mirror, input);
  if (IS_TOUCH) {
    // Phones use the in-app German keyboard; the system keyboard never opens
    input.readOnly = true;
    input.tabIndex = -1;
    input.setAttribute("inputmode", "none");
  } else {
    input.addEventListener("input", () => {
      typed = input.value;
      paintGap();
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        submitPrep();
      }
    });
  }
}

function paintGap() {
  const input = $("gapInput"),
    mirror = $("gapMirror");
  if (!input) return;
  if (input.value !== typed) input.value = typed;
  mirror.textContent = typed;
  fitSentence();
}

function focusGap() {
  if (IS_TOUCH || phase !== "type") return;
  const input = $("gapInput");
  if (input && document.activeElement !== input) input.focus({ preventScroll: true });
}

// Keep verb + blank on one line: shrink only when the line is wider than the screen
function fitSentence() {
  const el = $("sentence");
  el.style.fontSize = "";
  const available = $("prompt").clientWidth;
  const width = el.scrollWidth;
  if (width > available && available > 0) {
    el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * available) / width) * 0.97 + "px";
  }
}

// Phone: the question starts at the same height as in Ortspräpositionen (69px below the top bar's line).
// The keyboard is lifted by exactly as much as the question was lifted, so the distances between the
// question, the keyboard and the case buttons stay what they were when the question was centred.
// Measured once per round (again on resize / when the keyboard has loaded), so nothing moves between cards.
// Phone sideways: not needed, the round flows from the top (see the CSS).
let questionPlaced = false;
function placeQuestion(force) {
  if (!IS_TOUCH || SHORT_SCREEN.matches || (questionPlaced && !force)) return;
  const root = document.documentElement;
  root.classList.add("vmp-measure"); // original layout: question centred, keyboard low
  const centredTop = document.querySelector(".anchor").getBoundingClientRect().top;
  root.classList.remove("vmp-measure");
  const target = document.querySelector("#game .top").getBoundingClientRect().bottom + 69;
  const zoneTop = document.querySelector(".qzone").getBoundingClientRect().top;
  root.style.setProperty("--vmp-question-top", Math.max(0, Math.round(target - zoneTop)) + "px");
  root.style.setProperty("--vmp-lift", Math.max(0, Math.round(centredTop - target)) + "px");
  questionPlaced = true;
}

window.addEventListener("resize", () => {
  if (!inRound()) return;
  fitSentence();
  placeQuestion(true);
});

/* ===== STEP 1 — PREPOSITION ===== the whole line + glow shows the preposition result */
function submitPrep() {
  if (phase !== "type" || !typed.trim()) return;
  const x = session[index];
  prepOK = prepMatches(typed, x.preposition);
  mark(x.id + "|prep", prepOK);
  if (prepOK) score.prep++;

  const gap = $("gap");
  gap.className = "gap filled";
  gap.textContent = x.preposition;
  fitSentence();
  $("check").classList.add("hidden");
  // Phone: the keyboard keeps its space (so the question doesn't move), it just hides
  if (IS_TOUCH) $("kbZone").classList.add("kb-off");
  else if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");

  const given = $("given");
  if (prepOK) given.replaceChildren(span("good", x.preposition));
  else given.replaceChildren(span("bad struck", typed.trim()), span("good", "→ " + x.preposition));
  $("feedback").className = "feedback" + (prepOK ? "" : " wrong-l wrong-r");

  if (asksCase(x)) {
    phase = "case";
    caseShownAt = performance.now();
    $("caseQuestion").classList.remove("off");
    $("caseStep").classList.remove("hidden");
  } else {
    showAnswer();
  }
}

function span(className, text) {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

/* ===== STEP 2 — CASE ===== asked for the CORRECT preposition */
function chooseCase(c) {
  if (phase !== "case") return;
  const x = session[index];
  chosenCase = c;
  caseOK = c === x.case;
  mark(x.id + "|case", caseOK);
  score.casTotal++;
  if (caseOK) score.cas++;
  showAnswer();
}

/* ===== ANSWER ===== left half of the line = preposition, right half = case */
function chip(ok, label, wrongValue) {
  const el = span("chip " + (ok ? "ok" : "no"), "");
  el.append(span("mark", ok ? "✓" : "✗"), label);
  if (!ok && wrongValue) el.append(" ", span("struck", wrongValue));
  return el;
}

function showAnswer() {
  phase = "answer";
  const x = session[index];
  const full = prepOK && caseOK !== false;
  if (full) score.full++;
  recordDaily(full);
  updateDifficulty(x, full);
  if (hasProgress()) DeutschProgress.record(PROGRESS_ID, x.id, full);

  // Step 2: the right half fades to the case result (the left half keeps the preposition)
  if (caseOK !== null) $("feedback").classList.toggle("wrong-r", !caseOK);
  $("caseLine").textContent = "+ " + x.case;
  $("caseLine").removeAttribute("aria-hidden");
  $("caseQuestion").classList.add("off");
  $("caseLine").classList.remove("off");

  const chips = [chip(prepOK, "Präposition", typed.trim())];
  if (caseOK !== null) chips.push(chip(caseOK, "Kasus", chosenCase));
  $("chips").replaceChildren(...chips);
  $("example").textContent = x.example || "";
  $("exampleTr").textContent = getTranslation(x, "exampleTranslation");
  $("continue").textContent = index === session.length - 1 ? "Fertig" : "Weiter";

  $("prepFeedback").classList.add("hidden");
  $("finalFeedback").classList.remove("hidden");
  $("bar").style.width = ((index + 1) / session.length) * 100 + "%";
}

function next() {
  if (phase !== "answer") return;
  if (index >= session.length - 1) {
    finish();
    return;
  }
  index++;
  render();
}

/* ===== SUMMARY ===== */
function weakLabel(key) {
  const [id, part] = key.split("|");
  const x = DATA.find(e => e.id === id);
  if (!x) return null;
  return part === "prep" ? `${x.verb} → ${x.preposition}` : `${x.verb} ${x.preposition} → ${x.case}`;
}

function finish() {
  showScreen("done");
  $("score").textContent = score.full + " / " + session.length;
  const part = (label, value) => {
    const el = span("done-part", label + " ");
    const b = document.createElement("b");
    b.textContent = value;
    el.append(b);
    return el;
  };
  const parts = [part("Präposition", `${score.prep} / ${session.length}`)];
  if (score.casTotal) parts.push(part("Kasus", `${score.cas} / ${score.casTotal}`));
  $("parts").replaceChildren(...parts);

  const weak = Object.entries(currentStats())
    .filter(([, v]) => v.weak)
    .sort((a, b) => b[1].errorRate - a[1].errorRate)
    .map(([k]) => weakLabel(k))
    .filter(Boolean)
    .slice(0, 3);
  if (weak.length) {
    const title = document.createElement("b");
    title.textContent = "Noch üben";
    const lines = weak.flatMap(w => [document.createElement("br"), w]);
    $("weak").replaceChildren(title, ...lines);
    $("weak").classList.remove("hidden");
  } else $("weak").classList.add("hidden");
}

/* ===== CASE BUTTONS ===== */
$("choices").style.setProperty("--case-count", CHOICE_CASES.length);
$("choices").replaceChildren(
  ...CHOICE_CASES.map(c => {
    const b = document.createElement("button");
    b.className = "case-choice";
    b.dataset.case = c;
    b.textContent = c;
    return b;
  })
);
$("choices").addEventListener("click", e => {
  const b = e.target.closest("button[data-case]");
  // Safety guard: ignore taps in the first moment after the buttons appear
  // (a tap on the keyboard's ✓ must never also pick a case)
  if (b && performance.now() - caseShownAt > 450) chooseCase(b.dataset.case);
});

/* ===== ON-SCREEN KEYBOARD (phones and tablets) ===== */
function typeKey(k) {
  if (!inRound() || phase !== "type") return;
  if (k === "BACK") {
    typed = typed.slice(0, -1);
    paintGap();
    return;
  }
  if (k === "OK") {
    submitPrep();
    return;
  }
  if (k === "SPACE") {
    if (typed.length && !typed.endsWith(" ")) typed += " ";
    paintGap();
    return;
  }
  if (typed.length < 20) {
    typed += k;
    paintGap();
  }
}
document.addEventListener("deutsch-keyboard-input", e => typeKey(e.detail?.key || ""));

async function loadKeyboardComponent() {
  const mount = $("keyboardMount");
  const r = await fetch("../../components/deutsch-keyboard-v2.60.html");
  if (!r.ok) throw new Error("Keyboard component failed to load");
  const tpl = document.createElement("template");
  tpl.innerHTML = await r.text();
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
  window.deutschKeyboardReady = true;
  if (inRound()) placeQuestion(true);
  if (inRound() && phase === "type") $("keyboard").classList.add("show");
}

/* ===== KEYS (computer keyboard) =====
   Only during a round; Cmd/Ctrl/Option combinations are left to the browser.
   Enter after the answer is handled here once (preventDefault), so a focused Weiter can't move on twice.
   On the start and summary screens Enter presses the focused button, as usual. */
document.addEventListener("keydown", e => {
  if (!inRound() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (phase === "answer") {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) next();
    }
    return;
  }
  if (phase === "case") {
    if (e.repeat) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= CHOICE_CASES.length) {
      chooseCase(CHOICE_CASES[n - 1]);
      return;
    }
    const byLetter = CHOICE_CASES.find(c => c[0].toLowerCase() === e.key.toLowerCase());
    if (byLetter) chooseCase(byLetter);
    return;
  }
  // Typing on a computer: the text field handles letters, Backspace and the accent menu itself.
  // If the focus got lost, put it back before the key lands.
  if (!IS_TOUCH && e.target !== $("gapInput")) focusGap();
});
// Clicking anywhere during typing returns the focus to the blank (not on the start and summary screens)
document.addEventListener("mousedown", e => {
  if (!inRound() || phase !== "type" || IS_TOUCH || e.target.closest("button")) return;
  if (e.target !== $("gapInput")) {
    e.preventDefault();
    focusGap();
  }
});

/* ===== BACK TO HOME ===== */
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

/* ===== BUTTONS ===== */
document
  .querySelectorAll(".session-option")
  .forEach(b => b.addEventListener("click", () => start(Number(b.dataset.size))));
$("check").addEventListener("click", submitPrep);
$("continue").addEventListener("click", next);
$("playAgain").addEventListener("click", () => showScreen("start"));
$("homeBack").addEventListener("click", goBackToHome);

loadKeyboardComponent().catch(e => console.error(e));
