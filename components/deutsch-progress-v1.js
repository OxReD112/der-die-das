/* Deutsch Progress v1 — shared progress tracking for all grammar exercises.
   Concept: Documentation/PROGRESS_TRACKER.md

   Usage in an exercise:
     <script src="../components/deutsch-progress-v1.js"></script>   (adjust ../ depth)
     DeutschProgress.init("artikel", items);   // items: [{key, label}] — every item of the exercise
     DeutschProgress.record("artikel", key, ok); // after every answer

   Rules:
   - 3 correct in a row → "sicher". Any mistake → streak 0, no longer sicher.
   - An item with no entry = "neu" (never answered); entry below 3 = "wackelig".
   - sicherSince (d) = date the item became sicher; removed when it falls back.
   - Each exercise also keeps a summary for Home: total, sicher, recent (learned in the last 22 days).

   Storage key: deutschProgressV1 (included in Backup).
   {
     format: 1,
     exercises: {
       <exercise>: {
         items:   { <itemKey>: { s: <streak>, d: "YYYY-MM-DD" (only while sicher) } },
         summary: { total, sicher, updated: "YYYY-MM-DD",
                    recent: [ { l: <label>, d: "YYYY-MM-DD" } ]  // newest first }
       }
     }
   }
*/
(function(){
  const KEY="deutschProgressV1";
  const FORMAT=1;
  const SICHER_STREAK=3;
  const RECENT_DAYS=22; // today + 21 days back
  const catalog={};     // exercise -> Map(itemKey -> label), set by init()

  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function daysAgo(n){
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-n);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function load(){
    let data=null;
    try{ data=JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){}
    if(!data||typeof data!=="object"||!data.exercises||typeof data.exercises!=="object"){
      data={format:FORMAT,exercises:{}};
    }
    if(!data.format) data.format=FORMAT;
    return data;
  }
  function save(data){
    try{ localStorage.setItem(KEY,JSON.stringify(data)); }catch(e){}
  }
  function bucket(data,exercise){
    let ex=data.exercises[exercise];
    if(!ex||typeof ex!=="object") ex=data.exercises[exercise]={};
    if(!ex.items||typeof ex.items!=="object") ex.items={};
    return ex;
  }
  // Recount the summary from the current item list (items no longer in the exercise are ignored).
  function summarize(ex,exercise){
    const list=catalog[exercise];
    if(!list) return;
    const since=daysAgo(RECENT_DAYS-1);
    let sicher=0; const recent=[];
    list.forEach((label,key)=>{
      const it=ex.items[key];
      if(it&&it.s>=SICHER_STREAK){
        sicher++;
        if(it.d&&it.d>=since) recent.push({l:label,d:it.d});
      }
    });
    recent.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:0);
    ex.summary={total:list.size,sicher,updated:today(),recent};
  }

  function init(exercise,items){
    const map=new Map();
    (items||[]).forEach(it=>{ if(it&&it.key!=null&&!map.has(String(it.key))) map.set(String(it.key),String(it.label??it.key)); });
    catalog[exercise]=map;
    const data=load(); summarize(bucket(data,exercise),exercise); save(data);
  }

  function record(exercise,key,ok){
    key=String(key);
    const data=load(), ex=bucket(data,exercise);
    const it=ex.items[key]||{s:0};
    if(ok){
      it.s=(it.s||0)+1;
      if(it.s>=SICHER_STREAK&&!it.d) it.d=today();
    }else{
      it.s=0; delete it.d;
    }
    ex.items[key]=it;
    summarize(ex,exercise);
    save(data);
  }

  function summary(exercise){
    const ex=load().exercises[exercise];
    return ex&&ex.summary ? ex.summary : null;
  }

  window.DeutschProgress={init,record,summary,KEY};
})();
