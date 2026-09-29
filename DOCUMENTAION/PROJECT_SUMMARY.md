# German Learning App — Project Summary

## 1. Project overview

**Deutsch** is a modular web application for learning German.

The application is hosted on GitHub and is structured as a central Home screen with several independent learning modules.

The current repository contains five learning modules:

- **Wortschatz** — vocabulary
- **Artikel** — German articles
- **Verbformen** — verb forms
- **Pronomen** — pronouns
- **Präpositionen** — prepositions

The application is designed to work on both mobile and desktop devices.

The project uses a dark visual interface and browser-based persistent storage. Learning modules are implemented as separate HTML applications inside their own directories.

---

## 2. Repository structure

The current GitHub repository has the following main structure:

```text
der-die-das/
│
├── index.html        (Home markup; only the no-flash theme script is inline)
├── home.css          (Home styles)
├── home.js           (Home logic: dashboard, stats, settings, backup, notifications, windows)
├── progress-screen.js (Fortschritt window)
│
├── artikel/          (index.html markup · artikel.css · artikel.js · words.js)
│
├── components/
│   └── icons/
│
├── praepositionen/
│
├── pronomen/
│
├── verbformen/
│
├── wortschatz/        (index.html markup · wortschatz.css · wortschatz.js · words.js · collection.js · collection-window.js)
│
├── icon.png
│
└── manifest.webmanifest
```

### Root

`index.html` is the central **Home** screen of the application. Since Home 5.73 it holds only the markup; styles are in `home.css`, logic in `home.js` (locally: the `deutsch-home/Home/` folder).

`icon.png` and `manifest.webmanifest` belong to the application-level web interface.

### Learning modules

Each learning module has its own directory:

```text
artikel/
verbformen/
pronomen/
praepositionen/
wortschatz/
```

Some modules (Verbformen, Präpositionen) are **hubs**: their `index.html` is a selection screen, and each exercise lives in its own subdirectory with its own `index.html` and data file.

A module normally contains:

- `index.html` — the module interface and logic;
- a JavaScript file containing the module's learning data, such as words or sentences;
- the module artwork/icon used on the Home screen;
- a favicon for the module page.

The exact filenames of the individual data and icon files are module-specific and should be documented from the current repository rather than assumed.

### Shared components

The `components/` directory contains reusable elements shared by learning modules.

It also contains an `icons/` subdirectory with shared UI icons.

The reusable on-screen keyboard is implemented as a separate component:

```text
components/
├── deutsch-keyboard-v2.60.html
├── deutsch-day-v1.js   (DeutschDay.key / .add — the one "YYYY-MM-DD" day key used by Home, Wortschatz and Artikel)
├── deutsch-progress-v1.js   (progress tracking, see PROGRESS_TRACKER.md)
├── deutsch-wortschatz-due-v1.js   (the one rule for due Wortschatz words, used by Wortschatz + Home)
└── icons/
```

---

## 3. Home screen architecture

The Home screen is the central entry point and application shell.

It displays the available learning modules and the user's daily progress.

The current Home version is:

```text
Deutsch. version 5.94
```

The Home screen contains tiles for:

- Wortschatz
- Artikel
- Verbformen
- Pronomen
- Präpositionen
- Heute / daily points — tapping the tile opens the **progress screen** (`Home/progress-screen.js`, see `PROGRESS_TRACKER.md`)

---

## 4. Embedded module architecture

A key architectural decision is that learning modules are **not opened as ordinary full-page navigation from Home**.

Instead, Home contains an application shell with a full-screen `iframe`.

When the user selects a module:

1. Home reads the module path from the selected tile.
2. The module URL is assigned to the `iframe`.
3. The application shell becomes visible.
4. The module is displayed inside the iframe.
5. A round Home button stays available above the embedded application and always goes straight back to Home (since Home 5.84; since 5.90 in one fixed bottom row — centred on start / chapter / summary screens, bottom left during a round, the version number at the right end of the row). On phones Home steps back and the exercise's content fades and zooms in when it opens; when closing, the exercise fades out and Home grows back into place — see DECISIONS.md → *Home button + open / close animation — final*.

The current structure is:

```text
Home
│
├── module tiles
│
└── app shell
    │
    ├── Home / Back control
    │
    └── iframe
        └── selected learning module
```

The module itself remains an independent HTML application, while Home provides the surrounding navigation shell.

---

## 5. Returning from a module

The Home control closes the embedded application shell rather than navigating to another page.

When the user returns to Home:

- the daily statistics are refreshed;
- the iframe shell is hidden (on phones after a short crossfade in which Home grows back into place);
- the iframe is reset to `about:blank` (on phones half a second later, when nothing moves any more);
- the Home page remains the main application screen — it never unloads while an exercise is open.

All values of the opening / closing animation and the Home button: DECISIONS.md → *Home button + open / close animation — final*.

---

## 6. Learning modules

The application currently contains five independent learning modules.

### Wortschatz

**Wortschatz** is the vocabulary-learning module (spaced repetition: a card comes back after 1, 8, 20, 45, 90 days; level 6 = fully learned after the 90-day review).

**Files** (`wortschatz/`):

| File | Role |
|---|---|
| `index.html` | markup only (start screen, session, done screen); the no-flash theme script is inline (since v2.108) |
| `wortschatz.css` | all styles — one palette per theme at the top (since v2.108) |
| `wortschatz.js` | keyboard bridge + game logic: SRS, typo tolerance, status for Home, notifications (since v2.108) |
| `words.js` | the built-in **Starter-Set** (217 cards, `window.WORDS`) |
| `collection.js` | own word collections — storage, checking and importing cards (`window.WortschatzCollection`) |
| `collection-window.js` | the collection window: word list, add / edit / delete a word, import, export, rename, delete collection (`window.WortschatzCollectionWindow`) |

**Word collections (since 2026-09-26, Wortschatz v2.86+):** every user practises **one** collection — the built-in **Starter-Set** or their **own** collection (created by importing a list from an AI / a file, or by typing words). An own collection replaces the Starter-Set (its progress is set aside and can be restored) and **grows** instead of being replaced. Full plan and all decisions: `WORTSCHATZ_COLLECTIONS.md` and `DECISIONS.md` (sections „Wortschatz · …“).

**Screens:**
- **Start screen:** Wortschatz. → DEINE WÖRTER · „Starter-Set ›“ · „15 / 217 Wörter angefangen“ · red „Noch 8 neue Wörter“ when few are left → „＋ Use your own words“ (Starter-Set only) → Starten; „Worum geht's? ▸“ folded at the bottom. Shown only when cards are due.
- **Session:** unchanged; ✎ on the answer screen for own words (edit the card in place).
- **Done screen:** „Fertig / für heute.“ → DEINE WÖRTER block → „5 neue Wörter lernen“ + „Zur Startseite“. No top bar.
- **Collection window** (English on purpose): Starter-Set = description, ▸ word list, „Use My Own Words“; own collection = „＋ Add Word“ · „Import List“, word list (tap = edit), „Export · Delete“.

Home receives the module's daily completion state through shared browser storage.

A completed Wortschatz session is represented on Home as:

```text
✓ fertig
```

and contributes **60 points** to the daily total.

The current verified Wortschatz implementation also uses the reusable German on-screen keyboard component.

---

### Artikel

**Artikel** is the German article learning module.

Home currently defines a daily goal of:

```text
10 answers
```

The Home dashboard displays the current progress and changes the module status to `✓ fertig` once the daily goal is reached.

Files: `index.html` (markup only), `artikel.css`, `artikel.js` (since Artikel v27). Data: `Artikel/words.js` — 251 nouns in 53 rule groups, each tagged with `ruleType` (suffix · form · category · exception · none) and `ruleLabel` (e.g. "-UNG ENDING"). Selection weight per noun: `artikelGameDifficultyV1` (1–4). Progress (`deutschProgressV1`, exercise `artikel`) is counted **per rule group**; nouns with `ruleType` none / exception count individually — 71 progress items. See `PROGRESS_TRACKER.md`.

---

### Verbformen

**Verbformen** is the verb-form learning module.

Home currently defines a daily goal of:

```text
10 answers
```

The progress is read from the application's daily statistics and displayed on the Home dashboard.

---

### Pronomen

**Pronomen** is the pronoun learning module.

Home currently defines a daily goal of:

```text
10 answers
```

The progress is included in the daily statistics shown on Home.

---

### Präpositionen

**Präpositionen** is the preposition learning module. It is a hub (`praepositionen/index.html`, "Was möchtest du üben?") with three exercises:

| Exercise | Folder | Task | Daily stats key |
|---|---|---|---|
| Fester Kasus | `kasus/` | Präposition → Kasus (buttons) | `festerKasus` |
| Verben mit Präpositionen | `verben_mit_praepositionen/` | Verb → Präposition + Kasus (typed, on-screen keyboard) | `verbenMitPraepositionen` |
| Ortspräpositionen | `ortspraepositionen/` | Ort → Wo · Wohin · Woher (buttons) | `ortspraepositionen` |

Home currently defines a daily goal of:

```text
10 answers
```

The tile counts the sum of all three exercises' answers.

#### Fester Kasus

Source: the teacher's list „Liste der deutschen Präpositionen nach Kasus“ (QA: `QA/QA_03_Kasus.md`).

Files (since v19): `kasus/index.html` (markup), `kasus.css`, `kasus.js` (script) and `prepositions.js` (`window.PRAEPOSITIONEN`, 32 cards). Until v18 the data file was called `praepositionen.js` and styles and script were inside `index.html`.

#### Verben mit Präpositionen

Source: the teacher's list „Verben mit Präpositionen“ (QA: `QA/QA_04_VerbenMitPraepositionen.md`, `QA/QA_04c_VerbenMitPraepositionen_Effectiveness.md`).

Files (since v3.13): `verben_mit_praepositionen/index.html` (markup), `verben_mit_praepositionen.css`, `verben_mit_praepositionen.js` (script) and `verbs.js` (`window.VERBEN_MIT_PRAEPOSITIONEN`, 65 verbs). Until v3.12 the data file was called `verben_mit_praepositionen.js` and styles and script were inside `index.html`.

#### Ortspräpositionen

Source: textbook Lektion 35 "Lokale Präpositionen" (A2).

Files (since v23): `ortspraepositionen/index.html` (markup), `ortspraepositionen.css`, `ortspraepositionen.js` (script) and `places.js` (`window.ORTSPRAEPOSITIONEN`, 66 cards; `window.ORTS_KATEGORIEN`, 10 rule groups; `window.ORTS_ZU_HINTS`). Until v22 the data file was called `ortspraepositionen.js`.

Mechanic:

- A card shows one place (article + noun, small) and a translation line (EN/RU, Settings → Translations). Where the place is ambiguous, the translation carries a short hint in brackets (e.g. „Supermarkt“: inside / right outside / somewhere nearby), and each meaning is its own card with exactly one correct answer.
- Three lines open one after another: **Wo?** (Ich bin …), **Wohin?** (Ich gehe …), **Woher?** (Ich komme …).
- Every question always shows its full set of prepositions — **5 · 5 · 2 buttons** — already fused with the article of the place's gender (m / f / n / pl / none):

| Slot | Wo? | Wohin? | Woher? |
|---|---|---|---|
| 1 | in | in | aus |
| 2 | an | an | von |
| 3 | auf | auf | |
| 4 | bei (Person) | zu (Person) | |
| 5 | zu (Hause) | nach (Stadt) | |

- "zu" is always present on Wo? so that *zu Hause* is not given away. "nach" is always present on Wohin?.
- After the third line the result shows the category and its rule (e.g. `Offene Fläche · auf · auf · von`). A green or red glow appears under the progress line; it starts at the progress line and fades to zero at the progress line's left and right ends. There is no card background; the sentence boxes are semi-transparent.
- Desktop: keys 1–5 pick the button in that slot, Enter/Space continues. Keys only act during a round and not while the table is open (Esc closes it); Cmd/Ctrl/Option combinations are left to the browser.
- One finished card (all three lines) is one answer for the daily stats (`deutschDailyStatsV1` → `ortspraepositionen: {answers, correct}`); it is correct only if all three lines were right. No hover styles (iPhone keeps `:hover` on the tapped spot).
- Difficulty (`ortspraepositionenDifficultyV1`) is stored per place **and** per question: wrong +1 (max 4), right −0.5 (min 1). A card's weight is the average of its three lines; a place appears at most once per session.

---

## 7. Daily progress and Home dashboard

Home acts as a central dashboard for daily learning activity.

For the standard exercise modules, the current daily goals are:

| Module | Daily goal |
|---|---:|
| Artikel | 10 |
| Verbformen | 10 |
| Pronomen | 10 |
| Präpositionen | 10 |

Home reads the daily statistics from browser `localStorage`.

For each module, it:

- reads the number of answers;
- limits the displayed progress to the daily goal;
- displays the current count;
- marks the module as completed when the goal is reached;
- adds the completed/current answers to the daily point total.

Wortschatz uses a separate completion state and contributes 60 points when its daily task is completed.

The resulting total is displayed in the **Heute** section together with a progress bar toward 100 points.

---

### Personal greeting (v5.18)

The intro line on Home ("Was möchtest du heute üben?") is now a personal greeting. It changes with the time of day and the daily points, and uses the user's name if one is set.

- Phrases: `Home/greetings.js` (`window.GREETINGS`), grouped by state. Each phrase has 1–2 lines, and phrases with the name also have a no-name version.
- Logic: `renderGreeting()` in `Home/home.js`, called from `renderDailyStats()`. One phrase per state per day. If a line with the name would be wider than 240px, the no-name version is used.
- The hard stop overlay stays without the name.
- Name: Settings → Name (optional, max. 20 characters), stored in `deutschProfileV1` as `{"name": "…"}` and included in Backup / Restore as module `profile`.
- Full concept and rules: `Documentation/PERSONAL_GREETINGS.md`.

### Header and pop-ups under the status bar (v5.19)

- Home header is fixed at `top: 0` and full width, with `padding-top: env(safe-area-inset-top) + 22px`, so its background covers the status bar area. A short `header::after` fade softens the lower edge while scrolling.
- Dimmed pop-ups (`.pg` progress screen, `.settings-confirm`, Pronomen `.modal`, Modalverben `.forms-modal`, Partizip II `.pattern-modal`) start at `top: -env(safe-area-inset-top)` with matching extra top padding, so the dim/blur also reaches behind the status bar in the Home Screen app. Card position is unchanged.
- Backups: `*_before-statusbar.*`.

---

## 8. Communication between modules and Home

The modules and Home communicate through browser `localStorage`.

For example, Wortschatz publishes its Home-related state under:

```text
deutschHomeStatsV1
```

Home reads this state and updates the Wortschatz tile accordingly.

If that state isn't from today yet (first app start of the day), Home counts the due words itself with the shared `components/deutsch-wortschatz-due-v1.js` — the same file Wortschatz uses — and stores the result there until Wortschatz publishes its own (see DECISIONS.md, 2026-09-26).

Home also refreshes its dashboard when the page:

- becomes visible;
- receives focus;
- is shown again;
- receives a `storage` event;
- or during its regular periodic synchronization.

This allows the Home dashboard to reflect changes made by learning modules while Home remains mounted.

---

## 9. Persistent browser storage

The application uses browser `localStorage` for persistent learning state and daily statistics.

Current Home-level storage keys include:

```text
deutschDailyStatsV1
deutschHomeStatsV1
deutschProfileV1
```

The Wortschatz module uses:

```text
wortsternSRSv03                    progress of the ACTIVE collection (Starter-Set or own)
deutschWortschatzCollectionV1      the own collection (only when the user has one)
deutschWortschatzDemoProgressV1    Starter-Set progress, set aside while an own collection is active
```

The Präpositionen exercises use:

```text
festerKasusDifficultyV1
ortspraepositionenDifficultyV1
```

The exact storage keys of other modules should be documented from their current implementations when needed.

---

## 10. Backup and Restore

Home includes a central **Backup / Restore** function.

The interface provides:

```text
Backup · Restore
```

and uses JSON files for exported application data.

The backup format is intentionally **module-based**.

The current backup structure contains:

```text
Deutsch Backup
│
├── app
├── backupVersion        (1)
├── createdAt
└── modules
    ├── <module name>
    │   ├── storageVersion
    │   └── state
    └── …
```

Modules included (`BACKUP_MODULES` in `Home/home.js`):

| Module | Storage key | Label in Restore dialog |
|---|---|---|
| `wortschatz` | `wortsternSRSv03` | Wortschatz |
| `wortschatzCollection` | `deutschWortschatzCollectionV1` | Wortschatz · eigene Wörter |
| `wortschatzDemoProgress` | `deutschWortschatzDemoProgressV1` | Wortschatz · Standard-Set (beiseitegelegt) |
| `profile` | `deutschProfileV1` | Name |
| `artikel` | `artikelGameDifficultyV1` | Artikel |
| `modalverben` | `modalverbenDifficultyV1` | Modalverben |
| `partizipII` | `verbformenDifficultyV1` | Partizip II |
| `pronomen` | `pronomenStatsV2` | Pronomen |
| `festerKasus` | `festerKasusDifficultyV1` | Fester Kasus |
| `verbenMitPraepositionen` | `verbenPraepStatsV1` | Verben mit Präpositionen |
| `ortspraepositionen` | `ortspraepositionenDifficultyV1` | Ortspräpositionen |
| `progress` *(planned)* | `deutschProgressV1` | Fortschritt |
| `progressSnapshots` *(planned)* | `deutschProgressSnapshotsV1` | Fortschritt-Verlauf |

Rules:

- **Save:** keys that don't exist in storage are skipped. Planned keys can therefore be listed before the feature that writes them exists.
- **Restore:** validates app name, backup version and module structure. A module whose `storageVersion` doesn't match (unknown/outdated) or whose state is missing is **skipped** — the rest is restored. Restore fails only if nothing restorable is left. Old backup files (e.g. Wortschatz-only) stay valid.
- **Score format changes** are done inside the stored data (a format marker the module checks and converts once), **not** by renaming storage keys — so a restored old backup is simply converted again by the module.
- Daily stats (`deutschDailyStatsV1`), theme, daily-limit and the other notification keys (ON/OFF, `deviceId`) are intentionally **not** backed up.
- **Exception (v5.20):** the anonymous notification `userId` (`deutschNotificationUserIdV1`) IS backed up as module `notificationUser` (a setting, stored as a plain string). Restoring it keeps the same notification identity after a Home Screen reinstall and links a second device to the same user. See NOTIFICATION_SYSTEM_MASTER.md §15.

- **Wortschatz restore rule (2026-09-26):** a backup with Wortschatz progress but **without** an own collection removes an own collection (and set-aside Starter-Set progress) on the device, so progress and words never get mixed.

Restore requires user confirmation; the dialog lists the modules by their label.

The backup architecture is intentionally extensible so that additional modules can be added to the backup system without changing the overall export format.

---

## 11. Shared on-screen keyboard

The project contains a reusable custom on-screen keyboard component:

```text
components/deutsch-keyboard-v2.60.html
```

The keyboard is designed primarily for mobile learning modules.

Current documented behavior:

- displayed only on mobile screens (`<700px`);
- hidden on desktop screens (`≥700px`);
- mobile interface prevents browser page zoom;
- keyboard key text selection is disabled;
- pressed keys provide visual feedback;
- letter keys show a temporary enlarged character popup on touch;
- a single touch produces only one keyboard input;
- duplicate touch/click handling is prevented;
- QWERTY layout;
- German characters `ä`, `ö`, `ü`, `ß` are directly available;
- dedicated Backspace key;
- wide Space key;
- leading spaces and consecutive spaces are prevented;
- `✓` submits/checks an answer;
- keyboard is hidden while answer feedback is displayed;
- mobile answer feedback supports left swipe to continue to the next word.

The keyboard is implemented as a reusable component rather than duplicated inside every learning module.

---

## 12. Mobile and desktop architecture

The application supports different interaction patterns depending on screen size.

The reusable keyboard is a **mobile-only component**.

On desktop, learning modules use their regular desktop input/interface rather than displaying the custom on-screen keyboard.

The Home page itself is responsive and uses different dashboard dimensions and spacing depending on viewport size.

---

## 13. Main architectural principle

The most important structural principle of the project is:

```text
                    Deutsch App
                        │
                        ▼
                    Home
                 index.html
                        │
             ┌──────────┴──────────┐
             │                     │
       Dashboard              App Shell
             │                     │
      ┌──────┼──────┐              ▼
      │      │      │           iframe
      ▼      ▼      ▼              │
   Artikel  Verben  Pronomen      │
                                  ▼
                              Wortschatz
```

More precisely:

```text
GitHub repository
│
├── Home
│   └── index.html
│       │
│       ├── module dashboard
│       ├── daily progress
│       ├── backup / restore
│       │
│       └── iframe app shell
│           │
│           └── independent learning module
│
├── Learning modules
│   ├── artikel/
│   ├── verbformen/
│   ├── pronomen/
│   └── wortschatz/
│
├── Shared components
│   ├── deutsch-keyboard-v2.60.html
│   └── icons/
│
└── Browser localStorage
    ├── module progress
    ├── daily statistics
    └── persistent learning state
```

The important distinction is that **Home, learning modules, shared components, and persistent browser state are separate layers of the application**.

---

## 14. Current documentation scope

This document describes the **implemented architecture and functionality** of the application.

It should not be used to document planned features unless they have already been implemented.

When an architectural decision is deliberately changed, the relevant section should be updated so that this document continues to describe the current working system.

For module-specific behavior, the current module files should remain the source of truth.

### Current verified Home version

```text
Deutsch. version 5.94   (Settings; chapter card → exercise zoom, press effect inside exercises restored — 2026-09-27)
```

### Current verified reusable keyboard component

```text
deutsch-keyboard-v2.60.html
```
