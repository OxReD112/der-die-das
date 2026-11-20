/* Presentation groups only: dictionary identities remain available for corrections. */
(() => {
  const norm = value => String(value || '').normalize('NFC').toLowerCase().trim();
  // Lists cleanup step 2, batch 11 (25.10.2026): the German label of a candidate's part-of-speech code (verb → Verb …),
  // shared by the two places that use it (same object as both copies it replaced; never changed at run time).
  const POS_LABELS = {verb:'Verb',noun:'Nomen',pron:'Pronomen',adj:'Adjektiv',adv:'Adverb'};
  const pos = c => POS_LABELS[c.pos] || c.posLabel || c.pos;
  const key = c => `${norm(c.lemma)}:${pos(c)}${c.source === 'main' && c.dictionaryId ? ':' + c.dictionaryId : ''}`;
  function groups(candidates) {
    const result = new Map();
    for (const c of candidates) {
      if (!result.has(key(c))) result.set(key(c), []);
      result.get(key(c)).push(c);
    }
    return [...result.values()].map(rows => ({candidate:rows.find(c => c.source === 'main') || rows[0], rows}));
  }
  // G57 (user 24.10.2026): «ещё N значений ↓» opens the hidden meanings in the popup itself. While ALL is set (card(…, {all:true}),
  // withAll), every cut of a meaning list below gives all meanings: compact() and the label segments of the external dictionary,
  // fit() of an own card, the lines of the parts of a word. The short card stays exactly as before.
  let ALL = false;
  const withAll = f => { const prev = ALL; ALL = true; try { return f(); } finally { ALL = prev; } };
  const shownCount = n => ALL ? n : 2;
  function compact(text) {
    // Parenthesised remarks may contain ";" themselves: drop them before splitting.
    const parts = String(text || '').replace(/\([^()]*\)/g, '').split(';').map(value => {
      if (/^to call on.*divine being/i.test(value.trim()) || /^to call upon$/i.test(value.trim())) return 'to invoke';
      return value.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    return [...new Set(parts)].slice(0, shownCount(Infinity)).join('; ');
  }
  // D13 (decided 15 Oct 2026, variant 2): an own card shows all its meanings with
  // their brackets while the translation fits about three popup lines; the rest is
  // counted for the «ещё N значений» link to the dictionary details.
  const FIT_LIMIT = 80;
  // lassen + infinitive (links chat 14.11): the meaning of the card marked «(с инфинитивом)» / «(with an infinitive)» (WN batch 104);
  // the infinitives with which lassen keeps «оставлять» first; fallen / sein / warten lassen keep the card as it is
  const LASSEN_INFINITIVE_SENSE = /^\((?:с инфинитивом|with an infinitive)\)/u;
  const LASSEN_LET_SENSE = /^(?:позволять|to let)(?![\p{L}])/u;
  const LASSEN_LEAVE_INFINITIVES = new Set(['liegen','stehen','sitzen','hängen','stecken']);
  const LASSEN_OWN_INFINITIVES = new Set(['fallen','sein','warten']);
  function meaningParts(text) {
    const parts = [];
    let depth = 0, current = '';
    for (const ch of String(text || '')) {
      if (ch === '(') depth++;
      else if (ch === ')' && depth) depth--;
      if (ch === ';' && !depth) { parts.push(current); current = ''; } else current += ch;
    }
    parts.push(current);
    return [...new Set(parts.map(value => value.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  }
  function fit(text) {
    const parts = meaningParts(text), shown = [];
    let length = 0;
    for (const part of parts) {
      const add = (shown.length ? 2 : 0) + part.length;
      // Never fewer than the two meanings the popup showed before D13.
      if (!ALL && shown.length >= 2 && length + add > FIT_LIMIT) break;
      shown.push(part); length += add;
    }
    return {text:shown.join('; '), rest:parts.length - shown.length};
  }
  const ownCard = candidate => candidate?.source === 'main' && !!candidate.item;
  // compact() of a text in a pack language keeps its brackets: they belong to the meaning there (review B 17.11 — Polish
  // «chwytać (się)», «trzymać (się)» lose «się» and their sense without them); the English and Russian texts as before.
  const compactIn = (text, language) => isPack(language) ? meaningParts(text).slice(0, shownCount(Infinity)).join('; ') : compact(text);
  // Languages of the card text (17.11.2026, chat «languages in the reader», stage Ч2): ru and en as before; a pack language
  // (lang/<code>/, resolver/pack-translations.js) — its code. No branch for a particular language: a pack language reads its
  // texts under its code (translation[code], meaningLabels[code], item.translation_<code> …); where the card has none, the
  // card is the English one (advisor 17.11: «нет текста на языке показа — как EN»; a pack not downloaded — the English card).
  // Phrases of the popup stay English for a pack language until stage Ч4 (lang/<code>/reader.json); labels — until Ч3.
  const textLanguage = value => value === 'ru' ? 'ru' : typeof value === 'string' && /^[a-z]{2,3}$/u.test(value) && value !== 'en' ? value : 'en';
  const isPack = language => language !== 'ru' && language !== 'en';
  // a phrase of a {ru, en} table: a pack language takes its own line if the table has one, otherwise the English one
  const say = (table, language) => isPack(language) ? table?.[language] || (table ? packPhrase(language, table.en, table.ru) : '') || table?.en : table?.[language];
  // A meaning the resolver proved from the sentence picks a place in the Russian / English text (senseFirst …): a pack text has no
  // such place, so the card stays English (the choice is the same in every language, advisor 17.11).
  const provenSense = c => Number.isInteger(c?.senseFirst) || Number.isInteger(c?.senseFirstEn) ||
    Array.isArray(c?.sensesFirst) && c.sensesFirst.length > 0 || Array.isArray(c?.sensesFirstEn) && c.sensesFirstEn.length > 0;
  // (19.11.2026, advisor: by the number of the meaning) an own card whose pack text has as many meanings as its English (and Russian)
  // one: the meaning the resolver proved has the same number in the pack — the pack's card is built, its meanings in that order
  const byNumber = (c, language) => { if (!isPack(language) || !c || !ownCard(c)) return false;
    const mine = String(c.translation?.[language] || '').trim();
    if (!mine || mine !== String(c.packItem?.[language]?.[`translation_${language}`] || '').trim()) return false;
    const n = meaningParts(c.translation?.en || '').length, ru = String(c.translation?.ru || '').trim();
    return n > 1 && meaningParts(mine).length === n && (!ru || meaningParts(ru).length === n); };
  const packText = (c, language) => !!c && (!provenSense(c) || byNumber(c, language)) && !!(String(c.translation?.[language] || '').trim() ||
    c.reflexiveMarks?.[language] || String(c.packItem?.[language]?.reflexive?.[`translation_${language}`] || '').trim() || String(c.formTranslation?.[language] || '').trim());
  // the language a card is built in: a pack language only when this candidate has a text in it
  // (18.11.2026) a word read by its parts (not a name) is built in the pack language: its lines say, part by part, which is in the
  // pack and which is English (formationMeaning, particleVerbLines)
  const byParts = candidate => !!candidate?.formation && typeof candidate.formation === 'object' && candidate.formation.kind !== 'name';
  // (19.11.2026, advisor: ENGLISH_BY_PARTS) an external particle verb whose English text the resolver built from its parts
  // (candidate.englishByParts — the resolver's formation; hinwenden «hin — … · wenden — …»): in a pack language without a text of its own
  // it is shown as a particle verb's lines (п. 2: each part in the pack, a part without one — English with the mark on its line); none of
  // the parts in the pack — null: the English text with one mark, as before
  const englishPartsLines = (candidate, language) => {
    const f = candidate?.englishByParts;
    if (!isPack(language) || !f || typeof f !== 'object' || f.kind !== 'particle-verb' || !f.particle || !(f.verb || f.verbs?.length)) return null;
    // (19.11.2026, user: the mark stands before the English it is about — «angielski: ab- · säbeln — to saw away at» read as if the
    // particle were English) none of the parts in the pack either: the lines, each English meaning with its mark
    // (the pack not here — no mark to give: the English card as is)
    const lines = particleVerbLines(f, language);
    return lines.some(l => l.language === language) || englishPrefix(language) ? lines : null;
  };
  // (19.11.2026) an external verb shown by its parts (G47: candidate.directionalSimple — the switch of wordCard below, decided by English)
  const simpleParts = candidate => !!candidate?.directionalSimple && byParts(candidate.directionalSimple) &&
    (!brief(candidate.directionalFull || candidate, 'en') || !!candidate.directionalPhrase?.en);
  const cardLanguage = (candidate, value) => { const language = textLanguage(value);
    return isPack(language) && !packText(candidate, language) && !byParts(candidate) && !simpleParts(candidate) && !candidate?.formOf?.text?.[language] && !englishPartsLines(candidate, language) &&
      // (19.11.2026) a reflexive use of a verb without a pack text (sich bezeigen): the card in the pack — its own lines say «(bez sich)»
      // and carry the English meaning with the mark (cardBase below), never a whole English card without one
      candidate?.construction?.id !== 'reflexive-verb' ? 'en' : language; };
  // Phrases of the popup (Ч4, 17.11.2026): L(language, ru, en, …args) — ru / en exactly as written before (byte for byte); a pack
  // language: its line for this pair in lang/<code>/reader.json (pack-translations.js `phrase`), otherwise the English one. The pair
  // (with its places {0}, {1} … — the template, not the filled text) is the key; dev/lang/scan-reader.cjs lists the pairs.
  const fill = (text, args) => args.length ? String(text).replace(/\{(\d+)\}/gu, (m, n) => +n < args.length ? String(args[+n]) : m) : text;
  const packPhrase = (language, en, ru, section) => { try { return window.BibliothekPackTranslations?.phrase?.(language, en, ru, section) || ''; } catch (_) { return ''; } };
  // the mark before an English text in a translated popup: «английский: » (ru), the pack's line for it, or nothing (en)
  // (advisor 17.11: a pack language — its line for the pair «английский: / English: », no line → «English: »; reader.json not loaded → nothing)
  const hasPhrases = language => { try { return !!window.BibliothekPackTranslations?.hasPhrases?.(language); } catch (_) { return false; } };
  const englishPrefix = language => language === 'ru' ? 'английский: ' : isPack(language) ? packPhrase(language, 'English: ', 'английский: ') || (hasPhrases(language) ? 'English: ' : '') : '';
  // a meaning text without that mark
  const bare = m => { const t = String(m.text || ''); return m.prefix && t.startsWith(m.prefix) ? t.slice(m.prefix.length) : t.replace(/^английский: /u, ''); };
  function L(language, ru, en, ...args) {
    if (language === 'ru') return fill(ru, args);
    if (isPack(language)) { const own = packPhrase(language, en, ru); if (own) return fill(own, args); }
    return fill(en, args);
  }
  function heading(candidate) {
    if (candidate.explanation?.kind === 'contraction') return `${candidate.lemma} = ${candidate.explanation.expansion}`;
    const gerund = pos(candidate) === 'Nomen' && /^gerund of /i.test(candidate.translation?.en || '');
    // G16 (user decision 18.10 / 19.10): a noun or a name is always capitalised, also from the external
    // dictionary, whose keys are lowercase (brunnen -> Brunnen); the article of external nouns is a later step.
    const capital = gerund || candidate.source === 'fallback' && ['noun','name'].includes(candidate.pos);
    // G16 (advisor 25.10): an external noun with one gender of its meanings takes its article (die Schnecke, der Brunnen).
    return `${candidate.item?.article || (gerund ? 'das' : '') || (candidate.source === 'fallback' && candidate.pos === 'noun' && (candidate.headingArticle || candidate.nounArticle)) || ''} ${capital ? candidate.lemma.charAt(0).toUpperCase() + candidate.lemma.slice(1) : candidate.lemma}`.trim();
  }
  // G45 (2), reference 2.A (user 22.10.2026): dictionary labels before their meaning, from both dictionaries
  // (codes: fc122e9 English senses[6], a706d75 Russian `labels`). Style and region map to a short set; the domain
  // (Russian only) is shown on later meanings, on a first meaning only for a short list of special domains; grammar codes never.
  const LABEL_SET = [
    ['colloquial', 'разг.', 'разговорное', 'colloq.', 'colloquial', ['colloquial','familiar','vernacular','informal']],
    ['slang', 'жарг.', 'жаргонное', 'slang', 'slang', ['slang']],
    ['vulgar', 'груб.', 'грубое', 'vulg.', 'vulgar', ['vulgar','obscene']],
    ['derogatory', 'пренебр.', 'пренебрежительное', 'derog.', 'derogatory', ['offensive','derogatory','disapproving','impolite','slur','ethnic']],
    ['dated', 'устар.', 'устаревшее', 'dated', 'dated', ['dated','archaic','obsolete']],
    ['rare', 'редк.', 'редкое', 'rare', 'rare', ['rare','uncommon']],
    ['literary', 'книжн.', 'книжное', 'lit.', 'literary', ['elevated','literary','formal']],
    ['poetic', 'поэт.', 'поэтическое', 'poet.', 'poetic', ['poetic']],
    ['figurative', 'перен.', 'переносное', 'fig.', 'figurative', ['figuratively']],
    ['humorous', 'шутл.', 'шутливое', 'hum.', 'humorous', ['humorous']],
    ['ironic', 'ирон.', 'ироничное', 'iron.', 'ironic', ['ironic','sarcastic']],
    ['endearing', 'ласк.', 'ласковое', 'affect.', 'affectionate', ['endearing','childish']],
    ['historical', 'ист.', 'историческое', 'hist.', 'historical', ['historical']],
    // reference 2.A addition 22.10 (c91e605): эвф. / euph., канц. / offic.
    ['euphemistic', 'эвф.', 'эвфемизм', 'euph.', 'euphemism', ['euphemistic']],
    ['official', 'канц.', 'канцелярское', 'offic.', 'officialese', ['bureaucratese']],
    ['regional', 'рег.', 'региональное', 'reg.', 'regional', ['regional','dialectal','Low-German','Central-German','Hunsrück','Bavaria',
      'Southern-Germany','southern-Germany','Northern-Germany','Upper-German','Rhineland','Westphalia','Berlin','Ruhrgebiet']],
    ['austrian', 'австр.', 'австрийское', 'Austrian', 'Austrian', ['Austria','Austrian']],
    ['swiss', 'швейц.', 'швейцарское', 'Swiss', 'Swiss', ['Switzerland','Liechtenstein','Swiss']]];
  const LABEL_BY_CODE = new Map(LABEL_SET.flatMap(([id,ru,ruFull,en,enFull,codes], order) => codes.map(code => [code,{id,ru,ruFull,en,enFull,order}])));
  const RUDE_LABELS = new Set(['vulgar','derogatory','slang']);
  // Russian domain abbreviations (manifest labels.codes.domain); natural-kind domains are not shown on a first meaning.
  const DOMAIN = {technology:'техн.',medicine:'мед.',chemistry:'хим.',military:'воен.',botany:'бот.',law:'юр.',history:'ист.',sports:'спорт.',
    physics:'физ.',linguistics:'лингв.',zoology:'зоол.',anatomy:'анат.',mathematics:'матем.',geology:'геол.',nautical:'морск.',music:'муз.',
    biology:'биол.',economics:'экон.',mining:'горн.',printing:'полигр.',religion:'религ.',grammar:'грам.',agriculture:'с.-х.',railways:'ж.-д.',
    politics:'полит.',astronomy:'астрон.',geography:'геогр.',philosophy:'филос.',textiles:'текст.',psychology:'психол.',
    'electrical-engineering':'эл.-техн.',mineralogy:'минер.',geometry:'геометр.',ornithology:'орнит.',architecture:'архит.',
    biochemistry:'биохим.',computing:'комп.',programming:'прогр.',Internet:'интернет.',finance:'фин.',mythology:'мифол.',physiology:'физиол.',
    cooking:'кулин.',theater:'театр.',philology:'филол.',hydrology:'гидрол.',arts:'искусств.',painting:'живоп.',chess:'шахм.',aviation:'авиац.',
    church:'церк.',Bible:'библ.',radio:'радио',entomology:'энтомол.',ichthyology:'ихтиол.',hunting:'охот.',meteorology:'метеорол.',
    accounting:'бухг.',construction:'строит.',metallurgy:'металл.',genetics:'генет.',pharmacy:'фарм.',space:'косм.',photography:'фото',
    archaeology:'археол.',automotive:'автомоб.',logic:'лог.',mycology:'микол.',optics:'опт.',mechanics:'мех.',veterinary:'вет.',
    sociology:'социол.',heraldry:'геральд.',forestry:'лес.',ethnography:'этногр.',fishing:'рыбол.',commerce:'торг.',diplomacy:'дипл.'};
  // Reference 2.A, refined 22.10 (a23492d): on the first meaning only these special domains (Fock «морск. фок»);
  // any domain on the second and later meanings (Wolf «волк; мед. опрелость»).
  const FIRST_MEANING_DOMAINS = new Set(['nautical','technology','military','law','medicine','hunting','mining','printing','railways','aviation']);
  const labelKey = value => String(value || '').replace(/\([^()]*\)/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  // Labels by shown text. Texts are compared without brackets, so two senses can meet in one key (saugen: «to suck» and
  // «to suck (to be inferior)», slang): then an unlabelled sense wins (review 22.10); otherwise the first one decides.
  function partCodes(map, glosses) {
    const byPart = new Map();
    for (const gloss of glosses || Object.keys(map || {})) {
      const codes = map?.[gloss] || [];
      for (const part of String(gloss).replace(/\([^()]*\)/g, '').split(';')) {
        const key = labelKey(part); if (!key) continue;
        if (!byPart.has(key)) byPart.set(key, [...codes]);
        else if (!codes.length) byPart.set(key, []);
      }
    }
    return byPart;
  }
  const isExternal = candidate => candidate?.source === 'fallback' && !candidate.item;
  // The shown parts of an external translation with their codes; a rude first meaning gives way to an ordinary one.
  function labelledParts(candidate, language) {
    // The Russian card text without the labels (russian-translations.js `labelledText`); the stored translation keeps them.
    const text = candidate.labelledText?.[language] || candidate.translation?.[language] || '';
    // (a pack language keeps the brackets of its text — compactIn(); the codes are found by the text without them)
    const parts = isPack(language) ? [...new Set(meaningParts(text))]
      : [...new Set(String(text).replace(/\([^()]*\)/g, '').split(';').map(labelKey).filter(Boolean))];
    const codes = partCodes(candidate.meaningLabels?.[language], language === 'en' && Array.isArray(candidate.meanings) ? candidate.meanings : null);
    const rows = parts.map(part => ({text:part, codes:codes.get(labelKey(part)) || []}));
    // (a pack language: its manifest's label table may name more rude codes — `rude` of labels.display, Ч3)
    const table = isPack(language) ? candidate.labelTables?.[language] : null;
    const rude = row => row.codes.some(code => RUDE_LABELS.has(LABEL_BY_CODE.get(code)?.id) || !!table && RUDE_LABELS.has(packEntry(table, code)?.rude));
    const first = rows.findIndex(row => !rude(row));
    if (first > 0) rows.unshift(...rows.splice(first, 1));
    // (links chat TODO п. 98, advisor 14.11) an object in the part of a separated external verb (objectInPart, the resolver): the first
    // meaning marked transitive («перех.») comes before the meanings marked intransitive («неперех.») in front of it
    if (candidate.objectInPart) {
      const has = (row, code) => row.codes.includes(code);
      const at = rows.findIndex(row => has(row, 'transitive'));
      if (at > 0 && rows.slice(0, at).every(row => has(row, 'intransitive') && !has(row, 'transitive'))) rows.unshift(...rows.splice(at, 1));
    }
    return rows;
  }
  // Labels of a pack language (Ч3, 17.11.2026): its dictionary manifest's table labels.display {code: {kind: style | region |
  // domain, rude: vulgar | derogatory | slang | null, label}} — read by codes only, the same for every pack language. A code the
  // table lacks is looked for under another code of the same label (obscene → vulgar, Austrian → Austria). Style and region
  // first, in the order of the label set; a domain as in Russian (later meanings; on the first only the special domains).
  // Without a table (an older manifest) the labels stay English.
  // (review A 17.11: the fallback takes the codes of the label set's row in its order — Rhineland → regional «reg.», never another
  // region; own keys only)
  const ROW_CODES = new Map(LABEL_SET.map(([id, , , , , codes]) => [id, [id, ...codes]]));
  function packEntry(table, code) {
    if (!table || typeof table !== 'object') return null;
    if (Object.hasOwn(table, code)) return table[code];
    const id = LABEL_BY_CODE.get(code)?.id;
    for (const key of ROW_CODES.get(id) || []) if (Object.hasOwn(table, key)) return table[key];
    return null;
  }
  function packLabels(codes, first, table) {
    const order = code => LABEL_BY_CODE.get(code)?.order ?? LABEL_SET.length;
    // (a code of the label set the table lacks keeps its English label — a rude one must never vanish; review A 17.11)
    const entries = codes.map(code => { const entry = packEntry(table, code), known = LABEL_BY_CODE.get(code);
      return {code, entry:entry && String(entry.label || '').trim() ? entry : known ? {kind:'style', rude:RUDE_LABELS.has(known.id) ? known.id : null, label:known.en, full:known.enFull} : null}; })
      .filter(x => x.entry);
    const styled = entries.filter(x => x.entry.kind !== 'domain').sort((a, b) => order(a.code) - order(b.code));
    const domains = entries.filter(x => x.entry.kind === 'domain' && (!first || FIRST_MEANING_DOMAINS.has(x.code)));
    const items = [];
    for (const {code, entry} of [...styled, ...domains]) {
      const short = String(entry.label).trim();
      if (items.some(i => i.short === short)) continue;
      items.push({short, full:String(entry.full || short), id:RUDE_LABELS.has(entry.rude) ? entry.rude : LABEL_BY_CODE.get(code)?.id || `${entry.kind}:${code}`});
    }
    return items.slice(0, 2);
  }
  function shownLabels(codes, display, first, domains = {}, table = null) {
    if (isPack(display) && table) return packLabels(codes, first, table);
    const style = [...new Map(codes.map(code => LABEL_BY_CODE.get(code)).filter(Boolean).map(l => [l.id,l])).values()].sort((a,b) => a.order - b.order);
    const items = style.map(l => display === 'ru' ? {short:l.ru, full:l.ruFull, id:l.id} : {short:l.en, full:l.enFull, id:l.id});
    if (display === 'ru') for (const code of codes) {
      const abbr = DOMAIN[code] || domains[code];
      if (abbr && (!first || FIRST_MEANING_DOMAINS.has(code)) && !items.some(i => i.short === abbr)) items.push({short:abbr, full:abbr, id:`domain:${code}`});
    }
    return items.slice(0, 2);
  }
  /** Segments of an external meaning text: [{labels:[{short, full}], text}]; null without any label to show. */
  function labelSegments(candidate, language, display = language) {
    if (!isExternal(candidate) || !candidate.meaningLabels) return null;
    const rows = labelledParts(candidate, language).slice(0, shownCount(Infinity));
    // (the pack's labels on the pack's own text only — an English text keeps English labels; review A 17.11)
    const table = isPack(display) && language === display ? candidate.labelTables?.[display] : null;
    const segments = rows.map((row, i) => ({labels:shownLabels(row.codes, display, i === 0, language === 'ru' ? candidate.labelDomains : {}, table), text:row.text}));
    // One label shared by every shown meaning stands once at the start.
    // (id and label: two labels of one id — Polish pot. / posp. — are not one shared label; review A 17.11)
    const ids = s => s.labels.map(l => `${l.id}\u0000${l.short}`).join('|');
    const shared = segments.length > 1 && segments[0].labels.length && segments.every(s => s.text && ids(s) === ids(segments[0]));
    if (shared) { const label = segments[0].labels; segments.forEach(s => { s.labels = []; }); segments.unshift({labels:label, text:''}); }
    // English marks the word rude and the Russian text does not (Bulle, huren): one label for the whole card (user 22.10).
    // (advisor 17.11: for the Russian and the pack languages, never for English itself)
    if (language !== 'en' && !segments.some(s => s.labels.some(l => RUDE_LABELS.has(l.id)))) {
      const en = labelledParts(candidate, 'en')[0];
      const rude = en ? shownLabels(en.codes, display, true, {}, table).filter(l => RUDE_LABELS.has(l.id)) : [];
      if (rude.length) {
        if (segments[0] && !segments[0].text) segments[0].labels = [...rude, ...segments[0].labels].slice(0, 2);
        else segments.unshift({labels:rude, text:''});
      }
    }
    return segments.some(s => s.labels.length) ? segments : null;
  }
  function brief(candidate, language, inline = false) {
    // inline: a text shown without label segments (der/die pair) keeps the source gloss with its inline label
    // (a pack language: the order the resolver proved is the English one's, applied to the pack's meanings with the same numbers — only
    // when they are counted alike, byNumber; otherwise the English card, as before — advisor 17.11 / 19.11)
    if (isPack(language) && (provenSense(candidate) || candidate.construction?.id === 'lassen-infinitive' && norm(candidate.lemma) === 'lassen' && pos(candidate) === 'Verb')) {
      if (!byNumber(candidate, language)) return '';
      const order = meaningParts(brief(candidate, 'en', inline)).map(m => m.trim()), en = meaningParts(candidate.translation.en).map(m => m.trim());
      const mine = meaningParts(candidate.translation[language]).map(m => m.trim()), at = order.map(m => en.indexOf(m));
      if (!order.length || at.some(i => i < 0)) return '';
      const text = at.map(i => mine[i]).join('; ');
      // (review A 19.11: lassen + infinitive keeps every meaning visible, as its English card — no fit)
      return ownCard(candidate) && candidate.construction?.id !== 'lassen-infinitive' ? fit(text).text : text;
    }
    if (!inline && isExternal(candidate) && candidate.meaningLabels?.[language] && !Number.isInteger(candidate.senseFirst) && !(language === 'en' && Number.isInteger(candidate.senseFirstEn)) &&
        candidate.construction?.id !== 'lassen-infinitive' && !/^gerund of /i.test(String(candidate.translation?.[language] || '').trim()))
      return labelledParts(candidate, language).slice(0, shownCount(Infinity)).map(row => row.text).join('; ');
    let text = candidate.translation?.[language] || '';
    // G40 (21.10.2026): a meaning the resolver proved from the sentence (bald darauf → «после этого, потом») comes first.
    // (cheap signs 09.11: the English line may cut its meanings otherwise than the Russian one — danach: senseFirstEn)
    const first = language === 'en' && Number.isInteger(candidate.senseFirstEn) ? candidate.senseFirstEn : candidate.senseFirst;
    // (advisor 16.11, sich stellen + dative: several proved meanings — sensesFirst / sensesFirstEn — come first in the card's order)
    const several = language === 'en' ? candidate.sensesFirstEn : candidate.sensesFirst;
    if (Array.isArray(several) && several.length > 1) { const parts = meaningParts(text); if (several.every(i => Number.isInteger(i) && i < parts.length))
      text = [...several.map(i => parts[i]), ...parts.filter((_, i) => !several.includes(i))].map(p => p.trim()).join('; '); }
    else if (Number.isInteger(first)) { const parts = meaningParts(text); if (first < parts.length)
      text = [parts[first], ...parts.filter((_, i) => i !== first)].map(p => p.trim()).join('; '); }
    if (language === 'en' && /^gerund of anrufen$/i.test(text.trim())) return 'the act of calling';
    if (language === 'en' && /^gerund of /i.test(text.trim())) return 'verbal noun';
    // A confirmed lassen bracket does not pick permission versus causation.
    // Keep every sense of its existing card visible instead of clipping to two.
    if (candidate.construction?.id === 'lassen-infinitive' && norm(candidate.lemma) === 'lassen' && pos(candidate) === 'Verb') {
      // (links chat 14.11, advisor; WN batch 104: with an infinitive linked the meaning «(с инфинитивом) велеть, поручить, дать
      // (сделать)» comes first — not with liegen / stehen / sitzen / hängen / stecken («оставить»), not with fallen / sein / warten lassen
      // and not where the group proved its own sense: «давай(те)», «можно», «сам (упал)»)
      const k = candidate.construction, inner = String(k.lemma || '').split(' und ').map(norm);
      if (!k.sense && !inner.some(x => LASSEN_LEAVE_INFINITIVES.has(x) || LASSEN_OWN_INFINITIVES.has(x))) {
        // (then «позволять (сделать)» / «to let, to allow» — the advisor's «велеть / дать, позволить» — before «оставлять»)
        const parts = meaningParts(text).map(p => p.trim()), at = parts.findIndex(p => LASSEN_INFINITIVE_SENSE.test(p));
        const let_ = parts.findIndex(p => LASSEN_LET_SENSE.test(p));
        if (at > 0) return [parts[at], ...(let_ >= 0 ? [parts[let_]] : []), ...parts.filter((_, i) => i !== at && i !== let_)].join('; ');
      }
      return text.trim();
    }
    return ownCard(candidate) ? fit(text).text : compactIn(text, language);
  }
  // WN batch 91 (cards chat + advisor 12.11): old meanings of an own card (`extra_meanings` {ru, en, register}) are never in the
  // short text; card(…, {all:true}) adds them at the end, so «ещё N значений» counts them and opens them (G57, the same cut as
  // every other hidden meaning). The register is a usage label of the label set (veraltet / veraltend → «устар.» / «dated»,
  // gehoben → «книжн.» / «formal»; none — no label); an English popup takes only the English value and label.
  const EXTRA_REGISTER = {veraltet:{id:'dated', ru:'устар.', ruFull:'устаревшее', en:'dated', enFull:'dated'},
    veraltend:{id:'dated', ru:'устар.', ruFull:'устаревающее', en:'dated', enFull:'dated'},
    gehoben:{id:'literary', ru:'книжн.', ruFull:'книжное', en:'formal', enFull:'formal'}};
  function extraMeanings(candidate, language) {
    if (!ALL || !ownCard(candidate) || !Array.isArray(candidate.item.extra_meanings)) return [];
    // (a pack language: the old meanings' texts of the pack — candidate.packItem, pack-translations.js; the register stays the card's)
    const packed = isPack(language) ? candidate.packItem?.[language]?.extra_meanings : null;
    return candidate.item.extra_meanings.map((m, i) => {
      const text = String((isPack(language) ? packed?.[i]?.[language] : m?.[language]) || '').trim(), label = EXTRA_REGISTER[m?.register], ui = language === 'ru' ? 'ru' : 'en';
      return text ? {labels:label ? [{short:L(language, label.ru, label.en), full:L(language, label.ruFull, label.enFull), id:label.id}] : [], text} : null;
    }).filter(Boolean);
  }
  // The own text with the old meanings after it: {text, segments} (segments null without them).
  function withExtra(candidate, language, text, segments) {
    const extra = extraMeanings(candidate, language);
    if (!extra.length) return {text, segments};
    return {text:[text, ...extra.map(e => e.text)].join('; '), segments:[...(segments || [{labels:[], text}]), ...extra]};
  }
  // Meanings of an own card left out of the popup by fit() (0 for external entries).
  function hiddenMeanings(candidate, language) {
    if (!ownCard(candidate)) return 0;
    if (candidate.construction?.id === 'lassen-infinitive' && norm(candidate.lemma) === 'lassen' && pos(candidate) === 'Verb') return 0;
    return fit(candidate.translation?.[language] || '').rest;
  }
  function extraText(rows, own, language) {
    const clean = value => norm(value).replace(/^to\s+/, '').replace(/[.!]+$/, '');
    const known = new Set(String(own?.translation?.[language] || '').split(';').map(clean));
    const parts = rows.filter(c => c !== own).flatMap(c => String(c.translation?.[language] || '').split(';'));
    return [...new Set(parts.map(p => p.trim()).filter(p => p && !known.has(clean(p)) &&
      // Explicit telephone glosses repeat our "to phone" sense.
      !(language === 'en' && known.has('phone') && /\b(?:telephone|phone)\b/i.test(p))))].join('; ');
  }
  // G9 (21.10.2026): an external name shares the group key of its ordinary noun (Wolf / Wolf); as another
  // meaning it is a row of its own («Name»), not English notes added to the noun.
  const isName = c => c.source === 'fallback' && c.pos === 'name';
  function meaningGroups(candidates) {
    return groups(candidates).flatMap(group => {
      const names = group.rows.filter(isName), others = group.rows.filter(c => !isName(c));
      if (!names.length || !others.length) return [group];
      return [{candidate:others.find(c => c.source === 'main') || others[0], rows:others}, {candidate:names[0], rows:names}];
    });
  }
  // (advisor 19.11) «form of X» text of a candidate with candidate.formOf: «уменьш. от Maus — мышь» / «diminutive of Maus — mouse»; a
  // language without the base's text — English with the mark. → {text, language} or null. One function for the card and its alternatives.
  function formOfText(candidate, language) {
    const f = candidate?.formOf;
    if (!f || !f.text) return null;
    // (advisor 19.11, «Астронавт») a word made of a number — a phrase of the display; English keeps the record's own text, a pack without
    // the phrase too
    if (f.kind === 'number') {
      if (language === 'en' || !f.number) return null;
      const n = f.number.n, digits = n === 1.5 ? null : Number(n).toLocaleString('de-DE').replace(/\./gu, '\u00a0');
      // (Russian: 2–4, 22–24 … раза; otherwise раз)
      const raza = Number.isInteger(n) && [2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100);
      if (f.number.kind === 'one5') { if (isPack(language) && !packPhrase(language, 'one and a half', 'полтора')) return null; return {text:L(language, 'полтора', 'one and a half'), language}; }
      const phrase = {half:['{0} с половиной','{0} and a half'], mal:[raza ? '{0} раза' : '{0} раз','{0} times'], fach:[raza ? 'в {0} раза' : 'в {0} раз','{0}-fold'],
        minütig:['{0}-минутный','{0}-minute'], stündig:['{0}-часовой','{0}-hour'], tägig:['{0}-дневный','{0}-day'], wöchig:['{0}-недельный','{0}-week'],
        monatig:['{0}-месячный','{0}-month'], jährig:['{0}-летний','{0}-year-old']}[f.number.kind];
      if (!phrase) return null;
      const one5 = n === 1.5 ? {mal:['полтора раза','one and a half times'], fach:['в полтора раза','one-and-a-half-fold']}[f.number.kind] : null;
      if (n === 1.5 && !one5) return null;
      if (isPack(language) && !packPhrase(language, one5 ? one5[1] : phrase[1], one5 ? one5[0] : phrase[0])) return null;
      return {text:one5 ? L(language, one5[0], one5[1]) : L(language, phrase[0], phrase[1], digits), language};
    }
    const own = language === 'en' ? f.text.en : f.text[language] || '', shownLanguage = own ? language : 'en', baseText = own || f.text.en || '';
    if (!baseText) return null;
    // (advisor 19.11) the same word in another part of speech — its text as it is (unbarmherzig: «безжалостный»); a noun from the
    // infinitive — «От abwerfen — сбрасывать», as the infinitive nouns of the resolver (fromText); only in the language of that text
    if (f.kind === 'same') return own ? {text:fit(own).text, language} : null;
    if (f.kind === 'verb') return own ? {text:fromText(f.base, fit(own).text, language), language} : null;
    const label = {diminutive:['уменьш. от {0}','diminutive of {0}'], feminine:['жен. к {0}','feminine of {0}'], obsolete:['устар. форма от {0}','obsolete form of {0}'],
      colloquial:['разг. форма от {0}','colloquial form of {0}'], short:['краткая форма от {0}','short form of {0}'], form:['форма от {0}','form of {0}']}[f.kind] || ['форма от {0}','form of {0}'];
    const mark = shownLanguage === 'en' && language !== 'en' ? englishPrefix(language) : '';
    return {text:`${L(language, label[0], label[1], f.base)} — ${mark}${fit(baseText).text}`, language:shownLanguage === 'en' && language !== 'en' ? 'en' : language};
  }
  function alternatives(resolution, selected, language) {
    language = textLanguage(language);
    const same = c => !!selected && key(c) === key(selected) && isName(c) === isName(selected);
    return meaningGroups(resolution.candidates).sort((a,b) => Number(same(a.candidate)) - Number(same(b.candidate))).flatMap(group => {
      const base = group.candidate;
      const isSelected = same(base);
      if (isSelected) {
        const translated = compactIn(extraText(group.rows, selected, language), language);
        const displayLanguage = translated ? language : 'en';
        const text = translated || compact(extraText(group.rows, selected, displayLanguage));
        return text ? [{candidate:group.rows.find(c => c !== selected && c.translation?.[displayLanguage]), text, language:displayLanguage}] : [];
      }
      // G9 (21.10.2026, reference F13-N1): a name as another meaning is «Name» without the English note
      // (the same rule as a selected name, reference 13).
      if (isName(base) && !base.explanation) return [{candidate:base, text:'', language}];
      // (advisor 19.11) «form of X» — the same text as its card (formOfText), in place of an English-only record text
      const formOf = base.formOf && (language === 'en' || !brief(base, language)) ? formOfText(base, language) : null;
      if (formOf) return [{candidate:base, text:formOf.text, language:formOf.language}];
      const translated = brief(base, language);
      // (19.11.2026, review B: «angielski: herum — around · …» put the mark before German) a verb read by its parts in a pack language:
      // its lines, as its card shows them — each part in its language, an English meaning with its own mark
      const partLines = !translated && isPack(language) ? englishPartsLines(base, language) : null;
      if (partLines) return [{candidate:base, text:partLines.map(l => l.text).join(' · '), language}];
      const displayLanguage = translated ? language : 'en';
      const text = translated || brief(base, 'en');
      if (!text && !base.explanation) return [];
      if (!text) return [{candidate:base,text:base.explanation.kind === 'contraction' ? `${base.lemma} = ${base.explanation.expansion}` : base.lemma,language}];
      const segments = labelSegments(base, displayLanguage, language);
      return [{candidate:base, text, language:displayLanguage, ...(segments ? {segments} : {})}];
    });
  }
  function formComment(resolution, candidate, language) {
    if (!candidate || candidate.explanation || norm(resolution.form) === norm(candidate.lemma)) return '';
    const grammarPos = value => POS_LABELS[value.pos] || value.pos;
    const notes = (resolution.formNotes || []).filter(note => grammarPos(note) === grammarPos(candidate) &&
      (note.inflections || []).some(row => norm(row.lemma) === norm(candidate.lemma)));
    if (!notes.length) return '';
    const superlative = notes.some(note => (note.inflections || []).some(row =>
      norm(row.lemma) === norm(candidate.lemma) && row.tags?.includes('superlative')));
    return `${superlative ? L(language, 'Форма превосходной степени', 'Superlative form') : L(language, 'Грамматическая форма', 'Grammatical form')}: ${resolution.form} → ${candidate.lemma}`;
  }
  function nounPhraseComment(candidate, language) {
    if (pos(candidate || {}) === 'Nomen') return '';
    const phrases = candidate?.nounPhrase;
    if (!phrases?.length) return '';
    const cases = [...new Set(phrases.flatMap(p => p.cases))];
    const names = {nominative:L(language, 'Ном.', 'Nom.'), accusative:L(language, 'Акк.', 'Acc.'), dative:L(language, 'Датив', 'Dative'), genitive:L(language, 'Ген.', 'Gen.')};
    const numbers = [...new Set(phrases.map(p => p.number))];
    const gender = ({masculine:L(language, 'мужской род', 'masculine'), feminine:L(language, 'женский род', 'feminine'), neuter:L(language, 'средний род', 'neuter')})[phrases[0].gender];
    const number = numbers.length > 1 ? L(language, 'единственное или множественное число', 'singular or plural') :
      numbers[0] === 'plural' ? L(language, 'множественное число', 'plural') : gender;
    const first = phrases[0];
    const grammar = `${cases.map(c => names[c]).join(L(language, ' или ', ' or '))} · ${number}.`;
    return `${grammar} ${L(language, 'Начальная форма', 'Base form')}: ${first.baseArticle} ${first.lemma}.`;
  }
  // ---- Small card (reader reference, section 2): heading / German grammar line / meaning.
  // Presentation only: the resolver's choice, spans and roles are read, never changed.
  const MODALS = new Set(['dürfen','können','mögen','möchten','müssen','sollen','wollen']);
  const NO_TRANSLATION = {ru:'Перевода не нашёл. Даже под обложкой посмотрел.', en:'I couldn’t find a translation. I even checked under the cover.'};
  const ROLE_TEXT = {
    auxiliary:{ru:'Вспомогательный глагол · отдельно не переводится', en:'Auxiliary verb · not translated separately'},
    passive:{ru:'Вспомогательный глагол пассива', en:'Passive auxiliary · be'},
    futureOrPassive:{ru:'Вспомогательный глагол · будущее время или пассив', en:'Auxiliary verb · future or passive'},
    // G25 (user decision 19.10, reference 2 / 5.7 / 12.4): würde in narration is also «future in the past»;
    // the form does not tell them apart, so every würde + infinitive shows both.
    conditional:{ru:'Условная конструкция · бы / будущее в прошлом', en:'Conditional construction · would'},
    conditionalPassive:{ru:'Условная конструкция · бы / будущее в прошлом', en:'Conditional construction · would'},
    // Reference 12.1 (F12-G3): hätte / wäre + participle; used once the resolver links them (to-do 3.7).
    conditionalPast:{ru:'Вспомогательный глагол · бы (о прошлом)', en:'Auxiliary · would have'},
    futurePerfectWill:{ru:'Вспомогательный глагол Futur II', en:'Future perfect auxiliary · will'},
    futurePerfectHave:{ru:'Вспомогательный глагол Futur II', en:'Future perfect auxiliary · have'},
    perfectHave:{ru:'Вспомогательный глагол Perfekt', en:'Perfect auxiliary · have'},
    // Reference (user decision 20.10, F12-B9b): sollen + perfect infinitive.
    hearsay:{ru:'здесь: говорят, будто', en:'here: is said to'},
    haveTo:{ru:'нужно / должен', en:'have to'},
    infinitiveParticle:{ru:'Отдельно не переводится', en:'Not translated separately'},
    // L15 steps 2 / 3 (reference B5 addition 19.10, advisor 29.10): lassen with sich where the form proves the sense.
    lassen_canBeDone:{ru:'здесь: можно (сделать)', en:'here: can be done'},
    lassen_canOrAllow:{ru:'здесь: можно (сделать) / позволить (себя)', en:'here: can be done / let oneself be …'},
    lassen_self:{ru:'здесь: сам (упал, опустился); (перен.) расслабиться, отпустить себя', en:'here: let oneself (drop, sink); (fig.) to let go, to relax'},
    // L15 step 4 (reference F12-B5j / k): lass / lasst / lassen Sie + uns + infinitive.
    lassen_letUs:{ru:'здесь: давай(те)', en:'here: let\u2019s'},
    // Reference G6 (to-do 3.12): the verb that changes its meaning with zu.
    zu_scheinen:{ru:'здесь: кажется, по-видимому', en:'here: seems to'},
    zu_brauchen:{ru:'здесь: нужно', en:'here: need to'},
    zu_wissen:{ru:'здесь: уметь', en:'here: know how to'},
    zu_pflegen:{ru:'здесь: обычно, имеет обыкновение', en:'here: usually, tends to'},
    'zu_vermögen':{ru:'здесь: быть в состоянии', en:'here: be able to'}
  };
  const AUX_HINT_TEXT = {
    perfect:{ru:'Вспомогательный глагол (Perfekt)', en:'Auxiliary verb (perfect)'},
    passive:{ru:'Вспомогательный глагол (пассив / Futur)', en:'Auxiliary verb (passive / future)'}
  };
  const POS_DE = {article:'Artikel', preposition:'Präposition', prep:'Präposition', numeral:'Zahlwort', num:'Zahlwort',
    particle:'Partikel', intj:'Interjektion', postp:'Postposition', contraction:'Präposition + Artikel', character:'Zeichen',
    symbol:'Symbol', det:'Artikel', name:'Nomen', noun:'Nomen', verb:'Verb', adj:'Adjektiv', adv:'Adverb', pron:'Pronomen', conj:'Konjunktion'};
  // Own Pronomen cards by number (german-pronouns.json); other sources keep "Pronomen".
  function pronounType(id) {
    const n = Number(String(id || '').split('-')[1]);
    if (n >= 1 && n <= 9) return 'Personalpronomen';
    if (n >= 11 && n <= 18) return 'Possessivpronomen';
    if (n === 19) return 'Reflexivpronomen';
    // 20.10.2026 (pronouns transfer 4f1941e): jener 052, derjenige 053, dergleichen 055 — Demonstrativpronomen;
    // alledem 054 stays plain Pronomen (user 20.10); irgendwer 056, jeglicher 057, irgendetwas 058, etliche 059, allesamt 060, unsereiner 061 — Indefinitpronomen.
    if ([52,53,55].includes(n)) return 'Demonstrativpronomen';
    if ([56,57,58,59,60,61].includes(n)) return 'Indefinitpronomen';
    if (n >= 33 && n <= 37) return 'Demonstrativpronomen';
    if ([38,40,43].includes(n)) return 'Relativpronomen';
    if ([39,41,42,47].includes(n)) return 'Interrogativpronomen';
    if ((n >= 20 && n <= 32) || (n >= 44 && n <= 46) || (n >= 48 && n <= 51)) return 'Indefinitpronomen';
    return 'Pronomen';
  }
  const verbBase = value => norm(value).replace(/^sich\s+/u, '');
  function partOfSpeech(candidate, confirmed = false) {
    const label = candidate.posLabel || pos(candidate);
    // (PUD Holden, advisor + user 15.11) a surname after a given name read as an adjective / verb: the resolver's slash «Name / Verb» as is
    if (/^Name \/ /u.test(String(candidate.posLabel || ''))) return candidate.posLabel;
    if (label === 'Pronomen' || candidate.item?.type === 'Pronomen') return candidate.source === 'main' ? pronounType(candidate.dictionaryId) : 'Pronomen';
    if (label === 'Verb' || pos(candidate) === 'Verb') {
      // A modal verb with no infinitive in its clause is used as a full verb (Ich mag Kaffee).
      if (MODALS.has(verbBase(candidate.lemma))) return candidate.formFeatures?.fullVerb ? 'Verb' : 'Modalverb';
      // Separability is lexical (own card) or an established split; a tentative split stays a plain Verb.
      // A reflexive group with its detached particle (legte sich nieder) is separable too.
      const separable = !!candidate.item?.separable_prefix || !!candidate.formFeatures?.separable || candidate.construction?.id === 'separable-verb' && (confirmed || candidate.construction.confidence !== 'tentative') ||
        candidate.construction?.id === 'reflexive-verb' && !!candidate.construction.prefix;
      return separable ? 'Trennbares Verb' : 'Verb';
    }
    // Kind of article (reference 4.3, agreed 11 Oct 2026); other determiners keep "Artikel".
    if (label === 'article' || candidate.pos === 'article') {
      const lemma = norm(candidate.lemma), id = candidate.dictionaryId;
      if (id === 'article-001' || ['der','die','das'].includes(lemma)) return 'Bestimmter Artikel';
      if (id === 'article-002' || lemma === 'ein') return 'Unbestimmter Artikel';
      if (id === 'article-003' || lemma === 'kein') return 'Negationsartikel';
    }
    return POS_DE[label] || POS_DE[candidate.pos] || label || '';
  }
  // A construction is shown as established only when it is not tentative.
  function constructionMarks(candidate, confirmed = false, language = 'en') {
    const k = candidate.construction;
    if (!k || !confirmed && (k.confidence === 'tentative' || candidate.reflexiveUnconfirmed)) return {marks:[], role:null, spans:null};
    const own = verbBase(candidate.lemma), main = verbBase(k.lemma || ''), isMain = own === main;
    // (links chat п. 16: a split word — herbeiholen = herbei + holen — is resolved on its part; the coordinated name keeps the word as
    // written: «Modal mit laufen und herbeiholen», not … holen)
    const tail = verbBase(k.coordinated || ''), name = k.coordinatedLemma && tail && own !== tail && own.endsWith(tail) && String(k.coordinatedLemma).endsWith(' ' + k.coordinated)
      ? String(k.coordinatedLemma).slice(0, -String(k.coordinated).length) + own : k.coordinatedLemma || k.lemma || '';
    const spans = k.spans || null;
    switch (k.id) {
      case 'separable-verb': return {marks:[], role:null, spans};
      // G2 addition (reference 19.10): sein + participle of a verb with haben and sein — Perfekt or state.
      // L13 (reference F12-G3): hätte / wäre + participle — the participle «Konjunktiv II», hätte / wäre «Konjunktiv II mit …»
      // with «бы (о прошлом)» instead of the dictionary meaning.
      // A3 (advisor 03.11): er habe … versucht, er sei … gestorben — the participle «Konjunktiv I», habe / sei «Konjunktiv I mit …».
      // (advisor 16.11, (4) Г: the state group in Konjunktiv II / I — wäre verwandelt, seien vernichtet — «Konjunktiv II · состояние mit …»,
      // not «бы (о прошлом)»)
      case 'perfect-group': if (k.stateOnly) return {marks:[`${k.label === 'Plusquamperfekt' ? 'Präteritum · ' : /^Konjunktiv I{1,2}$/u.test(k.label || '') ? `${k.label} · ` : ''}${L(language, 'состояние', 'state')} mit ${name}`], role:k.clickedRole && k.clickedRole !== 'conditionalPast' ? k.clickedRole : isMain ? null : 'auxiliary', spans};
        if (k.label === 'Konjunktiv I') return isMain && !k.clickedRole ? {marks:['Konjunktiv I'], role:null, spans}
          : {marks:[`Konjunktiv I mit ${name}`], role:k.clickedRole || 'auxiliary', spans};
        if (k.label === 'Konjunktiv II') return isMain && !k.clickedRole ? {marks:['Konjunktiv II'], role:null, spans}
          : {marks:[`Konjunktiv II mit ${name}`], role:'conditionalPast', spans};
        // (advisor 07.11: sein + participle of a haben-only verb — the state passive alone: «состояние mit reparieren», with war
        // «Präteritum · состояние mit …», as «Präteritum · Passiv mit …» of werden)
        return {marks:[`${k.label}${k.state ? ` / ${L(language, 'состояние', 'state')}` : ''} mit ${name}`], role:k.clickedRole || (isMain ? null : 'auxiliary'), spans};
      case 'werden-future': if (k.mood === 'Konjunktiv I') return {marks:[isMain ? 'Konjunktiv I' : `Konjunktiv I mit ${name}`], role:isMain ? null : 'auxiliary', spans};
        return {marks:[`Futur I mit ${name}`], role:isMain ? null : 'auxiliary', spans};
      // F12-G1a / G22: tense first, then Passiv (wurde … getroffen «Präteritum · Passiv mit treffen»); Präsens stays «Passiv mit …» (4.6).
      case 'werden-passive': {
        const past = /Präteritum/u.test(k.note?.en || '');
        return {marks:[`${past ? 'Präteritum · ' : ''}Passiv mit ${name}`], role:isMain ? null : 'passive', spans};
      }
      // G15a (user decision 16.10): werden + a form that is both infinitive and participle, no evidence either way.
      case 'werden-future-or-passive': return {marks:[`Futur I / Passiv mit ${name}`], role:isMain ? null : 'futureOrPassive', spans};
      // A3 (reference 5.6): gelesen «Passiv mit müssen», muss / werden «Passiv mit lesen».
      // (advisor 08.11: the modal names its mood / tense as in the active group — müsse gelesen werden «Konjunktiv I · Passiv mit lesen»,
      // musste … «Präteritum · Passiv mit …»; Präsens indicative stays «Passiv mit …»)
      case 'modal-passive': {
        const mood = MODALS.has(own) && !isMain ? candidate.formFeatures?.modalMood : null;
        return {marks:[isMain ? `Passiv mit ${k.modal}` : `${mood ? mood + ' · ' : ''}Passiv mit ${name}`],
          role:!isMain && own === 'werden' ? 'passive' : null, spans};
      }
      case 'werden-conditional': return {marks:[isMain ? 'Konjunktiv II' : `Konjunktiv II mit ${name}`], role:isMain ? null : 'conditional', spans};
      // To-do 3.4 (F12-B7): wird's gewesen sein — the clicked sein is the auxiliary «Futur II mit sein», not the participle's lemma.
      // (Alice A7 (1), advisor 16.11: würde + perfect infinitive — the past Konjunktiv II: würde … gesehen haben)
      case 'werden-conditional-perfect': return {marks:[isMain ? 'Konjunktiv II' : `Konjunktiv II mit ${name}`],
        role:isMain ? null : own === 'werden' ? 'conditionalPast' : 'perfectHave', spans};
      case 'werden-future-perfect': if (k.clickedRole) return {marks:[`Futur II mit ${name}`], role:k.clickedRole, spans};
        return {marks:[isMain ? 'Futur II' : `Futur II mit ${name}`],
        role:isMain ? null : own === 'werden' ? 'futurePerfectWill' : 'futurePerfectHave', spans};
      // To-do 3.8 (reference G4): könnte «Konjunktiv II mit gebrauchen», sollte «Präteritum / Konjunktiv II mit sagen».
      case 'modal-group': {
        const mood = MODALS.has(own) && !isMain ? candidate.formFeatures?.modalMood : null;
        return {marks:[isMain ? `Modal mit ${name}` : MODALS.has(own) ? `${mood ? mood + ' ' : ''}mit ${name}` : `Modal mit ${name}`], role:null, spans};
      }
      // L1 (links to-do, 20.10.2026; reference F12-B14d): hatte … warten wollen is Plusquamperfekt — the tense of the
      // auxiliary (k.label), not a fixed «Perfekt» (Ich habe arbeiten müssen stays Perfekt, X5.11).
      case 'modal-perfect': {
        const modal = (k.spans || []).map(s => norm(s.text)).find(t => MODALS.has(t)) || '';
        const tense = ['Plusquamperfekt','Konjunktiv II'].includes(k.label) ? k.label : 'Perfekt';
        // L12 (reference F12-B14a–c): hätte … wissen müssen — hätte «бы (о прошлом)».
        const auxRole = tense === 'Konjunktiv II' ? 'conditionalPast' : 'perfectHave';
        // L2 (reference F12-B14e): hatten … geklärt werden können — hatten «… · Passiv mit klären können», können / werden
        // «… · Passiv mit klären» (werden the passive auxiliary), geklärt «… · Passiv mit können».
        if (k.passive) {
          if (isMain) return {marks:[`${tense} · Passiv mit ${modal}`], role:null, spans};
          if (MODALS.has(own)) return {marks:[`${tense} · Passiv mit ${name}`], role:null, spans};
          if (own === 'werden') return {marks:[`${tense} · Passiv mit ${name}`], role:'passive', spans};
          return {marks:[`${tense} · Passiv mit ${name} ${modal}`.trim()], role:tense === 'Konjunktiv II' ? 'conditionalPast' : 'auxiliary', spans};
        }
        if (isMain) return {marks:[`${tense} mit ${modal}`.trim()], role:null, spans};
        if (MODALS.has(own)) return {marks:[`${tense} mit ${name}`], role:null, spans};
        return {marks:[`${tense} mit ${name} ${modal}`.trim()], role:auxRole, spans};
      }
      // G15 (18.10.2026): Futur I / Konjunktiv II with a modal infinitive, as modal-perfect (reference 5.11):
      // Reference F12-B11: werden «Futur I mit erklären können», erklären «Futur I · Modal mit erklären»,
      // können «Futur I mit erklären» (tense first, as G22).
      case 'modal-future': {
        const mood = k.label || 'Futur I', modal = k.modal || '';
        if (isMain) return {marks:[mood, `Modal mit ${name}`], role:null, spans};
        if (MODALS.has(own)) return {marks:[`${mood} mit ${name}`], role:null, spans};
        return {marks:[`${mood} mit ${name} ${modal}`.trim()], role:mood === 'Konjunktiv II' ? 'conditional' : 'auxiliary', spans};
      }
      // C18 (18.10.2026), reference F12-B8: gesehen «Futur I · Passiv», wird / werden «Futur I · Passiv mit sehen»;
      // the finite werden is the Futur (or würde) auxiliary, the infinitive werden the passive auxiliary.
      case 'werden-future-passive': {
        const mood = k.label || 'Futur I';
        if (isMain) return {marks:[mood, 'Passiv'], role:null, spans};
        return {marks:[`${mood} · Passiv mit ${name}`], role:k.clickedRole || null, spans};
      }
      // C18 (2), reference F12-B9 / U-H08: muss «mit kosten · Perfekt», gekostet / haben «Modal mit kosten · Perfekt»;
      // the clicked auxiliary (also sein of gewesen sein) is «Вспомогательный глагол Perfekt».
      // L17 (reference F12-B9b): soll … erwähnt worden sein — every word adds «Passiv»; worden is the passive auxiliary;
      // soll (Präsens) + perfect infinitive «здесь: говорят, будто».
      case 'modal-perfect-infinitive': {
        // (advisor 16.11, (4) Г: modal + participle of a haben-only verb + sein — the state: «Modal mit verwandeln · состояние»)
        const tail = k.stateOnly ? [L(language, 'состояние', 'state')] : k.passive ? ['Perfekt', 'Passiv'] : ['Perfekt'];
        if (k.clickedRole) return {marks:[`Modal mit ${name}`, ...tail], role:k.clickedRole, spans};
        // (TODO 64: the modal names its tense / mood as in the plain modal group — musste … gewesen sein «Präteritum mit sein · Perfekt»)
        if (MODALS.has(own) && !isMain) { const mood = candidate.formFeatures?.modalMood; return {marks:[`${mood ? mood + ' ' : ''}mit ${name}`, ...tail], role:k.hearsay && own === 'sollen' ? 'hearsay' : null, spans}; }
        return {marks:[`Modal mit ${name}`, ...tail], role:null, spans};
      }
      // Reference A6 (F12-A6): geträumt / haben «Perfekt mit träumen» (haben — auxiliary text), sterben «Modal mit sterben»,
      // können «mit sterben»; zu is the Infinitivpartikel; um keeps its conjunction card.
      case 'zu-chain': {
        if (own === 'zu') return {marks:[], role:'infinitiveParticle', spans};
        if (k.conjunctionWord && own === k.conjunctionWord) return {marks:[], role:null, spans};
        if (k.chain === 'perfect') return {marks:[`Perfekt mit ${name}`], role:k.clickedRole || null, spans};
        // (advisor 16.11, (4) Г: verwandelt zu sein — «состояние mit verwandeln»)
        if (k.chain === 'state') return {marks:[`${L(language, 'состояние', 'state')} mit ${name}`], role:k.clickedRole || null, spans};
        // (links chat, advisor 09.11, map N2) ignoriert zu werden: «Passiv mit ignorieren»; werden — the passive auxiliary text
        if (k.chain === 'passive') return {marks:[`Passiv mit ${name}`], role:k.clickedRole || null, spans};
        // (L42 (2), advisor 17.11) geliebt worden zu sein: «Perfekt · Passiv mit lieben»; worden — the passive text, sein — the auxiliary
        if (k.chain === 'passive-perfect') return {marks:[`Perfekt · Passiv mit ${name}`], role:k.clickedRole || null, spans};
        if (MODALS.has(own) && !isMain) return {marks:[`mit ${name}`], role:null, spans};
        return {marks:[`Modal mit ${name}`], role:null, spans};
      }
      case 'reflexive-verb': {
        // Undecided "sich / einander" keeps both names so the variants stay distinguishable.
        // A5 (user decision 15.10): always Reflexiv; «себя / друг друга» is the note under the meaning.
        const marks = ['Reflexiv'];
        if (['Perfekt','Plusquamperfekt'].includes(k.tense)) marks.push(`${k.tense} mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // A1 (reference 5.2): a modal controls the reflexive infinitive (muss mich beeilen).
        // (Astronaut (4): the infinitive of the part before und shares the modal — Modal mit melken und sich waschen)
        else if (k.modal) marks.push(`Modal mit ${(k.sharedInfinitives || []).map(x => x + ' und ').join('')}${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // G15 (19.10.2026): Futur I / Konjunktiv II with werden keep the tense, as Perfekt does (wird sich … abschwächen).
        else if (/^(?:Futur I|Konjunktiv II)/u.test(k.tense || '')) marks.push(`${k.tense} mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // (links chat п. 10, advisor 12.11: haben / sein + zu over the reflexive zu-infinitive — hat sich … zu beteiligen «Reflexiv · haben + zu»)
        else if (k.zuGroup) marks.push(`${k.zuGroup.tense ? k.zuGroup.tense + ' · ' : ''}${k.zuGroup.id === 'haben-zu' ? 'haben + zu' : 'sein + zu'}`);
        if (k.complement?.pattern) marks.push(k.complement.pattern);
        return {marks, role:null, spans};
      }
      // Independent werden ("wird müde"): no construction mark, only the clicked word.
      case 'werden-become': return {marks:[], role:null, spans:null};
      case 'am-superlative': return {marks:['Superlativ'], role:null, spans};
      case 'preposition-article': return {marks:[], role:null, spans};
      // lassen + infinitive follows the modal patterns (4.5, 5.11): each verb names the others.
      case 'lassen-infinitive': {
        // Konjunktiv II of möchte belongs to the modal, not to the lassen group; only würde makes it the group's mood.
        const wuerde = (k.spans || []).some(span => /^würd/iu.test(span.text));
        // (L44 (5), advisor 17.11: hätte … X lassen — the Konjunktiv II of the perfect, hätte is «бы (о прошлом)»)
        const tense = k.tense && k.tense !== 'Präsens' && (k.tense !== 'Konjunktiv II' || wuerde || k.conditionalPerfect) ? k.tense : null;
        // (step 4, reference F12-B5a: a simple tense only on the finite form — lassen under a modal is an infinitive: sollte … reparieren
        // lassen «mit reparieren»; ließe itself is Konjunktiv II, the würde rule is for the modal möchte only)
        const ownTense = k.outerModal ? null : k.tense && k.tense !== 'Präsens' ? k.tense : null;
        // (links chat 14.11: the same group with a verb of perception / helfen as its head — sah ihn kommen, lösen helfen)
        const headVerb = k.head || 'lassen';
        if (own === headVerb) return {marks:[ownTense ? `${ownTense} mit ${name}` : `mit ${name}`], role:k.sense ? `lassen_${k.sense}` : null, spans};
        // (L15 step 4, reference F12-B5j: uns of lass uns keeps its own card «нас» with a line under it — see cardCore)
        if (k.sense === 'letUs' && candidate.item?.type === 'Pronomen') return {marks:[], role:null, spans};
        // (advisor 29.10, reference F12-B5a / B5c: the infinitive under lassen shows «mit lassen» — a simple tense only on ließ / lässt,
        // as with modals; a compound tense stays: bestreichen «Plusquamperfekt mit lassen»; L19: two infinitives joined by und, each the main verb)
        const infinitiveHere = isMain || String(name).split(' und ').map(verbBase).includes(own);
        const compound = tense && /^(?:Perfekt|Plusquamperfekt|Futur I|Konjunktiv II)$/u.test(tense) ? tense : null;
        if (infinitiveHere) return {marks:[compound ? `${compound} mit ${headVerb}` : `mit ${headVerb}`], role:null, spans};
        if (MODALS.has(own)) { const mood = candidate.formFeatures?.modalMood; return {marks:[`${mood ? mood + ' ' : ''}mit ${name} ${headVerb}`], role:null, spans}; }
        return {marks:[`${tense || 'Präsens'} mit ${name} ${headVerb}`],
          role:tense === 'Perfekt' ? 'perfectHave' : k.conditionalPerfect ? 'conditionalPast' : tense === 'Konjunktiv II' ? 'conditional' : 'auxiliary', spans};
      }
      // zu inside haben/sein + zu is the same Infinitivpartikel as in 4.8 (agreed 11 Oct 2026).
      // (#15, advisor 06.11: the tense first, as with the passive — «Präteritum · sein + zu mit sehen»; Präsens without a mark)
      case 'sein-zu': return own === 'zu' ? {marks:[], role:'infinitiveParticle', spans} : {marks:[`${k.tense ? k.tense + ' · ' : ''}${isMain ? 'sein + zu' : `sein + zu mit ${name}`}`], role:null, spans};
      // (links chat, TODO item 88, advisor 12.11) kommen + Partizip II of motion — kam angerannt «прибежал»: the tense on kommen as in a
      // simple group, «kommen + Partizip II» on the participle
      case 'kommen-participle': return {marks:[`${k.tense ? k.tense + ' · ' : ''}${isMain ? 'kommen + Partizip II' : `kommen + Partizip II mit ${name}`}`], role:null, spans};
      // (links chat, TODO item 89, advisor 12.11) a modal without an infinitive + a direction: wollte heim «Präteritum / Konjunktiv II ·
      // глагол движения опущен»
      case 'modal-direction': return {marks:[`${k.tense ? k.tense + ' · ' : ''}${L(language, 'глагол движения опущен', 'verb of motion left out')}`], role:null, spans};
      // zu + infinitive (4.8): zu is the Infinitivpartikel; the verb keeps a plain Verb line.
      case 'zu-infinitive': return {marks:[], role:own === 'zu' ? 'infinitiveParticle' : null, spans};
      // um / ohne / statt … zu: the opener keeps its conjunction card (heading, Konjunktion, meaning).
      // 3.16 / 3.21: a construction recorded in the card's match block (weder … noch, um … willen) — the card names it.
      // C1 (user 18.10): an expression shows its tense when the resolver established one (Feste Wendung · Präteritum).
      case 'recorded-construction': return {marks:candidate.expressionTense ? [candidate.expressionTense] : [], role:null, spans};
      // B2: Komparativ + als — als shows «здесь: чем».
      case 'comparative-als': return {marks:['Komparativ + als'], role:null, spans};
      // 5б (2): so + Adjektiv + als (so weiß als Schnee) — als shows «здесь: как».
      case 'so-als': return {marks:['so + Adjektiv + als'], role:null, spans};
      // Astronaut (3): Nomen + um + dasselbe Nomen (Tag um Tag) — um shows «здесь: за».
      case 'noun-um-noun': return {marks:['Nomen + um + Nomen'], role:null, spans};
      // G51 step 3: Komparativ + denn (härter denn je) — denn shows «здесь: чем».
      case 'comparative-denn': return {marks:['Komparativ + denn'], role:null, spans};
      // Grimm item 3 (11.11): als + a person form (als wäre) — als shows «здесь: как будто».
      // Grimm item 3 (11.11): immer / viel + Komparativ (immer tiefer, viel zu schwach) — «здесь: всё …» / «здесь: намного».
      case 'immer-comparative': return {marks:['immer + Komparativ'], role:null, spans};
      case 'viel-comparative': return {marks:[spans.length > 2 ? 'viel zu + Adjektiv' : 'viel + Komparativ'], role:null, spans};
      case 'as-if-als': return {marks:['als + Verb = als ob'], role:null, spans};
      // G51 / G14: a modal particle — the line «Partikel» comes from the card's posLabel, no marks of its own.
      case 'modal-particle': return {marks:[], role:null, spans};
      case 'zu-conjunction': return {marks:[], role:own === 'zu' ? 'infinitiveParticle' : null, spans};
      // Reference G6 (to-do 3.12): schien «Präteritum · mit fürchten» + «здесь: кажется, по-видимому»; fürchten «mit scheinen»;
      // zu Infinitivpartikel. With a chain inside (A6 × G6: schien … gekommen zu sein) the chain words keep the chain's
      // own marks (gekommen / sein «Perfekt mit kommen»); the whole group is highlighted.
      case 'modal-zu': {
        if (own === k.verb && !isMain) return {marks:[`${k.tense ? k.tense + ' · ' : ''}mit ${name}`], role:`zu_${k.verb}`, spans};
        if (own === 'zu') return {marks:[], role:'infinitiveParticle', spans};
        if (k.inner?.id === 'zu-chain') return {...constructionMarks({...candidate, construction:{...k.inner, spans}}, confirmed, language), spans};
        return {marks:[`mit ${k.verb}`], role:null, spans};
      }
      case 'haben-zu': return own === 'zu' ? {marks:[], role:'infinitiveParticle', spans} : {marks:[`${k.tense ? k.tense + ' · ' : ''}${isMain ? 'haben + zu' : `haben + zu mit ${name}`}`], role:isMain ? null : 'haveTo', spans};
      // C14 step 1: the resolver gives Perfekt / Plusquamperfekt in the note (gesprochen worden war).
      // F12-G1b / G22 (user decision 18.10): tense first, then Passiv. gestohlen «Perfekt · Passiv»,
      // ist «Perfekt · Passiv mit stehlen» (auxiliary text), worden the same with the passive text.
      case 'werden-passive-perfect': {
        const tense = String(k.note?.en || '').split(' · ')[1] || 'Perfekt';
        if (isMain) return {marks:[tense, 'Passiv'], role:null, spans};
        return {marks:[`${tense} · Passiv mit ${name}`], role:own === 'werden' ? 'passive' : 'auxiliary', spans};
      }
      default: return {marks:/^[A-ZÄÖÜ]/u.test(k.label || '') ? [k.label] : [], role:null, spans};
    }
  }
  // G48 (23.10.2026, reference 3.18 / C6): a word no dictionary knows, explained by its parts (resolver word formation).
  // Compound: «die Bauchhöhe = Bauch + Höhe» · «Nomen · Kompositum» · «Bauch — живот · Höhe — высота»; linking letters in
  // brackets (Eule(n)); a half-suffix gives a fixed explanation (-frei: без …). Derived word: «Nomen · aus Verb einbiegen» ·
  // «Возможно, от einbiegen — …» (the link is seen in the spelling only, L12); -erei / -ig / -lich / -bar / un- with their
  // explanation in the order of the word (un- before the base, a suffix after it — G79). A part without a Russian meaning keeps its English one, marked (only derived words).
  const HALF_SUFFIX = {frei:['-frei: без …','-frei: -free'],los:['-los: без …','-los: -less'],voll:['-voll: полный …','-voll: -ful'],
    reich:['-reich: богатый …','-reich: rich in …'],arm:['-arm: бедный …','-arm: low in …'],artig:['-artig: похожий на …','-artig: …-like'],
    fähig:['-fähig: способный к …','-fähig: capable of …'],
    // (advisor 10.11) Offenburger, Schaffhauser: the inhabitant or the adjective of the place
    er:['-er: житель / прилагательное от названия места','-er: inhabitant / adjective of the place'],
    // (advisor 10.11) drei + Geschoss + -ig
    ig:['-ig: с …','-ig: with …']};
  const FORMATION_TEXT = {
    erei:{Verb:['-erei: занятие (часто надоевшее)','-erei: activity (often tiresome)'],Nomen:['-erei: место для …','-erei: place for …']},
    ig:['-ig: с … / похожий на …','-ig: with … / like …'], lich:['-lich: с … / похожий на …','-lich: with … / like …'],
    bar:['-bar: можно …','-bar: can be …'], un:['un-: не-','un-: not …']};
  // (advisor 07.11) a bound first part is named with its hyphen: «rück- — назад, обратно; задний»
  const formationName = p => p.pos === 'Nomen' ? p.lemma.charAt(0).toUpperCase() + p.lemma.slice(1) : p.pos === 'Präfix' ? `${p.lemma}-` : p.lemma;
  // A part shows its first two meanings (user 23.10); the rest is counted for «ещё N значений» (the part's own card).
  // An external part loses its brackets (Latin names, usage notes: «елец (Leuciscus leuciscus L.)»), as compact() does for
  // external cards; an own part keeps them, as its card does (D13).
  // (advisor 06.11) A meaning of a part with a rude usage label (груб., пренебр., жарг. — RUDE_LABELS, the labels the cards show):
  // an external meaning by its Russian label codes, an own meaning by its bracket at the start («(разг., неодобр.) рявкать»).
  const LABEL_WORDS = new Set([...LABEL_SET.flatMap(([, ru, , en]) => [ru, en]), ...Object.values(DOMAIN),
    'вульг.', 'бран.', 'неодобр.', 'презр.', 'обсц.', 'прост.']);
  // (abbreviations only — «вульг.»: a domain word written out in full, «радио», is a meaning: Funk — радио)
  const onlyLabels = m => { const w = String(m).split(/[\s,]+/u).filter(Boolean); return w.length > 0 && w.every(x => /\.$/u.test(x) && LABEL_WORDS.has(x)); };
  const RUDE_OWN = /^\([^()]*(?:груб|вульг|бран|неодобр|пренебр|презр|жарг|обсц|непристойн|оскорб)[^()]*\)/u;
  function formationMeaning(p, language) {
    const list = text => p.source === 'main' ? meaningParts(text) : meaningParts(String(text || '').replace(/\([^()]*\)/g, ''));
    // A wiki template left in an external Russian meaning («:Шаблон:Дрозд») is no meaning (G68).
    // (a «meaning» that is only a label — Arsch «вульг.» — is no meaning)
    const own = list(language === 'ru' ? p.ru : p.en).filter(m => !/Шаблон:|^:/u.test(m) && !onlyLabels(m)), en = list(p.en);
    const n = shownCount(Infinity);
    // (18.11.2026, chat «languages in the reader», advisor: each part in the pack) a pack language: the part's text in the pack
    // (p.pack[code], filled by pack-translations.js — its own card or the pack's dictionary), else its English with the pack's mark
    // «English: » (none when the pack's phrases are not loaded — the English card as before). language: the line's language.
    if (isPack(language)) {
      // (the pack's text keeps its brackets — «troszczyć (się)», review B 17.11 / A 18.11; the English one as the English card shows it)
      const mine = meaningParts(String(p.pack?.[language] || ''));
      if (mine.length) return {text:(n === Infinity ? mine : mine.slice(0, 2)).join('; '), rest:Math.max(0, mine.length - 2), language};
      return own.length ? {text:`${englishPrefix(language)}${(n === Infinity ? own : own.slice(0, 2)).join('; ')}`, rest:Math.max(0, own.length - 2), language:'en'} : {text:'', rest:0};
    }
    if (own.length) {
      // (advisor 06.11) The two shown meanings are the first ones without a rude label; all meanings (ещё N значений) in their
      // order, a rude one with its label. A part whose every meaning is rude shows the first one with its label (never empty).
      const codes = language === 'ru' && p.source !== 'main' && p.ruLabels ? partCodes(p.ruLabels) : null;
      const rudeCodes = m => (codes?.get(labelKey(m)) || []).filter(c => RUDE_LABELS.has(LABEL_BY_CODE.get(c)?.id));
      const rude = m => language === 'ru' && (p.source === 'main' ? RUDE_OWN.test(m) : rudeCodes(m).length > 0);
      const marked = m => { const c = p.source === 'main' ? [] : rudeCodes(m);
        return c.length ? `${shownLabels(c, 'ru', false).map(l => l.short).join(' ')} ${m}` : m; };
      const plain = own.filter(m => !rude(m)), short = plain.length ? plain.slice(0, 2) : [own[0]];
      const shown = n === Infinity ? own : short;
      return {text:shown.map(m => plain.length && !rude(m) ? m : marked(m)).join('; '), rest:Math.max(0, own.length - short.length)};
    }
    return language === 'ru' && en.length ? {text:`английский: ${en.slice(0, n).join('; ')}`, rest:Math.max(0, en.length - 2)} : {text:'', rest:0};
  }
  // The lines of the card (user 23.10): every part on a line of its own — «Bauch — живот», «Höhe — высота; уровень»;
  // a half-suffix or a suffix explanation last, as in the word (G79, user 25.10). A line of a part with an own card and more meanings carries the
  // part's entry id and the number of the meanings not shown.
  // G68 (user 24.10.2026): a name read literally — one line «буквально: Weiß + Kopf — белый + голова», the first meaning of
  // each part (as for other names, no translation of the name itself).
  function nameLiteral(f, language) {
    const first = p => { const m = formationMeaning(p, isPack(language) ? 'en' : language).text; return m.split(/;\s*/u)[0].replace(/^(английский: )?([^,]*),.*$/u, '$1$2'); };
    const label = (p, k) => `${k === 0 || p.pos === 'Nomen' ? p.text.charAt(0).toUpperCase() + p.text.slice(1) : p.text}${p.link ? `(${p.link})` : ''}`;
    const last = f.parts.length - 1;
    const names = f.parts.map((p, k) => k === last ? formationName(p) : label(p, k)).join(' + ');
    return `${L(language, 'буквально', 'literally')}: ${names} — ${f.parts.map(first).join(' + ')}`;
  }
  // One line «name — meaning», signed with the word it belongs to: a part of a compound / the base of a diminutive (4.19) and the
  // plain verb under a reflexive «sich X» without its own meaning (advisor + user 06.11) — never shown as the meaning of the whole.
  function namedLine(name, text, more = 0, entryId = null) { return {text:`${name} — ${text}`, more, entryId}; }
  function formationLines(f, language) {
    if (f.kind === 'particle-verb') return particleVerbLines(f, language);
    if (f.kind === 'name') return [{text:nameLiteral(f, language), more:0, entryId:null}];
    const gloss = (p, prefix = '') => { const m = formationMeaning(p, language);
      // (advisor 06.11) «ещё N значений» for every part, own or external: the external meanings are in the split whole.
      const line = namedLine(`${prefix}${formationName(p)}`, m.text, m.rest, p.dictionaryId || null);
      return m.language ? {...line, language:m.language} : line; };
    // (a pack language: a fixed line is the pack's phrase or the English one — its language)
    const fixed = (text, ru = null, en = null) => isPack(language) && en != null ? {text, more:0, entryId:null, language:packPhrase(language, en, ru) ? language : 'en'} : {text, more:0, entryId:null};
    // #21 (reference F12-G12e): a diminutive — the base's parts, the last one marked «(уменьш.)»: «Spatz — воробей (уменьш.)»,
    // «Rock — юбка · Tasche — карман (уменьш.)».
    // (advisor 09.11) a feminine in -in: the masculine word's parts and meaning («Kommissar — комиссар»)
    if (f.kind === 'feminine') return f.parts.map(p => gloss(p));
    if (f.kind === 'diminutive') return f.parts.map((p, k) => { const g = gloss(p);
      return k === f.parts.length - 1 && g.text ? {...g, text:`${g.text} ${L(language, '(уменьш.)', '(diminutive)')}`} : g; });
    if (f.kind === 'compound') {
      const parts = f.half ? f.parts.slice(0, -1) : f.parts;
      // G79 (user 25.10): the lines follow the parts of the word, as the heading (eulenfrei = Eule(n) + frei: Eule — …, then -frei)
      return [...parts.map(p => gloss(p)), ...(f.half ? [fixed(L(language, ...HALF_SUFFIX[f.half]), ...HALF_SUFFIX[f.half])] : [])];
    }
    const b = f.base;
    if (f.prefix === 'un') return [fixed(L(language, ...FORMATION_TEXT.un), ...FORMATION_TEXT.un), gloss(b)];
    if (f.suffix === 'erei') { const t = FORMATION_TEXT.erei[b.pos === 'Verb' ? 'Verb' : 'Nomen']; return [gloss(b), fixed(L(language, ...t), ...t)]; }
    if (FORMATION_TEXT[f.suffix]) return [gloss(b), fixed(L(language, ...FORMATION_TEXT[f.suffix]), ...FORMATION_TEXT[f.suffix])];
    return [gloss(b, `${L(language, 'Возможно, от', 'Possibly from')} `)];
  }
  // G47 (reference C4, 23.10.2026): a joined particle + verb that no dictionary has, explained by its parts as G48 does
  // (user 23.10): «hinab — вниз (туда)» · «rutschen — буксовать; скользить» — the parts, not a guess of the meaning in
  // the sentence. The verb line shows two meanings; an own card with more gives «ещё N значений →».
  // Two own cards of the verb (ziehen «тянуть» / «переезжать») — a line each (user 23.10).
  function particleVerbLines(f, language) {
    const line = v => {
      let parts = meaningParts(brief(v, language)), shown = language, prefix = '';
      if (!parts.length && language !== 'en') { parts = meaningParts(brief(v, 'en')); shown = 'en'; prefix = englishPrefix(language); }
      const own = ownCard(v), rest = own ? Math.max(0, meaningParts(v.translation?.[shown] || '').length - 2) : 0;
      return {text:`${v.lemma} — ${prefix}${parts.slice(0, shownCount(Infinity)).join('; ')}`, more:rest, entryId:own ? v.dictionaryId || null : null, shown};
    };
    // (advisor 08.11: a particle without a meaning of its own in the table — ab-, aus-, nach- — is shown bare: «ab- · fressen — to eat»)
    const particleMeaning = f.particle[language] || f.particle.en;
    // (18.11.2026, advisor: each part in the pack) a pack language: the particle's own text (f.particle[code], pack-translations.js),
    // else the English one with the pack's mark
    if (isPack(language)) {
      const own = packPhrase(language, f.particle.en, f.particle.ru) || f.particle[language], text = own || f.particle.en;
      return [{text:text ? `${f.particle.form} — ${own ? '' : englishPrefix(language)}${text}` : `${f.particle.form}-`, more:0, entryId:null, ...(text ? {language:own ? language : 'en'} : {})},
        ...(f.verbs || [f.verb]).map(v => { const l = line(v); return {...l, language:l.shown}; })];
    }
    return [{text:particleMeaning ? `${f.particle.form} — ${particleMeaning}` : `${f.particle.form}-`, more:0, entryId:null}, ...(f.verbs || [f.verb]).map(line)];
  }
  // The card: heading «hinabrutschen = hinab + rutschen», the grammar of the verb form (Präteritum, Perfekt mit … and its
  // highlight), one line per part.
  function particleVerbCard(resolution, candidate, options) {
    const f = candidate.formation, language = textLanguage(options.language), lookup = options.lookup || (() => null);
    // The verb is the card's verb (lemma herabrutschen): its construction names it (Konjunktiv II mit hinabrutschen, not the
    // auxiliary's label of another verb).
    const verb = {...f.verb, lemma:f.lemma, ...(candidate.construction ? {construction:candidate.construction} : {}),
      ...(candidate.formFeatures ? {formFeatures:candidate.formFeatures} : {})};
    const base = cardBase(resolution, verb, options);
    const lines = particleVerbLines(f, language).map(l => ({text:l.text, more:l.more, helpEntry:l.entryId ? lookup({id:l.entryId}) : null, ...(l.language ? {language:l.language} : {})}));
    for (const l of lines) if (!l.helpEntry) l.more = 0;
    // G57 step 2 (user 24.10.2026): a particle with an own card (heraus, herab, hinein — Adverb) is a part of the details too.
    if (lines[0] && !lines[0].helpEntry) lines[0].helpEntry = lookup({word:f.particle.form, type:'Adverb'}) || null;
    // The verb's label segments are the verb's meaning, not the parts: dropped (the browser shows segments before lines).
    const {segments: _segments, segmentPrefix: _prefix, ...rest} = base;
    // G47 part 2 (advisor 03.11): a separated particle (eilte … hinaus) — the joined word is in no dictionary, so it is not the
    // heading: the parts only, «hinaus- + eilen», the meanings of the parts from their cards, the grammar of the verb.
    const split = candidate.construction?.id === 'directional-split';
    // (advisor 03.11: the grammar line as for the other separable verbs — «Trennbares Verb · Präteritum»)
    if (split && typeof rest.grammar === 'string') rest.grammar = rest.grammar.replace(/^Verb\b/u, 'Trennbares Verb');
    // (a pack language: the lines are English unless a verb line has the pack's text — review C 17.11, the popup's lang attribute)
    const linesLanguage = isPack(language) && !particleVerbLines(f, language).some(l => l.shown === language) ? 'en' : language;
    return {...rest, heading:split ? `${f.particle.form}- + ${f.verb.lemma}` : `${f.lemma} = ${f.particle.form} + ${f.verb.lemma}`, text:lines.map(l => l.text).join(' · '), lines,
      textLanguage:linesLanguage, missing:false, derived:true, note:'', more:0, helpEntry:null};
  }
  // One line of text (Wortschatz, alternatives, tools): the lines joined with « · ».
  const formationText = (f, language) => formationLines(f, language).map(l => l.text).join(' · ');
  function formationCard(candidate, language, lookup = () => null) {
    const f = candidate.formation, cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (f.kind === 'name') {
      const text = nameLiteral(f, language);
      return {heading:f.lemma, grammar:'Name', text, lines:[{text, more:0, helpEntry:null}], textLanguage:isPack(language) ? 'en' : language, missing:false, derived:true,
        note:'', more:0, spans:null, helpEntry:null};
    }
    let heading = `${f.gender ? f.gender + ' ' : ''}${f.lemma}`, marks = [];
    if (f.number === 'plural') marks.push('Plural');
    if (f.kind === 'compound') {
      const noun = f.pos === 'Nomen', last = f.parts.length - 1;
      const label = (p, k) => {
        // (a place + -er: Offenburger = Offenburg + -er)
        if (k === last && (f.half === 'er' || f.half === 'ig')) return `-${f.half}`;
        const text = k === last ? (noun ? cap(f.number === 'plural' ? p.surface : p.lemma.toLowerCase()) : p.text)
          : (noun && k === 0 || p.pos === 'Nomen' ? cap(p.text) : p.text);
        return `${text}${p.link ? `(${p.link})` : ''}`;
      };
      heading += ` = ${f.parts.map(label).join(' + ')}`;
      marks.push('Kompositum');
    } else if (f.kind === 'feminine') marks.push(`weibliche Form von ${f.baseLemma.charAt(0).toUpperCase()}${f.baseLemma.slice(1)}`);
    else if (f.kind === 'diminutive') marks.push(`Verkleinerung von ${f.baseLemma.charAt(0).toUpperCase()}${f.baseLemma.slice(1)}`);
    else marks.push(f.prefix === 'un' ? `un- + ${f.base.lemma}` : `aus ${f.base.pos === 'Nomen' ? 'Nomen' : f.base.pos === 'Verb' ? 'Verb' : 'Adjektiv'} ${formationName(f.base)}`);
    let lines = formationLines(f, language).map(l => ({text:l.text, more:l.more, helpEntry:l.entryId ? lookup({id:l.entryId}) : null, ...(l.language ? {language:l.language} : {})}));
    // (advisor + user 10.11) a whole Russian record of the word (Fechtmeister «тренер по фехтованию», not «фехтовать · мастер»):
    // its meanings instead of the parts, in the Russian interface; the heading and the grammar stay those of the split
    if (language === 'ru' && candidate.wholeRu?.meanings?.length) { const m = fit(candidate.wholeRu.meanings.join('; ')); lines = [{text:m.text, more:m.rest, helpEntry:null}]; }
    // (advisor 09.11) a split with a place-name / surname head and no sign before it: «Name / Nomen · Kompositum» — both readings shown
    const grammar = (f.maybeName ? 'Name / ' : '') + [f.pos, ...marks].join(' · ');
    // (a pack language: the card's language is the pack's when a line has the pack's text, else English; each line keeps its own —
    // 18.11.2026, before: always English; review C 17.11, the popup's lang attribute)
    const linesLanguage = isPack(language) ? lines.some(l => l.language === language) ? language : 'en' : language;
    return {heading, grammar, text:lines.map(l => l.text).join(' · '), lines, textLanguage:linesLanguage, missing:false, derived:true,
      note:'', more:0, spans:null, helpEntry:null};
  }
  // (advisor + user 10.11) a word no reading found, with a whole Russian record: «Fangnetz · Nomen — рыболовная сеть …» (Russian only;
  // the Russian dictionary has no gender, so no article)
  function wholeCard(resolution, word, language) {
    const w = resolution?.wholeRu;
    if (language !== 'ru' || !w?.meanings?.length) return null;
    const m = fit(w.meanings.join('; '));
    return {heading:w.word || word, grammar:w.pos || '', text:m.text, more:0, textLanguage:'ru', missing:false, derived:true, note:'', spans:null, helpEntry:null};
  }
  // 5а.1а (cards chat + advisor 12.11): the name of a participle use — one function for the popup and the dictionary details
  // (reader/bibliothek.js); null for an adjective use. Which own card is a participle at all is the resolver's (participleCard:
  // participle_of without meaning_differs; X-er with no noun after it — Komparativ).
  const participleName = usage => usage?.kind === 'participle-I' ? 'Partizip I' : usage?.kind === 'participle-II' ? 'Partizip II' : null;
  // #89: «самый» before each adjective meaning of the card (слабый; слабо → самый слабый); an adverb meaning (-о / -е) is left out
  const superlativeRu = meaning => { const parts = meaningParts(meaning).map(p => p.trim()).filter(Boolean);
    const adjectives = parts.filter(p => /(?:ый|ий|ой)(?:\s*\(.*\))?$/u.test(p.split(/,\s*/u)[0]));
    return (adjectives.length ? adjectives : parts.slice(0,1)).map(p => `самый ${p}`).join('; '); };
  const fromText = (source, meaning, language) => L(language, 'От {0} — {1}', 'From {0} — {1}', source, meaning);
  // Dictionary meaning on the chosen language; RU without a Russian value keeps the English one marked.
  function meaningText(candidate, language, inline = false) {
    // (a pack language without a text of its own: the English meaning, as an English card shows it)
    if (isPack(language) && !brief(candidate, language, inline)) {
      // (advisor 19.11, ENGLISH_BY_PARTS: a verb read by its parts — its lines, each in its own language)
      const lines = englishPartsLines(candidate, language);
      if (lines) return {text:lines.map(l => l.text).join(' · '), language, more:0,
        lines:lines.map(l => ({text:l.text, more:0, helpEntry:null, ...(l.language ? {language:l.language} : {})}))};
      // (Ч4: with the pack's line for «English: » that mark stands before the English text, as «английский: » in Russian)
      const english = meaningText(candidate, 'en', inline), mark = englishPrefix(language);
      return english && mark ? {...english, text:`${mark}${english.text}`, prefix:`${mark}${english.prefix || ''}`} : english;
    }
    if (inline) { const own = brief(candidate, language, true), en = !own && language === 'ru' ? brief(candidate, 'en', true) : '';
      return own ? {text:own, language, more:hiddenMeanings(candidate, language)} : en ? {text:`английский: ${en}`, language:'en', more:hiddenMeanings(candidate, 'en')} : null; }
    const own = brief(candidate, language);
    if (own) { const shown = withExtra(candidate, language, own, labelSegments(candidate, language, language));
      return {text:shown.text, language, more:hiddenMeanings(candidate, language), segments:shown.segments}; }
    const english = language === 'ru' ? brief(candidate, 'en') : '';
    if (english) return {text:`английский: ${english}`, language:'en', more:hiddenMeanings(candidate, 'en'),
      segments:labelSegments(candidate, 'en', 'ru'), prefix:'английский: '};
    return null;
  }
  // An own dictionary entry (the base of «От lernen — …» lines): D13 fit, like own cards.
  function entryFit(entry, language) {
    if (!entry) return {text:'', rest:0};
    return fit(language === 'ru' ? entry.translation_ru : language === 'en' ? entry.translation_en : entry[`translation_${language}`] || '');
  }
  /**
   * card(resolution, candidate, {word, language, lookup}) -> {heading, grammar, text, textLanguage, missing, more, spans, helpEntry}
   * more: meanings of an own card left out of the popup text (D13), for the «ещё N значений» link.
   * lookup({id, word, type}) returns a dictionary entry or null (for help and "From …" lines).
   */
  const TENSE_MARK = /^(?:Präsens|Präteritum|Perfekt|Plusquamperfekt|Futur|Konjunktiv|Imperativ)/u;
  function contractionHeading(c) {
    return c.kind === 'es' ? `${c.form} = ${c.parts[0]} + es` : `${c.form} (= ${c.parts[0]})`;
  }
  // E7 (reference C8, 24.10.2026): a hyphen stub read as the whole word (Gold- und Silbermünzen) keeps the card of the whole word
  // and adds a line under the meaning; a stub without a whole word that is a function word (Aus- oder Umschalten) is «part of a word».
  function cardCore(resolution, candidate, options = {}) {
    const language = textLanguage(options.language);
    if (candidate?.wordFragment) return {heading:candidate.lemma, grammar:'', text:candidate.translation[language], textLanguage:language,
      missing:false, derived:true, note:'', more:0, spans:candidate.compound?.spans || null, helpEntry:null};
    // (advisor 19.11, wrong card 1) a single letter without a full stop (Warum mit M?, Wer A sagt …): «Buchstabe · буква „M“» — a shared
    // phrase of the display, translated by the packs; a pack without it — English
    if (candidate?.letter) {
      const own = language === 'ru' || language === 'en' || !isPack(language) ? '' : packPhrase(language, 'letter “{0}”', 'буква „{0}“');
      const shownLanguage = language === 'ru' || language === 'en' || own ? language : 'en';
      return {heading:candidate.lemma, grammar:'Buchstabe', text:own ? fill(own, [candidate.lemma]) : L(shownLanguage, 'буква „{0}“', 'letter “{0}”', candidate.lemma),
        textLanguage:shownLanguage, missing:false, derived:false, note:'', more:0, spans:null, helpEntry:null};
    }
    let model = wordCard(resolution, candidate, options);
    // (advisor 06.11, fresh sample item 3 (в), DRAFT): an external word known only in English — its composition from our parts as a
    // line under the English text, in the Russian interface only; a hint, not a translation («состав:», as «(без sich)»).
    // (only under an English text: a card that already says it in Russian — «От missachten — …» — needs no parts)
    // (and a diminutive of such a word: «Lämmerschwanz — английский: lamb tail (уменьш.)», advisor 07.11)
    // (advisor 19.11, reference G12 19.11) a record that only points to its base by the Kaikki link (resolver: candidate.formOf) —
    // «уменьш. от Maus — мышь», «устар. форма от Mörser — ступка», «разг. форма от nicht — не», «жен. к Krämer — …»; the base's text in
    // the popup language (a pack: its own text of the base, else English with the mark); only in place of the record's English text
    if (candidate?.formOf && model && !model.missing) {
      const english = language === 'en' || /^(?:английский: )/u.test(String(model.text || '')) || model.textLanguage === 'en' && language !== 'ru';
      const shown = english ? formOfText(candidate, language) : null;
      if (shown) {
        // (the record's own labels stay before the text — nich «разг.», Appel «colloq. reg.», Feldscherer «dated»)
        const labels = (model.segments || []).find(segment => segment?.labels?.length)?.labels;
        model = {...model, text:shown.text, textLanguage:shown.language, more:0, segments:labels ? [{labels, text:shown.text}] : undefined, segmentPrefix:undefined, formOf:true};
      }
    }
    // (advisor 19.11, «Астронавт»: a participle with its own record — drohend «threatening») the main text stays the record's; its verb
    // goes to a second line like «состав», the lemma only — «От drohen»: the verb's first meaning may be another sense (bestehend
    // «existing» — bestehen «сдать экзамен»), and the sense is not chosen (the Russian popup)
    if (candidate?.participleOf && language === 'ru' && model && !model.missing && !model.composition && candidate.participleOf.base)
      model = {...model, composition:{prefix:'', lines:[{text:`От ${candidate.participleOf.base}`, more:0}]}};
    if (candidate?.composition && language === 'ru' && /(?:^|— )английский: /u.test(String(model.text || ''))) {
      // (advisor 06.11: the lines of the «Kompositum» card itself — the same parts and the same meanings, two of them; a part
      // with more meanings is a button that opens them in the line, as «ещё N значений» of the card)
      const lines = formationLines(candidate.composition, 'ru').map(l => ({text:String(l.text || ''), more:l.more || 0}));
      // (a part without a Russian meaning — Palme — [[]] — gives no line: all parts or none)
      if (lines.length > 1 && lines.every(l => /\s—\s.*\p{L}/u.test(l.text) && !/[\[\]{}]/u.test(l.text)))
        model = {...model, composition:{prefix:'состав: ', lines}};
    }
    // L23 (reference A3, 19.10): a modal in Konjunktiv I (er könne) — the hint for reported speech under the meaning.
    // (advisor 03.11: also habe / sei / werde in Konjunktiv I — alone or in their Perfekt / Futur group, and the group's main verb)
    const konj1Group = ['perfect-group','werden-future'].includes(candidate?.construction?.id) && (candidate.construction.label === 'Konjunktiv I' || candidate.construction.mood === 'Konjunktiv I') && !candidate.construction.asIf;
    if (candidate?.formFeatures?.reportedSpeech && (candidate.construction?.id === 'modal-group' || !candidate.construction) || konj1Group) {
      const hint = L(language, 'косвенная речь: так говорят или думают другие', 'reported speech');
      model = {...model, note:model.note ? `${model.note}; ${hint}` : hint};
    }
    // G12 (advisor 29.10): a card found through the new spelling names the old one (läßt — old spelling of lässt).
    const ref = resolution?.formReference;
    if (ref?.oldSpelling && candidate && candidate.source === 'main') {
      const line = L(language, 'старое написание: {0} = {1}', 'old spelling: {0} = {1}', ref.form, ref.target);
      model = {...model, note:model.note ? `${model.note}; ${line}` : line};
    }
    // (advisor 14.11) a colloquial short particle read as the full one (reingeschaut — hereingeschaut)
    if (ref?.colloquial && candidate) {
      const line = L(language, 'разг.: {0} = {1}', 'colloquial: {0} = {1}', ref.form, ref.target);
      model = {...model, note:model.note ? `${model.note}; ${line}` : line};
    }
    // L15 step 4 (reference F12-B5j, user 25.10, variant Б): uns of lass uns — its own meaning and the line «здесь: lass uns …».
    if (candidate?.construction?.id === 'lassen-infinitive' && candidate.construction.sense === 'letUs' && candidate.item?.type === 'Pronomen') {
      const line = L(language, 'здесь: lass uns … — «давай(те) …»', 'here: lass uns … — “let’s …”');
      model = {...model, note:model.note ? `${model.note}; ${line}` : line};
    }
    // so «здесь: то, тогда» (advisor 29.10): so resuming the clause before it — the so card stays, the line is added.
    if (resolution?.soResumptive && candidate && candidate === resolution.selected) {
      const line = L(language, 'здесь: то, тогда (часто не переводится)', 'here: then (often not translated)');
      model = {...model, note:model.note ? `${model.note}; ${line}` : line};
    }
    const e = resolution?.ellipsis;
    if (!e || e.partOnly || !candidate || candidate !== resolution.selected) return model;
    if (!model.spans && candidate.compound?.spans) model.spans = candidate.compound.spans;
    const line = L(language, '{0}- = {1}: конец слова взят из {2}', '{0}- = {1}: the ending is from {2}', e.stub, e.word, e.next);
    return {...model, note:model.note ? `${model.note}; ${line}` : line};
  }
  // G57: the number of meanings a text shows («a; b (c; d); e» — 3), for «ещё N значений».
  // Meanings split at ";" outside brackets, as shown; a bracket the data left open (Darum «за это (то, него, неё, них];
  // для этого») splits at every ";", so a hidden meaning is never counted as none.
  const meaningCount = text => {
    const value = String(text || '');
    if ((value.match(/\(/g) || []).length === (value.match(/\)/g) || []).length) return meaningParts(value).length;
    return new Set(value.split(';').map(v => v.replace(/\s+/g, ' ').trim()).filter(Boolean)).size;
  };
  const hiddenCount = (short, full) => Math.max(0, meaningCount(full) - meaningCount(short));
  /**
   * G57 (user 24.10.2026): every card, own or external, counts the meanings its short text leaves out (`more`, and
   * `more` of each line of a card of parts); card(…, {all:true}) is the same card with all meanings, shown in the popup
   * by «ещё N значений ↓». An own card keeps the D13 count (fit()).
   */
  // (Ч4, advisor 17.11) a pack language: a card shown in English (no text of the pack — the whole English card) gets the mark
  // «English: » of the pack (as «английский: » in Russian) before its text; ru / en — unchanged
  function card(resolution, candidate, options = {}) {
    const model = cardShown(resolution, candidate, options), language = textLanguage(options.language);
    // (19.11.2026) a pack language, a card with no text in any language (an external verb no dictionary translates — bespannen): the
    // message «not found» in the pack's language when reader.json has it (as an own card's message), never the English one
    if (isPack(language) && model?.missing && model.textLanguage === 'en') {
      const own = packPhrase(language, NO_TRANSLATION.en, NO_TRANSLATION.ru);
      if (own) return {...model, text:own, textLanguage:language};
    }
    if (!isPack(language) || !model || model.textLanguage !== 'en' || model.missing || model.lines || !model.text) return model;
    // (no second mark: a text composed around an English meaning carries the mark already — in its text or in its segments' prefix)
    const mark = englishPrefix(language);
    // (19.11.2026, user: no English line without the mark) the note of an English card is English too — it carries the mark as well
    const note = mark && model.note && !String(model.note).includes(mark) ? {note:`${mark}${model.note}`} : {};
    if (!mark || String(model.text).includes(mark) || String(model.segmentPrefix || '').includes(mark)) return {...model, ...note};
    return {...model, ...note, text:`${mark}${model.text}`, ...(model.segments ? {segmentPrefix:`${mark}${model.segmentPrefix || ''}`} : {})};
  }
  function cardShown(resolution, candidate, options = {}) {
    if (options.all) return withAll(() => cardBase(resolution, candidate, options));
    const model = cardBase(resolution, candidate, options);
    if (ALL) return model;
    const full = withAll(() => cardBase(resolution, candidate, options));
    if (model.lines && full.lines?.length === model.lines.length)
      return {...model, more:0, lines:model.lines.map((l, i) => ({...l, more:hiddenCount(l.text, full.lines[i].text)}))};
    if (model.missing || model.lines || !model.text) return model;
    return {...model, more:hiddenCount(model.text, full.text)};
  }
  function wordCard(resolution, candidate, options = {}) {
    const language = textLanguage(options.language), word = options.word || resolution?.form || '';
    const lookup = options.lookup || (() => null);
    if (!candidate) return {heading:word, grammar:'', text:say(NO_TRANSLATION, language), textLanguage:language, missing:true, spans:null, helpEntry:null};
    // G47: an external full verb without a meaning in this language (herabfallen in English) shows its parts.
    // (the full verb or its parts — a choice: for a pack language decided as in English, review A 17.11)
    const decide = isPack(language) ? 'en' : language;
    if (candidate.directionalSimple && (!brief(candidate.directionalFull || candidate, decide) || candidate.directionalPhrase?.[decide])) candidate = candidate.directionalSimple;
    if (candidate.formation?.kind === 'particle-verb') return particleVerbCard(resolution, candidate, options);
    if (candidate.formation) return formationCard(candidate, language, lookup);
    const confirmed = !!options.confirmed;
    const k = constructionMarks(candidate, confirmed, language);
    let headingText = heading(candidate), type = partOfSpeech(candidate, confirmed), marks = [...k.marks], text = null, helpEntry = candidate.item || null, more = 0;
    // (fresh sample 06.11, L-055) an external initialism / acronym keeps the spelling of the text: USA, not «Usa» (the external
    // dictionary keeps its keys in lowercase)
    // (or a record whose English text writes the word in this spelling: NATO «NATO»)
    if (candidate.source === 'fallback' && word && word.toLowerCase() === String(candidate.lemma || '').toLowerCase() && word !== word.toLowerCase() &&
        (/^(?:initialism|acronym|abbreviation)\b/iu.test(String(candidate.translation?.en || '')) ||
         word.length > 1 && word === word.toUpperCase() && String(candidate.translation?.en || '').split(/[^\p{L}\p{N}]+/u).includes(word)))
      headingText = headingText.replace(new RegExp(`${candidate.lemma.charAt(0).toUpperCase()}${candidate.lemma.slice(1).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u'), word);
    // 29.10.2026 (expressions chat; advisor: the tense line of expressions): an expression's line mirrors the line of its verb's
    // card on its own part (resolver: expressionVerb) — «Verb» becomes «Feste Wendung» / «Ausdruck»; «mit X» goes when X is the
    // expression's own verb (it is the expression itself), so are «Reflexiv» of a heading with sich and the verb's preposition
    // pattern. es ward ihnen das Urteil gesprochen — «Feste Wendung · Präteritum · Passiv»; Mach dir keine Sorgen — «… · Imperativ».
    // A chain of another verb (wurde … geboren — Passiv mit gebären, the participle is a word of the heading) is not taken: the
    // tense the resolver established stays (Präteritum).
    let exprSpans = null;
    const ev = candidate.construction?.id === 'recorded-construction' ? candidate.expressionVerb : null;
    const evChain = ev?.candidate?.construction?.lemma ? verbBase(ev.candidate.construction.lemma) : ev?.verb;
    if (ev && ev.candidate && evChain === ev.verb) {
      // (M1-c, links chat 30.10: the line of an expression names its own verb only — not a second infinitive after und)
      const evCandidate = ev.candidate.construction?.coordinatedLemma ? {...ev.candidate, construction:{...ev.candidate.construction, coordinatedLemma:null}} : ev.candidate;
      // (links chat 07.11, sein-state draft: the state group of a haben-only verb gives an expression no line — no tense inside an
      // expression, decision 05.11: Als das Urteil gesprochen war → «Feste Wendung»)
      // (second resolver chat 15.11, Grimm rest (6): the «Partizip II» of a lone participle form is the verb's own line, not the expression's)
      const line = ev.candidate.construction?.stateOnly ? [] : cardBase(ev.resolution, evCandidate, {...options}).grammar.split(' · ').slice(1)
        .filter(m => !(m === 'Partizip II' && ev.candidate.formFeatures?.participleOnly));
      // (a reflexive pronoun of the heading: sich, uns in wir sehen uns — «Reflexiv» is the expression itself)
      // (05.11: also a reflexive pronoun among the expression's own parts — a variant: sich … aufgehoben fühlen)
      const sich = /(?:^|\s)(?:sich|mich|dich|uns|euch|mir|dir)(?:['’]s)?(?=\s|$)/u.test(norm(candidate.lemma || '')) ||
        (k.spans || []).some(x => /^(?:sich|mich|dich|uns|euch|mir|dir)$/u.test(norm(x.text || '')));
      marks = line.map(m => m.replace(new RegExp(` mit (?:sich )?${ev.verb.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u'), ''))
        .filter(m => m && !(sich && m === 'Reflexiv') && !/\+\s*(?:Akkusativ|Dativ|Genitiv|Infinitiv)/u.test(m));
      // (the verb's line says nothing — a plain Verb: the tense the resolver established stays: es gibt — gäbe «Konjunktiv II»)
      if (candidate.expressionTense && !marks.length) marks.push(candidate.expressionTense);
      // (reference C1-G: the highlight is the expression plus the auxiliary / modal of its verb's chain)
      const extra = (ev.chainWords || []).filter(x => !(k.spans || []).some(y => y.start === x.start));
      if (extra.length && k.spans) exprSpans = [...k.spans, ...extra].sort((a, b) => a.start - b.start);
    }
    const explanation = candidate.explanation, usage = candidate.usage, contraction = candidate.contraction;
    if (explanation?.kind === 'superlative') {
      const base = lookup({id:explanation.baseId, word:explanation.baseLemma, type:'Adjektiv'});
      headingText = explanation.baseLemma;
      type = base ? (base.parts_of_speech?.length > 1 ? base.parts_of_speech.join(' / ') : base.type || 'Adjektiv') : 'Adjektiv';
      marks = ['Superlativ']; helpEntry = base;
    } else if (explanation?.kind === 'contraction') {
      const parts = String(explanation.expansion || '').split(/\s+/u).filter(Boolean);
      headingText = `${candidate.lemma} = ${parts.join(' + ')}`;
      type = 'Präposition + Artikel'; marks = [];
      helpEntry = lookup({id:explanation.componentId, word:explanation.componentLemma, type:'preposition'});
    }
    if (pos(candidate) === 'article') headingText = word;
    // To-do 19.10 (2.2, R-ud-10): an established reflexive use names its verb with sich, also when the card
    // has no sich of its own (external verfestigen → «sich verfestigen»), as own reflexive cards (4.2, 5.1).
    // Own cards keep their headword (machte sich Sorgen stays «machen»); only external verbs get sich.
    if (candidate.source === 'fallback' && candidate.construction?.id === 'reflexive-verb' && k.marks.includes('Reflexiv') && pos(candidate) === 'Verb' && !/^sich\s/u.test(headingText))
      headingText = `sich ${headingText}`;
    if (k.role === 'infinitiveParticle') type = 'Infinitivpartikel';
    if (usage?.role === 'attributive' || usage?.role === 'adverbial') {
      const participle = participleName(usage);
      if (participle && pos(candidate) === 'Verb') {
        // No own participle card: the source verb explains the form.
        const meaning = meaningText(candidate, language);
        headingText = usage.form; type = participle;
        text = meaning ? {text:fromText(candidate.lemma, bare(meaning), meaning.language), language:meaning.language,
          // review 22.10: the labels cut from the source text stand before the meaning after «От X —»
          ...(meaning.segments ? {segments:meaning.segments, prefix:`${meaning.prefix || ''}${fromText(candidate.lemma, '', meaning.language)}`} : {})} : null;
        more = meaning?.more || 0;
      } else if (participle) type = participle;
      else if (usage.kind === 'comparative') marks.push('Komparativ');
      else if (usage.kind === 'superlative') marks.push('Superlativ');
    }
    const gerund = pos(candidate) === 'Nomen' && /^gerund of\s+([\p{L}\p{M}]+)/iu.exec(candidate.translation?.en || '');
    if (usage?.role === 'nominalized' || gerund) {
      // (#64, advisor 15.11: a nominalized participle — die Bedienten, die Reisenden — is «aus Verb bedienen» too)
      const fromVerb = gerund || usage.kind === 'infinitive' || usage.kind === 'participle';
      // (a person noun of a verb base — der Reisende: «aus Verb reisen», its own meaning «путешественник» stays)
      const labelVerb = fromVerb || usage.kind === 'person' && usage.verb === true;
      const base = gerund ? gerund[1].trim() : usage.base;
      type = 'Nomen'; marks = [`aus ${labelVerb ? 'Verb' : 'Adjektiv'} ${base}`];
      if (usage?.kind === 'infinitive' || gerund) headingText = `das ${base.charAt(0).toUpperCase()}${base.slice(1)}`;
      // #20 (reference NOM-02g): etwas Neues / nichts Besonderes — the -e form as the heading, without an article (Neue).
      else if (usage?.kind === 'adjective' && usage.marker) headingText = String(candidate.lemma || '').replace(/s$/u, '');
      const ownNoun = gerund ? compact(String(candidate.translation?.en || '').replace(/^gerund of[^;]*;?/iu, '')) : '';
      const baseEntry = lookup({id:usage?.baseDictionaryId, word:base, type:fromVerb ? 'Verb' : 'Adjektiv'});
      const synthetic = value => String(value || '').split(/:\s*/u).slice(1).join(': ').trim();
      // #20 (advisor 05.11): an outside noun of this very nominalization with a meaning in this language (der Fremde
      // «незнакомец», die Alte «старуха», das Gute «добро») is shown as the noun itself, without «aus Adjektiv».
      // (a pack language without the noun's meaning in it: the English one, as an English card — der Gute «something good»)
      const nounMeaning = (!fromVerb || usage?.kind === 'participle') && compact(usage?.noun?.translation?.[language] || (isPack(language) ? usage?.noun?.translation?.en : '') || '');
      // #89 (advisor 16.11): a nominalized superlative (der Schwächste, die Klügste, meine Besten) — «aus Adjektiv X · Superlativ»; Russian
      // «самый» + the card's adjective meanings, not declined by gender (der / die / das alike); English the card's meaning as it is
      if (usage?.superlative && !nounMeaning) marks.push('Superlativ');
      // (advisor 17.11, «Астронавт»: etwas Besseres — «Nomen · aus Adjektiv gut · Komparativ», the meaning of the positive)
      if (usage?.comparative && !nounMeaning) marks.push('Komparativ');
      if (nounMeaning) { marks = []; text = {text:nounMeaning, language:isPack(language) && !usage?.noun?.translation?.[language] ? 'en' : language}; }
      else if (language === 'en' && ownNoun) text = {text:ownNoun, language};
      else {
        // (19.11.2026) a pack language: the own base card's pack text (pack-translations.js usage.baseText) — «Od alt — stary»
        const own = isPack(language) && usage?.baseText?.[language] ? fit(usage.baseText[language]) : entryFit(baseEntry, language), ownEn = entryFit(baseEntry, 'en');
        // G8 (22.10.2026, user): without an own card of the base, the base word's external record among the candidates
        // gives its meaning (das Grinsen — «От grinsen — скалиться, усмехаться»; das Glucksen — «From glucksen — to gurgle»
        // instead of «verbal noun»).
        const sibling = !baseEntry ? (resolution?.candidates || []).find(c => c !== candidate && c.source === 'fallback' &&
          pos(c) === (fromVerb ? 'Verb' : 'Adjektiv') && norm(c.lemma) === norm(base) && !c.construction) : null;
        // only when the noun itself has no meaning of its own in this language (das Zureden «уговоры», das Verscheiden «кончина»
        // keep theirs); «gerund of …», «субстантивированный инфинитив от «x»:» and «alternative / obsolete form of …» are no meaning.
        const label = t => /^(?:gerund of |субстантивированн|nominaliz)/iu.test(t) || /^(?:alternative|obsolete|archaic|dated|nonstandard)\b[^;]*\b(?:form|spelling) of\b/iu.test(t);
        const realMeaning = lang => { const t = String(candidate.translation?.[lang] || '').trim(); return !!t && !label(t); };
        // The sibling's meaning as the card shows it (labels cut, two senses at most), never a bare form note.
        const siblingText = lang => { if (!sibling || realMeaning(lang)) return '';
          const t = brief(sibling, lang); return t && !label(t) ? t : ''; };
        // (a pack text is a dictionary gloss, not «… от «x»: meaning» — nothing to cut at its colon: «lm od: Narr», review B 17.11)
        // (19.11.2026) a pack language, the base verb read by its parts (englishByParts — das Herumschleichen): its lines, each part in
        // the pack, an English one with its mark — «Od herumschleichen — herum — … · schleichen — …»
        const siblingParts = () => { if (!isPack(language) || !sibling || realMeaning(language)) return '';
          const lines = englishPartsLines(sibling, language); return lines?.some(l => l.language === language) ? lines.map(l => l.text).join(' · ') : ''; };
        const meaning = own.text || (isPack(language) ? '' : compact(synthetic(candidate.translation?.[language]))) || siblingText(language) || siblingParts();
        const english = !meaning && language !== 'en' ? ownEn.text || compact(synthetic(candidate.translation?.en)) || ownNoun || siblingText('en') : '';
        // The noun's own meaning in this language comes first (das Grinsen «ухмылка») — unless an own card of the verb is there
        // and the noun's record has several readings (das Übersetzen «переправа; перевод» — the verb card decides): review 23.10.
        const nounOwn = gerund && language !== 'en' && realMeaning(language) &&
          (!own.text || !/;/u.test(String(candidate.translation?.en || '').replace(/^gerund of[^;]*;?/iu, '').trim()));
        if (nounOwn) text = {text:compactIn(String(candidate.translation[language]).replace(/^gerund of[^;]*;?/iu, ''), language), language};
        else if (meaning) { text = {text:fromText(base, usage?.superlative && language === 'ru' ? superlativeRu(meaning) : meaning, language), language}; more = own.text ? own.rest : 0; }
        else if (english) { text = {text:`${englishPrefix(language)}${fromText(base, english, 'en')}`, language:'en'}; more = ownEn.text ? ownEn.rest : 0; }
      }
      if (baseEntry && !candidate.item) helpEntry = baseEntry;
    }
    // An own noun card declined like an adjective (der Kranke): origin mark,
    // the noun's own meaning and help (reference 4.13).
    if (candidate.nounOrigin && !usage) {
      type = 'Nomen'; marks = [`aus ${candidate.nounOrigin.kind === 'verb' ? 'Verb' : 'Adjektiv'} ${candidate.nounOrigin.base}`];
    }
    // Gender or number not established (den Kranken, agreed 11 Oct 2026): one card for
    // both gender records — der/die heading, both dictionary meanings, no Plural mark.
    const pair = candidate.genderPair;
    if (pair) {
      headingText = `${pair.articles} ${candidate.lemma}`;
      let parts = [meaningText(candidate, language, true), meaningText({...candidate, translation:pair.translation, item:null}, language, true)].filter(Boolean);
      // (a pack language: both genders in one language — the pair's other card has no pack text here, so both in English; review A Ч2б)
      if (isPack(language) && new Set(parts.map(p => p.language)).size > 1)
        parts = [meaningText(candidate, 'en', true), meaningText({...candidate, translation:pair.translation, item:null}, 'en', true)].filter(Boolean);
      if (parts.length) { text = {text:[...new Set(parts.map(p => p.text))].join(' / '), language:parts[0].language}; more = parts.reduce((sum, p) => sum + (p.more || 0), 0); }
    }
    // A2 (reference 4.9 / 5.5): an established verb + preposition pair.
    const link = candidate.prepositionLink;
    let linkSpans = null;
    // (batch 142, advisor 17.11: a particle verb keeps its separable highlight and adds the pair — sah ihn für einen Dieb an:
    // «Trennbares Verb · für + Akkusativ», sah / an / für lit)
    // (L24, links chat 19.11: so does a verb of a chain — Perfekt, Konjunktiv II, Futur, Modal, Passiv: «Verb · Perfekt mit geraten ·
    // in + Akkusativ», the chain and the preposition lit)
    const separableLink = link && candidate.construction && k.spans;
    if (link && (!k.spans || separableLink)) {
      marks.push(pos(candidate) === 'Verb' ? link.pattern : `${link.verb} + ${link.pattern}`);
      linkSpans = separableLink ? [...k.spans, ...link.spans.filter(s => !k.spans.some(t => t.start === s.start))].sort((a,b) => a.start - b.start) : link.spans;
    }
    const features = candidate.formFeatures;
    if (features?.tense) marks.push(features.tense);
    // (advisor 17.11: particle + zu + Partizip I — auszuwählenden, einzuhaltende — the gerundive: «mit zu — надо / можно»)
    if (features?.zuGerundive) marks.push('mit zu');
    // (second resolver chat 11.11) a noun from an adjective in the plural (die Erwachsenen, zwei Jugendliche): the der / die card says
    // «Plural» too — the gender does not matter in the plural
    if (features?.number === 'plural' && (!pair || features.adjectiveNoun)) marks.push('Plural');
    // G69 (advisor 25.10): an external noun clicked in a spelling of its plural column only (Er fand Goldmünzen)
    else if (candidate.externalPlural && candidate.source === 'fallback' && !pair && !marks.includes('Plural')) marks.push('Plural');
    if (features?.degree && !marks.includes(features.degree)) marks.push(features.degree);
    // Translation of the clicked form from the own card (alles «всё» on the alle
    // card): the heading is the form, the help stays the card (alle).
    const formTranslation = candidate.formTranslation;
    if (formTranslation && !text) {
      headingText = formTranslation.form;
      const own = compactIn(formTranslation[language], language), english = language !== 'en' && !own ? compact(formTranslation.en) : '';
      if (own) text = {text:own, language};
      else if (english) text = {text:`${englishPrefix(language)}${english}`, language:'en'};
    }
    // Reference 13 (user decision 19.10): a name is «Name» without a translation — the dictionary
    // records of names are English notes that leak into Russian.
    // (advisor 08.11) an abbreviation the Russian dictionary keeps in capitals (USA «США», DDR «ГДР») shows that Russian line.
    if (candidate.source === 'fallback' && candidate.pos === 'name' && !usage && !contraction && language === 'ru' && candidate.abbreviationRu &&
        String(candidate.translation?.ru || '').trim()) {
      return {heading:headingText, grammar:'Name', text:String(candidate.labelledText?.ru || candidate.translation.ru), textLanguage:'ru', missing:false, derived:false, note:'', more:0,
        spans:k.spans || null, helpEntry:null};
    }
    // (A12, advisor 16.11: a single letter with a dot — an initial or a short form, «Abkürzung» without a translation)
    if (candidate.source === 'fallback' && candidate.pos === 'abbreviation') {
      return {heading:headingText, grammar:'Abkürzung', text:'', textLanguage:language, missing:false, derived:false, note:'', more:0,
        spans:k.spans || null, helpEntry:null};
    }
    if (candidate.source === 'fallback' && candidate.pos === 'name' && !usage && !contraction) {
      return {heading:headingText, grammar:'Name', text:'', textLanguage:language, missing:false, derived:false, note:'', more:0,
        spans:k.spans || null, helpEntry:null};
    }
    const derived = !!text;
    // (a phrase in English for a pack language is marked English — review A Ч2б)
    // (a pack language: the language of the text that came — its own line, a reader.json line, or the English one; review Ч4)
    if (!text && k.role) { const role = say(ROLE_TEXT[k.role], language);
      text = {text:role, language:isPack(language) && !ROLE_TEXT[k.role]?.[language] && role === ROLE_TEXT[k.role]?.en ? 'en' : language}; }
    if (!text && !contraction?.expression) { text = meaningText(candidate, language); more = text?.more || 0; }
    // (advisor 17.11: the gerundive — «здесь: (который) надо / можно — …» before the meaning; the card's text is not declined)
    if (features?.zuGerundive && text?.text) { const here = `${L(language, 'здесь: (который) надо / можно', 'here: to be done / can be done')} — `;
      // (review A 19.11: a text shown as lines — a verb read by its parts in a pack language — carries it on its first line)
      text = {...text, text:`${here}${text.text}`, ...(text.lines?.length ? {lines:text.lines.map((l, i) => i ? l : {...l, text:`${here}${l.text}`})} : {})}; }
    // Links chat, step A (advisor 03.11): werden / haben / sein without a link, a participle in the part (resolver auxiliaryHint) —
    // «auxiliary verb» first, the own meaning second (the order of senses, not a link: no mark, no highlight).
    const auxHint = candidate.formFeatures?.auxiliaryHint;
    if (auxHint && !k.role && text && !contraction) {
      const first = say(AUX_HINT_TEXT[auxHint], language);
      text = {text:`${first}; ${text.text}`, language:text.language};
    }
    // B7: colloquial spellings — «war’s = war + es», «hab (= habe)»; es gibt / es geht
    // stay without the verb's own translation until the expressions exist (F8).
    // (5б (1), advisor + user 12.11: a verb form without its -e — hab, glaub, wär — keeps the infinitive heading of every verb; the form
    // is named in the grammar line, after its tense: «Präsens · hab = habe», «Konjunktiv II · wär = wäre»)
    if (contraction && contraction.kind === 'e') {
      // (a chain mark without its tense takes it as «Konjunktiv II mit reparieren» does: «Präsens mit gehen»)
      if (!marks.some(m => TENSE_MARK.test(m))) {
        const chain = marks.findIndex(m => /^mit (?!\+)/u.test(m));
        marks = chain < 0 ? [...marks, 'Präsens'] : marks.map((m, i) => i === chain ? `Präsens ${m}` : m);
      }
      marks = [...marks, `${contraction.form} = ${contraction.parts[0]}`];
    } else if (contraction && contraction.kind === 'noun-e') {
      // (A12, advisor 16.11: a noun without its final -e — die Suppe, «Nomen · Supp' = Suppe»; no tense)
      marks = [...marks, `${contraction.form} = ${contraction.parts[0]}`];
    } else if (contraction) {
      headingText = contractionHeading(contraction);
      if (contraction.expression) { text = null; more = 0; }
    }
    // 29.10.2026 (expressions chat; advisor p. 5; reference X5.14): a chain word outside an expression names the expression
    // («Modalverb · Präteritum / Konjunktiv II mit sich an etwas (Akkusativ) machen»; resolver: chainExpression).
    const xName = candidate.construction?.expressionName, xVerb = xName ? (candidate.construction.lemma || '') : '';
    if (xName && xVerb) {
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const rx = new RegExp(`(^| )mit (?:sich )?${esc(verbBase(xVerb))}(?= |$)`, 'u');
      // (a heading that starts with mit is not doubled: «Modalverb · mit etwas zu tun haben», not «mit mit …»)
      marks = marks.map(m => m.replace(rx, `$1${/^mit\s/u.test(xName) ? '' : 'mit '}${xName}`));
      const words = candidate.construction.expressionSpans || [];
      const extra = words.filter(x => !(k.spans || []).some(y => y.start === x.start));
      if (extra.length && k.spans) exprSpans = [...k.spans, ...extra].sort((a, b) => a.start - b.start);
    }
    const grammar = [type, ...marks].filter(Boolean).join(' · ');
    // A reflexive verb with an interpretation keeps its note under the meaning.
    const kn = candidate.construction;
    const note = kn && (confirmed || kn.confidence !== 'tentative') && kn.id === 'reflexive-verb' && kn.interpretation
      ? say(kn.note, language) || '' : '';
    // Labels (reference 2.A): segments of the plain text, only when the text is the meaning itself.
    const segments = text?.segments && (!derived || text.prefix) && !contraction ? {segments:text.segments, segmentPrefix:text.prefix || ''} : {};
    return {heading:headingText, grammar, text:text ? text.text : say(NO_TRANSLATION, language), textLanguage:text ? text.language : language,
      missing:!text, derived, note, more:text ? more : 0, ...(text?.lines ? {lines:text.lines} : {}), spans:exprSpans || (separableLink ? linkSpans : k.spans) || linkSpans || candidate.compound?.spans || null, helpEntry, ...segments};
  }
  // G70 (user 24.10.2026): the heading, the grammar line and the translation come from one card. A reflexive use of a verb whose
  // card has no reflexive meaning (lexicalSenseConfirmed false):
  //  (2) (user 24.10, decision B) a «sich ~ …» segment of an external record is NOT shown as the meaning — 29 of 108 book places were
  //      confidently wrong (wandte sich um «ворочаться»); it stays visible in the parts line with the full meaning of X (p. 4);
  //  (3) a free dative «себе» (mir / dir, or a direct object of its own: Er kaufte sich ein Buch) — the card's own meaning: heading X,
  //      «Reflexiv», the chain named X, not «sich X»;
  //  (4) otherwise (an accusative sich: Der Sturm hat sich gelegt) — heading «sich X», no translation, and a parts line «X — …»
  //      (as G47): the meaning of sich X is not guessed from X. With an own card «sich X» the resolver chooses it (p. 1).
  // (G57's card() wraps this one, so «ещё N значений» counts the reflexive card that is shown)
  function cardBase(resolution, candidate, options = {}) {
    // (a pack language: the card is built in it only when this candidate has a text in it — otherwise the English card)
    if (isPack(textLanguage(options.language))) {
      const pack = textLanguage(options.language), shown = cardLanguage(candidate, options.language);
      // (19.11.2026) a nominalized infinitive of a verb read by its parts (das Herumschleichen): the card in the pack when a part of
      // that verb is in it (cardCore: «Od herumschleichen — …», each part in its language)
      const usage = candidate?.usage, nominalParts = shown === 'en' && usage?.role === 'nominalized' && usage.kind === 'infinitive' &&
        (resolution?.candidates || []).some(c => c !== candidate && c.source === 'fallback' && pos(c) === 'Verb' && norm(c.lemma) === norm(usage.base) &&
          !c.construction && englishPartsLines(c, pack)?.some(l => l.language === pack));
      // (and a nominalized word of an own card whose pack text is read: der Alte — «Od alt — stary»)
      const nominalOwn = shown === 'en' && usage?.role === 'nominalized' && !!usage.baseText?.[pack] && !usage.noun;
      options = {...options, language:nominalParts || nominalOwn ? pack : shown};
    }
    const result = cardCore(resolution, candidate, options);
    const k = candidate?.construction, language = textLanguage(options.language);
    if (!k || k.id !== 'reflexive-verb' || k.lexicalSenseConfirmed || k.interpretation || k.attachmentOnly || candidate.formation ||
      k.confidence === 'tentative' && !options.confirmed || pos(candidate) !== 'Verb') return result;
    const lemma = String(candidate.lemma || '').replace(/^sich\s+/u, '');
    if (/^sich\s/u.test(String(candidate.lemma || '')) || ![lemma, `sich ${lemma}`].includes(result.heading) || !/(?:^| · )Reflexiv(?: · |$)/u.test(result.grammar)) return result;
    // 27.10.2026 (advisor + user: reflexive marks of the external dictionaries, 2f3859a — EN senses column 8, RU senses `reflexive`):
    // sich linked, our card without the field `reflexive` (or no card of ours) — the senses the dictionary marks as used with sich are
    // the meaning, shown like our field (heading «sich X», all marked senses of the wanted kind in dictionary order, 4.13). The kind by
    // the G70 sign: an accusative object in the part (a dative sich) → dat only; none → acc / opt first, the kind missing → the marked
    // ones there are; uns / euch without that sign (Akk or Dat) → all marked ones. Without marks of this language — as before.
    // (advisor 27.10: rule A — a verb with own sich expressions (reflexivePhraseVerb) takes no marks; rule B — a dative sich with a
    // direct object in the part (Er schnitt sich ein Stück, biss sich ein Stück ab) is the free dative «себе» of G70: no marks, X as
    // before; the marks work for an accusative sich without an object and for mir / dir without such an object)
    // (advisor 16.11, (3): the object by the common count of п. 99 — reflexiveDirectObject — when the resolver gave it; the old signs otherwise)
    const objectDative = !!((candidate.reflexiveDirectObject !== undefined ? candidate.reflexiveDirectObject : k.objectGroup || candidate.reflexiveObjectSign) || k.freeDative && k.reflexiveCase !== 'Dativ');
    // (links chat 19.11, advisor 19.11, L52: sich machen + a direction group — the resolver's reflexiveDirection; the dated sense the card does
    // not hold; a pack language shows the English with its mark)
    if (candidate.reflexiveDirection) {
      const directionLanguage = isPack(language) ? 'en' : language;
      const {segments: _s, segmentPrefix: _p, lines: _l, ...rest} = result;
      return {...rest, heading:`sich ${lemma}`, grammar:rest.grammar.split(' · ').map(m => m.replace(` mit ${lemma}`, ` mit sich ${lemma}`)).join(' · '),
        text:L(directionLanguage, '(уст.) отправиться, забраться (куда-либо)', '(dated) to go, to make one\'s way (somewhere)'), textLanguage:directionLanguage, missing:false, derived:true, note:rest.note || '', more:0};
    }
    if (!candidate.reflexivePhraseVerb && !objectDative && !(candidate.item || options.lookup?.({word:lemma, type:'Verb'}))?.reflexive) {
      const dative = k.reflexiveCase === 'Dativ';
      const unclear = !dative && k.reflexiveCase !== 'Akkusativ' && ['uns','euch'].includes(norm(k.pronoun?.text || ''));
      const markedSenses = lang => {
        const marks = candidate.reflexiveMarks?.[lang];
        if (!marks || typeof marks !== 'object') return [];
        const rows = Object.entries(marks), kinds = unclear ? ['acc','dat','opt'] : dative ? ['dat'] : ['acc','opt'];
        // (with the dative sign only dat: an accusative or optional sense is excluded by the object — Er wusch sich die Hände is not
        // «мыться»; without the sign a dative-only verb shows its dat senses)
        const pick = rows.some(([, m]) => kinds.includes(m)) ? rows.filter(([, m]) => kinds.includes(m)) : dative ? [] : rows;
        const clean = value => compactIn(value, lang).replace(/^~\s*sich\s+/u, '').replace(/^[\p{Ll}ßäöü]+,\s*sich\s+/u, '')
          .replace(/^sich\s+(?:~\s*)?(?=[^\s])/u, '').replace(/^~\s*/u, '').trim();
        return [...new Set(pick.flatMap(([text]) => clean(text).split(';').map(t => t.trim())))]
          .filter(t => t && !/~/u.test(t) && (lang !== 'ru' || /[а-яё]/iu.test(t)));
      };
      // (compact() per sense keeps two parts of a long sense; all marked senses are listed — fit() and «ещё N значений» like the field)
      // (one language's marks only for its own interface — a mark only in the other dictionary leaves this one as before, advisor 27.10)
      // (a pack language: whether the marked senses are the card is decided by the English marks, as the English card — review A
      // 17.11; the text is the pack's marked senses when it has them, otherwise the English ones)
      const own = markedSenses(language), decided = isPack(language) ? markedSenses('en') : own;
      if (decided.length) {
        const shownLanguage = own.length ? language : 'en', shown = fit((own.length ? own : decided).join('; '));
        const {segments: _s, segmentPrefix: _p, lines: _l, ...rest} = result;
        return {...rest, heading:`sich ${lemma}`, grammar:rest.grammar.split(' · ').map(m => m.replace(` mit ${lemma}`, ` mit sich ${lemma}`)).join(' · '),
          text:shown.text, textLanguage:shownLanguage, missing:false, derived:true, note:rest.note || '', more:shown.rest};
      }
    }
    // G70 step 2 (WN reflexive batch, 24.10): the field `reflexive` of an own card — the meaning of X with an accusative sich
    // (verstecken → sich verstecken «прятаться»). Read as a field, not from the text; not with mir / dir.
    // (a link found through the external record of the verb — Beruhige dich! — reads the field of our card of the same verb)
    // G87 (a) (advisor 28.10.2026): a field marked "case": "Dativ" (begegnen, beißen) is the meaning with a dative sich — taken with
    // mir / dir and with an object, not with mich / dich (ich beiße mir auf die Lippe → «прикусить (губу, язык)»).
    const ownItem = candidate.item || (options.lookup ? options.lookup({word:lemma, type:'Verb'}) : null);
    const dativeField = ownItem?.reflexive?.case === 'Dativ';
    if (k.freeDative && !dativeField) return {...result, heading:lemma, grammar:result.grammar.split(' · ').map(m => m.replace(` mit sich ${lemma}`, ` mit ${lemma}`)).join(' · ')};
    // (links chat 18.11, WN batch 152: the object only when the common count of п. 99 — reflexiveDirectObject — agrees with the field's old
    // sign: the old sign misread a subject with a genitive after it as the object (sammeln sich die Gegner des Ausbaus), the count alone
    // misreads others (verteidigte sich die arme Alice, verwandelte sich das Rehkälbchen) — count 18.11: 1 980 sentences)
    const objectForField = k.objectGroup && candidate.reflexiveDirectObject !== false;
    const field = dativeField ? (k.reflexiveCase !== 'Akkusativ' ? ownItem.reflexive : null) : k.reflexiveCase !== 'Dativ' && !objectForField ? ownItem?.reflexive : null;
    // (shown as an own card's meaning — brackets kept, fit() with «ещё N значений» —; derived, so a choice row shows it too)
    // (a pack language: the field's text of the pack when the field is this card's own — candidate.packItem, Ч2б; otherwise the English
    // one, as an English card)
    // (19.11.2026: a candidate of the external dictionary whose field is its own card's — that card's pack texts, candidate.packOwnVerb)
    const packField = !isPack(language) || !field ? null : ownItem === candidate.item ? candidate.packItem?.[language]?.reflexive :
      ownItem && candidate.packOwnVerb?.[language]?.id === ownItem.id ? candidate.packOwnVerb[language].fields?.reflexive : null;
    const fieldLanguage = isPack(language) && !String(packField?.[`translation_${language}`] || '').trim() ? 'en' : language;
    const fieldSource = fieldLanguage === language && isPack(language) ? packField : field;
    // (links chat 19.11, advisor 19.11: a meaning of the field proved by its government — the resolver's fieldSenseFirst — comes first)
    const fieldFirst = fieldLanguage === 'en' ? candidate.fieldSenseFirstEn : fieldLanguage === 'ru' ? candidate.fieldSenseFirst : null;
    const fieldRaw = String(fieldSource?.[`translation_${fieldLanguage}`] || '');
    const fieldText = Number.isInteger(fieldFirst) && fieldFirst > 0 ? (() => { const parts = fieldRaw.split(';').map(x => x.trim()).filter(Boolean);
      return fieldFirst < parts.length ? [parts[fieldFirst], ...parts.filter((_, i) => i !== fieldFirst)].join('; ') : fieldRaw; })() : fieldRaw;
    const fieldFit = fit(fieldText);
    if (fieldFit.text) {
      const {segments: _s, segmentPrefix: _p, lines: _l, ...rest} = result;
      const note = String(fieldSource[`note_${fieldLanguage}`] || '').trim();
      return {...rest, heading:`sich ${lemma}`, text:fieldFit.text, textLanguage:fieldLanguage, missing:false, derived:true, note, more:fieldFit.rest};
    }
    // (advisor + user 06.11, SICH_X_NO_TRANSLATION: no meaning of «sich X» in the interface language — the plain verb's own line,
    // signed with its name, as a part line: «regen — шевелить, двигать»; «not found» only when the verb has none either)
    const meaning = meaningText(candidate, language);
    // (user 06.11: the mark «(без sich)» after the verb's name is required — without it the line reads as the meaning of «sich X»)
    // (18.11.2026: a pack language keeps the mark «English: » of an English meaning — the line is the plain verb's, in English)
    const lines = meaning ? [{...namedLine(`${lemma} ${L(language, '(без sich)', '(without sich)')}`, isPack(language) ? meaning.text : bare(meaning), meaning.more || 0), helpEntry:candidate.item || null,
      ...(isPack(language) && meaning.language && meaning.language !== language ? {language:meaning.language} : {})}]
      : [{text:say(NO_TRANSLATION, language), more:0, helpEntry:null}];
    const {segments: _s, segmentPrefix: _p, ...rest} = result;
    return {...rest, heading:`sich ${lemma}`, text:lines.map(l => l.text).join(' · '), lines, textLanguage:language, missing:false, derived:true, more:0};
  }
  // (Ч4) phrase(language, ru, en, …args) and text({ru, en, …}, language) for the popup's own lines (bibliothek.js — the pronoun summary)
  const phrase = (language, ru, en, ...args) => L(textLanguage(language), ru, en, ...args);
  const text = (table, language) => say(table, textLanguage(language));
  // the mark before an English text in this popup language («английский: », the pack's line, «English: » or nothing) — the pronoun summary
  const englishMark = language => englishPrefix(textLanguage(language));
  window.BibliothekMeaningDisplay = Object.freeze({phrase, text, englishMark, formationText, formationLines, groups, alternatives, pos, heading, brief, compact, formComment, nounPhraseComment, labelSegments,
    card, partOfSpeech, pronounType, contractionHeading, NO_TRANSLATION, wholeCard, participleName});
})();
