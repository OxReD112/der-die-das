/* Partikeln — Entdecken (explore). Data: sentences.js (PARTIKELN_SENTENCES / _FUNCTIONS / _PARTICLES).
   Tap a particle: it goes into the gap; translation, function label, tone scale and explanation follow.
   Drag the scale: the particle changes. Swipe the screen or tap the capsule: another sentence type.
   Üben (practice) comes later. */
(function () {
  "use strict";

  var SENTENCES = window.PARTIKELN_SENTENCES || [];
  var FUNCTIONS = window.PARTIKELN_FUNCTIONS || {};
  /* All particles of the database in one fixed order (level, then stressed). Each sentence shows 10 of them:
     every particle that fits, filled up with the most instructive ones that don't (homonym traps first).
     The order on screen is always this order, so the position never gives the answer away. */
  var ORDER = ["doch", "ja", "mal", "denn", "schon", "eigentlich", "halt", "eben", "wohl", "aber", "bloß", "nur",
    "vielleicht", "ruhig", "einfach", "etwa", "eh", "DOCH", "DENN", "JA"];
  var FILL = ["denn", "schon", "mal", "ja", "doch", "aber", "eigentlich", "nur", "vielleicht", "einfach", "eben",
    "etwa", "ruhig", "bloß", "halt", "wohl", "eh"]; /* non-fitting particles worth showing, most instructive first */
  var SHOW = 10;
  var BASE_IDS = ORDER.filter(function (k) { return k !== k.toUpperCase(); });
  var STRESS_OF = { DOCH: "doch", DENN: "denn" };
  var CATS = [{ id: "bitte", de: "Bitte" }, { id: "frage", de: "Frage" }, { id: "aussage", de: "Aussage" }, { id: "ausruf", de: "Ausruf" }];

  var TXT = {
    about: { ru: "Маленькие слова вроде doch, mal, schon почти не переводятся, но меняют тон фразы. Нажимай на частицы и смотри, что происходит с предложением.", en: "Little words like doch, mal and schon barely translate, yet they change the tone of a sentence. Tap a particle and watch what happens." },
    start: { ru: "Нажми на частицу внизу — и смотри, куда сдвинется тон.", en: "Tap a particle below and watch where the tone moves." },
    stressNo: {
      DOCH: { ru: "Ударное DOCH возражает на чужое «нет» или сомнение. В этом предложении спорить не с чем.", en: "Stressed DOCH pushes back against someone's “no” or doubt. There's nothing to push back against here." },
      DENN: { ru: "Ударное DENN бывает только в вопросе после отговорок: «Wo warst du DENN?» — «ну а где же тогда?»", en: "Stressed DENN only occurs in a question after excuses: “Wo warst du DENN?” — “so where were you, then?”" }
    }
  };

  function $(id) { return document.getElementById(id); }
  function pick(v) { return window.DeutschTranslation ? window.DeutschTranslation.pick(v) : (v && (v.ru || v.en)) || ""; }
  function lang() { return window.DeutschTranslation ? window.DeutschTranslation.getLang() : "en"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- data helpers ---------- */
  function cellOf(s, k) {
    var c = s.particles[k];
    if (c) return c;
    if (TXT.stressNo[k]) return { status: "no", note: TXT.stressNo[k] };
    return { status: "no", note: { ru: "Здесь эта частица не встаёт.", en: "This particle doesn't fit here." } };
  }
  function okCount(s) {
    return BASE_IDS.filter(function (k) { return s.particles[k] && s.particles[k].status === "ok"; }).length;
  }
  var byCat = {};
  CATS.forEach(function (c) {
    byCat[c.id] = SENTENCES.filter(function (s) { return s.type === c.id && okCount(s) >= 2; });
  });

  /* ---------- state ---------- */
  var st = { cat: 0, idx: [0, 0, 0, 0], cur: null, prevT: null, tried: {} };
  function sent() { return byCat[CATS[st.cat].id][st.idx[st.cat]]; }

  /* ---------- start ---------- */
  $("aboutText").textContent = pick(TXT.about);
  $("exploreBtn").addEventListener("click", function () {
    $("start").classList.add("hidden");
    $("explore").classList.remove("hidden");
    CATS.forEach(function (c, i) { var n = byCat[c.id].length; st.idx[i] = n ? Math.floor(Math.random() * n) : 0; });
    buildCats(); render(true);
  });
  $("practiceBtn").addEventListener("click", function () { /* Üben: later */ });

  /* ---------- categories ---------- */
  function buildCats() {
    $("cats").innerHTML = CATS.map(function (c, i) {
      return '<button class="cat" role="tab" data-i="' + i + '"' + (byCat[c.id].length ? "" : " disabled") + ">" + c.de + "</button>";
    }).join("");
  }
  function goCat(i) {
    if (i < 0 || i >= CATS.length || i === st.cat) return;
    if (!byCat[CATS[i].id].length) return goCat(i + (i > st.cat ? 1 : -1));
    st.cat = i; st.cur = null; st.prevT = null; render(true);
  }
  $("cats").addEventListener("click", function (e) { var b = e.target.closest(".cat"); if (b && !b.disabled) goCat(+b.dataset.i); });

  /* swipe anywhere on the screen (not on the scale) */
  (function () {
    var sx = null, sy = null;
    var app = document.querySelector(".app");
    app.addEventListener("pointerdown", function (e) {
      if ($("explore").classList.contains("hidden") || e.target.closest(".track")) { sx = null; return; }
      sx = e.clientX; sy = e.clientY;
    });
    app.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) goCat(st.cat + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", function (e) {
      if ($("explore").classList.contains("hidden")) return;
      if (e.key === "ArrowRight") goCat(st.cat + 1);
      if (e.key === "ArrowLeft") goCat(st.cat - 1);
    });
  })();

  /* another example of the same type */
  $("shuffle").addEventListener("click", function () {
    var list = byCat[CATS[st.cat].id]; if (list.length < 2) return;
    var j = (st.idx[st.cat] + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    st.idx[st.cat] = j; st.cur = null; st.prevT = null; render(true);
  });

  /* ---------- choosing ---------- */
  function triedKey() { return sent().id; }
  function currentT() {
    var s = sent();
    if (!st.cur) return s.base.t;
    var c = cellOf(s, st.cur);
    return c.status === "ok" ? c.t : (st.prevT == null ? s.base.t : st.prevT);
  }
  function choose(k) {
    var from = currentT();
    st.cur = st.cur === k ? null : k;
    st.prevT = from;
    if (st.cur) { var tk = triedKey(); (st.tried[tk] = st.tried[tk] || {})[st.cur] = cellOf(sent(), st.cur).status; }
    render(false);
  }

  /* ---------- render ---------- */
  function render(fresh) {
    var s = sent(), k = st.cur, c = k ? cellOf(s, k) : null, L = lang();
    Array.prototype.forEach.call($("cats").children, function (b, i) { b.setAttribute("aria-selected", i === st.cat); });

    $("context").textContent = s.context;
    var parts = s.sentence.split("___");
    var cls = "slot " + (c ? c.status : "empty");
    $("sentence").innerHTML = esc(parts[0]) + '<span class="' + cls + '">' + (k ? esc(k) : "&nbsp;") + "</span>" + esc(parts[1]);

    var ok = c && c.status === "ok";
    var tr = $("translation");
    tr.textContent = pick(ok ? c.translation : s.base.translation);
    tr.classList.toggle("on", !!ok);

    var fn = $("fn"), hint = $("hint");
    if (!c) { fn.textContent = "Ohne Partikel"; fn.className = "fn dim"; hint.textContent = ""; $("note").textContent = TXT.start[L] || TXT.start.en; }
    else if (ok) {
      var f = FUNCTIONS[c.fn]; fn.textContent = f ? pick(f.label) : c.fn; fn.className = "fn";
      hint.textContent = L === "ru" && c.hint ? c.hint : "";
      $("note").textContent = pick(c.note);
    } else {
      fn.textContent = c.status === "odd" ? "Klingt seltsam" : "Passt hier nicht"; fn.className = "fn dim";
      hint.textContent = ""; $("note").textContent = pick(c.note);
    }
    renderScale(fresh);
    renderParticles();
    placeNote();
  }

  function stops() {
    var s = sent(), out = [{ k: null, t: s.base.t }];
    ORDER.forEach(function (k) {
      var c = s.particles[k]; if (c && c.status === "ok") out.push({ k: k, t: c.t });
    });
    return out;
  }
  function renderScale(fresh) {
    var s = sent(), track = $("track");
    Array.prototype.slice.call(track.querySelectorAll(".stop,.ohne-mark")).forEach(function (e) { e.remove(); });
    var om = document.createElement("div"); om.className = "ohne-mark"; om.style.left = s.base.t * 100 + "%"; track.insertBefore(om, $("ghost"));
    stops().forEach(function (p) { if (!p.k) return; var d = document.createElement("div"); d.className = "stop"; d.style.left = p.t * 100 + "%"; track.insertBefore(d, $("ghost")); });
    $("ohneLabel").style.left = s.base.t * 100 + "%";

    var thumb = $("thumb"), ghost = $("ghost"), c = st.cur ? cellOf(s, st.cur) : null;
    var t = currentT();
    thumb.classList.toggle("dim", !!(c && c.status !== "ok"));
    if (fresh) { thumb.style.transition = "none"; ghost.style.transition = "none"; }
    thumb.style.left = t * 100 + "%";
    var showGhost = !fresh && st.prevT != null && Math.abs(st.prevT - t) > 0.01;
    ghost.style.display = showGhost ? "" : "none";
    if (showGhost) ghost.style.left = st.prevT * 100 + "%";
    if (fresh) { void thumb.offsetWidth; thumb.style.transition = ""; ghost.style.transition = ""; }
  }

  function shown(s) {
    if (s._shown) return s._shown;
    var ok = ORDER.filter(function (k) { return s.particles[k] && s.particles[k].status === "ok"; });
    if (ok.length > SHOW) ok = ok.slice(0, SHOW); /* rare: keep the lower levels */
    var pick = ok.slice();
    var rest = FILL.filter(function (k) { return pick.indexOf(k) < 0 && s.particles[k] && s.particles[k].status === "odd"; })
      .concat(FILL.filter(function (k) { return pick.indexOf(k) < 0 && s.particles[k] && s.particles[k].status === "no"; }));
    for (var i = 0; pick.length < SHOW && i < rest.length; i++) if (pick.indexOf(rest[i]) < 0) pick.push(rest[i]);
    s._shown = ORDER.filter(function (k) { return pick.indexOf(k) >= 0; });
    return s._shown;
  }
  /* two rows, split where the longer row is shortest (words like eigentlich / vielleicht are wide) — measured */
  function splitRows(widths) {
    function w(a, b) { var n = 0; for (var i = a; i < b; i++) n += widths[i] + 2; return n; }
    var L = widths.length, best = Math.min(5, L), bestW = Infinity;
    for (var i = 3; i <= 7 && i < L; i++) {
      var m = Math.max(w(0, i), w(i, L));
      if (m < bestW - 0.5 || (Math.abs(m - bestW) <= 0.5 && Math.abs(i - 5) < Math.abs(best - 5))) { bestW = m; best = i; }
    }
    return best;
  }
  function renderParticles() {
    var tried = st.tried[triedKey()] || {};
    var list = shown(sent());
    function html(row) {
      return '<div class="prow">' + row.map(function (k) {
        var cls = "pt" + (tried[k] === "no" ? " tried-no" : tried[k] === "odd" ? " tried-odd" : "");
        return '<button class="' + cls + '" type="button" data-k="' + k + '" aria-pressed="' + (st.cur === k) + '">' + esc(k) + "</button>";
      }).join("") + "</div>";
    }
    var box = $("particles");
    box.innerHTML = html(list); /* one row first, to measure each word */
    var widths = Array.prototype.map.call(box.querySelectorAll(".pt"), function (b) { return b.getBoundingClientRect().width; });
    var room = box.clientWidth - 24, cut = splitRows(widths);
    function w(a, b) { var n = 0; for (var i = a; i < b; i++) n += widths[i] + 2; return n; }
    if (Math.max(w(0, cut), w(cut, widths.length)) <= room) {
      box.innerHTML = html(list.slice(0, cut)) + html(list.slice(cut));
    } else { /* too wide for two rows (several long words): three balanced rows */
      var L = widths.length, bi = 3, bj = 6, bw = Infinity;
      for (var i = 2; i < L - 1; i++) for (var j = i + 1; j < L; j++) {
        var m = Math.max(w(0, i), w(i, j), w(j, L)); if (m < bw) { bw = m; bi = i; bj = j; }
      }
      box.innerHTML = html(list.slice(0, bi)) + html(list.slice(bi, bj)) + html(list.slice(bj));
    }
  }
  $("particles").addEventListener("click", function (e) { var b = e.target.closest(".pt"); if (b) choose(b.dataset.k); });

  /* drag the scale: snaps to the particles that fit (and to „ohne“) */
  (function () {
    var track = $("track"), dragging = false;
    function at(e) { var r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); }
    function nearest(t) { return stops().reduce(function (a, p) { return Math.abs(p.t - t) < Math.abs(a.t - t) ? p : a; }); }
    function apply(p) {
      if (p.k === st.cur) return;
      st.prevT = currentT(); st.cur = p.k;
      if (p.k) { var tk = triedKey(); (st.tried[tk] = st.tried[tk] || {})[p.k] = "ok"; }
      render(false);
    }
    track.addEventListener("pointerdown", function (e) {
      e.preventDefault(); dragging = true; track.setPointerCapture(e.pointerId);
      var t = at(e); apply(nearest(t)); $("thumb").classList.add("dragging"); $("thumb").style.left = t * 100 + "%";
    });
    track.addEventListener("pointermove", function (e) {
      if (!dragging) return; var t = at(e); apply(nearest(t));
      $("thumb").classList.add("dragging"); $("thumb").style.left = t * 100 + "%"; $("ghost").style.display = "none";
    });
    function end() { if (!dragging) return; dragging = false; $("thumb").classList.remove("dragging"); st.prevT = null; renderScale(false); }
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
  })();

  /* The explanation sits in the middle of the empty space between the scale and the particles (Alena 05.11).
     Only when the particles are pinned to the bottom; on short screens it simply follows the scale. */
  function placeNote() {
    var note = $("note"), parts = $("particles"), labels = document.querySelector(".scale-labels");
    note.style.marginTop = "";
    if (getComputedStyle(parts).position !== "fixed") return;
    var top = labels.getBoundingClientRect().bottom, bottom = parts.getBoundingClientRect().top;
    var free = bottom - top - note.offsetHeight;
    note.style.marginTop = Math.max(14, Math.floor(free / 2)) + "px";
  }

  /* fonts arrive late (deutsch-fonts-v1.js sends a resize): measure the rows again */
  window.addEventListener("resize", function () { if (!$("explore").classList.contains("hidden")) { renderParticles(); placeNote(); } });

  window.addEventListener("deutschtranslationchange", function () {
    $("aboutText").textContent = pick(TXT.about);
    if (!$("explore").classList.contains("hidden")) render(true);
  });
})();
