(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const DB_NAME = "deutschReadingModeV1";
  const STORE = "books";
  const $library = $("library"), $reading = $("reading-view"), $bookList = $("book-list");
  const $file = $("book-file"), $text = $("reading-text"), $popover = $("word-popover"), $sheet = $("dictionary-sheet");
  let dbPromise, currentBook = null, selectedEntry = null, longPressTimer = null, toastTimer = null;
  let dictionary = null, dictionaryPromise = null;
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const locale = () => window.DeutschTranslation?.getLang?.() || "en";
  const translation = item => locale() === "ru" ? item.translation_ru || item.translation_en : item.translation_en || item.translation_ru;

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
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.sort((a,b) => b.updatedAt - a.updatedAt));
      req.onerror = () => reject(req.error);
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
  function titleFromFilename(name) { return String(name || "").replace(/\.txt$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled text"; }

  function renderBooks(books) {
    $bookList.replaceChildren();
    $("empty-library").hidden = books.length > 0;
    books.forEach(book => {
      const button = document.createElement("button");
      button.className = "book-row";
      button.type = "button";
      button.innerHTML = `<span class="book-icon" aria-hidden="true">Aa</span><span class="book-meta"><span class="book-title"></span><span class="book-subtitle"></span></span><span class="book-arrow" aria-hidden="true">›</span>`;
      button.querySelector(".book-title").textContent = book.title;
      const words = (book.content.match(/[\p{L}\p{M}]+/gu) || []).length;
      button.querySelector(".book-subtitle").textContent = `${words.toLocaleString()} words · ${book.name || "Pasted text"}`;
      button.addEventListener("click", () => openBook(book));
      $bookList.append(button);
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
  function splitParagraphs(content) { return String(content || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); }
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
        span.setAttribute("aria-label", `${token}, long-press for translation`);
        fragment.append(span);
      } else fragment.append(document.createTextNode(token));
    });
    return fragment;
  }
  function renderBookText(book) {
    const paragraphs = splitParagraphs(book.content);
    $text.replaceChildren();
    paragraphs.forEach((paragraph, i) => {
      const p = document.createElement("p");
      p.dataset.paragraph = String(i);
      p.append(wrapParagraph(paragraph));
      $text.append(p);
    });
    currentBook = book;
    $("page-title").textContent = book.title;
    $("page-title").title = book.title;
    $("page-title").closest(".reader-heading").querySelector(".reader-kicker").textContent = "DEUTSCH · BIBLIOTHEK";
    $library.hidden = true;
    $reading.hidden = false;
    setProgress();
    const target = $text.querySelector(`[data-paragraph="${Math.max(0, Number(book.position) || 0)}"]`);
    requestAnimationFrame(() => target?.scrollIntoView({ block:"start" }));
  }
  function setProgress() {
    if (!currentBook) return;
    const paragraphs = [...$text.querySelectorAll("p")];
    const index = Math.max(0, Number(currentBook.position) || 0);
    $("reading-progress").textContent = paragraphs.length ? `${Math.min(index + 1, paragraphs.length)} / ${paragraphs.length}` : "";
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
    dictionaryPromise = Promise.all([get("german-nouns.json"),get("german-verbs.json"),get("german-adjectives.json"),get("german-adverbs.json"),get("german-conjunctions.json")])
      .then(([nouns,verbs,adjectives,adverbs,conjunctions]) => {
        dictionary = [
          ...nouns.map(x => ({ ...x, word:x.word, type:"Nomen" })),
          ...verbs.map(x => ({ ...x, word:x.infinitive, type:"Verb" })),
          ...adjectives.map(x => ({ ...x, type:"Adjektiv" })),
          ...adverbs.map(x => ({ ...x, type:"Adverb" })),
          ...conjunctions.map(x => ({ ...x, type:"Konjunktion" }))
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
  async function openWordPopup(word, anchor) {
    try { await loadDictionary(); }
    catch (error) { showToast("The Wörterbuch could not be loaded."); return; }
    const results = findEntry(word);
    selectedEntry = results[0] || null;
    $("popover-word").textContent = results.length ? results.map(item => `${item.article ? item.article + " " : ""}${item.word}`).join(" · ") : word;
    $("popover-translation").textContent = results.length ? results.map(translation).filter(Boolean).join(" · ") : "Not in Wörterbuch yet";
    $("popover-more").hidden = !results.length;
    $popover.hidden = false;
    if (anchor) $popover.style.setProperty("--tap-x", `${anchor.left + anchor.width / 2}px`);
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
    if (item.forms && typeof item.forms === "object") {
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
    const paragraphs = splitParagraphs(currentBook?.content || "");
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
  function closePopups() { $popover.hidden = true; $sheet.hidden = true; }
  function chooseWord(span) {
    if (!span || !span.isConnected) return;
    selectedWord = span.textContent;
    openWordPopup(selectedWord, span.getBoundingClientRect());
  }

  $("add-book").addEventListener("click", () => $file.click());
  $("empty-add").addEventListener("click", () => $file.click());
  $file.addEventListener("change", async () => {
    const file = $file.files?.[0];
    if (!file) return;
    try {
      const content = (await file.text()).replace(/^\uFEFF/, "");
      if (!content.trim()) { showToast("This file is empty."); return; }
      const book = { id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name:file.name, title:titleFromFilename(file.name), content, position:0, updatedAt:Date.now() };
      await saveBook(book);
      await refreshBooks();
      showToast("Saved on this device.");
    } catch (error) { showToast("The book could not be saved. Check available browser storage."); }
    $file.value = "";
  });
  $("paste-toggle").addEventListener("click", () => $("paste-form").hidden = !$("paste-form").hidden);
  $("paste-form").addEventListener("submit", async event => {
    event.preventDefault();
    const title = $("paste-title").value.trim(); const content = $("paste-content").value.trim();
    if (!title || !content) return;
    try {
      await saveBook({ id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name:"Pasted text", title, content, position:0, updatedAt:Date.now() });
      $("paste-form").reset(); $("paste-form").hidden = true; await refreshBooks(); showToast("Text saved on this device.");
    } catch (error) { showToast("The text could not be saved. Check available browser storage."); }
  });
  $("back-library").addEventListener("click", async () => {
    closePopups();
    if (currentBook) {
      const paragraphs = [...$text.querySelectorAll("p")];
      const visible = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > 110);
      await updateProgress(currentBook, Math.max(0, visible));
    }
    currentBook = null; $reading.hidden = true; $library.hidden = false; $("page-title").textContent = "Your books"; $("page-title").closest(".reader-heading").querySelector(".reader-kicker").textContent = "DEUTSCH · BIBLIOTHEK"; document.title = "Bibliothek · Deutsch.";
    refreshBooks();
  });
  $text.addEventListener("pointerdown", event => {
    const span = event.target.closest(".reading-word");
    if (!span || event.pointerType === "mouse") return;
    clearTimeout(longPressTimer);
    const x = event.clientX, y = event.clientY;
    longPressTimer = setTimeout(() => { chooseWord(span); longPressTimer = null; }, 430);
    const cancel = move => { if (Math.hypot(move.clientX - x, move.clientY - y) > 11) { clearTimeout(longPressTimer); longPressTimer = null; cleanup(); } };
    const up = () => { clearTimeout(longPressTimer); longPressTimer = null; cleanup(); };
    const cleanup = () => { window.removeEventListener("pointermove", cancel); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    window.addEventListener("pointermove", cancel, { passive:true }); window.addEventListener("pointerup", up, { once:true }); window.addEventListener("pointercancel", up, { once:true });
  });
  $text.addEventListener("dblclick", event => { const span = event.target.closest(".reading-word"); if (span) chooseWord(span); });
  $text.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".reading-word")) { event.preventDefault(); chooseWord(event.target); } });
  window.addEventListener("scroll", () => { if (!currentBook || $reading.hidden) return; const paragraphs = [...$text.querySelectorAll("p")]; const visible = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > 110); if (visible >= 0 && visible !== Number(currentBook.position)) { currentBook.position = visible; setProgress(); clearTimeout(window.__readingSaveTimer); window.__readingSaveTimer = setTimeout(() => updateProgress(currentBook, visible), 700); } }, { passive:true });
  $("popover-close").addEventListener("click", () => $popover.hidden = true);
  $("popover-more").addEventListener("click", () => { if (!selectedEntry) return; renderDictionaryCard(selectedEntry); $popover.hidden = true; $sheet.hidden = false; });
  $("sheet-close").addEventListener("click", () => $sheet.hidden = true);
  $("sheet-scrim").addEventListener("click", () => $sheet.hidden = true);
  document.addEventListener("pointerdown", event => { if (!$popover.hidden && !event.target.closest("#word-popover") && !event.target.closest(".reading-word")) $popover.hidden = true; });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePopups(); });
  loadDictionary().catch(error => console.warn("Bibliothek dictionary unavailable", error));
  refreshBooks();
})();
