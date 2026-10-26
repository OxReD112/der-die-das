/* Wortschatz cards. sentenceTranslation, translation (and grammar where it has Russian) are {ru, en},
   picked by the Translations setting (components/deutsch-translation-v1.js). */
window.WORDS = [
  {
    "id": 1,
    "sentence": "Ich gehe spazieren, {{c1::obwohl}} es regnet.",
    "blank": "Ich gehe spazieren, _____ es regnet.",
    "revealed": "Ich gehe spazieren, obwohl es regnet.",
    "sentenceTranslation": {
      "ru": "Я иду гулять, хотя идёт дождь.",
      "en": "I'm going for a walk although it's raining."
    },
    "grammar": {
      "ru": "obwohl + глагол в конце",
      "en": "obwohl + verb at the end"
    },
    "translation": {
      "ru": "хотя, несмотря на то что",
      "en": "although, even though"
    },
    "pos": "Konjunktion",
    "base": "obwohl",
    "target": "obwohl"
  },
  {
    "id": 2,
    "sentence": "Ich muss meine Fahrstunde {{c1::absagen}}.",
    "blank": "Ich muss meine Fahrstunde _____.",
    "revealed": "Ich muss meine Fahrstunde absagen.",
    "sentenceTranslation": {
      "ru": "Мне нужно отменить урок вождения.",
      "en": "I have to cancel my driving lesson."
    },
    "grammar": "absagen · sagte ab · hat abgesagt",
    "translation": {
      "ru": "отменять",
      "en": "to cancel"
    },
    "pos": "Verb",
    "base": "absagen",
    "target": "absagen"
  },
  {
    "id": 3,
    "sentence": "Was ist der {{c1::Grund}}?",
    "blank": "Was ist der _____?",
    "revealed": "Was ist der Grund?",
    "sentenceTranslation": {
      "ru": "В чём причина?",
      "en": "What's the reason?"
    },
    "grammar": "der Grund · die Gründe",
    "translation": {
      "ru": "причина, основание",
      "en": "reason, cause"
    },
    "pos": "Substantiv",
    "base": "der Grund",
    "target": "Grund"
  },
  {
    "id": 4,
    "sentence": "Das ist nicht {{c1::notwendig}}.",
    "blank": "Das ist nicht _____.",
    "revealed": "Das ist nicht notwendig.",
    "sentenceTranslation": {
      "ru": "Это не обязательно / не необходимо.",
      "en": "That isn't necessary."
    },
    "grammar": "",
    "translation": {
      "ru": "необходимый, нужный",
      "en": "necessary"
    },
    "pos": "Adjektiv",
    "base": "notwendig",
    "target": "notwendig"
  },
  {
    "id": 5,
    "sentence": "Es regnet. {{c1::Trotzdem}} gehe ich spazieren.",
    "blank": "Es regnet. _____ gehe ich spazieren.",
    "revealed": "Es regnet. Trotzdem gehe ich spazieren.",
    "sentenceTranslation": {
      "ru": "Идёт дождь. Несмотря на это, я иду гулять.",
      "en": "It's raining. I'm going for a walk anyway."
    },
    "grammar": "",
    "translation": {
      "ru": "несмотря на это, всё же",
      "en": "nevertheless, anyway"
    },
    "pos": "Adverb",
    "base": "trotzdem",
    "target": "Trotzdem"
  },
  {
    "id": 6,
    "sentence": "Können wir den Termin auf Freitag {{c1::verschieben}}?",
    "blank": "Können wir den Termin auf Freitag _____?",
    "revealed": "Können wir den Termin auf Freitag verschieben?",
    "sentenceTranslation": {
      "ru": "Можем перенести встречу на пятницу?",
      "en": "Can we move the appointment to Friday?"
    },
    "grammar": "verschieben · verschob · hat verschoben",
    "translation": {
      "ru": "переносить",
      "en": "to postpone, to move (a date)"
    },
    "pos": "Verb",
    "base": "verschieben",
    "target": "verschieben"
  },
  {
    "id": 7,
    "sentence": "Das ist eine schwere {{c1::Entscheidung}}.",
    "blank": "Das ist eine schwere _____.",
    "revealed": "Das ist eine schwere Entscheidung.",
    "sentenceTranslation": {
      "ru": "Это трудное решение.",
      "en": "That's a difficult decision."
    },
    "grammar": "die Entscheidung · die Entscheidungen",
    "translation": {
      "ru": "решение",
      "en": "decision"
    },
    "pos": "Substantiv",
    "base": "die Entscheidung",
    "target": "Entscheidung"
  },
  {
    "id": 8,
    "sentence": "{{c1::Wahrscheinlich}} komme ich später.",
    "blank": "_____ komme ich später.",
    "revealed": "Wahrscheinlich komme ich später.",
    "sentenceTranslation": {
      "ru": "Вероятно, я приду позже.",
      "en": "I'll probably come later."
    },
    "grammar": "",
    "translation": {
      "ru": "вероятно",
      "en": "probably, likely"
    },
    "pos": "Adverb/Adjektiv",
    "base": "wahrscheinlich",
    "target": "Wahrscheinlich"
  },
  {
    "id": 9,
    "sentence": "Ich kann mich nicht {{c1::entscheiden}}.",
    "blank": "Ich kann mich nicht _____.",
    "revealed": "Ich kann mich nicht entscheiden.",
    "sentenceTranslation": {
      "ru": "Я не могу решиться / сделать выбор.",
      "en": "I can't make up my mind."
    },
    "grammar": "sich entscheiden · entschied sich · hat sich entschieden",
    "translation": {
      "ru": "решаться, принимать решение",
      "en": "to decide, to make up your mind"
    },
    "pos": "Verb",
    "base": "sich entscheiden",
    "target": "entscheiden"
  },
  {
    "id": 10,
    "sentence": "Unsere Taschen sind {{c1::ähnlich}}.",
    "blank": "Unsere Taschen sind _____.",
    "revealed": "Unsere Taschen sind ähnlich.",
    "sentenceTranslation": {
      "ru": "Наши сумки похожи.",
      "en": "Our bags are similar."
    },
    "grammar": "",
    "translation": {
      "ru": "похожий",
      "en": "similar"
    },
    "pos": "Adjektiv",
    "base": "ähnlich",
    "target": "ähnlich"
  },
  {
    "id": 11,
    "sentence": "Ich bin müde, {{c1::deshalb}} gehe ich nach Hause.",
    "blank": "Ich bin müde, _____ gehe ich nach Hause.",
    "revealed": "Ich bin müde, deshalb gehe ich nach Hause.",
    "sentenceTranslation": {
      "ru": "Я устала, поэтому иду домой.",
      "en": "I'm tired, so I'm going home."
    },
    "grammar": {
      "ru": "deshalb = поэтому",
      "en": "deshalb = that's why, so"
    },
    "translation": {
      "ru": "поэтому",
      "en": "that's why, so"
    },
    "pos": "Adverb",
    "base": "deshalb",
    "target": "deshalb"
  },
  {
    "id": 12,
    "sentence": "Ich {{c1::schlage}} Samstag {{c1::vor}}.",
    "blank": "Ich _____ Samstag _____.",
    "revealed": "Ich schlage Samstag vor.",
    "sentenceTranslation": {
      "ru": "Я предлагаю субботу.",
      "en": "I suggest Saturday."
    },
    "grammar": "vorschlagen · du schlägst vor / er schlägt vor · schlug vor · hat vorgeschlagen",
    "translation": {
      "ru": "предлагать",
      "en": "to suggest"
    },
    "pos": "Verb",
    "base": "vorschlagen",
    "target": "schlage / vor"
  },
  {
    "id": 13,
    "sentence": "Mein {{c1::Antrag}} ist noch nicht fertig.",
    "blank": "Mein _____ ist noch nicht fertig.",
    "revealed": "Mein Antrag ist noch nicht fertig.",
    "sentenceTranslation": {
      "ru": "Моё заявление ещё не готово.",
      "en": "My application isn't finished yet."
    },
    "grammar": "der Antrag · die Anträge",
    "translation": {
      "ru": "заявление, заявка",
      "en": "application (form)"
    },
    "pos": "Substantiv",
    "base": "der Antrag",
    "target": "Antrag"
  },
  {
    "id": 14,
    "sentence": "Ich bin für die Prüfung {{c1::bereit}}.",
    "blank": "Ich bin für die Prüfung _____.",
    "revealed": "Ich bin für die Prüfung bereit.",
    "sentenceTranslation": {
      "ru": "Я готова к экзамену.",
      "en": "I'm ready for the exam."
    },
    "grammar": "bereit ≠ breit",
    "translation": {
      "ru": "готовый",
      "en": "ready"
    },
    "pos": "Adjektiv",
    "base": "bereit",
    "target": "bereit"
  },
  {
    "id": 15,
    "sentence": "Ich brauche Brot und {{c1::außerdem}} Milch.",
    "blank": "Ich brauche Brot und _____ Milch.",
    "revealed": "Ich brauche Brot und außerdem Milch.",
    "sentenceTranslation": {
      "ru": "Мне нужен хлеб, а кроме того молоко.",
      "en": "I need bread and also milk."
    },
    "grammar": "",
    "translation": {
      "ru": "кроме того",
      "en": "also, besides"
    },
    "pos": "Adverb",
    "base": "außerdem",
    "target": "außerdem"
  },
  {
    "id": 16,
    "sentence": "Ich {{c1::vermeide}} den Supermarkt am Samstag.",
    "blank": "Ich _____ den Supermarkt am Samstag.",
    "revealed": "Ich vermeide den Supermarkt am Samstag.",
    "sentenceTranslation": {
      "ru": "Я избегаю супермаркета по субботам.",
      "en": "I avoid the supermarket on Saturdays."
    },
    "grammar": "vermeiden · vermied · hat vermieden",
    "translation": {
      "ru": "избегать",
      "en": "to avoid"
    },
    "pos": "Verb",
    "base": "vermeiden",
    "target": "vermeide"
  },
  {
    "id": 17,
    "sentence": "Die {{c1::Frist}} endet am Freitag.",
    "blank": "Die _____ endet am Freitag.",
    "revealed": "Die Frist endet am Freitag.",
    "sentenceTranslation": {
      "ru": "Срок заканчивается в пятницу.",
      "en": "The deadline is on Friday."
    },
    "grammar": "die Frist · die Fristen",
    "translation": {
      "ru": "срок",
      "en": "deadline"
    },
    "pos": "Substantiv",
    "base": "die Frist",
    "target": "Frist"
  },
  {
    "id": 18,
    "sentence": "Die Woche war sehr {{c1::anstrengend}}.",
    "blank": "Die Woche war sehr _____.",
    "revealed": "Die Woche war sehr anstrengend.",
    "sentenceTranslation": {
      "ru": "Неделя была очень утомительной.",
      "en": "The week was very tiring."
    },
    "grammar": "",
    "translation": {
      "ru": "утомительный, напряжённый",
      "en": "tiring, exhausting"
    },
    "pos": "Adjektiv",
    "base": "anstrengend",
    "target": "anstrengend"
  },
  {
    "id": 19,
    "sentence": "Ich trinke keinen Tee, {{c1::sondern}} Kaffee.",
    "blank": "Ich trinke keinen Tee, _____ Kaffee.",
    "revealed": "Ich trinke keinen Tee, sondern Kaffee.",
    "sentenceTranslation": {
      "ru": "Я пью не чай, а кофе.",
      "en": "I don't drink tea, I drink coffee."
    },
    "grammar": "nicht ..., sondern ...",
    "translation": {
      "ru": "а, а наоборот",
      "en": "but (rather)"
    },
    "pos": "Konjunktion",
    "base": "sondern",
    "target": "sondern"
  },
  {
    "id": 20,
    "sentence": "Ich {{c1::bereite}} mich auf die Prüfung {{c1::vor}}.",
    "blank": "Ich _____ mich auf die Prüfung _____.",
    "revealed": "Ich bereite mich auf die Prüfung vor.",
    "sentenceTranslation": {
      "ru": "Я готовлюсь к экзамену.",
      "en": "I'm preparing for the exam."
    },
    "grammar": "sich vorbereiten auf + Akk. · bereitete sich vor · hat sich vorbereitet",
    "translation": {
      "ru": "готовиться к",
      "en": "to prepare for"
    },
    "pos": "Verb",
    "base": "sich vorbereiten auf + Akk.",
    "target": "bereite / vor"
  },
  {
    "id": 21,
    "sentence": "Seine Bemerkung war ziemlich {{c1::ärgerlich}}.",
    "blank": "Seine Bemerkung war ziemlich _____.",
    "revealed": "Seine Bemerkung war ziemlich ärgerlich.",
    "sentenceTranslation": {
      "ru": "Его замечание было довольно раздражающим.",
      "en": "His remark was pretty annoying."
    },
    "grammar": "",
    "translation": {
      "ru": "раздражающий, досадный",
      "en": "annoying"
    },
    "pos": "Adjektiv",
    "base": "ärgerlich",
    "target": "ärgerlich"
  },
  {
    "id": 22,
    "sentence": "Das kleine Café ist sehr {{c1::gemütlich}}.",
    "blank": "Das kleine Café ist sehr _____.",
    "revealed": "Das kleine Café ist sehr gemütlich.",
    "sentenceTranslation": {
      "ru": "Это маленькое кафе очень уютное.",
      "en": "The little café is very cosy."
    },
    "grammar": "",
    "translation": {
      "ru": "уютный, комфортный",
      "en": "cosy, comfortable"
    },
    "pos": "Adjektiv",
    "base": "gemütlich",
    "target": "gemütlich"
  },
  {
    "id": 23,
    "sentence": "Ich war {{c1::baff}}, als ich die Nachricht las.",
    "blank": "Ich war _____, als ich die Nachricht las.",
    "revealed": "Ich war baff, als ich die Nachricht las.",
    "sentenceTranslation": {
      "ru": "Я была ошеломлена, когда прочитала сообщение.",
      "en": "I was stunned when I read the message."
    },
    "grammar": "",
    "translation": {
      "ru": "ошеломлённый, поражённый",
      "en": "stunned, speechless"
    },
    "pos": "Adjektiv",
    "base": "baff",
    "target": "baff"
  },
  {
    "id": 24,
    "sentence": "Nach dem Urlaub hatte ich starkes {{c1::Fernweh}}.",
    "blank": "Nach dem Urlaub hatte ich starkes _____.",
    "revealed": "Nach dem Urlaub hatte ich starkes Fernweh.",
    "sentenceTranslation": {
      "ru": "После отпуска мне очень хотелось снова куда-нибудь далеко уехать.",
      "en": "After the holiday I had real wanderlust."
    },
    "grammar": "das Fernweh · kein Plural",
    "translation": {
      "ru": "тяга к дальним странам, тоска по путешествиям",
      "en": "wanderlust"
    },
    "pos": "Substantiv",
    "base": "das Fernweh",
    "target": "Fernweh"
  },
  {
    "id": 25,
    "sentence": "Nach dem Urlaub fühlte ich mich wieder {{c1::glücklich}}.",
    "blank": "Nach dem Urlaub fühlte ich mich wieder _____.",
    "revealed": "Nach dem Urlaub fühlte ich mich wieder glücklich.",
    "sentenceTranslation": {
      "ru": "После отпуска я снова чувствовала себя счастливой.",
      "en": "After the holiday I felt happy again."
    },
    "grammar": "",
    "translation": {
      "ru": "счастливый",
      "en": "happy"
    },
    "pos": "Adjektiv",
    "base": "glücklich",
    "target": "glücklich"
  },
  {
    "id": 26,
    "sentence": "Sie ist mit dem Ergebnis {{c1::unzufrieden}}.",
    "blank": "Sie ist mit dem Ergebnis _____.",
    "revealed": "Sie ist mit dem Ergebnis unzufrieden.",
    "sentenceTranslation": {
      "ru": "Она недовольна результатом.",
      "en": "She is dissatisfied with the result."
    },
    "grammar": "unzufrieden mit + Dat.",
    "translation": {
      "ru": "недовольный",
      "en": "dissatisfied, unhappy"
    },
    "pos": "Adjektiv",
    "base": "unzufrieden",
    "target": "unzufrieden"
  },
  {
    "id": 27,
    "sentence": "Bist du mit deiner Entscheidung {{c1::zufrieden}}?",
    "blank": "Bist du mit deiner Entscheidung _____?",
    "revealed": "Bist du mit deiner Entscheidung zufrieden?",
    "sentenceTranslation": {
      "ru": "Ты довольна своим решением?",
      "en": "Are you happy with your decision?"
    },
    "grammar": "zufrieden mit + Dat.",
    "translation": {
      "ru": "довольный",
      "en": "satisfied, happy"
    },
    "pos": "Adjektiv",
    "base": "zufrieden",
    "target": "zufrieden"
  },
  {
    "id": 28,
    "sentence": "Sie hat ein {{c1::Ehrenamt}}.",
    "blank": "Sie hat ein _____.",
    "revealed": "Sie hat ein Ehrenamt.",
    "sentenceTranslation": {
      "ru": "Она занимается волонтёрской / общественной деятельностью.",
      "en": "She does volunteer work."
    },
    "grammar": "das Ehrenamt · die Ehrenämter",
    "translation": {
      "ru": "волонтёрская, общественная деятельность",
      "en": "volunteer work"
    },
    "pos": "Substantiv",
    "base": "das Ehrenamt",
    "target": "Ehrenamt"
  },
  {
    "id": 29,
    "sentence": "Wir können nicht {{c1::gleichzeitig}} arbeiten und telefonieren.",
    "blank": "Wir können nicht _____ arbeiten und telefonieren.",
    "revealed": "Wir können nicht gleichzeitig arbeiten und telefonieren.",
    "sentenceTranslation": {
      "ru": "Мы не можем одновременно работать и разговаривать по телефону.",
      "en": "We can't work and talk on the phone at the same time."
    },
    "grammar": "",
    "translation": {
      "ru": "одновременно",
      "en": "at the same time"
    },
    "pos": "Adverb",
    "base": "gleichzeitig",
    "target": "gleichzeitig"
  },
  {
    "id": 30,
    "sentence": "Mein Großvater ist vor zwei Jahren {{c1::gestorben}}.",
    "blank": "Mein Großvater ist vor zwei Jahren _____.",
    "revealed": "Mein Großvater ist vor zwei Jahren gestorben.",
    "sentenceTranslation": {
      "ru": "Мой дедушка умер два года назад.",
      "en": "My grandfather died two years ago."
    },
    "grammar": "sterben · starb · ist gestorben",
    "translation": {
      "ru": "умирать",
      "en": "to die"
    },
    "pos": "Verb",
    "base": "sterben",
    "target": "gestorben"
  },
  {
    "id": 60,
    "sentence": "Die Fahrt dauert {{c1::ungefähr}} zwei Stunden.",
    "blank": "Die Fahrt dauert _____ zwei Stunden.",
    "revealed": "Die Fahrt dauert ungefähr zwei Stunden.",
    "sentenceTranslation": {
      "ru": "Поездка длится примерно два часа.",
      "en": "The journey takes about two hours."
    },
    "grammar": "",
    "translation": {
      "ru": "примерно",
      "en": "about, approximately"
    },
    "pos": "Adverb",
    "base": "ungefähr",
    "target": "ungefähr"
  },
  {
    "id": 61,
    "sentence": "Wir {{c1::vereinbaren}} einen Termin.",
    "blank": "Wir _____ einen Termin.",
    "revealed": "Wir vereinbaren einen Termin.",
    "sentenceTranslation": {
      "ru": "Мы договариваемся о встрече.",
      "en": "We're arranging an appointment."
    },
    "grammar": "vereinbaren · vereinbarte · hat vereinbart",
    "translation": {
      "ru": "договариваться, согласовывать",
      "en": "to arrange, to agree on"
    },
    "pos": "Verb",
    "base": "vereinbaren",
    "target": "vereinbaren"
  },
  {
    "id": 62,
    "sentence": "Mein {{c1::Gehalt}} kommt am Monatsende.",
    "blank": "Mein _____ kommt am Monatsende.",
    "revealed": "Mein Gehalt kommt am Monatsende.",
    "sentenceTranslation": {
      "ru": "Моя зарплата приходит в конце месяца.",
      "en": "My salary comes at the end of the month."
    },
    "grammar": "das Gehalt · die Gehälter",
    "translation": {
      "ru": "зарплата",
      "en": "salary"
    },
    "pos": "Substantiv",
    "base": "das Gehalt",
    "target": "Gehalt"
  },
  {
    "id": 63,
    "sentence": "Dieser Stuhl ist sehr {{c1::bequem}}.",
    "blank": "Dieser Stuhl ist sehr _____.",
    "revealed": "Dieser Stuhl ist sehr bequem.",
    "sentenceTranslation": {
      "ru": "Этот стул очень удобный.",
      "en": "This chair is very comfortable."
    },
    "grammar": "",
    "translation": {
      "ru": "удобный",
      "en": "comfortable"
    },
    "pos": "Adjektiv",
    "base": "bequem",
    "target": "bequem"
  },
  {
    "id": 64,
    "sentence": "Ich brauche {{c1::mindestens}} acht Stunden Schlaf.",
    "blank": "Ich brauche _____ acht Stunden Schlaf.",
    "revealed": "Ich brauche mindestens acht Stunden Schlaf.",
    "sentenceTranslation": {
      "ru": "Мне нужно минимум восемь часов сна.",
      "en": "I need at least eight hours of sleep."
    },
    "grammar": "",
    "translation": {
      "ru": "как минимум",
      "en": "at least"
    },
    "pos": "Adverb",
    "base": "mindestens",
    "target": "mindestens"
  },
  {
    "id": 31,
    "sentence": "Ich habe meine Schlüssel {{c1::nirgends}} gefunden.",
    "blank": "Ich habe meine Schlüssel _____ gefunden.",
    "revealed": "Ich habe meine Schlüssel nirgends gefunden.",
    "sentenceTranslation": {
      "ru": "Я нигде не нашла свои ключи.",
      "en": "I couldn't find my keys anywhere."
    },
    "grammar": "",
    "translation": {
      "ru": "нигде",
      "en": "nowhere"
    },
    "pos": "Adverb",
    "base": "nirgends",
    "target": "nirgends"
  },
  {
    "id": 65,
    "sentence": "Ich {{c1::erwarte}} heute ein Paket.",
    "blank": "Ich _____ heute ein Paket.",
    "revealed": "Ich erwarte heute ein Paket.",
    "sentenceTranslation": {
      "ru": "Я сегодня жду посылку.",
      "en": "I'm expecting a parcel today."
    },
    "grammar": "erwarten · erwartete · hat erwartet",
    "translation": {
      "ru": "ожидать",
      "en": "to expect"
    },
    "pos": "Verb",
    "base": "erwarten",
    "target": "erwarte"
  },
  {
    "id": 66,
    "sentence": "Dein {{c1::Vorschlag}} ist gut.",
    "blank": "Dein _____ ist gut.",
    "revealed": "Dein Vorschlag ist gut.",
    "sentenceTranslation": {
      "ru": "Твоё предложение хорошее.",
      "en": "Your suggestion is good."
    },
    "grammar": "der Vorschlag · die Vorschläge",
    "translation": {
      "ru": "предложение",
      "en": "suggestion, proposal"
    },
    "pos": "Substantiv",
    "base": "der Vorschlag",
    "target": "Vorschlag"
  },
  {
    "id": 67,
    "sentence": "Diese Straße ist nachts {{c1::gefährlich}}.",
    "blank": "Diese Straße ist nachts _____.",
    "revealed": "Diese Straße ist nachts gefährlich.",
    "sentenceTranslation": {
      "ru": "Эта улица ночью опасна.",
      "en": "This street is dangerous at night."
    },
    "grammar": "",
    "translation": {
      "ru": "опасный",
      "en": "dangerous"
    },
    "pos": "Adjektiv",
    "base": "gefährlich",
    "target": "gefährlich"
  },
  {
    "id": 68,
    "sentence": "{{c1::Eigentlich}} möchte ich heute zu Hause bleiben.",
    "blank": "_____ möchte ich heute zu Hause bleiben.",
    "revealed": "Eigentlich möchte ich heute zu Hause bleiben.",
    "sentenceTranslation": {
      "ru": "Вообще-то я хочу сегодня остаться дома.",
      "en": "Actually, I'd like to stay at home today."
    },
    "grammar": "",
    "translation": {
      "ru": "вообще-то, собственно",
      "en": "actually"
    },
    "pos": "Adverb",
    "base": "eigentlich",
    "target": "Eigentlich"
  },
  {
    "id": 46,
    "sentence": "Ich möchte mich über den schlechten Service {{c1::beschweren}}.",
    "blank": "Ich möchte mich über den schlechten Service _____.",
    "revealed": "Ich möchte mich über den schlechten Service beschweren.",
    "sentenceTranslation": {
      "ru": "Я хочу пожаловаться на плохое обслуживание.",
      "en": "I'd like to complain about the bad service."
    },
    "grammar": "sich beschweren über + Akk. · beschwerte sich · hat sich beschwert",
    "translation": {
      "ru": "жаловаться на",
      "en": "to complain about"
    },
    "pos": "Verb",
    "base": "sich beschweren über + Akk.",
    "target": "beschweren"
  },
  {
    "id": 69,
    "sentence": "{{c1::Falls}} es regnet, bleibe ich zu Hause.",
    "blank": "_____ es regnet, bleibe ich zu Hause.",
    "revealed": "Falls es regnet, bleibe ich zu Hause.",
    "sentenceTranslation": {
      "ru": "Если пойдёт дождь, я останусь дома.",
      "en": "If it rains, I'll stay at home."
    },
    "grammar": "",
    "translation": {
      "ru": "если, в случае если",
      "en": "if, in case"
    },
    "pos": "Konjunktion",
    "base": "falls",
    "target": "Falls"
  },
  {
    "id": 70,
    "sentence": "Ich möchte die Prüfung {{c1::bestehen}}.",
    "blank": "Ich möchte die Prüfung _____.",
    "revealed": "Ich möchte die Prüfung bestehen.",
    "sentenceTranslation": {
      "ru": "Я хочу сдать экзамен.",
      "en": "I want to pass the exam."
    },
    "grammar": "bestehen · bestand · hat bestanden",
    "translation": {
      "ru": "сдать; состоять; существовать",
      "en": "to pass (an exam); to consist; to exist"
    },
    "pos": "Verb",
    "base": "bestehen",
    "target": "bestehen"
  },
  {
    "id": 32,
    "sentence": "Du musst selbst {{c1::bestimmen}}, was du machen möchtest.",
    "blank": "Du musst selbst _____, was du machen möchtest.",
    "revealed": "Du musst selbst bestimmen, was du machen möchtest.",
    "sentenceTranslation": {
      "ru": "Ты должна сама решить, что хочешь делать.",
      "en": "You have to decide for yourself what you want to do."
    },
    "grammar": "bestimmen · bestimmte · hat bestimmt",
    "translation": {
      "ru": "определять, решать",
      "en": "to decide, to determine"
    },
    "pos": "Verb",
    "base": "bestimmen",
    "target": "bestimmen"
  },
  {
    "id": 71,
    "sentence": "Das ist meine {{c1::Pflicht}}.",
    "blank": "Das ist meine _____.",
    "revealed": "Das ist meine Pflicht.",
    "sentenceTranslation": {
      "ru": "Это моя обязанность.",
      "en": "That's my duty."
    },
    "grammar": "die Pflicht · die Pflichten",
    "translation": {
      "ru": "обязанность",
      "en": "duty"
    },
    "pos": "Substantiv",
    "base": "die Pflicht",
    "target": "Pflicht"
  },
  {
    "id": 72,
    "sentence": "Meine Straße ist nachts {{c1::ruhig}}.",
    "blank": "Meine Straße ist nachts _____.",
    "revealed": "Meine Straße ist nachts ruhig.",
    "sentenceTranslation": {
      "ru": "Моя улица ночью тихая.",
      "en": "My street is quiet at night."
    },
    "grammar": "",
    "translation": {
      "ru": "спокойный, тихий",
      "en": "calm, quiet"
    },
    "pos": "Adjektiv",
    "base": "ruhig",
    "target": "ruhig"
  },
  {
    "id": 73,
    "sentence": "Ich {{c1::lehne}} das Angebot {{c1::ab}}.",
    "blank": "Ich _____ das Angebot _____.",
    "revealed": "Ich lehne das Angebot ab.",
    "sentenceTranslation": {
      "ru": "Я отклоняю предложение.",
      "en": "I'm turning down the offer."
    },
    "grammar": "ablehnen · lehnte ab · hat abgelehnt",
    "translation": {
      "ru": "отклонять, отказываться",
      "en": "to decline, to turn down"
    },
    "pos": "Verb",
    "base": "ablehnen",
    "target": "lehne / ab"
  },
  {
    "id": 74,
    "sentence": "Ich suche eine neue {{c1::Stelle}}.",
    "blank": "Ich suche eine neue _____.",
    "revealed": "Ich suche eine neue Stelle.",
    "sentenceTranslation": {
      "ru": "Я ищу новую работу / должность.",
      "en": "I'm looking for a new job."
    },
    "grammar": "die Stelle · die Stellen",
    "translation": {
      "ru": "место, должность",
      "en": "job, position; place"
    },
    "pos": "Substantiv",
    "base": "die Stelle",
    "target": "Stelle"
  },
  {
    "id": 75,
    "sentence": "Ein Pass ist {{c1::erforderlich}}.",
    "blank": "Ein Pass ist _____.",
    "revealed": "Ein Pass ist erforderlich.",
    "sentenceTranslation": {
      "ru": "Необходим паспорт.",
      "en": "A passport is required."
    },
    "grammar": "",
    "translation": {
      "ru": "необходимый, требуемый",
      "en": "required, necessary"
    },
    "pos": "Adjektiv",
    "base": "erforderlich",
    "target": "erforderlich"
  },
  {
    "id": 76,
    "sentence": "Ich {{c1::melde}} mich für den Kurs {{c1::an}}.",
    "blank": "Ich _____ mich für den Kurs _____.",
    "revealed": "Ich melde mich für den Kurs an.",
    "sentenceTranslation": {
      "ru": "Я записываюсь на курс.",
      "en": "I'm signing up for the course."
    },
    "grammar": "sich anmelden · meldete sich an · hat sich angemeldet",
    "translation": {
      "ru": "регистрироваться, записываться",
      "en": "to sign up, to register"
    },
    "pos": "Verb",
    "base": "sich anmelden",
    "target": "melde / an"
  },
  {
    "id": 77,
    "sentence": "Hier besteht keine {{c1::Gefahr}}.",
    "blank": "Hier besteht keine _____.",
    "revealed": "Hier besteht keine Gefahr.",
    "sentenceTranslation": {
      "ru": "Здесь нет опасности.",
      "en": "There's no danger here."
    },
    "grammar": "die Gefahr · die Gefahren",
    "translation": {
      "ru": "опасность",
      "en": "danger"
    },
    "pos": "Substantiv",
    "base": "die Gefahr",
    "target": "Gefahr"
  },
  {
    "id": 78,
    "sentence": "Meine Freundin ist sehr {{c1::zuverlässig}}.",
    "blank": "Meine Freundin ist sehr _____.",
    "revealed": "Meine Freundin ist sehr zuverlässig.",
    "sentenceTranslation": {
      "ru": "Моя подруга очень надёжная.",
      "en": "My friend is very reliable."
    },
    "grammar": "",
    "translation": {
      "ru": "надёжный",
      "en": "reliable"
    },
    "pos": "Adjektiv",
    "base": "zuverlässig",
    "target": "zuverlässig"
  },
  {
    "id": 33,
    "sentence": "Keine Sorge, die Atmosphäre hier ist ganz {{c1::locker}}.",
    "blank": "Keine Sorge, die Atmosphäre hier ist ganz _____.",
    "revealed": "Keine Sorge, die Atmosphäre hier ist ganz locker.",
    "sentenceTranslation": {
      "ru": "Не переживай, здесь очень непринуждённая атмосфера.",
      "en": "Don't worry, the atmosphere here is very relaxed."
    },
    "grammar": "",
    "translation": {
      "ru": "непринуждённый, расслабленный",
      "en": "relaxed, laid-back"
    },
    "pos": "Adjektiv",
    "base": "locker",
    "target": "locker"
  },
  {
    "id": 79,
    "sentence": "Ich kann dir diesen Kuchen {{c1::empfehlen}}.",
    "blank": "Ich kann dir diesen Kuchen _____.",
    "revealed": "Ich kann dir diesen Kuchen empfehlen.",
    "sentenceTranslation": {
      "ru": "Я могу порекомендовать тебе этот пирог.",
      "en": "I can recommend this cake."
    },
    "grammar": "empfehlen · du empfiehlst / er empfiehlt · empfahl · hat empfohlen",
    "translation": {
      "ru": "рекомендовать",
      "en": "to recommend"
    },
    "pos": "Verb",
    "base": "empfehlen",
    "target": "empfehlen"
  },
  {
    "id": 80,
    "sentence": "Ich habe viel {{c1::Erfahrung}} mit Kunden.",
    "blank": "Ich habe viel _____ mit Kunden.",
    "revealed": "Ich habe viel Erfahrung mit Kunden.",
    "sentenceTranslation": {
      "ru": "У меня большой опыт работы с клиентами.",
      "en": "I have a lot of experience with customers."
    },
    "grammar": "die Erfahrung · die Erfahrungen",
    "translation": {
      "ru": "опыт",
      "en": "experience"
    },
    "pos": "Substantiv",
    "base": "die Erfahrung",
    "target": "Erfahrung"
  },
  {
    "id": 81,
    "sentence": "Das Kleid ist schön, {{c1::allerdings}} sehr teuer.",
    "blank": "Das Kleid ist schön, _____ sehr teuer.",
    "revealed": "Das Kleid ist schön, allerdings sehr teuer.",
    "sentenceTranslation": {
      "ru": "Платье красивое, однако очень дорогое.",
      "en": "The dress is lovely; however, it's very expensive."
    },
    "grammar": "",
    "translation": {
      "ru": "однако, правда",
      "en": "however, though"
    },
    "pos": "Adverb",
    "base": "allerdings",
    "target": "allerdings"
  },
  {
    "id": 82,
    "sentence": "Das Wetter ist heute {{c1::angenehm}}.",
    "blank": "Das Wetter ist heute _____.",
    "revealed": "Das Wetter ist heute angenehm.",
    "sentenceTranslation": {
      "ru": "Сегодня приятная погода.",
      "en": "The weather is pleasant today."
    },
    "grammar": "",
    "translation": {
      "ru": "приятный",
      "en": "pleasant"
    },
    "pos": "Adjektiv",
    "base": "angenehm",
    "target": "angenehm"
  },
  {
    "id": 83,
    "sentence": "Ich muss heute die Post {{c1::erledigen}}.",
    "blank": "Ich muss heute die Post _____.",
    "revealed": "Ich muss heute die Post erledigen.",
    "sentenceTranslation": {
      "ru": "Мне нужно сегодня разобраться с почтой.",
      "en": "I have to deal with the post today."
    },
    "grammar": "erledigen · erledigte · hat erledigt",
    "translation": {
      "ru": "выполнять, улаживать",
      "en": "to deal with, to get done"
    },
    "pos": "Verb",
    "base": "erledigen",
    "target": "erledigen"
  },
  {
    "id": 84,
    "sentence": "Ich sehe keinen {{c1::Unterschied}}.",
    "blank": "Ich sehe keinen _____.",
    "revealed": "Ich sehe keinen Unterschied.",
    "sentenceTranslation": {
      "ru": "Я не вижу разницы.",
      "en": "I don't see any difference."
    },
    "grammar": "der Unterschied · die Unterschiede",
    "translation": {
      "ru": "разница, различие",
      "en": "difference"
    },
    "pos": "Substantiv",
    "base": "der Unterschied",
    "target": "Unterschied"
  },
  {
    "id": 85,
    "sentence": "Ich bin krank, {{c1::deswegen}} bleibe ich zu Hause.",
    "blank": "Ich bin krank, _____ bleibe ich zu Hause.",
    "revealed": "Ich bin krank, deswegen bleibe ich zu Hause.",
    "sentenceTranslation": {
      "ru": "Я болею, поэтому остаюсь дома.",
      "en": "I'm ill, so I'm staying at home."
    },
    "grammar": "",
    "translation": {
      "ru": "поэтому",
      "en": "that's why, so"
    },
    "pos": "Adverb",
    "base": "deswegen",
    "target": "deswegen"
  },
  {
    "id": 34,
    "sentence": "Die beiden hatten gestern einen großen {{c1::Streit}}.",
    "blank": "Die beiden hatten gestern einen großen _____.",
    "revealed": "Die beiden hatten gestern einen großen Streit.",
    "sentenceTranslation": {
      "ru": "Вчера они сильно поссорились.",
      "en": "The two of them had a big argument yesterday."
    },
    "grammar": "der Streit · die Streitigkeiten",
    "translation": {
      "ru": "ссора, конфликт",
      "en": "argument, quarrel"
    },
    "pos": "Substantiv",
    "base": "der Streit",
    "target": "Streit"
  },
  {
    "id": 86,
    "sentence": "Ich {{c1::stelle}} einen Fehler {{c1::fest}}.",
    "blank": "Ich _____ einen Fehler _____.",
    "revealed": "Ich stelle einen Fehler fest.",
    "sentenceTranslation": {
      "ru": "Я обнаруживаю ошибку.",
      "en": "I notice a mistake."
    },
    "grammar": "feststellen · stellte fest · hat festgestellt",
    "translation": {
      "ru": "устанавливать, констатировать; обнаруживать",
      "en": "to notice, to find; to establish"
    },
    "pos": "Verb",
    "base": "feststellen",
    "target": "stelle / fest"
  },
  {
    "id": 87,
    "sentence": "Bitte hör {{c1::aufmerksam}} zu.",
    "blank": "Bitte hör _____ zu.",
    "revealed": "Bitte hör aufmerksam zu.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, слушай внимательно.",
      "en": "Please listen carefully."
    },
    "grammar": "",
    "translation": {
      "ru": "внимательно; внимательный",
      "en": "attentive; attentively"
    },
    "pos": "Adjektiv",
    "base": "aufmerksam",
    "target": "aufmerksam"
  },
  {
    "id": 88,
    "sentence": "Deutsch B1 ist eine wichtige {{c1::Voraussetzung}}.",
    "blank": "Deutsch B1 ist eine wichtige _____.",
    "revealed": "Deutsch B1 ist eine wichtige Voraussetzung.",
    "sentenceTranslation": {
      "ru": "Немецкий B1 — важное требование / условие.",
      "en": "German B1 is an important requirement."
    },
    "grammar": "die Voraussetzung · die Voraussetzungen",
    "translation": {
      "ru": "условие, предпосылка",
      "en": "requirement, prerequisite"
    },
    "pos": "Substantiv",
    "base": "die Voraussetzung",
    "target": "Voraussetzung"
  },
  {
    "id": 89,
    "sentence": "Meine Freundin {{c1::unterstützt}} mich.",
    "blank": "Meine Freundin _____ mich.",
    "revealed": "Meine Freundin unterstützt mich.",
    "sentenceTranslation": {
      "ru": "Моя подруга меня поддерживает.",
      "en": "My friend supports me."
    },
    "grammar": "unterstützen · unterstützte · hat unterstützt",
    "translation": {
      "ru": "поддерживать",
      "en": "to support"
    },
    "pos": "Verb",
    "base": "unterstützen",
    "target": "unterstützt"
  },
  {
    "id": 90,
    "sentence": "Danke für deine {{c1::Unterstützung}}.",
    "blank": "Danke für deine _____.",
    "revealed": "Danke für deine Unterstützung.",
    "sentenceTranslation": {
      "ru": "Спасибо за твою поддержку.",
      "en": "Thanks for your support."
    },
    "grammar": "die Unterstützung · die Unterstützungen",
    "translation": {
      "ru": "поддержка",
      "en": "support"
    },
    "pos": "Substantiv",
    "base": "die Unterstützung",
    "target": "Unterstützung"
  },
  {
    "id": 91,
    "sentence": "Ich rufe dich an, {{c1::sobald}} ich zu Hause bin.",
    "blank": "Ich rufe dich an, _____ ich zu Hause bin.",
    "revealed": "Ich rufe dich an, sobald ich zu Hause bin.",
    "sentenceTranslation": {
      "ru": "Я позвоню тебе, как только буду дома.",
      "en": "I'll call you as soon as I'm home."
    },
    "grammar": "",
    "translation": {
      "ru": "как только",
      "en": "as soon as"
    },
    "pos": "Konjunktion",
    "base": "sobald",
    "target": "sobald"
  },
  {
    "id": 92,
    "sentence": "Dieses Café ist sehr {{c1::beliebt}}.",
    "blank": "Dieses Café ist sehr _____.",
    "revealed": "Dieses Café ist sehr beliebt.",
    "sentenceTranslation": {
      "ru": "Это кафе очень популярное.",
      "en": "This café is very popular."
    },
    "grammar": "",
    "translation": {
      "ru": "популярный, любимый",
      "en": "popular"
    },
    "pos": "Adjektiv",
    "base": "beliebt",
    "target": "beliebt"
  },
  {
    "id": 93,
    "sentence": "Sie {{c1::bietet}} mir Kaffee {{c1::an}}.",
    "blank": "Sie _____ mir Kaffee _____.",
    "revealed": "Sie bietet mir Kaffee an.",
    "sentenceTranslation": {
      "ru": "Она предлагает мне кофе.",
      "en": "She offers me a coffee."
    },
    "grammar": "anbieten · bot an · hat angeboten",
    "translation": {
      "ru": "предлагать",
      "en": "to offer"
    },
    "pos": "Verb",
    "base": "anbieten",
    "target": "bietet / an"
  },
  {
    "id": 35,
    "sentence": "Ich habe großes {{c1::Heimweh}}, wenn ich lange nicht zu Hause bin.",
    "blank": "Ich habe großes _____, wenn ich lange nicht zu Hause bin.",
    "revealed": "Ich habe großes Heimweh, wenn ich lange nicht zu Hause bin.",
    "sentenceTranslation": {
      "ru": "Я сильно скучаю по дому, когда долго не бываю дома.",
      "en": "I get really homesick when I'm away from home for a long time."
    },
    "grammar": "das Heimweh · kein Plural",
    "translation": {
      "ru": "тоска по дому",
      "en": "homesickness"
    },
    "pos": "Substantiv",
    "base": "das Heimweh",
    "target": "Heimweh"
  },
  {
    "id": 94,
    "sentence": "Die {{c1::Veranstaltung}} beginnt um acht.",
    "blank": "Die _____ beginnt um acht.",
    "revealed": "Die Veranstaltung beginnt um acht.",
    "sentenceTranslation": {
      "ru": "Мероприятие начинается в восемь.",
      "en": "The event starts at eight."
    },
    "grammar": "die Veranstaltung · die Veranstaltungen",
    "translation": {
      "ru": "мероприятие",
      "en": "event"
    },
    "pos": "Substantiv",
    "base": "die Veranstaltung",
    "target": "Veranstaltung"
  },
  {
    "id": 95,
    "sentence": "{{c1::Solange}} es regnet, bleibe ich hier.",
    "blank": "_____ es regnet, bleibe ich hier.",
    "revealed": "Solange es regnet, bleibe ich hier.",
    "sentenceTranslation": {
      "ru": "Пока идёт дождь, я останусь здесь.",
      "en": "As long as it's raining, I'll stay here."
    },
    "grammar": "",
    "translation": {
      "ru": "пока, до тех пор пока",
      "en": "as long as"
    },
    "pos": "Konjunktion",
    "base": "solange",
    "target": "Solange"
  },
  {
    "id": 96,
    "sentence": "Ich {{c1::bewerbe}} mich um eine Stelle.",
    "blank": "Ich _____ mich um eine Stelle.",
    "revealed": "Ich bewerbe mich um eine Stelle.",
    "sentenceTranslation": {
      "ru": "Я подаю заявку на вакансию.",
      "en": "I'm applying for a job."
    },
    "grammar": "sich bewerben um + Akk. · du bewirbst dich / er bewirbt sich · bewarb sich · hat sich beworben",
    "translation": {
      "ru": "подавать заявку на",
      "en": "to apply for"
    },
    "pos": "Verb",
    "base": "sich bewerben um + Akk.",
    "target": "bewerbe"
  },
  {
    "id": 57,
    "sentence": "Ich bin vom Film {{c1::enttäuscht}}.",
    "blank": "Ich bin vom Film _____.",
    "revealed": "Ich bin vom Film enttäuscht.",
    "sentenceTranslation": {
      "ru": "Я разочарована фильмом.",
      "en": "I'm disappointed with the film."
    },
    "grammar": "",
    "translation": {
      "ru": "разочарованный",
      "en": "disappointed"
    },
    "pos": "Adjektiv",
    "base": "enttäuscht",
    "target": "enttäuscht"
  },
  {
    "id": 97,
    "sentence": "Wir haben eine klare {{c1::Vereinbarung}}.",
    "blank": "Wir haben eine klare _____.",
    "revealed": "Wir haben eine klare Vereinbarung.",
    "sentenceTranslation": {
      "ru": "У нас есть чёткая договорённость.",
      "en": "We have a clear agreement."
    },
    "grammar": "die Vereinbarung · die Vereinbarungen",
    "translation": {
      "ru": "договорённость, соглашение",
      "en": "agreement, arrangement"
    },
    "pos": "Substantiv",
    "base": "die Vereinbarung",
    "target": "Vereinbarung"
  },
  {
    "id": 98,
    "sentence": "Meine Eltern {{c1::erlauben}} mir das nicht.",
    "blank": "Meine Eltern _____ mir das nicht.",
    "revealed": "Meine Eltern erlauben mir das nicht.",
    "sentenceTranslation": {
      "ru": "Родители мне этого не разрешают.",
      "en": "My parents don't allow me to do that."
    },
    "grammar": "erlauben · erlaubte · hat erlaubt",
    "translation": {
      "ru": "разрешать",
      "en": "to allow"
    },
    "pos": "Verb",
    "base": "erlauben",
    "target": "erlauben"
  },
  {
    "id": 99,
    "sentence": "Ich schicke heute meine {{c1::Bewerbung}}.",
    "blank": "Ich schicke heute meine _____.",
    "revealed": "Ich schicke heute meine Bewerbung.",
    "sentenceTranslation": {
      "ru": "Я сегодня отправляю свою заявку на работу.",
      "en": "I'm sending my application today."
    },
    "grammar": "die Bewerbung · die Bewerbungen",
    "translation": {
      "ru": "заявка (особенно на работу); пакет документов",
      "en": "(job) application"
    },
    "pos": "Substantiv",
    "base": "die Bewerbung",
    "target": "Bewerbung"
  },
  {
    "id": 36,
    "sentence": "Er war so {{c1::wütend}}, dass er kaum sprechen konnte.",
    "blank": "Er war so _____, dass er kaum sprechen konnte.",
    "revealed": "Er war so wütend, dass er kaum sprechen konnte.",
    "sentenceTranslation": {
      "ru": "Он был настолько зол, что едва мог говорить.",
      "en": "He was so angry that he could hardly speak."
    },
    "grammar": "wütend auf + Akk.",
    "translation": {
      "ru": "злой, в ярости",
      "en": "angry, furious"
    },
    "pos": "Adjektiv",
    "base": "wütend",
    "target": "wütend"
  },
  {
    "id": 100,
    "sentence": "{{c1::Inzwischen}} fühle ich mich in München zu Hause.",
    "blank": "_____ fühle ich mich in München zu Hause.",
    "revealed": "Inzwischen fühle ich mich in München zu Hause.",
    "sentenceTranslation": {
      "ru": "Теперь я уже чувствую себя в Мюнхене как дома.",
      "en": "By now I feel at home in Munich."
    },
    "grammar": "",
    "translation": {
      "ru": "тем временем, к настоящему времени",
      "en": "by now, meanwhile"
    },
    "pos": "Adverb",
    "base": "inzwischen",
    "target": "Inzwischen"
  },
  {
    "id": 101,
    "sentence": "Die Prüfung war {{c1::erfolgreich}}.",
    "blank": "Die Prüfung war _____.",
    "revealed": "Die Prüfung war erfolgreich.",
    "sentenceTranslation": {
      "ru": "Экзамен прошёл успешно.",
      "en": "The exam was a success."
    },
    "grammar": "",
    "translation": {
      "ru": "успешный",
      "en": "successful"
    },
    "pos": "Adjektiv",
    "base": "erfolgreich",
    "target": "erfolgreich"
  },
  {
    "id": 102,
    "sentence": "Ich {{c1::gewöhne}} mich an das Wetter.",
    "blank": "Ich _____ mich an das Wetter.",
    "revealed": "Ich gewöhne mich an das Wetter.",
    "sentenceTranslation": {
      "ru": "Я привыкаю к погоде.",
      "en": "I'm getting used to the weather."
    },
    "grammar": "sich gewöhnen an + Akk. · gewöhnte sich · hat sich gewöhnt",
    "translation": {
      "ru": "привыкать к",
      "en": "to get used to"
    },
    "pos": "Verb",
    "base": "sich gewöhnen an + Akk.",
    "target": "gewöhne"
  },
  {
    "id": 103,
    "sentence": "Sie macht eine {{c1::Ausbildung}} zur Köchin.",
    "blank": "Sie macht eine _____ zur Köchin.",
    "revealed": "Sie macht eine Ausbildung zur Köchin.",
    "sentenceTranslation": {
      "ru": "Она учится на повара.",
      "en": "She's training to be a cook."
    },
    "grammar": "die Ausbildung · die Ausbildungen",
    "translation": {
      "ru": "профобучение, образование",
      "en": "vocational training, apprenticeship"
    },
    "pos": "Substantiv",
    "base": "die Ausbildung",
    "target": "Ausbildung"
  },
  {
    "id": 104,
    "sentence": "{{c1::Schließlich}} haben wir eine Lösung gefunden.",
    "blank": "_____ haben wir eine Lösung gefunden.",
    "revealed": "Schließlich haben wir eine Lösung gefunden.",
    "sentenceTranslation": {
      "ru": "В конце концов мы нашли решение.",
      "en": "In the end, we found a solution."
    },
    "grammar": "",
    "translation": {
      "ru": "в конце концов, наконец",
      "en": "finally, in the end"
    },
    "pos": "Adverb",
    "base": "schließlich",
    "target": "Schließlich"
  },
  {
    "id": 105,
    "sentence": "Ich möchte meinen Vertrag {{c1::kündigen}}.",
    "blank": "Ich möchte meinen Vertrag _____.",
    "revealed": "Ich möchte meinen Vertrag kündigen.",
    "sentenceTranslation": {
      "ru": "Я хочу расторгнуть договор.",
      "en": "I'd like to cancel my contract."
    },
    "grammar": "kündigen · kündigte · hat gekündigt",
    "translation": {
      "ru": "увольняться; расторгать",
      "en": "to quit (a job); to cancel (a contract)"
    },
    "pos": "Verb",
    "base": "kündigen",
    "target": "kündigen"
  },
  {
    "id": 106,
    "sentence": "Für die Stelle braucht man {{c1::Kenntnisse}} in Deutsch.",
    "blank": "Für die Stelle braucht man _____ in Deutsch.",
    "revealed": "Für die Stelle braucht man Kenntnisse in Deutsch.",
    "sentenceTranslation": {
      "ru": "Для этой должности нужны знания немецкого.",
      "en": "For this job you need a knowledge of German."
    },
    "grammar": "die Kenntnis · die Kenntnisse (meist Plural in dieser Bedeutung)",
    "translation": {
      "ru": "знания",
      "en": "knowledge, skills"
    },
    "pos": "Substantiv",
    "base": "die Kenntnisse",
    "target": "Kenntnisse"
  },
  {
    "id": 107,
    "sentence": "Wir müssen das Problem {{c1::lösen}}.",
    "blank": "Wir müssen das Problem _____.",
    "revealed": "Wir müssen das Problem lösen.",
    "sentenceTranslation": {
      "ru": "Нам нужно решить проблему.",
      "en": "We need to solve the problem."
    },
    "grammar": "lösen · löste · hat gelöst",
    "translation": {
      "ru": "решать; освобождать",
      "en": "to solve; to loosen"
    },
    "pos": "Verb",
    "base": "lösen",
    "target": "lösen"
  },
  {
    "id": 37,
    "sentence": "Das Kind begann plötzlich zu {{c1::weinen}}.",
    "blank": "Das Kind begann plötzlich zu _____.",
    "revealed": "Das Kind begann plötzlich zu weinen.",
    "sentenceTranslation": {
      "ru": "Ребёнок внезапно начал плакать.",
      "en": "The child suddenly started to cry."
    },
    "grammar": "weinen · weinte · hat geweint",
    "translation": {
      "ru": "плакать",
      "en": "to cry"
    },
    "pos": "Verb",
    "base": "weinen",
    "target": "weinen"
  },
  {
    "id": 108,
    "sentence": "Geduld ist eine wichtige {{c1::Fähigkeit}}.",
    "blank": "Geduld ist eine wichtige _____.",
    "revealed": "Geduld ist eine wichtige Fähigkeit.",
    "sentenceTranslation": {
      "ru": "Терпение — важный навык.",
      "en": "Patience is an important skill."
    },
    "grammar": "die Fähigkeit · die Fähigkeiten",
    "translation": {
      "ru": "способность, навык",
      "en": "ability, skill"
    },
    "pos": "Substantiv",
    "base": "die Fähigkeit",
    "target": "Fähigkeit"
  },
  {
    "id": 109,
    "sentence": "Ich mag München {{c1::besonders}} im Sommer.",
    "blank": "Ich mag München _____ im Sommer.",
    "revealed": "Ich mag München besonders im Sommer.",
    "sentenceTranslation": {
      "ru": "Мне особенно нравится Мюнхен летом.",
      "en": "I like Munich especially in summer."
    },
    "grammar": "",
    "translation": {
      "ru": "особенно",
      "en": "especially"
    },
    "pos": "Adverb",
    "base": "besonders",
    "target": "besonders"
  },
  {
    "id": 110,
    "sentence": "Wir kochen heute {{c1::gemeinsam}}.",
    "blank": "Wir kochen heute _____.",
    "revealed": "Wir kochen heute gemeinsam.",
    "sentenceTranslation": {
      "ru": "Сегодня мы готовим вместе.",
      "en": "We're cooking together today."
    },
    "grammar": "",
    "translation": {
      "ru": "совместный; вместе, совместно",
      "en": "together; shared"
    },
    "pos": "Adjektiv/Adverb",
    "base": "gemeinsam",
    "target": "gemeinsam"
  },
  {
    "id": 111,
    "sentence": "Das {{c1::überzeugt}} mich nicht.",
    "blank": "Das _____ mich nicht.",
    "revealed": "Das überzeugt mich nicht.",
    "sentenceTranslation": {
      "ru": "Это меня не убеждает.",
      "en": "That doesn't convince me."
    },
    "grammar": "überzeugen · überzeugte · hat überzeugt",
    "translation": {
      "ru": "убеждать",
      "en": "to convince"
    },
    "pos": "Verb",
    "base": "überzeugen",
    "target": "überzeugt"
  },
  {
    "id": 112,
    "sentence": "Ich kenne die {{c1::Umgebung}} gut.",
    "blank": "Ich kenne die _____ gut.",
    "revealed": "Ich kenne die Umgebung gut.",
    "sentenceTranslation": {
      "ru": "Я хорошо знаю окрестности.",
      "en": "I know the area well."
    },
    "grammar": "die Umgebung · die Umgebungen",
    "translation": {
      "ru": "окружение, окрестности",
      "en": "surroundings, area"
    },
    "pos": "Substantiv",
    "base": "die Umgebung",
    "target": "Umgebung"
  },
  {
    "id": 113,
    "sentence": "Ich warte {{c1::höchstens}} zehn Minuten.",
    "blank": "Ich warte _____ zehn Minuten.",
    "revealed": "Ich warte höchstens zehn Minuten.",
    "sentenceTranslation": {
      "ru": "Я подожду максимум десять минут.",
      "en": "I'll wait ten minutes at most."
    },
    "grammar": "",
    "translation": {
      "ru": "максимум, не более",
      "en": "at most"
    },
    "pos": "Adverb",
    "base": "höchstens",
    "target": "höchstens"
  },
  {
    "id": 114,
    "sentence": "Ich {{c1::stimme}} dir {{c1::zu}}.",
    "blank": "Ich _____ dir _____.",
    "revealed": "Ich stimme dir zu.",
    "sentenceTranslation": {
      "ru": "Я с тобой согласна.",
      "en": "I agree with you."
    },
    "grammar": "zustimmen · stimmte zu · hat zugestimmt",
    "translation": {
      "ru": "соглашаться",
      "en": "to agree"
    },
    "pos": "Verb",
    "base": "zustimmen",
    "target": "stimme / zu"
  },
  {
    "id": 38,
    "sentence": "{{c1::Vertrauen}} ist die Basis jeder guten Beziehung.",
    "blank": "_____ ist die Basis jeder guten Beziehung.",
    "revealed": "Vertrauen ist die Basis jeder guten Beziehung.",
    "sentenceTranslation": {
      "ru": "Доверие — основа любых хороших отношений.",
      "en": "Trust is the basis of every good relationship."
    },
    "grammar": "das Vertrauen · kein Plural",
    "translation": {
      "ru": "доверие",
      "en": "trust"
    },
    "pos": "Substantiv",
    "base": "das Vertrauen",
    "target": "Vertrauen"
  },
  {
    "id": 115,
    "sentence": "Mein Fahrlehrer ist sehr {{c1::geduldig}}.",
    "blank": "Mein Fahrlehrer ist sehr _____.",
    "revealed": "Mein Fahrlehrer ist sehr geduldig.",
    "sentenceTranslation": {
      "ru": "Мой инструктор по вождению очень терпеливый.",
      "en": "My driving instructor is very patient."
    },
    "grammar": "",
    "translation": {
      "ru": "терпеливый",
      "en": "patient"
    },
    "pos": "Adjektiv",
    "base": "geduldig",
    "target": "geduldig"
  },
  {
    "id": 116,
    "sentence": "Sie haben eine gute {{c1::Beziehung}}.",
    "blank": "Sie haben eine gute _____.",
    "revealed": "Sie haben eine gute Beziehung.",
    "sentenceTranslation": {
      "ru": "У них хорошие отношения.",
      "en": "They have a good relationship."
    },
    "grammar": "die Beziehung · die Beziehungen",
    "translation": {
      "ru": "отношения, связь",
      "en": "relationship"
    },
    "pos": "Substantiv",
    "base": "die Beziehung",
    "target": "Beziehung"
  },
  {
    "id": 117,
    "sentence": "Das {{c1::hängt}} vom Wetter {{c1::ab}}.",
    "blank": "Das _____ vom Wetter _____.",
    "revealed": "Das hängt vom Wetter ab.",
    "sentenceTranslation": {
      "ru": "Это зависит от погоды.",
      "en": "It depends on the weather."
    },
    "grammar": "abhängen von + Dat. · hing ab · hat abgehangen",
    "translation": {
      "ru": "зависеть от",
      "en": "to depend on"
    },
    "pos": "Verb",
    "base": "abhängen von + Dat.",
    "target": "hängt / ab"
  },
  {
    "id": 118,
    "sentence": "Sein {{c1::Verhalten}} war komisch.",
    "blank": "Sein _____ war komisch.",
    "revealed": "Sein Verhalten war komisch.",
    "sentenceTranslation": {
      "ru": "Его поведение было странным.",
      "en": "His behaviour was strange."
    },
    "grammar": "das Verhalten · meist ohne Plural",
    "translation": {
      "ru": "поведение",
      "en": "behaviour"
    },
    "pos": "Substantiv",
    "base": "das Verhalten",
    "target": "Verhalten"
  },
  {
    "id": 119,
    "sentence": "{{c1::Möglicherweise}} komme ich später.",
    "blank": "_____ komme ich später.",
    "revealed": "Möglicherweise komme ich später.",
    "sentenceTranslation": {
      "ru": "Возможно, я приду позже.",
      "en": "I might come later."
    },
    "grammar": "",
    "translation": {
      "ru": "возможно",
      "en": "possibly, maybe"
    },
    "pos": "Adverb",
    "base": "möglicherweise",
    "target": "Möglicherweise"
  },
  {
    "id": 120,
    "sentence": "Ich bin das Wetter {{c1::gewohnt}}.",
    "blank": "Ich bin das Wetter _____.",
    "revealed": "Ich bin das Wetter gewohnt.",
    "sentenceTranslation": {
      "ru": "Я привыкла к этой погоде.",
      "en": "I'm used to the weather."
    },
    "grammar": "",
    "translation": {
      "ru": "привыкший к чему-либо; привычный",
      "en": "used to (something); usual"
    },
    "pos": "Adjektiv",
    "base": "gewohnt",
    "target": "gewohnt"
  },
  {
    "id": 121,
    "sentence": "Der Fehler {{c1::fällt}} sofort {{c1::auf}}.",
    "blank": "Der Fehler _____ sofort _____.",
    "revealed": "Der Fehler fällt sofort auf.",
    "sentenceTranslation": {
      "ru": "Ошибка сразу бросается в глаза.",
      "en": "The mistake stands out immediately."
    },
    "grammar": "auffallen · er fällt auf · fiel auf · ist aufgefallen",
    "translation": {
      "ru": "бросаться в глаза, замечаться",
      "en": "to stand out, to be noticed"
    },
    "pos": "Verb",
    "base": "auffallen",
    "target": "fällt / auf"
  },
  {
    "id": 122,
    "sentence": "Kaffee am Morgen ist meine {{c1::Gewohnheit}}.",
    "blank": "Kaffee am Morgen ist meine _____.",
    "revealed": "Kaffee am Morgen ist meine Gewohnheit.",
    "sentenceTranslation": {
      "ru": "Кофе утром — моя привычка.",
      "en": "Having coffee in the morning is a habit of mine."
    },
    "grammar": "die Gewohnheit · die Gewohnheiten",
    "translation": {
      "ru": "привычка",
      "en": "habit"
    },
    "pos": "Substantiv",
    "base": "die Gewohnheit",
    "target": "Gewohnheit"
  },
  {
    "id": 39,
    "sentence": "Sein Verhalten war so {{c1::lächerlich}}, dass alle lachen mussten.",
    "blank": "Sein Verhalten war so _____, dass alle lachen mussten.",
    "revealed": "Sein Verhalten war so lächerlich, dass alle lachen mussten.",
    "sentenceTranslation": {
      "ru": "Его поведение было настолько нелепым, что все были вынуждены смеяться.",
      "en": "His behaviour was so ridiculous that everyone had to laugh."
    },
    "grammar": "",
    "translation": {
      "ru": "смешной, нелепый, смехотворный",
      "en": "ridiculous"
    },
    "pos": "Adjektiv",
    "base": "lächerlich",
    "target": "lächerlich"
  },
  {
    "id": 123,
    "sentence": "{{c1::Jedenfalls}} möchte ich es versuchen.",
    "blank": "_____ möchte ich es versuchen.",
    "revealed": "Jedenfalls möchte ich es versuchen.",
    "sentenceTranslation": {
      "ru": "Во всяком случае, я хочу попробовать.",
      "en": "In any case, I'd like to try."
    },
    "grammar": "",
    "translation": {
      "ru": "во всяком случае",
      "en": "in any case, anyway"
    },
    "pos": "Adverb",
    "base": "jedenfalls",
    "target": "Jedenfalls"
  },
  {
    "id": 124,
    "sentence": "Das Geld {{c1::reicht}} nicht {{c1::aus}}.",
    "blank": "Das Geld _____ nicht _____.",
    "revealed": "Das Geld reicht nicht aus.",
    "sentenceTranslation": {
      "ru": "Денег недостаточно.",
      "en": "The money isn't enough."
    },
    "grammar": "ausreichen · reichte aus · hat ausgereicht",
    "translation": {
      "ru": "быть достаточным, хватать",
      "en": "to be enough"
    },
    "pos": "Verb",
    "base": "ausreichen",
    "target": "reicht / aus"
  },
  {
    "id": 125,
    "sentence": "Der Mitarbeiter war sehr {{c1::höflich}}.",
    "blank": "Der Mitarbeiter war sehr _____.",
    "revealed": "Der Mitarbeiter war sehr höflich.",
    "sentenceTranslation": {
      "ru": "Сотрудник был очень вежлив.",
      "en": "The employee was very polite."
    },
    "grammar": "",
    "translation": {
      "ru": "вежливый",
      "en": "polite"
    },
    "pos": "Adjektiv",
    "base": "höflich",
    "target": "höflich"
  },
  {
    "id": 126,
    "sentence": "Homeoffice hat einen großen {{c1::Vorteil}}.",
    "blank": "Homeoffice hat einen großen _____.",
    "revealed": "Homeoffice hat einen großen Vorteil.",
    "sentenceTranslation": {
      "ru": "У удалённой работы есть большое преимущество.",
      "en": "Working from home has a big advantage."
    },
    "grammar": "der Vorteil · die Vorteile",
    "translation": {
      "ru": "преимущество",
      "en": "advantage"
    },
    "pos": "Substantiv",
    "base": "der Vorteil",
    "target": "Vorteil"
  },
  {
    "id": 127,
    "sentence": "Ich möchte einen neuen Pass {{c1::beantragen}}.",
    "blank": "Ich möchte einen neuen Pass _____.",
    "revealed": "Ich möchte einen neuen Pass beantragen.",
    "sentenceTranslation": {
      "ru": "Я хочу подать заявление на новый паспорт.",
      "en": "I'd like to apply for a new passport."
    },
    "grammar": "beantragen · beantragte · hat beantragt",
    "translation": {
      "ru": "подавать заявление на",
      "en": "to apply for (officially)"
    },
    "pos": "Verb",
    "base": "beantragen",
    "target": "beantragen"
  },
  {
    "id": 128,
    "sentence": "Der Preis ist ein {{c1::Nachteil}}.",
    "blank": "Der Preis ist ein _____.",
    "revealed": "Der Preis ist ein Nachteil.",
    "sentenceTranslation": {
      "ru": "Цена — это недостаток.",
      "en": "The price is a disadvantage."
    },
    "grammar": "der Nachteil · die Nachteile",
    "translation": {
      "ru": "недостаток",
      "en": "disadvantage"
    },
    "pos": "Substantiv",
    "base": "der Nachteil",
    "target": "Nachteil"
  },
  {
    "id": 129,
    "sentence": "{{c1::Im Gegensatz dazu}} ist München sehr ruhig.",
    "blank": "_____ ist München sehr ruhig.",
    "revealed": "Im Gegensatz dazu ist München sehr ruhig.",
    "sentenceTranslation": {
      "ru": "В отличие от этого Мюнхен очень спокойный.",
      "en": "In contrast, Munich is very quiet."
    },
    "grammar": "",
    "translation": {
      "ru": "в отличие от этого",
      "en": "in contrast"
    },
    "pos": "Verbindung",
    "base": "im Gegensatz dazu",
    "target": "Im Gegensatz dazu"
  },
  {
    "id": 40,
    "sentence": "Ich {{c1::bewundere}} Menschen, die nie aufgeben.",
    "blank": "Ich _____ Menschen, die nie aufgeben.",
    "revealed": "Ich bewundere Menschen, die nie aufgeben.",
    "sentenceTranslation": {
      "ru": "Я восхищаюсь людьми, которые никогда не сдаются.",
      "en": "I admire people who never give up."
    },
    "grammar": "bewundern · bewunderte · hat bewundert",
    "translation": {
      "ru": "восхищаться",
      "en": "to admire"
    },
    "pos": "Verb",
    "base": "bewundern",
    "target": "bewundere"
  },
  {
    "id": 58,
    "sentence": "Es war mir {{c1::peinlich}}, vor allen Leuten zu sprechen.",
    "blank": "Es war mir _____, vor allen Leuten zu sprechen.",
    "revealed": "Es war mir peinlich, vor allen Leuten zu sprechen.",
    "sentenceTranslation": {
      "ru": "Мне было неловко говорить перед всеми.",
      "en": "I was embarrassed to speak in front of everyone."
    },
    "grammar": "",
    "translation": {
      "ru": "неловкий, постыдный",
      "en": "embarrassing"
    },
    "pos": "Adjektiv",
    "base": "peinlich",
    "target": "peinlich"
  },
  {
    "id": 130,
    "sentence": "Bitte {{c1::begründen}} Sie Ihre Meinung.",
    "blank": "Bitte _____ Sie Ihre Meinung.",
    "revealed": "Bitte begründen Sie Ihre Meinung.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, обоснуйте своё мнение.",
      "en": "Please give reasons for your opinion."
    },
    "grammar": "begründen · begründete · hat begründet",
    "translation": {
      "ru": "обосновывать",
      "en": "to give reasons for, to justify"
    },
    "pos": "Verb",
    "base": "begründen",
    "target": "begründen"
  },
  {
    "id": 131,
    "sentence": "Ich schreibe eine {{c1::Beschwerde}}.",
    "blank": "Ich schreibe eine _____.",
    "revealed": "Ich schreibe eine Beschwerde.",
    "sentenceTranslation": {
      "ru": "Я пишу жалобу.",
      "en": "I'm writing a complaint."
    },
    "grammar": "die Beschwerde · die Beschwerden",
    "translation": {
      "ru": "жалоба",
      "en": "complaint"
    },
    "pos": "Substantiv",
    "base": "die Beschwerde",
    "target": "Beschwerde"
  },
  {
    "id": 132,
    "sentence": "{{c1::Einerseits}} ist es teuer, andererseits ist es bequem.",
    "blank": "_____ ist es teuer, andererseits ist es bequem.",
    "revealed": "Einerseits ist es teuer, andererseits ist es bequem.",
    "sentenceTranslation": {
      "ru": "С одной стороны, это дорого, с другой — удобно.",
      "en": "On the one hand it's expensive, on the other hand it's convenient."
    },
    "grammar": "",
    "translation": {
      "ru": "с одной стороны … с другой стороны",
      "en": "on the one hand … on the other hand"
    },
    "pos": "Verbindung",
    "base": "einerseits … andererseits",
    "target": "Einerseits"
  },
  {
    "id": 133,
    "sentence": "Sie {{c1::berichtet}} über ihre Reise.",
    "blank": "Sie _____ über ihre Reise.",
    "revealed": "Sie berichtet über ihre Reise.",
    "sentenceTranslation": {
      "ru": "Она рассказывает о своей поездке.",
      "en": "She's telling us about her trip."
    },
    "grammar": "berichten · berichtete · hat berichtet",
    "translation": {
      "ru": "сообщать, рассказывать",
      "en": "to report, to tell"
    },
    "pos": "Verb",
    "base": "berichten",
    "target": "berichtet"
  },
  {
    "id": 134,
    "sentence": "Der Preis ist vom Datum {{c1::abhängig}}.",
    "blank": "Der Preis ist vom Datum _____.",
    "revealed": "Der Preis ist vom Datum abhängig.",
    "sentenceTranslation": {
      "ru": "Цена зависит от даты.",
      "en": "The price depends on the date."
    },
    "grammar": "",
    "translation": {
      "ru": "зависимый от",
      "en": "dependent (on)"
    },
    "pos": "Adjektiv",
    "base": "abhängig",
    "target": "abhängig"
  },
  {
    "id": 135,
    "sentence": "Ich brauche eine {{c1::Erlaubnis}}.",
    "blank": "Ich brauche eine _____.",
    "revealed": "Ich brauche eine Erlaubnis.",
    "sentenceTranslation": {
      "ru": "Мне нужно разрешение.",
      "en": "I need permission."
    },
    "grammar": "die Erlaubnis · die Erlaubnisse",
    "translation": {
      "ru": "разрешение",
      "en": "permission"
    },
    "pos": "Substantiv",
    "base": "die Erlaubnis",
    "target": "Erlaubnis"
  },
  {
    "id": 136,
    "sentence": "Ich {{c1::beschäftige}} mich mit einem neuen Projekt.",
    "blank": "Ich _____ mich mit einem neuen Projekt.",
    "revealed": "Ich beschäftige mich mit einem neuen Projekt.",
    "sentenceTranslation": {
      "ru": "Я занимаюсь новым проектом.",
      "en": "I'm working on a new project."
    },
    "grammar": "sich beschäftigen mit + Dat. · beschäftigte sich · hat sich beschäftigt",
    "translation": {
      "ru": "заниматься чем-либо",
      "en": "to deal with, to work on"
    },
    "pos": "Verb",
    "base": "sich beschäftigen mit + Dat.",
    "target": "beschäftige"
  },
  {
    "id": 42,
    "sentence": "Es ist {{c1::erstaunlich}}, wie schnell die Zeit vergeht.",
    "blank": "Es ist _____, wie schnell die Zeit vergeht.",
    "revealed": "Es ist erstaunlich, wie schnell die Zeit vergeht.",
    "sentenceTranslation": {
      "ru": "Удивительно, как быстро проходит время.",
      "en": "It's amazing how fast time goes by."
    },
    "grammar": "",
    "translation": {
      "ru": "удивительный, поразительный",
      "en": "amazing, astonishing"
    },
    "pos": "Adjektiv",
    "base": "erstaunlich",
    "target": "erstaunlich"
  },
  {
    "id": 137,
    "sentence": "Die {{c1::Teilnahme}} ist kostenlos.",
    "blank": "Die _____ ist kostenlos.",
    "revealed": "Die Teilnahme ist kostenlos.",
    "sentenceTranslation": {
      "ru": "Участие бесплатное.",
      "en": "Participation is free."
    },
    "grammar": "die Teilnahme · meist ohne Plural",
    "translation": {
      "ru": "участие",
      "en": "participation"
    },
    "pos": "Substantiv",
    "base": "die Teilnahme",
    "target": "Teilnahme"
  },
  {
    "id": 138,
    "sentence": "Ich mag {{c1::sowohl}} Kaffee als auch Tee.",
    "blank": "Ich mag _____ Kaffee als auch Tee.",
    "revealed": "Ich mag sowohl Kaffee als auch Tee.",
    "sentenceTranslation": {
      "ru": "Я люблю и кофе, и чай.",
      "en": "I like both coffee and tea."
    },
    "grammar": "",
    "translation": {
      "ru": "как … так и",
      "en": "both … and"
    },
    "pos": "Verbindung",
    "base": "sowohl … als auch",
    "target": "sowohl"
  },
  {
    "id": 139,
    "sentence": "Zwei Stunden sind {{c1::ausreichend}}.",
    "blank": "Zwei Stunden sind _____.",
    "revealed": "Zwei Stunden sind ausreichend.",
    "sentenceTranslation": {
      "ru": "Двух часов достаточно.",
      "en": "Two hours are enough."
    },
    "grammar": "",
    "translation": {
      "ru": "достаточный",
      "en": "sufficient, enough"
    },
    "pos": "Adjektiv",
    "base": "ausreichend",
    "target": "ausreichend"
  },
  {
    "id": 140,
    "sentence": "Ich {{c1::bemühe}} mich, pünktlich zu sein.",
    "blank": "Ich _____ mich, pünktlich zu sein.",
    "revealed": "Ich bemühe mich, pünktlich zu sein.",
    "sentenceTranslation": {
      "ru": "Я стараюсь быть вовремя.",
      "en": "I try hard to be on time."
    },
    "grammar": "sich bemühen · bemühte sich · hat sich bemüht",
    "translation": {
      "ru": "стараться, прилагать усилия",
      "en": "to try hard, to make an effort"
    },
    "pos": "Verb",
    "base": "sich bemühen",
    "target": "bemühe"
  },
  {
    "id": 141,
    "sentence": "Kannst du bitte die Vorhänge {{c1::zuziehen}}?",
    "blank": "Kannst du bitte die Vorhänge _____?",
    "revealed": "Kannst du bitte die Vorhänge zuziehen?",
    "sentenceTranslation": {
      "ru": "Можешь, пожалуйста, задёрнуть шторы?",
      "en": "Can you draw the curtains, please?"
    },
    "grammar": "zuziehen · zog zu · hat zugezogen",
    "translation": {
      "ru": "задёргивать (шторы), закрывать, потянув на себя",
      "en": "to draw (curtains), to pull shut"
    },
    "pos": "Verb",
    "base": "zuziehen",
    "target": "zuziehen"
  },
  {
    "id": 142,
    "sentence": "Ich trinke {{c1::weder}} Cola noch Saft.",
    "blank": "Ich trinke _____ Cola noch Saft.",
    "revealed": "Ich trinke weder Cola noch Saft.",
    "sentenceTranslation": {
      "ru": "Я не пью ни колу, ни сок.",
      "en": "I drink neither cola nor juice."
    },
    "grammar": "",
    "translation": {
      "ru": "ни … ни",
      "en": "neither … nor"
    },
    "pos": "Verbindung",
    "base": "weder … noch",
    "target": "weder"
  },
  {
    "id": 143,
    "sentence": "Die Mitarbeiterin {{c1::berät}} mich.",
    "blank": "Die Mitarbeiterin _____ mich.",
    "revealed": "Die Mitarbeiterin berät mich.",
    "sentenceTranslation": {
      "ru": "Сотрудница меня консультирует.",
      "en": "The assistant is advising me."
    },
    "grammar": "beraten · du berätst / er berät · beriet · hat beraten",
    "translation": {
      "ru": "консультировать, советовать",
      "en": "to advise"
    },
    "pos": "Verb",
    "base": "beraten",
    "target": "berät"
  },
  {
    "id": 43,
    "sentence": "Musik kann mich schnell {{c1::beruhigen}}.",
    "blank": "Musik kann mich schnell _____.",
    "revealed": "Musik kann mich schnell beruhigen.",
    "sentenceTranslation": {
      "ru": "Музыка может быстро меня успокоить.",
      "en": "Music can calm me down quickly."
    },
    "grammar": "beruhigen · beruhigte · hat beruhigt",
    "translation": {
      "ru": "успокаивать",
      "en": "to calm (down)"
    },
    "pos": "Verb",
    "base": "beruhigen",
    "target": "beruhigen"
  },
  {
    "id": 144,
    "sentence": "Ich bin heute sehr {{c1::beschäftigt}}.",
    "blank": "Ich bin heute sehr _____.",
    "revealed": "Ich bin heute sehr beschäftigt.",
    "sentenceTranslation": {
      "ru": "Я сегодня очень занята.",
      "en": "I'm very busy today."
    },
    "grammar": "",
    "translation": {
      "ru": "занятый",
      "en": "busy"
    },
    "pos": "Adjektiv",
    "base": "beschäftigt",
    "target": "beschäftigt"
  },
  {
    "id": 145,
    "sentence": "Ich akzeptiere diese {{c1::Bedingung}} nicht.",
    "blank": "Ich akzeptiere diese _____ nicht.",
    "revealed": "Ich akzeptiere diese Bedingung nicht.",
    "sentenceTranslation": {
      "ru": "Я не принимаю это условие.",
      "en": "I don't accept this condition."
    },
    "grammar": "die Bedingung · die Bedingungen",
    "translation": {
      "ru": "условие",
      "en": "condition"
    },
    "pos": "Substantiv",
    "base": "die Bedingung",
    "target": "Bedingung"
  },
  {
    "id": 146,
    "sentence": "Bitte {{c1::berücksichtigen}} Sie meine Situation.",
    "blank": "Bitte _____ Sie meine Situation.",
    "revealed": "Bitte berücksichtigen Sie meine Situation.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, учтите мою ситуацию.",
      "en": "Please take my situation into account."
    },
    "grammar": "berücksichtigen · berücksichtigte · hat berücksichtigt",
    "translation": {
      "ru": "учитывать",
      "en": "to take into account"
    },
    "pos": "Verb",
    "base": "berücksichtigen",
    "target": "berücksichtigen"
  },
  {
    "id": 147,
    "sentence": "Der monatliche {{c1::Beitrag}} ist zu hoch.",
    "blank": "Der monatliche _____ ist zu hoch.",
    "revealed": "Der monatliche Beitrag ist zu hoch.",
    "sentenceTranslation": {
      "ru": "Ежемесячный взнос слишком высокий.",
      "en": "The monthly fee is too high."
    },
    "grammar": "der Beitrag · die Beiträge",
    "translation": {
      "ru": "вклад; взнос; публикация",
      "en": "contribution; fee; post (article)"
    },
    "pos": "Substantiv",
    "base": "der Beitrag",
    "target": "Beitrag"
  },
  {
    "id": 148,
    "sentence": "Bitte sprich {{c1::deutlich}}.",
    "blank": "Bitte sprich _____.",
    "revealed": "Bitte sprich deutlich.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, говори чётко.",
      "en": "Please speak clearly."
    },
    "grammar": "",
    "translation": {
      "ru": "ясный, отчётливый; чётко",
      "en": "clear; clearly"
    },
    "pos": "Adjektiv/Adverb",
    "base": "deutlich",
    "target": "deutlich"
  },
  {
    "id": 149,
    "sentence": "Wir {{c1::einigen}} uns auf Freitag.",
    "blank": "Wir _____ uns auf Freitag.",
    "revealed": "Wir einigen uns auf Freitag.",
    "sentenceTranslation": {
      "ru": "Мы договариваемся на пятницу.",
      "en": "We agree on Friday."
    },
    "grammar": "sich einigen · einigte sich · hat sich geeinigt",
    "translation": {
      "ru": "договариваться, приходить к согласию",
      "en": "to agree, to come to an agreement"
    },
    "pos": "Verb",
    "base": "sich einigen",
    "target": "einigen"
  },
  {
    "id": 150,
    "sentence": "Ich arbeite im kreativen {{c1::Bereich}}.",
    "blank": "Ich arbeite im kreativen _____.",
    "revealed": "Ich arbeite im kreativen Bereich.",
    "sentenceTranslation": {
      "ru": "Я работаю в творческой сфере.",
      "en": "I work in a creative field."
    },
    "grammar": "der Bereich · die Bereiche",
    "translation": {
      "ru": "область, сфера",
      "en": "area, field"
    },
    "pos": "Substantiv",
    "base": "der Bereich",
    "target": "Bereich"
  },
  {
    "id": 151,
    "sentence": "Ich {{c1::entdecke}} ein neues Café.",
    "blank": "Ich _____ ein neues Café.",
    "revealed": "Ich entdecke ein neues Café.",
    "sentenceTranslation": {
      "ru": "Я открываю для себя новое кафе.",
      "en": "I'm discovering a new café."
    },
    "grammar": "entdecken · entdeckte · hat entdeckt",
    "translation": {
      "ru": "обнаруживать, открывать",
      "en": "to discover"
    },
    "pos": "Verb",
    "base": "entdecken",
    "target": "entdecke"
  },
  {
    "id": 44,
    "sentence": "Am Wochenende möchte ich mich einfach {{c1::entspannen}}.",
    "blank": "Am Wochenende möchte ich mich einfach _____.",
    "revealed": "Am Wochenende möchte ich mich einfach entspannen.",
    "sentenceTranslation": {
      "ru": "На выходных я просто хочу расслабиться.",
      "en": "At the weekend I just want to relax."
    },
    "grammar": "sich entspannen · entspannte sich · hat sich entspannt",
    "translation": {
      "ru": "расслабляться, отдыхать",
      "en": "to relax"
    },
    "pos": "Verb",
    "base": "sich entspannen",
    "target": "entspannen"
  },
  {
    "id": 152,
    "sentence": "Ich brauche {{c1::dringend}} einen Kaffee.",
    "blank": "Ich brauche _____ einen Kaffee.",
    "revealed": "Ich brauche dringend einen Kaffee.",
    "sentenceTranslation": {
      "ru": "Мне срочно нужен кофе.",
      "en": "I urgently need a coffee."
    },
    "grammar": "",
    "translation": {
      "ru": "срочный; срочно",
      "en": "urgent; urgently"
    },
    "pos": "Adjektiv/Adverb",
    "base": "dringend",
    "target": "dringend"
  },
  {
    "id": 153,
    "sentence": "Ich warte noch auf den {{c1::Bescheid}}.",
    "blank": "Ich warte noch auf den _____.",
    "revealed": "Ich warte noch auf den Bescheid.",
    "sentenceTranslation": {
      "ru": "Я всё ещё жду официального решения.",
      "en": "I'm still waiting for the decision."
    },
    "grammar": "der Bescheid · die Bescheide",
    "translation": {
      "ru": "официальное решение, уведомление",
      "en": "official decision, notice"
    },
    "pos": "Substantiv",
    "base": "der Bescheid",
    "target": "Bescheid"
  },
  {
    "id": 59,
    "sentence": "Sei bitte {{c1::ehrlich}} zu mir.",
    "blank": "Sei bitte _____ zu mir.",
    "revealed": "Sei bitte ehrlich zu mir.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, будь со мной честна.",
      "en": "Please be honest with me."
    },
    "grammar": "",
    "translation": {
      "ru": "честный",
      "en": "honest"
    },
    "pos": "Adjektiv",
    "base": "ehrlich",
    "target": "ehrlich"
  },
  {
    "id": 154,
    "sentence": "Die Situation {{c1::entwickelt}} sich gut.",
    "blank": "Die Situation _____ sich gut.",
    "revealed": "Die Situation entwickelt sich gut.",
    "sentenceTranslation": {
      "ru": "Ситуация развивается хорошо.",
      "en": "The situation is developing well."
    },
    "grammar": "sich entwickeln · entwickelte sich · hat sich entwickelt",
    "translation": {
      "ru": "развиваться",
      "en": "to develop"
    },
    "pos": "Verb",
    "base": "sich entwickeln",
    "target": "entwickelt"
  },
  {
    "id": 155,
    "sentence": "Der {{c1::Betrieb}} hat zwanzig Mitarbeiter.",
    "blank": "Der _____ hat zwanzig Mitarbeiter.",
    "revealed": "Der Betrieb hat zwanzig Mitarbeiter.",
    "sentenceTranslation": {
      "ru": "На предприятии двадцать сотрудников.",
      "en": "The company has twenty employees."
    },
    "grammar": "der Betrieb · die Betriebe",
    "translation": {
      "ru": "предприятие, работа",
      "en": "company, business; operation"
    },
    "pos": "Substantiv",
    "base": "der Betrieb",
    "target": "Betrieb"
  },
  {
    "id": 156,
    "sentence": "Mir {{c1::fehlt}} die Zeit.",
    "blank": "Mir _____ die Zeit.",
    "revealed": "Mir fehlt die Zeit.",
    "sentenceTranslation": {
      "ru": "Мне не хватает времени.",
      "en": "I don't have the time."
    },
    "grammar": "fehlen · fehlte · hat gefehlt",
    "translation": {
      "ru": "отсутствовать; не хватать",
      "en": "to be missing; to be lacking"
    },
    "pos": "Verb",
    "base": "fehlen",
    "target": "fehlt"
  },
  {
    "id": 157,
    "sentence": "Ich möchte eine {{c1::eigen}}e Wohnung.",
    "blank": "Ich möchte eine _____e Wohnung.",
    "revealed": "Ich möchte eine eigene Wohnung.",
    "sentenceTranslation": {
      "ru": "Я хочу собственную квартиру.",
      "en": "I'd like a flat of my own."
    },
    "grammar": "",
    "translation": {
      "ru": "собственный",
      "en": "own"
    },
    "pos": "Adjektiv",
    "base": "eigen",
    "target": "eigen"
  },
  {
    "id": 45,
    "sentence": "Er hat versucht, mich zu {{c1::betrügen}}.",
    "blank": "Er hat versucht, mich zu _____.",
    "revealed": "Er hat versucht, mich zu betrügen.",
    "sentenceTranslation": {
      "ru": "Он пытался меня обмануть.",
      "en": "He tried to cheat me."
    },
    "grammar": "betrügen · betrog · hat betrogen",
    "translation": {
      "ru": "обманывать, мошенничать",
      "en": "to cheat, to deceive"
    },
    "pos": "Verb",
    "base": "betrügen",
    "target": "betrügen"
  },
  {
    "id": 158,
    "sentence": "Das ist eine gute {{c1::Gelegenheit}}.",
    "blank": "Das ist eine gute _____.",
    "revealed": "Das ist eine gute Gelegenheit.",
    "sentenceTranslation": {
      "ru": "Это хорошая возможность.",
      "en": "That's a good opportunity."
    },
    "grammar": "die Gelegenheit · die Gelegenheiten",
    "translation": {
      "ru": "возможность, случай",
      "en": "opportunity, chance"
    },
    "pos": "Substantiv",
    "base": "die Gelegenheit",
    "target": "Gelegenheit"
  },
  {
    "id": 159,
    "sentence": "Das Ticket {{c1::gilt}} nur heute.",
    "blank": "Das Ticket _____ nur heute.",
    "revealed": "Das Ticket gilt nur heute.",
    "sentenceTranslation": {
      "ru": "Билет действует только сегодня.",
      "en": "The ticket is only valid today."
    },
    "grammar": "gelten · du giltst / es gilt · galt · hat gegolten",
    "translation": {
      "ru": "действовать; считаться",
      "en": "to be valid; to be considered"
    },
    "pos": "Verb",
    "base": "gelten",
    "target": "gilt"
  },
  {
    "id": 160,
    "sentence": "Die {{c1::Gebühr}} beträgt zwanzig Euro.",
    "blank": "Die _____ beträgt zwanzig Euro.",
    "revealed": "Die Gebühr beträgt zwanzig Euro.",
    "sentenceTranslation": {
      "ru": "Сбор составляет двадцать евро.",
      "en": "The fee is twenty euros."
    },
    "grammar": "die Gebühr · die Gebühren",
    "translation": {
      "ru": "сбор, плата",
      "en": "fee, charge"
    },
    "pos": "Substantiv",
    "base": "die Gebühr",
    "target": "Gebühr"
  },
  {
    "id": 161,
    "sentence": "Allein zu Hause fühle ich mich manchmal {{c1::einsam}}.",
    "blank": "Allein zu Hause fühle ich mich manchmal _____.",
    "revealed": "Allein zu Hause fühle ich mich manchmal einsam.",
    "sentenceTranslation": {
      "ru": "Одна дома я иногда чувствую себя одиноко.",
      "en": "Alone at home, I sometimes feel lonely."
    },
    "grammar": "",
    "translation": {
      "ru": "одинокий",
      "en": "lonely"
    },
    "pos": "Adjektiv",
    "base": "einsam",
    "target": "einsam"
  },
  {
    "id": 162,
    "sentence": "Ich {{c1::genieße}} meinen Kaffee.",
    "blank": "Ich _____ meinen Kaffee.",
    "revealed": "Ich genieße meinen Kaffee.",
    "sentenceTranslation": {
      "ru": "Я наслаждаюсь своим кофе.",
      "en": "I'm enjoying my coffee."
    },
    "grammar": "genießen · genoss · hat genossen",
    "translation": {
      "ru": "наслаждаться",
      "en": "to enjoy"
    },
    "pos": "Verb",
    "base": "genießen",
    "target": "genieße"
  },
  {
    "id": 163,
    "sentence": "Ich schicke die {{c1::Kündigung}} per Post.",
    "blank": "Ich schicke die _____ per Post.",
    "revealed": "Ich schicke die Kündigung per Post.",
    "sentenceTranslation": {
      "ru": "Я отправляю расторжение договора по почте.",
      "en": "I'm sending the cancellation by post."
    },
    "grammar": "die Kündigung · die Kündigungen",
    "translation": {
      "ru": "увольнение, расторжение",
      "en": "resignation; cancellation (of a contract)"
    },
    "pos": "Substantiv",
    "base": "die Kündigung",
    "target": "Kündigung"
  },
  {
    "id": 164,
    "sentence": "Ich {{c1::schaffe}} das heute nicht.",
    "blank": "Ich _____ das heute nicht.",
    "revealed": "Ich schaffe das heute nicht.",
    "sentenceTranslation": {
      "ru": "Я сегодня с этим не справлюсь.",
      "en": "I won't manage it today."
    },
    "grammar": "schaffen · schaffte · hat geschafft",
    "translation": {
      "ru": "справляться, успевать",
      "en": "to manage, to make it"
    },
    "pos": "Verb",
    "base": "schaffen",
    "target": "schaffe"
  },
  {
    "id": 165,
    "sentence": "Der {{c1::Schaden}} am Auto ist klein.",
    "blank": "Der _____ am Auto ist klein.",
    "revealed": "Der Schaden am Auto ist klein.",
    "sentenceTranslation": {
      "ru": "Повреждение машины небольшое.",
      "en": "The damage to the car is minor."
    },
    "grammar": "der Schaden · die Schäden",
    "translation": {
      "ru": "ущерб, повреждение",
      "en": "damage"
    },
    "pos": "Substantiv",
    "base": "der Schaden",
    "target": "Schaden"
  },
  {
    "id": 48,
    "sentence": "Vor einer Reise spüre ich immer große {{c1::Vorfreude}}.",
    "blank": "Vor einer Reise spüre ich immer große _____.",
    "revealed": "Vor einer Reise spüre ich immer große Vorfreude.",
    "sentenceTranslation": {
      "ru": "Перед поездкой я всегда испытываю приятное предвкушение.",
      "en": "Before a trip I always feel great anticipation."
    },
    "grammar": "die Vorfreude · kein Plural",
    "translation": {
      "ru": "предвкушение, радостное ожидание",
      "en": "anticipation, looking forward"
    },
    "pos": "Substantiv",
    "base": "die Vorfreude",
    "target": "Vorfreude"
  },
  {
    "id": 166,
    "sentence": "Ich {{c1::gebe}} nicht {{c1::auf}}.",
    "blank": "Ich _____ nicht _____.",
    "revealed": "Ich gebe nicht auf.",
    "sentenceTranslation": {
      "ru": "Я не сдаюсь.",
      "en": "I'm not giving up."
    },
    "grammar": "aufgeben · du gibst auf / er gibt auf · gab auf · hat aufgegeben",
    "translation": {
      "ru": "сдаваться; отказываться",
      "en": "to give up"
    },
    "pos": "Verb",
    "base": "aufgeben",
    "target": "gebe / auf"
  },
  {
    "id": 167,
    "sentence": "Der {{c1::Umzug}} nach München war teuer.",
    "blank": "Der _____ nach München war teuer.",
    "revealed": "Der Umzug nach München war teuer.",
    "sentenceTranslation": {
      "ru": "Переезд в Мюнхен был дорогим.",
      "en": "The move to Munich was expensive."
    },
    "grammar": "der Umzug · die Umzüge",
    "translation": {
      "ru": "переезд",
      "en": "move (to a new home)"
    },
    "pos": "Substantiv",
    "base": "der Umzug",
    "target": "Umzug"
  },
  {
    "id": 168,
    "sentence": "Das klingt {{c1::sinnvoll}}.",
    "blank": "Das klingt _____.",
    "revealed": "Das klingt sinnvoll.",
    "sentenceTranslation": {
      "ru": "Это звучит разумно.",
      "en": "That sounds sensible."
    },
    "grammar": "",
    "translation": {
      "ru": "целесообразный, осмысленный",
      "en": "sensible, useful"
    },
    "pos": "Adjektiv",
    "base": "sinnvoll",
    "target": "sinnvoll"
  },
  {
    "id": 169,
    "sentence": "Ich {{c1::höre}} mit dem Rauchen {{c1::auf}}.",
    "blank": "Ich _____ mit dem Rauchen _____.",
    "revealed": "Ich höre mit dem Rauchen auf.",
    "sentenceTranslation": {
      "ru": "Я прекращаю курить.",
      "en": "I'm quitting smoking."
    },
    "grammar": "aufhören · hörte auf · hat aufgehört",
    "translation": {
      "ru": "прекращать",
      "en": "to stop"
    },
    "pos": "Verb",
    "base": "aufhören",
    "target": "höre / auf"
  },
  {
    "id": 170,
    "sentence": "Das war nicht meine {{c1::Absicht}}.",
    "blank": "Das war nicht meine _____.",
    "revealed": "Das war nicht meine Absicht.",
    "sentenceTranslation": {
      "ru": "Это не было моим намерением.",
      "en": "That wasn't my intention."
    },
    "grammar": "die Absicht · die Absichten",
    "translation": {
      "ru": "намерение",
      "en": "intention"
    },
    "pos": "Substantiv",
    "base": "die Absicht",
    "target": "Absicht"
  },
  {
    "id": 171,
    "sentence": "Ich {{c1::gebe}} zu viel Geld für Kaffee {{c1::aus}}.",
    "blank": "Ich _____ zu viel Geld für Kaffee _____.",
    "revealed": "Ich gebe zu viel Geld für Kaffee aus.",
    "sentenceTranslation": {
      "ru": "Я трачу слишком много денег на кофе.",
      "en": "I spend too much money on coffee."
    },
    "grammar": "ausgeben · du gibst aus / er gibt aus · gab aus · hat ausgegeben",
    "translation": {
      "ru": "тратить; выдавать",
      "en": "to spend (money); to hand out"
    },
    "pos": "Verb",
    "base": "ausgeben",
    "target": "gebe / aus"
  },
  {
    "id": 172,
    "sentence": "Wir haben {{c1::unterschiedlich}}e Meinungen.",
    "blank": "Wir haben _____e Meinungen.",
    "revealed": "Wir haben unterschiedliche Meinungen.",
    "sentenceTranslation": {
      "ru": "У нас разные мнения.",
      "en": "We have different opinions."
    },
    "grammar": "",
    "translation": {
      "ru": "различный, разный",
      "en": "different, various"
    },
    "pos": "Adjektiv",
    "base": "unterschiedlich",
    "target": "unterschiedlich"
  },
  {
    "id": 49,
    "sentence": "Er empfand ein bisschen {{c1::Schadenfreude}}, als sein Konkurrent verlor.",
    "blank": "Er empfand ein bisschen _____, als sein Konkurrent verlor.",
    "revealed": "Er empfand ein bisschen Schadenfreude, als sein Konkurrent verlor.",
    "sentenceTranslation": {
      "ru": "Он испытал немного злорадства, когда его конкурент проиграл.",
      "en": "He felt a bit of schadenfreude when his competitor lost."
    },
    "grammar": "die Schadenfreude · kein Plural",
    "translation": {
      "ru": "злорадство",
      "en": "gloating (joy at others' bad luck)"
    },
    "pos": "Substantiv",
    "base": "die Schadenfreude",
    "target": "Schadenfreude"
  },
  {
    "id": 173,
    "sentence": "Heute mache ich eine {{c1::Ausnahme}}.",
    "blank": "Heute mache ich eine _____.",
    "revealed": "Heute mache ich eine Ausnahme.",
    "sentenceTranslation": {
      "ru": "Сегодня я сделаю исключение.",
      "en": "Today I'll make an exception."
    },
    "grammar": "die Ausnahme · die Ausnahmen",
    "translation": {
      "ru": "исключение",
      "en": "exception"
    },
    "pos": "Substantiv",
    "base": "die Ausnahme",
    "target": "Ausnahme"
  },
  {
    "id": 174,
    "sentence": "Bitte {{c1::beachten}} Sie die Öffnungszeiten.",
    "blank": "Bitte _____ Sie die Öffnungszeiten.",
    "revealed": "Bitte beachten Sie die Öffnungszeiten.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, обратите внимание на часы работы.",
      "en": "Please note the opening hours."
    },
    "grammar": "beachten · beachtete · hat beachtet",
    "translation": {
      "ru": "учитывать, обращать внимание",
      "en": "to pay attention to, to note"
    },
    "pos": "Verb",
    "base": "beachten",
    "target": "beachten"
  },
  {
    "id": 175,
    "sentence": "Mein erster {{c1::Eindruck}} war gut.",
    "blank": "Mein erster _____ war gut.",
    "revealed": "Mein erster Eindruck war gut.",
    "sentenceTranslation": {
      "ru": "Моё первое впечатление было хорошим.",
      "en": "My first impression was good."
    },
    "grammar": "der Eindruck · die Eindrücke",
    "translation": {
      "ru": "впечатление",
      "en": "impression"
    },
    "pos": "Substantiv",
    "base": "der Eindruck",
    "target": "Eindruck"
  },
  {
    "id": 176,
    "sentence": "Der Termin ist nicht mehr {{c1::verfügbar}}.",
    "blank": "Der Termin ist nicht mehr _____.",
    "revealed": "Der Termin ist nicht mehr verfügbar.",
    "sentenceTranslation": {
      "ru": "Эта запись больше недоступна.",
      "en": "The appointment is no longer available."
    },
    "grammar": "",
    "translation": {
      "ru": "доступный, имеющийся",
      "en": "available"
    },
    "pos": "Adjektiv",
    "base": "verfügbar",
    "target": "verfügbar"
  },
  {
    "id": 177,
    "sentence": "Gib mir bitte morgen {{c1::Bescheid}}.",
    "blank": "Gib mir bitte morgen _____.",
    "revealed": "Gib mir bitte morgen Bescheid.",
    "sentenceTranslation": {
      "ru": "Дай мне, пожалуйста, знать завтра.",
      "en": "Please let me know tomorrow."
    },
    "grammar": "Bescheid geben · gab Bescheid · hat Bescheid gegeben",
    "translation": {
      "ru": "дать знать, сообщить",
      "en": "to let (someone) know"
    },
    "pos": "Verb",
    "base": "Bescheid geben",
    "target": "Bescheid"
  },
  {
    "id": 178,
    "sentence": "Stress hat großen {{c1::Einfluss}} auf mich.",
    "blank": "Stress hat großen _____ auf mich.",
    "revealed": "Stress hat großen Einfluss auf mich.",
    "sentenceTranslation": {
      "ru": "Стресс сильно на меня влияет.",
      "en": "Stress has a big influence on me."
    },
    "grammar": "der Einfluss · die Einflüsse",
    "translation": {
      "ru": "влияние",
      "en": "influence"
    },
    "pos": "Substantiv",
    "base": "der Einfluss",
    "target": "Einfluss"
  },
  {
    "id": 179,
    "sentence": "Die Firma {{c1::entlässt}} zehn Mitarbeiter.",
    "blank": "Die Firma _____ zehn Mitarbeiter.",
    "revealed": "Die Firma entlässt zehn Mitarbeiter.",
    "sentenceTranslation": {
      "ru": "Компания увольняет десять сотрудников.",
      "en": "The company is laying off ten employees."
    },
    "grammar": "entlassen · du entlässt / er entlässt · entließ · hat entlassen",
    "translation": {
      "ru": "увольнять; отпускать",
      "en": "to dismiss, to lay off; to discharge"
    },
    "pos": "Verb",
    "base": "entlassen",
    "target": "entlässt"
  },
  {
    "id": 180,
    "sentence": "Das kann schlimme {{c1::Folge}}n haben.",
    "blank": "Das kann schlimme _____n haben.",
    "revealed": "Das kann schlimme Folgen haben.",
    "sentenceTranslation": {
      "ru": "У этого могут быть плохие последствия.",
      "en": "That can have serious consequences."
    },
    "grammar": "die Folge · die Folgen",
    "translation": {
      "ru": "последствие; серия",
      "en": "consequence; episode"
    },
    "pos": "Substantiv",
    "base": "die Folge",
    "target": "Folge"
  },
  {
    "id": 51,
    "sentence": "Sie ist ein sehr {{c1::warmherziger}} Mensch.",
    "blank": "Sie ist ein sehr _____ Mensch.",
    "revealed": "Sie ist ein sehr warmherziger Mensch.",
    "sentenceTranslation": {
      "ru": "Она очень душевный и добрый человек.",
      "en": "She's a very warm-hearted person."
    },
    "grammar": "",
    "translation": {
      "ru": "душевный, сердечный, добрый",
      "en": "warm-hearted, kind"
    },
    "pos": "Adjektiv",
    "base": "warmherzig",
    "target": "warmherziger"
  },
  {
    "id": 181,
    "sentence": "Ich habe das gestern {{c1::erfahren}}.",
    "blank": "Ich habe das gestern _____.",
    "revealed": "Ich habe das gestern erfahren.",
    "sentenceTranslation": {
      "ru": "Я узнала об этом вчера.",
      "en": "I found out about it yesterday."
    },
    "grammar": "erfahren · erfuhr · hat erfahren",
    "translation": {
      "ru": "узнавать; испытывать",
      "en": "to find out, to learn; to experience"
    },
    "pos": "Verb",
    "base": "erfahren",
    "target": "erfahren"
  },
  {
    "id": 182,
    "sentence": "Das {{c1::Gerät}} funktioniert nicht.",
    "blank": "Das _____ funktioniert nicht.",
    "revealed": "Das Gerät funktioniert nicht.",
    "sentenceTranslation": {
      "ru": "Устройство не работает.",
      "en": "The device isn't working."
    },
    "grammar": "das Gerät · die Geräte",
    "translation": {
      "ru": "прибор, устройство",
      "en": "device, appliance"
    },
    "pos": "Substantiv",
    "base": "das Gerät",
    "target": "Gerät"
  },
  {
    "id": 183,
    "sentence": "Ich {{c1::erreiche}} den Zug noch.",
    "blank": "Ich _____ den Zug noch.",
    "revealed": "Ich erreiche den Zug noch.",
    "sentenceTranslation": {
      "ru": "Я ещё успеваю на поезд.",
      "en": "I can still catch the train."
    },
    "grammar": "erreichen · erreichte · hat erreicht",
    "translation": {
      "ru": "достигать; дозваниваться",
      "en": "to reach; to catch (a train)"
    },
    "pos": "Verb",
    "base": "erreichen",
    "target": "erreiche"
  },
  {
    "id": 184,
    "sentence": "Das {{c1::Gesetz}} gilt seit Januar.",
    "blank": "Das _____ gilt seit Januar.",
    "revealed": "Das Gesetz gilt seit Januar.",
    "sentenceTranslation": {
      "ru": "Закон действует с января.",
      "en": "The law has been in force since January."
    },
    "grammar": "das Gesetz · die Gesetze",
    "translation": {
      "ru": "закон",
      "en": "law"
    },
    "pos": "Substantiv",
    "base": "das Gesetz",
    "target": "Gesetz"
  },
  {
    "id": 185,
    "sentence": "Ich {{c1::erkenne}} ihn sofort.",
    "blank": "Ich _____ ihn sofort.",
    "revealed": "Ich erkenne ihn sofort.",
    "sentenceTranslation": {
      "ru": "Я сразу его узнаю.",
      "en": "I recognise him immediately."
    },
    "grammar": "erkennen · erkannte · hat erkannt",
    "translation": {
      "ru": "узнавать, распознавать",
      "en": "to recognise"
    },
    "pos": "Verb",
    "base": "erkennen",
    "target": "erkenne"
  },
  {
    "id": 186,
    "sentence": "Ich hasse den {{c1::Haushalt}}.",
    "blank": "Ich hasse den _____.",
    "revealed": "Ich hasse den Haushalt.",
    "sentenceTranslation": {
      "ru": "Я ненавижу домашние дела.",
      "en": "I hate housework."
    },
    "grammar": "der Haushalt · die Haushalte",
    "translation": {
      "ru": "домашнее хозяйство, бюджет",
      "en": "household, housework; budget"
    },
    "pos": "Substantiv",
    "base": "der Haushalt",
    "target": "Haushalt"
  },
  {
    "id": 187,
    "sentence": "Sie {{c1::erwähnt}} das Problem nicht.",
    "blank": "Sie _____ das Problem nicht.",
    "revealed": "Sie erwähnt das Problem nicht.",
    "sentenceTranslation": {
      "ru": "Она не упоминает проблему.",
      "en": "She doesn't mention the problem."
    },
    "grammar": "erwähnen · erwähnte · hat erwähnt",
    "translation": {
      "ru": "упоминать",
      "en": "to mention"
    },
    "pos": "Verb",
    "base": "erwähnen",
    "target": "erwähnt"
  },
  {
    "id": 52,
    "sentence": "Er war völlig {{c1::verzweifelt}}, weil er keine Lösung gefunden hatte.",
    "blank": "Er war völlig _____, weil er keine Lösung gefunden hatte.",
    "revealed": "Er war völlig verzweifelt, weil er keine Lösung gefunden hatte.",
    "sentenceTranslation": {
      "ru": "Он был в полном отчаянии, потому что не нашёл решения.",
      "en": "He was completely desperate because he hadn't found a solution."
    },
    "grammar": "",
    "translation": {
      "ru": "отчаявшийся, в отчаянии",
      "en": "desperate"
    },
    "pos": "Adjektiv",
    "base": "verzweifelt",
    "target": "verzweifelt"
  },
  {
    "id": 188,
    "sentence": "Die {{c1::Herkunft}} spielt keine Rolle.",
    "blank": "Die _____ spielt keine Rolle.",
    "revealed": "Die Herkunft spielt keine Rolle.",
    "sentenceTranslation": {
      "ru": "Происхождение не имеет значения.",
      "en": "Where you come from doesn't matter."
    },
    "grammar": "die Herkunft · meist ohne Plural",
    "translation": {
      "ru": "происхождение",
      "en": "origin, background"
    },
    "pos": "Substantiv",
    "base": "die Herkunft",
    "target": "Herkunft"
  },
  {
    "id": 189,
    "sentence": "Bitte {{c1::teilen}} Sie mir Ihre Entscheidung {{c1::mit}}.",
    "blank": "Bitte _____ Sie mir Ihre Entscheidung _____.",
    "revealed": "Bitte teilen Sie mir Ihre Entscheidung mit.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, сообщите мне ваше решение.",
      "en": "Please let me know your decision."
    },
    "grammar": "mitteilen · teilte mit · hat mitgeteilt",
    "translation": {
      "ru": "сообщать",
      "en": "to inform, to let know"
    },
    "pos": "Verb",
    "base": "mitteilen",
    "target": "teilen / mit"
  },
  {
    "id": 190,
    "sentence": "Das war eine gute {{c1::Leistung}}.",
    "blank": "Das war eine gute _____.",
    "revealed": "Das war eine gute Leistung.",
    "sentenceTranslation": {
      "ru": "Это был хороший результат / достижение.",
      "en": "That was a good performance."
    },
    "grammar": "die Leistung · die Leistungen",
    "translation": {
      "ru": "результат, достижение; производительность",
      "en": "performance, achievement"
    },
    "pos": "Substantiv",
    "base": "die Leistung",
    "target": "Leistung"
  },
  {
    "id": 191,
    "sentence": "Ich {{c1::prüfe}} die Rechnung noch einmal.",
    "blank": "Ich _____ die Rechnung noch einmal.",
    "revealed": "Ich prüfe die Rechnung noch einmal.",
    "sentenceTranslation": {
      "ru": "Я ещё раз проверяю счёт.",
      "en": "I'm checking the bill again."
    },
    "grammar": "prüfen · prüfte · hat geprüft",
    "translation": {
      "ru": "проверять, экзаменовать",
      "en": "to check; to examine"
    },
    "pos": "Verb",
    "base": "prüfen",
    "target": "prüfe"
  },
  {
    "id": 192,
    "sentence": "Es gibt einen {{c1::Mangel}} an Personal.",
    "blank": "Es gibt einen _____ an Personal.",
    "revealed": "Es gibt einen Mangel an Personal.",
    "sentenceTranslation": {
      "ru": "Не хватает персонала.",
      "en": "There's a shortage of staff."
    },
    "grammar": "der Mangel · die Mängel",
    "translation": {
      "ru": "недостаток, нехватка",
      "en": "shortage, lack"
    },
    "pos": "Substantiv",
    "base": "der Mangel",
    "target": "Mangel"
  },
  {
    "id": 193,
    "sentence": "Ich {{c1::vergleiche}} die Preise.",
    "blank": "Ich _____ die Preise.",
    "revealed": "Ich vergleiche die Preise.",
    "sentenceTranslation": {
      "ru": "Я сравниваю цены.",
      "en": "I'm comparing the prices."
    },
    "grammar": "vergleichen · verglich · hat verglichen",
    "translation": {
      "ru": "сравнивать",
      "en": "to compare"
    },
    "pos": "Verb",
    "base": "vergleichen",
    "target": "vergleiche"
  },
  {
    "id": 194,
    "sentence": "Ich {{c1::werfe}} den Ball.",
    "blank": "Ich _____ den Ball.",
    "revealed": "Ich werfe den Ball.",
    "sentenceTranslation": {
      "ru": "Я бросаю мяч.",
      "en": "I'm throwing the ball."
    },
    "grammar": "werfen · warf · hat geworfen",
    "translation": {
      "ru": "бросать",
      "en": "to throw"
    },
    "pos": "Verb",
    "base": "werfen",
    "target": "werfe"
  },
  {
    "id": 195,
    "sentence": "Ich {{c1::verspreche}}, pünktlich zu sein.",
    "blank": "Ich _____, pünktlich zu sein.",
    "revealed": "Ich verspreche, pünktlich zu sein.",
    "sentenceTranslation": {
      "ru": "Я обещаю быть вовремя.",
      "en": "I promise to be on time."
    },
    "grammar": "versprechen · du versprichst / er verspricht · versprach · hat versprochen",
    "translation": {
      "ru": "обещать",
      "en": "to promise"
    },
    "pos": "Verb",
    "base": "versprechen",
    "target": "verspreche"
  },
  {
    "id": 53,
    "sentence": "Er reagierte völlig {{c1::gleichgültig}} auf die Nachricht.",
    "blank": "Er reagierte völlig _____ auf die Nachricht.",
    "revealed": "Er reagierte völlig gleichgültig auf die Nachricht.",
    "sentenceTranslation": {
      "ru": "Он совершенно безразлично отреагировал на сообщение.",
      "en": "He reacted to the news with complete indifference."
    },
    "grammar": "gleichgültig gegenüber + Dat.",
    "translation": {
      "ru": "безразличный, равнодушный",
      "en": "indifferent"
    },
    "pos": "Adjektiv",
    "base": "gleichgültig",
    "target": "gleichgültig"
  },
  {
    "id": 196,
    "sentence": "Das Glas {{c1::fällt}} auf den Boden.",
    "blank": "Das Glas _____ auf den Boden.",
    "revealed": "Das Glas fällt auf den Boden.",
    "sentenceTranslation": {
      "ru": "Стакан падает на пол.",
      "en": "The glass falls to the floor."
    },
    "grammar": "fallen · fiel · ist gefallen",
    "translation": {
      "ru": "падать",
      "en": "to fall"
    },
    "pos": "Verb",
    "base": "fallen",
    "target": "fällt"
  },
  {
    "id": 197,
    "sentence": "Ich {{c1::ärgere}} mich über die Verspätung.",
    "blank": "Ich _____ mich über die Verspätung.",
    "revealed": "Ich ärgere mich über die Verspätung.",
    "sentenceTranslation": {
      "ru": "Я злюсь из-за задержки.",
      "en": "I'm annoyed about the delay."
    },
    "grammar": "sich ärgern über + Akk. · ärgerte sich · hat sich geärgert",
    "translation": {
      "ru": "злиться, раздражаться из-за",
      "en": "to be annoyed about"
    },
    "pos": "Verb",
    "base": "sich ärgern über + Akk.",
    "target": "ärgere"
  },
  {
    "id": 198,
    "sentence": "{{c1::Sicherheit}} ist mir wichtig.",
    "blank": "_____ ist mir wichtig.",
    "revealed": "Sicherheit ist mir wichtig.",
    "sentenceTranslation": {
      "ru": "Безопасность для меня важна.",
      "en": "Safety is important to me."
    },
    "grammar": {
      "ru": "die Sicherheit · meist ohne Plural (Sicherheiten = гарантии/обеспечение)",
      "en": "die Sicherheit · mostly no plural (Sicherheiten = guarantees, collateral)"
    },
    "translation": {
      "ru": "безопасность, уверенность",
      "en": "safety, security; certainty"
    },
    "pos": "Substantiv",
    "base": "die Sicherheit",
    "target": "Sicherheit"
  },
  {
    "id": 199,
    "sentence": "Ich {{c1::kenne}} mich hier nicht {{c1::aus}}.",
    "blank": "Ich _____ mich hier nicht _____.",
    "revealed": "Ich kenne mich hier nicht aus.",
    "sentenceTranslation": {
      "ru": "Я здесь не ориентируюсь / не разбираюсь.",
      "en": "I don't know my way around here."
    },
    "grammar": "sich auskennen · kannte sich aus · hat sich ausgekannt",
    "translation": {
      "ru": "разбираться, ориентироваться",
      "en": "to know your way around"
    },
    "pos": "Verb",
    "base": "sich auskennen",
    "target": "kenne / aus"
  },
  {
    "id": 200,
    "sentence": "Ich {{c1::hebe}} das Buch vom Boden {{c1::auf}}.",
    "blank": "Ich _____ das Buch vom Boden _____.",
    "revealed": "Ich hebe das Buch vom Boden auf.",
    "sentenceTranslation": {
      "ru": "Я поднимаю книгу с пола.",
      "en": "I pick the book up off the floor."
    },
    "grammar": "aufheben · hob auf · hat aufgehoben",
    "translation": {
      "ru": "поднимать (с поверхности)",
      "en": "to pick up (from the floor)"
    },
    "pos": "Verb",
    "base": "aufheben",
    "target": "hebe / auf"
  },
  {
    "id": 201,
    "sentence": "Das Hotel {{c1::befindet}} sich im Zentrum.",
    "blank": "Das Hotel _____ sich im Zentrum.",
    "revealed": "Das Hotel befindet sich im Zentrum.",
    "sentenceTranslation": {
      "ru": "Отель находится в центре.",
      "en": "The hotel is in the centre."
    },
    "grammar": "sich befinden · befand sich · hat sich befunden",
    "translation": {
      "ru": "находиться",
      "en": "to be (located)"
    },
    "pos": "Verb",
    "base": "sich befinden",
    "target": "befindet"
  },
  {
    "id": 202,
    "sentence": "Wir suchen die {{c1::Ursache}}.",
    "blank": "Wir suchen die _____.",
    "revealed": "Wir suchen die Ursache.",
    "sentenceTranslation": {
      "ru": "Мы ищем причину.",
      "en": "We're looking for the cause."
    },
    "grammar": "die Ursache · die Ursachen",
    "translation": {
      "ru": "причина",
      "en": "cause"
    },
    "pos": "Substantiv",
    "base": "die Ursache",
    "target": "Ursache"
  },
  {
    "id": 54,
    "sentence": "Sie sieht {{c1::besorgt}} aus.",
    "blank": "Sie sieht _____ aus.",
    "revealed": "Sie sieht besorgt aus.",
    "sentenceTranslation": {
      "ru": "Она выглядит обеспокоенной.",
      "en": "She looks worried."
    },
    "grammar": "",
    "translation": {
      "ru": "обеспокоенный, встревоженный",
      "en": "worried, concerned"
    },
    "pos": "Adjektiv",
    "base": "besorgt",
    "target": "besorgt"
  },
  {
    "id": 203,
    "sentence": "Sport {{c1::trägt}} zur Gesundheit {{c1::bei}}.",
    "blank": "Sport _____ zur Gesundheit _____.",
    "revealed": "Sport trägt zur Gesundheit bei.",
    "sentenceTranslation": {
      "ru": "Спорт способствует здоровью.",
      "en": "Sport contributes to good health."
    },
    "grammar": "beitragen zu + Dat. · du trägst bei / er trägt bei · trug bei · hat beigetragen",
    "translation": {
      "ru": "способствовать, вносить вклад в",
      "en": "to contribute to"
    },
    "pos": "Verb",
    "base": "beitragen zu + Dat.",
    "target": "trägt / bei"
  },
  {
    "id": 204,
    "sentence": "Die {{c1::Verbindung}} nach Berlin ist direkt.",
    "blank": "Die _____ nach Berlin ist direkt.",
    "revealed": "Die Verbindung nach Berlin ist direkt.",
    "sentenceTranslation": {
      "ru": "До Берлина есть прямое сообщение.",
      "en": "There's a direct connection to Berlin."
    },
    "grammar": "die Verbindung · die Verbindungen",
    "translation": {
      "ru": "связь, соединение",
      "en": "connection"
    },
    "pos": "Substantiv",
    "base": "die Verbindung",
    "target": "Verbindung"
  },
  {
    "id": 205,
    "sentence": "Bitte {{c1::bestätigen}} Sie den Termin.",
    "blank": "Bitte _____ Sie den Termin.",
    "revealed": "Bitte bestätigen Sie den Termin.",
    "sentenceTranslation": {
      "ru": "Пожалуйста, подтвердите встречу.",
      "en": "Please confirm the appointment."
    },
    "grammar": "bestätigen · bestätigte · hat bestätigt",
    "translation": {
      "ru": "подтверждать",
      "en": "to confirm"
    },
    "pos": "Verb",
    "base": "bestätigen",
    "target": "bestätigen"
  },
  {
    "id": 206,
    "sentence": "Welchen {{c1::Zweck}} hat das?",
    "blank": "Welchen _____ hat das?",
    "revealed": "Welchen Zweck hat das?",
    "sentenceTranslation": {
      "ru": "Какой в этом смысл?",
      "en": "What's the point of that?"
    },
    "grammar": "der Zweck · die Zwecke",
    "translation": {
      "ru": "цель, назначение",
      "en": "purpose"
    },
    "pos": "Substantiv",
    "base": "der Zweck",
    "target": "Zweck"
  },
  {
    "id": 207,
    "sentence": "Ich {{c1::beteilige}} mich am Projekt.",
    "blank": "Ich _____ mich am Projekt.",
    "revealed": "Ich beteilige mich am Projekt.",
    "sentenceTranslation": {
      "ru": "Я участвую в проекте.",
      "en": "I'm taking part in the project."
    },
    "grammar": "sich beteiligen an + Dat. · beteiligte sich · hat sich beteiligt",
    "translation": {
      "ru": "участвовать в",
      "en": "to take part in"
    },
    "pos": "Verb",
    "base": "sich beteiligen an + Dat.",
    "target": "beteilige"
  },
  {
    "id": 208,
    "sentence": "Ich verstehe den {{c1::Zusammenhang}} nicht.",
    "blank": "Ich verstehe den _____ nicht.",
    "revealed": "Ich verstehe den Zusammenhang nicht.",
    "sentenceTranslation": {
      "ru": "Я не понимаю взаимосвязь / контекст.",
      "en": "I don't understand the connection."
    },
    "grammar": "der Zusammenhang · die Zusammenhänge",
    "translation": {
      "ru": "связь, взаимосвязь",
      "en": "connection, context"
    },
    "pos": "Substantiv",
    "base": "der Zusammenhang",
    "target": "Zusammenhang"
  },
  {
    "id": 209,
    "sentence": "Mir {{c1::fällt}} kein Wort {{c1::ein}}.",
    "blank": "Mir _____ kein Wort _____.",
    "revealed": "Mir fällt kein Wort ein.",
    "sentenceTranslation": {
      "ru": "Мне не приходит в голову ни одного слова.",
      "en": "I can't think of a single word."
    },
    "grammar": "einfallen · mir fällt etwas ein · fiel ein · ist eingefallen",
    "translation": {
      "ru": "приходить в голову",
      "en": "to occur to (someone), to come to mind"
    },
    "pos": "Verb",
    "base": "einfallen",
    "target": "fällt / ein"
  },
  {
    "id": 210,
    "sentence": "Ich kann das Risiko nicht {{c1::einschätzen}}.",
    "blank": "Ich kann das Risiko nicht _____.",
    "revealed": "Ich kann das Risiko nicht einschätzen.",
    "sentenceTranslation": {
      "ru": "Я не могу оценить риск.",
      "en": "I can't assess the risk."
    },
    "grammar": "einschätzen · schätzte ein · hat eingeschätzt",
    "translation": {
      "ru": "оценивать",
      "en": "to assess, to judge"
    },
    "pos": "Verb",
    "base": "einschätzen",
    "target": "einschätzen"
  },
  {
    "id": 55,
    "sentence": "Das Kind war {{c1::ängstlich}}, als es allein im Zimmer war.",
    "blank": "Das Kind war _____, als es allein im Zimmer war.",
    "revealed": "Das Kind war ängstlich, als es allein im Zimmer war.",
    "sentenceTranslation": {
      "ru": "Ребёнку было страшно, когда он был один в комнате.",
      "en": "The child was scared when left alone in the room."
    },
    "grammar": "",
    "translation": {
      "ru": "боязливый, испуганный",
      "en": "anxious, fearful"
    },
    "pos": "Adjektiv",
    "base": "ängstlich",
    "target": "ängstlich"
  },
  {
    "id": 211,
    "sentence": "Hier {{c1::entsteht}} ein neues Haus.",
    "blank": "Hier _____ ein neues Haus.",
    "revealed": "Hier entsteht ein neues Haus.",
    "sentenceTranslation": {
      "ru": "Здесь строится / возникает новый дом.",
      "en": "A new house is being built here."
    },
    "grammar": "entstehen · entstand · ist entstanden",
    "translation": {
      "ru": "возникать, появляться",
      "en": "to arise, to come into being"
    },
    "pos": "Verb",
    "base": "entstehen",
    "target": "entsteht"
  },
  {
    "id": 212,
    "sentence": "Ich {{c1::denke}} über das Angebot {{c1::nach}}.",
    "blank": "Ich _____ über das Angebot _____.",
    "revealed": "Ich denke über das Angebot nach.",
    "sentenceTranslation": {
      "ru": "Я обдумываю предложение.",
      "en": "I'm thinking about the offer."
    },
    "grammar": "nachdenken über + Akk. · dachte nach · hat nachgedacht",
    "translation": {
      "ru": "размышлять о, обдумывать",
      "en": "to think about, to consider"
    },
    "pos": "Verb",
    "base": "nachdenken über + Akk.",
    "target": "denke / nach"
  },
  {
    "id": 213,
    "sentence": "Die Prüfung {{c1::findet}} am Montag {{c1::statt}}.",
    "blank": "Die Prüfung _____ am Montag _____.",
    "revealed": "Die Prüfung findet am Montag statt.",
    "sentenceTranslation": {
      "ru": "Экзамен состоится в понедельник.",
      "en": "The exam takes place on Monday."
    },
    "grammar": "stattfinden · fand statt · hat stattgefunden",
    "translation": {
      "ru": "происходить, состояться",
      "en": "to take place"
    },
    "pos": "Verb",
    "base": "stattfinden",
    "target": "findet / statt"
  },
  {
    "id": 214,
    "sentence": "Ich muss kurz {{c1::überlegen}}.",
    "blank": "Ich muss kurz _____.",
    "revealed": "Ich muss kurz überlegen.",
    "sentenceTranslation": {
      "ru": "Мне нужно немного подумать.",
      "en": "I need to think for a moment."
    },
    "grammar": "überlegen · überlegte · hat überlegt",
    "translation": {
      "ru": "обдумывать",
      "en": "to think (something) over"
    },
    "pos": "Verb",
    "base": "überlegen",
    "target": "überlegen"
  },
  {
    "id": 215,
    "sentence": "Ich {{c1::überweise}} die Miete morgen.",
    "blank": "Ich _____ die Miete morgen.",
    "revealed": "Ich überweise die Miete morgen.",
    "sentenceTranslation": {
      "ru": "Я переведу арендную плату завтра.",
      "en": "I'll transfer the rent tomorrow."
    },
    "grammar": "überweisen · überwies · hat überwiesen",
    "translation": {
      "ru": "переводить деньги",
      "en": "to transfer (money)"
    },
    "pos": "Verb",
    "base": "überweisen",
    "target": "überweise"
  },
  {
    "id": 216,
    "sentence": "Was wollen wir am Wochenende {{c1::unternehmen}}?",
    "blank": "Was wollen wir am Wochenende _____?",
    "revealed": "Was wollen wir am Wochenende unternehmen?",
    "sentenceTranslation": {
      "ru": "Чем займёмся на выходных?",
      "en": "What shall we do at the weekend?"
    },
    "grammar": "unternehmen · du unternimmst / er unternimmt · unternahm · hat unternommen",
    "translation": {
      "ru": "предпринимать; делать",
      "en": "to do (something); to undertake"
    },
    "pos": "Verb",
    "base": "unternehmen",
    "target": "unternehmen"
  },
  {
    "id": 217,
    "sentence": "Ich {{c1::verabrede}} mich mit einer Freundin.",
    "blank": "Ich _____ mich mit einer Freundin.",
    "revealed": "Ich verabrede mich mit einer Freundin.",
    "sentenceTranslation": {
      "ru": "Я договариваюсь встретиться с подругой.",
      "en": "I'm arranging to meet a friend."
    },
    "grammar": "sich verabreden · verabredete sich · hat sich verabredet",
    "translation": {
      "ru": "договариваться о встрече",
      "en": "to arrange to meet"
    },
    "pos": "Verb",
    "base": "sich verabreden",
    "target": "verabrede"
  },
  {
    "id": 56,
    "sentence": "Vor meinem ersten Arbeitstag war ich sehr {{c1::aufgeregt}}.",
    "blank": "Vor meinem ersten Arbeitstag war ich sehr _____.",
    "revealed": "Vor meinem ersten Arbeitstag war ich sehr aufgeregt.",
    "sentenceTranslation": {
      "ru": "Перед первым рабочим днём я очень волновалась.",
      "en": "I was very nervous before my first day at work."
    },
    "grammar": "",
    "translation": {
      "ru": "взволнованный, возбуждённый",
      "en": "excited, nervous"
    },
    "pos": "Adjektiv",
    "base": "aufgeregt",
    "target": "aufgeregt"
  },
  {
    "id": 218,
    "sentence": "Ich muss die Blumen {{c1::gießen}}.",
    "blank": "Ich muss die Blumen _____.",
    "revealed": "Ich muss die Blumen gießen.",
    "sentenceTranslation": {
      "ru": "Мне нужно полить цветы.",
      "en": "I need to water the flowers."
    },
    "grammar": "gießen · du gießt / er gießt · goss · hat gegossen",
    "translation": {
      "ru": "поливать; лить",
      "en": "to water; to pour"
    },
    "pos": "Verb",
    "base": "gießen",
    "target": "gießen"
  },
  {
    "id": 219,
    "sentence": "Ich {{c1::drehe}} den Schlüssel.",
    "blank": "Ich _____ den Schlüssel.",
    "revealed": "Ich drehe den Schlüssel.",
    "sentenceTranslation": {
      "ru": "Я поворачиваю ключ.",
      "en": "I turn the key."
    },
    "grammar": "drehen · drehte · hat gedreht",
    "translation": {
      "ru": "поворачивать; крутить",
      "en": "to turn"
    },
    "pos": "Verb",
    "base": "drehen",
    "target": "drehe"
  },
  {
    "id": 220,
    "sentence": "Ich {{c1::stecke}} den Schlüssel ins Schloss.",
    "blank": "Ich _____ den Schlüssel ins Schloss.",
    "revealed": "Ich stecke den Schlüssel ins Schloss.",
    "sentenceTranslation": {
      "ru": "Я вставляю ключ в замок.",
      "en": "I put the key in the lock."
    },
    "grammar": "stecken · steckte · hat gesteckt",
    "translation": {
      "ru": "вставлять; находиться внутри",
      "en": "to put (in); to be (stuck) in"
    },
    "pos": "Verb",
    "base": "stecken",
    "target": "stecke"
  }
];
