/* Deutsch · Wörterbuch without a page — v1 (20.11.2026, design chat; request of the native app, stage 5)
   Everything the Wörterbuch panel of Home knows, as data: loading the dictionary, the search, what one input leads
   to, the list of matches, and a card as a list of parts. No page (DOM) here — worterbuch.js asks this file and draws
   the same markup as before (old vs new compared); the native app runs this very file (JavaScriptCore) and draws in
   SwiftUI. Like wortschatz/collection-window-model.js. Needs DeutschTranslation (components/deutsch-translation-v1.js)
   for the texts in the person's language; without it English / Russian by `deutschTranslationLangV1` are not read
   (English).

   Loading
     WorterbuchModel.load(options)   → Promise of the cards (array) or null when the dictionary could not be loaded.
                                       The files of FILES, a language pack merged in by id
                                       (DeutschTranslation.mergeById), cards with worterbuch_hidden left out, each
                                       card's `type` set, «Ausdrücke» built from the expressions' related_ids. A second
                                       call while loading returns the same promise; after a failure the next call tries
                                       again. options.fetchJson(file) — the app's own reader (file = "german-nouns.json");
                                       by default fetch() next to this file (document.currentScript.src).
     WorterbuchModel.loaded() / loading() / entries()
     WorterbuchModel.FILES           → [{ file, version, type, optional }] in loading order

   Search (one rule — not the Wortschatz «+ Wort» search, that one stays its own, Alena 20.11)
     normalized(text), meaningKey(text), reflexiveName(card) («sich X» or ""), searchKeys(card) (with the language),
     findMatches(query) → cards, best first (a «sich X» hit is a copy with reflexiveHit: true),
     isExactMatch(card, query)

   What an input leads to — { kind, … }:
     decide(query) → { kind: "empty" } | { kind: "loading" } | { kind: "entry", card } (exactly one exact match) |
                     { kind: "list", matches } | { kind: "none" }        — typing in the field
     submit(query) → the same; «Enter»: one exact match, or else the only match, opens the card
     back(query)   → the same; «‹ Zurück zur Suche»: the list whenever there are matches (even one exact)
     "loading" = the cards are not here yet: call load(), then decide again.

   List and card as data
     list(matches) → { rows: [{ word, translation, card }] (at most MAX_ROWS = 12), more: n (0 when none),
                     moreText: "Weitere Treffer: n" or "" }; word = «der Hund», «sich drehen», …
     typeLabel(card) → the part of speech for the label above the word and for the «Zurück» row («Nomen», …)
     entry(card)   → { pos, headword, blocks: […], addToWortschatz: true / false, addToWortschatzAt }
                     addToWortschatzAt — the index in blocks before which the «＋ Zum Wortschatz» button stands: after
                     the card's own parts, before «Ausdrücke» and «Siehe auch» (blocks.length when they are none)
       blocks, in the order of the card:
         { kind: "detail", text }                 Plural / Perfekt / Steigerung line
         { kind: "note", text, parts? }           a note; parts — in the card's own note when the text of a see_also
                                                  link stands in it (below)
         { kind: "translation", text }
         { kind: "reflexive", sich, text }        «sich X — …» (sich X bold)
         { kind: "section", type, label, lines }  a labelled section; type:
             wordOrder, example, hints, pronounForms, declension, complements, government, reflexive, verbForms,
             imperative, expressions, seeAlso
           lines:
             { kind: "detail", text }             { kind: "pattern", parts: [{ text, bold }] }
             { kind: "example", text }            { kind: "reflexiveExample", text }
             { kind: "exampleTranslation", text } (text may be "" — an extra example always has the line)
             { kind: "note", text }               { kind: "complement", text } (bold) · { kind: "complementNote", text }
             { kind: "governmentExample", text }  the German example of a preposition's pattern («Kasus»)
             { kind: "table", corner, columns, rows: [{ head, cells }], scroll, label }
                                                  pronoun tables scroll sideways (scroll: true, label for VoiceOver),
                                                  the verb table does not
             { kind: "imperative", parts: [{ person, form }] }   «du: geh · ihr: geht · Sie: gehen Sie»
             { kind: "expression", word, translation, card }      opens that card («Ausdrücke»)
             { kind: "cardLink", word, translation, card }        opens that card («Siehe auch», the same row)
       Links (see_also: [{ id, text?, field?, at?: { <lang>: n } }] — related cards; the definition is the README of
       card batch 245, «Как найти место ссылки»): the note fields usage_note, plural_note, forms_note, notes.<i>,
       reflexive.note of the shown language; the field is `field`, or else the only one that holds text; in it the places
       of text — a plain search, left to right, without overlaps, also inside longer words; with at[lang] place n
       (1 = the first), without it the only place. A pack language takes at / field from the pack's see_also_<lang>
       entry with the same id. That note has parts: [{ text } | { text, card }]; the { text, card }
       part opens that card, text stays the whole note. Any other linked card → the section «Siehe auch» at the end of
       the card (not repeated when already among «Ausdrücke»).
     All texts are already in the person's language (DeutschTranslation.field); German stays German.

   TEXT — the texts of the panel: hint under the field (TEXT.intro(), in the person's language; TEXT.introLines() — the
   same split after its colon, shown centred, one line each), placeholder
   «Wort suchen …», «Wörter werden geladen …», «Kein Wort gefunden.», «Die Wörterliste konnte nicht geladen werden.»,
   «Zurück zur Suche», «＋ Zum Wortschatz», VoiceOver: «Deutsches Wort suchen» (field), «Suche leeren» (clear).
   (index.html carries the placeholder and the two VoiceOver labels in its markup — the same words.) */
(function (root) {
  "use strict";

  // Where this file is — the dictionary files lie next to it (like wortschatz/dictionary-import.js).
  const BASE = (() => {
    try {
      const src = root.document && root.document.currentScript && root.document.currentScript.src;
      return src ? new URL("./", src).href : "";
    } catch (e) {
      return "";
    }
  })();

  // The data files; a new batch of cards changes the version here (and this file's ?v= in index.html).
  const FILES = Object.freeze([
    { file: "german-nouns.json", version: "20261127-wn-x247-tr-source-fixes-1", type: "noun" },
    { file: "german-verbs.json", version: "20261128-wn-x249-halten-an-1", type: "verb" },
    { file: "german-adjectives.json", version: "20261127-wn-x247-tr-source-fixes-1", type: "adjective" },
    { file: "german-adverbs.json", version: "20261126-wn-x245-see-also-4", type: "adverb" },
    { file: "german-conjunctions.json", version: "20261126-wn-x245-see-also-4", type: "conjunction" },
    { file: "german-pronouns.json", version: "20261126-wn-x245-see-also-4", type: "pronoun" },
    { file: "german-prepositions.json", version: "20261126-wn-x246-function-hidden-2", type: "preposition" },
    // function words: each card keeps its own type (particle, adverb …); those for the book reader only are worterbuch_hidden
    { file: "german-function-words.json", version: "20261126-wn-x246-function-hidden-2", type: null },
    { file: "german-adjective-adverbs.json", version: "20261126-wn-x245-see-also-4", type: "adjective" },
    // E1 (22.10.2026, user): expression cards (vor sich hin) are shown here too; a missing file is no expressions.
    { file: "german-expressions.json", version: "20261127-wn-x246-zexpr-match-5", type: "expression", optional: true }
  ].map(Object.freeze));

  const ORDER = ["german-nouns.json", "german-verbs.json", "german-adjectives.json", "german-adverbs.json", "german-adjective-adverbs.json", "german-conjunctions.json", "german-pronouns.json", "german-prepositions.json", "german-function-words.json", "german-expressions.json"];

  const TYPE_LABEL = Object.freeze({ noun: "Nomen", verb: "Verb", adjective: "Adjektiv", adverb: "Adverb", conjunction: "Konjunktion", pronoun: "Pronomen", preposition: "Präposition", particle: "Partikel", expression: "Ausdruck" });
  // the status of a preposition's pattern (government[].status) → its mark; "standard" has none
  const GOVERNMENT_STATUS = Object.freeze({ also_correct: "auch möglich", colloquial: "umgangssprachlich" });
  const MAX_ROWS = 12;

  const T = () => root.DeutschTranslation;

  const TEXT = Object.freeze({
    intro: () => T() ? T().t("Search German words for a brief grammar note", "Немецкие слова: краткая грамматическая справка") : "Search German words for a brief grammar note",
    // 21.11.2026 (Alena): the hint is centred and breaks after its colon („Немецкие слова:“ / „краткая …“), not one
    // word alone on the last line → its lines (one line when there is no colon, as in English)
    introLines: () => {
      const text = TEXT.intro(), at = text.indexOf(": ");
      return at < 0 ? [text] : [text.slice(0, at + 1), text.slice(at + 2)];
    },
    placeholder: "Wort suchen …",
    loading: "Wörter werden geladen …",
    none: "Kein Wort gefunden.",
    loadError: "Die Wörterliste konnte nicht geladen werden.",
    back: "Zurück zur Suche",
    addToWortschatz: "＋ Zum Wortschatz",
    more: n => "Weitere Treffer: " + n,
    searchLabel: "Deutsches Wort suchen",
    clearLabel: "Suche leeren"
  });

  let entries = null;
  let expressionsByCard = new Map();
  let cardsById = new Map();
  let loadPromise = null;

  function language() {
    return T() ? T().getLang() : "en";
  }

  function translated(ru, en) {
    const selectedText = language() === "ru" ? ru : en;
    return selectedText || ru || en || "";
  }

  // 17.11.2026 (languages): obj[name_ru / name_en] as before; a language pack's obj[name_pl] first (merged in at load).
  function translatedField(obj, name) {
    const D = T();
    return (D && D.field ? D.field(obj, name) : translated(obj[name + "_ru"], obj[name + "_en"])) || "";
  }

  function noteLines(item) {
    return T() && T().field ? T().field(item, "notes") : language() === "ru" ? (item.notes_ru || item.notes_en) : (item.notes_en || item.notes_ru);
  }

  // Wörterbuch quality A5 (user 27.10.2026): search compares one spelling — typographic apostrophes (’ ‘ ʼ ´ `, iPhone keyboard)
  // count as ', ß as ss (sei’s drum → sei's drum, Massnahmen → Maßnahmen).
  function normalized(value) {
    return String(value || "").trim().normalize("NFC").toLocaleLowerCase("de-DE").replace(/[’‘ʼ´`]/g, "'").replace(/ß/g, "ss");
  }

  function meaningKey(value) {
    return normalized(value).replace(/ё/g, "е");
  }

  // Wörterbuch quality A1 (user 26.10.2026): a verb with the field `reflexive` is also found as «sich X» (sich drehen → drehen),
  // like an own «sich X» card; in the list of matches such a hit shows «sich X — <reflexive translation>».
  function reflexiveName(item) {
    return item.type === "verb" && item.reflexive && item.reflexive.worterbuch_hidden !== true ? "sich " + item.word : "";
  }

  // Wörterbuch quality A6 (user 27.10.2026): the search keys of a card, computed once — the headword, the «sich X» line, the
  // search_forms and the headword without its brackets: grammar marks dropped (sich (Dativ) Sorgen machen → sich Sorgen machen)
  // and optional letters kept (einer nach dem ander(e)n → einer nach dem anderen, … andern).
  function searchKeys(item) {
    const lang = T()?.getDisplayLang?.() || "";
    if (item.searchKeys && item.searchKeys.lang === lang) return item.searchKeys;
    const word = normalized(item.word);
    const forms = new Set([...(item.search_forms || []), ...Object.keys(item.contractions || {})].map(normalized));
    const raw = String(item.word);
    if (raw.includes("(")) {
      forms.add(normalized(raw.replace(/\s*\([^)]*\)/g, "")));
      forms.add(normalized(raw.replace(/[()]/g, "")));
    }
    forms.delete(word);
    // 18.11.2026 (Alena): also its meanings in English, Russian and the chosen pack language — «dog», «собака», «pies» find Hund.
    const meanings = (T()?.searchMeanings?.(item) || []).map(meaningKey);
    item.searchKeys = { word, forms: [...forms], sich: normalized(reflexiveName(item)), meanings, lang };
    return item.searchKeys;
  }

  function isExactMatch(item, query) {
    const needle = normalized(query);
    const keys = searchKeys(item);
    return keys.word === needle || keys.forms.includes(needle) || Boolean(keys.sich && keys.sich === needle);
  }

  function defaultFetchJson(file) {
    const url = BASE ? new URL(file, BASE).href : "worterbuch/" + file;
    return fetch(url).then(response => {
      if (!response.ok) throw new Error(url + " HTTP " + response.status);
      return response.json();
    });
  }

  function load(options) {
    if (entries) return Promise.resolve(entries);
    if (loadPromise) return loadPromise;
    const fetchJson = options && typeof options.fetchJson === "function" ? options.fetchJson : defaultFetchJson;
    let loadJson = f => fetchJson(f.file + (f.version ? "?v=" + f.version : ""));
    // a language pack (17.11.2026): its texts are merged into the cards by id; EN / RU load exactly as before
    if (T()?.needsPack?.()) {
      const plain = loadJson;
      loadJson = f => plain(f).then(list => T().mergeById(list, "worterbuch/" + f.file));
    }
    loadPromise = Promise.all(FILES.map(f => f.optional ? loadJson(f).catch(() => []) : loadJson(f)))
      .then(lists => {
        if (!lists.every((list, i) => FILES[i].optional || Array.isArray(list))) throw new Error("Invalid dictionary database");
        const cards = {};
        lists.forEach((list, i) => {
          const { file, type } = FILES[i];
          cards[file] = (Array.isArray(list) ? list : []).filter(item => item && typeof (type === "verb" ? item.infinitive : item.word) === "string")
            .map(item => type === "verb" ? { ...item, word: item.infinitive, type } : { ...item, type: type || item.type });
        });
        // Wörterbuch quality A4 (user 27.10.2026): a card with `worterbuch_hidden: true` is for the book reader only — not shown here.
        // the order of the cards as always: nouns, verbs, adjectives, adverbs, adjective-adverbs, conjunctions, pronouns, expressions
        entries = ORDER.flatMap(file => cards[file]).filter(item => item.worterbuch_hidden !== true);
        cardsById = new Map(entries.map(item => [item.id, item]));
        // A7: the expressions of a word («Ausdrücke» on its card) — every expression lists its words in related_ids.
        expressionsByCard = new Map();
        for (const item of entries) {
          if (item.type !== "expression") continue;
          for (const id of item.related_ids || []) {
            if (!expressionsByCard.has(id)) expressionsByCard.set(id, []);
            expressionsByCard.get(id).push(item);
          }
        }
        return entries;
      })
      .catch(error => {
        if (root.console) root.console.error("Deutsch Wörterbuch:", error);
        loadPromise = null;
        return null;
      });
    return loadPromise;
  }

  function findMatches(query) {
    const needle = normalized(query);
    if (!needle || !entries) return [];
    const rankOf = (text, exact) => exact ? 0 : text.startsWith(needle) ? 1 : text.includes(needle) ? 2 : -1;
    const matches = entries
      .map(item => {
        const keys = searchKeys(item);
        let rank = rankOf(keys.word, keys.word === needle || keys.forms.includes(needle));
        // A6: a search form also counts by its beginning or a part, a half step after the same kind of headword match
        // (sich Sorgen → «sich (Dativ) Sorgen machen» via its form «sich Sorgen machen»).
        if (needle.length >= 3) for (const form of keys.forms) {
          const formRank = rankOf(form, false);
          if (formRank >= 0 && (rank < 0 || formRank + 0.5 < rank)) rank = formRank + 0.5;
        }
        // 18.11.2026: the meanings — a whole meaning right after the German word and its beginning (pies → Hund before
        // aufspießen), the beginning of a meaning or of a word in it last (from 3 letters).
        const q = meaningKey(query);
        if (keys.meanings.includes(q)) { if (rank < 0 || rank > 1.75) rank = 1.75; }
        else if (rank < 0 && q.length >= 3 && keys.meanings.some(m => m.startsWith(q) || m.includes(" " + q))) rank = 4;
        const sichName = keys.sich;
        const sichRank = sichName ? rankOf(sichName, sichName === needle) : -1;
        // A1: the «sich X» line wins when it matches better than the bare verb (sich dreh… → «sich drehen — вращаться»).
        if (sichRank >= 0 && (rank < 0 || sichRank < rank)) return { item: { ...item, reflexiveHit: true }, rank: sichRank, key: reflexiveName(item) };
        return { item, rank, key: item.word };
      })
      .filter(match => match.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key, "de") || (a.item.type === "noun" ? -1 : 1));
    return matches.map(match => match.item);
  }

  function decide(query) {
    if (!String(query || "").trim()) return { kind: "empty" };
    if (!entries) return { kind: "loading" };
    const matches = findMatches(query);
    const exact = matches.filter(item => isExactMatch(item, query));
    if (exact.length === 1) return { kind: "entry", card: exact[0] };
    if (matches.length) return { kind: "list", matches };
    return { kind: "none" };
  }

  function submit(query) {
    const matches = findMatches(query);
    const exact = matches.filter(item => isExactMatch(item, query));
    if (exact.length === 1) return { kind: "entry", card: exact[0] };
    if (matches.length === 1) return { kind: "entry", card: matches[0] };
    return decide(query);
  }

  function back(query) {
    const matches = findMatches(query);
    return matches.length ? { kind: "list", matches } : decide(query);
  }

  function list(matches) {
    const rows = matches.slice(0, MAX_ROWS).map(item => item.reflexiveHit
      ? { word: reflexiveName(item), translation: translatedField(item.reflexive, "translation"), card: item }
      : { word: (item.article ? item.article + " " : "") + item.word, translation: translatedField(item, "translation"), card: item });
    const more = Math.max(0, matches.length - MAX_ROWS);
    return { rows, more, moreText: more ? TEXT.more(more) : "" };
  }

  function typeLabel(item) {
    return item.parts_of_speech?.join(" / ") || TYPE_LABEL[item.type] || "";
  }

  // A row that opens another card: its headword (with the article) and its translation.
  function cardRow(kind, card) {
    return { kind, word: (card.article ? card.article + " " : "") + card.word, translation: translatedField(card, "translation"), card };
  }

  // «Ausdrücke» — the expressions with this word (their related_ids), each opens its card.
  function expressionsOf(item) {
    return item.type === "expression" ? [] : (expressionsByCard.get(item.id) || []).slice().sort((a, b) => a.word.localeCompare(b.word, "de"));
  }

  function expressionsSection(item) {
    const found = expressionsOf(item);
    if (!found.length) return null;
    return { kind: "section", type: "expressions", label: "Ausdrücke", lines: found.map(expression => cardRow("expression", expression)) };
  }

  // see_also: [{ id, text? }] → the links that are shown: { card, text } (text "" when none); the card itself and cards
  // not shown in the Wörterbuch (unknown id, worterbuch_hidden) are left out.
  function seeAlsoLinks(item, lang) {
    const seen = new Set();
    return (item.see_also || []).flatMap(link => {
      const card = link && link.id !== item.id && !seen.has(link.id) ? cardsById.get(link.id) : null;
      if (!card) return [];
      seen.add(link.id);
      return [{ card, text: String(link.text || ""), ...linkAtFor(item, link, lang) }];
    });
  }

  // The number of the place and the field of a link for the language: RU / EN — at[lang] and field of the link; a pack
  // language — at and field of the pack's own entry with the same id (see_also_<lang>: [{ id, at, field? }], merged in
  // with the pack), its field replacing the link's. No number → undefined (then only a single place is a link).
  function linkAtFor(item, link, lang) {
    const own = Array.isArray(item["see_also_" + lang]) ? item["see_also_" + lang].find(entry => entry && entry.id === link.id) : null;
    if (own) return { at: own.at, field: own.field || link.field || "" };
    return { at: link.at ? link.at[lang] : undefined, field: link.field || "" };
  }

  // The places of `text` in one note, word for word: a plain search, left to right, without overlaps (the next search
  // starts at the end of the last place; a place inside a longer word counts too) → [{ note, start, end }].
  function placesIn(note, text) {
    const places = [];
    for (let at = note.text.indexOf(text); at >= 0; at = note.text.indexOf(text, at + text.length)) places.push({ note, start: at, end: at + text.length });
    return places;
  }

  // The place that becomes the link, or null (then the card is in «Siehe auch»). The field: link.field, or else the only
  // note field of the shown language that holds text. In it: with link.at that place (1 = the first), without it the only
  // place.
  function linkPlace(link, notes) {
    if (!link.text) return null;
    const fields = notes.filter(entry => link.field ? entry.field === link.field : entry.note.text.includes(link.text));
    if (fields.length !== 1) return null;
    const places = placesIn(fields[0].note, link.text);
    if (link.at !== undefined) return places[link.at - 1] || null;
    return places.length === 1 ? places[0] : null;
  }

  // A note and the places of the links in it → its parts: plain text and { text, card }. Where two places overlap the
  // longer one wins.
  function linkedParts(note, places, used) {
    const parts = [];
    let at = 0;
    for (const place of places.slice().sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (place.start < at) continue;
      if (place.start > at) parts.push({ text: note.text.slice(at, place.start) });
      parts.push({ text: note.text.slice(place.start, place.end), card: place.card });
      used.add(place.card);
      at = place.end;
    }
    if (at < note.text.length) parts.push({ text: note.text.slice(at) });
    return parts;
  }

  // see_also: the link's place in the card's notes (in the shown language; linkPlace) becomes a link part of that note;
  // the other linked cards (no text, no such place) are rows of «Siehe auch» at the end. A card already among «Ausdrücke»
  // is not repeated.
  function linkSeeAlso(item, blocks, notes) {
    const lang = T()?.getDisplayLang?.() || language();
    const links = seeAlsoLinks(item, lang);
    if (!links.length) return;
    const used = new Set(expressionsOf(item));
    const placesByNote = new Map();
    for (const link of links) {
      const place = linkPlace(link, notes);
      if (!place) continue;
      if (!placesByNote.has(place.note)) placesByNote.set(place.note, []);
      placesByNote.get(place.note).push({ ...place, card: link.card });
    }
    for (const [note, places] of placesByNote) note.parts = linkedParts(note, places, used);
    const rest = links.map(link => link.card).filter(card => !used.has(card));
    if (rest.length) blocks.push({ kind: "section", type: "seeAlso", label: "Siehe auch", lines: rest.map(card => cardRow("cardLink", card)) });
  }

  // «Kasus» of a preposition: each pattern of government in the order of the data — the pattern in bold (its place
  // before / after the noun is in the pattern itself: wegen + Genitiv, Akkusativ + entlang) with its status mark, its
  // note, its German example; at the end the note on the contracted forms (forms_note: zum = zu dem).
  function governmentSection(item, cardNote) {
    if (!item.government?.length) return null;
    const lines = [];
    for (const g of item.government) {
      const parts = [{ text: g.pattern, bold: true }];
      if (GOVERNMENT_STATUS[g.status]) parts.push({ text: " · " + GOVERNMENT_STATUS[g.status], bold: false });
      lines.push({ kind: "pattern", parts });
      const note = translatedField(g, "note");
      if (note) lines.push({ kind: "complementNote", text: note });
      if (g.example_de) lines.push({ kind: "governmentExample", text: g.example_de });
    }
    const formsNote = translatedField(item, "forms_note");
    if (formsNote) lines.push(cardNote(formsNote, "forms_note"));
    return { kind: "section", type: "government", label: "Kasus", lines };
  }

  function hintsSection(item, cardNote) {
    const lines = noteLines(item);
    if (!Array.isArray(lines) || !lines.length) return null;
    return { kind: "section", type: "hints", label: "Hinweise", lines: lines.map((text, i) => cardNote(text, "notes." + i)) };
  }

  function entry(item) {
    const blocks = [];
    const push = block => { if (block) blocks.push(block); };
    // the card's notes that can hold a link of see_also, with the name of their field: usage_note, plural_note, forms_note,
    // notes.<i>, reflexive.note (not the notes of a complement, the declension or the imperative)
    const cardNotes = [];
    const cardNote = (text, field) => { const note = { kind: "note", text }; cardNotes.push({ note, field }); return note; };

    if (item.type === "verb") {
      if (item.perfect_form) push({ kind: "detail", text: "Perfekt: " + item.perfect_form });
    }

    if (["adjective", "adverb"].includes(item.type) && (item.comparative || item.superlative)) {
      const forms = [item.comparative, item.superlative].filter(Boolean);
      push({ kind: "detail", text: "Steigerung: " + forms.join(" · ") });
    }

    if (item.type === "noun" && item.plural) {
      // Plural forms are stored without the article; every form is shown with „die“.
      // No plural („—“) → „ohne Plural“; plural-only nouns (plural_only) → „nur im Plural“.
      const text = item.plural_only
        ? "nur im Plural"
        : item.plural.trim() === "—"
          ? "ohne Plural"
          : "Plural: " + item.plural.split(/\s*,\s*/).map(form => "die " + form).join(", ");
      push({ kind: "detail", text });
    }
    const pluralNote = translatedField(item, "plural_note");
    if (pluralNote) push(cardNote(pluralNote, "plural_note"));
    const usageNote = translatedField(item, "usage_note");
    // Cards with a word-order rule (conjunctions, linking adverbs): translation → „Wortstellung“ (rule, pattern) → „Beispiel“ → „Hinweise“.
    const hasWordOrder = Boolean(item.word_order_rule || item.word_order_pattern);
    const noteAfterTranslation = ["adverb", "conjunction", "pronoun"].includes(item.type);
    // Wörterbuch quality A2 (user 26.10.2026): the note of a verb, noun, adjective, preposition or particle stands right under its translation (and the
    // «sich X» line), as WOERTERBUCH_VERBS asks; the Plural line and its plural note stay above the translation.
    const noteUnderTranslation = ["verb", "noun", "adjective", "preposition", "particle"].includes(item.type);
    if (usageNote && !noteAfterTranslation && !noteUnderTranslation) push(cardNote(usageNote, "usage_note"));

    push({ kind: "translation", text: translatedField(item, "translation") });
    // G70 step 2 (WN reflexive batch, user 24.10.2026): the field `reflexive` — the meaning of the verb with an accusative sich — is a line
    // under the main translation: «sich X — …». Its example and note follow the main example in their own section (A3, below).
    const reflexive = item.type === "verb" && item.reflexive && item.reflexive.worterbuch_hidden !== true
      ? translatedField(item.reflexive, "translation") : "";
    if (reflexive) push({ kind: "reflexive", sich: "sich " + item.word, text: reflexive });
    if (usageNote && noteUnderTranslation) push(cardNote(usageNote, "usage_note"));
    if (hasWordOrder) {
      const lines = [];
      // A line break („\n“) in the rule or pattern starts a new line (je … / desto …).
      String(item.word_order_rule || "").split("\n").filter(Boolean).forEach(text => lines.push({ kind: "detail", text }));
      String(item.word_order_pattern || "").split("\n").filter(Boolean).forEach(line => {
        // „**Verb**“ in the pattern is shown in bold.
        const parts = [];
        line.split(/\*\*(.+?)\*\*/).forEach((part, index) => { if (part) parts.push({ text: part, bold: index % 2 === 1 }); });
        lines.push({ kind: "pattern", parts });
      });
      push({ kind: "section", type: "wordOrder", label: item.parts_of_speech?.includes("Adjektiv") ? "Wortstellung · Adverbial" : "Wortstellung", lines });
      const orderExample = [{ kind: "example", text: item.example_de || "" }];
      const orderExampleTranslation = translatedField(item, "example");
      if (orderExampleTranslation) orderExample.push({ kind: "exampleTranslation", text: orderExampleTranslation });
      push({ kind: "section", type: "example", label: item.example_usage ? "Beispiel · " + item.example_usage : "Beispiel", lines: orderExample });
      push(hintsSection(item, cardNote));
    }
    if (usageNote && noteAfterTranslation && item.type !== "pronoun") push(cardNote(usageNote, "usage_note"));

    if (item.type === "pronoun") {
      (item.forms || []).forEach(group => {
        const label = group.label || "Deklination";
        push({ kind: "section", type: "pronounForms", label, lines: [{
          kind: "table", corner: "Kasus", columns: group.columns.slice(), scroll: true, label,
          rows: Object.entries(group.rows).map(([head, values]) => ({ head, cells: values.slice() }))
        }] });
      });
      const formsNote = translatedField(item, "forms_note");
      if (formsNote) push(cardNote(formsNote, "forms_note"));
      if (usageNote) push(cardNote(usageNote, "usage_note"));
    }

    const declensionNote = translatedField(item, "declension_note");
    if (item.type === "noun" && (item.declension_forms || declensionNote)) {
      const lines = [];
      if (item.declension_forms) lines.push({ kind: "detail", text: item.declension_forms });
      if (declensionNote) lines.push({ kind: "note", text: declensionNote });
      push({ kind: "section", type: "declension", label: "Deklination", lines });
    }

    if (item.type === "preposition") push(governmentSection(item, cardNote));

    if (item.type === "verb" && item.complements?.length) {
      const lines = [];
      item.complements.forEach(complement => {
        lines.push({ kind: "complement", text: complement.pattern || "" });
        const note = translatedField(complement, "note");
        if (note) lines.push({ kind: "complementNote", text: note });
      });
      push({ kind: "section", type: "complements", label: "Ergänzungen", lines });
    }

    const exampleLines = [{ kind: "example", text: item.example_de || "" }];
    const exampleTranslation = translatedField(item, "example");
    if (exampleTranslation) exampleLines.push({ kind: "exampleTranslation", text: exampleTranslation });
    const example = { kind: "section", type: "example", label: item.example_usage ? "Beispiel · " + item.example_usage : "Beispiel", lines: exampleLines };
    if (item.type === "verb") push(example);
    // Wörterbuch quality A3 (user 26.10.2026): the example and note of the «sich X» line — a section of its own after the main example,
    // labelled «Beispiel · sich X» (or «sich X» when there is only a note), so it no longer reads as the main example.
    if (reflexive) {
      const reflexiveNote = translatedField(item.reflexive, "note");
      if (item.reflexive.example_de || reflexiveNote) {
        const lines = [];
        if (item.reflexive.example_de) {
          lines.push({ kind: "reflexiveExample", text: item.reflexive.example_de });
          const reflexiveExample = translatedField(item.reflexive, "example");
          if (reflexiveExample) lines.push({ kind: "exampleTranslation", text: reflexiveExample });
        }
        if (reflexiveNote) lines.push(cardNote(reflexiveNote, "reflexive.note"));
        push({ kind: "section", type: "reflexive", label: (item.reflexive.example_de ? "Beispiel · " : "") + "sich " + item.word, lines });
      }
    }

    if (item.type === "verb" && item.forms) {
      const forms = item.forms;
      const konjunktivII = forms["Konjunktiv II"];
      const hasSpecialKonjunktivII = konjunktivII && Object.values(konjunktivII).some(value => String(value || "").trim());
      const columns = [
        ...(forms["Präsens"] && !item.generated_forms?.includes("Präsens") ? [["Präsens", forms["Präsens"]]] : []),
        ...(forms["Präteritum"] ? [["Präteritum", forms["Präteritum"]]] : []),
        ...(hasSpecialKonjunktivII ? [["Konjunktiv II", konjunktivII]] : [])
      ];
      if (columns.length) {
        const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie"];
        push({ kind: "section", type: "verbForms", label: "Formen", lines: [{
          kind: "table", corner: "", columns: columns.map(([label]) => label), scroll: false, label: "",
          rows: persons.map(key => ({ head: key === "sie" ? "sie/Sie" : key, cells: columns.map(([, personForms]) => personForms?.[key] || "") }))
        }] });
      }
    }

    const imperative = item.forms?.Imperativ;
    if (imperative && Object.values(imperative).some(value => String(value || "").trim())) {
      const parts = [];
      [["du", "du"], ["ihr", "ihr"], ["Sie", "Sie"]].forEach(([key, label]) => {
        const form = String(imperative[key] || "").trim();
        if (form) parts.push({ person: label, form });
      });
      const lines = [{ kind: "imperative", parts }];
      const imperativeNote = translatedField(item, "imperative_note");
      if (imperativeNote) lines.push({ kind: "note", text: imperativeNote });
      push({ kind: "section", type: "imperative", label: "Imperativ", lines });
    }

    if (item.type !== "verb" && !hasWordOrder) push(example);
    // E1: an expression card — translation, example, then its notes («Hinweise», one line each); the type line «Ausdruck»
    // (TYPE_LABEL); no Wortschatz button (wortschatz_excluded, user 22.10).
    if (item.type === "expression") push(hintsSection(item, cardNote));
    for (const extra of item.additional_examples || []) {
      push({ kind: "section", type: "example", label: "Beispiel · " + (extra.example_usage || ""), lines: [
        { kind: "example", text: extra.example_de },
        { kind: "exampleTranslation", text: translatedField(extra, "example") }
      ] });
    }
    // the card's own parts end here; the sections of other cards («Ausdrücke», «Siehe auch») follow
    const ownEnd = blocks.length;
    push(expressionsSection(item));
    linkSeeAlso(item, blocks, cardNotes);
    return {
      pos: typeLabel(item),
      headword: (item.article ? item.article + " " : "") + item.word,
      blocks,
      // the button speaks German, like the rest of the window; it stands at addToWortschatzAt — before the sections of
      // other cards, so it reads as the button of this word
      addToWortschatz: item.wortschatz_excluded !== true,
      addToWortschatzAt: ownEnd
    };
  }

  root.WorterbuchModel = Object.freeze({
    FILES, TYPE_LABEL, MAX_ROWS, TEXT,
    load, loaded: () => Boolean(entries), loading: () => Boolean(loadPromise) && !entries, entries: () => entries,
    normalized, meaningKey, reflexiveName, searchKeys, findMatches, isExactMatch,
    decide, submit, back, list, typeLabel, entry
  });
})(typeof window !== "undefined" ? window : globalThis);
