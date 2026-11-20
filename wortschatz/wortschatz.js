/* Wortschatz · the page (v2.108; 19.11.2026: the rules moved to wortschatz-rules.js — window.WortschatzRules, also run
   by the native app — this file asks it and draws). Styles: wortschatz.css. Word collection: collection.js +
   collection-window.js. Loaded last, after the components, the collection files and wortschatz-rules.js. */
// App-side keyboard bridge: the reusable component only emits intent.
let ignoreContinueClickUntil = 0;
document.getElementById("continue")?.addEventListener("pointerdown", () => { ignoreContinueClickUntil = 0; }, true);
document.addEventListener("click", e => {
  if (isTouchDevice() && Date.now() < ignoreContinueClickUntil && e.target.closest("#continue")) {
    e.preventDefault(); e.stopImmediatePropagation(); ignoreContinueClickUntil = 0;
  }
}, true);
document.addEventListener("deutsch-keyboard-input", e => {
  const k = e.detail?.key || "",
    input = document.getElementById("answerInput");
  if (!input) return;
  if (k === "BACK") {
    input.value = input.value.slice(0, -1);
    return;
  }
  if (k === "OK") {
    if (input.value.trim()) ignoreContinueClickUntil = Date.now() + 1000;
    check();
    return;
  }
  if (k === "SPACE") {
    if (input.value.length && !input.value.endsWith(" ")) input.value += " ";
    return;
  }
  if (k) input.value += k;
});
function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

document.getElementById("desktopCheck").style.display = isTouchDevice() ? "none" : ""; // Prüfen only without a touch screen

/* Keyboard above the Home button (see the CSS block KEYBOARD ABOVE THE HOME BUTTON): when a long sentence on a
   small screen leaves no room for the keyboard at its place, sentence + translation shrink just enough (down to
   80%). Measured for every card, and again when the screen size changes. */
const SHORT_SCREEN = window.matchMedia("(max-height: 559px), (max-width: 340px) and (max-height: 609px)");
function fitTopZone() {
  const zone = document.querySelector("#question .topZone"),
    kb = document.getElementById("keyboard");
  if (!zone) return;
  zone.style.zoom = "";
  if (!kb || !kb.classList.contains("is-touch") || !kb.classList.contains("show") || SHORT_SCREEN.matches) return;
  if (document.getElementById("study").style.display === "none" || document.getElementById("question").classList.contains("hidden")) return;
  const over = document.documentElement.scrollHeight - innerHeight;
  if (over <= 0) return;
  const h = zone.offsetHeight;
  zone.style.zoom = Math.max(0.8, (h - over) / h).toFixed(3);
}
/* Tablets (03.11.2026, as the exercises): the sentence stands in the middle of the room above the keyboard (CSS
   margin-top: auto); the answer's sentence takes exactly its place and Weiter is pinned at the bottom, where the
   keyboard's last row was (72px above the edge). */
const TABLET = window.matchMedia("(min-width: 700px) and (min-height: 740px)");
let tabletTop = null,
  keyboardBottom = null; // phones (03.11.2026, Alena): Weiter's bottom = the keyboard's bottom — no reaching up, no jumping
function rememberTabletTop() {
  const zone = document.querySelector("#question .topZone"),
    kb = document.getElementById("keyboard");
  if (zone && kb && kb.classList.contains("is-touch") && kb.classList.contains("show") && !document.getElementById("question").classList.contains("hidden")) {
    tabletTop = zone.getBoundingClientRect().top;
    keyboardBottom = kb.getBoundingClientRect().bottom;
  }
}
function placeTabletAnswer() {
  const shell = $("feedbackShell"),
    c = $("continue");
  shell.style.marginTop = "";
  c.style.marginTop = "";
  if (!$("keyboard")?.classList.contains("is-touch") || !$("feedback").classList.contains("show")) return;
  if (TABLET.matches) {
    if (tabletTop == null) return;
    const shift = tabletTop - $("answerTop").getBoundingClientRect().top;
    if (shift > 0) shell.style.marginTop = shift + "px";
  } else if (keyboardBottom == null) return;
  // the shared bottom line (components/deutsch-bottom-v1.js) = where the keyboard ended, on phones and tablets
  DeutschBottom.pin(c, c, { scroller: null });
}
addEventListener("resize", fitTopZone);
addEventListener("resize", rememberTabletTop);
// the answer's Literata loads with the first answer and makes it taller after Weiter was placed: place again
document.fonts?.addEventListener?.("loadingdone", () => { if ($("feedback").classList.contains("show")) fitAnswer(); });
async function loadKeyboardComponent() {
  const mount = document.getElementById("keyboardMount");
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
  const kb = document.getElementById("keyboard");
  window.deutschKeyboardReady = true;
  kb.classList.add("show"); // component itself stays hidden unless it detected a touch device
  fitTopZone();
  rememberTabletTop();
  return true;
}

const $ = id => document.getElementById(id),
  R = window.WortschatzRules; // the rules (wortschatz-rules.js, 19.11.2026): storage, round, checking, texts — the page draws
let current = null; // the card on screen (= R.current())
const NOTIFICATION_SERVER = "https://german-learning-notifications.d45zgw2cgh.workers.dev";
const NOTIFICATION_USER_KEY = "deutschNotificationUserIdV1";
const NOTIFICATION_DEVICE_KEY = "deutschNotificationDeviceIdV1";

function getNotificationUserId() {
  let id = localStorage.getItem(NOTIFICATION_USER_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID ? crypto.randomUUID() : "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    } catch (e) {
      id = "user-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(NOTIFICATION_USER_KEY, id);
  }
  return id;
}

function getNotificationDeviceId() {
  let id = localStorage.getItem(NOTIFICATION_DEVICE_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID ? crypto.randomUUID() : "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    } catch (e) {
      id = "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(NOTIFICATION_DEVICE_KEY, id);
  }
  return id;
}

async function syncNotificationPool(pool) {
  try {
    const response = await fetch(NOTIFICATION_SERVER + "/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getNotificationUserId(),
        deviceId: getNotificationDeviceId(),
        date: pool.date,
        notifications: pool.notifications.map(item => ({
          id: item.id,
          de: item.sentence,
          ru: item.translation
        }))
      })
    });
    if (!response.ok) throw new Error("pool-" + response.status);
    console.log("[German Learning] Notification pool synced:", pool.date);
    return true;
  } catch (e) {
    console.warn("[German Learning] Could not sync notification pool:", e);
    return false;
  }
}

async function publishNotificationDone() {
  const event = R.writeNotificationDone();
  try {
    const response = await fetch(NOTIFICATION_SERVER + "/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getNotificationUserId(),
        deviceId: getNotificationDeviceId(),
        date: event.date
      })
    });
    if (!response.ok) throw new Error("done-" + response.status);
    console.log("[German Learning] DONE synced:", event);
  } catch (e) {
    console.warn("[German Learning] Could not sync DONE event:", e);
  }
  return event;
}
function build(cards = null) {
  R.build(cards);
  render();
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Sentence parts (R.blankParts): the card's text as written + the gap with the punctuation that sticks to it.
function blankHTML(parts) {
  return parts
    .map(p => (p.kind === "blank" ? "<span class='blankGroup'>" + p.before + "<span class='blank' aria-label='fehlendes Wort'></span>" + p.after + "</span>" : p.text))
    .join("");
}
// The answer in the sentence (R.revealParts): the word(s) marked.
function revealHTML(parts) {
  return parts.map(p => (p.kind === "target" ? "<span class='target'>" + esc(p.text) + "</span>" : esc(p.text))).join("");
}
// 👁 (R.ghostParts): the gaps filled faintly; without the hidden words, the gaps as they were.
function ghostHTML(parts) {
  if (parts.some(p => p.kind === "blank")) return blankHTML(parts);
  return parts.map(p => (p.kind === "ghost" ? "<span class='ghost'>" + esc(p.text) + "</span>" : esc(p.text))).join("");
}
// The letter diff (R.diffParts): one span per column.
const DIFF_CLASS = { same: "diffSame", wrong: "diffWrong", missing: "diffMissing", gap: "diffGap" };
function diffHTML(parts) {
  return parts
    .map(p => (p.kind === "absent" ? `<span class="diffWrong" aria-label="fehlender Buchstabe">_</span>` : `<span class="${DIFF_CLASS[p.kind]}">${esc(p.text)}</span>`))
    .join("");
}
function render() {
  const v = R.card();
  if (!v) {
    showDone();
    return;
  }
  current = v.card;
  $("counter").textContent = v.counter;
  $("bar").style.width = `${v.bar}%`;
  $("sentence").innerHTML = blankHTML(v.sentence);
  $("translation").textContent = v.translation;
  $("answerInput").value = "";
  $("answerInput").classList.remove("almost", "nudge");
  $("almostHint").classList.remove("show");
  $("almostHint").textContent = "";
  $("question").classList.remove("hidden");
  setupPeek(v.canPeek);
  $("feedback").className = "feedback";
  $("feedbackShell").className = "feedbackShell";
  $("feedbackShell").style.transform = "";
  $("feedbackShell").style.opacity = "";
  if (window.deutschKeyboardReady) {
    $("keyboard").classList.add("show");
  }
  fitTopZone();
  rememberTabletTop();
  if (innerWidth >= 700) setTimeout(() => $("answerInput").focus(), 30);
}
/* 👁 — first showing of a new word (2026-10-26): try to remember it yourself, or tap the eye and copy it.
   Whether it is offered: R.card().canPeek. */
function setupPeek(can) {
  $("ghostEye").classList.toggle("show", can);
  $("ghostEye").classList.remove("used");
  $("question").classList.toggle("peek", can);
}
$("ghostEye").onclick = e => {
  e.preventDefault();
  if (!current || !$("ghostEye").classList.contains("show")) return;
  const parts = R.peek();
  if (!parts) return;
  $("sentence").innerHTML = ghostHTML(parts);
  $("ghostEye").classList.add("used");
  fitTopZone();
  rememberTabletTop();
  if (innerWidth >= 700) $("answerInput").focus();
};
// The field shakes (red frame); the text stays.
function shakeField() {
  const f = $("answerInput");
  f.classList.add("almost");
  f.classList.remove("nudge");
  void f.offsetWidth;
  f.classList.add("nudge");
}
/* Checking (R.check): "copySlip" — copying after 👁 not yet exact, the field shakes; "caseHint" — «Fast. Nomen
   schreibt man groß.»; "almost" — a typo hint; "neutral" / "good" / "bad" — the answer screen. */
function check() {
  const res = R.check($("answerInput").value);
  if (res.kind === "empty") return;
  if (res.kind === "copySlip") return shakeField();
  if (res.kind === "caseHint" || res.kind === "almost") {
    $("almostHint").textContent = res.hint;
    $("almostHint").classList.add("show");
    shakeField();
    return;
  }
  $("question").classList.add("hidden");
  $("keyboard")?.classList.remove("show");
  $("feedbackShell").className = "feedbackShell show";
  $("feedback").className = "feedback show " + res.kind;
  $("answerSentence").innerHTML = revealHTML(res.answer);
  $("answerTranslation").textContent = res.translation;
  $("typedDiff").innerHTML = res.diff ? diffHTML(res.diff.top) : "";
  $("correctDiff").innerHTML = res.diff ? diffHTML(res.diff.bottom) : "";
  $("base").textContent = res.base;
  $("meaning").textContent = res.meaning;
  drawAuch();
  $("grammar").textContent = res.grammar;
  fitAnswer();
  updateEditButton();
  if (res.kind !== "neutral") placeTabletAnswer(); // ✎ appears with the first answer of a session — Weiter is placed again under it
}
/* ✎ on the answer screen (own words only): edit the card you're looking at (R.applyEditedCard) — the corrected
   text shows at once. Progress is not touched. */
function updateEditButton() {
  const b = $("editCard");
  if (!b) return;
  b.classList.toggle("own", !!(current && window.WortschatzCollectionWindow && String(current.id).charAt(0) === "u"));
}
function applyEditedCard(fresh) {
  if (!R.applyEditedCard(fresh)) return;
  $("answerSentence").innerHTML = revealHTML(R.revealParts(current));
  $("answerTranslation").textContent = getTranslation(current, "sentenceTranslation");
  $("base").textContent = current.base;
  $("meaning").textContent = getTranslation(current, "translation");
  drawAuch();
  $("grammar").textContent = getTranslation(current, "grammar");
  fitAnswer();
}
/* Delete Word from the ✎ window (2026-10-26, R.applyDeletedCard): the session goes on with the next word (or „Fertig
   für heute“); the collection empty → reload („Where do you want to start?“). */
function applyDeletedCard(id) {
  const r = R.applyDeletedCard(id);
  if (!r) return;
  if (r === "empty") {
    location.reload();
    return;
  }
  render();
}
/* „auch: …“ (R.auch): up to 2 other meanings; more → „+N“, a tap shows them all. */
function drawAuch() {
  const box = $("auch");
  if (!box) return;
  box.textContent = "";
  const a = R.auch(current);
  if (!a) return;
  const label = document.createElement("b");
  label.textContent = a.label;
  box.appendChild(label);
  box.appendChild(document.createTextNode(a.shown.join(" · ")));
  if (a.more) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "auchMore";
    more.textContent = "+" + a.more;
    more.setAttribute("aria-label", "Alle Bedeutungen zeigen");
    more.onclick = e => {
      e.stopPropagation();
      box.textContent = "";
      box.appendChild(label);
      box.appendChild(document.createTextNode(a.all.join(" · ")));
    };
    box.appendChild(document.createTextNode(" · "));
    box.appendChild(more);
  }
}
/* Long words (2026-10-26): a word wider than the answer area gets a smaller font instead of running off the edge. */
function fitWide(el, widthOf) {
  if (!el) return;
  el.style.fontSize = "";
  const box = $("feedback").clientWidth,
    w = widthOf(el);
  if (box && w > box) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = Math.max(12, Math.floor((fs * box) / w * 0.97)) + "px";
  }
}
function fitAnswer() {
  if (!$("feedback").classList.contains("show")) return;
  const scroll = el => el.scrollWidth;
  fitWide($("typedDiff"), scroll);
  fitWide($("correctDiff"), scroll);
  fitWide($("answerSentence"), el => Math.max(0, ...[...el.querySelectorAll(".target")].map(t => t.getBoundingClientRect().width)));
  fitWide($("base"), longestWord); // 02.11.2026: a long base form shrinks instead of breaking inside the word
  placeTabletAnswer();
}
// Width of the longest word of an element (it may wrap between words, never inside one).
function longestWord(el) {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit";
  el.appendChild(probe);
  let w = 0;
  for (const word of el.textContent.split(/\s+/)) {
    if (!word) continue;
    probe.textContent = word;
    w = Math.max(w, probe.getBoundingClientRect().width);
  }
  probe.remove();
  return w;
}
addEventListener("resize", fitAnswer);
if ($("editCard"))
  $("editCard").onclick = e => {
    e.stopPropagation();
    if (current) WortschatzCollectionWindow.editInSession(current, applyEditedCard, applyDeletedCard);
  };
/* The round is over (R.done): score, the new-words button and note. */
function showDone() {
  const d = R.done(!!window.WortschatzCollectionWindow);
  if (d.sessionTotal > 0) {
    publishNotificationDone();
    syncNotificationPool(R.prepareTomorrowNotifications());
  }
  $("study").style.display = "none";
  $("done").className = "done show";
  $("counter").textContent = d.counter;
  $("bar").style.width = "100%";
  $("doneScore").textContent = d.score;
  const btn = $("addWords"),
    note = $("allAdded");
  if (d.button) {
    btn.textContent = d.button.text;
    btn.style.display = "block";
  } else btn.style.display = "none";
  note.textContent = d.note;
  note.style.display = d.note ? "block" : "none";
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.refreshButtons(); // started count may have changed
  layoutDone();
}
/* Done screen height (v2.97): from its top down to 28px above the version number, so the buttons sit low
   and the DEINE WÖRTER block is centred between „Fertig für heute.“ and the buttons. */
function layoutDone() {
  const inner = $("doneInner"),
    vm = document.querySelector(".version-mark");
  if (!inner || !$("done").classList.contains("show")) return;
  inner.style.minHeight = "";
  const top = inner.getBoundingClientRect().top,
    vmTop = vm ? vm.getBoundingClientRect().top : innerHeight;
  inner.style.minHeight = Math.max(0, Math.round(vmTop - top - 28)) + "px";
}
addEventListener("resize", layoutDone);
function addFive() {
  const fresh = R.addFive();
  if (!fresh) return;
  $("done").className = "done";
  $("study").style.display = "flex";
  build(fresh);
}
function next() {
  R.next();
  render();
}
$("addWords").onclick = () => {
  if (R.newWordsLeft()) addFive();
  else if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.open();
};
$("desktopCheck").onclick = check;
$("continue").onclick = next;
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || innerWidth < 700) return;
  if (!$("feedback").classList.contains("show")) return;
  e.preventDefault();
  next();
});
$("answerInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    check();
  }
});
/* GERMAN VOICE ONLY (2026-09-27): the voice is chosen by R.pickGermanVoice (best German voice first, see there);
   no German voice → the speaker icon is hidden (body.noGermanVoice) and tapping the sentence does nothing - never a
   wrong-language voice. The voice list can arrive late, so we re-check on voiceschanged and a few times after load. */
let germanVoice = null;
function pickGermanVoice() {
  germanVoice = R.pickGermanVoice("speechSynthesis" in window ? speechSynthesis.getVoices() : []);
  document.body.classList.toggle("noGermanVoice", !germanVoice);
}
pickGermanVoice();
if ("speechSynthesis" in window) {
  speechSynthesis.addEventListener("voiceschanged", pickGermanVoice);
  [500, 1500, 4000].forEach(ms => setTimeout(pickGermanVoice, ms));
}
function speakCurrent() {
  if (!germanVoice) return;
  speechSynthesis.cancel();
  let u = new SpeechSynthesisUtterance(current.revealed);
  u.voice = germanVoice;
  u.lang = germanVoice.lang;
  u.rate = R.VOICE_RATE;
  speechSynthesis.speak(u);
}
$("feedback").addEventListener("click", e => {
  if (e.target.closest("#answerTop,#speakTop")) speakCurrent();
});
/* 04.11 (Alena): on phones (not the short screens, where Home is small at the top) the cassette and ✎ move into
   Home's bottom row: Home left, cassette in the middle (where the exercises have Spickzettel), ✎ right. While you
   type they stay there, very faint, so nothing pops in and out; on the answer they are full and the cassette jumps. */
const PHONE_ROW = window.matchMedia("(max-width: 699px)");
let toolsSpot = null;
function syncTools() {
  const row = $("wsTools");
  if (!row) return;
  const study = $("study").style.display !== "none";
  row.classList.toggle("is-on", study);
  row.classList.toggle("is-answer", study && $("feedbackShell").classList.contains("show"));
}
function placeTools() {
  const row = $("wsTools"), sp = $("speakTop"), ed = $("editCard");
  if (!row || !sp || !ed) return;
  if (!toolsSpot) toolsSpot = { sp: [sp.parentNode, sp.nextSibling], ed: [ed.parentNode, ed.nextSibling] };
  const inRow = PHONE_ROW.matches && !SHORT_SCREEN.matches;
  document.documentElement.classList.toggle("ws-tools-row", inRow);
  if (inRow && sp.parentNode !== row) row.append(sp, ed);
  else if (!inRow && sp.parentNode === row) {
    toolsSpot.sp[0].insertBefore(sp, toolsSpot.sp[1]);
    toolsSpot.ed[0].insertBefore(ed, toolsSpot.ed[1]);
  }
  syncTools();
}
$("wsTools")?.addEventListener("click", e => {
  if (e.target.closest("#speakTop") && $("wsTools").classList.contains("is-answer")) speakCurrent();
});
new MutationObserver(syncTools).observe($("feedbackShell"), { attributes: true, attributeFilter: ["class"] });
new MutationObserver(syncTools).observe($("study"), { attributes: true, attributeFilter: ["style"] });
PHONE_ROW.addEventListener?.("change", placeTools);
SHORT_SCREEN.addEventListener?.("change", placeTools);
placeTools();
/* START SCREEN (2026-09-26): the session no longer starts on load (R.start).
   Cards due -> start screen; Starten -> build(). Nothing due -> straight to "Fertig für heute".
   No words -> the choose screen. The keyboard loads in the background; render() shows it once it's ready. */
const START_ABOUT = {
  text: {
    en: "Helps you remember words in real sentences. Each word comes back just before you'd forget it - and less and less often over time.",
    ru: "Помогает запоминать слова в живых предложениях. Каждое слово возвращается как раз перед тем, как забудется, - и со временем всё реже."
  }
};
$("aboutText").textContent = getTranslation(START_ABOUT, "text");
$("aboutToggle").onclick = () => {
  const a = $("startAbout"),
    open = !a.classList.contains("open");
  a.classList.toggle("open", open);
  $("aboutToggle").setAttribute("aria-expanded", open ? "true" : "false");
};
function showStart() {
  const s = R.start();
  if (s === "choose") return showChoose();
  if (s === "done") {
    build();
    return;
  } // nothing due -> "Fertig für heute" as before
  // v2.102: no „Heute: 12 Karten“ — the session counter shows it once you start
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.refreshButtons(); // „15 / 217 Wörter angefangen“
  $("startNote").textContent = R.startNote();
  $("done").className = "done";
  $("study").style.display = "none";
  $("start").classList.add("show");
  layoutStart();
}
/* Start screen height (v2.96): fill the space down to the „Worum geht's?“ description, so Starten sits low
   and the DEINE WÖRTER block is centred between the title and the buttons (flex + margin:auto). */
function layoutStart() {
  const st = $("choose").classList.contains("show") ? $("choose") : $("start"),
    about = $("startAbout");
  if (!st || !st.classList.contains("show")) return;
  st.style.minHeight = "";
  if (about) about.classList.add("measure"); // measure as if unfolded (v2.105): buttons never move when it opens
  const top = st.getBoundingClientRect().top,
    aboutTop = about ? about.getBoundingClientRect().top : innerHeight;
  if (about) about.classList.remove("measure");
  st.style.minHeight = Math.max(0, Math.round(aboutTop - top - 36)) + "px";
}
addEventListener("resize", layoutStart);
/* CHOOSE SCREEN (2026-10-26): no words yet → word sets (quick start) or own words. Same layout as the start
   screen; the set lines use the start screen's collection-line look (no frames). */
// Choose screen texts (20.11.2026, Alena — variant A): German like the start screen («Wortlisten», «200 Wörter»);
// only the button stays in the user's language (so it is clear what it does). The question «Where do you want to
// start?», «Pick the words you want to learn» and the hint under the button are gone (02.11–19.11).
const CHOOSE_TEXT = {
  chooseOwn: { en: "＋ Start with my own words", ru: "＋ Начать со своих слов" }
};
// 19.11.2026: the button is «Lerntempo» (aria-label in index.html); its icon shows the pace — tortoise / hare (wortschatz.css)
if ($("wsSettings") && window.WortschatzCollection) $("wsSettings").dataset.pace = WortschatzCollection.getPace();
function showChoose() {
  Object.keys(CHOOSE_TEXT).forEach(id => {
    if ($(id)) $(id).textContent = getTranslation(CHOOSE_TEXT, id);
  });
  $("done").className = "done";
  $("study").style.display = "none";
  $("start").classList.remove("show");
  $("choose").classList.add("show");
  if (window.WortschatzCollectionWindow) WortschatzCollectionWindow.fillChoose($("chooseSets"), $("chooseOwn"));
  layoutStart();
}
function startSession() {
  $("start").classList.remove("show");
  $("study").style.display = "flex";
  build();
}
$("startBtn").onclick = startSession;
showStart();
// Desktop: Enter on the start screen = Starten
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && $("start").classList.contains("show") && !$("collModal").classList.contains("open")) {
    e.preventDefault();
    startSession();
  }
});
loadKeyboardComponent().catch(e => console.error(e));

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
document.getElementById("homeBack").onclick = goBackToHome;
