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

  const TYPE_LABEL = { noun: "Nomen", verb: "Verb", adjective: "Adjektiv", adverb: "Adverb", conjunction: "Konjunktion", pronoun: "Pronomen" };
  let entries = null;
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

  function normalized(value) {
    return String(value || "").trim().normalize("NFC").toLocaleLowerCase("de-DE");
  }

  function isExactMatch(item, query) {
    const needle = normalized(query);
    return normalized(item.word) === needle
      || Boolean(item.search_forms?.some(form => normalized(form) === needle));
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
      loadJson("worterbuch/german-nouns.json?v=20261007-import-final-2"),
      loadJson("worterbuch/german-verbs.json?v=20261007-import-final-2"),
      loadJson("worterbuch/german-adjectives.json?v=20261007-import-final-2"),
      loadJson("worterbuch/german-adverbs.json?v=20261007-import-final-2"),
      loadJson("worterbuch/german-conjunctions.json?v=20261007-import-final-2"),
      loadJson("worterbuch/german-pronouns.json?v=20261007-import-final-2")
    ]).then(([nouns, verbs, adjectives, adverbs, conjunctions, pronouns]) => {
      if (![nouns, verbs, adjectives, adverbs, conjunctions, pronouns].every(Array.isArray)) throw new Error("Invalid dictionary database");
      entries = [
        ...nouns.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "noun" })),
        ...verbs.filter(item => item && typeof item.infinitive === "string").map(item => ({ ...item, word: item.infinitive, type: "verb" })),
        ...adjectives.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "adjective" })),
        ...adverbs.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "adverb" })),
        ...conjunctions.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "conjunction" })),
        ...pronouns.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "pronoun" }))
      ];
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
    const matches = entries
      .map(item => {
        const word = normalized(item.word);
        const rank = isExactMatch(item, needle) ? 0 : word.startsWith(needle) ? 1 : word.includes(needle) ? 2 : -1;
        return { item, rank };
      })
      .filter(match => match.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.item.word.localeCompare(b.item.word, "de") || (a.item.type === "noun" ? -1 : 1));
    return matches.map(match => match.item);
  }

  function makeEntry(item) {
    const entry = node("article", "dictionary-entry");
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
    if (usageNote && !noteAfterTranslation) entry.append(node("p", "dictionary-entry-note", usageNote));

    entry.append(node("p", "dictionary-entry-translation", translated(item.translation_ru, item.translation_en)));
    if (hasWordOrder) {
      const section = node("section", "dictionary-entry-section dictionary-word-order");
      section.append(node("h4", "dictionary-entry-label", "Wortstellung"));
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
      orderExample.append(node("h4", "dictionary-entry-label", "Beispiel"));
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
    example.append(node("h4", "dictionary-entry-label", "Beispiel"));
    example.append(node("p", "dictionary-entry-example", item.example_de || ""));
    const exampleTranslation = translated(item.example_ru, item.example_en);
    if (exampleTranslation) example.append(node("p", "dictionary-entry-example-translation", exampleTranslation));
    if (item.type === "verb") entry.append(example);

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
    if (item.wortschatz_excluded !== true) {
      const addToWortschatz = node("button", "dictionary-add-wortschatz", "＋ Add to Wortschatz");
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
      button.append(node("span", "dictionary-match-word", (item.article ? item.article + " " : "") + item.word));
      button.append(node("span", "dictionary-match-translation", translated(item.translation_ru, item.translation_en)));
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
      if (entryType) entryType.textContent = TYPE_LABEL[selected.type] || "";
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
      if (entryType) entryType.textContent = TYPE_LABEL[selected.type] || "";
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
