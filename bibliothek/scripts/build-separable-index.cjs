/* Rebuild derived evidence; never modifies the imported dictionary. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'../../open data/dictionary-de-json/parts');
const heads = new Map(), links = new Map();
for (const file of fs.readdirSync(root).sort()) {
  for (const [word,record] of Object.entries(JSON.parse(fs.readFileSync(path.join(root,file))).records)) {
    const senses = (record.senses || []).filter(s=>s[2]==='verb').sort((a,b)=>a[4]-b[4]);
    if (senses.length) heads.set(word,[...new Set(senses.map(s=>s[3]))]);
    for (const [form,lemma,tags] of record.inflections || []) {
      if (!links.has(lemma)) links.set(lemma,[]);
      links.get(lemma).push([form,new Set(String(tags).split(','))]);
    }
  }
}
const entries = [];
for (const [lemma,rows] of links) {
  const meanings = heads.get(lemma);
  if (!meanings || !/^[\p{L}\p{M}]+$/u.test(lemma)) continue;
  const prefixes = new Set();
  for (const [form,tags] of rows) {
    if (!tags.has('infinitive-zu')) continue;
    for (let at=form.indexOf('zu',1);at>0;at=form.indexOf('zu',at+2)) {
      if (form.slice(0,at)+form.slice(at+2)===lemma) prefixes.add(form.slice(0,at));
    }
  }
  // Ambiguous decompositions are not safe to reconstruct automatically.
  if (prefixes.size!==1) continue;
  const prefix = [...prefixes][0];
  const finite = [...new Set(rows.filter(([form,tags])=>
    tags.has('subordinate-clause') && (tags.has('indicative') || tags.has('subjunctive')) &&
    (tags.has('present') || tags.has('preterite') || tags.has('subjunctive-ii')) &&
    form.startsWith(prefix) && /^[\p{L}\p{M}]+$/u.test(form) && form.length>prefix.length
  ).map(([form])=>form.slice(prefix.length)))].sort();
  if (finite.length) entries.push([lemma,prefix,finite,meanings]);
}
// Reviewed gaps from UD GSD. Keep these additions scoped: a new detached
// stem also becomes a possible competing verb in the reader's boundary guard.
// Each present-plural form equals the infinitive after the independently
// proven prefix; require existing finite evidence before adding it.
const reviewedPlural = ['hinfahren','vorrücken','anheben','darstellen','abschnüren','innehaben'];
for (const lemma of reviewedPlural) {
  const row = entries.find(entry => entry[0] === lemma);
  if (!row) throw new Error(`Missing verified separable entry: ${lemma}`);
  const base = lemma.slice(row[1].length);
  if (!base.endsWith('en') || !row[2].length) throw new Error(`Invalid reviewed plural: ${lemma}`);
  if (!row[2].includes(base)) row[2].push(base);
  row[2].sort();
}
// Reviewed detached usage in test-s405: hielt ... aufrecht. Keep this
// spelling scoped to the existing lexical entry; do not rewrite halten forms.
const maintained = entries.find(entry => entry[0] === 'aufrechterhalten');
if (!maintained || maintained[1] !== 'aufrecht' || !maintained[2].includes('erhielt')) {
  throw new Error('Missing aufrechterhalten/erhielt evidence');
}
if (!maintained[2].includes('hielt')) maintained[2].push('hielt');
maintained[2].sort();
// Exact historical spelling, reviewed in test-s673. Never normalize ß/ss
// globally: this alias is only for the detached preterite of ausschließen.
const historical = entries.find(entry => entry[0] === 'ausschließen');
if (!historical || !historical[2].includes('schloss')) throw new Error('Missing ausschließen/schloss evidence');
if (!historical[2].includes('schloß')) historical[2].push('schloß');
historical[2].sort();
entries.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
const output = path.resolve(__dirname,'../separable-index.json');
fs.writeFileSync(output,JSON.stringify({format_version:1,entries})+'\n');
console.log(`${entries.length} verified verbs; ${fs.statSync(output).size} bytes`);
