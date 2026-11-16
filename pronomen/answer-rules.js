/* Pronomen — the rules, without the page (16.11.2026). Before 16.11 they lived in pronomen.js next to the screen; the
   page now uses this file, and the native app runs it as it is (JavaScriptCore). Same rules, same order of records
   (dev/components-tests/pronomen-rules-equivalence.cjs: old pronomen.js against this file).

   Needs nothing; for the note under a capital-letter slip it uses getTranslation (components/deutsch-translation-v1.js)
   when it is there (else English).

     PronomenRules.assess(x, typed) → {
       ok,                      the answer is right (word and capital letters)
       shown,                   the answer as written in the sentence (Mein at the start)
       slip,                    the right word with the wrong capital letter (sie / Sie)
       note,                    null, or { kind: "note" | "small", text } — the line under the answer for a slip
       stats:    [[key, right]] for the round's stats (pronomenStatsV2), in this order
       progress: [[key, right]] for DeutschProgress.record("pronomen", key, right), in this order }
       Possessives: the stem (mein-, sein- …) is judged first; the ending only when the stem was right.
     PronomenRules.count(sessionAnswers, stats)   adds assess().stats to the round's answers ({key:{correct, wrong}})
     PronomenRules.endRound(store, date, answers) keeps the last SESSION_WINDOW rounds (store = {sessions:[…]})
     PronomenRules.currentStats(sessions)         weighted mistakes per key (newer rounds weigh more): {key:{…, errorRate, weak}}
     PronomenRules.weakList(sessions, data)       the «Noch üben» labels, most mistakes first
     PronomenRules.weakLabel(key, data)           one such label
     PronomenRules.weightedDeck(data, count, current)  a round: half personal, half possessive, weak ones more often
                                                  (uses Math.random exactly as before)
     PronomenRules.progressItems(data)            the 41 progress categories for DeutschProgress.init
     PronomenRules.statKey, ownerStem, stemMatches, possessiveCase, endingOf, progressKeys, norm, caseRight,
       politeCaseSlip, isPolite, shownAnswer, POLITE_NOTE, STATS_STORE, SESSION_WINDOW, MIN_ATTEMPTS,
       ERROR_THRESHOLD, PROGRESS_ID */
(function (root) {
  "use strict";

  const STATS_STORE = "pronomenStatsV2";
  const SESSION_WINDOW = 5;
  const MIN_ATTEMPTS = 2;
  const ERROR_THRESHOLD = 0.4;
  const PROGRESS_ID = "pronomen";

  /* ===== SESSION STATS (last 5 rounds) =====
     Keys: "personal · <skill>", and for possessives "root · Possessiv · <owner> →" (right stem)
     plus "detail · <skill> · <gender>" (whole form; only judged when the stem was right). */
  function statKey(x) {
    if (x.type === "possessive") {
      const gender = x.gender ? ` · ${x.gender}` : "";
      return { root: `root · ${x.skill.split(" → ")[0]} →`, detail: `detail · ${x.skill}${gender}`, type: "possessive" };
    }
    return { root: `personal · ${x.skill}`, detail: `personal · ${x.skill}`, type: "personal" };
  }
  // Newer rounds weigh more (round 1 of 5 × 1 … round 5 × 5).
  function currentStats(sessions) {
    const map = {};
    for (let s = 0; s < sessions.length; s++) {
      const session = sessions[s];
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
  function weakLabel(key, data) {
    if (key.startsWith("root · ")) {
      const owner = key.slice(7); // "Possessiv · wir →"
      const x = data.find(x => x.skill.startsWith(owner + " "));
      return x ? x.skill.split(" · ").slice(0, 2).join(" · ") : owner.replace(/ →$/, "");
    }
    return key.replace(/^(personal|detail) · /, "");
  }
  function weakList(sessions, data) {
    return Object.entries(currentStats(sessions))
      .filter(([, v]) => v.weak)
      .sort((a, b) => b[1].errorRate - a[1].errorRate)
      .map(([k]) => weakLabel(k, data));
  }
  function count(sessionAnswers, stats) {
    for (const [key, right] of stats) {
      const v = sessionAnswers[key] || { correct: 0, wrong: 0 };
      if (right) v.correct++;
      else v.wrong++;
      sessionAnswers[key] = v;
    }
    return sessionAnswers;
  }
  function endRound(store, date, answers) {
    if (Object.keys(answers).length) {
      store.sessions.push({ date, answers });
      if (store.sessions.length > SESSION_WINDOW) store.sessions = store.sessions.slice(-SESSION_WINDOW);
    }
    return store;
  }

  /* ===== PROGRESS (Documentation/PROGRESS_TRACKER.md) =====
     41 categories: 18 personal (person × case), 8 possessive owners (ich → mein …),
     15 possessive endings (case × gender, e.g. "Dativ · Maskulin → -em").
     A possessive sentence counts for its owner AND its ending — same logic as the session stats:
     owner = right stem; ending = only judged when the stem was right.
     Weight = sentences covered (a possessive sentence gives ½ to its owner, ½ to its ending). */
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
  function progressItems(data) {
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
    return [...items.values()];
  }

  /* ===== DECK =====
     Half personal, half possessive; inside each type, sentences with recent mistakes come up more often. */
  function weightedPick(items, count, current) {
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
  function weightedDeck(data, count, current) {
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
    const selected = [...weightedPick(personal, personalCount, current), ...weightedPick(possessive, possessiveCount, current)];
    // Shuffle so the two types are genuinely mixed.
    return selected.sort(() => Math.random() - 0.5);
  }

  /* ===== ANSWER ===== */
  const norm = s =>
    s
      .trim()
      .toLocaleLowerCase("de-DE")
      .replace(/[.,!?;:]/g, "");
  /* An answer that starts the sentence is stored in lower case (mein); it is shown as written there (Mein). */
  const shownAnswer = x => (x.sentence.startsWith("___") ? x.answer.charAt(0).toLocaleUpperCase("de-DE") + x.answer.slice(1) : x.answer);
  /* Capital letters (03.11.2026, Alena; the keyboard has Shift now): the case is checked. The polite Sie / Ihnen /
     Ihr… is always capitalised, also at the start of the sentence; any other word at the start may be typed in
     either case; in mid-sentence the case must be right (sie „they“ ≠ Sie). A right word in the wrong case is a
     mistake, with a short note under the answer. */
  const POLITE_NOTE = {
    note: { ru: "Вежливая форма — с большой буквы: {w}", en: "Polite form — capitalised: {w}" },
    small: { ru: "Здесь с маленькой буквы: {w}", en: "Lower case here: {w}" }
  };
  const isPolite = x => /(^|· )Sie → /.test(x.skill);
  const plain = s => s.trim().replace(/[.,!?;:]/g, "");
  function caseRight(x, typed) {
    const t = plain(typed);
    if (t === x.answer) return true;
    if (x.sentence.startsWith("___") && !isPolite(x)) return norm(t) === norm(x.answer);
    return false;
  }
  const politeCaseSlip = (x, typed) => norm(typed) === norm(x.answer) && !caseRight(x, typed);
  const translate = (item, field) => (typeof root.getTranslation === "function" ? root.getTranslation(item, field) : item[field].en);

  function assess(x, typed) {
    const ok = norm(typed) === norm(x.answer) && caseRight(x, typed);
    const keys = statKey(x), pk = progressKeys(x), stats = [], progress = [];
    if (x.type === "possessive") {
      // Stem and ending are scored separately. If the stem itself is wrong, the ending is not judged,
      // so one mistake cannot weaken both. euer → eure/eurem/euren counts as the right stem.
      const stemOK = stemMatches(norm(typed), ownerStem(x));
      stats.push([keys.root, stemOK]);
      if (stemOK) stats.push([keys.detail, ok]);
      progress.push([pk.owner, stemOK]);
      if (stemOK) progress.push([pk.ending, ok]);
    } else {
      stats.push([keys.detail, ok]);
      progress.push([pk.personal, ok]);
    }
    const slip = politeCaseSlip(x, typed), shown = shownAnswer(x);
    const kind = /^[A-ZÄÖÜ]/.test(x.answer) || isPolite(x) ? "note" : "small";
    return { ok, shown, slip, note: slip ? { kind, text: translate(POLITE_NOTE, kind).replace("{w}", shown) } : null, stats, progress };
  }

  root.PronomenRules = Object.freeze({ STATS_STORE, SESSION_WINDOW, MIN_ATTEMPTS, ERROR_THRESHOLD, PROGRESS_ID, POLITE_NOTE,
    assess, count, endRound, currentStats, weakList, weakLabel, weightedPick, weightedDeck, progressItems,
    statKey, ownerStem, stemMatches, possessiveCase, endingOf, progressKeys, norm, caseRight, politeCaseSlip, isPolite, shownAnswer });
})(typeof window !== "undefined" ? window : globalThis);
