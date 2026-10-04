(() => {
  const openButton = document.getElementById("notebookOpen");
  const layer = document.getElementById("notebookLayer");
  const panel = document.getElementById("notebookPanel");
  const frame = document.getElementById("notebookFrame");
  if (!openButton || !layer || !panel || !frame) return;
  const root = document.documentElement;
  let opened = false, restoreFocusOnClose = false;
  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function openNotebook() {
    if (opened) return;
    opened = true;
    root.classList.add("home-notebook-open");
    layer.setAttribute("aria-hidden", "false");
    openButton.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => panel.classList.add("is-open"));
    frame.contentWindow?.postMessage({ type:"deutsch-notebook-open", theme:currentTheme(), lang:localStorage.getItem("deutschTranslationLangV1") || "en" }, location.origin);
  }
  function closeNotebook() {
    if (!opened) return;
    opened = false;
    panel.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    openButton.setAttribute("aria-expanded", "false");
    root.classList.remove("home-notebook-open");
    if (restoreFocusOnClose) openButton.focus({ preventScroll:true });
    else openButton.blur();
  }
  openButton.setAttribute("aria-expanded", "false");
  openButton.addEventListener("click", event => {
    restoreFocusOnClose = event.detail === 0;
    openNotebook();
  });
  window.addEventListener("message", event => {
    if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === "deutsch-notebook-close") closeNotebook();
  });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && opened) closeNotebook(); });
  window.addEventListener("storage", event => {
    if (opened && (event.key === "deutschThemeV1" || event.key === "deutschTranslationLangV1")) {
      frame.contentWindow?.postMessage({ type:"deutsch-notebook-open", theme:currentTheme(), lang:localStorage.getItem("deutschTranslationLangV1") || "en" }, location.origin);
    }
  });
  frame.addEventListener("load", () => {
    if (opened) frame.contentWindow?.postMessage({ type:"deutsch-notebook-open", theme:currentTheme(), lang:localStorage.getItem("deutschTranslationLangV1") || "en" }, location.origin);
  });
})();
