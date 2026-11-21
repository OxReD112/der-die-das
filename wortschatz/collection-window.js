/* Wortschatz · collection button + window — the page (19.11.2026: the screens' texts, decisions and actions moved to
   collection-window-model.js — window.WortschatzWindowModel, also run by the native app; this file asks it and draws).
   History: v6, 2026-09-26 (v2: word form · v3: ✎ on the answer screen · v4: import · v5: English · v6: Starter-Set + new start screen).
   All texts in this window are in the user's language (02.11.2026, RU / EN — the app's language switch,
   DeutschTranslation): users whose German is still weak must understand how to manage and import their words.
   Names stay German (Wortschatz, Wörterbuch, Bibliothek, Lerntempo, word sets). English labels in Title Case
   (Settings rule), questions in sentence case; Russian in sentence case, addressed with „ты“ as the German „du“.
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 3). Storage lives in collection.js.
   - Start screen: „DEINE WÖRTER“ + „<name> · <n> Wörter ›“ (opens the window).
   - „Fertig für heute“: pill „<name> · <n> Wörter“.
   - 2026-10-26: no built-in Starter-Set. No collection → choose screen (word sets / own words, fillChoose).
   - Window: name, word count, word list; own collection: rename, export, delete.
   - Word form (step 4): „＋ Wort hinzufügen“ and tap a word in the list = edit / delete it.
     Changes that touch progress or WORDS set `dirty`; closing the window then reloads the page
     (Wortschatz keeps progress and WORDS in memory and would otherwise work with the old ones).
   Here: the HTML, DeutschWindow (open / close, ×, a tap outside), focus and selection, scrolling, the hidden file input,
   Blob and download, the clipboard, location.reload, postMessage / sessionStorage for words from the Wörterbuch page and
   Bibliothek, #wsSettings data-pace. All user text is inserted with textContent (never as HTML). */
(function () {
  const C = window.WortschatzCollection,
    M = window.WortschatzWindowModel;
  const $ = id => document.getElementById(id);
  const modal = $("collModal"),
    card = $("collCard");
  if (!C || !M || !modal || !card) return;
  const embedded = modal.dataset.host === "reader";
  let dictionarySaved = null;
  const { L, own, name, plainValue } = M;

  function el(tag, cls, text, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }
  function button(cls, text, onClick) {
    const b = el("button", cls, text, { type: "button" });
    b.onclick = onClick;
    return b;
  }

  function refreshButtons() {
    const v = M.line();
    ["collBtnStart", "collBtnDone"].forEach(id => {
      // „<name> ›“ on both screens
      const b = $(id);
      if (!b) return;
      b.textContent = "";
      b.appendChild(el("span", "coll-line-name", v.name));
      b.appendChild(el("span", "coll-line-chev ui-chev", "", { "aria-hidden": "true" }));
      b.setAttribute("aria-label", v.label);
    });
    ["collCountStart", "collCountDone"].forEach(id => {
      const c = $(id);
      if (c) c.textContent = v.count;
    });
  }

  /* ---------- open / close: the shared window (components/deutsch-window-v1.js, 06.11.2026) ----------
     DeutschWindow does the rest like in the exercises' Spickzettel: ×, a tap outside and Esc close it; Tab stays
     inside; keys never reach the page behind it (before, Enter behind the ✎ window went on to the next word);
     the focus goes back where it was. Own here: the views inside, emptied after closing, the page reloads if
     the words changed. */
  const W = window.DeutschWindow;
  let dirty = false,
    closeTimer = null,
    opening = 0;
  function open(firstView) {
    clearTimeout(closeTimer);
    cancelAnimationFrame(opening);
    dirty = false;
    (typeof firstView === "function" ? firstView : viewMain)();
    // two frames: the new view is laid out before the window fades in
    opening = requestAnimationFrame(() => (opening = requestAnimationFrame(() => W.open(modal))));
  }
  function close() {
    cancelAnimationFrame(opening);
    if (W.isOpen(modal)) W.close(modal); // → windowclose below
  }
  modal.addEventListener("windowclose", () => {
    closeTimer = setTimeout(() => {
      card.textContent = "";
      if (dirty && !embedded) location.reload();
    }, 220);
  });

  // ‹ (one step back) left of the title, × (close the window) on the right — like the Fortschritt window.
  // No „Cancel“ links any more (v2.100): ‹ does what they did.
  function head(title, back) {
    const h = el("div", "coll-head ui-window-head");
    if (back) {
      const b = h.appendChild(button("coll-back", "", back)); // ‹ = the shared .ui-chev (06.11)
      b.setAttribute("aria-label", M.T.back());
      b.appendChild(el("span", "ui-chev ui-chev-back ui-chev-lone", "", { "aria-hidden": "true" }));
    }
    h.appendChild(el("h2", "coll-title ui-window-title", title, { id: "collTitle" }));
    // the shared round × (DeutschWindow closes the window on it)
    const x = h.appendChild(el("button", "ui-close", null, { type: "button", "aria-label": M.T.close() }));
    x.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>';
    return h;
  }
  // a notice line under the title of the list (after adding from a set / a book)
  function notice(text) {
    const n = el("p", "coll-text", text);
    n.setAttribute("role", "status");
    card.insertBefore(n, card.children[1]);
  }

  /* ---------- main view: name, count, list, actions ---------- */
  function viewMain() {
    const v = M.main({ embedded });
    if (v.view === "create") return viewCreate();
    card.textContent = "";
    card.appendChild(head(v.title));
    const meta = el("p", "coll-meta");
    meta.appendChild(document.createTextNode(v.meta));
    meta.appendChild(button("coll-link", v.rename, viewRename));
    card.appendChild(meta);

    // v2.104: both ways to get words in, side by side (same shape; Add Word = the everyday action, cream)
    // v2.111: Import List = the raised „Use your own words“ look (the outlined one looked disabled)
    const top = el("div", "coll-pair");
    top.appendChild(button("coll-main", v.add, () => viewForm(null)));
    top.appendChild(button("coll-raised", v.import, () => viewImport({})));
    card.appendChild(top);
    if (v.sets) {
      // opens another view (not a fold-out) → „Word Sets ›“, the same › as the start screen's collection line
      const ws = button("coll-sets-link", "", () => viewSets(viewMain));
      ws.appendChild(el("span", null, v.sets));
      ws.appendChild(el("span", "coll-line-chev ui-chev", "", { "aria-hidden": "true" }));
      card.appendChild(ws);
    }

    const box = el("div", "coll-list coll-list-below");
    v.rows.forEach(r => {
      const row = button("coll-word is-btn", "", () => viewForm(r.word));
      const german = el("span", "coll-de", undefined, { lang: "de" });
      if (r.isNew) german.appendChild(el("span", "coll-new", r.newText, { "aria-label": r.newLabel }));
      german.appendChild(document.createTextNode(r.de));
      row.appendChild(german);
      row.appendChild(el("span", "coll-tr", r.tr));
      box.appendChild(row);
    });
    if (v.empty) box.appendChild(el("p", "coll-note", v.empty));
    card.appendChild(box);

    // rare / risky actions: two quiet links at the bottom
    const bottom = el("div", "coll-bottom");
    bottom.appendChild(button("coll-link", v.export, () => exportFile()));
    bottom.appendChild(el("span", "coll-dot", "·", { "aria-hidden": "true" }));
    bottom.appendChild(button("coll-link", v.delete, viewDelete));
    card.appendChild(bottom);
  }

  /* ---------- word form: add (card=null) or edit one word ---------- */
  function field(f, optionalText) {
    const wrap = document.createElement("div");
    const l = el("label", "coll-label", f.label);
    if (f.optional) l.appendChild(el("span", "opt", optionalText));
    const attrs = { id: f.id };
    if (f.tag === "textarea") attrs.rows = f.rows;
    else attrs.type = "text";
    if (f.placeholder !== null) attrs.placeholder = f.placeholder;
    if (f.max) attrs.maxlength = String(f.max); // 21.11: stops typing there (the model's SENTENCE_MAX / TRANSLATION_MAX)
    const node = el(f.tag, "coll-field", null, Object.assign({ autocomplete: "off", autocapitalize: "off", spellcheck: "false" }, attrs));
    l.setAttribute("for", f.id);
    wrap.appendChild(l);
    wrap.appendChild(node);
    // 21.11: right under a field with a limit — „too long“ when it is full (see the form's input listener)
    if (f.max) node.limitNote = wrap.appendChild(el("p", "coll-error coll-limit"));
    node.value = f.value;
    return [wrap, node];
  }

  // opts.session: opened from ✎ on the answer screen — no reload; Delete Word only with opts.onDeleted (2026-10-26);
  // onSaved(card) lets the running session show the corrected card right away.
  function viewForm(w, opts) {
    opts = opts || {};
    const editing = !!w;
    const v = M.form(w, opts, embedded);
    card.textContent = "";
    card.appendChild(head(v.title, v.back ? opts.cancel || viewMain : null));
    const sc = el("div", "coll-scroll");
    const search = v.search ? dictionarySearch(opts, sc, () => (now ? (now.checked ? "next" : "end") : "next")) : null;
    card.appendChild(sc);

    const prefill = !editing && opts.prefill ? opts.prefill : null;
    let toks = v.tokens;
    const F = {};
    const [fS, fSentence] = field(v.fields[0], v.optional);
    F.cfSentence = fSentence;
    sc.appendChild(fS);
    const chips = el("div", "coll-chips");
    sc.appendChild(chips);
    const hint = el("p", "coll-hint", v.hint);
    sc.appendChild(hint);
    const preview = el("p", "coll-preview");
    sc.appendChild(preview);
    v.fields.slice(1).forEach(f => {
      const [wrap, node] = field(f, v.optional);
      F[f.id] = node;
      sc.appendChild(wrap);
    });
    const fBase = F.cfBase;

    sc.appendChild(el("span", "coll-label", v.posLabel)).appendChild(el("span", "opt", v.optional));
    const posBox = el("div", "coll-chips");
    sc.appendChild(posBox);
    let pos = v.pos;
    function drawPos() {
      posBox.textContent = "";
      v.posChips.forEach(({ value: p, text }) => {
        const c = button("coll-chip" + (M.posOn(pos, p) ? " on" : ""), text, () => {
          pos = M.posTap(pos, p);
          drawPos();
        });
        c.setAttribute("aria-pressed", M.posOn(pos, p) ? "true" : "false");
        posBox.appendChild(c);
      });
    }
    drawPos();

    let now = null;
    if (v.learnNow) {
      const sw = el("label", "coll-switch");
      sw.appendChild(el("span", null, v.learnNow.text));
      now = el("input", null, null, { type: "checkbox", "aria-label": v.learnNow.aria });
      now.checked = v.learnNow.on;
      sw.appendChild(now);
      sc.appendChild(sw);
      sc.appendChild(el("p", "coll-hint", v.learnNow.note));
      now.addEventListener("change", () => search?.refresh());
    }
    const err = el("p", "coll-error");
    sc.appendChild(err);
    sc.addEventListener("input", e => {
      const f = e.target;
      err.textContent = ""; // an old hint disappears as soon as you type
      // a full field (maxlength, also after pasting) says so right under it
      if (f && f.limitNote) f.limitNote.textContent = f.value.length >= f.maxLength ? v.tooLong : "";
    });
    if (!v.examples)
      sc.querySelectorAll(".coll-field").forEach(f => {
        f.placeholder = "";
      }); // examples only for a new word

    function drawChips() {
      chips.textContent = "";
      toks.forEach((t, i) => {
        if (!t.core) return;
        const c = button("coll-chip" + (t.on ? " on" : ""), t.core, () => {
          toks[i].on = !toks[i].on;
          err.textContent = "";
          drawChips();
        });
        c.setAttribute("aria-pressed", t.on ? "true" : "false");
        chips.appendChild(c);
      });
      const parts = M.previewParts(toks);
      preview.textContent = "";
      if (parts)
        parts.forEach(p => {
          if (p.blank) {
            const b = el("span", "blank");
            b.setAttribute("aria-label", v.gapLabel);
            preview.appendChild(b);
          } else preview.appendChild(document.createTextNode(p.text));
        });
      hint.style.display = M.showHint(toks) ? "" : "none";
      fBase.placeholder = M.basePlaceholder(toks, editing);
    }
    fSentence.addEventListener("input", () => {
      toks = M.tokensFromText(fSentence.value, toks);
      drawChips();
    });
    drawChips();

    let validatingSave = false;
    async function save() {
      if (validatingSave) return;
      err.textContent = "";
      validatingSave = !!opts.validate;
      let r;
      try {
        r = await M.saveWord(w, opts, {
          toks,
          meaning: F.cfMeaning.value,
          other: F.cfOther.value,
          trans: F.cfTrans.value,
          base: fBase.value,
          gram: F.cfGram.value,
          pos,
          learnNow: now ? now.checked : null
        });
      } finally {
        validatingSave = false;
      }
      if (r.error) {
        err.textContent = r.error;
        if (r.focus) F[r.focus].focus();
        return;
      }
      if (r.kind === "draft") {
        opts.onSaved(r.card);
        return;
      }
      if (r.kind === "session") {
        if (opts.onSaved) opts.onSaved(r.card);
        close();
        return;
      }
      dirty = true;
      refreshButtons();
      if (embedded) { close(); dictionarySaved?.({ base: r.fields.base, translation: r.fields.translation, collection: name() }); return; } // 10.11: the word for the reader's confirmation
      viewMain();
    }

    const b = el("div", "coll-form-buttons");
    if (opts.create) opts.cancel = opts.cancel || viewMain;
    b.appendChild(button("coll-main", v.save, save));
    if (v.deleteWord) b.appendChild(button("coll-link", v.deleteWord, () => (opts.session ? viewRemove(w, opts) : viewRemove(w))));
    sc.appendChild(b); // Save at the very END of the form (v2.100): you pass every field first
    if (!editing) setTimeout(() => (search && !prefill ? search.focus() : !prefill && fSentence.focus()), 60);
  }

  /* ---------- Wörterbuch search in the new-word form (v2026-10-26) — the rules: M (loadDictionaryIndex, findInDictionary,
     searchFields, addFromSearch, undoSearch) ---------- */
  function dictionarySearch(opts, form, placement) {
    const lang = M.cardLang();
    const S = M.SEARCH();
    const wrap = el("div", "coll-search");
    const input = el("input", "coll-field coll-search-field", null, {
      type: "search", id: "cfSearch", placeholder: S.placeholder, "aria-label": S.placeholder,
      autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "search"
    });
    wrap.appendChild(input);
    // 06.11: the shared round × (.ui-clear, components/deutsch-ui-v1.css) instead of the browser's own one
    const clearBtn = el("button", "ui-clear coll-search-clear", null, { type: "button", "aria-label": S.clear });
    clearBtn.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>';
    clearBtn.hidden = true;
    clearBtn.onclick = () => {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus({ preventScroll: true });
    };
    input.addEventListener("input", () => { clearBtn.hidden = !input.value; });
    wrap.appendChild(clearBtn);
    // 20.11.2026 (Alena): the field is the top of the form and scrolls away with it while you fill the card in;
    // while you search it stays on top and the results scroll under it (.coll-searching)
    form.appendChild(wrap);
    const results = el("div", "coll-results");
    results.style.display = "none";
    form.appendChild(results);
    const addedHere = new Map(); // dictionaryId → card id added from this search (for undo)
    let timer = 0, run = 0;

    if (window.WortschatzMeanings) window.WortschatzMeanings.load(); // the trained meaning of each word (example-senses.json); until it's there, a guess
    function row(item) {
      const fields = M.searchFields(item, lang);
      const r = el("div", "coll-word coll-hit");
      const pick = button("coll-hit-main", "", () =>
        viewForm(null, Object.assign({}, opts, { prefill: fields, dictionaryId: item.id }))
      );
      pick.setAttribute("aria-label", S.fill(fields.base));
      pick.appendChild(el("span", "coll-de", fields.base, { lang: "de" }));
      pick.appendChild(el("span", "coll-tr", plainValue(fields.translation)));
      r.appendChild(pick);
      const status = el("span", "coll-hit-side");
      r.appendChild(status);
      const msg = el("p", "coll-error coll-hit-error");
      function draw() {
        status.textContent = "";
        const state = M.searchState(addedHere, item, fields);
        if (state === "added") {
          const b = button("coll-hit-added", "", () => { M.undoSearch(item, addedHere); dirty = true; refreshButtons(); draw(); });
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg>';
          b.setAttribute("aria-label", S.addedAria);
          status.appendChild(b);
        } else if (state === "in") {
          status.appendChild(el("span", "coll-hit-in", S.inList));
        } else {
          const b = button("coll-hit-add", "＋", () => {
            msg.textContent = "";
            const res = M.addFromSearch(item, lang, placement(), opts, addedHere);
            if (res.error) msg.textContent = res.error;
            else {
              if (res.created) { // the first ＋ created the collection: ‹ now leads to it, not back to „Your Own Words“
                opts = Object.assign({}, opts, { create: false, cancel: viewMain });
                const back = card.querySelector(".coll-back");
                if (back) back.onclick = viewMain;
              }
              dirty = true;
              refreshButtons();
            }
            draw();
          });
          b.setAttribute("aria-label", S.add(fields.base));
          status.appendChild(b);
        }
      }
      draw();
      const box = el("div");
      box.appendChild(r);
      box.appendChild(msg);
      return box;
    }
    async function update() {
      const q = input.value.trim(), mine = ++run;
      const searching = q.length > 0;
      // 03.11 (Alena): the window keeps its height while you search — the results take the form's place
      // (before, „no results“ shrank the window and it jumped down under the keyboard)
      if (searching && !form.classList.contains("coll-searching")) {
        results.style.minHeight = Math.max(0, form.clientHeight - wrap.offsetHeight - 6) + "px";
        form.scrollTop = 0;
      }
      if (!searching) results.style.minHeight = "";
      form.classList.toggle("coll-searching", searching);
      results.style.display = searching ? "" : "none";
      if (!searching) { results.textContent = ""; return; }
      // 20.11.2026 (Alena): from the first letter, like the Wörterbuch on Home — no «Keep typing…» (it sounded like an order)
      if (!results.childElementCount) results.appendChild(el("p", "coll-note", S.loading));
      let index;
      try { index = await M.loadDictionaryIndex(); } catch (e) {
        if (mine !== run) return;
        results.textContent = "";
        results.appendChild(el("p", "coll-error", S.loadError));
        // 20.11.2026 (Alena): loads the Wörterbuch again (the model forgets a failed load)
        results.appendChild(button("coll-raised coll-retry", S.retry, () => { results.textContent = ""; clearTimeout(timer); update(); }));
        return;
      }
      if (mine !== run) return;
      const items = M.findInDictionary(index, q);
      results.textContent = "";
      // 20.11.2026: one or two letters with nothing found (a translation is found from its 3rd letter) — nothing yet, not «not in the Wörterbuch»
      if (!items.length && q.length < 3) return;
      if (!items.length) {
        results.appendChild(el("p", "coll-note", S.none));
        // 20.11.2026 (Alena: the main cream button — the outlined one looked disabled): the same as × — clears the search, the form comes back — then the cursor in its first field
        results.appendChild(button("coll-main coll-add-self", S.addSelf, () => {
          const fill = S.selfFill(q);
          input.value = "";
          input.dispatchEvent(new Event("input"));
          clearTimeout(timer);
          update(); // show the form now (the input event waits 120 ms), so the field can take the cursor
          const target = fill && $(fill.field);
          if (target && !target.value.trim()) { target.value = fill.value; target.dispatchEvent(new Event("input", { bubbles: true })); }
          const first = $("cfSentence"); // the form's first field
          if (first) first.focus({ preventScroll: true });
        }));
        return;
      }
      // 20.11.2026 (Alena): the list right under the search — no line about where ＋ puts the word
      const list = el("div", "coll-list coll-list-below");
      items.forEach(item => list.appendChild(row(item)));
      results.appendChild(list);
    }
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 120); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });
    M.loadDictionaryIndex().catch(() => {}); // start loading while you look at the form
    return {
      focus: () => input.focus({ preventScroll: true }),
      refresh: () => { if (input.value.trim()) update(); }
    };
  }

  function viewDictionaryConfirm(prefill, validate, dictionaryId) {
    const v = M.dictionaryConfirm();
    card.textContent = "";
    card.appendChild(head(v.title, embedded ? close : viewMain));
    card.appendChild(el("p", "coll-text", v.text));
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", v.continue, () => viewForm(null, Object.assign(v.formOpts(prefill, validate, dictionaryId), { cancel: embedded ? close : viewMain }))));
    b.appendChild(button("coll-link", v.cancel, close));
    card.appendChild(b);
  }

  const I = window.WortschatzDictionaryImport;
  const DICTIONARY_PENDING = I.DIRECT;
  const processingDictionaryRequests = new Set();
  let lastDictionaryRequest = "";
  function clearDictionaryPending(id) {
    if (embedded) return;
    try {
      const pending = JSON.parse(sessionStorage.getItem(DICTIONARY_PENDING) || "null");
      if (pending?.id === id) sessionStorage.removeItem(DICTIONARY_PENDING);
    } catch (error) {
      console.error("Could not clear the dictionary request", error);
    }
  }
  function viewDictionaryError(error) {
    const v = M.dictionaryError(error);
    card.textContent = "";
    card.appendChild(head(v.title, embedded ? close : viewMain));
    if (v.already) {
      // 21.11.2026 (Alena, A2): the word is already there — the tick of the search's «added» (.coll-hit-added, not a
      // button here) before the word, then a grey line
      const line = el("div", "coll-already");
      const tick = el("span", "coll-hit-added", null, { "aria-hidden": "true" });
      tick.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
      line.append(tick, el("span", "coll-already-word", v.word));
      card.appendChild(line);
      card.appendChild(el("p", "coll-text", v.error, { role: "status" }));
      card.appendChild(button("coll-main", v.close, close));
      return;
    }
    card.appendChild(el("p", "coll-text", v.word));
    card.appendChild(el("p", "coll-error", v.error, { role: "alert" }));
    if (v.hint !== null) card.appendChild(el("p", "coll-hint", v.hint));
    card.appendChild(button("coll-main", v.close, close));
  }
  async function addDictionaryWord(request, onSaved) {
    if (!request?.id || request.version !== I.VERSION || request.id === lastDictionaryRequest || processingDictionaryRequests.has(request.id)) return;
    processingDictionaryRequests.add(request.id);
    try {
      const r = await M.prepareDictionaryWord(request);
      if (r.error) {
        open(() => viewDictionaryError(r.error));
        lastDictionaryRequest = request.id; clearDictionaryPending(request.id); return;
      }
      dictionarySaved = onSaved;
      open(() => r.form ? viewForm(null, Object.assign(r.form, { cancel: embedded ? close : viewMain })) : viewDictionaryConfirm(...r.confirm));
      lastDictionaryRequest = request.id; clearDictionaryPending(request.id);
    } catch (error) {
      console.error("Could not prepare the dictionary word", error);
      open(() => viewDictionaryError(error));
    } finally { processingDictionaryRequests.delete(request.id); }
  }

  const READING_PENDING = I.READING;
  // 10.11 (Alena): from a book (`embed`) the review stays over the book: after adding, a confirmation in the same window
  // (✓, «N Wörter», the words, «Weiterlesen» / «Открыть Wortschatz»); «Отказаться» or × end the batch at once — the
  // words stay marked in the book (Meine Wörter), nothing to lose, so no second question.
  let readingEmbed = null;
  modal.addEventListener("windowclose", () => {
    if (!readingEmbed) return;
    readingEmbed = null;
    try { sessionStorage.removeItem(READING_PENDING); } catch (e) {}
  });
  function viewReadingDone(result, words, unavailable, embed) {
    const v = M.readingDone(result, words, unavailable);
    card.textContent = "";
    card.appendChild(head(""));
    const box = el("div", "coll-done");
    const mark = box.appendChild(el("span", "coll-done-check", null, { "aria-hidden": "true" }));
    mark.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    box.appendChild(el("h3", "coll-done-title", v.title, { lang: "de", role: "status" }));
    box.appendChild(el("p", "coll-text", v.text));
    if (v.words) {
      const ul = box.appendChild(el("ul", "coll-done-list"));
      for (const w of v.words) {
        const li = ul.appendChild(el("li"));
        li.appendChild(el("span", "coll-de", w.de, { lang: "de" }));
        li.appendChild(el("span", "coll-tr", w.tr));
      }
    }
    if (v.note) box.appendChild(el("p", "coll-hint", v.note));
    box.appendChild(button("coll-main", v.continue, close));
    if (embed.openWortschatz) box.appendChild(button("coll-link", v.openWortschatz, () => { close(); embed.openWortschatz(); }));
    card.appendChild(box);
  }
  async function addReadingWords(request, embed = null) {
    readingEmbed = embed;
    if (!request?.id || request.version !== I.VERSION || !Array.isArray(request.rows) || !request.rows.length) return;
    request.excluded ||= [];
    request.placement ||= "end";
    request.name ||= M.MY_WORDS();
    const R = M.READING();
    const persist = () => sessionStorage.setItem(READING_PENDING, JSON.stringify(request));
    function review(message = "") {
      card.textContent = "";
      card.appendChild(head(R.title));
      const sc = el("div", "coll-scroll"); card.appendChild(sc);
      sc.appendChild(el("p", "coll-text", R.intro(request.title)));
      if (request.unavailable) sc.appendChild(el("p", "coll-hint", R.unavailable(request.unavailable)));
      // 08.11 (Alena): no line per word with its record number and reason — the line above says how many stay in Bibliothek.
      if (!own()) {
        sc.appendChild(el("p", "coll-text", R.startsCollection));
        sc.appendChild(el("label", "coll-label", R.collectionName, { for: "readingCollectionName" }));
        const nameInput = el("input", "coll-field", null, { id: "readingCollectionName", type: "text", maxlength: "40", value: request.name });
        nameInput.addEventListener("input", () => { request.name = nameInput.value; persist(); }); sc.appendChild(nameInput);
      }
      const box = el("div", "coll-list"); sc.appendChild(box);
      const confirmationLabel = () => R.confirm(M.readingSelected(request).length);
      let confirm, confirming = false;
      request.rows.forEach((draftRow, index) => {
        const word = draftRow.card || {};
        const row = el("div", "coll-word reading-review-row");
        const check = el("input", null, null, { type: "checkbox", "aria-label": R.include(word.base) });
        check.checked = !request.excluded.includes(index);
        check.addEventListener("change", () => {
          request.excluded = request.excluded.filter(i => i !== index);
          if (!check.checked) request.excluded.push(index);
          persist(); confirm.textContent = confirmationLabel(); confirm.disabled = !M.readingSelected(request).length;
        });
        const edit = button("coll-word is-btn", "", () => viewForm(word, { draft: true, cancel: () => review(), onSaved: fields => {
          draftRow.card = fields; draftRow.edited = true; persist(); review();
        } }));
        edit.appendChild(el("span", "coll-de", word.base || word.target || R.wordFallback));
        edit.appendChild(el("span", "coll-tr", plainValue(word.translation)));
        row.appendChild(check); row.appendChild(edit); box.appendChild(row);
      });
      if (own()) {
        sc.appendChild(el("label", "coll-label", R.placementLabel, { for: "readingPlacement" }));
        const placement = el("select", "coll-field", null, { id: "readingPlacement" });
        R.placements.forEach(o => placement.appendChild(el("option", null, o.text, { value: o.value })));
        placement.value = request.placement;
        placement.addEventListener("change", () => { request.placement = placement.value; persist(); }); sc.appendChild(placement);
        sc.appendChild(el("p", "coll-hint", R.placementHint));
      }
      const error = el("p", "coll-error", message); sc.appendChild(error);
      const buttons = el("div", "coll-form-buttons"); sc.appendChild(buttons);
      confirm = button("coll-main", confirmationLabel(), async () => {
        if (confirming) return;
        confirming = true;
        for (const control of sc.querySelectorAll("input,button,select")) control.disabled = true;
        try {
          const r = await M.confirmReading(request, persist);
          if (r.error) { error.textContent = r.error; return; }
          dirty = true;
          sessionStorage.removeItem(READING_PENDING);
          refreshButtons();
          if (embed) { viewReadingDone(r.result, r.words, request.unavailable || 0, embed); return; }
          viewMain();
          notice(r.notice);
          const listRows = card.querySelectorAll(".coll-list .coll-word");
          if (r.scrollTo >= 0) requestAnimationFrame(() => listRows[r.scrollTo]?.scrollIntoView({ block: "center" }));
        } finally { confirming = false; for (const control of sc.querySelectorAll("input,button,select")) control.disabled = false; confirm.disabled = !M.readingSelected(request).length; }
      });
      confirm.disabled = !M.readingSelected(request).length; buttons.appendChild(confirm);
      buttons.appendChild(button("coll-link", R.discard, () => {
        if (embed) { sessionStorage.removeItem(READING_PENDING); close(); return; }
        card.textContent = ""; card.appendChild(head(R.discardTitle, () => review()));
        card.appendChild(el("p", "coll-text", R.discardText));
        // 10.11 (Alena): the link stood glued to the button — both in the buttons row, as in the review
        const row = el("div", "coll-form-buttons"); card.appendChild(row);
        row.appendChild(button("coll-main", R.keepReviewing, () => review()));
        row.appendChild(button("coll-link", R.discardBatch, () => { sessionStorage.removeItem(READING_PENDING); viewMain(); }));
      }));
    }
    try {
      const issues = I.validate(request.rows, await I.load());
      persist(); open(() => review(issues.map(I.describe).join("; ")));
    } catch (error) {
      console.error("Could not restore the reading draft", error);
      open(() => review(R.restoreError));
    }
  }

  /* ---------- Word sets (v2026-10-26) — the sets and their words: M (SETS, loadSet, setWords, setPickState, addFromSet) ---------- */
  // Choose screen (wortschatz.js showChoose): one collection-line per set + „Start with my own words“.
  function fillChoose(box, ownBtn) {
    if (!box) return;
    box.textContent = "";
    M.SETS.forEach(def => {
      const wrap = el("div", "chooseSet");
      const b = button("coll-line", "", () => open(() => viewSetPick(def, null)));
      b.appendChild(el("span", "coll-line-name", def.name));
      b.appendChild(el("span", "coll-line-chev ui-chev", "", { "aria-hidden": "true" }));
      wrap.appendChild(b);
      const info = el("p", "collCount", "");
      wrap.appendChild(info);
      box.appendChild(wrap);
      M.loadSet(def).then(set => { info.textContent = M.chooseCount(set); }).catch(() => {});
    });
    if (ownBtn) ownBtn.onclick = () => open(viewCreate);
  }
  function viewSets(back, collectionName) {
    const v = M.setsScreen();
    card.textContent = "";
    card.appendChild(head(v.title, back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", v.text));
    const box = el("div", "coll-list coll-list-below");
    sc.appendChild(box);
    M.SETS.forEach(def => {
      const row = button("coll-word is-btn", "", () => viewSetPick(def, () => viewSets(back, collectionName), collectionName));
      const setName = el("span", "coll-de", "…");
      const info = el("span", "coll-tr", "");
      row.appendChild(setName);
      row.appendChild(info);
      box.appendChild(row);
      M.loadSet(def).then(set => {
        setName.textContent = set.name;
        info.textContent = M.setCount(set);
      }).catch(() => { setName.textContent = def.id; info.textContent = v.loadError; });
    });
  }
  async function viewSetPick(def, back, collectionName) {
    const P = M.SETPICK();
    card.textContent = "";
    card.appendChild(head(P.title, back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-note", P.loading));
    let set, words;
    try { ({ set, words } = await M.setWords(def)); } catch (e) {
      sc.textContent = "";
      sc.appendChild(el("p", "coll-error", P.loadError, { role: "alert" }));
      return;
    }
    card.textContent = "";
    card.appendChild(head(set.name, back));
    let nameIn = null;
    if (!own()) {
      // The ticked words become your own collection right away — name it now (you can rename it later too).
      const nb = el("div", "coll-pick-name");
      nb.appendChild(el("label", "coll-label", P.collectionName, { for: "cfSetName" }));
      nameIn = el("input", "coll-field", null, { id: "cfSetName", type: "text", maxlength: "40", autocomplete: "off", value: collectionName || set.name });
      nameIn.value = collectionName || set.name;
      nb.appendChild(nameIn);
      nb.appendChild(el("p", "coll-hint", P.nameHint));
      card.appendChild(nb);
    }
    const top = el("div", "coll-pick-top");
    const count = el("span", "coll-pick-count", "", { "aria-live": "polite" });
    // „Select All“ on the left, above the ticks (a circle like the word ticks, as in the Bibliothek); the count on the right
    const allRow = el("label", "coll-pick-all");
    const all = el("input", null, null, { type: "checkbox", "aria-label": P.selectAllAria });
    allRow.appendChild(all);
    allRow.appendChild(document.createTextNode(P.selectAll));
    top.appendChild(allRow);
    top.appendChild(count);
    card.appendChild(top);
    const listBox = el("div", "coll-scroll coll-list coll-pick-list");
    card.appendChild(listBox);
    const picked = new Set();
    const avail = words.filter(w => !M.inList(w));
    const boxes = [];
    words.forEach((w, i) => {
      const there = M.inList(w);
      const row = el("label", "coll-word coll-pick" + (there ? " is-in" : ""));
      if (there) row.appendChild(el("span", "coll-hit-in coll-pick-mark", P.inList));
      else {
        const cb = el("input", "coll-pick-check", null, { type: "checkbox", "aria-label": P.learn(w.base) });
        cb.addEventListener("change", () => { cb.checked ? picked.add(i) : picked.delete(i); draw(); });
        boxes.push([cb, i]);
        row.appendChild(cb);
      }
      const text = el("span", "coll-pick-text");
      text.appendChild(el("span", "coll-de", w.base, { lang: "de" }));
      text.appendChild(el("span", "coll-tr", plainValue(w.translation)));
      row.appendChild(text);
      listBox.appendChild(row);
    });
    const bottom = el("div", "coll-form-buttons coll-pick-bottom");
    let now = null;
    if (own()) {
      const sw = el("label", "coll-switch");
      sw.appendChild(el("span", null, P.learnNow));
      now = el("input", null, null, { type: "checkbox", "aria-label": P.learnNowAria });
      now.checked = true;
      sw.appendChild(now);
      bottom.appendChild(sw);
      bottom.appendChild(el("p", "coll-hint", P.learnNowNote));
    }
    const err = el("p", "coll-error", "", { role: "alert" });
    bottom.appendChild(err);
    const add = button("coll-main", "", null);
    bottom.appendChild(add);
    card.appendChild(bottom);
    function draw() {
      const s = M.setPickState(picked.size, avail.length);
      count.textContent = s.count;
      all.checked = s.all;
      all.indeterminate = s.indeterminate;
      allRow.style.display = s.showAll ? "" : "none";
      add.textContent = s.button;
      add.disabled = s.disabled;
      err.textContent = "";
    }
    all.onchange = () => {
      const on = picked.size !== avail.length;
      boxes.forEach(([cb, i]) => { cb.checked = on; on ? picked.add(i) : picked.delete(i); });
      draw();
    };
    add.onclick = () => {
      if (!picked.size) return;
      const items = [...picked].sort((a, b) => a - b).map(i => words[i]);
      const r = M.addFromSet(set, items, now ? now.checked : null, nameIn && nameIn.value);
      if (r.error) { err.textContent = r.error; return; }
      dirty = true;
      refreshButtons();
      viewMain();
      notice(r.notice);
    };
    draw();
  }

  /* ---------- Lerntempo (2026-10-26): the button at the bottom right of the start / done screen ---------- */
  function viewSettings() {
    card.textContent = "";
    card.appendChild(head(M.settings().title));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    const box = el("div", "coll-paces", null, { role: "radiogroup", "aria-label": "Lerntempo" });
    sc.appendChild(box);
    // the rows: the shared one-of-a-list choice (.ui-choice, components/deutsch-ui-v1.css, 17.11.2026)
    function draw() {
      const v = M.settings();
      box.textContent = "";
      v.options.forEach(o => {
        const b = button("ui-choice" + (o.on ? " on" : ""), "", () => {
          const id = M.setPace(o.id);
          const paceBtn = document.getElementById("wsSettings"); // 19.11.2026: the icon follows the pace (tortoise / hare)
          if (paceBtn) paceBtn.dataset.pace = id;
          draw();
        });
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", o.on ? "true" : "false");
        b.appendChild(el("span", "ui-choice-dot", null, { "aria-hidden": "true" }));
        const t = el("span", "ui-choice-text");
        const name = el("span", "ui-choice-name", o.name); t.appendChild(name);
        // 19.11.2026 (Alena, variant A): the pace's icon right after its name — the same tortoise / hare as on the
        // button (#wsSettings), so it is clear where the button's icon comes from. Silent for VoiceOver.
        const icon = document.querySelector("#wsSettings svg")?.cloneNode(true);
        if (icon) {
          icon.setAttribute("class", "coll-pace-icon");
          icon.querySelectorAll("path").forEach(path => { if (!path.classList.contains("pace-" + o.id)) path.remove(); else path.removeAttribute("class"); });
          if (icon.querySelector("path")) { name.classList.add("coll-pace-name"); name.appendChild(icon); }
        }
        t.appendChild(el("span", "ui-choice-note", o.note));
        t.appendChild(el("span", "ui-choice-note ui-choice-num", o.days));
        b.appendChild(t);
        box.appendChild(b);
      });
    }
    draw();
    sc.appendChild(el("p", "coll-hint", M.settings().hint));
  }

  // session (from ✎ during practice): no reload — the running session drops the word and goes on (2026-10-26)
  function viewRemove(w, session) {
    const v = M.removeScreen(w, session);
    card.textContent = "";
    card.appendChild(head(v.title));
    card.appendChild(el("p", "coll-text", v.text));
    const b = el("div", "coll-buttons");
    b.appendChild(button("coll-main", v.keep, () => viewForm(w, session || undefined)));
    b.appendChild(
      button("coll-quiet", v.delete, () => {
        const r = M.removeWord(w, session);
        if (!r.ok) return;
        if (r.session) {
          close();
          session.onDeleted(w.id);
          return;
        }
        dirty = true;
        refreshButtons();
        viewMain();
      })
    );
    card.appendChild(b);
  }

  function copyText(text, done) {
    const fallback = () => {
      const t = el("textarea", null, null, { readonly: "", style: "position:fixed;top:-1000px;opacity:0" });
      t.value = text;
      document.body.appendChild(t);
      t.select();
      t.setSelectionRange(0, text.length);
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      t.remove();
      done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(() => done(true), fallback);
    else fallback();
  }

  // No collection yet → own words: name, then add the first word (Wörterbuch search / typing) or import a list.
  function viewCreate() {
    const v = M.create();
    card.textContent = "";
    card.appendChild(head(v.title));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", v.text));
    const l = el("label", "coll-label", v.nameLabel, { for: "cfName" });
    sc.appendChild(l);
    const nameIn = el("input", "coll-field", null, {
      id: "cfName",
      type: "text",
      maxlength: "40",
      placeholder: v.namePlaceholder,
      autocomplete: "off"
    });
    sc.appendChild(nameIn);
    const nm = () => M.createName(nameIn.value);
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", v.first, () => viewForm(null, { create: true, name: nm(), cancel: viewCreate })));
    b.appendChild(button("coll-raised", v.import, () => viewImport({ create: true, name: nm() })));
    card.appendChild(b);
  }

  // Paste the AI's answer or pick a file. opts.create: this list starts a new collection.
  function viewImport(opts) {
    const v = M.importScreen(opts);
    card.textContent = "";
    card.appendChild(head(v.title, opts.create ? viewCreate : viewMain));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    const intro = el("p", "coll-text");
    intro.style.marginBottom = "10px";
    intro.appendChild(document.createTextNode(v.intro));
    intro.appendChild(button("coll-link", v.format, () => viewFormat(() => viewImport(opts))));
    sc.appendChild(intro);
    const ta = el("textarea", "coll-field coll-paste", null, {
      id: "cfPaste",
      rows: "7",
      placeholder: v.pastePlaceholder,
      "aria-label": v.pasteLabel,
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false"
    });
    sc.appendChild(ta);
    const fileIn = el("input", null, null, {
      type: "file",
      accept: v.accept,
      style: "display:none"
    });
    sc.appendChild(fileIn);
    const fileRow = el("p", "coll-hint");
    fileRow.appendChild(document.createTextNode(v.or));
    fileRow.appendChild(button("coll-link", v.chooseFile, () => fileIn.click()));
    sc.appendChild(fileRow);
    if (v.endNote) sc.appendChild(el("p", "coll-hint", v.endNote));
    const err = el("p", "coll-error");
    sc.appendChild(err);
    ta.addEventListener("input", () => {
      err.textContent = "";
    });

    function run(text) {
      err.textContent = "";
      const r = M.runImport(text, opts);
      if (r.error) {
        err.textContent = r.error;
        return;
      }
      dirty = true;
      refreshButtons();
      viewResult(r.result, opts);
    }
    fileIn.addEventListener("change", () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      const problem = M.fileProblem(f.size);
      if (problem) {
        err.textContent = problem;
        return;
      }
      f.text().then(
        t => {
          ta.value = t;
          run(t);
        },
        () => {
          err.textContent = M.fileUnreadable();
        }
      );
    });

    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", v.button, () => run(ta.value)));
    card.appendChild(b);
  }

  function viewResult(r, opts) {
    const v = M.result(r, opts);
    card.textContent = "";
    card.appendChild(head(v.title));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", v.text));
    if (v.duplicates) sc.appendChild(el("p", "coll-hint", v.duplicates));
    if (v.skippedLabel) {
      sc.appendChild(el("p", "coll-label", v.skippedLabel));
      v.skipped.forEach(line => sc.appendChild(el("p", "coll-hint", line)));
      if (v.more) sc.appendChild(el("p", "coll-hint", v.more));
    }
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", v.done, close));
    card.appendChild(b);
  }

  // Shows the format block and copies it.
  function viewFormat(back) {
    const v = M.format();
    card.textContent = "";
    card.appendChild(head(v.title, back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", v.text));
    sc.appendChild(el("pre", "coll-pre", v.block));
    const b = el("div", "coll-form-buttons");
    const copyBtn = button("coll-main", v.copy, () =>
      copyText(v.block, ok => {
        copyBtn.textContent = ok ? v.copied : v.copyFailed;
      })
    );
    b.appendChild(copyBtn);
    card.appendChild(b);
  }

  /* ---------- rename ---------- */
  function viewRename() {
    const v = M.rename();
    card.textContent = "";
    card.appendChild(head(v.title, viewMain));
    const input = el("input", "coll-name-input", null, {
      type: "text",
      maxlength: "40",
      "aria-label": v.label,
      autocomplete: "off"
    });
    input.value = v.value;
    const save = () => {
      M.renameTo(input.value);
      refreshButtons();
      viewMain();
    };
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      }
    });
    card.appendChild(input);
    const b = el("div", "coll-buttons");
    b.style.marginTop = "22px";
    b.appendChild(button("coll-main", v.save, save));
    card.appendChild(b);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 60);
  }

  /* ---------- export: a clean list that can be imported again (M.exportFile: name + text) ---------- */
  function exportFile() {
    const f = M.exportFile();
    const blob = new Blob([f.text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- delete the collection ---------- */
  function viewDelete() {
    const v = M.deleteScreen();
    card.textContent = "";
    card.appendChild(head(v.title));
    card.appendChild(el("p", "coll-text", v.text));
    const b = el("div", "coll-buttons");
    b.appendChild(button("coll-main", v.keep, viewMain)); // safe choice = contrast button
    b.appendChild(button("coll-quiet", v.delete, () => { M.deleteCollection(); location.reload(); }));
    b.appendChild(button("coll-link", v.exportFirst, exportFile));
    card.appendChild(b);
  }


  ["collBtnStart", "collBtnDone"].forEach(id => {
    const b = $(id);
    if (b) b.onclick = open;
  });
  refreshButtons();
  // ✎ on the answer screen: edit the card you're looking at (own collection only)
  function editInSession(w, onSaved, onDeleted) {
    if (M.sessionEditable(w)) open(() => viewForm(w, { session: true, onSaved, onDeleted }));
  }
  if ($("wsSettings")) $("wsSettings").onclick = () => open(viewSettings);
  window.WortschatzCollectionWindow = { open, close, refreshButtons, editInSession, addDictionaryWord, fillChoose, reviewReadingWords: addReadingWords };
  // Only unfinished legacy imports are discarded; localStorage is untouched.
  if (!embedded) {
    try {
      sessionStorage.removeItem("deutschWortschatzPendingDictionaryWordV1");
      sessionStorage.removeItem("deutschWortschatzPendingReadingWordsV1");
    } catch (error) { console.error("Could not discard legacy imports", error); }
  }
  function restoreReading() {
    try {
      // 10.11: an unfinished reading review comes back where it was opened — over the book in Bibliothek.
      const pending = sessionStorage.getItem(READING_PENDING);
      if (pending) {
        addReadingWords(JSON.parse(pending), embedded ? { get openWortschatz() { return window.BibliothekOpenWortschatz; } } : null);
      }
    } catch (error) {
      console.error("Could not read the reading draft", error);
      const R = M.READING();
      open(() => {
        card.textContent = "";
        card.appendChild(head(R.restoreTitle, close));
        card.appendChild(el("p", "coll-error", R.restoreText, { role: "alert" }));
        card.appendChild(button("coll-main", R.close, close));
      });
    }
  }
  if (embedded) { restoreReading(); return; } // Reader: only an unfinished reading review comes back, over the book.
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.type !== "deutsch:wortschatz-add") return;
    addDictionaryWord(event.data.request);
  });
  try {
    const pending = sessionStorage.getItem(DICTIONARY_PENDING);
    if (pending) addDictionaryWord(JSON.parse(pending));
  } catch (error) {
    console.error("Could not restore the dictionary request", error);
    open(() => viewDictionaryError(error));
  }
  restoreReading();
})();
