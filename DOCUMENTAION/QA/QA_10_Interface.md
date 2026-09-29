# QA 10 · Interface texts

**Checked:** 2026-09-25 · **Status:** Applied 2026-09-25 (copies before: `index_before-ui.html` in each changed folder).

## Current state
| Where | Language now |
|---|---|
| Home (greeting, tiles, Heute, Punkte, Tagesziel), progress screen, Präpositionen / Verbformen menus | **German** |
| Home settings (Settings, Backup, Restore, Light Theme, Daily limit, Notifications, OFF, Are you sure? …), „Phrase of the Week“ | English |
| Ortspräpositionen, Fester Kasus | German start („Wie viele Übungen möchtest du machen?“, Richtig / Nicht ganz) + English buttons / end (Continue, Another session, Back to Home, „Places you miss come back …“) |
| Artikel, Pronomen, Wortschatz, Verben mit Präp., Partizip II, Modalverben | English (How many …?, Check, Continue, Correct / Not quite, Done …) |
| Explanations after an answer | Artikel: **English** rule texts · Kasus, Verben mit Präp., Modalverben, Ortspräp. notes: **Russian** |

## Proposal: interface in simple German (everything the learner reads = practice)
One word for one thing everywhere:

| Now (all variants) | German |
|---|---|
| How many words? / How many exercises? / How many verbs? / How many sentences? / Wie viele Übungen möchtest du machen? | **Wie viele Wörter? / Übungen? / Verben? / Sätze?** (same short pattern everywhere) |
| Check | **Prüfen** |
| Continue | **Weiter** |
| Finish | **Fertig** |
| Correct / ✓ Correct! / Richtig | **Richtig** |
| Not quite / ✕ Not quite. / Nicht ganz | **Nicht ganz** |
| Done. / Session complete / Done for now. | **Fertig.** |
| Another session / Choose another session / Start Again | **Noch eine Runde** |
| Back to Home / Back to home | **Zur Startseite** |
| Close | **Schließen** |
| … · Table / Pattern table / Forms table | **… · Tabelle** (Pronomen · Tabelle, Vokalwechsel · Tabelle, Formen · Tabelle) |
| Partizip II · Pattern families / „possible vowel changes in this set“ | **Partizip II · Vokalwechsel** / „Vokalwechsel in dieser Übung“ |
| Type the missing form | **Fehlende Form eingeben** |
| Type the preposition, then choose the case. | **Schreib die Präposition, dann wähle den Kasus.** |
| Personal and possessive pronouns are mixed together. | **Personal- und Possessivpronomen gemischt.** |
| Choose a small session. The game will stop … / Choose the correct article | **Wähle eine Runde.** / **Wähle den richtigen Artikel.** |
| The word / Heads up: / You chose X. Correct answer: Y. | **Das Wort** / **Achtung:** / **Deine Wahl: X. Richtig: Y.** |
| Needs more practice / fully correct | **Noch üben** / **komplett richtig** |
| Difficult … will have a better chance of returning … / Places you miss come back … / Tricky verbs will come up more often … / Your difficult words are saved … | **Was schwierig war, kommt öfter wieder.** (one sentence for all) |
| Nice work. You finished your session. / Session complete. You can come back later without turning it into a marathon. | **Gut gemacht – Runde geschafft!** |
| Wortschatz: Done for today. Come back tomorrow. / + Add 5 new words / All words are already in your deck. / Nothing due right now. / Hear sentence | **Fertig für heute. Komm morgen wieder.** / **+ 5 neue Wörter** / **Alle Wörter sind schon dabei.** / **Gerade ist nichts fällig.** / **Satz anhören** |
| Home: Phrase of the Week | **Redewendung der Woche** |
| Settings / Backup / Restore / Light Theme / Daily limit / Notifications / OFF / optional | **Einstellungen / Sichern / Wiederherstellen / Helles Design / Tageslimit / Mitteilungen / AUS / optional** |
| Are you sure? / You can keep practicing today without a daily limit. It will turn on again automatically tomorrow. / No / Yes | **Bist du sicher? / Heute kannst du ohne Tageslimit weiterüben. Morgen ist es automatisch wieder an. / Nein / Ja** |
| Notification setup failed. | **Mitteilungen konnten nicht eingerichtet werden.** |

(Version tags such as „v43“ stay as they are.)

## Open questions
1. German interface (as above) — or English everywhere?
2. Artikel explanations after an answer are English (49 rule labels + explanations + notes, e.g. „-UNG ENDING · Nouns ending in -ung are feminine.“). The other exercises explain in Russian. Leave English / translate to Russian / to simple German?

## Decisions log
| # | Decision | Applied |
|---|---|---|
| 1 | Interface → simple German as in the table above, **except Settings**: the whole settings panel stays English (Settings, Backup, Restore, Name, Light Theme, Daily limit, Notifications, OFF, „Are you sure?“ dialog, „Notification setup failed.“) | ✅ 94 replacements in 9 pages |
| 2 | Artikel explanations stay English (incl. „WHY DER?“ and „Heads up:“, which belong to the English rule block) | — |
| extra | Pronomen table: Kasus, Possessiv*, Possessiv-Endungen, „euer- (→ eur- vor Endungen)“, German footnote · Modalverben table: Zurücksetzen, German aria labels · Wortschatz: „x / x geschafft“, „Satz anhören“ | ✅ |

Version bumps: Home tiles artikel 2.5 · pronomen 11 · wortschatz 2.4 · verbformen 2.2 · praepositionen 4; Präpositionen menu: ortspräp 11 · kasus 12 · verben mit präp. 5; Verbformen menu: partizipII 5 · modalverben 5. All page scripts syntax-checked; Artikel, Partizip II, Verben mit Präp. browser-checked on a small phone screen.
