/* End screen of the exercises (01.11.2026): one kind phrase under the score and one „Noch üben“ list.
   The phrase always praises taking part (rule of 22.10.2026, first in Pronomen); the list shows at most three
   lines and „und N weitere“ for the rest. Styles: components/deutsch-base-v1.css (.end-list). */
(function () {
  function note(correct, total) {
    if (total > 0 && correct >= total) return "Perfekt – alles richtig!";
    if (correct * 2 >= total) return "Gut gemacht – Runde geschafft!";
    return "Schön, dass du geübt hast – bleib dran!";
  }
  // items: every line still worth practising, most important first (strings or nodes)
  function list(el, items) {
    items = (items || []).filter(Boolean);
    if (!items.length) {
      el.replaceChildren();
      el.className = "end-list hidden";
      return;
    }
    const title = document.createElement("h3");
    title.textContent = "Noch üben";
    const ul = document.createElement("ul");
    items.slice(0, 3).forEach(item => {
      const li = document.createElement("li");
      li.append(item);
      ul.append(li);
    });
    const parts = [title, ul];
    if (items.length > 3) {
      const more = document.createElement("p");
      more.className = "end-more";
      more.textContent = "und " + (items.length - 3) + " weitere";
      parts.push(more);
    }
    el.replaceChildren(...parts);
    el.className = "end-list";
  }
  window.DeutschEnd = { note: note, list: list };
})();
