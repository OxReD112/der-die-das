'use strict';
// Derive only explicit, typed verb-form relationships; imported export is read-only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../open data/dictionary-de-json/parts');
const norm=s=>String(s||'').normalize('NFC').toLocaleLowerCase('de-DE');
const records=[],heads=new Set(),sourceHash=crypto.createHash('sha256');
for(const file of fs.readdirSync(source).filter(f=>f.endsWith('.json')).sort()){
 const bytes=fs.readFileSync(path.join(source,file));sourceHash.update(bytes);
 for(const [word,r] of Object.entries(JSON.parse(bytes).records)){records.push(r);if((r.senses||[]).some(s=>s[2]==='verb'))heads.add(norm(word));}
}
const partitions=Array.from({length:1024},()=>({}));let forms=0,analyses=0;
for(const r of records)for(const [rawForm,rawLemma,rawTags] of r.inflections||[]){
 const form=norm(rawForm),lemma=norm(rawLemma),tags=String(rawTags||'').split(',').filter(Boolean);
 if(!heads.has(lemma)||!/^[\p{L}\p{M}]+$/u.test(form)||!/^[\p{L}\p{M}]+$/u.test(lemma)||tags.some(t=>t==='auxiliary'||t.startsWith('error-')))continue;
 if(!tags.some(t=>['indicative','subjunctive','imperative','infinitive','infinitive-zu','participle'].includes(t)))continue;
 let h=2166136261;for(const b of Buffer.from(form))h=Math.imul(h^b,16777619)>>>0;
 const bucket=partitions[h&1023];if(!bucket[form]){bucket[form]=[];forms++;}
 const value=[lemma,[...new Set(tags)].sort().join(',')];if(!bucket[form].some(x=>JSON.stringify(x)===JSON.stringify(value))){bucket[form].push(value);analyses++;}
}
const out=path.join(root,'fallback-verb-forms');fs.mkdirSync(out,{recursive:true});
let bytes=0;for(let i=0;i<1024;i++){const text=JSON.stringify({format_version:1,partition:i,records:partitions[i]})+'\n';bytes+=Buffer.byteLength(text);fs.writeFileSync(path.join(out,String(i).padStart(4,'0')+'.json'),text);}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({format_version:1,partition_count:1024,forms,analyses,bytes,source_sha256:sourceHash.digest('hex'),policy:'Explicit typed verb inflections only; excludes auxiliary/error relations; no guessed forms.'},null,2)+'\n');
console.log(JSON.stringify({forms,analyses,bytes}));
