"""Build a translation-only projection; verify every exported value against JSONL."""
import argparse, collections, gzip, hashlib, json, pathlib, re
from urllib.parse import quote
ROOT = pathlib.Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'deutsch-home/open data/kaikki.org-dictionary-Немецкий.jsonl'
OUTPUT = SOURCE.parent / 'dictionary-de-ru-json'
EXPECTED = 'b391a51ca25314822613223ac1290d9bc94f4289b11f572232bc3a7e15014f4e'
COUNT = 1024
FIELDS = ['glosses', 'id', 'tags', 'raw_tags', 'form_of', 'examples']
REVIEWED = {'ru-sein-de-verb-yBJK18UD': 'Possessive pronoun incorrectly labelled verb; do not relabel automatically.',
            'ru-sein-de-verb-ReCTCr6o': 'Possessive pronoun incorrectly labelled verb; do not relabel automatically.'}
FORM_PATTERN = r'^\s*форма\s+(?:настоящего|прошедшего|будущего|именительного|родительного|дательного|винительного|повелительного|сослагательного|сравнительной|превосходной|наст\.|прош\.)'

def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''): h.update(chunk)
    return h.hexdigest()

def bucket(word):
    value = 2166136261
    for b in word.encode(): value = ((value ^ b) * 16777619) & 0xffffffff
    return value & 1023

def encoded(value): return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
def write(p, value): p.write_bytes(encoded(value))

def status(s):
    if s.get('id') in REVIEWED: return 'reviewed-pos-conflict'
    if s.get('form_of') or 'form-of' in s.get('tags', []): return 'form-description'
    if not any(isinstance(g,str) and g.strip() for g in s.get('glosses', [])) or 'no-gloss' in s.get('tags', []): return 'no-gloss'
    if any(re.match(FORM_PATTERN,g,re.I) for g in s.get('glosses', [])): return 'suspected-form-description'
    return 'translation'

def convert():
    assert digest(SOURCE) == EXPECTED
    parts = [collections.defaultdict(list) for _ in range(COUNT)]
    counts = collections.Counter()
    for number, line in enumerate(SOURCE.open(encoding='utf-8'), 1):
        d = json.loads(line); assert d['lang_code'] == 'de'
        senses = []
        for i, s in enumerate(d.get('senses', [])):
            state = status(s); counts[state] += 1
            senses.append({'sense_index':i,'display_status':state,'data':{k:s[k] for k in FIELDS if k in s}})
        record = {'record_id':number, 'word':d['word'], 'pos':d.get('pos'),
                  'source_url':'https://ru.wiktionary.org/wiki/' + quote(d['word'], safe=''), 'senses':senses}
        parts[bucket(d['word'])][d['word']].append(record)
    (OUTPUT/'parts').mkdir(parents=True, exist_ok=True)
    files = []
    for i, records in enumerate(parts):
        p = OUTPUT/'parts'/f'{i:04d}.json'; write(p,{'format_version':1,'partition':i,'records':records})
        files.append({'path':f'parts/{i:04d}.json','bytes':p.stat().st_size,'sha256':digest(p),
                      'gzip_6_bytes':len(gzip.compress(p.read_bytes(),compresslevel=6,mtime=0))})
    manifest = {'format_version':1,'converter_version':'1.0.0','purpose':'Translations for already resolved German lemmas/POS only; no morphology index.',
      'source':{'file':SOURCE.name,'bytes':SOURCE.stat().st_size,'sha256':EXPECTED,
                'page':'https://kaikki.org/ruwiktionary/Немецкий/index.html',
                'release_note':'Public page dated extraction 2026-10-02, dump 2026-10-01; local file identified by checksum, remote byte identity not checked.'},
      'license':{'name':'CC BY-SA 4.0','url':'https://creativecommons.org/licenses/by-sa/4.0/'},
      'attribution':'Russian Wiktionary contributors; extracted and postprocessed via Wiktextract / Kaikki.org.',
      'conversion_notice':'Translation projection and partitioning; source texts and selected fields preserved. Display eligibility annotations added; original JSONL unchanged.',
      'projection':{'sense_fields':FIELDS,'omitted':'All unlisted entry/sense fields, including forms, audio, etymology, relations and categories. Original JSONL remains the complete source.',
                    'identity':'1-based JSONL record_id plus 0-based sense_index; source sense.id is not unique.',
                    'case_policy':'Exact source spelling retained. No lowercase alias index; caller must handle casing and POS conservatively.'},
      'display_policy':{'translation':'Eligible, not a guarantee of correctness.', 'form-description':'Excluded from translation display; preserved.',
                        'suspected-form-description':'Excluded conservatively; preserved for review.', 'no-gloss':'No translation.',
                        'reviewed-pos-conflict':'Excluded; source POS is preserved, not corrected.',
                        'form_pattern':FORM_PATTERN,'reviewed_sense_ids':REVIEWED},
      'partition_count':COUNT,'routing':'FNV-1a 32-bit over exact UTF-8 key bytes; hash & 1023',
      'records':number,'senses':sum(counts.values()),'display_counts':dict(counts),
      'routing_vectors':[{'word':w,'partition':bucket(w)} for w in ['', 'Haus','haus','Häuser','gehen','ging','Straße','Ä','A\u0308','𐐀']],
      'partitions':files}
    write(OUTPUT/'manifest.json',manifest)
    (OUTPUT/'NOTICE.md').write_text('''# German words with Russian definitions

Russian Wiktionary contributors → Wiktextract / Kaikki.org.

Text data: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
Source: https://kaikki.org/ruwiktionary/Немецкий/index.html
Wiktionary articles: source_url in each exported record (article history credits contributors).
Wikimedia reuse terms: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content

This is a translation projection into partitioned JSON, with display eligibility annotations. Selected source texts/fields remain unchanged. Omitted fields are listed in manifest.json. Original JSONL is preserved separately and is the complete source. Kaikki already extracted/postprocessed Wiktionary content. Known POS conflicts and grammatical-form descriptions remain in the export but are flagged against translation display. No audio is redistributed in this projection. No Russian morphology or lemma resolver is built.

Adapted dictionary data is distributed under CC BY-SA 4.0. Each record retains its source article URL; preserve attribution, license links and modification notices when redistributing.
''',encoding='utf-8')

def verify():
    m = json.loads((OUTPUT/'manifest.json').read_text()); assert digest(SOURCE) == EXPECTED == m['source']['sha256']
    restored = {}; states = collections.Counter()
    assert len(m['partitions']) == COUNT
    for i, info in enumerate(m['partitions']):
        assert info['path'] == f'parts/{i:04d}.json'
        p = OUTPUT/info['path']; assert digest(p)==info['sha256'] and p.stat().st_size==info['bytes']
        part = json.loads(p.read_text()); assert part['partition']==i and part['format_version']==1
        for word, rows in part['records'].items():
            # Independent routing expression.
            h = 2166136261
            for byte in word.encode('utf-8'): h = ((h ^ byte) * 16777619) % (2**32)
            assert h % 1024 == i
            for row in rows:
                assert row['word']==word and row['record_id'] not in restored
                restored[row['record_id']] = row
    senses = 0
    for number, line in enumerate(SOURCE.open(encoding='utf-8'),1):
        source = json.loads(line); row = restored.pop(number)
        assert row['word']==source['word'] and row['pos']==source.get('pos')
        assert row['source_url']=='https://ru.wiktionary.org/wiki/'+quote(source['word'],safe='')
        assert len(row['senses'])==len(source.get('senses',[]))
        for index, (original, exported) in enumerate(zip(source.get('senses',[]),row['senses'])):
            assert exported['sense_index']==index
            assert exported['data']=={k:original[k] for k in m['projection']['sense_fields'] if k in original}
            assert exported['display_status']==status(original)
            states[exported['display_status']]+=1; senses+=1
    assert not restored and number==m['records'] and senses==m['senses'] and dict(states)==m['display_counts']
    assert digest(SOURCE)==EXPECTED
    result={'status':'passed','source_sha256':EXPECTED,'records_verified':number,'senses_verified':senses,
      'partitions_verified':COUNT,'json_bytes':sum(f['bytes'] for f in m['partitions']),
      'gzip_6_bytes':sum(f['gzip_6_bytes'] for f in m['partitions']),
      'checks':['all exported record identities','all projected fields and values against a second JSONL read','exact spelling and routing','all partition hashes and sizes','sense ordering and repeat IDs retained','display annotations','source unchanged'],
      'scope':'Projection equivalence, not full JSONL round-trip; omitted fields stay in original. Display annotations re-evaluated with same policy.'}
    write(OUTPUT/'verification.json',result); print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('--verify-only',action='store_true'); args=parser.parse_args()
    if not args.verify_only: convert()
    verify()
