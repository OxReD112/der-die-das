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
  function ask() {
    var q = R.list[R.i], t = q.t;
    $("pCounter").textContent = (R.i + 1) + " / " + R.n;
    $("pBar").style.width = (R.i / R.n * 100) + "%";
    $("pContext").textContent = t.s.particles[t.answer].context || t.s.context; /* the task's own situation if it has one */
    $("pSentence").innerHTML = sentenceHtml(t.s, null);
    var f = FUNCTIONS[t.fn];
    $("pLabel").innerHTML = "<small>" + (lang() === "ru" ? "Что ты хочешь сказать:" : "What you want to say:") + "</small>" + esc(f ? pick(f.label) : t.fn);
    $("pAnswers").innerHTML = q.options.map(function (k) { return '<button class="ans" type="button" data-k="' + k + '">' + esc(k) + "</button>"; }).join("");
    $("pFeedback").classList.add("hidden");
    document.querySelector(".app").scrollTop = 0;
  }
  $("pAnswers").addEventListener("click", function (e) {
    var b = e.target.closest(".ans"); if (!b || b.disabled) return;
    answer(b.dataset.k);
  });
  function answer(k) {
    var q = R.list[R.i], t = q.t, P = t.s.particles, good = t.accept.indexOf(k) >= 0;
    if (good) R.right++; else R.missed.push(t.answer);
    var shown = good ? k : t.answer;
    Array.prototype.forEach.call($("pAnswers").children, function (b) { b.disabled = true; });
    /* the result is in the sentence (as Ortspräpositionen): right → mint; wrong → yours struck through, then the right one */
    $("pSentence").innerHTML = good ? sentenceHtml(t.s, k, "ok") : sentenceHtml(t.s, [k, t.answer], "fixed");
    $("pBar").style.width = ((R.i + 1) / R.n * 100) + "%"; /* the bar grows at the answer, as in every exercise */
    var c = P[shown], L = lang();
    var fb = $("pFeedback"); fb.classList.remove("hidden"); fb.classList.toggle("wrong", !good);
    $("pVerdict").textContent = good ? "Richtig" : "Nicht ganz";
    $("pTranslation").textContent = pick(c.translation);
    var also = t.accept.filter(function (x) { return x !== shown; });
    var extra = [];
    if (L === "ru" && c.hint) extra.push(c.hint);
    if (also.length) extra.push((L === "ru" ? "тоже подходит: " : "also right: ") + also.join(", "));
    $("pAlso").textContent = extra.join(" · ");
    /* the scale: where the right answer sits, and (if wrong but it fits the sentence) where yours landed */
    var track = $("pTrack");
    Array.prototype.slice.call(track.querySelectorAll(".ohne-mark")).forEach(function (e) { e.remove(); });
    var om = document.createElement("div"); om.className = "ohne-mark"; om.style.left = t.s.base.t * 100 + "%"; track.insertBefore(om, $("pMine"));
    $("pOhne").style.left = t.s.base.t * 100 + "%";
    $("pThumb").style.left = c.t * 100 + "%";
    var mine = P[k];
    if (!good && mine && mine.status === "ok") { $("pMine").style.display = ""; $("pMine").style.left = mine.t * 100 + "%"; }
    else $("pMine").style.display = "none";
    /* explanation: why the right one; if wrong, what yours would have meant */
    var note = pick(c.note);
    if (!good) {
      var mf = mine && mine.status === "ok" ? FUNCTIONS[mine.fn] : null;
      note = (mf ? (L === "ru" ? k + " — это «" + pick(mf.label) + "». " : k + " means “" + pick(mf.label) + "”. ")
                 : (mine ? pick(mine.note) + " " : "")) + note;
    }
    $("pNote").textContent = note;
    setTimeout(function () { fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 50);
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
