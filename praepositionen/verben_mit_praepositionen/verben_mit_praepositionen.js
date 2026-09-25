// German Learning App — Verben mit Präpositionen
// База для тренажёра «Verben mit Präpositionen».
// Каждый объект имеет стабильный уникальный ID.
// Поля: id, verb, preposition, case, meaning, example, exampleTranslation.
// meaning and exampleTranslation are {ru, en}, picked by the Translations setting
// (components/deutsch-translation-v1.js). The English meaning must never contain the
// English twin of the German preposition (e.g. no "with" for mit, no "as" for als).
// Один глагол с разными Präpositionen — отдельная запись с отдельным ID.
// Основа структуры согласована с существующей базой Präpositionen.

window.VERBEN_MIT_PRAEPOSITIONEN = [

  {
    "id": "vmp_001",
    "verb": "denken",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": {
      "ru": "думать о ком-то / вспоминать",
      "en": "to think of, to remember"
    },
    "example": "Ich denke oft an meine Familie.",
    "exampleTranslation": {
      "ru": "Я часто думаю о своей семье.",
      "en": "I often think of my family."
    }
  },

  {
    "id": "vmp_002",
    "verb": "sich erinnern",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": {
      "ru": "вспоминать, помнить о",
      "en": "to remember"
    },
    "example": "Ich erinnere mich an den Urlaub.",
    "exampleTranslation": {
      "ru": "Я вспоминаю отпуск.",
      "en": "I remember the holiday."
    }
  },

  {
    "id": "vmp_003",
    "verb": "glauben",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": {
      "ru": "верить в",
      "en": "to believe in"
    },
    "example": "Ich glaube an dich.",
    "exampleTranslation": {
      "ru": "Я верю в тебя.",
      "en": "I believe in you."
    }
  },

  {
    "id": "vmp_004",
    "verb": "teilnehmen",
    "preposition": "an",
    "case": "Dativ",
    "meaning": {
      "ru": "участвовать в",
      "en": "to take part, to participate"
    },
    "example": "Ich nehme am Kurs teil.",
    "exampleTranslation": {
      "ru": "Я участвую в курсе.",
      "en": "I'm taking part in the course."
    }
  },

  {
    "id": "vmp_005",
    "verb": "arbeiten",
    "preposition": "an",
    "case": "Dativ",
    "meaning": {
      "ru": "работать над",
      "en": "to work on"
    },
    "example": "Sie arbeitet an einem neuen Projekt.",
    "exampleTranslation": {
      "ru": "Она работает над новым проектом.",
      "en": "She is working on a new project."
    }
  },

  {
    "id": "vmp_006",
    "verb": "antworten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "отвечать на",
      "en": "to answer, to reply"
    },
    "example": "Ich antworte auf die Frage.",
    "exampleTranslation": {
      "ru": "Я отвечаю на вопрос.",
      "en": "I'm answering the question."
    }
  },

  {
    "id": "vmp_007",
    "verb": "sich freuen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "с нетерпением ждать, радоваться тому, что предстоит",
      "en": "to look forward to"
    },
    "example": "Ich freue mich auf den Urlaub.",
    "exampleTranslation": {
      "ru": "Я с нетерпением жду отпуска.",
      "en": "I'm looking forward to the holiday."
    }
  },

  {
    "id": "vmp_008",
    "verb": "hoffen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "надеяться на",
      "en": "to hope for"
    },
    "example": "Wir hoffen auf gutes Wetter.",
    "exampleTranslation": {
      "ru": "Мы надеемся на хорошую погоду.",
      "en": "We're hoping for good weather."
    }
  },

  {
    "id": "vmp_009",
    "verb": "reagieren",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "реагировать на",
      "en": "to react, to respond"
    },
    "example": "Er reagiert schnell auf Kritik.",
    "exampleTranslation": {
      "ru": "Он быстро реагирует на критику.",
      "en": "He reacts quickly to criticism."
    }
  },

  {
    "id": "vmp_010",
    "verb": "sich vorbereiten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "готовиться к",
      "en": "to prepare (yourself)"
    },
    "example": "Ich bereite mich auf die Prüfung vor.",
    "exampleTranslation": {
      "ru": "Я готовлюсь к экзамену.",
      "en": "I'm preparing for the exam."
    }
  },

  {
    "id": "vmp_011",
    "verb": "warten",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "ждать",
      "en": "to wait"
    },
    "example": "Ich warte auf den Bus.",
    "exampleTranslation": {
      "ru": "Я жду автобус.",
      "en": "I'm waiting for the bus."
    }
  },

  {
    "id": "vmp_012",
    "verb": "sich bedanken",
    "preposition": "bei",
    "case": "Dativ",
    "meaning": {
      "ru": "благодарить кого-то (человека)",
      "en": "to thank (a person)"
    },
    "example": "Ich bedanke mich bei dir für die Einladung.",
    "exampleTranslation": {
      "ru": "Я благодарю тебя за приглашение.",
      "en": "I'd like to thank you for the invitation."
    }
  },

  {
    "id": "vmp_014",
    "verb": "anfangen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": {
      "ru": "начинать с, начинать что-либо",
      "en": "to start, to begin (something)"
    },
    "example": "Wir fangen mit der Arbeit an.",
    "exampleTranslation": {
      "ru": "Мы начинаем работу.",
      "en": "We're starting work."
    }
  },

  {
    "id": "vmp_017",
    "verb": "sprechen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": {
      "ru": "разговаривать, говорить с",
      "en": "to talk, to speak (to someone)"
    },
    "example": "Ich spreche mit meiner Mutter.",
    "exampleTranslation": {
      "ru": "Я разговариваю с мамой.",
      "en": "I'm talking to my mother."
    }
  },

  {
    "id": "vmp_018",
    "verb": "sich treffen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": {
      "ru": "встречаться с",
      "en": "to meet (someone)"
    },
    "example": "Ich treffe mich mit Freunden.",
    "exampleTranslation": {
      "ru": "Я встречаюсь с друзьями.",
      "en": "I'm meeting up with friends."
    }
  },

  {
    "id": "vmp_019",
    "verb": "fragen",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": {
      "ru": "спрашивать о, спрашивать кого-либо о",
      "en": "to ask about"
    },
    "example": "Ich frage nach dem Preis.",
    "exampleTranslation": {
      "ru": "Я спрашиваю о цене.",
      "en": "I'm asking about the price."
    }
  },

  {
    "id": "vmp_020",
    "verb": "suchen",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": {
      "ru": "искать",
      "en": "to look for, to search"
    },
    "example": "Ich suche nach meinen Schlüsseln.",
    "exampleTranslation": {
      "ru": "Я ищу свои ключи.",
      "en": "I'm looking for my keys."
    }
  },

  {
    "id": "vmp_022",
    "verb": "danken",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "благодарить за (человек — Dativ без предлога)",
      "en": "to thank (for sth)"
    },
    "example": "Ich danke dir für deine Hilfe.",
    "exampleTranslation": {
      "ru": "Спасибо тебе за помощь.",
      "en": "Thank you for your help."
    }
  },

  {
    "id": "vmp_023",
    "verb": "sich entschuldigen",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "извиняться за",
      "en": "to apologise, to say sorry"
    },
    "example": "Ich entschuldige mich für meinen Fehler.",
    "exampleTranslation": {
      "ru": "Я извиняюсь за свою ошибку.",
      "en": "I apologise for my mistake."
    }
  },

  {
    "id": "vmp_024",
    "verb": "sich entscheiden",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "решить выбрать, выбрать в пользу",
      "en": "to decide on, to choose"
    },
    "example": "Ich entscheide mich für den blauen Mantel.",
    "exampleTranslation": {
      "ru": "Я выбираю синее пальто.",
      "en": "I'm choosing the blue coat."
    }
  },

  {
    "id": "vmp_025",
    "verb": "sich interessieren",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "интересоваться",
      "en": "to be interested in"
    },
    "example": "Ich interessiere mich für Kunst.",
    "exampleTranslation": {
      "ru": "Я интересуюсь искусством.",
      "en": "I'm interested in art."
    }
  },

  {
    "id": "vmp_028",
    "verb": "bitten",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": {
      "ru": "просить о",
      "en": "to ask (politely) for"
    },
    "example": "Ich bitte um deine Hilfe.",
    "exampleTranslation": {
      "ru": "Я прошу о твоей помощи.",
      "en": "I'm asking for your help."
    }
  },

  {
    "id": "vmp_029",
    "verb": "sich kümmern",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": {
      "ru": "заботиться о, позаботиться о",
      "en": "to take care of, to look after"
    },
    "example": "Ich kümmere mich um die Kinder.",
    "exampleTranslation": {
      "ru": "Я забочусь о детях.",
      "en": "I look after the children."
    }
  },

  {
    "id": "vmp_030",
    "verb": "es geht",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": {
      "ru": "речь идёт о",
      "en": "it's about"
    },
    "example": "Es geht um ein wichtiges Thema.",
    "exampleTranslation": {
      "ru": "Речь идёт о важной теме.",
      "en": "It's about an important topic."
    }
  },

  {
    "id": "vmp_031",
    "verb": "sich freuen",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "радоваться чему-либо, что уже произошло или уже есть",
      "en": "to be pleased with (sth you have)"
    },
    "example": "Ich freue mich über das Geschenk.",
    "exampleTranslation": {
      "ru": "Я радуюсь подарку.",
      "en": "I'm really pleased with the present."
    }
  },

  {
    "id": "vmp_032",
    "verb": "denken",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "думать о (какое мнение)",
      "en": "to have thoughts on, to have a view on"
    },
    "example": "Was denkst du über meinen Plan?",
    "exampleTranslation": {
      "ru": "Что ты думаешь о моём плане?",
      "en": "What do you think of my plan?"
    }
  },

  {
    "id": "vmp_033",
    "verb": "nachdenken",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "размышлять, обдумывать",
      "en": "to reflect on, to think over"
    },
    "example": "Ich denke über die Frage nach.",
    "exampleTranslation": {
      "ru": "Я размышляю над вопросом.",
      "en": "I'm thinking about the question."
    }
  },

  {
    "id": "vmp_034",
    "verb": "sprechen",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "говорить о, разговаривать о",
      "en": "to talk about"
    },
    "example": "Wir sprechen über den Film.",
    "exampleTranslation": {
      "ru": "Мы говорим о фильме.",
      "en": "We're talking about the film."
    }
  },

  {
    "id": "vmp_035",
    "verb": "sich informieren",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "узнавать информацию о, информироваться о",
      "en": "to find out, to get information"
    },
    "example": "Ich informiere mich über den Kurs.",
    "exampleTranslation": {
      "ru": "Я узнаю информацию о курсе.",
      "en": "I'm finding out about the course."
    }
  },

  {
    "id": "vmp_037",
    "verb": "erzählen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "рассказывать о",
      "en": "to tell (someone) about"
    },
    "example": "Sie erzählt von ihrer Arbeit.",
    "exampleTranslation": {
      "ru": "Она рассказывает о своей работе.",
      "en": "She's telling us about her work."
    }
  },

  {
    "id": "vmp_038",
    "verb": "träumen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "мечтать о, сниться",
      "en": "to dream about"
    },
    "example": "Ich träume von einer Reise.",
    "exampleTranslation": {
      "ru": "Я мечтаю о путешествии.",
      "en": "I'm dreaming of a trip."
    }
  },

  {
    "id": "vmp_039",
    "verb": "gehören",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": {
      "ru": "относиться к, принадлежать к",
      "en": "to be part of, to belong to"
    },
    "example": "Das gehört zu meinem Beruf.",
    "exampleTranslation": {
      "ru": "Это относится к моей профессии.",
      "en": "That's part of my job."
    }
  },

  {
    "id": "vmp_040",
    "verb": "gratulieren",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": {
      "ru": "поздравлять с",
      "en": "to congratulate on"
    },
    "example": "Ich gratuliere dir zum Geburtstag.",
    "exampleTranslation": {
      "ru": "Я поздравляю тебя с днём рождения.",
      "en": "Happy birthday to you!"
    }
  },

  {
    "id": "vmp_041",
    "verb": "einladen",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": {
      "ru": "приглашать на",
      "en": "to invite (for a meal, party…)"
    },
    "example": "Ich lade dich zum Essen ein.",
    "exampleTranslation": {
      "ru": "Я приглашаю тебя на ужин.",
      "en": "I'm inviting you for a meal."
    }
  },

  {
    "id": "vmp_042",
    "verb": "warnen",
    "preposition": "vor",
    "case": "Dativ",
    "meaning": {
      "ru": "предупреждать о, предостерегать от",
      "en": "to warn about, to warn against"
    },
    "example": "Ich warne dich vor diesem Mann.",
    "exampleTranslation": {
      "ru": "Я предостерегаю тебя от этого мужчины.",
      "en": "I'm warning you about this man."
    }
  },

  {
    "id": "vmp_043",
    "verb": "sich verlieben",
    "preposition": "in",
    "case": "Akkusativ",
    "meaning": {
      "ru": "влюбиться в",
      "en": "to fall for (someone)"
    },
    "example": "Sie hat sich in ihn verliebt.",
    "exampleTranslation": {
      "ru": "Она влюбилась в него.",
      "en": "She has fallen in love with him."
    }
  },

  {
    "id": "vmp_044",
    "verb": "bestehen",
    "preposition": "aus",
    "case": "Dativ",
    "meaning": {
      "ru": "состоять из",
      "en": "to consist of, to be made up of"
    },
    "example": "Der Kurs besteht aus zehn Lektionen.",
    "exampleTranslation": {
      "ru": "Курс состоит из десяти уроков.",
      "en": "The course consists of ten lessons."
    }
  },

  {
    "id": "vmp_045",
    "verb": "arbeiten",
    "preposition": "als",
    "case": "Nominativ",
    "meaning": {
      "ru": "работать кем-либо, в качестве кого-либо",
      "en": "to work (in a job, a role)"
    },
    "example": "Sie arbeitet als Designerin.",
    "exampleTranslation": {
      "ru": "Она работает дизайнером.",
      "en": "She works as a designer."
    }
  },

  {
    "id": "vmp_046",
    "verb": "sich gewöhnen",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": {
      "ru": "привыкать к",
      "en": "to get used to"
    },
    "example": "Ich gewöhne mich an die neue Arbeit.",
    "exampleTranslation": {
      "ru": "Я привыкаю к новой работе.",
      "en": "I'm getting used to the new job."
    }
  },

  {
    "id": "vmp_047",
    "verb": "schreiben",
    "preposition": "an",
    "case": "Akkusativ",
    "meaning": {
      "ru": "писать кому-то (письмо, e-mail)",
      "en": "to write (to someone)"
    },
    "example": "Ich schreibe eine E-Mail an meinen Chef.",
    "exampleTranslation": {
      "ru": "Я пишу e-mail своему начальнику.",
      "en": "I'm writing an email to my boss."
    }
  },

  {
    "id": "vmp_048",
    "verb": "aufpassen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "присматривать за, следить за",
      "en": "to look after, to watch"
    },
    "example": "Kannst du auf meine Tasche aufpassen?",
    "exampleTranslation": {
      "ru": "Можешь присмотреть за моей сумкой?",
      "en": "Can you keep an eye on my bag?"
    }
  },

  {
    "id": "vmp_049",
    "verb": "sich konzentrieren",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "сосредоточиться на",
      "en": "to concentrate, to focus"
    },
    "example": "Ich kann mich nicht auf die Arbeit konzentrieren.",
    "exampleTranslation": {
      "ru": "Я не могу сосредоточиться на работе.",
      "en": "I can't concentrate on my work."
    }
  },

  {
    "id": "vmp_050",
    "verb": "sich verlassen",
    "preposition": "auf",
    "case": "Akkusativ",
    "meaning": {
      "ru": "полагаться на",
      "en": "to rely on, to count on"
    },
    "example": "Du kannst dich auf mich verlassen.",
    "exampleTranslation": {
      "ru": "Ты можешь на меня положиться.",
      "en": "You can rely on me."
    }
  },

  {
    "id": "vmp_051",
    "verb": "bestehen",
    "preposition": "auf",
    "case": "Dativ",
    "meaning": {
      "ru": "настаивать на",
      "en": "to insist on"
    },
    "example": "Er besteht auf einer Antwort.",
    "exampleTranslation": {
      "ru": "Он настаивает на ответе.",
      "en": "He insists on an answer."
    }
  },

  {
    "id": "vmp_052",
    "verb": "sich entschuldigen",
    "preposition": "bei",
    "case": "Dativ",
    "meaning": {
      "ru": "извиняться перед кем-то",
      "en": "to apologise (to a person)"
    },
    "example": "Ich entschuldige mich bei dir für die Verspätung.",
    "exampleTranslation": {
      "ru": "Я извиняюсь перед тобой за опоздание.",
      "en": "I apologise to you for being late."
    }
  },

  {
    "id": "vmp_053",
    "verb": "aufhören",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": {
      "ru": "прекращать, бросать (делать что-то)",
      "en": "to stop, to give up (doing sth)"
    },
    "example": "Ich höre mit dem Rauchen auf.",
    "exampleTranslation": {
      "ru": "Я бросаю курить.",
      "en": "I'm giving up smoking."
    }
  },

  {
    "id": "vmp_054",
    "verb": "sich beschäftigen",
    "preposition": "mit",
    "case": "Dativ",
    "meaning": {
      "ru": "заниматься чем-то",
      "en": "to spend time on, to study"
    },
    "example": "Ich beschäftige mich gerade mit Grammatik.",
    "exampleTranslation": {
      "ru": "Сейчас я занимаюсь грамматикой.",
      "en": "I'm working on grammar at the moment."
    }
  },

  {
    "id": "vmp_055",
    "verb": "abhängen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "зависеть от",
      "en": "to depend on"
    },
    "example": "Das hängt vom Wetter ab.",
    "exampleTranslation": {
      "ru": "Это зависит от погоды.",
      "en": "It depends on the weather."
    }
  },

  {
    "id": "vmp_056",
    "verb": "halten",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "быть какого-то мнения о",
      "en": "to think highly / little of"
    },
    "example": "Was hältst du von meiner Idee?",
    "exampleTranslation": {
      "ru": "Что ты думаешь о моей идее?",
      "en": "What do you think of my idea?"
    }
  },

  {
    "id": "vmp_057",
    "verb": "sich erholen",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "отдыхать, восстанавливаться после",
      "en": "to recover from"
    },
    "example": "Ich muss mich von der Arbeit erholen.",
    "exampleTranslation": {
      "ru": "Мне нужно отдохнуть от работы.",
      "en": "I need to recover from work."
    }
  },

  {
    "id": "vmp_058",
    "verb": "sich verabschieden",
    "preposition": "von",
    "case": "Dativ",
    "meaning": {
      "ru": "прощаться с",
      "en": "to say goodbye (to someone)"
    },
    "example": "Ich verabschiede mich von meinen Kollegen.",
    "exampleTranslation": {
      "ru": "Я прощаюсь с коллегами.",
      "en": "I'm saying goodbye to my colleagues."
    }
  },

  {
    "id": "vmp_059",
    "verb": "sich ärgern",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "злиться на, из-за",
      "en": "to be annoyed (by)"
    },
    "example": "Ich ärgere mich über den Stau.",
    "exampleTranslation": {
      "ru": "Я злюсь из-за пробки.",
      "en": "The traffic jam is annoying me."
    }
  },

  {
    "id": "vmp_060",
    "verb": "sich beschweren",
    "preposition": "über",
    "case": "Akkusativ",
    "meaning": {
      "ru": "жаловаться на",
      "en": "to complain"
    },
    "example": "Er beschwert sich über den Lärm.",
    "exampleTranslation": {
      "ru": "Он жалуется на шум.",
      "en": "He's complaining about the noise."
    }
  },

  {
    "id": "vmp_061",
    "verb": "sich bewerben",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": {
      "ru": "подавать заявку на (работу, место)",
      "en": "to apply for (a job, a place)"
    },
    "example": "Ich bewerbe mich um eine Stelle als Designerin.",
    "exampleTranslation": {
      "ru": "Я подаю заявку на место дизайнера.",
      "en": "I'm applying for a job as a designer."
    }
  },

  {
    "id": "vmp_062",
    "verb": "sich Sorgen machen",
    "preposition": "um",
    "case": "Akkusativ",
    "meaning": {
      "ru": "беспокоиться о, переживать за",
      "en": "to worry about"
    },
    "example": "Ich mache mir Sorgen um meine Mutter.",
    "exampleTranslation": {
      "ru": "Я переживаю за маму.",
      "en": "I'm worried about my mother."
    }
  },

  {
    "id": "vmp_063",
    "verb": "passen",
    "preposition": "zu",
    "case": "Dativ",
    "meaning": {
      "ru": "подходить к, сочетаться с",
      "en": "to go well, to match"
    },
    "example": "Die Schuhe passen gut zu deinem Kleid.",
    "exampleTranslation": {
      "ru": "Туфли хорошо подходят к твоему платью.",
      "en": "The shoes go well with your dress."
    }
  },

  {
    "id": "vmp_064",
    "verb": "sorgen",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "обеспечивать, позаботиться о",
      "en": "to take care of, to provide"
    },
    "example": "Wer sorgt für die Getränke?",
    "exampleTranslation": {
      "ru": "Кто позаботится о напитках?",
      "en": "Who's taking care of the drinks?"
    }
  },

  {
    "id": "vmp_065",
    "verb": "halten",
    "preposition": "für",
    "case": "Akkusativ",
    "meaning": {
      "ru": "считать кем-то / чем-то",
      "en": "to consider, to regard as"
    },
    "example": "Ich halte ihn für sehr klug.",
    "exampleTranslation": {
      "ru": "Я считаю его очень умным.",
      "en": "I consider him very clever."
    }
  },

  {
    "id": "vmp_066",
    "verb": "leiden",
    "preposition": "unter",
    "case": "Dativ",
    "meaning": {
      "ru": "страдать от",
      "en": "to suffer from"
    },
    "example": "Viele Menschen leiden unter Stress.",
    "exampleTranslation": {
      "ru": "Многие люди страдают от стресса.",
      "en": "Many people suffer from stress."
    }
  },

  {
    "id": "vmp_067",
    "verb": "schmecken",
    "preposition": "nach",
    "case": "Dativ",
    "meaning": {
      "ru": "иметь вкус чего-то",
      "en": "to taste of"
    },
    "example": "Die Suppe schmeckt nach Knoblauch.",
    "exampleTranslation": {
      "ru": "У супа вкус чеснока.",
      "en": "The soup tastes of garlic."
    }
  },

  {
    "id": "vmp_068",
    "verb": "Angst haben",
    "preposition": "vor",
    "case": "Dativ",
    "meaning": {
      "ru": "бояться кого-то / чего-то",
      "en": "to be afraid of"
    },
    "example": "Ich habe Angst vor Spinnen.",
    "exampleTranslation": {
      "ru": "Я боюсь пауков.",
      "en": "I'm afraid of spiders."
    }
  }
];
