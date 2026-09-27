/* Modalverben — script. Markup: index.html · styles: modalverben.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, special_verbs.js (SPECIAL_VERB_EXERCISES),
   components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Verbformen page's modalverben/?v=
   and the Home tile's verbformen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you learn all forms of the modal verbs and werden - and pick the right one for what you mean.",
    ru: "Помогает запомнить все формы модальных глаголов и werden - и выбрать нужную по смыслу."
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

function syncKeyboardAndFocus() {
  if (window.deutschKeyboardReady && !checked) $("keyboard").classList.add("show");
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
  if (inRound() && !checked) $("keyboard").classList.add("show");
  return true;
}
loadKeyboardComponent().catch(e => console.error(e));

/* ===== TABLE WINDOW „Modalverben · Formen“ =====
   Group row (können · müssen · dürfen · sollen · wollen): first the ending scheme, a tap on a verb shows its
   forms, „Zurücksetzen“ goes back to the scheme. mögen and werden fold out on their own. */

const MODAL_FORM_PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

const MODAL_FORM_GROUP = {
  verbs: ["können", "müssen", "dürfen", "sollen", "wollen"],
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

const MODAL_FORM_SPECIAL = {
  mögen: {
    present: ["mag", "magst", "mag", "mögen", "mögt", "mögen"],
    preterite: ["mochte", "mochtest", "mochte", "mochten", "mochtet", "mochten"],
    k2: ["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"]
  },
  werden: {
    present: ["werde", "wirst", "wird", "werden", "werdet", "werden"],
    preterite: ["wurde", "wurdest", "wurde", "wurden", "wurdet", "wurden"],
    k2: ["würde", "würdest", "würde", "würden", "würdet", "würden"],
    participle: "geworden"
  }
};

const MODAL_FORM_SCHEME = {
  present: ["-", "-st", "-", "-en", "-t", "-en"],
  preterite: ["-e", "-est", "-e", "-en", "-et", "-en"],
  k2: ["-e", "-est", "-e", "-en", "-et", "-en"]
};

let modalFormMode = "scheme";
let modalFormGroupOpen = true;
let modalSpecialOpen = { mögen: false, werden: false };

function umlautGlyph() {
  return '<span class="umlaut-remove">ø</span>';
}

function renderFormsDetail(verb, scheme = false) {
  const forms = scheme ? MODAL_FORM_SCHEME : MODAL_FORM_GROUP.forms[verb] || MODAL_FORM_SPECIAL[verb];

  const rows = MODAL_FORM_PERSONS.map(
    (person, i) => `
    <tr>
      <td class="forms-person">${person}</td>
      <td class="${scheme ? "forms-scheme" : ""}">${scheme && i < 3 ? `<span class="umlaut-slot">${umlautGlyph()} </span>${forms.present[i]}` : scheme ? `<span class="umlaut-slot">&nbsp;&nbsp;&nbsp;</span>${forms.present[i]}` : forms.present[i]}</td>
      <td class="${scheme ? "forms-scheme" : ""}">${scheme ? `<span class="umlaut-slot">${umlautGlyph()} </span>${forms.preterite[i]}` : forms.preterite[i]}</td>
      <td class="${scheme ? "forms-scheme" : ""}">${forms.k2[i]}</td>
    </tr>`
  ).join("");

  const note = scheme ? `<div class="forms-note">${umlautGlyph()} = Umlaut entfernen</div>` : "";

  const participle =
    verb === "werden" ? `<div class="forms-detail-participle">Partizip II · <b>geworden</b></div>` : "";

  return `
    <div class="forms-detail">
      <table class="forms-detail-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Präsens</th>
            <th>Präteritum</th>
            <th>Konjunktiv II</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${note}${participle}
    </div>`;
}

function renderFormsTable() {
  const selected = modalFormMode !== "scheme" ? modalFormMode : null;

  const groupButtons = MODAL_FORM_GROUP.verbs
    .map(
      (verb, i) => `
    ${i ? '<span class="group-separator">·</span>' : ""}
    <button class="verb-choice" type="button" data-modal-verb="${verb}">${verb}</button>`
    )
    .join("");

  const groupRow = `
    <tbody class="forms-group${modalFormGroupOpen ? " open" : ""}" data-forms-group>
      <tr class="verb-group-row">
        <td class="verb-group" colspan="3">
          <span class="forms-chevron" data-toggle-group aria-label="Modalverben auf- und zuklappen">›</span>
          ${groupButtons}
        </td>
        <td class="reset-cell">
          <button class="forms-reset" type="button" data-reset-forms>Zurücksetzen</button>
        </td>
      </tr>
      <tr class="forms-detail-row">
        <td colspan="4">${renderFormsDetail(selected || "können", !selected)}</td>
      </tr>
    </tbody>`;

  const specialRows = ["mögen", "werden"]
    .map(
      verb => `
    <tbody class="forms-group${modalSpecialOpen[verb] ? " open" : ""}" data-special-group="${verb}">
      <tr class="verb-group-row">
        <td class="verb-group" colspan="4">
          <span class="forms-chevron" data-toggle-special="${verb}" aria-label="${verb} auf- und zuklappen">›</span>
          <button class="verb-choice" type="button" data-special-verb="${verb}">${verb}</button>
        </td>
      </tr>
      <tr class="forms-detail-row">
        <td colspan="4">${renderFormsDetail(verb, false)}</td>
      </tr>
    </tbody>`
    )
    .join("");

  $("formsModalBody").innerHTML = `
    <p class="forms-intro">Klicke auf ein Verb der Gruppe, um seine konkreten Formen zu sehen.</p>
    <table class="forms-table">
      ${groupRow}
      ${specialRows}
    </table>`;
}

function setFormsMode(mode) {
  modalFormMode = mode;
  modalFormGroupOpen = true;
  renderFormsTable();
}

function openFormsTable() {
  modalFormMode = "scheme";
  modalFormGroupOpen = true;
  modalSpecialOpen = { mögen: false, werden: false };
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

document.querySelectorAll("[data-forms-table]").forEach(button => button.addEventListener("click", openFormsTable));
$("formsClose").onclick = closeFormsTable;
$("formsModal").onclick = e => {
  if (e.target === $("formsModal")) closeFormsTable();
};

$("formsModalBody").addEventListener("click", e => {
  const reset = e.target.closest("[data-reset-forms]");
  if (reset) {
    e.stopPropagation();
    modalFormMode = "scheme";
    modalFormGroupOpen = true;
    renderFormsTable();
    return;
  }

  const verbButton = e.target.closest("[data-modal-verb]");
  if (verbButton) {
    e.stopPropagation();
    setFormsMode(verbButton.dataset.modalVerb);
    return;
  }

  const groupToggle = e.target.closest("[data-toggle-group]");
  if (groupToggle) {
    e.stopPropagation();
    modalFormGroupOpen = !modalFormGroupOpen;
    renderFormsTable();
    return;
  }

  const specialToggle = e.target.closest("[data-toggle-special]");
  const specialButton = e.target.closest("[data-special-verb]");
  if (specialToggle || specialButton) {
    e.stopPropagation();
    const verb =
      (specialToggle || specialButton).dataset.toggleSpecial || (specialToggle || specialButton).dataset.specialVerb;
    modalSpecialOpen[verb] = !modalSpecialOpen[verb];
    renderFormsTable();
  }
});
