# QA 06c · Pronomen — Effectiveness check

**Date:** 2026-09-25 · **Exercise:** Pronomen · **File:** `deutsch-home/pronomen/pronouns.js`
**Related:** `QA_06_Pronomen.md` (content) · `QA_06b_Pronomen_Balance_Check.md` (balance)
**Status:** ✅ Applied 2026-09-25 · browser-tested · to test on phone

## 1. Goal of the exercise (set by Alena)
**Memorise the pronoun table** — personal pronouns in Akkusativ / Dativ and possessive stem + ending.
It does **not** train *why* a case is used (verb valency, reflexive use). Every item should point clearly at one cell of the table.

## 2. Rating against that goal: 7.5 / 10 before changes
**Works for the goal**
- Russian shown before answering = the cue for the cell (мне → *mir*). Sentences where Russian and German use the same case are the core, not "too easy".
- Possessive context gives the noun's gender — needed to know the ending cell.
- Typing the full form (recall), personal / possessive mixed, wrong answers return more often, weak forms highlighted in the table.
- Feedback (answer + category) is enough — no change.

**Worked against the goal**
1. **11 "Russian-trap" sentences** (added in 06b): the Russian cue points to the wrong cell (*Ich gratuliere dir* / поздравляю **тебя**). A wrong answer meant "doesn't know the verb", but was recorded as a weak form.
2. **12 reflexive sentences**: no new forms, no Russian cue (умываюсь), doubled the weight of *ich / du*.
3. **21 possessive contexts gave the ending away**: *Ich habe ein**en** Bruder → mein**en** Bruder*.

## 3. Changes applied
| # | Change | Count |
|---|---|---|
| 1 | Trap sentences replaced by sentences where Russian = German case (10 from `pronouns_before-balance.js`, 1 new: *Du bist krank? Ich besuche **dich** morgen.*) | −11 / +11 |
| 2 | All reflexive sentences removed (progress categories drop automatically) | −12 |
| 3 | 21 possessive contexts rewritten: noun with *der / die / das* or Dativ, never *ein/eine/einen*. New nouns where needed: *Koffer, Schlüssel, Kater, Haus, Rechnung, Wohnung (Wie groß ist …)*. *Hund* now only in 2 sentences. Kept: *die → -e* for feminine (a real table pattern). | 21 rewritten |
| 4 | 3rd sentence for the confusable forms: *Ich besuche **ihn** jeden Sonntag · Ich kaufe **ihm** ein Buch · Ich erkläre **ihr** alles · Wir zeigen **ihnen** die Stadt · Ich wünsche **Ihnen** alles Gute!* | +5 |
| 5 | Genitiv Maskulin: *Das Büro **seines** Chefs ist im dritten Stock.* | +1 |
| 6 | Dativ Feminin 8 → 5, Plural 8 → 5 (removed repeats: *deiner neuen Kollegin, unserer Nachbarin, Ihrer Kollegin, meinen Freunden, seinen Kollegen, ihren Kindern*) | −6 |

**Result: 115 → 103 sentences** — personal 41, possessive 62.

## 4. Balance after changes
**Personal:** every cell 2; *ihn, ihm (er), ihr (sie), ihnen, Ihnen* 3.
**Possessive endings (case × gender):**
| | Mask. | Fem. | Neutr. | Plural |
|---|---|---|---|---|
| Nom. | 5 | 4 | 3 | 3 |
| Akk. | 7 | 4 | 4 | 4 |
| Dat. | 5 | 5 | 4 | 5 |
| Gen. | 3 | 3 | 3 | – |

Akk. Maskulin 7 = one per owner, kept on purpose (*-en* is the most forgotten ending).
**By typed ending:** none 12 · -e 15 · -en 12 · -em 9 · -er 8 · -es 6.
**Owners:** ich 8 · du 8 · er 8 · sie 8 · wir 7 · ihr 9 · sie (pl.) 7 · Sie 7. Copyable endings: **0**.
Session mix stays 50/50 → each table cell ≈ 1 card in 30–35 on both sides.

## 5. For future changes
- Every personal sentence: the Russian case must **match** the German one.
- Possessive context: gender yes, ending no (no *ein/eine/einen* in the context when it would equal the answer's ending).
- Reflexive / verb-valency practice belongs in a separate exercise.

## Files
`pronouns.js?v=5`, `index.html` v7.24, Home tile `pronomen/?v=13`. Copies before: `pronouns_before-effectiveness.js`, `index_before-effectiveness.html`, `Home/index_before-qa-pronomen-eff.html`.
Browser-tested: 3 × 50-card sessions, 25/25 mix, all correct answers accepted, 41 progress categories / 103 sentences, no errors.

## Decisions log (after applying)
Reviewed 2026-09-25 — **intended as is, don't re-raise in future reviews:**
| # | Point | Decision |
|---|---|---|
| D1 | Capital letters (*Sie / Ihnen / Ihr-* vs *sie / ihnen / ihr-*) not checked; keyboard has no Shift | Fine — the app trains speaking, not writing |
| D2 | Forms already "sicher" come up as often as new ones | Intended — mixing old forms in prevents confusing them while learning new ones |
| D3 | With 2–3 sentences per cell, sentences get memorised | Wanted — a memorised sentence works as an anchor when choosing a form in speech. So: sentences must be natural, everyday phrases |
| D4 | 10-card round covers each cell only every ~4 rounds | Intended — 10 cards ≈ 3–4 min, a quick round on the go |

**Final rating:** 9.5 / 10 against the goal (memorise the table). Remaining gap is the format itself (typing a form ≠ producing it in live speech), not the exercise.
