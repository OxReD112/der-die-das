# German Learning App — Decisions

## On-screen keyboard

**Status:** Implemented  
**Current component:** `deutsch-keyboard-v2.60.html`

The app uses a reusable custom on-screen keyboard component. The keyboard is loaded as a separate HTML component and can be embedded into learning modules.

### Implemented decisions

- The keyboard is displayed only on mobile screens (`<700px`).
- The keyboard is hidden on desktop screens (`≥700px`).
- The mobile interface prevents browser page zoom via double tap.
- Text selection on keyboard keys is disabled to prevent long-press selection.
- Pressed keys provide visual feedback.
- Letter keys show a temporary enlarged character popup on touch.
- A single touch produces only one keyboard input; duplicate touch/click handling is prevented.
- The keyboard uses a QWERTY layout with German characters.
- German special characters `ä`, `ö`, `ü` and `ß` are available directly.
- A dedicated Backspace key is available.
- A wide Space key is available for multi-word answers.
- Leading spaces and consecutive spaces are prevented.
- `✓` submits/checks the answer.
- The keyboard is hidden while answer feedback is displayed.
- The same reusable keyboard component can be embedded into learning modules.
- On mobile, the answer feedback supports a left swipe to continue to the next word.

### Current keyboard layout

```text
Q W E R T Y U I O P
 A S D F G H J K L
  ß Z X C V B N M   ⌫

ä  ö  ü       Space       ✓
```

### Integration

The reusable component emits keyboard input events. The host module is responsible for applying those events to its answer field and handling Backspace, Space, and Check behavior.

## Decision history

Important keyboard decisions are retained as project history. This section should be extended when an implemented keyboard behavior is deliberately changed.

### Current documented version

- Keyboard component: `deutsch-keyboard-v2.60.html`
- Verified integration: `Wortschatz` `index.html`, version `v2.60`

## Translations (ENG / RUS)

**Status:** Done — all modules translated (Pronomen, Artikel, Partizip II, Ortspräpositionen, Kasus, Verben mit Präpositionen, Modalverben, Phrase of the Week, Wortschatz)  
**Helper:** `components/deutsch-translation-v1.js` (local folder: `deutsch components/`)

- Setting: Home → Settings → **Your language** `ENG | RUS` (two-part pill, same size as the switches). Renamed from „Translations“ on 2026-09-26 (Home 5.36): it now also sets the language of the start-screen descriptions and the About text. Internal names (`deutschTranslationLangV1`, backup module `translations`) unchanged, so old backups still restore.
- Stored in `localStorage` key `deutschTranslationLangV1` (`"en"` or `"ru"`). Default: `"en"`.
- Included in Backup as module `translations` (always the current value, even if never changed). A backup that would contain only this setting still shows "No progress found".
- Only the translations change; the app interface stays as it is.

### Data rule for any translated field

- **Two languages** → object: `"translation": { "ru": "газета", "en": "newspaper" }` — the setting picks.
- **One language** → plain string: `"translation": "newspaper"` — always shown, whatever the setting.
- If the chosen language is missing, the other one is shown, so a field is never empty.
- Pages never read the field directly; they call `getTranslation(item, "translation")`.
- Built-in databases carry both languages. User-uploaded databases (planned) only need the plain string.

### English translation style

- British English (flat, centre, driving licence, colour), with US words added where they are just as common ("flat, apartment").
- Choose the closest real equivalent, not a word-for-word copy. Watch out for false friends: Gymnasium = academic secondary school, Marmelade = jam, Montage = assembly, Praktikum = internship.
- If two German words would get the same English, tell them apart: Erfahrung "experience, know-how" vs. Erlebnis "experience (an event)".
- Never give away the answer. No gender hints in Artikel (Lehrer and Lehrerin are both "teacher"); the learner has to connect the ending with the article.
  Exception: a short bracket that is needed for the meaning stays, even if it hints at the rule. Examples: "VW Golf (car)" (not everyone knows the brand, and das Golf is the sport), "Yamaha (motorbike)", "spring (season)".
- Verbs are written as "to …" (to begin). Modal verbs use the English modal: können "can, to be able to", müssen "must, to have to".
- Ortspräpositionen: the brackets tell apart which situation is meant (Supermarkt: inside / right outside / somewhere nearby), so they are translated too. The field is called `translation` (it used to be `ru`).
- Example sentences are translated into natural English, not word for word (seit drei Jahren → "for three years", das Auto von meinem Chef → "my boss's car"). Grammar terms stay German (Dativ, Genitiv), like in the rest of the app.
- Verben mit Präpositionen: the learner types the preposition after reading the meaning. Avoid the English twin of the answer ("with" for mit, "as" for als) only when an equally natural and accurate English phrase exists (sprechen mit → "to talk, to speak (to someone)"). Accuracy comes first: "to talk about" (über), "to recover from" (von), "to belong to" (zu), "to thank (for something)" (für), "to rely on", "to insist on" stay. Example sentences are shown after the answer and stay natural.
- Short forms: "sth" / "sb" (standard in English dictionaries), not "smth".
- Modalverben: keep the English modals apart so the translation points to the right German verb — können "could / was able to", müssen "had to" / müsste "ought to, would need to", dürfen "was allowed to" / dürfte "might I…?" or "probably", sollen "was supposed to" / sollte "should", wollen "wanted to", mögen "liked" / möchte "would like", werden "became / got" / würde "would". hätte … nicht müssen = "needn't have".
- Phrase of the Week: the literal line is translated word for word in English quotes (“I only understand train station.”) so the image survives; the meaning is written in plain English first (B1 level, no idioms), and an English idiom may follow only as a bonus after "≈" (≈ “It's all Greek to me”). Users may not have perfect English. The phrase updates right away when the language is switched in Settings.
- Wortschatz: fields `sentenceTranslation` (was `ru`), `translation` (word meaning) and `grammar` (only where it had Russian) are {ru, en}. Tomorrow's push notifications use the chosen language; the server field is still called `ru` (legacy name, no server change needed).
- Keep translations short enough to fit on one line on a phone (about 26 characters).

---

## Design consistency ("Design Police")

**Status:** Start screens, summary screens, chapter pickers, game top bar, question area, typing field, game buttons and feedback colours implemented — 2026-09-25 (all rounds done)  
**Backups:** `index_before-design.html` (before start screens), `index_before-summary.html` (before summary screens), `index_before-fonts.html` (before font fix), `index_before-pickers.html` (before chapter pickers), `index_before-topbar.html` (before top bar), `index_before-smoothing.html` (before font smoothing), `index_before-question.html` (before question area + typing field), `index_before-buttons.html` (before Weiter / Prüfen / table buttons), `index_before-feedback.html` (before feedback colours) next to each changed page

### Groups

- Three visual groups may use their own title fonts: **Artikel + Pronomen** (large faded name + bold question), **Verbformen** (serif name with a period), **Präpositionen** (bold sans name).
- Everything else is shared across all groups: colours, button shape, press effect, table button, version mark.

### Colour scheme

- All exercises use the Home screen palette.
- Dark: background `#1B1B1D`, text `#F2F0ED`, grey text `#8F8F94`.
- Light: background `#F6F4F1`, text `#242426`, grey text `#727278` (a bit darker than Home's for readability).
- Secondary text (table buttons, "Noch üben" box, detail chips): dark `#C8C7C4`, light `#55565B`.
- Filled buttons and cards: dark `#2A2A2D`, light `#FFFFFF`.
- Typing field: white 3% (dark) / `#FFFFFF` (light) with the shared 10% outline.
- Faint big titles (Der.Die.Das., Pronomen): white 11% (dark) / text colour 9% (light). Version mark: white 24% / text colour 34%.
- **Answer colours — exactly one of each per theme** (right/wrong feedback, glows, der/die/das, Home's completion glow):
  - Green: dark `#5BC8A4` · light `#3FA68A`
  - Red: dark `#FF7770` · light `#E95E66`
  - Blue: dark `#72A7FF` · light `#5588E0`
  Light shades are kept soft on purpose (≈3–3.5 : 1 on white: readable for bold/large text, not sharp).
- Glows and tints are made from these colours (transparent versions), never from their own shades.
- Nothing else. A new colour needs a decision first.
- Main button ("Zur Startseite"): dark `#ECE6DC` (cream) with background-coloured text `#1B1B1D`; light `#242426` with text `#F6F4F1`. "Prüfen" / "Weiter" inside the exercises use nearly the same cream today and will be aligned to this when the game screens are cleaned up.
- Outlines and hairlines: white 10% (dark) / black 10% (light).

### Fonts

- Exactly two font families: the **system font** (SF Pro on Apple devices; stack `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif`) and **Georgia** (Verbformen titles/score, Wortschatz headings).
- Buttons must always set their font explicitly. Otherwise browsers fall back to their own button font (Arial on desktop).
- Font smoothing is set once per page, on the page-wide `body`/`html` rule: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` — in both themes, on every page. It only affects Macs (thinner, crisper text; iPhones ignore it). Never set it on single elements; if one turns up, remove it.

### Start screens

- Round sizes are **10 / 20 / 30** in every exercise.
- Number buttons: 96 × 58, 16px corners, always on one row, filled, no stroke.
  - Dark: `#2A2A2D` with a faint top highlight and a soft shadow.
  - Light: white with a soft shadow, no outline (same logic as dark: lighter than the background, lifted by a shadow).
  - Verbformen keeps its own lighter number font.
- Press effect (all start-screen buttons): shrink to 97% and darken slightly (`brightness .94`), 0.12s. No hover effects.
  - **iPhone (2026-09-26, Home 5.44):** Safari only shows `:active` on pages that listen for touches. Home adds an empty passive `touchstart` listener to itself and to every exercise page it opens, so the press effect works everywhere on the iPhone. Doesn't affect scrolling, swiping or the keyboard. Pages opened on their own (not through Home) don't get it.
- Table button: one outlined pill style, 28px below the number buttons. Only in exercises that have a table.
- Artikel has no card and sits at the same height as Pronomen. Verben mit Präpositionen uses the Fester Kasus headline size (36px) and height. Ortspräpositionen keeps its screen-width scaling for the long title.
- Explainer lines under the question are unchanged (to be redesigned separately).
- The CSS lives in a block marked `START SCREEN · shared design` at the end of each page's `<style>`.
- **Description „Worum geht's?“ (done, 2026-09-26 — all seven grammar exercises):** at the bottom of the start screen, centred above the Home button and version mark (`bottom: safe-area + 64px`), **exactly as wide as the 10/20/30 row (312px)**. Headline „Worum geht's?“ in German, 13px semibold; the text below (13px) **in the user's language** (Settings → Translations, EN/RU) — it's an explanation like a hint, and understanding it matters more than German-only (same reason as the Settings menu). One block only (German + translation was too much text). Palette grey (darkest text colour) so it blends in. RU/EN texts in a small `START_ABOUT` object in the page's script. Hidden during the game. CSS block `START SCREEN · description`. Texts are drafted one exercise at a time: short, what it trains + why it helps, not over-promising. Done: **Artikel** (v24), **Modalverben** (v12, no extra subline: in Verbformen the small grey question „Wie viele Sätze?“ already is the subline; Verbformen picker v9), **Fester Kasus** (v18; Präpositionen picker v9), **Verben mit Präpositionen** (v3.12; picker v12; its instruction line „Schreib die Präposition, dann wähle den Kasus.“ stays — it says what to type), **Ortspräpositionen** (v20; picker v11; table button renamed „Tabelle“ → „Orte · Tabelle“ like the other „… · Tabelle“ buttons), **Partizip II** (v54; Verbformen picker v10; the description fades out while the Vokalwechsel table is open, like the version mark — the blur can't reach it there), **Pronomen** (v7.38 — example pairs kept on one line with non-breaking spaces `\u00a0`). **Sublines under the question stay** (e.g. „Personal- und Possessivpronomen gemischt.“) — a short informative line there is nicer and useful; Artikel: „Wähle eine Runde.“ → **„Endungen, Gruppen und Ausnahmen.“** (with *und*, so the three words don't read as labels for the three buttons). Sublines stay short — not longer than the question above. Only where the screen has a big question (Artikel, Pronomen); Verbformen pages get none. Tone: always „helps“ — never promise that you *will* learn; natural and spoken, not textbook („This exercise helps you…“ sounds formal); every sentence needs a clear subject. Examples in a description are marked as examples („prepositions like mit, für or wegen“), so they don't read as the complete list. Dashes in descriptions: a plain hyphen with spaces („ - “), the way people actually type — not the long dash.

### Summary screens

- Every exercise ends with the same two buttons: **Noch eine Runde** (quiet: transparent, 10% outline, text at 55%) and **Zur Startseite** (main button). Style taken from Ortspräpositionen: 56px high, 17px corners, 16px bold text, max 360px wide, 10px apart. Same press effect as the start screens.
- Wortschatz: **5 neue Wörter lernen** (until v2.96: „+ 5 neue Wörter“) uses the "Noch eine Runde" style, followed by **Zur Startseite**. Layout: see *Wortschatz · done screen v2*.
- Artikel looks like Pronomen: no card, faded "Der.Die.Das." on top, "Fertig.", score as `7 / 10`, sentence in Pronomen's size and grey.
- Font sizes per group: Verbformen follows Partizip II (score 34px serif); Präpositionen follow Verben mit Präpositionen ("Fertig." 58px, score 34px bold, sentence 16px).
- The information shown on each summary screen stays as it is; it may differ between exercises.
- The CSS lives in a block marked `SUMMARY SCREEN · shared buttons` at the end of each page's `<style>`.

### Chapter pickers (Verbformen, Präpositionen)

- Same palette; the title uses the full text colour.
- Cards follow the button rule: filled (`#2A2A2D` / white), soft shadow, no outline; same press effect.
- "Was möchtest du üben?" 16px. Subtitles and arrows use the palette grey.
- Titles: "Verbformen." (with period, like its exercises), "Präpositionen" (no period, like its exercises).

### Game top bar (title, counter, progress line)

- Position everywhere = Partizip II: title and counter centred 33.5px from the top of the page, progress line at 55px, 18px side margins. Wortschatz keeps its own position (bigger Georgia title).
- Title: palette grey. Artikel, Pronomen and Präpositionen: 18px bold sans (Pronomen's size). Verbformen: Georgia 20px. Wortschatz: Georgia 26px.
- Counter: 14px, palette grey. Wortschatz says `x / y heute` (its round size is set automatically, not chosen).
- Progress line: 3px, track = shared hairline (white 10% / black 10%), fill = palette grey. **Green is reserved for "correct"** and is not used for progress.
- The CSS lives in blocks marked `TOP BAR · shared design` and `Top bar position = Partizip II` at the end of each page's `<style>`.

### Question area (game)

- **Word cards** only where one single word is shown: Artikel and Fester Kasus (the flash-card feeling). Style "lifted": filled `#2A2A2D` / white, no outline, shadow dark `inset 0 1px 0 rgba(255,255,255,.06), 0 18px 40px rgba(0,0,0,.30)`, light `0 2px 4px rgba(0,0,0,.04), 0 14px 34px rgba(0,0,0,.09)`, 26px corners. Position and height = Artikel: 26px below the top bar, 360px high (Fester Kasus's answer card too, so nothing jumps).
- **Text sizes on phones:** single word 56px (Fester Kasus, Partizip II); Artikel's word stays 48px (long words); sentences 28px (Wortschatz, Pronomen, Modalverben, Verben mit Präpositionen, Ortspräpositionen' word). Each group keeps its font and weight.
- Präpositionen may show German words in **Georgia** (Fester Kasus, Ortspräpositionen).
- **Hint line** above and **translation** below: 16px, palette grey.
- **Verben mit Präpositionen (phone):** the question starts 69px below the top bar's line (= Ortspräpositionen). Measured once per round in `placeQuestion()`; handle with care. *Until 2026-09-27 the keyboard was lifted by the same amount; since Home 5.95 it sits above the Home button like in every keyboard exercise (see „Keyboard above the Home button“).*

### Answer buttons (game)

- One shape for der/die/das, Akkusativ/Dativ/Genitiv and the Ortspräpositionen choices: 56px high, 14px corners, filled palette surface, soft shadow (same as the start-screen buttons), no outline, shared press effect, no hover.
- der/die/das keep their colours (blue/red/green) and bold 22px text.
- Präpositionen button text: regular 17px, palette text colour (so it doesn't shout next to the Georgia words).

### Typing field

- One field (Pronomen look) in Wortschatz, Pronomen, Modalverben, Partizip II: 58px, 18px corners, shared outline, typed text 24px in the group's font (Georgia in Verbformen). Never green. Widths stay as each exercise's layout gives them.
- Empty field: a **blinking cursor** in the middle is the only hint. Verben mit Präpositionen shows the same blinking cursor inside the empty blank "___" (phone and desktop).

### Game buttons

- **Weiter** = the quiet button (blueprint: Partizip II). It doesn't urge you on — you read the answer first. Same surface + outline as the typing field (white 3% + 10% outline / white + 10% outline), full text colour, 56px, 17px corners, 16px semibold, shared press effect, no hover. As wide as each exercise's answer area; **Wortschatz: half as wide, centred**.
- **Prüfen** (desktop only; on phones the ✓ key does it) = the one strong button: main-button colours (`#ECE6DC` + `#1B1B1D` / `#242426` + `#F6F4F1`), shape of "Zur Startseite" (56px, 17px corners, 16px bold).
- **In-game table buttons** ("… · Tabelle") = the start-screen pill, **≈12% smaller** (12.5px, 35px high, 15px corners, 10% outline, secondary text), **centred in the Home button's row** (`bottom: safe area + 16px` → centred 33.5px up, like the Home button). There if needed, but not inviting. Since Home 5.95 (2026-09-27); before: 14px / 40px, 28px above the bottom edge. Short screens: follows the content (static), unchanged.

### Feedback (answer screens)

- The exercises may differ here ("cousins, not siblings") — different layouts are fine; colours and fonts follow the palette.
- All explanation greys are palette greys (grey text / secondary text); Artikel's feedback card uses the card colour `#2A2A2D`.
- Light-mode glows stay, kept subtle.
- Artikel: headline "✓ Richtig" / "✕ Nicht ganz" — 20px, centred (like the line under it), no exclamation mark, in green / red.
- Nothing may be wider than the screen (Wortschatz's glow was 110% wide → capped at 100%).

### Table windows

- Every table opens the same way, like Home's Settings dialog: the page behind is **blurred 8px and darkened** — 34% black in dark mode, 20% in light mode. The blur fades in and out together with the darkening.
- The window itself: palette card colour (`#2A2A2D` dark / `#FFF` light), shared 10% outline, 24px corners, same short fade + zoom-in when opening.
- Applies to Pronomen, Modalverben, Partizip II and Ortspräpositionen (the exercises with tables). Tapping outside or Esc closes it.
- Partizip II start screen: the version number fades out while a table is open (the blur can't reach it).

### Home tiles + Heute card

- Exercise tiles and the Heute card get the same lift as the buttons: soft shadow under the card (dark `0 5px 14px rgba(0,0,0,.14)`, light `0 1px 2px rgba(0,0,0,.05), 0 5px 14px rgba(0,0,0,.08)`), a thin light line along the top edge in dark mode (drawn on top of the picture), no outline.
- Exercise tiles use the card colour: `#2A2A2D` dark / `#FFFFFF` light.
- **Icons:** the pictures are solid (no transparency), so their background must be exactly the tile colour at the edges — `#2A2A2D` for `icon.webp`, `#FFFFFF` for `icon_light.webp`. Glow and blur inside the picture are fine. *(To do: re-export the icons.)*
- The Heute card keeps its own background (close to the page colour) and its green glow.
- The tile strip and the Home/phrase slider got extra room at the sides so the shadows aren't cut off; nothing moved.

### About window (Settings → About)

- **2026-09-26:** last row in Settings: **About** (same quiet row style as Backup / Restore). Opens a window built **exactly like the table windows** (blur 8px + 34% / 20% darkening, card colour, 10% outline, 24px corners, fade + zoom-in), title „About“ + **×** top right (no OK button — nothing to confirm); tap outside or Esc closes. Text 15px palette grey, follows Settings → Translations:
  - EN: *Some German grammar you can understand. Some you just have to remember - der, die or das, ihr or Ihnen, am or im. This app is made for exactly those parts. Short daily rounds help them stick.*
  - RU: *Часть немецкой грамматики можно понять. А часть приходится просто запомнить - der, die или das, ihr или Ihnen, am или im. Именно для этого и создано приложение. Короткие ежедневные раунды помогают всё закрепить.*
- Wortschatz is not mentioned on purpose (still in progress).
- The „Are you sure?“ (Daily limit) window is now aligned too — see *Settings* below (Home 5.39).
- Example groups glued with non-breaking spaces so they never split across lines. Home 5.35.

### Version numbers

- Every page shows a short version (e.g. `v11`), 11px, centred at the bottom (28px above the bottom edge; the round ⌂ that used to sit level with it is gone since Home 5.43) — **only on start and summary screens**, never during the exercise (less clutter). Wortschatz: on its start screen and on "Fertig für heute" (since v2.85).
- **Rule:** every change to a page raises that page's version number.
- **Rule:** the link that opens a changed page gets a new refresh number too (`?v=` on the Home tiles in `Home/index.html` and on the choices in the chapter pickers), so phones load the new page instead of a cached one.
- After round 1: Artikel v11, Pronomen v7.25, Modalverben v1, Partizip II v44, Fester Kasus v10, Ortspräpositionen v11, Verben mit Präpositionen v3.4.
- After round 2: Artikel v12, Pronomen v7.26, Modalverben v2, Partizip II v45, Fester Kasus v11, Ortspräpositionen v12, Verben mit Präpositionen v3.5, Wortschatz v2.73.
- Font fix: Pronomen v7.27, Modalverben v3, Partizip II v46.
- Chapter pickers: Verbformen v1, Präpositionen v1. Palette clean-up: Modalverben v4, Partizip II v47, Pronomen v7.28, Verben mit Präpositionen v3.6. Home 5.21 (new refresh numbers on all tiles).
- Top bar: Artikel v13, Wortschatz v2.74, Pronomen v7.29, Modalverben v5, Partizip II v48, Fester Kasus v12, Ortspräpositionen v13, Verben mit Präpositionen v3.7, Verbformen picker v2, Präpositionen picker v2, Home 5.22.
- Font smoothing everywhere: Home 5.23, Artikel v14, Wortschatz v2.75, Pronomen v7.30, Modalverben v6, Partizip II v49, Fester Kasus v13, Ortspräpositionen v14, Verben mit Präpositionen v3.8, Verbformen picker v3, Präpositionen picker v3.
- Question area + typing field: Artikel v15, Wortschatz v2.76, Pronomen v7.31, Modalverben v7, Partizip II v50, Fester Kasus v14, Ortspräpositionen v15, Verben mit Präpositionen v3.9, Verbformen picker v4, Präpositionen picker v4, Home 5.24.
- Game buttons + no version in the game: Artikel v16, Wortschatz v2.77, Pronomen v7.32, Modalverben v8, Partizip II v51, Fester Kasus v15, Ortspräpositionen v16, Verben mit Präpositionen v3.10, Verbformen picker v5, Präpositionen picker v5, Home 5.25.
- Feedback colours: Artikel v17, Wortschatz v2.78, Pronomen v7.33, Modalverben v9, Partizip II v52, Fester Kasus v16, Ortspräpositionen v17, Verben mit Präpositionen v3.11, Verbformen picker v6, Präpositionen picker v6, Home 5.26.
- Table windows: Pronomen v7.34, Modalverben v10, Partizip II v53, Ortspräpositionen v18, Verbformen picker v7, Präpositionen picker v7, Home 5.27.
- Home tiles + Heute lift: Home 5.28.
- Home screen clean-up: Home 5.37.
- Phrase screen clean-up: Home 5.38.
- Settings clean-up: Home 5.39.
- Fortschritt window clean-up: Home 5.40, `progress-screen.js?v=16`.
- Fortschritt title line background: Home 5.41, `progress-screen.js?v=17`.
- Pause screen: Home 5.42.
- Back button top left (replaces the ⌂): Home 5.43. No exercise page changed.
- Round Home button + open / close animation (replaces the ‹): Home 5.84 (`home.css?v=2`, `home.js?v=2`). No exercise page changed.
- Smoother open / close animation (card + fades instead of clip mask + filter, no waiting): Home 5.85 (`home.css?v=3`, `home.js?v=3`).
- Simple zoom instead of the grow / fold animation: Home 5.86 (`home.css?v=4`, `home.js?v=4`).
- Zoom tuned (background fades, tile settles from 103 %, zoom starts when the page can be drawn): Home 5.87 (`home.js?v=5`).
- Closing: tidy up behind the cover, Home settles back in (replaces the tile settle): Home 5.88 (`home.js?v=6`).
- Closing as one crossfade, Home grows 97 → 100 %, unload afterwards: Home 5.89 (`home.js?v=7`).
- Home button in one fixed bottom row, version number to the right: Home 5.90 (`home.css?v=5`, `home.js?v=8`).
- Solid Home button, Home steps back at the tap: Home 5.91 (`home.css?v=6`, `home.js?v=9`).
- Home's own windows darken the bottom strip; Settings link part of the page: Home 5.92 (`home.css?v=7`, `home.js?v=10`).
- Press effect on iPhone: Home 5.44 (see Start screens → Press effect).
- Ortspräpositionen table v2: Ortspräpositionen v21 (picker link `?v=25`), Präpositionen picker v13, Home 5.45 (tile `praepositionen/?v=20`).
- Mistake marker instead of red dots: Ortspräpositionen v22 (picker link `?v=26`), Präpositionen picker v14, Home 5.46 (tile `praepositionen/?v=21`).
- Wortschatz start screen: Wortschatz v2.85, Home 5.47 (tile `wortschatz/?v=2.17`).
- Wortschatz own collections, storage (no visible change): Wortschatz v2.86, Home 5.48 (tile `wortschatz/?v=2.18`).
- Wortschatz collection window: Wortschatz v2.87, Home 5.49 (tile `wortschatz/?v=2.19`).
- Wortschatz word form: Wortschatz v2.88, Home 5.50 (tile `wortschatz/?v=2.20`).
- Wortschatz ✎ on the answer screen: Wortschatz v2.89, Home 5.51 (tile `wortschatz/?v=2.21`).
- Wortschatz import: Wortschatz v2.90, Home 5.52 (tile `wortschatz/?v=2.22`).
- Wortschatz collection screens in English: Wortschatz v2.91, Home 5.53 (tile `wortschatz/?v=2.23`).
- Wortschatz new words running out: Wortschatz v2.92, Home 5.54 (tile `wortschatz/?v=2.24`).
- Wortschatz start screen v2 + Starter-Set: Wortschatz v2.93, Home 5.55 (tile `wortschatz/?v=2.25`).
- Wortschatz collection windows v2 (list below, actions on top): Wortschatz v2.94 → v2.95, Home 5.56 → 5.57 (tile `wortschatz/?v=2.27`).
- Wortschatz start screen balance: Wortschatz v2.96, Home 5.58 (tile `wortschatz/?v=2.28`).
- Wortschatz done screen v2 + „… lernen“: Wortschatz v2.97, Home 5.59 (tile `wortschatz/?v=2.29`).
- Wortschatz done screen compact + „Fertig / für heute.“: Wortschatz v2.98, Home 5.60 (tile `wortschatz/?v=2.30`).
- Wortschatz red note + two-line collection + Heute above the buttons: Wortschatz v2.99, Home 5.61 (tile `wortschatz/?v=2.31`).
- Wortschatz collection window fixes (‹ back, Save at the end, safe margins): Wortschatz v2.100, Home 5.62 (tile `wortschatz/?v=2.32`).
- Wortschatz Starter-Set window fold-out: Wortschatz v2.101, Home 5.63 (tile `wortschatz/?v=2.33`).
- Wortschatz „15 / 217 Wörter angefangen“, no „Heute“ line: Wortschatz v2.102, Home 5.64 (tile `wortschatz/?v=2.34`).
- Wortschatz hint wording „added to the end of your list“: Wortschatz v2.103, Home 5.65 (tile `wortschatz/?v=2.35`).
- Wortschatz Add Word + Import List side by side: Wortschatz v2.104, Home 5.66 (tile `wortschatz/?v=2.36`).
- Wortschatz „Worum geht's?“ folded (exception): Wortschatz v2.105, Home 5.67 (tile `wortschatz/?v=2.37`).

### Home screen (2026-09-26, Home 5.37)

Scope: the Home screen only. Phrase screen, Settings, the Fortschritt window (opened from Heute) and the ⌂ button over the exercises get their own rounds.

- **Palette only.** Home's own greys are replaced: greeting line 2 and the "Settings" link → palette grey; "Heute" label → secondary text (`#C8C7C4` / `#55565B`); points number → text colour; "Redewendung der Woche" label + literal line on the Home row → palette grey.
- **Light-mode grey** on Home is now `#727278`, the same as the exercises (was `#86868B`). This is the shared `--muted` value, so the other screens on the Home page (Settings, phrase screen, Fortschritt) use it too.
- **Hairlines 10%:** Heute progress track, page dots, page-arrow outline.
- **Heute progress bar** stays green: it is the palette green (`#5BC8A4` / `#3FA68A`), part of the Heute card's own look.
- **Press effect** = shared rule (97% + `brightness .94`, 0.12s) on the exercise tiles, the Heute card, the phrase row and the "Settings" link. No hover effects: the page arrows no longer change colour on hover (they still appear when the mouse is over the tiles; that's how they're found on desktop).
- **Tiles: no invisible frame.** The old outline was transparent but still 1px wide, so glow, tint and picture stopped 1px before the edge and showed a ring. Tiles and the Heute card now have `border: 0`.
- **Tint under the tile text** fades to the tile colour (`#2A2A2D` / white), not the page colour (that made a dark / beige band at the bottom).
- **Wortschatz glow** sits under the text (still over the picture).
- Test placeholder tiles removed. With one tile page the dots are hidden but keep their room, so nothing moves when a second page is added.
- Font list on the page = the rule's list (no "SF Pro Text", no Arial).
- CSS block `HOME SCREEN · Design Police clean-up` at the end of `<style>`. Copy before: `Home/index_before-home-design.html`.
- Still open: icon re-export (see Home tiles); ⌂ button (separate discussion).

### Phrase screen — Redewendung der Woche (2026-09-26, Home 5.38)

- **Position:** the block (label down to the ‹ button) sits **slightly above the middle — 45 / 55** — of the free space between the "Deutsch." title and the "Settings" link, for short and long phrases, on every screen size. If a phrase is ever taller than the space, the block starts at the top and the page scrolls.
- **Bug fixed:** the old top padding added the notch/status-bar area a second time (it is already in the page padding), so on iPhones the block sat 45–60px too low (about 70% down instead of the middle); on an iPhone SE it touched "Settings". The bottom padding counted the home-indicator area twice as well.
- Desktop (≥650px): the page was 20px taller than the window and scrolled a little; fixed (also on the Home screen).
- **Colours → palette:** meaning line = secondary text (`#C8C7C4` / `#55565B`) — it's the explanation in the user's language, so it's the easiest to read after the title. Label, literal line and German example = palette grey.
- "REDEWENDUNG DER WOCHE" stays in capitals (this feature's own look), on the Home row too.
- **‹ button:** 10% outline, arrow in the text colour (like the › on the Home row), shared press effect, full font list. Shape (round) stays. The ⌂ button over the exercises is a separate discussion.
- CSS block `PHRASE SCREEN · Design Police clean-up` at the end of `<style>`. Copy before: `Home/index_before-phrase-screen.html`.

### Settings (2026-09-26, Home 5.39)

- **Green outside the exercises** means "enabled" or "your progress / success". So switches that are on, the chosen language (ENG/RUS) and the typed name stay **green**. Inside the exercises green still means only "correct".
- **Labels in Title Case:** Backup, Restore, Name, Your Language, Light Theme, Daily Limit, Notifications, About. Why: many users aren't native English speakers, and a lowercase "l" looks like a capital "I" in this font. Questions stay sentence case („Are you sure?“); the "optional" hint in the name field stays lowercase.
- **Colours → palette:** row labels = secondary text; small notes and the "optional" hint = palette grey; text on the green ENG/RUS part = page colour (like the main button's text).
- **Order stays:** Backup + Restore first on purpose. Progress lives in the browser storage and is easy to lose (especially in Safari without installing the web app), so users should back up often.
- **Spacing:** rows 48px. Groups (Backup/Restore · settings · About) are separated by a 28px gap with a 10% hairline in the middle (14px above and below). First row 22px under the „Settings“ title. An empty notification note no longer pushes About down.
- **×** = the About window's × (text colour, regular weight). Rows and × get the shared press effect.
- **Version line:** 11px, white 24% / text 34% (the version-mark rule); position unchanged (left, under the list).
- **„Are you sure?“ window** is built like the table windows: card colour, 10% outline, 24px corners, fade + zoom-in, tap outside or Esc = No. **No = the contrast button** (main-button colours: cream `#ECE6DC` + `#1B1B1D` / `#242426` + `#F6F4F1`) because we'd rather the user keeps the limit; **Yes = the quiet button** (transparent, 10% outline, text 55%). Both: 56px, 17px corners, 16px bold. Text: British "practising", no forced line break, "automatically tomorrow" kept together.
- Font list = the rule's list everywhere in Settings, About and the confirm window.
- CSS block `SETTINGS · Design Police clean-up` at the end of `<style>`. Copy before: `Home/index_before-settings-design.html`.

### Fortschritt window (2026-09-26, Home 5.40 · progress-screen.js ?v=16)

- Window = table-window rule: dark background now the card colour `#2A2A2D` (was `#252527`). Title 20px semibold (like About). × = the About ×. ‹ back arrow in the text colour (not green: it's navigation, not progress). ×, ‹ and the chapter/exercise rows get the shared press effect. Font list = the rule's list.
- **Green = progress** (outside the exercises): the big „+21“, the „dazu“ / „gelernt“ parts of the bars, the graph line and the soft glow at the bottom stay palette green. The area under the graph = palette green, see-through (8% dark / 10% light).
- **„vor 3 Wochen“** part of the bars keeps its own darker green (`#2C5A4E` / `#B7DCCF`) — allowed on purpose, it has to be darker than „dazu“.
- **Going down = palette grey, not red** (calm, no judging — „Auf und Ab gehört zum Lernen“): „−5%“, „26% → 21%“ and the lost part of the bar (grey at 55%).
- Greys → palette: legend, chevrons, „noch nicht geübt“, graph labels, bottom hint = palette grey; „Du wirst besser.“ and the started-words number = secondary text; Wortschatz „angefangen“ bar = palette grey at 55% (full grey was too heavy in light mode).
- Hairlines (dividers, list lines, bar tracks) = 10%.
- Text sizes rounded to whole pixels (14.5→15, 12.5→13, 11.5→12, 10.5→11).
- **Title line in a chapter** (‹ Präpositionen ×) has the window colour behind it with a soft 12px fade at the bottom, so scrolled content disappears behind it instead of showing through (v17). Not on the overview (it would hide „In 3 Wochen“). Copies before: `Home/progress-screen_before-head-bg.js`, `Home/index_before-head-bg.html`.
- Copies before: `Home/progress-screen_before-design.js`, `Home/index_before-progress-design.html`.

### Pause screen — daily limit reached (2026-09-26, Home 5.42)

- „Das hast du heute richtig gut gemacht.“ screen on Home. Colours were already palette (title + „Ich freue mich auf dich.“ = text colour, rest = palette grey).
- **Position = phrase screen rule:** slightly above the middle (45 / 55) of the free space between „Deutsch.“ and „Settings“, on every screen size (before: fixed distance from the top, sat low on small phones).
- Title weight **700** like the „Fertig.“ titles (was 800, the only 800 in the app). Size unchanged (24px phone, up to 32px wide screens).
- „gut gemacht.“ kept together (non-breaking space), so the title always breaks as „… richtig / gut gemacht.“
- „Settings“ stays reachable underneath (that's where the daily limit is switched off). Copy before: `Home/index_before-pause-screen.html`.

### Back button — top left (2026-09-26, Home 5.43) · **replaced in Home 5.84** by the round Home button (see *Home button + open / close animation — final*)

Replaces the round ⌂ at the bottom left (it looked out of place, was easy to overlook — that's why „Zur Startseite“ was added to the summary screens — and it sat on top of the Ortspräpositionen table on small iPhones).

- **Place:** top left, always on screen (except while a table window is open). Left because leaving a place = left (iPhone „back“, learning apps); **× on the right stays reserved for closing windows**, and the right side of the game top bar belongs to the counter.
- **Look:** a drawn „‹“ + label, palette grey, 15px medium, no circle, no outline; 44px tap height; shared press effect.
- **Label** = where it leads (iPhone pattern; a bare symbol in an empty corner looked like a mistake):
  - start / picker / summary screens: **„‹ Deutsch.“**, or in a chapter exercise **„‹ Verbformen.“** / **„‹ Präpositionen“** (titles spelled as in the app);
  - game: only **„‹“**, right in front of the top-bar title (same height, title text 20px to its right) — like „‹ Präpositionen“ in the Fortschritt window.
- **Goes one step up:** chapter exercise (Partizip II, Modalverben, Fester Kasus, Ortspräpositionen, Verben mit Präpositionen) → its picker; picker or single exercise (Artikel, Pronomen, Wortschatz) → Home. „Zur Startseite“ on the summary screens still goes straight Home. *To be tested for a few days: is the extra picker step annoying?*
- **Table windows:** the button fades out together with the window and comes back when it closes (Pronomen, Partizip II, Modalverben, Ortspräpositionen).
- **How it works:** all in `Home/index.html` (block „Back button“ in the script, CSS block `BACK BUTTON · top left`). Home reads the open exercise page (same site): its path decides label + target; a visible top-bar title (`.top-title`, `.top .brand`) means „game“ and the button is placed in front of it; a visible `.modal / .pattern-modal / .forms-modal / .omodal` means „window open“. Home adds one style to the exercise page (`.top-title,.top .brand{padding-left:20px}`) to make room for the „‹“. **The exercise pages were not changed** (no new versions / refresh numbers). A new exercise with a table window must use one of these window class names (or be added to the list).
- Desktop (≥529px): label sits at the left edge of the 480px exercise column.
- Ortspräpositionen table on small iPhones: nothing covers it any more; its last line („immer in: …“) is reached by scrolling inside the window.
- Copy before: `Home/index_before-back-button.html`.

### Ortspräpositionen table — v2 (2026-09-26, Ortspräpositionen v21)

Goal: take it in as **one picture** (easier to memorise a pattern); before, rows were tall and too much was going on.

- **Each row = one reading line:** two example words + Wo · Wohin · Woher on the same text line („Berlin, Japan · in · nach · aus“). The category sits on its own small grey line underneath, full width, so it never wraps.
- **Examples instead of big single words:** two examples per row, **no articles** (cleaner), except a country that needs one („die Schweiz“). Examples in Georgia 16px; category 12.5px palette grey. Examples stay because the category names alone are hard to understand.
- **Kino + Schweiz share one row** (same pattern in · in · aus): „Kino, die Schweiz / Raum · Land mit Artikel“.
- Rows: Kino, die Schweiz · Berlin, Japan (Stadt, Land ohne Artikel) · See, Tisch · Markt, Balkon · Arzt, Arbeit (Person, Firma, Aktivität) · Bahnhof, Kasse (am Ort) · Hause (zu Hause). „immer in: Wald · Park · …“ footer unchanged.
- **„Dativ“ under nach / zu** hangs below the word without lifting it — all prepositions sit on one line. Column headings unchanged (Wo? Dativ · Wohin? Akk / Dat · Woher? Dativ). Tried „+D“ next to the word: rejected (busier).
- **Same space left and right:** the Woher column ends at the window padding (19px, like the left side).
- Tighter rows: fits without scrolling on small (375×667), regular and large iPhones. Only a 320px phone scrolls a little; there the examples may wrap. When the mistake note („hier gab es zuletzt Fehler“) is shown, a small iPhone may scroll a few pixels.
- **Recent mistakes (v22, replaces the red dots):** a faint highlighter stroke in palette red, **under** the text, on the **category only** — and in the merged row only on the part with mistakes („Land mit Artikel“, not „Raum“); „immer in:“ is marked the same way. Nothing moves. The explanation („markiert = zuletzt Fehler“) sits in the empty top-left header cell and only shows when something is marked. Strength = one CSS number per theme, `--mark-strength` (15% dark / 12% light) in the block `MISTAKE MARKER v22` — *to be tuned after the phone test*. Same data as before: marked while a category has words with open mistakes. Copies before: `index_before-marker.html` (Ortspräpositionen, picker, Home).
- Code: `TABLE_ROWS` (fields `cats`, `ex`, `label`) + `renderTable()`; CSS block `TABLE v21`. Copies before: `index_before-table-v2.html` (Ortspräpositionen, Präpositionen picker, Home).

## Wortschatz · typo tolerance (2026-09-25)

**Why:** one typo reset a word to day 1, even at the 90-day level. With dyslexia, skipped or swapped letters are hard to notice, and the exercise is about *remembering* the word, not perfect spelling.

- **Only for words at level 2+.** Levels 0–1 stay strict (exact answer only), so the correct spelling is learned first.
- **Close answer → hint, never accepted.** The typing field gets a subtle red frame (`--error`, both themes) and a short side-to-side shake; the typed text stays. Up to **2 more tries**. A misspelled word is never counted as right automatically.
- **"Close" means:** first letter right and at least half the letters right, and one of:
  - small slips (missing / extra / wrong letter, two neighbouring letters swapped): 4–6 letters → 1, 7–10 → 2, 11+ → 3; 1–3 letters → exact only;
  - scrambled order of exactly the right letters (5+ letters), incl. ie/ei;
  - wrong ending (same beginning, last ≤3 letters differ);
  - the same, after flattening common learner slips (full list, since it only decides the hint): sch–ch–sh–sc, ß–ss–s, double–single consonant, ck–k, tz–z–ts, silent h (ähnlich, wahrscheinlich), i–ie, v–f–w, ä–e, äu–eu, umlaut dots, d–t / b–p / g–k at the end of a word, chs–ks–x, qu–kw, ph–f, th–t, dt–t.
  - Not close: exactly another word from the list (a mix-up, not a typo).
- **After the tries:** normal wrong screen with the difference highlighted + quiet **"Nur Tippfehler"** button under Weiter (level 2+ only).
  - Tap it: the word **keeps its level** and comes back **tomorrow** (not after its level's interval); it doesn't come back again today. Button then reads "Kommt morgen wieder".
  - Tomorrow correct → moves up one level with the normal interval. Tomorrow "Nur Tippfehler" again → same level, next day again. Tap Weiter instead → reset to level 0 as before.
- **Design check (Design Police rules):** red frame = palette red (`--error`: `#FF7770` / `#E95E66`) at 60%, a transparent version as the rules allow; no new colour. "Nur Tippfehler" = **checkbox + label** (chosen over a pill, 2026-09-25): 18px box with 1.5px outline, 5px corners, and the label in the secondary text colour (`#C8C7C4` / `#55565B`); no frame, so it doesn't compete with Weiter. After tapping: box filled with a tick (same grey, green stays for "correct"), label "Kommt morgen wieder". System font set explicitly, 16px, shared press effect (97% + brightness .94, 0.12s), no hover. Shake respects "reduce motion".
- **Hint line** (above the typing field, red = palette `--error`, 16px system font, fades in with the frame; the line is always reserved so nothing jumps; translation moved up 8px). Texts, one at random — short, informal, kind:
  - first hint: *Sooo nah dran!* · *Ups, fast! Nochmal?* · *Die Buchstaben machen Quatsch.* · *Knapp! Du hast es gleich.*
  - last try: *Ein Blick noch. Keine Panik.* · *Einmal noch, ganz in Ruhe.*
  - Checked: fits all 217 sentences (RU + EN) on 390×844, 375×667 (with keyboard) and 1280×720 / 1440×800.
- Tested with the real list: all sample typos get the hint; random guesses, 1–3-letter words and other list words don't.
- Versions: Wortschatz v2.79, Home tile `wortschatz/?v=2.11`, Home 5.29. Full slip list: Wortschatz v2.80, tile `?v=2.12`, Home 5.30. Design check: Wortschatz v2.81, tile `?v=2.13`, Home 5.31. Hint line: Wortschatz v2.82, tile `?v=2.14`, Home 5.32 (copy before: `wortschatz/index_before-hint-text.html`). Checkbox: Wortschatz v2.83, tile `?v=2.15`, Home 5.33 (copy before: `wortschatz/index_before-typo-checkbox.html`) (copy before: `wortschatz/index_before-typo-list.html`). Copies before: `wortschatz/index_before-typo.html`, `Home/index_before-typo.html`.

## Wortschatz · due-word count on Home (2026-09-26)

**Why:** on the first app start of a day the Wortschatz tile said „noch offen“ instead of „X Wörter übrig“. Only Wortschatz counted due words and published them to `deutschHomeStatsV1`; yesterday's note is (correctly) ignored, so Home had nothing to show until Wortschatz was opened once.

- **One rule, one file:** `components/deutsch-wortschatz-due-v1.js` (`DeutschWortschatzDue`) is the only place that decides which words are due today. Used by Wortschatz (its own status), the Home tile, and Home's backup restore. No second copy of the rule.
- Rule (unchanged from Wortschatz): words in `activeIds`; due = no card yet, or `due` („YYYY-MM-DD“) ≤ today; today = local day taken at 12:00.
- **Home:** if the stored Wortschatz note isn't from today, Home counts with the shared file and stores the result in `deutschHomeStatsV1` (so the tile and the daily points agree). Wortschatz overwrites it as soon as it opens. Nothing due → „✓ fertig“, same as Wortschatz shows when opened. No active set yet → still „noch offen“.
- **Data safety:** the shared file only reads `wortsternSRSv03`, never writes. Storage keys and formats unchanged; old backups restore as before. If the file doesn't load, Wortschatz counts the old way and Home shows „noch offen“ as before.
- Small difference: Home doesn't load `words.js`, so a word id that was removed from `words.js` but is still in the active set would count on Home until Wortschatz is opened (then Wortschatz's number replaces it).
- Side fix: the restore count now matches Wortschatz exactly (before, it could be off at night because of a time-zone detail, and counted words without a card as not due).
- Versions: Wortschatz v2.84, Home tile `wortschatz/?v=2.16`, Home 5.40. Copies before: `Home/index_before-wortschatz-count.html`, `wortschatz/index_before-wortschatz-count.html`.

## Wortschatz · start screen (2026-09-26)

**Why:** first step of own word collections (see `WORTSCHATZ_COLLECTIONS.md`). Wortschatz used to jump straight into the first card; now it opens like the other exercises, and the start screen is where the collection button will live later (never inside the exercise).

- **Layout** (Partizip II family): Georgia title „Wortschatz.“ (`clamp(48px,13vw,72px)`), grey subline **„Heute: 12 Karten“** („1 Karte“ for one), one main button **Starten** (main-button colours, 312px = width of the 10/20/30 row and of the description, 56px, 17px corners, 16px bold), „Worum geht's?“ description, version mark. The top bar (title, counter, progress line) is hidden on the start screen.
- **No 10 / 20 / 30:** the review schedule decides what is due. Only the total is shown (new words only come in via „+ 5 neue Wörter“, so a „neu“ count would almost always be 0).
- **Nothing due:** no start screen — Wortschatz opens on „Fertig für heute“ exactly as before.
- **Starten** runs the same `build()` that used to run on load; SRS logic, storage and backups unchanged. Desktop: Enter = Starten; the answer field gets focus when the session starts (not on the start screen). On phones the custom keyboard only appears inside the session.
- The keyboard component now loads in the background (the start screen doesn't wait for it); `render()` shows it once it's ready.
- Home status (`deutschHomeStatsV1`) and progress are published when the start screen opens, like before on load.
- **Description (draft, to be approved):** EN *Helps you remember words in real sentences. Each word comes back just before you'd forget it - and less and less often over time.* · RU *Помогает запоминать слова в живых предложениях. Каждое слово возвращается как раз перед тем, как забудется, - и со временем всё реже.*
- CSS blocks: `START SCREEN · Wortschatz` and `START SCREEN · description` at the end of the page's `<style>`.
- Versions: Wortschatz v2.85, Home tile `wortschatz/?v=2.17`, Home 5.47. Copies before: `wortschatz/index_before-start.html`, `Home/index_before-wortschatz-start.html`.

## Wortschatz · own collections, storage (2026-09-26)

**Step 2** of `WORTSCHATZ_COLLECTIONS.md`. No visible change yet — the screens come in steps 3–6.

- **One file:** `wortschatz/collection.js` (`window.WortschatzCollection`) holds all collection logic: reading pasted text / files, checking cards, duplicates, create / add / edit / delete a card, rename, export, back to the built-in set. Wortschatz loads it after `words.js`; if an own collection exists, its cards replace `WORDS` — deck, due count, notifications and progress then work unchanged.
- **Storage keys:** `deutschWortschatzCollectionV1` (own collection), `deutschWortschatzDemoProgressV1` (built-in set's progress, set aside). Progress of the active collection stays in `wortsternSRSv03`, so Home's due count and daily points need no change.
- **Own card ids:** `"u1"`, `"u2"`, … never reused.
- **Reading input:** JSON list, `{cards:[…]}`, or the `words.js` format; AI answers with text or a code block around the list are fine. Nothing is ever executed. Checked against the full `words.js`: all 217 cards import.
- **Card rules:** sentence with at least one `{{c1::…}}` + translation required; `blank` / `revealed` / `target` built automatically; several `{{c1::…}}` = one split answer (separable verbs); old field `ru` accepted as sentence translation. Broken cards are skipped with a short German reason.
- **Duplicates:** same base form (article ignored) or the very same sentence. Not by hidden word alone (*der Bescheid* ≠ *Bescheid geben*).
- **Backup:** both new keys added to `BACKUP_MODULES` (labels „Wortschatz · eigene Wörter“, „Wortschatz · Standard-Set (beiseitegelegt)“). **Restore rule:** a backup with Wortschatz progress but no own collection removes an own collection (and set-aside demo progress) on the device, so progress and words never get mixed. Tested with an old-style backup.
- Changes that touch progress (create, add with „Gleich lernen“, delete a card, back to the built-in set) write straight to storage; the page reloads afterwards (the screens in step 3+ will do this).
- **Open:** which Home stats reset when switching to own words — decided 2026-09-26, see „Wortschatz · statistics with collections“.
- Versions: Wortschatz v2.86, Home tile `wortschatz/?v=2.18`, Home 5.48. Copies before: `wortschatz/index_before-collection-storage.html`, `Home/index_before-collection-backup.html`.

## Wortschatz · collection button + window (2026-09-26)

**Step 3** of `WORTSCHATZ_COLLECTIONS.md`. File: `wortschatz/collection-window.js` (uses `collection.js`).

- **Button** „<Name> · <Anzahl>“ (built-in set: „Standard · 217“) = the start-screen table pill, 28px below Starten; on „Fertig für heute“ 28px below „Zur Startseite“ (not between the two buttons, so they stay one group). Never inside the exercise.
- **Window** = table-window rule: blur 8px + 34% / 20% darkening, card colour, 10% outline, 24px corners, fade + zoom-in, × (About ×), tap outside / Esc closes. Title 20px semibold (like About).
- **Contents:** name · „217 Wörter · eingebautes Set“ / „120 Wörter · Umbenennen“ · scrollable word list (base form left, translation right in palette grey, 10% hairlines) · for an own collection two quiet rows (Settings row style): **Exportieren**, **Löschen · zurück zum Standard-Set**.
- **Rename:** own view with a text field, **Speichern** (main button), „Abbrechen“ link. Max 40 characters.
- **Export:** downloads `<Name>.json` — a clean list that can be imported again (same way as Backup downloads its file).
- **Delete:** „Sammlung löschen?“ — **Behalten** = contrast button (the safe choice, same rule as „Are you sure?“), **Löschen** = quiet button, „Vorher exportieren“ link. If the built-in set has earlier progress: „Zurück zum Standard-Set“ — **Weitermachen** (contrast) / **Neu anfangen** (quiet). Then the page reloads.
- All user text goes in as plain text, never as HTML (tested with HTML in a pasted card).
- **Home:** the back button „‹“ also fades out while this window is open (`.coll-modal` added to Home's window list).
- Versions: Wortschatz v2.87, Home tile `wortschatz/?v=2.19`, Home 5.49. Copies before: `wortschatz/index_before-collection-window.html`, `Home/index_before-collection-window.html`.

## Wortschatz · word form — add / edit one word (2026-09-26)

**Step 4** of `WORTSCHATZ_COLLECTIONS.md`. In `wortschatz/collection-window.js` (`?v=2`), own collections only.

- **Where:** collection window → **＋ Wort hinzufügen** (first row, above Exportieren), or **tap a word in the list** = edit it. Plus **✎ on the answer screen** (see below).
- **Form (top to bottom):** Satz (text box) → the words appear as **chips; tap = hide this word** (tap two for separable verbs: *melde* + *an*; a chip from an existing multi-word gap like *zur Verfügung* stays one chip) → live preview with the gaps → **Bedeutung** (required) → Übersetzung des Satzes · Grundform (placeholder = the hidden words, e.g. „melde an“) · Grammatik · Wortart chips Verb / Substantiv / Adjektiv / Andere (all optional) → switch **Gleich lernen** (new words only; on by default: on = in the next round, off = waits for „+ 5 neue Wörter“).
- An existing Wortart that isn't one of the three (e.g. „Konjunktion“) shows as „Andere“ and is kept as it is unless you pick another chip.
- **Buttons:** Speichern (main button), „Wort löschen“ (edit only, link) → „Wort löschen?“ with **Behalten** (contrast) / Löschen (quiet), „Abbrechen“ link.
- **Checks:** no sentence / no word tapped / no meaning → one short line in palette red under the form; it disappears as soon as you type or tap. Duplicate → „Dieses Wort ist schon in der Sammlung.“ Full storage → „Der Speicher ist voll - das Wort wurde nicht gespeichert.“
- **Look:** fields = typing-field look (10% outline, 14px corners), 16px text (no iPhone zoom). Chosen chip = main-button colours (green stays „correct“). The switch is green when on (Settings rule: green = enabled outside the exercises). Example placeholders only for a new word.
- **After changes** (add, edit, delete) the page reloads when the window closes, because Wortschatz keeps progress and words in memory.
- Versions: Wortschatz v2.88 (`collection-window.js?v=2`), Home tile `wortschatz/?v=2.20`, Home 5.50. Copies before: `wortschatz/index_before-word-form.html`, `wortschatz/collection-window_before-word-form.js`, `Home/index_before-word-form.html`.

### ✎ on the answer screen (2026-09-26, v2.89)

- **Why:** the easiest moment to fix a card is while you're looking at it.
- Small pencil (thin line, 19px, 44px tap area) in the **top-right corner of the details area** under the divider, level with the Grundform. Palette grey at 60% strength — easy to find, doesn't compete with the answer. Shown **only for own words** (built-in cards can't be edited) and only on the answer screen.
- Opens the same word form (**edit only** — no „Wort löschen“ here; „Abbrechen“ closes). **Speichern** updates the card on the answer screen at once, **without reloading**: the session keeps running, progress isn't touched. If the card comes back later in the same round (after a mistake), it's already corrected.
- An answer marked wrong only because of a mistake in the card still counts as wrong for this round (the card comes back once more, then tomorrow). Fixing the card doesn't change the result.
- Versions: Wortschatz v2.89 (`collection-window.js?v=3`), Home tile `wortschatz/?v=2.21`, Home 5.51. Copies before: `wortschatz/index_before-edit-in-exercise.html`, `wortschatz/collection-window_before-edit-in-exercise.js`, `Home/index_before-edit-in-exercise.html`.

## Wortschatz · own words — import (2026-09-26)

**Step 5** of `WORTSCHATZ_COLLECTIONS.md`. In `wortschatz/collection-window.js` (`?v=4`); reading and checking cards in `collection.js`.

- **Standard window → „Eigene Wörter verwenden“:** short note („Deine eigenen Wörter ersetzen das Standard-Set. Dein Fortschritt dort wird beiseitegelegt - du kannst später zurückwechseln.“), **Name der Sammlung** (empty = „Meine Wörter“), then **Liste importieren** (main button) or **Erstes Wort eintippen** (quiet button → the word form, without the „Gleich lernen“ switch).
- **Own collection → „＋ Wörter importieren“** (row under „＋ Wort hinzufügen“). New words go to the end of the „+ 5 neue Wörter“ queue.
- **Import view:** „Frag eine KI nach Beispielsätzen für deine Wörter und füge ihre Antwort hier ein“ + link **Format für die KI** · paste box (monospace 13px) · „Oder: Datei wählen“ (.json, .js, .txt; max 2 MB) · **Sammlung anlegen** / **Hinzufügen** · Abbrechen. Text around the list and ``` code fences are ignored, nothing is ever run.
- **Format für die KI:** „Schreib deiner KI zuerst, was du willst - welche Wörter, welches Niveau, welche Sprache für die Übersetzung. Dann füge diesen Text dazu:“ + the format block (English, so any AI understands it; two example cards incl. a separable verb; rules for sentence, one marked word, translation language — English if not said —, base with article, grammar, pos) + **Kopieren** („Kopiert ✓“; fallback for iPhone when the clipboard is blocked). The user writes their own request; the block only fixes the format.
- **Result view:** „14 Wörter in „B1 Arbeit“. Du startest mit den ersten 10.“ (the last sentence only with more than 10) · duplicates count · skipped cards with number, reason and the start of the sentence (max 30 listed) · **Fertig** → page reloads.
- **Errors (palette red line):** empty box, not a list („Kopiere die ganze Antwort der KI - von [ bis ]“), no usable card (with the first reason), everything already there, storage full, file too big / unreadable.
- **Not built (decided):** no „take over Standard with progress“ — the progress so far is small, and unwanted words can now simply be deleted.
- Versions: Wortschatz v2.90 (`collection-window.js?v=4`), Home tile `wortschatz/?v=2.22`, Home 5.52. Copies before: `wortschatz/index_before-import.html`, `wortschatz/collection-window_before-import.js`, `Home/index_before-import.html`.

## Wortschatz · collection screens in English (2026-09-26)

- **Why:** the collection window (import, format for the AI, word form, rename, delete, errors) explains how to manage your own words. Users whose German is still weak must understand it — same reason as Settings and About being English. The German labels quoted in the sections above (steps 3–5) are now English.
- **Rules:** labels in Title Case (Settings rule): *Use My Own Words, Import a List, Type the First Word, ＋ Add Word, ＋ Import Words, Export, Delete · Back to Standard, Rename, Save, Cancel, Keep, Delete, Continue, Start Over, Create Collection, Add, Done, Copy, Back, Export First, Choose a File, Format for the AI, Learn Now*. Field labels: *Sentence, Meaning, Sentence Translation, Base Form, Grammar, Word Class* (chips *Verb · Noun · Adjective · Other*; the stored values stay German — Verb / Substantiv / Adjektiv / Andere — like the built-in cards). Questions in sentence case: *Delete this collection? Delete this word?*
- Buttons of the exercise itself are quoted as users see them: „+ 5 neue Wörter“.
- Skip reasons from `collection.js` are English too („No word marked with {{c1::…}} in the sentence“, „No meaning“ …). A new collection without a name is called **My Words**; the built-in set stays **Standard**.
- Unchanged German: the exercise, the start screen, the done screen and the collection button („Standard · 217“).
- Versions: Wortschatz v2.91 (`collection.js?v=2`, `collection-window.js?v=5`), Home tile `wortschatz/?v=2.23`, Home 5.53. Copies before: `wortschatz/index_before-english.html`, `wortschatz/collection-window_before-english.js`, `wortschatz/collection_before-english.js`, `Home/index_before-wortschatz-english.html`.

## Wortschatz · new words running out (2026-09-26)

**Step 6** of `WORTSCHATZ_COLLECTIONS.md`. German, like the rest of the start and done screens (short and simple enough).

- **Start screen:** with 1–10 new words left, a grey line under „Heute: 12 Karten“: **„Noch 8 neue Wörter“** / „Noch 1 neues Wort“ (14px, palette grey). Nothing with more than 10 left.
- **„+ 5 neue Wörter“ says what it really adds:** with fewer than 5 left **„+ 3 neue Wörter“** / „+ 1 neues Wort“.
- **Done screen:** with 6–10 left, the grey line „Noch 8 neue Wörter.“ above the buttons (with 5 or fewer the button already shows the number, so no line).
- **None left:** own collection → „Alle Wörter sind schon dabei.“ + button **„+ Neue Wörter“** (same style as „+ 5 neue Wörter“, so users recognise it) → opens the collection window (＋ Add Word / ＋ Import Words). Built-in set → „Alle Wörter sind schon dabei.“ as before, no button.
- Wording chosen for simplicity: „Noch … neue Wörter“ without „übrig“ („noch“ already says it); „+ Neue Wörter“ instead of „+ Wörter hinzufügen“ (matches the familiar button).
- Versions: Wortschatz v2.92, Home tile `wortschatz/?v=2.24`, Home 5.54. Copies before: `wortschatz/index_before-words-left.html`, `Home/index_before-words-left.html`.

## Wortschatz · start screen v2 + „Starter-Set“ (2026-09-26) · *on trial*

**Why:** in testing, switching to your own words was hard to find (hidden at the bottom of a long list that looked like more words), „Standard · 217“ meant nothing to a first-time user, and the pill looked like a table button.

- **Built-in set renamed „Starter-Set“** (everywhere: button, window, „Delete · Back to Starter-Set“, texts).
- **New order on the start screen:** Wortschatz. (44px space below) → small grey label **DEINE WÖRTER** (12px, uppercase) → **„Starter-Set · 217 Wörter ›“** (plain text line, 17px: name in text colour, count and › in palette grey; tap = collection window; not a pill any more, so it isn't mistaken for a table button) → **Heute: 12 Karten** (+ „Noch 8 neue Wörter“) → **＋ Use your own words** (Starter-Set only; filled card button like 10/20/30: card colour + shadow, 312 × 52, 16px corners, 15px semibold; opens „Your Own Words“ directly) → **Starten** (cream main button, last).
- English on purpose for „Use your own words“: it leads into the English collection screens and must be understood without good German.
- With an own collection: no „Use your own words“; the screen is title → DEINE WÖRTER → „B1 Arbeit · 120 Wörter ›“ → Heute → Starten.
- **Starter-Set window:** title „Starter-Set“, text „217 everyday German words in example sentences.“, **Use My Own Words** (main button), „Show All Words“ link that unfolds the list (→ „Hide Words“). Own collections keep their list (tap = edit).
- Fits on iPhone SE (375 × 667): Starten ends at ~375px, the description starts at ~525px.
- **Open:** maybe swap „Use your own words“ and Starten after testing on the phone; the done screen still has the old pill (decide separately).
- Versions: Wortschatz v2.93 (`collection-window.js?v=6`), Home tile `wortschatz/?v=2.25`, Home 5.55. Copies before: `wortschatz/index_before-start-layout.html`, `wortschatz/collection-window_before-start-layout.js`, `Home/index_before-start-layout.html`.

## Wortschatz · collection windows v2 (2026-09-26)

Both windows now follow one pattern: **what it is → the main action on top → the words below**.

- **Starter-Set:** „217 everyday German words in example sentences.“ → **Use My Own Words** (main button) → link **„Show All Words in the Set“** — the list unfolds **below** the link and scrolls inside the window (link turns into „Hide Words“). v2.94.
- **Own collection:** name → „120 words · Rename“ → **＋ Add Word** (main button) → link **＋ Import Words** → word list, always open (tap = edit) → at the bottom, above a hairline, two quiet links **Export · Delete** (rare / risky actions last). v2.95.
- „Delete this collection?“ now also says „… and you go back to the Starter-Set“ (the link no longer says it).
- Copies before: `wortschatz/collection-window_before-starter-list.js` (v2.94), `wortschatz/collection-window_before-own-layout.js`, `wortschatz/index_before-own-layout.html`, `Home/index_before-own-layout.html` (v2.95).

### Start screen balance (2026-09-26, v2.96)

- **Title on top, buttons low, DEINE WÖRTER block centred between them.** The start screen fills the height down to 36px above the „Worum geht's?“ description (measured by `layoutStart()` on open and on resize, so it also works with the longer Russian description and on every phone size); the DEINE WÖRTER block has `margin:auto` in the column, so the space above and below it is always equal.
- Measured: 390 × 844 → 180px above and below the block; iPhone SE 375 × 667 (Russian) → 83px; 430 × 932 → 222px. Buttons always end 36px above the description.
- Replaces the fixed 44px under the title from v2.93. Copies before: `wortschatz/index_before-start-balance.html`, `Home/index_before-start-balance.html`.

## Wortschatz · done screen v2 + „… lernen“ (2026-09-26)

- **Mirrors the start screen:** no top bar (the screen already says „Fertig für heute.“ and „10 / 10 geschafft“). „Fertig für heute.“ · „Komm morgen wieder.“ · score on top → **DEINE WÖRTER** block (same label and „<Name> · <n> Wörter ›“ line as the start screen; replaces the old pill) centred → buttons low, 28px above the version number (`layoutDone()`, same idea as `layoutStart()`).
- The „Noch 8 neue Wörter.“ / „Alle Wörter sind schon dabei.“ line sits in the DEINE WÖRTER block (14px, palette grey).
- **No „＋ Use your own words“ here** — this screen is about finishing; the › line leads to the Starter-Set window with „Use My Own Words“, and the start screen shows the button every day with cards.
- **Wording rule:** „… lernen“ = take new words into today's practice, „＋“ = add words to your set. Buttons: **5 neue Wörter lernen** / **3 neue Wörter lernen** / **1 neues Wort lernen**; none left in an own collection → **＋ Neue Wörter** (opens the collection window). Why: „+ 5 neue Wörter“ and „+ Neue Wörter“ differed only by the number, and users could think „+ 5“ adds words to the set. The form's hints now say „waits for „5 neue Wörter lernen““.
- Measured: 390 × 844 → 210px above and below the block; iPhone SE → 111px.
- Versions: Wortschatz v2.97 (`collection-window.js?v=9`), Home tile `wortschatz/?v=2.29`, Home 5.59. Copies before: `wortschatz/index_before-done-screen.html`, `wortschatz/collection-window_before-done-screen.js`, `Home/index_before-done-screen.html`.

### Done screen compact (2026-09-26, v2.98)

- The v2.97 layout spread the three parts over the whole height (210px gaps) — too far apart. Now: **fixed moderate gaps** above and below the DEINE WÖRTER block (`clamp(40px, 8vh, 80px)` → 68px on 390 × 844, 53px on iPhone SE) and the **whole group centred vertically** — the headline comes down, the buttons come up.
- Headline on two lines: **„Fertig / für heute.“** (narrower, closer to the other exercises' „Fertig.“), line height 1.05.
- The start screen keeps its own balance (buttons low above „Worum geht's?“).
- Copies before: `wortschatz/index_before-done-compact.html`, `Home/index_before-done-compact.html`.

## Wortschatz · red note, two-line collection, „Heute“ above the buttons (2026-09-26, v2.99)

- **Why:** three numbers in a row („217 Wörter“, „Heute: 12 Karten“, „Noch 8 neue Wörter“) made a confusing hierarchy. Each number now sits with what it belongs to.
- **DEINE WÖRTER block (start + done screen):** label → **name ›** (17px, tap = window) → **word count** on its own line (14px, palette grey) → **red note** (14px, 500, palette red).
- **„Heute: 12 Karten“** moved from the block to **right above the buttons** (15px, palette grey) — it's about today's practice, so it belongs with Starten.
- **Red note = „needs your attention“ (outside the exercises).** New colour rule: inside the exercises red still means only „wrong“; on the start and done screens it marks a warning. Texts: **„Noch 8 neue Wörter“** (1–10 left), **„Keine neuen Wörter mehr“** (start screen, none left), **„Alle Wörter sind schon dabei.“** (done screen, none left). On the done screen the note shows **whenever 10 or fewer are left — also when the button already says the number** („3 neue Wörter lernen“), to make it absolutely clear.
- **„Gerade ist nichts fällig.“ removed** (it meant „nothing is due right now“ and only repeated „Fertig für heute. Komm morgen wieder.“). After a session „10 / 10 geschafft“ stays.
- Idea kept for later: „Starten · 12 Karten“ inside the button instead of the line above it.
- Copies before: `wortschatz/index_before-red-note.html`, `wortschatz/collection-window_before-red-note.js`, `Home/index_before-red-note.html`.

## Wortschatz · collection window fixes (2026-09-26, v2.100)

- **‹ back + × close, no „Cancel“ links.** „Cancel“ went one step back (e.g. New Word → list), × closes the whole window — two different things that looked alike. Now like the Fortschritt window: **‹** left of the title (one step back) on New Word / Edit Word, Your Own Words, Import, Format for the AI, Rename; **×** right (close). The ✎ edit from the answer screen has only × (nothing to go back to). Confirm questions keep their buttons (Keep / Delete, Continue / Start Over).
- **Word form: Save at the very end** of the scrolling form (after Word Class and Learn Now) instead of fixed below it — you pass every field before saving, so no option is missed (chosen over a fold-out „More Details“ and a fade).
- **Window height / iPhone web app:** inside the Home web app the exercise page isn't reliably told how tall the status bar and home indicator are, so the window grew under the status bar and the bottom edge stayed undarkened. Now the dark + blurred layer reaches **100px past the top and bottom edge**, and the card keeps **fixed safe margins** (at least 64px top, 40px bottom, more if the phone reports bigger insets); max height 640px (was 720px). It scrolls inside.
- Copies before: `wortschatz/index_before-window-fixes.html`, `wortschatz/collection-window_before-window-fixes.js`, `Home/index_before-window-fixes.html`.

### Starter-Set window: fold-out word list (2026-09-26, v2.101)

- Order: title · „217 everyday German words in example sentences.“ · **▸ All Words in the Set** · (list) · **Use My Own Words**.
- The line uses the **fold-out mechanic of the Pronomen table**: small (15px semibold, text colour), left-aligned, grey ▸ that turns ▾ when open; the text stays the same („All Words in the Set“ instead of „Show … / Hide …“). The list unfolds right under it and scrolls inside the window.
- **Use My Own Words** stays at the bottom, always visible — also with the list open on iPhone SE.
- Copies before: `wortschatz/index_before-starter-fold.html`, `wortschatz/collection-window_before-starter-fold.js`, `Home/index_before-starter-fold.html`.

### „15 / 217 Wörter angefangen“ + no „Heute“ line (2026-09-26, v2.102)

- The count under the collection name (start + done screen) now says how many words you've **started** out of all words in the collection: **„15 / 217 Wörter angefangen“** (14px, palette grey, ~175px wide — fits on iPhone SE). „angefangen“ on purpose: „15 / 217“ alone reads like „15 learned“, and the Fortschritt screen already uses „angefangen“ for started words. Fallback if it looks too long on the phone: „15 / 217 Wörter“.
- Counted from the saved progress (active words that are in the collection); refreshed when the start or done screen opens, so it goes up right after „5 neue Wörter lernen“.
- **„Heute: 12 Karten“ removed** from the start screen — the session counter („0 / 12 heute“) shows it as soon as you start.
- Copies before: `wortschatz/index_before-started-count.html`, `wortschatz/collection-window_before-started-count.js`, `Home/index_before-started-count.html`.

### Hint wording for new words (2026-09-26, v2.103)

- The old hint „Off: waits for „5 neue Wörter lernen““ was wrong: with Learn Now off, a word goes to the **end of the collection**, and „5 neue Wörter lernen“ always takes the next 5 not-yet-started words in collection order — so it comes up only after all words before it. Mechanic unchanged, only the wording:
  - Word form: **„On: comes up in your next round. Off: added to the end of your list.“**
  - Import: **„New words are added to the end of your list.“**

### Add Word + Import List side by side (2026-09-26, v2.104)

- Own collection window: **＋ Add Word** (cream main button) and **Import List** (outlined quiet button) in **one row**, equal width, same shape (48px high, 16px corners, 15px) — both answer „how do I get words in?“, and the row saves ~60px for the word list. ~145px each on iPhone SE, text fits.
- „Import Words“ / „Import a List“ → **„Import List“** everywhere (button, the „Your Own Words“ step, the import screen title): says how it works and doesn't read like a twin of „Add Word“.
- Copies before: `wortschatz/index_before-add-pair.html`, `wortschatz/collection-window_before-add-pair.js`, `Home/index_before-add-pair.html`.

### „Worum geht's?“ folded — Wortschatz exception (2026-09-26, v2.105)

- **Exception to the start-screen rule** (other exercises show the description open): the Wortschatz start screen has more on it (collection, count, two buttons), so the description is **folded by default**. Only **„Worum geht's? ▸“** shows, at the height of the description's last line (the block is anchored at the bottom). Tap = the text unfolds, the headline moves up, ▸ turns ▾ (same fold-out mechanic as the Starter-Set window and the Pronomen table). Not remembered — folded again on the next visit.
- `layoutStart()` measures the screen **as if the text were open**, so the buttons never move when it unfolds (they stay ~31px above the open text).
- Copies before: `wortschatz/index_before-about-fold.html`, `Home/index_before-about-fold.html`.

## Wortschatz · statistics with collections (2026-09-26, Fortschritt v18, Wortschatz v2.106)

**Why:** own collections grow and can be switched, so a bar measured against the collection size never reaches its end and shrinks when words are added; the daily history would mix two collections.

- **Bar = started words.** Layers: angefangen (whole bar; grey where words don't sit yet) · **sitzt** (level ≥ 3 = passed the 8-day review) · gelernt (level 6, mint). Numbers „gelernt / sitzen / angefangen“, each of the first two only once ≥ 1. Legend in the bar's order: „gelernt · sitzt · angefangen“.
- **sitzt colour = the default mint, transparent (65 %)**, both themes — not the darker „vor 3 Wochen“ green, which means something else in the same window. 35–50 % looked almost like that green on the dark card (and like the light theme's pale green), so 65 %. The grey segment starts where sitzt ends, so the transparent mint never mixes with the grey.
- **No collection size, no „words left“** on the card — it changes a lot and can't be acted on there.
- **Collection name** on its own line under „Wortschatz“ (13px, palette grey, … when long): explains why numbers change after a switch; a long name no longer squeezes the title row.
- **Counted live** from the active collection → switching and „Continue“ need nothing extra; no dates per word (considered and dropped: only needed for a „+N in 3 Wochen“ number, which Wortschatz doesn't show).
- **Daily points already earned today are never taken away** when switching.
- **Wortschatz removed from the daily history** (`deutschProgressSnapshotsV1`): it was saved as a side effect, never shown, and isn't needed for Backup (real progress is in the Wortschatz keys).
- Renaming the collection republishes the summary at once.
- Versions: Wortschatz v2.106 (`collection-window.js?v=16`), Home tile `wortschatz/?v=2.38`, `progress-screen.js?v=18`, Home 5.68. Copies before: `Home/index_before-ws-stats.html`, `Home/progress-screen_before-ws-stats.js`, `wortschatz/index_before-ws-stats.html`, `wortschatz/collection-window_before-ws-stats.js`.

## Exercise windows · bottom strip in the iPhone web app (2026-09-26, Home 5.69)

**Why:** in the Home web app on iPhone, the very bottom strip of the screen (where Safari has its address bar) stayed light while a window (table, collection window, …) was open in any exercise. The exercise frame doesn't reach that strip, so nothing inside an exercise can darken it (Wortschatz v2.100's „100px past the edge“ couldn't help) — Home's own background shows there.

- **Fix in Home:** while a window is open inside the exercise (same detection as the ‹ back button, `WINDOW_SEL`), Home adds `frame-window` to `<html>` and darkens its own background to the window look: bg + 34 % black (dark, `#121213`) / 20 % black (light, `#c5c3c1`), 0.18s fade like the windows. The status-bar colour (`theme-color`) follows and is restored when the window closes or the exercise is left.
- No blur needed there: the strip only ever shows the plain background.
- Covers every exercise at once; exercises unchanged. Browser-tested (class, colour and theme-color on open / close); **to confirm on the iPhone.**
- Version: Home 5.69. Copy before: `Home/index_before-ws-stats.html` (same round as the Wortschatz stats).

### Wortschatz collection window: layer fills the screen exactly (2026-09-26, Wortschatz v2.107, Home 5.70)

- **Why:** the v2.100 trick (dark + blurred layer reaching 100px past the top and bottom edge) made the blur fade out at the cut edge — a visible „shadow going up“ at the very bottom in the light theme. The other exercises' windows use `inset:0` and look clean. Now that Home darkens the strip below the exercise (Home 5.69), the trick isn't needed.
- `.coll-modal` = `position:fixed; inset:0` like Ortspräpositionen; the card keeps its safe margins (at least 64px top, 40px bottom). Replaces the „Window height“ point of v2.100.
- Versions: Wortschatz v2.107, Home tile `wortschatz/?v=2.39`, Home 5.70. Copies before: `wortschatz/index_before-window-edge.html`, `Home/index_before-window-edge.html`.


## Page shell: the page never scrolls, the content panel does (2026-09-26, Artikel v25, Home 5.71)

**Why:** in the browser (not the web app), the Artikel start and summary screens scrolled through empty space: they had a leftover `min-height:690px` („same height as Pronomen“), taller than Safari's visible area. Partizip II and Modalverben already use a locked page.

- **Shell (same as Partizip II):** `html, body` fixed to the screen, no scrolling or bounce. `.app` fills the screen (`position:fixed; inset:0`) and scrolls on its own **only** when the content is taller than the screen (small phones, large text, phone turned sideways). Nothing can end up unreachable.
- **Start / summary screens:** the `690px` minimum height is gone — they are as tall as their content.
- **„Worum geht's?“ and the version number** stay pinned to the bottom on normal screens. On short screens (`max-height 559px`, or `max-width 340px` and `max-height 609px`) they follow the content instead, so they never cover the 10/20/30 or summary buttons. Measured: overlap started below ~560px height (~590px at 320px width).
- **Top bar:** a strip in the background colour covers the space above the sticky bar, so scrolled content doesn't show through above it.
- **Home 5.71:** the „‹“ button listens to scrolling **with capture**, so it also follows the title when an exercise scrolls inside its panel (also applies to Partizip II and Modalverben).
- **Style block cleaned up:** rules overridden later in the file merged into one final rule; removed dead rules and unused colours (`.play-again`, `.progress-label`, old `.session-option`/`.continue`/first `.version-mark`, `--button`, `--top-line`, `--top-title`, `--progress`, `--version`, `--card-shadow`, `--session-button-bg`, no-op `:hover` rules). Checked: every element on start, question, feedback (right/wrong) and summary screens has the same position and style as before at 375×667, 390×844 and 1024×800, dark and light.
- **Next:** the same shell + cleanup for the other exercises, one at a time.
- Versions: Artikel v25 (Home tile `artikel/?v=2.19`), Home 5.71. Copies before: `Artikel/index_before-scroll-shell.html`, `Home/index_before-scroll-shell.html`, `Documentation/DECISIONS_before-scroll-shell.md`.

## Home · „Last backup“ note + Safari reminder (2026-09-26, Home 5.72)

- **Why:** Safari (and every iPhone/iPad browser) deletes a site's saved data after 7 days without a visit. The Home Screen web app is not affected. Users of the site in the browser could lose all progress without knowing.
- **Settings → Backup note, every device:** „· Last backup today / yesterday / 12 days ago“, or „· No backup yet“ when there is progress but no backup. Nothing shown when there is no progress and no backup.
- **Red (palette red `--error`, „needs your attention“ rule) only in Safari in the browser** (iPhone/iPad browser or Mac Safari — not the Home Screen app): last backup **more than 5 days** ago, or none yet while there is progress. Everywhere else the note stays palette grey (no automatic deletion there).
- **Hint under Restore** (Safari in the browser only, in Your Language): „Progress is saved in this browser only. Safari deletes it after 7 days without a visit - add Deutsch. to your Home Screen, or make a backup often.“ (Mac: without the Home Screen part.)
- **Home card „Keep your progress“** under Heute: iPhone/iPad browser only, and only once there is progress. Mint label (green = your progress), card text in Your Language, „Show me how ›“ + ×. **× = not now:** comes back once after 14 days, then never again (`deutschKeepCardV1`).
- **„Show me how“ window** (built like About): 1 · Save your progress first + **Make a Backup** button · 2 · Share → Add to Home Screen · 3 · open from the icon → Settings → Restore. **Important:** the Home Screen app has its own storage and starts empty, so progress has to be moved over once with Backup → Restore.
- **Stored:** `deutschLastBackupV1` = time of the last backup made on this device; a Restore also counts (the backup's date, if newer). Per device, **not** part of the backup. Backup format unchanged, old backups restore as before.
- Copies before: `Home/index_before-backup-reminder.html`, `Documentation/DECISIONS_before-backup-reminder.md`.

### Artikel: top bar pushed down in the iPhone web app — fixed (2026-09-27, Artikel v26, Home 5.72)

- **Symptom (v25):** in the web app the top bar sat ~60px too low and covered the card; Home then didn't recognise it as the game title and showed „‹ Deutsch.“ on its own line above it. Browser on the computer looked fine (no status bar there).
- **Cause:** the sticky top bar's offset contains the status-bar height, and `.app` (the scroller) also had it as top padding. Safari measures a sticky offset from inside the scroller's padding, so the status-bar height counted twice. Chrome measures from the edge, so it didn't show up in testing.
- **Fix:** `.app` has **no top padding**; the status-bar space moved onto the screens (`#sessionScreen`, `#endScreen`: status bar + 28px; `#game`: status bar + 19px). Nothing is left for the two browsers to disagree on. Checked with 0px and a simulated 59px status bar: every element is in exactly the same place as in v24.
- **Rule for the next exercises:** the scroll panel gets no top padding when it contains a sticky bar.
- Versions: Artikel v26 (Home tile `artikel/?v=2.20`), Home 5.72. Copy before: `Artikel/index_before-sticky-fix.html`.

## Home · code clean-up, one date helper, own CSS/JS files, backups → git (2026-09-27, Home 5.73)

- **Why:** code review of Home. The light-theme Wortschatz tile had blended into the page: its picture has its own off-white background (≈ the page colour) and covers the whole tile, and a leftover `clip-path` on `.tile-vocab` cut off the tile shadow that the „lift“ round (2026-09-25) had added — in both themes (in dark you just don't see it).
- **Wortschatz tile:** `clip-path` removed → shadow back, tile visible again in light. Still worth doing: re-export `wortschatz/icon_light.webp` on pure white (#FFF, like the tile) so the tile has the same white as the others.
- **Styles:** the Design Police blocks at the end of `<style>` (lift, Home screen, phrase screen, Settings, pause screen, back button) are merged into the original rules — every element is described once. One palette per theme at the top. Removed: dead rules (`.home-glyph`, `.tile-placeholder`, the old round ⌂ back button, old square Heute tile, no-op rules), unused colours (`--card-border`, `--vocab-border`, `--dim-text`, `--faint-text-1/2/3`, `--tertiary-text(-active)`, `--quaternary-text`, `--today-track`, `--back-btn-border`, `--toggle-track-solid`, `--confirm-btn-*`, `--confirm-shadow`), classes `intro` and `tile-today-wide`. `--about-card/--about-line` → `--window-card/--window-line`; About uses `--confirm-scrim` (same values). `progress-screen.js` no longer adds `.tile-today:active{opacity:.8}` (it was always overridden).
- **Checked:** every element on Home, Settings, About, „Are you sure?“, Keep your progress, phrase screen, pause screen, exercise shell and Fortschritt has the same position and style as before at 375×667, 390×844 and 1024×800, dark and light, pressed states and reduced motion — only intended difference: the Wortschatz shadow.
- **Unused file removed:** `Home/theme-controller.js` (never loaded; it defined a different `DeutschTheme` and would have broken the theme switch if included).
- **One date helper:** `components/deutsch-day-v1.js` — `DeutschDay.key(daysBack)` / `DeutschDay.add(key, n)`, local time at noon (DST-safe). Replaces the five copies in Home and `progress-screen.js`; in `deutsch-progress-v1.js` `today()` now reuses `daysAgo(0)` (the component stays self-contained, exercises unchanged). Same output in 39,420 date checks incl. DST nights.
- **Own files:** `Home/index.html` = markup only (2,750 → 277 lines); `Home/home.css`, `Home/home.js` (formatted with Prettier, `.prettierrc.json` in the project root). The small theme script stays inline in `<head>` (must run before the first paint).
- **Upload to GitHub:** `index.html`, `home.css`, `home.js`, `progress-screen.js`, `components/deutsch-day-v1.js`, `components/deutsch-progress-v1.js`; delete `theme-controller.js` there if it exists.
- Version: Home 5.73.

### How changes are saved (from 2026-09-27)

- The `Deutsch` folder is a **git repository**. Every change is a commit with a short description — no more `_before-…` copies next to the files.
- The 329 old copies are the history of their files (dated when they were saved); `Documentation/BACKUP_COPIES.md` lists each old copy name with its commit, so „Copies before: …“ in this file can still be looked up.
- Not in git on purpose: `.DS_Store`, `notification-server/.wrangler/`, `notification-server/VAPID-SETUP-PRIVATE.txt` (private key).

## Wortschatz · code clean-up, two bug fixes, one date helper, own CSS/JS files (2026-09-27, Wortschatz v2.108, Home 5.74)

- **Why:** the same review as Home 5.73. Wortschatz had the same layered styles (Design Police blocks overriding the original rules, seven extra colour blocks), three ways of making a date, and everything inline in one 1,060-line `index.html`.
- **Bugs fixed:**
  - After a right answer the green word showed nouns in lower case („grund“ instead of „Grund“): the check for „der/die/das …“ had a double backslash (`\\s`) and never matched. Now `shownAnswer()` capitalises nouns — also after editing a card with ✎. The wrong-answer comparison stays in lower case (case doesn't count as a mistake).
  - `check()` no longer fails when the on-screen keyboard didn't load.
- **Styles:** every element is described once; one palette per theme at the top. Same colours under one name: `--hairline` (the 10% outline, was 7 names), `--field-bg`, `--card-bg`, `--main-bg/--main-text`, `--quiet-text`, `--sec-text`. Removed: rules for elements that no longer exist (`.version`, `.coll-btn`, `.coll-row`, `.coll-actions`, `.coll-top`, `.subtitle`, `.coll-line-count`) and looks that were always overridden (old input/Prüfen/Weiter/„5 neue Wörter“ styles, hover zoom, `--brand`, `--progress-*`, `--button-*`, `--add-words-*`, `--continue-*`). The done-screen rules are scoped to `#done` (`.done` also matched the ticked „Nur Tippfehler“ button — no visible effect).
- **One date helper:** Wortschatz, `collection.js` and `components/deutsch-wortschatz-due-v1.js` (v2) use `DeutschDay.key()` like Home. The old way (`toISOString()` at local noon) gave yesterday in time zones 12+ hours ahead of UTC (New Zealand). Berlin / New York / Hawaii: identical in 21,024 checks each.
- **Own files:** `index.html` = markup only (148 lines), `wortschatz.css`, `wortschatz.js`, all formatted with Prettier; `collection.js`, `collection-window.js` and the due component formatted too (no code change). Small tidy: the second spelling-distance function in `check()` is gone (uses `osa()` like the typo check).
- **Checked:** 43 screens and steps (start, „Worum geht's?“, question, right / wrong / noun answers, typo hints and „Nur Tippfehler“, done screens, „5 neue Wörter“, Starter-Set window, own collection: window, word form, delete word, rename, delete collection, import, format, ✎, pressed buttons) × 375 / 390 / 1024 px × dark / light (+ reduced motion) = 301 states: every visible element has the same position and style, and the saved data is identical. Only differences: version number and the noun capital.
- **Cache numbers:** `wortschatz.css?v=1`, `wortschatz.js?v=1`, `collection.js?v=3`, `collection-window.js?v=17`, `deutsch-wortschatz-due-v1.js?v=2` (in Wortschatz and Home), Home tile `wortschatz/?v=2.40`, Home 5.74. **Rule from now on:** when `wortschatz.css` or `wortschatz.js` changes, raise its `?v=` in `wortschatz/index.html` and the Home tile's `wortschatz/?v=` — otherwise the iPhone can keep the old file next to the new page.
- **Upload to GitHub:** `wortschatz/index.html`, `wortschatz/wortschatz.css` (new), `wortschatz/wortschatz.js` (new), `wortschatz/collection.js`, `wortschatz/collection-window.js`, `components/deutsch-wortschatz-due-v1.js`, root `index.html` (Home). Delete `wortschatz/swipe_test_v01_almost2.html` there if it exists.
- **Folders:** the `Artwork/` folders of all exercises are no longer in git (`.gitignore`); the files stay where they are and are maintained by hand. The old swipe test page moved to `Claude outputs/_to_delete/`.

## Artikel · code clean-up, Weiter key fix, one date helper, own CSS/JS files (2026-09-27, Artikel v27, Home 5.75)

- **Why:** the same review as Home 5.73 and Wortschatz v2.108. Artikel was already in better shape (styles cleaned in v25, 394 lines), so this round was smaller.
- **Bug fixed — Weiter skipped a word with the keyboard:** when the Weiter button still had focus, Enter (or Space) moved on twice, e.g. from word 1 straight to word 3. It happened after tabbing to Weiter, and also after clicking Weiter with the mouse and then answering with the keys (1/2/3). Now the key does it once (`preventDefault`). Checked in the browser before and after.
- **Keys only during a round:** 1/2/3 and the arrows do nothing on the start and summary screens. Before, the start screen threw an error in the console (no visible effect). *Correction to the first review:* the summary screen was already safe — no extra answers were ever counted there.
- **Styles:** same-value colours under one name — `--card-bg` (was also `--panel`, `--start-btn-bg`), `--hairline` (10% outline; was `--bar-track`, `--quiet-line`, `--end-again-line`, same name as in Wortschatz), `--muted` (was also `--text-label`). One font list for the page (`--font`); buttons inherit it instead of six copies. Unused class names removed from the markup (`again`, `home-back`, `session-screen`, `end-screen`, `game-title-done`, `continue`, `article`).
- **One date helper:** the daily stats use `DeutschDay.key()` like Home and Wortschatz (`../components/deutsch-day-v1.js?v=1` is now loaded). Same result as the old `localDayKey()`.
- **Own files:** `index.html` = markup only (92 lines), `artikel.css`, `artikel.js`, formatted with Prettier. The theme script stays inline in `<head>` (must run before the first paint). The start-screen description („Worum geht's?“) moved into `artikel.js`. Script grouped into sections (difficulty, progress, daily stats, deck, question, answer, screens, keys, back to Home); outdated „238 nouns“ comment fixed.
- **Checked:** 240 states — start (also scrolled), question, right, wrong, long words shrinking (Geschwindigkeit, Harley-Davidson), feedback scrolled, pressed Weiter / Zur Startseite, rest of the round, summary, Noch eine Runde, a 30-word round, keyboard answers — × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 (sideways) × dark / light, plus Russian with reduced motion: **pixel-identical** screenshots, same position and style for every element, same saved data (difficulty, daily stats, progress). Only difference: the buttons' font list now also names Arial as the last fallback (never reached on Apple devices).
- **Removed:** `Artikel/words_old.js`, `Artikel/words_old2.js` (linked from nowhere; in git history).
- **Cache numbers:** `artikel.css?v=1`, `artikel.js?v=1`, Home tile `artikel/?v=2.21`, Home 5.75. **Rule:** when `artikel.css` or `artikel.js` changes, raise its `?v=` in `artikel/index.html` and the Home tile's `artikel/?v=`.
- **Upload to GitHub:** `artikel/index.html`, `artikel/artikel.css` (new), `artikel/artikel.js` (new), root `index.html` (Home). `components/deutsch-day-v1.js` is already there (Home 5.73). Delete `artikel/words_old.js`, `artikel/words_old2.js` there if they exist.

### Groundwork for later: one shared stylesheet for all exercises

- Splitting each exercise into `index.html` / `<name>.css` / `<name>.js` is mainly for consistency (every cleaned page is built the same way), readable code and clear git history.
- It also prepares the next step: Artikel's palette (block „shared across exercises (Design Police 2026-09-25)“), the page shell (`.app` scroll panel, no top padding with a sticky bar), the top bar, the quiet Weiter button and the summary buttons are the same in the other exercises (blueprint: Partizip II). **Once a few more exercises are cleaned up the same way,** these parts can move into one shared file, e.g. `components/deutsch-exercise-v1.css`, so a design change is made once instead of in every exercise. Not before — first see what really is identical after each clean-up.

### Open task: clean up the Artikel word list (`Artikel/words.js`)

- **Now:** every noun carries its own copy of its rule's texts (`ruleLabel`, `explanation`, `examples`, `reliability`) — 251 copies of 53 rule groups, 102 KB.
- **Drift found:** the copies are no longer identical. Nouns added later got different wording in 8 groups (-ment, -um, -ium, -ma, -e → die, -e exceptions (der / das), beverage exception), e.g. -ment: „Many borrowed nouns ending in -ment are neuter.“ vs „Nouns ending in -ment are usually neuter.“ Example lists also differ within most groups.
- **Plan:** store each rule once (a `RULES` list: label, article, type, explanation, examples, reliability) and give each noun only word, article, translation and its rule id. One place to edit a rule; the file shrinks to roughly a third.
- **Decide first:** which wording to keep for the 8 drifted groups, and whether the examples should stay the same for all nouns of a rule or deliberately vary.
- **Keep unchanged:** the progress keys (`rule:<ruleLabel>|<article>` and `word:<article>|<word>`) and the difficulty keys (`<article>|<word>`), so saved progress and old backups stay valid. Also fix the counts in `PROGRESS_TRACKER.md` (still says 238 nouns / 60 items; now 251 nouns / 71 progress items).

## Pronomen · clean-up, page shell, bug fixes, one date helper, own CSS/JS files (2026-09-27, Pronomen v7.39, Home 5.76)

- **Why:** the same review as Home 5.73, Wortschatz v2.108 and Artikel v27. Pronomen was one 626-line `index.html` (≈260 lines of styles, ≈300 of script, mostly on very long lines), with 11 Design Police / table blocks overriding the original rules and its own date function. It also still had the old page (the whole page scrolled, `min-height:690px`).
- **Page shell (same as Artikel v25/v26):** page locked, `.app` is the scroll panel and scrolls only when the content is taller than the screen. `min-height:690px` (screens) and `600px` (question area) removed. `.app` has **no top padding** (sticky-bar rule); the status-bar space is on the screens (start/summary: status bar + 28px, game: + 23px). The strip above the sticky bar is covered while scrolling. Short screens (`max-height 559px`, or `max-width 340px` and `max-height 609px`): „Worum geht's?“ and the version follow the content — at 320×568 the description used to cover the „Pronomen · Tabelle“ button.
- **Table window:** the layer fills the screen exactly (`inset:0`, like Wortschatz v2.107) instead of reaching past the top edge; the card stays in the same place. **Esc closes it** (the table-window rule said so, Pronomen didn't do it).
- **Bugs fixed:**
  - *Enter skipped a feedback (computer):* after clicking Weiter with the mouse, Enter on the next answer showed the feedback and moved on at once; a focused Weiter + Enter moved on twice. Now the key is handled once (`preventDefault`). Reproduced before, checked after.
  - The typed answer was put into the feedback as HTML (typing `<` could garble it) — now plain text.
  - Cmd/Ctrl shortcuts (e.g. Cmd+C) added their letter to the answer; typing while the table was open went into the answer. Both ignored now. Option stays allowed (Option+s = ß on a Mac).
  - Saving the daily count can't throw any more (like the other exercises).
- **„Noch üben“ (summary):** readable names instead of the stored keys — the same wording as the grey line under an answer: „Personal · Dativ · Sie → Ihnen“, „Possessiv · wir → unser“, „Possessiv · ihr → euer · Akkusativ · Feminin“ (was „personal · Personal · …“, „root · Possessiv · wir →“, „detail · …“). The stored stats are unchanged.
- **Styles:** every element described once, one palette per theme at the top. Same colours under one name, the same names as Artikel/Wortschatz: `--hairline` (was `--line`, `--start-line`, `--bar-track`, `--field-line`, `--quiet-line`, `--overlay-line`, `--end-again-line`), `--field-bg` (typing field + Weiter, was also `--quiet-bg`), `--card-bg` (10/20/30 + table window, was `--start-btn-bg`, `--overlay-card`), `--text-secondary` (table button + „Noch üben“, was `--start-table-text`, `--weak-text`), `--game-title`, one `--font`. Removed: always-overridden looks and colours (`--surface(-2)`, `--key`, `--cta-*`, `--home-*`, `--modal-scrim`, `--divider`, `--in-session-line`, `--tertiary/secondary/placeholder-text`, `--version-text`, `--hot-text`), dead rules (`.version`, `.table-subtitle`, no-op `:hover` rules, unused caret keyframes), unused `isWeak()`. Markup: `btn secondary start-table-btn` → `table-btn`, `#home` → `#playAgain` (it is „Noch eine Runde“), `correctText` class → `correct-text`.
- **One date helper:** daily stats and session dates use `DeutschDay.key()` (`../components/deutsch-day-v1.js?v=1` is now loaded). Same result as the old `localDateKey()`.
- **Own files:** `index.html` = markup only (100 lines), `pronomen.css`, `pronomen.js` (Prettier). The theme script stays inline in `<head>`. The start-screen description moved into `pronomen.js`. The reference table is built from small lists (persons, cases, endings) — the generated HTML is byte-identical to the old one. **`pronouns.js` renamed to `sentences.js`** (content unchanged, so git keeps its history; `window.PRONOUN_EXERCISES` as before) to avoid `pronomen.js` / `pronouns.js`.
- **Checked:** 345 states — start, table (+ endings, + marks), question, typed, right, wrong, possessive, pressed Weiter, in-game table, summary (with and without „Noch üben“), again — × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light × fresh / with recent mistakes, plus Russian with reduced motion and a simulated 59px status bar: same position and style for every element, same saved data (session stats, progress, daily stats). Only differences: the intended ones above. Also checked inside Home: „‹“ follows the title in the game, the strip darkens while the table is open.
- **Leftovers:** `pronomen/a36dfa8e….png` (1.5 MB) and `pronomen/icon_fav.webp` (linked from nowhere) moved into `pronomen/Artwork/` (out of git).
- **Cache numbers:** `pronomen.css?v=1`, `pronomen.js?v=1`, `sentences.js?v=1`, Home tile `pronomen/?v=25`, Home 5.76. **Rule:** when `pronomen.css`, `pronomen.js` or `sentences.js` changes, raise its `?v=` in `pronomen/index.html` and the Home tile's `pronomen/?v=`.
- **Upload to GitHub:** `pronomen/index.html`, `pronomen/pronomen.css` (new), `pronomen/pronomen.js` (new), `pronomen/sentences.js` (new name), root `index.html` (Home). Delete `pronomen/pronouns.js`, `pronomen/a36dfa8e….png` and `pronomen/icon_fav.webp` there if they exist. `components/deutsch-day-v1.js` is already there.
- **Shared stylesheet (see Artikel → groundwork):** three exercises are now cleaned. Already identical in Artikel and Pronomen: palette names and values, page shell, short-screen rule, top bar, „Worum geht's?“, version mark, summary buttons, Weiter/Prüfen shape. Still different: panel width (Pronomen 760px, Artikel 720px) and bottom padding, the start buttons' class names. Worth moving into one file after one or two more exercises.

## Partizip II · clean-up, bug fixes, short screens, own CSS/JS files (2026-09-27, Partizip II v55, Home 5.77)

- **Why:** the same review as Home 5.73, Wortschatz v2.108, Artikel v27 and Pronomen v7.39 — first page of the Verbformen chapter (then Modalverben, then the chapter page). Partizip II was one 736-line `index.html`: ≈360 lines of styles with 10 Design Police blocks overriding the original rules, ≈280 lines of script. Its page shell was already the blueprint for the others, so no shell rebuild was needed. It has no date function of its own (Home counts the answers), so no date helper either.
- **Bugs fixed** (each reproduced in the browser before, checked after):
  - *Enter after „Noch eine Runde“ (computer):* the summary opened on top of the start screen (the „answer checked“ state was never reset). Keys now only act during a round.
  - *Enter behind the open table:* with the answer showing, Enter moved to the next verb while the table stayed open. While the table is open, keys do nothing except Esc (closes it).
  - *Enter didn't press a focused button* (10/20/30, Noch eine Runde, Zur Startseite …) — only Space did. Works now; Enter on a focused Prüfen checks the answer; holding Enter no longer races through the verbs.
  - *After closing the table the typing field had lost focus* (computer): you had to click into it before typing. The cursor now goes back to the field.
  - *If saving failed* (storage full or blocked), the answer was counted but the feedback never appeared and the round got stuck. Saving can't throw any more (like the other exercises).
  - *Short screens* (320×568, phone sideways, large text): the „Vokalwechsel · Tabelle“ pill covered keys of the on-screen keyboard (ü, space) and part of Weiter — tapping Weiter's middle opened the table; sideways, „Worum geht's?“ covered the 10/20/30 buttons. Now the same short-screen rule as Artikel/Pronomen (`max-height 559px`, or `max-width 340px` and `max-height 609px`): description, version number and the table pill follow the content instead of being pinned to the bottom. Normal phone and computer screens are unchanged.
  - *Scroll position carried over* (short screens only): a new verb, the summary and the start screen kept the previous scroll position, so the next verb could start half under the top bar. Every screen and every new verb now starts at the top.
- **Page shell — sticky-bar rule applied:** `.app` has no top padding any more; the top space (status bar + gap, `--shell-top`) is on the screens and in the sticky offsets, so Safari and Chrome put the top bar in the same place while scrolling (the rule from Artikel v26). The background strip above the top bar now belongs to the round screen and also exists on wide screens (phone sideways), so scrolled content never shows above the bar.
- **Table window:** the layer fills the screen exactly (`inset:0`, like Wortschatz v2.107 / Pronomen) instead of reaching past the top edge; the card stays in the same place (on phones the extra space moved to the bottom padding). The table is now built from a short list (`VOWEL_CHANGES` in `partizipII.js`) — the HTML is byte-identical to the old hand-written block, the table looks exactly the same. Content unchanged (decision E4 in `QA_02`: keep as is).
- **Styles:** every element described once, one palette per theme at the top, the same colour names as Artikel/Pronomen/Wortschatz: `--hairline` (was `--start-line`, `--end-again-line`, `--bar-track`, `--field-line`, `--quiet-line`, `--overlay-line`, `--modal-border`), `--card-bg` (was `--start-btn-bg`, `--overlay-card`), `--field-bg` (typing field + Weiter, was also `--quiet-bg`), `--text-secondary` (table button, was `--start-table-text`), `--muted` (was also `--muted-2`, `--secondary-text`, `--dim-text`, `--vowel-text`), `--text` (was `--cream`), `--red` (was `--coral`), one `--font` and one `--serif`. Removed: always-overridden looks and colours (`--surface(-2/3/4)`, `--border(-2/3)`, `--border-hover`, `--cta-*`, `--again-*`, `--modal-scrim`, `--brand-text`, `--tertiary-text`, `--placeholder-text`, `--score-text`, `--track`, `--pattern-btn-line`, `--version-text`), the unused `.version-tag` rule and `fieldCaret` animation, no-op `:hover` rules. Markup: `again` → `#playAgain` (like Pronomen), classes `start`, `finish`, `answer`, `check`, `next`, `verb`, `home-back` removed (styled by id). The Perfekt line is built as text + `<b>` instead of HTML.
- **`verbs.js`:** the 6 modal verbs (unused — excluded from this exercise; Modalverben has its own `special_verbs.js`) and the unused `priority` field removed. 77 verbs, content otherwise unchanged; the progress keys and difficulty keys (infinitive in lower case) are the same, so saved progress and old backups stay valid.
- **Own files:** `index.html` = markup only (99 lines), `partizipII.css`, `partizipII.js` (Prettier). The theme script stays inline in `<head>` (must run before the first paint). The start-screen description moved into `partizipII.js`; „Worum geht's?“ and the version number moved inside `.app` (needed for the short-screen rule).
- **Checked:** 221 states — start, table, pressed 10, question, typed, right, pressed Weiter, wrong, wrong scrolled, sein (Präteritum shown), haben, table during a round, the rest of the round, summary, Noch eine Runde, starting a 20-round — × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus Russian with reduced motion, Russian on the computer and a simulated 59px status bar. On 375×667, 390×844 and 1024×800 (and with the status bar): **pixel-identical** except the version number; same saved data everywhere (difficulty, progress). The only visual changes are on the short screens (intended, above). Also checked inside Home: „‹“ follows the title, the strip darkens while the table is open, Zur Startseite closes the exercise.
- **Cache numbers:** `partizipII.css?v=1`, `partizipII.js?v=1`, `verbs.js?v=5`, Verbformen page link `partizipII/?v=14`, Home tile `verbformen/?v=2.14`, Home 5.77. **Rule:** when `partizipII.css`, `partizipII.js` or `verbs.js` changes, raise its `?v=` in `partizipII/index.html`, the Verbformen page's `partizipII/?v=` and the Home tile's `verbformen/?v=` (three levels).
- **Upload to GitHub:** `verbformen/partizipII/index.html`, `verbformen/partizipII/partizipII.css` (new), `verbformen/partizipII/partizipII.js` (new), `verbformen/partizipII/verbs.js`, `verbformen/index.html` (Verbformen page), root `index.html` (Home).
- **Noticed, not changed (for later rounds):**
  - Pronomen has the same fixed table pill during a round and the same on-screen keyboard, so it most likely covers keys on 320×568 / sideways too — check and fix in the same way (Modalverben as well).
  - The Vokalwechsel table still lists *ö → o* and *ü → ü · u*, which only occurred in the modal verbs (QA E4, kept on purpose; *ü → o* is real: lügen). With the modal verbs now gone from `verbs.js`, worth a second look.
  - ~~`verbformen/` (chapter page folder) holds unused pictures~~ → moved to `verbformen/Artwork/` in the chapter-page round (Verbformen page v11).
- **Shared stylesheet (see Artikel → groundwork):** four exercises cleaned. Identical in Artikel, Pronomen and Partizip II now: palette names and values for the shared colours, `--font`, the short-screen rule, „Worum geht's?“, version mark, summary buttons, Weiter/Prüfen shape and press effect, table-window look. Still different: panel width (Partizip II 480px, Artikel 720px, Pronomen 760px), how the top space is set (Partizip II `--shell-top` on every screen), the start buttons' class names (`.choice` / `.size`), the table button's class (`.pattern-table-btn` / `.table-btn`). Worth moving into one file after Modalverben.

## Modalverben · clean-up, bug fixes, short screens, own CSS/JS files (2026-09-27, Modalverben v13, Home 5.78)

- **Why:** the same review as Home 5.73, Wortschatz v2.108, Artikel v27, Pronomen v7.39 and Partizip II v55 — second page of the Verbformen chapter (next: the chapter page). Modalverben was one 882-line `index.html`: ≈340 lines of styles with 11 Design Police blocks overriding the original rules and ≈45 colour variables (many duplicates), ≈450 lines of script; `special_verbs.js` was one 58 KB line. No date function of its own (Home counts the answers), so no date helper.
- **Bugs fixed** (each reproduced in the browser on v12, checked on v13):
  - *Enter after „Noch eine Runde“ (computer):* the summary opened on top of the start screen. Keys now only act during a round.
  - *Enter behind the open table:* with the answer showing, Enter moved to the next sentence while the table stayed open. While the table is open, keys do nothing except Esc (closes it).
  - *Enter didn't press a focused button* (10/20/30, Noch eine Runde, Zur Startseite). Works now; Enter on a focused Prüfen checks the answer. Holding Enter is guarded too (in v12 it didn't race through sentences only because the field was still empty).
  - *After closing the table the typing field had lost focus* (computer). The cursor now goes back to the field.
  - *If saving failed* (storage full or blocked), the answer was counted but the feedback never appeared and the round got stuck. Saving can't throw any more.
  - *Backspace on phones* was blocked on the start and summary screens too. Now only during a round.
  - *× and „Zurücksetzen“ in the table* set no font and fell back to Arial on the computer (font rule). Now the system font.
  - *Short screens* (320×568, phone sideways, large text): the „Formen · Tabelle“ pill covered the keys C V B N of the on-screen keyboard; sideways, „Worum geht's?“ covered the 10/20/30 buttons. Now the short-screen rule of Artikel/Pronomen/Partizip II (`max-height 559px`, or `max-width 340px` and `max-height 609px`): description, version number and the table pill follow the content. Normal phone and computer screens are unchanged.
  - *Scroll position carried over* (short screens): every screen and every new sentence now starts at the top.
  - *The card glow caught taps* (found during testing): the soft mint glow behind the question reaches 100px past the card; on short screens, where the table pill now sits right below the card after an answer, it swallowed the tap. The glow no longer catches taps (`pointer-events:none`).
- **Page shell — sticky-bar rule applied:** `.app` has no top padding; the top space (`--shell-top`) is on the screens and in the sticky offsets (Artikel v26 rule, same as Partizip II). The background strip above the top bar belongs to the round screen and also exists on wide screens (phone sideways).
- **Table window:** the layer fills the screen exactly (`inset:0`) instead of reaching past the top edge; the card stays in exactly the same place. Content and look unchanged.
- **Styles:** every element described once, one palette per theme at the top, the same colour names as Partizip II: `--text` (was `--cream`), `--red` (was `--coral`), `--muted` (was also `--muted-2`, `--secondary-text`, `--detail-text`), `--hairline` (was `--start-line`, `--end-again-line`, `--bar-track`, `--field-line`, `--quiet-line`, `--overlay-line`, `--modal-border`, `--forms-btn-line`), `--card-bg` (was `--start-btn-bg`, `--overlay-card`), `--field-bg` (typing field + Weiter, was also `--quiet-bg`), `--text-secondary` (was `--start-table-text`), `--result-line` (was `--line`), `--cell-line` / `--cell-bg` (table, were `--line-2` / `--subtle-fill`), one `--font` and one `--serif`. Removed: always-overridden looks and colours (`--surface(-2/3/4)`, `--border(-2/3)`, `--border-hover`, `--track`, `--cta-*`, `--again-*`, `--modal-scrim`, `--brand-text`, `--tertiary-text`, `--placeholder-text`), the unused `fieldCaret` animation, no-op `:hover` rules. Markup: `#again` → `#playAgain` (like Partizip II / Pronomen); classes `start`, `finish`, `verb`, `answer`, `check`, `next`, `again`, `home-back` removed (styled by id). The crossed-out wrong answer is built as text instead of HTML.
- **`special_verbs.js`:** formatted with Prettier (one entry per block) + a header comment. Content unchanged (144 sentences, same data checked byte for byte), name kept. The 7 sentences without „___“ stay as they are: a sentence's difficulty is stored under `infinitive|form|sentence`, so changing its text would reset it.
- **Progress counting stays per form (decided 2026-09-27):** 26 items (verb + form), each counted once however many sentences it has (2–8). The bar shows how many *forms* you know, not how many sentences — so no weighting by sentences (unlike Artikel, where the nouns themselves are learned). `PROGRESS_TRACKER.md` corrected (it said „15 items of exactly 8 sentences“).
- **Own files:** `index.html` = markup only (97 lines), `modalverben.css`, `modalverben.js` (Prettier). The theme script stays inline in `<head>`. The start-screen description moved into `modalverben.js`. The table window stays outside `.app` (so its blur also covers the description and version number, as before).
- **Checked:** 13 setups × 19 states (start, table: scheme / a verb / mögen + werden / folded, question, typed, right, right scrolled, wrong, wrong scrolled, table during a round, later sentences, summary, Noch eine Runde) — 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus Russian with reduced motion, Russian on the computer and a simulated 59px status bar. On 375×667, 390×844, 1024×800 and with the status bar: **identical** to v12 except the version number (a few pixels of anti-aliasing noise, at most 5/255); **same saved data everywhere** (difficulty, progress). Visual changes only on the short screens (intended, above). Also checked inside Home: „‹“ follows the title, the strip darkens while the table is open, Zur Startseite closes the exercise, the daily count still arrives.
- **Cache numbers:** `modalverben.css?v=1`, `modalverben.js?v=1`, `special_verbs.js?v=5`, Verbformen page link `modalverben/?v=16`, Home tile `verbformen/?v=2.15`, Home 5.78. **Rule:** when `modalverben.css`, `modalverben.js` or `special_verbs.js` changes, raise its `?v=` in `modalverben/index.html`, the Verbformen page's `modalverben/?v=` and the Home tile's `verbformen/?v=` (three levels).
- **Upload to GitHub:** `verbformen/modalverben/index.html`, `verbformen/modalverben/modalverben.css` (new), `verbformen/modalverben/modalverben.js` (new), `verbformen/modalverben/special_verbs.js`, `verbformen/index.html` (Verbformen page), root `index.html` (Home).
- **Noticed, not changed (for later rounds):**
  - ~~Partizip II v55 has the same glow bug~~ → **fixed in Partizip II v56** (below). Pronomen checked: it has no card glow, not affected.
  - **Design round — Formen table** (keep for later, not a clean-up): very small text (9–11px: column heads, „Zurücksetzen“, intro, ø note), the intro says „Klicke …“ (on a phone „Tippe …“ would fit), the whole group row is a hover target on the computer only.
- **Shared stylesheet (see Artikel → groundwork):** five exercises cleaned. Modalverben and Partizip II now share the page shell, `--shell-top`, the top bar, the short-screen rule, „Worum geht's?“, version mark, typing field, Prüfen/Weiter, summary buttons, table-window look and the colour names — almost line for line. Still different: panel width (both 480px, Artikel 720px, Pronomen 760px), the table button's class (`.forms-table-btn` / `.pattern-table-btn` / `.table-btn`) and its wrapper, the start buttons' class (`.choice` / `.size`). Good moment to move the common part into one file — next step after the Verbformen chapter page.

### Partizip II: table button tappable again on short screens (2026-09-27, Partizip II v56, Home 5.79)

- **Symptom (v55):** on short screens (320×568, phone sideways) the „Vokalwechsel · Tabelle“ button did nothing after an answer.
- **Cause:** the soft mint glow behind the question card (`.card::before`) reaches 100px past the card and caught taps. Since v55 the button follows the content on short screens, and after an answer (keyboard hidden) it sits right below the card — inside the glow. Found while testing Modalverben v13, which had the same glow.
- **Fix:** the glow no longer catches taps (`pointer-events:none`). Nothing looks different: screenshots identical to v55 on 390×844, 1024×800, 320×568 and 667×375, dark and light; the button opens the table again on 320×568 and 667×375. No other exercise has this glow.
- **Cache numbers:** `partizipII.css?v=2`, Verbformen page link `partizipII/?v=15`, Home tile `verbformen/?v=2.16`, Home 5.79.
- **Upload to GitHub:** `verbformen/partizipII/index.html`, `verbformen/partizipII/partizipII.css`, `verbformen/index.html` (Verbformen page), root `index.html` (Home). If Modalverben v13 isn't uploaded yet, upload both rounds together (same Verbformen page and Home files).

## Ortspräpositionen · clean-up, bug fixes, short screens, own CSS/JS files (2026-09-27, Ortspräpositionen v23, Home 5.80)

- **Why:** the same review as Home 5.73, Wortschatz v2.108, Artikel v27, Pronomen v7.39, Partizip II v55 and Modalverben v13 — first page of the Präpositionen chapter (next: Fester Kasus, Verben mit Präpositionen, then the chapter page). Ortspräpositionen was one 746-line `index.html`: ≈380 lines of styles with 9 Design Police blocks overriding the original rules, ≈340 lines of script, its own date function and the old page (the whole page scrolled).
- **Bugs fixed** (each reproduced in the browser on v22, checked on v23):
  - *Keys behind the open table (computer):* 1–5 answered and Enter moved to the next card while the table was open. While the table is open, keys do nothing except Esc (closes it).
  - *Cmd/Ctrl + 1–5* (switching browser tabs) also picked an answer. Cmd/Ctrl/Option combinations are now left to the browser.
  - *Enter on the focused table button* after a card moved on instead of opening the table. Enter / Space there now open the table; elsewhere they continue as before (handled once, no double step).
  - *Short screens* (320×568, phone sideways, large text): the „Orte · Tabelle“ pill was pinned to the bottom and covered the answer buttons „beim“ / „zum“ (320×568), the notes below Weiter (320×568) and the middle of Weiter (sideways — tapping Weiter opened the table); on the start screen sideways, „Worum geht's?“ ran into the table button and the version number. Now the short-screen rule of the other exercises (`max-height 559px`, or `max-width 340px` and `max-height 609px`): description, version number and the table pill follow the content. Normal phone and computer screens are unchanged.
- **Page shell (same as Partizip II / Modalverben):** page locked, `.app` is the scroll panel and scrolls only when the content is taller than the screen. `.app` has **no top and no bottom padding**: the top space (`--shell-top`: `clamp(20px, 5vw, 38px)`, phones `status bar + 10px`, the same values as before) is on the screens, the 36px at the bottom is `.app::after`. Reason for the bottom: on phones the answer buttons stick to the bottom of the panel (`position:sticky; bottom:10px`), and Safari measures sticky offsets from inside the scroller's padding (the Artikel v26 rule, here for the bottom edge). Every screen and every new card starts at the top of the panel.
- **Styles:** every element described once, one palette per theme at the top, the shared colour names: `--card-bg` (was `--start-btn-bg`, `--overlay-card`, `--panel`), `--hairline` (was `--start-line`, `--bar-track`, `--quiet-line`, `--overlay-line`, `--end-again-line`), `--field-bg` (Weiter, was `--quiet-bg`), `--text-secondary` (was also `--start-table-text`), `--red` (was `--coral`), one `--font` and one `--serif`. Own names kept for Ortspräpositionen's rows: `--row-line` (was `--line`, 9 %), `--row-bg` (was `--step-bg`), `--line-strong`. Removed: the old table layout (`.otbl`, 11 rules — replaced by `.otbl2` in v21), the red dots (`.ohot`, replaced in v22), `.onote`, always-overridden looks and colours (`--button-*`, `--cta-*`, `--secondary-*`, `--version`, `--progress`, `--top-title`, `--panel(-2)`, `--card-sheen`, `--good-glow`, `--bad-glow`, `--shadow`, `--blue`, first `.version-mark`, first `.table-btn`, hover rules that were always cancelled). Markup: `#again` → `#playAgain` (like the other exercises); classes `session-screen`, `end-screen`, `again`, `home-back`, `next` removed (styled by id); the table no longer adds the unused `long` class.
- **One date helper:** the daily stats use `DeutschDay.key()` (`../../components/deutsch-day-v1.js?v=1` is now loaded). Same result as the old `localDayKey()`.
- **Own files:** `index.html` = markup only (94 lines), `ortspraepositionen.css`, `ortspraepositionen.js` (Prettier). The theme script stays inline in `<head>`. The start-screen description moved into the script. Script grouped into sections (questions + buttons, notes below Weiter, difficulty, progress, daily stats, session, screens, question, answer, table window, back to Home, taps, keys).
- **Data file renamed: `ortspraepositionen.js` → `places.js`** (decided 2026-09-27; frees the name for the script, same move as `pronouns.js` → `sentences.js`). Own commit with the content unchanged, so git keeps its history (`git log --follow`); then formatted with Prettier (one entry per block) + header comment. Data checked identical (all 66 places, 10 rule groups, hint texts). Place `id`s (difficulty keys) and category keys (progress keys `cat:<key>`) unchanged, so saved progress and old backups stay valid.
- **Checked:** 18 states (start, table, question, after line 1 and 2, done right, done wrong with zu/von hints (+ scrolled), table during a round with mistake markers, „Auch richtig“ (Arbeit), Toilette note, a long place (Goethestraße), Bahnhof „an den“ hint, summary, Noch eine Runde, table with markers) × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus Russian with reduced motion, Russian on the computer and a simulated 59px status bar. On 375×667, 390×844, 1024×800 and with the status bar: **pixel-identical** except the version number; **same saved data everywhere** (difficulty, progress, daily stats). Visual changes only on the short screens (intended, above). Also checked inside Home: „‹“ sits at the title and follows it when the panel scrolls, the strip darkens while the table is open, Zur Startseite closes the exercise, the daily count arrives. Test note: inside the new scroll panel Chrome draws text with grey instead of coloured (LCD) edge smoothing — the comparison was made with LCD text off; Apple devices already use grey smoothing (`-webkit-font-smoothing: antialiased`).
- **Cache numbers:** `ortspraepositionen.css?v=1`, `ortspraepositionen.js?v=1`, `places.js?v=1`, Präpositionen page link `ortspraepositionen/index.html?v=27`, Home tile `praepositionen/?v=22`, Home 5.80. **Rule:** when `ortspraepositionen.css`, `ortspraepositionen.js` or `places.js` changes, raise its `?v=` in `ortspraepositionen/index.html`, the Präpositionen page's `ortspraepositionen/index.html?v=` and the Home tile's `praepositionen/?v=` (three levels).
- **Upload to GitHub:** `praepositionen/ortspraepositionen/index.html`, `praepositionen/ortspraepositionen/ortspraepositionen.css` (new), `praepositionen/ortspraepositionen/ortspraepositionen.js` (**new content** — now the script, no longer the data), `praepositionen/ortspraepositionen/places.js` (new name), `praepositionen/index.html` (Präpositionen page), root `index.html` (Home). `components/deutsch-day-v1.js` is already there. Upload all six together: the old page would load the new `ortspraepositionen.js` as data.
- **Noticed, not changed (for later rounds):**
  - **Table labels drift from the rule groups** (kept on purpose, 2026-09-27 — remind later): the table's own row labels (`TABLE_ROWS` in `ortspraepositionen.js`) no longer match `ORTS_KATEGORIEN` in `places.js`, e.g. table „Person, Firma, Aktivität“ vs group „Person, Geschäft, Aktivität, Nähe“, „Wasser, Kontakt“ vs „Kontakt, „Wasser““, „am Ort“ vs „Bahnhof, Haltestelle, Kasse (am Ort)“, „offene Fläche“ vs „Offene Fläche“. „Straße als Adresse“ (Goethestraße) has no table row. Decide one wording, then either write it once or build the table labels from the groups. Content change, so not part of a clean-up.
  - **Phone sideways:** the answer buttons are below the screen edge and need a scroll (they stick to the bottom only up to 520px width). Same as before; worth a look in a design round.
- **Shared stylesheet (see Artikel → groundwork):** six exercises cleaned. **Decided 2026-09-27:** move the common part into one file only after all pages are cleaned (Fester Kasus, Verben mit Präpositionen and both chapter pages still to do), as one separate round tested on every exercise at once. Ortspräpositionen now shares the page shell, short-screen rule, „Worum geht's?“, version mark, table button, summary buttons, Weiter, table-window look and the colour names with Partizip II / Modalverben (same order and wording as `partizipII.css`). Still different: panel width (620px), no sticky top bar, the start buttons' class (`.session-option`), and **`.choice` means the answer buttons here** but the 10/20/30 buttons in Partizip II / Modalverben — settle the names in the shared-stylesheet round.

## Fester Kasus · clean-up, bug fixes, short screens, own CSS/JS files (2026-09-27, Fester Kasus v19, Home 5.81)

- **Why:** the same review as Home 5.73, Wortschatz v2.108, Artikel v27, Pronomen v7.39, Partizip II v55, Modalverben v13 and Ortspräpositionen v23 — second page of the Präpositionen chapter (next: Verben mit Präpositionen, then the chapter page). Fester Kasus was one 544-line `index.html`: ≈270 lines of styles with 8 Design Police blocks overriding the original rules, ≈230 lines of script, its own date function and the old page (the whole page scrolled, `min-height:100vh`).
- **Bugs fixed** (each reproduced in the browser on v18, checked on v19):
  - *Cmd/Ctrl + 1–3* (switching browser tabs) also picked an answer. Cmd/Ctrl/Option combinations are now left to the browser.
  - *Phone sideways, start screen:* „Worum geht's?“ lay on top of the 10/20/30 buttons.
  - *Phone sideways, after an answer:* the page stayed scrolled down from tapping the answer buttons, so the top of the answer card — „Richtig“ / „Nicht ganz“ and the preposition — was cut off. Every screen, every new card and every answer now starts at the top of the panel.
  - *Phone sideways, summary:* the version number sat behind „Zur Startseite“.
  - Now the short-screen rule of the other exercises (`max-height 559px`, or `max-width 340px` and `max-height 609px`): description and version number follow the content. Normal phone and computer screens are unchanged.
  - Holding Enter after an answer no longer moves on again (key handled once, like Ortspräpositionen).
- **Page shell (same as Ortspräpositionen):** page locked, `.app` is the scroll panel and scrolls only when the content is taller than the screen. `.app` has **no top and no bottom padding**: the top space (`--shell-top`, same values as before) is on the screens, the 36px at the bottom is `.app::after` (on phones the answer buttons stick to the bottom of the panel — Safari measures sticky offsets from inside the scroller's padding).
- **Styles:** every element described once, one palette per theme at the top, the shared colour names: `--card-bg` (was also `--start-btn-bg`), `--hairline` (was `--start-line`, `--bar-track`, `--quiet-line`, `--end-again-line`), `--field-bg` (Weiter, was `--quiet-bg`), `--red` (was `--coral`), one `--font` and one `--serif`. Own names kept: `--blue` / `--special-glow` (the blue „Auch möglich“ / „Umgangssprachlich“ answer), `--divider` (the short 9 % line between preposition and case, was `--line`), `--card-lift`. The question card and the answer card share one rule (same look and height). Removed: always-overridden looks and colours (`--panel(-2)`, `--button-*`, `--cta-*`, `--secondary-*`, `--version`, `--progress`, `--top-title`, `--card-sheen`, `--shadow`, `--start-line`, `--start-table-text`, `--end-again-bg`, `--bar-track`, `--quiet-*`), no-op hover rules, the 19px answer-button size on phones (never applied — always overridden by 17px), the separate „pressed“ shadow of the 10/20/30 buttons (only reachable by pressing Space on a focused button; now the same press effect as a tap). Markup: `#again` → `#playAgain` (like the other exercises); classes `session-screen`, `end-screen`, `again`, `home-back`, `next` removed (styled by id). The crossed-out wrong answer is built as text instead of HTML.
- **One date helper:** the daily stats use `DeutschDay.key()` (`../../components/deutsch-day-v1.js?v=1` is now loaded). Same result as the old `localDayKey()`.
- **Own files:** `index.html` = markup only (89 lines), `kasus.css`, `kasus.js`. The theme script stays inline in `<head>` (now guarded like the others). The start-screen description moved into the script. Script grouped into sections (description, difficulty, progress, daily stats, session, screens, question, answer, reveal animation, back to Home, taps, keys). ~~**Prettier was not reachable this time**~~ → done 2026-09-27 (see *Chapter pages* below): `kasus.js` and `prepositions.js` reformatted, whitespace only; `kasus.js?v=2`, `prepositions.js?v=12`.
- **Data file renamed: `praepositionen.js` → `prepositions.js`** (decided 2026-09-27, like `places.js` / `sentences.js`). Own commit with the content unchanged, so git keeps its history (`git log --follow`); then reformatted (one block per preposition, short objects on one line) + English header comment with the fields (the Russian comments and the outdated „Loaded by kasus.html“ are gone). Data checked identical (all 32 prepositions, key order included). `window.PRAEPOSITIONEN` kept; prepositions unchanged, so the difficulty keys and progress keys (preposition in lower case) stay the same and saved progress and old backups stay valid.
- **Checked:** 33 states (start, 10 cards × question / answer / answer scrolled to the bottom — right, blue „Umgangssprachlich“ (wegen), wrong (außerhalb), blue „Auch möglich“ (laut), note (bis), long words (entlang …, statt / anstatt, gegenüber, angesichts), answers by tap and by keys 1–3, Weiter by tap and by Enter — summary, Noch eine Runde) × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus Russian with reduced motion, Russian on the computer and a simulated 59px status bar. On 375×667, 390×844, 1024×800 and with the status bar: **identical** except the version number (anti-aliasing noise at most 2/255); **same saved data everywhere** (difficulty, progress, daily stats). Visual changes only on the short screens (intended, above). Keys: Cmd/Ctrl + 1–3 ignored; focused Weiter + Enter moves one card; Enter on a focused „Noch eine Runde“ works. Also checked inside Home: „‹ Präpositionen“ sits at the title and follows it, Zur Startseite closes the exercise, the daily count arrives.
- **Cache numbers:** `kasus.css?v=1`, `kasus.js?v=1`, `prepositions.js?v=11`, Präpositionen page link `kasus/index.html?v=21`, Home tile `praepositionen/?v=23`, Home 5.81. **Rule:** when `kasus.css`, `kasus.js` or `prepositions.js` changes, raise its `?v=` in `kasus/index.html`, the Präpositionen page's `kasus/index.html?v=` and the Home tile's `praepositionen/?v=` (three levels).
- **Upload to GitHub:** `praepositionen/kasus/index.html`, `praepositionen/kasus/kasus.css` (new), `praepositionen/kasus/kasus.js` (new), `praepositionen/kasus/prepositions.js` (new name), `praepositionen/index.html` (Präpositionen page), root `index.html` (Home). Delete `praepositionen/kasus/praepositionen.js` there. `components/deutsch-day-v1.js` is already there. Upload all together: the old page would look for `praepositionen.js`.
- **Noticed, not changed (for later rounds):**
  - **Summary inside Home:** the „‹ Präpositionen“ back button runs into the big „Fertig.“ (same in v18). The summary uses the same top space as Ortspräpositionen and the others — check all summaries in the shared-stylesheet round.
  - **Phone sideways:** the answer buttons are below the screen edge and need a scroll (they stick to the bottom only up to 520px width), same as Ortspräpositionen. Design round.
- **Shared stylesheet (see Artikel → groundwork):** seven exercises cleaned. Fester Kasus now shares the page shell, short-screen rule, „Worum geht's?“, version mark, 10/20/30 buttons (`.session-option`, like Ortspräpositionen), summary buttons, Weiter and the colour names with Ortspräpositionen (same order and wording as `ortspraepositionen.css`); its word card is shared with Artikel. Still different: the answer buttons' class (`.case-choice` here, `.choice` in Ortspräpositionen — settle in the shared-stylesheet round).

## Verben mit Präpositionen · clean-up, bug fixes, short screens, own CSS/JS files (2026-09-27, Verben mit Präpositionen v3.13, Home 5.82)

- **Why:** the same review as Home 5.73, Wortschatz v2.108, Artikel v27, Pronomen v7.39, Partizip II v55, Modalverben v13, Ortspräpositionen v23 and Fester Kasus v19 — third and last exercise of the Präpositionen chapter (next: the chapter page). Verben mit Präpositionen was one 837-line `index.html`: ≈330 lines of styles with 7 Design Police blocks overriding the original rules, ≈420 lines of script, its own date function and the old page (the whole page scrolled, `min-height:690px`). Unique to this page: the two-zone phone layout (question at a measured height, keyboard lifted to match — `placeQuestion()`), kept as it was.
- **Bugs fixed** (each reproduced in the browser on v3.12, checked on v3.13):
  - *Long verbs made the round wider than the screen* (found while testing): the question column grew to the width of the verb, so the verb never shrank (the shrink function compared the line with a column that had already grown), the page could be dragged sideways and the keyboard sat off-centre / cut off. At 375px: „sich Sorgen machen“ (page 388px wide); at 320px also „sich erinnern“ and others. The column now has the screen's width, so the verb shrinks to fit as intended. Other cards unchanged.
  - *Empty scrolling:* the start and summary screens scrolled through empty space (the `690px` minimum height).
  - *Phone sideways, start screen:* „Worum geht's?“ lay on top of the 10/20/30 buttons.
  - *Phone sideways, round:* the question sat low (two-zone layout), so most of the keyboard (incl. ✓), the case buttons and Weiter were below the screen edge; the scroll position also carried over from card to card. Now, only when the screen is lower than 560px (phone sideways, large text), the round flows from the top: question just below the top bar, the whole keyboard right under it; after the check the keyboard makes room and the case buttons follow (on screen at 667×375). The empty „+ Kasus“ slot only takes space once it's needed there. Weiter after the answer needs a small scroll (like Fester Kasus / Ortspräpositionen sideways). Turning the phone mid-round works both ways.
  - *Phone sideways, summary:* the version number sat behind the buttons.
  - Now the short-screen rule of the other exercises (`max-height 559px`, or `max-width 340px` and `max-height 609px`): description and version number follow the content. Every screen and every new card starts at the top of the panel. Normal phone and computer screens are unchanged.
  - *A mouse press on the start and summary screens was blocked* (computer): the „focus back to the blank“ helper also ran outside a round, so text there couldn't be selected. Now only during a round.
  - Checked and already fine in v3.12 (no change needed): focused Weiter + Enter moves one card, holding Enter doesn't skip, Cmd/Ctrl combinations are left to the browser, Enter on a focused 10/20/30 or „Noch eine Runde“ works, 1/2 and A/D pick the case only in the case step.
- **Page shell (same as Partizip II / Fester Kasus):** page locked, `.app` is the scroll panel and scrolls only when the content is taller than the screen. `.app` has **no top padding** (sticky top bar — the Artikel v26 rule); the top space (`--shell-top` = status bar + 8px, the same values as before) is on the screens and the sticky offset is unchanged. A background strip covers the space above the sticky top bar while the panel scrolls.
- **Styles:** every element described once, one palette per theme at the top, the shared colour names: `--hairline` (was `--line`, `--start-line`, `--bar-track`, `--quiet-line`, `--end-again-line`, `--divider`), `--card-bg` (10/20/30 and case buttons; was `--start-btn-bg`, `--button-bg`), `--text-secondary` (chips, summary parts, „Noch üben“; was `--secondary-text`, `--weak-text`, `--start-table-text`), `--field-bg` (Weiter, was `--quiet-bg`), one `--font`. Own names kept: `--example-text` (example sentence: light grey in dark, palette grey in light — was `--tertiary-text`), `--feedback-line`, `--gap-line`, `--case-text` / `--case-bg-hover` / `--case-shadow(-hover/-active)` (the case buttons keep their own light-theme shadow and hover). Removed: always-overridden looks and colours (`--cta-*`, `--home-*`, `--home-back-*`, `--key`, `--version-text`, the base `.btn` / `.size` / `.check` / `.continue` looks, the first `.options` / `.done-actions`), dead rules (`.version`, no-op `:hover`), duplicate `.prompt` / reduced-motion rules. **One value unified:** the case buttons' dark background `#2a2b2e` → `#2a2a2d` (`--card-bg`, 1/255 in one channel — invisible). Markup: `#home` → `#playAgain` (it is „Noch eine Runde“), `.size` → `.session-option` (`data-size`, like Fester Kasus / Ortspräpositionen — decided 2026-09-27), classes `screen`, `center`, `muted`, `btn`, `check`, `continue`, `context` removed or renamed (`.start-hint`, `.meaning`). The answer line, the chips, the summary parts and „Noch üben“ are built as text instead of HTML.
- **One date helper:** the daily stats and the round dates use `DeutschDay.key()` (`../../components/deutsch-day-v1.js?v=1` is now loaded). Same result as the old `localDayKey()`.
- **Own files:** `index.html` = markup only (107 lines), `verben_mit_praepositionen.css`, `verben_mit_praepositionen.js`. The theme script stays inline in `<head>` (now guarded like the others). The start-screen description moved into the script. Script grouped into sections (description, cases, stats, difficulty, progress, daily stats, session, screens, question, preposition, case, answer, summary, case buttons, on-screen keyboard, keys, back to Home, buttons). ~~**Prettier was not reachable again**~~ → done 2026-09-27 (see *Chapter pages* below): `index.html`, `.css` and `.js` reformatted, whitespace only; `verben_mit_praepositionen.css?v=2`, `verben_mit_praepositionen.js?v=2`.
- **Data file renamed: `verben_mit_praepositionen.js` → `verbs.js`** (decided 2026-09-27, like `prepositions.js` / `places.js` / `sentences.js`; Partizip II's `verbs.js` is in another folder). Own commit with the content unchanged, so git keeps its history (`git log --follow`); then reformatted (one block per verb, short objects on one line) + English header comment with the fields (the Russian comments are gone). Data checked identical (all 65 verbs, key order included). `window.VERBEN_MIT_PRAEPOSITIONEN` kept; ids unchanged, so the stats, difficulty and progress keys stay the same and saved progress and old backups stay valid.
- **Checked:** 21 states (start, start scrolled, question, typed, case step, answer with wrong preposition + wrong case (+ scrolled), all right, arbeiten als (no case step), long verb (sich Sorgen machen), wrong preposition + right case, „fuer“ for für, summary with and without „Noch üben“ (+ scrolled), Noch eine Runde; answers by tap and by keys 1/2 and Enter) × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus Russian with reduced motion, Russian on the computer and a simulated 59px status bar = 273 screenshots against v3.12. On 375×667, 390×844, 1024×800 and with the status bar: **identical** except the version number and the long-verb card (fixed; anti-aliasing noise at most 8/255); **same saved data everywhere** (stats incl. the one-time difficulty seeding from old stats, difficulty, progress, daily stats). Visual changes only on the short screens and for long verbs (intended, above). Also checked inside Home: „‹ Präpositionen“ sits at the title and follows it when the panel scrolls (also sideways), Zur Startseite closes the exercise, the daily count arrives; turning the phone mid-round. Test notes: comparison with LCD text off (see Ortspräpositionen v23) and with a local font alias so the one `--font` list (which ends in Arial) doesn't show up as a difference on the Linux test machine — Apple devices never reach Arial.
- **Cache numbers:** `verben_mit_praepositionen.css?v=1`, `verben_mit_praepositionen.js?v=1`, `verbs.js?v=5`, Präpositionen page link `verben_mit_praepositionen/index.html?v=14`, Home tile `praepositionen/?v=24`, Home 5.82. **Rule:** when `verben_mit_praepositionen.css`, `verben_mit_praepositionen.js` or `verbs.js` changes, raise its `?v=` in `verben_mit_praepositionen/index.html`, the Präpositionen page's `verben_mit_praepositionen/index.html?v=` and the Home tile's `praepositionen/?v=` (three levels).
- **Upload to GitHub:** `praepositionen/verben_mit_praepositionen/index.html`, `praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.css` (new), `praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.js` (**new content** — now the script, no longer the data), `praepositionen/verben_mit_praepositionen/verbs.js` (new name), `praepositionen/index.html` (Präpositionen page), root `index.html` (Home). `components/deutsch-day-v1.js` is already there. Upload all six together: the old page would load the new `verben_mit_praepositionen.js` as data.
- **Noticed, not changed (for later rounds):**
  - **Two-zone phone layout** (`placeQuestion()`, `--vmp-question-top` / `--vmp-lift`): unique to this exercise — keep in mind in the shared-stylesheet round.
  - **320px:** the example sentence of long verbs now wraps to two lines (the column is no longer wider than the screen) — fine, worth a look in a design round.
  - **Phone sideways:** Weiter after the answer needs a small scroll, like Fester Kasus / Ortspräpositionen. Design round.
  - **Summary inside Home:** check whether „‹ Präpositionen“ runs into „Fertig.“ as in Fester Kasus (same top space) — all summaries in the shared-stylesheet round.
- **Shared stylesheet (see Artikel → groundwork):** eight exercises cleaned; all three Präpositionen exercises done. Verben mit Präpositionen now shares the page shell, short-screen rule, „Worum geht's?“, version mark, 10/20/30 buttons (`.session-option`, like Fester Kasus / Ortspräpositionen), summary buttons, Weiter, Prüfen and the colour names; its sticky top bar and typing cursor match Partizip II. Still different: panel width (760px, like Pronomen), the case buttons' shadow and hover (`.case-choice` here and in Fester Kasus, different looks — settle in the shared-stylesheet round).

## Chapter pages (Verbformen, Präpositionen) · clean-up, short screens, own CSS/JS files (2026-09-27, Verbformen page v11, Präpositionen page v15, Home 5.83)

- **Why:** the last two pages of the clean-up review (after Home 5.73 and the eight exercises). Both „Was möchtest du üben?“ pages were one `index.html` each (≈250 lines), almost identical: the original styles plus the block `CHAPTER PICKER · shared design (Design Police 2026-09-25)` overriding them at the end.
- **Bug fixed — phone sideways (667×375):** the version number was pinned to the bottom of the screen and sat on top of the last visible card. Now the short-screen rule of the exercises (`max-height 559px`, or `max-width 340px` and `max-height 609px`): the version number follows the content. On 320×568 it therefore sits right under the cards instead of at the bottom edge (same as in the exercises).
- **Theme script guarded** like the exercises (`try … catch`: no error when the browser blocks storage).
- **Styles:** every element described once; the design block is merged into the original rules. One palette per theme at the top with the exercises' names: `--text` (was `--cream`, `--heading`), `--card-bg` (was `--pick-card-bg`), `--start-btn-shadow` (was `--pick-card-shadow`), `--start-version` (was `--pick-version`, `--version-text`), `--muted` (was also `--chevron`, `--subtitle`). One `--font` (was 5–7 copies of the font list) and, in Verbformen, one `--serif` for the title and card titles. Removed: always-overridden looks and colours (`--card`, `--line`, `--choice-active-bg/-border`, the card outline, the background/outline transition, the 14px intro size, the 10px version look), duplicate phone rules.
- **Markup:** `.page` → `.app` (the exercises' shell name), `.version` → `.version-mark` (now inside `.app`, needed for the short-screen rule), `<div>`s inside the card buttons → `<span>`s (a `<div>` isn't allowed inside a `<button>`; same look). Added the web-app meta tags the exercises have. Class `.choice` kept for the cards — it means the 10/20/30 buttons in Partizip II / Modalverben and the answer buttons in Ortspräpositionen: settle in the shared-stylesheet round.
- **Kept as it was:** the look (Verbformen: Georgia; Präpositionen: bold sans), the texts, the link addresses, the cards as buttons (a plain link would show the iPhone link preview on a long press). Home's „‹“ reads only the page's path, so it is unaffected.
- **Own files:** `index.html` = markup only (41 / 45 lines), `verbformen/verbformen.css` + `verbformen.js`, `praepositionen/praepositionen.css` + `praepositionen.js` (Prettier). The two CSS files have the same structure and differ only in the title fonts — a first candidate for the shared stylesheet. The theme script stays inline in `<head>`.
- **Checked:** start, scrolled to the bottom and pressed card × 375×667 / 390×844 / 1024×800 / 320×568 / 667×375 × dark / light, plus a simulated 59px status bar = 72 screenshots per version: **pixel-identical** except the version number, and on the short screens (intended, above). No console errors. Inside Home: „‹ Deutsch.“ on both pages, a card opens its exercise („‹ Verbformen.“ / „‹ Präpositionen“), „‹“ goes back to the chapter page and then Home. Fester Kasus and Verben mit Präpositionen start a round with their new file numbers.
- **Prettier over Fester Kasus and Verben mit Präpositionen** (the two rounds written by hand): whitespace and line breaks only, both scripts checked to parse. `kasus.js?v=2`, `prepositions.js?v=12`, `verben_mit_praepositionen.css?v=2`, `verben_mit_praepositionen.js?v=2`; `kasus.css`, `kasus/index.html` and `verbs.js` were already in Prettier style.
- **Unused pictures** (linked from nowhere) moved into the folders' `Artwork/` (out of git): `verbformen/58ca23b6….png`, `image.png`, `icon_fav.webp`, `icon.png`; `praepositionen/8a89f129….png`, `icon_fav.webp`. `icon.webp` / `icon_light.webp` stay (Home tiles).
- **Cache numbers:** `verbformen.css?v=1`, `verbformen.js?v=1`, `praepositionen.css?v=1`, `praepositionen.js?v=1`; Präpositionen page links `kasus/index.html?v=22`, `verben_mit_praepositionen/index.html?v=15`; Home tiles `verbformen/?v=2.17`, `praepositionen/?v=25`; Home 5.83. **Rule:** when a chapter page's `.css` or `.js` changes, raise its `?v=` in that `index.html` and the Home tile's `?v=` (two levels).
- **Upload to GitHub:** `verbformen/index.html`, `verbformen/verbformen.css` (new), `verbformen/verbformen.js` (new), `praepositionen/index.html`, `praepositionen/praepositionen.css` (new), `praepositionen/praepositionen.js` (new), `praepositionen/kasus/index.html`, `praepositionen/kasus/kasus.js`, `praepositionen/kasus/prepositions.js`, `praepositionen/verben_mit_praepositionen/index.html`, `praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.css`, `praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.js`, root `index.html` (Home). Delete there if they exist: `verbformen/58ca23b6….png`, `verbformen/image.png`, `verbformen/icon_fav.webp`, `verbformen/icon.png`, `praepositionen/8a89f129….png`, `praepositionen/icon_fav.webp`.
- **Clean-up review finished:** Home, Wortschatz, all eight exercises and both chapter pages. **Next: the shared-stylesheet round** (see Artikel → groundwork) — one file for the common parts, tested on every page at once. Open points collected for it: the start buttons' and answer buttons' class names (`.choice` / `.size` / `.session-option` / `.case-choice`), panel widths (480 / 620 / 720 / 760px), „‹ Präpositionen“ running into „Fertig.“ on the summaries, the two-zone layout of Verben mit Präpositionen.

## Home button + open / close animation — final (closed 2026-09-27, Home 5.93)

**Status: closed** — tested on the iPhone and accepted. This section is the reference for how it works now; the sections after it are the history of how we got here (5.84 → 5.93), with the reasons for each step.

### Decisions

- **One round Home button, always straight to Home** — from every screen of every exercise and from the chapter pages; no chapter step. Every other way back (the exercises' own code) goes through the same `closeApp()`.
- **Always the same place — the bottom row** (the line of the version number): **centred** on start screens, chapter pages and summaries; **bottom left, same height** during a round. The **version number** sits at the **right end** of that row (kept on the pages while we're still testing). „Zur Startseite“ on the summaries is hidden — the round button replaces it.
- **Short screens** (the exercises' short-screen rule — phone sideways, 4-inch iPhones): small button top left; during a round in front of the top-bar title.
- **Look:** 44px circle (small version 32px), 10% outline (`--hairline`), **solid page-colour background** (no blur, no transparency — it always sits on the plain page colour; a blur was drawn late by Safari and blinked), thin line house in the text colour, shared press effect. Screen-reader label „Zur Startseite“.
- **It appears together with the content** (fades in with it) and fades out while a table window is open. No measuring of the page layout — only the version number's line.
- **Animation only on phones** (screens up to 600px wide); not on tablets / computers / phone sideways, and off with *Reduce Motion*. Only scale and opacity move — what a phone animates smoothly.
- **Opening = the exercise settles in; closing = Home settles back in.** Home never unloads — it's always there underneath.
- **Rule for smoothness:** nothing is swapped while it's on screen, and no heavy work runs during an animation (the exercise page is unloaded only when everything has stopped).

### Opening (tap on a tile)

| Step | When | What | Value |
|---|---|---|---|
| 0 | finger touches the tile | the page starts loading, invisibly (laid out at full size); dropped again if no tap follows | after 1.5s without a tap |
| 1 | tap | **Home steps back**: greeting + tiles shrink from the centre of the screen | 100 → **97 %** (`HOME_STEP_SCALE`), **380ms** (`HOME_STEP_MS`), `EASE_SOFT` |
| 1 | tap | the **exercise layer** (page colour) fades in over Home | **220ms** (`LAYER_FADE_MS`), ease-out |
| 2 | page ready to draw (layout + styles; Wortschatz waits for its scripts) — at the earliest when the layer has covered 60 % of its fade, then **2 frames' pause** | the **content fades in** — the Home button with it, same opacity | **300ms** (`CONTENT_FADE_MS`), `EASE_SOFT` |
| 2 | same moment | the **content zooms** from the centre | **96 %** → 100 % (`ZOOM_IN_FROM`), **420ms** (`ZOOM_IN_MS`), `EASE_ZOOM` |
| — | slow network | starts anyway with whatever has arrived | after 1.5s |
| 3 | zoom finished | Home (covered) back to full size underneath; Home button placement active | — |

### Closing (Home button or any way back)

| Step | When | What | Value |
|---|---|---|---|
| 1 | tap | Home's tile pictures are prepared (`img.decode()`); Home button hidden at once | — |
| 1 | tap | **one crossfade**: the whole exercise screen (layer + content) fades out, the content shrinks a little | **240ms** (`CLOSE_FADE_MS`), ease-out; content → **97 %** (`CLOSE_SHRINK_TO`) |
| 1 | tap | **Home grows back** into place from the centre of the screen | **97 %** → 100 %, **380ms**, `EASE_SOFT` (same as the step back) |
| 2 | exercise screen invisible | it's hidden; Home leaves exercise mode (moves nothing — measured) | — |
| 3 | when nothing moves any more | the exercise page is unloaded (not if an exercise was opened again meanwhile) | **500ms** later (`UNLOAD_AFTER_MS`) |

### Curves

- `EASE_SOFT` = `cubic-bezier(0.25, 0.1, 0.25, 1)` — gentle start and end (CSS „ease“): content fade, Home stepping back / growing back.
- `EASE_ZOOM` = `cubic-bezier(0.33, 1, 0.68, 1)` — eases out but keeps moving noticeably in its second half: the content zoom.

### Home button values

| | |
|---|---|
| Size | 44px circle; 32px on short screens |
| Background / outline | `var(--bg)` solid / 1px `var(--hairline)` |
| Menus (start, chapter, summary) | centred, vertically on the version number's line (version at `bottom: safe area + 28px`) |
| Round | left edge 12px (desktop: the left edge of the 480px column + 12px), same height as on the menus |
| Short screens | `(max-height: 559px), (max-width: 340px) and (max-height: 609px)` → 32px, top left (status bar + 12px) or in front of the top-bar title (title gets 42px room) |
| Hidden | while a table window is open (`.modal`, `.pattern-modal`, `.forms-modal`, `.omodal`, `.coll-modal`) and during opening / closing (opacity 0, still drawn) |

### Styles Home adds to every exercise page (`ROW_STYLE` in `home.js`)

- `#homeBack{display:none}` — hides „Zur Startseite“;
- `.version-mark` right-aligned: `padding-right: max(20px, (100% − 480px) / 2 + 20px)`;
- `.start-about` („Worum geht's?“) **16px up**: `bottom: safe area + 80px` (was + 64px) — ≈ 24px of air above the button;
- room for the small button in the top bar (short screens).

**To move into the exercises' own styles in the shared-stylesheet round** (see OPEN_TASKS).

### Where it lives

- `home.js` → *Open / close an exercise* (all values above as named constants at its top; `openApp`, `closeApp`, `preloadApp`, `pageShowable`) and *Home button* (`updateBack`, `ROW_STYLE`).
- `home.css` → `.home-back` (+ `.is-small`, `.is-corner`, `.is-hidden`, `.app-shell.is-animating .home-back`), `.app-shell.preload`.
- `index.html` → the button (house SVG).
- Versions: Home 5.94 · `home.css?v=7` · `home.js?v=12` · `verbformen.js?v=2` · `praepositionen.js?v=2` (5.93: `home.js?v=11`, exercise pages unchanged).
- `home.js` → `zoomContentIn` (the content's fade + zoom, shared by opening from Home and from a chapter card), `openChapterExercise`, `noTouch`.

### Ideas not built

- Offline cache in the service worker (`sw.js`): instant opens after the first visit, app works offline — separate decision (OPEN_TASKS).
- If Safari's „sharpen at the end of the zoom“ ever bothers: `ZOOM_IN_FROM` 0.98 (less zoom, same fade).

### Chapter card → exercise: the same arrival (Home 5.94)

**Why:** after the zoom from Home into Verbformen / Präpositionen, tapping a card cut hard to the exercise — right after such a smooth transition it looked broken, like a part that wasn't finished. Considered first (and why only the small version is built): repeating the full sequence (chapter steps back while the exercise layer fades over it) needs a second exercise frame — all the Home-button and closing code assumes one — or a page swap in the middle of an animation, the cause of the Safari blinks in 5.87 / 5.88.

- **Phones only** (same rule as Home: up to 600px, not with *Reduce Motion*). Tablets, computers and a chapter page opened on its own: plain page change as before.
- **At the tap** the chapter page goes at once (the plain page colour shows — as it did for a moment before) and Home loads the exercise into the same frame. Nothing is swapped while it's on screen.
- **The exercise arrives exactly as from Home:** same function (`zoomContentIn`) — waits until the page can be drawn + two frames' pause, content fades in 300ms and zooms 96 % → 100 % in 420ms, starts anyway after 1.5s. No „earliest“ delay (there's no layer to fade in first). No loading on touch (only one frame).
- **The Home button stays where it is** (centred on both screens) — it doesn't fade out and back in.
- **How:** the chapter cards call `window.parent.openChapterExercise(absolute URL)` when Home offers it; otherwise they load the page themselves.
- **Browser trace (390 × 844, real speed):** chapter gone at the tap; exercise at 35 % → 74 % → 92 % → 99 % visible in ≈ 65ms steps, zoom 97.6 → 98.7 → 99.4 → 99.8 → 100 %; Home button at full opacity throughout; Präpositionen → Verben mit Präpositionen, closing to Home, desktop (1024 × 800, plain change) and the chapter page on its own work; no console errors.
- **If it still feels abrupt on the iPhone:** next step is a short fade-out of the chapter page before the swap (costs ≈ 0.1–0.2s before the exercise can load).

### Press effect inside chapters and exercises — restored (Home 5.94)

**Found:** the cards on the chapter pages and the start buttons of the exercises (10 / 20 / 30 …) didn't press on the iPhone, although every page has the shared press effect in its styles. **Cause:** iPhone Safari shows `:active` only on pages that listen for touches; Home 5.44 added an empty listener (`noTouch`) to Home and to every page in the exercise frame. The 5.85 rewrite deleted the function but kept the line that adds it to the exercise pages — that line failed silently on every page load, so no page inside the frame had the listener any more (Home's tiles kept pressing because of their own preload listener).
- **Fix:** `noTouch` and Home's own listener are back; every page in the frame gets it again on load. This switches the press effect back on for **all** buttons inside chapters and exercises (cards, start buttons, Prüfen / Weiter, answer buttons, table buttons), and for Home's own buttons without another listener (Settings rows, windows).
- **Not testable in the desktop browser** (Chromium shows `:active` either way) — **to confirm on the iPhone.**
- **Versions (both changes):** Home 5.94 · `home.js?v=12` · `verbformen.js?v=2` (page v12, tile `verbformen/?v=2.18`) · `praepositionen.js?v=2` (page v16, tile `praepositionen/?v=26`). **Upload to GitHub:** root `index.html`, `home.js`, `verbformen/index.html`, `verbformen/verbformen.js`, `praepositionen/index.html`, `praepositionen/praepositionen.js`.

---

## Home button + open / close animation — history (2026-09-27, Home 5.84 → 5.93)

*The steps below are history; the final behaviour and all values are in the section above.*

### Home 5.84 — first version

**Why:** the „‹ Deutsch.“ back button (on trial since Home 5.43) was inconvenient: it went one step up (exercise → chapter page → Home), and an arrow at the top didn't fit the app's look. The idea instead: an exercise **opens on top of Home** and the Home button **folds it back**, like the phrase screen's round ‹ button. Tried in a clickable mockup first (`Claude outputs` / artifact „Home Button Mockup“), then built.

- **Always straight to Home.** From every screen of every exercise and from the chapter pages — no chapter step any more (switching Partizip II → Modalverben goes through Home).
- **Look:** one round button — the phrase screen's style: 44px circle, 10% outline, blurred see-through background, a thin line house in the text colour, shared press effect. Small version (32px) only where there's no room. Label for screen readers: „Zur Startseite“.
- **Where it sits** — *replaced in Home 5.90 by one fixed bottom row, see „Home button in one fixed row“ below; kept here as history* (Home reads the open page, same as before — **no exercise page changed**):
  - **Start screens:** centred, **28px above the „Worum geht's?“ description** (closer to the text than to the buttons). If that gap is too tight (iPhone SE size, Pronomen), centred in the gap between the last button and the description (at least 72px needed). Wortschatz: 28px above the folded „Worum geht's? ▸“; while the description is unfolded there's no room, so it moves to the small spot top left.
  - **Chapter pages:** centred, 28px above the version number.
  - **Summary screens:** centred in the free space under the last button (down to the version number), **slightly above its middle — 45 / 55**, the phrase-screen rule. First try; to be tuned on the phone.
  - **„Zur Startseite“ is hidden** on the summaries (and on the Wortschatz done screen): the round button replaces it. Done by a style Home adds to the page (`#homeBack{display:none}`), so it is one line to undo. Pages opened on their own (not through Home) still show it.
  - **During a round:** **bottom-left corner**, 12px from the edges (+ home indicator), like the old ⌂ — the on-screen keyboard sits right under the card, not at the bottom, so there is room on every current iPhone (measured: 390 × 844 and larger ≈ 250–320px free under the keyboard; iPhone SE 375 × 667 ≈ 80px). Desktop: at the left edge of the 480px column.
  - **Top bar instead of the corner** where the corner is taken: on short screens (the exercises' short-screen rule — phone sideways, 4-inch iPhones) and whenever the corner would touch a button, key, the keyboard or question text. Then the small button sits in front of the top-bar title (Home adds 42px room before the title) and stays there for this page and screen size (no jumping between questions).
  - No room for a centred spot at all (4-inch iPhones, phone sideways): the small button **top left**.
  - **Fades out while a table window is open** (unchanged rule; the old ⌂ covered the Ortspräpositionen table — solved).
- **Open / close animation — phones only** (screens up to 600px wide; not on tablets / computers / phone sideways, and not with *Reduce Motion*). *Replaced by the simple zoom in Home 5.86 — see below; kept here as history:*
  - **Open:** the exercise **grows out of the tile** that was tapped (clip from the tile's shape to the full screen, 480ms, iOS-like curve), fading in and zooming from 86 %; Home behind zooms back to 94 % and dims. It starts only **once the page has loaded** (at most 450ms), so it never grows as an empty box (the lesson from the Fortschritt „tile grows“ attempt).
  - **Close** (the round button and every exercise's own way home — they all call `closeApp()`): the exercise **folds back into its tile** (420ms). The real tile is already under it and the exercise fades out over the second half, so it **lands on the finished tile** (picture and name already there — the blank-tile flash seen in the mockup doesn't happen). A chapter exercise folds into its chapter tile.
  - Only the tile area of Home is zoomed; the fixed „Deutsch.“ header and „Settings“ are only dimmed (zooming the whole page moved the header by ~18px).
- **Checked (browser, touch phone sizes):** all 8 exercises + both chapter pages + Wortschatz (start, folded / unfolded description, done screen) — start, round, answer and summary screens at 390 × 844, 375 × 667, 320 × 568, 667 × 375 and 1024 × 800, dark and light: the button never covers a button, key or text; table windows hide it; the animation lands on the tile (checked in slow motion); no console errors. **To test on the iPhone:** the feel of the animation, the summary height (45 / 55), the corner during a round.
- **Code:** `home.js` → *Open / close an exercise* (`openApp`, `closeApp`) and *Home button* (`updateBack`); `home.css` → `.home-back`; `index.html` → the button. Removed: the chapter step, the „‹ Deutsch.“ / „‹ Verbformen.“ labels.
- **Versions:** Home 5.84, `home.css?v=2`, `home.js?v=2`. Exercise pages unchanged.
- **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Smoother open / close animation (2026-09-27, Home 5.85) · *replaced by the simple zoom (5.86)*

**Phone test of 5.84:** a clear delay after the tap, and not smooth — much worse than the mockup. **Causes:** (1) it waited for the exercise page to load (up to 450ms) before anything moved — over the network from GitHub that was almost always the full 450ms; (2) the exercise was cut out with a clip mask and Home dimmed with a filter — both make the phone redraw every frame, while the exercise page was loading and setting itself up at the same moment; (3) the Home-button placement ran on every change of the loading page.

- **Only moving / scaling and fading** now (the phone does these on the graphics chip, without redrawing): a plain card in the page colour (`.app-card`) grows from the tile's shape to the full screen **the moment the tile is tapped** (fading in over the tile, corners counter-scaled so they stay round, 440ms). The exercise **fades in on the card as soon as it has loaded**, not before the card is nearly full size (55 % of the time). Home's tile area zooms back to 94 % under a dark see-through layer (`.home-dim`, fades to 35 %) instead of the filter.
- **Loads earlier:** the page starts loading when the finger touches the tile (invisible; laid out at full size so it measures itself correctly). No tap within 1.5s (the finger scrolled the tiles) → dropped again.
- **Closing (400ms):** the exercise shrinks towards its tile and fades out (first 60 %); the card shrinks onto the tile and fades away over it in the last part, so it lands on the real tile. The Home button disappears at once (it used to fade for 0.18s while everything else already moved).
- The Home-button placement waits until the animation has finished.
- **Measured** (browser with the processor slowed down 6× and a slow network, 3 runs each): movement starts ≈ 130ms after the tap instead of ≈ 290ms; longest stall 33–50ms instead of 83ms. The real feel can only be judged on the iPhone.
- **Versions:** Home 5.85, `home.css?v=3`, `home.js?v=3`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js` (replaces the 5.84 upload if that isn't done yet).

### Simple zoom instead of the grow / fold animation (2026-09-27, Home 5.86)

**Phone test of 5.85:** opening better, closing „really weird“. Decided: a simpler effect is enough to give the feeling of opening on top of Home — it doesn't have to come from the tile's place. The grow / fold code (card, dark layer, tile geometry) is **removed completely**, no leftovers.

- **Opening:** the exercise layer fills the screen **at once** with the page colour; the exercise's **content fades in and settles from 94 % to 100 %** (280ms, easing out), always from the **centre of the screen**, whichever tile was tapped. The exercise pages use the same page colour as Home (#1B1B1D / #F6F4F1), so their own background blends into the layer and only the content seems to move. It starts as soon as the page has loaded; until then the plain page colour shows (like without any animation).
- **Closing:** the content **shrinks to 96 % and fades out** (160ms), Home is back, and the tile it came from **settles from 106 % to its size** (250ms, from its own centre). A chapter exercise settles its chapter tile.
- **94 %, not 88 %:** at 88 % the content visibly travels (≈ 25px of edge on each side); 94 % reads as „settling into place“ — the same feel as the app's windows (fade + zoom from 92 %). Easy to tune: `ZOOM_IN_MS`, `ZOOM_OUT_MS`, `TILE_SETTLE_MS` and the scale values in `home.js` → *Open / close an exercise*.
- **Kept from 5.85:** the page starts loading when the finger touches the tile (invisibly; dropped again after 1.5s without a tap), so the empty page colour rarely shows; the Home button is placed once the content is in place.
- Still phones only (up to 600px wide), off with *Reduce Motion*.
- **Checked:** open / close from single exercises and chapter exercises, slow motion (content zoom, tile settle, no visible edge — colours identical within 1/255), Home button positions unchanged, no console errors.
- **Versions:** Home 5.86, `home.css?v=4`, `home.js?v=4`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js` (replaces the 5.84 / 5.85 uploads if not done yet).

### Zoom tuned (2026-09-27, Home 5.87)

**Phone test of 5.86:** the idea works, but the switch jumped (especially when closing), the tile settle was too strong, and the first open had a clear delay before anything moved.

- **Background fades** (150ms) instead of switching in one frame: in over Home when opening, away over Home when closing (after the content has shrunk and faded). The content starts at the earliest when the background has almost covered Home (60 % of its fade), so the two never visibly overlap.
- **Tile settles from 103 %** (was 106 %).
- **Why the delay:** 5.86 started the zoom only when the exercise page had *completely* loaded — including its data file (word / verb list), which is most of the waiting. Before 5.84 the page was shown at once and drew itself while the rest arrived, so it *felt* faster. Separate CSS / JS files are not the cause (a few small files, loaded side by side). The first open after a pause or an upload is the slowest: GitHub lets the phone keep files for only 10 minutes, then every file is checked again; new `?v=` numbers load everything fresh.
- **Now:** the zoom starts **as soon as the page can be drawn** — its layout and styles are there — the same moment the page used to appear. The data files may still be arriving (e.g. Artikel's description text fills in a moment later). **Exception: Wortschatz** waits for its scripts, because its script decides which screen comes first (otherwise an empty skeleton would zoom in). Measured with a slow network and nothing cached: Artikel 0.95s → 0.5s, Pronomen 0.7s → 0.55s; Verbformen / Präpositionen pages ≈ 0.3s (unchanged); Wortschatz ≈ 1.5s in that worst case (its word list; normally cached).
- **Idea for later (not built):** a real offline cache (the service worker `sw.js` currently only handles notifications) would make every open after the first one instant and let the app work offline. Needs care with updates (`?v=` numbers) — separate decision.
- **Open:** the Home button appears only after the content has settled (it's placed then) — to discuss.
- **Versions:** Home 5.87, `home.js?v=5` (`home.css` unchanged, `?v=4`). **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Closing: Home settles back in (2026-09-27, Home 5.88) · *replaced by 5.89*

**Phone test of 5.87:** opening OK. Closing still felt off: Home seemed to *load its content* when it came back, and the tile settle wasn't noticeable. **Likely causes:** while an exercise covers the screen, Safari drops the drawn version of the hidden Home (especially the tile pictures) and has to redraw it the moment it shows; the heavy tidy-up (unloading the exercise, Home leaving exercise mode and laying itself out again) ran exactly when Home appeared; and the tile settle ran mostly while the background was still fading over it.

- **Tidy up behind the cover:** after the content has shrunk and faded (160ms), while the plain background still hides Home, the exercise is unloaded, Home leaves exercise mode and its tile pictures are decoded (at most 250ms wait), then Home is drawn once more — only then is it revealed.
- **Home settles back in** instead of one tile: the background fades away (150ms) while the greeting and tiles settle from **103 %** to their size (320ms, from the centre of the screen) — like leaving an app on the iPhone; a pair with the opening („the exercise settles in“ / „Home settles back in“). The fixed „Deutsch.“ header doesn't move (it can't be scaled with the rest). The tile settle and its code are removed.
- **Browser trace (real speed):** content gone at ≈ 210ms → tidy-up done under cover → background gone at ≈ 395ms → Home settled at ≈ 560ms (visible for the last ≈ 170ms). Opening again right after works; no console errors.
- **Agreed:** if this still doesn't feel right on the iPhone, keep the opening zoom and make closing instant (as before 5.84).
- **Versions:** Home 5.88, `home.js?v=6` (`home.css` unchanged, `?v=4`). **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Closing as one crossfade (2026-09-27, Home 5.89)

**Phone test of 5.88:** the screen blinked (Home — gone — Home again with the animation), and Home shrank (103 → 100 %) instead of growing into place. **Cause of the blink:** the exercise page was unloaded and its animation reset while the cover was still up — Safari briefly showed what was underneath. Measured: switching Home out of exercise mode moves nothing (Home fits the screen and never scrolls), so that part is harmless.

**Order (the rule: nothing is swapped while it's on screen, and no work competes with the animation):**
1. **At the tap:** Home's pictures are prepared (`img.decode()` — Safari may have dropped them while covered; Home itself never unloads, it's always there underneath). **One crossfade:** the whole exercise screen (layer + content) fades out (240ms) while its content shrinks to 97 %, and Home **grows from 97 % to its size** (380ms, soft curve, so it's still growing while it comes through). No „background only“ step in between.
2. **When the exercise screen is invisible:** it's hidden and Home leaves exercise mode.
3. **Half a second later, when nothing moves:** the exercise page is unloaded (not if an exercise was opened again meanwhile). A new page only zooms in once it has really replaced the old one.

- **Browser trace (real speed):** exercise screen gone at ≈ 260ms, hidden + Home mode at ≈ 310ms, page unloaded at ≈ 830ms. Opening another exercise within that half second works (right page, not unloaded). No console errors.
- **Versions:** Home 5.89, `home.js?v=7` (`home.css` unchanged, `?v=4`). **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Home button in one fixed row (2026-09-27, Home 5.90)

**Phone test:** the zoom works. But the Home button (1) appeared a moment after the content (it was placed only after the zoom, by measuring each page), (2) sat in a different spot on every screen — hard to find, unlike the old level ⌂ — and (3) on an iPhone mini in Safari it didn't fit and jumped up. Also: the version number line takes precious vertical space. Decided: **one fixed spot, consistent — not a spot searched for on each screen.**

- **The bottom row = the version number's line** (`bottom: safe area + 28px` in every exercise page):
  - **start screens, chapter pages, summaries:** Home button **in the centre**, exactly where the version number was;
  - **the version number moves to the right end of that row** (same size, same grey; kept on the pages while we're still testing);
  - **during a round:** Home button **bottom left, at the same height** (no version number there, as before).
  - Summaries included — the same place as everywhere else (the earlier „higher on the summary“ is dropped for consistency).
- **„Worum geht's?“ moves up 16px** (bottom: safe area + 80px instead of + 64px): with the button in the row it would have ended only 8px above it; now ≈ 24px of air. Measured: on the tightest screen (iPhone mini in Safari, 375 × 629) the main block still ends above it (Pronomen ≈ 20px). Nothing else moves; Wortschatz with the description unfolded fits too.
- **Short screens** (the exercises' short-screen rule — phone sideways, 4-inch iPhones), where the version number follows the content: small button (32px) top left; during a round in front of the top-bar title. Unchanged from before.
- **Appears together with the content:** placed the moment the content starts to zoom in and fades in with it (280ms). No measuring of the page layout any more — only the version number's line — so no waiting and no jumping when text arrives later. The heavy placement code (searching for gaps, collision checks with every key / text line on each change) is removed; it was also a suspect for exercises feeling slower.
- **How:** as before, Home adds a small style to every exercise page it opens (`ROW_STYLE` in `home.js`): hide „Zur Startseite“, version number right-aligned in its row (at the right edge of the 480px column on wide screens), „Worum geht's?“ 16px up, room for the small button in the top bar. **To move into the exercises' own styles in the shared-stylesheet round.** Exercise pages unchanged (no new versions).
- **Checked:** all exercises + chapter pages + Wortschatz (folded / unfolded, done screen) at 390 × 844, 375 × 629 (mini in Safari), 320 × 568, 667 × 375 and 1024 × 800: the button is at exactly the same height on every start / chapter / summary / round screen (789px / 574px), centred on menus, left in rounds; table windows still hide it; no console errors.
- **Versions:** Home 5.90, `home.css?v=5`, `home.js?v=8`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Solid Home button, Home steps back at the tap (2026-09-27, Home 5.91)

**Phone test of 5.90:** the fixed row looks better, but the Home button still seemed to appear a moment late — like a blink.

- **Cause (most likely):** the button had a blurred see-through background; Safari draws that kind of blur late when an element fades in (first without the blur, then with it). **Now a solid background in the page colour** (+ the 10% outline) — it always sits on the plain page colour anyway, so nothing visible is lost.
- **Drawn before it shows:** while the exercise opens / closes the button is only invisible (opacity 0), no longer switched off — so it only has to fade in, together with the content.
- **Home steps back at the tap** (idea from the phone test): the moment a tile is tapped, Home shrinks to 97 % while the exercise layer fades in over it (the layer fade is now 220ms, so the step is visible); the page loads during that movement instead of during a still moment. The exact reverse of closing, where Home grows back from 97 % — same size, same speed (`HOME_STEP_SCALE`, `HOME_STEP_MS`). Once covered, Home is back at full size underneath.
- **Browser trace:** Home steps back from the first frame; the layer covers it by ≈ 280ms; content and button fade in together (same opacity on every frame) from ≈ 150ms. Button positions unchanged; no console errors.
- **Versions:** Home 5.91, `home.css?v=6`, `home.js?v=9`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Home's own windows darken the bottom strip · Settings link part of the page (2026-09-27, Home 5.92)

**Phone test:** (1) in the iPhone web app the Fortschritt window (tap on „Heute“) left the bottom strip light — not darkened, not blurred — although exercise windows opened from Home do darken it since 5.69. (2) In Safari the „Settings“ link sat on top of the „Keep your progress“ card; on small phones it would also cover the „Heute“ tile.

- **(1) Cause:** in the web app full-screen windows don't reach the very bottom of the screen; the strip shows Home's plain background. 5.69 recolours that background only when an *exercise* reports a window — Home's own windows (Fortschritt, About, Keep your progress → Show me how, „Are you sure?“) never switched it on.
- **(1) Now:** one switch for both — `.window-dim` on `<html>` (was `.frame-window`, only while an exercise was open). Sources: the exercise's windows (as before) and Home's own windows, watched in `home.js` (a class watcher on `.pg`, `.about-window`, `.settings-confirm` — nothing added to the windows' own code, so every way of closing counts). Dim stays while either is open. Same colours as before (#121213 dark / #c5c3c1 light = bg + 34 % / 20 % scrim), the status-bar colour follows, fades 0.18s with the window. The strip is darkened, not blurred — it only ever shows plain background, so there is nothing to blur. Not done: stretching windows past the bottom edge (Wortschatz's old workaround — caused a shadow).
- **(2) Cause:** the link was pinned to the screen (safe area + 28px above the bottom), the cards are page content — when the content is taller than the screen they ran under it.
- **(2) Now:** the link is part of the page — at the bottom of `.page`, moved out of the Settings layer in `index.html`. When everything fits it sits exactly where it was (checked: 28px above the bottom at 393 × 852); when the content is taller it sits below the last card and the page scrolls. Home tiles keep 56px free at the bottom for it (the phrase screen already kept 62px). Word-morph into the Settings title unchanged (it measures the link at the tap).
- **Checked (browser):** 375 × 548, 393 × 659, 393 × 852, with and without the Keep card — link always below the last card (≈ 30px gap), same place as before on the tall screen; Fortschritt, Keep your progress window and About switch the dim on and off, dark and light; no console errors. **To confirm on the iPhone** (web app: strip under Fortschritt; Safari: Keep card).
- **Versions:** Home 5.92, `home.css?v=7`, `home.js?v=10`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

### Calmer opening zoom (2026-09-27, Home 5.93)

**Phone test of 5.91:** closing feels smoother than opening — the content „pops up and jumps at you“ once the page has loaded. **Why:** the content's fade and zoom ran together on one sharp curve (most of the movement and almost the whole fade in the first ≈ 0.1s, then creeping), and the zoom started in the same frames in which the page runs its own setup (dropped frames right at the start).

- **Fade and zoom separated:** the content (and the Home button with it) **fades in over 300ms on a gentle curve**; the **zoom starts at 96 % (was 94 %) and takes 420ms** on a curve that still moves noticeably in its second half — the page is visible while it's still settling, instead of appearing and then snapping into place.
- **Two frames' pause** after the page is ready (≈ 30ms, not noticeable), so its setup is done before the zoom's first frames.
- **Home steps back on the same soft curve** it uses when growing back on closing (`EASE_SOFT`), so both movements feel like one gesture. The sharp curve (`EASE_OUT`) is no longer used and removed.
- **Browser trace (real speed):** layer covers Home by ≈ 200ms; content 11 % → 47 % → 74 % → 89 % → 100 % visible in 50ms steps; zoom 96.9 → 97.9 → 98.7 → 99.3 → 99.6 → 99.9 %; button always at the content's opacity. Positions unchanged; no console errors. In total the opening takes ≈ 0.1–0.15s longer.
- **To watch on the iPhone:** Safari may show a slightly soft picture while scaling and sharpen it at the end — if that „snap“ is noticeable, zoom from 98 % instead (more fade, less zoom). Values in `home.js` → *Open / close an exercise* (`CONTENT_FADE_MS`, `ZOOM_IN_MS`, `ZOOM_IN_FROM`).
- **Versions:** Home 5.93, `home.js?v=11` (`home.css` unchanged). **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

---

## Keyboard above the Home button (2026-09-27, Home 5.95)

**Why:** in Modalverben a sentence and a translation of two lines each pushed the keyboard down onto the Home button and the table button (seen on the iPhone in Safari). The keyboard's height changed from question to question.

**Decision (user's idea):** the keyboard has **one fixed place — right above the Home button**. On a smaller screen it rises towards the typing field; when it reaches it, the question card shrinks; only after that does the page scroll.

- **Place:** the last key row ends **72px above the bottom edge** (+ home indicator) — ≈16–20px of air above the round Home button (its row is centred 33.5px up). Same in all five keyboard exercises: Modalverben, Partizip II, Pronomen, Wortschatz, Verben mit Präpositionen.
- **How (CSS):** the round screen fills the height (flex column, `min-height: 100%`) and the keyboard mount takes `margin-top: auto` + the bottom padding that puts it at the 72px line. So the keyboard can never sit *above* the typing field: if the content is taller, it simply follows it.
- **Minimum gap** typing field → keys: ≈32–38px (Modalverben / Partizip II: the keyboard component's own 20px top margin is dropped in this layout).
- **Shrinking (script):** after every new question (and on resize) `fitCard()` (Modalverben, Partizip II — the question card), `fitPrompt()` (Pronomen — context + sentence + translation) or `fitTopZone()` (Wortschatz — sentence + translation) checks whether the round is taller than the screen and shrinks that part with CSS `zoom` just enough, **down to 80%**. Only then the page scrolls (as before). Verben mit Präpositionen: one-line question, not needed.
- **Only with the touch keyboard** (`:has(.keyboard.is-touch)`): computers are unchanged.
- **Short screens** (phone sideways, 4-inch iPhones — the Home button is at the top there): unchanged, the keyboard follows the field. Pronomen: its in-game table button now also follows the content there (it used to cover the keys when the phone was sideways).
- **Tablets:** keyboard at the bottom of the column, above the Home button.
- **Keyboard width** (same round): Pronomen and Verben mit Präpositionen had a narrower keyboard (32px from the edge instead of 18px, their game screen has 14px more padding). Now 18px like Modalverben / Partizip II on phones; tablets: at most 432px (= the 480px exercises). Wortschatz stays 16px (its own page padding).
- **Table buttons** moved into the Home button's row, ≈12% smaller (see Game buttons above) — in the keyboard exercises and in Ortspräpositionen, so all in-game table buttons match.

**Checked in the browser** (every sentence of each exercise, EN + RU, 9 sizes: 360×640, 375×600, 375×667, 390×664, 390×720, 390×844, 414×736, 430×800, 430×932; plus 740×360 sideways, 820×1180 tablet, desktop; through Home with the real Home button): the keyboard never touches the Home button or the table button, except 1 Modalverben sentence in RU at 375×600 (was 144 of 144 there before); before the change Modalverben collided on 375×667 (11 sentences), 390×664 (16–34) and 360×640 (142). The card shrinks only on small screens: Modalverben 11 sentences on 375×667 (to ≥ 89%), Pronomen 1 on 390×664 (RU); Wortschatz none above 360×640. Answer screens (result + Weiter, case buttons) unchanged. No console errors.

**Versions:** Home 5.95 (tiles `verbformen/?v=2.19`, `pronomen/?v=26`, `wortschatz/?v=2.41`, `praepositionen/?v=27`) · Modalverben v14 (`modalverben.css?v=2`, `modalverben.js?v=2`) · Partizip II v57 (`partizipII.css?v=3`, `partizipII.js?v=2`) · Verbformen picker v13 (`partizipII/?v=16`, `modalverben/?v=17`) · Pronomen v7.40 (`pronomen.css?v=2`, `pronomen.js?v=2`) · Wortschatz v2.109 (`wortschatz.css?v=2`, `wortschatz.js?v=2`) · Verben mit Präpositionen v3.14 (`verben_mit_praepositionen.css?v=3`) · Ortspräpositionen v24 (`ortspraepositionen.css?v=2`) · Präpositionen picker v17 (`verben_mit_praepositionen/index.html?v=16`, `ortspraepositionen/index.html?v=28`).

**Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js` · `verbformen/partizipII/index.html`, `partizipII.css`, `partizipII.js` · `pronomen/index.html`, `pronomen.css`, `pronomen.js` · `wortschatz/index.html`, `wortschatz.css`, `wortschatz.js` · `praepositionen/index.html` · `praepositionen/verben_mit_praepositionen/index.html`, `verben_mit_praepositionen.css` · `praepositionen/ortspraepositionen/index.html`, `ortspraepositionen.css`.

**To test on the iPhone:** Modalverben with a long sentence (Safari and the Home-screen app); a card that shrinks on a small iPhone — still pleasant to read?

---

## Phone sideways: „Bitte dreh dein Handy.“ (2026-09-27, Home 5.96)

**Why:** the app can't really be used with the phone sideways (answer buttons below the edge, keyboard and question don't fit). A website can't lock the orientation on the iPhone (Safari ignores the manifest's `orientation` and `screen.orientation.lock()`), so instead a layer asks you to turn the phone back.

- **When:** landscape + at most 500px tall + touch screen (`(orientation: landscape) and (max-height: 500px) and (pointer: coarse)`) = every phone turned sideways. Not on tablets (iPad landscape is 820px+ tall) or computers (no touch — a short desktop window isn't covered).
- **Where:** only in Home (`index.html` → `.rotate-hint`, `home.css` → block `PHONE SIDEWAYS`). It covers Home and the exercise frame (z-index 2000, above the frame 1000, the Home button 1001 and every window). Pages opened on their own (not through Home) aren't covered — same few lines per page if ever needed (shared-stylesheet round).
- **Look:** page colour, thin line icon (phone + turn arrow, text colour, like the Home button's house), **„Bitte dreh dein Handy.“** 24px bold (= the pause screen's title), below „Deutsch. funktioniert nur im Hochformat.“ 15px palette grey. Dark and light.
- **Nothing is reset:** the layer only hides the screen. Checked: typed answer and the round's position are still there after turning back.
- The sideways (short-screen) layouts of the exercises stay as they are (still used by 4-inch iPhones and by pages opened on their own).
- **Checked in the browser:** 390×844 upright (hidden), 844×390 in a Modalverben round (shown), 667×375, 932×430, 740×360 (shown), 1180×820 iPad and a 1280×450 desktop window (hidden).
- **Versions:** Home 5.96, `home.css?v=8`. **Upload to GitHub:** root `index.html`, `home.css`.

---

## (i) next to Backup: „Your progress“ window (2026-09-27, Home 5.97)

**Why:** progress lives only in the browser's / Home Screen app's storage. If someone clears website data, deletes the app or changes phone, it's gone, and they'd be understandably upset. The Safari-only hint under Restore doesn't reach Chrome, Mac or Home Screen users, so now everyone gets the explanation.

- **Where:** Settings → Backup row, a small (i) on the right (palette grey, 18px line icon, 44×48 tap area). Opens a window built like About (`#backupInfoWindow`).
- **Text (EN):** title „Your progress“. „Your progress is saved only on this device - in this browser, or in the Home Screen app. It isn't stored online, so clearing website data, deleting the app or switching to a new device would erase it.“ + „Make a backup now and then. It's a small file you can bring back anytime with Restore - on this device or a new one.“ In Safari in the browser (iPhone/iPad/Mac, = `atRisk()`) the first paragraph adds „Safari also deletes it after 7 days without a visit.“ RU follows Your Language.
- **Button** „Make a Backup“ right in the window (same as in *Show me how*); after a backup today it reads „✓ Backup Created“ and the „Last backup …“ note updates.
- Tap outside, × or Esc closes. Dark and light checked (390×844), no console errors.
- **Versions:** Home 5.97, `home.css?v=9`, `home.js?v=13`. **Upload to GitHub:** root `index.html`, `home.css`, `home.js`.

---

## „Type the First Word“ no longer looks disabled (2026-09-27, Wortschatz v2.110)

**Why:** in the „Your Own Words“ window the quiet outlined button (transparent, 10% outline, text at 55%) read as *disabled* on the dark card. Everywhere else the quiet button stays as it is.

- **Look:** the „＋ Use your own words“ recipe — raised card surface, full text colour, soft card shadow, no outline — in the window's button shape (56px, 17px corners, 16px bold). New class `.coll-raised` (only this button).
- On the card itself the surface is lifted one step in dark (`card-bg` + 8% white ≈ #353538), and in light gets the 10% outline ring, so it doesn't melt into the card. „Import List“ stays the one cream/dark main button above it; 10px between them.
- **Checked:** 390×844 dark and light.
- **Versions:** Wortschatz v2.110 (`wortschatz.css?v=4`, `collection-window.js?v=18`), Home 5.98 (tile `wortschatz/?v=2.42`). **Upload to GitHub:** root `index.html` · `wortschatz/index.html`, `wortschatz.css`, `collection-window.js`.

### Follow-up: same look for „5 neue Wörter lernen“ and „Import List“ (2026-09-27, Wortschatz v2.111)

- **„5 neue Wörter lernen“** (done screen; also its „＋ Neue Wörter“ form) and **„Import List“** (own collection, next to „＋ Add Word“) now use the raised „＋ Use your own words“ look too, instead of the outlined 55% button. Shapes unchanged (56px / 17px on the done screen; 48px / 16px in the pair). Import List uses `.coll-raised` (lifted on the card); the done-screen button sits on the page, so it takes the exact start-screen recipe (`--card-bg` + `--card-shadow` + `--text`).
- **Stays outlined (on purpose):** Delete, Start Over, Settings „Yes“ — the quiet, risky choices of the „Are you sure?“ rule — and „Noch eine Runde“ in the other exercises.
- **Checked:** 390×844 dark and light.
- **Versions:** Wortschatz v2.111 (`wortschatz.css?v=5`, `collection-window.js?v=19`), Home 5.99 (tile `wortschatz/?v=2.43`). **Upload to GitHub:** root `index.html` · `wortschatz/index.html`, `wortschatz.css`, `collection-window.js`.

---

## Word list line breaks: no more cut words (2026-09-27, Wortschatz v2.112)

**Why:** in the collection window's word list, short words lost their last letter to the next line („das Fernwe / h“). Cause: German and translation shrank together in proportion to their full length, and `overflow-wrap: anywhere` let the browser cut a word at any letter — so a long translation squeezed a short German word even when there was room.

- **Now:** the German keeps its natural width (up to **62%** of the row) and wraps only between words. The translation takes the rest and wraps only between words (its longest word is its minimum width). Only a German word too long for its column is split: hyphenated at a syllable (`lang="de"` + `hyphens: auto`, Safari), cut only if no hyphen point fits.
- Same for the Starter-Set list („All Words in the Set“).
- **Checked:** 430px and 320px wide — das Fernweh, das Ehrenamt, sich vorbereiten auf + Akk., Geschwindigkeitsbegrenzung, Rechtsschutzversicherungsgesellschaft with long Russian translations. The test browser (Chrome on Linux) has no German hyphenation, so the hyphen itself is **to check on the iPhone**.
- **Versions:** Wortschatz v2.112 (`wortschatz.css?v=6`, `collection-window.js?v=20`), Home 5.100 (tile `wortschatz/?v=2.44`). **Upload to GitHub:** root `index.html` · `wortschatz/index.html`, `wortschatz.css`, `collection-window.js`.


---

## Modalverben · Formen table: bigger forms, -te endings, mögen in the group, ich/du/er frame (2026-09-28, Modalverben v15)

**Why:** the forms were 12px (smaller than any other table), the scheme showed the Präteritum / Konjunktiv II endings without their -t- („-e, -est“), and mögen had its own fold-out although its endings are the same as the group's.

- **Size:** a verb's forms (and the ending scheme) are **16px serif**, as big as the verb names above; the person labels („ich“, „du“ …) 13px. Column headers (PRÄSENS …) and section rows unchanged.
- **Endings:** Präteritum and Konjunktiv II are now **-te, -test, -te, -ten, -tet, -ten**. The ø („Umlaut entfernen“) before the Präteritum stays.
- **mögen** joins the group: können · müssen · dürfen · mögen · sollen · wollen. mag / mochte isn't exactly „remove the umlaut“ (ö → a/o, g → ch) - kept anyway, the endings are what matter. On phones the group row now wraps to two lines.
- **Group always open:** no chevron, it can't be folded any more. werden is the only fold-out left.
- **Frame:** when a verb is chosen, one thin rounded frame goes around its **ich / du / er Präsens** forms (kann, kannst, kann) - the vowel change to memorise. **Not for sollen** (its vowel stays: a visual aid, not consistency). werden gets it too (werde, wirst, wird). None in the ending scheme (the ø marks those rows there). Drawn with inset shadows, so nothing shifts; the Präsens column starts 9px in every row.
- **Two fixed lines** (v16): können · müssen · dürfen / mögen · sollen · wollen on every screen - with free wrapping a separator dot started the second line on small phones and pushed the verbs right.
- **Clear = ↺ icon** (v17; v16 had ⊗) instead of „Zurücksetzen“ (too long): a round arrow back (drawn as SVG, stroke 1.5 like the rest), 22px in a 40px tap area, `aria-label` „Tabelle leeren“. It only shows while a verb is chosen (there's nothing to clear in the scheme) and keeps its place, so nothing moves. **A second tap on the chosen verb** clears too. The chosen verb stays underlined, so you see what's open.
- **Checked:** 1100px dark and 390px phone - scheme, können, sollen, werden; 360px - two lines, ↺, second tap, ↺ tap.
- **Versions:** Modalverben v17 (`modalverben.css?v=5`, `modalverben.js?v=5`) · Verbformen picker v16 (`modalverben/?v=20`) · Home 5.103 (tile `verbformen/?v=2.22`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js`.

## Modalverben · Formen table: which form for which meaning (2026-09-28, Modalverben v18)

**Why:** the table showed *what* the forms are, not *when* you need which one. The exercise's own description promises „pick the right one for what you mean“.

- **Symbols above the tense names** (group table only, werden unchanged): a dot = Präsens („now“), an arrow back = Präteritum („past“), a dashed circle = Konjunktiv II („not real: polite, maybe, advice“). One legend line under the table, also in the ending scheme. Symbol *above* the name - tried below in a sketch, it read as belonging to the row under it.
- **„What do you want to say?“** under a chosen verb: 2-3 meaning tags, each with its column's symbol. A tap lights the column (calm gold, not mint / red - those mean right / wrong) and shows one German example with the form in gold. Second tap turns it off; choosing another verb or ↺ clears it.
  - können: I'm able to (Präsens) · asking politely (K II) · maybe, possibly (K II)
  - müssen: I have to · I really should (but …) (K II)
  - dürfen: it's allowed · asking very politely (K II)
  - mögen: I like it · I'd like (polite wish) (K II: möchte)
  - sollen: someone wants me to · giving advice (K II)
  - wollen: I want to, I plan to · starting politely (**Präteritum**: „Ich wollte fragen, ob …“)
  - Where Präteritum and Konjunktiv II are the same (sollte, wollte) a small line says so: the sentence decides.
- **Language:** question, tags, legend and the „same form“ line are explanations → in the language from Settings (EN / RU, `DeutschTranslation.pick`), same reason as „Worum geht's?“ - German here was hard to decode. Forms and examples stay German.
- **Left out on purpose:** the „guess“ meaning (er dürfte / müsste schon da sein) - B2, maybe later.
- **Checked:** 375px dark EN (scheme, können, sollen + advice), light RU (wollen + starting politely), werden open below.
- **Versions:** Modalverben v18 (`modalverben.css?v=6`, `modalverben.js?v=6`) · Verbformen picker v17 (`modalverben/?v=21`) · Home 5.104 (tile `verbformen/?v=2.23`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js`.

---

## New exercise: Vielseitige Verben (2026-09-28, v1)

**Why:** werden sat in Modalverben only because it had nowhere else to go; lassen (new from the last lesson) has the same problem - one verb, many jobs, and the form depends on the job. The hard part isn't the forms, it's *which verb and which form for what I mean* (e.g. „Ich habe mein Auto reparieren **geworden**“ instead of **lassen**). Worked out in a prototype over five rounds (v0.1–v0.5) before building.

- **Verbs:** werden, lassen, sein, haben, bekommen - 40 sentences in `sentences.js`, about 18 jobs (werden: become, future, guess, passive, würde · lassen: leave, have someone do it, let, let's, stop, can be done · sein: state, sein + zu, Perfekt · haben: Perfekt, zu tun haben, fixed phrases · bekommen: receive, geschenkt bekommen, Angst bekommen). Easy words on purpose (renoviert, schlafen); fixed phrases (recht haben, es eilig haben) stay - worth learning as a whole.
- **Question:** a **situation** (user's language) + the sentence with a gap. **No infinitive above the sentence** (unlike Modalverben): choosing the verb is the task. Typing only the verb part (fill the gap), not the whole sentence.
- **Deck:** fully mixed - no contrast pairs back to back (tried in the prototype: the „compare with the last one“ label went unnoticed and felt forced). Same weighted sampling and difficulty scale as Modalverben (key `vielseitigeVerbenDifficultyV1`, format 2, per verb|sentence).
- **Answer box** (Modalverben order): RICHTIG / NICHT GANZ → the right word in green + the typed word in red, crossed out (no infinitive → form: irrelevant here) → form name as a verb table names it (**Partizip II, not „Perfekt“** - Perfekt is the sentence, the gap is a Partizip II) → **one rule line** → yellow box (only after a mistake).
- **Marker in the sentence** (calm gold, like the Modalverben table): after Prüfen the clue words are marked - only what decides the verb or form. A time word is marked when nothing else says „past“ (letzte Woche, 1961: the helper verb is the gap, so gestrichen / renoviert don't tell the tense); not when the verb already does (morgen next to anrufen). Nothing marked where the clue is a missing second verb (ist Lehrerin geworden: only ist).
- **Rule line = the construction as building blocks**, never the words of the sentence again (the marker already points at them): „вещь + wurde + Partizip II = Passiv, это сделали“, „человек + lassen + вещь + Infinitiv = поручить кому-то“. werden rules name the actual form (wird / wurde / ist … worden), so present and past passive don't look the same.
- **Yellow box** (left gold line, like a hint):
  - **wrong verb, known mix-up** → one line per verb, formula + tiny example: lassen ↔ werden („человек + вещь + Infinitiv“ / „вещь + Partizip II“), sein + zu ↔ lassen + sich, werden ↔ sein (being done / already done), werden ↔ bekommen, haben ↔ sein in the Perfekt. Each only on the sentences where it fits (`only` in `VV_HINTS`).
  - **wrong verb, no known mix-up** (werden in „es eilig haben“) → no box: it's just what people say.
  - **right verb, wrong form** → rows „yours / needed“ with the form names from a small form table (wurde · Präteritum (ich, er) / wird · Präsens (er, sie, es)); also catches the wrong person (lasst / lässt). **geworden / worden** and **gelassen / lassen** show the use + a tiny example instead (same form name, different use).
- **Summary:** Fertig., score, „Was schwierig war, kommt öfter wieder.“, then **„Hier gab es Fehler“** (German, centred) with one row per verb + job that slipped (job in the user's language). Same buttons as Modalverben (Noch eine Runde outlined, Zur Startseite).
- **Start screen:** as Modalverben - „Wie viele Sätze?“, 10 / 20 / 30, no table button. **Worum geht's?** EN „werden or lassen? wird or ist? Helps you tell apart verbs that do many jobs and pick the right form for what you mean.“ · RU „werden или lassen? wird или ist? Помогает различать глаголы, у которых много значений, и выбирать нужную форму по смыслу.“ Language from Settings (no switch on the page).
- **Progress:** one item per verb + job (`vielseitigeVerben`, label e.g. „werden · Passiv“); today's count via `deutsch:exerciseAnswer` (Home counts it in the Verbformen tile); new backup module `vielseitigeVerben`; Fortschritt: Verbformen chapter lists it.
- **Files:** `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css` (from `modalverben.css` without the table window), `vielseitige_verben.js` (from `modalverben.js`), `sentences.js`. Not run through Prettier yet (npm registry blocked in the session) - run `npx prettier --write deutsch-home/verbformen/vielseitige_verben/` once.
- **Not touched:** Modalverben still has werden (its sentences, table fold-out and „Worum geht's?“ mention werden) - separate round. Chapter card still says „Modalverben + werden“ until then.
- **Checked:** 390px phone dark EN (start, wrong verb lassen/geworden, wrong form wurde/wird, summary) and light RU (geworden/worden rows). No console errors.
- **Versions:** Vielseitige Verben v1 · Verbformen picker v18 (`vielseitige_verben/?v=1`) · Home 5.105 (tile `verbformen/?v=2.24`, `home.js?v=14`, `progress-screen.js?v=19`). **Upload to GitHub:** root `index.html`, `home.js`, `progress-screen.js` · `verbformen/index.html` · `verbformen/vielseitige_verben/` (all four files, new folder).

### Rule line names the forms (2026-09-28, Vielseitige Verben v2)

- The rule line names helper and main verbs **by their form**, the way textbooks say it — „**werden im Präteritum** + Partizip II“ instead of „wurde + Partizip II“, „haben im Präsens“, „lassen im Imperativ (du)“, „werden im Konjunktiv II“; participles as „**Partizip II von lassen / werden / bekommen**“; the double infinitive as „lassen im Infinitiv“. The word itself is already shown in green right above.
- **Kept as words:** „worden“ in the Perfekt passive (it *is* the passive-only form — geworden / worden is exactly the difference) and the three fixed phrases (Lass das!, recht haben, es eilig haben).
- **Versions:** Vielseitige Verben v2 (`sentences.js?v=2`) · Verbformen picker v19 (`vielseitige_verben/?v=2`) · Home 5.106 (tile `verbformen/?v=2.25`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`.

### Balanced: 57 sentences, more persons, more bekommen (2026-09-28, Vielseitige Verben v3)

**Why:** 40 sentences leaned on werden (14) and Präsens (20), sein / haben / bekommen had 4–5 each, and almost everything was *ich* or *er / sie / es*.

- **Now 57:** werden 16 · lassen 14 · sein 8 · haben 8 · bekommen 11. Forms: Präsens 27 · Präteritum 11 · Partizip II 10 · Imperativ 4 · Infinitiv 3 · Konjunktiv II 2 (Präsens stays the biggest: every Perfekt helper and every „right now“ is Präsens).
- **bekommen** now covers: receive (+ Präteritum *bekam*), get an illness (*eine Erkältung bekommen*), start to feel (*Angst, Hunger*), someone does it for you (*geschenkt, geschickt bekommen*), ordering, **have a baby** (*ein Baby bekommen*), **catch the train** (*den Zug noch bekommen*). New jobs `happen`, `baby`, `catchTrain`.
- **New contrast Angst bekommen / Angst haben** (start to feel / already feel — the same werden / sein difference). New job `feel` (haben: *Angst haben, Lust haben*); yellow box haben ↔ bekommen on those sentences.
- **liegen lassen** (*Ich habe den Schlüssel im Büro liegen lassen*): „leave“ but with a second verb → Infinitiv — the trap next to *gelassen*; typing gelassen shows the gelassen / lassen rows.
- **sein:** + Perfekt with *wir* (*sind gefahren*), + state in the plural (*Die Fenster sind geputzt* — next to *Die Fenster werden gerade geputzt*), + *ist kaum zu lesen*, + Präteritum *waren geschlossen*, *war zu schaffen*.
- **haben:** + *Angst haben*, *Lust haben*, *Habt ihr … zu tun?*
- **Persons:** existing sentences moved to *du* (*Lässt du dir …*, *Du hast dein Handy … gelassen*, *Hast du schon gegessen?*), *wir* (*Wir werden nervös*, *Wir lassen unseren Laptop reparieren*, *Wir werden abgeholt*), *ihr* (*Ihr werdet sehen*, *Habt ihr …*), plural (*Die Kinder wurden müde*, *Die Fenster werden / sind geputzt*, *Meine Nachbarn haben ein Baby bekommen*).
- Changed sentences start again at difficulty 1 (the sentence is part of the key); progress items per verb + job are kept.
- **Checked:** Angst haben with *bekommt* typed (yellow contrast), liegen lassen with *gelassen* typed (rows); all 57 load, every marked word is in its sentence.
- **Versions:** Vielseitige Verben v3 (`sentences.js?v=3`) · Verbformen picker v20 (`vielseitige_verben/?v=3`) · Home 5.107 (tile `verbformen/?v=2.26`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`.

### Modalverben without werden (2026-09-28, Modalverben v19)

**Why:** werden now lives in Vielseitige Verben; Modalverben is only können, müssen, dürfen, mögen, sollen, wollen.

- **Sentences:** all 24 werden sentences removed from `special_verbs.js` (144 → 120).
- **Formen table:** the werden fold-out (with Partizip II *geworden*) is gone, with its CSS (`.forms-chevron`, `.forms-detail-participle`).
- **Name:** „Worum geht's?“ no longer says „and werden“ (EN / RU); the Verbformen chapter card says „Modalverben“.
- **Statistics:** Fortschritt drops the werden items by itself (`DeutschProgress.init` removes keys no longer in the exercise); the difficulty scores of the removed sentences are now dropped from `modalverbenDifficultyV1` on load.
- **Checked:** start text, table (no werden, mögen forms), old werden score pruned, a round starts. No console errors.
- **Versions:** Modalverben v19 (`modalverben.css?v=7`, `special_verbs.js?v=6`, `modalverben.js?v=7`) · Verbformen picker v21 (`modalverben/?v=22`) · Home 5.108 (tile `verbformen/?v=2.27`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/index.html`, `modalverben.js`, `modalverben.css`, `special_verbs.js`.

### Vielseitige Verben card: the verbs as subline (2026-09-28, Verbformen picker v22)

- The Vielseitige Verben card on the Verbformen chapter page now says „werden · lassen · sein · haben · bekommen“ (was „Ein Verb, viele Aufgaben“).
- **Versions:** Verbformen picker v22 · Home 5.109 (tile `verbformen/?v=2.28`). **Upload to GitHub:** root `index.html` · `verbformen/index.html`.

## Vielseitige Verben · Formen table + Modalverben table fixes (2026-09-28, Vielseitige Verben v4 · Modalverben v20)

**Why:** a table like the Modalverben one, but here one form does several jobs (*wird* = future, guess, Passiv, become), so lighting a tense column says nothing. What decides the meaning is what comes *with* the verb (infinitive, Partizip II, adjective …). Worked out in a mockup first (`Claude outputs/vielseitige-verben-tabelle-mockup.html`, three rounds).

- **Two ways in, one window** (`formsModal`, same table-window rule as Modalverben):
  - **Start screen** „Formen · Tabelle“ under 10 / 20 / 30 → the **full table**: a tab per verb (werden · lassen · sein · haben · bekommen), its forms, then **„What do you want to say?“** tags. A tag lights the forms it uses and shows the construction as **building blocks** (gold = the verb, dashed = what comes with it and decides the meaning, grey = other words) + „= what it says“ + one German example (verb gold, partner dashed underline) + sometimes a small extra line (Perfekt, *worden* vs *geworden*, *reparieren lassen*, *Angst haben / bekommen*).
  - **During a round** the button (Home row, like Modalverben) is **off until Prüfen** — greyed out, does nothing, no note (the verb is part of the task: no peeking). After Prüfen it opens **only the current verb's forms**, the answer's form lit (all its cells when it's the same form for two persons, e.g. *werden* wir / sie; *lassen* after a 2nd verb lights „lassen“ in the Partizip II row). No tabs, no tags there.
- **Grid:** Person · Präsens · Präteritum · Konjunktiv II, then **Partizip II** (one row: *geworden* became · *worden* Passiv · *gelassen* · *lassen* after a 2nd verb · *bekommen* no ge-) and **Imperativ** for lassen (*lass! · lasst! · lassen Sie!*).
- **Konjunktiv II only for werden** (the only verb the exercise asks in K II): for the others the column's text is hidden but it keeps its place and row lines, so nothing moves between verbs. The exercise still names *hätte / wäre* if typed (`VV_FORMS`).
- **No now / past symbols** (unlike Modalverben): Präsens also carries the future, a guess and the Perfekt helper here, so they'd mislead.
- **Verb tabs:** names from the left with a steady gap (`clamp(2px, 2.4vw − 4.5px, 9px)` each side) — doesn't spread out on wide screens, only shrinks on narrow phones; all five fit at 320px.
- **Roll-up:** after a tag the window scrolls up just enough that the building blocks + example are visible (at least their top); never scrolls down; a new tab starts at the top.
- **Very narrow phones (≤ 359px):** forms 14px, window padding 10px, so werden's three columns fit at 320px.
- **Tags per verb** (text EN / RU from Settings, forms and examples German): werden — become, future, a guess, Passiv, would · lassen — leave, have someone do it, let someone, let's, can be done, stop it · sein — state, can be done, Perfekt (A → B) · haben — Perfekt, have to, feel (already), fixed phrases · bekommen — get / receive, start to feel, get ill, have a baby, catch a train, someone does it for you.
- **Data** in its own file `forms_table.js` (`VV_TABLE`: rows, k2, p2, imp, meanings with lit / blocks / means / ex / also).
- **Modalverben table fixes:** (1) **sideways scroll on the phone** — the ↺ button's `margin-right: -8px` stuck out 3px past the table → now −5px (= the cell padding) + the window body never scrolls sideways (`overflow-x: hidden`). (2) **Roll-up** after a meaning tag, same as above: the example was hidden under the window edge on a phone, so nothing seemed to happen.
- **Checked:** 375 dark EN (start, full table werden / lassen + roll-up, round: button off before Prüfen, on after, answer cell lit, Esc closes), 390 light RU, 320 (all five verbs, no sideways scroll), 1280 light RU; every one of the 57 sentences lights a form; Modalverben 375: no sideways scroll, example scrolled into view. No console errors. Not run through Prettier (npm registry blocked in the session).
- **Versions:** Vielseitige Verben v4 (`vielseitige_verben.css?v=2`, `vielseitige_verben.js?v=2`, new `forms_table.js?v=1`) · Modalverben v20 (`modalverben.css?v=8`, `modalverben.js?v=8`) · Verbformen picker v23 (`modalverben/?v=23`, `vielseitige_verben/?v=4`) · Home 5.110 (tile `verbformen/?v=2.29`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css`, `vielseitige_verben.js`, `forms_table.js` (new) · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js`.

### Explanation = the table's card (2026-09-28, Vielseitige Verben v5)

**Why:** the „What do you want to say?“ card in the table (building blocks + = meaning + example) is easier to learn from than the text rule line, and the exercise and the table should teach the same picture.

- After Prüfen, the explanation under the form name is now **the table's building blocks** of the meaning with the same job: blocks + „= what it says“ + the small extra line where the table has one (Perfekt, *worden* vs *geworden* …).
- **Different from the table** (Alena, same day): **no example** (the sentence is right above), **no box** around it, and the **verb block in green** (the answer's colour) instead of gold — on this screen gold marks the clue words in the sentence.
- Link sentence → card: every meaning in `forms_table.js` got a `job` (same keys as `VV_JOBS`); all 57 sentences find their card.
- The sentence's own `rule` line stays in `sentences.js` only as a fallback (shown if no card has that job). Given up with it: sentence-specific details like „time in the past“ — the form name above the blocks, the marked clue words and, after a wrong answer, the yellow hint box still carry that.
- Yellow hint box after a wrong answer unchanged.
- **Checked:** 375 dark EN, 390 light RU, right and wrong answers; no console errors.
- **Versions:** Vielseitige Verben v5 (`vielseitige_verben.css?v=3`, `vielseitige_verben.js?v=3`, `forms_table.js?v=2`) · Verbformen picker v24 (`vielseitige_verben/?v=5`) · Home 5.111 (tile `verbformen/?v=2.30`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css`, `vielseitige_verben.js`, `forms_table.js`, `sentences.js`.

## Tables locked until the answer, then the answer lit — all exercises (2026-09-28, Modalverben v21 · Pronomen v7.41 · Ortspräpositionen v25 · Partizip II v58)

**Why:** Vielseitige Verben v4 showed it works: with the table open during the question, the answer is looked up, not remembered — and it still counts as right, so the sentence comes back less often. Alena: same for every exercise with a table. Advice first (which tables are answer keys, which only rules), then built.

- **Same rule everywhere** (like Vielseitige Verben): the **start-screen table is unchanged** (browse and learn). **During a round** the table button in the Home row is **off until the answer** — greyed out (35%), does nothing, no note. After the answer it opens with **the answer lit in gold** (the Verbformen gold: `--lit-bg` / `--lit-text` / `--lit-form`, same values as `--forms-lit-*`).
- **No „zuletzt Fehler“ marks** in the table during a round (Pronomen, Ortspräpositionen) — one kind of highlight at a time. The start screen keeps them.
- **Modalverben:** only **the current sentence's verb** (Alena: not the six-verb group), title „<verb> · Formen“, symbols + legend kept, no meaning tags. The **column comes from the sentence's tense**, not from the word (*sollte* / *wollte* are Präteritum *and* Konjunktiv II); „Präteritum · höflich“ → Präteritum. A form that fits two persons lights both cells (*können* wir / sie, *konnte* ich / er). **Konjunktiv II Vergangenheit** (10 sentences, „Ich hätte kommen ___“): the answer is the infinitive, not a form in the table → only the Konjunktiv II heading is lit + a line under the legend „hätte + … + Infinitiv: **sollen**“ (Alena: yes). All 120 sentences light something.
- **Pronomen:** personal → its cell (e.g. Dat. · *ihnen*) + the column head; the formal **Sie** row shows when the answer is in it. Possessive → the owner's stem (*sein-*) + the **ending** cell (case × gender, e.g. Dat. · Mask. *-em*), with „Possessiv-Endungen“ opened; both column heads gold. The lit text gets a small gold background (a span, so the cells' zero side padding doesn't matter). All 103 sentences find their cells.
- **Ortspräpositionen:** off until **all three lines** are answered (after Wo the table would give away Wohin / Woher). Then the place's **group row**: its three prepositions gold-backed (Wohin not dimmed there), its group name in gold text — for Kino / Schweiz only its own half („Raum“ or „Land mit Artikel“). The 6 Ausnahme places light **„immer in:“**. **Goethestraße** (group „Straße als Adresse“) has no row → nothing lit (Alena: fine, no new row).
- **Partizip II:** the verb's cell (its infinitive vowel, from `pattern`: „ei - ie - ie“ → *ei*) gets a gold outline and gold vowel, its Partizip II vowel (*ie*) a gold background. All 77 verbs find their cell.
- **Code:** each exercise has one `#roundTableBtn` (`disabled` in the HTML, off in `render()`, on after the answer) and its open function takes the mode (Modalverben `data-forms-table="full" / "verb"`, Pronomen `data-table="round"`, Ortspräpositionen `data-otable="round"`, Partizip II `data-pattern-table="round"`) and refuses the round mode before the answer. Modalverben: `modalAnswerCells()`, `modalFormRound`; Pronomen: `markAnswer()`, `wireEndingsFold()` (the fold's roll-into-view, now for both ways in); Ortspräpositionen: `tableHtml(litCat)`; Partizip II: `patternLit()`, `patternTableHtml(lit)`. Window class names unchanged (Home's back button / dim still find them).
- **Checked** (Playwright, 390 phone + 1024 computer × dark / light): button does nothing before the answer, opens after; Modalverben Präsens (two cells), K II Vergangenheit (note), Präteritum · höflich; Pronomen personal pl., possessive, formal Sie; Ortspräpositionen Kino, Toilette, Hause, Wald (three lines each, blocked after every line); Partizip II bleiben; start-screen tables unchanged (Modalverben group row). No console errors. Not run through Prettier.
- **Versions:** Modalverben v21 (`modalverben.css?v=9`, `modalverben.js?v=9`) · Partizip II v58 (`partizipII.css?v=4`, `partizipII.js?v=3`) · Pronomen v7.41 (`pronomen.css?v=3`, `pronomen.js?v=3`) · Ortspräpositionen v25 (`ortspraepositionen.css?v=3`, `ortspraepositionen.js?v=2`) · Verbformen picker v25 (`partizipII/?v=17`, `modalverben/?v=24`) · Präpositionen picker v18 (`ortspraepositionen/index.html?v=29`) · Home 5.112 (tiles `verbformen/?v=2.33`, `pronomen/?v=27`, `praepositionen/?v=28`). Copy before: `Claude outputs/_before-table-lock.tgz`. **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/modalverben/index.html`, `modalverben.css`, `modalverben.js` · `verbformen/partizipII/index.html`, `partizipII.css`, `partizipII.js` · `pronomen/index.html`, `pronomen.css`, `pronomen.js` · `praepositionen/index.html` · `praepositionen/ortspraepositionen/index.html`, `ortspraepositionen.css`, `ortspraepositionen.js`.

## Vielseitige Verben — sentence review with Alena, part 1: #1–#25 (2026-09-28, Vielseitige Verben v8)

**Why:** Alena tested the exercise (fun, challenging) and went through the sentences one by one with Claude: situation, sentence, clue marks, explanation card, and the yellow box after a wrong answer. #1–#25 done; #26–#57 still to review.

**Agreed rules (apply to the rest):**
- Situation: short, but **keep the task** („Tell your friend…“, „Ask her…“) — talking to someone is what makes it fun.
- The sentence must **ask for exactly one verb**: if another verb is also correct German (*sind* for *werden*, *könnten* / *vergessen* …), change the sentence rather than explain it away.
- Marks: only the words that decide (not „Mein“, not half the sentence).
- Yellow boxes: as short as possible; pattern words (subject, object, infinitive …) over example sentences; an example only where the pattern alone isn't clear. English block names in the EN version, translated block names in RU (person → человек, object → кого / что).
- Explanation after Prüfen = building blocks + „= meaning“ only — **no small extra line** (`also`) any more; those stay in the table window. A sentence whose tense differs from the table card gets its own `tip` card (Perfekt: haben + object + place + gelassen …).
- Before implementing anything Alena asked *about*, ask first.

**Changed (sentences.js unless noted):**
- #1 „Nach dem Ausflug **gestern** …“ (marks gestern, müde) · #2 RU „закончил учёбу“ · #3 marks + Lehrerin · #4 „stole“ / „украл“ · #10 / #11 marks „Auto“ (not „Mein Auto“) · #12 new: „___ es Ihnen etwas ausmachen, das Fenster zu schließen?“ → Würde (Elektrichka situation) · #13 „Wenn ich mehr Geld hätte, ___ ich gern mehr reisen.“ · #14 „Vor der Prüfung ___ wir immer nervöser.“ · #15, #16, #17, #19, #24, #25 shorter situations · #18 new: „Hast du deinen Hund wirklich allein zu Hause ___?“ · #18 / #29 / #19 / #22 own Perfekt cards.
- Yellow boxes (`VV_HINTS`, now a key may hold a list): werden / sein for „become“ (a change *wird Arzt, wurden müde* / a state *ist Arzt, waren müde*); werden / sein Passiv = „the action: what happened“ / „the result: how it was at that moment“; werden / lassen in Passiv = „only a subject → werden“ / „subject + object → lassen“; lassen / werden in „have it done“ = do it yourself / someone else does it; lassen / haben = „*have* something done = **lassen**, not haben“; sein + **zu** / lassen + **sich**; bekommen / haben „+ a feeling“; sein / haben Perfekt without examples. `**bold**` now works in boxes.
- New `VV_OTHER_WORDS`: *will / willst / wollen / wollt* → „*will* = want (wollen) · werden = will (future)“ (future + guess sentences).
- `VV_USE_PAIRS`: no example sentences; gelassen / lassen = three lines „In the past: / haben + gelassen / haben + infinitive + lassen“, only in Perfekt sentences.
- `forms_table.js`: future card [infinitive] (not „at the end“); guess card „wohl“ dashed; EN „thing“ → „object“; have-it-done „for you“; lassen „leave“ Perfekt line deleted.
- `vielseitige_verben.js`: box lookup for lists / other words / three-line pairs; `rich()` bold; explanation without `also`.
- **Not yet checked on screen** (only syntax + a data review script) — test on the phone.
- **Versions:** Vielseitige Verben v8 (`sentences.js?v=5`, `forms_table.js?v=3`, `vielseitige_verben.js?v=6`) · Verbformen picker v26 (`vielseitige_verben/?v=8`) · Home 5.113 (tile `verbformen/?v=2.34`). **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`, `forms_table.js`, `vielseitige_verben.js`.

## Vielseitige Verben — sentence review with Alena, part 2: #26–#57 (2026-09-28, still v8)

**Review of all 57 sentences finished.** Same rules as part 1, plus:
- **Own card only when the building blocks change** (a helper verb appears, *geworden / worden / gelassen*, infinitive + *lassen*, adjective instead of place). Only the tense of the same verb changes → the table card; the form name above shows the tense. So the own cards of #1, #2, #7, #8, #9, #10, #14, #16 were removed again. Table meanings cover both tenses („can / could be done“, „have to / had to“).
- Table blocks: no „im Präsens“ (werden future / guess, lassen + sich, sein / haben Perfekt helper); „im Konjunktiv II“ and „im Imperativ“ stay (the form carries the meaning). EN block names: object (not thing); RU blocks stay translated.
- **Situations:** funny where possible, a person to talk to where it helps (not everywhere); must not repeat the sentence; the sentence should be the answer to the situation.
- **Right answers in another word** („also“): accepted, and a note in the yellow box explains (`VV_ALSO_NOTES`): *kriegen* = spoken bekommen, *erhalten* = formal bekommen, *erreichen / schaffen* (train).

**Changed:** #26 card „= stop it“ · #27 sich dashed, „it can be done“, shorter situation · #28 own card [lassen] + [object] + [adjective], „Write it like in a book“ · `lasste` box · #29 friend's question · #30 own card haben + object + place + infinitive + lassen · #31 box „what happens / happened“, „how it is / was“ · #33 postman · #34 state card „= a state at that moment, no action“ · #35 neighbour · #37 box haben + zu (must) / sein + zu (can be done) · #38 RU · #40 bar, „Say no“ · #41 „Ich ___ gestern noch meine Katze zu baden.“ · #42 / #43 own cards (recht haben = be right, es eilig haben = be in a hurry) · #44 „Mein kleiner Bruder ___ Angst vor der Dunkelheit.“ (teddy bears, Grandma) · #45 Grandma calls · #46 „___ ihr heute noch etwas zu erledigen?“ (lake) · #47 own card, `gebekommen` box, neighbour saw the postman · #48 new: „Wann ___ ich mein Paket?“ (was the café order) · #49 own card, police officer · #50 new: „Als Kind ___ ich jedes Jahr Socken geschenkt.“ (memoirs) · #51 marks langsam · #52 [bekommen] block, call your boss · #53 new: „Von dem Pizzaduft ___ ich sofort Hunger.“ · #54 [bekommen], „появился ребёнок“, tired / blame the neighbours · #55 accepts erreichen / schaffen · #56 sister's dog, accepts kriegte · #57 own card, neutral RU.

**Still open (see OPEN_TASKS.md):** make the situations of #1–#32 funny (the fun ones started at #33; #12 and #29 already done) · gender pass: RU situations mostly feminine past tense — make neutral (present tense / imperative) or some male · table example of bekommen „receive“ is still the café („Ich bekomme einen Kaffee, bitte“) — change? · Alena's bugs from her test · test on the phone.

## Vielseitige Verben — fix: empty table during a round (2026-09-28, Vielseitige Verben v9)

**Bug (Alena):** after Prüfen, „Formen · Tabelle“ opened with only the title („<verb> · Formen“) and no table. Cause: the steady-height code for the full table (`lockFormsHeight()`) stopped early in round mode *before* drawing the table, so the window body stayed empty. Fix: in round mode it now draws the table and keeps the natural height (one line). Start-screen table unchanged.
- **Checked** (Playwright, 1024 dark): three sentences in a row, table shows the verb's forms with the answer lit (sein *ist*, haben *hast*, bekommen *bekam*); no console errors.
- **Versions:** Vielseitige Verben v9 (`vielseitige_verben.js?v=7`) · Verbformen picker v27 (`vielseitige_verben/?v=9`) · Home 5.114 (tile `verbformen/?v=2.35`). Copy before: `Claude outputs/_before-vv-roundtable-fix.js`. **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.js`.

## Vielseitige Verben — Präteritum vs Perfekt: speaking vs writing (2026-09-29, Vielseitige Verben v11)

**Why (Alena):** for a Russian speaker two past tenses look like aspect (делал / сделал), so *wurde gebaut* vs *ist gebaut worden* seemed to hide a difference in meaning. There is none — the difference is style: Perfekt when speaking, Präteritum in writing. But this is **not true for every verb**: *sein*, *haben*, *werden* = become (and modal verbs) use Präteritum when speaking too. So no general note in the table — only where it is true.
- **Yellow box** (`VV_PAST_NOTES`, sentences.js): right verb, wrong past form → under the „твой / нужно“ rows three lines „Прошлое (в пассиве): / в разговоре: … (Perfekt) / в тексте: … (Präteritum)“. Only for werden · Passiv (*wurde* ↔ *worden*), bekommen (*bekam* ↔ *bekommen*), lassen · leave (*ließ* ↔ *gelassen*); only when the typed word is a Präteritum or Partizip II; not for *geworden* (that mix-up has its own rows). The rule of the sentence is not repeated — the building-block card above already shows it.
- **Table**, werden · Passiv card: the small line is now three lines — сейчас / было, в тексте / было, в разговоре (+ sein + Partizip II + worden). The old „Perfekt … Не geworden“ line is gone (the Partizip II row already says стал(а) · пассив). `also` may now be a list of lines.
- **Situations:** Küche → a flat listing (written): „Напиши объявление о квартире: кухню отремонтировали в прошлом году.“, sentence *Die Küche wurde **letztes Jahr** renoviert.* (was: letzte Woche, spoken — sat right next to the spoken *Mein Auto ist gestern repariert worden*). Mauer → „Как в учебнике истории: Берлинская стена, 1961.“ The other written Präteritum sentences already said so (ließ, bekam ×2).
- **Checked** (Playwright, 390 dark, RU): Mauer + *worden*, Fahrrad + *wurde*, Hund + *bekommen*, Oma + *ließ* → note shown; Küche right → no box; table card shows the three lines.
- **Versions:** Vielseitige Verben v11 (`sentences.js?v=6`, `forms_table.js?v=4`, `vielseitige_verben.js?v=8`, `vielseitige_verben.css?v=5`) · Verbformen picker v28 (`vielseitige_verben/?v=11`) · Home 5.115 (tile `verbformen/?v=2.37`). Copy before: `Claude outputs/_before-vv-past-notes.tgz`. **Upload to GitHub:** root `index.html` · `verbformen/index.html` · `verbformen/vielseitige_verben/index.html`, `sentences.js`, `forms_table.js`, `vielseitige_verben.js`, `vielseitige_verben.css`.

### Explanations made exact — review with Alena (2026-09-29, still Vielseitige Verben v11, not uploaded yet)

- *Ich habe meinen Schlüssel im Büro liegen ___*: **gelassen** now accepted (Duden: both, *liegen lassen* more common) — yellow line „liegen gelassen — тоже верно! Но чаще: liegen lassen.“ (*reparieren gelassen* stays wrong.)
- Perfekt helper: yellow box was „haben: всё остальное“ — wrong for *sein, bleiben, passieren*. Now „sein: движение, изменение + sein, bleiben, passieren“ / „haben: большинство глаголов“. sein card tag „Perfekt (движение, изменение)“ (was „из A в B“) + small line „Ещё sein, bleiben, passieren: *Ich bin zu Hause geblieben. Was ist passiert?*“
- bekommen + Partizip II sounded the same as lassen („someone does it for you“ vs „have someone do it“). Now tag / job „тебе подарили / прислали“ · „given to you“, card „ты получаешь: подарили, прислали“.
- sein + Partizip II tag / job: „состояние“ · „a state“ (was „уже сделано (состояние)“ — did not fit *Das Museum war geschlossen*).
- Checked (Playwright, RU): Schlüssel + *gelassen* → Richtig + note; Kino + *habe*, gegessen + *Bist* → new lines; Socken card text.
- Yellow box lassen ↔ bekommen (new, no examples — no room): „lassen = ты сам(а) это устраиваешь“ / „bekommen = тебе это дают, ты только получаешь“ (lassen · haveDone, bekommen · getDone; the needed verb first).
- sein + zu card: small line „Иногда = нужно: *Die Rechnung ist bis Freitag zu bezahlen.*“
- werden · future card: two small lines „Чаще просто Präsens: *Ich rufe dich morgen an.*“ / „werden — когда обещаешь или уверен(а).“
- *Hast du das Paket schon geschickt bekommen?* (clunky) → „Встреча через пять минут. Спроси коллегу, прислали ли ему ссылку.“ *Hast du den Link schon geschickt ___?* → bekommen (also gekriegt). New sentence: difficulty starts at 1.
- Checked (Playwright, RU): both lassen / bekommen boxes, Link + *gekriegt* → Richtig + kriegen note, both new card lines.

### Form names + what they mean, no „твой / нужно“ (2026-09-29, still Vielseitige Verben v11)

**Why (Alena):** „Präteritum“ alone means nothing without the grammar; the „твой / нужно“ tags repeat what the colours say.
- `VV_FORM_MEANINGS` (sentences.js): name first, meaning in brackets — Präsens (настоящее время) · Präteritum (прошлое) · Partizip II (для Perfekt и пассива) · Konjunktiv II (бы) · Infinitiv (начальная форма) · Imperativ (просьба, приказ). Präsens deliberately not „сейчас“: here it is also the Perfekt helper (*bin gegangen*) and the future (*werde anrufen*, *werden abgeholt*).
- Under the answer: „KONJUNKTIV II (бы)“ — the meaning not in capitals (`.form-meaning`).
- Yellow rows: no tags (red = yours, green = needed). Another tense → name + meaning; same tense → name + person (*wirst* / *wird*: „Präsens (du)“ / „Präsens (er, sie, es)“); a word that is several forms (*bekommen*) → only the names. geworden / worden rows unchanged (стал(а) / пассив).
- Checked (Playwright, RU): würde / wurde, wird / wirst, bekam / bekommen, wurde / worden (+ past note), worden / geworden, Lass / Lasst, werde / werden; no page errors.


## Vielseitige Verben — Weiter never under the Home row (2026-09-29, Vielseitige Verben v12)

- **Problem:** a long explanation (e.g. *bekam* for *bekommen*, RU, 375 × 812) pushed Weiter under the Home button and the „Formen · Tabelle“ pill — up to 17px inside the Home row.
- **Weiter has its own bar** under the question card. Its bottom edge never goes lower than 72px above the bottom edge (+ home indicator), where the on-screen keyboard's last row ends.
  - **Phones and tablets** (on-screen keyboard): Weiter always sits at that place, the same spot for every sentence.
  - **Computers:** Weiter follows the explanation (15px under it), as before. Chosen with Alena: on a big screen there is no reason to keep it low.
  - **Both:** when the explanation is too long for the screen, Weiter stays pinned (sticky) and the whole question area scrolls under it. Only then does the bar get the page colour with a 28px fade above it, so nothing shows through behind Weiter, Home or the pill. There is no separate scroll box for the explanation: one scroll area, no scroll-in-scroll on iOS.
  - **Short screens** (the short-screen rule): Weiter follows the content like the keyboard and the pill, and is pinned only while the card scrolls under it.
- Home and „Formen · Tabelle“ stay where they are on every screen size.
- While Weiter is shown, the scroll panel has no bottom padding; the bar's padding is the space to the edge (sticky-offset rule, same reason as the top bar).
- **Checked** (Playwright inside Home, RU): 375 × 812, 375 × 667 (light), 320 × 568, 667 × 375, 1280 × 800, 1280 × 600; short and long explanations, scrolled to the end. Before Prüfen: pixel-identical to v11 (phone and computer). Computer with a short explanation: Weiter in exactly the same place as before. Summary screen: only the version number differs.
- Versions: `vielseitige_verben.css?v=6`, `vielseitige_verben.js?v=9`, version mark v12, Verbformen page `vielseitige_verben/?v=12`, Home tile `verbformen/?v=2.38`.
- **Upload to GitHub:** `verbformen/vielseitige_verben/index.html`, `vielseitige_verben.css`, `vielseitige_verben.js`, `verbformen/index.html`, root `index.html` (Home).
