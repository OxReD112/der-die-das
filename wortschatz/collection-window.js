/* Wortschatz · collection button + window — v6, 2026-09-26 (v2: word form · v3: ✎ on the answer screen · v4: import · v5: English · v6: Starter-Set + new start screen)
   All texts in this window are in the user's language (02.11.2026, RU / EN — the app's language switch,
   DeutschTranslation): users whose German is still weak must understand how to manage and import their words.
   Names stay German (Wortschatz, Wörterbuch, Bibliothek, Lerntempo, word sets). English labels in Title Case
   (Settings rule), questions in sentence case; Russian in sentence case, addressed with „ты“ as the German „du“.
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 3). Storage lives in collection.js.
   - Start screen: „DEINE WÖRTER“ + „<name> · <n> Wörter ›“ (opens the window).
   - „Fertig für heute“: pill „<name> · <n> Wörter“.
   - 2026-10-26: no built-in Starter-Set. No collection → choose screen (word sets / own words, fillChoose).
   - Window: name, word count, word list; own collection: rename, export, delete → back to the built-in set.
   - Word form (step 4): „＋ Wort hinzufügen“ and tap a word in the list = edit / delete it.
     Changes that touch progress or WORDS set `dirty`; closing the window then reloads the page
     (Wortschatz keeps progress and WORDS in memory and would otherwise work with the old ones).
   All user text is inserted with textContent (never as HTML). */
(function () {
  const C = window.WortschatzCollection;
  const $ = id => document.getElementById(id);
  const modal = $("collModal"),
    card = $("collCard");
  if (!C || !modal || !card) return;
  const embedded = modal.dataset.host === "reader";
  let dictionarySaved = null;
  // 2026-10-26: no built-in Starter-Set any more. Without an own collection Wortschatz shows the choose screen
  // (word sets / own words, fillChoose below); the window then only offers ways to start one.
  const own = () => C.isOwn();
  const list = () => (own() ? C.cards() : []);
  // L(en, ru): the text in the user's language. ruN(n, „слово“, „слова“, „слов“): the Russian plural for n.
  const RU = () => window.DeutschTranslation?.getLang?.() === "ru";
  const L = (en, ru) => (RU() ? ru : en);
  const ruN = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many;
  };
  const MY_WORDS = () => L("My Words", "Мои слова"); // the default name, in the user's language (rename any time)
  const name = () => (own() ? C.get().name || MY_WORDS() : "");
  const wordsLabel = n => L(n === 1 ? "1 word" : n + " words", n + " " + ruN(n, "слово", "слова", "слов"));
  const wordsTitle = n => L(n === 1 ? "1 Word" : n + " Words", n + " " + ruN(n, "слово", "слова", "слов"));
  const tr = (c, f) =>
    typeof window.getTranslation === "function" ? window.getTranslation(c, f) : typeof c[f] === "string" ? c[f] : "";

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
    const n = list().length,
      count = n === 1 ? "1 Wort" : n + " Wörter",
      label = name() + " · " + count;
    ["collBtnStart", "collBtnDone"].forEach(id => {
      // „<name> ›“ on both screens
      const b = $(id);
      if (!b) return;
      b.textContent = "";
      b.appendChild(el("span", "coll-line-name", name()));
      b.appendChild(el("span", "coll-line-chev", "›", { "aria-hidden": "true" }));
      b.setAttribute("aria-label", L("Word collection: ", "Коллекция слов: ") + label);
    });
    // v2.102: „15 / 217 Wörter angefangen“ — words you've started (in your rotation) out of all words in the collection.
    // Read from the saved progress, so it's right on both screens (the page saves after every change).
    let started = 0;
    try {
      const st = JSON.parse(localStorage.getItem(C.PROGRESS_KEY) || "null");
      const ids = new Set(list().map(w => String(w.id)));
      started = (st && Array.isArray(st.activeIds) ? st.activeIds : []).filter(id => ids.has(String(id))).length;
    } catch (e) {}
    const countText = started + " / " + n + " Wörter angefangen";
    ["collCountStart", "collCountDone"].forEach(id => {
      const c = $(id);
      if (c) c.textContent = countText;
    });
  }

  /* ---------- open / close (same timing as the table windows) ---------- */
  let lastFocus = null,
    dirty = false,
    closeTimer = null;
  function open(firstView) {
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    dirty = false;
    (typeof firstView === "function" ? firstView : viewMain)();
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.classList.add("open");
      card.querySelector("button, input, textarea")?.focus({ preventScroll: true });
    }));
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    closeTimer = setTimeout(() => {
      card.textContent = "";
      if (dirty && !embedded) location.reload();
    }, 220);
    if (lastFocus && lastFocus.focus)
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (e) {}
  }
  modal.addEventListener("click", e => {
    if (e.target === modal) close();
  });
  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Tab" && modal.classList.contains("open")) {
        const controls = [...card.querySelectorAll("button, input, textarea, select, a[href]")].filter(el => !el.disabled && el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (first && ((!card.contains(document.activeElement)) || (e.shiftKey ? document.activeElement === first : document.activeElement === last))) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
      if (e.key === "Escape" && modal.classList.contains("open")) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    },
    true
  );
  // Keys typed in the window (rename field) must not reach the exercise's Enter handlers
  card.addEventListener("keydown", e => {
    if (e.key === "Enter") e.stopPropagation();
  });

  // ‹ (one step back) left of the title, × (close the window) on the right — like the Fortschritt window.
  // No „Cancel“ links any more (v2.100): ‹ does what they did.
  function head(title, back) {
    const h = el("div", "coll-head");
    if (back) h.appendChild(button("coll-back", "‹", back)).setAttribute("aria-label", L("Back", "Назад"));
    h.appendChild(el("h2", "coll-title", title, { id: "collTitle" }));
    h.appendChild(button("coll-close", "×", close)).setAttribute("aria-label", L("Close", "Закрыть"));
    return h;
  }

  /* ---------- main view: name, count, list, actions ---------- */
  function viewMain() {
    if (!own()) return viewCreate();
    card.textContent = "";
    const words = list();
    card.appendChild(head(name()));
    const meta = el("p", "coll-meta");
    meta.appendChild(document.createTextNode(wordsLabel(words.length) + " · "));
    meta.appendChild(button("coll-link", L("Rename", "Переименовать"), viewRename));
    card.appendChild(meta);

    // v2.104: both ways to get words in, side by side (same shape; Add Word = the everyday action, cream)
    // v2.111: Import List = the raised „Use your own words“ look (the outlined one looked disabled)
    const top = el("div", "coll-pair");
    // 03.11 (Alena): German labels like Weiter / Starten — short enough for two equal buttons on every phone
    top.appendChild(button("coll-main", "＋ Wort", () => viewForm(null)));
    top.appendChild(button("coll-raised", "Importieren", () => viewImport({})));
    card.appendChild(top);
    if (!embedded) {
      // opens another view (not a fold-out) → „Word Sets ›“, the same › as the start screen's collection line
      const ws = button("coll-sets-link", "", () => viewSets(viewMain));
      ws.appendChild(el("span", null, L("Word Sets", "Наборы слов")));
      ws.appendChild(el("span", "coll-line-chev", "›", { "aria-hidden": "true" }));
      card.appendChild(ws);
    }

    const box = el("div", "coll-list coll-list-below");
    words.forEach(w => {
      const row = own() ? button("coll-word is-btn", "", () => viewForm(w)) : el("div", "coll-word");
      const german = el("span", "coll-de", undefined, { lang: "de" });
      const addedAt = Date.parse(w.addedAt || "");
      if (own() && Number.isFinite(addedAt) && Date.now() - addedAt < 24 * 60 * 60 * 1000 && Date.now() >= addedAt) {
        german.appendChild(el("span", "coll-new", L("New", "Новое"), { "aria-label": L("Added within the last 24 hours", "Добавлено за последние 24 часа") }));
      }
      german.appendChild(document.createTextNode(w.base || String(w.target || "").split(" / ").join(" ")));
      row.appendChild(german);
      row.appendChild(el("span", "coll-tr", tr(w, "translation")));
      box.appendChild(row);
    });
    if (!words.length) box.appendChild(el("p", "coll-note", L("No words yet.", "Слов пока нет.")));
    card.appendChild(box);

    // rare / risky actions: two quiet links at the bottom
    const bottom = el("div", "coll-bottom");
    bottom.appendChild(button("coll-link", L("Export", "Экспорт"), () => exportFile()));
    bottom.appendChild(el("span", "coll-dot", "·", { "aria-hidden": "true" }));
    bottom.appendChild(button("coll-link", L("Delete", "Удалить"), viewDelete));
    card.appendChild(bottom);
  }

  /* ---------- word form: add (card=null) or edit one word ---------- */
  // The sentence is split into word chips; tapping a chip hides that word ({{c1::…}}).
  // Several chips = one split answer (separable verbs: „schlage“ + „vor“).
  const CLOZE = /\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const POS = ["Verb", "Substantiv", "Adjektiv", "Andere"]; // stored values (same as the built-in cards)
  const POS_LABEL = p => (RU() ? { Verb: "Глагол", Substantiv: "Существительное", Adjektiv: "Прилагательное", Andere: "Другое" } : { Verb: "Verb", Substantiv: "Noun", Adjektiv: "Adjective", Andere: "Other" })[p]; // shown
  function splitToken(t) {
    const m = t.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return { lead: m[1], core: m[2], trail: m[3] };
  }
  function tokensFromCloze(sentence) {
    // protect spaces inside a cloze so „{{c1::zur Verfügung}}“ stays one chip
    const prot = String(sentence || "").replace(
      CLOZE,
      (m, w) => "\u0001" + w.trim().replace(/\s+/g, "\u0002") + "\u0003"
    );
    return prot
      .split(/\s+/)
      .filter(Boolean)
      .map(t => {
        const on = t.includes("\u0001");
        const plain = t.replace(/[\u0001\u0003]/g, "").replace(/\u0002/g, " ");
        return Object.assign(splitToken(plain), { on });
      });
  }
  function tokensFromText(text, prev) {
    const wanted = (prev || []).filter(t => t.on).map(t => t.core);
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => {
        const tok = Object.assign(splitToken(t), { on: false });
        const i = wanted.indexOf(tok.core);
        if (tok.core && i > -1) {
          tok.on = true;
          wanted.splice(i, 1);
        }
        return tok;
      });
  }
  const plainText = toks => toks.map(t => t.lead + t.core + t.trail).join(" ");
  const clozeText = toks =>
    toks.map(t => (t.on && t.core ? t.lead + "{{c1::" + t.core + "}}" + t.trail : t.lead + t.core + t.trail)).join(" ");
  const hiddenWords = toks =>
    toks
      .filter(t => t.on && t.core)
      .map(t => t.core)
      .join(" ");
  const plainValue = v => (typeof v === "string" ? v : v && typeof v === "object" ? tr({ x: v }, "x") || "" : "");

  function field(label, opt, tag, attrs) {
    const wrap = document.createElement("div");
    const l = el("label", "coll-label", label);
    if (opt) l.appendChild(el("span", "opt", L(" · optional", " · необязательно")));
    const f = el(
      tag,
      "coll-field",
      null,
      Object.assign({ autocomplete: "off", autocapitalize: "off", spellcheck: "false" }, attrs || {})
    );
    l.setAttribute("for", attrs.id);
    wrap.appendChild(l);
    wrap.appendChild(f);
    return [wrap, f];
  }

  // opts.session: opened from ✎ on the answer screen — no reload; Delete Word only with opts.onDeleted (2026-10-26);
  // onSaved(card) lets the running session show the corrected card right away.
  function viewForm(w, opts) {
    opts = opts || {};
    const editing = !!w,
      session = !!opts.session,
      creating = !!opts.create;
    card.textContent = "";
    card.appendChild(head(editing ? L("Edit Word", "Изменить слово") : L("New Word", "Новое слово"), session ? null : opts.cancel || viewMain));
    // v2026-10-26: Wörterbuch search on top of the new-word form (only in Wortschatz itself, not in Bibliothek,
    // not for a word that already came from the Wörterbuch). While you search, the form hides.
    const withSearch = !editing && !opts.draft && !embedded && !opts.fromDictionary;
    const sc = el("div", "coll-scroll");
    const search = withSearch ? dictionarySearch(opts, sc, () => (now ? (now.checked ? "next" : "end") : "next")) : null;
    card.appendChild(sc);

    const prefill = !editing && opts.prefill ? opts.prefill : null;
    let toks = editing ? tokensFromCloze(w.sentence) : prefill ? tokensFromCloze(prefill.sentence || "") : [];
    const [fS, fSentence] = field(L("Sentence", "Предложение"), false, "textarea", {
      id: "cfSentence",
      rows: "2",
      placeholder: "Ich schlage Samstag vor."
    });
    fSentence.value = plainText(toks);
    sc.appendChild(fS);
    const chips = el("div", "coll-chips");
    sc.appendChild(chips);
    const hint = el("p", "coll-hint", L("Tap the word you want to practise. For separable verbs, tap both parts.", "Нажми на слово, которое хочешь тренировать. У глаголов с отделяемой приставкой — на обе части."));
    sc.appendChild(hint);
    const preview = el("p", "coll-preview");
    sc.appendChild(preview);

    const [fM, fMeaning] = field(L("Meaning", "Значение"), false, "input", {
      id: "cfMeaning",
      type: "text",
      placeholder: L("to suggest", "предлагать")
    });
    fMeaning.value = editing ? plainValue(w.translation) : prefill ? plainValue(prefill.translation) : "";
    sc.appendChild(fM);
    // 2026-10-26: the word's other meanings (shown quietly as „auch: …“ under the answer), separated by „;“
    const [fO, fOther] = field(L("Other Meanings", "Другие значения"), true, "input", { id: "cfOther", type: "text", placeholder: L("to propose; to recommend", "выдвигать; советовать") });
    fOther.value = editing ? plainValue(w.otherMeanings) : prefill ? plainValue(prefill.otherMeanings) : "";
    sc.appendChild(fO);
    const [fT, fTrans] = field(L("Sentence Translation", "Перевод предложения"), true, "input", {
      id: "cfTrans",
      type: "text",
      placeholder: L("I suggest Saturday.", "Предлагаю субботу.")
    });
    fTrans.value = editing ? plainValue(w.sentenceTranslation) : prefill ? plainValue(prefill.sentenceTranslation) : "";
    sc.appendChild(fT);
    const [fB, fBase] = field(L("Base Form", "Начальная форма"), true, "input", { id: "cfBase", type: "text" });
    const autoBase = () => hiddenWords(toks);
    fBase.value = editing && w.base && w.base !== autoBase() ? w.base : prefill ? prefill.base || "" : "";
    sc.appendChild(fB);
    const [fG, fGram] = field(L("Grammar", "Грамматика"), true, "input", {
      id: "cfGram",
      type: "text",
      placeholder: "schlug vor · hat vorgeschlagen"
    });
    fGram.value = editing ? plainValue(w.grammar) : prefill ? plainValue(prefill.grammar) : "";
    sc.appendChild(fG);

    sc.appendChild(el("span", "coll-label", L("Word Class", "Часть речи"))).appendChild(el("span", "opt", L(" · optional", " · необязательно")));
    const posBox = el("div", "coll-chips");
    sc.appendChild(posBox);
    let pos = editing ? w.pos || "" : prefill ? prefill.pos || "" : "";
    const posChip = p => (POS.slice(0, 3).includes(pos) ? pos === p : p === "Andere" && !!pos);
    function drawPos() {
      posBox.textContent = "";
      POS.forEach(p => {
        const c = button("coll-chip" + (posChip(p) ? " on" : ""), POS_LABEL(p), () => {
          pos = posChip(p) ? "" : p === "Andere" ? (POS.slice(0, 3).includes(pos) || !pos ? "Andere" : pos) : p;
          drawPos();
        });
        c.setAttribute("aria-pressed", posChip(p) ? "true" : "false");
        posBox.appendChild(c);
      });
    }
    drawPos();

    let now = null;
    if (!editing && !creating && !opts.draft) {
      const sw = el("label", "coll-switch");
      sw.appendChild(el("span", null, L("Learn Now", "Учить сейчас")));
      now = el("input", null, null, { type: "checkbox", "aria-label": L("Learn now", "Учить сейчас") });
      now.checked = true;
      sw.appendChild(now);
      sc.appendChild(sw);
      sc.appendChild(el("p", "coll-hint", L("On: comes with your next new words (+ 5). Off: added to the end of your list.", "Вкл.: слово придёт со следующими новыми словами (+ 5). Выкл.: добавится в конец списка.")));
      now.addEventListener("change", () => search?.refresh());
    }
    const err = el("p", "coll-error");
    sc.appendChild(err);
    sc.addEventListener("input", () => {
      err.textContent = "";
    }); // an old hint disappears as soon as you type
    if (editing)
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
      const any = toks.some(t => t.on && t.core);
      preview.textContent = "";
      if (any)
        toks.forEach((t, i) => {
          if (i) preview.appendChild(document.createTextNode(" "));
          preview.appendChild(document.createTextNode(t.lead));
          if (t.on && t.core) {
            const b = el("span", "blank");
            b.setAttribute("aria-label", L("gap", "пропуск"));
            preview.appendChild(b);
          } else preview.appendChild(document.createTextNode(t.core));
          preview.appendChild(document.createTextNode(t.trail));
        });
      hint.style.display = toks.length && !any ? "" : "none";
      fBase.placeholder = autoBase() || (editing ? "" : "vorschlagen");
    }
    fSentence.addEventListener("input", () => {
      toks = tokensFromText(fSentence.value, toks);
      drawChips();
    });
    drawChips();

    let validatingSave=false;
    async function save() {
      if(validatingSave)return;
      err.textContent = "";
      const fields = {
        sentence: clozeText(toks),
        translation: fMeaning.value,
        otherMeanings: fOther.value,
        sentenceTranslation: fTrans.value,
        base: fBase.value.trim() || autoBase(),
        grammar: fGram.value,
        pos
      };
      const dictionaryId = opts.dictionaryId || (prefill && prefill.dictionaryId);
      if (dictionaryId) fields.dictionaryId = dictionaryId;
      if (!toks.length) {
        err.textContent = L("Please type a sentence.", "Напиши предложение.");
        fSentence.focus();
        return;
      }
      if (!hiddenWords(toks)) {
        err.textContent = L("Please tap the word you want to practise.", "Нажми на слово, которое хочешь тренировать.");
        return;
      }
      if (!fMeaning.value.trim()) {
        err.textContent = L("Please type the meaning.", "Напиши значение.");
        fMeaning.focus();
        return;
      }
      try {
        if (opts.validate) {
          validatingSave=true;
          let problems;
          try { problems=await opts.validate(); } finally { validatingSave=false; }
          if(problems.length){err.textContent=problems.map(I.describe).join("; ");return;}
        }
        if (opts.draft) {
          const normalized = C.normalize(fields);
          if (normalized.reason) { err.textContent=normalized.reason; return; }
          opts.onSaved(normalized.card);
          return;
        }
        if (editing) {
          const r = C.update(w.id, fields);
          if (r.reason) {
            err.textContent = r.reason;
            return;
          }
          if (session) {
            if (opts.onSaved) opts.onSaved(r.card);
            close();
            return;
          }
        } else {
          const r = creating && !own() ? C.create(opts.name, [fields]) : C.add([fields], { placement: now && !now.checked ? "end" : "next" });
          if (r.duplicates) {
            err.textContent = L("This word is already in your collection.", "Это слово уже есть в коллекции.");
            return;
          }
          if (!r.added) {
            err.textContent = (r.skipped[0] && r.skipped[0].reason) || L("The word couldn't be saved.", "Не удалось сохранить слово.");
            return;
          }
        }
      } catch (e) {
        err.textContent =
          e.message === "storage-full" ? L("Storage is full - the word wasn't saved.", "Память заполнена — слово не сохранено.") : L("The word couldn't be saved.", "Не удалось сохранить слово.");
        return;
      }
      dirty = true;
      refreshButtons();
      if (embedded) { close(); dictionarySaved?.(); return; }
      viewMain();
    }

    const b = el("div", "coll-form-buttons");
    if (creating) opts.cancel = opts.cancel || viewMain;
    b.appendChild(button("coll-main", L("Save", "Сохранить"), save));
    if (editing && !session && !opts.draft) b.appendChild(button("coll-link", L("Delete Word", "Удалить слово"), () => viewRemove(w)));
    if (editing && session && opts.onDeleted) b.appendChild(button("coll-link", L("Delete Word", "Удалить слово"), () => viewRemove(w, opts)));
    sc.appendChild(b); // Save at the very END of the form (v2.100): you pass every field first
    if (!editing) setTimeout(() => (search && !prefill ? search.focus() : !prefill && fSentence.focus()), 60);
  }

  /* ---------- Wörterbuch search in the new-word form (v2026-10-26, plan: OPEN_TASKS „Wortschatz — доработки“ 1) ----------
     Type → the form hides and dictionary cards show (German word or its RU / EN translation).
     ＋ adds the card at once („Learn Now“ decides: next new words or end of the list); ✓ Added = tap to undo.
     Tap the word itself → the form is filled with that card, to check or change it before Save.
     Clear the search → the form is back. Cards without a learning example are not shown. */
  let dictionaryIndex = null; // one load per page
  const fold = v =>
    String(v || "").normalize("NFC").toLocaleLowerCase("de-DE").trim()
      .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ё/g, "е");
  function loadDictionaryIndex() {
    dictionaryIndex ||= I.load().then(map => {
      const seen = new Set(), out = [];
      for (const item of map.values()) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        if (!window.WortschatzDictionaryCard.check(item).available) continue;
        const word = item.word || item.infinitive || "";
        const de = [word, ...(Array.isArray(item.search_forms) ? item.search_forms : [])].map(fold).filter(Boolean);
        const meanings = [item.translation_ru, item.translation_en]
          .flatMap(t => String(t || "").split(/[,;/]|\s[—–-]\s/))
          .map(t => fold(t.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ")).replace(/^to /, ""))
          .filter(Boolean);
        out.push({ item, word: fold(word), de, meanings, len: word.length });
      }
      return out;
    }).catch(e => { dictionaryIndex = null; throw e; });
    return dictionaryIndex;
  }
  function findInDictionary(index, query) {
    const q = fold(query), hits = [];
    if (!q) return hits;
    for (const e of index) {
      let rank = -1;
      if (e.de.includes(q)) rank = 0;
      else if (e.word.startsWith(q)) rank = 1;
      else if (e.meanings.includes(q)) rank = 2;
      else if (q.length >= 3 && e.word.includes(q)) rank = 3;
      else if (q.length >= 3 && e.meanings.some(m => m.startsWith(q) || m.includes(" " + q))) rank = 4;
      if (rank >= 0) hits.push({ e, rank });
    }
    hits.sort((a, b) => a.rank - b.rank || a.e.len - b.e.len || a.e.word.localeCompare(b.e.word, "de"));
    return hits.slice(0, 40).map(h => h.e.item);
  }
  function dictionarySearch(opts, form, placement) {
    const lang = window.DeutschTranslation?.getLang?.() === "ru" ? "ru" : "en";
    const wrap = el("div", "coll-search");
    const input = el("input", "coll-field coll-search-field", null, {
      type: "search", id: "cfSearch", placeholder: L("Search the Wörterbuch", "Поиск в Wörterbuch"), "aria-label": L("Search the Wörterbuch", "Поиск в Wörterbuch"),
      autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "search"
    });
    wrap.appendChild(input);
    card.appendChild(wrap);
    const results = el("div", "coll-scroll coll-results");
    results.style.display = "none";
    card.appendChild(results);
    const addedHere = new Map(); // dictionaryId → card id added from this search (for undo)
    let timer = 0, run = 0;

    const M = window.WortschatzMeanings;
    if (M) M.load(); // the trained meaning of each word (example-senses.json); until it's there, a guess
    const fieldsOf = item => {
      const f = Object.assign(window.WortschatzDictionaryCard.create(item, lang), { dictionaryId: item.id });
      return M ? M.splitFields(f) : f;
    };
    function addWord(item) {
      const fields = fieldsOf(item);
      const r = own() ? C.add([fields], { placement: placement() }) : C.create(opts.name || MY_WORDS(), [fields]);
      if (!r.added) throw new Error(r.duplicates ? "duplicate" : (r.skipped[0] && r.skipped[0].reason) || "not-saved");
      const added = C.cards().find(c => c.dictionaryId === item.id);
      addedHere.set(item.id, added && added.id);
      if (opts.create) { // the first ＋ created the collection: ‹ now leads to it, not back to „Your Own Words“
        opts = Object.assign({}, opts, { create: false, cancel: viewMain });
        const back = card.querySelector(".coll-back");
        if (back) back.onclick = viewMain;
      }
      dirty = true;
      refreshButtons();
    }
    function undo(item) {
      const id = addedHere.get(item.id);
      if (id) C.remove(id);
      addedHere.delete(item.id);
      dirty = true;
      refreshButtons();
    }
    function row(item) {
      const fields = fieldsOf(item);
      const r = el("div", "coll-word coll-hit");
      const pick = button("coll-hit-main", "", () =>
        viewForm(null, Object.assign({}, opts, { prefill: fields, dictionaryId: item.id }))
      );
      pick.setAttribute("aria-label", L("Fill the form with ", "Заполнить форму: ") + fields.base);
      pick.appendChild(el("span", "coll-de", fields.base, { lang: "de" }));
      pick.appendChild(el("span", "coll-tr", plainValue(fields.translation)));
      r.appendChild(pick);
      const status = el("span", "coll-hit-side");
      r.appendChild(status);
      const msg = el("p", "coll-error coll-hit-error");
      function draw() {
        status.textContent = "";
        if (addedHere.has(item.id)) {
          const b = button("coll-hit-added", L("✓ Added", "✓ Добавлено"), () => { undo(item); draw(); });
          b.setAttribute("aria-label", L("Added. Tap to undo", "Добавлено. Нажми, чтобы отменить"));
          status.appendChild(b);
        } else if (own() && C.has(fields)) {
          status.appendChild(el("span", "coll-hit-in", L("In list", "В списке")));
        } else {
          const b = button("coll-hit-add", "＋", () => {
            msg.textContent = "";
            try { addWord(item); } catch (e) {
              msg.textContent = e.message === "storage-full" ? L("Storage is full - the word wasn't saved.", "Память заполнена — слово не сохранено.")
                : e.message === "duplicate" ? L("This word is already in your collection.", "Это слово уже есть в коллекции.") : L("The word couldn't be saved.", "Не удалось сохранить слово.");
            }
            draw();
          });
          b.setAttribute("aria-label", L("Add ", "Добавить ") + fields.base);
          status.appendChild(b);
        }
      }
      draw();
      const box = el("div");
      box.appendChild(r);
      box.appendChild(msg);
      return box;
    }
    function note() {
      return el("p", "coll-hint coll-results-note",
        placement() === "end" ? L("＋ adds the word to the end of your list.", "＋ добавляет слово в конец списка.") : L("＋ adds the word to your next new words.", "＋ добавляет слово к следующим новым словам."));
    }
    async function update() {
      const q = input.value.trim(), mine = ++run;
      const searching = q.length > 0;
      form.style.display = searching ? "none" : "";
      results.style.display = searching ? "" : "none";
      if (!searching) { results.textContent = ""; return; }
      if (q.length < 2) { results.textContent = ""; results.appendChild(el("p", "coll-note", L("Keep typing…", "Печатай дальше…"))); return; }
      if (!results.childElementCount) results.appendChild(el("p", "coll-note", L("Loading the Wörterbuch…", "Загружаем Wörterbuch…")));
      let index;
      try { index = await loadDictionaryIndex(); } catch (e) {
        if (mine !== run) return;
        results.textContent = "";
        results.appendChild(el("p", "coll-error", L("The Wörterbuch couldn't be loaded. Please try again.", "Не удалось загрузить Wörterbuch. Попробуй ещё раз.")));
        return;
      }
      if (mine !== run) return;
      const items = findInDictionary(index, q);
      results.textContent = "";
      if (!items.length) {
        results.appendChild(el("p", "coll-note", L("Not in the Wörterbuch. Clear the search to type your own word.", "В Wörterbuch такого нет. Очисти поиск, чтобы ввести своё слово.")));
        return;
      }
      results.appendChild(note());
      const list = el("div", "coll-list coll-list-below");
      items.forEach(item => list.appendChild(row(item)));
      results.appendChild(list);
    }
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 120); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });
    loadDictionaryIndex().catch(() => {}); // start loading while you look at the form
    return {
      focus: () => input.focus({ preventScroll: true }),
      refresh: () => { if (input.value.trim()) update(); }
    };
  }

  function viewDictionaryConfirm(prefill, validate, dictionaryId) {
    card.textContent = "";
    card.appendChild(head(L("Your Own Words", "Свои слова"), embedded ? close : viewMain));
    card.appendChild(el("p", "coll-text", L("You don't have your own word collection yet. This word starts it.", "У тебя ещё нет своей коллекции слов. Это слово её начнёт.")));
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", L("Continue", "Продолжить"), () => viewForm(null, { create: true, name: MY_WORDS(), prefill, validate, dictionaryId, fromDictionary: true, cancel: embedded ? close : viewMain })));
    b.appendChild(button("coll-link", L("Cancel", "Отмена"), close));
    card.appendChild(b);
  }

  const dictionaryPrefill = (item, lang) => window.WortschatzDictionaryCard.create(item, lang);

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
    card.textContent = "";
    card.appendChild(head(L("Word Cannot Be Added", "Слово нельзя добавить"), embedded ? close : viewMain));
    const reasons = {
      DICTIONARY_ENTRY_MISSING: L("The dictionary entry is missing.", "В словаре нет этой статьи."),
      DICTIONARY_ENTRY_EXCLUDED: L("This pronoun is excluded from Wortschatz.", "Это местоимение не входит в Wortschatz."),
      DICTIONARY_CLOZE_INVALID: L("The dictionary example has invalid answer markup and needs correction.", "В примере из словаря неверно отмечено слово — его нужно исправить.")
    };
    const label = [error.base, error.dictionaryId].filter(Boolean).join(" · ") || L("Unknown word", "Неизвестное слово");
    card.appendChild(el("p", "coll-text", label));
    card.appendChild(el("p", "coll-error", reasons[error.code] || L("The word could not be prepared. Please try again.", "Не удалось подготовить слово. Попробуй ещё раз."), {role: "alert"}));
    if (error.code === "DICTIONARY_CLOZE_INVALID") card.appendChild(el("p", "coll-hint", error.reason));
    card.appendChild(button("coll-main", L("Close", "Закрыть"), close));
  }
  async function addDictionaryWord(request, onSaved) {
    if (!request?.id || request.version !== I.VERSION || request.id === lastDictionaryRequest || processingDictionaryRequests.has(request.id)) return;
    processingDictionaryRequests.add(request.id);
    try {
      const dictionary=await I.load(),item=dictionary.get(request.dictionaryId);
      const check=window.WortschatzDictionaryCard.check(item);
      if(!check.available) {
        open(()=>viewDictionaryError({...check.error,dictionaryId:request.dictionaryId}));
        lastDictionaryRequest=request.id;clearDictionaryPending(request.id);return;
      }
      const row=I.row(item,request.lang,dictionaryPrefill(item,request.lang));
      const issues=I.validate([row],dictionary);
      if(issues.length){open(()=>viewDictionaryError({...issues[0],code:'DICTIONARY_CLOZE_INVALID'}));lastDictionaryRequest=request.id;clearDictionaryPending(request.id);return;}
      const validate=async()=>I.validate([row],await I.load());
      dictionarySaved=onSaved;
      open(()=>own() ? viewForm(null,{prefill:row.card,validate,dictionaryId:item.id,fromDictionary:true,cancel:embedded ? close : viewMain}) : viewDictionaryConfirm(row.card,validate,item.id));
      lastDictionaryRequest=request.id;clearDictionaryPending(request.id);
    } catch(error) {
      console.error("Could not prepare the dictionary word",error);
      open(()=>viewDictionaryError(error));
    } finally {processingDictionaryRequests.delete(request.id);}
  }

  const READING_PENDING = I.READING;
  async function addReadingWords(request) {
    if (!request?.id || request.version !== I.VERSION || !Array.isArray(request.rows) || !request.rows.length) return;
    request.excluded ||= [];
    request.placement ||= "end";
    request.name ||= MY_WORDS();
    const persist = () => sessionStorage.setItem(READING_PENDING, JSON.stringify(request));
    function review(message = "") {
      card.textContent = "";
      card.appendChild(head(L("Words from Reading", "Слова из чтения")));
      const sc=el("div","coll-scroll");card.appendChild(sc);
      sc.appendChild(el("p","coll-text",L(`Review words from „${String(request.title || "Bibliothek")}“. Tap any word to edit it before adding.`,`Проверь слова из «${String(request.title || "Bibliothek")}». Нажми на слово, чтобы изменить его перед добавлением.`)));
      if (request.unavailable) sc.appendChild(el("p","coll-hint",L(`${request.unavailable} words without learning cards remain saved in Bibliothek.`,`${request.unavailable} ${ruN(request.unavailable,"слово","слова","слов")} без учебных карточек остаются в Bibliothek.`)));
      for (const issue of request.diagnostics || []) {
        const reason=issue.code === "DICTIONARY_ENTRY_EXCLUDED" ? L("excluded from Wortschatz","не входит в Wortschatz") : issue.code === "DICTIONARY_ENTRY_MISSING" ? L("dictionary entry missing","нет статьи в словаре") : L("dictionary example needs correction","пример из словаря нужно исправить");
        sc.appendChild(el("p", "coll-hint", `${issue.base || L("Unknown word","Неизвестное слово")}${issue.dictionaryId ? " ("+issue.dictionaryId+")" : ""}: ${reason}.`));
      }
      if (!own()) {
        sc.appendChild(el("p","coll-text",L("These words start your own word collection.","С этих слов начнётся твоя коллекция.")));
        sc.appendChild(el("label","coll-label",L("Collection Name","Название коллекции"),{for:"readingCollectionName"}));
        const nameInput=el("input","coll-field",null,{id:"readingCollectionName",type:"text",maxlength:"40",value:request.name});
        nameInput.addEventListener("input",()=>{request.name=nameInput.value;persist();});sc.appendChild(nameInput);
      }
      const box=el("div","coll-list");sc.appendChild(box);
      const selected=()=>request.rows.map((row,index)=>({row,index})).filter(({index})=>!request.excluded.includes(index));
      const confirmationLabel=()=>(own()?L("Add ","Добавить "):L("Create Collection with ","Создать коллекцию: "))+wordsTitle(selected().length);
      let confirm, confirming=false;
      request.rows.forEach((draftRow,index)=>{
        const word=draftRow.card || {};
        const row=el("div","coll-word reading-review-row");
        const check=el("input",null,null,{type:"checkbox","aria-label":L("Include ","Включить ")+(word.base || L("word","слово"))});
        check.checked=!request.excluded.includes(index);
        check.addEventListener("change",()=>{
          request.excluded=request.excluded.filter(i=>i!==index);
          if(!check.checked)request.excluded.push(index);
          persist();confirm.textContent=confirmationLabel();confirm.disabled=!selected().length;
        });
        const edit=button("coll-word is-btn","",()=>viewForm(word,{draft:true,cancel:()=>review(),onSaved:fields=>{
          draftRow.card=fields;draftRow.edited=true;persist();review();
        }}));
        edit.appendChild(el("span","coll-de",word.base || word.target || L("Word","Слово")));
        edit.appendChild(el("span","coll-tr",plainValue(word.translation)));
        row.appendChild(check);row.appendChild(edit);box.appendChild(row);
      });
      if(own()) {
        sc.appendChild(el("label","coll-label",L("Add New Words","Куда добавить новые слова"),{for:"readingPlacement"}));
        const placement=el("select","coll-field",null,{id:"readingPlacement"});
        placement.appendChild(el("option",null,L("At the End of the List","В конец списка"),{value:"end"}));
        placement.appendChild(el("option",null,L("As the Next New Words","Следующими новыми словами"),{value:"next"}));
        placement.value=request.placement;
        placement.addEventListener("change",()=>{request.placement=placement.value;persist();});sc.appendChild(placement);
        sc.appendChild(el("p","coll-hint",L("Next new words: before the words you haven't started. Your current reviews stay unchanged.","Следующими новыми — перед словами, которые ты ещё не начинал. Текущие повторения не меняются.")));
      }
      const error=el("p","coll-error",message);sc.appendChild(error);
      const buttons=el("div","coll-form-buttons");sc.appendChild(buttons);
      confirm=button("coll-main",confirmationLabel(),async()=>{
        if(confirming)return;
        confirming=true;
        for(const control of sc.querySelectorAll("input,button,select"))control.disabled=true;
        try {
          const selection=selected(),rows=selection.map(({row})=>row);
          const dictionary=await I.load(),issues=I.validate(rows,dictionary);
          if(issues.length){error.textContent=issues.map(issue=>I.describe({...issue,n:selection[issue.n-1].index+1})).join("; ");return;}
          persist();
          const items=rows.map(row=>({...row.card,dictionaryId:dictionary.get(row.dictionaryId)?.id || row.dictionaryId})),prepared=C.prepare(items,own()?C.cards():[]);
          if(prepared.skipped.length){error.textContent=prepared.skipped.map(issue=>I.describe({...issue,n:selection[issue.n-1].index+1,dictionaryId:rows[issue.n-1].dictionaryId,base:rows[issue.n-1].card.base})).join("; ");return;}
          if(!prepared.cards.length){error.textContent=L("These words are already in your collection.","Эти слова уже есть в коллекции.");return;}
          const result=own()?C.add(items,{placement:request.placement}):C.create(request.name.trim() || MY_WORDS(),items);
          if(!result.added){error.textContent=L("No words were added.","Слова не добавлены.");return;}
          dirty=true;
          sessionStorage.removeItem(READING_PENDING);
          refreshButtons();viewMain();
          const notice=el("p","coll-text",L(`${result.added} words added${request.placement==="next"?" as the next new words":""}.${result.duplicates?` ${result.duplicates} already in your collection.`:""}`,`Добавлено: ${wordsLabel(result.added)}${request.placement==="next"?" — следующими новыми":""}.${result.duplicates?` Уже были в коллекции: ${result.duplicates}.`:""}`));
          card.insertBefore(notice,card.children[1]);notice.setAttribute("role","status");
          const listRows=card.querySelectorAll('.coll-list .coll-word');
          const added=new Set(result.ids || C.cards().map(word=>word.id));
          const index=C.cards().findIndex(word=>added.has(word.id));
          if(index>=0)requestAnimationFrame(()=>listRows[index]?.scrollIntoView({block:"center"}));
        }catch(e){error.textContent=L("The words could not be saved. Your review is kept; please try again.","Не удалось сохранить слова. Твой выбор сохранён — попробуй ещё раз.");}
        finally{confirming=false;for(const control of sc.querySelectorAll("input,button,select"))control.disabled=false;confirm.disabled=!selected().length;}
      });
      confirm.disabled=!selected().length;buttons.appendChild(confirm);
      buttons.appendChild(button("coll-link",L("Discard This Batch","Отказаться от этих слов"),()=>{
        card.textContent="";card.appendChild(head(L("Discard these words?","Отказаться от этих слов?"),()=>review()));
        card.appendChild(el("p","coll-text",L("Nothing has been added. The words remain saved in Bibliothek.","Ничего не добавлено. Слова остаются в Bibliothek.")));
        card.appendChild(button("coll-main",L("Keep Reviewing","Продолжить проверку"),()=>review()));
        card.appendChild(button("coll-link",L("Discard Batch","Отказаться"),()=>{sessionStorage.removeItem(READING_PENDING);viewMain();}));
      }));
    }
    try {
      const issues=I.validate(request.rows,await I.load());
      persist();open(()=>review(issues.map(I.describe).join("; ")));
    } catch(error) {
      console.error("Could not restore the reading draft",error);
      open(()=>review(L("The draft could not be prepared. It is kept; please try again.","Не удалось подготовить черновик. Он сохранён — попробуй ещё раз.")));
    }
  }

  /* ---------- Word sets (v2026-10-26, OPEN_TASKS „Wortschatz — доработки“ 2) ----------
     A set is a ready-made selection to pick from, not a deck: nothing is ticked at first, „Select All“ ticks
     everything, the count shows how many are ticked. Words already in the collection show „In list“.
     Set files: sets/<id>.json = {id, name, description:{en,ru}, entries:[{id: Wörterbuch id,
     sentence?, sentenceTranslation?:{ru,en}, translation?:{ru,en}} | {custom:{base, pos, sentence, translation:{ru,en},
     sentenceTranslation:{ru,en}}}]} — an entry may carry its own example for this set, and a word that is not in
     the Wörterbuch (e.g. „es sei denn“) is a custom entry; the Wörterbuch is not changed. Cards keep dictionaryId (duplicates are checked per meaning). */
  const SETS = [
    { id: "a2-b1", name: "A2 → B1", file: "sets/a2-b1.json?v=1" },
    { id: "b1-b2", name: "B1 → B2", file: "sets/b1-b2.json?v=1" },
    { id: "b2-c1", name: "B2 → C1", file: "sets/b2-c1.json?v=1" }
  ];
  // Choose screen (wortschatz.js showChoose): one collection-line per set + „Start with my own words“.
  function fillChoose(box, ownBtn) {
    if (!box) return;
    box.textContent = "";
    SETS.forEach(def => {
      const wrap = el("div", "chooseSet");
      const b = button("coll-line", "", () => open(() => viewSetPick(def, null)));
      b.appendChild(el("span", "coll-line-name", def.name));
      b.appendChild(el("span", "coll-line-chev", "›", { "aria-hidden": "true" }));
      wrap.appendChild(b);
      const info = el("p", "collCount", "");
      wrap.appendChild(info);
      box.appendChild(wrap);
      loadSet(def).then(set => { info.textContent = wordsLabel((set.entries || []).length); }).catch(() => {});
    });
    if (ownBtn) ownBtn.onclick = () => open(viewCreate);
  }
  const setCache = {};
  async function loadSet(def) {
    setCache[def.id] ||= (async () => {
      const r = await fetch(def.file, { cache: "no-store" });
      if (!r.ok) throw new Error("set-missing");
      return r.json();
    })().catch(e => { delete setCache[def.id]; throw e; });
    return setCache[def.id];
  }
  const uiLang = () => (window.DeutschTranslation?.getLang?.() === "ru" ? "ru" : "en");
  const pickLang = v => (v && typeof v === "object" ? v[uiLang()] || v.en || v.ru || "" : v || "");
  function viewSets(back, collectionName) {
    card.textContent = "";
    card.appendChild(head(L("Word Sets", "Наборы слов"), back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", L("Ready-made word sets. Open one and tick the words you want to learn.", "Готовые наборы слов. Открой набор и отметь слова, которые хочешь учить.")));
    const box = el("div", "coll-list coll-list-below");
    sc.appendChild(box);
    SETS.forEach(def => {
      const row = button("coll-word is-btn", "", () => viewSetPick(def, () => viewSets(back, collectionName), collectionName));
      const name = el("span", "coll-de", "…");
      const info = el("span", "coll-tr", "");
      row.appendChild(name);
      row.appendChild(info);
      box.appendChild(row);
      loadSet(def).then(set => {
        name.textContent = set.name;
        info.textContent = wordsLabel((set.entries || []).length);
      }).catch(() => { name.textContent = def.id; info.textContent = L("Couldn't be loaded.", "Не загрузился."); });
    });
  }
  async function viewSetPick(def, back, collectionName) {
    card.textContent = "";
    card.appendChild(head(L("Word Set", "Набор слов"), back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-note", L("Loading…", "Загрузка…")));
    let set, dictionary;
    try { [set, dictionary] = await Promise.all([loadSet(def), I.load(), window.WortschatzMeanings && WortschatzMeanings.load()]); } catch (e) {
      sc.textContent = "";
      sc.appendChild(el("p", "coll-error", L("The set couldn't be loaded. Please try again.", "Не удалось загрузить набор. Попробуй ещё раз."), { role: "alert" }));
      return;
    }
    const lang = uiLang();
    const words = [];
    for (const entry of set.entries || []) {
      if (entry.custom) {
        const c = entry.custom;
        const fields = { sentence: c.sentence, translation: pickLang(c.translation), sentenceTranslation: pickLang(c.sentenceTranslation), base: c.base, pos: c.pos || "Andere", grammar: "" };
        if (C.normalize(fields).card) words.push(fields);
        continue;
      }
      const item = dictionary.get(entry.id);
      if (!item || !window.WortschatzDictionaryCard.check(item).available) continue;
      const fields = Object.assign(window.WortschatzDictionaryCard.create(item, lang), { dictionaryId: item.id });
      if (entry.sentence) fields.sentence = entry.sentence;
      if (entry.sentenceTranslation) fields.sentenceTranslation = pickLang(entry.sentenceTranslation);
      if (entry.translation) fields.translation = pickLang(entry.translation);
      const split = window.WortschatzMeanings ? WortschatzMeanings.splitFields(fields) : fields; // list shows the trained meaning only
      if (!C.normalize(split).card) continue;
      words.push(split);
    }
    card.textContent = "";
    card.appendChild(head(set.name, back));
    let nameIn = null;
    if (!own()) {
      // The ticked words become your own collection right away — name it now (you can rename it later too).
      const nb = el("div", "coll-pick-name");
      nb.appendChild(el("label", "coll-label", L("Collection Name", "Название коллекции"), { for: "cfSetName" }));
      nameIn = el("input", "coll-field", null, { id: "cfSetName", type: "text", maxlength: "40", autocomplete: "off", value: collectionName || set.name });
      nameIn.value = collectionName || set.name;
      nb.appendChild(nameIn);
      nb.appendChild(el("p", "coll-hint", L("This will be your own collection - you can add, edit and delete words any time.", "Это будет твоя коллекция — слова можно добавлять, менять и удалять в любой момент.")));
      card.appendChild(nb);
    }
    const top = el("div", "coll-pick-top");
    const count = el("span", "coll-pick-count", "", { "aria-live": "polite" });
    // „Select All“ on the left, above the ticks (a circle like the word ticks, as in the Bibliothek); the count on the right
    const allRow = el("label", "coll-pick-all");
    const all = el("input", null, null, { type: "checkbox", "aria-label": L("Select all", "Выбрать все") });
    allRow.appendChild(all);
    allRow.appendChild(document.createTextNode(L("Select All", "Выбрать все")));
    top.appendChild(allRow);
    top.appendChild(count);
    card.appendChild(top);
    const list = el("div", "coll-scroll coll-list coll-pick-list");
    card.appendChild(list);
    const picked = new Set();
    const avail = words.filter(w => !(own() && C.has(w)));
    const boxes = [];
    words.forEach((w, i) => {
      const there = own() && C.has(w);
      const row = el("label", "coll-word coll-pick" + (there ? " is-in" : ""));
      if (there) row.appendChild(el("span", "coll-hit-in coll-pick-mark", L("In list", "В списке")));
      else {
        const cb = el("input", "coll-pick-check", null, { type: "checkbox", "aria-label": L("Learn ", "Учить ") + w.base });
        cb.addEventListener("change", () => { cb.checked ? picked.add(i) : picked.delete(i); draw(); });
        boxes.push([cb, i]);
        row.appendChild(cb);
      }
      const text = el("span", "coll-pick-text");
      text.appendChild(el("span", "coll-de", w.base, { lang: "de" }));
      text.appendChild(el("span", "coll-tr", plainValue(w.translation)));
      row.appendChild(text);
      list.appendChild(row);
    });
    const bottom = el("div", "coll-form-buttons coll-pick-bottom");
    let now = null;
    if (own()) {
      const sw = el("label", "coll-switch");
      sw.appendChild(el("span", null, L("Learn Now", "Учить сейчас")));
      now = el("input", null, null, { type: "checkbox", "aria-label": L("Learn now", "Учить сейчас") });
      now.checked = true;
      sw.appendChild(now);
      bottom.appendChild(sw);
      bottom.appendChild(el("p", "coll-hint", L("On: they come with your next new words (+ 5). Off: added to the end of your list.", "Вкл.: слова придут со следующими новыми словами (+ 5). Выкл.: добавятся в конец списка.")));
    }
    const err = el("p", "coll-error", "", { role: "alert" });
    bottom.appendChild(err);
    const add = button("coll-main", "", null);
    bottom.appendChild(add);
    card.appendChild(bottom);
    function draw() {
      const n = picked.size;
      count.textContent = avail.length ? L("Selected: ", "") + n + " / " + avail.length : L("All words are already in your list.", "Все слова уже в твоём списке.");
      all.checked = !!n && n === avail.length;
      all.indeterminate = n > 0 && n < avail.length;
      allRow.style.display = avail.length ? "" : "none";
      add.textContent = n ? (own() ? L("Add ", "Добавить ") : L("Create Collection with ", "Создать коллекцию: ")) + wordsTitle(n) : L("Tick the words you want to learn", "Отметь нужные слова");
      add.disabled = !n;
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
      let r;
      try {
        r = own() ? C.add(items, { placement: now && !now.checked ? "end" : "next" }) : C.create((nameIn && nameIn.value.trim()) || set.name, items);
      } catch (e) {
        err.textContent = e.message === "storage-full" ? L("Storage is full - the words weren't saved.", "Память заполнена — слова не сохранены.") : L("The words couldn't be saved.", "Не удалось сохранить слова.");
        return;
      }
      if (!r.added) { err.textContent = L("These words are already in your collection.", "Эти слова уже есть в коллекции."); return; }
      dirty = true;
      refreshButtons();
      viewMain();
      const notice = el("p", "coll-text", L(r.added + (r.added === 1 ? " word" : " words") + " added from „" + set.name + "“.", "Добавлено из «" + set.name + "»: " + wordsLabel(r.added) + "."));
      notice.setAttribute("role", "status");
      card.insertBefore(notice, card.children[1]);
    };
    draw();
  }

  /* ---------- Settings (2026-10-26): the gear at the bottom right of the start / done screen ----------
     For now one setting: the review pace (collection.js → PACES). */
  // Settings (2026-10-26): like the rest of the exercise — names in simple German, the explanations in the
  // user's language (RU / EN, the app's language switch), as the whole window since 02.11.2026.
  function viewSettings() {
    const ru = RU();
    card.textContent = "";
    card.appendChild(head("Lerntempo")); // the only setting so far: it is the title (a section label comes with a second one)
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    const box = el("div", "coll-paces", null, { role: "radiogroup", "aria-label": "Lerntempo" });
    sc.appendChild(box);
    const options = [
      ["standard", "Standard", ru ? "Чтобы запомнить надолго" : "For the long run"],
      ["intensiv", "Intensiv", ru ? "Перед экзаменом · больше повторений" : "Before an exam · more reviews"]
    ];
    function draw() {
      const current = C.getPace();
      box.textContent = "";
      options.forEach(([id, label, note]) => {
        const on = id === current;
        const b = button("coll-pace" + (on ? " on" : ""), "", () => {
          C.setPace(id);
          if (typeof window.WortschatzSetPace === "function") window.WortschatzSetPace(id);
          draw();
        });
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.appendChild(el("span", "coll-pace-dot", null, { "aria-hidden": "true" }));
        const t = el("span", "coll-pace-text");
        t.appendChild(el("span", "coll-pace-name", label));
        t.appendChild(el("span", "coll-pace-note", note));
        t.appendChild(el("span", "coll-pace-note coll-pace-days", C.PACES[id].join(" · ") + " Tage"));
        b.appendChild(t);
        box.appendChild(b);
      });
    }
    draw();
    sc.appendChild(
      el(
        "p",
        "coll-hint",
        ru
          ? "Слово с ошибкой всегда возвращается на следующий день. Новый темп действует только на следующие повторения."
          : "A word you get wrong always comes back tomorrow. Changing the pace only affects the next reviews."
      )
    );
  }

  // session (from ✎ during practice): no reload — the running session drops the word and goes on (2026-10-26)
  function viewRemove(w, session) {
    card.textContent = "";
    card.appendChild(head(L("Delete this word?", "Удалить слово?")));
    card.appendChild(
      el(
        "p",
        "coll-text",
        L("„" + (w.base || w.target) + "“ and your progress with it will be deleted." + (session ? " The session goes on with the next word." : ""),
          "«" + (w.base || w.target) + "» и прогресс по нему будут удалены." + (session ? " Тренировка продолжится со следующего слова." : ""))
      )
    );
    const b = el("div", "coll-buttons");
    b.appendChild(button("coll-main", L("Keep", "Оставить"), () => viewForm(w, session || undefined)));
    b.appendChild(
      button("coll-quiet", L("Delete", "Удалить"), () => {
        if (session) {
          try {
            C.remove(w.id);
          } catch (e) {
            return;
          }
          close();
          session.onDeleted(w.id);
          return;
        }
        C.remove(w.id);
        dirty = true;
        refreshButtons();
        viewMain();
      })
    );
    card.appendChild(b);
  }

  /* ---------- step 5: own words — create a collection / import a list ---------- */
  // The AI part: users write their own request (which words, level, language) and paste this block after it.
  const FORMAT_BLOCK_EN = `Format the words as a JSON list and answer with the list only - no other text.
One object per word, like this:

[
  {
    "sentence": "Ich {{c1::schlage}} Samstag {{c1::vor}}.",
    "translation": "to suggest",
    "sentenceTranslation": "I suggest Saturday.",
    "base": "vorschlagen",
    "grammar": "schlägt vor · schlug vor · hat vorgeschlagen",
    "pos": "Verb"
  },
  {
    "sentence": "Der {{c1::Termin}} ist morgen um zehn.",
    "translation": "appointment",
    "sentenceTranslation": "The appointment is tomorrow at ten.",
    "base": "der Termin",
    "grammar": "die Termine",
    "pos": "Substantiv"
  }
]

Rules:
- "sentence": a short, natural, everyday German sentence. Mark the word to practise with {{c1::…}}, exactly as it appears in the sentence.
- Mark only ONE word per sentence. Separable verbs: mark both parts, e.g. "Ich {{c1::rufe}} dich morgen {{c1::an}}."
- "translation" (meaning of the word) and "sentenceTranslation" (the whole sentence): in the language I asked for - English if I didn't say.
- "base": the dictionary form. Nouns with der / die / das.
- "grammar": verbs: 3rd person · Präteritum · Perfekt. Nouns: the plural. Otherwise leave it empty.
- "pos": the word class in German (Verb, Substantiv, Adjektiv, Adverb, Präposition, Konjunktion …).`;
  const FORMAT_BLOCK_RU = `Оформи слова как список JSON и ответь только списком — без другого текста.
Один объект на слово, вот так:

[
  {
    "sentence": "Ich {{c1::schlage}} Samstag {{c1::vor}}.",
    "translation": "предлагать",
    "sentenceTranslation": "Предлагаю субботу.",
    "base": "vorschlagen",
    "grammar": "schlägt vor · schlug vor · hat vorgeschlagen",
    "pos": "Verb"
  },
  {
    "sentence": "Der {{c1::Termin}} ist morgen um zehn.",
    "translation": "встреча, назначенное время",
    "sentenceTranslation": "Встреча завтра в десять.",
    "base": "der Termin",
    "grammar": "die Termine",
    "pos": "Substantiv"
  }
]

Правила:
- "sentence": короткое естественное немецкое предложение из обычной жизни. Слово для тренировки отметь как {{c1::…}} — ровно в том виде, в каком оно стоит в предложении.
- Отмечай только ОДНО слово в предложении. Глаголы с отделяемой приставкой: отметь обе части, например "Ich {{c1::rufe}} dich morgen {{c1::an}}."
- "translation" (значение слова) и "sentenceTranslation" (всё предложение): на языке, который я попросил; если я не сказал — на русском.
- "base": словарная форма. Существительные — с der / die / das.
- "grammar": у глаголов — 3-е лицо · Präteritum · Perfekt. У существительных — множественное число. Иначе оставь пустым.
- "pos": часть речи по-немецки (Verb, Substantiv, Adjektiv, Adverb, Präposition, Konjunktion …).`;
  const FORMAT_BLOCK = () => (RU() ? FORMAT_BLOCK_RU : FORMAT_BLOCK_EN);

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
    card.textContent = "";
    card.appendChild(head(L("Your Own Words", "Свои слова")));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(el("p", "coll-text", L("Give your collection a name, then add words: search the Wörterbuch, type them or import a list.", "Назови коллекцию и добавь слова: найди в Wörterbuch, введи сам или импортируй список.")));
    const l = el("label", "coll-label", L("Collection Name", "Название коллекции"), { for: "cfName" });
    sc.appendChild(l);
    const nameIn = el("input", "coll-field", null, {
      id: "cfName",
      type: "text",
      maxlength: "40",
      placeholder: MY_WORDS(),
      autocomplete: "off"
    });
    sc.appendChild(nameIn);
    const nm = () => nameIn.value.trim() || MY_WORDS();
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", L("Add the First Word", "Добавить первое слово"), () => viewForm(null, { create: true, name: nm(), cancel: viewCreate })));
    b.appendChild(button("coll-raised", L("Import List", "Импорт списка"), () => viewImport({ create: true, name: nm() })));
    card.appendChild(b);
  }

  // Paste the AI's answer or pick a file. opts.create: this list starts a new collection.
  function viewImport(opts) {
    card.textContent = "";
    card.appendChild(head(L("Import List", "Импорт списка"), opts.create ? viewCreate : viewMain));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    const intro = el("p", "coll-text");
    intro.style.marginBottom = "10px";
    intro.appendChild(
      document.createTextNode(
        L("Ask an AI for example sentences for your words and paste its answer here. To get the right format: ",
          "Попроси ИИ составить примеры с твоими словами и вставь его ответ сюда. Чтобы ответ был в нужном формате: ")
      )
    );
    intro.appendChild(button("coll-link", L("Format for the AI", "Формат для ИИ"), () => viewFormat(() => viewImport(opts))));
    sc.appendChild(intro);
    const ta = el("textarea", "coll-field coll-paste", null, {
      id: "cfPaste",
      rows: "7",
      placeholder: '[ { "sentence": "Ich {{c1::schlage}} …", … } ]',
      "aria-label": L("Paste the list", "Вставь список"),
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false"
    });
    sc.appendChild(ta);
    const fileIn = el("input", null, null, {
      type: "file",
      accept: ".json,.js,.txt,application/json,text/plain,text/javascript",
      style: "display:none"
    });
    sc.appendChild(fileIn);
    const fileRow = el("p", "coll-hint");
    fileRow.appendChild(document.createTextNode(L("Or: ", "Или: ")));
    fileRow.appendChild(button("coll-link", L("Choose a File", "Выбери файл"), () => fileIn.click()));
    sc.appendChild(fileRow);
    if (!opts.create) sc.appendChild(el("p", "coll-hint", L("New words are added to the end of your list.", "Новые слова добавятся в конец списка.")));
    const err = el("p", "coll-error");
    sc.appendChild(err);
    ta.addEventListener("input", () => {
      err.textContent = "";
    });

    function run(text) {
      err.textContent = "";
      const parsed = C.parse(text);
      if (parsed.error) {
        err.textContent =
          parsed.error === "empty"
            ? L("Please paste the list first.", "Сначала вставь список.")
            : L("This doesn't look like a list. Copy the AI's whole answer - from [ to ].", "Это не похоже на список. Скопируй весь ответ ИИ — от [ до ].");
        return;
      }
      let r;
      try {
        r = opts.create ? C.create(opts.name, parsed.items) : C.add(parsed.items);
      } catch (e) {
        err.textContent =
          e.message === "storage-full" ? L("Storage is full - nothing was saved.", "Память заполнена — ничего не сохранено.") : L("The list couldn't be saved.", "Не удалось сохранить список.");
        return;
      }
      if (!r.added) {
        err.textContent =
          r.duplicates && !r.skipped.length
            ? L("All these words are already in your collection.", "Все эти слова уже есть в коллекции.")
            : L("None of the cards could be used.", "Ни одну карточку не удалось использовать.") +
              (r.skipped[0] ? L(" For example no. ", " Например, № ") + r.skipped[0].n + ": " + r.skipped[0].reason + "." : "");
        return;
      }
      dirty = true;
      refreshButtons();
      viewResult(r, opts);
    }
    fileIn.addEventListener("change", () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      if (f.size > 2e6) {
        err.textContent = L("The file is too big.", "Файл слишком большой.");
        return;
      }
      f.text().then(
        t => {
          ta.value = t;
          run(t);
        },
        () => {
          err.textContent = L("The file couldn't be read.", "Не удалось прочитать файл.");
        }
      );
    });

    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", opts.create ? L("Create Collection", "Создать коллекцию") : L("Add", "Добавить"), () => run(ta.value)));
    card.appendChild(b);
  }

  function viewResult(r, opts) {
    card.textContent = "";
    card.appendChild(head(opts.create ? L("Collection Created", "Коллекция создана") : L("Words Added", "Слова добавлены")));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(
      el(
        "p",
        "coll-text",
        RU()
          ? (opts.create ? wordsLabel(r.added) + " в «" + (C.get() ? C.get().name : opts.name) + "»." : "Добавлено: " + wordsLabel(r.added) + ".") +
            (opts.create && r.added > 10 ? " Начнёшь с первых 10." : "")
          : (r.added === 1 ? "1 word" : r.added + " words") +
            (opts.create ? " in „" + (C.get() ? C.get().name : opts.name) + "“." : " added.") +
            (opts.create && r.added > 10 ? " You start with the first 10." : "")
      )
    );
    if (r.duplicates)
      sc.appendChild(
        el(
          "p",
          "coll-hint",
          L((r.duplicates === 1 ? "1 word was" : r.duplicates + " words were") + " already in your collection.", "Уже были в коллекции: " + wordsLabel(r.duplicates) + ".")
        )
      );
    if (r.skipped.length) {
      sc.appendChild(
        el("p", "coll-label", L((r.skipped.length === 1 ? "1 card" : r.skipped.length + " cards") + " skipped:", "Пропущено: " + r.skipped.length + " " + ruN(r.skipped.length, "карточка", "карточки", "карточек")))
      );
      r.skipped
        .slice(0, 30)
        .forEach(x =>
          sc.appendChild(
            el("p", "coll-hint", L("No. ", "№ ") + x.n + " · " + x.reason + (x.preview ? " · „" + x.preview + "“" : ""))
          )
        );
      if (r.skipped.length > 30) sc.appendChild(el("p", "coll-hint", L("… and " + (r.skipped.length - 30) + " more.", "… и ещё " + (r.skipped.length - 30) + ".")));
    }
    const b = el("div", "coll-form-buttons");
    b.appendChild(button("coll-main", L("Done", "Готово"), close));
    card.appendChild(b);
  }

  // Shows the format block and copies it.
  function viewFormat(back) {
    card.textContent = "";
    card.appendChild(head(L("Format for the AI", "Формат для ИИ"), back));
    const sc = el("div", "coll-scroll");
    card.appendChild(sc);
    sc.appendChild(
      el(
        "p",
        "coll-text",
        L("First tell your AI what you want - which words, which level, which language for the translations. Then add this text:",
          "Сначала напиши ИИ, что тебе нужно: какие слова, какой уровень, на каком языке переводы. Потом добавь этот текст:")
      )
    );
    const block = FORMAT_BLOCK();
    sc.appendChild(el("pre", "coll-pre", block));
    const b = el("div", "coll-form-buttons");
    const copyBtn = button("coll-main", L("Copy", "Скопировать"), () =>
      copyText(block, ok => {
        copyBtn.textContent = ok ? L("Copied ✓", "Скопировано ✓") : L("Please select the text above and copy it", "Выдели текст выше и скопируй его");
      })
    );
    b.appendChild(copyBtn);
    card.appendChild(b);
  }

  /* ---------- rename ---------- */
  function viewRename() {
    card.textContent = "";
    card.appendChild(head(L("Rename", "Переименовать"), viewMain));
    const input = el("input", "coll-name-input", null, {
      type: "text",
      maxlength: "40",
      "aria-label": L("Collection Name", "Название коллекции"),
      autocomplete: "off"
    });
    input.value = name();
    const save = () => {
      C.rename(input.value);
      refreshButtons();
      try {
        window.publishWortschatzProgress && window.publishWortschatzProgress();
      } catch (e) {}
      viewMain();
    }; // v16: new name reaches the Fortschritt card
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      }
    });
    card.appendChild(input);
    const b = el("div", "coll-buttons");
    b.style.marginTop = "22px";
    b.appendChild(button("coll-main", L("Save", "Сохранить"), save));
    card.appendChild(b);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 60);
  }

  /* ---------- export: a clean list that can be imported again ---------- */
  function exportFile() {
    const blob = new Blob([C.exportText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (name()
        .replace(/[\\/:*?"<>|]+/g, " ")
        .trim() || "Wortschatz") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- delete → back to the built-in set ---------- */
  function viewDelete() {
    const n = list().length;
    card.textContent = "";
    card.appendChild(head(L("Delete this collection?", "Удалить коллекцию?")));
    card.appendChild(
      el(
        "p",
        "coll-text",
        L("„" +
          name() +
          "“ and your progress will be deleted. You can start again with a word set or your own words. This can't be undone - export the words first if you want to keep them.",
          "«" + name() + "» и твой прогресс будут удалены. Начать заново можно с набора слов или со своих слов. Это нельзя отменить — если хочешь сохранить слова, сначала экспортируй их.")
      )
    );
    const b = el("div", "coll-buttons");
    b.appendChild(button("coll-main", L("Keep", "Оставить"), viewMain)); // safe choice = contrast button
    b.appendChild(button("coll-quiet", L("Delete", "Удалить"), () => { C.deleteCollection(); location.reload(); }));
    b.appendChild(button("coll-link", L("Export First", "Сначала экспорт"), exportFile));
    card.appendChild(b);
  }


  ["collBtnStart", "collBtnDone"].forEach(id => {
    const b = $(id);
    if (b) b.onclick = open;
  });
  refreshButtons();
  // ✎ on the answer screen: edit the card you're looking at (own collection only)
  function editInSession(w, onSaved, onDeleted) {
    if (own() && w && String(w.id).charAt(0) === "u") open(() => viewForm(w, { session: true, onSaved, onDeleted }));
  }
  if ($("wsSettings")) $("wsSettings").onclick = () => open(viewSettings);
  window.WortschatzCollectionWindow = { open, close, refreshButtons, editInSession, addDictionaryWord, fillChoose };
  // Only unfinished legacy imports are discarded; localStorage is untouched.
  if (!embedded) {
    try {
      sessionStorage.removeItem("deutschWortschatzPendingDictionaryWordV1");
      sessionStorage.removeItem("deutschWortschatzPendingReadingWordsV1");
    } catch(error) { console.error("Could not discard legacy imports",error); }
  }
  if (embedded) return; // Reader opens explicitly; pending imports belong to Wortschatz.
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
  try {
    const pending = sessionStorage.getItem(READING_PENDING);
    if (pending) {
      addReadingWords(JSON.parse(pending));
    }
  } catch (error) {
    console.error("Could not read the reading draft",error);
    open(()=>{
      card.textContent="";
      card.appendChild(head(L("Draft Could Not Be Restored","Не удалось восстановить черновик"),close));
      card.appendChild(el("p","coll-error",L("Your draft is kept. Please try again.","Черновик сохранён. Попробуй ещё раз."),{role:"alert"}));
      card.appendChild(button("coll-main",L("Close","Закрыть"),close));
    });
  }
})();
