/* Wortschatz · own word collection (storage layer) — v1, 2026-09-26
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 2). No UI here.

   Storage (localStorage, all covered by Home → Backup):
   - deutschWortschatzCollectionV1   the user's own collection:
       { v:1, name, createdAt, nextId, cards:[ {id:"u1", sentence, blank, revealed, target,
         translation, sentenceTranslation, grammar, pos, base} ] }
     No key = no words yet: Wortschatz shows „Where do you want to start?“ (word sets or own words).
     (2026-10-26: the built-in Starter-Set is gone. Old Starter-Set progress is moved into an own collection
     „Starter-Set“ once, see migrateLegacy(); the set-aside demo progress key is dropped.)
   - wortsternSRSv03                 progress of the ACTIVE collection (unchanged key, so Home's due count,
                                     daily points and Restore keep working as before).

   Rules:
   - Own card ids are strings "u1", "u2", … and are never reused (nextId only grows).
   - Translations of own cards are plain strings (one language); the language switch doesn't touch them.
   - Required per card: a sentence with at least one {{c1::…}} and a translation (meaning of the word).
     Several {{c1::…}} = pieces of ONE answer (separable verbs). blank / revealed / target are built here.
   - Duplicates (v2, 2026-10-26) = the very same sentence, or: two cards from the Wörterbuch (both have dictionaryId)
     are duplicates only if they are the same dictionary card — so different meanings of one word (Block: 3 cards)
     can be added independently; otherwise (at least one card typed / imported without dictionaryId) the same base
     form (article der/die/das ignored; base defaults to the hidden word(s)) as before.
   - Card fields kept by this file besides the learning fields: dictionaryId (the Wörterbuch card the word came from),
     nextNew (true = placed as one of the next new words, see add()).
   - Functions that change progress write straight to localStorage: the page must reload afterwards
     (the Wortschatz page keeps its progress in memory and would otherwise overwrite it). */
(function () {
  const KEY = "deutschWortschatzCollectionV1";
  const DEMO_KEY = "deutschWortschatzDemoProgressV1";
  const PROGRESS_KEY = "wortsternSRSv03";
  const CLOZE = /\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const FIELDS = ["sentence", "translation", "sentenceTranslation", "grammar", "pos", "base"];

  const read = k => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch (e) {
      return null;
    }
  };
  function write(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      const err = new Error("storage-full");
      err.cause = e;
      throw err;
    }
  }
  const today = () => DeutschDay.key(); // components/deutsch-day-v1.js
  const str = v => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  function translationValue(v) {
    if (typeof v === "string") return str(v);
    if (v && typeof v === "object") {
      // {ru, en} pasted from the built-in format: keep it
      const out = {};
      Object.keys(v).forEach(k => {
        const s = str(v[k]);
        if (s) out[k] = s;
      });
      return Object.keys(out).length ? out : "";
    }
    return "";
  }

  /* ---------- reading pasted text / files ---------- */
  // Accepts a JSON array, {cards:[…]} / {words:[…]}, or the words.js format (window.WORDS = [...];).
  // Never executes anything.
  function parse(text) {
    let t = String(text || "")
      .replace(/^﻿/, "")
      .trim();
    t = t
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/, "")
      .trim(); // AI answers in a code block
    t = t
      .replace(/^(?:window\.)?WORDS\s*=\s*/, "")
      .replace(/^(?:const|let|var)\s+\w+\s*=\s*/, "")
      .replace(/;\s*$/, "");
    if (!t) return { items: [], error: "empty" };
    let data;
    try {
      data = JSON.parse(t);
    } catch (e) {
      const a = t.indexOf("["),
        b = t.lastIndexOf("]"); // text around the list
      if (a > -1 && b > a) {
        try {
          data = JSON.parse(t.slice(a, b + 1));
        } catch (e2) {}
      }
      if (data === undefined) return { items: [], error: "not-json" };
    }
    if (data && !Array.isArray(data)) data = data.cards || data.words || data.WORDS;
    if (!Array.isArray(data)) return { items: [], error: "no-list" };
    return { items: data, error: null };
  }

  /* ---------- one card ---------- */
  function hiddenParts(sentence) {
    const out = [];
    String(sentence).replace(CLOZE, (m, w) => {
      out.push(w.trim());
      return m;
    });
    return out;
  }
  const keyOf = k =>
    str(k)
      .toLowerCase()
      .replace(/^(der|die|das)\s+/, "")
      .trim();
  function germanKey(card) {
    return keyOf(str(card.base) || hiddenParts(card.sentence).join(" "));
  }
  // A word counts as already there if its base form matches, or the whole sentence is the same.
  // Hidden words alone are NOT compared: „der Bescheid“ and „Bescheid geben“ hide the same word but are
  // different things to learn. A duplicate slipping through is harmless; skipping a wanted word is not.
  // Duplicate index (v2): see the rule in the header.
  function dupIndex(list) {
    const ix = { s: new Set(), d: new Set(), bAll: new Set(), bNoId: new Set() };
    ix.put = c => {
      ix.s.add(str(c.sentence).toLowerCase());
      ix.bAll.add(germanKey(c));
      if (c.dictionaryId) ix.d.add(String(c.dictionaryId));
      else ix.bNoId.add(germanKey(c));
    };
    ix.has = c => {
      if (ix.s.has(str(c.sentence).toLowerCase())) return true;
      return c.dictionaryId ? ix.d.has(String(c.dictionaryId)) || ix.bNoId.has(germanKey(c)) : ix.bAll.has(germanKey(c));
    };
    (list || []).forEach(ix.put);
    return ix;
  }
  // Is this word (a card, or {dictionaryId, base, sentence}) already in the own collection?
  const has = c => dupIndex(cards()).has(c);
  // Returns {card} or {reason}. Reasons are short English texts for the import summary (the collection screens are in English).
  function normalize(raw) {
    if (!raw || typeof raw !== "object") return { reason: "Not a valid entry" };
    const sentence = str(raw.sentence);
    if (!sentence) return { reason: "No sentence" };
    const parts = hiddenParts(sentence);
    if (!parts.length || parts.some(p => !p)) return { reason: "No word marked with {{c1::…}} in the sentence" };
    const translation = translationValue(raw.translation);
    if (!translation) return { reason: "No meaning" };
    const clean = sentence.replace(CLOZE, (m, w) => "{{c1::" + w.trim() + "}}");
    const card = {
      sentence: clean,
      blank: clean.replace(CLOZE, "_____"),
      revealed: clean.replace(CLOZE, (m, w) => w),
      target: parts.join(" / "),
      translation,
      sentenceTranslation: translationValue(
        raw.sentenceTranslation !== undefined ? raw.sentenceTranslation : raw.ru !== undefined ? raw.ru : raw.en
      ),
      grammar: translationValue(raw.grammar),
      pos: str(raw.pos),
      base: str(raw.base) || parts.join(" ")
    };
    const dictionaryId = str(raw.dictionaryId);
    if (dictionaryId) card.dictionaryId = dictionaryId;
    return { card };
  }

  /* ---------- collection ---------- */
  function get() {
    const c = read(KEY);
    return c && Array.isArray(c.cards) ? c : null;
  }
  const isOwn = () => !!get();
  const cards = () => {
    const c = get();
    return c ? c.cards : [];
  };

  // Checks a list against the cards already there. Nothing is saved.
  function prepare(items, existing) {
    const seen = dupIndex(existing);
    const ok = [],
      skipped = [];
    let duplicates = 0;
    (items || []).forEach((raw, i) => {
      const r = normalize(raw);
      if (!r.card) {
        skipped.push({ n: i + 1, reason: r.reason, preview: str(raw && raw.sentence).slice(0, 60) });
        return;
      }
      if (seen.has(r.card)) {
        duplicates++;
        return;
      }
      seen.put(r.card);
      ok.push(r.card);
    });
    return { cards: ok, skipped, duplicates };
  }
  function withIds(c, list) {
    const addedAt = new Date().toISOString();
    return list.map(card => Object.assign({ id: "u" + c.nextId++, addedAt }, card));
  }
  const summary = (p, extra) =>
    Object.assign({ added: p.cards.length, skipped: p.skipped, duplicates: p.duplicates }, extra || {});

  // Start the own collection (there is none yet).
  function create(name, items) {
    if (isOwn()) throw new Error("already-own");
    const p = prepare(items, []);
    if (!p.cards.length) return summary(p, { created: false });
    const c = { v: 1, name: str(name) || "My Words", createdAt: new Date().toISOString(), nextId: 1, cards: [] };
    c.cards = withIds(c, p.cards);
    write(KEY, c); // throws if storage is full — nothing changed yet
    localStorage.removeItem(DEMO_KEY);
    write(PROGRESS_KEY, { cards: {}, activeIds: [] }); // Wortschatz picks the first 10 words on its next start
    return summary(p, { created: true });
  }

  // Add more words to the own collection.
  // placement "next" (v2, 2026-10-26; „Learn Now“ on): the words come with the next „+ 5 neue Wörter“ — after the
  //   words already started and after earlier „next“ words, in the order they were added (nextNew flag). Not started.
  // placement "end" („Learn Now“ off): at the very end of the list.
  // activateNow (old „Learn Now“, no longer used by the window): cards become active right away (due today).
  function add(items, { activateNow = false, placement = "end" } = {}) {
    const c = get();
    if (!c) throw new Error("no-collection");
    const p = prepare(items, c.cards);
    if (!p.cards.length) return summary(p);
    // Resolve dependencies before persisting cards: a failure must not look like a failed save after writing.
    const due = activateNow ? today() : null;
    const fresh = withIds(c, p.cards);
    if (placement === "next") {
      const active = new Set((read(PROGRESS_KEY)?.activeIds || []).map(String));
      const isActive = card => active.has(String(card.id));
      c.cards.forEach(card => {
        if (isActive(card)) delete card.nextNew; // started: no longer waiting
      });
      fresh.forEach(card => (card.nextNew = true));
      c.cards = c.cards
        .filter(isActive)
        .concat(c.cards.filter(card => !isActive(card) && card.nextNew), fresh, c.cards.filter(card => !isActive(card) && !card.nextNew));
    } else c.cards = c.cards.concat(fresh);
    write(KEY, c);
    if (activateNow) {
      const st = read(PROGRESS_KEY) || { cards: {}, activeIds: [] };
      st.cards = st.cards || {};
      st.activeIds = st.activeIds || [];
      fresh.forEach(card => {
        st.activeIds.push(card.id);
        st.cards[card.id] = { level: 0, due };
      });
      write(PROGRESS_KEY, st);
    }
    return summary(p, { ids: fresh.map(x => x.id) });
  }

  // Edit one card (✎). Same id → progress kept. Returns {card} or {reason}.
  function update(id, fields) {
    const c = get();
    if (!c) throw new Error("no-collection");
    const i = c.cards.findIndex(x => x.id === id);
    if (i < 0) return { reason: "Card not found" };
    const merged = {};
    FIELDS.forEach(f => (merged[f] = fields && fields[f] !== undefined ? fields[f] : c.cards[i][f]));
    const r = normalize(merged);
    if (!r.card) return r;
    const old = c.cards[i];
    if (old.dictionaryId && !r.card.dictionaryId) r.card.dictionaryId = old.dictionaryId; // edited dictionary word: same meaning
    if (dupIndex(c.cards.filter((x, j) => j !== i)).has(r.card)) return { reason: "This word is already in your collection" };
    c.cards[i] = Object.assign({ id, addedAt: old.addedAt }, r.card, old.nextNew ? { nextNew: true } : {});
    write(KEY, c);
    return { card: c.cards[i] };
  }

  // Remove one card and its progress.
  function remove(id) {
    const c = get();
    if (!c) throw new Error("no-collection");
    c.cards = c.cards.filter(x => x.id !== id);
    write(KEY, c);
    const st = read(PROGRESS_KEY);
    if (st) {
      st.activeIds = (st.activeIds || []).filter(x => x !== id);
      if (st.cards) delete st.cards[id];
      write(PROGRESS_KEY, st);
    }
  }

  /* Review pace (2026-10-26): how far apart the reviews are. Stored in the collection itself, so Home's backup
     keeps it. Standard = the long run (the intervals so far), Intensiv = before an exam (more reviews).
     A wrong answer always starts the word again (today until right, then tomorrow) — in both paces. */
  const PACES = { standard: [1, 8, 20, 45, 90], intensiv: [1, 3, 7, 21, 45] };
  function getPace() {
    const c = get();
    return c && PACES[c.pace] ? c.pace : "standard";
  }
  function setPace(pace) {
    const c = get();
    if (!c || !PACES[pace]) return getPace();
    c.pace = pace;
    write(KEY, c);
    return pace;
  }

  function rename(name) {
    const c = get();
    if (!c) throw new Error("no-collection");
    c.name = str(name) || c.name;
    write(KEY, c);
    return c.name;
  }

  // Clean list for sharing / editing with an AI; can be imported again as it is.
  function exportText() {
    const c = get();
    if (!c) return "[]";
    return JSON.stringify(
      c.cards.map(x => {
        const o = {};
        FIELDS.forEach(f => {
          if (x[f]) o[f] = x[f];
        });
        if (x.dictionaryId) o.dictionaryId = x.dictionaryId;
        return o;
      }),
      null,
      2
    );
  }

  // Delete the own collection and its progress: Wortschatz is empty again („Where do you want to start?“).
  function deleteCollection() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cards: {}, activeIds: [] }));
    localStorage.removeItem(KEY);
    localStorage.removeItem(DEMO_KEY);
  }

  /* One-time move of the old built-in Starter-Set (2026-10-26). Users who practised with it keep the words
     they had started, with their progress, as an own collection „Starter-Set“; words never started are dropped.
     The old cards are read from legacy/starter-set.js (window.WORDS format, never executed). Synchronous on
     purpose: Wortschatz reads the collection while the page loads. If anything fails, nothing is changed. */
  function needsLegacyMove() {
    if (isOwn()) return false;
    const st = read(PROGRESS_KEY);
    return !!(st && Array.isArray(st.activeIds) && st.activeIds.some(id => typeof id === "number" || /^\d+$/.test(String(id))));
  }
  function migrateLegacy(url) {
    if (!needsLegacyMove()) return false;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send();
      if (xhr.status && xhr.status !== 200) return false;
      const old = parse(xhr.responseText).items;
      const st = read(PROGRESS_KEY);
      const started = new Set(st.activeIds.map(String));
      const c = { v: 1, name: "Starter-Set", createdAt: new Date().toISOString(), nextId: 1, cards: [] };
      const progress = { cards: {}, activeIds: [] };
      const addedAt = new Date().toISOString();
      old.filter(w => started.has(String(w.id))).forEach(w => {
        const r = normalize(w);
        if (!r.card) return;
        const id = "u" + c.nextId++;
        c.cards.push(Object.assign({ id, addedAt }, r.card));
        progress.activeIds.push(id);
        if (st.cards && st.cards[w.id]) progress.cards[id] = st.cards[w.id];
      });
      if (!c.cards.length) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cards: {}, activeIds: [] }));
        return false;
      }
      write(KEY, c);
      write(PROGRESS_KEY, progress);
      localStorage.removeItem(DEMO_KEY);
      return true;
    } catch (e) {
      console.error("Could not move the old Starter-Set", e);
      return false;
    }
  }

  // Rough size of everything this app keeps in localStorage (UTF-16: 2 bytes per character).
  function storageBytes() {
    let n = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        n += (k.length + (localStorage.getItem(k) || "").length) * 2;
      }
    } catch (e) {}
    return n;
  }

  window.WortschatzCollection = {
    KEY,
    DEMO_KEY,
    PROGRESS_KEY,
    get,
    isOwn,
    cards,
    parse,
    normalize,
    prepare,
    germanKey,
    has,
    create,
    add,
    update,
    remove,
    rename,
    exportText,
    deleteCollection,
    PACES,
    getPace,
    setPace,
    needsLegacyMove,
    migrateLegacy,
    storageBytes
  };
})();
