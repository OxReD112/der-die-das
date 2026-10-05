"""Read-only sizing experiment; does not produce the dictionary export."""
import collections
import gzip
import json
import pathlib
import sqlite3

SOURCE = pathlib.Path(__file__).resolve().parents[1] / 'dictionary-de.db'
SCHEMAS = {
    'entries': ['word', 'rank', 'ipa', 'etymology'],
    'senses': ['id', 'word', 'pos', 'gloss', 'sort_order'],
    'related_forms': ['id', 'word', 'related_word', 'relation'],
    'inflections': ['inflected_form', 'lemma', 'type'],
}

def bucket(word, count):
    value = 2166136261
    for byte in word.encode('utf-8'):
        value = ((value ^ byte) * 16777619) & 0xffffffff
    return value & (count - 1)

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

def main():
    db = sqlite3.connect(SOURCE.as_uri() + '?immutable=1', uri=True)
    records = collections.defaultdict(dict)
    counts = {}
    for table, columns in SCHEMAS.items():
        counts[table] = 0
        # Column names are fixed constants above, not external input.
        for row in db.execute('SELECT ' + ','.join(columns) + ' FROM ' + table + ' ORDER BY ' + ','.join(columns)):
            word = row[0] if table in ('entries', 'inflections') else row[1]
            records[word].setdefault(table, []).append(list(row))
            counts[table] += 1
    result = {'table_counts': counts, 'distinct_lookup_keys': len(records), 'candidates': []}
    for count in (256, 1024, 4096):
        partitions = [{} for _ in range(count)]
        for word, tables in records.items():
            partitions[bucket(word, count)][word] = tables
        sizes, compressed = [], []
        for index, partition in enumerate(partitions):
            data = encode({'format_version': 1, 'partition': index, 'records': partition})
            sizes.append(len(data))
            compressed.append(len(gzip.compress(data, compresslevel=6, mtime=0)))
        def summary(values):
            ordered = sorted(values)
            return {'total_bytes': sum(values), 'median_bytes': ordered[len(values)//2],
                    'p95_bytes': ordered[int(len(values)*.95)], 'max_bytes': max(values)}
        result['candidates'].append({'partitions': count, 'json': summary(sizes), 'gzip_6': summary(compressed),
            'example_buckets': {word: bucket(word, count) for word in ('bibliothek', 'häuser', 'haus', 'ging', 'gehen')}})
    result['sequence_metadata'] = db.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name').fetchall()
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
