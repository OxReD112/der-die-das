/* Notizbuch without the page (23.11.2026, design chat; asked by the native app — NATIVE_NOTIZBUCH_MODEL_REQUEST_2026-11-23_RU.md).
   Every rule of the notebook as data in, data out: the saved state, the lists, topics (add, rename / merge, delete with
   «Rückgängig»), notes (save, delete, a ticked task), search, and the text of a note — cleaning its HTML without a document
   (it was the page's cleanNoteHtml through <template>). Nothing here draws, reads the clock or touches localStorage: the
   site page (notizbuch.js) and the app call these functions and store / draw what comes back, so a note written in the app
   opens on the site the same way and the other way round. The app runs this file as it is (JavaScriptCore).

   State (localStorage «deutschNotebookV1», backup module «notebook»): { version: 1, topics: [name…], notes: [note…] },
   note = { id, title, sub, body, bodyHtml, category, updatedAt } — body is the plain text (search, older notes), bodyHtml the
   cleaned HTML: text, <div>, <p>, <br>, <strong>, <em>, <ul data-checklist=""> with <li data-checked="true|false">. */
(function (root) {
  "use strict";
  const KEY = "deutschNotebookV1";
  const TEXT = {
    saved: "Gespeichert.", noteDeleted: "Notiz gelöscht.", topicDeleted: "Thema gelöscht.", undo: "Rückgängig",
    restored: "Wiederhergestellt.", renamed: "Umbenannt.", merged: "Zusammengeführt.",
    storageFull: "Speichern nicht möglich. Bitte prüfe den Speicherplatz auf diesem Gerät.",
    emptyList: "Hier ist noch nichts gespeichert.", emptyTopics: "Lege beim Schreiben dein erstes Thema an.",
    noTopic: "Ohne Thema", newTopicChip: "＋ Neu", newTopic: "Neues Thema", newNote: "Neue Notiz", editNote: "Notiz bearbeiten",
    task: "Aufgabe", entries: n => `${n} ${n === 1 ? "Eintrag" : "Einträge"}`, notes: n => `${n} ${n === 1 ? "Notiz" : "Notizen"}`
  };

  /* ---------- state ---------- */
  const empty = () => ({ version: 1, topics: [], notes: [] });
  function read(text) { // the stored string (or null) → a clean state, as the page's readState
    try {
      const raw = JSON.parse(text || "null");
      if (!raw || raw.version !== 1) return empty();
      return { version: 1, topics: Array.isArray(raw.topics) ? raw.topics.filter(x => typeof x === "string") : [],
        notes: Array.isArray(raw.notes) ? raw.notes.filter(x => x && typeof x.id === "string" && typeof x.title === "string") : [] };
    } catch (_) { return empty(); }
  }
  const write = state => JSON.stringify(state);
  const topics = state => [...new Set([...state.topics, ...state.notes.map(note => note.category).filter(Boolean)])];
  const sameName = (a, b) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

  /* ---------- lists ---------- */
  function matches(note, query) { const q = query.toLocaleLowerCase(); return [note.title, note.sub, note.body, note.category].join(" ").toLocaleLowerCase().includes(q); }
  // view "all" | "topics"; topic = the opened topic (only in "topics"); query = the search text (trimmed)
  function list(state, { view = "all", topic = "", query = "" } = {}) {
    if (view === "topics" && !topic && !query) {
      const rows = topics(state).map(name => { const count = state.notes.filter(note => note.category === name).length; return { name, count, countText: TEXT.entries(count) }; });
      return { kind: "topics", rows, emptyText: rows.length ? "" : TEXT.emptyTopics };
    }
    let notes = state.notes;
    if (view === "topics" && topic) notes = notes.filter(note => note.category === topic);
    if (query) notes = notes.filter(note => matches(note, query));
    const inTopic = view === "topics" && !!topic && !query;
    return { kind: "notes", inTopic, head: inTopic ? { name: topic, count: notes.length, countText: TEXT.notes(notes.length) } : null,
      rows: notes.map(note => ({ id: note.id, category: note.category && !inTopic ? note.category : "", title: note.title, sub: note.sub || "" })),
      emptyText: notes.length ? "" : TEXT.emptyList };
  }

  /* ---------- notes ---------- */
  // fields = { title, sub, html (the editor's HTML) | bodyHtml, body?, category }; now = Date.now(); rand = 5 letters/digits
  function prepareNote(fields) {
    const tree = parse(fields.html != null ? fields.html : fields.bodyHtml || "");
    return { title: String(fields.title || "").trim(), sub: String(fields.sub || "").trim(),
      body: fields.body != null ? String(fields.body) : text(tree), bodyHtml: serialize(tree), category: fields.category || "" };
  }
  function saveNote(state, editingId, fields, now, rand) {
    const note = prepareNote(fields);
    if (!note.title) return { ok: false, reason: "title" };
    let notes = state.notes, topicsList = state.topics;
    if (editingId) {
      const existing = notes.find(item => item.id === editingId);
      const previousCategory = existing?.category;
      if (existing) notes = notes.map(item => item === existing ? Object.assign({ ...existing }, note, { updatedAt: now }) : item);
      if (previousCategory && previousCategory !== note.category && !notes.some(item => item.category === previousCategory)) topicsList = topicsList.filter(t => t !== previousCategory);
    } else notes = [{ id: `note-${now}-${rand}`, ...note, updatedAt: now }, ...notes];
    return { ok: true, state: { ...state, topics: topicsList, notes }, status: TEXT.saved };
  }
  const askDeleteNote = () => ({ title: "Notiz löschen?", text: "Diese Notiz wird von diesem Gerät entfernt.", confirm: "Löschen", isDefault: true });
  function deleteNote(state, id) { // the note goes; its topic goes too when it was the last note in it
    const gone = state.notes.find(note => note.id === id), notes = state.notes.filter(note => note.id !== id);
    const topicsList = gone?.category && !notes.some(note => note.category === gone.category) ? state.topics.filter(t => t !== gone.category) : state.topics;
    return { state: { ...state, topics: topicsList, notes }, status: TEXT.noteDeleted };
  }
  // the n-th task (document order, also in nested lists) of a note ticked / unticked; body stays as it was (as on the site)
  function toggleTask(state, noteId, index, now) {
    const note = state.notes.find(item => item.id === noteId); if (!note || !note.bodyHtml) return { ok: false };
    const tree = parse(note.bodyHtml), tasks = [];
    (function walk(nodes, inList) { for (const n of nodes) if (n.tag) { if (n.tag === "li" && inList) tasks.push(n); walk(n.children, inList || n.tag === "ul"); } })(tree, false);
    const task = tasks[index]; if (!task) return { ok: false };
    task.checked = !task.checked;
    return { ok: true, checked: task.checked, state: { ...state, notes: state.notes.map(item => item === note ? Object.assign({ ...note }, { bodyHtml: serialize(tree), updatedAt: now }) : item) } };
  }

  /* ---------- topics ---------- */
  function addTopic(state, raw) { // «＋ Neu» in the chips: an existing name (any capitals) is chosen, a new one is added
    const name = String(raw || "").trim(); if (!name) return { name: "", state };
    const existing = state.topics.concat(state.notes.map(note => note.category).filter(Boolean)).find(t => sameName(t, name));
    return existing ? { name: existing, state } : { name, added: true, state: { ...state, topics: [...state.topics, name] } };
  }
  function askDeleteTopic(state, name) {
    const count = state.notes.filter(note => note.category === name).length;
    return { title: "Thema löschen?", confirm: "Löschen",
      text: count ? `„${name}“ und ${count === 1 ? "die Notiz" : `die ${count} Notizen`} darin werden von diesem Gerät entfernt.` : `Das Thema „${name}“ wird von diesem Gerät entfernt.` };
  }
  function deleteTopic(state, name) { // returns undo data for «Rückgängig» (5 s)
    const removed = state.notes.filter(note => note.category === name), ids = new Set(removed.map(note => note.id));
    return { state: { ...state, notes: state.notes.filter(note => !ids.has(note.id)), topics: state.topics.filter(t => t !== name) },
      status: TEXT.topicDeleted, action: TEXT.undo,
      undo: { name, removed, order: state.notes.map(note => note.id), topicIndex: state.topics.indexOf(name) } };
  }
  function undoDeleteTopic(state, undo) { // the topic and exactly those notes come back, anything added meanwhile stays
    const order = new Map(undo.order.map((id, i) => [id, i])), at = id => order.has(id) ? order.get(id) : -1;
    const notes = state.notes.concat(undo.removed.filter(note => !state.notes.some(item => item.id === note.id))).sort((a, b) => at(a.id) - at(b.id));
    let topicsList = state.topics;
    if (!topicsList.includes(undo.name)) { topicsList = [...topicsList]; topicsList.splice(undo.topicIndex < 0 ? topicsList.length : Math.min(undo.topicIndex, topicsList.length), 0, undo.name); }
    return { state: { ...state, notes, topics: topicsList }, status: TEXT.restored };
  }
  // the pencil on a topic: nothing (empty / same name), a question (the name exists → merge), or done
  function renameTopic(state, from, raw) {
    const name = String(raw || "").trim().replace(/\s+/g, " ");
    if (!name || name === from) return { kind: "none" };
    const existing = topics(state).filter(t => t !== from).find(t => sameName(t, name));
    if (existing) return { kind: "ask", to: existing, title: "Themen zusammenführen?", confirm: "Zusammenführen",
      text: `„${existing}“ gibt es schon. Die Notizen aus „${from}“ werden dorthin verschoben.` };
    return { kind: "done", ...moveTopic(state, from, name, false) };
  }
  const mergeTopics = (state, from, to) => moveTopic(state, from, to, true);
  function moveTopic(state, from, to, merge) {
    const notes = state.notes.map(note => note.category === from ? { ...note, category: to } : note);
    let topicsList = state.topics; const index = topicsList.indexOf(from);
    if (merge) topicsList = topicsList.filter(t => t !== from);
    else if (index >= 0) { topicsList = [...topicsList]; topicsList[index] = to; }
    if (!topicsList.includes(to) && !notes.some(note => note.category === to)) topicsList = [...topicsList, to]; // an empty topic keeps existing
    return { state: { ...state, notes, topics: topicsList }, topic: to, status: merge ? TEXT.merged : TEXT.renamed };
  }

  /* ---------- the text of a note, without a document ----------
     parse(html) → the cleaned tree: [ "text" | { tag: "strong"|"em"|"br"|"div"|"p"|"ul"|"li", checked?, children } ].
     It keeps exactly what the page kept with cleanNoteHtml: text, paragraphs, line breaks, bold, italic (also Safari's
     <span style="font-weight / font-style">), checklists and their state; scripts, styles, frames, images, buttons and
     inputs go with their contents; every other tag is unwrapped. serialize(tree) is the HTML the page stored. */
  const SKIP = new Set(["script", "style", "iframe", "object", "svg", "math", "img", "button", "input", "template", "noscript", "xmp", "noembed", "noframes"]);
  const RAW = new Set(["script", "style", "xmp", "iframe", "noembed", "noframes", "noscript"]), RCDATA = new Set(["textarea", "title"]);
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr", "keygen"]);
  const KEEP = { b: "strong", strong: "strong", i: "em", em: "em", br: "br", div: "div", p: "p", ul: "ul", li: "li" };
  const SPECIAL = new Set(["address", "applet", "area", "article", "aside", "base", "basefont", "bgsound", "blockquote", "body", "br", "button", "caption", "center", "col", "colgroup", "dd", "details", "dir", "div", "dl", "dt", "embed", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "iframe", "img", "input", "keygen", "li", "link", "listing", "main", "marquee", "menu", "meta", "nav", "noembed", "noframes", "noscript", "object", "ol", "p", "param", "plaintext", "pre", "script", "search", "section", "select", "source", "style", "summary", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "title", "tr", "track", "ul", "wbr", "xmp"]);
  const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
  const BLOCK_CLOSES_P = new Set(["address", "article", "aside", "blockquote", "center", "details", "dialog", "dir", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu", "nav", "ol", "p", "pre", "section", "summary", "table", "ul", "li", "dd", "dt", "listing", "plaintext", "search"]);
  const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", shy: "­", copy: "©", reg: "®", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", euro: "€", middot: "·", bull: "•", deg: "°", times: "×", thinsp: " ", ensp: " ", emsp: " ", zwj: "‍", zwnj: "‌" };
  const decode = s => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);?/giu, (m, e) => {
    if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "�"; }
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m;
  });
  function styleOf(attrs) { // the last valid font-weight / font-style of a style attribute, as the browser reads it
    const out = {}; for (const decl of String(attrs.style || "").split(";")) {
      const i = decl.indexOf(":"); if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase(), value = decl.slice(i + 1).replace(/!\s*important\s*$/iu, "").trim().toLowerCase();
      if (prop === "font-weight" && (/^(normal|bold|bolder|lighter)$/u.test(value) || (/^\d+(\.\d+)?$/u.test(value) && +value >= 1 && +value <= 1000))) out.weight = value;
      if (prop === "font-style" && /^(normal|italic|oblique)$/u.test(value)) out.style = value;
    }
    return out;
  }
  function tokens(html) { // start / end tags, text and comments — enough HTML for what editors produce
    const out = []; let i = 0; const s = String(html);
    while (i < s.length) {
      const lt = s.indexOf("<", i);
      if (lt < 0) { out.push({ text: decode(s.slice(i)) }); break; }
      if (lt > i) out.push({ text: decode(s.slice(i, lt)) });
      if (s.startsWith("<!--", lt)) { const end = s.indexOf("-->", lt + 4); i = end < 0 ? s.length : end + 3; continue; }
      const m = /^<(\/?)([a-zA-Z][^\s/>]*)([^>]*)>/u.exec(s.slice(lt));
      if (!m) { if (/^<[!?/]/u.test(s.slice(lt))) { const end = s.indexOf(">", lt); i = end < 0 ? s.length : end + 1; continue; } out.push({ text: "<" }); i = lt + 1; continue; }
      const name = m[2].toLowerCase(), attrs = {};
      if (!m[1]) for (const a of m[3].matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gu)) { const k = a[1].toLowerCase(); if (!(k in attrs)) attrs[k] = decode(a[2] ?? a[3] ?? a[4] ?? ""); }
      i = lt + m[0].length;
      out.push({ end: !!m[1], name, attrs, self: /\/\s*$/u.test(m[3]) });
      if (!m[1] && (RAW.has(name) || RCDATA.has(name))) { // their content is text up to the closing tag
        const close = s.toLowerCase().indexOf(`</${name}`, i), body = s.slice(i, close < 0 ? s.length : close);
        if (body) out.push({ text: RCDATA.has(name) ? decode(body) : body });
        i = close < 0 ? s.length : close;
      }
    }
    return out;
  }
  function dom(html) { // a small tree builder: the browser's fix-ups an editor's HTML can need (p and li close themselves)
    const top = { name: "#root", children: [] }, stack = [top], cur = () => stack[stack.length - 1];
    const closeTo = name => { for (let k = stack.length - 1; k > 0; k--) if (stack[k].name === name) { stack.length = k; return true; } return false; };
    const inScope = (name, stops) => { for (let k = stack.length - 1; k > 0; k--) { if (stack[k].name === name) return true; if (stops.has(stack[k].name)) return false; } return false; };
    const SCOPE = ["applet", "caption", "html", "table", "td", "th", "marquee", "object", "template", "svg", "math"];
    const BTN_STOP = new Set([...SCOPE, "button"]), LIST_STOP = new Set([...SCOPE, "ul", "ol"]), ANY_STOP = new Set(SCOPE);
    for (const t of tokens(html)) {
      if (t.text != null) { const c = cur().children, last = c[c.length - 1]; if (typeof last === "string") c[c.length - 1] = last + t.text; else c.push(t.text); continue; }
      if (t.end) {
        if (t.name === "br") { cur().children.push({ name: "br", attrs: {}, children: [] }); continue; }
        if (t.name === "p" && !inScope("p", BTN_STOP)) { cur().children.push({ name: "p", attrs: {}, children: [] }); continue; }
        if (t.name === "li" && !inScope("li", LIST_STOP)) continue;
        if (HEADINGS.has(t.name)) { for (let k = stack.length - 1; k > 0; k--) if (HEADINGS.has(stack[k].name)) { stack.length = k; break; } else if (ANY_STOP.has(stack[k].name)) break; continue; }
        if (!inScope(t.name, ANY_STOP)) continue;
        closeTo(t.name); continue;
      }
      if (t.name === "li") for (let k = stack.length - 1; k > 0; k--) { const n = stack[k].name; if (n === "li") { stack.length = k; break; } if (SPECIAL.has(n) && !["address", "div", "p"].includes(n)) break; }
      if (t.name === "button" && inScope("button", ANY_STOP)) closeTo("button");
      if (BLOCK_CLOSES_P.has(t.name) && inScope("p", BTN_STOP)) closeTo("p");
      if (HEADINGS.has(t.name) && HEADINGS.has(cur().name)) stack.pop();
      const node = { name: t.name, attrs: t.attrs, children: [] };
      cur().children.push(node);
      if (!VOID.has(t.name)) stack.push(node);
    }
    return top.children;
  }
  function clean(nodes) { // the page's cleanNoteHtml copy(), on the small tree
    const out = [];
    (function copy(list, target) {
      for (const node of list) {
        if (typeof node === "string") { const last = target[target.length - 1]; if (typeof last === "string") target[target.length - 1] = last + node; else target.push(node); continue; }
        if (SKIP.has(node.name)) continue;
        let dest = target;
        if (KEEP[node.name]) {
          const el = { tag: KEEP[node.name], children: [] };
          if (node.name === "li") el.checked = node.attrs["data-checked"] === "true";
          target.push(el); dest = el.children;
        }
        const st = styleOf(node.attrs);
        if (!["b", "strong"].includes(node.name) && (st.weight === "bold" || Number(st.weight) >= 600)) { const b = { tag: "strong", children: [] }; dest.push(b); dest = b.children; }
        if (!["i", "em"].includes(node.name) && st.style === "italic") { const it = { tag: "em", children: [] }; dest.push(it); dest = it.children; }
        copy(node.children, dest);
      }
    })(nodes, out);
    return out;
  }
  const parse = html => clean(dom(html));
  const escText = s => s.replace(/&/g, "&amp;").replace(/ /g, "&nbsp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function serialize(tree) {
    return tree.map(n => {
      if (typeof n === "string") return escText(n);
      if (n.tag === "br") return "<br>";
      const open = n.tag === "ul" ? '<ul data-checklist="">' : n.tag === "li" ? `<li data-checked="${n.checked ? "true" : "false"}">` : `<${n.tag}>`;
      return open + serialize(n.children) + `</${n.tag}>`;
    }).join("");
  }
  const cleanHtml = html => serialize(parse(html)); // = the page's cleanNoteHtml(html)

  /* the plain text of a note (body: search, notes without bodyHtml) — as the browser's innerText of the editor, trimmed:
     <br> and line ends inside the text are new lines, <div> / <li> / <ul> start and end a line, <p> leaves an empty line. */
  function text(tree) {
    const items = [];
    (function walk(nodes, inList) {
      for (const n of nodes) {
        if (typeof n === "string") { if (inList) items.push({ s: n.replace(/[ \t\n\r\f]+/g, " ") }); else items.push(n); continue; }
        if (n.tag === "br") { items.push("\n"); continue; }
        const block = n.tag === "p" ? 2 : n.tag === "div" || n.tag === "li" || n.tag === "ul" ? 1 : 0;
        if (block) items.push(block);
        walk(n.children, n.tag === "ul" ? true : n.tag === "li" ? false : inList);
        if (block) items.push(block);
      }
    })(tree, false);
    // collapsible text (white-space: normal): no space at the start or end of a line, never two in a row
    for (let k = 0; k < items.length; k++) {
      const it = items[k]; if (typeof it !== "object") continue;
      let t = it.s; const prev = k ? items[k - 1] : null;
      const lineStart = prev == null || typeof prev === "number" || (typeof prev === "string" && (prev === "" || /[ \n]$/.test(prev)));
      if (lineStart && t.startsWith(" ")) t = t.slice(1);
      let next = null; for (let j = k + 1; j < items.length; j++) { if (items[j] !== "") { next = items[j]; break; } }
      if ((next == null || typeof next === "number" || next === "\n") && t.endsWith(" ")) t = t.slice(0, -1);
      items[k] = t;
    }
    while (typeof items[0] === "number") items.shift();
    while (typeof items[items.length - 1] === "number") items.pop();
    let out = "", need = 0;
    for (const it of items) { if (typeof it === "number") need = Math.max(need, it); else { if (it === "") continue; out += "\n".repeat(need) + it; need = 0; } }
    return out.trim();
  }

  /* ---------- for the app: a note as lines and tasks, and back ----------
     blocks(tree) → [{ type: "line" | "task", checked?, runs: [{ text, bold, italic }] }] — what a reader sees, line by line.
     noteHtml(blocks) → bodyHtml in the cleaned form (each line a <div>, tasks in <ul data-checklist>): clean(noteHtml(b)) is
     noteHtml(b), so a note written in the app opens on the site the same way. A note that was not changed keeps its bodyHtml. */
  function blocks(tree) {
    const out = []; let line = null;
    const start = (type = "line", checked = false) => { line = { type, runs: [] }; if (type === "task") line.checked = checked; };
    const flush = () => { if (line && line.runs.length) out.push(line); line = null; };
    const add = (t, bold, italic) => { if (!line) start(); const last = line.runs[line.runs.length - 1];
      if (last && last.bold === bold && last.italic === italic) last.text += t; else line.runs.push({ text: t, bold, italic }); };
    (function walk(nodes, bold, italic, task) {
      for (const n of nodes) {
        if (typeof n === "string") { n.split("\n").forEach((part, i) => { if (i) { if (!line) start(task ? "task" : "line", task?.checked); out.push(line); line = null; } if (part) add(part, bold, italic); }); continue; }
        if (n.tag === "br") { if (!line) start(task ? "task" : "line", task?.checked); out.push(line); line = null; continue; }
        if (n.tag === "strong" || n.tag === "em") { walk(n.children, bold || n.tag === "strong", italic || n.tag === "em", task); continue; }
        flush();
        if (n.tag === "li") { start("task", n.checked); walk(n.children, bold, italic, n); if (line && line.type === "task") out.push(line); line = null; continue; }
        walk(n.children, bold, italic, task); flush();
      }
    })(tree, false, false, null);
    flush();
    return out;
  }
  function noteHtml(list) {
    const runs = rs => rs.map(r => { let h = escText(r.text); if (r.italic) h = `<em>${h}</em>`; if (r.bold) h = `<strong>${h}</strong>`; return h; }).join("") || "<br>";
    let html = "", inList = false;
    for (const b of list) {
      if (b.type === "task") { if (!inList) { html += '<ul data-checklist="">'; inList = true; } html += `<li data-checked="${b.checked ? "true" : "false"}">${runs(b.runs)}</li>`; }
      else { if (inList) { html += "</ul>"; inList = false; } html += `<div>${runs(b.runs)}</div>`; }
    }
    return inList ? html + "</ul>" : html;
  }
  const noteText = list => text(parse(noteHtml(list)));

  root.NotebookModel = Object.freeze({ KEY, TEXT, empty, read, write, topics, list, matches, prepareNote, saveNote, askDeleteNote, deleteNote,
    toggleTask, addTopic, askDeleteTopic, deleteTopic, undoDeleteTopic, renameTopic, mergeTopics,
    parse, serialize, cleanHtml, text, blocks, noteHtml, noteText });
})(typeof window !== "undefined" ? window : globalThis);
