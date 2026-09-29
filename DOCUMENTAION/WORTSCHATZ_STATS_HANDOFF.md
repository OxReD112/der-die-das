# Wortschatz statistics — decided and built (2026-09-26)

**Status:** done. Fortschritt screen v18, Wortschatz v2.107, Home 5.70. Full details: `PROGRESS_TRACKER.md` §7 and `DECISIONS.md` → „Wortschatz · statistics with collections“. The original handoff (questions before the decision) is in `WORTSCHATZ_STATS_HANDOFF_before-decided.md`.

## What was decided

- **Bar = the words you have started** (not the collection size). Layers: **gelernt** (level 6 = passed the 90-day review, mint) · **sitzt** (level ≥ 3 = passed the 8-day review, the default mint at 65 % transparency — not the darker „vor 3 Wochen“ green) · **angefangen** (the rest of the bar, grey).
- **Numbers:** gelernt / sitzen / angefangen (e.g. „5 / 22 / 40“); the first two only once ≥ 1. Legend in the same order: gelernt · sitzt · angefangen.
- **No collection size and no „words left“** on the card — it changes a lot and can't be acted on there.
- **Collection name** on its own grey line under „Wortschatz“ (… when long).
- **Counted live from the active collection** → switching to own words shows that collection from zero; „Continue“ back to the Starter-Set brings its numbers back with its card levels. No per-word dates (only needed for a „+N in 3 Wochen“, which Wortschatz doesn't show).
- Words added with **Learn Now** (on by default) and the first 10 of a new collection count as angefangen right away — checked and kept as is.
- **Daily points** already earned today are never taken away when switching.
- **Wortschatz is no longer saved in the daily history** (`deutschProgressSnapshotsV1`) — it was a side effect, never shown, not needed for Backup.

## Still open (not stats) — from WORTSCHATZ_COLLECTIONS.md / DECISIONS.md

- ~~Start screen: swap „＋ Use your own words“ and Starten?~~ — **keep the current order** (decided 2026-09-26).
- ~~Start screen: ~90px gap above the folded „Worum geht's? ▸“~~ — **keep** (buttons never move; decided 2026-09-26).
- ~~Done screen buttons 360px vs 312px~~ — **keep as is** (decided 2026-09-26).
- ~~„Starten · 12 Karten“ inside the button~~ — **dropped** (2026-09-26): the session counter shows the number.
- Collection window in the Safari web app: bottom strip stayed light in all exercises → **fixed in Home 5.69**; Wortschatz's own older workaround removed in v2.107 (it caused a shadow at the bottom). To confirm on the iPhone.
- Home's „‹ Deutsch.“ back button (on trial since 5.43) — separate discussion.
- „Worum geht's?“ description still a draft (later); Russian text has „забудется, - и“ to polish.
- Icon re-export; ⌂ button (separate discussion).
- Later, only if needed: update from file, archiving learned words, CSV import.
