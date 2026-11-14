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
  // marks: [{ start, end, kind: "i" | "b" | "spaced" | "sc" | "small" }], langs: [{ start, end, lang }],
  // gapBefore: true (a scene break: <hr> or a book "break" class with a top margin), quote: true (inside <blockquote>;
  // quoteEnd on the last paragraph of it),
  // verse: true with stanzaStart / verseEnd (lines of div.poem > div.stanza > div.line — each line stays its own
  // paragraph, as before), stanzaBreaks: [offsets among lineBreaks where the book has an empty line — two <br> in a
  // row], pre: true (inside <pre>) }. Lines of a poem also come from paragraphs inside a poem container (Wikisource
  // div.poem > p), from inline elements the book shows as blocks (span.line) and from line ends inside <pre>.
  // lineIndents: [left indent in em of each line — one entry per line of lineBreaks + 1] when a line starts with an
  // indented inline element (a shaped poem such as the mouse tail in «Alice», Gutenberg .poem span.i2).
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
  const STYLE_PROPERTIES = ["text-align", "font-style", "font-weight", "font-variant", "letter-spacing", "margin-top", "margin", "display", "list-style-type", "list-style", "margin-left", "padding-left", "text-indent"];
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
  const BREAK_CLASS = /(?:^|[\s_-])(break|scene|space|spacer|gap|sep|separator)(?:$|[\s_-])/i, PAGE_CLASS = /page/i;
  const VERSE_LINE_CLASS = /(?:^|\s)(line|verse-?line|vers|zeile)(?:\s|$)/i, STANZA_CLASS = /(stanza|strophe)/i, POEM_CLASS = /(poem|verse|gedicht)/i;
  const POEM_CONTAINER = /(?:^|\s)(poem|poetry|verse|gedicht|lyrics?)(?:\s|$)/i;
  const ORNAMENT = /^[*\s⁂·•—–\-_~#x✱✳]+$/;
  function topMargin(props) {
    const value = props["margin-top"] || (props.margin || "").split(/\s+/)[0] || "";
    const match = /^(\d*\.?\d+)(em|rem|px|pt)$/.exec(value);
    if (!match) return 0;
    const n = parseFloat(match[1]);
    return match[2] === "px" ? n / 16 : match[2] === "pt" ? n / 12 : n;
  }
  // Text clean-up of new imports (D23 step 3, advisor 12.11): these change the paragraph text, so books imported
  // before keep their stored text and offsets.
  // (a) Page numbers set into the text are dropped — only by markup: a page-number class, epub:type="pagebreak" or
  //     role="doc-pagebreak"; never a note reference (epub:type="noteref" / role="doc-noteref"), never by the look of
  //     the text («[2]» as plain text or as a note link stays).
  const PAGE_NUMBER_CLASSES = new Set(["pagenum", "pageno", "page-num", "page-number", "pagenumber", "x-ebookmaker-pageno", "seitenzahl"]);
  const isNoteRef = node => /\bnoteref\b/i.test(node.getAttributeNS("http://www.idpf.org/2007/ops", "type") || node.getAttribute("epub:type") || "") || /\bdoc-noteref\b/i.test(node.getAttribute("role") || "");
  function isPageNumber(node) {
    if (isNoteRef(node)) return false;
    const type = node.getAttributeNS("http://www.idpf.org/2007/ops", "type") || node.getAttribute("epub:type") || "";
    const marked = /\bpagebreak\b/i.test(type) || /\bdoc-pagebreak\b/i.test(node.getAttribute("role") || "") ||
      (node.getAttribute("class") || "").split(/\s+/).some(name => PAGE_NUMBER_CLASSES.has(name.toLowerCase()));
    if (!marked) return false;
    for (const inner of node.getElementsByTagName("*")) if (isNoteRef(inner)) return false;
    return true;
  }
  // (c) U+00AD (soft hyphen) is removed everywhere; U+200B (zero-width space) only between two letters — elsewhere
  //     (after «/», «-», at a node edge) it stays, as the word break it is.
  function cleanTextNode(value, before) {
    if (!/[\u00ad\u200b]/.test(value)) return value;
    value = value.replace(/\u00ad/g, "");
    let out = "";
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (ch === "\u200b") {
        const prev = i ? out[out.length - 1] : before, next = value[i + 1];
        if (prev && next && /\p{L}/u.test(prev) && /\p{L}/u.test(next)) continue;
      }
      out += ch;
    }
    return out;
  }
  const BLOCK_DISPLAY = /^(block|flex|grid|list-item|table)$/;
  // Footnotes (D24 step 2, 12.11.2026): a note reference keeps its text («[1]», «1») in the paragraph and gets a mark
  // { kind: "noteref", target: "<file>#<id>" }; paragraphs inside the note body get note: true (noteStart on the first
  // of a run); chapter.notes maps the targets its references use to the note text shown on tap. Nothing changes the
  // paragraph text.
  const NOTEREF_TYPE = /\b(noteref|annoref)\b/i, NOTEREF_CLASS = /(?:^|\s)(fnanchor|noteref|footnote-?ref|fn-?ref|footnote-?link)(?:\s|$)/i;
  const BACKLINK = /(?:^|\s)(mw-cite-backlink|footnote-?back(link)?|fn-?back|backlink)(?:\s|$)/i;
  const epubType = node => node.getAttributeNS("http://www.idpf.org/2007/ops", "type") || node.getAttribute("epub:type") || "";
  function noteTarget(node, path) {
    // A link to a footnote: epub:type noteref / annoref, role doc-noteref, a footnote-link class, or an internal link
    // that is (or sits in) a superscript.
    if (node.nodeType !== 1 || node.localName.toLowerCase() !== "a") return null;
    const href = node.getAttribute("href") || "";
    const hash = href.indexOf("#");
    if (hash < 0 || /^[a-z]+:/i.test(href)) return null;
    const marked = NOTEREF_TYPE.test(epubType(node)) || /\bdoc-noteref\b/i.test(node.getAttribute("role") || "") || NOTEREF_CLASS.test(node.getAttribute("class") || "") ||
      node.parentNode?.localName?.toLowerCase() === "sup" || node.getElementsByTagName("sup").length > 0;
    if (!marked) return null;
    let file = path;
    if (hash > 0) { try { file = resolvePath(path, href.slice(0, hash)); } catch (_) { return null; } }
    const id = decodeURIComponent(href.slice(hash + 1));
    return id ? `${file}#${id}` : null;
  }
  function noteText(node) {
    // The note as shown on tap: its text without back links («↑», «^», «Zurück»).
    const copy = node.cloneNode(true);
    for (const el of [...copy.getElementsByTagName("*")]) {
      const role = el.getAttribute("role") || "", type = epubType(el);
      if (/\bdoc-backlink\b/i.test(role) || /\bbacklink\b/i.test(type) || BACKLINK.test(el.getAttribute("class") || "")) el.parentNode?.removeChild(el);
    }
    return clean(copy.textContent).replace(/^[↑↩^⇧]+\s*/u, "");
  }
  // Lists (D24 step 3, 14.11.2026): the paragraphs of a list item get list: { depth, marker? } — the marker («3.», «c.»,
  // «iv.», «•», «◦», «▪») only on the item's first paragraph, none for list-style none. The marker is drawn by CSS, so
  // the paragraph text stays as before. Numbering follows <ol start>, <li value>, <ol type> and the book's class rules.
  const LIST_STYLES = ["decimal-leading-zero", "decimal", "lower-alpha", "upper-alpha", "lower-latin", "upper-latin", "lower-roman", "upper-roman", "disc", "circle", "square", "none"];
  function listStyle(props) {
    const own = (props["list-style-type"] || "").trim();
    if (LIST_STYLES.includes(own)) return own;
    return (props["list-style"] || "").split(/\s+/).find(word => LIST_STYLES.includes(word)) || null;
  }
  function roman(n) {
    let out = "";
    for (const [v, r] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]) while (n >= v) { out += r; n -= v; }
    return out;
  }
  function letters(n) { let out = ""; while (n > 0) { n--; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); } return out; }
  function listMarker(style, n) {
    switch (style) {
      case "none": return "";
      case "disc": return "•";
      case "circle": return "◦";
      case "square": return "▪";
      case "decimal-leading-zero": return `${n < 10 && n >= 0 ? "0" : ""}${n}.`;
      case "lower-alpha": case "lower-latin": return n > 0 ? `${letters(n)}.` : `${n}.`;
      case "upper-alpha": case "upper-latin": return n > 0 ? `${letters(n).toUpperCase()}.` : `${n}.`;
      case "lower-roman": return n > 0 && n < 4000 ? `${roman(n)}.` : `${n}.`;
      case "upper-roman": return n > 0 && n < 4000 ? `${roman(n).toUpperCase()}.` : `${n}.`;
      default: return `${n}.`;
    }
  }
  // Left indent of a line (D24 step 3b, «Alice» mouse tail, Gutenberg .poem span.i4): margin-left + padding-left of
  // an inline element, plus text-indent when the book shows it as a block — in em; null when the element sets none.
  function lengthEm(value) {
    const m = /^(-?(?:\d*\.)?\d+)(em|rem|px|pt|ex|ch)?$/.exec(String(value || "").trim());
    if (!m) return null;
    const n = parseFloat(m[1]);
    return !m[2] ? (n === 0 ? 0 : null) : m[2] === "px" ? n / 16 : m[2] === "pt" ? n / 12 : m[2] === "ex" || m[2] === "ch" ? n / 2 : n;
  }
  function lineIndent(props, blockLike) {
    const parts = ["margin-left", "padding-left", ...(blockLike ? ["text-indent"] : [])].filter(key => props[key] != null);
    if (!parts.length) return null;
    let em = 0;
    for (const key of parts) { const v = lengthEm(props[key]); if (v == null) return null; em += v; }
    return Math.round(Math.max(0, Math.min(em, 40)) * 10) / 10;
  }
  const OL_TYPES = { "1": "decimal", a: "lower-alpha", A: "upper-alpha", i: "lower-roman", I: "upper-roman" };
  function extractChapter(doc, rules = [], bookLang = "", notes = null) {
    const body = elements(doc, "body")[0];
    if (!body) fail("An EPUB chapter is missing its text body.");
    const paragraphs = [], paragraphKinds = [], paragraphLayout = [], anchors = Object.create(null);
    const base = value => String(value || "").toLowerCase().split(/[-_]/)[0];
    let pendingKind = "p";
    let pending = "", pendingBreaks = [], softBreaks = [], segments = [], indents = [], align = null, state = {};
    const gapAt = new Set();
    const noteSegments = [], listStack = [];
    let listItem = null;
    let noteDepth = 0;
    let quoteDepth = 0, quoteNode = null, lastQuote = null, verseStanza = null, lastStanza = null, preDepth = 0, stanzaNext = false;
    const flush = () => {
      const mapped = cleanMapped(pending), text = mapped ? mapped.text : clean(pending);
      let leadingBreak = false, trailingBreaks = 0;
      if (text) {
        paragraphs.push(text); paragraphKinds.push(pendingKind);
        const layout = {};
        if (mapped) {
          const counts = new Map();
          for (const i of pendingBreaks) counts.set(mapped.map[i], (counts.get(mapped.map[i]) || 0) + 1);
          // A block-shown inline element breaks the line but never makes an empty line by itself.
          for (const i of softBreaks) if (!counts.has(mapped.map[i])) counts.set(mapped.map[i], 1);
          const lineBreaks = [...counts.keys()].filter(at => text[at] === " " && at > 0 && at < text.length - 1).sort((x, y) => x - y);
          if (lineBreaks.length) layout.lineBreaks = lineBreaks;
          const stanzaBreaks = lineBreaks.filter(at => counts.get(at) >= 2);
          if (stanzaBreaks.length) layout.stanzaBreaks = stanzaBreaks;
          // In a poem, a <br> before the first line or two after the last one mark a stanza boundary.
          leadingBreak = counts.has(0) && text[0] !== " " && pendingBreaks.some(i => mapped.map[i] === 0 && /\s/.test(pending[i]));
          trailingBreaks = counts.get(text.length) || 0;
          const marks = [];
          for (const kind of MARK_KINDS) for (const r of rangesOf(segments, mapped.map, text, s => s[kind], () => kind)) marks.push({ start: r.start, end: r.end, kind });
          if (marks.length) layout.marks = marks.sort((x, y) => x.start - y.start || x.end - y.end);
          // The indent of each line: the first indented element that starts the line.
          if (indents.length) {
            const lineIndents = new Array(lineBreaks.length + 1).fill(null);
            for (const { at, em } of indents) {
              const m = mapped.map[at];
              if (m !== 0 && !lineBreaks.includes(m) && !lineBreaks.includes(m - 1)) continue;
              const line = lineBreaks.filter(b => b <= m && m !== 0).length;
              if (lineIndents[line] == null) lineIndents[line] = em;
            }
            if (lineIndents.some(em => em > 0)) layout.lineIndents = lineIndents.map(em => em ?? 0);
          }
          const langs = rangesOf(segments, mapped.map, text, s => s.lang && base(s.lang) !== base(bookLang), s => s.lang).map(r => ({ start: r.start, end: r.end, lang: r.value }));
          if (langs.length) layout.langs = langs;
        }
        if (align === "center" || align === "right") layout.align = align;
        const index = paragraphs.length - 1, previous = paragraphLayout[index - 1];
        if (gapAt.has(index) && index > 0 && !/^h[1-6]$/.test(pendingKind) && !ORNAMENT.test(text)) layout.gapBefore = true;
        if (previous?.quote && quoteNode !== lastQuote) previous.quoteEnd = true;
        if (quoteDepth) layout.quote = true;
        lastQuote = quoteNode;
        if (preDepth) layout.pre = true;
        if (noteDepth) { layout.note = true; if (!previous?.note) layout.noteStart = true; }
        if (listItem) {
          // No second marker when the book already prints one in the text («• You pay…», «1. …»).
          const printed = /^([•◦▪·*–—-]|\(?(\d+|[a-z]|[ivxlc]+)[.)])\s/i.test(text);
          layout.list = { depth: listItem.depth, ...(!listItem.used && listItem.marker && !printed ? { marker: listItem.marker } : {}) };
          listItem.used = true;
        }
        if (mapped) for (const seg of noteSegments) {
          let start = mapped.map[seg.start], end = mapped.map[seg.end];
          while (start < end && text[start] === " ") start++;
          while (end > start && text[end - 1] === " ") end--;
          if (start < end) (layout.marks ||= []).push({ start, end, kind: "noteref", target: seg.target });
        }
        if (layout.marks) layout.marks.sort((x, y) => x.start - y.start || x.end - y.end);
        if (verseStanza) {
          layout.verse = true;
          if (verseStanza !== lastStanza || stanzaNext || leadingBreak) layout.stanzaStart = true;
          lastStanza = verseStanza;
          stanzaNext = trailingBreaks >= 2;
        } else {
          stanzaNext = false;
          if (previous?.verse) previous.verseEnd = true;
          lastStanza = null;
        }
        paragraphLayout.push(Object.keys(layout).length ? layout : null);
      }
      pending = ""; pendingBreaks = []; softBreaks = []; segments = []; indents = []; noteSegments.length = 0; pendingKind = "p";
    };
    const blocks = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "tr", "figure", "figcaption", "dl", "dt", "dd"]);
    const excluded = new Set(["script", "style", "noscript", "iframe", "object", "svg", "math"]);
    function walk(node) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        const value = cleanTextNode(node.nodeValue, pending[pending.length - 1]);
        if (value && (MARK_KINDS.some(kind => state[kind]) || state.lang)) segments.push({ start: pending.length, end: pending.length + value.length, state });
        // Inside <pre> every line end is a line break (indentation still collapses, the text stays as before).
        if (preDepth && value) for (let i = value.indexOf("\n"); i >= 0; i = value.indexOf("\n", i + 1)) pendingBreaks.push(pending.length + i);
        pending += value; return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.localName.toLowerCase();
      if (excluded.has(tag) || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return;
      if (tag === "br") { pendingBreaks.push(pending.length); pending += "\n"; return; }
      // <hr> never splits text: the gap goes to the next paragraph that starts after it.
      if (tag === "hr") { gapAt.add(paragraphs.length + (pending.trim() ? 1 : 0)); return; }
      if (isPageNumber(node)) {
        // Keep its anchors (a contents entry may point at a page), drop its text.
        for (const el of [node, ...node.getElementsByTagName("*")]) { const id = el.getAttribute("id") || el.getAttribute("name"); if (id) anchors[id] = paragraphs.length; }
        return;
      }
      const block = blocks.has(tag), outer = align, outerState = state, outerStanza = verseStanza, props = ownStyle(node, rules);
      const className = node.getAttribute("class") || "";
      // (b) An inline element the book shows as a block (span.tit-block) is a word boundary.
      const blockLike = !block && BLOCK_DISPLAY.test(props.display || "");
      // An inline element shown as a block (span.line of a poem) also starts a new line.
      if (blockLike) { softBreaks.push(pending.length); pending += " "; }
      if (!block) { const em = lineIndent(props, blockLike); if (em != null) indents.push({ at: pending.length, em }); }
      if (block) {
        flush(); align = props["text-align"] || outer;
        if (BREAK_CLASS.test(className) && !PAGE_CLASS.test(className) && topMargin(props) >= 0.9) gapAt.add(paragraphs.length);
        if (tag === "blockquote" && !quoteDepth++) quoteNode = node;
        if (VERSE_LINE_CLASS.test(className)) {
          let up = node.parentNode, stanza = null;
          while (up && up.nodeType === 1 && !stanza) { const c = up.getAttribute("class") || ""; if (STANZA_CLASS.test(c) || POEM_CLASS.test(c)) stanza = up; up = up.parentNode; }
          if (stanza) verseStanza = stanza;
        } else if (!verseStanza && (tag === "p" || tag === "div")) {
          // Paragraphs inside a poem container (Wikisource div.poem > p) are lines of that poem.
          let up = node.parentNode;
          while (up && up.nodeType === 1 && !POEM_CONTAINER.test(up.getAttribute("class") || "")) up = up.parentNode;
          if (up && up.nodeType === 1) verseStanza = up;
        }
        if (tag === "pre") preDepth++;
      }
      state = inlineState(node, tag, props, outerState);
      const outerItem = listItem;
      if (tag === "ol" || tag === "ul") {
        const start = parseInt(node.getAttribute("start"), 10);
        // A contents list inside <nav> gets no numbers (readers show it as a plain list).
        let inNav = false;
        for (let up = node.parentNode; up && up.nodeType === 1; up = up.parentNode) if (up.localName.toLowerCase() === "nav") { inNav = true; break; }
        const style = inNav ? "none" : listStyle(props) || (tag === "ol" ? OL_TYPES[node.getAttribute("type")] || "decimal" : ["disc", "circle", "square"][Math.min(listStack.filter(l => l.kind === "ul").length, 2)]);
        listStack.push({ kind: tag, n: Number.isFinite(start) ? start - 1 : 0, style });
      }
      if (tag === "li" && listStack.length) {
        const list = listStack[listStack.length - 1], value = parseInt(node.getAttribute("value"), 10);
        list.n = Number.isFinite(value) ? value : list.n + 1;
        listItem = { marker: listMarker(listStyle(props) || list.style, list.n), depth: listStack.length, used: false };
      }
      const target = notes ? noteTarget(node, notes.path) : null, noteStart = pending.length;
      const ownId = node.getAttribute("id");
      const isNote = !!(notes && ownId && notes.targets.has(`${notes.path}#${ownId}`));
      if (isNote) noteDepth++;
      const anchor = node.getAttribute("id") || node.getAttribute("name");
      if (anchor) anchors[anchor] = paragraphs.length;
      if (/^h[1-6]$/.test(tag)) pendingKind = tag;
      if (tag === "td" || tag === "th") pending += " ";
      for (const child of node.childNodes) walk(child);
      if (target && pending.length > noteStart) noteSegments.push({ start: noteStart, end: pending.length, target });
      if (blockLike) { softBreaks.push(pending.length); pending += " "; }
      state = outerState;
      if (block) { flush(); align = outer; verseStanza = outerStanza; if (tag === "blockquote" && !--quoteDepth) quoteNode = null; if (tag === "pre") preDepth--; }
      if (isNote) noteDepth--;
      if (tag === "li") listItem = outerItem;
      if (tag === "ol" || tag === "ul") listStack.pop();
    }
    walk(body); flush();
    if (paragraphLayout.at(-1)?.verse) paragraphLayout.at(-1).verseEnd = true;
    if (paragraphLayout.at(-1)?.quote) paragraphLayout.at(-1).quoteEnd = true;
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
    // Footnotes, first pass: where the references point and what the notes say (notes may sit in another file, also in
    // a non-linear one). A broken file only loses its notes here; reading it below still reports the error.
    const docs = new Map(), noteRefs = new Set(), noteTexts = Object.create(null);
    for (const ref of elements(spine, "itemref")) {
      const item = items.get(ref.getAttribute("idref"));
      if (!item || item.getAttribute("media-type") !== "application/xhtml+xml") continue;
      try {
        const path = resolvePath(packagePath, item.getAttribute("href"));
        if (encrypted.has(path) || !zip.file(path)) continue;
        const doc = xml(await read(path));
        docs.set(path, doc);
        for (const a of elements(doc, "a")) { const target = noteTarget(a, path); if (target) noteRefs.add(target); }
      } catch (_) { /* reported below */ }
    }
    for (const [path, doc] of docs) for (const el of doc.getElementsByTagName("*")) {
      const id = el.getAttribute("id");
      if (id && noteRefs.has(`${path}#${id}`) && el.localName.toLowerCase() !== "a") noteTexts[`${path}#${id}`] = noteText(el);
    }
    const noteTargets = new Set(Object.keys(noteTexts));
    const chapters = [];
    for (const ref of elements(spine, "itemref")) {
      const item = items.get(ref.getAttribute("idref"));
      if (!item) fail("This EPUB references a missing chapter.");
      const path = resolvePath(packagePath, item.getAttribute("href"));
      if (encrypted.has(path)) fail("This EPUB is DRM-protected. Choose a DRM-free book.");
      if (ref.getAttribute("linear") === "no") continue;
      if (item.getAttribute("media-type") !== "application/xhtml+xml") fail("This EPUB contains an unsupported chapter format.");
      const doc = docs.get(path) || xml(await read(path));
      const chapter = extractChapter(doc, await chapterStyleRules(doc, path), bookLang, { path, targets: noteTargets });
      // The notes this chapter's references point to (a reference whose note was not found stays plain text).
      const notes = Object.create(null);
      (chapter.paragraphLayout || []).forEach((layout, i) => {
        if (!layout?.marks) return;
        layout.marks = layout.marks.filter(m => m.kind !== "noteref" || noteTexts[m.target] !== undefined);
        for (const m of layout.marks) if (m.kind === "noteref") notes[m.target] = noteTexts[m.target];
        if (!layout.marks.length) delete layout.marks;
        if (!Object.keys(layout).length) chapter.paragraphLayout[i] = null;
      });
      if (chapter.paragraphLayout && !chapter.paragraphLayout.some(Boolean)) delete chapter.paragraphLayout;
      if (chapter.paragraphs.length) chapters.push({ id: ref.getAttribute("idref"), href: path, title: chapter.title || `Chapter ${chapters.length + 1}`, paragraphs: chapter.paragraphs, paragraphKinds: chapter.paragraphKinds, anchors: chapter.anchors, ...(chapter.paragraphLayout ? { paragraphLayout: chapter.paragraphLayout } : {}), ...(Object.keys(notes).length ? { notes: { ...notes } } : {}) });
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
