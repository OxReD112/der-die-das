(() => {
  /* 23.11.2026: the rules live in notebook-model.js (NotebookModel, no page — the app runs the same file); this page
     reads the input, asks the model, stores what comes back and draws it. */
  const NB = window.NotebookModel, T = NB.TEXT;
  const STORAGE_KEY = NB.KEY;
  const $ = id => document.getElementById(id);
  const app = $("notebook");
  if (!app) return;
  const EMBEDDED = new URLSearchParams(location.search).has("embedded") && parent !== window; // inside Home: Home shows the delete window
  const els = {
    list: $("list-content"), status: $("status"), searchBox: $("search-box"), search: $("search-input"),
    tabs: [...document.querySelectorAll(".nb-tab")], detail: $("detail-screen"), edit: $("edit-screen"),
    form: $("note-form"), title: $("entry-title"), sub: $("entry-subline"), body: $("entry-body"), category: $("category-select"),
    chips: $("topic-chips"), listToolbar: $("list-toolbar"), scroll: $("notebook-scroll"),
  };
  let state = readState(), view = "all", selectedTopic = "", query = "", editingId = null, openedId = null, pendingDeleteId = null, pendingTopic = null, pendingMerge = null, statusTimer = 0, searchOpen = false;
  function readState() { let text = null; try { text = localStorage.getItem(STORAGE_KEY); } catch (_) {} return NB.read(text); }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, NB.write(state)); return true; }
    catch (_) { notify(T.storageFull); return false; }
  }
  // a change from the model: keep it if it is stored, else put the old state back
  function commit(next) { const before = state; state = next; if (persist()) return true; state = before; return false; }
  /* notify(message) — short status line (3 s). With an action ({ label, run }) it gets a tappable button and stays 5 s
     (Notizbuch v19: "Thema gelöscht · Rückgängig"). */
  function notify(message, action = null) {
    clearTimeout(statusTimer); els.status.textContent = message; els.status.classList.toggle("has-action", !!action);
    if (action) {
      const button = document.createElement("button"); button.type = "button"; button.className = "nb-status-action"; button.textContent = action.label;
      button.addEventListener("click", () => { clearTimeout(statusTimer); els.status.hidden = true; els.status.classList.remove("has-action"); action.run(); });
      els.status.append(" ", button);
    }
    els.status.hidden = false;
    statusTimer = setTimeout(() => { els.status.hidden = true; els.status.classList.remove("has-action"); }, action ? 5000 : 3000);
  }
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
    closeFormatMenu();
    app.dataset.screen = screen;
    const list = screen === "list";
    els.detail.hidden = screen !== "detail"; els.edit.hidden = screen !== "edit";
    document.querySelector(".nb-tabs").hidden = !list;
    $("search-toggle").hidden = !list || searchOpen;
    els.searchBox.hidden = !list || !searchOpen;
    els.list.hidden = !list; els.listToolbar.hidden = !list;
    $("detail-actions").hidden = screen !== "detail";
    els.scroll.scrollTop = 0;
    animateContent(direction, screen === "detail" ? els.detail : screen === "edit" ? els.edit : null);
  }
  function renderCategories(model) {
    els.list.innerHTML = model.rows.map(row => `<button class="nb-row" type="button" data-topic="${esc(row.name)}"><span class="nb-row-copy"><strong>${esc(row.name)}</strong><small>${esc(row.countText)}</small></span><span class="nb-arrow ui-chev ui-chev-lone" aria-hidden="true"></span></button>`).join("")
      || `<p class="nb-empty">${esc(model.emptyText)}</p>`;
    els.list.querySelectorAll("[data-topic]").forEach(button => button.addEventListener("click", () => { selectedTopic = button.dataset.topic; renderList("forward"); }));
  }
  function renderList(direction = "none") {
    const model = NB.list(state, { view, topic: selectedTopic, query });
    if (model.kind === "topics") { app.classList.remove("in-topic"); renderCategories(model); animateContent(direction, direction === "forward" ? els.list : null); return; }
    const inTopic = model.inTopic, count = model.head ? model.head.count : 0;
    app.classList.toggle("in-topic", inTopic);
    /* Topic heading (Notizbuch v20): "‹ Grammatik 2" = back to all topics; pencil = rename, trash = delete. Pinned like the
       edit screen's heading. Inside a topic the rows don't repeat the topic name. */
    const back = inTopic ? `<div class="nb-topic-head" id="topic-head">
        <button class="nb-topic-title" type="button" id="topic-back" aria-label="Zurück zu allen Themen"><span class="nb-topic-chevron ui-chev ui-chev-back ui-chev-lone" aria-hidden="true"></span><span class="nb-topic-name">${esc(selectedTopic)}</span><span class="nb-topic-count" aria-label="${esc(model.head?.countText || "")}">${count}</span></button>
        <div class="nb-topic-tools"><button class="nb-icon-action" id="rename-topic" type="button" aria-label="Thema umbenennen">${pencilSvg}</button><button class="nb-icon-action" id="delete-topic" type="button" aria-label="Thema „${esc(selectedTopic)}“ löschen">${trashSvg}</button></div>
      </div>` : "";
    const rows = model.rows.map(row => `<button class="nb-row" type="button" data-entry="${esc(row.id)}"><span class="nb-row-copy">${row.category ? `<small class="nb-row-category">${esc(row.category)}</small>` : ""}<strong>${esc(row.title)}</strong>${row.sub ? `<small>${esc(row.sub)}</small>` : ""}</span><span class="nb-arrow ui-chev ui-chev-lone" aria-hidden="true"></span></button>`).join("");
    els.list.innerHTML = back + (rows || `<p class="nb-empty">${esc(model.emptyText)}</p>`);
    $("topic-back")?.addEventListener("click", () => { selectedTopic = ""; renderList("back"); });
    $("delete-topic")?.addEventListener("click", event => askDeleteTopic(selectedTopic, event.detail === 0));
    $("rename-topic")?.addEventListener("click", startRenameTopic);
    els.list.querySelectorAll("[data-entry]").forEach(button => button.addEventListener("click", () => openEntry(button.dataset.entry)));
    animateContent(direction, direction === "forward" && view === "topics" && selectedTopic ? els.list : null);
  }
  const pencilSvg = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 16.5 15.8 4.7a2.8 2.8 0 0 1 4 4L8 20.5 3 21l1-4.5Z"/><path d="m13.8 6.7 4 4"/></svg>';
  const trashSvg = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7"/></svg>';
  function openEntry(id) {
    const entry = allEntries().find(item => item.id === id); if (!entry) return;
    openedId = id; $("detail-topic").textContent = entry.category || ""; $("detail-title").textContent = entry.title;
    $("detail-sub").textContent = entry.sub || ""; $("detail-sub").hidden = !entry.sub; if (entry.bodyHtml) $("detail-body").innerHTML = NB.cleanHtml(entry.bodyHtml);
    else $("detail-body").textContent = entry.body || "";
    renderTaskButtons();
    /* 04.11 (Alena): pencil + trash pinned at the bottom (two 36 circles), so a long note needn't be scrolled to the end. */
    $("detail-actions").innerHTML = `<button class="nb-icon-action" id="edit-entry" type="button" aria-label="Bearbeiten">${pencilSvg}</button><button class="nb-icon-action" id="delete-entry" type="button" aria-label="Löschen">${trashSvg}</button>`;
    setScreen("detail", "forward");
    $("edit-entry")?.addEventListener("click", () => openEditor(allEntries().find(item => item.id === id) || entry)); // the note as it is now (a ticked task is a new copy)
    $("delete-entry")?.addEventListener("click", event => {
      pendingDeleteId = id; pendingTopic = null; pendingMerge = null;
      const ask = NB.askDeleteNote(); showDeleteConfirm(ask.title, ask.text, event.detail === 0, true);
    });
  }
  /* 04.11 (Alena, iPhone): with the keyboard open, the text being typed must stay in sight — the page itself never
     scrolls (the heading with Aa / ✓ stays), only the note scrolls so the caret sits above the keyboard. */
  function keepCaretVisible() {
    const sc = els.scroll; if (!sc || app.dataset.screen !== "edit") return;
    const active = document.activeElement; if (!active || !sc.contains(active)) return;
    let r = null; const sel = document.getSelection();
    if (sel && sel.rangeCount && sc.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0); r = range.getClientRects()[0] || range.getBoundingClientRect();
      if (!r || (!r.height && !r.top)) { const n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement; r = n && n.getBoundingClientRect(); }
    }
    if (!r || (!r.height && !r.top)) r = active.getBoundingClientRect();
    const box = sc.getBoundingClientRect();
    if (r.bottom > box.bottom - 16) sc.scrollTop += r.bottom - box.bottom + 16;
    else if (r.top < box.top + 8) sc.scrollTop -= box.top + 8 - r.top;
  }
  document.addEventListener("selectionchange", () => requestAnimationFrame(keepCaretVisible));
  window.addEventListener("resize", () => setTimeout(keepCaretVisible, 60));
  window.addEventListener("scroll", () => { if (window.scrollY) window.scrollTo(0, 0); });
  /* One confirm window for both deletes. Inside Home, Home draws it (5.94) — it gets the title + text to show;
     isDefault = the plain "Notiz löschen?" (Home then keeps its own wording). */
  function showDeleteConfirm(title, text, keyboard, isDefault = false, confirmLabel = "") {
    if (EMBEDDED) { parent.postMessage({ type:"deutsch-notebook-delete-ask", keyboard, ...(isDefault ? {} : { title, text, confirmLabel }) }, location.origin); return; }
    $("delete-confirm-title").textContent = title; $("delete-confirm-text").textContent = text;
    $("confirm-delete").textContent = confirmLabel || "Löschen"; $("confirm-delete").classList.toggle("is-neutral", !!confirmLabel);
    $("delete-confirm").hidden = false;
    $("cancel-delete").focus({ preventScroll:true });
  }
  /* Delete a whole topic with its notes (Notizbuch v19): trash button on the topic's screen → confirm → gone,
     with "Rückgängig" for 5 s. Undo puts the topic and exactly those notes back, keeping anything added meanwhile. */
  function askDeleteTopic(name, keyboard) {
    if (!name) return;
    pendingTopic = name; pendingDeleteId = null; pendingMerge = null;
    const ask = NB.askDeleteTopic(state, name); showDeleteConfirm(ask.title, ask.text, keyboard);
  }
  /* Rename a topic in place (Notizbuch v20): pencil → the name becomes a text field, the pencil a mint tick, the trash
     hides. Fertig / tick / tapping elsewhere saves, Escape or empty cancels. A name that already exists (any capitals)
     asks first and then merges the two topics. */
  function startRenameTopic() {
    const head = $("topic-head"); if (!head || head.classList.contains("is-renaming")) return;
    const old = selectedTopic; head.classList.add("is-renaming");
    const field = document.createElement("span"); field.className = "nb-topic-title is-editing";
    field.innerHTML = '<input type="text" maxlength="40" aria-label="Neuer Name für das Thema" autocomplete="off" autocapitalize="sentences" enterkeyhint="done">';
    const input = field.firstChild; input.value = old;
    const tick = document.createElement("button"); tick.type = "button"; tick.className = "nb-save-tick"; tick.setAttribute("aria-label", "Namen speichern");
    tick.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    $("topic-back").replaceWith(field); $("rename-topic").replaceWith(tick);
    let done = false;
    const finish = keep => {
      if (done) return; done = true;
      const answer = NB.renameTopic(state, old, keep ? input.value : "");
      renderList();
      if (answer.kind === "ask") {
        pendingMerge = { from: old, to: answer.to }; pendingTopic = null; pendingDeleteId = null;
        showDeleteConfirm(answer.title, answer.text, false, false, answer.confirm);
      } else if (answer.kind === "done") applyTopicMove(answer);
    };
    tick.addEventListener("pointerdown", event => event.preventDefault()); // keep the field focused: the tick saves, not the blur
    tick.addEventListener("click", () => finish(true));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
    input.focus(); input.select();
  }
  function applyTopicMove(result) { // a rename or a merge from the model
    if (!commit(result.state)) { renderList(); return; }
    selectedTopic = result.topic; renderList(); notify(result.status);
  }
  function deleteTopic() {
    const name = pendingTopic; if (!name) return;
    const result = NB.deleteTopic(state, name);
    if (!commit(result.state)) { closeDeleteConfirm(); return; }
    closeDeleteConfirm(); selectedTopic = ""; renderList("back");
    notify(result.status, { label: result.action, run: () => {
      const back = NB.undoDeleteTopic(state, result.undo);
      if (!commit(back.state)) return;
      renderList(); notify(back.status);
    } });
  }
  function fillCategories(selected = "") {
    const categories = NB.topics(state);
    els.category.value = categories.includes(selected) ? selected : "";
    const chip = (name, label) => `<button class="nb-chip" type="button" role="radio" aria-checked="${els.category.value === name}" data-topic="${esc(name)}">${esc(label)}</button>`;
    els.chips.innerHTML = chip("", T.noTopic) + categories.map(name => chip(name, name)).join("")
      + `<button class="nb-chip nb-chip-new" type="button" id="topic-new">${esc(T.newTopicChip)}</button>`;
  }
  /* Topic pills (Notizbuch v18): tap a pill to choose it; "+ Neu" turns into a small text box in place —
     Fertig / Enter or tapping elsewhere adds the topic and selects it, Escape or an empty box cancels. */
  els.chips.addEventListener("click", event => {
    const pill = event.target.closest(".nb-chip"); if (!pill || pill.classList.contains("is-input")) return;
    if (pill.id === "topic-new") { startNewTopic(pill); return; }
    els.category.value = pill.dataset.topic;
    els.chips.querySelectorAll("[role=radio]").forEach(button => button.setAttribute("aria-checked", String(button === pill)));
  });
  function startNewTopic(pill) {
    const box = document.createElement("span"); box.className = "nb-chip nb-chip-new is-input";
    box.innerHTML = '<input type="text" maxlength="40" placeholder="Neues Thema" aria-label="Neues Thema" autocomplete="off" autocapitalize="sentences" enterkeyhint="done">';
    const input = box.firstChild; let done = false;
    const fit = () => { input.style.width = `${Math.max(9, input.value.length + 1)}ch`; };
    const finish = keep => {
      if (done) return; done = true;
      const added = NB.addTopic(state, keep ? input.value : "");
      if (!added.name) { fillCategories(els.category.value); return; }
      if (added.added && !commit(added.state)) { fillCategories(els.category.value); return; }
      fillCategories(added.name);
    };
    input.addEventListener("input", fit);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
    fit(); pill.replaceWith(box); input.focus(); // same tap → the iPhone keyboard opens
  }
  // Only text, paragraphs, line breaks, bold, italic and checklist state survive storage / rendering — NotebookModel.cleanHtml
  // (23.11: was cleanNoteHtml here, through <template>; the same result without a document). body keeps the plain text.
  function currentTask() {
    const node = window.getSelection()?.anchorNode;
    const task = (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest("li");
    return task && els.body.contains(task) ? task : null;
  }
  function normalizeTasks() {
    els.body.querySelectorAll("ul").forEach(list => list.setAttribute("data-checklist", ""));
    els.body.querySelectorAll("li").forEach(task => {
      if (task.getAttribute("data-checked") !== "true") task.setAttribute("data-checked", "false");
    });
  }
  let splittingTask = null;
  els.body.addEventListener("beforeinput", event => {
    if (event.inputType === "insertParagraph") splittingTask = currentTask();
  });
  // In the editor the circle is a CSS marker, so native Enter/Backspace still see
  // an empty list item as empty. Reading mode uses actual accessible buttons.
  els.body.addEventListener("pointerdown", event => {
    const task = event.target.closest("li"); if (!task || !els.body.contains(task)) return;
    const box = task.getBoundingClientRect();
    if (event.clientX >= box.left && event.clientX <= box.left + 26 && event.clientY <= box.top + 28) {
      event.preventDefault(); task.setAttribute("data-checked", String(task.getAttribute("data-checked") !== "true"));
    }
  });
  function renderTaskButtons() {
    $("detail-body").querySelectorAll("ul[data-checklist] li").forEach((task, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "nb-task-check"; button.setAttribute("role", "checkbox");
      button.setAttribute("aria-checked", String(task.getAttribute("data-checked") === "true"));
      button.setAttribute("aria-label", task.textContent.trim() || "Aufgabe");
      task.prepend(button);
      button.addEventListener("click", () => {
        const result = NB.toggleTask(state, openedId, index, Date.now());
        if (result.ok && commit(result.state)) task.setAttribute("data-checked", String(result.checked));
        button.setAttribute("aria-checked", task.getAttribute("data-checked"));
      });
    });
  }
  let savedNoteRange = null;
  const formatToggle = $("format-toggle"), formatMenu = $("format-menu");
  function rememberNoteSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && els.body.contains(selection.anchorNode) && els.body.contains(selection.focusNode)) {
      savedNoteRange = selection.getRangeAt(0).cloneRange();
    }
  }
  function closeFormatMenu() { formatMenu.hidden = true; formatToggle.setAttribute("aria-expanded", "false"); }
  function restoreNoteSelection() {
    els.body.focus({ preventScroll:true });
    const selection = window.getSelection();
    const range = savedNoteRange || document.createRange();
    if (!savedNoteRange) { range.selectNodeContents(els.body); range.collapse(false); }
    selection.removeAllRanges(); selection.addRange(range);
  }
  document.addEventListener("selectionchange", rememberNoteSelection);
  for (const control of [formatToggle, ...formatMenu.querySelectorAll("button")]) {
    control.addEventListener("pointerdown", event => { rememberNoteSelection(); event.preventDefault(); });
  }
  formatToggle.addEventListener("click", () => {
    if (!formatMenu.hidden) { closeFormatMenu(); return; }
    restoreNoteSelection();
    for (const button of formatMenu.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.format === "checklist" ? !!currentTask() : document.queryCommandState(button.dataset.format)));
    formatMenu.hidden = false; formatToggle.setAttribute("aria-expanded", "true");
  });
  formatMenu.addEventListener("click", event => {
    const button = event.target.closest("[data-format]"); if (!button) return;
    restoreNoteSelection();
    // Native editing commands retain the browser's typing/undo history, including caret-only toggles.
    if (button.dataset.format === "checklist") {
      document.execCommand("insertUnorderedList", false);
      normalizeTasks();
    } else document.execCommand(button.dataset.format, false);
    rememberNoteSelection(); closeFormatMenu();
  });
  document.addEventListener("pointerdown", event => {
    if (!formatMenu.contains(event.target) && !formatToggle.contains(event.target)) closeFormatMenu();
  });
  els.body.addEventListener("paste", event => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") || "");
  });
  els.body.addEventListener("drop", event => event.preventDefault());
  els.body.addEventListener("input", () => {
    normalizeTasks();
    if (splittingTask) {
      const task = currentTask();
      if (task && task !== splittingTask) task.setAttribute("data-checked", "false");
      splittingTask = null;
    }
    if (!els.body.querySelector("li") && !els.body.textContent && !els.body.innerText.trim()) els.body.replaceChildren();
    rememberNoteSelection();
  });
  function openEditor(note = null) {
    editingId = note?.id || null; $("form-title").textContent = note ? T.editNote : T.newNote;
    els.title.value = note?.title || ""; els.sub.value = note?.sub || ""; if (note?.bodyHtml) els.body.innerHTML = NB.cleanHtml(note.bodyHtml);
    else els.body.textContent = note?.body || "";
    normalizeTasks();
    savedNoteRange = null; fillCategories(note?.category || "");
    setScreen("edit", "forward");
  }
  function goBack() {
    if (!els.detail.hidden) { openedId = null; setScreen("list", "back"); renderList(); } // forget the note, so "＋ Neue Notiz" → × returns to the list
    else if (!els.edit.hidden) { setScreen(openedId ? "detail" : "list", "back"); if (!openedId) renderList(); }
    else closeNotebook();
  }
  function closeNotebook() {
    if (EMBEDDED) parent.postMessage({ type:"deutsch-notebook-close" }, location.origin);
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
  $("detail-back").addEventListener("click", goBack);
  $("cancel-edit").addEventListener("click", goBack);
  function closeDeleteConfirm() { pendingDeleteId = null; pendingTopic = null; pendingMerge = null; $("delete-confirm").hidden = true; }
  function confirmDelete() {
    if (pendingMerge) { const { from, to } = pendingMerge; closeDeleteConfirm(); applyTopicMove(NB.mergeTopics(state, from, to)); }
    else if (pendingTopic) deleteTopic(); else deletePending();
  }
  function deleteButtonFocus() { (pendingMerge ? $("rename-topic") : pendingTopic ? $("delete-topic") : $("delete-entry"))?.focus({ preventScroll:true }); }
  $("cancel-delete").addEventListener("click", () => { deleteButtonFocus(); closeDeleteConfirm(); });
  $("confirm-delete").addEventListener("click", confirmDelete);
  function deletePending() {
    if (!pendingDeleteId) return;
    const result = NB.deleteNote(state, pendingDeleteId);
    if (!commit(result.state)) { closeDeleteConfirm(); return; }
    closeDeleteConfirm(); openedId = null; setScreen("list", "back"); renderList(); notify(result.status);
  }
  els.form.addEventListener("submit", event => {
    event.preventDefault();
    // body (the plain text) from the model too — the same as the editor's innerText.trim() (checked 23.11), so the site
    // and the app store the same note
    const isNew = !editingId && !!els.title.value.trim(); // a random part for the id only when a new note is really saved
    const result = NB.saveNote(state, editingId, { title:els.title.value, sub:els.sub.value, html:els.body.innerHTML, category:els.category.value }, Date.now(), isNew ? Math.random().toString(36).slice(2,7) : "");
    if (!result.ok) { els.title.focus(); return; }
    if (commit(result.state)) { openedId = null; setScreen("list", "back"); renderList(); notify(result.status); }
  });
  window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "deutsch-notebook-delete-answer") {
      if (event.data.confirmed) confirmDelete();
      else { if (event.data.keyboard) deleteButtonFocus(); pendingDeleteId = null; pendingTopic = null; pendingMerge = null; }
      return;
    }
    if (event.origin !== location.origin || event.data?.type !== "deutsch-notebook-open") return;
    if (event.data.theme === "light") document.documentElement.setAttribute("data-theme","light"); else document.documentElement.removeAttribute("data-theme");
    if (event.data.lang) localStorage.setItem("deutschTranslationLangV1", event.data.lang);
    state = readState(); renderList();
  });
  window.addEventListener("storage", event => { if (event.key === STORAGE_KEY) { state = readState(); renderList(); } });
  window.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!$ ("delete-confirm").hidden) { deleteButtonFocus(); closeDeleteConfirm(); }
    else if (!$("format-menu").hidden) closeFormatMenu();
    else if (searchOpen) closeSearch();
    else if (app.dataset.screen === "list" && view === "topics" && selectedTopic) { selectedTopic = ""; renderList("back"); }
    else goBack();
  });
  renderList();
})();
