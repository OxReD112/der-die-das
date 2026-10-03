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

  /* Weeks are counted in whole calendar days of the device's own date
     (Date.UTC), not in milliseconds, so summer/winter time changes can't
     shift the count by an hour. Everyone gets the same phrase each week;
     it changes at each person's local Monday 00:00. */
  const DAY_MS = 86400000;

  function calendarDayNumber(date) {
    return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  }

  function render() {
    if (!Array.isArray(window.PHRASES) || window.PHRASES.length === 0) return;

    // Monday 5 January 2026 is week 0.
    const firstMonday = Math.round(Date.UTC(2026, 0, 5) / DAY_MS);
    const weeks = Math.max(0, Math.floor((calendarDayNumber(new Date()) - firstMonday) / 7));
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

/* ===== WIDE HOME · iPad landscape + computer (Home 5.119) =====
   Only when the screen is wide AND in landscape AND tall enough. Phones never match
   (even sideways they are under 500px tall), so the phone page is never touched.
   The same nodes are moved into two columns and put back exactly where they were
   when the screen goes narrow again (rotate, split view, smaller window).
     top:   Deutsch.
     left:  greeting · phrase of the week · Wörterbuch (search field)
     right: exercise tiles · Heute ;  under it: Fortschritt line (+ keep card)
     under the left column: the settings gear
   „Deutsch.“ sits above both columns. Typing in the Wörterbuch slides it up to the
   top of the left column (where the greeting is); the tiles never move.
   All CSS lives under html.home-wide-layout. */
window.DEUTSCH_WIDE_QUERY = "(orientation: landscape) and (min-width: 1024px) and (min-height: 600px)";
(function initWideHome() {
  const root = document.documentElement;
  const wide = window.matchMedia(window.DEUTSCH_WIDE_QUERY);
  const homeTrack = document.getElementById("homeTrack");
  const header = document.querySelector(".page > header");
  const greeting = document.getElementById("greeting");
  const phraseScreen = document.getElementById("phraseScreen");
  const phraseContent = phraseScreen && phraseScreen.querySelector(".phrase-screen-content");
  const dictLayer = document.getElementById("dictionaryLayer");
  const dictPanel = document.getElementById("dictionaryPanel");
  const dictInput = document.getElementById("dictionarySearchInput");
  const dictClose = document.getElementById("dictionaryClose");
  const dictTitle = dictPanel && dictPanel.querySelector(".settings-title");
  const mosaic = document.querySelector(".dashboard.mosaic");
  const today = document.querySelector(".today-bottom");
  const overview = document.getElementById("homeProgressOverview");
  const keepCard = document.getElementById("keepCard");
  const homeActions = document.querySelector(".home-actions");
  if (!homeTrack || !header || !greeting || !phraseContent || !dictLayer || !dictPanel || !dictInput || !mosaic || !today) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const markers = new Map();
  let columns = null;

  function moveInto(node, parent) {
    if (!node) return;
    const marker = document.createComment("wide-home-position");
    node.before(marker);
    markers.set(node, marker);
    parent.append(node);
  }

  function restore() {
    for (const [node, marker] of markers) {
      marker.before(node);
      marker.remove();
    }
    markers.clear();
    if (columns) Object.values(columns).forEach(column => column.remove());
    columns = null;
  }

  function column(className) {
    const element = document.createElement("div");
    element.className = className;
    homeTrack.append(element);
    return element;
  }

  /* ---------- Wörterbuch: rest (bottom left) ⇄ open (under „Deutsch.“) ---------- */
  const isOpen = () => root.classList.contains("home-wide-dict-open");

  function slide(open) {
    if (isOpen() === open) return;
    const before = dictLayer.getBoundingClientRect().top;
    root.classList.toggle("home-wide-dict-open", open);
    dictClose?.setAttribute("tabindex", open ? "0" : "-1");
    if (reduceMotion.matches) return;
    const after = dictLayer.getBoundingClientRect().top;
    dictLayer.style.transition = "none";
    dictLayer.style.transform = `translateY(${before - after}px)`;
    dictLayer.getBoundingClientRect();
    dictLayer.style.transition = "";
    dictLayer.style.transform = "";
  }

  function closeDictionary() {
    if (!isOpen()) return;
    if (document.activeElement === dictInput) dictInput.blur();
    if (dictInput.value) {
      // back to rest = a clean field (worterbuch.js re-renders on "input")
      dictInput.value = "";
      dictInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    slide(false);
  }

  function setTop() {
    // the open Wörterbuch starts right under „Deutsch.“
    if (!columns) return;
    const h = header.getBoundingClientRect();
    const c = columns.left.getBoundingClientRect();
    columns.left.style.setProperty("--wide-dict-top", Math.max(0, Math.round(h.bottom - c.top + 26)) + "px");
    // …and may reach down to the end of the Fortschritt line under the tiles
    const f = columns.foot.getBoundingClientRect();
    columns.left.style.setProperty("--wide-dict-bottom", Math.round(Math.min(0, c.bottom - f.bottom)) + "px");
  }

  dictInput.addEventListener("focus", () => {
    if (!columns) return;
    setTop();
    slide(true);
  });
  dictInput.addEventListener("input", () => {
    if (columns && dictInput.value.trim()) slide(true);
  });
  dictClose?.addEventListener("click", () => {
    if (columns) closeDictionary();
  });
  dictTitle?.addEventListener("click", () => {
    if (!columns) return;
    if (isOpen()) closeDictionary();
    else dictInput.focus({ preventScroll: true });
  });
  // Tapping elsewhere with nothing typed puts the Wörterbuch back to rest.
  dictLayer.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!columns || !isOpen()) return;
      if (dictLayer.contains(document.activeElement)) return;
      if (!dictInput.value.trim()) closeDictionary();
    }, 160);
  });
  document.addEventListener("keydown", event => {
    if (columns && event.key === "Escape" && isOpen()) closeDictionary();
  });

  /* ---------- switch layouts ---------- */
  function sync() {
    const enabled = wide.matches;
    if (enabled === !!columns) return;
    if (enabled) {
      root.classList.remove("home-dictionary-open");
      dictPanel.classList.remove("is-open");
      columns = {
        left: column("wide-left"),
        right: column("wide-right"),
        foot: column("wide-foot")
      };
      moveInto(header, homeTrack);
      moveInto(greeting, columns.left);
      moveInto(phraseContent, columns.left);
      moveInto(dictLayer, columns.left);
      moveInto(mosaic, columns.right);
      moveInto(today, columns.right);
      moveInto(overview, columns.foot);
      moveInto(keepCard, columns.foot);
      moveInto(homeActions, homeTrack);
      phraseScreen.setAttribute("aria-hidden", "false");
      dictPanel.setAttribute("aria-hidden", "false");
      dictClose?.setAttribute("tabindex", "-1");
      root.classList.add("home-wide-layout");
    } else {
      root.classList.remove("home-wide-layout", "home-wide-dict-open");
      dictLayer.style.transform = "";
      restore();
      phraseScreen.setAttribute("aria-hidden", "true");
      dictPanel.setAttribute("aria-hidden", "true");
      dictClose?.removeAttribute("tabindex");
    }
    document.dispatchEvent(new CustomEvent("deutsch:homelayout", { detail: { wide: enabled } }));
  }

  sync();
  wide.addEventListener("change", sync);
  window.addEventListener("resize", setTop);
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
      const vielseitigeVerben = Number(data.verbformen?.vielseitigeVerben) || 0;
      answers = partizipII + modalverben + vielseitigeVerben;
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
  if (exercise !== "partizipII" && exercise !== "modalverben" && exercise !== "vielseitigeVerben") return;

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
  button.addEventListener("pointerdown", () => preloadApp(button), { passive: true });
  button.addEventListener("click", () => openApp(button));
});

// Wörterbuch → Wortschatz: carry the selected entry across the same-origin exercise frame.
window.openWortschatzForDictionary = item => {
  const tile = document.querySelector('[data-app^="wortschatz/"]');
  if (!tile || !item) return;
  const request = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), item };
  try {
    sessionStorage.setItem("deutschWortschatzPendingDictionaryWordV1", JSON.stringify(request));
  } catch (e) {}
  const deliver = () => {
    try {
      frame.contentWindow?.postMessage({ type: "deutsch:wortschatz-add", request }, location.origin);
    } catch (e) {}
  };
  frame.addEventListener("load", deliver, { once: true });
  openApp(tile);
  deliver();
};

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

/* ===== Open / close an exercise (Home 5.86, tuned up to 5.89) =====
   Phones: a short zoom, the same idea as the app's windows (Documentation/DECISIONS.md → *Home button + open / close
   animation*). At the tap Home steps back (shrinks to 97 %) while the exercise layer (page colour) fades in over it —
   the page loads during that movement (5.91). The exercise's content then fades in and settles
   from 96 % to full size as soon as the page can be drawn (its layout and styles are there — it doesn't wait for
   the data files, like the page appeared before 5.84; Wortschatz waits for its scripts). The exercise pages use the
   same page colour as Home, so only the content seems to move.
   Closing — one crossfade, nothing swapped while it's on screen: at the tap Home's pictures are prepared, the whole
   exercise screen (layer + content) fades out while its content shrinks a little, and Home — which never unloads,
   it's always there underneath — grows from 97 % to its size. When the exercise screen is invisible it's hidden and
   Home leaves exercise mode; the exercise page is unloaded half a second later, when nothing moves any more
   (5.87 unloaded it just as Home appeared, 5.88 under the cover — both showed as a jump / blink on the iPhone).
   Only scale and fade are animated — what a phone does smoothly.
   The page starts loading when the finger touches the tile (invisibly), so the empty page colour rarely shows.
   All screen sizes use this transition; Reduce Motion disables it.
   Exercises call closeApp() for their own "Zur Startseite", so every way back goes through here. */
const LAYER_FADE_MS = 220;
// the content arriving (5.93, calmer): a gentle fade and, separately, a longer zoom that still moves in its second
// half — so it's visible while it's still settling instead of popping up and then snapping into place
const CONTENT_FADE_MS = 300;
const ZOOM_IN_MS = 420;
const ZOOM_IN_FROM = 0.96;
const EASE_SOFT = "cubic-bezier(0.25, 0.1, 0.25, 1)"; // gentle start and end (CSS "ease")
const EASE_ZOOM = "cubic-bezier(0.33, 1, 0.68, 1)"; // eases out, but keeps moving noticeably in its second half
const CLOSE_FADE_MS = 240;
const CLOSE_SHRINK_TO = 0.97;
const HOME_STEP_MS = 380; // Home steps back (opening) / grows back (closing) — same size, same speed
const HOME_STEP_SCALE = 0.97;
const UNLOAD_AFTER_MS = 500;
const homeArea = document.querySelector(".home-viewport"); // greeting + tiles (the fixed header can't be scaled)
let animBusy = false,
  preloadedApp = null, // page already loading because a finger is on its tile
  preloadTimer = 0,
  unloadTimer = 0,
  docBefore = null; // the page that was in the frame before the last navigation

// every page change of the exercise frame goes through here
function setFrameSrc(url) {
  clearTimeout(unloadTimer);
  try {
    docBefore = frame.contentDocument;
  } catch (e) {
    docBefore = null;
  }
  frame.src = url;
}

function useAnimation() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
// the new page can be drawn: its layout and styles are there (the moment the page used to appear before 5.84).
// Data files and scripts at the end of the page may still be coming — the zoom doesn't wait for them.
// Exception: pages whose script decides which screen to show first (Wortschatz: start screen or „Fertig für heute“)
// wait for their scripts, otherwise an empty skeleton would zoom in.
const WAIT_FOR_SCRIPTS = ["wortschatz/"];
function pageShowable() {
  try {
    const doc = frame.contentDocument;
    if (frame.contentWindow.location.href === "about:blank" || !doc || !doc.body || doc === docBefore) return false;
    if (doc.readyState !== "loading") return true;
    if (WAIT_FOR_SCRIPTS.includes(framePath())) return false;
    const styles = [...doc.querySelectorAll('link[rel="stylesheet"]')];
    return !!doc.querySelector("main, .app") && styles.every(l => l.sheet);
  } catch (e) {
    return false;
  }
}
// a finger on a tile: start loading its page already, invisibly (shell rendered but hidden, so the page lays out
// with the right size). If no tap follows (the finger scrolled the tiles), it's dropped again.
function preloadApp(tile) {
  if (!useAnimation() || animBusy || shell.classList.contains("open")) return;
  clearTimeout(preloadTimer);
  if (preloadedApp !== tile.dataset.app) {
    preloadedApp = tile.dataset.app;
    shell.classList.add("preload");
    setFrameSrc(preloadedApp);
  }
  preloadTimer = setTimeout(() => {
    if (shell.classList.contains("open")) return;
    shell.classList.remove("preload");
    preloadedApp = null;
    setFrameSrc("about:blank");
  }, 1500);
}

function openApp(tile) {
  if (animBusy) return;
  clearTimeout(preloadTimer);
  if (preloadedApp !== tile.dataset.app) setFrameSrc(tile.dataset.app);
  preloadedApp = null;
  const zoom = useAnimation();
  if (zoom) {
    animBusy = true;
    shell.classList.add("is-animating"); // Home button hidden until the content is in place
    frame.style.opacity = "0";
  }
  shell.classList.remove("preload");
  shell.classList.add("open");
  shell.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("app-open");
  if (!zoom) return;

  shell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LAYER_FADE_MS, easing: "ease-out" });
  // Home steps back under the fading-in layer (the reverse of closing, where it grows back from 97 %)
  const box = homeArea.getBoundingClientRect();
  homeArea.style.transformOrigin = `${innerWidth / 2 - box.left}px ${innerHeight / 2 - box.top}px`;
  const homeStepBack = homeArea.animate([{ transform: "scale(1)" }, { transform: `scale(${HOME_STEP_SCALE})` }], {
    duration: HOME_STEP_MS,
    easing: EASE_SOFT,
    fill: "forwards"
  });
  const earliest = performance.now() + LAYER_FADE_MS * 0.6; // content starts once the layer has (almost) covered Home
  zoomContentIn(earliest, true, () => {
    homeStepBack.cancel(); // Home is covered now; back to normal size underneath
    homeArea.style.transformOrigin = "";
    animBusy = false;
    scheduleBack();
  });
}

// the new page's content fades in and settles from 96 % — as soon as it can be drawn, at the earliest at `earliest`.
// withButton: the Home button fades in with it (opening from Home); a chapter card leaves it where it is.
function zoomContentIn(earliest, withButton, onSettled) {
  let started = false;
  const zoomIn = () => {
    if (started) return;
    started = true;
    if (withButton) {
      shell.classList.remove("is-animating");
      updateBack(); // the Home button is placed now and fades in with the content
      back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: EASE_SOFT });
    }
    frame.style.opacity = "";
    frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: EASE_SOFT });
    const zoom = frame.animate([{ transform: `scale(${ZOOM_IN_FROM})` }, { transform: "scale(1)" }], {
      duration: ZOOM_IN_MS,
      easing: EASE_ZOOM
    });
    zoom.onfinish = zoom.oncancel = onSettled;
  };
  // the page is ready: give it two frames to finish its own setup, so the zoom's first frames aren't dropped
  const startSoon = () => requestAnimationFrame(() => requestAnimationFrame(zoomIn));
  const whenShowable = () => {
    if (started) return;
    if (pageShowable() && performance.now() >= earliest) startSoon();
    else requestAnimationFrame(whenShowable);
  };
  whenShowable();
  setTimeout(zoomIn, 1500); // very slow network: show whatever has arrived
}

/* A card on a chapter page (Verbformen, Präpositionen) opens its exercise (Home 5.94). Phones: the chapter page
   goes at once and the exercise arrives with the same fade + zoom as from Home — before, it simply appeared, which
   felt broken right after the zoom into the chapter. The Home button stays where it is (same spot on both screens).
   Reduce Motion: plain page change. Called by the chapter pages (verbformen.js,
   praepositionen.js); url is absolute. */
function openChapterExercise(url) {
  if (animBusy) return;
  if (!useAnimation() || !shell.classList.contains("open")) {
    setFrameSrc(url);
    return;
  }
  animBusy = true;
  frame.style.opacity = "0"; // the chapter page goes at once — nothing is swapped while it's on screen
  setFrameSrc(url);
  zoomContentIn(performance.now(), false, () => {
    animBusy = false;
    scheduleBack();
  });
}

function closeApp() {
  if (animBusy) return;
  renderDailyStats();
  const hideShell = () => {
    shell.classList.remove("open", "preload", "is-animating", "is-closing");
    shell.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("app-open");
    setFrameWindow(false);
    animBusy = false;
  };
  if (!useAnimation() || !shell.classList.contains("open")) {
    hideShell();
    setFrameSrc("about:blank");
    return;
  }
  animBusy = true;
  setFrameWindow(false);
  shell.classList.add("is-animating", "is-closing"); // Home button gone at once
  // Home's pictures: get them ready now (Safari may have dropped them while the exercise covered Home)
  homeArea.querySelectorAll("img").forEach(img => img.decode && img.decode().catch(() => {}));
  const box = homeArea.getBoundingClientRect();
  homeArea.style.transformOrigin = `${innerWidth / 2 - box.left}px ${innerHeight / 2 - box.top}px`;
  const anims = [
    shell.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_FADE_MS, easing: "ease-out", fill: "forwards" }),
    frame.animate([{ transform: "scale(1)" }, { transform: `scale(${CLOSE_SHRINK_TO})` }], {
      duration: CLOSE_FADE_MS,
      easing: "ease-out",
      fill: "forwards"
    })
  ];
  const settle = homeArea.animate([{ transform: `scale(${HOME_STEP_SCALE})` }, { transform: "scale(1)" }], {
    duration: HOME_STEP_MS,
    easing: EASE_SOFT // still growing while Home comes through the fading exercise screen
  });
  settle.onfinish = settle.oncancel = () => (homeArea.style.transformOrigin = "");
  anims[0].onfinish = () => {
    hideShell();
    anims.forEach(a => a.cancel());
    // unload the exercise page once nothing moves any more (not if an exercise was opened again meanwhile)
    unloadTimer = setTimeout(() => {
      if (!shell.classList.contains("open") && !shell.classList.contains("preload")) setFrameSrc("about:blank");
    }, UNLOAD_AFTER_MS);
  };
}

/* iPhone Safari shows :active (the shared press effect) only on pages that listen for touches.
       An empty, passive listener switches it on — for Home and (on load) for every exercise and chapter page.
       It never blocks scrolling, swiping or the keyboard. Home 5.44; lost in 5.85, back in 5.94. */
function noTouch() {}
document.addEventListener("touchstart", noTouch, { passive: true });

/* ===== Home button (Home 5.84, one fixed row since 5.90; replaces the "‹" of Home 5.43) =====
       One round house button; it always goes straight to Home (closeApp), from every screen of every exercise.
       It always sits in the same place — the bottom row, on the line of the version number:
       - start screens, chapter pages, summaries: in the centre; the version number moves to the right end of
         that row (Home adds a small style to the exercise page, see ROW_STYLE);
       - during a round: bottom left, at the same height;
       - short screens (the exercises' short-screen rule — phone sideways, 4-inch iPhones), where the version number
         follows the content: small, top left — during a round in front of the top-bar title.
       No measuring of the page layout (5.84–5.89 searched each screen for a gap: slow, and a different place on
       every screen). It appears together with the exercise's content and fades out while a table window is open. */
const TITLE_SEL = ".top-title,.top .brand";
const WINDOW_SEL = ".modal,.pattern-modal,.forms-modal,.omodal,.coll-modal"; // .coll-modal = Wortschatz collection window (Home 5.49)
const SHORT_SCREEN = "(max-height: 559px), (max-width: 340px) and (max-height: 609px)";
// added to every exercise page Home opens (to move into the exercises' own styles in the shared-stylesheet round)
const ROW_STYLE =
  "#homeBack{display:none!important}" + // „Zur Startseite“: the round button replaces it
  ".version-mark{text-align:right!important;padding-right:max(20px,calc((100% - 480px) / 2 + 20px))!important}" + // version → right end of the bottom row
  ".start-about{bottom:calc(env(safe-area-inset-bottom) + 80px)!important}" + // „Worum geht's?“ 16px up: room for the button
  ".deutsch-home-in-bar .top-title,.deutsch-home-in-bar .top .brand{padding-left:42px}"; // room for the small button in the top bar
let backObserver = null,
  backRaf = 0,
  rowTop = null; // top of the button in the bottom row (from the version number's line), for this page

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
function placeBack(mode, x, y = null) {
  // mode: "row" (44px, x = centre, y = top) · "corner" (44px, x / y = top left; CSS bottom left if y unknown) ·
  //       "small" (32px, x / y = top left)
  back.classList.toggle("is-small", mode === "small");
  back.classList.toggle("is-corner", mode === "corner" && y == null);
  if (mode === "corner" && y == null) {
    back.style.top = back.style.left = "";
    return;
  }
  back.style.left = Math.round(mode === "row" ? x - 22 : x) + "px";
  back.style.top = Math.round(y) + "px";
}
// the status-bar height as Home sees it (exercise pages inside the frame aren't reliably told)
const safeProbe = document.createElement("div");
safeProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top)";
document.body.appendChild(safeProbe);
function safeTop() {
  return parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
}

function updateBack() {
  backRaf = 0;
  if (!shell.classList.contains("open") || shell.classList.contains("is-closing")) {
    if (!shell.classList.contains("open")) setFrameWindow(false);
    return;
  }
  let doc, win;
  try {
    doc = frame.contentDocument;
    win = frame.contentWindow;
  } catch (e) {}
  if (!doc || !doc.head || !win) {
    placeBack("corner");
    return;
  }
  if (!doc.getElementById("deutsch-home-button")) {
    const st = doc.createElement("style");
    st.id = "deutsch-home-button";
    st.textContent = ROW_STYLE;
    doc.head.appendChild(st);
    rowTop = null;
    win.dispatchEvent(new Event("resize")); // pages that measure their own layout (Wortschatz) do it again
  }
  const windowOpen = [...doc.querySelectorAll(WINDOW_SEL)].some(el => isShown(el, win, true));
  back.classList.toggle("is-hidden", windowOpen);
  setFrameWindow(windowOpen);
  if (windowOpen) return;

  const W = win.innerWidth;
  const version = [...doc.querySelectorAll(".version-mark")].find(el => isShown(el, win, true));
  const short = win.matchMedia(SHORT_SCREEN).matches;
  doc.documentElement.classList.remove("deutsch-home-in-bar");

  if (short) {
    const title = !version && [...doc.querySelectorAll(TITLE_SEL)].find(el => isShown(el, win) && el.getBoundingClientRect().top < 80);
    if (title) {
      doc.documentElement.classList.add("deutsch-home-in-bar");
      const r = title.getBoundingClientRect();
      placeBack("small", r.left, r.top + r.height / 2 - 16);
    } else placeBack("small", Math.max(12, (W - 480) / 2 + 12), safeTop() + 12);
    return;
  }
  if (version) {
    // start / chapter / summary screen: centred on the version number's line
    const r = version.getBoundingClientRect();
    rowTop = (r.top + r.bottom) / 2 - 22;
    placeBack("row", W / 2, rowTop);
  } else placeBack("corner", Math.max(12, (W - 480) / 2 + 12), rowTop); // during a round: bottom left, same height
}
/* Window dim (Home 5.69, Home's own windows since 5.92): in the iPhone web app windows don't reach the very bottom
   of the screen, so while any window is open Home's background (and the status-bar colour) takes the dimmed colour
   — see home.css → .window-dim. Two sources: a window inside the exercise (setFrameWindow, from the Home button
   code) and Home's own windows (watched below). The dim stays while either is open. */
const HOME_WINDOWS = ".pg, .about-window, .settings-confirm"; // Fortschritt, About + Keep your progress, "Are you sure?"
const HOME_WINDOW_OPEN = ".pg.open, .about-window.open, .settings-confirm.is-open";
const windowDim = { frame: false, home: false };
function setFrameWindow(on) {
  setWindowDim("frame", on);
}
new MutationObserver(records => {
  if (records.some(r => r.target.matches && r.target.matches(HOME_WINDOWS)))
    setWindowDim("home", !!document.querySelector(HOME_WINDOW_OPEN));
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
function setWindowDim(source, on) {
  windowDim[source] = on;
  on = windowDim.frame || windowDim.home;
  const root = document.documentElement;
  if (root.classList.contains("window-dim") === on) return;
  root.classList.toggle("window-dim", on);
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
  vielseitigeVerben: {
    label: "Vielseitige Verben",
    storageKey: "vielseitigeVerbenDifficultyV1",
    storageVersion: "vielseitigeVerbenDifficultyV1"
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
  const close = document.getElementById("settingsClose");
  const dictionaryOpen = document.getElementById("dictionaryOpen");
  const dictionaryPanel = document.getElementById("dictionaryPanel");
  const dictionaryTitle = dictionaryPanel?.querySelector(".settings-title");
  const dictionaryGhost = document.getElementById("dictionaryMorph");
  const dictionaryClose = document.getElementById("dictionaryClose");
  const dictionarySearchInput = document.getElementById("dictionarySearchInput");
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

  /* Word-morph animation: the Wörterbuch launcher flies up, scales and
     brightens into its panel title (and reverses on close). Settings opens
     from its corner icon with the panel's ordinary slide. Font-size is never
     animated directly (expensive, can look jerky) — the ghost is rendered at
     the destination's true size and transformed to visually sit at the
     origin, then that transform animates back to identity. */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canMorphDictionary = !reduceMotion && dictionaryOpen && dictionaryPanel && dictionaryTitle && dictionaryGhost;

  function textRect(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function rectAsIfOpen(targetPanel, targetTitle) {
    // While closed the panel sits translateY(100%), so shift the title's
    // actual text bounds up by the panel height to find its open position.
    const r = textRect(targetTitle);
    const h = targetPanel.offsetHeight;
    return { ...r, top: r.top - h };
  }

  function flyGhost(targetGhost, fontSource, from, to, fromColor, toColor, onDone) {
    targetGhost.style.transition = "none";
    targetGhost.style.transform = "none";
    targetGhost.style.left = to.left + "px";
    targetGhost.style.top = to.top + "px";
    targetGhost.style.width = to.width + "px";
    targetGhost.style.height = to.height + "px";
    targetGhost.style.alignItems = "center";
    targetGhost.style.justifyContent = "center";
    const fontStyle = getComputedStyle(fontSource);
    targetGhost.style.fontFamily = fontStyle.fontFamily;
    targetGhost.style.fontSize = fontStyle.fontSize;
    targetGhost.style.fontWeight = fontStyle.fontWeight;
    targetGhost.style.lineHeight = fontStyle.lineHeight;
    targetGhost.style.letterSpacing = fontStyle.letterSpacing;
    targetGhost.style.color = fromColor;
    targetGhost.style.opacity = "1";

    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    targetGhost.style.transform = `translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`;

    void targetGhost.offsetWidth; // flush so the start state above actually renders

    targetGhost.style.transition = "transform .42s cubic-bezier(.22,.61,.36,1), color .3s ease";
    targetGhost.style.transform = "translate(0,0) scale(1,1)";
    targetGhost.style.color = toColor;

    let done = false;
    let fallbackTimer;
    const onTransitionEnd = (event) => {
      // The color transition ends before the movement. Keep both real labels
      // hidden until the ghost has actually reached its destination.
      if (event.target !== targetGhost || event.propertyName !== "transform") return;
      finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      targetGhost.removeEventListener("transitionend", onTransitionEnd);
      clearTimeout(fallbackTimer);
      targetGhost.style.opacity = "0";
      onDone();
    };
    targetGhost.addEventListener("transitionend", onTransitionEnd);
    fallbackTimer = setTimeout(finish, 460); // safety net if transitionend never fires
  }

  function playOpenMorph(trigger, targetPanel, targetTitle, targetGhost) {
    // Measured while still closed, so the subtraction trick above holds.
    const from = textRect(trigger);
    const to = rectAsIfOpen(targetPanel, targetTitle);
    const fromColor = getComputedStyle(trigger).color;
    const toColor = getComputedStyle(targetTitle).color;
    targetTitle.style.visibility = "hidden";
    flyGhost(targetGhost, targetTitle, from, to, fromColor, toColor, () => {
      targetTitle.style.visibility = "";
    });
  }

  function playCloseMorph(trigger, targetTitle, targetGhost) {
    // Measured while still open, so no adjustment is needed here.
    const from = textRect(targetTitle);
    const to = textRect(trigger);
    const fromColor = getComputedStyle(targetTitle).color;
    const toColor = getComputedStyle(trigger).color;
    trigger.style.visibility = "hidden";
    targetTitle.style.visibility = "hidden";
    flyGhost(targetGhost, trigger, from, to, fromColor, toColor, () => {
      trigger.style.visibility = "";
      targetTitle.style.visibility = "";
    });
  }

  function openSettings() {
    render();
    document.documentElement.classList.add("home-settings-open");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    open?.setAttribute("aria-expanded", "true");
  }
  function closeSettings() {
    nameInput?.blur();
    confirm.classList.remove("is-open");
    confirm.setAttribute("aria-hidden", "true");
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("home-settings-open");
    open?.setAttribute("aria-expanded", "false");
  }

  open?.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closeSettings() : openSettings();
  });
  close?.addEventListener("click", closeSettings);

  function openDictionary() {
    if (document.documentElement.classList.contains("home-wide-layout")) return; // wide: the Wörterbuch is inline (initWideHome)
    if (canMorphDictionary) playOpenMorph(dictionaryOpen, dictionaryPanel, dictionaryTitle, dictionaryGhost);
    document.documentElement.classList.add("home-dictionary-open");
    dictionaryPanel.classList.add("is-open");
    dictionaryPanel.setAttribute("aria-hidden", "false");
    dictionaryOpen?.setAttribute("aria-expanded", "true");
    dictionarySearchInput?.focus({ preventScroll: true });
    // The browser may focus the clicked launcher after its click handlers run.
    // Reapply focus on the next frame so keyboard input goes to the search box.
    requestAnimationFrame(() => dictionarySearchInput?.focus({ preventScroll: true }));
  }
  function closeDictionary() {
    if (document.documentElement.classList.contains("home-wide-layout")) return; // wide: initWideHome closes it
    dictionarySearchInput?.blur();
    if (canMorphDictionary) playCloseMorph(dictionaryOpen, dictionaryTitle, dictionaryGhost);
    dictionaryPanel.classList.remove("is-open");
    dictionaryPanel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("home-dictionary-open");
    dictionaryOpen?.setAttribute("aria-expanded", "false");
  }
  dictionaryOpen?.addEventListener("click", () => {
    dictionaryPanel.classList.contains("is-open") ? closeDictionary() : openDictionary();
  });
  dictionaryClose?.addEventListener("click", closeDictionary);

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
        "Progress is saved in this browser only. Safari deletes it after 7 days without a visit - make a backup often.",
      infoTitle: "Your progress",
      info1:
        "Your progress is saved only on this device - in this browser, or in the Home Screen app. It isn't stored online, so clearing website data, deleting the app or switching to a new device would erase it.",
      infoSafari: " Safari also deletes it after 7 days without a visit.",
      info2:
        "Make a backup now and then. It's a small file you can bring back anytime with Restore - on this device or a new one."
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
        "Прогресс хранится только в этом браузере. Safari удаляет его, если 7 дней не заходить на сайт - почаще делайте бэкап.",
      infoTitle: "Ваш прогресс",
      info1:
        "Прогресс хранится только на этом устройстве - в этом браузере или в приложении на экране «Домой». В интернете он не сохраняется, поэтому если очистить данные сайта, удалить приложение или перейти на новое устройство, он пропадёт.",
      infoSafari: " Кроме того, Safari удаляет его, если 7 дней не заходить на сайт.",
      info2:
        "Время от времени делайте бэкап. Это небольшой файл, из которого прогресс можно вернуть через Restore - на этом же или на новом устройстве."
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

  /* (i) next to Backup in Settings → "Your progress" window (Home 5.97). Every device, browser and
     Home Screen app alike; the Safari 7-day sentence only where it applies (atRisk). */
  const infoWin = $("backupInfoWindow");
  function renderInfo() {
    const x = t(),
      today = lastDays() === 0;
    $("backupInfoTitle").textContent = x.infoTitle;
    $("backupInfoText").textContent = x.info1 + (atRisk() ? x.infoSafari : "");
    $("backupInfoText2").textContent = x.info2;
    const btn = $("backupInfoSave");
    btn.textContent = today ? x.done : x.btn;
    btn.disabled = today;
  }
  function openInfo() {
    renderInfo();
    infoWin.classList.add("open");
    infoWin.setAttribute("aria-hidden", "false");
  }
  function closeInfo() {
    infoWin.classList.remove("open");
    infoWin.setAttribute("aria-hidden", "true");
  }
  if (infoWin) {
    $("backupInfoOpen")?.addEventListener("click", openInfo);
    $("backupInfoClose")?.addEventListener("click", closeInfo);
    $("backupInfoSave")?.addEventListener("click", () => {
      saveDeutschBackup();
      renderInfo();
      renderBackupNote();
    });
    infoWin.addEventListener("click", e => {
      if (e.target === infoWin) closeInfo();
    });
    document.addEventListener(
      "keydown",
      e => {
        if (e.key === "Escape" && infoWin.classList.contains("open")) {
          e.stopPropagation();
          closeInfo();
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
