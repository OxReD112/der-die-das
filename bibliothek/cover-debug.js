// TEMP COVER DIAGNOSTICS: delete this file and the marked hooks after investigation.
(() => {
  "use strict";
  const panel = document.createElement("details");
  panel.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:10000;padding:12px;background:#fff;color:#222;border:2px solid #806040;border-radius:10px;font:14px/1.4 system-ui;max-height:65vh;overflow:auto";
  const summary = document.createElement("summary");
  summary.textContent = "Диагностика обложки · 06.10 · версия 1";
  const output = document.createElement("textarea");
  output.readOnly = true;
  output.setAttribute("aria-label", "Отчёт диагностики обложки");
  output.style.cssText = "display:block;width:100%;box-sizing:border-box;height:220px;margin:10px 0;font:12px/1.4 monospace;color:#222;background:#fff";
  const copy = document.createElement("button");
  copy.textContent = "Скопировать отчёт";
  copy.type = "button";
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(output.value); copy.textContent = "Скопировано"; }
    catch (_) { output.focus(); output.select(); copy.textContent = "Выделено — скопируйте текст"; }
  };
  panel.append(summary, output, copy);
  document.body.append(panel);
  let rows = [];
  function log(stage, details = {}) {
    rows.push(`${stage}: ${JSON.stringify(details)}`);
    output.value = rows.join("\n");
    output.scrollTop = output.scrollHeight;
  }
  const api = window.BibliothekImport;
  window.BibliothekCoverDebug = {
    log,
    async saved(book) {
      try {
        const db = await window.BibliothekVocabulary.openDb();
        const saved = await new Promise((resolve, reject) => {
          const request = db.transaction("books", "readonly").objectStore("books").get(book.id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        log("Проверка сохранённой записи", { exists: Boolean(saved), thumbnail: Boolean(saved?.coverThumbnail), matches: saved?.coverThumbnail === book.coverThumbnail });
        const images = [...document.querySelectorAll(".book-cover")];
        const image = images.find(item => item.getAttribute("src") === book.coverThumbnail);
        log("Картинка в библиотеке", { exists: Boolean(image) });
        if (image) {
          await image.decode();
          log("Картинка отображается", { width: image.naturalWidth, height: image.naturalHeight });
        }
      } catch (error) { log("Ошибка проверки сохранения/отображения", { name: error?.name, message: error?.message }); }
    }
  };
  window.BibliothekImport = Object.freeze({ ...api, async fromFile(file) {
    if (!/\.epub$/i.test(file.name)) return api.fromFile(file);
    rows = [];
    panel.open = true;
    copy.textContent = "Скопировать отчёт";
    log("Версии", { diagnostics: "20261006-1", importer: window.BibliothekCoverImporterVersion || "старый код — маркер отсутствует", script: document.querySelector('script[src*="epub-import.js"]')?.src });
    log("Браузер", { userAgent: navigator.userAgent });
    try {
      const book = await api.fromFile(file);
      log("Импорт завершён", { thumbnail: Boolean(book.coverThumbnail) });
      return book;
    } catch (error) {
      log("Ошибка импорта", { name: error?.name, message: error?.message });
      throw error;
    }
  } });
  log("Диагностика готова", { importer: window.BibliothekCoverImporterVersion || "старый код — маркер отсутствует" });
})();
