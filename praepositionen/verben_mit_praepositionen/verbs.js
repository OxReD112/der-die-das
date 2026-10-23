// Verben mit Präpositionen — the verbs, their preposition and case, meanings and example sentences.
// Source: the teacher's list „Verben mit Präpositionen“ (Sascha & Deutsch); QA 2026-09-25
// (Documentation/QA/QA_04_VerbenMitPraepositionen.md, QA_04c_VerbenMitPraepositionen_Effectiveness.md).
// Loaded by index.html before verben_mit_praepositionen.js (window.VERBEN_MIT_PRAEPOSITIONEN).
// Was verben_mit_praepositionen.js until v3.12 (renamed in v3.13, content unchanged).
// Keep every id: stats, difficulty and progress are stored per id (vmp_001 …), so saved progress
// and old backups stay valid. A verb with two prepositions is two entries with two ids.
// When this file changes, raise its ?v= in index.html, the Präpositionen page's
// verben_mit_praepositionen/index.html?v= and the Home tile's praepositionen/?v=
//
// Fields:
//   id                 - stable unique id
//   verb               - infinitive as shown on the card (with „sich“ where needed)
//   preposition        - the one accepted answer (ae / oe / ue are accepted for ä / ö / ü)
//   case               - Akkusativ / Dativ (a case without a button would skip the case step)
//   alsoAccepted       - optional: other prepositions that are just as standard for this meaning,
//                        each with its own case and example ({ preposition, case, example, exampleTranslation });
//                        they count as fully right, the case step then asks for their case, the answer shows
//                        their example and the other pair („auch: …“).
//                        Only for true equals (sprechen über / von, erzählen von / über; author 2026-10-23) -
//                        a verb with a second preposition that is not equally standard is left out.
//   meaning            - line above the verb, {ru, en}
//                        (picked by the Translations setting via components/deutsch-translation-v1.js)
//                        It may translate with any preposition (a literal twin is a trap, not a hint) -
//                        but must not lead to another German preposition that is also correct (author 2026-10-23).
//   example            - German example sentence
//   exampleTranslation - {ru, en}

window.VERBEN_MIT_PRAEPOSITIONEN = [
  {
    id: "vmp_001",
    verb: "denken",
    preposition: "an",
    case: "Akkusativ",
    meaning: { ru: "думать о ком-то / вспоминать", en: "to think of, to remember" },
    example: "Ich denke oft an meine Familie.",
    exampleTranslation: { ru: "Я часто думаю о своей семье.", en: "I often think of my family." }
  },
  {
    id: "vmp_002",
    verb: "sich erinnern",
    preposition: "an",
    case: "Akkusativ",
    meaning: { ru: "вспоминать, помнить о", en: "to remember" },
    example: "Ich erinnere mich an den Urlaub.",
    exampleTranslation: { ru: "Я вспоминаю отпуск.", en: "I remember the holiday." }
  },
  {
    id: "vmp_003",
    verb: "glauben",
    preposition: "an",
    case: "Akkusativ",
    meaning: { ru: "верить в", en: "to believe in" },
    example: "Ich glaube an dich.",
    exampleTranslation: { ru: "Я верю в тебя.", en: "I believe in you." }
  },
  {
    id: "vmp_004",
    verb: "teilnehmen",
    preposition: "an",
    case: "Dativ",
    meaning: { ru: "участвовать в", en: "to take part, to participate" },
    example: "Ich nehme an einem Deutschkurs teil.",
    exampleTranslation: { ru: "Я хожу на курс немецкого.", en: "I'm taking a German course." }
  },
  {
    id: "vmp_005",
    verb: "arbeiten",
    preposition: "an",
    case: "Dativ",
    meaning: { ru: "работать над", en: "to work on" },
    example: "Sie arbeitet an einem neuen Projekt.",
    exampleTranslation: { ru: "Она работает над новым проектом.", en: "She is working on a new project." }
  },
  {
    id: "vmp_006",
    verb: "antworten",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "отвечать на", en: "to answer, to reply" },
    example: "Ich antworte auf die Frage.",
    exampleTranslation: { ru: "Я отвечаю на вопрос.", en: "I'm answering the question." }
  },
  {
    id: "vmp_007",
    verb: "sich freuen",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "с нетерпением ждать, радоваться тому, что предстоит", en: "to look forward to" },
    example: "Ich freue mich auf den Urlaub.",
    exampleTranslation: { ru: "Я с нетерпением жду отпуска.", en: "I'm looking forward to the holiday." }
  },
  {
    id: "vmp_008",
    verb: "hoffen",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "надеяться на", en: "to hope for" },
    example: "Wir hoffen auf gutes Wetter.",
    exampleTranslation: { ru: "Мы надеемся на хорошую погоду.", en: "We're hoping for good weather." }
  },
  {
    id: "vmp_009",
    verb: "reagieren",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "реагировать на", en: "to react, to respond" },
    example: "Er reagiert schnell auf meine Frage.",
    exampleTranslation: { ru: "Он быстро реагирует на мой вопрос.", en: "He reacts quickly to my question." }
  },
  {
    id: "vmp_011",
    verb: "warten",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "ждать", en: "to wait" },
    example: "Ich warte auf den Bus.",
    exampleTranslation: { ru: "Я жду автобус.", en: "I'm waiting for the bus." }
  },
  {
    id: "vmp_012",
    verb: "sich bedanken",
    preposition: "bei",
    case: "Dativ",
    meaning: { ru: "благодарить кого-то (человека)", en: "to thank (a person)" },
    example: "Ich bedanke mich bei dir für die Einladung.",
    exampleTranslation: { ru: "Я благодарю тебя за приглашение.", en: "I'd like to thank you for the invitation." }
  },
  {
    id: "vmp_014",
    verb: "anfangen",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "начинать с, начинать что-либо", en: "to start, to begin (something)" },
    example: "Wir fangen mit der Arbeit an.",
    exampleTranslation: { ru: "Мы начинаем работу.", en: "We're starting work." }
  },
  {
    id: "vmp_017",
    verb: "sprechen",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "разговаривать, говорить с", en: "to talk, to speak (with someone)" },
    example: "Ich spreche mit meiner Mutter.",
    exampleTranslation: { ru: "Я разговариваю с мамой.", en: "I'm talking to my mother." }
  },
  {
    id: "vmp_018",
    verb: "sich treffen",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "встречаться с", en: "to meet (someone)" },
    example: "Ich treffe mich mit Freunden.",
    exampleTranslation: { ru: "Я встречаюсь с друзьями.", en: "I'm meeting up with friends." }
  },
  {
    id: "vmp_019",
    verb: "fragen",
    preposition: "nach",
    case: "Dativ",
    meaning: { ru: "спрашивать о, спрашивать кого-либо о", en: "to ask about" },
    example: "Ich frage nach dem Preis.",
    exampleTranslation: { ru: "Я спрашиваю о цене.", en: "I'm asking about the price." }
  },
  {
    id: "vmp_020",
    verb: "suchen",
    preposition: "nach",
    case: "Dativ",
    meaning: { ru: "искать", en: "to look for, to search" },
    example: "Ich suche nach meinen Schlüsseln.",
    exampleTranslation: { ru: "Я ищу свои ключи.", en: "I'm looking for my keys." }
  },
  {
    id: "vmp_022",
    verb: "danken",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "благодарить за (человек — Dativ без предлога)", en: "to thank (for sth)" },
    example: "Ich danke dir für deine Hilfe.",
    exampleTranslation: { ru: "Спасибо тебе за помощь.", en: "Thank you for your help." }
  },
  {
    id: "vmp_023",
    verb: "sich entschuldigen",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "извиняться за", en: "to apologise (for what you did)" },
    example: "Ich entschuldige mich für meinen Fehler.",
    exampleTranslation: { ru: "Я извиняюсь за свою ошибку.", en: "I apologise for my mistake." }
  },
  {
    id: "vmp_024",
    verb: "sich entscheiden",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "выбрать, сделать выбор в пользу", en: "to decide on, to choose" },
    example: "Ich entscheide mich für den blauen Mantel.",
    exampleTranslation: { ru: "Я выбираю синее пальто.", en: "I'm choosing the blue coat." }
  },
  {
    id: "vmp_025",
    verb: "sich interessieren",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "интересоваться", en: "to be interested in" },
    example: "Ich interessiere mich für moderne Kunst.",
    exampleTranslation: { ru: "Я интересуюсь современным искусством.", en: "I'm interested in modern art." }
  },
  {
    id: "vmp_028",
    verb: "bitten",
    preposition: "um",
    case: "Akkusativ",
    meaning: { ru: "просить о", en: "to ask (politely) for" },
    example: "Ich bitte dich um einen Gefallen.",
    exampleTranslation: { ru: "Я прошу тебя об одолжении.", en: "I'm asking you a favour." }
  },
  {
    id: "vmp_029",
    verb: "sich kümmern",
    preposition: "um",
    case: "Akkusativ",
    meaning: { ru: "заботиться о, позаботиться о", en: "to take care of, to look after" },
    example: "Ich kümmere mich um die Kinder.",
    exampleTranslation: { ru: "Я забочусь о детях.", en: "I look after the children." }
  },
  {
    id: "vmp_030",
    verb: "es geht",
    preposition: "um",
    case: "Akkusativ",
    meaning: { ru: "речь идёт о", en: "it's about" },
    example: "Es geht um ein wichtiges Thema.",
    exampleTranslation: { ru: "Речь идёт о важной теме.", en: "It's about an important topic." }
  },
  {
    id: "vmp_031",
    verb: "sich freuen",
    preposition: "über",
    case: "Akkusativ",
    meaning: {
      ru: "радоваться чему-либо (тому, что уже произошло или что получил)",
      en: "to be happy about (sth that has happened or you've received)"
    },
    example: "Ich freue mich über das Geschenk.",
    exampleTranslation: { ru: "Я радуюсь подарку.", en: "I'm happy about the present." }
  },
  {
    id: "vmp_033",
    verb: "nachdenken",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "размышлять, обдумывать", en: "to reflect on, to think over" },
    example: "Ich denke über die Frage nach.",
    exampleTranslation: { ru: "Я размышляю над вопросом.", en: "I'm thinking about the question." }
  },
  {
    id: "vmp_034",
    verb: "sprechen",
    preposition: "über",
    case: "Akkusativ",
    alsoAccepted: [
      {
        preposition: "von",
        case: "Dativ",
        example: "Er spricht oft von seiner Kindheit.",
        exampleTranslation: { ru: "Он часто говорит о своём детстве.", en: "He often talks about his childhood." }
      }
    ],
    meaning: { ru: "говорить о, разговаривать о", en: "to talk about" },
    example: "Wir sprechen über den Film.",
    exampleTranslation: { ru: "Мы говорим о фильме.", en: "We're talking about the film." }
  },
  {
    id: "vmp_035",
    verb: "sich informieren",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "узнавать информацию о, информироваться о", en: "to find out, to get information" },
    example: "Ich informiere mich über den Kurs.",
    exampleTranslation: { ru: "Я собираю информацию о курсе.", en: "I'm finding out about the course." }
  },
  {
    id: "vmp_037",
    verb: "erzählen",
    preposition: "von",
    case: "Dativ",
    alsoAccepted: [
      {
        preposition: "über",
        case: "Akkusativ",
        example: "Sie hat viel über ihren Urlaub erzählt.",
        exampleTranslation: { ru: "Она много рассказала о своём отпуске.", en: "She told us a lot about her holiday." }
      }
    ],
    meaning: { ru: "рассказывать о", en: "to tell (someone) about" },
    example: "Sie erzählt von ihrer Arbeit.",
    exampleTranslation: { ru: "Она рассказывает о своей работе.", en: "She's telling us about her work." }
  },
  {
    id: "vmp_038",
    verb: "träumen",
    preposition: "von",
    case: "Dativ",
    meaning: { ru: "мечтать о; видеть во сне", en: "to dream about" },
    example: "Ich träume von einer Reise.",
    exampleTranslation: { ru: "Я мечтаю о путешествии.", en: "I'm dreaming of a trip." }
  },
  {
    id: "vmp_039",
    verb: "gehören",
    preposition: "zu",
    case: "Dativ",
    meaning: { ru: "относиться к, принадлежать к", en: "to be part of, to belong to" },
    example: "Das gehört zu meinem Beruf.",
    exampleTranslation: { ru: "Это относится к моей профессии.", en: "That's part of my job." }
  },
  {
    id: "vmp_040",
    verb: "gratulieren",
    preposition: "zu",
    case: "Dativ",
    meaning: { ru: "поздравлять с", en: "to congratulate on" },
    example: "Ich gratuliere dir zu deinem neuen Job.",
    exampleTranslation: { ru: "Поздравляю тебя с новой работой.", en: "I'd like to congratulate you on your new job." }
  },
  {
    id: "vmp_042",
    verb: "warnen",
    preposition: "vor",
    case: "Dativ",
    meaning: { ru: "предупреждать о, предостерегать от", en: "to warn about, to warn against" },
    example: "Ich warne dich vor diesem Mann.",
    exampleTranslation: { ru: "Я предупреждаю тебя насчёт этого человека.", en: "I'm warning you about this man." }
  },
  {
    id: "vmp_043",
    verb: "sich verlieben",
    preposition: "in",
    case: "Akkusativ",
    meaning: { ru: "влюбиться в", en: "to fall for (someone)" },
    example: "Sie hat sich in ihn verliebt.",
    exampleTranslation: { ru: "Она влюбилась в него.", en: "She has fallen in love with him." }
  },
  {
    id: "vmp_044",
    verb: "bestehen",
    preposition: "aus",
    case: "Dativ",
    meaning: { ru: "состоять из", en: "to consist of, to be made up of" },
    example: "Die Wohnung besteht aus einem Zimmer und einer Küche.",
    exampleTranslation: {
      ru: "Квартира состоит из комнаты и кухни.",
      en: "The flat consists of one room and a kitchen."
    }
  },
  {
    id: "vmp_046",
    verb: "sich gewöhnen",
    preposition: "an",
    case: "Akkusativ",
    meaning: { ru: "привыкать к", en: "to get used to" },
    example: "Ich gewöhne mich an die neue Arbeit.",
    exampleTranslation: { ru: "Я привыкаю к новой работе.", en: "I'm getting used to the new job." }
  },
  {
    id: "vmp_047",
    verb: "schreiben",
    preposition: "an",
    case: "Akkusativ",
    meaning: { ru: "писать кому-то (письмо, e-mail)", en: "to write (to someone)" },
    example: "Ich schreibe eine E-Mail an meinen Chef.",
    exampleTranslation: { ru: "Я пишу e-mail своему начальнику.", en: "I'm writing an email to my boss." }
  },
  {
    id: "vmp_048",
    verb: "aufpassen",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "присматривать за, следить за", en: "to look after, to watch" },
    example: "Kannst du auf meine Tasche aufpassen?",
    exampleTranslation: { ru: "Можешь присмотреть за моей сумкой?", en: "Can you keep an eye on my bag?" }
  },
  {
    id: "vmp_049",
    verb: "sich konzentrieren",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "сосредоточиться на", en: "to concentrate, to focus" },
    example: "Ich kann mich nicht auf die Arbeit konzentrieren.",
    exampleTranslation: { ru: "Я не могу сосредоточиться на работе.", en: "I can't concentrate on my work." }
  },
  {
    id: "vmp_050",
    verb: "sich verlassen",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "полагаться на", en: "to rely on, to count on" },
    example: "Du kannst dich auf mich verlassen.",
    exampleTranslation: { ru: "Ты можешь на меня положиться.", en: "You can rely on me." }
  },
  {
    id: "vmp_052",
    verb: "sich entschuldigen",
    preposition: "bei",
    case: "Dativ",
    meaning: { ru: "извиняться перед кем-то", en: "to apologise (to a person)" },
    example: "Ich entschuldige mich bei dir für die Verspätung.",
    exampleTranslation: { ru: "Я извиняюсь перед тобой за опоздание.", en: "I apologise to you for being late." }
  },
  {
    id: "vmp_053",
    verb: "aufhören",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "прекращать, бросать (делать что-то)", en: "to stop, to give up (doing sth)" },
    example: "Ich höre mit dem Rauchen auf.",
    exampleTranslation: { ru: "Я бросаю курить.", en: "I'm giving up smoking." }
  },
  {
    id: "vmp_054",
    verb: "sich beschäftigen",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "заниматься чем-то", en: "to spend time on, to study" },
    example: "Ich beschäftige mich gerade mit der deutschen Grammatik.",
    exampleTranslation: {
      ru: "Сейчас я занимаюсь немецкой грамматикой.",
      en: "I'm studying German grammar at the moment."
    }
  },
  {
    id: "vmp_055",
    verb: "abhängen",
    preposition: "von",
    case: "Dativ",
    meaning: { ru: "зависеть от", en: "to depend on" },
    example: "Das hängt vom Wetter ab.",
    exampleTranslation: { ru: "Это зависит от погоды.", en: "It depends on the weather." }
  },
  {
    id: "vmp_056",
    verb: "halten",
    preposition: "von",
    case: "Dativ",
    meaning: { ru: "быть какого-то мнения о", en: "to think highly / little of" },
    example: "Was hältst du von meiner Idee?",
    exampleTranslation: { ru: "Что ты думаешь о моей идее?", en: "What do you think of my idea?" }
  },
  {
    id: "vmp_057",
    verb: "sich erholen",
    preposition: "von",
    case: "Dativ",
    meaning: { ru: "отдыхать, восстанавливаться после", en: "to recover from" },
    example: "Ich muss mich von der Arbeit erholen.",
    exampleTranslation: { ru: "Мне нужно отдохнуть от работы.", en: "I need to recover from work." }
  },
  {
    id: "vmp_058",
    verb: "sich verabschieden",
    preposition: "von",
    case: "Dativ",
    meaning: { ru: "прощаться с", en: "to say goodbye (to someone)" },
    example: "Ich verabschiede mich von meinen Kollegen.",
    exampleTranslation: { ru: "Я прощаюсь с коллегами.", en: "I'm saying goodbye to my colleagues." }
  },
  {
    id: "vmp_059",
    verb: "sich ärgern",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "злиться на что-то", en: "to be annoyed (by)" },
    example: "Ich ärgere mich über den Stau.",
    exampleTranslation: { ru: "Я злюсь из-за пробки.", en: "I'm annoyed about the traffic jam." }
  },
  {
    id: "vmp_060",
    verb: "sich beschweren",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "жаловаться на", en: "to complain (about sth)" },
    example: "Er beschwert sich über den Lärm.",
    exampleTranslation: { ru: "Он жалуется на шум.", en: "He's complaining about the noise." }
  },
  {
    id: "vmp_063",
    verb: "passen",
    preposition: "zu",
    case: "Dativ",
    meaning: { ru: "подходить к, сочетаться с", en: "to go well, to match" },
    example: "Die Schuhe passen gut zu deinem Kleid.",
    exampleTranslation: { ru: "Туфли хорошо подходят к твоему платью.", en: "The shoes go well with your dress." }
  },
  {
    id: "vmp_064",
    verb: "sorgen",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "обеспечивать, позаботиться о", en: "to take care of, to provide" },
    example: "Wer sorgt für die Getränke?",
    exampleTranslation: { ru: "Кто позаботится о напитках?", en: "Who's taking care of the drinks?" }
  },
  {
    id: "vmp_065",
    verb: "halten",
    preposition: "für",
    case: "Akkusativ",
    meaning: { ru: "считать кем-то / чем-то", en: "to consider, to regard as" },
    example: "Ich halte ihn für einen guten Lehrer.",
    exampleTranslation: { ru: "Я считаю его хорошим учителем.", en: "I consider him a good teacher." }
  },
  {
    id: "vmp_068",
    verb: "Angst haben",
    preposition: "vor",
    case: "Dativ",
    meaning: { ru: "бояться кого-то / чего-то", en: "to be afraid of" },
    example: "Ich habe Angst vor großen Hunden.",
    exampleTranslation: { ru: "Я боюсь больших собак.", en: "I'm afraid of big dogs." }
  },
  {
    id: "vmp_069",
    verb: "Lust haben",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "хотеть чего-то, иметь желание", en: "to feel like, to fancy" },
    example: "Ich habe Lust auf ein Eis.",
    exampleTranslation: { ru: "Мне хочется мороженого.", en: "I fancy an ice cream." }
  },
  {
    id: "vmp_070",
    verb: "telefonieren",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "говорить по телефону с", en: "to be on the phone to, to call" },
    example: "Ich telefoniere jeden Sonntag mit meiner Mutter.",
    exampleTranslation: {
      ru: "Я каждое воскресенье говорю по телефону с мамой.",
      en: "I talk to my mum on the phone every Sunday."
    }
  },
  {
    id: "vmp_071",
    verb: "helfen",
    preposition: "bei",
    case: "Dativ",
    meaning: { ru: "помогать с чем-то (в каком-то деле)", en: "to help (someone) with sth" },
    example: "Kannst du mir beim Umzug helfen?",
    exampleTranslation: { ru: "Можешь помочь мне с переездом?", en: "Can you help me with the move?" }
  },
  {
    id: "vmp_072",
    verb: "sich unterhalten",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "беседовать с кем-то", en: "to chat to someone, to have a conversation" },
    example: "Ich habe mich lange mit meiner Nachbarin unterhalten.",
    exampleTranslation: { ru: "Я долго беседовала с соседкой.", en: "I had a long chat with my neighbour." }
  },
  {
    id: "vmp_073",
    verb: "sich unterhalten",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "беседовать о чём-то (тема разговора)", en: "to talk, to chat (about a topic)" },
    example: "Wir haben uns über das Konzert unterhalten.",
    exampleTranslation: { ru: "Мы поговорили о концерте.", en: "We talked about the concert." }
  },
  {
    id: "vmp_074",
    verb: "diskutieren",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "обсуждать (тему), спорить о чём-то", en: "to discuss, to debate (a topic)" },
    example: "Wir diskutieren über den neuen Plan.",
    exampleTranslation: { ru: "Мы обсуждаем новый план.", en: "We're discussing the new plan." }
  },
  {
    id: "vmp_075",
    verb: "achten",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "обращать внимание на, следить за", en: "to pay attention to, to watch out for" },
    example: "Ich achte auf meine Gesundheit.",
    exampleTranslation: { ru: "Я слежу за своим здоровьем.", en: "I look after my health." }
  },
  {
    id: "vmp_076",
    verb: "zweifeln",
    preposition: "an",
    case: "Dativ",
    meaning: { ru: "сомневаться в", en: "to doubt" },
    example: "Ich zweifle an seiner Ehrlichkeit.",
    exampleTranslation: { ru: "Я сомневаюсь в его честности.", en: "I doubt his honesty." }
  },
  {
    id: "vmp_077",
    verb: "sich beteiligen",
    preposition: "an",
    case: "Dativ",
    meaning: { ru: "участвовать в, вносить свой вклад", en: "to take part, to contribute" },
    example: "Alle beteiligen sich an der Diskussion.",
    exampleTranslation: { ru: "Все участвуют в обсуждении.", en: "Everyone is taking part in the discussion." }
  },
  {
    id: "vmp_078",
    verb: "erkennen",
    preposition: "an",
    case: "Dativ",
    meaning: { ru: "узнавать (кого-то) по", en: "to recognise (someone) by" },
    example: "Ich erkenne ihn an seiner Stimme.",
    exampleTranslation: { ru: "Я узнаю его по голосу.", en: "I recognise him by his voice." }
  },
  {
    id: "vmp_079",
    verb: "bestehen",
    preposition: "auf",
    case: "Dativ",
    meaning: { ru: "настаивать на", en: "to insist" },
    example: "Er besteht auf einer Antwort.",
    exampleTranslation: { ru: "Он настаивает на ответе.", en: "He insists on an answer." }
  },
  {
    id: "vmp_080",
    verb: "sich fürchten",
    preposition: "vor",
    case: "Dativ",
    meaning: { ru: "бояться", en: "to be scared (of sth)" },
    example: "Das Kind fürchtet sich vor dem Hund.",
    exampleTranslation: { ru: "Ребёнок боится собаки.", en: "The child is scared of the dog." }
  },
  {
    id: "vmp_081",
    verb: "sich verstecken",
    preposition: "vor",
    case: "Dativ",
    meaning: { ru: "прятаться от", en: "to hide (from someone or sth)" },
    example: "Die Katze versteckt sich vor dem Gewitter.",
    exampleTranslation: { ru: "Кошка прячется от грозы.", en: "The cat is hiding from the thunderstorm." }
  },
  {
    id: "vmp_082",
    verb: "sich aufregen",
    preposition: "über",
    case: "Akkusativ",
    meaning: { ru: "возмущаться чем-то, нервничать", en: "to get worked up, to get upset" },
    example: "Er regt sich über seinen Chef auf.",
    exampleTranslation: { ru: "Он возмущается из-за своего начальника.", en: "He's getting worked up about his boss." }
  },
  {
    id: "vmp_083",
    verb: "sich verabreden",
    preposition: "mit",
    case: "Dativ",
    meaning: { ru: "договориться о встрече с", en: "to arrange to meet (someone)" },
    example: "Ich verabrede mich mit meiner Freundin.",
    exampleTranslation: { ru: "Я договариваюсь о встрече с подругой.", en: "I'm arranging to meet my friend." }
  },
  {
    id: "vmp_084",
    verb: "sich erkundigen",
    preposition: "nach",
    case: "Dativ",
    meaning: { ru: "осведомляться о, расспрашивать о", en: "to ask about, to enquire" },
    example: "Sie erkundigt sich nach dem Weg.",
    exampleTranslation: { ru: "Она спрашивает дорогу.", en: "She's asking the way." }
  },
  {
    id: "vmp_085",
    verb: "verzichten",
    preposition: "auf",
    case: "Akkusativ",
    meaning: { ru: "отказываться от", en: "to do without, to give up" },
    example: "Ich verzichte auf den Nachtisch.",
    exampleTranslation: { ru: "Я отказываюсь от десерта.", en: "I'll skip dessert." }
  },
  {
    id: "vmp_086",
    verb: "es handelt sich",
    preposition: "um",
    case: "Akkusativ",
    meaning: { ru: "речь идёт о (книжнее, чем es geht um)", en: "it's a matter of, it concerns" },
    example: "Es handelt sich um einen Fehler.",
    exampleTranslation: { ru: "Речь идёт об ошибке.", en: "It's a mistake." }
  },
  {
    id: "vmp_087",
    verb: "protestieren",
    preposition: "gegen",
    case: "Akkusativ",
    meaning: { ru: "протестовать против", en: "to protest" },
    example: "Viele protestieren gegen die neuen Regeln.",
    exampleTranslation: {
      ru: "Многие протестуют против новых правил.",
      en: "Many people are protesting against the new rules."
    }
  }
];
