/* Home · Wörterbuch lookup (data: ./worterbuch/german-nouns.json, german-verbs.json) */
(function initHomeWorterbuch() {
  const input = document.getElementById("dictionarySearchInput");
  const form = document.getElementById("dictionarySearchForm");
  const results = document.getElementById("dictionaryResults");
  const clear = document.getElementById("dictionarySearchClear");
  const intro = document.getElementById("dictionaryIntro");
  const entryBackbar = document.getElementById("dictionaryEntryBackbar");
  const backButton = document.getElementById("dictionaryBack");
  const open = document.getElementById("dictionaryOpen");
  if (!input || !form || !results || !open) return;

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

  function loadDatabase() {
    if (entries) return Promise.resolve(entries);
    if (loadPromise) return loadPromise;
    results.replaceChildren(node("p", "dictionary-hint", "Wörter werden geladen …"));
    const loadJson = path => fetch(path).then(response => {
      if (!response.ok) throw new Error(path + " HTTP " + response.status);
      return response.json();
    });
    loadPromise = Promise.all([
      loadJson("worterbuch/german-nouns.json"),
      loadJson("worterbuch/german-verbs.json")
    ]).then(([nouns, verbs]) => {
      if (!Array.isArray(nouns) || !Array.isArray(verbs)) throw new Error("Invalid dictionary database");
      entries = [
        ...nouns.filter(item => item && typeof item.word === "string").map(item => ({ ...item, type: "noun" })),
        ...verbs.filter(item => item && typeof item.infinitive === "string").map(item => ({ ...item, word: item.infinitive, type: "verb" }))
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
        const rank = word === needle ? 0 : word.startsWith(needle) ? 1 : word.includes(needle) ? 2 : -1;
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

    if (item.plural) entry.append(node("p", "dictionary-entry-plural dictionary-entry-detail", "Plural: " + item.plural));
    const pluralNote = translated(item.plural_note_ru, item.plural_note_en);
    if (pluralNote) entry.append(node("p", "dictionary-entry-note", pluralNote));

    entry.append(node("p", "dictionary-entry-translation", translated(item.translation_ru, item.translation_en)));

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
        ...(forms["Präsens"] ? [["Präsens", forms["Präsens"]]] : []),
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

    if (item.type !== "verb") entry.append(example);
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
      results.replaceChildren(makeEntry(selected));
      return;
    }
    if (entryBackbar) entryBackbar.hidden = true;
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
    const exact = matches.filter(item => normalized(item.word) === normalized(query));
    if (exact.length === 1) {
      selected = exact[0];
      if (entryBackbar) entryBackbar.hidden = false;
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
    const exact = matches.filter(item => normalized(item.word) === normalized(input.value));
    if (exact.length === 1) selected = exact[0];
    else if (matches.length === 1) selected = matches[0];
    render();
  });
  document.addEventListener("deutsch:translationlang", render);
  open.addEventListener("click", loadDatabase);
  render();
})();
