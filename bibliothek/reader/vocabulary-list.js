/* Chapter ranges use original paragraph indices, including shared-file EPUB chapters. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const tokenPattern = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
  function paragraphs(book) {
    return book.chapters?.length ? book.chapters.map(c => c.paragraphs) : [String(book.content || "").replace(/\r\n?/g,"\n").split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)];
  }
  function inside(occurrence, range) {
    return !range || occurrence.chapterIndex === range.chapterIndex && occurrence.paragraphIndex >= range.start && occurrence.paragraphIndex < range.end;
  }
  function scoped(records, range) {
    return records.map(record => ({...record,occurrences:record.occurrences.filter(o=>inside(o,range))})).filter(record=>record.occurrences.length);
  }
  async function count(book, records, range, resolver, cancelled = () => false) {
    const keys = new Set(records.map(r=>r.key)), counts = new Map(records.map(r=>[r.key,0]));
    const explicit = new Map(), unresolved = new Map(), words = new Map();
    for (const record of records) {
      for (const o of record.occurrences) if (inside(o,range)) {
        explicit.set(`${o.chapterIndex}:${o.paragraphIndex}:${o.tokenOffset}`,record.key);
        if (record.source === "unresolved") unresolved.set(norm(o.form),record.key);
      }
    }
    const hasResolved = records.some(r=>r.source!=="unresolved");
    let visited = 0;
    const files = paragraphs(book);
    for (let chapterIndex=0;chapterIndex<files.length;chapterIndex++) {
      if (range && chapterIndex !== range.chapterIndex) continue;
      const start=range?.start || 0, end=range?.end ?? files[chapterIndex].length;
      for (let paragraphIndex=start;paragraphIndex<end;paragraphIndex++) {
        for (const token of files[chapterIndex][paragraphIndex].matchAll(tokenPattern)) {
          if (cancelled()) return null;
          const location=`${chapterIndex}:${paragraphIndex}:${token.index}`;
          const saved=explicit.get(location), provisional=unresolved.get(norm(token[0]));
          if (saved || provisional) { const key=saved || provisional; counts.set(key,counts.get(key)+1); }
          else {
            const candidates=resolver.match(token[0]);
            if (candidates.length===1) {const key=window.BibliothekVocabulary.identity(candidates[0]);if(keys.has(key))counts.set(key,counts.get(key)+1);}
            else if (!candidates.length && hasResolved) {
              if (!words.has(token[0])) words.set(token[0],0);
              words.set(token[0],words.get(token[0])+1);
            }
          }
          if (++visited % 500 === 0) await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
    }
    const pending=[...words], complete={value:true}; let index=0;
    await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{
      while(index<pending.length && !cancelled()) {
        const [word,n]=pending[index++];
        const result=await resolver.resolve(word);
        if (result.error) complete.value=false;
        if (result.status==='resolved') {const key=window.BibliothekVocabulary.identity(result.selected);if(keys.has(key))counts.set(key,counts.get(key)+n);}
      }
    }));
    return cancelled() ? null : {counts,complete:complete.value};
  }
  window.BibliothekVocabularyList=Object.freeze({inside,scoped,count});
})();
