# QA 03 · Präpositionen → Kasus („Fester Kasus“)

**Checked:** 2026-09-24 · **Level target:** A2 → B1 (spoken German; some "educated" B2 prepositions welcome, no officialese)
**Files:** `deutsch-home/praepositionen/kasus/praepositionen.js` (34 cards), `index.html` — *since Fester Kasus v19 (2026-09-27): `prepositions.js` (32 cards, content as after this QA), `kasus.js`, `kasus.css`*
**Source:** teacher's list „Liste der deutschen Präpositionen nach Kasus“ (5 pages)
**Status:** Fixes applied 2026-09-24 (copies before: `praepositionen_before-qa.js`, `index_before-qa.html`, `praepositionen/index_before-qa-kasus.html`). To test on phone.

**How it works:** shows preposition + Russian → learner picks Akkusativ / Dativ / Genitiv. A second accepted case (e.g. *wegen* + Dativ) counts as correct, shown in blue with a note.

## Summary
- Cases are correct for 32 of 34 cards. **2 have the wrong main case** (*laut*, *binnen*).
- 3 Russian example translations don't match the German.
- Selection: 4 cards are officialese (entsprechend, gemäß, mitsamt, binnen), 2 cards are duplicates (statt / anstatt), and some everyday ones are missing (*bis*, *innerhalb*, *außerhalb*).

## ❌ Errors
| # | Card | Current | Problem | Proposed |
|---|---|---|---|---|
| E1 | laut | Genitiv = standard, Dativ = „umgangssprachlich“; example *Laut des Berichts …* | Dativ is fully standard for *laut*, not colloquial (the teacher lists *laut* under **Dativ** and crossed it out in the Genitiv list) | Dativ = standard, Genitiv = also possible; example *Laut einem Bericht ist er zurückgetreten.* |
| E2 | binnen | Genitiv = standard, Dativ = also possible | Duden: *binnen* + **Dativ**, Genitiv only elevated | (see coverage: replace by *innerhalb*) |
| E3 | um | *Wir sitzen um den Tisch.* — „Мы сидим **за столом**“ | *um den Tisch* = вокруг стола; the German is also incomplete without *herum* | *Wir sitzen um den Tisch herum.* — „Мы сидим вокруг стола.“ |
| E4 | aus | *Sie kommt aus Japan.* — „Она **приехала** из Японии“ | *kommt aus* = origin | „Она из Японии.“ |

## ⚠️ Debatable
| # | Card | Issue | Proposed |
|---|---|---|---|
| A1 | statt / anstatt | In speech *statt dem* (Dativ) is very common, like *wegen dem*; the app marks Dativ wrong | Optional: accept Dativ as „umgangssprachlich“, same as wegen / trotz / während |
| A2 | gegen | „Она ударилась о стену“ is loose | „Она врезалась в стену.“ |

## 💬 Style
| # | Card | Current | Proposed |
|---|---|---|---|
| S1 | mithilfe | fragment *Mithilfe einer Karte.* | *Mithilfe einer Karte haben wir den Weg gefunden.* — „С помощью карты мы нашли дорогу.“ |
| S2 | anhand | fragment *Anhand eines Beispiels.*; „на основании, с помощью“ | *Anhand eines Beispiels erkläre ich es dir.* — „Я объясню тебе это на примере.“; translation „на примере, на основе, по“ |

## Coverage proposal
**Remove (officialese / documents):** entsprechend, gemäß, mitsamt, binnen
**Merge:** statt + anstatt → one card „statt / anstatt“ (same meaning, same case)
**Keep as "educated" B2:** aufgrund, angesichts, anstelle, mithilfe, anhand, entgegen, dank
**Add (everyday, missing):**
| Card | Case | Example |
|---|---|---|
| bis | Akkusativ | *Ich arbeite bis nächsten Freitag.* (note: often with a 2nd preposition: *bis zum Bahnhof*) |
| innerhalb | Genitiv | *Innerhalb einer Woche war alles fertig.* |
| außerhalb | Genitiv | *Wir wohnen außerhalb der Stadt.* |

Not recommended (C1 / formal / documents): wider, zuwider, nebst, samt, zufolge, infolge, mangels, kraft, mittels, zwecks, seitens, ungeachtet, anlässlich, all local Genitiv ones except inner-/außerhalb, bezüglich, hinsichtlich, abzüglich, zuzüglich, vorbehaltlich, halber, um … willen, zugunsten, zuungunsten, zulasten.

Result: 34 − 4 − 1 + 3 = **32 cards**.

## ✅ Verified correct
All other cases (incl. entlang: *die Straße entlang* + Akk, *entlang des Flusses* + Gen / Dat), all Doppelformen (wegen, trotz, während, dank), all other Russian translations and examples.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1 | laut: Dativ = standard, Genitiv = also possible; *Laut einem Bericht …* | ✅ |
| E2–E4 | binnen removed; um / aus examples fixed | ✅ |
| A1 | statt / anstatt: Dativ accepted as „Umgangssprachlich“ | ✅ |
| A2, S1, S2 | gegen, mithilfe, anhand as proposed | ✅ |
| Coverage | removed entsprechend, gemäß, mitsamt, binnen · merged statt + anstatt · added bis (Akk, with note *bis zum*), innerhalb, außerhalb (Gen) | ✅ |

Result: **32 cards**, all checked (one main case each, no duplicates). Data `?v=9`, page v9, hub link `kasus/index.html?v=11`. Browser-tested: laut + Genitiv → blue „Auch möglich“, statt + Dativ → „Umgangssprachlich“, bis → note shown.
