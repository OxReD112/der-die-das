/* Vielseitige Verben — checking an answer, without the page (16.11.2026). Before 16.11 these rules lived in
   vielseitige_verben.js next to the screen; the page now uses this file (as Modalverben uses its answer-rules.js),
   and the native app runs it as it is (JavaScriptCore). Same rules, same texts
   (dev/components-tests/vv-rules-equivalence.cjs: old vielseitige_verben.js against this file).

   Needs (loaded before): sentences.js (VV_FORMS, VV_USE_PAIRS, VV_HINTS, VV_OTHER_WORDS, VV_PAST_NOTES, VV_ALSO_NOTES,
   VV_FORM_MEANINGS), forms_table.js (VV_TABLE); RU / EN through DeutschTranslation (components/deutsch-translation-v1.js)
   when it is there, else English.

     VVAnswerRules.assess(item, typed) → {
       ok,           the typed word is the answer or one of item.also (ß = ss; capital letters do not count, 18.11)
       shown,        the word to show in the gap: the accepted spelling that was typed, else the main answer
       typed,        the typed word, trimmed (shown crossed out after a mistake)
       kind:  { name, meaning }  the form's name and what it means: «Konjunktiv II» + «бы» (meaning may be null)
       hint:  null | { main, past }  the yellow box:
                main = { lines: [text] }  lines with marks: **bold**, *italic* (as in sentences.js)
                     | { rows: [{ cls: "yours", word, label }, { cls: "needed", word, label }] }  yours red, needed green
                     | null
                past = [text] | null      where each past form is used (speaking: Perfekt · writing: Präteritum)
              after a right answer only the note «also fits» for an accepted other word (kriegen / erhalten)
       also:  text | null        that note on its own
       explanation: { source: "tip" | "table", card }  the construction card (the sentence's own tip first, else the
                                                        table's card for this verb + job: blocks, means, ex …)
                  | { source: "rule", text }          the sentence's own rule line }
     VVAnswerRules.norm, lookupForm(typed), neededLabel(item), formBase(label), withMeaning(base), meaningFor(item),
       hint(item, typed) */
(function (root) {
  "use strict";

  const pick = value => (root.DeutschTranslation ? root.DeutschTranslation.pick(value) : value?.en || "");
  const data = name => root[name];

  // ß may be typed as ss; case and extra spaces don't matter
  const norm = s =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/ß/g, "ss");

  // which verb (and which form) a typed word is
  function lookupForm(typed) {
    const t = norm(typed), FORMS = data("VV_FORMS");
    for (const verb in FORMS)
      for (const form in FORMS[verb]) if (norm(form) === t) return { verb, label: FORMS[verb][form] };
    return null;
  }

  // the label that fits the sentence (e.g. „Infinitiv“ out of „Infinitiv · Präsens (wir, sie)“)
  function neededLabel(item) {
    const hit = lookupForm(item.answer);
    if (hit && hit.verb === item.verb) {
      const base = item.form.split(" ")[0];
      const one = hit.label.split(" · ").find(l => l.startsWith(base));
      if (one) return one;
    }
    return item.form;
  }

  // „Präteritum (ich, er)“ → „Präteritum“ · „Präteritum“ → „Präteritum (прошлое)“
  const formBase = label => label.replace(/\s*\(.*\)$/, "");
  function withMeaning(base) {
    const m = (data("VV_FORM_MEANINGS") || {})[base];
    return m ? `${base} (${pick(m)})` : base;
  }

  /* the table meaning that explains a sentence (same verb, same job) */
  const meaningFor = item => (data("VV_TABLE")[item.verb]?.meanings || []).find(m => m.job === item.job) || null;

  // speaking: Perfekt · writing: Präteritum — only for this verb + job + needed form, and a typed past form
  function pastLines(item, typed, hit) {
    const n = (data("VV_PAST_NOTES") || []).find(
      e => e.verb === item.verb && (!e.only || e.only.includes(item.job)) && e.forms.includes(item.form)
    );
    if (!n || (n.skip || []).includes(norm(typed)) || !/Präteritum|Partizip II/.test(hit.label)) return null;
    return n.lines.map(pick);
  }

  /* After a wrong answer:
     - another verb, known mix-up → a contrast, one line per verb (VV_HINTS)
     - another verb, no known mix-up (a fixed phrase…) → nothing, the rule line is enough
     - the right verb in the wrong form → two rows (yours, needed) with the form names + meaning
       (geworden / worden, gelassen / lassen: the use instead of the same form name)
       + in the past: where each past form is used (VV_PAST_NOTES) */
  function mainHint(item, typed, hit) {
    if (!hit) {
      const o = (data("VV_OTHER_WORDS") || {})[norm(typed)]; // a known trap outside the five verbs (will …)
      if (!o || (o.only && !o.only.includes(item.job)) || (o.verb && o.verb !== item.verb)) return null;
      if (o.forms && !o.forms.includes(item.form)) return null;
      return { lines: o.lines.map(pick) };
    }
    if (hit.verb !== item.verb) {
      const h = [].concat(data("VV_HINTS")[item.verb + ">" + hit.verb] || []).find(e => !e.only || e.only.includes(item.job));
      if (!h) return null;
      return { lines: h.lines.map(pick) };
    }
    const t = norm(typed),
      a = norm(item.answer),
      PAIRS = data("VV_USE_PAIRS");
    for (const key in PAIRS) {
      const [x, y] = key.split("|");
      if ((t === x && a === y) || (t === y && a === x)) {
        const P = PAIRS[key];
        if (P.forms && !P.forms.includes(item.form)) break; // this pair only in these sentences: else the plain rows
        if (P.lines) return { lines: P.lines.map(pick) };
        return { rows: [{ cls: "yours", word: t, label: pick(P[t]) }, { cls: "needed", word: a, label: pick(P[a]) }] };
      }
    }
    // Another tense → the name + its meaning; the same tense → the name + the person (that is the mistake).
    // A word that is several forms (bekommen: Partizip II · Infinitiv · Präsens) → only the names, else too long.
    const parts = hit.label.split(" · ");
    const need = neededLabel(item),
      needBase = formBase(need);
    const sameTense = parts.some(p => formBase(p) === needBase);
    const yours = sameTense ? hit.label : parts.length > 1 ? parts.map(formBase).join(" · ") : withMeaning(formBase(hit.label));
    return { rows: [{ cls: "yours", word: typed, label: yours }, { cls: "needed", word: item.answer, label: sameTense ? need : withMeaning(needBase) }] };
  }
  function hint(item, typed) {
    const hit = lookupForm(typed);
    const main = mainHint(item, typed, hit);
    const past = hit && hit.verb === item.verb ? pastLines(item, typed, hit) : null;
    return main || past ? { main, past } : null;
  }

  function assess(item, value) {
    const typed = String(value || "").trim();
    // the accepted spelling the typed word matched (ß/ss, case): shown instead of the raw input
    // capital letters (18.11.2026, Alena): do not count — «Bekomme» is as right as «bekomme» anywhere in the sentence
    // (03.11–18.11 a capital was accepted only where the sentence starts). ß = ss and spaces as before.
    const matched = [item.answer, ...(item.also || [])].find(x => norm(x) === norm(typed));
    const ok = Boolean(matched);
    // an accepted other answer (gekriegt, kriegt …) stays as typed; otherwise the main answer is shown
    const shown = ok ? matched : item.answer;
    const name = formBase(item.form), kindMeaning = (data("VV_FORM_MEANINGS") || {})[name];
    const alsoNote = ok && norm(typed) !== norm(item.answer) ? (data("VV_ALSO_NOTES") || {})[norm(typed)] : null; // kriegen / erhalten
    const also = alsoNote ? pick(alsoNote) : null;
    const card = item.tip || meaningFor(item); // the sentence's own tip first (its tense), else the table's card
    return {
      ok, shown, typed,
      kind: { name, meaning: kindMeaning ? pick(kindMeaning) : null },
      hint: ok ? (also ? { main: { lines: [also] }, past: null } : null) : hint(item, typed),
      also,
      explanation: card ? { source: item.tip ? "tip" : "table", card } : { source: "rule", text: pick(item.rule) }
    };
  }

  root.VVAnswerRules = Object.freeze({ assess, hint, norm, lookupForm, neededLabel, formBase, withMeaning, meaningFor });
})(typeof window !== "undefined" ? window : globalThis);
