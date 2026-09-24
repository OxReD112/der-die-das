// German Learning App - Ortspräpositionen (Wo · Wohin · Woher)
// Source: Lektion 35 "Lokale Präpositionen" (A2) + user's notes.
// Loaded by index.html as window.ORTSPRAEPOSITIONEN.
//
// Fields:
//   noun      - German noun as shown on the card (without article)
//   article   - der/die/das/die (Plural) or "" for names/cities/Hause
//   gender    - m / f / n / pl / null  → decides which fused button forms are shown
//   ru        - Russian line under the noun (hint in brackets only where needed)
//   cat       - category key (see ORTS_KATEGORIEN)
//   wo/wohin/woher - the correct fused form for each question
//   forms     - optional noun form per question (Dativ Plural, "zu Hause" …)
//   lead      - optional verb per question, e.g. {wohin:"Ich fliege"} (default: Ich bin / Ich gehe / Ich komme)
//   alt       - optional other correct form per question, e.g. {wo:["auf der"]} → counted as correct,
//               "Auch richtig: …" shown below the button. Only for real everyday variants (Arbeit, Party, Hochzeit).

window.ORTS_KATEGORIEN = {
  raum:     {label:"Raum, geschlossener Ort",           rule:"in · in · aus"},
  stadt:    {label:"Stadt, Land ohne Artikel",          rule:"in · nach · aus"},
  land:     {label:"Land mit Artikel",                  rule:"in · in · aus"},
  kontakt:  {label:"Kontakt, „Wasser“",                 rule:"an · an · von"},
  flaeche:  {label:"Offene Fläche",                     rule:"auf · auf · von"},
  person:   {label:"Person, Geschäft, Aktivität, Nähe", rule:"bei · zu · von"},
  ausnahme: {label:"Wald, Park, Garten, Schwimmbad, Berge, Alpen, Wasser", rule:"in · in · aus (immer in)"},
  adresse:  {label:"Straße als Adresse",                rule:"in · in · aus"},
  hause:    {label:"Zuhause",                           rule:"zu · nach · von zu"},
  anzu:     {label:"Bahnhof, Supermarkt (am Gebäude)",   rule:"an · zu · von"}
};

window.ORTSPRAEPOSITIONEN = [
  // ── Raum: in + Dativ / in + Akkusativ / aus ──
  {id:"haus",        noun:"Haus",        article:"das", gender:"n",  ru:"дом (здание)",          cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kino",        noun:"Kino",        article:"das", gender:"n",  ru:"кинотеатр",             cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"theater",     noun:"Theater",     article:"das", gender:"n",  ru:"театр",                 cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"restaurant",  noun:"Restaurant",  article:"das", gender:"n",  ru:"ресторан",              cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"cafe",        noun:"Café",        article:"das", gender:"n",  ru:"кафе",                  cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"museum",      noun:"Museum",      article:"das", gender:"n",  ru:"музей",                 cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"hotel",       noun:"Hotel",       article:"das", gender:"n",  ru:"гостиница",             cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"buero",       noun:"Büro",        article:"das", gender:"n",  ru:"офис",                  cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kueche",      noun:"Küche",       article:"die", gender:"f",  ru:"кухня",                 cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"supermarkt-innen", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет (внутри)", cat:"raum", wo:"im",      wohin:"in den",   woher:"aus dem"},
  {id:"krankenhaus", noun:"Krankenhaus", article:"das", gender:"n",  ru:"больница",              cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kaufhaus",    noun:"Kaufhaus",    article:"das", gender:"n",  ru:"универмаг",             cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"oper",        noun:"Oper",        article:"die", gender:"f",  ru:"опера (театр)",         cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"schule",      noun:"Schule",      article:"die", gender:"f",  ru:"школа",                 cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"zentrum",     noun:"Zentrum",     article:"das", gender:"n",  ru:"центр города",          cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"fitnessstudio", noun:"Fitnessstudio", article:"das", gender:"n", ru:"фитнес-клуб",        cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"disneyland",  noun:"Disneyland",  article:"das", gender:"n",  ru:"Диснейленд",            cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem", lead:{wohin:"Ich fahre"}},

  // ── Stadt / Land ohne Artikel: in / nach / aus ──
  {id:"berlin",      noun:"Berlin",      article:"",    gender:null, ru:"Берлин",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"paris",       noun:"Paris",       article:"",    gender:null, ru:"Париж",                 cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"japan",       noun:"Japan",       article:"",    gender:null, ru:"Япония",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"italien",     noun:"Italien",     article:"",    gender:null, ru:"Италия",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"oesterreich", noun:"Österreich",  article:"",    gender:null, ru:"Австрия",               cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fahre"}},
  {id:"madrid",      noun:"Madrid",      article:"",    gender:null, ru:"Мадрид",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"london",      noun:"London",      article:"",    gender:null, ru:"Лондон",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"spanien",     noun:"Spanien",     article:"",    gender:null, ru:"Испания",               cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"mexiko",      noun:"Mexiko",      article:"",    gender:null, ru:"Мексика",               cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},
  {id:"china",       noun:"China",       article:"",    gender:null, ru:"Китай",                 cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus", lead:{wohin:"Ich fliege"}},

  // ── Land mit Artikel: in / in / aus ──
  {id:"schweiz",     noun:"Schweiz",     article:"die", gender:"f",  ru:"Швейцария",             cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der", lead:{wohin:"Ich fahre"}},
  {id:"tuerkei",     noun:"Türkei",      article:"die", gender:"f",  ru:"Турция",                cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der", lead:{wohin:"Ich fliege"}},
  {id:"usa",         noun:"USA",         article:"die", gender:"pl", ru:"США",                   cat:"land",    wo:"in den",  wohin:"in die",   woher:"aus den", lead:{wohin:"Ich fliege"}},

  // ── Kontakt / „Wasser“: an / an / von ──
  {id:"strand",      noun:"Strand",      article:"der", gender:"m",  ru:"пляж",                  cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"meer",        noun:"Meer",        article:"das", gender:"n",  ru:"море (на побережье)",      cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"see",         noun:"See",         article:"der", gender:"m",  ru:"озеро (на берегу)",     cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"fluss",       noun:"Fluss",       article:"der", gender:"m",  ru:"река (на берегу)",      cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"wasser-ufer", noun:"Wasser",      article:"das", gender:"n",  ru:"вода (у воды, на берегу)",      cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"kueste",      noun:"Küste",       article:"die", gender:"f",  ru:"побережье",             cat:"kontakt", wo:"an der",  wohin:"an die",   woher:"von der"},
  {id:"fenster",     noun:"Fenster",     article:"das", gender:"n",  ru:"окно",                  cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"tisch",       noun:"Tisch",       article:"der", gender:"m",  ru:"стол (сесть за стол)",  cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"atlantik",    noun:"Atlantik",    article:"der", gender:"m",  ru:"Атлантический океан",   cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom", lead:{wohin:"Ich fahre"}},
  {id:"supermarkt-am", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет (прямо у здания)", cat:"anzu",    wo:"am",     wohin:"zum",      woher:"vom"},

  // ── Offene Fläche: auf / auf / von ──
  {id:"fussballplatz", noun:"Fußballplatz", article:"der", gender:"m", ru:"футбольное поле",     cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"sportplatz",  noun:"Sportplatz",  article:"der", gender:"m",  ru:"спортивная площадка",         cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"spielplatz",  noun:"Spielplatz",  article:"der", gender:"m",  ru:"детская площадка",      cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"markt",       noun:"Markt",       article:"der", gender:"m",  ru:"рынок",                 cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"balkon",      noun:"Balkon",      article:"der", gender:"m",  ru:"балкон",                cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"strasse",     noun:"Straße",      article:"die", gender:"f",  ru:"улица (на улице, снаружи)",                 cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der"},
  {id:"insel",       noun:"Insel",       article:"die", gender:"f",  ru:"остров",                cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der", lead:{wohin:"Ich fahre"}},
  {id:"berg",        noun:"Berg",        article:"der", gender:"m",  ru:"гора (на вершине, на вершину)",           cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},

  // ── Person / Firma / Aktivität: bei / zu / von ──
  {id:"arzt",        noun:"Arzt",        article:"der", gender:"m",  ru:"врач",                  cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"zahnarzt",    noun:"Zahnarzt",    article:"der", gender:"m",  ru:"зубной врач",           cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"friseur",     noun:"Friseur",     article:"der", gender:"m",  ru:"парикмахер",            cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"baecker",     noun:"Bäcker",      article:"der", gender:"m",  ru:"пекарь, булочная",      cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"oma",         noun:"Oma",         article:"",    gender:null, ru:"бабушка (моя)",         cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"lisa",        noun:"Lisa",        article:"",    gender:null, ru:"Лиза",                  cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"hm",          noun:"H&M",         article:"",    gender:null, ru:"H&M (магазин)",         cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"picknick",    noun:"Picknick",    article:"das", gender:"n",  ru:"пикник",                cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"training",    noun:"Training",    article:"das", gender:"n",  ru:"тренировка",            cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"arbeit",      noun:"Arbeit",      article:"die", gender:"f",  ru:"работа",                cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},
  {id:"supermarkt-gegend", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет (где-то рядом, в районе)", cat:"person", wo:"beim", wohin:"zum", woher:"vom"},
  {id:"chefin",      noun:"Chefin",      article:"die", gender:"f",  ru:"начальница",            cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"johannes",    noun:"Johannes",    article:"",    gender:null, ru:"Йоханнес",              cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"ikea",        noun:"Ikea",        article:"",    gender:null, ru:"Ikea (магазин)",        cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"pruefung",    noun:"Prüfung",     article:"die", gender:"f",  ru:"экзамен",               cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"grosseltern", noun:"Großeltern",  article:"die", gender:"pl", ru:"бабушка и дедушка",     cat:"person",  wo:"bei den", wohin:"zu den",   woher:"von den"},
  {id:"party",       noun:"Party",       article:"die", gender:"f",  ru:"вечеринка",             cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},
  {id:"hochzeit",    noun:"Hochzeit",    article:"die", gender:"f",  ru:"свадьба",               cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der", alt:{wo:["auf der"]}},

  // ── Ausnahmen: immer in ──
  {id:"wald",        noun:"Wald",        article:"der", gender:"m",  ru:"лес",                   cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"park",        noun:"Park",        article:"der", gender:"m",  ru:"парк",                  cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"garten",      noun:"Garten",      article:"der", gender:"m",  ru:"сад",                   cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"schwimmbad",  noun:"Schwimmbad",  article:"das", gender:"n",  ru:"бассейн",               cat:"ausnahme", wo:"im",     wohin:"ins",      woher:"aus dem"},
  {id:"berge",       noun:"Berge",       article:"die", gender:"pl", ru:"горы (в горах)",                  cat:"ausnahme", wo:"in den", wohin:"in die",   woher:"aus den",
     forms:{wo:"Bergen", wohin:"Berge", woher:"Bergen"}},
  {id:"alpen",       noun:"Alpen",       article:"die", gender:"pl", ru:"Альпы",                 cat:"ausnahme", wo:"in den", wohin:"in die",   woher:"aus den", lead:{wohin:"Ich fahre"}},
  {id:"wasser-im",   noun:"Wasser",      article:"das", gender:"n",  ru:"вода (в воде, плавать)", cat:"ausnahme",     wo:"im",     wohin:"ins",      woher:"aus dem"},

  // ── Straße als Adresse: in / in / aus (vs. auf der Straße) ──
  {id:"goethestrasse", noun:"Goethestraße", article:"die", gender:"f", ru:"улица Гёте (адрес)",  cat:"adresse",  wo:"in der", wohin:"in die",   woher:"aus der", lead:{wo:"Ich wohne", wohin:"Ich ziehe"}},

  // ── Sonderfälle ──
  {id:"hause",       noun:"Hause",       article:"",    gender:null, ru:"дом (дома / домой / из дома)",              cat:"hause",    wo:"zu",     wohin:"nach",     woher:"von",
     forms:{wo:"Hause", wohin:"Hause", woher:"zu Hause"}},
  {id:"bahnhof",     noun:"Bahnhof",     article:"der", gender:"m",  ru:"вокзал (на вокзале: встреча, поезд)",                cat:"anzu",     wo:"am",     wohin:"zum",      woher:"vom"}
];
