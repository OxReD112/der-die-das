# QA 06 · Pronomen

**Checked:** 2026-09-25 · **Level target:** A2 → B1
**Files:** `deutsch-home/pronomen/pronouns.js` (108 sentences: 36 personal Akk/Dat, 72 possessive Nom/Akk/Dat/Gen), `index.html`
**Status:** Fixes applied 2026-09-25 (copies before: `pronouns_before-qa.js`, `index_before-qa.html`, `Home/index_before-qa-pronomen.html`). To test on phone.

**How it works:** context sentence + sentence with a gap + Russian → learner types the pronoun. Check ignores capital letters and punctuation (so *sie* = *Sie* is accepted). Reference table (personal pronouns + possessive endings) is correct, incl. *euer → eure / eurem / euren*.

## Summary
- **All 108 answers are correct forms.**
- 1 German context sentence is wrong (*Lisa ist kalt*), 1 is broken (*Herr Klein, ich kenne schon*), and 3 formal-*Sie* sentences talk *about* the person instead of *to* them, so the natural answer would be *sie / ihr / ihm*.

## ❌ Errors
| # | Sentence | Problem | Proposed |
|---|---|---|---|
| E1 | 16 · *Lisa ist kalt. Ich bringe ___ eine Jacke.* | *Lisa ist kalt* = Lisa is a cold person / cold to the touch. "Lisa feels cold" = *Lisa ist kalt* ✗ → *Lisa friert* / *Lisa ist es kalt* (classic trap, like *Mir ist kalt*) | Context: *Lisa friert.* |
| E2 | 33 · *Frau Berger wartet im Büro. Ich besuche ___ um zehn.* → Sie | Context speaks **about** Frau Berger (3rd person) → natural answer *sie* (her), not *Sie* (you). Accepted only by accident (capitals ignored). | Context: *Frau Berger, Sie sind heute im Büro?* Sentence: *Dann besuche ich ___ um zehn.* — „Тогда я зайду к Вам в десять.“ |
| E3 | 35 · *Frau Berger hat eine Frage. Ich antworte ___ gleich.* → Ihnen | Same: natural answer would be *ihr* → marked wrong | Context: *Frau Berger, Sie haben eine Frage?* |
| E4 | 36 · *Herr Klein braucht die Unterlagen. Ich schicke ___ die Datei.* → Ihnen | Same: natural answer *ihm* → marked wrong | Context: *Herr Klein, Sie brauchen die Unterlagen?* |
| E5 | 34 · *Herr Klein, ich kenne schon.* | Broken German (no object) | *Herr Klein, wir kennen uns schon.* — RU „Рад(а) снова Вас видеть.“ |

## 💬 Style
| # | Sentence | Current | Proposed |
|---|---|---|---|
| S1 | 8 · *Du kennst den Weg nicht. Ich zeige dir die Adresse.* | doesn't match | *Ich zeige dir den Weg.* — „Я покажу тебе дорогу.“ |
| S2 | 25 · *Ich sehe euch vom Fenster.* | | *vom Fenster aus* |
| S3 | Russian 41–46, 81 | „Я ищу **мою** сумку“, „с **моим** начальником“ … | Russian norm when the owner is the subject: „свою сумку“, „со своим начальником“ (the rest of the file already uses „свой“) |
| S4 | 88 · answer *Eure* | only sentence-initial answer with a capital | *eure* (like *mein*, *dein* …) |

## Idea (optional)
Reflexive pronouns with Akk / Dat — a B1 classic: *Ich wasche **mich*** vs *Ich wasche **mir** die Hände*; *Ich ziehe **mich** an* vs *Ich ziehe **mir** eine Jacke an*. Could be a new group (~12 sentences).

## ✅ Verified correct
All other context sentences, sentences, answers and Russian translations.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1 | *Lisa friert.* | ✅ |
| E2–E4 | contexts address the person directly: *Frau Berger, Sie sind heute im Büro? — Dann besuche ich ___ um zehn.* · *Frau Berger, Sie haben eine Frage?* · *Herr Klein, Sie brauchen die Unterlagen?* | ✅ |
| E5 | *Herr Klein, wir kennen uns schon.* — „Рад(а) снова Вас видеть.“ | ✅ |
| S1, S2, S4 | *den Weg* · *vom Fenster aus* · *eure* | ✅ |
| S3 | Russian „мой“ kept (normal in spoken Russian) | — |
| Idea | **Reflexive group added (12)**, type „personal“ so it is mixed into every session: Akk *mich / dich* (waschen, sich anziehen, sich vorstellen, sich umziehen, sich freuen) vs Dat *mir / dir* (Hände waschen, Jacke anziehen, sich merken, Zähne putzen, sich wünschen, sich etwas vorstellen). 4 new progress categories. | ✅ |

Result: **120 sentences** (48 personal incl. 12 reflexive, 72 possessive). Data `pronouns.js?v=2`, Home tile `pronomen/?v=10`. Browser-tested.
