/* Wortschatz · collection button + window — v6, 2026-09-26 (v2: word form · v3: ✎ on the answer screen · v4: import · v5: English · v6: Starter-Set + new start screen)
   All texts in this window are English on purpose: users whose German is still weak must understand
   how to manage and import their words. Labels in Title Case (Settings rule), questions in sentence case.
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 3). Storage lives in collection.js.
   - Start screen: „DEINE WÖRTER“ + „<name> · <n> Wörter ›“ (opens the window) + „＋ Use your own words“ (Starter-Set only).
   - „Fertig für heute“: pill „<name> · <n> Wörter“. The built-in set is called „Starter-Set“.
   - Window: name, word count, word list; own collection: rename, export, delete → back to the built-in set.
   - Word form (step 4): „＋ Wort hinzufügen“ and tap a word in the list = edit / delete it.
     Changes that touch progress or WORDS set `dirty`; closing the window then reloads the page
     (Wortschatz keeps progress and WORDS in memory and would otherwise work with the old ones).
   All user text is inserted with textContent (never as HTML). */
(function(){
  const C=window.WortschatzCollection;
  const $=id=>document.getElementById(id);
  const modal=$("collModal"),card=$("collCard");
  if(!C||!modal||!card)return;
  const BUILTIN_NAME="Starter-Set";

  const own=()=>C.isOwn();
  const list=()=>own()?C.cards():(window.WORDS||[]);
  const name=()=>own()?(C.get().name||"My Words"):BUILTIN_NAME;
  const wordsLabel=n=>n===1?"1 word":n+" words";
  const tr=(c,f)=>typeof window.getTranslation==="function"?window.getTranslation(c,f):(typeof c[f]==="string"?c[f]:"");

  function el(tag,cls,text,attrs){
    const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=text;
    if(attrs)Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;
  }
  function button(cls,text,onClick){const b=el("button",cls,text,{type:"button"});b.onclick=onClick;return b}

  function refreshButtons(){
    const n=list().length,count=n===1?"1 Wort":n+" Wörter",label=name()+" · "+count;
    ["collBtnStart","collBtnDone"].forEach(id=>{            // „Starter-Set · 217 Wörter ›“ on both screens
      const b=$(id);if(!b)return;
      b.textContent="";
      b.appendChild(el("span","coll-line-name",name()));
      b.appendChild(el("span","coll-line-chev","›",{"aria-hidden":"true"}));
      b.setAttribute("aria-label","Word collection: "+label);
    });
    ["collCountStart","collCountDone"].forEach(id=>{const c=$(id);if(c)c.textContent=count});   // count on its own line (v2.99)
    const ownBtn=$("ownWordsBtn");if(ownBtn)ownBtn.style.display=own()?"none":"";
  }

  /* ---------- open / close (same timing as the table windows) ---------- */
  let lastFocus=null,dirty=false;
  function open(firstView){
    lastFocus=document.activeElement;dirty=false;
    (typeof firstView==="function"?firstView:viewMain)();
    modal.setAttribute("aria-hidden","false");
    requestAnimationFrame(()=>requestAnimationFrame(()=>modal.classList.add("open")));
  }
  function close(){
    modal.classList.remove("open");modal.setAttribute("aria-hidden","true");
    setTimeout(()=>{card.textContent="";if(dirty)location.reload()},220);
    if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true})}catch(e){}
  }
  modal.addEventListener("click",e=>{if(e.target===modal)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("open")){e.preventDefault();e.stopPropagation();close()}},true);
  // Keys typed in the window (rename field) must not reach the exercise's Enter handlers
  card.addEventListener("keydown",e=>{if(e.key==="Enter")e.stopPropagation()});

  function head(title){
    const h=el("div","coll-head");
    h.appendChild(el("h2","coll-title",title,{id:"collTitle"}));
    h.appendChild(button("coll-close","×",close)).setAttribute("aria-label","Close");
    return h;
  }

  /* ---------- main view: name, count, list, actions ---------- */
  function viewMain(){
    if(!own())return viewStarter();
    card.textContent="";
    const words=list();
    card.appendChild(head(name()));
    const meta=el("p","coll-meta");
    meta.appendChild(document.createTextNode(wordsLabel(words.length)+" · "));
    meta.appendChild(button("coll-link","Rename",viewRename));
    card.appendChild(meta);

    // most-used action on top (like „Use My Own Words“ in the Starter-Set window)
    const top=el("div","coll-form-buttons coll-top");
    top.appendChild(button("coll-main","＋ Add Word",()=>viewForm(null)));
    top.appendChild(button("coll-link","＋ Import Words",()=>viewImport({})));
    card.appendChild(top);

    const box=el("div","coll-list coll-list-below");
    words.forEach(w=>{
      const row=own()?button("coll-word is-btn","",()=>viewForm(w)):el("div","coll-word");
      row.appendChild(el("span","coll-de",w.base||String(w.target||"").split(" / ").join(" ")));
      row.appendChild(el("span","coll-tr",tr(w,"translation")));
      box.appendChild(row);
    });
    if(!words.length)box.appendChild(el("p","coll-note","No words yet."));
    card.appendChild(box);

    // rare / risky actions: two quiet links at the bottom
    const bottom=el("div","coll-bottom");
    bottom.appendChild(button("coll-link","Export",()=>exportFile()));
    bottom.appendChild(el("span","coll-dot","·",{"aria-hidden":"true"}));
    bottom.appendChild(button("coll-link","Delete",viewDelete));
    card.appendChild(bottom);
  }

  // Starter-Set: what it is + the way to your own words. The word list only on request.
  function viewStarter(){
    card.textContent="";
    card.appendChild(head(BUILTIN_NAME));
    const words=list();
    card.appendChild(el("p","coll-text",words.length+" everyday German words in example sentences."));
    const b=el("div","coll-form-buttons");
    b.appendChild(button("coll-main","Use My Own Words",viewCreate));
    const toggle=button("coll-link","Show All Words in the Set",()=>{const show=box.style.display==="none";box.style.display=show?"":"none";toggle.textContent=show?"Hide Words":"Show All Words in the Set"});
    b.appendChild(toggle);
    card.appendChild(b);
    // the list unfolds BELOW the link (and scrolls inside the window)
    const box=el("div","coll-list coll-list-below");box.style.display="none";
    words.forEach(w=>{
      const row=el("div","coll-word");
      row.appendChild(el("span","coll-de",w.base||String(w.target||"").split(" / ").join(" ")));
      row.appendChild(el("span","coll-tr",tr(w,"translation")));
      box.appendChild(row);
    });
    card.appendChild(box);
  }


  /* ---------- word form: add (card=null) or edit one word ---------- */
  // The sentence is split into word chips; tapping a chip hides that word ({{c1::…}}).
  // Several chips = one split answer (separable verbs: „schlage“ + „vor“).
  const CLOZE=/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const POS=["Verb","Substantiv","Adjektiv","Andere"];            // stored values (same as the built-in cards)
  const POS_LABEL={Verb:"Verb",Substantiv:"Noun",Adjektiv:"Adjective",Andere:"Other"}; // shown
  function splitToken(t){const m=t.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);return {lead:m[1],core:m[2],trail:m[3]}}
  function tokensFromCloze(sentence){
    // protect spaces inside a cloze so „{{c1::zur Verfügung}}“ stays one chip
    const prot=String(sentence||"").replace(CLOZE,(m,w)=>"\u0001"+w.trim().replace(/\s+/g,"\u0002")+"\u0003");
    return prot.split(/\s+/).filter(Boolean).map(t=>{
      const on=t.includes("\u0001");const plain=t.replace(/[\u0001\u0003]/g,"").replace(/\u0002/g," ");
      return Object.assign(splitToken(plain),{on});
    });
  }
  function tokensFromText(text,prev){
    const wanted=(prev||[]).filter(t=>t.on).map(t=>t.core);
    return String(text||"").trim().split(/\s+/).filter(Boolean).map(t=>{
      const tok=Object.assign(splitToken(t),{on:false});
      const i=wanted.indexOf(tok.core);if(tok.core&&i>-1){tok.on=true;wanted.splice(i,1)}
      return tok;
    });
  }
  const plainText=toks=>toks.map(t=>t.lead+t.core+t.trail).join(" ");
  const clozeText=toks=>toks.map(t=>t.on&&t.core?t.lead+"{{c1::"+t.core+"}}"+t.trail:t.lead+t.core+t.trail).join(" ");
  const hiddenWords=toks=>toks.filter(t=>t.on&&t.core).map(t=>t.core).join(" ");
  const plainValue=v=>typeof v==="string"?v:(v&&typeof v==="object"?(tr({x:v},"x")||""):"");

  function field(label,opt,tag,attrs){
    const wrap=document.createElement("div");
    const l=el("label","coll-label",label);if(opt)l.appendChild(el("span","opt"," · optional"));
    const f=el(tag,"coll-field",null,Object.assign({autocomplete:"off",autocapitalize:"off",spellcheck:"false"},attrs||{}));
    l.setAttribute("for",attrs.id);wrap.appendChild(l);wrap.appendChild(f);return [wrap,f];
  }

  // opts.session: opened from ✎ on the answer screen — edit only, no delete, no reload;
  // onSaved(card) lets the running session show the corrected card right away.
  function viewForm(w,opts){
    opts=opts||{};
    const editing=!!w,session=!!opts.session,creating=!!opts.create;
    card.textContent="";
    card.appendChild(head(editing?"Edit Word":"New Word"));
    const sc=el("div","coll-scroll");card.appendChild(sc);

    let toks=editing?tokensFromCloze(w.sentence):[];
    const [fS,fSentence]=field("Sentence",false,"textarea",{id:"cfSentence",rows:"2",placeholder:"Ich schlage Samstag vor."});
    fSentence.value=plainText(toks);sc.appendChild(fS);
    const chips=el("div","coll-chips");sc.appendChild(chips);
    const hint=el("p","coll-hint","Tap the word you want to practise. For separable verbs, tap both parts.");sc.appendChild(hint);
    const preview=el("p","coll-preview");sc.appendChild(preview);

    const [fM,fMeaning]=field("Meaning",false,"input",{id:"cfMeaning",type:"text",placeholder:"to suggest"});
    fMeaning.value=editing?plainValue(w.translation):"";sc.appendChild(fM);
    const [fT,fTrans]=field("Sentence Translation",true,"input",{id:"cfTrans",type:"text",placeholder:"I suggest Saturday."});
    fTrans.value=editing?plainValue(w.sentenceTranslation):"";sc.appendChild(fT);
    const [fB,fBase]=field("Base Form",true,"input",{id:"cfBase",type:"text"});
    const autoBase=()=>hiddenWords(toks);
    fBase.value=editing&&w.base&&w.base!==autoBase()?w.base:"";sc.appendChild(fB);
    const [fG,fGram]=field("Grammar",true,"input",{id:"cfGram",type:"text",placeholder:"schlug vor · hat vorgeschlagen"});
    fGram.value=editing?plainValue(w.grammar):"";sc.appendChild(fG);

    sc.appendChild(el("span","coll-label","Word Class")).appendChild(el("span","opt"," · optional"));
    const posBox=el("div","coll-chips");sc.appendChild(posBox);
    let pos=editing?(w.pos||""):"";
    const posChip=p=>POS.slice(0,3).includes(pos)?pos===p:(p==="Andere"&&!!pos);
    function drawPos(){posBox.textContent="";POS.forEach(p=>{
      const c=button("coll-chip"+(posChip(p)?" on":""),POS_LABEL[p],()=>{pos=posChip(p)?"":(p==="Andere"?(POS.slice(0,3).includes(pos)||!pos?"Andere":pos):p);drawPos()});
      c.setAttribute("aria-pressed",posChip(p)?"true":"false");posBox.appendChild(c)})}
    drawPos();

    let now=null;
    if(!editing&&!creating){
      const sw=el("label","coll-switch");sw.appendChild(el("span",null,"Learn Now"));
      now=el("input",null,null,{type:"checkbox","aria-label":"Learn now"});now.checked=true;sw.appendChild(now);sc.appendChild(sw);
      sc.appendChild(el("p","coll-hint","On: comes up in your next round. Off: waits for „5 neue Wörter lernen“."));
    }
    const err=el("p","coll-error");sc.appendChild(err);
    sc.addEventListener("input",()=>{err.textContent=""});           // an old hint disappears as soon as you type
    if(editing)sc.querySelectorAll(".coll-field").forEach(f=>{f.placeholder=""}); // examples only for a new word

    function drawChips(){
      chips.textContent="";
      toks.forEach((t,i)=>{if(!t.core)return;
        const c=button("coll-chip"+(t.on?" on":""),t.core,()=>{toks[i].on=!toks[i].on;err.textContent="";drawChips()});
        c.setAttribute("aria-pressed",t.on?"true":"false");chips.appendChild(c)});
      const any=toks.some(t=>t.on&&t.core);
      preview.textContent="";
      if(any)toks.forEach((t,i)=>{if(i)preview.appendChild(document.createTextNode(" "));
        preview.appendChild(document.createTextNode(t.lead));
        if(t.on&&t.core){const b=el("span","blank");b.setAttribute("aria-label","gap");preview.appendChild(b)}else preview.appendChild(document.createTextNode(t.core));
        preview.appendChild(document.createTextNode(t.trail))});
      hint.style.display=toks.length&&!any?"":"none";
      fBase.placeholder=autoBase()||(editing?"":"vorschlagen");
    }
    fSentence.addEventListener("input",()=>{toks=tokensFromText(fSentence.value,toks);drawChips()});
    drawChips();

    function save(){
      err.textContent="";
      const fields={sentence:clozeText(toks),translation:fMeaning.value,sentenceTranslation:fTrans.value,
        base:fBase.value.trim()||autoBase(),grammar:fGram.value,pos};
      if(!toks.length){err.textContent="Please type a sentence.";fSentence.focus();return}
      if(!hiddenWords(toks)){err.textContent="Please tap the word you want to practise.";return}
      if(!fMeaning.value.trim()){err.textContent="Please type the meaning.";fMeaning.focus();return}
      try{
        if(editing){
          const r=C.update(w.id,fields);
          if(r.reason){err.textContent=r.reason;return}
          if(session){if(opts.onSaved)opts.onSaved(r.card);close();return}
        }else{
          const r=creating?C.create(opts.name,[fields]):C.add([fields],{activateNow:now.checked});
          if(r.duplicates){err.textContent="This word is already in your collection.";return}
          if(!r.added){err.textContent=(r.skipped[0]&&r.skipped[0].reason)||"The word couldn't be saved.";return}
        }
      }catch(e){err.textContent=e.message==="storage-full"?"Storage is full - the word wasn't saved.":"The word couldn't be saved.";return}
      dirty=true;refreshButtons();viewMain();
    }

    const b=el("div","coll-form-buttons");
    if(creating)opts.cancel=opts.cancel||viewMain;
    b.appendChild(button("coll-main","Save",save));
    if(editing&&!session)b.appendChild(button("coll-link","Delete Word",()=>viewRemove(w)));
    b.appendChild(button("coll-link","Cancel",session?close:(opts.cancel||viewMain)));
    card.appendChild(b);
    if(!editing)setTimeout(()=>fSentence.focus(),60);
  }

  function viewRemove(w){
    card.textContent="";
    card.appendChild(head("Delete this word?"));
    card.appendChild(el("p","coll-text","„"+(w.base||w.target)+"“ and your progress with it will be deleted."));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Keep",()=>viewForm(w)));
    b.appendChild(button("coll-quiet","Delete",()=>{C.remove(w.id);dirty=true;refreshButtons();viewMain()}));
    card.appendChild(b);
  }


  /* ---------- step 5: own words — create a collection / import a list ---------- */
  // The AI part: users write their own request (which words, level, language) and paste this block after it.
  const FORMAT_BLOCK=`Format the words as a JSON list and answer with the list only - no other text.
One object per word, like this:

[
  {
    "sentence": "Ich {{c1::schlage}} Samstag {{c1::vor}}.",
    "translation": "to suggest",
    "sentenceTranslation": "I suggest Saturday.",
    "base": "vorschlagen",
    "grammar": "schlägt vor · schlug vor · hat vorgeschlagen",
    "pos": "Verb"
  },
  {
    "sentence": "Der {{c1::Termin}} ist morgen um zehn.",
    "translation": "appointment",
    "sentenceTranslation": "The appointment is tomorrow at ten.",
    "base": "der Termin",
    "grammar": "die Termine",
    "pos": "Substantiv"
  }
]

Rules:
- "sentence": a short, natural, everyday German sentence. Mark the word to practise with {{c1::…}}, exactly as it appears in the sentence.
- Mark only ONE word per sentence. Separable verbs: mark both parts, e.g. "Ich {{c1::rufe}} dich morgen {{c1::an}}."
- "translation" (meaning of the word) and "sentenceTranslation" (the whole sentence): in the language I asked for - English if I didn't say.
- "base": the dictionary form. Nouns with der / die / das.
- "grammar": verbs: 3rd person · Präteritum · Perfekt. Nouns: the plural. Otherwise leave it empty.
- "pos": the word class in German (Verb, Substantiv, Adjektiv, Adverb, Präposition, Konjunktion …).`;

  function copyText(text,done){
    const fallback=()=>{const t=el("textarea",null,null,{readonly:"",style:"position:fixed;top:-1000px;opacity:0"});t.value=text;document.body.appendChild(t);
      t.select();t.setSelectionRange(0,text.length);let ok=false;try{ok=document.execCommand("copy")}catch(e){}t.remove();done(ok)};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>done(true),fallback);else fallback();
  }

  // Starter-Set → own words: name, then import a list or type the first word.
  function viewCreate(){
    card.textContent="";
    card.appendChild(head("Your Own Words"));
    const sc=el("div","coll-scroll");card.appendChild(sc);
    sc.appendChild(el("p","coll-text","Your own words replace the Starter-Set. Your progress there is set aside - you can switch back later."));
    const l=el("label","coll-label","Collection Name",{for:"cfName"});sc.appendChild(l);
    const nameIn=el("input","coll-field",null,{id:"cfName",type:"text",maxlength:"40",placeholder:"My Words",autocomplete:"off"});sc.appendChild(nameIn);
    const nm=()=>nameIn.value.trim()||"My Words";
    const b=el("div","coll-form-buttons");
    b.appendChild(button("coll-main","Import a List",()=>viewImport({create:true,name:nm()})));
    b.appendChild(button("coll-quiet","Type the First Word",()=>viewForm(null,{create:true,name:nm(),cancel:viewCreate})));
    b.appendChild(button("coll-link","Cancel",viewMain));
    card.appendChild(b);
  }

  // Paste the AI's answer or pick a file. opts.create: this list starts a new collection.
  function viewImport(opts){
    card.textContent="";
    card.appendChild(head(opts.create?"Import a List":"Import Words"));
    const sc=el("div","coll-scroll");card.appendChild(sc);
    const intro=el("p","coll-text");intro.style.marginBottom="10px";
    intro.appendChild(document.createTextNode("Ask an AI for example sentences for your words and paste its answer here. To get the right format: "));
    intro.appendChild(button("coll-link","Format for the AI",()=>viewFormat(()=>viewImport(opts))));
    sc.appendChild(intro);
    const ta=el("textarea","coll-field coll-paste",null,{id:"cfPaste",rows:"7",placeholder:"[ { \"sentence\": \"Ich {{c1::schlage}} …\", … } ]","aria-label":"Paste the list",autocomplete:"off",autocapitalize:"off",spellcheck:"false"});
    sc.appendChild(ta);
    const fileIn=el("input",null,null,{type:"file",accept:".json,.js,.txt,application/json,text/plain,text/javascript",style:"display:none"});
    sc.appendChild(fileIn);
    const fileRow=el("p","coll-hint");fileRow.appendChild(document.createTextNode("Or: "));
    fileRow.appendChild(button("coll-link","Choose a File",()=>fileIn.click()));sc.appendChild(fileRow);
    if(!opts.create)sc.appendChild(el("p","coll-hint","New words join the end of the queue for „5 neue Wörter lernen“."));
    const err=el("p","coll-error");sc.appendChild(err);
    ta.addEventListener("input",()=>{err.textContent=""});

    function run(text){
      err.textContent="";
      const parsed=C.parse(text);
      if(parsed.error){
        err.textContent=parsed.error==="empty"?"Please paste the list first."
          :"This doesn't look like a list. Copy the AI's whole answer - from [ to ].";
        return;
      }
      let r;
      try{r=opts.create?C.create(opts.name,parsed.items):C.add(parsed.items)}
      catch(e){err.textContent=e.message==="storage-full"?"Storage is full - nothing was saved.":"The list couldn't be saved.";return}
      if(!r.added){
        err.textContent=r.duplicates&&!r.skipped.length?"All these words are already in your collection."
          :"None of the cards could be used."+(r.skipped[0]?" For example no. "+r.skipped[0].n+": "+r.skipped[0].reason+".":"");
        return;
      }
      dirty=true;refreshButtons();viewResult(r,opts);
    }
    fileIn.addEventListener("change",()=>{const f=fileIn.files&&fileIn.files[0];if(!f)return;
      if(f.size>2e6){err.textContent="The file is too big.";return}
      f.text().then(t=>{ta.value=t;run(t)},()=>{err.textContent="The file couldn't be read."})});

    const b=el("div","coll-form-buttons");
    b.appendChild(button("coll-main",opts.create?"Create Collection":"Add",()=>run(ta.value)));
    b.appendChild(button("coll-link","Cancel",opts.create?viewCreate:viewMain));
    card.appendChild(b);
  }

  function viewResult(r,opts){
    card.textContent="";
    card.appendChild(head(opts.create?"Collection Created":"Words Added"));
    const sc=el("div","coll-scroll");card.appendChild(sc);
    sc.appendChild(el("p","coll-text",(r.added===1?"1 word":r.added+" words")+(opts.create?" in „"+(C.get()?C.get().name:opts.name)+"“.":" added.")
      +(opts.create&&r.added>10?" You start with the first 10.":"")));
    if(r.duplicates)sc.appendChild(el("p","coll-hint",(r.duplicates===1?"1 word was":r.duplicates+" words were")+" already in your collection."));
    if(r.skipped.length){
      sc.appendChild(el("p","coll-label",(r.skipped.length===1?"1 card":r.skipped.length+" cards")+" skipped:"));
      r.skipped.slice(0,30).forEach(x=>sc.appendChild(el("p","coll-hint","No. "+x.n+" · "+x.reason+(x.preview?" · „"+x.preview+"“":""))));
      if(r.skipped.length>30)sc.appendChild(el("p","coll-hint","… and "+(r.skipped.length-30)+" more."));
    }
    const b=el("div","coll-form-buttons");
    b.appendChild(button("coll-main","Done",close));
    card.appendChild(b);
  }

  // Shows the format block and copies it.
  function viewFormat(back){
    card.textContent="";
    card.appendChild(head("Format for the AI"));
    const sc=el("div","coll-scroll");card.appendChild(sc);
    sc.appendChild(el("p","coll-text","First tell your AI what you want - which words, which level, which language for the translations. Then add this text:"));
    sc.appendChild(el("pre","coll-pre",FORMAT_BLOCK));
    const b=el("div","coll-form-buttons");
    const copyBtn=button("coll-main","Copy",()=>copyText(FORMAT_BLOCK,ok=>{copyBtn.textContent=ok?"Copied ✓":"Please select the text above and copy it"}));
    b.appendChild(copyBtn);
    b.appendChild(button("coll-link","Back",back));
    card.appendChild(b);
  }

  /* ---------- rename ---------- */
  function viewRename(){
    card.textContent="";
    card.appendChild(head("Rename"));
    const input=el("input","coll-name-input",null,{type:"text",maxlength:"40","aria-label":"Collection Name",autocomplete:"off"});
    input.value=name();
    const save=()=>{C.rename(input.value);refreshButtons();viewMain()};
    input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();save()}});
    card.appendChild(input);
    const b=el("div","coll-buttons");b.style.marginTop="22px";
    b.appendChild(button("coll-main","Save",save));
    b.appendChild(button("coll-link","Cancel",viewMain));
    card.appendChild(b);
    setTimeout(()=>{input.focus();input.select()},60);
  }

  /* ---------- export: a clean list that can be imported again ---------- */
  function exportFile(){
    const blob=new Blob([C.exportText()],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=(name().replace(/[\\/:*?"<>|]+/g," ").trim()||"Wortschatz")+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  /* ---------- delete → back to the built-in set ---------- */
  function viewDelete(){
    const n=list().length;
    card.textContent="";
    card.appendChild(head("Delete this collection?"));
    card.appendChild(el("p","coll-text","„"+name()+"“ with "+wordsLabel(n)+" and your progress with it will be deleted, and you go back to the Starter-Set. This can't be undone - export the words first if you want to keep them."));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Keep",viewMain));          // safe choice = contrast button
    b.appendChild(button("coll-quiet","Delete",()=>C.hasDemoProgress()?viewDemoChoice():finish(false)));
    b.appendChild(button("coll-link","Export First",exportFile));
    card.appendChild(b);
  }
  function viewDemoChoice(){
    card.textContent="";
    card.appendChild(head("Back to Starter-Set"));
    card.appendChild(el("p","coll-text","You have already practised with the Starter-Set. Do you want to continue where you left off?"));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Continue",()=>finish(true)));
    b.appendChild(button("coll-quiet","Start Over",()=>finish(false)));
    card.appendChild(b);
  }
  function finish(continueDemo){
    C.backToDemo(continueDemo);
    location.reload();                       // Wortschatz keeps progress in memory: start fresh from storage
  }

  ["collBtnStart","collBtnDone"].forEach(id=>{const b=$(id);if(b)b.onclick=open});
  if($("ownWordsBtn"))$("ownWordsBtn").onclick=()=>open(viewCreate);   // start screen: straight to „Your Own Words“
  refreshButtons();
  // ✎ on the answer screen: edit the card you're looking at (own collection only)
  function editInSession(w,onSaved){if(own()&&w&&String(w.id).charAt(0)==="u")open(()=>viewForm(w,{session:true,onSaved}))}
  window.WortschatzCollectionWindow={open,close,refreshButtons,editInSession};
})();
