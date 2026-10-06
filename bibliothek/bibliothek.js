(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const DB_NAME = "deutschReadingModeV1";
  const STORE = "books";
  const $library = $("library"), $reading = $("reading-view"), $bookList = $("book-list");
  const $file = $("book-file"), $text = $("reading-text"), $popover = $("word-popover"), $sheet = $("dictionary-sheet");
  let dbPromise, currentBook = null, selectedEntry = null, toastTimer = null, restoringPosition = false;
  let dictionary = null, dictionaryPromise = null;
  let pendingDelete = null, deleteTrigger = null, deleting = false;
  let switchingChapter = false, renderRequest = 0;
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const locale = () => window.DeutschTranslation?.getLang?.() || "en";
  const translation = item => locale() === "ru" ? item.translation_ru || item.translation_en : item.translation_en || item.translation_ru;

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

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB is unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local storage"));
    });
    return dbPromise;
  }
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
      button.querySelector(".book-subtitle").textContent = `${words.toLocaleString()} words · ${book.name || "Pasted text"}`;
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
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error || new Error("Could not delete this book"));
      });
      // Release the previous reader content as well as the persisted record.
      clearTimeout(window.__readingSaveTimer);
      currentBook = null;
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
    const paragraphs = [...$text.querySelectorAll("p")];
    const visible = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > readingTop());
    return visible < 0 ? Math.max(0, paragraphs.length - 1) : visible;
  }
  function readingTop() {
    return Math.max($("back-library").parentElement.getBoundingClientRect().bottom, $("chapter-navigation").hidden ? 0 : $("chapter-navigation").getBoundingClientRect().bottom) + 8;
  }
  function renderChapterNavigation(book) {
    $("chapter-navigation").hidden = !hasChapters(book);
    if (!hasChapters(book)) return;
    const select = $("chapter-select");
    select.replaceChildren();
    book.chapters.forEach((chapter, index) => {
      const option = document.createElement("option");
      option.value = String(index); option.textContent = `${index + 1}. ${chapter.title}`;
      select.append(option);
    });
    select.value = String(book.chapterIndex);
    $("previous-chapter").disabled = book.chapterIndex === 0;
    $("next-chapter").disabled = book.chapterIndex === book.chapters.length - 1;
  }
  async function changeChapter(index) {
    const book = currentBook;
    if (switchingChapter || !hasChapters(book) || index < 0 || index >= book.chapters.length || index === book.chapterIndex) return;
    switchingChapter = true;
    closePopups(); clearTimeout(window.__readingSaveTimer);
    await updateProgress(book, restoringPosition ? book.position : visibleParagraph());
    book.chapterIndex = index;
    prepareChapterPosition(book);
    renderBookText(book);
    await updateProgress(book, book.position);
    switchingChapter = false;
  }
  $("previous-chapter").addEventListener("click", () => changeChapter(currentBook.chapterIndex - 1));
  $("next-chapter").addEventListener("click", () => changeChapter(currentBook.chapterIndex + 1));
  $("chapter-select").addEventListener("change", event => changeChapter(Number(event.target.value)));
  function wrapParagraph(paragraph) {
    const fragment = document.createDocumentFragment();
    const tokens = paragraph.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|[^\p{L}\p{M}]+/gu) || [paragraph];
    tokens.forEach(token => {
      if (/^[\p{L}\p{M}]/u.test(token)) {
        const span = document.createElement("span");
        span.className = "reading-word";
        span.textContent = token;
        span.tabIndex = 0;
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", `${token}, tap for translation`);
        fragment.append(span);
      } else fragment.append(document.createTextNode(token));
    });
    return fragment;
  }
  function renderBookText(book) {
    prepareChapterPosition(book);
    const request = ++renderRequest;
    const paragraphs = hasChapters(book) ? book.chapters[book.chapterIndex].paragraphs : splitParagraphs(book.content);
    $text.replaceChildren();
    paragraphs.forEach((paragraph, i) => {
      const p = document.createElement("p");
      p.dataset.paragraph = String(i);
      p.append(wrapParagraph(paragraph));
      $text.append(p);
    });
    currentBook = book;
    renderChapterNavigation(book);
    $("book-headline").textContent = hasChapters(book) ? book.chapters[book.chapterIndex].title : book.title;
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
      if (position > 0 && target) {
        const toolbarHeight = $("back-library").parentElement.getBoundingClientRect().height + ($("chapter-navigation").hidden ? 0 : $("chapter-navigation").getBoundingClientRect().height);
        const targetTop = target.getBoundingClientRect().top + window.scrollY - toolbarHeight - 8;
        window.scrollTo({ top:Math.max(0, targetTop), behavior:"instant" });
      }
      requestAnimationFrame(() => { if (request === renderRequest) restoringPosition = false; });
    });
  }
  function setProgress() {
    if (!currentBook) return;
    const paragraphs = [...$text.querySelectorAll("p")];
    const index = Math.max(0, Number(currentBook.position) || 0);
    $("reading-progress").textContent = paragraphs.length ? `${hasChapters(currentBook) ? `${currentBook.chapterIndex + 1}/${currentBook.chapters.length} · ` : ""}${Math.min(index + 1, paragraphs.length)} / ${paragraphs.length}` : "";
  }
  async function openBook(book) {
    closePopups();
    renderBookText(book);
    document.title = `${book.title} · Bibliothek`;

  }
  let formIndex = null;
  async function loadDictionary() {
    if (dictionary) return dictionary;
    if (dictionaryPromise) return dictionaryPromise;
    const get = path => fetch(`../worterbuch/${path}`).then(r => { if (!r.ok) throw new Error("dictionary load failed"); return r.json(); });
    dictionaryPromise = Promise.all([get("german-nouns.json"),get("german-verbs.json"),get("german-adjectives.json"),get("german-adverbs.json"),get("german-conjunctions.json"),get("german-pronouns.json")])
      .then(([nouns,verbs,adjectives,adverbs,conjunctions,pronouns]) => {
        dictionary = [
          ...nouns.map(x => ({ ...x, word:x.word, type:"Nomen" })),
          ...verbs.map(x => ({ ...x, word:x.infinitive, type:"Verb" })),
          ...adjectives.map(x => ({ ...x, type:"Adjektiv" })),
          ...adverbs.map(x => ({ ...x, type:"Adverb" })),
          ...conjunctions.map(x => ({ ...x, type:"Konjunktion" })),
          ...pronouns.map(x => ({ ...x, type:"Pronomen" }))
        ];
        formIndex = new Map();
        const addForm = (form, item) => {
          const key = norm(form);
          if (!key) return;
          const forms = formIndex.get(key) || [];
          if (!forms.some(entry => entry.id === item.id)) forms.push(item);
          formIndex.set(key, forms);
        };
        dictionary.forEach(item => {
          addForm(item.word, item);
          (item.search_forms || []).forEach(form => addForm(form, item));
          if (item.article) addForm(`${item.article} ${item.word}`, item);
          if (item.type === "Nomen" && item.plural && item.plural !== "—") {
            item.plural.split(/\s*,\s*/).forEach(form => {
              addForm(form, item);
              addForm(`die ${form}`, item);
              if (!/[ns]$/iu.test(form)) addForm(`${form}n`, item);
            });
            if (!/[sßxzo]$/iu.test(item.word)) addForm(`${item.word}s`, item);
            if (/[sßxzo]$/iu.test(item.word)) addForm(`${item.word}es`, item);
          }
          if (item.type === "Verb") {
            Object.values(item.forms || {}).forEach(group => Object.values(group || {}).forEach(form => addForm(String(form).replace(/[.!?]+$/g, ""), item)));
            addForm(String(item.perfect_form || "").trim().split(/\s+/).pop(), item);
          }
        });
        return dictionary;
      }).catch(error => { dictionaryPromise = null; throw error; });
    return dictionaryPromise;
  }
  function findEntry(word) {
    if (!dictionary) return [];
    const query = norm(word);
    const exact = formIndex?.get(query);
    if (exact?.length) return exact;
    // Prototype fallback: common inflection endings against dictionary lemmas.
    const stripped = [query.replace(/(e|en|n|s|er|es)$/u, ""), query.replace(/(te|test|ten|tet)$/u, "")].filter(x => x.length >= 3);
    return dictionary.filter(item => stripped.includes(norm(item.word))).slice(0, 6);
  }
  let lookupRequest = 0;
  async function openWordPopup(word, anchor) {
    const request = ++lookupRequest;
    try { await loadDictionary(); }
    catch (error) { showToast("The Wörterbuch could not be loaded."); return; }
    if (request !== lookupRequest) return;
    const results = findEntry(word);
    selectedEntry = results[0] || null;
    $("popover-word").textContent = results.length ? results.map(item => `${item.article ? item.article + " " : ""}${item.word}`).join(" · ") : word;
    $("popover-translation").textContent = results.length ? results.map(translation).filter(Boolean).join(" · ") : "Not in Wörterbuch yet";
    $("popover-more").hidden = !results.length;
    $("popover-source").hidden = true;
    if (!results.length) {
      $popover.hidden = true;
      try {
        const groups = await window.DeutschFallbackDictionary.lookup(word);
        if (request !== lookupRequest) return;
        const content = $("popover-translation");
        content.replaceChildren();
        if (!groups.length) content.textContent = "No dictionary meaning found.";
        groups.forEach(group => {
          const section = document.createElement("span");
          section.className = "fallback-meaning-group";
          if (groups.length > 1 || norm(group.word) !== norm(word)) {
            const label = document.createElement("strong");
            label.textContent = group.word;
            section.append(label, document.createElement("br"));
          }
          section.append(document.createTextNode(group.meanings.join("; ")));
          content.append(section);
        });
        $("popover-source").hidden = !groups.length;
      } catch (error) {
        if (request !== lookupRequest) return;
        $("popover-translation").textContent = "The fallback dictionary could not be loaded. Please try again.";
      }
    }
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
    addInfo("p","dictionary-translation",translation(item));
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
    const sentence = paragraphs[pIndex] || "";
    const token = selectedWord || item.word;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(^|[^\\p{L}\\p{M}])(${escapedToken})(?=$|[^\\p{L}\\p{M}])`, "iu").exec(sentence);
    const markedSentence = match ? sentence.slice(0, match.index) + match[1] + `{{c1::${match[2]}}}` + sentence.slice(match.index + match[0].length) : `{{c1::${token}}}`;
    try {
      const added = C.add([{ sentence:markedSentence, translation:{ en:item.translation_en || "", ru:item.translation_ru || "" }, sentenceTranslation:"", pos:item.type, base:`${item.article ? item.article + " " : ""}${item.word}` }]);
      showToast(added.added ? "Added to Wortschatz." : "This word is already in your Wortschatz.");
    } catch (error) { showToast("Could not add this word. Please check your Wortschatz collection."); }
  }
  let selectedWord = "";
  function closePopups() { lookupRequest++; $popover.hidden = true; $sheet.hidden = true; }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
    selectedWord = span.textContent;
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
    currentBook = null; $reading.hidden = true; $library.hidden = false; $("library-actions").hidden = false; document.body.classList.add("library-screen"); $("reader").querySelector(".reader-header").hidden = false; window.scrollTo({ top:0, behavior:"instant" }); document.title = "Bibliothek · Deutsch.";
    refreshBooks();
  });
  // Consume outside clicks before word and navigation handlers run. Safari and
  // accessibility clicks do not reliably report pointerType or a click count.
  document.addEventListener("click", event => {
    if ($popover.hidden || sourcesDialog.open || event.target.closest("#word-popover")) return;
    closePopups();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  $text.addEventListener("click", event => { const span = event.target.closest(".reading-word"); if (span) chooseWord(span); });
  $text.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".reading-word")) { event.preventDefault(); chooseWord(event.target); } });
  function updateBookmarkStatus(book, paragraph) {
    const paragraphs = [...$text.querySelectorAll("p")];
    if (!paragraphs.length) return false;
    let changed = false;
    if ((paragraph >= 1 || (hasChapters(book) && book.chapterIndex > 0)) && !book.readingStarted) {
      book.readingStarted = true;
      changed = true;
    }
    const last = paragraphs[paragraphs.length - 1];
    if (book.readingStarted && !book.completed && (!hasChapters(book) || book.chapterIndex === book.chapters.length - 1) && window.scrollY > 0 && last.getBoundingClientRect().bottom <= window.innerHeight) {
      book.completed = true;
      changed = true;
    }
    return changed;
  }
  window.addEventListener("scroll", () => {
    if (restoringPosition || switchingChapter || !currentBook || $reading.hidden) return;
    const paragraphs = [...$text.querySelectorAll("p")];
    const visible = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > readingTop());
    if (visible < 0) return;
    const statusChanged = updateBookmarkStatus(currentBook, visible);
    if (visible !== Number(currentBook.position) || statusChanged) {
      currentBook.position = visible;
      if (hasChapters(currentBook)) currentBook.chapterPositions[currentBook.chapterIndex] = visible;
      setProgress();
      clearTimeout(window.__readingSaveTimer);
      const book = currentBook;
      window.__readingSaveTimer = setTimeout(() => updateProgress(book, visible), 700);
    }
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
