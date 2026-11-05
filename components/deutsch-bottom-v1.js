/* Deutsch exercises — the bottom line (05.11.2026, Alena: one mechanism instead of a copy in every exercise).

   On phones and tablets the answer buttons and Weiter stand at the bottom of the screen, their bottom on ONE line in
   every exercise: where the last row of the on-screen keyboard ends (the finger is already there). The keyboard's
   last row ends 72 px above the bottom edge + home indicator, plus its row gap: 5 px on phones, 7 px on tablets
   (components/deutsch-keyboard-v2.60.html) — so the line is 77 / 79 px up. Exercises without a keyboard use the
   same line, so Weiter is at the same height everywhere.

   Before 05.11 six exercises had their own copy and two different lines (16 px above the Spickzettel = 7 px lower,
   or the keyboard's bottom). Each exercise still decides WHEN to pin (touch only, not on short screens, which step
   …); the shared part is WHERE and HOW.

   DeutschBottom.line()                 → y of the line (px from the top of the window)
   DeutschBottom.pin(el, holder, opts)  → moves `holder` (default: el) down with margin-top until el's bottom sits
                                          on the line. Only free room is used: never pushes it up, and if the page
                                          (.app, or opts.scroller) would scroll because of it, it gives that back.
                                          opts.zoom: the element sits in a zoomed card (divide the move by it).
                                          Returns the px moved (0 if nothing). Clears its own margin first, so it
                                          can be called again on every change and on resize. */
(function () {
  "use strict";
  var TABLET = window.matchMedia("(min-width: 700px) and (min-height: 740px)");
  var probe = null;
  function ensure() {
    if (probe && probe.isConnected) return probe;
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;width:0;height:0;pointer-events:none;visibility:hidden";
    document.body.appendChild(probe);
    return probe;
  }
  function line() {
    var p = ensure();
    p.style.bottom = "calc(env(safe-area-inset-bottom) + " + (TABLET.matches ? 79 : 77) + "px)";
    return p.getBoundingClientRect().top;
  }
  function pin(el, holder, opts) {
    opts = opts || {};
    holder = holder || el;
    holder.style.marginTop = "";
    var r = el.getBoundingClientRect();
    if (!r.height) return 0;
    var zoom = opts.zoom || 1;
    var down = (line() - r.bottom) / zoom;
    if (down <= 0) return 0;
    var base = parseFloat(getComputedStyle(holder).marginTop) || 0;
    holder.style.marginTop = base + down + "px";
    var sc = opts.scroller === undefined ? document.querySelector(".app") : opts.scroller;
    if (sc) {
      var over = sc.scrollHeight - sc.clientHeight;
      if (over > 0) {
        down = Math.max(0, down - over);
        holder.style.marginTop = base + down + "px";
      }
    }
    return down;
  }
  window.DeutschBottom = { line: line, pin: pin };
})();
