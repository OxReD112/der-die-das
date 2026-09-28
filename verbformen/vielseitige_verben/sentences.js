// Vielseitige Verben — the sentences of the exercise (werden, lassen, sein, haben, bekommen) and the texts
// of the answer. Explanations are in the user's language ({ en, ru }, picked by DeutschTranslation);
// sentences, forms and examples stay German.
//
// Sentence fields:
//   verb      infinitive (not shown during the question: choosing the verb is part of the task)
//   form      the verb form as a verb table names it: Präsens, Präteritum, Partizip II, Infinitiv, Imperativ, Konjunktiv II
//   job       what the verb does in this sentence (key of VV_JOBS) — progress item = verb + job
//   situation { en, ru } what the sentence should say
//   sentence  with „___“ for the gap
//   answer    main answer · also: other accepted answers
//   marks     clue words, marked in the sentence after Prüfen: only what decides the verb or the form
//             (e.g. letzte Woche when nothing else in the sentence says „past“)
//   rule      { en, ru } the construction, named as building blocks (not the words of the sentence): helper and main
//             verbs by their form („werden im Präteritum“, „Partizip II von lassen“), as textbooks say it
// Each sentence's difficulty is stored under verb|sentence, so a sentence changed here starts again at 1.

window.VV_SENTENCES = [
  // ---- werden ----
  {
    verb: "werden", form: "Präsens", job: "become",
    situation: { en: "It's 5 pm in November. You look out of the window.", ru: "Ноябрь, пять вечера. Ты смотришь в окно." },
    sentence: "Es ___ schon dunkel.", answer: "wird", marks: ["dunkel"],
    rule: { en: "werden im Präsens + adjective = become, get", ru: "werden im Präsens + прилагательное = становиться" }
  },
  {
    verb: "werden", form: "Präteritum", job: "become",
    situation: { en: "Tell his story: he studied medicine and finished in 2015.", ru: "Расскажи его историю: он учился на врача и закончил в 2015." },
    sentence: "2015 ___ er Arzt.", answer: "wurde", marks: ["2015", "Arzt"],
    rule: { en: "a year in the past + werden im Präteritum + noun = became", ru: "год в прошлом + werden im Präteritum + существительное = стал" }
  },
  {
    verb: "werden", form: "Partizip II", job: "become",
    situation: { en: "Your sister finished her studies. Now she's a teacher. Tell a friend.", ru: "Твоя сестра закончила учёбу, теперь она учительница. Расскажи подруге." },
    sentence: "Meine Schwester ist Lehrerin ___.", answer: "geworden", marks: ["ist"],
    rule: { en: "sein im Präsens + Partizip II von werden, no second verb = became", ru: "sein im Präsens + Partizip II von werden, без второго глагола = стала" }
  },
  {
    verb: "werden", form: "Partizip II", job: "passive",
    situation: { en: "Your bike isn't where you left it. Someone took it.", ru: "Твоего велосипеда нет там, где ты его оставила. Кто-то его взял." },
    sentence: "Mein Fahrrad ist gestohlen ___.", answer: "worden", marks: ["ist", "gestohlen"],
    rule: { en: "thing + sein im Präsens + Partizip II + worden = Passiv, it has been done", ru: "вещь + sein im Präsens + Partizip II + worden = Passiv, это уже сделали" }
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
    verb: "werden", form: "Präsens", job: "passive",
    situation: { en: "You're in a shop. Right now, as you watch, the owner is locking the door.", ru: "Ты в магазине. Прямо сейчас у тебя на глазах хозяин запирает дверь." },
    sentence: "Die Tür ___ gerade abgeschlossen.", answer: "wird", marks: ["gerade", "abgeschlossen"],
    rule: { en: "thing + werden im Präsens + Partizip II = Passiv, it's being done right now", ru: "вещь + werden im Präsens + Partizip II = Passiv, это делают прямо сейчас" }
  },
  {
    verb: "werden", form: "Präteritum", job: "passive",
    situation: { en: "A history fact: the Berlin Wall, 1961.", ru: "Исторический факт: Берлинская стена, 1961 год." },
    sentence: "Die Mauer ___ 1961 gebaut.", answer: "wurde", marks: ["1961", "gebaut"],
    rule: { en: "time in the past + werden im Präteritum + Partizip II = Passiv, it was done", ru: "время в прошлом + werden im Präteritum + Partizip II = Passiv, это сделали" }
  },
  {
    verb: "werden", form: "Präteritum", job: "passive",
    situation: { en: "Talk about your kitchen: workers renovated it last week.", ru: "Расскажи о кухне: на прошлой неделе там сделали ремонт." },
    sentence: "Die Küche ___ letzte Woche renoviert.", answer: "wurde", marks: ["letzte Woche", "renoviert"],
    rule: { en: "time in the past + werden im Präteritum + Partizip II = Passiv, it was done", ru: "время в прошлом + werden im Präteritum + Partizip II = Passiv, это сделали" }
  },
  {
    verb: "werden", form: "Präsens", job: "passive",
    situation: { en: "The mechanic is working on your car right now. Talk about the car.", ru: "Механик прямо сейчас чинит твою машину. Скажи про машину." },
    sentence: "Mein Auto ___ gerade repariert.", answer: "wird", marks: ["Mein Auto", "gerade", "repariert"],
    rule: { en: "thing + werden im Präsens + Partizip II = Passiv, it's being done right now", ru: "вещь + werden im Präsens + Partizip II = Passiv, это делают прямо сейчас" }
  },
  {
    verb: "werden", form: "Partizip II", job: "passive",
    situation: { en: "Your car is back from the garage. Talk about the car.", ru: "Машина вернулась из автосервиса. Скажи про машину." },
    sentence: "Mein Auto ist gestern repariert ___.", answer: "worden", marks: ["Mein Auto", "ist", "repariert"],
    rule: { en: "thing + sein im Präsens + Partizip II + worden = Passiv, it has been done", ru: "вещь + sein im Präsens + Partizip II + worden = Passiv, это уже сделали" }
  },
  {
    verb: "werden", form: "Konjunktiv II", job: "wuerde",
    situation: { en: "Ask a stranger politely for help.", ru: "Вежливо попроси незнакомого человека о помощи." },
    sentence: "___ Sie mir bitte helfen?", answer: "Würden", marks: ["bitte", "helfen"],
    rule: { en: "werden im Konjunktiv II + infinitive = would (a polite request)", ru: "werden im Konjunktiv II + Infinitiv = бы (вежливая просьба)" }
  },
  {
    verb: "werden", form: "Konjunktiv II", job: "wuerde",
    situation: { en: "Daydream: if you had more money…", ru: "Помечтай: если бы у тебя было больше денег…" },
    sentence: "Ich ___ mehr reisen, wenn ich mehr Geld hätte.", answer: "würde", marks: ["reisen", "hätte"],
    rule: { en: "werden im Konjunktiv II + infinitive = would (not real)", ru: "werden im Konjunktiv II + Infinitiv = бы (нереально)" }
  },
  {
    verb: "werden", form: "Präsens", job: "become",
    situation: { en: "The exam starts in ten minutes. Your hands are getting cold.", ru: "Экзамен через десять минут. Руки холодеют." },
    sentence: "Ich ___ langsam nervös.", answer: "werde", marks: ["nervös"],
    rule: { en: "werden im Präsens + adjective = become, get", ru: "werden im Präsens + прилагательное = становиться" }
  },

  // ---- lassen ----
  {
    verb: "lassen", form: "Präsens", job: "leave",
    situation: { en: "The sky is clear. You're not taking the umbrella today. Say so.", ru: "Небо ясное. Зонт ты сегодня не берёшь. Скажи об этом." },
    sentence: "Ich ___ den Schirm heute zu Hause.", answer: "lasse", marks: ["zu Hause"],
    rule: { en: "lassen im Präsens + thing + place, no second verb = leave", ru: "lassen im Präsens + вещь + место, без второго глагола = оставить" }
  },
  {
    verb: "lassen", form: "Partizip II", job: "leave",
    situation: { en: "You're at work and your phone isn't in your bag.", ru: "Ты на работе, а телефона в сумке нет." },
    sentence: "Ich habe mein Handy zu Hause ___.", answer: "gelassen", marks: ["habe", "zu Hause"],
    rule: { en: "haben im Präsens + Partizip II von lassen, no second verb = left", ru: "haben im Präsens + Partizip II von lassen, без второго глагола = оставила" }
  },
  {
    verb: "lassen", form: "Infinitiv", job: "haveDone",
    situation: { en: "Your car broke down last week. A mechanic fixed it. Tell your friend.", ru: "На прошлой неделе сломалась машина. Её починил механик. Расскажи подруге." },
    sentence: "Ich habe mein Auto reparieren ___.", answer: "lassen", marks: ["Ich", "habe", "reparieren"],
    rule: { en: "person + haben im Präsens + thing + infinitive + lassen im Infinitiv = had it done", ru: "человек + haben im Präsens + вещь + Infinitiv + lassen im Infinitiv = поручила сделать" }
  },
  {
    verb: "lassen", form: "Präsens", job: "haveDone",
    situation: { en: "You don't cut your own hair. What are you doing on Saturday?", ru: "Ты не стрижёшь себя сама. Что ты делаешь в субботу?" },
    sentence: "Am Samstag ___ ich mir die Haare schneiden.", answer: "lasse", marks: ["ich", "schneiden"],
    rule: { en: "person + lassen im Präsens + thing + infinitive = have someone do it", ru: "человек + lassen im Präsens + вещь + Infinitiv = поручить кому-то" }
  },
  {
    verb: "lassen", form: "Präsens", job: "haveDone",
    situation: { en: "Your laptop is broken. Tomorrow you're taking it to a repair shop.", ru: "Ноутбук сломался. Завтра ты несёшь его в ремонт." },
    sentence: "Morgen ___ ich meinen Laptop reparieren.", answer: "lasse", marks: ["ich", "reparieren"],
    rule: { en: "person + lassen im Präsens + thing + infinitive = have someone do it", ru: "человек + lassen im Präsens + вещь + Infinitiv = поручить кому-то" }
  },
  {
    verb: "lassen", form: "Infinitiv", job: "haveDone",
    situation: { en: "Your friend notices your new haircut. You went to the hairdresser.", ru: "Подруга заметила новую стрижку. Ты ходила к парикмахеру." },
    sentence: "Ich habe mir die Haare schneiden ___.", answer: "lassen", marks: ["Ich", "habe", "schneiden"],
    rule: { en: "person + haben im Präsens + thing + infinitive + lassen im Infinitiv = had it done", ru: "человек + haben im Präsens + вещь + Infinitiv + lassen im Infinitiv = поручила сделать" }
  },
  {
    verb: "lassen", form: "Imperativ (du)", job: "allow",
    situation: { en: "Your friend keeps waking you up. Ask her to let you sleep.", ru: "Подруга всё время тебя будит. Попроси дать тебе поспать." },
    sentence: "___ mich doch schlafen!", answer: "Lass", marks: ["mich", "schlafen"],
    rule: { en: "lassen im Imperativ + person + infinitive = let someone do it", ru: "lassen im Imperativ + кто-то + Infinitiv = дай кому-то сделать" }
  },
  {
    verb: "lassen", form: "Imperativ (du)", job: "letsGo",
    situation: { en: "Suggest to your friend (one person) that you go for a walk.", ru: "Предложи подруге (одной) пойти погулять." },
    sentence: "___ uns spazieren gehen!", answer: "Lass", marks: ["uns"],
    rule: { en: "lassen im Imperativ (du) + uns + infinitive = let's (to one person)", ru: "lassen im Imperativ (du) + uns + Infinitiv = давай (одному)" }
  },
  {
    verb: "lassen", form: "Imperativ (ihr)", job: "letsGo",
    situation: { en: "Suggest to two friends at once: let's start.", ru: "Предложи двум друзьям сразу: давайте начнём." },
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
    verb: "lassen", form: "Präsens", job: "canBeDone",
    situation: { en: "A friend asks if her broken lamp can be fixed. You say: yes, it can.", ru: "Подруга спрашивает, можно ли починить её лампу. Ты отвечаешь: да, можно." },
    sentence: "Die Lampe ___ sich reparieren.", answer: "lässt", marks: ["sich", "reparieren"],
    rule: { en: "thing + lassen im Präsens + sich + infinitive = can be done", ru: "вещь + lassen im Präsens + sich + Infinitiv = можно сделать" }
  },
  {
    verb: "lassen", form: "Präteritum", job: "leave",
    situation: { en: "Write it like a story: last night you left the window open the whole night.", ru: "Напиши как в рассказе: вчера ты оставила окно открытым на всю ночь." },
    sentence: "Gestern ___ ich das Fenster die ganze Nacht offen.", answer: "ließ", also: ["liess"], marks: ["Gestern", "offen"],
    rule: { en: "the past in a story + lassen im Präteritum + thing + adjective = leave (open)", ru: "прошлое в рассказе + lassen im Präteritum + вещь + прилагательное = оставить (открытым)" }
  },

  // ---- sein ----
  {
    verb: "sein", form: "Präsens", job: "state",
    situation: { en: "You arrive at the shop and try the door. Too late, it's locked.", ru: "Ты подходишь к магазину и дёргаешь дверь. Поздно, заперто." },
    sentence: "Die Tür ___ schon abgeschlossen.", answer: "ist", marks: ["schon", "abgeschlossen"],
    rule: { en: "thing + sein im Präsens + Partizip II = already done, a state", ru: "вещь + sein im Präsens + Partizip II = уже сделано, состояние" }
  },
  {
    verb: "sein", form: "Präsens", job: "canBeDone",
    situation: { en: "Your friend is worried about the exam. You think it's doable.", ru: "Подруга переживает из-за экзамена. Ты считаешь, что он вполне посильный." },
    sentence: "Die Prüfung ___ gut zu schaffen.", answer: "ist", marks: ["zu schaffen"],
    rule: { en: "thing + sein im Präsens + zu + infinitive = can be done", ru: "вещь + sein im Präsens + zu + Infinitiv = можно сделать" }
  },
  {
    verb: "sein", form: "Präsens", job: "pastHelper",
    situation: { en: "Tell what you did yesterday evening: cinema.", ru: "Расскажи, что ты делала вчера вечером: кино." },
    sentence: "Gestern ___ ich ins Kino gegangen.", answer: "bin", marks: ["ins Kino", "gegangen"],
    rule: { en: "going from A to B → sein im Präsens + Partizip II = Perfekt", ru: "движение из А в Б → sein im Präsens + Partizip II = Perfekt" }
  },
  {
    verb: "sein", form: "Präteritum", job: "state",
    situation: { en: "You went to the museum yesterday. Closed.", ru: "Вчера ты пошла в музей. Закрыто." },
    sentence: "Das Museum ___ gestern geschlossen.", answer: "war", marks: ["gestern", "geschlossen"],
    rule: { en: "thing + sein im Präteritum + Partizip II = a state in the past", ru: "вещь + sein im Präteritum + Partizip II = состояние в прошлом" }
  },

  // ---- haben ----
  {
    verb: "haben", form: "Präsens", job: "pastHelper",
    situation: { en: "Say what you had for lunch: pizza.", ru: "Скажи, что ты ела на обед: пиццу." },
    sentence: "Ich ___ Pizza gegessen.", answer: "habe", marks: ["gegessen"],
    rule: { en: "haben im Präsens + Partizip II = Perfekt", ru: "haben im Präsens + Partizip II = Perfekt" }
  },
  {
    verb: "haben", form: "Präsens", job: "mustDo",
    situation: { en: "Friends invite you out tonight, but there's still a lot of work waiting.", ru: "Друзья зовут тебя вечером, но ещё много работы." },
    sentence: "Tut mir leid, ich ___ noch viel zu tun.", answer: "habe", marks: ["zu tun"],
    rule: { en: "haben im Präsens + zu + infinitive = have to", ru: "haben im Präsens + zu + Infinitiv = нужно" }
  },
  {
    verb: "haben", form: "Präteritum", job: "mustDo",
    situation: { en: "Explain why you didn't come yesterday.", ru: "Объясни, почему ты вчера не пришла." },
    sentence: "Ich ___ gestern so viel zu tun.", answer: "hatte", marks: ["gestern", "zu tun"],
    rule: { en: "time in the past + haben im Präteritum + zu + infinitive = had to", ru: "время в прошлом + haben im Präteritum + zu + Infinitiv = нужно было" }
  },
  {
    verb: "haben", form: "Präsens", job: "phrase",
    situation: { en: "Your friend said the train leaves at 8. You checked, she's right.", ru: "Подруга сказала, что поезд в 8. Ты проверила — она права." },
    sentence: "Du ___ recht.", answer: "hast", marks: ["recht"],
    rule: { en: "recht haben = to be right (fixed phrase)", ru: "recht haben = быть правым (устойчивое выражение)" }
  },
  {
    verb: "haben", form: "Präsens", job: "phrase",
    situation: { en: "Someone starts chatting to you, but you need to catch your bus.", ru: "С тобой заговорили, а тебе надо успеть на автобус." },
    sentence: "Entschuldigung, ich ___ es eilig.", answer: "habe", marks: ["es eilig"],
    rule: { en: "es eilig haben = to be in a hurry (fixed phrase)", ru: "es eilig haben = торопиться (устойчивое выражение)" }
  },

  // ---- bekommen ----
  {
    verb: "bekommen", form: "Partizip II", job: "receive",
    situation: { en: "Tell what came in the mail today: a letter from your mum.", ru: "Расскажи, что пришло сегодня по почте: письмо от мамы." },
    sentence: "Ich habe heute einen Brief von Mama ___.", answer: "bekommen", also: ["gekriegt", "erhalten"], marks: ["habe"],
    rule: { en: "haben im Präsens + thing + Partizip II von bekommen = got, received", ru: "haben im Präsens + вещь + Partizip II von bekommen = получила" }
  },
  {
    verb: "bekommen", form: "Präsens", job: "receive",
    situation: { en: "Order in a café.", ru: "Сделай заказ в кафе." },
    sentence: "Ich ___ einen Kaffee, bitte.", answer: "bekomme", also: ["hätte gern", "nehme"], marks: [],
    rule: { en: "bekommen im Präsens + thing = I'll have … (ordering)", ru: "bekommen im Präsens + вещь = мне, пожалуйста … (заказ)" }
  },
  {
    verb: "bekommen", form: "Partizip II", job: "getDone",
    situation: { en: "Your parents gave you a bike for your birthday. Tell it from your side.", ru: "Родители подарили тебе велосипед на день рождения. Расскажи со своей стороны." },
    sentence: "Ich habe ein Fahrrad geschenkt ___.", answer: "bekommen", also: ["gekriegt"], marks: ["habe", "geschenkt"],
    rule: { en: "person + haben im Präsens + thing + Partizip II + Partizip II von bekommen = someone did it for you", ru: "человек + haben im Präsens + вещь + Partizip II + Partizip II von bekommen = кто-то сделал это для тебя" }
  },
  {
    verb: "bekommen", form: "Präsens", job: "getDone",
    situation: { en: "Every year your grandma gets flowers from you. Say it from her side.", ru: "Каждый год бабушка получает от тебя цветы. Скажи с её стороны." },
    sentence: "Oma ___ jedes Jahr Blumen geschenkt.", answer: "bekommt", also: ["kriegt"], marks: ["geschenkt"],
    rule: { en: "person + bekommen im Präsens + thing + Partizip II = someone does it for them", ru: "человек + bekommen im Präsens + вещь + Partizip II = кто-то делает это для него" }
  },
  {
    verb: "bekommen", form: "Präsens", job: "catch",
    situation: { en: "You're watching a horror film alone at night.", ru: "Ты одна ночью смотришь фильм ужасов." },
    sentence: "Ich ___ langsam Angst.", answer: "bekomme", also: ["kriege"], marks: ["Angst"],
    rule: { en: "bekommen im Präsens + noun (a feeling) = start to feel", ru: "bekommen im Präsens + существительное (чувство) = начать чувствовать" }
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
  canBeDone: { de: "machbar", en: "can be done", ru: "можно сделать" },
  state: { de: "Zustand", en: "already done (state)", ru: "уже сделано (состояние)" },
  pastHelper: { de: "Perfekt", en: "Perfekt helper", ru: "вспомогательный в Perfekt" },
  mustDo: { de: "zu tun haben", en: "have to", ru: "нужно" },
  phrase: { de: "feste Ausdrücke", en: "fixed phrases", ru: "устойчивые выражения" },
  receive: { de: "erhalten", en: "get, receive", ru: "получать" },
  getDone: { de: "geschenkt bekommen", en: "someone does it for you", ru: "кто-то делает для тебя" },
  catch: { de: "Angst bekommen", en: "start to feel", ru: "начать чувствовать" }
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
    bekam: "Präteritum (ich, er)", bekamst: "Präteritum (du)", bekamen: "Präteritum (wir, sie)", bekäme: "Konjunktiv II",
    kriege: "Präsens (ich)", kriegst: "Präsens (du)", kriegt: "Präsens (er, sie, es)", gekriegt: "Partizip II"
  }
};

/* Same form name, different use: the rows show the use + a tiny example instead of the form name. */
window.VV_USE_PAIRS = {
  "geworden|worden": {
    geworden: { en: "became", ru: "стал(а)", ex: "ist Lehrerin geworden" },
    worden: { en: "passive", ru: "пассив", ex: "ist repariert worden" }
  },
  "gelassen|lassen": {
    gelassen: { en: "no second verb", ru: "без второго глагола", ex: "habe das Handy gelassen" },
    lassen: { en: "with a second verb", ru: "со вторым глаголом", ex: "habe das Auto reparieren lassen" }
  }
};

/* Wrong verb: a contrast, one line per verb. Key „needed>typed“; only = jobs where the contrast fits.
   Any other wrong verb (e.g. werden in „es eilig haben“) gets no box: the rule line is enough. */
(function () {
  const L = {
    lassen: { en: "lassen: person + thing + infinitive — *Ich lasse das Auto reparieren.*", ru: "lassen: человек + вещь + Infinitiv — *Ich lasse das Auto reparieren.*" },
    werdenPass: { en: "werden: thing + Partizip II — *Das Auto wird repariert.*", ru: "werden: вещь + Partizip II — *Das Auto wird repariert.*" },
    seinZu: { en: "sein: + zu + infinitive — *ist zu schaffen*", ru: "sein: + zu + Infinitiv — *ist zu schaffen*" },
    sich: { en: "lassen: + sich + infinitive, no zu — *lässt sich schaffen*", ru: "lassen: + sich + Infinitiv, без zu — *lässt sich schaffen*" },
    wird: { en: "werden + Partizip II = Passiv, being done — *Die Tür wird abgeschlossen.*", ru: "werden + Partizip II = Passiv, делают сейчас — *Die Tür wird abgeschlossen.*" },
    ist: { en: "sein + Partizip II = already done, a state — *Die Tür ist abgeschlossen.*", ru: "sein + Partizip II = уже сделано, состояние — *Die Tür ist abgeschlossen.*" },
    bekNoun: { en: "bekommen + noun — *Angst bekommen*", ru: "bekommen + существительное — *Angst bekommen*" },
    werdenAdj: { en: "werden + adjective — *nervös werden*", ru: "werden + прилагательное — *nervös werden*" },
    bek: { en: "bekommen = get, receive", ru: "bekommen = получать" },
    wer: { en: "werden = become", ru: "werden = становиться" },
    seinPerf: { en: "sein: going from A to B — *bin gegangen*", ru: "sein: движение из А в Б — *bin gegangen*" },
    habenPerf: { en: "haben: everything else — *habe gegessen*", ru: "haben: всё остальное — *habe gegessen*" }
  };
  window.VV_HINTS = {
    "lassen>werden": { only: ["haveDone"], lines: [L.lassen, L.werdenPass] },
    "werden>lassen": { only: ["passive"], lines: [L.werdenPass, L.lassen] },
    "sein>lassen": { only: ["canBeDone"], lines: [L.seinZu, L.sich] },
    "lassen>sein": { only: ["canBeDone"], lines: [L.sich, L.seinZu] },
    "werden>sein": { only: ["passive"], lines: [L.wird, L.ist] },
    "sein>werden": { only: ["state"], lines: [L.ist, L.wird] },
    "werden>bekommen": { only: ["become"], lines: [L.wer, L.bek] },
    "bekommen>werden": { only: ["catch"], lines: [L.bekNoun, L.werdenAdj] },
    "sein>haben": { only: ["pastHelper"], lines: [L.seinPerf, L.habenPerf] },
    "haben>sein": { only: ["pastHelper"], lines: [L.habenPerf, L.seinPerf] }
  };
})();
