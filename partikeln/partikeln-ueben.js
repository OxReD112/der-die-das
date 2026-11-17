/* Partikeln — Üben (practice). Task = German situation + sentence with a gap + function label → pick the particle.
   Options: the answer, 2 particles that fit the sentence with a clearly DIFFERENT function (closest in tone first)
   and 1 that doesn't fit. Particles with the same function are also right and are never offered as wrong;
   function pairs a blind solver could not tell apart (CONFUSABLE) are never offered together.
   Level (A2 / B1 / B2, remembered): which particles are the answers. Rounds are balanced by particle, not by
   how often a particle occurs in the database. Same logic as db/gen_tasks.py (blind-tested). */
(function () {
  "use strict";

  var SENTENCES = window.PARTIKELN_SENTENCES || [];
  var FUNCTIONS = window.PARTIKELN_FUNCTIONS || {};
  var LEVEL = {};
  "doch ja mal denn schon eigentlich".split(" ").forEach(function (p) { LEVEL[p] = "A2"; });
  "halt eben wohl aber bloß nur vielleicht ruhig einfach".split(" ").forEach(function (p) { LEVEL[p] = "B1"; });
  "etwa eh DOCH DENN JA".split(" ").forEach(function (p) { LEVEL[p] = "B2"; });
  /* answers of a round: mostly the chosen level, some review of the level below — never A2 in a B2 round */
  var MIX = { A2: { A2: 1 }, B1: { B1: 0.7, A2: 0.3 }, B2: { B2: 0.7, B1: 0.3 } };
  var FILL = ["denn", "schon", "mal", "ja", "doch", "aber", "eigentlich", "nur", "vielleicht", "einfach", "eben",
    "etwa", "ruhig", "bloß", "halt", "wohl", "eh"];
  var CONFUSABLE = [
    ["persuade", "reassure"], ["permission", "persuade"], ["permission", "reassure"], ["persuade", "suggest"],
    ["reminder", "shared"], ["warning", "worry"], ["reminder", "warning"], ["reminder", "worry"],
    ["impatience", "pressing"], ["contradict", "reminder"], ["concession", "unexpected"], ["shared", "surprise"],
    ["afterthought", "reminder"], ["afterthought", "warning"], ["appeal", "reminder"], ["appeal", "impatience"],
    ["impatience", "insist"], ["challenge", "pressing"], ["surprise", "suspicion"], ["suggest", "simply"], ["suggest", "justify"], ["shared", "reassure"], ["reassure", "suggest"], ["shared", "contradict"], ["challenge", "interest"], ["challenge", "suspicion"], ["recall", "interest"], ["unexpected", "cheer"], ["unexpected", "reminder"], ["unexpected", "suppose"], ["exclaim", "surprise"], ["cheer", "indifference"], ["reassure", "indifference"], ["shared", "indifference"], ["unexpected", "surprise"], ["explain", "justify"], ["suggest", "permission"], ["rhetorical", "challenge"], ["concession", "challenge"], ["reassure", "casual"], ["exclaim", "concession"]
  ].map(function (p) { return p.slice().sort().join("|"); });
  function clash(a, b) { return a === b || CONFUSABLE.indexOf([a, b].sort().join("|")) >= 0; }

  var LV_KEY = "partikelnLevelV1";
  function $(id) { return document.getElementById(id); }
  function pick(v) { return window.DeutschTranslation ? window.DeutschTranslation.pick(v) : (v && (v.ru || v.en)) || ""; }
  function lang() { return window.DeutschTranslation ? window.DeutschTranslation.getLang() : "en"; }
  function tx(en, ru) { return window.DeutschTranslation ? window.DeutschTranslation.t.apply(null, arguments) : (lang() === "ru" ? ru : en); }
  /* the Russian hint of a particle (c.hint): shown in Russian; a language pack may give its own
     (exercises/partikeln__hints.json, keyed by the Russian text, or by text + particle k when one text stands at several particles, 17.11.2026); English has none */
  function hintOf(h, k) { var D = window.DeutschTranslation; return !h ? "" : D ? (D.tAt ? D.tAt(k, "", h) : D.t("", h)) : (lang() === "ru" ? h : ""); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function show(id) { ["start", "explore", "pStart", "pGame", "pDone"].forEach(function (x) { $(x).classList.toggle("hidden", x !== id); }); $("startAbout").style.display = id === "start" ? "" : "none"; }

  /* ---------- tasks from the database ---------- */
  function buildTasks() {
    var out = [];
    SENTENCES.forEach(function (s) {
      var P = s.particles, ok = Object.keys(P).filter(function (k) { return P[k].status === "ok"; });
      ok.forEach(function (k) {
        var c = P[k];
        if (c.practice === false) return; /* blind solvers found it ambiguous: shown in Entdecken only */
        var accept = ok.filter(function (x) { return P[x].fn === c.fn; });
        var others = ok.filter(function (x) { return !clash(P[x].fn, c.fn); })
          .sort(function (a, b) { return Math.abs(P[a].t - c.t) - Math.abs(P[b].t - c.t); });
        /* a "doesn't fit" filler must not be the unstressed twin of a stressed form that fits (ja / JA …) */
        var TWIN = { ja: "JA", doch: "DOCH", denn: "DENN" };
        function twinOk(x) { return TWIN[x] && P[TWIN[x]] && P[TWIN[x]].status === "ok"; }
        var bad = FILL.filter(function (x) { return P[x] && P[x].status === "no" && !twinOk(x); })
          .concat(FILL.filter(function (x) { return P[x] && P[x].status === "odd" && !twinOk(x); }));
        var wrong = others.slice(0, 2);
        if (bad.length) wrong.push(bad[0]);
        for (var i = 2; wrong.length < 3 && i < others.length; i++) wrong.push(others[i]);
        for (var j = 1; wrong.length < 3 && j < bad.length; j++) if (wrong.indexOf(bad[j]) < 0) wrong.push(bad[j]);
        out.push({ s: s, answer: k, accept: accept, fn: c.fn, level: LEVEL[k], wrong: wrong });
      });
    });
    return out;
  }
  var TASKS = buildTasks();

  function makeRound(level, n) {
    var mix = MIX[level], byParticle = {};
    TASKS.forEach(function (t) { if (mix[t.level]) (byParticle[t.answer] = byParticle[t.answer] || []).push(t); });
    var round = [], usedSentence = {};
    for (var guard = 0; round.length < n && guard < n * 50; guard++) {
      /* level by weight, then a particle of that level uniformly, then one of its tasks */
      var r = Math.random(), lv = null, acc = 0;
      Object.keys(mix).forEach(function (l) { acc += mix[l]; if (lv === null && r <= acc) lv = l; });
      var parts = Object.keys(byParticle).filter(function (p) { return LEVEL[p] === lv; });
      if (!parts.length) continue;
      var p = parts[Math.floor(Math.random() * parts.length)];
      var list = byParticle[p].filter(function (t) { return !usedSentence[t.s.id]; });
      if (!list.length) continue;
      var t = list[Math.floor(Math.random() * list.length)];
      usedSentence[t.s.id] = true;
      round.push({ t: t, options: shuffle([t.answer].concat(t.wrong)) });
    }
    return round;
  }

  /* ---------- start ---------- */
  var level = "A2";
  try { level = localStorage.getItem(LV_KEY) || "A2"; } catch (e) {}
  function paintLevels() { Array.prototype.forEach.call($("levels").children, function (b) { b.setAttribute("aria-selected", b.dataset.lv === level); }); }
  $("levels").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    level = b.dataset.lv; try { localStorage.setItem(LV_KEY, level); } catch (e2) {}
    paintLevels();
  });
  $("practiceBtn").addEventListener("click", function () { paintLevels(); show("pStart"); });
  $("exploreBtn").addEventListener("click", function () { show("explore"); });
  Array.prototype.forEach.call(document.querySelectorAll("#pStart .size"), function (b) {
    b.addEventListener("click", function () { startRound(+b.dataset.n); });
  });

  /* ---------- round ---------- */
  var R = null;
  function startRound(n) {
    R = { n: n, i: 0, list: makeRound(level, n), right: 0, missed: [] };
    R.n = R.list.length;
    show("pGame"); ask();
  }
  function sentenceHtml(s, k, cls) {
    var parts = s.sentence.split("___");
    var inner = !k ? "&nbsp;" : cls === "fixed" ? '<span class="wrong">' + esc(k[0]) + '</span><span class="right">' + esc(k[1]) + "</span>" : esc(k);
    return esc(parts[0]) + '<span class="slot ' + (k ? cls : "empty") + '">' + inner + "</span>" + esc(parts[1]);
  }
  /* the tone scale is part of the task (Alena 05.11): shown with the question, at the same place in the answer */
  /* (variant A: under „What you want to say“ — the scale reads with the label; it moves only with the sentence's length) */
  function paintScale(t, shownKey, yourKey) {
    var P = t.s.particles, track = $("pTrack");
    Array.prototype.slice.call(track.querySelectorAll(".ohne-mark")).forEach(function (e) { e.remove(); });
    var om = document.createElement("div"); om.className = "ohne-mark"; om.style.left = t.s.base.t * 100 + "%"; track.insertBefore(om, $("pMine"));
    $("pOhne").style.left = t.s.base.t * 100 + "%";
    $("pThumb").style.left = P[shownKey].t * 100 + "%";
    var mine = yourKey && P[yourKey];
    if (mine && mine.status === "ok" && yourKey !== shownKey) { $("pMine").style.display = ""; $("pMine").style.left = mine.t * 100 + "%"; }
    else $("pMine").style.display = "none";
  }
  /* The sentence keeps its height from question to answer, so the scale under it never moves within a task: R.hold is
     the tallest way the answer can fill the gap (right → one word, wrong → struck-through + right); whatever the
     sentence lacks of it goes ABOVE the sentence (padding-top), under the situation. */
  function measureHold() {
    var q = R && R.list[R.i], el = $("pSentence");
    R.hold = 0;
    if (!q || !el.offsetWidth) return;
    var probe = el.cloneNode(false);
    probe.removeAttribute("id");
    probe.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;padding:0;width:" + el.clientWidth + "px" +
      (el.style.fontSize ? ";font-size:" + el.style.fontSize : ""); /* a fitted (smaller) question, see fitQuestion */
    el.parentNode.appendChild(probe);
    q.options.forEach(function (k) {
      probe.innerHTML = q.t.accept.indexOf(k) >= 0 ? sentenceHtml(q.t.s, k, "ok") : sentenceHtml(q.t.s, [k, q.t.answer], "fixed");
      R.hold = Math.max(R.hold, probe.getBoundingClientRect().height);
    });
    probe.remove();
    /* 16.11.2026 (Alena, evening): on a phone the sentence always has (at least) its two lines, so the blocks below
       keep their place from task to task */
    if (window.matchMedia("(max-width: 699.98px)").matches || TABLET.matches) R.hold = Math.max(R.hold, slotHeight(el)); /* tablets too (17.11) */
  }
  // two lines at the sentence's own size (not the fitted one), so the block is the same for every task
  function slotHeight(el) {
    var cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    var keep = el.style.fontSize; el.style.fontSize = ""; var base = parseFloat(getComputedStyle(el).fontSize); el.style.fontSize = keep;
    return Math.ceil(2 * lh * base);
  }
  /* phones (Alena 16.11, evening): a shorter sentence stands in the MIDDLE of its two-line place, not at its bottom */
  function holdSentence() {
    var el = $("pSentence");
    el.style.paddingTop = el.style.paddingBottom = "";
    if (!R || !R.hold) return;
    var free = Math.max(0, R.hold - el.getBoundingClientRect().height); /* exact (no 1 px jumps) */
    if (!window.matchMedia("(max-width: 699.98px)").matches && !TABLET.matches) { el.style.paddingTop = free + "px"; return; }
    el.style.paddingTop = free / 2 + "px"; el.style.paddingBottom = free / 2 + "px";
  }
  window.addEventListener("resize", function () {
    if (!R || $("pGame").classList.contains("hidden")) return;
    requestAnimationFrame(function () {
      if ($("pFeedback").classList.contains("hidden")) { fitQuestion(); showQuestion(); placeBottom(); return; } /* question: fit again */
      $("pSentence").style.paddingTop = $("pSentence").style.paddingBottom = ""; measureHold(); holdSentence();
    });
  });
  function ask() {
    var q = R.list[R.i], t = q.t;
    $("pCounter").textContent = (R.i + 1) + " / " + R.n;
    $("pBar").style.width = (R.i / R.n * 100) + "%";
    $("pContext").textContent = t.s.particles[t.answer].context || t.s.context; /* the task's own situation if it has one */
    $("pSentence").innerHTML = sentenceHtml(t.s, null);
    var f = FUNCTIONS[t.fn];
    $("pLabel").innerHTML = "<small>" + tx("What you want to say:", "Что ты хочешь сказать:") + "</small>" + esc(f ? pick(f.label) : t.fn);
    $("pAnswers").innerHTML = q.options.map(function (k) { return '<button class="ans" type="button" data-k="' + k + '">' + esc(k) + "</button>"; }).join("");
    fitQuestion();
    showQuestion();
    $("pThumb").style.transition = "none"; paintScale(t, t.answer, null); $("pThumb").offsetWidth; $("pThumb").style.transition = "";
    document.querySelector(".app").scrollTop = 0;
    placeBottom();
  }
  function showQuestion() {
    var t = R.list[R.i].t;
    $("pSentence").innerHTML = sentenceHtml(t.s, null);
    $("pSentence").style.paddingTop = $("pSentence").style.paddingBottom = ""; measureHold(); holdSentence();
    $("pFeedback").classList.add("hidden");
    $("pContinue").classList.add("hidden");
    $("pAnswers").classList.remove("hidden");
  }
  /* 16.11.2026 (Alena): on a phone the answer with its explanation and Weiter must fit on the screen — no scrolling.
     Before the question is shown, every possible answer is tried in place (the longest explanation counts); if Weiter
     would end below the bottom line, the question is set smaller, 1 px at a time, down to 80 % (the shared rule, as in
     Pronomen / Verbformen). The size is chosen once per task, so nothing jumps at the answer. Measured on the phone
     itself, so its own fonts count. Only where the buttons are pinned (touch, not short screens; not tablets). If even
     80 % is not enough, DeutschBottom.fitScroll is the last way out (placeBottom). */
  function fitQuestion() {
    var el = $("pSentence"), q = R.list[R.i];
    el.style.fontSize = "";
    document.querySelector(".app").scrollTop = 0;
    R.top = 0;
    if (!window.DeutschBottom.active()) return;
    if (TABLET.matches) { placeTask(); return; }
    var base = parseFloat(getComputedStyle(el).fontSize), size = base, min = base * 0.8;
    function over() {
      var worst = -Infinity, c = $("pContinue");
      measureHold();
      worst = R.hold - slotHeight(el) - 1; /* the sentence within its two lines (evening 16.11) */
      q.options.forEach(function (k) {
        fillAnswer(k);
        c.style.marginTop = "";
        worst = Math.max(worst, c.getBoundingClientRect().bottom - window.DeutschBottom.line());
      });
      return worst;
    }
    while (over() > 0 && size > min) { size = Math.max(min, size - 1); el.style.fontSize = size + "px"; }
  }
  /* Tablets (17.11.2026, Alena: «задание не к самому верху, чуть пониже»): the task stands a little lower — 40 % of
     the room left between the top bar and Weiter (with the answer and its explanation in place) goes above it. Every
     block has a fixed height (partikeln.css, «TABLETS»), so this is the same for every task: nothing moves. */
  function placeTask() {
    var body = $("pBody"), q = R.list[R.i], end = 0;
    body.style.paddingTop = "";
    measureHold();
    q.options.forEach(function (k) { fillAnswer(k); end = Math.max(end, $("pFeedback").getBoundingClientRect().bottom); });
    var room = window.DeutschBottom.line() - $("pContinue").offsetHeight - 24 - end;
    R.top = Math.max(0, Math.round(room * 0.4));
  }
  /* Phones (Alena 05.11, as Ortspräpositionen): the answer buttons — and after the answer Weiter — end on the shared
     bottom line (components/deutsch-bottom-v1.js: where the keyboard ends in the typing exercises). Only free room is
     used: never makes the page scroll. Touch screens only, not short ones (the shared rule in that file). Tablets the
     same since 17.11.2026. */
  var TABLET = window.matchMedia("(min-width: 700px) and (min-height: 740px)");
  function placeBottom() {
    var done = !$("pFeedback").classList.contains("hidden");
    var el = done ? $("pContinue") : $("pAnswers");
    el.style.marginTop = "";
    window.DeutschBottom.fitScroll($("pGame"), null); $("pBody").scrollTop = 0;
    $("pBody").style.paddingTop = R && R.top ? R.top + "px" : "";
    if ($("pGame").classList.contains("hidden")) return;
    window.DeutschBottom.pin(el); /* tablets too since 17.11 (Alena: the particles at the bottom, on the line of every exercise) */
    /* the last way out (16.11): the answer does not fit even with the smaller question — only the task scrolls */
    if (done && window.DeutschBottom.fitScroll($("pGame"), $("pBody"), { button: el })) el.style.marginTop = "";
  }
  window.addEventListener("resize", function () { requestAnimationFrame(placeBottom); });
  $("pAnswers").addEventListener("click", function (e) {
    var b = e.target.closest(".ans"); if (!b || b.disabled) return;
    answer(b.dataset.k);
  });
  function answer(k) {
    var q = R.list[R.i], t = q.t, good = t.accept.indexOf(k) >= 0;
    if (good) R.right++; else R.missed.push(t.answer);
    var shown = good ? k : t.answer;
    Array.prototype.forEach.call($("pAnswers").children, function (b) { b.disabled = true; });
    fillAnswer(k);
    $("pBar").style.width = ((R.i + 1) / R.n * 100) + "%"; /* the bar grows at the answer, as in every exercise */
    /* the scale (already shown with the task): where the right answer sits, and (if wrong but it fits the sentence)
       where yours landed */
    paintScale(t, shown, good ? null : k);
    placeBottom();
  }
  /* the answer screen for answer k (also used by fitQuestion to try every answer): the result in the sentence, verdict,
     translation, «also right», the explanation; the answer buttons go, Weiter comes */
  function fillAnswer(k) {
    var q = R.list[R.i], t = q.t, P = t.s.particles, good = t.accept.indexOf(k) >= 0;
    var shown = good ? k : t.answer;
    $("pAnswers").classList.add("hidden"); /* the answer takes their room (Alena 05.11) */
    $("pContinue").classList.remove("hidden");
    /* the result is in the sentence (as Ortspräpositionen): right → mint; wrong → yours struck through, then the right one */
    $("pSentence").innerHTML = good ? sentenceHtml(t.s, k, "ok") : sentenceHtml(t.s, [k, t.answer], "fixed");
    holdSentence(); /* same height as in the question: the scale stays put */
    var c = P[shown], L = lang();
    var fb = $("pFeedback"); fb.classList.remove("hidden"); fb.classList.toggle("wrong", !good);
    $("pVerdict").textContent = good ? "Richtig" : "Nicht ganz";
    $("pTranslation").textContent = pick(c.translation);
    var also = t.accept.filter(function (x) { return x !== shown; });
    var extra = [];
    if (hintOf(c.hint, shown)) extra.push(hintOf(c.hint, shown));
    if (also.length) extra.push(tx("also right: ", "тоже подходит: ") + also.join(", "));
    $("pAlso").textContent = extra.join(" · ");
    var mine = P[k];
    /* explanation: why the right one; if wrong, what yours would have meant */
    var note = pick(c.note);
    if (!good) {
      var mf = mine && mine.status === "ok" ? FUNCTIONS[mine.fn] : null;
      note = (mf ? tx("{0} means “{1}”. ", "{0} — это «{1}». ", k, pick(mf.label))
                 : (mine ? pick(mine.note) + " " : "")) + note;
    }
    $("pNote").textContent = note;
  }
  $("pContinue").addEventListener("click", function () {
    R.i++;
    if (R.i < R.n) ask(); else done();
  });

  function done() {
    $("pBar").style.width = "100%";
    $("pScore").textContent = R.right + " / " + R.n;
    $("pDoneNote").textContent = window.DeutschEnd ? window.DeutschEnd.note(R.right, R.n) : "";
    var seen = {}, weak = R.missed.filter(function (p) { if (seen[p]) return false; seen[p] = true; return true; });
    if (window.DeutschEnd) window.DeutschEnd.list($("pWeak"), weak);
    show("pDone");
  }
  $("pAgain").addEventListener("click", function () { paintLevels(); show("pStart"); });
  /* „Zur Startseite“ = back to Home, as in every exercise (inside the app Home hides it: its round button does this) */
  $("homeBack").addEventListener("click", function () {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.closeApp === "function") { window.parent.closeApp(); return; }
    } catch (e) {}
    show("start");
  });
  /* ways back inside the chapter */
  $("exploreTitle").addEventListener("click", function () { show("start"); });
  $("toUeben").addEventListener("click", function () { paintLevels(); show("pStart"); });


  window.PartikelnUeben = { tasks: TASKS, makeRound: makeRound }; /* for checks */
})();
