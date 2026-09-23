// German Learning App — Verben mit Präpositionen
// База для тренажёра «Verben mit Präpositionen».
// Каждый объект имеет стабильный уникальный ID.
// Поля: id, verb, preposition, case, meaning, example, exampleTranslation.
// Один глагол с разными Präpositionen — отдельная запись с отдельным ID.
// Основа структуры согласована с существующей базой Präpositionen.

window.VERBEN_MIT_PRAEPOSITIONEN = [

  {
    "id": "vmp_001",
    "verb": "denken",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": "думать о, вспоминать о",
    "example": "Ich denke oft an meine Familie.",
    "exampleTranslation": "Я часто думаю о своей семье."
  },
  {
    "id": "vmp_002",
    "verb": "sich erinnern",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": "вспоминать, помнить о",
    "example": "Ich erinnere mich an den Urlaub.",
    "exampleTranslation": "Я вспоминаю отпуск."
  },
  {
    "id": "vmp_003",
    "verb": "glauben",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": "верить в",
    "example": "Ich glaube an dich.",
    "exampleTranslation": "Я верю в тебя."
  },
  {
    "id": "vmp_004",
    "verb": "teilnehmen",
    "preposition": "an",
    "case": "Dativ",
    "meaning": "участвовать в",
    "example": "Ich nehme an dem Kurs teil.",
    "exampleTranslation": "Я участвую в курсе."
  },
  {
    "id": "vmp_005",
    "verb": "arbeiten",
    "preposition": "an",
    "case": "Dativ",
    "meaning": "работать над",
    "example": "Sie arbeitet an einem neuen Projekt.",
    "exampleTranslation": "Она работает над новым проектом."
  },
  {
    "id": "vmp_006",
    "verb": "antworten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "отвечать на",
    "example": "Ich antworte auf die Frage.",
    "exampleTranslation": "Я отвечаю на вопрос."
  },
  {
    "id": "vmp_007",
    "verb": "sich freuen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "с нетерпением ждать, радоваться тому, что предстоит",
    "example": "Ich freue mich auf den Urlaub.",
    "exampleTranslation": "Я с нетерпением жду отпуска."
  },
  {
    "id": "vmp_008",
    "verb": "hoffen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "надеяться на",
    "example": "Wir hoffen auf gutes Wetter.",
    "exampleTranslation": "Мы надеемся на хорошую погоду."
  },
  {
    "id": "vmp_009",
    "verb": "reagieren",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "реагировать на",
    "example": "Er reagiert schnell auf Kritik.",
    "exampleTranslation": "Он быстро реагирует на критику."
  },
  {
    "id": "vmp_010",
    "verb": "sich vorbereiten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "готовиться к",
    "example": "Ich bereite mich auf die Prüfung vor.",
    "exampleTranslation": "Я готовлюсь к экзамену."
  },
  {
    "id": "vmp_011",
    "verb": "warten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "ждать",
    "example": "Ich warte auf den Bus.",
    "exampleTranslation": "Я жду автобус."
  },
  {
    "id": "vmp_012",
    "verb": "sich bedanken",
    "preposition": "bei",
    "case": "Dativ",
    "meaning": "благодарить кого-либо",
    "example": "Ich bedanke mich bei meiner Lehrerin.",
    "exampleTranslation": "Я благодарю свою учительницу."
  },
  {
    "id": "vmp_013",
    "verb": "sich informieren",
    "preposition": "bei",
    "case": "Dativ",
    "meaning": "узнавать информацию у, обращаться за информацией к",
    "example": "Ich informiere mich bei der Behörde.",
    "exampleTranslation": "Я узнаю информацию в ведомстве."
  },
  {
    "id": "vmp_014",
    "verb": "anfangen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "начинать с, начинать что-либо",
    "example": "Wir fangen mit der Arbeit an.",
    "exampleTranslation": "Мы начинаем работу."
  },
  {
    "id": "vmp_015",
    "verb": "beginnen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "начинать с, начинать что-либо",
    "example": "Der Kurs beginnt mit einer kurzen Übung.",
    "exampleTranslation": "Курс начинается с короткого упражнения."
  },
  {
    "id": "vmp_016",
    "verb": "diskutieren",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "обсуждать, дискутировать с",
    "example": "Ich diskutiere mit meinem Kollegen.",
    "exampleTranslation": "Я обсуждаю это с моим коллегой."
  },
  {
    "id": "vmp_017",
    "verb": "sprechen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "разговаривать, говорить с",
    "example": "Ich spreche mit meiner Mutter.",
    "exampleTranslation": "Я разговариваю с мамой."
  },
  {
    "id": "vmp_018",
    "verb": "sich treffen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "встречаться с",
    "example": "Ich treffe mich mit Freunden.",
    "exampleTranslation": "Я встречаюсь с друзьями."
  },
  {
    "id": "vmp_019",
    "verb": "fragen",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": "спрашивать о, спрашивать кого-либо о",
    "example": "Ich frage nach dem Preis.",
    "exampleTranslation": "Я спрашиваю о цене."
  },
  {
    "id": "vmp_020",
    "verb": "suchen",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": "искать",
    "example": "Ich suche nach meinen Schlüsseln.",
    "exampleTranslation": "Я ищу свои ключи."
  },
  {
    "id": "vmp_021",
    "verb": "sich bedanken",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "благодарить за",
    "example": "Ich bedanke mich für deine Hilfe.",
    "exampleTranslation": "Я благодарю тебя за помощь."
  },
  {
    "id": "vmp_022",
    "verb": "danken",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "благодарить за",
    "example": "Ich danke dir für deine Hilfe.",
    "exampleTranslation": "Я благодарю тебя за помощь."
  },
  {
    "id": "vmp_023",
    "verb": "sich entschuldigen",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "извиняться за",
    "example": "Ich entschuldige mich für meinen Fehler.",
    "exampleTranslation": "Я извиняюсь за свою ошибку."
  },
  {
    "id": "vmp_024",
    "verb": "sich entscheiden",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "решить выбрать, выбрать в пользу",
    "example": "Ich entscheide mich für den blauen Mantel.",
    "exampleTranslation": "Я выбираю синее пальто."
  },
  {
    "id": "vmp_025",
    "verb": "sich interessieren",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "интересоваться",
    "example": "Ich interessiere mich für Kunst.",
    "exampleTranslation": "Я интересуюсь искусством."
  },
  {
    "id": "vmp_026",
    "verb": "kämpfen",
    "preposition": "gegen",
    "case": "Akkusativ",
    "meaning": "бороться против",
    "example": "Wir kämpfen gegen die Ungerechtigkeit.",
    "exampleTranslation": "Мы боремся против несправедливости."
  },
  {
    "id": "vmp_027",
    "verb": "sich entscheiden",
    "preposition": "gegen",
    "case": "Akkusativ",
    "meaning": "решить отказаться от, выбрать не в пользу",
    "example": "Ich entscheide mich gegen das Angebot.",
    "exampleTranslation": "Я решаю отказаться от предложения."
  },
  {
    "id": "vmp_028",
    "verb": "bitten",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "просить о",
    "example": "Ich bitte um deine Hilfe.",
    "exampleTranslation": "Я прошу тебя о помощи."
  },
  {
    "id": "vmp_029",
    "verb": "sich kümmern",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "заботиться о, заниматься",
    "example": "Ich kümmere mich um die Kinder.",
    "exampleTranslation": "Я забочусь о детях."
  },
  {
    "id": "vmp_030",
    "verb": "es geht",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "речь идёт о",
    "example": "Es geht um ein wichtiges Thema.",
    "exampleTranslation": "Речь идёт о важной теме."
  },
  {
    "id": "vmp_031",
    "verb": "sich freuen",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "радоваться чему-либо, что уже произошло или уже есть",
    "example": "Ich freue mich über das Geschenk.",
    "exampleTranslation": "Я радуюсь подарку."
  },
  {
    "id": "vmp_032",
    "verb": "denken",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "думать о, размышлять о",
    "example": "Ich denke über das Problem nach.",
    "exampleTranslation": "Я размышляю над этой проблемой."
  },
  {
    "id": "vmp_033",
    "verb": "nachdenken",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "размышлять о, обдумывать",
    "example": "Ich denke über die Frage nach.",
    "exampleTranslation": "Я размышляю над вопросом."
  },
  {
    "id": "vmp_034",
    "verb": "sprechen",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "говорить о, разговаривать о",
    "example": "Wir sprechen über den Film.",
    "exampleTranslation": "Мы говорим о фильме."
  },
  {
    "id": "vmp_035",
    "verb": "sich informieren",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "узнавать информацию о, информироваться о",
    "example": "Ich informiere mich über den Kurs.",
    "exampleTranslation": "Я узнаю информацию о курсе."
  },
  {
    "id": "vmp_036",
    "verb": "sprechen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "говорить о, упоминать",
    "example": "Er spricht von seiner Reise.",
    "exampleTranslation": "Он говорит о своей поездке."
  },
  {
    "id": "vmp_037",
    "verb": "erzählen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "рассказывать о",
    "example": "Sie erzählt von ihrer Arbeit.",
    "exampleTranslation": "Она рассказывает о своей работе."
  },
  {
    "id": "vmp_038",
    "verb": "träumen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "мечтать о, сниться",
    "example": "Ich träume von einer Reise.",
    "exampleTranslation": "Я мечтаю о путешествии."
  },
  {
    "id": "vmp_039",
    "verb": "gehören",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": "относиться к, принадлежать к",
    "example": "Das gehört zu meinem Beruf.",
    "exampleTranslation": "Это относится к моей профессии."
  },
  {
    "id": "vmp_040",
    "verb": "gratulieren",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": "поздравлять с",
    "example": "Ich gratuliere dir zum Geburtstag.",
    "exampleTranslation": "Я поздравляю тебя с днём рождения."
  },
  {
    "id": "vmp_041",
    "verb": "einladen",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": "приглашать на",
    "example": "Ich lade dich zum Essen ein.",
    "exampleTranslation": "Я приглашаю тебя на ужин."
  },
  {
    "id": "vmp_042",
    "verb": "warnen",
    "preposition": "vor",
    "case": "Dativ",
    "meaning": "предупреждать о, предостерегать от",
    "example": "Ich warne dich vor diesem Mann.",
    "exampleTranslation": "Я предупреждаю тебя об этом мужчине."
  },
  {
    "id": "vmp_043",
    "verb": "sich verlieben",
    "preposition": "in",
    "case": "Akkusativ",
    "meaning": "влюбиться в",
    "example": "Sie hat sich in ihn verliebt.",
    "exampleTranslation": "Она влюбилась в него."
  },
  {
    "id": "vmp_044",
    "verb": "bestehen",
    "preposition": "aus",
    "case": "Dativ",
    "meaning": "состоять из",
    "example": "Der Kurs besteht aus zehn Lektionen.",
    "exampleTranslation": "Курс состоит из десяти уроков."
  },
  {
    "id": "vmp_045",
    "verb": "arbeiten",
    "preposition": "als",
    "case": "Nominativ",
    "meaning": "работать кем-либо, в качестве кого-либо",
    "example": "Sie arbeitet als Designerin.",
    "exampleTranslation": "Она работает дизайнером."
  }
];
