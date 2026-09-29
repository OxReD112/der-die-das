# QA 07 · Artikel

**Checked:** 2026-09-25 · **Level target:** A2 → B1
**Files:** `deutsch-home/Artikel/words.js` (238 nouns, 42 rule groups), `index.html`
**Balance check:** see `QA_07b_Artikel_Balance_Check.md`
**Status:** Fixes applied 2026-09-25 (copies before: `words_before-qa.js`, `index_before-qa.html`, `Home/index_before-qa-artikel.html`). To test on phone.

**How it works:** noun + Russian → learner picks der / die / das → feedback shows the rule (label, explanation, examples, reliability note).

## Summary
- **All 238 articles are correct.** No duplicates.
- But: **1 rule is wrong** (trees), **3 nouns sit in a rule they don't match** (Nummer, Praktikum, Diskussion), 1 example list shows a word from another rule, 2 Russian translations are wrong (*Stadium*, *Marmelade*), and some nouns are rare / not useful at B1.

## ❌ Errors
| # | Where | Problem | Proposed |
|---|---|---|---|
| E1 | TREES → MOSTLY DER („Names of trees are usually masculine“), only card: *der Baum* | **Wrong rule**: German tree names are mostly **feminine** (die Eiche, die Birke, die Buche, die Tanne, die Linde); *der Baum* itself is not a tree name | Remove the rule; *der Baum* → „NO RELIABLE RULE“ |
| E2 | -E PATTERN · *die Nummer* | *Nummer* doesn't end in -e | → „NO RELIABLE RULE“ |
| E3 | -IUM ENDING · *das Praktikum* | ends in -**um**, not -ium | → -UM group |
| E4 | -TION ENDING · *die Diskussion* | ends in -**sion** | Rename group „-TION / -SION ENDING“ („Nouns ending in -tion / -sion are feminine.“) |
| E5 | -IUM · *das Stadium* — „стадион“ | *das Stadium* = **стадия**; стадион = *das Stadion* | „стадия, этап“ |
| E6 | -ADE · *die Marmelade* — „мармелад, джем“ | false friend: *Marmelade* = джем / варенье; мармелад = *Fruchtgummi* | „джем, варенье“ |
| E7 | -HEIT · Wahrheit, Schönheit — examples „die Freiheit, die Gesundheit, **die Möglichkeit**“ | *Möglichkeit* is -keit | „die Freiheit, die Gesundheit, die Krankheit“ |

## ⚠️ Rules that miss important exceptions
| # | Rule | Missing | Proposed |
|---|---|---|---|
| A1 | Beverages → mostly der (exception only *das Bier*) | *das Wasser*, *die Milch* are the most common drinks of all | Add both to the exception group; reliability: „Exceptions: das Bier, das Wasser, die Milch.“ |
| A2 | -MENT → das | *der Moment* (very common) | Add as exception card |
| A3 | -MA → das | *die Firma* (very common) | Add as exception card |
| A4 | -UR → die | *der Flur*, *das Abitur* | Add *der Flur* as exception card |

## 💬 Less useful nouns (rare / old-fashioned)
| Group | Current | Proposed |
|---|---|---|
| -KEIT | die Mündlichkeit, die Schnelligkeit, die Wichtigkeit | → die Pünktlichkeit, die Geschwindigkeit, die Kleinigkeit |
| -CHEN | das Männchen, das Weibchen, das Entchen | → das Märchen, das Würstchen, das Hähnchen |
| -LEIN | 5 cards incl. *das Fräulein* (outdated) | keep 2 (Büchlein, Vöglein), remove the rest — -lein is rare in speech |
| -UR | die Zensur, die Konjunktur | remove (rare at B1) |
| REMEMBER: DIE TÜR / DAS ZIMMER / DER SCHEIN / DER HOF / DAS HAUS | explanation „The important part is die Tür.“ | Name the real rule: „**Compound nouns take the article of the last word:** Haus + **die Tür** → die Haustür.“ |

## Missing B1 rules (recommended)
| Rule | Cards | Reliability |
|---|---|---|
| **-IN (female person) → die** | die Lehrerin, die Freundin, die Ärztin, die Kollegin, die Chefin | very reliable |
| **Ge- (collective / from verbs) → das** | das Gebäude, das Gemüse, das Getränk, das Gespräch, das Geschenk, das Gesicht | strong (exceptions: der Geschmack, die Geschichte) |
| **-NIS → mostly das** | das Ergebnis, das Zeugnis, das Erlebnis, das Geheimnis + exception *die Erlaubnis* | strong |
| **-ER (person / device from a verb) → der** | der Lehrer, der Fahrer, der Computer, der Drucker, der Wecker | strong (only for words made from verbs; *die Butter*, *das Zimmer* are not) |

## ✅ Verified correct
All articles; all other rules, explanations, examples, reliability notes and Russian translations.

## Result
238 − 5 removed (3 × -lein, Zensur, Konjunktur) + 5 exceptions (Wasser, Milch, Moment, Firma, Flur) + 21 new = **259 nouns**; 6 nouns replaced; rule groups: − trees + 4 new rules + 3 exception groups (-ment, -ma, -ur) = **48**.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1–E4 | Trees rule removed (*der Baum* → no reliable rule) · *die Nummer* → no reliable rule · *das Praktikum* → -UM · group renamed **„-TION / -SION ENDING“** („Nouns ending in -tion or -sion are feminine.“; progress for this group restarts because the name changed) | ✅ |
| E5 | *das Stadium* removed, replaced by **das Gymnasium** (гимназия) | ✅ |
| E6, E7 | Marmelade „джем, варенье“ · -heit examples „die Freiheit, die Gesundheit, die Krankheit“ | ✅ |
| Exceptions | das Wasser, die Milch (+ Bier) → „BEVERAGE EXCEPTION“; new single-card groups: der Moment (-MENT EXCEPTION), die Firma (-MA EXCEPTION), der Flur (-UR EXCEPTION), die Erlaubnis (-NIS EXCEPTION) | ✅ |
| Replaced | Pünktlichkeit, Geschwindigkeit, Kleinigkeit · Märchen, Würstchen, Hähnchen | ✅ |
| Removed | Häuslein, Kindlein, Fräulein · Zensur, Konjunktur · -ung trimmed 17 → 10 (Bildung, Bewegung, Bedeutung, Verbindung, Entwicklung, Veranstaltung, Erklärung) · die Lampe | ✅ |
| Compounds | top line unchanged („REMEMBER: DIE TÜR“ …); explanation now „Compound nouns take the article of the last word.“ (note below unchanged, no repetition) | ✅ |
| New rules | -IN ENDING (FEMALE PERSON) ×5 · GE- PREFIX ×6 · -NIS ENDING ×4 (Ergebnis, Zeugnis, Erlebnis, Verständnis) · -ER ENDING (FROM A VERB) ×5 (Lehrer, Fahrer, **Fernseher**, Drucker, Wecker) | ✅ |

**Result: 251 nouns, 49 groups.** Largest: no reliable rule 15 (tracked per word), -ung / -keit / -e 10 each; all others 1–9. Automatic checks: no duplicates; every noun matches its group's ending/prefix; every example word matches its rule; no removed word left in examples. Data `words.js?v=2`, Home tile `artikel/?v=2.4`. Browser-tested (Gymnasium, Wasser, Haustür, Diskussion, Fernseher, Wahrheit).
