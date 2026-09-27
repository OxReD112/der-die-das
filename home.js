/* Deutsch. · Home script
   Loaded at the end of <body> (all markup already exists), before progress-screen.js.
   The tiny theme script stays inline in <head> of index.html: it must set data-theme
   before the first paint, otherwise the page flashes in the wrong theme. */

/* Phrase of the Week — data lives in phrases.js.
       The details are a separate full-screen Home panel. */
(function initPhraseOfTheWeek() {
  const phraseHomeTitle = document.getElementById("phraseWeekHomeTitle");
  const phraseHomeLiteral = document.getElementById("phraseWeekHomeLiteral");
  const phraseTitle = document.getElementById("phraseWeekTitle");
  const phraseLiteral = document.getElementById("phraseWeekLiteral");
  const phraseMeaning = document.getElementById("phraseWeekMeaning");
  const phraseExample = document.getElementById("phraseWeekExample");
  const phraseToggle = document.getElementById("phraseWeekToggle");
  const phraseBack = document.getElementById("phraseScreenBack");
  const homeTrack = document.getElementById("homeTrack");
  const phraseScreen = document.getElementById("phraseScreen");
  if (
    !phraseHomeTitle ||
    !phraseHomeLiteral ||
    !phraseTitle ||
    !phraseLiteral ||
    !phraseMeaning ||
    !phraseExample ||
    !phraseToggle ||
    !phraseBack ||
    !homeTrack ||
    !phraseScreen
  )
    return;

  function showPhrase() {
    homeTrack.style.transform = "translateX(-50%)";
    phraseScreen.setAttribute("aria-hidden", "false");
  }

  function showHome() {
    homeTrack.style.transform = "translateX(0)";
    phraseScreen.setAttribute("aria-hidden", "true");
  }

  phraseToggle.addEventListener("click", showPhrase);
  phraseBack.addEventListener("click", showHome);

  function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function getISOWeekKey(date) {
    const monday = getMonday(date);
    return monday.getTime();
  }

  function render() {
    if (!Array.isArray(window.PHRASES) || window.PHRASES.length === 0) return;

    const startMonday = new Date(2026, 0, 5);
    const currentWeek = getISOWeekKey(new Date());
    const firstWeek = getISOWeekKey(startMonday);
    const weeks = Math.max(0, Math.floor((currentWeek - firstWeek) / 604800000));
    const index = weeks % window.PHRASES.length;
    const phrase = window.PHRASES[index];

    // The same weekly phrase object feeds both the compact Home preview
    // and the full-screen details. There is only one source of truth.
    phraseHomeTitle.textContent = phrase.title;
    phraseHomeLiteral.textContent = getTranslation(phrase, "literal");

    phraseTitle.textContent = phrase.title;
    phraseLiteral.textContent = getTranslation(phrase, "literal");
    phraseMeaning.textContent = "→ " + getTranslation(phrase, "meaning");
    phraseExample.textContent = phrase.example;
  }

  if (Array.isArray(window.PHRASES)) render();
  else window.addEventListener("phrasesready", render, { once: true });
  // Settings → Your language ENG/RUS: update the phrase right away.
  document.addEventListener("deutsch:translationlang", render);
})();

const DAILY_STATS_KEY = "deutschDailyStatsV1";

const DAILY_LIMIT_OFF_DATE_KEY = "deutschDailyLimitOffDateV1";

/* Personal greeting v1 — see Documentation/PERSONAL_GREETINGS.md */
const PROFILE_KEY = "deutschProfileV1";
const GREETING_MAX_WIDTH = 240;

function getUserName() {
  try {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    return typeof profile.name === "string" ? profile.name.trim().slice(0, 20) : "";
  } catch (e) {
    return "";
  }
}

function setUserName(name) {
  const clean = String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  try {
    if (clean) localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: clean }));
    else localStorage.removeItem(PROFILE_KEY);
  } catch (e) {}
}

function greetingState(points, vocabDone, hour) {
  if (hour >= 23 || hour < 5) return "lateNight";
  if (points >= 120) return "bonus";
  if (points >= 100) return "goal";
  if (vocabDone) return "vocabDone";
  if (points >= 50) return "halfway";
  if (points >= 1) return "started";
  if (hour < 11) return "morning";
  if (hour < 18) return "daytime";
  return "evening";
}

/* Same state on the same day always gives the same phrase. */
function dailyIndex(seed, length) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % length;
}

const greetingCanvas = document.createElement("canvas").getContext("2d");
function lineFits(text, element) {
  if (!element || !greetingCanvas) return true;
  const cs = getComputedStyle(element);
  greetingCanvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const box = document.getElementById("greeting");
  const max = Math.min(GREETING_MAX_WIDTH, box && box.clientWidth ? box.clientWidth : GREETING_MAX_WIDTH);
  return greetingCanvas.measureText(text).width <= max;
}

let greetingKey = null;
function renderGreeting(points, vocabDone) {
  const data = window.GREETINGS;
  const box = document.getElementById("greeting");
  const line = document.getElementById("greetingLine");
  const sub = document.getElementById("greetingSub");
  const name = getUserName();

  if (!data || !box || !line || !sub) return;
  const state = greetingState(points, vocabDone, new Date().getHours());
  const list = data[state];
  if (!Array.isArray(list) || list.length === 0) return;
  const index = dailyIndex(`${DeutschDay.key()}|${state}`, list.length);
  const entry = list[index];

  let lines = entry.lines;
  if (!lines) {
    lines = entry.noName;
    if (name) {
      const named = entry.name.map(l => l.replace("{name}", name));
      if (named.every((l, i) => lineFits(l, i === 0 ? line : sub))) lines = named;
    }
  }

  const key = `${state}|${index}|${lines.join("|")}`;
  if (key === greetingKey) return;
  const first = greetingKey === null;
  greetingKey = key;

  const apply = () => {
    line.textContent = lines[0] || "";
    sub.textContent = lines[1] || "";
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (first || reduce) {
    apply();
    return;
  }
  box.classList.add("is-fading");
  setTimeout(() => {
    apply();
    box.classList.remove("is-fading");
  }, 250);
}

function resetDailyLimitForNewDay() {
  const today = DeutschDay.key();
  const offDate = localStorage.getItem(DAILY_LIMIT_OFF_DATE_KEY);

  if (localStorage.getItem("deutschDailyLimitEnabledV1") === "0" && offDate && offDate !== today) {
    localStorage.setItem("deutschDailyLimitEnabledV1", "1");
    localStorage.removeItem(DAILY_LIMIT_OFF_DATE_KEY);
  }
}
function renderDailyStats() {
  resetDailyLimitForNewDay();
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
  } catch (e) {}
  if (data.date !== DeutschDay.key()) data = {};

  function answerCount(value) {
    if (value && typeof value === "object") return Math.max(0, Number(value.answers) || 0);
    return Math.max(0, Number(value) || 0);
  }

  const configs = [
    { key: "artikel", selector: ".tile-articles", status: "artikelStatus", goal: 10 },
    { key: "verbformen", selector: ".tile-verbs", status: null, goal: 10 },
    { key: "pronomen", selector: ".tile-pronouns", status: null, goal: 10 },
    { key: "praepositionen", selector: ".tile-prepositions", status: null, goal: 10 }
  ];

  let exercisePoints = 0;

  configs.forEach(cfg => {
    let answers = answerCount(data[cfg.key]);

    if (cfg.key === "verbformen") {
      const partizipII = Number(data.verbformen?.partizipII) || 0;
      const modalverben = Number(data.verbformen?.modalverben) || 0;
      answers = partizipII + modalverben;
    }

    if (cfg.key === "praepositionen") {
      // Sum of all Präpositionen exercises; add new ones here.
      answers =
        answerCount(data.festerKasus) +
        answerCount(data.verbenMitPraepositionen) +
        answerCount(data.ortspraepositionen);
    }

    exercisePoints += answers;

    const tile = document.querySelector(cfg.selector);
    const status = cfg.status ? document.getElementById(cfg.status) : tile?.querySelector(".status");

    const done = answers >= cfg.goal;

    if (status) {
      status.textContent = done ? "✓ fertig" : `${Math.min(answers, cfg.goal)} / ${cfg.goal}`;
    }
    if (tile) tile.classList.toggle("is-done", done);
  });

  let vocabPoints = 0;
  let vocabDone = false;
  try {
    const home = JSON.parse(localStorage.getItem("deutschHomeStatsV1") || "{}");
    const ws = home.wortschatz;
    vocabDone = !!(ws && ws.date === DeutschDay.key() && ws.done);
    if (vocabDone) vocabPoints = 60;
  } catch (e) {}

  const points = exercisePoints + vocabPoints;
  document.getElementById("todayTotal").textContent = String(points);
  document.getElementById("todayProgress").style.width = `${Math.min(points, 100)}%`;

  const hardStopOverlay = document.getElementById("hardStopOverlay");
  const dailyLimitEnabled = localStorage.getItem("deutschDailyLimitEnabledV1") !== "0";
  const hardStop = dailyLimitEnabled && vocabDone && points >= 150;
  if (hardStopOverlay) {
    hardStopOverlay.classList.toggle("is-active", hardStop);
    hardStopOverlay.setAttribute("aria-hidden", hardStop ? "false" : "true");
  }

  renderGreeting(points, vocabDone);
}

window.addEventListener("message", event => {
  const { type, exercise } = event.data || {};
  if (type !== "deutsch:exerciseAnswer") return;
  if (exercise !== "partizipII" && exercise !== "modalverben") return;

  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(DAILY_STATS_KEY) || "{}");
  } catch (e) {}
  if (data.date !== DeutschDay.key()) data = { date: DeutschDay.key() };
  data.verbformen ||= {};
  data.verbformen[exercise] = (Number(data.verbformen[exercise]) || 0) + 1;

  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(data));
  renderDailyStats();
});

const shell = document.getElementById("appShell");
const frame = document.getElementById("appFrame");
const back = document.getElementById("homeBack");

document.querySelectorAll("[data-app]").forEach(button => {
  button.addEventListener("click", () => openApp(button));
});

/* Paged tile block: page dots + arrow buttons (arrows on hover devices only). */
(() => {
  const pager = document.getElementById("tilePages");
  const prev = document.getElementById("pagePrev");
  const next = document.getElementById("pageNext");
  const dotsBox = document.getElementById("pageDots");
  if (!pager || !prev || !next || !dotsBox) return;
  const pages = [...pager.querySelectorAll(".tile-page")];

  const dots = pages.map((_, n) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "page-dot";
    dot.setAttribute("aria-label", "Seite " + (n + 1));
    dot.addEventListener("click", () => goTo(n));
    dotsBox.appendChild(dot);
    return dot;
  });
  dotsBox.hidden = pages.length < 2;

  function pageStep() {
    // distance from one page to the next (the strip has extra side room for the tile shadows)
    return pages.length > 1 ? pages[1].offsetLeft - pages[0].offsetLeft : pager.clientWidth;
  }
  function current() {
    return Math.round(pager.scrollLeft / pageStep());
  }
  function goTo(n) {
    n = Math.max(0, Math.min(pages.length - 1, n));
    pager.scrollTo({ left: n * pageStep(), behavior: "smooth" });
  }
  function update() {
    const n = current();
    dots.forEach((d, i) => d.classList.toggle("is-active", i === n));
    prev.classList.toggle("is-available", n > 0);
    next.classList.toggle("is-available", n < pages.length - 1);
  }

  prev.addEventListener("click", () => goTo(current() - 1));
  next.addEventListener("click", () => goTo(current() + 1));
  pager.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* ===== Open / close an exercise (Home 5.84) =====
   Phones: the exercise grows out of the tile that was tapped and, on the way back, folds into it again
   (Documentation/DECISIONS.md → *Home button + open / close animation*). It starts growing only once the page
   has loaded (at most 450ms), so it never grows as an empty box. On the way back the real tile is already
   under the shrinking exercise, which fades out over the second half — so it lands on the finished tile.
   Tablets, computers and Reduce Motion: no animation (the exercise simply appears / disappears, as before).
   Exercises call closeApp() for their own "Zur Startseite", so every way back goes through here. */
const ANIM_OPEN = 480;
const ANIM_CLOSE = 420;
const ANIM_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
// Home behind the exercise zooms back a little and dims. Only the tile area is scaled: scaling the whole page would
// pull the fixed "Deutsch." header out of place (a fixed element inside a transformed parent moves with it).
const pageEl = document.querySelector(".home-viewport");
const dimEls = [document.querySelector(".page > header"), document.getElementById("settingsOpen")].filter(Boolean);
let originTile = null, // the Home tile the exercise came from (for a chapter exercise: the chapter tile)
  animBusy = false;

function useAnimation() {
  return (
    window.matchMedia("(max-width: 600px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function tileInset(tile) {
  const r = tile.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > innerHeight) return null; // tile not on screen → no animation
  const radius = parseFloat(getComputedStyle(tile).borderTopLeftRadius) || 25;
  return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${radius}px)`;
}
function tileCentre(tile, box) {
  // the tile's centre, relative to `box` (default: the screen)
  const r = tile.getBoundingClientRect(),
    b = box ? box.getBoundingClientRect() : { left: 0, top: 0 };
  return `${r.left + r.width / 2 - b.left}px ${r.top + r.height / 2 - b.top}px`;
}
function homeBehind(on, d) {
  // d = transition time in ms (0 = at once)
  const t = d ? `transform ${d}ms ${ANIM_EASE}, filter ${d}ms ${ANIM_EASE}` : "none";
  pageEl.style.transition = t;
  pageEl.style.transform = on ? "scale(0.94)" : "none";
  [pageEl, ...dimEls].forEach(el => {
    el.style.transition = t;
    el.style.filter = on ? "brightness(0.7)" : "none";
  });
}
function setClip(v) {
  shell.style.clipPath = v;
  shell.style.webkitClipPath = v;
}
function resetAnimStyles() {
  [shell, frame, pageEl, ...dimEls].forEach(el => {
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.style.opacity = "";
    el.style.filter = "";
  });
  setClip("");
  shell.style.backgroundColor = "";
  shell.classList.remove("is-animating");
}

function openApp(tile) {
  if (animBusy) return;
  originTile = tile;
  const showShell = () => {
    shell.classList.add("open");
    shell.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("app-open");
  };
  if (!useAnimation()) {
    frame.src = tile.dataset.app;
    showShell();
    return;
  }
  animBusy = true;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    frame.removeEventListener("load", start);
    showShell();
    const from = tileInset(tile);
    if (!from) {
      animBusy = false;
      return;
    }
    // start: exactly over the tile, see-through, exercise slightly small
    resetAnimStyles();
    shell.classList.add("is-animating");
    shell.style.transition = frame.style.transition = "none";
    setClip(from);
    shell.style.backgroundColor = "transparent";
    frame.style.opacity = "0";
    frame.style.transformOrigin = tileCentre(tile);
    frame.style.transform = "scale(0.86)";
    void shell.offsetWidth;
    requestAnimationFrame(() => {
      const d = ANIM_OPEN;
      shell.style.transition = `clip-path ${d}ms ${ANIM_EASE}, -webkit-clip-path ${d}ms ${ANIM_EASE}, background-color ${Math.round(d * 0.3)}ms ease`;
      frame.style.transition = `opacity ${Math.round(d * 0.35)}ms ease, transform ${d}ms ${ANIM_EASE}`;
      setClip(`inset(0px 0px 0px 0px round 0px)`);
      shell.style.backgroundColor = "";
      frame.style.opacity = "1";
      frame.style.transform = "none";
      pageEl.style.transformOrigin = tileCentre(tile, pageEl);
      homeBehind(true, d);
      setTimeout(() => {
        resetAnimStyles();
        animBusy = false;
        scheduleBack();
      }, d + 40);
    });
  };
  frame.addEventListener("load", start);
  frame.src = tile.dataset.app;
  setTimeout(start, 450); // slow network: grow anyway
}

function closeApp() {
  if (animBusy) return;
  renderDailyStats();
  const finish = () => {
    resetAnimStyles();
    shell.classList.remove("open");
    shell.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("app-open");
    setFrameWindow(false);
    frame.src = "about:blank";
    originTile = null;
    animBusy = false;
  };
  const to = originTile && useAnimation() && shell.classList.contains("open") ? tileInset(originTile) : null;
  if (!to) {
    finish();
    return;
  }
  animBusy = true;
  const tile = originTile;
  const d = ANIM_CLOSE;
  setFrameWindow(false);
  resetAnimStyles();
  shell.classList.add("is-animating");
  shell.style.transition = frame.style.transition = "none";
  setClip(`inset(0px 0px 0px 0px round 0px)`);
  frame.style.transformOrigin = tileCentre(tile);
  pageEl.style.transformOrigin = tileCentre(tile, pageEl);
  homeBehind(true, 0);
  void shell.offsetWidth;
  requestAnimationFrame(() => {
    const fade = `${Math.round(d * 0.55)}ms ease ${Math.round(d * 0.35)}ms`;
    shell.style.transition = `clip-path ${d}ms ${ANIM_EASE}, -webkit-clip-path ${d}ms ${ANIM_EASE}, background-color ${fade}`;
    frame.style.transition = `opacity ${fade}, transform ${d}ms ${ANIM_EASE}`;
    setClip(to);
    shell.style.backgroundColor = "transparent";
    frame.style.opacity = "0";
    frame.style.transform = "scale(0.86)";
    homeBehind(false, d);
    setTimeout(finish, d + 40);
  });
}

/* iPhone Safari shows :active (the shared press effect) only on pages that listen for touches.
       An empty, passive listener switches it on — for Home and (above, on load) for every exercise page.
       It never blocks scrolling, swiping or the keyboard. Home 5.44. */
function noTouch() {}
document.addEventListener("touchstart", noTouch, { passive: true });

/* ===== Home button (Home 5.84, replaces the "‹" of Home 5.43) =====
       One round house button; it always goes straight to Home (closeApp), from every screen of every exercise.
       Where it sits (Home reads the open exercise page directly — same site — so the exercises need no changes):
       - start screens: centred, 28px above the „Worum geht's?“ description;
       - chapter pages: centred, 28px above the version number;
       - summary screens: centred in the free space under the last button, slightly above its middle (45 / 55,
         like the phrase screen). „Zur Startseite“ is hidden there (Home adds a style to the page) — the round
         button replaces it;
       - during a round: bottom-left corner, 12px from the edges (like the old ⌂). If it would touch anything
         there (on-screen keyboard, answer buttons — 4-inch iPhones, phone sideways), it moves into the top bar,
         small, in front of the title, and stays there for this page and screen size.
       - If a centred spot doesn't fit (short screens), the same small button sits top left.
       Fades out while a table window is open. */
const TITLE_SEL = ".top-title,.top .brand";
const WINDOW_SEL = ".modal,.pattern-modal,.forms-modal,.omodal,.coll-modal"; // .coll-modal = Wortschatz collection window (Home 5.49)
const CHAPTER_PATHS = ["verbformen/", "praepositionen/"];
// things the corner button must not cover: controls, the on-screen keyboard and the question / answer text
const HIT_SEL =
  "button,input,textarea,a,.keyboard,.key,.card,.result,p,h1,h2,h3,[class*='step'],[class*='row'],[class*='line']";
// the exercises' short-screen rule (phone sideways, 4-inch iPhones): no corner button there — the top bar instead
const SHORT_SCREEN = "(max-height: 559px), (max-width: 340px) and (max-height: 609px)";
let backObserver = null,
  backRaf = 0,
  topBarMode = false, // sticky "top bar" fallback during a round
  topBarKey = "";

function framePath() {
  try {
    const base = new URL("./", location.href).pathname.toLowerCase();
    let path = decodeURIComponent(frame.contentWindow.location.pathname).toLowerCase();
    if (path.startsWith(base)) path = path.slice(base.length);
    return path.replace(/index\.html$/, "");
  } catch (e) {
    return "";
  }
}
// windows fade: judge them by display/visibility (switched at once when opening), not by the fading opacity
function isShown(el, win, ignoreOpacity) {
  const cs = win.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || (!ignoreOpacity && parseFloat(cs.opacity) < 0.05))
    return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function firstShown(doc, win, sel) {
  return [...doc.querySelectorAll(sel)].find(el => isShown(el, win)) || null;
}
function overlaps(a, b, pad) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
}
// lowest bottom edge of the visible page content above `limit` (the description / version number / screen edge)
function contentBottom(doc, win, limit) {
  let low = 0;
  doc.querySelectorAll("h1,h2,h3,p,button,input,.choices,.coll-line,.collCount,.doneScore,.final-score").forEach(el => {
    if (el.closest(".start-about,.version-mark," + WINDOW_SEL) || !isShown(el, win)) return;
    const r = el.getBoundingClientRect();
    if (r.bottom <= limit + 1 && r.bottom > low) low = r.bottom;
  });
  return low;
}
function placeBack(mode, x, y) {
  // mode: "center" (44px, x = centre, y = top) · "corner" (CSS places it) · "bar" / "topleft" (32px, x/y = top-left)
  back.classList.toggle("is-small", mode === "bar" || mode === "topleft");
  back.classList.toggle("is-corner", mode === "corner");
  if (mode === "corner") {
    back.style.top = back.style.left = "";
    return;
  }
  const w = mode === "center" ? 44 : 32;
  back.style.left = Math.round(mode === "center" ? x - w / 2 : x) + "px";
  back.style.top = Math.round(y) + "px";
}
// the status-bar height as Home sees it (exercise pages inside the frame aren't reliably told)
const safeProbe = document.createElement("div");
safeProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top)";
document.body.appendChild(safeProbe);
function safeTop() {
  return parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
}
function setTitleRoom(doc, on) {
  if (!doc || !doc.documentElement) return;
  doc.documentElement.classList.toggle("deutsch-home-in-bar", on);
}

function updateBack() {
  backRaf = 0;
  if (!shell.classList.contains("open")) {
    setFrameWindow(false);
    return;
  }
  let doc, win;
  try {
    doc = frame.contentDocument;
    win = frame.contentWindow;
  } catch (e) {}
  if (!doc || !doc.body || !win) {
    placeBack("corner");
    return;
  }
  if (!doc.getElementById("deutsch-home-button")) {
    const st = doc.createElement("style");
    st.id = "deutsch-home-button";
    st.textContent =
      "#homeBack{display:none!important}" + // „Zur Startseite“: the round button replaces it
      ".deutsch-home-in-bar .top-title,.deutsch-home-in-bar .top .brand{padding-left:42px}"; // room for the small button in the top bar
    doc.head.appendChild(st);
  }
  const H = win.innerHeight,
    W = win.innerWidth;
  const windowOpen = [...doc.querySelectorAll(WINDOW_SEL)].some(el => isShown(el, win, true));
  back.classList.toggle("is-hidden", windowOpen);
  setFrameWindow(windowOpen);
  if (windowOpen) return;

  const path = framePath();
  const about = firstShown(doc, win, ".start-about");
  const version = firstShown(doc, win, ".version-mark");
  const summary = firstShown(doc, win, "#playAgain,#done .finish-actions,#done .doneWords");
  const chapter = CHAPTER_PATHS.includes(path);
  const title = [...doc.querySelectorAll(TITLE_SEL)].find(el => isShown(el, win) && el.getBoundingClientRect().top < 80);

  // --- start, chapter and summary screens: centred ---
  if (about || summary || chapter) {
    setTitleRoom(doc, false);
    const bottomEdge = H - 24;
    let lower, y;
    if (summary) {
      lower = version ? version.getBoundingClientRect().top : bottomEdge;
      const upper = contentBottom(doc, win, lower);
      y = upper + (lower - upper) * 0.45 - 22;
      if (lower - upper < 44 + 40) y = -1; // no room
    } else {
      lower = about ? about.getBoundingClientRect().top : version ? version.getBoundingClientRect().top : bottomEdge;
      const upper = contentBottom(doc, win, lower);
      y = lower - 28 - 44;
      if (y < upper + 20) y = lower - upper >= 44 + 28 ? upper + (lower - upper) / 2 - 22 : -1; // tight: centre in the gap, or no room
    }
    if (y >= 0) placeBack("center", W / 2, y);
    else placeBack("topleft", Math.max(12, (W - 480) / 2 + 12), safeTop() + 12);
    return;
  }

  // --- during a round: bottom-left corner, or the top bar if the corner is taken ---
  const key = path + "|" + W + "x" + H;
  if (key !== topBarKey) {
    topBarKey = key;
    topBarMode = false;
  }
  if (!topBarMode && title && win.matchMedia(SHORT_SCREEN).matches) topBarMode = true;
  if (!topBarMode) {
    placeBack("corner");
    const me = back.getBoundingClientRect();
    const hit = [...doc.querySelectorAll(HIT_SEL)].some(
      el => !el.closest(WINDOW_SEL) && isShown(el, win) && overlaps(me, el.getBoundingClientRect(), 6)
    );
    if (hit && title) topBarMode = true;
  }
  if (topBarMode && title) {
    setTitleRoom(doc, true);
    const r = title.getBoundingClientRect();
    placeBack("bar", r.left, r.top + r.height / 2 - 16);
  } else {
    setTitleRoom(doc, false);
    placeBack("corner");
  }
}
// Home 5.69: darken the strip below the exercise frame (and the status-bar colour) while an exercise window is open
function setFrameWindow(on) {
  const root = document.documentElement;
  if (root.classList.contains("frame-window") === on) return;
  root.classList.toggle("frame-window", on);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  if (on) {
    meta.dataset.plain = meta.getAttribute("content");
    meta.setAttribute("content", root.dataset.theme === "light" ? "#c5c3c1" : "#121213");
  } else if (meta.dataset.plain) {
    meta.setAttribute("content", meta.dataset.plain);
    delete meta.dataset.plain;
  }
}
let backLate = 0;
function scheduleBack() {
  if (!backRaf) backRaf = requestAnimationFrame(updateBack);
  clearTimeout(backLate);
  backLate = setTimeout(updateBack, 260); // again after a window's fade has finished
}
frame.addEventListener("load", () => {
  if (backObserver) backObserver.disconnect();
  back.classList.remove("is-hidden");
  try {
    backObserver = new MutationObserver(scheduleBack);
    backObserver.observe(frame.contentDocument.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-expanded"]
    });
    frame.contentWindow.addEventListener("resize", scheduleBack);
    frame.contentWindow.addEventListener("scroll", scheduleBack, { passive: true, capture: true }); // capture: also scrolling inside the exercise's panel (.app)
    frame.contentDocument.addEventListener("touchstart", noTouch, { passive: true }); // press effect on iPhone, see below
  } catch (e) {}
  scheduleBack();
  setTimeout(scheduleBack, 350); // after start-screen fade-ins
});
back.addEventListener("click", closeApp);

const HOME_STATS = "deutschHomeStatsV1";

function syncHomeDashboard() {
  /* Wortschatz publishes this object from its own page. */
  try {
    const home = JSON.parse(localStorage.getItem(HOME_STATS) || "{}");
    let ws = home.wortschatz;
    /* (Home 5.40) First visit of the day: Wortschatz hasn't published today's count yet.
       Count it here with the shared rule (components/deutsch-wortschatz-due-v1.js)
       and store it, so the tile and the daily points agree. Wortschatz overwrites
       it as soon as it opens. Only reads wortsternSRSv03, never changes it. */
    if (!(ws && ws.date === DeutschDay.key()) && window.DeutschWortschatzDue) {
      const fresh = DeutschWortschatzDue.status(DeutschWortschatzDue.readSaved());
      if (fresh && fresh.date === DeutschDay.key()) {
        ws = { ...fresh, updatedAt: Date.now() };
        home.wortschatz = ws;
        localStorage.setItem(HOME_STATS, JSON.stringify(home));
      }
    }
    const wsTile = document.querySelector(".tile-vocab");
    const wsStatus = document.getElementById("wortschatzStatus");
    const done = !!(ws && ws.date === DeutschDay.key() && ws.done);
    if (wsTile) wsTile.classList.toggle("is-done", done);
    if (wsStatus)
      wsStatus.textContent = done
        ? "✓ fertig"
        : ws && ws.date === DeutschDay.key() && Number.isFinite(Number(ws.remaining)) && Number(ws.remaining) > 0
          ? `${Number(ws.remaining)} ${Number(ws.remaining) === 1 ? "Wort" : "Wörter"} übrig`
          : "noch offen";
  } catch (e) {}

  /* renderDailyStats() is the sole authority on the compact cards' .is-done
     state and status text — it recomputes both right below, so nothing
     needs to pre-mark them here. */
  renderDailyStats();
  saveProgressSnapshot();
}

/* Progress snapshots (Documentation/PROGRESS_TRACKER.md, step 3).
   Once per day Home stores each exercise's progress summary, so the progress screen
   can compare today with 21 days ago and draw the 3-week lines.
   - Source: deutschProgressV1 (written by the exercises via components/deutsch-progress-v1.js).
   - Today's entry is overwritten whenever it changes → the last value of the day wins.
   - Days without practice are not stored; readers use the last earlier snapshot (nothing changed).
   - Rolling window: days older than 21 days are deleted, except the newest of them,
     so there is always a baseline to compare against after a long break.
   Format: {format:1, days:{"YYYY-MM-DD":{<exercise>:{t,s,i,is}}}}
           t/s = total/sicher (weighted, bar %), i/is = items/items sicher. */
const PROGRESS_KEY = "deutschProgressV1";
const SNAPSHOT_KEY = "deutschProgressSnapshotsV1";
const SNAPSHOT_WINDOW_DAYS = 21;
function saveProgressSnapshot() {
  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    const exercises = progress && progress.exercises;
    if (!exercises || typeof exercises !== "object") return;
    const entry = {};
    Object.keys(exercises)
      .sort()
      .forEach(id => {
        const sm = exercises[id] && exercises[id].summary;
        if (!sm || !(Number(sm.total) > 0)) return;
        if (sm.kind === "words") return; // Wortschatz: not in the history (2026-09-26) — its card counts live from the words
        entry[id] = {
          t: Number(sm.total),
          s: Number(sm.sicher) || 0,
          i: Number(sm.items) || 0,
          is: Number(sm.itemsSicher) || 0
        };
      });
    if (!Object.keys(entry).length) return;

    let store = null;
    try {
      store = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
    } catch (e) {}
    if (!store || typeof store !== "object" || !store.days || typeof store.days !== "object")
      store = { format: 1, days: {} };
    const today = DeutschDay.key();
    const before = JSON.stringify(store);
    store.days[today] = entry;

    const cutoff = DeutschDay.key(SNAPSHOT_WINDOW_DAYS);
    const old = Object.keys(store.days)
      .filter(d => d < cutoff)
      .sort();
    old.slice(0, -1).forEach(d => delete store.days[d]); // keep only the newest day older than the window

    const after = JSON.stringify(store);
    if (after !== before) localStorage.setItem(SNAPSHOT_KEY, after);
  } catch (e) {}
}

/* iframe/app navigation can update localStorage while Home stays mounted. */
window.addEventListener("pageshow", syncHomeDashboard);
window.addEventListener("storage", syncHomeDashboard);
window.addEventListener("focus", syncHomeDashboard);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncHomeDashboard();
});
setInterval(syncHomeDashboard, 1000);

syncHomeDashboard();

/* Deutsch Backup v1.
   The envelope is intentionally module-based so future exercises can add
   their own persistent state without changing the export workflow.
   - Keys that don't exist yet are skipped on save, so planned keys can be
     listed here before the feature that writes them exists.
   - Restore skips modules it doesn't understand (unknown or outdated
     storageVersion) instead of failing, so old backup files stay restorable.
   - Score format changes happen inside the stored data (a format marker),
     not by renaming keys — see Documentation/PROGRESS_TRACKER.md. */
const DEUTSCH_BACKUP_VERSION = 1;
/* When a backup was last made (or restored) on this device — ISO time, for the
   "Last backup …" note in Settings. Per device, so NOT part of the backup. */
const DEUTSCH_LAST_BACKUP_KEY = "deutschLastBackupV1";
const BACKUP_MODULES = {
  wortschatz: {
    label: "Wortschatz",
    storageKey: "wortsternSRSv03",
    storageVersion: "wortsternSRSv03"
  },
  /* Own word collection (wortschatz/collection.js, Documentation/WORTSCHATZ_COLLECTIONS.md).
     Only present while the user practises their own words. */
  wortschatzCollection: {
    label: "Wortschatz · eigene Wörter",
    storageKey: "deutschWortschatzCollectionV1",
    storageVersion: "deutschWortschatzCollectionV1"
  },
  /* Progress of the built-in set, set aside while an own collection is active. */
  wortschatzDemoProgress: {
    label: "Wortschatz · Standard-Set (beiseitegelegt)",
    storageKey: "deutschWortschatzDemoProgressV1",
    storageVersion: "deutschWortschatzDemoProgressV1"
  },
  profile: {
    label: "Name",
    storageKey: "deutschProfileV1",
    storageVersion: "deutschProfileV1"
  },
  artikel: {
    label: "Artikel",
    storageKey: "artikelGameDifficultyV1",
    storageVersion: "artikelGameDifficultyV1"
  },
  modalverben: {
    label: "Modalverben",
    storageKey: "modalverbenDifficultyV1",
    storageVersion: "modalverbenDifficultyV1"
  },
  partizipII: {
    label: "Partizip II",
    storageKey: "verbformenDifficultyV1",
    storageVersion: "verbformenDifficultyV1"
  },
  pronomen: {
    label: "Pronomen",
    storageKey: "pronomenStatsV2",
    storageVersion: "pronomenStatsV2"
  },
  festerKasus: {
    label: "Fester Kasus",
    storageKey: "festerKasusDifficultyV1",
    storageVersion: "festerKasusDifficultyV1"
  },
  verbenMitPraepositionen: {
    label: "Verben mit Präpositionen",
    storageKey: "verbenPraepStatsV1",
    storageVersion: "verbenPraepStatsV1"
  },
  ortspraepositionen: {
    label: "Ortspräpositionen",
    storageKey: "ortspraepositionenDifficultyV1",
    storageVersion: "ortspraepositionenDifficultyV1"
  },
  /* Setting, not progress: always included (current value, even if never
     changed), but a backup with only settings counts as "No progress found". */
  translations: {
    label: "Your language",
    storageKey: "deutschTranslationLangV1",
    storageVersion: "deutschTranslationLangV1",
    setting: true,
    current: () => (window.DeutschTranslation ? window.DeutschTranslation.getLang() : null)
  },
  /* Anonymous notification user ID (Documentation/NOTIFICATION_SYSTEM_MASTER.md, §15).
     Keeps the same notification identity after a Home Screen reinstall and
     links a second device (iPad) to the same user. The deviceId is NOT
     backed up: it must stay unique per device. Stored as a plain string. */
  notificationUser: {
    label: "Notifications",
    storageKey: "deutschNotificationUserIdV1",
    storageVersion: "deutschNotificationUserIdV1",
    setting: true,
    plain: true
  },
  /* Planned — Progress Tracker (not written by any module yet). */
  progress: {
    label: "Fortschritt",
    storageKey: "deutschProgressV1",
    storageVersion: "deutschProgressV1"
  },
  progressSnapshots: {
    label: "Fortschritt-Verlauf",
    storageKey: "deutschProgressSnapshotsV1",
    storageVersion: "deutschProgressSnapshotsV1"
  }
};

function buildDeutschBackup() {
  const modules = {};
  Object.entries(BACKUP_MODULES).forEach(([moduleName, config]) => {
    const raw = localStorage.getItem(config.storageKey);
    let state;
    if (config.current) {
      state = config.current();
      if (state === null || state === undefined) return;
    } else {
      if (raw === null) return;
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = raw;
      }
    }
    modules[moduleName] = {
      storageVersion: config.storageVersion,
      state
    };
  });
  return {
    app: "Deutsch",
    backupVersion: DEUTSCH_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    modules
  };
}

function saveDeutschBackup() {
  const note = document.getElementById("backupNote");
  try {
    const backup = buildDeutschBackup();
    if (!Object.keys(backup.modules).some(name => !BACKUP_MODULES[name]?.setting)) {
      if (note) note.textContent = "· No progress found";
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Deutsch Backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    try {
      localStorage.setItem(DEUTSCH_LAST_BACKUP_KEY, new Date().toISOString());
    } catch (e) {}
    if (note) {
      note.textContent = "· Backup created";
      note.classList.remove("is-warning");
    }
  } catch (e) {
    if (note) note.textContent = "· Backup failed";
  }
}

function validateDeutschBackup(backup) {
  if (!backup || backup.app !== "Deutsch") throw new Error("not-deutsch");
  if (backup.backupVersion !== DEUTSCH_BACKUP_VERSION) throw new Error("version");
  if (!backup.modules || typeof backup.modules !== "object") throw new Error("modules");

  const restorable = [];
  Object.entries(BACKUP_MODULES).forEach(([moduleName, config]) => {
    const moduleBackup = backup.modules[moduleName];
    if (!moduleBackup || typeof moduleBackup !== "object") return;
    /* Skip what this app version doesn't understand instead of failing the whole restore. */
    if (moduleBackup.storageVersion !== config.storageVersion) return;
    if (moduleBackup.state === undefined || moduleBackup.state === null) return;
    restorable.push([moduleName, config, moduleBackup.state]);
  });
  if (restorable.length === 0) throw new Error("nothing");
  return restorable;
}

async function restoreDeutschBackup(file) {
  const note = document.getElementById("restoreNote");
  try {
    const backup = JSON.parse(await file.text());
    const restorable = validateDeutschBackup(backup);
    const created = backup.createdAt ? new Date(backup.createdAt) : null;
    const dateLabel =
      created && !Number.isNaN(created.getTime())
        ? created.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "unknown date";
    const moduleLabel = restorable.map(([name, config]) => config.label || name).join(", ");
    if (
      !window.confirm(`Restore backup from ${dateLabel}?\n\n${moduleLabel} will replace the current saved progress.`)
    ) {
      if (note) note.textContent = "· Restore cancelled";
      return;
    }
    /* A restored file is a backup too: count its date as the last backup (if newer). */
    if (created && !Number.isNaN(created.getTime())) {
      const last = Date.parse(localStorage.getItem(DEUTSCH_LAST_BACKUP_KEY) || "");
      if (!last || created.getTime() > last) localStorage.setItem(DEUTSCH_LAST_BACKUP_KEY, created.toISOString());
    }
    const previousNotificationUser = localStorage.getItem("deutschNotificationUserIdV1");
    restorable.forEach(([, config, state]) => {
      localStorage.setItem(
        config.storageKey,
        config.plain && typeof state === "string" ? state : JSON.stringify(state)
      );
    });
    /* Wortschatz progress only makes sense together with the words it belongs to.
       A backup with Wortschatz progress but no own collection (e.g. made before own collections
       existed, or while using the built-in set) means: built-in set → drop an own collection on this
       device, so old progress and other words never get mixed. Same for the set-aside demo progress. */
    const restoredNames = new Set(restorable.map(([name]) => name));
    if (restoredNames.has("wortschatz")) {
      if (!restoredNames.has("wortschatzCollection")) localStorage.removeItem("deutschWortschatzCollectionV1");
      if (!restoredNames.has("wortschatzDemoProgress")) localStorage.removeItem("deutschWortschatzDemoProgressV1");
    }

    /* Refresh Home statistics from the restored Wortschatz state.
       Wortschatz is closed during Restore, so there is no iframe to reload. */
    const restoredWortschatz = restorable.find(([name]) => name === "wortschatz");
    if (restoredWortschatz) {
      const state = restoredWortschatz[2];
      const cards = state && state.cards && typeof state.cards === "object" ? state.cards : {};
      const activeIds = Array.isArray(state?.activeIds) ? state.activeIds : [];
      const today = DeutschDay.key();
      let remaining, total;
      if (window.DeutschWortschatzDue) {
        /* Same rule as Wortschatz and the Home tile (components/deutsch-wortschatz-due-v1.js). */
        ({ remaining, total } = DeutschWortschatzDue.count({ cards, activeIds }));
      } else {
        const now = Date.now();
        remaining = activeIds.filter(id => {
          const card = cards[id];
          if (!card) return false;
          if (!card.due) return true;
          const due = new Date(card.due).getTime();
          return Number.isNaN(due) || due <= now;
        }).length;
        total = activeIds.length;
      }
      const done = total > 0 && remaining === 0;
      try {
        localStorage.setItem(
          HOME_STATS,
          JSON.stringify({
            date: today,
            wortschatz: { date: today, remaining, done, total }
          })
        );
      } catch (e) {}
    }

    const langToggle = document.getElementById("translationLangToggle");
    if (langToggle && window.DeutschTranslation) {
      const lang = window.DeutschTranslation.getLang();
      langToggle.setAttribute("data-lang", lang);
      langToggle.setAttribute(
        "aria-label",
        "Your Language: " + (lang === "en" ? "English" : "Russian") + ". Tap to switch."
      );
    }

    /* Move this device's push subscription to the restored notification ID. */
    const restoredNotificationUser = localStorage.getItem("deutschNotificationUserIdV1");
    let notificationsMoved = true;
    if (
      restoredNotificationUser &&
      restoredNotificationUser !== previousNotificationUser &&
      window.DeutschNotifications
    ) {
      notificationsMoved = await window.DeutschNotifications.relink(previousNotificationUser);
    }

    if (note) note.textContent = notificationsMoved ? "· Restore complete" : "· Restored · turn Notifications on again";
    const nameField = document.getElementById("nameInput");
    if (nameField) nameField.value = getUserName();
    syncHomeDashboard();
  } catch (e) {
    if (note) note.textContent = "· Restore failed";
  }
}

document.getElementById("backupSave")?.addEventListener("click", saveDeutschBackup);
document.getElementById("backupRestore")?.addEventListener("click", () => {
  const input = document.getElementById("backupFile");
  if (input) {
    input.value = "";
    input.click();
  }
});
document.getElementById("backupFile")?.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) restoreDeutschBackup(file);
});

/* Notifications v5.2 — iOS Safari Home Screen Web App only.
   This block is isolated from the existing Home logic. */
(function initDeutschNotifications() {
  const SERVER = "https://german-learning-notifications.d45zgw2cgh.workers.dev";
  const ENABLED_KEY = "deutschNotificationEnabledV1";
  const USER_KEY = "deutschNotificationUserIdV1";
  const DEVICE_KEY = "deutschNotificationDeviceIdV1";

  const box = document.getElementById("notificationSettings");
  const toggle = document.getElementById("notificationToggle");
  const state = document.getElementById("notificationState");
  const note = document.getElementById("notificationNote");

  if (!box || !toggle || !state) return;

  box.style.width = "100%";
  box.style.textAlign = "center";

  function isIOSDevice() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return (
      navigator.standalone === true || !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    );
  }

  function isIOSHomeScreenApp() {
    return isIOSDevice() && isStandalone();
  }

  function enabled() {
    return localStorage.getItem(ENABLED_KEY) === "1";
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      try {
        id = crypto.randomUUID
          ? crypto.randomUUID()
          : "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      } catch (e) {
        id = "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function getUserId() {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      try {
        id = crypto.randomUUID ? crypto.randomUUID() : "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      } catch (e) {
        id = "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  }

  function render() {
    const visible = isIOSHomeScreenApp();
    box.hidden = !visible;
    if (!visible) return;

    const on = enabled();
    state.textContent = on ? "ON" : "OFF";
    toggle.setAttribute("aria-checked", on ? "true" : "false");
  }

  function base64ToBytes(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function registerPush() {
    if (!("serviceWorker" in navigator)) throw new Error("service-worker");
    if (!("PushManager" in window)) throw new Error("push-not-supported");
    if (!("Notification" in window)) throw new Error("notifications-not-supported");

    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("permission");

    const configResponse = await fetch(SERVER + "/push-config", { cache: "no-store" });
    if (!configResponse.ok) throw new Error("push-config-" + configResponse.status);
    const config = await configResponse.json();
    if (!config.publicKey) throw new Error("missing-public-key");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(config.publicKey)
      });
    }

    const response = await fetch(SERVER + "/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getUserId(),
        deviceId: getDeviceId(),
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) throw new Error("subscribe-" + response.status);
  }

  async function setServerState(on) {
    const response = await fetch(SERVER + (on ? "/go" : "/stop"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getUserId(),
        deviceId: getDeviceId()
      })
    });
    if (!response.ok) throw new Error((on ? "/go" : "/stop") + "-" + response.status);
  }

  toggle.addEventListener("click", async () => {
    const next = !enabled();
    toggle.disabled = true;
    if (note) note.textContent = "";

    try {
      if (next) await registerPush();
      await setServerState(next);
      localStorage.setItem(ENABLED_KEY, next ? "1" : "0");
    } catch (error) {
      console.error("Deutsch notifications:", error);
      if (note) note.textContent = "Notification setup failed.";
    } finally {
      toggle.disabled = false;
      render();
    }
  });

  /* After a backup restore changed the userId: if this device has
     notifications ON, register its existing subscription under the restored
     userId, enable that user and detach the device from the old userId.
     The old userId is then cleaned up by the Worker Cron. */
  async function relink(oldUserId) {
    if (!enabled()) return true;
    try {
      const registration = await navigator.serviceWorker.getRegistration("./");
      const subscription = registration && (await registration.pushManager.getSubscription());
      if (!subscription) throw new Error("no-subscription");

      const response = await fetch(SERVER + "/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          deviceId: getDeviceId(),
          subscription: subscription.toJSON()
        })
      });
      if (!response.ok) throw new Error("subscribe-" + response.status);
      await setServerState(true);

      if (oldUserId && oldUserId !== getUserId()) {
        fetch(SERVER + "/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: oldUserId, deviceId: getDeviceId() })
        }).catch(() => {});
      }
      return true;
    } catch (error) {
      console.error("Deutsch notifications relink:", error);
      localStorage.setItem(ENABLED_KEY, "0");
      render();
      return false;
    }
  }

  window.DeutschNotifications = { relink };

  resetDailyLimitForNewDay();
  render();
})();

(function initDeutschSettings() {
  const open = document.getElementById("settingsOpen");
  const panel = document.getElementById("settingsPanel");
  const title = document.getElementById("settingsPanel")?.querySelector(".settings-title");
  const ghost = document.getElementById("settingsMorph");
  const close = document.getElementById("settingsClose");
  const theme = document.getElementById("themeToggle");
  const limit = document.getElementById("dailyLimitToggle");
  const langToggle = document.getElementById("translationLangToggle");
  const confirm = document.getElementById("dailyLimitConfirm");
  const no = document.getElementById("dailyLimitNo");
  const yes = document.getElementById("dailyLimitYes");
  const LIMIT_KEY = "deutschDailyLimitEnabledV1";
  const nameInput = document.getElementById("nameInput");

  const limitOn = () => localStorage.getItem(LIMIT_KEY) !== "0";

  function render() {
    resetDailyLimitForNewDay();
    theme.setAttribute("aria-checked", window.DeutschTheme.isLight() ? "true" : "false");
    limit.setAttribute("aria-checked", limitOn() ? "true" : "false");
    if (langToggle && window.DeutschTranslation) {
      const lang = window.DeutschTranslation.getLang();
      langToggle.setAttribute("data-lang", lang);
      langToggle.setAttribute(
        "aria-label",
        "Your Language: " + (lang === "en" ? "English" : "Russian") + ". Tap to switch."
      );
    }
    if (nameInput && document.activeElement !== nameInput) nameInput.value = getUserName();
  }

  /* Word-morph animation: the "Settings" launcher word flies up, scales and
     brightens into the panel's header title (and reverses on close), instead
     of just appearing/disappearing as the panel slides. Font-size is never
     animated directly (expensive, can look jerky) — the ghost is rendered at
     the destination's true size and transformed to visually sit at the
     origin, then that transform animates back to identity. */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canMorph = !reduceMotion && open && panel && title && ghost;

  function rectAsIfOpen() {
    // While the panel is closed it sits translateY(100%) — i.e. shifted
    // down by exactly its own rendered height — so the title's on-screen
    // position once open is simply its current rect shifted up by that.
    const r = title.getBoundingClientRect();
    const h = panel.offsetHeight;
    return { left: r.left, top: r.top - h, width: r.width, height: r.height };
  }

  function flyGhost(from, to, fromColor, toColor, onDone) {
    ghost.style.transition = "none";
    ghost.style.left = to.left + "px";
    ghost.style.top = to.top + "px";
    ghost.style.width = to.width + "px";
    ghost.style.height = to.height + "px";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.fontSize = getComputedStyle(title).fontSize;
    ghost.style.fontWeight = getComputedStyle(title).fontWeight;
    ghost.style.letterSpacing = getComputedStyle(title).letterSpacing;
    ghost.style.color = fromColor;
    ghost.style.opacity = "1";

    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    ghost.style.transform = `translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`;

    void ghost.offsetWidth; // flush so the start state above actually renders

    ghost.style.transition = "transform .42s cubic-bezier(.22,.61,.36,1), color .3s ease";
    ghost.style.transform = "translate(0,0) scale(1,1)";
    ghost.style.color = toColor;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ghost.style.opacity = "0";
      onDone();
    };
    ghost.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 460); // safety net if transitionend never fires
  }

  function playOpenMorph() {
    // Measured while still closed, so the subtraction trick above holds.
    const from = open.getBoundingClientRect();
    const to = rectAsIfOpen();
    const fromColor = getComputedStyle(open).color;
    const toColor = getComputedStyle(title).color;
    title.style.visibility = "hidden";
    flyGhost(from, to, fromColor, toColor, () => {
      title.style.visibility = "";
    });
  }

  function playCloseMorph() {
    // Measured while still open, so no adjustment is needed here.
    const from = title.getBoundingClientRect();
    const to = open.getBoundingClientRect();
    const fromColor = getComputedStyle(title).color;
    const toColor = getComputedStyle(open).color;
    open.style.visibility = "hidden";
    flyGhost(from, to, fromColor, toColor, () => {
      open.style.visibility = "";
    });
  }

  function openSettings() {
    render();
    if (canMorph) playOpenMorph();
    document.documentElement.classList.add("home-settings-open");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    open?.setAttribute("aria-expanded", "true");
  }
  function closeSettings() {
    nameInput?.blur();
    confirm.classList.remove("is-open");
    confirm.setAttribute("aria-hidden", "true");
    if (canMorph) playCloseMorph();
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("home-settings-open");
    open?.setAttribute("aria-expanded", "false");
  }

  open?.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closeSettings() : openSettings();
  });
  close?.addEventListener("click", closeSettings);

  nameInput?.addEventListener("input", () => {
    setUserName(nameInput.value);
    renderDailyStats();
  });
  nameInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      nameInput.blur();
    }
  });
  nameInput?.addEventListener("blur", () => {
    nameInput.value = getUserName();
  });

  theme?.addEventListener("click", () => {
    window.DeutschTheme.set(!window.DeutschTheme.isLight());
    render();
  });

  langToggle?.addEventListener("click", () => {
    if (!window.DeutschTranslation) return;
    window.DeutschTranslation.setLang(window.DeutschTranslation.getLang() === "en" ? "ru" : "en");
    render();
    document.dispatchEvent(new CustomEvent("deutsch:translationlang"));
  });

  limit?.addEventListener("click", () => {
    if (limitOn()) {
      confirm.classList.add("is-open");
      confirm.setAttribute("aria-hidden", "false");
    } else {
      localStorage.setItem(LIMIT_KEY, "1");
      localStorage.removeItem(DAILY_LIMIT_OFF_DATE_KEY);
      renderDailyStats();
      render();
    }
  });

  // Tap outside the window or Esc = "No" (like the table windows).
  confirm?.addEventListener("click", event => {
    if (event.target === confirm) no?.click();
  });
  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape" && confirm?.classList.contains("is-open")) {
        event.stopPropagation();
        no?.click();
      }
    },
    true
  );

  no?.addEventListener("click", () => {
    confirm.classList.remove("is-open");
    confirm.setAttribute("aria-hidden", "true");
    render();
  });

  yes?.addEventListener("click", () => {
    localStorage.setItem(LIMIT_KEY, "0");
    localStorage.setItem(DAILY_LIMIT_OFF_DATE_KEY, DeutschDay.key());
    confirm.classList.remove("is-open");
    confirm.setAttribute("aria-hidden", "true");
    renderDailyStats();
    render();
  });

  // The early <head> script already set data-theme before first paint (to
  // avoid a flash), but couldn't touch icons — the DOM didn't exist yet.
  // Apply the full theme now, including icons, now that it does.
  window.DeutschTheme.apply(window.DeutschTheme.isLight());
  render();
})();

/* ===== ABOUT window (Settings → About) — text in the chosen translation language =====
   \u00a0 = non-breaking space: keeps each example group (der, die or das) on one line. */
(function () {
  const ABOUT_TEXT = {
    en: "Some German grammar you can understand. Some you just have to remember - der,\u00a0die\u00a0or\u00a0das, ihr\u00a0or\u00a0Ihnen, am\u00a0or\u00a0im. This app is made for exactly those parts. Short daily rounds help them stick.",
    ru: "Часть немецкой грамматики можно понять. А часть приходится просто запомнить - der,\u00a0die\u00a0или\u00a0das, ihr\u00a0или\u00a0Ihnen, am\u00a0или\u00a0im. Именно для этого и создано приложение. Короткие ежедневные раунды помогают всё закрепить."
  };
  const win = document.getElementById("aboutWindow"),
    openBtn = document.getElementById("aboutOpen"),
    closeBtn = document.getElementById("aboutClose"),
    text = document.getElementById("aboutText");
  if (!win || !openBtn) return;
  function lang() {
    try {
      return window.DeutschTranslation
        ? window.DeutschTranslation.getLang()
        : localStorage.getItem("deutschTranslationLangV1") || "en";
    } catch (e) {
      return "en";
    }
  }
  function open() {
    text.textContent = ABOUT_TEXT[lang()] || ABOUT_TEXT.en;
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
  }
  function close() {
    win.classList.remove("open");
    win.setAttribute("aria-hidden", "true");
  }
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  win.addEventListener("click", e => {
    if (e.target === win) close();
  });
  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape" && win.classList.contains("open")) {
        e.stopPropagation();
        close();
      }
    },
    true
  );
})();
/* ===== KEEP YOUR PROGRESS (2026-09-26, Home 5.72) — see Documentation/DECISIONS.md =====
   - Settings: "· Last backup …" next to Backup on every device. Red (palette red) only in
     Safari in the browser (iPhone/iPad browser or Mac Safari, not the Home Screen app)
     when the last backup is more than 5 days old, or there is none yet.
   - Home card: iPhone/iPad browser only, only once there is progress. × = "not now":
     comes back once after 14 days, then never again. Texts follow Your Language. */
(function () {
  const CARD_KEY = "deutschKeepCardV1"; // {dismissed:number, at:ISO} — per device, not backed up
  const WARN_DAYS = 5,
    AGAIN_DAYS = 14;
  const SHARE =
    '<svg aria-hidden="true" class="share-ic" width="16" height="18" viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12V1.5M4.5 5 8 1.5 11.5 5M5 8H2.5v10.5h11V8H11"/></svg>';
  const T = {
    en: {
      label: "Keep your progress",
      card: "Safari deletes saved progress after 7 days without a visit. On the Home Screen, it stays safe.",
      how: "Show me how ›",
      title: "Add to Home Screen",
      s1: "Save your progress first.",
      btn: "Make a Backup",
      done: "✓ Backup Created",
      s2: "Tap <b>Share</b> " + SHARE + " in Safari, then <b>Add to Home Screen</b>.",
      s3: "Open Deutsch. from the new icon, go to <b>Settings → Restore</b> and pick the backup file.",
      foot: "The Home Screen app has its own storage, so your progress needs to be moved over once.",
      hintIOS:
        "Progress is saved in this browser only. Safari deletes it after 7 days without a visit - add Deutsch. to your Home Screen, or make a backup often.",
      hintMac:
        "Progress is saved in this browser only. Safari deletes it after 7 days without a visit - make a backup often."
    },
    ru: {
      label: "Сохраните прогресс",
      card: "Safari удаляет сохранённый прогресс, если 7 дней не заходить на сайт. На экране «Домой» он в безопасности.",
      how: "Как это сделать ›",
      title: "На экран «Домой»",
      s1: "Сначала сохраните прогресс.",
      btn: "Сделать бэкап",
      done: "✓ Бэкап сохранён",
      s2: "Нажмите <b>Поделиться</b> " + SHARE + " в Safari, затем <b>На экран «Домой»</b>.",
      s3: "Откройте Deutsch. с новой иконки, зайдите в <b>Settings → Restore</b> и выберите файл бэкапа.",
      foot: "У приложения на экране «Домой» своё хранилище, поэтому прогресс нужно один раз перенести.",
      hintIOS:
        "Прогресс хранится только в этом браузере. Safari удаляет его, если 7 дней не заходить на сайт - добавьте Deutsch. на экран «Домой» или почаще делайте бэкап.",
      hintMac:
        "Прогресс хранится только в этом браузере. Safari удаляет его, если 7 дней не заходить на сайт - почаще делайте бэкап."
    }
  };
  const $ = id => document.getElementById(id);
  function lang() {
    try {
      return window.DeutschTranslation
        ? window.DeutschTranslation.getLang()
        : localStorage.getItem("deutschTranslationLangV1") || "en";
    } catch (e) {
      return "en";
    }
  }
  function t() {
    return T[lang()] || T.en;
  }
  function isIOS() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return (
      navigator.standalone === true || !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    );
  }
  function isMacSafari() {
    const ua = navigator.userAgent || "";
    return !isIOS() && /Version\/[\d.]+.*Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua);
  }
  function atRisk() {
    return !isStandalone() && (isIOS() || isMacSafari());
  }
  function hasProgress() {
    try {
      const b = buildDeutschBackup();
      return Object.keys(b.modules).some(n => !BACKUP_MODULES[n]?.setting);
    } catch (e) {
      return false;
    }
  }
  function daysSince(iso) {
    const ms = Date.parse(iso || "");
    if (!ms) return null;
    const a = new Date(ms),
      b = new Date();
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((b - a) / 864e5));
  }
  function lastDays() {
    try {
      return daysSince(localStorage.getItem(DEUTSCH_LAST_BACKUP_KEY));
    } catch (e) {
      return null;
    }
  }

  /* Settings: note next to Backup + hint under Restore */
  function renderBackupNote() {
    const note = $("backupNote"),
      hint = $("backupHint");
    const progress = hasProgress(),
      d = lastDays();
    if (note) {
      note.classList.remove("is-warning");
      if (!progress && d === null) {
        note.textContent = "";
      } else {
        note.textContent =
          d === null
            ? "· No backup yet"
            : d === 0
              ? "· Last backup today"
              : d === 1
                ? "· Last backup yesterday"
                : "· Last backup " + d + " days ago";
        if (atRisk() && progress && (d === null || d > WARN_DAYS)) note.classList.add("is-warning");
      }
    }
    if (hint) {
      if (atRisk()) {
        hint.textContent = isIOS() ? t().hintIOS : t().hintMac;
        hint.hidden = false;
      } else {
        hint.textContent = "";
        hint.hidden = true;
      }
    }
  }

  /* Home card */
  function cardState() {
    try {
      return JSON.parse(localStorage.getItem(CARD_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function cardAllowed() {
    const s = cardState(),
      n = s.dismissed || 0;
    if (n === 0) return true;
    if (n === 1) {
      const d = daysSince(s.at);
      return d !== null && d >= AGAIN_DAYS;
    }
    return false;
  }
  function renderCard() {
    const card = $("keepCard");
    if (!card) return;
    const show = isIOS() && !isStandalone() && hasProgress() && cardAllowed();
    card.hidden = !show;
    if (!show) return;
    $("keepLabel").textContent = t().label;
    $("keepText").textContent = t().card;
    $("keepHow").textContent = t().how;
  }
  $("keepDismiss")?.addEventListener("click", () => {
    const s = cardState();
    try {
      localStorage.setItem(
        CARD_KEY,
        JSON.stringify({ dismissed: (s.dismissed || 0) + 1, at: new Date().toISOString() })
      );
    } catch (e) {}
    $("keepCard").hidden = true;
  });

  /* "Show me how" window (built like About) */
  const win = $("keepWindow");
  function renderWindow() {
    const x = t(),
      today = lastDays() === 0;
    $("keepTitle").textContent = x.title;
    $("keepSteps").innerHTML =
      "<li><span>" +
      x.s1 +
      '<br><button class="keep-backup-btn" id="keepBackup" type="button"' +
      (today ? " disabled" : "") +
      ">" +
      (today ? x.done : x.btn) +
      "</button></span></li><li><span>" +
      x.s2 +
      "</span></li><li><span>" +
      x.s3 +
      "</span></li>";
    $("keepFoot").textContent = x.foot;
  }
  function openWin() {
    renderWindow();
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
  }
  function closeWin() {
    win.classList.remove("open");
    win.setAttribute("aria-hidden", "true");
  }
  if (win) {
    $("keepHow")?.addEventListener("click", openWin);
    $("keepClose")?.addEventListener("click", closeWin);
    win.addEventListener("click", e => {
      if (e.target === win) {
        closeWin();
        return;
      }
      if (e.target.closest && e.target.closest("#keepBackup")) {
        saveDeutschBackup();
        renderWindow();
      }
    });
    document.addEventListener(
      "keydown",
      e => {
        if (e.key === "Escape" && win.classList.contains("open")) {
          e.stopPropagation();
          closeWin();
        }
      },
      true
    );
  }

  function renderAll() {
    renderCard();
    renderBackupNote();
  }
  $("settingsOpen")?.addEventListener("click", () => setTimeout(renderBackupNote, 0));
  $("translationLangToggle")?.addEventListener("click", () => setTimeout(renderAll, 0));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderCard();
  });
  renderAll();
})();
