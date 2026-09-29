# Personal Greetings

Status: implemented in Home v5.18 (2026-09-23). Phrases: Home/greetings.js.

## Idea

The app talks to the user warmly, like a friend: informal, a little funny, never pushy. It should feel like a hug. It works with or without a name.

## Placement

- **Intro line on Home**: the greeting replaces "Was möchtest du heute üben?". This is the single voice of the app.
- **Heute card**: unchanged (numbers only).
- **Hard stop overlay**: unchanged, no name (a name there felt forced).

## Settings

- New optional row: **Name**, an inline text field above "Light Theme".
- Stored in localStorage and included in Backup / Restore.
- Max. ~20 characters.

## Rules

- **One phrase per state per day.** It stays stable and doesn't change every time you return to Home.
- **Late night (23:00–05:00) overrides all other states**, whatever the points.
- **No name set**: every phrase has a written-out no-name version (e.g. "Na, Alena? Läuft doch!" → "Na? Läuft doch!"). Store both forms instead of cutting the name out automatically.
- **Hearts (♡) appear only twice**: "du bist mein Stern" and the hard stop screen.
- Tone: informal, warm, humorous, no pressure. No "Weiter so!", no "fast da".
- **Line breaks are fixed in the data**: `|` marks the break. Line 1 uses the current intro style (15px); line 2 is slightly smaller and softer (~13px). Phrases without `|` are one line. The browser never picks the break.
- **Greeting block**: narrow and centered, **max. 240px wide** (close to the current intro line, ~210px). Two second lines sit right at the edge (~243px est.) and need a check on the iPhone mini: "Die Präpositionen haben dich vermisst." and "Du bist ja deutscher als die Deutschen."
- **Always reserve two lines of height**, so the tiles never jump. Move the tiles down only ~10–12px and tighten the gap under the greeting, to keep the airy spacing.
- **Long names**: name input max. 20 characters. The app measures each greeting line with the name in the browser. If a line would be wider than 240px, that phrase uses its no-name version. Other phrases keep the name. Measure the real width, don't count characters (W is much wider than i).
- **Gentle fade** (~0.5s) when the greeting changes.
- **State priority**: late night → bonus (120–149) → celebration (100–119) → Wortschatz done → 50–99 → 1–49 → time of day (0 points). The hard stop overlay (150) covers everything.
- **Service worker: do not touch.** It is only for notifications. greetings.js loads like phrases.js.
- **Test device**: iPhone mini.

## Phrases

### Morning (05–11), 0 points
- Morgen, Sonnenschein! | Hast du gut geschlafen?
- Morgen, Alena! | Schon wach oder noch im Pyjama?
- Kaffee in der Hand, | Deutsch im Kopf?
- Guten Morgen! | Die Artikel sind auch noch müde.
- Der, die, das – | aber erst mal Kaffee.

### Daytime (11–18), 0 points
- Hey Alena, wie geht's dir heute?
- Na, Alena? | Kurze Pause vom Alltag?
- Na, wie war dein Tag bis jetzt?
- Na, Alena? | Die Präpositionen haben dich vermisst.

### Evening (18–23), 0 points
- Na, Alena? | Ein bisschen Deutsch zum Tee?
- Feierabend, Alena! | Machen wir's uns gemütlich?

### Late night (23–05), any points
- Alena, es ist schon spät. | Ab ins Bett.
- Morgen ist auch noch ein Tag. | Schlaf gut.
- Na, Alena, noch wach? | Ab unter die Decke.
- Die Wörter schlafen schon. | Und du?
- Psst, Alena! | Die Artikel schlafen schon.
- Um diese Zeit… | spricht nur noch der Mond Deutsch.

### 1–49 points
- Jeder kleine Schritt zählt.
- Na, Alena? Läuft doch!
- Die Artikel zittern schon.

### 50–99 points
- Alena, du bist mein Stern ♡
- Vorsicht, Alena. | Du wirst langsam deutsch.

### Wortschatz done (goal not yet reached)
- Toll gemacht, Alena!
- Die Wörter mögen dich heute.

### Goal reached (100–119)
- Alena, du hast es geschafft! | Ich bin so stolz auf dich.
- Du hast heute so viel gemacht. | Genieß es.
- Na, Alena? Geschafft! | Wie fühlt sich das an?
- Geschafft! | Zeit für ein Stück Kuchen?
- Tagesziel erreicht. | Goethe wäre stolz.

### Bonus (120–149)
- Alles ab jetzt ist Bonus. | Nur wenn du Lust hast.
- Du hast genug getan, Alena.
- Ab jetzt ist alles Extra.
- Noch mehr? | Du bist ja deutscher als die Deutschen.
- Streber-Modus: an.

### 150 — hard stop
Existing overlay text, unchanged. No name.
