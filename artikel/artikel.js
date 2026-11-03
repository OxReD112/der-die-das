/* Artikel (Der.Die.Das.) — script. Markup: index.html · styles: artikel.css
   Needs (loaded before this file): components/deutsch-day-v1.js, deutsch-translation-v1.js,
   words.js (window.WORDS), deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html and the Home tile's artikel/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you notice the patterns behind German articles - they often let you guess the article of a new word.",
    ru: "Помогает заметить закономерности немецких артиклей - по ним артикль часто можно угадать и у незнакомого слова."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

/* ===== RULE CARD LABELS (in the user's language, like the rule texts) ===== */
const CARD_UI = {
  en: { headsUp: "Heads up:" },
  ru: { headsUp: "Обратите внимание:" }
};

/* ===== STATE ===== */
const words = window.WORDS;
let deck = [],
  index = 0,
  total = 0,
  correct = 0,
  sessionSize = 0;
const $ = id => document.getElementById(id);

/* ===== DIFFICULTY =====
   Persistent: mistakes make a word more likely to reappear in future rounds. */
const STORAGE_KEY = "artikelGameDifficultyV1";
let difficulty = {};
try {
  difficulty = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
} catch (e) {
  difficulty = {};
}
const wordKey = w => w.article + "|" + w.word;

function saveDifficulty() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(difficulty));
  } catch (e) {}
}
function updateDifficulty(w, ok) {
  const key = wordKey(w),
    old = difficulty[key] || 1;
  // Wrong answers raise the weight; correct answers gently bring it back toward normal.
  difficulty[key] = ok ? Math.max(1, old - 0.5) : Math.min(4, old + 1);
  saveDifficulty();
}

/* ===== PROGRESS (Documentation/PROGRESS_TRACKER.md) =====
   Guarded: Artikel keeps working if the helper is missing.
   Counted per RULE, not per noun: all nouns of one rule (e.g. -ung → die) share one progress item.
   Nouns without a reliable rule and exceptions (ruleType none / exception) are their own item. */
const PROGRESS_ID = "artikel";
const hasProgress = () => typeof window.DeutschProgress === "object";
const isIndividual = w => w.ruleType === "none" || w.ruleType === "exception";
const progressKey = w => (isIndividual(w) ? "word:" + wordKey(w) : "rule:" + w.ruleLabel + "|" + w.article);
function progressLabel(w) {
  if (isIndividual(w)) return w.article + " " + w.word;
  let l = w.ruleLabel
    .replace(/ ENDING$/, "")
    .replace(/ PATTERN$/, "")
    .replace(/ → MOSTLY (DER|DIE|DAS)$/, "");
  l = l.startsWith("-") ? l.toLowerCase() : l.charAt(0) + l.slice(1).toLowerCase();
  return l + " → " + w.article;
}
// Weight = number of nouns the item covers, so the bar % = share of all nouns I reliably know.
if (hasProgress()) {
  const items = new Map();
  words.forEach(w => {
    const k = progressKey(w),
      e = items.get(k);
    if (e) e.weight++;
    else items.set(k, { key: k, label: progressLabel(w), weight: 1 });
  });
  DeutschProgress.init(PROGRESS_ID, [...items.values()]);
}

/* ===== DAILY STATS (Home: today's points and the Artikel tile) ===== */
const DAILY_STATS_KEY = "deutschDailyStatsV1";
function recordDailyArtikel(ok) {
  try {
    const today = DeutschDay.key();
    let data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
    if (data.date !== today) data = { date: today, artikel: { answers: 0, correct: 0 } };
    if (!data.artikel) data.artikel = { answers: 0, correct: 0 };
    data.artikel.answers++;
    if (ok) data.artikel.correct++;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ===== DECK ===== */
function newDeck() {
  // Build ONE session with unique nouns only.
  // Difficult nouns are more likely to be selected for the session,
  // but a noun can never appear twice inside the same session.
  const ranked = words
    .map(w => {
      const weight = Math.max(1, difficulty[wordKey(w)] || 1);
      // Weighted sampling without replacement:
      // higher weight = better chance to land near the front.
      const key = -Math.log(Math.max(Math.random(), 1e-12)) / weight;
      return { w, key };
    })
    .sort((a, b) => a.key - b.key);

  deck = ranked.slice(0, Math.min(sessionSize, ranked.length)).map(x => x.w);
  index = 0;
}
function current() {
  return deck[index];
}

/* ===== QUESTION ===== */
/* Long words never wrap: they stay on one line and shrink just enough to fit
   the card (e.g. Harley-Davidson, Geschwindigkeit on narrow phones). */
function fitOneLine(el) {
  if (!el) return;
  el.style.fontSize = "";
  el.style.whiteSpace = "nowrap";
  const box = el.parentElement;
  if (!box || !box.clientWidth) return;
  const cs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const need = el.scrollWidth;
  if (avail > 0 && need > avail) {
    el.style.fontSize = Math.floor(((parseFloat(getComputedStyle(el).fontSize) * avail) / need) * 0.97) + "px";
  }
}
addEventListener("resize", () => {
  fitOneLine($("word"));
  fitOneLine(document.querySelector(".answer-word"));
});

const TABLET = window.matchMedia("(min-width: 700px) and (min-height: 740px)");
function render() {
  const w = current();
  $("word").textContent = w.word;
  $("translation").textContent = getTranslation(w, "translation");
  $("feedback").className = "feedback";
  $("feedback").style.marginTop = "";
  $("choices").style.display = "grid";
  $("card").style.display = "flex";
  $("counter").textContent = `${index + 1} / ${sessionSize}`;
  $("bar").style.width = `${(index / sessionSize) * 100}%`;
  fitOneLine($("word"));
}

/* ===== ANSWER + FEEDBACK ===== */
function choose(article) {
  const cardTop = $("card").getBoundingClientRect().top; // tablets: the answer takes the question card's place (below)
  const w = current(),
    ok = article === w.article;
  total++;
  $("bar").style.width = `${((index + 1) / sessionSize) * 100}%`; // the bar fills on the answer, like every exercise
  recordDailyArtikel(ok);
  updateDifficulty(w, ok);
  if (hasProgress()) DeutschProgress.record(PROGRESS_ID, progressKey(w), ok);
  if (ok) correct++;

  $("feedback").className = "feedback show " + (ok ? "correct" : "wrong");
  // Answer screen (01.11.2026): the verdict as a small label (like Fester Kasus); a wrong article stands crossed out
  // above the right one, in place of the old „Das Wort“ label and the „Deine Wahl … Richtig …“ line.
  $("feedbackTitle").textContent = ok ? "Richtig" : "Nicht ganz";
  $("answerChoice").textContent = ok ? "" : article;
  $("answerArticle").textContent = w.article;
  $("answerWord").textContent = w.word;
  $("answerTranslation").textContent = getTranslation(w, "translation");
  // Rule card follows the RU/EN setting (words.js: ruleName / explanation / reliability are {ru, en}).
  const ui = CARD_UI[DeutschTranslation.getLang()] || CARD_UI.en;
  const ruleName = getTranslation(w, "ruleName") || w.ruleLabel;
  $("ruleLabel").textContent = ruleName;
  $("ruleTitle").textContent = getTranslation(w, "explanation");
  const examples = Array.isArray(w.examples) ? w.examples.join(", ") : w.examples || "";
  $("ruleExamples").textContent = examples;
  $("ruleExamples").style.display = examples ? "" : "none";
  // One line at the bottom: how reliable the rule is + one exception. Hidden when empty ("no rule" cards).
  const reliability = getTranslation(w, "reliability");
  $("ruleReliability").innerHTML = reliability ? `<strong>${ui.headsUp}</strong> ` : "";
  if (reliability) $("ruleReliability").append(reliability);
  $("ruleReliability").style.display = reliability ? "" : "none";
  // the rule in one line; examples and the reliability note open with „Beispiele und Ausnahmen ›“
  $("ruleCard").classList.remove("open");
  $("ruleMore").hidden = !examples && !reliability;
  // Tablets (03.11.2026): the question stands in the middle of the screen; the answer card takes its place —
  // its top where the question card's top was.
  $("choices").style.display = "none";
  $("card").style.display = "none";
  fitOneLine(document.querySelector(".answer-word"));
  if (TABLET.matches) {
    const fb = $("feedback");
    fb.style.marginTop = "";
    const shift = cardTop - fb.getBoundingClientRect().top;
    if (shift > 0) fb.style.marginTop = parseFloat(getComputedStyle(fb).marginTop) + shift + "px";
  }
}

/* ===== SCREENS ===== */
function startSession(size) {
  sessionSize = size;
  total = 0;
  correct = 0;
  newDeck();
  $("sessionScreen").classList.add("hidden");
  $("endScreen").classList.add("hidden");
  $("game").classList.remove("hidden");
  render();
}
function endSession() {
  $("game").classList.add("hidden");
  $("endScreen").classList.remove("hidden");
  $("endCorrect").textContent = `${correct} / ${sessionSize}`;
  $("endSummary").textContent = DeutschEnd.note(correct, sessionSize);
}
function next() {
  if (total >= sessionSize) {
    endSession();
    return;
  }
  index++;
  render();
}

/* ===== BUTTONS + KEYS ===== */
document.querySelectorAll(".session-option").forEach(b => (b.onclick = () => startSession(Number(b.dataset.size))));
document.querySelectorAll(".choice").forEach(b => (b.onclick = () => choose(b.dataset.a)));
$("continue").onclick = next;
$("ruleMore").onclick = () => $("ruleCard").classList.add("open");
$("playAgain").onclick = () => {
  $("endScreen").classList.add("hidden");
  $("sessionScreen").classList.remove("hidden");
};

// Keyboard (computer, iPad with keyboard): 1/2/3 or ← ↑ → answer, Enter/Space = Weiter.
// Only while a round is on screen — on the start and summary screens the keys do nothing.
// preventDefault: a Weiter button that still has focus must not also react to the same key.
document.addEventListener("keydown", e => {
  if ($("game").classList.contains("hidden")) return;
  if ($("feedback").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      next();
    }
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "1") choose("der");
  if (e.key === "ArrowUp" || e.key === "2") choose("die");
  if (e.key === "ArrowRight" || e.key === "3") choose("das");
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
$("homeBack").onclick = goBackToHome;
