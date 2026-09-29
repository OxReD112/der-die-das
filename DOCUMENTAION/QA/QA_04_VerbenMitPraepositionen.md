# QA 04 · Verben mit Präpositionen

**Checked:** 2026-09-25 · **Level target:** A2 → B1 (spoken German, some "educated" B1–B2)
**Files:** `deutsch-home/praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.js` (45 cards), `index.html` — *since Verben mit Präpositionen v3.13 (2026-09-27): `verbs.js` (65 cards, content as after QA 04c), `verben_mit_praepositionen.js` (script), `verben_mit_praepositionen.css`*
**Source:** teacher's list „Verben mit Präpositionen“ (Sascha & Deutsch, 2 pages, red marks = learner's selection)
**Status:** Fixes applied 2026-09-25 (copies before: `verben_mit_praepositionen_before-qa.js`, `index_before-qa.html`, `praepositionen/index_before-qa-vmp.html`). To test on phone.

**How it works:** verb + Russian meaning → learner types the preposition (only one accepted; ae/oe/ue accepted for umlauts) → picks the case (Akk / Dat; skipped for *arbeiten als* + Nom).

## Summary
- All 45 prepositions and cases are correct.
- 1 wrong example, 2 places where the learner cannot know which preposition is wanted, a few loose Russian translations.

## ❌ Errors
| # | Card | Problem | Proposed |
|---|---|---|---|
| E1 | denken **über** | Example *Ich denke über das Problem **nach*** uses *nachdenken* (that's the next card) | Remove the card (*nachdenken über* covers über; see E3) — or example *Was denkst du über meinen Plan?* |
| E2 | sprechen **über** / sprechen **von** | Meanings „говорить о, разговаривать о“ vs „говорить о, упоминать“; in real German both fit almost always (*Er spricht von / über seine Reise*), but only one is accepted | Remove *sprechen von* (*erzählen von* keeps von) |
| E3 | denken **an** / denken **über** | Both meanings start with „думать о“ | Solved by E1 (remove). If kept: an = „думать о ком-то / вспоминать“, über = „какое мнение о …“ |

## 💬 Russian / German details
| # | Card | Current | Proposed |
|---|---|---|---|
| S1 | teilnehmen an | *an dem Kurs* | *am Kurs* |
| S2 | sich informieren bei | „Я узнаю информацию в ведомстве.“ | „Я навожу справки в ведомстве.“ |
| S3 | diskutieren mit | „Я обсуждаю **это** с моим коллегой.“ | „Я спорю с коллегой.“ |
| S4 | sich bedanken für | „Я благодарю **тебя** за помощь.“ (no *dich* in German) | „Я благодарю за твою помощь.“ |
| S5 | bitten um | „Я прошу тебя о помощи.“ | „Я прошу о твоей помощи.“ |
| S6 | warnen vor | „Я предупреждаю тебя об этом мужчине.“ | „Я предостерегаю тебя от этого мужчины.“ |

## Coverage proposal
**Remove (3):** denken über (E1), sprechen von (E2), danken für (same answer as *sich bedanken für*).

**Add — recommended (24)**, most from the teacher's list, a few everyday ones not on it (★):
| Preposition | Verbs |
|---|---|
| an + Akk | sich gewöhnen an, schreiben an |
| auf + Akk | aufpassen auf, sich konzentrieren auf, sich verlassen auf |
| auf + Dat | bestehen auf (exception: auf + **Dat**) |
| bei + Dat | sich entschuldigen bei (pair to *für*) |
| mit + Dat | aufhören mit, sich beschäftigen mit, vergleichen mit |
| von + Dat | abhängen von, halten von (*Was hältst du von …?*), sich erholen von, sich verabschieden von |
| über + Akk | sich ärgern über, sich beschweren über |
| um + Akk | sich bewerben um, sich Sorgen machen um ★ |
| zu + Dat | passen zu |
| für + Akk | sorgen für, halten für (*Ich halte ihn für klug*) |
| unter + Dat | leiden unter |
| nach + Dat | schmecken nach |
| vor + Dat | Angst haben vor ★ |

**Optional:** sich streiten mit, sich verabreden mit, achten auf, zweifeln an, sich aufregen über, lachen über ★, übersetzen in, riechen nach, sich einsetzen für.

**Not recommended:** rare / formal / literal verbs from the list (grenzen an, verteilen an, erkranken an, es mangelt an, scheitern an, schießen auf, schimpfen auf, verzichten auf, fliehen / flüchten vor, stammen aus, entstehen aus, geraten in, s. einmischen in, s. verwandeln in, befreien von, s. ernähren von, fordern / verlangen von, siegen über, verfügen über, auffordern zu, ernennen zu, erziehen zu, verurteilen zu, zwingen zu, trauern um, wetten um, jn beneiden um, s. bemühen um, stimmen für / gegen, verstoßen gegen, s. wehren gegen, gelten als, dienen als, bezeichnen als …).

Result with recommended: 45 − 3 + 24 = **66 cards**.

## ✅ Verified correct
All other prepositions, cases, meanings and examples.

## Decisions log
| # | Decision | Applied |
|---|---|---|
| E1/E3 | **All three denken cards kept**, with clear meanings: *denken an* „думать о ком-то / вспоминать“ · *denken über* „думать о (какое мнение)“, new example *Was denkst du über meinen Plan?* · *nachdenken über* „размышлять, обдумывать“ | ✅ |
| E2 | sprechen von removed | ✅ |
| danken | **danken für** kept: „благодарить за (человек — Dativ без предлога)“, *Ich danke dir für deine Hilfe.* · **sich bedanken bei** kept, example shows für: *Ich bedanke mich bei dir für die Einladung.* · *sich bedanken für* removed | ✅ |
| S1, S5, S6 | teilnehmen *am Kurs*, bitten um / warnen vor Russian fixed (S2–S4 obsolete: cards removed) | ✅ |
| extra | sich kümmern um: „заботиться о, позаботиться о“ (was „заниматься“, now used by *sich beschäftigen mit*) | ✅ |
| Removed | sich bedanken für, beginnen mit, sprechen von, sich entscheiden gegen, kämpfen gegen, diskutieren mit, sich informieren bei (**reagieren auf kept**) | ✅ |
| Added (23) | sich gewöhnen an, schreiben an, aufpassen auf, sich konzentrieren auf, sich verlassen auf, bestehen auf (+Dat), sich entschuldigen bei, aufhören mit, sich beschäftigen mit, abhängen von, halten von, sich erholen von, sich verabschieden von, sich ärgern über, sich beschweren über, sich bewerben um, sich Sorgen machen um, passen zu, sorgen für, halten für, leiden unter, schmecken nach, Angst haben vor (ids vmp_046–068) | ✅ |
| Not added | vergleichen mit; all optional verbs | — |

Result: **61 cards**. Checked: unique ids, no verb + preposition twice, every verb that appears with two prepositions has clearly different meanings (denken, arbeiten, sich freuen, sprechen, sich entschuldigen, bestehen, halten). Data `?v=2`, page v3.2, hub link `verben_mit_praepositionen/index.html?v=4`. Browser-tested (bestehen auf + Dat, danken für with „fuer“, denken über with wrong „an“, Angst haben vor).
