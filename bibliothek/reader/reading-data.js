/* User-owned reading data. Book content is deliberately excluded from this database. */
(() => {
  'use strict';
  let connection;
  const fields = ['position','tokenOffset','chapterIndex','chapterPositions','contentsPositions','contentsOffsets','readingStarted','completed'];
  function open() {
    if (!connection) connection = new Promise((resolve,reject) => {
      const request = indexedDB.open('deutschReadingDataV1',1);
      request.onupgradeneeded = () => {
        const db=request.result;
        db.createObjectStore('states',{keyPath:'id'});
        const vocabulary=db.createObjectStore('vocabulary',{keyPath:['bookId','key']});
        vocabulary.createIndex('bookId','bookId');
        db.createObjectStore('selections');
      };
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
      request.onerror=()=>{connection=null;reject(request.error);};
      request.onblocked=()=>{connection=null;reject(new Error('Close other Deutsch tabs and retry.'));};
    });
    return connection;
  }
  async function access(store,mode,run) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode);const request=run(tx.objectStore(store));
      tx.oncomplete=()=>resolve(request?.result);
      tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Reading data could not be saved.'));
    });
  }
  const list=()=>access('states','readonly',s=>s.getAll());
  const get=id=>access('states','readonly',s=>s.get(id));
  async function save(book) {
    // Pre-release books have random IDs; migrating those records is intentionally out of scope.
    if (!/^sha256:[a-f0-9]{64}$/.test(book.id)) return;
    const state={id:book.id,title:book.title,name:book.name,format:book.format,createdAt:book.createdAt,updatedAt:book.updatedAt,wordCount:book.wordCount ?? (String(book.content || '').match(/[\p{L}\p{M}]+/gu)||[]).length,structureVersion:book.structureVersion || 1};
    for(const field of fields) if(book[field]!==undefined) state[field]=book[field];
    await access('states','readwrite',s=>s.put(state));
  }
  async function remove(id) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['states','vocabulary','selections'],'readwrite');
      tx.objectStore('states').delete(id);
      const words=tx.objectStore('vocabulary').index('bookId').openCursor(IDBKeyRange.only(id));
      words.onsuccess=()=>{const c=words.result;if(c){c.delete();c.continue();}};
      const meanings=tx.objectStore('selections').openCursor();
      meanings.onsuccess=()=>{const c=meanings.result;if(c){if(JSON.parse(c.key)[0]===id)c.delete();c.continue();}};
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);
    });
  }
  async function exportData() {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['states','vocabulary','selections'],'readonly');
      const states=tx.objectStore('states').getAll(),vocabulary=tx.objectStore('vocabulary').getAll(),values=tx.objectStore('selections').getAll(),keys=tx.objectStore('selections').getAllKeys();
      tx.oncomplete=()=>{
        const ids=new Set(states.result.map(state=>state.id));
        resolve({states:states.result,vocabulary:vocabulary.result.filter(record=>ids.has(record.bookId)),selections:keys.result.map((key,i)=>({key,value:values.result[i]})).filter(record=>ids.has(JSON.parse(record.key)[0]))});
      };
      tx.onerror=tx.onabort=()=>reject(tx.error);
    });
  }
  function validate(data) {
    if(!data || !Array.isArray(data.states) || !Array.isArray(data.vocabulary) || !Array.isArray(data.selections)) throw new Error('Invalid reading backup.');
    const ids=new Set();
    for(const s of data.states){if(!/^sha256:[a-f0-9]{64}$/.test(s?.id) || typeof s.title!=='string' || ids.has(s.id))throw new Error('Invalid book identity.');ids.add(s.id);
      for(const key of ['position','tokenOffset','chapterIndex'])if(s[key]!==undefined&&(!Number.isInteger(s[key])||s[key]<0))throw new Error('Invalid reading position.');
      for(const key of ['chapterPositions','contentsPositions','contentsOffsets'])if(s[key]!==undefined&&(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key])||!Object.values(s[key]).every(n=>Number.isInteger(n)&&n>=0)))throw new Error('Invalid chapter positions.');
      for(const key of ['readingStarted','completed'])if(s[key]!==undefined&&typeof s[key]!=='boolean')throw new Error('Invalid reading status.');
    }
    for(const v of data.vocabulary)if(!ids.has(v?.bookId)||typeof v.key!=='string'||!Array.isArray(v.occurrences))throw new Error('Invalid reading vocabulary.');
    for(const s of data.selections){const key=JSON.parse(s.key);if(!Array.isArray(key)||key.length!==4||!ids.has(key[0])||!key.slice(1).every(n=>Number.isInteger(n)&&n>=0)||typeof s.value!=='string')throw new Error('Invalid meaning selection.');}
    return data;
  }
  async function restore(data) {
    validate(data);
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['states','vocabulary','selections'],'readwrite');
      for(const name of ['states','vocabulary','selections'])tx.objectStore(name).clear();
      for(const state of data.states){const clean={};for(const key of ['id','title','name','format','createdAt','updatedAt','wordCount','structureVersion',...fields])if(state[key]!==undefined)clean[key]=state[key];tx.objectStore('states').put(clean);}
      for(const record of data.vocabulary)tx.objectStore('vocabulary').put(record);
      for(const selection of data.selections)tx.objectStore('selections').put(selection.value,selection.key);
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);
    });
  }
  window.BibliothekReadingData=Object.freeze({open,list,get,save,remove,exportData,validate,restore,fields});
})();
