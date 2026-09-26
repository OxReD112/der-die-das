/* Wortschatz · collection button + window — v1, 2026-09-26
   Plan: Documentation/WORTSCHATZ_COLLECTIONS.md (step 3). Storage lives in collection.js.
   - Button (start screen + „Fertig für heute“): „<name> · <count>“; the built-in set is called „Standard“.
   - Window: name, word count, word list; own collection: rename, export, delete → back to the built-in set.
   - Adding / editing words (steps 4–5) will plug into this window.
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
  let lastFocus=null;
  function open(){
    lastFocus=document.activeElement;
    viewMain();
    modal.setAttribute("aria-hidden","false");
    requestAnimationFrame(()=>requestAnimationFrame(()=>modal.classList.add("open")));
  }
  function close(){
    modal.classList.remove("open");modal.setAttribute("aria-hidden","true");
    setTimeout(()=>{card.textContent=""},220);
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
      const row=el("div","coll-word");
      row.appendChild(el("span","coll-de",w.base||String(w.target||"").split(" / ").join(" ")));
      row.appendChild(el("span","coll-tr",tr(w,"translation")));
      box.appendChild(row);
    });
    if(!words.length)box.appendChild(el("p","coll-note","Noch keine Wörter."));
    card.appendChild(box);

    if(own()){
      const act=el("div","coll-actions");
      act.appendChild(button("coll-row","Exportieren",()=>exportFile()));
      act.appendChild(button("coll-row","Löschen · zurück zum Standard-Set",viewDelete));
      card.appendChild(act);
    }else{
      card.appendChild(el("div","coll-actions")).style.paddingTop="0";
    }
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
  window.WortschatzCollectionWindow={open,close,refreshButtons};
})();
