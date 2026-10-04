/* ===== Deutsch · WIDE EXERCISES (iPad landscape + computer) — v1, 2026-10-03 =====
   Loaded by every exercise page. Does nothing on phones: it only switches on with the
   same rule as the wide Home (landscape, ≥ 1024px wide, ≥ 600px tall), so the phone
   layout is never touched.

   When on (html.deutsch-wide):
     · the header (.top: title left, counter right, and its progress line — inside it, or the
       .progress right after it) spans the width of
       the Home block, so opening an exercise keeps the same frame as Home;
     · the on-screen keyboard (#keyboardMount) has that same width, with taller keys;
     · everything in between (question, cards, answer field, answer buttons, answer
       cards) is 600px wide in every exercise (CONTENT / PAGE_EXTRA below).
   The Home page tells us its block width (window.DEUTSCH_WIDE_BLOCK, home.js → fit);
   opened on its own, the page uses the same rule of thumb as Home (82% of the width). */
(function () {
  const QUERY = "(orientation: landscape) and (min-width: 1024px) and (min-height: 600px)";
  const wide = window.matchMedia(QUERY);
  const root = document.documentElement;

  const css = `
html.deutsch-wide .app {
  box-sizing: border-box !important;
  width: var(--ex-block) !important;
  max-width: none !important;
  padding-left: calc((var(--ex-block) - var(--ex-inner)) / 2) !important;
  padding-right: calc((var(--ex-block) - var(--ex-inner)) / 2) !important;
}
/* the few boxes that had their own, narrower limit (see CONTENT below) */
html[data-ex="wortschatz"].deutsch-wide #question { width: 100% !important; }
html[data-ex="modalverben"].deutsch-wide .sentence { max-width: none !important; }
/* Modalverben + Vielseitige Verben: the German sentence 26px → 36px on wide screens (2026-10-04),
   closer to the other exercises' questions; the answer gap (3.6em) grows with it.
   The longest sentences still fit in two lines within the 600px column. */
html[data-ex="modalverben"].deutsch-wide .sentence,
html[data-ex="vielseitige_verben"].deutsch-wide .sentence { font-size: 36px !important; }
/* a question that needs two lines gets two even lines (no single word alone on the second line) */
html.deutsch-wide .sentence,
html.deutsch-wide .context,
html.deutsch-wide .translation,
html.deutsch-wide .meaning,
html.deutsch-wide #word,
html.deutsch-wide .preposition,
html.deutsch-wide .scene { text-wrap: balance; }
html.deutsch-wide .top,
html.deutsch-wide .top + .progress,
html.deutsch-wide #keyboardMount {
  box-sizing: border-box !important;
  width: var(--ex-block) !important;
  max-width: none !important;
  margin-left: calc((100% - var(--ex-block)) / 2) !important;
  margin-right: calc((100% - var(--ex-block)) / 2) !important;
}
/* taller keys, so the wider keyboard keeps a normal key shape */
html.deutsch-wide .keyboard .row { gap: 6px; margin-bottom: 7px; }
html.deutsch-wide .keyboard .key {
  height: 56px;
  font-size: 22px;
  width: calc((100% - 54px) / 10);
  flex-basis: calc((100% - 54px) / 10);
}
html.deutsch-wide .keyboard .row.third .back {
  width: calc(2 * ((100% - 54px) / 10) + 6px);
  flex-basis: calc(2 * ((100% - 54px) / 10) + 6px);
}
html.deutsch-wide .keyboard .row.special .space { width: auto; flex: 1 1 auto; }
html.deutsch-wide .keyboard .row.special .ok {
  width: calc(2.5 * ((100% - 54px) / 10) + 9px);
  flex-basis: calc(2.5 * ((100% - 54px) / 10) + 9px);
  font-size: 24px;
}`;

  function addStyle() {
    if (document.getElementById("deutschWideStyle")) return;
    const style = document.createElement("style");
    style.id = "deutschWideStyle";
    style.textContent = css;
    document.head.append(style);
  }

  /* CONTENT WIDTH: on wide screens every exercise's question, cards, answer field, answer
     buttons and answer cards are 600px wide (the Pronomen answer field = the reference,
     2026-10-03). Pages wrap that content differently, so each page says how much its own
     wrapping adds around the 600px (screen padding, card padding). A page that isn't listed
     keeps its own column width. */
  const CONTENT = 600;
  const PAGE_EXTRA = {
    artikel: 0,
    pronomen: 28,                  // .screen: 14px each side
    wortschatz: 0,
    partizipii: 40,                // .card: 20px each side
    modalverben: 40,               // .card: 20px each side
    vielseitige_verben: 0,
    kasus: 0,
    verben_mit_praepositionen: 28, // .screen: 14px each side
    ortspraepositionen: 0
  };
  const page = (() => {
    const parts = location.pathname.toLowerCase().split("/").filter(p => p && !p.endsWith(".html"));
    return parts[parts.length - 1] || "";
  })();
  if (page in PAGE_EXTRA) root.dataset.ex = page;

  function blockWidth() {
    let fromHome = 0;
    try {
      if (window.parent && window.parent !== window) fromHome = Number(window.parent.DEUTSCH_WIDE_BLOCK) || 0;
    } catch (e) { /* not the Home page around us */ }
    const fallback = Math.min(window.innerWidth * 0.82, window.innerHeight * 1.21, 1229);
    return Math.round(Math.min(fromHome || fallback, window.innerWidth - 48));
  }

  function sync() {
    const app = document.querySelector(".app");
    if (!app) return;
    // measure the page's own column first (as on the phone / narrow screens)…
    root.classList.remove("deutsch-wide");
    if (!wide.matches) return;
    const style = getComputedStyle(app);
    const own = app.offsetWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const inner = page in PAGE_EXTRA ? CONTENT + PAGE_EXTRA[page] : own;
    root.style.setProperty("--ex-inner", inner + "px");
    root.style.setProperty("--ex-block", blockWidth() + "px");
    // …then widen the frame around it
    addStyle();
    root.classList.add("deutsch-wide");
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sync);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
  else sync();
  wide.addEventListener("change", schedule);
  window.addEventListener("resize", schedule);
})();
