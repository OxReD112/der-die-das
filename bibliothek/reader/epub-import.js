(() => {
  "use strict";
  const { ImportError, registerParser } = window.BibliothekImport;
  const fail = message => { throw new ImportError("epub", message); };
  const elements = (node, name) => [...node.getElementsByTagNameNS("*", name)];
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  function metadataAuthor(metadata) {
    if (!metadata) return "";
    const roles = elements(metadata, "meta").filter(node => node.getAttribute("property") === "role");
    const creators = elements(metadata, "creator").map(node => {
      const id = node.getAttribute("id");
      const values = [node.getAttributeNS("http://www.idpf.org/2007/opf", "role") || node.getAttribute("opf:role") || "",
        ...roles.filter(meta => id && meta.getAttribute("refines") === "#" + id).map(meta => meta.textContent)]
        .map(value => clean(value).toLowerCase()).filter(Boolean);
      return { name: clean(node.textContent), roles: values };
    }).filter(person => person.name);
    const authors = creators.filter(person => person.roles.includes("aut") || person.roles.includes("author"));
    const chosen = authors.length ? authors : creators.filter(person => !person.roles.length);
    return [...new Set(chosen.map(person => person.name))].join(", ");
  }
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
  // Layout beside the text (12.11.2026, D16 + D23 step 1): the paragraph strings stay exactly what clean() gave before,
  // so the resolver, word offsets, bookmarks and highlights see no change. A chapter may carry paragraphLayout — one
  // entry per paragraph, null or { lineBreaks: [offsets of the spaces that were <br>], align: "center" | "right",
  // marks: [{ start, end, kind: "i" | "b" | "spaced" | "sc" | "small" }], langs: [{ start, end, lang }] }.
  // Offsets are in the paragraph string; a mark never starts or ends on a space.
  function cleanMapped(raw) {
    // Same result as clean(raw), plus map[i] = offset in the result of raw position i (a whitespace run maps to its
    // one space; trimmed edges map to the start / end of the result).
    const map = new Array(raw.length + 1);
    let text = "", first = 0, last = raw.length;
    while (first < raw.length && /\s/.test(raw[first])) first++;
    while (last > first && /\s/.test(raw[last - 1])) last--;
    for (let i = 0; i < raw.length; i++) {
      if (i < first) { map[i] = 0; continue; }
      if (i >= last) { map[i] = text.length; continue; }
      if (/\s/.test(raw[i])) { if (!/\s/.test(raw[i - 1])) text += " "; map[i] = text.length - 1; }
      else { map[i] = text.length; text += raw[i]; }
    }
    map[raw.length] = text.length;
    return text === clean(raw) ? { text, map } : null;
  }
  const STYLE_PROPERTIES = ["text-align", "font-style", "font-weight", "font-variant", "letter-spacing"];
  function declarations(body) {
    const out = {};
    for (const [, name, value] of String(body || "").matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;]+)/gi)) {
      const key = name.toLowerCase();
      if (STYLE_PROPERTIES.includes(key)) out[key] = value.replace(/!important/i, "").trim().toLowerCase();
    }
    return out;
  }
  function styleRules(css) {
    const rules = [];
    css = css.replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g, (_, query, body) => /screen|all/i.test(query) || !query.trim() ? body : "");
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const props = declarations(body);
      if (!Object.keys(props).length || selectors.trim().startsWith("@")) continue;
      for (const selector of selectors.split(",")) {
        const last = selector.trim().split(/[\s>+~]+/).pop() || "";
        if (last.includes(":") || last.includes("[")) continue;
        const classes = [...last.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
        if (classes.length) rules.push({ tag: /^[a-z][\w-]*/i.exec(last)?.[0].toLowerCase() || "", classes, props });
      }
    }
    return rules;
  }
  function ownStyle(node, rules) {
    // Class rules of the book (tag-only rules are ignored), then the inline style.
    const tag = node.localName.toLowerCase(), classes = new Set((node.getAttribute("class") || "").split(/\s+/).filter(Boolean));
    const props = {};
    if (classes.size) for (const rule of rules) if ((!rule.tag || rule.tag === tag) && rule.classes.every(name => classes.has(name))) Object.assign(props, rule.props);
    return Object.assign(props, declarations(node.getAttribute("style")));
  }
  const ITALIC_TAGS = new Set(["em", "i", "cite", "dfn", "var"]), BOLD_TAGS = new Set(["b", "strong"]);
  function inlineState(node, tag, props, outer) {
    const state = { ...outer };
    if (ITALIC_TAGS.has(tag)) state.i = true;
    if (BOLD_TAGS.has(tag)) state.b = true;
    if (tag === "small") state.small = true;
    const style = props["font-style"], weight = props["font-weight"], variant = props["font-variant"], spacing = props["letter-spacing"];
    if (style) state.i = /^(italic|oblique)/.test(style);
    if (weight) state.b = /^(bold|bolder|[6-9]00)$/.test(weight);
    if (variant) state.sc = /small-caps/.test(variant);
    if (spacing) state.spaced = /^(?:\d*\.)?\d+(?:em|rem|ex|px|pt|ch)$/.test(spacing) && parseFloat(spacing) > 0;
    const lang = node.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang") || node.getAttribute("xml:lang") || node.getAttribute("lang");
    if (lang) state.lang = lang.toLowerCase();
    return state;
  }
  const MARK_KINDS = ["i", "b", "spaced", "sc", "small"];
  function rangesOf(segments, map, text, test, value) {
    // Merge raw text segments that pass test into ranges of the cleaned text, trimmed to non-space ends.
    const out = [];
    for (const seg of segments) {
      if (!test(seg.state)) continue;
      let start = map[seg.start], end = map[seg.end];
      while (start < end && text[start] === " ") start++;
      while (end > start && text[end - 1] === " ") end--;
      if (start >= end) continue;
      const prev = out[out.length - 1], v = value(seg.state);
      if (prev && prev.value === v && start <= prev.end + 1 && /^ ?$/.test(text.slice(prev.end, start))) prev.end = Math.max(prev.end, end);
      else out.push({ start, end, value: v });
    }
    return out;
  }
  function extractChapter(doc, rules = [], bookLang = "") {
    const body = elements(doc, "body")[0];
    if (!body) fail("An EPUB chapter is missing its text body.");
    const paragraphs = [], paragraphKinds = [], paragraphLayout = [], anchors = Object.create(null);
    const base = value => String(value || "").toLowerCase().split(/[-_]/)[0];
    let pendingKind = "p";
    let pending = "", pendingBreaks = [], segments = [], align = null, state = {};
    const flush = () => {
      const mapped = cleanMapped(pending), text = mapped ? mapped.text : clean(pending);
      if (text) {
        paragraphs.push(text); paragraphKinds.push(pendingKind);
        const layout = {};
        if (mapped) {
          const lineBreaks = [...new Set(pendingBreaks.map(i => mapped.map[i]).filter(at => text[at] === " " && at > 0 && at < text.length - 1))];
          if (lineBreaks.length) layout.lineBreaks = lineBreaks;
          const marks = [];
          for (const kind of MARK_KINDS) for (const r of rangesOf(segments, mapped.map, text, s => s[kind], () => kind)) marks.push({ start: r.start, end: r.end, kind });
          if (marks.length) layout.marks = marks.sort((x, y) => x.start - y.start || x.end - y.end);
          const langs = rangesOf(segments, mapped.map, text, s => s.lang && base(s.lang) !== base(bookLang), s => s.lang).map(r => ({ start: r.start, end: r.end, lang: r.value }));
          if (langs.length) layout.langs = langs;
        }
        if (align === "center" || align === "right") layout.align = align;
        paragraphLayout.push(Object.keys(layout).length ? layout : null);
      }
      pending = ""; pendingBreaks = []; segments = []; pendingKind = "p";
    };
    const blocks = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "tr", "figure", "figcaption", "dl", "dt", "dd"]);
    const excluded = new Set(["script", "style", "noscript", "iframe", "object", "svg", "math"]);
    function walk(node) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        const value = node.nodeValue;
        if (value && (MARK_KINDS.some(kind => state[kind]) || state.lang)) segments.push({ start: pending.length, end: pending.length + value.length, state });
        pending += value; return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.localName.toLowerCase();
      if (excluded.has(tag) || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return;
      if (tag === "br") { pendingBreaks.push(pending.length); pending += "\n"; return; }
      const block = blocks.has(tag), outer = align, outerState = state, props = ownStyle(node, rules);
      if (block) { flush(); align = props["text-align"] || outer; }
      state = inlineState(node, tag, props, outerState);
      const anchor = node.getAttribute("id") || node.getAttribute("name");
      if (anchor) anchors[anchor] = paragraphs.length;
      if (/^h[1-6]$/.test(tag)) pendingKind = tag;
      if (tag === "td" || tag === "th") pending += " ";
      for (const child of node.childNodes) walk(child);
      state = outerState;
      if (block) { flush(); align = outer; }
    }
    walk(body); flush();
    const heading = ["h1", "h2", "h3"].map(tag => elements(body, tag)[0]).find(Boolean);
    return { title: clean(heading?.textContent || elements(doc, "title")[0]?.textContent), paragraphs, paragraphKinds, anchors, ...(paragraphLayout.some(Boolean) ? { paragraphLayout } : {}) };
  }
  async function thumbnail(bytes, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      if (!image.naturalWidth || !image.naturalHeight) return null;
      const scale = Math.min(1, 800 / image.naturalWidth, 1200 / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let result = canvas.toDataURL("image/jpeg", .92);
      // Keep detailed artwork within a bounded storage budget; noisy covers can be larger.
      while(result.length>800000 && canvas.width>320){
        const smaller=document.createElement("canvas");smaller.width=Math.round(canvas.width*.8);smaller.height=Math.round(canvas.height*.8);
        smaller.getContext("2d").drawImage(canvas,0,0,smaller.width,smaller.height);
        canvas.width=smaller.width;canvas.height=smaller.height;context.drawImage(smaller,0,0);
        result=canvas.toDataURL("image/jpeg",.9);
      }
      return result.length<=800000?{data:result,aspectRatio:image.naturalWidth/image.naturalHeight}:null;
    } finally { URL.revokeObjectURL(url); }
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
    // Cover artwork is optional; never fail a readable book because of its cover.
    let coverThumbnail = null, coverAspectRatio = null;
    try {
      const metadata = elements(pkg, "metadata")[0];
      const coverId = metadata && elements(metadata, "meta").find(node => node.getAttribute("name") === "cover")?.getAttribute("content");
      const coverItem = [...items.values()].find(item => (item.getAttribute("properties") || "").split(/\s+/).includes("cover-image")) || items.get(coverId);
      let coverPath = coverItem && resolvePath(packagePath, coverItem.getAttribute("href"));
      let coverType = coverItem?.getAttribute("media-type");
      if (!coverPath) {
        const guideCover = elements(pkg, "reference").find(node => (node.getAttribute("type") || "").split(/\s+/).includes("cover"));
        if (guideCover) {
          const pagePath = resolvePath(packagePath, guideCover.getAttribute("href"));
          if (!encrypted.has(pagePath)) {
            const doc = xml(await read(pagePath));
            const image = elements(doc, "img")[0] || elements(doc, "image")[0];
            const href = image?.getAttribute("src") || image?.getAttribute("href") || image?.getAttributeNS("http://www.w3.org/1999/xlink", "href");
            if (href) {
              coverPath = resolvePath(pagePath, href);
              coverType = [...items.values()].find(item => resolvePath(packagePath, item.getAttribute("href")) === coverPath)?.getAttribute("media-type");
            }
          }
        }
      }
      // Raster input only: SVG covers may depend on external resources.
      if (coverPath && !encrypted.has(coverPath) && /^image\/(jpeg|png|webp|gif)$/i.test(coverType || "")) {
        const entry = zip.file(coverPath);
        if (entry && (entry._data?.uncompressedSize || 0) <= 10 * 1024 * 1024) {
          const bytes = await entry.async("uint8array");
          if (bytes.length <= 10 * 1024 * 1024) {const cover=await thumbnail(bytes, coverType);if(cover){coverThumbnail=cover.data;coverAspectRatio=cover.aspectRatio;}}
        }
      }
    } catch (_) { /* Keep the standard cover when artwork is missing or damaged. */ }
    // Book stylesheets are read only for alignment and inline emphasis (text-align, font-style, font-weight,
    // font-variant, letter-spacing); a missing or broken stylesheet only loses that layout.
    const styleCache = new Map();
    async function chapterStyleRules(doc, path) {
      const rules = [];
      for (const node of [...elements(doc, "link"), ...elements(doc, "style")]) {
        if (node.localName === "style") { rules.push(...styleRules(node.textContent || "")); continue; }
        if (!/stylesheet/i.test(node.getAttribute("rel") || "") || !node.getAttribute("href")) continue;
        let cssPath;
        try { cssPath = resolvePath(path, node.getAttribute("href")); } catch (_) { continue; }
        if (!styleCache.has(cssPath)) {
          let parsed = [];
          try { if (!encrypted.has(cssPath) && zip.file(cssPath)) parsed = styleRules(await read(cssPath)); } catch (_) { parsed = []; }
          styleCache.set(cssPath, parsed);
        }
        rules.push(...styleCache.get(cssPath));
      }
      return rules;
    }
    const bookLang = clean(elements(pkg, "language")[0]?.textContent);
    const chapters = [];
    for (const ref of elements(spine, "itemref")) {
      const item = items.get(ref.getAttribute("idref"));
      if (!item) fail("This EPUB references a missing chapter.");
      const path = resolvePath(packagePath, item.getAttribute("href"));
      if (encrypted.has(path)) fail("This EPUB is DRM-protected. Choose a DRM-free book.");
      if (ref.getAttribute("linear") === "no") continue;
      if (item.getAttribute("media-type") !== "application/xhtml+xml") fail("This EPUB contains an unsupported chapter format.");
      const doc = xml(await read(path));
      const chapter = extractChapter(doc, await chapterStyleRules(doc, path), bookLang);
      if (chapter.paragraphs.length) chapters.push({ id: ref.getAttribute("idref"), href: path, title: chapter.title || `Chapter ${chapters.length + 1}`, paragraphs: chapter.paragraphs, paragraphKinds: chapter.paragraphKinds, anchors: chapter.anchors, ...(chapter.paragraphLayout ? { paragraphLayout: chapter.paragraphLayout } : {}) });
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
    const author = metadataAuthor(metadata);
    return { ...(author ? { author } : {}), ...(coverThumbnail ? { coverThumbnail, coverAspectRatio } : {}), title: metadata ? clean(elements(metadata, "title")[0]?.textContent) : "", chapters, contents, content: chapters.map(chapter => chapter.paragraphs.join("\n\n")).join("\n\n") };
  });
})();
