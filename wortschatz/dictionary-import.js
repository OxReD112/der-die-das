/* Pending imports keep dictionary identity separate from editable card fields. */
(() => {
  "use strict";
  const VERSION=2, READING="deutschWortschatzPendingReadingWordsV2", DIRECT="deutschWortschatzPendingDictionaryWordV2";
  const root=new URL('../worterbuch/',document.currentScript.src);
  const files=[['nouns','noun'],['verbs','verb'],['adjectives','adjective'],['adverbs','adverb'],['adjective-adverbs','adjective'],['conjunctions','conjunction'],['pronouns','pronoun']];
  async function load() {
    const groups=await Promise.all(files.map(async([file,type])=>{
      const response=await fetch(new URL(`german-${file}.json?v=20261007-adjadv-1`,root),{cache:'no-store'});
      if(!response.ok)throw new Error('The dictionary could not be loaded. Your draft is kept; please try again.');
      const list=await response.json();
      // a language pack (17.11.2026): its texts are merged in by id, so cards can be made in that language
      if(window.DeutschTranslation?.needsPack?.())await window.DeutschTranslation.mergeById(list,`worterbuch/german-${file}.json`);
      return list.map(item=>({...item,type}));
    }));
    const dictionary=new Map(groups.flat().map(item=>[item.id,item]));
    for(const item of groups.flat())for(const id of item.alias_ids || [])dictionary.set(id,item);
    return dictionary;
  }
  const packLang=lang=>!!window.DeutschTranslation?.isPack?.(lang); // a language pack ("pl"), 17.11.2026
  function row(item,lang,card) { return {dictionaryId:item.id,lang:lang==='ru'?'ru':packLang(lang)?lang:'en',edited:false,card}; }
  function validate(rows,dictionary) {
    const errors=[];
    rows.forEach((row,index)=>{
      const item=dictionary.get(row.dictionaryId),check=window.WortschatzDictionaryCard.check(item);
      const fail=(code,reason)=>errors.push({n:index+1,dictionaryId:row.dictionaryId ?? null,base:item?.word || item?.infinitive || row.card?.base || '',code,reason});
      if(!check.available){fail(check.error.code,check.error.reason);return;}
      if(!(['en','ru'].includes(row.lang)||packLang(row.lang))||typeof row.edited!=='boolean'){fail('IMPORT_ROW_INVALID','Invalid draft language or edit flag');return;}
      const fields=row.edited ? row.card : window.WortschatzDictionaryCard.create(item,row.lang);
      const result=window.WortschatzCollection.normalize(fields);
      if(!result.card){fail('IMPORT_CARD_INVALID',result.reason);return;}
      row.card=result.card;
    });
    return errors;
  }
  function describe(error) {
    const D = window.DeutschTranslation, tx = (en, ru) => (D ? D.t(en, ru) : en); // 02.11.2026: in the user's language
    return `${error.n ? tx('Row ', 'Строка ')+error.n+' · ' : ''}${error.base || tx('Unknown word', 'Неизвестное слово')}${error.dictionaryId ? ' ('+error.dictionaryId+')' : ''}: ${error.reason}`;
  }
  window.WortschatzDictionaryImport=Object.freeze({VERSION,READING,DIRECT,load,row,validate,describe});
})();
