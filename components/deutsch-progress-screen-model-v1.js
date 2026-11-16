/* Deutsch · numbers of the «Fortschritt» window — v1 (16.11.2026)
   Everything the «Fortschritt» window shows that is counted: the grammar line (whole and per chapter / exercise,
   now and 3 weeks ago, one point per day), «+N Sachen sitzen jetzt», the lists «Neu gelernt» / «Noch üben» and the
   Wortschatz bar. Rules only — no page (DOM) here, so the native app runs this very file as it is (JavaScriptCore).
   progress-screen.js only draws. Until 16.11 this was buildModel() inside progress-screen.js; the numbers are
   unchanged (dev/components-tests/progress-model-equivalence.cjs: old code against this file).

   Needs DeutschDay (components/deutsch-day-v1.js) for the day keys.

     DeutschProgressScreenModel.read(storage)       → { progress, snapshots, profile } from localStorage (or any object
                                                       with getItem); unreadable parts are null
     DeutschProgressScreenModel.build(data, today)  → the model (below); `today` is a day key "YYYY-MM-DD"
     DeutschProgressScreenModel.delta(o)            → whole-percent change of a chapter / exercise (now − 3 weeks ago)
     DeutschProgressScreenModel.isDown(o)           → it went down (shown grey, never red)
     DeutschProgressScreenModel.chapterKnown(c)     → a chapter has at least one exercise practised
     DeutschProgressScreenModel.lists(o)            → { learned:[labels], practice:[labels] } — newest first / most to
                                                       practise first, at most LIST_MAX each
     DeutschProgressScreenModel.hasGraph(o)         → enough days for the little graph
     DeutschProgressScreenModel.wordBar(words)      → the Wortschatz bar in % of started words:
                                                       { started:{left,width}, sitzt, learned }
     DeutschProgressScreenModel.WINDOW_DAYS (21), LIST_MAX (3), MIN_GRAPH_POINTS (4), KEYS, CHAPTERS, NAMES

   The model:
     { sinceStart,          no snapshot 21+ days old yet → compared with 0 % («Seit Start»), else «In 3 Wochen»
       gNow, gThen, gSeries grammar line: Σ sicher ÷ Σ total of all practised exercises, % (not rounded)
       learned,             «+N Sachen sitzen jetzt»: items that became sure in the last 3 weeks (all exercises)
       chapters: [{ name, now, then, series, recent, practice,
                    single: exercise | null, subs: [exercise] | null }]
                 exercise = { id, name, known, s, t, now, then, series, recent, practice }
       words: { total, started, sitzt, learned, collection } | null,
       name }               the name for «…, du machst das gut» */
(function (root) {
  "use strict";

  const KEYS = Object.freeze({ progress: "deutschProgressV1", snapshots: "deutschProgressSnapshotsV1", profile: "deutschProfileV1" });
  const WINDOW_DAYS = 21, LIST_MAX = 3, MIN_GRAPH_POINTS = 4; // graph only once there are 3+ days of history
  const NAMES = Object.freeze({ artikel: "Artikel", partizipII: "Partizip II", modalverben: "Modalverben", vielseitigeVerben: "Vielseitige Verben",
    pronomen: "Pronomen", festerKasus: "Fester Kasus", verbenMitPraepositionen: "Verben mit Präpositionen", ortspraepositionen: "Ortspräpositionen" });
  const CHAPTERS = Object.freeze([
    { name: "Artikel", ex: ["artikel"] },
    { name: "Verbformen", ex: ["partizipII", "modalverben", "vielseitigeVerben"] },
    { name: "Pronomen", ex: ["pronomen"] },
    { name: "Präpositionen", ex: ["festerKasus", "verbenMitPraepositionen", "ortspraepositionen"] }
  ]);
  const GRAMMAR = CHAPTERS.flatMap(c => c.ex);
  const pct = (s, t) => t > 0 ? s / t * 100 : 0;
  const round = x => Math.round(x);

  function read(storage) {
    const get = key => { try { return JSON.parse(storage.getItem(key) || "null"); } catch (e) { return null; } };
    return { progress: get(KEYS.progress), snapshots: get(KEYS.snapshots), profile: get(KEYS.profile) };
  }

  function build(data, today) {
    const Day = root.DeutschDay;
    const prog = data && data.progress, ex = (prog && prog.exercises) || {};
    const snapStore = data && data.snapshots, snaps = (snapStore && snapStore.days) || {};
    const days = Object.keys(snaps).sort();
    const target = Day.add(today, -WINDOW_DAYS);
    const older = days.filter(d => d <= target);
    const sinceStart = !older.length;
    const baseDay = sinceStart ? null : older[older.length - 1];
    const startDay = sinceStart ? (days[0] || today) : baseDay;

    // value of one exercise on a given day (last snapshot on or before that day)
    function snapAt(id, day) {
      for (let i = days.length - 1; i >= 0; i--) { if (days[i] <= day && snaps[days[i]][id]) return snaps[days[i]][id]; }
      return null;
    }
    const E = {};
    GRAMMAR.forEach(id => {
      const sm = ex[id] && ex[id].summary;
      const t = sm && Number(sm.total) > 0 ? Number(sm.total) : 0, s = sm ? Number(sm.sicher) || 0 : 0;
      const base = sinceStart ? null : snapAt(id, baseDay);
      const now = pct(s, t), then = base ? pct(base.s, base.t) : 0;
      // series: one point per day from startDay to today (today = live value)
      const series = [];
      if (sinceStart) series.push(0);
      for (let d = startDay; d < today; d = Day.add(d, 1)) { const v = snapAt(id, d); series.push(v ? pct(v.s, v.t) : 0); }
      series.push(now);
      E[id] = { id, name: NAMES[id], known: t > 0, s, t, now, then, series,
        recent: (sm && Array.isArray(sm.recent)) ? sm.recent : [],
        practice: (sm && Array.isArray(sm.practice)) ? sm.practice : [] };
    });
    const chapters = CHAPTERS.map(c => {
      const list = c.ex.map(id => E[id]);
      const avg = f => list.reduce((a, e) => a + f(e), 0) / list.length;
      const series = list[0].series.map((_, i) => avg(e => e.series[i] ?? e.now));
      return { name: c.name, subs: c.ex.length > 1 ? list : null, single: c.ex.length === 1 ? list[0] : null,
        now: avg(e => e.now), then: avg(e => e.then), series, recent: list.flatMap(e => e.recent), practice: list.flatMap(e => e.practice) };
    });
    // grammar line: Σ sicher ÷ Σ total (weighted), per day
    function grammarAt(day) { let s = 0, t = 0; GRAMMAR.forEach(id => { const v = snapAt(id, day); if (v) { s += v.s; t += v.t; } }); return pct(s, t); }
    let ls = 0, lt = 0; GRAMMAR.forEach(id => { if (E[id].known) { ls += E[id].s; lt += E[id].t; } });
    const gNow = pct(ls, lt), gThen = sinceStart ? 0 : grammarAt(baseDay);
    const gSeries = []; if (sinceStart) gSeries.push(0);
    for (let d = startDay; d < today; d = Day.add(d, 1)) gSeries.push(grammarAt(d));
    gSeries.push(gNow);
    const learned = GRAMMAR.reduce((a, id) => a + E[id].recent.length, 0);
    const ws = ex.wortschatz && ex.wortschatz.summary;
    const profile = data && data.profile;
    return { sinceStart, chapters, gNow, gThen, gSeries, learned,
      words: ws ? { total: Number(ws.total) || 0, started: Number(ws.started) || 0, sitzt: Number(ws.sitzt) || 0, learned: Number(ws.learned) || 0,
        collection: typeof ws.collection === "string" ? ws.collection.trim().slice(0, 40) : "" } : null,
      name: profile && typeof profile.name === "string" ? profile.name.trim().slice(0, 20) : "" };
  }

  const delta = o => round(o.now) - round(o.then);
  const isDown = o => round(o.now) < round(o.then);
  const chapterKnown = c => c.subs ? c.subs.some(e => e.known) : c.single.known;
  const hasGraph = o => o.series.length >= MIN_GRAPH_POINTS;

  // «Neu gelernt»: newest first; «Noch üben»: most to practise first, then newest
  function lists(o) {
    const learned = [...o.recent].sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
    const practice = [...o.practice].sort((a, b) => b.w - a.w || (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
    return { learned: learned.slice(0, LIST_MAX).map(r => r.l), practice: practice.slice(0, LIST_MAX).map(r => r.l) };
  }

  // Wortschatz (v18): the whole bar = started words; layers sitzt (level 3+) and gelernt (level 6); grey = not sitting yet
  function wordBar(W) {
    const S = W.started || 1, sz = W.sitzt / S * 100;
    return { started: { left: sz, width: W.started ? 100 - sz : 0 }, sitzt: W.sitzt / S * 100, learned: W.learned / S * 100 };
  }

  root.DeutschProgressScreenModel = Object.freeze({ KEYS, WINDOW_DAYS, LIST_MAX, MIN_GRAPH_POINTS, NAMES, CHAPTERS,
    read, build, delta, isDown, chapterKnown, lists, hasGraph, wordBar });
})(typeof window !== "undefined" ? window : globalThis);
