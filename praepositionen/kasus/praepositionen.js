// German Learning App — Präpositionen → Kasus
// База для тренажёра «Präposition → Kasus».
// Источник отбора: список преподавателя «Liste der deutschen Präpositionen nach Kasus»; QA 2026-09-24:
// только разговорные и «образованные» B1–B2, без канцелярских (см. Documentation/QA/QA_03_Kasus.md).
// Не включены: Wechselpräpositionen и локальные Präpositionen для отдельной будущей игры.
// Loaded by kasus.html as window.PRAEPOSITIONEN (same pattern as Artikel/words.js).
// translation, exampleTranslation, note, variantNote are {ru, en}; picked by the Translations setting
// via components/deutsch-translation-v1.js.

window.PRAEPOSITIONEN = [
  {
    "preposition": "durch",
    "translation": {
      "ru": "через, сквозь",
      "en": "through"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Er geht durch den Park.",
    "exampleTranslation": {
      "ru": "Он идёт через парк.",
      "en": "He is walking through the park."
    }
  },
  {
    "preposition": "für",
    "translation": {
      "ru": "для, за",
      "en": "for"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Das ist ein Geschenk für meinen Vater.",
    "exampleTranslation": {
      "ru": "Это подарок для моего отца.",
      "en": "This is a present for my father."
    }
  },
  {
    "preposition": "gegen",
    "translation": {
      "ru": "против, около",
      "en": "against; around (time)"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Sie ist gegen die Wand gelaufen.",
    "exampleTranslation": {
      "ru": "Она врезалась в стену.",
      "en": "She walked into the wall."
    }
  },
  {
    "preposition": "ohne",
    "translation": {
      "ru": "без",
      "en": "without"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Ich trinke Kaffee ohne Zucker.",
    "exampleTranslation": {
      "ru": "Я пью кофе без сахара.",
      "en": "I drink coffee without sugar."
    }
  },
  {
    "preposition": "um",
    "translation": {
      "ru": "вокруг, в (о времени)",
      "en": "around; at (time)"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Wir sitzen um den Tisch herum.",
    "exampleTranslation": {
      "ru": "Мы сидим вокруг стола.",
      "en": "We are sitting around the table."
    }
  },
  {
    "preposition": "bis",
    "translation": {
      "ru": "до",
      "en": "until, as far as"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "note": {
      "ru": "Часто вместе с другим предлогом: bis zum Bahnhof (тогда Dativ из-за zu).",
      "en": "Often used with another preposition: bis zum Bahnhof (then Dativ because of zu)."
    },
    "example": "Ich arbeite bis nächsten Freitag.",
    "exampleTranslation": {
      "ru": "Я работаю до следующей пятницы.",
      "en": "I'm working until next Friday."
    }
  },
  {
    "preposition": "… entlang",
    "translation": {
      "ru": "вдоль",
      "en": "along"
    },
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Er geht die Straße entlang.",
    "exampleTranslation": {
      "ru": "Он идёт вдоль улицы.",
      "en": "He is walking along the street."
    }
  },
  {
    "preposition": "entlang …",
    "translation": {
      "ru": "вдоль",
      "en": "along"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "also_correct"
      }
    ],
    "note": {
      "ru": "Dativ также возможен, но реже.",
      "en": "Dativ is also possible, but less common."
    },
    "variantNote": {
      "ru": "Dativ тоже возможен, но Genitiv встречается чаще.",
      "en": "Dativ is also possible, but Genitiv is more common."
    },
    "example": "Entlang des Flusses stehen alte Bäume.",
    "exampleTranslation": {
      "ru": "Вдоль реки стоят старые деревья.",
      "en": "There are old trees along the river."
    }
  },
  {
    "preposition": "aus",
    "translation": {
      "ru": "из, от",
      "en": "out of, from"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Sie kommt aus Japan.",
    "exampleTranslation": {
      "ru": "Она из Японии.",
      "en": "She is from Japan."
    }
  },
  {
    "preposition": "bei",
    "translation": {
      "ru": "у, при, около",
      "en": "at, with, near"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Er wohnt bei seinen Eltern.",
    "exampleTranslation": {
      "ru": "Он живёт у своих родителей.",
      "en": "He lives with his parents."
    }
  },
  {
    "preposition": "mit",
    "translation": {
      "ru": "с",
      "en": "with; by (transport)"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich fahre mit dem Zug.",
    "exampleTranslation": {
      "ru": "Я еду на поезде.",
      "en": "I'm going by train."
    }
  },
  {
    "preposition": "nach",
    "translation": {
      "ru": "после, в/на",
      "en": "after; to (places)"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Nach der Arbeit gehe ich nach Hause.",
    "exampleTranslation": {
      "ru": "После работы я иду домой.",
      "en": "After work I'm going home."
    }
  },
  {
    "preposition": "seit",
    "translation": {
      "ru": "с, уже",
      "en": "since, for (time)"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich lerne seit drei Jahren Deutsch.",
    "exampleTranslation": {
      "ru": "Я уже три года учу немецкий.",
      "en": "I have been learning German for three years."
    }
  },
  {
    "preposition": "von",
    "translation": {
      "ru": "от, из, с, о",
      "en": "from, of, by"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Das ist das Auto von meinem Chef.",
    "exampleTranslation": {
      "ru": "Это машина моего начальника.",
      "en": "That's my boss's car."
    }
  },
  {
    "preposition": "zu",
    "translation": {
      "ru": "к, в, на",
      "en": "to"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich gehe zum Arzt.",
    "exampleTranslation": {
      "ru": "Я иду к врачу.",
      "en": "I'm going to the doctor's."
    }
  },
  {
    "preposition": "ab",
    "translation": {
      "ru": "начиная с",
      "en": "from, as of"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ab nächster Woche arbeite ich hier.",
    "exampleTranslation": {
      "ru": "Со следующей недели я работаю здесь.",
      "en": "From next week, I'll be working here."
    }
  },
  {
    "preposition": "außer",
    "translation": {
      "ru": "кроме",
      "en": "except, apart from"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Alle waren da, außer ihm.",
    "exampleTranslation": {
      "ru": "Все были там, кроме него.",
      "en": "Everyone was there except him."
    }
  },
  {
    "preposition": "gegenüber",
    "translation": {
      "ru": "напротив",
      "en": "opposite"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Das Café ist gegenüber dem Bahnhof.",
    "exampleTranslation": {
      "ru": "Кафе находится напротив вокзала.",
      "en": "The café is opposite the station."
    }
  },
  {
    "preposition": "entgegen",
    "translation": {
      "ru": "вопреки, навстречу",
      "en": "contrary to; towards"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Entgegen meiner Erwartung hat er gewonnen.",
    "exampleTranslation": {
      "ru": "Вопреки моим ожиданиям, он победил.",
      "en": "Contrary to my expectations, he won."
    }
  },
  {
    "preposition": "laut",
    "translation": {
      "ru": "согласно, по данным",
      "en": "according to"
    },
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      },
      {
        "case": "Genitiv",
        "status": "also_correct"
      }
    ],
    "note": {
      "ru": "Genitiv тоже возможен, но реже.",
      "en": "Genitiv is also possible, but less common."
    },
    "variantNote": {
      "ru": "Genitiv тоже возможен, но Dativ встречается чаще.",
      "en": "Genitiv is also possible, but Dativ is more common."
    },
    "example": "Laut einem Bericht ist er zurückgetreten.",
    "exampleTranslation": {
      "ru": "Согласно сообщению, он подал в отставку.",
      "en": "According to a report, he has resigned."
    }
  },
  {
    "preposition": "wegen",
    "translation": {
      "ru": "из-за, вследствие",
      "en": "because of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "colloquial"
      }
    ],
    "note": {
      "ru": "В разговорной речи также используется Dativ.",
      "en": "In spoken German, Dativ is also used."
    },
    "variantNote": {
      "ru": "Это разговорный вариант. В письменной речи лучше Genitiv.",
      "en": "This is the colloquial form. In writing, Genitiv is better."
    },
    "example": "Wegen des schlechten Wetters blieben wir zu Hause.",
    "exampleTranslation": {
      "ru": "Из-за плохой погоды мы остались дома.",
      "en": "Because of the bad weather, we stayed at home."
    }
  },
  {
    "preposition": "trotz",
    "translation": {
      "ru": "несмотря на",
      "en": "despite, in spite of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "colloquial"
      }
    ],
    "note": {
      "ru": "В разговорной речи также используется Dativ.",
      "en": "In spoken German, Dativ is also used."
    },
    "variantNote": {
      "ru": "Это разговорный вариант. В письменной речи лучше Genitiv.",
      "en": "This is the colloquial form. In writing, Genitiv is better."
    },
    "example": "Trotz des Regens gingen wir spazieren.",
    "exampleTranslation": {
      "ru": "Несмотря на дождь, мы пошли гулять.",
      "en": "Despite the rain, we went for a walk."
    }
  },
  {
    "preposition": "während",
    "translation": {
      "ru": "во время",
      "en": "during"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "colloquial"
      }
    ],
    "note": {
      "ru": "В разговорной речи также используется Dativ.",
      "en": "In spoken German, Dativ is also used."
    },
    "variantNote": {
      "ru": "Это разговорный вариант. В письменной речи лучше Genitiv.",
      "en": "This is the colloquial form. In writing, Genitiv is better."
    },
    "example": "Während des Essens sprachen sie nicht.",
    "exampleTranslation": {
      "ru": "Во время еды они не разговаривали.",
      "en": "They didn't talk during the meal."
    }
  },
  {
    "preposition": "statt / anstatt",
    "translation": {
      "ru": "вместо",
      "en": "instead of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "colloquial"
      }
    ],
    "example": "Statt eines Kuchens gab es Eis.",
    "exampleTranslation": {
      "ru": "Вместо торта было мороженое.",
      "en": "Instead of a cake, there was ice cream."
    },
    "note": {
      "ru": "В разговорной речи также используется Dativ.",
      "en": "In spoken German, Dativ is also used."
    },
    "variantNote": {
      "ru": "Это разговорный вариант. В письменной речи лучше Genitiv.",
      "en": "This is the colloquial form. In writing, Genitiv is better."
    }
  },
  {
    "preposition": "anstelle",
    "translation": {
      "ru": "вместо, на месте",
      "en": "instead of, in place of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Anstelle meines Bruders kam ich.",
    "exampleTranslation": {
      "ru": "Вместо моего брата пришёл я.",
      "en": "I came in place of my brother."
    }
  },
  {
    "preposition": "aufgrund",
    "translation": {
      "ru": "из-за, вследствие, на основании",
      "en": "due to, on the basis of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Aufgrund eines Fehlers wurde er entlassen.",
    "exampleTranslation": {
      "ru": "Из-за ошибки его уволили.",
      "en": "He was fired due to a mistake."
    }
  },
  {
    "preposition": "dank",
    "translation": {
      "ru": "благодаря",
      "en": "thanks to"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      },
      {
        "case": "Dativ",
        "status": "also_correct"
      }
    ],
    "note": {
      "ru": "Dativ также возможен.",
      "en": "Dativ is also possible."
    },
    "variantNote": {
      "ru": "Dativ тоже возможен, но Genitiv встречается чаще.",
      "en": "Dativ is also possible, but Genitiv is more common."
    },
    "example": "Dank seiner Hilfe haben wir es geschafft.",
    "exampleTranslation": {
      "ru": "Благодаря его помощи мы справились.",
      "en": "Thanks to his help, we managed it."
    }
  },
  {
    "preposition": "mithilfe",
    "translation": {
      "ru": "с помощью",
      "en": "with the help of"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Mithilfe einer Karte haben wir den Weg gefunden.",
    "exampleTranslation": {
      "ru": "С помощью карты мы нашли дорогу.",
      "en": "We found the way with the help of a map."
    }
  },
  {
    "preposition": "anhand",
    "translation": {
      "ru": "на примере, на основе, по",
      "en": "using, based on"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Anhand eines Beispiels erkläre ich es dir.",
    "exampleTranslation": {
      "ru": "Я объясню тебе это на примере.",
      "en": "I'll explain it to you using an example."
    }
  },
  {
    "preposition": "angesichts",
    "translation": {
      "ru": "ввиду, учитывая",
      "en": "in view of, given"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Angesichts der Lage müssen wir handeln.",
    "exampleTranslation": {
      "ru": "Учитывая ситуацию, мы должны действовать.",
      "en": "Given the situation, we have to act."
    }
  },
  {
    "preposition": "innerhalb",
    "translation": {
      "ru": "внутри, в течение",
      "en": "inside; within (time)"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Innerhalb einer Woche war alles fertig.",
    "exampleTranslation": {
      "ru": "В течение недели всё было готово.",
      "en": "Within a week, everything was ready."
    }
  },
  {
    "preposition": "außerhalb",
    "translation": {
      "ru": "вне, за пределами",
      "en": "outside"
    },
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Wir wohnen außerhalb der Stadt.",
    "exampleTranslation": {
      "ru": "Мы живём за городом.",
      "en": "We live outside the city."
    }
  }
];
