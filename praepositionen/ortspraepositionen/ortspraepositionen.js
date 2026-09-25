// German Learning App - Ortspräpositionen (Wo · Wohin · Woher)
// Source: Lektion 35 "Lokale Präpositionen" (A2) + user's notes.
// Loaded by index.html as window.ORTSPRAEPOSITIONEN.
//
// Fields:
//   noun      - German noun as shown on the card (without article)
//   article   - der/die/das/die (Plural) or "" for names/cities/Hause
//   gender    - m / f / n / pl / null  → decides which fused button forms are shown
//   translation - line under the noun, {ru, en} (hint in brackets only where needed)
//                 picked by the Translations setting via components/deutsch-translation-v1.js
//   cat       - category key (see ORTS_KATEGORIEN)
//   wo/wohin/woher - the correct fused form for each question
//   forms     - optional noun form per question (Dativ Plural, "zu Hause" …)
//   lead      - optional verb per question, e.g. {wohin:"Ich fliege"} (default: Ich bin / Ich gehe / Ich komme)
//   alt       - optional other correct form per question, e.g. {wo:["auf der"]} → counted as correct,
//               "Auch richtig: …" shown below the button. Only for real everyday variants (Arbeit, Party, Hochzeit).

// Texts for the hint below the Continue button (shown only when zu/von was picked
// where the box wants in/an/auf or aus). German · Russian / German · English, {ru, en}.
window.ORTS_ZU_HINTS = {
  in:   {ru:"hinein · внутрь", en:"hinein · into it, inside"},
  an:   {ru:"direkt dran · вплотную", en:"direkt dran · right to the edge"},
  auf:  {ru:"drauf · на само место", en:"drauf · onto it"},
  zu:   {ru:"nur bis dorthin · только до", en:"nur bis dorthin · just up to it"},
  aus:  {ru:"heraus · изнутри", en:"heraus · out of it, from inside"},
  von:  {ru:"nur von dort · просто оттуда", en:"nur von dort · from there, not from inside"}
};

window.ORTS_KATEGORIEN = {
  raum:     {label:"Raum, geschlossener Ort",           rule:"in · in · aus"},
  stadt:    {label:"Stadt, Land ohne Artikel",          rule:"in · nach · aus"},
  land:     {label:"Land mit Artikel",                  rule:"in · in · aus"},
  kontakt:  {label:"Kontakt, „Wasser“",                 rule:"an · an · von"},
  flaeche:  {label:"Offene Fläche",                     rule:"auf · auf · von"},
  person:   {label:"Person, Geschäft, Aktivität, Nähe", rule:"bei · zu · von"},
  ausnahme: {label:"Wald, Park, Garten, Schwimmbad, Berge, Alpen", rule:"in · in · aus (immer in)"},
  adresse:  {label:"Straße als Adresse",                rule:"in · in · aus"},
  hause:    {label:"Zuhause",                           rule:"zu · nach · von zu"},
  anzu:     {label:"Bahnhof, Supermarkt (am Gebäude)",   rule:"an · zu · von"}
};

window.ORTSPRAEPOSITIONEN = [
  // ── Raum: in + Dativ / in + Akkusativ / aus ──
  {id:"haus",        noun:"Haus",        article:"das", gender:"n",  translation:{ru:"дом (здание)", en:"house (building)"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kino",        noun:"Kino",        article:"das", gender:"n",  translation:{ru:"кинотеатр", en:"cinema"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"theater",     noun:"Theater",     article:"das", gender:"n",  translation:{ru:"театр", en:"theatre"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"restaurant",  noun:"Restaurant",  article:"das", gender:"n",  translation:{ru:"ресторан", en:"restaurant"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"cafe",        noun:"Café",        article:"das", gender:"n",  translation:{ru:"кафе", en:"café"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"museum",      noun:"Museum",      article:"das", gender:"n",  translation:{ru:"музей", en:"museum"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"hotel",       noun:"Hotel",       article:"das", gender:"n",  translation:{ru:"гостиница", en:"hotel"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"buero",       noun:"Büro",        article:"das", gender:"n",  translation:{ru:"офис", en:"office"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kueche",      noun:"Küche",       article:"die", gender:"f",  translation:{ru:"кухня", en:"kitchen"}, cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"supermarkt-innen", noun:"Supermarkt", article:"der", gender:"m", translation:{ru:"супермаркет (внутри)", en:"supermarket (inside)"}, cat:"raum", wo:"im",      wohin:"in den",   woher:"aus dem"},
  {id:"krankenhaus", noun:"Krankenhaus", article:"das", gender:"n",  translation:{ru:"больница", en:"hospital"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kaufhaus",    noun:"Kaufhaus",    article:"das", gender:"n",  translation:{ru:"универмаг", en:"department store"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"oper",        noun:"Oper",        article:"die", gender:"f",  translation:{ru:"опера (театр)", en:"opera house"}, cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"schule",      noun:"Schule",      article:"die", gender:"f",  translation:{ru:"школа", en:"school"}, cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"zentrum",     noun:"Zentrum",     article:"das", gender:"n",  translation:{ru:"центр города", en:"city centre"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"fitnessstudio", noun:"Fitnessstudio", article:"das", gender:"n", translation:{ru:"фитнес-клуб", en:"gym"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"disneyland",  noun:"Disneyland",  article:"das", gender:"n",  translation:{ru:"Диснейленд", en:"Disneyland"}, cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem", lead:{wohin:"Ich fahre"}},

  // ── Stadt / Land ohne Artikel: in / nach / aus ──
  {id:"berlin",      noun:"Berlin",      article:"",    gender:null, translation:{ru:"Берлин", en:"Berlin"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"paris",       noun:"Paris",       article:"",    gender:null, translation:{ru:"Париж", en:"Paris"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"japan",       noun:"Japan",       article:"",    gender:null, translation:{ru:"Япония", en:"Japan"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"italien",     noun:"Italien",     article:"",    gender:null, translation:{ru:"Италия", en:"Italy"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"oesterreich", noun:"Österreich",  article:"",    gender:null, translation:{ru:"Австрия", en:"Austria"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"madrid",      noun:"Madrid",      article:"",    gender:null, translation:{ru:"Мадрид", en:"Madrid"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"london",      noun:"London",      article:"",    gender:null, translation:{ru:"Лондон", en:"London"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"spanien",     noun:"Spanien",     article:"",    gender:null, translation:{ru:"Испания", en:"Spain"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"mexiko",      noun:"Mexiko",      article:"",    gender:null, translation:{ru:"Мексика", en:"Mexico"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"china",       noun:"China",       article:"",    gender:null, translation:{ru:"Китай", en:"China"}, cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},

  // ── Land mit Artikel: in / in / aus ──
  {id:"schweiz",     noun:"Schweiz",     article:"die", gender:"f",  translation:{ru:"Швейцария", en:"Switzerland"}, cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der", lead:{wohin:"Ich fahre"}},
  {id:"tuerkei",     noun:"Türkei",      article:"die", gender:"f",  translation:{ru:"Турция", en:"Turkey"}, cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der", lead:{wohin:"Ich fliege"}},
  {id:"usa",         noun:"USA",         article:"die", gender:"pl", translation:{ru:"США", en:"USA"}, cat:"land",    wo:"in den",  wohin:"in die",   woher:"aus den", lead:{wohin:"Ich fliege"}},

  // ── Kontakt / „Wasser“: an / an / von ──
  {id:"strand",      noun:"Strand",      article:"der", gender:"m",  translation:{ru:"пляж", en:"beach"}, cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"meer",        noun:"Meer",        article:"das", gender:"n",  translation:{ru:"море (на побережье)", en:"sea (at the seaside)"}, cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"see",         noun:"See",         article:"der", gender:"m",  translation:{ru:"озеро (на берегу)", en:"lake (on the shore)"}, cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"fluss",       noun:"Fluss",       article:"der", gender:"m",  translation:{ru:"река (на берегу)", en:"river (on the bank)"}, cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"kueste",      noun:"Küste",       article:"die", gender:"f",  translation:{ru:"побережье", en:"coast"}, cat:"kontakt", wo:"an der",  wohin:"an die",   woher:"von der"},
  {id:"fenster",     noun:"Fenster",     article:"das", gender:"n",  translation:{ru:"окно", en:"window"}, cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"tisch",       noun:"Tisch",       article:"der", gender:"m",  translation:{ru:"стол (сесть за стол)", en:"table (sitting at it)"}, cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"atlantik",    noun:"Atlantik",    article:"der", gender:"m",  translation:{ru:"Атлантический океан", en:"Atlantic Ocean"}, cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom", lead:{wohin:"Ich fahre"}},
  {id:"supermarkt-am", noun:"Supermarkt", article:"der", gender:"m", translation:{ru:"супермаркет (прямо у здания)", en:"supermarket (right outside)"}, cat:"anzu",    wo:"am",     wohin:"zum",      woher:"vom"},

  // ── Offene Fläche: auf / auf / von ──
  {id:"fussballplatz", noun:"Fußballplatz", article:"der", gender:"m", translation:{ru:"футбольное поле", en:"football pitch"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"sportplatz",  noun:"Sportplatz",  article:"der", gender:"m",  translation:{ru:"спортивная площадка", en:"sports ground"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"spielplatz",  noun:"Spielplatz",  article:"der", gender:"m",  translation:{ru:"детская площадка", en:"playground"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"markt",       noun:"Markt",       article:"der", gender:"m",  translation:{ru:"рынок", en:"market, marketplace"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"balkon",      noun:"Balkon",      article:"der", gender:"m",  translation:{ru:"балкон", en:"balcony"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"strasse",     noun:"Straße",      article:"die", gender:"f",  translation:{ru:"улица (на улице, снаружи)", en:"street (out on the street)"}, cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der"},
  {id:"insel",       noun:"Insel",       article:"die", gender:"f",  translation:{ru:"остров", en:"island"}, cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der", lead:{wohin:"Ich fahre"}},
  {id:"berg",        noun:"Berg",        article:"der", gender:"m",  translation:{ru:"гора (на вершине, на вершину)", en:"mountain (at/to the top)"}, cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},

  // ── Person / Firma / Aktivität: bei / zu / von ──
  {id:"arzt",        noun:"Arzt",        article:"der", gender:"m",  translation:{ru:"врач", en:"doctor"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"zahnarzt",    noun:"Zahnarzt",    article:"der", gender:"m",  translation:{ru:"зубной врач", en:"dentist"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"friseur",     noun:"Friseur",     article:"der", gender:"m",  translation:{ru:"парикмахер", en:"hairdresser"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"baecker",     noun:"Bäcker",      article:"der", gender:"m",  translation:{ru:"пекарь, булочная", en:"baker, bakery"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"oma",         noun:"Oma",         article:"",    gender:null, translation:{ru:"бабушка (моя)", en:"(my) grandma"}, cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"lisa",        noun:"Lisa",        article:"",    gender:null, translation:{ru:"Лиза", en:"Lisa"}, cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"hm",          noun:"H&M",         article:"",    gender:null, translation:{ru:"H&M (магазин)", en:"H&M (shop)"}, cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"picknick",    noun:"Picknick",    article:"das", gender:"n",  translation:{ru:"пикник", en:"picnic"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"training",    noun:"Training",    article:"das", gender:"n",  translation:{ru:"тренировка", en:"training session"}, cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"arbeit",      noun:"Arbeit",      article:"die", gender:"f",  translation:{ru:"работа", en:"work"}, cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},
  {id:"supermarkt-gegend", noun:"Supermarkt", article:"der", gender:"m", translation:{ru:"супермаркет (где-то рядом, в районе)", en:"supermarket (somewhere nearby)"}, cat:"person", wo:"beim", wohin:"zum", woher:"vom"},
  {id:"chefin",      noun:"Chefin",      article:"die", gender:"f",  translation:{ru:"начальница", en:"boss"}, cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"johannes",    noun:"Johannes",    article:"",    gender:null, translation:{ru:"Йоханнес", en:"Johannes"}, cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"ikea",        noun:"Ikea",        article:"",    gender:null, translation:{ru:"Ikea (магазин)", en:"IKEA (shop)"}, cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"pruefung",    noun:"Prüfung",     article:"die", gender:"f",  translation:{ru:"экзамен", en:"exam"}, cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"grosseltern", noun:"Großeltern",  article:"die", gender:"pl", translation:{ru:"бабушка и дедушка", en:"grandparents"}, cat:"person",  wo:"bei den", wohin:"zu den",   woher:"von den"},
  {id:"party",       noun:"Party",       article:"die", gender:"f",  translation:{ru:"вечеринка", en:"party"}, cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},
  {id:"hochzeit",    noun:"Hochzeit",    article:"die", gender:"f",  translation:{ru:"свадьба", en:"wedding"}, cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},

  // ── Ausnahmen: immer in ──
  {id:"wald",        noun:"Wald",        article:"der", gender:"m",  translation:{ru:"лес", en:"forest, woods"}, cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"park",        noun:"Park",        article:"der", gender:"m",  translation:{ru:"парк", en:"park"}, cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"garten",      noun:"Garten",      article:"der", gender:"m",  translation:{ru:"сад", en:"garden"}, cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"schwimmbad",  noun:"Schwimmbad",  article:"das", gender:"n",  translation:{ru:"бассейн", en:"swimming pool"}, cat:"ausnahme", wo:"im",     wohin:"ins",      woher:"aus dem"},
  {id:"berge",       noun:"Berge",       article:"die", gender:"pl", translation:{ru:"горы (в горах)", en:"mountains (in the mountains)"}, cat:"ausnahme", wo:"in den", wohin:"in die",   woher:"aus den",
     forms:{wo:"Bergen", wohin:"Berge", woher:"Bergen"}},
  {id:"alpen",       noun:"Alpen",       article:"die", gender:"pl", translation:{ru:"Альпы", en:"Alps"}, cat:"ausnahme", wo:"in den", wohin:"in die",   woher:"aus den", lead:{wohin:"Ich fahre"}},

  // ── Straße als Adresse: in / in / aus (vs. auf der Straße) ──
  {id:"goethestrasse", noun:"Goethestraße", article:"die", gender:"f", translation:{ru:"улица Гёте (адрес)", en:"Goethe Street (address)"}, cat:"adresse",  wo:"in der", wohin:"in die",   woher:"aus der", lead:{wo:"Ich wohne", wohin:"Ich ziehe"}},

  // ── Sonderfälle ──
  {id:"hause",       noun:"Hause",       article:"",    gender:null, translation:{ru:"дом (дома / домой / из дома)", en:"home (at, to, from home)"}, cat:"hause",    wo:"zu",     wohin:"nach",     woher:"von",
     forms:{wo:"Hause", wohin:"Hause", woher:"zu Hause"}},
  {id:"bahnhof",     noun:"Bahnhof",     article:"der", gender:"m",  translation:{ru:"вокзал (на вокзале: встреча, поезд)", en:"station (meeting point, train)"}, cat:"anzu",     wo:"am",     wohin:"zum",      woher:"vom"}
];
