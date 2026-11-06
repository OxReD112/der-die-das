/* Verben mit Präpositionen — script. Markup: index.html · styles: verben_mit_praepositionen.css
   Verbs: verbs.js (window.VERBEN_MIT_PRAEPOSITIONEN). When this file changes, raise its ?v= in index.html,
   the Präpositionen page's verben_mit_praepositionen/index.html?v= and the Home tile's praepositionen/?v=

   A card: meaning (Your Language) + verb → type the preposition → pick the case (Akkusativ / Dativ)
   → answer with the example sentence. sprechen / erzählen accept two prepositions (verbs.js → alsoAccepted). */

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
    en: "Helps you remember which preposition a verb takes - and the case after it.",
    ru: "Помогает запомнить, с каким предлогом идёт глагол - и какой после него падеж."
  }
};
$("aboutText").textContent = getTranslation(START_ABOUT, "text");

/* ===== CASES =====
   The case buttons are built from the cases that occur in the verbs (currently Akkusativ + Dativ).
   A verb whose case had no button would skip the case step (arbeiten als + Nominativ, removed 2026-10-23). */
const CASE_ORDER = ["Akkusativ", "Dativ", "Genitiv"];
const CHOICE_CASES = CASE_ORDER.filter(c => DATA.some(x => x.case === c));
const asksCase = x => CHOICE_CASES.includes(x.case);
/* A verb's accepted pairs: the main preposition + its case, and (alsoAccepted) others that are just as standard
   (sprechen über / von). Any of them is fully right; the case step then asks for the case of the one typed. */
const pairsOf = x => [
  { preposition: x.preposition, case: x.case, example: x.example, exampleTranslation: x.exampleTranslation },
  ...(x.alsoAccepted || [])
];

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
  used = null, // the pair the answer goes on with: the typed one if right, else the main one
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
  used = null;
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
  $("roundTipsBtn").disabled = true; // no peeking: the Spickzettel opens after the answer
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
  mirror.textContent = "\u00a0"; // one invisible line from the start (see paintGap)
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
  // never empty (03.11.2026): an empty blank had no line of text — a 2px box whose place Safari computed
  // differently after a letter was typed and deleted, so the blank jumped up. A no-break space keeps one
  // invisible line in it: the same height and baseline empty or filled.
  mirror.textContent = typed || "\u00a0";
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
  const pairs = pairsOf(x);
  used = pairs.find(p => prepMatches(typed, p.preposition)) || pairs[0];
  prepOK = pairs.some(p => prepMatches(typed, p.preposition));
  mark(x.id + "|prep", prepOK);
  if (prepOK) score.prep++;

  const gap = $("gap");
  gap.className = "gap filled";
  gap.textContent = used.preposition;
  fitSentence();
  $("check").classList.add("hidden");
  // Phone: the keyboard keeps its space (so the question doesn't move), it just hides
  if (IS_TOUCH) $("kbZone").classList.add("kb-off");
  else if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");

  const given = $("given");
  if (prepOK) given.replaceChildren(span("good", used.preposition));
  else given.replaceChildren(span("bad struck", typed.trim()), span("good", "→ " + used.preposition));
  $("feedback").className = "feedback" + (prepOK ? "" : " wrong-l wrong-r");

  if (asksCase(used)) {
    phase = "case";
    caseShownAt = performance.now();
    $("caseQuestion").classList.remove("off");
    $("caseStep").classList.remove("hidden");
    pinAnswerButtons();
  } else {
    showAnswer();
  }
}

/* 03.11.2026 (Alena): on touch screens the case buttons and Weiter stand at the bottom, their bottom where the
   keyboard's bottom was — the finger is already there. The answer hangs below the question (absolute), so the
   extra room above them moves nothing. When (touch only, not on short screens): components/deutsch-bottom-v1.js. */
function pinToKeyboard(el, holder) {
  holder.style.marginTop = "";
  if (el.offsetParent === null) return;
  DeutschBottom.pin(el, holder); // the shared bottom line (components/deutsch-bottom-v1.js) = the keyboard's bottom
}
function pinAnswerButtons() {
  if (phase === "case") pinToKeyboard($("choices"), $("caseStep"));
  else if (phase === "answer") pinToKeyboard($("continue"), $("continue"));
}
window.addEventListener("resize", () => requestAnimationFrame(pinAnswerButtons));

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
  caseOK = c === used.case;
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
  $("caseLine").textContent = "+ " + used.case;
  $("caseLine").removeAttribute("aria-hidden");
  $("caseQuestion").classList.add("off");
  $("caseLine").classList.remove("off");

  const chips = [chip(prepOK, "Präposition", typed.trim())];
  if (caseOK !== null) chips.push(chip(caseOK, "Kasus", chosenCase));
  $("chips").replaceChildren(...chips);
  // a wrong case: the case rule of this preposition (Spickzettel „Kasus“), one quiet line (03.11.2026)
  $("caseRule").textContent = caseOK === false ? caseRuleFor(used.preposition) : "";
  $("caseRule").hidden = caseOK !== false;
  $("roundTipsBtn").disabled = false;
  // The other accepted pair(s), without comment (author 2026-10-23): „auch: von + Dativ“
  const others = pairsOf(x).filter(p => p.preposition !== used.preposition);
  $("alsoLine").textContent = others.length ? "auch: " + others.map(p => p.preposition + " + " + p.case).join(" · ") : "";
  $("alsoLine").hidden = !others.length;
  // the example of the pair the learner went on with (sprechen von → a von sentence)
  $("example").textContent = used.example || x.example || "";
  $("exampleTr").textContent = getTranslation(used.exampleTranslation ? used : x, "exampleTranslation");
  $("continue").textContent = index === session.length - 1 ? "Fertig" : "Weiter";

  $("prepFeedback").classList.add("hidden");
  $("finalFeedback").classList.remove("hidden");
  $("bar").style.width = ((index + 1) / session.length) * 100 + "%";
  pinAnswerButtons();
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
    .map(([k]) => weakLabel(k));
  DeutschEnd.list($("weak"), weak);
  $("doneNote").textContent = DeutschEnd.note(score.full, session.length);
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
  const r = await fetch("../../components/deutsch-keyboard-v2.60.html?v=10");
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

/* ===== SPICKZETTEL (03.11.2026, Alena) =====
   Which preposition: tendencies as tiles (PREP_TIPS below), checked against the 71 pairs of this exercise. After an
   answer the verb's preposition is lit and the window opens there; before the answer the button is off (no
   peeking), as in every exercise. The case rules (CASE_TIPS) are not in the window — Fester Kasus trains that —
   but a wrong case shows the rule of its preposition under the answer (caseRuleFor). */
const TIP_TAG = {
  always: { ru: "всегда", en: "always" },
  almost: { ru: "почти всегда", en: "almost always" },
  often: { ru: "часто", en: "often" },
  learn: { ru: "запомнить", en: "learn by heart" }
};
const CASE_TIPS = [
  { preps: ["mit", "von", "zu", "bei", "nach", "aus"], tag: "always",
    head: "mit · von · zu · bei · nach · aus → Dativ",
    ex: "sprechen mit · träumen von · gratulieren zu",
    note: { ru: "у этих предлогов только один падеж — угадывать нечего", en: "these prepositions have only one case — nothing to guess" } },
  { preps: ["für", "um", "gegen"], tag: "always",
    head: "für · um · gegen → Akkusativ",
    ex: "danken für · bitten um · protestieren gegen" },
  { preps: ["über"], tag: "always", head: "über → Akkusativ", ex: "sprechen über · sich ärgern über" },
  { preps: ["vor"], tag: "always", head: "vor → Dativ", ex: "Angst haben vor · warnen vor" },
  { preps: ["auf"], tag: "almost", head: "auf → Akkusativ", ex: "warten auf · hoffen auf · achten auf",
    note: { ru: "исключение: bestehen auf + Dativ (настаивать на)", en: "exception: bestehen auf + Dativ (to insist on)" } },
  { preps: ["an"], tag: "often", head: { ru: "an: мысль, чувство к кому-то → Akkusativ; участие, работа → Dativ", en: "an: a thought or feeling towards → Akkusativ; taking part, working → Dativ" },
    ex: "denken an · glauben an · sich erinnern an  |  teilnehmen an · arbeiten an · zweifeln an",
    note: { ru: "в упражнении 5 + 5 — единственный предлог, где падеж правда надо помнить", en: "5 + 5 in this exercise — the one preposition where the case really has to be remembered" } },
  { preps: ["in"], tag: "learn", head: "in → Akkusativ", ex: "sich verlieben in" }
];
/* Welche Präposition? (Alena 03.11.2026: no case part — Fester Kasus trains that; visual, short) — tiles in two
   columns, one small line-icon each; honesty by grouping: „almost always so“ / „often so“ / „just learn“. */
const ICON = {
  bubble: '<path d="M4 5.5h16v10H9l-5 4z"/>',
  alert: '<path d="M12 4 21 19H3z"/><path d="M12 10v4"/><path d="M12 16.5v.5"/>',
  people: '<circle cx="8.5" cy="9" r="3"/><circle cx="15.5" cy="9" r="3"/><path d="M3 19c.8-3 3-4.5 5.5-4.5S13.2 16 14 19"/><path d="M13 15c.7-.3 1.6-.5 2.5-.5 2.5 0 4.7 1.5 5.5 4.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  heart: '<path d="M12 19s-7-4.4-7-9.3A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.1C19 14.6 12 19 12 19z"/>',
  ahead: '<path d="M4 12h13"/><path d="m13 7 5 5-5 5"/><path d="M21 5v14"/>',
  thought: '<path d="M7.5 16.5a4.5 4.5 0 0 1-.6-8.9A5 5 0 0 1 16.4 6a4 4 0 0 1 1.1 7.9 3.5 3.5 0 0 1-3 2.6z"/><circle cx="8" cy="19.6" r="1.1"/><circle cx="5.2" cy="21.6" r=".6"/>', // a cloud — the old circle read as a mirrored magnifier (Alena 03.11)
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.8 3.7-5.5 7-5.5s6 1.7 7 5.5"/>',
  from: '<path d="M20 12H7"/><path d="m11 7-5 5 5 5"/><path d="M3 5v14"/>',
  to: '<path d="M3 12h12"/><path d="m11 8 4 4-4 4"/><circle cx="19" cy="12" r="2"/>',
  out: '<path d="M10 5H5v14h5"/><path d="M9 12h11"/><path d="m16 8 4 4-4 4"/>',
  into: '<path d="M14 5h5v14h-5"/><path d="M3 12h11"/><path d="m10 8 4 4-4 4"/>',
  against: '<path d="M3 12h7"/><path d="m7 8 3 4-3 4"/><path d="M21 12h-7"/><path d="m17 8-3 4 3 4"/>'
};
const PREP_TIPS = [
  { group: "almost", prep: "über", icon: "bubble", head: { ru: "тема разговора; реакция на то, что уже есть", en: "a topic; a reaction to what is there" }, ex: ["sprechen über", "sich ärgern über"] },
  { group: "almost", prep: "vor", icon: "alert", head: { ru: "страх, опасность", en: "fear, danger" }, ex: ["Angst haben vor", "warnen vor"] },
  { group: "almost", prep: "mit", case: "Dat", icon: "people", head: { ru: "вместе с кем-то; чем занят", en: "together with; busy with" }, ex: ["sich treffen mit", "anfangen mit"] },
  { group: "almost", prep: "nach", case: "Dat", icon: "search", head: { ru: "поиск, вопрос", en: "searching, asking" }, ex: ["suchen nach", "fragen nach"] },
  { group: "almost", prep: "um", case: "Akk", icon: "heart", head: { ru: "просьба, забота", en: "asking for, caring" }, ex: ["bitten um", "sich kümmern um"] },
  { group: "often", prep: "auf", icon: "ahead", head: { ru: "то, что впереди; внимание", en: "what lies ahead; attention" }, ex: ["warten auf", "achten auf"],
    note: { ru: "но verzichten, bestehen auf", en: "but verzichten, bestehen auf" } },
  { group: "often", prep: "an", icon: "thought", head: { ru: "думать, помнить, верить; участвовать в чём-то", en: "thinking, remembering, believing; taking part" }, ex: ["denken an", "teilnehmen an"] },
  { group: "often", prep: "für", case: "Akk", icon: "check", head: { ru: "за что (как «за»)", en: "for what" }, ex: ["danken für", "sich entscheiden für"] },
  { group: "often", prep: "bei", case: "Dat", icon: "person", head: { ru: "у кого, перед кем", en: "with / to whom" }, ex: ["sich bedanken bei", "helfen bei"] },
  { group: "learn", prep: "von", case: "Dat", icon: "from", head: { ru: "то «от», то «о»", en: "„from“ or „about“" }, ex: ["abhängen von", "erzählen von"] },
  { group: "learn", prep: "zu", case: "Dat", icon: "to", head: { ru: "к; поздравлять с", en: "to; congratulate on" }, ex: ["gehören zu", "gratulieren zu"] },
  { group: "learn", prep: "aus", case: "Dat", icon: "out", head: { ru: "из", en: "of, from" }, ex: ["bestehen aus"] },
  { group: "learn", prep: "in", icon: "into", head: { ru: "в", en: "in, into" }, ex: ["sich verlieben in"] },
  { group: "learn", prep: "gegen", case: "Akk", icon: "against", head: { ru: "против", en: "against" }, ex: ["protestieren gegen"] }
];
const TIP_GROUPS = [
  ["almost", { ru: "Почти всегда так", en: "Almost always so" }],
  ["often", { ru: "Часто так", en: "Often so" }],
  ["learn", { ru: "Просто запомнить", en: "Just learn them" }]
];
const RU_HINT = {
  ru: "Часто помогает русский: antworten auf — отвечать на, glauben an — верить в, abhängen von — зависеть от. Ловушка: warten auf — просто «ждать».",
  en: "Some are like English: teilnehmen an — take part in, abhängen von — depend on, protestieren gegen — protest against."
};
const tipText = v => (typeof v === "string" ? v : getTranslation({ v }, "v"));
function escapeTip(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
const svgIcon = name =>
  '<svg class="ptile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + "</svg>";
// examples whole, one per line (Alena: „sprechen · nachdenken über“ read as if only the last verb took über)
function exHtml(list, prep, cols) {
  return (
    '<div class="ptile-ex' + (cols ? " ptile-ex-cols" : "") + '" lang="de">' +
    list.map(e => {
      const i = e.lastIndexOf(" ");
      return "<div>" + escapeTip(e.slice(0, i)) + " <b>" + escapeTip(e.slice(i + 1)) + "</b></div>";
    }).join("") + "</div>"
  );
}
function tileHtml(t, prep) {
  return (
    '<div class="ptile' + (prep === t.prep ? " lit" : "") + '"><div class="ptile-head">' + svgIcon(t.icon) +
    '<span class="ptile-prep" lang="de">' + t.prep + "</span>" +
    // one case with every verb (Dativ-only / Akkusativ-only prepositions) — Alena 03.11: „+ Dat“, only when always
    (t.case ? '<span class="ptile-case" lang="de">+ ' + t.case + "</span>" : "") + "</div>" +
    '<div class="ptile-means">' + escapeTip(tipText(t.head)) + "</div>" +
    exHtml(t.ex, t.prep) +
    (t.note ? '<div class="ptile-note">' + escapeTip(tipText(t.note)) + "</div>" : "") + "</div>"
  );
}
function tipsHtml(prep) {
  return TIP_GROUPS.map(([g, title]) => {
    const tiles = PREP_TIPS.filter(t => t.group === g).map(t => tileHtml(t, prep)).join("");
    return '<h3 class="pattern-section">' + escapeTip(tipText(title)) + '</h3><div class="ptiles">' + tiles + "</div>";
  }).join("") + '<p class="ptile-foot">' + escapeTip(tipText(RU_HINT)) + "</p>";
}
/* under the answer after a wrong case: the case rule of this preposition, one line */
function caseRuleFor(prep) {
  const t = CASE_TIPS.find(r => r.preps.includes(prep));
  if (!t) return "";
  return tipText(t.head) + " · " + tipText(TIP_TAG[t.tag]) + (t.preps[0] === "auf" ? " (" + tipText(t.note) + ")" : "");
}
const tipsOpen = () => DeutschWindow.isOpen($("tipsModal"));
function openTips(round) {
  const prep = round && phase === "answer" && used ? used.preposition : null;
  if (round && !prep) return; // off until the answer
  $("tipsModalBody").innerHTML = tipsHtml(prep);
  DeutschWindow.open($("tipsModal")); // × / tap outside / Esc (other keys wait): components/deutsch-window-v1.js
  const lit = $("tipsModalBody").querySelector(".lit");
  if (lit) lit.scrollIntoView({ block: "center" });
}
document.querySelectorAll("[data-tips]").forEach(b => b.addEventListener("click", () => openTips(b.dataset.tips === "round")));
