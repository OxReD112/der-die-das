/* Home · Wörterbuch noun lookup (data: ./worterbuch/german-nouns.json) */
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

  let nouns = null;
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
    if (nouns) return Promise.resolve(nouns);
    if (loadPromise) return loadPromise;
    results.replaceChildren(node("p", "dictionary-hint", "Wörter werden geladen …"));
    loadPromise = fetch("worterbuch/german-nouns.json")
      .then(response => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Invalid noun database");
        nouns = data.filter(item => item && typeof item.word === "string");
        render();
        return nouns;
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
    if (!needle || !nouns) return [];
    const matches = nouns
      .map(item => {
        const word = normalized(item.word);
        const rank = word === needle ? 0 : word.startsWith(needle) ? 1 : word.includes(needle) ? 2 : -1;
        return { item, rank };
      })
      .filter(match => match.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.item.word.localeCompare(b.item.word, "de"));
    return matches.map(match => match.item);
  }

  function makeEntry(item) {
    const entry = node("article", "dictionary-entry");
    entry.append(node("h3", "dictionary-entry-headword", (item.article ? item.article + " " : "") + item.word));

    if (item.plural) entry.append(node("p", "dictionary-entry-plural", "Plural: " + item.plural));
    const pluralNote = translated(item.plural_note_ru, item.plural_note_en);
    if (pluralNote) entry.append(node("p", "dictionary-entry-note", pluralNote));

    const meaning = node("section", "dictionary-entry-section");
    meaning.append(node("h4", "dictionary-entry-label", "Übersetzung"));
    meaning.append(node("p", "dictionary-entry-translation", translated(item.translation_ru, item.translation_en)));
    entry.append(meaning);

    const example = node("section", "dictionary-entry-section");
    example.append(node("h4", "dictionary-entry-label", "Beispiel"));
    example.append(node("p", "dictionary-entry-example", item.example_de || ""));
    const exampleTranslation = translated(item.example_ru, item.example_en);
    if (exampleTranslation) example.append(node("p", "dictionary-entry-example-translation", exampleTranslation));
    entry.append(example);
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
    // A result can be selected from a partial query (for example "Hand" →
    // "Handy"), so showing that selected entry must not depend on an exact
    // match with the current search text.
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
    if (!nouns) {
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
