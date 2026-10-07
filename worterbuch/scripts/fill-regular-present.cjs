/* Fill reviewed regular Präsens paradigms; never infer regularity from spelling.
   Preview: node fill-regular-present.cjs
   Apply:   node fill-regular-present.cjs --write */
const fs = require('node:fs');
const path = require('node:path');
const persons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie'];
function generate(infinitive, prefix = '') {
  if (prefix && !infinitive.startsWith(prefix)) throw new Error('Invalid separable prefix');
  const base = infinitive.slice(prefix.length);
  if (!/^[a-zäöüß]+(?:en|eln|ern)$/u.test(base)) throw new Error('Unsupported infinitive');
  const stem = base.slice(0, /(?:eln|ern)$/u.test(base) ? -1 : -2);
  const extraE = /[dt]$/u.test(stem) || /[^aeiouäöüyrlmn][mn]$/u.test(stem);
  const singular = /eln$/u.test(base) ? stem.slice(0, -2) + 'le' : stem + 'e';
  const second = stem + (extraE ? 'est' : /[sßxz]$/u.test(stem) ? 't' : 'st');
  const third = stem + (extraE ? 'et' : 't');
  return Object.fromEntries(persons.map((person, index) => [person,
    [singular, second, third, base, third, base][index] + (prefix ? ` ${prefix}` : '')]));
}
function fill(entries, approved) {
  const report = {changed: [], skipped: [], conflicts: []};
  for (const entry of entries) {
    const word = entry.infinitive;
    if (!approved.includes(word)) { if (!entry.forms?.Präsens) report.skipped.push(word); continue; }
    const generated = generate(word, entry.separable_prefix || '');
    const existing = {...(entry.lookup_forms?.Präsens || {}), ...(entry.forms?.Präsens || {})};
    if (persons.some(person => existing[person] && existing[person] !== generated[person])) {
      report.conflicts.push(word); continue;
    }
    const missing = persons.filter(person => !entry.forms?.Präsens?.[person]);
    if (!missing.length) continue;
    entry.forms ||= {};
    entry.forms.Präsens = {...generated, ...entry.forms.Präsens};
    entry.generated_forms = [...new Set([...(entry.generated_forms || []), 'Präsens'])];
    report.changed.push({id: entry.id, word, persons: missing});
  }
  return report;
}
if (require.main === module) {
  // Superseded by the complete lookup-layer generator.
  const file = path.resolve(__dirname, '../german-verbs.json');
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  const report = require('./fill-verb-forms.cjs').fill(entries);
  if (process.argv.includes('--write')) fs.writeFileSync(file, JSON.stringify(entries, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
module.exports = {generate, fill};
