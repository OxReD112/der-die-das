/* Translation enrichment only: never creates or ranks lemma candidates. */
(() => {
  "use strict";
  let diagnosticPending = null;
  function observePending(pending) {
    if (typeof window.BibliothekAnalysisDiagnostics !== 'function') return;
    diagnosticPending ||= new WeakSet();
    diagnosticPending.add(pending);
    pending.then(() => diagnosticPending.delete(pending), () => diagnosticPending.delete(pending));
  }
  const cacheState = (cache, key) => !cache.has(key) ? 'miss'
    : diagnosticPending?.has(cache.get(key)) ? 'pending' : 'hit';
  function observe(type, detail = {}) {
    const sink = window.BibliothekAnalysisDiagnostics;
    if (typeof sink !== 'function') return;
    try { sink({component:'russian',type,
      time:typeof performance !== 'undefined' ? performance.now() : Date.now(),...detail}); } catch (_) {}
  }

  const base = new URL("../../open%20data/dictionary-de-ru-json/", document.currentScript.src);
  // D19 (16.10.2026): bounded like the parts in fallback-dictionary.js; an
  // evicted part is requested again when needed (same file, same result).
  const partLimit = 60;
  function keepPart(key, value) {
    cache.delete(key); cache.set(key, value);
    while (cache.size > partLimit) cache.delete(cache.keys().next().value);
    return value;
  }
  const cache = new Map();
  const posAliases = {Verb:"verb",Nomen:"noun",Adjektiv:"adj",Adverb:"adv",Pronomen:"pron",Konjunktion:"conj",
    adjective:"adj",adverb:"adv",pronoun:"pron",conjunction:"conj"};
  const posOf = value => posAliases[value] || value;
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function records(word) {
    const index = partition(word);
    observe('partition-cache', {cache:'russian',key:index,word,state:cacheState(cache,index),size:cache.size});
    if (!cache.has(index)) {
      const request = fetch(new URL(`parts/${String(index).padStart(4,"0")}.json`,base))
        .then(response => {
          if (!response.ok) throw new Error("Russian translations unavailable");
          return response.json();
        }).then(data => {
          if (data.format_version !== 1 || data.partition !== index || !data.records || typeof data.records !== "object")
            throw new Error("Invalid Russian translation partition");
          return data.records;
        }).catch(error => { if (cache.get(index) === request) cache.delete(index); throw error; });
      observePending(request);
      keepPart(index,request);
    } else keepPart(index,cache.get(index));
    const data = await cache.get(index);
    return Object.prototype.hasOwnProperty.call(data,word) ? data[word] : [];
  }
  // G45 (22.10.2026, user): parts of a Russian translation never shown (Dirne «проститутка» — Grimm's Dirne is «девушка»);
  // the same data file as the external hidden senses. Without the list every translation is shown as before.
  const hiddenUrl = new URL("data/fallback-hidden-senses.json?v=20261022-nm-1", document.currentScript.src);
  let hiddenPromise = null;
  function hiddenParts() {
    if (!hiddenPromise) hiddenPromise = fetch(hiddenUrl).then(r => { if (!r.ok) throw new Error("Hidden sense list unavailable"); return r.json(); })
      .then(d => new Map((Array.isArray(d?.ru_entries) ? d.ru_entries : [])
        .filter(r => Array.isArray(r) && r.slice(0,3).every(v => typeof v === "string"))
        .map(([w,pos,part]) => [`${w}\u0000${pos}\u0000${part.trim()}`,true])))
      .catch(() => { hiddenPromise = null; return new Map(); });
    return hiddenPromise;
  }
  const withoutHiddenParts = (gloss, word, pos, hidden) => !hidden.size ? gloss :
    gloss.split(";").filter(part => !hidden.has(`${word}\u0000${pos}\u0000${part.trim()}`)).join(";").trim();
  // Review 22.10: the source cut stops at the first word it does not know (исч. и неисч. пепел, перен., разг., часто ирон. ангел,
  // поэт., тж. пренебр. музыкант). The rest of a leading run of label abbreviations (manifest labels.codes) with the
  // connectors и / или / тж. / часто / особ. is cut here too; its known labels join the sense's codes.
  let abbreviationsPromise = null;
  function abbreviations() {
    if (!abbreviationsPromise) abbreviationsPromise = fetch(new URL("manifest.json", base)).then(r => { if (!r.ok) throw new Error("manifest"); return r.json(); })
      .then(m => { const codes = m?.labels?.codes || {}, all = new Map(Object.values(codes).flatMap(group => Object.entries(group)));
        // the first abbreviation of each domain code — the card shows domains the resolver has no table for (сексол., карт.)
        all.domains = {}; for (const [abbr,code] of Object.entries(codes.domain || {})) if (!(code in all.domains)) all.domains[code] = abbr;
        return all; })
      .catch(() => { abbreviationsPromise = null; return new Map(); });
    return abbreviationsPromise;
  }
  const CONNECTORS = new Set(["и","или","тж.","также","часто","особ.","в","обычно"]);
  function cutLeadingLabels(text, known) {
    let rest = text, codes = [];
    for (;;) {
      const m = /^([^\s,]+(?:\s(?:ч\.|ед\. ч\.|мн\. ч\.))?)[,\s]+/u.exec(rest);
      if (!m) break;
      const word = m[1], code = known.get(word);
      if (code) { codes.push(code); rest = rest.slice(m[0].length); continue; }
      // a connector counts only when a known abbreviation follows it (в особ. южн. stays: «южн.» is unknown)
      const linking = w => CONNECTORS.has(w) || /^\([^()]*\)$/u.test(w);
      if (linking(word)) {
        // a run of connectors / bracketed notes counts only when a known abbreviation ends it (в особ. южн. stays)
        let ahead = rest.slice(m[0].length), next;
        while ((next = /^([^\s,]+)[,\s]+/u.exec(ahead)) && linking(next[1])) ahead = ahead.slice(next[0].length);
        if (next && known.has(next[1])) { rest = ahead; continue; }
      }
      break;
    }
    return rest.trim() && rest !== text ? {text:rest.trim(), codes} : {text, codes:[]};
  }
  async function lookup(lemma, partOfSpeech) {
    const word = String(lemma || "").normalize("NFC").trim(), pos = posOf(partOfSpeech);
    if (!word || !pos) return null;
    // English noun keys are often lowercase. Only nouns may use an initial
    // capital alias; never casefold the entire Russian dictionary or merge POS.
    const spellings = [...new Set(pos === "noun"
      ? [word.charAt(0).toUpperCase() + word.slice(1),word]
      : [word,word.toLowerCase()])];
    for (const spelling of spellings) {
      const matched = (await records(spelling)).filter(row => row.word === spelling && row.pos === pos);
      const hidden = matched.length ? await hiddenParts() : new Map();
      const known = matched.some(row => row.senses.some(s => Array.isArray(s.labels) && s.labels.length)) ? await abbreviations() : new Map();
      // G45 (2), reference 2.A (user 22.10): a label at the start of a gloss (G17, a706d75: [gloss index, cut, codes]) is shown
      // apart from the text. The stored translation keeps the source gloss (derived lines, der/die pairs, Wortschatz keep
      // their inline label, review 22.10); `shown` is the gloss without its labels for the card, `labels` its codes.
      const labels = {}, shown = [];
      const entries = matched.map(row => ({recordId:row.record_id,word:row.word,pos:row.pos,sourceUrl:row.source_url,
        senses:row.senses.filter(s => s.display_status === "translation" && Array.isArray(s.data?.glosses))
          .map(s => ({senseIndex:s.sense_index,sourceId:s.data.id,glosses:s.data.glosses.map((g,i) => {
              if (typeof g !== "string" || !g.trim()) return "";
              const source = withoutHiddenParts(g,row.word,row.pos,hidden);
              if (!source) return "";
              const mark = (Array.isArray(s.labels) ? s.labels : []).find(l => Array.isArray(l) && l[0] === i && Number.isInteger(l[1]) && Array.isArray(l[2]));
              const cut = mark && mark[1] > 0 && mark[1] < g.length ? cutLeadingLabels(g.slice(mark[1]).trim(), known) : {text:g, codes:[]};
              const text = withoutHiddenParts(cut.text,row.word,row.pos,hidden);
              if (text) {
                shown.push(text);
                // The first gloss with this text decides (Zunge: «анат. язык» before «кулин. язык» — one key «язык»).
                if (!(text in labels)) labels[text] = mark ? [...new Set([...mark[2],...cut.codes])] : [];
              }
              return source;
            }).filter(Boolean)}))
          .filter(s => s.glosses.length)})).filter(row => row.senses.length);
      if (entries.length) {
        const labelled = Object.values(labels).some(codes => codes.length);
        return {language:"ru",source:"Russian Wiktionary / Kaikki.org",entries,
          meanings:[...new Set(entries.flatMap(row => row.senses.flatMap(s => s.glosses)))],
          ...(labelled ? {labels, shown:[...new Set(shown)], domains:known.domains || {}} : {})};
      }
    }
    return null;
  }
  async function enrich(resolution, language) {
    observe('enrich-start', {language,candidates:resolution.candidates.length});
    if (language !== "ru") {observe('enrich-end', {language});return resolution;}
    const pending = new Map();
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.translation?.ru).map(async candidate => {
      const key = JSON.stringify([candidate.lemma,posOf(candidate.pos)]);
      if (!pending.has(key)) pending.set(key,lookup(candidate.lemma,candidate.pos));
      try {
        const result = await pending.get(key);
        if (result) {
          candidate.translation = {...candidate.translation,ru:result.meanings.join("; ")};
          candidate.russianTranslation = result;
          if (result.labels) {
            candidate.meaningLabels = {...(candidate.meaningLabels || {}),ru:result.labels};
            candidate.labelledText = {...(candidate.labelledText || {}),ru:result.shown.join("; ")};
            candidate.labelDomains = result.domains;
          }
        }
      } catch (_) {
        // An optional translation failure cannot turn a resolved English word
        // into a lookup failure or alter a saved choice.
        candidate.russianTranslationError = "unavailable";
      }
    }));
    // 21.10.2026 (to-do «aus Verb»): a general nominalized infinitive / adjective (das Rieseln, ein Splittern) built
    // from an external base word carries only «субстантивированный инфинитив от «rieseln»» — the base word's Russian
    // meaning is added after the colon, as for a base with a Russian value (meaning-display reads the part after «: »).
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && c.usage?.role === "nominalized" && c.usage.general === true &&
      !c.usage.baseDictionaryId && c.usage.base && !/:\s*\S/u.test(String(c.translation?.ru || ""))).map(async candidate => {
      const basePos = candidate.usage.kind === "infinitive" ? "verb" : "adj";
      // The noun's own Russian record first (das Kratzen «скрип»), then the base word.
      const nounKey = JSON.stringify([candidate.lemma,"noun"]), key = JSON.stringify([candidate.usage.base,basePos]);
      if (!pending.has(nounKey)) pending.set(nounKey,lookup(candidate.lemma,"noun"));
      if (!pending.has(key)) pending.set(key,lookup(candidate.usage.base,basePos));
      try {
        const result = await pending.get(nounKey).catch(() => null) || await pending.get(key);
        if (result) {
          const label = String(candidate.translation?.ru || "").replace(/:\s*$/u,"") ||
            (candidate.usage.kind === "infinitive" ? `субстантивированный инфинитив от «${candidate.usage.base}»` : `субстантивированное прилагательное от «${candidate.usage.base}»`);
          candidate.translation = {...candidate.translation,ru:`${label}: ${result.meanings.join("; ")}`};
          candidate.russianTranslation = result;
        }
      } catch (_) { candidate.russianTranslationError = "unavailable"; }
    }));
    observe('enrich-end', {language});
    return resolution;
  }
  window.BibliothekRussianTranslations = Object.freeze({lookup,enrich});
})();
