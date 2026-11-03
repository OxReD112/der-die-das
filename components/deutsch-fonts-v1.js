/* Deutsch fonts (01.11.2026, see deutsch-fonts-v1.css). The exercises fit long words and sentences to the screen by
   measuring them (fitOneLine, fitCard, fitSentence, fitToCard …) and measure again on "resize". The fonts load after
   the first measuring, and Inter / Literata are not exactly as wide as the fallback, so a measured word could end
   up a little too wide or too small. When the fonts arrive, the page gets one "resize" and every exercise fits its
   text again with the real fonts. */
(function () {
  if (!document.fonts || !document.fonts.ready) return;
  var refit = function () { window.dispatchEvent(new Event("resize")); };
  document.fonts.ready.then(refit);
  if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refit);
})();
