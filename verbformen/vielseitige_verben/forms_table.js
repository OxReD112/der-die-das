// Vielseitige Verben — data of the „Formen · Tabelle“ window (script: vielseitige_verben.js, TABLE WINDOW).
// Explanations in the user's language ({ en, ru }, picked by DeutschTranslation); forms and examples stay German.
//
// Per verb:
//   rows      ich · du · er/sie/es · wir · ihr · sie/Sie → [Präsens, Präteritum, Konjunktiv II]
//   k2        true = the Konjunktiv II column is shown (only werden — the only verb the exercise asks in K II;
//             for the others the column is hidden but keeps its place, so nothing moves between verbs)
//   p2        Partizip II row: [form, note] (note { en, ru } or "")
//   imp       Imperativ row (lassen only)
//   meanings  „What do you want to say?“ tags:
//     tag      the tag text
//     job      the sentences' job (sentences.js, VV_JOBS) this meaning explains: after Prüfen the exercise shows
//              this meaning's building blocks as the explanation
//     lit      what lights up: cols (whole columns: 0 Präsens · 1 Präteritum · 2 Konjunktiv II),
//              p2 / imp (index of the form in that row)
//     blocks   the construction as building blocks: [text, kind]; kind verb = the verb itself (gold),
//              part = what comes with it and decides the meaning (dashed), plain = other words, or = „ · “
//              (no „+“ around it). text is a string or { en, ru }.
//     means    what it says
//     ex       German example: *the verb form* (gold) · _the partner_ (dashed underline)
//     also     optional small line; *German* in italics

(function () {
// short names for repeated block texts (inside a function: no global names)
const T = {
  thing: { en: "object", ru: "вещь" },
  person: { en: "person", ru: "человек" },
  inf: { en: "infinitive", ru: "Infinitiv" },
  zuInf: { en: "zu + infinitive", ru: "zu + Infinitiv" }
};

window.VV_TABLE = {
  werden: {
    k2: true,
    rows: [
      ["werde", "wurde", "würde"],
      ["wirst", "wurdest", "würdest"],
      ["wird", "wurde", "würde"],
      ["werden", "wurden", "würden"],
      ["werdet", "wurdet", "würdet"],
      ["werden", "wurden", "würden"]
    ],
    p2: [
      ["geworden", { en: "became", ru: "стал(а)" }],
      ["worden", { en: "Passiv", ru: "пассив" }]
    ],
    meanings: [
      {
        tag: { en: "become, get", ru: "становиться" },
        job: "become",
        lit: { cols: [0, 1], p2: [0] },
        blocks: [["werden", "verb"], [{ en: "adjective / noun", ru: "прилагательное / существительное" }, "part"]],
        means: { en: "becomes, became", ru: "становится, стал(а)" },
        ex: "Nach dem Ausflug *wurden* die Kinder schnell _müde_.",
        also: { en: "Perfekt: *Sie ist Lehrerin geworden.*", ru: "Perfekt: *Sie ist Lehrerin geworden.*" }
      },
      {
        tag: { en: "future", ru: "будущее" },
        job: "future",
        lit: { cols: [0] },
        blocks: [["werden", "verb"], [T.inf, "part"]],
        means: { en: "will", ru: "будет (делать)" },
        ex: "Ich *werde* dich morgen _anrufen_."
      },
      {
        tag: { en: "a guess", ru: "предположение" },
        job: "guess",
        lit: { cols: [0] },
        blocks: [["werden", "verb"], ["wohl", "part"], [T.inf, "part"]],
        means: { en: "probably", ru: "наверное" },
        ex: "Er *wird* wohl _schlafen_."
      },
      {
        tag: { en: "Passiv", ru: "пассив" },
        job: "passive",
        lit: { cols: [0, 1], p2: [1] },
        blocks: [["werden", "verb"], ["Partizip II", "part"]],
        means: { en: "it is being done / was done", ru: "это делают / сделали" },
        ex: "Die Fenster *werden* gerade _geputzt_.",
        also: {
          en: "Perfekt: sein + Partizip II + *worden* — *Mein Fahrrad ist gestohlen worden.* Not *geworden*: that one means „became“.",
          ru: "Perfekt: sein + Partizip II + *worden* — *Mein Fahrrad ist gestohlen worden.* Не *geworden*: это «стал»."
        }
      },
      {
        tag: { en: "would", ru: "бы" },
        job: "wuerde",
        lit: { cols: [2] },
        blocks: [["werden im Konjunktiv II", "verb"], [T.inf, "part"]],
        means: { en: "would: polite, or not real", ru: "бы: вежливо или не на самом деле" },
        ex: "*Würdest* du mir kurz _helfen_?"
      }
    ]
  },

  lassen: {
    rows: [
      ["lasse", "ließ", ""],
      ["lässt", "ließt", ""],
      ["lässt", "ließ", ""],
      ["lassen", "ließen", ""],
      ["lasst", "ließt", ""],
      ["lassen", "ließen", ""]
    ],
    p2: [
      ["gelassen", ""],
      ["lassen", { en: "after a 2nd verb", ru: "после 2-го глагола" }]
    ],
    imp: ["lass!", "lasst!", "lassen Sie!"],
    meanings: [
      {
        tag: { en: "leave something", ru: "оставить" },
        job: "leave",
        lit: { cols: [0, 1], p2: [0] },
        blocks: [["lassen", "verb"], [T.thing, "plain"], [{ en: "place", ru: "место" }, "part"]],
        means: { en: "leave (somewhere)", ru: "оставить (где-то)" },
        ex: "Ich *lasse* den Schlüssel _auf dem Tisch_."
      },
      {
        tag: { en: "have someone do it", ru: "поручить сделать" },
        job: "haveDone",
        lit: { cols: [0, 1] },
        blocks: [["lassen", "verb"], [T.thing, "plain"], [T.inf, "part"]],
        means: { en: "someone else does it for you", ru: "делает кто-то другой" },
        ex: "Ich *lasse* mein Auto _reparieren_.",
        also: {
          en: "Perfekt with two infinitives, no gelassen: *Ich habe mein Auto reparieren lassen.*",
          ru: "Perfekt с двумя Infinitiv, без gelassen: *Ich habe mein Auto reparieren lassen.*"
        }
      },
      {
        tag: { en: "let someone", ru: "позволить" },
        job: "allow",
        lit: { imp: [0, 1, 2] },
        blocks: [["lassen im Imperativ", "verb"], [T.person, "plain"], [T.inf, "part"]],
        means: { en: "allow", ru: "разрешить" },
        ex: "*Lass* mich das _machen_!"
      },
      {
        tag: { en: "let's", ru: "давай" },
        job: "letsGo",
        lit: { imp: [0, 1] },
        blocks: [["lass / lasst", "verb"], ["uns", "plain"], [T.inf, "part"]],
        means: { en: "let's", ru: "давай(те)" },
        ex: "*Lasst* uns _gehen_!",
        also: { en: "*lass uns* to one person · *lasst uns* to several", ru: "*lass uns* — одному · *lasst uns* — нескольким" }
      },
      {
        tag: { en: "can be done", ru: "можно сделать" },
        job: "canBeDone",
        lit: { cols: [0] },
        blocks: [["lassen", "verb"], ["sich", "part"], [T.inf, "part"]],
        means: { en: "it can be done", ru: "это можно сделать" },
        ex: "Das Fenster *lässt* sich nicht _öffnen_."
      },
      {
        tag: { en: "stop it", ru: "прекрати" },
        job: "stop",
        lit: { imp: [0] },
        blocks: [["Lass das!", "verb"]],
        means: { en: "stop it", ru: "прекрати" },
        ex: "*Lass* das!"
      }
    ]
  },

  sein: {
    rows: [
      ["bin", "war", ""],
      ["bist", "warst", ""],
      ["ist", "war", ""],
      ["sind", "waren", ""],
      ["seid", "wart", ""],
      ["sind", "waren", ""]
    ],
    p2: [["gewesen", ""]],
    meanings: [
      {
        tag: { en: "already done (state)", ru: "уже сделано (состояние)" },
        job: "state",
        lit: { cols: [0, 1] },
        blocks: [["sein", "verb"], ["Partizip II", "part"]],
        means: { en: "a state at that moment, no action", ru: "состояние в тот момент, без действия" },
        ex: "Die Tür *ist* schon _geschlossen_.",
        also: {
          en: "Being done right now → werden: *Die Tür wird gerade geschlossen.*",
          ru: "Делают прямо сейчас → werden: *Die Tür wird gerade geschlossen.*"
        }
      },
      {
        tag: { en: "can be done", ru: "можно сделать" },
        job: "canBeDone",
        lit: { cols: [0, 1] },
        blocks: [["sein", "verb"], [T.zuInf, "part"]],
        means: { en: "it can / could be done", ru: "это можно / можно было сделать" },
        ex: "Die Aufgabe *ist* leicht _zu lösen_."
      },
      {
        tag: { en: "Perfekt (going A → B)", ru: "Perfekt (из A в B)" },
        job: "pastHelper",
        lit: { cols: [0] },
        blocks: [["sein", "verb"], ["Partizip II", "part"]],
        means: { en: "past, with movement or change", ru: "прошлое: движение или изменение" },
        ex: "Wir *sind* nach Berlin _gefahren_."
      }
    ]
  },

  haben: {
    rows: [
      ["habe", "hatte", ""],
      ["hast", "hattest", ""],
      ["hat", "hatte", ""],
      ["haben", "hatten", ""],
      ["habt", "hattet", ""],
      ["haben", "hatten", ""]
    ],
    p2: [["gehabt", ""]],
    meanings: [
      {
        tag: { en: "Perfekt", ru: "Perfekt" },
        job: "pastHelper",
        lit: { cols: [0] },
        blocks: [["haben", "verb"], ["Partizip II", "part"]],
        means: { en: "past (most verbs)", ru: "прошлое (большинство глаголов)" },
        ex: "Ich *habe* schon _gegessen_."
      },
      {
        tag: { en: "have to", ru: "нужно" },
        job: "mustDo",
        lit: { cols: [0, 1] },
        blocks: [["haben", "verb"], [T.zuInf, "part"]],
        means: { en: "have to / had to", ru: "нужно / нужно было" },
        ex: "Ich *habe* noch viel _zu tun_."
      },
      {
        tag: { en: "feel (already)", ru: "испытывать (чувство)" },
        job: "feel",
        lit: { cols: [0] },
        blocks: [["haben", "verb"], ["Angst / Lust / Hunger", "part"]],
        means: { en: "a feeling you already have", ru: "чувство уже есть" },
        ex: "Ich *habe* _Angst_.",
        also: { en: "It starts → bekommen: *Ich bekomme Angst.*", ru: "Только начинается → bekommen: *Ich bekomme Angst.*" }
      },
      {
        tag: { en: "fixed phrases", ru: "устойчивые выражения" },
        job: "phrase",
        lit: { cols: [0] },
        blocks: [["recht haben", "verb"], ["·", "or"], ["es eilig haben", "verb"]],
        means: { en: "learn them as a whole", ru: "учить целиком" },
        ex: "Du *hast* _recht_."
      }
    ]
  },

  bekommen: {
    rows: [
      ["bekomme", "bekam", ""],
      ["bekommst", "bekamst", ""],
      ["bekommt", "bekam", ""],
      ["bekommen", "bekamen", ""],
      ["bekommt", "bekamt", ""],
      ["bekommen", "bekamen", ""]
    ],
    p2: [["bekommen", { en: "no ge-", ru: "без ge-" }]],
    meanings: [
      {
        tag: { en: "get, receive", ru: "получать" },
        job: "receive",
        lit: { cols: [0, 1], p2: [0] },
        blocks: [["bekommen", "verb"], [T.thing, "part"]],
        means: { en: "get (not „become“!)", ru: "получать (не «становиться»!)" },
        ex: "Ich *bekomme* _einen Kaffee_, bitte.",
        also: { en: "Perfekt: *Ich habe einen Brief bekommen.*", ru: "Perfekt: *Ich habe einen Brief bekommen.*" }
      },
      {
        tag: { en: "start to feel", ru: "начать чувствовать" },
        job: "catch",
        lit: { cols: [0] },
        blocks: [["bekommen", "verb"], ["Angst / Hunger", "part"]],
        means: { en: "a feeling starts", ru: "чувство появляется" },
        ex: "Im Dunkeln *bekomme* ich _Angst_.",
        also: { en: "Already there → haben: *Ich habe Angst.*", ru: "Уже есть → haben: *Ich habe Angst.*" }
      },
      {
        tag: { en: "get ill", ru: "заболеть" },
        job: "happen",
        lit: { p2: [0] },
        blocks: [["haben", "plain"], [{ en: "illness", ru: "болезнь" }, "part"], ["bekommen", "verb"]],
        means: { en: "caught (a cold …)", ru: "заболел(а)" },
        ex: "Ich habe _eine Erkältung_ *bekommen*."
      },
      {
        tag: { en: "have a baby", ru: "родить ребёнка" },
        job: "baby",
        lit: { p2: [0] },
        blocks: [["haben", "plain"], ["ein Baby", "part"], ["bekommen", "verb"]],
        means: { en: "had a baby", ru: "появился ребёнок" },
        ex: "Sie hat _ein Baby_ *bekommen*."
      },
      {
        tag: { en: "catch (a train)", ru: "успеть (на поезд)" },
        job: "catchTrain",
        lit: { cols: [0] },
        blocks: [["bekommen", "verb"], ["den Zug", "part"]],
        means: { en: "make it in time", ru: "успеть" },
        ex: "Wir *bekommen* _den Zug_ noch."
      },
      {
        tag: { en: "someone does it for you", ru: "кто-то делает для тебя" },
        job: "getDone",
        lit: { cols: [1] },
        blocks: [["bekommen", "verb"], [T.thing, "plain"], ["Partizip II", "part"]],
        means: { en: "given, done for you", ru: "тебе подарили, сделали" },
        ex: "Sie *bekam* das Buch _geschenkt_."
      }
    ]
  }
};
})();
