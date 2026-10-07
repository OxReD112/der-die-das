(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  function create({getBook,getRange,getResolver,goTo,language,onChanged}) {
    const dialog=$("vocabulary-dialog"), list=$("vocabulary-list"), selected=new Set();
    let run=0, countRun=0, entries=[], trigger=null, navigating=false, busy=false, clearRequest=null, currentResolver=null;
    const text=(tag,cls,value)=>{const element=document.createElement(tag);element.className=cls;element.textContent=value;return element;};
    let closing=false;
    function menu(show) {
      $("vocabulary-menu").hidden=!show;
      $("vocabulary-menu-toggle").setAttribute('aria-expanded',String(show));
    }
    async function close(prepare) {
      if(!dialog.open||closing||busy)return;
      closing=true;menu(false);dialog.classList.remove('is-opening');
      const preparation=typeof prepare==='function'?prepare():Promise.resolve();
      if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
        dialog.classList.add('is-closing');
        await Promise.all([preparation,...dialog.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))]);
      }
      await preparation;
      await new Promise(resolve=>{dialog.addEventListener('close',resolve,{once:true});dialog.close();});
      dialog.classList.remove('is-closing');closing=false;
    }
    $("vocabulary-menu-toggle").addEventListener('click',()=>menu($("vocabulary-menu").hidden));
    dialog.addEventListener('click',event=>{if(!event.target.closest('#vocabulary-menu,#vocabulary-menu-toggle'))menu(false);});
    const availability=record=>window.BibliothekVocabularyActions.availability(record,currentResolver);
    const issueLabel=error=>`${error.base || "Unknown word"}${error.dictionaryId ? " ("+error.dictionaryId+")" : ""}: ${error.code==='DICTIONARY_ENTRY_EXCLUDED' ? 'excluded from Wortschatz' : error.code==='DICTIONARY_ENTRY_MISSING' ? 'dictionary entry missing' : 'dictionary example needs correction'}`;
    function selection() {
      const locked=busy || !!clearRequest;
      const n=selected.size,chosenEntries=entries.filter(e=>selected.has(e.key)),eligible=chosenEntries.filter(e=>availability(e).available).length;
      const issues=chosenEntries.map(availability).filter(result=>!result.available).map(result=>issueLabel(result.error));
      $("vocabulary-selection").textContent=n ? `${n} selected · ${eligible} with learning cards${issues.length ? ' · '+issues.join('; ') : ''}` : '';
      $("vocabulary-select-all").checked=entries.length>0&&n===entries.length;
      $("vocabulary-select-all").indeterminate=n>0&&n<entries.length;
      $("vocabulary-select-all").disabled=!entries.length || locked;
      $("vocabulary-copy").setAttribute("aria-label", "Copy selected words");
      $("vocabulary-clear").textContent=n ? 'Clear Selected' : 'Clear Marks';
      $("vocabulary-add").textContent=`+ ${eligible} zum Wortschatz`;
      $("vocabulary-add").hidden=!eligible || !!clearRequest;
      $("vocabulary-menu-toggle").disabled=locked;
      $("vocabulary-add").disabled=locked || !entries.some(e=>selected.has(e.key)&&availability(e).available);
      $("vocabulary-copy").disabled=locked || !n || !currentResolver;
      $("vocabulary-clear").disabled=busy || !entries.length;
      $("vocabulary-scope").disabled=locked || !getBook()?.chapters?.length;
      $("vocabulary-close").disabled=busy;
      for(const control of list.querySelectorAll('input,button'))control.disabled=locked;
    }
    async function render() {
      const request=++run,book=getBook();if(!book)return;
      selected.clear();entries=[];currentResolver=null;list.replaceChildren();list.scrollTop=0;cancelClear();selection();
      $("vocabulary-empty").hidden=true;$("vocabulary-status").textContent='Loading vocabulary…';
      const range=$("vocabulary-scope").value==='book'?null:getRange();
      $("vocabulary-subtitle").textContent=$("vocabulary-scope").value==='book'?book.title:(range?.title || book.title);
      try {
        const records=await window.BibliothekVocabulary.list(book.id);
        if(request!==run||!dialog.open)return;
        entries=window.BibliothekVocabularyList.scoped(records,range);
        $("vocabulary-empty").hidden=!!entries.length;selection();
        const resolver=await getResolver();
        if(request!==run||!dialog.open)return;
        // Repair only missing translations with an unambiguous fallback form link.
        // Existing resolved/manual choices and their translations are untouched.
        let recovered=false;
        for(const record of entries) {
          if(record.source!=="unresolved" || record.translation.en || record.translation.ru)continue;
          for(const occurrence of record.occurrences) {
            if(request!==run||!dialog.open||getBook()!==book)return;
            try {
              const resolution=await resolver.resolve(occurrence.form,{sentence:occurrence.sentence,tokenOffset:occurrence.tokenOffset});
              const candidate=resolution.selected;
              if(candidate?.source!=="fallback" || resolution.candidates.length!==1 ||
                !resolution.formNotes.some(note=>note.lemmas?.length) ||
                !(candidate.translation?.en || candidate.translation?.ru))continue;
              if(request!==run||!dialog.open||getBook()!==book)return;
              await window.BibliothekVocabulary.resolveOccurrence(book.id,record.key,occurrence,candidate);
              recovered=true;
            } catch(_) { /* A failed lookup leaves the original bookmark intact. */ }
          }
        }
        if(recovered) {
          const refreshed=await window.BibliothekVocabulary.list(book.id);
          if(request!==run||!dialog.open||getBook()!==book)return;
          entries=window.BibliothekVocabularyList.scoped(refreshed,range);
          await onChanged();
        }
        currentResolver=resolver;selection();

        for(const record of entries) {
          const row=text('section','vocabulary-row',''),heading=text('div','vocabulary-row-heading','');
          const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=record.key;
          const item=record.dictionaryId != null ? resolver.entry?.(record.dictionaryId) : null;
          label.append(check,document.createTextNode(`${item?.article ? item.article+" " : ""}${record.lemma || record.occurrences[0].form}`));
          check.addEventListener('change',()=>{if(check.checked)selected.add(record.key);else selected.delete(record.key);selection();});
          heading.append(label);row.append(heading);
          const translation=language()==='ru'?record.translation.ru || record.translation.en:record.translation.en || record.translation.ru;
          row.append(text('p','vocabulary-availability',[({adj:'Adjektiv',adv:'Adverb',noun:'Nomen',verb:'Verb',conj:'Konjunktion',pron:'Pronomen'})[record.pos] || record.pos,record.source==='main'?(availability(record).available?'Can add to Wortschatz':issueLabel(availability(record).error)):record.source==='fallback'?'Translation only':'Saved word'].filter(Boolean).join(' · ')));
          row.append(text('p','',translation || 'Meaning not available yet'));
          const occurrence=record.occurrences[0];
          const link=text('button','vocabulary-passage',`${occurrence.form} · Show in text ›`);link.type='button';
          link.addEventListener('click',async()=>{
            if(closing||navigating)return;
            link.disabled=true;navigating=true;
            try{let focus;await close(async()=>{focus=await goTo(occurrence);});focus?.();}
            catch(error){console.warn('Could not open vocabulary passage',error);}
            finally{navigating=false;}
          });row.append(link);list.append(row);
        }
        $("vocabulary-status").textContent=`${entries.length} saved ${entries.length===1?'word':'words'}`;
      }catch(error){if(request===run)$("vocabulary-status").textContent='Vocabulary could not be loaded. Reopen the list to try again.';}
    }
    function open(from) {
      if(!getBook())return;
      menu(false);
      $("vocabulary-progress-fill").style.width=$("chapter-progress-fill").style.width;
      trigger=from || $("vocabulary-toggle");selected.clear();
      $("vocabulary-action-status").textContent='';$("vocabulary-continue").hidden=true;$("vocabulary-manual-copy").hidden=true;
      const hasChapters=!!getBook().chapters?.length;
      $("vocabulary-scope").options[0].textContent=hasChapters?'Kapitel':'Text';
      $("vocabulary-scope").value='chapter';$("vocabulary-scope").disabled=!hasChapters;
      if(!dialog.open){dialog.showModal();dialog.classList.add('is-opening');}render();$("vocabulary-heading").focus({preventScroll:true});
    }
    async function updateCount() {
      const request=++countRun,book=getBook();if(!book)return;
      try{
        const records=await window.BibliothekVocabulary.list(book.id);
        if(request!==countRun||getBook()!==book)return;
        const n=window.BibliothekVocabularyList.scoped(records,getRange()).length;
        $("vocabulary-count").textContent=n;$("vocabulary-toggle").setAttribute('aria-label',`Open ${book.chapters?.length?'chapter':'text'} vocabulary, ${n} marked words`);
        $("chapter-vocabulary-review")?.remove();
        if(n){
          const review=text('button','chapter-vocabulary-review',`You marked ${n} ${n===1?'word':'words'} · Review vocabulary ›`);review.id='chapter-vocabulary-review';review.type='button';review.addEventListener('click',()=>open(review));
          $("chapter-end").prepend(review);$("chapter-end").hidden=false;
        }else if(!book.chapters?.length)$("chapter-end").hidden=true;
        if(dialog.open)render();
      }catch(error){if(request===countRun){$("vocabulary-count").textContent='–';$("vocabulary-toggle").setAttribute('aria-label','Open vocabulary');}}
    }
    function chosen() { return selected.size ? entries.filter(e=>selected.has(e.key)) : entries; }
    function cancelClear() {
      clearRequest=null;$("vocabulary-clear-confirm").hidden=true;$("vocabulary-actions").hidden=false;
    }
    $("vocabulary-copy").addEventListener('click',async()=>{
      if(busy||!currentResolver||!selected.size)return;menu(false);
      const subtitle=$("vocabulary-subtitle").textContent;
      const title=subtitle===getBook().title?subtitle:`${getBook().title} · ${subtitle}`;
      const value=window.BibliothekVocabularyActions.copyText(chosen(),currentResolver,language(),title);
      busy=true;selection();
      try {
        if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
        $("vocabulary-manual-copy").hidden=true;$("vocabulary-action-status").textContent='Vocabulary copied.';
      }catch(error){
        $("vocabulary-manual-copy").hidden=false;$("vocabulary-copy-text").value=value;$("vocabulary-copy-text").focus();$("vocabulary-copy-text").select();
        $("vocabulary-action-status").textContent='Clipboard unavailable. Select and copy the text below.';
      }finally{busy=false;selection();}
    });
    $("vocabulary-add").addEventListener('click',()=>{
      if(busy||!currentResolver||!selected.size)return;
      busy=true;selection();$("vocabulary-continue").hidden=true;
      try{
        const result=window.BibliothekVocabularyActions.add(chosen(),currentResolver,getBook().title);
        const details=[...result.excluded,...result.problems].map(issueLabel).join('; ');
        const unavailable=result.unavailable.length ? ` ${result.unavailable.length} without learning cards kept in vocabulary.` : '';
        if(result.pending){
          $("vocabulary-action-status").textContent=`${result.cards.length} words ready to review.${unavailable}${details ? " "+details : ""}`;
          $("vocabulary-continue").hidden=false;
          location.assign($("vocabulary-continue").href);
        } else $("vocabulary-action-status").textContent=`No learning cards available.${unavailable}${details ? " "+details : ""}`;
      }catch(error){$("vocabulary-action-status").textContent='Words could not be added. Please try again.';}
      finally{busy=false;selection();}
    });
    $("vocabulary-clear").addEventListener('click',()=>{
      if(busy||!entries.length)return;menu(false);
      const book=getBook(),range=$("vocabulary-scope").value==='book'?null:getRange();
      clearRequest={bookId:book.id,range,keys:selected.size?[...selected]:null};
      $("vocabulary-manual-copy").hidden=true;$("vocabulary-continue").hidden=true;$("vocabulary-action-status").textContent='';
      $("vocabulary-clear-heading").textContent=selected.size?'Clear selected marks?':range?'Clear chapter marks?':book.chapters?.length?'Clear all marks in this book?':'Clear all marks in this text?';
      $("vocabulary-clear-description").textContent='Marks in this scope will be removed. Words already added to Wortschatz and their learning progress will stay.';
      $("vocabulary-actions").hidden=true;$("vocabulary-clear-confirm").hidden=false;selection();$("vocabulary-clear-keep").focus();
    });
    $("vocabulary-clear-keep").addEventListener('click',()=>{if(!busy){cancelClear();selection();$("vocabulary-menu-toggle").focus();}});
    $("vocabulary-clear-confirm-button").addEventListener('click',async()=>{
      if(busy||!clearRequest)return;
      const request=clearRequest;busy=true;selection();$("vocabulary-clear-confirm-button").disabled=true;$("vocabulary-clear-keep").disabled=true;
      try{
        const result=await window.BibliothekVocabulary.clearScope(request.bookId,request.range,request.keys);
        cancelClear();await onChanged();
        $("vocabulary-action-status").textContent=`${result.removed} ${result.removed===1?'vocabulary entry':'vocabulary entries'} cleared from this scope. Wortschatz unchanged.`;
      }catch(error){$("vocabulary-action-status").textContent='Marks could not be cleared. Please try again.';}
      finally{busy=false;$("vocabulary-clear-confirm-button").disabled=false;$("vocabulary-clear-keep").disabled=false;selection();$("vocabulary-close").focus();}
    });
    dialog.addEventListener('cancel',event=>{
      event.preventDefault();if(busy)return;
      if(clearRequest){cancelClear();selection();$("vocabulary-menu-toggle").focus();}
      else if(!$("vocabulary-menu").hidden){menu(false);$("vocabulary-menu-toggle").focus();}
      else close();
    });
    $("vocabulary-toggle").addEventListener('click',()=>open($("vocabulary-toggle")));
    $("vocabulary-close").addEventListener('click',close);
    dialog.addEventListener('close',()=>{run++;if(!navigating&&trigger?.isConnected)trigger.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{if(event.target===dialog&&!busy){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();}});
    $("vocabulary-scope").addEventListener('change',()=>{cancelClear();$("vocabulary-manual-copy").hidden=true;$("vocabulary-continue").hidden=true;$("vocabulary-action-status").textContent="";render();});
    $("vocabulary-select-all").addEventListener('change',event=>{selected.clear();for(const check of list.querySelectorAll('input[type="checkbox"]')){check.checked=event.target.checked;if(check.checked)selected.add(check.value);}selection();});
    return Object.freeze({updateCount,open});
  }
  window.BibliothekVocabularyPanel=Object.freeze({create});
})();
