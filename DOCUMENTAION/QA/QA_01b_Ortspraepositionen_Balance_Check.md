# QA 01b · Ortspräpositionen — Balance check

**Date:** 2026-09-25 · **Exercise:** Ortspräpositionen (Wo · Wohin · Woher) · **File:** `deutsch-home/praepositionen/ortspraepositionen/ortspraepositionen.js` (74 cards)
**Related:** `QA_01_Ortspraepositionen.md` (content check)
**Status:** ✅ Applied 2026-09-25 (see Decisions log). To test on phone.

## 1. Why
Are all place categories (in / an / auf / bei–zu / nach …) fairly represented? Is the easy rule over-represented?

## 2. How we evaluated
- **How a session picks cards** (`buildSession()` in `index.html`): single cards (one noun with all 3 questions), randomly, cards with mistakes come back more often.
- **Consequence:** a category's share of the file = its share of practice.
- **Important:** the buttons already match the noun's gender (`BUTTONS[q][gender]`), so the learner never chooses between *ins / in den / in die* — **the decision is only the preposition**. Balance is therefore about categories (which preposition), not about gender.
- **Method:** counted cards per category and per answer triple (wo / wohin / woher).

## 3. What we discovered
| Category | Rule | Cards | Share | Assessment |
|---|---|---|---|---|
| Person, Geschäft, Aktivität | bei · zu · von | 18 | 24 % | slightly large (5 names, 3 × doctor/Friseur-type) |
| **Raum** | in · in · aus | **17** | **23 %** | ⚠️ too big — the easiest, default rule; 13 cards are *im / ins / aus dem* |
| **Stadt, Land ohne Artikel** | in · nach · aus | **10** | 14 % | ⚠️ big for an easy rule; answer is the same triple 10 × |
| Kontakt, „Wasser“ | an · an · von | 8 | 11 % | ✅ (feminine only 1: *Küste*) |
| Offene Fläche | auf · auf · von | 8 | 11 % | ✅ (no neuter → *aufs* is never correct) |
| Wald, Park, … (immer in) | in · in · aus | 6 | 8 % | ✅ |
| **Land mit Artikel** | in · in · aus | **3** | 4 % | ⚠️ too small — *in die Schweiz* vs *nach Spanien* is a classic mistake |
| **Bahnhof, Supermarkt (am Gebäude)** | an · zu · von | **2** | 3 % | ⚠️ too small — hard and everyday |
| Straße als Adresse | in · in · aus | 1 | 1 % | ✅ single card |
| Zuhause | zu · nach · von zu | 1 | 1 % | ✅ single card (comes back when answered wrong) |

**By preposition:** Wo — *in* 37 · *bei* 18 · *an* 10 · *auf* 8. Wohin — *in* 27 · *zu* 20 · *nach* 11 · *an* 8 · *auf* 8.

**Findings**
1. **Raum (17)** is the -ung of this exercise: the rule learners already know dominates sessions.
2. **Stadt / Land ohne Artikel (10)** — once *nach* is known, 10 identical cards add little.
3. The hard contrasts are small: **Land mit Artikel 3**, **am Gebäude / zum 2**.
4. For Russian speakers **bei / zu / von** maps onto *у / к / от* — easier than it looks, so 18 is enough, not too little.
5. Side note (content, not balance): *Schule* — *Ich gehe **zur** Schule* is also correct and very common, but has no „Auch richtig“.

## 4. Proposed changes
| # | Change | Detail | Count |
|---|---|---|---|
| O1 | **Raum 17 → 11** | remove 6 neuter *im / ins* cards, e.g. Theater, Hotel, Kaufhaus, Zentrum, Fitnessstudio, Café | −6 |
| O2 | **Stadt / Land ohne Artikel 10 → 6** | keep Berlin, Paris, Japan, Italien, Österreich, Spanien; remove Madrid, London, Mexiko, China | −4 |
| O3 | **Land mit Artikel 3 → 6** | + *der Iran* (im / in den / aus dem) · *die Niederlande* (pl.) · *die Ukraine* (or *die Slowakei*) | +3 |
| O4 | **am Gebäude / zum 2 → 5** | + *die Haltestelle* · *die Tankstelle* · *die Kasse* (an der · zur · von der); label → „Bahnhof, Haltestelle, Kasse …“ | +3 |
| O5 | **Kontakt + 1 feminine** | + *die Ostsee* (an der · an die · von der) | +1 |
| O6 | **Fläche + 1 neuter** | + *das Land* (auf dem Land · aufs Land · vom Land) — first card where *aufs* is correct | +1 |
| O7 | **Person 18 → 15** | remove *Johannes* (Lisa, Oma cover names), *Zahnarzt* (same as Arzt), *Ikea* (H&M covers shops) | −3 |
| O8 | *(optional)* Schule | add *zur* as „Auch richtig“ for Wohin | ±0 |

**Result:** 74 → 69 cards. Raum 16 %, Person 22 %, Stadt 9 %, Land mit Artikel 9 %, am Gebäude 7 %.

## 5. For future changes
- Keep the easy default groups (Raum, Stadt) ≤ ~15 % each.
- Contrast groups (Land mit Artikel, am Gebäude, immer in) ≥ 5 cards each.
- Balance by preposition, not by gender — the gender is given by the buttons.

## Decisions log
| Category | Final list | Cards |
|---|---|---|
| Raum | Haus, Kino, Theater, Restaurant, Museum, Hotel, Büro, Supermarkt (innen), Krankenhaus, Zentrum — removed Café, Küche, Kaufhaus, Oper, Schule, Fitnessstudio, Disneyland | 10 |
| Stadt / Land ohne Artikel | Berlin, Paris, London, Japan, Italien, Österreich — removed Madrid, Spanien, Mexiko, China | 6 |
| Land mit Artikel | die Schweiz, die Türkei, die USA | 3 |
| Kontakt | Strand, Meer, See, Fluss, Küste, Fenster, Tisch, Atlantik, **die Ostsee (new)** | 9 |
| Offene Fläche | Sportplatz, Spielplatz, Markt, Balkon, Straße, Insel, Berg, **das Land**, **das Dach**, **die Toilette** (new; replaces Fußballplatz — a "room" that takes *auf*) | 10 |
| Person / Geschäft / Aktivität | Arzt, Friseur, Chefin, Oma, Lisa, Großeltern · H&M, Ikea, Supermarkt (Gegend) · Arbeit, Prüfung, Party, Hochzeit, Picknick, Training — removed Zahnarzt, Bäcker, Johannes | 15 |
| Immer in | Wald, Park, Garten, Schwimmbad, Berge, Alpen | 6 |
| am Ort (an · zu · von) | Bahnhof, Supermarkt (direkt davor), **Haltestelle**, **Tankstelle**, **Kasse** (new; Kasse: *an die Kasse* accepted as „Auch richtig“) — label now „Bahnhof, Haltestelle, Kasse (am Ort)“ | 5 |
| Adresse · Zuhause | Goethestraße · Hause | 1 + 1 |

- **Note for the am-Ort cards:** picking *an den / an die* on Wohin shows **zum Bahnhof — so sagt man · так говорят / that's how you say it** and **an den Bahnhof — unüblich · так обычно не говорят / not usual** (texts in `ORTS_ZU_HINTS.normal / .unueblich`).
- *aufs* is now a correct answer on 2 cards (Land, Dach). *zur Schule* question is gone (Schule removed).

**Result: 66 cards.** Raum 15 % · Person 23 % · Fläche 15 % · Kontakt 14 % · Stadt 9 % · Immer in 9 % · am Ort 8 % · Land mit Artikel 5 %.
Files: `ortspraepositionen.js?v=7`, `index.html` v8 (`zuHint()`), hub link `ortspraepositionen/index.html?v=13`, Home tile `praepositionen/?v=5`. Copies before: `ortspraepositionen_before-balance.js`, `index_before-balance.html`. Browser-tested (Bahnhof + *an den* → note; Kasse + *an die* → correct as alt; no errors).

**Follow-up 2026-09-25 · Toilette**
- *auf die Toilette / auf der Toilette* is the normal everyday phrase (*Ich muss mal auf die Toilette*); the room itself = *ins Bad*. *zur Toilette* is also correct → accepted as „Auch richtig“ for Wohin.
- New optional card field **`note` {ru, en}**: a line under the rule after the card, for cards that break their category's pattern. Toilette: „Ausnahme · это комната, но говорят auf (или zu), не in“ / „Ausnahme · it's a room, but German says auf (or zu), not in“.
- Files: `ortspraepositionen.js?v=8`, page v9, hub link `?v=14`. Browser-tested (auf der · zur · von der → Richtig + note + „Auch richtig: zur Toilette.“).
