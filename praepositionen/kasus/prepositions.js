// Fester Kasus (Präposition → Kasus) — the prepositions, their case(s), translations and examples.
// Source: the teacher's list „Liste der deutschen Präpositionen nach Kasus“; QA 2026-09-24
// (Documentation/QA/QA_03_Kasus.md): spoken and „educated“ B1–B2 prepositions only, no officialese.
// Not included: the Wechselpräpositionen and the local prepositions (those are practised in Ortspräpositionen).
// Loaded by index.html before kasus.js (window.PRAEPOSITIONEN).
// Was praepositionen.js until v18 (renamed in v19, content unchanged).
// Keep every preposition's spelling: difficulty and progress are stored per preposition (in lower case).
// When this file changes, raise its ?v= in index.html, the Präpositionen page's kasus/index.html?v=
// and the Home tile's praepositionen/?v=
//
// Fields:
//   preposition        - German preposition as shown on the card
//   translation        - line under the preposition, {ru, en}
//                        (picked by the Translations setting via components/deutsch-translation-v1.js)
//   cases              - every case that counts as right: {case: Akkusativ / Dativ / Genitiv, status}
//                        status "standard"     = the main answer (green; shown when the answer was wrong)
//                               "also_correct" = right too, shown in blue as „Richtig · Auch möglich“
//                               "colloquial"   = right too, shown in blue as „Richtig · Umgangssprachlich“
//   note               - optional {ru, en} line under the case after a right standard (green) answer
//   variantNote        - optional {ru, en} line after a blue answer
//                        (default: „Häufiger: <standard>.“ / „Standard: <standard>.“)
//   example            - German example sentence
//   exampleTranslation - {ru, en}
//   example2, exampleTranslation2 - optional second example (ab: Dativ + Akkusativ; gegenüber: place + towards)

window.PRAEPOSITIONEN = [
  {
    preposition: "durch",
    translation: { ru: "через, сквозь", en: "through" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Er geht durch den Park.",
    exampleTranslation: { ru: "Он идёт через парк.", en: "He is walking through the park." }
  },
  {
    preposition: "für",
    translation: { ru: "для, за", en: "for" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Das ist ein Geschenk für meinen Vater.",
    exampleTranslation: { ru: "Это подарок для моего отца.", en: "This is a present for my father." }
  },
  {
    preposition: "gegen",
    translation: { ru: "против; около (о времени)", en: "against; around (time)" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Sie ist gegen die Wand gelaufen.",
    exampleTranslation: { ru: "Она врезалась в стену.", en: "She walked into the wall." }
  },
  {
    preposition: "ohne",
    translation: { ru: "без", en: "without" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Ich gehe nie ohne meinen Regenschirm aus dem Haus.",
    exampleTranslation: {
      ru: "Я никогда не выхожу из дома без зонта.",
      en: "I never leave the house without my umbrella."
    }
  },
  {
    preposition: "um",
    translation: { ru: "вокруг, в (о времени)", en: "around; at (time)" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Wir sitzen um den Tisch herum.",
    exampleTranslation: { ru: "Мы сидим вокруг стола.", en: "We are sitting around the table." }
  },
  {
    preposition: "bis",
    translation: { ru: "до", en: "until, as far as" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    note: {
      ru: "Часто вместе с другим предлогом: bis zum Bahnhof (тогда Dativ из-за zu).",
      en: "Often used with another preposition: bis zum Bahnhof (then Dativ because of zu)."
    },
    example: "Ich arbeite bis nächsten Freitag.",
    exampleTranslation: { ru: "Я работаю до следующей пятницы.", en: "I'm working until next Friday." }
  },
  {
    preposition: "… entlang",
    translation: { ru: "вдоль (после слова)", en: "along (after the noun)" },
    cases: [{ case: "Akkusativ", status: "standard" }],
    example: "Er geht die Straße entlang.",
    exampleTranslation: { ru: "Он идёт вдоль улицы.", en: "He is walking along the street." },
    note: {
      ru: "После слова - Akkusativ. Перед словом - Genitiv: entlang des Flusses.",
      en: "After the noun: Akkusativ. Before the noun: Genitiv: entlang des Flusses."
    }
  },
  {
    preposition: "entlang …",
    translation: { ru: "вдоль (перед словом)", en: "along (before the noun)" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "also_correct" }
    ],
    note: {
      ru: "Перед словом - Genitiv (реже Dativ). После слова - Akkusativ: den Fluss entlang.",
      en: "Before the noun: Genitiv (less often Dativ). After the noun: Akkusativ: den Fluss entlang."
    },
    variantNote: {
      ru: "Dativ тоже возможен, но Genitiv встречается чаще.",
      en: "Dativ is also possible, but Genitiv is more common."
    },
    example: "Entlang des Flusses stehen alte Bäume.",
    exampleTranslation: { ru: "Вдоль реки стоят старые деревья.", en: "There are old trees along the river." }
  },
  {
    preposition: "aus",
    translation: { ru: "из, от", en: "out of, from" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Er kommt gerade aus dem Kino.",
    exampleTranslation: { ru: "Он как раз идёт из кино.", en: "He's just coming out of the cinema." }
  },
  {
    preposition: "bei",
    translation: { ru: "у, при, около", en: "at, with, near" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Er wohnt bei seinen Eltern.",
    exampleTranslation: { ru: "Он живёт у своих родителей.", en: "He lives with his parents." }
  },
  {
    preposition: "mit",
    translation: { ru: "с; на (о транспорте)", en: "with; by (transport)" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Ich fahre mit dem Zug.",
    exampleTranslation: { ru: "Я еду на поезде.", en: "I'm going by train." }
  },
  {
    preposition: "nach",
    translation: { ru: "после; в (о городах и странах)", en: "after; to (cities, countries)" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Nach dem Unterricht gehe ich nach Hause.",
    exampleTranslation: { ru: "После занятий я иду домой.", en: "After class I'm going home." }
  },
  {
    preposition: "seit",
    translation: { ru: "с (какого-то времени)", en: "since, for (time)" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Ich lerne seit drei Jahren Deutsch.",
    exampleTranslation: { ru: "Я уже три года учу немецкий.", en: "I have been learning German for three years." }
  },
  {
    preposition: "von",
    translation: { ru: "от, из, с, о", en: "from, of, by" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Das ist das Auto von meinem Chef.",
    exampleTranslation: { ru: "Это машина моего начальника.", en: "That's my boss's car." }
  },
  {
    preposition: "zu",
    translation: { ru: "к, в, на", en: "to" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Ich gehe zum Arzt.",
    exampleTranslation: { ru: "Я иду к врачу.", en: "I'm going to the doctor's." }
  },
  {
    preposition: "ab",
    translation: { ru: "начиная с", en: "from, as of" },
    cases: [
      { case: "Dativ", status: "standard" },
      { case: "Akkusativ", status: "also_correct" }
    ],
    example: "Ab dem ersten Mai arbeite ich hier.",
    exampleTranslation: {
      ru: "С первого мая я буду работать здесь.",
      en: "I'll be working here from the first of May."
    },
    note: {
      ru: "Akkusativ тоже возможен - без артикля, с прилагательным: ab nächsten Montag.",
      en: "Akkusativ is also possible - without an article, with an adjective: ab nächsten Montag."
    },
    variantNote: {
      ru: "Обычно - Dativ. Akkusativ - только без артикля, с прилагательным.",
      en: "Usually Dativ. Akkusativ only without an article, with an adjective."
    },
    example2: "Ab nächsten Montag habe ich Urlaub.",
    exampleTranslation2: { ru: "Со следующего понедельника у меня отпуск.", en: "I'm on holiday from next Monday." }
  },
  {
    preposition: "außer",
    translation: { ru: "кроме", en: "except, apart from" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Alle waren da, außer ihm.",
    exampleTranslation: { ru: "Все были там, кроме него.", en: "Everyone was there except him." }
  },
  {
    preposition: "gegenüber",
    translation: { ru: "напротив; по отношению к", en: "opposite; towards, in relation to (someone)" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Das Café liegt gegenüber dem Bahnhof.",
    exampleTranslation: { ru: "Кафе находится напротив вокзала.", en: "The café is opposite the station." },
    note: {
      ru: "С личным местоимением - после него: mir gegenüber.",
      en: "With a personal pronoun, it comes after it: mir gegenüber."
    },
    example2: "Er ist mir gegenüber immer ehrlich.",
    exampleTranslation2: { ru: "Он со мной всегда честен.", en: "He's always honest with me." }
  },
  {
    preposition: "entgegen",
    translation: { ru: "вопреки; навстречу", en: "contrary to; towards" },
    cases: [{ case: "Dativ", status: "standard" }],
    example: "Entgegen allen Erwartungen hat er gewonnen.",
    exampleTranslation: { ru: "Вопреки всем ожиданиям он победил.", en: "Contrary to all expectations, he won." }
  },
  {
    preposition: "laut",
    translation: { ru: "согласно, по данным", en: "according to" },
    cases: [
      { case: "Dativ", status: "standard" },
      { case: "Genitiv", status: "also_correct" }
    ],
    note: { ru: "Genitiv тоже возможен, но реже.", en: "Genitiv is also possible, but less common." },
    variantNote: {
      ru: "Genitiv тоже возможен, но Dativ встречается чаще.",
      en: "Genitiv is also possible, but Dativ is more common."
    },
    example: "Laut dem Wetterbericht regnet es morgen.",
    exampleTranslation: {
      ru: "Согласно прогнозу погоды, завтра будет дождь.",
      en: "According to the weather forecast, it will rain tomorrow."
    }
  },
  {
    preposition: "wegen",
    translation: { ru: "из-за", en: "because of" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "colloquial" }
    ],
    note: { ru: "В разговорной речи также используется Dativ.", en: "In spoken German, Dativ is also used." },
    variantNote: {
      ru: "Это разговорный вариант. В письменной речи лучше Genitiv.",
      en: "This is the colloquial form. In writing, Genitiv is better."
    },
    example: "Wegen des schlechten Wetters blieben wir zu Hause.",
    exampleTranslation: {
      ru: "Из-за плохой погоды мы остались дома.",
      en: "Because of the bad weather, we stayed at home."
    }
  },
  {
    preposition: "trotz",
    translation: { ru: "несмотря на", en: "despite, in spite of" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "also_correct" }
    ],
    note: {
      ru: "Dativ - чаще на юге Германии, в Австрии и Швейцарии; в письменной речи - Genitiv. Но всегда: trotz allem (Dativ).",
      en: "Dativ - more common in southern Germany, Austria and Switzerland; in writing, Genitiv. But always: trotz allem (Dativ)."
    },
    variantNote: {
      ru: "Dativ - чаще на юге Германии, в Австрии и Швейцарии; в письменной речи - Genitiv. Но всегда: trotz allem (Dativ).",
      en: "Dativ - more common in southern Germany, Austria and Switzerland; in writing, Genitiv. But always: trotz allem (Dativ)."
    },
    example: "Trotz des Regens gingen wir spazieren.",
    exampleTranslation: { ru: "Несмотря на дождь, мы пошли гулять.", en: "Despite the rain, we went for a walk." }
  },
  {
    preposition: "während",
    translation: { ru: "во время", en: "during" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "colloquial" }
    ],
    note: { ru: "В разговорной речи также используется Dativ.", en: "In spoken German, Dativ is also used." },
    variantNote: {
      ru: "Это разговорный вариант. В письменной речи лучше Genitiv.",
      en: "This is the colloquial form. In writing, Genitiv is better."
    },
    example: "Während des Essens sprachen sie nicht.",
    exampleTranslation: { ru: "Во время еды они не разговаривали.", en: "They didn't talk during the meal." }
  },
  {
    preposition: "statt / anstatt",
    translation: { ru: "вместо", en: "instead of" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "colloquial" }
    ],
    example: "Statt eines Briefes hat er mir eine E-Mail geschrieben.",
    exampleTranslation: { ru: "Вместо письма он написал мне имейл.", en: "Instead of a letter, he wrote me an email." },
    note: { ru: "В разговорной речи также используется Dativ.", en: "In spoken German, Dativ is also used." },
    variantNote: {
      ru: "Это разговорный вариант. В письменной речи лучше Genitiv.",
      en: "This is the colloquial form. In writing, Genitiv is better."
    }
  },
  {
    preposition: "anstelle",
    translation: { ru: "вместо", en: "instead of, in place of" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Ich bin anstelle meines Bruders gekommen.",
    exampleTranslation: { ru: "Я пришёл(а) вместо брата.", en: "I came instead of my brother." },
    note: { ru: "Также: anstelle von + Dativ.", en: "Also: anstelle von + Dativ." }
  },
  {
    preposition: "aufgrund",
    translation: { ru: "из-за, вследствие, на основании", en: "due to, because of, on the basis of" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Aufgrund eines Fehlers wurde er entlassen.",
    exampleTranslation: { ru: "Из-за ошибки его уволили.", en: "He was fired because of a mistake." },
    note: { ru: "Также: aufgrund von + Dativ.", en: "Also: aufgrund von + Dativ." }
  },
  {
    preposition: "dank",
    translation: { ru: "благодаря", en: "thanks to" },
    cases: [
      { case: "Genitiv", status: "standard" },
      { case: "Dativ", status: "also_correct" }
    ],
    note: { ru: "Dativ также возможен, но реже.", en: "Dativ is also possible, but less common." },
    variantNote: {
      ru: "Dativ тоже возможен, но Genitiv встречается чаще.",
      en: "Dativ is also possible, but Genitiv is more common."
    },
    example: "Dank deines Tipps habe ich den Job bekommen.",
    exampleTranslation: { ru: "Благодаря твоему совету я получил(а) работу.", en: "Thanks to your tip, I got the job." }
  },
  {
    preposition: "mithilfe",
    translation: { ru: "с помощью", en: "with the help of" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Mithilfe eines Wörterbuchs habe ich den Text übersetzt.",
    exampleTranslation: {
      ru: "С помощью словаря я перевёл(а) текст.",
      en: "I translated the text with the help of a dictionary."
    },
    note: { ru: "Также: mithilfe von + Dativ.", en: "Also: mithilfe von + Dativ." }
  },
  {
    preposition: "anhand",
    translation: { ru: "на основе, по (чему-либо)", en: "using, based on" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Anhand eines Beispiels erkläre ich es dir.",
    exampleTranslation: { ru: "Я объясню тебе это на примере.", en: "I'll explain it to you using an example." },
    note: { ru: "Также: anhand von + Dativ.", en: "Also: anhand von + Dativ." }
  },
  {
    preposition: "angesichts",
    translation: { ru: "ввиду, учитывая", en: "in view of, given" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Angesichts des hohen Preises habe ich das Auto nicht gekauft.",
    exampleTranslation: {
      ru: "Учитывая высокую цену, я не купил(а) машину.",
      en: "Given the high price, I didn't buy the car."
    }
  },
  {
    preposition: "innerhalb",
    translation: { ru: "внутри, в течение", en: "inside; within (time)" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Innerhalb eines Monats war alles fertig.",
    exampleTranslation: { ru: "В течение месяца всё было готово.", en: "Within a month, everything was ready." },
    note: {
      ru: "Часто: innerhalb von + Dativ (innerhalb von zwei Wochen).",
      en: "Often: innerhalb von + Dativ (innerhalb von zwei Wochen)."
    }
  },
  {
    preposition: "außerhalb",
    translation: { ru: "вне, за пределами", en: "outside" },
    cases: [{ case: "Genitiv", status: "standard" }],
    example: "Das Hotel liegt außerhalb des Zentrums.",
    exampleTranslation: { ru: "Отель находится за пределами центра.", en: "The hotel is outside the centre." },
    note: { ru: "Также: außerhalb von + Dativ.", en: "Also: außerhalb von + Dativ." }
  }
];
