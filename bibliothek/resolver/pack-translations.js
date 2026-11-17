/* Translations of a pack language (lang/<code>/dictionary/, 17.11.2026, chat «languages in the reader», stage Ч2).
 * Display only: never creates, ranks or chooses lemma candidates (the resolver works as for English, decision of the advisor
 * 17.11). One code for every pack language — no branch for a particular language; a new language is a folder with the same
 * format: lang/<code>/dictionary/manifest.json (version, partition) + parts/NNNN.json (as the Russian dictionary,
 * open data/dictionary-de-ru-json/, read by russian-translations.js, which stays as it is).
 *
 * BibliothekPackTranslations.enrich(resolution, code) — external candidates without a text in this language get
 *   translation[code], meaningLabels[code], labelledText[code], reflexiveMarks[code] (the same fields the Russian dictionary
 *   fills under "ru"); built-in languages (en, ru) and a missing or broken pack: nothing changes (the card stays English).
 * BibliothekPackTranslations.lookup(lemma, pos, code) -> the record or null.
 * Files are read by path (BibliothekDataCache or fetch), nothing else from the browser: the native app serves the same paths.
 */
(() => {
  "use strict";
  const dataFetch = (input, options) => (typeof window !== "undefined" && window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
  const script = document.currentScript.src;
  // (not en / ru — built in; not xx — the framework's test language without files, deutsch-translation-v1.js)
  const builtIn = code => code === "en" || code === "ru" || code === "xx";
  const valid = code => typeof code === "string" && /^[a-z]{2,3}$/u.test(code) && !builtIn(code);
  const base = code => new URL(`../../lang/${code}/dictionary/`, script);
  // The pack version (lang/<code>/manifest.json, read by the language framework) goes into the manifest address: it changes with
  // every file of the pack. Without it (node tools, a pack without that manifest) the address has no version and is not cached.
  function packVersion(code) {
    try {
      const T = window.DeutschTranslation;
      if (T?.getDisplayLang?.() !== code) return "";   // (packEntries are those of the shown language)
      const v = T.packEntries?.("manifest.json")?.version; return typeof v === "string" && v ? v : "";
    } catch (_) { return ""; }
  }
  // A failed manifest (no network, a pack not published) is not asked again for a minute: every tap would wait for it otherwise.
  const RETRY_MS = 60000, failedAt = new Map();
  const manifests = new Map();
  function manifest(code) {
    if (!manifests.has(code) && Date.now() - (failedAt.get(code) || -Infinity) < RETRY_MS) return Promise.reject(new Error("Pack dictionary unavailable"));
    if (!manifests.has(code)) {
      const v = packVersion(code);
      const request = dataFetch(new URL(`manifest.json${v ? `?v=${encodeURIComponent(v)}` : ""}`, base(code)))
        .then(response => { if (!response.ok) throw new Error("Pack dictionary unavailable"); return response.json(); })
        .then(m => {
          const count = m?.partition?.count ?? m?.partition_count;
          if (m?.format_version !== 1 || count !== 1024 || (m.partition && m.partition.hash !== "fnv1a-32") || typeof m.version !== "string" || !m.version)
            throw new Error("Invalid pack dictionary manifest");
          return {version:m.version, source:typeof m.attribution === "string" ? m.attribution : ""};
        })
        .catch(error => { if (manifests.get(code) === request) { manifests.delete(code); failedAt.set(code, Date.now()); } throw error; });
      manifests.set(code, request);
    }
    return manifests.get(code);
  }
  // Parts kept in memory: bounded as in russian-translations.js (an evicted part is read again when needed).
  const partLimit = 60, parts = new Map();
  function keepPart(key, value) {
    parts.delete(key); parts.set(key, value);
    while (parts.size > partLimit) parts.delete(parts.keys().next().value);
    return value;
  }
  const posAliases = {Verb:"verb",Nomen:"noun",Adjektiv:"adj",Adverb:"adv",Pronomen:"pron",Konjunktion:"conj",
    adjective:"adj",adverb:"adv",pronoun:"pron",conjunction:"conj"};
  const posOf = value => posAliases[value] || value;
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function records(code, word) {
    const {version} = await manifest(code), index = partition(word), key = `${code}/${index}`;
    if (!parts.has(key)) {
      const request = dataFetch(new URL(`parts/${String(index).padStart(4,"0")}.json?v=${encodeURIComponent(version)}`, base(code)))
        .then(response => { if (!response.ok) throw new Error("Pack translations unavailable"); return response.json(); })
        .then(data => {
          if (data.format_version !== 1 || data.partition !== index || !data.records || typeof data.records !== "object")
            throw new Error("Invalid pack translation partition");
          return data.records;
        })
        .catch(error => { if (parts.get(key) === request) parts.delete(key); throw error; });
      keepPart(key, request);
    } else keepPart(key, parts.get(key));
    const data = await parts.get(key);
    return Object.prototype.hasOwnProperty.call(data, word) ? data[word] : [];
  }
  // Parts of a translation never shown (as G45 for the Russian dictionary, user 22.10: Dirne in Grimm is «girl», not «whore»): the
  // same rule for every pack language — data/pack-hidden-senses.json {"<code>": [[word, pos, part, note], …]}. The list not
  // loaded: no pack text at all (review C 17.11 — a hidden sense must never show; the card stays English, the list is asked again).
  const hiddenUrl = new URL("data/pack-hidden-senses.json?v=20261117-pack-hidden-1", script);
  let hiddenPromise = null;
  function hiddenParts(code) {
    if (!hiddenPromise) hiddenPromise = dataFetch(hiddenUrl).then(r => { if (!r.ok) throw new Error("Hidden sense list unavailable"); return r.json(); })
      .catch(error => { hiddenPromise = null; throw error; });
    return hiddenPromise.then(d => new Map((Array.isArray(d?.[code]) ? d[code] : [])
      .filter(r => Array.isArray(r) && r.slice(0,3).every(v => typeof v === "string"))
      .map(([w,pos,part]) => [`${w}\u0000${pos}\u0000${part.trim()}`, true])));
  }
  const withoutHidden = (gloss, word, pos, hidden) => !hidden.size ? gloss :
    gloss.split(";").filter(part => !hidden.has(`${word}\u0000${pos}\u0000${part.trim()}`)).join(";").trim();
  async function lookup(lemma, partOfSpeech, code) {
    if (!valid(code)) return null;
    const word = String(lemma || "").normalize("NFC").trim(), pos = posOf(partOfSpeech);
    if (!word || !pos) return null;
    // As the Russian dictionary: only nouns may use an initial capital alias; the part of speech must match.
    const spellings = [...new Set(pos === "noun" ? [word.charAt(0).toUpperCase() + word.slice(1), word] : [word, word.toLowerCase()])];
    for (const spelling of spellings) {
      const matched = (await records(code, spelling)).filter(row => row.word === spelling && row.pos === pos);
      const hidden = matched.length ? await hiddenParts(code) : new Map();
      // `labels` [gloss index, cut, codes]: the codes of a gloss; `shown` [text per gloss]: the gloss as the card shows it (the
      // stored gloss keeps the source text); `reflexive` [gloss index, acc / dat / opt, …]; `name_like` — a name sense.
      // Only senses with display_status "translation" are shown (forms and «see …» references are not).
      const labels = {}, shown = [], reflexive = {}, names = new Set();
      let labelled = false;
      const entries = matched.map(row => ({recordId:row.record_id, word:row.word, pos:row.pos, sourceUrl:row.source_url,
        senses:row.senses.filter(s => s.display_status === "translation" && Array.isArray(s.data?.glosses))
          .map(s => ({senseIndex:s.sense_index, sourceId:s.data.id, glosses:s.data.glosses.map((g0, i) => {
            if (typeof g0 !== "string" || !g0.trim()) return "";
            const g = withoutHidden(g0, row.word, row.pos, hidden);
            if (!g) return "";
            const rm = (Array.isArray(s.reflexive) ? s.reflexive : []).find(r => Array.isArray(r) && r[0] === i && ["acc","dat","opt"].includes(r[1]));
            if (rm && !(g in reflexive)) reflexive[g] = rm[1];
            const mark = (Array.isArray(s.labels) ? s.labels : []).find(l => Array.isArray(l) && l[0] === i && Number.isInteger(l[1]) && Array.isArray(l[2]));
            const own = Array.isArray(s.shown) && typeof s.shown[i] === "string" && s.shown[i].trim() ? withoutHidden(s.shown[i].trim(), row.word, row.pos, hidden) : "";
            const text = own || (mark && mark[1] > 0 && mark[1] < g.length ? g.slice(mark[1]).trim() : g.trim());
            if (text) {
              shown.push(text);
              if (own && own !== g.trim() || mark && mark[2].length) labelled = true;
              if (Array.isArray(s.name_like) && s.name_like.length) names.add(text);
              // the first gloss with this text decides, as for the Russian dictionary; a sense's transitivity joins its codes
              // (transitive / intransitive — the order of meanings with an object in the part, meaning-display.js objectInPart)
              const transitivity = ["transitive","intransitive"].includes(s.transitivity) ? [s.transitivity] : [];
              if (transitivity.length) labelled = true;
              if (!(text in labels)) labels[text] = [...new Set([...(mark ? mark[2].filter(c => typeof c === "string") : []), ...transitivity])];
            }
            return g;
          }).filter(Boolean)}))
          .filter(s => s.glosses.length)})).filter(row => row.senses.length);
      if (entries.length) {
        const {source} = await manifest(code);
        return {language:code, source, entries,
          meanings:[...new Set(entries.flatMap(row => row.senses.flatMap(s => s.glosses)))],
          ...(Object.keys(reflexive).length ? {reflexive} : {}),
          ...(names.size ? {names:[...names]} : {}),
          ...(labelled ? {labels, shown:[...new Set(shown)]} : {})};
      }
    }
    return null;
  }
  async function enrich(resolution, code) {
    if (!valid(code) || !resolution || !Array.isArray(resolution.candidates)) return resolution;
    const pending = new Map();
    // (not a candidate with an explanation — a contraction im = in + dem, a superlative: its text is the resolver's, from the word it
    // explains; the dictionary's own record of «im» is a form note, «in dem». As the Russian dictionary: lemma-resolver.js enriches
    // the candidates without an explanation only.)
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.explanation && !c.translation?.[code]).map(async candidate => {
      const key = JSON.stringify([candidate.lemma, posOf(candidate.pos)]);
      if (!pending.has(key)) pending.set(key, lookup(candidate.lemma, candidate.pos, code));
      try {
        const result = await pending.get(key);
        if (!result) return;
        candidate.translation = {...candidate.translation, [code]:result.meanings.join("; ")};
        candidate.packTranslation = result;
        if (result.reflexive) candidate.reflexiveMarks = {...(candidate.reflexiveMarks || {}), [code]:result.reflexive};
        if (result.labels) {
          candidate.meaningLabels = {...(candidate.meaningLabels || {}), [code]:result.labels};
          candidate.labelledText = {...(candidate.labelledText || {}), [code]:result.shown.join("; ")};
        }
      } catch (_) {
        // A pack that is not downloaded (no network, an error): the card stays as in English.
        candidate.packTranslationError = "unavailable";
      }
    }));
    return resolution;
  }
  window.BibliothekPackTranslations = Object.freeze({lookup, enrich});
})();
