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
    "meaning": "думать о ком-то / вспоминать",
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
    "example": "Ich nehme am Kurs teil.",
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
    "meaning": "благодарить кого-то (человека)",
    "example": "Ich bedanke mich bei dir für die Einladung.",
    "exampleTranslation": "Я благодарю тебя за приглашение."
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
    "id": "vmp_022",
    "verb": "danken",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "благодарить за (человек — Dativ без предлога)",
    "example": "Ich danke dir für deine Hilfe.",
    "exampleTranslation": "Спасибо тебе за помощь."
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
    "id": "vmp_028",
    "verb": "bitten",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "просить о",
    "example": "Ich bitte um deine Hilfe.",
    "exampleTranslation": "Я прошу о твоей помощи."
  },

  {
    "id": "vmp_029",
    "verb": "sich kümmern",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "заботиться о, позаботиться о",
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
    "meaning": "думать о (какое мнение)",
    "example": "Was denkst du über meinen Plan?",
    "exampleTranslation": "Что ты думаешь о моём плане?"
  },

  {
    "id": "vmp_033",
    "verb": "nachdenken",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "размышлять, обдумывать",
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
    "exampleTranslation": "Я предостерегаю тебя от этого мужчины."
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
  },

  {
    "id": "vmp_046",
    "verb": "sich gewöhnen",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": "привыкать к",
    "example": "Ich gewöhne mich an die neue Arbeit.",
    "exampleTranslation": "Я привыкаю к новой работе."
  },

  {
    "id": "vmp_047",
    "verb": "schreiben",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": "писать кому-то (письмо, e-mail)",
    "example": "Ich schreibe eine E-Mail an meinen Chef.",
    "exampleTranslation": "Я пишу e-mail своему начальнику."
  },

  {
    "id": "vmp_048",
    "verb": "aufpassen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "присматривать за, следить за",
    "example": "Kannst du auf meine Tasche aufpassen?",
    "exampleTranslation": "Можешь присмотреть за моей сумкой?"
  },

  {
    "id": "vmp_049",
    "verb": "sich konzentrieren",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "сосредоточиться на",
    "example": "Ich kann mich nicht auf die Arbeit konzentrieren.",
    "exampleTranslation": "Я не могу сосредоточиться на работе."
  },

  {
    "id": "vmp_050",
    "verb": "sich verlassen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": "полагаться на",
    "example": "Du kannst dich auf mich verlassen.",
    "exampleTranslation": "Ты можешь на меня положиться."
  },

  {
    "id": "vmp_051",
    "verb": "bestehen",
    "preposition": "auf",
    "case": "Dativ",
    "meaning": "настаивать на",
    "example": "Er besteht auf einer Antwort.",
    "exampleTranslation": "Он настаивает на ответе."
  },

  {
    "id": "vmp_052",
    "verb": "sich entschuldigen",
    "preposition": "bei",
    "case": "Dativ",
    "meaning": "извиняться перед кем-то",
    "example": "Ich entschuldige mich bei dir für die Verspätung.",
    "exampleTranslation": "Я извиняюсь перед тобой за опоздание."
  },

  {
    "id": "vmp_053",
    "verb": "aufhören",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "прекращать, бросать (делать что-то)",
    "example": "Ich höre mit dem Rauchen auf.",
    "exampleTranslation": "Я бросаю курить."
  },

  {
    "id": "vmp_054",
    "verb": "sich beschäftigen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": "заниматься чем-то",
    "example": "Ich beschäftige mich gerade mit Grammatik.",
    "exampleTranslation": "Сейчас я занимаюсь грамматикой."
  },

  {
    "id": "vmp_055",
    "verb": "abhängen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "зависеть от",
    "example": "Das hängt vom Wetter ab.",
    "exampleTranslation": "Это зависит от погоды."
  },

  {
    "id": "vmp_056",
    "verb": "halten",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "быть какого-то мнения о",
    "example": "Was hältst du von meiner Idee?",
    "exampleTranslation": "Что ты думаешь о моей идее?"
  },

  {
    "id": "vmp_057",
    "verb": "sich erholen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "отдыхать, восстанавливаться после",
    "example": "Ich muss mich von der Arbeit erholen.",
    "exampleTranslation": "Мне нужно отдохнуть от работы."
  },

  {
    "id": "vmp_058",
    "verb": "sich verabschieden",
    "preposition": "von",
    "case": "Dativ",
    "meaning": "прощаться с",
    "example": "Ich verabschiede mich von meinen Kollegen.",
    "exampleTranslation": "Я прощаюсь с коллегами."
  },

  {
    "id": "vmp_059",
    "verb": "sich ärgern",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "злиться на, из-за",
    "example": "Ich ärgere mich über den Stau.",
    "exampleTranslation": "Я злюсь из-за пробки."
  },

  {
    "id": "vmp_060",
    "verb": "sich beschweren",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": "жаловаться на",
    "example": "Er beschwert sich über den Lärm.",
    "exampleTranslation": "Он жалуется на шум."
  },

  {
    "id": "vmp_061",
    "verb": "sich bewerben",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "подавать заявку на (работу, место)",
    "example": "Ich bewerbe mich um eine Stelle als Designerin.",
    "exampleTranslation": "Я подаю заявку на место дизайнера."
  },

  {
    "id": "vmp_062",
    "verb": "sich Sorgen machen",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": "беспокоиться о, переживать за",
    "example": "Ich mache mir Sorgen um meine Mutter.",
    "exampleTranslation": "Я переживаю за маму."
  },

  {
    "id": "vmp_063",
    "verb": "passen",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": "подходить к, сочетаться с",
    "example": "Die Schuhe passen gut zu deinem Kleid.",
    "exampleTranslation": "Туфли хорошо подходят к твоему платью."
  },

  {
    "id": "vmp_064",
    "verb": "sorgen",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "обеспечивать, позаботиться о",
    "example": "Wer sorgt für die Getränke?",
    "exampleTranslation": "Кто позаботится о напитках?"
  },

  {
    "id": "vmp_065",
    "verb": "halten",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": "считать кем-то / чем-то",
    "example": "Ich halte ihn für sehr klug.",
    "exampleTranslation": "Я считаю его очень умным."
  },

  {
    "id": "vmp_066",
    "verb": "leiden",
    "preposition": "unter",
    "case": "Dativ",
    "meaning": "страдать от",
    "example": "Viele Menschen leiden unter Stress.",
    "exampleTranslation": "Многие люди страдают от стресса."
  },

  {
    "id": "vmp_067",
    "verb": "schmecken",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": "иметь вкус чего-то",
    "example": "Die Suppe schmeckt nach Knoblauch.",
    "exampleTranslation": "У супа вкус чеснока."
  },

  {
    "id": "vmp_068",
    "verb": "Angst haben",
    "preposition": "vor",
    "case": "Dativ",
    "meaning": "бояться кого-то / чего-то",
    "example": "Ich habe Angst vor Spinnen.",
    "exampleTranslation": "Я боюсь пауков."
  }
];
