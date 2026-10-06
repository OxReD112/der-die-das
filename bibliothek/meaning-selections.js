/* Occurrence-specific corrections, independent of vocabulary marks. */
(() => {
  "use strict";
  let connection;
  function open() {
    if (!connection) connection = new Promise((resolve,reject) => {
      const request = indexedDB.open("deutschReadingMeaningsV1",1);
      request.onupgradeneeded = () => request.result.createObjectStore("selections");
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = null; }; resolve(request.result); };
      request.onerror = () => { connection = null; reject(request.error); };
    });
    return connection;
  }
  const key = context => JSON.stringify([context.bookId,context.location.chapterIndex,context.location.paragraphIndex,context.location.tokenOffset]);
  async function access(context, value) {
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx = db.transaction("selections",value === undefined ? "readonly" : "readwrite");
      const store = tx.objectStore("selections"), request = value === undefined ? store.get(key(context)) : store.put(value,key(context));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not save meaning selection."));
    });
  }
  window.BibliothekMeaningSelections = Object.freeze({get:context => access(context),set:access});
})();
