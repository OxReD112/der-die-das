/* Deutsch · score of the day — v1 (15.11.2026)
   The one place that counts the answers of the day (localStorage "deutschDailyStatsV1") and turns them into Home's
   points: «Heute», the tile statuses «3 / 10» and the daily limit. Rules only — no page (DOM) here, so the native
   app runs this very file as it is (JavaScriptCore). Before 15.11 the same code lived in five exercises and in Home.

   Needs DeutschDay (components/deutsch-day-v1.js) for today's key.

     DeutschDaily.record(exercise, ok)          → adds one answer of the day for the exercise (an exercise page, or
                                                   Home for the Verbformen answers it gets by message)
     DeutschDaily.add(data, today, exercise, ok) → the same on a plain object: returns the day's object (pure)
     DeutschDaily.tally(data, today, vocabDone)  → { tiles:{artikel, verbformen, pronomen, praepositionen},
                                                   exercisePoints, vocabPoints, points }
     DeutschDaily.limitReached(points, vocabDone, limitOn) → the daily limit («hard stop») is on
     DeutschDaily.GOAL (10 answers per tile), VOCAB_POINTS (60), LIMIT_POINTS (150), KEY

   How each exercise is stored (as it always was — Home reads exactly this):
     artikel, festerKasus, ortspraepositionen, verbenMitPraepositionen → { answers, correct }
     pronomen → a number (answers only)
     partizipII, modalverben, vielseitigeVerben → verbformen: { partizipII, modalverben, vielseitigeVerben } (numbers)
   Partikeln is not counted in «Heute» — on purpose (Alena 15.11.2026).
   Unreadable saved data: Pronomen and the Verbformen answers start the day anew; the four others skip the answer —
   as before 15.11 (kept on purpose: the score must not change; to unify later if Alena wants). */
(function (root) {
  "use strict";

  const KEY = "deutschDailyStatsV1";
  const GOAL = 10;
  const VOCAB_POINTS = 60;
  const LIMIT_POINTS = 150;
  const VERBFORMEN = ["partizipII", "modalverben", "vielseitigeVerben"];
  const PRAEPOSITIONEN = ["festerKasus", "verbenMitPraepositionen", "ortspraepositionen"];
  const STARTS_ANEW_ON_BAD_DATA = new Set(["pronomen", ...VERBFORMEN]);

  // one answer more for the exercise; `data` is the saved day (any shape), the result is the day to save
  function add(data, today, exercise, ok) {
    const day = data && typeof data === "object" && data.date === today ? data : { date: today };
    if (exercise === "pronomen") {
      day.pronomen = Number(day.pronomen || 0) + 1;
    } else if (VERBFORMEN.includes(exercise)) {
      day.verbformen ||= {};
      day.verbformen[exercise] = (Number(day.verbformen[exercise]) || 0) + 1;
    } else {
      if (!day[exercise]) day[exercise] = { answers: 0, correct: 0 };
      day[exercise].answers++;
      if (ok) day[exercise].correct++;
    }
    return day;
  }

  function record(exercise, ok, storage = root.localStorage) {
    let data;
    try {
      data = JSON.parse(storage.getItem(KEY) || "{}");
    } catch (e) {
      if (!STARTS_ANEW_ON_BAD_DATA.has(exercise)) return;
      data = {};
    }
    try {
      storage.setItem(KEY, JSON.stringify(add(data, root.DeutschDay.key(), exercise, ok)));
    } catch (e) {}
  }

  function answers(value) {
    if (value && typeof value === "object") return Math.max(0, Number(value.answers) || 0);
    return Math.max(0, Number(value) || 0);
  }

  // Home's numbers for the day: answers per tile, points (1 per answer, 60 for Wortschatz done)
  function tally(data, today, vocabDone) {
    const day = data && data.date === today ? data : {};
    const verbformen = VERBFORMEN.reduce((sum, key) => sum + (Number(day.verbformen?.[key]) || 0), 0);
    const tiles = {
      artikel: answers(day.artikel),
      verbformen,
      pronomen: answers(day.pronomen),
      praepositionen: PRAEPOSITIONEN.reduce((sum, key) => sum + answers(day[key]), 0)
    };
    const exercisePoints = tiles.artikel + tiles.verbformen + tiles.pronomen + tiles.praepositionen;
    const vocabPoints = vocabDone ? VOCAB_POINTS : 0;
    return { tiles, exercisePoints, vocabPoints, points: exercisePoints + vocabPoints };
  }

  const limitReached = (points, vocabDone, limitOn) => !!(limitOn && vocabDone && points >= LIMIT_POINTS);

  root.DeutschDaily = Object.freeze({ KEY, GOAL, VOCAB_POINTS, LIMIT_POINTS, add, record, tally, limitReached });
})(typeof window !== "undefined" ? window : globalThis);
