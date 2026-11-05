/* Deutsch exercises — windows (05.11.2026, Alena: one mechanism instead of a copy in every exercise).
   Frame and look: .ui-window … in components/deutsch-ui-v1.css. Native: a sheet / dialog component.

   DeutschWindow.open(win)   shows it (class .open, aria-hidden false); the exercise fills it first
   DeutschWindow.close(win)  hides it; fires the event "windowclose" on the window (e.g. focus the answer field again)
   DeutschWindow.isOpen(win) / DeutschWindow.anyOpen()

   Every .ui-window closes by itself with its × (.ui-close), a tap on the dimmed layer outside the card, and Esc.
   While a window is open the exercise's own keys wait (Enter = Weiter etc. do nothing), only Tab moves on.
   Home (home.js) finds an open window by .ui-window.open — no list of names per exercise. */
(function () {
  "use strict";
  function isOpen(win) {
    return !!win && win.classList.contains("open");
  }
  function open(win) {
    if (!win) return;
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
  }
  function close(win) {
    if (!isOpen(win)) return;
    win.classList.remove("open");
    win.setAttribute("aria-hidden", "true");
    win.dispatchEvent(new CustomEvent("windowclose"));
  }
  function anyOpen() {
    return document.querySelector(".ui-window.open");
  }
  document.addEventListener("click", function (e) {
    var x = e.target.closest(".ui-window .ui-close");
    if (x) return close(x.closest(".ui-window"));
    if (e.target.classList && e.target.classList.contains("ui-window")) close(e.target);
  });
  document.addEventListener(
    "keydown",
    function (e) {
      var win = anyOpen();
      if (!win || e.key === "Tab") return;
      if (e.key === "Escape") close(win);
      e.stopImmediatePropagation();
    },
    true
  );
  window.DeutschWindow = { open: open, close: close, isOpen: isOpen, anyOpen: anyOpen };
})();
