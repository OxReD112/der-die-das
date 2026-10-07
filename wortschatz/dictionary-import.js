/* Pending imports keep dictionary identity separate from editable card fields. */
(() => {
  "use strict";
  const VERSION=2, READING="deutschWortschatzPendingReadingWordsV2", DIRECT="deutschWortschatzPendingDictionaryWordV2";
  const root=new URL('../worterbuch/',document.currentScript.src);
  const files=[['nouns','noun'],['verbs','verb'],['adjectives','adjective'],['adverbs','adverb'],['conjunctions','conjunction'],['pronouns','pronoun']];
  async function load() {
    const groups=await Promise.all(files.map(async([file,type])=>{
      const response=await fetch(new URL(`german-${file}.json?v=20261007-import-final-2`,root),{cache:'no-store'});
      if(!response.ok)throw new Error('The dictionary could not be loaded. Your draft is kept; please try again.');
      return (await response.json()).map(item=>({...item,type}));
    }));
    return new Map(groups.flat().map(item=>[item.id,item]));
  }
  function row(item,lang,card) { return {dictionaryId:item.id,lang:lang==='ru'?'ru':'en',edited:false,card}; }
  function validate(rows,dictionary) {
    const errors=[];
    rows.forEach((row,index)=>{
      const item=dictionary.get(row.dictionaryId),check=window.WortschatzDictionaryCard.check(item);
      const fail=(code,reason)=>errors.push({n:index+1,dictionaryId:row.dictionaryId ?? null,base:item?.word || item?.infinitive || row.card?.base || '',code,reason});
      if(!check.available){fail(check.error.code,check.error.reason);return;}
      if(!['en','ru'].includes(row.lang)||typeof row.edited!=='boolean'){fail('IMPORT_ROW_INVALID','Invalid draft language or edit flag');return;}
      const fields=row.edited ? row.card : window.WortschatzDictionaryCard.create(item,row.lang);
      const result=window.WortschatzCollection.normalize(fields);
      if(!result.card){fail('IMPORT_CARD_INVALID',result.reason);return;}
      row.card=result.card;
    });
    return errors;
  }
  function describe(error) {
    return `${error.n ? 'Row '+error.n+' · ' : ''}${error.base || 'Unknown word'}${error.dictionaryId ? ' ('+error.dictionaryId+')' : ''}: ${error.reason}`;
  }
  window.WortschatzDictionaryImport=Object.freeze({VERSION,READING,DIRECT,load,row,validate,describe});
})();
