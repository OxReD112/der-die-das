/* Ortspräpositionen — script. Markup: index.html · styles: ortspraepositionen.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, components/deutsch-day-v1.js,
   places.js (ORTSPRAEPOSITIONEN, ORTS_KATEGORIEN, ORTS_ZU_HINTS), components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Präpositionen page's ortspraepositionen/index.html?v=
   and the Home tile's praepositionen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Where? Where to? Where from? Helps you pick the right preposition for every place.",
    ru: "Где? Куда? Откуда? Помогает подобрать правильный предлог к каждому месту."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const PLACES = window.ORTSPRAEPOSITIONEN || [];
const CATEGORIES = window.ORTS_KATEGORIEN || {};

/* ===== QUESTIONS + BUTTON SETS =====
   Every question always shows its full set of prepositions, in fixed slots,
   already fused with the article of the place's gender (m / f / n / pl / none). */
const QUESTIONS = [
  { key: "wo", label: "Wo?", lead: "Ich bin" },
  { key: "wohin", label: "Wohin?", lead: "Ich gehe" },
  { key: "woher", label: "Woher?", lead: "Ich komme" }
];
const BUTTONS = {
  wo: {
    m: ["im", "am", "auf dem", "beim", "zum"],
    f: ["in der", "an der", "auf der", "bei der", "zur"],
    n: ["im", "am", "auf dem", "beim", "zum"],
    pl: ["in den", "an den", "auf den", "bei den", "zu den"],
    none: ["in", "an", "auf", "bei", "zu"]
  },
  wohin: {
    m: ["in den", "an den", "auf den", "zum", "nach"],
    f: ["in die", "an die", "auf die", "zur", "nach"],
    n: ["ins", "ans", "aufs", "zum", "nach"],
    pl: ["in die", "an die", "auf die", "zu den", "nach"],
    none: ["in", "an", "auf", "zu", "nach"]
  },
  woher: {
    m: ["aus dem", "vom"],
    f: ["aus der", "von der"],
    n: ["aus dem", "vom"],
    pl: ["aus den", "von den"],
    none: ["aus", "von"]
  }
};
const buttonsFor = (entry, q) => BUTTONS[q][entry.gender || "none"];
const nounFor = (entry, q) => (entry.forms && entry.forms[q]) || entry.noun;
const leadFor = (entry, q) => (entry.lead && entry.lead[q.key]) || q.lead;
const altsFor = (entry, q) => (entry.alt && entry.alt[q]) || [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/* ===== NOTES BELOW WEITER ===== */
// A real everyday variant was chosen (e.g. „auf der Arbeit“)
const altNote = (entry, q, form) => "Auch richtig: " + form + " " + nounFor(entry, q) + ".";

// Only when zu/von was picked where the box wants in/an/auf (Wohin) or aus (Woher):
// this drill trains ending up IN/AT/ON the place, not just going up to it.
const ZU_BOX = { raum: "in", ausnahme: "in", land: "in", adresse: "in", kontakt: "an", flaeche: "auf" };
const ZU_TEXT = window.ORTS_ZU_HINTS || {};
function zuHint(entry, q, form) {
  const b = s => "<b>" + escapeHtml(s) + "</b>";
  // Bahnhof-type cards (an · zu · von): here zu IS right — note when an den / an die was picked.
  if (entry.cat === "anzu" && q === "wohin" && /^an\b/.test(form))
    return (
      "<div>" +
      b(entry.wohin + " " + nounFor(entry, "wohin")) +
      " — " +
      getTranslation(ZU_TEXT, "normal") +
      "</div>" +
      "<div>" +
      b(form + " " + nounFor(entry, "wohin")) +
      " — " +
      getTranslation(ZU_TEXT, "unueblich") +
      "</div>"
    );
  const box = ZU_BOX[entry.cat];
  if (!box) return "";
  if (q === "wohin" && /^zu/.test(form))
    return (
      "<div>" +
      b(entry.wohin + " " + nounFor(entry, "wohin")) +
      " — " +
      getTranslation(ZU_TEXT, box) +
      "</div>" +
      "<div>" +
      b(form + " " + nounFor(entry, "wo")) +
      " — " +
      getTranslation(ZU_TEXT, "zu") +
      "</div>"
    );
  if (q === "woher" && /^von?/.test(form) && /^aus/.test(entry.woher))
    return (
      "<div>" +
      b(entry.woher + " " + nounFor(entry, "woher")) +
      " — " +
      getTranslation(ZU_TEXT, "aus") +
      "</div>" +
      "<div>" +
      b(form + " " + nounFor(entry, "woher")) +
      " — " +
      getTranslation(ZU_TEXT, "von") +
      "</div>"
    );
  return "";
}

/* ===== DIFFICULTY (which places come up more often) =====
   Tracked per place AND per question: missing „Woher? Strand“ only raises that line.
   Wrong +1 (max 4), right −0.5 (min 1). A card's weight is the average of its three lines. */
const DIFFICULTY_KEY = "ortspraepositionenDifficultyV1";
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
const stepWeight = (entry, q) => Math.max(1, Number((difficulty[entry.id] || {})[q] || 1));
const cardWeight = entry => QUESTIONS.reduce((s, q) => s + stepWeight(entry, q.key), 0) / QUESTIONS.length;
function updateDifficulty(entry, q, correct) {
  let d = stepWeight(entry, q);
  d = correct ? Math.max(1, d - 0.5) : Math.min(4, d + 1);
  if (!difficulty[entry.id]) difficulty[entry.id] = {};
  difficulty[entry.id][q] = Number(d.toFixed(2));
  saveDifficulty();
}

/* ===== PROGRESS (Fortschritt on Home, Documentation/PROGRESS_TRACKER.md) =====
   Counted per RULE category (e.g. „Raum → in · in · aus“), weighted by the number of places it covers,
   like Artikel. A card counts as right only when all three lines were right.
   Guarded: the exercise keeps working if the helper is missing. */
const PROGRESS_ID = "ortspraepositionen";
const hasProgress = () => typeof window.DeutschProgress === "object";
const progressKey = entry => "cat:" + entry.cat;
if (hasProgress()) {
  const items = new Map();
  PLACES.forEach(e => {
    const k = progressKey(e),
      c = CATEGORIES[e.cat] || {},
      it = items.get(k);
    if (it) it.weight++;
    else items.set(k, { key: k, label: (c.label || e.cat) + (c.rule ? " → " + c.rule : ""), weight: 1 });
  });
  DeutschProgress.init(PROGRESS_ID, [...items.values()]);
}
function recordProgress(entry, ok) {
  try {
    if (hasProgress()) DeutschProgress.record(PROGRESS_ID, progressKey(entry), ok);
  } catch (e) {}
}

/* ===== DAILY STATS (read by Home) =====
   One finished card (all three lines) counts as one answer; it is correct only when all three lines were right. */
const DAILY_STATS_KEY = "deutschDailyStatsV1";
function recordDaily(correct) {
  try {
    const today = DeutschDay.key();
    let data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
    if (data.date !== today) data = { date: today };
    if (!data.ortspraepositionen) data.ortspraepositionen = { answers: 0, correct: 0 };
    data.ortspraepositionen.answers++;
    if (correct) data.ortspraepositionen.correct++;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ===== SESSION =====
   Weighted sampling WITHOUT replacement: difficult places are more likely to enter a round,
   but a place appears only once per round. */
function buildSession(size) {
  return PLACES.map(entry => ({ entry, key: -Math.log(Math.max(Math.random(), 1e-12)) / cardWeight(entry) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, Math.min(size, PLACES.length))
    .map(x => x.entry);
}

const els = {
  session: document.getElementById("sessionScreen"),
  game: document.getElementById("game"),
  end: document.getElementById("endScreen"),
  counter: document.getElementById("counter"),
  bar: document.getElementById("bar"),
  card: document.getElementById("card"),
  eyebrow: document.getElementById("eyebrow"),
  place: document.getElementById("place"),
  translation: document.getElementById("translation"),
  steps: document.getElementById("steps"),
  ruleLabel: document.getElementById("ruleLabel"),
  ruleForms: document.getElementById("ruleForms"),
  ruleNote: document.getElementById("ruleNote"),
  choices: document.getElementById("choices"),
  next: document.getElementById("next"),
  endScore: document.getElementById("endScore"),
  endNote: document.getElementById("endNote"),
  playAgain: document.getElementById("playAgain"),
  homeBack: document.getElementById("homeBack"),
  app: document.querySelector(".app")
};

let session = [],
  index = 0,
  step = 0,
  score = 0,
  taps = 0,
  cardResults = [],
  usedAlts = [],
  zuHints = [],
  locked = false,
  cardDone = false;

/* ===== SCREENS ===== */
const inRound = () => !els.game.classList.contains("hidden");

// Every screen and every new card starts at the top (on short screens the panel scrolls)
function scrollToTop(behavior = "auto") {
  els.app.scrollTo({ top: 0, behavior });
}

function start(size) {
  session = buildSession(size);
  index = 0;
  score = 0;
  taps = 0;
  els.session.classList.add("hidden");
  els.end.classList.add("hidden");
  els.game.classList.remove("hidden");
  scrollToTop();
  render();
}

/* ===== QUESTION ===== */
function render() {
  const entry = session[index];
  step = 0;
  cardResults = [];
  usedAlts = [];
  zuHints = [];
  locked = false;
  cardDone = false;
  els.counter.textContent = index + 1 + " / " + session.length;
  els.bar.style.width = (index / session.length) * 100 + "%";

  els.card.className = "card";
  els.game.classList.remove("good", "bad");
  els.eyebrow.innerHTML = "&nbsp;";
  els.place.innerHTML =
    (entry.article ? '<span class="article">' + escapeHtml(entry.article) + "</span>" : "") + escapeHtml(entry.noun);
  els.translation.textContent = getTranslation(entry, "translation");

  els.steps.innerHTML = QUESTIONS.map(
    (q, i) =>
      '<div class="step ' +
      (i === 0 ? "active" : "pending") +
      '" data-step="' +
      i +
      '">' +
      '<div class="step-q">' +
      q.label +
      "</div>" +
      '<div class="sentence"><span class="lead">' +
      escapeHtml(leadFor(entry, q)) +
      "</span> " +
      '<span class="slot" id="slot' +
      i +
      '">&nbsp;</span> ' +
      escapeHtml(nounFor(entry, q.key)) +
      ".</div>" +
      "</div>"
  ).join("");

  els.ruleLabel.textContent = "";
  els.ruleForms.textContent = "";
  els.ruleNote.innerHTML = "";
  els.next.classList.add("hidden");
  els.choices.classList.remove("hidden");
  renderChoices();
  fitToCard(els.place);
}

function renderChoices() {
  const entry = session[index],
    list = buttonsFor(entry, QUESTIONS[step].key);
  els.choices.className = "choices " + (list.length === 2 ? "two" : "five");
  els.choices.innerHTML = list
    .map(
      (form, i) =>
        '<button class="choice" data-form="' +
        escapeHtml(form) +
        '" data-slot="' +
        (i + 1) +
        '">' +
        escapeHtml(form) +
        "</button>"
    )
    .join("");
}

/* ===== ANSWER ===== */
function answer(form) {
  if (locked || cardDone) return;
  const entry = session[index],
    q = QUESTIONS[step],
    right = entry[q.key],
    isAlt = altsFor(entry, q.key).includes(form),
    correct = form === right || isAlt;
  if (isAlt) usedAlts.push({ q: q.key, form });
  if (!correct) {
    const h = zuHint(entry, q.key, form);
    if (h) zuHints.push(h);
  }
  locked = true;
  taps++;
  if (correct) score++;
  cardResults.push(correct);
  updateDifficulty(entry, q.key, correct);

  const slot = document.getElementById("slot" + step);
  if (correct) {
    slot.className = "slot good";
    slot.textContent = form;
  } else {
    slot.className = "slot bad";
    slot.innerHTML =
      '<span class="wrong">' + escapeHtml(form) + '</span><span class="right">' + escapeHtml(right) + "</span>";
  }
  pop(slot);
  els.choices.querySelectorAll("button").forEach(b => (b.disabled = true));

  // Short pause so the result of this line can be seen, then the next line opens.
  setTimeout(
    () => {
      const rows = els.steps.querySelectorAll(".step");
      rows[step].classList.remove("active");
      if (step < QUESTIONS.length - 1) {
        step++;
        rows[step].classList.remove("pending");
        rows[step].classList.add("active");
        renderChoices();
        locked = false;
      } else {
        finishCard();
      }
    },
    correct ? 380 : 700
  );
}

function finishCard() {
  const entry = session[index],
    cat = CATEGORIES[entry.cat] || {},
    wrong = cardResults.filter(x => !x).length;
  cardDone = true;
  locked = false;
  recordDaily(wrong === 0);
  recordProgress(entry, wrong === 0);
  els.card.classList.add("done");
  els.game.classList.add(wrong ? "bad" : "good");
  els.eyebrow.textContent = wrong ? "Nicht ganz · " + (3 - wrong) + " / 3" : "Richtig";
  els.ruleLabel.textContent = cat.label || "";
  els.ruleForms.textContent = cat.rule || "";
  els.ruleNote.innerHTML =
    (entry.note ? "<div>" + escapeHtml(getTranslation(entry, "note")) + "</div>" : "") +
    usedAlts.map(a => "<div>" + escapeHtml(altNote(entry, a.q, a.form)) + "</div>").join("") +
    zuHints.join("");
  els.choices.classList.add("hidden");
  els.next.textContent = index === session.length - 1 ? "Fertig" : "Weiter";
  els.next.classList.remove("hidden");
  els.bar.style.width = ((index + 1) / session.length) * 100 + "%";
}

function next() {
  if (!cardDone) return;
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
  els.endScore.textContent = score + " / " + taps;
  els.endNote.textContent = "Was schwierig war, kommt öfter wieder.";
  scrollToTop();
}

/* ===== SMALL MOTION ===== */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function pop(el) {
  if (reduceMotion.matches || !el.animate) return;
  el.animate(
    [
      { opacity: 0, transform: "translateY(-5px)" },
      { opacity: 1, transform: "none" }
    ],
    { duration: 180, easing: "ease-out" }
  );
}

// Keeps the CSS size for places that fit; shrinks only a word wider than the card.
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
  if (inRound()) fitToCard(els.place);
});

/* ===== TABLE WINDOW „Wo · Wohin · Woher“ =====
   One row per group with two examples. Wohin is dimmed when it repeats the Wo word (then it's Akkusativ);
   when the word changes (nach / zu) it stays in full colour and is marked „Dativ“ — the exception to
   „movement = Akkusativ“. Groups with a recent mistake get a faint red marker under their name
   (a line with difficulty ≥ 2 — the same data that makes cards come back). */
const TABLE_ROWS = [
  // Kino + Schweiz share one row: same pattern in · in · aus.
  {
    cats: ["raum", "land"],
    ex: "Kino, die Schweiz",
    parts: [
      ["raum", "Raum"],
      ["land", "Land mit Artikel"]
    ],
    wo: "in",
    wohin: "in",
    woher: "aus"
  },
  { cats: ["stadt"], ex: "Berlin, Japan", label: "Stadt, Land ohne Artikel", wo: "in", wohin: "nach", woher: "aus" },
  { cats: ["kontakt"], ex: "See, Tisch", label: "Wasser, Kontakt", wo: "an", wohin: "an", woher: "von" },
  { cats: ["flaeche"], ex: "Markt, Balkon", label: "offene Fläche", wo: "auf", wohin: "auf", woher: "von" },
  { cats: ["person"], ex: "Arzt, Arbeit", label: "Person, Firma, Aktivität", wo: "bei", wohin: "zu", woher: "von" },
  { cats: ["anzu"], ex: "Bahnhof, Kasse", label: "am Ort", wo: "an", wohin: "zu", woher: "von" },
  { cats: ["hause"], ex: "Hause", label: "zu Hause", wo: "zu", wohin: "nach", woher: "von zu" }
];
function weakCats() {
  const out = new Set();
  PLACES.forEach(e => {
    const d = difficulty[e.id];
    if (d && QUESTIONS.some(q => Number(d[q.key] || 1) >= 2)) out.add(e.cat);
  });
  return out;
}
function tableHtml() {
  const weak = weakCats(),
    h = escapeHtml,
    mk = t => '<span class="mk">' + h(t) + "</span>";
  // The explanation of the marker sits in the empty top-left header cell and only shows when something is marked.
  const anyMark = [...weak].some(c => c === "ausnahme" || TABLE_ROWS.some(r => r.cats.includes(c)));
  let html =
    '<div class="otbl2"><div class="h">' +
    (anyMark ? '<span class="mk-legend">' + mk("markiert") + " =<br>zuletzt Fehler</span>" : "") +
    '</div><div class="h">Wo?<small>Dativ</small></div><div class="h">Wohin?<small>Akk / Dat</small></div>' +
    '<div class="h">Woher?<small>Dativ</small></div><div class="hl"></div>';
  TABLE_ROWS.forEach(r => {
    const same = r.wohin === r.wo;
    const label = r.parts
      ? r.parts.map(([c, t]) => (weak.has(c) ? mk(t) : h(t))).join(" · ")
      : weak.has(r.cats[0])
        ? mk(r.label)
        : h(r.label);
    html +=
      '<div class="ex">' +
      h(r.ex) +
      "</div>" +
      '<div class="p">' +
      h(r.wo) +
      "</div>" +
      '<div class="p' +
      (same ? " same" : "") +
      '"><span class="w">' +
      h(r.wohin) +
      (same ? "" : '<span class="d">Dativ</span>') +
      "</span></div>" +
      '<div class="p">' +
      h(r.woher) +
      "</div>" +
      '<div class="cat">' +
      label +
      "</div>";
  });
  html +=
    '</div><div class="ofoot"><b>' +
    (weak.has("ausnahme") ? mk("immer in:") : "immer in:") +
    "</b> <span>Wald · Park · Garten · Schwimmbad · Berge</span></div>";
  return html;
}

const omodal = document.getElementById("omodal");
const tableIsOpen = () => omodal.classList.contains("open");
function openTable() {
  document.getElementById("otable").innerHTML = tableHtml();
  omodal.classList.add("open");
  omodal.setAttribute("aria-hidden", "false");
}
function closeTable() {
  omodal.classList.remove("open");
  omodal.setAttribute("aria-hidden", "true");
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
  const btn = e.target.closest("button[data-form]");
  if (btn && !btn.disabled) answer(btn.dataset.form);
});
els.next.addEventListener("click", next);
els.playAgain.addEventListener("click", () => {
  els.end.classList.add("hidden");
  els.session.classList.remove("hidden");
  scrollToTop();
});
els.homeBack.addEventListener("click", goBackToHome);
document.querySelectorAll("[data-otable]").forEach(b => b.addEventListener("click", openTable));
document.getElementById("oclose").addEventListener("click", closeTable);
omodal.addEventListener("click", e => {
  if (e.target === omodal) closeTable();
});

/* ===== KEYS (computer keyboard) =====
   Only during a round and while the table window is closed; Esc closes the table.
   Keys 1–5 pick the button in that slot; Enter / Space continue after a card (handled once, so a focused
   Weiter can't move on twice). Enter / Space on the focused table button still open the table.
   Cmd / Ctrl / Option combinations are left to the browser. On the start and summary screens
   Enter presses the focused button, as usual. */
document.addEventListener("keydown", e => {
  if (tableIsOpen()) {
    if (e.key === "Escape") closeTable();
    return;
  }
  if (!inRound() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Enter" || e.key === " ") {
    if (!cardDone || (document.activeElement && document.activeElement.matches("[data-otable]"))) return;
    e.preventDefault();
    if (!e.repeat) next();
    return;
  }
  if (cardDone) return;
  const btn = els.choices.querySelector('button[data-slot="' + e.key + '"]');
  if (btn && !btn.disabled) answer(btn.dataset.form);
});
