/* Wortschatz · own word collection (storage layer) — v1, 2026-09-26
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 2). No UI here.

   Storage (localStorage, all covered by Home → Backup):
   - deutschWortschatzCollectionV1   the user's own collection:
       { v:1, name, createdAt, nextId, cards:[ {id:"u1", sentence, blank, revealed, target,
         translation, sentenceTranslation, grammar, pos, base} ] }
     No key = the built-in set (words.js) is used.
   - deutschWortschatzDemoProgressV1 the built-in set's progress, set aside while an own collection is active.
   - wortsternSRSv03                 progress of the ACTIVE collection (unchanged key, so Home's due count,
                                     daily points and Restore keep working as before).

   Rules:
   - Own card ids are strings "u1", "u2", … and are never reused (nextId only grows).
   - Translations of own cards are plain strings (one language); the language switch doesn't touch them.
   - Required per card: a sentence with at least one {{c1::…}} and a translation (meaning of the word).
     Several {{c1::…}} = pieces of ONE answer (separable verbs). blank / revealed / target are built here.
   - Duplicates = same base form (article der/die/das ignored; base defaults to the hidden word(s)) or the very same sentence.
   - Functions that change progress write straight to localStorage: the page must reload afterwards
     (the Wortschatz page keeps its progress in memory and would otherwise overwrite it). */
(function(){
  const KEY="deutschWortschatzCollectionV1";
  const DEMO_KEY="deutschWortschatzDemoProgressV1";
  const PROGRESS_KEY="wortsternSRSv03";
  const CLOZE=/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const FIELDS=["sentence","translation","sentenceTranslation","grammar","pos","base"];

  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
  function write(k,v){
    try{localStorage.setItem(k,JSON.stringify(v));return true}
    catch(e){const err=new Error("storage-full");err.cause=e;throw err}
  }
  const today=()=>{const d=new Date();d.setHours(12,0,0,0);return d.toISOString().slice(0,10)};
  const str=v=>typeof v==="string"?v.replace(/\s+/g," ").trim():"";
  function translationValue(v){
    if(typeof v==="string")return str(v);
    if(v&&typeof v==="object"){            // {ru, en} pasted from the built-in format: keep it
      const out={};Object.keys(v).forEach(k=>{const s=str(v[k]);if(s)out[k]=s});
      return Object.keys(out).length?out:"";
    }
    return "";
  }

  /* ---------- reading pasted text / files ---------- */
  // Accepts a JSON array, {cards:[…]} / {words:[…]}, or the words.js format (window.WORDS = [...];).
  // Never executes anything.
  function parse(text){
    let t=String(text||"").replace(/^﻿/,"").trim();
    t=t.replace(/^```[a-z]*\s*/i,"").replace(/```\s*$/,"").trim();           // AI answers in a code block
    t=t.replace(/^(?:window\.)?WORDS\s*=\s*/,"").replace(/^(?:const|let|var)\s+\w+\s*=\s*/,"").replace(/;\s*$/,"");
    if(!t)return {items:[],error:"empty"};
    let data;
    try{data=JSON.parse(t)}catch(e){
      const a=t.indexOf("["),b=t.lastIndexOf("]");                              // text around the list
      if(a>-1&&b>a){try{data=JSON.parse(t.slice(a,b+1))}catch(e2){}}
      if(data===undefined)return {items:[],error:"not-json"};
    }
    if(data&&!Array.isArray(data))data=data.cards||data.words||data.WORDS;
    if(!Array.isArray(data))return {items:[],error:"no-list"};
    return {items:data,error:null};
  }

  /* ---------- one card ---------- */
  function hiddenParts(sentence){const out=[];String(sentence).replace(CLOZE,(m,w)=>{out.push(w.trim());return m});return out}
  const keyOf=k=>str(k).toLowerCase().replace(/^(der|die|das)\s+/,"").trim();
  function germanKey(card){return keyOf(str(card.base)||hiddenParts(card.sentence).join(" "))}
  // A word counts as already there if its base form matches, or the whole sentence is the same.
  // Hidden words alone are NOT compared: „der Bescheid“ and „Bescheid geben“ hide the same word but are
  // different things to learn. A duplicate slipping through is harmless; skipping a wanted word is not.
  function germanKeys(card){return [...new Set(["b:"+germanKey(card),"s:"+str(card.sentence).toLowerCase()])]}
  // Returns {card} or {reason}. Reasons are short English texts for the import summary (the collection screens are in English).
  function normalize(raw){
    if(!raw||typeof raw!=="object")return {reason:"Not a valid entry"};
    const sentence=str(raw.sentence);
    if(!sentence)return {reason:"No sentence"};
    const parts=hiddenParts(sentence);
    if(!parts.length||parts.some(p=>!p))return {reason:"No word marked with {{c1::…}} in the sentence"};
    const translation=translationValue(raw.translation);
    if(!translation)return {reason:"No meaning"};
    const clean=sentence.replace(CLOZE,(m,w)=>"{{c1::"+w.trim()+"}}");
    const card={
      sentence:clean,
      blank:clean.replace(CLOZE,"_____"),
      revealed:clean.replace(CLOZE,(m,w)=>w),
      target:parts.join(" / "),
      translation,
      sentenceTranslation:translationValue(raw.sentenceTranslation!==undefined?raw.sentenceTranslation:(raw.ru!==undefined?raw.ru:raw.en)),
      grammar:translationValue(raw.grammar),
      pos:str(raw.pos),
      base:str(raw.base)||parts.join(" ")
    };
    return {card};
  }

  /* ---------- collection ---------- */
  function get(){
    const c=read(KEY);
    return c&&Array.isArray(c.cards)?c:null;
  }
  const isOwn=()=>!!get();
  const cards=()=>{const c=get();return c?c.cards:[]};

  // Checks a list against the cards already there. Nothing is saved.
  function prepare(items,existing){
    const seen=new Set();(existing||[]).forEach(c=>germanKeys(c).forEach(k=>seen.add(k)));
    const ok=[],skipped=[];let duplicates=0;
    (items||[]).forEach((raw,i)=>{
      const r=normalize(raw);
      if(!r.card){skipped.push({n:i+1,reason:r.reason,preview:str(raw&&raw.sentence).slice(0,60)});return}
      const ks=germanKeys(r.card);
      if(ks.some(k=>seen.has(k))){duplicates++;return}
      ks.forEach(k=>seen.add(k));ok.push(r.card);
    });
    return {cards:ok,skipped,duplicates};
  }
  function withIds(c,list){return list.map(card=>Object.assign({id:"u"+(c.nextId++)},card))}
  const summary=(p,extra)=>Object.assign({added:p.cards.length,skipped:p.skipped,duplicates:p.duplicates},extra||{});

  // Switch from the built-in set to an own collection. The demo progress is set aside.
  function create(name,items){
    if(isOwn())throw new Error("already-own");
    const p=prepare(items,[]);
    if(!p.cards.length)return summary(p,{created:false});
    const c={v:1,name:str(name)||"My Words",createdAt:new Date().toISOString(),nextId:1,cards:[]};
    c.cards=withIds(c,p.cards);
    const demo=localStorage.getItem(PROGRESS_KEY);
    write(KEY,c);                                             // throws if storage is full — nothing changed yet
    if(demo!==null)localStorage.setItem(DEMO_KEY,demo);
    write(PROGRESS_KEY,{cards:{},activeIds:[]});             // Wortschatz picks the first 10 words on its next start
    return summary(p,{created:true});
  }

  // Add more words to the own collection. activateNow: cards become active right away (due today).
  function add(items,{activateNow=false}={}){
    const c=get();if(!c)throw new Error("no-collection");
    const p=prepare(items,c.cards);
    if(!p.cards.length)return summary(p);
    const fresh=withIds(c,p.cards);
    c.cards=c.cards.concat(fresh);
    write(KEY,c);
    if(activateNow){
      const st=read(PROGRESS_KEY)||{cards:{},activeIds:[]};
      st.cards=st.cards||{};st.activeIds=st.activeIds||[];
      fresh.forEach(card=>{st.activeIds.push(card.id);st.cards[card.id]={level:0,due:today()}});
      write(PROGRESS_KEY,st);
    }
    return summary(p,{ids:fresh.map(x=>x.id)});
  }

  // Edit one card (✎). Same id → progress kept. Returns {card} or {reason}.
  function update(id,fields){
    const c=get();if(!c)throw new Error("no-collection");
    const i=c.cards.findIndex(x=>x.id===id);if(i<0)return {reason:"Card not found"};
    const merged={};FIELDS.forEach(f=>merged[f]=fields&&fields[f]!==undefined?fields[f]:c.cards[i][f]);
    const r=normalize(merged);if(!r.card)return r;
    const ks=germanKeys(r.card);
    if(c.cards.some((x,j)=>j!==i&&germanKeys(x).some(k=>ks.includes(k))))return {reason:"This word is already in your collection"};
    c.cards[i]=Object.assign({id},r.card);
    write(KEY,c);
    return {card:c.cards[i]};
  }

  // Remove one card and its progress.
  function remove(id){
    const c=get();if(!c)throw new Error("no-collection");
    c.cards=c.cards.filter(x=>x.id!==id);write(KEY,c);
    const st=read(PROGRESS_KEY);
    if(st){st.activeIds=(st.activeIds||[]).filter(x=>x!==id);if(st.cards)delete st.cards[id];write(PROGRESS_KEY,st)}
  }

  function rename(name){
    const c=get();if(!c)throw new Error("no-collection");
    c.name=str(name)||c.name;write(KEY,c);return c.name;
  }

  // Clean list for sharing / editing with an AI; can be imported again as it is.
  function exportText(){
    const c=get();if(!c)return "[]";
    return JSON.stringify(c.cards.map(x=>{const o={};FIELDS.forEach(f=>{if(x[f])o[f]=x[f]});return o}),null,2);
  }

  // Delete the own collection and go back to the built-in set.
  // continueDemo: true = restore the demo progress that was set aside, false = start the demo from zero.
  function backToDemo(continueDemo){
    const demo=localStorage.getItem(DEMO_KEY);
    if(continueDemo&&demo!==null)localStorage.setItem(PROGRESS_KEY,demo);
    else localStorage.setItem(PROGRESS_KEY,JSON.stringify({cards:{},activeIds:[]}));
    localStorage.removeItem(KEY);
    localStorage.removeItem(DEMO_KEY);
  }
  const hasDemoProgress=()=>{const d=read(DEMO_KEY);return !!(d&&Array.isArray(d.activeIds)&&d.activeIds.length)};

  // Rough size of everything this app keeps in localStorage (UTF-16: 2 bytes per character).
  function storageBytes(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=(k.length+(localStorage.getItem(k)||"").length)*2}}catch(e){}return n}

  window.WortschatzCollection={KEY,DEMO_KEY,PROGRESS_KEY,get,isOwn,cards,parse,normalize,prepare,germanKey,
    create,add,update,remove,rename,exportText,backToDemo,hasDemoProgress,storageBytes};
})();
