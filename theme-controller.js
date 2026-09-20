(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'deutschThemeV1';
  const DEFAULT_THEME = 'dark';
  const THEMES = ['dark', 'light'];

  function normalizeTheme(value) {
    return THEMES.includes(value) ? value : DEFAULT_THEME;
  }

  function getTheme() {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  }

  function applyTheme(value, persist = true) {
    const theme = normalizeTheme(value);
    document.documentElement.dataset.theme = theme;

    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    document.dispatchEvent(new CustomEvent('deutsch:themechange', {
      detail: { theme }
    }));

    return theme;
  }

  function init() {
    return applyTheme(getTheme());
  }

  function setTheme(value) {
    return applyTheme(value);
  }

  function toggle() {
    return applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  window.DeutschTheme = Object.freeze({
    STORAGE_KEY,
    DEFAULT_THEME,
    getTheme,
    setTheme,
    toggle,
    init
  });
})(window, document);
