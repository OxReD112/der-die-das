# Progress Tracker — Concept

Status: **implemented** (24.09.2026) — all exercises record progress, Home keeps daily snapshots, progress pop-up opens from the "Heute" tile.

Goal: a progress screen that opens from the Home "Heute" tile and shows, at a glance, that I am better now than I was 3 weeks ago — and, one tap deeper, *what exactly* I learned and where my weak spots are.

Mockup: `Claude outputs/fortschritt-mockup-v2.html` (final design; fake data — Artikel is deliberately shown as "got worse").
Earlier comparison mockup (rings / slope / bars): `Claude outputs/fortschritt-mockup.html`.

Wortschatz uses its own logic (section 7); all grammar exercises follow sections 2–6.

---

## 1. Screen design

**Entry:** tapping the "Heute" tile on Home opens the progress screen.

**Main screen — compact, minimal numbers.** Split into **Wortschatz** and **grammar** (everything else).

1. **Wortschatz card — at the very top**, on its own (section 7). It grows very slowly, so it is kept apart from the grammar statistics. Not tappable.
2. **Grammar top card:**
   - "In 3 Wochen" · big **+N** with "Sachen / sitzen jetzt" stacked in **two lines** next to it · a short encouraging line:
     - grammar line went **up or stayed**: "Du wirst besser."
     - grammar line went **down**: "Auf und Ab gehört zum Lernen." / "Alena, du machst das gut." — with the name from Settings, **name first** (like calling someone in a room before telling them something). No name set → "Du machst das gut." Principle: as long as I use the app, I'm doing great; ups and downs are part of learning.
   - A small overall line chart with just the current **percentage** at its end (e.g. "63%" — no "Gesamt" label, same style as all other charts).
   - The number and the line intentionally show **different things** (section 5). **Wortschatz is excluded** from both.
3. **Grammar chapter bars:** Artikel, Verbformen, Pronomen, Präpositionen. Each bar shows only the name and the change (e.g. **+18%**).
   - Dark green part = level 3 weeks ago; bright mint part = gained since.
   - A thin white **notch** marks the starting point. The dark part has a **straight right edge** so it meets the notch cleanly.
   - **If I got worse:** the dark part only reaches today's level; the lost piece between today and the notch is **soft coral**. The change reads e.g. **−6%** in soft coral. Noticeable, not alarming — no bright red.

**Drill-down**

- Chapter with several exercises (Verbformen, Präpositionen) → new screen with one thinner bar per exercise. Each exercise bar shows only its name and the change (e.g. +18%) — no current %. Tap an exercise → it expands inline with the detail.
- Chapter with one exercise (Artikel, Pronomen) → goes straight to the detail.
- Chapter screen header: "22% → 41%" (new value mint, or soft coral if lower).
- Detail = small line chart of the exercise % over the last 3 weeks + **"Neu gelernt"** list.
- "‹ Fortschritt" returns to the main screen.

**"Neu gelernt" list**

- Shows **at most 5 items per exercise**, **most recently learned first**. If there are more, a small **"+ N weitere"** expands the full list.
- The **count is never capped**: the big number at the top always shows the full total.
- Items are shown **plain — nothing next to them**. Red → green dots and "nach N Fehlern" were dropped: the list only celebrates what I learned; it should not point me back at struggles or invite fixating on single words.
- Pronomen shows category names here (e.g. "Dativ · Maskulin → -em").

**Themes:** the app has dark and light themes — all progress colors (mint, dark-green "past", soft coral, notch, track) need light-theme variants. The mockup only shows dark.

---

## 2. Difficulty score — how often an item appears

Unified for **Artikel, Fester Kasus, Ortspräpositionen, Modalverben, Partizip II, Verben mit Präpositionen**:

| Rule | Value |
|---|---|
| Scale | 1–4 (start at 1) |
| Wrong answer | +1 (max 4) |
| Right answer | −0.5 (min 1) |
| Effect | higher score → shown more often |

Changes per module:

- **Modalverben, Partizip II** — currently 1–6 with +1.5 on a wrong answer (`modalverbenDifficultyV1`, `verbformenDifficultyV1`). Switch to the common system. Existing scores are rescaled once: `new = 1 + (old − 1) × 3/5` (1→1, 6→4).
- **Verben mit Präpositionen** — **one difficulty score per verb** (1–4), weighted selection like Artikel. A verb counts as right only if **both** preposition and case are right.
  - Stored **inside the existing key** `verbenPraepStatsV1` as `.difficulty = {<verb id>: score}` plus `"__format": 2` → Backup already covers it.
  - One-time seeding when the marker is missing: `1 + error rate × 3`, rounded to 0.5 (from the old per-part session stats; verbs never answered start at 1). Real backup: e.g. warten auf → 1, sich erinnern an → 2, teilnehmen an → 4.
  - The per-part session stats (last 5 sessions) **stay** — they only drive the "Needs more practice" list at the end, no longer the selection.
- **Ortspräpositionen** — keeps its score per place **and** per question (Wo / Wohin / Woher) for selection.
- **Artikel, Fester Kasus** — already use this system; no change.

---

## 3. Pronomen — per grammar category

Pronomen keeps right/wrong per grammar category (no per-sentence score). Data: 103 sentences in `sentences.js` (was `pronouns.js` until Pronomen v7.39).

**Bug fixed (step 2.7):** the stem check used `startsWith("euer")`, but euer drops its second e before endings (eure, eurem, euren) — so every correct "euer" answer was counted as a wrong owner (visible in the backup: "ihr →" always wrong). Now `eur…` counts as the right stem for euer.

**41 progress categories:**

- **Personal pronouns** (36 sentences): **18** categories = 9 persons × Akkusativ / Dativ.
- **Possessive pronouns** (72 sentences) — each sentence counts toward **two** categories at once:
  - **8 owner** categories: ich → mein, du → dein, er → sein, sie → ihr, wir → unser, ihr → euer, sie(pl.) → ihr, Sie → Ihr.
  - **15 ending** categories (case × gender, as present in the data): Nominativ M/F/N/Pl, Akkusativ M/F/N/Pl, Dativ M/F/N/Pl, Genitiv M/F/N (no Genitiv Plural sentence yet).

The existing last-5-sessions stats (`pronomenStatsV2`) keep driving which sentences appear. For progress, each of the 41 categories additionally gets its own **permanent streak**.

---

## 4. "Sicher" — what drives the progress bars

Separate from the difficulty score; identical in all grammar exercises.

- **3 correct in a row** → the item (or Pronomen category) is **sicher**. Any mistake resets the streak to 0 → no longer sicher.
- Three states: **neu** (never answered) · **wackelig** (answered, not sicher) · **sicher**.
- Each item stores: `streak` and `sicherSince` (date it became sicher; cleared if it falls back).
- "Sicher" ≠ difficulty 1. An item at difficulty 4 is sicher after 3 correct answers but sits at 2.5. Intended — the difficulty score only controls how often an item appears; the streak alone decides "sicher".

**What counts as one item:**

| Exercise | One progress item = | Counts as correct when |
|---|---|---|
| Artikel | one **rule group** (e.g. "-ung → die", "Beverages → der") — nouns without a reliable rule and exceptions (`ruleType` none / exception) are their own item. **60 items** (34 rules + 26 nouns) | article right |
| Fester Kasus | one preposition (32, `prepositions.js`; key = preposition in lower case, label e.g. "mit + Dativ") | case right — an accepted variant (e.g. wegen + Dativ, "Umgangssprachlich") also counts as right, same as the existing scoring |
| Ortspräpositionen | one **rule category** (10: Raum, Stadt/Land ohne Artikel, Land mit Artikel, Kontakt/„Wasser“, Offene Fläche, Person/Geschäft/Aktivität, Straße als Adresse, am Ort (Bahnhof, Kasse …), Ausnahmen „immer in“, Zuhause), **weighted by places** (66, `places.js`; was 54 before the balance check) — same reasoning as Artikel. Label e.g. "Raum, geschlossener Ort → in · in · aus" | a **card** counts as right only if all three lines (Wo / Wohin / Woher) are right — same rule as the daily stats |
| Partizip II | one verb (77, `verbs.js`; key = infinitive in lower case, label e.g. "bringen → gebracht") | answer right |
| Modalverben | one **verb + form** (e.g. "müssen · Präteritum") — **26 items**, 2–8 sentences each (144 sentences, `special_verbs.js`). **Not weighted on purpose** (decided 2026-09-27): the bar shows how many *forms* you know, not how many sentences. Per sentence would be as slow as Artikel per noun | answer right |
| Verben mit Präpositionen | one verb (65, `verbs.js`; key = verb id `vmp_…`, label e.g. "denken an + Akkusativ") | preposition **and** case right |
| Pronomen | one of the 41 categories, **weighted by sentences** (personal category = its 2 sentences; a possessive sentence gives ½ to its owner and ½ to its ending) → total 103 | personal: answer right · owner: right stem (mein/dein/…) · ending: answer right, judged **only when the stem was right** — same logic as the existing stats |

---

## 5. What the numbers mean

- **Exercise bar %** = sicher items ÷ **all** items in the exercise (item list = the exercise's data file) — **weighted**: each item counts with its weight (default 1). **Artikel:** weight = number of nouns the item covers ("-ung → die" = 17, "der Tisch" = 1), so the Artikel bar = share of the 238 nouns whose article I reliably know. The "Neu gelernt" list and the big number still count items (one rule = one win).
- **Chapter bar %** (Verbformen, Präpositionen) = average of its exercises. Weak exercises stay visible one tap deeper.
- **Notch** = the same % from 21 days ago.
- **"Neu gelernt"** = items whose `sicherSince` is within the last 21 days (and are still sicher).
- **Big number** ("+N Sachen sitzen jetzt") = total "Neu gelernt" count across all grammar exercises. Wortschatz not included.
- **Grammar line** (ends with "N%") = how much of all grammar I know: total sicher weight ÷ total weight across all grammar exercises. Per day over the 3-week window. Wortschatz not included.
  - Number = recent wins; line = honest overall level (it also dips when items fall back to wackelig).

---

## 6. Comparing over time

- **One snapshot per day**: sicher count and total per exercise. Home writes/overwrites today's snapshot whenever it refreshes, so the last value of the day wins.
- **Days without practice** are filled with the last known snapshot (nothing changed, so that is exact), so charts have no gaps.
- **Comparison = today vs. 21 days ago** (point-to-point, not weekly averages). "Sicher" is a stable state built from many answers, so no smoothing is needed.
- **First 3 weeks:** compare against the first snapshot and label it "seit Start" instead of "In 3 Wochen".
- **Start from zero:** existing scores can't tell how many correct answers in a row happened before, so every item starts as neu/wackelig with streak 0. Expect big gains in the first weeks.

Why not accuracy: the modules adapt and show harder items more often, so accuracy can stay flat or drop while I'm improving.

---

## 7. Wortschatz

**Since 2026-09-26 (v18 of the Fortschritt screen, Wortschatz v2.106):** one bar, and **the whole bar = the words you have started** (not the collection size). Two layers on top of it, plus the counts above its right end: **gelernt / sitzen / angefangen** (e.g. „5 / 22 / 40“; gelernt in mint bold, sitzen in mint, angefangen in grey; gelernt and sitzen only once ≥ 1). Title „Wortschatz“ with the **collection name on its own line below** (13px, palette grey, cut with … when long). Legend in the bar's order: **gelernt · sitzt · angefangen**. No %, no notch, no detail page, not tappable. Until Wortschatz has been opened once, the card shows a hint instead of an empty bar.

| Layer | Meaning |
|---|---|
| Whole bar = all started words; grey where words don't sit yet | **angefangen** — words in the active set (`activeIds`) of the **active collection** |
| Mint, transparent (`--pg-sitzt` = the default mint at 65 %, both themes) | **sitzt** — level ≥ 3 = passed the 8-day review (≈ 9–10 days after starting) |
| Mint, on top | **gelernt** — level 6 = passed the 90-day review (≥ ≈ 164 days after starting) |

**Why this measure (decided 2026-09-26):** own collections grow and users can switch, so the collection size is not a useful end. Adding words to a collection never changes the bar; only „… lernen“ does. With fast learners (10 new words/day) the part that doesn't sit yet stays ≈ the last 9–10 days of new words, so the sitzt share still grows (≈ 36 % after 2 weeks, 70 % after 1 month, 85 % after 2 months without mistakes). A sudden dip in the sitzt share just means many words were started recently. The number of words still waiting in the collection is **not** shown here (it changes a lot and you can't act on it here — the Wortschatz screens show it).

**Collections:** the card always counts the collection in use. Switching to own words → the card shows that collection (from zero); „Delete · Back to Starter-Set“ → **Continue** brings back the Starter-Set numbers with its card levels, **Start Over** starts from zero. Nothing extra is stored for this. Today's daily points already earned are never taken away. Deleting a word removes it from the counts.

**Fully learned** = the word **passed the 90-day review**: 6 correct reviews in a row (steps 1 → 8 → 20 → 45 → 90 days, then the 90-day review answered correctly). Any mistake resets the word (existing SRS rule), so it leaves the sitzt / gelernt layers again. `LEARNED_LEVEL = 6`, `SITZT_LEVEL = 3` (`wortschatz/index.html`).

**Summary for Home** (`publishWortschatzProgress()`, written on open, on every save and after renaming the collection) into `deutschProgressV1 → exercises.wortschatz.summary`:
`{kind:"words", total, started, sitzt, learned, collection, sicher:learned, items:total, itemsSicher:learned, recent:[]}` — total = words in the active collection (kept for older readers, not shown), started = words in `activeIds` that are in the collection, sitzt = level ≥ 3, learned = level 6, collection = „Starter-Set“ or the own collection's name. Wortschatz is **excluded** from the grammar number and line (recognise it by `kind:"words"`).

**Daily history:** Wortschatz is **not** saved in `deutschProgressSnapshotsV1` any more (Home's `saveProgressSnapshot()` skips `kind:"words"`). It was saved only as a side effect, never shown, and after a switch it would have mixed two collections. Its real progress is backed up in `wortsternSRSv03` / `deutschWortschatzCollectionV1` / `deutschWortschatzDemoProgressV1`. Old Wortschatz entries in the history are ignored and drop out after 3 weeks.

Earlier (step 2.8): the bar was measured against the collection size („learned / started / total“). `$("desktopCheck")` fix from that step still applies.

---

## 8. Data storage — bounded, not infinite

Nothing grows forever:

| Data | Size |
|---|---|
| Per-item `streak` + `sicherSince` (all grammar exercises, Pronomen categories) | one small entry per item — grows only if exercise content grows |
| Daily snapshots | **rolling window: 22 days** (today + 21 back). Older days are deleted. |
| Pronomen session stats | already capped at 5 sessions (unchanged) |
| Wortschatz | existing SRS data only (level 6 added) |

**Snapshot pruning rule:** delete snapshots older than 21 days, **but always keep the newest snapshot that is 21 or more days old** — otherwise, after a long break (e.g. 30 days without opening the app), there would be nothing to compare against.

Rough size: 8 exercises × 22 days × a few numbers — a few KB at most.

---

## 9. Implementation notes

- **Where the data comes from:** Home doesn't load the exercises' data files, so it can't count totals itself. Each exercise publishes a small summary to a shared key (e.g. `deutschProgressV1`) after every answer: `{ total, sicher, recent: [{label, sicherSince}] }` per exercise. Home reads it for the screen and the snapshots — same pattern as `deutschHomeStatsV1` today.
- **Backup / Restore:** ✅ done (step 0) — all exercise keys plus the planned `deutschProgressV1` and `deutschProgressSnapshotsV1` are in `BACKUP_MODULES`; Restore skips outdated modules instead of failing.
- **Score conversions** (Modalverben, Partizip II 1–6 → 1–4): keep the storage key, add a format marker inside the data, convert once when the old format is detected. Never rename the key — old backups must stay restorable.
  - Implemented in Partizip II: marker `"__format": 2` inside `verbformenDifficultyV1`. Without it, every score is converted `1 + (old − 1) × 3/5`, rounded to 0.5, clamped to 1–4 (e.g. 6 → 4, 5.5 → 3.5, 4 → 3, 2.5 → 2, 1 → 1). Tested with the real backup: second load changes nothing.
  - **Cache:** hub links to changed exercises need a new `?v=` number, otherwise Safari may keep the old page (Fester Kasus: `kasus/index.html?v=9`, Partizip II: `partizipII/?v=2`).
- **Planned storage keys:** `deutschProgressV1` (per-item streak / sicherSince + per-exercise summary for Home), `deutschProgressSnapshotsV1` (daily snapshots, 22-day window).
- **Content changes:** adding new items to an exercise raises its total, so its % drops a little (shown in coral). Accepted — it's honest. Deleted items are ignored.
- **Build order:** start saving data first (streaks, `sicherSince`, snapshots) even before the screen exists, so real history is collecting.

### Progress helper (step 1)

File: `components/deutsch-progress-v1.js` (local folder: `deutsch components/`). API:

- `DeutschProgress.init(exercise, [{key, label}])` — on load, with **every** item of the exercise. Items with the same key count once — that's how groups work (Artikel: all -ung nouns report `rule:-UNG ENDING|die`). `init` also removes stored entries whose key no longer exists.
- `DeutschProgress.record(exercise, key, ok)` — after every answer.
- Items may carry a `weight` (default 1). `DeutschProgress.summary(exercise)` → `{total, sicher` (weighted, for the bar %)`, items, itemsSicher` (unweighted counts)`, updated, recent:[{l, d}]}` (recent = became sicher within the last 22 days, newest first).

Storage `deutschProgressV1`: `{format:1, exercises:{<id>:{items:{<key>:{s, d?}}, summary:{…}}}}`. Items never answered have no entry (= neu). Keys that are no longer in the exercise are ignored in the summary. Corrupt data → starts fresh instead of crashing. Exercises call it guarded, so they keep working if the file is missing.

Exercise ids: `artikel`, `festerKasus`, `ortspraepositionen`, `modalverben`, `partizipII`, `verbenMitPraepositionen`, `pronomen`.

### Decisions during the Artikel pilot

- Per-noun counting was too slow (238 nouns; ~1 sicher after 100 answers on the phone). A confirmation boost (+2 weight for streak 1–2) was tried and **dropped**; instead Artikel counts **per rule group** — you learn rules, not 238 separate nouns.
- `Artikel/words.js` cleaned (copy before: `words_before-cleanup.js`): duplicate "der Wein" / "der Kaffee" (BEVERAGE EXCEPTION) removed → 238 nouns; der Kaffee moved from "no rule" to Beverages; das Bier, der Junge, der Hase → `ruleType: exception`; "-E PATTERN" unified to `suffix`, "NOMINALIZED INFINITIVE" to `form`.
- Progress from the per-noun test phase is dropped automatically (old keys no longer exist).
- Counting rule groups equally was still skewed: big rules (-ung, 17 nouns) come up every session, tiny ones (Trees, 1 noun) and single nouns only every few sessions, yet each was 1/60. Phone test: 4 of 60 after 4 sessions at 90–100 % correct. Fix: the bar is **weighted by nouns covered**. Simulation at 40 answers/day, 95 % correct: per item 5 % → 26 % → 48 % → 72 % (day 1 / 3 / 7 / 21) vs. weighted 10 % → 48 % → 77 % → 84 %.

### Daily snapshots (step 3)

`Home/home.js` → `saveProgressSnapshot()`, called from `syncHomeDashboard()` (runs on load, focus, return from a module and every second — writes only when something changed).

- Storage `deutschProgressSnapshotsV1`: `{format:1, days:{"YYYY-MM-DD":{<exercise>:{t, s, i, is}}}}` — t/s = total/sicher (weighted, bar %), i/is = items/items sicher.
- Today's entry is overwritten on every change → last value of the day wins. Days without practice aren't stored; readers use the last earlier day.
- Pruning: days older than 21 days are deleted **except the newest of them** (baseline after a long break). Tested: after 30 days of daily practice 23 days are kept; after a 40-day break 2 days (the last old one + today).
- Size ≈ 60 bytes per exercise per day → ~11 KB with all 8 exercises.

### Progress screen (step 4)

File `Home/progress-screen.js` (loaded at the end of `Home/index.html`, after `home.js`). It injects its own CSS and a full-screen panel (`#progressScreen`, z-index 25) and makes the `.tile-today` tile tappable. Read-only: it never writes storage.

- **Baseline:** newest snapshot that is ≥ 21 days old. If none exists yet → "Seit Start", baseline 0 % (progress tracking started from zero), legend "Start".
- **Current values** come from the live summaries (`deutschProgressV1`), the history lines from the snapshots (carried forward over days without practice).
- **Exercise %** = sicher ÷ total (weighted). **Chapter %** = average of its exercises (an exercise never opened since the update counts as 0 % and shows "noch nicht geübt").
- **Grammar line** = Σ sicher ÷ Σ total across grammar exercises. **Big number** = number of "Neu gelernt" items across grammar exercises (Wortschatz excluded).
- **Encouraging line:** "Du wirst besser." when the grammar line is ≥ baseline; otherwise "Auf und Ab gehört zum Lernen." + "<Name>, du machst das gut." (name from `deutschProfileV1`, name first; no name → "Du machst das gut.").
- **Themes:** own tokens `--pg-ghost/-lost/-down/-started/-sheet/-line/-fill` for dark and `[data-theme="light"]`; everything else uses Home's existing tokens.
- Chapter drill-down, inline exercise detail, "+ N weitere" and the coral decline exactly as in the mockup.
- **Design pass after phone test (v6):** grammar summary and chapter bars share **one card** (thin divider between them); summary is compact — number 34 px, "Sachen / sitzen jetzt" 14 px, encouraging line **in the same row on the right** (13 px; the gentle version in three lines "Auf und Ab gehört / zum Lernen. / <Name>, du machst das gut."), line chart 40 px high, less top padding.
- **v17:** in a chapter, the title line gets the window colour + a soft fade at its bottom, so scrolled content no longer shows through behind the title. Overview unchanged. Copy before: `Home/progress-screen_before-head-bg.js`.
- **v16 (Design Police, 2026-09-26):** aligned with DECISIONS.md → *Fortschritt window*: card colour `#2A2A2D`, palette greys, 10% hairlines, × like the About window (full text colour again, replaces v14), ‹ in text colour, shared press effect, whole-pixel text sizes. **Decline is now palette grey instead of coral** (replaces the coral decline from the mockup). „vor 3 Wochen“ keeps its darker green. Copy before: `Home/progress-screen_before-design.js`.
- **v15:** soft mint glow in the pop-up background, like the "Heute" tile (`radial-gradient` 7 % mint), coming **from the bottom edge** (`--pg-glow-at: 50% 100%`; set to `50% 0%` for a glow from the top). Comparison image: `Claude outputs/glow-vergleich.png`.
- **v14:** × back at its earlier distance from the right edge (as in v10) and in the muted gray instead of full white/black.
- **v13:** background behind the pop-up is darkened and blurred with the same values as the Daily-limit confirmation (`--confirm-scrim` + `blur(8px)`), so the bright Home tiles no longer distract. Wortschatz row has more room again and its legend ("angefangen · gelernt", dots) is back. Chapter graphs unchanged: they appear from the 3rd day of history. Copy before: `Home/progress-screen_before-backdrop.js`.
- **v12 (option B from `Claude outputs/fortschritt-mockup-v3.html`):** the overview has **no line graph** anymore; the big number is back at 58 px ("Sachen / sitzen jetzt" 18 px). The encouraging line carries the overall grammar percentage in gray: "Du wirst besser. · 63 % gesamt" (gentle version: "Auf und Ab gehört zum Lernen. / Alena, du machst das gut. · 58 % gesamt"). Chapters stay a list (easiest to spot the weakest). **Wortschatz is a slim footer row** — name, "2 / 25 / 59" and the bar, no legend. Pop-up ≈ 440–460 px high (was ≈ 511). Chapter graphs are unchanged. Copy before: `Home/progress-screen_before-optionB.js`.
- **v11:** chapter view shows only "0 % → 12 %" under the title (no "vor 3 Wochen / heute" words, no "Verlauf" heading); the graph keeps only "Start"/"vor 3 Wo." and "heute" at the bottom (no % labels) and is **hidden until there are ≥ 3 days of history** (series of ≥ 4 points). An exercise opened inside Verbformen/Präpositionen shows its own "x % → y %" line above its graph. **"Neu gelernt" = the 3 newest items only**, no "+ N weitere". Header title in Home's font (SF, 19 px, bold) instead of Georgia. × sits evenly in the top-right corner (~24 px from top and right); "Seit Start" moved up level with it. Copy before: `Home/progress-screen_before-balance.js`.
- **v10:** no "Fortschritt" title — the × floats top right and the content starts at the top ("Seit Start" / "In 3 Wochen" level with the ×). In a chapter the header row shows "‹ <chapter>". Progress bars half as tall (5 px, exercise bars 4 px). **Fixed height:** on open the pop-up locks to the overview's height and keeps it for the whole visit — chapters never make it jump; longer ones scroll inside, shorter ones leave space at the bottom. Copy before: `Home/progress-screen_before-fixheight.js`.
- **Pop-up (v9):** the progress screen is a **centered pop-up in the same style as the Partizip II pattern table** — card max. 460 px wide, max. 82 % (phones 84 %) of the screen height, fades in from 92 % with a short blur, Home dims behind it. Header: title "Fortschritt" (Georgia, like the table) + × on the right; in a chapter the header shows "‹ <chapter name>" (tap ‹ to go back) and the first line reads "vor 3 Wochen x % → heute y %". Close: × · tap outside · Escape (no swipe, no handle). The blocks have **no borders** anymore: grammar and Wortschatz are sections separated by space and one faint line. Height check: iPhone 14 size — overview fits completely (529 px), a chapter with open details scrolls a little inside the pop-up (663 / 646 px); iPhone SE size — overview scrolls ~30 px. Copy of the bottom-sheet version: `Home/progress-screen_before-popup.js`.
- **Layout pass v8:** sheet top edge sits right below the Home header "Deutsch." (measured on open); handle and a plain ✕ (no circle) close to the top edge. **Grammar card first**, Wortschatz below. Grammar summary centred again: kick, green **+N** with "Sachen / sitzen jetzt", encouraging line below it, then the line chart. Chapter rows tighter. Legends **inside** the cards (grammar: under the chapters; Wortschatz: under its bar) with **small round dots**. Wortschatz card a bit taller, title 17 px. Copy before: `Home/progress-screen_before-layout2.js`.
- **Open / close = bottom sheet (v7):** the progress screen slides up from the bottom with its content already visible; Home stays visible, dimmed, behind it (small strip at the top on phones, both sides on desktop). The sheet is max. 430 px wide, rounded top corners, slightly lifted colour in dark mode (`--pg-bg`). **Close:** ✕ top right · tap the handle · tap the dimmed area · Escape · **swipe down** (on the header, or anywhere when scrolled to the top; follows the finger, closes past ~110 px or on a quick flick, otherwise springs back). No "‹ Home" link anymore. Drilling into a chapter still slides sideways inside the sheet. With *Reduce Motion* the sheet appears without sliding. The earlier "tile grows" animation was dropped (mostly an empty box on screen); copy of that version: `Home/progress-screen_before-sheet.js`.

### Build plan

Each exercise gets its scoring change **and** its progress hook in one pass (same code spot), then gets tested on the phone.

| Step | What | Status |
|---|---|---|
| 0 | Backup covers all exercises; Restore tolerant of outdated modules | ✅ done (`Home/index_before-backup-v2.html` = copy before) |
| 1 | Shared progress helper `components/deutsch-progress-v1.js` (streak, sicherSince, summary for Home) | ✅ built · browser-tested |
| 2.1 | Artikel — hook, counted per rule group, bar weighted by nouns (pilot) | ✅ confirmed on phone (7 % → 8 % → 12 % after single sessions, as expected) (copy before: `Artikel/index_before-progress.html`) |
| 3 | Home — daily snapshots + 22-day pruning (right after the pilot, so history starts early) | ✅ built · logic + browser-tested · to deploy (copy before: `Home/index_before-snapshots.html`) |
| 2.2 | Fester Kasus — hook only | ✅ built · browser-tested (8 of 34 sicher after 60 correct answers) · to test on phone (copy before: `praepositionen/kasus/index_before-progress.html`) |
| 2.3 | Partizip II — 1–6 → 1–4 (one-time conversion) + hook | ✅ built · browser-tested with the real backup scores · to test on phone (hub link now `partizipII/?v=2`; copy before: `verbformen/partizipII/index_before-progress.html`) |
| 2.4 | Modalverben — same as Partizip II, counted per verb + form | ✅ built · browser-tested with the real backup scores (2.5 → 2) · to test on phone (hub link now `modalverben/?v=2`; copy before: `verbformen/modalverben/index_before-progress.html`) |
| 2.5 | Ortspräpositionen — hook per rule category (card = all three lines right), weighted by places | ✅ built · browser-tested · to test on phone (hub link now `ortspraepositionen/index.html?v=5`; copy before: `praepositionen/ortspraepositionen/index_before-progress.html`) |
| 2.6 | Verben mit Präpositionen — one score per verb, new selection + hook | ✅ built · browser-tested with the real backup stats · to test on phone (hub link now `verben_mit_praepositionen/index.html?v=2`; copy before: `praepositionen/verben_mit_praepositionen/index_before-progress.html`) |
| 2.7 | Pronomen — 41 categories + hook, weighted by sentences; euer stem bug fixed | ✅ built · browser-tested · to test on phone (Home tile now `pronomen/?v=8` → upload Home too; copy before: `pronomen/index_before-progress.html`) |
| 2.8 | Wortschatz — level cap 5 → 6 + summary | ✅ built · browser-tested with the real backup · to test on phone (Home tile now `wortschatz/?v=2.2` → upload Home too; copy before: `wortschatz/index_before-progress.html`) |
| 4 | Progress screen (UI) — `Home/progress-screen.js`, opened by tapping the "Heute" tile | ✅ built · browser-tested (dark + light, 3-week and "Seit Start" cases, decline, never-practiced exercise) · to test on phone (copy before: `Home/index_before-progress-screen.html`) |
| 5 | Clean-up: temporary gray test lines removed from all 7 exercises; hub/tile links got new `?v=` numbers (Artikel 2.3, Pronomen 9, Fester Kasus 10, Verben mit Präp. 3, Ortspräp. 6, Partizip II 3, Modalverben 3) | ✅ done · browser-tested (progress still recorded) |

**Before deploying any step that converts scores: make a fresh Backup on the phone.**

---

## 9b. Language QA (exercise by exercise)

Reports: `Documentation/QA/`. Each fix pass keeps a `_before-qa` copy.

| # | Exercise | Status |
|---|---|---|
| 1 | Ortspräpositionen | ✅ fixes applied · browser-tested · to test on phone (hub link now `ortspraepositionen/index.html?v=10`; copies before: `…_before-qa.js/.html` and `…_before-qa2.js/.html`) · 74 cards · zu-hint built (page v7) |
| 2 | Partizip II | ✅ fixes applied · 77 verbs · browser-tested · to test on phone (hub link now `partizipII/?v=4`; copies before: `verbs_before-qa.js`, `index_before-qa.html`, `verbformen/index_before-qa.html`) |
| 3 | Präpositionen → Kasus | ✅ fixes applied · 32 cards · browser-tested · to test on phone (hub link now `kasus/index.html?v=11`; copies before: `praepositionen_before-qa.js`, `index_before-qa.html`, `praepositionen/index_before-qa-kasus.html`) |
| 4 | Verben mit Präpositionen | ✅ fixes applied · 61 cards · browser-tested · to test on phone (hub link now `verben_mit_praepositionen/index.html?v=4`; copies before: `…_before-qa.js`, `index_before-qa.html`, `praepositionen/index_before-qa-vmp.html`) |
| 5 | Modalverben | ✅ fixes applied · 124 sentences · browser-tested · to test on phone (hub link now `modalverben/?v=4`; copies before: `special_verbs_before-qa.js`, `index_before-qa.html`, `verbformen/index_before-qa-modal.html`) |
| 6 | Pronomen | ✅ fixes applied · 120 sentences (+12 reflexive) · browser-tested · to test on phone (Home tile now `pronomen/?v=10` → upload Home too; copies before: `pronouns_before-qa.js`, `index_before-qa.html`, `Home/index_before-qa-pronomen.html`) |
| 7 | Artikel | ✅ fixes applied · 251 nouns / 49 groups · browser-tested · to test on phone (Home tile now `artikel/?v=2.4` → upload Home too; copies before: `words_before-qa.js`, `index_before-qa.html`, `Home/index_before-qa-artikel.html`) |
| 8 | Home: Redewendungen + greetings | ✅ applied · 15 idioms, 2 greetings fixed · to test on phone (upload Home `index.html`, `phrases.js`, `greetings.js`) |
| 1b · 5b · 6b | **Balance check** Ortspräpositionen · Modalverben · Pronomen (`QA_01b`, `QA_05b`, `QA_06b`) | ✅ applied 2026-09-25 · browser-tested · to test on phone · **66 cards** (Orts, page v9, `ortspraepositionen.js?v=8`, hub `?v=14`, card `note` field for Toilette) · **144 sentences** (Modal, + Präsens, `special_verbs.js?v=4`, hub `modalverben/?v=6`) · **115 sentences** (Pronomen, `pronouns.js?v=4`, page v7.23) · Home tiles `pronomen/?v=12`, `verbformen/?v=2.3`, `praepositionen/?v=5` → upload Home, `verbformen/index.html`, `praepositionen/index.html` too · copies before: `…_before-balance.js/.html` |
| 6c | **Effectiveness check** Pronomen (`QA_06c`) — goal: memorise the table; traps → normal sentences, reflexive removed, 21 possessive contexts rewritten, rebalanced | ✅ applied 2026-09-25 · browser-tested · to test on phone · **103 sentences** (41 personal, 62 possessive), 41 categories · `pronouns.js?v=5`, page v7.24 · Home tile `pronomen/?v=13` → upload Home too · copies before: `…_before-effectiveness.js/.html` |
| 1c | **Effectiveness check** Ortspräpositionen (`QA_01c`) — 9/10; Land mit Artikel stays 3; new minimal **Tabelle** sheet (8 rows + immer in, Akk / Dat marking, red dot for groups with mistakes) | ✅ applied 2026-09-25 · browser-tested · to test on phone · page v10 · hub `ortspraepositionen/index.html?v=15` · Home tile `praepositionen/?v=6` → upload Home, `praepositionen/index.html` too · copies before: `…_before-table.html`, `…_before-orts-table.html` |
| 5c | **Effectiveness check** Modalverben (`QA_05c`) — 9/10; goal = Präsens · Präteritum · Konj. II + choosing Prät. vs Konj. II; not blown up | ✅ reviewed 2026-09-25 · no changes |
| 3c | **Effectiveness check** Fester Kasus — 9/10 (one decision per card, example as anchor, colloquial variants accepted in blue) | ✅ reviewed 2026-09-25 · no changes (table not wanted) |
| 2c | **Effectiveness check** Partizip II — as effective as it gets (typed recall, Vokalwechsel table, helper verb shown not tested — intended). `priority` field in verbs.js was unused (origin unknown, tags basic A1 verbs as 2) — removed 2026-09-27 (v55), together with the 6 unused modal verbs | ✅ reviewed 2026-09-25 · no changes |
| 4c | **Effectiveness check** Verben mit Präpositionen (`QA_04c`) — 9/10; −3 rare (schmecken nach, leiden unter, bestehen auf), +7 frequent (Lust haben auf, telefonieren mit, helfen bei, sich unterhalten mit/über, diskutieren über, achten auf) → 65 cards | ✅ applied 2026-09-25 · browser-tested · to test on phone · `verben_mit_praepositionen.js?v=4`, page v3.3 · hub `?v=6` · Home tile `praepositionen/?v=7` → upload Home, `praepositionen/index.html` too |
| 10 | Interface texts → German (settings stay English) | ✅ applied · 9 pages · copies before: `index_before-ui.html` |
| 9 | Wortschatz | ✅ one merged list (words.js 59 + words_FULL 171 → 217) · ids 1–30 kept · tested with real backup · to test on phone (Home tile now `wortschatz/?v=2.3` → upload Home too; copies before: `words_before-merge.js`, `index_before-merge.html`, `Home/index_before-qa-wortschatz.html`) |

---

## 10. Open questions

- ~~Wortschatz statistics with word collections~~ — **decided and built 2026-09-26**, see section 7.
