// German Learning App — Präpositionen → Kasus
// База для тренажёра «Präposition → Kasus».
// Источник отбора: список преподавателя «Liste der deutschen Präpositionen nach Kasus»; QA 2026-09-24:
// только разговорные и «образованные» B1–B2, без канцелярских (см. Documentation/QA/QA_03_Kasus.md).
// Не включены: Wechselpräpositionen и локальные Präpositionen для отдельной будущей игры.
// Loaded by kasus.html as window.PRAEPOSITIONEN (same pattern as Artikel/words.js).

window.PRAEPOSITIONEN = [
  {
    "preposition": "durch",
    "translation": "через, сквозь",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Er geht durch den Park.",
    "exampleTranslation": "Он идёт через парк."
  },
  {
    "preposition": "für",
    "translation": "для, за",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Das ist ein Geschenk für meinen Vater.",
    "exampleTranslation": "Это подарок для моего отца."
  },
  {
    "preposition": "gegen",
    "translation": "против, около",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Sie ist gegen die Wand gelaufen.",
    "exampleTranslation": "Она врезалась в стену."
  },
  {
    "preposition": "ohne",
    "translation": "без",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Ich trinke Kaffee ohne Zucker.",
    "exampleTranslation": "Я пью кофе без сахара."
  },
  {
    "preposition": "um",
    "translation": "вокруг, в (о времени)",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Wir sitzen um den Tisch herum.",
    "exampleTranslation": "Мы сидим вокруг стола."
  },
  {
    "preposition": "bis",
    "translation": "до",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "note": "Часто вместе с другим предлогом: bis zum Bahnhof (тогда Dativ из-за zu).",
    "example": "Ich arbeite bis nächsten Freitag.",
    "exampleTranslation": "Я работаю до следующей пятницы."
  },
  {
    "preposition": "… entlang",
    "translation": "вдоль",
    "cases": [
      {
        "case": "Akkusativ",
        "status": "standard"
      }
    ],
    "example": "Er geht die Straße entlang.",
    "exampleTranslation": "Он идёт вдоль улицы."
  },
  {
    "preposition": "entlang …",
    "translation": "вдоль",
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
    "note": "Dativ также возможен, но реже.",
    "variantNote": "Dativ тоже возможен, но Genitiv встречается чаще.",
    "example": "Entlang des Flusses stehen alte Bäume.",
    "exampleTranslation": "Вдоль реки стоят старые деревья."
  },
  {
    "preposition": "aus",
    "translation": "из, от",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Sie kommt aus Japan.",
    "exampleTranslation": "Она из Японии."
  },
  {
    "preposition": "bei",
    "translation": "у, при, около",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Er wohnt bei seinen Eltern.",
    "exampleTranslation": "Он живёт у своих родителей."
  },
  {
    "preposition": "mit",
    "translation": "с",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich fahre mit dem Zug.",
    "exampleTranslation": "Я еду на поезде."
  },
  {
    "preposition": "nach",
    "translation": "после, в/на",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Nach der Arbeit gehe ich nach Hause.",
    "exampleTranslation": "После работы я иду домой."
  },
  {
    "preposition": "seit",
    "translation": "с, уже",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich lerne seit drei Jahren Deutsch.",
    "exampleTranslation": "Я уже три года учу немецкий."
  },
  {
    "preposition": "von",
    "translation": "от, из, с, о",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Das ist das Auto von meinem Chef.",
    "exampleTranslation": "Это машина моего начальника."
  },
  {
    "preposition": "zu",
    "translation": "к, в, на",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ich gehe zum Arzt.",
    "exampleTranslation": "Я иду к врачу."
  },
  {
    "preposition": "ab",
    "translation": "начиная с",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Ab nächster Woche arbeite ich hier.",
    "exampleTranslation": "Со следующей недели я работаю здесь."
  },
  {
    "preposition": "außer",
    "translation": "кроме",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Alle waren da, außer ihm.",
    "exampleTranslation": "Все были там, кроме него."
  },
  {
    "preposition": "gegenüber",
    "translation": "напротив",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Das Café ist gegenüber dem Bahnhof.",
    "exampleTranslation": "Кафе находится напротив вокзала."
  },
  {
    "preposition": "entgegen",
    "translation": "вопреки, навстречу",
    "cases": [
      {
        "case": "Dativ",
        "status": "standard"
      }
    ],
    "example": "Entgegen meiner Erwartung hat er gewonnen.",
    "exampleTranslation": "Вопреки моим ожиданиям, он победил."
  },
  {
    "preposition": "laut",
    "translation": "согласно, по данным",
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
    "note": "Genitiv тоже возможен, но реже.",
    "variantNote": "Genitiv тоже возможен, но Dativ встречается чаще.",
    "example": "Laut einem Bericht ist er zurückgetreten.",
    "exampleTranslation": "Согласно сообщению, он подал в отставку."
  },
  {
    "preposition": "wegen",
    "translation": "из-за, вследствие",
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
    "note": "В разговорной речи также используется Dativ.",
    "variantNote": "Это разговорный вариант. В письменной речи лучше Genitiv.",
    "example": "Wegen des schlechten Wetters blieben wir zu Hause.",
    "exampleTranslation": "Из-за плохой погоды мы остались дома."
  },
  {
    "preposition": "trotz",
    "translation": "несмотря на",
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
    "note": "В разговорной речи также используется Dativ.",
    "variantNote": "Это разговорный вариант. В письменной речи лучше Genitiv.",
    "example": "Trotz des Regens gingen wir spazieren.",
    "exampleTranslation": "Несмотря на дождь, мы пошли гулять."
  },
  {
    "preposition": "während",
    "translation": "во время",
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
    "note": "В разговорной речи также используется Dativ.",
    "variantNote": "Это разговорный вариант. В письменной речи лучше Genitiv.",
    "example": "Während des Essens sprachen sie nicht.",
    "exampleTranslation": "Во время еды они не разговаривали."
  },
  {
    "preposition": "statt / anstatt",
    "translation": "вместо",
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
    "exampleTranslation": "Вместо торта было мороженое.",
    "note": "В разговорной речи также используется Dativ.",
    "variantNote": "Это разговорный вариант. В письменной речи лучше Genitiv."
  },
  {
    "preposition": "anstelle",
    "translation": "вместо, на месте",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Anstelle meines Bruders kam ich.",
    "exampleTranslation": "Вместо моего брата пришёл я."
  },
  {
    "preposition": "aufgrund",
    "translation": "из-за, вследствие, на основании",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Aufgrund eines Fehlers wurde er entlassen.",
    "exampleTranslation": "Из-за ошибки его уволили."
  },
  {
    "preposition": "dank",
    "translation": "благодаря",
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
    "note": "Dativ также возможен.",
    "variantNote": "Dativ тоже возможен, но Genitiv встречается чаще.",
    "example": "Dank seiner Hilfe haben wir es geschafft.",
    "exampleTranslation": "Благодаря его помощи мы справились."
  },
  {
    "preposition": "mithilfe",
    "translation": "с помощью",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Mithilfe einer Karte haben wir den Weg gefunden.",
    "exampleTranslation": "С помощью карты мы нашли дорогу."
  },
  {
    "preposition": "anhand",
    "translation": "на примере, на основе, по",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Anhand eines Beispiels erkläre ich es dir.",
    "exampleTranslation": "Я объясню тебе это на примере."
  },
  {
    "preposition": "angesichts",
    "translation": "ввиду, учитывая",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Angesichts der Lage müssen wir handeln.",
    "exampleTranslation": "Учитывая ситуацию, мы должны действовать."
  },
  {
    "preposition": "innerhalb",
    "translation": "внутри, в течение",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Innerhalb einer Woche war alles fertig.",
    "exampleTranslation": "В течение недели всё было готово."
  },
  {
    "preposition": "außerhalb",
    "translation": "вне, за пределами",
    "cases": [
      {
        "case": "Genitiv",
        "status": "standard"
      }
    ],
    "example": "Wir wohnen außerhalb der Stadt.",
    "exampleTranslation": "Мы живём за городом."
  }
];
