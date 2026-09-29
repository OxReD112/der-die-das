# QA 01 · Ortspräpositionen (Wo · Wohin · Woher)

**Checked:** 2026-09-24 · **Level target:** A2 → B1
**Files:** `deutsch-home/praepositionen/ortspraepositionen/ortspraepositionen.js` (54 cards, 9 categories), `index.html` (answer logic)
**Status:** Revision 2 applied 2026-09-24 (see bottom). First fixes applied 2026-09-24 (backups: `ortspraepositionen_before-qa.js`, `index_before-qa.html`). Coverage additions + Regeln sheet: waiting for decision.

Legend: ❌ error · ⚠️ ambiguous / more than one correct answer · 💬 style / improvement

---

## Summary

- **German forms: all correct.** All 54 × 3 = 162 generated sentences use the right article, gender, case (Dativ/Akkusativ), contraction (im/ins/am/ans/vom/beim/zum/zur), plural Dativ (*in den Bergen*) and special form (*von zu Hause*).
- **Mechanical checks: clean.** No duplicate IDs, every category exists, every article matches the gender, every correct answer is one of the buttons shown.
- **Answer logic:** answers are picked with buttons and compared exactly, so umlaut or capitalisation problems can't happen. The `../../components/` path matches the deployed folder structure (documented in PROGRESS_TRACKER).
- **Main issues:** 2 unnatural cards, 1 systematic ambiguity (*zum/zur* is also correct for Wohin), and Russian hints written with a hyphen instead of brackets.

---

## ❌ Errors

| # | Card | Current | Problem | Proposed fix |
|---|---|---|---|---|
| E1 | `wasser-auf` | *Ich gehe **auf das** Wasser.* | Unnatural: it reads as "I walk on the water". Also the natural contraction would be *aufs*. The card only works with a different verb (*Ich fahre aufs Wasser* – with a boat). | **Option A:** remove the card. **Option B:** add an optional per-card verb (`leads:{wohin:"Ich fahre"}`, small code change) and use `aufs`. |
| E2 | `station` | *Ich bin an der Station / Ich gehe an die Station / Ich komme von der Station*, ru „станция“ | *Station* is not the everyday word here: a bus/tram stop is *die Haltestelle*, a metro station *die U-Bahn-Station*, and *Station* alone often means a hospital ward. *zur Station* would also be more natural than *an die Station*. | Replace with a clear **an**-noun: **die Küste** (побережье): *an der Küste / an die Küste / von der Küste*, or **die Tür** (дверь): *an der Tür / an die Tür / von der Tür*. |

## ⚠️ Ambiguous (a second correct answer is marked wrong)

| # | Cards | Issue | Proposed fix |
|---|---|---|---|
| A1 | Wohin for **Strand, Meer, See, Fluss, Wasser, Fenster, Markt, Spielplatz, Sportplatz, Fußballplatz, Park, Wald, Schwimmbad, Kino, Theater, Museum, Hotel, Restaurant, Café** | The **zum/zur** button is always shown, and *Ich gehe zum Strand / zum Markt / zum Park / zum Kino* is **correct German** (= to the place, as a destination point). The app marks it wrong. At B1 this is a real distinction learners should know, not a mistake. | **Recommended:** accept *zum/zur* as "also correct" and show a short note, e.g. „auch richtig: *zum Strand* (bis zum Ort)“ (code change). **Alternative:** keep it strict but add a line to the rule panel after the card explaining *zu* vs *in/an/auf*. |
| A2 | `bahnhof` | *im Bahnhof* (inside) and *beim Bahnhof* (nearby) are also correct, and the hint „вокзал“ doesn't say which is meant. | Change the hint to „вокзал (у вокзала)“, like `supermarkt-am`. |
| A3 | `arbeit` | *auf der Arbeit* is very common in spoken German (especially in the north); the „auf der“ button is shown and marked wrong. *bei der Arbeit* is the standard and correct target. | Keep. If A1 is implemented, the same "also possible" note could cover this. |
| A4 | `oma` | *bei Oma / zu Oma / von Oma* (without an article) is the most common form for one's own grandmother; the app's buttons always include an article. *bei der Oma* is also correct. | Keep (the buttons require an article). Optional hint: „бабушка (чья-то)“, or replace with *Tante / Nachbarin*. |

## 💬 Style and improvements

| # | Where | Current | Proposed |
|---|---|---|---|
| S1 | Russian hints: the file header says "hint in brackets", but the hints use a hyphen „ - “, which is incorrect punctuation in Russian | see right | `haus` дом (здание) · `supermarkt-innen` супермаркет (внутри) · `meer` море (на побережье) · `see` озеро (на берегу) · `fluss` река (на берегу) · `wasser-ufer` вода (у воды, на берегу) · `supermarkt-am` супермаркет (прямо у здания) · `supermarkt-gegend` супермаркет (где-то рядом, в районе) · `hm` H&M (магазин) |
| S2 | `berg` ru | гора - одна | гора (на вершину, на вершине): contrasts with *Berge* = горы (в горах) |
| S3 | `wasser-im` ru | вода - плавать | вода (в воде, плавать) |
| S4 | `wasser-auf` ru (if kept) | вода - на матрасе | вода (на воде: на лодке, на матрасе) |
| S5 | `hause` ru | свой дом | дом (дома / домой / из дома) |
| S6 | `berge` ru | горы | горы (в горах) (optional, pairs with S2) |
| S7 | `sportplatz` ru | спортплощадка | спортивная площадка (more neutral; the current word is also acceptable) |
| S8 | `wasser-im` category | `raum` → after the answer the panel shows „Raum, geschlossener Ort“ for water | Move to `ausnahme` and extend its label: „Wald, Park, Garten, Schwimmbad, Berge, Wasser“ |
| S9 | `ausnahme` rule | „immer in“ | „in · in · aus (immer in)“, the same format as the other categories |
| S10 | `person` label | „Person, Firma, Aktivität, Ort“ (*Ort* is vague: every card is an Ort) | „Person, Geschäft, Aktivität, Nähe“ |
| S11 | Wohin sentences with *gehen* for far places | *Ich gehe nach Japan / in die USA / in die Türkei / auf die Insel* | Grammatically correct, but *gehen* here means "move/emigrate there"; for a trip Germans say *fahren/fliegen*. If the per-card verb from E1-B is added: `Ich fliege` for countries, `Ich fahre` for Insel/Berlin/Paris. |

## ✅ Verified correct (no change needed)

All other cards in all categories. Russian translations in all other cards are accurate, grammatical and free of typos. Category rules (in·in·aus, in·nach·aus, an·an·von, auf·auf·von, bei·zu·von, zu·nach·von zu, an·zu·von) are correct.

---

## Decisions log

| # | Decision | Applied |
|---|---|---|
| E1 | Remove `wasser-auf` | ✅ |
| E2 | Station → **die Küste** (an der / an die / von der, also: zur) | ✅ |
| A1 | Accept zu as "also correct" on 30 cards (list below) + note after the card. Full explanation with examples → Regeln sheet (placement to decide) | ✅ acceptance + note · ⏳ Regeln sheet |
| A2 | Hint more specific: „вокзал (на вокзале: встреча, поезд)“. No second card (Supermarkt trio already teaches innen / am / in der Nähe) | ✅ |
| A3 | Accept „auf der Arbeit“ + note „разговорное, стандарт — bei der Arbeit“ | ✅ |
| A4 | Oma without article: bei Oma / zu Oma / von Oma, hint „бабушка (моя)“ | ✅ |
| S1–S7 | All Russian hints as proposed (brackets instead of hyphen, new wording) | ✅ |
| S8 | `wasser-im` moved to „Wald, Park, Garten, Schwimmbad, Berge, Wasser“ | ✅ |
| S9 | Rule „in · in · aus (immer in)“ | ✅ |
| S10 | Label „Person, Geschäft, Aktivität, Nähe“ | ✅ |
| S11 | Per-card verb: *Ich fliege* nach Japan / Italien, in die Türkei / USA · *Ich fahre* nach Berlin / Paris / Österreich, in die Schweiz, auf die Insel | ✅ |
| extra | Neuter button „auf das“ → „aufs“ (natural contraction) | ✅ |

### Changes applied (technical)
- Data: new optional fields `lead`, `alt`, `note` (documented in the file header). 53 cards (−1 removed; Station→Küste).
- `alt` wohin **zum** + woher **vom**: Haus, Kino, Theater, Restaurant, Café, Museum, Hotel, Büro, Wald, Park, Schwimmbad.
- `alt` wohin **zum/zur** only: Strand, Meer, See, Fluss, Wasser (Ufer), Küste, Fenster, Fußballplatz, Sportplatz, Spielplatz, Markt, Insel, Berg.
- Deliberately **not** accepted (unnatural, or the hint says "inside"): Küche, Supermarkt (innen), Balkon, Straße, Garten, Berge, Wasser (im).
- index.html: accepts `alt`, shows the chosen form in green, adds a note under the rule, per-card verb, cache `?v=2`, version mark v5. Tested in a browser: Strand/zum, Arbeit/auf der, Kino/vom → „Richtig“ + note.

---

## Coverage check: is the deck enough for B1?

The current deck covers the A2 core well. As a **drill** it is good. It does **not yet explain**: there is no overview of the rules, and the case logic is never stated (Wo = Dativ, Wohin = Akkusativ with in/an/auf; zu, nach, bei, aus, von are **always Dativ**).

### Missing B1 groups (recommended additions)

| Prio | Group | Cards | Forms | Why |
|---|---|---|---|---|
| 1 | **Veranstaltung → auf** (new category) | die Party, die Hochzeit, das Fest | auf der Party / auf die Party (also: zur) / von der Party · aufs Fest | Very common, typical mistake „in der Party“ |
| 1 | **Uni, Haltestelle → an** (join „an · zu · von“) | die Uni, die Haltestelle | an der Uni / zur Uni (also: an die) / von der Uni | B1 everyday life, „an der Uni studieren“ |
| 1 | **Insel mit Namen → auf · nach · von** (new) | Mallorca, Rügen | auf Mallorca / nach Mallorca / von Mallorca | Different from both *die Insel* and countries |
| 1 | **Straße als Adresse → in** (contrast) | Goethestraße | in der Goethestraße / in die … / aus der … | Contrasts *auf der Straße*: „Ich wohne in der …straße“ |
| 1 | **das Land** (countryside) | Land | auf dem Land / aufs Land / vom Land | Fixed B1 phrase, uses „aufs“ |
| 2 | **Abstrakte Orte → in** | das Ausland, der Urlaub, die Stadt (центр) | im Ausland / ins Ausland / aus dem Ausland · in den Urlaub · in die Stadt | Very frequent at B1 |
| 2 | **Schule** | die Schule | in der Schule / in die Schule (also: zur) / aus der Schule | *zur Schule gehen* = to attend school |
| 3 | Land mit Artikel **der** | der Iran | im Iran / in den Iran / aus dem Iran | Completes the country pattern (die / die Pl. / der) |
| 3 | Meer mit Namen | die Ostsee | an der Ostsee / an die Ostsee / von der Ostsee | Holiday German |

Not recommended: Post / Bank / Amt (*auf der Post* is dated/regional; would confuse more than help).

### Where the zu vs in/an/auf examples could go
1. **Short note on the card** (✅ done): appears only when the learner picked *zum/zur/vom*.
2. **„Regeln“ sheet** (proposal): a button on the start screen opening a one-screen overview: all categories with a Wo/Wohin/Woher triplet, the case logic, and the contrast pairs:
   - *Ich gehe **ins** Kino.* — смотреть фильм (внутрь) · *Ich gehe **zum** Kino, dort treffe ich Anna.* — до кинотеатра, встреча у входа
   - *Wir fahren **an den** See.* — отдыхать на озере · *Der Weg führt **zum** See.* — дорога ведёт к озеру
   - *Die Kinder spielen **auf dem** Spielplatz.* · *Ich bringe die Kinder **zum** Spielplatz.* — отвожу до площадки
   - *Ich komme **aus dem** Büro.* — только что вышла из здания · *Ich komme gerade **vom** Büro.* — возвращаюсь оттуда
   - Rule of thumb: **zu = цель пути (точка на карте); in / an / auf = где я окажусь (внутри, у края, на поверхности).**


---

## Revision 2 (after comparing with the teacher's source, Lektion 35 p. 84–85)

**Principle:** the exercise drills the textbook table: each place belongs to one box, and one answer per card is correct. *zu* ("only up to the place") is outside this drill, so it is **not** accepted outside the „bei · zu · von“ and „an · zu · von“ boxes.

- ❌ Reverted A1: no more zum/zur/vom alternatives, no meaning notes. (Copies before: `ortspraepositionen_before-qa2.js`, `index_before-qa2.html`.)
- Only real everyday variants are accepted, shown as „Auch richtig: …“ **below the Continue button** (nothing moves): *auf der Arbeit*, *auf der Party*, *auf der Hochzeit*.
- The coverage list above (Party as its own category, Uni, Mallorca, Land, Urlaub …) is **replaced** by cards from the teacher's exercises, all in existing boxes:
  - Raum: Krankenhaus, Kaufhaus, Oper, Schule, Zentrum, Fitnessstudio, Disneyland
  - Stadt/Land ohne Artikel: Madrid, London, Spanien, Mexiko, China (*Ich fliege*)
  - Immer in: Alpen
  - Kontakt/Wasser: Tisch, Atlantik
  - Person/Aktivität: Chefin, Johannes, Ikea, Prüfung, Großeltern (first plural-person card), Party, Hochzeit
  - New small box „Straße als Adresse“ (in · in · aus): Goethestraße (*Ich wohne in der / Ich ziehe in die / Ich komme aus der*); Straße hint now „улица (на улице, снаружи)“ for contrast.
- Deck: **76 cards**, all checked (article = gender, every answer among the buttons). Hub link `?v=8`, page v6.

### ✅ Built: why *zu* is not accepted (page v7, hub `?v=9`, copy before: `index_before-zuhint.html`)
Only when a learner picks *zum/zur/zu den* on Wohin in an in/an/auf box, or *vom/von der* on Woher where the answer is *aus*, this appears below the Continue button:
**ins Kino** — hinein · внутрь / **zum Kino** — nur bis dorthin · только до. (an-box: „direkt dran · вплотную“, auf-box: „drauf · на само место“; Woher: **aus dem Kino** — heraus · изнутри / **vom Kino** — nur von dort · просто оттуда.) Never shown on correct answers or in the bei/zu/von boxes. Browser-tested, dark + light.

**Exercise 1: done.** Waiting only for the phone test.


---

## Revision 3 · Wasser removed
Both remaining Wasser cards (*am Wasser*, *im Wasser*) removed; „Wasser“ taken out of the „immer in“ label (it was wrong there: Wasser is not always *in*). Reason: the teacher's picture only illustrates that one noun can take different prepositions; the deck already shows this with Supermarkt (im / am / beim) and Berg / Berge, and *am Wasser* is covered by Meer, See, Fluss, Strand. Deck: **74 cards**. Copy before: `ortspraepositionen_before-wasser.js`; data `?v=4`, hub `?v=10`.

---

## Revision 4 · zu-hint texts moved to the data file (2026-09-25)
The German · Russian hint texts (hinein · внутрь, nur bis dorthin · только до, …) now live in `ortspraepositionen.js` as `window.ORTS_ZU_HINTS`; `index.html` contains no Russian any more. Output on screen unchanged (browser-tested). Copies before: `ortspraepositionen_before-zutexts.js`, `index_before-zutexts.html`. Data `?v=5`, hub link `?v=12`.
