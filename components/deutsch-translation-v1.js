/* Deutsch. — shared translation language helper (v1)
   Deployed path: components/deutsch-translation-v1.js
   (local folder: "deutsch components/")

   Setting: Home → Settings → Deine Sprache  (English · Русский · Polski …)
   Stored in localStorage "deutschTranslationLangV1" as the language code ("en", "ru", "pl" …).
   Default is "en". Included in Backup (Home → BACKUP_MODULES.translations);
   Restore writes the value JSON-encoded ('"en"'), which the reader also accepts.

   Built-in languages: en, ru — their texts live in the app's own data, as before.
   Language packs (17.11.2026, chat "languages"; claude/LANG_CORE_PLAN_2026-11-17_RU.md): every other
   language is a folder lang/<code>/ (manifest.json, exercises/*.json, worterbuch/*.json, wortschatz/*.json,
   ui.json) that is fetched only when that language is chosen. With a pack language the app works exactly
   as in English (getLang() answers "en"), and only what is shown changes: a pack text where there is one,
   otherwise the English one.

   Data format for any translated field in a database:
     - one translation   → plain string, always shown as is
                           "translation": "newspaper"
     - several           → object keyed by language, the setting picks
                           "translation": { "ru": "газета", "en": "newspaper" }
   Built-in language missing in an object → the other one is shown, so nothing ever comes out empty.
   Pack language → value.<code> (written in by apply()), else the pack's text for the same en + ru pair,
   else English. Uploaded databases only need the plain string form.

   API (window.DeutschTranslation):
     getLang()            "en" | "ru" — the base language; old code keeps asking this (a pack language → "en")
     getDisplayLang()     the chosen language, e.g. "pl"
     setLang(code)        choose; fires "deutschtranslationchange" on window when the shown language changes
     languages()          [{code, name, pack}] in menu order
     packState(code)      "builtin" · "ready" (downloaded in full, this version) · "none"; packSize(code) "4 MB"
     download(code)       Promise<boolean>: fetches the whole pack (manifest + its files, not the reader dictionary)
     addPack(code, info)  checks only: a test pack language (lang/<code>/) without changing PACKS (see below)
     pick(value)          see the data format above
     t(en, ru, …args)     a text written in code; "{0}", "{1}" … are filled with args, "{0|word|words}" is the
                          plural for args[0] (forms: one|other in English, one|few|many in Russian and Polish)
     table(T)             T = {en: …, ru: …} (strings or objects of strings) → the shown language's version
     field(item, name)    item[name_<lang>] with the same fallback (e.g. field(card, "translation"))
     ready(files, fn)     built-in language → fn() at once; pack language → after the pack files are loaded
                          (files relative to lang/<code>/, e.g. ["worterbuch/german-nouns.json"])
     apply(data, file)    write pack texts into the {ru, en} objects under data (file e.g. "wortschatz/b1-b2.json")
   Pages list on this script's tag the data files whose texts they need at once: data-pack="Artikel/words.js"
   (the pack's manifest says which pack file belongs to it), or pack files themselves ("exercises/….json");
   with a pack language they are read before the page's own scripts (ui.json and manifest.json always).
     packEntries(file)    the loaded entries of a pack file (array or object), or null */
/* German next to a {ru, en} pair in exercise / Wortschatz data (17.11.2026, chats of languages): ONE rule for the
   language chats' extraction (dev/lang/extract.cjs requires this file) and for the app, which needs it when a pack
   gives one en + ru pair different texts for different German ("de" in the pack entry).
     contextFor(node, path, stack) → string ('' possible)
       node  — the pair object {ru, en, …}; path — from the root, e.g. "window.PARTIKELN_SENTENCES[99].particles.doch.translation"
       stack — the objects from the root down to the pair's parent (the last one is the parent)
   Rules: 1. the pair's own de; 2. key «xxxTranslation» → the parent's xxx; 3. a sentence with «___» above (Partikeln,
   Modalverben, Vielseitige Verben): in particles.<p>.… → with the particle as the key is written (DOCH — stressed);
   parent with accept → with accept[0] and «  [+ the rest]»; in base.… → without the gap; answer / correctAnswer →
   with it; 4. parent with noun and article → «article noun»; 5. else the first non-empty DE_KEYS field of the parent,
   then further up. */
(function(root, make){
  var api = make();
  if(typeof module === "object" && module.exports) module.exports = api;
  else root.DeutschLangDe = api;
})(typeof window !== "undefined" ? window : this, function(){
  var DE_KEYS = ["de", "german", "sentence", "title", "example", "ex", "satz", "text", "phrase", "example_de", "noun", "word", "infinitive", "verb", "prep", "preposition", "place", "form"];
  function isStr(v){ return typeof v === "string"; }
  function germanContext(parent, stack){
    var list = [parent].concat(stack.slice().reverse());
    for(var i = 0; i < list.length; i++){
      var obj = list[i];
      if(!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
      for(var j = 0; j < DE_KEYS.length; j++){ var v = obj[DE_KEYS[j]]; if(isStr(v) && v.trim()) return v; }
    }
    return "";
  }
  function contextFor(node, p, stack){
    if(isStr(node.de)) return node.de;
    var parent = stack[stack.length - 1];
    var key = (p.match(/\.([^.\[\]]+)$/) || [])[1] || "";
    var m = key.match(/^(.*)Translation$/);
    if(m && parent && isStr(parent[m[1] || "sentence"])) return parent[m[1] || "sentence"];
    var sent = null;
    for(var i = 0; i < stack.length; i++){ var o = stack[i]; if(o && !Array.isArray(o) && isStr(o.sentence) && o.sentence.indexOf("___") !== -1){ sent = o; break; } }
    if(sent){
      var pm = p.match(/\.particles\.([^.]+)\./);
      if(pm) return sent.sentence.replace("___", function(){ return pm[1]; });
      if(parent && Array.isArray(parent.accept) && parent.accept.length)
        return sent.sentence.replace("___", function(){ return parent.accept[0]; }) + (parent.accept.length > 1 ? "  [+ " + parent.accept.slice(1).join(", ") + "]" : "");
      if(/\.base\./.test(p)) return sent.sentence.replace(/\s*___\s*/, " ");
      if(isStr(sent.answer)) return sent.sentence.replace("___", function(){ return sent.answer; });
      if(isStr(sent.correctAnswer)) return sent.sentence.replace("___", function(){ return sent.correctAnswer; });
    }
    if(parent && isStr(parent.noun) && isStr(parent.article)) return parent.article + " " + parent.noun;
    return germanContext(parent, stack.slice(0, -1));
  }
  /* sourcePrint(card) → 8 hex digits (17.11.2026, advisor): the print of the English a pack translated an own-dictionary
     card from — every English text of the card (keys "en" and «…_en», strings or lists; keys of every object sorted) through
     FNV-1a. The pack keeps it as "_src" next to the card's texts; when the app's English has changed since, the print
     differs and the card is shown in English (never a Polish text for an older English). dev/lang/stamp.cjs writes it,
     dev/lang/pack-coverage.cjs lists the cards whose print no longer matches; the reader checks it the same way. */
  function sourcePrint(card){
    var parts = [];
    (function walk(o, p){
      if(!o || typeof o !== "object") return;
      if(Array.isArray(o)){ for(var i = 0; i < o.length; i++) walk(o[i], p + "[" + i + "]"); return; }
      /* keys in sorted order (18.11.2026, advisor, Ч6б): the print doesn't depend on the order of a card's fields — the
         reader keeps a card in two parts and puts them together in another order */
      var keys = Object.keys(o).sort();
      for(var ki = 0; ki < keys.length; ki++){
        var k = keys[ki], v = o[k];
        if((k === "en" || /_en$/.test(k)) && (isStr(v) || Array.isArray(v))) parts.push(p + "." + k + "=" + JSON.stringify(v));
        else if(v && typeof v === "object") walk(v, p + "." + k);
      }
    })(card, "");
    return fnv(parts.join("\n"));
  }
  function fnv(text){
    var h = 0x811c9dc5;
    for(var j = 0; j < text.length; j++){ h ^= text.charCodeAt(j); h = Math.imul(h, 0x01000193) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  /* placeKey(node, path, stack) → 8 hex digits (18.11.2026, Alena: a typo fixed in the Russian or English must not take
     the translation away): the place of a {ru, en} pair by its GERMAN — contextFor + the field it stands in (last name of
     the path, without [n]). A pack entry lists the places it was translated for as "at": [keys]; when the app's en / ru
     of a place no longer match any entry, the entry whose "at" has the place's key is shown (dev/lang/stamp.cjs writes
     "at", dev/lang/pack-coverage.cjs lists such places as "carried" for the language chat to look at). */
  function placeKey(node, p, stack){
    var field = String(p || "").replace(/\[\d+\]/g, "").replace(/^.*\./, "");
    return fnv(contextFor(node, p, stack) + "\u241f" + field);
  }
  return { contextFor: contextFor, germanContext: germanContext, DE_KEYS: DE_KEYS, sourcePrint: sourcePrint, placeKey: placeKey };
});

(function(){
  if(typeof window === "undefined") return; // in Node (dev/lang) only the German-context rule above is used
  var KEY = "deutschTranslationLangV1";
  var BUILTIN = ["en", "ru"];
  /* Pack languages: code → name and pack version (the version goes into every pack address as ?v=). */
  var PACKS = {
    pl: { name: "Polski", version: "0", size: "4 MB", published: false }
  };
  /* Test packs (17.11.2026, for checks only: "a new language needs no code"): a test registers a pack language
     without touching PACKS — localStorage "deutschLangTestPacksV1" = {"zz": {"name": "Testsprache", "version": "1"}}
     (read here, before the page's scripts) or DeutschTranslation.addPack("zz", {…}) later. Its files: lang/zz/.
     A test pack is offered as if published. Not for real languages — those are a line in PACKS. */
  (function(){
    try{
      var tp = JSON.parse(localStorage.getItem("deutschLangTestPacksV1") || "null");
      if(tp && typeof tp === "object") for(var c in tp) addTestPack(c, tp[c]);
    }catch(e){}
  })();
  function addTestPack(code, info){
    if(!/^[a-z]{2,3}$/.test(code) || code === "xx" || code === "en" || code === "ru" || PACKS[code]) return false;
    PACKS[code] = { name: String(info && info.name || code), version: String(info && info.version || "0"),
      size: String(info && info.size || ""), published: true, test: true };
    return true;
  }
  /* A pack that is not published yet (its files are not on the site) is not offered in the menu and cannot be
     chosen — except on a device with localStorage "deutschLangPreviewV1" = "1" (for checking a pack before release). */
  function previewOn(){ try{ return localStorage.getItem("deutschLangPreviewV1") === "1"; }catch(e){ return false; } }
  function offered(code){ return !!PACKS[code] && (PACKS[code].published || previewOn()); }
  var PACKS_KEY = "deutschLangPacksV1"; // {code: version} of packs downloaded in full on this device
  var NAMES = { en: "English", ru: "Русский" };
  var DEFAULT = "en";
  var SEP = "␟";

  /* Test language "xx" (dev/lang): every translatable text is shown as ⟦English⟧. Turned on only by
     localStorage "deutschPseudoLangV1" = "1", never offered in the menu. */
  function pseudoOn(){ try{ return localStorage.getItem("deutschPseudoLangV1") === "1"; }catch(e){ return false; } }

  function isPack(code){ return (Object.prototype.hasOwnProperty.call(PACKS, code) && offered(code)) || (code === "xx" && pseudoOn()); }
  function known(code){ return BUILTIN.indexOf(code) !== -1 || isPack(code); }

  function stored(){
    try{
      var v = localStorage.getItem(KEY);
      if(v && v.charAt(0) === '"'){ try{ v = JSON.parse(v); }catch(e){} }
      return known(v) ? v : DEFAULT;
    }catch(e){ return DEFAULT; }
  }

  function getDisplayLang(){ return stored(); }
  function getLang(){ var v = stored(); return v === "ru" ? "ru" : "en"; }

  function setLang(lang){
    if(!known(lang)) return;
    var previous = getDisplayLang();
    try{ localStorage.setItem(KEY, lang); }catch(e){}
    if(getDisplayLang() !== previous) window.dispatchEvent(new CustomEvent("deutschtranslationchange"));
  }

  function languages(){
    var list = BUILTIN.map(function(c){ return { code: c, name: NAMES[c], pack: false }; });
    /* (pack languages after the built-in ones, in PACKS order) */
    for(var c in PACKS) if(offered(c)) list.push({ code: c, name: PACKS[c].name, pack: true });
    return list;
  }

  /* ---------- packs ---------- */
  var script = document.currentScript;
  var root = (function(){
    try{ return new URL("../", script.src).href; }catch(e){ return ""; }
  })();
  var loaded = {};   // "pl/ui.json" → entries
  var pairs = {};    // "pl" → { en␟ru: text } (all loaded list files)
  var placed = {};   // "pl" → { en␟ru␟place: text } — entries with "particle" (a text that differs by where it stands)
  var pending = {};  // "pl/ui.json" → Promise

  function addPairs(code, entries){
    if(!Array.isArray(entries)) return;
    var map = pairs[code] || (pairs[code] = {});
    for(var i = 0; i < entries.length; i++){
      var e = entries[i];
      if(!e || typeof e[code] !== "string" || !e[code]) continue;
      var k = (e.en || "") + SEP + (e.ru || "");
      /* 17.11.2026: one Russian hint can stand at several particles («≈ же»: doch, denn) and needs a text of its
         own at each — such entries carry "particle" and are found by tAt(place, …) only */
      if(typeof e.particle === "string" && e.particle){ (placed[code] || (placed[code] = {}))[k + SEP + e.particle] = e[code]; continue; }
      if(e.de == null || !(k in map)) map[k] = e[code];
    }
  }
  function packUrl(code, file){ return root + "lang/" + code + "/" + file + "?v=" + encodeURIComponent(PACKS[code].version); }
  function store(code, file, data){ loaded[code + "/" + file] = data; addPairs(code, data); return data; }

  /* The files a page needs right away (texts of its exercises and the interface) are listed on the
     script tag — data-pack="exercises/artikel__words.json" — and read before the page's own scripts run,
     so no page has to wait for them. ui.json and manifest.json are always read. Only with a pack language. */
  function loadSync(code, file){
    var id = code + "/" + file;
    if(id in loaded) return loaded[id];
    if(code === "xx") return (loaded[id] = null);
    var data = null;
    try{
      var x = new XMLHttpRequest();
      x.open("GET", packUrl(code, file), false);
      x.send(null);
      if(x.status >= 200 && x.status < 300) data = JSON.parse(x.responseText);
    }catch(e){ data = null; }
    return store(code, file, data);
  }

  function loadFile(code, file){
    var id = code + "/" + file;
    if(loaded[id] != null) return Promise.resolve(loaded[id]);
    if(pending[id]) return pending[id];
    if(code === "xx"){ loaded[id] = null; return Promise.resolve(null); }
    pending[id] = fetch(packUrl(code, file)).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
      .then(function(data){
        if(data == null){ delete pending[id]; return null; } // not kept: a later try asks again
        return store(code, file, data);
      });
    return pending[id];
  }

  /* ready(files, fn): for data a page fetches itself (Wörterbuch, Wortschatz meanings). */
  /* packFilesOf(code, f): the pack files for a name — an app data file ("Artikel/words.js",
     "wortschatz/sets/b2-c1.json") is looked up by its source in the manifest's exercise_files (→ exercises/<name>.json)
     and wortschatz_files (→ wortschatz/<name>.json); any other name is a pack file itself. */
  function packFilesOf(code, f){
    var m = loaded[code + "/manifest.json"] || {}, out = [];
    [["exercise_files", "exercises/"], ["wortschatz_files", "wortschatz/"]].forEach(function(g){
      var files = m[g[0]] || {};
      for(var name in files){
        var src = String(files[name] && files[name].source || "").replace(/^deutsch-home\//, "");
        if(src && src === f) out.push(g[1] + name + ".json");
      }
    });
    return out.length ? out : [f];
  }
  function ready(files, fn){
    var code = getDisplayLang();
    if(!isPack(code)){ fn(); return; }
    var list = [];
    (Array.isArray(files) ? files : (files ? [files] : [])).forEach(function(f){ list = list.concat(packFilesOf(code, f)); });
    Promise.all(list.map(function(f){ return loadFile(code, f); })).then(function(){ fn(); }, function(){ fn(); });
  }

  function packEntries(file){ var v = loaded[getDisplayLang() + "/" + file]; return v === undefined ? null : v; }

  function packText(code, en, ru){
    if(code === "xx") return en ? "\u27e6" + en + "\u27e7" : "";
    var map = pairs[code];
    var v = map && map[(en || "") + SEP + (ru || "")];
    return typeof v === "string" ? v : "";
  }

  /* apply(data, file, rootPath): writes the pack text into every {ru, en} object under data, as data.<code>.
     A pair that the pack gives several texts for ("de" in its entries) gets the one for its own German, found by
     DeutschLangDe.contextFor with the same path and stack as the extraction (rootPath "window.WORDS", "VERBS" …). */
  function apply(data, file, rootPath){
    var code = getDisplayLang();
    if(!isPack(code) || !data || typeof data !== "object") return data;
    var entries = loaded[code + "/" + file];
    if(entries === undefined){ var mapped = packFilesOf(code, file); if(mapped.length === 1) entries = loaded[code + "/" + mapped[0]]; }
    var byDe = {}, twin = {}, byAt = {};
    if(Array.isArray(entries)) for(var i = 0; i < entries.length; i++){
      var e = entries[i];
      if(e && e.de != null && typeof e[code] === "string"){ var k = (e.en || "") + SEP + (e.ru || ""); twin[k] = true; byDe[k + SEP + e.de] = e[code]; }
      /* places by their German (18.11.2026); a place two entries claim with different texts is not carried */
      if(e && Array.isArray(e.at) && typeof e[code] === "string" && e[code]) for(var a = 0; a < e.at.length; a++){
        var at = e.at[a];
        byAt[at] = (at in byAt && byAt[at] !== e[code]) ? null : e[code];
      }
    }
    var de = window.DeutschLangDe;
    (function walk(o, path, stack){
      if(!o || typeof o !== "object") return;
      if(!Array.isArray(o) && (typeof o.en === "string" || typeof o.ru === "string") && o[code] === undefined){
        var key = (o.en || "") + SEP + (o.ru || "");
        var hit = twin[key] && de ? byDe[key + SEP + de.contextFor(o, path, stack)] : undefined;
        var text = hit !== undefined ? hit : packText(code, o.en, o.ru);
        /* en / ru changed since the translation (a typo fixed): the entry translated for this German place */
        if(!text && de && de.placeKey){ var carried = byAt[de.placeKey(o, path, stack)]; if(carried) text = carried; }
        if(text) o[code] = text;
      }
      var up = stack.concat([o]);
      if(Array.isArray(o)){ for(var n = 0; n < o.length; n++) if(o[n] && typeof o[n] === "object") walk(o[n], path + "[" + n + "]", up); }
      else for(var p in o) if(o[p] && typeof o[p] === "object") walk(o[p], path + "." + p, up);
    })(data, rootPath || "", []);
    return data;
  }

  /* The exercise data of this page (manifest: exercise_files[…].globals) gets its pack texts the first
     time a text is asked for — by then the data scripts, which come first on every page, have run. */
  var applied = {};
  function applyPage(code){
    var manifest = loaded[code + "/manifest.json"];
    var files = manifest && manifest.exercise_files;
    if(!files) return;
    for(var name in files){
      var file = "exercises/" + name + ".json";
      if(applied[file] || !(code + "/" + file in loaded)) continue;
      var globals = files[name].globals || [], done = true;
      for(var g = 0; g < globals.length; g++){
        /* "NAME" = window.NAME; {name, const: true} = a top-level const of the data file */
        var gl = globals[g], isConst = gl && typeof gl === "object" && gl.const, gname = gl && typeof gl === "object" ? gl.name : gl;
        if(!/^[A-Za-z_$][\w$]*$/.test(String(gname))) continue;
        var value;
        try{ value = isConst ? Function("return typeof " + gname + ' !== "undefined" ? ' + gname + " : undefined")() : window[gname]; }catch(e){ value = undefined; }
        if(value === undefined){ done = false; continue; }
        apply(value, file, isConst ? gname : "window." + gname);
      }
      if(done) applied[file] = true;
    }
  }

  (function preload(){
    var code = getDisplayLang();
    if(!isPack(code) || code === "xx") return;
    loadSync(code, "manifest.json");
    loadSync(code, "ui.json");
    /* data-pack: the page's data files ("Artikel/words.js" — found in the manifest's exercise_files by
       their source) and / or pack files ("exercises/partikeln__hints.json") */
    var list = script && script.getAttribute("data-pack");
    if(list) list.split(/\s+/).forEach(function(f){
      if(!f) return;
      var mapped = packFilesOf(code, f);
      /* an app data file the manifest doesn't know (".js") loads nothing, as before */
      if(mapped.length === 1 && mapped[0] === f && /\.js$/.test(f)) return;
      mapped.forEach(function(p){ loadSync(code, p); });
    });
  })();

  /* mergeById(items, file): a pack's own-dictionary file (worterbuch/german-nouns.json = {id: {translation_pl,
     example_pl, complements: [{note_pl}, null] …}}) is written into the loaded items (same id, same places).
     Wortschatz meanings (wortschatz/example-senses.json = {id: "…"}) go to item.<code>. Returns a Promise;
     call it only with a pack language (needsPack()), so EN / RU loading stays exactly as it was. */
  function needsPack(){ return isPack(getDisplayLang()); }
  function mergeInto(target, src, code){
    if(!target || !src || typeof target !== "object" || typeof src !== "object") return;
    for(var k in src){
      var v = src[k];
      if(v == null) continue;
      if(k === code || k.slice(-(code.length + 1)) === "_" + code){ if(target[k] === undefined) target[k] = v; continue; }
      if(Array.isArray(v) && Array.isArray(target[k])){ for(var i = 0; i < v.length; i++) mergeInto(target[k][i], v[i], code); }
      else if(typeof v === "object") mergeInto(target[k], v, code);
    }
  }
  /* test language xx: every English field gets a ⟦…⟧ twin, so a missing place shows up in dev/lang/pseudo-check.cjs */
  function pseudoFields(o, seen){
    if(!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    var wrap = function(v){ return typeof v === "string" ? (v ? "\u27e6" + v + "\u27e7" : v) : Array.isArray(v) ? v.map(wrap) : v; };
    if(!Array.isArray(o) && typeof o.en === "string" && o.xx === undefined) o.xx = wrap(o.en);
    for(var k in o){
      if(/_en$/.test(k) && o[k.slice(0, -3) + "_xx"] === undefined && (typeof o[k] === "string" || Array.isArray(o[k]))) o[k.slice(0, -3) + "_xx"] = wrap(o[k]);
      else if(o[k] && typeof o[k] === "object") pseudoFields(o[k], seen);
    }
  }
  function mergeById(items, file){
    var code = getDisplayLang();
    if(!isPack(code)) return Promise.resolve(items);
    if(code === "xx"){ pseudoFields(items, new WeakSet()); return Promise.resolve(items); }
    return loadFile(code, file).then(function(pack){
      if(!pack || typeof pack !== "object") return items;
      var list = Array.isArray(items) ? items : items && typeof items === "object" ? Object.keys(items).map(function(id){ var o = items[id]; if(o && typeof o === "object" && o.id === undefined) o.__id = id; return o; }) : [];
      for(var i = 0; i < list.length; i++){
        var it = list[i]; if(!it || typeof it !== "object") continue;
        var id = it.id !== undefined ? it.id : it.__id;
        if(it.__id !== undefined) delete it.__id;
        var p = pack[id];
        if(typeof p === "string"){ if(it[code] === undefined) it[code] = p; }
        /* a card with "_src" whose English has changed since it was translated stays English (17.11.2026) */
        else if(p && (typeof p._src !== "string" || !window.DeutschLangDe || p._src === window.DeutschLangDe.sourcePrint(it))) mergeInto(it, p, code);
      }
      return items;
    }, function(){ return items; });
  }

  /* ---------- downloading a whole pack (Settings → Deine Sprache) ---------- */
  function downloaded(){ try{ return JSON.parse(localStorage.getItem(PACKS_KEY) || "{}") || {}; }catch(e){ return {}; } }
  /* packState(code): "builtin" · "ready" (downloaded, this version) · "none" */
  function packState(code){
    if(BUILTIN.indexOf(code) !== -1) return "builtin";
    return PACKS[code] && downloaded()[code] === PACKS[code].version ? "ready" : "none";
  }
  function packSize(code){ return PACKS[code] && PACKS[code].size || ""; }
  /* download(code): reads the manifest and every file it lists (into the browser's cache and this page),
     then remembers the version. Resolves true / false; the language itself is not switched here. */
  function download(code){
    if(!PACKS[code]) return Promise.resolve(false);
    return loadFile(code, "manifest.json").then(function(m){
      if(!m || typeof m !== "object") return false;
      var list = ["ui.json"];
      for(var f in (m.files || {})) if(list.indexOf(f) === -1 && !/^dictionary\//.test(f)) list.push(f);
      for(var n in (m.exercise_files || {})) list.push("exercises/" + n + ".json");
      return Promise.all(list.map(function(f){ return loadFile(code, f); })).then(function(all){
        if(all.some(function(x){ return x == null; })) return false;
        try{ var d = downloaded(); d[code] = PACKS[code].version; localStorage.setItem(PACKS_KEY, JSON.stringify(d)); }catch(e){}
        return true;
      });
    }, function(){ return false; });
  }

  /* ---------- reading ---------- */
  /* format(text, args, lang): "{0}" → args[0]; "{0|word|words}" → the plural form for args[0] in lang.
     Forms go in the order zero · one · two · few · many · other, keeping only the categories the language
     has (Intl.PluralRules): en one|other, ru / pl one|few|many; a missing last form repeats the one before. */
  var CATS = ["zero", "one", "two", "few", "many", "other"];
  var rules = {};
  function pluralIndex(lang, n){
    var r = rules[lang];
    if(!r){
      try{
        var pr = new Intl.PluralRules(lang === "xx" ? "en" : lang);
        var has = pr.resolvedOptions().pluralCategories;
        r = rules[lang] = { pr: pr, order: CATS.filter(function(c){ return has.indexOf(c) !== -1; }) };
      }catch(e){ r = rules[lang] = { pr: null, order: ["one", "other"] }; }
    }
    var cat = r.pr ? r.pr.select(Number(n)) : (Number(n) === 1 ? "one" : "other");
    return r.order.indexOf(cat);
  }
  function format(text, args, lang){
    if(!args || !args.length || typeof text !== "string") return text;
    return text.replace(/\{(\d+)(\|[^{}]*)?\}/g, function(m, n, forms){
      if(+n >= args.length) return m;
      if(!forms) return String(args[+n]);
      var list = forms.slice(1).split("|");
      var i = pluralIndex(lang || getDisplayLang(), args[+n]);
      return list[Math.min(i < 0 ? list.length - 1 : i, list.length - 1)];
    });
  }

  /* pick(value): value is a string, an {ru, en} object, or empty. */
  function pick(value){
    if(value == null) return "";
    if(typeof value === "string") return value;
    if(typeof value === "object"){
      var shown = getDisplayLang();
      if(isPack(shown)){
        applyPage(shown);
        if(value[shown]) return value[shown];
        var p = (typeof value.en === "string" || typeof value.ru === "string") ? packText(shown, value.en, value.ru) : "";
        if(p) return p;
        if(value.en) return value.en;
      }
      var lang = getLang();
      if(value[lang]) return value[lang];
      for(var k in value){ if(value[k]) return value[k]; }
    }
    return "";
  }

  /* t(en, ru, …args): a text written in code. Built-in languages: exactly en or ru. */
  function t(en, ru){
    var args = Array.prototype.slice.call(arguments, 2);
    var shown = getDisplayLang();
    var text;
    var lang = shown;
    if(isPack(shown)){ applyPage(shown); text = packText(shown, en, ru); if(!text){ text = en; lang = "en"; } }
    else text = shown === "ru" ? ru : en;
    return format(text, args, lang);
  }

  /* tAt(place, en, ru, …args): like t, but a pack entry written for this place ("particle": place) comes first,
     then the entry for the text alone. Built-in languages: exactly as t. */
  function tAt(place, en, ru){
    var shown = getDisplayLang();
    if(isPack(shown) && place){
      applyPage(shown);
      var map = placed[shown], v = map && map[(en || "") + SEP + (ru || "") + SEP + place];
      if(typeof v === "string" && v) return format(v, Array.prototype.slice.call(arguments, 3), shown);
    }
    return t.apply(null, Array.prototype.slice.call(arguments, 1));
  }

  /* table(T): T[getLang()] || T.en, as the app always read such tables; a pack language gets the pack text
     of every en/ru pair (a key it has no text for stays English). */
  function table(T){
    if(!T) return T;
    var shown = getDisplayLang();
    if(!isPack(shown)) return T[getLang()] || T.en;
    applyPage(shown);
    if(typeof T.en === "string" || typeof T.ru === "string") return packText(shown, T.en, T.ru) || T.en;
    var out = {}, en = T.en || {}, ru = T.ru || {};
    for(var k in en){
      out[k] = (typeof en[k] === "string" && (packText(shown, en[k], ru[k]) || en[k])) || en[k];
    }
    return out;
  }

  /* field(item, name): name_<lang>, else the other built-in one (ru ↔ en), as the app always did. */
  function field(item, name){
    if(!item) return undefined;
    var shown = getDisplayLang();
    if(isPack(shown)){
      var v = item[name + "_" + shown];
      if(v != null && v !== "") return v;
      if(shown === "xx"){ var en = item[name + "_en"]; return typeof en === "string" && en ? "⟦" + en + "⟧" : en; }
      return item[name + "_en"] || item[name + "_ru"];
    }
    return getLang() === "ru" ? (item[name + "_ru"] || item[name + "_en"]) : (item[name + "_en"] || item[name + "_ru"]);
  }

  /* getTranslation(item, field): e.g. getTranslation(exercise, "translation") */
  function getTranslation(item, field){
    return item ? pick(item[field]) : "";
  }

  window.DeutschTranslation = { KEY: KEY, getLang: getLang, getDisplayLang: getDisplayLang, setLang: setLang,
    languages: languages, isPack: isPack, pick: pick, t: t, tAt: tAt, field: field, ready: ready, apply: apply,
    packEntries: packEntries, format: format, table: table,
    needsPack: needsPack, mergeById: mergeById, packState: packState, packSize: packSize, download: download,
    addPack: addTestPack };
  window.getTranslation = getTranslation;
})();
