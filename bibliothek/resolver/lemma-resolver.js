/* Dictionary-backed candidates, pronoun clues and separable verb groups. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const formsOf = entry => ({...(entry?.lookup_forms || {}),...(entry?.forms || {})});
  // Step 6: a separator inside a number (8:00, 7,5, 1.000) is part of the
  // number, not a clause boundary for verbal constructions.
  const clauseGapText = text => String(text).replace(/(\p{N})[.,:](?=\p{N})/gu,'$1');
  const posMap = { adj:"Adjektiv", adv:"Adverb", conj:"Konjunktion", pron:"Pronomen", det:"Pronomen", noun:"Nomen", name:"Nomen", verb:"Verb", adjective:"Adjektiv", adverb:"Adverb", conjunction:"Konjunktion", pronoun:"Pronomen", preposition:"prep", numeral:"num" };
  const ownOnlyVerbs = new Set(["haben","sein"]);
  const canonicalPos = value => posMap[value] || value || "";
  // Only identified grammatical classes may supplement an existing own match.
  // Postpositions and external contractions are separate grammatical classes:
  // an own preposition card (nach, über) must not hide them (step 5 block 6).
  const knownPartsOfSpeech = new Set(["Verb","Nomen","Pronomen","Adjektiv","Adverb","Konjunktion",
    "prep","num","intj","particle","article","postp","contraction"]);
  // Card types whose exact dictionary form is not evidence on its own: a
  // preposition spelling is also a separable prefix, adverb or postposition
  // (von Anfang an, über 60 Prozent). Their selection needs context evidence.
  const exactFormNeedsContext = new Set(["preposition"]);
  function savedCandidate(saved, resolution) {
    const exact = resolution.candidates.find(c => window.BibliothekVocabulary.identity(c) === saved);
    if (exact) return exact;
    let identity;
    try { identity = JSON.parse(saved); } catch (_) { return null; }
    if (!Array.isArray(identity)) return null;
    if (identity[0] === "main") return resolution.candidates.find(c => c.item?.alias_ids?.includes(identity[1])) || null;
    if (identity[0] !== "fallback") return null;
    const own = resolution.candidates.filter(c => c.source === "main" &&
      norm(c.lemma) === norm(identity[1]) && canonicalPos(c.pos) === canonicalPos(identity[2]));
    return own.length === 1 ? own[0] : null;
  }
  // Article form features come from the card's own forms table: one rule, no
  // second hand-written copy. Unknown labels, empty cells or a table that
  // disagrees with search_forms are reported as errors, never guessed.
  const articleColumns = Object.freeze({Maskulin:{gender:"masculine",number:"singular"},Feminin:{gender:"feminine",number:"singular"},
    Neutrum:{gender:"neuter",number:"singular"},Plural:{number:"plural"}});
  const articleCases = Object.freeze({Nominativ:"nominative",Akkusativ:"accusative",Dativ:"dative",Genitiv:"genitive"});
  function articleFormFeatures(entry) {
    const features = new Map(), errors = [];
    const tables = Array.isArray(entry?.forms) ? entry.forms : [];
    if (tables.length !== 1) errors.push("expected one forms table");
    for (const table of tables) {
      const columns = (table.columns || []).map(label => articleColumns[label] || (errors.push(`unknown column ${label}`), null));
      for (const [row, cells] of Object.entries(table.rows || {})) {
        const grammaticalCase = articleCases[row];
        if (!grammaticalCase) { errors.push(`unknown row ${row}`); continue; }
        if (!Array.isArray(cells) || cells.length !== columns.length) { errors.push(`bad row ${row}`); continue; }
        cells.forEach((cell, i) => {
          for (const form of String(cell ?? "").split("/").map(value => value.trim())) {
            if (!form) { errors.push(`empty cell ${row}/${i}`); continue; }
            if (form === "—" || !columns[i]) continue;
            const key = norm(form), rows = features.get(key) || [];
            rows.push(Object.freeze({case:grammaticalCase,...columns[i]}));
            features.set(key, rows);
          }
        });
      }
    }
    const search = new Set((entry?.search_forms || []).map(norm));
    for (const form of features.keys()) if (!search.has(form)) errors.push(`table form ${form} not in search_forms`);
    for (const form of search) if (!features.has(form)) errors.push(`search form ${form} not in table`);
    return {features, errors};
  }
  function calendarDateLength(word,tail) {
    if(!['am','zum'].includes(norm(word)))return 0;
    const date=String(tail).match(/^[ \t]+([1-9]|[12][0-9]|3[01])\.[ \t]+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?=$|[^\p{L}\p{M}])/u);
    if(!date)return 0;
    const limit={Februar:29,April:30,Juni:30,September:30,November:30}[date[2]]||31;
    return Number(date[1])<=limit?date[0].length:0;
  }
  // Context tokens retain the old regexp-match shape for rule adapters.
  // Indices/offsets always refer to the unchanged UTF-16 source string.
  const tokenOffsets = new WeakMap();
  function contextToken(word, offset, sentence, id) {
    const token = [word];
    Object.assign(token, {index:offset,input:sentence,groups:undefined});
    Object.defineProperty(token, 'tokenId', {value:id});
    return Object.freeze(token);
  }
  function buildSentenceContext(sentence, source = null) {
    let tokens, derived=false;
    if (source && source.sentence.length === sentence.length &&
        source.tokens.every(t => sentence.slice(t.index,t.index+t[0].length) === t[0] ||
          /^\s+$/u.test(sentence.slice(t.index,t.index+t[0].length)))) {
      derived=true;
      // Scoped masking only removes complete tokens; stable IDs survive filtering.
      tokens = source.tokens.filter(t => sentence.slice(t.index,t.index+t[0].length) === t[0])
        .map(t => contextToken(t[0],t.index,sentence,t.tokenId));
    } else {
      tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)]
        .map((t,id) => contextToken(t[0],t.index,sentence,id));
    }
    Object.freeze(tokens);
    tokenOffsets.set(tokens,new Map(tokens.map((t,i)=>[t.index,i])));
    const gaps = [];let end=0;
    for (const t of tokens) {
      const text=sentence.slice(end,t.index);
      gaps.push(Object.freeze({start:end,end:t.index,text,
        punctuation:text.replace(/[\s\p{N}]/gu,''),
        boundary:/[;:.!?]/u.test(text)?'confirmed':/[,\n\r]/u.test(text)?'possible':'none',
        evidence:'punctuation-only; rule-specific guards remain in adapters'}));
      end=t.index+t[0].length;
    }
    const text=sentence.slice(end);
    gaps.push(Object.freeze({start:end,end:sentence.length,text,
      punctuation:text.replace(/[\s\p{N}]/gu,''),
      boundary:/[;:.!?]/u.test(text)?'confirmed':/[,\n\r]/u.test(text)?'possible':'none',
      evidence:'punctuation-only; rule-specific guards remain in adapters'}));
    return Object.freeze({sentence,tokens,gaps:Object.freeze(gaps),
      tokenizer:'resolver-letters-v1',derived});
  }
  function clickedTokenIndex(tokens, offset, word, exact = false) {
    const index=tokenOffsets.get(tokens)?.get(offset);
    if (index === undefined) return -1;
    return (exact ? tokens[index][0] === word : norm(tokens[index][0]) === norm(word)) ? index : -1;
  }
  // Reader adapter merges only the apostrophes already accepted by the reader.
  // It derives segments from the same source tokens, without another word scan.
  function readerSegments(sentence) {
    sentence=String(sentence || '');
    const {tokens}=buildSentenceContext(sentence),segments=[];let end=0;
    for(let i=0;i<tokens.length;i++) {
      const start=tokens[i].index;
      if(start>end)segments.push(sentence.slice(end,start));
      end=start+tokens[i][0].length;
      while(i+1<tokens.length && /^[’']$/u.test(sentence.slice(end,tokens[i+1].index))) {
        i++;end=tokens[i].index+tokens[i][0].length;
      }
      segments.push(sentence.slice(start,end));
    }
    if(end<sentence.length)segments.push(sentence.slice(end));
    return segments.length?segments:[sentence];
  }
  // Shared-analysis step 5: selection core. Producers (ranking functions,
  // constructions, noun hypotheses, late rules) only propose; this table is
  // the single place that turns proposals into a decision. Row order is the
  // priority (see Documentation/QA/Shared_Analysis_Step5_2026-10-10/selection-contract.md).
  //   initial  - rows checked in order; decisive rows and active blocks stop,
  //              a preference stops only when it names a candidate;
  //   fill     - may only fill an empty selection, never replace one;
  //   override - a proven construction replaces the whole decision;
  //   late     - adds candidates after the decision, never selects.
  // Tentative and display-only evidence never selects; saved user choices
  // are applied by the reader after this module.
  const selectionRules = Object.freeze([
    {id:'nominalized-person',stage:'initial',kind:'decisive'},
    {id:'nominalized-noun',stage:'initial',kind:'decisive'},
    {id:'grammar-blocked',stage:'initial',kind:'block'},
    {id:'lexicon-convention',stage:'initial',kind:'preference'},
    {id:'reflexive-subject',stage:'initial',kind:'preference'},
    // Contextual group: readings of sein / ihr from their clause.
    {id:'possessive-before-noun',stage:'initial',kind:'preference',group:'contextual'},
    {id:'sein-after-predicate-or-modal',stage:'initial',kind:'preference',group:'contextual'},
    {id:'sein-clause-final-after-modal',stage:'initial',kind:'preference',group:'contextual'},
    {id:'ihr-dative-object',stage:'initial',kind:'preference',group:'contextual'},
    {id:'ihr-next-to-plural-verb',stage:'initial',kind:'preference',group:'contextual'},
    {id:'ihr-dative-verb',stage:'initial',kind:'preference',group:'contextual'},
    {id:'single-construction',stage:'initial',kind:'preference'},
    {id:'separated-verb',stage:'initial',kind:'preference'},
    {id:'clause-position',stage:'initial',kind:'preference'},
    {id:'predicative-comparative',stage:'initial',kind:'preference'},
    {id:'closed-class-exact-form',stage:'initial',kind:'preference'},
    // Grammar group (step 8): the first row of the group that settles is the
    // group's only proposal; shared rows read sentence-level facts.
    {id:'shared-finite-subject',stage:'initial',kind:'preference',group:'grammar',shared:true},
    {id:'shared-nominal-group',stage:'initial',kind:'preference',group:'grammar',shared:true},
    {id:'attributive-agreement',stage:'initial',kind:'preference',group:'grammar'},
    {id:'separate-senses',stage:'initial',kind:'preference',group:'grammar'},
    {id:'derived-weak-attributive',stage:'initial',kind:'preference',group:'grammar'},
    {id:'internal-capital-noun',stage:'initial',kind:'preference',group:'grammar'},
    {id:'sentence-initial-noun-in-clause',stage:'initial',kind:'preference',group:'grammar'},
    {id:'sentence-initial-finite-verb',stage:'initial',kind:'preference',group:'grammar'},
    {id:'object-predicative-adjective',stage:'initial',kind:'preference',group:'grammar'},
    {id:'lexical-adverb-modifier',stage:'initial',kind:'preference',group:'grammar'},
    {id:'predicate-complement-choice',stage:'initial',kind:'preference',group:'grammar'},
    {id:'temporal-adverb',stage:'initial',kind:'preference',group:'grammar'},
    {id:'adverbial-verb-modifier',stage:'initial',kind:'preference',group:'grammar'},
    {id:'predicative-adjective',stage:'initial',kind:'preference',group:'grammar'},
    {id:'lowercase-adjective-over-noun',stage:'initial',kind:'preference',group:'grammar'},
    {id:'sentence-initial-adjective-noun',stage:'initial',kind:'preference',group:'grammar'},
    {id:'noun-after-determiner',stage:'initial',kind:'preference',group:'grammar'},
    {id:'infinitive-in-modal-group',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-with-accusative-object',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-with-dative-complement',stage:'initial',kind:'preference',group:'grammar'},
    {id:'auxiliary-and-participle',stage:'initial',kind:'preference',group:'grammar'},
    {id:'finite-verb-with-subject',stage:'initial',kind:'preference',group:'grammar'},
    {id:'finite-verb-with-noun-subject',stage:'initial',kind:'preference',group:'grammar'},
    {id:'validated-finite-form',stage:'initial',kind:'preference',group:'grammar'},
    {id:'exact-form',stage:'initial',kind:'preference'},
    {id:'single-candidate',stage:'initial',kind:'fallback'},
    {id:'attributive-or-graded-adjective',stage:'fill',requires:['no-nominalization','no-choice-block']},
    {id:'article-in-noun-group',stage:'fill',requires:['no-nominalization','no-choice-block']},
    {id:'der-pronoun-role',stage:'fill',requires:['no-nominalization','no-choice-block']},
    {id:'subordinate-clause',stage:'fill',requires:['no-choice-block']},
    {id:'preposition-government',stage:'fill',requires:['no-choice-block']},
    {id:'contraction-or-superlative',stage:'override'},
    {id:'article-noun-agreement',stage:'fill',requires:['no-tentative-construction']},
    {id:'adjectival-noun-agreement',stage:'fill',requires:['no-tentative-construction']},
    {id:'participle-base',stage:'late'}
  ].map(rule => Object.freeze(rule)));
  // The evidence label keeps its own precedence (unchanged from step 4); the
  // deciding row is reported separately in decision.rule.
  const selectionEvidenceOrder = Object.freeze(['reflexive-reciprocal-choice','nominalized-person','nominalized-noun',
    'reflexive-subject','contextual','separated-verb','clause-position','predicative-comparative','closed-class-exact-form','grammar']);
  // Block 9: closed word classes and the grammar-rank evidence that only shows a
  // possible form of another word (no subject, no capital) — data, not word lists.
  const closedWordClasses = new Set(["Adverb","prep","Konjunktion","article","Pronomen","num","particle"]);
  const formOnlyEvidence = Object.freeze({"validated-finite-form":{pos:"Verb"},"noun-after-determiner":{pos:"Nomen",lowercaseOnly:true},
    // Step 8: attributive agreement proves a modifier role, which an own
    // declinable determiner or ordinal card (andere, einige, erste) has as well.
    "shared-nominal-group-agreement":{pos:"Adjektiv",closedPos:["Pronomen","num"]},
    "attributive-modifier-agreement":{pos:"Adjektiv",closedPos:["Pronomen","num"]}});
  const blockingReasons = new Set(['grammar-blocked','derived-only','reflexive-unconfirmed','tentative-construction','no-candidates']);
  function startSelection({candidates, proposals, choiceBlocks = [], derivedOnly = false, covered = []}) {
    const identity = c => window.BibliothekVocabulary.identity(c);
    const rules = new Map(selectionRules.map(rule => [rule.id,rule]));
    const trace = [];
    let preferred = null, decisive = null, blocked = null, winner = null;
    for (const rule of selectionRules) {
      if (rule.stage !== 'initial' || rule.kind === 'fallback') continue;
      const proposal = proposals[rule.id];
      if (!proposal) continue;
      if (rule.kind === 'decisive') {
        decisive = winner = rule.id; preferred = proposal.candidate || null;
        trace.push({rule:rule.id,stage:'initial',result:preferred ? 'preferred' : 'decisive-without-candidate'}); break;
      }
      if (rule.kind === 'block') {
        if (proposal.active) { blocked = rule.id; trace.push({rule:rule.id,stage:'initial',result:'blocked'}); break; }
        continue;
      }
      if (proposal.candidate) { preferred = proposal.candidate; winner = rule.id; trace.push({rule:rule.id,stage:'initial',result:'preferred'}); break; }
    }
    // Diagnostics only: rows that name a different card than the deciding row
    // (data for revisiting the row order; never changes the decision).
    const named = selectionRules.filter(rule => rule.stage === 'initial' && proposals[rule.id]?.candidate)
      .map(rule => ({rule:rule.id,identity:identity(proposals[rule.id].candidate)}));
    const reference = winner && proposals[winner]?.candidate ? identity(proposals[winner].candidate) : named[0]?.identity;
    const conflicts = named.filter(row => row.identity !== reference).map(row => ({...row,against:winner || named[0].rule}));
    const activeBlocks = choiceBlocks.filter(block => block.active);
    if (preferred?.construction?.confidence === 'tentative' || activeBlocks.length) {
      if (preferred) trace.push({rule:winner,stage:'initial',result:'withdrawn',
        reason:preferred.construction?.confidence === 'tentative' ? 'tentative-construction' : activeBlocks[0].id});
      preferred = null;
    }
    if (preferred) candidates = [preferred,...candidates.filter(c => c !== preferred)];
    const needsChoice = activeBlocks.some(block => block.requiresChoice);
    const single = candidates.length === 1 ? candidates[0] : null;
    let selected = null, rule = null, reason = null;
    if (needsChoice) reason = activeBlocks.find(block => block.requiresChoice).id;
    else if (decisive === 'nominalized-person') { selected = preferred; rule = preferred ? decisive : null; reason = preferred ? decisive : 'ambiguous-nominalized-person'; }
    else if (decisive === 'nominalized-noun') { selected = proposals[decisive].candidate; rule = reason = decisive; }
    else if (blocked) reason = blocked;
    else if (derivedOnly && !preferred) reason = 'derived-only';
    else if (single) {
      if (single.reflexiveUnconfirmed) reason = 'reflexive-unconfirmed';
      else if (single.construction?.confidence === 'tentative') reason = 'tentative-construction';
      else { selected = single; rule = reason = preferred === single && winner ? winner : 'single-candidate'; }
    } else { selected = preferred; rule = preferred ? winner : null; reason = preferred ? winner : candidates.length ? 'no-evidence' : 'no-candidates'; }
    if (rule === 'single-candidate') trace.push({rule,stage:'initial',result:'selected'});
    const sources = {...proposals,...Object.fromEntries(choiceBlocks.map(block => [block.id,block]))};
    let evidence;
    const groupRows = group => selectionRules.filter(row => row.group === group);
    const source = id => ['grammar','contextual'].includes(id) ? groupRows(id).map(row => sources[row.id]).find(Boolean) : sources[id];
    for (const id of selectionEvidenceOrder) { evidence = source(id)?.evidence; if (evidence) break; }
    // Without a label the resolution reports null (the grammar group always answers).
    evidence ||= null;
    const status = selected && candidates.length === 1 ? 'resolved' : candidates.length ? 'ambiguous' : 'unresolved';
    const state = {rule,reason};
    const choose = (resolution,id,candidate,label) => {
      resolution.selected = resolution.preferred = candidate;
      resolution.evidence = label;
      resolution.candidates = [candidate,...resolution.candidates.filter(c => identity(c) !== identity(candidate))];
      state.rule = state.reason = id;
      trace.push({rule:id,stage:rules.get(id).stage,result:'selected'});
    };
    return {candidates,preferred,selected,evidence,status,
      canFill(id,resolution) {
        const row = rules.get(id);
        if (row?.stage !== 'fill' || resolution.selected) return false;
        return (row.requires || []).every(requirement =>
          requirement === 'no-nominalization' ? !decisive :
          requirement === 'no-choice-block' ? !needsChoice :
          requirement === 'no-tentative-construction' ? !resolution.candidates.some(c => c.construction?.confidence === 'tentative') : false);
      },
      fill(resolution,id,candidate,label) {
        if (!this.canFill(id,resolution) || !candidate) return false;
        choose(resolution,id,candidate,label);
        return true;
      },
      override(resolution,id,result) {
        Object.assign(resolution,result,{preferred:result.selected,status:result.selected ? 'resolved' : 'ambiguous'});
        state.rule = result.selected ? id : null; state.reason = result.selected ? id : result.evidence || id;
        trace.push({rule:id,stage:'override',result:result.selected ? 'selected' : 'needs-choice'});
      },
      canAppend(resolution) { return !resolution.selected; },
      appendLate(resolution,id,candidate) {
        resolution.candidates.push(candidate);
        resolution.status = 'ambiguous';
        trace.push({rule:id,stage:'late',result:'candidate-added'});
      },
      finish(resolution) {
        const selectedIdentity = resolution.selected ? identity(resolution.selected) : null;
        const outcome = resolution.selected ? 'selected' :
          !resolution.candidates.length || blockingReasons.has(state.reason) ? 'blocked' : 'needs-choice';
        // Diagnostic explanation only: non-enumerable so equality checks,
        // copies and storage of the resolution stay exactly as before.
        const decision = {outcome,rule:resolution.selected ? state.rule : null,
          reason:resolution.candidates.length ? state.reason : 'no-candidates',trace:trace.map(row => ({...row})),
          conflicts:conflicts.map(row => ({...row})),
          rejected:resolution.candidates.filter(c => identity(c) !== selectedIdentity).map(c => ({identity:identity(c),lemma:c.lemma,pos:c.pos,
            reason:resolution.selected ? `lower-priority:${state.rule}` : state.reason})),
          covered:covered.map(({candidate:c,rule}) => ({identity:identity(c),lemma:c.lemma,pos:c.pos,reason:`covered-by-own:${rule}`}))};
        Object.defineProperty(resolution,'decision',{value:decision,enumerable:false,writable:true,configurable:true});
        return decision;
      }};
  }
  const selectionCore = Object.freeze({rules:selectionRules,evidenceOrder:selectionEvidenceOrder,start:startSelection});
  function create(entries, fallback, {diagnostics = window.BibliothekAnalysisDiagnostics} = {}) {
    // Optional observation only. Sink failures must never affect dictionary decisions.
    const diagnosticNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
    const diagnosticPending = diagnostics ? new WeakSet() : null;
    let diagnosticSequence = 0;
    const diagnosticActive = diagnostics ? new Set() : null;
    function observe(type, detail = {}) {
      if (typeof diagnostics !== 'function') return;
      try { diagnostics({component:'resolver',type,time:diagnosticNow(),activeResolutions:[...diagnosticActive],...detail}); } catch (_) {}
    }
    function observePending(pending) {
      if (!diagnosticPending) return;
      diagnosticPending.add(pending);
      pending.then(() => diagnosticPending.delete(pending), () => diagnosticPending.delete(pending));
    }
    function observeCache(cache, key, consumer, word) {
      if (!diagnostics) return;
      observe('lookup-cache', {consumer,key,word,size:cache.size,
        state:!cache.has(key) ? 'miss' : diagnosticPending.has(cache.get(key)) ? 'pending' : 'hit'});
    }
    function observedMatches(matches, consumer) {
      if (!diagnostics) return matches;
      const tokenization = ++diagnosticSequence;
      observe('special-scan', {consumer,tokenization,count:null,iterator:true});
      return (function* () {
        let index = 0;
        for (const match of matches) {
          observe('token-iteration', {consumer,tokenization,index:index++});
          yield match;
        }
      })();
    }
    function observedTokens(tokens, consumer) {
      if (!diagnostics) return tokens;
      const tokenization = ++diagnosticSequence;
      observe('tokenization', {consumer,tokenization,count:tokens.length});
      // Numeric reads count actual array accesses, not loop iterations or grammar evidence.
      // Out-of-range probes are recorded separately and never counted as visited tokens.
      return new Proxy(tokens, {get(target, key, receiver) {
        if (typeof key === 'string' && /^(?:0|[1-9][0-9]*)$/.test(key))
          observe('token-read', {consumer,tokenization,index:Number(key),inRange:Number(key)<target.length});
        return Reflect.get(target,key,receiver);
      }});
    }

    // Per-resolver bounded LRU. Source text and tokenizer mode are the key;
    // contexts hold no dictionary/morphology results and die on resolver rebuild.
    const contextCache = new Map(), activeContexts = new Map();
    const contextEntryLimit=32, contextCharacterLimit=131072, contextTokenLimit=4096;
    let contextCharacters=0, contextTokenCount=0;
    function sentenceContext(value, source = null) {
      const sentence=String(value || '');
      if(source) {
        if(sentence===source.sentence)return source;
        const owner=activeContexts.get(source.sentence);
        if(owner?.views.has(sentence))return owner.views.get(sentence);
        const view=buildSentenceContext(sentence,source);
        observe(view.derived?'context-view':'tokenization',{consumer:'sentenceContext',count:view.tokens.length,
          mode:view.tokenizer,sourceLength:sentence.length});
        if(owner)owner.views.set(sentence,view);
        return view;
      }
      if(activeContexts.has(sentence))return activeContexts.get(sentence).context;
      if(contextCache.has(sentence)) {
        const cached=contextCache.get(sentence);contextCache.delete(sentence);contextCache.set(sentence,cached);
        observe('context-cache',{state:'hit',size:contextCache.size,characters:contextCharacters});
        return cached;
      }
      const context=buildSentenceContext(sentence,source);
      observe(context.derived?'context-view':'tokenization', {consumer:'sentenceContext',count:context.tokens.length,
        mode:context.tokenizer,sourceLength:sentence.length});
      if(sentence.length<=contextCharacterLimit && context.tokens.length<=contextTokenLimit) {
        while(contextCache.size>=contextEntryLimit || contextCharacters+sentence.length>contextCharacterLimit || contextTokenCount+context.tokens.length>contextTokenLimit) {
          const key=contextCache.keys().next().value;contextTokenCount-=contextCache.get(key).tokens.length;contextCache.delete(key);contextCharacters-=key.length;
        }
        contextCache.set(sentence,context);contextCharacters+=sentence.length;contextTokenCount+=context.tokens.length;
      }
      observe('context-cache',{state:'miss',size:contextCache.size,characters:contextCharacters});
      return context;
    }
    function sharedTokens(sentence,consumer,source=null) {
      const context=sentenceContext(sentence,source);
      observe('context-use',{consumer,count:context.tokens.length,derived:context.derived});
      if(!diagnostics)return context.tokens;
      // Keep numeric-read diagnostics, but do not report reuse as tokenization.
      const tokens=new Proxy(context.tokens,{get(target,key,receiver){
        if(typeof key==='string' && /^(?:0|[1-9][0-9]*)$/.test(key))
          observe('token-read',{consumer,index:Number(key),inRange:Number(key)<target.length,shared:true});
        return Reflect.get(target,key,receiver);
      }});
      tokenOffsets.set(tokens,tokenOffsets.get(context.tokens));return tokens;
    }
    function rangeTokens(sentence,start,end,consumer) {
      const context=sentenceContext(sentence),text=sentence.slice(start,end);
      const tokens=context.tokens.filter(t=>t.index>=start&&t.index+t[0].length<=end)
        .map(t=>contextToken(t[0],t.index-start,text,t.tokenId));
      observe('context-range',{consumer,start,end,count:tokens.length});
      return Object.freeze(tokens);
    }

    const forms = new Map(), lemmas = new Map(), zuForms = new Map(), separatedForms = new Map(), byId = new Map(entries.map(entry => [String(entry.id),entry]));
    // Lexical discovery is dictionary-driven; contextual confirmation is separate.
    const reflexivePronouns = new Set(["mich","mir","dich","dir","sich","uns","euch"]);
    const reflexiveEntries = new Set(entries.filter(e => e.type === "Verb" && /^sich\s+/u.test(norm(e.word))));
    const reflexiveLemmas = new Map();
    for (const entry of reflexiveEntries) {
      const base = norm(entry.word).replace(/^sich\s+/u, "");
      const rows = reflexiveLemmas.get(base) || [];
      rows.push(entry); reflexiveLemmas.set(base, rows);
    }
    const reflexiveForms = new Map();
    const verbAnalyses = new Map(), separableBases = new Map();
    const modalLemmas = new Set(["können","müssen","dürfen","sollen","wollen","mögen"]);
    function addAnalysis(form, row) {
      const key = norm(form), rows = verbAnalyses.get(key) || [];
      if (!rows.some(r => r.entry === row.entry && r.kind === row.kind && r.person === row.person && r.tense === row.tense && r.detached === row.detached)) rows.push(row);
      verbAnalyses.set(key, rows);
    }
    function indexVerb(entry) {
      const base = norm(entry.word).replace(/^sich\s+/u,""), phrase = base.split(/\s+/u);
      const common = {entry,base,compound:phrase.length > 1 ? phrase.slice(0,-1) : []};
      const table = formsOf(entry);
      let prefix = entry.separable_prefix || null;
      for (const [tense,group] of Object.entries(table)) for (const [person,value] of Object.entries(group || {})) {
        const parts = norm(value).replace(/[.!?]+$/u,"").split(/\s+/u), stem = parts[0];
        if (!/^[\p{L}\p{M}]+$/u.test(stem)) continue;
        const tail = parts.at(-1);
        const detached = parts.length > 1 && !reflexivePronouns.has(tail) && tail !== "sie" && phrase.length === 1 && base.startsWith(tail);
        if (detached) prefix = tail;
        const row = {...common,person:person === "Sie" ? "sie" : person,kind:tense === "Imperativ" ? "imperative" : "finite",tense,prefix:detached ? tail : null,detached};
        addAnalysis(stem,row);
        if (detached && tense !== "Imperativ") addAnalysis(tail+stem,{...row,detached:false});
        // Dictionary-backed regular short imperatives; do not invent irregular stems.
        if (tense === "Präsens" && person === "ich" && stem.endsWith("e")) {
          const second = norm(group.du).split(/\s+/u)[0].replace(/(?:est|st|t)$/u,"");
          if (second === stem.slice(0,-1) && !/[dt]$/u.test(second)) addAnalysis(stem.slice(0,-1),{...row,person:"du",kind:"imperative",tense:"Imperativ"});
        }
        if (tense === "Präsens" && person === "ihr") addAnalysis(stem,{...row,kind:"imperative",tense:"Imperativ"});
      }
      const infinitive = phrase.at(-1);
      addAnalysis(infinitive,{...common,kind:"infinitive",tense:"Infinitiv",prefix:null,detached:false});
      if (prefix && phrase.length === 1) addAnalysis(prefix+"zu"+base.slice(prefix.length),{...common,kind:"infinitive",tense:"Infinitiv",zu:true,detached:false});
      const participle = norm(entry.perfect_form).split(/\s+/u).at(-1);
      if (participle) addAnalysis(participle,{...common,kind:"participle",tense:"Partizip II",detached:false});
    }
    function addReflexive(form,row) {
      const key = norm(form), rows = reflexiveForms.get(key) || [];
      if (!rows.some(r => r.entry === row.entry && r.person === row.person && r.pronoun === row.pronoun && r.tense === row.tense)) rows.push(row);
      reflexiveForms.set(key,rows);
    }
    // Derived modifiers are not exact verb forms: keep their role separate from
    // the dictionary identity, and require nominal context before choosing them.
    const modifiers = new Map(), endings = ["e","en","em","er","es"];
    function addModifier(stem, entry, kind) {
      if (!/^[\p{L}\p{M}]+$/u.test(stem)) return;
      for (const ending of endings) {
        const key = norm(stem + ending), rows = modifiers.get(key) || [];
        if (!rows.some(row => row.entry.id === entry.id && row.kind === kind && row.ending === ending))
          rows.push({entry,kind,ending,base:stem});
        modifiers.set(key,rows);
      }
    }
    function add(map, form, entry) {
      const key = norm(form);
      if (!key) return;
      const matches = map.get(key) || [];
      if (!matches.some(item => item.id === entry.id)) matches.push(entry);
      map.set(key, matches);
    }
    for (const entry of entries) {
      for (const id of entry.alias_ids || []) byId.set(String(id),entry);
      add(lemmas, entry.word, entry); add(forms, entry.word, entry);
      for (const form of entry.search_forms || []) add(forms, form, entry);
      if (entry.type === "Adjektiv") {
        const word = norm(entry.word);
        // Invariant colour/loan adjectives do not acquire regular endings.
        if (!new Set(["rosa","lila","prima","extra","super","gratis","klasse"]).has(word)) {
          const stem = word === "hoch" ? "hoh" : word.endsWith("e") ? word.slice(0,-1) : word;
          addModifier(stem,entry,"adjective");
          if (word.endsWith("el")) addModifier(word.slice(0,-2)+"l",entry,"adjective");
          if (["teuer","sauer"].includes(word)) addModifier(word.slice(0,-2)+"r",entry,"adjective");
        }
        if (entry.comparative) addModifier(norm(entry.comparative),entry,"comparative");
        if (entry.superlative) addModifier(norm(entry.superlative).replace(/^am /u,"").replace(/en$/u,""),entry,"superlative");
      }
      if (entry.type === "Nomen" && entry.plural && entry.plural !== "—") {
        for (const plural of entry.plural.split(/\s*,\s*/)) {
          add(forms, plural, entry);
          if (/^[\p{L}\p{M}]+$/u.test(plural) && !/[ns]$/iu.test(plural)) add(forms, plural + "n", entry);
        }
      }
      if (entry.type === "Verb") {
        indexVerb(entry);
        if (reflexiveEntries.has(entry)) {
          for (const [tense,group] of Object.entries(formsOf(entry))) for (const [person,form] of Object.entries(group || {})) {
            const parts = norm(form).replace(/[.!?]+$/u, "").split(/\s+/u);
            const pronoun = parts.find(part => reflexivePronouns.has(part));
            if (pronoun && /^[\p{L}\p{M}]+$/u.test(parts[0])) {
              const row = {entry,tense,person,pronoun,simple:parts.length === 2};
              addReflexive(parts[0],row);
              // A dictionary-backed detached prefix also proves its joined form.
              const base = norm(entry.word).replace(/^sich\s+/u, "");
              const prefix = parts.at(-1);
              if (parts.length === 3 && parts[1] === pronoun && base.startsWith(prefix) && !base.includes(" "))
                addReflexive(prefix + parts[0],{...row,simple:false});
            }
          }
          addReflexive(norm(entry.word).replace(/^sich\s+/u,""),{entry,tense:"Infinitiv"});
          const participle = String(entry.perfect_form || "").trim().split(/\s+/u).pop();
          if (participle) addReflexive(participle,{entry,tense:"Partizip II"});
        }
        const provenPrefixes = new Set(entry.separable_prefix ? [entry.separable_prefix] : []);
        for (const [tense,group] of Object.entries(formsOf(entry))) {
          for (const form of Object.values(group || {})) {
            // Do not index a separated verb's stem as the whole verb.
            const clean = String(form).replace(/[.!?]+$/g, "").trim();
            if (/^[\p{L}\p{M}]+$/u.test(clean)) add(forms, clean, entry);
            const parts = clean.split(/\s+/);
            if (parts.length === 2 && parts.every(part => /^[\p{L}\p{M}]+$/u.test(part)) &&
              !entry.word.includes(" ") && norm(entry.word).startsWith(norm(parts[1]))) {
              const stem = norm(parts[0]), prefix = norm(parts[1]);
              provenPrefixes.add(prefix);
              const pairs = separatedForms.get(stem) || [];
              if (!pairs.some(pair => pair.entry.id === entry.id && pair.prefix === prefix)) pairs.push({entry,prefix});
              separatedForms.set(stem,pairs);
              if (tense !== "Imperativ") add(forms,prefix + stem,entry);
            }
          }
        }
        for (const prefix of provenPrefixes) {
          if (norm(entry.word).startsWith(prefix)) {
            const zuForm = prefix + "zu" + norm(entry.word).slice(prefix.length);
            add(forms,zuForm,entry); add(zuForms,zuForm,entry);
          }
        }
        // Reviewed form from the Vielseitige Verben table: passive uses
        // worden; ordinary becoming retains geworden.
        if (norm(entry.word) === "werden") add(forms,"worden",entry);
        const participle = String(entry.perfect_form || "").trim().split(/\s+/).pop();
        if (participle) add(forms, participle, entry);
        if (participle) addModifier(participle,entry,"participle-II");
        const infinitive = norm(entry.word);
        if (/^[\p{L}\p{M}]+(?:en|eln|ern)$/u.test(infinitive) || ["sein","tun"].includes(infinitive))
          addModifier(({sein:"seiend",tun:"tuend"})[infinitive] || infinitive+"d",entry,"participle-I");
      }
    }
    const mainCandidate = item => item.importedSeparable ? {
      source:"fallback",lemma:item.word,pos:"verb",posLabel:"Verb",meanings:item.meanings,
      translation:{en:item.meanings.join("; "),ru:""}
    } : ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, posLabel:item.parts_of_speech?.join(" / ") || item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item,
      ...(reflexiveEntries.has(item) ? {reflexiveLexical:{baseLemma:norm(item.word).replace(/^sich\s+/u,""),evidence:"dictionary-reflexive-lemma"}} : {}) });
    const grammaticalWords = new Set(['ich','du','er','sie','es','wir','ihr','man','wer','mich','mir','dich','dir','sich','uns','euch','der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','zu','und','oder','aber','denn','sondern','doch','weil','dass','wenn','ob','als','bevor','nachdem']);
    // Preposition + article contractions come from the preposition cards
    // (german-prepositions.json, field contractions): one source for every rule.
    const contractionForms = Object.freeze(Object.fromEntries(entries.filter(e => e.type === "preposition")
      .flatMap(e => Object.entries(e.contractions || {}).map(([short,full]) => [norm(short),norm(full).split(/\s+/u)]))));
    const contractionArticle = form => contractionForms[norm(form)]?.[1];
    // Prepositions whose standard pre-noun government includes the dative
    // (single-case and two-way), read from the cards' government records.
    const dativePrepositions = new Set(entries.filter(e => e.type === "preposition" && (e.government || []).some(g =>
      g.case === "Dativ" && g.position === "before" && g.status === "standard" && !g.combined_with)).map(e => norm(e.word)));
    // Preposition spellings (and their contractions) come from the preposition cards.
    const prepositions = new Set([...entries.filter(e => e.type === "preposition").flatMap(e => [e.word,...(e.search_forms || [])].map(norm)),
      ...Object.keys(contractionForms)]);
    const grammarCache = new Map();
    let lookupFailures = 0, morphologyEpoch = 0;
    const sourceSpelling = word => String(word || '').normalize('NFC').trim();
    const sourceVersion = () => String(fallback.version ?? fallback.dictionaryVersion ?? 'resolver-instance');
    let retainedSourceVersion = sourceVersion();
    function syncSourceVersion() {
      const version=sourceVersion();
      if(version===retainedSourceVersion)return;
      retainedSourceVersion=version;
      sourceFacts.clear();morphologyFacts.clear();verbFacts.clear();
      readerProbes.clear();clearPartialSources();
      grammarCache.clear();nounFrames.clear();separableNounEvidence.clear();separableDiscoveryCache.clear();
      observe('fact-invalidation',{reason:'source-version',version});
    }
    const incompleteGroups = new WeakSet();
    const groupSourceStates = new WeakMap(), morphologySourceStates = new WeakMap();
    const partialSources = new Map();let partialBytes = 0, sourceActivation = 0;
    function clearPartialSources() {partialSources.clear();partialBytes=0;}
    function temporarySource(key, row, activation) {
      if (!activeContexts.size || activation !== sourceActivation) return;
      let bytes;
      try {
        bytes=JSON.stringify([key,row.groups ? [row.groups,groupSourceStates.get(row.groups)] :
          [row.error,String(row.error?.message || row.error),String(row.error?.stack || '')]]).length*2;
      } catch (_) {return;}
      if(bytes>1024*1024)return;
      const previous=partialSources.get(key);
      if(previous){partialBytes-=previous.bytes;partialSources.delete(key);}
      while(partialSources.size>=64 || partialBytes+bytes>1024*1024) {
        const oldest=partialSources.keys().next().value;partialBytes-=partialSources.get(oldest).bytes;partialSources.delete(oldest);
      }
      if(!partialSources.has(key)){partialSources.set(key,{...row,bytes,activation});partialBytes+=bytes;}
    }
    // A provenance ledger preserves the existing membership guard without
    // storing a second copy of dictionary results.
    const readerProbes = new Map();
    const readerProbeAvailable = word => readerProbes.get(norm(word))?.version === sourceVersion();
    const dictionaryObjects = new WeakSet(entries);
    function copyFacts(value) {
      if (!value || typeof value !== 'object' || dictionaryObjects.has(value)) return value;
      if (Array.isArray(value)) return value.map(copyFacts);
      return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, copyFacts(v)]));
    }
    function freezeFacts(value) {
      if (!value || typeof value !== 'object' || dictionaryObjects.has(value) || Object.isFrozen(value)) return value;
      for (const child of Object.values(value)) freezeFacts(child);
      return Object.freeze(value);
    }
    function factStore(name, limits) {
      const pending = new Map(), ready = new Map();
      let bytes = 0, peakPending = 0, peakBytes = 0, epoch = 0;
      const remove = key => { const row = ready.get(key); if (row) { bytes -= row.bytes; ready.delete(key); } };
      function retain(key, value, priority, valid, generation) {
        if (!valid || generation !== epoch) return;
        const size = JSON.stringify([value,groupSourceStates.get(value) || morphologySourceStates.get(value) || null]).length * 2 + key.length * 2;
        if (size > limits.bytes) return;
        remove(key);
        const samePriority = () => [...ready.values()].filter(r => r.priority === priority).length;
        while (samePriority() >= limits[priority] || bytes + size > limits.bytes) {
          // Grammar admission cannot evict the reader's working set.
          const victim = [...ready].find(([, r]) => priority === 'reader' || r.priority !== 'reader');
          if (!victim) return;
          remove(victim[0]); observe('fact-eviction', {cache:name});
        }
        ready.set(key, {value, bytes:size, priority}); bytes += size; peakBytes = Math.max(peakBytes, bytes);
      }
      function get(key, priority, build, reusable = () => true, generation = epoch) {
        if (ready.has(key)) {
          const row = ready.get(key); ready.delete(key); ready.set(key, row);
          if (priority === 'reader' && row.priority !== 'reader') {
            row.priority = 'reader';
            while ([...ready.values()].filter(r => r.priority === 'reader').length > limits.reader) {
              const victim = [...ready].find(([other, r]) => other !== key && r.priority === 'reader');
              if (!victim) break; remove(victim[0]);observe('fact-eviction',{cache:name});
            }
          }
          observe('fact-cache', {cache:name,key,state:'hit',priority});
          return Promise.resolve(row.value);
        }
        if (pending.has(key)) {
          const row = pending.get(key); if (priority === 'reader') row.priority = 'reader';
          observe('fact-cache', {cache:name,key,state:'pending',priority}); return row.promise;
        }
        if (pending.size >= limits.pending) {
          // No retained queue: callers wait for an admission slot, then recheck
          // the key so concurrent waiters still share the admitted work.
          observe('fact-cache', {cache:name,key,state:'backpressure',priority});
          return Promise.race([...pending.values()].map(r => r.promise.catch(() => null)))
            .then(() => get(key,priority,build,reusable,generation));
        }
        const row = {priority, promise:null};
        const promise = Promise.resolve().then(build).then(value => {
          retain(key,value,row.priority,reusable(value),generation); return value;
        });
        row.promise = promise; pending.set(key,row); peakPending = Math.max(peakPending,pending.size);
        observe('fact-cache', {cache:name,key,state:'miss',priority});
        promise.then(() => {if (pending.get(key) === row) pending.delete(key);},
          () => {if (pending.get(key) === row) pending.delete(key);});
        return promise;
      }
      return {get, prime:(key,value) => {if(!ready.has(key)&&!pending.has(key))retain(key,value,'grammar',true,epoch);}, clear:() => {epoch++;ready.clear();bytes=0;},
        stats:() => ({entries:ready.size,reader:[...ready.values()].filter(r=>r.priority==='reader').length,grammar:[...ready.values()].filter(r=>r.priority==='grammar').length,pending:pending.size,bytes,peakBytes,peakPending,limits:{...limits}})};
    }
    const sourceFacts = factStore('source', {reader:512,grammar:256,bytes:8*1024*1024,pending:64});
    const morphologyFacts = factStore('morphology', {reader:256,grammar:256,bytes:4*1024*1024,pending:32});
    const verbFacts = factStore('verb', {reader:256,grammar:256,bytes:2*1024*1024,pending:32});
    const nounFrames = factStore('noun-frame', {reader:0,grammar:128,bytes:1024*1024,pending:16});
    function sourceLookup(word, consumer, priority) {
      syncSourceVersion();
      const spelling = sourceSpelling(word), key = JSON.stringify([sourceVersion(),'lookup',spelling]), activation=sourceActivation;
      let retryRow;
      if (activeContexts.size && partialSources.get(key)?.activation === activation) {
        const row=partialSources.get(key);
        if (row.failed && (!row.retryStarted || row.retryPending)) {
          retryRow=row;
          if (!row.retryStarted) {
            row.retryStarted=true;row.retryPending=true;
            observe('fact-source-state',{key,state:'bounded-retry'});
          }
        } else {
          lookupFailures++;
          observe('fact-source-state',{key,state:row.failed ? 'error-reuse' : 'partial-reuse'});
          return row.failed ? Promise.reject(row.error) : Promise.resolve(row.groups);
        }
      }
      return sourceFacts.get(key,priority,async () => {
        observe('lookup-source',{consumer,word:spelling,key});
        try {
          if(sourceVersion() !== JSON.parse(key)[0]) throw new Error('Dictionary source changed before lookup began');
          const response = fallback.lookupFacts ? await fallback.lookupFacts(spelling) : {groups:await fallback.lookup(spelling),issues:[]};
          if (retryRow && partialSources.get(key) === retryRow) {
            partialBytes-=retryRow.bytes;partialSources.delete(key);
          }
          // B3: a derived weak verb form is not offered for a spelling of our own
          // dictionary (heute, letzte): that card is the reading of the word.
          const own = (forms.get(norm(spelling)) || []).length > 0;
          const groups = freezeFacts(copyFacts(own ? response.groups.filter(g => !g.derived) : response.groups));
          groupSourceStates.set(groups,freezeFacts({source:'fallback',operation:'lookup',form:spelling,
            version:JSON.parse(key)[0],state:response.issues?.length ? 'partial' : groups.length ? 'available' : 'no-match',
            issues:copyFacts(response.issues || [])}));
          if (response.issues?.length) {
            incompleteGroups.add(groups);lookupFailures++;observe('fact-source-state',{key,state:'partial',issues:response.issues});
            temporarySource(key,{groups},activation);
          }
          return groups;
        } catch (error) {lookupFailures++;observe('fact-source-state',{key,state:'error'});temporarySource(key,{error,failed:true,retryStarted:!!retryRow,retryPending:false},activation);throw error;}
      }, groups => !incompleteGroups.has(groups));
    }
    function lexicalLookup(word, consumer = 'tokenAnalyses') {
      const key = norm(word), marker = {version:sourceVersion()};
      if (!readerProbes.has(key) && readerProbes.size >= 512) readerProbes.delete(readerProbes.keys().next().value);
      if (!readerProbes.has(key) || readerProbes.get(key).version !== marker.version) readerProbes.set(key,marker);
      const pending = sourceLookup(word,consumer,'reader');
      pending.catch(() => {if (readerProbes.get(key) === marker) readerProbes.delete(key);});
      return pending;
    }
    function collectMorphology(word, {discoverModifiers = false, external = true} = {}, consumer = 'morphology') {
      syncSourceVersion();
      const key = JSON.stringify([sourceVersion(),morphologyEpoch,String(word),external,discoverModifiers]);
      const failures = lookupFailures;
      return morphologyFacts.get(key,consumer === 'resolveInternal' || consumer === 'resolve' ? 'reader' : 'grammar',
        async () => {
          const built = await buildMorphology(word,{discoverModifiers,external},consumer);
          const value = freezeFacts(copyFacts(built));
          morphologySourceStates.set(value,morphologySourceStates.get(built));return value;
        }, value => !value.errors.length && lookupFailures === failures).then(value => {
          const copy=copyFacts(value);morphologySourceStates.set(copy,morphologySourceStates.get(value));return copy;
        });
    }
    // Shared morphology inventory. Discovery never implies a syntactic role or
    // an automatic sense choice. IDs remain those of the underlying dictionary.
    async function buildMorphology(word, {discoverModifiers = false, external = true} = {}, consumer = 'morphology') {
      observe('morphology', {consumer,word,discoverModifiers,external});
      const key = norm(word), analyses = [], candidates = [], errors = [];
      const addCandidate = candidate => {
        const id = window.BibliothekVocabulary.identity(candidate);
        if (!candidates.some(c => window.BibliothekVocabulary.identity(c) === id)) candidates.push(candidate);
      };
      const addRow = row => {
        if (!analyses.some(a => JSON.stringify(a) === JSON.stringify(row))) analyses.push(row);
      };
      for (const entry of forms.get(key) || []) {
        addCandidate(mainCandidate(entry));
        addRow({form:word,lemma:entry.word,pos:entry.type,dictionaryId:entry.id,
          source:'main',kind:key === norm(entry.word) ? 'lemma' : 'dictionary-form',evidence:'dictionary-index'});
      }
      for (const {entry,base,kind,person,tense,zu,detached} of verbAnalyses.get(key) || [])
        addRow({form:word,lemma:entry.word,pos:'Verb',dictionaryId:entry.id,source:'main',
          kind,base,person,tense,zu,detached,evidence:'dictionary-verb-table'});
      for (const {entry,base,kind,ending} of modifiers.get(key) || []) {
        addCandidate(mainCandidate(entry));
        addRow({form:word,lemma:entry.word,pos:entry.type,dictionaryId:entry.id,source:'main',
          kind,base,ending,evidence:'dictionary-derived-modifier'});
      }
      const states = [{source:'main',operation:'morphology',epoch:morphologyEpoch,
        state:analyses.length || candidates.length ? 'available' : 'no-match'}];
      if (!external) states.push({source:'fallback',operation:'lookup',state:'not-requested'});
      const read = async form => {
        const version=sourceVersion();
        try {
          const groups = await lexicalLookup(form,'collectMorphology');
          states.push(groupSourceStates.get(groups));return groups;
        } catch (error) {
          const message=String(error.message || error);errors.push({form,message});
          states.push({source:'fallback',operation:'lookup',form:sourceSpelling(form),version,state:'error',issues:[{message}]});return [];
        }
      };
      const groups = external ? await read(word) : [];
      const lexical = groups.filter(g => !g.kind && !g.unresolved && g.meanings?.length);
      const candidateFor = group => {
        const own = (lemmas.get(norm(group.word)) || []).filter(e => e.type === canonicalPos(group.pos));
        const found = own.length ? own.map(mainCandidate) : [{source:'fallback',lemma:group.word,
          pos:group.pos,posLabel:canonicalPos(group.pos),meanings:[...group.meanings],
          translation:{en:group.meanings.join('; '),ru:''}}];
        for (const candidate of found) addCandidate(candidate);
        return found;
      };
      for (const group of lexical) {
        candidateFor(group);
        if (norm(group.word) === key) addRow({form:word,lemma:group.word,pos:canonicalPos(group.pos),
          source:'fallback',kind:'lemma',evidence:'dictionary-lexeme'});
      }
      const inflections = groups.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || []);
      for (const row of inflections) {
        // An explicit form relation and a lexical target must agree on POS.
        if (norm(row.form) !== key || !lexical.some(g => norm(g.word) === norm(row.lemma) && canonicalPos(g.pos) === canonicalPos(row.pos))) continue;
        addRow({...row,form:word,pos:canonicalPos(row.pos),tags:[...(row.tags || [])],
          kind:'inflection',evidence:'dictionary-inflection-link'});
      }
      if (discoverModifiers && external && /^[\p{L}\p{M}]+$/u.test(key)) {
        // Productive place-name -er modifiers may lack an adjective export.
        // Require both the named place and an explicit inhabitant sense; an
        // arbitrary capitalised noun ending in -er is insufficient.
        if(/er$/u.test(key)&&lexical.some(g=>canonicalPos(g.pos)==='Nomen'&&
          g.meanings.some(m=>/\b(?:inhabitant|native|person from)\b/iu.test(m)))){
          const stem=key.slice(0,-2),place=await read(stem.charAt(0).toLocaleUpperCase('de-DE')+stem.slice(1));
          const location=place.find(g=>!g.kind&&!g.unresolved&&g.pos==='name'&&norm(g.word)===stem&&
            g.meanings?.some(m=>/\b(?:city|town|capital|municipality|district)\b/iu.test(m)));
          if(location&&lexical.some(g=>g.meanings.some(m=>norm(m).includes(stem)))){
            const name=stem.charAt(0).toLocaleUpperCase('de-DE')+stem.slice(1);
            addCandidate({source:'fallback',lemma:key,pos:'adj',posLabel:'Adjektiv',
              translation:{en:`of/from ${name}`,ru:`относящийся к ${name}`}});
            addRow({form:word,lemma:key,pos:'Adjektiv',source:'fallback',kind:'adjective',invariant:true,
              base:stem,evidence:'verified-place-inhabitant-derivation'});
          }
        }
        // Suffix removal generates bounded lookup hypotheses only. A lexical
        // adjective or an explicit participle link must confirm each result.
        const hypotheses = new Map();
        for (const ending of endings) if (key.endsWith(ending) && key.length > ending.length+1) {
          const stem = key.slice(0,-ending.length);
          for (const base of [stem,stem+'e']) {
            const rows = hypotheses.get(base) || []; rows.push({stem,ending}); hypotheses.set(base,rows);
          }
        }
        for (const [base,relations] of hypotheses) {
          const discovered = await read(base);
          for (const group of discovered.filter(g => !g.kind && !g.unresolved && g.meanings?.length &&
            canonicalPos(g.pos) === 'Adjektiv' && norm(g.word) === base)) {
            // Keep the same invariant-adjective policy as the own index.
            if (new Set(['rosa','lila','prima','extra','super','gratis','klasse']).has(base)) continue;
            const stem = base === 'hoch' ? 'hoh' : base.endsWith('e') ? base.slice(0,-1) : base;
            for (const relation of relations.filter(r => r.stem === stem)) {
              const targets = candidateFor(group);
              for (const target of targets) addRow({form:word,lemma:target.lemma,pos:'Adjektiv',
                source:target.source,...(target.dictionaryId ? {dictionaryId:target.dictionaryId} : {}),
                kind:'adjective',base:stem,ending:relation.ending,evidence:'verified-lexeme-regular-ending'});
            }
          }
          const links = discovered.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
            .filter(r => norm(r.form) === base && canonicalPos(r.pos) === 'Verb' && r.tags?.includes('participle'));
          for (const link of links) for (const group of discovered.filter(g => !g.kind && !g.unresolved &&
            g.meanings?.length && canonicalPos(g.pos) === 'Verb' && norm(g.word) === norm(link.lemma)))
            for (const relation of relations.filter(r => r.stem === base))
              for (const target of candidateFor(group)) addRow({form:word,lemma:target.lemma,pos:'Verb',
                source:target.source,...(target.dictionaryId ? {dictionaryId:target.dictionaryId} : {}),
                kind:'participle-declined',base,ending:relation.ending,tags:[...link.tags],
                evidence:'verified-participle-link-regular-ending'});
        }
      }
      const result={form:word,analyses,candidates,groups,inflections,errors};
      morphologySourceStates.set(result,freezeFacts(copyFacts(states)));return result;
    }
    function tokenMorphology(token, options, consumer) {
      if (!token || !Number.isInteger(token.tokenId)) throw new TypeError('Expected a shared context token');
      return collectMorphology(token[0],options,consumer);
    }
    async function morphologyDetails(word, options) {
      const facts=await collectMorphology(word,options,'resolve');
      return {facts:JSON.parse(JSON.stringify(facts)),sources:copyFacts(morphologySourceStates.get(facts))};
    }
    async function factsForToken(context, tokenId, options) {
      const token=context?.tokens?.find(t=>t.tokenId===tokenId);
      if (!token) throw new RangeError('Token does not belong to the supplied context');
      const facts=await tokenMorphology(token,options,'resolve');
      return {token:{tokenId:token.tokenId,text:token[0],start:token.index,end:token.index+token[0].length},
        facts:JSON.parse(JSON.stringify(facts)),sources:copyFacts(morphologySourceStates.get(facts))};
    }
    function tokenAnalyses(word, lookup = lexicalLookup, consumer = 'tokenAnalyses') {
      syncSourceVersion();
      const key = JSON.stringify([sourceVersion(),morphologyEpoch,String(word),lookup === lassenLexicalLookup ? 'lassen' : 'reader',readerProbeAvailable(word)]);
      const failures = lookupFailures;
      return verbFacts.get(key,consumer === 'resolve' ? 'reader' : 'grammar',
        async () => freezeFacts(copyFacts(await buildTokenAnalyses(word,lookup,consumer))),
        () => lookupFailures === failures).then(copyFacts);
    }
    async function buildTokenAnalyses(word, lookup = lexicalLookup, consumer = 'tokenAnalyses') {
      observe('verb-morphology', {consumer,word});
      const key = norm(word), result = [...(verbAnalyses.get(key) || [])];
      for(const entry of zuForms.get(key)||[])result.push({entry,base:norm(entry.word).replace(/^sich\s+/u,''),compound:[],kind:'infinitive',tense:'Infinitiv',zu:true,detached:false});
      // Own-only display policy does not imply complete grammatical morphology.
      // Keep fallback person/mood evidence for auxiliaries out of UI candidates,
      // while allowing it to control a confirmed lexical participle.
      if (grammaticalWords.has(key) || prepositions.has(key)) return result;
      const ownAuxiliary=result.find(a=>a.entry&&!a.detached&&ownOnlyVerbs.has(a.base));
      if(ownAuxiliary) {
        try {
          const evidence=fallback.auxiliaryInflections?await fallback.auxiliaryInflections(word):[];
          for(const a of evidence.filter(a=>a.lemma===ownAuxiliary.base)) {
            const person=({'first-person':a.number==='plural'?'wir':'ich','second-person':a.number==='plural'?'ihr':'du','third-person':a.number==='plural'?'sie':'er/sie/es'})[a.person];
            const tense=/^subjunctive/u.test(a.mood||'')?a.mood==='subjunctive-ii'||a.tense==='past'||a.tense==='preterite'?'Konjunktiv II':'Konjunktiv I':a.tense==='past'||a.tense==='preterite'?'Präteritum':'Präsens';
            if(person&&!result.some(r=>r.base===a.lemma&&r.kind==='finite'&&r.person===person&&r.tense===tense))result.push({...ownAuxiliary,kind:'finite',person,tense,mood:a.mood});
          }
        } catch (_) { lookupFailures++; /* Own morphology remains usable when the supplement is unavailable. */ }
        return result;
      }

      // Capitalised dictionary nouns are not silently reinterpreted as predicates.
      if (!result.length && word[0] !== key[0] && (forms.get(key) || []).some(e=>e.type === 'Nomen')) return result;
      if(!result.length && fallback.mayBeVerb && !readerProbeAvailable(word) && !await fallback.mayBeVerb(word))return result;
      let groups;
      try { groups = await lookup(word,consumer); } catch (_) { return result; }
      const evidence = groups.filter(g=>g.kind === 'form-note').flatMap(g=>g.inflections || []);
      for (const g of groups.filter(g=>!g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length)) {
        const base = norm(g.word).replace(/^sich\s+/u,''), candidate = {source:'fallback',lemma:g.word,pos:g.pos,posLabel:'Verb',meanings:g.meanings,
          translation:{en:g.meanings.join('; '),ru:''},reflexiveLexical:{baseLemma:base,evidence:/^sich\s+/u.test(norm(g.word))?'dictionary-reflexive-lemma':'base-verb-only'}};
        const common = {base,candidate,compound:[]};
        for (const a of evidence.filter(a=>norm(a.lemma) === base && canonicalPos(a.pos) === 'Verb')) {
          const person = a.person && a.number ? ({'first-person':a.number === 'plural'?'wir':'ich','second-person':a.number === 'plural'?'ihr':'du','third-person':a.number === 'plural'?'sie':'er/sie/es'})[a.person] : null;
          const kind = a.tags.includes('participle') ? 'participle' : a.mood === 'imperative' ? 'imperative' : a.tags.includes('infinitive')||a.tags.includes('infinitive-zu') ? 'infinitive' : person ? 'finite' : null;
          if (kind) {
            const row={...common,kind,person:person || (kind === 'imperative' ? a.number === 'plural'?'ihr':'du' : null),tense:/^subjunctive/u.test(a.mood || '') ? a.mood === 'subjunctive-ii' || a.tense === 'past' || a.tense === 'preterite' ? 'Konjunktiv II' : 'Konjunktiv I' : a.tense === 'past'||a.tense === 'preterite'?'Präteritum':'Präsens',mood:a.mood,zu:a.tags.includes('infinitive-zu'),detached:false};
            result.push(row);
            // Explicit regular second-person evidence can disambiguate a
            // syncretic third-person spelling omitted from the export tags.
            const stem=base.replace(/(?:en|n)$/u,''),second=stem+(/[sßxz]$/u.test(stem)?'t':'st');
            if(kind==='finite'&&a.tense==='present'&&a.mood==='indicative'&&key===stem+'t') {
              let proven=person==='du'&&key===second;
              if(!proven&&person==='ihr')try {
                const secondGroups=await lookup(second,consumer);
                proven=secondGroups.filter(g=>g.kind==='form-note').flatMap(g=>g.inflections||[]).some(r=>norm(r.lemma)===base&&r.person==='second-person'&&r.number==='singular'&&r.tense==='present'&&r.mood==='indicative');
              } catch (_) { /* Missing evidence does not imply regularity. */ }
              if(proven)result.push({...row,person:'er/sie/es'});
            }
          }
        }
        if (key === base) {
          result.push({...common,kind:'infinitive',tense:'Infinitiv',detached:false});
          if (/^[\p{L}\p{M}]+(?:en|eln|ern)$/u.test(base)) for (const person of ['wir','sie']) result.push({...common,kind:'finite',person,tense:'Präsens',detached:false});
        }
      }
      return result;
    }
    const subjectPersons = {ich:['ich'],du:['du'],er:['er/sie/es'],sie:['er/sie/es','sie'],es:['er/sie/es'],wir:['wir'],ihr:['ihr'],man:['er/sie/es'],wer:['er/sie/es'],was:['er/sie/es']};
    const pronounPersons = {mich:'ich',mir:'ich',dich:'du',dir:'du',sich:'third',uns:'wir',euch:'ihr'};
    const determiners = /^(?:der|die|das|ein|eine|kein|keine|mein(?:e)?|dein(?:e)?|sein(?:e)?|ihr(?:e)?|unser(?:e)?|euer(?:e)?|viele|beide|alle|einige|mehrere|etliche|diese|dieser|dieses|dessen|deren)$/u;
    // Step 7: shared sentence facts for relation producers. Verb morphology per
    // token with established nominal roles masked, the clause partition
    // (relations, apposition insertions, relative clauses) and detached forms
    // proven by a clause-final prefix. Consumers keep their own decisions.
    async function sentenceVerbAnalyses(sentence,tokens,words,consumer) {
      const analyses = await Promise.all(tokens.map(t=>tokenAnalyses(t[0], undefined, consumer)));
      // Morphological homographs such as meine/meinen and Buch/Arbeit must
      // remain determiners/nouns inside an identifiable noun phrase.
      for(let i=0;i<tokens.length;i++) {
        if (/^(?:mein|dein|sein|ihr|unser|euer)(?:e|en|em|er|es)?$/u.test(words[i]) &&
          tokens.slice(i+1,i+4).some(t=>t[0][0]!==norm(t[0])[0]&&(forms.get(norm(t[0]))||[]).some(e=>e.type==='Nomen')))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]&&(forms.get(words[i])||[]).some(e=>e.type==='Nomen')&&
          i>0&&(determiners.test(words[i-1])||prepositions.has(words[i-1])))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]) {
          let d=i-1;
          while(d>=0&&i-d<=3&&!/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d])&&/[\p{L}\p{M}]+(?:e|en|em|er|es)$/u.test(words[d]))d--;
          const nominal=(forms.get(words[i])||[]).some(e=>e.type==='Nomen') || prepositions.has(words[d]) ||
            /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d]);
          if(nominal&&d>=0&&i-d<=3&&(/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*)$/u.test(words[d])||prepositions.has(words[d]))) {analyses[i]=[];if(!prepositions.has(words[d]))analyses[d]=[];for(let j=d+1;j<i;j++)analyses[j]=[];}
        }
      }
      // A dictionary noun at the end of a written hyphen compound retains
      // its nominal role even when its spelling has a verbal continuation.
      for(let i=1;i<tokens.length;i++)if(tokens[i][0][0]!==words[i][0]&&
        tokens[i-1][0][0]!==words[i-1][0]&&
        /^\s*-\s*$/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index))) {
        const nominal=(forms.get(words[i])||[]).some(e=>e.type==='Nomen')||
          (await lexicalLookup(tokens[i][0],consumer).catch(()=>[])).some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen');
        if(nominal)analyses[i]=[];
      }
      // Verified adjective/adverb modifiers inside a determiner+noun phrase
      // retain their nominal role even when their spelling is also a verb form.
      for(let i=0;i<tokens.length;i++)if(tokens[i][0][0]!==words[i][0]&&(forms.get(words[i])||[]).some(e=>e.type==='Nomen')){
        let d=i-1;while(d>=0&&i-d<=8&&(modifiers.has(words[d])||(forms.get(words[d])||[]).some(e=>['Adjektiv','Adverb'].includes(e.type))))d--;
        if(d>=0&&determiners.test(words[d])&&i-d<=8&&!/[,;:.!?]/u.test(sentence.slice(tokens[d].index,tokens[i].index)))for(let j=d+1;j<i;j++)analyses[j]=[];
      }
      return analyses;
    }
    function sentenceClauses(sentence,tokens,words,analyses) {
      const subordinators = new Set(['weil','dass','wenn','ob','als','bevor','nachdem','obwohl','während','sobald','damit','bis']);
      const coordinators = new Set(['und','oder','aber','denn','sondern']);
      const clauses = [];let start = 0, relation = 'root';
      for (let i=1;i<tokens.length;i++) {
        const gap = sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index);
        const nextBoundary=tokens.findIndex((t,j)=>j>i&&(/[,;:.!?…]/u.test(sentence.slice(tokens[j-1].index+tokens[j-1][0].length,t.index))||subordinators.has(words[j])||coordinators.has(words[j])));
        const leftFinite=analyses.slice(start,i).some(rows=>rows.some(a=>a.kind==='finite'));
        const rightFinite=analyses.slice(i+1,nextBoundary<0?tokens.length:nextBoundary).some(rows=>rows.some(a=>a.kind==='finite'));
        const nominalCoord=words[i]==='und'&&!/[,;:.!?]/u.test(gap)&&(!leftFinite||!rightFinite)&&
          (tokens[i-1][0][0]!==words[i-1][0]||subjectPersons[words[i-1]])&&
          (tokens[i+1]?.[0][0]!==words[i+1]?.[0]||subjectPersons[words[i+1]]);
        if (/[,;:.!?…“”„"«»()–—]/u.test(gap) || subordinators.has(words[i]) || coordinators.has(words[i])&&!nominalCoord) {
          clauses.push({start,end:i-1,relation});
          start=i;relation=/[;:.!?…]/u.test(gap)?'root':subordinators.has(words[i])?'subordinate':coordinators.has(words[i])?'coordinate':/^\s*,\s*$/u.test(gap)?'comma':'boundary';
        }
      }
      clauses.push({start,end:tokens.length-1,relation});
      // A comma-delimited nominal apposition without a predicate does not
      // sever an unfinished subject from its following finite predicate.
      for(let i=1;i+1<clauses.length;i++){
        const prior=clauses[i-1],aside=clauses[i],next=clauses[i+1];
        const verbal=c=>analyses.slice(c.start,c.end+1).some(rows=>rows.some(a=>['finite','participle','infinitive'].includes(a.kind)));
        if(aside.relation==='comma'&&next.relation==='comma'&&!verbal(prior)&&!verbal(aside)&&verbal(next)&&
          tokens[aside.start][0][0]!==words[aside.start][0]&&!subjectPersons[words[aside.start]]&&!['der','die','das'].includes(words[aside.start])){
          prior.insertions=[...(prior.insertions||[]),{start:aside.start,end:aside.end}];prior.end=next.end;clauses.splice(i,2);i--;
        }
      }
      for(const c of clauses)c.relative=c.relation==='comma'&&['der','die','das','den','dem','dessen','deren'].includes(words[c.start])&&
        (!(forms.get(words[c.start+1])||[]).some(e=>e.type==='Nomen')||['dessen','deren'].includes(words[c.start]));
      return clauses;
    }
    async function detachedClauseForms(words,analyses,clauses,consumer) {
      // A detached spelling may lack its own record while the proven joined
      // spelling has explicit inflection evidence in fallback (maßt ... an).
      for(const clause of clauses) for(let i=clause.start;i<clause.end;i++) {
        for(const pair of separatedForms.get(words[i]) || []) {
          if(words[clause.end]!==pair.prefix)continue;
          const joined=pair.prefix+words[i];
          for(const row of await tokenAnalyses(joined, undefined, consumer))if(row.base===norm(pair.entry.word))
            analyses[i].push({...row,prefix:pair.prefix,detached:true});
        }
      }
    }
    async function sentenceClauseFacts(sentence,tokens,words,consumer) {
      const analyses = await sentenceVerbAnalyses(sentence,tokens,words,consumer);
      const clauses = sentenceClauses(sentence,tokens,words,analyses);
      await detachedClauseForms(words,analyses,clauses,consumer);
      return {sentence,tokens,words,analyses,clauses};
    }
    // Possible subjects (controllers) of a clause for a verb person: personal
    // pronouns, agreeing noun groups, relative pronouns, coordinated and
    // inherited subjects. Returns hypotheses; it does not attach anything.
    function clauseSubjectFacts(facts) {
      const {tokens,words,analyses,clauses}=facts;
      const beforePrep = i=>i>0&&prepositions.has(words[i-1]);
      // Inverted order: a reflexive pronoun may stand between the finite verb
      // and a bare-name subject (Damit stellt sich Leister …).
      const afterFiniteAndPronoun=i=>i>1&&reflexivePronouns.has(words[i-1])&&analyses[i-2]?.some(a=>a.kind==='finite');
      function subjects(clause,person,inherit=true) {
        const firstFinite=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>analyses[i].some(a=>a.kind==='finite'));
        const conjunction=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>i>clause.start&&i<clause.end&&words[i]==='und'&&(firstFinite===undefined||i<firstFinite));
        if(conjunction!==undefined){
          const left={start:clause.start,end:conjunction-1},right={start:conjunction+1,end:firstFinite===undefined?clause.end:firstFinite-1};
          const l=['ich','du','wir','ihr','er/sie/es','sie'].flatMap(p=>subjects(left,p,false));
          const r=['ich','du','wir','ihr','er/sie/es','sie'].flatMap(p=>subjects(right,p,false));
          if(l.length===1&&r.length===1){const collective=[l[0].person,r[0].person].some(p=>['ich','wir'].includes(p))?'wir':[l[0].person,r[0].person].some(p=>['du','ihr'].includes(p))?'ihr':'sie';return collective===person?[{index:l[0].index,person,coordinated:true}]:[];}
          return [];
        }
        const found=[];let personal=false;
        for(let i=clause.start;i<=clause.end;i++) {
          if(clause.insertions?.some(r=>i>=r.start&&i<=r.end)||beforePrep(i))continue;
          if(words[i]==='ihr' && (forms.get(words[i+1])||[]).some(e=>e.type==='Nomen'))continue;
          if(subjectPersons[words[i]])personal=true;
          if((subjectPersons[words[i]] || []).includes(person)) {
            if(tokens[i][0]==='Sie'&&i!==clause.start&&person!=='sie')continue;
            // ihr before a noun is possessive, not a personal subject.
            if(words[i]==='ihr' && (forms.get(words[i+1])||[]).some(e=>e.type==='Nomen'))continue;
            found.push({index:i,person});
          }
        }
        if(personal) {
          // Later sie/es can be ordinary objects; do not reinterpret them as
          // additional subjects when an earlier personal subject is explicit.
          const first=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).find(i=>subjectPersons[words[i]]&&!beforePrep(i)&&!(words[i]==='ihr'&&(forms.get(words[i+1])||[]).some(e=>e.type==='Nomen')));
          return found.filter(s=>s.index===first);
        }
        if(clause.relative&&['der','die','das'].includes(words[clause.start])&&
          (person==='er/sie/es'||person==='sie'&&words[clause.start]==='die'))return [{index:clause.start,person}];
        if(!['er/sie/es','sie'].includes(person)){
          const ci=clauses.indexOf(clause),prior=clauses[ci-1];
          if(inherit&&prior&&clause.relation==='coordinate'&&words[clause.start]==='und'&&!subjects(clause,'er/sie/es',false).length&&!subjects(clause,'sie',false).length)return subjects(prior,person);
          return [];
        }
        for(let i=clause.start;i<=clause.end;i++) {
          if(clause.insertions?.some(r=>i>=r.start&&i<=r.end)||beforePrep(i))continue;
          // Nouns within a prepositional/genitive phrase cannot become a
          // second subject merely because their article also has nominative uses.
          let embedded=false;
          for(let j=i-1;j>=clause.start;j--){
            if(analyses[j].some(a=>a.kind==='finite'))break;
            if(prepositions.has(words[j])&&!(words[j]==='vor'&&words[j+1]==='allem')){embedded=true;break;}
          }
          if(embedded)continue;
          if(!clause.insertions?.some(r=>i+1>=r.start&&i+1<=r.end)&&tokens[i+1]?.[0][0]!==words[i+1]?.[0]&&!analyses[i+1]?.length&&!determiners.test(words[i+1])&&!prepositions.has(words[i+1]))continue;
          const nounEntries=(forms.get(words[i])||[]).filter(e=>e.type==='Nomen');
          let det=i-1;while(det>=clause.start&&i-det<=8&&!prepositions.has(words[det])&&!reflexivePronouns.has(words[det])&&!determiners.test(words[det])&&!(analyses[det]||[]).length)det--;
          const hasDeterminer=det>=clause.start&&determiners.test(words[det]);
          if(hasDeterminer&&beforePrep(det))continue;
          if(hasDeterminer) {
            const eligible=nounEntries.filter(e=>{
              const plural=String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words[i]) &&
                (norm(e.word)!==words[i]||e.plural_only||words[det]==='die'&&e.article!=='die');
              if(plural&&!/^(?:die|viele|beide|alle|einige|mehrere|etliche|diese|\w+e)$/u.test(words[det]))return false;
              if(!plural&&['der','die','das','ein','eine','dieser','diese','dieses'].includes(words[det])) {
                const expected={der:['der','ein','dieser'],die:['die','eine','diese'],das:['das','ein','dieses']}[e.article];
                if(expected&&!expected.includes(words[det]))return false;
              }
              return plural?person==='sie':norm(e.word)===words[i]&&(person==='er/sie/es'||e.article==='die'&&!e.plural);
            });
            if(eligible.length||!nounEntries.length&&tokens[i][0][0]!==words[i][0]&&!analyses[i].length)found.push({index:i,person});
          } else if(nounEntries.some(e=>String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words[i])&&(norm(e.word)!==words[i]||e.plural_only))&&person==='sie')found.push({index:i,person});
          else if(!nounEntries.length && tokens[i][0][0]!==words[i][0] && !analyses[i].length && !grammaticalWords.has(words[i]) && !prepositions.has(words[i]) && !determiners.test(words[i]) &&
            !(forms.get(words[i])||[]).some(e=>['Adverb','Adjektiv','Pronomen'].includes(e.type)) && (i===clause.start||i>clause.start&&tokens[i-1][0][0]!==words[i-1][0]||analyses[i+1]?.some(a=>a.kind==='finite')||analyses[i-1]?.some(a=>a.kind==='finite')||afterFiniteAndPronoun(i)) && person==='er/sie/es') found.push({index:i,person});
        }
        if(!found.length&&inherit&&clause.relation==='coordinate'&&words[clause.start]==='und'){
          const ci=clauses.indexOf(clause),prior=clauses[ci-1];
          const explicitNominal=subjects(clause,'er/sie/es',false).length||subjects(clause,'sie',false).length;
          if(prior&&!explicitNominal){const previousSubjects=subjects(prior,person);if(previousSubjects.length===1)return previousSubjects;}
        }
        return found;
      }
      function subjectFor(clause,a,controller,allowImplicit) {
        const s=subjects(clause,a.person);
        if(s.length===1)return s[0];
        if(!s.length&&allowImplicit&&a.kind==='imperative'&&['du','ihr'].includes(a.person)&&
          (controller===clause.start||words[clause.start]==='bitte'))return {index:null,person:a.person,implicit:true};
        return null;
      }
      return {beforePrep,subjects,subjectFor};
    }
    // Verbal chain of a lexical form: its controlling finite verb (perfect
    // auxiliary, modal, future werden, zu-infinitive host), tense and linked
    // components. Returns null when the chain is not established.
    async function verbChainFor(facts,subjectFacts,clause,{previous,inherited,helpers},v,a,componentIndices) {
      const {tokens,words,analyses}=facts,{subjects}=subjectFacts;
      let controller=v,control=a,subjectClause=inherited&&!subjects(clause,a.person).length?inherited:clause,tense=a.tense,zuIndex=null;
      if(a.kind==='participle') {
        const auxiliary=norm(a.entry?.auxiliary || '').split(/\s+/u)[0];
        const h=helpers.filter(h=>['haben','sein'].includes(h.analysis.base)&&(!auxiliary||h.analysis.base===auxiliary));
        if(h.length!==1)return null;controller=h[0].index;control=h[0].analysis;
        tense=control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt';componentIndices.push(controller);
      } else if(a.kind==='infinitive') {
        const marker=a.zu||words[v-1]==='zu';
        const modal=helpers.filter(h=>modalLemmas.has(h.analysis.base));
        // Werden controls a bare lexical infinitive, never a participle
        // (passive) or a zu-infinitive. Forms must come from the dictionary.
        const future=marker?[]:helpers.filter(h=>h.analysis.base==='werden'&&
          ['Präsens','Konjunktiv I','Konjunktiv II'].includes(h.analysis.tense));
        if(marker&&helpers.some(h=>h.analysis.base==='werden'))return null;
        if(future.length&&v>clause.start&&tokens[v][0][0]!==words[v][0]) {
          const nominal=(forms.get(words[v])||[]).some(e=>e.type==='Nomen')||
            (await lexicalLookup(tokens[v][0],'analyseReflexiveSentence')).some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen');
          if(nominal)return null;
        }
        const replacement=a.compound?.length?helpers.filter(h=>h.analysis.base==='haben'):[];
        if(modal.length+future.length===1||replacement.length===1) {
          const h=modal[0]||future[0]||replacement[0];controller=h.index;control=h.analysis;componentIndices.push(controller);tense=replacement.length?(control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt'):future.length?control.tense==='Konjunktiv II'?'Konjunktiv II':control.tense==='Konjunktiv I'?'Futur I (Konjunktiv I)':'Futur I':control.tense;
        } else if(marker) {
          let host=helpers.filter(h=>!componentIndices.includes(h.index));
          if(!host.length&&previous&&clause.relation==='comma') {
            subjectClause=previous;
            host=[];for(let i=previous.start;i<=previous.end;i++)for(const row of analyses[i])if(row.kind==='finite')host.push({index:i,analysis:row});
          }
          // Equivalent inflection analyses of the same host are not two verbs.
          host=host.filter((h,i,all)=>all.findIndex(x=>x.index===h.index&&x.analysis.person===h.analysis.person&&x.analysis.base===h.analysis.base)===i);
          host=host.filter(h=>subjects(subjectClause,h.analysis.person).length===1);
          if(host.length!==1)return null;controller=host[0].index;control=host[0].analysis;tense='zu-Infinitiv';
          if(words[v-1]==='zu')zuIndex=v-1;
        } else return null;
      } else if(a.kind!=='finite'&&a.kind!=='imperative')return null;
      return {controller,control,subjectClause,tense,zuIndex};
    }
    async function analyseReflexiveSentence(sentence,diagnostic=null) {
      const tokens = sharedTokens(sentence,'analyseReflexiveSentence'), words = tokens.map(t=>norm(t[0]));
      if (!words.some(w=>reflexivePronouns.has(w))) return [];
      const facts = await sentenceClauseFacts(sentence,tokens,words,'analyseReflexiveSentence');
      const {analyses,clauses} = facts;
      if(diagnostic){diagnostic.tokens=tokens.map((t,i)=>({text:t[0],start:t.index,analyses:analyses[i].map(a=>({base:a.base,kind:a.kind,person:a.person,tense:a.tense}))}));diagnostic.clauses=clauses;diagnostic.attempts=[];}
      const subjectFacts = clauseSubjectFacts(facts), {beforePrep,subjects,subjectFor} = subjectFacts;
      const relations=[];
      for(let ci=0;ci<clauses.length;ci++) {
        const clause=clauses[ci], previous=ci>0?clauses[ci-1]:null;
        const inherited=ci>1&&clause.relation==='comma'&&previous.relative&&
          !analyses.slice(clauses[ci-2].start,clauses[ci-2].end+1).some(rows=>rows.some(a=>['finite','infinitive','participle'].includes(a.kind)))
          ? clauses[ci-2] : null;
        for(let v=clause.start;v<=clause.end;v++) {
          let rows=[...analyses[v]];
          for(const a of analyses[v])for(const entry of reflexiveLemmas.get(a.base)||[])
            rows.push({...a,entry,candidate:null});
          for(const a of analyses[v])for(const pair of separableBases.get(a.base)||[]) {
            const own=reflexiveLemmas.get(norm(pair.entry.word))||[];
            for(const entry of own.length?own:[pair.entry])rows.push({...a,entry,candidate:null,base:norm(pair.entry.word),prefix:pair.prefix,detached:true,compound:[]});
          }
          // Prefer the perfect reading of a homographic finite form when a
          // matching auxiliary is present; competing predicates still block it.
          let helpers=[];
          for(let i=clause.start;i<=clause.end;i++)if(i!==v)for(const a of analyses[i])if(a.kind==='finite')helpers.push({index:i,analysis:a});
          helpers=helpers.filter((h,i,all)=>all.findIndex(x=>x.index===h.index&&x.analysis.base===h.analysis.base&&x.analysis.person===h.analysis.person)===i);
          helpers=helpers.filter(h=>subjects(clause,h.analysis.person).length===1||inherited&&subjects(inherited,h.analysis.person).length===1);
          for(const a of rows) {
            // Copulas/auxiliaries alone do not establish a lexical reflexive verb.
            if((['haben','sein','werden'].includes(a.base)||modalLemmas.has(a.base))&&!a.compound?.length)continue;
            const attempt=diagnostic?{verbStart:tokens[v].index,base:a.base,kind:a.kind,stage:'components'}:null;if(attempt)diagnostic.attempts.push(attempt);
            const componentIndices=[v];
            if(a.detached) {
              const p=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).filter(i=>i>v&&words[i]===a.prefix&&i===clause.end);
              if(p.length!==1)continue;componentIndices.push(p[0]);
            }
            let complete=true;
            for(const term of a.compound||[]) {
              const matches=[];for(let i=clause.start;i<=clause.end;i++)if(i!==v&&words[i]===term)matches.push(i);
              if(matches.length!==1){complete=false;break;}componentIndices.push(matches[0]);
            }
            if(!complete)continue;
            if(attempt)attempt.stage='controller';
            const chain=await verbChainFor(facts,subjectFacts,clause,{previous,inherited,helpers},v,a,componentIndices);
            if(!chain)continue;
            const {controller,control,subjectClause,tense,zuIndex}=chain;
            if(!control.person)continue;
            if(attempt){attempt.stage='subject';attempt.person=control.person;attempt.subjectCandidates=subjects(subjectClause,control.person);}
            let subject=subjectFor(subjectClause,control,controller,true);
            if(!subject)continue;
            // An infinitival comma clause can have an explicit accusative
            // controller; third-person objects cannot be resolved to sich safely.
            if(a.kind==='infinitive'&&tense==='zu-Infinitiv'&&subjectClause!==clause) {
              const objects=[];for(let i=subjectClause.start;i<=subjectClause.end;i++)if(['mich','dich','uns','euch'].includes(words[i])&&!beforePrep(i))objects.push(i);
              if(objects.length===1)subject={index:objects[0],person:pronounPersons[words[objects[0]]],objectController:true};
              else if(objects.length>1)continue;
              else if(Array.from({length:subjectClause.end-subjectClause.start+1},(_,k)=>words[subjectClause.start+k]).some(w=>['den','dem','einen','einem','ihn','ihm','ihr'].includes(w)))continue;
            }
            if(attempt)attempt.stage='pronoun';
            const pronouns=[];
            for(let p=clause.start;p<=clause.end;p++)if(reflexivePronouns.has(words[p])&&!beforePrep(p)) {
              const per=pronounPersons[words[p]];
              if(per===subject.person||per==='third'&&['er/sie/es','sie'].includes(subject.person))pronouns.push(p);
            }
            if(attempt)attempt.pronounStarts=pronouns.map(i=>tokens[i].index);
            if(pronouns.length!==1)continue;
            if(attempt)attempt.stage='competing-predicate';
            const pronoun=pronouns[0];
            // The predicate, its auxiliary/modal and documented compound pieces
            // form one group. Any other verbal head makes the attachment unsafe.
            let unresolvedLassen=false;
            const allowed=new Set([...componentIndices,controller]);if(zuIndex!==null)allowed.add(zuIndex);
            // In a modal + bare infinitive + lassen bracket, the inner
            // infinitive is part of the same predicate, not a second clause.
            // Keep lassen as the construction head; do not relabel the inner
            // verb as a lexical 'sich …' sense or infer its semantic controller.
            if(a.base==='lassen'&&a.kind==='infinitive'&&modalLemmas.has(control.base)&&!a.compound?.length){
              const inner=[];
              for(let i=clause.start;i<v;i++)if(i!==controller&&analyses[i].some(r=>r.kind==='infinitive'&&!r.zu&&r.base===words[i])&&words[i-1]!=='zu')inner.push(i);
              if(inner.length!==1)continue;
              componentIndices.push(inner[0]);allowed.add(inner[0]);unresolvedLassen=true;
            }

            // A dictionary-proven participle after a graded state description
            // (mich sehr gut beraten) is a complement, not an independent verb.
            // Require the local right edge and an uninterrupted modifier phrase;
            // a bare infinitive, object, preposition or coordination is insufficient.
            const predicativeParticiple=i=>a.base!=='lassen'&&i>pronoun+1&&
              Array.from({length:clause.end-i},(_,k)=>i+1+k).every(j=>allowed.has(j))&&
              analyses[i].some(r=>r.kind==='participle')&&
              ['gut','schlecht','sehr','besonders','völlig','vollkommen','ausreichend'].includes(words[i-1])&&
              Array.from({length:i-pronoun-1},(_,k)=>pronoun+1+k).every(j=>
                !analyses[j].length&&!prepositions.has(words[j])&&
                (forms.get(words[j])||[]).some(e=>['Adjektiv','Adverb'].includes(e.type)))&&
              !helpers.some(h=>h.index!==i&&!allowed.has(h.index));
            const competingIndices=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).filter(i=>
              !allowed.has(i)&&!predicativeParticiple(i)&&analyses[i].some(r=>
                ['infinitive','participle'].includes(r.kind)||r.kind==='finite'&&subjects(clause,r.person).length));
            const competing=competingIndices.length>0;
            if(attempt)attempt.competing=competingIndices.map(i=>tokens[i][0]);
            if(competing)continue;
            if(a.kind==='finite'&&helpers.some(h=>['haben','sein'].includes(h.analysis.base))&&rows.some(r=>r.kind==='participle'))continue;
            const candidate=a.entry?mainCandidate(a.entry):a.candidate;if(!candidate)continue;
            const indices=[...componentIndices,pronoun];if(zuIndex!==null)indices.push(zuIndex);
            let complement=null;
            for(let i=pronoun+1;i<clause.end;i++) {
              const c=(a.entry?.complements||[]).find(c=>norm(c.pattern.split(/\s+/u)[0])===words[i]);
              if(c){complement=c;indices.push(i);break;}
              if(prepositions.has(words[i])||analyses[i].length)break;
            }
            // Agreement establishes attachment, not the meaning 'oneself'.
            // A bare plural object of a base verb also permits 'each other'.
            // Restrict this safeguard to the local bare-object pattern; richer
            // complements and lexical reflexive entries retain existing analysis.
            const lexicalSenseConfirmed=reflexiveEntries.has(a.entry)||/^sich\s+/u.test(norm(candidate.lemma));
            const pluralSubject=['wir','ihr','sie'].includes(subject.person);
            const selfMarker=['selbst','selber'].includes(words[pronoun+1])?pronoun+1:null;
            const mutualMarker=words[pronoun+1]==='gegenseitig'?pronoun+1:null;
            // A5 (15.10.2026, user decision): «себя» and «друг друга» are one card — no
            // choice, always Reflexiv. Only a sure reciprocal use (… sich gegenseitig …) adds
            // the line «здесь: друг друга»; a plural subject alone is too weak (sie duckten
            // sich, wir fragen uns — checked on Harry Potter), so nothing else is claimed.
            const reflexiveAmbiguity=pluralSubject&&mutualMarker!==null;
            if(selfMarker!==null)indices.push(selfMarker);
            if(mutualMarker!==null)indices.push(mutualMarker);
            const tentative=unresolvedLassen;
            const spans=[...new Set(indices)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}));
            const caseName=['mir','dir'].includes(words[pronoun])?'Dativ':['mich','dich'].includes(words[pronoun])?'Akkusativ':'Akkusativ/Dativ';
            const tokenSpan=i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
            if(attempt)attempt.stage='linked';
            relations.push({...candidate,reflexiveUnconfirmed:false,construction:{id:'reflexive-verb',lemma:candidate.lemma,label:unresolvedLassen?'Mögliche Reflexivgruppe':'Reflexiv',...(tentative?{confidence:'tentative'}:{}),...(unresolvedLassen?{attachmentOnly:true}:{}),...(reflexiveAmbiguity?{interpretation:'reciprocal'}:{}),
              note:reflexiveAmbiguity?{ru:'здесь: друг друга',en:'here: each other'}:unresolvedLassen?{ru:'Возможная возвратная группа с lassen; требуется выбор',en:'Possible reflexive lassen group; selection required'}:{ru:'Возвратная конструкция',en:'Reflexive construction'},spans,tense,...(controller!==v&&modalLemmas.has(control.base)&&tense!=='zu-Infinitiv'?{modal:control.base}:{}),reflexiveCase:caseName,
              verb:tokenSpan(v),pronoun:tokenSpan(pronoun),
              ...(a.detached?{prefix:tokenSpan(componentIndices.find(i=>i!==v&&words[i]===a.prefix))}:{}),
              subject:subject.index===null?null:{text:tokens[subject.index][0],start:tokens[subject.index].index,end:tokens[subject.index].index+tokens[subject.index][0].length},
              lexicalSenseConfirmed:lexicalSenseConfirmed&&!reflexiveAmbiguity,
              ...(complement?{complement:{...complement}}:{})},_lexicalIndices:[v,...componentIndices.filter(i=>i!==controller&&(!unresolvedLassen||i===v))],_pronounIndex:pronoun});
          }
        }
      }
      // Multiple morphological analyses can describe the same attachment.
      const unique=relations.filter((r,i,all)=>all.findIndex(x=>window.BibliothekVocabulary.identity(x)===window.BibliothekVocabulary.identity(r)&&JSON.stringify(x.construction.spans)===JSON.stringify(r.construction.spans))===i);
      return unique.filter(r=>!unique.some(x=>x!==r&&x._pronounIndex===r._pronounIndex&&x._lexicalIndices.some(i=>r._lexicalIndices.includes(i))&&
        (x.construction.spans.length>r.construction.spans.length && r.construction.spans.every(s=>x.construction.spans.some(t=>t.start===s.start)) ||
          x.construction.lexicalSenseConfirmed&&!r.construction.lexicalSenseConfirmed ||
          x.source==='main'&&r.source==='fallback'&&norm(x.lemma)===norm(r.lemma))));
    }
    function hasReflexivePronoun(sentence) {
      for (const token of sharedTokens(String(sentence || ''),'hasReflexivePronoun'))
        if (reflexivePronouns.has(norm(token[0]))) return true;
      return false;
    }
    async function reflexiveCandidates(word,context) {
      syncSourceVersion();
      if(!context||!Number.isInteger(context.tokenOffset))return [];
      const sentence=String(context.sentence||''),key=norm(word);
      // Sentence analysis cannot produce a reflexive group without a pronoun.
      // Check before importing forms or downloading the verb membership filter.
      if (!hasReflexivePronoun(sentence)) return [];
      try { await prepareSeparable(); } catch (_) { /* Own evidence remains usable offline. */ }
      if(!reflexivePronouns.has(key)&&!verbAnalyses.has(key)&&!zuForms.has(key)&&!separatedForms.has(key)){
        if(word[0]!==key[0]&&(forms.get(key)||[]).some(e=>e.type==='Nomen'))return [];
        if(fallback.mayBeVerb&&!await fallback.mayBeVerb(word))return [];
      }
      observe('relation-cache', {consumer:'reflexiveCandidates',cache:'grammar',key:sentence,state:grammarCache.has(sentence)?'retained':'miss',size:grammarCache.size});
      if(!grammarCache.has(sentence)) {
        if(grammarCache.size>=64)grammarCache.delete(grammarCache.keys().next().value);
        const failures=lookupFailures,pending=analyseReflexiveSentence(sentence);
        grammarCache.set(sentence,pending);
        pending.then(()=>{if(lookupFailures!==failures&&grammarCache.get(sentence)===pending)grammarCache.delete(sentence);},()=>{if(grammarCache.get(sentence)===pending)grammarCache.delete(sentence);});
      }
      const groups=await grammarCache.get(sentence),clicked=clickedTokenIndex(sharedTokens(sentence,'reflexiveCandidates'),context.tokenOffset,word);
      return groups.filter(c=>clicked===c._pronounIndex||c._lexicalIndices.includes(clicked)).map(({_lexicalIndices,_pronounIndex,...c})=>({...c,translation:{...c.translation},construction:{...c.construction,spans:c.construction.spans.map(s=>({...s}))}}));
    }
    // Step 7: substantivation over shared facts. The nominal slot (a word joined
    // to the preceding determiner or marker, and whether a separate noun head
    // follows) is one fact for every family; the reviewed L03 families are data.
    function nominalSlot(word, context, consumer, {headModifiers}) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,consumer);
      const index = clickedTokenIndex(tokens,context.tokenOffset,word,true);
      const joined = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      if (index < 1 || !joined(index-1,index)) return null;
      const next = tokens[index+1];
      // A separate noun head is capitalised (das Lesen macht: macht is no head).
      const separateHead = !!next && joined(index,index+1) &&
        (/^[A-ZÄÖÜ]/u.test(next[0]) && (forms.get(norm(next[0])) || []).some(e => e.type === "Nomen") || headModifiers && modifiers.has(norm(next[0])));
      return {sentence,tokens,index,joined,marker:norm(tokens[index-1][0]),separateHead};
    }
    // Reviewed action nouns have their own identity; never borrow a verb ID.
    const infinitiveNouns = {
      lesen:{en:"reading (the act of reading)",ru:"чтение"},
      schreiben:{en:"writing (the act of writing)",ru:"написание; процесс письма"},
      warten:{en:"waiting (the act of waiting)",ru:"ожидание"},
      anrufen:{en:"calling (the act of making a phone call)",ru:"действие: звонить по телефону"}
    };
    function infinitiveNoun(word, context) {
      const base = norm(word), translation = infinitiveNouns[base];
      if (!translation || !/^[A-ZÄÖÜ]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      const slot = nominalSlot(word,context,'infinitiveNoun',{headModifiers:false});
      // Do not select an action noun as a modifier of a following known noun.
      if (!slot || slot.marker !== "das" || slot.separateHead) return null;
      const lemma = base.charAt(0).toLocaleUpperCase("de-DE")+base.slice(1);
      const verb = (lemmas.get(base) || []).find(e => e.type === "Verb");
      const usage = {role:"nominalized",kind:"infinitive",base,form:word,baseDictionaryId:verb?.id || null};
      return {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation:{...translation},usage,
        item:{word:lemma,article:"das",type:"Nomen",translation_en:translation.en,translation_ru:translation.ru,
          usage_note_en:`Nominalized infinitive of ${base}.`,usage_note_ru:`Субстантивированный инфинитив ${base}.`}};
    }
    const nominalizedAdjectives = {
      Neues:{marker:"etwas",base:"neu",en:"something new",ru:"что-то новое"},
      Besonderes:{marker:"nichts",base:"besondere",en:"nothing special",ru:"ничего особенного"}
    };
    function adjectiveNoun(word, context) {
      const definition = nominalizedAdjectives[word];
      if (!definition || !context || !Number.isInteger(context.tokenOffset)) return null;
      const slot = nominalSlot(word,context,'adjectiveNoun',{headModifiers:true});
      if (!slot || slot.marker !== definition.marker || slot.separateHead) return null;
      const ownBase = (lemmas.get(definition.base) || []).find(e => e.type === "Adjektiv");
      const translation = {en:definition.en,ru:definition.ru};
      return {source:"fallback",lemma:word,pos:"noun",posLabel:"Nomen",translation,
        usage:{role:"nominalized",kind:"adjective",base:definition.base,baseDictionaryId:ownBase?.id || null,form:word,marker:definition.marker},
        item:{word,type:"Nomen",translation_en:translation.en,translation_ru:translation.ru}};
    }
    const nominalizedPeople = {
      reisend:{male:["Reisender","traveller","путешественник"],female:["Reisende","female traveller","путешественница"],base:"reisen"},
      arbeitslos:{male:["Arbeitsloser","unemployed person","безработный"],female:["Arbeitslose","unemployed woman","безработная"],base:"arbeitslos"},
      bekannt:{male:["Bekannte","acquaintance","знакомый"],female:["Bekannte","female acquaintance","знакомая"],base:"bekannt"}
    };
    const nominalizedPeopleForm = new RegExp(`^(${Object.keys(nominalizedPeople).join("|")})(e|en|er|em|es)$`,"u");
    function personNouns(word, context) {
      const match = nominalizedPeopleForm.exec(norm(word));
      if (!match || !/^[A-ZÄÖÜ]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      const slot = nominalSlot(word,context,'personNouns',{headModifiers:true});
      if (!slot || slot.separateHead) return null;
      const {tokens,index,joined} = slot;
      const determiner = norm(tokens[index-1][0]);
      const definite = ["der","die","den","dem","des"].includes(determiner);
      const mixed = /^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(e|en|em|er|es)?$/u.exec(determiner);
      if (!definite && !mixed) return null;
      const tail = mixed?.[1] || "";
      const table = {
        male:[["der","","er","e"],["den","en","en","en"],["dem","em","em","en"],["des","es","en","en"]],
        female:[["die","e","e","e"],["die","e","e","e"],["der","er","er","en"],["der","er","er","en"]],
        plural:[["die","e","e","en"],["die","e","e","en"],["den","en","en","en"],["der","er","er","en"]]
      };
      const prep = index > 1 && joined(index-2,index-1) ? norm(tokens[index-2][0]) : "";
      const governed = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,für:1,durch:1,gegen:1,ohne:1,um:1}[prep];
      const analyses = [];
      for (const [gender,rows] of Object.entries(table)) rows.forEach(([article,mixedTail,strong,weak],caseIndex) => {
        if (governed !== undefined && governed !== caseIndex || definite && article !== determiner || mixed && mixedTail !== tail) return;
        if (gender === "plural" && mixed && determiner.startsWith("ein")) return;
        const ending = definite || mixed && tail ? weak : strong;
        if (match[2] === ending) analyses.push({gender,caseIndex});
      });
      if (!analyses.length) return null;
      const definition = nominalizedPeople[match[1]];
      return ["male","female"].flatMap(gender => {
        const compatible = analyses.filter(a => a.gender === gender || a.gender === "plural");
        if (!compatible.length) return [];
        const [lemma,en,ru] = definition[gender], article = gender === "male" ? "der" : "die";
        const own = (lemmas.get(norm(lemma)) || []).find(e => e.type === "Nomen" && e.article === article);
        const usage = {role:"nominalized",kind:"person",base:definition.base,form:word,
          number:compatible.every(a=>a.gender === "plural") ? "plural" : compatible.every(a=>a.gender !== "plural") ? "singular" : "ambiguous"};
        const candidate = own ? mainCandidate(own) : {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation:{en,ru},
          item:{word:lemma,article,type:"Nomen",translation_en:en,translation_ru:ru}};
        return [{...candidate,usage}];
      });
    }
    // General nominalized infinitive (L03): a capitalised spelling inside the
    // utterance, a neuter determiner right before it (optionally with modifiers),
    // no separate noun head after it, a dictionary verb whose infinitive is this
    // spelling and no noun reading of its own. The base meaning is shown with an
    // explicit grammatical label; no new meaning is invented.
    const neuterDeterminer = d => /^(?:das|des|dem|ein|eines|einem|kein|keines|keinem|dies(?:es|em)|jed(?:es|em)|jen(?:es|em)|all(?:es|em)|(?:mein|dein|sein|ihr|unser|euer|eur)(?:es|em)?)$/u.test(d) ||
      ["dem","das"].includes(contractionArticle(d));
    function generalInfinitiveNoun(word, context, candidates) {
      if (!/^[A-ZÄÖÜ][a-zäöüß]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      const base = norm(word);
      if (candidates.some(c => canonicalPos(c.pos) === "Nomen" && norm(c.lemma) === base)) return null;
      // An own noun declined like an adjective has this very form (einem Kranken): not an infinitive.
      if (candidates.some(c => c.source === "main" && canonicalPos(c.pos) === "Nomen" && adjectivalNounStem(c.item) &&
        [...["e","en","er","em","es"]].some(ending => norm(adjectivalNounStem(c.item))+ending === base))) return null;
      const verbs = candidates.filter(c => canonicalPos(c.pos) === "Verb" && norm(c.lemma) === base);
      if (!verbs.length) return null;
      const slot = nominalSlot(word,context,'generalInfinitiveNoun',{headModifiers:false});
      if (!slot || slot.separateHead) return null;
      const {tokens,index,joined} = slot;
      let d = index-1;
      while (d > 0 && index-d <= 3 && /^[a-zäöüß]/u.test(tokens[d][0]) && joined(d-1,d) &&
        (modifiers.has(norm(tokens[d][0])) || (forms.get(norm(tokens[d][0])) || []).some(e => e.type === "Adjektiv"))) d--;
      if (!neuterDeterminer(norm(tokens[d][0]))) return null;
      const verb = verbs.find(c => c.source === "main") || verbs[0];
      const lemma = base.charAt(0).toLocaleUpperCase("de-DE")+base.slice(1);
      const meaning = verb.translation || {};
      const translation = {en:`nominalized infinitive of “${base}”${meaning.en ? `: ${meaning.en}` : ""}`,
        ru:`субстантивированный инфинитив от «${base}»${meaning.ru ? `: ${meaning.ru}` : ""}`};
      const usage = {role:"nominalized",kind:"infinitive",base,form:word,baseDictionaryId:verb.dictionaryId || null,general:true};
      return {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation,usage,
        item:{word:lemma,article:"das",type:"Nomen",translation_en:translation.en,translation_ru:translation.ru,
          usage_note_en:`Nominalized infinitive of ${base}.`,usage_note_ru:`Субстантивированный инфинитив ${base}.`}};
    }
    // General nominalized adjective or participle (L03): a capitalised declined
    // form inside the utterance (joined to the previous word), a dictionary
    // adjective as its base, no separate noun head and no compound hyphen after
    // it, and no noun reading among the candidates. Capitals inside a sentence
    // mark nominal use; names keep their head noun (das Rote Kreuz). The base
    // meaning is shown with a grammatical label; gender and person are not guessed.
    function generalAdjectiveNoun(word, context, candidates) {
      if (!/^[A-ZÄÖÜ][a-zäöüß]/u.test(word) || !context || !Number.isInteger(context.tokenOffset)) return null;
      if (!candidates.length || !candidates.every(c => ["Adjektiv","Adverb"].includes(canonicalPos(c.pos)))) return null;
      const bases = candidates.filter(c => canonicalPos(c.pos) === "Adjektiv");
      if (new Set(bases.map(c => norm(c.lemma))).size !== 1) return null;
      const base = norm(bases[0].lemma), surface = norm(word);
      const ending = ["en","em","er","es","e"].find(e => surface.endsWith(e) && surface.slice(0,-e.length).startsWith(base));
      if (!ending) return null;
      const slot = nominalSlot(word,context,'generalAdjectiveNoun',{headModifiers:true});
      if (!slot || slot.separateHead) return null;
      const {sentence,tokens,index} = slot, next = tokens[index+1];
      // A compound hyphen or any capitalised next word (a head or part of a name:
      // die Neue Zürcher Zeitung) keeps the adjective attributive.
      const gap = next ? sentence.slice(tokens[index].index+tokens[index][0].length,next.index) : "";
      if (next && (/^\s*[-‐]\s*$/u.test(gap) || slot.joined(index,index+1) && /^[A-ZÄÖÜ]/u.test(next[0]))) return null;
      // After a capitalised word inside the sentence (a noun or name) the word is
      // a name in apposition (die Fahrschule Rauer), not a nominalized adjective.
      if (index > 1 && /^[A-ZÄÖÜ]/u.test(tokens[index-1][0])) return null;
      const adjective = bases.find(c => c.source === "main") || bases[0];
      const stem = surface.slice(0,-ending.length);
      const lemma = stem.charAt(0).toLocaleUpperCase("de-DE")+stem.slice(1)+"e";
      const meaning = adjective.translation || {};
      const translation = {en:`nominalized adjective of “${base}”${meaning.en ? `: ${meaning.en}` : ""}`,
        ru:`субстантивированное прилагательное от «${base}»${meaning.ru ? `: ${meaning.ru}` : ""}`};
      return {source:"fallback",lemma,pos:"noun",posLabel:"Nomen",translation,
        usage:{role:"nominalized",kind:"adjective",base,baseDictionaryId:adjective.dictionaryId || null,form:word,general:true},
        item:{word:lemma,type:"Nomen",translation_en:translation.en,translation_ru:translation.ru,
          usage_note_en:`Nominalized adjective of ${base}.`,usage_note_ru:`Субстантивированное прилагательное ${base}.`}};
    }
    // One substantivation producer: nominal readings and their proposals for the
    // selection core (nominalized-person, nominalized-noun).
    function nominalizedReadings(word, context, candidates) {
      const noun = infinitiveNoun(word,context) || adjectiveNoun(word,context) || generalInfinitiveNoun(word,context,candidates) ||
        (personNouns(word,context) ? null : generalAdjectiveNoun(word,context,candidates));
      const people = personNouns(word,context);
      return {noun,people,proposals:{
        'nominalized-person':people ? {candidate:people.length === 1 ? people[0] : null,
          evidence:people.length === 1 ? "nominalized-person-agreement" : "ambiguous-nominalized-person"} : null,
        'nominalized-noun':noun ? {candidate:noun,
          evidence:noun.usage.kind === "adjective" ? noun.usage.general ? "nominalized-adjective-without-head" : "nominalized-adjective-after-indefinite" :
            noun.usage.general ? "nominalized-infinitive-after-determiner" : "nominalized-infinitive-after-das"} : null}};
    }
    let preparation = null;
    function prepareSeparable() {
      // A2: the small verb + preposition list loads with the book, not on the first tap.
      if (fallback.verbPrepositions) fallback.verbPrepositions().catch(() => {});
      if (!fallback.separableEntries) return Promise.resolve();
      observe('relation-cache', {consumer:'prepareSeparable',cache:'preparation',state:preparation?'retained':'miss'});
      if (!preparation) preparation = fallback.separableEntries().then(rows => {
        for (const [word,prefix,stems,meanings] of rows) {
          const own = (lemmas.get(norm(word)) || []).filter(e => e.type === "Verb");
          const items = own.length ? own : [{id:`imported:${word}`,word,type:"Verb",importedSeparable:true,meanings}];
          const bases = separableBases.get(norm(word.slice(prefix.length))) || [];
          for (const entry of items) if (!bases.some(row=>row.entry.id===entry.id)) bases.push({entry,prefix});
          separableBases.set(norm(word.slice(prefix.length)),bases);
          for (const item of items) {
            dictionaryObjects.add(item);
            add(forms,word,item);
            add(forms,prefix+"zu"+word.slice(prefix.length),item);
            add(zuForms,prefix+"zu"+word.slice(prefix.length),item);
            for (const stem of stems) {
              add(forms,prefix+stem,item);
              const pairs = separatedForms.get(stem) || [];
              if (!pairs.some(p=>p.entry.id===item.id && p.prefix===prefix)) pairs.push({entry:item,prefix});
              separatedForms.set(stem,pairs);
            }
          }
        }
        morphologyEpoch++; morphologyFacts.clear(); verbFacts.clear(); nounFrames.clear();
      }).catch(error => { preparation = null; throw error; });
      return preparation;
    }
    const separableNounEvidence = new Map();
    function scanSeparableCandidates(word, context, secondary = false, pendingNouns = new Set(), nounEvidence = separableNounEvidence) {
      if (!context || !Number.isInteger(context.tokenOffset)) return [];
      const sentence = String(context.separableSentence || context.sentence || ""), tokens = sharedTokens(sentence,'scanSeparableCandidates',sentenceContext(String(context.sentence || '')));
      const selected = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (selected < 0) return [];
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const passable = new Set(["und","oder","aber","als"]);
      const gap = (a,b) => clauseGapText(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      const hard = (a,b) => /[;:.!?…“”„"«»()]/u.test(gap(a,b)) || boundaries.has(norm(tokens[b][0]));
      const soft = (a,b) => /,/u.test(gap(a,b)) || /\s(?:[–—]|--)\s/u.test(gap(a,b));
      const stops = (a,b) => hard(a,b) && !(secondary && passable.has(norm(tokens[b][0])) &&
        !/[;:.!?…“”„"«»()]/u.test(gap(a,b)));
      const nominalParticle = (i,j) => norm(tokens[j][0]) === "vorbei" &&
        /\bkein weg(?: daran)?$/u.test(tokens.slice(i+1,j).map(t => norm(t[0])).join(" "));
      const competingVerb = i => {
        if (context.separableNominalOffsets?.has(tokens[i].index)) return false;
        const entries = forms.get(norm(tokens[i][0])) || [];
        if (norm(tokens[i][0]) === "bitte" || /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && entries.some(e => e.type === "Nomen")) return false;
        const possibleVerb = entries.some(e => e.type === "Verb") || separatedForms.has(norm(tokens[i][0]));
        if (!secondary || !possibleVerb) return possibleVerb;
        // Lexical ambiguity is only bypassed in the tentative second pass.
        if (!entries.some(e => e.type === "Verb") && entries.some(e => ["Adjektiv","Adverb"].includes(e.type))) return false;
        if (/^[A-ZÄÖÜ]/u.test(tokens[i][0])) {
          const key = norm(tokens[i][0]);
          if (!nounEvidence.has(key)) pendingNouns.add(tokens[i][0]);
          if (nounEvidence.get(key)) return false;
        }
        return true;
      };
      // A non-final particle can close the verbal bracket before a proven
      // adverbial continuation. Bare determiners/nouns remain preposition uses.
      const trailingAdverbial = j => {
        // A lexical adverb can itself modify the following adverb (weiter abwärts).
        if ((forms.get(norm(tokens[j][0])) || []).some(e => ["Adverb","Adjektiv"].includes(e.type))) return false;
        let end = j + 1;
        while (end < tokens.length && !hard(end-1,end) && !soft(end-1,end)) end++;
        const entriesAt = k => forms.get(norm(tokens[k][0])) || [];
        // Temporal prepositions also take bare adverbs: ab morgen, vor heute.
        if (["ab","vor","nach","seit","von","bis","über","auf","für","zu"].includes(norm(tokens[j][0])) &&
            !prepositions.has(norm(tokens[j+1][0])) && !["wegen","trotz","während","innerhalb","außerhalb"].includes(norm(tokens[j+1][0]))) return false;
        const tailPreps = new Set([...prepositions,"wegen","trotz","während","innerhalb","außerhalb"]);
        const det = /^(?:der|die|das|den|dem|des|(?:ein|kein|mein|dein|sein|ihr|unser|euer)(?:e|en|em|er|es)?|(?:dies|jen)(?:e|en|em|er|es))$/u;
        let k = j + 1;
        while (k < end) {
          if (!/^\s+$/u.test(gap(k-1,k))) return false;
          const key = norm(tokens[k][0]), entries = entriesAt(k);
          if (tailPreps.has(key)) {
            let head = k + 1;
            if (head < end && det.test(norm(tokens[head][0]))) head++;
            const first = head;
            while (head < end && head-first < 2 && !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) &&
              (modifiers.get(norm(tokens[head][0])) || []).length) head++;
            if (head >= end || !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) ||
                !entriesAt(head).some(e => e.type === "Nomen")) return false;
            for (let h = k; h < head; h++) if (!/^\s+$/u.test(gap(h,h+1))) return false;
            k = head + 1;
          } else {
            if (/^[A-ZÄÖÜ]/u.test(tokens[k][0]) || det.test(key) ||
                !entries.some(e => e.type === "Adverb") || entries.some(e => e.type === "Verb") ||
                (verbAnalyses.get(key) || []).some(a => ["finite","infinitive","participle"].includes(a.kind))) return false;
            k++;
          }
        }
        return end > j+1;
      };
      // Immediate zu + lexical infinitive is a verbal continuation, not
      // a prepositional object. Use prepared lexical data only: no new fetches.
      const trailingZuInfinitive = j => {
        if (norm(tokens[j+1]?.[0]) !== 'zu' || !tokens[j+2]) return false;
        const infinitive=tokens[j+2][0],key=norm(infinitive);
        if (infinitive!==key || !/^\s+$/u.test(gap(j,j+1)) || !/^\s+$/u.test(gap(j+1,j+2))) return false;
        if (!(forms.get(key)||[]).some(e=>e.type==='Verb' && norm(e.word).replace(/^sich\s+/u,'')===key)) return false;
        return j+2===tokens.length-1 || hard(j+2,j+3) || soft(j+2,j+3);
      };
      const results = [];
      for (let i = 0; i < tokens.length-1; i++) {
        const possible = [...(separatedForms.get(norm(tokens[i][0])) || []),...(context.separableDiscoveredForms?.get(norm(tokens[i][0])) || [])];
        if (!possible.length) continue;
        // Only inspect paths that can contribute to this clicked occurrence.
        if (secondary && selected !== i && (i >= selected || !possible.some(pair => pair.prefix === norm(tokens[selected][0])))) continue;
        if (secondary && !tokens.some((t,j) => j > i &&
          (j === tokens.length-1 || hard(j,j+1) || soft(j,j+1) || trailingAdverbial(j) || trailingZuInfinitive(j)) &&
          possible.some(pair => pair.prefix === norm(t[0])) && !nominalParticle(i,j))) continue;
        let start = i;
        while (start > 0 && !hard(start-1,start) && !soft(start-1,start)) start--;
        // Internal capitals belong to a nominal phrase even when the noun is
        // only in fallback (Sparten ... aus). A quoted noun after an article
        // remains nominal although the quote starts a new local segment.
        if (/^[A-ZÄÖÜ]/u.test(tokens[i][0]) && (i > start || i > 0 &&
          /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)$/u.test(norm(tokens[i-1][0])))) continue;
        // Short imperatives can be adjective homographs (besser). They must
        // not steal a particle from an earlier finite predicate in the segment.
        const stemEntries = forms.get(norm(tokens[i][0])) || [];
        if (stemEntries.some(e => ["Adjektiv","Adverb"].includes(e.type)) &&
            !(verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "finite") &&
            tokens.slice(start,i).some(t => (verbAnalyses.get(norm(t[0])) || []).some(a => a.kind === "finite"))) {
          if (selected === i) results.shortImperativeConflict = true;
          continue;
        }
        if (tokens.slice(start,i).some(t => (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" &&
          ["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten","lassen"].includes(e.word)))) continue;
        let crossed = secondary;
        for (let j = i+1; j < tokens.length; j++) {
          if (stops(j-1,j)) break;
          if (soft(j-1,j)) crossed = true;
          // A particle must close its local segment; otherwise it may be a preposition.
          const closes = j === tokens.length-1 || hard(j,j+1) || soft(j,j+1);
          const trailing = !closes && possible.some(pair => pair.prefix === norm(tokens[j][0])) && (trailingAdverbial(j) || trailingZuInfinitive(j));
          // "kein Weg (daran) vorbei" belongs to führen, not vorbeifahren.
          const pairs = (closes || trailing) && !nominalParticle(i,j) && !/^[A-ZÄÖÜ]/u.test(tokens[j][0]) ? possible.filter(pair => pair.prefix === norm(tokens[j][0])) : [];
          if (pairs.length) {
            if (selected === i || selected === j) for (const pair of pairs) {
              const spans = [i,j].map(k => ({text:tokens[k][0],start:tokens[k].index,end:tokens[k].index + tokens[k][0].length}));
              results.push({...mainCandidate(pair.entry),construction:{id:"separable-verb",spans,
                ...(crossed ? {confidence:"tentative"} : {})}});
            }
            // A completed primary bracket must not consume a later particle.
            if (!crossed) break;
          }
          if (competingVerb(j)) break;
        }
      }
      return results;
    }
    function separableCandidates(word, context) {
      const primary = scanSeparableCandidates(word,context);
      return primary.length ? primary : scanSeparableCandidates(word,context,true);
    }
    async function resolveSeparableCandidates(word, context) {
      syncSourceVersion();
      context = await separableScope(context);
      const primary = scanSeparableCandidates(word,context);
      if (primary.length || !context) return primary;
      const nounEvidence = new Map(separableNounEvidence);
      // Fetch only capitalised possible blockers on relevant paths. Reuse the
      // shared lexical cache; do not load every noun in the sentence/corpus.
      for (;;) {
        const pending = new Set(), candidates = scanSeparableCandidates(word,context,true,pending,nounEvidence);
        if (!pending.size) {
          if (candidates.length) return candidates;
          const discovered=await discoverSeparableCandidates(word,context);
          if(candidates.shortImperativeConflict)discovered.shortImperativeConflict=true;
          return discovered;
        }
        await Promise.all([...pending].map(async form => {
          const version = sourceVersion();
          const groups = await lexicalLookup(form,'resolveSeparableCandidates');
          if (separableNounEvidence.size >= 512) separableNounEvidence.delete(separableNounEvidence.keys().next().value);
          const isNoun = groups.some(g => canonicalPos(g.pos) === "Nomen" && g.kind !== "form-note" && !g.unresolved);
          nounEvidence.set(norm(form),isNoun);
          if (version === sourceVersion() && !incompleteGroups.has(groups)) separableNounEvidence.set(norm(form),isNoun);
        }));
      }
    }
    const separableDiscoveryCache=new Map();
    async function discoverSeparableCandidates(word,context) {
      syncSourceVersion();
      if (!context || !fallback.separableFormEvidence) return [];
      const sentence=String(context.separableSentence||context.sentence||''),tokens=sharedTokens(sentence,'discoverSeparableCandidates',sentenceContext(String(context.sentence || '')));
      const selected=clickedTokenIndex(tokens,context.tokenOffset,word);
      if (selected<0) return [];
      const prefixes=new Set(['ab','an','auf','aus','ein','mit','nach','vor','weg','zu','zurück','her','hin','fort','los','fest','um','durch','über','unter','wieder']);
      const discovered=new Map();let hypotheses=0;
      for(let i=0;i<tokens.length-1;i++) {
        const form=norm(tokens[i][0]);
        if(/^[A-ZÄÖÜ]/u.test(tokens[i][0])&&i!==0 || context.separableNominalOffsets?.has(tokens[i].index))continue;
        const particles=tokens.map((t,j)=>({t,j})).filter(({t,j})=>j>i&&prefixes.has(norm(t[0]))&&(selected===i||selected===j)&&
          (j===tokens.length-1||/[,;:.!?…]/u.test(clauseGapText(sentence.slice(t.index+t[0].length,tokens[j+1].index)))||
          ['und','oder','aber','denn','sondern','doch','weil','dass','wenn','ob','als','bevor','nachdem'].includes(norm(tokens[j+1][0]))));
        if(!particles.length)continue;
        const morphology=await tokenMorphology(tokens[i], undefined, 'discoverSeparableCandidates');
        const bases=[...new Set(morphology.analyses.filter(a=>canonicalPos(a.pos)==='Verb'&&
          ['finite','imperative','inflection'].includes(a.kind)&&!a.tags?.includes('participle')).map(a=>norm(a.lemma).replace(/^sich /u,'')))];
        for(const {t}of particles)for(const base of bases) {
          const prefix=norm(t[0]),lemma=prefix+base;
          if(!/^[\p{L}\p{M}]+$/u.test(lemma)||++hypotheses>16)continue;
          const key=JSON.stringify([form,prefix,lemma]);
          observe('relation-cache', {consumer:'discoverSeparableCandidates',cache:'separableDiscovery',key,state:separableDiscoveryCache.has(key)?'retained':'miss',size:separableDiscoveryCache.size});
          if(!separableDiscoveryCache.has(key)) {
            if(separableDiscoveryCache.size>=512)separableDiscoveryCache.delete(separableDiscoveryCache.keys().next().value);
            const pending=fallback.separableFormEvidence(form,prefix,lemma);
            separableDiscoveryCache.set(key,pending);
            pending.catch(()=>{if(separableDiscoveryCache.get(key)===pending)separableDiscoveryCache.delete(key);});
          }
          const evidence=await separableDiscoveryCache.get(key);if(!evidence)continue;
          const own=(lemmas.get(lemma)||[]).filter(e=>e.type==='Verb');
          const entries=own.length?own:[{id:'discovered:'+lemma,word:lemma,type:'Verb',importedSeparable:true,meanings:evidence.meanings}];
          const pairs=discovered.get(form)||[];
          for(const entry of entries)if(!pairs.some(p=>p.entry.id===entry.id&&p.prefix===prefix))pairs.push({entry,prefix});
          discovered.set(form,pairs);
        }
      }
      if(!discovered.size)return [];
      const local={...context,separableDiscoveredForms:discovered};
      const primary=scanSeparableCandidates(word,local);
      return primary.length?primary:scanSeparableCandidates(word,local,true);
    }
    async function separableScope(context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return context;
      const original = String(context.sentence || '');
      const ranges = [], nominal = new Set();
      const hasPredicate = async (start,end) => {
        for (const t of rangeTokens(original,start,end,'separableScope')) {
          if ((await tokenAnalyses(t[0], undefined, 'separableScope')).some(a => ['finite','infinitive','imperative'].includes(a.kind))) return true;
        }
        return false;
      };
      // Only balanced, non-predicative parenthetical fragments are transparent.
      for (const match of observedMatches(original.matchAll(/\([^()]*\)/gu),'separableScope')) {
        if (!await hasPredicate(match.index,match.index+match[0].length) && !/[;:.!?]/u.test(match[0])) ranges.push([match.index,match.index+match[0].length]);
      }
      // A closed subordinate insertion owns its predicates and particles.
      // Unmarked comma clauses and unfinished insertions retain the old guards.
      for (const match of observedMatches(original.matchAll(/,\s*(?:wie|während|obwohl)\b[^,;:.!?]*,/gu),'separableScope')) {
        const inner=rangeTokens(original,match.index,match.index+match[0].length,'separableScope');
        const tail=inner.at(-1);
        const finite=tail&&(await tokenAnalyses(tail[0], undefined, 'separableScope')).some(a=>a.kind==='finite');
        if (finite && inner.length>=3) ranges.push([match.index,match.index+match[0].length]);
      }
      let chars = original.split('');
      const containing = ranges.find(([a,b])=>context.tokenOffset>=a&&context.tokenOffset<b);
      if (containing) {
        const [a,b]=containing;
        chars=chars.map((c,i)=>i>a&&i<b-1?c:' ');
      } else for (const [a,b] of ranges) for(let i=a;i<b;i++) chars[i]=' ';
      const sentence=chars.join(''), scoped=sharedTokens(sentence,'separableScope',sentenceContext(original));
      const morphologyAt=i=>tokenMorphology(scoped[i],{discoverModifiers:true}, 'separableScope');
      // A homographic verb spelling is not a predicate when a nominal frame
      // confirms its noun role. Require both lexical noun evidence and an
      // immediately preceding determiner or verified declined adjective.
      for(let i=1;i<scoped.length;i++) {
        const t=scoped[i], key=norm(t[0]);
        if(!/^[A-ZÄÖÜ]/u.test(t[0]) || !separatedForms.has(key) &&
          !(forms.get(key)||[]).some(e=>e.type==='Verb')) continue;
        if(!/^\s+$/u.test(sentence.slice(scoped[i-1].index+scoped[i-1][0].length,t.index))) continue;
        const previous=scoped[i-1][0];
        const frame=determiners.test(norm(previous)) ||
          !/^[A-ZÄÖÜ]/u.test(previous) && (await morphologyAt(i-1)).analyses.some(a=>
            canonicalPos(a.pos)==='Adjektiv' && ['adjective','participle-declined'].includes(a.kind));
        if(!frame) continue;
        if((await morphologyAt(i)).candidates.some(c=>canonicalPos(c.pos)==='Nomen' &&
          !/^gerund of /iu.test(c.translation?.en||''))) nominal.add(t.index);
      }
      // A verified comparative after a finite predicate in the same clause
      // is a modifier, not a second unintroduced finite verb or imperative.
      // Clause-initial comparisons and forms after auxiliaries stay ambiguous.
      const clauseWords=new Set(['und','oder','aber','denn','sondern','doch','weil','dass','wenn','ob','als','bevor','nachdem']);
      const auxiliaries=new Set(['haben','sein','werden','können','müssen','dürfen','sollen','wollen','mögen','möchten','lassen']);
      for(let i=1;i<scoped.length;i++) {
        const t=scoped[i],key=norm(t[0]);
        if(/^[A-ZÄÖÜ]/u.test(t[0]) || !separatedForms.has(key) &&
          !(forms.get(key)||[]).some(e=>e.type==='Verb')) continue;
        if(!(await morphologyAt(i)).analyses.some(a=>canonicalPos(a.pos)==='Adjektiv' && a.tags?.includes('comparative'))) continue;
        for(let j=i-1;j>=0;j--) {
          if(/[,;:.!?…“”„"«»()]/u.test(sentence.slice(scoped[j].index+scoped[j][0].length,t.index)) ||
            clauseWords.has(norm(scoped[j][0]))) break;
          const finite=(await tokenAnalyses(scoped[j][0], undefined, 'separableScope')).filter(a=>a.kind==='finite');
          if(finite.length) {
            if(finite.every(a=>!auxiliaries.has(a.base)) && !nominal.has(scoped[j].index)) nominal.add(t.index);
            break;
          }
        }
      }
      // Declined participles are transparent only with lexical morphology and
      // a following verified noun head in the same nominal segment.
      for (let i=0;i<scoped.length;i++) {
        const t=scoped[i], entries=forms.get(norm(t[0]))||[];
        if (!entries.some(e=>e.type==='Verb') && !separatedForms.has(norm(t[0]))) continue;
        if (!/(?:e|en|em|er|es)$/u.test(norm(t[0])) || /^[A-ZÄÖÜ]/u.test(t[0])) continue;
        const morphology=await morphologyAt(i);
        if (!morphology.analyses.some(a=>a.kind==='participle-declined')) continue;
        let determined=false;
        for(let j=i-1;j>=0&&i-j<=6;j--) {
          if (/[,;:.!?]/u.test(sentence.slice(scoped[j].index,t.index))) break;
          if (determiners.test(norm(scoped[j][0]))) {determined=true;break;}
          // A completed noun head before the word indicates a predicate,
          // not a modifier of the later object (der Mann besetzte das Haus).
          if (/^[A-ZÄÖÜ]/u.test(scoped[j][0])) break;
        }
        if (!determined) continue;
        for(let j=i+1;j<scoped.length&&j-i<=35;j++) {
          if (/[,;:.!?]/u.test(sentence.slice(t.index,scoped[j].index))) break;
          if (!/^[A-ZÄÖÜ]/u.test(scoped[j][0])) continue;
          const groups=await lexicalLookup(scoped[j][0],'separableScope');
          if (groups.some(g=>!g.kind&&!g.unresolved&&canonicalPos(g.pos)==='Nomen')) {nominal.add(t.index);break;}
        }
      }
      return {...context,separableSentence:sentence,separableNominalOffsets:nominal};
    }
    // Step 6: shared facts of the clicked verbal clause for the construction
    // producers (zu, werden, Futur II, modal/perfect groups). Each producer
    // keeps its own boundary words and gap punctuation as parameters.
    const clauseGaps = Object.freeze({plain:/[,;:.!?“”„"()]/u,dashed:/[,;:.!?…“”„"«»()–—]/u});
    const clauseBoundaries = Object.freeze({
      verbGroup:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]),
      werden:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit"]),
      zu:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","um","ohne","statt","anstatt"]),
      futurePerfect:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","sobald"])
    });
    function verbalClause(word, context, consumer, boundaries, gap = clauseGaps.plain) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,consumer);
      const selected = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (selected < 0) return null;
      const connected = (a,b) => !gap.test(clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index)));
      let start = selected, end = selected;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const verbs = i => matches(i).filter(e=>e.type === "Verb");
      // Finite form of a dictionary verb in one tense (forms table, own data).
      const finiteIn = (e,i,tense) => Object.values(formsOf(e)[tense] || {}).some(f => norm(f) === norm(tokens[i][0]));
      const participleOf = (e,i) => norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]);
      // Nominal facts: a capitalised dictionary noun, a possessive before it.
      const nounToken = i => /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && matches(i).some(e=>e.type === "Nomen");
      const possessiveBeforeNoun = i => /^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(norm(tokens[i][0])) &&
        i+1 <= end && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && matches(i+1).some(e=>e.type === "Nomen");
      // A declined modifier inside a confirmed noun group (die geplanten Arbeiten)
      // is not a competing predicate (offsets supplied by verbConstruction).
      const possibleVerb = i => (verbs(i).length || separatedForms.has(norm(tokens[i][0]))) && !context.attributiveOffsets?.has(tokens[i].index);
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      return {sentence,tokens,selected,start,end,indices:Array.from({length:end-start+1},(_,i)=>start+i),
        connected,matches,verbs,finiteIn,participleOf,nounToken,possessiveBeforeNoun,possibleVerb,span};
    }
    function zuGroup(word, context) {
      const clause = verbalClause(word,context,'zuGroup',clauseBoundaries.zu);
      if (!clause) return null;
      const {tokens,selected,start,end,indices,matches,verbs,finiteIn,possessiveBeforeNoun} = clause;
      const finite = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].some(t=>finiteIn(e,i,t));
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && (verbs(end+2).length || norm(tokens[end+2]?.[0]) === "zu")) return null;
      const heads = indices.flatMap(i=>verbs(i).filter(e=>["haben","sein"].includes(e.word) && finite(e,i)).map(e=>({i,e})));
      const nounComplements = new Set(["lust","zeit","angst","gelegenheit","möglichkeit","recht","grund","chance","mut","erlaubnis","plan","absicht","wunsch","interesse","freude","problem","schwierigkeit","geld"]);
      const mannerWords = new Set(["leicht","schwer","einfach","gut","schlecht","kaum","unmöglich",
        // Degree and sentence adverbs that are adjectives in the dictionary (Das ist wirklich zu empfehlen).
        "wirklich","echt","absolut","durchaus","eigentlich","ganz","besonders","bestens","wärmstens","weiter","sehr"]);
      const result = [];
      for (const head of heads) {
        let tail = head.i === end ? end-1 : end;
        let lexical = head.e, participleIndex = null;
        const past = verbs(tail).filter(e=>["haben","sein"].includes(e.word) && norm(e.auxiliary) === head.e.word && norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[tail][0]));
        if (past.length === 1) {
          // Conditional past is not labelled as ordinary Perfekt.
          if (!["Präsens","Präteritum"].some(t=>finiteIn(head.e,head.i,t))) continue;
          lexical = past[0]; participleIndex = tail; tail--;
        }
        if (tail <= start || tail === head.i || !/^[a-zäöü]/u.test(tokens[tail][0])) continue;
        const joined = zuForms.get(norm(tokens[tail][0])) || [];
        const marker = norm(tokens[tail-1]?.[0]) === "zu" && tail-1 !== head.i ? tail-1 : null;
        const main = joined.length ? joined : marker !== null ? verbs(tail).filter(e=>norm(e.word) === norm(tokens[tail][0])) : [];
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1) continue;
        const linked = [head.i,tail,...(marker !== null ? [marker] : []),...(participleIndex !== null ? [participleIndex] : [])];
        if (!linked.includes(selected)) continue;
        const other = indices.filter(i=>!linked.includes(i));
        // A noun/adjective with its own infinitive complement is a different
        // construction: Lust/Zeit zu lesen, bereit/froh zu gehen, etc.
        if (lexical.word === "haben" && other.some(i=>nounComplements.has(norm(tokens[i][0])) || norm(tokens[i][0]) === "vor")) continue;
        // Only an undeclined (predicative) adjective governs the infinitive (bereit zu gehen);
        // a declined one is attributive inside a phrase (im höchstem Maße weiter zu empfehlen).
        if (lexical.word === "sein" && other.some(i=>!mannerWords.has(norm(tokens[i][0])) &&
          (matches(i).some(e=>e.type === "Adjektiv" && norm(e.word) === norm(tokens[i][0])) || ["bereit","fähig","willig","entschlossen","froh","stolz"].includes(norm(tokens[i][0]))))) continue;
        if (other.some(i=>clause.possibleVerb(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
        const modal = lexical.word === "haben";
        const tense = participleIndex !== null ? finiteIn(head.e,head.i,"Präteritum") ? "Plusquamperfekt · " : "Perfekt · " : "";
        // A recognised connection does not establish obligation (e.g. nichts zu tun).
        const note = modal ? {en:`${tense}haben + zu + infinitive`,ru:`${tense}haben + zu + инфинитив`} :
          {en:`${tense}sein + zu · possibility / necessity`,ru:`${tense}sein + zu · возможность / необходимость`};
        result.push({id:modal ? "haben-zu" : "sein-zu",note,lemma:main[0].word,
          meaningLemma:lexical.word,meaning:modal || selected !== (participleIndex ?? head.i) ? null : {en:"can / must be",ru:"можно / нужно"},
          marker:selected === marker,main:main[0],roles:[head.e,lexical,...main],
          spans:[...new Set(linked)].sort((a,b)=>a-b).map(clause.span)});
      }
      return result.length === 1 ? result[0] : null;
    }
    // Reader reference 4.8: a separately written zu directly before a lowercase
    // infinitive of one dictionary verb, and that infinitive closes the zu group:
    // punctuation, a coordinating word or a verb form follows (…, Deutsch zu lernen.;
    // zu lernen und …; weil er zu lernen versucht). zu as a preposition (zu Hause,
    // zu meinen Eltern), as "too" (zu teuer) or as a separable particle (Tür zu!)
    // never meets these conditions. Earlier producers (haben/sein + zu) win.
    async function zuInfinitiveGroup(word, context) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'zuInfinitiveGroup');
      const clicked = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (clicked < 0) return null;
      const gapAfter = i => tokens[i+1] ? sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index) : '';
      const breaks = i => /[,.;:!?()\[\]–—"“”„«»]/u.test(gapAfter(i));
      // zu at z with its infinitive at z+1 closing the group, or null.
      const core = async z => {
        const v = z+1;
        if (z < 0 || !tokens[v] || !/^[Zz]u$/u.test(tokens[z][0]) || !joinedTokens(sentence,tokens,z,v) || !/^[a-zäöüß]/u.test(tokens[v][0])) return null;
        const rows = (await tokenAnalyses(tokens[v][0],undefined,'zuInfinitiveGroup'))
          .filter(a => a.kind === 'infinitive' && !a.zu && !a.detached && a.entry);
        let entries = [...new Map(rows.map(a => [a.entry.id ?? a.entry.word,a.entry])).values()];
        if (!rows.length) {
          // A verb known only to the additional dictionary: its lemma is this very spelling.
          const morph = await collectMorphology(tokens[v][0],{discoverModifiers:false},'zuInfinitiveGroup');
          if (morph.errors.length) return null;
          const lemmasHere = [...new Set(morph.analyses.filter(a => a.kind === 'lemma' && canonicalPos(a.pos) === 'Verb' &&
            norm(a.lemma) === norm(tokens[v][0])).map(a => a.lemma))];
          if (lemmasHere.length === 1) entries = [{word:lemmasHere[0],type:'Verb'}];
        }
        if (new Set(entries.map(e => norm(e.word))).size !== 1) return null;
        const after = tokens[v+1];
        let closes = !after || breaks(v) || ['und','oder','aber','sondern','sowie'].includes(norm(after[0]));
        if (!closes && /^\s+$/u.test(gapAfter(v)) && /^[a-zäöüß]/u.test(after[0]))
          closes = (await tokenAnalyses(after[0],undefined,'zuInfinitiveGroup')).some(a => ['finite','infinitive','participle'].includes(a.kind) && !a.detached);
        return closes ? {z,v,entries} : null;
      };
      // um / ohne / (an)statt … zu (reference 4.8, agreed 11 Oct 2026): the
      // opener starts its clause part (text start or after punctuation) and the
      // zu group closes the same part; um before a time (um 8 Uhr) is a preposition.
      const openerWords = {um:'um … zu',ohne:'ohne … zu',statt:'statt … zu',anstatt:'statt … zu'};
      const openerAt = i => {
        const record = openerWords[norm(tokens[i]?.[0])];
        if (!record || i > 0 && !breaks(i-1)) return null;
        if (/\d/u.test(gapAfter(i)) || norm(tokens[i+1]?.[0]) === 'uhr') return null;
        return (lemmas.get(norm(record)) || []).find(e => e.type === 'Konjunktion') || null;
      };
      let found = null, opener = null, conjunction = null;
      if (openerAt(clicked)) {
        for (let i = clicked+1; tokens[i] && !breaks(i-1); i++) {
          if (norm(tokens[i][0]) !== 'zu') continue;
          found = await core(i);
          if (found) { opener = clicked; break; }
        }
        if (!found) return null;
      } else {
        found = await core(norm(tokens[clicked][0]) === 'zu' ? clicked : clicked-1);
        if (!found) return null;
        let start = found.z;
        while (start > 0 && !breaks(start-1)) start--;
        if (start < found.z && openerAt(start)) opener = start;
      }
      if (opener !== null) conjunction = openerAt(opener);
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      const {z,v,entries} = found;
      if (conjunction) return {id:'zu-conjunction',label:conjunction.word,lemma:entries[0].word,conjunction,
        roles:[...entries,conjunction],main:entries[0],marker:clicked === z,
        note:{ru:conjunction.word+' + инфинитив',en:conjunction.word+' + infinitive'},spans:[span(opener),span(z),span(v)]};
      return {id:'zu-infinitive',label:'zu + Infinitiv',lemma:entries[0].word,roles:entries,main:entries[0],marker:clicked === z,
        note:{ru:'zu + инфинитив',en:'zu + infinitive'},spans:[span(z),span(v)]};
    }
    async function werdenGroup(word, context) {
      const clause = verbalClause(word,context,'werdenGroup',clauseBoundaries.werden);
      if (!clause) return null;
      const {tokens,selected,start,end,indices,matches,verbs,possessiveBeforeNoun} = clause;
      const finite = clause.finiteIn;
      const tenses = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].filter(t=>finite(e,i,t));
      const predicate = i => matches(i).filter(e=>e.type === "Adjektiv" || e.type === "Nomen" && /^[A-ZÄÖÜ]/u.test(tokens[i][0]));
      const participles = i => verbs(i).filter(e=>clause.participleOf(e,i));
      const infinitives = i => verbs(i).filter(e=>norm(e.word) === norm(tokens[i][0]) && /^[a-zäöü]/u.test(tokens[i][0]));
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && verbs(end+2).length) return null;
      const heads = indices.flatMap(i=>verbs(i).filter(e=>["werden","sein"].includes(e.word) && tenses(e,i).length).map(e=>({i,e})));
      const result = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        let main = [], linked = [], roles = [], id, note, meaning;
        if (head.e.word === "werden") {
          const tense = tenses(head.e,head.i);
          if (tense.includes("Konjunktiv II")) {
            main = infinitives(tail); id = "werden-conditional";
            note = {en:"Konjunktiv II",ru:"Konjunktiv II"};
            meaning = {en:"would",ru:"бы"};
          } else if (tense.includes("Präsens") && infinitives(tail).length) {
            main = infinitives(tail); id = "werden-future";
            // wohl supports inference; without it, both readings stay possible.
            const guess = indices.some(i=>norm(tokens[i][0]) === "wohl");
            note = guess ? {en:"Inference",ru:"Предположение"} : {en:"Future / inference",ru:"Будущее / предположение"};
            meaning = guess ? {en:"probably",ru:"вероятно"} : {en:"will / probably",ru:"будет / вероятно"};
          } else if (participles(tail).length) {
            main = participles(tail); id = "werden-passive";
            note = {en:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`,ru:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`};
            meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
          } else if (!verbs(tail).length) {
            main = predicate(tail); id = "werden-become";
            note = {en:"Becoming",ru:"Становление"};
          }
          linked = [head.i,tail]; roles = [head.e,...main];
          // Step 6 block 7: werden + participle + haben/sein is a perfect
          // infinitive (Futur II / Konjunktiv II Perfekt). When the lexical verb
          // gives no auxiliary (external data), Futur II is not proven, and the
          // chain must not be relabelled as Futur I / würde of haben or sein.
          if (["werden-future","werden-conditional"].includes(id) && main.some(e=>["haben","sein"].includes(e.word)) &&
              tail-1 > start && tail-1 !== head.i && /^[a-zäöü]/u.test(tokens[tail-1][0]) &&
              (await tokenAnalyses(tokens[tail-1][0],undefined,'werdenGroup')).some(a=>a.kind === "participle")) continue;
        } else if (!tenses(head.e,head.i).includes("Konjunktiv II")) {
          const tailWord = norm(tokens[tail][0]);
          const werden = verbs(tail).filter(e=>e.word === "werden");
          if (werden.length !== 1 || tail-1 === head.i) continue;
          const tense = finite(head.e,head.i,"Präteritum") ? "Plusquamperfekt" : "Perfekt";
          if (tailWord === "worden") {
            main = participles(tail-1); id = "werden-passive-perfect";
            note = {en:`Passiv · ${tense}`,ru:`Passiv · ${tense}`};
            meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
          } else if (tailWord === "geworden" && !verbs(tail-1).length) {
            main = predicate(tail-1); id = "werden-become-perfect";
            note = {en:`${tense} · becoming`,ru:`${tense} · становление`};
          }
          linked = [head.i,tail-1,tail]; roles = [head.e,...main,...werden];
        }
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1 || !linked.includes(selected)) continue;
        if (indices.some(i=>!linked.includes(i) && clause.possibleVerb(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
        result.push({id,note,meaning:head.e.word === "werden" && selected !== head.i ? null : meaning,lemma:main[0].word,roles,spans:[...linked].sort((a,b)=>a-b).map(clause.span)});
      }
      // A3 (15.10.2026), reference 5.6: passive with a modal verb (Das Buch muss
      // gelesen werden). A finite modal, then a participle directly before the
      // infinitive werden that closes the clause. The participle is an own verb's
      // or, as in B16, an external verb's explicit past participle. werden after a
      // noun or adjective stays "become" (… könnte er Stadtmusikant werden).
      // Old spellings of müssen (muß, mußte) are the same modal forms.
      const modalFinite = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].some(t => Object.values(formsOf(e)[t] || {})
        .some(f => norm(f) === norm(tokens[i][0]) || norm(f) === norm(tokens[i][0]).replace(/ß/gu,'ss')));
      const modalAt = i => [...verbs(i),...(norm(tokens[i][0]).includes('ß') ? (forms.get(norm(tokens[i][0]).replace(/ß/gu,'ss')) || []).filter(e=>e.type === "Verb") : [])]
        .filter(e => modalWords.has(e.word) && modalFinite(e,i));
      const modalIndices = indices.filter(i => modalAt(i).length);
      // Main clause: modal … participle werden. Subordinate clause: participle werden modal.
      const frames = [];
      if (norm(tokens[end][0]) === "werden") frames.push({part:end-1,aux:end});
      if (end-1 > start && norm(tokens[end-1][0]) === "werden" && modalIndices.includes(end)) frames.push({part:end-2,aux:end-1});
      if (modalIndices.length === 1) for (const {part,aux} of frames) {
        const m = modalIndices[0];
        if (part <= start && part !== 0 || part === m || !/^\p{Ll}/u.test(tokens[part][0]) || m > part && m !== aux+1) continue;
        const head = {i:m,e:modalAt(m)[0]}, werden = verbs(aux).filter(e=>e.word === "werden");
        let main = participles(part);
        if (!main.length && !verbs(part).length) main = await externalParticiple(tokens[part][0]);
        const linked = [head.i,part,aux].sort((a,b)=>a-b);
        if (werden.length === 1 && main.length && new Set(main.map(e=>norm(e.word))).size === 1 && linked.includes(selected) &&
            !indices.some(i=>!linked.includes(i) && clause.possibleVerb(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i)))
          // The modal frame is the whole chain; a werden-passive reading of the same words gives way.
          return {id:"modal-passive",modal:head.e.word,note:{en:`Passiv mit ${head.e.word}`,ru:`Passiv mit ${head.e.word}`},
            meaning:selected === aux ? {en:"passive auxiliary",ru:"вспомогательный глагол пассива"} : null,
            lemma:main[0].word,roles:[head.e,...main,...werden],spans:linked.map(clause.span)};
      }
      return result.length === 1 ? result[0] : null;
    }
    const modalWords = new Set(["können","müssen","dürfen","sollen","wollen","mögen","möchten"]);
    // A3 / B16: the explicit past participle of a verb only the external dictionary knows.
    async function externalParticiple(form) {
      let facts;
      try { facts = await lexicalLookup(form,'externalParticiple'); } catch (_) { return []; }
      const known = new Set(facts.filter(g => !g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length).map(g => norm(g.word)));
      const lemmas = new Set([
        ...facts.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
          .filter(r => r.tags?.includes('participle') && r.tags.includes('past') && norm(r.form) === norm(form)).map(r => norm(r.lemma)),
        ...facts.filter(g => g.kind === 'form-note' && canonicalPos(g.pos) === 'Verb').flatMap(g => g.meanings || [])
          .map(m => /^past participle of ([\p{L}\p{M}]+)/iu.exec(m)?.[1]).filter(Boolean).map(norm)].filter(l => known.has(l)));
      return lemmas.size === 1 ? [{word:[...lemmas][0],type:"Verb"}] : [];
    }
    // Grammar probes must not evict the reader's lexical/display cache.
    function lassenLexicalLookup(word) { return sourceLookup(word,'lassenLexicalLookup','grammar'); }
    // Lassen selects a bare infinitive. Structure does not decide permission,
    // causation or the controller of an accompanying personal pronoun.
    // Reviewed historical spellings, scoped to proven lassen chains. This is
    // not a global ss/ß rewrite and never corrects arbitrary input typos.
    const lassenHistoricalForms = new Map([['läßt','lässt'],['laß','lass'],['mußten','mussten']]);
    const lassenForm = word => lassenHistoricalForms.get(norm(word)) || word;
    async function lassenGroup(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset) || (!candidates.some(c=>canonicalPos(c.pos)==='Verb') && !lassenHistoricalForms.has(norm(word)))) return null;
      const sentence=String(context.sentence || ""),tokens=sharedTokens(sentence,'lassenGroup');
      if(!tokens.some(t=>(forms.get(norm(lassenForm(t[0])))||[]).some(e=>e.type==='Verb'&&e.word==='lassen')))return null;
      const clicked=clickedTokenIndex(tokens,context.tokenOffset,word);
      if(clicked<0)return null;
      const boundaries=new Set(['und','oder','aber','denn','sondern','doch','weil','dass','daß','wenn','ob','bevor','nachdem','obwohl','während','falls','damit','sobald']);
      // A comma introducing an additive phrase need not close the verbal
      // bracket. But auch wenn introduces a separate subordinate clause;
      // its initial auch must not be pulled into the preceding verbal bracket.
      // Other finite predicates below still block attachment.
      const connected=(a,b)=>!/[;:.!?…“”„"«»()–—]/u.test(clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index))) && (!/,/u.test(clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index))) || ['auch','noch'].includes(norm(tokens[b][0])) && !(norm(tokens[b][0])==='auch'&&norm(tokens[b+1]?.[0])==='wenn'));
      const nominalAls=i=>norm(tokens[i]?.[0])==='als' &&
        [i+1,i+2].some(j=>tokens[j] && /^[A-ZÄÖÜ]/u.test(tokens[j][0]) &&
          (forms.get(norm(tokens[j][0]))||[]).some(e=>e.type==='Nomen')) &&
        (i+1===tokens.length-1 || !subjectPersons[norm(tokens[i+1]?.[0])]);
      const boundary=i=>boundaries.has(norm(tokens[i]?.[0])) || norm(tokens[i]?.[0])==='als'&&!nominalAls(i);
      let start=clicked,end=clicked;
      while(start>0&&connected(start-1,start)&&!boundary(start-1))start--;
      while(end+1<tokens.length&&connected(end,end+1)&&!boundary(end+1))end++;
      const indices=Array.from({length:end-start+1},(_,i)=>start+i),analyses=await Promise.all(indices.map(i=>tokenAnalyses(lassenForm(tokens[i][0]),lassenLexicalLookup, 'lassenGroup')));
      const rows=i=>analyses[i-start]||[], words=i=>norm(lassenForm(tokens[i]?.[0] || ""));
      const finite=i=>rows(i).filter(a=>['finite','imperative'].includes(a.kind)&&!a.detached);
      const infinitives=i=>rows(i).filter(a=>a.kind==='infinitive'&&!a.zu&&!a.detached&&a.base===words(i)&&words(i-1)!=='zu'&&/^[a-zäöü]/u.test(tokens[i]?.[0]||''));
      const outerBases=new Set(['haben','werden','können','müssen','dürfen','sollen','wollen','mögen','möchten']);
      const groups=[];
      for(const l of indices.filter(i=>rows(i).some(a=>a.base==='lassen'))) {
        let part,outer=null,headRows=[],tense;
        // End-position finite modal/werden controls the replacement bracket.
        if(l===end-1&&words(l)==='lassen'&&finite(end).some(a=>outerBases.has(a.base)&&a.base!=='haben')) {
          part=l-1;outer=end;headRows=finite(end).filter(a=>outerBases.has(a.base)&&a.base!=='haben');
        } else if(l===end&&words(l)==='lassen'&&infinitives(l).some(a=>a.base==='lassen')) {
          const helpers=indices.filter(i=>i!==l&&i!==l-1&&finite(i).some(a=>outerBases.has(a.base)));
          if(helpers.length===1){outer=helpers[0];headRows=finite(outer).filter(a=>outerBases.has(a.base));part=l-1;}
          else {headRows=finite(l).filter(a=>a.base==='lassen');part=l-1;}
        } else {headRows=finite(l).filter(a=>a.base==='lassen');part=l===end?l-1:end;}
        // Clause-final lassen is also an infinitive. A finite reading needs
        // its own agreeing plural subject; do not invent an omitted helper
        // after a comma or borrow a subject from an earlier clause.
        if(outer===null && l===end && words(l)==='lassen') {
          const pluralSubject=indices.some(i=>i!==l && ['wir','sie'].includes(words(i))) ||
            indices.some(i=>i!==l && /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && ['die','diese','jene'].includes(words(i-1)) &&
              (forms.get(words(i))||[]).some(e=>e.type==='Nomen'&&String(e.plural||'').split(/\s*,\s*/u).some(p=>norm(p)===words(i))));
          if(!pluralSubject)continue;
        }
        if(part<start||part===outer||part===l||!headRows.length)continue;
        const inner=infinitives(part),bases=new Set(inner.map(a=>a.base));
        if(!inner.length||bases.size!==1)continue;
        // The own möchten card and the Konjunktiv II of mögen describe
        // the same finite paradigm. Share structural proof, retaining both
        // dictionary identities and the formal Konjunktiv II analysis.
        const moechteHead=outer!==null && headRows.some(a=>a.base==='möchten'&&a.entry&&a.tense==='Präsens') &&
          headRows.some(a=>a.base==='mögen'&&a.entry&&a.tense==='Konjunktiv II') &&
          headRows.every(a=>['möchten','mögen'].includes(a.base));
        // Generic fallback "subjunctive" tags are not evidence for Konjunktiv I
        // here. Our paired form tables prove the finite present/KII readings;
        // mechanically generated imperative readings do not control this bracket.
        if(moechteHead)headRows=headRows.filter(a=>a.kind==='finite'&&a.entry&&
          (a.base==='möchten'&&a.tense==='Präsens'||a.base==='mögen'&&a.tense==='Konjunktiv II'));
        const headBases=new Set(headRows.map(a=>moechteHead?'mögen':a.base));if(headBases.size!==1)continue;
        if(moechteHead&&subjectPersons[words(start)]&&!headRows.some(a=>subjectPersons[words(start)].includes(a.person)))continue;
        const head=moechteHead?headRows.find(a=>a.base==='mögen'):headRows[0],linked=[l,part,...(outer!==null?[outer]:[])];
        // Conditional/reported perfect replacement needs its own tense label.
        if(outer!==null&&head.base==='haben'&&!headRows.some(a=>['Präsens','Präteritum'].includes(a.tense)))continue;
        if(!linked.includes(clicked))continue;
        const ownNoun=i=>/^[A-ZÄÖÜ]/u.test(tokens[i][0])&&(forms.get(words(i))||[]).some(e=>e.type==='Nomen');
        const possessive=i=>/^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(words(i))&&i+1<=end&&ownNoun(i+1);
        const attributive=async i=>{
          if(!(modifiers.get(words(i))||[]).some(a=>a.kind.startsWith('participle-')))return false;
          let noun=i+1;
          // The final component supplies the gender of a hyphenated noun.
          if(noun+1<=end && /^-$/u.test(sentence.slice(tokens[noun].index+tokens[noun][0].length,tokens[noun+1].index)))noun++;
          if(!tokens[noun] || !/^[A-ZÄÖÜ]/u.test(tokens[noun][0]))return false;
          const own=(forms.get(words(noun))||[]).filter(e=>e.type==='Nomen');
          let imported=[];
          if(!own.length)try{imported=await lassenLexicalLookup(tokens[noun][0]);}catch(_){return false;}
          if(!own.length&&!imported.some(g=>!g.kind&&!g.unresolved&&g.meanings?.length&&canonicalPos(g.pos)==='Nomen'))return false;
          const gender=own.map(e=>e.article);
          for(let j=i-1;j>=start&&i-j<=8;j--){
            if(subjectPersons[words(j)] || !ownNoun(j)&&finite(j).length)return false;
            if(['der','die','das','den','dem','des'].includes(words(j)))return (words(i).endsWith('e')&&(!own.length||gender.includes(words(j)))) ||
              (words(i).endsWith('en')&&['den','dem','des'].includes(words(j)));
          }
          return false;
        };
        // In an imperative, mal between its head and object is a modal particle;
        // it is not a second imperative of malen.
        const modalParticle=i=>words(i)==='mal'&&head.kind==='imperative'&&l<i&&i<part;
        let competing=false;
        for(const i of indices)if(!linked.includes(i)&&rows(i).some(a=>['finite','imperative','infinitive','participle'].includes(a.kind))&&
          !ownNoun(i)&&!possessive(i)&&!modalParticle(i)&&!await attributive(i)){competing=true;break;}
        if(competing)continue;
        if(['und','oder'].includes(words(end+1))) {
          let independent=words(end+2)==='zwar';
          const next=end+2,subject=words(next);
          if(!independent && next<tokens.length) {
            let headIndex=next+1,persons=subjectPersons[subject];
            if(!persons && ['der','die','das','ein','eine'].includes(subject) && tokens[headIndex] &&
              /^[A-ZÄÖÜ]/u.test(tokens[headIndex][0]) && (forms.get(words(headIndex))||[]).some(e=>e.type==='Nomen')) {
              persons=['er/sie/es','sie'];headIndex++;
            }
            if(persons && headIndex<tokens.length && connected(next,headIndex)) {
              const nextRows=await tokenAnalyses(lassenForm(tokens[headIndex][0]),lassenLexicalLookup, 'lassenGroup');
              independent=!nextRows.some(a=>a.kind==='infinitive') && nextRows.some(a=>a.kind==='finite'&&!a.detached&&persons.includes(a.person));
            }
          }
          // A second finite predicate can reuse an explicit personal subject.
          // Require agreement with both heads and exclude infinitive homographs.
          if(!independent && next<tokens.length && words(end+1)==='und' && subjectPersons[words(start)] && start<(outer??l)) {
            const nextRows=await tokenAnalyses(lassenForm(tokens[next][0]),lassenLexicalLookup, 'lassenGroup');
            independent=connected(end+1,next) && !nextRows.some(a=>a.kind==='infinitive') &&
              nextRows.some(a=>a.kind==='finite'&&!a.detached&&headRows.some(h=>h.person===a.person)&&subjectPersons[words(start)].includes(a.person));
          }
          // A modal can govern a separate coordinated infinitive. Keep the
          // lassen spans local; the other infinitive is not a lassen complement.
          // Only a single bare infinitive, optionally preceded by dictionary
          // adverbs, proves this narrow continuation. Extra verbs remain blocked.
          if(!independent && next<tokens.length && outer!==null && modalLemmas.has(head.base) && words(end+1)==='und') {
            let tail=next;
            while(tail+1<tokens.length&&connected(tail,tail+1)&&!boundary(tail+1))tail++;
            const tailRows=await Promise.all(Array.from({length:tail-next+1},(_,k)=>tokenAnalyses(lassenForm(tokens[next+k][0]),lassenLexicalLookup, 'lassenGroup')));
            const last=tailRows[tail-next]||[];
            independent=connected(end+1,next) && last.some(a=>a.kind==='infinitive'&&!a.zu&&!a.detached&&a.base===words(tail)&&a.base!=='lassen') &&
              /^[a-zäöü]/u.test(tokens[tail][0]) && words(tail-1)!=='zu' &&
              tailRows.slice(0,-1).every((rs,k)=>!rs.length&&(forms.get(words(next+k))||[]).some(e=>e.type==='Adverb'));
          }
          if(!independent)continue;
        }
        const lexical=[...new Map(inner.map(a=>[a.entry?.id||a.base,a.entry||{word:a.base,type:'Verb'}])).values()];
        const lassen=(forms.get(words(l))||[]).filter(e=>e.type==='Verb'&&e.word==='lassen');
        if(!lassen.length)continue;
        const helpers=headRows.map(a=>a.entry).filter(Boolean);
        tense=outer===null?head.tense:head.base==='haben'?headRows.some(a=>a.tense==='Präteritum')?'Plusquamperfekt':'Perfekt':head.base==='werden'?headRows.some(a=>a.tense==='Konjunktiv II')?'Konjunktiv II':'Futur I':head.tense;
        const replacement=outer!==null&&head.base==='haben';
        groups.push({id:'lassen-infinitive',label:replacement?tense+' · lassen':tense==='Futur I'||tense==='Konjunktiv II'?tense+' · lassen':'lassen + Infinitiv',tense,lemma:inner[0].base,roles:[...lassen,...lexical,...helpers],
          note:{ru:(replacement?tense+' · haben + Infinitiv + lassen':outer!==null?tense+' · ':'')+(replacement?'':'lassen + инфинитив')+' · значение определяется контекстом'+(moechteHead?' · möchte: форма Konjunktiv II от mögen; отдельная карточка möchten':''),en:(replacement?tense+' · haben + infinitive + lassen':outer!==null?tense+' · ':'')+(replacement?'':'lassen + infinitive')+' · meaning depends on context'+(moechteHead?' · möchte: Konjunktiv II form of mögen; separate möchten card':'')},
          spans:[...new Set(linked)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))});
      }
      return groups.length===1?groups[0]:null;
    }
    // Step 6: verbal construction producers in explicit priority order. Each
    // returns a construction hypothesis {id, roles, spans, ...} or null; the
    // first proven hypothesis is used and later producers are not consulted.
    // None of them selects a card: the selection core decides (single-construction).
    const constructionProducers = Object.freeze([
      {id:'future-perfect',produce:(word,context) => futurePerfectGroup(word,context),nounGroups:true},
      {id:'lassen',produce:(word,context,candidates) => lassenGroup(word,context,candidates)},
      {id:'zu',produce:(word,context) => zuGroup(word,context),nounGroups:true},
      {id:'werden',produce:(word,context) => werdenGroup(word,context),nounGroups:true},
      {id:'verb-group',produce:(word,context) => reflexiveGroupLemma(verbGroup(word,context),context),nounGroups:true},
      {id:'external-perfect',produce:(word,context) => externalPerfectGroup(word,context),nounGroups:true},
      {id:'zu-infinitive',produce:(word,context) => zuInfinitiveGroup(word,context)}
    ].map(row => Object.freeze(row)));
    // A1: a perfect or modal group of a verb with an own reflexive card is named
    // after it (Perfekt mit sich waschen) only when the reflexive link of the
    // lexical verb is confirmed in the sentence (Er hat sich gewaschen); the plain
    // verb otherwise (Er hat das Auto gewaschen).
    async function reflexiveGroupLemma(group, context) {
      const reflexive = group?.lexical?.reflexive || [];
      if (!reflexive.length || norm(group.lemma).startsWith("sich ")) return group;
      const linked = await reflexiveCandidates(group.lexical.word,{...context,tokenOffset:group.lexical.offset});
      const confirmed = reflexive.filter(e => linked.some(c => c.dictionaryId === e.id && c.construction?.id === "reflexive-verb" &&
        c.construction.confidence !== "tentative" && !c.reflexiveUnconfirmed));
      return confirmed.length === 1 ? {...group,lemma:confirmed[0].word} : group;
    }
    async function runConstructionProducers(word, context, candidates, producers) {
      for (const producer of producers) {
        const pending = producer.produce(word,context,candidates);
        const group = pending && typeof pending.then === 'function' ? await pending : pending;
        if (group) return group;
      }
      return null;
    }
    // Step 6 block 6: offsets of possible verb forms that are declined modifiers
    // of a confirmed noun group (determiner + modifiers + head, agreement checked
    // against the determiner's form features). Computed only when no chain was
    // found and the sentence has such a lowercase verb form after a determiner.
    async function attributiveModifierOffsets(context) {
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'attributiveModifierOffsets'), offsets = new Set();
      for (let i = 1; i < tokens.length; i++) {
        if (!/^[a-zäöüß]/u.test(tokens[i][0]) || !/(?:e|en|em|er|es)$/u.test(norm(tokens[i][0])) ||
            !((forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Verb") || separatedForms.has(norm(tokens[i][0])))) continue;
        for (let d = i-1; d >= 0 && i-d <= 3; d--) {
          if (!/^[a-zäöüß]/u.test(tokens[d][0]) && d !== 0) break;
          const features = determinerFeatures(tokens[d][0]);
          if (!features) continue;
          const group = await nounGroupAfter(sentence,tokens,d,{determiner:false,consumer:'attributiveModifierOffsets'});
          if (group.readings && group.modifiers.some(m => m.index === i) && agreeingFeatures(features,group,null).length) offsets.add(tokens[i].index);
          break;
        }
      }
      return offsets;
    }
    const attributiveOffsetCache = new Map();
    async function verbConstruction(word, context, candidates) {
      const group = await runConstructionProducers(word,context,candidates,constructionProducers);
      // Only a clicked verb form can belong to a chain the second pass might prove.
      if (group || !Number.isInteger(context?.tokenOffset) || !candidates.some(c => canonicalPos(c.pos) === "Verb")) return group;
      syncSourceVersion();
      const key = JSON.stringify([sourceVersion(),morphologyEpoch,String(context.sentence || "")]);
      if (!attributiveOffsetCache.has(key)) {
        if (attributiveOffsetCache.size >= 64) attributiveOffsetCache.delete(attributiveOffsetCache.keys().next().value);
        const pending = attributiveModifierOffsets(context);
        attributiveOffsetCache.set(key,pending);
        pending.catch(() => { if (attributiveOffsetCache.get(key) === pending) attributiveOffsetCache.delete(key); });
      }
      const attributiveOffsets = await attributiveOffsetCache.get(key);
      if (!attributiveOffsets.size) return null;
      return runConstructionProducers(word,{...context,attributiveOffsets},candidates,constructionProducers.filter(p => p.nounGroups));
    }
    // Cards a proven hypothesis needs although the lookup did not supply them:
    // historical lassen spellings and a complete verb joined with zu.
    function constructionCandidates(group, word, candidates) {
      const added = [];
      // Historical form aliases enter the UI only after a full chain is proven.
      // Keep the original token and offsets for highlighting and saved choices.
      if(group?.id==='lassen-infinitive' && lassenHistoricalForms.has(norm(word))) {
        for(const entry of group.roles.filter(e=>e.id && (forms.get(norm(lassenForm(word)))||[]).some(f=>f.id===e.id)))
          if(![...candidates,...added].some(c=>c.dictionaryId===entry.id))added.push(mainCandidate(entry));
      }
      // Joined zu forms can belong to a complete verb missing from ours;
      // keep that recognised target rather than guessing from its stem.
      if (group?.main?.importedSeparable && ![...candidates,...added].some(c=>norm(c.lemma) === norm(group.main.word) && canonicalPos(c.pos) === "Verb"))
        added.push(mainCandidate(group.main));
      // um / ohne / statt … zu: the conjunction card of the tapped opener.
      if (group?.id === 'zu-conjunction' && norm(group.spans[0].text) === norm(word) && !group.marker &&
          ![...candidates,...added].some(c=>c.dictionaryId === group.conjunction.id))
        added.push(mainCandidate(group.conjunction));
      return added;
    }
    // One place matches the hypothesis roles to candidate cards.
    function withConstructionRole(group, candidate) {
      const {roles,main,marker,meaning,meaningLemma,conjunction,...construction} = group, c = candidate;
      if ((c.reflexiveUnconfirmed && group.id !== "werden-future-perfect") || c.construction?.id === "reflexive-verb" && !(group.id==='lassen-infinitive'&&c.construction.attachmentOnly)) return c;
      if (group.marker && c.lemma === "zu" && canonicalPos(c.pos) === "particle")
        return {...c,construction,translation:{en:"infinitive marker",ru:"частица инфинитива"}};
      return roles.some(e => norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos) &&
        (!["werden-future-perfect","lassen-infinitive"].includes(group.id) || !c.dictionaryId || e.id === c.dictionaryId))
        ? {...c,construction:norm(construction.lemma || "").startsWith("sich ") && norm(c.lemma) === norm(construction.lemma).replace(/^sich\s+/u,"")
            ? {...construction,lemma:c.lemma} : construction,
          ...(c.lemma === (group.meaningLemma || "werden") && group.meaning ? {translation:group.meaning} : {})} : c;
    }
    // Adapter: construction hypotheses (verbal group, separated pair) become
    // proposals and choice blocks of the selection core.
    function constructionSelection(candidates, separated) {
      const same = (a,b) => window.BibliothekVocabulary.identity(a) === window.BibliothekVocabulary.identity(b);
      const grouped = candidates.filter(c => c.construction && !(c.reflexiveUnconfirmed && c.construction.id === "werden-future-perfect") && !["separable-verb","reflexive-verb"].includes(c.construction.id));
      const needsSeparableChoice = candidates.some(c => c.construction?.id === "separable-verb" && c.construction.confidence === "tentative");
      return {grouped,
        proposals:{
          'single-construction':{candidate:grouped.length === 1 ? grouped[0] : null},
          'separated-verb':{candidate:separated.length === 1 && separated[0].construction.confidence !== "tentative" ? candidates.find(c => same(c,separated[0])) : null,
            evidence:separated.some(c => c.construction.confidence !== "tentative") ? "separated-verb-pair" : separated.length ? "tentative-separated-verb-pair" : null}},
        blocks:[
          {id:'separable-choice',active:needsSeparableChoice,requiresChoice:true},
          {id:'short-imperative-conflict',active:!!separated.shortImperativeConflict,requiresChoice:false}]};
    }
    // A perfect infinitive belongs to Futur II only when its lexical verb
    // explicitly licenses the final auxiliary. Never infer this from proximity.
    function futurePerfectGroup(word, context) {
      const clause = verbalClause(word,context,'futurePerfectGroup',clauseBoundaries.futurePerfect,clauseGaps.dashed);
      if (!clause) return null;
      const {tokens,selected:clicked,start,end,indices,verbs,possessiveBeforeNoun} = clause;
      const heads=indices.flatMap(i=>verbs(i).filter(e=>e.word === "werden" && clause.finiteIn(e,i,"Präsens")).map(e=>({i,e})));
      const groups=[];
      for(const head of heads) {
        const helper=head.i===end ? end-1 : end, part=helper-1;
        if(part<start || part===head.i || helper===head.i) continue;
        const auxiliaries=verbs(helper).filter(e=>["haben","sein"].includes(e.word) && norm(tokens[helper][0])===e.word && /^[a-zäöü]/u.test(tokens[helper][0]));
        if(auxiliaries.length !== 1) continue;
        const aux=auxiliaries[0];
        const main=verbs(part).filter(e=>norm(e.auxiliary)===aux.word &&
          norm(String(e.perfect_form || "").trim().split(/\s+/u).pop())===norm(tokens[part][0]) && /^[a-zäöü]/u.test(tokens[part][0]));
        const bases=new Set(main.map(e=>norm(e.word).replace(/^sich\s+/u,"")));
        if(!main.length || bases.size !== 1) continue;
        const linked=[head.i,part,helper];
        if(!linked.includes(clicked)) continue;
        // Declined modifiers and noun phrases are not competing predicates.
        // Unclassified verb homographs, coordination and extra verbs block proof.
        if(indices.some(i=>!linked.includes(i) && clause.possibleVerb(i) && !clause.nounToken(i) && !possessiveBeforeNoun(i))) continue;
        if(["und","oder"].includes(norm(tokens[end+1]?.[0])) && verbs(end+2).length) continue;
        groups.push({id:"werden-future-perfect",label:"Futur II",tense:"Futur II",lemma:[...bases][0],roles:[head.e,...main,aux],
          note:{ru:"Futur II · завершённое действие в будущем / предположение о завершённом действии",en:"Futur II · completed future action / inference about a completed event"},
          meaning:clicked===head.i ? {ru:"вспомогательный глагол Futur II",en:"Futur II auxiliary"} : null,
          spans:linked.sort((a,b)=>a-b).map(clause.span)});
      }
      return groups.length===1 ? groups[0] : null;
    }
    // Deliberately small clause-local patterns. No proximity-only attachment.
    function verbGroup(word, context) {
      const clause = verbalClause(word,context,'verbGroup',clauseBoundaries.verbGroup);
      if (!clause) return null;
      const {tokens,selected,start,end,indices} = clause, matches = clause.verbs;
      const finiteTenses = (e,i) => ["Präsens","Präteritum"].filter(tense => clause.finiteIn(e,i,tense));
      // A1: the reflexive card (sich beeilen) is a reading of the same verb; its
      // base is compared without sich, as in Futur II.
      const base = e => norm(e.word).replace(/^sich\s+/u,"");
      // Reflexive-only verbs (sich beeilen) have their bare forms in the reflexive index.
      const reflexiveRows = (i,tense) => (reflexiveForms.get(norm(tokens[i][0])) || []).filter(row => row.tense === tense).map(row => row.entry);
      const withReflexive = (rows,extra) => [...rows,...extra.filter(e => !rows.some(r => r.id === e.id))];
      const infinitives = i => withReflexive(matches(i),reflexiveRows(i,"Infinitiv")).filter(e => base(e) === norm(tokens[i][0]) && /^[a-zäöü]/u.test(tokens[i][0]));
      const modals = new Set(["können","müssen","dürfen","sollen","wollen","mögen","möchten"]);
      const heads = indices.flatMap(i => matches(i).filter(e => (["haben","sein"].includes(e.word) || modals.has(e.word)) && finiteTenses(e,i).length).map(e=>({i,e})));
      // Shared auxiliaries across coordination need a broader analysis.
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && matches(end+2).length) return null;
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        let linked = [], roles = [], id, label, main, mainIndex = tail;
        if (modals.has(head.e.word)) {
          main = infinitives(tail);
          id = "modal-group"; label = "Modal";
          linked = [head.i,tail]; roles = [head.e,...main];
        } else {
          const modal = infinitives(tail).filter(e=>modals.has(e.word));
          const lexical = tail-1 !== head.i ? infinitives(tail-1) : [];
          if (head.e.word === "haben" && modal.length === 1 && lexical.length && new Set(lexical.map(base)).size === 1) {
            main = lexical; id = "modal-perfect"; mainIndex = tail-1;
            linked = [head.i,tail-1,tail]; roles = [head.e,...lexical,...modal];
          } else {
            main = withReflexive(matches(tail),reflexiveRows(tail,"Partizip II")).filter(e => clause.participleOf(e,tail) && norm(e.auxiliary) === head.e.word);
            id = "perfect-group"; linked = [head.i,tail]; roles = [head.e,...main];
          }
          label = finiteTenses(head.e,head.i).includes("Präteritum") ? "Plusquamperfekt" : "Perfekt";
        }
        if (!main.length || new Set(main.map(base)).size !== 1 || !linked.includes(selected)) continue;
        // A second possible verb outside the group makes attachment uncertain.
        if (indices.some(i => !linked.includes(i) && clause.possibleVerb(i) && !clause.nounToken(i))) continue;
        // The group names the plain verb; a confirmed reflexive reading adds sich
        // in the card (reflexive-verb construction), not here.
        // Without a confirmed reflexive link the group names the bare verb, also
        // when only a reflexive card exists (Das hat ihn gefreut: mit freuen).
        const plain = main.find(e => norm(e.word) === base(e));
        const group = {id,label,lemma:plain ? plain.word : String(main[0].word).replace(/^sich\s+/u,""),roles,spans:[...linked].sort((a,b)=>a-b).map(clause.span)};
        // Non-enumerable: where the lexical verb stands and its reflexive readings
        // (reflexiveGroupLemma names the group after a confirmed one).
        Object.defineProperty(group,'lexical',{value:{offset:tokens[mainIndex].index,word:tokens[mainIndex][0],
          reflexive:main.filter(e => norm(e.word) !== base(e))},enumerable:false});
        groups.push(group);
      }
      return groups.length === 1 ? groups[0] : null;
    }
    // B16 (15.10.2026): Perfekt / Plusquamperfekt of a verb only the external
    // dictionary knows (Er hat das Bild betrachtet). Same frame as verbGroup:
    // finite haben / sein of the own dictionary, the participle closes the
    // clause, no other possible verb. The participle needs explicit evidence
    // (past participle row or note, or a derived regular weak participle, B3)
    // and the export must list the verb with that auxiliary.
    async function externalPerfectGroup(word, context) {
      if (!fallback.perfectAuxiliaries) return null;
      const clause = verbalClause(word,context,'externalPerfectGroup',clauseBoundaries.verbGroup);
      if (!clause) return null;
      const {tokens,selected,start,end,indices} = clause, matches = clause.verbs;
      if (["und","oder"].includes(norm(tokens[end+1]?.[0])) && matches(end+2).length) return null;
      const finiteTenses = (e,i) => ["Präsens","Präteritum"].filter(tense => clause.finiteIn(e,i,tense));
      const heads = indices.flatMap(i => matches(i).filter(e => ["haben","sein"].includes(e.word) && finiteTenses(e,i).length).map(e => ({i,e})));
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i || ![head.i,tail].includes(selected)) continue;
        const form = tokens[tail][0];
        if (!/^\p{Ll}/u.test(form) || matches(tail).length || separatedForms.has(norm(form))) continue;
        if (indices.some(i => i !== head.i && i !== tail && clause.possibleVerb(i) && !clause.nounToken(i))) continue;
        let facts;
        try { facts = await lexicalLookup(form,'externalPerfectGroup'); } catch (_) { return null; }
        const verbsKnown = new Set(facts.filter(g => !g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length).map(g => norm(g.word)));
        const lemmas = new Set([
          ...facts.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
            .filter(r => r.tags?.includes('participle') && r.tags.includes('past') && norm(r.form) === norm(form)).map(r => norm(r.lemma)),
          ...facts.filter(g => g.kind === 'form-note' && canonicalPos(g.pos) === 'Verb').flatMap(g => g.meanings || [])
            .map(m => /^past participle of ([\p{L}\p{M}]+)/iu.exec(m)?.[1]).filter(Boolean).map(norm)
        ].filter(lemma => verbsKnown.has(lemma)));
        if (lemmas.size !== 1) continue;
        const [lemma] = lemmas;
        let auxiliaries;
        try { auxiliaries = await fallback.perfectAuxiliaries(lemma); } catch (_) { return null; }
        if (!auxiliaries.includes(head.e.word)) continue;
        groups.push({id:"perfect-group",label:finiteTenses(head.e,head.i).includes("Präteritum") ? "Plusquamperfekt" : "Perfekt",
          lemma,roles:[head.e,{word:lemma,type:"Verb"}],spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span)});
      }
      return groups.length === 1 ? groups[0] : null;
    }
    // Step 8: possessive/pronoun readings of sein and ihr as named rows of the
    // contextual group of selectionRules; the first row whose context holds settles.
    function contextualClause(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const tokens = sharedTokens(String(context.sentence || ""),'contextualRank');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      // A4 (15.10.2026): every possessive before a noun (mein Buch), not only sein / ihr;
      // mein / unser are also archaic genitives of ich / wir (gedenke mein).
      if (index < 0 || !/^(?:(?:sein|ihr)(?:e|en|em|er|es|s)?|(?:mein|dein|unser|euer|eur)(?:e|en|em|er|es)?)$/u.test(norm(word)))
        return null;
      // Punctuation blocks clues: do not join separate clauses or quoted phrases.
      const adjacent = (a,b) => !/[,;:.!?“”„"()]/u.test(context.sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index));
      const next = index + 1, previous = index - 1;
      const boundaryWords = new Set(["und","oder","aber","denn","sondern","weil","dass","wenn","ob","doch"]);
      let start = index, end = index;
      while (start > 0 && adjacent(start-1,start) && !boundaryWords.has(norm(tokens[start-1][0]))) start--;
      while (end + 1 < tokens.length && adjacent(end,end+1) && !boundaryWords.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const isAdjective = i => matches(i).some(e => e.type === "Adjektiv") ||
        ["e","en","em","er","es"].some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      let nounPhrase = false;
      for (let i = next; i < tokens.length && i <= next + 2; i++) {
        if (!adjacent(i-1,i)) break;
        if (matches(i).some(e => e.type === "Nomen") && /^[A-ZÄÖÜ]/u.test(tokens[i][0])) { nounPhrase = true; break; }
        if (!isAdjective(i)) break;
      }
      const modalLemmas = ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden"];
      const finiteForm = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II"].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? [group[person]] : Object.values(group)).some(form => form && norm(form) === norm(tokens[i][0]));
      });
      const clauseIndices = Array.from({length:end-start+1},(_,i)=>start+i);
      const modalInClause = clauseIndices.some(i => i !== index && matches(i).some(e => e.type === "Verb" && modalLemmas.includes(e.word) && finiteForm(e,i)));
      const dativeLemmas = ["helfen","danken","gefallen","gehören","vertrauen","antworten"];
      const hasDativeComplement = e => dativeLemmas.includes(e.word) || (e.complements || []).some(c => c.pattern === "Dativ");
      const personalSubjects = new Set(["ich","du","er","sie","es","wir","ihr"]);
      const hasSubjectBefore = verbIndex => clauseIndices.some(i => i !== index && i < verbIndex && personalSubjects.has(norm(tokens[i][0])) && !(i > start && dativePrepositions.has(norm(tokens[i-1][0])))) ||
        // A name directly before the finite verb is useful evidence, but a
        // dictionary noun may be a fronted object and must not settle the role.
        verbIndex > start && /^[A-ZÄÖÜ]/u.test(tokens[verbIndex-1][0]) && !matches(verbIndex-1).length;
      let coordinatedStart = Math.max(0,start-2);
      while (coordinatedStart > 0 && adjacent(coordinatedStart-1,coordinatedStart) && !boundaryWords.has(norm(tokens[coordinatedStart-1][0]))) coordinatedStart--;
      const coordinatedFirst = tokens[coordinatedStart]?.[0] || "";
      const inheritedSubject = previous === start && start > 0 && norm(tokens[start-1][0]) === "und" &&
        (personalSubjects.has(norm(coordinatedFirst)) || coordinatedStart < start-2 && /^[A-ZÄÖÜ]/u.test(coordinatedFirst) && !matches(coordinatedStart).length);
      const dativeFinite = clauseIndices.some(i => i < index && index-i <= 3 &&
        matches(i).some(e => e.type === "Verb" && hasDativeComplement(e) && finiteForm(e,i)) &&
        tokens.slice(i+1,index).every(t => ["nicht","auch","noch","schon","wirklich","mehr"].includes(norm(t[0]))) &&
        (hasSubjectBefore(i) || inheritedSubject || !matches(i).some(e => e.type === "Verb" && finiteForm(e,i,"ihr"))));
      const dativeFollowing = next <= end && hasSubjectBefore(next) && matches(next).some(e =>
        e.type === "Verb" && hasDativeComplement(e) && finiteForm(e,next));
      const dativePreposition = previous >= start && dativePrepositions.has(norm(tokens[previous][0]));
      const perfectDative = clauseIndices.some(i => i > index && matches(i).some(e => e.type === "Verb" && hasDativeComplement(e) &&
        norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]))) &&
        clauseIndices.some(i => i < index && matches(i).some(e => e.type === "Verb" && ["haben","sein"].includes(e.word) && finiteForm(e,i)));
      return {word,candidates,tokens,index,start,end,next,previous,adjacent,matches,isAdjective,nounPhrase,modalLemmas,
        finiteForm,modalInClause,dativeLemmas,dativeFinite,dativeFollowing,dativePreposition,perfectDative};
    }
    const seinVerbIds = f => f.candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
    const contextualProducers = {
      'possessive-before-noun': f => f.nounPhrase ?
        {ids:({mein:["pronoun-011"],dein:["pronoun-012"],sein:["pronoun-013"],ihr:["pronoun-014","pronoun-015"],unser:["pronoun-016"],euer:["pronoun-017"],eur:["pronoun-017"]})[
          /^(mein|dein|sein|ihr|unser|euer|eur)/u.exec(norm(f.word))[1]],evidence:"possessive-before-noun"} : null,
      'sein-after-predicate-or-modal': f => norm(f.word) === "sein" && f.previous >= 0 && f.adjacent(f.previous,f.index) &&
        (f.isAdjective(f.previous) || f.matches(f.previous).some(e => e.type === "Verb" && f.modalLemmas.includes(e.word)))
        ? {ids:seinVerbIds(f),evidence:"sein-after-predicate-or-modal"} : null,
      'sein-clause-final-after-modal': f => norm(f.word) === "sein" && f.modalInClause && f.index === f.end
        ? {ids:seinVerbIds(f),evidence:"sein-clause-final-after-modal"} : null,
      'ihr-dative-object': f => norm(f.word) === "ihr" && (f.dativePreposition || f.dativeFinite || f.dativeFollowing)
        ? {ids:["pronoun-004"],evidence:f.dativePreposition ? "ihr-after-preposition" : "ihr-with-dative-finite-verb"} : null,
      'ihr-next-to-plural-verb': f => norm(f.word) === "ihr" && [f.previous,f.next].some(i => i >= f.start && i <= f.end &&
        f.matches(i).some(e => e.type === "Verb" && f.finiteForm(e,i,"ihr")))
        ? {ids:["pronoun-007"],evidence:"ihr-next-to-plural-verb"} : null,
      'ihr-dative-verb': f => norm(f.word) === "ihr" && (f.perfectDative || f.previous >= f.start && f.previous >= 0 &&
        f.matches(f.previous).some(e => e.type === "Verb" && f.dativeLemmas.includes(e.word)))
        ? {ids:["pronoun-004"],evidence:f.perfectDative ? "ihr-in-dative-perfect-group" : "ihr-after-dative-verb"} : null
    };
    const contextualRuleOrder = selectionRules.filter(rule => rule.group === 'contextual').map(rule => rule.id);
    function contextualRank(word, context, candidates) {
      const unchanged = {candidates, preferred:null, evidence:null};
      const f = contextualClause(word,context,candidates);
      if (!f) return unchanged;
      for (const id of contextualRuleOrder) {
        const row = contextualProducers[id](f);
        if (!row) continue;
        const favoured = candidates.filter(c => row.ids.includes(c.dictionaryId));
        if (!favoured.length) return unchanged;
        return withRule({candidates:[...favoured,...candidates.filter(c => !favoured.includes(c))],
          preferred:favoured.length === 1 ? favoured[0] : null, evidence:row.evidence},id);
      }
      return unchanged;
    }
    function nominalRank(word, tokens, index, start, end, matches, candidates, shared = null, otherFinite = false) {
      const unchanged = {candidates,preferred:null,evidence:null};
      // Capitals inside a clause can signal nominalisation. Sentence-initial
      // capitals alone are not evidence for or against an attributive use.
      if (/^[A-ZÄÖÜ]/u.test(word) && index !== start && !shared?.invariant) return unchanged;
      const rows = modifiers.get(norm(word)) || [];
      const analyses = candidates.flatMap(candidate => {
        if (shared) return (shared.get(index) || []).filter(row => row.lemma === candidate.lemma &&
          canonicalPos(row.pos) === canonicalPos(candidate.pos) && (!row.dictionaryId || row.dictionaryId === candidate.dictionaryId))
          .map(row=>({...row,candidate}));
        const own = rows.filter(row => row.entry.id === candidate.dictionaryId);
        if (own.length) return own.map(row => ({candidate,...row}));
        if (canonicalPos(candidate.pos) !== "Adjektiv") return [];
        return endings.filter(ending => [norm(candidate.lemma),norm(candidate.lemma)+"er"]
          .some(stem => norm(word) === stem+ending)).map(ending => ({candidate,ending,kind:"adjective"}));
      });
      if (!analyses.length) return unchanged;
      const modifierAt = i => (shared ? shared.get(i) || [] : modifiers.get(norm(tokens[i]?.[0])) || []).length > 0;
      let head = index+1;
      while (head <= end && head-index <= 3 && !matches(head).some(e => e.type === "Nomen") && modifierAt(head)) head++;
      if (head > end || head-index > 3) return unchanged;
      const nouns = matches(head).filter(e => e.type === "Nomen");
      if (!nouns.length) return unchanged;
      let left = index-1;
      while (left >= start && index-left <= 3 && modifierAt(left)) left--;
      if (Number.isInteger(shared?.frameLeft)) left = shared.frameLeft;
      const determiner = left >= start ? norm(tokens[left][0]) : "";
      const definite = ["der","die","das","den","dem","des"].includes(determiner);
      const ein = /^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(determiner);
      const demonstrative = /^(?:dies|jen)(?:e|en|em|er|es)$/u.test(determiner);
      const articleKind = definite || demonstrative ? "weak" : ein ? "mixed" : "strong";
      const determinerEnding = ein ? determiner.replace(/^(?:kein|mein|dein|sein|ihr|unser|euer|eur|ein)/u,"") :
        demonstrative ? determiner.replace(/^(?:dies|jen)/u,"") : "";
      // Each row describes N/A/D/G, without claiming a unique case when the
      // local phrase permits several. Genitive masculine/neuter uses -en.
      const table = {
        der:[["der","","er","e"],["den","en","en","en"],["dem","em","em","en"],["des","es","en","en"]],
        die:[["die","e","e","e"],["die","e","e","e"],["der","er","er","en"],["der","er","er","en"]],
        das:[["das","","es","e"],["das","","es","e"],["dem","em","em","en"],["des","es","en","en"]],
        plural:[["die",null,"e","en"],["die",null,"e","en"],["den",null,"en","en"],["der",null,"er","en"]]
      };
      const caseByPrep = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,für:1,durch:1,gegen:1,ohne:1,um:1};
      const prepIndex = articleKind === "strong" ? left : left-1;
      const governedCase = prepIndex >= start ? caseByPrep[norm(tokens[prepIndex][0])] : undefined;
      const allowed = new Set();
      for (const noun of nouns) {
        const pluralForms = String(noun.plural || "").split(/\s*,\s*/).filter(p => p && p !== "—");
        const isPlural = noun.numberUnknown || pluralForms.some(p => norm(p) === norm(tokens[head][0]) || !/[ns]$/iu.test(p) && norm(p)+"n" === norm(tokens[head][0]));
        const isSingular = noun.numberUnknown || noun.number !== 'plural' && (norm(noun.word) === norm(tokens[head][0]) || !isPlural);
        const genders = ["der","die","das"].includes(noun.article) ? [noun.article] : ["der","die","das"];
        for (const key of [...(isSingular ? genders : []),...(isPlural ? ["plural"] : [])]) {
          table[key].forEach(([article,einEnding,strong,weak],caseIndex) => {
            if (shared?.allowedCases && !shared.allowedCases.includes(caseIndex)) return;
            if (governedCase !== undefined && governedCase !== caseIndex) return;
            if (definite && article !== determiner) return;
            if (demonstrative && determinerEnding !== ({der:"er",die:"e",das:"es",den:"en",dem:"em",des:"es"})[article]) return;
            if (ein && determinerEnding !== (key === "plural" ? ({die:"e",den:"en",der:"er"})[article] : einEnding)) return;
            const expected = articleKind === "strong" || articleKind === "mixed" && !determinerEnding ? strong : weak;
            // All modifiers must admit the same analysis, not independently
            // borrow incompatible cases from an ambiguous article.
            for (let i = left+1; i < head; i++) {
              const options = i === index ? analyses : shared ? shared.get(i) || [] : modifiers.get(norm(tokens[i]?.[0])) || [];
              if (!options.some(row => row.ending === expected || row.invariant)) return;
            }
            allowed.add(expected);
          });
        }
      }
      const compatible = analyses.filter(row => allowed.has(row.ending) || row.invariant && allowed.size);
      if (!compatible.length) return unchanged;
      const favoured = [...new Set(compatible.map(row => row.candidate))];
      // B6: without an article a spelling that is also a finite form of the same
      // verb (Sie verlangten Geld) is not marked as a participle when the clause
      // has no other certain finite verb; the clause rules decide.
      const finiteSpelling = candidate => !shared && !otherFinite && !(index > 0 && modifierAt(index-1)) && !articleOrPrepositionBefore(tokens,index) && articleKind === "strong" && !determinerEnding && !definite &&
        (verbAnalyses.get(norm(word)) || []).some(a => a.kind === "finite" && norm(a.base) === norm(candidate.lemma).replace(/^sich\s+/u,""));
      const marked = candidates.map(candidate => {
        const row = compatible.find(row => row.candidate === candidate && (shared || row.kind.startsWith("participle-") && !finiteSpelling(candidate)));
        return row ? {...candidate,usage:{kind:row.kind === 'participle-declined' ? row.tags?.includes('past') ? 'participle-II' : 'participle-I' : row.kind === 'adjective' ? 'adjective-attributive' : row.kind,
          role:"attributive",form:word,base:row.base || row.lemma,head:tokens[head][0],
          ...(shared ? {spans:[index,head].map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}))} : {})}} : candidate;
      });
      const preferred = favoured.length === 1 ? marked[candidates.indexOf(favoured[0])] : null;
      return {candidates:marked,preferred,compatibleAdjectives:[...new Set(compatible
        .filter(row => canonicalPos(row.candidate.pos) === "Adjektiv")
        .map(row => marked[candidates.indexOf(row.candidate)]))],
        evidence:preferred ? "attributive-modifier-agreement" : "ambiguous-attributive-modifier",blocked:!preferred};
    }
    // Relation policies share one immutable head/membership hypothesis format.
    // Role and display guards remain distinct; consumers never promote display
    // evidence into grammatical confirmation.
    function nounHypothesis(sentence,tokens,det,head,policy,sources) {
      const members=tokens.slice(det,head+1).map(t=>({tokenId:t.tokenId,
        span:{text:t[0],start:t.index,end:t.index+t[0].length}}));
      return {id:null,
        type:'noun-group',det,head,determinerTokenId:tokens[det].tokenId,headTokenId:tokens[head].tokenId,
        members,policy,purpose:policy==='role'?'grammar':'display-only',confidence:'possible',
        rule:policy==='role'?'bounded-nominal-frame':'bounded-definite-article-frame',
        dependencies:copyFacts(sources),constraints:{policy,coverage:'existing',rightWindow:3,leftWindow:policy==='role'?3:3,
          participialComplementWindow:policy==='role'?6:0,boundaries:policy==='role'?'nominal-frame-with-participle-quote-exception':'whitespace-only',
          determiner:policy==='role'?'nominal-determiner-or-governing-preposition':'definite-article'},
        // Agreement and candidate preference are separate adapter decisions.
        candidateIdentities:[],conflicts:[]};
    }
    function nounFrame(sentence,tokens,anchor,policy) {
      syncSourceVersion();
      const version=sourceVersion(),epoch=morphologyEpoch,failures=lookupFailures;
      const key=JSON.stringify([version,epoch,sentence,policy,tokens[anchor].tokenId]);
      return nounFrames.get(key,'grammar',async()=>{
        observe('noun-frame-build',{policy,anchor:tokens[anchor].tokenId,key});
        const frame=policy==='role'?await buildRoleNounFrame(sentence,tokens,anchor):
          await buildDisplayNounFrame(sentence,tokens,anchor,policy==='display-external');
        if(frame.hypothesis)frame.hypothesis.id=JSON.stringify(['noun-group',version,epoch,sentence,frame.hypothesis.det,frame.hypothesis.head]);
        observe('noun-frame-result',{policy,key,id:frame.hypothesis?.id||null,reason:frame.reason||null});
        const value=freezeFacts(copyFacts(frame));
        if(version===sourceVersion()&&epoch===morphologyEpoch&&lookupFailures===failures&&
            !frame.sources.some(s=>s&&['partial','error'].includes(s.state)))
          primeOwnDisplayFrame(sentence,tokens,value,version,epoch);
        return value;
      },frame=>version===sourceVersion()&&epoch===morphologyEpoch&&lookupFailures===failures&&
        !frame.sources.some(s=>s&&['partial','error'].includes(s.state))).then(copyFacts);
    }
    // A role frame may be projected into the narrower own-display policy
    // only after all its independent structural guards have been checked.
    // Lowercase own modifiers make forward article and reverse noun scans
    // equivalent, so both anchors may reuse this exact frame.
    function primeOwnDisplayFrame(sentence,tokens,frame,version,epoch) {
      if(!frame.hypothesis)return;
      const {det,head}=frame.hypothesis;
      if(head-det>3||!['der','die','das','den','dem','des'].includes(norm(tokens[det][0]))||
          !/^[A-ZÄÖÜ]/u.test(tokens[head][0])||
          det>0&&/,/u.test(sentence.slice(tokens[det-1].index+tokens[det-1][0].length,tokens[det].index))||
          /^\s*[-–]\s*[\p{L}\p{M}]/u.test(sentence.slice(tokens[head].index+tokens[head][0].length)))return;
      for(let i=det;i<head;i++) {
        if(!/^\s+$/u.test(sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index)))return;
        if(i>det&&(/^[A-ZÄÖÜ]/u.test(tokens[i][0])||!(modifiers.get(norm(tokens[i][0]))||[]).length))return;
      }
      const value=frame.hypothesis.policy==='display'?frame:freezeFacts({
        hypothesis:{...frame.hypothesis,policy:'display',purpose:'display-only',rule:'bounded-definite-article-frame',
          confidence:'possible',constraints:{policy:'display',coverage:'existing'}},sources:frame.sources});
      for(const anchor of [det,head]) {
        const key=JSON.stringify([version,epoch,sentence,'display-own',tokens[anchor].tokenId]);
        nounFrames.prime(key,value);
        observe('noun-frame-projection',{from:frame.hypothesis.policy,anchor:tokens[anchor].tokenId,key,id:frame.hypothesis.id});
      }
    }
    async function buildRoleNounFrame(sentence,tokens,index) {
      const word=tokens[index][0], sources=[];
      const joined=(a,b)=>/^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const blocked=reason=>({hypothesis:null,reason,sources});
      const analysisAt=async i=>{
        const r=await tokenMorphology(tokens[i],{discoverModifiers:true}, 'nounHypothesis');
        sources.push(...(morphologySourceStates.get(r)||[]));return r.errors.length?null:r;
      };
      const clicked=await analysisAt(index);if(!clicked)return blocked('clicked-morphology-error');
      const modifierRows=r=>[...r.analyses.filter(a=>a.ending&&['adjective','comparative','superlative','participle-I','participle-II','participle-declined'].includes(a.kind)),
        ...r.analyses.filter(a=>a.kind==='inflection'&&canonicalPos(a.pos)==='Adjektiv'&&
          a.tags?.some(t=>['strong','weak','mixed'].includes(t))).map(a=>({...a,
            ending:norm(a.form).match(/(?:en|em|er|es|e)$/u)?.[0],kind:a.tags.includes('comparative')?'comparative':a.tags.includes('superlative')?'superlative':'adjective'})).filter(a=>a.ending),
        ...(['sehr','ganz','ziemlich','besonders','äußerst','völlig'].includes(norm(r.form))&&r.candidates.some(c=>canonicalPos(c.pos)==='Adverb')
          ? [{kind:'degree-marker',invariant:true}] : [])];
      const shared=new Map();shared.set(index,modifierRows(clicked));
      // Invariant -er adjectives retain their dictionary POS despite capitals.
      const invariant=/er$/u.test(word)&&clicked.candidates.filter(c=>canonicalPos(c.pos)==='Adjektiv'&&norm(c.lemma)===norm(word));
      if(invariant?.length){shared.invariant=true;shared.get(index).push(...invariant.map(c=>({lemma:c.lemma,pos:c.pos,kind:'adjective',invariant:true,base:c.lemma})));}
      if(!shared.get(index).length || /^[A-ZÄÖÜ]/u.test(word)&&!shared.invariant)return blocked('modifier-role-unproven');
      const participle = shared.get(index).some(a=>a.kind.startsWith('participle-'));
      const nounMatches=new Map();let headCandidates=[],head=index+1;
      for(;head<tokens.length&&head-index<=3;head++){
        const openingQuote = /^\s*(?:``|[„“"«])\s*$/u.test(sentence.slice(tokens[head-1].index+tokens[head-1][0].length,tokens[head].index));
        if(!joined(head-1,head) && !(participle && head===index+1 && openingQuote))return blocked('role-boundary');
        const r=await analysisAt(head);if(!r)return blocked('neighbor-morphology-error');
        const nouns=r.candidates.filter(c=>canonicalPos(c.pos)==='Nomen');
        if(/^[A-ZÄÖÜ]/u.test(tokens[head][0])&&nouns.length){
          headCandidates=nouns.map(c=>({identity:window.BibliothekVocabulary.identity(c),source:c.source,
            dictionaryId:c.dictionaryId,lemma:c.lemma,pos:c.pos}));
          nounMatches.set(head,nouns.map(c=>{
            if(c.item)return c.item;
            const inf=r.inflections.filter(a=>canonicalPos(a.pos)==='Nomen'&&norm(a.lemma)===norm(c.lemma));
            const genders=new Set(inf.flatMap(a=>a.tags||[]).filter(t=>['masculine','feminine','neuter'].includes(t)));
            const numbers=new Set(inf.map(a=>a.number).filter(Boolean));
            return {word:tokens[head][0],type:'Nomen',article:genders.size===1?({masculine:'der',feminine:'die',neuter:'das'})[[...genders][0]]:'',
              plural:numbers.has('plural')?tokens[head][0]:'',number:numbers.size===1?[...numbers][0]:null,numberUnknown:!numbers.size};
          }));break;
        }
        shared.set(head,modifierRows(r));if(!shared.get(head).length)return blocked('intervening-modifier-unproven');
      }
      if(!nounMatches.has(head))return blocked('noun-head-unproven');
      // A first component is not the head of a hyphenated noun. Preserve the
      // prior lookup until the complete compound can be analysed as a unit.
      if(/^\s*[-‐‑–]\s*/u.test(sentence.slice(tokens[head].index+tokens[head][0].length)))return blocked('compound-head-unproven');
      let left=index-1;
      const determinerPattern=/^(?:der|die|das|den|dem|des|(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?|(?:dies|jen)(?:e|en|em|er|es))$/u;
      const det={test:value=>determinerPattern.test(value)||!!contractionForms[value]};
      for(;left>=0&&index-left<=3;left--){
        if(!joined(left,left+1))break;
        if(det.test(norm(tokens[left][0])))break;
        const r=await analysisAt(left);if(!r)break;
        shared.set(left,modifierRows(r));if(!shared.get(left).length)break;
      }
      // A bounded participial complement may stand between an outer article
      // and the participle: ein an Krebs erkrankter Verwandter. Its words are
      // not additional agreeing modifiers; keep that distinction in the frame.
      if(participle && left===index-1 && left>=0 && joined(left,index)) {
        const object = await analysisAt(left);
        const isObject = object?.candidates.some(c=>canonicalPos(c.pos)==='Nomen' || c.pos==='name');
        if(isObject) {
          let prep=left-1;
          if(prep>=0 && det.test(norm(tokens[prep][0])) && joined(prep,left)) prep--;
          if(prep>=0 && ['an','von','mit','durch','für','gegen','ohne','aus','zu','bei','nach','über','unter','auf','in'].includes(norm(tokens[prep][0])) &&
              joined(prep,prep+1)) {
            let outer=prep-1;
            if(outer>=0 && !det.test(norm(tokens[outer][0])) && joined(outer,prep)) {
              const adverb=await analysisAt(outer);
              if(adverb?.candidates.some(c=>canonicalPos(c.pos)==='Adverb') &&
                  !adverb.analyses.some(a=>['finite','infinitive','imperative'].includes(a.kind))) outer--;
            }
            if(outer>=0 && index-outer<=6 && det.test(norm(tokens[outer][0])) && joined(outer,outer+1)) {
              for(let i=outer+1;i<index;i++)shared.set(i,[{kind:'participle-complement',invariant:true}]);
              left=outer;shared.frameLeft=outer;
            }
          }
        }
      }
      // Require a nominal frame; unrestricted nearest-noun attachment is unsafe.
      const twoCasePrep=participle&&left>=0&&['in','an','auf','unter','über','vor','hinter','neben','zwischen'].includes(norm(tokens[left][0]));
      if(twoCasePrep)shared.allowedCases=[1,2];
      const strongPrep=left>=0&&(['mit','bei','von','zu','aus','nach','für','durch','gegen','ohne','um'].includes(norm(tokens[left][0]))||twoCasePrep);
      if(left<0 || !det.test(norm(tokens[left][0]))&&!strongPrep || !joined(left,left+1))return blocked('nominal-frame-unproven');
      const hypothesis=nounHypothesis(sentence,tokens,left,head,'role',sources);
      hypothesis.candidateIdentities=clicked.candidates.map(c=>window.BibliothekVocabulary.identity(c));
      hypothesis.evidence=[...shared].map(([tokenId,rows])=>({tokenId,rows}));
      hypothesis.headCandidates=headCandidates;
      return {hypothesis,
        clicked:{candidates:clicked.candidates,inflections:clicked.inflections},shared:[...shared],invariant:!!shared.invariant,
        frameLeft:shared.frameLeft,allowedCases:shared.allowedCases,nounMatches:[...nounMatches],sources};
    }
    async function buildDisplayNounFrame(sentence,tokens,clicked,externalModifiers) {
      const sources=[],blocked=reason=>({hypothesis:null,reason,sources});
      const definite = new Set(['der','die','das','den','dem','des']);
      const isArticle = definite.has(norm(tokens[clicked][0]));
      const adjacent = (a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const modifier = async i => {
        if ((modifiers.get(norm(tokens[i]?.[0])) || []).length) return true;
        if (!externalModifiers || !tokens[i] || !/^[a-zäöüß]/u.test(tokens[i][0])) return false;
        try {
          const groups = await attachmentLookup(tokens[i][0]);
          sources.push(groupSourceStates.get(groups));
          return groups.some(g => g.kind === 'form-note' && canonicalPos(g.pos) === 'Adjektiv' &&
            g.inflections?.some(a => canonicalPos(a.pos) === 'Adjektiv' && norm(a.form) === norm(tokens[i][0])));
        } catch (error) { sources.push({source:'fallback',state:'error',message:String(error.message||error)});return false; }
      };
      let det = clicked, head = clicked;
      if (isArticle) {
        head++;
        while (tokens[head] && head-det <= 3 && !/^[A-ZÄÖÜ]/u.test(tokens[head][0]) &&
            (modifiers.get(norm(tokens[head][0])) || []).length) head++;
      } else {
        det--;
        while (det >= 0 && clicked-det <= 3 && !definite.has(norm(tokens[det][0])) &&
            await modifier(det)) det--;
      }
      if (det < 0 || !tokens[head] || head-det > 3 || head <= det ||
          !definite.has(norm(tokens[det][0])) || !/^[A-ZÄÖÜ]/u.test(tokens[head][0])) return blocked('definite-frame-unproven');
      // A relative pronoun can precede its own subject (…, die Ämter haben).
      // Clause-initial attachment after a comma needs a wider syntactic parse.
      if (det > 0 && /,/u.test(sentence.slice(tokens[det-1].index+tokens[det-1][0].length,tokens[det].index))) return blocked('relative-clause-boundary');
      // The final component sets the gender of a hyphenated compound;
      // do not explain März-Gruppe as the masculine noun März.
      if (/^\s*[-–]\s*[\p{L}\p{M}]/u.test(sentence.slice(tokens[head].index+tokens[head][0].length))) return blocked('compound-head-unproven');
      for (let i=det;i<head;i++) if (!adjacent(i,i+1)) return blocked('display-boundary');
      return {hypothesis:nounHypothesis(sentence,tokens,det,head,'display',sources),sources};
    }
    // Shared grammar rows (step 8): sentence-level facts — finite agreement
    // with an adjacent personal subject, then the shared nominal frame.
    async function sharedRoleRank(word,context,candidates) {
      if (!Number.isInteger(context?.tokenOffset) || candidates.some(c=>c.construction || c.usage?.role==='nominalized')) return null;
      if(grammaticalWords.has(norm(word))||prepositions.has(norm(word)))return null;
      const sentence=String(context.sentence||''),tokens=sharedTokens(sentence,'sharedRoleRank');
      const index=clickedTokenIndex(tokens,context.tokenOffset,word,true);
      if(index<0 || !/^[A-ZÄÖÜ].*er$/u.test(word)&&!candidates.some(c=>['Adjektiv','Verb'].includes(canonicalPos(c.pos))) &&
        (candidates.length || !/(?:e|en|em|er|es)$/u.test(word)))return null;
      const joined=(a,b)=>/^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const persons={ich:['ich'],du:['du'],er:['er/sie/es'],es:['er/sie/es'],wir:['wir'],ihr:['ihr']};
      const subject=[index-1,index+1].find(i=>tokens[i]&&persons[norm(tokens[i][0])]&&joined(Math.min(i,index),Math.max(i,index)));
      let finite=null;
      const f={word,context,candidates,sentence,tokens,index,subject,
        // Verb candidates whose finite form agrees with the adjacent subject.
        finite:async()=>{
          if(finite)return finite;
          const rows=await tokenAnalyses(word, undefined, 'sharedRoleRank');
          return finite=candidates.filter(c=>canonicalPos(c.pos)==='Verb'&&rows.some(a=>a.kind==='finite'&&
            persons[norm(tokens[subject][0])].includes(a.person)&&norm(a.base)===norm(c.lemma).replace(/^sich\s+/u,'')));
        }};
      for(const id of sharedRuleOrder){
        const result=await sharedProducers[id](f);
        if(result)return withRule(result,id);
      }
      return null;
    }
    const sharedProducers={
      // An adjacent personal subject and confirmed finite morphology are
      // stronger than an exact adjective index match. Preserve lexical senses.
      async 'shared-finite-subject'(f){
        if(f.subject===undefined)return null;
        const clause=grammarClause(f.word,f.context,f.candidates,[]);
        const finite=(await f.finite()).filter(c=>!clause?.otherFinite||norm(c.lemma)===norm(f.word));
        if(finite.length!==1)return null;
        const previous=grammarRank(f.word,f.context,f.candidates,[]).preferred;
        if(previous&&window.BibliothekVocabulary.identity(previous)===window.BibliothekVocabulary.identity(finite[0]))return null;
        return {candidates:f.candidates,preferred:finite[0],evidence:'shared-finite-subject-agreement'};
      },
      // Any agreeing finite reading leaves the word to the clause rules; the
      // nominal frame applies only when no adjacent subject agrees.
      async 'shared-nominal-group'(f){
        if(f.subject!==undefined&&(await f.finite()).length)return null;
        const {word,context,candidates,sentence,tokens,index}=f;
        const frame=await nounFrame(sentence,tokens,index,'role');
        if(!frame.hypothesis)return null;
        const {clicked}=frame, {det:left,head}=frame.hypothesis;
        const shared=new Map(frame.shared),nounMatches=new Map(frame.nounMatches);
        shared.invariant=frame.invariant;shared.frameLeft=frame.frameLeft;shared.allowedCases=frame.allowedCases;
        observe('noun-hypothesis-use',{consumer:'sharedRoleRank',id:frame.hypothesis.id,purpose:'grammar'});
        const extended=[...candidates];
        for(const c of clicked.candidates)if(shared.get(index).some(a=>a.lemma===c.lemma&&canonicalPos(a.pos)===canonicalPos(c.pos))&&
          !extended.some(e=>window.BibliothekVocabulary.identity(e)===window.BibliothekVocabulary.identity(c)))extended.push(c);
        const analysisTokens=tokens.map(t=>t);
        if(contractionArticle(tokens[left][0]))analysisTokens[left]=Object.assign([contractionArticle(tokens[left][0])],{index:tokens[left].index});
        const rank=nominalRank(word,analysisTokens,index,Math.max(0,left-1),head,i=>nounMatches.get(i)||[],extended,shared);
        if(!rank.evidence){observe('noun-agreement',{id:frame.hypothesis.id,confidence:'possible',reason:'agreement-unproven'});return null;}
        observe('noun-agreement',{id:frame.hypothesis.id,confidence:'confirmed',evidence:rank.evidence,blocked:!!rank.blocked});
        const lexical=rank.compatibleAdjectives || [];
        // A lexical adjective and its verbal derivation may coexist; syntactic
        // role does not choose silently between separate dictionary senses.
        const ownLexical=lexical.filter(c=>c.source==='main');
        if(!rank.preferred&&(lexical.length===1||ownLexical.length===1)){
          rank.preferred=ownLexical[0]||lexical[0];rank.blocked=false;
        }
        if(!rank.preferred){
          const previous=grammarRank(word,context,candidates,clicked.inflections).preferred;
          const compatible=previous&&lexical.find(c=>window.BibliothekVocabulary.identity(c)===window.BibliothekVocabulary.identity(previous));
          if(compatible){rank.preferred=compatible;rank.blocked=false;}
        }
        rank.evidence=rank.preferred?'shared-nominal-group-agreement':'shared-nominal-group-choice';
        return rank;
      }
    };
    const sharedRuleOrder=selectionRules.filter(rule=>rule.group==='grammar'&&rule.shared).map(rule=>rule.id);
    // ---- Shared function-word facts (step 5 blocks 7-8) ----
    // Article and preposition cards are the only source: form features come
    // from the article tables, case government from the preposition cards.
    const articleCardsByForm = new Map(), prepositionCardsByForm = new Map();
    for (const entry of entries) {
      if (entry.type === "article") for (const form of entry.search_forms || []) {
        const rows = articleCardsByForm.get(norm(form)) || []; if (!rows.includes(entry)) rows.push(entry); articleCardsByForm.set(norm(form),rows);
      }
      if (entry.type === "preposition") for (const form of [entry.word,...(entry.search_forms || [])]) prepositionCardsByForm.set(norm(form),entry);
    }
    const articleFeatureCache = new WeakMap();
    const articleFeatures = entry => {
      if (!articleFeatureCache.has(entry)) articleFeatureCache.set(entry,articleFormFeatures(entry));
      const result = articleFeatureCache.get(entry);
      return result.errors.length ? null : result.features;
    };
    const caseNamesDe = {Nominativ:"nominative",Akkusativ:"accusative",Dativ:"dative",Genitiv:"genitive"};
    const governedCases = (entry,position = "before") => new Set((entry?.government || [])
      .filter(g => g.position === position && !g.combined_with).map(g => caseNamesDe[g.case]).filter(Boolean));
    // Adjective endings after a determiner: weak after der-type, mixed after ein-type.
    function expectedEnding(declension,feature) {
      if (feature.number === "plural") return "en";
      if (declension === "mixed") {
        if (feature.case === "nominative" && feature.gender === "masculine") return "er";
        if (["nominative","accusative"].includes(feature.case) && feature.gender === "neuter") return "es";
        if (["nominative","accusative"].includes(feature.case) && feature.gender === "feminine") return "e";
        return "en";
      }
      if (feature.case === "nominative") return "e";
      if (feature.case === "accusative" && feature.gender !== "masculine") return "e";
      return "en";
    }
    // Determiner features: own article cards; possessives decline like ein,
    // dies-/jen-/jed-/welch-/manch- like der. Card tables, never a copied table.
    function determinerFeatures(form) {
      const key = norm(form);
      const cards = articleCardsByForm.get(key);
      if (cards?.length) {
        const features = cards.flatMap(card => [...(articleFeatures(card)?.get(key) || [])].map(f => ({...f,declension:card.grammar?.adjective_declension || null})));
        return features.length ? features : null;
      }
      const possessive = key.match(/^(?:mein|dein|sein|ihr|unser|euer|eur)(e|en|em|er|es)?$/u);
      if (possessive) {
        const ein = [...articleCardsByForm.get("ein") || []].find(card => card.grammar?.article_kind === "indefinite");
        const kein = [...articleCardsByForm.get("kein") || []].find(card => card.grammar?.article_kind === "negative");
        // kein has the plural column that ein lacks; same endings.
        const card = kein || ein, base = card ? norm(card.word) : null;
        const rows = card ? articleFeatures(card)?.get(base + (possessive[1] || "")) : null;
        return rows?.length ? rows.map(f => ({...f,declension:"mixed"})) : null;
      }
      const demonstrative = key.match(/^(?:dies|jen|jed|welch|manch)(e|en|em|er|es)$/u);
      if (demonstrative) {
        const der = [...articleCardsByForm.get("der") || []].find(card => card.grammar?.article_kind === "definite");
        const forms = {er:["der"],e:["die"],es:["das","des"],en:["den"],em:["dem"]}[demonstrative[1]] || [];
        const rows = der ? forms.flatMap(f => [...(articleFeatures(der)?.get(f) || [])]) : [];
        return rows.length ? rows.map(f => ({...f,declension:"weak"})) : null;
      }
      return null;
    }
    const nounGenders = {der:"masculine",die:"feminine",das:"neuter"};
    const caseTags = new Set(["nominative","accusative","dative","genitive"]);
    // Noun readings of a head token: gender from the own card's article or
    // structured inflection tags; number from plural forms or tags. The
    // external export has no gender for most nouns: such a noun gives a
    // reading with gender null (any gender), so number and modifier endings
    // still have to agree. A capitalised word with no dictionary match at all
    // (compounds, names) gives one reading with unknown gender and number.
    // Form notes of the external export state case and number in words
    // ("accusative/dative/genitive singular of Mensch") more completely than its
    // split structured tags; read them as facts for the noun head.
    function formNoteNounFacts(morph) {
      const facts = new Map();
      for (const group of morph.groups || []) {
        if (group.kind !== "form-note" || canonicalPos(group.pos) !== "Nomen") continue;
        for (const meaning of group.meanings || []) {
          for (const match of String(meaning).matchAll(/\b((?:(?:nominative|accusative|dative|genitive)\/?)+|all-case)\s+(singular|plural)\s+of\s+([\p{L}\p{M}-]+)/gu)) {
            const rows = facts.get(norm(match[3])) || [];
            rows.push({number:match[2],cases:match[1] === "all-case" ? new Set() : new Set(match[1].split("/").filter(Boolean))});
            facts.set(norm(match[3]),rows);
          }
          const plain = String(meaning).match(/^plural of\s+([\p{L}\p{M}-]+)$/u);
          if (plain) { const rows = facts.get(norm(plain[1])) || []; rows.push({number:"plural",cases:new Set()}); facts.set(norm(plain[1]),rows); }
        }
      }
      return facts;
    }
    function nounReadings(surface, morph) {
      const s = norm(surface), readings = [], notes = formNoteNounFacts(morph);
      for (const c of morph.candidates.filter(c => canonicalPos(c.pos) === "Nomen")) {
        const rows = morph.analyses.filter(a => a.kind === "inflection" && canonicalPos(a.pos) === "Nomen" && norm(a.lemma) === norm(c.lemma));
        const genders = nounGenders[c.item?.article] ? [nounGenders[c.item.article]] :
          [...new Set(rows.flatMap(a => a.tags || []).filter(t => ["masculine","feminine","neuter"].includes(t)))];
        const cases = new Set(rows.flatMap(a => a.tags || []).filter(t => caseTags.has(t)));
        const word = norm(c.item?.word || c.lemma);
        const plurals = String(c.item?.plural || "").split(/\s*,\s*/u).filter(p => p && p !== "—").map(norm);
        // The export splits case and number over rows; its case tags only narrow
        // readings that the export itself supplies, never own plural/singular forms.
        const ownPlural = plurals.some(p => p === s || !/[ns]$/u.test(p) && p + "n" === s), ownSingular = !!c.item && word === s;
        const plural = ownPlural || rows.some(a => a.number === "plural");
        let singular = !c.item?.plural_only && (word === s || rows.some(a => a.number === "singular"));
        let singularCases = ownSingular ? new Set() : cases;
        // Facts from the export's form notes replace its partial case tags.
        const noted = notes.get(norm(c.lemma)) || [];
        const notedSingular = noted.filter(n => n.number === "singular");
        if (!ownSingular && notedSingular.length) { singular = !c.item?.plural_only; singularCases = new Set(notedSingular.flatMap(n => [...n.cases])); }
        // Masculine nouns in -e with the plural -en take -n in every singular case
        // but the nominative (n-declension: dem Kollegen, des Jungen).
        if (!singular && c.item?.article === "der" && /e$/u.test(word) && s === word + "n" && plurals.includes(s)) {
          singular = true; singularCases = new Set(["accusative","dative","genitive"]);
        }
        if (!singular && c.item && (s === word + "s" || s === word + "es") && genders.some(g => g !== "feminine")) { singular = true; singularCases = new Set(["genitive"]); }
        // A dictionary plural that can take -n has no dative without it (den Kindern, not den Kinder).
        const noDative = plurals.some(p => p === s && !/[ns]$/u.test(p));
        if (plural) readings.push({number:"plural",gender:null,cases:singular || ownPlural ? new Set() : cases,noDative});
        if (singular) for (const gender of genders.length ? genders : [null]) readings.push({number:"singular",gender,cases:plural ? new Set() : singularCases});
      }
      if (!morph.candidates.length && /^[A-ZÄÖÜ]/u.test(surface)) readings.push({number:null,gender:null,cases:new Set(),unknown:true});
      return readings;
    }
    // Endings a modifier token can show; invariant tokens (degree adverbs,
    // numbers) are allowed between determiner and head without an ending.
    async function modifierEndings(token, consumer) {
      const surface = token[0];
      if (/^\d+(?:[.,]\d+)?$/u.test(surface)) return {invariant:true};
      const own = (modifiers.get(norm(surface)) || []).map(row => row.ending).filter(Boolean);
      if (own.length) return {endings:new Set(own)};
      const morph = await tokenMorphology(token,{discoverModifiers:true},consumer);
      if (morph.errors.length) return null;
      const endings = new Set([...morph.analyses.filter(a => a.ending && /^(?:adjective|comparative|superlative|participle-I|participle-II|participle-declined)$/u.test(a.kind)).map(a => a.ending),
        ...morph.analyses.filter(a => a.kind === "inflection" && canonicalPos(a.pos) === "Adjektiv").map(a => norm(a.form).match(/(?:en|em|er|es|e)$/u)?.[0]).filter(Boolean)]);
      if (endings.size) return {endings};
      if (morph.candidates.some(c => canonicalPos(c.pos) === "num")) return {invariant:true};
      // Uninflected base forms: an adjective may stand undeclined before the
      // head (ein super Erlebnis, ein paar Tage); an adverb only grades a
      // following declined modifier (ein wirklich guter Kaffee). nounGroupAfter
      // checks that position.
      const base = morph.candidates.filter(c => norm(c.lemma) === norm(surface));
      if (!determinerFeatures(surface) && base.some(c => canonicalPos(c.pos) === "Adjektiv")) return {invariant:true,base:"adjective"};
      if (base.some(c => canonicalPos(c.pos) === "Adverb") || morph.candidates.length && morph.candidates.every(c => canonicalPos(c.pos) === "Adverb"))
        return {invariant:true,base:"adverb"};
      // A word unknown to both dictionaries with an adjective ending
      // (rechtsgerichteter, lokalbezogenes) is read as a declined modifier.
      const ending = !morph.candidates.length && /^[a-zäöüß]{5,}$/u.test(surface) && norm(surface).match(/(?:en|em|er|es|e)$/u)?.[0];
      if (ending) return {endings:new Set([ending]),unknown:true};
      return null;
    }
    const joinedTokens = (sentence,tokens,a,b) => /^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
    // Inside a noun group a cardinal in figures may stand between words (seit 20 Jahren, die ersten 1000 Bäume).
    const groupJoined = (sentence,tokens,a,b) => /^\s+(?:\d+(?:[.,]\d+)*\s+)?$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
    // Bounded noun group to the right of an anchor (article or preposition):
    // [determiner] modifier{0,3} CapitalisedNoun, whitespace-joined only.
    // Bounded noun group to the right of an anchor (article or preposition):
    // [determiner] modifier{0,3} ["] Noun, whitespace-joined only. The head of
    // a hyphenated compound is its last part (ein Fünf-Sterne-Hotel → Hotel).
    async function nounGroupAfter(sentence, tokens, anchor, {determiner, consumer}) {
      let i = anchor + 1, det = null;
      const quote = /^\s*(?:``|[„“"«‚‘])\s*$/u;
      const beforeHead = (a,b) => groupJoined(sentence,tokens,a,b) || quote.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      if (!tokens[i] || !beforeHead(anchor,i)) return {reason:"boundary"};
      if (determiner && /^[a-zäöüß]/u.test(tokens[i][0]) && determinerFeatures(tokens[i][0])) {
        det = i; i++;
        if (!tokens[i] || !beforeHead(i-1,i)) return {reason:"boundary"};
      }
      const modifierRows = [];
      let lowercaseHead = null;
      while (tokens[i] && !/^[A-ZÄÖÜ]/u.test(tokens[i][0])) {
        if (modifierRows.length >= 3) return {reason:"window"};
        const endings = await modifierEndings(tokens[i],consumer);
        if (!endings) {
          // A lowercase word whose only readings are nouns is the head (kein verständnis).
          const morph = await tokenMorphology(tokens[i],{discoverModifiers:false},consumer);
          if (!morph.errors.length && morph.candidates.length && morph.candidates.every(c => canonicalPos(c.pos) === "Nomen")) { lowercaseHead = morph; break; }
          return {reason:"modifier-unproven",index:i};
        }
        if (quote.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index))) return {reason:"boundary"};
        modifierRows.push({index:i,...endings}); i++;
        if (!tokens[i] || !beforeHead(i-1,i)) return {reason:"boundary"};
      }
      if (!tokens[i]) return {reason:"head-unproven"};
      // Undeclined adverbs must grade a following declined modifier; undeclined
      // adjectives may stand only directly before the head.
      for (let k = 0; k < modifierRows.length; k++) {
        const row = modifierRows[k], following = modifierRows[k+1];
        const figureAfter = /\d/u.test(sentence.slice(tokens[row.index].index+tokens[row.index][0].length,tokens[row.index+1]?.index ?? tokens[row.index].index));
        if (row.base === "adverb" && !(following && following.endings) && !figureAfter) return {reason:"adverb-without-modifier"};
        if (row.base === "adjective" && following && !following.endings) return {reason:"undeclined-adjective-position"};
      }
      // Hyphenated compound: walk to the last part (no spaces around the hyphen).
      while (tokens[i+1] && /^[-‐‑]$/u.test(sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index))) i++;
      const tail = sentence.slice(tokens[i].index+tokens[i][0].length);
      if (/^\s*[-‐‑–]/u.test(tail)) return {reason:"compound-head-unproven"};
      const morph = lowercaseHead || await tokenMorphology(tokens[i],{discoverModifiers:false},consumer);
      if (morph.errors.length) return {reason:"head-morphology-error"};
      let readings = nounReadings(tokens[i][0],morph);
      if (lowercaseHead) readings = readings.filter(r => !r.unknown);
      if (!readings.length) {
        // The last part of a compound may be unknown on its own: unknown features.
        const compoundPart = i > anchor + 1 && /^[-‐‑]$/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index));
        if (!compoundPart) return {reason:"head-not-noun"};
        readings = [{number:null,gender:null,cases:new Set(),unknown:true}];
      }
      // A following dictionary noun may be the real head (der Berliner Zeitung,
      // ein Stück Arbeit): the group then admits the readings of either noun.
      // An unknown capitalised word after the head is an appended name.
      if (tokens[i+1] && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && joinedTokens(sentence,tokens,i,i+1)) {
        const following = await tokenMorphology(tokens[i+1],{discoverModifiers:false},consumer);
        if (following.errors.length) return {reason:"head-ambiguous"};
        const second = nounReadings(tokens[i+1][0],following).filter(r => !r.unknown);
        if (second.length) readings = [...readings,...second];
      }
      return {det,head:i,modifiers:modifierRows,readings};
    }
    // Without a determiner, modifiers take strong endings; a bare group with
    // modifiers proves its possible cases from those endings and the head.
    const strongEndings = {masculine:{nominative:"er",accusative:"en",dative:"em",genitive:"en"},
      feminine:{nominative:"e",accusative:"e",dative:"er",genitive:"er"},neuter:{nominative:"es",accusative:"es",dative:"em",genitive:"en"},
      plural:{nominative:"e",accusative:"e",dative:"en",genitive:"er"}};
    function bareGroupCases(group) {
      if (!group.modifiers.some(m => !m.invariant)) return null;
      const cases = new Set();
      for (const r of group.readings) for (const key of r.number === "plural" ? ["plural"] : r.number === "singular" ? [r.gender || "masculine",...(r.gender ? [] : ["feminine","neuter"])] : Object.keys(strongEndings))
        for (const [grammaticalCase,ending] of Object.entries(strongEndings[key]))
          if ((!r.cases?.size || r.cases.has(grammaticalCase)) && group.modifiers.every(m => m.invariant || m.endings.has(ending))) cases.add(grammaticalCase);
      return cases;
    }
    // Conjunction cards whose word order ends in the finite verb are subordinators;
    // "X · Subjekt · Verb" cards coordinate clauses.
    const conjunctionKind = entry => /·\s*…\s*·\s*\*\*Verb\*\*\s*$/u.test(entry?.word_order_pattern || "") ? "subordinating" :
      /^\S+\s*·\s*Subjekt\s*·\s*\*\*Verb\*\*/u.test(entry?.word_order_pattern || "") ? "coordinating" : null;
    // Features of a determiner that agree with the head and every modifier.
    function agreeingFeatures(features, group, governed) {
      return features.filter(f => (!governed?.size || governed.has(f.case)) &&
        group.readings.some(r => (r.number === null || r.number === f.number) && (f.number === "plural" || r.gender === null || r.gender === f.gender) && (!r.cases?.size || r.cases.has(f.case)) && !(r.noDative && f.number === "plural" && f.case === "dative")) &&
        group.modifiers.every(m => m.invariant || m.endings.has(expectedEnding(f.declension,f))));
    }
    // Block 7: a clicked article form in a confirmed noun group is the article
    // card. Agreement is checked against the card's own form table.
    async function articleInNounGroup(word, context, candidates) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const articles = candidates.filter(c => c.source === "main" && c.pos === "article");
      if (articles.length !== 1) return null;
      // All-capital headings (DEN HAAG) carry no case or noun-capital evidence.
      if (word.length > 1 && word === word.toLocaleUpperCase("de-DE")) return null;
      const features = determinerFeatures(word);
      if (!features) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'articleInNounGroup');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      // Relative pronouns open a clause after a comma (…, die Ämter haben;
      // …, in der Menschen leben): no automatic article there.
      const commaBefore = i => i > 0 && /[,;:(]/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index));
      const previous = index > 0 && joinedTokens(sentence,tokens,index-1,index) ? prepositionCardsByForm.get(norm(tokens[index-1][0])) : null;
      // Only der-forms double as relative pronouns; ein/kein forms do not.
      const definite = articles[0].item?.grammar?.article_kind === "definite";
      if (definite && (commaBefore(index) || previous && commaBefore(index-1))) return null;
      const group = await nounGroupAfter(sentence,tokens,index,{determiner:false,consumer:'articleInNounGroup'});
      if (!group.readings) return null;
      const governed = previous ? governedCases(previous) : null;
      const agreeing = agreeingFeatures(features,group,governed);
      observe('noun-agreement',{consumer:'articleInNounGroup',head:tokens[group.head]?.tokenId,agreeing:agreeing.length});
      return agreeing.length ? {candidate:articles[0],evidence:"article-noun-group-agreement",features:agreeing} : null;
    }
    // B15 (15.10.2026): der / die / den / dem without a noun. Two narrow shapes:
    // (1) relative — right after «Noun,» (optionally a preposition: «…, mit dem»),
    // the form agrees with the noun's gender / number, the next word is lowercase
    // and not an adjective before a noun, and the part up to the next punctuation
    // ends with an own verb form (Der Mann, der dort steht, …) → «который»;
    // (2) demonstrative — Der / Den / Dem / Die / Denen opening the sentence right
    // before an own finite verb (Der ist nett. Den kenne ich.) → «тот». «Das ist …»
    // stays a choice (there it is «это»). Anything else stays a choice.
    function derPronounRole(word, context, candidates) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const w = norm(word);
      if (!['der','die','das','den','dem','denen'].includes(w)) return null;
      const pron = id => candidates.find(c => c.source === 'main' && c.dictionaryId === id);
      const demonstrative = pron('pronoun-037'), relative = pron('pronoun-038');
      if (!demonstrative || !relative) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'derPronounRole');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const lower = i => tokens[i] && /^\p{Ll}/u.test(tokens[i][0]);
      const typesOf = i => new Set((forms.get(norm(tokens[i][0])) || []).map(e => e.type));
      const verbRows = i => verbAnalyses.get(norm(tokens[i][0])) || [];
      const next = index+1 < tokens.length && /^\s+$/u.test(gap(index,index+1)) ? index+1 : -1;
      if (next < 0 || !lower(next)) return null;
      // (2) demonstrative at the start of an utterance.
      const before = sentence.slice(0,tokens[index].index);
      const opens = !before.trim() || /[.!?:]\s*[«„“"‘»”]*\s*(?:[–—-]\s*)?$/u.test(before) || /[«„“"‘»]\s*$/u.test(before);
      if (opens && w !== 'das' && /^\p{Lu}/u.test(word)) {
        const types = typesOf(next);
        if (verbRows(next).some(r => r.kind === 'finite' && !r.detached) && [...types].every(t => t === 'Verb'))
          return {candidate:demonstrative,evidence:'demonstrative-before-finite-verb'};
        return null;
      }
      // (1) relative after «Noun,» (or «Noun, preposition»).
      if (!/^\p{Ll}/u.test(word)) return null;
      let comma = index;
      if (index > 0 && /^\s+$/u.test(gap(index-1,index)) && prepositionCardsByForm.get(norm(tokens[index-1][0]))) comma = index-1;
      if (comma < 1 || !/^\s*,\s*$/u.test(gap(comma-1,comma))) return null;
      const head = comma-1, surface = norm(tokens[head][0]);
      if (!/^\p{Lu}/u.test(tokens[head][0])) return null;
      const relatives = {der:['der','den','dem'],die:['die','der'],das:['das','dem'],plural:['die','denen']};
      const nouns = (forms.get(surface) || []).filter(e => e.type === 'Nomen');
      if (!nouns.length) return null;
      const agrees = nouns.some(e => surface === norm(e.word) && relatives[e.article]?.includes(w) ||
        String(e.plural || '').split(/\s*,\s*/u).some(p => norm(p) === surface) && relatives.plural.includes(w));
      if (!agrees) return null;
      // An adjective before a noun makes it an article: …, der kleine Hund.
      if (tokens[next+1] && /^\p{Lu}/u.test(tokens[next+1][0]) && /^\s+$/u.test(gap(next,next+1)) &&
          ((modifiers.get(norm(tokens[next][0])) || []).length || typesOf(next).has('Adjektiv'))) return null;
      let end = index;
      while (end+1 < tokens.length && /^\s+$/u.test(gap(end,end+1))) end++;
      if (end === index || !lower(end) || !verbRows(end).length) return null;
      // A finite verb right after it with more words to follow is the old
      // main-clause order (ein König, der war krank und dachte …; sein Gewehr,
      // das nahm er …): not a relative clause — stays a choice.
      const finiteNext = [norm(tokens[next][0]),norm(tokens[next][0]).replace(/ß/gu,'ss')].some(f => (verbAnalyses.get(f) || []).some(r => r.kind === 'finite'));
      if (next !== end && finiteNext) return null;
      return {candidate:relative,evidence:'relative-pronoun-after-noun'};
    }
    // Block 9: an own card of a closed class whose dictionary form is exactly the
    // clicked spelling is not displaced by a form of another word that only has
    // form-level evidence (a finite form without subject, a lowercase "noun").
    // A4 (15.10.2026): the clicked word is not a modifier before a noun — no
    // determiner directly before it and no capitalised word directly after it.
    function outsideNounGroup(word, context) {
      if (!Number.isInteger(context?.tokenOffset)) return false;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'outsideNounGroup');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word,true);
      if (index < 0) return false;
      const next = tokens[index+1], previous = tokens[index-1];
      if (next && /^\p{Lu}/u.test(next[0]) && /^\s+$/u.test(sentence.slice(tokens[index].index+tokens[index][0].length,next.index))) return false;
      if (previous && (determinerFeatures(previous[0]) || /^(?:mein|dein|sein|ihr|unser|euer|eur|kein|ein)(?:e|en|em|er|es)?$/u.test(norm(previous[0])))) return false;
      return true;
    }
    // A4: an irregular comparative with its own card (besser — "лучше", also
    // advice: Du gehst besser) is the comparative of its positive (gut) when it is
    // the predicate of sein / werden / bleiben (Das ist besser., Es wird besser als …).
    function predicativeComparative(word, context, candidates) {
      if (!/^\p{Ll}/u.test(word) || !outsideNounGroup(word,context)) return null;
      const positive = candidates.filter(c => c.source === 'main' && canonicalPos(c.pos) === 'Adjektiv' && c.item?.comparative &&
        norm(c.item.comparative) === norm(word) && norm(c.lemma) !== norm(word));
      if (positive.length !== 1) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'predicativeComparative');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word,true);
      const after = sentence.slice(tokens[index].index+word.length);
      if (!/^\s*(?:[.!?,;:)»«"“”]|$|als\b)/u.test(after)) return null;
      for (let i = index-1; i >= 0; i--) {
        if (/[.!?;:]/u.test(sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index))) break;
        if ((verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === 'finite' && ['sein','werden','bleiben'].includes(norm(a.base))))
          return positive[0];
      }
      return null;
    }
    async function closedClassExactForm(word, context, candidates, grammatical) {
      // A one-word utterance (Danke! – Bitte!) has no clause to prove another
      // reading; an own closed-class card of this very spelling is the reading.
      if (!grammatical.evidence && grammatical.oneWordUtterance) {
        const own = candidates.filter(c => c.source === "main" && closedWordClasses.has(canonicalPos(c.pos)) &&
          [c.item?.word,...(c.item?.search_forms || [])].some(form => norm(form) === norm(word)));
        const unique = new Set(own.map(c => window.BibliothekVocabulary.identity(c))).size === 1;
        return unique && candidates.length > 1 ? {candidate:own[0],evidence:"one-word-utterance"} : null;
      }
      let weak = formOnlyEvidence[grammatical.evidence], rival = grammatical.preferred;
      // With another certain finite verb in the clause the grammar group is
      // silent; a verb homograph then has only its form (meine Lippen, einige tausend).
      if (!grammatical.evidence && grammatical.otherFinite) {
        const verbs = candidates.filter(c => canonicalPos(c.pos) === "Verb" && !c.reflexiveUnconfirmed);
        if (verbs.length === 1) { rival = verbs[0]; weak = formOnlyEvidence["validated-finite-form"]; }
      }
      if (!weak || !rival || canonicalPos(rival.pos) !== weak.pos || weak.lowercaseOnly && !/^[a-zäöüß]/u.test(word)) return null;
      const surface = norm(word);
      // A separate-sense adverb card (gleich, bestimmt: C1 15.10.2026) is the
      // adverb use of an adjective lexeme, not a closed-class word: it does not
      // override a finite-verb homograph (Was bestimmt den Preis?).
      const exact = candidates.filter(c => c.source === "main" && closedWordClasses.has(canonicalPos(c.pos)) &&
        c.item?.reading_policy !== "separate" &&
        (!weak.closedPos || weak.closedPos.includes(canonicalPos(c.pos))) &&
        [c.item?.word,...(c.item?.search_forms || [])].some(form => norm(form) === surface));
      if (new Set(exact.map(c => window.BibliothekVocabulary.identity(c))).size !== 1) return null;
      // A verb whose infinitive is this very spelling (meinen) is not a derived
      // form: then the closed-class card needs its own evidence — a determiner
      // agreeing with the following noun group (meinen Kurs).
      if (norm(rival.lemma) === surface && weak.pos === "Verb") {
        const features = determinerFeatures(word);
        if (!features || !Number.isInteger(context?.tokenOffset)) return null;
        const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'closedClassExactForm');
        const index = clickedTokenIndex(tokens,context.tokenOffset,word);
        if (index < 0) return null;
        const group = await nounGroupAfter(sentence,tokens,index,{determiner:false,consumer:'closedClassExactForm'});
        if (!group.readings || !agreeingFeatures(features,group,null).length) return null;
      }
      return {candidate:exact[0],evidence:"closed-class-exact-form"};
    }
    // Positive evidence only: fill an unresolved adjective/participle choice.
    // Existing finite, reflexive, perfect and passive decisions take precedence.
    async function unresolvedModifierChoice(word, context, candidates, grammatical) {
      const adjectives = candidates.filter(c => canonicalPos(c.pos) === "Adjektiv");
      const verbs = candidates.filter(c => canonicalPos(c.pos) === "Verb");
      if (!adjectives.length || !verbs.length || !Number.isInteger(context?.tokenOffset)) return null;
      if (candidates.some(c => c.construction)) return null;
      const uniqueAdjective = choices => {
        if (choices.filter(c => c.item?.reading_policy === "separate").length > 1) return null;
        if (new Set(choices.map(c => norm(c.lemma))).size !== 1) return null;
        if (choices.length === 1) return choices[0];
        const own = choices.filter(c => c.source === "main");
        return own.length === 1 ? own[0] : null;
      };
      if (grammatical.evidence === "ambiguous-attributive-modifier") {
        const candidate = uniqueAdjective(grammatical.compatibleAdjectives || []);
        if (candidate) return {candidate,evidence:"attributive-lexical-adjective"};
      }
      const sentence = String(context.sentence || "");
      const tokens = sharedTokens(sentence,'unresolvedModifierChoice');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 1 || !["ganz","sehr","ziemlich","völlig"].includes(norm(tokens[index-1][0]))) return null;
      if (/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[index-1].index+tokens[index-1][0].length,tokens[index].index))) return null;
      const candidate = uniqueAdjective(adjectives);
      if (!candidate) return null;
      const targetAnalyses = await tokenAnalyses(word, undefined, 'unresolvedModifierChoice');
      // Grading cannot settle an independently possible finite/infinitive verb.
      if (!targetAnalyses.some(a => a.kind === "participle") ||
          targetAnalyses.some(a => ["finite","infinitive","imperative"].includes(a.kind))) return null;
      // Do not infer absence of a construction from a truncated local clause.
      // Conservatively retain choice when any helper occurs in the sentence;
      // full coordinated/parenthesised attachment is outside this narrow rule.
      for (let i = 0; i < tokens.length; i++) {
        if (i === index) continue;
        const analyses = await tokenAnalyses(tokens[i][0], undefined, 'unresolvedModifierChoice');
        if (analyses.some(a => ["haben","sein","werden"].includes(a.base) &&
            ["finite","infinitive","participle"].includes(a.kind))) return null;
      }
      return {candidate,evidence:"graded-lexical-adjective-without-auxiliary"};
    }
    // Block 8: preposition card before (or, for postpositions, after) a noun
    // group, from the card's government. A determiner whose case contradicts
    // every governed case is not evidence. seit/bis/während with their own
    // conjunction card read as the conjunction when a verb-final clause follows.
    // Step 6 block 8: the same word as conjunction or adverb, decided by the
    // position of the finite verb and the word order of the own conjunction
    // card (word_order_pattern), never by word lists.
    //   coordinating "X · Subjekt · Verb": clause-initial → conjunction;
    //   subordinating "X · … · Verb": clause-initial before a verb-final clause
    //     → conjunction; any non-coordinating word directly before a finite verb → adverb;
    //   phrasal (no verb in the pattern, "so · Adjektiv · wie · …"): inside a
    //     clause before verbless material → conjunction;
    //   otherwise inside a clause after its finite verb, or inside a clause
    //     opened by a subordinator → adverb.
    async function clausePositionReading(word, context, candidates) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const same = pos => candidates.filter(c => canonicalPos(c.pos) === pos && norm(c.lemma) === norm(word) && !c.construction);
      const pick = rows => rows.length === 1 ? rows[0] : rows.filter(c => c.source === "main").length === 1 ? rows.find(c => c.source === "main") : null;
      const conjunction = pick(same("Konjunktion")), adverb = pick(same("Adverb"));
      // Only an own conjunction card carries word-order data; other readings of
      // the word (preposition, adjective, pronoun …) are decided elsewhere.
      if (!conjunction || !adverb || conjunction.source !== "main" ||
          candidates.some(c => norm(c.lemma) === norm(word) && !["Konjunktion","Adverb","Nomen"].includes(canonicalPos(c.pos)))) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'clausePositionReading');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      const kind = conjunctionKind(conjunction.item);
      const phrasal = !/\*\*Verb\*\*/u.test(conjunction.item?.word_order_pattern || "");
      const boundary = /[,;:.!?()„“”"«»–—]|--/u;
      const gap = (a,b) => clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const kindOf = i => (forms.get(norm(tokens[i][0])) || []).filter(e => e.type === "Konjunktion").map(conjunctionKind);
      const coordinator = i => kindOf(i).includes("coordinating");
      let start = index, end = index;
      while (start > 0 && !boundary.test(gap(start-1,start)) && !coordinator(start-1)) start--;
      while (tokens[end+1] && !boundary.test(gap(end,end+1))) end++;
      // The clause may also end before a coordinator (da ich … hatte und dennoch …).
      let coordinatedEnd = index;
      while (coordinatedEnd < end && !coordinator(coordinatedEnd+1)) coordinatedEnd++;
      const analyses = i => tokenAnalyses(tokens[i][0],undefined,'clausePositionReading');
      const finite = async i => (await analyses(i)).some(a => a.kind === "finite" && !a.detached);
      const isParticle = i => (forms.get(norm(tokens[i][0])) || []).some(e => e.type === "particle");
      const conjunctionAt = evidence => ({candidate:conjunction,evidence});
      const adverbAt = evidence => ({candidate:adverb,evidence});
      if (/^[A-ZÄÖÜ]/u.test(tokens[index][0]) && start !== index) return null;
      // Verb-final stretch after the word: finite verb at the end, no finite
      // verb before it except a verb cluster (wohnen bleiben).
      const verbFinalTo = async last => {
        if (last - index < 2 || !await finite(last)) return false;
        for (let i = index+1; i < last; i++) {
          const rows = await analyses(i);
          if (!isParticle(i-1) && rows.some(a => a.kind === "finite" && !a.detached) && !(i === last-1 && rows.some(a => a.kind === "infinitive"))) return false;
        }
        return true;
      };
      const verbFinalAfter = async () => await verbFinalTo(end) || coordinatedEnd < end && await verbFinalTo(coordinatedEnd);
      // The card's own word order puts the finite verb right after the word (jedoch · Verb · Subjekt).
      const verbNext = /^[^·]+·\s*\*\*Verb\*\*/u.test(conjunction.item?.word_order_pattern || "");
      if (start === index) {
        if (kind === "coordinating") return conjunctionAt('coordinator-at-clause-start');
        // Directly before a finite verb (Da kommen …, Damit ist …, Wie kann …): no subordinate clause.
        if (tokens[index+1] && !boundary.test(gap(index,index+1)) && /^[a-zäöüß]/u.test(tokens[index+1][0]) && await finite(index+1))
          return verbNext ? conjunctionAt('conjunction-before-finite-verb') : adverbAt('adverb-before-finite-verb');
        if (kind === "subordinating" && await verbFinalAfter()) return conjunctionAt('conjunction-before-verb-final-clause');
        return null;
      }
      // Linking two phrases (eine Stadt wie Berlin, so stark wie möglich).
      // Before the clause's finite verb (Eine Stadt wie Berlin ist …) the verb
      // after the word belongs to the clause, not to the compared phrase.
      if (phrasal) {
        let finiteBefore = false;
        for (let i = start; i < index && !finiteBefore; i++) if (/^[a-zäöüß]/u.test(tokens[i][0]) || i === start) finiteBefore = await finite(i);
        if (finiteBefore) for (let i = index+1; i <= coordinatedEnd; i++) if (await finite(i)) return null;
        return conjunctionAt('phrasal-conjunction-without-verb');
      }
      // A subordinator without its comma (… mein Stammladen solange wir hier wohnen bleiben):
      // a subject right after the word and a verb-final clause up to the boundary.
      if (kind === "subordinating" && tokens[index+1] &&
          (subjectPersons[norm(tokens[index+1][0])] || determinerFeatures(tokens[index+1][0])) && await verbFinalAfter())
        return conjunctionAt('conjunction-before-verb-final-clause');
      // Inside a clause opened by a subordinator (dass ich damit …, weil er aber …).
      if (kindOf(start).includes("subordinating") && norm(tokens[start][0]) !== norm(word)) return adverbAt('adverb-in-subordinate-clause');
      let finiteAt = -1;
      for (let i = start; i < index; i++) if (/^[a-zäöüß]/u.test(tokens[i][0]) || i === start)
        if (await finite(i)) { finiteAt = i; break; }
      if (finiteAt < 0) return null;
      // A closed verbal bracket (hat … zugegeben jedoch nicht behoben): the word
      // right after the non-finite verb that closes it links a second conjunct.
      if (index-1 > finiteAt && /^[a-zäöüß]/u.test(tokens[index-1][0])) {
        const rows = await analyses(index-1);
        if (rows.length && rows.every(a => ["participle","infinitive"].includes(a.kind)))
          return conjunctionAt('conjunction-after-closed-bracket');
      }
      return adverbAt('adverb-after-finite-verb');
    }
    async function prepositionChoice(word, context, candidates, separated = []) {
      if (!Number.isInteger(context?.tokenOffset) || candidates.some(c => c.construction || canonicalPos(c.pos) === "Verb")) return null;
      const card = prepositionCardsByForm.get(norm(word));
      const preps = card ? candidates.filter(c => c.source === "main" && c.dictionaryId === card.id) : [];
      if (preps.length !== 1) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'prepositionChoice');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0 || word.length > 1 && word === word.toLocaleUpperCase("de-DE")) return null;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const boundary = /[,;:.!?()„“”"«»]/u;
      const prep = {candidate:preps[0],rule:'preposition-government'};
      // bis zu, bis an …: a combination named in the card's government.
      const combined = new Set((card.government || []).filter(g => g.status === "standard").flatMap(g => String(g.combined_with || "").split("/")).map(norm).filter(Boolean));
      const next = tokens[index+1] && !boundary.test(gap(index,index+1)) ? norm(tokens[index+1][0]) : null;
      if (next && (combined.has(next) || combined.has(contractionForms[next]?.[0]))) return {...prep,evidence:'preposition-combination'};
      const governed = governedCases(card);
      // A figure right after the preposition (über 60 Prozent) may be an adverbial "more than".
      const figureFirst = tokens[index+1] && /\d/u.test(gap(index,index+1));
      const group = figureFirst ? {} : await nounGroupAfter(sentence,tokens,index,{determiner:true,consumer:'prepositionChoice'});
      let caseMismatch = false;
      if (group.readings && group.det !== null) {
        const features = determinerFeatures(tokens[group.det][0]) || [];
        if (agreeingFeatures(features,group,governed).length) return {...prep,evidence:'preposition-before-noun-phrase'};
        caseMismatch = true;
      } else if (group.readings) {
        const cases = bareGroupCases(group);
        if (cases && governed.size && ![...cases].some(c => governed.has(c))) caseMismatch = true;
      }
      const conjunctions = candidates.filter(c => c.source === "main" && canonicalPos(c.pos) === "Konjunktion" && norm(c.lemma) === norm(word) &&
        conjunctionKind(c.item) === "subordinating");
      const clauseStart = index === 0 || boundary.test(gap(index-1,index)) ||
        (forms.get(norm(tokens[index-1][0])) || []).some(e => e.type === "Konjunktion" && conjunctionKind(e) === "coordinating");
      if (conjunctions.length === 1 && clauseStart) {
        let end = index;
        while (tokens[end+1] && !boundary.test(gap(end,end+1))) end++;
        const isParticle = t => (forms.get(norm(t?.[0])) || []).some(e => e.type === "particle");
        const earlierFinite = tokens.slice(index+1,end).some((t,k) => !isParticle(tokens[index+k]) &&
          (verbAnalyses.get(norm(t[0])) || []).some(a => a.kind === "finite" && !a.detached));
        if (end - index >= 2 && !earlierFinite) {
          const analyses = await tokenAnalyses(tokens[end][0],undefined,'prepositionChoice');
          if (analyses.some(a => a.kind === "finite")) return {candidate:conjunctions[0],rule:'subordinate-clause',evidence:'subordinate-clause-verb-final'};
        }
      }
      // An infinitive clause (statt sich … zu schützen, statt Details zu nennen) is not a prepositional phrase.
      let spanEnd = index;
      while (tokens[spanEnd+1] && !boundary.test(gap(spanEnd,spanEnd+1))) spanEnd++;
      const infinitiveClause = spanEnd - index >= 2 && ((forms.get(norm(tokens[spanEnd-1][0])) || []).some(e => e.type === "particle") ||
        zuForms.has(norm(tokens[spanEnd][0])));
      const infinitiveAfter = infinitiveClause || group.head !== undefined && tokens[group.head+1] && joinedTokens(sentence,tokens,group.head,group.head+1) &&
        (forms.get(norm(tokens[group.head+1][0])) || []).some(e => e.type === "particle");
      // Step 6: only a separable-verb hypothesis that pairs this very token
      // (primary or tentative) keeps the choice; a verb elsewhere in the
      // sentence that merely could take this particle no longer does.
      const particleRisk = separated.some(pair => pair.construction?.spans?.some(span => span.start === tokens[index].index));
      if (group.readings && !caseMismatch && !particleRisk && (group.det !== null || !infinitiveAfter)) return {...prep,evidence:'preposition-before-noun-group'};
      // Personal or demonstrative pronoun object: mit ihr, für mich, seit dem.
      if (next && !caseMismatch && !infinitiveClause && !particleRisk && /^[a-zäöüß]/u.test(tokens[index+1][0]) && (forms.get(next) || []).some(e => e.type === "Pronomen") &&
          !(forms.get(next) || []).some(e => e.type === "Verb") && !(verbAnalyses.get(next) || []).length &&
          !(tokens[index+2] && !boundary.test(gap(index+1,index+2)) && /^[A-ZÄÖÜ]/u.test(tokens[index+2][0])))
        return {...prep,evidence:'preposition-before-pronoun'};
      // Postposition after a determiner noun group: des Wetters wegen, die Straße entlang.
      const after = governedCases(card,"after");
      const clauseEnds = !tokens[index+1] || boundary.test(gap(index,index+1)) ||
        /^[a-zäöüß]/u.test(tokens[index+1][0]) && !determinerFeatures(tokens[index+1][0]) &&
          (await tokenAnalyses(tokens[index+1][0],undefined,'prepositionChoice')).some(a => a.kind === "finite");
      if (after.size && index > 0 && !boundary.test(gap(index-1,index)) && clauseEnds) {
        if (particleRisk) return null;
        const morph = await tokenMorphology(tokens[index-1],{discoverModifiers:false},'prepositionChoice');
        if (morph.errors.length) return null;
        const readings = /^[A-ZÄÖÜ]/u.test(tokens[index-1][0]) ? nounReadings(tokens[index-1][0],morph) : [];
        let det = index-2, mods = [];
        while (readings.length && det >= 0 && joinedTokens(sentence,tokens,det,det+1) && !determinerFeatures(tokens[det][0]) && mods.length < 3) {
          const endings = await modifierEndings(tokens[det],'prepositionChoice');
          if (!endings) break;
          mods.push(endings); det--;
        }
        if (readings.length && det >= 0 && determinerFeatures(tokens[det][0]) &&
            agreeingFeatures(determinerFeatures(tokens[det][0]),{readings,modifiers:mods},after).length)
          return {...prep,evidence:'postposition-government-agreement'};
      }
      return null;
    }
    // Shared, dictionary-backed attachment for taps on either end of a noun phrase.
    // This is presentation metadata, not a construction or a new vocabulary identity.
    function attachmentLookup(word) { return sourceLookup(word,'attachmentLookup','grammar'); }
    async function nounPhraseStructure(word, context, candidates, externalModifiers = false) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'nounPhraseStructure');
      const clicked = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (clicked < 0) return null;
      const isArticle=['der','die','das','den','dem','des'].includes(norm(word));
      if(!isArticle&&!candidates.some(c=>canonicalPos(c.pos)==='Nomen'))return null;
      // A successful own-index frame also satisfies external modifier mode:
      // that mode consults the source only when the own index has no modifier.
      let frame=await nounFrame(sentence,tokens,clicked,'display-own');
      if(!frame.hypothesis&&externalModifiers&&!isArticle)
        frame=await nounFrame(sentence,tokens,clicked,'display-external');
      if(!frame.hypothesis)return null;
      const {det,head}=frame.hypothesis;
      observe('noun-hypothesis-use',{consumer:'nounPhraseStructure',id:frame.hypothesis.id,purpose:'display',externalModifiers});
      const adjacent=(a,b)=>/^\s+$/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
      const span=i=>frame.hypothesis.members.find(t=>t.tokenId===tokens[i].tokenId).span;
      return {sentence,tokens,det,head,adjacent,span,hypothesis:frame.hypothesis};
    }
    async function externalNounArticleLink(word,context,candidate,allCandidates) {
      if (candidate?.source !== 'fallback' || !['noun','Nomen'].includes(candidate.pos)) return null;
      const structure = await nounPhraseStructure(word,context,[candidate],true);
      if (!structure || structure.head !== tokenOffsets.get(structure.tokens)?.get(context.tokenOffset)) return null;
      const {sentence,tokens,det,head,adjacent,span} = structure;
      const article = norm(tokens[det][0]);
      const prep = det > 0 && adjacent(det-1,det) ? norm(tokens[det-1][0]) : '';
      // A relative clause can begin with a preposition: …, auf den Juden … .
      if (prep && det > 1 && /,/u.test(sentence.slice(tokens[det-2].index+tokens[det-2][0].length,tokens[det-1].index))) return null;
      // A nominal homograph before another capitalised word may be a modifier
      // (der Berliner Zeitung); a previous noun choice does not prove attachment.
      if (allCandidates.some(c => canonicalPos(c.pos) === 'Adjektiv') &&
          /^\s+[`'“”„"]*\s*[A-ZÄÖÜ]/u.test(sentence.slice(tokens[head].index+tokens[head][0].length))) return null;
      // The export can omit the modifier POS (Londoner Finanzministerium).
      // A following confirmed common noun leaves the clicked head unproven.
      if (tokens[head+1] && /^[A-ZÄÖÜ]/u.test(tokens[head+1][0]) && adjacent(head,head+1)) {
        try {
          const following = await attachmentLookup(tokens[head+1][0]);
          if ((forms.get(norm(tokens[head+1][0])) || []).some(e => e.type === 'Nomen') ||
              following.some(g => g.kind !== 'form-note' && g.pos === 'noun')) return null;
        } catch (_) { return null; }
      }
      const dative = new Set(['mit','bei','von','zu','aus','nach','seit']);
      const accusative = new Set(['für','durch','gegen','ohne','um']);
      if (dative.has(prep) && !['dem','der','den'].includes(article) ||
          accusative.has(prep) && !['den','die','das'].includes(article)) return null;
      const endings = {der:['e','en'],die:['e','en'],das:['e'],den:['en'],dem:['en'],des:['en']};
      for (let i=det+1;i<head;i++) if (!endings[article].some(e => norm(tokens[i][0]).endsWith(e))) return null;
      return {article:tokens[det][0],noun:tokens[head][0],spans:[span(det),span(head)]};
    }
    async function nounPhrase(word, context, candidates) {
      const structure = await nounPhraseStructure(word,context,candidates);
      if (!structure) return [];
      const {sentence,tokens,det,head,adjacent,span} = structure;
      const surface = norm(tokens[head][0]);
      let groups;
      try { groups = await lexicalLookup(tokens[head][0],'nounPhrase'); } catch (_) { return []; }
      const analyses = groups.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
        .filter(a => canonicalPos(a.pos) === 'Nomen');
      const nouns = [...(forms.get(surface) || []).filter(e => e.type === 'Nomen'),
        ...groups.filter(g => g.kind !== 'form-note' && canonicalPos(g.pos) === 'Nomen')
          .flatMap(g => (lemmas.get(norm(g.word)) || []).filter(e => e.type === 'Nomen'))];
      const table = {der:['der','den','dem','des'],die:['die','die','der','der'],
        das:['das','das','dem','des'],plural:['die','die','den','der']};
      const caseNames = ['nominative','accusative','dative','genitive'];
      const governed = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,seit:2,für:1,durch:1,gegen:1,ohne:1,um:1,
        innerhalb:3,außerhalb:3,aufgrund:3};
      const prep = det > 0 && adjacent(det-1,det) ? norm(tokens[det-1][0]) : '';
      const twoWay = new Set(['in','an','auf','unter','über','vor','hinter','neben','zwischen']);
      const result = [];
      for (const noun of [...new Map(nouns.map(e => [e.id,e])).values()]) {
        if (!table[noun.article]) continue;
        // A noun declined like an adjective (der Kranke, ein Kranker) shows the
        // weak ending after a definite article: der Kranke is masculine nominative,
        // never the feminine der Kranken.
        const adjectival = adjectivalNounStem(noun);
        // Before another capitalised word it may be an adjective in a name
        // (der Deutsche Bundestag): no agreement fact for the noun reading.
        if (adjectival && tokens[head+1] && /^[A-ZÄÖÜ]/u.test(tokens[head+1][0]) && adjacent(head,head+1)) continue;
        const rows = analyses.filter(a => norm(a.lemma) === norm(noun.word));
        const plurals = String(noun.plural || '').split(/\s*,\s*/u).map(norm);
        const plural = plurals.some(p => p && p !== '—' && (p === surface || !/[ns]$/u.test(p) && p+'n' === surface)) || rows.some(a => a.number === 'plural');
        const singular = !noun.plural_only && (surface === norm(noun.word) || rows.some(a => a.number === 'singular'));
        for (const key of [...(singular ? [noun.article] : []),...(plural ? ['plural'] : [])]) {
          let cases = table[key].flatMap((form,i) => form === norm(tokens[det][0]) ? [i] : []);
          if (governed[prep] !== undefined) cases = cases.filter(i => i === governed[prep]);
          if (twoWay.has(prep)) cases = cases.filter(i => i === 1 || i === 2);
          // Structured case tags may be split across rows; only use tags with
          // a compatible number, and never transfer plural evidence to singular.
          const tagged = rows.filter(a => !a.number || a.number === (key === 'plural' ? 'plural' : 'singular'))
            .flatMap(a => a.tags || []).filter(t => caseNames.includes(t));
          if (tagged.length) cases = cases.filter(i => tagged.includes(caseNames[i]));
          cases = cases.filter(i => {
            const ending = i >= 2 || key === 'plural' || key === 'der' && i === 1 ? 'en' : 'e';
            for (let m=det+1;m<head;m++) {
              if (!(modifiers.get(norm(tokens[m][0])) || []).some(row => row.ending === ending)) return false;
            }
            if (adjectival && surface !== norm(adjectival + ending)) return false;
            // Dative plural of a dictionary plural that can acquire -n.
            if (key === 'plural' && i === 2 && plurals.some(p => p === surface && !/[ns]$/u.test(p))) return false;
            return true;
          });
          if (cases.length) result.push({dictionaryId:noun.id,lemma:noun.word,baseArticle:noun.article,
            gender:({der:'masculine',die:'feminine',das:'neuter'})[noun.article],number:key === 'plural' ? 'plural' : 'singular',
            cases:cases.map(i => caseNames[i]),article:tokens[det][0],noun:tokens[head][0],spans:[span(det),span(head)]});
        }
      }
      return result;
    }
    // A noun declined like an adjective: its own card lists the mixed form
    // "ein Kranker" in declension_forms (for either gender card of the word).
    // Returns the stem before the ending (Krank) or null.
    function adjectivalNounStem(entry) {
      const word = String(entry?.word || '');
      if (!/[a-zäöüß]e$/u.test(word)) return null;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
      const mixed = new RegExp(`(?:^|·)\\s*ein\\s+${escaped}r\\s*(?:·|$)`,'u');
      return (lemmas.get(norm(word)) || []).some(e => e.type === 'Nomen' && mixed.test(String(e.declension_forms || ''))) ? word.slice(0,-1) : null;
    }
    // Reader reference 4.13 (agreed 11 Oct 2026): a noun declined like an adjective
    // (der/die Kranke) agrees with its determiner like an adjective would: the
    // ending after der/ein/kein/mein/dies- (or the strong ending without one)
    // shows which gender card fits. One gender left → that card; plural or both
    // genders → the masculine card with a shared der/die display (genderPair).
    async function adjectivalNounAgreement(word, context, candidates) {
      if (!Number.isInteger(context?.tokenOffset) || !/^[A-ZÄÖÜ]/u.test(word)) return null;
      const own = candidates.filter(c => c.source === 'main' && canonicalPos(c.pos) === 'Nomen' && adjectivalNounStem(c.item));
      if (!own.length || new Set(own.map(c => norm(c.lemma))).size !== 1) return null;
      const stem = norm(adjectivalNounStem(own[0].item)), surface = norm(word);
      const ending = surface.startsWith(stem) ? surface.slice(stem.length) : null;
      if (!['e','en','er','em','es'].includes(ending)) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'adjectivalNounAgreement');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      // A following capitalised word: maybe an adjective in a name (der Deutsche Bundestag).
      if (tokens[index+1] && /^[A-ZÄÖÜ]/u.test(tokens[index+1][0]) && joinedTokens(sentence,tokens,index,index+1)) return null;
      let det = index-1;
      while (det >= 0 && index-det <= 3 && joinedTokens(sentence,tokens,det,det+1) && /^[a-zäöüß]/u.test(tokens[det][0]) &&
        !determinerFeatures(tokens[det][0]) && (modifiers.get(norm(tokens[det][0])) || []).length) det--;
      const features = det >= 0 && joinedTokens(sentence,tokens,det,det+1) ? determinerFeatures(tokens[det][0]) : null;
      const prepAt = features ? det-1 : index-1;
      const preposition = prepAt >= 0 && joinedTokens(sentence,tokens,prepAt,prepAt+1) ? prepositionCardsByForm.get(norm(tokens[prepAt][0])) : null;
      const governed = preposition ? governedCases(preposition) : null;
      if (!features && (det !== index-1 && det >= 0)) return null;
      // Intermediate modifiers stay unchecked only without a determiner; with one they must agree too.
      const between = features ? tokens.slice(det+1,index) : [];
      const rows = [];
      if (features) {
        for (const f of features) {
          if (governed?.size && !governed.has(f.case)) continue;
          const expected = expectedEnding(f.declension,f);
          if (expected !== ending || between.some(t => !(modifiers.get(norm(t[0])) || []).some(r => r.ending === expected))) continue;
          rows.push(f.number === 'plural' ? 'plural' : f.gender);
        }
      } else {
        for (const [key,table] of Object.entries(strongEndings)) for (const [grammaticalCase,expected] of Object.entries(table)) {
          if (governed?.size && !governed.has(grammaticalCase)) continue;
          if (expected === ending) rows.push(key);
        }
      }
      const readings = new Set(rows.filter(r => ['masculine','feminine','plural'].includes(r)));
      if (!readings.size) return null;
      const byGender = g => own.find(c => c.item?.article === ({masculine:'der',feminine:'die'})[g]);
      const masculine = byGender('masculine'), feminine = byGender('feminine');
      if (readings.size === 1 && !readings.has('plural')) {
        const only = byGender([...readings][0]);
        return only ? {candidate:only,evidence:'adjectival-noun-agreement'} : null;
      }
      // Gender or number open: a shared card when both gender cards exist, else the one card.
      if (masculine && feminine) return {candidate:masculine,evidence:'adjectival-noun-gender-open',pair:feminine};
      const one = masculine || feminine;
      return readings.has('plural') || readings.has(one.item.article === 'der' ? 'masculine' : 'feminine') ? {candidate:one,evidence:'adjectival-noun-agreement'} : null;
    }
    // Reader reference 4.3: an article form (der, ein, kein and their forms) and
    // its noun make one display pair, whichever of the two is tapped. The pair
    // rests on the shared bounded noun group to the right of the article and on
    // agreement with the article card's own form table; intermediate modifiers
    // are checked like in the article-in-noun-group row, but stay out of the pair.
    // Possessive and demonstrative determiners keep separate cards: no pair.
    // Display only: no selection, gender, number or case is claimed.
    const articleForm = form => (articleCardsByForm.get(norm(form)) || []).length > 0;
    async function articleNounLink(word, context) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      if (word.length > 1 && word === word.toLocaleUpperCase('de-DE')) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'articleNounLink');
      const clicked = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (clicked < 0) return null;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const hyphened = (a,b) => !!tokens[a] && !!tokens[b] && /^[-‐‑]$/u.test(gap(a,b));
      // Parts of a hyphenated word (Nord-Süd-Verbindungen) form one head.
      const wordStart = i => { while (i > 0 && hyphened(i-1,i)) i--; return i; };
      const wordEnd = i => { while (hyphened(i,i+1)) i++; return i; };
      let det = clicked;
      if (!articleForm(word)) {
        if (!/^[A-ZÄÖÜ]/u.test(word)) return null;
        for (let d = wordStart(clicked)-1; d >= 0 && clicked-d <= 6; d--) {
          if (!joinedTokens(sentence,tokens,d,d+1) && !hyphened(d,d+1)) return null;
          if (articleForm(tokens[d][0])) { det = d; break; }
          if (!/^[a-zäöüß]/u.test(tokens[d][0]) && !(d === wordStart(clicked)-1 && /^[A-ZÄÖÜ]/u.test(tokens[d][0]))) return null;
        }
        if (det === clicked) return null;
      }
      const cards = articleCardsByForm.get(norm(tokens[det][0])) || [];
      const features = determinerFeatures(tokens[det][0]);
      if (!features) return null;
      // der-forms double as relative pronouns after a comma (…, die Ämter haben).
      const commaBefore = i => i > 0 && /[,;:(]/u.test(gap(i-1,i));
      const previous = det > 0 && joinedTokens(sentence,tokens,det-1,det) ? prepositionCardsByForm.get(norm(tokens[det-1][0])) : null;
      if (cards.some(card => card.grammar?.article_kind === 'definite') && (commaBefore(det) || previous && commaBefore(det-1))) return null;
      let group;
      try { group = await nounGroupAfter(sentence,tokens,det,{determiner:false,consumer:'articleNounLink'}); } catch (_) { return null; }
      if (!group?.readings) return null;
      // An undeclined adjective belongs to the group only as a grade of the next,
      // declined modifier (ein wirklich guter Kaffee, den vermeintlich sicheren Tod);
      // alone (dem völlig Schraubenschlüssel) or as a preposition opening an extended
      // attribute (die in Gaza … geplanten Industrieparks) it gives no pair.
      if (group.modifiers.some((m,k) => m.base === 'adjective' && (!group.modifiers[k+1]?.endings ||
          prepositionCardsByForm.has(norm(tokens[m.index][0]))))) return null;
      // A preposition never stands inside a compact group (der mit 1,8 Millionen … überfüllten …).
      if (group.modifiers.some(m => prepositionCardsByForm.has(norm(tokens[m.index][0])))) return null;
      let first = wordStart(group.head), last = group.head, between = group.modifiers.length;
      // Two capitalised words: the first is the head when it is a known noun and
      // not an adjective (die Stadt Berlin, ein Stück Kuchen); a capitalised or
      // hyphenated adjective (der nordrhein-westfälische Ministerpräsident) leaves
      // the head to the next known noun and stays out of the pair. Unknown words,
      // names and noun/adjective homographs (die Liebe Gottes, der Berliner …) give no pair.
      const next = last+1;
      if (tokens[next] && /^[A-ZÄÖÜ]/u.test(tokens[next][0]) && joinedTokens(sentence,tokens,last,next)) {
        let ending = null, own = null, following = null;
        try {
          ending = await modifierEndings(tokens[last],'articleNounLink');
          own = await tokenMorphology(tokens[last],{discoverModifiers:false},'articleNounLink');
          following = await tokenMorphology(tokens[next],{discoverModifiers:false},'articleNounLink');
        } catch (_) { return null; }
        if (own.errors.length || following.errors.length) return null;
        const lowercaseLast = /^[a-zäöüß]/u.test(tokens[last][0]);
        const adjective = !!ending && ending.base !== 'adverb' && !ending.unknown;
        const noun = !lowercaseLast && nounReadings(tokens[last][0],own).some(r => !r.unknown);
        const nextNoun = nounReadings(tokens[next][0],following).some(r => !r.unknown);
        // A capitalised -er word before a known noun may be a place adjective
        // (die Pariser Regierung, die Gebauer Kunden) even when the dictionary lists only a noun.
        if (!lowercaseLast && first === last && /er$/u.test(tokens[last][0]) && nextNoun && !adjective) return null;
        if ((lowercaseLast && first !== last || adjective && !noun) && nextNoun) { first = next; last = wordEnd(next); between++; }
        else if (!(noun && !adjective && !lowercaseLast)) return null;
      }
      if (det !== clicked && (clicked < first || clicked > last)) return null;
      // Same bounded window as the other display pairs: at most two words between;
      // the parts of a hyphenated head (Nord-Süd-Verbindungen) do not count.
      if (between > 2) return null;
      // A slash or dash compound written with spaces leaves the head open (des gesamten CDU / SPD - Senats).
      if (/^\s*[/–—-]/u.test(sentence.slice(tokens[last].index+tokens[last][0].length))) return null;
      if (!agreeingFeatures(features,group,previous ? governedCases(previous) : null).length) return null;
      const span = (i,j = i) => ({text:sentence.slice(tokens[i].index,tokens[j].index+tokens[j][0].length),start:tokens[i].index,end:tokens[j].index+tokens[j][0].length});
      return {article:tokens[det][0],noun:span(first,last).text,clicked:det === clicked ? 'article' : 'noun',spans:[span(det),span(first,last)]};
    }
    // Step 8: grammar ranking as named rules over shared clause facts. The order
    // is the grammar group of selectionRules (one table); a rule returns
    // undefined to pass, a result to settle the group (preference, ordering of
    // candidates, or an explicit stop/block without a preference).
    function grammarClause(word, context, candidates, inflections) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'grammarRank');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      let start = index, end = index;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const unchanged = {candidates,preferred:null,evidence:null};
      const isVerb = c => (posMap[c.pos] || c.pos) === "Verb";
      const verbs = candidates.filter(isVerb), nouns = candidates.filter(c => (posMap[c.pos] || c.pos) === "Nomen");
      const finite = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II"].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? [group[person]] : Object.values(group)).some(form => {
          if (!form) return false;
          const parts = norm(form).split(/\s+/);
          return norm(tokens[i][0]) === (parts.length === 2 ? parts[1]+parts[0] : norm(form));
        });
      });
      const importedFinite = (candidate,person) => inflections.some(row =>
        norm(row.form) === norm(word) && norm(row.lemma) === norm(candidate.lemma) &&
        (posMap[row.pos] || row.pos) === "Verb" &&
        !row.tags.some(tag => ["infinitive","participle","imperative"].includes(tag)) &&
        row.person && row.number && (row.tense || /^subjunctive/u.test(row.mood || "")) &&
        (!person || ({ich:"first-person:singular",du:"second-person:singular","er/sie/es":"third-person:singular",wir:"first-person:plural",ihr:"second-person:plural",sie:"third-person:plural"})[person] === `${row.person}:${row.number}`));
      const candidateFinite = (candidate,person) => candidate.item && finite(candidate.item,index,person) || importedFinite(candidate,person);
      const choose = (favoured,evidence) => favoured.length ? {
        candidates:[...favoured,...candidates.filter(c => !favoured.includes(c))],
        preferred:favoured.length === 1 ? favoured[0] :
          new Set(favoured.map(c => `${norm(c.lemma)}:${canonicalPos(c.pos)}`)).size === 1 && favoured.filter(c => c.source === "main").length === 1
            ? favoured.find(c => c.source === "main") : null,evidence
      } : unchanged;
      // Internal capitals favour a noun, but sentence/quotation starts do not.
      const prefix = sentence.slice(0,tokens[index].index);
      // A dash after the end of a sentence opens a new reply (Danke! – Bitte!),
      // as does a dash that opens the text (– Bitte!).
      // After a colon a capital may start a full sentence (Überraschung: Ich …).
      const utteranceStart = i => {
        const before = sentence.slice(0,tokens[i].index);
        return i === 0 || /[.!?…:]\s*[«„“"‘»”]*\s*(?:[–—-]\s*)?$/u.test(before) ||
          /^\s*[–—-]\s*$/u.test(before) || /[«„“"‘]\s*$/u.test(before);
      };
      const startsUtterance = utteranceStart(index);
      // B1: a dictionary noun written with a capital inside the sentence (not at
      // the start of an utterance) shows the text follows noun capitalisation.
      // Texts without capitals (ein gutes essen) give no such evidence.
      const nounCapitalisation = tokens.some((token,i) => i !== index && /^\p{Lu}\p{Ll}/u.test(token[0]) &&
        !utteranceStart(i) && matches(i).some(e => e.type === "Nomen"));
      const adjectives = candidates.filter(c => canonicalPos(c.pos) === "Adjektiv");
      const adverbs = candidates.filter(c => canonicalPos(c.pos) === "Adverb");
      const clauseVerbs = tokens.slice(start,end+1).flatMap((_,offset) =>
        matches(start+offset).filter(e => e.type === "Verb"));
      const clauseIndices = Array.from({length:end-start+1},(_,i)=>start+i);
      const adjective = i => modifiers.has(norm(tokens[i]?.[0])) || matches(i).some(e => e.type === "Adjektiv") ||
        ["e","en","em","er","es"].some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      // Our dictionary stores separate exercise cards for adjectives and
      // adverbs; these rules apply only to dictionary-backed ADJ/ADV alternatives.
      const adjectiveAdverbPair = adjectives.length && adverbs.length &&
        new Set([...adjectives,...adverbs].map(c => norm(c.lemma))).size === 1 &&
        candidates.every(c => ["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
          c.source === "fallback" && canonicalPos(c.pos) === "Nomen");
      const auxiliaryVerbs = clauseIndices.flatMap(i => matches(i).filter(e => e.type === "Verb" && ["haben","sein"].includes(e.word) && finite(e,i)));
      const participles = verbs.filter(c => c.item && auxiliaryVerbs.some(e => e.word === c.item.auxiliary) &&
        norm(String(c.item.perfect_form || "").split(/\s+/).pop()) === norm(word));
      // One finite verb per clause: another word of the clause is certainly
      // finite — an own verb-only spelling in a finite form that is not its
      // infinitive (or agrees with an adjacent personal pronoun) and not a
      // participle. Then a finite reading of the clicked word has no support.
      const subjectPersons = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
      const certainFinite = i => {
        const rows = matches(i);
        if (!rows.length || !rows.every(e => e.type === "Verb") || !/^[a-zäöüß]/u.test(tokens[i][0]) && i !== 0) return false;
        if (rows.some(e => norm(String(e.perfect_form || "").split(/\s+/u).at(-1)) === norm(tokens[i][0]))) return false;
        return rows.some(e => finite(e,i) && (norm(e.word) !== norm(tokens[i][0]) ||
          [i-1,i+1].some(j => j >= start && j <= end && j !== index && (subjectPersons[norm(tokens[j][0])] || []).some(person => finite(e,i,person)))));
      };
      // An imperative-only spelling (komm, lies) at the head of its clause is the
      // finite verb of the clause as well: no finite, infinitive or participle
      // reading shares it. Only the clicked word may precede it (Bitte komm!);
      // later in the clause the spelling may be another mood (… erwähnt sei).
      const imperativeOnly = i => {
        if (clauseIndices.some(j => j < i && j !== index)) return false;
        if (!/^[a-zäöüß]/u.test(tokens[i][0]) && i !== 0 || matches(i).some(e => e.type !== "Verb")) return false;
        const rows = verbAnalyses.get(norm(tokens[i][0])) || [];
        return rows.length > 0 && rows.every(r => r.kind === "imperative");
      };
      const otherFinite = clauseIndices.some(i => i !== index && (certainFinite(i) || imperativeOnly(i)));
      // Verb readings that may still be finite here; with another certain finite
      // verb only a spelling equal to the infinitive remains (lassen, meinen).
      const verbReadings = otherFinite ? verbs.filter(c => norm(c.lemma) === norm(word)) : verbs;
      return {word,sentence,tokens,index,start,end,matches,candidates,inflections,unchanged,verbs,nouns,finite,
        candidateFinite,choose,startsUtterance,nounCapitalisation,adjectives,adverbs,clauseVerbs,clauseIndices,adjective,
        adjectiveAdverbPair,participles,otherFinite,verbReadings};
    }
    const grammarProducers = {
      'attributive-agreement'(f) {
        const nominal = nominalRank(f.word,f.tokens,f.index,f.start,f.end,f.matches,f.candidates,null,f.otherFinite);
        return nominal.evidence ? nominal : undefined;
      },
      // These are different learning senses. Generic syntax is not sufficient
      // to silently choose between them; retain the reader's meaning choice.
      // A homograph that is the clause's own finite verb is not a modifier at
      // all (Was bestimmt den Preis? -> bestimmen; C1 15.10.2026 made bestimmt
      // separate): the finite-verb rows below decide it, with their own label.
      'separate-senses'(f) {
        if (f.candidates.filter(c => c.item?.reading_policy === "separate").length <= 1) return undefined;
        for (const id of separateSensesVerbRows) {
          const result = grammarProducers[id](f);
          if (result?.preferred && canonicalPos(result.preferred.pos) === "Verb") return withRule(result,id);
        }
        return f.unchanged;
      },
      // B3: a derived weak verb form (only regular-weak-form evidence) with an
      // adjective ending directly before a capitalised word is the attributive
      // participle when the clause has another certain finite verb (Das hier
      // erwähnte Theaterstück … ist) or no subject precedes it (des besagten
      // Anbieters, aller schwer bewaffneten Kämpfer). Hagrid betrachtete Harry stays open.
      'derived-weak-attributive'(f) {
        const {tokens,index,end,word,sentence} = f;
        if (!f.adjectives.length || !f.verbs.length || !/^[a-zäöüß]/u.test(word) || !/(?:e|en|em|er|es)$/u.test(norm(word)) || index >= end) return undefined;
        const derived = c => { const rows = f.inflections.filter(r => norm(r.form) === norm(word) && norm(r.lemma) === norm(c.lemma));
          return rows.length > 0 && rows.every(r => r.source === "regular-weak-form"); };
        if (!f.verbs.every(derived)) return undefined;
        const next = tokens[index+1];
        if (!/^\p{Lu}/u.test(next[0]) || /[,;:.!?“”„"()«»]/u.test(sentence.slice(tokens[index].index+word.length,next.index))) return undefined;
        const previous = index > f.start ? norm(tokens[index-1][0]) : null;
        const subjects = new Set(["ich","du","er","sie","es","wir","ihr","man","wer","was","der","die","das","welche","welcher"]);
        const noSubjectBefore = previous !== null && /^[a-zäöüß]/u.test(tokens[index-1][0]) && !subjects.has(previous);
        // An article directly followed by a preposition opens an extended
        // participial attribute that this word closes (der mit … Studenten überfüllten Hochschulen).
        const articles = new Set(["der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines"]);
        // A decimal comma (1,8 Millionen) does not end the phrase.
        let openPhrase = false;
        for (let i = index-1; i > 0 && !openPhrase; i--) {
          const gap = sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index).replace(/\d+(?:[.,]\d+)*/gu,"");
          if (/[,;:.!?()„“”"«»]/u.test(gap)) break;
          openPhrase = articles.has(norm(tokens[i-1][0])) && prepositions.has(norm(tokens[i][0]));
        }
        return f.otherFinite || noSubjectBefore || openPhrase ? f.choose(f.adjectives,"derived-weak-attributive") : undefined;
      },
      // Keep homographic verbs/adjectives available for manual correction.
      'internal-capital-noun'(f) {
        if (!f.nouns.length || !/^[A-ZÄÖÜ]/u.test(f.word) || f.startsUtterance) return undefined;
        // B9: between several nouns (Essen / external Esse, plural Essen) the
        // determiner may agree with one only (ein gutes Essen).
        if (new Set(f.nouns.map(c => norm(c.lemma))).size > 1) {
          const determined = grammarProducers['noun-after-determiner'](f);
          if (determined?.preferred?.source === "main") return withRule(determined,'noun-after-determiner');
        }
        return {...f.choose(f.nouns,"internal-capital-noun"),blocked:new Set(f.nouns.map(c => norm(c.lemma))).size > 1 ||
          f.nouns.length > 1 && f.nouns.filter(c => c.source === "main").length !== 1};
      },
      // At the start of an utterance a capital is no evidence; the clause decides.
      // Another finite verb later in the clause or a following genitive article
      // makes the word a noun (Macht korrumpiert; Aussage des Verkäufers).
      'sentence-initial-noun-in-clause'(f) {
        if (!f.nouns.length || !f.verbs.length || !/^[A-ZÄÖÜ]/u.test(f.word) || !f.startsUtterance) return undefined;
        const {tokens,index,end} = f;
        const laterFinite = Array.from({length:end-index},(_,k)=>index+1+k).some(i =>
          /^[a-zäöüß]/u.test(tokens[i][0]) && f.matches(i).some(e => e.type === "Verb" && f.finite(e,i) && norm(e.word) !== norm(tokens[i][0])));
        const next = norm(tokens[index+1]?.[0]);
        return laterFinite || index < end && ["des","eines"].includes(next) ? f.choose(f.nouns,"sentence-initial-noun-in-clause") : undefined;
      },
      // With no other finite verb (a form equal to the infinitive is no proof),
      // a finite form before a personal pronoun or in a clause closed by ! or ?
      // is a verb in first position (Macht weiter so!). Otherwise (headlines)
      // the reader keeps the choice.
      'sentence-initial-finite-verb'(f) {
        if (!f.nouns.length || !f.verbs.length || !/^[A-ZÄÖÜ]/u.test(f.word) || !f.startsUtterance) return undefined;
        const {tokens,index,end,sentence,word} = f;
        const next = norm(tokens[index+1]?.[0]);
        const closing = sentence.slice(tokens[end].index+tokens[end][0].length).match(/^[\s«»“”"'‘’)]*([!?])/u);
        const pronounNext = index < end && ["du","ihr","sie","wir","er","es","man"].includes(next);
        const imperative = c => (verbAnalyses.get(norm(word)) || []).some(a => a.kind === "imperative" && a.entry?.id === c.dictionaryId);
        const finiteVerbs = f.verbs.filter(c => f.candidateFinite(c) || imperative(c));
        // A one-word utterance (Bitte!) has no clause to prove the verb.
        return finiteVerbs.length && (closing && index < end || pronounNext) ? f.choose(finiteVerbs,"sentence-initial-finite-verb") : undefined;
      },
      // In findet das schön, das is the object pronoun, not an article
      // introducing a noun or surname. Resolve the adjective before noun clues.
      'object-predicative-adjective'(f) {
        return f.adjectives.length && f.index > f.start &&
          ["das","es","ihn","sie","mich","dich","uns","euch"].includes(norm(f.tokens[f.index-1][0])) &&
          f.clauseVerbs.some(e => norm(e.word) === "finden") ? f.choose(f.adjectives,"object-predicative-adjective") : undefined;
      },
      'lexical-adverb-modifier'(f) {
        if (!f.adjectiveAdverbPair) return undefined;
        const {tokens,index,end,word} = f;
        const next = norm(tokens[index+1]?.[0]);
        let following = index+1;
        while (following <= end && ["sehr","so","zu","ganz","besonders"].includes(norm(tokens[following][0]))) following++;
        const modifiesAdjective = following <= end && f.matches(following).some(e => e.type === "Adjektiv");
        return norm(word) === "eigentlich" ||
            norm(word) === "gar" && (/^(?:nicht|nichts|kein(?:e|en|em|er|es)?)$/u.test(next) || modifiesAdjective || next === "normal") ||
            norm(word) === "wirklich" && (modifiesAdjective || next === "sehr" || next === "willkommen")
          ? f.choose(f.adverbs,"lexical-adverb-modifier") : undefined;
      },
      // These verbs can take a predicative adjective (findet es schön,
      // macht ihn glücklich). Leave that distinction to the reader.
      'predicate-complement-choice'(f) {
        const predicateComplements = new Set(["finden","machen","halten","nennen","fühlen","wirken","scheinen","aussehen"]);
        return f.adjectiveAdverbPair && f.clauseVerbs.some(e => predicateComplements.has(norm(e.word))) ? f.unchanged : undefined;
      },
      'temporal-adverb'(f) {
        return f.adjectiveAdverbPair && ["spät","früh"].includes(norm(f.word)) &&
          f.tokens.slice(f.start,f.index).some(t => norm(t[0]) === "es") &&
          f.clauseVerbs.some(e => norm(e.word) === "sein") ? f.choose(f.adverbs,"temporal-adverb") : undefined;
      },
      // A lexical verb (including a dictionary-backed participle) is stronger
      // evidence than an auxiliary: ist spät aufgestanden -> adverb.
      'adverbial-verb-modifier'(f) {
        if (!f.adjectiveAdverbPair) return undefined;
        const nounAfter = f.index < f.end && f.matches(f.index+1).some(e => e.type === "Nomen");
        const copulas = new Set(["sein","werden","bleiben"]);
        const auxiliaries = new Set(["sein","haben","werden","können","müssen","dürfen","sollen","wollen","mögen"]);
        const lexicalVerb = f.clauseVerbs.some(e => !auxiliaries.has(norm(e.word)) && !copulas.has(norm(e.word)));
        return !nounAfter && lexicalVerb ? f.choose(f.adverbs,"adverbial-verb-modifier") : undefined;
      },
      'predicative-adjective'(f) {
        if (!f.adjectiveAdverbPair) return undefined;
        const nounAfter = f.index < f.end && f.matches(f.index+1).some(e => e.type === "Nomen");
        const copulas = new Set(["sein","werden","bleiben"]);
        return !nounAfter && f.clauseVerbs.some(e => copulas.has(norm(e.word))) &&
          !f.clauseVerbs.some(e => !copulas.has(norm(e.word))) ? f.choose(f.adjectives,"predicative-adjective") : undefined;
      },
      // After stronger contextual rules, lowercase spelling favours an adjective
      // over a noun. Keep every candidate available for manual correction.
      'lowercase-adjective-over-noun'(f) {
        return f.adjectives.length && f.nouns.length && f.candidates.every(c => ["Adjektiv","Nomen"].includes(canonicalPos(c.pos))) &&
          /^[a-zäöüß]/u.test(f.word) ? f.choose(f.adjectives,"lowercase-adjective-over-noun") : undefined;
      },
      // Sentence-initial capitals provide no evidence between these two roles.
      'sentence-initial-adjective-noun'(f) {
        return f.adjectives.length && f.nouns.length && f.candidates.every(c => ["Adjektiv","Nomen"].includes(canonicalPos(c.pos))) &&
          !/^[a-zäöüß]/u.test(f.word) && f.index === 0
          ? {...f.unchanged,blocked:true,evidence:"sentence-initial-adjective-noun-ambiguity"} : undefined;
      },
      // A dictionary noun after a determiner is useful evidence even when the
      // reader's text omits capitals (mein buch, ein gutes essen).
      'noun-after-determiner'(f) {
        const {tokens,index,start,word} = f;
        const determiners = new Set(["der","die","das","dem","den","des","ein","eine","einem","einen","einer","eines","mein","dein","sein","ihr","unser","euer","kein","keine","dieses","dieser","diese"]);
        let determinerIndex = index-1;
        while (determinerIndex >= start && index-determinerIndex <= 3 && f.adjective(determinerIndex)) determinerIndex--;
        const rawDeterminer = norm(tokens[determinerIndex]?.[0]);
        const determiner = contractionArticle(rawDeterminer) || rawDeterminer;
        const inflectedDeterminer = /^(?:mein|dein|sein|ihr|unser|euer|eur|kein|dies|jen)(?:e|en|em|er|es)?$/u.test(determiner);
        if (!f.nouns.length || determinerIndex < start || !(determiners.has(determiner) || inflectedDeterminer)) return undefined;
        if (/^[a-zäöüß]/u.test(word)) {
          // B1: in a text that capitalises its nouns, a lowercase word that may be
          // the finite verb of a clause without another finite verb is that verb
          // (der … vor einem stand); der laden … hat stays a noun.
          if (f.nounCapitalisation && !f.otherFinite && f.verbs.some(c => f.candidateFinite(c))) return undefined;
          // A lowercase word with its own closed-class cards is one of them, not a
          // noun (das es sich, der aber war, des bis 31. März). A single such card
          // wins through closed-class-exact-form against this noun evidence;
          // between several the reader chooses.
          const closed = f.candidates.filter(c => c.source === "main" && closedWordClasses.has(canonicalPos(c.pos)) &&
            [c.item?.word,...(c.item?.search_forms || [])].some(form => norm(form) === norm(word)));
          if (new Set(closed.map(c => window.BibliothekVocabulary.identity(c))).size > 1) return undefined;
          // A lowercase finite form agreeing with the determiner as its subject,
          // in a clause without another finite verb, is that verb (die waren,
          // die kleinen bekommen); der laden (no agreement) stays a noun.
          const persons = {der:["er/sie/es"],das:["er/sie/es"],die:["er/sie/es","sie"]}[rawDeterminer] || [];
          if (!f.otherFinite && f.verbs.some(c => persons.some(person => f.candidateFinite(c,person)))) return undefined;
        }
        // die, der, den and inflected determiners in -e/-en/-er (meine, diesen)
        // may be plural; ein, das, dem, mein, euer, dieses are singular only.
        const pluralDeterminer = ["die","der","den"].includes(determiner) ||
          inflectedDeterminer && !["unser","euer"].includes(determiner) && /(?:e|en|er)$/u.test(determiner);
        const compatible = f.nouns.filter(c => {
          // B9: an external noun whose form here is only a plural (essen of Esse)
          // does not agree with a singular-only determiner (ein gutes essen).
          if (!c.item?.article) {
            const rows = f.inflections.filter(row => norm(row.form) === norm(word) && norm(row.lemma) === norm(c.lemma) &&
              (posMap[row.pos] || row.pos) === "Nomen");
            return pluralDeterminer || !rows.length || rows.some(row => row.number !== "plural");
          }
          const plural = String(c.item.plural || "").split(/\s*,\s*/).some(p => norm(p) === norm(word) || norm(p)+"n" === norm(word));
          if (plural && (["die","der","den"].includes(determiner) || /(?:e|en|er)$/u.test(determiner) && inflectedDeterminer)) return true;
          if (norm(c.item.word) !== norm(word)) return false;
          const articles = {der:["der","den","dem","des","ein","einen","einem","eines"],die:["die","der","eine","einer"],das:["das","dem","des","ein","einem","eines"]};
          return inflectedDeterminer || (articles[c.item.article] || []).includes(determiner);
        });
        return compatible.length ? f.choose(compatible,"noun-after-determiner") : undefined;
      },
      'infinitive-in-modal-group'(f) {
        const modal = f.clauseIndices.some(i => i < f.index && f.matches(i).some(e => e.type === "Verb" &&
          ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden","lassen"].includes(e.word) && f.finite(e,i)));
        if (!modal || !/^[a-zäöü]/u.test(f.word)) return undefined;
        // B2: the infinitive closes the modal bracket — only verbs may follow it in
        // the clause (lesen können). A spelling that is also an article or pronoun
        // (einen) with other words after it is that word: will einen Hund,
        // herumkicken wie einen Fußball; Wir wollen uns einen. stays the verb.
        const determinerReading = f.candidates.some(c => ["article","Pronomen","num"].includes(canonicalPos(c.pos)));
        const closesBracket = f.clauseIndices.filter(i => i > f.index).every(i => /^[a-zäöüß]/u.test(f.tokens[i][0]) &&
          f.matches(i).length && f.matches(i).every(e => e.type === "Verb"));
        if (determinerReading && !closesBracket) return undefined;
        const infinitives = f.verbs.filter(c => norm(c.lemma) === norm(f.word));
        return infinitives.length ? f.choose(infinitives,"infinitive-in-modal-group") : undefined;
      },
      'participle-with-accusative-object'(f) {
        if (!f.participles.length || !participleObject(f).accusative) return undefined;
        const transitive = f.participles.filter(c => (c.item.complements || []).some(comp => comp.pattern === "Akkusativ"));
        return transitive.length ? f.choose(transitive,"participle-with-accusative-object") : undefined;
      },
      'participle-with-dative-complement'(f) {
        if (!f.participles.length) return undefined;
        const object = participleObject(f);
        if (object.accusative || !object.dative) return undefined;
        const recipients = f.participles.filter(c => (c.item.complements || []).some(comp => comp.pattern === "Dativ"));
        return recipients.length ? f.choose(recipients,"participle-with-dative-complement") : undefined;
      },
      // An auxiliary does not settle hören vs gehören: both can use gehört.
      'auxiliary-and-participle'(f) {
        return f.participles.length ? f.choose(f.participles,"auxiliary-and-participle") : undefined;
      },
      'finite-verb-with-subject'(f) {
        const subjectPersons = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
        const finiteCandidates = f.verbReadings.filter(c => [f.index-1,f.index+1].some(i => i >= f.start && i <= f.end &&
          (subjectPersons[norm(f.tokens[i][0])] || []).some(person => f.candidateFinite(c,person))));
        return finiteCandidates.length ? f.choose(finiteCandidates,"finite-verb-with-subject") : undefined;
      },
      // A local article + dictionary noun can establish third-person agreement.
      // Keep distant/competing subjects and any auxiliary bracket unresolved here.
      'finite-verb-with-noun-subject'(f) {
        const {tokens,index,start,end} = f;
        const subjectPersons = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
        const nounSubjects = [];
        for (let i=start+1;i<=end;i++) {
          const article=norm(tokens[i-1][0]), surface=norm(tokens[i][0]);
          if (!['der','die','das'].includes(article) || !/^[A-ZÄÖÜ]/u.test(tokens[i][0])) continue;
          const readings=f.matches(i).filter(e=>e.type==='Nomen').flatMap(e=>{
            const singular=surface===norm(e.word)&&article===norm(e.article);
            const plural=surface===norm(e.plural)&&article==='die';
            return [...(singular?['er/sie/es']:[]),...(plural?['sie']:[])];
          });
          const persons=[...new Set(readings)];
          if(persons.length===1)nounSubjects.push({index:i,person:persons[0]});
        }
        const otherSubject=f.clauseIndices.some(i=>
          i!==index && subjectPersons[norm(tokens[i][0])] && norm(tokens[i][0])!=='sie' &&
          !['der','die','das'].includes(norm(tokens[i][0])));
        const otherVerb=f.clauseIndices.some(i=>i!==index&&f.matches(i).some(e=>e.type==='Verb'));
        // B14 (15.10.2026): the subject before a relative clause — «Der Hund, den
        // Anna hat, gehört Peter.» Only the narrow shape: the sentence opens with
        // article + noun, a comma, a relative pronoun agreeing with the noun, the
        // relative clause ends with a verb and a comma, and the clicked verb opens
        // the next part.
        const relativeSubject=(()=>{
          if(nounSubjects.length||index!==start||start<5)return null;
          const sentence=String(f.sentence||''),gap=(a,b)=>sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
          if(!/^\s*,\s*$/u.test(gap(start-1,start))||!f.matches(start-1).some(e=>e.type==='Verb'))return null;
          let rs=start-1;
          while(rs>0&&/^\s+$/u.test(gap(rs-1,rs)))rs--;
          if(rs!==2||!/^\s*,\s*$/u.test(gap(1,2))||!/^\s+$/u.test(gap(0,1))||sentence.slice(0,tokens[0].index).trim())return null;
          const article=norm(tokens[0][0]),relative=norm(tokens[2][0]);
          if(!['der','die','das'].includes(article)||!/^[A-ZÄÖÜ]/u.test(tokens[1][0]))return null;
          const relatives={der:['der','den','dem','dessen'],die:['die','der','deren'],das:['das','dem','dessen'],plural:['die','denen','deren']};
          const surface=norm(tokens[1][0]);
          const persons=[...new Set(f.matches(1).filter(e=>e.type==='Nomen').flatMap(e=>[
            ...(surface===norm(e.word)&&article===norm(e.article)&&relatives[e.article]?.includes(relative)?['er/sie/es']:[]),
            ...(surface===norm(e.plural)&&article==='die'&&relatives.plural.includes(relative)?['sie']:[])]))];
          return persons.length===1?{index:1,person:persons[0]}:null;
        })();
        if(relativeSubject&&!otherSubject&&!otherVerb){
          const agreed=f.verbs.filter(c=>f.candidateFinite(c,relativeSubject.person));
          return agreed.length ? f.choose(agreed,'finite-verb-with-noun-subject') : undefined;
        }
        if(nounSubjects.length!==1||otherSubject||otherVerb||
          ['und','oder','aber','sondern','doch'].includes(norm(tokens[start-1]?.[0])))return undefined;
        const subject=nounSubjects[0];
        const before=subject.index===index-1&&subject.index-1===start;
        const after=subject.index===index+2&&index===start;
        if(!before&&!after)return undefined;
        const agreed=f.verbs.filter(c=>f.candidateFinite(c,subject.person));
        return agreed.length ? f.choose(agreed,'finite-verb-with-noun-subject') : undefined;
      },
      // Restored homographs may be finite verbs AND participles of another
      // lemma. Without the subject evidence above, keep that ambiguity even
      // when a parenthesis separates the participle from its auxiliary.
      'validated-finite-form'(f) {
        const finiteOnly = f.verbReadings.filter(c => f.candidateFinite(c));
        const participleAlternative = f.verbs.some(c =>
          c.item && norm(String(c.item.perfect_form || "").split(/\s+/u).at(-1)) === norm(f.word) ||
          f.inflections.some(row => norm(row.lemma) === norm(c.lemma) && row.tags.includes("participle")));
        return finiteOnly.length && !f.nouns.length && !participleAlternative ? f.choose(finiteOnly,"validated-finite-form") : undefined;
      }
    };
    // Object evidence for a perfect participle: an accusative pronoun or
    // determiner + singular noun outside a prepositional phrase, or a dative pronoun.
    function participleObject(f) {
      const {tokens,index,start} = f;
      const prepositions = new Set(["in","an","auf","über","unter","vor","hinter","neben","zwischen","für","durch","gegen","ohne","um","mit","bei","von","zu","aus","nach","seit"]);
      const accusativePronouns = new Set(["mich","dich","ihn","etwas","nichts"]);
      const accusativeDeterminers = new Set(["den","einen","meinen","deinen","seinen","ihren","unseren","euren","keinen","diesen","jenen"]);
      const accusative = f.clauseIndices.some(i => i !== index && !(i > start && prepositions.has(norm(tokens[i-1][0]))) &&
        (accusativePronouns.has(norm(tokens[i][0])) || accusativeDeterminers.has(norm(tokens[i][0])) && (() => {
          let nounIndex = i+1;
          while (nounIndex < index && nounIndex-i <= 3 && f.adjective(nounIndex)) nounIndex++;
          // den Kindern / den Autos may be dative plurals; do not use them
          // as evidence for an accusative verb. This clue is deliberately narrow.
          return nounIndex < index && /^[A-ZÄÖÜ]/u.test(tokens[nounIndex][0]) && !/[ns]$/iu.test(tokens[nounIndex][0]);
        })()));
      const dative = f.clauseIndices.some(i => ["mir","dir","ihm","ihr","uns","euch","ihnen"].includes(norm(tokens[i][0])));
      return {accusative,dative};
    }
    const grammarRuleOrder = selectionRules.filter(rule => rule.group === 'grammar' && !rule.shared).map(rule => rule.id);
    const separateSensesVerbRows = Object.freeze(['sentence-initial-finite-verb','finite-verb-with-subject','finite-verb-with-noun-subject','validated-finite-form']);
    function grammarRank(word, context, candidates, inflections = []) {
      const f = grammarClause(word,context,candidates,inflections);
      if (!f) return {candidates,preferred:null,evidence:null};
      for (const id of grammarRuleOrder) {
        const result = grammarProducers[id](f);
        if (result !== undefined) return withRule(result,id);
      }
      // A silent group still reports whether the clause has another certain
      // finite verb (closed-class-exact-form reads it).
      const silent = {...f.unchanged};
      Object.defineProperty(silent,'otherFinite',{value:f.otherFinite,enumerable:false});
      // One word between the start of an utterance and its end mark (Bitte!).
      const after = f.sentence.slice(f.tokens[f.index].index+f.tokens[f.index][0].length);
      Object.defineProperty(silent,'oneWordUtterance',{value:f.startsUtterance && f.index === f.start && f.index === f.end &&
        /^[\s«»“”"'‘’)]*(?:[.!?…]|$)/u.test(after),enumerable:false});
      return silent;
    }
    // The settling grammar row travels with the result as a non-enumerable
    // label (diagnostics; equality and copies of results stay unchanged).
    function withRule(result,id) {
      const labelled = {...result};
      // A row that delegates to another row keeps that row's label.
      Object.defineProperty(labelled,'rule',{value:result.rule || id,enumerable:false});
      return labelled;
    }
    const superlatives = new Map();
    for (const entry of entries) {
      const explicit=norm(entry.superlative).replace(/^am /u,'');
      const forms=entry.search_forms||[];
      const verified=[explicit,...forms.filter(f=>/sten$/u.test(f)&&forms.includes(f.slice(0,-1)))].filter(f=>/^[\p{L}\p{M}]+$/u.test(f));
      if(!['Adjektiv','Adverb'].includes(entry.type))continue;
      for(const form of new Set(verified)){const rows=superlatives.get(form)||[];rows.push(entry);superlatives.set(form,rows);}
    }
    function contractionExtraContext(word,tail) {
      if(calendarDateLength(word,tail))return 'calendar-date';
      const opener=tail.match(/^[ \t]+("|„|“|«|»|``)/u);
      if(!opener)return null;
      const closer={'"':'"','„':'“','“':'”','«':'»','»':'«','``':"''"}[opener[1]];
      const start=opener[0].length,close=tail.indexOf(closer,start);
      if(close<0||close-start>160)return null;
      const content=tail.slice(start,close);
      if(/[.!?;:\n\r]/u.test(content))return null;
      // Quoted noun phrases, not arbitrary quoted sentences or superlatives.
      const tokens=observedTokens([...content.matchAll(/[\p{L}\p{M}]+(?:[0-9]+)?(?:-[\p{L}\p{M}]+)*/gu)],'contractionExtraContext').slice(0,4);
      let end=0;
      for(const t of tokens) {
        if(/[^\s]/u.test(content.slice(end,t.index)))return null;
        end=t.index+t[0].length;
        const rows=forms.get(norm(t[0]))||[];
        if(/^[A-ZÄÖÜ]/u.test(t[0]))return !rows.length||rows.some(e=>e.type==='Nomen')?'quoted-noun-phrase':null;
        if(grammaticalWords.has(norm(t[0]))||rows.some(e=>e.type==='Verb')&&!modifiers.has(norm(t[0])))return null;
        if(!rows.some(e=>['Adjektiv','Adverb'].includes(e.type))&&!modifiers.has(norm(t[0]))&&!/en$/u.test(t[0]))return null;
      }
      return null;
    }
    async function contractionRule(word,context,candidates) {
      const parts=contractionForms[norm(word)];
      if (!parts) return null;
      const sentence=String(context?.sentence||''), offset=context?.tokenOffset;
      const tail=Number.isInteger(offset)?sentence.slice(offset+word.length):'';
      const extraContext=contractionExtraContext(word,tail);
      const nearby=(Number.isInteger(offset)?rangeTokens(sentence,offset+word.length,sentence.length,'contractionRule'):[]).slice(0,4);
      const local=[];let end=0;
      for(const t of nearby){if(/[^\s]/u.test(tail.slice(end,t.index)))break;local.push(t);end=t.index+t[0].length;}
      const next=local[0];
      let bases=norm(word)==='am'&&next?superlatives.get(norm(next[0]))||[]:[];
      // Already available lexical data only; no neighbour lookup or recursive resolution.
      let nominal=false,windowExhausted=false;
      for(const t of local){
        const rows=forms.get(norm(t[0]))||[];
        if(/^[A-ZÄÖÜ]/u.test(t[0])){nominal=!rows.length||rows.some(e=>e.type==='Nomen');break;}
        if(grammaticalWords.has(norm(t[0]))||rows.some(e=>e.type==='Verb')&&!modifiers.has(norm(t[0]))||
          !rows.some(e=>['Adjektiv','Adverb'].includes(e.type))&&!modifiers.has(norm(t[0]))&&!/en$/u.test(t[0]))break;
        if(t===local[3])windowExhausted=true;
      }
      // Expand missing own evidence only; retain all established own decisions.
      // One shared compact-index fetch, never a lexical lookup of the neighbour.
      if(norm(word)==='am'&&next&&!nominal&&!bases.length&&/^[a-zäöüß].*sten$/u.test(next[0])&&fallback.superlativeEntries) {
        try {
          const rows=await fallback.superlativeEntries(next[0]);
          const unique=new Map();
          for(const [lemma,pos,meanings]of rows) {
            if(!unique.has(norm(lemma)))unique.set(norm(lemma),{word:lemma,type:pos==='adj'?'Adjektiv':'Adverb',translation_en:meanings.join('; '),translation_ru:'',fallbackSuperlative:true});
          }
          bases=[...unique.values()];
        } catch (_) { /* Missing optional evidence preserves the old explicit choice. */ }
      }
      const component=(lemmas.get(parts[0])||[]).map(mainCandidate).find(c=>canonicalPos(c.pos)==='prep') || null;
      let translation={en:'',ru:''};
      if(component)translation={...component.translation};
      else {
        // The contraction's own component must not lose its meaning when
        // contextual morphology evicts an unrelated entry from the LRU cache.
        // Lookup the expansion's preposition, never a neighbouring noun.
        try {const g=(await lexicalLookup(parts[0],'contractionRule')).find(g=>g.pos==='prep'&&!g.unresolved&&g.kind!=='form-note');if(g)translation.en=g.meanings.join('; ');}catch(_){}
      }
      const contraction={source:'fallback',lemma:norm(word),pos:'contraction',posLabel:'contraction',translation,
        explanation:{kind:'contraction',expansion:parts.join(' '),componentLemma:parts[0],componentId:component?.dictionaryId||null},
        construction:{id:'preposition-article',lemma:norm(word),label:'Preposition + article',note:{ru:`${norm(word)} = ${parts.join(' ')}`,en:`${norm(word)} = ${parts.join(' ')}`},spans:Number.isInteger(offset)?[{text:word,start:offset,end:offset+word.length}]:[]}};
      const supers=bases.map(e=>({...mainCandidate(e),source:'fallback',dictionaryId:undefined,item:e.fallbackSuperlative?undefined:e,lemma:`am ${next[0]}`,pos:'superlative-construction',posLabel:'Superlative',
        explanation:{kind:'superlative',baseLemma:e.word,baseId:e.id,...(e.fallbackSuperlative?{evidence:"fallback-structured-superlative"}:{})},
        construction:{id:'am-superlative',lemma:e.word,label:'Superlative',note:{ru:'Превосходная степень',en:'Superlative'},spans:[{text:word,start:offset,end:offset+word.length},{text:next[0],start:offset+word.length+next.index,end:offset+word.length+next.index+next[0].length}]}}));
      const competitors=candidates.filter(c=>c.pos!=='contraction'&&!(norm(c.lemma)===norm(word)&&['prep','particle'].includes(c.pos)) &&
        !(['noun','name'].includes(c.pos)&&/\b(?:acronym|initialism) of\b/iu.test(c.translation?.en||'')&&word!==word.toUpperCase()));
      const uncertainSuper=norm(word)==='am'&&next&&!nominal&&!bases.length&&/sten$/u.test(norm(next[0]));
      const confidentSuper=bases.length===1&&!nominal&&/^[a-zäöüß]/u.test(next[0]);
      const choice=!context||!local.length&&!extraContext||competitors.length>0||uncertainSuper||bases.length>1||bases.length>0&&!nominal&&windowExhausted;
      const result=confidentSuper?[...supers,...competitors]:[contraction,...(!nominal?supers:[]),...competitors];
      return {candidates:result,selected:choice?null:confidentSuper?supers[0]:contraction,evidence:choice?'contraction-choice':confidentSuper?bases[0].fallbackSuperlative?'fallback-am-superlative':'dictionary-am-superlative':extraContext||'preposition-article'};
    }
    function withoutSuperlativeFormRecord(word,context,candidates,inflections) {
      // Lowercase attributive use only; nominalized forms are a separate task.
      if(!context||!Number.isInteger(context.tokenOffset)||!/^[a-zäöüß]/u.test(word))return candidates;
      const next=String(context.sentence||'').slice(context.tokenOffset+word.length).match(/^[ \t]+([\p{L}\p{M}]+)/u);
      if(!next||!/^[A-ZÄÖÜ]/u.test(next[1]))return candidates;
      const known=forms.get(norm(next[1]))||[];
      const compound=/^[ \t]+-[ \t]+[A-ZÄÖÜ][\p{L}\p{M}]+/u.test(String(context.sentence).slice(context.tokenOffset+word.length+next[0].length));
      if(known.length&&!known.some(e=>e.type==='Nomen')&&!compound)return candidates;
      const bases=new Set(inflections.filter(a=>norm(a.form)===norm(word)&&canonicalPos(a.pos)==='Adjektiv'&&a.tags?.includes('superlative')).map(a=>norm(a.lemma)));
      if(bases.size!==1)return candidates;
      const base=[...bases][0];
      if(!candidates.some(c=>canonicalPos(c.pos)==='Adjektiv'&&norm(c.lemma)===base&&norm(c.lemma)!==norm(word)))return candidates;
      const grammar=new Set(['strong','weak','mixed','nominative','accusative','genitive','dative','masculine','feminine','neuter','singular','plural','all','case','gender','superlative','degree']);
      return candidates.filter(c=>{
        if(c.source!=='fallback'||canonicalPos(c.pos)!=='Adjektiv'||norm(c.lemma)!==norm(word))return true;
        const meanings=c.meanings||[c.translation?.en||''];
        const pure=meanings.length>0&&meanings.every(m=>{
          const tokens=norm(m).split(/[\s,;\/-]+/u).filter(Boolean);
          return tokens.includes('superlative')&&tokens.includes('degree')&&tokens.every(t=>grammar.has(t));
        });
        return !pure;
      });
    }
    async function reverseSuperlative(word,context) {
      if(!context||!/sten$/u.test(norm(word))||!Number.isInteger(context.tokenOffset))return null;
      const prefix=String(context.sentence||'').slice(0,context.tokenOffset);
      const previous=prefix.match(/(?:^|[^\p{L}\p{M}])(am|Am)[ \t]+$/u);
      if(!previous)return null;
      const offset=prefix.length-previous[1].length-previous[0].match(/[ \t]+$/u)[0].length;
      const result=await contractionRule(previous[1],{...context,tokenOffset:offset},[]);
      if(!result?.candidates.some(c=>c.construction?.id==='am-superlative'))return null;
      if(result.selected?.construction?.id!=='am-superlative'&&result.selected)return null;
      return {...result,candidates:result.candidates.filter(c=>c.construction?.id==='am-superlative')};
    }
    // Own-dictionary coverage rows, in order. Each row removes external
    // candidates that an own card already covers; the reason names the row.
    const ownCoverageRules = Object.freeze(['merged-modifier-card','single-modifier-card','old-spelling','own-pronoun-form','own-lexeme']);
    const coverageProducers = {
      // A recognised merged lexical card covers both modifier POS headers.
      // Coverage is lemma-scoped: a homographic verb or another lemma survives.
      'merged-modifier-card'(candidates) {
        const merged = candidates.filter(c => c.source === "main" && c.item.reading_policy === "merged");
        return candidates.filter(c => c.source !== "fallback" || !["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
          !merged.some(m => [m.lemma,...(m.item.search_forms || [])].some(lemma => norm(lemma) === norm(c.lemma))));
      },
      // A recognised "single" card (reading_policy: one own part of speech,
      // C1 15.10.2026) covers the external card of the other modifier POS of
      // the same lemma: hin / Mein Handy ist hin, endlich / Endlich ist
      // Wochenende! The rare meaning lives in the card's note. Only the
      // recognised own card covers: a declined form our card does not have
      // (endliche Ressourcen) keeps the external adjective.
      'single-modifier-card'(candidates) {
        const single = candidates.filter(c => c.source === "main" && c.item?.reading_policy === "single" && ["Adjektiv","Adverb"].includes(canonicalPos(c.pos)));
        return candidates.filter(c => c.source !== "fallback" || !["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
          !single.some(m => [m.lemma,...(m.item.search_forms || [])].some(lemma => norm(lemma) === norm(c.lemma))));
      },
      // An old spelling listed in an own card's search_forms (daß → dass: ß for
      // ss before the 1996 reform) is the same lexeme; the own card covers it.
      'old-spelling'(candidates) {
        return candidates.filter(c => c.source !== "fallback" || !candidates.some(m => m.source === "main" &&
          canonicalPos(m.pos) === canonicalPos(c.pos) && norm(m.lemma) !== norm(c.lemma) && norm(c.lemma).replace(/ß/gu,"ss") === norm(m.lemma) &&
          (m.item?.search_forms || []).some(f => norm(f) === norm(c.lemma))));
      },
      // B10 (15.10.2026): pronouns are a closed class and ours are complete. When
      // the clicked word is a form of an own pronoun card (mich: ich / sich), the
      // external pronoun records of the same spelling (mich «reflexive pronoun of
      // ich», mir «alternative form of wir») are not offered. Other parts of
      // speech stay (sein: verb); an uncovered pronoun (jemand) keeps its card.
      'own-pronoun-form'(candidates,separated,state) {
        if (!(forms.get(norm(state.word ?? "")) || []).some(e => e.type === "Pronomen")) return candidates;
        if (!candidates.some(c => c.source === "main" && canonicalPos(c.pos) === "Pronomen")) return candidates;
        return candidates.filter(c => c.source !== "fallback" || canonicalPos(c.pos) !== "Pronomen" || c.construction);
      },
      // Own coverage applies to a lexical lemma/POS, never an entire POS.
      // A card listing several parts of speech (wie: Adverb / Konjunktion)
      // covers the lemma under each of them.
      'own-lexeme'(candidates,separated,state) {
        const lexicalKey = c => `${norm(c.lemma)}:${canonicalPos(c.pos)}`;
        const coveredLexemes = new Set(candidates.filter(c => c.source === "main" && !reflexiveEntries.has(c.item))
          .flatMap(c => [lexicalKey(c),...(c.item?.parts_of_speech || []).map(pos => `${norm(c.lemma)}:${canonicalPos(pos)}`)]));
        if (!coveredLexemes.size) return candidates;
        state.lexemes = true;
        // A known base verb does not cover a reconstructed complete verb
        // missing from ours (stellt … bereit -> bereitstellen, not stellen).
        const uncoveredCompleteVerb = separated.length === 1 && separated[0].source === "fallback" ? separated[0] : null;
        return candidates.filter(c => c.source === "main" || c.reflexiveUnconfirmed || c.construction?.id === "reflexive-verb" || c === uncoveredCompleteVerb || separated.some(pair => pair.source === "fallback" && window.BibliothekVocabulary.identity(pair) === window.BibliothekVocabulary.identity(c)) ||
          knownPartsOfSpeech.has(canonicalPos(c.pos)) && !coveredLexemes.has(lexicalKey(c)));
      }
    };
    function ownCoverage(candidates,separated,word) {
      const state = {lexemes:false,word}, removed = [];
      for (const id of ownCoverageRules) {
        const kept = coverageProducers[id](candidates,separated,state);
        for (const c of candidates) if (!kept.includes(c)) removed.push({candidate:c,rule:id});
        candidates = kept;
      }
      return {candidates,removed,lexemes:state.lexemes};
    }
    async function resolveInternal(word, context) {
      syncSourceVersion();
      if(context){
        if(fallback.mayBeVerb && hasReflexivePronoun(context.sentence))fallback.mayBeVerb(word);
        if(!ownOnlyVerbs.has(norm(word))&&!(forms.get(norm(word))||[]).some(e=>e.type==='Verb'&&ownOnlyVerbs.has(norm(e.word))))lexicalLookup(word,'resolve').catch(()=>{});
      }
      let preparationError = null;
      if (context) try { await prepareSeparable(); } catch (e) { preparationError = e; }
      const exact = [...(forms.get(norm(word)) || [])];
      // The age entry is a bound suffix, never the archaic standalone jährig.
      // Accept numeric and common spelled-out number compounds, including endings.
      const ageEntry = entries.find(e => e.word === "-jährig");
      const unit = "(?:ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)";
      const tens = "(?:zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)";
      const number = `(?:${unit}(?:hundert|tausend))?(?:${unit}und${tens}|${unit}|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|${tens})`;
      if (ageEntry && new RegExp(`^(?:[1-9][0-9]*-|${number})jährig(?:e|en|em|er|es)?$`,"u").test(norm(word)) && !exact.some(e=>e.id===ageEntry.id)) exact.push(ageEntry);
      const derived = (modifiers.get(norm(word)) || []).map(row => row.entry);
      const dictionaryForms = new Set(exact.map(e => e.id));
      const ownOnlyVerb = ownOnlyVerbs.has(norm(word)) || exact.some(item => item.type === "Verb" && ownOnlyVerbs.has(norm(item.word)));
      let separated = [];
      try { separated = await resolveSeparableCandidates(word,context); } catch (e) { preparationError ||= e; }
      // Independent clicked-word lookup overlaps sentence morphology; reuse
      // the same promise in both paths instead of serial network round trips.
      const directLookup=!ownOnlyVerb&&(!exact.length||context||reflexiveForms.has(norm(word)))?lexicalLookup(word,'resolve'):null;
      directLookup?.catch(()=>{});
      const reflexive = await reflexiveCandidates(word,context);
      let candidates = [...separated,...exact.map(mainCandidate),...derived.map(mainCandidate)], error = preparationError, unresolvedMeanings = [], formNotes = [], inflections = [];
      // Interactive lookup checks missing parts of speech; word-only callers keep
      // their existing main-first behaviour and avoid unnecessary downloads.
      if (!ownOnlyVerb && (!exact.length || context || reflexiveForms.has(norm(word)))) {
        try {
          // Use the common source collector without enabling new role choices.
          // The next stage can consume its verified modifier discoveries.
          await directLookup;
          const morphology = await collectMorphology(word, undefined, 'resolveInternal');
          if (morphology.errors.length) throw new Error(morphology.errors.map(e=>e.message).join('; '));
          for (const group of morphology.groups) {
            if (ownOnlyVerbs.has(norm(group.word)) || group.kind === "form-note" && group.inflections?.some(row => ownOnlyVerbs.has(norm(row.lemma)))) continue;
            if (group.kind === "form-note") { formNotes.push(group); inflections.push(...(group.inflections || [])); continue; }
            const partOfSpeech = canonicalPos(group.pos);
            if (group.unresolved) { unresolvedMeanings.push(...group.meanings); continue; }
            const main = (lemmas.get(norm(group.word)) || []).filter(item => partOfSpeech && item.type === partOfSpeech);
            for (const item of main) dictionaryForms.add(item.id);
            candidates.push(...main.map(mainCandidate));
            if (group.meanings.length) candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",posLabel:partOfSpeech,
              translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings,
              ...(partOfSpeech === "Verb" && /^sich\s+/u.test(norm(group.word)) && norm(word) !== norm(group.word)
                ? {reflexiveUnconfirmed:true} : {})});
          }
        } catch (e) { error = e; }
      }
      // Replace conditional reflexive entries before POS coverage can hide
      // their non-reflexive counterparts. Unconfirmed senses remain available
      // for manual selection but cannot rank or resolve themselves.
      // L01 attributive participles have independent noun-phrase evidence;
      // they must not require an explicit reflexive pronoun in the text.
      const attributed = derived.some(e=>reflexiveEntries.has(e))
        ? grammarRank(word,context,candidates,inflections).candidates.filter(c=>reflexiveEntries.has(c.item) && c.usage?.role === "attributive") : [];
      candidates = candidates.filter(c => !reflexiveEntries.has(c.item) || norm(word) === norm(c.lemma));
      // Mapped fallback lemmas and reconstructed separated verbs can supply
      // candidates even when the own finite-form table is incomplete.
      const lexicalEntries = new Set((reflexiveForms.get(norm(word)) || []).map(row=>row.entry));
      for (const c of candidates) if (canonicalPos(c.pos) === "Verb")
        for (const entry of reflexiveLemmas.get(norm(c.lemma)) || []) lexicalEntries.add(entry);
      for (const analysis of inflections)
        for (const entry of reflexiveLemmas.get(norm(analysis.lemma)) || []) lexicalEntries.add(entry);
      const conditional = [...lexicalEntries]
        .filter(entry => ![...reflexive,...attributed].some(c=>c.dictionaryId === entry.id))
        .map(entry=>({...mainCandidate(entry),reflexiveUnconfirmed:true}));
      candidates.push(...reflexive,...attributed,...conditional);
      // Own-dictionary coverage (step 8): named rows; removed candidates are
      // reported in decision.rejected with the covering row.
      const coverage = ownCoverage(candidates,separated,word);
      candidates = coverage.candidates;
      if (coverage.lexemes) unresolvedMeanings = [];
      candidates = [...reflexive,...candidates.filter(c=>!reflexive.some(r=>window.BibliothekVocabulary.identity(r)===window.BibliothekVocabulary.identity(c)))];
      candidates = candidates.filter((c,i,all) => all.findIndex(x => window.BibliothekVocabulary.identity(x) === window.BibliothekVocabulary.identity(c)) === i);
      const nominal = nominalizedReadings(word,context,candidates), nominalizedNoun = nominal.noun;
      if (nominalizedNoun) {
        const identity = window.BibliothekVocabulary.identity(nominalizedNoun);
        candidates = [nominalizedNoun,...candidates.filter(c => window.BibliothekVocabulary.identity(c) !== identity)];
      }
      const people = nominal.people;
      if (people) {
        const identities = new Set(people.map(c => window.BibliothekVocabulary.identity(c)));
        candidates = [...people,...candidates.filter(c => !identities.has(window.BibliothekVocabulary.identity(c)))];
      }
      const group = await verbConstruction(word,context,candidates);
      if (group) candidates = [...candidates,...constructionCandidates(group,word,candidates)].map(c => withConstructionRole(group,c));
      // Base verbs from either dictionary are eligible for later contextual
      // analysis; eligibility does not assert a reflexive sense or create an ID.
      candidates = candidates.map(c => canonicalPos(c.pos) === "Verb" && !c.reflexiveLexical
        ? {...c,reflexiveLexical:{baseLemma:norm(c.lemma).replace(/^sich\s+/u,""),
          evidence:/^sich\s+/u.test(norm(c.lemma)) ? "dictionary-reflexive-lemma" : "base-verb-only"}}
        : c);
      // A verb-form link must not import its target's nominalized noun sense.
      // Keep direct homographs and targets explicitly linked by a noun form note.
      candidates = candidates.filter(c => {
        if (c.source !== "fallback" || canonicalPos(c.pos) !== "Nomen" ||
            !/^gerund of /i.test(c.translation?.en || "") || norm(c.lemma) === norm(word)) return true;
        const lemma = norm(c.lemma).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reference = new RegExp('\\bof\\s+' + lemma + '(?=$|[\\s:(“"])', 'u');
        return formNotes.some(g => canonicalPos(g.pos) === "Nomen" &&
          g.meanings.some(note => reference.test(norm(note))));
      });
      candidates=withoutSuperlativeFormRecord(word,context,candidates,inflections);
      const unconfirmed = candidates.filter(c => c.reflexiveUnconfirmed);
      const roleRank = await sharedRoleRank(word,context,candidates.filter(c=>!c.reflexiveUnconfirmed));
      const grammatical = roleRank || grammarRank(word, context, candidates.filter(c => !c.reflexiveUnconfirmed), inflections);
      const ranked = contextualRank(word, context, grammatical.candidates);
      candidates = [...ranked.candidates,...unconfirmed];
      const same = (a,b) => window.BibliothekVocabulary.identity(a) === window.BibliothekVocabulary.identity(b);
      const reflexiveVerb = reflexive.length === 1 && !reflexivePronouns.has(norm(word))
        ? candidates.find(c=>same(c,reflexive[0])) : null;
      const constructions = constructionSelection(candidates,separated), grouped = constructions.grouped;
      // A lowercase spelling is evidence against a noun reading (macht, wolle):
      // an own noun card does not win or cancel the exact-form row while another
      // part of speech is available. It stays a candidate for manual choice, and
      // contextual rules (der laden after a determiner) still apply above.
      const exactReadings = /^\p{Ll}/u.test(word) && candidates.some(c => canonicalPos(c.pos) !== "Nomen")
        ? exact.filter(e => canonicalPos(e.type) !== "Nomen") : exact;
      const exactChoice = exactReadings.length === 1 && !reflexiveEntries.has(exactReadings[0]) && !exactFormNeedsContext.has(exactReadings[0].type) ? candidates.find(c => same(c,mainCandidate(exactReadings[0]))) : null;
      const competingLexeme = exactChoice && candidates.some(c => canonicalPos(c.pos) === canonicalPos(exactChoice.pos) && norm(c.lemma) !== norm(exactChoice.lemma));
      // Card preference follows our dictionary convention only for a proven
      // lassen bracket and the paired finite form, not for standalone mögen.
      const moechteCard=group?.id==='lassen-infinitive'&&group.tense==='Konjunktiv II'&&
        grouped.some(c=>c.source==='main'&&c.lemma==='mögen') &&
        (verbAnalyses.get(norm(word))||[]).some(a=>a.base==='mögen'&&a.kind==='finite'&&a.tense==='Konjunktiv II')
          ? grouped.find(c=>c.source==='main'&&c.lemma==='möchten'&&(verbAnalyses.get(norm(word))||[]).some(a=>a.entry?.id===c.dictionaryId&&a.kind==='finite'&&a.tense==='Präsens')) : null;
      const needsReflexiveChoice = !reflexivePronouns.has(norm(word)) && candidates.some(c=>c.construction?.id === "reflexive-verb" && c.construction.interpretation && c.construction.confidence === "tentative");
      const derivedOnly = candidates.length === 1 && derived.some(e => e.id === candidates[0].dictionaryId) && !dictionaryForms.has(candidates[0].dictionaryId);
      // Producers propose; the selection core decides (one place, explicit table).
      // A plausible detached particle makes the base meaning uncertain too.
      // Saved occurrence choices are restored by the reader after resolution.
      const predicativeComparativeCard = predicativeComparative(word,context,candidates);
      const closedClass = await closedClassExactForm(word,context,candidates,grammatical);
      const position = await clausePositionReading(word,context,candidates);
      const selection = selectionCore.start({candidates,derivedOnly,covered:coverage.removed,
        proposals:{
          ...nominal.proposals,
          'grammar-blocked':{active:!!grammatical.blocked},
          'lexicon-convention':{candidate:moechteCard},
          'reflexive-subject':{candidate:reflexiveVerb,evidence:reflexiveVerb ? "reflexive-subject-agreement" : null},
          ...(ranked.rule ? {[ranked.rule]:{candidate:ranked.preferred,evidence:ranked.evidence}} : {}),
          ...constructions.proposals,
          'clause-position':position ? {candidate:position.candidate,evidence:position.evidence} : null,
          'predicative-comparative':{candidate:predicativeComparativeCard,evidence:predicativeComparativeCard ? 'predicative-comparative' : null},
          'closed-class-exact-form':closedClass,
          ...(grammatical.rule ? {[grammatical.rule]:{candidate:grammatical.preferred,evidence:grammatical.evidence}} : {}),
          'exact-form':{candidate:!competingLexeme ? exactChoice : null}
        },
        choiceBlocks:[
          {id:'reflexive-reciprocal-choice',active:needsReflexiveChoice,requiresChoice:true,evidence:needsReflexiveChoice ? "reflexive-reciprocal-choice" : null},
          ...constructions.blocks
        ]});
      candidates = selection.candidates;
      const resolution = { preferred:selection.preferred, evidence:selection.evidence, form:word, formNotes, inflections, status:selection.status, candidates, selected:selection.selected, unresolvedMeanings, error };
      if (selection.canFill('attributive-or-graded-adjective',resolution)) {
        const modifierChoice = await unresolvedModifierChoice(word,context,candidates,grammatical);
        if (modifierChoice) selection.fill(resolution,'attributive-or-graded-adjective',modifierChoice.candidate,modifierChoice.evidence);
      }
      if (selection.canFill('article-in-noun-group',resolution)) {
        const article = await articleInNounGroup(word,context,candidates);
        if (article) selection.fill(resolution,'article-in-noun-group',article.candidate,article.evidence);
      }
      if (selection.canFill('der-pronoun-role',resolution)) {
        const role = derPronounRole(word,context,candidates);
        if (role) selection.fill(resolution,'der-pronoun-role',role.candidate,role.evidence);
      }
      if (selection.canFill('preposition-government',resolution)) {
        const preposition = await prepositionChoice(word,context,candidates,separated);
        if (preposition) selection.fill(resolution,preposition.rule,preposition.candidate,preposition.evidence);
      }
      observe('stage', {stage:'initial-selection',selected:resolution.selected?.lemma || null});
      const contractionResult=await contractionRule(word,context,candidates)||await reverseSuperlative(word,context);
      if(contractionResult)selection.override(resolution,'contraction-or-superlative',contractionResult);
      // Candidate addition ends here, before the agreement and display stages.
      // Keep verified external participle bases even when the noun-phrase
      // parser cannot establish a role. Add them after selection so a single
      // recovered base is never mistaken for an automatic contextual choice.
      if (selection.canAppend(resolution) && Number.isInteger(context?.tokenOffset) &&
          !resolution.candidates.some(c => c.construction || c.usage?.role === 'nominalized') &&
          // Capitalised participles may be nouns; leave those to L03.
          /^\p{Ll}/u.test(word) &&
          /(?:e|en|em|er|es)$/u.test(norm(word))) {
        const discovered = await collectMorphology(word,{discoverModifiers:true}, 'resolveInternal');
        if (!discovered.errors.length) {
          for (const candidate of discovered.candidates) {
            const proof = discovered.analyses.filter(a => a.kind === 'participle-declined' &&
              a.evidence === 'verified-participle-link-regular-ending' &&
              a.lemma === candidate.lemma && canonicalPos(a.pos) === canonicalPos(candidate.pos));
            if (!proof.length || resolution.candidates.some(c => window.BibliothekVocabulary.identity(c) === window.BibliothekVocabulary.identity(candidate))) continue;
            const retained = {...candidate,morphologyEvidence:proof.map(a=>({...a,tags:[...(a.tags || [])]}))};
            selection.appendLate(resolution,'participle-base',retained);
          }
        }
      }
      await participleUsage(word,context,resolution);
      await verbPrepositionLink(word,context,resolution);
      // Noun-phrase facts feed one agreement row. Attaching them to the cards is
      // presentation (presentResolution), so the row reads the facts directly.
      const phrases = await nounPhrase(word,context,resolution.candidates);
      const articlePhrase = phrases.length && new Set(phrases.map(p => `${p.lemma}:${p.baseArticle}`)).size === 1;
      const phrasesFor = c => canonicalPos(c.pos) === 'Nomen' ? phrases.filter(p => p.dictionaryId === c.dictionaryId) :
        c.pos === 'article' && articlePhrase ? phrases : [];
      if (articlePhrase && selection.canFill('article-noun-agreement',resolution)) {
        const linked = resolution.candidates.filter(c => phrasesFor(c).length);
        // B12 (15.10.2026): a plural article (den Studien) fits a noun of any
        // gender, so it does not tell our noun (Studium) from another external
        // noun of the same form (Studie), whose gender we do not know.
        const pluralOnly = linked.length === 1 && canonicalPos(linked[0].pos) === 'Nomen' && phrasesFor(linked[0]).every(p => p.number === 'plural');
        // Only a real other noun counts: capitalised and not the clicked form itself
        // (a record «papiere» / «leut» of the same plural is no rival).
        const rivalNoun = pluralOnly && resolution.candidates.some(c => c.source === 'fallback' && canonicalPos(c.pos) === 'Nomen' &&
          /^\p{Lu}/u.test(c.lemma) && norm(c.lemma) !== norm(linked[0].lemma) && norm(c.lemma) !== norm(word));
        if (linked.length === 1 && !rivalNoun) selection.fill(resolution,'article-noun-agreement',linked[0],
          linked[0].pos === 'article' ? 'definite-article-noun-agreement' : 'noun-definite-article-agreement');
      }
      if (selection.canFill('adjectival-noun-agreement',resolution)) {
        const agreement = await adjectivalNounAgreement(word,context,resolution.candidates);
        if (agreement && selection.fill(resolution,'adjectival-noun-agreement',agreement.candidate,agreement.evidence) && agreement.pair)
          resolution.adjectivalPair = {masculine:agreement.candidate.dictionaryId,feminine:agreement.pair.dictionaryId};
      }
      selection.finish(resolution);
      observe('stage', {stage:'grammar-complete',selected:resolution.selected?.lemma || null});
      await presentResolution(word,context,resolution,phrasesFor);
      return resolution;
    }
    // B6 (15.10.2026): a selected verb card whose clicked spelling is one of its
    // participles outside a confirmed noun frame. Marks the use only; the card
    // and the choice stay. (1) A declined participle directly before a
    // capitalised word (seltsam gekleideter Menschen): the ending leaves no
    // finite, infinitive or imperative reading. (2) A bare Partizip I next to a
    // verb (keuchend vor einem stand, lachend ins Zimmer), agreed with the user:
    // Partizip I only — a bare Partizip II belongs to Perfekt / Passiv groups.
    // An article or a preposition up to three words before, across lowercase words only.
    function articleOrPrepositionBefore(tokens, index) {
      for (let i = index-1; i >= 0 && index-i <= 3; i--) {
        const t = norm(tokens[i][0]);
        if (/^(?:der|die|das|den|dem|des|(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?|(?:dies|jen|welch|jed|manch|solch|all)(?:e|en|em|er|es))$/u.test(t) ||
            prepositions.has(t) || contractionForms[t]) return true;
        if (!/^\p{Ll}/u.test(tokens[i][0])) return false;
      }
      return false;
    }
    async function participleUsage(word, context, resolution) {
      const card = resolution.selected;
      if (card && canonicalPos(card.pos) === 'Adjektiv') return participleCard(word,resolution);
      if (!card || canonicalPos(card.pos) !== 'Verb' || card.usage || card.construction || !/^\p{Ll}/u.test(word) ||
          !Number.isInteger(context?.tokenOffset) || grammaticalWords.has(norm(word)) || prepositions.has(norm(word))) return;
      const base = norm(card.lemma).replace(/^sich\s+/u,''), key = norm(word);
      const facts = await collectMorphology(word,{discoverModifiers:true},'resolveInternal');
      if (facts.errors.length) return;
      const own = facts.analyses.filter(a => norm(a.lemma).replace(/^sich\s+/u,'') === base && canonicalPos(a.pos) === 'Verb');
      if (own.some(a => ['finite','infinitive','imperative','dictionary-form'].includes(a.kind) ||
          a.kind === 'inflection' && !a.tags?.includes('participle'))) return;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'participleUsage');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word,true);
      if (index < 0) return;
      let usage = null;
      const declined = own.find(a => a.ending && ['participle-declined','participle-I','participle-II'].includes(a.kind));
      if (declined) {
        const next = tokens[index+1];
        if (!next || !/^\p{Lu}/u.test(next[0]) || !/^\s+$/u.test(sentence.slice(tokens[index].index+word.length,next.index))) return;
        // After an article or a preposition the agreement rows decide (Der schlafendes Kind stays unmarked).
        if (articleOrPrepositionBefore(tokens,index)) return;
        const kind = declined.kind === 'participle-declined' ? (declined.tags?.includes('past') ? 'participle-II' : 'participle-I') : declined.kind;
        usage = {kind,role:'attributive',form:word,base:declined.base || declined.lemma,head:next[0]};
      } else if (/end$/u.test(key) && (key === base+'d' || own.some(a => a.kind === 'inflection' && a.tags?.includes('participle') && a.tags.includes('present')))) {
        usage = {kind:'participle-I',role:'adverbial',form:word,base:key};
      }
      if (!usage) return;
      const marked = {...card,usage}, id = window.BibliothekVocabulary.identity(card);
      resolution.candidates = resolution.candidates.map(c => window.BibliothekVocabulary.identity(c) === id ? marked : c);
      if (resolution.preferred === card) resolution.preferred = marked;
      resolution.selected = marked;
    }
    // A2 (15.10.2026), reference 4.9 / 5.5: a verb and its governed preposition
    // from the agreed pair list (exercise „Verben mit Präpositionen“). The pair is
    // linked only when it is the clause's one such pair: one finite / infinitive /
    // participle form of the verb, one occurrence of the preposition after or
    // before it, an object right after the preposition, and an object case that
    // does not contradict the list (Ich warte auf dem Bahnsteig is no link).
    // Marks the card only: verb «Verb · auf + Akkusativ», preposition
    // «Präposition · warten + auf + Akkusativ», highlight verb … preposition.
    const objectCase = {dem:'Dativ',einem:'Dativ',keinem:'Dativ',meinem:'Dativ',deinem:'Dativ',seinem:'Dativ',ihrem:'Dativ',unserem:'Dativ',
      eurem:'Dativ',diesem:'Dativ',jenem:'Dativ',welchem:'Dativ',mir:'Dativ',dir:'Dativ',ihm:'Dativ',ihnen:'Dativ',
      einen:'Akkusativ',keinen:'Akkusativ',meinen:'Akkusativ',deinen:'Akkusativ',seinen:'Akkusativ',unseren:'Akkusativ',euren:'Akkusativ',
      diesen:'Akkusativ',jenen:'Akkusativ',mich:'Akkusativ',dich:'Akkusativ',ihn:'Akkusativ'};
    const contractionCase = {am:'Dativ',im:'Dativ',beim:'Dativ',vom:'Dativ',zum:'Dativ',zur:'Dativ',ans:'Akkusativ',aufs:'Akkusativ',ins:'Akkusativ',
      fürs:'Akkusativ',ums:'Akkusativ',übers:'Akkusativ',vors:'Akkusativ',durchs:'Akkusativ'};
    const contractionPreposition = {am:'an',ans:'an',im:'in',ins:'in',beim:'bei',vom:'von',zum:'zu',zur:'zu',aufs:'auf',fürs:'für',ums:'um',übers:'über',vors:'vor',durchs:'durch'};
    async function verbPrepositionLink(word, context, resolution) {
      const card = resolution.selected;
      if (!card || !fallback.verbPrepositions || !Number.isInteger(context?.tokenOffset)) return;
      const type = canonicalPos(card.pos), isVerb = type === 'Verb', isPreposition = card.pos === 'preposition' || type === 'prep';
      if (!isVerb && !isPreposition || isVerb && card.construction) return;
      let list;
      try { list = await fallback.verbPrepositions(); } catch (_) { return; }
      const clause = verbalClause(word,context,'verbPrepositionLink',clauseBoundaries.verbGroup);
      if (!clause) return;
      const {tokens,selected,indices} = clause;
      const base = value => norm(value).replace(/^sich\s+/u,'');
      const prepositionAt = i => contractionPreposition[norm(tokens[i][0])] || norm(tokens[i][0]);
      const verbBasesAt = i => /^\p{Ll}/u.test(tokens[i][0]) || i === clause.start
        ? [...new Set((verbAnalyses.get(norm(tokens[i][0])) || []).filter(a => ['finite','infinitive','participle'].includes(a.kind) && !a.detached).map(a => base(a.base)))] : [];
      // A reflexive pair of the list (sich entscheiden für) needs a reflexive pronoun in the clause.
      const reflexiveInClause = indices.some(i => reflexivePronouns.has(norm(tokens[i][0])));
      const pairs = (verbBase, preposition) => list.filter(([verb,prep]) => base(verb) === verbBase && prep === preposition &&
        (reflexiveInClause || !/^sich\s/u.test(norm(verb))));
      const links = [];
      for (const v of indices) for (const verbBase of verbBasesAt(v)) for (const p of indices) {
        if (p === v || !pairs(verbBase,prepositionAt(p)).length || !(prepositions.has(norm(tokens[p][0])) || contractionCase[norm(tokens[p][0])])) continue;
        links.push({v,p,verbBase,rows:pairs(verbBase,prepositionAt(p))});
      }
      const mine = links.filter(l => (isVerb ? l.v : l.p) === selected && (!isVerb || l.verbBase === base(card.lemma)));
      // One pair in the clause; the same preposition or verb in another pair blocks.
      if (mine.length !== 1 || links.some(l => l !== mine[0] && (l.p === mine[0].p || l.v === mine[0].v))) return;
      const {v,p,verbBase,rows} = mine[0];
      if (indices.filter(i => prepositionAt(i) === prepositionAt(p)).length !== 1) return;
      const object = tokens[p+1];
      if (!object || !indices.includes(p+1)) return;
      // Strict variant (user decision 15.10.2026: a wrong hint is worse than none).
      // (a) A prepositional phrase opening a main clause before its verb is mostly
      // an adverbial (Nach der Mahlzeit fragte der Gast, Über ein Weilchen sprach).
      if (p < v && clauseInitial(clause.sentence,tokens[p].index)) return;
      // (b) The object is a determiner, a pronoun or a noun, not a bare modifier
      // phrase of manner (sprach sie mit zornigem Blick).
      const objectWord = norm(object[0]);
      const nominalObject = /^\p{Lu}/u.test(object[0]) || objectCase[objectWord] || determinerFeatures(object[0]) || contractionCase[norm(tokens[p][0])] ||
        (forms.get(objectWord) || []).some(e => ['Pronomen','article','num'].includes(e.type)) || ['nichts','etwas','alles','was','wen','wem','dessen','deren','ihn','sie','es','uns','euch'].includes(objectWord);
      if (!nominalObject) return;
      // (c) A preposition right after a standalone der / die / das belongs to it (der mit dem Hütchen).
      // A relative der after a comma is the subject of its own clause (…, der an nichts Böses dachte).
      if (p > 0 && ['der','die','das'].includes(norm(tokens[p-1][0])) && p-1 !== v &&
          !(p > 1 && /,\s*[»«"„“‚‘]?\s*$/u.test(clause.sentence.slice(tokens[p-2].index+tokens[p-2][0].length,tokens[p-1].index)))) return;
      // (d) A detached particle closing the clause makes it another verb (hält … von … zurück).
      const last = tokens[clause.end];
      if (clause.end > v && clause.end !== p && clause.end !== p+1 && /^\p{Ll}/u.test(last[0]) &&
          ['ab','an','auf','aus','bei','ein','fest','fort','her','hin','los','mit','nach','vor','weg','zu','zurück','vorbei','heraus','herein','hinaus','hinein','weiter','zusammen','dar','um','durch','über','unter','wieder','hoch','fern','frei','kennen','statt','teil'].includes(norm(last[0]))) return;
      const cases = [...new Set(rows.map(r => r[2]))];
      if (cases.length !== 1) return;
      const seen = contractionCase[norm(tokens[p][0])] || objectCase[norm(object[0])];
      if (seen && seen !== cases[0]) return;
      // A confirmed reflexive link names the verb with sich (sich freuen + auf).
      let verbName = rows.length === 1 && !/^sich\s/u.test(norm(rows[0][0])) ? rows[0][0] : verbBase;
      if (isPreposition && rows.some(r => /^sich\s/u.test(norm(r[0])))) {
        try {
          const linked = await reflexiveCandidates(tokens[v][0],{...context,tokenOffset:tokens[v].index});
          if (linked.some(c => c.construction?.id === 'reflexive-verb' && c.construction.confidence !== 'tentative' && !c.reflexiveUnconfirmed &&
              base(c.lemma) === verbBase && /^sich\s/u.test(norm(c.lemma)))) verbName = 'sich ' + verbBase;
        } catch (_) { /* no reflexive evidence */ }
      }
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      const link = {verb:verbName,preposition:prepositionAt(p),case:cases[0],pattern:`${prepositionAt(p)} + ${cases[0]}`,spans:[v,p].sort((a,b) => a-b).map(span)};
      const marked = {...card,prepositionLink:link}, id = window.BibliothekVocabulary.identity(card);
      resolution.candidates = resolution.candidates.map(c => window.BibliothekVocabulary.identity(c) === id ? marked : c);
      if (resolution.preferred === card) resolution.preferred = marked;
      resolution.selected = marked;
    }
    // A4 (15.10.2026): an adjective card whose headword is itself a participle
    // of a verb (geöffnet <- öffnen), clicked in a declined form (die geöffnete
    // Tür): the grammar line names the participle (reference 4.10-4.11); the
    // card, its meaning and its help stay. No source-verb line (A8 withdrawn by
    // the user 15.10: guessing the verb from the form misleads, gewohnt <- wohnen).
    async function participleCard(word, resolution) {
      const card = resolution.selected, lemma = norm(card.lemma);
      if (!/^\p{Ll}/u.test(word) || norm(word) === lemma || card.usage && card.usage.role !== 'attributive') return;
      const facts = await collectMorphology(word,{discoverModifiers:true},'resolveInternal');
      if (facts.errors.length) return;
      const row = facts.analyses.find(a => canonicalPos(a.pos) === 'Verb' && norm(a.base || '') === lemma &&
        ['participle-I','participle-II','participle-declined'].includes(a.kind) &&
        // An own card needs the verb in the own dictionary too: verschieden is no
        // longer read as a participle of verscheiden, beliebt of belieben.
        (card.source !== 'main' || a.evidence === 'dictionary-derived-modifier'));
      if (!row) return;
      const kind = row.kind === 'participle-declined' ? (row.tags?.includes('past') ? 'participle-II' : 'participle-I') : row.kind;
      const marked = {...card,usage:{...(card.usage || {}),kind,role:'attributive',form:word,base:card.lemma}};
      const id = window.BibliothekVocabulary.identity(card);
      resolution.candidates = resolution.candidates.map(c => window.BibliothekVocabulary.identity(c) === id ? marked : c);
      if (resolution.preferred === card) resolution.preferred = marked;
      resolution.selected = marked;
    }
    // Step 9: presentation of a finished resolution — translations, spelling
    // references, noun-phrase display links and Russian enrichment. Display data
    // only: it never adds, removes or reorders candidates and never changes the
    // choice (selected/preferred point to the same cards, status and evidence stay).
    const FORM_ENDINGS = ["","e","em","en","er","es"];
    // A clause starts at the text start or after . ! ? : ; ( and an opening quote or dash.
    const clauseInitial = (sentence, offset) => Number.isInteger(offset) && /(?:^|[.!?:;(]|\s[–—-])[\s„"“»«(]*$/u.test(String(sentence || "").slice(0, offset));
    // A modal verb without any infinitive in its sentence is a full verb (Ich mag Kaffee, Ich kann Deutsch).
    // A capitalized word inside the clause is a noun (Ich mag Essen), not an infinitive.
    const MODAL_BASES = new Set([...modalLemmas, "möchten"]);
    function modalAsFullVerb(word, candidate, context) {
      if (canonicalPos(candidate.pos) !== "Verb" || candidate.construction || !MODAL_BASES.has(norm(candidate.lemma))) return false;
      const sentence = String(context?.sentence || ""), offset = context?.tokenOffset;
      if (!Number.isInteger(offset)) return false;
      // The whole sentence is searched: an infinitive often follows an inserted clause (Sie soll jene, die …, nicht erkennen).
      const start = 0, end = sentence.length;
      for (const m of sentence.slice(start, end).matchAll(/[\p{L}\p{M}]+/gu)) {
        const at = start + m.index;
        if (at === offset) continue;
        const initial = /(?:^|[.!?:;]\s*["„“«»]?)\s*$/u.test(sentence.slice(0, at));
        if (!initial && /^[A-ZÄÖÜ]/u.test(m[0])) continue;
        if ((verbAnalyses.get(norm(m[0])) || []).some(row => row.kind === "infinitive" && !MODAL_BASES.has(norm(row.base)))) return false;
        // Most verbs are not in the own dictionary: any lowercase -en/-ern/-eln word may be the infinitive.
        if (/^[a-zäöüß]/u.test(m[0]) && m[0].length >= 4 && /(?:en|ern|eln)$/u.test(m[0])) return false;
      }
      return true;
    }
    function formFeatures(word, candidate, resolution, context) {
      const form = norm(word), type = canonicalPos(candidate.pos), base = norm(candidate.lemma).replace(/^sich\s+/u, "");
      const k = candidate.construction;
      if (type === "Verb") {
        if (candidate.usage || k && !["separable-verb","reflexive-verb"].includes(k.id) || k?.confidence === "tentative") return null;
        if (k?.id === "reflexive-verb" && ["Perfekt","Plusquamperfekt"].includes(k.tense)) return null;
        const forms = k?.id === "separable-verb" ? (k.spans || []).map(span => ({form:norm(span.text), start:span.start})) : [{form, start:context?.tokenOffset}];
        const labels = new Set(), sources = new Map();
        let ownKonjunktiv = false;
        for (const {form:f, start} of forms) for (const row of verbAnalyses.get(f) || []) {
          if (norm(row.base) !== base) continue;
          // The detached particle of a separable verb is no verb form of its own.
          if (k?.id === "separable-verb" && row.kind === "infinitive") continue;
          labels.add(row.tense); sources.set(row.tense, {form:f, start});
          if (formsOf(row.entry)?.["Konjunktiv II"]) ownKonjunktiv = true;
        }
        // sei is also Konjunktiv I (indirect speech), which the tables do not list.
        if (base === "sein" && forms.some(f => f.form === "sei" && !clauseInitial(context?.sentence, f.start))) labels.add("Konjunktiv I");
        for (const row of resolution.inflections || []) {
          if (canonicalPos(row.pos) !== "Verb" || norm(row.lemma).replace(/^sich\s+/u, "") !== base || norm(row.form) !== form) continue;
          const mood = String(row.mood || ""), tense = String(row.tense || "");
          labels.add(row.tags?.includes("participle") ? "Partizip" : mood === "imperative" ? "Imperativ" : /subjunctive-ii/u.test(mood) ? "Konjunktiv II" :
            /subjunctive/u.test(mood) ? "Konjunktiv I" : tense === "past" || tense === "preterite" ? "Präteritum" : tense === "present" ? "Präsens" : "?");
        }
        const [only] = labels;
        if (labels.size !== 1 || !["Präteritum","Imperativ","Konjunktiv II"].includes(only)) return null;
        // Weak -te forms are Präteritum and Konjunktiv II at once unless the own table shows another Konjunktiv II.
        if (only === "Präteritum" && /te(?:st|n|t)?$/u.test(sources.get(only)?.form || form) && !ownKonjunktiv) return null;
        // An imperative opens its clause; elsewhere the same spelling is another form or another word.
        if (only === "Imperativ" && !clauseInitial(context?.sentence, sources.get(only)?.start ?? context?.tokenOffset)) return null;
        return {tense:only};
      }
      const entry = candidate.source === "main" ? candidate.item : null;
      if (type === "Nomen" && entry?.plural && !entry.plural_only && !entry.declension_forms && !candidate.usage) {
        const word = norm(entry.word), plural = norm(entry.plural);
        const plurals = new Set([plural, /[ns]$/u.test(plural) ? plural : plural + "n"]);
        const singulars = new Set([word, word + "s", word + "es", word + "e", word + "n", word + "en"]);
        return plurals.has(form) && !singulars.has(form) ? {number:"plural"} : null;
      }
      if (type === "Adjektiv" && entry?.word && !candidate.usage && !candidate.explanation) {
        const positive = norm(entry.word);
        const comparative = norm(entry.comparative || positive + "er");
        const superlative = entry.superlative ? norm(entry.superlative).replace(/^am\s+/u, "").replace(/en$/u, "") : null;
        const superlatives = superlative ? [superlative] : [positive + "st", positive + "est"];
        const is = stems => stems.some(stem => FORM_ENDINGS.some(ending => form === stem + ending));
        // A4: an undeclined comparative that is not a modifier before a noun
        // (Dieses Auto ist schneller., Er läuft schneller als ich) — not ein schneller Zug.
        if (form === comparative && comparative === positive + "er" && outsideNounGroup(word,context)) return {degree:"Komparativ"};
        if (is([positive])) return null;
        if (is([comparative])) return {degree:"Komparativ"};
        if (superlatives.some(stem => FORM_ENDINGS.slice(1).some(ending => form === stem + ending))) return {degree:"Superlativ"};
      }
      return null;
    }
    async function presentResolution(word, context, resolution, phrasesFor = () => []) {
      const identity = c => window.BibliothekVocabulary.identity(c);
      const repoint = () => {
        if (resolution.selected) resolution.selected = resolution.candidates.find(c => identity(c) === identity(resolution.selected)) || resolution.selected;
        if (resolution.preferred) resolution.preferred = resolution.candidates.find(c => identity(c) === identity(resolution.preferred)) || resolution.preferred;
      };
      // The feminine personal pronoun's dative form means her, not she.
      if (norm(word) === "ihr") {
        const candidate = resolution.candidates.find(c => c.dictionaryId === "pronoun-004");
        if (candidate) candidate.translation = {en:"her (dative)",ru:"ей (дательный падеж)"};
      }
      // Spelling references (alternative/obsolete spelling of X) show X's meanings.
      // Explanation cards (contraction, am + superlative) carry their own meaning.
      if (fallback.spellingTranslation) await Promise.all(resolution.candidates.filter(c => c.source === "fallback" && !c.explanation).map(async c => {
        try {
          const display = await fallback.spellingTranslation(c.lemma,c.pos,c.meanings || [c.translation?.en || '']);
          if (!display) return;
          c.spellingReferences = display.references;
          c.translation = {...c.translation,en:display.meanings.join('; ')};
          if (display.unresolved.length) c.spellingTranslationUnavailable = true;
        } catch (_) {
          c.translation = {...c.translation,en:''};
          c.spellingTranslationUnavailable = true;
        }
      }));
      observe('stage', {stage:'presentation-spelling'});
      // Article-noun link for the card and the highlight.
      resolution.candidates = resolution.candidates.map(c => {
        const related = phrasesFor(c);
        return related.length ? {...c,nounPhrase:related} : c;
      });
      repoint();
      // External attachment is display-only: no new selection, gender or case.
      const unlinked = resolution.candidates;
      resolution.candidates = await Promise.all(unlinked.map(async c => {
        const link = await externalNounArticleLink(word,context,c,unlinked);
        return link ? {...c,nounArticleLink:link} : c;
      }));
      repoint();
      // General article + noun pair (der/ein/kein forms) where neither link above
      // applies: the article card on the article, noun cards on the noun.
      if (resolution.candidates.some(c => !c.nounPhrase && !c.nounArticleLink && !c.construction &&
          (c.pos === 'article' || canonicalPos(c.pos) === 'Nomen'))) {
        const pair = await articleNounLink(word,context);
        if (pair) {
          resolution.candidates = resolution.candidates.map(c => c.nounPhrase || c.nounArticleLink || c.construction ? c :
            pair.clicked === 'article' ? c.pos === 'article' && c.source === 'main' ? {...c,nounArticleLink:pair} : c :
            canonicalPos(c.pos) === 'Nomen' ? {...c,nounArticleLink:pair} : c);
          repoint();
        }
      }
      // Origin of an own noun from its dictionary field derived_from (der Kranke ← krank,
      // der Angestellte ← anstellen): Nomen · aus Adjektiv krank / aus Verb anstellen,
      // shown only when the source word has its own card; the noun keeps its own meaning.
      resolution.candidates = resolution.candidates.map(c => {
        const from = c.source === 'main' && canonicalPos(c.pos) === 'Nomen' && !c.usage && !c.nounOrigin ? c.item?.derived_from : null;
        if (!from?.word) return c;
        const verb = /^Partizip/u.test(from.type || '');
        const base = (lemmas.get(norm(from.word)) || []).find(e => e.type === (verb ? 'Verb' : 'Adjektiv'));
        return base ? {...c,nounOrigin:{kind:verb ? 'verb' : 'adjective',base:base.word,baseDictionaryId:base.id}} : c;
      });
      // Gender or number not established (den Kranken): one shared card der/die Kranke.
      if (resolution.adjectivalPair) {
        const other = resolution.candidates.find(c => c.dictionaryId === resolution.adjectivalPair.feminine);
        resolution.candidates = resolution.candidates.map(c => c.dictionaryId === resolution.adjectivalPair.masculine && other ?
          {...c,genderPair:{articles:'der/die',dictionaryId:other.dictionaryId,translation:{...other.translation}}} : c);
      }
      repoint();
      observe('stage', {stage:'presentation-noun-links'});
      // Display-only form marks (reader reference): a mark is kept only when every
      // analysis of the form agrees; ambiguous forms (spielte, macht, schneller) stay unmarked.
      resolution.candidates = resolution.candidates.map(c => {
        const features = {...formFeatures(word, c, resolution, context), ...(modalAsFullVerb(word, c, context) ? {fullVerb:true} : {})};
        return Object.keys(features).length ? {...c, formFeatures:features} : c;
      });
      repoint();
      // Translation of the clicked form (15.10.2026): an own card may translate a
      // form whose meaning differs from the headword (alle «все» → alles «всё»,
      // viel «много» → vieles «многое», dieser «этот» → dies «это»). Field
      // `form_translations`: [{form, ru, en, without_noun}]; with without_noun the
      // form must not stand before a capitalised word (auf vieles Zureden → «много»).
      resolution.candidates = resolution.candidates.map(c => {
        const row = c.source === "main" && (c.item?.form_translations || []).find(r => norm(r.form) === norm(word));
        if (!row) return c;
        if (row.without_noun && Number.isInteger(context?.tokenOffset)) {
          const after = String(context.sentence || "").slice(context.tokenOffset + word.length);
          if (/^[ \t]+\p{Lu}/u.test(after)) return c;
        }
        return {...c, formTranslation:{form:row.form, ru:row.ru || "", en:row.en || ""}};
      });
      repoint();
      // Enrich only after all morphology, ranking and selection are complete.
      if (window.BibliothekRussianTranslations)
        await window.BibliothekRussianTranslations.enrich({...resolution,candidates:resolution.candidates.filter(c=>!c.explanation)},window.DeutschTranslation?.getLang?.() || "en");
      observe('stage', {stage:'enrichment-complete'});
      return resolution;
    }
    function resolve(word, context) {
      sourceActivation++;clearPartialSources();
      const sentence=String(context?.sentence || '');
      const shared=sentenceContext(sentence);
      const active=activeContexts.get(sentence) || {context:shared,references:0,views:new Map()};
      active.references++;activeContexts.set(sentence,active);
      const release=()=>{if(--active.references===0)activeContexts.delete(sentence);if(!activeContexts.size)clearPartialSources();};
      const pending=resolveWithDiagnostics(word,context);
      return pending.then(result=>{release();return result;},error=>{release();throw error;});
    }
    // B5: an external record that only refers to another word (andern:
    // "alternative form of anderen"; daß: "alternative spelling of dass") is
    // resolved as that word in the same place of the sentence, so our own card
    // and the usual context rules apply. The clicked spelling stays the form.
    function referenceTarget(candidate, word) {
      if (candidate.source !== "fallback" || candidate.explanation) return null;
      // Only a reference of the clicked spelling itself: gestossen (participle of
      // stossen, a spelling of stoßen) is not replaced by the infinitive.
      if (word !== undefined && norm(candidate.lemma) !== norm(word)) return null;
      const values = (candidate.meanings || [candidate.translation?.en || ""]).map(value => String(value || "").trim()).filter(Boolean);
      if (!values.length) return null;
      const targets = values.map(value => (/^alternative form of ([\p{L}\p{M}]+)\.?$/iu.exec(value) ||
        /^(?:(?:Switzerland and Liechtenstein )?standard|alternative|obsolete|archaic|dated) spelling of ([\p{L}\p{M}]+)\.?$/iu.exec(value) ||
        /^Formerly standard spelling of ([\p{L}\p{M}]+) which was deprecated in the spelling reform \(Rechtschreibreform\) of \d{4}\.?$/iu.exec(value))?.[1]);
      return targets.every(Boolean) && new Set(targets).size === 1 ? targets[0] : null;
    }
    async function resolveFollowingReference(word, context) {
      const resolution = await resolveInternal(word,context);
      const candidates = resolution?.candidates || [];
      if (!candidates.length) return resolution;
      const targets = new Set(candidates.map(c => referenceTarget(c,word)));
      const before = String(context?.sentence || "").slice(0,context?.tokenOffset || 0);
      const utteranceStart = !before.trim() || /[.!?…:]\s*[«„“"‘»”]*\s*(?:[–—-]\s*)?$/u.test(before) || /[«„“"‘]\s*$/u.test(before);
      // B17: two references that differ only by a capital (muß: verb → muss,
      // noun → Muss). The case of the clicked spelling decides: lowercase →
      // the lowercase word (muß → müssen); a capital inside the sentence → the
      // capitalised one (das Muß). At the sentence start the new spelling is read
      // in place (Muß ich … → Muss ich …), so the same rules as for «Muss» decide.
      if (targets.size === 2 && ![...targets].includes(null)) {
        const [a,b] = [...targets];
        if (a !== b && norm(a) === norm(b) && /^\p{Ll}/u.test(a) !== /^\p{Ll}/u.test(b)) {
          const lower = /^\p{Ll}/u.test(a) ? a : b, upper = lower === a ? b : a;
          const pick = /^\p{Ll}/u.test(word) || utteranceStart ? lower : upper;
          targets.clear(); targets.add(pick);
        }
      }
      const [target] = targets;
      if (targets.size !== 1 || !target || norm(target) === norm(word)) return resolution;
      // A capital inside the sentence marks a name (New York), not an old
      // spelling of a lowercase word (neu).
      if (/^\p{Lu}/u.test(word) && /^\p{Ll}/u.test(target) && !utteranceStart) return resolution;
      // Keep the case of the clicked spelling at a sentence start (Daß → Dass).
      const spelling = /^\p{Lu}/u.test(word) && /^\p{Ll}/u.test(target) ? target[0].toLocaleUpperCase("de-DE")+target.slice(1) : target;
      let targetContext = context;
      if (context && Number.isInteger(context.tokenOffset)) {
        const sentence = String(context.sentence || "");
        if (sentence.slice(context.tokenOffset,context.tokenOffset+word.length) !== word) return resolution;
        targetContext = {...context,sentence:sentence.slice(0,context.tokenOffset)+spelling+sentence.slice(context.tokenOffset+word.length)};
      }
      const followed = await resolveInternal(spelling,targetContext);
      if (!followed?.candidates?.length || followed.candidates.every(c => referenceTarget(c,spelling))) return resolution;
      const reference = {form:word,target,notes:[...new Set(candidates.flatMap(c => c.meanings || []))]};
      // Highlight spans of the target sentence are shifted by the length difference after the clicked word.
      const shift = word.length - spelling.length, at = context?.tokenOffset;
      const plain = value => value && typeof value === "object" &&
        (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
      const copies = new Map();
      const remap = value => {
        if (!plain(value)) return value;
        if (copies.has(value)) return copies.get(value);
        const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
        copies.set(value,copy);
        for (const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          if ("value" in descriptor) descriptor.value = remap(descriptor.value);
          Object.defineProperty(copy,key,descriptor);
        }
        if (!Array.isArray(copy) && Number.isInteger(copy.start) && Number.isInteger(copy.end) && typeof copy.text === "string" &&
            Object.getOwnPropertyDescriptor(copy,"start")?.writable) {
          if (copy.start === at && copy.text === spelling) copy.text = word;
          if (copy.start > at) copy.start += shift;
          if (copy.end > at) copy.end += shift;
        }
        return copy;
      };
      const mapped = remap(followed);
      mapped.form = word;
      mapped.formReference = reference;
      return mapped;
    }
    // B7 (15.10.2026): colloquial spellings. (1) X’s = X + es (war’s, mir’s, hab’s,
    // wenn’s): the sentence is read with "X es" in place, the card of X is marked
    // `contraction` (heading «war’s = war + es»). Only a lowercase X, or a
    // capitalised one opening the sentence (Gibt’s …); names stay (King’s Cross).
    // (2) A verb form without its final -e (hab, würd, könnt) when the full form
    // is an own finite verb form and the short one has no reading of its own.
    // Expansions of colloquial spellings in one sentence: [{start,end,text,replacement,base,kind}].
    function colloquialExpansions(sentence) {
      // A short form needs an adjacent personal pronoun of the same person (ich hab, hab ich, würd er).
      const words = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const pronounPerson = {ich:"ich",er:"er/sie/es",sie:"er/sie/es",es:"er/sie/es",man:"er/sie/es"};
      const shortVerb = (w,start) => {
        if (!/^\p{Ll}+$/u.test(w) || (forms.get(norm(w)) || []).length || (verbAnalyses.get(norm(w)) || []).length) return false;
        const persons = new Set((verbAnalyses.get(norm(w)+"e") || []).filter(a => a.kind === "finite").map(a => a.person));
        const i = words.findIndex(x => x.index === start);
        return i >= 0 && [words[i-1],words[i+1]].some(x => x && persons.has(pronounPerson[norm(x[0])]) &&
          !/[.,;:!?]/u.test(sentence.slice(Math.min(x.index,start),Math.max(x.index,start))));
      };
      const result = [];
      for (const m of sentence.matchAll(/(?<![\p{L}\p{M}’'])([\p{L}\p{M}]+)(?:([’'])s)?(?![\p{L}\p{M}’'])/gu)) {
        const [text,stem,apostrophe] = m, start = m.index;
        if (apostrophe) {
          if (/^\p{Lu}/u.test(stem) && !clauseInitial(sentence,start)) continue;
          const base = shortVerb(stem,start) ? stem+"e" : stem;
          result.push({start,end:start+text.length,text,replacement:base+" es",base,kind:"es",stem});
        } else if (shortVerb(text,start)) result.push({start,end:start+text.length,text,replacement:text+"e",base:text+"e",kind:"e",stem:text});
      }
      return result;
    }
    // B8 (15.10.2026): a part of a hyphenated word (U | - | Bahn) first looks up the
    // whole word (die U-Bahn — метро) and highlights it; without a card for the
    // whole word the tapped part keeps its own reading (Nord-Süd-Verbindung → Verbindung).
    async function resolveHyphenated(word, context) {
      const sentence = String(context?.sentence || ""), at = context?.tokenOffset;
      if (!Number.isInteger(at) || sentence.slice(at,at+word.length) !== word) return null;
      let start = at, end = at+word.length;
      for (let m; (m = /([\p{L}\p{M}\d]+)-$/u.exec(sentence.slice(0,start))); ) start = m.index;
      for (let m; (m = /^-([\p{L}\p{M}\d]+)/u.exec(sentence.slice(end))); ) end += m[0].length;
      if (start === at && end === at+word.length) return null;
      const compound = sentence.slice(start,end);
      const whole = await resolveFollowingReference(compound,{...context,tokenOffset:start});
      const cards = (whole?.candidates || []).filter(c => norm(c.lemma).includes("-") && c.pos !== "character");
      if (!cards.length) return null;
      const span = {text:compound,start,end};
      const mark = c => ({...c,compound:{form:compound,part:word,spans:[span]}});
      const marked = new Map(whole.candidates.map(c => [c,mark(c)]));
      whole.candidates = whole.candidates.map(c => marked.get(c));
      if (whole.selected) whole.selected = marked.get(whole.selected) || mark(whole.selected);
      if (whole.preferred) whole.preferred = marked.get(whole.preferred) || mark(whole.preferred);
      return whole;
    }
    async function resolvePublic(word, context) {
      const hyphenated = await resolveHyphenated(word,context);
      if (hyphenated) return hyphenated;
      const sentence = String(context?.sentence || ""), at = context?.tokenOffset;
      if (!Number.isInteger(at) || sentence.slice(at,at+word.length) !== word) return resolveFollowingReference(word,context);
      const rows = colloquialExpansions(sentence);
      if (!rows.length) return resolveFollowingReference(word,context);
      // The sentence is read with full forms; offsets map back piecewise.
      let text = "", last = 0, clicked = null, newAt = null;
      const pieces = [];
      for (const r of rows) {
        text += sentence.slice(last,r.start);
        const from = text.length; text += r.replacement;
        pieces.push({...r,from,to:text.length});
        if (r.start === at) { clicked = r; newAt = from; }
        last = r.end;
      }
      text += sentence.slice(last);
      if (newAt === null) {
        let delta = 0;
        for (const p of pieces) if (p.end <= at) delta += p.replacement.length - p.text.length;
        newAt = at+delta;
      }
      if (clicked && word !== clicked.text) return resolveFollowingReference(word,context);
      const target = clicked ? clicked.base : word;
      const resolved = await resolveFollowingReference(target,{...context,sentence:text,tokenOffset:newAt});
      if (!resolved?.candidates?.length) return clicked ? resolveFollowingReference(word,context) : resolved;
      const back = (start,end) => {
        const piece = pieces.find(p => start >= p.from && start < p.to);
        if (piece) return {start:piece.start,end:piece.end,text:piece.text};
        let delta = 0;
        for (const p of pieces) if (p.to <= start) delta += p.text.length - p.replacement.length;
        return {start:start+delta,end:end+delta,text:sentence.slice(start+delta,end+delta)};
      };
      const plain = value => value && typeof value === "object" &&
        (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
      const copies = new Map();
      const remap = value => {
        if (!plain(value)) return value;
        if (copies.has(value)) return copies.get(value);
        const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
        copies.set(value,copy);
        for (const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          if ("value" in descriptor) descriptor.value = remap(descriptor.value);
          Object.defineProperty(copy,key,descriptor);
        }
        if (!Array.isArray(copy) && Number.isInteger(copy.start) && Number.isInteger(copy.end) && typeof copy.text === "string" &&
            Object.getOwnPropertyDescriptor(copy,"start")?.writable) Object.assign(copy,back(copy.start,copy.end));
        return copy;
      };
      const mapped = remap(resolved);
      // One span per word: "es" maps onto the clicked spelling as well.
      for (const c of mapped.candidates || []) for (const k of [c.construction,c.prepositionLink,c.nounArticleLink,...(c.nounPhrase || [])].filter(Boolean))
        if (Array.isArray(k.spans)) k.spans = k.spans.filter((x,i,all) => all.findIndex(y => y.start === x.start) === i);
      mapped.form = word;
      if (!clicked) return mapped;
      const mark = c => ({...c,contraction:{form:word,parts:clicked.kind === "es" ? [clicked.stem,"es"] : [clicked.base],kind:clicked.kind,
        // es gibt / es geht are fixed expressions (F8): no translation of geben / gehen until then.
        ...(clicked.kind === "es" && canonicalPos(c.pos) === "Verb" && ["geben","gehen"].includes(norm(c.lemma)) ? {expression:true} : {})}});
      const marked = new Map((mapped.candidates || []).map(c => [c,mark(c)]));
      mapped.candidates = mapped.candidates.map(c => marked.get(c));
      if (mapped.selected) mapped.selected = marked.get(mapped.selected) || mark(mapped.selected);
      if (mapped.preferred) mapped.preferred = marked.get(mapped.preferred) || mark(mapped.preferred);
      return mapped;
    }
    function resolveWithDiagnostics(word, context) {
      if (!diagnostics) return resolvePublic(word,context);
      const resolution = ++diagnosticSequence;
      diagnosticActive.add(resolution);
      observe('resolve-start', {resolution,word,sentence:context?.sentence,tokenOffset:context?.tokenOffset});
      const finish = error => {observe('resolve-end', {resolution,error:error ? String(error.message || error) : null,
        caches:{lookup:sourceFacts.stats().entries,grammar:grammarCache.size,morphology:morphologyFacts.stats().entries,
          verb:verbFacts.stats().entries,separableNoun:separableNounEvidence.size,
          separableDiscovery:separableDiscoveryCache.size}});diagnosticActive.delete(resolution);};
      return resolvePublic(word,context).then(result => {finish(null);return result;},error => {finish(error);throw error;});
    }
    return Object.freeze({ resolve, prepareSeparable, selectionRules:selectionCore.rules, morphologyDetails, factsForToken,
      factStats:()=>Object.freeze({source:sourceFacts.stats(),morphology:morphologyFacts.stats(),verb:verbFacts.stats(),noun:nounFrames.stats(),readerProbes:readerProbes.size,morphologyEpoch,partialEntries:partialSources.size,partialBytes}),
      sentenceContext:sentence=>sentenceContext(sentence),
      contextStats:()=>Object.freeze({entries:contextCache.size,characters:contextCharacters,
        tokens:contextTokenCount,entryLimit:contextEntryLimit,characterLimit:contextCharacterLimit,tokenLimit:contextTokenLimit,active:activeContexts.size}),
      // Diagnostic consumers must not mutate cached groups or dictionary items.
      morphology:async (word,options) => JSON.parse(JSON.stringify(await collectMorphology(word,options, 'resolve'))),
      entry:id => byId.get(String(id)) || null,
      matchSeparable:(word,context) => separatedForms.has(norm(word)) ? separableCandidates(word,context) : [],
      matchReflexive:reflexiveCandidates,
      diagnoseReflexive:async sentence=>{await prepareSeparable();const diagnostic={};await analyseReflexiveSentence(sentence,diagnostic);return diagnostic;},
      reflexiveMorphology:async word => (await tokenAnalyses(word, undefined, 'resolve')).map(({entry,candidate,...a})=>({...a,lemma:entry?.word||candidate?.lemma})),
      // Read-only discovery diagnostics, including unsupported/missing data.
      reflexiveInventory:() => [...reflexiveEntries].map(entry => ({dictionaryId:entry.id,lemma:entry.word,
        baseLemma:norm(entry.word).replace(/^sich\s+/u,""),source:"main",
        forms:[...reflexiveForms].flatMap(([form,rows]) => rows.filter(row=>row.entry===entry)
          .map(({entry:ignored,...analysis})=>({form,...analysis}))),
        warnings:[...(!Object.keys(formsOf(entry)).length ? ["missing-form-table"] : []),
          ...(norm(entry.word).replace(/^sich\s+/u,"").includes(" ") ? ["compound-layout-not-confirmed"] : [])]})),
      match:word => (forms.get(norm(word)) || []).map(entry=>({...mainCandidate(entry),
        ...(reflexiveEntries.has(entry) && norm(word) !== norm(entry.word) ? {reflexiveUnconfirmed:true} : {})})) });
  }
  window.BibliothekLemmaResolver = Object.freeze({ create, savedCandidate, calendarDateLength, readerSegments, articleFormFeatures });
})();
