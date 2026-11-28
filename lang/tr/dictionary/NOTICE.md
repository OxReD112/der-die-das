# German words with Turkish translations

Built from two Wiktionaries, both via Wiktextract / Kaikki.org:

1. **Turkish Wiktionary (Vikisözlük)** contributors — German entries. Source: https://kaikki.org/trwiktionary/Almanca/index.html — file `kaikki.org-dictionary-Almanca.jsonl` (extraction of 3.11.2026), 24 879 922 bytes, sha256 07922e2e8fa96bd3a6a8b7531c31a8940b9df6c91f51b533af12d7a0bfe669f8; kept unchanged in the GitHub release External-dic (`kaikki.org-dictionary-trwiktionary-German.jsonl.zip`). The main source.
2. **German Wiktionary (de.wiktionary)** contributors — Turkish entries of the translation tables («Übersetzungen») of German entries. Source: https://kaikki.org/dewiktionary/rawdata.html — file `raw-wiktextract-data.jsonl.gz` (extraction of 1.11.2026), 312 173 123 bytes, sha256 3405adc801ae68406304f9317421d3df6bca74ffcaa041a88afc44c5a5debcbe. Used only for a word and part of speech without a translation in the Turkish Wiktionary.

Text data of both: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
Wiktionary articles: `source_url` and `source` (tr.wiktionary / de.wiktionary) in each exported record (article history credits contributors).
Wikimedia reuse terms: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content

**What was changed.** The two sources were combined into one translation projection in partitioned JSON (same layout as `lang/pl/dictionary`), built by `deutsch-home/lang/tools/convert_kaikki_dictionary.py`; one record never mixes the two sources.
- Turkish Wiktionary: selected fields (glosses, id, tags, raw_tags, form_of, examples) are kept byte for byte. Form descriptions (also those written only in the gloss text, «… sözcüğünün … çekimi», and, since 1024-2, every sense of a record in the category «Almanca çekimli …» — an inflected form such as Kalenders «takvimin»), «translation missing» placeholders and pointers («… kavramının kısaltması», spelling variants) are marked as not shown. Added: display status, style / region / subject labels as codes, proper-name kind, reflexive use, separable reading and transitivity of verbs, Turkish syntax hints, a reformatted display text (`shown`: the Turkish part of an abbreviation, without a leading label or a final full stop), the part of speech aligned with the English dictionary's inventory (original in `source_pos`), noun gender.
- German Wiktionary: the Turkish translations of each numbered sense are reformatted into one sense (synonyms joined with «, »); the German definition of the sense and its number are kept with it (`definition_de`, `sense_number`); uncertain translations are left out.

The data is used only to show translations of words already resolved by the app; it never changes how a word is resolved. No audio is redistributed.

The combined dictionary is distributed under the same license, CC BY-SA 4.0. Preserve attribution, license links and modification notices when redistributing.
