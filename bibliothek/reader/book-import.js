(() => {
  "use strict";
  class ImportError extends Error {
    constructor(code, message) { super(message); this.name = "ImportError"; this.code = code; }
  }
  const parsers = new Map();
  const titleFromFilename = name => String(name || "").replace(/\.(txt|epub)$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled text";
  function registerParser(format, parser) {
    if (!["txt", "epub"].includes(format) || typeof parser !== "function") throw new TypeError("Invalid book parser");
    parsers.set(format, parser);
  }
  function createBook(parsed, { name, format }) {
    const content = typeof parsed?.content === "string" ? parsed.content.replace(/^\uFEFF/, "") : "";
    if (!content.trim()) throw new ImportError("empty", "This text is empty.");
    const now = Date.now();
    // Keep the existing flat content/position fields readable by older saved-book code.
    // EPUB parsers can additionally supply ordered chapters for the next reader step.
    return {
      id: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random()}`,
      name, title: String(parsed.title || titleFromFilename(name)).trim() || titleFromFilename(name),
      format, content, ...(parsed.coverThumbnail ? { coverThumbnail: parsed.coverThumbnail } : {}), ...(parsed.chapters ? { chapters: parsed.chapters } : {}),
      ...(parsed.contents ? { contents: parsed.contents, structureVersion: 2 } : {}),
      position: 0, createdAt: now, updatedAt: now
    };
  }
  async function fromFile(file) {
    const extension = /\.([^.]+)$/.exec(String(file?.name || ""))?.[1].toLowerCase();
    const format = extension || (file?.type === "text/plain" ? "txt" : "");
    if (!["txt", "epub"].includes(format)) throw new ImportError("unsupported", "This file type is not supported. Choose a TXT or EPUB file.");
    const parser = parsers.get(format);
    if (!parser) throw new ImportError("unavailable", "EPUB import is not available yet.");
    let parsed;
    try { parsed = await parser(file); }
    catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError("read", "This file could not be read. Try selecting it again.");
    }
    const book = createBook(parsed, { name: file.name, format });
    book.id = await fingerprint(await file.arrayBuffer());
    return book;
  }
  async function fingerprint(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return "sha256:" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join("");
  }
  async function fromText(title, content) {
    const book = createBook({ title, content: String(content || "").trim() }, { name: "Pasted text", format: "txt" });
    book.id = await fingerprint(new TextEncoder().encode(book.content));
    return book;
  }
  registerParser("txt", async file => ({ content: await file.text() }));
  window.BibliothekImport = Object.freeze({ fromFile, fromText, registerParser, ImportError });
})();
