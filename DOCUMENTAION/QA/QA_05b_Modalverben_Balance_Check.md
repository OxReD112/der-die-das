# QA 05b · Modalverben — Balance check

**Date:** 2026-09-25 · **Exercise:** Modalverben (+ werden) · **File:** `deutsch-home/verbformen/modalverben/special_verbs.js` (124 sentences)
**Related:** `QA_05_Modalverben.md` (content check)
**Status:** ✅ Applied 2026-09-25 (see Decisions log). To test on phone.

## 1. Why
Are all verbs, forms and persons fairly represented? Where are the traps, and are there enough of them?

## 2. How we evaluated
- **How a session picks sentences** (`buildDeck()` in `index.html`): single sentences, randomly, sentences answered wrong get a higher weight. No grouping by verb or form.
- **Consequence:** a group's share of the file = its share of practice.
- **Method:** counted by verb · form · person (from the ending of the answer), and how often **the same answer string** repeats.
- **Where the traps are:** umlaut in Konj. II but not in Präteritum (*konnte / könnte, musste / müsste, durfte / dürfte, mochte / möchte, wurde / würde*); person endings (*-test, -tet*); infinitive instead of Partizip after *hätte* (*hätte … sollen*, not *gesollt*).

## 3. What we discovered

**By verb and form**
| Verb | Prät. | Konj. II | Other | Total |
|---|---|---|---|---|
| können | 8 | 8 | Konj. II Verg. 3 | 19 |
| müssen | 8 | 8 | Konj. II Verg. 2 | 18 |
| dürfen | 8 | 8 | – | 16 |
| sollen | 8 | 8 | Konj. II Verg. 3 | 19 |
| wollen | 8 | – | Prät. höflich 4 | 12 |
| mögen | 8 | 8 | – | 16 |
| werden | 8 | 8 | Partizip II 8 | 24 |

**By person**
| ich / er / sie / es | wir / sie / Sie | du | **ihr** | infinitive / *geworden* |
|---|---|---|---|---|
| 62 (50 %) | 30 (24 %) | 15 (12 %) | **1 (< 1 %)** | 16 |

**Findings**
1. **Präsens is missing completely.** The irregular Präsens is where the most frequent modal-verb mistakes happen: *ich kann / er kann* (no *-t*), vowel change in the singular (*dürfen → darf, müssen → muss, wollen → will, mögen → mag*), *du willst*. The forms table has it, but it's never practised. (Possibly on purpose — the exercise was designed as Präteritum + Konj. II.)
2. **ihr forms: 1 sentence** (*solltet*). *konntet, musstet, durftet, wolltet, könntet, müsstet, würdet* never come up.
3. **28 sentences (23 %) with no umlaut decision:** for *sollen* and *wollen* the Präteritum and the Konj. II are the same word (*sollte, wollte*), so 16 *sollen* + 12 *wollen* sentences are "free" as far as the main trap goes.
4. **Same answer repeated:** *geworden* 8 × (all Partizip II sentences), *wollte* 8 ×, *dürfte* 7 ×, *sollte* 7 ×.
5. **werden** is the biggest verb (24, 19 %), mostly because of 8 identical *geworden* answers.
6. ✅ The umlaut pairs (können, müssen, dürfen, mögen, werden) are 8 + 8 each — good.
7. ✅ Konj. II Vergangenheit (*hätte … sollen / können / müssen*) — 8, a good B1 trap; ***dürfen*** is missing (*Das hätte ich nicht sagen **dürfen*** — very common).

## 4. Proposed changes
| # | Change | Detail | Count |
|---|---|---|---|
| M1 | **❓ Add Präsens** | new form „Präsens“ for können, müssen, dürfen, sollen, wollen, mögen — 4 each, focused on the traps: *er **kann*** · *ich **muss*** · *du **darfst*** · *er **will*** · *du **willst*** · *sie **mag*** · *ihr **könnt*** … | +24 |
| M2 | **ihr forms 1 → 7** | rewrite existing *wir* sentences to *ihr* (one per verb): *konntet, musstet, durftet, wolltet, könntet, müsstet, würdet* | ±0 |
| M3 | **werden Partizip II 8 → 4** | all answers are *geworden* | −4 |
| M4 | **sollen Prät. 8 → 5, wollen Prät. 8 → 5** | no umlaut decision (see finding 3); keep *wollen · höflich* 4 | −6 |
| M5 | **Konj. II Vergangenheit + dürfen** | *Das hätte ich nicht sagen **dürfen**.* · *Du hättest das nicht machen **dürfen**.* | +2 |

**Open question:** M1 — should Präsens be part of this exercise? (If yes, the start screen / progress get a new form „Präsens“.)

**Result:** 124 → 116 (140 with M1). *werden* 24 → 20; ihr 1 → 7.

## 5. For future changes
- Each verb × form ≤ 8 sentences; if all answers of a group are the same word, 4 are enough.
- Every person ending (*-e, -est, -en, -et*) at least ~5 % of the file.
- Prefer sentences where the form decision really matters (umlaut or not).

## Decisions log
| # | Decision | Applied |
|---|---|---|
| M1 | **Präsens added** for all 7 verbs (können, müssen, dürfen, sollen, wollen, mögen, werden), 4 each: **ich, du, er/sie/es, ihr** — no wir / sie / Sie (= infinitive, which is shown on the card). Explanation names the trap: *ich / er kann* without *-t*, vowel change *darf / will / mag*, *du wirst / er wird*, *mag ≠ möchte* | ✅ |
| M2 | **Every person in every group**: ich, du, one of er/sie/es, wir, **ihr**, sie/Sie — done by rewriting existing sentences (mostly a second *ich* / *wir*), e.g. *Warum konntet ihr …*, *Könntet ihr bitte etwas leiser sein?*, *Musstet ihr lange …*, *Durftet ihr als Kinder …*, *Du dürftest recht haben*, *Ihr dürftet … müde sein*, *Mochtet ihr …*, *Was möchtet ihr trinken?*, *Wann wurdet ihr …*, *Würdet ihr uns … helfen?* ihr: 1 → 21 sentences | ✅ |
| M3 | werden Partizip II 8 → 4 (kept: Arzt, gute Freunde, dunkel, nervös) | ✅ |
| M4 | sollen Präteritum 8 → 6, Konjunktiv II 8 → 6; wollen Präteritum 8 → 6 — one sentence per person | ✅ |
| — | wollen · höflich stays 4, now with different persons: *Ich wollte dich etwas fragen* · *Wolltest du noch etwas sagen?* · *Wollten Sie noch etwas bestellen?* · *Wolltet ihr noch einen Kaffee?* (er/sie would be plain past, so not used) | ✅ |
| M5 | Konjunktiv II Vergangenheit + dürfen: *Das hätte ich nicht sagen dürfen.* · *Das hätte nicht passieren dürfen.* (explanation: не «gedurft») | ✅ |

**Result: 144 sentences.** können 23 · müssen 22 · dürfen 22 · sollen 19 · wollen 14 · mögen 20 · werden 24.
Files: `special_verbs.js?v=4`, hub link `modalverben/?v=6`, Home tile `verbformen/?v=2.3`. Copies before: `special_verbs_before-balance.js`, `index_before-balance.html` (index.html itself unchanged apart from the cache number). Browser-tested (Präsens *darfst* → Richtig + explanation, no errors). New progress items: 7 × „Präsens“, „dürfen · Konjunktiv II Vergangenheit“.
