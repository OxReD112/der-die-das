(() => {
  "use strict";
  const $ = id => document.getElementById(id);
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
  let thanksStorage;
  try { thanksStorage = window.localStorage; } catch (_) {}
  const meaningThanks = window.BibliothekMeaningThanks.create({storage:thanksStorage});
  let meaningChosenInPopup = false;
  let dictionary = null, dictionaryPromise = null;
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

  const storageInfo = $("storage-info"), storageNotice = $("storage-notice");
  const STORAGE_NOTICE_KEY = "deutschLibraryStorageNoticeV1";
  let storageNoticeTimer;
  function setStorageNotice(open) {
    clearTimeout(storageNoticeTimer);
    storageNotice.classList.toggle("is-open", open);
    storageNotice.setAttribute("aria-hidden", String(!open));
    storageInfo.setAttribute("aria-expanded", String(open));
  }
  storageInfo.addEventListener("click", () => {
    setStorageNotice(storageInfo.getAttribute("aria-expanded") !== "true");
  });
  let storageNoticeSeen = false;
  try { storageNoticeSeen = localStorage.getItem(STORAGE_NOTICE_KEY) === "seen"; } catch (_) {}
  setStorageNotice(!storageNoticeSeen);
  if (!storageNoticeSeen) {
    storageNoticeTimer = setTimeout(() => {
      setStorageNotice(false);
      try { localStorage.setItem(STORAGE_NOTICE_KEY, "seen"); } catch (_) {}
    }, 6000);
  }
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
    dismissMeaningThanks();
    const toast = $("reader-toast");
    toast.classList.remove("has-undo");
    toast.replaceChildren(document.createTextNode(message));
    if (actionLabel) {
      const action = document.createElement("a");
      action.className = "toast-action";
      action.href = "../wortschatz/index.html?v=20261007-adjadv-1";
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
  function requestBookDelete(book,trigger) {
    pendingDelete=book;deleteTrigger=trigger;
    $("delete-confirm-title").textContent=`„${book.title}“ löschen?`;
    $("delete-confirm").hidden=false;$library.inert=true;$("library-actions").inert=true;
    $("reader").querySelector(".reader-header").inert=true;$("cancel-delete").focus({preventScroll:true});
  }
  function describeLibraryBook(book) {
    if(book.missingContent)return 'Reload file · '+String(book.format||'txt').toUpperCase();
    if(book.completed)return 'Gelesen';
    const started=book.readingStarted||Number(book.position)>0||Number(book.chapterIndex)>0;
    const resume=hasChapters(book)&&started?activeEntry({...book,chapterIndex:book.chapterIndex||0,position:book.position||0}):null;
    if(resume)return `Weiterlesen · ${resume.title}`;
    if(started)return 'Weiterlesen';
    const words=Number(book.wordCount||0);
    return `${words.toLocaleString('de-DE')} ${words===1?'Wort':'Wörter'} · ${String(book.format||'txt').toUpperCase()}`;
  }
  const bookshelf=window.BibliothekBookshelf.create({root:shelfRoot,onOpen:openLibraryBook,onDelete:requestBookDelete,describe:describeLibraryBook,getPreferredId:()=>lastOpenedBookId});
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
      button.innerHTML = `<span class="book-icon" aria-hidden="true"></span><span class="book-meta"><span class="book-title"></span><span class="book-author" hidden></span><span class="book-subtitle"></span></span><span class="book-arrow" aria-hidden="true">›</span>`;
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
        button.querySelector('.book-arrow').textContent = '↻';
        button.querySelector('.book-subtitle').textContent = 'Reload file · ' + fileFormat;
        button.setAttribute('aria-label', `Reload file for “${book.title}”`);
        button.title = 'Reload the original file to continue reading';
      }
      button.addEventListener("click", () => openLibraryBook(book));
      const remove = document.createElement("button");
      remove.className = "book-delete";
      remove.type = "button";
      remove.setAttribute("aria-label", `„${book.title}“ löschen`);
      remove.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7m3.5 0-.8 13h-11L5.9 7M10 10.5v6m4-6v6"/></svg>';
      remove.addEventListener("click", () => requestBookDelete(book,remove));
      row.append(button, remove);
      $bookList.append(row);
    });
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
      $("library-status").textContent = "Local book storage is unavailable in this browser.";
      $("empty-library").hidden = false;
    }
  }
  function closeDeleteConfirm(restoreFocus = true) {
    if (deleting) return;
    $("delete-confirm").hidden = true;
    $library.inert = false;
    $("library-actions").inert = false;
    $("reader").querySelector(".reader-header").inert = false;
    pendingDelete = null;
    if (restoreFocus && deleteTrigger?.isConnected) deleteTrigger.focus({ preventScroll:true });
    deleteTrigger = null;
  }
  $("cancel-delete").addEventListener("click", () => closeDeleteConfirm());
  $("confirm-delete").addEventListener("click", async () => {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete.id;
    deleting = true;
    clearTimeout(window.__readingSaveTimer);
    $("confirm-delete").disabled = true;
    $("cancel-delete").disabled = true;
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);

        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not delete this book"));
      });
      await window.BibliothekReadingData.remove(id);
      // Release the previous reader content as well as the persisted record.
      clearTimeout(window.__readingSaveTimer);
      currentBook = null;
      vocabularyHighlights.cancel();
      $text.replaceChildren();
      selectedWord = "";
      deleting = false;
      closeDeleteConfirm(false);
      await refreshBooks();
      ($bookList.querySelector(".book-open") || addToggle).focus({ preventScroll:true });
      showToast("Deleted from this device.");
    } catch (error) {
      deleting = false;
      closeDeleteConfirm();
      showToast("The text could not be deleted. Please try again.");
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
    if (entries[index + 1]) {
      const next = document.createElement("button"); next.id = "next-chapter"; next.className = "next-chapter-card"; next.type = "button";
      next.textContent = "Nächstes Kapitel →";
      next.setAttribute("aria-label", "Nächstes Kapitel: " + entries[index + 1].title); next.addEventListener("click", () => navigateTo(entries[index + 1])); end.append(next);
    } else {
      end.classList.add("is-book-end");
      const finish = document.createElement("button"); finish.className = "next-chapter-card"; finish.type = "button";
      finish.textContent = book.completed ? "Buch abgeschlossen ✓" : "Buch abschließen ✓"; finish.disabled = Boolean(book.completed);
      finish.addEventListener("click", async () => { book.completed = true; book.readingStarted = true; await saveBook(book); renderChapterNavigation(book); vocabularyPanel.updateCount(); showToast("Buch abgeschlossen."); }); end.append(finish);
    }

  }
  function wrapParagraph(paragraph) {
    const fragment = document.createDocumentFragment();
    const tokens = window.BibliothekLemmaResolver.readerSegments(paragraph);
    let tokenOffset = 0;
    tokens.forEach(token => {
      if (/^[\p{L}\p{M}]/u.test(token)) {
        const span = document.createElement("span");
        span.className = "reading-word";
        span.dataset.tokenOffset = String(tokenOffset);
        span.textContent = token;
        span.tabIndex = 0;
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", `${token}, tap for translation`);
        fragment.append(span);
      } else fragment.append(document.createTextNode(token));
      tokenOffset += token.length;
    });
    return fragment;
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
      p.append(wrapParagraph(paragraph));
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
    ? `${candidate.usage.form} · ${candidate.usage.kind === "participle-I" ? "Partizip I" : candidate.usage.kind === "participle-II" ? "Partizip II" : locale() === "ru" ? "прилагательное" : "adjective"} (${candidate.usage.base}) · ${locale() === "ru" ? "определение к" : "modifier of"} ${candidate.usage.head}` : "";
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
    const get = path => fetch(`../worterbuch/${path}?v=${path === "german-verbs.json" ? "20261023-wn-recht-1" : path === "german-nouns.json" ? "20261020-nouns-list3-15" : ["german-adjectives.json","german-adjective-adverbs.json"].includes(path) ? "20261023-wn-partadj-1" : path === "german-adverbs.json" ? "20261023-wn-recht-1" : path === "german-expressions.json" ? "20261024-expr-009-e8" : path === "german-pronouns.json" ? "20261024-g65-2" : path === "german-numerals.json" ? "20261018-c21b-1" : ["german-conjunctions.json","german-prepositions.json"].includes(path) ? "20261020-pron-conj-1" : "20261011-um-zu-en-1"}`).then(r => { if (!r.ok) throw new Error("dictionary load failed"); return r.json(); });
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
  let thanksBox = null, thanksTimeout = null;
  function dismissMeaningThanks() {
    clearTimeout(thanksTimeout);
    thanksTimeout = null;
    if (thanksBox) {
      thanksBox.getAnimations().forEach(animation => animation.cancel());
      thanksBox.remove();
      thanksBox = null;
    }
  }
  function showMeaningThanks(message, origin) {
    dismissMeaningThanks();
    const box = document.createElement("div"), phrase = document.createElement("span");
    box.className = "word-popover meaning-thanks";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    box.lang = "de";
    phrase.textContent = message;
    box.append(phrase);
    // Measure the final box within the area already covered by the popup.
    box.style.maxWidth = `${origin.width}px`;
    box.style.visibility = "hidden";
    $popover.parentElement.append(box);
    const target = box.getBoundingClientRect();
    const left = origin.left + (origin.width - target.width) / 2;
    const top = origin.top + (origin.height - target.height) / 2;
    Object.assign(box.style, {visibility:"visible", left:`${left}px`, top:`${top}px`});
    thanksBox = box;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shrink = box.animate([
      {left:`${origin.left}px`, top:`${origin.top}px`, width:`${origin.width}px`, height:`${origin.height}px`, borderRadius:"20px"},
      {left:`${left}px`, top:`${top}px`, width:`${target.width}px`, height:`${target.height}px`, borderRadius:"20px"}
    ], {duration:reduced ? 0 : 260, easing:"cubic-bezier(.22,1,.36,1)"});
    phrase.animate([{opacity:0}, {opacity:1}], {duration:reduced ? 0 : 180, easing:"ease-out"});
    shrink.finished.then(() => {
      if (thanksBox !== box) return;
      thanksTimeout = setTimeout(() => {
        if (thanksBox !== box) return;
        const fade = box.animate([{opacity:1, transform:"translateY(0)"}, {opacity:0, transform:`translateY(${reduced ? 0 : -10}px)`}],
          {duration:reduced ? 0 : 220, easing:"ease-out", fill:"forwards"});
        fade.finished.then(() => { if (thanksBox === box) dismissMeaningThanks(); }).catch(() => {});
      }, 2000);
    }).catch(() => {});
  }
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
  // Keep the same word-facing edge when translations or expanded notes resize it.
  new ResizeObserver(() => { updateTranslationFade(); if (!popupExpansion) positionWordPopup(popupAnchor); }).observe($popover);
  async function openWordPopup(word, anchor) {
    dismissMeaningThanks();
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
    let showPronounSummary=pronounCandidates.length>0 && !resolution.candidates.some(c=>c.construction?.id === "recorded-construction") && (reference.isPronoun(resolution.selected) ||
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
    const expandedLines = new Set();
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
        const shown = (userConfirmed || possessiveRow && resolverChosePronoun && resolution.selected === candidate) && reference.isPronoun(candidate) ? [candidate] :
          possessiveRow && possessives.length ? possessives : pronounCandidates;
        const types = [...new Set(shown.map(c => display.partOfSpeech(c)))];
        const use = pronounLink ? "Reflexiv" : "";
        const values = reference.brief(possessiveRow ? shown : pronounCandidates,word,locale()).replace(/^[^·]*·\s*/u, "");
        model = {heading:candidate?.contraction ? display.contractionHeading(candidate.contraction) : word, grammar:[pronounLink ? "Pronomen" : types.length === 1 ? types[0] : "Pronomen", use].filter(Boolean).join(" · "),
          text:values || display.NO_TRANSLATION[locale()], textLanguage:locale(), spans:pronounLink ? [pronounLink.verb, pronounLink.pronoun, ...(pronounLink.prefix ? [pronounLink.prefix] : [])] : null, helpEntry:selectedEntry,
          // A5: «здесь: друг друга» / «себя или друг друга» under the meaning.
          note:pronounLink?.interpretation ? pronounLink.note?.[locale()] || "" : ""};
      } else if (candidate) {
        model = display.card(resolution, candidate, {word, language:locale(), lookup:findEntry, confirmed:userConfirmed});
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
      const full = (expandedMain || expandedLines.size) && candidate && !referencePronoun
        ? display.card(resolution, candidate, {word, language:locale(), lookup:findEntry, confirmed:userConfirmed, all:true}) : null;
      const shown = expandedMain && full && !model.lines ? full : model;
      const moreButton = (n, onClick) => {
        const more = document.createElement("button"); more.type = "button"; more.className = "popover-more-meanings";
        more.textContent = `${moreLabel(n, ru)} ↓`; more.setAttribute("aria-expanded", "false");
        more.addEventListener("click", onClick); return more;
      };
      if (shown.segments) appendLabelSegments(content, shown.segments, shown.segmentPrefix);
      // G48 (23.10.2026): a word explained by its parts — every part on a line of its own. G57: a part with more meanings than the
      // two shown has «ещё N значений ↓», which opens the rest of that line here.
      else if (model.lines) model.lines.forEach((line, index) => {
        const open = expandedLines.has(index) && full?.lines?.[index];
        const row = document.createElement("span"); row.className = "popover-formation-line"; row.textContent = open ? full.lines[index].text : line.text;
        if (!open && line.more > 0) row.append(" ", moreButton(line.more, () => { expandedLines.add(index); expandAndKeepFocus(); }));
        content.append(row);
      });
      else content.textContent = shown.text;
      // D13 / G57: meanings of a card beyond the short text (own: about three lines; external: two) open here, in the popup.
      if (!expandedMain && model.more > 0 && !model.lines) content.append(" ", moreButton(model.more, () => { expandedMain = true; expandAndKeepFocus(); }));
      if (model.note) {
        const note = document.createElement("small"); note.className = "popover-construction";
        note.textContent = model.note; content.append(note);
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
      $("popover-source").hidden = candidate ? candidate.source !== "fallback" : !resolution.unresolvedMeanings.length && !resolution.candidates.some(c => c.source === "fallback");
      if (notes.open && !notes.hidden) $("popover-source").hidden = false;
      paintActiveWord(candidate, referencePronoun || candidate?.construction || candidate?.prepositionLink || candidate?.compound ? model.spans : undefined);
      if(showPronounSummary)popupAmbiguous=false;
      // G57 (user 24.10.2026): no bookmark while no variant is chosen (it would save a word without a meaning).
      $("popover-bookmark").hidden = popupAmbiguous;
      if (popupAmbiguous) $("bookmark-hint").hidden = true;
      renderChoices();
    };
    const chooseCandidate = async candidate => {
        if (request !== lookupRequest) return;
        if (popupAmbiguous && !showPronounSummary && !meaningChosenInPopup) {
          meaningThanks.selected();
          meaningChosenInPopup = true;
        }
        showPronounSummary=reference.isPronoun(candidate) && candidate?.construction?.id !== "recorded-construction";
        popupAmbiguous = false; selectedResolution = candidate; selectedEntry = candidate.item || null; userConfirmed = true;
        expandedMain = false; expandedLines.clear();
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
      expandedMain = false; expandedLines.clear();
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
  function renderDictionaryDetails() {
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
  function renderDictionaryCard(item) {
    const root = $("dictionary-card");
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
    const head = document.createElement("h2"); head.className = "dictionary-headword"; head.id = "sheet-word"; head.textContent = `${item.article ? item.article + " " : ""}${item.word}`; root.append(head);
    addInfo("p","dictionary-pos",item.parts_of_speech?.join(" / ") || ({article:"Artikel",preposition:"Präposition",numeral:"Zahlwort",particle:"Partikel"})[item.type] || item.type);
    if (selectedResolution?.dictionaryId === item.id) addInfo("p","dictionary-detail",usageNote(selectedResolution));
    addInfo("p","dictionary-translation",selectedResolution?.dictionaryId === item.id ?
      (locale() === "ru" ? selectedResolution.translation.ru || selectedResolution.translation.en : selectedResolution.translation.en || "") : translation(item));
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
    if (item.type === "Ausdruck") return;
    const button = document.createElement("button"); button.className = "dictionary-add"; button.type = "button"; button.textContent = "＋ Add to Wortschatz";
    button.addEventListener("click", () => addToWortschatz(item)); root.append(button);
  }
  function addToWortschatz(item) {
    const form = window.WortschatzCollectionWindow;
    if (!form) { showToast("The word form is unavailable. Please reload and try again."); return; }
    closePopups();
    form.addDictionaryWord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      version:2, dictionaryId:item.id, lang:locale()
    }, () => showToast("Added to Wortschatz."));
  }

  let selectedWord = "", selectedContext = null, popupAmbiguous = false, bookmarkBusy = false;
  const BOOKMARK_HINT = "deutschReadingBookmarkHintV1";
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
      let seen = false;
      try { seen = localStorage.getItem(BOOKMARK_HINT) === "1"; } catch (_) {}
      $("bookmark-hint").textContent = locale() === "ru" ? "Отмечайте незнакомые слова. После чтения выберите, что учить." : "Bookmark unfamiliar words. Choose what to learn later.";
      $("bookmark-hint").hidden = seen;
    } catch (_) {
      if (request === lookupRequest) { button.disabled = true; showToast("Vocabulary could not be loaded. Try reopening this word."); }
    }
  }
  function bookmarkToast(message, undo) {
    showToast(message);
    if (!undo) return;
    $("reader-toast").classList.add("has-undo");
    const button = document.createElement("button"); button.type = "button"; button.className = "toast-undo"; button.textContent = "Undo";
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
        bookmarkToast("Mark removed.");
      } else {
        await V.mark(input);
        try { localStorage.setItem(BOOKMARK_HINT, "1"); } catch (_) {}
        bookmarkToast("Marked for vocabulary", () => V.clear(input.bookId, undefined, key));
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
    dismissMeaningThanks();
    const origin = !$popover.hidden ? $popover.getBoundingClientRect() : null;
    popupExpansion?.cancel(); popupExpansion = null;
    lookupRequest++; refreshPopupLanguage = null; $popover.hidden = true; $sheet.hidden = true;
    activeWordSpan = null; paintActiveWord(null);
    if (meaningChosenInPopup) {
      meaningChosenInPopup = false;
      const message = meaningThanks.message(!!origin && $("reader-toast").hidden && !$reading.hidden && !document.querySelector('dialog[open]'));
      if (message) showMeaningThanks(message, origin);
    }
  }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
    dismissMeaningThanks();
    if (!$popover.hidden || !$sheet.hidden) closePopups();
    meaningChosenInPopup = false;
    activeWordSpan = span;
    paintActiveWord(null);
    $popover.hidden = true; $sheet.hidden = true;
    selectedWord = span.textContent;
    const paragraph = span.closest("[data-paragraph]");
    let sentence = paragraph?.textContent || "";
    let tokenOffset = Number(span.dataset.tokenOffset);
    if (typeof Intl.Segmenter === "function") {
      const offset = Number(span.dataset.tokenOffset);
      const segments=[...new Intl.Segmenter("de", {granularity:"sentence"}).segment(sentence)];
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
      showToast("Saved on this device.");
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
      $("paste-form").reset();pasteDialog.close(); await refreshBooks(); showToast("Text saved on this device.");
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
  $text.addEventListener("click", event => { const span = event.target.closest(".reading-word"); if (span) chooseWord(span); });
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
    if (book.readingStarted && !book.completed && !hasChapters(book) && pagination.page > 0 && pagination.page === pagination.count - 1) {
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
  $("popover-close").addEventListener("click", closePopups);
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
