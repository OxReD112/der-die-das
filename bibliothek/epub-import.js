(() => {
  "use strict";
  const { ImportError, registerParser } = window.BibliothekImport;
  const fail = message => { throw new ImportError("epub", message); };
  const elements = (node, name) => [...node.getElementsByTagNameNS("*", name)];
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  function xml(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (elements(doc, "parsererror").length) fail("This EPUB contains invalid XML or chapter markup.");
    return doc;
  }
  function resolvePath(base, href) {
    const value = String(href || "").split(/[?#]/)[0];
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(value)) fail("This EPUB references an unsupported resource.");
    let decoded;
    try { decoded = decodeURIComponent(value); } catch (_) { fail("This EPUB contains an invalid resource path."); }
    const parts = base.split("/").slice(0, -1);
    for (const part of decoded.split("/")) {
      if (part === "..") { if (!parts.length) fail("This EPUB contains an invalid resource path."); parts.pop(); }
      else if (part && part !== ".") parts.push(part);
    }
    return parts.join("/");
  }
  function extractChapter(doc) {
    const body = elements(doc, "body")[0];
    if (!body) fail("An EPUB chapter is missing its text body.");
    const paragraphs = [];
    let pending = "";
    const flush = () => { const text = clean(pending); if (text) paragraphs.push(text); pending = ""; };
    const blocks = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "tr", "figure", "figcaption", "dl", "dt", "dd"]);
    const excluded = new Set(["script", "style", "noscript", "iframe", "object", "svg", "math"]);
    function walk(node) {
      if (node.nodeType === 3 || node.nodeType === 4) { pending += node.nodeValue; return; }
      if (node.nodeType !== 1) return;
      const tag = node.localName.toLowerCase();
      if (excluded.has(tag) || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return;
      if (tag === "br") { pending += "\n"; return; }
      if (blocks.has(tag)) flush();
      if (tag === "td" || tag === "th") pending += " ";
      for (const child of node.childNodes) walk(child);
      if (blocks.has(tag)) flush();
    }
    walk(body); flush();
    const heading = ["h1", "h2", "h3"].map(tag => elements(body, tag)[0]).find(Boolean);
    return { title: clean(heading?.textContent || elements(doc, "title")[0]?.textContent), paragraphs };
  }
  registerParser("epub", async file => {
    if (file.size > 50 * 1024 * 1024) fail("This EPUB is too large. Choose a file smaller than 50 MB.");
    let zip;
    try { zip = await window.JSZip.loadAsync(await file.arrayBuffer()); }
    catch (_) { fail("This EPUB could not be opened. It may be damaged or password-protected."); }
    // JSZip 3.10.1 stores declared sizes here; cap expansion before decoding entries.
    const entries = Object.values(zip.files);
    if (entries.length > 10000 || entries.reduce((sum, entry) => sum + (entry._data?.uncompressedSize || 0), 0) > 100 * 1024 * 1024) fail("This EPUB is too large to import on this device.");
    async function read(path) {
      const entry = zip.file(path);
      if (!entry) fail("This EPUB is missing a required book file.");
      const bytes = await entry.async("uint8array");
      if (bytes.length > 10 * 1024 * 1024) fail("An EPUB chapter is too large to import.");
      let encoding = "utf-8";
      if (bytes[0] === 255 && bytes[1] === 254) encoding = "utf-16le";
      else if (bytes[0] === 254 && bytes[1] === 255) encoding = "utf-16be";
      else {
        const declaration = new TextDecoder().decode(bytes.slice(0, 200));
        encoding = /^\s*<\?xml[^>]*encoding=["']([^"']+)["']/i.exec(declaration)?.[1] || encoding;
      }
      try { return new TextDecoder(encoding, { fatal: true }).decode(bytes); }
      catch (_) { fail("This EPUB uses an unsupported or invalid text encoding."); }
    }
    if ((await read("mimetype")).trim() !== "application/epub+zip") fail("This file is not a valid EPUB book.");
    const container = xml(await read("META-INF/container.xml"));
    const rootfiles = elements(container, "rootfile");
    const root = rootfiles.find(item => item.getAttribute("media-type") === "application/oebps-package+xml") || rootfiles[0];
    const packagePath = resolvePath("", root?.getAttribute("full-path"));
    const pkg = xml(await read(packagePath));
    const manifest = elements(pkg, "manifest")[0], spine = elements(pkg, "spine")[0];
    if (!manifest || !spine) fail("This EPUB is missing its chapter list.");
    const items = new Map(elements(manifest, "item").map(item => [item.getAttribute("id"), item]));
    const encrypted = new Set();
    if (zip.file("META-INF/encryption.xml")) {
      const encryption = xml(await read("META-INF/encryption.xml"));
      for (const reference of elements(encryption, "CipherReference")) encrypted.add(resolvePath("", reference.getAttribute("URI")));
    }
    if (encrypted.has(packagePath)) fail("This EPUB is DRM-protected. Choose a DRM-free book.");
    const chapters = [];
    for (const ref of elements(spine, "itemref")) {
      const item = items.get(ref.getAttribute("idref"));
      if (!item) fail("This EPUB references a missing chapter.");
      const path = resolvePath(packagePath, item.getAttribute("href"));
      if (encrypted.has(path)) fail("This EPUB is DRM-protected. Choose a DRM-free book.");
      if (ref.getAttribute("linear") === "no") continue;
      if (item.getAttribute("media-type") !== "application/xhtml+xml") fail("This EPUB contains an unsupported chapter format.");
      const chapter = extractChapter(xml(await read(path)));
      if (chapter.paragraphs.length) chapters.push({ id: ref.getAttribute("idref"), href: path, title: chapter.title || `Chapter ${chapters.length + 1}`, paragraphs: chapter.paragraphs });
    }
    if (!chapters.length) fail("This EPUB contains no readable text.");
    const metadata = elements(pkg, "metadata")[0];
    return { title: metadata ? clean(elements(metadata, "title")[0]?.textContent) : "", chapters, content: chapters.map(chapter => chapter.paragraphs.join("\n\n")).join("\n\n") };
  });
})();
