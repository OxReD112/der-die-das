/* Vielseitige Verben — script. Markup: index.html · styles: vielseitige_verben.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, sentences.js (VV_SENTENCES, VV_JOBS,
   VV_FORMS, VV_USE_PAIRS, VV_HINTS), components/deutsch-progress-v1.js (optional).
   Built from modalverben.js (same difficulty, deck, keyboard, keys and back-to-Home code); no table window.
   When this file changes, raise its ?v= in index.html, the Verbformen page's vielseitige_verben/?v=
   and the Home tile's verbformen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "werden or lassen? wird or ist? Helps you tell apart verbs that do many jobs and pick the right form for what you mean.",
    ru: "werden или lassen? wird или ist? Помогает различать глаголы, у которых много значений, и выбирать нужную форму по смыслу."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const $ = id => document.getElementById(id);
const SENTENCES = VV_SENTENCES;
const pick = value => (window.DeutschTranslation ? DeutschTranslation.pick(value) : value?.en || "");

/* Phones and tablets type on the app's own keyboard (components/deutsch-keyboard): the field is read-only
   there so the system keyboard never opens, and there is no Prüfen button (✓ on the keyboard instead). */
const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
if (isTouchDevice) {
  $("answer").readOnly = true;
  $("answer").setAttribute("inputmode", "none");
  $("check").style.display = "none";
}

/* ===== DIFFICULTY (which sentences come up more often) =====
   One score per sentence; key = verb|sentence — the sentence text is part of the key, so changing a sentence in
   sentences.js starts it again at 1. Scoring format 2 (Documentation/PROGRESS_TRACKER.md): common scale 1–4,
   wrong +1, right −0.5. */
const STORAGE_KEY = "vielseitigeVerbenDifficultyV1";
const DIFFICULTY_FORMAT = 2;
let difficulty = {};
try {
  difficulty = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
} catch (e) {
  difficulty = {};
}
if (!difficulty || typeof difficulty !== "object") difficulty = {};
if (difficulty.__format !== DIFFICULTY_FORMAT) {
  difficulty = { __format: DIFFICULTY_FORMAT };
  saveDifficulty();
}

function saveDifficulty() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(difficulty));
  } catch (e) {}
}

const itemKey = item => `${item.verb}|${item.sentence}`;

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
   Progress: one item per VERB + JOB (e.g. „werden · Passiv“), not per sentence — the bar shows how many
   jobs you know. Guarded: the exercise keeps working if the helper is missing.
   Today's count: Home counts the answers (the message is ignored when the page runs on its own). */
const PROGRESS_ID = "vielseitigeVerben";
const hasProgress = () => typeof window.DeutschProgress === "object";
const progressKey = item => item.verb + "|" + item.job;
if (hasProgress()) {
  const seen = new Set();
  DeutschProgress.init(
    PROGRESS_ID,
    SENTENCES.filter(i => !seen.has(progressKey(i)) && seen.add(progressKey(i))).map(i => ({
      key: progressKey(i),
      label: i.verb + " · " + VV_JOBS[i.job].de
    }))
  );
}

function recordProgress(item, ok) {
  window.parent.postMessage({ type: "deutsch:exerciseAnswer", exercise: "vielseitigeVerben" }, "*");
  try {
    if (hasProgress()) DeutschProgress.record(PROGRESS_ID, progressKey(item), ok);
  } catch (e) {}
}

/* ===== DECK =====
   Weighted sampling WITHOUT replacement: difficult sentences are more likely to enter a round,
   but no sentence can occur twice in that round. Fully mixed: no pairs back to back (decided 2026-09-28). */
let deck = [],
  results = [],
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
  results = [];
  index = 0;
  correctCount = 0;
  showScreen("study");
  render();
}

/* Keyboard above the Home button (same as Modalverben): when a long sentence on a small screen leaves no room
   for the keyboard at its place, the question card shrinks just enough (down to 80%). */
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

/* ===== SENTENCE ===== the gap „___“; after Prüfen the gap is filled and the clue words are marked */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function markClues(html, marks) {
  let out = html;
  [...(marks || [])]
    .sort((a, b) => b.length - a.length)
    .forEach(m => {
      const re = new RegExp(`(?<![\\p{L}\\d>])(${esc(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\d])`, "u");
      out = out.replace(re, "<mark>$1</mark>");
    });
  return out;
}

function sentenceHtml(item, shown = null, wrong = false) {
  const [before, after = ""] = String(item.sentence).split("___");
  if (shown === null) return esc(before) + '<span class="gap">&nbsp;&nbsp;&nbsp;</span>' + esc(after);
  const gap = '<span class="gap filled' + (wrong ? " wrong" : "") + '">' + esc(shown) + "</span>";
  return markClues(esc(before), item.marks) + gap + markClues(esc(after), item.marks);
}

function render() {
  const item = deck[index];
  checked = false;
  $("situation").textContent = pick(item.situation);
  $("sentence").innerHTML = sentenceHtml(item);
  $("answer").value = "";
  $("answer").disabled = false;
  $("answer-area").classList.remove("hidden");
  $("result").className = "result";
  $("hint").classList.add("hidden");
  $("next").classList.remove("show");
  $("check").style.display = isTouchDevice ? "none" : "";
  $("count").textContent = index + 1 + " / " + deck.length;
  $("bar").style.width = ((index + 1) / deck.length) * 100 + "%";
  scrollToTop();
  syncKeyboardAndFocus();
}

/* ===== ANSWER ===== */
// ß may be typed as ss; case and extra spaces don't matter
const norm = s =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ß/g, "ss");

// which verb (and which form) a typed word is
function lookupForm(typed) {
  const t = norm(typed);
  for (const verb in VV_FORMS)
    for (const form in VV_FORMS[verb]) if (norm(form) === t) return { verb, label: VV_FORMS[verb][form] };
  return null;
}

// the label that fits the sentence (e.g. „Infinitiv“ out of „Infinitiv · Präsens (wir, sie)“)
function neededLabel(item) {
  const hit = lookupForm(item.answer);
  if (hit && hit.verb === item.verb) {
    const base = item.form.split(" ")[0];
    const one = hit.label.split(" · ").find(l => l.startsWith(base));
    if (one) return one;
  }
  return item.form;
}

const rich = text => esc(text).replace(/\*([^*]+)\*/g, "<i>$1</i>");

/* Yellow box, only after a wrong answer:
   - another verb, known mix-up → a contrast, one line per verb (VV_HINTS)
   - another verb, no known mix-up (a fixed phrase…) → nothing, the rule line is enough
   - the right verb in the wrong form → „yours / needed“ rows with the form names
     (geworden / worden, gelassen / lassen: the use + a tiny example instead of the same form name) */
function hintHtml(item, typed) {
  const hit = lookupForm(typed);
  if (!hit) return "";
  if (hit.verb !== item.verb) {
    const h = VV_HINTS[item.verb + ">" + hit.verb];
    if (!h || (h.only && !h.only.includes(item.job))) return "";
    return h.lines.map(l => `<div class="hint-line">${rich(pick(l))}</div>`).join("");
  }
  const yoursTag = pick({ en: "yours", ru: "твой" }),
    neededTag = pick({ en: "needed", ru: "нужно" });
  const t = norm(typed),
    a = norm(item.answer);
  for (const key in VV_USE_PAIRS) {
    const [x, y] = key.split("|");
    if ((t === x && a === y) || (t === y && a === x)) {
      const P = VV_USE_PAIRS[key];
      const row = (cls, tag, w) =>
        `<span class="tag">${tag}</span><span class="w ${cls}">${esc(w)}</span>` +
        `<span class="lbl">${esc(pick(P[w]))} — <i>${esc(P[w].ex)}</i></span>`;
      return `<div class="hint-rows">${row("yours", yoursTag, t)}${row("needed", neededTag, a)}</div>`;
    }
  }
  return (
    `<div class="hint-rows">` +
    `<span class="tag">${yoursTag}</span><span class="w yours">${esc(typed)}</span><span class="lbl">${esc(hit.label)}</span>` +
    `<span class="tag">${neededTag}</span><span class="w needed">${esc(item.answer)}</span><span class="lbl">${esc(neededLabel(item))}</span>` +
    `</div>`
  );
}

function checkAnswer() {
  if (checked) {
    next();
    return;
  }
  const item = deck[index];
  const typed = $("answer").value.trim();
  if (!typed) return;

  checked = true;
  const ok = [item.answer, ...(item.also || [])].some(x => norm(x) === norm(typed));
  if (ok) correctCount++;
  results.push({ item, ok });
  updateDifficulty(item, ok);
  recordProgress(item, ok);

  // an accepted other answer (gekriegt, kriegt …) stays as typed; otherwise the main answer is shown
  const shown = ok ? typed : item.answer;
  $("result").className = "result show " + (ok ? "good" : "bad");
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
  $("sentence").innerHTML = sentenceHtml(item, shown, !ok);
  $("state").textContent = ok ? "Richtig" : "Nicht ganz";
  // the right word in green; after a mistake the typed word in red, crossed out
  $("formLine").innerHTML =
    `<span class="right">${esc(shown)}</span>` + (ok ? "" : `<span class="wrong-answer">${esc(typed)}</span>`);
  $("formKind").textContent = item.form;
  $("explanation").textContent = pick(item.rule);
  const hint = ok ? "" : hintHtml(item, typed);
  $("hint").innerHTML = hint;
  $("hint").classList.toggle("hidden", !hint);
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

/* Summary: score, then which jobs slipped this round (headline German, rows in the user's language) */
function finishSession() {
  checked = false;
  showScreen("finish");
  $("finalScore").textContent = correctCount + " / " + deck.length;
  $("summary").textContent = "Was schwierig war, kommt öfter wieder.";
  const groups = {};
  results.forEach(({ item, ok }) => {
    const k = progressKey(item);
    groups[k] ||= { verb: item.verb, job: item.job, n: 0, miss: 0 };
    groups[k].n++;
    if (!ok) groups[k].miss++;
  });
  const missed = Object.values(groups)
    .filter(g => g.miss)
    .sort((a, b) => b.miss - a.miss);
  $("slipped").innerHTML = missed.length
    ? "<h3>Hier gab es Fehler</h3>" +
      missed
        .map(
          g =>
            `<div class="slipped-row"><span class="v">${g.verb}</span><span>${esc(pick(VV_JOBS[g.job]))}</span>` +
            `<span class="n">${g.miss} / ${g.n}</span></div>`
        )
        .join("")
    : "";
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
   Only during a round. Enter is handled here once (preventDefault), so a focused Weiter can't move on twice;
   holding it doesn't race through the sentences. On the start and summary screens Enter presses the focused
   button, as usual. */
document.addEventListener("keydown", e => {
  if (!inRound()) return;
  if (e.key === "Enter") {
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
  if (!inRound() || checked) return;
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
