/* Local reading vocabulary. Independent of Wortschatz learning cards. */
(() => {
  "use strict";
  const DB_NAME = "deutschReadingModeV1", VERSION = 2;
  const STORE = "vocabulary";
  let connection;
  const norm = value => String(value || "").normalize("NFC").trim();
  const nominalUsage = usage => {
    if (usage?.role !== "nominalized") return null;
    const {form,number,marker,...identityUsage} = usage;
    return identityUsage;
  };
  function openDb() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("books")) db.createObjectStore("books", { keyPath:"id" });
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath:["bookId", "key"] });
          store.createIndex("bookId", "bookId");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = null; };
        resolve(db);
      };
      request.onerror = () => { connection = null; reject(request.error); };
      request.onblocked = () => { connection = null; reject(new Error("Close other Bibliothek tabs and retry the storage upgrade.")); };
    });
    return connection;
  }
  function identity(entry) {
    if (entry.dictionaryId != null) return JSON.stringify(["main", String(entry.dictionaryId)]);
    // Unresolved forms stay separate until the resolver establishes a lemma.
    const resolved = entry.source === "fallback" && norm(entry.lemma);
    return JSON.stringify([resolved ? "fallback" : "unresolved", norm(resolved || entry.form).toLocaleLowerCase("de-DE"), norm(entry.pos)]);
  }
  function occurrence(input) {
    const loc = input.location;
    const row = {...loc,form:norm(input.form),sentence:String(input.sentence || ""),
      ...(nominalUsage(input.usage) ? {usage:{...input.usage}} : {})};
    const c = input.construction;
    if (c?.id === "reflexive-verb") {
      if (!Number.isInteger(input.tokenOffset) || !Array.isArray(c.spans) || c.spans.length < 2 ||
        !c.spans.every(s=>Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&row.sentence.slice(s.start,s.end)===s.text))
        throw new TypeError("Invalid reflexive occurrence spans.");
      const origin = loc.tokenOffset-input.tokenOffset;
      if (origin < 0) throw new TypeError("Invalid sentence offset.");
      row.tokenOffset = origin+c.spans[0].start;
      row.encounteredTokenOffset = loc.tokenOffset;
      row.construction = {id:c.id,lemma:norm(c.lemma),sentenceOffset:origin,
        spans:c.spans.map(s=>({text:s.text,start:s.start,end:s.end})),
        ...(c.complement ? {complement:{pattern:norm(c.complement.pattern),note_ru:norm(c.complement.note_ru),note_en:norm(c.complement.note_en)}} : {})};
    }
    return row;
  }
  async function mark(input) {
    if (!norm(input.bookId) || !norm(input.form)) throw new TypeError("A book ID and encountered form are required.");
    const loc = input.location;
    if (!loc || !Number.isInteger(loc.chapterIndex) || loc.chapterIndex < 0 || !Number.isInteger(loc.paragraphIndex) || loc.paragraphIndex < 0 || !Number.isInteger(loc.tokenOffset) || loc.tokenOffset < 0)
      throw new TypeError("A chapter index, paragraph index and token offset are required.");
    const encountered = occurrence(input);
    const db = await window.BibliothekReadingData.open(), key = identity(input);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
      const request = store.get([input.bookId, key]);
      let record;
      request.onsuccess = () => {
        const now = Date.now();
        record = request.result || {
          schemaVersion:1, bookId:input.bookId, key, lemma:norm(input.lemma) || null,
          dictionaryId:input.dictionaryId == null ? null : String(input.dictionaryId),
          source:input.dictionaryId != null ? "main" : input.source === "fallback" && norm(input.lemma) ? "fallback" : "unresolved",
          pos:norm(input.pos), translation:{ en:norm(input.translation?.en), ru:norm(input.translation?.ru) },
          ...(nominalUsage(input.usage) ? {usage:nominalUsage(input.usage)} : {}),
          createdAt:now, occurrences:[]
        };
        const existing = record.occurrences.findIndex(o => o.chapterIndex === encountered.chapterIndex && o.paragraphIndex === encountered.paragraphIndex && o.tokenOffset === encountered.tokenOffset);
        if (existing < 0) record.occurrences.push(encountered);
        else record.occurrences[existing] = encountered;
        record.updatedAt = now;
        store.put(record);
      };
      tx.oncomplete = () => resolve(record);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not save vocabulary."));
    });
  }
  async function resolveOccurrence(bookId, oldKey, location, candidate, context) {
    if (!norm(candidate.lemma) || !(candidate.dictionaryId != null || candidate.source === "fallback"))
      throw new TypeError("Choose a resolved dictionary candidate.");
    const replacement = context ? occurrence({...context,...candidate}) : null;
    const db = await window.BibliothekReadingData.open(), key = identity(candidate);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
      let result = null;
      const request = store.get([bookId, oldKey]);
      request.onsuccess = () => {
        const original = request.result;
        if (!original) return;
        const index = original.occurrences.findIndex(o => o.chapterIndex === location.chapterIndex && o.paragraphIndex === location.paragraphIndex && o.tokenOffset === location.tokenOffset);
        if (index < 0) return;
        const updated = replacement ? {...replacement} : {...original.occurrences[index]};
        if (nominalUsage(candidate.usage)) updated.usage = {...candidate.usage};
        else delete updated.usage;
        if (candidate.construction?.id !== "reflexive-verb") { delete updated.construction; delete updated.encounteredTokenOffset; }
        const targetRequest = store.get([bookId, key]);
        targetRequest.onsuccess = () => {
          const target = targetRequest.result || {schemaVersion:1,bookId,key,createdAt:original.createdAt,occurrences:[]};
          Object.assign(target, {lemma:norm(candidate.lemma),dictionaryId:candidate.dictionaryId == null ? null : String(candidate.dictionaryId),source:candidate.dictionaryId != null ? "main" : "fallback",pos:norm(candidate.pos),translation:{en:norm(candidate.translation?.en),ru:norm(candidate.translation?.ru)},updatedAt:Date.now()});
          if (nominalUsage(candidate.usage)) target.usage = nominalUsage(candidate.usage);
          else delete target.usage;
          if (oldKey === key && updated.tokenOffset !== location.tokenOffset)
            target.occurrences = target.occurrences.filter(o=>!(o.chapterIndex===location.chapterIndex && o.paragraphIndex===location.paragraphIndex && o.tokenOffset===location.tokenOffset));
          const existing = target.occurrences.findIndex(o => o.chapterIndex === updated.chapterIndex && o.paragraphIndex === updated.paragraphIndex && o.tokenOffset === updated.tokenOffset);
          if (existing < 0) target.occurrences.push(updated);
          else target.occurrences[existing] = updated;
          if (oldKey !== key) {
            original.occurrences.splice(index,1);
            if (original.occurrences.length) { original.updatedAt = Date.now(); store.put(original); }
            else store.delete([bookId, oldKey]);
          }
          store.put(target);
          result = target;
        };
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not resolve vocabulary."));
    });
  }
  async function list(bookId, chapterIndex) {
    const db = await window.BibliothekReadingData.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).index("bookId").getAll(bookId);
      let records = [];
      request.onsuccess = () => {
        records = request.result;
        if (chapterIndex != null) records = records.map(record => ({ ...record, occurrences:record.occurrences.filter(o => o.chapterIndex === chapterIndex) })).filter(record => record.occurrences.length);
      };
      tx.oncomplete = () => resolve(records.sort((a,b) => a.createdAt - b.createdAt));
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  // Run inside a caller's transaction to delete a book and its marks atomically.
  function deleteBookMarks(tx, bookId) {
    const request = tx.objectStore(STORE).index("bookId").openCursor(IDBKeyRange.only(bookId));
    request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue(); } };
  }
  async function clear(bookId, chapterIndex, key) {
    const db = await window.BibliothekReadingData.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).index("bookId").openCursor(IDBKeyRange.only(bookId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const record = cursor.value;
        if (key == null || key === record.key) {
          if (chapterIndex == null) cursor.delete();
          else {
            record.occurrences = record.occurrences.filter(o => o.chapterIndex !== chapterIndex);
            if (!record.occurrences.length) cursor.delete();
            else { record.updatedAt = Date.now(); cursor.update(record); }
          }
        }
        cursor.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  // Clear only selected identities and original paragraph ranges in one transaction.
  async function clearScope(bookId, range = null, keys = null) {
    if (range && (!Number.isInteger(range.chapterIndex) || !Number.isInteger(range.start) || !Number.isInteger(range.end) || range.chapterIndex < 0 || range.start < 0 || range.end < range.start))
      throw new TypeError("Invalid chapter range.");
    const selected = keys == null ? null : new Set(keys), db = await window.BibliothekReadingData.open();
    return new Promise((resolve,reject) => {
      const tx=db.transaction(STORE,"readwrite"), store=tx.objectStore(STORE);
      const request=store.index("bookId").openCursor(IDBKeyRange.only(bookId));
      let removed=0;
      request.onsuccess=()=>{
        const cursor=request.result;if(!cursor)return;
        const record=cursor.value;
        if (!selected || selected.has(record.key)) {
          const retained=record.occurrences.filter(o => range && !(o.chapterIndex===range.chapterIndex && o.paragraphIndex>=range.start && o.paragraphIndex<range.end));
          if(retained.length!==record.occurrences.length){
            removed++;
            if(retained.length){record.occurrences=retained;record.updatedAt=Date.now();cursor.update(record);}else cursor.delete();
          }
        }
        cursor.continue();
      };
      tx.oncomplete=()=>resolve({removed});
      tx.onerror=tx.onabort=()=>reject(tx.error || new Error("Could not clear vocabulary marks."));
    });
  }
  window.BibliothekVocabulary = Object.freeze({ openDb, identity, mark, resolveOccurrence, list, clear, clearScope, deleteBookMarks, STORE });
})();
