/* Deutsch — full-screen panels (06.11.2026, Alena: one behaviour for every panel, like the windows).
   The panel itself (Einstellungen, Wörterbuch on Home): .settings-panel in home.css — it slides up over the whole
   screen, title + big × (decision 04.11). Native: a full-screen sheet.

   The page opens / closes its panel itself (animation, the flying title) and tells this file:
   DeutschPanel.opened(panel, close)  the panel is open; close() is the page's own closing function
   DeutschPanel.closed(panel)         it is closed again; the focus goes back where it was
   DeutschPanel.current()             the open panel or null

   While a panel is open nothing behind it works (with a keyboard: computer, iPad with a keyboard):
   Esc closes it, Tab / Shift+Tab go round inside it, any other key on something behind it does nothing.
   A window or a confirm over the panel (.ui-window, Über / Versionen, „Bist du sicher?“) handles its own keys. */
(function () {
  "use strict";
  var FOCUSABLE = "button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])";
  var OVER = ".ui-window.open,.about-window.open,.settings-confirm.is-open";
  var now = null; // { panel, close, before }

  function opened(panel, close) {
    if (!panel) return;
    if (now && now.panel === panel) {
      now.close = close;
      return;
    }
    now = { panel: panel, close: close, before: document.activeElement };
  }
  function closed(panel) {
    if (!now || now.panel !== panel) return;
    var back = now.before;
    now = null;
    if (panel.contains(document.activeElement)) document.activeElement.blur();
    if (back && back.isConnected && back.focus && !back.disabled && back !== document.body) back.focus({ preventScroll: true });
  }
  function trapTab(panel, e) {
    var list = Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE), function (el) {
      return el.getClientRects().length > 0;
    });
    e.preventDefault();
    if (!list.length) return;
    var i = list.indexOf(document.activeElement);
    var next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === -1 || i === list.length - 1 ? 0 : i + 1);
    list[next].focus({ preventScroll: true });
  }
  document.addEventListener(
    "keydown",
    function (e) {
      if (!now || document.querySelector(OVER)) return;
      var panel = now.panel;
      if (e.key === "Tab") return trapTab(panel, e);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof now.close === "function") now.close();
      } else if (!panel.contains(e.target)) {
        e.preventDefault(); // a key on something behind the panel does nothing
        e.stopImmediatePropagation();
      }
    },
    true
  );
  window.DeutschPanel = {
    opened: opened,
    closed: closed,
    current: function () {
      return now ? now.panel : null;
    }
  };
})();
