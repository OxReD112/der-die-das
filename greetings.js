/* Personal greetings for the Home intro line.
   Concept & rules: Documentation/PERSONAL_GREETINGS.md

   Each entry is an array of 1–2 lines (line 2 = smaller, softer style).
   - `name`:   version with the user's name ({name} is replaced)
   - `noName`: version when no name is set, or when the line with the
               name would be wider than 240px
   Entries without {name} only have `lines`.

   State priority (decided in index.html):
   lateNight → bonus → goal → vocabDone → halfway → started → morning/daytime/evening
   Time windows: morning 05–11, daytime 11–18, evening 18–23, lateNight 23–05.
   Points: started 1–49, halfway 50–99, goal 100–119, bonus 120–149.
   One phrase per state per day. */

window.GREETINGS = {
  morning: [
    { lines: ["Morgen, Sonnenschein!", "Hast du gut geschlafen?"] },
    { name: ["Morgen, {name}!", "Schon wach oder noch im Pyjama?"],
      noName: ["Morgen!", "Schon wach oder noch im Pyjama?"] },
    { lines: ["Kaffee in der Hand,", "Deutsch im Kopf?"] },
    { lines: ["Guten Morgen!", "Die Artikel sind auch noch müde."] },
    { lines: ["Der, die, das –", "aber erst mal Kaffee."] }
  ],

  daytime: [
    { name: ["Hey {name}, wie geht's dir heute?"],
      noName: ["Hey, wie geht's dir heute?"] },
    { name: ["Na, {name}?", "Kurze Pause vom Alltag?"],
      noName: ["Na?", "Kurze Pause vom Alltag?"] },
    { lines: ["Na, wie war dein Tag bis jetzt?"] },
    { name: ["Na, {name}?", "Die Präpositionen haben dich vermisst."],
      noName: ["Na?", "Die Präpositionen haben dich vermisst."] }
  ],

  evening: [
    { name: ["Na, {name}?", "Ein bisschen Deutsch zum Tee?"],
      noName: ["Na?", "Ein bisschen Deutsch zum Tee?"] },
    { name: ["Feierabend, {name}!", "Machen wir's uns gemütlich?"],
      noName: ["Feierabend!", "Machen wir's uns gemütlich?"] }
  ],

  lateNight: [
    { name: ["{name}, es ist schon spät.", "Ab ins Bett."],
      noName: ["Es ist schon spät.", "Ab ins Bett."] },
    { lines: ["Morgen ist auch noch ein Tag.", "Schlaf gut."] },
    { name: ["Na, {name}, noch wach?", "Ab unter die Decke."],
      noName: ["Na, noch wach?", "Ab unter die Decke."] },
    { lines: ["Die Wörter schlafen schon.", "Und du?"] },
    { name: ["Psst, {name}!", "Die Artikel schlafen schon."],
      noName: ["Psst!", "Die Artikel schlafen schon."] },
    { lines: ["Um diese Zeit…", "spricht nur noch der Mond Deutsch."] }
  ],

  started: [
    { lines: ["Jeder kleine Schritt zählt."] },
    { name: ["Na, {name}? Läuft doch!"],
      noName: ["Na? Läuft doch!"] },
    { lines: ["Die Artikel zittern schon."] }
  ],

  halfway: [
    { name: ["{name}, du bist mein Stern ♡"],
      noName: ["Du bist mein Stern ♡"] },
    { name: ["Vorsicht, {name}.", "Du wirst langsam deutsch."],
      noName: ["Vorsicht!", "Du wirst langsam deutsch."] }
  ],

  vocabDone: [
    { name: ["Toll gemacht, {name}!"],
      noName: ["Toll gemacht!"] },
    { lines: ["Die Wörter mögen dich heute."] }
  ],

  goal: [
    { name: ["{name}, du hast es geschafft!", "Ich bin so stolz auf dich."],
      noName: ["Du hast es geschafft!", "Ich bin so stolz auf dich."] },
    { lines: ["Du hast heute so viel gemacht.", "Genieß es."] },
    { name: ["Na, {name}? Geschafft!", "Wie fühlt sich das an?"],
      noName: ["Na? Geschafft!", "Wie fühlt sich das an?"] },
    { lines: ["Geschafft!", "Zeit für ein Stück Kuchen?"] },
    { lines: ["Tagesziel erreicht.", "Goethe wäre stolz."] }
  ],

  bonus: [
    { lines: ["Ab jetzt ist alles Bonus.", "Nur wenn du Lust hast."] },
    { name: ["Du hast genug getan, {name}."],
      noName: ["Du hast genug getan."] },
    { lines: ["Pflicht erledigt –", "jetzt kommt die Kür."] },
    { lines: ["Noch mehr?", "Du bist ja deutscher als die Deutschen."] },
    { lines: ["Streber-Modus: an."] }
  ]
};
