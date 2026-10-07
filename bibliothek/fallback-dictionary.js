/* Lossless dictionary export reader. Stored dictionary content is never edited. */
(() => {
  "use strict";
  const base = new URL("../open%20data/dictionary-de-json/", document.currentScript.src);
  const cache = new Map();
  const separableUrl = new URL("separable-index.json?v=1", document.currentScript.src);
  let separablePromise = null;
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
  const partition = word => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(word)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash & 1023;
  };
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
        return (hasReference || declensionNote) && tokens.length > 0 && tokens.every(token => grammarTokens.has(token));
      };
      const notes = [...new Set(values.filter(value => reference(value) || continuation(value)))];
      return {word,pos,meanings:[...new Set(values.filter(value => !notes.includes(value)))],formNotes:notes};
    });
  }
  // Evidence belongs to the clicked spelling, not to permanent dictionary cards.
  function inflectionEvidence(form, mappings, groups) {
    const result = [];
    for (const [spelling, lemma, rawTags] of mappings) {
      if (spelling.normalize("NFC").toLocaleLowerCase("de-DE") !== form.toLocaleLowerCase("de-DE")) continue;
      const positions = groups.filter(group => group.formNotes.some(note =>
        note.toLocaleLowerCase("de-DE").includes(` of ${lemma.toLocaleLowerCase("de-DE")}`)));
      for (const group of positions) {
        const analyses = [String(rawTags || "").split(",").filter(Boolean)];
        // Some exports store only one analysis in the mapping, with the others
        // in continuation notes. Only attach those when the lemma is unambiguous.
        if (new Set(mappings.map(row => row[1])).size === 1) {
          for (const note of group.formNotes) {
            if (/\bof\b/iu.test(note)) continue;
            const tags = note.toLowerCase().match(/(?:first|second|third)-person|singular|plural|present|past|preterite|imperative|indicative|infinitive|participle|subjunctive(?:\s+(?:ii|i))?/gu) || [];
            analyses.push(tags.map(tag => tag.replace(/\s+/gu,"-")));
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
    const mappings = (data?.inflections || []).filter(row =>
      !String(row[2] || "").split(",").some(tag => tag === "auxiliary" || tag.startsWith("error-")) &&
      direct.some(group => group.formNotes.some(note =>
        note.toLocaleLowerCase("de-DE").includes(` of ${String(row[1]).toLocaleLowerCase("de-DE")}`))));
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
    return [];
  }
  // Wörterbuch cards retain the selected entry word and its direct senses.
  async function lookupEntry(word) { return meanings(await record(word)); }
  window.DeutschFallbackDictionary = {lookup, lookupEntry, separableEntries};
})();
