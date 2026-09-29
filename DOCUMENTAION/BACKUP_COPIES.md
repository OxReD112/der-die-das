# Backup copies → git history

Until 2026-09-27 every change started with a copy next to the file (`index_before-<change>.html`).
Those 329 copies now live in the project's git history instead (folder `Deutsch/`), and the copy files are gone.
Every copy was checked byte-for-byte before it was removed.

**To get an old copy back:** ask Claude ("restore `Home/index_before-ws-stats.html`"), or in Terminal inside the `Deutsch` folder:

```sh
git show <commit>:<file> > old-copy.html      # e.g. git show a1b2c3d:deutsch-home/Home/index.html > old.html
```

From now on there are no more `_before` copies: every change is a git commit (see DECISIONS.md → *How changes are saved*).

| Copy (old file name) | Saved | Commit |
|---|---|---|
| **Documentation/DECISIONS.md** | | |
| `DECISIONS_before-design.md` | 2026-09-25 10:00 | `32e7c3595` |
| `DECISIONS_before-tables.md` | 2026-09-25 19:17 | `090fe751e` |
| `DECISIONS_before-home-tiles.md` | 2026-09-25 19:29 | `05152ea38` |
| `DECISIONS_before-home-design.md` | 2026-09-26 13:05 | `042968a96` |
| `DECISIONS_before-wortschatz-count.md` | 2026-09-26 15:46 | `822b54848` |
| `DECISIONS_before-wortschatz-start.md` | 2026-09-26 15:46 | `425bf5cf6` |
| `DECISIONS_before-collection-storage.md` | 2026-09-26 16:46 | `6cc6bcd66` |
| `DECISIONS_before-collection-window.md` | 2026-09-26 16:57 | `3494ecb58` |
| `DECISIONS_before-word-form.md` | 2026-09-26 17:11 | `081270c86` |
| `DECISIONS_before-edit-in-exercise.md` | 2026-09-26 17:22 | `736a0eed2` |
| `DECISIONS_before-import.md` | 2026-09-26 17:26 | `0b8a4f23f` |
| `DECISIONS_before-wortschatz-english.md` | 2026-09-26 17:38 | `6555d9034` |
| `DECISIONS_before-words-left.md` | 2026-09-26 17:43 | `9476a8bc9` |
| `DECISIONS_before-start-layout.md` | 2026-09-26 17:47 | `f4c795edc` |
| `DECISIONS_before-own-layout.md` | 2026-09-26 18:11 | `8fb45d440` |
| `DECISIONS_before-start-balance.md` | 2026-09-26 18:26 | `e865288fe` |
| `DECISIONS_before-done-screen.md` | 2026-09-26 18:32 | `c6fe23ec2` |
| `DECISIONS_before-done-compact.md` | 2026-09-26 18:40 | `0f4716a1d` |
| `DECISIONS_before-red-note.md` | 2026-09-26 18:45 | `19e43c0e8` |
| `DECISIONS_before-window-fixes.md` | 2026-09-26 18:52 | `25a6985d8` |
| `DECISIONS_before-starter-fold.md` | 2026-09-26 19:02 | `a6e9e6ff8` |
| `DECISIONS_before-started-count.md` | 2026-09-26 19:06 | `6021a853b` |
| `DECISIONS_before-about-fold.md` | 2026-09-26 19:25 | `61d0f907a` |
| `DECISIONS_before-scroll-shell.md` | 2026-09-26 21:07 | `8188e560b` |
| `DECISIONS_before-backup-reminder.md` | 2026-09-26 21:24 | `5941c8c8a` |
| `DECISIONS_before-cleanup.md` | 2026-09-27 05:38 | `c9668c98f` |
| **Documentation/PROGRESS_TRACKER.md** | | |
| `PROGRESS_TRACKER_before-design.md` | 2026-09-25 14:32 | `2be87e4d5` |
| `PROGRESS_TRACKER_before-collections.md` | 2026-09-26 14:02 | `70fa17649` |
| **Documentation/PROJECT_SUMMARY.md** | | |
| `PROJECT_SUMMARY_before-ortspraepositionen.md` | 2026-09-23 20:48 | `c0b4b1248` |
| `PROJECT_SUMMARY_before-back-button.md` | 2026-09-25 09:05 | `62aa4bd0a` |
| `PROJECT_SUMMARY_before-wortschatz-count.md` | 2026-09-26 15:46 | `59c3e5f3a` |
| `PROJECT_SUMMARY_before-collections.md` | 2026-09-26 15:46 | `be7fe732b` |
| **Documentation/WORTSCHATZ_COLLECTIONS.md** | | |
| `WORTSCHATZ_COLLECTIONS_before-final.md` | 2026-09-26 18:40 | `0f4716a1d` |
| **Documentation/WORTSCHATZ_STATS_HANDOFF.md** | | |
| `WORTSCHATZ_STATS_HANDOFF_before-decided.md` | 2026-09-26 20:04 | `d3eb0f739` |
| **deutsch-home/Artikel/index.html** | | |
| `index_before-progress.html` | 2026-09-24 09:57 | `c0b4b1248` |
| `index_before-qa.html` | 2026-09-25 06:41 | `084769b53` |
| `index_before-ui.html` | 2026-09-25 07:20 | `a38c018e2` |
| `index_before-translations.html` | 2026-09-25 07:20 | `d29306967` |
| `index_before-design.html` | 2026-09-25 09:14 | `38dfff9f4` |
| `index_before-summary.html` | 2026-09-25 15:28 | `0bff7dc7a` |
| `index_before-topbar.html` | 2026-09-25 15:45 | `56ab00876` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `a3db3b555` |
| `index_before-question.html` | 2026-09-25 16:34 | `1e74eb127` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `9827a4055` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `3f061e480` |
| `index_before-description.html` | 2026-09-26 11:24 | `0a274c413` |
| `index_before-scroll-shell.html` | 2026-09-26 20:57 | `d6c783b2a` |
| `index_before-sticky-fix.html` | 2026-09-27 05:37 | `bfeab2cdb` |
| **deutsch-home/Artikel/words.js** | | |
| `words_before-cleanup.js` | 2026-09-24 10:42 | `c0b4b1248` |
| `words_before-qa.js` | 2026-09-25 06:41 | `5bce3c7a9` |
| `words_before-translations.js` | 2026-09-25 06:41 | `8aa15e5c6` |
| **deutsch-home/Home/greetings.js** | | |
| `greetings_before-qa.js` | 2026-09-25 06:51 | `fe4772e8e` |
| **deutsch-home/Home/index.html** | | |
| `index_before-qa-pronomen.html` | 2026-09-25 06:20 | `b81d513b2` |
| `index_before-qa-artikel.html` | 2026-09-25 06:42 | `fe4772e8e` |
| `index_before-qa-home.html` | 2026-09-25 06:51 | `2a061b45a` |
| `index_before-qa-wortschatz.html` | 2026-09-25 07:07 | `6b7cde556` |
| `index_before-ui.html` | 2026-09-25 07:20 | `b2420ebbd` |
| `index_before-translations.html` | 2026-09-25 07:20 | `895a7fbf2` |
| `index_before-notification-id.html` | 2026-09-25 09:04 | `34726ccab` |
| `index_before-phrases-translations.html` | 2026-09-25 09:04 | `ff218df19` |
| `index_before-settings-pill.html` | 2026-09-25 09:37 | `9c3ff25aa` |
| `index_before-qa-pronomen-eff.html` | 2026-09-25 11:53 | `93b97b7fd` |
| `index_before-orts-table.html` | 2026-09-25 12:20 | `3dc67b66c` |
| `index_before-vmp-eff.html` | 2026-09-25 14:31 | `70d1ae1c9` |
| `index_before-pickers.html` | 2026-09-25 14:31 | `9079ed161` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `bbf771f11` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `6631ac288` |
| `index_before-question.html` | 2026-09-25 16:34 | `009cdf75a` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `f1a5ece1c` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `bdab3b34b` |
| `index_before-tables.html` | 2026-09-25 19:16 | `704bb0dd0` |
| `index_before-home-tiles.html` | 2026-09-25 19:29 | `6e19d308e` |
| `index_before-typo.html` | 2026-09-25 19:47 | `0a8309915` |
| `index_before-artikel-description.html` | 2026-09-26 11:24 | `a34d26892` |
| `index_before-pronomen-description.html` | 2026-09-26 11:46 | `ca3de9995` |
| `index_before-modal-description.html` | 2026-09-26 12:01 | `02fb5578e` |
| `index_before-about.html` | 2026-09-26 12:59 | `23047b1ac` |
| `index_before-home-design.html` | 2026-09-26 13:05 | `5b6101d48` |
| `index_before-phrase-screen.html` | 2026-09-26 13:20 | `a198f9350` |
| `index_before-settings-design.html` | 2026-09-26 13:33 | `4131e4ce6` |
| `index_before-progress-design.html` | 2026-09-26 13:48 | `a66d683c7` |
| `index_before-head-bg.html` | 2026-09-26 13:58 | `ee1345375` |
| `index_before-pause-screen.html` | 2026-09-26 14:01 | `761fdc0cc` |
| `index_before-back-button.html` | 2026-09-26 14:06 | `b3b867ccc` |
| `index_before-touch-active.html` | 2026-09-26 14:31 | `98486eeb1` |
| `index_before-table-v2.html` | 2026-09-26 14:40 | `aec22444a` |
| `index_before-marker.html` | 2026-09-26 15:17 | `b3c98c084` |
| `index_before-wortschatz-count.html` | 2026-09-26 15:44 | `936347c7a` |
| `index_before-wortschatz-start.html` | 2026-09-26 15:46 | `16158cc0c` |
| `index_before-collection-backup.html` | 2026-09-26 16:46 | `687760ce6` |
| `index_before-collection-window.html` | 2026-09-26 16:55 | `3dfc6fad8` |
| `index_before-word-form.html` | 2026-09-26 17:10 | `1dbc6dcc3` |
| `index_before-edit-in-exercise.html` | 2026-09-26 17:19 | `6f19ab80f` |
| `index_before-import.html` | 2026-09-26 17:26 | `e2c17671d` |
| `index_before-wortschatz-english.html` | 2026-09-26 17:37 | `be2663c96` |
| `index_before-words-left.html` | 2026-09-26 17:43 | `a7969bade` |
| `index_before-start-layout.html` | 2026-09-26 17:46 | `c5aec23e3` |
| `index_before-own-layout.html` | 2026-09-26 18:17 | `66cc0f6c5` |
| `index_before-start-balance.html` | 2026-09-26 18:25 | `dc54179c6` |
| `index_before-done-screen.html` | 2026-09-26 18:32 | `2ab3c9eb7` |
| `index_before-done-compact.html` | 2026-09-26 18:39 | `95c3774c8` |
| `index_before-red-note.html` | 2026-09-26 18:45 | `193a37640` |
| `index_before-window-fixes.html` | 2026-09-26 18:51 | `3fe9ae871` |
| `index_before-starter-fold.html` | 2026-09-26 19:01 | `dc80f96a1` |
| `index_before-started-count.html` | 2026-09-26 19:05 | `9b86721f9` |
| `index_before-hint-wording.html` | 2026-09-26 19:10 | `52bce882e` |
| `index_before-add-pair.html` | 2026-09-26 19:22 | `c387e18b4` |
| `index_before-about-fold.html` | 2026-09-26 19:24 | `ea914eaa5` |
| `index_before-ws-stats.html` | 2026-09-26 19:50 | `f9eec319f` |
| `index_before-window-edge.html` | 2026-09-26 20:18 | `fca3f2b10` |
| `index_before-scroll-shell.html` | 2026-09-26 21:07 | `0edf84813` |
| `index_before-backup-reminder.html` | 2026-09-26 21:23 | `15750acad` |
| `index_before-cleanup.html` | 2026-09-27 05:38 | `01081e408` |
| **deutsch-home/Home/phrases.js** | | |
| `phrases_before-qa.js` | 2026-09-25 06:51 | `fe4772e8e` |
| `phrases_before-translations.js` | 2026-09-25 06:51 | `6312dacc7` |
| **deutsch-home/Home/progress-screen.js** | | |
| `progress-screen_before-design.js` | 2026-09-24 14:13 | `656a1a3b5` |
| `progress-screen_before-head-bg.js` | 2026-09-26 13:58 | `ce7c4388d` |
| `progress-screen_before-ws-stats.js` | 2026-09-26 19:50 | `e2681dcf1` |
| `progress-screen_before-cleanup.js` | 2026-09-26 19:58 | `d3eb0f739` |
| **deutsch-home/Home/sw.js** | | |
| `sw_before-webp-icon.js` | 2026-09-24 14:40 | `656a1a3b5` |
| **deutsch-home/Home/theme-controller.js** | | |
| `theme-controller_before-cleanup.js` | 2026-09-20 12:56 | `c0b4b1248` |
| **deutsch-home/deutsch components/deutsch-keyboard-v2.60.html** | | |
| `deutsch-keyboard-v2.60_before light.html` | 2026-09-21 20:06 | `c0b4b1248` |
| `deutsch-keyboard-v2.60_before-doubletap.html` | 2026-09-25 20:35 | `03d19aaa1` |
| **deutsch-home/notification-server/src/index.js** | | |
| `index_before-cleanup.js` | 2026-09-25 09:02 | `dd814203a` |
| **deutsch-home/praepositionen/index.html** | | |
| `index_before-qa.html` | 2026-09-24 20:44 | `9a59e1088` |
| `index_before-qa-kasus.html` | 2026-09-24 21:54 | `f7dfb3022` |
| `index_before-qa-vmp.html` | 2026-09-24 22:15 | `418266049` |
| `index_before-orts-table.html` | 2026-09-25 12:20 | `f62e463df` |
| `index_before-vmp-eff.html` | 2026-09-25 14:31 | `3ce3a2342` |
| `index_before-pickers.html` | 2026-09-25 14:31 | `3bdc5e95f` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `a8b44c730` |
| `index_before-smoothing.html` | 2026-09-25 16:22 | `cc4dfeaeb` |
| `index_before-question.html` | 2026-09-25 16:34 | `ae639b515` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `a0cf086b0` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `3d226d804` |
| `index_before-tables.html` | 2026-09-25 19:17 | `4b5d003d5` |
| `index_before-descriptions.html` | 2026-09-26 12:21 | `cea00ebc5` |
| `index_before-table-v2.html` | 2026-09-26 12:41 | `a3ff06d04` |
| `index_before-marker.html` | 2026-09-26 15:17 | `196a0ddfc` |
| **deutsch-home/praepositionen/kasus/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:15 | `c0b4b1248` |
| `index_before-qa.html` | 2026-09-24 21:54 | `389ee2fbc` |
| `index_before-ui.html` | 2026-09-25 07:20 | `cf874f6bd` |
| `index_before-translations.html` | 2026-09-25 07:20 | `4b31a5216` |
| `index_before-design.html` | 2026-09-25 08:47 | `dd814203a` |
| `index_before-summary.html` | 2026-09-25 15:28 | `d4f3f823d` |
| `index_before-topbar.html` | 2026-09-25 15:45 | `0e8b1588f` |
| `index_before-smoothing.html` | 2026-09-25 16:22 | `23dbeb2ad` |
| `index_before-question.html` | 2026-09-25 16:34 | `84a8d677f` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `788c91385` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `9dcaa4e1c` |
| `index_before-description.html` | 2026-09-26 12:21 | `ad7946a4c` |
| **deutsch-home/praepositionen/kasus/praepositionen.js** | | |
| `praepositionen_before-qa.js` | 2026-09-24 21:54 | `11e979749` |
| `praepositionen_before-translations.js` | 2026-09-24 21:54 | `349aee7ff` |
| **deutsch-home/praepositionen/ortspraepositionen/index.html** | | |
| `index_before-card-count.html` | 2026-09-24 07:31 | `c0b4b1248` |
| `index_before-progress.html` | 2026-09-24 11:23 | `f59025b68` |
| `index_before-qa.html` | 2026-09-24 20:43 | `9a59e1088` |
| `index_before-qa2.html` | 2026-09-24 21:08 | `4f432fb01` |
| `index_before-zuhint.html` | 2026-09-24 21:13 | `0cc495354` |
| `index_before-ui.html` | 2026-09-25 07:20 | `fb7ee48a9` |
| `index_before-zutexts.html` | 2026-09-25 07:29 | `3df304240` |
| `index_before-translations.html` | 2026-09-25 07:29 | `911cd2e4d` |
| `index_before-balance.html` | 2026-09-25 08:40 | `353af3205` |
| `index_before-table.html` | 2026-09-25 12:20 | `b0beb2ed7` |
| `index_before-design.html` | 2026-09-25 12:21 | `ea576342c` |
| `index_before-summary.html` | 2026-09-25 15:28 | `7cceee332` |
| `index_before-topbar.html` | 2026-09-25 15:45 | `39a3c08c7` |
| `index_before-smoothing.html` | 2026-09-25 16:22 | `07b0217d0` |
| `index_before-question.html` | 2026-09-25 16:34 | `59a22c1d1` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `33cc2c281` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `5dad78a90` |
| `index_before-tables.html` | 2026-09-25 19:17 | `437dcb120` |
| `index_before-description.html` | 2026-09-26 12:32 | `70f03c110` |
| `index_before-table-v2.html` | 2026-09-26 12:33 | `d065c90a9` |
| `index_before-marker.html` | 2026-09-26 15:17 | `f00b4524b` |
| `index_before-prep-size.html` | 2026-09-26 15:58 | `0a0ced452` |
| `index_before-center.html` | 2026-09-26 20:43 | `15bdca074` |
| **deutsch-home/praepositionen/ortspraepositionen/ortspraepositionen.js** | | |
| `ortspraepositionen_before-qa.js` | 2026-09-24 20:43 | `656a1a3b5` |
| `ortspraepositionen_before-qa2.js` | 2026-09-24 21:08 | `30d53fc22` |
| `ortspraepositionen_before-wasser.js` | 2026-09-24 21:21 | `e06b98384` |
| `ortspraepositionen_before-zutexts.js` | 2026-09-25 07:29 | `b3ba4edfc` |
| `ortspraepositionen_before-translations.js` | 2026-09-25 07:29 | `bda33e216` |
| `ortspraepositionen_before-balance.js` | 2026-09-25 08:44 | `a76e3fadf` |
| **deutsch-home/praepositionen/verben_mit_praepositionen/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:27 | `f59025b68` |
| `index_before-qa.html` | 2026-09-24 22:14 | `0d2fab0f0` |
| `index_before-ui.html` | 2026-09-25 07:20 | `beaba9b45` |
| `index_before-translations.html` | 2026-09-25 07:20 | `db0d1bed5` |
| `index_before-effectiveness.html` | 2026-09-25 14:31 | `e4f8095d3` |
| `index_before-design.html` | 2026-09-25 14:31 | `2be87e4d5` |
| `index_before-summary.html` | 2026-09-25 15:28 | `0f49cc5db` |
| `index_before-pickers.html` | 2026-09-25 15:45 | `f262d498d` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `f23c9ba7a` |
| `index_before-smoothing.html` | 2026-09-25 16:22 | `9699fbd89` |
| `index_before-question.html` | 2026-09-25 16:34 | `d4eab7bb1` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `b833af04c` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `669171594` |
| `index_before-description.html` | 2026-09-26 12:41 | `372e1c5da` |
| **deutsch-home/praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.js** | | |
| `verben_mit_praepositionen_before-qa.js` | 2026-09-24 22:14 | `349aee7ff` |
| `verben_mit_praepositionen_before-translations.js` | 2026-09-24 22:14 | `ed9dae5bc` |
| `verben_mit_praepositionen_before-effectiveness.js` | 2026-09-25 14:31 | `8d4a5221d` |
| **deutsch-home/pronomen/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:36 | `f59025b68` |
| `index_before-statusbar.html` | 2026-09-24 14:13 | `c67e1e219` |
| `index_before-qa.html` | 2026-09-25 06:19 | `4304ef3ce` |
| `index_before-ui.html` | 2026-09-25 07:20 | `59678ebbd` |
| `index_before-translations.html` | 2026-09-25 07:20 | `c1987cbf0` |
| `index_before-balance.html` | 2026-09-25 07:50 | `f9d182d4e` |
| `index_before-effectiveness.html` | 2026-09-25 11:53 | `5e542ebd8` |
| `index_before-design.html` | 2026-09-25 11:54 | `906a1826c` |
| `index_before-summary.html` | 2026-09-25 15:28 | `c55dfaf12` |
| `index_before-fonts.html` | 2026-09-25 15:45 | `43de1e89d` |
| `index_before-pickers.html` | 2026-09-25 15:51 | `008344669` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `4bd640ac5` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `44df3bb07` |
| `index_before-question.html` | 2026-09-25 16:34 | `0d614250d` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `215e88c98` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `aacc60f92` |
| `index_before-tables.html` | 2026-09-25 19:17 | `1952dd01a` |
| `index_before-description.html` | 2026-09-26 11:46 | `01d41086b` |
| `index_before-endings-order.html` | 2026-09-26 15:22 | `5974f1759` |
| `index_before-table-polish.html` | 2026-09-26 15:53 | `72923254f` |
| `index_before-table-compact.html` | 2026-09-26 20:23 | `86bf628a4` |
| `index_before-sie-row.html` | 2026-09-26 20:29 | `f4e9e16b5` |
| `index_before-formal-row.html` | 2026-09-26 20:38 | `1aec3576f` |
| **deutsch-home/pronomen/pronouns.js** | | |
| `pronouns_before-qa.js` | 2026-09-25 06:19 | `cbd575996` |
| `pronouns_before-translations.js` | 2026-09-25 06:20 | `b81d513b2` |
| `pronouns_before-balance.js` | 2026-09-25 07:43 | `924579ebc` |
| `pronouns_before-effectiveness.js` | 2026-09-25 11:53 | `512584192` |
| **deutsch-home/verbformen/index.html** | | |
| `index_before-qa.html` | 2026-09-24 21:36 | `11e979749` |
| `index_before-qa-modal.html` | 2026-09-25 05:59 | `cbd575996` |
| `index_before-pickers.html` | 2026-09-25 11:13 | `cf35e8935` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `954052766` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `2adb8af8c` |
| `index_before-question.html` | 2026-09-25 16:34 | `05d2ba65b` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `d672a6742` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `4c38e18f4` |
| `index_before-tables.html` | 2026-09-25 19:17 | `4925cba9d` |
| `index_before-modal-description.html` | 2026-09-26 12:01 | `be879e77b` |
| **deutsch-home/verbformen/modalverben/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:21 | `c0b4b1248` |
| `index_before-statusbar.html` | 2026-09-24 14:13 | `44dcd60e4` |
| `index_before-qa.html` | 2026-09-25 05:59 | `c0625c1f5` |
| `index_before-ui.html` | 2026-09-25 07:20 | `ad0f2df0e` |
| `index_before-translations.html` | 2026-09-25 07:20 | `b49ddb41e` |
| `index_before-balance.html` | 2026-09-25 09:31 | `5482ef14e` |
| `index_before-design.html` | 2026-09-25 11:13 | `f03b0a741` |
| `index_before-summary.html` | 2026-09-25 15:28 | `aaa89fef1` |
| `index_before-fonts.html` | 2026-09-25 15:45 | `7516dc88d` |
| `index_before-pickers.html` | 2026-09-25 15:51 | `e66d2b11d` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `b5e7015b0` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `39dddef4d` |
| `index_before-question.html` | 2026-09-25 16:34 | `714c25416` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `36a963314` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `b7c416a78` |
| `index_before-tables.html` | 2026-09-25 19:17 | `ac96a4065` |
| `index_before-description.html` | 2026-09-26 12:01 | `edf4224cc` |
| **deutsch-home/verbformen/modalverben/special_verbs.js** | | |
| `special_verbs_before-qa.js` | 2026-09-25 05:59 | `418266049` |
| `special_verbs_before-translations.js` | 2026-09-25 05:59 | `2f51ef23e` |
| `special_verbs_before-balance.js` | 2026-09-25 09:31 | `9d8bc5695` |
| **deutsch-home/verbformen/partizipII/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:19 | `c0b4b1248` |
| `index_before-statusbar.html` | 2026-09-24 14:13 | `656a1a3b5` |
| `index_before-qa.html` | 2026-09-24 21:36 | `11e979749` |
| `index_before-ui.html` | 2026-09-25 07:20 | `f48fc3477` |
| `index_before-translations.html` | 2026-09-25 07:20 | `d7096afbc` |
| `index_before-design.html` | 2026-09-25 08:35 | `1a20b6668` |
| `index_before-summary.html` | 2026-09-25 15:28 | `d7945a9d4` |
| `index_before-fonts.html` | 2026-09-25 15:45 | `cb3bcbe01` |
| `index_before-pickers.html` | 2026-09-25 15:51 | `0504723c8` |
| `index_before-topbar.html` | 2026-09-25 16:02 | `0b6ebf8e7` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `eb3977983` |
| `index_before-question.html` | 2026-09-25 16:34 | `1c2058d09` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `f206773a1` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `d79593819` |
| `index_before-tables.html` | 2026-09-25 19:17 | `f80bd687f` |
| `index_before-description.html` | 2026-09-26 12:14 | `60c77c2ce` |
| **deutsch-home/verbformen/partizipII/verbs.js** | | |
| `verbs_before-qa.js` | 2026-09-24 21:36 | `e06b98384` |
| `verbs_before-translations.js` | 2026-09-25 07:10 | `1f1d31c55` |
| **deutsch-home/wortschatz/collection-window.js** | | |
| `collection-window_before-word-form.js` | 2026-09-26 17:11 | `1dbc6dcc3` |
| `collection-window_before-edit-in-exercise.js` | 2026-09-26 17:20 | `a679a3834` |
| `collection-window_before-import.js` | 2026-09-26 17:25 | `328af431c` |
| `collection-window_before-english.js` | 2026-09-26 17:38 | `354d44177` |
| `collection-window_before-start-layout.js` | 2026-09-26 17:42 | `d644a797e` |
| `collection-window_before-starter-list.js` | 2026-09-26 18:10 | `8b2a9845c` |
| `collection-window_before-own-layout.js` | 2026-09-26 18:17 | `8415f55a7` |
| `collection-window_before-done-screen.js` | 2026-09-26 18:25 | `d2c6e2ac7` |
| `collection-window_before-red-note.js` | 2026-09-26 18:39 | `a679b4338` |
| `collection-window_before-window-fixes.js` | 2026-09-26 18:51 | `ce9d98077` |
| `collection-window_before-starter-fold.js` | 2026-09-26 19:01 | `5a0be209b` |
| `collection-window_before-started-count.js` | 2026-09-26 19:05 | `a6813e9aa` |
| `collection-window_before-hint-wording.js` | 2026-09-26 19:10 | `df7831cdf` |
| `collection-window_before-add-pair.js` | 2026-09-26 19:22 | `6f97cc485` |
| `collection-window_before-ws-stats.js` | 2026-09-26 19:50 | `d377dc7d1` |
| **deutsch-home/wortschatz/collection.js** | | |
| `collection_before-english.js` | 2026-09-26 16:57 | `3dfc6fad8` |
| **deutsch-home/wortschatz/index.html** | | |
| `index_before-progress.html` | 2026-09-24 11:46 | `f59025b68` |
| `index_before-merge.html` | 2026-09-25 07:07 | `34cd07a78` |
| `index_before-ui.html` | 2026-09-25 07:20 | `034460145` |
| `index_before-translations.html` | 2026-09-25 07:20 | `f6c5614ee` |
| `index_before-summary.html` | 2026-09-25 09:59 | `32e7c3595` |
| `index_before-topbar.html` | 2026-09-25 15:45 | `8dc8507cd` |
| `index_before-smoothing.html` | 2026-09-25 16:21 | `afd7334a7` |
| `index_before-question.html` | 2026-09-25 16:34 | `5acc8df53` |
| `index_before-buttons.html` | 2026-09-25 18:24 | `981aa78fa` |
| `index_before-feedback.html` | 2026-09-25 18:54 | `53caf16fb` |
| `index_before-typo.html` | 2026-09-25 19:16 | `a749ae3e7` |
| `index_before-typo-list.html` | 2026-09-25 20:25 | `990ecb1d5` |
| `index_before-hint-text.html` | 2026-09-25 20:31 | `598f8a582` |
| `index_before-typo-checkbox.html` | 2026-09-25 20:48 | `6c75c582a` |
| `index_before-wortschatz-count.html` | 2026-09-26 15:44 | `2763080bd` |
| `index_before-start.html` | 2026-09-26 15:46 | `3c6d69b4a` |
| `index_before-collection-storage.html` | 2026-09-26 16:45 | `befc26278` |
| `index_before-collection-window.html` | 2026-09-26 16:55 | `dea4c9687` |
| `index_before-word-form.html` | 2026-09-26 17:08 | `c10a0e6d9` |
| `index_before-edit-in-exercise.html` | 2026-09-26 17:20 | `3d7da1569` |
| `index_before-import.html` | 2026-09-26 17:26 | `aa26def72` |
| `index_before-english.html` | 2026-09-26 17:37 | `758f18eb4` |
| `index_before-words-left.html` | 2026-09-26 17:43 | `38a216a92` |
| `index_before-start-layout.html` | 2026-09-26 17:47 | `709724824` |
| `index_before-own-layout.html` | 2026-09-26 18:17 | `35a3bad2e` |
| `index_before-start-balance.html` | 2026-09-26 18:26 | `1ef0c96ff` |
| `index_before-done-screen.html` | 2026-09-26 18:32 | `fb24614c5` |
| `index_before-done-compact.html` | 2026-09-26 18:39 | `e836b5556` |
| `index_before-red-note.html` | 2026-09-26 18:45 | `d6c9d3908` |
| `index_before-window-fixes.html` | 2026-09-26 18:52 | `48f943518` |
| `index_before-starter-fold.html` | 2026-09-26 19:01 | `f87aa6d1d` |
| `index_before-started-count.html` | 2026-09-26 19:05 | `dffecc4d2` |
| `index_before-hint-wording.html` | 2026-09-26 19:10 | `2a7424d61` |
| `index_before-add-pair.html` | 2026-09-26 19:22 | `33eb366bb` |
| `index_before-about-fold.html` | 2026-09-26 19:25 | `49818537c` |
| `index_before-ws-stats.html` | 2026-09-26 19:50 | `fc43c9bcd` |
| `index_before-window-edge.html` | 2026-09-26 20:18 | `75d7ddead` |
| **deutsch-home/wortschatz/words.js** | | |
| `words_before-merge.js` | 2026-09-25 07:07 | `6312dacc7` |
| `words_before-translations.js` | 2026-09-25 07:07 | `8dd3c2dce` |
