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
    const parts = String(text || '').split(';').map(value => {
      if (/^to call on.*divine being/i.test(value.trim()) || /^to call upon$/i.test(value.trim())) return 'to invoke';
      return value.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    return [...new Set(parts)].slice(0, 2).join('; ');
  }
  function heading(candidate) {
    const gerund = pos(candidate) === 'Nomen' && /^gerund of /i.test(candidate.translation?.en || '');
    return `${candidate.item?.article || (gerund ? 'das' : '')} ${gerund ? candidate.lemma.charAt(0).toLocaleUpperCase('de-DE') + candidate.lemma.slice(1) : candidate.lemma}`.trim();
  }
  function brief(candidate, language) {
    const text = candidate.translation?.[language] || '';
    if (language === 'en' && /^gerund of anrufen$/i.test(text.trim())) return 'the act of calling';
    if (language === 'en' && /^gerund of /i.test(text.trim())) return 'verbal noun';
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
      if (!text) return [];
      return [{candidate:base, text, language:displayLanguage}];
    });
  }
  window.BibliothekMeaningDisplay = Object.freeze({groups, alternatives, pos, heading, brief, compact});
})();
