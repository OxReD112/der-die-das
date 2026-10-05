"""Build a word-only autocomplete index without changing dictionary partitions."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'dictionary-de-json'
OUTPUT = ROOT / 'dictionary-de-autocomplete'


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def bucket(word, count):
    value = 2166136261
    for byte in word.encode('utf-8'):
        value = ((value ^ byte) * 16777619) & 0xffffffff
    return value & (count - 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    source_bytes = (SOURCE / 'manifest.json').read_bytes()
    source = json.loads(source_bytes)
    count = source['partition_count']
    assert count > 0 and count & (count - 1) == 0
    assert len(source['partitions']) == count
    words = set()
    for index, item in enumerate(source['partitions']):
        assert item['path'] == f'parts/{index:04d}.json'
        data = (SOURCE / item['path']).read_bytes()
        assert len(data) == item['bytes'] and sha(data) == item['sha256'], item['path']
        part = json.loads(data)
        assert part['partition'] == index
        for word, record in part['records'].items():
            if not record.get('entries'):
                continue
            assert word not in words, word
            assert bucket(word, count) == index, word
            assert all(row[0] == word for row in record['entries']), word
            words.add(word)
    assert len(words) == source['table_counts']['entries']
    # Keep original spellings: normalization belongs to the search implementation.
    data = encode(sorted(words))
    metadata = {
        'format_version': 1,
        'generator_version': '1.0.0',
        'file': 'words.json',
        'word_count': len(words),
        'bytes': len(data),
        'sha256': sha(data),
        'gzip_estimated_bytes': len(gzip.compress(data, mtime=0)),
        'source_manifest_sha256': sha(source_bytes),
        'source': source['source'],
        'license': source['license'],
        'attribution': source['attribution'],
        'sources': source['sources'],
        'upstream_processing_notice': source['upstream_processing_notice'],
        'conversion_notice': source['conversion_notice'],
        'index_notice': 'Extracted entry words into a separate sorted autocomplete index. Definitions and original dictionary partitions were not changed.',
        'ordering': 'Unicode code point order; original spelling preserved. JavaScript default string sort uses a different order for supplementary characters.',
        'partition_count': count,
        'routing': source['routing'],
        'scope': 'All entries table words; excludes keys present only in other tables. Includes inflected entry words. No meanings or grammatical metadata.',
    }
    if args.verify_only:
        assert (OUTPUT / 'words.json').read_bytes() == data
        assert json.loads((OUTPUT / 'manifest.json').read_bytes()) == metadata
        assert (OUTPUT / 'NOTICE.md').read_text(encoding='utf-8').startswith((SOURCE / 'NOTICE.md').read_text(encoding='utf-8'))
        print(f'Verified {len(words):,} unique words, all source checksums, completeness, and partition routing.')
        return
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / 'words.json').write_bytes(data)
    (OUTPUT / 'manifest.json').write_bytes(encode(metadata))
    (OUTPUT / 'NOTICE.md').write_text(
        (SOURCE / 'NOTICE.md').read_text(encoding='utf-8')
        + '\n## Autocomplete index\n\n' + metadata['index_notice'] + '\n'
        + '\nThis index is distributed under CC BY-SA 4.0, as identified above.\n', encoding='utf-8')
    print(f'Generated {len(words):,} words; {len(data):,} bytes; estimated gzip {metadata["gzip_estimated_bytes"]:,} bytes.')


if __name__ == '__main__':
    main()
