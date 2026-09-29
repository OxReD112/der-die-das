# QA 01c · Ortspräpositionen — Effectiveness check + Tabelle

**Date:** 2026-09-25 · **Exercise:** Ortspräpositionen (Wo · Wohin · Woher) · 66 cards
**Related:** `QA_01_Ortspraepositionen.md` (content) · `QA_01b_Ortspraepositionen_Balance_Check.md` (balance)
**Status:** ✅ Tabelle applied 2026-09-25 · browser-tested · to test on phone

## 1. Goal (set by Alena)
Learn the table from Lektion 35 "Lokale Präpositionen": **which group of places takes which prepositions** for Wo / Wohin / Woher. Not the lake picture (in / auf / am Wasser by meaning).

## 2. Rating: 9 / 10
- The card = one table row (Wo · Wohin · Woher); after each card the group + its triple (e.g. „Offene Fläche → auf · auf · von“).
- Buttons carry the article, so the only decision is the preposition — exactly what the table is about.
- Distractors are real mistakes (*zum* in Wo, *zum* instead of *ins/ans/auf* in Wohin + short hint).
- All groups of the page + the notes (Supermarkt am / beim / im, auf dem Berg / in den Bergen, zu Hause) are covered.
- Missing was a view of the table itself → added (below).

## 3. Decisions
| # | Point | Decision |
|---|---|---|
| D1 | Land mit Artikel only 3 cards | **Keep 3** — deliberate: rarely needed in life compared to the other places |
| D2 | Bahnhof-type group (*zum Bahnhof*) goes beyond the book (*an die Station*) | Keep — real everyday German |
| D3 | Table view | **Added**, minimal (see 4) |

## 4. Tabelle (new)
Button „Tabelle“ on the start screen and (faint) during a round → sheet „Wo · Wohin · Woher“.
- **8 rows, one example each**, group name small underneath: *das Kino* (Raum) · *die Schweiz* (Land mit Artikel) · *Berlin* (Stadt, Land) · *der See* (Wasser, Kontakt) · *der Markt* (offene Fläche) · *der Arzt* (Person, Firma, Aktivität) · *der Bahnhof* (am Ort) · *Hause* (zu Hause). Footer: **immer in:** Wald · Park · Garten · Schwimmbad · Berge.
- **Cases:** header Wo? Dativ · Wohin? **Akk / Dat** · Woher? Dativ. Wohin **dimmed** when it repeats the Wo word (in / an / auf = Akkusativ, the "movement" rule); **white + „Dativ“** when the word changes (nach / zu = the exception).
- No orange, no Dativ/Akk per article, no contractions (the buttons show them), no extras (Toilette, Goethestraße, aufs Land have their own note).
- **Red dot** = group with a mistake not yet answered right again (step weight ≥ 2 in `ortspraepositionenDifficultyV1`, the same data that makes cards come back). Note line „hier gab es zuletzt Fehler“ only when a dot is shown.

Files: `ortspraepositionen/index.html` v10, hub link `ortspraepositionen/index.html?v=15`, Home tile `praepositionen/?v=6`. Copies before: `index_before-table.html`, `praepositionen/index_before-orts-table.html`, `Home/index_before-orts-table.html`.
Browser-tested: dark + light, open / close (×, tap outside, Esc), dots match the groups with mistakes, no errors.
