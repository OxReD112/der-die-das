// Ortspräpositionen (Wo · Wohin · Woher) — the places, their rule groups and the hint texts.
// Source: Lektion 35 "Lokale Präpositionen" (A2) + user's notes.
// Loaded by index.html before ortspraepositionen.js (window.ORTSPRAEPOSITIONEN, ORTS_KATEGORIEN, ORTS_ZU_HINTS).
// Was ortspraepositionen.js until v22 (renamed in v23, content unchanged).
// Keep every place's id and every category key: difficulty is stored per id, progress per category.
// When this file changes, raise its ?v= in index.html, the Präpositionen page's ortspraepositionen/index.html?v=
// and the Home tile's praepositionen/?v=
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
//   note      - optional {ru, en} line shown under the rule after the card, for cards that break
//               their category's pattern (e.g. Toilette: a room, but auf).

// Texts for the hint below the Continue button (shown only when zu/von was picked
// where the box wants in/an/auf or aus). German · Russian / German · English, {ru, en}.
window.ORTS_ZU_HINTS = {
  in: { ru: "hinein · внутрь", en: "hinein · into it, inside" },
  an: { ru: "direkt dran · вплотную", en: "direkt dran · right to the edge" },
  auf: { ru: "drauf · на само место", en: "drauf · onto it" },
  zu: { ru: "nur bis dorthin · только до места, не внутрь и не на него", en: "nur bis dorthin · just up to it, not into or onto it" },
  aus: { ru: "heraus · изнутри", en: "heraus · out of it, from inside" },
  von: { ru: "nur von dort · просто оттуда, не изнутри", en: "nur von dort · from there, not from inside" }
};

window.ORTS_KATEGORIEN = {
  raum: { label: "Raum, geschlossener Ort", rule: "in · in · aus" },
  stadt: { label: "Stadt, Land ohne Artikel", rule: "in · nach · aus" },
  land: { label: "Land mit Artikel", rule: "in · in · aus" },
  kontakt: { label: "Kontakt, „Wasser“", rule: "an · an · von" },
  flaeche: { label: "Offene Fläche", rule: "auf · auf · von" },
  person: { label: "Person, Geschäft, Aktivität, Nähe", rule: "bei · zu · von" },
  ausnahme: { label: "Wald, Park, Garten, Schwimmbad, Berge, Alpen", rule: "in · in · aus (immer in)" },
  adresse: { label: "Straße als Adresse", rule: "in · in · aus" },
  hause: { label: "Zuhause", rule: "zu · nach · von zu" },
  anzu: { label: "Bahnhof, Haltestelle, Kasse (am Ort)", rule: "an · zu · von" }
};

window.ORTSPRAEPOSITIONEN = [
  // ── Raum: in + Dativ / in + Akkusativ / aus ──
  {
    id: "haus",
    noun: "Haus",
    article: "das",
    gender: "n",
    translation: { ru: "дом (здание)", en: "house (building)" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "kino",
    noun: "Kino",
    article: "das",
    gender: "n",
    translation: { ru: "кинотеатр", en: "cinema" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "theater",
    noun: "Theater",
    article: "das",
    gender: "n",
    translation: { ru: "театр", en: "theatre" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "restaurant",
    noun: "Restaurant",
    article: "das",
    gender: "n",
    translation: { ru: "ресторан", en: "restaurant" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "museum",
    noun: "Museum",
    article: "das",
    gender: "n",
    translation: { ru: "музей", en: "museum" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "hotel",
    noun: "Hotel",
    article: "das",
    gender: "n",
    translation: { ru: "гостиница", en: "hotel" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "buero",
    noun: "Büro",
    article: "das",
    gender: "n",
    translation: { ru: "офис", en: "office" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "supermarkt-innen",
    noun: "Supermarkt",
    article: "der",
    gender: "m",
    translation: { ru: "супермаркет (внутри)", en: "supermarket (inside)" },
    cat: "raum",
    wo: "im",
    wohin: "in den",
    woher: "aus dem"
  },
  {
    id: "krankenhaus",
    noun: "Krankenhaus",
    article: "das",
    gender: "n",
    translation: { ru: "больница", en: "hospital" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "zentrum",
    noun: "Zentrum",
    article: "das",
    gender: "n",
    translation: { ru: "центр города", en: "city centre" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "kueche",
    noun: "Küche",
    article: "die",
    gender: "f",
    translation: { ru: "кухня", en: "kitchen" },
    cat: "raum",
    wo: "in der",
    wohin: "in die",
    woher: "aus der"
  },
  {
    id: "stadt",
    noun: "Stadt",
    article: "die",
    gender: "f",
    translation: { ru: "город (поехать в город, в центр)", en: "town (going into town)" },
    cat: "raum",
    wo: "in der",
    wohin: "in die",
    woher: "aus der",
    lead: { wohin: "Ich fahre" },
    note: {
      ru: "Не помещение, но так же: in der · in die · aus der.",
      en: "Not a room, but the same pattern: in der · in die · aus der."
    }
  },
  {
    id: "urlaub",
    noun: "Urlaub",
    article: "der",
    gender: "m",
    translation: { ru: "отпуск", en: "holiday, vacation" },
    cat: "raum",
    wo: "im",
    wohin: "in den",
    woher: "aus dem",
    lead: { wohin: "Ich fahre" },
    note: {
      ru: "Не помещение, но так же: im · in den · aus dem.",
      en: "Not a room, but the same pattern: im · in den · aus dem."
    },
    alt: { woher: ["vom"] }
  },
  {
    id: "bett",
    noun: "Bett",
    article: "das",
    gender: "n",
    translation: { ru: "кровать (в постели)", en: "bed (in bed)" },
    cat: "raum",
    wo: "im",
    wohin: "ins",
    woher: "aus dem",
    lead: { wo: "Ich liege", woher: "Ich springe" }
  },

  // ── Stadt / Land ohne Artikel: in / nach / aus ──
  {
    id: "berlin",
    noun: "Berlin",
    article: "",
    gender: null,
    translation: { ru: "Берлин", en: "Berlin" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "paris",
    noun: "Paris",
    article: "",
    gender: null,
    translation: { ru: "Париж", en: "Paris" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "japan",
    noun: "Japan",
    article: "",
    gender: null,
    translation: { ru: "Япония", en: "Japan" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fliege" }
  },
  {
    id: "italien",
    noun: "Italien",
    article: "",
    gender: null,
    translation: { ru: "Италия", en: "Italy" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fliege" }
  },
  {
    id: "oesterreich",
    noun: "Österreich",
    article: "",
    gender: null,
    translation: { ru: "Австрия", en: "Austria" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "london",
    noun: "London",
    article: "",
    gender: null,
    translation: { ru: "Лондон", en: "London" },
    cat: "stadt",
    wo: "in",
    wohin: "nach",
    woher: "aus",
    lead: { wohin: "Ich fliege" }
  },

  // ── Land mit Artikel: in / in / aus ──
  {
    id: "schweiz",
    noun: "Schweiz",
    article: "die",
    gender: "f",
    translation: { ru: "Швейцария", en: "Switzerland" },
    cat: "land",
    wo: "in der",
    wohin: "in die",
    woher: "aus der",
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "tuerkei",
    noun: "Türkei",
    article: "die",
    gender: "f",
    translation: { ru: "Турция", en: "Turkey" },
    cat: "land",
    wo: "in der",
    wohin: "in die",
    woher: "aus der",
    lead: { wohin: "Ich fliege" }
  },
  {
    id: "usa",
    noun: "USA",
    article: "die",
    gender: "pl",
    translation: { ru: "США", en: "USA" },
    cat: "land",
    wo: "in den",
    wohin: "in die",
    woher: "aus den",
    lead: { wohin: "Ich fliege" }
  },

  // ── Kontakt / „Wasser“: an / an / von ──
  {
    id: "strand",
    noun: "Strand",
    article: "der",
    gender: "m",
    translation: { ru: "пляж", en: "beach" },
    cat: "kontakt",
    wo: "am",
    wohin: "an den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "meer",
    noun: "Meer",
    article: "das",
    gender: "n",
    translation: { ru: "море (на побережье)", en: "sea (at the seaside)" },
    cat: "kontakt",
    wo: "am",
    wohin: "ans",
    woher: "vom",
    alt: { wohin: ["zum"] },
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "see",
    noun: "See",
    article: "der",
    gender: "m",
    translation: { ru: "озеро (на берегу)", en: "lake (on the shore)" },
    cat: "kontakt",
    wo: "am",
    wohin: "an den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "fluss",
    noun: "Fluss",
    article: "der",
    gender: "m",
    translation: { ru: "река (на берегу)", en: "river (on the bank)" },
    cat: "kontakt",
    wo: "am",
    wohin: "an den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "fenster",
    noun: "Fenster",
    article: "das",
    gender: "n",
    translation: { ru: "окно", en: "window" },
    cat: "kontakt",
    wo: "am",
    wohin: "ans",
    woher: "vom",
    alt: { wohin: ["zum"] },
    lead: { wo: "Ich stehe", woher: "Ich gehe" },
    forms: { woher: "Fenster weg" }
  },
  {
    id: "tisch",
    noun: "Tisch",
    article: "der",
    gender: "m",
    translation: { ru: "стол (сесть за стол)", en: "table (sitting at it)" },
    cat: "kontakt",
    wo: "am",
    wohin: "an den",
    woher: "vom",
    lead: { wo: "Ich sitze", wohin: "Ich setze mich", woher: "Ich stehe" },
    forms: { woher: "Tisch auf" }
  },
  {
    id: "ostsee",
    noun: "Ostsee",
    article: "die",
    gender: "f",
    translation: { ru: "Балтийское море (на побережье)", en: "the Baltic Sea (at the seaside)" },
    cat: "kontakt",
    wo: "an der",
    wohin: "an die",
    woher: "von der",
    lead: { wohin: "Ich fahre" },
    alt: { wohin: ["zur"] }
  },

  // ── Offene Fläche: auf / auf / von ──
  {
    id: "sportplatz",
    noun: "Sportplatz",
    article: "der",
    gender: "m",
    translation: { ru: "спортивная площадка", en: "sports ground" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "auf den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "spielplatz",
    noun: "Spielplatz",
    article: "der",
    gender: "m",
    translation: { ru: "детская площадка", en: "playground" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "auf den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "markt",
    noun: "Markt",
    article: "der",
    gender: "m",
    translation: { ru: "рынок", en: "market, marketplace" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "auf den",
    woher: "vom",
    alt: { wohin: ["zum"] }
  },
  {
    id: "balkon",
    noun: "Balkon",
    article: "der",
    gender: "m",
    translation: { ru: "балкон", en: "balcony" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "auf den",
    woher: "vom"
  },
  {
    id: "strasse",
    noun: "Straße",
    article: "die",
    gender: "f",
    translation: { ru: "улица (на дороге, не адрес)", en: "street (on the road, not an address)" },
    cat: "flaeche",
    wo: "auf der",
    wohin: "auf die",
    woher: "von der"
  },
  {
    id: "insel",
    noun: "Insel",
    article: "die",
    gender: "f",
    translation: { ru: "остров", en: "island" },
    cat: "flaeche",
    wo: "auf der",
    wohin: "auf die",
    woher: "von der",
    lead: { wohin: "Ich fahre" },
    alt: { wohin: ["zur"] }
  },
  {
    id: "berg",
    noun: "Berg",
    article: "der",
    gender: "m",
    translation: { ru: "гора (на вершине, на вершину)", en: "mountain (at/to the top)" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "auf den",
    woher: "vom"
  },
  {
    id: "land",
    noun: "Land",
    article: "das",
    gender: "n",
    translation: { ru: "сельская местность (за городом, в деревне)", en: "the countryside" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "aufs",
    woher: "vom",
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "dach",
    noun: "Dach",
    article: "das",
    gender: "n",
    translation: { ru: "крыша", en: "roof" },
    cat: "flaeche",
    wo: "auf dem",
    wohin: "aufs",
    woher: "vom"
  },
  {
    id: "toilette",
    noun: "Toilette",
    article: "die",
    gender: "f",
    translation: { ru: "туалет", en: "toilet, bathroom" },
    cat: "flaeche",
    wo: "auf der",
    wohin: "auf die",
    woher: "von der",
    alt: { wohin: ["zur"] },
    note: {
      ru: "Ausnahme · это комната, но говорят auf (или zu), не in",
      en: "Ausnahme · it's a room, but German says auf (or zu), not in"
    }
  },

  // ── Person / Firma / Aktivität: bei / zu / von ──
  {
    id: "arzt",
    noun: "Arzt",
    article: "der",
    gender: "m",
    translation: { ru: "врач", en: "doctor" },
    cat: "person",
    wo: "beim",
    wohin: "zum",
    woher: "vom"
  },
  {
    id: "friseur",
    noun: "Friseur",
    article: "der",
    gender: "m",
    translation: { ru: "парикмахер", en: "hairdresser" },
    cat: "person",
    wo: "beim",
    wohin: "zum",
    woher: "vom"
  },
  {
    id: "oma",
    noun: "Oma",
    article: "",
    gender: null,
    translation: { ru: "бабушка (моя)", en: "(my) grandma" },
    cat: "person",
    wo: "bei",
    wohin: "zu",
    woher: "von"
  },
  {
    id: "lisa",
    noun: "Lisa",
    article: "",
    gender: null,
    translation: { ru: "Лиза", en: "Lisa" },
    cat: "person",
    wo: "bei",
    wohin: "zu",
    woher: "von"
  },
  {
    id: "hm",
    noun: "H&M",
    article: "",
    gender: null,
    translation: { ru: "H&M (магазин)", en: "H&M (shop)" },
    cat: "person",
    wo: "bei",
    wohin: "zu",
    woher: "von"
  },
  {
    id: "picknick",
    noun: "Picknick",
    article: "das",
    gender: "n",
    translation: { ru: "пикник", en: "picnic" },
    cat: "person",
    wo: "beim",
    wohin: "zum",
    woher: "vom"
  },
  {
    id: "training",
    noun: "Training",
    article: "das",
    gender: "n",
    translation: { ru: "тренировка", en: "training session" },
    cat: "person",
    wo: "beim",
    wohin: "zum",
    woher: "vom",
    alt: { wo: ["im"], wohin: ["ins"], woher: ["aus dem"] }
  },
  {
    id: "arbeit",
    noun: "Arbeit",
    article: "die",
    gender: "f",
    translation: { ru: "работа", en: "work" },
    cat: "person",
    wo: "bei der",
    wohin: "zur",
    woher: "von der",
    alt: { wo: ["auf der"] }
  },
  {
    id: "supermarkt-gegend",
    noun: "Supermarkt",
    article: "der",
    gender: "m",
    translation: { ru: "супермаркет (у супермаркета, не внутри)", en: "supermarket (by the supermarket, not inside)" },
    cat: "person",
    wo: "beim",
    wohin: "zum",
    woher: "vom",
    alt: { wo: ["am"] }
  },
  {
    id: "chefin",
    noun: "Chefin",
    article: "die",
    gender: "f",
    translation: { ru: "начальница", en: "boss" },
    cat: "person",
    wo: "bei der",
    wohin: "zur",
    woher: "von der"
  },
  {
    id: "ikea",
    noun: "Ikea",
    article: "",
    gender: null,
    translation: { ru: "Ikea (магазин)", en: "IKEA (shop)" },
    cat: "person",
    wo: "bei",
    wohin: "zu",
    woher: "von"
  },
  {
    id: "pruefung",
    noun: "Prüfung",
    article: "die",
    gender: "f",
    translation: { ru: "экзамен", en: "exam" },
    cat: "person",
    wo: "bei der",
    wohin: "zur",
    woher: "von der",
    alt: { wo: ["in der"], wohin: ["in die"], woher: ["aus der"] }
  },
  {
    id: "grosseltern",
    noun: "Großeltern",
    article: "die",
    gender: "pl",
    translation: { ru: "бабушка и дедушка", en: "grandparents" },
    cat: "person",
    wo: "bei den",
    wohin: "zu den",
    woher: "von den"
  },
  {
    id: "party",
    noun: "Party",
    article: "die",
    gender: "f",
    translation: { ru: "вечеринка", en: "party" },
    cat: "person",
    wo: "bei der",
    wohin: "zur",
    woher: "von der",
    alt: { wo: ["auf der"], wohin: ["auf die"] }
  },
  {
    id: "hochzeit",
    noun: "Hochzeit",
    article: "die",
    gender: "f",
    translation: { ru: "свадьба", en: "wedding" },
    cat: "person",
    wo: "bei der",
    wohin: "zur",
    woher: "von der",
    alt: { wo: ["auf der"], wohin: ["auf die"] }
  },

  // ── Ausnahmen: immer in ──
  {
    id: "wald",
    noun: "Wald",
    article: "der",
    gender: "m",
    translation: { ru: "лес", en: "forest, woods" },
    cat: "ausnahme",
    wo: "im",
    wohin: "in den",
    woher: "aus dem"
  },
  {
    id: "park",
    noun: "Park",
    article: "der",
    gender: "m",
    translation: { ru: "парк", en: "park" },
    cat: "ausnahme",
    wo: "im",
    wohin: "in den",
    woher: "aus dem"
  },
  {
    id: "garten",
    noun: "Garten",
    article: "der",
    gender: "m",
    translation: { ru: "сад", en: "garden" },
    cat: "ausnahme",
    wo: "im",
    wohin: "in den",
    woher: "aus dem"
  },
  {
    id: "schwimmbad",
    noun: "Schwimmbad",
    article: "das",
    gender: "n",
    translation: { ru: "бассейн", en: "swimming pool" },
    cat: "ausnahme",
    wo: "im",
    wohin: "ins",
    woher: "aus dem"
  },
  {
    id: "berge",
    noun: "Berge",
    article: "die",
    gender: "pl",
    translation: { ru: "горы (в горах)", en: "mountains (in the mountains)" },
    cat: "ausnahme",
    wo: "in den",
    wohin: "in die",
    woher: "aus den",
    forms: { wo: "Bergen", wohin: "Berge", woher: "Bergen" },
    lead: { wohin: "Ich fahre" }
  },
  {
    id: "alpen",
    noun: "Alpen",
    article: "die",
    gender: "pl",
    translation: { ru: "Альпы", en: "Alps" },
    cat: "ausnahme",
    wo: "in den",
    wohin: "in die",
    woher: "aus den",
    lead: { wohin: "Ich fahre" }
  },

  // ── Straße als Adresse: in / in / aus (vs. auf der Straße) ──
  {
    id: "goethestrasse",
    noun: "Goethestraße",
    article: "die",
    gender: "f",
    translation: { ru: "улица Гёте (адрес)", en: "Goethe Street (address)" },
    cat: "adresse",
    wo: "in der",
    wohin: "in die",
    woher: "aus der",
    lead: { wo: "Ich wohne", wohin: "Ich ziehe" }
  },

  // ── Sonderfälle ──
  {
    id: "hause",
    noun: "Hause",
    article: "",
    gender: null,
    translation: { ru: "дом (дома / домой / из дома)", en: "home (at, to, from home)" },
    cat: "hause",
    wo: "zu",
    wohin: "nach",
    woher: "von",
    forms: { wo: "Hause", wohin: "Hause", woher: "zu Hause" }
  },
  {
    id: "bahnhof",
    noun: "Bahnhof",
    article: "der",
    gender: "m",
    translation: { ru: "вокзал (на вокзале: встреча, поезд)", en: "station (meeting point, train)" },
    cat: "anzu",
    wo: "am",
    wohin: "zum",
    woher: "vom",
    alt: { wohin: ["an den"] }
  },
  {
    id: "flughafen",
    noun: "Flughafen",
    article: "der",
    gender: "m",
    translation: { ru: "аэропорт (в аэропорту: рейс, встреча)", en: "airport (flight, meeting point)" },
    cat: "anzu",
    wo: "am",
    wohin: "zum",
    woher: "vom",
    lead: { wohin: "Ich fahre" },
    alt: { wo: ["auf dem"] }
  },
  {
    id: "haltestelle",
    noun: "Haltestelle",
    article: "die",
    gender: "f",
    translation: { ru: "остановка (автобуса, трамвая)", en: "bus / tram stop" },
    cat: "anzu",
    wo: "an der",
    wohin: "zur",
    woher: "von der",
    alt: { wohin: ["an die"] }
  },
  {
    id: "tankstelle",
    noun: "Tankstelle",
    article: "die",
    gender: "f",
    translation: { ru: "заправка", en: "petrol station" },
    cat: "anzu",
    wo: "an der",
    wohin: "zur",
    woher: "von der",
    alt: { wohin: ["an die"] }
  },
  {
    id: "kasse",
    noun: "Kasse",
    article: "die",
    gender: "f",
    translation: { ru: "касса", en: "checkout, till" },
    cat: "anzu",
    wo: "an der",
    wohin: "zur",
    woher: "von der",
    alt: { wohin: ["an die"] }
  }
];
