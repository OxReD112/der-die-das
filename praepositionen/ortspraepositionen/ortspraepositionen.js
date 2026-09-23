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

window.ORTS_KATEGORIEN = {
  raum:     {label:"Raum, geschlossener Ort",           rule:"in · in · aus"},
  stadt:    {label:"Stadt, Land ohne Artikel",          rule:"in · nach · aus"},
  land:     {label:"Land mit Artikel",                  rule:"in · in · aus"},
  kontakt:  {label:"Kontakt, „Wasser“",                 rule:"an · an · von"},
  flaeche:  {label:"Offene Fläche",                     rule:"auf · auf · von"},
  person:   {label:"Person, Firma, Aktivität, Ort",     rule:"bei · zu · von"},
  ausnahme: {label:"Wald, Park, Garten, Schwimmbad, Berge", rule:"immer in"},
  hause:    {label:"Zuhause",                           rule:"zu · nach · von zu"},
  anzu:     {label:"Bahnhof, Supermarkt (am Gebäude)",   rule:"an · zu · von"}
};

window.ORTSPRAEPOSITIONEN = [
  // ── Raum: in + Dativ / in + Akkusativ / aus ──
  {id:"haus",        noun:"Haus",        article:"das", gender:"n",  ru:"дом - здание",          cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kino",        noun:"Kino",        article:"das", gender:"n",  ru:"кинотеатр",             cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"theater",     noun:"Theater",     article:"das", gender:"n",  ru:"театр",                 cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"restaurant",  noun:"Restaurant",  article:"das", gender:"n",  ru:"ресторан",              cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"cafe",        noun:"Café",        article:"das", gender:"n",  ru:"кафе",                  cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"museum",      noun:"Museum",      article:"das", gender:"n",  ru:"музей",                 cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"hotel",       noun:"Hotel",       article:"das", gender:"n",  ru:"гостиница",             cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"buero",       noun:"Büro",        article:"das", gender:"n",  ru:"офис",                  cat:"raum",    wo:"im",      wohin:"ins",      woher:"aus dem"},
  {id:"kueche",      noun:"Küche",       article:"die", gender:"f",  ru:"кухня",                 cat:"raum",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"supermarkt-innen", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет - внутри", cat:"raum", wo:"im",      wohin:"in den",   woher:"aus dem"},

  // ── Stadt / Land ohne Artikel: in / nach / aus ──
  {id:"berlin",      noun:"Berlin",      article:"",    gender:null, ru:"Берлин",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus"},
  {id:"paris",       noun:"Paris",       article:"",    gender:null, ru:"Париж",                 cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus"},
  {id:"japan",       noun:"Japan",       article:"",    gender:null, ru:"Япония",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus"},
  {id:"italien",     noun:"Italien",     article:"",    gender:null, ru:"Италия",                cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus"},
  {id:"oesterreich", noun:"Österreich",  article:"",    gender:null, ru:"Австрия",               cat:"stadt",   wo:"in",      wohin:"nach",     woher:"aus"},

  // ── Land mit Artikel: in / in / aus ──
  {id:"schweiz",     noun:"Schweiz",     article:"die", gender:"f",  ru:"Швейцария",             cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"tuerkei",     noun:"Türkei",      article:"die", gender:"f",  ru:"Турция",                cat:"land",    wo:"in der",  wohin:"in die",   woher:"aus der"},
  {id:"usa",         noun:"USA",         article:"die", gender:"pl", ru:"США",                   cat:"land",    wo:"in den",  wohin:"in die",   woher:"aus den"},

  // ── Kontakt / „Wasser“: an / an / von ──
  {id:"strand",      noun:"Strand",      article:"der", gender:"m",  ru:"пляж",                  cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"meer",        noun:"Meer",        article:"das", gender:"n",  ru:"море - побережье",      cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"see",         noun:"See",         article:"der", gender:"m",  ru:"озеро - на берегу",     cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"fluss",       noun:"Fluss",       article:"der", gender:"m",  ru:"река - на берегу",      cat:"kontakt", wo:"am",      wohin:"an den",   woher:"vom"},
  {id:"wasser-ufer", noun:"Wasser",      article:"das", gender:"n",  ru:"вода - на берегу",      cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"station",     noun:"Station",     article:"die", gender:"f",  ru:"станция",               cat:"kontakt", wo:"an der",  wohin:"an die",   woher:"von der"},
  {id:"fenster",     noun:"Fenster",     article:"das", gender:"n",  ru:"окно",                  cat:"kontakt", wo:"am",      wohin:"ans",      woher:"vom"},
  {id:"supermarkt-am", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет - прямо у здания", cat:"anzu",    wo:"am",     wohin:"zum",      woher:"vom"},

  // ── Offene Fläche: auf / auf / von ──
  {id:"fussballplatz", noun:"Fußballplatz", article:"der", gender:"m", ru:"футбольное поле",     cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"sportplatz",  noun:"Sportplatz",  article:"der", gender:"m",  ru:"спортплощадка",         cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"spielplatz",  noun:"Spielplatz",  article:"der", gender:"m",  ru:"детская площадка",      cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"markt",       noun:"Markt",       article:"der", gender:"m",  ru:"рынок",                 cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"balkon",      noun:"Balkon",      article:"der", gender:"m",  ru:"балкон",                cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"strasse",     noun:"Straße",      article:"die", gender:"f",  ru:"улица",                 cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der"},
  {id:"insel",       noun:"Insel",       article:"die", gender:"f",  ru:"остров",                cat:"flaeche", wo:"auf der", wohin:"auf die",  woher:"von der"},
  {id:"berg",        noun:"Berg",        article:"der", gender:"m",  ru:"гора - одна",           cat:"flaeche", wo:"auf dem", wohin:"auf den",  woher:"vom"},
  {id:"wasser-auf",  noun:"Wasser",      article:"das", gender:"n",  ru:"вода - на матрасе",     cat:"flaeche", wo:"auf dem", wohin:"auf das",  woher:"vom"},

  // ── Person / Firma / Aktivität: bei / zu / von ──
  {id:"arzt",        noun:"Arzt",        article:"der", gender:"m",  ru:"врач",                  cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"zahnarzt",    noun:"Zahnarzt",    article:"der", gender:"m",  ru:"зубной врач",           cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"friseur",     noun:"Friseur",     article:"der", gender:"m",  ru:"парикмахер",            cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"baecker",     noun:"Bäcker",      article:"der", gender:"m",  ru:"пекарь, булочная",      cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"oma",         noun:"Oma",         article:"die", gender:"f",  ru:"бабушка",               cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"lisa",        noun:"Lisa",        article:"",    gender:null, ru:"Лиза",                  cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"hm",          noun:"H&M",         article:"",    gender:null, ru:"H&M - магазин",         cat:"person",  wo:"bei",     wohin:"zu",       woher:"von"},
  {id:"picknick",    noun:"Picknick",    article:"das", gender:"n",  ru:"пикник",                cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"training",    noun:"Training",    article:"das", gender:"n",  ru:"тренировка",            cat:"person",  wo:"beim",    wohin:"zum",      woher:"vom"},
  {id:"arbeit",      noun:"Arbeit",      article:"die", gender:"f",  ru:"работа",                cat:"person",  wo:"bei der", wohin:"zur",      woher:"von der"},
  {id:"supermarkt-gegend", noun:"Supermarkt", article:"der", gender:"m", ru:"супермаркет - где-то рядом, в районе", cat:"person", wo:"beim", wohin:"zum", woher:"vom"},

  // ── Ausnahmen: immer in ──
  {id:"wald",        noun:"Wald",        article:"der", gender:"m",  ru:"лес",                   cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"park",        noun:"Park",        article:"der", gender:"m",  ru:"парк",                  cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"garten",      noun:"Garten",      article:"der", gender:"m",  ru:"сад",                   cat:"ausnahme", wo:"im",     wohin:"in den",   woher:"aus dem"},
  {id:"schwimmbad",  noun:"Schwimmbad",  article:"das", gender:"n",  ru:"бассейн",               cat:"ausnahme", wo:"im",     wohin:"ins",      woher:"aus dem"},
  {id:"berge",       noun:"Berge",       article:"die", gender:"pl", ru:"горы",                  cat:"ausnahme", wo:"in den", wohin:"in die",   woher:"aus den",
     forms:{wo:"Bergen", wohin:"Berge", woher:"Bergen"}},
  {id:"wasser-im",   noun:"Wasser",      article:"das", gender:"n",  ru:"вода - плавать",        cat:"raum",     wo:"im",     wohin:"ins",      woher:"aus dem"},

  // ── Sonderfälle ──
  {id:"hause",       noun:"Hause",       article:"",    gender:null, ru:"свой дом",              cat:"hause",    wo:"zu",     wohin:"nach",     woher:"von",
     forms:{wo:"Hause", wohin:"Hause", woher:"zu Hause"}},
  {id:"bahnhof",     noun:"Bahnhof",     article:"der", gender:"m",  ru:"вокзал",                cat:"anzu",     wo:"am",     wohin:"zum",      woher:"vom"}
];
