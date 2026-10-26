/* Wortschatz · the meaning you train (2026-10-26). Only the Wortschatz page loads this file.

   A Wörterbuch word often has several meanings in one line („ступень; уровень, стадия; степень; …“), but its one
   example sentence shows one of them. A card keeps that one as `translation` (big on the answer screen, alone in lists)
   and the rest as `otherMeanings` (the quiet „auch: …“ line). The Wörterbuch itself is never changed.

   Which meaning the example shows:
   1. example-senses.json (this folder) — {"noun-814": {"ru": "заказ", "en": "order"}}: the TEXT of that meaning, not its
      number, so re-ordered meanings in the Wörterbuch don't break it. Checked by hand; loaded only when needed.
   2. Not in the file (new Wörterbuch entries): a guess — the meaning whose words appear in the example's translation,
      else the first one. Such cards get meaningGuess: true and are corrected from the file on a later load.
   Meanings are separated by „;“ outside brackets („bow (for a violin; for archery)“ stays one meaning). */
(() => {
  "use strict";
  const FILE = new URL("example-senses.json?v=1", document.currentScript.src);
  let map = null,
    loading = null;
  function load() {
    if (map) return Promise.resolve(map);
    return (loading ||= fetch(FILE, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then(m => (map = m && typeof m === "object" ? m : {})));
  }
  // split at `sep` outside ( ) and [ ]
  function parts(s, sep) {
    const out = [];
    let depth = 0,
      cur = "";
    for (const ch of String(s || "")) {
      if (ch === "(" || ch === "[") depth++;
      else if ((ch === ")" || ch === "]") && depth) depth--;
      if (ch === sep && !depth) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim()).filter(Boolean);
  }
  const low = s => String(s).toLocaleLowerCase();
  const stems = s => (String(s).match(/\p{L}{4,}/gu) || []).map(w => low(w).slice(0, 5));
  const plain = v => (typeof v === "string" ? v : v && typeof v === "object" ? v.ru || v.en || "" : "");
  function pick(list, dictionaryId, exampleTr) {
    const f = map && dictionaryId ? map[dictionaryId] : null;
    if (f)
      for (const t of [f.ru, f.en]) {
        if (!t) continue;
        const lt = low(t).trim();
        let i = list.findIndex(p => low(p) === lt);
        if (i < 0) i = list.findIndex(p => low(p).startsWith(lt) || lt.startsWith(low(p)));
        if (i >= 0) return [i, false];
      }
    const ex = new Set(stems(exampleTr));
    const i = list.findIndex(p => stems(p).some(s => ex.has(s)));
    return [i < 0 ? 0 : i, true];
  }
  // → {translation, otherMeanings, guess} or null (not a plain string)
  function split(translation, dictionaryId, exampleTr) {
    if (typeof translation !== "string") return null;
    const list = parts(translation, ";");
    if (list.length < 2) return { translation: translation.trim(), otherMeanings: "", guess: false };
    const [i, guess] = pick(list, dictionaryId, plain(exampleTr));
    return { translation: list[i], otherMeanings: list.filter((_, j) => j !== i).join("; "), guess };
  }
  // Card fields from the Wörterbuch (dictionaryId set) → main meaning + others. Other fields pass through.
  function splitFields(fields) {
    if (!fields || !fields.dictionaryId || fields.otherMeanings !== undefined) return fields;
    const r = split(fields.translation, fields.dictionaryId, fields.sentenceTranslation);
    if (!r) return fields;
    const out = Object.assign({}, fields, { translation: r.translation, otherMeanings: r.otherMeanings });
    if (r.guess) out.meaningGuess = true;
    return out;
  }
  // Collection cards that still hold the whole line (added before 2026-10-26, or from Bibliothek) or only a guess:
  // split / correct them. Returns the changes (also written to the collection).
  async function fixCollection() {
    const C = window.WortschatzCollection;
    if (!C || !C.isOwn()) return [];
    const need = C.cards().filter(
      c => c.dictionaryId && typeof c.translation === "string" && (c.meaningGuess || (c.otherMeanings === undefined && parts(c.translation, ";").length > 1))
    );
    if (!need.length) return [];
    await load();
    const changes = [];
    for (const c of need) {
      const full = c.meaningGuess ? [c.translation, c.otherMeanings].filter(Boolean).join("; ") : c.translation;
      const r = split(full, c.dictionaryId, c.sentenceTranslation);
      if (!r || (c.meaningGuess && r.guess)) continue; // still only a guess: leave it as it is
      changes.push({ id: c.id, translation: r.translation, otherMeanings: r.otherMeanings, meaningGuess: r.guess });
    }
    if (changes.length) C.applyMeanings(changes);
    return changes;
  }
  window.WortschatzMeanings = Object.freeze({ load, split, splitFields, fixCollection, parts });
})();
