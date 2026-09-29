# Open tasks — after the clean-up review (2026-09-27)

Collected from all files in `Documentation/` after the clean-up of Home, Wortschatz, all eight exercises and both chapter pages (Home 5.83). Tick items off here; details live in the linked docs.

---

## 1. To decide

- [x] **„‹ Deutsch.“ back button** → replaced by the round Home button + open / close animation — **closed 2026-09-27 (Home 5.93), tested on the iPhone** → DECISIONS.md *Home button + open / close animation — final*
- [ ] **Artikel word list** (`Artikel/words.js`) — before restructuring:
  - [ ] which wording to keep for the 8 drifted groups (-ment, -um, -ium, -ma, -e → die, -e exceptions der/das, beverage exception)
  - [ ] examples: the same for all nouns of a rule, or deliberately varied?
  → DECISIONS.md *Open task: clean up the Artikel word list*
- [ ] **Ortspräpositionen table labels vs rule groups** — one wording (e.g. „Person, Firma, Aktivität“ vs „Person, Geschäft, Aktivität, Nähe“); write it once or build the table from `ORTS_KATEGORIEN`; „Straße als Adresse“ has no table row. → DECISIONS.md *Ortspräpositionen · clean-up*
- [ ] **Shared-stylesheet round — open points:**
  - [ ] class names for start / answer buttons (`.choice` / `.size` / `.session-option` / `.case-choice`)
  - [ ] panel widths (480 / 620 / 720 / 760px)
  - [ ] case buttons' shadow + hover (Fester Kasus vs Verben mit Präpositionen)
  - [ ] how the two-zone phone layout of Verben mit Präpositionen (`placeQuestion()`) fits in
- [ ] **Partizip II Vokalwechsel table** — keep or remove *ö → o* and *ü → ü · u* (only came from the modal verbs, now gone from `verbs.js`)?
- [ ] **Ortspräpositionen mistake marker** — tune `--mark-strength` (15 % dark / 12 % light) after the phone test
- [ ] **Wortschatz „Worum geht's?“** — final text (still a draft); Russian „забудется, - и“ to polish
- [ ] *Later, only if needed (Wortschatz):* update from file · archiving learned words · CSV import

## 2. To build

- [ ] **Shared-stylesheet round** — common parts into one file (e.g. `components/deutsch-exercise-v1.css`), tested on every page at once (the named next step). Also move Home's `ROW_STYLE` into the exercises (bottom row: version number right, „Worum geht's?“ up, no „Zur Startseite“)
- [ ] **Summaries inside Home:** „‹ Präpositionen“ runs into „Fertig.“ (Fester Kasus; check Verben mit Präpositionen and all others) — in the shared-stylesheet round
- [ ] **Pronomen + Modalverben on short screens** (320×568, sideways): table pill probably covers keyboard keys, as in Partizip II — check and fix the same way
- [ ] **Design round:**
  - [ ] Modalverben Formen table: text 9–11px, „Klicke“ → „Tippe“, group row is a hover target on the computer only
  - [x] ~~Phone sideways: answer buttons below the screen edge (Ortspräpositionen, Fester Kasus); Weiter needs a scroll (Verben mit Präpositionen)~~ — phones sideways now show „Bitte dreh dein Handy.“ (Home 5.96)
  - [ ] Verben mit Präpositionen at 320px: long example sentences wrap to two lines
- [ ] **Re-export Home tile icons** — edges exactly `#2A2A2D` (`icon.webp`) / `#FFFFFF` (`icon_light.webp`); especially `wortschatz/icon_light.webp` on pure white
- [ ] **Artikel `words.js` restructure** — each rule stored once (`RULES` list), nouns only word / article / translation / rule id; progress and difficulty keys unchanged (after the decision in 1)
- [ ] **Notifications: second device** — Backup on iPhone → Restore on iPad → Notifications ON → check the scheduled push next day → NOTIFICATION_SYSTEM_MASTER.md §12, §15

- [ ] *Idea:* offline cache in the service worker (`sw.js`) — instant opens after the first visit, app works offline; needs care with updates → DECISIONS.md *Zoom tuned*

- [x] ~~Vielseitige Verben sentence review~~ — all 57 done (DECISIONS.md → *sentence review with Alena, part 1 / part 2*)
- [ ] **Vielseitige Verben — after the review:**
  - [ ] Alena mentioned **a few bugs** from her test — ask her for them
  - [ ] make the situations of **#1–#32 funny** (fun ones start at #33; #12, #29 already done)
  - [ ] **gender pass:** RU situations mostly feminine past tense (оставила, ходила…) — neutral (present / imperative) or some male
  - [ ] table example for bekommen „receive“ still the café — change to e.g. „Ich *bekomme* morgen mein Paket.“?
  - [ ] *Idea (Alena):* check the whole app for places to make exercises funny

## 3. Upload + phone test

- [ ] **Upload today's rounds to GitHub** (no git remote — uploads are by hand; each round in DECISIONS.md has its „Upload to GitHub“ list and files to delete there):
  - [ ] Home 5.73 · [ ] Wortschatz v2.108 (5.74) · [ ] Artikel v27 (5.75) · [ ] Pronomen v7.39 (5.76)
  - [ ] Partizip II v55 + v56 (5.77 / 5.79) · [ ] Modalverben v13 (5.78)
  - [ ] Ortspräpositionen v23 (5.80) — **all six files together** (renamed data file)
  - [ ] Fester Kasus v19 (5.81)
  - [ ] Verben mit Präpositionen v3.13 (5.82) — **all six files together** (renamed data file)
  - [ ] Chapter pages Verbformen v11 + Präpositionen v15 (5.83)
  - [ ] Home button + open / close zoom (5.84 → 5.93): root `index.html`, `home.css`, `home.js`
  - [ ] Home's windows darken the bottom strip + Settings link in the page (5.92): root `index.html`, `home.css`, `home.js`
  - [ ] Chapter card → exercise zoom + press effect restored (5.94): root `index.html`, `home.js`, `verbformen/index.html`, `verbformen/verbformen.js`, `praepositionen/index.html`, `praepositionen/praepositionen.js`
  - [ ] Keyboard above the Home button + table buttons in the Home row + keyboard width (5.95): 19 files — list in DECISIONS.md → *Keyboard above the Home button*
  - [ ] „Bitte dreh dein Handy.“ layer (5.96): root `index.html`, `home.css`
  - [ ] **Vielseitige Verben v1–v3 (5.105–5.107):** root `index.html`, `home.js`, `progress-screen.js` · `verbformen/index.html` · new folder `verbformen/vielseitige_verben/` (4 files)
  - [ ] **Vielseitige Verben Formen table + Modalverben table fixes (Home 5.110):** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css`, `vielseitige_verben.js`, `forms_table.js` (new) · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js`
  - [ ] **Vielseitige Verben v5 — explanation = the table's card (Home 5.111):** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css`, `vielseitige_verben.js`, `forms_table.js`, `sentences.js`
  - [ ] **Vielseitige Verben v11 — Präteritum vs Perfekt notes (Home 5.115):** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`, `forms_table.js`, `vielseitige_verben.js`, `vielseitige_verben.css`
  - [ ] **Vielseitige Verben v8 — sentence review 1–57 (Home 5.113):** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`, `forms_table.js`, `vielseitige_verben.js`
  - [ ] (i) next to Backup → „Your progress“ window (5.97): root `index.html`, `home.css`, `home.js`
  - [ ] **Tables locked until the answer, answer lit (Home 5.112):** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/` `index.html`, `modalverben.css`, `modalverben.js` · `verbformen/partizipII/` `index.html`, `partizipII.css`, `partizipII.js` · `pronomen/` `index.html`, `pronomen.css`, `pronomen.js` · `praepositionen/index.html` · `praepositionen/ortspraepositionen/` `index.html`, `ortspraepositionen.css`, `ortspraepositionen.js`
- [ ] **Confirm on the iPhone:**
  - [ ] Home 5.69 — bottom strip darkens while a window is open (since 5.92 also Home's own: Fortschritt, About, Keep your progress, „Are you sure?“)
  - [ ] Home 5.92 — Settings link below the Keep your progress card in Safari / on small phones
  - [ ] Home 5.94 — chapter card → exercise arrives with the zoom (not abrupt?); cards, 10 / 20 / 30 and other buttons inside the exercises press again
  - [ ] Home 5.96 — phone sideways shows „Bitte dreh dein Handy.“ (Safari and the Home-screen app), turning back continues the round
  - [ ] Home 5.95 — keyboard sits right above the Home button in all five keyboard exercises (Modalverben long sentences in Safari!); table button in the Home row, smaller; on a small iPhone a long question shrinks a little — still readable?
  - [ ] Home 5.110 — Vielseitige Verben table: tabs, tags + roll-up; in a round the button is off until Prüfen, then only the current verb; Modalverben table no longer scrolls sideways, example rolls into view
  - [ ] Home 5.111 — Vielseitige Verben: after Prüfen the explanation is the table's building-block card (right and wrong answers, EN / RU, dark / light)
  - [ ] Home 5.112 — Modalverben, Pronomen, Ortspräpositionen, Partizip II: table button greyed out during the question (Ortspräpositionen: until all three lines), after the answer the table opens with the answer in gold
  - [ ] Progress tracker steps 2.2–2.8, 3 and 4
  - [ ] QA fixes of 24–25 Sep (Ortspräpositionen, Partizip II, Kasus, Verben mit Präpositionen, Modalverben, Pronomen, Artikel, Home phrases, Wortschatz)
  - [ ] (if already tested: just update the statuses in PROGRESS_TRACKER.md §9 / §9b and the QA files)

## 4. Documentation to update

- [ ] **PROJECT_SUMMARY.md** — Home version (says 5.73 / 5.75, now 5.83); `progress` / `progressSnapshots` backup modules still marked *planned* (built); repository tree without the new per-exercise CSS/JS files; storage-key list incomplete
- [ ] **PROGRESS_TRACKER.md** — Artikel 238 nouns / 60 items → 251 nouns / 71 items
- [ ] **QA/QA_01_Ortspraepositionen.md** — status still „Regeln sheet: waiting for decision“ (replaced by the Tabelle, QA_01c)
- [ ] **NOTIFICATION_RULES.md §16** — says the server isn't built yet (it's live, see NOTIFICATION_SYSTEM_MASTER.md §10)
