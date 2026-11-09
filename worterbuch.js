/* Home · Wörterbuch lookup (data: ./worterbuch/german-*.json) */
(function initHomeWorterbuch() {
  const input = document.getElementById("dictionarySearchInput");
  const form = document.getElementById("dictionarySearchForm");
  const results = document.getElementById("dictionaryResults");
  const clear = document.getElementById("dictionarySearchClear");
  const intro = document.getElementById("dictionaryIntro");
  const entryBackbar = document.getElementById("dictionaryEntryBackbar");
  const entryType = document.getElementById("dictionaryEntryType");
  const backButton = document.getElementById("dictionaryBack");
  const open = document.getElementById("dictionaryOpen");
  if (!input || !form || !results || !open) return;

  const TYPE_LABEL = { noun: "Nomen", verb: "Verb", adjective: "Adjektiv", adverb: "Adverb", conjunction: "Konjunktion", pronoun: "Pronomen", expression: "Ausdruck" };
  let entries = null;
  let expressionsByCard = new Map();
  let loadPromise = null;
  let selected = null;

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = value;
    return element;
  }

  function language() {
    return window.DeutschTranslation ? window.DeutschTranslation.getLang() : "en";
  }

  function translated(ru, en) {
    const selectedText = language() === "ru" ? ru : en;
    return selectedText || ru || en || "";
  }

  // Wörterbuch quality A5 (user 27.10.2026): search compares one spelling — typographic apostrophes (’ ‘ ʼ ´ `, iPhone keyboard)
  // count as ', ß as ss (sei’s drum → sei's drum, Massnahmen → Maßnahmen).
  function normalized(value) {
    return String(value || "").trim().normalize("NFC").toLocaleLowerCase("de-DE").replace(/[’‘ʼ´`]/g, "'").replace(/ß/g, "ss");
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
    if (item.searchKeys) return item.searchKeys;
    const word = normalized(item.word);
    const forms = new Set((item.search_forms || []).map(normalized));
    const raw = String(item.word);
    if (raw.includes("(")) {
      forms.add(normalized(raw.replace(/\s*\([^)]*\)/g, "")));
      forms.add(normalized(raw.replace(/[()]/g, "")));
    }
    forms.delete(word);
    item.searchKeys = { word, forms: [...forms], sich: normalized(reflexiveName(item)) };
    return item.searchKeys;
  }

  function isExactMatch(item, query) {
    const needle = normalized(query);
    const keys = searchKeys(item);
    return keys.word === needle || keys.forms.includes(needle) || Boolean(keys.sich && keys.sich === needle);
  }

  function loadDatabase() {
    if (entries) return Promise.resolve(entries);
    if (loadPromise) return loadPromise;
    results.replaceChildren(node("p", "dictionary-hint", "Wörter werden geladen …"));
    const loadJson = path => fetch(path).then(response => {
      if (!response.ok) throw new Error(path + " HTTP " + response.status);
      return response.json();
    });
    loadPromise = Promise.all([
      loadJson("worterbuch/german-nouns.json?v=20261109-wn-kunde61-2"),
      loadJson("worterbuch/german-verbs.json?v=20261108-wn-montage58-1"),
      loadJson("worterbuch/german-adjectives.json?v=20261109-wn-meanings60-1"),
      loadJson("worterbuch/german-adverbs.json?v=20261109-wn-lange59-1"),
      loadJson("worterbuch/german-conjunctions.json?v=20261031-wn-doch24-4"),
      loadJson("worterbuch/german-pronouns.json?v=20261107-wn-weniger56-1"),
      loadJson("worterbuch/german-adjective-adverbs.json?v=20261107-wn-meist35-1"),
      // E1 (22.10.2026, user): expression cards (vor sich hin) are shown here too; a missing file is no expressions.
      loadJson("worterbuch/german-expressions.json?v=20261106-wn-expr46-2").catch(() => [])
    ]).then(([nouns, verbs, adjectives, adverbs, conjunctions, pronouns, adjectiveAdverbs, expressions]) => {
      if (![nouns, verbs, adjectives, adverbs, conjunctions, pronouns, adjectiveAdverbs].every(Array.isArray)) throw new Error("Invalid dictionary database");
      entries = [
        ...nouns.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "noun" })),
        ...verbs.filter(item => item && typeof item.infinitive === "string").map(item => ({ ...item, word: item.infinitive, type: "verb" })),
        ...adjectives.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "adjective" })),
        ...adverbs.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "adverb" })),
        ...adjectiveAdverbs.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "adjective" })),
        ...conjunctions.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "conjunction" })),
        ...pronouns.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "pronoun" })),
        ...(Array.isArray(expressions) ? expressions : []).filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "expression" }))
      // Wörterbuch quality A4 (user 27.10.2026): a card with `worterbuch_hidden: true` is for the book reader only — not shown here.
      ].filter(item => item.worterbuch_hidden !== true);
      // A7: the expressions of a word («Ausdrücke» on its card) — every expression lists its words in related_ids.
      expressionsByCard = new Map();
      for (const item of entries) {
        if (item.type !== "expression") continue;
        for (const id of item.related_ids || []) {
          if (!expressionsByCard.has(id)) expressionsByCard.set(id, []);
          expressionsByCard.get(id).push(item);
        }
      }
      render();
      return entries;
    })
      .catch(error => {
        console.error("Deutsch Wörterbuch:", error);
        loadPromise = null;
        results.replaceChildren(node("p", "dictionary-hint", "Die Wörterliste konnte nicht geladen werden."));
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

  // Wörterbuch quality A7 (user 27.10.2026): «Ausdrücke» — expressions with this word (their related_ids), each opens its card.
  function appendExpressions(entry, item) {
    const list = item.type === "expression" ? [] : (expressionsByCard.get(item.id) || []).slice().sort((a, b) => a.word.localeCompare(b.word, "de"));
    if (!list.length) return;
    const section = node("section", "dictionary-entry-section dictionary-entry-expressions");
    section.append(node("h4", "dictionary-entry-label", "Ausdrücke"));
    list.forEach(expression => {
      const button = node("button", "dictionary-match dictionary-entry-expression");
      button.type = "button";
      button.append(node("span", "dictionary-match-word", expression.word));
      button.append(node("span", "dictionary-match-translation", translated(expression.translation_ru, expression.translation_en)));
      button.addEventListener("click", event => {
        event.preventDefault();
        selected = expression;
        render();
        results.scrollIntoView?.({ block: "start" });
      });
      section.append(button);
    });
    entry.append(section);
  }

  function makeEntry(item) {
    const entry = node("article", "dictionary-entry");
    // 06.11 (Alena, variant B): the part of speech is a label above the word, like BEISPIEL (was small on the right
    // of the „‹ Zurück zur Suche“ row; home.css hides that one when this label is there)
    const pos = item.parts_of_speech?.join(" / ") || TYPE_LABEL[item.type] || "";
    if (pos) entry.append(node("p", "dictionary-entry-pos", pos));
    entry.append(node("h3", "dictionary-entry-headword", (item.article ? item.article + " " : "") + item.word));

    if (item.type === "verb") {
      if (item.perfect_form) entry.append(node("p", "dictionary-entry-plural dictionary-entry-detail", "Perfekt: " + item.perfect_form));
    }

    if (["adjective", "adverb"].includes(item.type) && (item.comparative || item.superlative)) {
      const forms = [item.comparative, item.superlative].filter(Boolean);
      entry.append(node("p", "dictionary-entry-plural dictionary-entry-detail", "Steigerung: " + forms.join(" · ")));
    }

    if (item.type === "noun" && item.plural) {
      // Plural forms are stored without the article; every form is shown with „die“.
      // No plural („—“) → „ohne Plural“; plural-only nouns (plural_only) → „nur im Plural“.
      const text = item.plural_only
        ? "nur im Plural"
        : item.plural.trim() === "—"
          ? "ohne Plural"
          : "Plural: " + item.plural.split(/\s*,\s*/).map(form => "die " + form).join(", ");
      entry.append(node("p", "dictionary-entry-plural dictionary-entry-detail", text));
    }
    const pluralNote = translated(item.plural_note_ru, item.plural_note_en);
    if (pluralNote) entry.append(node("p", "dictionary-entry-note", pluralNote));
    const usageNote = translated(item.usage_note_ru, item.usage_note_en);
    // Cards with a word-order rule (conjunctions, linking adverbs): translation → „Wortstellung“ (rule, pattern) → „Beispiel“ → „Hinweise“.
    const hasWordOrder = Boolean(item.word_order_rule || item.word_order_pattern);
    const noteAfterTranslation = ["adverb", "conjunction", "pronoun"].includes(item.type);
    // Wörterbuch quality A2 (user 26.10.2026): the note of a verb, noun or adjective stands right under its translation (and the
    // «sich X» line), as WOERTERBUCH_VERBS asks; the Plural line and its plural note stay above the translation.
    const noteUnderTranslation = ["verb", "noun", "adjective"].includes(item.type);
    if (usageNote && !noteAfterTranslation && !noteUnderTranslation) entry.append(node("p", "dictionary-entry-note", usageNote));

    entry.append(node("p", "dictionary-entry-translation", translated(item.translation_ru, item.translation_en)));
    // G70 step 2 (WN reflexive batch, user 24.10.2026): the field `reflexive` — the meaning of the verb with an accusative sich — is a line
    // under the main translation: «sich X — …». Its example and note follow the main example in their own section (A3, below).
    const reflexive = item.type === "verb" && item.reflexive && item.reflexive.worterbuch_hidden !== true
      ? translated(item.reflexive.translation_ru, item.reflexive.translation_en) : "";
    if (reflexive) {
      const line = node("p", "dictionary-entry-translation dictionary-entry-reflexive");
      line.append(node("strong", "", "sich " + item.word), document.createTextNode(" — " + reflexive));
      entry.append(line);
    }
    if (usageNote && noteUnderTranslation) entry.append(node("p", "dictionary-entry-note", usageNote));
    if (hasWordOrder) {
      const section = node("section", "dictionary-entry-section dictionary-word-order");
      section.append(node("h4", "dictionary-entry-label", item.parts_of_speech?.includes("Adjektiv") ? "Wortstellung · Adverbial" : "Wortstellung"));
      // A line break („\n“) in the rule or pattern starts a new line (je … / desto …).
      String(item.word_order_rule || "").split("\n").filter(Boolean).forEach(line =>
        section.append(node("p", "dictionary-entry-plural dictionary-entry-detail", line)));
      String(item.word_order_pattern || "").split("\n").filter(Boolean).forEach(line => {
        // „**Verb**“ in the pattern is shown in bold.
        const pattern = node("p", "dictionary-entry-plural dictionary-entry-detail dictionary-word-order-pattern");
        line.split(/\*\*(.+?)\*\*/).forEach((part, index) => {
          if (part) pattern.append(index % 2 ? node("strong", "", part) : document.createTextNode(part));
        });
        section.append(pattern);
      });
      entry.append(section);
      const orderExample = node("section", "dictionary-entry-section");
      orderExample.append(node("h4", "dictionary-entry-label", item.example_usage ? "Beispiel · " + item.example_usage : "Beispiel"));
      orderExample.append(node("p", "dictionary-entry-example", item.example_de || ""));
      const orderExampleTranslation = translated(item.example_ru, item.example_en);
      if (orderExampleTranslation) orderExample.append(node("p", "dictionary-entry-example-translation", orderExampleTranslation));
      entry.append(orderExample);
      const lines = language() === "ru" ? (item.notes_ru || item.notes_en) : (item.notes_en || item.notes_ru);
      if (Array.isArray(lines) && lines.length) {
        const notes = node("section", "dictionary-entry-section dictionary-entry-hints");
        notes.append(node("h4", "dictionary-entry-label", "Hinweise"));
        lines.forEach(line => notes.append(node("p", "dictionary-entry-note", line)));
        entry.append(notes);
      }
    }
    if (usageNote && noteAfterTranslation && item.type !== "pronoun") entry.append(node("p", "dictionary-entry-note", usageNote));

    if (item.type === "pronoun") {
      (item.forms || []).forEach(group => {
        const section = node("section", "dictionary-entry-section dictionary-pronoun-forms");
        section.append(node("h4", "dictionary-entry-label", group.label || "Deklination"));
        const scroll = node("div", "dictionary-pronoun-table-scroll");
        scroll.tabIndex = 0;
        scroll.setAttribute("role", "region");
        scroll.setAttribute("aria-label", group.label || "Deklination");
        const table = node("table", "dictionary-forms-table");
        const thead = node("thead");
        const header = node("tr");
        const corner = node("th", "dictionary-forms-person", "Kasus");
        corner.scope = "col";
        header.append(corner);
        group.columns.forEach(label => {
          const cell = node("th", "", label);
          cell.scope = "col";
          header.append(cell);
        });
        thead.append(header);
        const tbody = node("tbody");
        Object.entries(group.rows).forEach(([label, values]) => {
          const row = node("tr");
          const heading = node("th", "dictionary-forms-person", label);
          heading.scope = "row";
          row.append(heading);
          values.forEach(value => row.append(node("td", "", value)));
          tbody.append(row);
        });
        table.append(thead, tbody);
        scroll.append(table);
        section.append(scroll);
        entry.append(section);
      });
      const formsNote = translated(item.forms_note_ru, item.forms_note_en);
      if (formsNote) entry.append(node("p", "dictionary-entry-note", formsNote));
      if (usageNote) entry.append(node("p", "dictionary-entry-note", usageNote));
    }

    const declensionNote = translated(item.declension_note_ru, item.declension_note_en);
    if (item.type === "noun" && (item.declension_forms || declensionNote)) {
      const section = node("section", "dictionary-entry-section dictionary-noun-declension");
      section.append(node("h4", "dictionary-entry-label", "Deklination"));
      if (item.declension_forms) section.append(node("p", "dictionary-entry-plural dictionary-entry-detail", item.declension_forms));
      if (declensionNote) section.append(node("p", "dictionary-entry-note", declensionNote));
      entry.append(section);
    }

    if (item.type === "verb" && item.complements?.length) {
      const section = node("section", "dictionary-entry-section dictionary-verb-complements");
      section.append(node("h4", "dictionary-entry-label", "Ergänzungen"));
      item.complements.forEach(complement => {
        const line = node("p", "dictionary-entry-detail");
        line.append(node("strong", "", complement.pattern || ""));
        section.append(line);
        const note = translated(complement.note_ru, complement.note_en);
        if (note) section.append(node("p", "dictionary-entry-example-translation dictionary-verb-complement-note", note));
      });
      entry.append(section);
    }

    const example = node("section", "dictionary-entry-section");
    example.append(node("h4", "dictionary-entry-label", item.example_usage ? "Beispiel · " + item.example_usage : "Beispiel"));
    example.append(node("p", "dictionary-entry-example", item.example_de || ""));
    const exampleTranslation = translated(item.example_ru, item.example_en);
    if (exampleTranslation) example.append(node("p", "dictionary-entry-example-translation", exampleTranslation));
    if (item.type === "verb") entry.append(example);
    // Wörterbuch quality A3 (user 26.10.2026): the example and note of the «sich X» line — a section of its own after the main example,
    // labelled «Beispiel · sich X» (or «sich X» when there is only a note), so it no longer reads as the main example.
    if (reflexive) {
      const reflexiveNote = translated(item.reflexive.note_ru, item.reflexive.note_en);
      if (item.reflexive.example_de || reflexiveNote) {
        const section = node("section", "dictionary-entry-section dictionary-entry-reflexive-section");
        section.append(node("h4", "dictionary-entry-label", (item.reflexive.example_de ? "Beispiel · " : "") + "sich " + item.word));
        if (item.reflexive.example_de) {
          section.append(node("p", "dictionary-entry-example dictionary-entry-reflexive-example", item.reflexive.example_de));
          const reflexiveExample = translated(item.reflexive.example_ru, item.reflexive.example_en);
          if (reflexiveExample) section.append(node("p", "dictionary-entry-example-translation", reflexiveExample));
        }
        if (reflexiveNote) section.append(node("p", "dictionary-entry-note", reflexiveNote));
        entry.append(section);
      }
    }

    if (item.type === "verb") appendExpressions(entry, item);
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
        const tableSection = node("section", "dictionary-entry-section dictionary-verb-forms");
        tableSection.append(node("h4", "dictionary-entry-label", "Formen"));
        const table = node("table", "dictionary-forms-table");
        const thead = node("thead");
        const header = node("tr");
        header.append(node("th", "dictionary-forms-person", ""));
        columns.forEach(([label]) => header.append(node("th", "", label)));
        thead.append(header);
        const tbody = node("tbody");
        const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie"];
        persons.forEach(key => {
          const row = node("tr");
          row.append(node("th", "dictionary-forms-person", key === "sie" ? "sie/Sie" : key));
          columns.forEach(([, personForms]) => row.append(node("td", "", personForms?.[key] || "")));
          tbody.append(row);
        });
        table.append(thead, tbody);
        tableSection.append(table);
        entry.append(tableSection);
      }
    }

    const imperative = item.forms?.Imperativ;
    if (imperative && Object.values(imperative).some(value => String(value || "").trim())) {
      const imperativeSection = node("section", "dictionary-entry-section dictionary-verb-imperative");
      imperativeSection.append(node("h4", "dictionary-entry-label", "Imperativ"));
      const formsLine = node("p", "dictionary-entry-plural");
      [["du", "du"], ["ihr", "ihr"], ["Sie", "Sie"]].forEach(([key, label]) => {
        const form = String(imperative[key] || "").trim();
        if (!form) return;
        if (formsLine.childNodes.length) formsLine.append(node("span", "dictionary-entry-imperative-separator", " · "));
        formsLine.append(node("span", "dictionary-entry-imperative-person", label + ": "));
        formsLine.append(node("span", "dictionary-entry-imperative-form", form));
      });
      imperativeSection.append(formsLine);
      const imperativeNote = translated(item.imperative_note_ru, item.imperative_note_en);
      if (imperativeNote) imperativeSection.append(node("p", "dictionary-entry-note", imperativeNote));
      entry.append(imperativeSection);
    }

    if (item.type !== "verb" && !hasWordOrder) entry.append(example);
    // E1: an expression card — translation, example, then its notes («Hinweise», one line each); the type line «Ausdruck»
    // (TYPE_LABEL); no Wortschatz button (wortschatz_excluded, user 22.10).
    if (item.type === "expression") {
      const lines = language() === "ru" ? (item.notes_ru || item.notes_en) : (item.notes_en || item.notes_ru);
      if (Array.isArray(lines) && lines.length) {
        const notes = node("section", "dictionary-entry-section dictionary-entry-hints");
        notes.append(node("h4", "dictionary-entry-label", "Hinweise"));
        lines.forEach(line => notes.append(node("p", "dictionary-entry-note", line)));
        entry.append(notes);
      }
    }
    for (const extra of item.additional_examples || []) {
      const section = node("section", "dictionary-entry-section");
      section.append(node("h4", "dictionary-entry-label", "Beispiel · " + (extra.example_usage || "")));
      section.append(node("p", "dictionary-entry-example", extra.example_de));
      section.append(node("p", "dictionary-entry-example-translation", translated(extra.example_ru, extra.example_en)));
      entry.append(section);
    }
    if (item.type !== "verb") appendExpressions(entry, item);
    if (item.wortschatz_excluded !== true) {
      // Wörterbuch quality (user 27.10.2026): the button speaks German, like the rest of the window.
      const addToWortschatz = node("button", "dictionary-add-wortschatz ui-quiet", "＋ Zum Wortschatz"); // the shared quiet wide button (06.11)
      addToWortschatz.type = "button";
      addToWortschatz.addEventListener("click", () => {
        if (typeof window.openWortschatzForDictionary === "function") window.openWortschatzForDictionary(item);
      });
      entry.append(addToWortschatz);
    }
    return entry;
  }

  function showMatches(matches) {
    if (entryBackbar) entryBackbar.hidden = true;
    const list = node("div", "dictionary-matches");
    matches.slice(0, 12).forEach(item => {
      const button = node("button", "dictionary-match");
      button.type = "button";
      if (item.reflexiveHit) {
        button.append(node("span", "dictionary-match-word", reflexiveName(item)));
        button.append(node("span", "dictionary-match-translation", translated(item.reflexive.translation_ru, item.reflexive.translation_en)));
      } else {
        button.append(node("span", "dictionary-match-word", (item.article ? item.article + " " : "") + item.word));
        button.append(node("span", "dictionary-match-translation", translated(item.translation_ru, item.translation_en)));
      }
      button.addEventListener("click", event => {
        event.preventDefault();
        input.blur();
        selected = item;
        render();
      });
      list.append(button);
    });
    results.replaceChildren(list);
    if (matches.length > 12) results.append(node("p", "dictionary-hint", "Weitere Treffer: " + (matches.length - 12)));
  }

  function render() {
    const query = input.value;
    if (clear) clear.hidden = !query;
    if (intro) {
      intro.hidden = Boolean(query.trim());
      intro.textContent = language() === "ru"
        ? "Немецкие слова: краткая грамматическая справка"
        : "Search German words for a brief grammar note";
    }
    if (selected) {
      if (entryBackbar) entryBackbar.hidden = false;
      if (entryType) entryType.textContent = selected.parts_of_speech?.join(" / ") || TYPE_LABEL[selected.type] || "";
      results.replaceChildren(makeEntry(selected));
      return;
    }
    if (entryBackbar) entryBackbar.hidden = true;
    if (entryType) entryType.textContent = "";
    selected = null;
    if (!query.trim()) {
      results.replaceChildren();
      return;
    }
    if (!entries) {
      loadDatabase();
      return;
    }
    const matches = findMatches(query);
    const exact = matches.filter(item => isExactMatch(item, query));
    if (exact.length === 1) {
      selected = exact[0];
      if (entryBackbar) entryBackbar.hidden = false;
      if (entryType) entryType.textContent = selected.parts_of_speech?.join(" / ") || TYPE_LABEL[selected.type] || "";
      results.replaceChildren(makeEntry(selected));
    } else if (matches.length) {
      showMatches(matches);
    } else {
      results.replaceChildren(node("p", "dictionary-hint", "Kein Wort gefunden."));
    }
  }

  input.addEventListener("input", () => {
    selected = null;
    render();
  });
  // Wide home (iPad landscape): tapping a non-focusable area around the inline
  // results may leave the native keyboard open. Any tap outside the search form
  // dismisses it. Phones keep their original behaviour.
  document.addEventListener("pointerdown", event => {
    if (!document.documentElement.classList.contains("home-wide-layout")) return;
    if (document.activeElement === input && !form.contains(event.target)) input.blur();
  }, true);
  backButton?.addEventListener("click", () => {
    selected = null;
    const matches = findMatches(input.value);
    if (matches.length) showMatches(matches);
    else render();
  });
  clear?.addEventListener("click", () => {
    input.value = "";
    selected = null;
    render();
    input.focus({ preventScroll: true });
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const matches = findMatches(input.value);
    const exact = matches.filter(item => isExactMatch(item, input.value));
    if (exact.length === 1) selected = exact[0];
    else if (matches.length === 1) selected = matches[0];
    render();
  });
  document.addEventListener("deutsch:translationlang", render);
  open.addEventListener("click", loadDatabase);
  render();
})();
