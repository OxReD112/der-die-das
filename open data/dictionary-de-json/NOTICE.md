# German–English dictionary data

Wiktionary contributors → Kaikki.org extraction → Lector SQLite dataset.

Licensed under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/

The source dataset was extracted from Wiktionary via Kaikki.org and packaged as a lookup database by Lector.

The original SQLite dataset was converted into partitioned JSON files for application lookup. Dictionary content was preserved, except: 2026-10-25 — 170,856 Wiktionary template rows (types inflection-template and table-tags: a template or table label as the form, every word using it as the lemma) were removed from the inflections table; no other content was changed (manifest.json, cleaning_history).

https://en.wiktionary.org/
https://kaikki.org/dictionary/German/
https://lector.dev/free/german-dictionary/
https://github.com/heuwels/lector/releases/tag/dict-de-2026-06-25

Enrichment (converter 2.0.0, 2026-10-22): noun gender, noun declension and sense usage labels added from the Kaikki.org extraction of English Wiktionary (kaikki.org German, export 2026-10-03 (enwiktionary dump 2026-09-02)), with Russian Wiktionary (Kaikki.org) as a fallback source of gender. Same licence (CC BY-SA 4.0).
https://ru.wiktionary.org/
