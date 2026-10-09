/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  const base = new URL("../open%20data/dictionary-de-json/", document.currentScript.src);
  const cache = new Map();
  const verbFormCache = new Map();
  const verbFormsBase = new URL("fallback-verb-forms/", document.currentScript.src);
  const separableUrl = new URL("separable-index.json?v=20261009-reviewed-forms-2", document.currentScript.src);
  let separablePromise = null, verbMembershipPromise = null;
  function separableEntries() {
    if (!separablePromise) separablePromise = fetch(separableUrl).then(response => {
      if (!response.ok) throw new Error("Separable index unavailable");
      return response.json();
    }).then(data => {
      if (data.format_version !== 1 || !Array.isArray(data.entries)) throw new Error("Invalid separable index");
      return data.entries;
    }).catch(error => { separablePromise = null; throw error; });
    return separablePromise;
  }
  const superlativeUrl=new URL('superlative-index.json?v=20261008-l07-1',document.currentScript.src);
  let superlativePromise=null;
  async function superlativeEntries(word) {
    if(!superlativePromise)superlativePromise=fetch(superlativeUrl).then(r=>{
      if(!r.ok)throw Error('Superlative index unavailable');return r.json();
    }).then(d=>{
      if(d.format_version!==1||!d.records||typeof d.records!=='object')throw Error('Invalid superlative index');
      for(const rows of Object.values(d.records))if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!['adj','adv'].includes(r[1])||!Array.isArray(r[2])||r[2].some(m=>typeof m!=='string')))throw Error('Invalid superlative evidence');
      return d.records;
    }).catch(e=>{superlativePromise=null;throw e;});
    return (await superlativePromise)[String(word).normalize('NFC').toLocaleLowerCase('de-DE')]||[];
  }
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
  async function mayBeVerb(word) {
    try {
      if(!verbMembershipPromise)verbMembershipPromise=fetch(new URL('manifest.json',verbFormsBase)).then(r=>{if(!r.ok)throw Error('Verb membership unavailable');return r.json();}).then(d=>{const m=d.membership;if(m?.format!=='bloom-fnv1a-v1'||m.bits!==1048576||m.hashes!==4||typeof m.bitmap!=='string'||m.bitmap.length!==m.bits/4||!/^[0-9a-f]+$/.test(m.bitmap))throw Error('Invalid verb membership');return {...m,bitmap:Uint8Array.from(m.bitmap.match(/../g),s=>parseInt(s,16))};}).catch(e=>{verbMembershipPromise=null;throw e;});
      const m=await verbMembershipPromise,key=String(word).normalize('NFC').toLocaleLowerCase('de-DE');let h=2166136261;for(const b of new TextEncoder().encode(key))h=Math.imul(h^b,16777619)>>>0;
      const step=(Math.imul(h^0x9e3779b9,2246822519)>>>0)|1;
      for(let k=0;k<m.hashes;k++){const bit=(h+k*step)&(m.bits-1);if(!(m.bitmap[bit>>>3]&(1<<(bit&7))))return false;}
      return true;
    } catch (_) { return true; } // Missing filter preserves the full lookup path.
  }
  const auxiliaryFormsUrl=new URL('auxiliary-verb-forms.json?v=20261008-f4-1',document.currentScript.src);
  let auxiliaryFormsPromise=null;
  async function auxiliaryInflections(word) {
    if(!auxiliaryFormsPromise)auxiliaryFormsPromise=fetch(auxiliaryFormsUrl).then(r=>{
      if(!r.ok)throw Error('Auxiliary morphology unavailable');return r.json();
    }).then(d=>{if(d.format_version!==1||!d.records)throw Error('Invalid auxiliary morphology');return d.records;}).catch(e=>{auxiliaryFormsPromise=null;throw e;});
    const rows=(await auxiliaryFormsPromise)[String(word).normalize('NFC').toLocaleLowerCase('de-DE')]||[];
    return rows.map(([lemma,person,number,tense,mood])=>({lemma,person,number,tense,mood}));
  }
  async function verbFormLinks(word) {
    const spelling = String(word).normalize("NFC").toLocaleLowerCase("de-DE"), index = partition(spelling);
    if (!verbFormCache.has(index)) {
      const pending = fetch(new URL(`${String(index).padStart(4,"0")}.json`,verbFormsBase)).then(response => {
        if (!response.ok) throw new Error("Fallback verb morphology unavailable");
        return response.json();
      }).then(data => {
        if(data.format_version !== 1 || data.partition !== index)throw new Error("Invalid fallback verb morphology partition");
        return data.records;
      }).catch(error=>{verbFormCache.delete(index);throw error;});
      verbFormCache.set(index,pending);
    }
    const rows = (await verbFormCache.get(index))[spelling] || [];
    return rows.map(([lemma,tags])=>[spelling,lemma,tags]);
  }
  async function derivedVerbGroups(word) {
    let links;
    try { links = await verbFormLinks(word); } catch (_) { return []; }
    const groups = [];
    for(const lemma of [...new Set(links.map(row=>row[1]))]) {
      const lexical = (await lexicalGroups(lemma)).filter(g=>g.pos === "verb" && g.meanings.length);
      groups.push(...lexical);
      const data = {inflections:links.filter(row=>row[1] === lemma),senses:[[0,word,"verb",`inflection of ${lemma}:`,0]]};
      groups.push({kind:"form-note",word,pos:"verb",meanings:[`inflection of ${lemma}:`],lemmas:[lemma],
        inflections:inflectionEvidence(word,data.inflections,groupsFor(word,data))});
    }
    return groups;
  }
  async function record(word) {
    const index = partition(word);
    if (!cache.has(index)) {
      const promise = fetch(new URL(`parts/${String(index).padStart(4, "0")}.json`, base))
        .then(response => {
          if (!response.ok) throw new Error("Fallback dictionary unavailable");
          return response.json();
        }).then(data => {
          if (data.format_version !== 1 || data.partition !== index) throw new Error("Invalid dictionary partition");
          return data.records;
        }).catch(error => { cache.delete(index); throw error; });
      cache.set(index, promise);
    }
    const records = await cache.get(index);
    return Object.prototype.hasOwnProperty.call(records, word) ? records[word] : null;
  }
  function meanings(data) {
    const ordered = [...(data?.senses || [])].sort((a, b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0] - b[0]);
    return [...new Set(ordered.map(row => row[3]))];
  }
  function referenceLemma(value) {
    const match = /^(.*?) of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*):?$/iu.exec(value.trim());
    if (!match) return null;
    const prefix = match[1].toLowerCase();
    const grammar = new Set(["strong","weak","mixed","nominative","accusative","genitive","dative","masculine","feminine","neuter","singular","plural","all","case","gender","comparative","superlative","degree","first","second","third","person","present","past","preterite","participle","imperative","indicative","subjunctive","i","ii","dependent","independent","subordinate","clause","infinitive","positive","definite","indefinite"]);
    const tokens = prefix.split(/[\s/-]+/u).filter(Boolean);
    if (prefix !== "inflection" && !(tokens.length >= 2 && tokens.every(token => grammar.has(token)) &&
      /\b(?:singular|plural|participle|imperative|infinitive|degree)\b/u.test(prefix))) return null;
    return match[2].normalize("NFC").toLocaleLowerCase("de-DE");
  }
  function groupsFor(word, data) {
    const byPos = new Map();
    for (const row of [...(data?.senses || [])].sort((a,b) => (a[4] ?? 0) - (b[4] ?? 0) || a[0]-b[0])) {
      const pos = row[2] || "";
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(row[3]);
    }
    const mappedLemmas = (data?.inflections || []).map(row => row[1]);
    return [...byPos].map(([pos, values]) => {
      const reference = value => !!referenceLemma(value) || /^inflection of\b/iu.test(value) || mappedLemmas.some(lemma =>
        value.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`) &&
        /\b(?:present|past|preterite|participle|imperative|singular|plural|dative|accusative|genitive|nominative|infinitive|comparative|superlative)\b/iu.test(value));
      const hasReference = values.some(reference);
      const grammarTokens = new Set(["first","second","third","person","singular","plural","present","past","preterite","perfect","imperfect","imperative","indicative","subjunctive","participle","nominative","accusative","dative","genitive","infinitive","positive","comparative","superlative","masculine","feminine","neuter","definite","indefinite","weak","strong","mixed","all","case","gender","dependent","independent","subordinate","clause","zu"]);
      const continuation = value => {
        const tokens = value.toLowerCase().replace(/\bsubjunctive\s+(?:ii|i)\b/gu, "subjunctive").split(/[\s,;:/().-]+/u).filter(Boolean);
        const declensionNote = /^(?:weak|strong|mixed)(?:[\s/-]|$)/iu.test(value.trim()) && tokens.length > 1;
        return (hasReference || declensionNote) && tokens.length > 0 && tokens.every(token => token === "degree" || grammarTokens.has(token));
      };
      const notes = [...new Set(values.filter(value => reference(value) || continuation(value)))];
      return {word,pos,meanings:[...new Set(values.filter(value => !notes.includes(value)))],formNotes:notes};
    });
  }
  // Evidence belongs to the clicked spelling, not to permanent dictionary cards.
  function noteReferencesLemma(note,lemma) {
    const text=note.toLocaleLowerCase('de-DE'),marker=` of ${lemma.toLocaleLowerCase('de-DE')}`,index=text.indexOf(marker);
    return index>=0&&/^(?:$|[\s:(“"])/u.test(text.slice(index+marker.length));
  }
  function inflectionEvidence(form, mappings, groups) {
    const result = [];
    for (const [spelling, lemma, rawTags] of mappings) {
      if (spelling.normalize("NFC").toLocaleLowerCase("de-DE") !== form.toLocaleLowerCase("de-DE")) continue;
      const positions = groups.filter(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,lemma):
          note.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`)));
      for (const group of positions) {
        const analyses = [String(rawTags || "").split(",").filter(Boolean)];
        // Some exports store only one analysis in the mapping, with the others
        // in continuation notes. Only attach those when the lemma is unambiguous.
        if (group.pos==='verb'?new Set(group.formNotes.map(referenceLemma).filter(Boolean)).size === 1:new Set(mappings.map(row=>row[1])).size === 1) {
          for (const note of group.formNotes) {
            // A second explicit analysis (e.g. past participle) may coexist
            // with a finite structured mapping of the same spelling.
            if (/\bof\b/iu.test(note) && referenceLemma(note) !== lemma.toLocaleLowerCase("de-DE")) continue;
            const tags = note.toLowerCase().match(/(?:first|second|third)(?:\/(?:first|second|third))*-person|singular|plural|present|past|preterite|imperative|indicative|infinitive|participle|subjunctive(?:\s+(?:ii|i))?/gu) || [];
            const combined = tags.find(tag => tag.includes("/"));
            const alternatives = combined ? combined.replace(/-person$/u,"").split("/").map(person=>person+"-person") : [null];
            for (const person of alternatives) analyses.push(tags.map(tag => (tag === combined ? person : tag).replace(/\s+/gu,"-")));
          }
        }
        for (const tags of analyses) {
          const person = tags.find(tag => /^(?:first|second|third)-person$/u.test(tag)) || null;
          const number = tags.find(tag => ["singular","plural"].includes(tag)) || null;
          const tense = tags.find(tag => ["present","past","preterite"].includes(tag)) || null;
          const mood = tags.find(tag => /^(?:indicative|imperative|subjunctive(?:-i|-ii)?)$/u.test(tag)) || null;
          const evidence = {form,lemma,pos:group.pos,tags,person,number,tense,mood,source:"Wiktionary"};
          if (tags.length && !result.some(row => JSON.stringify(row) === JSON.stringify(evidence))) result.push(evidence);
        }
      }
    }
    return result;
  }
  function formMappings(word, data, direct) {
    // Some lossless export rows contain only a structured noun inflection,
    // with no textual sense to repeat that link. Case/number tags establish
    // a nominal relation; target lexical groups must still explicitly be nouns.
    const nounOnly = !(data?.senses || []).length;
    const nounTags = new Set(['nominative','accusative','genitive','dative','singular','plural',
      'definite','indefinite','strong','weak','mixed','masculine','feminine','neuter']);
    const nounMapping = row => {
      const tags = String(row[2] || '').split(',').filter(Boolean);
      return nounOnly && String(row[0]).normalize('NFC').toLocaleLowerCase('de-DE') === word.toLocaleLowerCase('de-DE') &&
        tags.some(tag => ['nominative','accusative','genitive','dative','singular','plural'].includes(tag)) &&
        tags.every(tag => nounTags.has(tag));
    };
    const mappings = (data?.inflections || []).filter(row =>
      !String(row[2] || "").split(",").some(tag => tag === "auxiliary" || tag.startsWith("error-")) &&
      (nounMapping(row) || direct.some(group => group.formNotes.some(note =>
        group.pos==='verb'?noteReferencesLemma(note,String(row[1])):
          note.toLocaleLowerCase("de-DE").includes(` of ${String(row[1]).toLocaleLowerCase("de-DE")}`)))));
    // Only an explicit, whole grammatical reference can supply a missing link.
    // No stemming, prose references, or replacement of structured mappings.
    if (!mappings.length && !(data?.inflections || []).length) {
      for (const group of direct) for (const note of group.formNotes) {
        const lemma = referenceLemma(note);
        if (lemma) mappings.push([word,lemma,""]);
      }
    }
    return mappings;
  }
  async function lexicalGroups(word, visited = new Set()) {
    if (visited.has(word) || visited.size >= 4) return [];
    const next = new Set([...visited,word]), data = await record(word);
    const direct = groupsFor(word,data), mappings = formMappings(word,data,direct);
    const positions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
    if (!(data?.senses || []).length && mappings.length) positions.add('noun');
    const mapped = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(lemma => lexicalGroups(lemma,next)))).flat();
    return [...direct.filter(group => group.meanings.length),...mapped.filter(group => !positions.size || positions.has(group.pos))];
  }
  async function lookup(word) {
    const candidates = [...new Set([String(word).normalize("NFC").trim(), String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE")])];
    for (const candidate of candidates) {
      const data = await record(candidate);
      if (!data) continue;
      const direct = groupsFor(candidate,data);
      // The export also contains auxiliary relations and malformed form mappings.
      // Only grammatical references support resolving this spelling to another lemma.
      const mappings = formMappings(candidate,data,direct);
      const evidence = inflectionEvidence(candidate,mappings,direct);
      const describedPositions = new Set(direct.filter(group => group.formNotes.length).map(group => group.pos));
      if (!(data?.senses || []).length && mappings.length) describedPositions.add('noun');
      const groups = (await Promise.all([...new Set(mappings.map(row => row[1]))].map(async lemma => {
        const mapped = await lexicalGroups(lemma,new Set([candidate]));
        // A verb inflection must not inherit unrelated noun senses of its lemma.
        return mapped.filter(group => !describedPositions.size || describedPositions.has(group.pos));
      }))).flat();
      const usable = [...groups,...direct].filter(group => group.meanings.length);
      const notes = direct.filter(group => group.formNotes.length).map(group => ({
        kind:"form-note",word:candidate,pos:group.pos,meanings:group.formNotes,
        lemmas:[...new Set(mappings.map(row => row[1]))],
        inflections:evidence.filter(row => row.pos === group.pos)
      }));
      const merged = new Map();
      for (const group of usable) {
        const key = JSON.stringify([group.word,group.pos]);
        if (!merged.has(key)) merged.set(key,{word:group.word,pos:group.pos,meanings:[]});
        const target = merged.get(key);
        target.meanings = [...new Set([...target.meanings,...group.meanings])];
      }
      if (merged.size || notes.length) return [...merged.values(),...notes];
      if (meanings(data).length) return [{word:candidate,pos:"",meanings:meanings(data),unresolved:true}];
    }
    return derivedVerbGroups(String(word).normalize("NFC").trim().toLocaleLowerCase("de-DE"));
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  function spellingReference(value) {
    const text = String(value || '').trim();
    const direct = /^(?:(?:Switzerland and Liechtenstein )?standard|alternative|obsolete|archaic|dated) spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*)\.?$/iu.exec(text);
    const former = /^Formerly standard spelling of ([\p{L}\p{M}]+(?:[- ][\p{L}\p{M}]+)*) which was deprecated in the spelling reform \(Rechtschreibreform\) of \d{4}\.?$/iu.exec(text);
    return (direct || former)?.[1] || null;
  }
  // Display enrichment only: keep the original lemma, POS, identity and rank.
  async function spellingTranslation(word, pos, values) {
    const references = [], unresolved = [];
    async function expand(meanings, visited) {
      const result = [];
      for (const value of meanings) {
        const target = spellingReference(value);
        if (!target) { result.push(value); continue; }
        references.push({note:value,target});
        const key = target.normalize('NFC').toLocaleLowerCase('de-DE');
        if (visited.has(key) || visited.size >= 4) { unresolved.push(target); continue; }
        const next = new Set([...visited,key]);
        let groups = [];
        for (const spelling of [...new Set([target,key])]) {
          groups = (await lexicalGroups(spelling)).filter(group => group.pos === pos);
          if (groups.length) break;
        }
        const translated = await expand(groups.flatMap(group => group.meanings),next);
        if (!translated.length) unresolved.push(target);
        result.push(...translated);
      }
      return [...new Set(result)];
    }
    if (!values.some(spellingReference)) return null;
    return {meanings:await expand(values,new Set([String(word).normalize('NFC').toLocaleLowerCase('de-DE')])),references,unresolved};
  }
  window.DeutschFallbackDictionary = {auxiliaryInflections,lookup, lookupEntry, separableEntries, mayBeVerb, spellingTranslation, superlativeEntries};
})();
