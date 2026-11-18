/* Translations of a pack language (lang/<code>/dictionary/, 17.11.2026, chat «languages in the reader», stage Ч2).
 * Display only: never creates, ranks or chooses lemma candidates (the resolver works as for English, decision of the advisor
 * 17.11). One code for every pack language — no branch for a particular language; a new language is a folder with the same
 * format: lang/<code>/dictionary/manifest.json (version, partition) + parts/NNNN.json (as the Russian dictionary,
 * open data/dictionary-de-ru-json/, read by russian-translations.js, which stays as it is).
 *
 * BibliothekPackTranslations.enrich(resolution, code, entryOf) — external candidates without a text in this language get
 *   translation[code], meaningLabels[code], labelledText[code], reflexiveMarks[code] (the same fields the Russian dictionary
 *   fills under "ru"); built-in languages (en, ru) and a missing or broken pack: nothing changes (the card stays English).
 * BibliothekPackTranslations.lookup(lemma, pos, code) -> the record or null.
 * BibliothekPackTranslations.sheet(code, file, id) / sheetFields(…) -> a card's pack texts for the dictionary reference (Ч6б).
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
          // labels.display: the label table of the language ({code: {kind, rude, label}}, Ч3) — meaning-display.js reads it
          const table = m.labels?.display && typeof m.labels.display === "object" && !Array.isArray(m.labels.display) && Object.keys(m.labels.display).length ? m.labels.display : null;
          return {version:m.version, source:typeof m.attribution === "string" ? m.attribution : "", labels:table};
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
  // gender (optional): m / f / n of the card (der / die / das) — records of another gender of the same word are left out when the
  // dictionary marks genders (die Heide «wrzosowisko», not der Heide «poganin»; Ч3); a weak hint (the article linked in the sentence:
  // «Ist das Tau …» links a demonstrative das — review A 17.11) only puts the records of that gender first. Without it — all records.
  async function lookup(lemma, partOfSpeech, code, gender = null, weak = false) {
    if (!valid(code)) return null;
    const word = String(lemma || "").normalize("NFC").trim(), pos = posOf(partOfSpeech);
    if (!word || !pos) return null;
    // As the Russian dictionary: only nouns may use an initial capital alias; the part of speech must match.
    const spellings = [...new Set(pos === "noun" ? [word.charAt(0).toUpperCase() + word.slice(1), word] : [word, word.toLowerCase()])];
    for (const spelling of spellings) {
      let matched = (await records(code, spelling)).filter(row => row.word === spelling && row.pos === pos);
      const fits = row => Array.isArray(row.gender) && row.gender.includes(gender);
      if (gender && matched.some(fits))
        matched = weak ? [...matched.filter(fits), ...matched.filter(row => !fits(row))]
          : matched.filter(row => !Array.isArray(row.gender) || !row.gender.length || fits(row));
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
        const {source, labels:labelTable} = await manifest(code);
        return {language:code, source, entries, ...(labelTable ? {labelTable} : {}),
          meanings:[...new Set(entries.flatMap(row => row.senses.flatMap(s => s.glosses)))],
          ...(Object.keys(reflexive).length ? {reflexive} : {}),
          ...(names.size ? {names:[...names]} : {}),
          ...(labelled ? {labels, shown:[...new Set(shown)]} : {})};
      }
    }
    return null;
  }
  // Our own cards in a pack language (Ч2б, 17.11.2026): lang/<code>/worterbuch/german-*.json — {id: {translation_<code>, example_<code>,
  // extra_meanings: [{<code>, …}], reflexive: {translation_<code>, note_<code>, …}, form_translations: [{<code>}], collective: {<code>}, …}}
  // (the files listed in lang/<code>/manifest.json `files`, under its `version`), read once per language. The card's own object is
  // not changed: its pack texts go to candidate.packItem (meaning-display.js reads them), its main text to translation[code] — only
  // when the candidate's text is the card's own (translation.en = translation_en of the card); a text the resolver chose for this
  // place (a sense, a form) stays English. A pack without them (not downloaded, an older pack): the card stays English.
  const owns = new Map(), ownFailedAt = new Map(), ownStarted = new Map(), ownMissing = new Map();
  const KEEP = code => [`translation_${code}`, "extra_meanings", "reflexive", "form_translations", "collective", "_src_reader"];
  // one card file: {id: fields} with only the fields the popup reads, into map; false when it could not be read
  function readOwnFile(code, file, version, map) {
    return dataFetch(new URL(`../../lang/${code}/${file}${version ? `?v=${encodeURIComponent(version)}` : ""}`, script))
      .then(r => { if (!r.ok) throw new Error("Pack card texts unavailable"); return r.json(); })
      .then(part => { if (!part || typeof part !== "object" || Array.isArray(part)) return false;
        for (const [id, fields] of Object.entries(part))
          if (fields && typeof fields === "object") map.set(id, Object.fromEntries(KEEP(code).filter(k => k in fields).map(k => [k, fields[k]])));
        return true; })
      .catch(() => false);
  }
  function ownTexts(code) {
    if (!owns.has(code) && Date.now() - (ownFailedAt.get(code) || -Infinity) < RETRY_MS) return Promise.resolve(null);
    if (!owns.has(code)) {
      ownStarted.set(code, Date.now());
      const request = dataFetch(new URL(`../../lang/${code}/manifest.json${packVersion(code) ? `?v=${encodeURIComponent(packVersion(code))}` : ""}`, script))
        .then(r => { if (!r.ok) throw new Error("Pack manifest unavailable"); return r.json(); })
        .then(m => {
          const v = typeof m?.version === "string" ? m.version : "";
          const files = Object.keys(m?.files || {}).filter(f => /^worterbuch\/german-[\w-]+\.json$/u.test(f));
          const map = new Map();
          if (!files.length) return map;
          // (each file on its own: one that fails leaves the others and is asked again a minute later — reviews A, C Ч2б)
          return Promise.all(files.map(f => readOwnFile(code, f, v, map))).then(ok => {
            if (!map.size) throw new Error("Pack card texts unavailable");
            const missing = files.filter((_, i) => !ok[i]);
            if (missing.length) ownMissing.set(code, {files:missing, version:v, at:Date.now(), map, busy:false});
            return map; });
        })
        .catch(() => { if (owns.get(code) === request) { owns.delete(code); ownFailedAt.set(code, Date.now()); } return null; });
      owns.set(code, request);
    }
    const missing = ownMissing.get(code);
    if (missing && !missing.busy && Date.now() - missing.at >= RETRY_MS) {
      missing.busy = true;
      Promise.all(missing.files.map(f => readOwnFile(code, f, missing.version, missing.map))).then(ok => {
        missing.files = missing.files.filter((_, i) => !ok[i]); missing.at = Date.now(); missing.busy = false;
        if (!missing.files.length) ownMissing.delete(code); });
    }
    return owns.get(code);
  }
  const same = (a, b) => !!String(a || "").trim() && String(a || "").trim() === String(b || "").trim();
  // The first tap waits for the card texts at most OWN_WAIT_MS (≈ 0.8 MB gzip at the first load): later the card is English for
  // this tap, the texts keep loading for the next ones (review A Ч2б).
  const OWN_WAIT_MS = 1500;
  // the print of the reader's own card (its English as shown) against a pack card's "_src_reader"; a failing print — not outdated
  const outdated = (print, item) => { try { const f = window.DeutschLangDe?.sourcePrint; return typeof f === "function" && f(item) !== print; } catch (_) { return false; } };
  // (18.11.2026, advisor: a general rule) a contraction (im = in + dem, zum, am …): the resolver gives it the text of its preposition's
  // own card (explanation.componentId) — its pack text is that card's, when the text shown is that card's English (entryOf: the
  // reader's card by id, bibliothek.js findEntry)
  const componentOf = (c, entryOf) => {
    if (c.item || c.explanation?.kind !== "contraction" || c.explanation.componentId == null || typeof entryOf !== "function") return null;
    try { const item = entryOf({id:c.explanation.componentId}); return item && typeof item.id === "string" ? item : null; } catch (_) { return null; }
  };
  async function enrichOwn(resolution, code, entryOf) {
    const mine = resolution.candidates.filter(c => c.item && typeof c.item.id === "string");
    const contractions = resolution.candidates.map(c => [c, componentOf(c, entryOf)]).filter(([, item]) => item);
    if (!mine.length && !contractions.length) return;
    // (one deadline for every tap of the first load, counted from its start — review C Ч2б)
    const load = ownTexts(code), left = (ownStarted.get(code) || 0) + OWN_WAIT_MS - Date.now();
    const texts = await (typeof setTimeout === "function" ? Promise.race([load, new Promise(resolve => setTimeout(() => resolve(null), Math.max(0, left)))]) : load);
    if (!texts) return;
    for (const [c, item] of contractions) {
      const fields = texts.get(item.id);
      if (!fields || typeof fields !== "object" || typeof fields._src_reader === "string" && outdated(fields._src_reader, item)) continue;
      const main = String(fields[`translation_${code}`] || "").trim();
      if (main && !c.translation?.[code] && same(c.translation?.en, item.translation_en)) c.translation = {...c.translation, [code]:main};
    }
    for (const c of mine) {
      const fields = texts.get(c.item.id);
      if (!fields || typeof fields !== "object") continue;
      // (Ч2в, advisor 18.11) a pack card translated from another English than the reader's card shows now: "_src_reader" of the
      // pack (dev/lang/stamp.cjs: DeutschLangDe.sourcePrint of the light card, build-reader-dictionaries.cjs readerPrint) ≠ the
      // print of the reader's card — an outdated text, the card stays English. No "_src_reader" or no sourcePrint: as before.
      if (typeof fields._src_reader === "string" && outdated(fields._src_reader, c.item)) continue;
      c.packItem = {...(c.packItem || {}), [code]:fields};
      const main = String(fields[`translation_${code}`] || "").trim();
      if (main && !c.translation?.[code] && same(c.translation?.en, c.item.translation_en)) c.translation = {...c.translation, [code]:main};
      // a form of the card (alles on the alle card, zu zweit — collective): its own pack text, found by the form's English text
      const ft = c.formTranslation;
      if (ft && !ft[code]) {
        const at = (c.item.form_translations || []).findIndex(r => r && r.form === ft.form && same(r.en, ft.en));
        const text = at >= 0 ? fields.form_translations?.[at]?.[code] : c.item.collective && same(c.item.collective.en, ft.en) ? fields.collective?.[code] : "";
        if (String(text || "").trim()) c.formTranslation = {...ft, [code]:String(text).trim()};
      }
    }
  }
  // Phrases of the popup in a pack language (Ч4): lang/<code>/reader.json — {"phrases": [{en, ru, <code>}], "pronouns": [{en, ru, <code>}]}
  // (a pair of the English and Russian texts — templates with {0} … — is the key; dev/lang/scan-reader.cjs lists them). Read once per
  // language, with the pack version; phrase(code, en, ru, section) answers from memory ("" — none: the English text is shown).
  const SEP = "\u241f", phraseTables = new Map(), phraseLoads = new Map(), phraseFailedAt = new Map(), phraseStarted = new Map();
  function readerPhrases(code) {
    if (phraseTables.has(code)) return Promise.resolve(phraseTables.get(code));
    if (phraseLoads.has(code)) return phraseLoads.get(code);
    if (Date.now() - (phraseFailedAt.get(code) || -Infinity) < RETRY_MS) return Promise.resolve(null);
    const v = packVersion(code);
    phraseStarted.set(code, Date.now());
    const request = dataFetch(new URL(`../../lang/${code}/reader.json${v ? `?v=${encodeURIComponent(v)}` : ""}`, script))
      .then(r => { if (!r.ok) throw new Error("Pack phrases unavailable"); return r.json(); })
      .then(data => {
        const sections = Array.isArray(data) ? {phrases:data} : data && typeof data === "object" ? data : {};
        const table = new Map();
        for (const [section, rows] of Object.entries(sections)) if (Array.isArray(rows)) for (const row of rows)
          if (row && typeof row[code] === "string" && row[code] && typeof row.en === "string" && typeof row.ru === "string" && (row.en || row.ru))
            table.set(`${section}${SEP}${row.en || ""}${SEP}${row.ru || ""}`, row[code]);
        phraseTables.set(code, table); phraseLoads.delete(code); return table; })
      .catch(() => { phraseLoads.delete(code); phraseFailedAt.set(code, Date.now()); return null; });
    phraseLoads.set(code, request);
    return request;
  }
  function phrase(code, en, ru, section = "phrases") {
    if (!valid(code) || !en && !ru) return "";
    return phraseTables.get(code)?.get(`${section}${SEP}${en || ""}${SEP}${ru || ""}`) || "";
  }
  // entryOf (optional; not «lookup» — that is the external dictionary's function above): the reader's own card by id ({id} → card) — for the contractions above
  async function enrich(resolution, code, entryOf = null) {
    if (!valid(code) || !resolution || !Array.isArray(resolution.candidates)) return resolution;
    const phrases = readerPhrases(code);
    const own = enrichOwn(resolution, code, entryOf).catch(() => { /* the own cards stay English */ });
    const pending = new Map();
    // (not a candidate with an explanation — a contraction im = in + dem, a superlative: its text is the resolver's, from the word it
    // explains; the dictionary's own record of «im» is a form note, «in dem». As the Russian dictionary: lemma-resolver.js enriches
    // the candidates without an explanation only.)
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.explanation && !c.translation?.[code]).map(async candidate => {
      // (the gender of the card: its article — the resolver's G16 nounArticle — or its noun phrase when it names one gender (sure);
      // otherwise the article linked to it in the sentence when that article has one gender only — eine; der / die / das / ein … are
      // not used — they also stand for other cases, genders, the plural or a demonstrative)
      const genders = [...new Set((candidate.nounPhrase || []).map(p => p?.gender).filter(Boolean))];
      const sure = {der:"m", die:"f", das:"n"}[candidate.nounArticle] ||
        (genders.length === 1 ? {masculine:"m", feminine:"f", neuter:"n"}[genders[0]] : null) || null;
      // (the link must be this word's own: an alternative of another lemma — Alt under «das Alter» — takes no hint; review B 17.11)
      const link = candidate.nounArticleLink, own = link && String(link.noun || "").toLowerCase() === String(candidate.lemma || "").toLowerCase();
      // (eine before its noun is always feminine — a sure sign; a linked das may be a demonstrative — «Ist das Tau oder Regen?» would
      // lose «rosa» — so it is not used; reviewer C 17.11)
      const linked = sure || !own ? null : {eine:"f"}[String(link.article || "").toLowerCase()] || null;
      const gender = sure || linked, weak = false;
      const key = JSON.stringify([candidate.lemma, posOf(candidate.pos), gender, weak]);
      if (!pending.has(key)) pending.set(key, lookup(candidate.lemma, candidate.pos, code, gender, weak));
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
        if (result.labelTable) candidate.labelTables = {...(candidate.labelTables || {}), [code]:result.labelTable};
      } catch (_) {
        // A pack that is not downloaded (no network, an error): the card stays as in English.
        candidate.packTranslationError = "unavailable";
      }
    }));
    await own;
    // (the phrases under the same deadline as the card texts, counted from the start of their load: later — English phrases for this
    // tap, the next taps have them; review B Ч4)
    const phrasesLeft = (phraseStarted.get(code) || 0) + OWN_WAIT_MS - Date.now();
    await (typeof setTimeout === "function" ? Promise.race([phrases, new Promise(resolve => setTimeout(resolve, Math.max(0, phrasesLeft)))]) : phrases);
    // (Ч4) a text the resolver wrote as a pair {ru, en} for this place («здесь: …», a form of the card): its line in reader.json
    for (const candidate of resolution.candidates) for (const field of ["translation", "formTranslation"]) {
      const value = candidate[field];
      if (!value || typeof value !== "object" || value[code] || typeof value.en !== "string" || typeof value.ru !== "string") continue;
      const own = phrase(code, value.en, value.ru);
      if (own) candidate[field] = {...value, [code]:own};
    }
    return resolution;
  }
  // (Ч4, advisor 17.11) the phrases of this language are loaded (reader.json read): a missing line is then shown as its English text
  // with the mark «English: »; without reader.json (the pack not downloaded) — the English popup exactly
  const hasPhrases = code => valid(code) && phraseTables.has(code);
  // The pack texts of the dictionary reference (Ч6б, 18.11.2026, advisor): lang/<code>/worterbuch/reader/ (dev/lang/pack-reader-parts.cjs)
  // — index.json {parts: {"german-<name>.json": N}} once per language, then part NN = fnv1a(id) & (N − 1) of the card's file when the
  // reference of a card of it is opened (not kept for all cards at once: the advisor), with the pack version, through the data cache.
  // sheet(code, file, id) → the card's pack fields ({…, "_src"}) or null (no pack, no part, not this card); sheetFields — the same
  // from what is loaded already, without waiting (undefined: not read yet). A part that failed is asked again a minute later.
  const sheetIndexes = new Map(), sheetIndexFailedAt = new Map(), sheetParts = new Map(), sheetPartFailedAt = new Map(), SHEET_PART_LIMIT = 16;
  const sheetBase = code => new URL(`../../lang/${code}/worterbuch/reader/`, script);
  // (review B: one index per pack version — a reference opened before the pack manifest is read asks without ?v, not cached, and
  // the next one with the version)
  function sheetIndex(code) {
    const v = packVersion(code), at = `${code}\u0000${v}`;
    if (!sheetIndexes.has(at) && Date.now() - (sheetIndexFailedAt.get(at) || -Infinity) < RETRY_MS) return Promise.resolve(null);
    if (!sheetIndexes.has(at)) {
      const request = dataFetch(new URL(`index.json${v ? `?v=${encodeURIComponent(v)}` : ""}`, sheetBase(code)))
        .then(r => { if (!r.ok) throw new Error("Pack reference unavailable"); return r.json(); })
        .then(data => { if (data?.format_version !== 1 || !data.parts || typeof data.parts !== "object") throw new Error("Invalid pack reference index");
          return {version:v, parts:data.parts}; })
        .catch(() => { if (sheetIndexes.get(at) === request) { sheetIndexes.delete(at); sheetIndexFailedAt.set(at, Date.now()); } return null; });
      sheetIndexes.set(at, request);
    }
    return sheetIndexes.get(at);
  }
  const fnvId = id => { let h = 2166136261; for (const b of new TextEncoder().encode(String(id))) h = Math.imul(h ^ b, 16777619) >>> 0; return h; };
  async function sheetPartKey(code, file, id) {
    const index = await sheetIndex(code), n = index?.parts?.[file];
    // (review A / B) the index read, but no parts for this file: nothing to read — the reference is English (not asked again)
    if (index && !(file in index.parts)) return {none:true};
    if (!Number.isInteger(n) || n < 1 || (n & (n - 1))) return null;
    const name = String(file).replace(/\.json$/u, "");
    return {key:`${code}/${index.version}/${name}/${fnvId(id) & (n - 1)}`, url:new URL(`${name}-details/${String(fnvId(id) & (n - 1)).padStart(2, "0")}.json${index.version ? `?v=${encodeURIComponent(index.version)}` : ""}`, sheetBase(code))};
  }
  const sheetKeys = new Map();   // `${code}\u0000${file}\u0000${id}` → part key, once known
  async function sheet(code, file, id) {
    if (!valid(code) || !file || id == null) return null;
    const where = await sheetPartKey(code, file, id);
    if (!where) return null;
    if (where.none) { sheetKeys.set(`${code}\u0000${file}\u0000${id}`, null); return null; }
    sheetKeys.set(`${code}\u0000${file}\u0000${id}`, where.key);
    if (!sheetParts.has(where.key)) {
      if (Date.now() - (sheetPartFailedAt.get(where.key) || -Infinity) < RETRY_MS) return null;
      const part = {done:false};
      part.promise = dataFetch(where.url).then(r => { if (!r.ok) throw new Error("Pack reference part unavailable"); return r.json(); })
        .then(rows => { if (!rows || typeof rows !== "object" || Array.isArray(rows)) throw new Error("Invalid pack reference part"); part.rows = rows; part.done = true; })
        .catch(() => { if (sheetParts.get(where.key) === part) { sheetParts.delete(where.key); sheetPartFailedAt.set(where.key, Date.now()); } });
      sheetParts.set(where.key, part);
      // (kept bounded, as the dictionary parts above: an evicted part is read again — from the data cache — when needed)
      for (const key of sheetParts.keys()) { if (sheetParts.size <= SHEET_PART_LIMIT) break; if (key !== where.key) sheetParts.delete(key); }
    } else { const again = sheetParts.get(where.key); sheetParts.delete(where.key); sheetParts.set(where.key, again); }
    const part = sheetParts.get(where.key);
    await part.promise;
    const fields = part.rows?.[String(id)];
    return fields && typeof fields === "object" ? fields : null;
  }
  function sheetFields(code, file, id) {
    const key = sheetKeys.get(`${code}\u0000${file}\u0000${id}`), part = key ? sheetParts.get(key) : null;
    if (key === null) return null;
    if (!part?.done) return undefined;
    const fields = part.rows[String(id)];
    return fields && typeof fields === "object" ? fields : null;
  }
  // Warm-up (speed chat 18.11.2026, main languages chat): the reader opened with a pack language puts the pack's card texts
  // (worterbuch/german-*.json of its manifest, ~1 MB over the network for pl) on disk in the background after the page has loaded —
  // otherwise the first tap that needs them waits for all of them (measured 18.11: +1–1.8 s on that tap). Only to disk
  // (BibliothekDataCache.store, two at a time): read and kept in memory only when a tap needs them, as before. A pack downloaded in
  // full is already there — nothing is asked again. warmed: a promise of the store() result (null: nothing to warm) — for tests.
  // (review 18.11: a tap that already reads them — no second download; the pack manifest of DeutschTranslation not read yet — asked
  // again up to 3 times, 3 s apart; no window events (node tests) — nothing)
  let warmDone = null;
  const warmed = new Promise(resolve => { warmDone = resolve; });
  function warm(attempt = 0) {
    try {
      const code = window.DeutschTranslation?.getDisplayLang?.(), cache = window.BibliothekDataCache;
      if (!valid(code) || typeof cache?.store !== "function" || owns.has(code)) { warmDone(null); return; }
      const v = packVersion(code);
      if (!v) { if (attempt < 3) setTimeout(() => warm(attempt + 1), 3000); else warmDone(null); return; }
      dataFetch(new URL(`../../lang/${code}/manifest.json?v=${encodeURIComponent(v)}`, script))
        .then(r => r.ok ? r.json() : null)
        .then(m => { if (!m || typeof m.version !== "string" || !m.version) return null;
          const files = Object.keys(m.files || {}).filter(f => /^worterbuch\/german-[\w-]+\.json$/u.test(f));
          return cache.store(files.map(f => new URL(`../../lang/${code}/${f}?v=${encodeURIComponent(m.version)}`, script).href), {parallel: 2}); })
        .then(result => warmDone(result || null), () => warmDone(null));
    } catch (_) { warmDone(null); }
  }
  try {
    if (typeof window.addEventListener === "function" && typeof setTimeout === "function" && typeof document !== "undefined") {
      if (document.readyState === "complete") setTimeout(() => warm(), 3000);
      else window.addEventListener("load", () => setTimeout(() => warm(), 3000), {once: true});
    } else warmDone(null);
  } catch (_) { warmDone(null); }
  window.BibliothekPackTranslations = Object.freeze({lookup, enrich, phrase, hasPhrases, sheet, sheetFields, warmed});
})();
