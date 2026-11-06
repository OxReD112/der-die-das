/* Deutsch exercises — windows (05.11.2026, Alena: one mechanism instead of a copy in every exercise).
   Frame and look: .ui-window … in components/deutsch-ui-v1.css. Native: a sheet / dialog component.

   DeutschWindow.open(win)   shows it (class .open, aria-hidden false); the exercise fills it first
   DeutschWindow.close(win)  hides it; fires the event "windowclose" on the window (e.g. focus the answer field again)
   DeutschWindow.isOpen(win) / DeutschWindow.anyOpen()

   Every .ui-window closes by itself with its × (.ui-close), a tap on the dimmed layer outside the card, and Esc.
   While a window is open nothing behind it works (05.11.2026 fix: before, Enter on a focused Weiter behind the
   window still pressed it): focus moves into the card, Tab goes round inside the window, every other key outside it
   does nothing (no exercise listener, no browser default); on close the focus goes back where it was.
   Keys inside the window reach its own fields and buttons (06.11: the words window of Wortschatz / Bibliothek has
   forms — Enter saves a new name) but never the page behind it: the window stops them on their way up.
   Home (home.js) finds an open window by .ui-window.open — no list of names per exercise. */
(function () {
  "use strict";
  function isOpen(win) {
    return !!win && win.classList.contains("open");
  }
  var FOCUSABLE = "button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])";
  var before = null; // what had the focus before the window opened
  function card(win) {
    return win.querySelector(".ui-window-card") || win;
  }
  function open(win) {
    if (!win) return;
    if (!isOpen(win)) before = document.activeElement;
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
    if (!win._keysStay) {
      win._keysStay = true;
      win.addEventListener("keydown", function (e) {
        e.stopPropagation(); // a key inside the window never reaches the page's own listeners
      });
    }
    var c = card(win);
    if (!c.hasAttribute("tabindex")) c.setAttribute("tabindex", "-1");
    if (!win.contains(document.activeElement)) c.focus({ preventScroll: true });
  }
  function close(win) {
    if (!isOpen(win)) return;
    win.classList.remove("open");
    win.setAttribute("aria-hidden", "true");
    var back = before;
    before = null;
    if (win.contains(document.activeElement)) document.activeElement.blur();
    if (back && back.isConnected && back.focus && !back.disabled) back.focus({ preventScroll: true });
    win.dispatchEvent(new CustomEvent("windowclose")); // after: an exercise may move the focus on
  }
  // Tab / Shift+Tab go round the window's own buttons; with none, the focus stays on the card
  function trapTab(win, e) {
    var list = Array.prototype.filter.call(win.querySelectorAll(FOCUSABLE), function (el) {
      return el.getClientRects().length > 0;
    });
    e.preventDefault();
    if (!list.length) return card(win).focus({ preventScroll: true });
    var i = list.indexOf(document.activeElement);
    var next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === -1 || i === list.length - 1 ? 0 : i + 1);
    list[next].focus({ preventScroll: true });
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
      if (!win) return;
      if (e.key === "Tab") return trapTab(win, e);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close(win);
      } else if (!win.contains(e.target)) {
        e.preventDefault(); // a key on something behind the window does nothing
        e.stopImmediatePropagation();
      }
    },
    true
  );
  window.DeutschWindow = { open: open, close: close, isOpen: isOpen, anyOpen: anyOpen };
})();
