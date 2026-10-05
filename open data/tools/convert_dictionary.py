"""Lossless SQLite-to-JSON conversion and independent full round-trip verification."""
import argparse
import hashlib
import itertools
import json
import pathlib
import sqlite3
import tempfile

from measure_partitions import SOURCE, SCHEMAS, bucket, encode

VERSION = '1.0.0'
COUNT = 1024
EXPECTED = '5eec9eb09eb9bbf55893e614be92003f402b2a1a1cb71345305083a22ded6a4b'
OUTPUT = SOURCE.parent / 'dictionary-de-json'

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def source_db():
    return sqlite3.connect(SOURCE.as_uri() + '?immutable=1', uri=True)

def write_json(path, value):
    path.write_bytes(encode(value))

def convert():
    assert digest(SOURCE) == EXPECTED, 'Unexpected source checksum'
    db = source_db()
    assert db.execute('PRAGMA quick_check').fetchone() == ('ok',)
    actual_tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert actual_tables == set(SCHEMAS) | {'sqlite_sequence'}, 'Unrecognized source tables'
    parts = [{} for _ in range(COUNT)]
    counts = {}
    for table, columns in SCHEMAS.items():
        assert [r[1] for r in db.execute('PRAGMA table_info(' + table + ')')] == columns
        counts[table] = 0
        for row in db.execute('SELECT ' + ','.join(columns) + ' FROM ' + table + ' ORDER BY ' + ','.join(columns)):
            word = row[0] if table in ('entries', 'inflections') else row[1]
            parts[bucket(word, COUNT)].setdefault(word, {}).setdefault(table, []).append(list(row))
            counts[table] += 1
    (OUTPUT / 'parts').mkdir(parents=True, exist_ok=True)
    files = []
    for index, records in enumerate(parts):
        relative = f'parts/{index:04d}.json'
        path = OUTPUT / relative
        write_json(path, {'format_version': 1, 'partition': index, 'records': records})
        files.append({'path': relative, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    manifest = {
        'format_version': 1, 'converter_version': VERSION,
        'source': {'file': SOURCE.name, 'sha256': EXPECTED,
                   'release': 'https://github.com/heuwels/lector/releases/tag/dict-de-2026-06-25'},
        'license': {'name': 'CC BY-SA 4.0', 'url': 'https://creativecommons.org/licenses/by-sa/4.0/'},
        'attribution': 'Wiktionary contributors; extracted via Kaikki.org; SQLite dataset provided by Lector.',
        'sources': ['https://en.wiktionary.org/', 'https://kaikki.org/dictionary/German/',
                    'https://lector.dev/free/german-dictionary/'],
        'conversion_notice': 'The original SQLite dataset was converted into partitioned JSON files for application lookup. Dictionary content was preserved.',
        'upstream_processing_notice': 'The source dataset was extracted from Wiktionary via Kaikki.org and packaged as a lookup database by Lector.',
        'partition_count': COUNT, 'routing': 'FNV-1a 32-bit over exact UTF-8 key bytes; hash & 1023',
        'columns': SCHEMAS, 'table_counts': counts,
        'schema': db.execute('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').fetchall(),
        'sequence_metadata': db.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name').fetchall(),
        'routing_vectors': [{'word': w, 'partition': bucket(w, COUNT)} for w in
                            ('', 'bibliothek', 'häuser', 'haus', 'ging', 'gehen', 'Straße', 'Ä', 'A\u0308', '𐐀')],
        'partitions': files,
    }
    write_json(OUTPUT / 'manifest.json', manifest)
    (OUTPUT / 'NOTICE.md').write_text(
        '# German–English dictionary data\n\n'
        'Wiktionary contributors → Kaikki.org extraction → Lector SQLite dataset.\n\n'
        'Licensed under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/\n\n'
        + manifest['upstream_processing_notice'] + '\n\n' + manifest['conversion_notice'] + '\n\n'
        + '\n'.join(manifest['sources']) + '\n' + manifest['source']['release'] + '\n', encoding='utf-8')
    db.close()
    print('Conversion complete; starting independent round-trip verification.', flush=True)

def verify():
    manifest = json.loads((OUTPUT / 'manifest.json').read_text(encoding='utf-8'))
    assert digest(SOURCE) == manifest['source']['sha256'] == EXPECTED
    assert manifest['columns'] == SCHEMAS and manifest['partition_count'] == COUNT
    assert len(manifest['partitions']) == COUNT
    original = source_db()
    schema = original.execute('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').fetchall()
    assert manifest['schema'] == [list(row) for row in schema]
    counts = {table: 0 for table in SCHEMAS}
    with tempfile.TemporaryDirectory(prefix='dictionary-roundtrip-') as folder:
        restored = sqlite3.connect(str(pathlib.Path(folder) / 'restored.db'))
        for table in SCHEMAS:
            restored.execute(next(row[3] for row in schema if row[0] == 'table' and row[1] == table))
        for index, info in enumerate(manifest['partitions']):
            assert info['path'] == f'parts/{index:04d}.json'
            path = OUTPUT / info['path']
            assert path.stat().st_size == info['bytes'] and digest(path) == info['sha256']
            partition = json.loads(path.read_text(encoding='utf-8'))
            assert set(partition) == {'format_version', 'partition', 'records'}
            assert partition['format_version'] == 1 and partition['partition'] == index
            for word, tables in partition['records'].items():
                assert bucket(word, COUNT) == index
                for table, rows in tables.items():
                    assert table in SCHEMAS and rows
                    for row in rows:
                        assert len(row) == len(SCHEMAS[table])
                        assert row[0 if table in ('entries', 'inflections') else 1] == word
                    restored.executemany('INSERT INTO ' + table + ' VALUES (' + ','.join('?' for _ in SCHEMAS[table]) + ')', rows)
                    counts[table] += len(rows)
        restored.commit()
        for table, columns in SCHEMAS.items():
            query = 'SELECT ' + ','.join(columns) + ' FROM ' + table + ' ORDER BY ' + ','.join(columns)
            sentinel = object()
            for a, b in itertools.zip_longest(original.execute(query), restored.execute(query), fillvalue=sentinel):
                assert a is not sentinel and b is not sentinel and a == b, f'Value mismatch: {table}'
                assert all(type(x) is type(y) for x, y in zip(a, b)), f'Type mismatch: {table}'
        sequence = original.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name').fetchall()
        assert manifest['sequence_metadata'] == [list(row) for row in sequence]
        restored.execute('DELETE FROM sqlite_sequence')
        restored.executemany('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)', sequence)
        assert restored.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name').fetchall() == sequence
        restored.close()
    assert counts == manifest['table_counts']
    assert digest(SOURCE) == EXPECTED, 'Source changed'
    report = {'status': 'passed', 'source_sha256': EXPECTED, 'partition_count': COUNT,
              'table_counts': counts, 'rows_verified': sum(counts.values()),
              'json_bytes': sum(p['bytes'] for p in manifest['partitions']),
              'checks': ['all partition checksums and byte sizes', 'routing and row grouping',
                         'every row, column value and SQLite value type via independent round trip',
                         'schema and sequence metadata', 'original source checksum unchanged']}
    write_json(OUTPUT / 'verification.json', report)
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    if not args.verify_only:
        convert()
    verify()
