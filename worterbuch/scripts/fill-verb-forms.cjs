/* Our curated cards: stored forms first, then lookup forms, then reviewed exceptions,
   then regular rules for missing tenses. Preview by default; --write applies. */
const fs=require('node:fs'),path=require('node:path');
const {generate}=require('./fill-regular-present.cjs');
const people=['ich','du','er/sie/es','wir','ihr','sie'];
const reflex=['mich','dich','sich','uns','euch','sich'];
const tenses=['Präsens','Präteritum','Konjunktiv II'];
const prefixes=['weiter','zusammen','zurecht','vorbei','kennen','krank','kaputt','wohl','schief','statt','fest','dazu','durch','hin','her','ein','aus','auf','mit','nach','vor','weg','zu','ab','an','um'];
function parts(entry){
 let word=entry.infinitive,reflexive=word.startsWith('sich ');
 if(reflexive)word=word.slice(5);
 if(word.includes(' '))return null;
 let prefix=entry.separable_prefix||'';
 if(!prefix){
  // Internal ge- in the existing participle proves separability for these cards.
  const participle=entry.perfect_form.split(/\s+/).pop();
  prefix=prefixes.find(p=>word.startsWith(p)&&participle.startsWith(p+'ge'))||'';
  // These regular bases omit ge- even when prefixed.
  const specialPrefixes={ausprobieren:'aus',zubereiten:'zu',vorbereiten:'vor',weiterentwickeln:'weiter',wiederverwenden:'wieder'};
  if(specialPrefixes[word])prefix=specialPrefixes[word];
 }
 return {word,base:word.slice(prefix.length),prefix,reflexive};
}
function decorate(forms,p){return Object.fromEntries(people.map((person,i)=>[person,forms[person]+(p.reflexive?' '+reflex[i]:'')+(p.prefix?' '+p.prefix:'')]));}
function weak(base){
 const present=generate(base);
 const stem=base.slice(0,/(?:eln|ern)$/u.test(base)?-1:-2);
 const extra=/[dt]$/u.test(stem)||/[^aeiouäöüyrlmn][mn]$/u.test(stem);
 const past=Object.fromEntries(people.map((person,i)=>[person,stem+(extra?'ete':'te')+['','st','','n','t','n'][i]]));
 return {'Präsens':present,'Präteritum':past,'Konjunktiv II':{...past}};
}
function strong(stem,subj){
 const past=Object.fromEntries(people.map((p,i)=>[p,stem+['','st','','en','t','en'][i]]));
 const k=Object.fromEntries(people.map((p,i)=>[p,subj+['e','est','e','en','et','en'][i]]));
 return {'Präteritum':past,'Konjunktiv II':k};
}
function fill(entries){
 const byWord=new Map(entries.map(e=>[e.infinitive,e]));
 const report={changed:[],exceptions:[],skipped:[]};
 for(const entry of entries){
  const restricted=['regnen','schneien','hageln','donnern','blitzen'];
  if(restricted.includes(entry.infinitive))for(const group of Object.values(entry.lookup_forms||{}))for(const person of Object.keys(group))if(person!=='er/sie/es')delete group[person];
  if(tenses.every(t=>people.every(p=>(entry.forms?.[t]||entry.lookup_forms?.[t]||{})[p])))continue;
  if(entry.infinitive==='möchten'){report.skipped.push({word:'möchten',reason:'Konjunktiv-II form of mögen; no invented möchtete paradigm'});continue;}
  const p=parts(entry);
  let derived,exception=false;
  if(!p){
   if(!['sich gefallen lassen','sich scheiden lassen'].includes(entry.infinitive)){report.skipped.push({word:entry.infinitive,reason:'unsupported phrase'});continue;}
   const dative=entry.infinitive==='sich gefallen lassen',tail=dative?'gefallen':'scheiden';
   derived=Object.fromEntries(tenses.map(t=>[t,Object.fromEntries(people.map((person,i)=>[person,
    byWord.get('lassen').forms[t][person]+' '+(dative?['mir','dir','sich','uns','euch','sich'][i]:reflex[i])+' '+tail]))]));
   exception=true;
  }else{
   derived=weak(p.base);
   const bases={schieflaufen:['laufen','schief'],stattfinden:['finden','statt'],feststehen:['stehen','fest']};
   if(bases[p.word]){
    const [base,prefix]=bases[p.word];p.prefix=prefix;
    const source=byWord.get(base);
    derived=Object.fromEntries(tenses.map(t=>[t,source.forms?.[t]||source.lookup_forms?.[t]||weak(base)[t]]));exception=true;
   }
   if(p.word==='backen'){
    derived['Konjunktiv II']=strong('buk','bök')['Konjunktiv II'];exception=true;
   }
   if(p.word==='gelingen'){derived={...derived,...strong('gelang','geläng')};exception=true;}
   if(p.word==='geschehen'){
    derived={...derived,...strong('geschah','geschäh')};derived['Präsens'].du='geschiehst';derived['Präsens']['er/sie/es']='geschieht';exception=true;
   }
   derived=Object.fromEntries(tenses.map(t=>[t,decorate(derived[t],p)]));
  }
  const thirdOnly=['regnen','schneien','hageln','donnern','blitzen','stattfinden','schieflaufen','feststehen','gelingen','geschehen'].includes(entry.infinitive);
  const allowed=thirdOnly?['er/sie/es','sie']:people;
  if(['regnen','schneien','hageln','donnern','blitzen'].includes(entry.infinitive))allowed.splice(1,1);
  if(thirdOnly) for(const group of Object.values(entry.lookup_forms||{})) for(const person of Object.keys(group)) if(!allowed.includes(person))delete group[person];
  const added=[];
  for(const tense of tenses){
   const existing={...(entry.lookup_forms?.[tense]||{}),...(entry.forms?.[tense]||{})};
   const missing=allowed.filter(person=>!existing[person]);
   if(!missing.length)continue;
   entry.lookup_forms||={};entry.lookup_forms[tense]||={};
   for(const person of missing)entry.lookup_forms[tense][person]=derived[tense][person];
   added.push(tense);
  }
  if(p?.prefix&&!entry.separable_prefix)entry.separable_prefix=p.prefix;
  if(added.length){report.changed.push({id:entry.id,word:entry.infinitive,tenses:added});if(exception)report.exceptions.push(entry.infinitive);}
 }
 return report;
}
if(require.main===module){
 const file=path.resolve(__dirname,'../german-verbs.json');
 const entries=JSON.parse(fs.readFileSync(file,'utf8'));
 const report=fill(entries);
 if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(entries,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
module.exports={fill,weak,parts};
