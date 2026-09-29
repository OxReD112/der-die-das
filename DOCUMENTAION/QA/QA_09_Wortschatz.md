# QA 09 · Wortschatz

**Checked:** 2026-09-25 · **Level target:** A2 → B1
**Files:** `deutsch-home/wortschatz/words.js` (59 sentences — **the one the app loads**), `Word lists/words_FULL.js` (191), `Word lists/words_v01.js` (187)
**Status:** Merged list applied 2026-09-25 → `words.js` is now the single list (217 words). Copies before: `words_before-merge.js`, `index_before-merge.html`, `Home/index_before-qa-wortschatz.html`. `Word lists/words_FULL.js` and `words_v01.js` are kept unchanged as old sources (no longer needed). To test on phone.

**How it works:** German sentence with a gap (separable verbs = two gaps, e.g. *Ich ___ Samstag ___*) + Russian → learner types the word. Feedback shows base form, grammar line, translation. Sentences are also used for the push notifications.

## words.js vs. words_FULL.js
**FULL is not „words.js + more“.** Only the first 20 sentences are the same (ids 1–20; one differs only in its id). words.js 21–59 (39 sentences, mostly feelings / emotions: gemütlich, baff, Fernweh, Heimweh, Schadenfreude …) are **not** in FULL; FULL 21–191 (171 everyday B1 sentences: ungefähr, vereinbaren, das Gehalt, bequem …) are **not** in words.js. FULL is not loaded by the app. Mechanically FULL is consistent (gaps, revealed sentences, targets).

## words.js — ❌ Errors
Seven Russian translations belong to a **longer German sentence** than the one shown (the German was shortened, the Russian wasn't). Proposal: restore the German to match the Russian (richer B1 sentences):

| # | German now | Russian now | Proposed German |
|---|---|---|---|
| 36 | *Er war zornig auf mich.* | „Он был настолько разгневан, что едва мог говорить.“ | *Er war so **zornig**, dass er kaum sprechen konnte.* |
| 38 | *Vertrauen ist sehr wichtig.* | „Доверие — основа любых хороших отношений.“ | ***Vertrauen** ist die Basis jeder guten Beziehung.* |
| 39 | *Das ist lächerlich.* | „Его поведение было настолько нелепым, что все были вынуждены смеяться.“ | *Sein Verhalten war so **lächerlich**, dass alle lachen mussten.* |
| 40 | *Ich bewundere meine Mutter.* | „Я восхищаюсь людьми, которые никогда не сдаются.“ | *Ich **bewundere** Menschen, die nie aufgeben.* |
| 42 | *Das ist erstaunlich.* | „Удивительно, как быстро проходит время.“ | *Es ist **erstaunlich**, wie schnell die Zeit vergeht.* |
| 47 | *Manchmal habe ich Weltschmerz.* | „Многие люди испытывают мировую тоску, когда видят, что происходит в мире.“ | *Viele Menschen spüren **Weltschmerz**, wenn sie sehen, was in der Welt passiert.* + Russian term: „мировая **скорбь**“ |
| 49 | *Er hat Schadenfreude.* (also unidiomatic German) | „Он испытал немного злорадства, когда его конкурент проиграл.“ | *Er empfand ein bisschen **Schadenfreude**, als sein Konkurrent verlor.* |

| # | Problem | Proposed |
|---|---|---|
| 52 | Russian „Он был совершенно **отчаявшимся**“ — unnatural | „Он был в полном отчаянии, потому что не нашёл решения.“ |

## words.js — ⚠️ / 💬
| # | Current | Proposed |
|---|---|---|
| 23 | *Ich war baff, als ich die Nachricht gelesen **habe**.* (tense mix) | *… als ich die Nachricht **las**.* |
| 31 | *Ich habe nirgends meine Schlüssel gefunden.* | *Ich habe meine Schlüssel **nirgends** gefunden.* (natural word order) |
| 34 | grammar line „der Streit · die **Streite**“ | „die Streitigkeiten“ (Streite is rare) |
| 47 | translation „мировая тоска“ | „мировая скорбь, печаль из-за несовершенства мира“ |

## ✅ Verified correct
All other sentences, gaps, targets, base forms, grammar lines and translations (incl. separable verbs *schlage … vor*, *bereite … vor*).

## Merge plan (one list) — proposal 2026-09-25

**Your backup (24.09.):** 30 cards in progress = ids **1–30** (levels: 22 × level 2, 3 × level 1, 5 × level 0; none above 2). → ids 1–30 keep their id and their word (only the approved text fixes). The app introduces new words **in list order** and stores progress **by id**, so the order can change freely.

### FULL (ids 21–191) — errors found
| FULL # | Problem | Proposed |
|---|---|---|
| 66 | *eine Ausbildung **als** Köchin* | *eine Ausbildung **zur** Köchin* |
| 61 / 69 | *Rauchen nicht erlaubt* (verb *erlauben*) and *Fotografieren nicht erlaubt* (adj. *erlaubt*) — same thing twice, and 61 doesn't show the verb | 61 → *Meine Eltern **erlauben** mir das nicht.* „Родители мне этого не разрешают.“; remove 69 |
| 106 | *Ich ziehe die Tür zu.* — the verb is *zuziehen*, but the card says *ziehen* / one gap | remove (basic verb) |
| 63 | *Inzwischen wohne ich seit Jahren in München.* (inzwischen + seit Jahren clash) | *Inzwischen fühle ich mich in München zu Hause.* „Теперь я уже чувствую себя в Мюнхене как дома.“ |
| 175 | *Was ist der Zweck davon?* (unnatural) | *Welchen Zweck hat das?* „Какой в этом смысл?“ |
| 176 | *an dem Projekt* | *am Projekt* |
| 185 | „Что мы хотим поделать на выходных?“ | „Чем займёмся на выходных?“ |
| 102, 157 | plurals „die Teilnahmen“, „die Herkünfte“ (rare) | „meist ohne Plural“ |
| 95 | grammar line contains a note „очень полезно для экзамена“ | remove the note |

### Duplicates between the two lists → keep one, at FULL's (importance) position
| Word | Keep | Remove |
|---|---|---|
| sich beschweren über | words.js 46 (*… über den schlechten Service …*) | FULL 30 |
| enttäuscht | words.js 57 | FULL 59 (same sentence), FULL 119 *enttäuschen*, FULL 133 *enttäuschend* (same root ×3) |
| peinlich | words.js 58 | FULL 94 |
| ehrlich | words.js 59 | FULL 121 |

### Rare / less useful → remove
- words.js: **mutterseelenallein** (47→50), **Weltschmerz** (47), **romantisch** (41, too easy – same as Russian); **zornig** (36) → replace by the everyday **wütend** (*Er war so wütend, dass er kaum sprechen konnte.*)
- FULL: **schieben** (120), **herausnehmen** (190), **einschenken** (191)

### Order
1. ids 1–30 (in progress) unchanged at the top.
2. Then FULL in its importance order (new ids 60+).
3. The remaining 22 feelings words (31–56) spread evenly: **one every ~7–8 words**.

**Result: ≈ 216 words** (30 in progress + 186 new).

## Decisions log
| # | Decision | Applied |
|---|---|---|
| words.js fixes | 36 → *wütend* (replaces zornig), 38, 39, 40, 42, 49 German restored to match the Russian; 52 Russian; 23 *las*; 31 word order; 34 *Streitigkeiten* | ✅ |
| FULL fixes | 66 *zur Köchin*, 61 *Meine Eltern erlauben mir das nicht.*, 63, 175, 176, 185, 102, 157, 95 as proposed | ✅ |
| zuziehen | FULL 106 replaced by *Kannst du bitte die Vorhänge **zuziehen**?* — „Можешь, пожалуйста, задёрнуть шторы?“ (zuziehen · zog zu · hat zugezogen) | ✅ |
| Duplicates | words.js 46, 57, 58, 59 kept at FULL's positions; FULL 30, 59, 94, 121, 119, 133, 69 removed | ✅ |
| Removed (rare) | Weltschmerz, mutterseelenallein, romantisch · schieben, herausnehmen, einschenken | ✅ |
| Order | ids 1–30 (in progress) unchanged on top → FULL in importance order (new ids 60–224) → 22 feelings words spread every ~8–9 words (positions 36 … 214) | ✅ |

**Result: 217 words.** Checks: unique ids, every gap = target, blank/revealed rebuilt, no empty fields; only *Bescheid* appears twice (der Bescheid ≠ Bescheid geben, kept on purpose). Tested with the real backup state: all 30 active cards keep their levels; next new words = ungefähr, vereinbaren, das Gehalt, bequem, mindestens. Data `words.js?v=2`, Home tile `wortschatz/?v=2.3`.
