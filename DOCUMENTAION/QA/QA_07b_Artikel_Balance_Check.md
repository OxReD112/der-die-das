# QA 07b · Artikel — Balance check of the rule groups

**Date:** 2026-09-25 · **Exercise:** Artikel (der / die / das) · **File:** `deutsch-home/Artikel/words.js`
**Related:** `QA_07_Artikel.md` (content check and all other Artikel changes)
**Status:** ✅ Done and applied (together with the Artikel QA; copy before: `words_before-qa.js`)

## 1. Why
The Artikel QA added new rule groups (-in, Ge-, -nis, -er, exceptions) and removed or replaced words. Before applying, the question was: **is every ending group fairly represented, and is any group too big?**

## 2. How we evaluated
- **How a session picks words:** each session takes **individual nouns**, randomly, without repeats; nouns answered wrong get a higher weight and come back more often (`newDeck()` in `index.html`). Groups are not picked as groups.
- **Consequence:** a group's share of the deck = its share of practice. A group with 17 nouns comes up about 3× as often as a group with 6.
- **Method:**
  1. Counted the nouns per rule group (`ruleLabel`) in the current file.
  2. Applied all planned QA changes on top (removals, moves, new groups, new exceptions) and counted again.
  3. Calculated each group's share of the whole deck.
  4. Looked at size by type of group: suffix / prefix / category rules (practised as a rule) vs. „no reliable rule“, compound nouns and exceptions (tracked **word by word** in progress — `ruleType` `none` / `exception`).

## 3. What we discovered
**Before the QA:** 238 nouns in 42 groups. Largest: -ung 17 · no reliable rule 13 · -e 12 · -keit 10 · -ik 9 · -ur 9.

**After the planned changes (before balancing):** 259 nouns in 49 groups.

| Size | Groups | Share each |
|---|---|---|
| **Too big** | **-ung: 17** | **6.6 %** |
| Large but OK | no reliable rule 15 (tracked per word) · -e 11 | 5.8 % · 4.2 % |
| Normal | 28 rule groups with 4–10 nouns | 1.5 – 3.9 % |
| Small on purpose | days, months, seasons, directions, male person, cars, motorcycles, -lein | 0.8 – 1.6 % |
| Single cards | exceptions (Moment, Firma, Flur, Erlaubnis) and compound nouns (Haustür, Führerschein, Bahnhof, Krankenhaus) | 0.4 % |

**Findings**
1. **-ung was out of proportion:** the easiest, most reliable rule would have come up almost twice as often as most other rules.
2. **-e** was slightly above the others (11).
3. „No reliable rule“ (15) is large, but acceptable: each of these nouns is its own progress item and difficult ones come back more often anyway.
4. Single-card groups are fine: exceptions and compound nouns are tracked per word and weighted by difficulty.

## 4. What we changed
| Change | Detail |
|---|---|
| **-ung 17 → 10** | Removed: Bildung, Bewegung, Bedeutung, Verbindung, Entwicklung, Veranstaltung, Erklärung. Kept: Zeitung, Wohnung, Rechnung, Erfahrung, Einladung, Meinung, Entscheidung, Ausbildung, Übung, Bewerbung |
| **-e 11 → 10** | Removed: die Lampe (examples list: *die Lampe* → *die Blume*) |
| Rule | Target size for rule groups: **max. 10 nouns**; per-word groups (no reliable rule) may be larger |

## 5. Result (current file)
**251 nouns · 49 groups.** Largest: no reliable rule 15 (per word) · -ung 10 · -keit 10 · -e 10. All other groups 1–9.

| Group | Nouns | Share | Type |
|---|---|---|---|
| NO RELIABLE RULE | 15 | 6.0 % | per word |
| -UNG ENDING | 10 | 4.0 % | rule |
| -KEIT ENDING | 10 | 4.0 % | rule |
| -E PATTERN | 10 | 4.0 % | rule |
| -IK ENDING | 9 | 3.6 % | rule |
| -TION / -SION, -MA, -IE | 8 each | 3.2 % | rule |
| -SCHAFT, -EI, -CHEN, -UM, NOMINALIZED INFINITIVE, -ENZ / -ANZ, -UR | 7 each | 2.8 % | rule |
| -HEIT, -TÄT, -MENT, -LING, -ISMUS, -AGE, GE-, BEVERAGES → MOSTLY DER | 6 each | 2.4 % | rule |
| -E EXCEPTION | 6 | 2.4 % | per word |
| -IUM, -OR, -ETTE, -ADE, -IN (FEMALE PERSON), -ER (FROM A VERB) | 5 each | 2.0 % | rule |
| MALE PERSON, DIRECTIONS, -NIS | 4 each | 1.6 % | rule |
| DAYS OF THE WEEK, MONTHS, SEASONS | 3 each | 1.2 % | rule |
| BEVERAGE EXCEPTION (Bier, Wasser, Milch) | 3 | 1.2 % | per word |
| CAR NAMES, MOTORCYCLE NAMES, -LEIN | 2 each | 0.8 % | rule |
| REMEMBER: DAS ZIMMER | 2 | 0.8 % | per word |
| REMEMBER: DIE TÜR / DER SCHEIN / DER HOF / DAS HAUS | 1 each | 0.4 % | per word |
| -MENT / -MA / -UR / -NIS EXCEPTION | 1 each | 0.4 % | per word |

## 6. For future changes
- When adding nouns, keep rule groups at **≤ 10**; if a group grows beyond that, remove the least useful words rather than letting it dominate sessions.
- Very reliable, easy rules (-ung, -heit, -keit, -chen) need fewer cards than rules with exceptions.
- Exceptions and compound nouns can stay as single cards — they are tracked per word and come back when answered wrong.
