/* Deutsch. — shared translation language helper (v1)
   Deployed path: components/deutsch-translation-v1.js
   (local folder: "deutsch components/")

   Setting: Home → Settings → Translations  ENG | RUS
   Stored in localStorage "deutschTranslationLangV1" as "en" or "ru".
   Default is "en". Included in Backup (Home → BACKUP_MODULES.translations);
   Restore writes the value JSON-encoded ('"en"'), which getLang() also accepts.

   Data format for any translated field in a database:
     - one translation   → plain string, always shown as is
                           "translation": "newspaper"
     - two translations  → object keyed by language, the setting picks
                           "translation": { "ru": "газета", "en": "newspaper" }
   If the chosen language is missing in an object, the other one is shown,
   so nothing ever comes out empty. Uploaded databases only need the plain
   string form. */
(function(){
  var KEY = "deutschTranslationLangV1";
  var LANGS = ["en", "ru"];
  var DEFAULT = "en";

  function getLang(){
    try{
      var v = localStorage.getItem(KEY);
      if(v && v.charAt(0) === '"'){ try{ v = JSON.parse(v); }catch(e){} }
      return LANGS.indexOf(v) !== -1 ? v : DEFAULT;
    }catch(e){ return DEFAULT; }
  }

  function setLang(lang){
    if(LANGS.indexOf(lang) === -1) return;
    try{ localStorage.setItem(KEY, lang); }catch(e){}
  }

  /* pick(value): value is a string, an {ru, en} object, or empty. */
  function pick(value){
    if(value == null) return "";
    if(typeof value === "string") return value;
    if(typeof value === "object"){
      var lang = getLang();
      if(value[lang]) return value[lang];
      for(var k in value){ if(value[k]) return value[k]; }
    }
    return "";
  }

  /* getTranslation(item, field): e.g. getTranslation(exercise, "translation") */
  function getTranslation(item, field){
    return item ? pick(item[field]) : "";
  }

  window.DeutschTranslation = { KEY: KEY, getLang: getLang, setLang: setLang, pick: pick };
  window.getTranslation = getTranslation;
})();
