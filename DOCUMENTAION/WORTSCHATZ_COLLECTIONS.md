# Wortschatz · Own word collections (plan, Version 1)

**Language (decided 2026-09-26):** all collection screens are in **English** (see DECISIONS.md → *collection screens in English*); German labels quoted below are the original plan.

**Status:** Version 1 fully built (2026-09-26, Wortschatz v2.105, Home 5.67). Current behaviour: `DECISIONS.md` („Wortschatz · …“). Next: statistics → `WORTSCHATZ_STATS_HANDOFF.md`.
**Scope:** `wortschatz/index.html`, `Home/index.html` (backup list only), maybe `words.js` (no changes to existing ids)
**Separate topic, decided later:** the Fortschritt / stats screen for Wortschatz (see *Open* at the end)

---

## 1. The idea in one paragraph

Every user practises **one** word collection. New users start on the built-in set („Standard“, `words.js`). A user can replace it with **their own collection** (pasted AI output, a file, or cards typed in the app). There is no switching between several collections. The own collection is never replaced when it runs out — it **grows**: the user adds more words to the same deck, and learned words keep coming back for review. The user can edit cards, rename the collection, export it, or delete it and go back to the demo.

---

## 2. Start screen (new)

Wortschatz gets a start screen like the other modules, so opening it from Home feels the same everywhere. No collection controls ever appear inside the exercise.

```
            Wortschatz.
         Heute: 12 Karten

            [ Starten ]

          B1 Arbeit · 120          ← secondary pill (collection button, comes with step 3)

        ── Worum geht's? ──
```

- **No 10 / 20 / 30.** The review schedule decides what is due, so the screen shows the number of due cards (total only — new words only enter via „+ 5 neue Wörter“, so a „neu“ count would almost always be 0).
- **Starten** → starts today's session exactly as today (same function that currently runs on load).
- **Nothing due:** no start screen — Wortschatz opens on „Fertig für heute“ exactly as before (decided 2026-09-26).
- **Few words left:** a grey line „Noch 8 neue Wörter übrig“ (shown from ~10 left). At 0, „+ 5 neue Wörter“ becomes **+ Wörter hinzufügen** (opens the add screen).
- **Collection button** shows the collection name + card count, e.g. „Standard · 191“ / „B1 Arbeit · 120“. Opens the collection window (section 4).
- **Opening Wortschatz after today's session is done:** shows „Fertig für heute“ as today (unchanged). The done screen also gets the collection button (under „+ 5 neue Wörter“), so the collection can be edited after the day's session.
- „Worum geht's?“ description like the other start screens (text drafted separately, EN/RU by the user's language).

### Design (see DECISIONS.md → Design consistency)
- Title: Wortschatz's own Georgia heading.
- **Starten** = main button (`#ECE6DC` + `#1B1B1D` / `#242426` + `#F6F4F1`, 56px, 17px corners, 16px bold, max 360px).
- Collection button = the start-screen **table pill** (14px, 40px high, 10% outline, secondary text), 28px below the main button.
- „Worum geht's?“ block: as specified under *Start screens → Description*.
- Version mark: now also visible on the start screen (rule: start + summary screens only).
- Shared press effect, no hover.

### Technical
- New `<section id="start">` above `#study`; `#study` and `#done` hidden at first. No change to the SRS logic.
- **Keyboard focus:** the answer field must get focus when Starten is pressed, not on page load (otherwise the keyboard appears on the start screen).
- Home keeps opening `wortschatz/` — raise the tile's `?v=`.
- Backup copy: `index_before-start.html`.

---

## 3. Choosing the own collection

- Collection window → **Eigene Wörter verwenden**. Confirmation: *„Deine eigenen Wörter ersetzen das Standard-Set. Dein Fortschritt dort wird beiseitegelegt.“*
- The user names the collection (editable later).
- **Demo progress is kept aside**, not deleted.
- **Home stats restart** for the new collection (decided). Card progress starts at zero.
- **Zurück zum Standard-Set** (via *Löschen*): asks *„Weitermachen, wo du aufgehört hast?“* or *„Neu anfangen?“*.
- Deleting the own collection removes its words and progress for good → the confirmation says so and offers **Exportieren** first.

---

## 4. Collection window

Opens from the collection button (start screen and done screen). Built like the **table windows** (blur 8px + darkening, card colour, 10% outline, 24px corners, × top right, tap outside / Esc closes).

Contents:
- Name (tap to rename)
- Word list (scrollable; tap a word → edit form)
- **＋ Wort hinzufügen** (manual form)
- **＋ Wörter importieren** (paste / file)
- **Exportieren**
- **Löschen · zurück zum Standard-Set**

On the built-in set, only **Eigene Wörter verwenden** is offered (the built-in set can't be edited by users).

---

## 5. Adding words

Three ways; paste and file read the **same format** (one piece of parsing logic).

### 5.1 Paste (main way)
- A text box + **Format kopieren** button.
- **Format kopieren** copies only the *format block* (syntax rules + example cards incl. a separable verb + „answer with the list only“). The user writes their own part (which words, level, topic, **which translation language**) and pastes the format block after it into their AI.
- The block asks for translations in **one** language only (plain strings, see 6).

### 5.2 File
- Picker accepts **JSON** and the app's **`.js` format** (`window.WORDS = …` is stripped, never executed). Files can come from Drive / Files via the system picker.
- No CSV in Version 1.

### 5.3 Manual form („Neues Wort“) — also used for ✎ editing
1. **Satz** — type or paste the sentence.
2. The words appear as chips → **tap the word(s) to hide** (tap two for separable verbs: *schlage* + *vor*). The app writes `{{c1::…}}`.
3. **Bedeutung** — required.
4. **Übersetzung des Satzes** — optional.
5. **Grundform** — pre-filled from the marked word(s), editable (*schlage vor* → *vorschlagen*).
6. **Grammatik** — optional.
7. **Wortart** — optional chips: Verb · Substantiv · Adjektiv · Andere.
8. Switch **Gleich lernen** (default **on**): on → card becomes active immediately (due today); off → end of the „+ 5 neue Wörter“ queue.

Editing a card keeps its id → progress kept.

---

## 6. Card format for imports

Required:
- `sentence` with at least one `{{c1::…}}`
- `translation` (meaning of the word)

Optional: `sentenceTranslation`, `grammar`, `pos`, `base`.

Built by the app: `id`, `blank`, `revealed`, `target`.

- **Translations are plain strings** (one language), e.g. `"translation": "to suggest"`. The existing `deutsch-translation-v1.js` shows plain strings as they are, so the language switch doesn't affect own cards. Built-in cards keep `{ "ru": …, "en": … }`.
- **Separable verbs:** several `{{c1::…}}` in one sentence = pieces of **one** answer (already supported: `targets()` joins them; the learner types `schlage vor` in one field). `target` is built as `"schlage / vor"`.
- Limitation (same as today): one card tests one word (possibly split). Two different words per card are not supported.
- Old field name `ru` for the sentence translation is accepted too and treated as `sentenceTranslation`.

Example:

```json
[
  {
    "sentence": "Ich {{c1::schlage}} Samstag {{c1::vor}}.",
    "sentenceTranslation": "I suggest Saturday.",
    "translation": "to suggest",
    "grammar": "vorschlagen · schlug vor · hat vorgeschlagen",
    "pos": "Verb",
    "base": "vorschlagen"
  }
]
```

### Import rules
- **Broken cards** (no `{{c1::}}`, no translation, broken JSON item): the good cards are imported, the broken ones skipped. Summary: *„38 hinzugefügt · 2 übersprungen“* + a list of what was wrong.
- **Duplicates** (same `base` — article der/die/das ignored, `base` defaults to the marked word(s) — or the very same sentence): skipped and counted in the summary. Hidden words alone are *not* compared: „der Bescheid“ and „Bescheid geben“ hide the same word but are different things to learn (found in `words.js`). A duplicate slipping through is harmless; skipping a wanted word is not.
- **Order:** new words enter in the order they were added („+ 5 neue Wörter“ takes them in that order).

---

## 7. Storage

- **localStorage** (not IndexedDB) — simple, already used everywhere, covered by the existing Backup. One card ≈ 430 bytes → roughly 5,000–10,000 cards fit; years of daily use. Revisit (compact format or IndexedDB) only if someone reaches several thousand words; the app could warn at ~80% full.
- **Active progress stays in `wortsternSRSv03`** (whatever collection is active). This way Home's due count (`deutsch-wortschatz-due-v1.js`), the Home tile, daily points and restore keep working unchanged — they only read `activeIds` + cards, not the words.
- New keys (confirmed in step 2):
  - `deutschWortschatzCollectionV1` — own collection: `{ name, cards: [...], nextId }`
  - `deutschWortschatzDemoProgressV1` — demo progress set aside while an own collection is active
- **Own card ids** get a prefix (e.g. `"u1"`, `"u2"`) so they can never be confused with built-in ids.
- On load: if an own collection exists, Wortschatz uses its cards instead of `window.WORDS` from `words.js`. Notifications (`prepareTomorrowNotifications`) use `activeCards()` and so follow automatically.
- **Backup:** both keys are in `BACKUP_MODULES` in `Home/index.html`. No separate backup for collections.
- **Restore rule:** a backup with Wortschatz progress but **without** an own collection (made before this feature, or while on the built-in set) removes an own collection (and set-aside demo progress) on the device, so progress and words never get mixed.

---

## 8. Built-in set (Standard) — rule for the maintainer

- Progress is saved by card `id`. **Never change or reuse an id; only append new ones.**
  - Adding words → users' progress untouched; new words wait for „+ 5 neue Wörter“.
  - Fixing text of a card → same id, progress kept, new text shows up.
  - Removing a card → its progress entry is ignored (code already skips missing ids).
- No matching logic is needed for the built-in set.

---

## 9. Not in Version 1 (later, only if needed)

- **Update from file** (re-import a corrected full list, matched by German word, progress kept).
- **Archiving learned words** (takes them out of reviews; saves no space).
- CSV import.
- Separate backup for collections — **not needed**: the app-wide Backup / Restore covers it.

---

## 10. Open — decide separately

- ~~Stats / Fortschritt screen for Wortschatz~~ — **decided and built 2026-09-26** (bar = started words · sitzt · gelernt, collection name, no total). See `PROGRESS_TRACKER.md` §7 and DECISIONS.md → „Wortschatz · statistics with collections“.
- Texts: „Worum geht's?“ for Wortschatz, the format block for AI prompts, confirmation texts (EN/RU where needed).

---

## Build order (suggestion)

1. ✅ Start screen (no collection logic yet) → test keyboard focus, Home tile, done screen. Version bump + `?v=`. *Done 2026-09-26: Wortschatz v2.85, Home tile `?v=2.17`, Home 5.47. Details in DECISIONS.md → Wortschatz · start screen.*
2. ✅ Storage layer: own collection key, demo progress set aside, load own cards instead of `words.js`, backup keys. *Done 2026-09-26: `wortschatz/collection.js` (`window.WortschatzCollection`), Wortschatz v2.86, Home 5.48. No visible change yet. Home stats reset on switching is left for the stats discussion.*
3. ✅ Collection window (name, list, export, delete / back to demo). *Done 2026-09-26: `wortschatz/collection-window.js`, Wortschatz v2.87, Home 5.49. The button sits under „Zur Startseite“ on the done screen (not between the two buttons, so they stay one group). „Eigene Wörter verwenden“, „＋ Wort hinzufügen“ and „＋ Wörter importieren“ are added with steps 4–5.*
4. ✅ Manual form (add + ✎ edit, tap-to-hide chips, „Gleich lernen“). *Done 2026-09-26: in the collection window (＋ Wort hinzufügen; tap a word = edit / delete). Plus a small ✎ on the answer screen for own words (edit only; the session keeps running). Wortschatz v2.89, Home 5.51.*
5. ✅ Import (paste + file, validation, duplicates, summary) + format block text. *Done 2026-09-26: Standard → „Eigene Wörter verwenden“ (name → „Liste importieren“ or „Erstes Wort eintippen“); own collection → „＋ Wörter importieren“; „Format für die KI“ view with Kopieren. Wortschatz v2.90, Home 5.52. Decided 2026-09-26: no „take over Standard with progress“ button (option B was considered and dropped — the progress so far is small and unwanted words can now be deleted).*
6. ✅ „Few words left“ line + „+ Wörter hinzufügen“. *Done 2026-09-26 with simpler wording: „Noch 8 neue Wörter“ and „+ Neue Wörter“; „+ 5 neue Wörter“ shows the real number when fewer than 5 are left. Wortschatz v2.92, Home 5.54.*
7. ✅ Update DECISIONS.md / PROJECT_SUMMARY.md *(done 2026-09-26; PROGRESS_TRACKER.md §7 updated too)*, then the stats discussion → **`WORTSCHATZ_STATS_HANDOFF.md`**.

---

## Where things stand (2026-09-26, Wortschatz v2.105, Home 5.67)

**Everything in Version 1 is built.** The sections above are the original plan; many details changed while building (English collection screens, „Starter-Set“ instead of „Standard“, start / done screen layout, „5 neue Wörter lernen“, ✎ on the answer screen, …). **`DECISIONS.md` (sections „Wortschatz · …“) is the source of truth for the current behaviour and look.**

**Stats:** done 2026-09-26 — see `WORTSCHATZ_STATS_HANDOFF.md` (summary of the decisions).

**Small open points (not stats):**
- ~~Start screen: swap „＋ Use your own words“ and „Starten“?~~ — **keep the current order** (decided 2026-09-26).
- ~~Start screen: gap above the folded „Worum geht's? ▸“ (~90px)~~ — **keep** (buttons never move; decided 2026-09-26).
- ~~Done screen buttons 360px vs 312px~~ — **keep as is** (decided 2026-09-26).
- ~~„Starten · 12 Karten“ inside the button~~ — **dropped** (2026-09-26): the session counter shows the number.
- Collection window in the Safari web app: bottom strip stayed light in all exercises → **fixed in Home 5.69** (see DECISIONS.md), to confirm on the iPhone.
- Home's „‹ Deutsch.“ back button (on trial since Home 5.43) — the user isn't happy with it; to discuss separately.
- Russian „Worum geht's?“ text has „забудется, - и“ (comma + dash) — polish when the descriptions are reviewed.
- Later, only if needed: „Update from file“ (re-import with matching), archiving learned words, CSV import.
