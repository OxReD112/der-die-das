# QA 06b · Pronomen — Balance check

**Date:** 2026-09-25 · **Exercise:** Pronomen · **File:** `deutsch-home/pronomen/pronouns.js` (120 sentences)
**Related:** `QA_06_Pronomen.md` (content check)
**Status:** ✅ Applied 2026-09-25 (see Decisions log). To test on phone.

## 1. Why
Are all forms fairly represented? Are easy things over-represented and the typical mistakes under-represented?
"Hard" here means **a mistake learners really make**, not "a short or frequent word". Akkusativ vs Dativ (mich / mir, dich / dir, ihn / ihm) is one of the most common mistakes, so it counts as hard.

## 2. How we evaluated
- **How a session picks sentences** (`weightedDeck()` in `index.html`): **half personal, half possessive** in every session; inside each half, single sentences are picked randomly, sentences answered wrong come back more often.
- **Consequence:** personal 48 sentences share 50 % → each personal sentence comes up **1.5×** as often as a possessive one (72 sentences). In a 10-card session: 5 personal, 5 possessive.
- **Method:** counted by type · case · person · gender; for personal sentences also checked **what decides the case** — and whether Russian (the translation language) uses the **same** case. If Russian uses the same case, the learner's intuition already gives the right answer; if it differs, that's the real trap.

## 3. What we discovered

### Personal (36) + Reflexive (12)
| Group | Count | Assessment |
|---|---|---|
| 18 forms (9 persons × Akk / Dat) | 2 each | ✅ evenly spread |
| Reflexive ich / du × Akk / Dat | 3 each | ✅ right choice — only ich / du have different Akk / Dat forms (*uns, euch, sich* are the same) |
| wir / ihr (*uns, euch*) | 8 | ⚠️ answer is the same in Akk and Dat → no case decision; fine, but don't add more |

**Main finding — the case is almost never a trap:**
- The 18 Dativ sentences are **helfen ×4, antworten ×1** and **13 × "give / bring / show / explain something to someone"**. Russian also uses dative in all of them (*помочь мне, дать тебе, показать вам*).
- The 18 Akkusativ sentences: *sehen, abholen, treffen, kennen, besuchen…* — Russian also accusative.
- **Only 1 of 36** sentences is a Russian ↔ German mismatch: *Ich rufe **dich** an* (RU *звоню **тебе***).
- So the exercise trains the **forms** well, but hardly the **mich / mir decision** where it goes wrong in real life.
- Pronouns after prepositions (*mit mir, für dich, ohne mich, zu ihm*) — **0**. They're not drilled anywhere else in the app either (Kasus trains preposition → case, without pronouns).

### Possessive (72)
| Case | Mask. | Fem. | Neutr. | Plural | Total | Share of possessive |
|---|---|---|---|---|---|---|
| Nominativ | **8** | **7** | 3 | 2 | 20 | 28 % |
| Akkusativ | 7 | 4 | 4 | **1** | 16 | 22 % |
| Dativ | 5 | 8 | 4 | 8 | 25 | 35 % |
| Genitiv | 4 | 4 | 3 | – | 11 | 15 % |

| Owner | ich | du | er | sie | wir | ihr | sie (pl.) | Sie |
|---|---|---|---|---|---|---|---|---|
| Sentences | **12** | 8 | 11 | 11 | 8 | 8 | 7 | 7 |

**Findings**
1. **Nominativ Mask. + Fem. (15)** is the easiest (*mein / meine*) and the biggest block.
2. **Akkusativ Plural: 1 sentence**, Nominativ Plural: 2. With one sentence the progress item is learned by memorising that one sentence.
3. **Genitiv 11 (15 %)** — a lot for A2 → B1 speech (people say *das Auto **von meinem** Bruder*). Fine to keep some for the "educated" level.
4. **Owner *ich* (12)** is the easiest owner (*ich → mein*) and the largest. The hard ones — *sie → ihr* vs *er → sein*, *sie (pl.) / Sie → ihr / Ihr*, *euer → eure* — are 7–11.
5. ✅ Dativ (25) and Akkusativ Mask. *-en* (7) — well represented; these are the typical mistakes.
6. ✅ Akkusativ Neutrum without ending (*dein Handy*, not *deinen*) — 4, a good trap.

## 4. Proposed changes
| # | Change | Detail | Count |
|---|---|---|---|
| P1 | **Add "Russian trap" verbs** (personal) | **Akk in German, dative in Russian:** *Ruf **mich** später an!* · *Störe ich **dich**?* · *Darf ich **Sie** kurz stören?* · *Ich beneide **dich**!* · *Lüg **mich** nicht an!* — **Dat in German, accusative in Russian:** *Ich gratuliere **dir**!* · *Ich danke **Ihnen**!* · *Hör **mir** zu!* · *Folgen Sie **mir**!* · *Ich bin **ihr** gestern begegnet.* | +10 |
| P2 | *(optional)* **Pronouns after prepositions** | *mit **mir**, für **dich**, ohne **mich**, zu **ihm**, bei **uns**, von **ihr**, gegen **ihn**, mit **Ihnen*** — RU often differs (*для **меня*** = genitive) | +8 |
| P3 | **Nominativ Mask. / Fem. 15 → 9** | remove 6, mainly from *ich* (4 Nom) and *er / sie* | −6 |
| P4 | **Genitiv 11 → 8** | *ich, er, sie* have 2 each → 1 each | −3 |
| P5 | **Akkusativ Plural 1 → 4**, Nominativ Plural 2 → 3 | e.g. *Ich besuche **meine** Eltern* · *Hast du **deine** Schlüssel?* · *Wir verkaufen **unsere** Möbel* · *Ihre Kinder sind…* | +4 |

**Open questions**
- P1 sentences: tag them with the existing categories (e.g. *Dativ · du → dir*) or give them their own progress group „Falle: anders als im Russischen“?
- P2: yes / no?

**Result:** personal 48 → 58 (66 with P2), possessive 72 → 67. The 50/50 split stays; personal and possessive sentences then come up about equally often.

## 5. For future changes
- For personal pronouns, count not only forms but **what decides the case**: prefer verbs where Russian uses a different case.
- Keep every ending category (case × gender) at **≥ 3 sentences**, so it isn't learned by memorising one sentence.
- Easy blocks (Nominativ, owner *ich*) ≤ the hard ones.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| P1 | **Replaced, not added:** in 10 forms one of the two sentences (repeated verbs *helfen, sehen, abholen, bringen, geben, besuchen, antworten, rufen*) swapped for a Russian-trap verb — Akk: *Ruf **mich** später an!* · *Ich beneide **ihn**!* · *Ruf **sie** doch an!* · *Bitte stör **sie** nicht!* (Kinder) · *Darf ich **Sie** kurz stören?* — Dat: *Hör **mir** bitte zu!* · *Ich gratuliere **dir**!* · *Ich bin **ihm** an der Kasse begegnet.* · *Wir folgen **ihnen** einfach.* · *Ich danke **Ihnen** sehr!* Counted in the existing progress categories (no new group). | ✅ |
| P2 | Pronouns after prepositions — not the point of this exercise | — |
| P3 | Nominativ Mask. + Fem. 15 → 9: removed *Mein Bruder wohnt …, Meine Schwester studiert …, Sein Sohn …, Seine Schwester wohnt …, Das ist ihre Schwester, Unser Lehrer …* | ✅ |
| P4 | Genitiv 11 → 8: removed *… meiner Schwester* (ich), *… seines Sohnes* (er), *… ihres Sohnes* (sie) | ✅ |
| P5 | + Akk. Plural: *Hast du **deine** Schlüssel dabei?* · *Wir verkaufen **unsere** Möbel.* · *Bitte nehmen Sie **Ihre** Unterlagen mit.* — + Nom. Plural: ***Eure** Kinder sind sehr nett.* | ✅ |

**Result: 115 sentences** — personal 48 (36 + 12 reflexive, 10 of them trap verbs now), possessive 67.
Possessive by case: Nom 15 · Akk 19 · Dat 25 · Gen 8. Owners: ich 9 · du 9 · er 8 · sie 9 · wir 8 · ihr 9 · sie (pl.) 7 · Sie 8. Every ending category ≥ 2 (Akk. Plural 4).
Files: `pronouns.js?v=4`, `index.html` v7.23, Home tile `pronomen/?v=12`. Copies before: `pronouns_before-balance.js`, `index_before-balance.html`. Browser-tested (session mix 10/10 in a 20 session, no errors).
