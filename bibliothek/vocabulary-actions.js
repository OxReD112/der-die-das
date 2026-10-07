/* Convert curated entries using the shared Wörterbuch card builder; fallback words stay collected. */
(() => {
  "use strict";
  const PENDING = "deutschWortschatzPendingReadingWordsV2";
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
  function availability(record, resolver) {
    const builder=window.WortschatzDictionaryCard;
    const item=record.source==='main' ? resolver?.entry?.(record.dictionaryId) : null;
    const result=builder.check(item);
    if(result.available)return {...result,item};
    return {...result,error:{...result.error,dictionaryId:record.dictionaryId ?? result.error.dictionaryId,
      base:result.error.base || record.lemma || record.occurrences?.[0]?.form || ""}};
  }
  function learningCards(records,resolver) {
    const cards=[],rows=[],unavailable=[],excluded=[],problems=[];
    const lang=window.DeutschTranslation?.getLang?.() === "ru" ? "ru" : "en";
    for (const record of records) {
      const result=availability(record,resolver);
      if(!result.available){
        unavailable.push(record);
        if(result.error.code==='DICTIONARY_ENTRY_EXCLUDED')excluded.push({record,...result.error});
        else if(record.source==='main')problems.push({record,...result.error});
        continue;
      }
      const card=window.WortschatzDictionaryCard.create(result.item,lang);
      cards.push(card);
      rows.push({dictionaryId:result.item.id,lang,edited:false,card});
    }
    return {cards,rows,unavailable,excluded,problems};
  }
  function add(records,resolver,title) {
    const batch=learningCards(records,resolver),collection=window.WortschatzCollection;
    if(!collection)throw new Error('Wortschatz unavailable');
    batch.rows=batch.rows.filter(row=>{
      const result=collection.normalize(row.card);
      if(result.card){row.card=result.card;return true;}
      batch.problems.push({dictionaryId:row.dictionaryId,base:row.card.base,code:'IMPORT_CARD_INVALID',reason:result.reason});
      return false;
    });
    batch.cards=batch.rows.map(row=>row.card);
    if(!batch.rows.length)return {...batch,added:0,duplicates:0,skipped:[]};

    // Continue through Wortschatz's explicit Starter-Set/own-collection flow.
    sessionStorage.setItem(PENDING,JSON.stringify({id:Date.now().toString(36)+Math.random().toString(36).slice(2),version:2,title,lang:batch.rows[0]?.lang || "en",rows:batch.rows,unavailable:batch.unavailable.length,diagnostics:[...batch.excluded,...batch.problems].map(({record,...error})=>error),placement:"end"}));
    return {...batch,pending:true,added:0,duplicates:0,skipped:[]};
  }
  window.BibliothekVocabularyActions=Object.freeze({copyText,availability,learningCards,add,PENDING});
})();
