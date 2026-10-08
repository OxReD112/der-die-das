# German dictionary autocomplete index

`words.json` contains 340,553 unique entry words, preserving source spelling.
It is a JSON array, sorted by Unicode code point. It includes inflected words
that have entries, but not keys appearing only in other tables. It contains
no definitions, translations, or grammatical metadata.

Size: 5,011,452 bytes; estimated gzip transfer size: 954,851 bytes.
The estimate does not confirm HTTP compression on the hosting service.

`manifest.json` records the source, licence, checksums, format, and routing rule.
`NOTICE.md` retains attribution and explains the index extraction.
Publish these notices alongside the word index.

For lookup, hash the original indexed word using the manifest's FNV-1a UTF-8
routing rule to find `../dictionary-de-json/parts/NNNN.json`. No partition
number needs to be stored alongside each word. Search normalization must keep
the original word available for this lookup. JavaScript default sort differs
from code point ordering for supplementary Unicode characters; search code
must account for this or construct its own normalized index.

From the workspace root, regenerate using:

```sh
python3 'deutsch-home/open data/tools/build_autocomplete_index.py'
```

Verify without writing:

```sh
python3 'deutsch-home/open data/tools/build_autocomplete_index.py' --verify-only
```

Both commands verify every source partition checksum, complete entry-word
coverage, uniqueness, and routing. Generation writes only this separate index
directory. Updating our own Wörterbuch does not require regenerating this index.

Search integration and hosting are separate steps; this index is not yet loaded
by the application.
