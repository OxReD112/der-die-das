// Vielseitige Verben — the sentences of the exercise (werden, lassen, sein, haben, bekommen) and the texts
// of the answer. Explanations are in the user's language ({ en, ru }, picked by DeutschTranslation);
// sentences, forms and examples stay German.
//
// Sentence fields:
//   verb      infinitive (not shown during the question: choosing the verb is part of the task)
//   form      the verb form as a verb table names it: Präsens, Präteritum, Partizip II, Infinitiv, Imperativ, Konjunktiv II
//   person    optional table row for forms shared by multiple persons (ich, du, er/sie/es, wir, ihr, sie/Sie)
//   job       what the verb does in this sentence (key of VV_JOBS) — progress item = verb + job
//   situation { en, ru } what the sentence should say
//   sentence  with „___“ for the gap
//   answer    main answer · also: other accepted answers
//   marks     clue words, marked in the sentence after Prüfen: only what decides the verb or the form
//             (e.g. letzte Woche when nothing else in the sentence says „past“)
//   rule      { en, ru } fallback only: after Prüfen the exercise shows the table's card of the meaning with the same
//             job (forms_table.js); this line is shown only if no meaning has that job. The construction, named as building blocks (not the words of the sentence): helper and main
//             verbs by their form („werden im Präteritum“, „Partizip II von lassen“), as textbooks say it
//   tip       optional, { blocks, means } like a table meaning (forms_table.js): the explanation after Prüfen for
//             this sentence only, when the table's card is too general — the tense of the sentence (werden im
//             Präsens / Präteritum / sein + … + worden) and adjective or noun. Without it: the table's card.
// Each sentence's difficulty is stored under verb|sentence, so a sentence changed here starts again at 1.

window.VV_SENTENCES = [
  // ---- werden ----
  {
    verb: "werden", form: "Präteritum", person: "sie/Sie", job: "become",
    situation: { en: "Tell how the school trip ended: the children got tired quickly.", ru: "Расскажи, чем закончилась экскурсия: дети быстро устали." },
    sentence: "Nach dem Ausflug gestern ___ die Kinder schnell müde.", answer: "wurden", marks: ["gestern", "müde"],
    rule: { en: "time in the past + werden im Präteritum + adjective = became, got", ru: "время в прошлом + werden im Präteritum + прилагательное = стали" }
  },
  {
    verb: "werden", form: "Präteritum", person: "er/sie/es", job: "become",
    situation: { en: "Tell his story: he studied medicine and finished in 2015.", ru: "Расскажи его историю: он учился на врача и закончил учёбу в 2015." },
    sentence: "2015 ___ er Arzt.", answer: "wurde", marks: ["2015", "Arzt"],
    rule: { en: "a year in the past + werden im Präteritum + noun = became", ru: "год в прошлом + werden im Präteritum + существительное = стал" }
  },
  {
    verb: "werden", form: "Partizip II", job: "become",
    situation: { en: "Your sister finished her studies. Now she's a teacher. Tell a friend.", ru: "Твоя сестра закончила учёбу, теперь она учительница. Расскажи подруге." },
    sentence: "Meine Schwester ist Lehrerin ___.", answer: "geworden", marks: ["ist", "Lehrerin"],
    rule: { en: "sein im Präsens + Partizip II von werden, no second verb = became", ru: "sein im Präsens + Partizip II von werden, без второго глагола = стала" },
    tip: { blocks: [["sein", "plain"], [{ en: "noun", ru: "существительное" }, "part"], ["geworden", "verb"]], means: { en: "became", ru: "стала" } }
  },
  {
    verb: "werden", form: "Partizip II", job: "passive",
    situation: { en: "Your bike isn't where you left it. Someone stole it.", ru: "Твоего велосипеда нет там, где ты его оставила. Кто-то его украл." },
    sentence: "Mein Fahrrad ist gestohlen ___.", answer: "worden", marks: ["ist", "gestohlen"],
    rule: { en: "thing + sein im Präsens + Partizip II + worden = Passiv, it has been done", ru: "вещь + sein im Präsens + Partizip II + worden = Passiv, это уже сделали" },
    tip: { blocks: [["sein", "plain"], ["Partizip II", "part"], ["worden", "verb"]], means: { en: "it was done", ru: "это сделали" } }
  },
  {
    verb: "werden", form: "Präsens", job: "future",
    situation: { en: "Promise your friend you'll call her tomorrow.", ru: "Пообещай подруге, что позвонишь ей завтра." },
    sentence: "Ich ___ dich morgen anrufen.", answer: "werde", marks: ["anrufen"],
    rule: { en: "werden im Präsens + infinitive = future", ru: "werden im Präsens + Infinitiv = будущее" }
  },
  {
    verb: "werden", form: "Präsens", job: "guess",
    situation: { en: "Your colleague isn't answering. It's 3 am where he is. Guess why.", ru: "Коллега не отвечает. У него сейчас три часа ночи. Предположи, почему." },
    sentence: "Er ___ wohl schlafen.", answer: "wird", marks: ["wohl", "schlafen"],
    rule: { en: "werden im Präsens + wohl + infinitive = probably (a guess)", ru: "werden im Präsens + wohl + Infinitiv = наверное (догадка)" }
  },
  {
    verb: "werden", form: "Präsens", person: "sie/Sie", job: "passive",
    situation: { en: "Right now, as you watch, the cleaners are washing the windows.", ru: "Прямо сейчас у тебя на глазах уборщики моют окна." },
    sentence: "Die Fenster ___ gerade geputzt.", answer: "werden", marks: ["gerade", "geputzt"],
    rule: { en: "thing + werden im Präsens + Partizip II = Passiv, it's being done right now", ru: "вещь + werden im Präsens + Partizip II = Passiv, это делают прямо сейчас" }
  },
  {
    verb: "werden", form: "Präteritum", person: "er/sie/es", job: "passive",
    situation: { en: "Like in a history book: the Berlin Wall, 1961.", ru: "Как в учебнике истории: Берлинская стена, 1961." },
    sentence: "Die Mauer ___ 1961 gebaut.", answer: "wurde", marks: ["1961", "gebaut"],
    rule: { en: "time in the past + werden im Präteritum + Partizip II = Passiv, it was done", ru: "время в прошлом + werden im Präteritum + Partizip II = Passiv, это сделали" }
  },
  {
    verb: "werden", form: "Präteritum", person: "er/sie/es", job: "passive",
    situation: { en: "Write a flat listing: new kitchen since last year.", ru: "Напиши объявление о квартире: кухню отремонтировали в прошлом году." },
    sentence: "Die Küche ___ letztes Jahr renoviert.", answer: "wurde", marks: ["letztes Jahr", "renoviert"],
    rule: { en: "time in the past + werden im Präteritum + Partizip II = Passiv, it was done", ru: "время в прошлом + werden im Präteritum + Partizip II = Passiv, это сделали" }
  },
  {
    verb: "werden", form: "Präsens", job: "passive",
    situation: { en: "The mechanic is working on your car right now. Talk about the car.", ru: "Механик прямо сейчас чинит твою машину. Скажи про машину." },
    sentence: "Mein Auto ___ gerade repariert.", answer: "wird", marks: ["Auto", "gerade", "repariert"],
    rule: { en: "thing + werden im Präsens + Partizip II = Passiv, it's being done right now", ru: "вещь + werden im Präsens + Partizip II = Passiv, это делают прямо сейчас" }
  },
  {
    verb: "werden", form: "Partizip II", job: "passive",
    situation: { en: "Your car is back from the garage. Talk about the car.", ru: "Машина вернулась из автосервиса. Скажи про машину." },
    sentence: "Mein Auto ist gestern repariert ___.", answer: "worden", marks: ["Auto", "ist", "repariert"],
    rule: { en: "thing + sein im Präsens + Partizip II + worden = Passiv, it has been done", ru: "вещь + sein im Präsens + Partizip II + worden = Passiv, это уже сделали" },
    tip: { blocks: [["sein", "plain"], ["Partizip II", "part"], ["worden", "verb"]], means: { en: "it was done", ru: "это сделали" } }
  },
  {
    verb: "werden", form: "Konjunktiv II", person: "er/sie/es", job: "wuerde",
    situation: { en: "On the train you're cold. Politely ask the person next to you to close the window.", ru: "В электричке тебе холодно. Вежливо попроси соседа закрыть окно." },
    sentence: "___ es Ihnen etwas ausmachen, das Fenster zu schließen?", answer: "Würde", marks: ["etwas ausmachen"],
    rule: { en: "werden im Konjunktiv II + infinitive = would (a polite request)", ru: "werden im Konjunktiv II + Infinitiv = бы (вежливая просьба)" }
  },
  {
    verb: "werden", form: "Konjunktiv II", person: "er/sie/es", job: "wuerde",
    situation: { en: "Daydream: if you had more money…", ru: "Помечтай: если бы у тебя было больше денег…" },
    sentence: "Wenn ich mehr Geld hätte, ___ ich gern mehr reisen.", answer: "würde", marks: ["hätte", "gern"],
    rule: { en: "werden im Konjunktiv II + infinitive = would (not real)", ru: "werden im Konjunktiv II + Infinitiv = бы (нереально)" }
  },
  {
    verb: "werden", form: "Präsens", person: "wir", job: "become",
    situation: { en: "Before the exam you all get more and more nervous.", ru: "Перед экзаменом вы нервничаете всё сильнее." },
    sentence: "Vor der Prüfung ___ wir immer nervöser.", answer: "werden", marks: ["immer nervöser"],
    rule: { en: "werden im Präsens + adjective = become, get", ru: "werden im Präsens + прилагательное = становиться" }
  },

  {
    verb: "werden", form: "Präsens", job: "future",
    situation: { en: "Your friends fear the surprise party will fail. Reassure them.", ru: "Друзья боятся, что сюрприз не получится. Успокой их." },
    sentence: "Ihr ___ sehen, es klappt!", answer: "werdet", marks: ["sehen"],
    rule: { en: "werden im Präsens + infinitive = future", ru: "werden im Präsens + Infinitiv = будущее" }
  },
  {
    verb: "werden", form: "Präsens", person: "wir", job: "passive",
    situation: { en: "A taxi is picking your family up tomorrow at eight.", ru: "Завтра в восемь за вашей семьёй приедет такси." },
    sentence: "Wir ___ morgen um acht abgeholt.", answer: "werden", marks: ["abgeholt"],
    rule: { en: "person + werden im Präsens + Partizip II = Passiv, it's done to us", ru: "человек + werden im Präsens + Partizip II = Passiv, это делают с нами" }
  },

  // ---- lassen ----
  {
    verb: "lassen", form: "Präsens", job: "leave",
    situation: { en: "The sky is clear. You're not taking the umbrella.", ru: "Небо ясное. Зонт ты не берёшь." },
    sentence: "Ich ___ den Schirm heute zu Hause.", answer: "lasse", marks: ["zu Hause"],
    rule: { en: "lassen im Präsens + thing + place, no second verb = leave", ru: "lassen im Präsens + вещь + место, без второго глагола = оставить" }
  },
  {
    verb: "lassen", form: "Partizip II", job: "leave",
    situation: { en: "Your friend is out all night. Her dog is home alone?", ru: "Подруга гуляет всю ночь. А собака одна дома?" },
    sentence: "Hast du deinen Hund wirklich allein zu Hause ___?", answer: "gelassen", marks: ["Hast", "zu Hause"],
    rule: { en: "haben im Präsens + Partizip II von lassen, no second verb = left", ru: "haben im Präsens + Partizip II von lassen, без второго глагола = оставила" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "place", ru: "место" }, "part"], ["gelassen", "verb"]], means: { en: "left", ru: "оставила" } }
  },
  {
    verb: "lassen", form: "Infinitiv", job: "haveDone",
    situation: { en: "Your car broke down. A mechanic fixed it. Tell your friend.", ru: "Машина сломалась, её починил механик. Расскажи подруге." },
    sentence: "Ich habe mein Auto reparieren ___.", answer: "lassen", marks: ["Ich", "habe", "reparieren"],
    rule: { en: "person + haben im Präsens + thing + infinitive + lassen im Infinitiv = had it done", ru: "человек + haben im Präsens + вещь + Infinitiv + lassen im Infinitiv = поручила сделать" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "infinitive", ru: "Infinitiv" }, "part"], ["lassen", "verb"]], means: { en: "had it done", ru: "мне это сделали" } }
  },
  {
    verb: "lassen", form: "Präsens", person: "du", job: "haveDone",
    situation: { en: "Your friend has a hairdresser appointment on Saturday. Ask her about it.", ru: "У подруги в субботу запись к парикмахеру. Спроси её об этом." },
    sentence: "___ du dir am Samstag die Haare schneiden?", answer: "Lässt", marks: ["du", "schneiden"],
    rule: { en: "person + lassen im Präsens + thing + infinitive = have someone do it", ru: "человек + lassen im Präsens + вещь + Infinitiv = поручить кому-то" }
  },
  {
    verb: "lassen", form: "Präsens", person: "wir", job: "haveDone",
    situation: { en: "Your family's laptop is broken. Tomorrow you're taking it to a repair shop.", ru: "Семейный ноутбук сломался. Завтра вы несёте его в ремонт." },
    sentence: "Morgen ___ wir unseren Laptop reparieren.", answer: "lassen", marks: ["wir", "reparieren"],
    rule: { en: "person + lassen im Präsens + thing + infinitive = have someone do it", ru: "человек + lassen im Präsens + вещь + Infinitiv = поручить кому-то" }
  },
  {
    verb: "lassen", form: "Infinitiv", job: "haveDone",
    situation: { en: "Your friend notices your new haircut. You went to the hairdresser.", ru: "Подруга заметила новую стрижку. Ты ходила к парикмахеру." },
    sentence: "Ich habe mir die Haare schneiden ___.", answer: "lassen", marks: ["Ich", "habe", "schneiden"],
    rule: { en: "person + haben im Präsens + thing + infinitive + lassen im Infinitiv = had it done", ru: "человек + haben im Präsens + вещь + Infinitiv + lassen im Infinitiv = поручила сделать" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "infinitive", ru: "Infinitiv" }, "part"], ["lassen", "verb"]], means: { en: "had it done", ru: "мне это сделали" } }
  },
  {
    verb: "lassen", form: "Imperativ (du)", job: "allow",
    situation: { en: "Your friend keeps waking you up. Ask her to let you sleep.", ru: "Подруга всё время тебя будит. Попроси дать тебе поспать." },
    sentence: "___ mich doch schlafen!", answer: "Lass", marks: ["mich", "schlafen"],
    rule: { en: "lassen im Imperativ + person + infinitive = let someone do it", ru: "lassen im Imperativ + кто-то + Infinitiv = дай кому-то сделать" }
  },
  {
    verb: "lassen", form: "Imperativ (du)", job: "letsGo",
    situation: { en: "Suggest to your friend that you go for a walk.", ru: "Предложи подруге пойти погулять." },
    sentence: "___ uns spazieren gehen!", answer: "Lass", marks: ["uns"],
    rule: { en: "lassen im Imperativ (du) + uns + infinitive = let's (to one person)", ru: "lassen im Imperativ (du) + uns + Infinitiv = давай (одному)" }
  },
  {
    verb: "lassen", form: "Imperativ (ihr)", job: "letsGo",
    situation: { en: "Game night: everyone's at the table. Suggest to your friends that you all start.", ru: "Вечер настолок, все за столом. Предложи всем начать." },
    sentence: "___ uns anfangen!", answer: "Lasst", marks: ["uns"],
    rule: { en: "lassen im Imperativ (ihr) + uns + infinitive = let's (to several people)", ru: "lassen im Imperativ (ihr) + uns + Infinitiv = давайте (нескольким)" }
  },
  {
    verb: "lassen", form: "Imperativ (du)", job: "stop",
    situation: { en: "Your little brother keeps poking you. Tell him to stop.", ru: "Младший брат всё время тебя тыкает. Скажи ему прекратить." },
    sentence: "___ das!", answer: "Lass", marks: [],
    rule: { en: "Lass das! = stop it (fixed phrase)", ru: "Lass das! = прекрати (устойчивое выражение)" }
  },
  {
    verb: "lassen", form: "Präsens", person: "er/sie/es", job: "canBeDone",
    situation: { en: "Your friend's lamp is broken. Tell her it can be fixed.", ru: "У подруги сломалась лампа. Скажи ей, что её можно починить." },
    sentence: "Die Lampe ___ sich reparieren.", answer: "lässt", marks: ["sich", "reparieren"],
    rule: { en: "thing + lassen im Präsens + sich + infinitive = can be done", ru: "вещь + lassen im Präsens + sich + Infinitiv = можно сделать" }
  },
  {
    verb: "lassen", form: "Präteritum", person: "ich", job: "leave",
    situation: { en: "Write it like in a book: last night you left the window open.", ru: "Напиши как в рассказе: вчера ты оставила окно открытым." },
    sentence: "Gestern ___ ich das Fenster die ganze Nacht offen.", answer: "ließ", also: ["liess"], marks: ["Gestern", "offen"],
    rule: { en: "the past in a story + lassen im Präteritum + thing + adjective = leave (open)", ru: "прошлое в рассказе + lassen im Präteritum + вещь + прилагательное = оставить (открытым)" },
    tip: { blocks: [["lassen", "verb"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "adjective", ru: "прилагательное" }, "part"]], means: { en: "left (open)", ru: "оставила (открытым)" } }
  },

  {
    verb: "lassen", form: "Partizip II", job: "leave",
    situation: { en: "Your friend asks: “You were at the cinema yesterday, but what about the kids?”", ru: "Подруга спрашивает: «Вы вчера были в кино, а как же дети?»" },
    sentence: "Wir haben die Kinder bei Oma ___.", answer: "gelassen", marks: ["haben", "bei Oma"],
    rule: { en: "haben im Präsens + Partizip II von lassen, no second verb = left", ru: "haben im Präsens + Partizip II von lassen, без второго глагола = оставили" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "place", ru: "место" }, "part"], ["gelassen", "verb"]], means: { en: "left", ru: "оставили" } }
  },
  {
    verb: "lassen", form: "Infinitiv", job: "leave",
    situation: { en: "You're home and your key isn't in your bag. You forgot it at the office.", ru: "Ты дома, а ключа в сумке нет. Ты забыла его в офисе." },
    sentence: "Ich habe meinen Schlüssel im Büro liegen ___.", answer: "lassen", also: ["gelassen"], marks: ["habe", "liegen"],
    rule: { en: "haben im Präsens + liegen + lassen im Infinitiv = left (forgot) something", ru: "haben im Präsens + liegen + lassen im Infinitiv = забыла, оставила" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], [{ en: "place", ru: "место" }, "plain"], [{ en: "infinitive", ru: "Infinitiv" }, "part"], ["lassen", "verb"]], means: { en: "left behind (forgot)", ru: "забыла" } }
  },

  // ---- sein ----
  {
    verb: "sein", form: "Präsens", job: "state",
    situation: { en: "You arrive at the shop and try the door. Too late, it's locked.", ru: "Ты подходишь к магазину и дёргаешь дверь. Поздно, заперто." },
    sentence: "Die Tür ___ schon abgeschlossen.", answer: "ist", marks: ["schon", "abgeschlossen"],
    rule: { en: "thing + sein im Präsens + Partizip II = already done, a state", ru: "вещь + sein im Präsens + Partizip II = уже сделано, состояние" }
  },
  {
    verb: "sein", form: "Präteritum", person: "er/sie/es", job: "canBeDone",
    situation: { en: "Yesterday's exam wasn't that hard. Tell your friend it was doable.", ru: "Вчерашний экзамен был не таким сложным. Скажи подруге, что он был вполне посильным." },
    sentence: "Die Prüfung gestern ___ gut zu schaffen.", answer: "war", marks: ["gestern", "zu schaffen"],
    rule: { en: "time in the past + sein im Präteritum + zu + infinitive = could be done", ru: "время в прошлом + sein im Präteritum + zu + Infinitiv = можно было сделать" }
  },
  {
    verb: "sein", form: "Präsens", job: "pastHelper",
    situation: { en: "Tell your postman what you did yesterday evening.", ru: "Расскажи почтальону, что ты делала вчера вечером." },
    sentence: "Gestern ___ ich ins Kino gegangen.", answer: "bin", marks: ["ins Kino", "gegangen"],
    rule: { en: "going from A to B → sein im Präsens + Partizip II = Perfekt", ru: "движение из А в Б → sein im Präsens + Partizip II = Perfekt" }
  },
  {
    verb: "sein", form: "Präteritum", person: "er/sie/es", job: "state",
    situation: { en: "You went to the museum yesterday. Closed.", ru: "Вчера ты пошла в музей. Закрыто." },
    sentence: "Das Museum ___ gestern geschlossen.", answer: "war", marks: ["gestern", "geschlossen"],
    rule: { en: "thing + sein im Präteritum + Partizip II = a state in the past", ru: "вещь + sein im Präteritum + Partizip II = состояние в прошлом" }
  },

  {
    verb: "sein", form: "Präsens", person: "wir", job: "pastHelper",
    situation: { en: "Tell your neighbour what you did at the weekend.", ru: "Расскажи соседке, что вы делали на выходных." },
    sentence: "Am Wochenende ___ wir nach Berlin gefahren.", answer: "sind", marks: ["nach Berlin", "gefahren"],
    rule: { en: "going from A to B → sein im Präsens + Partizip II = Perfekt", ru: "движение из А в Б → sein im Präsens + Partizip II = Perfekt" }
  },
  {
    verb: "sein", form: "Präsens", person: "sie/Sie", job: "state",
    situation: { en: "You come home: the windows are clean already, the cleaners are gone.", ru: "Ты приходишь домой: окна уже чистые, уборщиков нет." },
    sentence: "Die Fenster ___ schon geputzt.", answer: "sind", marks: ["schon", "geputzt"],
    rule: { en: "thing + sein im Präsens + Partizip II = already done, a state", ru: "вещь + sein im Präsens + Partizip II = уже сделано, состояние" }
  },
  {
    verb: "sein", form: "Präsens", job: "canBeDone",
    situation: { en: "Your colleague left you a note. You can hardly read it.", ru: "Коллега оставил тебе записку. Её почти невозможно прочитать." },
    sentence: "Seine Schrift ___ kaum zu lesen.", answer: "ist", marks: ["zu lesen"],
    rule: { en: "thing + sein im Präsens + zu + infinitive = can be done", ru: "вещь + sein im Präsens + zu + Infinitiv = можно сделать" }
  },
  {
    verb: "sein", form: "Präteritum", person: "sie/Sie", job: "state",
    situation: { en: "Last Sunday you wanted to go shopping. Everything was closed.", ru: "В прошлое воскресенье ты хотела пойти за покупками. Всё было закрыто." },
    sentence: "Letzten Sonntag ___ alle Geschäfte geschlossen.", answer: "waren", marks: ["Letzten Sonntag", "geschlossen"],
    rule: { en: "time in the past + sein im Präteritum + Partizip II = a state in the past", ru: "время в прошлом + sein im Präteritum + Partizip II = состояние в прошлом" }
  },

  // ---- haben ----
  {
    verb: "haben", form: "Präsens", job: "pastHelper",
    situation: { en: "It's 2 pm. Ask your friend whether she's had lunch yet.", ru: "Два часа дня. Спроси подругу, обедала ли она уже." },
    sentence: "___ du schon gegessen?", answer: "Hast", marks: ["gegessen"],
    rule: { en: "haben im Präsens + Partizip II = Perfekt", ru: "haben im Präsens + Partizip II = Perfekt" }
  },
  {
    verb: "haben", form: "Präsens", job: "mustDo",
    situation: { en: "Friends invite you to a bar tonight, but you still have loads of work. Say no.", ru: "Друзья зовут тебя вечером в бар, а у тебя ещё куча работы. Откажись." },
    sentence: "Tut mir leid, ich ___ noch viel zu tun.", answer: "habe", marks: ["zu tun"],
    rule: { en: "haben im Präsens + zu + infinitive = have to", ru: "haben im Präsens + zu + Infinitiv = нужно" }
  },
  {
    verb: "haben", form: "Präteritum", person: "ich", job: "mustDo",
    situation: { en: "Explain why you didn't come yesterday.", ru: "Объясни, почему ты вчера не пришла." },
    sentence: "Ich ___ gestern noch meine Katze zu baden.", answer: "hatte", marks: ["gestern", "zu baden"],
    rule: { en: "time in the past + haben im Präteritum + zu + infinitive = had to", ru: "время в прошлом + haben im Präteritum + zu + Infinitiv = нужно было" }
  },
  {
    verb: "haben", form: "Präsens", job: "phrase",
    situation: { en: "Your friend said the train leaves at 8. You checked, she's right.", ru: "Подруга сказала, что поезд в 8. Ты проверила — она права." },
    sentence: "Du ___ recht.", answer: "hast", marks: ["recht"],
    rule: { en: "recht haben = to be right (fixed phrase)", ru: "recht haben = быть правым (устойчивое выражение)" },
    tip: { blocks: [["recht haben", "verb"]], means: { en: "be right", ru: "быть правым" } }
  },
  {
    verb: "haben", form: "Präsens", job: "phrase",
    situation: { en: "Someone starts chatting to you, but you need to catch your bus.", ru: "С тобой заговорили, а тебе надо успеть на автобус." },
    sentence: "Entschuldigung, ich ___ es eilig.", answer: "habe", marks: ["es eilig"],
    rule: { en: "es eilig haben = to be in a hurry (fixed phrase)", ru: "es eilig haben = торопиться (устойчивое выражение)" },
    tip: { blocks: [["es eilig haben", "verb"]], means: { en: "be in a hurry", ru: "спешить" } }
  },

  {
    verb: "haben", form: "Präsens", job: "feel",
    situation: { en: "Your brother sleeps with five teddy bears. Tell Grandma why.", ru: "Брат спит с пятью мишками. Объясни бабушке почему." },
    sentence: "Mein kleiner Bruder ___ Angst vor der Dunkelheit.", answer: "hat", marks: ["Angst vor"],
    rule: { en: "haben im Präsens + Angst = already feel it, a state", ru: "haben im Präsens + Angst = уже чувствовать, состояние" }
  },
  {
    verb: "haben", form: "Präsens", person: "wir", job: "feel",
    situation: { en: "Grandma calls: “What are you cooking tonight?” Be honest.", ru: "Бабушка звонит: «Что готовите на ужин?» Ответь честно." },
    sentence: "Heute ___ wir keine Lust zu kochen.", answer: "haben", marks: ["Lust"],
    rule: { en: "haben im Präsens + Lust = feel like doing it", ru: "haben im Präsens + Lust = хотеться" }
  },
  {
    verb: "haben", form: "Präsens", job: "mustDo",
    situation: { en: "You want to go to the lake with your friends. Ask if they're free.", ru: "Хочешь позвать друзей на озеро. Спроси, свободны ли они." },
    sentence: "___ ihr heute noch etwas zu erledigen?", answer: "Habt", marks: ["zu erledigen"],
    rule: { en: "haben im Präsens + zu + infinitive = have to", ru: "haben im Präsens + zu + Infinitiv = нужно" }
  },

  // ---- bekommen ----
  {
    verb: "bekommen", form: "Partizip II", job: "receive",
    situation: { en: "Your neighbour saw the postman at your door. Tell her what you got.", ru: "Соседка видела у твоей двери почтальона. Расскажи ей, что ты получила." },
    sentence: "Ich habe heute einen Brief von Mama ___.", answer: "bekommen", also: ["gekriegt", "erhalten"], marks: ["habe"],
    rule: { en: "haben im Präsens + thing + Partizip II von bekommen = got, received", ru: "haben im Präsens + вещь + Partizip II von bekommen = получила" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "part"], ["bekommen", "verb"]], means: { en: "got, received", ru: "получила" } }
  },
  {
    verb: "bekommen", form: "Präsens", job: "receive",
    situation: { en: "You ordered shoes online a week ago. Call the shop and ask.", ru: "Ты заказала туфли неделю назад. Позвони в магазин и спроси." },
    sentence: "Wann ___ ich mein Paket?", answer: "bekomme", also: ["kriege", "erhalte"], marks: ["mein Paket"],
    rule: { en: "bekommen im Präsens + thing = get, receive", ru: "bekommen im Präsens + вещь = получать" }
  },
  {
    verb: "bekommen", form: "Partizip II", job: "getDone",
    situation: { en: "A police officer stops you: “Is this bike really yours?” Explain.", ru: "Полицейский останавливает тебя: «Это точно ваш велосипед?» Объясни." },
    sentence: "Ich habe ein Fahrrad geschenkt ___.", answer: "bekommen", also: ["gekriegt"], marks: ["habe", "geschenkt"],
    rule: { en: "person + haben im Präsens + thing + Partizip II + Partizip II von bekommen = given / sent to you", ru: "человек + haben im Präsens + вещь + Partizip II + Partizip II von bekommen = тебе подарили / прислали" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], ["Partizip II", "part"], ["bekommen", "verb"]], means: { en: "was given", ru: "мне подарили" } }
  },
  {
    verb: "bekommen", form: "Präteritum", person: "ich", job: "getDone",
    situation: { en: "Write your memoirs: explain why you still hate socks.", ru: "Пишешь мемуары: объясни, почему до сих пор терпеть не можешь носки." },
    sentence: "Als Kind ___ ich jedes Jahr Socken geschenkt.", answer: "bekam", marks: ["Als Kind", "geschenkt"],
    rule: { en: "time in the past + bekommen im Präteritum + thing + Partizip II = given / sent to you", ru: "время в прошлом + bekommen im Präteritum + вещь + Partizip II = тебе дарили" }
  },
  {
    verb: "bekommen", form: "Präsens", job: "catch",
    situation: { en: "You're watching a horror film alone at night.", ru: "Ты одна ночью смотришь фильм ужасов." },
    sentence: "Ich ___ langsam Angst.", answer: "bekomme", also: ["kriege"], marks: ["langsam", "Angst"],
    rule: { en: "bekommen im Präsens + noun (a feeling) = start to feel", ru: "bekommen im Präsens + существительное (чувство) = начать чувствовать" }
  },
  {
    verb: "bekommen", form: "Partizip II", job: "happen",
    situation: { en: "Call your boss and explain why you won't come in today.", ru: "Позвони начальнику и объясни, почему не придёшь сегодня." },
    sentence: "Nach dem Regen habe ich eine Erkältung ___.", answer: "bekommen", also: ["gekriegt"], marks: ["habe", "eine Erkältung"],
    rule: { en: "haben im Präsens + illness + Partizip II von bekommen = got ill", ru: "haben im Präsens + болезнь + Partizip II von bekommen = заболела" }
  },
  {
    verb: "bekommen", form: "Präsens", job: "catch",
    situation: { en: "The neighbours are baking pizza. Complain.", ru: "Соседи пекут пиццу. Пожалуйся." },
    sentence: "Von dem Pizzaduft ___ ich sofort Hunger.", answer: "bekomme", also: ["kriege"], marks: ["Von dem Pizzaduft", "sofort"],
    rule: { en: "bekommen im Präsens + noun (a feeling) = start to feel", ru: "bekommen im Präsens + существительное (чувство) = начать чувствовать" }
  },
  {
    verb: "bekommen", form: "Partizip II", job: "baby",
    situation: { en: "A friend asks why you look so tired. Blame the neighbours.", ru: "Друг спрашивает, почему у тебя такой уставший вид. Вали всё на соседей." },
    sentence: "Meine Nachbarn haben letzten Monat ein Baby ___.", answer: "bekommen", also: ["gekriegt"], marks: ["haben", "ein Baby"],
    rule: { en: "haben im Präsens + ein Baby + Partizip II von bekommen = had a baby", ru: "haben im Präsens + ein Baby + Partizip II von bekommen = родили ребёнка" }
  },
  {
    verb: "bekommen", form: "Präsens", person: "wir", job: "catchTrain",
    situation: { en: "You and your friend are late. Hurry her up.", ru: "Вы с подругой опаздываете. Поторопи её." },
    sentence: "Beeil dich, sonst ___ wir den Zug nicht mehr!", answer: "bekommen", also: ["kriegen", "erreichen", "schaffen"], marks: ["den Zug"],
    rule: { en: "bekommen im Präsens + den Zug = catch the train", ru: "bekommen im Präsens + den Zug = успеть на поезд" }
  },
  {
    verb: "bekommen", form: "Präteritum", person: "er/sie/es", job: "receive",
    situation: { en: "Write it like in a book: why does your sister suddenly have a dog?", ru: "Напиши как в рассказе: откуда у сестры вдруг собака?" },
    sentence: "Letztes Jahr ___ sie zum Geburtstag einen Hund.", answer: "bekam", also: ["kriegte"], marks: ["Letztes Jahr"],
    rule: { en: "the past in a story + bekommen im Präteritum + thing = got, received", ru: "прошлое в рассказе + bekommen im Präteritum + вещь = получила" }
  },
  {
    verb: "bekommen", form: "Partizip II", job: "getDone",
    situation: { en: "The meeting starts in five minutes. Ask your colleague if they got the link.", ru: "Встреча через пять минут. Спроси коллегу, прислали ли ему ссылку." },
    sentence: "Hast du den Link schon geschickt ___?", answer: "bekommen", also: ["gekriegt"], marks: ["Hast", "geschickt"],
    rule: { en: "person + haben im Präsens + thing + Partizip II + Partizip II von bekommen = given / sent to you", ru: "человек + haben im Präsens + вещь + Partizip II + Partizip II von bekommen = тебе подарили / прислали" },
    tip: { blocks: [["haben", "plain"], [{ en: "object", ru: "кого / что" }, "plain"], ["Partizip II", "part"], ["bekommen", "verb"]], means: { en: "was sent to you", ru: "тебе прислали" } }
  }
];

/* What a verb does — de: progress item label after the verb („werden · Passiv“, like „müssen · Präteritum“ in
   Modalverben); en / ru: the row on the summary screen. */
window.VV_JOBS = {
  become: { de: "Veränderung", en: "become", ru: "становиться" },
  future: { de: "Futur", en: "future", ru: "будущее" },
  guess: { de: "Vermutung", en: "a guess", ru: "предположение" },
  passive: { de: "Passiv", en: "passive", ru: "пассив" },
  wuerde: { de: "würde", en: "would", ru: "бы" },
  leave: { de: "zurücklassen", en: "leave something", ru: "оставить" },
  haveDone: { de: "machen lassen", en: "have someone do it", ru: "поручить сделать" },
  allow: { de: "erlauben", en: "let someone", ru: "позволить" },
  letsGo: { de: "lass uns", en: "let's", ru: "давай" },
  stop: { de: "Lass das!", en: "stop it", ru: "прекрати" },
  happen: { de: "Erkältung bekommen", en: "get (an illness, pain)", ru: "получить (простуду, боль)" },
  baby: { de: "ein Kind bekommen", en: "have a baby", ru: "родить ребёнка" },
  catchTrain: { de: "den Zug bekommen", en: "catch (a train)", ru: "успеть (на поезд)" },
  feel: { de: "Angst haben", en: "feel (already)", ru: "испытывать (чувство)" },
  canBeDone: { de: "machbar", en: "can be done", ru: "можно сделать" },
  state: { de: "Zustand", en: "a state", ru: "состояние" },
  pastHelper: { de: "Perfekt", en: "Perfekt helper", ru: "вспомогательный в Perfekt" },
  mustDo: { de: "zu tun haben", en: "have to", ru: "нужно" },
  phrase: { de: "feste Ausdrücke", en: "fixed phrases", ru: "устойчивые выражения" },
  receive: { de: "erhalten", en: "get, receive", ru: "получать" },
  getDone: { de: "geschenkt bekommen", en: "given to you", ru: "тебе подарили / прислали" },
  catch: { de: "Angst bekommen", en: "start to feel", ru: "начать чувствовать" }
};

/* What each form name means, shown after it in brackets: „Präteritum (прошлое)“ — under the answer and in the yellow
   rows. Names the form, not the moment: Präsens is also the Perfekt helper (*bin gegangen*) and the future
   (*werde anrufen*), so „настоящее время“, not „сейчас“. */
window.VV_FORM_MEANINGS = {
  Präsens: { en: "present tense", ru: "настоящее время" },
  Präteritum: { en: "past", ru: "прошлое" },
  "Partizip II": { en: "for Perfekt and passive", ru: "для Perfekt и пассива" },
  "Konjunktiv II": { en: "would", ru: "бы" },
  Infinitiv: { en: "basic form", ru: "начальная форма" },
  Imperativ: { en: "request, command", ru: "просьба, приказ" }
};

/* All forms of the five verbs, to name what was typed („yours“ row). Several labels: „ · “. */
window.VV_FORMS = {
  werden: {
    werde: "Präsens (ich)", wirst: "Präsens (du)", wird: "Präsens (er, sie, es)", werden: "Infinitiv · Präsens (wir, sie)", werdet: "Präsens (ihr)",
    wurde: "Präteritum (ich, er)", wurdest: "Präteritum (du)", wurden: "Präteritum (wir, sie)", wurdet: "Präteritum (ihr)",
    geworden: "Partizip II", worden: "Partizip II (Passiv)",
    würde: "Konjunktiv II (ich, er)", würdest: "Konjunktiv II (du)", würden: "Konjunktiv II (wir, sie)", würdet: "Konjunktiv II (ihr)"
  },
  lassen: {
    lasse: "Präsens (ich)", lässt: "Präsens (du, er, sie, es)", lasst: "Imperativ (ihr) · Präsens (ihr)", lassen: "Infinitiv · Präsens (wir, sie)",
    ließ: "Präteritum (ich, er)", ließt: "Präteritum (ihr)", ließen: "Präteritum (wir, sie)", gelassen: "Partizip II",
    lass: "Imperativ (du)", ließe: "Konjunktiv II"
  },
  sein: {
    bin: "Präsens (ich)", bist: "Präsens (du)", ist: "Präsens (er, sie, es)", sind: "Präsens (wir, sie)", seid: "Präsens (ihr)",
    war: "Präteritum (ich, er)", warst: "Präteritum (du)", waren: "Präteritum (wir, sie)", wart: "Präteritum (ihr)",
    gewesen: "Partizip II", wäre: "Konjunktiv II"
  },
  haben: {
    habe: "Präsens (ich)", hast: "Präsens (du)", hat: "Präsens (er, sie, es)", haben: "Infinitiv · Präsens (wir, sie)", habt: "Präsens (ihr)",
    hatte: "Präteritum (ich, er)", hattest: "Präteritum (du)", hatten: "Präteritum (wir, sie)", hattet: "Präteritum (ihr)",
    gehabt: "Partizip II", hätte: "Konjunktiv II"
  },
  bekommen: {
    bekomme: "Präsens (ich)", bekommst: "Präsens (du)", bekommt: "Präsens (er, sie, es)", bekommen: "Partizip II · Infinitiv · Präsens (wir, sie)",
    bekam: "Präteritum (ich, er)", bekamst: "Präteritum (du)", bekamen: "Präteritum (wir, sie)", bekamt: "Präteritum (ihr)", bekäme: "Konjunktiv II",
    kriege: "Präsens (ich)", kriegst: "Präsens (du)", kriegt: "Präsens (er, sie, es)", kriegen: "Infinitiv · Präsens (wir, sie)", gekriegt: "Partizip II"
  }
};

/* Same form name, different use: the rows show the use + a tiny example instead of the form name. */
window.VV_USE_PAIRS = {
  "geworden|worden": {
    geworden: { en: "became", ru: "стал(а)" },
    worden: { en: "passive", ru: "пассив" }
  },
  // no rows here: three lines with the rule (only in the Perfekt sentences — in Präsens „lassen“ is just a person form)
  "gelassen|lassen": {
    forms: ["Partizip II", "Infinitiv"],
    lines: [
      { en: "In the past:", ru: "В прошлом:" },
      { en: "haben + gelassen", ru: "haben + gelassen" },
      { en: "haben + infinitive + lassen", ru: "haben + Infinitiv + lassen" }
    ]
  }
};

/* Wrong verb: a contrast, one line per verb (*italic*, **bold**). Key „needed>typed“; only = jobs where the contrast fits.
   A key may hold a list of entries (different jobs, different contrast): the first that fits the job is used.
   Any other wrong verb (e.g. werden in „es eilig haben“) gets no box: the rule line is enough. */
(function () {
  const L = {
    lassen: { en: "subject + object → lassen — *Ich lasse das Auto reparieren.*", ru: "подлежащее + дополнение → lassen — *Ich lasse das Auto reparieren.*" },
    werdenPass: { en: "only a subject → werden — *Das Auto wird repariert.*", ru: "только подлежащее → werden — *Das Auto wird repariert.*" },
    seinZu: { en: "sein + **zu** + infinitive", ru: "sein + **zu** + Infinitiv" },
    sich: { en: "lassen + **sich** + infinitive", ru: "lassen + **sich** + Infinitiv" },
    wird: { en: "werden = the action: what happens / happened", ru: "werden = действие: что происходит / произошло" },
    ist: { en: "sein = the result: how it is / was at that moment", ru: "sein = результат: как всё есть / было в тот момент" },
    bekNoun: { en: "bekommen + noun — *Angst bekommen*", ru: "bekommen + существительное — *Angst bekommen*" },
    werdenAdj: { en: "werden + adjective — *nervös werden*", ru: "werden + прилагательное — *nervös werden*" },
    angstBek: { en: "bekommen + a feeling = start to feel", ru: "bekommen + чувство = начать чувствовать" },
    angstHab: { en: "haben + a feeling = already feel it", ru: "haben + чувство = уже чувствовать" },
    bek: { en: "bekommen = get, receive", ru: "bekommen = получать" },
    wer: { en: "werden = become", ru: "werden = становиться" },
    werdenBec: { en: "werden = a change — *wird Arzt, wurden müde*", ru: "werden = изменение — *wird Arzt, wurden müde*" },
    seinState: { en: "sein = a state — *ist Arzt, waren müde*", ru: "sein = состояние — *ist Arzt, waren müde*" },
    seinPerf: { en: "sein: movement, change + *sein, bleiben, passieren*", ru: "sein: движение, изменение + *sein, bleiben, passieren*" },
    seinZuCan: { en: "sein + zu = can be done — *ist zu lesen*", ru: "sein + zu = можно сделать — *ist zu lesen*" },
    habenZuMust: { en: "haben + zu = must, have to — *hat zu tun*", ru: "haben + zu = нужно, надо — *hat zu tun*" },
    lassArr: { en: "lassen = you arrange it yourself", ru: "lassen = ты сам(а) это устраиваешь" },
    bekGet: { en: "bekommen = it's given to you, you just receive it", ru: "bekommen = тебе это дают, ты только получаешь" },
    habenPerf: { en: "haben: most verbs", ru: "haben: большинство глаголов" }
  };
  /* A typed word that is none of the five verbs, but a known trap: key = the typed word (lower case). */
  const WANT = {
    only: ["future", "guess"],
    lines: [
      { en: "*will* = want (wollen)", ru: "*will* = хочу (wollen)" },
      { en: "werden = will (future)", ru: "werden = будущее время" }
    ]
  };
  const LASSTE = {
    verb: "lassen", forms: ["Präteritum"],
    lines: [{ en: "lassen is irregular: *ließ*, not *lasste*", ru: "lassen — неправильный глагол: *ließ*, не *lasste*" }]
  };
  const GEBEKOMMEN = {
    verb: "bekommen", forms: ["Partizip II"],
    lines: [{ en: "bekommen has no ge-: *habe … bekommen*", ru: "у bekommen нет ge-: *habe … bekommen*" }]
  };
  // only = jobs · verb / forms = only in sentences with that verb / form
  window.VV_OTHER_WORDS = { will: WANT, willst: WANT, wollen: WANT, wollt: WANT, lasste: LASSTE, lasstest: LASSTE, lassten: LASSTE, lasstet: LASSTE, gebekommen: GEBEKOMMEN };
  /* A right answer in another word („also“ in the sentence): one line in the yellow box after Prüfen. */
  const KRIEGEN = { en: "*kriegen* = spoken *bekommen*. Right! In writing: *bekommen*.", ru: "*kriegen* — разговорный вариант *bekommen*. Верно! Письменно — *bekommen*." };
  const ERHALTEN = { en: "*erhalten* = formal *bekommen*. Right! In everyday speech: *bekommen*.", ru: "*erhalten* — официальный вариант *bekommen*. Верно! В обычной речи — *bekommen*." };
  const GELASSEN = { en: "*liegen gelassen* is right too! More common: *liegen lassen*.", ru: "*liegen gelassen* — тоже верно! Но чаще: *liegen lassen*." };
  const TRAIN = { en: "*erreichen* / *schaffen* work too! Here we practise *bekommen*.", ru: "*erreichen* / *schaffen* — тоже верно! Здесь тренируем *bekommen*." };
  window.VV_ALSO_NOTES = {
    kriege: KRIEGEN, kriegst: KRIEGEN, kriegt: KRIEGEN, kriegen: KRIEGEN, gekriegt: KRIEGEN, kriegte: KRIEGEN,
    erhalte: ERHALTEN, erhalten: ERHALTEN,
    erreichen: TRAIN, schaffen: TRAIN,
    gelassen: GELASSEN // only accepted in „liegen ___“
  };
  /* Past tense, the right verb in the wrong past form (wurde ↔ worden, bekam ↔ bekommen, ließ ↔ gelassen): under the
     „yours / needed“ rows, where each past form is used — speaking: Perfekt, writing: Präteritum. Only where that is
     true: sentences of this verb + job whose answer is a Präteritum or Partizip II (not werden = become, sein, haben:
     their Präteritum is normal when speaking too), and only when the typed word is a Präteritum or Partizip II.
     skip = typed words that are another mix-up, not the tense (geworden: the geworden / worden pair). */
  window.VV_PAST_NOTES = [
    {
      verb: "werden", only: ["passive"], forms: ["Präteritum", "Partizip II"], skip: ["geworden"],
      lines: [
        { en: "Past tense, passive:", ru: "Прошлое в пассиве:" },
        { en: "speaking: sein + Partizip II + *worden* (Perfekt)", ru: "в разговоре: sein + Partizip II + *worden* (Perfekt)" },
        { en: "writing: *wurde* + Partizip II (Präteritum)", ru: "в тексте: *wurde* + Partizip II (Präteritum)" }
      ]
    },
    {
      verb: "bekommen", forms: ["Präteritum", "Partizip II"],
      lines: [
        { en: "Past tense:", ru: "Прошлое:" },
        { en: "speaking: haben + *bekommen* (Perfekt)", ru: "в разговоре: haben + *bekommen* (Perfekt)" },
        { en: "writing: *bekam* (Präteritum)", ru: "в тексте: *bekam* (Präteritum)" }
      ]
    },
    {
      verb: "lassen", only: ["leave"], forms: ["Präteritum", "Partizip II"],
      lines: [
        { en: "Past tense:", ru: "Прошлое:" },
        { en: "speaking: haben + *gelassen* (Perfekt)", ru: "в разговоре: haben + *gelassen* (Perfekt)" },
        { en: "writing: *ließ* (Präteritum)", ru: "в тексте: *ließ* (Präteritum)" }
      ]
    }
  ];
  window.VV_HINTS = {
    "lassen>werden": {
      only: ["haveDone"],
      lines: [
        { en: "werden + infinitive = you'll do it yourself", ru: "werden + Infinitiv = сделаешь сам(а)" },
        { en: "lassen + infinitive = someone else does it", ru: "lassen + Infinitiv = сделает кто-то другой" }
      ]
    },
    "werden>lassen": { only: ["passive"], lines: [L.werdenPass, L.lassen] },
    "sein>lassen": { only: ["canBeDone"], lines: [L.seinZu, L.sich] },
    "lassen>sein": { only: ["canBeDone"], lines: [L.sich, L.seinZu] },
    "werden>sein": [
      { only: ["passive"], lines: [L.wird, L.ist] },
      { only: ["become"], lines: [L.werdenBec, L.seinState] }
    ],
    "sein>werden": { only: ["state"], lines: [L.ist, L.wird] },
    "werden>bekommen": { only: ["become"], lines: [L.wer, L.bek] },
    "bekommen>werden": { only: ["catch"], lines: [L.bekNoun, L.werdenAdj] },
    "haben>bekommen": { only: ["feel"], lines: [L.angstHab, L.angstBek] },
    "bekommen>haben": { only: ["catch"], lines: [L.angstBek, L.angstHab] },
    "lassen>bekommen": { only: ["haveDone"], lines: [L.lassArr, L.bekGet] },
    "bekommen>lassen": { only: ["getDone"], lines: [L.bekGet, L.lassArr] },
    "lassen>haben": { only: ["haveDone"], lines: [{ en: "*have* something done = **lassen**, not haben", ru: "англ. *have* something done = **lassen**, не haben" }] },
    "sein>haben": [
      { only: ["pastHelper"], lines: [L.seinPerf, L.habenPerf] },
      { only: ["canBeDone"], lines: [L.seinZuCan, L.habenZuMust] }
    ],
    "haben>sein": [
      { only: ["pastHelper"], lines: [L.habenPerf, L.seinPerf] },
      { only: ["mustDo"], lines: [L.habenZuMust, L.seinZuCan] }
    ]
  };
})();
