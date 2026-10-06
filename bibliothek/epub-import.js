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
    const paragraphs = [], paragraphKinds = [], anchors = Object.create(null);
    let pendingKind = "p";
    let pending = "";
    const flush = () => { const text = clean(pending); if (text) { paragraphs.push(text); paragraphKinds.push(pendingKind); } pending = ""; pendingKind = "p"; };
    const blocks = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "tr", "figure", "figcaption", "dl", "dt", "dd"]);
    const excluded = new Set(["script", "style", "noscript", "iframe", "object", "svg", "math"]);
    function walk(node) {
      if (node.nodeType === 3 || node.nodeType === 4) { pending += node.nodeValue; return; }
      if (node.nodeType !== 1) return;
      const tag = node.localName.toLowerCase();
      if (excluded.has(tag) || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return;
      if (tag === "br") { pending += "\n"; return; }
      if (blocks.has(tag)) flush();
      const anchor = node.getAttribute("id") || node.getAttribute("name");
      if (anchor) anchors[anchor] = paragraphs.length;
      if (/^h[1-6]$/.test(tag)) pendingKind = tag;
      if (tag === "td" || tag === "th") pending += " ";
      for (const child of node.childNodes) walk(child);
      if (blocks.has(tag)) flush();
    }
    walk(body); flush();
    const heading = ["h1", "h2", "h3"].map(tag => elements(body, tag)[0]).find(Boolean);
    return { title: clean(heading?.textContent || elements(doc, "title")[0]?.textContent), paragraphs, paragraphKinds, anchors };
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
      if (chapter.paragraphs.length) chapters.push({ id: ref.getAttribute("idref"), href: path, title: chapter.title || `Chapter ${chapters.length + 1}`, paragraphs: chapter.paragraphs, paragraphKinds: chapter.paragraphKinds, anchors: chapter.anchors });
    }
    if (!chapters.length) fail("This EPUB contains no readable text.");
    // Navigation is optional: a broken TOC must not make readable spine text unusable.
    function destination(base, href) {
      try {
        const path = resolvePath(base, String(href).startsWith("#") ? base.split("/").pop() + href : href);
        const chapterIndex = chapters.findIndex(chapter => chapter.href === path);
        if (chapterIndex < 0) return null;
        const fragment = decodeURIComponent(String(href).split("#")[1] || "");
        if (fragment && !Object.hasOwn(chapters[chapterIndex].anchors, fragment)) return null;
        return { chapterIndex, paragraph: fragment ? chapters[chapterIndex].anchors[fragment] : 0 };
      } catch (_) { return null; }
    }
    let contents = [];
    const navItem = [...items.values()].find(item => (item.getAttribute("properties") || "").split(/\s+/).includes("nav"));
    if (navItem) {
      try {
        const path = resolvePath(packagePath, navItem.getAttribute("href"));
        const doc = xml(await read(path));
        const nav = elements(doc, "nav").find(node => (node.getAttributeNS("http://www.idpf.org/2007/ops", "type") || node.getAttribute("epub:type") || "").split(/\s+/).includes("toc"));
        function walkList(list, depth = 0, parentTitles = []) {
          for (const li of [...list.children].filter(node => node.localName === "li")) {
            const label = [...li.children].find(node => ["a", "span"].includes(node.localName));
            const title = clean(label?.textContent);
            const target = label?.localName === "a" ? destination(path, label.getAttribute("href")) : null;
            if (title) contents.push({ title, depth, parentTitles, ...(target || {}), navigable: Boolean(target) });
            for (const child of [...li.children].filter(node => node.localName === "ol")) walkList(child, depth + 1, title ? [...parentTitles, title] : parentTitles);
          }
        }
        const list = nav && [...nav.children].find(node => node.localName === "ol");
        if (list) walkList(list);
      } catch (_) { contents = []; }
    }
    if (!contents.some(entry => entry.navigable)) {
      contents = [];
      const ncxItem = items.get(spine.getAttribute("toc")) || [...items.values()].find(item => item.getAttribute("media-type") === "application/x-dtbncx+xml");
      if (ncxItem) {
        try {
          const path = resolvePath(packagePath, ncxItem.getAttribute("href"));
          const doc = xml(await read(path));
          function walkPoints(parent, depth = 0, parentTitles = []) {
            for (const point of [...parent.children].filter(node => node.localName === "navPoint")) {
              const label = [...point.children].find(node => node.localName === "navLabel");
              const title = clean(label?.textContent);
              const content = [...point.children].find(node => node.localName === "content");
              const target = destination(path, content?.getAttribute("src") || "");
              if (title) contents.push({ title, depth, parentTitles, ...(target || {}), navigable: Boolean(target) });
              walkPoints(point, depth + 1, title ? [...parentTitles, title] : parentTitles);
            }
          }
          const map = elements(doc, "navMap")[0];
          if (map) walkPoints(map);
        } catch (_) { contents = []; }
      }
    }
    if (!contents.some(entry => entry.navigable)) contents = chapters.map((chapter, chapterIndex) => ({ title: chapter.title, chapterIndex, paragraph: 0, depth: 0, parentTitles: [], navigable: true }));
    for (const entry of contents) {
      if (!entry.navigable) continue;
      const label = entry.title.toLocaleLowerCase().replace(/[.\s]+$/g, "");
      if (/^(titel|title|title page|cover|copyright|inhaltsverzeichnis|contents|table of contents|impressum)$/.test(label)) entry.frontMatter = true;
    }
    // Keep unlisted front matter available without assigning it a chapter number.
    chapters.forEach((chapter, chapterIndex) => {
      if (!contents.some(entry => entry.navigable && entry.chapterIndex === chapterIndex && entry.paragraph === 0)) {
        const entry = { title: chapter.title, chapterIndex, paragraph: 0, depth: 0, parentTitles: [], navigable: true, frontMatter: true };
        const next = contents.findIndex(item => item.navigable && item.chapterIndex >= chapterIndex);
        contents.splice(next < 0 ? contents.length : next, 0, entry);
      }
    });
    const metadata = elements(pkg, "metadata")[0];
    return { title: metadata ? clean(elements(metadata, "title")[0]?.textContent) : "", chapters, contents, content: chapters.map(chapter => chapter.paragraphs.join("\n\n")).join("\n\n") };
  });
})();
