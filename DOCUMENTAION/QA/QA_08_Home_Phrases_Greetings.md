# QA 08 · Home: Redewendungen + Greetings

**Checked:** 2026-09-25
**Files:** `deutsch-home/Home/phrases.js` (10 idioms), `deutsch-home/Home/greetings.js` (40 greetings, 9 states)
**Status:** Applied 2026-09-25 (copies before: `phrases_before-qa.js`, `greetings_before-qa.js`, `index_before-qa-home.html`). To test on phone.

## Redewendungen (10)
**All correct:** German idiom, literal Russian translation, meaning and example sentence — no errors, no typos.
(Ich verstehe nur Bahnhof · auf dem Schlauch stehen · Tomaten auf den Augen haben · die Kuh vom Eis holen · Schwein haben · ins Fettnäpfchen treten · zwei linke Hände haben · sich zum Affen machen · Das ist mir Wurst · die Nase voll haben)

💬 Optional: 10 more very common idioms, e.g. *jemandem die Daumen drücken*, *jemandem auf den Keks gehen*, *Das ist nicht mein Bier*, *den Nagel auf den Kopf treffen*, *etwas auf die lange Bank schieben*, *um den heißen Brei herumreden*, *auf Wolke sieben schweben*, *Da steppt der Bär*, *Hals- und Beinbruch!*, *Ende gut, alles gut*.

## Greetings (40)
**All grammatically correct**, natural and in the right tone (incl. *Du wirst langsam deutsch* — lowercase is correct here, it's the adjective).

| # | State | Current | Proposed |
|---|---|---|---|
| S1 | bonus | *Alles ab jetzt ist Bonus.* | *Ab jetzt ist alles Bonus.* (natural word order) |
| S2 | bonus | *Ab jetzt ist alles Extra.* — almost the same as S1 | replace with an idiom: *Pflicht erledigt – jetzt kommt die Kür.* (Kür = free programme, like in figure skating) |

## Decisions log
| # | Decision | Applied |
|---|---|---|
| Idioms | **5 added** (ids 11–15): *jemandem auf den Keks gehen* · *Das ist nicht mein Bier.* · *den Nagel auf den Kopf treffen* · *Da steppt der Bär.* · *Ende gut, alles gut.* — each with literal Russian, meaning, example. Others not added. Now 15 phrases (Phrase of the Week cycles through them) | ✅ |
| S1 | *Ab jetzt ist alles Bonus. / Nur wenn du Lust hast.* | ✅ |
| S2 | *Pflicht erledigt – / jetzt kommt die Kür.* | ✅ |

Home `index.html`: `phrases.js?v=2`, `greetings.js?v=2`.
