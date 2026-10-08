/* Explicit superlative evidence from the complete imported dictionary. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../../open data/dictionary-de-json/parts'),heads=new Map(),links=[];const digest=crypto.createHash('sha256');
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
 const bytes=fs.readFileSync(path.join(dir,file));digest.update(file);digest.update(bytes);
 for(const [word,record]of Object.entries(JSON.parse(bytes).records)){
  const senses=(record.senses||[]).filter(r=>['adj','adv'].includes(r[2]));
  const lexical=senses.filter(r=>!/^.*(?:inflection|degree) of /iu.test(r[3]));
  for(const pos of ['adj','adv']){const meanings=[...new Set(lexical.filter(r=>r[2]===pos).map(r=>r[3]))];if(meanings.length)heads.set(word+'\0'+pos,meanings);}
  for(const [form,lemma,tags]of record.inflections||[]){
   const ts=String(tags).split(',');
   if(form!==word||!ts.includes('superlative')||ts.some(t=>t==='auxiliary'||t.startsWith('error-'))||!/^[\p{L}\p{M}]+sten$/u.test(form)||!/^[\p{L}\p{M}]+$/u.test(lemma))continue;
   const note=new RegExp('^(?:(?:strong|weak|mixed|nominative|accusative|genitive|dative|masculine|feminine|neuter|singular|plural|all|case|gender|superlative|degree)[ /-]+)+of '+lemma+'(?::|$)','iu');
   for(const pos of new Set(senses.filter(s=>note.test(s[3])).map(s=>s[2])))links.push([form,lemma,pos]);
  }
 }
}
const records={};
for(const [form,lemma,pos]of links){const meanings=heads.get(lemma+'\0'+pos);if(!meanings)continue;const rows=records[form]||=[];if(!rows.some(r=>r[0]===lemma&&r[1]===pos))rows.push([lemma,pos,meanings]);}
const result={format_version:1,evidence:'structured superlative tag + explicit grammatical reference + lexical adj/adv base',source_sha256:digest.digest('hex'),records:Object.fromEntries(Object.entries(records).sort(([a],[b])=>a.localeCompare(b,'de')))};
const output=path.resolve(__dirname,'../superlative-index.json');fs.writeFileSync(output,JSON.stringify(result)+'\n');console.log({forms:Object.keys(records).length,relations:Object.values(records).reduce((n,r)=>n+r.length,0),bytes:fs.statSync(output).size,arg:records['ärgsten']});
