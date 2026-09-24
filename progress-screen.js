/* Deutsch · Progress screen (Fortschritt) — v1
   Opens when the "Heute" tile on Home is tapped.
   Concept + rules: Documentation/PROGRESS_TRACKER.md · Design: Claude outputs/fortschritt-mockup-v2.html

   Data (read-only here):
   - deutschProgressV1           current summaries per exercise (written by the exercises)
   - deutschProgressSnapshotsV1  daily snapshots (written by Home, 22-day window)
   - deutschProfileV1            name for the encouraging line
   Comparison: today vs. the newest snapshot that is 21+ days old. If none exists yet, tracking
   started less than 3 weeks ago → baseline 0 % ("Seit Start"), because progress started from zero.
*/
(function(){
  "use strict";

  const PROGRESS_KEY="deutschProgressV1", SNAP_KEY="deutschProgressSnapshotsV1", PROFILE_KEY="deutschProfileV1";
  const WINDOW_DAYS=21, LIST_MAX=5;
  const EX_NAMES={artikel:"Artikel",partizipII:"Partizip II",modalverben:"Modalverben",pronomen:"Pronomen",
    festerKasus:"Fester Kasus",verbenMitPraepositionen:"Verben mit Präpositionen",ortspraepositionen:"Ortspräpositionen"};
  const CHAPTERS=[
    {name:"Artikel",ex:["artikel"]},
    {name:"Verbformen",ex:["partizipII","modalverben"]},
    {name:"Pronomen",ex:["pronomen"]},
    {name:"Präpositionen",ex:["festerKasus","verbenMitPraepositionen","ortspraepositionen"]}
  ];
  const GRAMMAR=CHAPTERS.flatMap(c=>c.ex);
  const reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- styles ---------- */
  const css=`
:root{--pg-scrim:rgba(0,0,0,.28);--pg-modal-bg:#252527;--pg-modal-border:rgba(255,255,255,.10);--pg-close:#fff;--pg-bg:#1f1f21;--pg-tile:#212123;--pg-ghost:#2c5a4e;--pg-lost:rgba(232,130,111,.62);--pg-down:#e8a08f;--pg-started:rgba(255,255,255,.26);--pg-sheet:rgba(255,255,255,.03);--pg-line:rgba(255,255,255,.05);--pg-fill:rgba(85,215,181,.08)}
[data-theme="light"]{--pg-scrim:rgba(0,0,0,.18);--pg-modal-bg:#fff;--pg-modal-border:rgba(0,0,0,.10);--pg-close:#242426;--pg-bg:var(--bg);--pg-tile:#ecebe8;--pg-ghost:#b7dccf;--pg-lost:rgba(214,110,86,.45);--pg-down:#c0634c;--pg-started:rgba(0,0,0,.14);--pg-sheet:rgba(0,0,0,.025);--pg-line:rgba(0,0,0,.06);--pg-fill:rgba(47,158,130,.10)}
.tile-today{cursor:pointer;-webkit-tap-highlight-color:transparent}
.tile-today:active{opacity:.8}
.pg{position:fixed;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;padding:18px;color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;
  background:rgba(0,0,0,0);opacity:0;visibility:hidden;transition:opacity .18s ease,background-color .18s ease,visibility 0s linear .18s}
.pg.open{opacity:1;visibility:visible;background:var(--pg-scrim);transition:opacity .18s ease,background-color .18s ease,visibility 0s}
.pg-modal{width:min(460px,100%);max-height:82vh;overflow:hidden;background:var(--pg-modal-bg);border:1px solid var(--pg-modal-border);
  border-radius:24px;padding:4px 12px 12px;display:flex;flex-direction:column;
  opacity:0;transform:scale(.92);filter:blur(8px);transition:opacity .2s ease,transform .2s ease,filter .2s ease}
.pg.open .pg-modal{opacity:1;transform:scale(1);filter:blur(0)}
.pg-head{display:flex;justify-content:space-between;align-items:center;flex:0 0 auto;padding:2px 2px 2px 8px}
.pg-head h2{margin:0;font-family:Georgia,serif;font-size:20px;font-weight:400;display:flex;align-items:center;min-width:0}
.pg-head-back{appearance:none;-webkit-appearance:none;border:0;background:none;color:var(--mint);font:inherit;font-size:24px;line-height:1;padding:4px 10px 6px 0;cursor:pointer}
.pg-x{border:0;background:transparent;color:var(--pg-close);font-size:28px;line-height:1;padding:8px;cursor:pointer}
.pg-x:active,.pg-head-back:active{opacity:.6}
.pg-body-scroll{overflow:auto;min-height:0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.pg-inner{position:relative;padding:0 0 4px}
.pg-view{transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s}
.pg-view.away{position:absolute;top:0;left:0;right:0;opacity:0;pointer-events:none}
@media(max-width:600px){.pg{padding:10px}.pg-modal{max-height:84vh;padding:3px 10px 10px}.pg-head h2{font-size:19px}}
@media(prefers-reduced-motion:reduce){.pg,.pg-modal{transition:none!important}}
.pg-view.away.l{transform:translateX(-30%)}.pg-view.away.r{transform:translateX(30%)}
.pg-back{appearance:none;-webkit-appearance:none;border:0;background:none;color:var(--mint);font:inherit;font-size:15px;padding:6px 0;margin-bottom:12px;cursor:pointer}
.pg-card{padding:0}
.pg-card+.pg-card{margin-top:12px;padding-top:12px;border-top:1px solid var(--pg-line)}
.pg-grammar{padding:8px}
.pg-hero{padding:10px 10px 4px;text-align:center}
.pg-kick{color:var(--muted);font-size:12px}
.pg-big{display:flex;align-items:center;justify-content:center;margin-top:4px}
.pg-big b{font-size:34px;font-weight:700;letter-spacing:-.8px;color:var(--mint);line-height:1}
.pg-big span{font-size:14px;font-weight:600;margin-left:8px;line-height:1.15;text-align:left}
.pg-say{font-size:13.5px;line-height:1.35;color:var(--label-text,var(--text));margin-top:6px}
.pg-hero svg{margin-top:10px}
.pg-divider{height:1px;background:var(--pg-line);margin:8px 10px 2px}
.pg svg{width:100%;height:auto;display:block;overflow:visible}
.pg-list{padding:8px}
.pg-row{display:block;width:100%;appearance:none;-webkit-appearance:none;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:12px 10px 13px;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pg-row.static{cursor:default}
.pg-row.open{background:var(--pg-sheet)}
.pg-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.pg-n{font-size:14.5px;font-weight:600}
.pg-row.sub .pg-n{font-weight:500;font-size:14px}
.pg-d{font-size:12.5px;font-weight:600;color:var(--mint);white-space:nowrap}
.pg-d.down{color:var(--pg-down)}.pg-d.none{color:var(--dim-text)}
.pg-d .tot{color:var(--muted);font-weight:500;font-size:12px}
.pg-d .pg-ws{color:var(--label-text,var(--text));font-weight:600;font-size:12px}
.pg-d .pg-wl{color:var(--mint);font-weight:650;font-size:12px}
.pg-chev{color:var(--dim-text);margin-left:8px;display:inline-block;transition:transform .25s}
.pg-row.open .pg-chev{transform:rotate(90deg)}
.pg-track{position:relative;height:10px;border-radius:5px;background:var(--today-track)}
.pg-row.sub .pg-track{height:8px}
.pg-track i{position:absolute;top:0;bottom:0;left:0;width:0;border-radius:5px}
.pg-fill{background:var(--mint);transition:width 1.1s cubic-bezier(.2,.8,.2,1)}
.pg-past{background:var(--pg-ghost);border-radius:5px 0 0 5px!important;transition:width .9s cubic-bezier(.2,.8,.2,1)}
.pg-lost{background:var(--pg-lost);border-radius:0!important;transition:width .9s cubic-bezier(.2,.8,.2,1)}
.pg-started{background:var(--pg-started);transition:width 1s cubic-bezier(.2,.8,.2,1)}
.pg-notch{top:-4px!important;bottom:-4px!important;width:2px!important;margin-left:-1px;border-radius:1px!important;background:var(--text);opacity:0;transition:opacity .4s .8s}
.pg-legend{display:flex;gap:16px;justify-content:center;margin:6px 0 6px;color:var(--dim-text);font-size:11.5px}
.pg-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;vertical-align:middle;margin:-2px 6px 0 0}
.pg-chapters .pg-row{padding:8px 10px 9px}
.pg-words .pg-row{padding:16px 10px 12px}
.pg-words .pg-n{font-size:17px}
.pg-words .pg-legend{margin:12px 0 0}
.pg-title{display:flex;justify-content:flex-start;align-items:baseline;margin:0 10px 6px}
.pg-title h2{font-size:24px;font-weight:650;margin:0}
.pg-title span{color:var(--muted);font-size:14px}
.pg-title b{color:var(--mint)}.pg-title b.down{color:var(--pg-down)}
.pg h3{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin:4px 0 10px}
.pg-items{list-style:none;margin:0;padding:0}
.pg-items li{padding:10px 2px;border-bottom:1px solid var(--pg-line);font-size:14.5px}
.pg-items li:last-child{border-bottom:0}
.pg-more{appearance:none;-webkit-appearance:none;border:0;background:none;color:var(--muted);font:inherit;font-size:13px;padding:10px 2px;cursor:pointer}
.pg-empty{color:var(--dim-text);font-size:14px;padding:6px 2px}
.pg-expand{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.pg-row.open .pg-expand{grid-template-rows:1fr}
.pg-expand>div{overflow:hidden}
.pg-note{color:var(--dim-text);font-size:12px;text-align:center;margin-top:16px}
`;
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);

  /* ---------- helpers ---------- */
  const NS="http://www.w3.org/2000/svg";
  const el=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e};
  const txt=(a,s)=>{const e=el("text",a);e.textContent=s;return e};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
  function dayKey(back){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-back);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
  function addDay(k,n){const [y,m,d]=k.split("-").map(Number);const t=new Date(y,m-1,d,12);t.setDate(t.getDate()+n);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}
  const pct=(s,t)=>t>0?s/t*100:0;
  const round=x=>Math.round(x);

  /* ---------- model ---------- */
  function buildModel(){
    const prog=read(PROGRESS_KEY), ex=(prog&&prog.exercises)||{};
    const snapStore=read(SNAP_KEY), snaps=(snapStore&&snapStore.days)||{};
    const days=Object.keys(snaps).sort();
    const today=dayKey(0), target=dayKey(WINDOW_DAYS);
    const older=days.filter(d=>d<=target);
    const sinceStart=!older.length;
    const baseDay=sinceStart?null:older[older.length-1];
    const startDay=sinceStart?(days[0]||today):baseDay;

    // value of one exercise on a given day (last snapshot on or before that day)
    function snapAt(id,day){
      for(let i=days.length-1;i>=0;i--){if(days[i]<=day&&snaps[days[i]][id])return snaps[days[i]][id]}
      return null;
    }
    const E={};
    GRAMMAR.forEach(id=>{
      const sm=ex[id]&&ex[id].summary;
      const t=sm&&Number(sm.total)>0?Number(sm.total):0, s=sm?Number(sm.sicher)||0:0;
      const base=sinceStart?null:snapAt(id,baseDay);
      const now=pct(s,t), then=base?pct(base.s,base.t):0;
      // series: one point per day from startDay to today (today = live value)
      const series=[];
      if(sinceStart)series.push(0);
      for(let d=startDay;d<today;d=addDay(d,1)){const v=snapAt(id,d);series.push(v?pct(v.s,v.t):0)}
      series.push(now);
      E[id]={id,name:EX_NAMES[id],known:t>0,s,t,now,then,series,recent:(sm&&Array.isArray(sm.recent))?sm.recent:[]};
    });
    const chapters=CHAPTERS.map(c=>{
      const list=c.ex.map(id=>E[id]);
      const avg=f=>list.reduce((a,e)=>a+f(e),0)/list.length;
      const series=list[0].series.map((_,i)=>avg(e=>e.series[i]??e.now));
      return {name:c.name,subs:c.ex.length>1?list:null,single:c.ex.length===1?list[0]:null,
        now:avg(e=>e.now),then:avg(e=>e.then),series,recent:list.flatMap(e=>e.recent)};
    });
    // grammar line: Σ sicher ÷ Σ total (weighted), per day
    function grammarAt(day){let s=0,t=0;GRAMMAR.forEach(id=>{const v=snapAt(id,day);if(v){s+=v.s;t+=v.t}});return pct(s,t)}
    let ls=0,lt=0;GRAMMAR.forEach(id=>{if(E[id].known){ls+=E[id].s;lt+=E[id].t}});
    const gNow=pct(ls,lt), gThen=sinceStart?0:grammarAt(baseDay);
    const gSeries=[];if(sinceStart)gSeries.push(0);
    for(let d=startDay;d<today;d=addDay(d,1))gSeries.push(grammarAt(d));
    gSeries.push(gNow);
    const learned=GRAMMAR.reduce((a,id)=>a+E[id].recent.length,0);
    const ws=ex.wortschatz&&ex.wortschatz.summary;
    const profile=read(PROFILE_KEY);
    return {sinceStart,chapters,gNow,gThen,gSeries,learned,
      words:ws?{total:Number(ws.total)||0,started:Number(ws.started)||0,learned:Number(ws.learned)||0}:null,
      name:profile&&typeof profile.name==="string"?profile.name.trim().slice(0,20):""};
  }

  /* ---------- pieces ---------- */
  function deltaHTML(o,known=true){
    if(!known)return '<span class="pg-d none">noch nicht geübt</span>';
    const d=round(o.now)-round(o.then);
    if(d<0)return `<span class="pg-d down">−${-d}%</span>`;
    return `<span class="pg-d${d===0?" none":""}">+${d}%</span>`;
  }
  function bar(row,o,{notch=true}={}){
    const tr=document.createElement("div");tr.className="pg-track";
    tr.innerHTML='<i class="pg-fill"></i><i class="pg-past"></i><i class="pg-lost"></i><i class="pg-notch"></i>';
    row.appendChild(tr);
    const [fill,past,lost,n]=tr.children, now=Math.max(0,Math.min(100,o.now)), then=Math.max(0,Math.min(100,o.then));
    n.style.left=then+"%"; if(!notch||then<=0)n.style.display="none";
    const go=()=>{
      if(now<then){past.style.width=now+"%";lost.style.left=now+"%";setTimeout(()=>lost.style.width=(then-now)+"%",250)}
      else{past.style.width=then+"%";setTimeout(()=>fill.style.width=now+"%",250)}
      n.style.opacity=".7";
    };
    reduceMotion?go():requestAnimationFrame(()=>requestAnimationFrame(go));
  }
  function spark(h,{labels=true,H=110,end=null}={}){
    const W=320,pl=4,pr=labels?34:(end!=null?44:4),pt=12,pb=labels?20:4;
    if(h.length<2)h=[h[0]||0,h[0]||0];
    const lo=Math.max(0,Math.min(...h)-5),hi=Math.min(100,Math.max(...h)+5)||1;
    const span=Math.max(hi-lo,1);
    const x=i=>pl+i/(h.length-1)*(W-pl-pr), y=v=>pt+(1-(v-lo)/span)*(H-pt-pb);
    const s=el("svg",{viewBox:`0 0 ${W} ${H}`}), P=h.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`), L=h.length-1;
    s.append(el("path",{d:`M${P[0]} L${P.join(" L")} L${x(L)},${H-pb} L${x(0)},${H-pb}Z`,fill:"var(--pg-fill)"}));
    const p=el("path",{d:`M${P.join(" L")}`,fill:"none",stroke:"var(--mint)","stroke-width":2.2,"stroke-linejoin":"round","stroke-linecap":"round"});
    s.append(p);
    s.append(el("circle",{cx:x(L),cy:y(h[L]),r:4.5,fill:"var(--mint)"}));
    if(end!=null)s.append(txt({x:x(L)+9,y:y(h[L])+4,fill:"var(--text)","font-size":12.5,"font-weight":650},end));
    if(labels){
      s.append(el("circle",{cx:x(0),cy:y(h[0]),r:3.5,fill:"var(--bg)",stroke:"var(--pg-ghost)","stroke-width":2}));
      s.append(txt({x:x(0),y:y(h[0])-9,fill:"var(--muted)","font-size":11},round(h[0])+"%"));
      s.append(txt({x:x(L)+8,y:y(h[L])+4,fill:"var(--text)","font-size":12,"font-weight":650},round(h[L])+"%"));
      s.append(txt({x:x(0),y:H-3,fill:"var(--dim-text)","font-size":10.5},model.sinceStart?"Start":"vor 3 Wo."));
      s.append(txt({x:x(L),y:H-3,fill:"var(--dim-text)","font-size":10.5,"text-anchor":"end"},"heute"));
    }
    if(!reduceMotion)requestAnimationFrame(()=>{const len=p.getTotalLength();p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
      p.getBoundingClientRect();p.style.transition="stroke-dashoffset 1.2s ease";p.style.strokeDashoffset=0});
    return s;
  }
  function detail(o){
    const d=document.createElement("div");
    const items=[...o.recent].sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:0);
    d.innerHTML=`<h3>Verlauf · ${model.sinceStart?"seit Start":"3 Wochen"}</h3><div class="pg-spark"></div>
      <h3 style="margin-top:20px">Neu gelernt</h3>`;
    d.querySelector(".pg-spark").append(spark(o.series));
    if(!items.length){d.insertAdjacentHTML("beforeend",'<div class="pg-empty">Noch nichts – das kommt!</div>');return d}
    const ul=document.createElement("ul");ul.className="pg-items";
    ul.innerHTML=items.slice(0,LIST_MAX).map(r=>`<li>${esc(r.l)}</li>`).join("");
    d.append(ul);
    if(items.length>LIST_MAX){
      const more=document.createElement("button");more.type="button";more.className="pg-more";
      more.textContent=`+ ${items.length-LIST_MAX} weitere`;
      more.onclick=e=>{e.stopPropagation();ul.insertAdjacentHTML("beforeend",items.slice(LIST_MAX).map(r=>`<li>${esc(r.l)}</li>`).join(""));more.remove()};
      d.append(more);
    }
    return d;
  }

  // Wortschatz numbers: [learned (mint) / ] started (gray) / total — learned only once ≥ 1
  function wordCounts(W){
    const sep='<span class="tot"> / </span>';
    return (W.learned>0?`<span class="pg-wl">${W.learned}</span>${sep}`:"")+`<span class="pg-ws">${W.started}</span>${sep}<span class="tot">${W.total}</span>`;
  }

  /* ---------- screens ---------- */
  let root,scroller,inner,titleEl,backEl,current=null,model=null;
  function setHead(title,back){
    titleEl.textContent=title;
    backEl.hidden=!back;backEl.onclick=back||null;
  }
  function go(build,dir){
    const next=document.createElement("div");next.className="pg-view";build(next);
    if(current&&dir){
      const old=current;old.classList.add("away",dir==="fwd"?"l":"r");setTimeout(()=>old.remove(),350);
      next.classList.add("away",dir==="fwd"?"r":"l");inner.append(next);
      requestAnimationFrame(()=>requestAnimationFrame(()=>next.classList.remove("away","l","r")));
    }else{if(current)current.remove();inner.append(next)}
    current=next;scroller.scrollTop=0;
  }
  function overview(v){
    const m=model;setHead("Fortschritt",null);
    const up=round(m.gNow)>=round(m.gThen);
    const say=up?"Du wirst besser.":`Auf und Ab gehört zum Lernen.<br>${m.name?esc(m.name)+", du":"Du"} machst das gut.`;
    v.innerHTML=`<div class="pg-card pg-grammar">
        <div class="pg-hero">
          <div class="pg-kick">${m.sinceStart?"Seit Start":"In 3 Wochen"}</div>
          <div class="pg-big"><b>+${m.learned}</b><span>Sachen<br>sitzen jetzt</span></div>
          <div class="pg-say">${say}</div>
          <div class="pg-hs"></div>
        </div>
        <div class="pg-divider"></div>
        <div class="pg-chapters"></div>
        <div class="pg-legend"><span><i style="background:var(--pg-ghost)"></i>${m.sinceStart?"Start":"vor 3 Wochen"}</span><span><i style="background:var(--mint)"></i>dazu</span></div>
      </div>
      <div class="pg-card pg-list pg-words"></div>`;
    v.querySelector(".pg-hs").append(spark(m.gSeries,{labels:false,H:40,end:round(m.gNow)+"%"}));
    // Wortschatz: whole stack · started · fully learned — no drill-down
    const w=v.querySelector(".pg-words"), wr=document.createElement("div");wr.className="pg-row static";
    const W=m.words;
    wr.innerHTML=`<div class="pg-top"><span class="pg-n">Wortschatz</span><span class="pg-d">${W&&W.total?wordCounts(W):""}</span></div>`;
    const tr=document.createElement("div");tr.className="pg-track";tr.innerHTML='<i class="pg-started"></i><i class="pg-fill"></i>';wr.append(tr);w.append(wr);
    if(W&&W.total)wr.insertAdjacentHTML("beforeend",'<div class="pg-legend"><span><i style="background:var(--pg-started)"></i>angefangen</span><span><i style="background:var(--mint)"></i>gelernt</span></div>');
    if(W&&W.total){const go=()=>{tr.children[0].style.width=W.started/W.total*100+"%";setTimeout(()=>tr.children[1].style.width=W.learned/W.total*100+"%",300)};
      reduceMotion?go():requestAnimationFrame(()=>requestAnimationFrame(go))}
    else wr.insertAdjacentHTML("beforeend",'<div class="pg-empty" style="padding:10px 0 0;font-size:13px">Öffne Wortschatz einmal – dann erscheint hier dein Fortschritt.</div>');
    // grammar chapters
    const list=v.querySelector(".pg-chapters");
    m.chapters.forEach((c,i)=>{
      const known=c.subs?c.subs.some(e=>e.known):c.single.known;
      const r=document.createElement("button");r.type="button";r.className="pg-row";
      r.innerHTML=`<div class="pg-top"><span class="pg-n">${c.name}</span><span>${deltaHTML(c,known)}<span class="pg-chev">›</span></span></div>`;
      bar(r,c);r.onclick=()=>go(sc=>chapter(sc,i),"fwd");list.append(r);
    });
  }
  function chapter(v,i){
    const c=model.chapters[i], down=round(c.now)<round(c.then);
    setHead(c.name,()=>go(overview,"back"));
    v.innerHTML=`<div class="pg-title"><span>${model.sinceStart?"Start":"vor 3 Wochen"} ${round(c.then)}% → heute <b class="${down?"down":""}">${round(c.now)}%</b></span></div>
      <div class="pg-card pg-body"></div>`;
    const body=v.querySelector(".pg-body");
    if(c.single){body.append(detail(c.single));return}
    body.style.padding="8px";
    c.subs.forEach(e=>{
      const r=document.createElement("div");r.className="pg-row sub";r.setAttribute("role","button");
      r.innerHTML=`<div class="pg-top"><span class="pg-n">${e.name}</span><span>${deltaHTML(e,e.known)}<span class="pg-chev">›</span></span></div>`;
      bar(r,e);
      const ex=document.createElement("div");ex.className="pg-expand";const inn=document.createElement("div");ex.append(inn);r.append(ex);
      r.onclick=ev=>{
        if(ev.target.closest(".pg-expand"))return;
        const open=!r.classList.contains("open");
        body.querySelectorAll(".pg-row.open").forEach(x=>x.classList.remove("open"));
        if(open){inn.innerHTML="";const d=detail(e);d.style.paddingTop="16px";inn.append(d);r.classList.add("open")}
      };
      body.append(r);
    });
    v.insertAdjacentHTML("beforeend",'<div class="pg-note">Tippe auf eine Übung für Details</div>');
  }

  /* ---------- open / close: pop-up (same style as the Partizip II pattern table) ---------- */
  // Centered card, fades in from 92 % with a short blur; Home dims behind it.
  // Close: × (top right), tap outside the card, or Escape.
  function open(){
    if(root.classList.contains("open"))return;
    try{model=buildModel()}catch(e){console.error(e);return}
    current=null;inner.innerHTML="";go(overview);scroller.scrollTop=0;
    root.getBoundingClientRect();
    root.classList.add("open");root.setAttribute("aria-hidden","false");
  }
  function close(){
    if(!root.classList.contains("open"))return;
    root.classList.remove("open");root.setAttribute("aria-hidden","true");
  }
  function init(){
    root=document.createElement("div");root.className="pg";root.id="progressScreen";root.setAttribute("aria-hidden","true");
    root.innerHTML='<div class="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pgTitle">'
      +'<div class="pg-head"><h2><button class="pg-head-back" type="button" aria-label="Zurück" hidden>‹</button><span id="pgTitle">Fortschritt</span></h2>'
      +'<button class="pg-x" type="button" aria-label="Schließen">×</button></div>'
      +'<div class="pg-body-scroll"><div class="pg-inner"></div></div></div>';
    document.body.append(root);
    scroller=root.querySelector(".pg-body-scroll");inner=root.querySelector(".pg-inner");
    titleEl=root.querySelector("#pgTitle");backEl=root.querySelector(".pg-head-back");
    root.querySelector(".pg-x").addEventListener("click",close);
    root.addEventListener("click",e=>{if(e.target===root)close()});
    const tile=document.querySelector(".tile-today");
    if(tile){
      tile.setAttribute("role","button");tile.setAttribute("tabindex","0");
      tile.addEventListener("click",open);
      tile.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
    }
    window.addEventListener("keydown",e=>{if(e.key==="Escape"&&root.classList.contains("open"))close()});
  }
  window.DeutschProgressScreen={open,close};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
