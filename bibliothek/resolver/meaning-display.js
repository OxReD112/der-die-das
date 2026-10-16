/* Presentation groups only: dictionary identities remain available for corrections. */
(() => {
  const norm = value => String(value || '').normalize('NFC').toLocaleLowerCase('de-DE').trim();
  const pos = c => ({verb:'Verb',noun:'Nomen',pron:'Pronomen',adj:'Adjektiv',adv:'Adverb'})[c.pos] || c.posLabel || c.pos;
  const key = c => `${norm(c.lemma)}:${pos(c)}${c.source === 'main' && c.dictionaryId ? ':' + c.dictionaryId : ''}`;
  function groups(candidates) {
    const result = new Map();
    for (const c of candidates) {
      if (!result.has(key(c))) result.set(key(c), []);
      result.get(key(c)).push(c);
    }
    return [...result.values()].map(rows => ({candidate:rows.find(c => c.source === 'main') || rows[0], rows}));
  }
  function compact(text) {
    // Parenthesised remarks may contain ";" themselves: drop them before splitting.
    const parts = String(text || '').replace(/\([^()]*\)/g, '').split(';').map(value => {
      if (/^to call on.*divine being/i.test(value.trim()) || /^to call upon$/i.test(value.trim())) return 'to invoke';
      return value.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    return [...new Set(parts)].slice(0, 2).join('; ');
  }
  function heading(candidate) {
    if (candidate.explanation?.kind === 'contraction') return `${candidate.lemma} = ${candidate.explanation.expansion}`;
    const gerund = pos(candidate) === 'Nomen' && /^gerund of /i.test(candidate.translation?.en || '');
    return `${candidate.item?.article || (gerund ? 'das' : '')} ${gerund ? candidate.lemma.charAt(0).toLocaleUpperCase('de-DE') + candidate.lemma.slice(1) : candidate.lemma}`.trim();
  }
  function brief(candidate, language) {
    const text = candidate.translation?.[language] || '';
    if (language === 'en' && /^gerund of anrufen$/i.test(text.trim())) return 'the act of calling';
    if (language === 'en' && /^gerund of /i.test(text.trim())) return 'verbal noun';
    // A confirmed lassen bracket does not pick permission versus causation.
    // Keep every sense of its existing card visible instead of clipping to two.
    if (candidate.construction?.id === 'lassen-infinitive' && norm(candidate.lemma) === 'lassen' && pos(candidate) === 'Verb') return text.trim();
    return compact(text);
  }
  function extraText(rows, own, language) {
    const clean = value => norm(value).replace(/^to\s+/, '').replace(/[.!]+$/, '');
    const known = new Set(String(own?.translation?.[language] || '').split(';').map(clean));
    const parts = rows.filter(c => c !== own).flatMap(c => String(c.translation?.[language] || '').split(';'));
    return [...new Set(parts.map(p => p.trim()).filter(p => p && !known.has(clean(p)) &&
      // Explicit telephone glosses repeat our "to phone" sense.
      !(language === 'en' && known.has('phone') && /\b(?:telephone|phone)\b/i.test(p))))].join('; ');
  }
  function alternatives(resolution, selected, language) {
    return groups(resolution.candidates).sort((a,b) => Number(!!selected && key(a.candidate) === key(selected)) - Number(!!selected && key(b.candidate) === key(selected))).flatMap(group => {
      const base = group.candidate;
      const isSelected = selected && key(base) === key(selected);
      if (isSelected) {
        const translated = compact(extraText(group.rows, selected, language));
        const displayLanguage = translated ? language : 'en';
        const text = translated || compact(extraText(group.rows, selected, displayLanguage));
        return text ? [{candidate:group.rows.find(c => c !== selected && c.translation?.[displayLanguage]), text, language:displayLanguage}] : [];
      }
      const translated = brief(base, language);
      const displayLanguage = translated ? language : 'en';
      const text = translated || brief(base, 'en');
      if (!text && !base.explanation) return [];
      if (!text) return [{candidate:base,text:base.explanation.kind === 'contraction' ? `${base.lemma} = ${base.explanation.expansion}` : base.lemma,language}];
      return [{candidate:base, text, language:displayLanguage}];
    });
  }
  function formComment(resolution, candidate, language) {
    if (!candidate || candidate.explanation || norm(resolution.form) === norm(candidate.lemma)) return '';
    const grammarPos = value => ({verb:'Verb',noun:'Nomen',pron:'Pronomen',adj:'Adjektiv',adv:'Adverb'})[value.pos] || value.pos;
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
    conditional:{ru:'Условная конструкция · бы', en:'Conditional construction · would'},
    futurePerfectWill:{ru:'Вспомогательный глагол Futur II', en:'Future perfect auxiliary · will'},
    futurePerfectHave:{ru:'Вспомогательный глагол Futur II', en:'Future perfect auxiliary · have'},
    perfectHave:{ru:'Вспомогательный глагол Perfekt', en:'Perfect auxiliary · have'},
    haveTo:{ru:'нужно / должен', en:'have to'},
    infinitiveParticle:{ru:'Отдельно не переводится', en:'Not translated separately'}
  };
  const POS_DE = {article:'Artikel', preposition:'Präposition', prep:'Präposition', numeral:'Numerale', num:'Numerale',
    particle:'Partikel', intj:'Interjektion', postp:'Postposition', contraction:'Präposition + Artikel', character:'Zeichen',
    symbol:'Symbol', det:'Artikel', name:'Nomen', noun:'Nomen', verb:'Verb', adj:'Adjektiv', adv:'Adverb', pron:'Pronomen', conj:'Konjunktion'};
  // Own Pronomen cards by number (german-pronouns.json); other sources keep "Pronomen".
  function pronounType(id) {
    const n = Number(String(id || '').split('-')[1]);
    if (n >= 1 && n <= 9) return 'Personalpronomen';
    if (n >= 11 && n <= 18) return 'Possessivpronomen';
    if (n === 19) return 'Reflexivpronomen';
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
      const separable = !!candidate.item?.separable_prefix || candidate.construction?.id === 'separable-verb' && (confirmed || candidate.construction.confidence !== 'tentative');
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
  function constructionMarks(candidate, confirmed = false) {
    const k = candidate.construction;
    if (!k || !confirmed && (k.confidence === 'tentative' || candidate.reflexiveUnconfirmed)) return {marks:[], role:null, spans:null};
    const own = verbBase(candidate.lemma), main = verbBase(k.lemma || ''), isMain = own === main, name = k.lemma || '';
    const spans = k.spans || null;
    switch (k.id) {
      case 'separable-verb': return {marks:[], role:null, spans};
      case 'perfect-group': return {marks:[`${k.label} mit ${name}`], role:isMain ? null : 'auxiliary', spans};
      case 'werden-future': return {marks:[`Futur I mit ${name}`], role:isMain ? null : 'auxiliary', spans};
      case 'werden-passive': return {marks:[`Passiv mit ${name}`], role:isMain ? null : 'passive', spans};
      // A3 (reference 5.6): gelesen «Passiv mit müssen», muss / werden «Passiv mit lesen».
      case 'modal-passive': return {marks:[isMain ? `Passiv mit ${k.modal}` : `Passiv mit ${name}`],
        role:!isMain && own === 'werden' ? 'passive' : null, spans};
      case 'werden-conditional': return {marks:[isMain ? 'Konjunktiv II' : `Konjunktiv II mit ${name}`], role:isMain ? null : 'conditional', spans};
      case 'werden-future-perfect': return {marks:[isMain ? 'Futur II' : `Futur II mit ${name}`],
        role:isMain ? null : own === 'werden' ? 'futurePerfectWill' : 'futurePerfectHave', spans};
      case 'modal-group': return {marks:[isMain ? `Modal mit ${name}` : MODALS.has(own) ? `mit ${name}` : `Modal mit ${name}`], role:null, spans};
      case 'modal-perfect': {
        const modal = (k.spans || []).map(s => norm(s.text)).find(t => MODALS.has(t)) || '';
        if (isMain) return {marks:[`Perfekt mit ${modal}`.trim()], role:null, spans};
        if (MODALS.has(own)) return {marks:[`Perfekt mit ${name}`], role:null, spans};
        return {marks:[`Perfekt mit ${name} ${modal}`.trim()], role:'perfectHave', spans};
      }
      case 'reflexive-verb': {
        // Undecided "sich / einander" keeps both names so the variants stay distinguishable.
        // A5 (user decision 15.10): always Reflexiv; «себя / друг друга» is the note under the meaning.
        const marks = ['Reflexiv'];
        if (['Perfekt','Plusquamperfekt'].includes(k.tense)) marks.push(`${k.tense} mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
        // A1 (reference 5.2): a modal controls the reflexive infinitive (muss mich beeilen).
        else if (k.modal) marks.push(`Modal mit ${/^sich\s/u.test(name) ? name : 'sich ' + name}`);
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
      case 'zu-conjunction': return {marks:[], role:own === 'zu' ? 'infinitiveParticle' : null, spans};
      case 'haben-zu': return own === 'zu' ? {marks:[], role:'infinitiveParticle', spans} : {marks:[isMain ? 'haben + zu' : `haben + zu mit ${name}`], role:isMain ? null : 'haveTo', spans};
      case 'werden-passive-perfect': return {marks:[`Passiv · Perfekt mit ${name}`], role:null, spans};
      case 'werden-become-perfect': return {marks:[String(k.note?.en || '').split(' · ')[0]].filter(Boolean), role:null, spans};
      default: return {marks:/^[A-ZÄÖÜ]/u.test(k.label || '') ? [k.label] : [], role:null, spans};
    }
  }
  const fromText = (source, meaning, language) => `${language === 'ru' ? 'От' : 'From'} ${source} — ${meaning}`;
  // Dictionary meaning on the chosen language; RU without a Russian value keeps the English one marked.
  function meaningText(candidate, language) {
    const own = brief(candidate, language);
    if (own) return {text:own, language};
    const english = language === 'ru' ? brief(candidate, 'en') : '';
    if (english) return {text:`английский: ${english}`, language:'en'};
    return null;
  }
  function entryMeaning(entry, language) {
    if (!entry) return '';
    return compact(language === 'ru' ? entry.translation_ru : entry.translation_en);
  }
  /**
   * card(resolution, candidate, {word, language, lookup}) -> {heading, grammar, text, textLanguage, missing, spans, helpEntry}
   * lookup({id, word, type}) returns a dictionary entry or null (for help and "From …" lines).
   */
  function contractionHeading(c) {
    return c.kind === 'es' ? `${c.form} = ${c.parts[0]} + es` : `${c.form} (= ${c.parts[0]})`;
  }
  function card(resolution, candidate, options = {}) {
    const language = options.language === 'ru' ? 'ru' : 'en', word = options.word || resolution?.form || '';
    const lookup = options.lookup || (() => null);
    if (!candidate) return {heading:word, grammar:'', text:NO_TRANSLATION[language], textLanguage:language, missing:true, spans:null, helpEntry:null};
    const confirmed = !!options.confirmed;
    const k = constructionMarks(candidate, confirmed);
    let headingText = heading(candidate), type = partOfSpeech(candidate, confirmed), marks = [...k.marks], text = null, helpEntry = candidate.item || null;
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
    if (k.role === 'infinitiveParticle') type = 'Infinitivpartikel';
    if (usage?.role === 'attributive' || usage?.role === 'adverbial') {
      const participle = usage.kind === 'participle-I' ? 'Partizip I' : usage.kind === 'participle-II' ? 'Partizip II' : null;
      if (participle && pos(candidate) === 'Verb') {
        // No own participle card: the source verb explains the form.
        const meaning = meaningText(candidate, language);
        headingText = usage.form; type = participle;
        text = meaning ? {text:fromText(candidate.lemma, meaning.text.replace(/^английский: /u, ''), meaning.language), language:meaning.language} : null;
      } else if (participle) type = participle;
      else if (usage.kind === 'comparative') marks.push('Komparativ');
      else if (usage.kind === 'superlative') marks.push('Superlativ');
    }
    const gerund = pos(candidate) === 'Nomen' && /^gerund of\s+([\p{L}\p{M}]+)/iu.exec(candidate.translation?.en || '');
    if (usage?.role === 'nominalized' || gerund) {
      const fromVerb = gerund || usage.kind === 'infinitive';
      const base = gerund ? gerund[1].trim() : usage.base;
      type = 'Nomen'; marks = [`aus ${fromVerb ? 'Verb' : 'Adjektiv'} ${base}`];
      if (usage?.kind === 'infinitive' || gerund) headingText = `das ${base.charAt(0).toLocaleUpperCase('de-DE')}${base.slice(1)}`;
      const ownNoun = gerund ? compact(String(candidate.translation?.en || '').replace(/^gerund of[^;]*;?/iu, '')) : '';
      const baseEntry = lookup({id:usage?.baseDictionaryId, word:base, type:fromVerb ? 'Verb' : 'Adjektiv'});
      const synthetic = value => String(value || '').split(/:\s*/u).slice(1).join(': ').trim();
      if (language === 'en' && ownNoun) text = {text:ownNoun, language};
      else {
        const meaning = entryMeaning(baseEntry, language) || compact(synthetic(candidate.translation?.[language]));
        const english = !meaning && language === 'ru' ? entryMeaning(baseEntry, 'en') || compact(synthetic(candidate.translation?.en)) || ownNoun : '';
        if (meaning) text = {text:fromText(base, meaning, language), language};
        else if (english) text = {text:`английский: ${fromText(base, english, 'en')}`, language:'en'};
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
      const parts = [meaningText(candidate, language), meaningText({...candidate, translation:pair.translation, item:null}, language)].filter(Boolean);
      if (parts.length) text = {text:[...new Set(parts.map(p => p.text))].join(' / '), language:parts[0].language};
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
    const derived = !!text;
    if (!text && k.role) text = {text:ROLE_TEXT[k.role][language], language};
    if (!text && !contraction?.expression) text = meaningText(candidate, language);
    // B7: colloquial spellings — «war’s = war + es», «hab (= habe)»; es gibt / es geht
    // stay without the verb's own translation until the expressions exist (F8).
    if (contraction) {
      headingText = contractionHeading(contraction);
      if (contraction.expression) text = null;
    }
    const grammar = [type, ...marks].filter(Boolean).join(' · ');
    // Constructions not yet in the reference keep their earlier note under the meaning.
    const unreviewed = ['werden-passive-perfect','werden-become-perfect'];
    const kn = candidate.construction;
    const note = kn && (confirmed || kn.confidence !== 'tentative') && (unreviewed.includes(kn.id) || kn.id === 'reflexive-verb' && kn.interpretation)
      ? kn.note?.[language] || '' : '';
    return {heading:headingText, grammar, text:text ? text.text : NO_TRANSLATION[language], textLanguage:text ? text.language : language,
      missing:!text, derived, note, spans:k.spans || linkSpans || candidate.compound?.spans || null, helpEntry};
  }
  window.BibliothekMeaningDisplay = Object.freeze({groups, alternatives, pos, heading, brief, compact, formComment, nounPhraseComment,
    card, partOfSpeech, pronounType, contractionHeading, NO_TRANSLATION});
})();
