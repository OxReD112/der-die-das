(() => {
  const STORAGE_KEY = "deutschNotebookV1";
  const $ = id => document.getElementById(id);
  const app = $("notebook");
  if (!app) return;
  const els = {
    list: $("list-content"), status: $("status"), searchBox: $("search-box"), search: $("search-input"),
    headerBack: $("header-back"), headerSave: $("header-save"),
    tabs: [...document.querySelectorAll(".nb-tab")], detail: $("detail-screen"), edit: $("edit-screen"),
    form: $("note-form"), title: $("entry-title"), sub: $("entry-subline"), body: $("entry-body"), category: $("category-select"),
    topicInput: $("new-topic-input"), saveTopic: $("save-topic"), listToolbar: $("list-toolbar"), scroll: $("notebook-scroll"),
  };
  let state = readState(), view = "all", selectedTopic = "", query = "", editingId = null, openedId = null, pendingDeleteId = null, statusTimer = 0, searchOpen = false;
  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw || raw.version !== 1) return { version: 1, topics: [], notes: [] };
      return { version: 1, topics: Array.isArray(raw.topics) ? raw.topics.filter(x => typeof x === "string") : [], notes: Array.isArray(raw.notes) ? raw.notes.filter(x => x && typeof x.id === "string" && typeof x.title === "string") : [] };
    } catch (_) { return { version: 1, topics: [], notes: [] }; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (_) { notify("Speichern nicht möglich. Bitte prüfe den Speicherplatz auf diesem Gerät."); return false; }
  }
  function notify(message) { clearTimeout(statusTimer); els.status.textContent = message; els.status.hidden = false; statusTimer = setTimeout(() => { els.status.hidden = true; }, 3000); }
  function esc(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
  function allEntries() { return state.notes; }
  function animateContent(direction, target) {
    if (!direction || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !target.animate) return;
    const offset = direction === "forward" ? "20px" : "-20px";
    target.animate(
      [{ transform: `translateX(${offset})`, opacity: 0.55 }, { transform: "translateX(0)", opacity: 1 }],
      { duration: 180, easing: "cubic-bezier(.2,.75,.25,1)" }
    );
  }
  function setScreen(screen, direction = "none") {
    app.dataset.screen = screen;
    const list = screen === "list";
    els.detail.hidden = screen !== "detail"; els.edit.hidden = screen !== "edit";
    document.querySelector(".nb-tabs").hidden = !list;
    $("search-toggle").hidden = !list || searchOpen;
    els.headerBack.hidden = list;
    els.headerSave.hidden = screen !== "edit";
    $("close-notebook").hidden = screen === "edit";
    els.searchBox.hidden = !list || !searchOpen;
    els.list.hidden = !list; els.listToolbar.hidden = !list;
    els.scroll.scrollTop = 0;
    animateContent(direction, screen === "detail" ? els.detail : screen === "edit" ? els.edit : null);
  }
  function renderCategories() {
    const categories = [...new Set([...state.topics, ...state.notes.map(note => note.category).filter(Boolean)])];
    const entries = allEntries();
    els.list.innerHTML = categories.map(name => {
      const count = entries.filter(entry => entry.category === name).length;
      return `<button class="nb-row" type="button" data-topic="${esc(name)}"><span class="nb-row-copy"><strong>${esc(name)}</strong><small>${count} ${count === 1 ? "Eintrag" : "Einträge"}</small></span><span class="nb-arrow" aria-hidden="true">›</span></button>`;
    }).join("") || '<p class="nb-empty">Lege beim Schreiben dein erstes Thema an.</p>';
    els.list.querySelectorAll("[data-topic]").forEach(button => button.addEventListener("click", () => { selectedTopic = button.dataset.topic; renderList("forward"); }));
  }
  function renderList(direction = "none") {
    if (view === "topics" && !selectedTopic && !query) { renderCategories(); animateContent(direction, direction === "forward" ? els.list : null); return; }
    let entries = allEntries();
    if (view === "topics" && selectedTopic) entries = entries.filter(entry => entry.category === selectedTopic);
    if (query) { const q = query.toLocaleLowerCase(); entries = entries.filter(entry => [entry.title, entry.sub, entry.body, entry.category].join(" ").toLocaleLowerCase().includes(q)); }
    const back = selectedTopic ? '<button class="nb-row nb-topic-back" type="button" id="topic-back"><span class="nb-row-copy"><strong>‹ Alle Themen</strong></span></button>' : "";
    const rows = entries.map(entry => `<button class="nb-row" type="button" data-entry="${esc(entry.id)}"><span class="nb-row-copy">${entry.category ? `<small class="nb-row-category">${esc(entry.category)}</small>` : ""}<strong>${esc(entry.title)}</strong>${entry.sub ? `<small>${esc(entry.sub)}</small>` : ""}</span><span class="nb-arrow" aria-hidden="true">›</span></button>`).join("");
    els.list.innerHTML = back + (rows || '<p class="nb-empty">Hier ist noch nichts gespeichert.</p>');
    $("topic-back")?.addEventListener("click", () => { selectedTopic = ""; renderList("back"); });
    els.list.querySelectorAll("[data-entry]").forEach(button => button.addEventListener("click", () => openEntry(button.dataset.entry)));
    animateContent(direction, direction === "forward" && view === "topics" && selectedTopic ? els.list : null);
  }
  const pencilSvg = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 16.5 15.8 4.7a2.8 2.8 0 0 1 4 4L8 20.5 3 21l1-4.5Z"/><path d="m13.8 6.7 4 4"/></svg>';
  const trashSvg = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7m3.5 0-.8 13h-11L5.9 7M10 10.5v6m4-6v6"/></svg>';
  function openEntry(id) {
    const entry = allEntries().find(item => item.id === id); if (!entry) return;
    openedId = id; $("detail-topic").textContent = entry.category || ""; $("detail-title").textContent = entry.title;
    $("detail-sub").textContent = entry.sub || ""; $("detail-sub").hidden = !entry.sub; $("detail-body").textContent = entry.body || "";
    $("detail-actions").innerHTML = `<button class="nb-icon-action" id="edit-entry" type="button" aria-label="Bearbeiten">${pencilSvg}</button><button class="nb-icon-action" id="delete-entry" type="button" aria-label="Löschen">${trashSvg}</button>`;
    setScreen("detail", "forward");
    $("edit-entry")?.addEventListener("click", () => openEditor(entry));
    $("delete-entry")?.addEventListener("click", () => {
      pendingDeleteId = id;
      $("delete-confirm").hidden = false;
      $("cancel-delete").focus({ preventScroll:true });
    });
  }
  function fillCategories(selected = "") {
    const categories = [...new Set(state.topics.concat(state.notes.map(note => note.category).filter(Boolean)))];
    els.category.innerHTML = '<option value="">Ohne Thema</option>' + categories.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join(""); els.category.value = selected;
  }
  function openEditor(note = null) {
    editingId = note?.id || null; $("form-title").textContent = note ? "Notiz bearbeiten" : "Neue Notiz";
    els.title.value = note?.title || ""; els.sub.value = note?.sub || ""; els.body.value = note?.body || ""; fillCategories(note?.category || "");
    els.topicInput.hidden = true; els.saveTopic.hidden = true; $("add-topic").hidden = false; setScreen("edit", "forward");
  }
  function goBack() {
    if (!els.detail.hidden) { setScreen("list", "back"); renderList(); }
    else if (!els.edit.hidden) { setScreen(openedId ? "detail" : "list", "back"); if (!openedId) renderList(); }
    else closeNotebook();
  }
  function closeNotebook() {
    if (new URLSearchParams(location.search).has("embedded")) parent.postMessage({ type:"deutsch-notebook-close" }, location.origin);
    else location.href = "../../";
  }
  els.tabs.forEach(tab => tab.addEventListener("click", () => { view = tab.dataset.view; selectedTopic = ""; els.tabs.forEach(button => button.setAttribute("aria-selected", String(button === tab))); renderList(); }));
  function closeSearch({ restoreFocus = true } = {}) {
    if (!searchOpen) return;
    searchOpen = false;
    els.search.blur();
    els.search.value = "";
    query = "";
    selectedTopic = "";
    $("search-toggle").setAttribute("aria-expanded", "false");
    setScreen("list");
    renderList();
    if (restoreFocus) requestAnimationFrame(() => $("search-toggle").focus({ preventScroll: true }));
  }
  $("search-toggle").addEventListener("click", () => {
    searchOpen = true;
    $("search-toggle").setAttribute("aria-expanded", "true");
    setScreen("list");
    els.scroll.scrollTop = 0;
  });
  $("search-close").addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); closeSearch(); });
  els.search.addEventListener("input", () => { query = els.search.value.trim(); selectedTopic = ""; renderList(); });
  $("create-note").addEventListener("click", () => openEditor());
  $("close-notebook").addEventListener("click", closeNotebook);
  els.headerBack.addEventListener("click", goBack);
  function closeDeleteConfirm() { pendingDeleteId = null; $("delete-confirm").hidden = true; }
  $("cancel-delete").addEventListener("click", closeDeleteConfirm);
  $("confirm-delete").addEventListener("click", () => {
    if (!pendingDeleteId) return;
    const previous = state.notes;
    const previousTopics = state.topics;
    const deletedNote = state.notes.find(note => note.id === pendingDeleteId);
    state.notes = previous.filter(note => note.id !== pendingDeleteId);
    if (deletedNote?.category && !state.notes.some(note => note.category === deletedNote.category)) {
      state.topics = state.topics.filter(topic => topic !== deletedNote.category);
    }
    if (!persist()) { state.notes = previous; state.topics = previousTopics; closeDeleteConfirm(); return; }
    closeDeleteConfirm(); openedId = null; setScreen("list", "back"); renderList(); notify("Notiz gelöscht.");
  });
  els.headerSave.addEventListener("click", () => els.form.requestSubmit());
  $("add-topic").addEventListener("click", () => { els.topicInput.hidden = false; els.saveTopic.hidden = false; $("add-topic").hidden = true; els.topicInput.focus({ preventScroll:true }); });
  function saveTopic() {
    const name = els.topicInput.value.trim(); if (!name) { els.topicInput.focus({ preventScroll:true }); return; }
    const existing = state.topics.find(topic => topic.toLocaleLowerCase() === name.toLocaleLowerCase()); if (!existing) state.topics.push(name);
    if (!persist()) return;
    fillCategories(existing || name); els.topicInput.value = ""; els.topicInput.hidden = true; els.saveTopic.hidden = true; $("add-topic").hidden = false;
  }
  els.saveTopic.addEventListener("click", saveTopic);
  els.topicInput.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); saveTopic(); }
  });
  els.form.addEventListener("submit", event => {
    event.preventDefault(); const note = { title:els.title.value.trim(), sub:els.sub.value.trim(), body:els.body.value.trim(), category:els.category.value };
    if (!note.title) { els.title.focus(); return; }
    const previousNotes = state.notes.map(item => ({ ...item }));
    const previousTopics = [...state.topics];
    if (editingId) {
      const existing = state.notes.find(item => item.id === editingId);
      const previousCategory = existing?.category;
      if (existing) Object.assign(existing, note, { updatedAt:Date.now() });
      if (previousCategory && previousCategory !== note.category && !state.notes.some(item => item.category === previousCategory)) {
        state.topics = state.topics.filter(topic => topic !== previousCategory);
      }
    }
    else state.notes.unshift({ id:`note-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ...note, updatedAt:Date.now() });
    if (persist()) { openedId = null; setScreen("list", "back"); renderList(); notify("Gespeichert."); }
    else { state.notes = previousNotes; state.topics = previousTopics; }
  });
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.type !== "deutsch-notebook-open") return;
    if (event.data.theme === "light") document.documentElement.setAttribute("data-theme","light"); else document.documentElement.removeAttribute("data-theme");
    if (event.data.lang) localStorage.setItem("deutschTranslationLangV1", event.data.lang);
    state = readState(); renderList();
  });
  window.addEventListener("storage", event => { if (event.key === STORAGE_KEY) { state = readState(); renderList(); } });
  window.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!$ ("delete-confirm").hidden) { closeDeleteConfirm(); $("delete-entry")?.focus({ preventScroll:true }); }
    else if (searchOpen) closeSearch();
    else goBack();
  });
  renderList();
})();
