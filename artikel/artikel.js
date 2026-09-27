/* Artikel (Der.Die.Das.) — script. Markup: index.html · styles: artikel.css
   Needs (loaded before this file): components/deutsch-day-v1.js, deutsch-translation-v1.js,
   words.js (window.WORDS), deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html and the Home tile's artikel/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you learn the patterns behind German articles and choose the right one - even for words you don't know yet.",
    ru: "Помогает запомнить закономерности немецких артиклей и выбрать правильный - даже для незнакомых слов."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

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

function render() {
  const w = current();
  $("word").textContent = w.word;
  $("translation").textContent = getTranslation(w, "translation");
  $("feedback").className = "feedback";
  $("choices").style.display = "grid";
  $("card").style.display = "flex";
  $("counter").textContent = `${index + 1} / ${sessionSize}`;
  $("bar").style.width = `${(index / sessionSize) * 100}%`;
  fitOneLine($("word"));
}

/* ===== ANSWER + FEEDBACK ===== */
function choose(article) {
  const w = current(),
    ok = article === w.article;
  total++;
  recordDailyArtikel(ok);
  updateDifficulty(w, ok);
  if (hasProgress()) DeutschProgress.record(PROGRESS_ID, progressKey(w), ok);
  if (ok) correct++;

  $("feedback").className = "feedback show " + (ok ? "correct" : "wrong");
  $("feedbackTitle").textContent = ok ? "✓ Richtig" : "✕ Nicht ganz";
  $("choiceLine").innerHTML = ok
    ? `Deine Wahl: <strong>${article}</strong>.`
    : `Deine Wahl: <strong>${article}</strong>. Richtig: <strong>${w.article}</strong>.`;
  $("answerArticle").textContent = w.article;
  $("answerWord").textContent = w.word;
  $("answerTranslation").textContent = getTranslation(w, "translation");
  $("ruleLabel").textContent = `WHY ${w.article.toUpperCase()}? (${w.ruleLabel})`;
  $("ruleTitle").textContent = w.explanation;
  $("ruleExamples").textContent = Array.isArray(w.examples) ? w.examples.join(", ") : w.examples;
  $("ruleReliability").innerHTML = `<strong>Heads up:</strong> ${w.reliability}`;
  $("choices").style.display = "none";
  $("card").style.display = "none";
  fitOneLine(document.querySelector(".answer-word"));
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
  const pct = Math.round((correct / sessionSize) * 100);
  $("endSummary").textContent = `${pct} % richtig. Was schwierig war, kommt öfter wieder.`;
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
