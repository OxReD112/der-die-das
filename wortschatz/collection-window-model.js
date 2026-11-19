/* Wortschatz · the «Deine Wörter» window without the page (19.11.2026). Before 19.11 all of this lived in
   collection-window.js next to the HTML; that file now asks this one and only draws. The native app runs this file as it
   is (JavaScriptCore) and draws the same window in Swift, like wortschatz-rules.js and the «Fortschritt» model.

   Nothing of the page here: no DOM, focus, scrolling, frames, location, clipboard, Blob, DeutschWindow. Data is loaded
   as before inside the data functions (WortschatzDictionaryImport.load(), the word sets sets/*.json via fetch) — promises.
   Texts as before: L(en, ru, …) → DeutschTranslation.t (packs too); German names stay German.
   Needs (loaded before): WortschatzCollection (collection.js); when there: DeutschTranslation, getTranslation,
   WortschatzDictionaryImport, WortschatzDictionaryCard, WortschatzMeanings, WortschatzSetPace.

   How a screen is built: each screen function returns its data — title, ‹ (back) yes / no, the texts, fields
   ({ id, label, optional, placeholder, value }), rows, buttons ({ id, text, kind: "main" | "raised" | "quiet" | "link" }).
   Each action returns what happens next: { view: "<screen>", args } and what the page has to do —
   { error } (shown under the form), { focus: "<field id>" }, dirty (the words changed: reload the page on close),
   close, download { name, text }, copy text, reload, onSaved / onDeleted for the round, scroll to a row. The page
   (collection-window.js) draws the HTML from it exactly as before 19.11; the app draws its own.

   Screens (function → data):
     line()                           start / done line: name, VoiceOver label, «n / m Wörter angefangen», pace
     main(o)                          the list (o.embedded: in Bibliothek — no «Word Sets»)
     form(w, opts)                    new / edit / ✎ / draft word form (+ tokens, preview, POS, «Learn Now»)
     saveWord(w, opts, values)        the form's Save → { error, focus } | { ok, card, fields, next }
     removeScreen(w, session) / removeWord(w, session)      «Delete this word?»
     rename() / renameTo(text)        «Rename»
     deleteScreen() / deleteCollection()                    «Delete this collection?»
     create() / createName(text)      «Your Own Words»
     importScreen(opts) / runImport(text, opts) / fileProblem(size) / fileUnreadable()     «Import List»
     result(r, opts)                  «Words Added» / «Collection Created»
     format()                         «Format for the AI» (FORMAT_BLOCK_EN / _RU, Copy / Copied ✓ / select it)
     exportFile()                     { name, text } — the page downloads it (the app: the share sheet)
     settings() / setPace(id)         «Lerntempo»
     SETS, loadSet(def), setsScreen(), setWords(def), setPick(…), addFromSet(…)            word sets
     choose() → the choose screen's set lines (+ counts via loadSet)
     search texts, loadDictionaryIndex(), findInDictionary(index, q), searchFields(item, lang), addFromSearch(…), undoSearch(…)
     dictionaryConfirm(), dictionaryError(error), prepareDictionaryWord(request)          a word from the Wörterbuch page
     reading texts, readingSelected(request), confirmReading(request), readingDone(result, words, unavailable)  words from a book
     sessionEditable(w)               ✎ in the round: may this card be edited here (own collection, id «u…»)
   Tokens of the form: splitToken, tokensFromCloze, tokensFromText, plainText, clozeText, hiddenWords, previewParts. */
(function (root) {
  "use strict";
  const C = root.WortschatzCollection;
  if (!C) return;
  const D = () => root.DeutschTranslation;

  /* ---------- language ---------- */
  // L(en, ru): the text in the user's language. 17.11.2026 (languages): L goes through DeutschTranslation.t — the same
  // text for EN / RU, a language pack's text for a pack language; "{0}" … are filled with the extra arguments,
  // "{0|слово|слова|слов}" is the plural.
  const RU = () => D()?.getLang?.() === "ru";
  // the language new cards are written in: en / ru, or a language pack ("pl") — 17.11.2026
  const packLang = () => { const d = D(), s = d?.getDisplayLang?.(); return s && d.isPack?.(s) ? s : null; };
  const cardLang = () => packLang() || (RU() ? "ru" : "en");
  const L = (en, ru, ...a) =>
    D()?.t ? D().t(en, ru, ...a) : (RU() ? ru : en).replace(/\{(\d+)\}/g, (m, i) => (+i < a.length ? String(a[+i]) : m));
  const ruN = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many;
  };
  // 2026-10-26: no built-in Starter-Set any more. Without an own collection Wortschatz shows the choose screen
  // (word sets / own words); the window then only offers ways to start one.
  const own = () => C.isOwn();
  const list = () => (own() ? C.cards() : []);
  const MY_WORDS = () => L("My Words", "Мои слова"); // the default name, in the user's language (rename any time)
  const name = () => (own() ? C.get().name || MY_WORDS() : "");
  const wordsLabel = n => L("{0} {0|word|words}", "{0} {0|слово|слова|слов}", n);
  const wordsTitle = n => L("{0} {0|Word|Words}", "{0} {0|слово|слова|слов}", n);
  const tr = (c, f) =>
    typeof root.getTranslation === "function" ? root.getTranslation(c, f) : typeof c[f] === "string" ? c[f] : "";
  const plainValue = v => (typeof v === "string" ? v : v && typeof v === "object" ? tr({ x: v }, "x") || "" : "");
  const T = {
    back: () => L("Back", "Назад"),
    close: () => L("Close", "Закрыть"),
    optional: () => L(" · optional", " · необязательно"),
    storageFullWord: () => L("Storage is full - the word wasn't saved.", "Память заполнена — слово не сохранено."),
    notSaved: () => L("The word couldn't be saved.", "Не удалось сохранить слово."),
    duplicate: () => L("This word is already in your collection.", "Это слово уже есть в коллекции."),
    inList: () => L("In list", "В списке"),
    learnNow: () => L("Learn Now", "Учить сейчас"),
    learnNowAria: () => L("Learn now", "Учить сейчас"),
    collectionName: () => L("Collection Name", "Название коллекции")
  };

  /* ---------- the collection line on the start and done screens ---------- */
  // „<name> ›“ on both screens; v2.102: „15 / 217 Wörter angefangen“ — words you've started (in your rotation) out of
  // all words in the collection. Read from the saved progress, so it's right on both screens (the page saves after
  // every change). pace: the icon of the «Lerntempo» button (19.11.2026: tortoise / hare).
  function line() {
    const n = list().length,
      count = n === 1 ? "1 Wort" : n + " Wörter";
    let started = 0;
    try {
      const st = JSON.parse(root.localStorage.getItem(C.PROGRESS_KEY) || "null");
      const ids = new Set(list().map(w => String(w.id)));
      started = (st && Array.isArray(st.activeIds) ? st.activeIds : []).filter(id => ids.has(String(id))).length;
    } catch (e) {}
    return { name: name(), label: L("Word collection: ", "Коллекция слов: ") + name() + " · " + count, count: started + " / " + n + " Wörter angefangen", pace: C.getPace() };
  }

  /* ---------- main view: name, count, list, actions ---------- */
  // o.embedded: the window over a book in Bibliothek (no «Word Sets» there). A row's «New»: added in the last 24 hours.
  function main(o) {
    if (!own()) return { view: "create" };
    const words = list(), now = Date.now();
    return {
      view: "main",
      title: name(),
      meta: wordsLabel(words.length) + " · ",
      rename: L("Rename", "Переименовать"),
      add: "＋ Wort", // 03.11 (Alena): German labels like Weiter / Starten — short enough for two equal buttons
      import: "Importieren",
      sets: o && o.embedded ? null : L("Word Sets", "Наборы слов"),
      rows: words.map(w => {
        const addedAt = Date.parse(w.addedAt || "");
        const isNew = own() && Number.isFinite(addedAt) && now - addedAt < 24 * 60 * 60 * 1000 && now >= addedAt;
        return {
          word: w,
          isNew,
          newText: isNew ? L("New", "Новое") : null,
          newLabel: isNew ? L("Added within the last 24 hours", "Добавлено за последние 24 часа") : null,
          de: w.base || String(w.target || "").split(" / ").join(" "),
          tr: tr(w, "translation")
        };
      }),
      empty: words.length ? null : L("No words yet.", "Слов пока нет."),
      export: L("Export", "Экспорт"),
      delete: L("Delete", "Удалить")
    };
  }

  /* ---------- word form: add (card = null) or edit one word ---------- */
  // The sentence is split into word chips; tapping a chip hides that word ({{c1::…}}).
  // Several chips = one split answer (separable verbs: „schlage“ + „vor“).
  const CLOZE = /\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const POS = ["Verb", "Substantiv", "Adjektiv", "Andere"]; // stored values (same as the built-in cards)
  const POS_LABEL = p => ({ Verb: () => L("Verb", "Глагол"), Substantiv: () => L("Noun", "Существительное"), Adjektiv: () => L("Adjective", "Прилагательное"), Andere: () => L("Other", "Другое") })[p]?.();
  function splitToken(t) {
    const m = t.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return { lead: m[1], core: m[2], trail: m[3] };
  }
  function tokensFromCloze(sentence) {
    // protect spaces inside a cloze so „{{c1::zur Verfügung}}“ stays one chip
    const prot = String(sentence || "").replace(CLOZE, (m, w) => "\u0001" + w.trim().replace(/\s+/g, "\u0002") + "\u0003");
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
  const clozeText = toks => toks.map(t => (t.on && t.core ? t.lead + "{{c1::" + t.core + "}}" + t.trail : t.lead + t.core + t.trail)).join(" ");
  const hiddenWords = toks => toks.filter(t => t.on && t.core).map(t => t.core).join(" ");
  // The preview with the gap: [{ text } | { blank: true }] in order — " " between tokens; null when no word is ticked.
  function previewParts(toks) {
    if (!toks.some(t => t.on && t.core)) return null;
    const out = [];
    toks.forEach((t, i) => {
      if (i) out.push({ text: " " });
      out.push({ text: t.lead });
      out.push(t.on && t.core ? { blank: true } : { text: t.core });
      out.push({ text: t.trail });
    });
    return out;
  }
  // The word class chips: Verb / Noun / Adjective / Other; «Other» stays lit for any other stored class.
  const posOn = (pos, p) => (POS.slice(0, 3).includes(pos) ? pos === p : p === "Andere" && !!pos);
  const posTap = (pos, p) => (posOn(pos, p) ? "" : p === "Andere" ? (POS.slice(0, 3).includes(pos) || !pos ? "Andere" : pos) : p);

  // opts.session: opened from ✎ on the answer screen; opts.draft: a word from a book before it is added; opts.create:
  // this word starts a new collection; opts.prefill: the fields of a Wörterbuch card; opts.fromDictionary.
  function form(w, opts, embedded) {
    opts = opts || {};
    const editing = !!w,
      session = !!opts.session,
      creating = !!opts.create;
    const prefill = !editing && opts.prefill ? opts.prefill : null;
    const value = f => (editing ? plainValue(w[f]) : prefill ? plainValue(prefill[f]) : "");
    const toks = editing ? tokensFromCloze(w.sentence) : prefill ? tokensFromCloze(prefill.sentence || "") : [];
    const auto = hiddenWords(toks);
    const fields = [
      { id: "cfSentence", tag: "textarea", rows: "2", label: L("Sentence", "Предложение"), optional: false, placeholder: "Ich schlage Samstag vor.", value: plainText(toks) },
      { id: "cfMeaning", tag: "input", label: L("Meaning", "Значение"), optional: false, placeholder: L("to suggest", "предлагать"), value: value("translation") },
      // 2026-10-26: the word's other meanings (shown quietly as „auch: …“ under the answer), separated by „;“
      { id: "cfOther", tag: "input", label: L("Other Meanings", "Другие значения"), optional: true, placeholder: L("to propose; to recommend", "выдвигать; советовать"), value: value("otherMeanings") },
      { id: "cfTrans", tag: "input", label: L("Sentence Translation", "Перевод предложения"), optional: true, placeholder: L("I suggest Saturday.", "Предлагаю субботу."), value: value("sentenceTranslation") },
      { id: "cfBase", tag: "input", label: L("Base Form", "Начальная форма"), optional: true, placeholder: null, value: editing && w.base && w.base !== auto ? w.base : prefill ? prefill.base || "" : "" },
      { id: "cfGram", tag: "input", label: L("Grammar", "Грамматика"), optional: true, placeholder: "schlug vor · hat vorgeschlagen", value: value("grammar") }
    ];
    return {
      view: "form",
      title: editing ? L("Edit Word", "Изменить слово") : L("New Word", "Новое слово"),
      back: !session, // ‹ (opts.cancel, else the list); none from ✎
      // v2026-10-26: Wörterbuch search on top of the new-word form (only in Wortschatz itself, not in Bibliothek,
      // not for a word that already came from the Wörterbuch). While you search, the form hides.
      search: !editing && !opts.draft && !embedded && !opts.fromDictionary,
      tokens: toks,
      fields,
      examples: !editing, // examples (placeholders) only for a new word
      hint: L("Tap the word you want to practise. For separable verbs, tap both parts.", "Нажми на слово, которое хочешь тренировать. У глаголов с отделяемой приставкой — на обе части."),
      gapLabel: L("gap", "пропуск"),
      posLabel: L("Word Class", "Часть речи"),
      optional: T.optional(),
      pos: editing ? w.pos || "" : prefill ? prefill.pos || "" : "",
      posChips: POS.map(p => ({ value: p, text: POS_LABEL(p) })),
      learnNow: !editing && !creating && !opts.draft
        ? { text: T.learnNow(), aria: T.learnNowAria(), on: true, note: L("On: comes with your next new words (+ 5). Off: added to the end of your list.", "Вкл.: слово придёт со следующими новыми словами (+ 5). Выкл.: добавится в конец списка.") }
        : null,
      save: L("Save", "Сохранить"),
      deleteWord: editing && ((!session && !opts.draft) || (session && !!opts.onDeleted)) ? L("Delete Word", "Удалить слово") : null
    };
  }
  // The Base Form example: the ticked words, or „vorschlagen“ for a new word.
  const basePlaceholder = (toks, editing) => hiddenWords(toks) || (editing ? "" : "vorschlagen");
  const showHint = toks => toks.length > 0 && !toks.some(t => t.on && t.core);

  // Save. values: { toks, meaning, other, trans, base, gram, pos, learnNow (true / false / null) }.
  // → { error, focus? } | { ok: true, kind: "draft" | "session" | "added" | "edited", card?, fields }. Async (a word from
  // the Wörterbuch is checked against it first: opts.validate). The page then: draft → opts.onSaved(card);
  // session → opts.onSaved(card) + close; otherwise dirty, line refresh, and (embedded) close + the reader's confirmation,
  // else the list.
  async function saveWord(w, opts, v) {
    opts = opts || {};
    const editing = !!w,
      creating = !!opts.create,
      prefill = !editing && opts.prefill ? opts.prefill : null;
    const fields = {
      sentence: clozeText(v.toks),
      translation: v.meaning,
      otherMeanings: v.other,
      sentenceTranslation: v.trans,
      base: v.base.trim() || hiddenWords(v.toks),
      grammar: v.gram,
      pos: v.pos
    };
    const dictionaryId = opts.dictionaryId || (prefill && prefill.dictionaryId);
    if (dictionaryId) fields.dictionaryId = dictionaryId;
    if (!v.toks.length) return { error: L("Please type a sentence.", "Напиши предложение."), focus: "cfSentence" };
    if (!hiddenWords(v.toks)) return { error: L("Please tap the word you want to practise.", "Нажми на слово, которое хочешь тренировать.") };
    if (!v.meaning.trim()) return { error: L("Please type the meaning.", "Напиши значение."), focus: "cfMeaning" };
    try {
      if (opts.validate) {
        const problems = await opts.validate();
        if (problems.length) return { error: problems.map(root.WortschatzDictionaryImport.describe).join("; ") };
      }
      if (opts.draft) {
        const normalized = C.normalize(fields);
        if (normalized.reason) return { error: normalized.reason };
        return { ok: true, kind: "draft", card: normalized.card, fields };
      }
      if (editing) {
        const r = C.update(w.id, fields);
        if (r.reason) return { error: r.reason };
        if (opts.session) return { ok: true, kind: "session", card: r.card, fields };
        return { ok: true, kind: "edited", card: r.card, fields };
      }
      const r = creating && !own() ? C.create(opts.name, [fields]) : C.add([fields], { placement: v.learnNow === false ? "end" : "next" });
      if (r.duplicates) return { error: T.duplicate() };
      if (!r.added) return { error: (r.skipped[0] && r.skipped[0].reason) || T.notSaved() };
      return { ok: true, kind: "added", fields };
    } catch (e) {
      return { error: e.message === "storage-full" ? T.storageFullWord() : T.notSaved() };
    }
  }

  /* ---------- «Delete this word?» ---------- */
  // session (from ✎ during practice): no reload — the running session drops the word and goes on (2026-10-26)
  function removeScreen(w, session) {
    return {
      view: "remove",
      title: L("Delete this word?", "Удалить слово?"),
      text: L("„{0}“ and your progress with it will be deleted.", "«{0}» и прогресс по нему будут удалены.", w.base || w.target) +
        (session ? L(" The session goes on with the next word.", " Тренировка продолжится со следующего слова.") : ""),
      keep: L("Keep", "Оставить"),
      delete: L("Delete", "Удалить")
    };
  }
  // → { ok } (session: the page closes the window and tells the round) | { ok: false } (session: removing failed — nothing happens)
  function removeWord(w, session) {
    if (session) {
      try {
        C.remove(w.id);
      } catch (e) {
        return { ok: false };
      }
      return { ok: true, session: true };
    }
    C.remove(w.id);
    return { ok: true };
  }

  /* ---------- Wörterbuch search in the new-word form (v2026-10-26) ----------
     Type → the form hides and dictionary cards show (German word or its translation).
     ＋ adds the card at once („Learn Now“ decides: next new words or end of the list); ✓ Added = tap to undo.
     Tap the word itself → the form is filled with that card, to check or change it before Save.
     Clear the search → the form is back. Cards without a learning example are not shown. */
  const SEARCH = () => ({
    placeholder: L("Search the Wörterbuch", "Поиск в Wörterbuch"),
    clear: L("Clear search", "Очистить поиск"),
    keepTyping: L("Keep typing…", "Печатай дальше…"),
    loading: L("Loading the Wörterbuch…", "Загружаем Wörterbuch…"),
    loadError: L("The Wörterbuch couldn't be loaded. Please try again.", "Не удалось загрузить Wörterbuch. Попробуй ещё раз."),
    none: L("Not in the Wörterbuch. Clear the search to type your own word.", "В Wörterbuch такого нет. Очисти поиск, чтобы ввести своё слово."),
    noteEnd: L("＋ adds the word to the end of your list.", "＋ добавляет слово в конец списка."),
    noteNext: L("＋ adds the word to your next new words.", "＋ добавляет слово к следующим новым словам."),
    added: L("✓ Added", "✓ Добавлено"),
    addedAria: L("Added. Tap to undo", "Добавлено. Нажми, чтобы отменить"),
    inList: T.inList(),
    fill: base => L("Fill the form with ", "Заполнить форму: ") + base,
    add: base => L("Add ", "Добавить ") + base
  });
  let dictionaryIndex = null; // one load per page
  const fold = v =>
    String(v || "").normalize("NFC").toLocaleLowerCase("de-DE").trim()
      .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ё/g, "е");
  function loadDictionaryIndex() {
    dictionaryIndex ||= root.WortschatzDictionaryImport.load().then(map => {
      const seen = new Set(), out = [];
      for (const item of map.values()) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        if (!root.WortschatzDictionaryCard.check(item).available) continue;
        const word = item.word || item.infinitive || "";
        const de = [word, ...(Array.isArray(item.search_forms) ? item.search_forms : [])].map(fold).filter(Boolean);
        // 18.11.2026 (Alena): the meanings in English, Russian and the chosen pack language — one rule with the Wörterbuch
        // search (DeutschTranslation.searchMeanings), so with Polish chosen «pies» finds Hund here too.
        const meanings = (D()?.searchMeanings?.(item) || []).map(fold).filter(Boolean);
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
  // A Wörterbuch card as form fields (the trained meaning only; the rest goes to «Other Meanings»).
  function searchFields(item, lang) {
    const M = root.WortschatzMeanings;
    const f = Object.assign(root.WortschatzDictionaryCard.create(item, lang), { dictionaryId: item.id });
    return M ? M.splitFields(f) : f;
  }
  // A result row's side: "added" (✓, undo) | "in" (In list) | "add" (＋).
  const searchState = (addedHere, item, fields) => (addedHere.has(item.id) ? "added" : own() && C.has(fields) ? "in" : "add");
  // ＋: adds at once. → { ok, created } (created: this word started the collection — ‹ now leads to the list) | { error }.
  function addFromSearch(item, lang, placement, opts, addedHere) {
    const fields = searchFields(item, lang);
    try {
      const r = own() ? C.add([fields], { placement }) : C.create(opts.name || MY_WORDS(), [fields]);
      if (!r.added) throw new Error(r.duplicates ? "duplicate" : (r.skipped[0] && r.skipped[0].reason) || "not-saved");
      const added = C.cards().find(c => c.dictionaryId === item.id);
      addedHere.set(item.id, added && added.id);
      return { ok: true, created: !!opts.create };
    } catch (e) {
      return { error: e.message === "storage-full" ? T.storageFullWord() : e.message === "duplicate" ? T.duplicate() : T.notSaved() };
    }
  }
  function undoSearch(item, addedHere) {
    const id = addedHere.get(item.id);
    if (id) C.remove(id);
    addedHere.delete(item.id);
  }

  /* ---------- a word sent from the Wörterbuch page ---------- */
  function dictionaryConfirm() {
    return {
      view: "dictionaryConfirm",
      title: L("Your Own Words", "Свои слова"),
      text: L("You don't have your own word collection yet. This word starts it.", "У тебя ещё нет своей коллекции слов. Это слово её начнёт."),
      continue: L("Continue", "Продолжить"),
      cancel: L("Cancel", "Отмена"),
      formOpts: (prefill, validate, dictionaryId) => ({ create: true, name: MY_WORDS(), prefill, validate, dictionaryId, fromDictionary: true })
    };
  }
  function dictionaryError(error) {
    const reasons = {
      DICTIONARY_ENTRY_MISSING: L("The dictionary entry is missing.", "В словаре нет этой статьи."),
      DICTIONARY_ENTRY_EXCLUDED: L("This word has no learning card.", "У этого слова нет учебной карточки."), // 08.11: not only pronouns
      DICTIONARY_CLOZE_INVALID: L("The dictionary example has invalid answer markup and needs correction.", "В примере из словаря неверно отмечено слово — его нужно исправить.")
    };
    return {
      view: "dictionaryError",
      title: L("Word Cannot Be Added", "Слово нельзя добавить"),
      word: error.base || L("Unknown word", "Неизвестное слово"), // 08.11 (Alena): no record number
      error: reasons[error.code] || L("The word could not be prepared. Please try again.", "Не удалось подготовить слово. Попробуй ещё раз."),
      hint: error.code === "DICTIONARY_CLOZE_INVALID" ? error.reason : null,
      close: T.close()
    };
  }
  // request { id, version, dictionaryId, lang } → { error } (show dictionaryError) | { form: opts } (own collection: the
  // form) | { confirm: [prefill, validate, dictionaryId] } (no collection yet: dictionaryConfirm first).
  async function prepareDictionaryWord(request) {
    const I = root.WortschatzDictionaryImport;
    const dictionary = await I.load(), item = dictionary.get(request.dictionaryId);
    const check = root.WortschatzDictionaryCard.check(item);
    if (!check.available) return { error: { ...check.error, dictionaryId: request.dictionaryId } };
    const row = I.row(item, request.lang, root.WortschatzDictionaryCard.create(item, request.lang));
    const issues = I.validate([row], dictionary);
    if (issues.length) return { error: { ...issues[0], code: "DICTIONARY_CLOZE_INVALID" } };
    const validate = async () => I.validate([row], await I.load());
    return own() ? { form: { prefill: row.card, validate, dictionaryId: item.id, fromDictionary: true } } : { confirm: [row.card, validate, item.id] };
  }

  /* ---------- words from a book (Bibliothek) ---------- */
  // 10.11 (Alena): from a book the review stays over the book: after adding, a confirmation in the same window.
  const READING = () => ({
    title: L("Words from Reading", "Слова из чтения"),
    intro: title => L("Review words from „{0}“. Tap any word to edit it before adding.", "Проверь слова из «{0}». Нажми на слово, чтобы изменить его перед добавлением.", String(title || "Bibliothek")),
    unavailable: n => L("{0} {0|word without a learning card remains|words without learning cards remain} saved in Bibliothek.", "{0} {0|слово без учебной карточки остаётся|слова без учебных карточек остаются|слов без учебных карточек остаются} в Bibliothek.", n),
    startsCollection: L("These words start your own word collection.", "С этих слов начнётся твоя коллекция."),
    collectionName: T.collectionName(),
    include: base => L("Include ", "Включить ") + (base || L("word", "слово")),
    wordFallback: L("Word", "Слово"),
    placementLabel: L("Add New Words", "Куда добавить новые слова"),
    placements: [{ value: "end", text: L("At the End of the List", "В конец списка") }, { value: "next", text: L("As the Next New Words", "Следующими новыми словами") }],
    placementHint: L("Next new words: before the words you haven't started. Your current reviews stay unchanged.", "Следующими новыми — перед словами, которые ты ещё не начинал. Текущие повторения не меняются."),
    confirm: n => (own() ? L("Add ", "Добавить ") : L("Create Collection with ", "Создать коллекцию: ")) + wordsTitle(n),
    discard: L("Discard This Batch", "Отказаться от этих слов"),
    discardTitle: L("Discard these words?", "Отказаться от этих слов?"),
    discardText: L("Nothing has been added. The words remain saved in Bibliothek.", "Ничего не добавлено. Слова остаются в Bibliothek."),
    keepReviewing: L("Keep Reviewing", "Продолжить проверку"),
    discardBatch: L("Discard Batch", "Отказаться"),
    restoreError: L("The draft could not be prepared. It is kept; please try again.", "Не удалось подготовить черновик. Он сохранён — попробуй ещё раз."),
    restoreTitle: L("Draft Could Not Be Restored", "Не удалось восстановить черновик"),
    restoreText: L("Your draft is kept. Please try again.", "Черновик сохранён. Попробуй ещё раз."),
    close: T.close()
  });
  const readingSelected = request => request.rows.map((row, index) => ({ row, index })).filter(({ index }) => !request.excluded.includes(index));
  // «Add …» of the review. → { error } | { ok, result, words } (the page: dirty, forget the draft, then the confirmation
  // (from a book) or the list with notice / scroll to the first added word).
  async function confirmReading(request) {
    const I = root.WortschatzDictionaryImport;
    let persisted = false; // the page keeps the draft once the words passed the check (as before 19.11)
    try {
      const selection = readingSelected(request), rows = selection.map(({ row }) => row);
      const dictionary = await I.load(), issues = I.validate(rows, dictionary);
      if (issues.length) return { error: issues.map(issue => I.describe({ ...issue, n: selection[issue.n - 1].index + 1 })).join("; ") };
      persisted = true;
      const items = rows.map(row => ({ ...row.card, dictionaryId: dictionary.get(row.dictionaryId)?.id || row.dictionaryId })), prepared = C.prepare(items, own() ? C.cards() : []);
      if (prepared.skipped.length) return { error: prepared.skipped.map(issue => I.describe({ ...issue, n: selection[issue.n - 1].index + 1, dictionaryId: rows[issue.n - 1].dictionaryId, base: rows[issue.n - 1].card.base })).join("; "), persisted: true };
      if (!prepared.cards.length) return { error: L("These words are already in your collection.", "Эти слова уже есть в коллекции."), persisted: true };
      const result = own() ? C.add(items, { placement: request.placement }) : C.create(request.name.trim() || MY_WORDS(), items);
      if (!result.added) return { error: L("No words were added.", "Слова не добавлены."), persisted: true };
      const notice = L("{0} words added", "Добавлено: {1}", result.added, wordsLabel(result.added)) + (request.placement === "next" ? L(" as the next new words", " — следующими новыми") : "") + "." + (result.duplicates ? L(" {0} already in your collection.", " Уже были в коллекции: {0}.", result.duplicates) : "");
      const added = new Set(result.ids || C.cards().map(word => word.id));
      return { ok: true, persisted: true, result, words: selection.map(({ row }) => row.card || {}), notice, scrollTo: C.cards().findIndex(word => added.has(word.id)) };
    } catch (e) {
      return { error: L("The words could not be saved. Your review is kept; please try again.", "Не удалось сохранить слова. Твой выбор сохранён — попробуй ещё раз."), failed: true, persisted };
    }
  }
  function readingDone(result, words, unavailable) {
    const notes = [];
    if (result.duplicates) notes.push(L("{0} already in your collection.", "{0} {0|слово уже было|слова уже были|слов уже были} в коллекции.", result.duplicates));
    if (unavailable) notes.push(L("{0} without learning cards stay in Meine Wörter.", "{0} {0|слово без карточки осталось|слова без карточек остались|слов без карточек остались} в Meine Wörter.", unavailable));
    return {
      view: "readingDone",
      title: result.added === 1 ? "1 Wort" : result.added + " Wörter",
      text: L("added to Wortschatz, collection „{1}“", "{0|добавлено|добавлены} в Wortschatz, коллекция «{1}»", result.added === 1 ? 1 : 2, name()),
      words: words.length && words.length <= 5 ? words.map(w => ({ de: w.base || "", tr: plainValue(w.translation) })) : null,
      note: notes.length ? notes.join(" ") : null,
      continue: "Weiterlesen",
      openWortschatz: L("Open Wortschatz", "Открыть Wortschatz")
    };
  }

  /* ---------- Word sets (v2026-10-26) ----------
     A set is a ready-made selection to pick from, not a deck: nothing is ticked at first, „Select All“ ticks
     everything, the count shows how many are ticked. Words already in the collection show „In list“.
     Set files: sets/<id>.json = {id, name, description:{en,ru}, entries:[{id: Wörterbuch id,
     sentence?, sentenceTranslation?:{ru,en}, translation?:{ru,en}} | {custom:{base, pos, sentence, translation:{ru,en},
     sentenceTranslation:{ru,en}}}]} — an entry may carry its own example for this set, and a word that is not in
     the Wörterbuch (e.g. „es sei denn“) is a custom entry; the Wörterbuch is not changed. Cards keep dictionaryId. */
  const SETS = [
    { id: "a2-b1", name: "A2 → B1", file: "sets/a2-b1.json?v=3" },
    { id: "b1-b2", name: "B1 → B2", file: "sets/b1-b2.json?v=3" },
    { id: "b2-c1", name: "B2 → C1", file: "sets/b2-c1.json?v=2" }
  ];
  const setCache = {};
  async function loadSet(def) {
    setCache[def.id] ||= (async () => {
      const r = await root.fetch(def.file, { cache: "no-store" });
      if (!r.ok) throw new Error("set-missing");
      const set = await r.json();
      // a language pack (17.11.2026): the set's texts (the pack file the manifest gives for wortschatz/sets/<id>.json) are read first
      if (D()?.needsPack?.()) {
        const src = "wortschatz/" + def.file.replace(/\?.*$/, "");
        await new Promise(done => D().ready([src], done));
        /* 18.11.2026: the pack's texts written into the set by place too — a text whose Russian or English was corrected
           keeps its translation (found by its German); path root "json", as the extraction (dev/lang/extract.cjs) */
        D().apply?.(set, src, "json");
      }
      return set;
    })().catch(e => { delete setCache[def.id]; throw e; });
    return setCache[def.id];
  }
  const setCount = set => wordsLabel((set.entries || []).length);
  const pickLang = v => (v && typeof v === "object" ? v[cardLang()] || (packLang() ? D().pick(v) : "") || v.en || v.ru || "" : v || "");
  function setsScreen() {
    return {
      view: "sets",
      title: L("Word Sets", "Наборы слов"),
      text: L("Ready-made word sets. Open one and tick the words you want to learn.", "Готовые наборы слов. Открой набор и отметь слова, которые хочешь учить."),
      loadError: L("Couldn't be loaded.", "Не загрузился.")
    };
  }
  const SETPICK = () => ({
    title: L("Word Set", "Набор слов"),
    loading: L("Loading…", "Загрузка…"),
    loadError: L("The set couldn't be loaded. Please try again.", "Не удалось загрузить набор. Попробуй ещё раз."),
    collectionName: T.collectionName(),
    nameHint: L("This will be your own collection - you can add, edit and delete words any time.", "Это будет твоя коллекция — слова можно добавлять, менять и удалять в любой момент."),
    selectAll: L("Select All", "Выбрать все"),
    selectAllAria: L("Select all", "Выбрать все"),
    inList: T.inList(),
    learn: base => L("Learn ", "Учить ") + base,
    learnNow: T.learnNow(),
    learnNowAria: T.learnNowAria(),
    learnNowNote: L("On: they come with your next new words (+ 5). Off: added to the end of your list.", "Вкл.: слова придут со следующими новыми словами (+ 5). Выкл.: добавятся в конец списка.")
  });
  // The set's words as cards (in the user's language), skipping words without a learning card.
  async function setWords(def) {
    const [set, dictionary] = await Promise.all([loadSet(def), root.WortschatzDictionaryImport.load(), root.WortschatzMeanings && root.WortschatzMeanings.load()]);
    const lang = cardLang();
    const words = [];
    for (const entry of set.entries || []) {
      if (entry.custom) {
        const c = entry.custom;
        const fields = { sentence: c.sentence, translation: pickLang(c.translation), sentenceTranslation: pickLang(c.sentenceTranslation), base: c.base, pos: c.pos || "Andere", grammar: "" };
        if (C.normalize(fields).card) words.push(fields);
        continue;
      }
      const item = dictionary.get(entry.id);
      if (!item || !root.WortschatzDictionaryCard.check(item).available) continue;
      const fields = Object.assign(root.WortschatzDictionaryCard.create(item, lang), { dictionaryId: item.id });
      if (entry.sentence) fields.sentence = entry.sentence;
      if (entry.sentenceTranslation) fields.sentenceTranslation = pickLang(entry.sentenceTranslation);
      if (entry.translation) {
        // The set's own translation puts the meaning of ITS sentence first: take that one, the rest is „auch:“.
        // (example-senses.json describes the Wörterbuch example, not the set sentence — 17.11.2026: Schicht showed „слой“.)
        fields.translation = pickLang(entry.translation);
        if (root.WortschatzMeanings && typeof fields.translation === "string") {
          const parts = root.WortschatzMeanings.parts(fields.translation, ";");
          if (parts.length) Object.assign(fields, { translation: parts[0], otherMeanings: parts.slice(1).join("; ") });
        }
      }
      const split = root.WortschatzMeanings ? root.WortschatzMeanings.splitFields(fields) : fields; // list shows the trained meaning only
      if (!C.normalize(split).card) continue;
      words.push(split);
    }
    return { set, words };
  }
  // The pick screen's changing texts for n ticked words out of the available ones.
  function setPickState(n, available) {
    return {
      count: available ? L("Selected: ", "") + n + " / " + available : L("All words are already in your list.", "Все слова уже в твоём списке."),
      all: !!n && n === available,
      indeterminate: n > 0 && n < available,
      showAll: !!available,
      button: n ? (own() ? L("Add ", "Добавить ") : L("Create Collection with ", "Создать коллекцию: ")) + wordsTitle(n) : L("Tick the words you want to learn", "Отметь нужные слова"),
      disabled: !n
    };
  }
  const inList = w => own() && C.has(w);
  // «Add …» of the pick screen. → { error } | { ok, notice } (the page: dirty, line refresh, the list with the notice).
  function addFromSet(set, items, learnNow, collectionName) {
    let r;
    try {
      r = own() ? C.add(items, { placement: learnNow === false ? "end" : "next" }) : C.create((collectionName && collectionName.trim()) || set.name, items);
    } catch (e) {
      return { error: e.message === "storage-full" ? L("Storage is full - the words weren't saved.", "Память заполнена — слова не сохранены.") : L("The words couldn't be saved.", "Не удалось сохранить слова.") };
    }
    if (!r.added) return { error: L("These words are already in your collection.", "Эти слова уже есть в коллекции.") };
    return { ok: true, notice: L("{0} {0|word|words} added from „{1}“.", "Добавлено из «{1}»: {2}.", r.added, set.name, wordsLabel(r.added)) };
  }

  /* ---------- Lerntempo (2026-10-26): the button at the bottom right of the start / done screen ----------
     Names in simple German, the explanations in the user's language. */
  function settings() {
    const current = C.getPace();
    return {
      view: "settings",
      title: "Lerntempo", // the only setting so far: it is the title
      options: [
        ["standard", "Standard", L("For the long run", "Чтобы запомнить надолго")],
        ["intensiv", "Intensiv", L("Before an exam · more reviews", "Перед экзаменом · больше повторений")]
      ].map(([id, label, note]) => ({ id, name: label, note, days: C.PACES[id].join(" · ") + " Tage", on: id === current })),
      hint: L("A word you get wrong always comes back tomorrow. Changing the pace only affects the next reviews.", "Слово с ошибкой всегда возвращается на следующий день. Новый темп действует только на следующие повторения.")
    };
  }
  // → the pace id (the page sets the button's icon)
  function setPace(id) {
    C.setPace(id);
    if (typeof root.WortschatzSetPace === "function") root.WortschatzSetPace(id);
    return id;
  }

  /* ---------- own words: create a collection / import a list ---------- */
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
  const FORMAT_BLOCK = () => L(FORMAT_BLOCK_EN, FORMAT_BLOCK_RU);

  // No collection yet → own words: name, then add the first word (Wörterbuch search / typing) or import a list.
  function create() {
    return {
      view: "create",
      title: L("Your Own Words", "Свои слова"),
      text: L("Give your collection a name, then add words: search the Wörterbuch, type them or import a list.", "Назови коллекцию и добавь слова: найди в Wörterbuch, введи сам или импортируй список."),
      nameLabel: T.collectionName(),
      namePlaceholder: MY_WORDS(),
      first: L("Add the First Word", "Добавить первое слово"),
      import: L("Import List", "Импорт списка")
    };
  }
  const createName = text => String(text || "").trim() || MY_WORDS();

  // Paste the AI's answer or pick a file. opts.create: this list starts a new collection.
  function importScreen(opts) {
    return {
      view: "import",
      title: L("Import List", "Импорт списка"),
      intro: L("Ask an AI for example sentences for your words and paste its answer here. To get the right format: ", "Попроси ИИ составить примеры с твоими словами и вставь его ответ сюда. Чтобы ответ был в нужном формате: "),
      format: L("Format for the AI", "Формат для ИИ"),
      pastePlaceholder: '[ { "sentence": "Ich {{c1::schlage}} …", … } ]',
      pasteLabel: L("Paste the list", "Вставь список"),
      or: L("Or: ", "Или: "),
      chooseFile: L("Choose a File", "Выбери файл"),
      accept: ".json,.js,.txt,application/json,text/plain,text/javascript",
      endNote: opts.create ? null : L("New words are added to the end of your list.", "Новые слова добавятся в конец списка."),
      button: opts.create ? L("Create Collection", "Создать коллекцию") : L("Add", "Добавить")
    };
  }
  // The chosen file before it is read: too big (2 MB) → the error text; else null.
  const fileProblem = size => (size > 2e6 ? L("The file is too big.", "Файл слишком большой.") : null);
  const fileUnreadable = () => L("The file couldn't be read.", "Не удалось прочитать файл.");
  // → { error } | { ok, result } (the page: dirty, line refresh, the result screen)
  function runImport(text, opts) {
    const parsed = C.parse(text);
    if (parsed.error)
      return { error: parsed.error === "empty" ? L("Please paste the list first.", "Сначала вставь список.") : L("This doesn't look like a list. Copy the AI's whole answer - from [ to ].", "Это не похоже на список. Скопируй весь ответ ИИ — от [ до ].") };
    let r;
    try {
      r = opts.create ? C.create(opts.name, parsed.items) : C.add(parsed.items);
    } catch (e) {
      return { error: e.message === "storage-full" ? L("Storage is full - nothing was saved.", "Память заполнена — ничего не сохранено.") : L("The list couldn't be saved.", "Не удалось сохранить список.") };
    }
    if (!r.added)
      return {
        error: r.duplicates && !r.skipped.length
          ? L("All these words are already in your collection.", "Все эти слова уже есть в коллекции.")
          : L("None of the cards could be used.", "Ни одну карточку не удалось использовать.") + (r.skipped[0] ? L(" For example no. ", " Например, № ") + r.skipped[0].n + ": " + r.skipped[0].reason + "." : "")
      };
    return { ok: true, result: r };
  }
  function result(r, opts) {
    return {
      view: "result",
      title: opts.create ? L("Collection Created", "Коллекция создана") : L("Words Added", "Слова добавлены"),
      text: (opts.create
        ? L("{0} {0|word|words} in „{1}“.", "{2} в «{1}».", r.added, C.get() ? C.get().name : opts.name, wordsLabel(r.added))
        : L("{0} {0|word|words} added.", "Добавлено: {1}.", r.added, wordsLabel(r.added))) +
        (opts.create && r.added > 10 ? L(" You start with the first 10.", " Начнёшь с первых 10.") : ""),
      duplicates: r.duplicates ? L("{0} {0|word was|words were} already in your collection.", "Уже были в коллекции: {1}.", r.duplicates, wordsLabel(r.duplicates)) : null,
      skippedLabel: r.skipped.length ? L("{0} {0|card|cards} skipped:", "Пропущено: {0} {0|карточка|карточки|карточек}", r.skipped.length) : null,
      skipped: r.skipped.slice(0, 30).map(x => L("No. ", "№ ") + x.n + " · " + x.reason + (x.preview ? " · „" + x.preview + "“" : "")),
      more: r.skipped.length > 30 ? L("… and {0} more.", "… и ещё {0}.", r.skipped.length - 30) : null,
      done: L("Done", "Готово")
    };
  }
  // Shows the format block and copies it (the page copies; copied / copyFailed after it).
  function format() {
    return {
      view: "format",
      title: L("Format for the AI", "Формат для ИИ"),
      text: L("First tell your AI what you want - which words, which level, which language for the translations. Then add this text:", "Сначала напиши ИИ, что тебе нужно: какие слова, какой уровень, на каком языке переводы. Потом добавь этот текст:"),
      block: FORMAT_BLOCK(),
      copy: L("Copy", "Скопировать"),
      copied: L("Copied ✓", "Скопировано ✓"),
      copyFailed: L("Please select the text above and copy it", "Выдели текст выше и скопируй его")
    };
  }

  /* ---------- rename ---------- */
  function rename() {
    return { view: "rename", title: L("Rename", "Переименовать"), label: T.collectionName(), value: name(), save: L("Save", "Сохранить") };
  }
  // v16: the new name reaches the Fortschritt card
  function renameTo(text) {
    C.rename(text);
    try {
      root.publishWortschatzProgress && root.publishWortschatzProgress();
    } catch (e) {}
  }

  /* ---------- export: a clean list that can be imported again ---------- */
  // → { name, text } — the page downloads it as a file (the app: the share sheet)
  function exportFile() {
    return { name: (name().replace(/[\\/:*?"<>|]+/g, " ").trim() || "Wortschatz") + ".json", text: C.exportText() };
  }

  /* ---------- delete the collection ---------- */
  function deleteScreen() {
    return {
      view: "delete",
      title: L("Delete this collection?", "Удалить коллекцию?"),
      text: L("„{0}“ and your progress will be deleted. You can start again with a word set or your own words. This can't be undone - export the words first if you want to keep them.",
        "«{0}» и твой прогресс будут удалены. Начать заново можно с набора слов или со своих слов. Это нельзя отменить — если хочешь сохранить слова, сначала экспортируй их.", name()),
      keep: L("Keep", "Оставить"), // safe choice = contrast button
      delete: L("Delete", "Удалить"),
      exportFirst: L("Export First", "Сначала экспорт")
    };
  }
  // the page reloads after it
  function deleteCollection() {
    C.deleteCollection();
  }

  // ✎ on the answer screen: may this card be edited from the round (own collection only, own cards «u…»)
  const sessionEditable = w => own() && !!w && String(w.id).charAt(0) === "u";

  root.WortschatzWindowModel = {
    L, ruN, own, list, name, MY_WORDS, wordsLabel, wordsTitle, plainValue, cardLang, packLang, T,
    line, main,
    splitToken, tokensFromCloze, tokensFromText, plainText, clozeText, hiddenWords, previewParts, POS, POS_LABEL, posOn, posTap,
    form, basePlaceholder, showHint, saveWord,
    removeScreen, removeWord,
    SEARCH, fold, loadDictionaryIndex, findInDictionary, searchFields, searchState, addFromSearch, undoSearch,
    dictionaryConfirm, dictionaryError, prepareDictionaryWord,
    READING, readingSelected, confirmReading, readingDone,
    SETS, loadSet, setCount, setsScreen, SETPICK, setWords, setPickState, inList, addFromSet,
    settings, setPace,
    FORMAT_BLOCK_EN, FORMAT_BLOCK_RU, create, createName, importScreen, fileProblem, fileUnreadable, runImport, result, format,
    rename, renameTo, exportFile, deleteScreen, deleteCollection, sessionEditable
  };
})(typeof window !== "undefined" ? window : globalThis);
