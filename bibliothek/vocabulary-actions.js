/* Convert curated entries to source-context learning cards; fallback words stay collected. */
(() => {
  "use strict";
  const PENDING = "deutschWortschatzPendingReadingWordsV1";
  function display(record, resolver) {
    const item=record.dictionaryId != null ? resolver.entry(record.dictionaryId) : null;
    return `${item?.article ? item.article+' ' : ''}${record.lemma || record.occurrences[0].form}`;
  }
  function copyText(records,resolver,lang,title) {
    const lines = [title,'',...records.map(record=>{
      const meaning=lang==='ru'?record.translation.ru || record.translation.en:record.translation.en || record.translation.ru;
      return `${display(record,resolver)}${meaning ? ' — '+meaning : ''}`;
    })];
    if(records.some(r=>r.source==='fallback'))lines.push('', 'Fallback translations: Wiktionary contributors · CC BY-SA 4.0 · https://creativecommons.org/licenses/by-sa/4.0/');
    return lines.join('\n');
  }
  function learningCards(records,resolver) {
    const cards=[],unavailable=[];
    for (const record of records) {
      const item=record.source==='main'?resolver.entry(record.dictionaryId):null;
      if(!item){unavailable.push(record);continue;}
      const occurrence=record.occurrences[0], form=occurrence.form;
      const raw=String(occurrence.sentence || '').replace(/\{\{[\s\S]*?\}\}/g,'');
      const escaped=form.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=new RegExp(`(^|[^\\p{L}\\p{M}])(${escaped})(?=$|[^\\p{L}\\p{M}])`,'iu').exec(raw);
      const sentence=match ? raw.slice(0,match.index)+match[1]+`{{c1::${match[2]}}}`+raw.slice(match.index+match[0].length) : `{{c1::${form}}}`;
      const grammar=[item.plural?`Plural: ${item.plural}`:'',item.perfect_form?`Perfekt: ${item.perfect_form}`:'',item.comparative?`Komparativ: ${item.comparative}`:'',item.superlative?`Superlativ: ${item.superlative}`:''].filter(Boolean).join(' · ');
      cards.push({sentence,translation:{en:item.translation_en || record.translation.en || '',ru:item.translation_ru || record.translation.ru || ''},sentenceTranslation:'',base:display(record,resolver),grammar,pos:item.type});
    }
    return {cards,unavailable};
  }
  function add(records,resolver,title) {
    const batch=learningCards(records,resolver),collection=window.WortschatzCollection;
    if(!collection)throw new Error('Wortschatz unavailable');
    if(!batch.cards.length)return {...batch,added:0,duplicates:0,skipped:[]};
    if(collection.isOwn())return {...batch,...collection.add(batch.cards)};
    // Continue through Wortschatz's explicit Starter-Set/own-collection flow.
    sessionStorage.setItem(PENDING,JSON.stringify({id:Date.now().toString(36)+Math.random().toString(36).slice(2),title,cards:batch.cards}));
    return {...batch,pending:true,added:0,duplicates:0,skipped:[]};
  }
  window.BibliothekVocabularyActions=Object.freeze({copyText,learningCards,add,PENDING});
})();
