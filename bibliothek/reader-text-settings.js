/* Reader text settings: size, line spacing, alignment and font of the book text.
   Stored per device (like the highlights switch); not part of Backup. */
(() => {
  "use strict";
  const KEY = "deutschReaderTextV1";
  const SIZES = [0.8, 0.9, 1, 1.12, 1.25, 1.4, 1.6];
  const DEFAULT_SIZE = 2;
  const SPACING = { compact: 1.55, normal: 1.82, loose: 2.1 };
  const FONTS = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  };
  const DEFAULTS = { size: DEFAULT_SIZE, spacing: "normal", align: "justify", font: "serif" };

  function sanitize(value) {
    const settings = { ...DEFAULTS };
    if (!value || typeof value !== "object") return settings;
    const size = Number(value.size);
    if (Number.isInteger(size) && size >= 0 && size < SIZES.length) settings.size = size;
    if (Object.hasOwn(SPACING, value.spacing)) settings.spacing = value.spacing;
    if (value.align === "justify" || value.align === "left") settings.align = value.align;
    if (Object.hasOwn(FONTS, value.font)) settings.font = value.font;
    return settings;
  }
  function load() {
    try {
      return sanitize(JSON.parse(localStorage.getItem(KEY) || "null"));
    } catch (_) {
      return { ...DEFAULTS };
    }
  }
  function save(settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  function create({ target, dialog, toggle, onBeforeOpen, onChange }) {
    let settings = load();
    const $ = selector => dialog.querySelector(selector);
    const sizeInput = $("[data-text-size]");
    const smaller = $("[data-text-smaller]");
    const larger = $("[data-text-larger]");

    function apply() {
      target.style.setProperty("--reader-text-scale", String(SIZES[settings.size]));
      target.style.setProperty("--reader-line-height", String(SPACING[settings.spacing]));
      target.style.setProperty("--reader-font", FONTS[settings.font]);
      target.style.setProperty("--reader-align", settings.align);
    }
    function render() {
      sizeInput.value = String(settings.size);
      sizeInput.setAttribute("aria-valuetext", `${Math.round(SIZES[settings.size] * 100)}%`);
      sizeInput.style.setProperty("--fill", `${(settings.size / (SIZES.length - 1)) * 100}%`);
      smaller.disabled = settings.size === 0;
      larger.disabled = settings.size === SIZES.length - 1;
      for (const button of dialog.querySelectorAll("[data-setting]")) {
        button.setAttribute("aria-pressed", String(settings[button.dataset.setting] === button.dataset.value));
      }
    }
    function update(change) {
      const next = sanitize({ ...settings, ...change });
      if (JSON.stringify(next) === JSON.stringify(settings)) return;
      settings = next;
      save(settings);
      apply();
      render();
      onChange?.(settings);
    }

    sizeInput.max = String(SIZES.length - 1);
    sizeInput.addEventListener("input", () => update({ size: Number(sizeInput.value) }));
    smaller.addEventListener("click", () => update({ size: settings.size - 1 }));
    larger.addEventListener("click", () => update({ size: settings.size + 1 }));
    for (const button of dialog.querySelectorAll("[data-setting]")) {
      button.addEventListener("click", () => update({ [button.dataset.setting]: button.dataset.value }));
    }

    function place() {
      // Phones: a sheet along the bottom edge. Wider screens: a card above the button.
      if (matchMedia("(max-width: 699px)").matches) {
        dialog.style.removeProperty("right");
        dialog.style.removeProperty("bottom");
        return;
      }
      const box = toggle.getBoundingClientRect();
      dialog.style.right = `${Math.max(12, innerWidth - box.right - 8)}px`;
      dialog.style.bottom = `${Math.max(12, innerHeight - box.top + 10)}px`;
    }
    function open() {
      if (dialog.open) return;
      onBeforeOpen?.();
      render();
      place();
      dialog.showModal();
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      if (dialog.open) dialog.close();
    }
    toggle.addEventListener("click", () => (dialog.open ? close() : open()));
    dialog.addEventListener("close", () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus({ preventScroll: true });
    });
    $("[data-text-close]").addEventListener("click", close);
    // A tap outside the card (on the backdrop) closes it.
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) close();
    });
    window.addEventListener("resize", () => {
      if (dialog.open) place();
    });
    window.addEventListener("storage", event => {
      if (event.key !== KEY) return;
      settings = load();
      apply();
      render();
      onChange?.(settings);
    });

    apply();
    render();
    return {
      open,
      close,
      get settings() {
        return { ...settings };
      }
    };
  }

  window.BibliothekTextSettings = { create, KEY, SIZES, DEFAULTS };
})();
