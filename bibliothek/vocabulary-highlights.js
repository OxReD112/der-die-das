/* Main forms match immediately. Fallback forms resolve near the viewport only. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  function create(text, toggle, getResolver) {
    const PREF = "deutschReadingHighlightsV1", cache = new Map();
    let visible = true, generation = 0, observer = null, reflexiveObserver = null, active = 0;
    const queue = [];
    try { visible = localStorage.getItem(PREF) !== "0"; } catch (_) {}
    function labelWords() {
      for (const span of text.querySelectorAll(".reading-word")) span.setAttribute("aria-label", `${span.textContent}${visible && span.classList.contains("is-unknown") ? ", marked as unknown" : ""}, tap for translation`);
    }
    function syncVisibility() {
      text.classList.toggle("hide-vocabulary-highlights", !visible);
      const label = visible ? "Hide vocabulary highlights" : "Show vocabulary highlights";
      toggle.setAttribute("aria-pressed",String(visible)); toggle.setAttribute("aria-label",label); toggle.title = label;
      labelWords();
    }
    toggle.addEventListener("click", () => { visible = !visible; try { localStorage.setItem(PREF,visible ? "1" : "0"); } catch (_) {} syncVisibility(); });
    syncVisibility();
    function schedule(job) { queue.push(job); drain(); }
    function drain() {
      while (active < 4 && queue.length) {
        const job = queue.shift(); active++;
        Promise.resolve().then(job).catch(() => {}).finally(() => { active--; drain(); });
      }
    }
    function fallback(word, resolver) {
      const key = String(word).normalize("NFC").trim();
      if (!cache.has(key)) {
        const promise = resolver.resolve(word).then(result => { if (result.error) cache.delete(key); return result; }).catch(error => { cache.delete(key); throw error; });
        cache.set(key,promise);
      }
      return cache.get(key);
    }
    async function update(book) {
      const run = ++generation;
      observer?.disconnect(); observer = null; reflexiveObserver?.disconnect(); reflexiveObserver = null; queue.length = 0;
      if (!book) return;
      const records = await window.BibliothekVocabulary.list(book.id);
      const resolver = await getResolver();
      const hasMarkedVerb = records.some(r => (r.dictionaryId != null && resolver.entry(r.dictionaryId)?.type === "Verb") || r.source === "fallback" && /^(verb|Verb)$/u.test(r.pos));
      if (hasMarkedVerb && resolver.prepareSeparable) try { await resolver.prepareSeparable(); } catch (_) { /* Own dictionary groups remain usable. */ }
      if (run !== generation) return;
      const keys = new Set(records.map(record => record.key));
      const unresolved = new Set(records.filter(r => r.source === "unresolved").flatMap(r => r.occurrences.map(o => norm(o.form))));
      const locations = new Set(records.flatMap(r => r.occurrences.filter(o => o.chapterIndex === (book.chapterIndex || 0)).map(o => `${o.paragraphIndex}:${o.tokenOffset}`)));
      const hasResolved = records.some(r => r.source !== "unresolved");
      // Use the same cached grammatical groups as lookup, including fallback verbs.
      const groupLocations = new Set();
      // Stored occurrence spans paint immediately, without grammatical downloads.
      for(const record of records)for(const occurrence of record.occurrences){
        const group=occurrence.construction;
        if(occurrence.chapterIndex!==(book.chapterIndex||0)||group?.id!=='reflexive-verb')continue;
        for(const span of group.spans)groupLocations.add(`${occurrence.paragraphIndex}:${group.sentenceOffset+span.start}`);
      }
      if (resolver.matchSeparable && hasMarkedVerb) {
        for (const paragraph of text.querySelectorAll("[data-paragraph]")) {
          const sentence = paragraph.textContent;
          for (const span of paragraph.querySelectorAll(".reading-word")) {
            const groups = resolver.matchSeparable(span.textContent, {sentence,tokenOffset:Number(span.dataset.tokenOffset)});
            if (groups.length !== 1 || !keys.has(window.BibliothekVocabulary.identity(groups[0]))) continue;
            for (const part of groups[0].construction.spans) groupLocations.add(`${paragraph.dataset.paragraph}:${part.start}`);
          }
        }
      }
      const pending = new Map();
      function apply(span, marked) {
        span.classList.toggle("is-unknown",marked);
        span.setAttribute("aria-label", `${span.textContent}${visible && marked ? ", marked as unknown" : ""}, tap for translation`);
      }
      for (const span of text.querySelectorAll(".reading-word")) {
        const paragraph = span.closest("[data-paragraph]");
        const exactLocation = locations.has(`${paragraph.dataset.paragraph}:${span.dataset.tokenOffset}`);
        const matches = resolver.match(span.textContent).filter(c=>!c.reflexiveUnconfirmed);
        const marked = exactLocation || groupLocations.has(`${paragraph.dataset.paragraph}:${span.dataset.tokenOffset}`) || unresolved.has(norm(span.textContent)) || (matches.length === 1 && keys.has(window.BibliothekVocabulary.identity(matches[0])));
        apply(span,marked);
        if (!marked && !matches.length && hasResolved) {
          if (!pending.has(paragraph)) pending.set(paragraph,[]);
          pending.get(paragraph).push(span);
        }
      }
      // Discover additional reflexive occurrences only near the reading viewport.
      // Checking pronouns once per paragraph replaces a lookup on every word
      // of the entire chapter after each bookmark change.
      if(resolver.matchReflexive&&hasMarkedVerb){
        reflexiveObserver=new IntersectionObserver(entries=>{
          for(const entry of entries){if(!entry.isIntersecting)continue;reflexiveObserver?.unobserve(entry.target);
            schedule(async()=>{
              const paragraph=entry.target,seen=new Set();
              for(const span of paragraph.querySelectorAll('.reading-word')){
                if(!/^(?:mich|mir|dich|dir|sich|uns|euch)$/u.test(norm(span.textContent)))continue;
                if(run!==generation||!paragraph.isConnected)return;
                const groups=await resolver.matchReflexive(span.textContent,{sentence:paragraph.textContent,tokenOffset:Number(span.dataset.tokenOffset)});
                if(run!==generation)return;
                for(const group of groups){const key=window.BibliothekVocabulary.identity(group);if(!keys.has(key))continue;
                  const anchor=group.construction.spans[0].start,unique=key+':'+anchor;if(seen.has(unique))continue;seen.add(unique);
                  const selected=await window.BibliothekMeaningSelections.get({bookId:book.id,location:{chapterIndex:book.chapterIndex||0,paragraphIndex:Number(paragraph.dataset.paragraph),tokenOffset:anchor}}).catch(()=>null);
                  if(run!==generation)return;if(selected&&selected!==key)continue;
                  const starts=new Set(group.construction.spans.map(s=>s.start));
                  for(const token of paragraph.querySelectorAll('.reading-word'))if(starts.has(Number(token.dataset.tokenOffset)))apply(token,true);
                }
              }
            });
          }
        },{rootMargin:'600px 0px'});
        for(const paragraph of text.querySelectorAll('[data-paragraph]'))if(/\b(?:mich|mir|dich|dir|sich|uns|euch)\b/iu.test(paragraph.textContent))reflexiveObserver.observe(paragraph);
      }
      if (!pending.size) return;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer?.unobserve(entry.target);
          const spans = pending.get(entry.target) || [];
          for (const span of spans) schedule(async () => {
            if (run !== generation) return;
            const result = await fallback(span.textContent,resolver);
            if (run !== generation || !span.isConnected) return;
            if (result.status === "resolved" && keys.has(window.BibliothekVocabulary.identity(result.selected))) apply(span,true);
          });
        }
      }, {rootMargin:"600px 0px"});
      for (const paragraph of pending.keys()) observer.observe(paragraph);
    }
    function cancel() { generation++; observer?.disconnect(); observer = null; reflexiveObserver?.disconnect(); reflexiveObserver = null; queue.length = 0; }
    return Object.freeze({update,cancel});
  }
  window.BibliothekHighlights = Object.freeze({create});
})();
