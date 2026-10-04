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
  /* "Notiz löschen?" (Home 5.94) — Home's own window (.settings-confirm), so it sits above the "Deutsch." header and
     home.js dims the status bar + bottom strip for it, exactly like "Are you sure?". The notebook asks with
     deutsch-notebook-delete-ask and gets deutsch-notebook-delete-answer { confirmed } back. */
  const delWin = document.getElementById("notebookDeleteConfirm");
  const delNo = document.getElementById("notebookDeleteNo");
  const delYes = document.getElementById("notebookDeleteYes");
  const delTitle = document.getElementById("notebookDeleteTitle");
  const delText = delWin?.querySelector(".settings-confirm-text");
  const defaultTitle = delTitle?.textContent || "", defaultText = delText?.innerHTML || "", defaultYes = delYes?.textContent || "";
  let delOpen = false, delKeyboard = false;
  function askDelete(keyboard, title, text, confirmLabel) { // title/text: "Thema löschen?" (Notizbuch v19); none = Home's own "Notiz löschen?"
    if (!delWin || delOpen) return;
    delOpen = true; delKeyboard = keyboard;
    if (delTitle) delTitle.textContent = title || defaultTitle;
    if (delText) { if (text) delText.textContent = text; else delText.innerHTML = defaultText; }
    if (delYes) delYes.textContent = confirmLabel || defaultYes; // "Zusammenführen" for merging topics (Notizbuch v20)
    delWin.classList.add("is-open");
    delWin.setAttribute("aria-hidden", "false");
    delNo?.focus({ preventScroll:true }); // keys now go to Home's window, not the notebook behind it
  }
  function answerDelete(confirmed) {
    if (!delOpen) return;
    delOpen = false;
    delWin.classList.remove("is-open");
    delWin.setAttribute("aria-hidden", "true");
    delNo?.blur(); delYes?.blur();
    frame.contentWindow?.postMessage({ type:"deutsch-notebook-delete-answer", confirmed, keyboard:delKeyboard }, location.origin);
    if (!confirmed || delKeyboard) frame.focus();
  }
  delNo?.addEventListener("click", () => answerDelete(false));
  delYes?.addEventListener("click", () => answerDelete(true));
  delWin?.addEventListener("click", event => { if (event.target === delWin) answerDelete(false); }); // tap outside = Abbrechen
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && delOpen) { event.stopPropagation(); answerDelete(false); } // Esc = Abbrechen, notebook stays open
  }, true);
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === "deutsch-notebook-close") closeNotebook();
    else if (event.data?.type === "deutsch-notebook-delete-ask" && opened) askDelete(!!event.data.keyboard, typeof event.data.title === "string" ? event.data.title : "", typeof event.data.text === "string" ? event.data.text : "", typeof event.data.confirmLabel === "string" ? event.data.confirmLabel : "");
  });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && opened && !delOpen) closeNotebook(); });
  window.addEventListener("storage", event => {
    if (opened && (event.key === "deutschThemeV1" || event.key === "deutschTranslationLangV1")) {
      frame.contentWindow?.postMessage({ type:"deutsch-notebook-open", theme:currentTheme(), lang:localStorage.getItem("deutschTranslationLangV1") || "en" }, location.origin);
    }
  });
  frame.addEventListener("load", () => {
    if (opened) frame.contentWindow?.postMessage({ type:"deutsch-notebook-open", theme:currentTheme(), lang:localStorage.getItem("deutschTranslationLangV1") || "en" }, location.origin);
  });
})();
