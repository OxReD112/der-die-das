/* Home · Wörterbuch lookup (data: ./worterbuch/german-*.json)
   20.11.2026 (design chat; native app, stage 5): everything without a page — loading, the search, what an input leads
   to, the list and the card as data — is in worterbuch/worterbuch-model.js (WorterbuchModel); this file draws it, the
   same markup as before. */
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
  const M = window.WorterbuchModel;
  if (!input || !form || !results || !open || !M) return;

  let selected = null;

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = value;
    return element;
  }

  // 21.11.2026 (Alena): while the words load — the three jumping dots of the Bibliothek popup, centred (the app needs
  // ~3.5 s the first time); VoiceOver still hears «Wörter werden geladen …»
  function loadingDots() {
    const dots = node("div", "dictionary-loading");
    dots.setAttribute("role", "status");
    dots.setAttribute("aria-label", M.TEXT.loading);
    for (let i = 0; i < 3; i++) dots.append(node("span"));
    return dots;
  }

  function loadDatabase() {
    if (M.loaded() || M.loading()) return;
    results.replaceChildren(loadingDots());
    M.load().then(cards => {
      if (cards) render();
      else results.replaceChildren(node("p", "dictionary-hint", M.TEXT.loadError));
    });
  }

  // a card's section → the classes it always had
  const SECTION_CLASS = {
    wordOrder: "dictionary-word-order",
    example: "",
    hints: "dictionary-entry-hints",
    pronounForms: "dictionary-pronoun-forms",
    declension: "dictionary-noun-declension",
    complements: "dictionary-verb-complements",
    reflexive: "dictionary-entry-reflexive-section",
    verbForms: "dictionary-verb-forms",
    imperative: "dictionary-verb-imperative",
    expressions: "dictionary-entry-expressions"
  };
  const LINE_CLASS = {
    detail: "dictionary-entry-plural dictionary-entry-detail",
    example: "dictionary-entry-example",
    reflexiveExample: "dictionary-entry-example dictionary-entry-reflexive-example",
    exampleTranslation: "dictionary-entry-example-translation",
    note: "dictionary-entry-note",
    complementNote: "dictionary-entry-example-translation dictionary-verb-complement-note"
  };

  function makeTable(line) {
    const table = node("table", "dictionary-forms-table");
    const thead = node("thead");
    const header = node("tr");
    const corner = node("th", "dictionary-forms-person", line.corner);
    if (line.scroll) corner.scope = "col";
    header.append(corner);
    line.columns.forEach(label => {
      const cell = node("th", "", label);
      if (line.scroll) cell.scope = "col";
      header.append(cell);
    });
    thead.append(header);
    const tbody = node("tbody");
    line.rows.forEach(({ head, cells }) => {
      const row = node("tr");
      const heading = node("th", "dictionary-forms-person", head);
      if (line.scroll) heading.scope = "row";
      row.append(heading);
      cells.forEach(value => row.append(node("td", "", value)));
      tbody.append(row);
    });
    table.append(thead, tbody);
    if (!line.scroll) return table;
    // pronoun tables scroll sideways on a narrow screen
    const scroll = node("div", "dictionary-pronoun-table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", line.label);
    scroll.append(table);
    return scroll;
  }

  function makeLine(line) {
    if (LINE_CLASS[line.kind]) return node("p", LINE_CLASS[line.kind], line.text);
    if (line.kind === "pattern") {
      // „**Verb**“ in the pattern is shown in bold.
      const pattern = node("p", "dictionary-entry-plural dictionary-entry-detail dictionary-word-order-pattern");
      line.parts.forEach(part => pattern.append(part.bold ? node("strong", "", part.text) : document.createTextNode(part.text)));
      return pattern;
    }
    if (line.kind === "complement") {
      const p = node("p", "dictionary-entry-detail");
      p.append(node("strong", "", line.text));
      return p;
    }
    if (line.kind === "table") return makeTable(line);
    if (line.kind === "imperative") {
      const formsLine = node("p", "dictionary-entry-plural");
      line.parts.forEach(({ person, form }, index) => {
        if (index) formsLine.append(node("span", "dictionary-entry-imperative-separator", " · "));
        formsLine.append(node("span", "dictionary-entry-imperative-person", person + ": "));
        formsLine.append(node("span", "dictionary-entry-imperative-form", form));
      });
      return formsLine;
    }
    if (line.kind === "expression") {
      // Wörterbuch quality A7 (user 27.10.2026): «Ausdrücke» — each opens its card.
      const button = node("button", "dictionary-match dictionary-entry-expression");
      button.type = "button";
      button.append(node("span", "dictionary-match-word", line.word));
      button.append(node("span", "dictionary-match-translation", line.translation));
      button.addEventListener("click", event => {
        event.preventDefault();
        selected = line.card;
        render();
        results.scrollIntoView?.({ block: "start" });
      });
      return button;
    }
    return document.createTextNode("");
  }

  function makeEntry(item) {
    const data = M.entry(item);
    const entry = node("article", "dictionary-entry");
    // 06.11 (Alena, variant B): the part of speech is a label above the word, like BEISPIEL (was small on the right
    // of the „‹ Zurück zur Suche“ row; home.css hides that one when this label is there)
    if (data.pos) entry.append(node("p", "dictionary-entry-pos", data.pos));
    entry.append(node("h3", "dictionary-entry-headword", data.headword));
    data.blocks.forEach(block => {
      if (block.kind === "detail") entry.append(node("p", "dictionary-entry-plural dictionary-entry-detail", block.text));
      else if (block.kind === "note") entry.append(node("p", "dictionary-entry-note", block.text));
      else if (block.kind === "translation") entry.append(node("p", "dictionary-entry-translation", block.text));
      else if (block.kind === "reflexive") {
        const line = node("p", "dictionary-entry-translation dictionary-entry-reflexive");
        line.append(node("strong", "", block.sich), document.createTextNode(" — " + block.text));
        entry.append(line);
      } else if (block.kind === "section") {
        const extra = SECTION_CLASS[block.type];
        const section = node("section", "dictionary-entry-section" + (extra ? " " + extra : ""));
        section.append(node("h4", "dictionary-entry-label", block.label));
        block.lines.forEach(line => section.append(makeLine(line)));
        entry.append(section);
      }
    });
    if (data.addToWortschatz) {
      const addToWortschatz = node("button", "dictionary-add-wortschatz ui-quiet", M.TEXT.addToWortschatz); // the shared quiet wide button (06.11)
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
    const data = M.list(matches);
    const list = node("div", "dictionary-matches");
    data.rows.forEach(row => {
      const button = node("button", "dictionary-match");
      button.type = "button";
      button.append(node("span", "dictionary-match-word", row.word));
      button.append(node("span", "dictionary-match-translation", row.translation));
      button.addEventListener("click", event => {
        event.preventDefault();
        input.blur();
        selected = row.card;
        render();
      });
      list.append(button);
    });
    results.replaceChildren(list);
    if (data.more) results.append(node("p", "dictionary-hint", data.moreText));
  }

  function showEntry(item) {
    selected = item;
    if (entryBackbar) entryBackbar.hidden = false;
    if (entryType) entryType.textContent = M.typeLabel(item);
    results.replaceChildren(makeEntry(item));
  }

  // what M.decide / submit / back answered → the panel
  function show(result) {
    if (result.kind === "entry") return showEntry(result.card);
    if (entryBackbar) entryBackbar.hidden = true;
    if (entryType) entryType.textContent = "";
    selected = null;
    if (result.kind === "empty") results.replaceChildren();
    else if (result.kind === "loading") loadDatabase();
    else if (result.kind === "list") showMatches(result.matches);
    else results.replaceChildren(node("p", "dictionary-hint", M.TEXT.none));
  }

  function render() {
    const query = input.value;
    if (clear) clear.hidden = !query;
    if (intro) {
      intro.hidden = Boolean(query.trim());
      // centred, a new line after the colon (21.11.2026, Alena)
      intro.replaceChildren(...M.TEXT.introLines().flatMap((line, i) => (i ? [node("br"), line] : [line])));
    }
    if (selected) return showEntry(selected);
    show(M.decide(query));
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
    const result = M.back(input.value);
    if (result.kind === "list") showMatches(result.matches);
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
    const result = M.submit(input.value);
    if (result.kind === "entry") selected = result.card;
    render();
  });
  document.addEventListener("deutsch:translationlang", render);
  open.addEventListener("click", loadDatabase);
  render();
})();
