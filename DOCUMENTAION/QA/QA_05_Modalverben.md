# QA 05 · Modalverben (+ werden)

**Checked:** 2026-09-25 · **Level target:** A2 → B1
**Files:** `deutsch-home/verbformen/modalverben/special_verbs.js` (120 sentences), `index.html` (answer logic + forms table)
**Status:** Fixes applied 2026-09-25 (copies before: `special_verbs_before-qa.js`, `index_before-qa.html`, `verbformen/index_before-qa-modal.html`). To test on phone.

**How it works:** infinitive + German sentence with a gap + Russian translation → learner types the form. The form (Präteritum / Konjunktiv II / Partizip II) is shown only **after** answering, so the Russian translation must make the wanted form clear. Sentences without "___" are fine (the page blanks the answer word itself).

**Set:** können, müssen, dürfen, sollen, wollen, mögen, werden × Präteritum + Konjunktiv II (8 each), werden × Partizip II (8).

## Summary
- **All 120 answers are correct forms; the forms table (Präsens / Präteritum / Konj. II for all 7 verbs + *geworden*) is fully correct.**
- Problems: *wollen* „Konjunktiv II“ items are really Präteritum; *dürfen* Konj. II items can equally be answered with *darf*; 3 Russian translations wrong or pointing to the wrong form.

## ❌ Errors
| # | Items | Problem | Proposed |
|---|---|---|---|
| E1 | wollen · „Konjunktiv II“ (8) | The form is identical to Präteritum, and the sentences *are* Präteritum: *Wir wollten eigentlich morgen fahren*, *Sie wollte mit Ihnen sprechen*, *Er wollte nur helfen*, *Wir wollten Sie darüber informieren* = past intention; *Ich wollte dich etwas fragen* = polite Präteritum. Real Konj. II of *wollen* is rare. | Remove the 4 plain-past ones (duplicates of the Präteritum group); move the 4 polite ones (*Ich wollte dich etwas fragen / nur kurz Bescheid sagen / mich noch einmal bedanken / kurz nachfragen*) to Präteritum with explanation „вежливое вступление: Ich wollte fragen …“ |
| E2 | dürfen · Konj. II (8 × *Dürfte ich …?*) | Russian „Можно мне … / Могу я …“ fits *Darf ich …?* just as well → *darf* is marked wrong. Also *Dürfte ich* is very formal; the everyday *dürfte* means **probability** (*Das dürfte kein Problem sein*), which is missing. | Keep 4 polite ones with Russian that shows „бы“: „Не позволили бы Вы мне …?“ (fragen, hereinkommen, Vorschlag, hier warten). Replace 4 with probability: *Das ___ kein Problem sein.* „Скорее всего, это не проблема.“ · *Er ___ schon zu Hause sein.* „Он, наверное, уже дома.“ · *Das ___ ziemlich teuer werden.* „Это, скорее всего, будет довольно дорого.“ · *Es ___ bald regnen.* „Скорее всего, скоро пойдёт дождь.“ (explanation: „вероятность, предположение“) |
| E3 | sollen · *Was ___ ich jetzt tun?* | „Что мне теперь делать?“ = *soll* (present) | „Что мне следовало бы теперь сделать?“ |
| E4 | sollen · *Sie ___ sich etwas mehr Zeit nehmen.* | „уделить себе немного больше времени“ — wrong meaning | „Ей стоило бы не торопиться.“ |
| E5 | wollen · *Ich ___ nur kurz Bescheid sagen.* | „Я хотела только ненадолго сообщить“ — wrong | „Я просто хотела быстро сообщить.“ |

## 💬 Style
| # | Item | Current | Proposed |
|---|---|---|---|
| S1 | werden · *Wann ___ du so müde?* | unnatural German | *Wann ___ du krank?* — „Когда ты заболел(а)?“ |
| S2 | sollen · *Ihr ___ früher Bescheid sagen.* | „Вам стоило бы предупредить раньше“ (sounds like a past reproach = *hättet … sollen*) | „Вам стоило бы предупреждать раньше.“ |
| S3 | du-questions in Russian | mixed: „мог“, „одному“, „должен был“, „хотел“ vs. „(а)“ elsewhere | unify: „смог(ла) хорошо выспаться“, „путешествовать в одиночку“, „должен(на) был(а)“, „хотел(а)“ |

## Idea (optional, B1+ "educated")
The modal Perfekt uses the **infinitive**, not *gemusst / gesollt* — a classic B1 trap:
*Ich habe gestern arbeiten ___.* → **müssen** · *Du hättest mich anrufen ___.* → **sollen** · *Wir hätten früher kommen ___.* → **können**.
Could be a new form „Perfekt / hätte + Infinitiv“ (8 sentences).

## Result
120 − 4 (wollen) = **116 sentences** (dürfen: 4 replaced, not removed).

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1 | wollen: 4 plain-past sentences removed; 4 polite ones (*Ich wollte dich etwas fragen …*) → form **„Präteritum · höflich“**. Note: "I would like to ask" = *möchte / würde gern* (already in mögen / werden Konj. II); real Konj. II of *wollen* (*Ich wollte, ich hätte …*) is rare | ✅ |
| E2 | dürfen Konj. II: kept 4 polite with „Не позволили бы Вы …?“; replaced 4 with probability *dürfte* (kein Problem, schon zu Hause, ziemlich teuer, bald regnen) | ✅ |
| E3–E5, S1, S2 | as proposed | ✅ |
| S3 | Russian gender forms kept (no sentence mixes forms) | — |
| Idea | Perfekt of modals **not** added (Präteritum is the normal past). **Added „Konjunktiv II Vergangenheit“ (8):** *hätte … sollen* ×3, *können* ×3, *müssen* ×2 — answer = infinitive, explanation warns „не gesollt / gekonnt / gemusst“ | ✅ |

Result: **124 sentences**. Data `special_verbs.js?v=2`, hub link `modalverben/?v=4`. Browser-tested (hätte … sollen ✓, dürfte ✓, wollte höflich ✓, „gekonnt“ → Not quite with the infinitive note).
