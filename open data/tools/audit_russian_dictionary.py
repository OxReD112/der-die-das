"""Read-only audit of the Russian Wiktionary German JSONL. Writes a QA report only."""
import collections, hashlib, json, pathlib, re, unicodedata
ROOT = pathlib.Path(__file__).resolve().parents[3]
SOURCE = next((ROOT / 'deutsch-home/open data').glob('kaikki*.jsonl'))
OUTPUT = ROOT / 'Documentation/QA/Bibliothek_Russian_Dictionary_Audit_2026-10-06.json'
counts = collections.Counter()
fields, sense_fields, positions, tags = [collections.Counter() for _ in range(4)]
words, lexical_words, pairs, ids = set(), set(), set(), set()
examples = collections.defaultdict(list)
english_pairs = set()
for part in sorted((ROOT / 'deutsch-home/open data/dictionary-de-json/parts').glob('*.json')):
    for word, data in json.loads(part.read_text()).get('records', {}).items():
        for row in data.get('senses', []):
            english_pairs.add((unicodedata.normalize('NFC', word).casefold(), row[2]))

def example(kind, word, pos, sense):
    if len(examples[kind]) < 5:
        examples[kind].append({'word': word, 'pos': pos, 'sense': sense})

initial_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
for line in SOURCE.open(encoding='utf-8'):
    d = json.loads(line)
    counts['records'] += 1
    fields.update(d.keys())
    word, pos = d['word'], d.get('pos')
    words.add(word); pairs.add((word, pos)); positions[pos] += 1
    counts['non_de_records'] += d.get('lang_code') != 'de'
    counts['non_nfc_words'] += word != unicodedata.normalize('NFC', word)
    counts['forms'] += len(d.get('forms', []))
    lexical = False
    has_gloss = False
    for s in d.get('senses', []):
        counts['senses'] += 1; sense_fields.update(s.keys()); tags.update(s.get('tags', []))
        ident = s.get('id')
        if ident:
            counts['duplicate_sense_ids'] += ident in ids; ids.add(ident)
        glosses = [g for g in s.get('glosses', []) if isinstance(g, str) and g.strip()]
        has_gloss |= bool(glosses)
        structured_form = bool(s.get('form_of')) or 'form-of' in s.get('tags', [])
        descriptive_form = any(re.match(r'^\s*форма\s+(?:настоящего|прошедшего|будущего|именительного|родительного|дательного|винительного|повелительного|сослагательного|сравнительной|превосходной|наст\.|прош\.)', g, re.I) for g in glosses)
        empty = not glosses or 'no-gloss' in s.get('tags', [])
        counts['senses_with_form_of'] += bool(s.get('form_of'))
        counts['structured_form_senses'] += structured_form
        counts['descriptive_form_senses'] += descriptive_form
        counts['descriptive_form_without_marker'] += descriptive_form and not structured_form
        counts['senses_without_nonempty_gloss'] += not glosses
        counts['senses_with_no_gloss_tag'] += 'no-gloss' in s.get('tags', [])
        counts['examples'] += len(s.get('examples', []))
        usable = not empty and not structured_form and not descriptive_form
        counts['conservative_lexical_senses'] += usable
        if usable:
            lexical = True
            counts['lexical_senses_matching_en_word_pos'] += (unicodedata.normalize('NFC', word).casefold(), pos) in english_pairs
        for kind, matches in [('form', structured_form), ('unmarked_form', descriptive_form and not structured_form), ('empty', empty), ('unknown_pos', pos == 'unknown')]:
            if matches: example(kind, word, pos, s)
        if word in {'sein', 'Bank', 'Haus', 'ging', 'Häuser', 'Arbeitsamt'}:
            example('sample_' + word, word, pos, s)
    counts['records_without_nonempty_gloss'] += not has_gloss
    counts['records_with_lexical_sense'] += lexical
    if lexical: lexical_words.add(word)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == initial_hash, 'Source changed'
report = {'audit_date':'2026-10-06','source':{'file':str(SOURCE.relative_to(ROOT)), 'bytes':SOURCE.stat().st_size,'sha256':initial_hash},
          'counts':dict(counts),'distinct_words':len(words),'distinct_word_pos':len(pairs),'words_with_conservative_lexical_sense':len(lexical_words),
          'entry_fields':dict(fields),'sense_fields':dict(sense_fields),'pos_records':dict(positions),'sense_tags':dict(tags),'examples':dict(examples),
          'method':'Conservative lexical screening for audit only: nonempty gloss, no no-gloss, no form_of/form-of, no gloss starting with a specific Russian grammatical-form description. This heuristic can flag lexical uses; it is not a production filter. EN overlap uses NFC+casefold and exact POS, not guaranteed resolver reachability.',
          'source_unchanged':True}
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('examples','entry_fields','sense_fields','sense_tags')}, ensure_ascii=False, indent=2))
