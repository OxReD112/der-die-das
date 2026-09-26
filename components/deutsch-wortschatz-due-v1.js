/* Deutsch Wortschatz Due v1 — the ONE rule for "how many Wortschatz words are due today".
   Used by Wortschatz (its own status), Home (tile before Wortschatz was opened today)
   and Home's backup restore. Decision: Documentation/DECISIONS.md (2026-09-26).

   Usage:
     <script src="components/deutsch-wortschatz-due-v1.js"></script>   (adjust ../ depth)
     DeutschWortschatzDue.count(state, validIds)  // → { remaining, total }
     DeutschWortschatzDue.status(state, validIds) // → { date, done, remaining, total } or null
     DeutschWortschatzDue.readSaved()             // → saved Wortschatz state or null

   Rules (same as Wortschatz):
   - Only words in the active set count (activeIds). If validIds (a Set of word ids
     from words.js) is given, ids that no longer exist in words.js are ignored.
     Home doesn't load words.js, so it counts without that filter.
   - A word is due if it has no card yet, or its card's due date ("YYYY-MM-DD") is today or earlier.
   - "Today" = local calendar day, taken at 12:00 like Wortschatz's day().
   - status() returns null when there is no active set yet (Wortschatz hasn't been set up),
     so Home keeps showing "noch offen" instead of a wrong "fertig".

   Read-only: this file never writes to localStorage.
   Storage key read: wortsternSRSv03 (owned by Wortschatz). */
(function(){
  var STORE="wortsternSRSv03";

  function today(){
    var d=new Date();d.setHours(12,0,0,0);
    return d.toISOString().slice(0,10);
  }

  function isValidState(s){
    return !!(s && s.cards && typeof s.cards==="object" && Array.isArray(s.activeIds));
  }

  function count(state,validIds){
    if(!isValidState(state))return {remaining:0,total:0};
    var day=today(), seen=new Set(), remaining=0, total=0;
    state.activeIds.forEach(function(id){
      if(seen.has(id))return;
      seen.add(id);
      if(validIds && !validIds.has(id))return;
      total++;
      var card=state.cards[id];
      if(!card || card.due<=day)remaining++;
    });
    return {remaining:remaining,total:total};
  }

  function status(state,validIds){
    var c=count(state,validIds);
    if(c.total===0)return null;
    return {date:today(),done:c.remaining===0,remaining:c.remaining,total:c.total};
  }

  function readSaved(){
    try{
      var saved=JSON.parse(localStorage.getItem(STORE)||"null");
      return isValidState(saved)?saved:null;
    }catch(e){return null}
  }

  window.DeutschWortschatzDue={today:today,count:count,status:status,readSaved:readSaved};
})();
