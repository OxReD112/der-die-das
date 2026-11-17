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
(function(){
  var KEY = "deutschTranslationLangV1";
  var BUILTIN = ["en", "ru"];
  /* Pack languages: code → name and pack version (the version goes into every pack address as ?v=). */
  var PACKS = {
    pl: { name: "Polski", version: "0", size: "4 MB", published: false }
  };
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
  var pending = {};  // "pl/ui.json" → Promise

  function addPairs(code, entries){
    if(!Array.isArray(entries)) return;
    var map = pairs[code] || (pairs[code] = {});
    for(var i = 0; i < entries.length; i++){
      var e = entries[i];
      if(!e || typeof e[code] !== "string" || !e[code]) continue;
      var k = (e.en || "") + SEP + (e.ru || "");
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
  function ready(files, fn){
    var code = getDisplayLang();
    if(!isPack(code)){ fn(); return; }
    var list = Array.isArray(files) ? files : (files ? [files] : []);
    Promise.all(list.map(function(f){ return loadFile(code, f); })).then(function(){ fn(); }, function(){ fn(); });
  }

  function packEntries(file){ var v = loaded[getDisplayLang() + "/" + file]; return v === undefined ? null : v; }

  function packText(code, en, ru){
    if(code === "xx") return en ? "\u27e6" + en + "\u27e7" : "";
    var map = pairs[code];
    var v = map && map[(en || "") + SEP + (ru || "")];
    return typeof v === "string" ? v : "";
  }

  /* German next to a pair, by the pack manifest's rule for that file: "de_fields": ["de", "sentence"] —
     the first of these string fields found on the pair's own object or the nearest object above it. */
  function deRule(fields){
    return function(o, parents){
      var chain = [o].concat(parents);
      for(var i = 0; i < chain.length; i++) for(var j = 0; j < fields.length; j++){
        var v = chain[i] && chain[i][fields[j]];
        if(typeof v === "string") return v;
      }
      return null;
    };
  }

  /* apply(data, file): writes the pack text into every {ru, en} object under data, as data.<code>.
     A pair that the pack file gives a German context ("de") for gets the text for its own German. */
  function apply(data, file){
    var code = getDisplayLang();
    if(!isPack(code) || !data || typeof data !== "object") return data;
    var entries = loaded[code + "/" + file];
    var manifest = loaded[code + "/manifest.json"];
    var spec = manifest && manifest.exercise_files && manifest.exercise_files[file.replace(/^exercises\/|\.json$/g, "")];
    var deOf = spec && Array.isArray(spec.de_fields) ? deRule(spec.de_fields) : null;
    var byDe = {};
    if(Array.isArray(entries)) for(var i = 0; i < entries.length; i++){
      var e = entries[i];
      if(e && e.de != null && typeof e[code] === "string") byDe[(e.en || "") + SEP + (e.ru || "") + SEP + e.de] = e[code];
    }
    var seen = new WeakSet();
    (function walk(o, parents){
      if(!o || typeof o !== "object" || seen.has(o)) return;
      seen.add(o);
      if(!Array.isArray(o) && (typeof o.en === "string" || typeof o.ru === "string") && o[code] === undefined){
        var de = deOf ? deOf(o, parents) : null;
        var hit = de != null ? byDe[(o.en || "") + SEP + (o.ru || "") + SEP + de] : undefined;
        var text = hit !== undefined ? hit : packText(code, o.en, o.ru);
        if(text) o[code] = text;
      }
      var up = [o].concat(parents);
      for(var k in o) if(o[k] && typeof o[k] === "object") walk(o[k], up);
    })(data, []);
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
        var value;
        try{ value = Function("return typeof " + globals[g] + ' !== "undefined" ? ' + globals[g] + " : undefined")(); }catch(e){ value = undefined; }
        if(value === undefined){ done = false; continue; }
        apply(value, file);
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
    var files = (loaded[code + "/manifest.json"] || {}).exercise_files || {};
    if(list) list.split(/\s+/).forEach(function(f){
      if(!f) return;
      if(!/\.js$/.test(f)){ loadSync(code, f); return; }
      for(var name in files){
        var src = String(files[name] && files[name].source || "").replace(/^deutsch-home\//, "");
        if(src === f) loadSync(code, "exercises/" + name + ".json");
      }
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
        else if(p) mergeInto(it, p, code);
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
    languages: languages, isPack: isPack, pick: pick, t: t, field: field, ready: ready, apply: apply,
    packEntries: packEntries, format: format, table: table,
    needsPack: needsPack, mergeById: mergeById, packState: packState, packSize: packSize, download: download };
  window.getTranslation = getTranslation;
})();
