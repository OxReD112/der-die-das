/* Pronomen — script. Markup: index.html · styles: pronomen.css
   Needs (loaded before this file): components/deutsch-day-v1.js, deutsch-translation-v1.js,
   sentences.js (window.PRONOUN_EXERCISES), answer-rules.js (PronomenRules — 16.11: the rules, without the page; the
   native app runs that file as it is), deutsch-progress-v1.js (optional).
   When this file changes, raise its ?v= in index.html and the Home tile's pronomen/?v= */

/* ===== START-SCREEN DESCRIPTION =====
   Shown in the user's language so it is surely understood (like a hint).
     = non-breaking space: keeps each example pair (mich or mir) on one line. */
const START_ABOUT = {
  text: {
    en: "Helps you learn the pronoun forms by heart - mich or mir, sein or seinen - in short everyday sentences.",
    ru: "Помогает запомнить формы местоимений - mich или mir, sein или seinen - на примерах из повседневной речи."
  }
};
document.getElementById("aboutText").textContent = getTranslation(START_ABOUT, "text");

const $ = id => document.getElementById(id);
let ignoreContinueClickUntil = 0;
$("continue").addEventListener("pointerdown", () => { ignoreContinueClickUntil = 0; }, true);
document.addEventListener("click", e => {
  if (isTouchDevice() && Date.now() < ignoreContinueClickUntil && e.target.closest("#continue")) {
    e.preventDefault(); e.stopImmediatePropagation(); ignoreContinueClickUntil = 0;
  }
}, true);
const data = window.PRONOUN_EXERCISES || [];
const R = window.PronomenRules; // the rules (answer-rules.js, 16.11)

function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}
document.documentElement.classList.toggle("is-touch", isTouchDevice());

/* ===== SESSION STATS (last 5 rounds) =====
   Decide which sentences come up more often, the „Noch üben“ list and the marks in the table (rules: answer-rules.js). */
const { STATS_STORE, SESSION_WINDOW } = R;
let statsStore = { sessions: [] };
try {
  statsStore = JSON.parse(localStorage.getItem(STATS_STORE) || '{"sessions":[]}');
} catch (e) {
  statsStore = { sessions: [] };
}
if (!Array.isArray(statsStore.sessions)) statsStore.sessions = [];

function saveStats() {
  try {
    localStorage.setItem(STATS_STORE, JSON.stringify(statsStore));
  } catch (e) {}
}
const currentStats = () => R.currentStats(statsStore.sessions);

/* ===== DAILY STATS (Home: today's answers) ===== */
// 15.11: the score of the day is counted in one place — components/deutsch-daily-v1.js (same rules, same data)
function recordDailyAnswer() {
  window.DeutschDaily.record("pronomen", true);
}

/* ===== PROGRESS (Documentation/PROGRESS_TRACKER.md) =====
   41 categories (personal, possessive owners, possessive endings) — R.progressItems / R.progressKeys. */
const PROGRESS_ID = R.PROGRESS_ID;
const hasProgress = () => typeof window.DeutschProgress === "object";
const possessiveCase = R.possessiveCase;
if (hasProgress()) DeutschProgress.init(PROGRESS_ID, R.progressItems(data));

/* ===== DECK =====
   Half personal, half possessive; inside each type, sentences with recent mistakes come up more often. */
let deck = [],
  i = 0,
  n = 10,
  answer = "",
  correct = 0,
  sessionAnswers = {};

/* ===== QUESTION ===== */
function start(count) {
  n = count;
  deck = R.weightedDeck(data, count, currentStats());
  i = 0;
  answer = "";
  correct = 0;
  sessionAnswers = {};
  $("start").classList.add("hidden");
  $("done").classList.add("hidden");
  $("game").classList.remove("hidden");
  render();
}
function render() {
  const x = deck[i];
  answer = "";
  $("context").textContent = x.context;
  $("sentence").textContent = x.sentence;
  $("translation").textContent = getTranslation(x, "translation");
  paintAnswer();
  $("answerbox").style.display = "flex";
  $("check").style.removeProperty("display");
  $("feedback").className = "feedback hidden";
  $("roundTableBtn").disabled = true; // no peeking: the table opens only after Prüfen
  if (window.deutschKeyboardReady) $("keyboard").classList.add("show");
  fitPrompt();
  $("counter").textContent = `${i + 1} / ${deck.length}`;
  $("bar").style.width = `${(i / deck.length) * 100}%`;
}
// Empty field → the blinking cursor (the placeholder) is shown again.
function paintAnswer() {
  if (answer) $("answerbox").textContent = answer;
  else $("answerbox").innerHTML = '<span class="placeholder"></span>';
}
function feedbackOpen() {
  return !$("feedback").classList.contains("hidden");
}
function tableOpen() {
  return DeutschWindow.isOpen($("modal"));
}
function coloured(text, cls) {
  const s = document.createElement("span");
  s.className = cls;
  s.textContent = text;
  return s;
}

/* ===== ANSWER ===== */
function submit() {
  if (!answer.trim() || feedbackOpen()) return;
  const x = deck[i],
    a = R.assess(x, answer), // right or not, what to count, what to show (answer-rules.js)
    ok = a.ok;
  recordDailyAnswer();
  $("bar").style.width = `${((i + 1) / deck.length) * 100}%`; // the bar fills on the answer, like every exercise
  // Possessives: stem and ending are scored separately; the ending only when the stem was right.
  R.count(sessionAnswers, a.stats);
  if (hasProgress()) a.progress.forEach(([key, right]) => DeutschProgress.record(PROGRESS_ID, key, right));
  if (ok) correct++;
  $("feedback").className = "feedback " + (ok ? "correct" : "wrong");
  $("given").replaceChildren(coloured(answer, ok ? "good" : "bad"));
  const slip = a.slip;
  $("correctText").replaceChildren(...(ok && !slip ? [] : [coloured("→ " + a.shown, "good")]));
  $("caseNote").textContent = a.note ? a.note.text : "";
  $("caseNote").hidden = !slip;
  $("skill").textContent = x.skill + (x.type === "possessive" && x.gender ? " · " + x.gender : "");
  $("answerbox").style.display = "none";
  $("check").style.display = "none";
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
  $("roundTableBtn").disabled = false;
  tabletAnswer();
}
function tabletAnswer() {
  // 03.11.2026 (Alena): phones too — Weiter 16px above the Spickzettel, where the keyboard was (as Partizip II);
  // the question's place is held on tablets only. Short screens scroll as before.
  if (!$("keyboard")?.classList.contains("is-touch") || SHORT_SCREEN.matches) return;
  if (TABLET.matches && tabletPromptTop) document.querySelector("#game .prompt").style.marginTop = tabletPromptTop;
  DeutschBottom.pin($("continue")); // the shared bottom line (components/deutsch-bottom-v1.js), never makes the page scroll
}
function next() {
  i++;
  if (i >= deck.length) {
    finish();
    return;
  }
  render();
}

/* ===== SUMMARY ===== */
function finish() {
  if (Object.keys(sessionAnswers).length) {
    R.endRound(statsStore, DeutschDay.key(), sessionAnswers); // keeps the last SESSION_WINDOW rounds
    saveStats();
  }
  $("game").classList.add("hidden");
  $("done").classList.remove("hidden");
  $("score").textContent = `${correct} / ${deck.length}`;
  // Always kind - praise for taking part (2026-10-22); the phrase and the list are shared (deutsch-end-v1.js)
  $("doneNote").textContent = DeutschEnd.note(correct, deck.length);
  DeutschEnd.list($("weak"), R.weakList(statsStore.sessions, data));
}

/* ===== BUTTONS ===== */
document.querySelectorAll(".size").forEach(b => (b.onclick = () => start(+b.dataset.n)));
$("check").onclick = submit;
$("continue").onclick = next;
$("playAgain").onclick = () => {
  $("done").classList.add("hidden");
  $("start").classList.remove("hidden");
};

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
   Only during a round and while the table window is closed. The key is handled here once
   (preventDefault): a still-focused Weiter or Prüfen button must not act on it a second time.
   Cmd/Ctrl shortcuts are left to the browser; Option stays allowed (Option+s = ß on a Mac). */
document.addEventListener("keydown", e => {
  if ($("game").classList.contains("hidden") || tableOpen() || e.metaKey || e.ctrlKey) return;
  if (feedbackOpen()) {
    if (e.key === "Enter") {
      e.preventDefault();
      next();
    }
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
  } else if (e.key === "Backspace") {
    e.preventDefault();
    answer = answer.slice(0, -1);
    paintAnswer();
  } else if (e.key.length === 1) {
    e.preventDefault();
    answer += e.key;
    paintAnswer();
  }
});

/* ===== ON-SCREEN KEYBOARD =====
   Reusable German keyboard component: it sends the key; Pronomen owns the answer. */
document.addEventListener("deutsch-keyboard-input", e => {
  const k = e.detail?.key || "";
  if ($("game").classList.contains("hidden") || feedbackOpen()) return;
  if (k === "BACK") {
    answer = answer.slice(0, -1);
    paintAnswer();
    return;
  }
  if (k === "OK") {
    if (answer.trim()) ignoreContinueClickUntil = Date.now() + 1000;
    submit();
    return;
  }
  if (k === "SPACE") {
    if (answer.length && !answer.endsWith(" ")) answer += " ";
    paintAnswer();
    return;
  }
  if (k) {
    answer += k;
    paintAnswer();
  }
});
/* Keyboard above the Home button (see the CSS block KEYBOARD ABOVE THE HOME BUTTON): when a long sentence on a
   small screen leaves no room for the keyboard at its place, the question shrinks just enough (down to 80%).
   Measured for every sentence, and again when the screen size changes. */
const SHORT_SCREEN = window.matchMedia("(max-height: 559px), (max-width: 340px) and (max-height: 609px)");
/* Tablets (03.11.2026, CSS block TABLETS, as Modalverben): the question stands in the middle of the room above the
   keyboard (margin-top: auto); the answer holds it there, and Weiter is pinned at the bottom (16px above the
   Spickzettel), where the keyboard was — tabletAnswer(). */
const TABLET = window.matchMedia("(min-width: 700px) and (min-height: 740px)");
let tabletPromptTop = "";
function fitPrompt() {
  const prompt = document.querySelector("#game .prompt"),
    kb = $("keyboard"),
    app = document.querySelector(".app");
  prompt.style.zoom = "";
  const answering = !$("feedback").classList.contains("hidden");
  if (!answering) {
    prompt.style.marginTop = "";
    $("continue").style.marginTop = "";
  }
  if (!kb || !kb.classList.contains("is-touch") || !kb.classList.contains("show") || SHORT_SCREEN.matches) return;
  if (TABLET.matches && !answering) tabletPromptTop = getComputedStyle(prompt).marginTop;
  const over = app.scrollHeight - app.clientHeight;
  if (over <= 0) return;
  const h = prompt.offsetHeight;
  prompt.style.zoom = Math.max(0.8, (h - over) / h).toFixed(3);
}
window.addEventListener("resize", () => {
  if (!$("game").classList.contains("hidden")) fitPrompt();
});
async function loadKeyboardComponent() {
  const mount = $("keyboardMount");
  if (!mount) return false;
  const r = await fetch("../components/deutsch-keyboard-v2.60.html?v=10");
  if (!r.ok) throw new Error("Keyboard component failed to load");
  const text = await r.text();
  const tpl = document.createElement("template");
  tpl.innerHTML = text;
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
  $("keyboard").classList.add("show");
  if (!$("game").classList.contains("hidden")) fitPrompt();
  return true;
}

/* ===== TABLE WINDOW ===== */
// Personal pronouns: [shown, person, Akk, Dat, Possessiv, owner used for the mark]
const PERSONAL_ROWS = [
  ["ich", "ich", "mich", "mir", "mein-", "ich"],
  ["du", "du", "dich", "dir", "dein-", "du"],
  ["er", "er", "ihn", "ihm", "sein-", "er"],
  ["sie", "sie", "sie", "ihr", "ihr-", "sie"],
  ["es", "es", "es", "ihm", "sein-", "er"],
  ["wir", "wir", "uns", "uns", "unser-", "wir"],
  ["ihr", "ihr", "euch", "euch", "euer / eur-", "ihr"],
  ["sie (Pl.)", "sie(pl.)", "sie", "ihnen", "ihr-", "sie(pl.)"],
  ["Sie", "Sie", "Sie", "Ihnen", "Ihr-", "Sie"] // formal row: only shown when it has a recent mistake
];
const CASES = [
  ["Nom.", "Nominativ"],
  ["Akk.", "Akkusativ"],
  ["Dat.", "Dativ"],
  ["Gen.", "Genitiv"]
];
const GENDERS = ["Maskulin", "Neutrum", "Feminin", "Plural"];
const ENDINGS = {
  Nominativ: ["—", "—", "-e", "-e"],
  Akkusativ: ["-en", "—", "-e", "-e"],
  Dativ: ["-em", "-em", "-er", "-en"],
  Genitiv: ["-es", "-es", "-er", "-er"]
};
const focus = (kasus, person) => `data-focus="Personal · ${kasus} · ${person}"`;
const reference =
  '<table class="tbl"><tr><th>Nom.</th><th>Akk.</th><th>Dat.</th><th>Possessiv</th></tr>' +
  PERSONAL_ROWS.map(
    ([shown, p, akk, dat, poss, owner]) =>
      `<tr${p === "Sie" ? ' class="formal-row"' : ""}>` +
      `<td class="nom" ${focus("Nominativ", p)}>${shown}</td>` +
      `<td ${focus("Akkusativ", p)}>${akk}</td>` +
      `<td ${focus("Dativ", p)}>${dat}</td>` +
      `<td data-owner="${owner}">${poss}</td></tr>`
  ).join("") +
  "</table>" +
  '<p class="tbl-note">Possessiv = Stamm + Endung: sein Auto · seinen Bruder · seiner Schwester · euer → eure, euren</p>' +
  '<details class="tbl-more"><summary><span class="ui-chev ui-chev-fold" aria-hidden="true"></span>Possessiv-Endungen</summary>' +
  '<table class="tbl"><tr><th>Kasus</th><th>Mask.</th><th>Neutr.</th><th>Fem.</th><th>Plural</th></tr>' +
  CASES.map(
    ([short, kasus]) =>
      `<tr><td>${short}</td>` +
      GENDERS.map((g, j) => `<td data-ending="${kasus}|${g}">${ENDINGS[kasus][j]}</td>`).join("") +
      "</tr>"
  ).join("") +
  "</table>" +
  '<p class="tbl-note">— = ohne Endung: mein Hund, mein Auto</p></details>';

// Recent mistakes (the session stats) are marked in the table.
function markWeakTable() {
  const weakKeys = currentStats();
  const isWeak = k => weakKeys[k]?.weak;
  // stored keys end in "→ answer", e.g. "personal · Personal · Dativ · ich → mir"
  const hasWeakPersonal = focus =>
    focus.split("|").some(f => Object.keys(weakKeys).some(k => isWeak(k) && k.startsWith(`personal · ${f} →`)));
  const hasWeakPossessive = (owner, cas, gender) => {
    const owners = owner.split("|");
    return Object.keys(weakKeys).some(k => {
      if (!isWeak(k)) return false;
      const m = k.match(/^detail · Possessiv · (.+?) → .+ · (Nominativ|Akkusativ|Dativ|Genitiv) · (.+)$/);
      if (!m) return false;
      const [, detailOwner, detailCase, detailGender] = m;
      return owners.includes(detailOwner) && (!cas || detailCase === cas) && (!gender || detailGender === gender);
    });
  };
  document.querySelectorAll("#modalBody [data-focus]").forEach(td => {
    if (hasWeakPersonal(td.dataset.focus)) td.classList.add("hot");
  });
  document.querySelectorAll("#modalBody [data-owner]").forEach(td => {
    const owners = td.dataset.owner.split("|");
    if (
      Object.keys(weakKeys).some(k => {
        if (!isWeak(k)) return false;
        if (!k.startsWith("root · Possessiv · ")) return false;
        return owners.some(o => k.includes(` · ${o} →`));
      })
    )
      td.classList.add("hot");
  });
  document.querySelectorAll("#modalBody [data-ending]").forEach(td => {
    const [cas, gen] = td.dataset.ending.split("|");
    if (hasWeakPossessive("ich|du|er|sie|wir|ihr|sie(pl.)|Sie", cas, gen)) td.classList.add("hot");
  });
  document.querySelectorAll("#modalBody td.hot").forEach(td => {
    td.innerHTML = '<span class="mk">' + td.innerHTML + "</span>";
  });
  if (document.querySelector("#modalBody .hot")) {
    document
      .querySelector("#modalBody .tbl")
      .insertAdjacentHTML(
        "beforebegin",
        '<div class="mk-legend"><span class="mk">markiert</span> = zuletzt Fehler</div>'
      );
  }
  document.querySelector("#modalBody .formal-row:has(.hot)")?.classList.add("show");
  const more = document.querySelector("#modalBody .tbl-more");
  if (more && more.querySelector(".hot")) more.open = true;
}

/* During a round (2026-09-28, like Vielseitige Verben): the button is off until Prüfen; then the table opens with
   the answer lit - personal: its cell (Akk. / Dat.); possessive: the owner's stem (mein-, sein- …) and the ending
   (case × gender) with „Possessiv-Endungen“ open. The formal Sie row shows when the answer is in it.
   No „zuletzt Fehler“ marks there (one kind of highlight at a time); the start screen keeps them. */
const litSpan = td => {
  td.innerHTML = '<span class="lit">' + td.innerHTML + "</span>";
  const col = td.cellIndex,
    head = td.closest("table").rows[0].cells[col];
  if (head) head.classList.add("lit-head");
  td.closest("tr").classList.add("show"); // the formal Sie row
};
function markAnswer(x) {
  const body = $("modalBody");
  if (x.type !== "possessive") {
    const td = body.querySelector(`[data-focus="${x.skill.split(" → ")[0]}"]`);
    if (td) litSpan(td);
    return;
  }
  const owner = x.skill.split(" · ")[1].split(" → ")[0];
  const nom = body.querySelector(`td.nom[data-focus="Personal · Nominativ · ${owner}"]`);
  const stem = nom && nom.closest("tr").querySelector("[data-owner]");
  if (stem) litSpan(stem);
  const ending = body.querySelector(`[data-ending="${possessiveCase(x)}|${x.gender || ""}"]`);
  if (ending) {
    litSpan(ending);
    body.querySelector(".tbl-more").open = true;
  }
}

function wireEndingsFold() {
  const more = document.querySelector("#modalBody .tbl-more");
  if (more)
    more.addEventListener("toggle", () => {
      if (!more.open) return;
      const body = $("modalBody");
      // bring the opened endings table into view so the change is always visible
      requestAnimationFrame(() => {
        const top = body.scrollTop + more.getBoundingClientRect().top - body.getBoundingClientRect().top - 6;
        body.scrollTo({ top: Math.min(top, body.scrollHeight - body.clientHeight), behavior: "smooth" });
      });
    });
}

document.querySelectorAll("[data-table]").forEach(
  b =>
    (b.onclick = () => {
      const round = b.dataset.table === "round";
      if (round && ($("game").classList.contains("hidden") || !feedbackOpen())) return; // off until Prüfen
      $("modalTitle").textContent = "Pronomen";
      $("modalBody").innerHTML = reference;
      if (round) markAnswer(deck[i]);
      else markWeakTable();
      wireEndingsFold();
      $("modalBody").scrollTop = 0;
      DeutschWindow.open($("modal")); // × / tap outside / Esc: components/deutsch-window-v1.js
    })
);

loadKeyboardComponent().catch(e => console.error(e));
