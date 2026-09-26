/* Wortschatz · collection button + window — v3, 2026-09-26 (v2: word form, step 4 · v3: ✎ on the answer screen)
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 3). Storage lives in collection.js.
   - Button (start screen + „Fertig für heute“): „<name> · <count>“; the built-in set is called „Standard“.
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
  const BUILTIN_NAME="Standard";

  const own=()=>C.isOwn();
  const list=()=>own()?C.cards():(window.WORDS||[]);
  const name=()=>own()?(C.get().name||"Meine Wörter"):BUILTIN_NAME;
  const wordsLabel=n=>n===1?"1 Wort":n+" Wörter";
  const tr=(c,f)=>typeof window.getTranslation==="function"?window.getTranslation(c,f):(typeof c[f]==="string"?c[f]:"");

  function el(tag,cls,text,attrs){
    const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=text;
    if(attrs)Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;
  }
  function button(cls,text,onClick){const b=el("button",cls,text,{type:"button"});b.onclick=onClick;return b}

  function refreshButtons(){
    const label=name()+" · "+list().length;
    ["collBtnStart","collBtnDone"].forEach(id=>{const b=$(id);if(b){b.textContent=label;b.setAttribute("aria-label","Wortsammlung: "+label)}});
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
    h.appendChild(button("coll-close","×",close)).setAttribute("aria-label","Schließen");
    return h;
  }

  /* ---------- main view: name, count, list, actions ---------- */
  function viewMain(){
    card.textContent="";
    const words=list();
    card.appendChild(head(name()));
    const meta=el("p","coll-meta");
    meta.appendChild(document.createTextNode(wordsLabel(words.length)+(own()?" · ":" · eingebautes Set")));
    if(own())meta.appendChild(button("coll-link","Umbenennen",viewRename));
    card.appendChild(meta);

    const box=el("div","coll-list");
    words.forEach(w=>{
      const row=own()?button("coll-word is-btn","",()=>viewForm(w)):el("div","coll-word");
      row.appendChild(el("span","coll-de",w.base||String(w.target||"").split(" / ").join(" ")));
      row.appendChild(el("span","coll-tr",tr(w,"translation")));
      box.appendChild(row);
    });
    if(!words.length)box.appendChild(el("p","coll-note","Noch keine Wörter."));
    card.appendChild(box);

    if(own()){
      const act=el("div","coll-actions");
      act.appendChild(button("coll-row","＋ Wort hinzufügen",()=>viewForm(null)));
      act.appendChild(button("coll-row","Exportieren",()=>exportFile()));
      act.appendChild(button("coll-row","Löschen · zurück zum Standard-Set",viewDelete));
      card.appendChild(act);
    }else{
      card.appendChild(el("div","coll-actions")).style.paddingTop="0";
    }
  }


  /* ---------- word form: add (card=null) or edit one word ---------- */
  // The sentence is split into word chips; tapping a chip hides that word ({{c1::…}}).
  // Several chips = one split answer (separable verbs: „schlage“ + „vor“).
  const CLOZE=/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g;
  const POS=["Verb","Substantiv","Adjektiv","Andere"];
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
    const editing=!!w,session=!!opts.session;
    card.textContent="";
    card.appendChild(head(editing?"Wort bearbeiten":"Neues Wort"));
    const sc=el("div","coll-scroll");card.appendChild(sc);

    let toks=editing?tokensFromCloze(w.sentence):[];
    const [fS,fSentence]=field("Satz",false,"textarea",{id:"cfSentence",rows:"2",placeholder:"Ich schlage Samstag vor."});
    fSentence.value=plainText(toks);sc.appendChild(fS);
    const chips=el("div","coll-chips");sc.appendChild(chips);
    const hint=el("p","coll-hint","Tippe auf das Wort, das geübt werden soll. Bei trennbaren Verben auf beide Teile.");sc.appendChild(hint);
    const preview=el("p","coll-preview");sc.appendChild(preview);

    const [fM,fMeaning]=field("Bedeutung",false,"input",{id:"cfMeaning",type:"text",placeholder:"to suggest"});
    fMeaning.value=editing?plainValue(w.translation):"";sc.appendChild(fM);
    const [fT,fTrans]=field("Übersetzung des Satzes",true,"input",{id:"cfTrans",type:"text",placeholder:"I suggest Saturday."});
    fTrans.value=editing?plainValue(w.sentenceTranslation):"";sc.appendChild(fT);
    const [fB,fBase]=field("Grundform",true,"input",{id:"cfBase",type:"text"});
    const autoBase=()=>hiddenWords(toks);
    fBase.value=editing&&w.base&&w.base!==autoBase()?w.base:"";sc.appendChild(fB);
    const [fG,fGram]=field("Grammatik",true,"input",{id:"cfGram",type:"text",placeholder:"schlug vor · hat vorgeschlagen"});
    fGram.value=editing?plainValue(w.grammar):"";sc.appendChild(fG);

    sc.appendChild(el("span","coll-label","Wortart")).appendChild(el("span","opt"," · optional"));
    const posBox=el("div","coll-chips");sc.appendChild(posBox);
    let pos=editing?(w.pos||""):"";
    const posChip=p=>POS.slice(0,3).includes(pos)?pos===p:(p==="Andere"&&!!pos);
    function drawPos(){posBox.textContent="";POS.forEach(p=>{
      const c=button("coll-chip"+(posChip(p)?" on":""),p,()=>{pos=posChip(p)?"":(p==="Andere"?(POS.slice(0,3).includes(pos)||!pos?"Andere":pos):p);drawPos()});
      c.setAttribute("aria-pressed",posChip(p)?"true":"false");posBox.appendChild(c)})}
    drawPos();

    let now=null;
    if(!editing){
      const sw=el("label","coll-switch");sw.appendChild(el("span",null,"Gleich lernen"));
      now=el("input",null,null,{type:"checkbox","aria-label":"Gleich lernen"});now.checked=true;sw.appendChild(now);sc.appendChild(sw);
      sc.appendChild(el("p","coll-hint","An: kommt schon in der nächsten Runde. Aus: wartet auf „+ 5 neue Wörter“."));
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
        if(t.on&&t.core){const b=el("span","blank");b.setAttribute("aria-label","Lücke");preview.appendChild(b)}else preview.appendChild(document.createTextNode(t.core));
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
      if(!toks.length){err.textContent="Bitte einen Satz eingeben.";fSentence.focus();return}
      if(!hiddenWords(toks)){err.textContent="Bitte tippe auf das Wort, das geübt werden soll.";return}
      if(!fMeaning.value.trim()){err.textContent="Bitte die Bedeutung eingeben.";fMeaning.focus();return}
      try{
        if(editing){
          const r=C.update(w.id,fields);
          if(r.reason){err.textContent=r.reason;return}
          if(session){if(opts.onSaved)opts.onSaved(r.card);close();return}
        }else{
          const r=C.add([fields],{activateNow:now.checked});
          if(r.duplicates){err.textContent="Dieses Wort ist schon in der Sammlung.";return}
          if(!r.added){err.textContent=(r.skipped[0]&&r.skipped[0].reason)||"Das Wort konnte nicht gespeichert werden.";return}
        }
      }catch(e){err.textContent=e.message==="storage-full"?"Der Speicher ist voll - das Wort wurde nicht gespeichert.":"Das Wort konnte nicht gespeichert werden.";return}
      dirty=true;refreshButtons();viewMain();
    }

    const b=el("div","coll-form-buttons");
    b.appendChild(button("coll-main","Speichern",save));
    if(editing&&!session)b.appendChild(button("coll-link","Wort löschen",()=>viewRemove(w)));
    b.appendChild(button("coll-link","Abbrechen",session?close:viewMain));
    card.appendChild(b);
    if(!editing)setTimeout(()=>fSentence.focus(),60);
  }

  function viewRemove(w){
    card.textContent="";
    card.appendChild(head("Wort löschen?"));
    card.appendChild(el("p","coll-text","„"+(w.base||w.target)+"“ und dein Fortschritt damit werden gelöscht."));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Behalten",()=>viewForm(w)));
    b.appendChild(button("coll-quiet","Löschen",()=>{C.remove(w.id);dirty=true;refreshButtons();viewMain()}));
    card.appendChild(b);
  }

  /* ---------- rename ---------- */
  function viewRename(){
    card.textContent="";
    card.appendChild(head("Umbenennen"));
    const input=el("input","coll-name-input",null,{type:"text",maxlength:"40","aria-label":"Name der Sammlung",autocomplete:"off"});
    input.value=name();
    const save=()=>{C.rename(input.value);refreshButtons();viewMain()};
    input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();save()}});
    card.appendChild(input);
    const b=el("div","coll-buttons");b.style.marginTop="22px";
    b.appendChild(button("coll-main","Speichern",save));
    b.appendChild(button("coll-link","Abbrechen",viewMain));
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
    card.appendChild(head("Sammlung löschen?"));
    card.appendChild(el("p","coll-text","„"+name()+"“ mit "+(n===1?"1 Wort":n+" Wörtern")+" und deinem Fortschritt damit wird gelöscht. Das lässt sich nicht rückgängig machen - exportiere die Wörter vorher, wenn du sie behalten willst."));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Behalten",viewMain));          // safe choice = contrast button
    b.appendChild(button("coll-quiet","Löschen",()=>C.hasDemoProgress()?viewDemoChoice():finish(false)));
    b.appendChild(button("coll-link","Vorher exportieren",exportFile));
    card.appendChild(b);
  }
  function viewDemoChoice(){
    card.textContent="";
    card.appendChild(head("Zurück zum Standard-Set"));
    card.appendChild(el("p","coll-text","Du hast im Standard-Set schon geübt. Möchtest du dort weitermachen, wo du aufgehört hast?"));
    const b=el("div","coll-buttons");
    b.appendChild(button("coll-main","Weitermachen",()=>finish(true)));
    b.appendChild(button("coll-quiet","Neu anfangen",()=>finish(false)));
    card.appendChild(b);
  }
  function finish(continueDemo){
    C.backToDemo(continueDemo);
    location.reload();                       // Wortschatz keeps progress in memory: start fresh from storage
  }

  ["collBtnStart","collBtnDone"].forEach(id=>{const b=$(id);if(b)b.onclick=open});
  refreshButtons();
  // ✎ on the answer screen: edit the card you're looking at (own collection only)
  function editInSession(w,onSaved){if(own()&&w&&String(w.id).charAt(0)==="u")open(()=>viewForm(w,{session:true,onSaved}))}
  window.WortschatzCollectionWindow={open,close,refreshButtons,editInSession};
})();
