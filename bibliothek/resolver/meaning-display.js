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
  function heading(candidate) {
    if (candidate.explanation?.kind === 'contraction') return `${candidate.lemma} = ${candidate.explanation.expansion}`;
    const gerund = pos(candidate) === 'Nomen' && /^gerund of /i.test(candidate.translation?.en || '');
    // G16 (user decision 18.10 / 19.10): a noun or a name is always capitalised, also from the external
    // dictionary, whose keys are lowercase (brunnen -> Brunnen); the article of external nouns is a later step.
    const capital = gerund || candidate.source === 'fallback' && ['noun','name'].includes(candidate.pos);
    return `${candidate.item?.article || (gerund ? 'das' : '')} ${capital ? candidate.lemma.charAt(0).toUpperCase() + candidate.lemma.slice(1) : candidate.lemma}`.trim();
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
    const parts = [...new Set(String(text).replace(/\([^()]*\)/g, '').split(';').map(labelKey).filter(Boolean))];
    const codes = partCodes(candidate.meaningLabels?.[language], language === 'en' && Array.isArray(candidate.meanings) ? candidate.meanings : null);
    const rows = parts.map(part => ({text:part, codes:codes.get(part) || []}));
    const rude = row => row.codes.some(code => RUDE_LABELS.has(LABEL_BY_CODE.get(code)?.id));
    const first = rows.findIndex(row => !rude(row));
    if (first > 0) rows.unshift(...rows.splice(first, 1));
    return rows;
  }
  function shownLabels(codes, display, first, domains = {}) {
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
    const segments = rows.map((row, i) => ({labels:shownLabels(row.codes, display, i === 0, language === 'ru' ? candidate.labelDomains : {}), text:row.text}));
    // One label shared by every shown meaning stands once at the start.
    const ids = s => s.labels.map(l => l.id).join('|');
    const shared = segments.length > 1 && segments[0].labels.length && segments.every(s => s.text && ids(s) === ids(segments[0]));
    if (shared) { const label = segments[0].labels; segments.forEach(s => { s.labels = []; }); segments.unshift({labels:label, text:''}); }
    // English marks the word rude and the Russian text does not (Bulle, huren): one label for the whole card (user 22.10).
    if (language === 'ru' && !segments.some(s => s.labels.some(l => RUDE_LABELS.has(l.id)))) {
      const en = labelledParts(candidate, 'en')[0];
      const rude = en ? shownLabels(en.codes, display, true).filter(l => RUDE_LABELS.has(l.id)) : [];
      if (rude.length) {
        if (segments[0] && !segments[0].text) segments[0].labels = [...rude, ...segments[0].labels].slice(0, 2);
        else segments.unshift({labels:rude, text:''});
      }
    }
    return segments.some(s => s.labels.length) ? segments : null;
  }
  function brief(candidate, language, inline = false) {
    // inline: a text shown without label segments (der/die pair) keeps the source gloss with its inline label
    if (!inline && isExternal(candidate) && candidate.meaningLabels?.[language] && !Number.isInteger(candidate.senseFirst) &&
        candidate.construction?.id !== 'lassen-infinitive' && !/^gerund of /i.test(String(candidate.translation?.[language] || '').trim()))
      return labelledParts(candidate, language).slice(0, shownCount(Infinity)).map(row => row.text).join('; ');
    let text = candidate.translation?.[language] || '';
    // G40 (21.10.2026): a meaning the resolver proved from the sentence (bald darauf → «после этого, потом») comes first.
    if (Number.isInteger(candidate.senseFirst)) { const parts = meaningParts(text); if (candidate.senseFirst < parts.length)
      text = [parts[candidate.senseFirst], ...parts.filter((_, i) => i !== candidate.senseFirst)].map(p => p.trim()).join('; '); }
    if (language === 'en' && /^gerund of anrufen$/i.test(text.trim())) return 'the act of calling';
    if (language === 'en' && /^gerund of /i.test(text.trim())) return 'verbal noun';
    // A confirmed lassen bracket does not pick permission versus causation.
    // Keep every sense of its existing card visible instead of clipping to two.
    if (candidate.construction?.id === 'lassen-infinitive' && norm(candidate.lemma) === 'lassen' && pos(candidate) === 'Verb') return text.trim();
    return ownCard(candidate) ? fit(text).text : compact(text);
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
  function alternatives(resolution, selected, language) {
    const same = c => !!selected && key(c) === key(selected) && isName(c) === isName(selected);
    return meaningGroups(resolution.candidates).sort((a,b) => Number(same(a.candidate)) - Number(same(b.candidate))).flatMap(group => {
      const base = group.candidate;
      const isSelected = same(base);
      if (isSelected) {
        const translated = compact(extraText(group.rows, selected, language));
        const displayLanguage = translated ? language : 'en';
        const text = translated || compact(extraText(group.rows, selected, displayLanguage));
        return text ? [{candidate:group.rows.find(c => c !== selected && c.translation?.[displayLanguage]), text, language:displayLanguage}] : [];
      }
      // G9 (21.10.2026, reference F13-N1): a name as another meaning is «Name» without the English note
      // (the same rule as a selected name, reference 13).
      if (isName(base) && !base.explanation) return [{candidate:base, text:'', language}];
      const translated = brief(base, language);
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
    return `${language === 'ru' ? superlative ? 'Форма превосходной степени' : 'Грамматическая форма' : superlative ? 'Superlative form' : 'Grammatical form'}: ${resolution.form} → ${candidate.lemma}`;
  }
  function nounPhraseComment(candidate, language) {
    if (pos(candidate || {}) === 'Nomen') return '';
    const phrases = candidate?.nounPhrase;
    if (!phrases?.length) return '';
    const ru = language === 'ru';
    const cases = [...new Set(phrases.flatMap(p => p.cases))];
    const names = ru ? {nominative:'Ном.',accusative:'Акк.',dative:'Датив',genitive:'Ген.'} :
      {nominative:'Nom.',accusative:'Acc.',dative:'Dative',genitive:'Gen.'};
    const numbers = [...new Set(phrases.map(p => p.number))];
    const gender = ({masculine:ru?'мужской род':'masculine',feminine:ru?'женский род':'feminine',neuter:ru?'средний род':'neuter'})[phrases[0].gender];
    const number = numbers.length > 1 ? ru?'единственное или множественное число':'singular or plural' :
      numbers[0] === 'plural' ? ru?'множественное число':'plural' : gender;
    const first = phrases[0];
    const grammar = `${cases.map(c => names[c]).join(ru?' или ':' or ')} · ${number}.`;
    return `${grammar} ${ru?'Начальная форма':'Base form'}: ${first.baseArticle} ${first.lemma}.`;
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
    // Reference G6 (to-do 3.12): the verb that changes its meaning with zu.
    zu_scheinen:{ru:'здесь: кажется, по-видимому', en:'here: seems to'},
    zu_brauchen:{ru:'здесь: нужно', en:'here: need to'},
    zu_wissen:{ru:'здесь: уметь', en:'here: know how to'},
    zu_pflegen:{ru:'здесь: обычно, имеет обыкновение', en:'here: usually, tends to'},
    'zu_vermögen':{ru:'здесь: быть в состоянии', en:'here: be able to'}
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
    const own = verbBase(candidate.lemma), main = verbBase(k.lemma || ''), isMain = own === main, name = k.lemma || '';
    const spans = k.spans || null;
    switch (k.id) {
      case 'separable-verb': return {marks:[], role:null, spans};
      // G2 addition (reference 19.10): sein + participle of a verb with haben and sein — Perfekt or state.
      // L13 (reference F12-G3): hätte / wäre + participle — the participle «Konjunktiv II», hätte / wäre «Konjunktiv II mit …»
      // with «бы (о прошлом)» instead of the dictionary meaning.
      case 'perfect-group': if (k.label === 'Konjunktiv II') return isMain && !k.clickedRole ? {marks:['Konjunktiv II'], role:null, spans}
          : {marks:[`Konjunktiv II mit ${name}`], role:'conditionalPast', spans};
        return {marks:[`${k.label}${k.state ? ` / ${language === 'ru' ? 'состояние' : 'state'}` : ''} mit ${name}`], role:isMain ? null : 'auxiliary', spans};
      case 'werden-future': return {marks:[`Futur I mit ${name}`], role:isMain ? null : 'auxiliary', spans};
      // F12-G1a / G22: tense first, then Passiv (wurde … getroffen «Präteritum · Passiv mit treffen»); Präsens stays «Passiv mit …» (4.6).
      case 'werden-passive': {
        const past = /Präteritum/u.test(k.note?.en || '');
        return {marks:[`${past ? 'Präteritum · ' : ''}Passiv mit ${name}`], role:isMain ? null : 'passive', spans};
      }
      // G15a (user decision 16.10): werden + a form that is both infinitive and participle, no evidence either way.
      case 'werden-future-or-passive': return {marks:[`Futur I / Passiv mit ${name}`], role:isMain ? null : 'futureOrPassive', spans};
      // A3 (reference 5.6): gelesen «Passiv mit müssen», muss / werden «Passiv mit lesen».
      case 'modal-passive': return {marks:[isMain ? `Passiv mit ${k.modal}` : `Passiv mit ${name}`],
        role:!isMain && own === 'werden' ? 'passive' : null, spans};
      case 'werden-conditional': return {marks:[isMain ? 'Konjunktiv II' : `Konjunktiv II mit ${name}`], role:isMain ? null : 'conditional', spans};
      // To-do 3.4 (F12-B7): wird's gewesen sein — the clicked sein is the auxiliary «Futur II mit sein», not the participle's lemma.
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
        const tail = k.passive ? ['Perfekt', 'Passiv'] : ['Perfekt'];
        if (k.clickedRole) return {marks:[`Modal mit ${name}`, ...tail], role:k.clickedRole, spans};
        if (MODALS.has(own) && !isMain) return {marks:[`mit ${name}`, ...tail], role:k.hearsay && own === 'sollen' ? 'hearsay' : null, spans};
        return {marks:[`Modal mit ${name}`, ...tail], role:null, spans};
      }
      // Reference A6 (F12-A6): geträumt / haben «Perfekt mit träumen» (haben — auxiliary text), sterben «Modal mit sterben»,
      // können «mit sterben»; zu is the Infinitivpartikel; um keeps its conjunction card.
      case 'zu-chain': {
        if (own === 'zu') return {marks:[], role:'infinitiveParticle', spans};
        if (k.conjunctionWord && own === k.conjunctionWord) return {marks:[], role:null, spans};
        if (k.chain === 'perfect') return {marks:[`Perfekt mit ${name}`], role:k.clickedRole || null, spans};
        if (MODALS.has(own) && !isMain) return {marks:[`mit ${name}`], role:null, spans};
        return {marks:[`Modal mit ${name}`], role:null, spans};
      }
      case 'reflexive-verb': {
        // Undecided "sich / einander" keeps both names so the variants stay distinguishable.
        // A5 (user decision 15.10): always Reflexiv; «себя / друг друга» is the note under the meaning.
        const marks = ['Reflexiv'];
        if (['Perfekt','Plusquamperfekt'].includes(k.tense)) marks.push(`${k.tense} mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // A1 (reference 5.2): a modal controls the reflexive infinitive (muss mich beeilen).
        else if (k.modal) marks.push(`Modal mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // G15 (19.10.2026): Futur I / Konjunktiv II with werden keep the tense, as Perfekt does (wird sich … abschwächen).
        else if (/^(?:Futur I|Konjunktiv II)/u.test(k.tense || '')) marks.push(`${k.tense} mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
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
        const tense = k.tense && k.tense !== 'Präsens' && (k.tense !== 'Konjunktiv II' || wuerde) ? k.tense : null;
        if (own === 'lassen') return {marks:[tense ? `${tense} mit ${name}` : `mit ${name}`], role:null, spans};
        if (isMain) return {marks:[tense ? `${tense} mit lassen` : `lassen mit ${name}`], role:null, spans};
        if (MODALS.has(own)) return {marks:[`mit ${name} lassen`], role:null, spans};
        return {marks:[`${tense || 'Präsens'} mit ${name} lassen`],
          role:tense === 'Perfekt' ? 'perfectHave' : tense === 'Konjunktiv II' ? 'conditional' : 'auxiliary', spans};
      }
      // zu inside haben/sein + zu is the same Infinitivpartikel as in 4.8 (agreed 11 Oct 2026).
      case 'sein-zu': return own === 'zu' ? {marks:[], role:'infinitiveParticle', spans} : {marks:[isMain ? 'sein + zu' : `sein + zu mit ${name}`], role:null, spans};
      // zu + infinitive (4.8): zu is the Infinitivpartikel; the verb keeps a plain Verb line.
      case 'zu-infinitive': return {marks:[], role:own === 'zu' ? 'infinitiveParticle' : null, spans};
      // um / ohne / statt … zu: the opener keeps its conjunction card (heading, Konjunktion, meaning).
      // 3.16 / 3.21: a construction recorded in the card's match block (weder … noch, um … willen) — the card names it.
      // C1 (user 18.10): an expression shows its tense when the resolver established one (Feste Wendung · Präteritum).
      case 'recorded-construction': return {marks:candidate.expressionTense ? [candidate.expressionTense] : [], role:null, spans};
      // B2: Komparativ + als — als shows «здесь: чем».
      case 'comparative-als': return {marks:['Komparativ + als'], role:null, spans};
      case 'zu-conjunction': return {marks:[], role:own === 'zu' ? 'infinitiveParticle' : null, spans};
      // Reference G6 (to-do 3.12): schien «Präteritum · mit fürchten» + «здесь: кажется, по-видимому»; fürchten «mit scheinen»;
      // zu Infinitivpartikel. With a chain inside (A6 × G6: schien … gekommen zu sein) the chain words keep the chain's
      // own marks (gekommen / sein «Perfekt mit kommen»); the whole group is highlighted.
      case 'modal-zu': {
        if (own === k.verb && !isMain) return {marks:[`${k.tense ? k.tense + ' · ' : ''}mit ${name}`], role:`zu_${k.verb}`, spans};
        if (own === 'zu') return {marks:[], role:'infinitiveParticle', spans};
        if (k.inner?.id === 'zu-chain') return {...constructionMarks({...candidate, construction:{...k.inner, spans}}, confirmed), spans};
        return {marks:[`mit ${k.verb}`], role:null, spans};
      }
      case 'haben-zu': return own === 'zu' ? {marks:[], role:'infinitiveParticle', spans} : {marks:[isMain ? 'haben + zu' : `haben + zu mit ${name}`], role:isMain ? null : 'haveTo', spans};
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
  // explanation before the base. A part without a Russian meaning keeps its English one, marked (only derived words).
  const HALF_SUFFIX = {frei:['-frei: без …','-frei: -free'],los:['-los: без …','-los: -less'],voll:['-voll: полный …','-voll: -ful'],
    reich:['-reich: богатый …','-reich: rich in …'],arm:['-arm: бедный …','-arm: low in …'],artig:['-artig: похожий на …','-artig: …-like'],
    fähig:['-fähig: способный к …','-fähig: capable of …']};
  const FORMATION_TEXT = {
    erei:{Verb:['-erei: занятие (часто надоевшее)','-erei: activity (often tiresome)'],Nomen:['-erei: место для …','-erei: place for …']},
    ig:['-ig: с … / похожий на …','-ig: with … / like …'], lich:['-lich: с … / похожий на …','-lich: with … / like …'],
    bar:['-bar: можно …','-bar: can be …'], un:['un-: не-','un-: not …']};
  const formationName = p => p.pos === 'Nomen' ? p.lemma.charAt(0).toUpperCase() + p.lemma.slice(1) : p.lemma;
  // A part shows its first two meanings (user 23.10); the rest is counted for «ещё N значений» (the part's own card).
  // An external part loses its brackets (Latin names, usage notes: «елец (Leuciscus leuciscus L.)»), as compact() does for
  // external cards; an own part keeps them, as its card does (D13).
  function formationMeaning(p, language) {
    const list = text => p.source === 'main' ? meaningParts(text) : meaningParts(String(text || '').replace(/\([^()]*\)/g, ''));
    // A wiki template left in an external Russian meaning («:Шаблон:Дрозд») is no meaning (G68).
    const own = list(language === 'ru' ? p.ru : p.en).filter(m => !/Шаблон:|^:/u.test(m)), en = list(p.en);
    const n = shownCount(Infinity);
    if (own.length) return {text:own.slice(0, n).join('; '), rest:Math.max(0, own.length - 2)};
    return language === 'ru' && en.length ? {text:`английский: ${en.slice(0, n).join('; ')}`, rest:Math.max(0, en.length - 2)} : {text:'', rest:0};
  }
  // The lines of the card (user 23.10): every part on a line of its own — «Bauch — живот», «Höhe — высота; уровень»;
  // a half-suffix or a suffix explanation first. A line of a part with an own card and more meanings carries the
  // part's entry id and the number of the meanings not shown.
  // G68 (user 24.10.2026): a name read literally — one line «буквально: Weiß + Kopf — белый + голова», the first meaning of
  // each part (as for other names, no translation of the name itself).
  function nameLiteral(f, language) {
    const first = p => { const m = formationMeaning(p, language).text; return m.split(/;\s*/u)[0].replace(/^(английский: )?([^,]*),.*$/u, '$1$2'); };
    const label = (p, k) => `${k === 0 || p.pos === 'Nomen' ? p.text.charAt(0).toUpperCase() + p.text.slice(1) : p.text}${p.link ? `(${p.link})` : ''}`;
    const last = f.parts.length - 1;
    const names = f.parts.map((p, k) => k === last ? formationName(p) : label(p, k)).join(' + ');
    return `${language === 'ru' ? 'буквально' : 'literally'}: ${names} — ${f.parts.map(first).join(' + ')}`;
  }
  function formationLines(f, language) {
    if (f.kind === 'particle-verb') return particleVerbLines(f, language);
    if (f.kind === 'name') return [{text:nameLiteral(f, language), more:0, entryId:null}];
    const i = language === 'ru' ? 0 : 1;
    const gloss = (p, prefix = '') => { const m = formationMeaning(p, language);
      return {text:`${prefix}${formationName(p)} — ${m.text}`, more:p.dictionaryId ? m.rest : 0, entryId:p.dictionaryId || null}; };
    const fixed = text => ({text, more:0, entryId:null});
    if (f.kind === 'compound') {
      const parts = f.half ? f.parts.slice(0, -1) : f.parts;
      return [...(f.half ? [fixed(HALF_SUFFIX[f.half][i])] : []), ...parts.map(p => gloss(p))];
    }
    const b = f.base;
    if (f.prefix === 'un') return [fixed(FORMATION_TEXT.un[i]), gloss(b)];
    if (f.suffix === 'erei') return [fixed(FORMATION_TEXT.erei[b.pos === 'Verb' ? 'Verb' : 'Nomen'][i]), gloss(b)];
    if (FORMATION_TEXT[f.suffix]) return [fixed(FORMATION_TEXT[f.suffix][i]), gloss(b)];
    return [gloss(b, `${language === 'ru' ? 'Возможно, от' : 'Possibly from'} `)];
  }
  // G47 (reference C4, 23.10.2026): a joined particle + verb that no dictionary has, explained by its parts as G48 does
  // (user 23.10): «hinab — вниз (туда)» · «rutschen — буксовать; скользить» — the parts, not a guess of the meaning in
  // the sentence. The verb line shows two meanings; an own card with more gives «ещё N значений →».
  // Two own cards of the verb (ziehen «тянуть» / «переезжать») — a line each (user 23.10).
  function particleVerbLines(f, language) {
    const line = v => {
      let parts = meaningParts(brief(v, language)), shown = language, prefix = '';
      if (!parts.length && language === 'ru') { parts = meaningParts(brief(v, 'en')); shown = 'en'; prefix = 'английский: '; }
      const own = ownCard(v), rest = own ? Math.max(0, meaningParts(v.translation?.[shown] || '').length - 2) : 0;
      return {text:`${v.lemma} — ${prefix}${parts.slice(0, shownCount(Infinity)).join('; ')}`, more:rest, entryId:own ? v.dictionaryId || null : null};
    };
    return [{text:`${f.particle.form} — ${f.particle[language] || f.particle.en}`, more:0, entryId:null}, ...(f.verbs || [f.verb]).map(line)];
  }
  // The card: heading «hinabrutschen = hinab + rutschen», the grammar of the verb form (Präteritum, Perfekt mit … and its
  // highlight), one line per part.
  function particleVerbCard(resolution, candidate, options) {
    const f = candidate.formation, language = options.language === 'ru' ? 'ru' : 'en', lookup = options.lookup || (() => null);
    // The verb is the card's verb (lemma herabrutschen): its construction names it (Konjunktiv II mit hinabrutschen, not the
    // auxiliary's label of another verb).
    const verb = {...f.verb, lemma:f.lemma, ...(candidate.construction ? {construction:candidate.construction} : {}),
      ...(candidate.formFeatures ? {formFeatures:candidate.formFeatures} : {})};
    const base = cardBase(resolution, verb, options);
    const lines = particleVerbLines(f, language).map(l => ({text:l.text, more:l.more, helpEntry:l.entryId ? lookup({id:l.entryId}) : null}));
    for (const l of lines) if (!l.helpEntry) l.more = 0;
    // G57 step 2 (user 24.10.2026): a particle with an own card (heraus, herab, hinein — Adverb) is a part of the details too.
    if (lines[0] && !lines[0].helpEntry) lines[0].helpEntry = lookup({word:f.particle.form, type:'Adverb'}) || null;
    // The verb's label segments are the verb's meaning, not the parts: dropped (the browser shows segments before lines).
    const {segments: _segments, segmentPrefix: _prefix, ...rest} = base;
    return {...rest, heading:`${f.lemma} = ${f.particle.form} + ${f.verb.lemma}`, text:lines.map(l => l.text).join(' · '), lines,
      textLanguage:language, missing:false, derived:true, note:'', more:0, helpEntry:null};
  }
  // One line of text (Wortschatz, alternatives, tools): the lines joined with « · ».
  const formationText = (f, language) => formationLines(f, language).map(l => l.text).join(' · ');
  function formationCard(candidate, language, lookup = () => null) {
    const f = candidate.formation, cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (f.kind === 'name') {
      const text = nameLiteral(f, language);
      return {heading:f.lemma, grammar:'Name', text, lines:[{text, more:0, helpEntry:null}], textLanguage:language, missing:false, derived:true,
        note:'', more:0, spans:null, helpEntry:null};
    }
    let heading = `${f.gender ? f.gender + ' ' : ''}${f.lemma}`, marks = [];
    if (f.number === 'plural') marks.push('Plural');
    if (f.kind === 'compound') {
      const noun = f.pos === 'Nomen', last = f.parts.length - 1;
      const label = (p, k) => {
        const text = k === last ? (noun ? cap(f.number === 'plural' ? p.surface : p.lemma.toLowerCase()) : p.text)
          : (noun && k === 0 || p.pos === 'Nomen' ? cap(p.text) : p.text);
        return `${text}${p.link ? `(${p.link})` : ''}`;
      };
      heading += ` = ${f.parts.map(label).join(' + ')}`;
      marks.push('Kompositum');
    } else marks.push(f.prefix === 'un' ? `un- + ${f.base.lemma}` : `aus ${f.base.pos === 'Nomen' ? 'Nomen' : f.base.pos === 'Verb' ? 'Verb' : 'Adjektiv'} ${formationName(f.base)}`);
    const lines = formationLines(f, language).map(l => ({text:l.text, more:l.more, helpEntry:l.entryId ? lookup({id:l.entryId}) : null}));
    for (const l of lines) if (!l.helpEntry) l.more = 0;
    return {heading, grammar:[f.pos, ...marks].join(' · '), text:lines.map(l => l.text).join(' · '), lines, textLanguage:language, missing:false, derived:true,
      note:'', more:0, spans:null, helpEntry:null};
  }
  const fromText = (source, meaning, language) => `${language === 'ru' ? 'От' : 'From'} ${source} — ${meaning}`;
  // Dictionary meaning on the chosen language; RU without a Russian value keeps the English one marked.
  function meaningText(candidate, language, inline = false) {
    if (inline) { const own = brief(candidate, language, true), en = !own && language === 'ru' ? brief(candidate, 'en', true) : '';
      return own ? {text:own, language, more:hiddenMeanings(candidate, language)} : en ? {text:`английский: ${en}`, language:'en', more:hiddenMeanings(candidate, 'en')} : null; }
    const own = brief(candidate, language);
    if (own) return {text:own, language, more:hiddenMeanings(candidate, language), segments:labelSegments(candidate, language, language)};
    const english = language === 'ru' ? brief(candidate, 'en') : '';
    if (english) return {text:`английский: ${english}`, language:'en', more:hiddenMeanings(candidate, 'en'),
      segments:labelSegments(candidate, 'en', 'ru'), prefix:'английский: '};
    return null;
  }
  // An own dictionary entry (the base of «От lernen — …» lines): D13 fit, like own cards.
  function entryFit(entry, language) {
    if (!entry) return {text:'', rest:0};
    return fit(language === 'ru' ? entry.translation_ru : entry.translation_en);
  }
  /**
   * card(resolution, candidate, {word, language, lookup}) -> {heading, grammar, text, textLanguage, missing, more, spans, helpEntry}
   * more: meanings of an own card left out of the popup text (D13), for the «ещё N значений» link.
   * lookup({id, word, type}) returns a dictionary entry or null (for help and "From …" lines).
   */
  function contractionHeading(c) {
    return c.kind === 'es' ? `${c.form} = ${c.parts[0]} + es` : `${c.form} (= ${c.parts[0]})`;
  }
  // E7 (reference C8, 24.10.2026): a hyphen stub read as the whole word (Gold- und Silbermünzen) keeps the card of the whole word
  // and adds a line under the meaning; a stub without a whole word that is a function word (Aus- oder Umschalten) is «part of a word».
  function cardBase(resolution, candidate, options = {}) {
    const language = options.language === 'ru' ? 'ru' : 'en';
    if (candidate?.wordFragment) return {heading:candidate.lemma, grammar:'', text:candidate.translation[language], textLanguage:language,
      missing:false, derived:true, note:'', more:0, spans:candidate.compound?.spans || null, helpEntry:null};
    let model = wordCard(resolution, candidate, options);
    // L23 (reference A3, 19.10): a modal in Konjunktiv I (er könne) — the hint for reported speech under the meaning.
    if (candidate?.formFeatures?.reportedSpeech && candidate.construction?.id === 'modal-group') {
      const hint = language === 'ru' ? 'косвенная речь: так говорят или думают другие' : 'reported speech';
      model = {...model, note:model.note ? `${model.note}; ${hint}` : hint};
    }
    const e = resolution?.ellipsis;
    if (!e || e.partOnly || !candidate || candidate !== resolution.selected) return model;
    if (!model.spans && candidate.compound?.spans) model.spans = candidate.compound.spans;
    const line = language === 'ru' ? `${e.stub}- = ${e.word}: конец слова взят из ${e.next}` : `${e.stub}- = ${e.word}: the ending is from ${e.next}`;
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
  function card(resolution, candidate, options = {}) {
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
    const language = options.language === 'ru' ? 'ru' : 'en', word = options.word || resolution?.form || '';
    const lookup = options.lookup || (() => null);
    if (!candidate) return {heading:word, grammar:'', text:NO_TRANSLATION[language], textLanguage:language, missing:true, spans:null, helpEntry:null};
    // G47: an external full verb without a meaning in this language (herabfallen in English) shows its parts.
    if (candidate.directionalSimple && (!brief(candidate.directionalFull || candidate, language) || candidate.directionalPhrase?.[language])) candidate = candidate.directionalSimple;
    if (candidate.formation?.kind === 'particle-verb') return particleVerbCard(resolution, candidate, options);
    if (candidate.formation) return formationCard(candidate, language, lookup);
    const confirmed = !!options.confirmed;
    const k = constructionMarks(candidate, confirmed, language);
    let headingText = heading(candidate), type = partOfSpeech(candidate, confirmed), marks = [...k.marks], text = null, helpEntry = candidate.item || null, more = 0;
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
      const participle = usage.kind === 'participle-I' ? 'Partizip I' : usage.kind === 'participle-II' ? 'Partizip II' : null;
      if (participle && pos(candidate) === 'Verb') {
        // No own participle card: the source verb explains the form.
        const meaning = meaningText(candidate, language);
        headingText = usage.form; type = participle;
        text = meaning ? {text:fromText(candidate.lemma, meaning.text.replace(/^английский: /u, ''), meaning.language), language:meaning.language,
          // review 22.10: the labels cut from the source text stand before the meaning after «От X —»
          ...(meaning.segments ? {segments:meaning.segments, prefix:`${meaning.prefix || ''}${fromText(candidate.lemma, '', meaning.language)}`} : {})} : null;
        more = meaning?.more || 0;
      } else if (participle) type = participle;
      else if (usage.kind === 'comparative') marks.push('Komparativ');
      else if (usage.kind === 'superlative') marks.push('Superlativ');
    }
    const gerund = pos(candidate) === 'Nomen' && /^gerund of\s+([\p{L}\p{M}]+)/iu.exec(candidate.translation?.en || '');
    if (usage?.role === 'nominalized' || gerund) {
      const fromVerb = gerund || usage.kind === 'infinitive';
      const base = gerund ? gerund[1].trim() : usage.base;
      type = 'Nomen'; marks = [`aus ${fromVerb ? 'Verb' : 'Adjektiv'} ${base}`];
      if (usage?.kind === 'infinitive' || gerund) headingText = `das ${base.charAt(0).toUpperCase()}${base.slice(1)}`;
      const ownNoun = gerund ? compact(String(candidate.translation?.en || '').replace(/^gerund of[^;]*;?/iu, '')) : '';
      const baseEntry = lookup({id:usage?.baseDictionaryId, word:base, type:fromVerb ? 'Verb' : 'Adjektiv'});
      const synthetic = value => String(value || '').split(/:\s*/u).slice(1).join(': ').trim();
      if (language === 'en' && ownNoun) text = {text:ownNoun, language};
      else {
        const own = entryFit(baseEntry, language), ownEn = entryFit(baseEntry, 'en');
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
        const meaning = own.text || compact(synthetic(candidate.translation?.[language])) || siblingText(language);
        const english = !meaning && language === 'ru' ? ownEn.text || compact(synthetic(candidate.translation?.en)) || ownNoun || siblingText('en') : '';
        // The noun's own meaning in this language comes first (das Grinsen «ухмылка») — unless an own card of the verb is there
        // and the noun's record has several readings (das Übersetzen «переправа; перевод» — the verb card decides): review 23.10.
        const nounOwn = gerund && language !== 'en' && realMeaning(language) &&
          (!own.text || !/;/u.test(String(candidate.translation?.en || '').replace(/^gerund of[^;]*;?/iu, '').trim()));
        if (nounOwn) text = {text:compact(String(candidate.translation[language]).replace(/^gerund of[^;]*;?/iu, '')), language};
        else if (meaning) { text = {text:fromText(base, meaning, language), language}; more = own.text ? own.rest : 0; }
        else if (english) { text = {text:`английский: ${fromText(base, english, 'en')}`, language:'en'}; more = ownEn.text ? ownEn.rest : 0; }
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
      const parts = [meaningText(candidate, language, true), meaningText({...candidate, translation:pair.translation, item:null}, language, true)].filter(Boolean);
      if (parts.length) { text = {text:[...new Set(parts.map(p => p.text))].join(' / '), language:parts[0].language}; more = parts.reduce((sum, p) => sum + (p.more || 0), 0); }
    }
    // A2 (reference 4.9 / 5.5): an established verb + preposition pair.
    const link = candidate.prepositionLink;
    let linkSpans = null;
    if (link && !k.spans) {
      marks.push(pos(candidate) === 'Verb' ? link.pattern : `${link.verb} + ${link.pattern}`);
      linkSpans = link.spans;
    }
    const features = candidate.formFeatures;
    if (features?.tense) marks.push(features.tense);
    if (features?.number === 'plural' && !pair) marks.push('Plural');
    if (features?.degree && !marks.includes(features.degree)) marks.push(features.degree);
    // Translation of the clicked form from the own card (alles «всё» on the alle
    // card): the heading is the form, the help stays the card (alle).
    const formTranslation = candidate.formTranslation;
    if (formTranslation && !text) {
      headingText = formTranslation.form;
      const own = compact(formTranslation[language]), english = language === 'ru' && !own ? compact(formTranslation.en) : '';
      if (own) text = {text:own, language};
      else if (english) text = {text:`английский: ${english}`, language:'en'};
    }
    // Reference 13 (user decision 19.10): a name is «Name» without a translation — the dictionary
    // records of names are English notes that leak into Russian.
    if (candidate.source === 'fallback' && candidate.pos === 'name' && !usage && !contraction) {
      return {heading:headingText, grammar:'Name', text:'', textLanguage:language, missing:false, derived:false, note:'', more:0,
        spans:k.spans || null, helpEntry:null};
    }
    const derived = !!text;
    if (!text && k.role) text = {text:ROLE_TEXT[k.role][language], language};
    if (!text && !contraction?.expression) { text = meaningText(candidate, language); more = text?.more || 0; }
    // B7: colloquial spellings — «war’s = war + es», «hab (= habe)»; es gibt / es geht
    // stay without the verb's own translation until the expressions exist (F8).
    if (contraction) {
      headingText = contractionHeading(contraction);
      if (contraction.expression) { text = null; more = 0; }
    }
    const grammar = [type, ...marks].filter(Boolean).join(' · ');
    // A reflexive verb with an interpretation keeps its note under the meaning.
    const kn = candidate.construction;
    const note = kn && (confirmed || kn.confidence !== 'tentative') && kn.id === 'reflexive-verb' && kn.interpretation
      ? kn.note?.[language] || '' : '';
    // Labels (reference 2.A): segments of the plain text, only when the text is the meaning itself.
    const segments = text?.segments && (!derived || text.prefix) && !contraction ? {segments:text.segments, segmentPrefix:text.prefix || ''} : {};
    return {heading:headingText, grammar, text:text ? text.text : NO_TRANSLATION[language], textLanguage:text ? text.language : language,
      missing:!text, derived, note, more:text ? more : 0, spans:k.spans || linkSpans || candidate.compound?.spans || null, helpEntry, ...segments};
  }
  window.BibliothekMeaningDisplay = Object.freeze({formationText, formationLines, groups, alternatives, pos, heading, brief, compact, formComment, nounPhraseComment, labelSegments,
    card, partOfSpeech, pronounType, contractionHeading, NO_TRANSLATION});
})();
