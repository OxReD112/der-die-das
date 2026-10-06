/* Dictionary-backed candidates, pronoun clues and separable verb groups. */
(() => {
  "use strict";
  const norm = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase("de-DE");
  const posMap = { adj:"Adjektiv", adv:"Adverb", conj:"Konjunktion", pron:"Pronomen", noun:"Nomen", verb:"Verb", adjective:"Adjektiv", adverb:"Adverb", conjunction:"Konjunktion", pronoun:"Pronomen" };
  function create(entries, fallback) {
    const forms = new Map(), lemmas = new Map(), separatedForms = new Map(), byId = new Map(entries.map(entry => [String(entry.id),entry]));
    function add(map, form, entry) {
      const key = norm(form);
      if (!key) return;
      const matches = map.get(key) || [];
      if (!matches.some(item => item.id === entry.id)) matches.push(entry);
      map.set(key, matches);
    }
    for (const entry of entries) {
      add(lemmas, entry.word, entry); add(forms, entry.word, entry);
      for (const form of entry.search_forms || []) add(forms, form, entry);
      if (entry.type === "Nomen" && entry.plural && entry.plural !== "—") {
        for (const plural of entry.plural.split(/\s*,\s*/)) {
          add(forms, plural, entry);
          if (/^[\p{L}\p{M}]+$/u.test(plural) && !/[ns]$/iu.test(plural)) add(forms, plural + "n", entry);
        }
      }
      if (entry.type === "Verb") {
        const provenPrefixes = new Set(entry.separable_prefix ? [entry.separable_prefix] : []);
        for (const [tense,group] of Object.entries(entry.forms || {})) {
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
          if (norm(entry.word).startsWith(prefix)) add(forms,prefix + "zu" + norm(entry.word).slice(prefix.length),entry);
        }
        const participle = String(entry.perfect_form || "").trim().split(/\s+/).pop();
        if (participle) add(forms, participle, entry);
      }
    }
    const mainCandidate = item => ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item });
    function separableCandidates(word, context) {
      if (!context || !Number.isInteger(context.tokenOffset)) return [];
      const sentence = String(context.sentence || ""), tokens = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const selected = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (selected < 0) return [];
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      let start = selected, end = selected;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const prefix = norm(tokens[end][0]), results = [];
      for (let i = start; i < end; i++) {
        if (selected !== i && selected !== end) continue;
        const pairs = (separatedForms.get(norm(tokens[i][0])) || []).filter(pair => pair.prefix === prefix);
        if (!pairs.length) continue;
        // A capitalised noun inside a clause must not become a verb stem.
        if (i > start && /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && (forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Nomen")) continue;
        // Avoid attaching a particle across another verb group.
        if (tokens.slice(i+1,end).some(t => {
          const entries = forms.get(norm(t[0])) || [];
          if (norm(t[0]) === "bitte" || /^[A-ZÄÖÜ]/u.test(t[0]) && entries.some(e => e.type === "Nomen")) return false;
          return entries.some(e => e.type === "Verb") || separatedForms.has(norm(t[0]));
        })) continue;
        const earlierAuxiliary = tokens.slice(start,i).some(t => (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" &&
          ["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten","lassen"].includes(e.word)));
        if (earlierAuxiliary) continue;
        for (const pair of pairs) {
          const spans = [i,end].map(j => ({text:tokens[j][0],start:tokens[j].index,end:tokens[j].index + tokens[j][0].length}));
          results.push({...mainCandidate(pair.entry),construction:{id:"separable-verb",spans}});
        }
      }
      return results;
    }
    function contextualRank(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset)) return {candidates, preferred:null, evidence:null};
      const tokens = [...String(context.sentence || "").matchAll(/[\p{L}\p{M}]+/gu)];
      const index = tokens.findIndex(t => t.index === context.tokenOffset && norm(t[0]) === norm(word));
      if (index < 0 || !/^(sein|seine|seinen|seinem|seiner|seines|seins|ihr|ihre|ihren|ihrem|ihrer|ihres|ihrs)$/u.test(norm(word)))
        return {candidates, preferred:null, evidence:null};
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
        const group = entry.forms?.[tense] || {};
        return (person ? [group[person]] : Object.values(group)).some(form => form && norm(form) === norm(tokens[i][0]));
      });
      const clauseIndices = Array.from({length:end-start+1},(_,i)=>start+i);
      const modalInClause = clauseIndices.some(i => i !== index && matches(i).some(e => e.type === "Verb" && modalLemmas.includes(e.word) && finiteForm(e,i)));
      const dativeLemmas = ["helfen","danken","gefallen","gehören","vertrauen","antworten"];
      const hasDativeComplement = e => dativeLemmas.includes(e.word) || (e.complements || []).some(c => c.pattern === "Dativ");
      const dativePrepositions = ["mit","bei","von","zu","aus","nach","seit","gegenüber","neben","an","auf","hinter","in","über","unter","vor","zwischen"];
      const personalSubjects = new Set(["ich","du","er","sie","es","wir","ihr"]);
      const hasSubjectBefore = verbIndex => clauseIndices.some(i => i !== index && i < verbIndex && personalSubjects.has(norm(tokens[i][0])) && !(i > start && dativePrepositions.includes(norm(tokens[i-1][0])))) ||
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
      const dativePreposition = previous >= start && dativePrepositions.includes(norm(tokens[previous][0]));
      const perfectDative = clauseIndices.some(i => i > index && matches(i).some(e => e.type === "Verb" && hasDativeComplement(e) &&
        norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]))) &&
        clauseIndices.some(i => i < index && matches(i).some(e => e.type === "Verb" && ["haben","sein"].includes(e.word) && finiteForm(e,i)));
      let ids = [], evidence = null;
      if (nounPhrase) {
        ids = norm(word).startsWith("sein") ? ["pronoun-013"] : ["pronoun-014","pronoun-015"];
        evidence = "possessive-before-noun";
      } else if (norm(word) === "sein" && previous >= 0 && adjacent(previous,index) &&
        (isAdjective(previous) || matches(previous).some(e => e.type === "Verb" &&
          modalLemmas.includes(e.word)))) {
        ids = candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
        evidence = "sein-after-predicate-or-modal";
      } else if (norm(word) === "sein" && modalInClause && index === end) {
        ids = candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
        evidence = "sein-clause-final-after-modal";
      } else if (norm(word) === "ihr" && (dativePreposition || dativeFinite || dativeFollowing)) {
        ids = ["pronoun-004"]; evidence = dativePreposition ? "ihr-after-preposition" : "ihr-with-dative-finite-verb";
      } else if (norm(word) === "ihr" && [previous,next].some(i => i >= start && i <= end &&
        matches(i).some(e => e.type === "Verb" && finiteForm(e,i,"ihr")))) {
        ids = ["pronoun-007"]; evidence = "ihr-next-to-plural-verb";
      } else if (norm(word) === "ihr" && (perfectDative || previous >= start && previous >= 0 &&
        matches(previous).some(e => e.type === "Verb" && dativeLemmas.includes(e.word)))) {
        ids = ["pronoun-004"]; evidence = perfectDative ? "ihr-in-dative-perfect-group" : "ihr-after-dative-verb";
      }
      const favoured = candidates.filter(c => ids.includes(c.dictionaryId));
      if (!favoured.length) return {candidates, preferred:null, evidence:null};
      return {candidates:[...favoured,...candidates.filter(c => !favoured.includes(c))],
        preferred:favoured.length === 1 ? favoured[0] : null, evidence};
    }
    async function resolve(word, context) {
      const exact = forms.get(norm(word)) || [];
      const separated = separableCandidates(word, context);
      let candidates = [...separated,...exact.map(mainCandidate)], error = null, unresolvedMeanings = [];
      if (!exact.length) {
        try {
          for (const group of await fallback.lookup(word)) {
            if (group.unresolved) { unresolvedMeanings.push(...group.meanings); continue; }
            const main = (lemmas.get(norm(group.word)) || []).filter(item => !group.pos || item.type === (posMap[group.pos] || group.pos));
            if (main.length) candidates.push(...main.map(mainCandidate));
            else candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings});
          }
        } catch (e) { error = e; }
      }
      candidates = candidates.filter((c,i,all) => all.findIndex(x => window.BibliothekVocabulary.identity(x) === window.BibliothekVocabulary.identity(c)) === i);
      const ranked = contextualRank(word, context, candidates);
      candidates = ranked.candidates;
      // The feminine personal pronoun's dative form means her, not she.
      if (norm(word) === "ihr") {
        const candidate = candidates.find(c => c.dictionaryId === "pronoun-004");
        if (candidate) candidate.translation = {en:"her (dative)",ru:"ей (дательный падеж)"};
      }
      const preferred = ranked.preferred || (separated.length === 1 ? candidates.find(c => c.dictionaryId === separated[0].dictionaryId) : null);
      return { preferred, evidence:ranked.evidence || (separated.length ? "separated-verb-pair" : null), form:word, status:candidates.length === 1 ? "resolved" : candidates.length ? "ambiguous" : "unresolved", candidates, selected:candidates.length === 1 ? candidates[0] : preferred, unresolvedMeanings, error };
    }
    return Object.freeze({ resolve, entry:id => byId.get(String(id)) || null, match:word => (forms.get(norm(word)) || []).map(mainCandidate) });
  }
  window.BibliothekLemmaResolver = Object.freeze({ create });
})();
