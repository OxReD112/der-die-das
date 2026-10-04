/* Partizip II — script. Markup: index.html · styles: partizipII.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, verbs.js (VERBS),
   components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Verbformen page's partizipII/?v=
   and the Home tile's verbformen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you learn the Partizip II of the most common irregular verbs - with tips and tricks along the way.",
    ru: "Помогает запомнить Partizip II самых частых неправильных глаголов - с полезными подсказками."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const $ = id => document.getElementById(id);
let ignoreNextClickUntil = 0;
$("next").addEventListener("pointerdown", () => { ignoreNextClickUntil = 0; }, true);
document.addEventListener("click", e => {
  if (isTouchDevice && Date.now() < ignoreNextClickUntil && e.target.closest("#next")) {
    e.preventDefault(); e.stopImmediatePropagation(); ignoreNextClickUntil = 0;
  }
}, true);
const key = v => v.infinitive.toLowerCase();

/* Phones and tablets type on the app's own keyboard (components/deutsch-keyboard): the field is read-only
   there so the system keyboard never opens, and there is no Prüfen button (✓ on the keyboard instead). */
const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
if (isTouchDevice) {
  $("answer").readOnly = true;
  $("answer").setAttribute("inputmode", "none");
  $("check").style.display = "none";
}

/* ===== DIFFICULTY (which verbs come up more often) =====
   Scoring format 2 (Documentation/PROGRESS_TRACKER.md): common scale 1–4, wrong +1, right −0.5.
   Format 1 (old): 1–6, wrong +1.5. Old data has no "__format" marker → converted ONCE:
   new = 1 + (old − 1) × 3/5, rounded to 0.5. The key name stays the same, so an old backup
   restored later is simply converted again. */
const STORAGE_KEY = "verbformenDifficultyV1";
const DIFFICULTY_FORMAT = 2;
let difficulty = {};
try {
  difficulty = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
} catch (e) {
  difficulty = {};
}
if (!difficulty || typeof difficulty !== "object") difficulty = {};
if (difficulty.__format !== DIFFICULTY_FORMAT) {
  for (const k in difficulty) {
    if (k === "__format") continue;
    const old = Number(difficulty[k]);
    if (!Number.isFinite(old)) {
      delete difficulty[k];
      continue;
    }
    const scaled = 1 + ((Math.min(6, Math.max(1, old)) - 1) * 3) / 5;
    difficulty[k] = Math.min(4, Math.max(1, Math.round(scaled * 2) / 2));
  }
  difficulty.__format = DIFFICULTY_FORMAT;
  saveDifficulty();
}

function saveDifficulty() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(difficulty));
  } catch (e) {}
}

function weightFor(v) {
  return Math.max(1, Number(difficulty[key(v)] || 1));
}

function updateDifficulty(v, correct) {
  let d = weightFor(v);
  d = correct ? Math.max(1, d - 0.5) : Math.min(4, d + 1);
  difficulty[key(v)] = Number(d.toFixed(2));
  saveDifficulty();
}

/* ===== PROGRESS (Fortschritt on Home) + TODAY'S COUNT =====
   Progress: one item per verb. Guarded: the exercise keeps working if the helper is missing.
   Today's count: Home counts the answers (the message is ignored when the page runs on its own). */
const PROGRESS_ID = "partizipII";
const hasProgress = () => typeof window.DeutschProgress === "object";
if (hasProgress())
  DeutschProgress.init(
    PROGRESS_ID,
    VERBS.map(v => ({ key: key(v), label: v.infinitive + " → " + v.participle }))
  );

function recordProgress(v, ok) {
  try {
    if (hasProgress()) DeutschProgress.record(PROGRESS_ID, key(v), ok);
  } catch (e) {}
  window.parent.postMessage({ type: "deutsch:exerciseAnswer", exercise: "partizipII" }, "*");
}

/* ===== DECK =====
   Weighted sampling WITHOUT replacement: difficult verbs are more likely to enter a round,
   but no verb can occur twice in that round. */
let deck = [],
  index = 0,
  checked = false,
  correctCount = 0;

function buildDeck(size) {
  return VERBS.map(v => ({ v, randomKey: -Math.log(Math.max(Math.random(), 1e-12)) / weightFor(v) }))
    .sort((a, b) => a.randomKey - b.randomKey)
    .slice(0, Math.min(size, VERBS.length))
    .map(x => x.v);
}

/* ===== SCREENS ===== */
const inRound = () => !$("study").classList.contains("hidden");

// Every screen and every new verb starts at the top (on short screens the panel scrolls)
function scrollToTop() {
  document.querySelector(".app").scrollTop = 0;
}

function showScreen(id) {
  for (const s of ["start", "study", "finish"]) $(s).classList.toggle("hidden", s !== id);
  scrollToTop();
}

function startSession(size) {
  deck = buildDeck(size);
  index = 0;
  correctCount = 0;
  showScreen("study");
  render();
}

/* Keyboard above the Home button (see the CSS block KEYBOARD ABOVE THE HOME BUTTON): when a long line on a
   small screen leaves no room for the keyboard at its place, the question card shrinks just enough (down to 80%).
   Measured for every sentence, and again when the screen size changes. */
const SHORT_SCREEN = window.matchMedia("(max-height: 559px), (max-width: 340px) and (max-height: 609px)");
function fitCard() {
  const card = document.querySelector("#study .card"),
    kb = $("keyboard"),
    app = document.querySelector(".app");
  card.style.zoom = "";
  if (!kb || !kb.classList.contains("is-touch") || !kb.classList.contains("show") || SHORT_SCREEN.matches) return;
  const over = app.scrollHeight - app.clientHeight;
  if (over <= 0) return;
  const h = card.offsetHeight;
  card.style.zoom = Math.max(0.8, (h - over) / h).toFixed(3);
}
window.addEventListener("resize", () => {
  if (inRound() && !checked) fitCard();
});

function syncKeyboardAndFocus() {
  if (window.deutschKeyboardReady && !checked) $("keyboard").classList.add("show");
  fitCard();
  if (!isTouchDevice) setTimeout(focusAnswer, 80);
}

function focusAnswer() {
  try {
    $("answer").focus({ preventScroll: true });
  } catch (e) {
    $("answer").focus();
  }
}

function render() {
  const v = deck[index];
  checked = false;
  $("verb").textContent = v.infinitive;
  $("translation").textContent = getTranslation(v, "translation");
  $("answer").value = "";
  $("answer").disabled = false;
  $("result").className = "result";
  $("vowelPattern").textContent = "";
  $("next").classList.remove("show");
  $("roundTableBtn").disabled = true; // no peeking: the table opens only after Prüfen
  $("check").style.display = isTouchDevice ? "none" : "";
  $("count").textContent = index + 1 + " / " + deck.length;
  $("bar").style.width = ((index + 1) / deck.length) * 100 + "%";
  scrollToTop();
  syncKeyboardAndFocus();
}

/* ===== ANSWER ===== */
// "a - i - a" → "a → a" (infinitive → Partizip II)
function partizipPattern(pattern) {
  const parts = String(pattern || "").split(/\s*-\s*/);
  return parts.length >= 3 ? parts[0] + " → " + parts[2] : String(pattern || "");
}

// sein and haben also show the Präteritum (war, hatte)
function shouldShowPreterite(v) {
  return v.infinitive === "sein" || v.infinitive === "haben";
}

function checkAnswer() {
  if (checked) {
    next();
    return;
  }
  const v = deck[index];
  const a = $("answer").value.trim().toLowerCase();
  if (!a) return;

  checked = true;
  const ok = a === v.participle.toLowerCase();
  if (ok) correctCount++;
  updateDifficulty(v, ok);
  recordProgress(v, ok);

  $("result").className = "result show " + (ok ? "good" : "bad");
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
  $("state").textContent = ok ? "Richtig" : "Nicht ganz";
  $("vowelPattern").textContent = partizipPattern(v.pattern);
  $("forms").textContent = shouldShowPreterite(v)
    ? v.infinitive + " → " + v.preterite + " → " + v.participle
    : v.infinitive + " → " + v.participle;
  const perfekt = document.createElement("b");
  perfekt.textContent = v.auxiliary + " " + v.participle;
  $("meta").replaceChildren("Perfekt: ", perfekt);
  $("example").textContent = v.example;
  $("answer").disabled = true;
  $("answer").blur();
  $("check").style.display = "none";
  $("next").classList.add("show");
  $("roundTableBtn").disabled = false;
}

function next() {
  if (index + 1 >= deck.length) {
    finishSession();
    return;
  }
  index++;
  render();
}

function finishSession() {
  checked = false;
  showScreen("finish");
  $("finalScore").textContent = correctCount + " / " + deck.length;
  $("summary").textContent = "Was schwierig war, kommt öfter wieder.";
}

document
  .querySelectorAll(".choice")
  .forEach(b => b.addEventListener("click", () => startSession(Number(b.dataset.size))));
$("check").onclick = checkAnswer;
$("next").onclick = next;
$("playAgain").onclick = () => showScreen("start");

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
$("homeBack").onclick = goBackToHome;

/* ===== KEYS (computer keyboard) =====
   Only during a round and while the table window is closed; Esc closes the table.
   Enter is handled here once (preventDefault), so a focused Weiter can't move on twice.
   Enter on the table button still opens the table. On the start and summary screens Enter
   presses the focused button, as usual. */
document.addEventListener("keydown", e => {
  if (tableIsOpen()) {
    if (e.key === "Escape") closePatternTable();
    return;
  }
  if (!inRound()) return;
  if (e.key === "Enter") {
    if (document.activeElement && document.activeElement.matches("[data-pattern-table]")) return;
    e.preventDefault();
    if (e.repeat) return;
    if (checked) next();
    else if (document.activeElement === $("answer") || document.activeElement === $("check")) checkAnswer();
  }
  if (e.key === "Backspace" && isTouchDevice && !checked) {
    e.preventDefault();
    $("answer").value = $("answer").value.slice(0, -1);
  }
});

/* ===== ON-SCREEN KEYBOARD (phones and tablets) ===== */
document.addEventListener("deutsch-keyboard-input", e => {
  const k = e.detail?.key || "";
  if (!inRound() || checked || tableIsOpen()) return;
  const field = $("answer");
  if (k === "BACK") field.value = field.value.slice(0, -1);
  else if (k === "OK") {
    if ($("answer").value.trim()) ignoreNextClickUntil = Date.now() + 1000;
    checkAnswer();
  }
  else if (k === "SPACE") {
    if (field.value.length && !field.value.endsWith(" ")) field.value += " ";
  } else if (k) field.value += k;
});

async function loadKeyboardComponent() {
  const mount = $("keyboardMount");
  if (!mount) return false;
  const r = await fetch("../../components/deutsch-keyboard-v2.60.html");
  if (!r.ok) throw new Error("Keyboard component failed to load");
  const tpl = document.createElement("template");
  tpl.innerHTML = await r.text();
  const scripts = [];
  tpl.content.querySelectorAll("script").forEach(sc => {
    scripts.push(sc.textContent);
    sc.remove();
  });
  mount.appendChild(tpl.content);
  for (const code of scripts) {
    const sc = document.createElement("script");
    sc.textContent = code;
    document.body.appendChild(sc);
  }
  window.deutschKeyboardReady = true;
  if (inRound() && !checked) {
    $("keyboard").classList.add("show");
    fitCard();
  }
  return true;
}
loadKeyboardComponent().catch(e => console.error(e));

/* ===== TABLE WINDOW „Vokalwechsel“ =====
   Infinitive vowel → the vowels its Partizip II can have in this exercise.
   During a round (2026-09-28, like Vielseitige Verben): the button is off until Prüfen; then the verb's cell is
   lit (its infinitive vowel) with its Partizip II vowel marked - from the verb's pattern („ei - ie - ie“ → ei → ie). */
const VOWEL_CHANGES = [
  ["a", ["a"]],
  ["ä", ["a"]],
  ["au", ["au"]],
  ["o", ["o"]],
  ["ö", ["o"]],
  ["u", ["u", "a"]],
  ["ü", ["ü", "u", "o"]],
  ["e", ["e", "a", "o"]],
  ["ie", ["ie", "o", "e"]],
  ["ei", ["ei", "ie", "i", "e"]],
  ["i", ["i", "u", "o", "e", "a"]]
];

function patternTableHtml(lit = null) {
  const cells = VOWEL_CHANGES.map(([from, to]) => {
    const on = lit && lit[0] === from;
    return (
      '<div class="pattern-cell' +
      (on ? " lit" : "") +
      '"><div class="pattern-source">' +
      from +
      '</div><div class="pattern-options"><span class="arrow">→</span>' +
      to.map(v => (on && v === lit[1] ? '<span class="lit-vowel">' : "<span>") + v + "</span>").join('<span class="arrow">·</span>') +
      "</div></div>\n"
    );
  });
  return (
    '<p class="pattern-intro">Infinitiv → Partizip II · Vokalwechsel in dieser Übung</p><div class="pattern-grid">\n' +
    cells.join("") +
    "</div>"
  );
}
const tableIsOpen = () => $("patternModal").classList.contains("open");

// „ei - ie - ie“ → ["ei", "ie"] (infinitive vowel, Partizip II vowel)
function patternLit(v) {
  const parts = String(v.pattern || "").split(/\s*-\s*/);
  return parts.length >= 3 ? [parts[0], parts[2]] : null;
}

function openPatternTable(round) {
  if (round && !(inRound() && checked)) return; // off until Prüfen
  $("patternModalBody").innerHTML = patternTableHtml(round ? patternLit(deck[index]) : null);
  const modal = $("patternModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closePatternTable() {
  const modal = $("patternModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  // computer: back to typing without clicking into the field first
  if (inRound() && !checked && !isTouchDevice) focusAnswer();
}
document
  .querySelectorAll("[data-pattern-table]")
  .forEach(b => b.addEventListener("click", () => openPatternTable(b.dataset.patternTable === "round")));
$("patternClose").onclick = closePatternTable;
$("patternModal").onclick = e => {
  if (e.target === $("patternModal")) closePatternTable();
};
