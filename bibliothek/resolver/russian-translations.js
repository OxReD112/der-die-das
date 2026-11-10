/* Translation enrichment only: never creates or ranks lemma candidates. */
(() => {
  "use strict";
  // 07.11.2026: versioned data files go through the reader's data cache (resolver/data-cache.js); without it — plain fetch
  const dataFetch = (input, options) => (typeof window !== "undefined" && window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
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
  // Whole words of the Russian dictionary that the English one has no record of (speed chat 10.11.2026, advisor + user;
  // claude/RU_DICT_IN_PARSING_COST_2026-11-10_RU.md): a Bloom filter, dev/bibliothek/scripts/build-ru-whole-words.cjs.
  // hasWhole(word, language) -> Promise<boolean>: «maybe» — the Russian record may then be asked (lookup); false — surely
  // not. Only the Russian interface: for another language false, and nothing is downloaded. The file (~73 KB gzip) is read
  // once, at the first question. No reader code asks it yet (the second resolver chat decides where).
  const wholeWordsUrl = new URL("data/ru-whole-words.json?v=20261110-ru-whole-1", document.currentScript.src);
  let wholeWords = null;
  // Version in the data addresses (26.10.2026): the reader's data cache (bibliothek/dictionary-cache-sw.js) keeps a
  // versioned file for good — a changed part or manifest needs a new version here (dev/bibliothek/tools/data-versions.json).
  const version = "1024-2";
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
      const request = dataFetch(new URL(`parts/${String(index).padStart(4,"0")}.json?v=${version}`,base))
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
    if (!hiddenPromise) hiddenPromise = dataFetch(hiddenUrl).then(r => { if (!r.ok) throw new Error("Hidden sense list unavailable"); return r.json(); })
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
    if (!abbreviationsPromise) abbreviationsPromise = dataFetch(new URL(`manifest.json?v=${version}`, base)).then(r => { if (!r.ok) throw new Error("manifest"); return r.json(); })
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
      const labels = {}, shown = [], reflexive = {}, names = new Set();
      const entries = matched.map(row => ({recordId:row.record_id,word:row.word,pos:row.pos,sourceUrl:row.source_url,
        senses:row.senses.filter(s => s.display_status === "translation" && Array.isArray(s.data?.glosses))
          .map(s => ({senseIndex:s.sense_index,sourceId:s.data.id,glosses:s.data.glosses.map((g,i) => {
              if (typeof g !== "string" || !g.trim()) return "";
              const source = withoutHiddenParts(g,row.word,row.pos,hidden);
              if (!source) return "";
              // 27.10.2026 (reflexive marks, 2f3859a): [gloss index, acc / dat / opt, pattern] — the meaning used with sich
              const rm = (Array.isArray(s.reflexive) ? s.reflexive : []).find(r => Array.isArray(r) && r[0] === i && ["acc","dat","opt"].includes(r[1]));
              if (rm && !(source in reflexive)) reflexive[source] = rm[1];
              const mark = (Array.isArray(s.labels) ? s.labels : []).find(l => Array.isArray(l) && l[0] === i && Number.isInteger(l[1]) && Array.isArray(l[2]));
              const cut = mark && mark[1] > 0 && mark[1] < g.length ? cutLeadingLabels(g.slice(mark[1]).trim(), known) : {text:g, codes:[]};
              const text = withoutHiddenParts(cut.text,row.word,row.pos,hidden);
              if (text) {
                shown.push(text);
                // (advisor 06.11) a sense the source marks as a name (name_like: Runkel «Рункель», a town; Braun «Браун (фамилия)»)
                if (Array.isArray(s.name_like) && s.name_like.length) names.add(text);
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
          ...(Object.keys(reflexive).length ? {reflexive} : {}),
          ...(names.size ? {names:[...names]} : {}),
          ...(labelled ? {labels, shown:[...new Set(shown)], domains:known.domains || {}} : {})};
      }
    }
    return null;
  }
  async function enrich(resolution, language) {
    observe('enrich-start', {language,candidates:resolution.candidates.length});
    if (language !== "ru") {observe('enrich-end', {language});return resolution;}
    const pending = new Map();
    // (advisor 08.11) an abbreviation written in capitals (USA, DDR, UFO, BMW): the Russian dictionary keeps it in capitals
    // (USA «США», DDR «ГДР», UFO «НЛО») as a noun or an abbreviation; the outside record is lowercase (usa, a name or a noun).
    // The Russian line is shown; a name without one stays as before (rule 19.10).
    const form = String(resolution.form || "").normalize("NFC");
    // (not inside a run of words in capitals — KOMMT UND SEHT EUCH DIESE SCHLANGE AN!: the resolver marks it capsRun)
    if (/^[A-ZÄÖÜ]{2,}$/u.test(form) && !resolution.capsRun) await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.translation?.ru &&
        ["noun","name"].includes(String(c.pos || "")) && String(c.lemma || "").toLowerCase() === form.toLowerCase()).map(async candidate => {
      try {
        const result = await lookup(form,"noun") || await lookup(form,"abbrev");
        if (result) {
          candidate.translation = {...candidate.translation,ru:result.meanings.join("; ")};
          candidate.russianTranslation = result;
          candidate.abbreviationRu = true;
          if (result.labels) {
            candidate.meaningLabels = {...(candidate.meaningLabels || {}),ru:result.labels};
            candidate.labelledText = {...(candidate.labelledText || {}),ru:result.shown.join("; ")};
            candidate.labelDomains = result.domains;
          }
        }
      } catch (_) { /* optional */ }
    }));
    await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.translation?.ru).map(async candidate => {
      const key = JSON.stringify([candidate.lemma,posOf(candidate.pos)]);
      if (!pending.has(key)) pending.set(key,lookup(candidate.lemma,candidate.pos));
      try {
        const result = await pending.get(key);
        if (result) {
          candidate.translation = {...candidate.translation,ru:result.meanings.join("; ")};
          candidate.russianTranslation = result;
          if (result.reflexive) candidate.reflexiveMarks = {...(candidate.reflexiveMarks || {}),ru:result.reflexive};
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
    // #20 (advisor 05.11): a nominalized adjective (der / die Alte, etwas Gutes, ein Fremder) shows the Russian record of its
    // -e headword when there is one (Alte «старик; старуха», Gute «добро», Fremde «незнакомец») — the first sense of each
    // record, so neither gender hides the other; without one the card stays «Nomen · aus Adjektiv …».
    await Promise.all(resolution.candidates.filter(c => c.usage?.role === "nominalized" && c.usage.kind === "adjective" && c.usage.general === true && !c.usage.ownHeadword).map(async candidate => {
      const key = JSON.stringify([candidate.lemma,"noun"]);
      if (!pending.has(key)) pending.set(key,lookup(candidate.lemma,"noun"));
      try {
        // A noun of its own with this headword (die Weiche «стрелка; мягкость», die Schwere «тяжесть», der Junge «мальчик»:
        // the English record gives it a fixed article) is another word — etwas Weichem is «something soft», not «мягкость».
        const outside = window.DeutschFallbackDictionary?.lookup ? await window.DeutschFallbackDictionary.lookup(candidate.lemma).catch(() => []) : [];
        if ((outside || []).some(g => !g.kind && /^noun$/iu.test(String(g.pos || "")) && String(g.word || "").toLowerCase() === String(candidate.lemma).toLowerCase() && g.noun?.article)) return;
        const result = await pending.get(key);
        const ru = result ? [...new Set(result.entries.map(e => e.senses?.[0]?.glosses?.[0]).filter(Boolean))].join("; ") : "";
        if (ru) candidate.usage = {...candidate.usage,noun:{...(candidate.usage.noun || {lemma:candidate.lemma}),
          translation:{...(candidate.usage.noun?.translation || {}),ru}}};
      } catch (_) { /* optional */ }
    }));
    // 27.10.2026 (reflexive marks): our own verb card without the field `reflexive`, its sich linked but the meaning not proven —
    // the marks of the Russian record of the same verb (the card's own Russian text stays).
    await Promise.all(resolution.candidates.filter(c => c.source !== "fallback" && c.construction?.id === "reflexive-verb" &&
      !c.construction.lexicalSenseConfirmed && !c.item?.reflexive && !c.reflexiveMarks?.ru && /^verb$/iu.test(String(c.pos || ""))).map(async candidate => {
      const base = String(candidate.lemma || "").replace(/^sich\s+/u,""), key = JSON.stringify([base,"verb"]);
      if (!pending.has(key)) pending.set(key,lookup(base,"verb"));
      try { const result = await pending.get(key); if (result?.reflexive) candidate.reflexiveMarks = {...(candidate.reflexiveMarks || {}),ru:result.reflexive}; }
      catch (_) { /* optional */ }
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
    // (advisor + user 10.11) a whole Russian record of a word the English dictionary and our cards do not know — instead of a split
    // or «не нашёл», in the Russian interface only. A split keeps its gender and number (the Russian dictionary has neither) and
    // shows the record of its base form (Holzhackers — Holzhacker) of the same part of speech; a name split («Name / Nomen …»)
    // stays as it is. A word without any reading: the record of the part of speech its spelling allows (a capital — a noun
    // first; lowercase — not a noun). A record whose meanings are all names (Mölln «Мёльн») is not taken.
    const plainMeanings = r => r && r.meanings.filter(m => !(r.names || []).includes(m)).length ? r : null;
    await Promise.all(resolution.candidates.filter(c => c.formation?.kind === "compound" && !c.formation.maybeName && !c.wholeRu).map(async candidate => {
      const f = candidate.formation, word = String(f.lemma || ""), pos = posOf(f.pos);
      try {
        if (!word || !["noun","adj","verb"].includes(pos) || !(await hasWhole(word,"ru"))) return;
        const result = plainMeanings(await lookup(word,pos));
        if (result) candidate.wholeRu = {word,pos:f.pos,meanings:result.meanings,result};
      } catch (_) { /* optional */ }
    }));
    if (!resolution.candidates.length && resolution.status === "unresolved" && !resolution.error && !(resolution.unresolvedMeanings || []).length && !resolution.wholeRu && !resolution.nameSign) {
      // (not a short word: »Ahm – Petunia …« is an interjection, not «ам» the old measure)
      const word = form.trim(), capital = /^\p{Lu}/u.test(word), lower = word.charAt(0).toLowerCase() + word.slice(1);
      const tries = capital ? [[word,"noun"],[lower,"adj"],[lower,"verb"],[lower,"adv"]] : [[word,"adj"],[word,"verb"],[word,"adv"]];
      try {
        for (const [spelling, pos] of word.length >= 4 ? tries : []) {
          if (!spelling || !(await hasWhole(spelling,"ru"))) continue;
          const result = plainMeanings(await lookup(spelling,pos));
          // (a place: every meaning a geographic one — Rotterdam «геогр. Роттердам (город в Нидерландах)» — is «Name», not «Nomen»)
          const place = pos === "noun" && result && result.meanings.every(m => /^геогр\./u.test(m));
          if (result) { resolution.wholeRu = {word:spelling,pos:place ? "Name" : {noun:"Nomen",adj:"Adjektiv",verb:"Verb",adv:"Adverb"}[pos],meanings:result.meanings,result}; break; }
        }
      } catch (_) { /* optional */ }
    }
    observe('enrich-end', {language});
    return resolution;
  }
  function hasWhole(word, language) {
    if (language !== "ru" || typeof word !== "string" || !word.trim()) return Promise.resolve(false);
    word = word.trim();
    if (!wholeWords) wholeWords = dataFetch(wholeWordsUrl).then(response => {
      if (!response.ok) throw new Error("Russian whole words unavailable");
      return response.json();
    }).then(data => {
      const m = data && data.format_version === 1 && data.membership;
      if (!m || m.format !== "bloom-fnv1a-v2-case" || !Number.isInteger(m.bits) || m.bits < 8 || (m.bits & (m.bits - 1)) !== 0 ||
          !Number.isInteger(m.hashes) || m.hashes < 1 || m.hashes > 32 || typeof m.bitmap !== "string" || m.bitmap.length !== m.bits / 4 || !/^[0-9a-f]+$/.test(m.bitmap))
        throw new Error("Invalid Russian whole words");
      const v = c => c < 58 ? c - 48 : c - 87, bits = new Uint8Array(m.bitmap.length >> 1);
      for (let i = 0; i < bits.length; i++) bits[i] = v(m.bitmap.charCodeAt(2 * i)) << 4 | v(m.bitmap.charCodeAt(2 * i + 1));
      return {size: m.bits, hashes: m.hashes, bits};
    }).catch(error => { wholeWords = null; throw error; });
    return wholeWords.then(f => {
      let h = 2166136261;
      for (const byte of new TextEncoder().encode(word.normalize("NFC"))) h = Math.imul(h ^ byte, 16777619) >>> 0;
      const step = ((Math.imul(h ^ 0x9e3779b9, 2246822519) >>> 0) >>> 13) | 1;   // (the high bits: build-ru-whole-words.cjs)
      for (let k = 0; k < f.hashes; k++) { const bit = (h + k * step) & (f.size - 1); if (!(f.bits[bit >>> 3] & (1 << (bit & 7)))) return false; }
      return true;
    }, () => true);   // (the filter missing: «maybe» — the caller asks the record itself, as without the filter)
  }
  window.BibliothekRussianTranslations = Object.freeze({lookup,enrich,hasWhole});
})();
