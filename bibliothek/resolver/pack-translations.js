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
  async function lookup(lemma, partOfSpeech, code, gender = null, weak = false, strict = false, homonyms = null) {
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
      // (advisor 22.11) the gender the resolver chose by the determiner (strict): no record of it — no text in this language (the card shows
      // the English meanings of that gender, or «перевод не найден»), not the records of the other gender
      // (a record of a gender with no meanings of its own in the English dictionary is the same word in another gender: it stays, 22.11)
      else if (gender && strict && matched.some(row => Array.isArray(row.gender) && row.gender.length) &&
        !(Array.isArray(homonyms) && !matched.some(row => Array.isArray(row.gender) && row.gender.some(g => homonyms.includes(g)))))
        matched = matched.filter(row => !Array.isArray(row.gender) || !row.gender.length);
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
  // (22.11.2026, links chat; Alena + advisor 22.11: a pair tied to a meaning finds it by the pack's own mark) complements — only
  // their meaning_<code>, by the card's row numbers (meaning-display.js packByMarks); a row without it is kept empty
  const KEEP = code => [`translation_${code}`, "extra_meanings", "reflexive", "form_translations", "collective", "_src_reader", "complements"];
  const keepField = (code, k, v) => k === "complements" && Array.isArray(v) ? v.map(x => x && typeof x === "object" && x[`meaning_${code}`] ? {[`meaning_${code}`]:x[`meaning_${code}`]} : {}) : v;
  // one card file: {id: fields} with only the fields the popup reads, into map; false when it could not be read
  function readOwnFile(code, file, version, map) {
    return dataFetch(new URL(`../../lang/${code}/${file}${version ? `?v=${encodeURIComponent(version)}` : ""}`, script))
      .then(r => { if (!r.ok) throw new Error("Pack card texts unavailable"); return r.json(); })
      .then(part => { if (!part || typeof part !== "object" || Array.isArray(part)) return false;
        for (const [id, fields] of Object.entries(part))
          if (fields && typeof fields === "object") map.set(id, Object.fromEntries(KEEP(code).filter(k => k in fields).map(k => [k, keepField(code, k, fields[k])])));
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
  // (19.11.2026) meanings by their number: the resolver's text for this place made of whole meanings of the card («; » between them),
  // in any order, the Russian at the same numbers; the pack's text has as many meanings as the English — its meanings at those numbers.
  // Otherwise "" (the English with the mark; a pack whose meanings are counted otherwise needs a field of correspondence — main chat).
  // (split at «;» outside brackets — as meaning-display.js meaningParts: «to cover (with something; a roof)» is one meaning; review A 19.11)
  const meaningsOf = text => { const out = []; let depth = 0, cur = "";
    for (const ch of String(text || "")) { if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === ";" && !depth) { out.push(cur); cur = ""; } else cur += ch; }
    out.push(cur); return out.map(m => m.trim()).filter(Boolean); };
  function byNumber(shown, item, packText) {
    const en = meaningsOf(item?.translation_en), mine = meaningsOf(packText), part = meaningsOf(shown?.en);
    if (!part.length || en.length < 2 || mine.length !== en.length) return "";
    const at = part.map(m => en.indexOf(m));
    if (at.some(i => i < 0) || new Set(at).size !== at.length) return "";
    // (the card's Russian counted as the English one — as meaning-display.js byNumber; review B 19.11)
    const ru = meaningsOf(item.translation_ru), partRu = meaningsOf(shown?.ru);
    if (ru.length && ru.length !== en.length) return "";
    if (partRu.length && (partRu.length !== part.length || partRu.some((m, k) => ru[at[k]] !== m))) return "";
    return at.map(i => mine[i]).join("; ");
  }
  // (19.11.2026, with the TODO of the numerals) a numeral the resolver wrote itself (numeral-generated: «2000», «4th», «for the 3rd
  // time»): digits are the same in every language; an ordinal — the pack's line for the template with the number in its place (the
  // pairs NUMERAL_TEMPLATES below, in reader.json — dev/lang/scan-reader.cjs); none → English with the mark
  const NUMERAL_TEMPLATES = Object.freeze({ordinal:["{0}-й", "{0}th"], time:["в {0}-й раз", "for the {0}th time"]});
  // («for the first time» is a pair the resolver writes itself — lemma-resolver.js — and has its line in reader.json already)
  function numeralText(item, code) {
    if (!item || typeof item.id !== "string" || !item.id.startsWith("numeral-generated:") || !item.grammar?.generated) return "";
    const en = String(item.translation_en || ""), value = item.grammar.value;
    if (/^\d+$/u.test(en)) return en;
    const kind = /^\d+(?:st|nd|rd|th)$/u.test(en) ? "ordinal" : en === "for the first time" ? "first" : /^for the \d+(?:st|nd|rd|th) time$/u.test(en) ? "time" : "";
    if (kind === "first") return phrase(code, "for the first time", "впервые (в 1-й раз)");
    const [ru, tpl] = NUMERAL_TEMPLATES[kind] || [];
    const own = kind ? phrase(code, tpl, ru) : "";
    return own ? own.replace(/\{0\}/gu, String(value)) : "";
  }
  // (19.11.2026, chat «languages in the reader»; user: no English without the mark, a text of the pack where one can be) the texts the
  // resolver writes itself around a word (lemma-resolver.js; «dynamic» of dev/lang/reader-source.json): their pair in reader.json with
  // places {0}, {1} — the words, as they stand in the English (and in the Russian at the same places); none → English with the mark
  const RESOLVER_TEMPLATES = Object.freeze([
    ["относящийся к {0}", "of/from {0}"],
    ["субстантивированный инфинитив от «{0}»", "nominalized infinitive of “{0}”"],
    ["часть слова: {0}… — конец как в {1}", "part of a word: {0}… — ending as in {1}"]]);
  const templateRe = t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/\\\{(\d)\\\}/gu, "(.+?)")}$`, "u");
  function resolverText(translation, code) {
    const en = String(translation?.en || ""), ru = String(translation?.ru || "");
    for (const [ruT, enT] of RESOLVER_TEMPLATES) {
      const m = templateRe(enT).exec(en), r = templateRe(ruT).exec(ru);
      // (the words at the same places in both: a text written by this rule, not a dictionary gloss that happens to look like it)
      if (!m || !r || m.slice(1).join("\u0000") !== r.slice(1).join("\u0000")) continue;
      const own = phrase(code, enT, ruT);
      return own ? own.replace(/\{(\d)\}/gu, (_, i) => m[+i + 1] ?? "") : "";
    }
    return "";
  }
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
    if (!mine.length && !contractions.length && !resolution.candidates.some(c => c && (c.genderPair || !c.item && c.construction?.id === "reflexive-verb"))) return;
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
      // (19.11.2026, advisor: by the number of the meaning) the resolver showed some meanings of the card for this place (mögen «may,
      // might (possibility); to like», lassen «(with an infinitive) …»): each of them is a meaning of the card's English (and its Russian
      // one of the card's Russian at the same place); the pack's card has as many meanings — the pack's meanings with those numbers
      else if (main && !c.translation?.[code]) { const picked = byNumber(c.translation, c.item, main); if (picked) c.translation = {...c.translation, [code]:picked}; }
      // a form of the card (alles on the alle card, zu zweit — collective): its own pack text, found by the form's English text
      const ft = c.formTranslation;
      if (ft && !ft[code]) {
        const at = (c.item.form_translations || []).findIndex(r => r && r.form === ft.form && same(r.en, ft.en));
        const text = at >= 0 ? fields.form_translations?.[at]?.[code] : c.item.collective && same(c.item.collective.en, ft.en) ? fields.collective?.[code] : "";
        if (String(text || "").trim()) c.formTranslation = {...ft, [code]:String(text).trim()};
      }
    }
    // (19.11.2026) a reflexive use of a verb read from the external dictionary (Hüte dich!) whose «sich X» field is its own card's
    // (meaning-display.js: ownItem by the lemma): that card's pack texts, kept apart from packItem — the candidate is not that card
    for (const c of resolution.candidates) {
      if (!c || c.item || c.construction?.id !== "reflexive-verb" || typeof entryOf !== "function") continue;
      let item = null; try { item = entryOf({word:String(c.lemma || "").replace(/^sich\s+/u, ""), type:"Verb"}); } catch (_) { item = null; }
      const fields = item && typeof item.id === "string" ? texts.get(item.id) : null;
      if (!fields || typeof fields !== "object" || typeof fields._src_reader === "string" && outdated(fields._src_reader, item)) continue;
      c.packOwnVerb = {...(c.packOwnVerb || {}), [code]:{id:item.id, fields}};
    }
    // (19.11.2026) a der/die card of two gender records (den Kranken, der/die Tote — resolver genderPair): the other record's pack text
    // (its own card by id; a text translated from another English or an outdated print — none, both stay English as before)
    for (const c of resolution.candidates) {
      const pair = c.genderPair;
      if (!pair || typeof pair !== "object" || pair.dictionaryId == null || pair.translation?.[code] || typeof entryOf !== "function") continue;
      let item = null; try { item = entryOf({id:pair.dictionaryId}); } catch (_) { item = null; }
      const fields = item && typeof item.id === "string" ? texts.get(item.id) : null;
      if (!fields || typeof fields !== "object" || typeof fields._src_reader === "string" && outdated(fields._src_reader, item)) continue;
      const main = String(fields[`translation_${code}`] || "").trim();
      if (main && same(pair.translation?.en, item.translation_en)) c.genderPair = {...pair, translation:{...(pair.translation || {}), [code]:main}};
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
  // (18.11.2026, advisor: each part in the pack) a word read by its parts (candidate.formation: a compound, a diminutive, a derivation,
  // a particle verb): every part's text in this language — an own card's pack text (its "_src_reader" of the English shown) or the pack
  // dictionary's record of the part; none → nothing (meaning-display shows the English with the mark). The formation is copied, never
  // changed in place (the resolver keeps it): part.pack[code] / verb.translation[code].
  async function enrichParts(resolution, code, entryOf) {
    const formed = resolution.candidates.filter(c => c && c.formation && typeof c.formation === "object" && c.formation.kind !== "name");
    // (19.11.2026) an external verb shown by its parts (G47, the resolver's directionalSimple card): its parts as a particle verb's — on a copy
    const simple = resolution.candidates.filter(c => c && c.directionalSimple && typeof c.directionalSimple === "object" && c.directionalSimple.formation?.kind === "particle-verb");
    // (19.11.2026, advisor: ENGLISH_BY_PARTS) an external particle verb whose English text the resolver built from its parts keeps that
    // reading (candidate.englishByParts — the resolver's formation object): its verb lines take the pack's text as a particle verb's do
    const byEnglishParts = resolution.candidates.filter(c => c && c.englishByParts && typeof c.englishByParts === "object" && c.englishByParts.kind === "particle-verb");
    // (19.11.2026) a nominalized word of an own card (der Alte — alt adjective-001, das Laufen — laufen): the pack text of that card
    // (usage.baseText[code]; meaning-display.js «Od alt — stary»)
    const nominal = resolution.candidates.filter(c => c && c.usage?.role === "nominalized" && c.usage.baseDictionaryId != null && !c.usage.baseText?.[code]);
    if (!formed.length && !byEnglishParts.length && !simple.length && !nominal.length && !resolution.candidates.some(c => c && c.formOf)) return;
    // (the same deadline as the own cards — counted from the start of their load: the first tap never waits for all of them)
    const load = ownTexts(code).catch(() => null), left = (ownStarted.get(code) || 0) + OWN_WAIT_MS - Date.now();
    const texts = await (typeof setTimeout === "function" ? Promise.race([load, new Promise(resolve => setTimeout(() => resolve(null), Math.max(0, left)))]) : load);
    const ownText = (id, english) => {
      if (id == null || typeof entryOf !== "function" || !texts) return "";
      let item = null; try { item = entryOf({id}); } catch (_) { item = null; }
      const fields = item && typeof item.id === "string" ? texts.get(item.id) : null;
      if (!fields || typeof fields._src_reader === "string" && outdated(fields._src_reader, item)) return "";
      return same(english, item.translation_en) ? String(fields[`translation_${code}`] || "").trim() : "";
    };
    for (const c of nominal) {
      let item = null; try { item = typeof entryOf === "function" ? entryOf({id:c.usage.baseDictionaryId}) : null; } catch (_) { item = null; }
      const t = item ? ownText(item.id, item.translation_en) : "";
      if (t) c.usage = {...c.usage, baseText:{...(c.usage.baseText || {}), [code]:t}};
    }
    // (review C 18.11: a part's dictionary record under a deadline too — a stalled pack dictionary must not hold the popup; English then)
    const partsUntil = Date.now() + OWN_WAIT_MS;
    const dictionaryText = async (lemma, pos) => {
      try {
        const asked = lookup(lemma, pos, code).then(r => r ? r.meanings.join("; ") : "", () => "");
        return typeof setTimeout === "function" ? await Promise.race([asked, new Promise(resolve => setTimeout(() => resolve(""), Math.max(0, partsUntil - Date.now())))]) : await asked;
      } catch (_) { return ""; }
    };
    const partText = async p => !p || typeof p !== "object" ? "" :
      ownText(p.dictionaryId, p.en) || (p.source !== "main" && p.lemma && p.pos ? await dictionaryText(p.lemma, p.pos) : "");
    const withPack = async p => { if (!p || typeof p !== "object") return p; const t = await partText(p); return t ? {...p, pack:{...(p.pack || {}), [code]:t}} : p; };
    // (advisor 19.11) «form of X» (resolver: candidate.formOf) — the base's pack text: its own card, else the pack dictionary's record
    await Promise.all(resolution.candidates.filter(c => c && c.formOf && typeof c.formOf === "object" && !c.formOf.text?.[code]).map(async c => {
      const t = ownText(c.formOf.dictionaryId, c.formOf.text?.en) || (c.formOf.dictionaryId == null ? await dictionaryText(c.formOf.base, c.formOf.pos) : "");
      if (t) c.formOf = {...c.formOf, text:{...(c.formOf.text || {}), [code]:t}};
    }));
    // a verb line: its own card's pack text, else the pack dictionary's record (a text the resolver chose stays English)
    const verb = async v => { if (!v || typeof v !== "object" || v.translation?.[code]) return v;
      const t = ownText(v.dictionaryId ?? v.item?.id, v.translation?.en) || (v.source !== "main" && v.lemma ? await dictionaryText(v.lemma, "verb") : "");
      return t ? {...v, translation:{...(v.translation || {}), [code]:t}} : v; };
    // (the particle: its line of reader.json, looked up when the card is drawn — meaning-display.js particleVerbLines; review A/B:
    // reader.json may arrive after this step)
    // (19.11: a particle whose text is its own card's — fort, the resolver's CARD_PARTICLE_LINES — takes that card's pack text; a line of
    // reader.json for the pair goes first, meaning-display.js particleVerbLines)
    const particle = p => { if (!p || typeof p !== "object" || p[code] || !p.form || !p.en || typeof entryOf !== "function") return p;
      let item = null; try { item = entryOf({word:p.form, type:"Adverb"}); } catch (_) { item = null; }
      const t = item ? ownText(item.id, p.en) : ""; return t ? {...p, [code]:t} : p; };
    const verbLines = async f => { const verbs = Array.isArray(f.verbs) ? await Promise.all(f.verbs.map(verb)) : null;
      return {...f, ...(f.particle ? {particle:particle(f.particle)} : {}), ...(f.verb ? {verb:await verb(f.verb)} : {}), ...(verbs ? {verbs} : {})}; };
    await Promise.all(byEnglishParts.map(async c => { c.englishByParts = await verbLines(c.englishByParts); }));
    await Promise.all(simple.map(async c => { c.directionalSimple = {...c.directionalSimple, formation:await verbLines(c.directionalSimple.formation)}; }));
    await Promise.all(formed.map(async c => {
      const f = c.formation;
      if (f.kind === "particle-verb") { c.formation = await verbLines(f); return; }
      const parts = Array.isArray(f.parts) ? await Promise.all(f.parts.map(withPack)) : null;
      c.formation = {...f, ...(parts ? {parts} : {}), ...(f.base ? {base:await withPack(f.base)} : {})};
    }));
  }
  // entryOf (optional; not «lookup» — that is the external dictionary's function above): the reader's own card by id ({id} → card) — for the contractions above
  async function enrich(resolution0, code, entryOf = null) {
    if (!valid(code) || !resolution0 || !Array.isArray(resolution0.candidates)) return resolution0;
    // (19.11.2026, chat «languages in the reader») the card shown may be the resolver's copy of a candidate, not in the list (a Perfekt
    // group: gefahren, getaucht, verbrannt — selected / preferred carry the construction): it takes the pack's texts as the list does.
    // The resolution itself is returned unchanged in shape; only the copy's fields are filled.
    const extra = [resolution0.selected, resolution0.preferred].filter((c, i, all) => c && typeof c === "object" && !resolution0.candidates.includes(c) && all.indexOf(c) === i);
    const resolution = extra.length ? {...resolution0, candidates:[...resolution0.candidates, ...extra]} : resolution0;
    const phrases = readerPhrases(code);
    const own = enrichOwn(resolution, code, entryOf).catch(() => { /* the own cards stay English */ });
    const pending = new Map();
    // (not a candidate with an explanation — a contraction im = in + dem, a superlative: its text is the resolver's, from the word it
    // explains; the dictionary's own record of «im» is a form note, «in dem». As the Russian dictionary: lemma-resolver.js enriches
    // the candidates without an explanation only.)
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.explanation && !c.translation?.[code]).map(async candidate => {
      // (the gender of the card: its article — the resolver's G16 nounArticle — or its noun phrase when it names one gender (sure))
      const genders = [...new Set((candidate.nounPhrase || []).map(p => p?.gender).filter(Boolean))];
      const sure = {der:"m", die:"f", das:"n"}[candidate.nounArticle] ||
        (genders.length === 1 ? {masculine:"m", feminine:"f", neuter:"n"}[genders[0]] : null) || null;
      // (advisor 22.11) the gender the resolver chose by the determiner (genderChoice — one choice for every language) comes first; the
      // linked eine of 17.11 was such a choice of its own and is now the resolver's (externalGenderAgreement)
      const strict = /^[mfn]$/u.test(String(candidate.genderChoice || ""));
      const gender = strict ? candidate.genderChoice : sure, weak = false;
      const homonyms = strict && Array.isArray(candidate.genderHomonyms) ? candidate.genderHomonyms : null;
      const key = JSON.stringify([candidate.lemma, posOf(candidate.pos), gender, weak, strict, homonyms]);
      if (!pending.has(key)) pending.set(key, lookup(candidate.lemma, candidate.pos, code, gender, weak, strict, homonyms));
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
    // (19.11.2026) a nominalized adjective whose meaning is an outside noun of it (die Alte «old woman» — usage.noun): that noun's record
    // in the pack dictionary (the popup and its reference alike; none — English with the mark, as before)
    await Promise.all(resolution.candidates.filter(c => c && c.usage?.role === "nominalized" && c.usage.noun?.translation?.en && !c.usage.noun.translation[code]).map(async c => {
      const noun = c.usage.noun, base = String(noun.lemma || c.lemma || "");
      if (!base) return;
      const key = JSON.stringify([base, "noun", null, false]);
      if (!pending.has(key)) pending.set(key, lookup(base, "noun", code, null, false));
      const asked = pending.get(key).catch(() => null), until = Date.now() + OWN_WAIT_MS;
      const result = typeof setTimeout === "function" ? await Promise.race([asked, new Promise(resolve => setTimeout(() => resolve(null), Math.max(0, until - Date.now())))]) : await asked;
      const text = Array.isArray(result?.meanings) ? result.meanings.join("; ").trim() : "";
      if (text) c.usage = {...c.usage, noun:{...noun, translation:{...noun.translation, [code]:text}}};
    }));
    // (19.11.2026) an own verb card whose reflexive meanings the resolver took from the English external dictionary (reflexiveMarks.en —
    // sich holen «to get, to cop», sich denken «to imagine»): the pack dictionary's marks of the same verb (a word it does not know or
    // without marks — the English ones with the mark, as before; the choice is the English marks', meaning-display.js)
    await Promise.all(resolution.candidates.filter(c => c && c.source !== "fallback" && c.reflexiveMarks?.en && !c.reflexiveMarks[code]).map(async c => {
      const base = String(c.lemma || "").replace(/^sich\s+/u, "");
      const key = JSON.stringify([base, "verb", null, false]);
      if (!pending.has(key)) pending.set(key, lookup(base, "verb", code, null, false));
      // (review A 19.11: under the deadline of the own cards — a stalled pack dictionary does not hold an own card's popup)
      const asked = pending.get(key).catch(() => null), until = Date.now() + OWN_WAIT_MS;
      const result = typeof setTimeout === "function" ? await Promise.race([asked, new Promise(resolve => setTimeout(() => resolve(null), Math.max(0, until - Date.now())))]) : await asked;
      if (result?.reflexive) c.reflexiveMarks = {...c.reflexiveMarks, [code]:result.reflexive};
    }));
    await own;
    // (the parts after the own cards: their texts are read; a part's dictionary record — as the external words above)
    await enrichParts(resolution, code, entryOf).catch(() => { /* the parts stay English */ });
    // (the phrases under the same deadline as the card texts, counted from the start of their load: later — English phrases for this
    // tap, the next taps have them; review B Ч4)
    const phrasesLeft = (phraseStarted.get(code) || 0) + OWN_WAIT_MS - Date.now();
    await (typeof setTimeout === "function" ? Promise.race([phrases, new Promise(resolve => setTimeout(resolve, Math.max(0, phrasesLeft)))]) : phrases);
    // (19.11.2026) a numeral the resolver wrote itself: digits as they are, an ordinal by the pack's template
    for (const candidate of resolution.candidates) {
      if (candidate.translation?.[code] || !candidate.item || !same(candidate.translation?.en, candidate.item.translation_en)) continue;
      const own = numeralText(candidate.item, code);
      if (own) candidate.translation = {...candidate.translation, [code]:own};
    }
    // (Ч4) a text the resolver wrote as a pair {ru, en} for this place («здесь: …», a form of the card): its line in reader.json
    for (const candidate of resolution.candidates) for (const field of ["translation", "formTranslation"]) {
      const value = candidate[field];
      if (!value || typeof value !== "object" || value[code] || typeof value.en !== "string" || typeof value.ru !== "string") continue;
      const fixed = phrase(code, value.en, value.ru), templated = fixed ? "" : resolverText(value, code), own = fixed || templated;
      if (own) candidate[field] = {...value, [code]:own};
      // (advisor 20.11) a text of a resolver template around the word (… od {0}) is the resolver's label in the pack, not a meaning:
      // meaning-display.js lets the word's own parts / base show (Herumwandern)
      if (templated && field === "translation") candidate.packTemplate = {...(candidate.packTemplate || {}), [code]:true};
    }
    return resolution0;
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
