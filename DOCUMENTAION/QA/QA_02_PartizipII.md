# QA 02 · Partizip II

**Checked:** 2026-09-24 · **Level target:** A2 → B1
**Files:** `deutsch-home/verbformen/partizipII/verbs.js` (85 verbs; 79 in the exercise, 6 modal verbs excluded), `index.html` (answer logic + pattern table)
**Status:** Fixes applied 2026-09-24 (copies before: `verbs_before-qa.js`, `index_before-qa.html`, `verbformen/index_before-qa.html`). To test on phone.

**How the exercise works:** shows infinitive + Russian → learner types Partizip II → result shows vowel change, Perfekt (Hilfsverb + Partizip) and an example sentence.

Legend: ❌ error · ⚠️ debatable / unnatural · 💬 style / improvement

## Summary
- **All 79 participles, all Präteritum forms, all Hilfsverben (haben/sein) and all vowel patterns are correct.**
- Answer check: exact match, case-insensitive; *ß* is on the app keyboard (needed for *geheißen*). No card has two possible answers (the infinitive is shown).
- Issues: 2 example sentences use a **different verb**, 1 wrong Russian translation, and the **pattern table** shows 4 vowel changes that don't exist in this set.

## ❌ Errors
| # | Verb | Current | Problem | Proposed |
|---|---|---|---|---|
| E1 | bringen | *Sie hat die Unterlagen **mit**gebracht.* | Example uses *mitbringen*, not *bringen*; the card teaches *gebracht* | *Sie hat mir einen Kaffee gebracht.* |
| E2 | lügen | *Er hat mich **an**gelogen.* | Example uses *anlügen* | *Er hat gelogen.* → better: *Das Kind hat nicht gelogen.* |
| E3 | rufen | звать; **звонить** | *rufen* ≠ phone call (that's *anrufen*) | звать; вызывать (врача, такси) |
| E4 | Pattern table | „ö → o“, „ü → ü · u · o“, „ie → ie · o · e“, „i → i · u · o · e · a“ | Says "possible vowel changes in this set", but *ö → o*, *ü → ü / u* exist only in the excluded modal verbs, and no verb has *ie → ie* or *i → i* | ü → o · ie → o · e · i → a · e · o · u · remove the ö cell |

## ⚠️ Unnatural or debatable
| # | Verb | Current | Problem | Proposed |
|---|---|---|---|---|
| A1 | kennen | *Ich habe ihn schon lange gekannt.* | Correct, but sounds like the person is gone / contact ended; Germans say *Ich kenne ihn schon lange.* | *Ich habe ihn gar nicht gekannt.* |
| A2 | bieten | *Die Firma hat mir eine Stelle geboten.* | For a job offer Germans say *angeboten* | *Die Stadt hat uns viel geboten.* |
| A3 | liegen, sitzen, stehen | Perfekt: haben | Correct in standard / northern German; in southern Germany, Austria and Switzerland: *ist gelegen / gesessen / gestanden* | Optional: show „haben (Süden: sein)“ |

## 💬 Style
| # | Verb | Current | Proposed |
|---|---|---|---|
| S1 | steigen | подниматься | подниматься; расти (о ценах) (the example is about prices) |
| S2 | erscheinen | появляться; выходить | появляться; выходить (о книге, статье) |
| S3 | teilnehmen | *an dem Kurs* | *am Kurs* (more natural) |
| S4 | 6 modal verbs in `verbs.js` | not used by any exercise (Modalverben uses its own `special_verbs.js`) | Leave as is (no effect). Note: *Das habe ich nicht gesollt* is very unusual German if ever reused. |

## ✅ Verified correct
Everything else: participles, Präteritum, Hilfsverben (incl. *sein / haben* for fahren, fliegen, schwimmen, ziehen, brechen), vowel patterns, Russian translations (accurate, grammatical, no typos), example sentences.

## Coverage (question, not a finding)
The deck has only strong and mixed verbs. Common B1 strong/mixed verbs that are missing, e.g.: *verlassen, vergleichen, verbieten, verzeihen, bestehen (Prüfung), verbringen, beschreiben, anrufen, einsteigen / aussteigen / umsteigen, mitnehmen, rennen, stehlen, schweigen, schreien, genießen, raten, schlagen, treten, gelten, leiden, frieren, gelingen*.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1 | bringen: *Sie hat mir einen Kaffee gebracht.* | ✅ |
| E2 | lügen: *Das Kind hat nicht gelogen.* | ✅ |
| E3 | rufen: звать; вызывать (врача, такси) | ✅ |
| E4 | Pattern table: keep as is | ✅ kept; only **ä → a** cell added, needed for the new verb *hängen* |
| A1 | kennen: *Ich habe ihn gar nicht gekannt.* | ✅ |
| A2 | bieten → replaced by **anbieten** (*Sie hat mir einen Job angeboten.*) | ✅ |
| A3 | „Süden: sein“: not needed | — |
| S1 | steigen: „подниматься; расти (о ценах)“ (applied 2026-09-25, `verbs.js?v=3`) | ✅ |
| S2–S4 | S2, S3 obsolete (verbs removed); S4 leave | — |

### Verb list (teacher's table, Uni München „Starke Verben / Ablautreihen“)
Rule: same-root verbs are not needed (same vowel change), except one example per *ge-* position: **anfangen** (an**ge**fangen), **bekommen / verstehen** (no *ge-*).

- **Removed (12):** fangen, ankommen, aufstehen, einschlafen, teilnehmen, erfahren, erhalten, erkennen, versprechen, erscheinen (same root) · schieben, brennen (rare)
- **Replaced:** bieten → anbieten
- **Added (10):** genießen, vergleichen, gelingen (sein), verschwinden (sein), stehlen, backen, hängen (*gehangen*, = висеть), raten, rennen (sein), schlagen
- Optional verbs (schreien, schweigen, verzeihen …): not added.
- Result: **77 verbs** in the exercise (+6 unused modal entries). All checked: no duplicates, every example contains its participle, every vowel change is in the pattern table.
- Technical: `verbs.js?v=2`, page tag v43, hub link `partizipII/?v=4`. Browser-tested (hängen, anbieten correct; wrong answer shows „Not quite“).
