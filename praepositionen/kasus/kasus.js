/* Fester Kasus — script. Markup: index.html · styles: kasus.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, components/deutsch-day-v1.js,
   prepositions.js (PRAEPOSITIONEN), components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Präpositionen page's kasus/index.html?v=
   and the Home tile's praepositionen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you remember which case comes after prepositions like mit, für or wegen - so the right article follows.",
    ru: "Помогает запомнить, какой падеж идёт после предлогов вроде mit, für или wegen - чтобы правильно выбрать артикль."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const PREPOSITIONS = window.PRAEPOSITIONEN || [];

/* ===== DIFFICULTY (which prepositions come up more often) =====
   Stored per preposition (lower case). Wrong +1 (max 4), right −0.5 (min 1). */
const DIFFICULTY_KEY = "festerKasusDifficultyV1";
let difficulty = {};
try {
  difficulty = JSON.parse(localStorage.getItem(DIFFICULTY_KEY) || "{}");
} catch (e) {
  difficulty = {};
}
function saveDifficulty() {
  try {
    localStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficulty));
  } catch (e) {}
}
const prepositionKey = entry => String(entry.preposition || "").toLowerCase();
const weightFor = entry => Math.max(1, Number(difficulty[prepositionKey(entry)] || 1));
function updateDifficulty(entry, correct) {
  let d = weightFor(entry);
  d = correct ? Math.max(1, d - 0.5) : Math.min(4, d + 1);
  difficulty[prepositionKey(entry)] = Number(d.toFixed(2));
  saveDifficulty();
}

/* ===== PROGRESS (Fortschritt on Home, Documentation/PROGRESS_TRACKER.md) =====
   One item per preposition, label e.g. „mit + Dativ“. An accepted variant (blue) counts as right.
   Guarded: the exercise keeps working if the helper is missing. */
const PROGRESS_ID = "festerKasus";
const hasProgress = () => typeof window.DeutschProgress === "object";
const standardCase = entry => entry.cases.find(c => c.status === "standard") || entry.cases[0];
function progressLabel(entry) {
  const std = standardCase(entry);
  return entry.preposition + (std ? " + " + std.case : "");
}
if (hasProgress()) {
  DeutschProgress.init(
    PROGRESS_ID,
    PREPOSITIONS.map(e => ({ key: prepositionKey(e), label: progressLabel(e) }))
  );
}
function recordProgress(entry, correct) {
  try {
    if (hasProgress()) DeutschProgress.record(PROGRESS_ID, prepositionKey(entry), correct);
  } catch (e) {}
}

/* ===== DAILY STATS (read by Home) ===== */
const DAILY_STATS_KEY = "deutschDailyStatsV1";
function recordDaily(correct) {
  try {
    const today = DeutschDay.key();
    let data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
    if (data.date !== today) data = { date: today };
    if (!data.festerKasus) data.festerKasus = { answers: 0, correct: 0 };
    data.festerKasus.answers++;
    if (correct) data.festerKasus.correct++;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ===== SESSION =====
   Weighted sampling WITHOUT replacement: difficult prepositions are more likely to enter a round,
   but a preposition appears only once per round. */
function buildSession(size) {
  return PREPOSITIONS.map(entry => ({ entry, key: -Math.log(Math.max(Math.random(), 1e-12)) / weightFor(entry) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, Math.min(size, PREPOSITIONS.length))
    .map(x => x.entry);
}

const els = {
  app: document.querySelector(".app"),
  session: document.getElementById("sessionScreen"),
  game: document.getElementById("game"),
  end: document.getElementById("endScreen"),
  counter: document.getElementById("counter"),
  bar: document.getElementById("bar"),
  questionCard: document.getElementById("questionCard"),
  preposition: document.getElementById("preposition"),
  translation: document.getElementById("translation"),
  choices: document.getElementById("choices"),
  answerState: document.getElementById("answerState"),
  answerCardMain: document.getElementById("answerCardMain"),
  answerEyebrow: document.getElementById("answerEyebrow"),
  answerPreposition: document.getElementById("answerPreposition"),
  answerDivider: document.getElementById("answerDivider"),
  answerCase: document.getElementById("answerCase"),
  rule: document.getElementById("rule"),
  exampleText: document.getElementById("exampleText"),
  exampleTranslation: document.getElementById("exampleTranslation"),
  next: document.getElementById("next"),
  endScore: document.getElementById("endScore"),
  endNote: document.getElementById("endNote"),
  playAgain: document.getElementById("playAgain"),
  homeBack: document.getElementById("homeBack")
};

let session = [],
  index = 0,
  score = 0,
  answered = false;

/* ===== SCREENS ===== */
const inRound = () => !els.game.classList.contains("hidden");

// Every screen, every new card and every answer starts at the top (on short screens the panel scrolls)
function scrollToTop(behavior = "auto") {
  els.app.scrollTo({ top: 0, behavior });
}

function start(size) {
  session = buildSession(size);
  index = 0;
  score = 0;
  answered = false;
  els.session.classList.add("hidden");
  els.end.classList.add("hidden");
  els.game.classList.remove("hidden");
  scrollToTop();
  render();
}

function next() {
  if (!answered) return;
  if (index >= session.length - 1) {
    finish();
    return;
  }
  index++;
  render();
  scrollToTop("smooth");
}

function finish() {
  els.game.classList.add("hidden");
  els.end.classList.remove("hidden");
  els.endScore.textContent = score + " / " + session.length;
  els.endNote.textContent = "Was schwierig war, kommt öfter wieder.";
  scrollToTop();
}

/* ===== QUESTION ===== */
function render() {
  const entry = session[index];
  answered = false;
  stopReveal();
  els.counter.textContent = index + 1 + " / " + session.length;
  els.bar.style.width = (index / session.length) * 100 + "%";
  els.preposition.textContent = entry.preposition;
  els.translation.textContent = getTranslation(entry, "translation");

  els.questionCard.classList.remove("hidden");
  els.answerState.classList.add("hidden");
  els.next.classList.add("hidden");
  els.choices.classList.remove("hidden");
  fitToCard(els.preposition);
}

// Long prepositions: keep the CSS size for words that fit; shrink only a word that is wider than its card.
function fitToCard(el) {
  el.style.fontSize = "";
  const card = el.parentElement,
    cs = getComputedStyle(card);
  const available = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const width = el.getBoundingClientRect().width;
  if (width > available && available > 0) {
    el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * available) / width) * 0.97 + "px";
  }
}
window.addEventListener("resize", () => {
  if (inRound()) fitToCard(answered ? els.answerPreposition : els.preposition);
});

/* ===== ANSWER =====
   Standard case = green. An accepted variant (e.g. wegen + Dativ) also counts as right, shown in blue
   with a short note. Wrong = red, the standard case is shown and the picked one crossed out. */
const VARIANT_LABELS = { colloquial: "Umgangssprachlich", also_correct: "Auch möglich" };
function statusMessage(status, entry) {
  const standard = entry.cases.find(c => c.status === "standard");
  const std = standard ? standard.case : "Genitiv";
  if (status === "colloquial") return "Standard: " + std + ".";
  if (status === "also_correct") return "Häufiger: " + std + ".";
  return "";
}

function answer(selected) {
  if (answered) return;
  answered = true;

  const entry = session[index];
  const match = entry.cases.find(c => c.case === selected) || null;
  const correct = Boolean(match);
  recordDaily(correct);
  updateDifficulty(entry, correct);
  recordProgress(entry, correct);
  if (correct) score++;

  const primary = standardCase(entry);
  const shownCase = correct ? selected : primary.case;
  const shownStatus = correct ? match.status : primary.status;
  const fromRect = els.preposition.getBoundingClientRect();

  els.questionCard.classList.add("hidden");
  els.answerState.classList.remove("hidden");
  els.next.classList.remove("hidden");
  els.choices.classList.add("hidden");

  const variantLabel = correct ? VARIANT_LABELS[shownStatus] : null;
  els.answerCardMain.className = "answer-card-main " + (variantLabel ? "special" : !correct ? "wrong" : "");
  els.answerEyebrow.textContent = correct ? (variantLabel ? "Richtig · " + variantLabel : "Richtig") : "Nicht ganz";
  els.answerPreposition.textContent = entry.preposition;
  els.answerCase.textContent = shownCase;
  if (correct) {
    els.rule.textContent = variantLabel
      ? getTranslation(entry, "variantNote") || statusMessage(shownStatus, entry)
      : getTranslation(entry, "note");
  } else {
    const crossed = document.createElement("span");
    crossed.className = "wrong-choice";
    crossed.textContent = selected;
    els.rule.replaceChildren(crossed);
  }

  els.exampleText.textContent = entry.example || "";
  els.exampleTranslation.textContent = getTranslation(entry, "exampleTranslation");
  els.next.textContent = index === session.length - 1 ? "Fertig" : "Weiter";
  els.bar.style.width = ((index + 1) / session.length) * 100 + "%";
  scrollToTop();
  fitToCard(els.answerPreposition);
  animateReveal(fromRect);
}

/* ===== ANSWER REVEAL ANIMATION =====
   The preposition flies from its question position into the answer card (FLIP),
   the rest of the answer fades in and slides down slightly, one after another. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let revealAnims = [];
function stopReveal() {
  revealAnims.forEach(a => a.cancel());
  revealAnims = [];
}
function animateReveal(fromRect) {
  stopReveal();
  if (reduceMotion.matches || !els.answerPreposition.animate) return;
  const toRect = els.answerPreposition.getBoundingClientRect();
  if (!fromRect.height || !toRect.height) return;
  const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
  const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
  const scale = fromRect.height / toRect.height;
  const fly = [{ transform: `translate(${dx}px,${dy}px) scale(${scale})` }, { transform: "none" }];
  revealAnims.push(els.answerPreposition.animate(fly, { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" }));
  const parts = [els.answerEyebrow, els.answerDivider, els.answerCase, els.rule];
  parts.push(els.exampleText, els.exampleTranslation);
  parts.forEach((el, i) => {
    revealAnims.push(
      el.animate(
        [
          { opacity: 0, transform: "translateY(-6px)" },
          { opacity: 1, transform: "none" }
        ],
        {
          duration: 190,
          delay: i * 20,
          easing: "ease-out",
          fill: "backwards"
        }
      )
    );
  });
}

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

/* ===== TAPS ===== */
document
  .querySelectorAll(".session-option")
  .forEach(btn => btn.addEventListener("click", () => start(Number(btn.dataset.size))));
els.choices.addEventListener("click", e => {
  const btn = e.target.closest("button[data-case]");
  if (btn) answer(btn.dataset.case);
});
els.next.addEventListener("click", next);
els.playAgain.addEventListener("click", () => {
  els.end.classList.add("hidden");
  els.session.classList.remove("hidden");
  scrollToTop();
});
els.homeBack.addEventListener("click", goBackToHome);

/* ===== KEYS (computer keyboard) =====
   Only during a round. 1 / 2 / 3 = Akkusativ / Dativ / Genitiv; Enter / Space continue after an answer
   (handled once, so a focused Weiter can't move on twice, and holding the key doesn't race on).
   Cmd / Ctrl / Option combinations are left to the browser. On the start and summary screens
   Enter presses the focused button, as usual. */
const KEY_CASES = { 1: "Akkusativ", 2: "Dativ", 3: "Genitiv" };
document.addEventListener("keydown", e => {
  if (!inRound() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (answered) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!e.repeat) next();
    }
    return;
  }
  if (KEY_CASES[e.key]) answer(KEY_CASES[e.key]);
});
