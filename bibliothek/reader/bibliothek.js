(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  // 07.11.2026: the data cache is kept by the page itself (resolver/data-cache.js). The service worker of 26.10
  // (dictionary-cache-sw.js) cost ~1 s on the iPhone every time Safari had stopped it (autoread 06.11), so it is removed:
  // its registration goes; the files it stored stay in the same cache and are read by the page. Only that worker — the
  // push worker of the home page (sw.js, another scope) is not touched.
  try {
    navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => {
      const script = (r.active || r.waiting || r.installing)?.scriptURL || "";
      if (script.split("?")[0] === new URL("dictionary-cache-sw.js", location.href).href) r.unregister();
    })).catch(() => {});
  } catch (_) {}
  // G45 (2), reference 2.A (user 22.10): a dictionary label is a small grey italic word before its meaning;
  // in the card a tap shows the full word («разговорное»).
  function appendLabelSegments(container, segments, prefix = "", interactive = true) {
    if (prefix) container.append(prefix);
    let previousText = false;
    segments.forEach(segment => {
      if (previousText && (segment.labels.length || segment.text)) container.append("; ");
      for (const label of segment.labels) {
        const mark = document.createElement("span"); mark.className = "popover-label"; mark.textContent = label.short; mark.title = label.full;
        if (interactive && label.full !== label.short) {
          mark.tabIndex = 0; mark.setAttribute("role", "button");
          const toggle = event => { event.stopPropagation(); mark.textContent = mark.textContent === label.short ? label.full : label.short; };
          mark.addEventListener("click", toggle);
          mark.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event); } });
        }
        container.append(mark, " ");
      }
      if (segment.text) { container.append(segment.text); previousText = true; }
    });
  }
  function updateDrawerTop() {
    const toolbar=document.querySelector('.reading-toolbar');
    if(toolbar?.getClientRects().length)document.documentElement.style.setProperty('--reader-header-bottom', `${toolbar.getBoundingClientRect().bottom}px`);
  }
  new ResizeObserver(updateDrawerTop).observe(document.querySelector('.reading-toolbar'));
  window.addEventListener('resize',updateDrawerTop);
  const STORE = "books";
  const $library = $("library"), $reading = $("reading-view"), $bookList = $("book-list");
  const $file = $("book-file"), $text = $("reading-text"), $popover = $("word-popover"), $sheet = $("dictionary-sheet");
  let currentBook = null, selectedEntry = null, activePronouns = [], toastTimer = null, restoringPosition = false;
  // G57 step 2 (user 24.10.2026): a word explained by its parts has «Словарная справка» when a part has an own card; the details
  // page through those parts («Bauch · 1 / 2», ‹ ›, swipe). partEntries — the parts of the shown card; detailParts — the open details.
  let partEntries = [], detailParts = [], detailIndex = 0;
  // 09.11 (Alena): the thank-you after a chosen meaning is gone — its counter is cleared from the device once.
  try { window.localStorage.removeItem("bibliothek-meaning-thanks-v1"); } catch (_) {}
  let dictionary = null, dictionaryPromise = null;
  // Details of our own cards (08.11.2026, speed chat): examples, notes and the like are not in the reader's light files
  // (worterbuch/reader/, build-reader-dictionaries.cjs); the reference card and the word window's learning cards read them.
  // cardDetailsSource: card id → where its details are; a part (NN.json) is read once, through the data cache, when a card
  // of it is opened. withDetails(card) is the source card again (the same fields; the details after the others).
  const cardDetailsSource = new Map(), cardDetails = new Map(), cardDetailParts = new Map();
  const cardDetailsUrl = card => {
    const where = card && card.id != null ? cardDetailsSource.get(String(card.id)) : null;
    if (!where) return null;
    let h = 2166136261; for (const b of new TextEncoder().encode(String(card.id))) h = Math.imul(h ^ b, 16777619) >>> 0;
    return `${where.base}${String(h & (where.parts - 1)).padStart(2, "0")}.json?v=${where.version}`;
  };
  const cardDetailsReady = cards => cards.every(card => { const url = cardDetailsUrl(card); return !url || cardDetailParts.get(url)?.done; });
  function ensureCardDetails(cards) {
    const dataFetch = (input, options) => (window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
    return Promise.all([...new Set(cards.map(cardDetailsUrl).filter(Boolean))].map(url => {
      let part = cardDetailParts.get(url);
      if (!part) {
        part = {done:false};
        part.promise = dataFetch(url).then(r => { if (!r.ok) throw new Error("card details load failed"); return r.json(); })
          .then(rows => { for (const [id, extra] of Object.entries(rows || {})) cardDetails.set(id, extra); part.done = true; })
          .catch(() => { cardDetailParts.delete(url); });   // (not read: the card without its details; asked again next time)
        cardDetailParts.set(url, part);
      }
      return part.promise;
    }));
  }
  const withDetails = card => { const extra = card && card.id != null ? cardDetails.get(String(card.id)) : null; return extra ? {...card, ...extra} : card; };
  let pendingDelete = null, deleteTrigger = null, deleting = false;
  let switchingChapter = false, renderRequest = 0;
  let restoreLastPage = false;
  const pagination = window.BibliothekPagination.create({
    closePopups,
    isBlocked:() => switchingChapter || !$sheet.hidden || !!document.querySelector('dialog[open]') || !$("delete-confirm").hidden,
    onBoundary:(direction, checkOnly) => {
      if (!hasChapters(currentBook)) return false;
      const entries = readingEntries(currentBook), index = entries.indexOf(activeEntry(currentBook));
      const entry = entries[index + direction];
      if (!entry) return false;
      if (!checkOnly) { restoreLastPage = direction < 0; navigateTo(entry); }
      return true;
    },
    onChange:(location, page, count) => {
      if (!currentBook || !location || deleting) return;
      const book = currentBook;
      book.position = location.paragraph;
      book.tokenOffset = location.tokenOffset;
      if (hasChapters(book)) {
        book.chapterPositions[book.chapterIndex] = book.position;
        const entry = activeEntry(book);
        if (entry) { book.contentsOffsets ||= {}; book.contentsOffsets[entryKey(entry)] = book.tokenOffset; }
      }
      rememberEntry(book, book.position);
      if (page > 0 || (hasChapters(book) && book.chapterIndex > 0)) book.readingStarted = true;
      setProgress();
      clearTimeout(window.__readingSaveTimer);
      window.__readingSaveTimer = setTimeout(() => updateProgress(book, book.position), 250);
    }
  });
  const norm = value => String(value || "").normalize("NFC").trim().toLowerCase();
  const locale = () => window.DeutschTranslation?.getLang?.() || "en";
  // 09.11 (Alena): the rule of the app — names, buttons and short messages in German; explanations in the language of
  // the setting. The library's explanations (the ⓘ note, the empty library) and its error messages follow it here;
  // the messages of the import files stay in English there and are translated by this table.
  const LIBRARY_NOTE = {
    en: '<p><strong>Which files work</strong> EPUB without copy protection (DRM) and TXT. Books bought in shops such as Kindle, Apple Books or Kobo are usually protected and won’t open. PDF isn’t supported.</p><p><strong>Where books are kept</strong> Only on this device. Browser storage can be cleared, so keep your original files as a backup.</p>',
    ru: '<p><strong>Какие файлы подходят</strong> EPUB без защиты от копирования (DRM) и TXT. Книги из магазинов — Kindle, Apple Books, Kobo — обычно защищены и не откроются. PDF не поддерживается.</p><p><strong>Где хранятся книги</strong> Только на этом устройстве. Хранилище браузера может очиститься, поэтому сохраняйте исходные файлы.</p>'
  };
  const LIBRARY_EMPTY = {
    en: "Add a TXT or unencrypted EPUB file, or paste a German text to get started.",
    ru: "Добавьте файл TXT или EPUB без защиты или вставьте немецкий текст, чтобы начать."
  };
  const MESSAGES_RU = {
    "Reading position could not be saved.": "Не удалось сохранить место чтения.",
    "Meaning selected, but the correction could not be saved.": "Значение выбрано, но сохранить выбор не удалось.",
    "The word form is unavailable. Please reload and try again.": "Форма слова недоступна. Перезагрузите страницу и попробуйте ещё раз.",
    "Vocabulary could not be loaded. Try reopening this word.": "Не удалось загрузить слова. Откройте это слово ещё раз.",
    "Could not undo the mark. Please try again.": "Не удалось отменить отметку. Попробуйте ещё раз.",
    "The mark could not be saved. Please try again.": "Не удалось сохранить отметку. Попробуйте ещё раз.",
    "The book could not be saved. Check available browser storage.": "Не удалось сохранить книгу. Проверьте свободное место в браузере.",
    "The text could not be saved. Check available browser storage.": "Не удалось сохранить текст. Проверьте свободное место в браузере.",
    "Local book storage is unavailable in this browser.": "В этом браузере нельзя хранить книги.",
    "This text is empty.": "Текст пустой.",
    "This file type is not supported. Choose a TXT or EPUB file.": "Такой файл не подходит. Выберите TXT или EPUB.",
    "EPUB import is not available yet.": "Загрузка EPUB пока недоступна.",
    "This file could not be read. Try selecting it again.": "Не удалось прочитать файл. Выберите его ещё раз.",
    "This EPUB contains invalid XML or chapter markup.": "В этом EPUB ошибка в разметке глав.",
    "This EPUB references an unsupported resource.": "Этот EPUB ссылается на неподдерживаемый файл.",
    "This EPUB contains an invalid resource path.": "В этом EPUB неверный путь к файлу.",
    "An EPUB chapter is missing its text body.": "В одной из глав EPUB нет текста.",
    "This EPUB is too large. Choose a file smaller than 50 MB.": "Этот EPUB слишком большой. Выберите файл меньше 50 МБ.",
    "This EPUB could not be opened. It may be damaged or password-protected.": "Не удалось открыть этот EPUB. Возможно, он повреждён или защищён паролем.",
    "This EPUB is too large to import on this device.": "Этот EPUB слишком большой для этого устройства.",
    "This EPUB is missing a required book file.": "В этом EPUB не хватает нужного файла.",
    "An EPUB chapter is too large to import.": "Одна из глав EPUB слишком большая.",
    "This EPUB uses an unsupported or invalid text encoding.": "В этом EPUB неподдерживаемая или неверная кодировка текста.",
    "This file is not a valid EPUB book.": "Это не EPUB-книга.",
    "This EPUB is missing its chapter list.": "В этом EPUB нет списка глав.",
    "This EPUB is DRM-protected. Choose a DRM-free book.": "Этот EPUB защищён (DRM). Выберите книгу без защиты.",
    "This EPUB references a missing chapter.": "В этом EPUB не хватает главы.",
    "This EPUB contains an unsupported chapter format.": "В этом EPUB главы в неподдерживаемом формате.",
    "This EPUB contains no readable text.": "В этом EPUB нет текста для чтения."
  };
  const say = message => locale() === "ru" && MESSAGES_RU[message] || message;
  function applyLibraryTexts() {
    const lang = locale() === "ru" ? "ru" : "en";
    $("storage-note").innerHTML = LIBRARY_NOTE[lang];
    $("storage-note").lang = lang;
    $("empty-library-text").textContent = LIBRARY_EMPTY[lang];
    $("empty-library-text").lang = lang;
  }
  const translation = item => locale() === "ru" ? item.translation_ru || item.translation_en : item.translation_en || "";

  const vocabularyHighlights = window.BibliothekHighlights.create($text, $("highlights-toggle"), async () => {
    try { await loadDictionary(); return lemmaResolver; }
    catch (_) { return window.BibliothekLemmaResolver.create([], window.DeutschFallbackDictionary); }
  });
  function refreshHighlights() {
    vocabularyHighlights.update(currentBook).catch(error => console.warn("Vocabulary highlights unavailable", error));
  }
  // Text settings re-flow the pages around the place where the reader was when the panel opened,
  // so trying several sizes in a row does not drift backwards through the text.
  let textSettingsAnchor = null;
  window.BibliothekTextSettings.create({
    target: $("page-flow"), dialog: $("text-settings"), toggle: $("text-settings-toggle"),
    onBeforeOpen: () => { closePopups(); textSettingsAnchor = pagination.location; },
    onChange: () => {
      if ($reading.hidden || !currentBook) return;
      closePopups();
      pagination.layout(textSettingsAnchor || pagination.location);
    }
  });
  $("text-settings").addEventListener("close", () => { textSettingsAnchor = null; });

  function vocabularyRange() {
    if (!hasChapters(currentBook)) return null;
    const entries = readingEntries(currentBook), entry = activeEntry(currentBook);
    const next = entries[entries.indexOf(entry) + 1];
    return {chapterIndex:currentBook.chapterIndex,start:entry?.paragraph || 0,end:next?.chapterIndex === currentBook.chapterIndex ? next.paragraph : currentBook.chapters[currentBook.chapterIndex].paragraphs.length,title:entry?.title || currentBook.title};
  }
  const vocabularyPanel = window.BibliothekVocabularyPanel.create({
    getBook:() => currentBook, getRange:vocabularyRange, language:locale,
    onChanged:() => { refreshHighlights(); return vocabularyPanel.updateCount(); },
    getResolver:async () => { try { await loadDictionary(); return lemmaResolver; } catch (_) { return window.BibliothekLemmaResolver.create([], window.DeutschFallbackDictionary); } },
    // (08.11.2026: the learning cards need the examples — the details of the listed cards are read first)
    withCardDetails:async (resolver, records) => {
      await ensureCardDetails(records.filter(r => r.dictionaryId != null).map(r => resolver.entry?.(r.dictionaryId)).filter(Boolean));
      return Object.create(resolver, {entry:{value:id => withDetails(resolver.entry(id))}});
    },
    // 08.11 (Alena): a tap on a word of Meine Wörter — the same card as «Словарная справка», on the list's second screen
    renderCard:(item, root, form) => renderDictionaryCard(item, {root, form}),
    goTo:async occurrence => {
      if (!currentBook) return;
      if (hasChapters(currentBook)) {
        const entry = readingEntries(currentBook).filter(e => e.chapterIndex < occurrence.chapterIndex || (e.chapterIndex === occurrence.chapterIndex && e.paragraph <= occurrence.paragraphIndex)).at(-1);
        if (entry) await navigateTo(entry, false, false);
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const paragraph = $text.querySelector(`[data-paragraph="${occurrence.paragraphIndex}"]`);
      const target = paragraph?.querySelector(`[data-token-offset="${occurrence.tokenOffset}"]`) || paragraph;
      if (target) { pagination.reveal(target); await updateProgress(currentBook,pagination.location?.paragraph ?? occurrence.paragraphIndex); }
      return () => target?.isConnected && target.focus({preventScroll:true});
    }
  });

  // 09.11 (Alena): the note behind ⓘ is a window over the library (variant Б) — it used to open inside the library and
  // push the shelf down under the dock. Closed by ×, a tap beside it or Esc. Never opens by itself (08.11).
  const storageInfo = $("storage-info"), storageNotice = $("storage-notice");
  storageInfo.addEventListener("click", () => storageNotice.showModal());
  $("storage-notice-close").addEventListener("click", () => storageNotice.close());
  storageNotice.addEventListener("click", event => {
    const bounds = storageNotice.getBoundingClientRect();
    if (event.target === storageNotice && (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom)) storageNotice.close();
  });
  storageNotice.addEventListener("close", () => storageInfo.focus({preventScroll:true}));
  applyLibraryTexts();
  window.addEventListener("storage", event => {
    if (event.key === window.DeutschTranslation?.KEY || event.key === null) updateReaderLanguage();
  });
  window.addEventListener("pageshow", updateReaderLanguage);
  window.addEventListener("focus", updateReaderLanguage);
  window.addEventListener("deutschtranslationchange", updateReaderLanguage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateReaderLanguage(); });

  const openDb = () => window.BibliothekVocabulary.openDb();
  let reloadBookId = null;
  async function allBooks() {
    const db = await openDb();
    const content = await new Promise((resolve,reject) => {
      const tx=db.transaction(STORE,'readonly'), request=tx.objectStore(STORE).getAll();
      tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error);
    });
    const states=await window.BibliothekReadingData.list(), byId=new Map(content.map(book=>[book.id,book]));
    for(const state of states) byId.set(state.id,{...byId.get(state.id),...state,missingContent:!byId.has(state.id)});
    return [...byId.values()].sort((a,b)=>(b.createdAt || 0)-(a.createdAt || 0)||String(a.id).localeCompare(String(b.id)));
  }
  async function saveBook(book, saveContent = false) {
    book.wordCount ??= (String(book.content || "").match(/[\p{L}\p{M}]+/gu) || []).length;
    await window.BibliothekReadingData.save(book);
    if (saveContent) {
      const db = await openDb();
      const content={...book};
      for(const field of window.BibliothekReadingData.fields) delete content[field];
      delete content.missingContent;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(content);
        tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Could not save this book'));
      });
      try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (_) {}
    }
  }
  async function importBook(book) {
    if(reloadBookId && book.id !== reloadBookId) throw new window.BibliothekImport.ImportError('different','This is a different book. Choose the original file.');
    const state=await window.BibliothekReadingData.get(book.id);
    if(state) Object.assign(book,state);
    await saveBook(book,true);
  }
  async function updateProgress(book, paragraph) {
    book.position = paragraph;
    if (hasChapters(book)) book.chapterPositions[book.chapterIndex] = paragraph;
    updateBookmarkStatus(book, paragraph);
    book.updatedAt = Date.now();
    try { await saveBook(book); } catch (error) { showToast("Reading position could not be saved."); }
    setProgress();
  }
  function showToast(message, actionLabel, duration = 3200) {
    message = say(message);
    const toast = $("reader-toast");
    toast.classList.remove("has-undo");
    toast.replaceChildren(document.createTextNode(message));
    if (actionLabel) {
      const action = document.createElement("a");
      action.className = "toast-action";
      action.href = "../wortschatz/index.html?v=20261110-confirm-1"; // 10.11: was an October key
      action.textContent = actionLabel;
      toast.append(action);
    }
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.hidden = true, duration);
  }

  const shelfRoot=$("library-bookshelf"), viewToggle=$("library-view-toggle");
  const addToggle=$("library-add-toggle"),addMenu=$("library-add-menu"),pasteDialog=$("paste-dialog");
  function closeAddMenu(focus=false){addMenu.hidden=true;addToggle.setAttribute('aria-expanded','false');if(focus)addToggle.focus();}
  addToggle.addEventListener('click',()=>{
    const opening=addMenu.hidden;addMenu.hidden=!opening;addToggle.setAttribute('aria-expanded',String(opening));
    if(opening)$("add-book").focus();
  });
  document.addEventListener('click',event=>{if(!addMenu.contains(event.target)&&!addToggle.contains(event.target))closeAddMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!addMenu.hidden){event.preventDefault();closeAddMenu(true);}});
  $("paste-close").addEventListener('click',()=>pasteDialog.close());
  pasteDialog.addEventListener('close',()=>addToggle.focus());
  let libraryView=window.matchMedia('(max-width:600px)').matches?'list':'shelf';
  try { const saved=localStorage.getItem('deutschLibraryViewV1');if(saved==='list'||saved==='shelf')libraryView=saved; } catch (_) {}
  let lastOpenedBookId=null;
  try { lastOpenedBookId=localStorage.getItem("deutschLibraryLastOpenedV1"); } catch (_) {}
  function openLibraryBook(book) {
    if(book.missingContent){reloadBookId=book.id;$file.click();}
    else {bookshelf.pause();openBook(book);}
  }
  // 08.11 (Alena): one confirm for both actions on one or several books. «Zurücksetzen» clears the reading progress
  // and the marked words of the book (highlights, Meine Wörter, chosen meanings); «Löschen» removes the book with all
  // of that. Words already in Wortschatz stay in both cases.
  function requestBookAction(kind,books,trigger) {
    if(!books.length)return;
    pendingDelete={kind,books};deleteTrigger=trigger;
    const one=books.length===1, name=one?`„${books[0].title}“`:`${books.length} Bücher`;
    $("delete-confirm-title").textContent=kind==='reset'?`${name} zurücksetzen?`:`${name} löschen?`;
    $("delete-confirm-text").textContent=kind==='reset'
      ?`Lesefortschritt und markierte Wörter ${one?'dieses Buches':'dieser Bücher'} werden gelöscht. Dein Wortschatz bleibt.`
      :`${one?'Das Buch wird':'Die Bücher werden'} mit Lesefortschritt und markierten Wörtern von diesem Gerät entfernt. Dein Wortschatz bleibt.`;
    $("confirm-delete").textContent=kind==='reset'?'Zurücksetzen':'Löschen';
    $("delete-confirm").hidden=false;$library.inert=true;$("library-actions").inert=true;$("library-bulk").inert=true;
    $("reader").querySelector(".reader-header").inert=true;$("cancel-delete").focus({preventScroll:true});
  }
  function requestBookDelete(book,trigger) { requestBookAction('delete',[book],trigger); }
  let editing=false, listBooks=[];
  const selectedIds=new Set();
  function syncEditing() {
    const listShown=libraryView==='list'&&listBooks.length>0;
    if(!listShown)editing=false;
    if(!editing)selectedIds.clear();
    document.documentElement.classList.toggle('library-editing',editing);
    $("library-edit-bar").hidden=!listShown;
    $("library-edit").textContent=editing?'Fertig':'Bearbeiten';
    $("library-edit").setAttribute('aria-pressed',String(editing));
    const all=listBooks.length>0&&selectedIds.size===listBooks.length;
    $("library-select-all").hidden=!editing;
    $("library-select-all").textContent=all?'Keine auswählen':'Alle auswählen';
    $("library-bulk").hidden=!editing;
    $("library-actions").hidden=editing;
    for(const row of $bookList.querySelectorAll('.book-row')){
      const on=selectedIds.has(row.dataset.bookId);
      row.classList.toggle('is-selected',on);
      const open=row.querySelector('.book-open');
      if(editing)open.setAttribute('aria-pressed',String(on));else open.removeAttribute('aria-pressed');
    }
    const n=selectedIds.size;
    $("bulk-reset").disabled=n===0;$("bulk-delete").disabled=n===0;
    $("bulk-delete").textContent=n?`Löschen (${n})`:'Löschen';
  }
  function setEditing(on) { editing=on; if(on)closeAddMenu(); syncEditing(); }
  function toggleSelected(id) { if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id); syncEditing(); }
  $("library-edit").addEventListener('click',()=>setEditing(!editing));
  $("library-select-all").addEventListener('click',()=>{
    if(selectedIds.size===listBooks.length)selectedIds.clear();else listBooks.forEach(book=>selectedIds.add(book.id));
    syncEditing();
  });
  const chosenBooks=()=>listBooks.filter(book=>selectedIds.has(book.id));
  $("bulk-reset").addEventListener('click',event=>requestBookAction('reset',chosenBooks(),event.currentTarget));
  $("bulk-delete").addEventListener('click',event=>requestBookAction('delete',chosenBooks(),event.currentTarget));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&editing&&$("delete-confirm").hidden){event.preventDefault();setEditing(false);$("library-edit").focus({preventScroll:true});}});
  function describeLibraryBook(book) {
    if(book.missingContent)return 'Datei neu laden · '+String(book.format||'txt').toUpperCase();
    if(book.completed)return 'Gelesen';
    const started=book.readingStarted||Number(book.position)>0||Number(book.chapterIndex)>0;
    const resume=hasChapters(book)&&started?activeEntry({...book,chapterIndex:book.chapterIndex||0,position:book.position||0}):null;
    if(resume)return `Weiterlesen · ${resume.title}`;
    if(started)return 'Weiterlesen';
    const words=Number(book.wordCount||0);
    return `${words.toLocaleString('de-DE')} ${words===1?'Wort':'Wörter'} · ${String(book.format||'txt').toUpperCase()}`;
  }
  const bookshelf=window.BibliothekBookshelf.create({root:shelfRoot,onOpen:openLibraryBook,onDelete:requestBookDelete,onReset:(book,trigger)=>requestBookAction('reset',[book],trigger),describe:describeLibraryBook,getPreferredId:()=>lastOpenedBookId});
  function applyLibraryView() {
    const populated=$bookList.children.length>0;
    const addParent=populated?$("library-actions"):$("empty-library");
    if(addToggle.parentElement!==addParent){closeAddMenu();addParent.append(addToggle,addMenu);}
    $library.classList.toggle('is-bookshelf',libraryView==='shelf');
    if(libraryView==='shelf')$library.scrollTop=0;
    shelfRoot.hidden=!populated||libraryView!=='shelf';$bookList.hidden=libraryView==='shelf';
    viewToggle.hidden=!populated;
    viewToggle.innerHTML=libraryView==='shelf'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/><path d="M9 6h12M9 12h12M9 18h12"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="8" width="5" height="14" rx=".6" transform="rotate(13 4.5 22)"/><rect x="9" y="5" width="5" height="17" rx=".6" transform="rotate(8 11.5 22)"/><rect x="17" y="3" width="5" height="19" rx=".6"/></svg>';
    viewToggle.setAttribute('aria-label',libraryView==='shelf'?'Switch to list view':'Switch to bookshelf view');
    syncEditing();
  }
  viewToggle.addEventListener('click',()=>{
    libraryView=libraryView==='shelf'?'list':'shelf';
    try{localStorage.setItem('deutschLibraryViewV1',libraryView);}catch(_){}
    applyLibraryView();if(libraryView==='shelf')bookshelf.resume();else bookshelf.pause();
  });

  function coverInitials(title) {
    const words = String(title || "").normalize("NFC").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || [];
    return words.slice(0, 2).map((word, index) => index === 0
      ? Array.from(word)[0].toUpperCase()
      : Array.from(word)[0].toLowerCase()).join("") || "?";
  }

  function renderBooks(books) {
    $bookList.replaceChildren();
    $("empty-library").hidden = books.length > 0;
    books.forEach(book => {
      book.wordCount ??= (String(book.content || "").match(/[\p{L}\p{M}]+/gu) || []).length;
      const row = document.createElement("div");
      row.className = "book-row";
      const button = document.createElement("button");
      button.className = "book-open";
      button.type = "button";
      button.innerHTML = `<span class="book-icon" aria-hidden="true"></span><span class="book-meta"><span class="book-title"></span><span class="book-author" hidden></span><span class="book-subtitle"></span></span><span class="book-arrow ui-chev ui-chev-lone" aria-hidden="true"></span>`;
      const hasSecondPage = book.missingContent || splitParagraphs(book.content).length > 1;
      const started = hasSecondPage && Boolean(book.readingStarted || Number(book.position) > 0 || Number(book.chapterIndex) > 0);
      const completed = started && Boolean(book.completed);
      const icon = button.querySelector(".book-icon");
      icon.textContent = coverInitials(book.title);
      if (/^data:image\/(webp|png|jpeg);base64,/.test(book.coverThumbnail || "")) {
        const image = document.createElement("img");
        image.className = "book-cover";
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("load", () => {
          // Narrow artwork fills the front without extending over the separate spine.
          icon.classList.toggle("has-narrow-cover", image.naturalWidth / image.naturalHeight < 40 / 54);
        }, { once: true });
        image.addEventListener("error", () => {
          icon.classList.remove("has-narrow-cover");
          image.remove();
        }, { once: true });
        image.src = book.coverThumbnail;
        icon.append(image);
      }
      const marker = document.createElement("span");
      marker.className = "book-marker";
      icon.append(marker);
      button.querySelector(".book-icon").classList.toggle("is-started", started);
      button.querySelector(".book-icon").classList.toggle("is-completed", completed);
      button.setAttribute("aria-label", `${book.title}${completed ? ", finished" : started ? ", started" : ""}`);
      button.querySelector(".book-title").textContent = book.title;
      const author=button.querySelector(".book-author");
      author.textContent=book.author||"";author.hidden=!book.author;
      const fileFormat = String(book.format || "txt").toUpperCase();
      button.querySelector(".book-subtitle").textContent = describeLibraryBook(book);
      if(book.missingContent) {
        row.classList.add('is-missing');
        button.querySelector('.book-arrow').className = 'book-arrow';
        button.querySelector('.book-arrow').textContent = '↻';
        button.querySelector('.book-subtitle').textContent = 'Datei neu laden · ' + fileFormat;
        button.setAttribute('aria-label', `Datei für „${book.title}“ neu laden`);
        button.title = 'Reload the original file to continue reading';
      }
      // 08.11 (Alena): no trash in every row — «Bearbeiten» selects books; then the whole row selects instead of opening.
      row.dataset.bookId = book.id;
      const check = document.createElement("span");
      check.className = "book-check";
      check.setAttribute("aria-hidden", "true");
      check.addEventListener("click", () => { if (editing) toggleSelected(book.id); });
      button.addEventListener("click", () => editing ? toggleSelected(book.id) : openLibraryBook(book));
      row.append(check, button);
      $bookList.append(row);
    });
    listBooks = books;
    for (const id of [...selectedIds]) if (!books.some(book => book.id === id)) selectedIds.delete(id);
    applyLibraryView();
    if(libraryView==='shelf')$library.scrollTop=0;
    bookshelf.update([...books].reverse());
    if(libraryView!=='shelf')bookshelf.pause();
  }
  async function refreshBooks() {
    try {
      const books = await allBooks();
      renderBooks(books);
      $("library-status").textContent = "";
    } catch (error) {
      $("library-status").textContent = say("Local book storage is unavailable in this browser.");
      $("empty-library").hidden = false;
    }
  }
  function closeDeleteConfirm(restoreFocus = true) {
    if (deleting) return;
    $("delete-confirm").hidden = true;
    $library.inert = false;
    $("library-actions").inert = false;
    $("library-bulk").inert = false;
    $("reader").querySelector(".reader-header").inert = false;
    pendingDelete = null;
    if (restoreFocus && deleteTrigger?.isConnected) deleteTrigger.focus({ preventScroll:true });
    deleteTrigger = null;
  }
  $("cancel-delete").addEventListener("click", () => closeDeleteConfirm());
  $("confirm-delete").addEventListener("click", async () => {
    if (!pendingDelete || deleting) return;
    const { kind, books } = pendingDelete;
    deleting = true;
    clearTimeout(window.__readingSaveTimer);
    $("confirm-delete").disabled = true;
    $("cancel-delete").disabled = true;
    try {
      const db = await openDb();
      for (const book of books) {
        if (kind === "reset") {
          // Reading data only: the progress, marked words and chosen meanings go; the book keeps its title and author.
          const clean = { ...book };
          for (const field of window.BibliothekReadingData.fields) delete clean[field];
          delete clean.missingContent;
          await window.BibliothekReadingData.remove(book.id);
          await window.BibliothekReadingData.save(clean);
          continue;
        }
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(book.id);

          tx.oncomplete = resolve;
          tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not delete this book"));
        });
        await window.BibliothekReadingData.remove(book.id);
      }
      // Release the previous reader content as well as the persisted record.
      clearTimeout(window.__readingSaveTimer);
      currentBook = null;
      vocabularyHighlights.cancel();
      $text.replaceChildren();
      selectedWord = "";
      deleting = false;
      closeDeleteConfirm(false);
      editing = false;
      await refreshBooks();
      ($bookList.querySelector(".book-open") || addToggle).focus({ preventScroll:true });
      showToast(kind === "reset" ? (books.length === 1 ? "Zurückgesetzt." : `${books.length} Bücher zurückgesetzt.`) : (books.length === 1 ? "Gelöscht." : `${books.length} Bücher gelöscht.`));
    } catch (error) {
      deleting = false;
      closeDeleteConfirm();
      showToast(kind === "reset" ? "Das Zurücksetzen hat nicht geklappt. Bitte versuch es noch einmal." : "Das Löschen hat nicht geklappt. Bitte versuch es noch einmal.");
    } finally {
      $("confirm-delete").disabled = false;
      $("cancel-delete").disabled = false;
    }
  });
  $("delete-confirm").addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); closeDeleteConfirm(); }
    if (event.key === "Tab") {
      event.preventDefault();
      if (!deleting) (document.activeElement === $("cancel-delete") ? $("confirm-delete") : $("cancel-delete")).focus();
    }
  });
  function splitParagraphs(content) { return String(content || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); }
  function hasChapters(book) { return Array.isArray(book?.chapters) && book.chapters.length > 0; }
  function prepareChapterPosition(book) {
    if (!hasChapters(book)) return;
    // EPUBs imported before chapter navigation saved a flat paragraph offset.
    if (!Number.isInteger(book.chapterIndex)) {
      let offset = Math.max(0, Number(book.position) || 0), index = 0;
      while (index < book.chapters.length - 1 && offset >= book.chapters[index].paragraphs.length) offset -= book.chapters[index++].paragraphs.length;
      book.chapterIndex = index;
      book.chapterPositions = { [index]: offset };
    }
    book.chapterIndex = Math.max(0, Math.min(book.chapterIndex, book.chapters.length - 1));
    book.chapterPositions ||= {};
    book.position = Math.max(0, Math.min(Number(book.chapterPositions[book.chapterIndex]) || 0, book.chapters[book.chapterIndex].paragraphs.length - 1));
  }
  function visibleParagraph() {
    return pagination.location?.paragraph ?? (Number(currentBook?.position) || 0);
  }
  function contentsFor(book) {
    return book.contents?.length ? book.contents : book.chapters.map((chapter, chapterIndex) => ({ title: chapter.title, chapterIndex, paragraph: 0, depth: 0, navigable: true }));
  }
  function readingEntries(book) {
    const seen = new Set();
    return contentsFor(book).filter(entry => {
      const key = `${entry.chapterIndex}:${entry.paragraph}`;
      if (!entry.navigable || seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => a.chapterIndex - b.chapterIndex || a.paragraph - b.paragraph);
  }
  function activeEntry(book) {
    return readingEntries(book).filter(entry => entry.chapterIndex < book.chapterIndex || (entry.chapterIndex === book.chapterIndex && entry.paragraph <= book.position)).at(-1);
  }
  function entryKey(entry) { return `${entry.chapterIndex}:${entry.paragraph}`; }
  function rememberEntry(book, position) {
    if (!hasChapters(book)) return;
    const entry = activeEntry(book);
    if (entry) { book.contentsPositions ||= {}; book.contentsPositions[entryKey(entry)] = position; }
  }
  async function navigateTo(entry, restore = false, focus = true) {
    const book = currentBook;
    if (switchingChapter || !entry?.navigable) return;
    switchingChapter = true;
    try {
      closePopups(); clearTimeout(window.__readingSaveTimer);
      const position = restoringPosition ? book.position : visibleParagraph();
      rememberEntry(book, position);
      await updateProgress(book, position);
      book.chapterIndex = entry.chapterIndex;
      book.chapterPositions ||= {};
      const entries = readingEntries(book), next = entries[entries.findIndex(item => entryKey(item) === entryKey(entry)) + 1];
      const end = next?.chapterIndex === entry.chapterIndex ? next.paragraph : book.chapters[entry.chapterIndex].paragraphs.length;
      const saved = book.contentsPositions?.[entryKey(entry)];
      const legacySaved = !book.contents ? book.chapterPositions[entry.chapterIndex] : undefined;
      book.position = restore ? Math.max(entry.paragraph, Math.min(Number(saved ?? legacySaved ?? entry.paragraph), end - 1)) : entry.paragraph;
      book.chapterPositions[book.chapterIndex] = book.position;
      book.tokenOffset = restore ? Number(book.contentsOffsets?.[entryKey(entry)]) || 0 : 0;
      renderBookText(book);
      const heading = $("book-headline").hidden ? $text.firstElementChild : $("book-headline");
      if (focus && heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      await updateProgress(book, book.position);
    } finally { switchingChapter = false; }
  }
  const contentsDialog = $("contents-dialog");
  // Prefix totals make chapter boundaries cheap to count, including shared EPUB files.
  const contentsWordCounts = new WeakMap();
  function wordCountsFor(book) {
    if (contentsWordCounts.has(book)) return contentsWordCounts.get(book);
    const prefixes = book.chapters.map(chapter => {
      const sums = [0];
      for (const paragraph of chapter.paragraphs) {
        sums.push(sums.at(-1) + (paragraph.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) || []).length);
      }
      return sums;
    });
    const entries = readingEntries(book), counts = new Map();
    entries.forEach((entry, index) => {
      const next = entries[index + 1];
      let count = 0;
      for (let file = entry.chapterIndex; file <= (next?.chapterIndex ?? prefixes.length - 1); file++) {
        const sums = prefixes[file];
        const start = file === entry.chapterIndex ? entry.paragraph : 0;
        const end = next?.chapterIndex === file ? next.paragraph : sums.length - 1;
        count += (sums[end] ?? sums.at(-1)) - (sums[start] ?? 0);
      }
      counts.set(entryKey(entry), count);
    });
    contentsWordCounts.set(book, counts);
    return counts;
  }
  let contentsClosing = false;
  async function closeContents(prepare) {
    if (!contentsDialog.open || contentsClosing) return;
    contentsClosing = true;
    contentsDialog.classList.remove("is-opening");
    const preparation = typeof prepare === "function" ? prepare() : Promise.resolve();
    if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
      contentsDialog.classList.add("is-closing");
      await Promise.all([preparation, ...contentsDialog.getAnimations({subtree:true}).map(animation => animation.finished.catch(() => {}))]);
    }
    await preparation;
    await new Promise(resolve => { contentsDialog.addEventListener("close", resolve, {once:true}); contentsDialog.close(); });
    contentsDialog.classList.remove("is-closing");
    contentsClosing = false;
  }
  function renderContents() {
    const active = activeEntry(currentBook);
    const counts = wordCountsFor(currentBook);
    const list = $("contents-list"); list.replaceChildren();
    for (const entry of contentsFor(currentBook)) {
      const row = document.createElement(entry.navigable ? "button" : "div");
      row.className = "contents-entry"; row.style.setProperty("--depth", Math.min(entry.depth || 0, 4));
      const title = document.createElement("span"); title.textContent = entry.title; row.append(title);
      const count = entry.navigable ? counts.get(entryKey(entry)) : 0;
      if (count) {
        const words = document.createElement("span");
        words.className = "contents-word-count";
        words.textContent = count.toLocaleString("de-DE").replace(/\./g, "\u202f");
        words.setAttribute("aria-label", `${count} Wörter`);
        row.append(words);
      }
      if (entry.navigable) {
        row.type = "button";
        if (active && entryKey(entry) === entryKey(active)) {
          row.setAttribute("aria-current", "location");
        }
        row.addEventListener("click", async () => {
          if (contentsClosing) return;
          await closeContents(() => navigateTo(entry, true, false));
          const heading = $("book-headline").hidden ? $text.firstElementChild : $("book-headline");
          if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
        });
      } else row.classList.add("contents-group");
      list.append(row);
    }
    $("contents-empty").hidden = Boolean(list.children.length);
  }
  $("contents-toggle").addEventListener("click", () => {
    closePopups();
    $("contents-book-title").textContent = currentBook.title;
    updateDrawerTop(); renderContents(); contentsDialog.showModal(); contentsDialog.classList.add("is-opening");
    const active = $("contents-list").querySelector('[aria-current]');
    if (active) { active.scrollIntoView({ block: "center" }); }
  });
  $("contents-close").addEventListener("click", closeContents);
  contentsDialog.addEventListener("cancel", event => { event.preventDefault(); closeContents(); });
  contentsDialog.addEventListener("close", () => {
    $("contents-toggle").focus({ preventScroll: true });
  });
  contentsDialog.addEventListener("click", event => { if (event.target === contentsDialog) {
    const bounds = contentsDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeContents();
  } });
  function renderChapterNavigation(book) {
    $("contents-toggle").hidden = !hasChapters(book);
    $("chapter-progress-track").hidden = !hasChapters(book);
    const end = $("chapter-end"); end.replaceChildren(); end.hidden = false; end.classList.remove("is-book-end"); end.style.height = "";
    const entries = hasChapters(book) ? readingEntries(book) : [], active = hasChapters(book) ? activeEntry(book) : null, index = entries.indexOf(active);
    // 09.11 (Alena): the end of a chapter — a card with the next chapter's title (variant Б); the end of the book — the
    // carmine ribbon, «Ende» and «Das war die letzte Seite.», no button: the book is marked as read by reaching it.
    if (entries[index + 1]) {
      const next = document.createElement("button"); next.id = "next-chapter"; next.className = "next-chapter-card"; next.type = "button";
      const label = document.createElement("small"), title = document.createElement("b"), chev = document.createElement("span");
      label.textContent = "Nächstes Kapitel"; title.textContent = entries[index + 1].title; title.lang = "de";
      chev.className = "ui-chev ui-chev-lone"; chev.setAttribute("aria-hidden", "true");
      next.append(label, title, chev);
      next.setAttribute("aria-label", "Nächstes Kapitel: " + entries[index + 1].title); next.addEventListener("click", () => navigateTo(entries[index + 1])); end.append(next);
    } else {
      end.classList.add("is-book-end");
      // the end page: the carmine ribbon, «Ende» and one line; the book counts as read on reaching it (updateBookmarkStatus)
      const box = document.createElement("div"); box.className = "book-end";
      const mark = document.createElement("span"); mark.className = "book-end-ribbon"; mark.setAttribute("aria-hidden", "true");
      const heading = document.createElement("h3"); heading.textContent = "Ende"; heading.lang = "de";
      const line = document.createElement("p"); line.textContent = "Das war die letzte Seite."; line.lang = "de";
      box.append(mark, heading, line); end.append(box);
    }

  }
  // Book layout beside the text (12.11.2026, D16 / D23): paragraphLayout.lineBreaks are offsets of spaces that were
  // <br> in the EPUB — the space stays in the text (textContent is the sentence the resolver reads) and a <br> follows
  // it; paragraphLayout.marks ({start, end, kind}) wrap their characters in <span class="book-mark book-<kind>">, also
  // inside a word button (an emphasised part of a word). Offsets, highlights and bookmarks are unchanged; a break that
  // would fall inside a word button is skipped.
  const BOOK_MARK_KINDS = new Set(["i", "b", "spaced", "sc", "small", "noteref"]);
  function appendLaidOut(parent, token, start, marks, breaks, stanzas = []) {
    const end = start + token.length, cuts = new Set([0, token.length]);
    const own = marks.filter(m => m.start < end && m.end > start);
    for (const m of own) { if (m.start > start) cuts.add(m.start - start); if (m.end < end) cuts.add(m.end - start); }
    for (const offset of breaks) if (offset >= start && offset < end && token[offset - start] === " ") cuts.add(offset - start + 1);
    const points = [...cuts].sort((x, y) => x - y);
    for (let i = 0; i + 1 < points.length; i++) {
      const from = points[i], to = points[i + 1], text = token.slice(from, to);
      const kinds = own.filter(m => m.start <= start + from && m.end >= start + to).map(m => m.kind);
      if (kinds.length) {
        const mark = document.createElement("span");
        mark.className = ["book-mark", ...new Set(kinds)].map((k, j) => j ? `book-${k}` : k).join(" ");
        mark.textContent = text;
        // A footnote reference (D24 step 2): a number or mark opens the note on tap; a reference on a word (an
        // annotation link) is only underlined, so the word stays a word button.
        const note = own.find(m => m.kind === "noteref" && m.start <= start + from && m.end >= start + to);
        if (note) {
          mark.dataset.noteTarget = note.target;
          if (/[\p{L}]/u.test(token)) mark.classList.add("book-noteref-word");
          else { mark.tabIndex = 0; mark.setAttribute("role", "button"); mark.setAttribute("aria-label", `Anmerkung ${text.replace(/[\[\]]/g, "")}`); }
        }
        parent.append(mark);
      } else parent.append(document.createTextNode(text));
      if (breaks.includes(start + to - 1) && token[to - 1] === " ") {
        parent.append(document.createElement("br"));
        // An empty line between stanzas (two <br> in the book).
        if (stanzas.includes(start + to - 1)) parent.append(document.createElement("br"));
      }
    }
  }
  function wrapParagraph(paragraph, layout = null) {
    const fragment = document.createDocumentFragment();
    const tokens = window.BibliothekLemmaResolver.readerSegments(paragraph);
    const breaks = Array.isArray(layout?.lineBreaks) ? layout.lineBreaks : [];
    const stanzas = Array.isArray(layout?.stanzaBreaks) ? layout.stanzaBreaks : [];
    const marks = Array.isArray(layout?.marks) ? layout.marks.filter(m => BOOK_MARK_KINDS.has(m?.kind) && m.end > m.start) : [];
    let tokenOffset = 0;
    tokens.forEach(token => {
      if (/^[\p{L}\p{M}]/u.test(token)) {
        const span = document.createElement("span");
        span.className = "reading-word";
        span.dataset.tokenOffset = String(tokenOffset);
        if (marks.length) appendLaidOut(span, token, tokenOffset, marks, []);
        else span.textContent = token;
        span.tabIndex = 0;
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", `${token}, tap for translation`);
        fragment.append(span);
      } else if (breaks.length || marks.length) appendLaidOut(fragment, token, tokenOffset, marks, breaks, stanzas);
      else fragment.append(document.createTextNode(token));
      tokenOffset += token.length;
    });
    return fragment;
  }
  // Indented lines (D24 step 3b): a shaped poem («Alice», the mouse tail) or verse lines with indents. Each line of
  // the paragraph goes into its own block span (the <br> between lines go; no text is added or removed, so textContent
  // and word offsets stay) with its left margin: the smallest indent is taken off and, on a narrow screen, the indents
  // shrink together so the widest one still leaves room for the line. A line that wraps hangs under its first word.
  function indentLines(p, layout) {
    const list = layout?.lineIndents;
    if (!Array.isArray(list) || list.length !== (layout.lineBreaks?.length || 0) + 1 || !list.every(Number.isFinite)) return;
    if (layout.align === "center" || layout.align === "right") return;
    const low = Math.min(...list), range = Math.max(...list) - low;
    if (!(range > 0)) return;
    // Split the children at runs of <br>; a run of two or more is an empty line before the next line.
    const lines = [{ nodes: [], gap: false }];
    let run = 0;
    for (const node of [...p.childNodes]) {
      if (node.nodeName === "BR") { run++; continue; }
      if (run) { lines.push({ nodes: [], gap: run >= 2 }); run = 0; }
      lines.at(-1).nodes.push(node);
    }
    if (lines.length !== list.length) return;
    p.classList.add("book-indented");
    p.style.setProperty("--book-indent-range", String(range));
    p.replaceChildren(...lines.map((line, i) => {
      const span = document.createElement("span");
      span.className = line.gap ? "book-line book-line-gap" : "book-line";
      span.style.setProperty("--book-indent", String(list[i] - low));
      span.append(...line.nodes);
      return span;
    }));
  }
  function renderBookText(book) {
    prepareChapterPosition(book);
    const request = ++renderRequest;
    const paragraphs = hasChapters(book) ? book.chapters[book.chapterIndex].paragraphs : splitParagraphs(book.content);
    $text.replaceChildren();
    const entries = hasChapters(book) ? readingEntries(book) : [], active = hasChapters(book) ? activeEntry(book) : null;
    const next = active ? entries[entries.indexOf(active) + 1] : null;
    const start = active && active.chapterIndex === book.chapterIndex ? active.paragraph : 0;
    const end = next && next.chapterIndex === book.chapterIndex ? next.paragraph : paragraphs.length;
    paragraphs.forEach((paragraph, i) => {
      if (i < start || i >= end) return;
      const kind = hasChapters(book) ? book.chapters[book.chapterIndex].paragraphKinds?.[i] : "p";
      const p = document.createElement(/^h[1-6]$/.test(kind || "") ? kind : "p");
      p.dataset.paragraph = String(i);
      const layout = hasChapters(book) ? book.chapters[book.chapterIndex].paragraphLayout?.[i] : null;
      if (layout?.align === "center" || layout?.align === "right") p.classList.add(`book-align-${layout.align}`);
      // Paragraph layout from the EPUB (D23 step 2): scene break, quotation / letter, verse lines of a poem.
      for (const [field, name] of [["gapBefore", "book-gap-before"], ["quote", "book-quote"], ["quoteEnd", "book-quote-end"], ["verse", "book-verse-line"], ["stanzaStart", "book-stanza-start"], ["verseEnd", "book-verse-end"], ["pre", "book-pre"], ["note", "book-note"], ["noteStart", "book-note-start"]]) if (layout?.[field] === true) p.classList.add(name);
      if (layout?.lineBreaks?.length) p.classList.add("book-has-breaks");
      // List items (D24 step 3): indent by depth, the number or bullet drawn by CSS from data-marker.
      if (layout?.list && Number.isInteger(layout.list.depth) && layout.list.depth > 0) {
        p.classList.add("book-li");
        p.style.setProperty("--book-list-depth", String(Math.min(layout.list.depth, 6)));
        if (typeof layout.list.marker === "string" && layout.list.marker) p.dataset.marker = layout.list.marker;
      }
      p.append(wrapParagraph(paragraph, layout));
      indentLines(p, layout);
      $text.append(p);
    });
    currentBook = book;
    refreshHighlights();
    renderChapterNavigation(book);
    vocabularyPanel.updateCount();
    $("book-headline").textContent = active?.title || (hasChapters(book) ? book.chapters[book.chapterIndex].title : book.title);
    // EPUB chapter titles belong to the book text, where words remain interactive.
    $("book-headline").hidden = hasChapters(book);
    $("toolbar-title").textContent = book.title;
    $("toolbar-title").title = book.title;
    $("reader").querySelector(".reader-header").hidden = true;
    $library.hidden = true;
    $("library-actions").hidden = true;
    document.body.classList.remove("library-screen");
    $reading.hidden = false;
    setProgress();
    const saved = {paragraph:Math.max(0, Number(book.position) || 0), tokenOffset:Number(book.tokenOffset) || 0, end:restoreLastPage};
    restoreLastPage = false;
    restoringPosition = true;
    window.scrollTo({ top:0, behavior:"instant" });
    pagination.layout(saved);
    requestAnimationFrame(() => {
      if (request !== renderRequest || currentBook !== book) return;
      pagination.layout(saved);
      restoringPosition = false;
    });
  }
  function setProgress() {
    if (!currentBook) return;
    if (!hasChapters(currentBook)) return;
    const atEnd = pagination.page === pagination.count - 1;
    $("chapter-progress-fill").style.width = `${atEnd ? 100 : pagination.count > 1 ? pagination.page / pagination.count * 100 : 0}%`;
  }
  // Speed (BIBLIOTHEK_SPEED_TODO_RU.md, item 2): prepare the separable-verb index while the
  // reader looks at the first page, so the first tap does not wait for it. A tap that comes
  // earlier simply shares the same preparation inside the resolver; failures stay silent and
  // the next book opening tries again.
  let separableWarmup = false;
  function warmUpLookup() {
    if (separableWarmup || navigator.connection?.saveData) return;
    separableWarmup = true;
    const start = () => loadDictionary().then(() => lemmaResolver?.prepareSeparable?.())
      .catch(() => { separableWarmup = false; });
    const idle = window.requestIdleCallback ? fn => window.requestIdleCallback(fn, {timeout:2000}) : fn => setTimeout(fn, 200);
    setTimeout(() => idle(start), 600);
  }
  async function openBook(book) {
    closePopups();
    renderBookText(book);
    lastOpenedBookId=book.id;
    try { localStorage.setItem("deutschLibraryLastOpenedV1",book.id); } catch (_) {}
    document.title = `${book.title} · Bibliothek`;
    warmUpLookup();
  }
  let lemmaResolver = null, selectedResolution = null;
  const usageNote = candidate => candidate?.usage?.role === "nominalized"
    ? `${candidate.usage.kind === "person"
      ? locale() === "ru" ? "Субстантивация · обозначение человека" : "Nominalization · person"
      : candidate.usage.kind === "adjective" ? locale() === "ru" ? "Субстантивированное прилагательное" : "Nominalized adjective"
      : locale() === "ru" ? "Субстантивированный инфинитив" : "Nominalized infinitive"} · ${candidate.usage.base}${candidate.usage.number === "plural" ? locale() === "ru" ? " · множественное число" : " · plural" : ""}`
    : candidate?.usage?.role === "attributive"
    ? `${candidate.usage.form} · ${window.BibliothekMeaningDisplay.participleName(candidate.usage) || (locale() === "ru" ? "прилагательное" : "adjective")} (${candidate.usage.base}) · ${locale() === "ru" ? "определение к" : "modifier of"} ${candidate.usage.head}` : "";
  // Dictionary entry by id, or by word and reader type (help for am + Superlativ, contractions, "From …" lines).
  function findEntry({id, word, type} = {}) {
    if (!dictionary) return null;
    if (id) { const byId = dictionary.find(entry => entry.id === id); if (byId) return byId; }
    if (!word) return null;
    const key = String(word).toLowerCase();
    const types = type === "Adjektiv" ? ["Adjektiv","Adverb"] : [type];
    return dictionary.find(entry => types.includes(entry.type) && String(entry.word || "").toLowerCase() === key) || null;
  }
  async function loadDictionary() {
    if (dictionary) return dictionary;
    if (dictionaryPromise) return dictionaryPromise;
    // 07.11.2026: through the reader's data cache (resolver/data-cache.js), without it — plain fetch
    const dataFetch = (input, options) => (window.BibliothekDataCache ? window.BibliothekDataCache.fetch(input, options) : fetch(input, options));
    // 08.11.2026 (speed chat): the reader loads worterbuch/reader/ — the cards without their examples and notes (built from
    // worterbuch/german-*.json by dev/bibliothek/scripts/build-reader-dictionaries.cjs, same version); the details come with
    // the reference card (ensureCardDetails). A file in the old form (a list of cards) is read as before.
    const versionOf = path => path === "german-function-words.json" ? "20261112-wn-fix85-1" : path === "german-verbs.json" ? "20261114-wn-lassen104-1" : path === "german-nouns.json" ? "20261112-wn-fix85-1" : ["german-adjectives.json","german-adjective-adverbs.json"].includes(path) ? "20261112-wn-twins98-2" : path === "german-adverbs.json" ? "20261112-wn-old91-1" : path === "german-expressions.json" ? "20261112-wn-expr101-1" : path === "german-pronouns.json" ? "20261107-wn-weniger56-1" : path === "german-numerals.json" ? "20261018-c21b-1" : ["german-conjunctions.json","german-prepositions.json"].includes(path) ? "20261114-wn-jedoch106-1" : "20261011-um-zu-en-1";
    const get = path => dataFetch(`../worterbuch/reader/${path}?v=${versionOf(path)}`).then(r => { if (!r.ok) throw new Error("dictionary load failed"); return r.json(); })
      .then(data => { if (Array.isArray(data)) return data;
        if (data?.format_version !== 1 || !Array.isArray(data.entries) || !(data.details_parts >= 1)) throw new Error("dictionary load failed");
        const where = {base:`../worterbuch/reader/${path.replace(/\.json$/u, "")}-details/`, parts:data.details_parts, version:versionOf(path)};
        for (const card of data.entries) cardDetailsSource.set(String(card.id), where);
        return data.entries; });
    // Function-word cards (articles, prepositions, numerals, single words) keep
    // their own types; single words map to the existing reader types.
    const functionWordType = {adverb:"Adverb",adjective:"Adjektiv",particle:"particle"};
    dictionaryPromise = Promise.all([get("german-nouns.json"),get("german-verbs.json"),get("german-adjectives.json"),get("german-adverbs.json"),get("german-conjunctions.json"),get("german-pronouns.json"),get("german-adjective-adverbs.json"),
      get("german-articles.json"),get("german-prepositions.json"),get("german-numerals.json"),get("german-function-words.json"),
      // E1 (22.10.2026): expression cards (vor sich hin) — type «Ausdruck», found only through their `match`; a missing file is no expressions.
      get("german-expressions.json").catch(() => [])])
      .then(([nouns,verbs,adjectives,adverbs,conjunctions,pronouns,adjectiveAdverbs,articles,prepositions,numerals,functionWords,expressions]) => {
        dictionary = [
          ...nouns.map(x => ({ ...x, word:x.word, type:"Nomen" })),
          ...verbs.map(x => ({ ...x, word:x.infinitive, type:"Verb" })),
          ...adjectives.map(x => ({ ...x, type:"Adjektiv" })),
          ...adverbs.map(x => ({ ...x, type:"Adverb" })),
          ...adjectiveAdverbs.map(x => ({ ...x, type:"Adjektiv" })),
          ...conjunctions.map(x => ({ ...x, type:"Konjunktion" })),
          ...pronouns.map(x => ({ ...x, type:"Pronomen" })),
          ...articles.map(x => ({ ...x, type:"article" })),
          ...prepositions.map(x => ({ ...x, type:"preposition" })),
          ...numerals.map(x => ({ ...x, type:"numeral" })),
          ...functionWords.map(x => ({ ...x, type:functionWordType[x.type] || x.type })),
          ...expressions.map(x => ({ ...x, type:"Ausdruck" }))
        ];
        lemmaResolver = window.BibliothekLemmaResolver.create(dictionary, window.DeutschFallbackDictionary);
        return dictionary;
      }).catch(error => { dictionaryPromise = null; throw error; });
    return dictionaryPromise;
  }
  let lookupRequest = 0, refreshPopupLanguage = null;
  function updateReaderLanguage() {
      applyLibraryTexts();
      refreshPopupLanguage?.();
  }
  function reflexiveAnchor(candidate, context) {
    const group = candidate?.construction;
    if (!context || group?.id !== "reflexive-verb") return context;
    const offset = group.spans[0].start;
    return {...context,tokenOffset:offset,location:{...context.location,
      tokenOffset:context.location.tokenOffset-context.tokenOffset+offset}};
  }
  let popupPlacement = null, popupAnchor = null, popupExpansion = null;
  function positionWordPopup(anchor) {
    if (!anchor || $popover.hidden) return;
    const gap = 8, edge = 12;
    const viewportHeight = window.innerHeight;
    const spaceAbove = Math.max(0, anchor.top - gap - edge);
    const spaceBelow = Math.max(0, viewportHeight - anchor.bottom - gap - edge);
    if (!popupPlacement) {
      // Estimate the finished card without delaying lookup or enlarging the loader.
      const expectedHeight = Math.min(320, viewportHeight - edge * 2);
      popupPlacement = spaceAbove >= expectedHeight ? "above" : "below";
      // Near the bottom, use the larger side if neither fits the expected card.
      if (spaceAbove < expectedHeight && spaceBelow < expectedHeight && spaceAbove > spaceBelow) popupPlacement = "above";
    }
    popupAnchor = anchor;
    const availableHeight = popupPlacement === "above" ? spaceAbove : spaceBelow;
    $popover.style.maxHeight = `${availableHeight}px`;
    fitTranslation(availableHeight);
    const box = $popover.getBoundingClientRect();
    const left = Math.max(edge, Math.min(window.innerWidth - box.width - edge, anchor.left + anchor.width / 2 - box.width / 2));
    const top = popupPlacement === "above" ? anchor.top - box.height - gap : anchor.bottom + gap;
    $popover.style.left = `${left}px`;
    $popover.style.top = `${Math.max(edge, top)}px`;
    $popover.dataset.placement = popupPlacement;
  }
  // G57 (user 24.10.2026): only the meanings scroll inside the popup (heading and buttons stay); a fade at the bottom while
  // more of them is below.
  // G57 (review 24.10.2026, 320 px): when the card has less room than usual (placed above a word in the middle of a small
  // screen), the meanings block shrinks to the room left — not the whole card scrolls — so the heading and «Словарная справка»
  // stay in view. Never below three lines; with even less room the card scrolls as a whole, as before.
  function fitTranslation(availableHeight) {
    const c = $("popover-translation");
    c.style.maxHeight = "";
    const style = getComputedStyle($popover), outer = style.boxSizing === "border-box" ? 0 :
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const rest = $popover.scrollHeight + ($popover.offsetHeight - $popover.clientHeight) - c.offsetHeight;
    const room = availableHeight + outer - rest, max = parseFloat(getComputedStyle(c).maxHeight), line = parseFloat(getComputedStyle(c).lineHeight) || 22;
    if (Number.isFinite(max) && room < max) c.style.maxHeight = `${Math.max(Math.ceil(line * 3), Math.floor(room))}px`;
  }
  function updateTranslationFade() {
    const c = $("popover-translation");
    c.classList.toggle("has-more-below", c.scrollHeight - c.clientHeight - c.scrollTop > 2);
  }
  $("popover-translation").addEventListener("scroll", updateTranslationFade, {passive:true});
  // 09.11 (Alena): a tap on the word of the popover reads it aloud — with a German voice only (components/deutsch-voice-v1.js);
  // without one on the device the word is plain text, as before. Only the word is read: «der Holzhacker = Holz + Hacker» up
  // to the «=», «hinaus- + eilen» (the particle stands apart in the text) as one verb, «so … dass» without the dots.
  function spokenHeading(text) {
    return String(text || "").split("=")[0].replace(/\(\s*$/u, "").replace(/-\s*\+\s*/gu, "").replace(/…/gu, " ")
      .replace(/\s+/gu, " ").trim();
  }
  const syncSpeakable = available => $("popover-word").classList.toggle("can-speak", available);
  if (window.DeutschVoice) {
    syncSpeakable(window.DeutschVoice.available());
    window.DeutschVoice.onChange(syncSpeakable);
  }
  $("popover-word").addEventListener("click", () => {
    window.DeutschVoice?.speak(spokenHeading($("popover-word").textContent));
  });
  // Keep the same word-facing edge when translations or expanded notes resize it.
  new ResizeObserver(() => { updateTranslationFade(); if (!popupExpansion) positionWordPopup(popupAnchor); }).observe($popover);
  async function openWordPopup(word, anchor) {
    const request = ++lookupRequest;
    popupExpansion?.cancel();
    popupExpansion = null;
    popupPlacement = null;
    popupAnchor = anchor;
    refreshPopupLanguage = null;
    $("popover-bookmark").disabled = true; $("popover-bookmark").hidden = false;
    $("popover-bookmark").setAttribute("aria-pressed", "false");
    selectedEntry = null;
    selectedResolution = null;
    activePronouns = [];
    partEntries = []; detailParts = [];
    popupAmbiguous = true;
    const context = selectedContext;
    $("popover-word").textContent = word;
    $("popover-grammar").textContent = ""; $("popover-grammar").hidden = true;
    const loading = document.createElement("span");
    loading.className = "popover-loading";
    loading.setAttribute("role", "status");
    const renderLoading = () => loading.setAttribute("aria-label", locale() === "ru" ? "Ищем значение слова" : "Looking up word");
    renderLoading();
    refreshPopupLanguage = renderLoading;
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      loading.append(dot);
    }
    $("popover-translation").replaceChildren(loading);
    $("popover-translation").scrollTop = 0; $("popover-translation").classList.remove("has-more-below");
    for (const id of ["popover-more", "popover-source", "popover-form-notes", "popover-alternatives"]) $(id).hidden = true;
    $("popover-form-notes").ontoggle = null;
    $("popover-choices").replaceChildren();
    $popover.setAttribute("aria-busy", "true");
    $popover.hidden = false;
    positionWordPopup(anchor);
    try { await loadDictionary(); }
    catch (error) {
      // Fallback lookup remains usable when the main database fails to load.
      lemmaResolver = window.BibliothekLemmaResolver.create([], window.DeutschFallbackDictionary);
    }
    if (request !== lookupRequest) return;
    let resolution;
    try { resolution = await lemmaResolver.resolve(word, context); }
    catch (error) { resolution = {candidates:[], selected:null, status:"unresolved", unresolvedMeanings:[], error}; }
    if (request !== lookupRequest) return;
    const linkedReflexive = resolution.candidates.find(c=>c.construction?.id === "reflexive-verb");
    let saved = null;
    try { saved = context ? await window.BibliothekMeaningSelections.get(context) : null; } catch (_) {}
    if (context && linkedReflexive) {
      const groupSaved = await window.BibliothekMeaningSelections.get(reflexiveAnchor(linkedReflexive,context)).catch(()=>null);
      if (saved === window.BibliothekVocabulary.identity(linkedReflexive) && groupSaved && groupSaved !== saved) saved = null;
    }
    const restored = saved ? window.BibliothekLemmaResolver.savedCandidate(saved, resolution) : null;
    if (restored) resolution.selected = restored;
    // A reading the reader chose (now or earlier) is shown as established, tentative or not.
    let userConfirmed = !!restored;
    if (request !== lookupRequest) return;
    const reference=window.BibliothekPronounReference;
    const pronounCandidates=[...resolution.candidates,...lemmaResolver.match(word)].filter(reference.isPronoun).filter((candidate,index,all)=>all.findIndex(other=>other.dictionaryId===candidate.dictionaryId)===index);
    // G65 (24.10.2026): a pronoun record whose recorded construction was found (was für ein) shows that construction (or the choice
    // between it and the word's own reading, split_choice), not the summary.
    // (L15 step 4, reference F12-B5j: uns of lass uns — the card of wir «нас» in the lassen group, not the summary)
    let showPronounSummary=pronounCandidates.length>0 && !resolution.candidates.some(c=>["recorded-construction","lassen-infinitive"].includes(c.construction?.id)) && (reference.isPronoun(resolution.selected) ||
      !resolution.selected && !resolution.candidates.some(c=>c.pos==='article'));
    // G34 (21.10.2026): what the resolver itself chose — pronounCandidates[0] below is only a heading fallback.
    const resolverChosePronoun = reference.isPronoun(resolution.selected);
    if(showPronounSummary && !reference.isPronoun(resolution.selected))resolution.selected=pronounCandidates[0];
    popupAmbiguous = resolution.status === "ambiguous" && !resolution.selected;
    selectedResolution = resolution.selected;
    selectedEntry = resolution.selected?.item || null;
    $("popover-word").textContent = resolution.selected
      ? `${selectedEntry?.article ? selectedEntry.article + " " : ""}${resolution.selected.lemma}` : word;
    const content = $("popover-translation");
    content.replaceChildren();
    $("popover-more").hidden = !selectedEntry;
    $("popover-source").hidden = !resolution.candidates.some(candidate => candidate.source === "fallback");
    const notes = $("popover-form-notes"), noteText = $("popover-form-note-text");
    const visibleNotes = []; // Word-form records stay out of the compact popup.
    notes.hidden = !visibleNotes.length; notes.open = false;
    noteText.replaceChildren();
    for (const note of visibleNotes) {
      const text = document.createElement("p"); text.textContent = note.meanings.join(" · "); noteText.append(text);
    }
    const alternatives = $("popover-alternatives"), choices = $("popover-choices");
    alternatives.hidden = true;
    alternatives.open = !resolution.selected;
    choices.replaceChildren();
    // G57 (user 24.10.2026): «ещё N значений ↓» shows the hidden meanings here, in the popup (the card, or one line of a card of
    // parts); a new word, another variant or another language starts short again.
    let expandedMain = false;
    const expandedLines = new Set(), expandedParts = new Set();
    const moreLabel = (n, ru) => {
      const forms = n % 10 === 1 && n % 100 !== 11 ? "значение" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "значения" : "значений";
      return ru ? `ещё ${n} ${forms}` : `${n} more ${n === 1 ? "meaning" : "meanings"}`;
    };
    const expandAndKeepFocus = () => { renderSelection(); content.focus({preventScroll:true}); };
    const renderSelection = () => {
      const candidate = selectedResolution;
      const ru = locale() === "ru", display = window.BibliothekMeaningDisplay;
      activePronouns=showPronounSummary ? pronounCandidates : [];
      const referencePronoun = showPronounSummary;
      // Reflexive link of the clicked pronoun: shown only when the resolver confirmed it.
      const pronounLink = referencePronoun && linkedReflexive?.construction && linkedReflexive.construction.confidence !== "tentative" && !linkedReflexive.reflexiveUnconfirmed &&
        linkedReflexive.construction.verb && linkedReflexive.construction.pronoun ? linkedReflexive.construction : null;
      let model;
      if (referencePronoun) {
        // A possessive established before its noun (mein Buch) is that card alone (reference 4.3, A4).
        // G34 (21.10.2026): ihr before a noun is «её / их / Ваш» unless the resolver chose one card (Ihre mid-sentence → Ваш);
        // the fallback heading card is not a choice (it narrowed every ihre Sprüche to «её»).
        const possessiveRow = resolution.evidence === "possessive-before-noun";
        const possessives = pronounCandidates.filter(c => display.partOfSpeech(c) === "Possessivpronomen");
        // G50 step 2 (28.10.2026, reference F12-G13a / b, U-H22): der / die / das whose role the resolver established (B15, G50 —
        // the demonstrative «тот», das «это» via its form translation, or the relative «который») is that card alone, not the summary.
        // F12-G37b (14.11.2026): ihr the resolver read as the address «вы» (ihr lieben Kinder, ihr Herren — rule ihr-address) is that card alone too.
        const ihrAddress = resolverChosePronoun && resolution.decision?.rule === "ihr-address" && resolution.selected?.dictionaryId === "pronoun-007";
        const roleChosen = resolverChosePronoun && resolution.decision?.rule === "der-pronoun-role" && ["pronoun-037","pronoun-038"].includes(resolution.selected?.dictionaryId) || ihrAddress;
        const shown = (userConfirmed || roleChosen || possessiveRow && resolverChosePronoun && resolution.selected === candidate) && reference.isPronoun(candidate) ? [candidate] :
          possessiveRow && possessives.length ? possessives : pronounCandidates;
        const types = [...new Set(shown.map(c => display.partOfSpeech(c)))];
        const use = pronounLink ? "Reflexiv" : "";
        // the address card's own translation without its note: «вы (к нескольким людям на «ты»)» → «вы» (the form ihr is «вы / ей» across cards)
        const values = ihrAddress ? String(candidate.item?.[`translation_${locale()}`] || "").replace(/\s*\(.*$/u, "") : roleChosen ? candidate.formTranslation?.[locale()] || reference.brief([candidate],word,locale()).replace(/^[^·]*·\s*/u, "") :
          reference.brief(possessiveRow ? shown : pronounCandidates,word,locale()).replace(/^[^·]*·\s*/u, "");
        model = {heading:candidate?.contraction ? display.contractionHeading(candidate.contraction) : word, grammar:[pronounLink ? "Pronomen" : types.length === 1 ? types[0] : "Pronomen", use].filter(Boolean).join(" · "),
          text:values || display.NO_TRANSLATION[locale()], textLanguage:locale(), spans:pronounLink ? [pronounLink.verb, pronounLink.pronoun, ...(pronounLink.prefix ? [pronounLink.prefix] : [])] : null, helpEntry:selectedEntry,
          // A5: «здесь: друг друга» / «себя или друг друга» under the meaning.
          note:pronounLink?.interpretation ? pronounLink.note?.[locale()] || "" : ""};
      } else if (candidate) {
        model = display.card(resolution, candidate, {word, language:locale(), lookup:findEntry, confirmed:userConfirmed});
      } else if (!resolution.candidates.length && display.wholeCard?.(resolution, word, locale())) {
        // (advisor + user 10.11) a whole Russian record of a word nothing else knows (Russian interface only)
        model = display.wholeCard(resolution, word, locale());
      } else {
        model = {heading:word, grammar:"", spans:null, helpEntry:null, textLanguage:locale(),
          // G57 (user 24.10.2026): the choice window is the list of cards alone, without a «choose» line.
          text:resolution.candidates.length ? "" :
            resolution.error ? ru ? "Не удалось загрузить словарь. Попробуйте ещё раз." : "The dictionary could not be loaded. Please try again." :
            resolution.unresolvedMeanings.length ? `${ru ? "английский: " : ""}${resolution.unresolvedMeanings.join("; ")}` : display.NO_TRANSLATION[locale()]};
      }
      selectedEntry = model.helpEntry || null;
      partEntries = model.lines ? model.lines.map(l => l.helpEntry).filter((e, i, all) => e && all.findIndex(o => o?.id === e.id) === i) : [];
      $("popover-word").textContent = model.heading;
      const grammarLine = $("popover-grammar");
      grammarLine.textContent = model.grammar; grammarLine.hidden = !model.grammar;
      content.textContent = "";
      const full = (expandedMain || expandedLines.size || expandedParts.size) && candidate && !referencePronoun
        ? display.card(resolution, candidate, {word, language:locale(), lookup:findEntry, confirmed:userConfirmed, all:true}) : null;
      const shown = expandedMain && full && !model.lines ? full : model;
      const moreButton = (n, onClick) => {
        const more = document.createElement("button"); more.type = "button"; more.className = "popover-more-meanings";
        more.append(moreLabel(n, ru), "\u00a0", sideChevron()); more.setAttribute("aria-expanded", "false");
        more.addEventListener("click", onClick); return more;
      };
      // (user 07.11) a line of parts opens and closes with a chevron: down — «ещё N значений», up — collapse it again.
      // (design 08.11, Alena) «ещё N значений ›» — one sideways chevron, the shared .ui-chev; open — an up chevron (the word «свернуть» wrapped to its own line).
      const sideChevron = () => { const c = document.createElement("span"); c.className = "ui-chev"; c.setAttribute("aria-hidden", "true"); return c; };
      const collapseButton = onClick => { const b = document.createElement("button"); b.type = "button"; b.className = "popover-more-meanings popover-collapse";
        const label = ru ? "свернуть" : "collapse"; b.setAttribute("aria-expanded", "true");
        b.setAttribute("aria-label", label); b.title = label; b.append(chevron(true));
        b.addEventListener("click", onClick); return b; };
      const chevron = up => { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "popover-chevron"); svg.setAttribute("viewBox", "0 0 12 12"); svg.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", up ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"); svg.append(path); return svg; };
      const toggleButton = (n, open, text, onClick) => {
        if (open) return collapseButton(onClick);
        const button = document.createElement("button"); button.type = "button"; button.className = "popover-more-meanings";
        const label = moreLabel(n, ru);
        if (text) button.append(label, "\u00a0"); else { button.setAttribute("aria-label", label); button.title = label; }
        button.append(sideChevron()); button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", onClick); return button;
      };
      if (shown.segments) appendLabelSegments(content, shown.segments, shown.segmentPrefix);
      // G48 (23.10.2026): a word explained by its parts — every part on a line of its own. G57: a part with more meanings than the
      // two shown has «ещё N значений ↓», which opens the rest of that line here.
      else if (model.lines) model.lines.forEach((line, index) => {
        const open = expandedLines.has(index) && full?.lines?.[index];
        const row = document.createElement("span"); row.className = "popover-formation-line"; row.textContent = open ? full.lines[index].text : line.text;
        if (open) row.append("\u00a0", toggleButton(line.more, true, false, () => { expandedLines.delete(index); expandAndKeepFocus(); }));
        else if (line.more > 0) row.append(" ", toggleButton(line.more, false, true, () => { expandedLines.add(index); expandAndKeepFocus(); }));
        content.append(row);
      });
      else content.textContent = shown.text;
      // D13 / G57: meanings of a card beyond the short text (own: about three lines; external: two) open here, in the popup.
      if (!expandedMain && model.more > 0 && !model.lines) content.append(" ", moreButton(model.more, () => { expandedMain = true; expandAndKeepFocus(); }));
      else if (expandedMain && model.more > 0 && !model.lines) content.append("\u00a0", collapseButton(() => { expandedMain = false; expandAndKeepFocus(); }));
      if (model.note) {
        const note = document.createElement("small"); note.className = "popover-construction";
        note.textContent = model.note; content.append(note);
      }
      // (advisor 06.11) «состав»: an external word known only in English — its parts, one line each (the lines of the
      // «Kompositum» card); a part with more meanings than the two shown is a button that opens them in its line.
      if (model.composition) {
        const note = document.createElement("small"); note.className = "popover-construction popover-composition";
        note.append(model.composition.prefix);
        model.composition.lines.forEach((line, index) => {
          if (index) { const sep = document.createElement("span"); sep.className = "popover-composition-sep"; sep.textContent = " · "; note.append(sep); }
          const open = expandedParts.has(index) && full?.composition?.lines?.[index];
          const row = document.createElement("span"); row.className = "popover-composition-line";
          row.textContent = open ? full.composition.lines[index].text : line.text;
          // (user 07.11) a chevron at the end of the part, not an underlined line: down opens its meanings, up closes them
          if (open) row.append("\u00a0", toggleButton(line.more, true, false, () => { expandedParts.delete(index); expandAndKeepFocus(); }));
          else if (line.more > 0) row.append("\u00a0", toggleButton(line.more, false, false, () => { expandedParts.add(index); expandAndKeepFocus(); }));
          note.append(row);
        });
        content.append(note);
      }
      content.lang = model.textLanguage === "en" && !(ru && /^английский: /u.test(model.text)) ? "en" : locale();
      updateTranslationFade();
      $("popover-alternatives").querySelector("summary").textContent = ru ? "Другие значения" : "Other meanings";
      if (referencePronoun && linkedReflexive) {
        const link = document.createElement("button"); link.type = "button"; link.className = "lemma-choice reflexive-link";
        link.textContent = `${ru ? "Связанный глагол" : "Linked verb"}: ${linkedReflexive.lemma}`;
        link.addEventListener("click",()=>chooseCandidate(linkedReflexive)); content.append(link);
      }
      $("popover-more").hidden = !selectedEntry && !partEntries.length;
      $("popover-more").firstChild.textContent=showPronounSummary ? (ru ? "Справка о местоимениях " : "Pronoun reference ") : (ru ? "Словарная справка " : "Dictionary details ");
      $("popover-source").hidden = candidate ? candidate.source !== "fallback" && !(locale() === "ru" && candidate.wholeRu) : !resolution.unresolvedMeanings.length && !resolution.candidates.some(c => c.source === "fallback") && !(locale() === "ru" && resolution.wholeRu);
      if (notes.open && !notes.hidden) $("popover-source").hidden = false;
      paintActiveWord(candidate, referencePronoun || candidate?.construction || candidate?.prepositionLink || candidate?.compound ? model.spans : undefined);
      if(showPronounSummary)popupAmbiguous=false;
      // G57 (user 24.10.2026): no bookmark while no variant is chosen (it would save a word without a meaning).
      $("popover-bookmark").hidden = popupAmbiguous;
      renderChoices();
    };
    const chooseCandidate = async candidate => {
        if (request !== lookupRequest) return;
        showPronounSummary=reference.isPronoun(candidate) && candidate?.construction?.id !== "recorded-construction";
        popupAmbiguous = false; selectedResolution = candidate; selectedEntry = candidate.item || null; userConfirmed = true;
        expandedMain = false; expandedLines.clear(); expandedParts.clear();
        alternatives.open = false;
        $("popover-bookmark").disabled = true;
        renderSelection();
        // Keep choices reachable after selection; remember only this occurrence.
        try {
          if (context) {
            await window.BibliothekMeaningSelections.set(context, window.BibliothekVocabulary.identity(candidate));
            const logical = reflexiveAnchor(linkedReflexive,context);
            if (linkedReflexive) await window.BibliothekMeaningSelections.set(logical, window.BibliothekVocabulary.identity(candidate));
            const records = await window.BibliothekVocabulary.list(context.bookId);
            for (const record of records) {
              const found = record.occurrences.find(o => o.chapterIndex === context.location.chapterIndex && o.paragraphIndex === context.location.paragraphIndex &&
                (o.tokenOffset === context.location.tokenOffset || linkedReflexive && o.tokenOffset === logical.location.tokenOffset));
              if (found) await window.BibliothekVocabulary.resolveOccurrence(context.bookId, record.key, found, candidate, {...context,form:word});
            }
            refreshHighlights(); vocabularyPanel.updateCount();
          }
        } catch (_) { if (request === lookupRequest) showToast("Meaning selected, but the correction could not be saved."); }
        if (request === lookupRequest) refreshBookmark(request);
    };
    const renderChoices = () => {
      choices.replaceChildren();
      const displayed = window.BibliothekMeaningDisplay.alternatives(resolution, selectedResolution, locale()).filter(row=>!showPronounSummary || !reference.isPronoun(row.candidate));
      if(showPronounSummary)alternatives.open=false;
      alternatives.hidden = !displayed.length;
      alternatives.classList.toggle("is-choosing", popupAmbiguous && !showPronounSummary);
      const source = $("popover-source");
      const russianArticles = $("russian-source-articles");
      russianArticles.replaceChildren();
      if (locale() === "ru") {
        const entries = [selectedResolution,...displayed.map(row => row.candidate)]
          .flatMap(candidate => candidate?.russianTranslation?.entries || []);
        const urls = new Set();
        for (const entry of entries) {
          if (urls.has(entry.sourceUrl)) continue;
          urls.add(entry.sourceUrl);
          const link = document.createElement("a");
          link.href = entry.sourceUrl; link.target = "_blank"; link.rel = "noopener";
          link.textContent = `${entry.word} · Русский Викисловарь ↗`;
          const paragraph = document.createElement("p"); paragraph.append(link); russianArticles.append(paragraph);
        }
      }
      const mainUsesExternal = selectedResolution?.source === "fallback" ||
        !selectedResolution && !resolution.candidates.length && !!resolution.unresolvedMeanings.length ||
        notes.open && !notes.hidden;
      const alternativesUseExternal = displayed.some(row => row.candidate.source === "fallback");
      source.hidden = !mainUsesExternal && !alternativesUseExternal;
      if (mainUsesExternal) $popover.insertBefore(source, $("popover-more"));
      else alternatives.append(source);
      displayed.forEach(({candidate, text, language, segments}) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "lemma-choice";
      if(candidate.dictionaryId)button.dataset.dictionaryId=candidate.dictionaryId;
      // Each alternative is a small card: heading / grammar line / dictionary meaning.
      // A variant is shown as it would read once chosen (reference, section 2).
      const altModel = window.BibliothekMeaningDisplay.card(resolution, candidate, {word, language:locale(), lookup:findEntry, confirmed:true});
      const marked = altModel.derived ? altModel.text : locale() === "ru" && language === "en" ? `английский: ${text}` : text;
      // G57 (user 24.10.2026): more meanings are only named here («ещё N значений», not a button): choosing the row opens its card,
      // and the number is the one that card shows (a card of parts: all its lines).
      const hidden = altModel.lines ? altModel.lines.reduce((sum, l) => sum + (l.more || 0), 0) : altModel.more || 0;
      const moreText = hidden > 0 ? moreLabel(hidden, locale() === "ru") : "";
      for (const [cls, value] of [["lemma-choice-heading", altModel.heading], ["lemma-choice-grammar", altModel.grammar], ["lemma-choice-text", marked], ["lemma-choice-more", moreText]]) {
        if (!value) continue;
        // Separators stay in the text (screen readers, copy) but not on screen.
        if (button.childNodes.length) { const sep = document.createElement("span"); sep.className = "visually-hidden"; sep.textContent = " · "; button.append(sep); }
        const part = document.createElement("span"); part.className = cls;
        if (cls === "lemma-choice-text" && segments && !altModel.derived) appendLabelSegments(part, segments, locale() === "ru" && language === "en" ? "английский: " : "", false);
        else part.textContent = value;
        button.append(part);
      }
      button.addEventListener("click",()=>chooseCandidate(candidate));
      choices.append(button);
      });
    };
    let renderedLanguage = locale(), languageRevision = 0;
    refreshPopupLanguage = async () => {
      const language = locale();
      if (request !== lookupRequest || language === renderedLanguage) return;
      renderedLanguage = language;
      expandedMain = false; expandedLines.clear(); expandedParts.clear();
      const revision = ++languageRevision;
      // Repaint immediately; fetching Russian values must not keep English UI
      // frozen or recompute the user's chosen lemma.
      renderSelection();
      if (!$sheet.hidden && (selectedEntry || detailParts.length)) renderDictionaryDetails();
      await window.BibliothekRussianTranslations?.enrich(resolution,language);
      if (request !== lookupRequest || revision !== languageRevision || locale() !== language) return;
      renderSelection();
      if (!$sheet.hidden && (selectedEntry || detailParts.length)) renderDictionaryDetails();
    };
    notes.ontoggle = () => { if (request === lookupRequest) renderSelection(); };
    const loadingHeight = $popover.getBoundingClientRect().height;
    renderSelection();
    $popover.setAttribute("aria-busy", "false");
    positionWordPopup(anchor);
    const readyBox = $popover.getBoundingClientRect();
    if (readyBox.height > loadingHeight && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const loadingTop = popupPlacement === "above" ? anchor.top - loadingHeight - 8 : readyBox.top;
      popupExpansion = $popover.animate([
        {height:`${loadingHeight}px`, top:`${loadingTop}px`, overflow:"hidden"},
        {height:`${readyBox.height}px`, top:`${readyBox.top}px`, overflow:"hidden"}
      ], {duration:180, easing:"ease-out"});
      const expansion = popupExpansion;
      expansion.finished.then(() => {
        if (popupExpansion !== expansion) return;
        popupExpansion = null;
        positionWordPopup(popupAnchor);
      }).catch(() => {});
    }
    await refreshBookmark(request);

  }
  let cardDetailsRequest = 0;
  function renderDictionaryDetails(loaded = false) {
    // (08.11.2026: the details of the shown cards first — all parts of a pager at once, so ‹ › stay immediate — from the data
    // cache, or a part from the network the first time)
    const shown = detailParts.length ? detailParts : activePronouns.length ? activePronouns.map(c => c.item) : selectedEntry ? [selectedEntry] : [];
    const request = ++cardDetailsRequest;
    // (Mac browser tests 08.11: the card is drawn at once from the light card — forms, the add button, the pronoun reference
    // are there; the examples and notes join it when their part is read, the first time only)
    if (!loaded && !cardDetailsReady(shown))
      ensureCardDetails(shown).then(() => { if (request === cardDetailsRequest && !$sheet.hidden) renderDictionaryDetails(true); });
    if (detailParts.length) { renderPartDetails(); return; }
    if(!activePronouns.length){if(selectedEntry)renderDictionaryCard(selectedEntry);return;}
    const root=$("dictionary-card"),sections=[],seen=new Set();
    for(const candidate of activePronouns){
      const item=candidate.item,key=item.wortschatz_excluded ? window.BibliothekPronounReference.group(item) : item.id;
      if(seen.has(key))continue;seen.add(key);
      renderDictionaryCard(item);
      const section=document.createElement('section');section.dataset.pronounGroup=key;
      while(root.firstChild)section.append(root.firstChild);
      if(sections.length)section.querySelector('#sheet-word')?.removeAttribute('id');
      sections.push(section);
    }
    // 10.11 (Alena): one card for a form of two kinds (mir — personal and reflexive): the word once, its kinds on one line,
    // then a part per kind under its own title — not two cards one under the other.
    if(sections.length>1){
      const kinds=[...new Set(sections.map(section=>section.querySelector('.dictionary-pos')?.textContent).filter(Boolean))];
      sections.slice(1).forEach(section=>section.querySelectorAll(':scope > .dictionary-headword, :scope > .dictionary-pos').forEach(node=>node.remove()));
      const first=sections[0].querySelector(':scope > .dictionary-pos');if(first)first.textContent=kinds.join(' · ');
      sections.slice(1).forEach(section=>section.classList.add('pronoun-reference-more'));
    }
    root.replaceChildren(...sections);delete root.dataset.pronounReference;
  }
  // G57 step 2: the card of one part; with several parts a pager above it — the part, «1 / 2», ‹ ›.
  function renderPartDetails(direction = document.activeElement?.closest?.(".dictionary-pager-step")?.dataset.step) {
    detailIndex = Math.max(0, Math.min(detailIndex, detailParts.length - 1));
    const item = detailParts[detailIndex];
    renderDictionaryCard(item);
    if (detailParts.length < 2) return;
    const ru = locale() === "ru", pager = document.createElement("div"); pager.className = "dictionary-pager";
    const step = (delta, label, symbol) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "dictionary-pager-step";
      button.textContent = symbol; button.setAttribute("aria-label", label); button.dataset.step = delta < 0 ? "prev" : "next";
      const target = detailIndex + delta; button.disabled = target < 0 || target >= detailParts.length;
      button.addEventListener("click", () => showPart(target, button.dataset.step)); return button;
    };
    const place = document.createElement("span"); place.className = "dictionary-pager-place";
    // Two cards of one word (treten «ступать» / «пинать»): the first meaning tells them apart.
    const twin = detailParts.some((other, i) => i !== detailIndex && other.word === item.word);
    const meaning = twin ? String(translation(item) || "").split(";")[0].trim() : "";
    place.textContent = `${item.word}${meaning ? ` (${meaning})` : ""} · ${detailIndex + 1} / ${detailParts.length}`;
    pager.append(step(-1, ru ? "Предыдущая часть" : "Previous part", "‹"), place, step(1, ru ? "Следующая часть" : "Next part", "›"));
    $("dictionary-card").prepend(pager);
    // Focus stays on the arrow just used (the other one at the end); a rebuild (language) keeps it too.
    if (direction) (pager.querySelector(`[data-step="${direction}"]:not(:disabled)`) || pager.querySelector(".dictionary-pager-step:not(:disabled)"))?.focus({preventScroll:true});
  }
  function showPart(index, direction = index > detailIndex ? "next" : "prev") {
    if (!detailParts.length || index < 0 || index >= detailParts.length || index === detailIndex) return;
    detailIndex = index; renderPartDetails(direction);
    $("dictionary-sheet").querySelector(".sheet-card").scrollTop = 0;
    // One live region for screen readers, kept in the sheet: «Bauchhöhe: часть 2 из 2 — Höhe».
    const ru = locale() === "ru", status = $("dictionary-pager-status");
    if (status) status.textContent = `${selectedWord}: ${ru ? `часть ${index + 1} из ${detailParts.length}` : `part ${index + 1} of ${detailParts.length}`} — ${detailParts[index].word}`;
  }
  // 08.11 (Alena): Meine Wörter shows the same card on its second screen — `root` there, the word as it stood in the
  // book (its form is marked in the tables), no reading of the sentence and no «＋ Zum Wortschatz» (the list adds words).
  function renderDictionaryCard(item, list = null) {
    item = withDetails(item);
    const root = list?.root || $("dictionary-card");
    const selectedWord = list ? list.form || "" : selectedWordNow(), selectedResolution = list ? null : selectedResolutionNow();
    root.replaceChildren();
    delete root.dataset.pronounReference;
    // The pronoun reference is only for Pronomen cards; other excluded
    // function-word cards (articles, prepositions, numerals) render normally.
    if(item.type==="Pronomen"&&window.BibliothekPronounReference.excluded(item)){
      window.BibliothekPronounReference.render(root,item,locale(),selectedWord);
      return;
    }
    const addInfo = (tag, cls, text) => { if (!text) return; const el = document.createElement(tag); el.className = cls; el.textContent = text; root.append(el); };
    const formKey = value => String(value || "").normalize("NFC").trim().toLowerCase();
    const clickedForm = formKey(selectedWord);
    const reflexiveGroup = selectedResolution?.construction?.id === "reflexive-verb" ? selectedResolution.construction : null;
    const compoundTense = reflexiveGroup && ["Perfekt","Plusquamperfekt"].includes(reflexiveGroup.tense);
    const construction = reflexiveGroup
      ? compoundTense ? "" : reflexiveGroup.verb && reflexiveGroup.pronoun
        ? [reflexiveGroup.verb,reflexiveGroup.pronoun,...(reflexiveGroup.prefix?[reflexiveGroup.prefix]:[])].map(span=>formKey(span.text)).join(" ")
        : reflexiveGroup.spans.slice(0,2).map(span=>formKey(span.text)).join(" ")
      : selectedResolution?.construction?.id === "separable-verb" ? selectedResolution.construction.spans.map(span=>formKey(span.text)).join(" ") : "";
    const markForm = (element, value, whole = false) => {
      const key = formKey(value);
      const split = key.split(/\s+/u);
      const joined = item.separable_prefix && split.length === 2 ? split[1] + split[0] : "";
      if (whole && clickedForm && (construction ? key === construction : key === clickedForm || joined === clickedForm)) {
        const mark = document.createElement("mark"); mark.className = "dictionary-form-match"; mark.textContent = value;
        element.replaceChildren(mark); return;
      }
      // Match the clicked token within Perfekt and reflexive forms as well.
      if (!clickedForm || whole && construction) { element.textContent = value; return; }
      element.replaceChildren();
      for (const part of String(value).split(/([\p{L}\p{M}]+)/gu)) {
        if (formKey(part) === clickedForm) {
          const mark = document.createElement("mark"); mark.className = "dictionary-form-match"; mark.textContent = part; element.append(mark);
        } else element.append(document.createTextNode(part));
      }
    };
    const head = document.createElement("h2"); head.className = "dictionary-headword"; if (!list) head.id = "sheet-word"; head.textContent = `${item.article ? item.article + " " : ""}${item.word}`; root.append(head);
    // 09.11 (Alena): the word of «Словарная справка» (in the book and on Meine Wörter's second screen) is read aloud on a
    // tap, like the popover's; the list of Meine Wörter itself stays silent.
    if (window.DeutschVoice?.available()) {
      head.classList.add("can-speak");
      head.addEventListener("click", () => window.DeutschVoice.speak(spokenHeading(head.textContent)));
    }
    addInfo("p","dictionary-pos",item.parts_of_speech?.join(" / ") || ({article:"Artikel",preposition:"Präposition",numeral:"Zahlwort",particle:"Partikel"})[item.type] || item.type);
    if (selectedResolution?.dictionaryId === item.id) addInfo("p","dictionary-detail",usageNote(selectedResolution));
    addInfo("p","dictionary-translation",selectedResolution?.dictionaryId === item.id ?
      (locale() === "ru" ? selectedResolution.translation.ru || selectedResolution.translation.en : selectedResolution.translation.en || "") : translation(item));
    // G70 step 2: the `reflexive` field of a verb card — «sich X — …» under the translation, as in the Wörterbuch.
    if (item.reflexive) addInfo("p","dictionary-translation",`sich ${item.infinitive || item.word} — ${locale() === "ru" ? item.reflexive.translation_ru || item.reflexive.translation_en : item.reflexive.translation_en || item.reflexive.translation_ru}`);
    if (item.plural) addInfo("p","dictionary-detail",`Plural: ${item.plural}`);
    addInfo("p","dictionary-detail",locale() === "ru" ? item.plural_note_ru : item.plural_note_en);
    if (item.declension_forms) addInfo("p","dictionary-detail",`Deklination: ${item.declension_forms}`);
    addInfo("p","dictionary-detail",locale() === "ru" ? item.declension_note_ru : item.declension_note_en);
    if (item.perfect_form) {
      const perfect = document.createElement("p"); perfect.className = "dictionary-detail dictionary-perfect";
      if (item.type === "Verb") markForm(perfect, `Perfekt: ${item.perfect_form}`);
      else perfect.textContent = `Perfekt: ${item.perfect_form}`;
      root.append(perfect);
    }
    if (item.comparative || item.superlative) addInfo("p","dictionary-detail",`Steigerung: ${[item.comparative,item.superlative].filter(Boolean).join(" · ")}`);
    // A list of notes (conjunction cards) is one line per note.
    [].concat((locale() === "ru" ? item.usage_note_ru || item.notes_ru : item.usage_note_en || item.notes_en) || []).forEach(note => addInfo("p","dictionary-detail",note));
    if (item.word_order_rule) addInfo("p","dictionary-detail",`Wortstellung: ${item.word_order_rule}`);
    // One line per pattern line („\n“); „**Verb**“ is shown in bold, as in the Wörterbuch.
    String(item.word_order_pattern || "").split("\n").filter(Boolean).forEach((line,index) => {
      const el = document.createElement("p"); el.className = "dictionary-detail";
      (index ? line : `Muster: ${line}`).split(/\*\*(.+?)\*\*/).forEach((part,i) => { if (part) el.append(i % 2 ? Object.assign(document.createElement("strong"),{textContent:part}) : document.createTextNode(part)); });
      root.append(el);
    });
    if (Array.isArray(item.complements) && item.complements.length) {
      const parts = item.complements.map(value => `${value.pattern}${(locale() === "ru" ? value.note_ru : value.note_en) ? ` — ${locale() === "ru" ? value.note_ru : value.note_en}` : ""}`);
      addInfo("p","dictionary-detail",`Ergänzungen: ${parts.join(" · ")}`);
    }
    if (item.type === "Pronomen" || item.type === "article" && Array.isArray(item.forms)) {
      (item.forms || []).forEach(group => {
        const section = document.createElement("section");
        section.className = "dictionary-pronoun-forms";
        const title = document.createElement("h3");
        title.textContent = group.label;
        section.append(title);
        const scroll = document.createElement("div");
        scroll.style.overflowX = "auto";
        scroll.tabIndex = 0;
        scroll.setAttribute("role", "region");
        scroll.setAttribute("aria-label", group.label);
        const table = document.createElement("table");
        table.className = "dictionary-table";
        const thead = document.createElement("thead");
        const header = document.createElement("tr");
        ["Kasus", ...group.columns].forEach(label => {
          const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label; header.append(cell);
        });
        thead.append(header);
        const tbody = document.createElement("tbody");
        Object.entries(group.rows).forEach(([label, values]) => {
          const row = document.createElement("tr");
          const heading = document.createElement("th"); heading.scope = "row"; heading.textContent = label; row.append(heading);
          // The clicked form is marked in every cell where it occurs; no single case is claimed.
          values.forEach(value => {
            const cell = document.createElement("td");
            if (clickedForm && String(value).split(/\s*\/\s*/u).some(part => formKey(part) === clickedForm)) {
              const mark = document.createElement("mark"); mark.className = "dictionary-form-match"; mark.textContent = value; cell.append(mark);
            } else cell.textContent = value;
            row.append(cell);
          });
          tbody.append(row);
        });
        table.append(thead, tbody); scroll.append(table); section.append(scroll); root.append(section);
      });
      addInfo("p","dictionary-detail",locale() === "ru" ? item.forms_note_ru : item.forms_note_en);
    } else if (item.type === "Verb" && (item.forms || item.lookup_forms)) {
      const verbForms = {...(item.lookup_forms || {}), ...(item.forms || {})};
      const columns = Object.entries(verbForms).filter(([tense, forms]) =>
        tense !== "Imperativ" && forms && Object.values(forms).some(Boolean));
      if (columns.length) {
        const section = document.createElement("section"); section.className = "dictionary-verb-forms";
        const title = document.createElement("h3"); title.textContent = "Formen"; section.append(title);
        const scroll = document.createElement("div"); scroll.style.overflowX = "auto";
        scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Verbformen");
        const table = document.createElement("table"); table.className = "dictionary-table";
        const thead = document.createElement("thead"), header = document.createElement("tr");
        ["", ...columns.map(([tense]) => tense)].forEach(label => {
          const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label; header.append(cell);
        });
        thead.append(header);
        const tbody = document.createElement("tbody");
        ["ich", "du", "er/sie/es", "wir", "ihr", "sie"].forEach(person => {
          const row = document.createElement("tr"), heading = document.createElement("th");
          heading.scope = "row"; heading.textContent = person === "sie" ? "sie/Sie" : person; row.append(heading);
          columns.forEach(([, forms]) => {
            const cell = document.createElement("td"); markForm(cell, forms[person] || "", true); row.append(cell);
          });
          tbody.append(row);
        });
        table.append(thead, tbody); scroll.append(table); section.append(scroll); root.append(section);
      }
      const imperative = Object.entries(verbForms.Imperativ || {}).map(([person, form]) => `${person}: ${form}`).join(" · ");
      if (imperative) {
        const line = document.createElement("p"); line.className = "dictionary-detail"; markForm(line, `Imperativ: ${imperative}`); root.append(line);
      }
    }
    for (const example of [item,...(item.additional_examples || [])]) {
      if (!example.example_de) continue;
      if (example.example_usage) addInfo("p","dictionary-label","Beispiel · " + example.example_usage);
      const block = document.createElement("p"); block.className = "dictionary-example"; block.textContent = example.example_de;
      const tr = document.createElement("span"); tr.className = "dictionary-example-translation"; tr.textContent = locale() === "ru" ? example.example_ru || example.example_en || "" : example.example_en || example.example_ru || ""; block.append(tr); root.append(block);
    }
    // Expressions are not added to Wortschatz (user 22.10): no button, as on the Wörterbuch page.
    if (item.type === "Ausdruck" || list) return;
    const button = document.createElement("button"); button.className = "dictionary-add"; button.type = "button"; button.textContent = "＋ Zum Wortschatz"; // German, as in Wörterbuch (user 27.10.2026)
    button.addEventListener("click", () => addToWortschatz(item)); root.append(button);
  }
  function selectedWordNow() { return selectedWord; }
  function selectedResolutionNow() { return selectedResolution; }
  function addToWortschatz(item) {
    const form = window.WortschatzCollectionWindow;
    if (!form) { showToast("The word form is unavailable. Please reload and try again."); return; }
    closePopups();
    form.addDictionaryWord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      version:2, dictionaryId:item.id, lang:locale()
    }, word => showSaved(word)); // 10.11 (Alena): a card with ✓ and the word, not the small message she missed
  }
  // 10.11 (Alena, variant А): «✓ der Wald · im Wortschatz · «Мои слова»» — rises a little out of transparency and
  // goes back the same way; a few seconds, nothing to tap.
  let savedTimer = 0;
  function showSaved(word = {}) {
    const box = $("saved-card");
    clearTimeout(savedTimer);
    box.querySelector(".saved-word").textContent = word.base || "Gespeichert";
    box.querySelector(".saved-where").textContent = word.collection
      ? `im Wortschatz · «${word.collection}»` : "im Wortschatz";
    box.hidden = false;
    box.classList.remove("is-shown");
    void box.offsetWidth;
    box.classList.add("is-shown");
    savedTimer = setTimeout(() => {
      box.classList.remove("is-shown");
      savedTimer = setTimeout(() => { box.hidden = true; }, 320);
    }, 4000);
  }

  let selectedWord = "", selectedContext = null, popupAmbiguous = false, bookmarkBusy = false;
  function bookmarkInput() {
    return selectedContext ? { ...selectedContext, ...(selectedResolution || {}), form:selectedWord } : null;
  }
  async function refreshBookmark(request = lookupRequest) {
    const button = $("popover-bookmark"), input = bookmarkInput();
    if (!input || popupAmbiguous) { button.disabled = true; return; }
    try {
      const records = await window.BibliothekVocabulary.list(input.bookId);
      if (request !== lookupRequest) return;
      if (window.BibliothekVocabulary.identity(input) !== window.BibliothekVocabulary.identity(bookmarkInput() || {})) return;
      const marked = records.some(record => record.key === window.BibliothekVocabulary.identity(input));
      const label = marked ? "Remove mark" : "Mark as unknown";
      button.setAttribute("aria-pressed", String(marked));
      button.setAttribute("aria-label", label); button.title = label;
      button.disabled = bookmarkBusy;
    } catch (_) {
      if (request === lookupRequest) { button.disabled = true; showToast("Vocabulary could not be loaded. Try reopening this word."); }
    }
  }
  function bookmarkToast(message, undo) {
    showToast(message);
    if (!undo) return;
    $("reader-toast").classList.add("has-undo");
    const button = document.createElement("button"); button.type = "button"; button.className = "toast-undo"; button.textContent = "Rückgängig";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await undo(); showToast("Mark removed."); refreshHighlights(); vocabularyPanel.updateCount(); await refreshBookmark(); }
      catch (_) { button.disabled = false; showToast("Could not undo the mark. Please try again."); }
    });
    $("reader-toast").append(button);
  }
  $("popover-bookmark").addEventListener("click", async () => {
    if (bookmarkBusy || popupAmbiguous) return;
    const input = bookmarkInput(); if (!input) return;
    const V = window.BibliothekVocabulary, key = V.identity(input);
    bookmarkBusy = true; $("popover-bookmark").disabled = true;
    try {
      const records = await V.list(input.bookId);
      if (records.some(record => record.key === key)) {
        await V.clear(input.bookId, undefined, key);
        bookmarkToast("Markierung entfernt.");
      } else {
        await V.mark(input);
        bookmarkToast("Gemerkt", () => V.clear(input.bookId, undefined, key));
      }
    } catch (_) { showToast("The mark could not be saved. Please try again."); }
    finally { bookmarkBusy = false; refreshHighlights(); vocabularyPanel.updateCount(); await refreshBookmark(); }
  });
  let activeWordSpan = null;
  // spans: undefined = the candidate's own links; null = only the clicked word.
  function paintActiveWord(candidate, override) {
    $text.querySelectorAll(".is-active-word").forEach(span => span.classList.remove("is-active-word"));
    if (!activeWordSpan?.isConnected) return;
    activeWordSpan.classList.add("is-active-word");
    const context = selectedContext;
    const spans = override !== undefined ? override : candidate?.construction?.spans || candidate?.nounPhrase?.[0]?.spans || candidate?.nounArticleLink?.spans;
    if (!context || !spans) return;
    const origin = context.location.tokenOffset - context.tokenOffset;
    const paragraph = activeWordSpan.closest("[data-paragraph]");
    paragraph?.querySelectorAll(".reading-word").forEach(span => {
      const offset = Number(span.dataset.tokenOffset) - origin;
      if (spans.some(part => part.start === offset && part.text === span.textContent)) span.classList.add("is-active-word");
    });
  }
  function closePopups() {
    closeBookNote();
    popupExpansion?.cancel(); popupExpansion = null;
    lookupRequest++; refreshPopupLanguage = null; $popover.hidden = true; $sheet.hidden = true;
    activeWordSpan = null; paintActiveWord(null);
  }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
    if (!$popover.hidden || !$sheet.hidden) closePopups();
    activeWordSpan = span;
    paintActiveWord(null);
    $popover.hidden = true; $sheet.hidden = true;
    selectedWord = span.textContent;
    const paragraph = span.closest("[data-paragraph]");
    let sentence = paragraph?.textContent || "";
    let tokenOffset = Number(span.dataset.tokenOffset);
    if (typeof Intl.Segmenter === "function") {
      const offset = Number(span.dataset.tokenOffset);
      // L40 / P8 (26.10.2026): a cut after an abbreviation (von Dr. | med., z. | B.) is no sentence end — join the next segment.
      const segments=[];
      for(const part of new Intl.Segmenter("de", {granularity:"sentence"}).segment(sentence)){const last=segments[segments.length-1];
        if(last&&window.BibliothekLemmaResolver.abbreviationEnd(last.segment,part.segment))last.segment+=part.segment;else segments.push({index:part.index,segment:part.segment});}
      for (const [index,part] of segments.entries()) {
        if (part.index <= offset && offset < part.index + part.segment.length) {
          let text=part.segment;
          // A calendar ordinal may split "zum 1. Januar" at its dot.
          // Extend only this clicked contraction and a confirmed local date.
          const dateLength=window.BibliothekLemmaResolver.calendarDateLength(selectedWord,sentence.slice(offset+selectedWord.length));
          const dateEnd=offset+selectedWord.length+dateLength;
          if(dateLength)for(let next=index+1;next<segments.length&&part.index+text.length<dateEnd;next++)text+=segments[next].segment;
          sentence=text.trim();tokenOffset=offset-part.index-(text.length-text.trimStart().length);break;
        }
      }
    }
    selectedContext = currentBook && paragraph ? {
      bookId:currentBook.id, sentence, tokenOffset,
      location:{chapterIndex:hasChapters(currentBook) ? currentBook.chapterIndex : 0, paragraphIndex:Number(paragraph.dataset.paragraph), tokenOffset:Number(span.dataset.tokenOffset)}
    } : null;
    openWordPopup(selectedWord, span.getBoundingClientRect());
  }

  $("add-book").addEventListener("click", () => { closeAddMenu();reloadBookId=null; $file.click(); });
  $file.addEventListener("change", async () => {
    const file = $file.files?.[0];
    if (!file) return;
    try {
      const book = await window.BibliothekImport.fromFile(file);
      await importBook(book);
      await refreshBooks();
      showToast("Gespeichert.");
    } catch (error) {
      showToast(error instanceof window.BibliothekImport.ImportError ? error.message : "The book could not be saved. Check available browser storage.");
    } finally { $file.value = ""; reloadBookId=null; }
  });
  $("paste-toggle").addEventListener("click", () => {
    closeAddMenu();pasteDialog.showModal();$("paste-title").focus();
  });
  $("paste-form").addEventListener("submit", async event => {
    event.preventDefault();
    const title = $("paste-title").value.trim(); const content = $("paste-content").value.trim();
    if (!title || !content) return;
    try {
      reloadBookId=null;
      await importBook(await window.BibliothekImport.fromText(title, content));
      $("paste-form").reset();pasteDialog.close(); await refreshBooks(); showToast("Gespeichert.");
    } catch (error) { showToast("The text could not be saved. Check available browser storage."); }
  });
  $("back-library").addEventListener("click", async () => {
    if (switchingChapter) return;
    closePopups();
    if (currentBook) {
      clearTimeout(window.__readingSaveTimer);
      await updateProgress(currentBook, restoringPosition ? currentBook.position : visibleParagraph());
    }
    vocabularyHighlights.cancel();
    currentBook = null; $reading.hidden = true; $library.hidden = false; $("library-actions").hidden = false; document.body.classList.add("library-screen"); $("reader").querySelector(".reader-header").hidden = false; window.scrollTo({ top:0, behavior:"instant" }); document.title = "Bibliothek · Deutsch.";
    refreshBooks();
  });
  // Consume outside clicks before word and navigation handlers run. Safari and
  // accessibility clicks do not reliably report pointerType or a click count.
  document.addEventListener("click", event => {
    if ($popover.hidden || sourcesDialog.open || event.target.closest("#word-popover, #reader-toast")) return;
    closePopups();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  // Footnotes (D24 step 2): tapping a reference shows the note in a small card next to it; any other tap, Escape,
  // scrolling or turning the page closes it.
  let bookNote = null;
  // Looked up by id (not the variable) so closePopups — also on every page turn — can call it at any time.
  function closeBookNote() {
    const note = document.getElementById("book-note-popup");
    if (!note || note.hidden) return;
    note.hidden = true;
    document.querySelectorAll('.book-noteref[aria-expanded="true"]').forEach(ref => ref.setAttribute("aria-expanded", "false"));
  }
  function openBookNote(ref) {
    const text = currentBook?.chapters?.[currentBook.chapterIndex]?.notes?.[ref.dataset.noteTarget];
    if (!text) return;
    if (!bookNote) {
      bookNote = document.createElement("div");
      bookNote.className = "book-note-popup"; bookNote.id = "book-note-popup"; bookNote.setAttribute("role", "note"); bookNote.hidden = true;
      bookNote.addEventListener("click", event => event.stopPropagation());
      document.body.append(bookNote);
    }
    closeBookNote();
    bookNote.textContent = text;
    bookNote.hidden = false; ref.setAttribute("aria-expanded", "true");
    const r = ref.getBoundingClientRect(), w = bookNote.offsetWidth, h = bookNote.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 8 + h <= innerHeight - 12;
    bookNote.style.left = `${left}px`; bookNote.style.top = `${below ? r.bottom + 8 : Math.max(12, r.top - 8 - h)}px`;
  }
  document.addEventListener("click", event => { if (!event.target.closest?.(".book-noteref")) closeBookNote(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeBookNote(); else if (event.key.startsWith("Arrow") || event.key === "PageDown" || event.key === "PageUp") closeBookNote(); });
  addEventListener("resize", closeBookNote); addEventListener("scroll", closeBookNote, true);
  $text.addEventListener("click", event => {
    const ref = event.target.closest(".book-noteref:not(.book-noteref-word)");
    if (ref) { event.preventDefault(); openBookNote(ref); return; }
    const span = event.target.closest(".reading-word"); if (span) chooseWord(span);
  });
  $text.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".book-noteref[role=button]")) { event.preventDefault(); openBookNote(event.target); } });
  $text.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".reading-word")) { event.preventDefault(); chooseWord(event.target); } });
  function updateBookmarkStatus(book, paragraph) {
    const paragraphs = [...$text.querySelectorAll("[data-paragraph]")];
    if (!paragraphs.length) return false;
    let changed = false;
    if ((paragraph >= 1 || (hasChapters(book) && book.chapterIndex > 0)) && !book.readingStarted) {
      book.readingStarted = true;
      changed = true;
    }
    const last = paragraphs[paragraphs.length - 1];
    // 09.11 (Alena): every book is «Gelesen» once its last page is reached — a text without chapters as before, a book
    // with chapters on the last page of its last chapter (there is no «Buch abschließen» button any more).
    const entries = hasChapters(book) ? readingEntries(book) : [];
    const lastPart = !hasChapters(book) ? pagination.page > 0 : activeEntry(book) === entries[entries.length - 1];
    if (book.readingStarted && !book.completed && lastPart && pagination.page === pagination.count - 1) {
      book.completed = true;
      changed = true;
    }
    return changed;
  }
  function flushReadingPosition() {
    if (!currentBook || $reading.hidden || switchingChapter || deleting) return;
    clearTimeout(window.__readingSaveTimer);
    updateProgress(currentBook, restoringPosition ? currentBook.position : visibleParagraph());
  }
  window.addEventListener("pagehide", flushReadingPosition);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushReadingPosition(); });
  const sourcesDialog = $("data-sources");
  $("popover-source").addEventListener("click", () => sourcesDialog.showModal());
  $("sources-close").addEventListener("click", () => sourcesDialog.close());
  sourcesDialog.addEventListener("click", event => {
    const bounds = sourcesDialog.getBoundingClientRect();
    if (event.target === sourcesDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) sourcesDialog.close();
  });
  $("popover-more").addEventListener("click", () => {
    if (!selectedEntry && !partEntries.length) return;
    detailParts = selectedEntry ? [] : partEntries; detailIndex = 0;
    if ($("dictionary-pager-status")) $("dictionary-pager-status").textContent = "";
    renderDictionaryDetails(); $popover.hidden = true; $sheet.hidden = false;
  });
  // G57 step 2: swipe sideways (phone) or ← / → (computer) to the next part of the details.
  {
    const card = $("dictionary-sheet").querySelector(".sheet-card");
    let touch = null;
    // A swipe on something that scrolls sideways itself (a wide table of forms) scrolls it, not the parts.
    const scrollsSideways = target => { for (let el = target; el && el !== card; el = el.parentElement) if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") return true; return false; };
    card.addEventListener("touchstart", event => { touch = event.touches.length === 1 && !scrollsSideways(event.target) ? {x:event.touches[0].clientX, y:event.touches[0].clientY} : null; }, {passive:true});
    card.addEventListener("touchend", event => {
      if (!touch || detailParts.length < 2) return;
      const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y; touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showPart(detailIndex + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", event => {
      if ($sheet.hidden || detailParts.length < 2 || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest?.("input, textarea, select, [contenteditable]") || scrollsSideways(event.target)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); showPart(detailIndex + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); showPart(detailIndex - 1); }
    });
  }
  $("sheet-close").addEventListener("click", closePopups);
  $("sheet-scrim").addEventListener("click", closePopups);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !sourcesDialog.open) closePopups(); });
  loadDictionary().catch(error => console.warn("Bibliothek dictionary unavailable", error));
  refreshBooks();
})();
