(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  function create({ getBook, getRange, getResolver, withCardDetails, renderCard, goTo, language, onChanged }) {
    const dialog = $("vocabulary-dialog"),
      list = $("vocabulary-list"),
      selected = new Set();
    let run = 0,
      countRun = 0,
      entries = [],
      trigger = null,
      navigating = false,
      busy = false,
      currentResolver = null;
    const text = (tag, cls, value) => {
      const element = document.createElement(tag);
      element.className = cls;
      element.textContent = value;
      return element;
    };
    let closing = false;
    async function close(prepare) {
      if (!dialog.open || closing || busy) return;
      closing = true;
      dialog.classList.remove("is-opening");
      const preparation = typeof prepare === "function" ? prepare() : Promise.resolve();
      if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
        dialog.classList.add("is-closing");
        await Promise.all([
          preparation,
          ...dialog.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))
        ]);
      }
      await preparation;
      await new Promise(resolve => {
        dialog.addEventListener("close", resolve, { once: true });
        dialog.close();
      });
      dialog.classList.remove("is-closing");
      closing = false;
    }
    const availability = record => window.BibliothekVocabularyActions.availability(record, currentResolver);
    // 08.11 (Alena): no record numbers and no English in the list — a word without a learning card only says so.
    const NO_CARD = "ohne Lernkarte";
    const PARTS = { adj: "Adjektiv", adv: "Adverb", noun: "Nomen", verb: "Verb", conj: "Konjunktion", pron: "Pronomen",
      prep: "Präposition", preposition: "Präposition", article: "Artikel", art: "Artikel", num: "Zahlwort", numeral: "Zahlwort",
      particle: "Partikel", expression: "Ausdruck", expr: "Ausdruck", interj: "Interjektion" };
    const partOfSpeech = pos => PARTS[pos] || PARTS[String(pos || "").toLowerCase()] || pos;
    const wordOf = record => {
      const item = record.dictionaryId != null ? currentResolver?.entry?.(record.dictionaryId) : null;
      return `${item?.article ? item.article + " " : /^(?:der|die|das)$/u.test(record.article || "") ? record.article + " " : ""}${record.lemma || record.occurrences[0].form}`;
    };
    function selection() {
      const locked = busy;
      const n = selected.size,
        chosenEntries = entries.filter(e => selected.has(e.key)),
        eligible = chosenEntries.filter(e => availability(e).available).length;
      $("vocabulary-selection").textContent = n ? `${n} ausgewählt · ${eligible} mit Lernkarte` : "";
      $("vocabulary-select-all").checked = entries.length > 0 && n === entries.length;
      $("vocabulary-select-all").indeterminate = n > 0 && n < entries.length;
      $("vocabulary-select-all").disabled = !entries.length || locked;
      $("vocabulary-copy").setAttribute("aria-label", "Ausgewählte Wörter kopieren");
      $("vocabulary-add").textContent = `+ ${eligible} zum Wortschatz`;
      $("vocabulary-add").hidden = !eligible;
      $("vocabulary-add").disabled = locked || !entries.some(e => selected.has(e.key) && availability(e).available);
      $("vocabulary-copy").disabled = locked || !n || !currentResolver;
      $("vocabulary-scope").disabled = locked || !getBook()?.chapters?.length;
      $("vocabulary-close").disabled = busy;
      for (const control of list.querySelectorAll("input,button")) control.disabled = locked;
    }
    async function render() {
      const request = ++run,
        book = getBook();
      if (!book) return;
      selected.clear();
      entries = [];
      currentResolver = null;
      list.replaceChildren();
      list.scrollTop = 0;
      selection();
      $("vocabulary-empty").hidden = true;
      $("vocabulary-status").textContent = "Wird geladen …";
      const range = $("vocabulary-scope").value === "book" ? null : getRange();
      $("vocabulary-subtitle").textContent =
        $("vocabulary-scope").value === "book" ? book.title : range?.title || book.title;
      try {
        const records = await window.BibliothekVocabulary.list(book.id);
        if (request !== run || !dialog.open) return;
        entries = window.BibliothekVocabularyList.scoped(records, range);
        $("vocabulary-empty").hidden = !!entries.length;
        selection();
        const resolver = await getResolver();
        if (request !== run || !dialog.open) return;
        // Repair only missing translations with an unambiguous fallback form link.
        // Existing resolved/manual choices and their translations are untouched.
        let recovered = false;
        for (const record of entries) {
          if (record.source !== "unresolved" || record.translation.en || record.translation.ru) continue;
          for (const occurrence of record.occurrences) {
            if (request !== run || !dialog.open || getBook() !== book) return;
            try {
              const resolution = await resolver.resolve(occurrence.form, {
                sentence: occurrence.sentence,
                tokenOffset: occurrence.tokenOffset
              });
              const candidate = resolution.selected;
              if (
                candidate?.source !== "fallback" ||
                resolution.candidates.length !== 1 ||
                !resolution.formNotes.some(note => note.lemmas?.length) ||
                !(candidate.translation?.en || candidate.translation?.ru)
              )
                continue;
              if (request !== run || !dialog.open || getBook() !== book) return;
              await window.BibliothekVocabulary.resolveOccurrence(book.id, record.key, occurrence, candidate);
              recovered = true;
            } catch (_) {
              /* A failed lookup leaves the original bookmark intact. */
            }
          }
        }
        if (recovered) {
          const refreshed = await window.BibliothekVocabulary.list(book.id);
          if (request !== run || !dialog.open || getBook() !== book) return;
          entries = window.BibliothekVocabularyList.scoped(refreshed, range);
          await onChanged();
        }
        // (08.11.2026: the cards with their examples — the light dictionary of the reader has none; bibliothek.js)
        const detailed = withCardDetails ? await withCardDetails(resolver, entries) : resolver;
        if (request !== run || !dialog.open) return;
        currentResolver = detailed;
        selection();

        for (const record of entries) {
          // 08.11 (Alena): a row is the word, its part of speech and its meaning; the round mark chooses it, a tap
          // anywhere else opens its dictionary card on the second screen («Im Text zeigen» is there now).
          const row = text("section", "vocabulary-row", ""),
            heading = text("div", "vocabulary-row-heading", "");
          const word = wordOf(record);
          const label = document.createElement("label"),
            check = document.createElement("input");
          label.className = "vocabulary-row-check";
          check.type = "checkbox";
          check.value = record.key;
          check.setAttribute("aria-label", word);
          label.append(check);
          check.addEventListener("change", () => {
            if (check.checked) selected.add(record.key);
            else selected.delete(record.key);
            selection();
          });
          const opener = text("button", "vocabulary-row-open", word);
          opener.type = "button";
          opener.addEventListener("click", () => showDetail(record, opener));
          heading.append(label, opener);
          row.append(heading);
          const translation =
            language() === "ru"
              ? record.translation.ru || record.translation.en
              : record.translation.en || record.translation.ru;
          const withCard = record.source === "main" && availability(record).available;
          row.append(
            text("p", "vocabulary-availability", [partOfSpeech(record.pos), withCard ? "" : NO_CARD].filter(Boolean).join(" · "))
          );
          row.append(text("p", "", translation || "Bedeutung noch unbekannt"));
          const arrow = text("span", "ui-chev ui-chev-lone vocabulary-row-arrow", "");
          arrow.setAttribute("aria-hidden", "true");
          row.append(arrow);
          row.addEventListener("click", event => {
            if (!event.target.closest("label, button") && !getSelection()?.toString()) showDetail(record, opener);
          });
          list.append(row);
        }
        $("vocabulary-status").textContent = `${entries.length} ${entries.length === 1 ? "Wort" : "Wörter"}`;
      } catch (error) {
        if (request === run)
          $("vocabulary-status").textContent = "Wörter konnten nicht geladen werden. Bitte noch einmal öffnen.";
      }
    }
    // 08.11 (Alena): the second screen — the list slides away to the left, the word's card comes in from the right
    // (the same card as «Словарная справка» in the book); «‹ Meine Wörter» on top stays put while the card scrolls.
    const detail = $("vocabulary-detail"),
      drawer = dialog.querySelector(".reader-drawer-content");
    let detailRecord = null,
      detailTrigger = null,
      detailTimer = 0;
    const still = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
    function showDetail(record, from) {
      if (busy || closing || navigating) return;
      detailRecord = record;
      detailTrigger = from;
      const card = $("vocabulary-detail-card"),
        occurrence = record.occurrences[0],
        item = record.dictionaryId != null ? currentResolver?.entry?.(record.dictionaryId) : null;
      card.replaceChildren();
      if (item && renderCard) renderCard(item, card, occurrence.form);
      else {
        // a word the dictionary has no card for: what the list knows of it
        const translation =
          language() === "ru" ? record.translation.ru || record.translation.en : record.translation.en || record.translation.ru;
        card.append(
          text("h2", "dictionary-headword", wordOf(record)),
          ...(record.pos ? [text("p", "dictionary-pos", partOfSpeech(record.pos))] : []),
          text("p", "dictionary-translation", translation || "Bedeutung noch unbekannt")
        );
      }
      $("vocabulary-detail-scroll").scrollTop = 0;
      clearTimeout(detailTimer);
      detail.hidden = false;
      detail.inert = false;
      drawer.inert = true;
      void detail.offsetWidth; // the start position is drawn before the slide
      dialog.classList.add("is-detail");
      $("vocabulary-back").focus({ preventScroll: true });
    }
    function hideDetail(instant = false) {
      if (detail.hidden) return;
      dialog.classList.remove("is-detail");
      detail.inert = true;
      drawer.inert = false;
      const done = () => {
        if (!dialog.classList.contains("is-detail")) detail.hidden = true;
      };
      clearTimeout(detailTimer);
      if (instant || still()) done();
      else detailTimer = setTimeout(done, 450);
      if (!instant && detailTrigger?.isConnected) detailTrigger.focus({ preventScroll: true });
      detailRecord = null;
    }
    $("vocabulary-back").addEventListener("click", () => hideDetail());
    $("vocabulary-detail-passage").addEventListener("click", async () => {
      const occurrence = detailRecord?.occurrences[0];
      if (!occurrence || closing || navigating) return;
      navigating = true;
      try {
        let focus;
        await close(async () => {
          focus = await goTo(occurrence);
        });
        focus?.();
      } catch (error) {
        console.warn("Could not open vocabulary passage", error);
      } finally {
        navigating = false;
      }
    });
    // a swipe to the right goes back, as on the iPhone — not on a table that scrolls sideways itself
    {
      let touch = null;
      const sideways = target => {
        for (let el = target; el && el !== detail; el = el.parentElement)
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") return true;
        return false;
      };
      detail.addEventListener(
        "touchstart",
        event => {
          touch =
            event.touches.length === 1 && !sideways(event.target)
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null;
        },
        { passive: true }
      );
      detail.addEventListener("touchend", event => {
        if (!touch) return;
        const dx = event.changedTouches[0].clientX - touch.x,
          dy = event.changedTouches[0].clientY - touch.y;
        touch = null;
        if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) hideDetail();
      });
    }
    function open(from) {
      if (!getBook()) return;
      hideDetail(true);

      trigger = from || $("vocabulary-toggle");
      selected.clear();
      $("vocabulary-action-status").textContent = "";
      $("vocabulary-continue").hidden = true;
      $("vocabulary-manual-copy").hidden = true;
      const hasChapters = !!getBook().chapters?.length;
      $("vocabulary-scope").options[0].textContent = hasChapters ? "Kapitel" : "Text";
      $("vocabulary-scope").value = "chapter";
      $("vocabulary-scope").disabled = !hasChapters;
      if (!dialog.open) {
        dialog.showModal();
        dialog.classList.add("is-opening");
      }
      render();
      $("vocabulary-heading").focus({ preventScroll: true });
    }
    async function updateCount() {
      const request = ++countRun,
        book = getBook();
      if (!book) return;
      try {
        const records = await window.BibliothekVocabulary.list(book.id);
        if (request !== countRun || getBook() !== book) return;
        const n = window.BibliothekVocabularyList.scoped(records, getRange()).length;
        $("vocabulary-count").textContent = n;
        $("vocabulary-toggle").classList.toggle("has-words", n > 0); // 08.11: the bookmark fills when a word is marked
        $("vocabulary-toggle").setAttribute(
          "aria-label",
          `Open ${book.chapters?.length ? "chapter" : "text"} vocabulary, ${n} marked words`
        );
        $("chapter-vocabulary-review")?.remove();
        if (n) {
          const review = text(
            "button",
            "chapter-vocabulary-review",
            `${n} ${n === 1 ? "Wort" : "Wörter"} markiert · Ansehen `
          );
          const chev = text("span", "ui-chev", "");
          chev.setAttribute("aria-hidden", "true");
          review.append(chev);
          review.id = "chapter-vocabulary-review";
          review.type = "button";
          review.addEventListener("click", () => open(review));
          $("chapter-end").prepend(review);
          $("chapter-end").hidden = false;
        } else if (!book.chapters?.length) $("chapter-end").hidden = true;
        if (dialog.open) render();
      } catch (error) {
        if (request === countRun) {
          $("vocabulary-count").textContent = "–";
          $("vocabulary-toggle").classList.remove("has-words");
          $("vocabulary-toggle").setAttribute("aria-label", "Open vocabulary");
        }
      }
    }
    function chosen() {
      return selected.size ? entries.filter(e => selected.has(e.key)) : entries;
    }
    $("vocabulary-copy").addEventListener("click", async () => {
      if (busy || !currentResolver || !selected.size) return;
      const subtitle = $("vocabulary-subtitle").textContent;
      const title = subtitle === getBook().title ? subtitle : `${getBook().title} · ${subtitle}`;
      const value = window.BibliothekVocabularyActions.copyText(chosen(), currentResolver, language(), title);
      busy = true;
      selection();
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(value);
        $("vocabulary-manual-copy").hidden = true;
        $("vocabulary-action-status").textContent = "Kopiert.";
      } catch (error) {
        $("vocabulary-manual-copy").hidden = false;
        $("vocabulary-copy-text").value = value;
        $("vocabulary-copy-text").focus();
        $("vocabulary-copy-text").select();
        $("vocabulary-action-status").textContent = "Kopieren ging nicht. Bitte den Text unten markieren und kopieren.";
      } finally {
        busy = false;
        selection();
      }
    });
    $("vocabulary-add").addEventListener("click", () => {
      if (busy || !currentResolver || !selected.size) return;
      busy = true;
      selection();
      $("vocabulary-continue").hidden = true;
      try {
        const result = window.BibliothekVocabularyActions.add(chosen(), currentResolver, getBook().title);
        const unavailable = result.unavailable.length
          ? ` ${result.unavailable.length} ${NO_CARD} bleiben in Meine Wörter.`
          : "";
        if (result.pending) {
          $("vocabulary-action-status").textContent =
            `${result.cards.length} ${result.cards.length === 1 ? "Wort" : "Wörter"} bereit.${unavailable}`;
          $("vocabulary-continue").hidden = false;
          location.assign($("vocabulary-continue").href);
        } else
          $("vocabulary-action-status").textContent =
            `Keine Lernkarten.${unavailable}`;
      } catch (error) {
        $("vocabulary-action-status").textContent = "Wörter konnten nicht hinzugefügt werden. Bitte noch einmal versuchen.";
      } finally {
        busy = false;
        selection();
      }
    });
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      if (busy) return;
      if (!detail.hidden) hideDetail();
      else close();
    });
    $("vocabulary-toggle").addEventListener("click", () => open($("vocabulary-toggle")));
    $("vocabulary-close").addEventListener("click", close);
    dialog.addEventListener("close", () => {
      run++;
      hideDetail(true);
      if (!navigating && trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog && !busy) {
        const b = dialog.getBoundingClientRect();
        if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom)
          close();
      }
    });
    $("vocabulary-scope").addEventListener("change", () => {
      $("vocabulary-manual-copy").hidden = true;
      $("vocabulary-continue").hidden = true;
      $("vocabulary-action-status").textContent = "";
      render();
    });
    $("vocabulary-select-all").addEventListener("change", event => {
      selected.clear();
      for (const check of list.querySelectorAll('input[type="checkbox"]')) {
        check.checked = event.target.checked;
        if (check.checked) selected.add(check.value);
      }
      selection();
    });
    return Object.freeze({ updateCount, open });
  }
  window.BibliothekVocabularyPanel = Object.freeze({ create });
})();
