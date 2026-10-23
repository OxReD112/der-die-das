/* Partizip II — script. Markup: index.html · styles: partizipII.css
   Needs (loaded before this file): components/deutsch-translation-v1.js, verbs.js (VERBS),
   components/deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html, the Verbformen page's partizipII/?v=
   and the Home tile's verbformen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint). */
const START_ABOUT = {
  text: {
    en: "Helps you learn the Partizip II of the most common irregular verbs.",
    ru: "Помогает запомнить Partizip II самых частых неправильных глаголов."
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
  $("hint").classList.add("hidden");
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

// „hat angefangen“ / „ist geblieben“; both auxiliaries: the verb's own line, each with its use
function perfektLine(v) {
  if (v.perfekt) return v.perfekt;
  return (v.auxiliary === "sein" ? "ist " : "hat ") + v.participle;
}

/* ===== HINTS AFTER A MISTAKE =====
   Shown only after a wrong answer, in the user's language (German forms stay German), at most three lines:
   1. a known trap (gehängt, gewußt, lassen / sehen after a 2nd verb) · 2. the prefix rule (ver-: no ge- ·
   an-: ge- inside) · 3. the kind of verb (mixed, special, strong: -en not -t) · 4. the vowel change with
   other verbs of the same change. */
const HINTS = {
  insep: {
    en: p => `<i>${p}</i> is an inseparable prefix: no <i>ge-</i> in the Partizip II`,
    ru: p => `<i>${p}</i> — неотделяемая приставка: Partizip II без <i>ge-</i>`
  },
  insepGe: {
    en: v => `<i>ge-</i> is an inseparable prefix here (<i>${v.infinitive.replace(/^ge/, "ge·")}</i>): no extra <i>ge-</i>`,
    ru: v => `<i>ge-</i> здесь — неотделяемая приставка (<i>${v.infinitive.replace(/^ge/, "ge·")}</i>): второго <i>ge-</i> нет`
  },
  sep: {
    en: (p, split) => `<i>${p}</i> is a separable prefix: <i>ge-</i> goes inside — <i>${split}</i>`,
    ru: (p, split) => `<i>${p}</i> — отделяемая приставка: <i>ge-</i> внутри — <i>${split}</i>`
  },
  mixed: {
    en: v => `mixed verb: the Partizip II ends in <i>-t</i> like a regular verb, and the vowel always changes${v.consonant ? `; here the consonant changes too: <i>${v.consonant}</i>` : ""} — <i>${v.infinitive} → ${v.participle}</i>`,
    ru: v => `смешанный глагол: Partizip II кончается на <i>-t</i>, как у правильных, а гласная всегда меняется${v.consonant ? `; здесь меняется и согласная: <i>${v.consonant}</i>` : ""} — <i>${v.infinitive} → ${v.participle}</i>`
  },
  special: {
    en: v => `special verb: learn its forms — <i>${v.infinitive} → ${v.preterite} → ${v.participle}</i>`,
    ru: v => `особый глагол: его формы запоминают — <i>${v.infinitive} → ${v.preterite} → ${v.participle}</i>`
  },
  strong: {
    en: () => "strong verb: the Partizip II ends in <i>-en</i>, not <i>-t</i>",
    ru: () => "сильный глагол: Partizip II на <i>-en</i>, не на <i>-t</i>"
  },
  vowel: {
    en: (from, to, list, cons, exc) =>
      (from === to ? `the vowel stays <i>${from}</i>` : `the vowel changes <i>${from} → ${to}</i>`) +
      (exc ? " (the exception to ie → o)" : "") + (list ? `, like ${list}` : "") +
      (cons ? `; consonant: <i>${cons}</i>` : ""),
    ru: (from, to, list, cons, exc) =>
      (from === to ? `гласная не меняется: <i>${from}</i>` : `гласная меняется: <i>${from} → ${to}</i>`) +
      (exc ? " (исключение из ie → o)" : "") + (list ? `, как ${list}` : "") +
      (cons ? `; согласная: <i>${cons}</i>` : "")
  },
  ss: {
    en: () => "after a short vowel: <i>ss</i> — <i>gewusst, geschlossen</i> (ß only after a long vowel or a diphthong)",
    ru: () => "после краткой гласной — <i>ss</i>: <i>gewusst, geschlossen</i> (ß — только после долгой гласной или дифтонга)"
  },
  haengen: {
    en: () => "hang something up: <i>hängte, gehängt</i> · be hanging: <i>hing, gehangen</i>",
    ru: () => "вешать: <i>hängte, gehängt</i> · висеть: <i>hing, gehangen</i>"
  },
  ersatz: {
    en: v => `<i>${v.infinitive}</i> as Partizip II only after a second verb: <i>${v.infinitive === "sehen" ? "hat ihn kommen sehen" : "hat das Auto reparieren lassen"}</i>. On its own: <i>${v.participle}</i>`,
    ru: v => `<i>${v.infinitive}</i> вместо Partizip II — только после второго глагола: <i>${v.infinitive === "sehen" ? "hat ihn kommen sehen" : "hat das Auto reparieren lassen"}</i>. Отдельно: <i>${v.participle}</i>`
  }
};
const lang = () => (window.DeutschTranslation ? DeutschTranslation.getLang() : "en");
const hint = (name, ...args) => (HINTS[name][lang()] || HINTS[name].en)(...args);

function vowelChange(v) {
  const parts = String(v.pattern || "").split(/\s*-\s*/);
  return parts.length >= 3 ? [parts[0], parts[2]] : null;
}

function hintLines(v, typed) {
  const lines = [];
  const p = v.participle.toLowerCase(),
    inf = v.infinitive.toLowerCase();
  let trap = false;
  if (inf === "hängen" && typed.startsWith("gehängt")) (lines.push(hint("haengen")), (trap = true));
  if ((inf === "lassen" || inf === "sehen") && typed === inf) (lines.push(hint("ersatz", v)), (trap = true));
  if (typed.includes("ß") && typed.replace(/ß/g, "ss") === p) (lines.push(hint("ss")), (trap = true));
  if (trap) return lines;
  if (v.prefix) lines.push(v.prefix === "ge-" ? hint("insepGe", v) : hint("insep", v.prefix));
  if (v.separable) {
    const sp = v.separable.replace("-", "");
    lines.push(hint("sep", v.separable, sp + "·ge·" + v.participle.slice(sp.length + 2)));
  }
  if ((v.prefix || v.separable) && typed.slice(-4) === p.slice(-4)) return lines; // only the ge- mistake
  if (v.kind === "mixed") lines.push(hint("mixed", v));
  else if (v.kind === "special") lines.push(hint("special", v));
  else {
    if (/t$/.test(typed) && /en$/.test(p)) lines.push(hint("strong"));
    const ch = vowelChange(v);
    // the vowel line only when the typed word's ending is not already right (gefahrt: yes; gesitzt: yes)
    if (ch && typed.slice(-4) !== p.slice(-4)) {
      // compare only with plain verbs of the same change and no consonant change (so the comparison is clean)
      const same = VERBS.filter(o => o !== v && !o.kind && !o.prefix && !o.separable && !o.consonant && String(vowelChange(o)) === String(ch))
        .slice(0, 2)
        .map(o => "<i>" + o.infinitive + " → " + o.participle + "</i>");
      lines.push(hint("vowel", ch[0], ch[1], same.join(", "), v.consonant, v.infinitive === "liegen"));
    }
  }
  return lines.slice(0, 3);
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
  // ss for ß is accepted (no ß key, Swiss spelling: geheissen); ß for ss is not (old spelling: gewußt)
  const p = v.participle.toLowerCase();
  const ok = a === p || a === p.replace(/ß/g, "ss");
  if (ok) correctCount++;
  updateDifficulty(v, ok);
  recordProgress(v, ok);

  $("result").className = "result show " + (ok ? "good" : "bad");
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
  $("state").textContent = ok ? "Richtig" : "Nicht ganz";
  // the vowel change only after a mistake (and not for sein / haben: their forms follow no vowel pattern)
  $("vowelPattern").textContent = ok || v.kind === "special" ? "" : partizipPattern(v.pattern);
  $("forms").textContent = shouldShowPreterite(v)
    ? v.infinitive + " → " + v.preterite + " → " + v.participle
    : v.infinitive + " → " + v.participle;
  const perfekt = document.createElement("b");
  perfekt.textContent = perfektLine(v);
  $("meta").replaceChildren("Perfekt: ", perfekt);
  if (v.regional) {
    const reg = document.createElement("span");
    reg.className = "regional";
    reg.textContent = "süddt., österr., schweiz.: " + v.regional;
    $("meta").append(reg);
  }
  $("example").textContent = v.example;
  const lines = ok ? [] : hintLines(v, a);
  $("hint").innerHTML = lines.map(l => '<div class="hint-line">' + l + "</div>").join("");
  $("hint").classList.toggle("hidden", !lines.length);
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

/* ===== TABLE WINDOW „Spickzettel“ (2026-10-20: was „Vokalwechsel“; now also prefixes, endings, special verbs, consonants) =====
   Infinitive vowel → the vowels its Partizip II can have in this exercise.
   During a round (2026-09-28, like Vielseitige Verben): the button is off until Prüfen; then the verb's cell is
   lit (its infinitive vowel) with its Partizip II vowel marked - from the verb's pattern („ei - ie - ie“ → ei → ie). */
// Strong verbs in general (not only this exercise), 2026-10-20:
//  - cells: vowels with no condition (one or several possible vowels: e → o · a · e)
//  - rows: only where a condition or an exception decides (ie, i), with examples that show it
// 3 × 3: top row = the vowels that never change (a, o, u), then the umlauts, then the vowels with several outcomes
// (au: saufen → gesoffen; ä → o only in rare verbs: gebären → geboren, hence in brackets)
const VOWEL_CHANGES = [
  ["a", ["a"]],
  ["o", ["o"]],
  ["u", ["u"]],
  ["ä", ["a", "(o)"]],
  ["ö", ["o"]],
  ["ü", ["o"]],
  ["au", ["au", "o"]],
  ["e", ["o", "a", "e"]],
  ["ei", ["ie", "i", "ei"]]
];
const VOWEL_GROUPS = [
  { id: "ie", from: "ie", to: "o", en: "", ru: "", ex: "fliegen → geflogen · ziehen → gezogen", note: { en: "(except liegen → gelegen)", ru: "(кроме liegen → gelegen)" } },
  { id: "i-nk", from: "i + nd, ng, nk", to: "u", ex: "finden → gefunden · trinken → getrunken" },
  { id: "i-nn", from: "i + nn, mm", to: "o", ex: "beginnen → begonnen · schwimmen → geschwommen" },
  { id: "i", from: "i", to: "e", ex: "sitzen → gesessen · bitten → gebeten", note: { en: "only sitzen and bitten", ru: "только sitzen и bitten" } },

];
// which cell / group belongs to the verb (none for mixed and special verbs: their own rules)
function vowelSlot(v) {
  if (!v || v.kind) return null;
  const from = String(v.pattern || "").split(/\s*-\s*/)[0];
  const stem = v.infinitive.slice((v.separable || v.prefix || "").replace("-", "").length);
  if (from === "i") return /i(nd|ng|nk)/.test(stem) ? "i-nk" : /i(nn|mm)/.test(stem) ? "i-nn" : "i";
  return from;
}

/* General rules under the vowels, in the user's language; the verb's rule is lit after Prüfen. */
const TABLE_RULES = [
  { id: "insep", section: "Präfixe", en: "be-, emp-, ent-, er-, ge-, miss-, ver-, zer- — no ge‑", ru: "be-, emp-, ent-, er-, ge-, miss-, ver-, zer- — без ge‑", ex: "bekommen → bekommen · vergessen → vergessen",
    note: { en: "don't confuse: geben → gegeben, gehen → gegangen (here ge‑ is not a prefix but part of the stem)", ru: "не путать: geben → gegeben, gehen → gegangen (здесь ge‑ не приставка, а часть корня)" } },
  { id: "sep", section: "Präfixe", en: "separable prefix — ge- goes inside", ru: "отделяемая приставка — ge- внутри", ex: "an·ge·fangen · ein·ge·laden" },
  { id: "strong", section: "Endungen", en: "strong verbs: ending -en", ru: "сильные глаголы: окончание -en", ex: "finden → gefunden · schreiben → geschrieben",
    note: { en: "among irregular verbs, all are strong except the mixed and the special ones", ru: "среди неправильных глаголов все, кроме смешанных и особых, — сильные" } },
  { id: "mixed", section: "Endungen", en: "mixed verbs: ending -t", ru: "смешанные глаголы: окончание -t", ex: "bringen → gebracht · kennen → gekannt",
    note: { en: "the vowel always changes; there are only about ten: bringen, brennen, denken, kennen, nennen, rennen, wissen", ru: "гласная всегда меняется; их всего около десяти: bringen, brennen, denken, kennen, nennen, rennen, wissen" },
    note2: { en: "two forms: senden → gesandt / gesendet, wenden → gewandt / gewendet", ru: "две формы: senden → gesandt / gesendet, wenden → gewandt / gewendet" } },
  { id: "special", section: "Besondere Verben", en: "their own forms — learn them", ru: "свои формы — запомнить", ex: "sein → gewesen · haben → gehabt · tun → getan",
    note: { en: "and the modal verbs", ru: "и модальные глаголы" } },
  { id: "consonant", section: "Konsonanten", en: "the vowel becomes short — the consonant doubles", ru: "гласная становится краткой — согласная удваивается", ex: "streiten → gestritten · nehmen → genommen · schließen → geschlossen",
    note: { en: "and the other way round: bitten → gebeten", ru: "и наоборот: bitten → gebeten" },
    note2: { en: "ch never doubles: riechen → gerochen", ru: "ch не удваивается: riechen → gerochen" } },
  { id: "consonantOwn", section: "Konsonanten", en: "the consonant changes or is added", ru: "согласная меняется или добавляется", ex: "ziehen → gezogen · schneiden → geschnitten · bringen → gebracht · denken → gedacht · gehen → gegangen · stehen → gestanden · essen → gegessen · sitzen → gesessen",
    note: { en: "these are the most common such verbs", ru: "это самые частые такие глаголы" } }
];
function verbRules(v) {
  if (!v) return [];
  const r = [v.prefix ? "insep" : v.separable ? "sep" : null, v.kind || "strong"].filter(Boolean);
  // doubling: hm → mm, t → tt, ß → ss, tt → t (bitten); short vowel before ch: no doubling (riechen, vergleichen)
  if (v.consonant) r.push(/^(hm|t|ß|tt) → /.test(v.consonant) ? "consonant" : "consonantOwn");
  else if (/^(riechen|vergleichen)$/.test(v.infinitive)) r.push("consonant");
  return r;
}

function patternTableHtml(lit = null, v = null) {
  const slot = vowelSlot(v);
  const cells = VOWEL_CHANGES.map(([from, to]) => {
    const on = slot === from;
    return (
      '<div class="pattern-cell' + (on ? " lit" : "") + '"><div class="pattern-source">' + from +
      '</div><div class="pattern-options"><span class="arrow">→</span>' +
      to.map(t => (on && lit && t === lit[1] ? '<span class="lit-vowel">' : "<span>") + t + "</span>").join('<span class="arrow">·</span>') +
      "</div></div>\n"
    );
  });
  const groups = VOWEL_GROUPS.map(g => {
    const on = slot === g.id;
    const note = g.note ? '<span class="pattern-group-note">' + (g.note[lang()] || g.note.en) + "</span>" : "";
    return (
      '<div class="pattern-group' + (on ? " lit" : "") + '"><div class="pattern-group-head"><span class="pattern-source">' + g.from +
      '</span><span class="arrow">→</span><span class="pattern-to">' + g.to + "</span>" + note +
      '</div><div class="pattern-rule-ex" lang="de">' + g.ex + "</div></div>"
    );
  }).join("\n");
  const litRules = verbRules(v);
  let section = "";
  const rules = TABLE_RULES.map(
    r =>
      (r.section !== section ? '</div><h3 class="pattern-section">' + (section = r.section) + '</h3><div class="pattern-rules">' : "") +
      '<div class="pattern-rule' + (litRules.includes(r.id) ? " lit" : "") + '"><div class="pattern-rule-text">' +
      (r[lang()] || r.en) + '</div><div class="pattern-rule-ex" lang="de">' + r.ex + "</div>" +
      [r.note, r.note2].filter(Boolean).map(n => '<div class="pattern-rule-note">' + (n[lang()] || n.en) + "</div>").join("") + "</div>"
  ).join("\n");
  return (
    '<h3 class="pattern-section">Vokalwechsel</h3><p class="pattern-intro">Infinitiv → Partizip II · starke Verben</p>' +
    '<div class="pattern-grid">\n' + cells.join("") + "</div>" +
    '<div class="pattern-groups">' + groups + "</div>" +
    '<div class="pattern-rules">' + rules + "</div>"
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
  const v = round ? deck[index] : null;
  $("patternModalBody").innerHTML = patternTableHtml(v && v.kind !== "special" ? patternLit(v) : null, v);
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
