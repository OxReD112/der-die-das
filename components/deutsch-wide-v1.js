/* ===== Deutsch · WIDE EXERCISES (iPad landscape + computer) — v1, 2026-10-03 =====
   Loaded by every exercise page. Does nothing on phones: it only switches on with the
   same rule as the wide Home (landscape, ≥ 1024px wide, ≥ 600px tall), so the phone
   layout is never touched.

   When on (html.deutsch-wide):
     · the header (.top: title left, counter right, and its progress line — inside it, or the
       .progress right after it) spans the width of
       the Home block, so opening an exercise keeps the same frame as Home;
     · the on-screen keyboard (#keyboardMount) has that same width, with taller keys;
     · everything else (question, cards, answer field, buttons) keeps exactly its
       current width: the page column (.app) gets wider, but its side padding grows
       by the same amount.
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
  padding-left: calc((var(--ex-block) - var(--ex-col)) / 2 + var(--ex-pad-l)) !important;
  padding-right: calc((var(--ex-block) - var(--ex-col)) / 2 + var(--ex-pad-r)) !important;
}
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
    root.style.setProperty("--ex-col", app.offsetWidth + "px");
    root.style.setProperty("--ex-pad-l", style.paddingLeft);
    root.style.setProperty("--ex-pad-r", style.paddingRight);
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
