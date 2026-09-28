/* Modalverben — script. Markup: index.html · styles: modalverben.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, special_verbs.js (SPECIAL_VERB_EXERCISES),
   components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Verbformen page's modalverben/?v=
   and the Home tile's verbformen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you learn all forms of the modal verbs - and pick the right one for what you mean.",
    ru: "Помогает запомнить все формы модальных глаголов - и выбрать нужную по смыслу."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const $ = id => document.getElementById(id);
const SENTENCES = SPECIAL_VERB_EXERCISES;

/* Phones and tablets type on the app's own keyboard (components/deutsch-keyboard): the field is read-only
   there so the system keyboard never opens, and there is no Prüfen button (✓ on the keyboard instead). */
const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
if (isTouchDevice) {
  $("answer").readOnly = true;
  $("answer").setAttribute("inputmode", "none");
  $("check").style.display = "none";
}

/* ===== DIFFICULTY (which sentences come up more often) =====
   One score per sentence; key = infinitive|form|sentence — the sentence text is part of the key, so changing
   a sentence in special_verbs.js starts it again at 1.
   Scoring format 2 (Documentation/PROGRESS_TRACKER.md): common scale 1–4, wrong +1, right −0.5.
   Format 1 (old): 1–6, wrong +1.5. Old data has no "__format" marker → converted ONCE:
   new = 1 + (old − 1) × 3/5, rounded to 0.5. The key name stays the same, so an old backup
   restored later is simply converted again. */
const STORAGE_KEY = "modalverbenDifficultyV1";
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

/* Scores of sentences no longer in the exercise (e.g. the werden sentences, removed 2026-09-28) are dropped. */
{
  const known = new Set(SENTENCES.map(i => `${i.infinitive}|${i.form}|${i.sentence}`));
  let pruned = false;
  for (const k in difficulty) {
    if (k !== "__format" && !known.has(k)) {
      delete difficulty[k];
      pruned = true;
    }
  }
  if (pruned) saveDifficulty();
}

function saveDifficulty() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(difficulty));
  } catch (e) {}
}

const itemKey = item => `${item.infinitive}|${item.form}|${item.sentence}`;

function weightFor(item) {
  return Math.max(1, Number(difficulty[itemKey(item)] || 1));
}

function updateDifficulty(item, correct) {
  let d = weightFor(item);
  d = correct ? Math.max(1, d - 0.5) : Math.min(4, d + 1);
  difficulty[itemKey(item)] = Number(d.toFixed(2));
  saveDifficulty();
}

/* ===== PROGRESS (Fortschritt on Home) + TODAY'S COUNT =====
   Progress: one item per VERB + FORM (e.g. „müssen · Präteritum“), not per sentence, and every form counts
   the same, however many sentences it has — the bar shows how many forms you know (decided 2026-09-27).
   Guarded: the exercise keeps working if the helper is missing.
   Today's count: Home counts the answers (the message is ignored when the page runs on its own). */
const PROGRESS_ID = "modalverben";
const hasProgress = () => typeof window.DeutschProgress === "object";
const progressKey = item => item.infinitive + "|" + item.form;
if (hasProgress())
  DeutschProgress.init(
    PROGRESS_ID,
    SENTENCES.map(i => ({ key: progressKey(i), label: i.infinitive + " · " + i.form }))
  );

function recordProgress(item, ok) {
  window.parent.postMessage({ type: "deutsch:exerciseAnswer", exercise: "modalverben" }, "*");
  try {
    if (hasProgress()) DeutschProgress.record(PROGRESS_ID, progressKey(item), ok);
  } catch (e) {}
}

/* ===== DECK =====
   Weighted sampling WITHOUT replacement: difficult sentences are more likely to enter a round,
   but no sentence can occur twice in that round. */
let deck = [],
  index = 0,
  checked = false,
  correctCount = 0;

function buildDeck(size) {
  return SENTENCES.map(item => ({ item, randomKey: -Math.log(Math.max(Math.random(), 1e-12)) / weightFor(item) }))
    .sort((a, b) => a.randomKey - b.randomKey)
    .slice(0, Math.min(size, SENTENCES.length))
    .map(x => x.item);
}

/* ===== SCREENS ===== */
const inRound = () => !$("study").classList.contains("hidden");

// Every screen and every new sentence starts at the top (on short screens the panel scrolls)
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

/* Keyboard above the Home button (see the CSS block KEYBOARD ABOVE THE HOME BUTTON): when a long sentence on a
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

// The sentence with its gap „___“ (a few sentences start with the verb and have no „___“: then the answer
// itself is found in the sentence). The sentence text comes from special_verbs.js.
function sentenceWithGap(item, filled = false, wrong = false) {
  const sentence = String(item.sentence || "");
  const answer = String(item.answer || "");
  const gapClass = filled ? "gap filled" + (wrong ? " wrong" : "") : "gap";
  const visible = filled ? answer : "&nbsp;&nbsp;&nbsp;";
  const gap = '<span class="' + gapClass + '">' + visible + "</span>";
  if (sentence.includes("___")) {
    const parts = sentence.split("___");
    return parts[0] + gap + parts.slice(1).join("___");
  }
  const re = new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return sentence.replace(re, gap);
}

function render() {
  const item = deck[index];
  checked = false;
  $("verb").textContent = item.infinitive;
  $("sentence").innerHTML = sentenceWithGap(item);
  $("translation").textContent = getTranslation(item, "translation");
  $("answer").value = "";
  $("answer").disabled = false;
  $("answer-area").classList.remove("hidden");
  $("result").className = "result";
  $("roundTableBtn").disabled = true; // no peeking: the table opens only after Prüfen
  $("next").classList.remove("show");
  $("check").style.display = isTouchDevice ? "none" : "";
  $("count").textContent = index + 1 + " / " + deck.length;
  $("bar").style.width = ((index + 1) / deck.length) * 100 + "%";
  scrollToTop();
  syncKeyboardAndFocus();
}

/* ===== ANSWER ===== */
function checkAnswer() {
  if (checked) {
    next();
    return;
  }
  const item = deck[index];
  const a = $("answer").value.trim().toLowerCase();
  if (!a) return;

  checked = true;
  const ok = a === item.answer.trim().toLowerCase();
  if (ok) correctCount++;
  updateDifficulty(item, ok);
  recordProgress(item, ok);

  $("result").className = "result show " + (ok ? "good" : "bad");
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
  $("sentence").innerHTML = sentenceWithGap(item, true, !ok);
  $("state").textContent = ok ? "Richtig" : "Nicht ganz";
  $("formKind").textContent = item.form;
  // the typed answer is shown as plain text, crossed out
  const line = [item.infinitive + " → " + item.answer];
  if (!ok) {
    const wrong = document.createElement("span");
    wrong.className = "wrong-answer";
    wrong.textContent = a;
    line.push(" → ", wrong);
  }
  $("formLine").replaceChildren(...line);
  $("explanation").textContent = getTranslation(item, "explanation");
  $("answer-area").classList.add("hidden");
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
   Enter is handled here once (preventDefault), so a focused Weiter can't move on twice; holding it doesn't
   race through the sentences. Enter on the table button still opens the table. On the start and summary
   screens Enter presses the focused button, as usual. */
document.addEventListener("keydown", e => {
  if (tableIsOpen()) {
    if (e.key === "Escape") closeFormsTable();
    return;
  }
  if (!inRound()) return;
  if (e.key === "Enter") {
    if (document.activeElement && document.activeElement.matches("[data-forms-table]")) return;
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
  else if (k === "OK") checkAnswer();
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

/* ===== TABLE WINDOW „Modalverben · Formen“ =====
   Group row (können · müssen · dürfen · mögen · sollen · wollen), always open: first the ending scheme, a tap
   on a verb shows its forms, ↺ (or a second tap on that verb) goes back to the scheme.
   A verb's ich / du / er Präsens forms get one frame (the vowel change to memorise) - not for sollen,
   whose vowel stays.
   Two ways in, one window (2026-09-28, like Vielseitige Verben):
   - start screen → the whole group as described above.
   - during a round → only the verb of the current sentence, the answer's form lit (both cells when a form fits
     two persons: können = wir / sie). The column comes from the sentence's tense, not from the word (sollte is
     Präteritum and Konjunktiv II). Konjunktiv II Vergangenheit („hätte kommen sollen“): the answer is the
     infinitive, not a form in the table - only the Konjunktiv II heading is lit, with a short note.
     The button is off until Prüfen (no peeking). */

const MODAL_FORM_PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

const MODAL_FORM_GROUP = {
  verbs: ["können", "müssen", "dürfen", "mögen", "sollen", "wollen"],
  forms: {
    können: {
      present: ["kann", "kannst", "kann", "können", "könnt", "können"],
      preterite: ["konnte", "konntest", "konnte", "konnten", "konntet", "konnten"],
      k2: ["könnte", "könntest", "könnte", "könnten", "könntet", "könnten"]
    },
    müssen: {
      present: ["muss", "musst", "muss", "müssen", "müsst", "müssen"],
      preterite: ["musste", "musstest", "musste", "mussten", "musstet", "mussten"],
      k2: ["müsste", "müsstest", "müsste", "müssten", "müsstet", "müssten"]
    },
    dürfen: {
      present: ["darf", "darfst", "darf", "dürfen", "dürft", "dürfen"],
      preterite: ["durfte", "durftest", "durfte", "durften", "durftet", "durften"],
      k2: ["dürfte", "dürftest", "dürfte", "dürften", "dürftet", "dürften"]
    },
    mögen: {
      present: ["mag", "magst", "mag", "mögen", "mögt", "mögen"],
      preterite: ["mochte", "mochtest", "mochte", "mochten", "mochtet", "mochten"],
      k2: ["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"]
    },
    sollen: {
      present: ["soll", "sollst", "soll", "sollen", "sollt", "sollen"],
      preterite: ["sollte", "solltest", "sollte", "sollten", "solltet", "sollten"],
      k2: ["sollte", "solltest", "sollte", "sollten", "solltet", "sollten"]
    },
    wollen: {
      present: ["will", "willst", "will", "wollen", "wollt", "wollen"],
      preterite: ["wollte", "wolltest", "wollte", "wollten", "wolltet", "wollten"],
      k2: ["wollte", "wolltest", "wollte", "wollten", "wolltet", "wollten"]
    }
  }
};

const MODAL_FORM_SCHEME = {
  present: ["-", "-st", "-", "-en", "-t", "-en"],
  preterite: ["-te", "-test", "-te", "-ten", "-tet", "-ten"],
  k2: ["-te", "-test", "-te", "-ten", "-tet", "-ten"]
};

/* no frame: the vowel stays (soll, sollst, soll) */
const MODAL_FORM_NO_FRAME = ["sollen"];

let modalFormMode = "scheme";
let modalFormTag = null; // index of the lit meaning tag of the chosen verb
let modalFormRound = false; // true: opened during a round (one verb, the answer lit)

function umlautGlyph() {
  return '<span class="umlaut-remove">ø</span>';
}

/* ===== Meaning: symbols over the tense names + „What do you want to say?“ tags =====
   The symbols and their legend show in the scheme too;
   the tags come with a chosen verb. A tag lights up its column and shows one German example.
   Tags, question and legend are explanations → in the language from Settings (EN / RU), like „Worum geht's?“;
   forms and examples stay German. */
const MODAL_FORM_COLUMNS = [
  { key: "present", name: "Präsens", symbol: "now" },
  { key: "preterite", name: "Präteritum", symbol: "past" },
  { key: "k2", name: "Konjunktiv II", symbol: "unreal" }
];

const MODAL_FORM_SYMBOLS = {
  now: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></svg>',
  past: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6" /><path d="M11 7l-5 5 5 5" /></svg>',
  unreal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" stroke-dasharray="2.6 2.6" /></svg>'
};

const MODAL_FORM_TEXT = {
  question: { en: "What do you want to say?", ru: "Что ты хочешь сказать?" },
  now: { en: "now", ru: "сейчас" },
  past: { en: "past", ru: "раньше" },
  unreal: { en: "not real: polite, maybe, advice", ru: "не на самом деле: вежливо, может быть, совет" },
  same: {
    en: "Präteritum and Konjunktiv II look the same - the sentence decides.",
    ru: "Präteritum и Konjunktiv II совпадают - решает предложение."
  }
};

/* column: 0 Präsens · 1 Präteritum · 2 Konjunktiv II; the form in the example is wrapped in *…* */
const MODAL_FORM_MEANINGS = {
  können: [
    { label: { en: "I'm able to", ru: "я умею, могу" }, column: 0, example: "Ich *kann* schwimmen." },
    { label: { en: "asking politely", ru: "вежливо попросить" }, column: 2, example: "*Könnten* Sie mir helfen?" },
    { label: { en: "maybe, possibly", ru: "может быть" }, column: 2, example: "Das *könnte* klappen." }
  ],
  müssen: [
    { label: { en: "I have to", ru: "надо, нужно" }, column: 0, example: "Ich *muss* jetzt los." },
    { label: { en: "I really should (but …)", ru: "по-хорошему надо бы" }, column: 2, example: "Ich *müsste* mehr schlafen." }
  ],
  dürfen: [
    { label: { en: "it's allowed", ru: "можно, разрешено" }, column: 0, example: "Hier *darf* man parken." },
    { label: { en: "asking very politely", ru: "очень вежливо спросить" }, column: 2, example: "*Dürfte* ich kurz stören?" }
  ],
  mögen: [
    { label: { en: "I like it", ru: "мне нравится" }, column: 0, example: "Ich *mag* Kaffee." },
    { label: { en: "I'd like (polite wish)", ru: "я бы хотел(а)" }, column: 2, example: "Ich *möchte* einen Kaffee." }
  ],
  sollen: [
    { label: { en: "someone wants me to", ru: "кто-то хочет, чтобы я" }, column: 0, example: "Ich *soll* dich grüßen." },
    { label: { en: "giving advice", ru: "дать совет" }, column: 2, example: "Du *solltest* mehr trinken." }
  ],
  wollen: [
    { label: { en: "I want to, I plan to", ru: "хочу, собираюсь" }, column: 0, example: "Ich *will* Deutsch lernen." },
    { label: { en: "starting politely", ru: "вежливо начать" }, column: 1, example: "Ich *wollte* fragen, ob …" }
  ]
};

const modalText = value =>
  window.DeutschTranslation ? window.DeutschTranslation.pick(value) : value.en || "";

function renderFormsLegend() {
  const item = symbol => `<span>${MODAL_FORM_SYMBOLS[symbol]}${modalText(MODAL_FORM_TEXT[symbol])}</span>`;
  return `<div class="forms-legend">${item("now")}${item("past")}${item("unreal")}</div>`;
}

function renderFormsMeanings(verb) {
  const meanings = MODAL_FORM_MEANINGS[verb];
  if (!meanings) return "";
  const tags = meanings
    .map(
      (m, k) => `
      <button class="meaning-tag${k === modalFormTag ? " on" : ""}" type="button" data-meaning="${k}"
        aria-pressed="${k === modalFormTag}">${MODAL_FORM_SYMBOLS[MODAL_FORM_COLUMNS[m.column].symbol]}${modalText(m.label)}</button>`
    )
    .join("");

  let example = "";
  const chosen = meanings[modalFormTag];
  if (chosen) {
    const forms = MODAL_FORM_GROUP.forms[verb];
    const same = forms.preterite[0] === forms.k2[0] && chosen.column > 0;
    example =
      `<div class="meaning-example" lang="de">${chosen.example.replace(/\*(.+?)\*/, "<b>$1</b>")}</div>` +
      (same ? `<div class="meaning-same">${forms.preterite[0]}: ${modalText(MODAL_FORM_TEXT.same)}</div>` : "");
  }

  return `
    <div class="forms-meanings">
      <div class="meaning-question">${modalText(MODAL_FORM_TEXT.question)}</div>
      <div class="meaning-tags">${tags}</div>
      <div class="meaning-answer">${example}</div>
    </div>`;
}

function renderFormsDetail(verb, scheme = false, answer = null) {
  const forms = scheme ? MODAL_FORM_SCHEME : MODAL_FORM_GROUP.forms[verb];
  const inGroup = scheme || MODAL_FORM_GROUP.verbs.includes(verb); // symbols, legend, tags
  const meanings = !scheme && !answer && MODAL_FORM_MEANINGS[verb];
  const litColumn = answer ? answer.column : meanings && meanings[modalFormTag] ? meanings[modalFormTag].column : -1;
  const litCell = (c, i) => (answer ? answer.cells.some(([r, cc]) => r === i && cc === c) : c === litColumn);

  const framed = !scheme && !MODAL_FORM_NO_FRAME.includes(verb);
  const frameClass = i => (framed && i < 3 ? ` stem-frame stem-frame-${["top", "mid", "bottom"][i]}` : "");
  const cellClass = (c, i) =>
    (scheme ? "forms-scheme" : "forms-form") + (c === 0 ? frameClass(i) : "") + (litCell(c, i) ? " lit" : "");

  const cellText = (c, i) => {
    const form = forms[MODAL_FORM_COLUMNS[c].key][i];
    if (!scheme || c === 2) return form;
    const slot = c === 1 || i < 3 ? `${umlautGlyph()} ` : "&nbsp;&nbsp;&nbsp;";
    return `<span class="umlaut-slot">${slot}</span>${form}`;
  };

  const rows = MODAL_FORM_PERSONS.map(
    (person, i) => `
    <tr>
      <td class="forms-person">${person}</td>
      ${[0, 1, 2].map(c => `<td class="${cellClass(c, i)}">${cellText(c, i)}</td>`).join("")}
    </tr>`
  ).join("");

  const heads = MODAL_FORM_COLUMNS.map(
    (col, c) =>
      `<th class="${c === litColumn ? "lit" : ""}">${
        inGroup ? `<span class="forms-symbol">${MODAL_FORM_SYMBOLS[col.symbol]}</span>` : ""
      }${col.name}</th>`
  ).join("");

  const note = scheme
    ? `<div class="forms-note">${umlautGlyph()} = Umlaut entfernen</div>`
    : answer && answer.note
      ? `<div class="forms-answer-note" lang="de">${answer.note}</div>`
      : "";

  return `
    <div class="forms-detail">
      <table class="forms-detail-table">
        <thead>
          <tr>
            <th>Person</th>
            ${heads}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${inGroup ? renderFormsLegend() : ""}${note}${meanings ? renderFormsMeanings(verb) : ""}
    </div>`;
}

/* the answer of the current sentence in the table's terms: { column, cells: [[row, column]…], note } */
const MODAL_FORM_COLUMN_OF = { Präsens: 0, Präteritum: 1, "Präteritum · höflich": 1, "Konjunktiv II": 2 };
function modalAnswerCells(item) {
  const forms = MODAL_FORM_GROUP.forms[item.infinitive];
  if (item.form === "Konjunktiv II Vergangenheit")
    return { column: 2, cells: [], note: `hätte + … + Infinitiv: <b>${item.answer.toLowerCase()}</b>` };
  const column = MODAL_FORM_COLUMN_OF[item.form] ?? -1;
  if (!forms || column < 0) return { column: -1, cells: [] };
  const a = item.answer.trim().toLowerCase();
  const cells = [];
  forms[MODAL_FORM_COLUMNS[column].key].forEach((f, i) => f === a && cells.push([i, column]));
  return { column, cells };
}

function renderFormsTable() {
  if (modalFormRound) {
    const item = deck[index];
    $("formsModalTitle").textContent = item.infinitive + " · Formen";
    $("formsModalBody").innerHTML = renderFormsDetail(item.infinitive, false, modalAnswerCells(item));
    return;
  }
  $("formsModalTitle").textContent = "Modalverben · Formen";
  const selected = modalFormMode !== "scheme" ? modalFormMode : null;

  /* two fixed lines of three verbs: a separator dot never starts a line */
  const verbButton = (verb, i) => `
    ${i ? '<span class="group-separator">·</span>' : ""}
    <button class="verb-choice${verb === selected ? " chosen" : ""}" type="button" data-modal-verb="${verb}"
      aria-pressed="${verb === selected}">${verb}</button>`;
  const verbs = MODAL_FORM_GROUP.verbs;
  const groupButtons = [verbs.slice(0, 3), verbs.slice(3)]
    .map(line => `<span class="verb-line">${line.map(verbButton).join("")}</span>`)
    .join("");

  const groupRow = `
    <tbody class="forms-group open" data-forms-group>
      <tr class="verb-group-row">
        <td class="verb-group" colspan="3">
          ${groupButtons}
        </td>
        <td class="reset-cell">
          <button class="forms-reset${selected ? "" : " hidden"}" type="button" data-reset-forms
            aria-label="Tabelle leeren" title="Tabelle leeren"${selected ? "" : ' tabindex="-1"'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4v6h6" />
              <path d="M5.2 15a8 8 0 1 0 1.9-8.3L3 10" />
            </svg>
          </button>
        </td>
      </tr>
      <tr class="forms-detail-row">
        <td colspan="4">${renderFormsDetail(selected || "können", !selected)}</td>
      </tr>
    </tbody>`;

  $("formsModalBody").innerHTML = `
    <p class="forms-intro">Klicke auf ein Verb der Gruppe, um seine konkreten Formen zu sehen.</p>
    <table class="forms-table">
      ${groupRow}
    </table>`;
}

/* After a meaning tag: roll the window up just enough that the example below the tags is visible (on a phone it
   was hidden under the edge, so nothing seemed to happen). Never rolls down. */
function revealMeaningAnswer() {
  const body = $("formsModalBody");
  const answer = body.querySelector(".meaning-answer");
  if (!answer || !answer.firstElementChild) return;
  const box = body.getBoundingClientRect(),
    r = answer.getBoundingClientRect();
  const delta = Math.min(r.bottom + 14 - box.bottom, r.top - box.top - 60);
  if (delta <= 0) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.scrollTo({ top: body.scrollTop + delta, behavior: reduce ? "auto" : "smooth" });
}

function setFormsMode(mode) {
  modalFormMode = mode;
  modalFormTag = null;
  renderFormsTable();
}

function openFormsTable(mode) {
  if (mode === "verb" && !(inRound() && checked)) return; // off until Prüfen
  modalFormRound = mode === "verb";
  modalFormMode = "scheme";
  modalFormTag = null;
  renderFormsTable();
  const modal = $("formsModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

const tableIsOpen = () => $("formsModal").classList.contains("open");

function closeFormsTable() {
  const modal = $("formsModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  // computer: back to typing without clicking into the field first
  if (inRound() && !checked && !isTouchDevice) focusAnswer();
}

document
  .querySelectorAll("[data-forms-table]")
  .forEach(button => button.addEventListener("click", () => openFormsTable(button.dataset.formsTable)));
$("formsClose").onclick = closeFormsTable;
$("formsModal").onclick = e => {
  if (e.target === $("formsModal")) closeFormsTable();
};

$("formsModalBody").addEventListener("click", e => {
  const reset = e.target.closest("[data-reset-forms]");
  if (reset) {
    e.stopPropagation();
    setFormsMode("scheme");
    return;
  }

  const meaningTag = e.target.closest("[data-meaning]");
  if (meaningTag) {
    e.stopPropagation();
    const k = Number(meaningTag.dataset.meaning);
    modalFormTag = modalFormTag === k ? null : k; // a second tap turns it off
    const body = $("formsModalBody");
    const keep = body.scrollTop;
    renderFormsTable();
    body.scrollTop = keep;
    if (modalFormTag !== null) revealMeaningAnswer();
    return;
  }

  const verbButton = e.target.closest("[data-modal-verb]");
  if (verbButton) {
    e.stopPropagation();
    const verb = verbButton.dataset.modalVerb;
    setFormsMode(verb === modalFormMode ? "scheme" : verb); // second tap on the chosen verb clears the table
    return;
  }
});
