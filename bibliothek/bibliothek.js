(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORE = "books";
  const $library = $("library"), $reading = $("reading-view"), $bookList = $("book-list");
  const $file = $("book-file"), $text = $("reading-text"), $popover = $("word-popover"), $sheet = $("dictionary-sheet");
  let currentBook = null, selectedEntry = null, toastTimer = null, restoringPosition = false;
  let dictionary = null, dictionaryPromise = null;
  let pendingDelete = null, deleteTrigger = null, deleting = false;
  let switchingChapter = false, renderRequest = 0, renderedWordLengths = [];
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
        if (entry) await navigateTo(entry);
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const paragraph = $text.querySelector(`[data-paragraph="${occurrence.paragraphIndex}"]`);
      const target = paragraph?.querySelector(`[data-token-offset="${occurrence.tokenOffset}"]`) || paragraph;
      if (target) { target.scrollIntoView({block:"center",behavior:"instant"}); target.focus({preventScroll:true}); await updateProgress(currentBook,occurrence.paragraphIndex); }
    }
  });

  function updateExplainerLanguage() {
    const lang = locale();
    const intro = $("reader-intro");
    intro.lang = lang;
    const sentences = lang === "ru"
      ? ["Читайте в своём темпе.", "Нажмите на слово, чтобы узнать его значение."]
      : ["Read at your own pace.", "Tap a word to see its meaning."];
    const sentenceBreak = document.createElement("span");
    sentenceBreak.className = "intro-break";
    sentenceBreak.append(document.createElement("br"));
    intro.replaceChildren(document.createTextNode(sentences[0]), sentenceBreak, document.createTextNode(` ${sentences[1]}`));
  }
  window.addEventListener("storage", event => {
    if (event.key === window.DeutschTranslation?.KEY || event.key === null) updateExplainerLanguage();
  });
  window.addEventListener("pageshow", updateExplainerLanguage);
  window.addEventListener("focus", updateExplainerLanguage);
  updateExplainerLanguage();

  const openDb = () => window.BibliothekVocabulary.openDb();
  async function allBooks() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      let books = [];
      req.onsuccess = () => {
        books = req.result;
        // Older books have no upload date. Freeze their current order once.
        books.forEach(book => {
          if (!Number.isFinite(book.createdAt)) {
            book.createdAt = Number(book.updatedAt) || 0;
            store.put(book);
          }
        });
      };
      tx.oncomplete = () => resolve(books.sort((a,b) => b.createdAt - a.createdAt || String(a.id).localeCompare(String(b.id))));
      tx.onerror = tx.onabort = () => reject(tx.error || req.error);
    });
  }
  async function saveBook(book) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(book);
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not save this book"));
    });
    try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (e) {}
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
      action.href = "../wortschatz/index.html";
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
      const hasSecondPage = splitParagraphs(book.content).length > 1;
      const started = hasSecondPage && Boolean(book.readingStarted || Number(book.position) > 0 || Number(book.chapterIndex) > 0);
      const completed = started && Boolean(book.completed);
      button.querySelector(".book-icon").textContent = coverInitials(book.title);
      button.querySelector(".book-icon").classList.toggle("is-started", started);
      button.querySelector(".book-icon").classList.toggle("is-completed", completed);
      button.setAttribute("aria-label", `${book.title}${completed ? ", finished" : started ? ", started" : ""}`);
      button.querySelector(".book-title").textContent = book.title;
      const words = (book.content.match(/[\p{L}\p{M}]+/gu) || []).length;
      const resume = hasChapters(book) && started ? activeEntry({ ...book, chapterIndex: book.chapterIndex || 0, position: book.position || 0 }) : null;
      button.querySelector(".book-subtitle").textContent = completed ? "Finished" : resume ? `Continue · ${resume.title}` : `${words.toLocaleString()} words · ${book.name || "Pasted text"}`;
      button.addEventListener("click", () => openBook(book));
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
    $("confirm-delete").disabled = true;
    $("cancel-delete").disabled = true;
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE, window.BibliothekVocabulary.STORE], "readwrite");
        tx.objectStore(STORE).delete(id);
        window.BibliothekVocabulary.deleteBookMarks(tx, id);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not delete this book"));
      });
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
    const paragraphs = [...$text.querySelectorAll("[data-paragraph]")];
    const visible = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > readingTop());
    return Number(paragraphs[visible < 0 ? Math.max(0, paragraphs.length - 1) : visible]?.dataset.paragraph) || 0;
  }
  function readingTop() {
    return $("back-library").parentElement.getBoundingClientRect().bottom + 8;
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
  async function navigateTo(entry, restore = false) {
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
      renderBookText(book);
      const heading = $("book-headline").hidden ? $text.firstElementChild : $("book-headline");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      await updateProgress(book, book.position);
    } finally { switchingChapter = false; }
  }
  const contentsDialog = $("contents-dialog");
  function renderContents() {
    const query = norm($("contents-search").value), active = activeEntry(currentBook);
    const list = $("contents-list"); list.replaceChildren();
    for (const entry of contentsFor(currentBook)) {
      if (query && !norm([...(entry.parentTitles || []), entry.title].join(" ")).includes(query)) continue;
      const row = document.createElement(entry.navigable ? "button" : "div");
      row.className = "contents-entry"; row.style.setProperty("--depth", Math.min(entry.depth || 0, 4));
      const title = document.createElement("span"); title.textContent = entry.title; row.append(title);
      if (query && entry.parentTitles?.length) {
        const context = document.createElement("small"); context.textContent = entry.parentTitles.join(" › "); row.append(context);
      }
      if (entry.navigable) {
        row.type = "button";
        if (active && entryKey(entry) === entryKey(active)) {
          row.setAttribute("aria-current", "location");
          const marker = document.createElement("small"); marker.textContent = "Currently reading"; row.append(marker);
        }
        row.addEventListener("click", async () => { contentsDialog.close(); await navigateTo(entry, true); });
      } else row.classList.add("contents-group");
      list.append(row);
    }
    $("contents-empty").hidden = Boolean(list.children.length);
  }
  $("contents-toggle").addEventListener("click", () => {
    closePopups(); $("contents-search").value = "";
    $("contents-book-title").textContent = currentBook.title;
    $("contents-search-label").hidden = contentsFor(currentBook).length < 15;
    renderContents(); contentsDialog.showModal();
    const active = $("contents-list").querySelector('[aria-current]');
    if (active) { active.scrollIntoView({ block: "center" }); active.focus({ preventScroll: true }); }
  });
  $("contents-close").addEventListener("click", () => contentsDialog.close());
  contentsDialog.addEventListener("close", () => $("contents-toggle").focus({ preventScroll: true }));
  contentsDialog.addEventListener("click", event => { if (event.target === contentsDialog) {
    const bounds = contentsDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) contentsDialog.close();
  } });
  $("contents-search").addEventListener("input", renderContents);
  function renderChapterNavigation(book) {
    $("contents-toggle").hidden = !hasChapters(book);
    $("chapter-progress-track").hidden = !hasChapters(book);
    const end = $("chapter-end"); end.replaceChildren(); end.hidden = !hasChapters(book);
    if (!hasChapters(book)) return;
    const entries = readingEntries(book), active = activeEntry(book), index = entries.indexOf(active);
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
    renderedWordLengths = [...$text.querySelectorAll("[data-paragraph]")].map(p => (p.textContent.match(/[\p{L}\p{M}]+/gu) || []).length);
    currentBook = book;
    refreshHighlights();
    renderChapterNavigation(book);
    vocabularyPanel.updateCount();
    $("book-headline").textContent = active?.title || (hasChapters(book) ? book.chapters[book.chapterIndex].title : book.title);
    const first = $text.firstElementChild;
    $("book-headline").hidden = Boolean(first && /^H[1-6]$/.test(first.tagName) && norm(first.textContent).replace(/[.!?:;]+$/u, "") === norm($("book-headline").textContent).replace(/[.!?:;]+$/u, ""));
    $("toolbar-title").textContent = book.title;
    $("toolbar-title").title = book.title;
    $("reader").querySelector(".reader-header").hidden = true;
    $library.hidden = true;
    $("library-actions").hidden = true;
    document.body.classList.remove("library-screen");
    $reading.hidden = false;
    setProgress();
    const position = Math.max(0, Number(book.position) || 0);
    const target = $text.querySelector(`[data-paragraph="${position}"]`);
    restoringPosition = true;
    window.scrollTo({ top:0, behavior:"instant" });
    requestAnimationFrame(() => {
      if (request !== renderRequest || currentBook !== book) return;
      // The beginning includes the book header, not just the first paragraph.
      if (position > start && target) {
        const toolbarHeight = $("back-library").parentElement.getBoundingClientRect().height;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - toolbarHeight - 8;
        window.scrollTo({ top:Math.max(0, targetTop), behavior:"instant" });
      }
      requestAnimationFrame(() => { if (request === renderRequest) restoringPosition = false; });
    });
  }
  function setProgress() {
    if (!currentBook) return;
    const paragraphs = [...$text.querySelectorAll("[data-paragraph]")];
    const index = Math.max(0, Number(currentBook.position) || 0);
    if (!hasChapters(currentBook)) {
      $("reading-progress").textContent = paragraphs.length ? `${Math.min(index + 1, paragraphs.length)} / ${paragraphs.length}` : ""; return;
    }
    const active = activeEntry(currentBook), chapters = readingEntries(currentBook).filter(entry => !entry.frontMatter);
    const number = chapters.findIndex(entry => entryKey(entry) === entryKey(active));
    $("reading-progress").textContent = number >= 0 ? `Chapter ${number + 1} of ${chapters.length}` : (active?.title || "Reading");
    const lengths = renderedWordLengths;
    const passed = paragraphs.reduce((sum, p, i) => sum + (Number(p.dataset.paragraph) < index ? lengths[i] : 0), 0);
    const total = lengths.reduce((sum, length) => sum + length, 0);
    const last = paragraphs.at(-1), atEnd = last && window.scrollY > 0 && last.getBoundingClientRect().bottom <= innerHeight;
    $("chapter-progress-fill").style.width = `${atEnd ? 100 : total ? passed / total * 100 : 0}%`;
  }
  async function openBook(book) {
    closePopups();
    renderBookText(book);
    document.title = `${book.title} · Bibliothek`;

  }
  let lemmaResolver = null, selectedResolution = null;
  async function loadDictionary() {
    if (dictionary) return dictionary;
    if (dictionaryPromise) return dictionaryPromise;
    const get = (path, revision) => fetch(`../worterbuch/${path}${revision ? `?v=${revision}` : ""}`).then(r => { if (!r.ok) throw new Error("dictionary load failed"); return r.json(); });
    dictionaryPromise = Promise.all([get("german-nouns.json"),get("german-verbs.json", "20261006-4"),get("german-adjectives.json"),get("german-adverbs.json"),get("german-conjunctions.json"),get("german-pronouns.json")])
      .then(([nouns,verbs,adjectives,adverbs,conjunctions,pronouns]) => {
        dictionary = [
          ...nouns.map(x => ({ ...x, word:x.word, type:"Nomen" })),
          ...verbs.map(x => ({ ...x, word:x.infinitive, type:"Verb" })),
          ...adjectives.map(x => ({ ...x, type:"Adjektiv" })),
          ...adverbs.map(x => ({ ...x, type:"Adverb" })),
          ...conjunctions.map(x => ({ ...x, type:"Konjunktion" })),
          ...pronouns.map(x => ({ ...x, type:"Pronomen" }))
        ];
        lemmaResolver = window.BibliothekLemmaResolver.create(dictionary, window.DeutschFallbackDictionary);
        return dictionary;
      }).catch(error => { dictionaryPromise = null; throw error; });
    return dictionaryPromise;
  }
  let lookupRequest = 0;
  async function openWordPopup(word, anchor) {
    const request = ++lookupRequest;
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
    let saved = null;
    try { saved = context ? await window.BibliothekMeaningSelections.get(context) : null; } catch (_) {}
    if (saved) resolution.selected = resolution.candidates.find(c => window.BibliothekVocabulary.identity(c) === saved) || resolution.selected;
    if (request !== lookupRequest) return;
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
    notes.hidden = !resolution.formNotes?.length; notes.open = false;
    noteText.replaceChildren();
    for (const note of resolution.formNotes || []) {
      const text = document.createElement("p"); text.textContent = note.meanings.join(" · "); noteText.append(text);
    }
    const alternatives = $("popover-alternatives"), choices = $("popover-choices");
    alternatives.hidden = resolution.candidates.length < 2;
    alternatives.open = !resolution.selected;
    choices.replaceChildren();
    const candidateText = candidate => locale() === "ru" ? candidate.translation.ru || candidate.translation.en : candidate.translation.en || candidate.translation.ru;
    const candidateLabel = candidate => {
      const id = candidate.dictionaryId;
      if (candidate.construction?.id === "separable-verb") return locale() === "ru" ? "отделяемый глагол" : "separable verb";
      if (["pronoun-013","pronoun-014","pronoun-015"].includes(id)) return locale() === "ru" ? "притяжательное" : "possessive";
      if (id === "pronoun-004" && word.toLocaleLowerCase("de-DE") === "ihr") return locale() === "ru" ? "местоимение · ей" : "pronoun · to her";
      return candidate.additional ? `${candidate.posLabel || candidate.pos} · Wiktionary` : candidate.posLabel || candidate.pos;
    };
    const renderSelection = () => {
      const candidate = selectedResolution;
      content.textContent = candidate ? `${candidateLabel(candidate)} · ${candidateText(candidate)}` :
        resolution.candidates.length ? "Choose the meaning used here:" :
        resolution.error ? "The dictionary could not be loaded. Please try again." : resolution.unresolvedMeanings.join("; ") || "No dictionary meaning found.";
      if (candidate?.construction?.id === "separable-verb") {
        const group = document.createElement("small"); group.className = "popover-construction";
        group.textContent = candidate.construction.spans.map(span => span.text).join(" … ");
        content.append(group);
      }
      $("popover-word").textContent = candidate ? `${candidate.item?.article ? candidate.item.article + " " : ""}${candidate.lemma}` : word;
      $("popover-more").hidden = !selectedEntry;
      $("popover-source").hidden = candidate ? candidate.source !== "fallback" : !resolution.unresolvedMeanings.length && !resolution.candidates.some(c => c.source === "fallback");
      if (notes.open && !notes.hidden) $("popover-source").hidden = false;
      choices.querySelectorAll("button").forEach((button,i) => button.setAttribute("aria-pressed", String(resolution.candidates[i] === candidate)));
    };
    resolution.candidates.forEach(candidate => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "lemma-choice";
      button.textContent = `${candidate.item?.article ? candidate.item.article + " " : ""}${candidate.lemma} · ${candidateLabel(candidate)} — ${candidateText(candidate)}`;
      button.addEventListener("click", async () => {
        if (request !== lookupRequest) return;
        popupAmbiguous = false; selectedResolution = candidate; selectedEntry = candidate.item || null;
        $("popover-bookmark").disabled = true;
        renderSelection();
        // Keep choices reachable after selection; remember only this occurrence.
        try {
          if (context) {
            await window.BibliothekMeaningSelections.set(context, window.BibliothekVocabulary.identity(candidate));
            const records = await window.BibliothekVocabulary.list(context.bookId);
            for (const record of records) {
              if (record.occurrences.some(o => o.chapterIndex === context.location.chapterIndex && o.paragraphIndex === context.location.paragraphIndex && o.tokenOffset === context.location.tokenOffset))
                await window.BibliothekVocabulary.resolveOccurrence(context.bookId, record.key, context.location, candidate);
            }
            refreshHighlights(); vocabularyPanel.updateCount();
          }
        } catch (_) { if (request === lookupRequest) showToast("Meaning selected, but the correction could not be saved."); }
        if (request === lookupRequest) refreshBookmark(request);
      });
      choices.append(button);
    });
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
  function renderDictionaryCard(item) {
    const root = $("dictionary-card");
    root.replaceChildren();
    const addInfo = (tag, cls, text) => { if (!text) return; const el = document.createElement(tag); el.className = cls; el.textContent = text; root.append(el); };
    const head = document.createElement("h2"); head.className = "dictionary-headword"; head.id = "sheet-word"; head.textContent = `${item.article ? item.article + " " : ""}${item.word}`; root.append(head);
    addInfo("p","dictionary-pos",item.type);
    addInfo("p","dictionary-translation",selectedResolution?.dictionaryId === item.id ?
      (locale() === "ru" ? selectedResolution.translation.ru || selectedResolution.translation.en : selectedResolution.translation.en || selectedResolution.translation.ru) : translation(item));
    if (item.plural) addInfo("p","dictionary-detail",`Plural: ${item.plural}`);
    addInfo("p","dictionary-detail",locale() === "ru" ? item.plural_note_ru : item.plural_note_en);
    if (item.declension_forms) addInfo("p","dictionary-detail",`Deklination: ${item.declension_forms}`);
    addInfo("p","dictionary-detail",locale() === "ru" ? item.declension_note_ru : item.declension_note_en);
    if (item.perfect_form) addInfo("p","dictionary-detail",`Perfekt: ${item.perfect_form}`);
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
    } else if (item.forms && typeof item.forms === "object") {
      Object.entries(item.forms).forEach(([tense, forms]) => {
        const values = Object.entries(forms || {}).map(([person, form]) => `${person}: ${form}`).join(" · ");
        if (values) addInfo("p","dictionary-detail",`${tense}: ${values}`);
      });
    }
    const example = item.example_de;
    if (example) {
      const block = document.createElement("p"); block.className = "dictionary-example"; block.textContent = example;
      const tr = document.createElement("span"); tr.className = "dictionary-example-translation"; tr.textContent = locale() === "ru" ? item.example_ru || item.example_en || "" : item.example_en || item.example_ru || ""; block.append(tr); root.append(block);
    }
    const button = document.createElement("button"); button.className = "dictionary-add"; button.type = "button"; button.textContent = "＋ Add to Wortschatz";
    button.addEventListener("click", () => addToWortschatz(item)); root.append(button);
  }
  function addToWortschatz(item) {
    const C = window.WortschatzCollection;
    if (!C) { showToast("Open Wortschatz to add this word to your collection."); return; }
    if (!C.isOwn()) {
      const request = { id:Date.now().toString(36) + Math.random().toString(36).slice(2), item };
      try {
        sessionStorage.setItem("deutschWortschatzPendingDictionaryWordV1", JSON.stringify(request));
        showToast("Continue in Wortschatz to add this word.", "Open Wortschatz");
      } catch (error) { showToast("Open Wortschatz to add this word.", "Open Wortschatz"); }
      return;
    }
    const paragraphs = hasChapters(currentBook) ? currentBook.chapters[currentBook.chapterIndex].paragraphs : splitParagraphs(currentBook?.content || "");
    const pIndex = Math.max(0, Number(currentBook?.position) || 0);
    const sentence = selectedContext?.sentence || paragraphs[pIndex] || "";
    const token = selectedWord || item.word;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(^|[^\\p{L}\\p{M}])(${escapedToken})(?=$|[^\\p{L}\\p{M}])`, "iu").exec(sentence);
    const exactOffset = selectedContext?.tokenOffset;
    const exactOccurrence = Number.isInteger(exactOffset) && sentence.slice(exactOffset, exactOffset + token.length) === token;
    const markedSentence = exactOccurrence ? sentence.slice(0,exactOffset) + `{{c1::${token}}}` + sentence.slice(exactOffset + token.length) : match ? sentence.slice(0, match.index) + match[1] + `{{c1::${match[2]}}}` + sentence.slice(match.index + match[0].length) : `{{c1::${token}}}`;
    try {
      const added = C.add([{ sentence:markedSentence, translation:selectedResolution?.translation || { en:item.translation_en || "", ru:item.translation_ru || "" }, sentenceTranslation:"", pos:item.type, base:`${item.article ? item.article + " " : ""}${item.word}` }]);
      showToast(added.added ? "Added to Wortschatz." : "This word is already in your Wortschatz.");
    } catch (error) { showToast("Could not add this word. Please check your Wortschatz collection."); }
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
  function closePopups() { lookupRequest++; $popover.hidden = true; $sheet.hidden = true; }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
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

  $("add-book").addEventListener("click", () => $file.click());
  $file.addEventListener("change", async () => {
    const file = $file.files?.[0];
    if (!file) return;
    try {
      const book = await window.BibliothekImport.fromFile(file);
      await saveBook(book);
      await refreshBooks();
      showToast("Saved on this device.");
    } catch (error) {
      showToast(error instanceof window.BibliothekImport.ImportError ? error.message : "The book could not be saved. Check available browser storage.");
    } finally { $file.value = ""; }
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
      await saveBook(window.BibliothekImport.fromText(title, content));
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
    if (book.readingStarted && !book.completed && !hasChapters(book) && window.scrollY > 0 && last.getBoundingClientRect().bottom <= window.innerHeight) {
      book.completed = true;
      changed = true;
    }
    return changed;
  }
  window.addEventListener("scroll", () => {
    if (restoringPosition || switchingChapter || !currentBook || $reading.hidden) return;
    const paragraphs = [...$text.querySelectorAll("[data-paragraph]")];
    const visibleNode = paragraphs.find(p => p.getBoundingClientRect().bottom > readingTop());
    if (!visibleNode) return;
    const visible = Number(visibleNode.dataset.paragraph);
    const statusChanged = updateBookmarkStatus(currentBook, visible);
    rememberEntry(currentBook, visible);
    if (visible !== Number(currentBook.position) || statusChanged) {
      currentBook.position = visible;
      if (hasChapters(currentBook)) currentBook.chapterPositions[currentBook.chapterIndex] = visible;
      setProgress();
      clearTimeout(window.__readingSaveTimer);
      const book = currentBook;
      window.__readingSaveTimer = setTimeout(() => updateProgress(book, visible), 700);
    } else setProgress();
  }, { passive:true });
  function flushReadingPosition() {
    if (!currentBook || $reading.hidden || switchingChapter) return;
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
  $("popover-more").addEventListener("click", () => { if (!selectedEntry) return; renderDictionaryCard(selectedEntry); $popover.hidden = true; $sheet.hidden = false; });
  $("sheet-close").addEventListener("click", () => $sheet.hidden = true);
  $("sheet-scrim").addEventListener("click", () => $sheet.hidden = true);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !sourcesDialog.open) closePopups(); });
  loadDictionary().catch(error => console.warn("Bibliothek dictionary unavailable", error));
  refreshBooks();
})();
