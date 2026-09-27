/* Pronomen — script. Markup: index.html · styles: pronomen.css
   Needs (loaded before this file): components/deutsch-day-v1.js, deutsch-translation-v1.js,
   sentences.js (window.PRONOUN_EXERCISES), deutsch-progress-v1.js (optional).
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
const data = window.PRONOUN_EXERCISES || [];

function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}
document.documentElement.classList.toggle("is-touch", isTouchDevice());

/* ===== SESSION STATS (last 5 rounds) =====
   Decide which sentences come up more often, the „Noch üben“ list and the marks in the table.
   Keys: "personal · <skill>", and for possessives "root · Possessiv · <owner> →" (right stem)
   plus "detail · <skill> · <gender>" (whole form; only judged when the stem was right). */
const STATS_STORE = "pronomenStatsV2";
const SESSION_WINDOW = 5;
const MIN_ATTEMPTS = 2;
const ERROR_THRESHOLD = 0.4;
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
function statKey(x) {
  if (x.type === "possessive") {
    const gender = x.gender ? ` · ${x.gender}` : "";
    return { root: `root · ${x.skill.split(" → ")[0]} →`, detail: `detail · ${x.skill}${gender}`, type: "possessive" };
  }
  return { root: `personal · ${x.skill}`, detail: `personal · ${x.skill}`, type: "personal" };
}
// Newer rounds weigh more (round 1 of 5 × 1 … round 5 × 5).
function currentStats() {
  const map = {};
  for (let s = 0; s < statsStore.sessions.length; s++) {
    const session = statsStore.sessions[s];
    const weight = s + 1;
    for (const [key, v] of Object.entries(session.answers || {})) {
      if (!map[key]) map[key] = { correct: 0, wrong: 0, weightedCorrect: 0, weightedWrong: 0, attempts: 0 };
      map[key].correct += v.correct || 0;
      map[key].wrong += v.wrong || 0;
      map[key].weightedCorrect += (v.correct || 0) * weight;
      map[key].weightedWrong += (v.wrong || 0) * weight;
      map[key].attempts += (v.correct || 0) + (v.wrong || 0);
    }
  }
  for (const v of Object.values(map)) {
    const total = v.weightedCorrect + v.weightedWrong;
    v.errorRate = total ? v.weightedWrong / total : 0;
    v.weak = v.attempts >= MIN_ATTEMPTS && v.errorRate >= ERROR_THRESHOLD;
  }
  return map;
}
// Readable name for the „Noch üben“ list — the same wording as the grey line under an answer,
// e.g. "Personal · Dativ · ich → mir", "Possessiv · wir → unser", "Possessiv · ich → mein · Dativ · Maskulin".
function weakLabel(key) {
  if (key.startsWith("root · ")) {
    const owner = key.slice(7); // "Possessiv · wir →"
    const x = data.find(x => x.skill.startsWith(owner + " "));
    return x ? x.skill.split(" · ").slice(0, 2).join(" · ") : owner.replace(/ →$/, "");
  }
  return key.replace(/^(personal|detail) · /, "");
}

/* ===== DAILY STATS (Home: today's answers) ===== */
const DAILY_STATS_KEY = "deutschDailyStatsV1";
function recordDailyAnswer() {
  let stats = {};
  try {
    stats = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
  } catch (e) {
    stats = {};
  }
  const today = DeutschDay.key();
  if (stats.date !== today) stats = { date: today };
  stats.pronomen = Number(stats.pronomen || 0) + 1;
  try {
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

/* ===== PROGRESS (Documentation/PROGRESS_TRACKER.md) =====
   41 categories: 18 personal (person × case), 8 possessive owners (ich → mein …),
   15 possessive endings (case × gender, e.g. "Dativ · Maskulin → -em").
   A possessive sentence counts for its owner AND its ending — same logic as the session stats:
   owner = right stem; ending = only judged when the stem was right.
   Weight = sentences covered (a possessive sentence gives ½ to its owner, ½ to its ending),
   so the bar = share of the 103 sentences' grammar I reliably know. */
const PROGRESS_ID = "pronomen";
const hasProgress = () => typeof window.DeutschProgress === "object";
// "euer" drops its second e before endings: eure, eurem, euren.
function ownerStem(x) {
  return (x.skill.split(" → ")[1]?.split(" · ")[0] || "").toLocaleLowerCase("de-DE");
}
function stemMatches(input, stem) {
  return !!stem && (input.startsWith(stem) || (stem === "euer" && input.startsWith("eur")));
}
function possessiveCase(x) {
  return x.skill.split(" · ").pop();
}
function endingOf(x) {
  const a = x.answer.trim().toLocaleLowerCase("de-DE"),
    st = ownerStem(x),
    base = a.startsWith(st) ? st : st === "euer" ? "eur" : st;
  return a.slice(base.length);
}
function progressKeys(x) {
  if (x.type !== "possessive") return { personal: "personal:" + x.skill };
  return {
    owner: "owner:" + x.skill.split(" → ")[0].replace("Possessiv · ", "") + " → " + ownerStem(x),
    ending: "ending:" + possessiveCase(x) + "|" + (x.gender || "")
  };
}
if (hasProgress()) {
  const items = new Map(),
    add = (key, label, w) => {
      const it = items.get(key);
      if (it) it.weight += w;
      else items.set(key, { key, label, weight: w });
    };
  data.forEach(x => {
    const k = progressKeys(x);
    if (k.personal) {
      add(k.personal, x.skill.replace("Personal · ", "").replace(/^(\w+) · (.*)$/, "$2 ($1)"), 1);
      return;
    }
    add(k.owner, k.owner.slice(6), 0.5);
    const e = endingOf(x);
    add(k.ending, possessiveCase(x) + " · " + (x.gender || "") + " → " + (e ? "-" + e : "ohne Endung"), 0.5);
  });
  DeutschProgress.init(PROGRESS_ID, [...items.values()]);
}

/* ===== DECK =====
   Half personal, half possessive; inside each type, sentences with recent mistakes come up more often. */
let deck = [],
  i = 0,
  n = 10,
  answer = "",
  correct = 0,
  sessionAnswers = {};
const norm = s =>
  s
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:]/g, "");

function weightedPick(items, count) {
  const current = currentStats();
  return items
    .map(x => {
      const keys = statKey(x);
      const weakScore = current[keys.detail]?.errorRate || 0;
      return { x, k: -Math.log(Math.max(Math.random(), 1e-9)) / (1 + weakScore * 4) };
    })
    .sort((a, b) => a.k - b.k)
    .slice(0, Math.min(count, items.length))
    .map(o => o.x);
}
function weightedDeck(count) {
  const personal = data.filter(x => x.type === "personal");
  const possessive = data.filter(x => x.type === "possessive");
  const total = Math.min(count, data.length);
  let personalCount = Math.floor(total / 2);
  let possessiveCount = total - personalCount;
  // If one type cannot supply its half, give the remaining slots to the other type.
  if (personalCount > personal.length) {
    possessiveCount += personalCount - personal.length;
    personalCount = personal.length;
  }
  if (possessiveCount > possessive.length) {
    personalCount += possessiveCount - possessive.length;
    possessiveCount = possessive.length;
  }
  const selected = [...weightedPick(personal, personalCount), ...weightedPick(possessive, possessiveCount)];
  // Shuffle so the two types are genuinely mixed.
  return selected.sort(() => Math.random() - 0.5);
}

/* ===== QUESTION ===== */
function start(count) {
  n = count;
  deck = weightedDeck(count);
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
  return !$("modal").classList.contains("hidden");
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
    ok = norm(answer) === norm(x.answer);
  recordDailyAnswer();
  const keys = statKey(x);
  const count = (key, right) => {
    const v = sessionAnswers[key] || { correct: 0, wrong: 0 };
    if (right) v.correct++;
    else v.wrong++;
    sessionAnswers[key] = v;
  };
  if (x.type === "possessive") {
    // Stem and ending are scored separately. If the stem itself is wrong, the ending is not judged,
    // so one mistake cannot weaken both. euer → eure/eurem/euren counts as the right stem.
    const stemOK = stemMatches(norm(answer), ownerStem(x));
    count(keys.root, stemOK);
    if (stemOK) count(keys.detail, ok);
  } else {
    count(keys.detail, ok);
  }
  if (hasProgress()) {
    const pk = progressKeys(x);
    if (pk.personal) DeutschProgress.record(PROGRESS_ID, pk.personal, ok);
    else {
      const stemOK = stemMatches(norm(answer), ownerStem(x));
      DeutschProgress.record(PROGRESS_ID, pk.owner, stemOK);
      if (stemOK) DeutschProgress.record(PROGRESS_ID, pk.ending, ok);
    }
  }
  if (ok) correct++;
  $("feedback").className = "feedback " + (ok ? "correct" : "wrong");
  $("given").replaceChildren(coloured(answer, ok ? "good" : "bad"));
  $("correctText").replaceChildren(...(ok ? [] : [coloured("→ " + x.answer, "good")]));
  $("skill").textContent = x.skill + (x.type === "possessive" && x.gender ? " · " + x.gender : "");
  $("answerbox").style.display = "none";
  $("check").style.display = "none";
  if (window.deutschKeyboardReady) $("keyboard").classList.remove("show");
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
    statsStore.sessions.push({ date: DeutschDay.key(), answers: sessionAnswers });
    if (statsStore.sessions.length > SESSION_WINDOW) statsStore.sessions = statsStore.sessions.slice(-SESSION_WINDOW);
    saveStats();
  }
  $("game").classList.add("hidden");
  $("done").classList.remove("hidden");
  $("score").textContent = `${correct} / ${deck.length}`;
  const weak = Object.entries(currentStats())
    .filter(([, v]) => v.weak)
    .sort((a, b) => b[1].errorRate - a[1].errorRate)
    .slice(0, 3);
  const box = $("weak");
  if (weak.length) {
    const title = document.createElement("b");
    title.textContent = "Noch üben";
    box.replaceChildren(title, ...weak.flatMap(([k]) => [document.createElement("br"), weakLabel(k)]));
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
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
  if (e.key === "Escape" && tableOpen()) {
    closeModal();
    return;
  }
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
function fitPrompt() {
  const prompt = document.querySelector("#game .prompt"),
    kb = $("keyboard"),
    app = document.querySelector(".app");
  prompt.style.zoom = "";
  if (!kb || !kb.classList.contains("is-touch") || !kb.classList.contains("show") || SHORT_SCREEN.matches) return;
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
  const r = await fetch("../components/deutsch-keyboard-v2.60.html");
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
  ["sie", "sie(pl.)", "sie", "ihnen", "ihr-", "sie(pl.)"],
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
  '<details class="tbl-more"><summary>Possessiv-Endungen</summary>' +
  '<table class="tbl"><tr><th>Kasus</th><th>Mask.</th><th>Neutr.</th><th>Fem.</th><th>Plural</th></tr>' +
  CASES.map(
    ([short, kasus]) =>
      `<tr><td>${short}</td>` +
      GENDERS.map((g, j) => `<td data-ending="${kasus}|${g}">${ENDINGS[kasus][j]}</td>`).join("") +
      "</tr>"
  ).join("") +
  "</table></details>";

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
      $("modalTitle").textContent = "Pronomen";
      $("modalBody").innerHTML = reference;
      markWeakTable();
      $("modal").classList.remove("hidden");
      requestAnimationFrame(() => requestAnimationFrame(() => $("modal").classList.add("open")));
    })
);
function closeModal() {
  const m = $("modal");
  m.classList.remove("open");
  setTimeout(() => m.classList.add("hidden"), 220);
}
$("close").onclick = closeModal;
$("modal").onclick = e => {
  if (e.target === $("modal")) closeModal();
};

loadKeyboardComponent().catch(e => console.error(e));
