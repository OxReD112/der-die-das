# Complete Bibliothek verb forms

Preview: `node deutsch-home/worterbuch/scripts/fill-verb-forms.cjs`

Apply: `node deutsch-home/worterbuch/scripts/fill-verb-forms.cjs --write`

The curated-library convention is documented in `Documentation/WOERTERBUCH_VERBS.md`:
authored `forms` contains educationally significant irregular tenses; missing ordinary
tenses follow regular rules. This convention is not assumed for external dictionaries.
The generator fills `lookup_forms` only and preserves every authored form. Bibliothek
combines the two fields for its tables and lookup; Wörterbuch continues using authored
`forms`. The earlier generated regular Präsens tables were moved into lookup_forms.
The earlier regular-present CLI delegates to this script.

Präsens handles e insertion, sibilants, -eln and -ern. Regular Präteritum uses -te/-ete
and personal endings; regular simple Konjunktiv II coincides with Präteritum (no würde
substitution). Separable and reflexive forms keep their particles/pronouns. Existing
stored and lookup forms always win.

Reviewed exceptions: backen uses regular backte and the documented strong Konjunktiv
II böke; schieflaufen, stattfinden and feststehen reuse laufen, finden and stehen;
gelingen and geschehen use the principal parts recorded in their usage notes. The
lassen phrases reuse lassen with the appropriate reflexive pronoun. Restricted
third-person verbs retain only applicable rows; weather verbs use the singular es row.
For möchten no independent past paradigm is invented. It retains its existing Präsens
and explanation. Existing teaching forms and usage notes are not edited.

This is a library-specific enrichment rule, not a general German irregularity detector.
New cards must follow the documented convention and exceptions must be reviewed.

Sources:
- Project's verb documentation and existing usage notes / authored paradigms.
- https://www.duden.de/rechtschreibung/gelingen
- https://www.duden.de/rechtschreibung/geschehen
- Duden Bedeutungswörterbuch (backen principal parts): https://api.pageplace.de/preview/DT0400.9783411912513_A33548624/preview-9783411912513_A33548624.pdf

Checks:
- `node deutsch-home/worterbuch/tests/full-verb-forms-qa.cjs`
- `node deutsch-home/worterbuch/tests/regular-present-qa.cjs`
- Browser: Bibliothek candidate-merging and Wörterbuch regular-card-ui QA.

Bibliothek highlights all matching forms when details are opened from a clicked word; the form-highlight browser QA checks repeated cells, Perfekt and separable forms.
