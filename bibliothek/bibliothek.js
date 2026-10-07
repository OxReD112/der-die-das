(() => {
  "use strict";
  const $ = id => document.getElementById(id);
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
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const locale = () => window.DeutschTranslation?.getLang?.() || "en";
  const translation = item => locale() === "ru" ? item.translation_ru || item.translation_en : item.translation_en || item.translation_ru;

  const vocabularyHighlights = window.BibliothekHighlights.create($text, $("highlights-toggle"), async () => {
    try { await loadDictionary(); return lemmaResolver; }
    catch (_) { return window.BibliothekLemmaResolver.create([], window.DeutschFallbackDictionary); }
  });
  function refreshHighlights() {
    vocabularyHighlights.update(currentBook).catch(error => console.warn("Vocabulary highlights unavailable", error));
  }

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
  function showToast(message, actionLabel) {
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
    toastTimer = setTimeout(() => toast.hidden = true, 3200);
  }

  function coverInitials(title) {
    const words = String(title || "").normalize("NFC").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || [];
    return words.slice(0, 2).map((word, index) => index === 0
      ? Array.from(word)[0].toLocaleUpperCase("de-DE")
      : Array.from(word)[0].toLocaleLowerCase("de-DE")).join("") || "?";
  }

  function renderBooks(books) {
    $bookList.replaceChildren();
    $("empty-library").hidden = books.length > 0;
    books.forEach(book => {
      const row = document.createElement("div");
      row.className = "book-row";
      const button = document.createElement("button");
      button.className = "book-open";
      button.type = "button";
      button.innerHTML = `<span class="book-icon" aria-hidden="true"></span><span class="book-meta"><span class="book-title"></span><span class="book-subtitle"></span></span><span class="book-arrow" aria-hidden="true">›</span>`;
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
      const words = (String(book.content || "").match(/[\p{L}\p{M}]+/gu) || []).length;
      const fileFormat = String(book.format || "txt").toUpperCase();
      const resume = hasChapters(book) && started ? activeEntry({ ...book, chapterIndex: book.chapterIndex || 0, position: book.position || 0 }) : null;
      button.querySelector(".book-subtitle").textContent = completed ? "Gelesen" : resume ? `Weiterlesen · ${resume.title}` : `${words.toLocaleString("de-DE")} ${words === 1 ? "Wort" : "Wörter"} · ${fileFormat}`;
      if(book.missingContent) {
        row.classList.add('is-missing');
        button.querySelector('.book-arrow').textContent = '↻';
        button.querySelector('.book-subtitle').textContent = 'Reload file · ' + fileFormat;
        button.setAttribute('aria-label', `Reload file for “${book.title}”`);
        button.title = 'Reload the original file to continue reading';
      }
      button.addEventListener("click", () => {
        if(book.missingContent) { reloadBookId=book.id; $file.click(); }
        else openBook(book);
      });
      const remove = document.createElement("button");
      remove.className = "book-delete";
      remove.type = "button";
      remove.setAttribute("aria-label", `Delete “${book.title}”`);
      remove.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7m3.5 0-.8 13h-11L5.9 7M10 10.5v6m4-6v6"/></svg>';
      remove.addEventListener("click", () => {
        pendingDelete = book;
        deleteTrigger = remove;
        $("delete-confirm-title").textContent = `Delete “${book.title}”?`;
        $("delete-confirm").hidden = false;
        $library.inert = true;
        $("library-actions").inert = true;
        $("reader").querySelector(".reader-header").inert = true;
        $("cancel-delete").focus({ preventScroll:true });
      });
      row.append(button, remove);
      $bookList.append(row);
    });
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
      ($bookList.querySelector(".book-open") || $("add-book")).focus({ preventScroll:true });
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
    const end = $("chapter-end"); end.replaceChildren(); end.hidden = false;
    const entries = hasChapters(book) ? readingEntries(book) : [], active = hasChapters(book) ? activeEntry(book) : null, index = entries.indexOf(active);
    if (entries[index + 1]) {
      const next = document.createElement("button"); next.id = "next-chapter"; next.className = "next-chapter-card"; next.type = "button";
      const label = document.createElement("small"); label.textContent = "Next chapter";
      const title = document.createElement("span"); title.textContent = entries[index + 1].title + " →";
      next.append(label, title); next.addEventListener("click", () => navigateTo(entries[index + 1])); end.append(next);
    } else {
      const finish = document.createElement("button"); finish.className = "next-chapter-card"; finish.type = "button";
      finish.textContent = book.completed ? "Book finished ✓" : "Finish book ✓"; finish.disabled = Boolean(book.completed);
      finish.addEventListener("click", async () => { book.completed = true; book.readingStarted = true; await saveBook(book); renderChapterNavigation(book); vocabularyPanel.updateCount(); showToast("Book finished."); }); end.append(finish);
    }
    if (entries[index - 1]) {
      const previous = document.createElement("button"); previous.id = "previous-chapter"; previous.className = "previous-chapter-link"; previous.type = "button";
      previous.textContent = "← " + entries[index - 1].title;
      previous.addEventListener("click", () => navigateTo(entries[index - 1])); end.append(previous);
    }
  }
  function wrapParagraph(paragraph) {
    const fragment = document.createDocumentFragment();
    const tokens = paragraph.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|[^\p{L}\p{M}]+/gu) || [paragraph];
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
    const paragraphs = [...$text.querySelectorAll("[data-paragraph]")];
    const index = Math.max(0, Number(currentBook.position) || 0);
    $("reading-progress").hidden = !hasChapters(currentBook);
    if (!hasChapters(currentBook)) {
      $("reading-progress").textContent = paragraphs.length ? `${Math.min(index + 1, paragraphs.length)} / ${paragraphs.length}` : ""; return;
    }
    const active = activeEntry(currentBook), chapters = readingEntries(currentBook).filter(entry => !entry.frontMatter);
    const number = chapters.findIndex(entry => entryKey(entry) === entryKey(active));
    $("reading-progress").textContent = number >= 0 ? `Chapter ${number + 1} of ${chapters.length}` : (active?.title || "Reading");
    const atEnd = pagination.page === pagination.count - 1;
    $("chapter-progress-fill").style.width = `${atEnd ? 100 : pagination.count > 1 ? pagination.page / pagination.count * 100 : 0}%`;
  }
  async function openBook(book) {
    closePopups();
    renderBookText(book);
    document.title = `${book.title} · Bibliothek`;

  }
  let lemmaResolver = null, selectedResolution = null;
  const usageNote = candidate => candidate?.usage?.role === "nominalized"
    ? `${candidate.usage.kind === "person"
      ? locale() === "ru" ? "Субстантивация · обозначение человека" : "Nominalization · person"
      : candidate.usage.kind === "adjective" ? locale() === "ru" ? "Субстантивированное прилагательное" : "Nominalized adjective"
      : locale() === "ru" ? "Субстантивированный инфинитив" : "Nominalized infinitive"} · ${candidate.usage.base}${candidate.usage.number === "plural" ? locale() === "ru" ? " · множественное число" : " · plural" : ""}`
    : candidate?.usage?.role === "attributive"
    ? `${candidate.usage.form} · ${candidate.usage.kind === "participle-I" ? "Partizip I" : "Partizip II"} (${candidate.usage.base}) · ${locale() === "ru" ? "определение к" : "modifier of"} ${candidate.usage.head}` : "";
  async function loadDictionary() {
    if (dictionary) return dictionary;
    if (dictionaryPromise) return dictionaryPromise;
    const get = path => fetch(`../worterbuch/${path}?v=20261007-adjadv-1`).then(r => { if (!r.ok) throw new Error("dictionary load failed"); return r.json(); });
    dictionaryPromise = Promise.all([get("german-nouns.json"),get("german-verbs.json"),get("german-adjectives.json"),get("german-adverbs.json"),get("german-conjunctions.json"),get("german-pronouns.json"),get("german-adjective-adverbs.json")])
      .then(([nouns,verbs,adjectives,adverbs,conjunctions,pronouns,adjectiveAdverbs]) => {
        dictionary = [
          ...nouns.map(x => ({ ...x, word:x.word, type:"Nomen" })),
          ...verbs.map(x => ({ ...x, word:x.infinitive, type:"Verb" })),
          ...adjectives.map(x => ({ ...x, type:"Adjektiv" })),
          ...adverbs.map(x => ({ ...x, type:"Adverb" })),
          ...adjectiveAdverbs.map(x => ({ ...x, type:"Adjektiv" })),
          ...conjunctions.map(x => ({ ...x, type:"Konjunktion" })),
          ...pronouns.map(x => ({ ...x, type:"Pronomen" }))
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
  async function openWordPopup(word, anchor) {
    const request = ++lookupRequest;
    refreshPopupLanguage = null;
    $("popover-bookmark").disabled = true;
    $("popover-bookmark").setAttribute("aria-pressed", "false");
    selectedEntry = null;
    selectedResolution = null;
    try { await loadDictionary(); }
    catch (error) {
      // Fallback lookup remains usable when the main database fails to load.
      lemmaResolver = window.BibliothekLemmaResolver.create([], window.DeutschFallbackDictionary);
    }
    const context = selectedContext;
    const resolution = await lemmaResolver.resolve(word, context);
    const linkedReflexive = resolution.candidates.find(c=>c.construction?.id === "reflexive-verb");
    let saved = null;
    try { saved = context ? await window.BibliothekMeaningSelections.get(context) : null; } catch (_) {}
    if (context && linkedReflexive) {
      const groupSaved = await window.BibliothekMeaningSelections.get(reflexiveAnchor(linkedReflexive,context)).catch(()=>null);
      if (saved === window.BibliothekVocabulary.identity(linkedReflexive) && groupSaved && groupSaved !== saved) saved = null;
    }
    if (saved) resolution.selected = window.BibliothekLemmaResolver.savedCandidate(saved, resolution) || resolution.selected;
    if (request !== lookupRequest) return;
    const reference=window.BibliothekPronounReference;
    const pronounCandidates=[...resolution.candidates,...lemmaResolver.match(word)].filter(reference.isPronoun).filter((candidate,index,all)=>all.findIndex(other=>other.dictionaryId===candidate.dictionaryId)===index);
    let showPronounSummary=pronounCandidates.length>0 && (!resolution.selected || reference.isPronoun(resolution.selected));
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
    const candidateText = candidate => window.BibliothekMeaningDisplay.brief(candidate, locale()) || window.BibliothekMeaningDisplay.brief(candidate, "en");
    const candidateLabel = candidate => {
      const id = candidate.dictionaryId;
      if (candidate.construction?.id === "separable-verb") return candidate.construction.confidence === "tentative"
        ? locale() === "ru" ? "возможный отделяемый глагол" : "possible separable verb"
        : locale() === "ru" ? "отделяемый глагол" : "separable verb";
      if (candidate.construction?.id === "reflexive-verb") return locale() === "ru" ? "Возвратный глагол" : "Reflexive verb";
      if (["pronoun-013","pronoun-014","pronoun-015"].includes(id)) return locale() === "ru" ? "притяжательное" : "possessive";
      if (id === "pronoun-004" && word.toLocaleLowerCase("de-DE") === "ihr") return locale() === "ru" ? "местоимение · ей" : "pronoun · to her";
      const type = window.BibliothekMeaningDisplay.pos(candidate);
      const label = locale() === "ru" ? ({Verb:"Глагол",Nomen:"Существительное",Pronomen:"Местоимение",Adjektiv:"Прилагательное",Adverb:"Наречие",Konjunktion:"Союз"}[type] || type) : ({Nomen:"Noun",Pronomen:"Pronoun",Adjektiv:"Adjective",Adverb:"Adverb",Konjunktion:"Conjunction"}[type] || type);
      return label;
    };
    const candidateMeaning = (candidate, text, displayLanguage, separator) => {
      const englishFallback = locale() === "ru" && displayLanguage === "en";
      return `${candidateLabel(candidate)}${englishFallback ? " · английский: " : separator}${text}`;
    };
    const renderSelection = () => {
      const candidate = selectedResolution;
      const ru = locale() === "ru";
      activePronouns=showPronounSummary ? pronounCandidates : [];
      const referencePronoun = showPronounSummary;
      content.textContent = referencePronoun ? reference.brief(pronounCandidates,word,locale()) : candidate ? candidateMeaning(candidate,candidateText(candidate),
        ru && window.BibliothekMeaningDisplay.brief(candidate,"ru") ? "ru" : "en"," · ") :
        resolution.candidates.length ? ru ? "Выберите значение слова в этом контексте:" : "Choose the meaning used here:" :
        resolution.error ? ru ? "Не удалось загрузить словарь. Попробуйте ещё раз." : "The dictionary could not be loaded. Please try again." :
        resolution.unresolvedMeanings.length ? `${ru ? "английский: " : ""}${resolution.unresolvedMeanings.join("; ")}` :
        ru ? "Значение слова не найдено." : "No dictionary meaning found.";
      content.lang = referencePronoun ? locale() : ru && candidate?.translation.ru ? "ru" : candidate ? "en" : locale();
      $("popover-alternatives").querySelector("summary").textContent = ru ? "Другие значения" : "Other meanings";
      if (!referencePronoun && usageNote(candidate)) {
        const note = document.createElement("small"); note.className = "popover-construction";
        note.textContent = usageNote(candidate); content.append(note);
      }
      if (!referencePronoun && candidate?.construction) {
        const group = document.createElement("small"); group.className = "popover-construction";
        group.textContent = candidate.construction.id === "separable-verb"
          ? candidate.construction.spans.map(span => span.text).join(" … ")
          : candidate.construction.note?.[locale()] || `${candidate.construction.label} ${locale() === "ru" ? "с" : "with"} ${candidate.construction.lemma}`;
        content.append(group);
        if (candidate.construction.id === "reflexive-verb") {
          group.textContent = candidate.construction.spans.map(s=>s.text).join(" … ");
          const complement = candidate.construction.complement;
          if (complement) {
            const note = document.createElement("small"); note.className = "popover-construction";
            note.textContent = `${complement.pattern} — ${ru ? complement.note_ru : complement.note_en}`;
            content.append(note);
          }
        }
      }
      if (referencePronoun && linkedReflexive) {
        const link = document.createElement("button"); link.type = "button"; link.className = "lemma-choice reflexive-link";
        link.textContent = `${ru ? "Связанный глагол" : "Linked verb"}: ${linkedReflexive.lemma}`;
        link.addEventListener("click",()=>chooseCandidate(linkedReflexive)); content.append(link);
      }
      $("popover-word").textContent = referencePronoun ? word : candidate ? window.BibliothekMeaningDisplay.heading(candidate) : word;
      $("popover-more").hidden = !selectedEntry;
      $("popover-more").firstChild.textContent=showPronounSummary ? (ru ? "Справка о местоимениях " : "Pronoun reference ") : "Dictionary details ";
      $("popover-source").hidden = candidate ? candidate.source !== "fallback" : !resolution.unresolvedMeanings.length && !resolution.candidates.some(c => c.source === "fallback");
      if (notes.open && !notes.hidden) $("popover-source").hidden = false;
      paintActiveWord(candidate);
      if(showPronounSummary)popupAmbiguous=false;
      renderChoices();
    };
    const chooseCandidate = async candidate => {
        if (request !== lookupRequest) return;
        showPronounSummary=reference.isPronoun(candidate);
        popupAmbiguous = false; selectedResolution = candidate; selectedEntry = candidate.item || null;
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
      displayed.forEach(({candidate, text, language}) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "lemma-choice";
      if(candidate.dictionaryId)button.dataset.dictionaryId=candidate.dictionaryId;
      button.textContent = `${window.BibliothekMeaningDisplay.heading(candidate)} · ${candidateMeaning(candidate,text,language," — ")}`;
      button.addEventListener("click",()=>chooseCandidate(candidate));
      choices.append(button);
      });
    };
    let renderedLanguage = locale(), languageRevision = 0;
    refreshPopupLanguage = async () => {
      const language = locale();
      if (request !== lookupRequest || language === renderedLanguage) return;
      renderedLanguage = language;
      const revision = ++languageRevision;
      // Repaint immediately; fetching Russian values must not keep English UI
      // frozen or recompute the user's chosen lemma.
      renderSelection();
      if (!$sheet.hidden && selectedEntry) renderDictionaryDetails();
      await window.BibliothekRussianTranslations?.enrich(resolution,language);
      if (request !== lookupRequest || revision !== languageRevision || locale() !== language) return;
      renderSelection();
      if (!$sheet.hidden && selectedEntry) renderDictionaryDetails();
    };
    notes.ontoggle = () => { if (request === lookupRequest) renderSelection(); };
    renderSelection();
    await refreshBookmark(request);
    if (request !== lookupRequest) return;
    $popover.hidden = false;
    if (anchor) {
      const box = $popover.getBoundingClientRect();
      const gap = 8, edge = 12;
      const left = Math.max(edge, Math.min(window.innerWidth - box.width - edge, anchor.left + anchor.width / 2 - box.width / 2));
      const above = anchor.top - box.height - gap;
      const top = above >= edge ? above : Math.min(window.innerHeight - box.height - edge, anchor.bottom + gap);
      $popover.style.left = `${left}px`;
      $popover.style.top = `${Math.max(edge, top)}px`;
    }
  }
  function renderDictionaryDetails() {
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
  function renderDictionaryCard(item) {
    const root = $("dictionary-card");
    root.replaceChildren();
    delete root.dataset.pronounReference;
    if(window.BibliothekPronounReference.excluded(item)){
      window.BibliothekPronounReference.render(root,item,locale(),selectedWord);
      return;
    }
    const addInfo = (tag, cls, text) => { if (!text) return; const el = document.createElement(tag); el.className = cls; el.textContent = text; root.append(el); };
    const formKey = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
    const clickedForm = formKey(selectedWord);
    const construction = ["separable-verb","reflexive-verb"].includes(selectedResolution?.construction?.id)
      ? (selectedResolution.construction.id === "reflexive-verb" ? selectedResolution.construction.spans.slice(0,2) : selectedResolution.construction.spans).map(span => formKey(span.text)).join(" ") : "";
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
    addInfo("p","dictionary-pos",item.parts_of_speech?.join(" / ") || item.type);
    if (selectedResolution?.dictionaryId === item.id) addInfo("p","dictionary-detail",usageNote(selectedResolution));
    addInfo("p","dictionary-translation",selectedResolution?.dictionaryId === item.id ?
      (locale() === "ru" ? selectedResolution.translation.ru || selectedResolution.translation.en : selectedResolution.translation.en || selectedResolution.translation.ru) : translation(item));
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
    addInfo("p","dictionary-detail",locale() === "ru" ? item.usage_note_ru || item.notes_ru : item.usage_note_en || item.notes_en);
    if (item.word_order_rule) addInfo("p","dictionary-detail",`Wortstellung: ${item.word_order_rule}`);
    if (item.word_order_pattern) addInfo("p","dictionary-detail",`Muster: ${item.word_order_pattern}`);
    if (Array.isArray(item.complements) && item.complements.length) {
      const parts = item.complements.map(value => `${value.pattern}${(locale() === "ru" ? value.note_ru : value.note_en) ? ` — ${locale() === "ru" ? value.note_ru : value.note_en}` : ""}`);
      addInfo("p","dictionary-detail",`Ergänzungen: ${parts.join(" · ")}`);
    }
    if (item.type === "Pronomen") {
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
          values.forEach(value => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
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
  function paintActiveWord(candidate) {
    $text.querySelectorAll(".is-active-word").forEach(span => span.classList.remove("is-active-word"));
    if (!activeWordSpan?.isConnected) return;
    activeWordSpan.classList.add("is-active-word");
    const context = selectedContext, construction = candidate?.construction;
    if (!context || !construction) return;
    const origin = context.location.tokenOffset - context.tokenOffset;
    const paragraph = activeWordSpan.closest("[data-paragraph]");
    paragraph?.querySelectorAll(".reading-word").forEach(span => {
      const offset = Number(span.dataset.tokenOffset) - origin;
      if (construction.spans.some(part => part.start === offset && part.text === span.textContent)) span.classList.add("is-active-word");
    });
  }
  function closePopups() {
    lookupRequest++; refreshPopupLanguage = null; $popover.hidden = true; $sheet.hidden = true;
    activeWordSpan = null; paintActiveWord(null);
  }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
    activeWordSpan = span;
    paintActiveWord(null);
    $popover.hidden = true; $sheet.hidden = true;
    selectedWord = span.textContent;
    const paragraph = span.closest("[data-paragraph]");
    let sentence = paragraph?.textContent || "";
    let tokenOffset = Number(span.dataset.tokenOffset);
    if (typeof Intl.Segmenter === "function") {
      const offset = Number(span.dataset.tokenOffset);
      for (const part of new Intl.Segmenter("de", {granularity:"sentence"}).segment(sentence)) {
        if (part.index <= offset && offset < part.index + part.segment.length) { sentence = part.segment.trim(); tokenOffset = offset - part.index - (part.segment.length - part.segment.trimStart().length); break; }
      }
    }
    selectedContext = currentBook && paragraph ? {
      bookId:currentBook.id, sentence, tokenOffset,
      location:{chapterIndex:hasChapters(currentBook) ? currentBook.chapterIndex : 0, paragraphIndex:Number(paragraph.dataset.paragraph), tokenOffset:Number(span.dataset.tokenOffset)}
    } : null;
    openWordPopup(selectedWord, span.getBoundingClientRect());
  }

  $("add-book").addEventListener("click", () => { reloadBookId=null; $file.click(); });
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
    const form = $("paste-form");
    form.hidden = !form.hidden;
    $("paste-toggle").setAttribute("aria-expanded", String(!form.hidden));
    if (!form.hidden) $("paste-title").focus();
  });
  $("paste-form").addEventListener("submit", async event => {
    event.preventDefault();
    const title = $("paste-title").value.trim(); const content = $("paste-content").value.trim();
    if (!title || !content) return;
    try {
      reloadBookId=null;
      await importBook(await window.BibliothekImport.fromText(title, content));
      $("paste-form").reset(); $("paste-form").hidden = true; $("paste-toggle").setAttribute("aria-expanded", "false"); await refreshBooks(); showToast("Text saved on this device.");
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
  $("popover-more").addEventListener("click", () => { if (!selectedEntry) return; renderDictionaryDetails(); $popover.hidden = true; $sheet.hidden = false; });
  $("sheet-close").addEventListener("click", closePopups);
  $("sheet-scrim").addEventListener("click", closePopups);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !sourcesDialog.open) closePopups(); });
  loadDictionary().catch(error => console.warn("Bibliothek dictionary unavailable", error));
  refreshBooks();
})();
