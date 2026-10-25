/* Dictionary-backed candidates, pronoun clues and separable verb groups. */
(() => {
  "use strict";
  // Speed (24.10.2026): toLowerCase() / toUpperCase() instead of toLocale…Case("de-DE") everywhere — the same result for every
  // string (German has no tailored casing; checked on all Unicode code points and all dictionary strings), many times faster in browsers.
  const norm = value => String(value || "").normalize("NFC").trim().toLowerCase();
  // Lists cleanup step 2 (25.10.2026): word lists that several rules share — one constant per meaning, not per set of words
  // (two rules that only happen to use the same words keep two constants, so changing one rule never changes the other).
  // Each holds the same words as the copies it replaced — in the same order wherever the order could matter (an
  // includes / has check does not depend on it) — and a regex the same pattern and flags; none is changed at run time.
  // Inventory: Documentation/QA/Lists_Inventory_2026-10-25/.
  // Batch 1 — articles.
  // The articles of the three genders: a noun card's own article, and the gender rows of its declension table.
  const GENDER_ARTICLES = ["der","die","das"];
  // der / die / das right before a capitalised noun: the article of a possible subject (die also of a plural one).
  const SUBJECT_ARTICLES = ["der","die","das"];
  // der / die / das standing alone as a pronoun — relative or demonstrative (…, der an nichts Böses dachte; der mit dem Hütchen).
  const DER_PRONOUNS = ["der","die","das"];
  // The definite article in every case.
  const DEFINITE_ARTICLES = ["der","die","das","den","dem","des"];
  // die / der / den: the definite article forms that may be plural (die Kinder, der Kinder, den Kindern).
  const PLURAL_DEFINITE_ARTICLES = ["die","der","den"];
  // The gender of a noun card's own article.
  const ARTICLE_GENDER = {der:"masculine",die:"feminine",das:"neuter"};
  // A whole word that is a definite or indefinite article (der … eines) — no possessives or other determiners.
  const ARTICLE_WORD = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)$/u;
  // An article or a possessive with any ending: what may stand before a nominal word (sentence verb analyses).
  const ARTICLE_OR_POSSESSIVE_WORD = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|euer\w*|eure[mnrs]?)$/u;
  // Any declined determiner: an adjective after it stands inside a noun phrase.
  const DETERMINER_WORD = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\w*|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|eur\w*|dies\w*|jen\w*|jed\w*|all\w*|welch\w*|solch\w*|manch\w*|beide\w*)$/u;
  // Batch 2 — determiners.
  // ein / eine / einen: an indefinite article that may open a predicate noun (… hielt ihn für einen Spitzbuben).
  const INDEFINITE_NOM_ACC = /^(?:ein|eine|einen)$/u;
  // The start of a declined possessive or other determiner (meine, keinen, dieses, jeder, solche …). Matched at the start of
  // the word only, so it also takes jedoch, allein, allerdings. eure / euren … (whole word, not Europa, euretwegen): lists
  // cleanup step 3, group A.
  const DETERMINER_STEM = /^(?:mein|dein|sein|ihr|unser|euer|eure[mnrs]?(?![\p{L}])|kein|dies|jen|all|jed|solch|welch)/u;
  // Dative singular determiners (dem, einem, diesem, meinem …): a dative object, not an accusative one.
  const DATIVE_SINGULAR_DETERMINERS = ["dem","einem","diesem","jenem","keinem","meinem","deinem","seinem","ihrem","unserem","eurem"];
  // A possessive before a noun, with or without an ending (mein Buch, seine Schwester, eure Mutter).
  const POSSESSIVE_WORD = /^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u;
  // The word after von that makes it the agent of a passive (von ihm, von der Mutter, von meinem Vater).
  const VON_AGENT_WORD = /^(?:mir|dir|ihm|ihr|uns|euch|ihnen|allen|der|die|das|den|dem|des|einem|einer|meinem|meiner|seinem|seiner|ihrem|ihrer|unserem|unserer)$/u;
  // Batch 3 — subject pronouns and persons.
  // The third-person rows of a verb table: er/sie/es and the plural sie.
  const THIRD_PERSONS = ['er/sie/es','sie'];
  // Pronouns that are always a subject: er, ich, du, wir, man (not sie / es / ihr, which may also be objects).
  const UNAMBIGUOUS_SUBJECT_PRONOUNS = ["er","ich","du","wir","man"];
  // Every personal pronoun that can be a subject, and man.
  const SUBJECT_PRONOUNS = new Set(["ich","du","er","sie","es","wir","ihr","man"]);
  // ich, du, er, wir, ihr: next to es / sie (nominative or accusative) they make es / sie the object
  // (ihr may also be a dative — the werden-passive rule takes it as here).
  const NOMINATIVE_PRONOUNS = ["ich","du","er","wir","ihr"];
  // Batch 4 — object pronouns.
  // The verb person(s) a nominative personal pronoun asks for (sie: er/sie/es or plural sie).
  const PRONOUN_PERSONS = {ich:["ich"],du:["du"],er:["er/sie/es"],sie:["er/sie/es","sie"],es:["er/sie/es"],wir:["wir"],ihr:["ihr"]};
  // Words that cannot be the subject (mich, dich, ihn, einen are accusative; keinen, sich, uns, euch accusative or dative):
  // an object, so werden + participle is an active Futur, not a passive.
  const OBJECT_ONLY_WORDS = ["mich","dich","ihn","einen","keinen","sich","uns","euch"];
  // es / sie: nominative or accusative — an object when another (nominative) pronoun stands next to them.
  const ES_SIE = ["es","sie"];
  // A reflexive pronoun of the first or second person and the subject pronoun of the same person (du … dich, wir … uns).
  const REFLEXIVE_SUBJECT = {mich:"ich",dich:"du",uns:"wir",euch:"ihr"};
  // Personal pronouns after für + a verb: a beneficiary, not a predicate (für sie). sie / es / ihr may be nominative elsewhere.
  const PERSONAL_OBJECT_PRONOUN = /^(?:mich|dich|ihn|sie|es|uns|euch|ihm|ihr|ihnen|mir|dir)$/u;
  // Lists cleanup step 3, group A (25.10.2026): the finite forms of sein / haben in one place, by tense, so every rule that
  // lists them has the whole paradigm (wärst, wärt, hab …; old and rare forms too). A rule that labels a tense takes only
  // its part; the rules below take every finite form (none of them names a tense).
  const SEIN_FINITE = Object.freeze({
    präsens: ["bin","bist","ist","sind","seid"],
    präteritum: ["war","warst","waren","wart"],
    konjunktiv1: ["sei","seiest","seist","seien","seiet"],
    konjunktiv2: ["wäre","wärest","wärst","wären","wäret","wärt"]});
  const HABEN_FINITE = Object.freeze({
    präsens: ["habe","hab","hast","hat","haben","habt"],
    präteritum: ["hatte","hattest","hatten","hattet"],
    konjunktiv1: ["habe","habest","habet"],
    konjunktiv2: ["hätte","hättest","hätten","hättet"]});
  const finiteForms = (paradigm,...extra) => [...new Set([...Object.values(paradigm).flat(),...extra])];
  const wordOf = forms => new RegExp(`^(?:${forms.join("|")})$`,"u");
  // A finite form of sein / haben (every tense).
  const SEIN_FINITE_WORD = wordOf(finiteForms(SEIN_FINITE));
  const HABEN_FINITE_WORD = wordOf(finiteForms(HABEN_FINITE));
  // … and gewesen: sein right at a participle is its own auxiliary (L27).
  const SEIN_FINITE_OR_GEWESEN = wordOf(finiteForms(SEIN_FINITE,"gewesen"));
  // … and gewesen / sein: any sein near a participle that can be an adjective after sein.
  const SEIN_ANY_FORM = wordOf(finiteForms(SEIN_FINITE,"gewesen","sein"));
  // Batch 5 — auxiliary and copula verbs.
  // The auxiliaries of the Perfekt (and Plusquamperfekt, Konjunktiv II past, perfect infinitive): hat gemacht, ist gegangen, gesehen zu haben.
  const PERFECT_AUXILIARIES = ['haben','sein'];
  // haben / sein + zu + infinitive (hat … zu tun, ist zu empfehlen): the finite head of that construction.
  const ZU_CONSTRUCTION_HEADS = ["haben","sein"];
  // The tense auxiliaries (Perfekt and Futur / passive werden) as the helper of a verb group (not the reflexive-verb check
  // or the modifier choice, which keep their own lists).
  const TENSE_AUXILIARIES = ['haben','sein','werden'];
  // Verbs that may head a verb group together with the modals: the tense auxiliaries and lassen.
  const GROUP_HELPER_VERBS = ['haben','sein','werden','lassen'];
  // sein / werden with a predicate (… überfordert zu sein, nichts bekannt war / wurde).
  const PREDICATIVE_SEIN_WERDEN = ["sein","werden"];
  // The copulas: sein, werden, bleiben + a predicate (adjective or noun).
  const COPULAS = ["sein","werden","bleiben"];
  const COPULA_SET = new Set(COPULAS);
  // Batch 6 — modal verbs and degree words.
  // The modal verbs, with möchten.
  const MODAL_VERB_SET = new Set(["können","müssen","dürfen","sollen","wollen","mögen","möchten"]);
  // Degree words before a participle or adjective inside a noun phrase or predicate (ein sehr gebildeter, ziemlich verletzt).
  const ATTRIBUTE_DEGREE_WORDS = new Set(["sehr","so","ganz","besonders","äußerst","höchst","recht","ziemlich","überaus","zu","außerordentlich","hoch","wenig","etwas"]);
  // Degree words before a participle with sein that make it a state adjective (wer könnte so verzweifelt sein).
  const STATE_DEGREE_WORDS = ["so","sehr","ganz","völlig","total","ziemlich","zu","äußerst","extrem","gänzlich","vollkommen","recht","furchtbar","schrecklich"];
  // Degree words before a participle with werden that make werden «become» (wird bald sehr bekannt werden).
  const BECOME_DEGREE_WORDS = ["wenig","sehr","ganz","völlig","total","ziemlich","etwas","so","zu","äußerst","leicht","extrem"];
  // gern / gerne / lieber: a wish or request with hätte (Ich hätte die Haare gern kurz geschnitten).
  const REQUEST_ADVERBS = ["gern","gerne","lieber"];
  // Batch 7 — conjunctions.
  // Conjunctions that join like parts without a comma (und, oder; if ever extended — sowie, bzw.). Do not add aber /
  // sondern / doch / denn: a comma always stands before them, they start a new clause — another notion, which would
  // get a constant of its own (advisor 25.10).
  const COORDINATORS_WITHOUT_COMMA = ["und","oder"];
  // und / oder / sowie continuing a series of nouns (Herr und Frau …, Gold-, Silber- und Kupfermünzen).
  const SERIES_COORDINATOR = /^(?:und|oder|sowie)$/u;
  // oder / bis / und between two numbers (zwei oder drei, 10 bis 12).
  const NUMERAL_SERIES_JOINERS = ["oder","bis","und"];
  // Coordinating conjunctions that end the clause of a recorded expression.
  const CLAUSE_COORDINATORS = ["und","oder","aber","denn","sondern"];
  // Batch 8 — prepositions and particles.
  // als / wie of a comparison: after a predicate the clause goes on (… genutzt als …, so groß wie …); between the parts of
  // a verb group it is no group (das Gleiche wie Truppen … zu führen).
  const COMPARISON_PARTICLES = ["als","wie"];
  // von / vom before the agent of a passive (… von ihm gerufen, vom König geschickt).
  const VON_AGENT_PREPOSITIONS = ["von","vom"];
  // von / vom / durch: the agent of a werden-passive (wird von X / durch X vertreten).
  const PASSIVE_AGENT_PREPOSITIONS = ["von","vom","durch"];
  // um / ohne / statt / anstatt opening a zu-infinitive (um … zu helfen).
  const ZU_INFINITIVE_OPENERS = ['um','ohne','statt','anstatt'];
  // The case a one-case preposition governs: 2 = dative, 1 = accusative.
  const PREPOSITION_CASE_CODE = {mit:2,bei:2,von:2,zu:2,aus:2,nach:2,für:1,durch:1,gegen:1,ohne:1,um:1};
  // Batch 9 — other closed lists.
  // das / es / dies between the verb and für in «was … für ein» (Was ist das für ein Geräusch?).
  const WAS_FUER_PRONOUNS = ["das","es","dies"];
  // Invariant colour and loan adjectives: no regular endings (rosa, lila, prima).
  const INVARIANT_ADJECTIVES = new Set(["rosa","lila","prima","extra","super","gratis","klasse"]);
  // The word after wie in a question of amount or degree (wie viele, wie lange, wie oft) — not a comparison.
  const WIE_QUESTION_WORD = /^(?:viele?[nmrs]?|lange|oft|weit|sehr)$/u;
  // A pronominal adverb da(r)- / wo(r)- + these prepositions (darauf, worüber; the L36 subset — not damit, dabei, danach,
  // dazu, darum); the preposition is the first group.
  const PRONOMINAL_ADVERB = /^(?:da|wo)r?(an|auf|aus|für|gegen|in|von|über|unter|vor|neben|hinter|zwischen)$/u;
  // Batch 10 — endings.
  // A word ending like a declined adjective or participle (-e, -en, -em, -er, -es).
  const DECLINED_ENDING = /(?:e|en|em|er|es)$/u;
  // The adjective endings (the ending a word was found with; no two of them can end the same word).
  const ADJECTIVE_ENDINGS = ["e","en","em","er","es"];
  // The same, with the bare stem (gut, gute, guten …): is this an own adjective with or without an ending?
  const ADJECTIVE_ENDINGS_WITH_BARE = ["","e","en","em","er","es"];
  // The ending of a declined adjective form, taken out of the word (match()[0]).
  const ADJECTIVE_ENDING_AT_END = /(?:en|em|er|es|e)$/u;
  // A declined present participle (vergrößernden, lächelnde).
  const DECLINED_PRESENT_PARTICIPLE = /^\p{Ll}+(?:e|[lr])nd(?:e|en|em|er|es)$/u;
  // A lowercase word with an adjective ending: an attributive word before a noun.
  const LOWERCASE_DECLINED_WORD = /^\p{Ll}[\p{L}]*(?:e|en|em|er|es)$/u;
  // An adjective in -ig / -lich and its stem (word formation).
  const IG_LICH_ADJECTIVE = /^(.{3,})(ig|lich)$/u;
  // A regular infinitive in -en / -eln / -ern; irregular ones (sein, tun …) are exceptions where it is used — do not
  // widen the shape (advisor 25.10).
  const REGULAR_INFINITIVE_SHAPE = /^[\p{L}\p{M}]+(?:en|eln|ern)$/u;
  // A determiner ending that may be plural (meine, diesen, unserer).
  const PLURAL_DETERMINER_ENDING = /(?:e|en|er)$/u;
  // L45 (links chat, 23.10.2026): variant_forms of a card — an old spelling of a form (ward = wurde, wardst = wurdest)
  // stands in the same cell as the form itself, under the key «person~», so every rule that reads the table sees it;
  // personOf gives the person back (indexVerb, reflexive rows), formIn looks up one person with its variant.
  // L23 (links chat, 24.10.2026): the modal verbs have no Konjunktiv I table on their cards; its forms are the infinitive stem
  // + e / est / e / et (könne, solle, müsse, dürfe, wolle, möge — indirect speech: Die Scheidung solle außergerichtlich
  // erfolgen), so the modal groups read them as they read soll / kann. wir / sie are the infinitive (Präsens).
  const MODAL_STEMS = {können:"könn",müssen:"müss",dürfen:"dürf",sollen:"soll",wollen:"woll",mögen:"mög"};
  const DERIVED_KONJ1 = new Set(Object.values(MODAL_STEMS).flatMap(stem => [stem + "e", stem + "est", stem + "et"]));
  const formsOf = entry => {
    const table = {...(entry?.lookup_forms || {}),...(entry?.forms || {})}, variants = entry?.variant_forms;
    const stem = MODAL_STEMS[norm(entry?.word || entry?.infinitive)];
    if (stem && !table["Konjunktiv I"]) table["Konjunktiv I"] = {"ich":stem + "e","du":stem + "est","er/sie/es":stem + "e","ihr":stem + "et"};
    if (!variants) return table;
    for (const [tense,group] of Object.entries(variants)) table[tense] = {...(table[tense] || {}),
      ...Object.fromEntries(Object.entries(group || {}).map(([person,form]) => [person + "~",form]))};
    return table;
  };
  // (review 24.10: a capital inside the sentence is no modal in Konjunktiv I — die Wolle, not wollen; at the start it may be: Möge …)
  const konj1At = (tokens,i) => tokens?.[i] && (/^\p{Ll}/u.test(tokens[i][0]) || i === 0) ? ["Konjunktiv I"] : [];
  const personOf = key => String(key).replace(/~$/u,"");
  const formIn = (group,person) => [group[person],group[person + "~"]];
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
    {id:'same-infinitive-sense',stage:'initial',kind:'preference'},
    {id:'clause-position',stage:'initial',kind:'preference'},
    {id:'predicative-comparative',stage:'initial',kind:'preference'},
    {id:'closed-class-exact-form',stage:'initial',kind:'preference'},
    // C21 (18.10.2026): a numeral before its noun / von, alone in a reply, an ordinal after a determiner; eins.
    {id:'numeral-reading',stage:'initial',kind:'preference'},
    // Grammar group (step 8): the first row of the group that settles is the
    // group's only proposal; shared rows read sentence-level facts.
    {id:'shared-finite-subject',stage:'initial',kind:'preference',group:'grammar',shared:true},
    {id:'shared-nominal-group',stage:'initial',kind:'preference',group:'grammar',shared:true},
    {id:'participle-verb-sign',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-default',stage:'initial',kind:'preference',group:'grammar'},
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
    {id:'participle-adjective-sign',stage:'initial',kind:'preference',group:'grammar'},
    {id:'predicative-adjective',stage:'initial',kind:'preference',group:'grammar'},
    {id:'lowercase-adjective-over-noun',stage:'initial',kind:'preference',group:'grammar'},
    {id:'sentence-initial-adjective-noun',stage:'initial',kind:'preference',group:'grammar'},
    {id:'noun-after-determiner',stage:'initial',kind:'preference',group:'grammar'},
    {id:'zu-infinitive-separability',stage:'initial',kind:'preference',group:'grammar'},
    {id:'infinitive-in-modal-group',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-with-accusative-object',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-with-dative-complement',stage:'initial',kind:'preference',group:'grammar'},
    {id:'auxiliary-and-participle',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-adjective',stage:'initial',kind:'preference',group:'grammar'},
    {id:'participle-plain-verb',stage:'initial',kind:'preference',group:'grammar'},
    {id:'finite-verb-with-subject',stage:'initial',kind:'preference',group:'grammar'},
    {id:'finite-verb-with-noun-subject',stage:'initial',kind:'preference',group:'grammar'},
    {id:'validated-finite-form',stage:'initial',kind:'preference',group:'grammar'},
    {id:'name-homograph',stage:'initial',kind:'preference'},
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
    {id:'noun-homonym-agreement',stage:'fill',requires:['no-tentative-construction']},
    {id:'participle-base',stage:'late'},
    // G48: a word no dictionary knows, explained by its parts (one card; never beside a dictionary card).
    {id:'word-formation',stage:'override'}
  ].map(rule => Object.freeze(rule)));
  // The evidence label keeps its own precedence (unchanged from step 4); the
  // deciding row is reported separately in decision.rule.
  const selectionEvidenceOrder = Object.freeze(['reflexive-reciprocal-choice','nominalized-person','nominalized-noun',
    'reflexive-subject','contextual','separated-verb','clause-position','predicative-comparative','closed-class-exact-form','numeral-reading','grammar','name-homograph']);
  // Block 9: closed word classes and the grammar-rank evidence that only shows a
  // possible form of another word (no subject, no capital) — data, not word lists.
  const closedWordClasses = new Set(["Adverb","prep","Konjunktion","article","Pronomen","num","particle"]);
  const formOnlyEvidence = Object.freeze({"validated-finite-form":{pos:"Verb"},"noun-after-determiner":{pos:"Nomen",lowercaseOnly:true},
    // Step 8: attributive agreement proves a modifier role, which an own
    // declinable determiner or ordinal card (andere, einige, erste) has as well.
    "shared-nominal-group-agreement":{pos:"Adjektiv",closedPos:["Pronomen","num"]},
    "attributive-modifier-agreement":{pos:"Adjektiv",closedPos:["Pronomen","num"]}});
  const blockingReasons = new Set(['grammar-blocked','derived-only','reflexive-unconfirmed','tentative-construction','no-candidates']);
  function startSelection({candidates, proposals, choiceBlocks = [], derivedOnly = false, covered = [], lowercaseNoun = false}) {
    // C20 (18.10.2026): a lowercase word in a text that capitalises nouns is no noun;
    // its noun cards stay candidates for the reader, but no row selects them.
    const nounBarred = c => lowercaseNoun && canonicalPos(c?.pos) === 'Nomen';
    const identity = c => window.BibliothekVocabulary.identity(c);
    const rules = new Map(selectionRules.map(rule => [rule.id,rule]));
    const trace = [];
    let preferred = null, decisive = null, blocked = null, winner = null;
    for (const rule of selectionRules) {
      if (rule.stage !== 'initial' || rule.kind === 'fallback') continue;
      const proposal = proposals[rule.id];
      if (!proposal) continue;
      if (proposal.candidate && nounBarred(proposal.candidate)) { trace.push({rule:rule.id,stage:'initial',result:'withdrawn',reason:'lowercase-noun'}); continue; }
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
    const onlyCards = activeBlocks.find(block => block.only)?.only;
    if (onlyCards) { const kept = candidates.filter(c => onlyCards.some(o => identity(o) === identity(c))); if (kept.length > 1 && kept.length === onlyCards.length) candidates = kept; }
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
      else if (nounBarred(single)) reason = 'lowercase-noun';
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
        if (!this.canFill(id,resolution) || !candidate || nounBarred(candidate)) return false;
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
  // G48 (23.10.2026, reference 3.18 / C6): a word that no dictionary knows is explained by its parts — a compound
  // (die Bauchhöhe = Bauch + Höhe, eulenfrei = Eule(n) + frei, das Hochsicherheitsverlies = Hoch + Sicherheit(s) + Verlies)
  // or a derived word (die Einbiegung — aus Verb einbiegen; knubbelig — aus Nomen Knubbel; unnormal — un- + normal).
  // Rules approved by the user 16.10 / 18.10 / 19.10: two parts — both in a dictionary; three — only when two fail, every
  // part at least 4 letters, exactly one split; -schaft / -nis / -tum are not done. Checked on the books, UD and a
  // reviewer's traps (23.10): every part has a Russian meaning; a singular noun needs a sign of a common noun before it
  // (a determiner, an attribute, a preposition); place-name and surname heads (-mann, -berg, -dorf …) and -er nouns need a
  // determiner; an adjective with an ending needs a noun after it (not an infinitive: hochreichen); a split that is not
  // unique is not shown (Stau + Becken / Staub + Ecken). Pure: dictionary and context come from the resolver.
  //   dict.readings(spelling) -> Promise<[{pos:'Nomen'|'Adjektiv'|'Verb', lemma, source:'main'|'fallback', form:boolean,
  //        number:'plural'|null, gerund:boolean, en, entry}]>  (lemma readings form:false, inflected forms form:true)
  //   dict.mayBe(spelling) -> boolean     cheap prefilter (false = surely in no dictionary)
  //   dict.blocked(spelling) -> boolean   an own function word / preposition / adverb card or a verb particle (never a part)
  //   dict.ru(lemma, pos) -> Promise<string>  the first Russian meaning ('' when there is none)
  //   dict.gender(lemma) -> Promise<'der'|'die'|'das'|null>  one singular gender of an external noun
  //   ctx: {det, defDirect, otherDet, adj, contraction, prep, title, nextNoun, pluralDet, singularDet} (resolver: wordFormationContext)
  function createWordFormation(dict) {
    const LINKS = ['', 's', 'es', 'n', 'en', 'e', 'ens', 'ns'];
    const HALF = new Set(['frei', 'los', 'voll', 'reich', 'arm', 'artig', 'fähig']);
    const ADJ_END = ['', 'e', 'en', 'em', 'er', 'es'];
    // Suffixes and endings that are no words of their own (never a head); toponym heads; -weise (adverbs).
    const BAD_HEADS = new Set(['heit', 'keit', 'ung', 'ungen', 'schaft', 'nis', 'tum', 'lich', 'chen', 'lein', 'erei', 'ling', 'isch', 'bar', 'sam',
      'haft', 'ende', 'enden', 'ender', 'endes', 'hausen', 'weise']);
    // Heads that also make place names and surnames (Herrmann, Bornheim, Waldstein, Eschenbach, Reinecke, Grünheide,
    // Bischofswiesen): split only after a determiner or an attribute (der Bauersmann, ein hell erleuchtetes Räuberhaus);
    // a contraction is not enough (am Ammersee). -mann in the singular only with a linking element (der Bauer(s)mann;
    // der alte Kellermann, die Herrmann are surnames).
    const NAME_HEADS = new Set(['mann', 'berg', 'burg', 'bach', 'dorf', 'heim', 'stein', 'feld', 'tal', 'thal', 'rode', 'hagen', 'hof',
      'brunn', 'brunnen', 'born', 'wald', 'haus', 'hain', 'rath', 'ecke', 'au', 'see', 'kirche', 'reuth', 'städt', 'stedt', 'leben', 'ingen', 'stadt',
      'heide', 'eiche', 'winkel', 'moor', 'werder', 'wiese', 'grund', 'horst', 'weiler', 'garten', 'brück', 'brücke', 'furt', 'land']);
    const PREFIXED = /^(?:ge|be|er|ver|zer|ent|emp|miss)/u;
    const NEUTER_DET = /^(?:das|dem|des|dies(?:es|em)|jen(?:es|em)|jed(?:es|em)|ein|eines|einem|kein(?:es|em)?|(?:mein|dein|sein|ihr|unser|euer|eur)(?:es|em)?)$/u;
    const POSSESSIVE_STEM = /^(?:mein|dein|sein|ihr|unser|unsr|euer|eur)$/u;
    const norm = s => String(s).normalize('NFC').toLowerCase();
    async function readings(s, pos, lemmaOnly) {
      if (s.length < 3) return [];
      const keep = rows => rows.filter(r => (!lemmaOnly || !r.form) && pos.includes(r.pos));
      let rows = keep(dict.mayBe(s) ? await dict.readings(s) : []);
      // Old spelling (Grimm): Schloß, Nuß also read as Schloss, Nuss — not when an own card has the ß spelling (G68, 24.10):
      // Straße is not also «Strasse», a plural of Strass.
      if (s.includes('ß') && !rows.some(r => r.source === 'main')) { const t = s.replace(/ß/gu, 'ss'); if (dict.mayBe(t)) rows = [...rows, ...keep(await dict.readings(t))]; }
      return rows;
    }
    const ownFirst = (x, y) => (x.source === 'main' ? 0 : 1) - (y.source === 'main' ? 0 : 1);
    async function withRu(rows) {
      for (const r of rows) if (r.ru === undefined) r.ru = await dict.ru(r.lemma, r.pos);
      return rows;
    }
    // Verb stems of a first part: lern-, wart-e- (warten), les-e-, rechen- (rechnen), zeichen- (zeichnen).
    function stemVerbs(a) {
      return [a + 'en', ...(/[lr]$/u.test(a) ? [a + 'n'] : []), ...(/en$/u.test(a) ? [a.slice(0, -2) + 'nen'] : [])].map(v => ({v, nen: !v.startsWith(a)}));
    }
    // Modifier (non-final part): a noun / adjective lemma, a noun's plural (Hühner-), a verb stem; a linking element
    // only after a noun. Ranks: an own word, then an own verb stem (Lese-sessel is lesen, not Lese «harvest»), an external
    // word, a linking element of a word whose form the whole spelling is (Drache(n)-, Küche(n)-), other linking
    // elements, a plural, a dropped -e, an external verb stem.
    async function modifier(s, min) {
      if (dict.blocked(s)) return [];
      const out = [];
      const formsOfWhole = new Set((await readings(s, ['Nomen'])).filter(r => r.form).map(r => norm(r.lemma)));
      for (const link of LINKS) {
        if (!s.endsWith(link)) continue;
        const a = s.slice(0, s.length - link.length);
        if (a.length < Math.min(min, 3) || dict.blocked(a)) continue;
        if (a.length >= min) for (const r of await readings(a, link ? ['Nomen'] : ['Nomen', 'Adjektiv'], true))
          out.push({...r, text: a, link, rank: !link ? (r.source === 'main' ? 0 : r.pos === 'Adjektiv' ? 0.4 : formsOfWhole.size ? 1 : 0.3) : formsOfWhole.has(norm(r.lemma)) ? 0.5 : 2});
        // With -e- an own noun keeps its place (Tag(e)- of Tag, not tagen); otherwise the own verb stem comes early.
        // Without a linking letter an external noun keeps its place (Zauber-, not zaubern); rechen- of rechnen, zeichen-
        // of zeichnen and an -e- stem (les-e-) are verbs.
        if (!link || link === 'e') for (const {v, nen} of stemVerbs(a)) for (const r of await readings(v, ['Verb'], true))
          if (r.source === 'main' ? a.length >= 3 : a.length >= 4) out.push({...r, text: a, link, stem: true,
            rank: r.source !== 'main' ? 3.5 : link ? ((await readings(a, ['Nomen'], true)).some(n => n.source === 'main') ? 2.2 : 0.2) : nen ? 0.2 : 0.35});
        if (!link && a.length >= min) {
          for (const r of (await readings(a, ['Nomen'])).filter(r => r.form && r.number === 'plural')) out.push({...r, text: a, link: '', plural: true, rank: 2.5});
          if (a.length >= 4) for (const r of await readings(a + 'e', ['Nomen'], true)) out.push({...r, text: a, link: '', drop: 'e', rank: 3});
        }
      }
      out.sort((x, y) => x.rank - y.rank || ownFirst(x, y) || (x.pos === 'Nomen' ? 0 : 1) - (y.pos === 'Nomen' ? 0 : 1));
      await withRu(out);
      // An external spelling without a Russian meaning gives way to the same word with a linking -s / -n (Liebling(s)-, not «lieblings»).
      if (out[0] && !out[0].ru && !out[0].link && out[0].source === 'fallback') {
        const linked = out.find(r => r.ru && ['s', 'es', 'n', 'ens', 'ns'].includes(r.link));
        if (linked) return [linked, ...out.filter(r => r !== linked)];
      }
      return out;
    }
    async function head(s, noun, min, neuter = false) {
      if (s.length < min || BAD_HEADS.has(s)) return [];
      if (noun) {
        let rs = (await readings(s, ['Nomen'])).filter(r => !r.gerund);
        // des Wahrsagens: a genitive of a nominalized infinitive, not Sage + -ns.
        if (/ens$/u.test(s) && (await readings(s.slice(0, -1), ['Verb'], true)).length) rs = rs.filter(r => !r.form);
        // Schuppen «shed» or the plural of Schuppe «scale», Rappen «coin» or of Rappe «black horse»: not decided here.
        const exact = rs.filter(r => !r.form), plural = rs.filter(r => r.form && r.number === 'plural');
        if (exact.length && plural.some(p => exact.every(e => norm(e.lemma) !== norm(p.lemma))))
          for (const e of exact) if (e.source === 'main' && e.entry?.plural_only !== true || e.source === 'fallback' && await dict.gender(e.lemma)) return [];
        // A head of two genders (die / der Leiter, die / der Heide, das / die Steuer): its meaning is not decided — no split.
        if (rs[0] !== undefined && rs.every(r => r.source === 'fallback') && await dict.gender(rs.sort((x, y) => (x.form ? 1 : 0) - (y.form ? 1 : 0))[0].lemma) === '?') return [];
        // das Holzhacken, beim Holzhacken, dem Donnergrollen: after a singular das / dem / des an infinitive whose noun
        // reading is only a form (Hacken of Hacke) is a nominalized verb, not this noun (viele Eiskugeln stay).
        if (neuter && rs.length && rs.every(r => r.form) && (await readings(s, ['Verb'], true)).length) return [];
        rs.sort((x, y) => ownFirst(x, y) || y.lemma.length - x.lemma.length || (x.form ? 1 : 0) - (y.form ? 1 : 0));
        return withRu(rs);
      }
      const out = [];
      for (const e of ADJ_END) {
        if (!s.endsWith(e) || s.length - e.length < min) continue;
        const b = s.slice(0, s.length - e.length);
        if (BAD_HEADS.has(b)) continue;
        // A half-suffix has its fixed explanation (-los: без …); another adjective head is an own card (rot, weit, groß):
        // external adjectives are often participles and rare words (betastete is not beta + stet).
        if (HALF.has(b)) { out.push({pos: 'Adjektiv', lemma: b, source: 'main', form: false, text: b, ending: e, half: true, ru: b, en: b}); continue; }
        for (const r of await readings(b, ['Adjektiv'], true)) if (r.source === 'main') out.push({...r, text: b, ending: e});
      }
      out.sort((x, y) => (x.half ? 0 : 1) - (y.half ? 0 : 1));
      return withRu(out);
    }
    const shortOk = parts => parts.every(p => p.text.length >= 4 || p.source === 'main');
    // A first part on -ung, -heit, -keit, -schaft, -tät, -ling takes the linking -s- (G68, 24.10): Aufführung(s) + Orte,
    // not Aufführung + Sorte (not -ion: das Stadion + Sprecher); not before a nominalized verb (das Zeitunglesen).
    // Only a noun that is a derived word (the adjective jung, the noun Sprung are not): a stem of four letters before -ung,
    // of three before the others.
    const linkOk = parts => parts.slice(0, -1).every(p => p.link || p.stem || p.pos !== 'Nomen' ||
      !/^(?:.{4,}ung|.{3,}(?:heit|keit|schaft|tät|ling))$/u.test(norm(p.text)));
    const linkLen = p => p.link.length + (p.drop ? 1 : 0) + (p.plural ? 1 : 0);
    // Several two-part splits: parts with a Russian meaning; a noun or adjective before a verb stem; the fewest linking
    // letters (Gold + Sachen, not Gold(s) + achen); then the longer first part only when the piece between the two
    // boundaries is a word itself (Backstein + Mauer / Back + Steinmauer, Kokosnuss + -artig). Otherwise no split
    // (Stau + Becken / Staub + Ecken, Fisch + Erzeugnisse / Fischer + Zeugnisse).
    async function choose(splits) {
      let s = splits;
      if (s.some(x => x.parts.every(p => p.ru))) s = s.filter(x => x.parts.every(p => p.ru));
      if (s.some(x => !x.parts[0].stem)) s = s.filter(x => !x.parts[0].stem);
      // G68 (user 24.10): two cuts at different places are two ways — no split (Lebensmittel + Punkt / Leben(s) + Mittelpunkt);
      // the fewest linking letters decide only between readings of one cut.
      // A cut into own words only beats a cut with a part only the external dictionary knows (Bad + Straße, not Bad(s) +
      // Trasse); between two cuts into own words (Lebensmittel + Punkt / Leben(s) + Mittelpunkt) nothing decides.
      if (new Set(s.map(x => x.at[0])).size > 1 && s.some(x => x.parts.every(p => p.source === 'main'))) s = s.filter(x => x.parts.every(p => p.source === 'main'));
      const cuts = new Set(s.map(x => x.at[0]));
      if (cuts.size > 1) return null;
      const min = Math.min(...s.map(x => linkLen(x.parts[0])));
      s = s.filter(x => linkLen(x.parts[0]) === min);
      return s.length === 1 ? s[0] : null;
    }
    // A common noun shows itself by what stands before it; a name does not (Herr Seligmann, sagte Kellermann, in Bornheim).
    const commonSign = ctx => !ctx.title && (ctx.det || ctx.adj || ctx.contraction || ctx.prep);
    // G68 (24.10.2026, reference C8f): without such a sign (ctx.bare — see wordFormationContext) a singular noun is a common
    // noun when it is not counted — a substance or an abstract noun stands without an article (können Kiefermuskulatur nicht
    // bewegen, trainiert Gesichtsmuskulatur, auch Sommerregen); a counted singular without an article after a verb is a name
    // (»Ja«, antwortete Weißkopf; sagte Langbein; Ich bin Schafflunder) — the name card (wordFormationCandidate) or none.
    // Not counted: an own card «without a plural» (plural «—» or a plural note: Wasser, Regen, Blut), an abstract suffix
    // (-ung, -heit, -keit, -schaft, -ion, -tät, -ismus, -ur, -ik, -enz, -anz, -tum), a nominalized infinitive (Schneetreiben).
    // (only notes about the word as a whole — «In the sense of …» is one meaning: Witz, Licht, Land are counted)
    const NO_PLURAL_NOTE = /^(?:The plural is rare\.|Usually singular\.|Usually used in the singular\.|The plural is rarely used\.|Usually used without a plural|In its usual sense, it is (?:usually )?used without a plural)/u;
    const uncounted = async h => {
      const e = h.entry;
      if (e && (e.plural === '—' || e.plural === '' || NO_PLURAL_NOTE.test(String(e.plural_note_en || '')))) return true;
      const l = norm(h.lemma);
      // A suffix only on a real stem: -ung of a verb (Planung; not Sprung), -heit / -keit, the longer learned ones (not
      // Schwanz, Tanz, Spur, Post).
      let m;
      if ((m = /^(.{4,})ung$/u.exec(l))) return (await readings(m[1] + 'en', ['Verb'], true)).length > 0 || (await readings(m[1] + 'n', ['Verb'], true)).length > 0;
      if (/^.{3,}(?:heit|keit)$/u.test(l) || /^.{4,}(?:schaft|ion|tät|ismus|atur|ik|enz|tum)$/u.test(l)) return true;
      return /en$/u.test(l) && !h.form && (await readings(l, ['Verb'], true)).length > 0;
    };
    // An adjective first part with a bare head is the pattern of surnames and brands (Kaltwasser, Süßmilch, Graufreiheit).
    const bareOk = async (h, parts, ctx) => !!ctx.bare && !ctx.title && parts[0].pos !== 'Adjektiv' && await uncounted(h);
    function nameOk(h, parts, ctx) {
      // A name (G68, ctx.nameMode): read literally; the place-name / surname heads keep their rule (no split).
      if (ctx.nameMode) return !NAME_HEADS.has(norm(h.lemma)) && h.number !== 'plural';

      if (ctx.title) return false;
      const lemma = norm(h.lemma);
      if (!NAME_HEADS.has(lemma)) return true;
      if (!(ctx.det || ctx.adj)) return false;
      return lemma !== 'mann' || h.number === 'plural' || !!parts.at(-2)?.link;
    }
    const nounOk = async (h, parts, ctx) => nameOk(h, parts, ctx) && (ctx.nameMode || h.number === 'plural' && !ctx.title || commonSign(ctx) || await bareOk(h, parts, ctx));
    const headPart = (h, surface) => ({...h, text: h.ending !== undefined ? h.text : surface, surface});
    async function compound(w, noun, ctx) {
      const splits = [], blocked = [];
      // Old spelling with two consonants for three (Schalloch = Schall + Loch): the head may share the doubled consonant;
      // with an ordinary split as well (Schal + Loch) the word has two splits — no card.
      for (const shared of [false, true]) {
        for (let i = shared ? 4 : 3; i <= w.length - 3; i++) {
          if (shared && !(/[bcdfghklmnprstz]/u.test(w[i - 1]) && w[i - 1] === w[i - 2] && /[aeiouäöü]/u.test(w[i]))) continue;
          const h0 = shared ? i - 1 : i;
          const hs = await head(w.slice(h0), noun, 3, NEUTER_DET.test(ctx.detForm || ''));
          if (!hs.length) continue;
          // An adjective with an ending stands before a noun; one without an ending does not (Zwergenreich Moria is a name).
          if (!noun && (hs[0].ending ? !ctx.nextNoun : ctx.nextCapital)) continue;
          // A verb stem never shares the consonant (Kommandantin is not Komm + Mandantin; the old Schwimmeister is lost).
          const ms = (await modifier(w.slice(0, i), 3)).filter(m => !shared || !m.stem);
          if (!ms.length) continue;
          const parts = [ms[0], headPart(hs[0], w.slice(h0))];
          // das Stühlerücken, das Zeitunglesen: a plural object before an infinitive is a nominalized verb phrase.
          if (noun && ms[0].plural && NEUTER_DET.test(ctx.detForm || '') && (await readings(w.slice(h0), ['Verb'], true)).length) continue;
          // (the exception: a head that is only a verb's infinitive — Lesen, not Stürmen, also a plural of Sturm: Zwilling(s) + Türmen)
          if (shortOk(parts) && (linkOk(parts) || (await readings(w.slice(h0), ['Verb'], true)).length && !(await readings(w.slice(h0), ['Nomen'])).some(r => r.form))) {
            if (!noun || await nounOk(parts[1], parts, ctx)) splits.push({w, at: [h0], parts});
            else blocked.push({w, at: [h0], parts});
          }
        }
      }
      let result = null;
      // G68 (user 24.10): a word that splits into known parts in more than one way is not split — also when the other way is
      // one the context does not allow (Musikerleben: Musik + Erleben / Musiker + Leben, a place-name head).
      if (splits.length) {
        const all = [...splits, ...blocked.filter(b => b.parts.every(p => p.ru) && !splits.some(x => x.at[0] === b.at[0]))];
        const c = await choose(all);
        result = c && splits.includes(c) ? (c.parts.every(p => p.ru) ? c : {noRu: c}) : {ambiguous: all};
      }
      if (result && !result.noRu) return result;
      // Three parts (user 19.10): only when two fail; every part at least 4 letters; exactly one split; nouns only
      // (sozialpsychologisch is not sozial + Psycho + logisch). A two-part split without a Russian meaning keeps its
      // head (Biberfell + Mantel -> Biber + Fell + Mantel), never Leder + Beut + Elchen.
      if (!noun) return result;
      const three = [], keep = result?.noRu ? result.noRu.at[0] : null;
      for (let i = 4; i <= w.length - 8; i++) for (let j = i + 4; j <= w.length - 4; j++) {
        if (keep !== null && j !== keep) continue;
        const hs = await head(w.slice(j), noun, 4, NEUTER_DET.test(ctx.detForm || ''));
        if (!hs.length) continue;
        const m1 = (await modifier(w.slice(0, i), 4)).filter(r => !r.stem && !r.drop);
        if (!m1.length) continue;
        const m2 = (await modifier(w.slice(i, j), 4)).filter(r => !r.stem && !r.drop);
        if (!m2.length) continue;
        const parts = [m1[0], m2[0], headPart(hs[0], w.slice(j))];
        if (linkOk(parts) && await nounOk(parts[2], parts, ctx)) three.push({w, at: [i, j], parts});
      }
      if (three.length === 1) return three[0].parts.every(p => p.ru) ? three[0] : result || {noRu: three[0]};
      if (three.length > 1) return result || {ambiguous: three};
      return result;
    }
    async function verbOf(stem, plain) {
      const out = [];
      if (stem.length < 3 || POSSESSIVE_STEM.test(stem) || plain && PREFIXED.test(stem)) return out;
      for (const v of [stem + 'en', ...(/[lr]$/u.test(stem) ? [stem + 'n'] : []), ...(/[^aeiouäöü][lr]$/u.test(stem) ? [stem.slice(0, -1) + 'e' + stem.slice(-1) + 'n'] : [])])
        for (const r of await readings(v, ['Verb'], true)) out.push({...r, text: v});
      return withRu(out.sort(ownFirst));
    }
    async function nounOf(stem) {
      const out = [];
      if (stem.length < 3 || POSSESSIVE_STEM.test(stem)) return out;
      // häutig <- Haut, poppig <- Pop: without the umlaut, a doubled consonant once.
      const plain = stem.replace(/ä(?!.*[äöü])/u, 'a').replace(/ö(?!.*[äöü])/u, 'o').replace(/ü(?!.*[äöü])/u, 'u');
      const variants = [...new Set([stem, stem + 'e', plain, plain + 'e', ...(/([bdgkpt])\1$/u.test(stem) ? [stem.slice(0, -1)] : [])])];
      for (const n of variants) for (const r of await readings(n, ['Nomen'], true)) out.push({...r, text: n});
      return withRu(out.sort(ownFirst));
    }
    async function adjOf(stem) {
      const out = [];
      if (stem.length < 3) return out;
      for (const a of [stem, stem + 'e']) for (const r of await readings(a, ['Adjektiv'], true)) out.push({...r, text: a});
      return withRu(out.sort(ownFirst));
    }
    // A noun before -ei without a verb (Förster, Keller): Försterei, Kellerei are places — not -erei from Forst, Kelle; no
    // card. With a verb (lernen, spielen) -erei is the activity, also when an agent noun exists (Lerner, Spieler).
    async function tradeNoun(stem) {
      return (await readings(stem + 'er', ['Nomen'], true)).some(r => !/^agent noun of /u.test(r.en || ''));
    }
    // Derivation (reference C6, 18.10 / 19.10): -ung, -heit / -keit / -igkeit, -er, -erei (nouns); un-, -bar, -ig / -lich (adjectives).
    async function derivation(w, noun, ctx) {
      let m;
      if (noun) {
        if (ctx.title) return null;
        const sign = commonSign(ctx);
        if ((m = /^(.{3,})ung(en)?$/u.exec(w)) && (sign || m[2])) { const b = (await verbOf(m[1]))[0]; if (b) return {suffix: 'ung', base: b, gender: 'die', number: m[2] ? 'plural' : null}; }
        if ((m = /^(.{3,})(heit|keit)(en)?$/u.exec(w)) && (sign || m[3])) {
          const b = (await adjOf(m[1]))[0] || (m[2] === 'keit' && /ig$/u.test(m[1]) ? (await adjOf(m[1].slice(0, -2)))[0] : null);
          if (b) return {suffix: m[2], base: b, gender: 'die', number: m[3] ? 'plural' : null};
        }
        if ((m = /^(.{3,})erei(en)?$/u.exec(w)) && (sign || m[2])) {
          const v = (await verbOf(m[1]))[0];
          if (!v && await tradeNoun(m[1])) return null;
          const n = v ? null : (await nounOf(m[1]))[0];
          if (v || n) return {suffix: 'erei', base: v || n, gender: 'die', number: m[2] ? 'plural' : null};
        }
        // -er: only with a determiner (einen lauten Kläffer, den Ausmacher): der / den / dem / des right before it, or another
        // determiner, also before an attribute — «der alte Kramer», «die Kramer kam» are surnames.
        if ((ctx.defDirect && !ctx.dieDirect || ctx.otherDet) && (m = /^(.{3,})er$/u.exec(w))) {
          const b = (await verbOf(m[1]))[0];
          if (b) return {suffix: 'er', base: b, gender: 'der', number: ctx.pluralDet ? 'plural' : null};
        }
        return null;
      }
      for (const e of ADJ_END) {
        if (!w.endsWith(e) || (e ? !ctx.nextNoun : ctx.nextCapital)) continue;
        const s = w.slice(0, w.length - e.length);
        if ((m = /^un(.{4,})$/u.exec(s))) { const b = (await withRu((await readings(m[1], ['Adjektiv'], true)).sort(ownFirst)))[0]; if (b) return {prefix: 'un', base: {...b, text: m[1]}, lemma: s}; }
        if ((m = /^(.{3,})bar$/u.exec(s))) { const b = (await verbOf(m[1]))[0]; if (b) return {suffix: 'bar', base: b, lemma: s}; }
        if ((m = IG_LICH_ADJECTIVE.exec(s))) {
          const n = (await nounOf(m[1]))[0], v = n ? null : (await verbOf(m[1], true))[0];
          if (n || v) return {suffix: m[2], base: n || v, lemma: s};
        }
      }
      return null;
    }
    // An adjective in -lich / -ig from a noun the dictionary knows as a whole (freiherrlich <- Freiherr, hauswirtschaftlich
    // <- Hauswirtschaft) is that derivation, not frei + herrlich; tried before the compound.
    async function nounAdjective(w, ctx) {
      for (const e of ADJ_END) {
        if (!w.endsWith(e) || (e ? !ctx.nextNoun : ctx.nextCapital)) continue;
        const s = w.slice(0, w.length - e.length), m = IG_LICH_ADJECTIVE.exec(s);
        if (!m) continue;
        const n = (await nounOf(m[1]))[0];
        if (n) return {suffix: m[2], base: n, lemma: s};
      }
      return null;
    }
    // The whole analysis: noun-based -ig / -lich, compound, derivation.
    async function analyse(w, noun, ctx) {
      if (ctx.nameMode) {
        const c = await compound(w, true, ctx);
        if (!(c && c.parts && c.parts.length)) return null;
        // A name is read literally only from plain parts: every part with a Russian meaning that is no note (spelling of …,
        // a surname, a place), a counted head that is no person or office (Herr Hauptkommissar, sagte Gruppenleiter: no card).
        const head = c.parts.at(-1), plain = p => p.ru && !/Шаблон:|^:/u.test(p.ru) && !/\b(?:spelling|form) of\b|\b(?:surname|given name|placename|place name|toponym|city|town|village|river)\b/iu.test(p.en || '');
        if (!c.parts.every(plain) || await uncounted(head) || /(?:er|in|ent|ant|ist|or|eur|ar)$/u.test(norm(head.lemma))) return null;
        return {compound: c};
      }
      if (!noun) { const d = await nounAdjective(w, ctx); if (d) return {derivation: d}; }
      const c = await compound(w, noun, ctx);
      if (c && c.parts) return {compound: c};
      const d = await derivation(w, noun, ctx);
      // Several splits (G68): no card, and not a name either (the caller stops).
      return d ? {derivation: d} : c && c.ambiguous ? {ambiguous: true} : null;
    }
    return {analyse, HALF};
  }
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
    // S2 (17.10.2026): a stem known only from derived particle + verb entries (bewohnten →
    // mitbewohnen) does not make a word a possible verb outside the separable scanner.
    const lexicalSeparated = key => (separatedForms.get(key) || []).some(pair => !pair.entry.derivedSeparable);
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
    // (reflexive review 24.10.2026, user: the old spelling — muß, mußte, müßte, wußte, laßt, gewußt — is the same verb form:
    // ss at the end of a word or before a consonant was ß before 1996. Grimm and Kafka are printed in it; without these
    // keys an infinitive did not see its modal: Sie mußte sich bücken — a window on bücken, sich without a link.)
    const oldSpelling = key => key.replace(/ss(?=$|[^aeiouyäöü])/gu, "ß");
    // The card lookup keeps its own route for old spellings (alternative-form notes → the modern card); the verb chain
    // reads a verb form in the old spelling through this map (mußte … gehen; mußte sich … bücken).
    let oldVerbFormsCache = null;
    const oldVerbForms = {get(key) {
      if (!oldVerbFormsCache) {
        oldVerbFormsCache = new Map();
        for (const [k,rows] of verbAnalyses) { const o = oldSpelling(k);
          if (o === k || forms.has(o) || rows.some(r => r.kind === 'participle')) continue; // (wir mißverstanden = the participle too)
          for (const r of rows) if (['finite','imperative'].includes(r.kind) && r.entry && (forms.get(k) || []).includes(r.entry)) {
            const list = oldVerbFormsCache.get(o) || []; if (!list.includes(r.entry)) list.push(r.entry); oldVerbFormsCache.set(o,list); } }
      }
      return oldVerbFormsCache.get(key);
    }};
    // (only finite forms and imperatives take the old-spelling key: a participle in the old spelling — mißverstanden,
    // gewußt — keeps its own route; its checks compare the written form)
    function addAnalysis(form, row) {
      for (const key of new Set([norm(form), ...(['finite','imperative'].includes(row.kind) ? [oldSpelling(norm(form))] : [])])) {
        const rows = verbAnalyses.get(key) || [];
        if (!rows.some(r => r.entry === row.entry && r.kind === row.kind && r.person === row.person && r.tense === row.tense && r.detached === row.detached)) rows.push(row);
        verbAnalyses.set(key, rows);
      }
    }
    function indexVerb(entry) {
      const base = norm(entry.word).replace(/^sich\s+/u,""), phrase = base.split(/\s+/u);
      const common = {entry,base,compound:phrase.length > 1 ? phrase.slice(0,-1) : []};
      const table = formsOf(entry);
      let prefix = entry.separable_prefix || null;
      for (const [tense,group] of Object.entries(table)) for (const [person,value] of Object.entries(group || {})) {
        const parts = norm(value).replace(/[.!?]+$/u,"").split(/\s+/u), stem = parts[0];
        if (!/^[\p{L}\p{M}]+$/u.test(stem)) continue;
        let tail = parts.at(-1);
        let detached = parts.length > 1 && !reflexivePronouns.has(tail) && tail !== "sie" && phrase.length === 1 && base.startsWith(tail);
        // C15 (17.10.2026): two detached particles (macht wieder gut, stellt wieder her) — the joined rest equals
        // separable_prefix; before, mach / stellt were indexed as plain forms of wiedergutmachen / wiederherstellen.
        const rest = parts.slice(1).filter(p => !reflexivePronouns.has(p) && p !== "sie").join("");
        if (!detached && entry.separable_prefix && parts.length > 2 && phrase.length === 1 && rest === norm(entry.separable_prefix) && base.startsWith(rest)) { detached = true; tail = rest; }
        if (detached) prefix = tail;
        const row = {...common,person:person === "Sie" ? "sie" : personOf(person),kind:tense === "Imperativ" ? "imperative" : "finite",tense,prefix:detached ? tail : null,detached};
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
      for (const key of new Set([norm(form), ...(['Infinitiv','Partizip II'].includes(row.tense) ? [] : [oldSpelling(norm(form))])])) {
        const rows = reflexiveForms.get(key) || [];
        // (an old-spelling key is for the verb chain only, not a reflexive card offered at the tap without sich in
        // the sentence — Laß mich hinein! stays lassen, not a choice with sich lassen; reviewer 24.10)
        if (!rows.some(r => r.entry === row.entry && r.person === row.person && r.pronoun === row.pronoun && r.tense === row.tense)) rows.push(key === norm(form) ? row : {...row,oldSpelling:true});
        reflexiveForms.set(key,rows);
      }
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
        if (!INVARIANT_ADJECTIVES.has(word)) {
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
              const row = {entry,tense,person:personOf(person),pronoun,simple:parts.length === 2};
              // C14 (17.10.2026): macht sich bereit — the bare stem needs the detached particle;
              // without it (Er macht das Essen) the card is not an unconfirmed candidate of macht.
              const base0 = norm(entry.word).replace(/^sich\s+/u, "");
              // also «Sehen Sie sich um!» (C14 open question: sehen ≠ sich umsehen)
              if (parts.length >= 3 && parts.at(-1) !== pronoun && base0.startsWith(parts.at(-1)) && base0 !== parts.at(-1) && !base0.includes(" ")) row.particle = parts.at(-1);
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
              for (const key of new Set([stem, oldSpelling(stem)])) {
                const pairs = separatedForms.get(key) || [];
                if (!pairs.some(pair => pair.entry.id === entry.id && pair.prefix === prefix)) pairs.push({entry,prefix});
                separatedForms.set(key,pairs);
              }
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
        if (REGULAR_INFINITIVE_SHAPE.test(infinitive) || ["sein","tun"].includes(infinitive))
          addModifier(({sein:"seiend",tun:"tuend"})[infinitive] || infinitive+"d",entry,"participle-I");
      }
    }
    const mainCandidate = item => item.importedSeparable ? {
      source:"fallback",lemma:item.word,pos:"verb",posLabel:"Verb",meanings:item.meanings,
      translation:{en:item.meanings.join("; "),ru:""}
    } : ({ source:"main", dictionaryId:item.id, lemma:item.word, pos:item.type, posLabel:item.parts_of_speech?.join(" / ") || item.type, translation:{en:item.translation_en || "",ru:item.translation_ru || ""}, item,
      ...(reflexiveEntries.has(item) ? {reflexiveLexical:{baseLemma:norm(item.word).replace(/^sich\s+/u,""),evidence:"dictionary-reflexive-lemma"}} : {}) });
    // C21 (18.10.2026): numerals are a closed, fully regular grammar. A clicked cardinal or
    // ordinal without an own card (fünfzig, siebenhundertunddreizehn, vierten, zwanzigsten,
    // zum drittenmal) gets a generated numeral entry for this word only; its meaning is the
    // value in figures (user decision 18.10.2026). Own cards (drei, erste, Hunderte) come first.
    const numeralGrammar = (() => {
      const units = {ein:1,zwei:2,drei:3,vier:4,fünf:5,sechs:6,sieben:7,acht:8,neun:9};
      const teens = {zehn:10,elf:11,zwölf:12,dreizehn:13,vierzehn:14,fünfzehn:15,sechzehn:16,siebzehn:17,siebenzehn:17,achtzehn:18,neunzehn:19};
      const tens = {zwanzig:20,dreißig:30,dreissig:30,vierzig:40,fünfzig:50,sechzig:60,siebzig:70,siebenzig:70,achtzig:80,neunzig:90};
      const ordinalStems = Object.entries({erst:1,zweit:2,dritt:3,viert:4,fünft:5,sechst:6,siebt:7,siebent:7,acht:8,neunt:9,
        ...Object.fromEntries(Object.entries(teens).map(([w,v]) => [w+"t",v]))}).sort((a,b) => b[0].length - a[0].length);
      const tensRe = new RegExp(`^(${Object.keys(units).join("|")})und(${Object.keys(tens).join("|")})$`,"u");
      const below100 = w => w === "eins" ? 1 : w in teens ? teens[w] : w in tens ? tens[w] : w !== "ein" && w in units ? units[w] :
        (m => m ? units[m[1]] + tens[m[2]] : null)(tensRe.exec(w));
      const rest = w => w === "" ? 0 : below100(w.replace(/^und(?=.)/u,""));
      const below1000 = w => {
        const i = w.indexOf("hundert");
        if (i < 0) return below100(w);
        const head = w.slice(0,i), h = head === "" ? 1 : units[head], r = rest(w.slice(i+7));
        return h && r !== null ? h*100 + r : null;
      };
      const cardinal = w => {
        const i = w.indexOf("tausend");
        if (i < 0) return below1000(w);
        const head = w.slice(0,i), t = head === "" || head === "ein" ? 1 : below1000(head), r = w.slice(i+7) === "" ? 0 : below1000(w.slice(i+7).replace(/^und(?=.)/u,""));
        return t && r !== null ? t*1000 + r : null;
      };
      // vierte, hundertdritte, zwanzigste, hundertfünfundzwanzigste: the last part below 20 takes
      // -t (erst, zweit, dritt, siebt / siebent, acht), everything else the cardinal + -st.
      const ordinal = stem => {
        for (const [small,value] of ordinalStems) if (stem.endsWith(small)) {
          const prefix = stem.slice(0,-small.length).replace(/und$/u,"");
          if (prefix === "") return value;
          if (/(?:hundert|tausend)$/u.test(prefix)) { const base = cardinal(prefix); if (base) return base + value; }
        }
        if (!stem.endsWith("st")) return null;
        const base = stem.slice(0,-2);
        return /(?:zig|ßig|ssig|hundert|tausend)$/u.test(base) ? cardinal(base) : null;
      };
      return word => {
        const w = norm(word);
        if (!/^[a-zäöüß]+$/u.test(w) || w === "ein") return null;
        const value = cardinal(w);
        if (value !== null && value > 0) return {kind:"cardinal",value,lemma:w};
        let m = /^(.+t)(?:en|e)mal$/u.exec(w);
        if (m) { const v = ordinal(m[1]); if (v) return {kind:"ordinal-mal",value:v,lemma:w}; }
        m = /^(.+t)(?:e|en|er|es|em)$/u.exec(w);
        if (m) { const v = ordinal(m[1]); if (v) return {kind:"ordinal",value:v,lemma:m[1]+"e"}; }
        return null;
      };
    })();
    const numeralNoteCard = (kind, lemma) => {
      const words = kind !== "cardinal" ? ["erste"] : [...(lemma.includes("tausend") ? ["tausend"] : []),...(lemma.includes("hundert") ? ["hundert"] : []),
        ...(lemma.includes("und") ? ["zwanzig"] : [])];
      for (const w of words) { const card = (lemmas.get(w) || []).find(e => e.type === "numeral"); if (card) return card; }
      return null;
    };
    const numeralDeterminers = new Set(["der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines","am","im","zum","zur","vom","beim","ins","ans",
      "mein","meine","meinen","meinem","meiner","meines","dein","deine","deinen","deinem","deiner","sein","seine","seinen","seinem","seiner","seines",
      "ihr","ihre","ihren","ihrem","ihrer","ihres","unser","unsere","unseren","unserem","unserer","euer","eure","euren","eurem","eurer",
      "dieser","diese","diesen","diesem","dieses","jeder","jede","jeden","jedem","jedes","als"]);
    // A generated ordinal needs its frame: a determiner / possessive / als / a name in -s before it
    // (der vierte, Harrys elfter) or a noun after it (vierunddreißigster Band). Without it the
    // spelling is something else (Low German achter «behind», old cardinal achte «eight»).
    function ordinalFrame(word, context) {
      const sentence = String(context?.sentence || ""), offset = context?.tokenOffset;
      if (!Number.isInteger(offset)) return true;
      const tokens = [...sentence.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu)];
      const index = tokens.findIndex(t => t.index === offset);
      if (index < 0) return false;
      const close = (a,b) => /^\s*$/u.test(sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index));
      const previous = index > 0 && close(index-1,index) ? tokens[index-1][0] : "";
      if (numeralDeterminers.has(norm(previous)) || /^\p{Lu}\p{Ll}+s$/u.test(previous)) return true;
      return index + 1 < tokens.length && close(index,index+1) && /^\p{Lu}/u.test(tokens[index+1][0]);
    }
    const englishOrdinal = v => v + (v % 100 >= 11 && v % 100 <= 13 ? "th" : ({1:"st",2:"nd",3:"rd"})[v % 10] || "th");
    const generatedNumerals = new Map();
    function numeralEntry(word) {
      const parsed = numeralGrammar(word);
      if (!parsed) return null;
      const id = `numeral-generated:${parsed.kind}:${parsed.lemma}`;
      if (generatedNumerals.has(id)) return generatedNumerals.get(id);
      const {kind,value,lemma} = parsed, note = numeralNoteCard(kind,lemma);
      const translation = kind === "cardinal" ? {ru:String(value),en:String(value)} :
        kind === "ordinal" ? {ru:`${value}-й`,en:englishOrdinal(value)} :
        value === 1 ? {ru:"впервые (в 1-й раз)",en:"for the first time"} : {ru:`в ${value}-й раз`,en:`for the ${englishOrdinal(value)} time`};
      const entry = Object.freeze({id,type:"numeral",word:lemma,translation_ru:translation.ru,translation_en:translation.en,forms:null,
        grammar:Object.freeze({numeral_kind:kind === "cardinal" ? "cardinal" : "ordinal",value,generated:true}),
        ...(kind === "ordinal-mal" ? {usage_note_ru:`Старое написание: zum ${lemma.replace(/e?n?mal$/u,"en")} Mal.`,usage_note_en:`Old spelling of zum ${lemma.replace(/e?n?mal$/u,"en")} Mal.`} :
          note ? {usage_note_ru:note.usage_note_ru,usage_note_en:note.usage_note_en} : {}),
        search_forms:Object.freeze([norm(word)]),wortschatz_excluded:true});
      generatedNumerals.set(id,entry);
      return entry;
    }
    const grammaticalWords = new Set(['ich','du','er','sie','es','wir','ihr','man','wer','mich','mir','dich','dir','sich','uns','euch','der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','zu','und','oder','aber','denn','sondern','doch','weil','dass','daß','wenn','ob','als','bevor','nachdem']);
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
    // KF1 (25.10.2026): a lower-case form of our own haben / sein card (hat, ist, waren, wäre …) is explained by that
    // card alone (resolveInternal shows only it and drops external groups of these verbs), so no rule asks the
    // external dictionary for it: no request, no parse of the haben / sein part (haben: ~350 KB). Capitalised
    // spellings still ask (Waren «goods», Wart, Habe — nouns inside a sentence; resolveInternal's internalCapital).
    // The base of an ending hypothesis of another word (gewesene → gewesen, gehabte → gehabt) is still read: those
    // rows belong to the other word, so its facts stay as they were (review 25.10).
    function ownAuxiliarySpelling(spelling) {
      return /^\p{Ll}/u.test(spelling) && (forms.get(norm(spelling)) || []).some(e => e.type === "Verb" && ownOnlyVerbs.has(norm(e.word)));
    }
    function sourceLookup(word, consumer, priority) {
      syncSourceVersion();
      const spelling = sourceSpelling(word), key = JSON.stringify([sourceVersion(),'lookup',spelling]), activation=sourceActivation;
      if (consumer !== 'morphologyHypothesis' && ownAuxiliarySpelling(spelling)) {
        const groups = freezeFacts([]);
        groupSourceStates.set(groups,freezeFacts({source:'fallback',operation:'lookup',form:spelling,version:JSON.parse(key)[0],
          state:'not-requested',reason:'own-auxiliary',issues:[]}));
        observe('fact-source-state',{key,state:'not-requested',reason:'own-auxiliary',consumer});
        return Promise.resolve(groups);
      }
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
      const read = async (form, consumer = 'collectMorphology') => {
        const version=sourceVersion();
        try {
          const groups = await lexicalLookup(form,consumer);
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
          translation:{en:group.meanings.join('; '),ru:''},...(group.labels ? {meaningLabels:{en:group.labels}} : {})}];
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
      // KF1: no ending hypotheses for a form of our own haben / sein card (hatte → hatt, wäre → wär, waren → ware).
      if (discoverModifiers && external && /^[\p{L}\p{M}]+$/u.test(key) && !ownAuxiliarySpelling(sourceSpelling(word))) {
        // Productive place-name -er modifiers may lack an adjective export.
        // Require both the named place and an explicit inhabitant sense; an
        // arbitrary capitalised noun ending in -er is insufficient.
        if(/er$/u.test(key)&&lexical.some(g=>canonicalPos(g.pos)==='Nomen'&&
          g.meanings.some(m=>/\b(?:inhabitant|native|person from)\b/iu.test(m)))){
          const stem=key.slice(0,-2),place=await read(stem.charAt(0).toUpperCase()+stem.slice(1));
          const location=place.find(g=>!g.kind&&!g.unresolved&&g.pos==='name'&&norm(g.word)===stem&&
            g.meanings?.some(m=>/\b(?:city|town|capital|municipality|district)\b/iu.test(m)));
          if(location&&lexical.some(g=>g.meanings.some(m=>norm(m).includes(stem)))){
            const name=stem.charAt(0).toUpperCase()+stem.slice(1);
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
          const discovered = await read(base,'morphologyHypothesis');
          for (const group of discovered.filter(g => !g.kind && !g.unresolved && g.meanings?.length &&
            canonicalPos(g.pos) === 'Adjektiv' && norm(g.word) === base)) {
            // Keep the same invariant-adjective policy as the own index.
            if (INVARIANT_ADJECTIVES.has(base)) continue;
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
          translation:{en:g.meanings.join('; '),ru:''},...(g.labels ? {meaningLabels:{en:g.labels}} : {}),reflexiveLexical:{baseLemma:base,evidence:/^sich\s+/u.test(norm(g.word))?'dictionary-reflexive-lemma':'base-verb-only'}};
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
          if (REGULAR_INFINITIVE_SHAPE.test(base)) for (const person of ['wir','sie']) result.push({...common,kind:'finite',person,tense:'Präsens',detached:false});
        }
      }
      return result;
    }
    const subjectPersons = {ich:['ich'],du:['du'],er:['er/sie/es'],sie:['er/sie/es','sie'],es:['er/sie/es'],wir:['wir'],ihr:['ihr'],man:['er/sie/es'],wer:['er/sie/es'],was:['er/sie/es']};
    const pronounPersons = {mich:'ich',mir:'ich',dich:'du',dir:'du',sich:'third',uns:'wir',euch:'ihr'};
    const determiners = /^(?:der|die|das|ein|eine|kein|keine|mein(?:e)?|dein(?:e)?|sein(?:e)?|ihr(?:e)?|unser(?:e)?|euer(?:e)?|eure|viele|beide|alle|einige|mehrere|etliche|diese|dieser|dieses|dessen|deren)$/u;
    // Step 7: shared sentence facts for relation producers. Verb morphology per
    // token with established nominal roles masked, the clause partition
    // (relations, apposition insertions, relative clauses) and detached forms
    // proven by a clause-final prefix. Consumers keep their own decisions.
    async function sentenceVerbAnalyses(sentence,tokens,words,consumer) {
      const analyses = await Promise.all(tokens.map(t=>tokenAnalyses(t[0], undefined, consumer)));
      // Morphological homographs such as meine/meinen and Buch/Arbeit must
      // remain determiners/nouns inside an identifiable noun phrase.
      for(let i=0;i<tokens.length;i++) {
        if (/^(?:mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u.test(words[i]) &&
          tokens.slice(i+1,i+4).some(t=>t[0][0]!==norm(t[0])[0]&&(forms.get(norm(t[0]))||[]).some(e=>e.type==='Nomen')))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]&&(forms.get(words[i])||[]).some(e=>e.type==='Nomen')&&
          i>0&&(determiners.test(words[i-1])||prepositions.has(words[i-1])))analyses[i]=[];
        if(tokens[i][0][0]!==words[i][0]) {
          let d=i-1;
          while(d>=0&&i-d<=3&&!ARTICLE_OR_POSSESSIVE_WORD.test(words[d])&&/[\p{L}\p{M}]+(?:e|en|em|er|es)$/u.test(words[d]))d--;
          const nominal=(forms.get(words[i])||[]).some(e=>e.type==='Nomen') || prepositions.has(words[d]) ||
            ARTICLE_OR_POSSESSIVE_WORD.test(words[d]);
          if(nominal&&d>=0&&i-d<=3&&(ARTICLE_OR_POSSESSIVE_WORD.test(words[d])||prepositions.has(words[d]))) {analyses[i]=[];if(!prepositions.has(words[d]))analyses[d]=[];for(let j=d+1;j<i;j++)analyses[j]=[];}
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
      const subordinators = new Set(['weil','dass','daß','wenn','ob','als','bevor','nachdem','obwohl','während','sobald','damit','bis']);
      const coordinators = new Set(['und','oder','aber','denn','sondern']);
      // S1: wie right after a detached particle of a verb of the clause starts the
      // comparison, so the particle closes the clause (hörte sich an wie Flügel).
      const comparisonAfterParticle=(i,from)=>words[i]==='wie'&&i>1&&!/[,;:.!?…“”„"«»()–—]/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index))&&
        !WIE_QUESTION_WORD.test(words[i+1]||'')&&
        words.slice(from,i-1).some(w=>(separatedForms.get(w)||[]).some(pair=>pair.prefix===words[i-1]));
      const clauses = [];let start = 0, relation = 'root';
      for (let i=1;i<tokens.length;i++) {
        // G15 (19.10.2026): a comma, point or colon inside a number (13,5; 26.600; 6:4) is no clause boundary.
        // A list of numbers (6:4, 5:7, 6:3) is one nominal element too.
        const gap = clauseGapText(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index).replace(/\d+(?:[.,:]\d+)*(?:\s*,\s*\d+(?:[.,:]\d+)*)+/gu,'0'));
        const nextBoundary=tokens.findIndex((t,j)=>j>i&&(/[,;:.!?…]/u.test(sentence.slice(tokens[j-1].index+tokens[j-1][0].length,t.index))||subordinators.has(words[j])||coordinators.has(words[j])));
        const leftFinite=analyses.slice(start,i).some(rows=>rows.some(a=>a.kind==='finite'));
        const rightFinite=analyses.slice(i+1,nextBoundary<0?tokens.length:nextBoundary).some(rows=>rows.some(a=>a.kind==='finite'));
        // L52 (links chat, 24.10.2026): und / oder with no verb form at all before it in the clause and the finite verb after
        // it join parts of one clause (die sich für Menschenrechte und gegen Zensur einsetzt), not two clauses.
        const leftVerbal=analyses.slice(start,i).some(rows=>rows.some(a=>['finite','infinitive','participle','imperative'].includes(a.kind)));
        // (review 24.10: not when the part before it may hold a verb no dictionary knows (
        // Die Schlange entrollte sich im Nu und schlängelte sich heraus)
        // Die Schlange entrollte sich im Nu und schlängelte sich heraus): a small word that no dictionary knows may be that verb,
        // and two reflexive pronouns would fall into one clause)
        const reflexiveIn=(a,b)=>words.slice(a,b).some((w,k)=>reflexivePronouns.has(w)&&!(a+k>0&&prepositions.has(words[a+k-1])));
        const unknownSmall=tokens.slice(start,i).some((t,k)=>/^\p{Ll}+$/u.test(t[0])&&!forms.has(words[start+k])&&!lemmas.has(words[start+k])&&!analyses[start+k].length);
        const partsJoin=COORDINATORS_WITHOUT_COMMA.includes(words[i])&&!/[,;:.!?…“”„"«»()–—]/u.test(gap)&&i>start&&!leftVerbal&&rightFinite&&!unknownSmall&&
          !(reflexiveIn(start,i)&&reflexiveIn(i+1,nextBoundary<0?tokens.length:nextBoundary));
        const nominalCoord=words[i]==='und'&&!/[,;:.!?]/u.test(gap)&&(!leftFinite||!rightFinite)&&
          (tokens[i-1][0][0]!==words[i-1][0]||subjectPersons[words[i-1]])&&
          (tokens[i+1]?.[0][0]!==words[i+1]?.[0]||subjectPersons[words[i+1]])||partsJoin;
        // S1 (17.10.2026): damit without a punctuation mark before it is the pronominal
        // adverb (mühte sich damit ab, stopfte die Löcher damit zu), not the conjunction.
        const adverbialDamit=words[i]==='damit'&&!/[,;:.!?…“”„"«»()–—]/u.test(gap);
        // S1: aber without a comma and without a finite verb after it is the adverb
        // (sprachen sich aber für … aus).
        const adverbialAber=words[i]==='aber'&&!/[,;:.!?…“”„"«»()–—]/u.test(gap)&&leftFinite&&!rightFinite;
        // S1: als (and und / oder, see below) without a comma, after a finite verb and with no
        // finite verb and no subject pronoun up to the next boundary, joins nominal or adverbial
        // parts of one clause (stellte sich als Witz heraus, nahm sich einen Strick und eine Axt mit).
        // und / oder join only when the part after them closes with a detached particle of a
        // verb before them (taten sich als eine Hecke zusammen, schaute sich rechts und links um).
        const rightEnd=(nextBoundary<0?tokens.length:nextBoundary)-1;
        // The word after und / oder must be nominal or a modifier, not a possible verb (und ruhete sich … aus).
        const nominalAfter=k=>tokens[k]&&(tokens[k][0][0]!==words[k][0]||determiners.test(words[k])||prepositions.has(words[k])||
          (forms.get(words[k])||[]).some(e=>['Adjektiv','Adverb'].includes(e.type))&&!(forms.get(words[k])||[]).some(e=>e.type==='Verb'))&&
          !analyses[k]?.some(a=>['finite','infinitive','participle','imperative'].includes(a.kind));
        const closingParticle=rightEnd>i&&nominalAfter(i+1)&&words.slice(start,i).some(w=>(separatedForms.get(w)||[]).some(pair=>pair.prefix===words[rightEnd]));
        const nominalJoin=(words[i]==='als'&&words[i+1]!=='auch'&&!words.slice(start,i).includes('sowohl')||COORDINATORS_WITHOUT_COMMA.includes(words[i])&&closingParticle)&&!/[,;:.!?…“”„"«»()–—]/u.test(gap)&&leftFinite&&!rightFinite&&
          !words.slice(i+1,rightEnd+1).some(w=>subjectPersons[w]);
        if (/[,;:.!?…“”„"«»()–—]/u.test(gap) || subordinators.has(words[i])&&!adverbialDamit&&!nominalJoin || coordinators.has(words[i])&&!nominalCoord&&!adverbialAber&&!nominalJoin ||
          comparisonAfterParticle(i,start)) {
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
      const {tokens,words,analyses,clauses,sentence}=facts;
      // To-do 19.10 (2.2, R-kafka-11): um / ohne / (an)statt before a reflexive pronoun open an infinitive clause
      // (statt dich ordentlich zu stärken, ohne sich umzusehen) when zu follows in the same comma segment; they are
      // not a preposition governing the pronoun there (um sich blicken, ohne mich stay prepositions).
      const zuOpener = i=>ZU_INFINITIVE_OPENERS.includes(words[i-1])&&reflexivePronouns.has(words[i])&&
        words.some((w,j)=>j>i&&j<=i+8&&(w==='zu'||/^\p{Ll}+zu\p{Ll}+en$/u.test(w)&&j>i+0)&&!/[,;:.!?]/u.test(String(sentence||'').slice(tokens[i].index,tokens[j].index)));
      const beforePrep = i=>i>0&&prepositions.has(words[i-1])&&!zuOpener(i);
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
          // L52 (links chat, 24.10.2026): an und with no subject on one of its sides joins other parts of the clause
          // (die sich für Menschenrechte und gegen Zensur einsetzt): the clause is searched as a whole, not given up.
          if(l.length&&r.length)return [];
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
        if(clause.relative&&DER_PRONOUNS.includes(words[clause.start])&&
          (person==='er/sie/es'||person==='sie'&&words[clause.start]==='die'))return [{index:clause.start,person}];
        if(!THIRD_PERSONS.includes(person)){
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
        // Step P2 (17.10.2026): a demonstrative / indefinite pronoun that opens a main clause
        // directly before the finite verb is its subject when no noun subject is found
        // (Das lohnt sich, Dies hat sich gelohnt, Alles freut sich). A following noun
        // (Das Kind) is an article phrase and handled above.
        if(!found.length&&person==='er/sie/es'&&!clause.relative){
          const s0=clause.start+(['und','aber','oder','denn','doch'].includes(words[clause.start])?1:0);
          if(s0<clause.end&&['das','dies','dieses','alles','nichts','etwas','jenes'].includes(words[s0])&&
            !clause.insertions?.some(r=>s0>=r.start&&s0<=r.end)&&
            analyses[s0+1]?.some(a=>a.kind==='finite'&&a.person==='er/sie/es'))found.push({index:s0,person});
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
        const h=helpers.filter(h=>PERFECT_AUXILIARIES.includes(h.analysis.base)&&(!auxiliary||h.analysis.base===auxiliary));
        // L52 (links chat, 24.10.2026): a perfect infinitive under a finite modal / werden (muss sich verlaufen haben,
        // würde sich gelegt haben, müssen uns gekreuzt haben) — the infinitive haben / sein right after the participle.
        // (haben there is the infinitive, not a second finite haben: the finite verb of the clause is the modal / werden)
        const top=helpers.filter(x=>x.index!==v+1&&(modalLemmas.has(x.analysis.base)||x.analysis.base==='werden'));
        if(top.length===1&&v+1<=clause.end&&PERFECT_AUXILIARIES.includes(words[v+1])&&analyses[v+1].some(r=>r.kind==='infinitive'&&r.base===words[v+1])&&(!auxiliary||auxiliary===words[v+1])) {
          controller=top[0].index;control=top[0].analysis;componentIndices.push(v+1,controller);
          tense=control.base==='werden'?(control.tense==='Konjunktiv II'?'Konjunktiv II':'Futur II'):control.tense;
          return {controller,control,subjectClause,tense,zuIndex,nonLexical:[v+1]};
        }
        if(h.length!==1)return null;controller=h[0].index;control=h[0].analysis;
        // L13: hätte / wäre + participle keeps Konjunktiv II (hätte mich geirrt).
        tense=control.tense==='Präteritum'?'Plusquamperfekt':control.tense==='Konjunktiv II'?'Konjunktiv II':'Perfekt';componentIndices.push(controller);
      } else if(a.kind==='infinitive') {
        const marker=a.zu||words[v-1]==='zu'||zuForms.has(words[v])&&(zuForms.get(words[v])||[]).some(e=>norm(e.word).replace(/^sich\s+/u,'')===a.base);
        // L52 (user 24.10): an infinitive right before a modal infinitive under a finite haben (hat sich nicht waschen wollen,
        // hab mich nicht entscheiden können, dass sie sich nicht hat konzentrieren können, hätte sich beeilen müssen — the
        // substitute infinitive) is controlled by haben; the modal infinitive is not a finite modal (sie wollen) there.
        // lassen is not included (sich waschen lassen is another meaning, a later step).
        const substitute=!marker&&v+1<=clause.end&&modalLemmas.has(words[v+1])&&analyses[v+1].some(r=>r.kind==='infinitive')?helpers.filter(h=>h.index!==v+1&&h.analysis.base==='haben'):[];
        if(substitute.length===1){controller=substitute[0].index;control=substitute[0].analysis;componentIndices.push(v+1,controller);
          tense=control.tense==='Konjunktiv II'?'Konjunktiv II':control.tense==='Präteritum'?'Plusquamperfekt':'Perfekt';return {controller,control,subjectClause,tense,zuIndex,nonLexical:[v+1]};}
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
          // L52: one host word read as several verbs (habe — haben, anhaben, vorhaben …): the auxiliary / modal reading.
          if(host.length>1&&new Set(host.map(h=>h.index)).size===1){const aux=host.filter(h=>TENSE_AUXILIARIES.includes(h.analysis.base)||modalLemmas.has(h.analysis.base));if(aux.length===1)host=aux;}
          if(host.length!==1)return null;controller=host[0].index;control=host[0].analysis;tense='zu-Infinitiv';
          if(words[v-1]==='zu')zuIndex=v-1;
        } else return null;
      } else if(a.kind!=='finite'&&a.kind!=='imperative')return null;
      return {controller,control,subjectClause,tense,zuIndex};
    }
    async function analyseReflexiveSentence(sentence,diagnostic=null) {
      const clauseHasSich=clause=>{for(let p=clause.start;p<=clause.end;p++)if(norm(sharedTokens(sentence,'analyseReflexiveSentence')[p][0])==='sich')return true;return false;};
      const tokens = sharedTokens(sentence,'analyseReflexiveSentence'), words = tokens.map(t=>norm(t[0]));
      if (!words.some(w=>reflexivePronouns.has(w))) return [];
      const facts = await sentenceClauseFacts(sentence,tokens,words,'analyseReflexiveSentence');
      const {analyses,clauses} = facts;
      if(diagnostic){diagnostic.tokens=tokens.map((t,i)=>({text:t[0],start:t.index,analyses:analyses[i].map(a=>({base:a.base,kind:a.kind,person:a.person,tense:a.tense}))}));diagnostic.clauses=clauses;diagnostic.attempts=[];}
      const subjectFacts = clauseSubjectFacts(facts), {beforePrep,subjects,subjectFor} = subjectFacts;
      // L52 (user 24.10.2026): a zu-infinitive by its form — zu + infinitive, or -zu- inside a small word (zurückzukehren,
      // anzurufen); a capital word (Anzug, Umzug) and zu before a noun / adjective (zu Hause, zu schnell) are not one.
      // (zu müssen / zu haben / zu sein / zu werden / zu lassen close the verb's own group — angucken zu müssen —, they open no other one)
      const groupHelper=b=>modalLemmas.has(b)||GROUP_HELPER_VERBS.includes(b);
      const zuInfinitiveAt=(clause,v)=>{for(let i=v+1;i<=clause.end;i++)if(/^\p{Ll}/u.test(tokens[i][0])&&analyses[i].some(r=>r.kind==='infinitive'&&(r.zu||words[i-1]==='zu')&&!groupHelper(r.base)))return i;return -1;};
      const zuBaseAt=z=>(analyses[z].find(r=>r.kind==='infinitive'&&(r.zu||words[z-1]==='zu')&&!groupHelper(r.base))||{}).base;
      // The cards of a verb at a token: a reflexive one (own sich card or an external «sich …» record) and a plain one.
      // (review 24.10: an external record whose Russian meanings are «sich ~ …» — schämen «sich ~ стыдиться» — is a reflexive card;
      // its plain record without such a meaning is no plain card)
      const cardKinds=async(i,base)=>{
        const rows=analyses[i].filter(r=>r.base===base);
        let reflexive=(reflexiveLemmas.get(base)||[]).length>0||rows.some(r=>r.entry&&reflexiveEntries.has(r.entry)||/^sich\s/u.test(norm(r.candidate?.lemma||'')));
        const own=rows.some(r=>r.entry&&!reflexiveEntries.has(r.entry));
        let plain=own||rows.some(r=>r.candidate&&!/^sich\s/u.test(norm(r.candidate.lemma||'')));
        if(!own&&rows.some(r=>r.candidate&&!/^sich\s/u.test(norm(r.candidate.lemma||'')))&&typeof window!=='undefined'&&window.BibliothekRussianTranslations?.lookup){
          let ru=null;try{ru=await window.BibliothekRussianTranslations.lookup(base,'verb');}catch(_){ru=null;}
          const meanings=(ru?.meanings||[]).map(String);
          if(meanings.length){const marked=m=>/^\(?sich\b/u.test(m.trim());
            if(meanings.some(marked))reflexive=true;
            plain=meanings.some(m=>!marked(m));}
        }
        return {reflexive,plain};
      };
      // sich of a finite verb + zu-group: the infinitive that has only a reflexive card takes it (versprach sich zu bessern);
      // otherwise the only one of the two with a reflexive card (entschied sich zurückzukehren; vergessen mich anzumelden);
      // a finite verb with only a reflexive card against an infinitive with both keeps it; both with both readings — the choice.
      const zuOwner=async({finite,finiteBase,zu,zuBase})=>{
        if(!zuBase)return 'zu';
        const f=await cardKinds(finite,finiteBase),z=await cardKinds(zu,zuBase);
        if(z.reflexive&&!z.plain)return 'zu';
        if(f.reflexive&&!z.reflexive)return 'finite';
        if(z.reflexive&&!f.reflexive)return 'zu';
        if(f.reflexive&&z.reflexive)return f.plain?'choice':'finite';
        // no reflexive card on either: sich before the group is the infinitive's, as before (versprach sich zu bessern)
        return 'zu';
      };
      const relations=[];
      for(let ci=0;ci<clauses.length;ci++) {
        const clause=clauses[ci], previous=ci>0?clauses[ci-1]:null;
        const inherited=ci>1&&clause.relation==='comma'&&previous.relative&&
          !analyses.slice(clauses[ci-2].start,clauses[ci-2].end+1).some(rows=>rows.some(a=>['finite','infinitive','participle'].includes(a.kind)))
          ? clauses[ci-2] : null;
        for(let v=clause.start;v<=clause.end;v++) {
          // A capital inside the sentence is a noun (für das ratlose Verhalten), not the reflexive verb.
          const textStart=/^[\s„"“»«(–—-]*$/u.test(sentence.slice(0,tokens[v].index));
          if(/^\p{Lu}/u.test(tokens[v][0])&&!clauseInitial(sentence,tokens[v].index)&&!textStart&&tokens[v][0]!==tokens[v][0].toUpperCase())continue;
          // An own card of another part of speech with this very spelling and no own verb form (Einige, fast) is that word.
          const ownOther=(forms.get(words[v])||[]).filter(e=>e.type!=='Verb'&&norm(e.word)===words[v]&&['Pronomen','Adverb','Adjektiv','article','numeral','preposition','Konjunktion'].includes(e.type));
          // An imperative opening the clause stays possible (Schon dich! — schonen).
          if(ownOther.length&&!(forms.get(words[v])||[]).some(e=>e.type==='Verb')&&!(v===clause.start&&analyses[v].some(r=>r.kind==='imperative')))continue;
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
          // G15 (19.10.2026): one sich in the clause proves a third-person helper as well (hat sich … verdoppelt).
          const singleSich=(()=>{let n=0;for(let p=clause.start;p<=clause.end;p++)if(words[p]==='sich')n++;return n===1;})();
          helpers=helpers.filter(h=>subjects(clause,h.analysis.person).length===1||inherited&&subjects(inherited,h.analysis.person).length===1||
            singleSich&&THIRD_PERSONS.includes(h.analysis.person)&&(GROUP_HELPER_VERBS.includes(h.analysis.base)||modalLemmas.has(h.analysis.base)));
          for(const a of rows) {
            // A weak -te form is Präteritum and Konjunktiv II at once; the reflexive group takes Präteritum (P1).
            if(a.kind==='finite'&&a.tense==='Konjunktiv II'&&rows.some(r=>r.kind==='finite'&&r.tense==='Präteritum'&&r.base===a.base&&r.person===a.person))continue;
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
            const {controller,control,subjectClause,tense,zuIndex}=chain,nonLexical=chain.nonLexical||[];
            if(!control.person)continue;
            // G15d (16.10.2026): with a reflexive controller (sich entscheiden,
            // sich weigern) the pronoun belongs to it, not to a non-reflexive
            // zu-infinitive (entschied er sich … zurückzukehren; der beizutreten
            // sich das Haus weigerte).
            // L52 (user 24.10.2026): a zu-infinitive group in the clause of its finite verb, with or without a comma
            // (entschied er sich zurückzukehren; Ich habe vergessen mich anzumelden): which of the two takes sich is
            // read from the cards — see zuOwner.
            let zuChoice=false;
            // (an auxiliary or modal host: its participle / infinitive is the verb that may take sich — habe vergessen mich anzumelden)
            const hostMain=a.kind==='infinitive'&&tense==='zu-Infinitiv'&&controller!==v&&subjectClause===clause&&(TENSE_AUXILIARIES.includes(control.base)||modalLemmas.has(control.base))?
              (()=>{const m=[];for(let i=clause.start;i<v;i++)if(i!==controller&&words[i-1]!=='zu'&&/^\p{Ll}/u.test(tokens[i][0])&&analyses[i].some(r=>['participle','infinitive'].includes(r.kind)&&!r.zu&&!TENSE_AUXILIARIES.includes(r.base)))m.push(i);return m.length===1?m[0]:null;})():null;
            const zuPair=a.kind==='infinitive'&&tense==='zu-Infinitiv'&&controller!==v&&subjectClause===clause?
              hostMain!==null?{finite:hostMain,finiteBase:(analyses[hostMain].find(r=>['participle','infinitive'].includes(r.kind))||{}).base,zu:v,zuBase:a.base,hostMain}:{finite:controller,finiteBase:control.base,zu:v,zuBase:a.base}:
              tense!=='zu-Infinitiv'&&['finite','participle','infinitive'].includes(a.kind)?(()=>{const z=zuInfinitiveAt(clause,v);return z<0?null:{finite:v,finiteBase:a.base,zu:z,zuBase:zuBaseAt(z)};})():null;
            // (two pronouns before the group — weigerte sich sich zu waschen — give one to each verb)
            const twoPronouns=zuPair&&(()=>{let n=0;for(let p=clause.start;p<zuPair.zu;p++)if(reflexivePronouns.has(words[p])&&!beforePrep(p))n++;return n===2;})();
            if(zuPair&&!twoPronouns){
              const owner=await zuOwner(zuPair);
              if(owner===null)continue;
              if(owner==='choice')zuChoice=true;
              else if(owner!==(zuPair.zu===v?'zu':'finite'))continue;
            }
            if(attempt){attempt.stage='subject';attempt.person=control.person;attempt.subjectCandidates=subjects(subjectClause,control.person);}
            let subject=subjectFor(subjectClause,control,controller,true);
            // G15 (19.10.2026): sich is third person only, so it proves the person of a third-person finite verb of
            // its own clause even when the subject is not recognised (Südlich des Dorfes befindet sich ein
            // Militärgelände; Seither hat sich die Einwohnerzahl verdoppelt). Only one sich in the clause; mich / dich /
            // uns / euch still need the subject (they can be objects of another verb).
            if(!subject&&subjectClause===clause&&THIRD_PERSONS.includes(control.person)) {
              const sichAt=[];for(let p=clause.start;p<=clause.end;p++)if(words[p]==='sich'&&!beforePrep(p))sichAt.push(p);
              // A plural reading of a form that equals the infinitive at the clause end is the infinitive
              // (… sich … zu entziehen, … sich … konzentrieren), not «sie» + finite verb.
              const infinitiveLike=control.person==='sie'&&controller===v&&words[v]===a.base&&(v===clause.end||words[v-1]==='zu'||helpers.some(h=>h.index>v&&(GROUP_HELPER_VERBS.includes(h.analysis.base)||modalLemmas.has(h.analysis.base))));
              // lassen keeps its own sich … lassen handling (B5); an intransitive sein-verb without a reflexive card
              // (sind sich um den Hals gefallen — «each other») is no reflexive verb.
              let auxiliaries=a.entry?.auxiliary?[norm(a.entry.auxiliary)]:null;
              if(!auxiliaries&&fallback.perfectAuxiliaries){try{auxiliaries=await fallback.perfectAuxiliaries(a.base);}catch(_){auxiliaries=null;}}
              const intransitive=!reflexiveEntries.has(a.entry)&&!(reflexiveLemmas.get(a.base)||[]).length&&Array.isArray(auxiliaries)&&auxiliaries.length>0&&auxiliaries.every(x=>x==='sein');
              if(sichAt.length===1&&!infinitiveLike&&!["lassen","seinlassen"].includes(a.base)&&control.base!=='lassen'&&!intransitive)subject={index:null,person:control.person,implicit:true,viaSich:true};
            }
            if(!subject)continue;
            // An infinitival comma clause can have an explicit accusative
            // controller; third-person objects cannot be resolved to sich safely.
            // (um / ohne / statt … zu are controlled by the subject — hat er uns beigebracht, um uns zu helfen: uns is the object)
            if(a.kind==='infinitive'&&tense==='zu-Infinitiv'&&subjectClause!==clause&&!ZU_INFINITIVE_OPENERS.includes(words[clause.start])) {
              const objects=[];for(let i=subjectClause.start;i<=subjectClause.end;i++)if(['mich','dich','uns','euch'].includes(words[i])&&!beforePrep(i))objects.push(i);
              if(objects.length===1)subject={index:objects[0],person:pronounPersons[words[objects[0]]],objectController:true};
              else if(objects.length>1)continue;
              // A third-person object controller (es fiel ihm schwer, sich … zu konzentrieren) is still third person:
              // sich attaches either way; only mich / dich / uns / euch would need the controller itself.
              else if(!clauseHasSich(clause)&&Array.from({length:subjectClause.end-subjectClause.start+1},(_,k)=>words[subjectClause.start+k]).some(w=>['den','dem','einen','einem','ihn','ihm','ihr'].includes(w)))continue;
            }
            if(attempt)attempt.stage='pronoun';
            const pronouns=[];
            for(let p=clause.start;p<=clause.end;p++)if(reflexivePronouns.has(words[p])&&!beforePrep(p)) {
              const per=pronounPersons[words[p]];
              if(per===subject.person||per==='third'&&THIRD_PERSONS.includes(subject.person))pronouns.push(p);
            }
            if(attempt)attempt.pronounStarts=pronouns.map(i=>tokens[i].index);
            // Two agreeing pronouns around a zu-group (Er weigerte sich sich zu waschen): the first is the finite verb's,
            // the one right before the group the infinitive's.
            if(zuPair&&pronouns.length===2&&pronouns[0]<pronouns[1]&&pronouns[1]<zuPair.zu)pronouns.splice(zuPair.zu===v?0:1,1);
            if(pronouns.length!==1)continue;
            if(attempt)attempt.stage='competing-predicate';
            const pronoun=pronouns[0];
            // G15d: sich directly before a present participle with an ending and
            // a noun (von einem sich vergrößernden Kelch) belongs to that participle.
            if(pronoun+2<=clause.end&&DECLINED_PRESENT_PARTICIPLE.test(tokens[pronoun+1][0])&&/^\p{Lu}/u.test(tokens[pronoun+2][0])&&!componentIndices.includes(pronoun+1))continue;
            // The predicate, its auxiliary/modal and documented compound pieces
            // form one group. Any other verbal head makes the attachment unsafe.
            let unresolvedLassen=false;
            const allowed=new Set([...componentIndices,controller]);if(zuIndex!==null)allowed.add(zuIndex);
            if(zuPair&&zuPair.zu!==v){allowed.add(zuPair.zu);if(words[zuPair.zu-1]==='zu')allowed.add(zuPair.zu-1);}
            if(zuPair?.hostMain!==undefined&&zuPair.hostMain!==null)allowed.add(zuPair.hostMain);
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
            // G15 (19.10.2026): a capital inside the sentence is a noun (weite Teile), a capital opening the clause
            // with an own adverb / adjective card is that word (Lange beschäftigte sich …), and a declined word right
            // before such a noun is attributive (weite Teile): none of them is a competing predicate.
            const nounAt=i=>/^\p{Lu}/u.test(tokens[i][0])&&!clauseInitial(sentence,tokens[i].index);
            const modifierOpening=i=>i===clause.start&&/^\p{Lu}/u.test(tokens[i][0])&&(forms.get(words[i])||[]).some(e=>['Adverb','Adjektiv'].includes(e.type));
            const numeralWord=i=>i<clause.end&&(forms.get(words[i])||[]).some(e=>e.type==='numeral');
            const attributiveBefore=i=>numeralWord(i)||i+1<=clause.end&&nounAt(i+1)&&LOWERCASE_DECLINED_WORD.test(tokens[i][0])&&!analyses[i].some(r=>r.kind==='participle'&&!/e[mnrs]?$/u.test(words[i]));
            // Lost links 20.10.2026: an own card of another part of speech with this very spelling and no own verb card
            // (fast «почти», not a form of fasen) is that word, not a competing predicate (as for the verb, line above).
            const ownOtherWord=i=>!(forms.get(words[i])||[]).some(e=>e.type==='Verb')&&(forms.get(words[i])||[]).some(e=>norm(e.word)===words[i]&&['Pronomen','Adverb','Adjektiv','article','numeral','preposition','Konjunktion'].includes(e.type));
            // L52 (links chat, 24.10.2026): beside the finite reflexive verb a participle form with no haben / sein / werden in
            // the clause is no second predicate — it describes (fühlt sich dort aufgehoben, setzte sich bevorzugt für … ein);
            // its finite reading (bevorzugt «er bevorzugt») is not a second finite verb of the clause either.
            const helperInClause=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).some(i=>i!==v&&analyses[i].some(r=>r.kind==='finite'&&TENSE_AUXILIARIES.includes(r.base)));
            const describingParticiple=i=>a.kind==='finite'&&i>v&&!helperInClause&&analyses[i].some(r=>r.kind==='participle')&&!analyses[i].some(r=>r.kind==='infinitive');
            const competingIndices=Array.from({length:clause.end-clause.start+1},(_,k)=>clause.start+k).filter(i=>
              !allowed.has(i)&&!ownOtherWord(i)&&!predicativeParticiple(i)&&!describingParticiple(i)&&!nounAt(i)&&!modifierOpening(i)&&!attributiveBefore(i)&&(
                (reflexiveForms.get(words[i])||[]).some(row=>['Infinitiv','Partizip II'].includes(row.tense))&&(words[i-1]==='zu'||i===clause.end)||
                singleSich&&analyses[i].some(r=>r.kind==='finite'&&THIRD_PERSONS.includes(r.person))&&!(forms.get(words[i])||[]).some(e=>['Nomen','Adjektiv','Adverb','Pronomen'].includes(e.type))||
                analyses[i].some(r=>
                ['infinitive','participle'].includes(r.kind)||r.kind==='finite'&&subjects(clause,r.person).length)));
            const competing=competingIndices.length>0;
            if(attempt)attempt.competing=competingIndices.map(i=>tokens[i][0]);
            if(competing)continue;
            if(a.kind==='finite'&&helpers.some(h=>PERFECT_AUXILIARIES.includes(h.analysis.base))&&rows.some(r=>r.kind==='participle'))continue;
            const candidate=a.entry?mainCandidate(a.entry):a.candidate;if(!candidate)continue;
            const indices=[...componentIndices,pronoun];if(zuIndex!==null)indices.push(zuIndex);
            // To-do 19.10 (2.2): um / ohne / (an)statt opening the infinitive clause right before the pronoun is
            // highlighted with it, as in 4.8 (statt … dich … zu … stärken).
            if(zuIndex!==null&&pronoun>0&&ZU_INFINITIVE_OPENERS.includes(words[pronoun-1]))indices.push(pronoun-1);
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
            const tentative=unresolvedLassen||zuChoice;
            const spans=[...new Set(indices)].sort((a,b)=>a-b).map(i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length}));
            const caseName=['mir','dir'].includes(words[pronoun])?'Dativ':['mich','dich'].includes(words[pronoun])?'Akkusativ':'Akkusativ/Dativ';
            const tokenSpan=i=>({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
            // S1 (17.10.2026): the separable scanner proves a detached particle of this very
            // verb outside the clause seen here (stellte sich das Urteil als falsch heraus --,
            // lehnt sich an die Epen (…) an): the base verb is not the lexical verb, so its
            // reflexive reading must not outrank the complete verb.
            if(!a.detached&&a.kind==='finite'&&scanSeparableCandidates(tokens[v][0],await separableScope({sentence,tokenOffset:tokens[v].index}))
              .some(c=>!c.construction.confidence&&c.construction.spans[0].start===tokens[v].index&&norm(c.lemma).replace(/^sich\s+/u,'')!==a.base&&norm(c.lemma).endsWith(a.base)&&
                // only a particle that closes its clause (not a trailing one: machten sich alle zusammen auf den Weg)
                /^\s*(?:[,.;:!?…)»«"“”„–—-]|(?:wie|als|und|oder|aber)\b|$)/u.test(sentence.slice(c.construction.spans.at(-1).end))))continue;
            if(attempt)attempt.stage='linked';
            relations.push({...candidate,reflexiveUnconfirmed:false,construction:{id:'reflexive-verb',lemma:candidate.lemma,label:unresolvedLassen?'Mögliche Reflexivgruppe':'Reflexiv',...(tentative?{confidence:'tentative'}:{}),...(unresolvedLassen?{attachmentOnly:true}:{}),...(reflexiveAmbiguity?{interpretation:'reciprocal'}:{}),
              note:reflexiveAmbiguity?{ru:'здесь: друг друга',en:'here: each other'}:unresolvedLassen?{ru:'Возможная возвратная группа с lassen; требуется выбор',en:'Possible reflexive lassen group; selection required'}:{ru:'Возвратная конструкция',en:'Reflexive construction'},spans,tense,...(controller!==v&&modalLemmas.has(control.base)&&tense!=='zu-Infinitiv'?{modal:control.base}:{}),reflexiveCase:caseName,
              verb:tokenSpan(v),pronoun:tokenSpan(pronoun),
              ...(a.detached?{prefix:tokenSpan(componentIndices.find(i=>i!==v&&words[i]===a.prefix))}:{}),
              subject:subject.index===null?null:{text:tokens[subject.index][0],start:tokens[subject.index].index,end:tokens[subject.index].index+tokens[subject.index][0].length},
              lexicalSenseConfirmed:lexicalSenseConfirmed&&!reflexiveAmbiguity,
              ...(complement?{complement:{...complement}}:{})},_lexicalIndices:[v,...componentIndices.filter(i=>i!==controller&&!nonLexical.includes(i)&&(!unresolvedLassen||i===v))],_pronounIndex:pronoun});
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
      if(!reflexivePronouns.has(key)&&!verbAnalyses.has(key)&&!zuForms.has(key)&&!lexicalSeparated(key)){
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
      const lemma = base.charAt(0).toUpperCase()+base.slice(1);
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
      const governed = PREPOSITION_CASE_CODE[prep];
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
      // C19 (18.10.2026): an own noun with this very form in the singular is no
      // infinitive (dem Jungen, des Jungen — der Junge; in ihrem Herzen — das Herz).
      // Masculine weak nouns take -(e)n in every case but the nominative (n-declension:
      // der Junge / dem Jungen, der Held / dem Helden); an irregular form is read from
      // the card's own notes (Besonderes Deklination: dem Herzen).
      const det = contractionArticle(norm(tokens[d][0])) || norm(tokens[d][0]);
      const oblique = !/^(?:das|ein|kein|alles|dies(?:es)?|jed(?:es)?|jen(?:es)?|(?:mein|dein|sein|ihr|unser|euer|eur)(?:es)?)$/u.test(det);
      const ownSingular = candidates.some(c => {
        if (c.source !== "main" || canonicalPos(c.pos) !== "Nomen" || !c.item) return false;
        const w = norm(c.item.word), plurals = String(c.item.plural || "").split(/\s*,\s*/u).map(norm);
        const notes = [c.item.usage_note_ru,c.item.usage_note_en,c.item.declension_note_ru,c.item.declension_note_en,c.item.declension_forms].filter(Boolean).join(" ");
        if (new RegExp(`(?:^|[\\s(:;,])(?:dem|des|den|das)\\s+${base}(?=[\\s,.;)]|$)`,"iu").test(norm(notes))) return true;
        return oblique && c.item.article === "der" && plurals.includes(base) && (base === w + "n" && /e$/u.test(w) || base === w + "en");
      });
      if (ownSingular) return null;
      const verb = verbs.find(c => c.source === "main") || verbs[0];
      const lemma = base.charAt(0).toUpperCase()+base.slice(1);
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
      // C14 step 2 (17.10.2026): inside the sentence a verb homograph without a construction does not
      // block the nominal reading (wie die Verrückten — verrückten of verrücken; die Auserwählte).
      if (!clauseInitial(context.sentence, context.tokenOffset)) candidates = candidates.filter(c => canonicalPos(c.pos) !== "Verb" || c.construction);
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
      const lemma = stem.charAt(0).toUpperCase()+stem.slice(1)+"e";
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
    // G48 (23.10.2026): word formation for a word no dictionary knows (createWordFormation above). Readings of a part come
    // from the own cards (headwords, plural and declined forms) and from the external dictionary; the external one is asked
    // only for spellings its part filter lets through (fallback.wordParts, data/word-formation-parts.json).
    const WORD_FORMATION_POS = new Set(["Nomen","Adjektiv","Verb"]);
    const WORD_FORMATION_PARTICLES = new Set(("ab an auf aus bei durch ein empor entgegen fort gegen her herab heran herauf heraus herbei herein " +
      "herüber herum herunter hervor hin hinab hinauf hinaus hinein hinter hinüber hinunter los mit nach nieder ober unter über um vor " +
      "voran voraus vorbei vorüber weg weiter wider wieder zu zurück zusammen neben zwischen").split(" "));
    const wordFormationReadings = new Map();
    let wordFormationCore = null, wordFormationParts = null, wordFormationDict = null;
    function wordFormationDictionary() {
      const readings = async s => {
        if (wordFormationReadings.has(s)) return wordFormationReadings.get(s);
        const rows = [];
        for (const e of lemmas.get(s) || []) if (WORD_FORMATION_POS.has(e.type))
          rows.push({pos:e.type,lemma:e.word,source:"main",form:false,entry:e,en:String(e.translation_en || ""),gender:e.article || null});
        for (const e of forms.get(s) || []) if (WORD_FORMATION_POS.has(e.type) && norm(e.word) !== s) {
          const plurals = e.type === "Nomen" && e.plural && e.plural !== "—" ? e.plural.split(/\s*,\s*/u).map(norm) : [];
          const plural = plurals.some(p => p === s || !/[ns]$/u.test(p) && p + "n" === s);
          rows.push({pos:e.type,lemma:e.word,source:"main",form:true,number:plural ? "plural" : null,entry:e,en:String(e.translation_en || ""),gender:e.article || null});
        }
        if (wordFormationParts?.has(s)) {
          let groups = [];
          try { groups = (await fallback.lookupFacts(s)).groups || []; } catch (_) { groups = []; }
          const P = {noun:"Nomen",adj:"Adjektiv",verb:"Verb"};
          for (const g of groups) {
            if (!P[g.pos]) continue;
            if (g.kind === "form-note") {
              for (const i of g.inflections || []) if (norm(i.form) === s) rows.push({pos:P[i.pos] || P[g.pos],lemma:i.lemma,source:"fallback",form:true,
                number:(i.tags || []).includes("plural") && !(i.tags || []).includes("singular") ? "plural" : null});
              continue;
            }
            if (g.unresolved || !g.meanings?.length) continue;
            rows.push({pos:P[g.pos],lemma:g.word,source:"fallback",form:norm(g.word) !== s,en:g.meanings.join("; "),
              gerund:g.meanings.every(m => /^gerund of /u.test(m))});
          }
        }
        // fasern: the record linked to faser and the form note «plural of Faser» are one reading — plural.
        for (const r of rows) if (r.form && !r.number && rows.some(o => o.number === "plural" && o.pos === r.pos && norm(o.lemma) === norm(r.lemma))) r.number = "plural";
        if (wordFormationReadings.size >= 4096) wordFormationReadings.delete(wordFormationReadings.keys().next().value);
        wordFormationReadings.set(s,rows);
        return rows;
      };
      const closed = s => (lemmas.get(s) || []).some(e => !WORD_FORMATION_POS.has(e.type)) && !(lemmas.get(s) || []).some(e => e.type === "Nomen" || e.type === "Adjektiv");
      return {
        readings,
        mayBe:s => lemmas.has(s) || forms.has(s) || !!wordFormationParts?.has(s),
        blocked:s => WORD_FORMATION_PARTICLES.has(s) || closed(s),
        gender:lemma => fallback.nounGender ? fallback.nounGender(lemma).catch(() => null) : Promise.resolve(null),
        ru:async (lemma, pos) => {
          const own = (lemmas.get(norm(lemma)) || []).find(e => e.type === pos);
          if (own) return String(own.translation_ru || "");
          try {
            const r = await window.BibliothekRussianTranslations?.lookup(lemma,{Nomen:"noun",Adjektiv:"adj",Verb:"verb"}[pos]);
            return r ? (r.shown || r.meanings || []).join("; ") : "";
          } catch (_) { return ""; }
        }
      };
    }
    // What stands around the word (createWordFormation, ctx): a determiner or an own adjective before it (der Bauersmann,
    // einen lauten Kläffer), a contraction or a preposition (im Hexenwald, in Bauchhöhe), a title (Herr Seligmann — a name),
    // a noun after an adjective with an ending (eulenfreien Morgen; not the infinitive in «sie hochreichen fast»).
    const WORD_FORMATION_TITLES = new Set(("herr herrn frau fräulein familie dr doktor prof professor onkel tante mr mrs ms miss sir lady " +
      "madame monsieur graf grafen gräfin baron barons baronin fürst fürstin könig königs königin prinz prinzen prinzessin kapitän pater").split(" "));
    const WORD_FORMATION_DET = /^(?:dies|jen|jed|welch|manch|solch|all|beid|viel|wenig|einig|mehrer|ander|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?$/u;
    const WORD_FORMATION_NAMING = /^(?:namen|hei(?:ß|ss)(?:e|t|en|est)?|hie(?:ß|ss)(?:e|en|t|est)?|gehei(?:ß|ss)en|namens|genannt|nenn(?:e|t|en|st)|nannte(?:n|st|t)?|getauft|tauf(?:e|t|en)|taufte(?:n)?)$/u;
    const WORD_FORMATION_COPULA = /^(?:ist|war|sind|waren|bin|bist|seid|wird|wurde|wurden|werden|wirst|wurdest|bleibt|blieb|bleiben|blieben|wäre|wären|scheint|schien)$/u;
    function wordFormationContext(word, context) {
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'wordFormation');
      const i = clickedTokenIndex(tokens,context.tokenOffset,word);
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const at = k => k >= 0 && k < tokens.length && /^\s+$/u.test(gap(k,k+1)) ? tokens[k][0] : null;
      const p1 = i > 0 ? at(i-1) : null, p2 = p1 && i > 1 ? at(i-2) : null;
      const isDet = t => !!t && (!!determinerFeatures(t) || WORD_FORMATION_DET.test(norm(t)));
      // G68: a capital adjective with an ending is an attribute too (Gedämpftes Eulengeschrei, ein Norwegischer Stachelbuckel).
      const isAdj = t => {
        if (!t || !/^\p{Ll}/u.test(t) && !/^\p{Lu}\p{Ll}+(?:e|en|em|er|es)$/u.test(t)) return false;
        const key = norm(t), small = /^\p{Ll}/u.test(t);
        for (const e of small ? ["en","em","er","es","e",""] : ["en","em","er","es","e"]) {
          if (!key.endsWith(e)) continue;
          const stem = key.slice(0,key.length-e.length);
          // dunkle / teure: the -e- of dunkel, teuer drops before an ending.
          const elided = e && /[^aeiouäöü][lr]$/u.test(stem) ? stem.slice(0,-1) + "e" + stem.slice(-1) : null;
          if ([stem,stem+"e",elided,stem === "hoh" ? "hoch" : null].some(c => c && (lemmas.get(c) || []).some(x => x.type === "Adjektiv"))) return true;
        }
        return false;
      };
      const adj = isAdj(p1), detToken = isDet(p1) ? p1 : adj && isDet(p2) ? p2 : null, d = detToken ? norm(detToken) : "";
      const definite = /^(?:der|die|das|den|dem|des)$/u.test(d);
      const next = i >= 0 && i + 1 < tokens.length ? tokens[i+1] : null, after = next ? gap(i,i+1) : "";
      // G68 (24.10.2026, reference C8f): bare — no determiner, attribute or preposition, but a small word of its clause right
      // before it (können Kiefermuskulatur, trainiert Gesichtsmuskulatur, auch Sommerregen; Wer Haspelholz haut — a capital
      // small word opening the clause), not a naming word (hieß, namens, genannt, den Namen …). A capital word before it is a
      // first name or a title (Hermann Mühleisen, Schloss Freudenstein); at the start of a clause or after a comma nothing
      // stands before it (Balleis trat zurück; Darry, Gadendorf, Matzwitz): no bare reading.
      const offset = Number.isInteger(context.tokenOffset) ? context.tokenOffset : -1;
      const prevWord = offset > 0 ? /([\p{L}]+)[ \t]+$/u.exec(sentence.slice(0,offset)) : null;
      let bare = false, name = false, slot = false;
      const rest = sentence.slice(offset + String(word || "").length);
      // In a pair or a list (Spitzhut und Umhang; Kesselkuchen, Lakritz) a bare singular is no name.
      const listed = /^[ \t]*(?:,[ \t]*\p{L}|[ \t]+(?:und|oder|sowie|bzw\.?)[ \t])/u.test(rest) || /(?:,|\b(?:und|oder|sowie))[ \t]+$/u.test(sentence.slice(0,offset));
      if (prevWord) {
        const pw = prevWord[1], key = norm(pw);
        const p2 = /([\p{L}]+)[ \t]+$/u.exec(sentence.slice(0,prevWord.index)), k2 = p2 ? norm(p2[1]) : "";
        const finite = (verbAnalyses.get(key) || []).some(r => r.kind === "finite");
        const verb = (verbAnalyses.get(key) || []).some(r => r.kind === "finite" || r.kind === "infinitive");
        // An object (reviewer 24.10): a verb right before it, not a copula or a naming verb, and a subject before the verb in
        // its clause — a personal pronoun or a noun (Sie können Kiefermuskulatur …, Menschen mit … können …, Er trainiert …);
        // without one the word may itself be the subject, often a name (Heute spielt Hartwasser; »Nein«, sagte Kaltwasser).
        if (/^\p{Ll}/u.test(pw) && verb && !WORD_FORMATION_NAMING.test(key) && !WORD_FORMATION_COPULA.test(key)) {
          const before = sentence.slice(0,prevWord.index), start = Math.max(...[...before.matchAll(/[.!?;:,»«"“”„()–—]/gu)].map(m => m.index + 1), 0);
          const clauseWords = [...before.slice(start).matchAll(/[\p{L}]+/gu)];
          bare = clauseWords.some((m, k) => {
            const t = m[0], n = norm(t);
            if (/^(?:ich|du|er|sie|wir|ihr|man)$/u.test(n)) return true;
            if (!/^\p{Lu}/u.test(t)) return false;
            const own = lemmas.get(n) || [];
            return own.some(e => e.type === "Nomen") || (k > 0 && !own.length);
          });
        }
        // G68 (user 24.10): a name — after a title (Herr, König), namens / genannt, hieß / heißt with a personal pronoun as
        // subject (Er hieß Goldblut; not «Das heißt …», «Das Motto heißt …»), nannte ihn / sie, den / dem Namen.
        const pronoun = /^(?:ich|du|er|sie|wir|ihr)$/u;
        name = WORD_FORMATION_TITLES.has(key) || /^(?:namens|genannt)$/u.test(key) ||
          /^(?:hei(?:ß|ss)(?:e|t|en|est)?|hie(?:ß|ss)(?:e|en|t|est)?)$/u.test(key) && pronoun.test(k2) ||
          /^(?:ihn|sie)$/u.test(key) && /^(?:nenn|nann|rief|ruf)/u.test(k2) ||
          key === "namen" && /^(?:den|dem|des|einen|seinen|ihren|deinen|meinen)$/u.test(k2);
        // The subject of a speech tag: a finite verb after the quote, the word ending its clause (»Ja«, antwortete Weißkopf.).
        slot = finite && /[»«"“”„‚‘’–—][ \t]*,?[ \t]*$/u.test(sentence.slice(0,prevWord.index)) && /^[ \t]*(?:[.,;:!?»«"“”–—]|$)/u.test(rest);
      }
      // A word where a name stands is read as a name or not at all — never as a common noun (»Nein«, sagte Kaltwasser.).
      const nameSlot = slot && !listed;
      if (nameSlot) bare = false;
      return {
        bare, listed, name, nameSlot,
        detForm:d || (p1 && contractionArticle(p1)) || "",
        det:!!detToken, adj, defDirect:!!p1 && definite && detToken === p1, dieDirect:!!p1 && d === "die" && detToken === p1, otherDet:!!detToken && !definite,
        contraction:!!p1 && !!contractionArticle(p1), prep:!!p1 && (lemmas.get(norm(p1)) || []).some(e => e.type === "preposition"),
        title:!!p1 && WORD_FORMATION_TITLES.has(norm(p1)),
        numberBefore:!!p1 && /^(?:zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|\p{L}+zehn|\p{L}*zig|hundert|tausend|paar|\d+)$/u.test(norm(p1)),
        pluralDet:/^(?:die|diese|jene|keine|alle|beide|viele|einige|mehrere|manche|solche|welche|meine|deine|seine|ihre|unsere|eure)$/u.test(d),
        singularDet:/^(?:das|dem|des|ein|eine|einem|einen|eines|einer|(?:kein|mein|dein|sein|ihr|unser|euer|eur|dies|jen|jed|welch|manch|solch)(?:em|es))$/u.test(d),
        nextNoun:!!next && (/^\s+$/u.test(after) && (/^\p{Lu}/u.test(next[0]) || SERIES_COORDINATOR.test(next[0])) || /^\s*,\s*$/u.test(after)),
        nextCapital:!!next && /^\s+$/u.test(after) && /^\p{Lu}/u.test(next[0])
      };
    }
    const capitalise = s => s.charAt(0).toUpperCase() + s.slice(1);
    async function wordFormationCandidate(word, context) {
      const spelling = String(word || "");
      if (!context || !Number.isInteger(context.tokenOffset) || spelling.length < 6 || !/^[\p{L}]+$/u.test(spelling) ||
          spelling === spelling.toUpperCase() || !fallback?.wordParts) return null;
      try { wordFormationParts = await fallback.wordParts(); } catch (_) { return null; }
      wordFormationDict ||= wordFormationDictionary();
      wordFormationCore ||= createWordFormation(wordFormationDict);
      // A part of a hyphenated word (Beinklammer-Fluch) keeps the hyphen rule (resolveHyphenated): its article is the whole word's.
      const around = String(context.sentence || "");
      if (/[-‐‑]$/u.test(around.slice(0,context.tokenOffset)) || /^[-‐‑]/u.test(around.slice(context.tokenOffset + spelling.length))) return null;
      const w = norm(spelling), capital = /^\p{Lu}/u.test(spelling), ctx = wordFormationContext(spelling,context);
      // G68 (user 24.10): a whole word a dictionary knows is never split, in any case (beileibe — «bei Leibe», not Beil + Eibe).
      if (lemmas.has(w) || forms.has(w) || (fallback.hasRecord && await fallback.hasRecord(w))) return null;
      // A capital at the start of a sentence may be a noun or an adjective (Eulenreich war der Wald; Zwergenreich Moria):
      // when both readings exist, no card.
      let noun = capital, found = await wordFormationCore.analyse(w,noun,ctx);
      if (found?.ambiguous) return null;
      if (capital && clauseInitial(context.sentence,context.tokenOffset)) {
        let other = await wordFormationCore.analyse(w,false,ctx);
        if (other?.ambiguous) other = null;
        // G68: a capital word opening the clause read as an adjective without an ending (Goldreich versteckte sich) is a name
        // as often as an adjective: no card (Eulenfreie Tage keeps its ending and its noun).
        if (other?.compound && other.compound.parts.at(-1).ending === '') other = null;
        // G68: a bare start of a clause (no sign before the word) does not make a noun of an adjective (Eulenfreie Tage).
        if (other && found && ctx.bare && !(ctx.det || ctx.adj || ctx.contraction || ctx.prep)) {
          found = await wordFormationCore.analyse(w,true,{...ctx,bare:false});
          if (found?.ambiguous) found = null;
        }
        if (found && other) return null;
        if (!found && other) { found = other; noun = false; }
      }
      // G68 (user 24.10): a name is read literally — «Weißkopf · Name · буквально: Weiß + Kopf — белый + голова» — only when
      // its split is unique (the place-name / surname heads -mann, -berg, -dorf … keep their rule: no card).
      let asName = false;
      if (!found && capital && (ctx.name || ctx.nameSlot) && !ctx.det && !ctx.adj) {
        found = await wordFormationCore.analyse(w,true,{...ctx,nameMode:true});
        if (found?.ambiguous) found = null;
        asName = !!found;
      }
      if (!found) return null;
      const part = p => ({text:p.text,link:p.link || "",drop:!!p.drop,plural:!!p.plural,stem:!!p.stem,surface:p.surface || p.text,lemma:p.lemma,pos:p.pos,
        source:p.source,dictionaryId:p.entry?.id || null,ru:p.ru || "",en:p.en || (p.entry ? String(p.entry.translation_en || "") : "")});
      if (asName) {
        const formation = {kind:"name",parts:found.compound.parts.map(part),lemma:spelling,gender:null,number:null,pos:"Name"};
        const translation = {en:window.BibliothekMeaningDisplay?.formationText?.(formation,"en") || "",ru:window.BibliothekMeaningDisplay?.formationText?.(formation,"ru") || ""};
        // No word to save (as the dictionary's own names): item null.
        return {source:"fallback",lemma:spelling,pos:"name",posLabel:"Name",translation,formation,item:null};
      }
      let formation, lemma, gender = null, number = null;
      if (found.compound) {
        const parts = found.compound.parts, head = parts.at(-1), at = found.compound.at.at(-1);
        if (noun) {
          // The head's gender only when it is one (die Heide / der Heide, das / die Steuer: no card).
          const ownGenders = new Set((lemmas.get(norm(head.lemma)) || []).filter(e => e.type === "Nomen" && e.article).map(e => e.article));
          // An own card decides alone (das Foto, der Laden); without one, an external record of two genders gives no card.
          const external = !ownGenders.size && fallback.nounGender ? await fallback.nounGender(head.lemma).catch(() => null) : null;
          const genders = new Set([...ownGenders,...(external && external !== "?" ? [external] : [])]);
          if (external === "?" || genders.size > 1) return null;
          const headGender = genders.size === 1 ? [...genders][0] : null, surface = w.slice(at), base = norm(head.lemma);
          // A weak noun after a determiner (den Prinzen, dem Jungen) is plural only when the determiner is plural (die Prinzen);
          // without one it stays plural (mit Goldbuchstaben); after a singular determiner a plural-looking form is singular.
          const ownPlurals = head.entry?.plural && head.entry.plural !== "—" ? head.entry.plural.split(/\s*,\s*/u).map(norm) : [];
          const weak = headGender === "der" && (ownPlurals.length ? ownPlurals.includes(surface) && (surface === base + "n" || surface === base + "en") :
            /e$/u.test(base) && surface === base + "n");
          number = head.number === "plural" || head.entry?.plural_only ? "plural" : null;
          if (number && !head.entry?.plural_only && (ctx.singularDet || weak && ctx.det && !ctx.pluralDet)) number = null;
          // die Sterntaler: «die» before a masculine or neuter noun is its plural.
          if (!number && ctx.pluralDet && ["der","das"].includes(headGender) && !head.form &&
              (head.entry ? String(head.entry.plural || "").split(/\s*,\s*/u).map(norm).includes(surface) : true)) number = "plural";
          // das Baumtragen, beim Holzhacken, das Stühlerücken: a neuter determiner before a head of another gender or a
          // plural is a nominalized infinitive, not this compound.
          if (/^(?:das|dies|dieses|jenes|jedes|welches|manches|solches|alles)$/u.test(ctx.detForm) && (number || headGender && headGender !== "das")) return null;
          let headText = number || !head.form ? surface : base;
          // A dative plural shows its plural (den Wichtelmännern -> die Wichtelmänner = Wichtel + Männer).
          if (number && /n$/u.test(headText)) {
            const shorter = headText.slice(0,-1), own = head.entry?.plural && head.entry.plural !== "—" ? head.entry.plural.split(/\s*,\s*/u).map(norm) : null;
            if (own ? own.includes(shorter) && !own.includes(headText) :
                (await wordFormationDict.readings(shorter)).some(r => r.number === "plural" && r.pos === "Nomen" && norm(r.lemma) === base)) headText = shorter;
          }
          head.surface = headText;
          lemma = capitalise(w.slice(0,at) + headText);
          gender = number ? "die" : headGender;
        } else lemma = w.slice(0,at) + head.text;
        formation = {kind:"compound",parts:parts.map(part),half:!noun && head.half ? head.text : null};
      } else {
        const d = found.derivation;
        // A base known only as a variant spelling without a Russian meaning (hochfahrtig <- «alternative form of hoffahrt»).
        if (!d.base.ru && /^(?:alternative|obsolete|archaic|dated|nonstandard|rare)\b[^;]*\b(?:form|spelling) of\b/iu.test(d.base.en || "")) return null;
        number = d.number || null;
        lemma = noun ? capitalise(w) : d.lemma;
        gender = noun ? (number ? "die" : d.gender) : null;
        formation = {kind:"derivation",suffix:d.suffix || null,prefix:d.prefix || null,base:part(d.base)};
      }
      formation = {...formation,lemma,gender,number,pos:noun ? "Nomen" : "Adjektiv"};
      const item = {word:lemma,type:noun ? "Nomen" : "Adjektiv",...(gender && !number ? {article:gender} : {})};
      // The meaning stored with a saved word (Wortschatz): the parts with their meanings, as on the card.
      const translation = {en:window.BibliothekMeaningDisplay?.formationText?.(formation,"en") || "",ru:window.BibliothekMeaningDisplay?.formationText?.(formation,"ru") || ""};
      return {source:"fallback",lemma,pos:noun ? "noun" : "adj",posLabel:noun ? "Nomen" : "Adjektiv",translation,formation,
        item:{...item,translation_en:translation.en,translation_ru:translation.ru}};
    }
    let preparation = null;
    function prepareSeparable() {
      // A2: the small verb + preposition list loads with the book, not on the first tap.
      if (fallback.verbPrepositions) fallback.verbPrepositions().catch(() => {});
      if (!fallback.separableEntries) return Promise.resolve();
      observe('relation-cache', {consumer:'prepareSeparable',cache:'preparation',state:preparation?'retained':'miss'});
      if (!preparation) preparation = fallback.separableEntries().then(rows => {
        for (const [word,prefix,stems,meanings,derived] of rows) {
          const own = (lemmas.get(norm(word)) || []).filter(e => e.type === "Verb");
          // S2 (17.10.2026): derived entries (particle + known verb) link only in a primary bracket.
          const items = own.length ? own : [{id:`imported:${word}`,word,type:"Verb",importedSeparable:true,meanings,...(derived ? {derivedSeparable:true} : {}),...(derived === 2 ? {nominalSpelling:true} : {})}];
          const bases = separableBases.get(norm(word.slice(prefix.length))) || [];
          for (const entry of items) if (!bases.some(row=>row.entry.id===entry.id)) bases.push({entry,prefix});
          separableBases.set(norm(word.slice(prefix.length)),bases);
          for (const item of items) {
            dictionaryObjects.add(item);
            // S2: a derived entry the English dictionary knows (zutreffen, hinzufügen) keeps its
            // bare infinitive with the external lookup; only a Russian-only one (fortlaufen) is added here.
            if (!item.derivedSeparable || !(meanings || []).length && !item.nominalSpelling) add(forms,word,item);
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
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem"]);
      const passable = new Set(["und","oder","aber","als"]);
      const gap = (a,b) => clauseGapText(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      const hard = (a,b) => /[;:.!?…“”„"«»()]/u.test(gap(a,b)) || boundaries.has(norm(tokens[b][0]));
      const soft = (a,b) => /,/u.test(gap(a,b)) || /\s(?:[–—]|--)\s/u.test(gap(a,b));
      // S1 (17.10.2026): und / oder / aber / als without punctuation do not close the
      // bracket in the first pass either (wirft … Betrug und Bankrott vor, legte … als
      // Präsident … aus); a second verb after them still stops the scan (competingVerb).
      // In the first pass the word after und / oder / als must be nominal or a modifier — a
      // capital, determiner, preposition, number, adjective or adverb — never a possible verb
      // (und speite sie aus, und grinste ihn an) or another particle (auf und ab, hin und her).
      const nominalNext = b => {
        const next = tokens[b+1], word = norm(tokens[b][0]);
        // aber is mostly the adverb inside a clause (sprachen sich aber … aus, schlägt aber fehl).
        if (word === "aber") return true;
        if (!next) return false;
        // A number right after it (oder 17,70 Mark) is nominal.
        if (/^\s*\d[\d.,]*\s*%?\s*$/u.test(sentence.slice(tokens[b].index + tokens[b][0].length, next.index))) return true;
        if (!/^\s+$/u.test(gap(b,b+1))) return false;
        const key = norm(next[0]), entries = forms.get(key) || [];
        const particle = /^(?:ab|an|auf|aus|bei|ein|her|hin|mit|nach|vor|weg|zu|zurück|fort|los|hinauf|hinab|herauf|herab|hinunter|herunter|hinein|herein|hinaus|heraus|hinüber|herüber|herum|umher|davon|dahin|daher|zusammen|weiter|nieder|empor|entgegen|vorbei|voran|voraus|durch|um|über|unter)$/u;
        // auf und ab, hin und her are idioms of their own; nach und nach repeats one word.
        if (particle.test(key) && key !== norm(tokens[b-1]?.[0] ?? "") && (b+2 >= tokens.length || hard(b+1,b+2) || soft(b+1,b+2))) return false;
        if (/^[A-ZÄÖÜ]/u.test(next[0]) || /^\d/u.test(next[0])) return true;
        if ((verbAnalyses.get(key) || []).some(a => ["finite","infinitive","imperative"].includes(a.kind)) || lexicalSeparated(key)) return false;
        if (prepositions.has(key) || particle.test(key) ||
          /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\p{L}*|mein\p{L}*|dein\p{L}*|sein\p{L}*|ihr\p{L}*|unser\p{L}*|eur\p{L}*|dies\p{L}*|jen\p{L}*|jed\p{L}*|all\p{L}*|viel\p{L}*|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)$/u.test(key)) return true;
        if (entries.some(e => ["Adjektiv","Adverb"].includes(e.type)) && !entries.some(e => e.type === "Verb")) return true;
        // A word unknown to the own dictionary: adjective-like endings are modifiers
        // (brummig, wetzenden, dürrer, schreiend); -t / -te / -st endings may be a verb (schalt, heilte).
        return !entries.length && /(?:(?:ig|lich|isch|haft|sam|bar|los|end)(?:e[nmrs]?)?|e[nmrs])$/u.test(key) && !/(?:t|te|ten|tet|test|st)$/u.test(key);
      };
      const stops = (a,b) => hard(a,b) && !(passable.has(norm(tokens[b][0])) &&
        !/[;:.!?…“”„"«»()]/u.test(gap(a,b)) && (secondary || nominalNext(b)));
      const possessiveSein = k => norm(tokens[k][0]) === "sein" && tokens[k+1] && /^\s+$/u.test(gap(k,k+1)) &&
        (/^[A-ZÄÖÜ]/u.test(tokens[k+1][0]) || (forms.get(norm(tokens[k+1][0])) || []).some(e => e.type === "Adjektiv"));
      const nominalParticle = (i,j) => norm(tokens[j][0]) === "vorbei" &&
        /\bkein weg(?: daran)?$/u.test(tokens.slice(i+1,j).map(t => norm(t[0])).join(" "));
      const competingVerb = (i, head, crossedComma = false) => {
        if (context.separableNominalOffsets?.has(tokens[i].index)) return false;
        const entries = forms.get(norm(tokens[i][0])) || [];
        // S1: sein before a noun or an adjective is the possessive (breitete sein Tuch aus);
        // only in the first pass — across a comma it may be another clause's verb.
        if (!secondary && !crossedComma && possessiveSein(i)) return false;
        // L28 (links to-do, 20.10.2026): a declined form between a determiner and a capitalised noun is attributive
        // (wischte den verschütteten Trank … weg, die geöffnete Tür), not a second predicate.
        if (!crossedComma && i > 0 && tokens[i+1] && LOWERCASE_DECLINED_WORD.test(tokens[i][0]) &&
          /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\p{L}*|mein\p{L}*|dein\p{L}*|sein\p{L}*|ihr\p{L}*|unser\p{L}*|eur\p{L}*|dies\p{L}*|jen\p{L}*)$/u.test(norm(tokens[i-1][0])) &&
          /^\p{Lu}/u.test(tokens[i+1][0]) && /^\s+$/u.test(gap(i-1,i)) && /^\s+$/u.test(gap(i,i+1))) return false;
        // S1: an uninflected participle after a lexical finite verb is an adverbial
        // (stellte erleichtert fest, sah ihn verwirrt an), not a second predicate; not after
        // a comma (Er kommt, wie angekündigt, an — an insertion with its own predicate).
        if (head !== undefined && !crossedComma && tokens[i][0] === norm(tokens[i][0]) &&
          // A second finite verb cannot follow the finite head in its clause, so a
          // participle / finite homograph (erleichtert) is the participle here.
          (verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "participle") &&
          (verbAnalyses.get(norm(tokens[i][0])) || []).every(a => ["participle","finite","imperative"].includes(a.kind)) &&
          (verbAnalyses.get(norm(tokens[head][0])) || []).some(a => a.kind === "finite") &&
          !(verbAnalyses.get(norm(tokens[head][0])) || []).some(a => ["haben","sein","werden","bekommen","kriegen"].includes(a.base))) return false;
        if (norm(tokens[i][0]) === "bitte" || /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && entries.some(e => e.type === "Nomen")) return false;
        // C14 (17.10.2026): a finite verb is capitalised only at the start of a sentence (or after
        // a colon / quote); inside it a capital is a noun even without an own noun card
        // (wirft ihm Betrug vor — betrug of betragen; Verrat — imperative of verraten).
        // Only inside one clause: after a comma or und / oder / aber / als a capital may still start
        // a new predicate (the tentative second pass decides with noun evidence).
        if (!secondary && !crossedComma && /^\p{Lu}/u.test(tokens[i][0]) && !clauseInitial(sentence, tokens[i].index) &&
          !passable.has(norm(tokens[i-1]?.[0] ?? ""))) return false;
        // S2: stems known only from derived entries (qualifizierte) do not make a word a verb here.
        const possibleVerb = entries.some(e => e.type === "Verb") || (separatedForms.get(norm(tokens[i][0])) || []).some(pair => !pair.entry.derivedSeparable);
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
      // L7 (links chat, 23.10.2026; reference C1 addition 21.10 p. 1 — «ab und zu — не abgehen»): a word of an expression
      // found in the text is not the particle of a separable verb (ging auf und ab — gehen, not aufgehen / abgehen; gehen ab
      // und zu Essen — gehen). Expressions of adjacent words only (auf und ab, ab und zu, ein paar, vor allem), with their own
      // not_next / not_after conditions; a pair that is no expression (schloss auf und zu, ging auf und herein kam Harry —
      // elliptic or a new clause) keeps the particle.
      const expressionWord = j => {
        const word = k => norm(tokens[k]?.[0] ?? "");
        for (const {entry, m} of constructionAnchors.get(word(j)) || []) {
          // only conditions this check can test (form, not_next, not_after, clause_has); others — not here
          if (entry.type !== "Ausdruck" || m.scope !== "adjacent" || m.parts.some(part => part.optional || part.reflexive || !part.form ||
            Object.keys(part).some(key => !["form","not_next","not_after","clause_has"].includes(key)))) continue;
          const parts = m.parts.map(part => [].concat(part.form).map(f => String(f).trim().split(/\s+/u)));
          // every way to write the pattern word by word (one alternative per part)
          let spellings = [[]];
          for (const alts of parts) spellings = spellings.flatMap(sp => alts.map(a => [...sp, a]));
          for (const sp of spellings) {
            const flat = sp.flat(), lastOf = sp.map((a,n) => sp.slice(0,n+1).flat().length - 1);
            for (let off = 0; off < flat.length; off++) {
              const start = j - off;
              if (start < 0 || start + flat.length > tokens.length || norm(flat[off]) !== word(j)) continue;
              if (!flat.every((f,n) => norm(f) === word(start+n) && (!/^\p{Lu}/u.test(f) || /^\p{Lu}/u.test(tokens[start+n][0])) &&
                (n === 0 || /^\s+$/u.test(gap(start+n-1,start+n))))) continue;
              const first = m.parts[0], last = m.parts.at(-1), end = start + lastOf.at(-1);
              if (first.not_after && start > 0 && [].concat(first.not_after).map(norm).includes(word(start-1))) continue;
              if (last.not_next && end+1 < tokens.length && [].concat(last.not_next).map(norm).includes(word(end+1))) continue;
              // clause_has (bei jemandem ein und aus gehen — a form of gehen in the same part, not schaltete … ein und aus)
              let from = start, to = end;
              while (from > 0 && !hard(from-1,from) && !soft(from-1,from)) from--;
              while (to < tokens.length-1 && !hard(to,to+1) && !soft(to,to+1)) to++;
              const inPart = new Set(tokens.slice(from, to+1).map(t => norm(t[0])));
              if (m.parts.some(part => part.clause_has && ![].concat(part.clause_has).map(norm).some(w => inPart.has(w)))) continue;
              // E5: a finite verb right after the pattern and a verb before it whose particle is the first word — a new clause
              // follows (stand auf und davon wusste niemand): the first word stays the particle.
              const finiteAt = k => k < tokens.length && /^\p{Ll}/u.test(tokens[k][0]) && (verbAnalyses.get(word(k)) || []).some(a => a.kind === "finite") &&
                !(verbAnalyses.get(word(k)) || []).some(a => ["infinitive","participle"].includes(a.kind));
              if (end+1 <= to && finiteAt(end+1)) {
                let verbBefore = null;
                for (let k = start-1; k >= from; k--) if ((verbAnalyses.get(word(k)) || []).some(a => ["finite","imperative"].includes(a.kind)) && !(/^\p{Lu}/u.test(tokens[k][0]) && k > from)) { verbBefore = k; break; }
                if (verbBefore !== null && (verbAnalyses.get(word(verbBefore)) || []).filter(a => ["finite","imperative"].includes(a.kind))
                  .some(a => a.prefix && norm(a.prefix) === word(start) ||
                    (separableBases.get(norm(a.base)) || []).some(row => norm(row.prefix) === word(start) && !row.entry.derivedSeparable))) continue;
              }
              return true;
            }
          }
        }
        return false;
      };
      // A non-final particle can close the verbal bracket before a proven
      // adverbial continuation. Bare determiners/nouns remain preposition uses.
      const trailingAdverbial = j => {
        // G15b: a quantifier after the word is its object (es geht um mehr, als …).
        if (["mehr","weniger","etwas","nichts","alles","viel","wenig"].includes(norm(tokens[j+1]?.[0] ?? ""))) return false;
        // A lexical adverb can itself modify the following adverb (weiter abwärts).
        // L28 (links to-do, 20.10.2026): since the adjectives / adverbs transfer the directional particles have own adverb
        // cards (hinaus, hinein, nieder …); before a preposition the particle still closes the verb (ging hinaus in den
        // Wald, warf sie hinaus ins Wasser, blickte nieder auf ihren Fuß) — the PP gives the direction.
        // Only the two-part directional particles (hinaus, hinein, herum, hinüber, hervor, herunter …) and nieder; a bare
        // hin / her before a preposition stays the adverb (Wir fahren hin zum Bahnhof — reviewed exclusion).
        if ((forms.get(norm(tokens[j][0])) || []).some(e => ["Adverb","Adjektiv"].includes(e.type)) &&
            !(prepositions.has(norm(tokens[j+1]?.[0] ?? "")) && /^(?:(?:hin|her)\p{Ll}{2,}|nieder)$/u.test(norm(tokens[j][0])))) return false;
        let end = j + 1;
        while (end < tokens.length && !hard(end-1,end) && !soft(end-1,end)) end++;
        const entriesAt = k => forms.get(norm(tokens[k][0])) || [];
        // Temporal prepositions also take bare adverbs: ab morgen, vor heute.
        if (["ab","vor","nach","seit","von","bis","über","auf","für","zu"].includes(norm(tokens[j][0])) &&
            !prepositions.has(norm(tokens[j+1][0])) && !["wegen","trotz","während","innerhalb","außerhalb"].includes(norm(tokens[j+1][0]))) return false;
        const tailPreps = new Set([...prepositions,"wegen","trotz","während","innerhalb","außerhalb"]);
        const det = /^(?:der|die|das|den|dem|des|(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur)(?:e|en|em|er|es)?|(?:dies|jen)(?:e|en|em|er|es))$/u;
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
            // N1 (17.10.2026): a dative-only preposition never takes an -es adjective;
            // the noun belongs to the article particle (schenkte ihr ein bei ihr seltenes Lächeln).
            if (["aus","bei","mit","nach","seit","von","zu"].includes(key) &&
                tokens.slice(first, head).some(t => /es$/u.test(norm(t[0])))) return false;
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
          ARTICLE_WORD.test(norm(tokens[i-1][0])))) continue;
        // Short imperatives can be adjective homographs (besser). They must
        // not steal a particle from an earlier finite predicate in the segment.
        const stemEntries = forms.get(norm(tokens[i][0])) || [];
        if (stemEntries.some(e => ["Adjektiv","Adverb"].includes(e.type)) &&
            !(verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "finite") &&
            tokens.slice(start,i).some(t => (verbAnalyses.get(norm(t[0])) || []).some(a => a.kind === "finite"))) {
          if (selected === i) results.shortImperativeConflict = true;
          continue;
        }
        // S1: Sein before a noun or an adjective is the possessive (Sein Kopf fühlte sich an).
        if (tokens.slice(start,i).some((t,k) => !possessiveSein(start+k) && (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" &&
          ["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten","lassen"].includes(e.word)))) continue;
        let crossed = secondary;
        for (let j = i+1; j < tokens.length; j++) {
          if (stops(j-1,j)) break;
          if (soft(j-1,j)) crossed = true;
          // A particle must close its local segment; otherwise it may be a preposition.
          // G15b (16.10.2026): a number, #, % or an opening quote right after the
          // word is its prepositional object (stieg auf 219, ab 1. Januar, mit 6:4,
          // kam auf über 39 %, legt Wert auf "…").
          const after = sentence.slice(tokens[j].index + tokens[j][0].length);
          const prepositionalObject = /^\s*(?:\d|[#§%€$]|[„"«»‚‘'][\p{L}\d])/u.test(after);
          // S1: a comparison after the particle closes the bracket (sah aus wie ein Bär,
          // hörte sich an wie Flügel); not a question word phrase (an wie vielen Tagen).
          const comparison = norm(tokens[j+1]?.[0] ?? "") === "wie" && /^\s+$/u.test(gap(j,j+1)) &&
            !WIE_QUESTION_WORD.test(norm(tokens[j+2]?.[0] ?? ""));
          const closes = (j === tokens.length-1 || hard(j,j+1) || soft(j,j+1) || comparison) && !prepositionalObject;
          const trailing = !closes && !prepositionalObject && possible.some(pair => pair.prefix === norm(tokens[j][0])) && (trailingAdverbial(j) || trailingZuInfinitive(j));
          // "kein Weg (daran) vorbei" belongs to führen, not vorbeifahren.
          // S2: a graded adjective-like particle is the adverb (warf ihn so hoch, schnürte so fest,
          // dachte nicht weiter — but steht nicht fest stays feststehen); X und X is an idiom (nach und nach), not a particle.
          const graded = /^(?:hoch|fest|weit|weiter|frei|fertig|voll|näher|tief|nahe)$/u.test(norm(tokens[j][0])) &&
            (/^(?:so|zu|allzu|sehr|ganz|recht|ziemlich|gar|wie)$/u.test(norm(tokens[j-1]?.[0] ?? "")) || norm(tokens[j][0]) === "weiter" && norm(tokens[j-1]?.[0] ?? "") === "nicht") && /^\s+$/u.test(gap(j-1,j));
          const repeated = norm(tokens[j+1]?.[0] ?? "") === "und" && norm(tokens[j+2]?.[0] ?? "") === norm(tokens[j][0]);
          // L35 (links to-do, reference C1 addition 21.10, F12-C1aa / C1ab): hin right after vor + a reflexive pronoun is
          // the phrase «vor sich hin» (arbeitete still vor sich hin, murmelte vor sich hin), not the particle — except with
          // verbs of placing and holding, where it is literal (stellte es vor sich hin: hinstellen).
          const vorSichHin = norm(tokens[j][0]) === "hin" && reflexivePronouns.has(norm(tokens[j-1]?.[0] ?? "")) && norm(tokens[j-2]?.[0] ?? "") === "vor";
          // stellen / legen / setzen (reference F12-C1ab) and, by the reviewers 21.10, werfen, halten, strecken, breiten …
          const literalPlacing = pair => /^(?:sich\s+)?hin(?:stellen|legen|setzen|werfen|halten|strecken|breiten|hängen|schieben|stoßen|rücken|fallen|knien)$/u.test(norm(pair.entry.word || ""));
          // R6 (WN batch G39/G40, 21.10.2026): a separable verb only with sein and without an accusative (heimziehen,
          // einschlafen, aufstehen) takes no object: an accusative pronoun inside the bracket (zog ihn heim, er zog sie
          // heim) is the plain verb with an adverb (ziehen + heim «тащить домой»). A bare sie right after a verb that opens
          // a segment after a main clause (…, sprach der Junge, zog sie heim) may be subject or object: a choice. After a
          // subordinate clause (Als es Morgen wurde, stand sie auf) and with a word before the verb (Da schliefen sie ein)
          // sie is the subject; trat einen Schritt vor has no pronoun.
          const intransitiveSein = pair => /^verb-/u.test(String(pair.entry.id || "")) && String(pair.entry.auxiliary || "").trim() === "sein" &&
            !(pair.entry.complements || []).some(c => /Akkusativ/u.test(String(c.pattern || "")));
          const objectInside = (() => {
            // A pronoun after a preposition is no object (kehrte ohne ihn zurück, stand für dich auf — reviewers 21.10).
            // Only in the verb's own part: not inside a participle insertion (Er stand, ihn anstarrend, auf).
            const ownPart = k => !/[,;:–—()]/u.test(sentence.slice(tokens[i].index + tokens[i][0].length, tokens[i+1+k].index));
            if (tokens.slice(i+1,j).some((t,k) => ["ihn","mich","dich"].includes(norm(t[0])) && ownPart(k) && !prepositions.has(norm(tokens[i+k]?.[0] ?? "")))) return "proven";
            // L37 (links to-do, 22.10.2026): the subject pronoun right after the verb, then sie (Warum zog er sie heim?).
            const NOM = UNAMBIGUOUS_SUBJECT_PRONOUNS;
            if (NOM.includes(norm(tokens[i+1]?.[0] ?? "")) && norm(tokens[i+2]?.[0] ?? "") === "sie" && i+2 < j) return "proven";
            if (norm(tokens[i+1]?.[0] ?? "") !== "sie" || i+1 >= j) return null;
            // L37: one noun phrase before the verb that opens its clause is the subject (Der Junge zog sie heim, Gretel
            // zog sie heim): a nominative-capable determiner + up to two lowercase words + a noun, or a single name / noun;
            // not a preposition (Am Abend zog sie heim) nor an adverb (Dann zog sie heim).
            const segmentStart = start === 0 || /[.!?:;«»„“"]/u.test(sentence.slice(tokens[start-1].index + tokens[start-1][0].length, tokens[start].index)) ||
              soft(start-1,start) && norm(tokens[start-1][0]) !== "und";
            const NOM_DET = /^(?:der|die|das|ein|eine|mein|meine|dein|deine|sein|seine|ihr|ihre|unser|unsere|euer|eure|kein|keine|dieser|diese|dieses|jener|jene|jenes)$/u;
            // A capital inside the sentence is a noun (der Junge — not jung); at the clause start only an own noun
            // (reviewers 22.10: Wortlos, Hastig, Sonntags, Weihnachten stand / kehrte sie … are no subjects).
            const nounLike = k => /^\p{Lu}/u.test(tokens[k][0]) && !prepositions.has(norm(tokens[k][0])) &&
              (!clauseInitial(sentence, tokens[k].index) || (forms.get(norm(tokens[k][0])) || []).length > 0 && (forms.get(norm(tokens[k][0])) || []).every(e => e.type === "Nomen"));
            // der + a feminine / plural noun is dative or genitive (Der Mutter lief sie davon).
            const feminineAfterDer = norm(tokens[start][0]) === "der" && (forms.get(norm(tokens[i-1][0])) || []).some(e => e.type === "Nomen" && (String(e.article || "").trim() === "die" || norm(e.plural || "") === norm(tokens[i-1][0])));
            const ownPaired = (forms.get(norm(tokens[i][0])) || []).filter(e => e.type === "Verb" && !e.separable_prefix);
            const pairedPlain = ownPaired.some(e => String(e.auxiliary || "").trim() === "haben") && ownPaired.some(e => String(e.auxiliary || "").trim() === "sein");
            // A time noun is an adverbial, not the subject (Die ganze Zeit brach sie in Tränen aus).
            const TIME_NOUN = /^(?:nacht|zeit|tag|woche|monat|jahr|weile|stunde|minute|sekunde|moment|augenblick|abend|morgen|mittag|nachmittag|vormittag|sommer|winter|frühling|herbst|mal|zeitlang|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag|ostern|weihnachten|pfingsten|silvester|neujahr|frühjahr|wochenende|ferien|feierabend|dämmerung|zuhause)$/u;
            // Only for a plain verb with a haben and a sein card (ziehen): with stehen, laufen, fallen sie stays the subject.
            const npSubject = pairedPlain && !feminineAfterDer && segmentStart && i > start && i - start <= 4 && nounLike(i-1) && !TIME_NOUN.test(norm(tokens[i-1][0])) &&
              (i-1 === start || NOM_DET.test(norm(tokens[start][0])) && tokens.slice(start+1,i-1).every(t => /^\p{Ll}/u.test(t[0]) && !prepositions.has(norm(t[0]))));
            if (npSubject) return "proven";
            // A whole word (1980er is no pronoun).
            if (tokens.slice(start,i).some(t => UNAMBIGUOUS_SUBJECT_PRONOUNS.includes(norm(t[0])) && !/\d$/u.test(sentence.slice(0,t.index)))) return "proven";
            if (i !== start || start === 0 || !soft(start-1,start)) return null;
            // Only after a segment that itself opens with a finite verb (…«, sprach der Junge, zog sie heim): two verb-first
            // main clauses with one subject. After a subordinate, participle or zu clause (Als sie glaubte, er sei
            // eingeschlafen, stand sie auf; Verfroren …, kehrten sie … zurück; Und ohne … zu sprechen, kehrte sie sich um)
            // sie is the subject (reviewers / books 21.10).
            let prev = start-1; while (prev > 0 && !hard(prev-1,prev) && !soft(prev-1,prev)) prev--;
            // and only when the plain verb itself has a haben card next to a sein card (ziehen «тащить» / «переехать»):
            // stand sie auf, lief sie davon — sie cannot be the object of stehen / laufen.
            const own = (forms.get(norm(tokens[i][0])) || []).filter(e => e.type === "Verb" && !e.separable_prefix);
            const pairedVerb = own.some(e => String(e.auxiliary || "").trim() === "haben") && own.some(e => String(e.auxiliary || "").trim() === "sein");
            return pairedVerb && (verbAnalyses.get(norm(tokens[prev][0])) || []).some(a => a.kind === "finite") && /^\p{Ll}/u.test(tokens[prev][0]) ? "possible" : null;
          })();
          const pairs = (closes || trailing) && !nominalParticle(i,j) && !graded && !repeated && !expressionWord(j) && !/^[A-ZÄÖÜ]/u.test(tokens[j][0]) ? possible.filter(pair => pair.prefix === norm(tokens[j][0]) &&
            !(pair.entry.derivedSeparable && (crossed || trailing)) && !(vorSichHin && !literalPlacing(pair)) &&
            !(objectInside === "proven" && intransitiveSein(pair))) : [];
          if (pairs.length) {
            if (selected === i || selected === j) for (const pair of pairs) {
              const spans = [i,j].map(k => ({text:tokens[k][0],start:tokens[k].index,end:tokens[k].index + tokens[k][0].length}));
              results.push({...mainCandidate(pair.entry),construction:{id:"separable-verb",spans,
                ...(crossed || objectInside === "possible" && intransitiveSein(pair) ? {confidence:"tentative"} : {})}});
            }
            // A completed primary bracket must not consume a later particle.
            if (!crossed) break;
          }
          if (competingVerb(j, i, crossed)) break;
        }
      }
      // S1: a former / alternative spelling (niederknieen) yields to its standard
      // lemma found for the same words (niederknien); no choice between spellings.
      const spellingOf = r => {
        const m = (r.meanings || []).map(x => /\bspelling of ([\p{L}\p{M}]+)/iu.exec(String(x))?.[1]);
        return m.length && m.every(Boolean) && new Set(m).size === 1 ? norm(m[0]) : null;
      };
      const spanKey = r => JSON.stringify(r.construction.spans.map(x => x.start));
      const kept = results.filter(r => { const target = spellingOf(r); return !target || !results.some(o => o !== r && norm(o.lemma) === target && spanKey(o) === spanKey(r)); });
      if (kept.length !== results.length) { const flag = results.shortImperativeConflict; results.length = 0; results.push(...kept); if (flag) results.shortImperativeConflict = flag; }
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
          ['und','oder','aber','denn','sondern','doch','weil','dass','daß','wenn','ob','als','bevor','nachdem'].includes(norm(tokens[j+1][0]))));
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
        if(!/^[A-ZÄÖÜ]/u.test(t[0]) || !lexicalSeparated(key) &&
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
      const clauseWords=new Set(['und','oder','aber','denn','sondern','doch','weil','dass','daß','wenn','ob','als','bevor','nachdem']);
      const auxiliaries=new Set(['haben','sein','werden','können','müssen','dürfen','sollen','wollen','mögen','möchten','lassen']);
      for(let i=1;i<scoped.length;i++) {
        const t=scoped[i],key=norm(t[0]);
        if(/^[A-ZÄÖÜ]/u.test(t[0]) || !lexicalSeparated(key) &&
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
        if (!entries.some(e=>e.type==='Verb') && !lexicalSeparated(norm(t[0]))) continue;
        if (!DECLINED_ENDING.test(norm(t[0])) || /^[A-ZÄÖÜ]/u.test(t[0])) continue;
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
    const clauseGaps = Object.freeze({plain:/[,;:.!?“”„"()–—]/u,dashed:/[,;:.!?…“”„"«»()–—]/u});
    const clauseBoundaries = Object.freeze({
      verbGroup:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem"]),
      werden:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit"]),
      zu:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","um","ohne","statt","anstatt"]),
      futurePerfect:new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem","obwohl","während","falls","damit","sobald"])
    });
    // An own adjective / adverb entry with exactly this form (bestimmt, still, schnell).
    const adjectivalForm = word => (forms.get(norm(word)) || []).some(e => ["Adjektiv","Adverb"].includes(e.type) && norm(e.word) === norm(word));
    // L34 (links to-do, user 23.10): an own adjective card that names its verb and means something else (participle_of +
    // meaning_differs: gebildet «образованный» / bilden) — with werden, haben and und the form stays the verb's participle
    // (wurde … gebildet, Durham County wurde … aus Teilen des Orange County und des Wake County gebildet). bekannt and
    // verrückt stay «become» with werden (L26, named exceptions).
    // L34 (user 23.10, reviewers round 2): what stands between the determiner and an attributive participle with
    // participle_default verb / choice. A dependent of the participle — a preposition (der in Gold gefasste), von, damit /
    // dadurch, an adverb that is no adjective (die einmal / bereits gefasste), or neu / frisch (named by the user: die neu
    // gebildete, das frisch vermessene) — makes it the verb; a degree word the adjective; another adjective (ein humanistisch
    // gebildeter, ein politisch gewandter) or nothing — the reader's choice.
    const PARTICIPLE_DEGREE = ATTRIBUTE_DEGREE_WORDS;
    function attributiveParticipleReading(tokens, between) {
      const w = i => norm(tokens[i]?.[0] ?? "");
      if (between.some(i => PARTICIPLE_DEGREE.has(w(i)))) return "adjective";
      // An adjective: an own adjective card, or an unknown word with an adjective suffix (humanistisch, vielseitig, sprachlich).
      const adjectiveForm = x => ADJECTIVE_ENDINGS_WITH_BARE.some(e => x.endsWith(e) && (forms.get(x.slice(0,x.length-e.length)) || []).some(r => r.type === "Adjektiv" && norm(r.word) === x.slice(0,x.length-e.length))) ||
        !(forms.get(x) || []).length && /(?:isch|ig|lich|bar|sam|los|haft|voll|reich)$/u.test(x);
      const dependent = i => prepositions.has(w(i)) || ["von","vom","damit","dadurch"].includes(w(i)) || ["neu","frisch"].includes(w(i)) ||
        /^\p{Ll}/u.test(tokens[i][0]) && !adjectiveForm(w(i)) && !/^(?:und|oder|nicht)$/u.test(w(i));
      return between.some(dependent) ? "verb" : "choice";
    }
    const participleAdjectiveCard = word => (forms.get(norm(word)) || []).find(e => e.type === "Adjektiv" && norm(e.word) === norm(word) &&
      e.participle_of && e.meaning_differs && !["bekannt","verrückt"].includes(norm(word)));
    // L18 (links to-do, 20.10.2026): a lowercase form of an own adjective / adverb card (lange of lang) with no own verb
    // of that form is a modifier between the linked verbs, not a competing predicate (hat lange geschlafen — not langen).
    const separableParticles = new Set(entries.flatMap(e => e.separable_prefix ? [norm(e.separable_prefix)] : []));
    // A separable particle of an own verb (nahe of nahelegen, fest) keeps its old handling: it may belong to the verb.
    const ownModifierForm = word => /^\p{Ll}/u.test(word) && !(forms.get(norm(word)) || []).some(e => e.type === "Verb") && !separableParticles.has(norm(word)) &&
      (forms.get(norm(word)) || []).some(e => ["Adjektiv","Adverb"].includes(e.type));
    function verbalClause(word, context, consumer, boundaries, gap = clauseGaps.plain) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,consumer);
      const selected = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (selected < 0) return null;
      const gapAfter = a => clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[a+1].index));
      // A hesitation dash between a repeated word (in diese – diese Schule) does not end the clause.
      // (L58: a bracket holding only a number — wurde (1999) in Berlin gedreht — is no boundary either)
      const connected = (a,b) => { const text = clauseGapText(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index)).replace(/^\s*\(\s*\d+(?:[.,:\/–-]\d+)*\s*\)\s*$/u," ");
        return !gap.test(text) || b === a+1 && /^\s*[–—]\s*$/u.test(text) && norm(tokens[a][0]) === norm(tokens[b][0]); };
      // G15 (18.10.2026): a dash (– —) ends the clause like a comma (gefeiert – das ist …), but a short
      // insertion between two dashes is skipped (hat – wie immer – gelogen): the clause goes on after it
      // and the words inside never compete. Spaced hyphens ( - ) stay compound spelling (Kavallerie - Attacke).
      const insertionAfter = new Map(), insertionBefore = new Map(), pureDash = a => /^\s*[–—]\s*$/u.test(gapAfter(a));
      if (gap.test("–")) for (let a = 0; a+2 < tokens.length; a++) {
        if (!pureDash(a)) continue;
        for (let b = a+1; b+1 < tokens.length && b-a <= 10; b++) {
          const g = gapAfter(b);
          if (/[–—]/u.test(g)) { if (pureDash(b) && (selected <= a || selected > b)) { insertionAfter.set(a,b+1); insertionBefore.set(b+1,a); } break; }
          if (gap.test(g)) break;
        }
      }
      // Gaps (links chat, 24.10.2026; train: ~170 passives): a short insertion in brackets or quotes inside the clause
      // (wird die Einheit CI5 (Criminal Intelligence 5) gegründet; der Spielfilm "Soldatensender Calais" … produziert) is
      // skipped like the one between dashes: the clause goes on after it and the words inside never compete.
      const OPEN = /^\s*[(„»“"]\s*$/u, CLOSE = /^\s*[)“«”"]\s*$/u, pairOf = {"(":")","„":"“","»":"«","“":"”","\"":"\""};
      for (let a = 0; a+2 < tokens.length; a++) {
        // (numbers are no tokens: Intelligence 5) — the digits stand in the gap)
        const g = gapAfter(a).replace(/\d+(?:[.,:]\d+)*/gu, " "); if (!OPEN.test(g) || !/^\s/u.test(g)) continue;
        // (a determiner before it makes the quoted word its noun — Meinen "Flitzer" habe ich … gekauft: no insertion, as before)
        if (/^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\p{L}*|mein\p{L}*|dein\p{L}*|sein\p{L}*|ihr\p{L}*|unser\p{L}*|eur\p{L}*|dies\p{L}*|jen\p{L}*|jed\p{L}*|welch\p{L}*)$/u.test(norm(tokens[a][0]))) continue;
        const open = g.trim(), close = pairOf[open];
        for (let b = a+1; b+1 < tokens.length && b-a <= 12; b++) {
          const h = gapAfter(b).replace(/\d+(?:[.,:]\d+)*/gu, " ");
          if (h.trim() === close && CLOSE.test(h)) { if ((selected <= a || selected > b) && !insertionAfter.has(a)) { insertionAfter.set(a,b+1); insertionBefore.set(b+1,a); } break; }
          if (gap.test(h)) break;
        }
      }
      const skipped = new Set(), skip = (a,b) => { for (let i = a+1; i < b; i++) skipped.add(i); };
      // G15 (19.10.2026): und / oder / als between nominal parts does not end the clause (wurden Schulungen und
      // Weiterbildungen … durchgeführt; wird als Keltiberische Schrift bezeichnet; wurde 1963 als … gegründet).
      // Only when the word after it is nominal or a modifier (not a possible verb, not a subject pronoun), the
      // word before it is not a possible verb other than an auxiliary / modal (hat gegessen und … stays split),
      // and the part after it up to the next stop has at most one possible verb, as its last word.
      const joinWords = new Set(["und","oder","als"]), subjectWords = SUBJECT_PRONOUNS;
      const headVerbs = new Set(["haben","sein","werden","können","müssen","dürfen","sollen","wollen","mögen","möchten"]);
      // (L14, gaps 24.10: a participle of an own verb that only the verb index knows — erneuert — is a verb form too:
      // wurde komplett erneuert und die Beschilderung umgestellt keeps erneuert with wurde)
      const verbish = i => (forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Verb") || lexicalSeparated(norm(tokens[i][0])) ||
        (reflexiveForms.get(norm(tokens[i][0])) || []).length > 0 ||
        /^\p{Ll}/u.test(tokens[i][0]) && (verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "participle");
      const capitalNoun = i => /^\p{Lu}/u.test(tokens[i][0]) && !clauseInitial(sentence, tokens[i].index);
      const joinable = k => {
        const w = norm(tokens[k]?.[0] ?? "");
        // Verb + preposition pairs keep the strict clause: a preposition after und belongs to a noun as often as to
        // the verb (einen Handel mit Töpfen und irdenem Geschirr anfangen — mit belongs to Handel).
        if (consumer === 'verbPrepositionLink') return false;
        if (!joinWords.has(w) || k < 1 || k+1 >= tokens.length || !connected(k-1,k) || !connected(k,k+1)) return false;
        const next = norm(tokens[k+1][0]);
        if (subjectWords.has(next) || ["ob","auch","wenn","dass","daß","wie","wo","wohin","woher","was","wer","warum","weshalb","wann","weil","da","damit","sobald","bevor","nachdem","obwohl","während","sondern","denn"].includes(next)) return false;
        // An -ieren infinitive / form of a verb only the external dictionary knows (fungieren und …) is a predicate too.
        if (!verbish(k-1) && /^\p{Ll}[\p{L}]*ier(?:en|t|te|ten)$/u.test(tokens[k-1][0])) return false;
        if (!(capitalNoun(k+1) || /^\d/u.test(tokens[k+1][0]) || !verbish(k+1))) return false;
        // Before it only a finite auxiliary / modal may stand (wird als …), not an infinitive or participle that
        // closes a predicate (wieder da sein und … sagen, General sein und … anführen).
        const prevWord = norm(tokens[k-1][0]);
        const closingForm = ["sein","haben","werden","können","müssen","dürfen","sollen","wollen","mögen","gewesen","gehabt","geworden","worden"].includes(prevWord);
        if (verbish(k-1) && !capitalNoun(k-1) && (closingForm || !(forms.get(prevWord) || []).some(e => e.type === "Verb" && headVerbs.has(e.word)))) return false;
        // A participle shape of a verb only the external dictionary knows (abgeschnallt und … gelegt) also closes it.
        // (L14, gaps 24.10: also without ge- — an inseparable prefix or -iert: wurde komplett erneuert und die Beschilderung umgestellt)
        if (!verbish(k-1) && /^\p{Ll}[\p{L}]*ge\p{Ll}{2,}(?:t|en)$|^ge\p{Ll}{2,}(?:t|en)$|^(?:be|er|ent|emp|ver|zer|miss)\p{Ll}{3,}t$|^\p{Ll}{3,}iert$/u.test(tokens[k-1][0]) && !/^un/u.test(tokens[k-1][0]) && !adjectivalForm(tokens[k-1][0])) return false;
        // A verb-final cluster before it (das getan hatte und …, zu sehen war und …, verspätet hatten und …,
        // hinken mußte und …) closes its clause; a lowercase word in -t / -en before the auxiliary counts as a verb.
        if (verbish(k-1) && k > 1 && connected(k-2,k-1) && (verbish(k-2) && !capitalNoun(k-2) || norm(tokens[k-2][0]) === "zu" ||
          /^\p{Ll}[\p{L}]*(?:t|en|n)$/u.test(tokens[k-2][0]) && !/^(?:den|einen|keinen|meinen|deinen|seinen|ihren|unseren|euren|diesen|jeden|allen|wen|wann|dann|denn|wenn|nun|schon|nicht|recht|jetzt|erst|oft|selten)$/u.test(norm(tokens[k-2][0])))) return false;
        // The part after it runs to the next stop; a further und / oder / als followed by a possible verb or a
        // subject pronoun starts another predicate (… gekauft und ist gegangen).
        const stopsBefore = j => boundaries.has(norm(tokens[j][0])) && (!joinWords.has(norm(tokens[j][0])) || !tokens[j+1] ||
          subjectWords.has(norm(tokens[j+1][0])) || verbish(j+1) && !capitalNoun(j+1));
        let r = k+1;
        while (r+1 < tokens.length && connected(r,r+1) && !stopsBefore(r+1)) r++;
        // An attributive word between a determiner and a noun (die gleichen Werte) or an own adjective form is no predicate.
        const attributive = i => adjectivalForm(tokens[i][0]) && participleAdjectiveCard(tokens[i][0])?.participle_default !== "verb" || i > 0 && i+1 < tokens.length && /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\w*|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|eur\w*|dies\w*|jed\w*|all\w*)$/u.test(norm(tokens[i-1][0])) && capitalNoun(i+1);
        // L33 (links to-do, 22.10.2026): the last word may be a participle the own forms list only as an adjective
        // (wurden nach Rang und Stand geordnet — geordnet has an own adjective card).
        const participleAt = i => (verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "participle");
        // Only when und / oder joins two nouns (Rang und Stand, Mägden und Knechten; not wurde müde und tief enttäuscht,
        // wurde Meister und die Gesellen begeistert — review 22.10): the noun before it and a noun or a preposition after it.
        // Not after mit / bei / vor / aus (a cause of a state: wurde mit Alter und Erfahrung gelassen, bei Hitze und Staub erschöpft)
        // and not for a verb with sein only (in Angst und Schrecken erstarrt: no passive).
        let ppHead = -1; for (let j = k-1; j >= 0 && j >= k-5; j--) if (prepositions.has(norm(tokens[j][0]))) { ppHead = j; break; }
        const causePP = ppHead >= 0 && /^(?:mit|bei|vor|aus)$/u.test(norm(tokens[ppHead][0]));
        const seinOnly = i => { const own = (verbAnalyses.get(norm(tokens[i][0])) || []).filter(a => a.kind === "participle" && a.entry);
          return own.length > 0 && own.every(a => a.entry.auxiliary === "sein"); };
        const nounJoin = capitalNoun(k-1) && (capitalNoun(k+1) || prepositions.has(norm(tokens[k+1][0]))) && !causePP;
        const inside = []; for (let i = k+1; i <= r; i++) if (!joinWords.has(norm(tokens[i][0])) && !capitalNoun(i) &&
          (verbish(i) && !attributive(i) || i === r && nounJoin && participleAt(i) && !seinOnly(i) && !(i > 0 && ARTICLE_WORD.test(norm(tokens[i-1][0]))))) inside.push(i);
        // L17 (links to-do, 21.10.2026): after als the predicate may be a verb-final cluster (als Sachsenvelt … erwähnt
        // worden sein): a participle / infinitive followed by at most two closing auxiliaries / modals, contiguous, as the
        // last words. Not after und / oder: there können / werden … may be the finite verb of a new subject (und die
        // Kinder gepflegt werden müssen — reviewers 21.10).
        const CLUSTER = new Set(["sein","haben","werden","worden","gewesen","geworden","können","müssen","dürfen","sollen","wollen","mögen"]);
        if (w === "als" && inside.length > 1) return inside.length <= 3 && inside[inside.length-1] === r && inside.every((i,n) => i === inside[0] + n) &&
          inside.slice(1).every(i => CLUSTER.has(norm(tokens[i][0])));
        return inside.length === 1 && inside[0] === r;
      };
      let start = selected, end = selected;
      for (;;) {
        if (start > 0 && connected(start-1,start) && (!boundaries.has(norm(tokens[start-1][0])) || joinable(start-1))) { start--; continue; }
        const a = insertionBefore.get(start);
        if (a !== undefined && !boundaries.has(norm(tokens[a][0]))) { skip(a,start); start = a; continue; }
        break;
      }
      for (;;) {
        if (end+1 < tokens.length && connected(end,end+1) && (!boundaries.has(norm(tokens[end+1][0])) || joinable(end+1))) { end++; continue; }
        const b = insertionAfter.get(end);
        if (b !== undefined && !boundaries.has(norm(tokens[b][0]))) { skip(end,b); end = b; continue; }
        break;
      }
      const matches = i => { const key = norm(tokens[i]?.[0]); return [...(forms.get(key) || []),...(oldVerbForms.get(key) || [])]; };
      // C14 (17.10.2026): a phrase verb (Rad fahren) takes part only when its other words stand in the clause
      // (zu fahren / gefahren sein are fahren, not Rad fahren).
      const clauseWords = new Set(); for (let i = start; i <= end; i++) clauseWords.add(norm(tokens[i][0]));
      const phraseFits = e => norm(e.word).replace(/^sich\s+/u,"").split(/\s+/u).slice(0,-1).every(w => clauseWords.has(w));
      const verbs = i => { const rows = matches(i).filter(e=>e.type === "Verb" && phraseFits(e));
        const phrases = rows.filter(e => /\s/u.test(norm(e.word).replace(/^sich\s+/u,"")));
        return phrases.length ? phrases : rows; };
      // Finite form of a dictionary verb in one tense (forms table, own data).
      const finiteIn = (e,i,tense) => Object.values(formsOf(e)[tense] || {}).some(f => [norm(f),oldSpelling(norm(f))].includes(norm(tokens[i][0])));
      // C14 step 2 (17.10.2026): a capital inside the sentence is a noun, not a participle (in Verdacht ≠ verdacht
      // of verdenken); the sentence start and an all-capitals word (VERRÜCKT GEWORDEN) keep the participle.
      const nounCapital = i => /^\p{Lu}/u.test(tokens[i][0]) && tokens[i][0] !== tokens[i][0].toUpperCase() && !clauseInitial(sentence, tokens[i].index);
      const participleOf = (e,i) => norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[i][0]) && !nounCapital(i);
      // Nominal facts: a capitalised dictionary noun, a possessive before it.
      const nounToken = i => /^[A-ZÄÖÜ]/u.test(tokens[i][0]) && matches(i).some(e=>e.type === "Nomen");
      const possessiveBeforeNoun = i => POSSESSIVE_WORD.test(norm(tokens[i][0])) &&
        i+1 <= end && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) && matches(i+1).some(e=>e.type === "Nomen");
      // A declined modifier inside a confirmed noun group (die geplanten Arbeiten)
      // is not a competing predicate (offsets supplied by verbConstruction).
      // C14 step 1 (17.10.2026): inside the clause a lowercase word that is also an own adjective /
      // adverb of the same form (bestimmt, still, bekannt) is a modifier, not a competing predicate
      // (wird euch bestimmt wieder buchen); a capital inside the sentence is a noun (hörte er
      // Schritte — schritte of schreiten); so is a participle right before the closing verb of a
      // modal / Futur group (müssen … gewälzt haben, würde … ertragen können). Elsewhere a participle
      // stays competing: it may be the main verb (wird zerstreut … genutzt) or a Perfekt of its own
      // (hat versucht, mich umzubringen; strict for haben / sein + zu).
      const middleModifier = (i, strict = false) => /^\p{Lu}/u.test(tokens[i][0]) ? !clauseInitial(sentence, tokens[i].index) :
        adjectivalForm(tokens[i][0]) || ownModifierForm(tokens[i][0]) || !strict && (i === end-1 || i === end-2 && verbs(end-1).length) && verbs(i).some(e=>participleOf(e,i));
      // Gaps (links chat, 24.10.2026; train: 49 passives): a declined form right before a noun, after a verb, a determiner, a
      // number or a preposition, is attributive (werden vereinbarte Termine auch eingehalten), not a second predicate.
      const DECLINED_BEFORE = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\p{L}*|mein\p{L}*|dein\p{L}*|sein\p{L}*|ihr\p{L}*|unser\p{L}*|eur\p{L}*|dies\p{L}*|jen\p{L}*|jed\p{L}*|welch\p{L}*|all\p{L}*|viel\p{L}*|wenig\p{L}*|mehrere|einig\p{L}*|beid\p{L}*|manch\p{L}*|solch\p{L}*|\d+)$/u;
      // (review 24.10: not a bare Partizip II / infinitive — hat begonnen Bücher zu schreiben, werden gebeten Platz zu nehmen;
      // an attributive form has its own ending: begonnenen, gebetene)
      const attributiveForm = i => i > start && i < end && LOWERCASE_DECLINED_WORD.test(tokens[i][0]) && nounToken(i+1) &&
        !verbs(i).some(e => participleOf(e,i) || norm(e.word) === norm(tokens[i][0])) &&
        !/[,;:.!?()–—"„“»«]/u.test(sentence.slice(tokens[i].index + tokens[i][0].length, tokens[i+1].index)) &&
        (DECLINED_BEFORE.test(norm(tokens[i-1][0])) || prepositions.has(norm(tokens[i-1][0])) || verbs(i-1).some(e => ["Präsens","Präteritum","Konjunktiv II"].some(t => finiteIn(e,i-1,t))));
      const possibleVerb = i => (verbs(i).length || lexicalSeparated(norm(tokens[i][0]))) && !context.attributiveOffsets?.has(tokens[i].index) && !attributiveForm(i);
      // A word between the linked words that can block the link (a competing predicate).
      const competing = (i, strict = false) => possibleVerb(i) && !middleModifier(i, strict);
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      return {sentence,tokens,selected,start,end,indices:Array.from({length:end-start+1},(_,i)=>start+i).filter(i=>!skipped.has(i)),
        connected,matches,verbs,finiteIn,participleOf,nounToken,possessiveBeforeNoun,possibleVerb,competing,span};
    }
    function zuGroup(word, context) {
      const clause = verbalClause(word,context,'zuGroup',clauseBoundaries.zu);
      if (!clause) return null;
      const {tokens,selected,start,end,indices,matches,verbs,finiteIn,possessiveBeforeNoun} = clause;
      const finite = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].some(t=>finiteIn(e,i,t));
      // (L23, train check 24.10: a modal in Konjunktiv I after und is the next predicate, as before: habe … zu schweigen und könne …)
      if (COORDINATORS_WITHOUT_COMMA.includes(norm(tokens[end+1]?.[0])) && (verbs(end+2).length && !DERIVED_KONJ1.has(norm(tokens[end+2]?.[0] ?? "")) || norm(tokens[end+2]?.[0]) === "zu")) return null;
      const heads = indices.flatMap(i=>verbs(i).filter(e=>ZU_CONSTRUCTION_HEADS.includes(e.word) && finite(e,i)).map(e=>({i,e})));
      const nounComplements = new Set(["lust","zeit","angst","gelegenheit","möglichkeit","recht","grund","chance","mut","erlaubnis","plan","absicht","wunsch","interesse","freude","problem","schwierigkeit","geld"]);
      const mannerWords = new Set(["leicht","schwer","einfach","gut","schlecht","kaum","unmöglich",
        // Degree and sentence adverbs that are adjectives in the dictionary (Das ist wirklich zu empfehlen).
        "wirklich","echt","absolut","durchaus","eigentlich","ganz","besonders","bestens","wärmstens","weiter","sehr"]);
      const result = [];
      for (const head of heads) {
        let tail = head.i === end ? end-1 : end;
        let lexical = head.e, participleIndex = null;
        const past = verbs(tail).filter(e=>PERFECT_AUXILIARIES.includes(e.word) && norm(e.auxiliary) === head.e.word && norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[tail][0]));
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
        if (other.some(i=>clause.competing(i,true) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
        // A comparison inside (das Gleiche wie Truppen … zu führen) is not sein / haben + zu.
        if (other.some(i=>i > Math.min(head.i,tail) && i < Math.max(head.i,tail) && COMPARISON_PARTICLES.includes(norm(tokens[i][0])))) continue;
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
    // To-do 3.12 (reference G6, user 18.10 / 19.10): verbs that change their meaning with zu like modal verbs
    // (scheinen «кажется», brauchen «нужно» — only with nicht / nur / kaum / kein…, wissen «уметь», pflegen, vermögen)
    // join the zu group before them: schien … zu … fürchten, schien … gekommen zu sein (A6). drohen, versprechen,
    // verstehen and bleiben depend on the sense and are not taken. Without zu the verb keeps its own meaning.
    const G6_VERBS = new Set(["scheinen","brauchen","wissen","pflegen","vermögen"]);
    async function zuInfinitiveGroup(word, context) {
      if (!Number.isInteger(context?.tokenOffset)) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'zuInfinitiveGroup');
      const clicked = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (clicked < 0) return null;
      const gapAfter = i => tokens[i+1] ? sentence.slice(tokens[i].index+tokens[i][0].length,tokens[i+1].index) : '';
      const breaks = i => /[,.;:!?()\[\]–—"“”„«»]/u.test(gapAfter(i));
      const finiteRows = async i => /^\p{Ll}/u.test(tokens[i][0]) || i === 0 ?
        (await tokenAnalyses(tokens[i][0],undefined,'zuInfinitiveGroup')).filter(a => a.kind === 'finite') : [];
      // The G6 verb before the zu group in the same clause part; another finite verb on the way stops the search.
      const headBefore = async first => {
        let skippedPredicate = false;
        for (let i = first-1; i >= 0 && !breaks(i); i--) {
          // L41 (links to-do, 22.10.2026; reference R-ud-05): the predicate right before zu sein / zu werden — a participle or an
          // own adjective form that is also a finite form (überfordert, verletzt: er überfordert) — is no other finite verb
          // (Das Personal scheint manchmal etwas überfordert zu sein).
          if (i === first-1 && /^\p{Ll}/u.test(tokens[i][0]) && PREDICATIVE_SEIN_WERDEN.includes(norm(tokens[first+1]?.[0] ?? "")) && (adjectivalForm(tokens[i][0]) ||
              (await tokenAnalyses(tokens[i][0],undefined,'zuInfinitiveGroup')).some(a => a.kind === 'participle'))) { skippedPredicate = true; continue; }
          const rows = await finiteRows(i);
          if (!rows.length) continue;
          // Every finite reading is the same G6 verb; its card comes from the readings that carry one.
          // (only scheinen / brauchen take such a predicate: wissen / pflegen + object + participle — weiß ihn verärgert zu sehen — not; review 22.10)
          if (rows.every(a => G6_VERBS.has(norm(a.base))) && new Set(rows.map(a => norm(a.base))).size === 1 && rows.some(a => a.entry))
            return skippedPredicate && !["scheinen","brauchen"].includes(norm(rows[0].base)) ? null : {i,rows:rows.filter(a => a.entry)};
          return null;
        }
        return null;
      };
      let inner = null, head = null, headClick = false;
      const own = norm(tokens[clicked-1]?.[0] ?? '') === 'zu' ? [] : await finiteRows(clicked);
      if (own.length && own.every(a => G6_VERBS.has(norm(a.base))) && own.some(a => a.entry)) {
        // A click on the G6 verb: the zu group after it in the same clause part.
        for (let j = clicked+1; tokens[j] && !breaks(j-1); j++) {
          if (norm(tokens[j][0]) !== 'zu') continue;
          inner = await zuInfinitiveGroupBase(tokens[j][0],{...context,tokenOffset:tokens[j].index},j);
          headClick = !!inner;
          break;
        }
      }
      if (!inner) inner = await zuInfinitiveGroupBase(word,context,clicked);
      if (!inner) return null;
      const indexOf = span => tokens.findIndex(t => t.index === span.start);
      const first = Math.min(...inner.spans.map(indexOf));
      if (first > 0 && !inner.conjunction) head = await headBefore(first);
      if (headClick && (!head || head.i !== clicked)) return null;
      if (!head) return inner;
      const verb = norm(head.rows[0].base), between = tokens.slice(head.i+1,first).map(t => norm(t[0]));
      if (verb === "brauchen" && !between.some(w => /^(?:nicht|nur|kaum|bloß|niemand|nichts|kein\p{L}*)$/u.test(w))) return inner;
      const tenses = new Set(head.rows.map(a => a.tense));
      const tense = tenses.size === 1 && tenses.has("Präteritum") ? "Präteritum" : null;
      const {roles,main,marker,meaning,meaningLemma,conjunction,...innerConstruction} = inner;
      const headSpan = {text:tokens[head.i][0],start:tokens[head.i].index,end:tokens[head.i].index+tokens[head.i][0].length};
      return {id:'modal-zu',verb,tense,lemma:inner.lemma,inner:innerConstruction,roles:[head.rows[0].entry,...roles],main,marker,
        note:{ru:`${verb} + zu`,en:`${verb} + zu`},spans:[headSpan,...inner.spans]};
    }
    async function zuInfinitiveGroupBase(word, context, clickedIndex) {
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
        // C14: a phrase verb (Rad fahren) only with its other words in the sentence (zu fahren ≠ Rad fahren).
        const sentenceWords = new Set(tokens.map(t => norm(t[0])));
        const phraseWords = e => norm(e.word).replace(/^sich\s+/u,"").split(/\s+/u).slice(0,-1);
        if (entries.length > 1) {
          entries = entries.filter(e => phraseWords(e).every(w => sentenceWords.has(w)));
          // …and with them the phrase itself (Rad zu fahren).
          const phrases = entries.filter(e => phraseWords(e).length);
          if (phrases.length) entries = phrases;
        }
        if (!rows.length) {
          // A verb known only to the additional dictionary: its lemma is this very spelling.
          const morph = await collectMorphology(tokens[v][0],{discoverModifiers:false},'zuInfinitiveGroup');
          if (morph.errors.length) return null;
          const lemmasHere = [...new Set(morph.analyses.filter(a => a.kind === 'lemma' && canonicalPos(a.pos) === 'Verb' &&
            norm(a.lemma) === norm(tokens[v][0])).map(a => a.lemma))];
          if (lemmasHere.length === 1) entries = [{word:lemmasHere[0],type:'Verb'}];
        }
        // A plain verb and its sich-twin (langweilen / sich langweilen, 19.10 transfer WN-349): a reflexive
        // pronoun in the same clause part before zu picks the sich card, otherwise the plain one.
        const bare = e => norm(e.word).replace(/^sich\s+/u,"");
        if (entries.length > 1 && new Set(entries.map(bare)).size === 1) {
          let reflexiveNear = false;
          for (let i = z-1; i >= 0 && !breaks(i); i--) if (reflexivePronouns.has(norm(tokens[i][0]))) { reflexiveNear = true; break; }
          const pick = entries.filter(e => /^sich\s/u.test(norm(e.word)) === reflexiveNear);
          if (pick.length) entries = pick;
        }
        // To-do 3.12: only a sich card and no reflexive pronoun before zu (etwas zu fürchten): the plain verb of the
        // additional dictionary, not the reflexive card.
        // Only when the whole sentence has no reflexive pronoun: sich may stand before an insertion between commas
        // (bis sich … der Freund, ganz gegen Georgs Absicht, für diese Merkwürdigkeit zu interessieren begann).
        if (entries.length && entries.every(e => /^sich\s/u.test(norm(e.word))) && !tokens.some(t => reflexivePronouns.has(norm(t[0]))))
          entries = [{word:bare(entries[0]),type:'Verb'}];
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
        // A6: the first word of the chain before zu (sterben zu können, geträumt zu haben).
        let chainHead = false;
        if (!found && norm(tokens[clicked+1]?.[0] ?? '') === 'zu') { found = await core(clicked+1); chainHead = !!found; }
        if (!found) return null;
        let start = found.z;
        while (start > 0 && !breaks(start-1)) start--;
        if (start < found.z && openerAt(start)) opener = start;
      }
      if (opener !== null) conjunction = openerAt(opener);
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index+tokens[i][0].length});
      const {z,v,entries} = found;
      // C18 (2) / reference A6 (18.10.2026): the infinitive chain before zu — a perfect infinitive (geträumt zu haben,
      // gewesen zu sein: the participle must take this auxiliary, else it is a state, G2) or a modal infinitive
      // (sterben zu können). Only the chain is highlighted (12.1, p. 4), with um / ohne / statt when they open it.
      const second = norm(tokens[v][0]), before = z-1;
      if (before >= 0 && joinedTokens(sentence,tokens,before,z) && /^\p{Ll}/u.test(tokens[before][0]) && (opener === null || before > opener)) {
        // Own cards only (a derived «particle + verb» entry such as ablesen is not a card of its own).
        const rows = (forms.get(norm(tokens[before][0])) || []).filter(e => e.type === "Verb" && /^verb-\d+$/u.test(String(e.id || "")));
        let lexical = [], kind = null;
        const degreeBefore = STATE_DEGREE_WORDS.includes(norm(tokens[before-1]?.[0] ?? ""));
        if (PERFECT_AUXILIARIES.includes(second) && !(second === "sein" && degreeBefore)) {
          lexical = rows.filter(e => norm(String(e.perfect_form || "").split(/\s+/).pop()) === norm(tokens[before][0]) &&
            String(e.auxiliary || "").split(/\s*\/\s*|\s+/u).includes(second));
          kind = "perfect";
        } else if (["können","müssen","dürfen","sollen","wollen","mögen"].includes(second)) {
          lexical = rows.filter(e => norm(e.word) === norm(tokens[before][0]));
          kind = "modal";
        }
        const plainRows = lexical.filter(e => !/^sich\s/u.test(norm(e.word)));
        if (plainRows.length && !tokens.some(t => ["sich","mich","dich","uns","euch"].includes(norm(t[0])))) lexical = plainRows;
        if (kind && lexical.length && new Set(lexical.map(e => norm(e.word).replace(/^sich\s+/u,""))).size === 1) {
          const lemma = String(lexical[0].word).replace(/^sich\s+/u,"");
          const linked = [...(opener !== null ? [opener] : []),before,z,v];
          return {id:'zu-chain',chain:kind,label:kind === "perfect" ? "Perfekt" : "Modal",lemma,modal:kind === "modal" ? second : null,
            conjunction:conjunction || null,conjunctionWord:conjunction ? norm(conjunction.word) : null,roles:[...lexical,...entries,...(conjunction ? [conjunction] : [])],main:lexical[0],marker:clicked === z,
            clickedRole:kind === "perfect" && clicked === v ? "auxiliary" : null,
            note:kind === "perfect" ? {ru:'Perfekt · zu + инфинитив',en:'Perfekt · zu + infinitive'} : {ru:'модальный + zu + инфинитив',en:'modal + zu + infinitive'},
            spans:linked.map(span)};
        }
      }
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
      // C18 (18.10.2026): without a reflexive pronoun in the clause the plain card of a verb with a reflexive twin
      // is the one (wurde an ihn gerichtet, sollte gerichtet werden: richten, not sich richten); before, the two
      // cards made the group ambiguous and werden fell back to «become».
      const reflexiveInClause = indices.some(i=>reflexivePronouns.has(norm(tokens[i][0])));
      // A spelling that is also an own adjective (bekannt: wurde … bekannt «became known», not bekennen) keeps
      // both cards, so werden stays «become» as before.
      // L26 (links to-do, 20.10.2026): after the adjectives transfer many participles with a sich-twin have an own
      // adjective card (verletzt, gezwungen, überzeugt, gefürchtet, überarbeitet …); with werden they are the passive of
      // the plain verb. Only bekannt and verrückt stay «become» (wurde … bekannt «стал известен», not bekennen;
      // wird verrückt werden «сойдёт с ума», not verrücken) — named exceptions, recorded in RESOLVER_LINKS_TODO_RU.md (L26).
      const becomeAdjectives = new Set(["bekannt","verrückt"]);
      const untwin = (rows, i = null) => reflexiveInClause || i !== null && becomeAdjectives.has(norm(tokens[i][0])) ? rows :
        (rows.some(e=>!/^sich\s/u.test(norm(e.word))) ? rows.filter(e=>!/^sich\s/u.test(norm(e.word))) : rows);
      const participles = i => untwin(verbs(i).filter(e=>clause.participleOf(e,i)),i);
      const infinitives = i => verbs(i).filter(e=>norm(e.word) === norm(tokens[i][0]) && /^[a-zäöü]/u.test(tokens[i][0]));
      // G15 step 4 (16.10.2026): a following «und / oder + verb» starts another
      // predicate (wurde verhaftet und starb) or shares the auxiliary (hat …
      // gerufen und … gesagt); the pair before it is complete either way.
      const heads = indices.flatMap(i=>verbs(i).filter(e=>["werden","sein"].includes(e.word) && tenses(e,i).length).map(e=>({i,e})));
      const result = [];
      // G15a (16.10.2026): an infinitive werden is not the finite head of a
      // Futur / passive group: werden directly before a modal, zu or lassen
      // (lang werden können, wirksam werden zu lassen), or werden closing a
      // clause that has a finite modal (konnte … aufrechterhalten werden).
      const modalSet = MODAL_VERB_SET;
      const finiteModal = i => verbs(i).some(e=>modalSet.has(e.word) && ["Präsens","Präteritum","Konjunktiv II",...konj1At(tokens,i)].some(t=>finite(e,i,t)));
      const infinitiveWerden = i => norm(tokens[i][0]) === "werden" && (norm(tokens[i+1]?.[0] ?? "") === "zu" ||
        i < end && verbs(i+1).some(e=>modalSet.has(e.word) || e.word === "lassen") ||
        i === end && indices.some(j=>j !== i && finiteModal(j)));
      // C18 (18.10.2026), reference F12-B8: Futur I / Konjunktiv II of the passive — finite werden + participle +
      // the infinitive werden closing the clause (wird … gesehen werden, würde … verwiesen werden, dass er gesehen
      // werden wird). A participle that is an own adjective (bekannt, verrückt) or follows a degree word is
      // «become» (wird bald bekannt werden — Futur I mit werden, as before).
      const degreeWords = BECOME_DEGREE_WORDS;
      const futurePassive = [];
      for (const head of heads) {
        if (head.e.word !== "werden") continue;
        const tense = tenses(head.e,head.i), mood = tense.includes("Konjunktiv II") ? "Konjunktiv II" : tense.includes("Präsens") ? "Futur I" : null;
        const aux = head.i === end ? end-1 : end, part = aux-1;
        if (!mood || norm(tokens[aux]?.[0] ?? "") !== "werden" || part <= start && part !== 0 || part === head.i || part < 0) continue;
        // L26: an own adjective card no longer makes it «become» (wird geöffnet / verletzt werden is Futur I · Passiv),
        // except the named bekannt / verrückt.
        // An own adjective whose participle reading only the external dictionary knows (berühmt — berühmen «to boast»)
        // stays «become» (wird berühmt werden).
        if (!/^\p{Ll}/u.test(tokens[part][0]) || becomeAdjectives.has(norm(tokens[part][0])) || degreeWords.includes(norm(tokens[part-1]?.[0] ?? "")) ||
            adjectivalForm(tokens[part][0]) && !participles(part).length && !participleAdjectiveCard(tokens[part][0])) continue;
        let main = participles(part);
        if (!main.length && !verbs(part).length) main = await externalParticiple(tokens[part][0]);
        main = untwin(main,part);
        if (!main.length || new Set(main.map(e=>norm(e.word).replace(/^sich\s+/u,""))).size !== 1) continue;
        futurePassive.push({head,aux,part,mood,main});
      }
      const futurePassiveAux = new Set(futurePassive.map(f=>f.aux));
      for (const {head,aux,part,mood,main} of futurePassive) {
        const linked = [head.i,part,aux];
        if (!linked.includes(selected)) continue;
        if (indices.some(i=>!linked.includes(i) && clause.competing(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
        const werden = verbs(aux).filter(e=>e.word === "werden");
        const lemma = reflexiveInClause ? main[0].word : String(main[0].word).replace(/^sich\s+/u,"");
        const clickedRole = selected === aux ? "passive" : selected === head.i ? (mood === "Konjunktiv II" ? "conditionalPassive" : "auxiliary") : null;
        result.push({id:"werden-future-passive",label:mood,tense:mood,clickedRole,
          note:{en:`${mood} · Passiv`,ru:`${mood} · Passiv`},lemma,roles:[head.e,...main,...werden],
          spans:[...linked].sort((a,b)=>a-b).map(clause.span)});
      }
      if (futurePassive.length) return result.length === 1 ? result[0] : null;
      for (const head of heads) {
        if (head.e.word === "werden" && infinitiveWerden(head.i)) continue;
        if (futurePassiveAux.has(head.i)) continue;
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        // C14 step 1: as in externalPassiveGroup, a comparison after the last word continues the
        // clause (wird zerstreut als Zierpflanze … genutzt): the word before als / wie is not proven
        // to close the group (before the verb merge zerstreuen was external and took that path).
        if (tail === end && COMPARISON_PARTICLES.includes(norm(tokens[end+1]?.[0] ?? "")) && clause.connected(end,end+1) &&
          participles(tail).length && !infinitives(tail).length) continue;
        let main = [], linked = [], roles = [], id, note, meaning;
        // G15 (18.10.2026): Futur I / Konjunktiv II with a modal infinitive at the end (ihr werdet schwimmen
        // können, ich würde gern schwimmen können, dass er kommen müssen wird): werden + the lexical infinitive
        // + the modal, as the modal Perfekt (hat … ansehen müssen, reference 5.11). Before, werden was «become».
        if (head.e.word === "werden" && tail-1 > start && tail-1 !== head.i) {
          const tense = tenses(head.e,head.i);
          const mood = tense.includes("Konjunktiv II") ? "Konjunktiv II" : tense.includes("Präsens") ? "Futur I" : null;
          const modal = verbs(tail).filter(e=>modalSet.has(e.word) && norm(e.word) === norm(tokens[tail][0]));
          if (mood && modal.length === 1) {
            // werden / haben / sein before the modal is a passive or perfect infinitive (wird gebaut werden müssen,
            // wird es gesehen haben können) — C18, not this group.
            if (TENSE_AUXILIARIES.includes(norm(tokens[tail-1][0]))) continue;
            let lexical = infinitives(tail-1).filter(e=>!modalSet.has(e.word));
            if (!lexical.length && /^\p{Ll}/u.test(tokens[tail-1][0]) && !matches(tail-1).length && norm(tokens[tail-2]?.[0] ?? "") !== "zu") {
              let facts = [];
              try { facts = await lexicalLookup(tokens[tail-1][0],'werdenGroup'); } catch (_) { facts = []; }
              if (facts.some(g=>!g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length && norm(g.word) === norm(tokens[tail-1][0])))
                lexical = [{word:norm(tokens[tail-1][0]),type:"Verb"}];
            }
            if (lexical.length && new Set(lexical.map(e=>norm(e.word).replace(/^sich\s+/u,""))).size === 1) {
              const linked3 = [head.i,tail-1,tail];
              if (!linked3.includes(selected)) continue;
              if (indices.some(i=>!linked3.includes(i) && clause.competing(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
              const plain = lexical.find(e=>!/^sich\s/u.test(norm(e.word))) || lexical[0];
              const conditional = mood === "Konjunktiv II";
              result.push({id:"modal-future",label:mood,tense:mood,modal:modal[0].word,lemma:String(plain.word).replace(/^sich\s+/u,""),
                note:conditional ? {en:"Konjunktiv II",ru:"Konjunktiv II"} : {en:"Future / inference",ru:"Будущее / предположение"},
                meaning:selected === head.i ? (conditional ? {en:"would",ru:"бы"} : {en:"will / probably",ru:"будет / вероятно"}) : null,
                roles:[head.e,...lexical,...modal],spans:[...linked3].sort((a,b)=>a-b).map(clause.span)});
              continue;
            }
          }
        }
        if (head.e.word === "werden") {
          const tense = tenses(head.e,head.i);
          if (tense.includes("Konjunktiv II")) {
            main = infinitives(tail); id = "werden-conditional";
            note = {en:"Konjunktiv II",ru:"Konjunktiv II"};
            meaning = {en:"would",ru:"бы"};
          } else if (tense.includes("Präsens") && infinitives(tail).length &&
              participles(tail).some(p=>infinitives(tail).some(q=>norm(q.word) === norm(p.word)))) {
            // G15a (16.10.2026): the closing word is both infinitive and
            // participle (vertreten, vergessen, beraten, empfangen). An agent
            // (von / vom / durch) proves the passive (Sie wird von X vertreten);
            // without it Futur is not proven and no link is shown.
            // An accusative object proves the active Futur (so wird er seinen
            // Zorn vergessen, Mammi wird dich nie vergessen, ich werde Sie
            // verlassen): a passive has none.
            const words = indices.filter(i=>i !== head.i && i !== tail).map(i=>norm(tokens[i][0]));
            const agent = words.some(w=>PASSIVE_AGENT_PREPOSITIONS.includes(w));
            const accusativeOnly = OBJECT_ONLY_WORDS;
            // den / seinen … + noun: accusative singular or dative plural; a
            // dative plural does not occur with these verbs in an agentless passive.
            const possessiveAcc = /^(?:mein|dein|sein|ihr|unser|eur|dies|jen|jed|welch)en$|^den$/u;
            const objectNext = i => /^\p{Lu}/u.test(tokens[i+1]?.[0] ?? "");
            const nominative = NOMINATIVE_PRONOUNS;
            // sich before a present participle with an ending belongs to it (einem sich vergrößernden Kelch, G15d).
            const participleSich = i => norm(tokens[i][0]) === "sich" && DECLINED_PRESENT_PARTICIPLE.test(tokens[i+1]?.[0] ?? "");
            // 20.10.2026 (resolver to-do 5.1, wird leicht übersehen): a word right after a preposition belongs to that phrase
            // (bei diesen Daten, für uns), it is no accusative object.
            const afterPreposition = i => i > 0 && prepositions.has(norm(tokens[i-1][0]));
            const accusative = indices.some(i=>i !== head.i && i !== tail && !afterPreposition(i) && (accusativeOnly.includes(norm(tokens[i][0])) && !participleSich(i) ||
              possessiveAcc.test(norm(tokens[i][0])) && objectNext(i))) ||
              words.some(w=>nominative.includes(w)) && words.some(w=>ES_SIE.includes(w));
            if (agent && accusative) continue;
            if (!agent && !accusative) {
              // Neither proven: the link is right either way, the tense is not
              // (user decision 16.10: «Futur I / Passiv»).
              main = infinitives(tail); id = "werden-future-or-passive";
              note = {en:"Futur I or passive",ru:"Futur I или пассив"};
              meaning = {en:"auxiliary: future or passive",ru:"вспомогательный глагол: будущее время или пассив"};
            } else if (agent) {
              main = participles(tail); id = "werden-passive";
              note = {en:"Passiv · Präsens",ru:"Passiv · Präsens"};
              meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
            } else {
              main = infinitives(tail); id = "werden-future";
              note = {en:"Future / inference",ru:"Будущее / предположение"};
              meaning = {en:"will / probably",ru:"будет / вероятно"};
            }
          } else if (tense.includes("Präsens") && infinitives(tail).length) {
            main = infinitives(tail); id = "werden-future";
            // wohl supports inference; without it, both readings stay possible.
            const guess = indices.some(i=>norm(tokens[i][0]) === "wohl");
            note = guess ? {en:"Inference",ru:"Предположение"} : {en:"Future / inference",ru:"Будущее / предположение"};
            meaning = guess ? {en:"probably",ru:"вероятно"} : {en:"will / probably",ru:"будет / вероятно"};
          } else if (participles(tail).length && !BECOME_DEGREE_WORDS.includes(norm(tokens[tail-1]?.[0] ?? ""))) {
            // G15 step 4: a degree word before the participle makes it an adjective
            // (wurden sie ganz vertraut = became familiar), as in the external passive.
            main = participles(tail); id = "werden-passive";
            note = {en:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`,ru:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : "Präsens"}`};
            meaning = {en:"passive auxiliary",ru:"вспомогательный глагол пассива"};
          } else if (!verbs(tail).length && !participleAdjectiveCard(tokens[tail][0]) &&
            // (gaps 24.10: a noun before werden is its predicate only when werden really closes the clause — dass sie
            // Königin wurde; not Die zerstörte Ausstattung wurde während … ersetzt, where the clause goes on)
            !(head.i === end && tail < head.i && tokens[end+1] && !/[,;:.!?»«"“”„()–—]/u.test(clause.sentence.slice(tokens[end].index + tokens[end][0].length, tokens[end+1].index))) && !(() => {
            // 20.10.2026 (links to-do, found with L18): a noun inside a prepositional phrase is no predicate of
            // werden (wurde 1947 von dem belgischen Architekten [und …] gebaut — not «became an architect»).
            for (let k = tail-1; k > head.i && k >= tail-4; k--) {
              const w = norm(tokens[k][0]);
              if (["zu","zum","zur"].includes(w)) return false; // werden zu / zum Kapitän «стать»
              if (prepositions.has(w)) return true;
              if (/^\p{Lu}/u.test(tokens[k][0]) || verbs(k).length && !adjectivalForm(tokens[k][0])) return false;
            }
            return false;
          })()) {
            main = predicate(tail); id = "werden-become";
            note = {en:"Becoming",ru:"Становление"};
          }
          linked = [head.i,tail]; roles = [head.e,...main];
          // Step 6 block 7: werden + participle + haben/sein is a perfect
          // infinitive (Futur II / Konjunktiv II Perfekt). When the lexical verb
          // gives no auxiliary (external data), Futur II is not proven, and the
          // chain must not be relabelled as Futur I / würde of haben or sein.
          if (["werden-future","werden-conditional"].includes(id) && main.some(e=>PERFECT_AUXILIARIES.includes(e.word)) &&
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
          }
          // L29 (links to-do, reference 4.6 F12-W1, user 21.10): an adjective / noun before geworden is not part of
          // the tense (ist verrückt geworden, war steif geworden): the plain perfect of werden links only the
          // auxiliary and geworden («Perfekt mit werden»); the adjective keeps its own card without a tense.
          linked = [head.i,tail-1,tail]; roles = [head.e,...main,...werden];
        }
        if (!main.length || new Set(main.map(e=>norm(e.word))).size !== 1 || !linked.includes(selected)) continue;
        if (indices.some(i=>!linked.includes(i) && clause.competing(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i))) continue;
        // A passive is never reflexive: without sich in the clause a reflexive-only card names the plain verb
        // (ist … verletzt worden «mit verletzen», not «mit sich verletzen»).
        const groupLemma = reflexiveInClause ? main[0].word : String(main[0].word).replace(/^sich\s+/u,"");
        result.push({id,note,meaning:head.e.word === "werden" && selected !== head.i ? null : meaning,lemma:groupLemma,roles,spans:[...linked].sort((a,b)=>a-b).map(clause.span)});
      }
      // A3 (15.10.2026), reference 5.6: passive with a modal verb (Das Buch muss
      // gelesen werden). A finite modal, then a participle directly before the
      // infinitive werden that closes the clause. The participle is an own verb's
      // or, as in B16, an external verb's explicit past participle. werden after a
      // noun or adjective stays "become" (… könnte er Stadtmusikant werden).
      // Old spellings of müssen (muß, mußte) are the same modal forms.
      const modalFinite = (e,i) => ["Präsens","Präteritum","Konjunktiv II",...konj1At(tokens,i)].some(t => Object.values(formsOf(e)[t] || {})
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
            !indices.some(i=>!linked.includes(i) && clause.competing(i) && !possessiveBeforeNoun(i) && !clause.nounToken(i)))
          // The modal frame is the whole chain; a werden-passive reading of the same words gives way.
          return {id:"modal-passive",modal:head.e.word,note:{en:`Passiv mit ${head.e.word}`,ru:`Passiv mit ${head.e.word}`},
            meaning:selected === aux ? {en:"passive auxiliary",ru:"вспомогательный глагол пассива"} : null,
            lemma:main[0].word,roles:[head.e,...main,...werden],spans:linked.map(clause.span)};
      }
      return result.length === 1 ? result[0] : null;
    }
    const modalWords = MODAL_VERB_SET;
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
        const possessive=i=>POSSESSIVE_WORD.test(words(i))&&i+1<=end&&ownNoun(i+1);
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
            if(DEFINITE_ARTICLES.includes(words(j)))return (words(i).endsWith('e')&&(!own.length||gender.includes(words(j)))) ||
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
        if(COORDINATORS_WITHOUT_COMMA.includes(words(end+1))) {
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
      {id:'external-passive',produce:(word,context) => externalPassiveGroup(word,context),nounGroups:true},
      {id:'external-modal',produce:(word,context) => externalModalGroup(word,context),nounGroups:true},
      {id:'zu-infinitive',produce:(word,context) => zuInfinitiveGroup(word,context)},
      {id:'coordinated',produce:(word,context,candidates) => coordinatedGroup(word,context,candidates)}
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
        if (!/^[a-zäöüß]/u.test(tokens[i][0]) || !DECLINED_ENDING.test(norm(tokens[i][0])) ||
            !((forms.get(norm(tokens[i][0])) || []).some(e => e.type === "Verb") || lexicalSeparated(norm(tokens[i][0])))) continue;
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
      if ((group?.id === 'zu-conjunction' || group?.id === 'zu-chain' && group.conjunction) && norm(group.spans[0].text) === norm(word) && !group.marker &&
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
      // C14 (17.10.2026): with two own cards of one verb the group's role names the card it proved (ist gefahren:
      // fahren «ехать», auxiliary sein — not «водить»); an own role without an id still matches by word.
      const twinRoles = roles.filter(e => e.id && norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos));
      const ownTwins = c.dictionaryId && (lemmas.get(norm(c.lemma)) || []).filter(e => e.type === "Verb").length > 1;
      return roles.some(e => norm(e.word) === norm(c.lemma) && e.type === canonicalPos(c.pos) &&
        (!["werden-future-perfect","lassen-infinitive"].includes(group.id) && !(ownTwins && twinRoles.length) || !c.dictionaryId || e.id === c.dictionaryId))
        ? {...c,construction:norm(construction.lemma || "").startsWith("sich ") && norm(c.lemma) === norm(construction.lemma).replace(/^sich\s+/u,"")
            ? {...construction,lemma:c.lemma} : construction,
          ...(c.lemma === (group.meaningLemma || "werden") && group.meaning ? {translation:group.meaning} : {})} : c;
    }
    // C14 step 3b (17.10.2026): two own cards of one infinitive (reißen «рвать» / «рваться», angehen
    // «включаться» / «касаться», dringen «проникать» / «настаивать») — the card is chosen from the clause
    // with the cards' own data only: a preposition of one card's complements, an accusative object
    // (transitive card), a dative pronoun (card with Dativ) or nothing nominal after the verb (intransitive
    // card). Conflicting or missing evidence keeps the choice.
    function sameInfinitiveSense(word, context, cards) {
      if (!context || !Number.isInteger(context.tokenOffset) || cards.length < 2) return null;
      const base = c => norm(c.lemma).replace(/^sich\s+/u,"");
      if (new Set(cards.map(base)).size !== 1 || !cards.every(c => c.source === "main" && c.item)) return null;
      // Only a finite form that is not also the infinitive (soll ausziehen, zu fahren, brechen): those give no
      // object position.
      if (norm(word) === base(cards[0]) || norm(word) === norm(String(cards[0].item.separable_prefix || "") + "zu" + base(cards[0]).slice(String(cards[0].item.separable_prefix || "").length))) return null;
      if (!(verbAnalyses.get(norm(word)) || []).some(a => a.kind === "finite" && cards.some(c => norm(a.base) === base(c) || a.entry?.id === c.dictionaryId))) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'sameInfinitiveSense');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()–—]/u.test(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      // L36 (22.10.2026): doch / aber / denn inside a clause, not after a punctuation mark and not first in it, are particles
      // (Du hältst doch bloß den Pokal, Das Schneiderlein aber hielt …): they do not cut the clause.
      // Not when a finite verb stands before it in the same stretch (Ich wollte bleiben aber die Familie zog …: a conjunction).
      const PARTICLE_CONJ = new Set(["doch","aber","denn"]);
      const finiteBefore = k => { for (let j = k-1; j >= 0 && connected(j,j+1); j--) if (j !== index && (verbAnalyses.get(norm(tokens[j][0])) || []).some(a => a.kind === "finite")) return true; return false; };
      const finiteAfter = k => { for (let j = k+1; j < tokens.length && connected(j-1,j); j++) if ((verbAnalyses.get(norm(tokens[j][0])) || []).some(a => a.kind === "finite") && /^\p{Ll}/u.test(tokens[j][0])) return true; return false; };
      const boundary = k => boundaries.has(norm(tokens[k][0])) &&
        !(PARTICLE_CONJ.has(norm(tokens[k][0])) && k > 0 && connected(k-1,k) && !boundaries.has(norm(tokens[k-1][0])) && (k > index ? !finiteAfter(k) : !finiteBefore(k)));
      let start = index, end = index;
      while (start > 0 && connected(start-1,start) && !boundary(start-1)) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundary(end+1)) end++;
      // The detached particle of the bracket (zog … aus) is not a preposition of the complements.
      const particle = norm(cards[0].item.separable_prefix || "");
      let particleIndex = -1;
      if (particle) for (let i = end; i > index; i--) if (norm(tokens[i][0]) === particle) { particleIndex = i; break; }
      const words = []; for (let i = start; i <= end; i++) if (i !== index && i !== particleIndex) words.push({i,w:norm(tokens[i][0]),t:tokens[i][0]});
      if (words.some(x => x.w === "sich" || x.w === "lassen")) return null;
      // L36: a reflexive pronoun of the subject's person (weil du dich so wohl gehalten hast, wir halten uns) is a reflexive use too.
      const REFLEXIVE_OF = REFLEXIVE_SUBJECT;
      if (words.some(x => REFLEXIVE_OF[x.w] && words.some(y => y.w === REFLEXIVE_OF[x.w]))) return null;
      // L36: a form of one card's paradigm only (hing — hängen «висеть», not hängte «вешать») is that card.
      const paradigm = c => { const out = new Set(); const walk = v => { if (typeof v === "string") v.split(/[\s\/,]+/u).forEach(x => out.add(norm(x))); else if (v && typeof v === "object") Object.values(v).forEach(walk); }; walk(c.item.forms); return out; };
      const ownForm = cards.filter(c => paradigm(c).has(norm(word)));
      const formCard = ownForm.length === 1 && cards.every(c => paradigm(c).size) ? ownForm[0] : null;
      const patterns = c => (c.item.complements || []).map(x => String(x.pattern || ""));
      const preps = c => new Set(patterns(c).flatMap(p => p.split("+").slice(0,-1).join("+").split(/[\/+…]/u)).map(x => norm(x.trim())).filter(x => x && !/^(?:akkusativ|dativ)$/u.test(x)));
      const pick = list => list.length === 1 ? list[0] : null;
      // Words inside a prepositional phrase (am Morgen, in die Garage) are not objects.
      const PP_HEAD = /^(?:am|im|zum|zur|beim|vom|ins|ans|aufs|durchs|fürs|ums)$/u, inPhrase = new Set();
      for (let i = start; i <= end; i++) if (prepositions.has(norm(tokens[i][0])) || PP_HEAD.test(norm(tokens[i][0])))
        for (let k = i+1; k <= Math.min(end,i+4); k++) { if (norm(tokens[k][0]) === "nicht") break; inPhrase.add(k); if (/^\p{Lu}/u.test(tokens[k][0]) ||
          k === i+1 && /^(?:mich|dich|ihn|uns|euch|mir|dir|ihm|ihnen|es|sie|ihr)$/u.test(norm(tokens[k][0])) && !(norm(tokens[k][0]) === "ihr" && /^\p{Lu}/u.test(tokens[k+1]?.[0] ?? ""))) break; }
      const free = words.filter(x => !inPhrase.has(x.i));
      // The haben card of a haben / sein pair is the transitive one (heilen «вылечить» / «заживать»).
      const auxPair = cards.filter(c => c.item.auxiliary === "haben").length === 1 && cards.filter(c => c.item.auxiliary === "sein").length === 1;
      const explicitAccusative = pick(cards.filter(c => patterns(c).some(p => /Akkusativ/u.test(p) && !/[a-zäöü]\s*\+\s*Akkusativ/u.test(p))));
      const accusativeCard = () => explicitAccusative || (auxPair ? cards.find(c => c.item.auxiliary === "haben") : null);
      const intransitiveCard = () => {
        const acc = accusativeCard(); if (!acc) return null;
        return pick(cards.filter(c => c !== acc && !patterns(c).some(p => /Akkusativ|Dativ/u.test(p))));
      };
      const nounAt = k => k <= end && k !== particleIndex && /^\p{Lu}/u.test(tokens[k]?.[0] ?? "");
      const MEASURE = /^(?:weg|schritt|stück|weile|mal|moment|augenblick|sekunde|minute|stunde|tag|woche|monat|jahr|meter|kilometer|zoll|fuß|abend|morgen|nachmittag|sommer|winter)$/u;
      // den zahnlosen Mund: up to two lowercase modifiers between the determiner and the noun.
      const nounAfter = k => { for (let j = k; j <= Math.min(end,k+2); j++) { if (nounAt(j)) return j; if (!/^\p{Ll}/u.test(tokens[j]?.[0] ?? "") || j === particleIndex) return -1; } return -1; };
      // L36: a time noun (die ganze Nacht) and, with a sein card, a way before a direction (fuhr die Straße hinunter) are no objects.
      const OBJ_TIME = /^(?:nacht|nächte|zeit|zeiten|woche|wochen|jahr|jahre|stunde|stunden|minuten|sekunden|tage|monate|zeitlang|ferien|hälfte|saison|ewigkeit|jahrzehnt|jahrzehnte|jahrhundert|jahrhunderte|leben|weilchen|viertelstunde|wochenende|halbjahr|umweg|runde|rennen|frühling|herbst|abende)$/u;
      const NUMERAL = /^(?:zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|hundert|tausend|paar|halbes|halbe|ganzes|ganze|ganzen)$/u;
      const DURATION_AFTER = /^(?:lang|über|hindurch|lange)$/u;
      const DIRECTION = /^(?:entlang|hinab|hinauf|hinunter|herab|herauf|herunter|hinan|empor|abwärts|aufwärts|hindurch)$/u;
      const hasSeinCard = cards.some(c => c.item.auxiliary === "sein");
      const objectNoun = k => { const j = nounAfter(k); if (j < 0) return 0;
        for (let m = k; m < j; m++) if (NUMERAL.test(norm(tokens[m][0]))) return 0;
        return !MEASURE.test(norm(tokens[j][0])) && !OBJ_TIME.test(norm(tokens[j][0])) && !(DURATION_AFTER.test(norm(tokens[j+1]?.[0] ?? "")) && !(norm(tokens[j+1][0]) === "über" && j+2 <= end && (DET_WORD.test(norm(tokens[j+2][0])) || /^\p{Lu}/u.test(tokens[j+2][0])))) &&
          !(hasSeinCard && DIRECTION.test(norm(tokens[j+1]?.[0] ?? ""))) ? j : 0; };
      const masculineSingular = k => (forms.get(norm(tokens[k][0])) || []).some(e => e.type === "Nomen" && norm(e.word) === norm(tokens[k][0]) && /^der\b/u.test(String(e.article || "")));
      const ACC_DET = /^(?:den|einen|keinen|meinen|deinen|seinen|ihren|unseren|euren|diesen|jenen|jeden)$/u;
      const NEUTRAL_DET = /^(?:die|das|eine|keine|meine|deine|seine|ihre|unsere|eure|diese|jene)$/u;
      // L36 (22.10.2026): ein / kein / sein … without an ending — a neuter object (er zog sein Schwert, ein langes Bandmaß) or a
      // masculine subject (… kam ein Wolf): an object only with a known subject and not before an own masculine noun.
      const BARE_DET = /^(?:ein|kein|mein|dein|sein|unser|euer)$/u;
      // A nominative pronoun subject (er schlug …, als er … brach) makes another noun phrase the object.
      // L36: ihr before a determiner is a dative (fuhr ihr der giftige Apfelgrütz aus dem Hals).
      const DET_WORD = ARTICLE_WORD;
      // ihr is a subject only with the ihr form of the verb (ihr fahrt / zogt; da zog ihr plötzlich die Kälte … — a dative).
      const pronounSubject = free.some(x => ["ich","du","er","wir","ihr","man"].includes(x.w) && !(x.w === "ihr" && (nounAt(x.i+1) || DET_WORD.test(norm(tokens[x.i+1]?.[0] ?? "")) || !/t$/u.test(norm(word)))));
      // L36: one noun phrase subject at the clause start (Der Junge zog …, Die Katze stieß …): an own noun, not after a preposition,
      // not a time word (Die ganze Nacht …), not der + a feminine / plural noun (dative: Der Mutter …).
      // Not dieser / jener: also a genitive (dieser Tage).
      const NOM_DET = /^(?:der|die|das|ein|eine|mein|meine|dein|deine|sein|seine|unser|unsere|euer|eure|kein|keine)$/u;
      const TIME_NOUN = /^(?:nacht|zeit|tag|woche|monat|jahr|weile|stunde|minute|sekunde|moment|augenblick|abend|morgen|mittag|nachmittag|vormittag|sommer|winter|frühling|herbst|mal|zeitlang|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag|ostern|weihnachten|pfingsten|silvester|neujahr|frühjahr|wochenende|ferien|feierabend|dämmerung|zuhause|hälfte|strecke|meile|zeitspanne|nächte|tage|jahre|wochen|monate|stunden|saison|ewigkeit|jahrzehnt|jahrhundert|leben)$/u;
      const ownNounOnly = k => { const e = forms.get(norm(tokens[k]?.[0] ?? "")) || []; return e.length > 0 && e.every(x => x.type === "Nomen"); };
      const npSubject = (() => {
        const clauseStart = start === 0 || /[.!?:;»«„“"]/u.test(sentence.slice(tokens[start-1].index + tokens[start-1][0].length,tokens[start].index));
        if (!clauseStart || index - start < 2 || index - start > 4 || !NOM_DET.test(norm(tokens[start][0]))) return false;
        const head = index - 1;
        if (!/^\p{Lu}/u.test(tokens[head][0]) || !ownNounOnly(head) || TIME_NOUN.test(norm(tokens[head][0]))) return false;
        for (let k = start+1; k < head; k++) if (!/^\p{Ll}/u.test(tokens[k][0]) || prepositions.has(norm(tokens[k][0])) || DET_WORD.test(norm(tokens[k][0]))) return false;
        const fem = (forms.get(norm(tokens[head][0])) || []).some(e => e.type === "Nomen" && (/^die\b/u.test(String(e.article || "")) || e.form === "plural" || e.number === "plural"));
        return !(norm(tokens[start][0]) === "der" && fem);
      })();
      const subjectKnown = pronounSubject || npSubject;
      const masculineOwn = k => (forms.get(norm(tokens[k][0])) || []).some(e => e.type === "Nomen" && /^der\b/u.test(String(e.article || "")));
      const finalVerb = index === end || index === end-1 && particleIndex === end;
      const accusative = free.some(x => ["mich","dich","ihn","wen"].includes(x.w) ||
        ACC_DET.test(x.w) && objectNoun(x.i+1) && (!/n$/u.test(norm(tokens[objectNoun(x.i+1)][0])) || masculineSingular(objectNoun(x.i+1))) ||
        pronounSubject && (NEUTRAL_DET.test(x.w) && objectNoun(x.i+1) || x.w === "sie" && x.i > index) ||
        subjectKnown && x.i > index && (NEUTRAL_DET.test(x.w) && objectNoun(x.i+1) ||
          BARE_DET.test(x.w) && !DET_WORD.test(norm(tokens[x.i+1]?.[0] ?? "")) && objectNoun(x.i+1) && !masculineOwn(objectNoun(x.i+1))) ||

        explicitAccusative && ["uns","euch"].includes(x.w) ||
        // was … angeht / was … betrifft: the relative was before a clause-final verb is its object.
        finalVerb && x.i === start && x.w === "was" && free.some(y => ["ich","du","er","sie","wir","ihr","man"].includes(y.w) || y.i > start && (/^\p{Lu}/u.test(y.t) || DET_WORD.test(y.w) || /^(?:dies|jen|mein|dein|sein|ihr|unser|euer|eure[mnrs]?(?![\p{L}])|kein)/u.test(y.w))));
      const dative = free.some(x => ["mir","dir","ihm","ihnen"].includes(x.w));
      // (the own form decides unless an object speaks against its card: hing den Hasen an einen Ast — window)
      if (formCard) return accusative && !patterns(formCard).some(p => /Akkusativ/u.test(p)) ? null : {candidate:formCard,evidence:'own-form'};
      // L36: a pronominal adverb carries its preposition (Ich halte nichts davon «считать», bestand darauf) — not first in the
      // clause and not after a time word (Bald darauf …, ein paar Tage darauf — «после этого»).
      // wo(r)- too (Wofür hältst du mich?, Worauf bestehst du?); first in the clause only not darauf (Darauf ging sie … «потом»).
      const DA_PREP = PRONOMINAL_ADVERB;
      const TIME_BEFORE = /^(?:bald|gleich|kurz|lange|sofort|tags|gleichzeitig)$/u;
      const daPreps = words.filter(x => DA_PREP.test(x.w) && !(x.i === start && x.w === "darauf") && !(x.i > start && /^\p{Lu}/u.test(tokens[x.i-1]?.[0] ?? "")) && !TIME_BEFORE.test(norm(tokens[x.i-1]?.[0] ?? "")))
        .map(x => x.w.match(DA_PREP)[1]);
      const clauseWords = new Set([...words.map(x => x.w), ...daPreps]);
      // L36: a haben card whose preposition takes the accusative object along (hielt ihn für einen Spitzbuben «считать»,
      // Hältst du mich für blöde?) decides before the object; für + a personal pronoun is a beneficiary (für sie).
      const PERSONAL = PERSONAL_OBJECT_PRONOUN;
      const accPrep = c => patterns(c).filter(p => /[a-zäöü]\s*\+\s*Akkusativ/u.test(p)).flatMap(p => p.split("+")[0].split(/[\/…]/u)).map(x => norm(x.trim())).filter(Boolean);
      // Only a predicate after it — an adjective / participle (für klug, für tot) or ein / eine / einen + a noun that is no time
      // (für einen Spitzbuben, not für einen Moment) — and the object before it (ihn für …, Wofür hältst du mich); für den König,
      // für seine Schwester, für die Gäste are beneficiaries.
      const predicateAfter = k => { const w1 = norm(tokens[k+1]?.[0] ?? ""), t1 = tokens[k+1]?.[0] ?? "";
        if (k+1 > end || PERSONAL.test(w1) || DET_WORD.test(w1) && !INDEFINITE_NOM_ACC.test(w1) || DETERMINER_STEM.test(w1)) return false;
        if (INDEFINITE_NOM_ACC.test(w1)) { const j = nounAfter(k+2); return j > 0 && !OBJ_TIME.test(norm(tokens[j][0])) && !MEASURE.test(norm(tokens[j][0])); }
        if (w1 === "zu") return /^\p{Ll}/u.test(tokens[k+2]?.[0] ?? "") && k+2 <= end;
        return /^\p{Ll}/u.test(t1) && !NUMERAL.test(w1) && !prepositions.has(w1); };
      const OBJ_PRON = /^(?:mich|dich|ihn|sie|es|uns|euch|das|dies|was|nichts|etwas|wen)$/u;
      const accusativeBefore = k => free.some(x => x.i < k && x.i !== index && OBJ_PRON.test(x.w)) ||
        free.some(x => x.i > index && x.i < k && (ACC_DET.test(x.w) || NEUTRAL_DET.test(x.w) || BARE_DET.test(x.w)) && objectNoun(x.i+1) && objectNoun(x.i+1) < k);
      // With a pronoun object (uns, ihn, mich, wen) für + any noun phrase is the predicate (hielten uns für Brüder, Wen hielt er für
      // den Dieb?); with a noun object only an adjective or ein + noun (für den König / für Studenten may be beneficiaries).
      const pronounObject = free.some(x => /^(?:mich|dich|ihn|uns|euch|wen)$/u.test(x.w) || x.w === "sie" && x.i > index);
      const nounAfterFor = k => { const w1 = norm(tokens[k+1]?.[0] ?? ""); if (PERSONAL.test(w1) || NUMERAL.test(w1)) return false;
        const j = DET_WORD.test(w1) || /^(?:mein|dein|sein|ihr|unser|euer|eure[mnrs]?(?![\p{L}])|kein)/u.test(w1) ? nounAfter(k+2) : nounAt(k+1) ? k+1 : -1;
        return j > 0 && !OBJ_TIME.test(norm(tokens[j][0])) && !MEASURE.test(norm(tokens[j][0])) && !/^(?:fall|fälle|zweck)$/u.test(norm(tokens[j][0])); };
      const forPredicate = c => words.some(x => accPrep(c).includes(x.w) && (predicateAfter(x.i) && (accusativeBefore(x.i) || pronounObject) || pronounObject && nounAfterFor(x.i))) ||
        accPrep(c).some(p => daPreps.includes(p)) && free.some(x => OBJ_PRON.test(x.w));
      // für + a bare noun after a noun object (Seine Gäste hielt er für Freunde / hielt eine Rede für Studenten): undecided.
      const forOpen = cards.some(c => accPrep(c).includes("für")) && !pronounObject && words.some(x => x.w === "für" && nounAt(x.i+1) && !OBJ_TIME.test(norm(tokens[x.i+1][0])));
      const prepWithObject = cards.filter(c => c !== accusativeCard() && c.item.auxiliary !== "sein" && accusativeCard()?.item.auxiliary !== "sein" &&
        !patterns(c).some(p => /^Akkusativ$/u.test(p.trim())) && forPredicate(c));
      if (prepWithObject.length === 1) return {candidate:prepWithObject[0],evidence:'complement-preposition'};
      if (forOpen && accusative) return null;
      // (für after an insertion: hielt sie, die schöne Müllerstochter, für eine Hexe — the object may belong to «считать»)
      const restOfSentence = sentence.slice(tokens[end].index + tokens[end][0].length).split(/[.!?]/u)[0];
      if (accusative && /^\s*,/u.test(restOfSentence) && /(?:^|[\s,])für\s/u.test(restOfSentence) && cards.some(c => accPrep(c).includes("für"))) return null;
      // L36: a pronoun object (was / nichts / etwas / viel) with a pronominal adverb or von of a haben card's own preposition
      // (Was er von mir hält, Ich halte nichts davon, Davon halte ich viel) — the preposition decides.
      const QUANT = /^(?:was|nichts|etwas|viel|wenig|alles|einiges|manches)$/u;
      const prepOfPronoun = cards.filter(c => c.item.auxiliary !== "sein" && c !== accusativeCard() && !patterns(c).some(p => /^Akkusativ$/u.test(p.trim())) &&
        [...preps(c)].some(p => daPreps.includes(p) || p === "von" && words.some(x => x.w === "von")) && words.some(x => QUANT.test(x.w)));
      if (prepOfPronoun.length === 1) return {candidate:prepOfPronoun[0],evidence:'complement-preposition'};
      // L36: a pronominal adverb before zu + infinitive belongs to the verb (bestand darauf die Prüfung zu wiederholen): it decides first.
      const zuInfinitive = words.some(x => x.w === "zu" && x.i > index && /^\p{Ll}/u.test(tokens[x.i+1]?.[0] ?? "") && (verbAnalyses.get(norm(tokens[x.i+1][0])) || []).length);
      const daFirst = zuInfinitive && daPreps.length ? cards.filter(c => [...preps(c)].some(p => daPreps.includes(p))) : [];
      if (daFirst.length === 1) return {candidate:daFirst[0],evidence:'complement-preposition'};
      // 1. an object decides first (zog den Mund in die Breite — not «переезжать» for in)
      if (accusative && !dative) { const c = accusativeCard(); if (c) return {candidate:c,evidence:'accusative-object'}; }
      if (dative && !accusative) { const c = pick(cards.filter(c => patterns(c).some(p => /^Dativ$/u.test(p.trim())))); if (c) return {candidate:c,evidence:'dative-object'}; }
      // L36: an object that both cards take (ausrichten: richtet ihre Werbung … auf junge Kunden aus) leaves the preposition to decide.
      if (dative || accusative && (accusativeCard() || !cards.every(c => patterns(c).some(p => /Akkusativ/u.test(p))))) return null;
      // 2. a preposition of one card's complements
      // 21.10.2026 (WN batch G39/G40): a haben / sein pair in a simple tense shows no auxiliary — one preposition may serve
      // both senses (stieß mit der Faust gegen die Scheibe «ударил» / stieß gegen die Tür «налетел»), so it decides nothing;
      // the object (step 1) and the auxiliary of a Perfekt still do.
      // Only with an instrument (mit der Faust / mit dem Fuß gegen …; review 21.10: stieß auf / gegen alone stays sein «наткнуться»),
      // and only when the haben card is the transitive one (explicit Akkusativ: stoßen «толкать») — it is also used without an
      // object and with a preposition; pairs whose haben card has no Akkusativ (dringen auf, ziehen an) keep the preposition.
      const prepBlind = auxPair && explicitAccusative && explicitAccusative.item.auxiliary === "haben" && clauseWords.has("mit");
      // 22.10.2026 (links chat, WN batch transitive 001: ziehen got Akkusativ): only when the haben card governs no preposition
      // of its own (stoßen «толкать»: Akkusativ only). A haben card with its own preposition (ziehen «тянуть» an + Dativ) keeps
      // the prepositions deciding: zog mit Fred an einem Knallbonbon «тянуть», zogen mit den Kindern nach Berlin «переезжать».
      // L36: für of «считать» counts only before a predicate (Der Zug hielt für zwei Minuten / für die Reisenden — not «считать»).
      // (a pronominal adverb first in the clause is no complement beside a noun phrase: Davon hielt er ein Stück in der Hand)
      const daStart = words.find(x => x.i === start && DA_PREP.test(x.w));
      const looseAfter = pronounSubject && free.some(x => x.i > index && /^(?:ein|eine|einen|den|die|das)$/u.test(x.w) && nounAfter(x.i+1) > 0);
      const prepCounts = (c,p) => (clauseWords.has(p) && !(daStart && looseAfter && daStart.w.match(DA_PREP)[1] === p && !words.some(x => x.w === p))) && !(p === "für" && accPrep(c).includes("für") &&
        !words.some(x => x.w === "für" && predicateAfter(x.i)) && !(daPreps.includes("für") && free.some(x => OBJ_PRON.test(x.w))));
      // L36: a noun phrase after the verb outside a prepositional phrase (zog den Schlitten nach Hause, stieß den Besen gegen die Wand)
      // may be the object: then the preposition of a sein card decides nothing.
      const QUANT_DET = /^(?:den|die|das|alle|beide|viele|einige|mehrere|solche|ein|eine|einen|mein|meine|meinen|dein|deine|deinen|sein|seine|seinen|ihre|ihren|unser|unsere|unseren|euer|eure|euren|kein|keine|keinen|diesen|diese|dieses|jeden|jede)$/u;
      const looseNP = free.some(x => x.i > index && QUANT_DET.test(x.w) && nounAfter(x.i+1) > 0);
      const withPrep = (prepBlind && !preps(explicitAccusative).size ? [] : cards.filter(c => [...preps(c)].some(p => prepCounts(c,p))))
        .filter(c => !(looseNP && (subjectKnown || /^(?:sie|es)$/u.test(norm(tokens[index+1]?.[0] ?? "")) && free.some(x => x.i > index+1 && QUANT_DET.test(x.w))) && c.item.auxiliary === "sein" && cards.some(h => h.item.auxiliary === "haben")));
      // L38 (22.10.2026, bestehen «заключаться» in + Dativ beside «существовать» without complements): a two-way preposition with
      // the dative may be a place (Die Firma besteht seit 1900 in Berlin): beside a card without complements it decides only as a
      // pronominal adverb (besteht darin, worin besteht …); the plain preposition leaves the choice.
      const TWO_WAY = /^(?:in|an|auf|über|unter|vor|hinter|neben|zwischen)$/u;
      const bareCard = cards.some(c => !patterns(c).length);
      if (withPrep.length === 1 && bareCard && patterns(withPrep[0]).length && [...preps(withPrep[0])].every(p => TWO_WAY.test(p)) &&
          patterns(withPrep[0]).every(p => /Dativ/u.test(p)) && ![...preps(withPrep[0])].some(p => daPreps.includes(p))) return null;
      if (withPrep.length === 1) return {candidate:withPrep[0],evidence:'complement-preposition'};
      // 3. no object: a verb-second clause whose only noun phrase before the verb is the subject and nothing
      // nominal after it (Das Seil riss, Eine Lampe ging flackernd an)
      const nominal = x => /^\p{Lu}/u.test(x.t) || ["mich","dich","ihn","sie","es","uns","euch","ihm","ihr","ihnen","mir","dir","alles","nichts","etwas","was","das","dies","den","dem","die","der","einen","eine","ein"].includes(x.w);
      const before = free.filter(x => x.i < index), after = free.filter(x => x.i > index);
      const heads = before.filter(x => /^\p{Lu}/u.test(x.t) && x.i > start || ["ich","du","er","sie","es","wir","ihr","man"].includes(x.w));
      // A clause of its own: the sentence start or after punctuation, not after a conjunction (und die Augen
      // aufschlug, weil das Eis brach); then a final verb is verb-second too (Das Seil riss).
      const SUBORD = /^(?:und|oder|aber|dass|daß|weil|wenn|ob|als|bevor|nachdem|bis|während|obwohl|da|damit|falls|sobald|wie|der|die|das|den|dem|deren|dessen|welche[rsnm]?|wer|was|wo)$/u;
      const ownClause = (start === 0 || /[.!?:;]/u.test(sentence.slice(tokens[start-1].index + tokens[start-1][0].length,tokens[start].index))) && !(start === index - 1 && SUBORD.test(norm(tokens[start][0])) && !/^\p{Lu}/u.test(tokens[index-1]?.[0] ?? "x"));
      const firstIsSubordinator = before.length && SUBORD.test(before[0].w) && !nounAt(before[0].i+1);
      const subjectOnly = before.length && before.length <= 4 && heads.length <= 1 && (!finalVerb || ownClause && !firstIsSubordinator);
      // Only a verb-second clause: in a verb-final clause the noun before the verb may be the object (und die Augen aufschlug).
      // L36: an impersonal es (denn es hielt schwer, es zieht) says nothing of the sense — without a prepositional phrase
      // (es trat in die Stube: es is the child).
      // L36: not when a nominative pronoun follows the verb (Sein Wort hielt er, Was brach er?: the first part is the object), after a
      // w-word, or with a pronominal adverb no card governs (Das Problem besteht darin …).
      const INDEF = /^(?:niemand|keiner|jeder|jemand|alle|beide|einer|viele|wenige|manche|wer|keine|jede)$/u;
      // (keine / jede / alle as a pronoun, not before a noun: Die Ehe hielt keine drei Jahre)
      const indefPronoun = x => INDEF.test(x.w) && !(x.i < end && (/^\p{Lu}/u.test(tokens[x.i+1][0]) || NUMERAL.test(norm(tokens[x.i+1][0])) ||
        !prepositions.has(norm(tokens[x.i+1][0])) && /^\p{Ll}/u.test(tokens[x.i+1][0]) && /^\p{Lu}/u.test(tokens[x.i+2]?.[0] ?? "")));
      const nominativeAfter = after.some(x => UNAMBIGUOUS_SUBJECT_PRONOUNS.includes(x.w) || indefPronoun(x)) &&
        before.some(x => x.i > start && /^\p{Lu}/u.test(x.t) || NOM_DET.test(x.w) || x.i === start && /^\p{Lu}/u.test(x.t) && !prepositions.has(x.w) &&
          !(forms.get(x.w) || []).some(e => ["Adverb","Konjunktion","Präposition","Pronomen"].includes(e.type)));
      // L36: a noun phrase before the verb and a nominative pronoun after it (Seine letzte Stelle trat er 1970 an, Sein Wort hielt er):
      // the noun phrase is the object.
      const frontedObject = nominativeAfter && !dative && before.length && (ACC_DET.test(before[0].w) || NEUTRAL_DET.test(before[0].w) || BARE_DET.test(before[0].w)) &&
        before[0].i === start && objectNoun(start+1) > 0 && objectNoun(start+1) < index;
      if (frontedObject) { const c = accusativeCard(); if (c) return {candidate:c,evidence:'accusative-object'}; }
      const wFirst = /^(?:wen|was|welche[rsnm]?|wieviel)$/u.test(norm(tokens[start][0]));
      // L36: the clause must end where the sentence or a coordinated clause goes on (Das Eis hielt, und sie gingen hinüber); after
      // an insertion (Ron bestand, wie Harry, die Prüfung; Der Prinz hielt, wie er versprochen hatte, sein Wort) the object may follow.
      const tail = sentence.slice(tokens[end].index + tokens[end][0].length);
      // Closed: the verb ends its clause, a conjunction or the sentence end follows, or every later comma segment of the sentence is
      // a clause of its own (finite verb or zu + infinitive) or a single word (Harry, nun) — not a bare noun phrase (…, die Prüfung).
      const closed = finalVerb && firstIsSubordinator || end === tokens.length - 1 || /^[\s»«„“"')]*[.!?;:]/u.test(tail) || /^[\s»«„“"')]*[«»„“"]/u.test(tail) ||
        end + 1 < tokens.length && connected(end,end+1) && boundaries.has(norm(tokens[end+1][0])) ||
        /^\s*[,–—]\s*(?:und|oder|aber|denn|doch|sondern)\b/iu.test(tail) || (() => {
          if (!/^\s*[,–—]/u.test(tail)) return false;
          let k = end + 1;
          while (k < tokens.length) {
            let finite = false, n = 0, first = k;
            if (/^(?:was|wen|wer)$/u.test(norm(tokens[k][0])) && k === end + 1) return false;
            for (; k < tokens.length && (k === first || connected(k-1,k)); k++, n++)
              if ((verbAnalyses.get(norm(tokens[k][0])) || []).some(a => a.kind === "finite") || norm(tokens[k-1]?.[0] ?? "") === "zu" && k > first) finite = true;
            // (a prepositional phrase is an adjunct: …, mit einer Zahlung in der Tasche)
            if (!finite && (n > 1 || ownNounOnly(first)) && !(prepositions.has(norm(tokens[first][0])) && k - first > 1)) return false;
            if (k < tokens.length && /[.!?]/u.test(sentence.slice(tokens[k-1].index + tokens[k-1][0].length,tokens[k].index))) break;
          }
          return true;
        })();
      // (any pronominal adverb: Darauf bestand er nicht — the complement, or «потом»).
      const unmatchedDa = words.some(x => /^(?:da|wo)r?(?:an|auf|aus|für|gegen|in|von|über|unter|vor|neben|hinter|zwischen|um|mit|bei|nach|zu)$/u.test(x.w));
      if (subjectOnly && !after.some(x => nominal(x) || indefPronoun(x)) && closed && !nominativeAfter && !wFirst && !unmatchedDa && !(heads.length === 1 && heads[0].w === "es" && !inPhrase.size)) {
        const c = intransitiveCard(); return c ? {candidate:c,evidence:'no-object'} : null;
      }
      return null;
    }
    // Adapter: construction hypotheses (verbal group, separated pair) become
    // proposals and choice blocks of the selection core.
    function constructionSelection(candidates, separated, sense = null, word = null) {
      const same = (a,b) => window.BibliothekVocabulary.identity(a) === window.BibliothekVocabulary.identity(b);
      const grouped = candidates.filter(c => c.construction && !(c.reflexiveUnconfirmed && c.construction.id === "werden-future-perfect") && !["separable-verb","reflexive-verb"].includes(c.construction.id));
      // C14 step 3 (17.10.2026): two own cards of one separable verb (angehen «включаться» / «касаться»)
      // both carry the proven bracket: the bracket stands, the choice is between those cards (not the
      // plain verb gehen, which won before because no single card was proposed).
      const proven = separated.filter(c => c.construction.confidence !== "tentative");
      const sameVerb = proven.length > 1 && new Set(proven.map(c => norm(c.lemma).replace(/^sich\s+/u,""))).size === 1 &&
        proven.every(c => c.source === "main");
      const senseCard = sameVerb && sense ? candidates.find(c => same(c,sense.candidate)) : null;
      const needsSeparableChoice = sameVerb && !senseCard || candidates.some(c => c.construction?.id === "separable-verb" && c.construction.confidence === "tentative");
      return {grouped,
        proposals:{
          'single-construction':{candidate:grouped.length === 1 ? grouped[0] : null},
          'separated-verb':{candidate:senseCard || (separated.length === 1 && separated[0].construction.confidence !== "tentative" ? candidates.find(c => same(c,separated[0])) : null),
            evidence:separated.some(c => c.construction.confidence !== "tentative") ? "separated-verb-pair" : separated.length ? "tentative-separated-verb-pair" : null}},
        blocks:[
          // 21.10.2026 (from L31 of the links chat): a proven bracket with two own cards of one verb offers only those two
          // cards (schied … aus: not the external «schied»; zog … aus: not sich zuziehen) — the same window as on the particle.
          // On the particle itself the window is L31's (an article / pronoun «ein» must stay among its readings).
          {id:'separable-choice',active:needsSeparableChoice,requiresChoice:true,only:sameVerb && !senseCard && !proven.some(c => norm(String(c.item?.separable_prefix || "")) === norm(String(word || ""))) ? proven : null},
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
        const auxiliaries=verbs(helper).filter(e=>PERFECT_AUXILIARIES.includes(e.word) && norm(tokens[helper][0])===e.word && /^[a-zäöü]/u.test(tokens[helper][0]));
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
        if(indices.some(i=>!linked.includes(i) && clause.competing(i) && !clause.nounToken(i) && !possessiveBeforeNoun(i))) continue;

        // To-do 3.4 (reference F12-B7): the clicked auxiliary is named, since gewesen sein has one lemma for both words.
        const clickedRole=clicked===helper ? "futurePerfectHave" : clicked===head.i ? "futurePerfectWill" : null;
        groups.push({id:"werden-future-perfect",label:"Futur II",tense:"Futur II",clickedRole,lemma:[...bases][0],roles:[head.e,...main,aux],
          note:{ru:"Futur II · завершённое действие в будущем / предположение о завершённом действии",en:"Futur II · completed future action / inference about a completed event"},
          meaning:clicked===head.i ? {ru:"вспомогательный глагол Futur II",en:"Futur II auxiliary"} : null,
          spans:linked.sort((a,b)=>a-b).map(clause.span)});
      }
      return groups.length===1 ? groups[0] : null;
    }
    // Deliberately small clause-local patterns. No proximity-only attachment.
    // G2 addition (2) (reference 2b981ba, user decision 19.10): sein + a participle that has its own adjective card
    // is the adjective only with an explicit sign — a degree word before it (ganz, total, ein wenig), an adjective
    // next to it through a comma or «und», or a dative in the clause for a card marked «+ Dativ» (ihm unterlegen,
    // den Besetzern gewachsen). Otherwise the verb group stays (the learner sees one verb card).
    const adjectiveDegreeWords = new Set(["ganz","total","völlig","sehr","ziemlich","äußerst","extrem","gänzlich","vollkommen","vollständig","recht","furchtbar","schrecklich","etwas"]);
    const dativeWords = new Set(["dem","einem","ihm","ihnen","mir","dir","uns","euch","diesem","jenem","keinem","meinem","deinem","seinem","ihrem","unserem","eurem"]);
    function adjectiveSign(sentence, tokens, p, start, end) {
      const form = norm(tokens[p][0]);
      const cards = (forms.get(form) || []).filter(e => e.type === "Adjektiv" && norm(e.word) === form);
      if (!cards.length) return false;
      const at = i => norm(tokens[i]?.[0] ?? "");
      const gap = (a,b) => sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index);
      // A card that needs a dative (gewachsen, unterlegen) is proved only by its dative: Das Kind ist sehr gewachsen
      // is the verb «вырос».
      const needsDative = cards.some(e => /\(\+\s*Dativ\)/u.test(String(e.translation_ru || "")));
      if (!needsDative && (adjectiveDegreeWords.has(at(p-1)) || ["wenig","bisschen","bißchen"].includes(at(p-1)) && at(p-2) === "ein")) return true;
      const plainAdjective = i => i >= start && i <= end && i !== p && /^\p{Ll}/u.test(tokens[i][0]) &&
        (forms.get(at(i)) || []).some(e => e.type === "Adjektiv" && norm(e.word) === at(i)) && !(verbAnalyses.get(at(i)) || []).length;
      if (!needsDative && p+1 < tokens.length && (/^\s*,\s*$/u.test(gap(p,p+1)) && plainAdjective(p+1) || at(p+1) === "und" && plainAdjective(p+2))) return true;
      if (!needsDative && p-1 >= 0 && (/^\s*,\s*$/u.test(gap(p-1,p)) && plainAdjective(p-1) || at(p-1) === "und" && plainAdjective(p-2))) return true;
      // The dative must belong to the participle: it stands before it with only light words in between (adverbs,
      // nicht, degree words, a subject pronoun, a prepositional phrase) — ihm unterlegen, den Besetzern nicht gewachsen,
      // seinem Gegner körperlich weit unterlegen. Another clause part in between (daß ihm … noch ein zweiter …
      // auf der Brust gewachsen war) leaves the verb.
      if (needsDative) {
        const determiners = new Set(["der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines","kein","keine","keinen","keinem","keiner","dieser","diese","diesen","diesem","jenem","mein","meine","meinen","meinem","dein","deinem","sein","seine","seinen","seinem","ihr","ihre","ihren","ihrem","unser","unsere","unseren","unserem","euer","eure","euren","eurem","euere","eueren","euerem"]);
        const subjectPronouns = SUBJECT_PRONOUNS;
        const light = i => /^\p{Ll}/u.test(tokens[i][0]) && !prepositions.has(at(i)) && !determiners.has(at(i)) &&
          (subjectPronouns.has(at(i)) || !/[,;:.!?»«"„“]/u.test(gap(i-1,i)));
        for (let i = Math.max(start,p-8); i < p; i++) {
          if (i > start && prepositions.has(at(i-1))) continue;
          let j = -1;
          if (dativeWords.has(at(i)) && !DATIVE_SINGULAR_DETERMINERS.includes(at(i))) j = i;
          else if (DATIVE_SINGULAR_DETERMINERS.includes(at(i)) ||
            at(i) === "den" && /n$/u.test(at(i+1)) && /^\p{Lu}/u.test(tokens[i+1]?.[0] ?? "")) {
            for (let k = i+1; k < p && k <= i+3; k++) if (/^\p{Lu}/u.test(tokens[k][0])) { j = k; break; }
            if (j < 0 || at(i) === "den" && !/n$/u.test(at(j))) continue;
          } else continue;
          // A prepositional phrase in between is skipped whole (ihm auch in diesem Kampf unterlegen, dem Gegner im
          // Finale unterlegen — user decision 19.10: adjective); a bare article or noun is another clause part.
          let ok = true;
          for (let k = j+1; k < p && ok; k++) {
            if (prepositions.has(at(k)) && /^\p{Ll}/u.test(tokens[k][0])) {
              let m = k+1;
              while (m < p && m <= k+4 && !/^\p{Lu}/u.test(tokens[m][0])) m++;
              if (m >= p || m > k+4 || /[,;:.!?]/u.test(sentence.slice(tokens[k].index, tokens[m].index))) { ok = false; break; }
              k = m; continue;
            }
            ok = light(k);
          }
          if (ok && !/[,;:.!?]/u.test(gap(j,p))) return true;
        }
      }
      return false;
    }
    // L12 / L13 reviewers (23.10.2026): see verbGroup (hätte / wäre + a participle that is not proven a tense).
    function conditionalGuard(tokens,tail,start,end,indices) {
      const before = norm(tokens[tail-1]?.[0] ?? "");
      if (adjectivalForm(tokens[tail][0]) && !participleAdjectiveCard(tokens[tail][0])) return true;
      if (tail-1 > start && ["so","sehr","ganz","völlig","total","ziemlich","zu","äußerst","extrem","gänzlich","vollkommen","vollständig","stark","längst","recht"].includes(before)) return true;
      return indices.some(i => REQUEST_ADVERBS.includes(norm(tokens[i][0]))) && tail-1 > start && adjectivalForm(tokens[tail-1][0]) &&
        !REQUEST_ADVERBS.includes(before);
    }
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
      const modals = MODAL_VERB_SET;
      // C14 step 1 (17.10.2026): a modal also heads the group in Konjunktiv II (könnte … töten, müsste … verderben);
      // before the verb merge only external cards linked it, own cards did not.
      // möchte is möchten (Präsens), not a second Konjunktiv II reading of mögen.
      const plainModal = i => matches(i).some(e => modals.has(e.word) && finiteTenses(e,i).length);
      // L12 / L13 (links to-do, reference F12-B14a–c, F12-G3): hätte / wäre head the group in Konjunktiv II as well
      // (hätte … gesagt, wäre … gewesen, hätte … wissen müssen); the group's tense is then «Konjunktiv II».
      const pastConditional = (e,i) => PERFECT_AUXILIARIES.includes(e.word) && !finiteTenses(e,i).length && clause.finiteIn(e,i,"Konjunktiv II");
      // Reviewers (23.10): with hätte / wäre the participle is not linked when it is also an own adjective / adverb form
      // (wenn er erwachsen wäre), after a degree word (wäre völlig verfahren), or after an adjective in a clause with
      // gern / lieber (Ich hätte die Haare gern kurz geschnitten — a request, the participle describes the object).
      // These keep the old behaviour (no link); the same guards for Perfekt belong to L34.
      const conditionalStateOrRequest = tail => conditionalGuard(tokens,tail,start,end,indices);
      const heads = indices.flatMap(i => matches(i).filter(e => (PERFECT_AUXILIARIES.includes(e.word) || modals.has(e.word)) &&
        (finiteTenses(e,i).length || pastConditional(e,i) || modals.has(e.word) && !plainModal(i) && (clause.finiteIn(e,i,"Konjunktiv II") || konj1At(tokens,i).length && clause.finiteIn(e,i,"Konjunktiv I")))).map(e=>({i,e})));
      // G15 step 4: a following «und / oder + verb» does not block the pair before it.
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i) continue;
        let linked = [], roles = [], id, label, main, mainIndex = tail, state = false, passive = false;
        if (modals.has(head.e.word)) {
          // G15e (16.10.2026): a modal takes a bare infinitive; a zu-infinitive at
          // the end belongs to another construction (sollten … bewachen um …
          // die Wahrscheinlichkeit zu erhöhen).
          if (norm(tokens[tail-1]?.[0] ?? "") === "zu") continue;
          // C14 step 1: a reflexive-only card (sich verletzen) needs a reflexive pronoun in the clause
          // (könnten … ein Gesetz verletzen is the plain verb).
          const reflexiveIn = indices.some(i => reflexivePronouns.has(norm(tokens[i][0])));
          main = infinitives(tail).filter(e => reflexiveIn || !/^sich\s/u.test(norm(e.word)));
          id = "modal-group"; label = "Modal";
          linked = [head.i,tail]; roles = [head.e,...main];
          // C18 (2) (18.10.2026), reference F12-B9 / U-H08: modal + perfect infinitive (muss … gekostet haben,
          // musste … gewesen sein, dass er es gesehen haben muss). The participle must take this very auxiliary:
          // sein + the participle of a haben verb is a state (G2: kann geschlossen sein, muss verletzt sein) and
          // stays «Modal mit sein».
          const auxWord = norm(tokens[tail][0]);
          // A degree word before the participle makes it a state adjective (wer könnte so verzweifelt sein), as G15c.
          const degreeBefore = STATE_DEGREE_WORDS.includes(norm(tokens[tail-2]?.[0] ?? ""));
          // G2 addition (2): an adjective sign (den Besetzern nicht gewachsen sein, ihm unterlegen sein) keeps
          // «Modal mit sein» — replaces the temporary gewachsen + dative exception (C18, 19.10).
          const adjectiveSignBefore = tail-1 > start && adjectiveSign(String(context.sentence || ""),tokens,tail-1,start,end);
          // L17 (links to-do, reference F12-B9b, user 20.10): modal + participle + worden + sein is the perfect
          // infinitive of the passive (soll … erwähnt worden sein, dass … konzipiert worden sein müsse).
          const passiveAt = tail-2, werdenAux = auxWord === "sein" && norm(tokens[tail-1]?.[0] ?? "") === "worden" ? matches(tail-1).filter(e => e.word === "werden") : [];
          let passiveLexical = werdenAux.length === 1 && passiveAt >= start && passiveAt !== head.i && /^\p{Ll}/u.test(tokens[passiveAt]?.[0] ?? "")
            ? withReflexive(matches(passiveAt),reflexiveRows(passiveAt,"Partizip II")).filter(e => clause.participleOf(e,passiveAt)) : [];
          if (passiveLexical.some(e => norm(e.word) === base(e))) passiveLexical = passiveLexical.filter(e => norm(e.word) === base(e));
          const passiveAux = main.find(e => norm(e.word) === "sein");
          if (passiveLexical.length && adjectivalForm(tokens[passiveAt][0])) passiveLexical = [];
          if (passiveAux && passiveLexical.length && new Set(passiveLexical.map(base)).size === 1) {
            main = passiveLexical; id = "modal-perfect-infinitive"; label = "Perfekt"; mainIndex = passiveAt; passive = true;
            linked = [head.i,passiveAt,tail-1,tail]; roles = [head.e,...passiveLexical,werdenAux[0],passiveAux];
          } else if (PERFECT_AUXILIARIES.includes(auxWord) && tail-1 > start && tail-1 !== head.i && !(auxWord === "sein" && (degreeBefore || adjectiveSignBefore))) {
            const auxEntry = main.find(e => norm(e.word) === auxWord);
            let lexical = withReflexive(matches(tail-1),reflexiveRows(tail-1,"Partizip II"))
              .filter(e => clause.participleOf(e,tail-1) && String(e.auxiliary || "").split(/\s*\/\s*|\s+/u).includes(auxWord));
            if (!reflexiveIn && lexical.some(e => norm(e.word) === base(e))) lexical = lexical.filter(e => norm(e.word) === base(e));
            if (auxEntry && lexical.length && new Set(lexical.map(base)).size === 1) {
              main = lexical; id = "modal-perfect-infinitive"; label = "Perfekt"; mainIndex = tail-1;
              linked = [head.i,tail-1,tail]; roles = [head.e,...lexical,auxEntry];
            } else if (auxWord === "haben" && matches(tail-1).some(e => clause.participleOf(e,tail-1))) {
              // L17 reviewers (21.10.2026): a participle of two verbs before haben (gehört — hören / gehören) leaves the
              // perfect infinitive unproven; «Modal mit haben» would be wrong (musste … das Krachen gehört haben).
              continue;
            }
          }
        } else {
          const modal = infinitives(tail).filter(e=>modals.has(e.word));
          const lexical = tail-1 !== head.i ? infinitives(tail-1) : [];
          // L2 (links to-do, reference F12-B14e, user 20.10): haben + participle + werden + modal is the passive of the
          // modal perfect (die … nicht hatten geklärt werden können), not «Perfekt mit werden können».
          let passiveLexical = head.e.word === "haben" && modal.length === 1 && lexical.length && lexical.every(e => e.word === "werden") &&
            tail-2 >= start && tail-2 !== head.i && /^\p{Ll}/u.test(tokens[tail-2]?.[0] ?? "")
            ? withReflexive(matches(tail-2),reflexiveRows(tail-2,"Partizip II")).filter(e => clause.participleOf(e,tail-2)) : [];
          if (passiveLexical.some(e => norm(e.word) === base(e))) passiveLexical = passiveLexical.filter(e => norm(e.word) === base(e));
          // A participle that is also an own adjective (bekannt, verrückt) may be «become»: no link (reviewers 21.10).
          if (passiveLexical.length && adjectivalForm(tokens[tail-2][0])) continue;
          if (passiveLexical.length && new Set(passiveLexical.map(base)).size === 1) {
            main = passiveLexical; id = "modal-perfect"; mainIndex = tail-2; passive = true;
            linked = [head.i,tail-2,tail-1,tail]; roles = [head.e,...passiveLexical,...lexical,...modal];
          } else if (head.e.word === "haben" && modal.length === 1 && lexical.length && new Set(lexical.map(base)).size === 1) {
            // L12 (corpus, 23.10.2026): hätte / hatte … erneuert werden müssen — a lowercase word before werden that only the
            // external dictionary knows (or an own participle) is the passive participle; «mit werden müssen» («становиться»)
            // would be wrong, so no link (krank werden müssen — an own adjective — stays «werden»).
            const beforeWerden = tail-2 >= start && tail-2 !== head.i ? tokens[tail-2][0] : null;
            if (lexical.every(e => e.word === "werden") && beforeWerden && /^\p{Ll}/u.test(beforeWerden) && !adjectivalForm(beforeWerden) &&
                (!(forms.get(norm(beforeWerden)) || []).length || matches(tail-2).some(e => clause.participleOf(e,tail-2)))) continue;
            main = lexical; id = "modal-perfect"; mainIndex = tail-1;
            linked = [head.i,tail-1,tail]; roles = [head.e,...lexical,...modal];
          } else {
            main = withReflexive(matches(tail),reflexiveRows(tail,"Partizip II")).filter(e => clause.participleOf(e,tail) && norm(e.auxiliary) === head.e.word);
            id = "perfect-group"; linked = [head.i,tail]; roles = [head.e,...main];
            // 20.10.2026 (links to-do, reviewers of L18): a form right after zu is a zu-infinitive, not a participle
            // (hatten sie … keine große Chance zu erraten — haben «иметь», not Plusquamperfekt of erraten).
            if (norm(tokens[tail-1]?.[0] ?? "") === "zu") continue;
            if (head.e.word === "sein" && adjectiveSign(String(context.sentence || ""),tokens,tail,start,end)) continue;
            if (pastConditional(head.e,head.i) && conditionalStateOrRequest(tail)) continue;
            // G2 addition (reference 19.10, user decision): a verb the dictionary forms with haben and with sein
            // (ziehen, treten, fahren) — sein + its participle is Perfekt or a state; the form never tells them apart.
            state = head.e.word === "sein" && main.length > 0 && matches(tail).some(e => clause.participleOf(e,tail) &&
              norm(e.auxiliary) === "haben" && norm(e.word) === base(e) && main.some(m => base(m) === base(e)));
          }
          label = pastConditional(head.e,head.i) ? "Konjunktiv II" : finiteTenses(head.e,head.i).includes("Präteritum") ? "Plusquamperfekt" : "Perfekt";
        }
        if (!main.length || new Set(main.map(base)).size !== 1 || !linked.includes(selected)) continue;
        // A second possible verb outside the group makes attachment uncertain. L29 (21.10.2026): a possessive before
        // a noun is no verb (sind meine Felder besser geworden — not meinen), as in the werden / zu / Futur groups.
        if (indices.some(i => !linked.includes(i) && clause.competing(i) && !clause.nounToken(i) && !clause.possessiveBeforeNoun(i))) continue;
        // The group names the plain verb; a confirmed reflexive reading adds sich
        // in the card (reflexive-verb construction), not here.
        // Without a confirmed reflexive link the group names the bare verb, also
        // when only a reflexive card exists (Das hat ihn gefreut: mit freuen).
        const plain = main.find(e => norm(e.word) === base(e));
        const group = {id,label,lemma:plain ? plain.word : String(main[0].word).replace(/^sich\s+/u,""),roles,spans:[...linked].sort((a,b)=>a-b).map(clause.span),
          ...(id === "modal-perfect-infinitive" ? {modal:head.e.word,clickedRole:selected === tail ? "perfectHave" : passive && selected === tail-1 ? "passive" : null,
            // Reference (user decision 20.10): sollen + perfect infinitive «здесь: говорят, будто» (soll … gepredigt haben).
            // Third person only (soll, sollen): du sollst … gelöst haben, bevor … is an obligation (reviewers 21.10).
            // Not with ich / wir / du / ihr nor a deadline (bis morgen, spätestens): Ich soll das Buch bis morgen gelesen haben.
            ...(head.e.word === "sollen" && ["soll","sollen"].includes(norm(tokens[head.i][0])) && clause.finiteIn(head.e,head.i,"Präsens") &&
              !indices.some(i => ["ich","wir","du","ihr","bis","spätestens"].includes(norm(tokens[i][0]))) ? {hearsay:true} : {})} : {}),
          ...(passive ? {passive:true} : {}),
          // L13 (reference F12-G3b): wäre … gewesen — the clicked wäre is the auxiliary, though the participle is sein too.
          ...(id === "perfect-group" && label === "Konjunktiv II" && selected === head.i ? {clickedRole:"conditionalPast"} : {}),
          ...(state ? {state:true} : {})};
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

      const finiteTenses = (e,i) => ["Präsens","Präteritum"].filter(tense => clause.finiteIn(e,i,tense));
      // L13: hätte / wäre as in verbGroup.
      const pastConditional = (e,i) => !finiteTenses(e,i).length && clause.finiteIn(e,i,"Konjunktiv II");
      const heads = indices.flatMap(i => matches(i).filter(e => PERFECT_AUXILIARIES.includes(e.word) && (finiteTenses(e,i).length || pastConditional(e,i))).map(e => ({i,e})));
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i || ![head.i,tail].includes(selected)) continue;
        const form = tokens[tail][0];
        if (!/^\p{Ll}/u.test(form) || matches(tail).length || lexicalSeparated(norm(form))) continue;
        if (indices.some(i => i !== head.i && i !== tail && clause.competing(i) && !clause.nounToken(i))) continue;
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
        if (norm(tokens[tail-1]?.[0] ?? "") === "zu") continue;
        if (head.e.word === "sein" && adjectiveSign(String(context.sentence || ""),tokens,tail,start,end)) continue;
        if (pastConditional(head.e,head.i) && conditionalGuard(tokens,tail,start,end,indices)) continue;
        // L34 (found in L12, 23.10): sein + a form that is an own adjective (Als er erwachsen war — «взрослый») is not the
        // Perfekt of a verb only the external dictionary knows (erwachsen «происходить»).
        // Not with a source (Daraus ist ein großer Schaden erwachsen, Aus der Freundschaft ist eine Liebe erwachsen).
        if (head.e.word === "sein" && adjectivalForm(form) && !participleAdjectiveCard(form) && !indices.some(i => /^(?:aus|daraus|woraus|hieraus|draus)$/u.test(norm(tokens[i][0])))) continue;
        // G15c (16.10.2026): sein + a degree word + participle of an external
        // verb that the export also forms with haben is a state, not Perfekt
        // (völlig verdreckt, stark verwittert, stark abgetreten).
        const degree = ["völlig","stark","sehr","total","ganz","gänzlich","vollkommen","vollständig","ziemlich","äußerst","leicht","extrem"];
        if (head.e.word === "sein" && auxiliaries.includes("haben") && tail-1 > start && degree.includes(norm(tokens[tail-1][0]))) continue;
        groups.push({id:"perfect-group",label:pastConditional(head.e,head.i) ? "Konjunktiv II" : finiteTenses(head.e,head.i).includes("Präteritum") ? "Plusquamperfekt" : "Perfekt",
          lemma,roles:[head.e,{word:lemma,type:"Verb"}],spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span),
          // G2 addition (reference 19.10): haben and sein both listed — Perfekt or state.
          ...(head.e.word === "sein" && auxiliaries.includes("haben") ? {state:true} : {})});
      }
      return groups.length === 1 ? groups[0] : null;
    }
    // G15 step 4b (16.10.2026): a second participle / infinitive after «und /
    // oder» shares the auxiliary of the pair before it (hat mich … gerufen und
    // die Tür zugemacht — tap on zugemacht). The pair before «und» must be proven
    // by the usual producers on the sentence cut after it; the clicked word must
    // close its segment, nothing between «und» and it may be a finite verb, and
    // the same producers must prove the auxiliary with the clicked word on the
    // sentence where it takes the first word's place (auxiliary compatibility,
    // haben / sein, external evidence — all as for a plain pair).
    async function coordinatedGroup(word, context, candidates) {
      if (!context || !Number.isInteger(context.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'coordinatedGroup');
      const p2 = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (p2 < 3 || !/^\p{Ll}/u.test(tokens[p2][0])) return null;
      const after = sentence.slice(tokens[p2].index + tokens[p2][0].length);
      if (p2 < tokens.length-1 && !/^\s*[,;:.!?…»«"“”()–—-]/u.test(after) && !COORDINATORS_WITHOUT_COMMA.includes(norm(tokens[p2+1][0]))) return null;
      let u = -1;
      for (let i = p2-1; i > 0; i--) {
        // A comma between «und» and the word starts another clause (… und zusehen, dass … können).
        if (/[,;:.!?…»«"“”()–—]/u.test(sentence.slice(tokens[i].index + tokens[i][0].length,tokens[i+1].index))) return null;
        if (COORDINATORS_WITHOUT_COMMA.includes(norm(tokens[i][0]))) { u = i; break; }
        if (/^\p{Ll}/u.test(tokens[i][0]) && (verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "finite")) return null;
      }
      if (u < 2) return null;
      const p1 = u-1;
      if (!/^\p{Ll}/u.test(tokens[p1][0]) || /[,;:]/u.test(sentence.slice(tokens[p1].index + tokens[p1][0].length,tokens[u].index))) return null;
      const subset = constructionProducers.filter(p => ["werden","verb-group","external-perfect","external-passive","external-modal"].includes(p.id));
      const left = sentence.slice(0,tokens[p1].index + tokens[p1][0].length) + ".";
      const leftGroup = await runConstructionProducers(tokens[p1][0],{sentence:left,tokenOffset:tokens[p1].index},candidates,subset);
      const heads = (leftGroup?.spans || []).filter(span => span.start !== tokens[p1].index);
      if (!leftGroup || heads.length !== 1) return null;
      const base = sentence.slice(0,tokens[p1].index);
      const synthetic = base + tokens[p2][0] + ".";
      const group = await runConstructionProducers(tokens[p2][0],{sentence:synthetic,tokenOffset:base.length},candidates,subset);
      if (!group || group.id !== leftGroup.id || !(group.spans || []).some(span => span.start === heads[0].start)) return null;
      const spans = group.spans.map(span => span.start === base.length ? {text:tokens[p2][0],start:tokens[p2].index,end:tokens[p2].index + tokens[p2][0].length} : span);
      if (spans.length !== 2) return null;
      const copy = {...group,spans};
      if (group.lexical) Object.defineProperty(copy,'lexical',{value:{...group.lexical,offset:tokens[p2].index},enumerable:false});
      return copy;
    }
    // G15 step 3b (16.10.2026): modal + infinitive and Futur I / würde of a verb
    // only the external dictionary knows (Israel will … bekämpfen, man muss das
    // Problem thematisieren, er werde … kandidieren). Same strict frame: finite
    // modal / werden of the own dictionary, the infinitive closes the clause, no
    // other possible verb, no zu before it, and the external dictionary has a verb
    // of exactly that spelling. A Futur whose infinitive is also a participle of
    // that verb (erhalten) is left to the passive rules.
    async function externalModalGroup(word, context) {
      const clause = verbalClause(word,context,'externalModalGroup',clauseBoundaries.verbGroup);
      if (!clause) return null;
      const {sentence,tokens,selected,start,end,indices} = clause, matches = clause.verbs;

      const modals = MODAL_VERB_SET;
      // (L23: a modal's Konjunktiv I — könne, solle — heads it too)
      const finiteTenses = (e,i) => ["Präsens","Präteritum","Konjunktiv II",...konj1At(tokens,i)].filter(tense => clause.finiteIn(e,i,tense));
      const heads = indices.flatMap(i => matches(i).filter(e => (modals.has(e.word) || e.word === "werden") && finiteTenses(e,i).length).map(e => ({i,e})));
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i || ![head.i,tail].includes(selected)) continue;
        const form = tokens[tail][0];
        // C14 step 1: a reflexive-only own card (sich stoßen) without a reflexive pronoun in the clause
        // does not cover the plain verb (auf ihn stoßen solltest).
        const reflexiveIn = indices.some(i => reflexivePronouns.has(norm(tokens[i][0])));
        const ownTail = matches(tail).filter(e => reflexiveIn || !(e.type === "Verb" && /^sich\s/u.test(norm(e.word))));
        if (!/^\p{Ll}/u.test(form) || ownTail.length || lexicalSeparated(norm(form)) || norm(tokens[tail-1][0]) === "zu") continue;
        if (COMPARISON_PARTICLES.includes(norm(tokens[tail+1]?.[0] ?? ""))) continue;
        // G15 (18.10.2026): an article / pronoun spelling before a dash is a broken-off phrase
        // (wollte ich einen – hier lang), not the infinitive (einen «unite»).
        if (tail+1 < tokens.length && /[–—]/u.test(sentence.slice(tokens[tail].index+form.length,tokens[tail+1].index)) &&
          (forms.get(norm(form)) || []).some(e => ["article","Pronomen"].includes(e.type))) continue;
        const nominal = i => /^\p{Lu}/u.test(tokens[i][0]) && (i > 0 || /^\p{Lu}/u.test(tokens[i+1]?.[0] ?? ""));
        if (indices.some(i => i !== head.i && i !== tail && clause.competing(i) && !clause.nounToken(i) && !clause.possessiveBeforeNoun(i) && !nominal(i))) continue;
        let facts;
        try { facts = await lexicalLookup(form,'externalModalGroup'); } catch (_) { return null; }
        if (!facts.some(g => !g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length && norm(g.word) === norm(form))) continue;
        const lemma = norm(form);
        const tense = finiteTenses(head.e,head.i);
        let id, note = null, meaning = null;
        if (modals.has(head.e.word)) { id = "modal-group"; }
        else if (tense.includes("Konjunktiv II")) { id = "werden-conditional"; note = {en:"Konjunktiv II",ru:"Konjunktiv II"}; meaning = selected === head.i ? {en:"would",ru:"бы"} : null; }
        else if (tense.includes("Präsens")) {
          const participle = facts.some(g => g.kind === 'form-note' && (g.inflections || []).some(r => r.tags?.includes('participle') && r.tags.includes('past') && norm(r.form) === lemma));
          if (participle) continue;
          // An inseparable-prefix verb usually has the same participle (übersehen,
          // belassen, umgeben, mißverstanden): Futur only with an accusative object
          // (du wirst sie nie wieder erblicken), as in G15a; otherwise no link.
          if (/^(?:be|ge|er|ver|zer|ent|emp|miss|miß|über|unter|wider|hinter|voll|durch|um)/u.test(lemma)) {
            const words = indices.filter(i => i !== head.i && i !== tail && !(norm(tokens[i][0]) === "sich" && DECLINED_PRESENT_PARTICIPLE.test(tokens[i+1]?.[0] ?? ""))).map(i => norm(tokens[i][0]));
            // A reflexive pronoun (sich erinnern, sich erholen, uns unterziehen) also proves the active Futur.
            const accusative = words.some(w => OBJECT_ONLY_WORDS.includes(w)) ||
              words.some(w => NOMINATIVE_PRONOUNS.includes(w)) && words.some(w => ES_SIE.includes(w));
            const agent = words.some(w => PASSIVE_AGENT_PREPOSITIONS.includes(w));
            if (agent && !accusative) {
              groups.push({id:"werden-passive",lemma,roles:[head.e,{word:lemma,type:"Verb"}],note:{en:"Passiv · Präsens",ru:"Passiv · Präsens"},
                ...(selected === head.i ? {meaning:{en:"passive auxiliary",ru:"вспомогательный глагол пассива"}} : {}),spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span)});
              continue;
            }
            if (!accusative) {
              // Neither proven: «Futur I / Passiv» (user decision 16.10, G15a).
              groups.push({id:"werden-future-or-passive",lemma,roles:[head.e,{word:lemma,type:"Verb"}],note:{en:"Futur I or passive",ru:"Futur I или пассив"},
                ...(selected === head.i ? {meaning:{en:"auxiliary: future or passive",ru:"вспомогательный глагол: будущее время или пассив"}} : {}),spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span)});
              continue;
            }
          }
          id = "werden-future"; note = {en:"Future / inference",ru:"Будущее / предположение"};
          meaning = selected === head.i ? {en:"will / probably",ru:"будет / вероятно"} : null;
        } else continue;
        groups.push({id,label:id === "modal-group" ? "Modal" : undefined,lemma,roles:[head.e,{word:lemma,type:"Verb"}],
          ...(note ? {note} : {}),...(meaning ? {meaning} : {}),spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span)});
      }
      return groups.length === 1 ? groups[0] : null;
    }
    // G15 step 3a (16.10.2026): werden-passive of a verb only the external
    // dictionary knows (wurde … eskortiert, wird … taxiert). Same frame and
    // evidence as externalPerfectGroup: finite werden of the own dictionary, the
    // participle closes the clause, no other possible verb, the participle is an
    // explicit past participle of that verb. A participle that equals the
    // infinitive (erhalten) needs an agent (von / vom / durch), as in G15a.
    async function externalPassiveGroup(word, context) {
      const clause = verbalClause(word,context,'externalPassiveGroup',clauseBoundaries.werden);
      if (!clause) return null;
      const {tokens,selected,start,end,indices} = clause, matches = clause.verbs;

      const finiteTenses = (e,i) => ["Präsens","Präteritum","Konjunktiv II"].filter(tense => clause.finiteIn(e,i,tense));
      const heads = indices.flatMap(i => matches(i).filter(e => e.word === "werden" && finiteTenses(e,i).length).map(e => ({i,e})));
      const groups = [];
      for (const head of heads) {
        const tail = head.i === end ? end-1 : end;
        if (tail <= start || tail === head.i || ![head.i,tail].includes(selected)) continue;
        const form = tokens[tail][0];
        if (!/^\p{Ll}/u.test(form) || matches(tail).length || lexicalSeparated(norm(form))) continue;
        // A capitalised word inside the sentence, or one before another capitalised
        // word (Sein Vermögen), is a noun phrase here, not a competing verb.
        const nominal = i => /^\p{Lu}/u.test(tokens[i][0]) && (i > 0 || /^\p{Lu}/u.test(tokens[i+1]?.[0] ?? ""));
        if (indices.some(i => i !== head.i && i !== tail && clause.competing(i) && !clause.nounToken(i) && !clause.possessiveBeforeNoun(i) && !nominal(i))) continue;
        let facts;
        try { facts = await lexicalLookup(form,'externalPassiveGroup'); } catch (_) { return null; }
        const verbsKnown = new Set(facts.filter(g => !g.kind && !g.unresolved && canonicalPos(g.pos) === 'Verb' && g.meanings?.length).map(g => norm(g.word)));
        const lemmas = new Set([
          ...facts.filter(g => g.kind === 'form-note').flatMap(g => g.inflections || [])
            .filter(r => r.tags?.includes('participle') && r.tags.includes('past') && norm(r.form) === norm(form)).map(r => norm(r.lemma)),
          ...facts.filter(g => g.kind === 'form-note' && canonicalPos(g.pos) === 'Verb').flatMap(g => g.meanings || [])
            .map(m => /^past participle of ([\p{L}\p{M}]+)/iu.exec(m)?.[1]).filter(Boolean).map(norm)
        ].filter(lemma => verbsKnown.has(lemma)));
        if (lemmas.size !== 1) continue;
        const [lemma] = lemmas;
        if (lemma === norm(form) && !indices.some(i => PASSIVE_AGENT_PREPOSITIONS.includes(norm(tokens[i][0])))) continue;
        // A degree word before it makes the participle an adjective: werden =
        // become (wurde er ein wenig niedergeschlagen), as in G15c.
        if (["wenig","sehr","ganz","völlig","total","ziemlich","etwas","immer","so","zu","äußerst","leicht","extrem"].includes(norm(tokens[tail-1][0]))) continue;
        // An own adjective of that spelling is werden = become (wurde … bekannt),
        // and a comparison after it continues the clause (wird zerstreut als … genutzt).
        // L34: not an adjective card that names this verb and means something else (wurde … aufgeweckt — aufwecken).
        if ((forms.get(norm(form)) || []).some(e => e.type === "Adjektiv") && !participleAdjectiveCard(form) || COMPARISON_PARTICLES.includes(norm(tokens[tail+1]?.[0] ?? ""))) continue;
        const tense = finiteTenses(head.e,head.i);
        groups.push({id:"werden-passive",lemma,roles:[head.e,{word:lemma,type:"Verb"}],
          note:{en:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : tense.includes("Konjunktiv II") ? "Konjunktiv II" : "Präsens"}`,ru:`Passiv · ${tense.includes("Präteritum") ? "Präteritum" : tense.includes("Konjunktiv II") ? "Konjunktiv II" : "Präsens"}`},
          meaning:selected === head.i ? {en:"passive auxiliary",ru:"вспомогательный глагол пассива"} : null,
          spans:[head.i,tail].sort((a,b)=>a-b).map(clause.span)});
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
      const boundaryWords = new Set(["und","oder","aber","denn","sondern","weil","dass","daß","wenn","ob","doch"]);
      let start = index, end = index;
      while (start > 0 && adjacent(start-1,start) && !boundaryWords.has(norm(tokens[start-1][0]))) start--;
      while (end + 1 < tokens.length && adjacent(end,end+1) && !boundaryWords.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const isAdjective = i => matches(i).some(e => e.type === "Adjektiv") ||
        ADJECTIVE_ENDINGS.some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      let nounPhrase = false;
      for (let i = next; i < tokens.length && i <= next + 2; i++) {
        if (!adjacent(i-1,i)) break;
        if (matches(i).some(e => e.type === "Nomen") && /^[A-ZÄÖÜ]/u.test(tokens[i][0])) { nounPhrase = true; break; }
        if (!isAdjective(i)) break;
      }
      const modalLemmas = ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden"];
      const finiteForm = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II",...konj1At(tokens,i)].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? formIn(group,person) : Object.values(group)).some(form => form && norm(form) === norm(tokens[i][0]));
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
        clauseIndices.some(i => i < index && matches(i).some(e => e.type === "Verb" && PERFECT_AUXILIARIES.includes(e.word) && finiteForm(e,i)));
      return {word,sentence:String(context.sentence || ""),candidates,tokens,index,start,end,next,previous,adjacent,matches,isAdjective,nounPhrase,modalLemmas,
        finiteForm,modalInClause,dativeLemmas,dativeFinite,dativeFollowing,dativePreposition,perfectDative};
    }
    const seinVerbIds = f => f.candidates.filter(c => c.pos === "Verb" && c.lemma === "sein").map(c => c.dictionaryId);
    const contextualProducers = {
      // G34 (21.10.2026): Ihr / Ihre with a capital inside the sentence (not after a quote, colon, dash, bracket, «…» or an end
      // mark) is the polite «Ваш» only with an explicit sign — the polite Sie / Ihnen in the same sentence (Strecken Sie Ihren
      // Arm aus); titles (dass Ihre Hoheit krank sei) and the archaic «Ihr Kinder» keep «её / их / Ваш».
      'possessive-before-noun': f => f.nounPhrase ?
        {ids:/^Ihr/u.test(f.word) && f.index > 0 && !/(?:[„“"»«‚‘:–—(….?!;]|\s-)\s*$/u.test(f.sentence.slice(0,f.tokens[f.index].index)) &&
          // titles of the 3rd person (Ihre Majestät, Ihrer Hoheit) — named exception, user 21.10
          !f.tokens.slice(f.index+1,f.index+4).some(t => /^(?:majestät|hoheit|exzellenz|durchlaucht|eminenz|heiligkeit|gnaden|erlaucht|magnifizenz)$/u.test(norm(t[0]))) &&
          f.tokens.some((t,i) => i !== f.index && /^(?:Sie|Ihnen)$/u.test(t[0])) ? ["pronoun-018"] : ({mein:["pronoun-011"],dein:["pronoun-012"],sein:["pronoun-013"],ihr:["pronoun-014","pronoun-015"],unser:["pronoun-016"],euer:["pronoun-017"],eur:["pronoun-017"]})[
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
      const definite = DEFINITE_ARTICLES.includes(determiner);
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
      const caseByPrep = PREPOSITION_CASE_CODE;
      const prepIndex = articleKind === "strong" ? left : left-1;
      const governedCase = prepIndex >= start ? caseByPrep[norm(tokens[prepIndex][0])] : undefined;
      const allowed = new Set();
      for (const noun of nouns) {
        const pluralForms = String(noun.plural || "").split(/\s*,\s*/).filter(p => p && p !== "—");
        const isPlural = noun.numberUnknown || pluralForms.some(p => norm(p) === norm(tokens[head][0]) || !/[ns]$/iu.test(p) && norm(p)+"n" === norm(tokens[head][0]));
        const isSingular = noun.numberUnknown || noun.number !== 'plural' && (norm(noun.word) === norm(tokens[head][0]) || !isPlural);
        const genders = GENDER_ARTICLES.includes(noun.article) ? [noun.article] : [...GENDER_ARTICLES];
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
      let favoured = [...new Set(compatible.map(row => row.candidate))];
      // B (17.10.2026): an attributive participle without sich before it belongs to
      // the plain verb, not to its sich-twin (seltsam gekleideter Menschen).
      const twinBase = c => norm(c.lemma).replace(/^sich\s+/u,"");
      if (favoured.length > 1 && favoured.every(c => canonicalPos(c.pos) === "Verb") && new Set(favoured.map(twinBase)).size === 1 &&
          !tokens.slice(Math.max(left+1,0),index).some(t => norm(t[0]) === "sich")) {
        // An own plain card wins; with only an external plain verb the own sich-card
        // is kept (gebückter → sich bücken, user decision 17.10.2026).
        const own = favoured.filter(c => c.source === "main"), plain = own.filter(c => !/^sich\s/u.test(norm(c.lemma)));
        // A spelling that is also finite (Das erinnerte Harry an …) keeps the choice.
        const finiteSpellingToo = (verbAnalyses.get(norm(word)) || []).some(a => a.kind === "finite");
        if (plain.length) favoured = plain; else if (own.length && !finiteSpellingToo) favoured = own;
      }
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
      if(head-det>3||!DEFINITE_ARTICLES.includes(norm(tokens[det][0]))||
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
            ending:norm(a.form).match(ADJECTIVE_ENDING_AT_END)?.[0],kind:a.tags.includes('comparative')?'comparative':a.tags.includes('superlative')?'superlative':'adjective'})).filter(a=>a.ending),
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
        (candidates.length || !DECLINED_ENDING.test(word)))return null;
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
        // L34 (user 23.10): before a noun an adjective card with participle_default "verb" / "choice" is the verb only with a
        // dependent of the participle between the determiner and it — an adverb (die neu gebildete Regierung, die einmal
        // gefasste Entscheidung), a preposition + noun (der in Gold gefasste Rubin), von + person, damit / dadurch; shown as
        // «Partizip II · От …». A degree word (eine sehr gebildete Frau) or an adjective joined to it keeps the adjective;
        // the bare participle (ein gebildeter Mann, das ausgelassene Fest, der gesetzte Termin) is the reader's choice,
        // the adjective first.
        if(rank.preferred&&rank.preferred.source==='main'&&['verb','choice'].includes(rank.preferred.item?.participle_default)&&!rank.preferred.item?.adjective_after_sein){
          const card=rank.preferred,lemma=norm(card.item.participle_of||'').replace(/^sich\s+/u,'');
          const verbs=[...extended,...(rank.candidates||[])].filter(c=>canonicalPos(c.pos)==='Verb'&&norm(c.lemma).replace(/^sich\s+/u,'')===lemma);
          const w=i=>norm(tokens[i]?.[0]??''),gap=(a,b)=>sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
          const adjectiveOnly=x=>(forms.get(x)||[]).some(e=>e.type==='Adjektiv')&&!(forms.get(x)||[]).some(v=>v.type==='Verb');
          const plainAdjective=i=>{if(i<0||!/^\p{Ll}/u.test(tokens[i]?.[0]??''))return false;const x=w(i);
            return ADJECTIVE_ENDINGS_WITH_BARE.some(e=>x.endsWith(e)&&(forms.get(x.slice(0,x.length-e.length))||[]).some(r=>r.type==='Adjektiv'&&norm(r.word)===x.slice(0,x.length-e.length)));};
          const DEGREE=ATTRIBUTE_DEGREE_WORDS;
          const joined=index>1&&w(index-1)==='und'&&plainAdjective(index-2)||index>0&&/^\s*,\s*$/u.test(gap(index-1,index))&&plainAdjective(index-1);
          const DET=DETERMINER_WORD;
          let det=-1;for(let j=index-1;j>=0&&j>=index-6;j--){if(/[,;:.!?]/u.test(gap(j,j+1)))break;if(DET.test(w(j))){det=j;break;}}
          const between=det>=0?Array.from({length:index-det-1},(_,d)=>det+1+d):[];
          const degree=DEGREE.has(w(index-1))||attributiveParticipleReading(tokens,between)==='adjective';
          const plainVerbs=verbs.filter(c=>!/^sich\s/u.test(norm(c.lemma)));
          if(!degree&&!joined&&verbs.length&&new Set(verbs.map(c=>norm(c.lemma).replace(/^sich\s+/u,''))).size===1){
            // A dependent: anything between the determiner and the participle that is no degree word and no plain adjective.
            // An undeclined adjective is an adverb of the participle (die neu gebildete, das frisch vermessene); a declined one
            // is another attribute (eine kluge gebildete Frau).
            // Simplified variant (user 23.10): no verb by default before a noun — the reader's choice, the adjective first.
            const dependent=false;
            if(dependent){
              const pool=plainVerbs.length?plainVerbs:verbs,chosen=pool.find(c=>c.usage)||pool[0];
              rank.preferred=chosen.usage?chosen:{...chosen,usage:{kind:'participle-II',role:'attributive',form:word,base:chosen.lemma,head:tokens[head]?.[0]}};
              rank.blocked=false;
            }
            else{rank.preferred=null;rank.blocked=true;
              if(Array.isArray(rank.candidates))rank.candidates=[...rank.candidates.filter(c=>window.BibliothekVocabulary.identity(c)===window.BibliothekVocabulary.identity(card)),
                ...rank.candidates.filter(c=>window.BibliothekVocabulary.identity(c)!==window.BibliothekVocabulary.identity(card))];}
          }
        }
        // L34: an adjective card that means something else (geschickt, ausgezeichnet, verschlagen …, default adjective) before
        // a noun is its verb with von + a person between the determiner and it (die vom Verband ausgezeichnete Schule, die von
        // uns geschickte Ware).
        if(rank.preferred&&rank.preferred.source==='main'&&rank.preferred.item?.meaning_differs&&rank.preferred.item?.participle_of&&
          !['verb','choice'].includes(rank.preferred.item?.participle_default)&&!rank.preferred.item?.von_agent_ok){
          const card=rank.preferred,lemma=norm(card.item.participle_of).replace(/^sich\s+/u,''),w=i=>norm(tokens[i]?.[0]??'');
          const verbs=[...extended,...(rank.candidates||[])].filter(c=>canonicalPos(c.pos)==='Verb'&&norm(c.lemma).replace(/^sich\s+/u,'')===lemma);
          let k=-1;for(let j=index-1;j>=0&&j>=index-5;j--){if(/[,;:.!?]/u.test(sentence.slice(tokens[j].index+tokens[j][0].length,tokens[j+1].index)))break;if(VON_AGENT_PREPOSITIONS.includes(w(j))){k=j;break;}}
          const agent=k>=0&&(w(k)==='vom'||VON_AGENT_WORD.test(w(k+1))||/^\p{Lu}/u.test(tokens[k+1]?.[0]??''));
          if(agent&&verbs.length){const plain=verbs.filter(c=>!/^sich\s/u.test(norm(c.lemma))),pool=plain.length?plain:verbs,chosen=pool.find(c=>c.usage)||pool[0];
            rank.preferred=chosen.usage?chosen:{...chosen,usage:{kind:'participle-II',role:'attributive',form:word,base:chosen.lemma,head:tokens[head]?.[0]}};rank.blocked=false;}
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
    // 19.10.2026: a card that stands before its noun only in a rare variant (zufolge: standard Dativ + zufolge;
    // zufolge + Genitiv only Swiss / legal) does not govern the words after it (Gerüchten zufolge einen Vertrag).
    const governedCases = (entry,position = "before") => {
      const rows = (entry?.government || []).filter(g => g.position === position && !g.combined_with);
      if (position === "before" && rows.length && !rows.some(g => g.status === "standard")) return new Set();
      return new Set(rows.map(g => caseNamesDe[g.case]).filter(Boolean));
    };
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
    const nounGenders = ARTICLE_GENDER;
    // G9 (21.10.2026): the word opens quoted speech (»Au, …, — »Ja, …); its capital proves no noun.
    function opensQuotedSpeech(sentence, offset) { return /[»«„“"‘›‹‚]\s*$/u.test(String(sentence).slice(0,offset)); }
    // G9: the ordinary reading beside a name is evidence only when it is an own card or the external record lists it
    // before the name (der Wolf, der Müller); a given name whose noun is slang or a word form (Jürgen, Hagen, Johannes) is not.
    const nameReadingOrders = new Map();
    const ordinaryBeforeName = (candidate, word) => candidate?.source === "main" || nameReadingOrders.get(`${candidate?.pos}:${word}`) === true;
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
        ...morph.analyses.filter(a => a.kind === "inflection" && canonicalPos(a.pos) === "Adjektiv").map(a => norm(a.form).match(ADJECTIVE_ENDING_AT_END)?.[0]).filter(Boolean)]);
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
      const ending = !morph.candidates.length && /^[a-zäöüß]{5,}$/u.test(surface) && norm(surface).match(ADJECTIVE_ENDING_AT_END)?.[0];
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
      if (word.length > 1 && word === word.toUpperCase()) return null;
      const features = determinerFeatures(word);
      if (!features) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'articleInNounGroup');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      // Relative pronouns open a clause after a comma (…, die Ämter haben;
      // …, in der Menschen leben): no automatic article there. 20.10.2026: not after a colon, which opens a new
      // clause (…: Außer dem Hochwasserschutz hält er …), and never for des (…, aufgrund des Rätselcharakters).
      const commaBefore = i => i > 0 && /[,;(]/u.test(sentence.slice(tokens[i-1].index+tokens[i-1][0].length,tokens[i].index));
      const previous = index > 0 && joinedTokens(sentence,tokens,index-1,index) ? prepositionCardsByForm.get(norm(tokens[index-1][0])) : null;
      // Only der-forms double as relative pronouns; ein/kein forms do not.
      const definite = articles[0].item?.grammar?.article_kind === "definite";
      if (definite && norm(word) !== "des" && (commaBefore(index) || previous && commaBefore(index-1))) return null;
      // C21 (18.10.2026): a numeral right after the article stands for the noun (den sechsen,
      // zu den dreien, die drei, die Hunderte): the article reading, no agreement to check.
      const nextNumeral = index + 1 < tokens.length && /^\s*$/u.test(sentence.slice(tokens[index].index+tokens[index][0].length,tokens[index+1].index)) &&
        (forms.get(norm(tokens[index+1][0])) || []).some(e => e.type === "numeral") &&
        !(index + 2 < tokens.length && /^\p{Lu}/u.test(tokens[index+2][0]) && /^\s*$/u.test(sentence.slice(tokens[index+1].index+tokens[index+1][0].length,tokens[index+2].index)));
      if (nextNumeral) return {candidate:articles[0],evidence:"article-before-numeral"};
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
        if ((verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === 'finite' && COPULAS.includes(norm(a.base))))
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
    // C21 (18.10.2026): numeral readings from the clause. An own or generated numeral card of
    // this spelling is chosen (1) before its noun, possibly after adjectives (Drei Tage, Die Drei
    // Männlein, drei goldene Teller), before von (Zwei von uns), next to another number (zwei oder
    // drei), after um / gegen / bis (um acht); (2) as a whole reply (»Fünf«, sagte Ron); (3) as
    // an ordinal after a determiner or als (am achten Tag, der Erste, als Erste); (4) for the
    // indefinite cards (Hunderte, Tausende) always. A capital after a determiner with no noun
    // after it (eine Drei, die Zehn ist) stays a noun. eins: one (pronoun ein) unless the clause
    // counts (um eins, Teil eins, eins, zwei); next to sein / werden (sind eins) a choice.
    // C21b (18.10.2026): zu zweit / zu dritt / zu dreien … «вдвоём / втроём»: the card's `collective`
    // forms right after zu, not before a capitalised word or a figure (zu acht Uhr, zu zweien Teilen).
    function collectiveFrame(word, context, item) {
      const forms = item?.collective?.forms || [];
      if (!forms.some(f => norm(f) === norm(word)) || !Number.isInteger(context?.tokenOffset)) return null;
      const sentence = String(context.sentence || ""), at = context.tokenOffset;
      const before = /(?<![\p{L}\p{M}])([Zz]u)[ \t]+$/u.exec(sentence.slice(0,at));
      if (!before || /^[ \t]+(?:\p{Lu}|\p{N})/u.test(sentence.slice(at+word.length))) return null;
      return [{text:before[1],start:before.index,end:before.index+2},{text:sentence.slice(at,at+word.length),start:at,end:at+word.length}];
    }
    function numeralReading(word, context, candidates) {
      const sentence = String(context?.sentence || ""), offset = context?.tokenOffset;
      if (!Number.isInteger(offset)) return null;
      const surface = norm(word);
      const numerals = candidates.filter(c => c.source === "main" && c.item?.type === "numeral" &&
        [c.item.word,...(c.item.search_forms || [])].some(f => norm(f) === surface));
      if (numerals.length !== 1) return null;
      const numeral = numerals[0], kind = numeral.item.grammar?.numeral_kind;
      const tokens = [...sentence.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu)];
      const index = tokens.findIndex(t => t.index === offset);
      if (index < 0) return null;
      const text = i => tokens[i]?.[0] ?? "", low = i => norm(text(i));
      const gap = (a,b) => sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index);
      const capital = i => /^\p{Lu}/u.test(text(i)) && text(i) !== text(i).toUpperCase();
      const entriesAt = i => forms.get(low(i)) || [];
      const isNumber = i => /^\p{N}+$/u.test(text(i)) || entriesAt(i).some(e => e.type === "numeral") || !!numeralGrammar(text(i));
      const determiners = numeralDeterminers;
      const choose = evidence => ({candidate:numeral,evidence});
      if (kind === "indefinite") return choose("numeral-indefinite");
      if (collectiveFrame(word,context,numeral.item)) return choose("numeral-collective");
      // die Elfe (elf) is the noun; only the lowercase old form elfe is the number.
      if (surface === "elfe" && /^\p{Lu}/u.test(word)) return null;
      if (surface === "eins") {
        const pronoun = candidates.find(c => c.source === "main" && canonicalPos(c.pos) === "Pronomen" && norm(c.lemma) === "ein");
        // eine Eins (the mark), die Eins: the noun card decides.
        if (index > 0 && determiners.has(low(index-1))) return null;
        const counts = ["um","gegen","bis","ab","nach","vor","plus","minus","mal"].includes(low(index-1)) ||
          // Linie eins. / Teil eins und zwei: a noun before and the phrase ends (or the series continues).
          index > 1 && capital(index-1) && /^\s*$/u.test(gap(index-1,index)) && !/[.!?:;»«„“"]\s*$/u.test(sentence.slice(0,tokens[index-1].index)) &&
            (index + 1 >= tokens.length || /[.,;:!?)»«“”"]/u.test(gap(index,index+1))) ||
          [index-1,index+1].some(i => i >= 0 && i < tokens.length && i !== index && isNumber(i) && low(i) !== "und") ||
          ["zu","plus","minus","und"].includes(low(index+1)) && isNumber(index+2);
        if (counts) return choose("numeral-counting");
        // sind eins, ist eins, eins werden / geworden, sich eins: «being one / agreeing» — the reader chooses.
        const beWords = new Set(["bin","bist","ist","sind","seid","war","waren","wird","werden","wurde","wurden","ward"]);
        if (beWords.has(low(index-1)) || ["sein","werden","geworden","worden","sind","waren","wären"].includes(low(index+1)) || low(index-1) === "sich") return null;
        return pronoun ? {candidate:pronoun,evidence:"eins-pronoun"} : null;
      }
      // (3) an ordinal after a determiner or als.
      if (kind === "ordinal" && index > 0 && determiners.has(low(index-1)) && /^\s*$/u.test(gap(index-1,index))) return choose("ordinal-after-determiner");
      // (2) a whole reply: »Fünf«, sagte Ron. / »Null.«
      const before = sentence.slice(0,tokens[index].index), after = sentence.slice(tokens[index].index + text(index).length);
      if (/(?:^|[»«„“"‘–—])\s*$/u.test(before) && /^\s*[.!?…]?\s*[«»“”"‘’]/u.test(after)) return choose("numeral-reply");
      // (1) before its noun (possibly after adjectives), before von, next to another number, after um / gegen / bis.
      if (["um","gegen","bis","ab"].includes(low(index-1)) && kind === "cardinal") return choose("numeral-time");
      let j = index + 1;
      while (j < tokens.length && j - index <= 3 && /^\s*$/u.test(gap(j-1,j)) && !capital(j) &&
        (modifiers.has(low(j)) || entriesAt(j).some(e => ["Adjektiv","Adverb"].includes(e.type) && norm(e.word) !== low(j) || e.type === "Adjektiv"))) j++;
      if (j < tokens.length && /^\s*-?\s*$/u.test(gap(j-1,j)) && (capital(j) || (j === index + 1 && ["von","vom"].includes(low(j))))) return choose("numeral-before-noun");
      if (index + 1 < tokens.length && NUMERAL_SERIES_JOINERS.includes(low(index+1)) && /^\s*$/u.test(gap(index,index+1)) && isNumber(index+2)) return choose("numeral-series");
      if (index > 1 && NUMERAL_SERIES_JOINERS.includes(low(index-1)) && isNumber(index-2)) return choose("numeral-series");
      // An ordinal or a generated cardinal has no other own reading but an external noun / adjective of the same number.
      if (numeral.item.grammar?.generated && !candidates.some(c => c !== numeral && c.source === "main")) return choose("numeral-generated");
      return null;
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
      if (index < 0 || word.length > 1 && word === word.toUpperCase()) return null;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const boundary = /[,;:.!?()„“”"«»]/u;
      const prep = {candidate:preps[0],rule:'preposition-government'};
      // bis zu, bis an …: a combination named in the card's government.
      const combined = new Set((card.government || []).filter(g => g.status === "standard").flatMap(g => String(g.combined_with || "").split("/")).map(norm).filter(Boolean));
      const next = tokens[index+1] && !boundary.test(gap(index,index+1)) ? norm(tokens[index+1][0]) : null;
      if (next && (combined.has(next) || combined.has(contractionForms[next]?.[0]))) return {...prep,evidence:'preposition-combination'};
      // 19.10.2026 (außer, seit, bis, während): a subject pronoun with an agreeing finite verb right after it
      // (Außer du möchtest …, außer ihr verschwindet, bis er kommt) makes the same-word conjunction card, not the
      // preposition. Agreement is checked: außer ihr gab es … (ihr = Dativ «её») stays a preposition.
      const sameConjunction = candidates.filter(c => c.source === "main" && canonicalPos(c.pos) === "Konjunktion" && norm(c.lemma) === norm(word));
      if (sameConjunction.length === 1 && next && tokens[index+2] && !boundary.test(gap(index+1,index+2)) &&
          (/^[a-zäöüß]/u.test(tokens[index+1][0]) || tokens[index+1][0] === "Sie")) {
        const persons = {ich:["ich"],du:["du"],er:["er/sie/es"],es:["er/sie/es"],man:["er/sie/es"],sie:["er/sie/es","sie"],wir:["wir"],ihr:["ihr"]}[next];
        if (persons && (await tokenAnalyses(tokens[index+2][0],undefined,'prepositionChoice')).some(a => a.kind === "finite" && !a.detached && persons.includes(a.person)))
          return {candidate:sameConjunction[0],rule:'subordinate-clause',evidence:'conjunction-subject-verb'};
      }
      const governed = governedCases(card);
      // A figure right after the preposition (über 60 Prozent) may be an adverbial "more than".
      const figureFirst = tokens[index+1] && /\d/u.test(gap(index,index+1));
      // C21 (18.10.2026): a dative numeral form without a noun (zu dreien, mit gleich fünfen von uns),
      // possibly after one adverb, is governed by the preposition.
      const dativeNumeral = i => tokens[i] && /en$/u.test(norm(tokens[i][0])) && (forms.get(norm(tokens[i][0])) || []).some(e => e.type === "numeral" &&
        e.grammar?.numeral_kind === "cardinal" && norm(e.word) !== norm(tokens[i][0]));
      if (next && (dativeNumeral(index+1) || dativeNumeral(index+2) && (forms.get(next) || []).some(e => e.type === "Adverb") && !boundary.test(gap(index+1,index+2))))
        return {...prep,evidence:'preposition-before-numeral'};
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
      const isArticle=DEFINITE_ARTICLES.includes(norm(word));
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
            gender:ARTICLE_GENDER[noun.article],number:key === 'plural' ? 'plural' : 'singular',
            cases:cases.map(i => caseNames[i]),article:tokens[det][0],noun:tokens[head][0],spans:[span(det),span(head)]});
        }
      }
      return result;
    }
    // C20 (18.10.2026): a lowercase word inside a text that writes nouns with a
    // capital (another capitalised word inside an utterance of the same
    // sentence) is not a noun: umhängen ≠ der Umhang, ein paar ≠ das
    // Paar, die leeren ≠ die Leere. A compound part after a hyphen (und -pilzen)
    // stays a noun.
    function lowercaseNounRisk(word, context, candidates) {
      // A spelling with a capital inside (iPhone, eBay) is a name written that way.
      if (!/^\p{Ll}/u.test(String(word)) || /\p{Lu}/u.test(String(word)) || !candidates.some(c => canonicalPos(c.pos) === 'Nomen') || !Number.isInteger(context?.tokenOffset)) return false;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'lowercaseNounRisk');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return false;
      if (/[-‐]$/u.test(sentence.slice(0,tokens[index].index))) return false;
      // An own noun card right after a determiner, as the head of its group (no
      // capitalised word follows), keeps the noun-after-determiner reading of
      // typed text (die waren im Angebot, den stand der Dinge). Before a capital
      // the word is a modifier (ein paar Knochen, die leeren Schachteln).
      const gapAt = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const prev = index > 0 && /^\s+$/u.test(gapAt(index-1,index)) ? tokens[index-1][0] : null;
      const nextCapital = tokens[index+1] && /^\s+$/u.test(gapAt(index,index+1)) && /^\p{Lu}/u.test(tokens[index+1][0]);
      if (prev && /^\p{Ll}/u.test(prev) && (determinerFeatures(prev) || contractionArticle(prev) ||
        /^(?:der|die|das|dem|den|des|ein|eine|einem|einen|einer|eines|(?:mein|dein|sein|ihr|unser|euer|eur|kein|dies|jen)(?:e|en|em|er|es)?)$/u.test(norm(prev))) && !nextCapital &&
        candidates.some(c => c.source === 'main' && canonicalPos(c.pos) === 'Nomen')) return false;
      const starts = i => { const before = sentence.slice(0,tokens[i].index);
        return i === 0 || /[.!?…:]\s*[«„“"‘»”›‹]*\s*(?:[–—-]\s*)?$/u.test(before) || /^\s*[–—-]\s*$/u.test(before) || /[«„“"‘›‹(]\s*$/u.test(before); };
      // Any capital inside an utterance (a noun or a name) but the polite pronoun.
      const polite = /^(?:Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres|Du|Dich|Dir|Dein|Deine|Euch|Euer|Eure)$/u;
      return tokens.some((t,i) => i !== index && /^\p{Lu}\p{Ll}/u.test(t[0]) && !starts(i) && !polite.test(t[0]));
    }
    // C20 (18.10.2026): two or more own noun cards share the clicked spelling
    // (der / die Kiefer, der Sitz pl. Sitzen / das Sitzen). The noun group
    // decides only when exactly one card agrees: the determiner (with
    // modifiers, case from a preposition before it) or, without one, a plural
    // signal (ein paar, hunderte von, zwei …) or a following finite verb that
    // is plural only (Nevilles Kiefer waren). Otherwise the choice stays.
    async function nounHomonymAgreement(word, context, candidates) {
      if (!Number.isInteger(context?.tokenOffset) || !/^[A-ZÄÖÜ]/u.test(word)) return null;
      const own = candidates.filter(c => c.source === 'main' && canonicalPos(c.pos) === 'Nomen' && c.item?.article);
      if (own.length < 2 || new Set(own.map(c => c.dictionaryId)).size < 2) return null;
      // Nouns declined like adjectives (der / die Verwandte) keep adjectival-noun-agreement.
      if (own.some(c => adjectivalNounStem(c.item))) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'nounHomonymAgreement');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0 || word.length > 1 && word === word.toUpperCase()) return null;
      const boundary = /[,;:.!?()„“”"«»–—]/u;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const joined = (a,b) => a >= 0 && tokens[b] && !boundary.test(gap(a,b));
      const before = sentence.slice(0,tokens[index].index);
      const utteranceStart = index === 0 || /[.!?…:]\s*[«„“"‘»”]*\s*(?:[–—-]\s*)?$/u.test(before) || /[«„“"‘–—-]\s*$/u.test(before);
      // Another word class is a real rival only where a capital is no evidence.
      if (utteranceStart && candidates.some(c => canonicalPos(c.pos) !== 'Nomen')) return null;
      const morph = await tokenMorphology(tokens[index],{discoverModifiers:false},'nounHomonymAgreement');
      if (morph.errors.length) return null;
      const s = norm(word);
      const readingsOf = card => {
        const readings = nounReadings(word,{...morph,candidates:morph.candidates.filter(c => c.item && c.item.id === card.item.id)});
        // A plural that only gains -n here (Kiefer → Kiefern, Sitze → Sitzen) is its dative.
        const plurals = String(card.item.plural || '').split(/\s*,\s*/u).filter(p => p && p !== '—').map(norm);
        if (!plurals.includes(s) && plurals.some(p => p + 'n' === s))
          return readings.map(r => r.number === 'plural' ? {...r,cases:new Set(['dative'])} : r);
        return readings;
      };
      let cards = own.map(card => ({card,readings:readingsOf(card)})).filter(row => row.readings.length);
      if (cards.length < 2) return null;
      // Number of a finite verb right after the noun (Nevilles Kiefer waren, die Kiefer war).
      const next = joined(index,index+1) ? norm(tokens[index+1][0]) : null;
      const verbRows = next ? (verbAnalyses.get(next) || []).filter(a => a.kind === 'finite') : [];
      const verbNumber = !verbRows.length ? null :
        verbRows.every(a => a.person === 'sie' || a.person === 'wir') ? 'plural' :
        verbRows.every(a => a.person === 'er/sie/es' || a.person === 'ich') ? 'singular' : null;
      const one = rows => rows.length === 1 ? rows[0].card : null;
      // Left edge of the group: up to three declined modifiers.
      const quantity = /^(?:paar|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|hundert|tausend|viele|vielen|mehrere|mehreren|einige|einigen|wenige|wenigen|beide|beiden|zahllose|unzählige)$/u;
      let m = index-1;
      const mods = [];
      while (m >= 0 && joined(m,m+1) && index-m <= 3 && /^[a-zäöüß]/u.test(tokens[m][0]) && !determinerFeatures(tokens[m][0]) &&
        !contractionArticle(tokens[m][0]) && !quantity.test(norm(tokens[m][0]))) {
        const endings = await modifierEndings(tokens[m],'nounHomonymAgreement');
        if (!endings) break;
        mods.unshift(endings); m--;
      }
      const opensClause = d => d < 0 || d === 0 || !joined(d-1,d) ||
        (forms.get(norm(tokens[d-1][0])) || []).some(e => e.type === 'Konjunktion' && conjunctionKind(e) === 'coordinating');
      const raw = m >= 0 && joined(m,m+1) ? tokens[m][0] : null;
      const article = raw ? contractionArticle(raw) : null;
      const features = raw && !(norm(raw) === 'ein' && norm(tokens[m+1][0]) === 'paar') ? determinerFeatures(article || raw) : null;
      if (features) {
        let governed = null;
        if (article) governed = null;
        else if (m > 0 && joined(m-1,m) && prepositionCardsByForm.get(norm(tokens[m-1][0]))) governed = governedCases(prepositionCardsByForm.get(norm(tokens[m-1][0])));
        let agreeing = cards.filter(row => agreeingFeatures(features,{readings:row.readings,modifiers:mods},governed).length);
        if (agreeing.length > 1 && verbNumber && opensClause(m) && !governed) {
          const nominative = features.filter(f => f.case === 'nominative' && f.number === verbNumber);
          agreeing = agreeing.filter(row => agreeingFeatures(nominative,{readings:row.readings,modifiers:mods},null).length);
        }
        return one(agreeing) ? {candidate:one(agreeing),evidence:'noun-homonym-determiner-agreement'} : null;
      }
      // No determiner: number only.
      const plural = cards.filter(row => row.readings.some(r => r.number === 'plural'));
      if (plural.length !== 1) return null;
      const prev = raw ? norm(raw) : null;
      const prev2 = m > 0 && joined(m-1,m) ? norm(tokens[m-1][0]) : null;
      const counted = prev && (quantity.test(prev) || /^\d+$/u.test(prev) && prev !== '1') ||
        prev === 'von' && prev2 && /^(?:hunderte|tausende|dutzende|millionen|hunderten|tausenden|dutzenden|massen|mengen)$/u.test(prev2);
      // The noun opens its clause, or only a genitive name stands before it (Nevilles Kiefer).
      const nameBefore = m === index-1 && raw && /^[A-ZÄÖÜ][\p{L}]*s$/u.test(raw) && opensClause(m);
      const pluralVerb = verbNumber === 'plural' && (opensClause(index) || nameBefore);
      // A plural that is only a dative (Sitzen of Sitz) needs the dative von (hunderte von Sitzen).
      const dativeOnly = plural[0].readings.filter(r => r.number === 'plural').every(r => r.cases?.size === 1 && r.cases.has('dative'));
      if (dativeOnly ? counted && prev === 'von' : counted || pluralVerb) return {candidate:plural[0].card,evidence:'noun-homonym-plural'};
      return null;
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
      if (!ADJECTIVE_ENDINGS.includes(ending)) return null;
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
      if (word.length > 1 && word === word.toUpperCase()) return null;
      const sentence = String(context.sentence || ''), tokens = sharedTokens(sentence,'articleNounLink');
      const clicked = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (clicked < 0) return null;
      const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
      const hyphened = (a,b) => !!tokens[a] && !!tokens[b] && /^[-‐‑]$/u.test(gap(a,b));
      // Parts of a hyphenated word (Nord-Süd-Verbindungen) form one head.
      const wordStart = i => { while (i > 0 && hyphened(i-1,i)) i--; return i; };
      const wordEnd = i => { while (hyphened(i,i+1)) i++; return i; };
      // To-do 19.10 (3.10, reference CONTR-01 / F12-G10): a contraction (ins, im, beim, zur …) is a preposition + article;
      // its article (das, dem, der) pairs with the noun like a plain article, in a case the preposition governs.
      const determinerAt = form => articleForm(form) || !!contractionArticle(form);
      let det = clicked;
      if (!determinerAt(word)) {
        if (!/^[A-ZÄÖÜ]/u.test(word)) return null;
        for (let d = wordStart(clicked)-1; d >= 0 && clicked-d <= 6; d--) {
          if (!joinedTokens(sentence,tokens,d,d+1) && !hyphened(d,d+1)) return null;
          if (determinerAt(tokens[d][0])) { det = d; break; }
          if (!/^[a-zäöüß]/u.test(tokens[d][0]) && !(d === wordStart(clicked)-1 && /^[A-ZÄÖÜ]/u.test(tokens[d][0]))) return null;
        }
        if (det === clicked) return null;
      }
      const contracted = contractionArticle(tokens[det][0]) && !articleForm(tokens[det][0]) ? contractionForms[norm(tokens[det][0])] : null;
      const cards = contracted ? [] : articleCardsByForm.get(norm(tokens[det][0])) || [];
      const features = determinerFeatures(contracted ? contracted[1] : tokens[det][0]);
      if (!features) return null;
      // der-forms double as relative pronouns after a comma (…, die Ämter haben; …, mit der er sprach). Lost links
      // 20.10.2026 (after the prepositions transfer 35bde7f): des is never a relative pronoun (…, aufgrund des
      // Rätselcharakters), and a colon opens a new clause, not a relative one (…: Außer dem Hochwasserschutz).
      const commaBefore = i => i > 0 && /[,;(]/u.test(gap(i-1,i));
      const previous = contracted ? prepositionCardsByForm.get(contracted[0]) || null :
        det > 0 && joinedTokens(sentence,tokens,det-1,det) ? prepositionCardsByForm.get(norm(tokens[det-1][0])) : null;
      if (contracted && !previous) return null;
      if (cards.some(card => card.grammar?.article_kind === 'definite') && norm(tokens[det][0]) !== 'des' &&
          (commaBefore(det) || previous && commaBefore(det-1))) return null;
      let group;
      try { group = await nounGroupAfter(sentence,tokens,det,{determiner:false,consumer:'articleNounLink'}); } catch (_) { return null; }
      if (!group?.readings) return null;
      // Reference C6 (user 20.10): after a contraction the noun must be known to a dictionary as a whole word; a compound
      // only split into parts (ins Hochsicherheitsverlies) has a guessed gender and stays unlinked.
      if (contracted && !group.readings.some(r => !r.unknown)) return null;
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
      return {article:tokens[det][0],noun:span(first,last).text,clicked:det === clicked ? 'article' : 'noun',spans:[span(det),span(first,last)],
        ...(contracted ? {contraction:true} : {})};
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
      const boundaries = new Set(["und","oder","aber","denn","sondern","doch","weil","dass","daß","wenn","ob","als","bevor","nachdem"]);
      const connected = (a,b) => !/[,;:.!?“”„"()]/u.test(sentence.slice(tokens[a].index + tokens[a][0].length,tokens[b].index));
      let start = index, end = index;
      while (start > 0 && connected(start-1,start) && !boundaries.has(norm(tokens[start-1][0]))) start--;
      while (end+1 < tokens.length && connected(end,end+1) && !boundaries.has(norm(tokens[end+1][0]))) end++;
      const matches = i => forms.get(norm(tokens[i]?.[0])) || [];
      const unchanged = {candidates,preferred:null,evidence:null};
      const isVerb = c => (posMap[c.pos] || c.pos) === "Verb";
      const verbs = candidates.filter(isVerb), nouns = candidates.filter(c => (posMap[c.pos] || c.pos) === "Nomen");
      const finite = (entry,i,person) => ["Präsens","Präteritum","Konjunktiv II",...konj1At(tokens,i)].some(tense => {
        const group = formsOf(entry)[tense] || {};
        return (person ? formIn(group,person) : Object.values(group)).some(form => {
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
        ADJECTIVE_ENDINGS.some(ending => norm(tokens[i]?.[0]).endsWith(ending) &&
          (lemmas.get(norm(tokens[i][0]).slice(0,-ending.length)) || []).some(e => e.type === "Adjektiv"));
      // Our dictionary stores separate exercise cards for adjectives and
      // adverbs; these rules apply only to dictionary-backed ADJ/ADV alternatives.
      const adjectiveAdverbPair = adjectives.length && adverbs.length &&
        new Set([...adjectives,...adverbs].map(c => norm(c.lemma))).size === 1 &&
        candidates.every(c => ["Adjektiv","Adverb"].includes(canonicalPos(c.pos)) ||
          c.source === "fallback" && canonicalPos(c.pos) === "Nomen");
      const auxiliaryVerbs = clauseIndices.flatMap(i => matches(i).filter(e => e.type === "Verb" && PERFECT_AUXILIARIES.includes(e.word) && finite(e,i)));
      const participles = verbs.filter(c => c.item && auxiliaryVerbs.some(e => e.word === c.item.auxiliary) &&
        norm(String(c.item.perfect_form || "").split(/\s+/).pop()) === norm(word));
      // One finite verb per clause: another word of the clause is certainly
      // finite — an own verb-only spelling in a finite form that is not its
      // infinitive (or agrees with an adjacent personal pronoun) and not a
      // participle. Then a finite reading of the clicked word has no support.
      const subjectPersons = PRONOUN_PERSONS;
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
        if (!f.adjectives.length || !f.verbs.length || !/^[a-zäöüß]/u.test(word) || !DECLINED_ENDING.test(norm(word)) || index >= end) return undefined;
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
        // G9 (21.10.2026, reference F13-N1): the external name of one ordinary noun (der Wolf, bei Namen, in ihrer Not)
        // is no competing noun; the name stays a candidate (second meaning). A word that opens quoted speech
        // (— »Ja, …«, »So will ich …«, »Au, miau!«, »Mm?«) keeps its window: the capital there is no evidence.
        const ordinaryNouns = f.nouns.filter(c => c.pos !== "name");
        if (ordinaryNouns.length === 1 && ordinaryNouns.length < f.nouns.length && ordinaryBeforeName(ordinaryNouns[0],f.word) &&
            !opensQuotedSpeech(f.sentence,f.tokens[f.index].index))
          f = {...f,nouns:ordinaryNouns};
        // C21 (18.10.2026): external nouns of an ordinal (Erster «winner», Erste) do not outrank our
        // ordinal card of this spelling (der Erste, als Erste, zu den Ersten); numeral-reading decides.
        if (f.nouns.every(c => c.source === "fallback") && f.candidates.some(c => c.source === "main" && c.item?.type === "numeral" &&
          c.item.grammar?.numeral_kind === "ordinal" && [c.item.word,...(c.item.search_forms || [])].some(x => norm(x) === norm(f.word)))) return undefined;
        // G4 (16.10.2026): a form of our pronoun card (es) written in capitals
        // (ICH VERBIETE ES) or opening quoted speech after a dash or quote mark
        // (— »Es ist etwas darin«) is no evidence for an external noun (Es
        // «E-flat»); the pronoun summary is shown instead. das Ich stays.
        if (f.nouns.every(c => c.source === "fallback") && (forms.get(norm(f.word)) || []).some(e => e.type === "Pronomen") &&
          (f.word === f.word.toUpperCase() && f.word.length > 1 ||
            /[»«„“"‘–—-]\s*$/u.test(f.sentence.slice(0,f.tokens[f.index].index)))) return undefined;
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
        const copulas = COPULA_SET;
        const auxiliaries = new Set(["sein","haben","werden","können","müssen","dürfen","sollen","wollen","mögen"]);
        const lexicalVerb = f.clauseVerbs.some(e => !auxiliaries.has(norm(e.word)) && !copulas.has(norm(e.word)));
        return !nounAfter && lexicalVerb ? f.choose(f.adverbs,"adverbial-verb-modifier") : undefined;
      },
      // L34 (user decisions 23.10, simplified variant): an own adjective card with participle_default "verb" / "choice"
      // (gesetzt, gefasst, gebildet, gewandt, entschieden, aufgeweckt, ausgelassen, vermessen) is not decided by default:
      // the adjective only with an explicit sign (a degree word: sehr gebildet; coordination with an adjective: klug und
      // gebildet), the verb only with a sign of the verb (participle-verb-sign above: von + person, a goal; before a noun a
      // dependent of the participle: die neu gebildete Regierung). Otherwise the reader's choice, the adjective first.
      // erfahren (adjective_after_sein): the adjective after sein and before a noun, the verb elsewhere (wirst du es erfahren).
      'participle-default'(f) {
        const {tokens,index,sentence,word} = f, w = i => norm(tokens[i]?.[0] ?? "");
        const cards = f.adjectives.filter(c => c.source === "main" && ["verb","choice"].includes(c.item?.participle_default) && c.item?.participle_of);
        if (!cards.length || !/^\p{Ll}/u.test(word) || f.candidates.some(c => c.construction)) return undefined;
        const lemma = norm(cards[0].item.participle_of).replace(/^sich\s+/u,"");
        const verbs = f.verbs.filter(c => norm(c.lemma).replace(/^sich\s+/u,"") === lemma);
        if (!verbs.length) return undefined;
        const gap = (a,b) => sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index);
        const beforeNoun = /^\p{Lu}/u.test(tokens[index+1]?.[0] ?? "") && !/[,;:.!?–—()«»„“"]/u.test(gap(index,index+1));
        if (cards.some(c => c.item.adjective_after_sein)) {
          let l = index, r = index;
          while (l > 0 && !/[,;:.!?–—()«»„“"]/u.test(gap(l-1,l))) l--;
          while (r < tokens.length-1 && !/[,;:.!?–—()«»„“"]/u.test(gap(r,r+1))) r++;
          const seinNear = Array.from({length:r-l+1},(_,d) => l+d).some(i => i !== index && SEIN_ANY_FORM.test(w(i)));
          const plain = verbs.filter(c => norm(c.lemma) === lemma);
          return !seinNear && !beforeNoun && plain.length ? f.choose(plain,"participle-default-verb-form") : undefined;
        }
        const base = norm(cards[0].item.word), form = norm(word);
        const choice = {candidates:[...cards,...f.candidates.filter(c => !cards.includes(c))],preferred:null,evidence:"participle-default-choice"};
        // The comparative / superlative (gebildeter als …, gesetzter) is the adjective's own form: left to the adjective rows.
        if (form !== base && !beforeNoun) return undefined;
        const adjective = () => f.choose(cards,"participle-default");
        const DEGREE = ATTRIBUTE_DEGREE_WORDS;
        if (DEGREE.has(w(index-1)) || form === base && adjectiveSign(sentence,tokens,index,f.start,f.end)) return adjective();
        const adjectiveAt = i => i >= 0 && /^\p{Ll}/u.test(tokens[i]?.[0] ?? "") && ADJECTIVE_ENDINGS_WITH_BARE.some(e => w(i).endsWith(e) &&
          (forms.get(w(i).slice(0,w(i).length-e.length)) || []).some(r => r.type === "Adjektiv" && norm(r.word) === w(i).slice(0,w(i).length-e.length)));
        if (index > 1 && w(index-1) === "und" && adjectiveAt(index-2) || index > 0 && /^\s*,\s*$/u.test(gap(index-1,index)) && adjectiveAt(index-1) ||
            index+2 < tokens.length && w(index+1) === "und" && adjectiveAt(index+2)) return adjective();
        if (beforeNoun) {
          const DET = DETERMINER_WORD;
          let det = -1;
          for (let j = index-1; j >= 0 && j >= index-6; j--) { if (/[,;:.!?]/u.test(gap(j,j+1))) break; if (DET.test(w(j))) { det = j; break; } }
          const between = det >= 0 ? Array.from({length:index-det-1},(_,d) => det+1+d) : [];
          const reading = attributiveParticipleReading(tokens,between);
          if (reading === "adjective") return adjective();
          if (reading === "verb") {
            const plainVerbs = verbs.filter(c => !/^sich\s/u.test(norm(c.lemma))), chosen = (plainVerbs.length ? plainVerbs : verbs)[0];
            return f.choose([chosen.usage ? chosen : {...chosen,usage:{kind:"participle-II",role:"attributive",form:word,base:chosen.lemma,head:tokens[index+1][0]}}],"participle-default");
          }
        }
        return choice;
      },
      // L34 (links to-do; reference G2 add. 21.10 (3), F12-G2g; user 21.10 / 23.10): sein + a participle whose adjective card
      // means something else (participle_of + meaning_differs: geschickt «ловкий» / schicken) is the verb only with a sign of
      // the verb in its own part of the sentence — an agent von + person (waren von den drei Königen geschickt; not for
      // von_agent_ok: von allen geachtet) or a goal (nach Hause / heim / zu ihm geschickt). Both signs of the verb and of the
      // adjective (sehr, so …) — the reader's choice. Without a sign nothing changes here (the adjective rows decide).
      // Words that only the external dictionary knows (verwöhnt — verwöhnen) take the agent sign as well.
      'participle-verb-sign'(f) {
        if (!f.adjectives.length || !f.verbs.length || !/^\p{Ll}/u.test(f.word)) return undefined;
        const {tokens,index,sentence} = f, w = i => norm(tokens[i]?.[0] ?? "");
        const verbOf = (adj,c) => norm(c.lemma) === norm(adj.item?.participle_of || "") ||
          norm(c.lemma).replace(/^sich\s+/u,"") === norm(adj.item?.participle_of || "").replace(/^sich\s+/u,"");
        const own = f.adjectives.filter(c => c.source === "main" && c.item?.meaning_differs && c.item?.participle_of);
        const external = !f.adjectives.some(c => c.source === "main") && f.candidates.every(c => c.source !== "main" &&
          ["Adjektiv","Verb"].includes(canonicalPos(c.pos)));
        if (!own.length && !external) return undefined;
        const verbs = own.length ? f.verbs.filter(c => own.some(a => verbOf(a,c))) : f.verbs;
        if (!verbs.length || new Set(verbs.map(c => norm(c.lemma).replace(/^sich\s+/u,""))).size !== 1) return undefined;
        // Before a noun (user 23.10): von + a person between the determiner and the participle (die vom Verband
        // ausgezeichnete Schule, die von uns geschickte Ware) — the verb, shown as «Partizip II · От …».
        if (own.length && own.every(a => !a.item.von_agent_ok) && /^\p{Lu}/u.test(tokens[index+1]?.[0] ?? "") &&
            !/[,;:.!?]/u.test(sentence.slice(tokens[index].index+tokens[index][0].length,tokens[index+1].index))) {
          let k = -1;
          for (let j = index-1; j >= 0 && j >= index-5; j--) { if (/[,;:.!?]/u.test(sentence.slice(tokens[j].index+tokens[j][0].length,tokens[j+1].index))) break; if (VON_AGENT_PREPOSITIONS.includes(w(j))) { k = j; break; } }
          const agent = k >= 0 && (w(k) === "vom" || VON_AGENT_WORD.test(w(k+1)) || /^\p{Lu}/u.test(tokens[k+1]?.[0] ?? ""));
          if (!agent) return undefined;
          const plain = verbs.filter(c => !/^sich\s/u.test(norm(c.lemma))), chosen = (plain.length ? plain : verbs)[0];
          return f.choose([chosen.usage ? chosen : {...chosen,usage:{kind:"participle-II",role:"attributive",form:f.word,base:chosen.lemma,head:tokens[index+1][0]}}],"participle-verb-sign");
        }
        // The participle's own part of the sentence (up to a comma / dash; «aber» does not end it: waren aber von … geschickt),
        // with a form of sein in it.
        const boundary = (a,b) => /[,;:.!?–—()«»„“"]/u.test(sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
        let left = index, right = index;
        while (left > 0 && !boundary(left-1,left)) left--;
        while (right < tokens.length-1 && !boundary(right,right+1)) right++;
        // Reviewers 23.10: a finite sein (not the possessive sein) before the sign — the sign then stands in the middle of the
        // clause (sie waren aber von den drei Königen geschickt), not in the subject (Die Rede vom Präsidenten war ausgezeichnet,
        // Auf dem Weg nach Hause war sie zerstreut); no passive auxiliary (ist … entschieden worden).
        const SEIN = SEIN_FINITE_WORD;
        const seinAt = Array.from({length:index-left},(_,d) => left+d).find(k => SEIN.test(w(k)));
        if (seinAt === undefined) return undefined;
        if (Array.from({length:right-left+1},(_,d) => left+d).some(k => /^(?:worden|werden|wird|wurde|wurden|ward|würde|würden)$/u.test(w(k)))) return undefined;
        const DET = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|mein|meine|meinem|meinen|meiner|dein|deine|deinem|deinen|deiner|sein|seine|seinem|seinen|seiner|ihr|ihre|ihrem|ihren|ihrer|unser|unsere|unserem|unseren|unserer|euer|eure|eurem|euren|eurer|dies|diese|diesem|diesen|dieser|jen|jene|jenem|jenen|jener|beiden)$/u;
        const PERSON = /^(?:mir|dir|ihm|ihr|uns|euch|ihnen|allen|jedem|jemandem|niemandem)$/u;
        const ownNoun = i => f.matches(i).some(e => e.type === "Nomen");
        // A person or a determiner + noun after the preposition (not von Natur aus, von Haus aus, von Kind an).
        const nounPhrase = (k,pronounOk) => {
          if (k > right || k >= index) return false;
          if (PERSON.test(w(k))) return pronounOk && k === index-1;
          let m = k;
          if (DET.test(w(m)) || m === k && w(k-1) === "vom") { if (DET.test(w(m))) m++; }
          else if (/^\p{Lu}/u.test(tokens[m]?.[0] ?? "") && !ownNoun(m)) { return m === index-1; }
          else return false;
          // The noun closes the phrase right before the participle (von den drei Königen geschickt), not a noun of the subject
          // or a time (vom Samstag … war).
          for (let j = m; j < index && j <= m+3; j++) if (/^\p{Lu}/u.test(tokens[j][0])) return j === index-1 && !/^(?:aus|an|auf|her)$/u.test(w(j+1));
          return false;
        };
        const agent = own.every(a => !a.item.von_agent_ok) && Array.from({length:index-seinAt-1},(_,d) => seinAt+1+d)
          .some(k => VON_AGENT_PREPOSITIONS.includes(w(k)) && (w(k) === "vom" ? /^\p{Lu}/u.test(tokens[k+1]?.[0] ?? "") && nounPhrase(k+1,false) : nounPhrase(k+1,true)));
        // A goal: nach Hause, heim, zu + a personal pronoun (zu ihm geschickt) — not zu + determiner (zu diesem Zeitpunkt).
        const goal = own.length > 0 && Array.from({length:index-seinAt-1},(_,d) => seinAt+1+d).some(k =>
          (/^(?:an|zu)$/u.test(w(k)) && k+2 === index && (/^(?:mich|dich|ihn|sie|uns|euch|mir|dir|ihm|ihr|ihnen)$/u.test(w(k+1)) || /^\p{Lu}/u.test(tokens[k+1][0]) && !ownNoun(k+1)) ||
           w(k) === "heim" && k+1 === index || w(k) === "nach" && w(k+1) === "hause" && k+2 === index || w(k) === "zu" && /^(?:mir|dir|ihm|ihr|uns|euch|ihnen)$/u.test(w(k+1)) ||
           // a direction (accusative) right before the participle: ins Bett / aufs Meer / an die Küste geschickt, verschlagen.
           // not a capitalised adjective (aufs Beste, aufs Äußerste)
           /^(?:ins|ans|aufs)$/u.test(w(k)) && k+2 === index && /^\p{Lu}/u.test(tokens[k+1][0]) && !/(?:ste|e)$/u.test(w(k+1)) ||
           // nach + a place name (not an own noun: nach dem Krieg, nach Argentinien verschlagen).
           w(k) === "nach" && k+2 === index && /^\p{Lu}/u.test(tokens[k+1][0]) && !ownNoun(k+1) ||
           /^(?:in|an|auf)$/u.test(w(k)) && /^(?:die|das)$/u.test(w(k+1)) && k+3 === index && /^\p{Lu}/u.test(tokens[k+2][0])));
        if (!agent && !goal) return undefined;
        if (adjectiveSign(sentence,tokens,index,f.start,f.end)) return undefined;
        return f.choose(verbs,"participle-verb-sign");
      },
      // G2 addition (2): sein + a participle with its own adjective card and an explicit sign -> the adjective.
      'participle-adjective-sign'(f) {
        if (!f.adjectives.length || !f.verbs.length || !f.clauseVerbs.some(e => e.word === "sein")) return undefined;
        return adjectiveSign(f.sentence,f.tokens,f.index,f.start,f.end) ? f.choose(f.adjectives,"participle-adjective-sign") : undefined;
      },
      'predicative-adjective'(f) {
        if (!f.adjectiveAdverbPair) return undefined;
        const nounAfter = f.index < f.end && f.matches(f.index+1).some(e => e.type === "Nomen");
        const copulas = COPULA_SET;
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
        // G9 (21.10.2026): an external name (Frank, Ehrlich) is no noun reading of the adjective; name-homograph decides.
        return f.adjectives.length && f.nouns.some(c => c.pos !== "name") && f.candidates.every(c => ["Adjektiv","Nomen"].includes(canonicalPos(c.pos))) &&
          !/^[a-zäöüß]/u.test(f.word) && f.index === 0
          ? {...f.unchanged,blocked:true,evidence:"sentence-initial-adjective-noun-ambiguity"} : undefined;
      },
      // A dictionary noun after a determiner is useful evidence even when the
      // reader's text omits capitals (mein buch, ein gutes essen).
      'noun-after-determiner'(f) {
        const {tokens,index,start,word} = f;
        const determiners = new Set(["der","die","das","dem","den","des","ein","eine","einem","einen","einer","eines","mein","dein","sein","ihr","unser","euer","kein","keine","dieses","dieser","diese"]);
        let determinerIndex = index-1;
        // N1 (17.10.2026): a capital inside the clause is a noun (even one only in
        // fallback), not an adjective of this word (in sein Reich gehen).
        while (determinerIndex >= start && index-determinerIndex <= 3 && f.adjective(determinerIndex) &&
          !(determinerIndex > start && /^[A-ZÄÖÜ]/u.test(tokens[determinerIndex][0]))) determinerIndex--;
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
        const pluralDeterminer = PLURAL_DEFINITE_ARTICLES.includes(determiner) ||
          inflectedDeterminer && !["unser","euer"].includes(determiner) && PLURAL_DETERMINER_ENDING.test(determiner);
        const compatible = f.nouns.filter(c => {
          // B9: an external noun whose form here is only a plural (essen of Esse)
          // does not agree with a singular-only determiner (ein gutes essen).
          if (!c.item?.article) {
            const rows = f.inflections.filter(row => norm(row.form) === norm(word) && norm(row.lemma) === norm(c.lemma) &&
              (posMap[row.pos] || row.pos) === "Nomen");
            return pluralDeterminer || !rows.length || rows.some(row => row.number !== "plural");
          }
          const plural = String(c.item.plural || "").split(/\s*,\s*/).some(p => norm(p) === norm(word) || norm(p)+"n" === norm(word));
          if (plural && (PLURAL_DEFINITE_ARTICLES.includes(determiner) || PLURAL_DETERMINER_ENDING.test(determiner) && inflectedDeterminer)) return true;
          // C19 (18.10.2026): a masculine weak noun in -e takes -n outside the nominative (dem / des / den Jungen).
          if (c.item.article === "der" && /e$/u.test(norm(c.item.word)) && norm(c.item.word) + "n" === norm(word) &&
            (["den","dem","des","einen","einem","eines"].includes(determiner) || inflectedDeterminer && /(?:en|em|es)$/u.test(determiner))) return true;
          if (norm(c.item.word) !== norm(word)) return false;
          const articles = {der:["der","den","dem","des","ein","einen","einem","eines"],die:["die","der","eine","einer"],das:["das","dem","des","ein","einem","eines"]};
          return inflectedDeterminer || (articles[c.item.article] || []).includes(determiner);
        });
        // C19: for a capitalised word, external records with a lowercase noun lemma (jung, junges for Jungen)
        // are form notes, not rival nouns of an agreeing own card.
        // Only after a singular-only determiner (dem, des, einem): die / den Jungen may be the young ones (das Junge).
        // A nominalized adjective may fit the same determiner (ein Alter — an old man, beside das Alter): then the
        // reader chooses, unless the own noun is that very nominalization (der Junge from jung).
        const features = determinerFeatures(determiner) || [];
        const personReading = f.adjectives.some(a => {
          const lemma = norm(a.lemma), ending = norm(word).startsWith(lemma) ? norm(word).slice(lemma.length) : null;
          if (!ADJECTIVE_ENDINGS.includes(ending)) return false;
          if (compatible.some(c => c.source === "main" && norm(c.item?.word) === lemma + "e")) return false;
          return features.some(x => (x.number === "plural" || x.gender !== "neuter") && expectedEnding(x.declension,x) === ending);
        });
        const ownAgrees = /^[A-ZÄÖÜ]/u.test(word) && !pluralDeterminer && !personReading && compatible.some(c => c.source === "main");
        const rivals = ownAgrees ? compatible.filter(c => !(c.source === "fallback" && /^\p{Ll}/u.test(c.lemma))) : compatible;
        return rivals.length ? f.choose(rivals,"noun-after-determiner") : undefined;
      },
      // L7 (links chat, 23.10.2026): the spelling of a zu-infinitive tells the two cards of one verb apart — a separate zu
      // (die Blockade zu durchbrechen) is the inseparable verb, zu inside the word (den Stock durchzubrechen) the separable one.
      // Only between own cards of the same infinitive, one with and one without separable_prefix.
      'zu-infinitive-separability'(f) {
        const own = f.verbs.filter(c => c.source === "main");
        const separable = own.filter(c => c.item?.separable_prefix), plain = own.filter(c => !c.item?.separable_prefix);
        if (!separable.length || !plain.length) return undefined;
        const prefix = norm(separable[0].item.separable_prefix), base = norm(separable[0].lemma).replace(/^sich\s+/u,"");
        if (!plain.every(c => norm(c.lemma).replace(/^sich\s+/u,"") === base) || !separable.every(c => norm(c.lemma).replace(/^sich\s+/u,"") === base)) return undefined;
        const w = norm(f.word);
        if (w === prefix + "zu" + base.slice(prefix.length)) return f.choose(separable,"zu-infinitive-separability");
        if (w === base && f.index > 0 && norm(f.tokens[f.index-1][0]) === "zu" && /^\s+$/u.test(f.sentence.slice(f.tokens[f.index-1].index + f.tokens[f.index-1][0].length, f.tokens[f.index].index)))
          return f.choose(plain,"zu-infinitive-separability");
        return undefined;
      },
      'infinitive-in-modal-group'(f) {
        // L45 (23.10): werden heads an infinitive only as wird (Futur) or würde (Konjunktiv II); wurde / ward + infinitive is
        // no group (immer ward es von dichten Dornhecken zurückgehalten — dichten is the adjective, not «сочинять»).
        const pastWerden = (e,i) => e.word === "werden" && !["Präsens","Konjunktiv II"].some(t =>
          Object.values(formsOf(e)[t] || {}).some(form => [norm(form),oldSpelling(norm(form))].includes(norm(f.tokens[i][0]))));
        const modal = f.clauseIndices.some(i => i < f.index && f.matches(i).some(e => e.type === "Verb" &&
          ["können","müssen","dürfen","sollen","wollen","mögen","möchten","werden","lassen"].includes(e.word) && f.finite(e,i) && !pastWerden(e,i)));
        if (!modal || !/^[a-zäöü]/u.test(f.word)) return undefined;
        // L45 (23.10): right after a preposition and right before a capital word the form is an attribute of that noun
        // (wird von dichten Dornhecken zurückgehalten), never the infinitive of the group.
        const k = f.index;
        if (k-1 >= f.start && k+1 <= f.end && f.matches(k-1).some(e => e.type === "preposition") && /^\p{Lu}/u.test(f.tokens[k+1][0])) return undefined;
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
        // L36 (22.10.2026): a reflexive pronoun of the subject (weil du dich so wohl gehalten hast) is no object; a card whose
        // preposition takes the object along (habe ich ihn für einen Spitzbuben gehalten «считать») is the one — as for finite forms.
        const clause = f.clauseIndices.map(i => norm(f.tokens[i][0]));
        const REFLEXIVE_OF = REFLEXIVE_SUBJECT;
        if (clause.some(w => REFLEXIVE_OF[w] && clause.includes(REFLEXIVE_OF[w]))) return undefined;
        const PERSONAL = PERSONAL_OBJECT_PRONOUN;
        const accPrep = c => (c.item.complements || []).map(x => String(x.pattern || "")).filter(p => /[a-zäöü]\s*\+\s*Akkusativ/u.test(p))
          .flatMap(p => p.split("+")[0].split(/[\/…]/u)).map(x => norm(x.trim())).filter(Boolean);
        // für + a predicate only (für klug, für einen Spitzbuben — not für meinen Bruder); da(r)- / wo(r)- + the card's preposition
        // with a pronoun object (Ich habe nichts davon gehalten).
        const allPreps = c => (c.item.complements || []).map(x => String(x.pattern || "")).filter(p => /[a-zäöü]\s*\+/u.test(p))
          .flatMap(p => p.split("+")[0].split(/[\/…]/u)).map(x => norm(x.trim())).filter(Boolean);
        const predicate = i => { const w1 = norm(f.tokens[i+1]?.[0] ?? ""), t1 = f.tokens[i+1]?.[0] ?? "";
          if (PERSONAL.test(w1) || /^(?:der|die|das|den|dem|des|einem|einer|eines)$/u.test(w1) || DETERMINER_STEM.test(w1)) return false;
          if (INDEFINITE_NOM_ACC.test(w1)) return /^\p{Lu}/u.test(f.tokens[i+2]?.[0] ?? "") && !/^(?:moment|augenblick|weile|stunde|tag|woche|jahr|zeit|minute)$/u.test(norm(f.tokens[i+2][0]));
          return /^\p{Ll}/u.test(t1) && !/^(?:zwei|drei|vier|fünf|paar|immer|kurze?)$/u.test(w1); };
        const daPrep = w => (w.match(PRONOMINAL_ADVERB) || [])[1];
        const withPrep = f.participles.filter(c => !(c.item.complements || []).some(comp => comp.pattern === "Akkusativ") &&
          (f.clauseIndices.some(i => accPrep(c).includes(norm(f.tokens[i][0])) && predicate(i)) ||
           f.clauseIndices.some(i => allPreps(c).includes(daPrep(norm(f.tokens[i][0])))) && clause.some(w => /^(?:was|nichts|etwas|viel|wenig|alles|es|das|mich|dich|ihn|sie)$/u.test(w))));
        if (withPrep.length === 1) return f.choose(withPrep,"participle-with-accusative-object");
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
      // B (17.10.2026, user decision): a participle spelling with its own adjective
      // card is the adjective unless the clause proves the verb (Du bist verrückt,
      // erschöpft zur Erde fiel, die Tür war geschlossen). Proof: a construction
      // (selected before this row), the verb's own Perfekt auxiliary (row above),
      // any werden but geworden (passive), haben as infinitive, an accusative object
      // or a possible finite reading in a clause without another finite verb.
      'participle-adjective'(f) {
        const {tokens,index,word} = f;
        const participleOf = c => c.item && norm(String(c.item.perfect_form || "").split(/\s+/u).pop()) === norm(word);
        const adjectives = f.adjectives.filter(c => c.source === "main" && norm(c.lemma) === norm(word));
        const verbs = f.candidates.filter(c => canonicalPos(c.pos) === "Verb");
        // L27 (links to-do, 20.10.2026): an external noun reading of a lowercase word inside the sentence (gelassen —
        // «Gelass») does not block the rule; a capital there would be a noun.
        const lowercaseInside = /^\p{Ll}/u.test(word) && index > 0;
        if (!adjectives.length || !verbs.length || !verbs.every(participleOf) ||
            f.candidates.some(c => !["Adjektiv","Adverb","Verb"].includes(canonicalPos(c.pos)) &&
              !(lowercaseInside && c.source !== "main" && canonicalPos(c.pos) === "Nomen"))) return undefined;
        // Any haben form up to the next comma may close a Perfekt (Hätte er den Brief
        // … geöffnet; die Haustür geöffnet und … gefunden hatten).
        let left = index, right = index;
        const boundary = (a,b) => /[,;:–—()«»„“"]/u.test(f.sentence.slice(tokens[a].index+tokens[a][0].length,tokens[b].index));
        while (left > 0 && !boundary(left-1,left)) left--;
        while (right < tokens.length-1 && !boundary(right,right+1)) right++;
        // L27: only the participle's own part of the sentence counts (Zeig dich – ich bin bewaffnet; du würdest –
        // Dumbledore war so besorgt): words beyond a comma or dash belong to another verb.
        const others = f.clauseIndices.filter(i => i !== index && i >= left && i <= right);
        const isWord = (i,re) => re.test(norm(tokens[i][0]));
        if (others.some(i => isWord(i,/^(?:werde|wirst|wird|werden|werdet|wurde|wurdest|wurden|wurdet|ward|wardst|würde|würdest|würden|würdet|worden)$/u)) &&
            !others.some(i => isWord(i,/^geworden$/u))) return undefined;
        const haben = HABEN_FINITE_WORD;
        // L27: sein right at the participle is its own auxiliary (so gut ausgelernt hatten und so geschickt waren) — a haben
        // form of the other verb in the segment does not prove a Perfekt of this one.
        const seinAt = i => i >= 0 && i < tokens.length && SEIN_FINITE_OR_GEWESEN.test(norm(tokens[i][0]));
        if (verbs.some(c => c.item?.auxiliary !== "sein") && !seinAt(index+1) &&
            tokens.slice(left,right+1).some((t,k) => left+k !== index && haben.test(norm(t[0])))) return undefined;
        // The other finite verb must stand inside the same comma segment
        // (…, das Arbeitgeber zur Lohnfortzahlung verpflichtet.).
        // A word right before a capital is attributive (bei berechtigten Zweifeln).
        const finiteElsewhere = others.some(i => i >= left && i <= right && (i === left || /^[a-zäöüß]/u.test(tokens[i][0])) &&
          !(i < right && i > left && /^[A-ZÄÖÜ]/u.test(tokens[i+1][0]) &&
            /^(?:an|auf|aus|bei|durch|für|gegen|in|im|mit|nach|ohne|seit|über|um|unter|von|vom|vor|zu|zum|zur|der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein|keine|keinen|keinem|keiner|mein|meine|meinen|meinem|sein|seine|seinen|seinem|ihr|ihre|ihren|ihrem)$/u.test(norm(tokens[i-1][0]))) &&
          f.matches(i).some(e => e.type === "Verb" && f.finite(e,i)));
        if (!finiteElsewhere && verbs.some(c => f.candidateFinite(c))) return undefined;
        // L27: the external noun reading is set aside only next to another finite verb of the segment (sagte er gelassen,
        // waren … gelassen); without one the participle may close an elliptic Perfekt (daß es ihm keine Ruhe gelassen).
        if (!finiteElsewhere && f.candidates.some(c => canonicalPos(c.pos) === "Nomen")) return undefined;
        if (participleObject({...f,clauseIndices:f.clauseIndices.filter(i => i >= left && i <= right),participles:verbs}).accusative) return undefined;
        // L34 (runs 23.10): an adjective card whose participle is by default the verb or the reader's choice (gesetzt,
        // gefasst, aufgeweckt …) is not chosen here without a sign (ward ins Gefängnis gesetzt, von den Henkersknechten gefaßt
        // und … geführt wurden).
        if (adjectives.some(c => ["verb","choice"].includes(c.item?.participle_default) && !c.item?.adjective_after_sein)) return undefined;
        return f.choose(adjectives,"participle-adjective");
      },
      // B (17.10.2026): a participle without a reflexive pronoun in its clause
      // belongs to the plain verb, not to its sich-twin (in Gold gekleidet).
      'participle-plain-verb'(f) {
        const {word} = f;
        const verbs = f.candidates.filter(c => canonicalPos(c.pos) === "Verb");
        // The sich-twin may already be set aside here as unconfirmed (no sich).
        if (!verbs.length || verbs.length !== f.candidates.length) return undefined;
        const base = c => norm(c.lemma).replace(/^sich\s+/u,"");
        if (new Set(verbs.map(base)).size !== 1 ||
            !verbs.every(c => c.item && norm(String(c.item.perfect_form || "").split(/\s+/u).pop()) === norm(word))) return undefined;
        if (f.clauseIndices.some(i => /^(?:sich|mich|dich|uns|euch)$/u.test(norm(f.tokens[i][0])))) return undefined;
        const plain = verbs.filter(c => c.source === "main" && !/^sich\s/u.test(norm(c.lemma)));
        return plain.length ? f.choose(plain,"participle-plain-verb") : undefined;
      },
      'finite-verb-with-subject'(f) {
        const subjectPersons = PRONOUN_PERSONS;
        const finiteCandidates = f.verbReadings.filter(c => [f.index-1,f.index+1].some(i => i >= f.start && i <= f.end &&
          (subjectPersons[norm(f.tokens[i][0])] || []).some(person => f.candidateFinite(c,person))));
        return finiteCandidates.length ? f.choose(finiteCandidates,"finite-verb-with-subject") : undefined;
      },
      // A local article + dictionary noun can establish third-person agreement.
      // Keep distant/competing subjects and any auxiliary bracket unresolved here.
      'finite-verb-with-noun-subject'(f) {
        const {tokens,index,start,end} = f;
        const subjectPersons = PRONOUN_PERSONS;
        const nounSubjects = [];
        for (let i=start+1;i<=end;i++) {
          const article=norm(tokens[i-1][0]), surface=norm(tokens[i][0]);
          if (!SUBJECT_ARTICLES.includes(article) || !/^[A-ZÄÖÜ]/u.test(tokens[i][0])) continue;
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
          !DER_PRONOUNS.includes(norm(tokens[i][0])));
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
          if(!SUBJECT_ARTICLES.includes(article)||!/^[A-ZÄÖÜ]/u.test(tokens[1][0]))return null;
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
      // 20.10.2026 (transfer check, p. 3): other spelling variants the own card lists in search_forms — ph / f
      // (phantastisch → fantastisch), ä / e (behende → behände), one word / two (jedesmal → jedes Mal) — and an external
      // record that only names our card («alternative form / obsolete spelling of hier» for hie).
      'old-spelling'(candidates) {
        const variant = v => norm(v).replace(/ß/gu,"ss").replace(/ph/gu,"f").replace(/ä/gu,"e").replace(/\s+/gu,"");
        const refersTo = (c,lemma) => [...(c.meanings || []),c.translation?.en || ""].some(t =>
          new RegExp(`\\b(?:alternative|obsolete|archaic|dated|old|former)\\s+(?:form|spelling)s?\\s+of\\s+${norm(lemma).replace(/[.*+?^${}()|[\]\\]/gu,"\\$&")}(?=\\s*(?:$|[(“"”«»,;.)]))`,"iu").test(norm(t)));
        return candidates.filter(c => c.source !== "fallback" || !candidates.some(m => m.source === "main" &&
          canonicalPos(m.pos) === canonicalPos(c.pos) && norm(m.lemma) !== norm(c.lemma) &&
          (refersTo(c,m.lemma) || variant(c.lemma) === variant(m.lemma) && (m.item?.search_forms || []).some(f => norm(f) === norm(c.lemma)))));
      },
      // B10 (15.10.2026): pronouns are a closed class and ours are complete. When
      // the clicked word is a form of an own pronoun card (mich: ich / sich), the
      // external pronoun records of the same spelling (mich «reflexive pronoun of
      // ich», mir «alternative form of wir») are not offered. Other parts of
      // speech stay (sein: verb); an uncovered pronoun (jemand) keeps its card.
      'own-pronoun-form'(candidates,separated,state) {
        if (!(forms.get(norm(state.word ?? "")) || []).some(e => e.type === "Pronomen")) return candidates;
        if (!candidates.some(c => c.source === "main" && canonicalPos(c.pos) === "Pronomen")) return candidates;
        // G4 (16.10.2026): an external article record that only refers to
        // another word (es «alternative form of das») is not offered either; it
        // turned every click on es into a choice window.
        return candidates.filter(c => c.source !== "fallback" || c.construction ||
          canonicalPos(c.pos) !== "Pronomen" && !(c.pos === "article" && referenceTarget(c,state.word)));
      },
      // Own coverage applies to a lexical lemma/POS, never an entire POS.
      // A card listing several parts of speech (wie: Adverb / Konjunktion)
      // covers the lemma under each of them.
      'own-lexeme'(candidates,separated,state) {
        const lexicalKey = c => `${norm(c.lemma)}:${canonicalPos(c.pos)}`;
        const coveredLexemes = new Set(candidates.filter(c => c.source === "main" && !reflexiveEntries.has(c.item))
          .flatMap(c => [lexicalKey(c),...(c.item?.parts_of_speech || []).map(pos => `${norm(c.lemma)}:${canonicalPos(pos)}`),
            // 19.10.2026: an own card that is a postposition in all its standard uses (zuliebe, zufolge) covers the
            // external postposition (nach, gegenüber keep it: they also stand before the noun); a conjunction card
            // covers its other spellings (geschweige denn: geschweige).
            ...(canonicalPos(c.pos) === "prep" && (c.item?.government || []).some(g => g.status === "standard") &&
              (c.item.government).filter(g => g.status === "standard").every(g => g.position === "after") ? [`${norm(c.lemma)}:postp`] : []),
            ...(canonicalPos(c.pos) === "Konjunktion" ? (c.item?.search_forms || []).map(f => `${norm(f)}:Konjunktion`) : [])]));
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
      // C21: a cardinal / ordinal without an own numeral card of this spelling.
      if (!exact.some(e => e.type === "numeral")) {
        const generated = numeralEntry(word);
        if (generated && (!generated.id.includes(":ordinal:") || ordinalFrame(word,context))) exact.push(generated);
      }
      // The age entry is a bound suffix, never the archaic standalone jährig.
      // Accept numeric and common spelled-out number compounds, including endings.
      const ageEntry = entries.find(e => e.word === "-jährig");
      const unit = "(?:ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)";
      const tens = "(?:zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)";
      const number = `(?:${unit}(?:hundert|tausend))?(?:${unit}und${tens}|${unit}|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|${tens})`;
      if (ageEntry && new RegExp(`^(?:[1-9][0-9]*-|${number})jährig(?:e|en|em|er|es)?$`,"u").test(norm(word)) && !exact.some(e=>e.id===ageEntry.id)) exact.push(ageEntry);
      const derived = (modifiers.get(norm(word)) || []).map(row => row.entry);
      const dictionaryForms = new Set(exact.map(e => e.id));
      // C14 step 2 (17.10.2026): a capital inside the sentence may be a noun the own verb does not cover
      // (wie die Verrückten — verrückten of verrücken; alles Nötige): the external dictionary is asked.
      const internalCapital = /^\p{Lu}/u.test(String(word)) && String(word) !== String(word).toUpperCase() &&
        !!context && !clauseInitial(context.sentence, context.tokenOffset);
      const ownOnlyVerb = !internalCapital && (ownOnlyVerbs.has(norm(word)) || exact.some(item => item.type === "Verb" && ownOnlyVerbs.has(norm(item.word))));
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
            // C14 (17.10.2026): an external gerund group (weinen «gerund» for the verb form Weine) maps to our verbal
            // noun card (das Weinen) only when the clicked word is that noun (Weinen, Weinens), not a verb form.
            const verbalNoun = item => item.type === "Nomen" && /^(?:Verb|Infinitiv)/u.test(item.derived_from?.type || "");
            // To-do 19.10 (2.4, R-grimm-25): of two own pronoun cards with one headword (es «оно», es impersonal),
            // only those listing the clicked form are its cards — ihm is dative of es «оно», never of impersonal es.
            const listsForm = item => (item.search_forms || []).some(f => norm(f) === norm(word));
            const siblings = lemmas.get(norm(group.word)) || [];
            const main = siblings.filter(item => partOfSpeech && item.type === partOfSpeech &&
              !(verbalNoun(item) && !norm(word).startsWith(norm(item.word))) &&
              !(item.type === "Pronomen" && !listsForm(item) && siblings.some(other => other !== item && other.type === "Pronomen" && listsForm(other))));
            for (const item of main) dictionaryForms.add(item.id);
            candidates.push(...main.map(mainCandidate));
            if (group.meanings.length) candidates.push({source:"fallback",lemma:group.word,pos:group.pos || "",posLabel:partOfSpeech,
              translation:{en:group.meanings.join("; "),ru:""},meanings:group.meanings,...(group.labels ? {meaningLabels:{en:group.labels}} : {}),
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
      // C14: a separable reflexive (macht sich bereit) needs its particle in the sentence.
      const particleIn = particle => !!context?.sentence && new RegExp(`(?<![\\p{L}])${particle}(?![\\p{L}])`,'iu').test(context.sentence);
      const lexicalEntries = new Set((reflexiveForms.get(norm(word)) || []).filter(row=>!row.oldSpelling && (!row.particle || particleIn(row.particle))).map(row=>row.entry));
      for (const c of candidates) if (canonicalPos(c.pos) === "Verb")
        for (const entry of reflexiveLemmas.get(norm(c.lemma)) || []) lexicalEntries.add(entry);
      for (const analysis of inflections)
        for (const entry of reflexiveLemmas.get(norm(analysis.lemma)) || []) lexicalEntries.add(entry);
      const conditional = [...lexicalEntries]
        .filter(entry => ![...reflexive,...attributed].some(c=>c.dictionaryId === entry.id))
        .map(entry=>({...mainCandidate(entry),reflexiveUnconfirmed:true}));
      candidates.push(...reflexive,...attributed,...conditional);
      // S2 (17.10.2026): a capitalised word inside the sentence is a noun (ein Anrempeln,
      // dem Abebben), not the bare infinitive of a derived separable verb.
      if (/^\p{Lu}/u.test(String(word)) && context && !clauseInitial(context.sentence, context.tokenOffset))
        candidates = candidates.filter(c => !(c.item?.derivedSeparable && !c.construction));
      // C14 step 3: when the proven bracket belongs to two own cards of one separable verb (angehen ×2),
      // the plain base verb (gehen) is not offered next to them.
      {
        // An own inseparable homograph (unterstellen «приписывать», no separable_prefix) cannot stand in a
        // bracket when its separable twin (unterstellen «подставлять») does.
        const inseparable = c => c.source === "main" && c.construction?.id === "separable-verb" && !c.item?.separable_prefix &&
          separated.some(d => d !== c && d.source === "main" && d.item?.separable_prefix && norm(d.lemma) === norm(c.lemma));
        if (separated.some(inseparable)) {
          const drop = new Set(separated.filter(inseparable));
          separated = separated.filter(c => !drop.has(c)); candidates = candidates.filter(c => !drop.has(c));
        }
        const proven = separated.filter(c => c.construction?.confidence !== "tentative" && c.source === "main");
        const verbs = new Set(proven.map(c => norm(c.lemma).replace(/^sich\s+/u,"")));
        if (proven.length > 1 && verbs.size === 1) {
          const [compound] = verbs;
          candidates = candidates.filter(c => c.construction || canonicalPos(c.pos) !== "Verb" ||
            !(compound.endsWith(norm(c.lemma).replace(/^sich\s+/u,"")) && compound !== norm(c.lemma).replace(/^sich\s+/u,"")));
        }
      }
      // Own-dictionary coverage (step 8): named rows; removed candidates are
      // reported in decision.rejected with the covering row.
      const coverage = ownCoverage(candidates,separated,word);
      candidates = coverage.candidates;
      if (coverage.lexemes) unresolvedMeanings = [];
      candidates = [...reflexive,...candidates.filter(c=>!reflexive.some(r=>window.BibliothekVocabulary.identity(r)===window.BibliothekVocabulary.identity(c)))];
      candidates = candidates.filter((c,i,all) => all.findIndex(x => window.BibliothekVocabulary.identity(x) === window.BibliothekVocabulary.identity(c)) === i);
      // G6 (23.10.2026, user; nouns): two own noun cards of one word that differ in the plural (Wort — Wörter «слова» /
      // Worte «высказывание», Bank — Banken / Bänke, Band — Bände / Bänder / Bands): a plural form of exactly one card
      // decides — only when it really is the plural: not after a singular determiner (bei jedem Worte, mit einem weißen
      // Tuche are old dative singulars), and a form in -e of a der / das noun only after a plural determiner or count word
      // (die / seine / ein paar Worte). Wrong is worse than the window: otherwise nothing changes.
      {
        const own = candidates.filter(c => c.source === 'main' && canonicalPos(c.pos) === 'Nomen' && c.item && !c.construction);
        const sameWord = own.length > 1 && new Set(own.map(c => norm(c.item.word))).size === 1;
        if (sameWord && /^\p{Lu}/u.test(String(word)) && Number.isInteger(context?.tokenOffset)) {
          const key = norm(word);
          const plurals = c => String(c.item.plural || '').split(/\s*,\s*/u).map(norm).filter(p => p && p !== '—');
          const fits = c => !c.item.plural_only && plurals(c).some(p => p === key || p + 'n' === key) && norm(c.item.word) !== key;
          const hits = own.filter(fits);
          if (hits.length === 1) {
            const card = hits[0];
            const before = String(context.sentence || '').slice(0, context.tokenOffset).match(/((?:[\p{L}]+\s+){0,3})$/u)?.[1].trim().split(/\s+/u).filter(Boolean).map(norm) || [];
            // Only a plural determiner or count word of the group proves the plural (die / seine / ein paar Worte, mit diesen
            // Worten, zwei Bänke): a bare form may be another case of a rival card (trotz allen Lobs, jedes Bands — genitive
            // singular; in Worten «цифрами» — «слово»), and without proof the window stays (review 23.10).
            const PLURAL = /^(?:die|der|den|diese|dieser|diesen|jene|jener|jenen|meine|meiner|meinen|deine|deiner|deinen|seine|seiner|seinen|ihre|ihrer|ihren|unsere|unserer|unseren|eure|eurer|euren|keine|keiner|keinen|alle|aller|beide|beiden|viele|vielen|wenige|wenigen|einige|einigen|manche|mancher|manchen|welche|welcher|welchen|solche|solcher|solchen|mehrere|mehreren|paar|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|hundert|tausend)$/u;
            // The determiner: the nearest word before, past up to two lowercase adjectives (die guten Worte); a capitalised word,
            // punctuation or anything else stops the search.
            let det = null;
            for (const w of [...before].reverse()) { if (PLURAL.test(w)) { det = w; break; } if (!/^\p{Ll}[\p{Ll}]*(?:e|en)$/u.test(w) || /^(?:dem|einem|jedem|keinem|meinem|deinem|seinem|ihrem|unserem|eurem|diesem|jenem|welchem|manchem|solchem|allem|jeglichem)$/u.test(w)) break; }
            // die / der / den before a die card's singular (die Bank) never reach here: a card whose word is the tapped form
            // is not a plural hit (fits()).
            // An umlaut the singular does not have proves the plural as well (Wörter, Bänke, Bänder, Tücher — no case of any
            // singular is umlauted).
            const umlaut = /[äöü]/u.test(key) && !/[äöü]/u.test(norm(card.item.word));
            const plural = !!det || umlaut;
            if (plural) candidates = candidates.filter(c => !own.includes(c) || c === card);
          }
        }
      }
      {
        // G5 (3), (4) (22.10.2026, user) — before the producers, so that no rule sees a rival noun that is only a form note:
        // (3) a capitalised word with an own noun card of it (Augen — Auge): an external noun of another lemma that the record
        // itself calls a form of that card (Katzen — katz «apocopic form of Katze», Stunden — stund, Ecken — eck «synonym of
        // Ecke», Gedanken «all cases plural»), or whose first sense is the card's own, word for word (aug «eye», freunde «friends»);
        // (4) an external «gerund of …» for a plural form of the own card (Tränen, Tagen, Fliegen) —
        // only after a plural determiner or count word (die Tränen; not beim Arbeiten, Fliegen macht Angst). Real homographs stay (Falle «trap» beside Fall,
        // Noten «music», Decken — deck).
        const ownNouns = /^\p{Lu}/u.test(String(word)) ? candidates.filter(c => c.source === 'main' && canonicalPos(c.pos) === 'Nomen' && c.item) : [];
        const firstGloss = text => String(text || '').split(/[;,(]/u)[0].trim().toLocaleLowerCase('en');
        const ownForm = c => {
          if (!ownNouns.length || c.source !== 'fallback' || c.pos !== 'noun' || c.construction) return false;
          if (ownNouns.some(o => norm(o.lemma) === norm(c.lemma))) return false;
          // Only the record's first sense counts (Samen «Sami man; rare form of Samen» stays).
          const first = String(c.translation?.en || '').split(/;/u)[0].trim();
          for (const o of ownNouns) {
            const lemma = norm(o.item.word || o.lemma), own = firstGloss(o.item.translation_en);
            if (/^all cases plural$/iu.test(first) && norm(c.lemma) === norm(word)) return true;
            const named = /\b(?:form|synonym|plural|variant) of ([\p{L}]+)/iu.exec(first);
            if (named && norm(named[1]) === lemma) return true;
            // aug «eye» for Auge «eye»; freunde «friends» for Freund «friend» — the same meaning, word for word.
            if (own && norm(c.lemma) + 'e' === lemma && firstGloss(first) === own) return true;
            if (own && norm(c.lemma) === norm(word) && firstGloss(first) === own + 's') return true;
          }
          return false;
        };
        const pluralGerund = c => {
          if (!ownNouns.length || c.source !== 'fallback' || c.pos !== 'noun' || !/^gerund of /u.test(String(c.translation?.en || ''))) return false;
          const plural = ownNouns.some(o => String(o.item.plural || '').split(/\s*,\s*/u).some(p => norm(p) === norm(word) || norm(p) + 'n' === norm(word)));
          if (!plural || !Number.isInteger(context?.tokenOffset)) return false;
          const before = String(context.sentence || '').slice(0,context.tokenOffset).match(/([\p{L}]+)\s+$/u);
          // Only after a plural determiner or count word (die Tränen, nach ein paar Tagen, mit vielen Tränen); otherwise
          // the reader may mean the gerund (Fliegen macht ihm Angst, beim Arbeiten, nach langem Arbeiten) — review 22.10.
          return !!before && /^(?:die|den|der|keine|keinen|keiner|viele|vielen|vieler|einige|einigen|mehrere|mehreren|wenige|wenigen|alle|allen|aller|beide|beiden|paar|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|hundert|tausend|meine|meinen|deine|deinen|seine|seinen|ihre|ihren|unsere|unseren|eure|euren|diese|diesen|jene|jenen|solche|solchen|welche|welchen|manche|manchen)$/u.test(norm(before[1]));
        };
        // (5) an external interjection beside an own adverb card of the same word, inside a sentence (Er kam nicht — not
        // «right?»; ging weiter — not «go on»): it stays where the word stands as an exclamation of its own — opening the
        // utterance with a mark after it, or with ! / ? right after it (»Zurück!«, »Halt, …«, Los!).
        const exclamationOfItsOwn = (() => {
          if (!Number.isInteger(context?.tokenOffset)) return true;
          const sentence = String(context.sentence || ''), at = context.tokenOffset, after = sentence.slice(at + String(word).length);
          if (/^\s*[!?»«“”"]/u.test(after)) return true;
          return /(?:^|[.!?…:»«„“"‘›‹‚–—-])\s*$/u.test(sentence.slice(0,at)) && /^\s*(?:[,;.!?…»«„“"‘›‹–—]|$)/u.test(after);
        })();
        const ownAdverb = candidates.some(c => c.source === 'main' && ['Adverb','particle'].includes(canonicalPos(c.pos)));
        const echo = c => ownAdverb && !exclamationOfItsOwn && c.source === 'fallback' && c.pos === 'intj' && !c.construction;
        const junk = c => ownForm(c) || pluralGerund(c) || echo(c);
        if (candidates.some(junk) && candidates.some(c => !junk(c))) candidates = candidates.filter(c => !junk(c));
      }
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
      // G9: whether the external record lists its ordinary reading before the name (read by name rules below).
      if (candidates.some(c => c.pos === "name" && c.source === "fallback") && fallback.nameReadingOrder)
        for (const pos of ["noun","adj"]) {
          if (!candidates.some(c => c.source === "fallback" && c.pos === pos) || nameReadingOrders.has(`${pos}:${word}`)) continue;
          let order = null; try { order = await fallback.nameReadingOrder(word,pos); } catch (_) {}
          if (nameReadingOrders.size > 4096) nameReadingOrders.clear();
          nameReadingOrders.set(`${pos}:${word}`,order);
        }
      const roleRank = await sharedRoleRank(word,context,candidates.filter(c=>!c.reflexiveUnconfirmed));
      const grammatical = roleRank || grammarRank(word, context, candidates.filter(c => !c.reflexiveUnconfirmed), inflections);
      const ranked = contextualRank(word, context, grammatical.candidates);
      candidates = [...ranked.candidates,...unconfirmed];
      const same = (a,b) => window.BibliothekVocabulary.identity(a) === window.BibliothekVocabulary.identity(b);
      const reflexiveVerb = reflexive.length === 1 && !reflexivePronouns.has(norm(word))
        ? candidates.find(c=>same(c,reflexive[0])) : null;
      // C14 step 3b: two own cards of one infinitive — separated pair or plain verb without construction.
      const twins = (() => {
        const proven = separated.filter(c => c.construction?.confidence !== "tentative" && c.source === "main");
        if (proven.length > 1) return proven.map(p => candidates.find(c => same(c,p))).filter(Boolean);
        const plain = candidates.filter(c => canonicalPos(c.pos) === "Verb" && c.source === "main" && !c.construction && !c.reflexiveUnconfirmed);
        const byBase = new Map(); for (const c of plain) { const k = norm(c.lemma).replace(/^sich\s+/u,""); byBase.set(k,[...(byBase.get(k) || []),c]); }
        const groups = [...byBase.values()].filter(g => g.length > 1);
        // Only when the twins are the only verb readings (führte: führen, not fahren).
        // 21.10.2026 (WN batch G39/G40): the reflexive card of the same verb without sich in the sentence (sich stoßen next to
        // stoßen haben / sein, sich verlassen next to verlassen) is no competing reading of the twins; another verb's is (sich zuziehen).
        // Nor is the reflexive card of a separable verb of the same base whose particle is nowhere in the sentence (sich zuziehen,
        // sich zurückziehen for zog einen Brief aus dem Umhang); with the word in the sentence (zog … heim zu seinem Vater) it stays.
        const base = groups.length === 1 ? norm(groups[0][0].lemma).replace(/^sich\s+/u,"") : "";
        const words = new Set(String(context?.sentence || "").toLowerCase().split(/[^\p{L}]+/u).filter(Boolean));
        const notReading = c => {
          if (!c.reflexiveUnconfirmed) return false;
          const own = norm(c.lemma).replace(/^sich\s+/u,"");
          if (own === base) return true;
          const particle = own.endsWith(base) ? own.slice(0, own.length - base.length) : "";
          return !!particle && !!context?.sentence && !words.has(particle);
        };
        return groups.length === 1 && !candidates.some(c => c.construction) &&
          candidates.filter(c => canonicalPos(c.pos) === "Verb" && !notReading(c)).every(c => groups[0].includes(c)) ? groups[0] : [];
      })();
      // Not for a word that also has an own noun / adjective reading or is a capital inside the sentence (die Fahrt, Risse, gedrungene).
      // L36 (22.10.2026): a lowercase word is no noun (halte / bestand beside Halt / Bestand): only an adjective or adverb card
      // of the same spelling blocks the choice between the verb's cards.
      const nominalWord = candidates.some(c => c.source === "main" && ["Nomen","Adjektiv","Adverb"].includes(canonicalPos(c.pos)) &&
          !(canonicalPos(c.pos) === "Nomen" && /^\p{Ll}/u.test(String(word)))) ||
        /^\p{Lu}/u.test(String(word)) && context && !clauseInitial(context.sentence, context.tokenOffset) ||
        candidates.some(c => c.usage?.role === "attributive" || c.usage?.role === "nominalized");
      // L31 (links to-do, 21.10.2026): a tap on the detached particle of a proven bracket of two own cards
      // (richtet … auf junge Kunden aus, richtet ihm Grüße aus) gets the same choice as the verb: the choice runs
      // from the verb's position, and without evidence the window holds those cards only (not the preposition aus).
      const particleTap = (() => {
        const proven = separated.filter(c => c.construction?.confidence !== "tentative" && c.source === "main");
        const spans = proven[0]?.construction?.spans;
        if (twins.length < 2 || proven.length < 2 || spans?.length !== 2 || !Number.isInteger(context?.tokenOffset) ||
            !proven.every(c => c.construction.spans?.length === 2 && c.construction.spans.every((s,k) => s.start === spans[k].start))) return null;
        return context.tokenOffset === spans[1].start && !(verbAnalyses.get(norm(word)) || []).some(a => a.kind === "finite") ? spans[0] : null;
      })();
      const verbNominal = particleTap && ((forms.get(norm(particleTap.text)) || []).some(e => ["Nomen","Adjektiv","Adverb"].includes(e.type)) ||
        /^\p{Lu}/u.test(particleTap.text) && !clauseInitial(context.sentence, particleTap.start));
      const sense = twins.length > 1 && !(particleTap ? verbNominal : nominalWord)
        ? sameInfinitiveSense(particleTap ? particleTap.text : word,particleTap ? {...context,tokenOffset:particleTap.start} : context,twins) : null;
      // A particle that is also a pronoun (ging … ein) keeps its whole window without evidence: the reader shows
      // the pronoun summary for a window without an article.
      if (particleTap && (sense || !candidates.some(c => ["Pronomen","pronoun"].includes(c.item?.type))))
        candidates = candidates.filter(c => twins.some(t => same(t,c)));
      const constructions = constructionSelection(candidates,separated,sense,word), grouped = constructions.grouped;
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
      const numeral = numeralReading(word,context,candidates);
      const position = await clausePositionReading(word,context,candidates);
      // G9 (21.10.2026, user; reference 13, F13-N1): a name of the external dictionary next to exactly one
      // ordinary noun / adjective of the same spelling (der Wolf, der Müller, Namen, Ehrlich) — the ordinary
      // word first, the name stays as a second meaning, no choice window. The capital decides nothing
      // (every noun has one); a lowercase spelling never selects a noun (C20).
      const nameHomograph = (() => {
        if (!candidates.some(c => c.pos === "name" && c.source === "fallback")) return null;
        const others = candidates.filter(c => c.pos !== "name");
        const other = others.length === 1 ? others[0] : null;
        if (!other || other.construction || other.reflexiveUnconfirmed || !["Nomen","Adjektiv"].includes(canonicalPos(other.pos)) ||
            !ordinaryBeforeName(other,word)) return null;
        return canonicalPos(other.pos) === "Nomen" && (!/^\p{Lu}/u.test(String(word)) ||
          Number.isInteger(context?.tokenOffset) && opensQuotedSpeech(String(context.sentence || ""),context.tokenOffset)) ? null : other;
      })();
      // G5 (22.10.2026, user): junk nouns of the external dictionary leave the candidates (not only the selection):
      // (1) a lowercase word inside a sentence of a text that capitalises its nouns (C20: in einem fort, als, aber, ach nein);
      // (2) an exclamation of its own — opening the utterance, a punctuation mark or the end after it — whose external
      // record is also an interjection (»Ach!«, »Nein, …«): the noun «oh», «a no» is the same word named (ein klares Nein keeps it).
      // Only nouns (pos noun): names stay. A lowercase word only through (1) — a proposal computed before this filter may name
      // the noun of a lowercase text (das nein ist klar), and only C20 withdraws such a proposal (review 22.10).
      // Own noun cards stay (C20 keeps them as candidates); nothing is removed when no other candidate is left.
      const lowercaseNoun = lowercaseNounRisk(word,context,candidates);
      {
        const exclamation = (() => {
          if (!/^\p{Lu}/u.test(String(word)) || !Number.isInteger(context?.tokenOffset)) return false;
          const sentence = String(context.sentence || ''), at = context.tokenOffset;
          if (!/(?:^|[.!?…:»«„“"‘›‹‚–—-])\s*$/u.test(sentence.slice(0,at))) return false;
          const after = sentence.slice(at + String(word).length);
          if (/^\s*(?:[!?.…»«„“"‘›‹]|$)/u.test(after)) return true;
          // After a comma (dash, semicolon) the next word decides: a list of nouns (Gut, Geld und Ehre …; Hallo, Lärm und
          // Gelächter; »Pardon, Herr Graf, …«) starts with a capitalised word or und / oder — no exclamation (review 22.10).
          const next = /^\s*[,;:–—]\s*[«»„“"‘›‹]*\s*([\p{L}]+)/u.exec(after);
          return !!next && !/^\p{Lu}/u.test(next[1]) && !SERIES_COORDINATOR.test(next[1]);
        })();
        const interjections = new Set(candidates.filter(c => c.source === 'fallback' && c.pos === 'intj').map(c => norm(c.lemma)));
        const junk = c => c.source === 'fallback' && c.pos === 'noun' && !c.construction &&
          (lowercaseNoun || exclamation && interjections.has(norm(c.lemma)));
        if (candidates.some(junk) && candidates.some(c => !junk(c))) candidates = candidates.filter(c => !junk(c));
      }
      const selection = selectionCore.start({candidates,derivedOnly,covered:coverage.removed,lowercaseNoun,
        proposals:{
          ...nominal.proposals,
          'grammar-blocked':{active:!!grammatical.blocked},
          'lexicon-convention':{candidate:moechteCard},
          'reflexive-subject':{candidate:reflexiveVerb,evidence:reflexiveVerb ? "reflexive-subject-agreement" : null},
          ...(ranked.rule ? {[ranked.rule]:{candidate:ranked.preferred,evidence:ranked.evidence}} : {}),
          ...constructions.proposals,
          'same-infinitive-sense':sense && !separated.length ? {candidate:sense.candidate,evidence:sense.evidence} : null,
          'clause-position':position ? {candidate:position.candidate,evidence:position.evidence} : null,
          'predicative-comparative':{candidate:predicativeComparativeCard,evidence:predicativeComparativeCard ? 'predicative-comparative' : null},
          'closed-class-exact-form':closedClass,
          'numeral-reading':numeral,
          ...(grammatical.rule ? {[grammatical.rule]:{candidate:grammatical.preferred,evidence:grammatical.evidence}} : {}),
          'name-homograph':{candidate:nameHomograph,evidence:nameHomograph ? 'name-homograph' : null},
          // L34 (user 23.10): an adjective card whose participle is by default the verb or the choice does not win by its exact
          // spelling next to its verb (der davon aufgeweckt ward — the passive is not recognised with ward): the choice.
          'exact-form':{candidate:!competingLexeme && !(exactChoice?.source === "main" && ["verb","choice"].includes(exactChoice.item?.participle_default) &&
            candidates.some(c => canonicalPos(c.pos) === "Verb" && norm(c.lemma).replace(/^sich\s+/u,"") === norm(exactChoice.item.participle_of || "").replace(/^sich\s+/u,""))) ? exactChoice : null}
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
          DECLINED_ENDING.test(norm(word))) {
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
      if (selection.canFill('noun-homonym-agreement',resolution)) {
        const homonym = await nounHomonymAgreement(word,context,resolution.candidates);
        if (homonym) selection.fill(resolution,'noun-homonym-agreement',homonym.candidate,homonym.evidence);
      }
      if (selection.canFill('adjectival-noun-agreement',resolution)) {
        const agreement = await adjectivalNounAgreement(word,context,resolution.candidates);
        if (agreement && selection.fill(resolution,'adjectival-noun-agreement',agreement.candidate,agreement.evidence) && agreement.pair)
          resolution.adjectivalPair = {masculine:agreement.candidate.dictionaryId,feminine:agreement.pair.dictionaryId};
      }
      // G48 (reference 3.18 / C6): only when no dictionary knows the word at all — no card, no external record or form note.
      if (!resolution.candidates.length && !unresolvedMeanings.length && !formNotes.length && !error) {
        const formed = await wordFormationCandidate(word,context);
        if (formed) selection.override(resolution,'word-formation',{selected:formed,candidates:[formed],evidence:'word-formation'});
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
      if (p > 0 && DER_PRONOUNS.includes(norm(tokens[p-1][0])) && p-1 !== v &&
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
    // Konjunktiv context of a sentence (step P1, 17.10.2026): conditional and
    // concessive conjunctions, als ob, damit + subject (purpose clause), wishes, Konjunktiv I of
    // indirect speech and any own form that is only Konjunktiv II (wäre, hätte, würde, käme).
    const KONJUNKTIV_SIGNALS = /^(?:wenn|falls|sofern|ob|sei|seien|seiest|seist|seiet|wünschte\p{L}*|würde\p{L}*|hätte\p{L}*|hätt|wäre\p{L}*|wär|könnte\p{L}*|müsste\p{L}*|müßte\p{L}*|dürfte\p{L}*|wüsste\p{L}*|wüßte\p{L}*)$/u;
    const NO_WEAK_PAST_LABEL = new Set([...modalLemmas, "möchten", "haben", "sein", "werden"]);
    function weakPastIndicative(base, start, context) {
      const sentence = String(context?.sentence || "");
      if (!sentence || !Number.isInteger(start) || NO_WEAK_PAST_LABEL.has(base)) return false;
      // Verb-first: a conditional (Fragte man ihn, …) or a question — not claimed. A lowercase form right
      // after direct speech (»…?« fragte der Vater; a reader sentence starting «fragte der Vater») is the
      // speech tag, an indicative (to-do 19.10, 2.1, R-kafka-13).
      const speechTag = /^\p{Ll}/u.test(sentence.slice(start)) && /(?:^|[«»“”"‚‘’]\s*)$/u.test(sentence.slice(0, start));
      if (clauseInitial(sentence, start) && !speechTag) return false;
      // als + verb: als wohnte er hier.
      if (/(?:^|[^\p{L}])als[^\p{L}]*$/iu.test(sentence.slice(0, start))) return false;
      // Before a noun after a determiner, a number, a verb or a determiner + adverb the
      // spelling is an attributive participle (die beleuchtete Fenster, waren beleuchtete
      // Sichtfenster, dem blank polierten Tor), not a finite verb: no mark.
      const words = [...sentence.matchAll(/[\p{L}\p{M}]+/gu)];
      const at = words.findIndex(m => m.index === start);
      const next = words[at + 1]?.[0], prev = norm(words[at - 1]?.[0] || ""), prev2 = norm(words[at - 2]?.[0] || "");
      const gap = (a, b) => a && b && /^[\s]*$/u.test(sentence.slice(a.index + a[0].length, b.index));
      const DET = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|en|kein\p{L}*|mein\p{L}*|dein\p{L}*|seine\p{L}*|ihre\p{L}*|unser\p{L}*|euer|eure\p{L}*|dies\p{L}*|jene\p{L}*|jede\p{L}*|welche\p{L}*|alle\p{L}*|viele\p{L}*|wenige\p{L}*|mehrere|einige\p{L}*|beide\p{L}*|manche\p{L}*|solche\p{L}*|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)$/u;
      if (at < 0) return false;
      // das siebente / siebte is an ordinal, not sieben «просеивать». An ein-word / possessive + form +
      // comma is an adjective series (ihre erhitzten, schweißüberströmten Gesichter); der, die, das,
      // dieser, alles before the form are pronoun subjects (das hörte, …) and keep the mark.
      if (DET.test(prev) && gap(words[at - 1], words[at]) && (/^sieb(?:en)?te[nmrs]?$/u.test(norm(words[at][0])) ||
        /^(?:ein|eine|einen|einem|einer|eines|kein\p{L}*|mein\p{L}*|dein\p{L}*|seine\p{L}*|ihre\p{L}*|unser\p{L}*|eure\p{L}*)$/u.test(prev) &&
        /^\s*,/u.test(sentence.slice(words[at].index + words[at][0].length)))) return false;
      // A capitalised spelling inside the sentence is a noun (das Verlangte).
      if (/^\p{Lu}/u.test(words[at][0]) && (next && /^\p{Lu}/u.test(next) || !clauseInitial(sentence, start))) return false;
      if (next && /^\p{Lu}/u.test(next) && gap(words[at], words[at + 1])) {
        if (gap(words[at - 1], words[at]) && ((verbAnalyses.get(prev) || []).some(r => r.kind === "finite") || prepositions.has(prev) || DET.test(prev) ||
          /^\p{Ll}/u.test(words[at - 1][0]) && DET.test(prev2) && gap(words[at - 2], words[at - 1]))) return false;
        // die von ihr erwartete Wirkung, einem mit Blut bespritzten Umhang: a determiner
        // before a preposition up to four words back in the same phrase, with no finite verb
        // or subject pronoun between (not der alte Mann umarmte Mr Dursley).
        let afterPreposition = false;
        for (let j = at - 1; j >= Math.max(0, at - 4) && gap(words[j], words[j + 1]); j--) {
          const w = norm(words[j][0]);
          if (prepositions.has(w)) afterPreposition = true;
          if (DET.test(w) && afterPreposition) return false;
          if ((verbAnalyses.get(w) || []).some(r => r.kind === "finite") || subjectPersons[w] && !prepositions.has(norm(words[j - 1]?.[0] || ""))) break;
        }
      }
      const DAMIT_SUBJECT = /^(?:ich|du|er|sie|es|wir|ihr|man|ihn|ihm|ihnen|mich|mir|dich|dir|uns|euch|sich|niemand|nichts|keiner)$/u;
      for (const [k, m] of words.entries()) {
        const w = norm(m[0]);
        // C14 step 1: a capital inside the sentence is a noun, not a Konjunktiv form (Schritte — schritte of schreiten, Wänden).
        if (/^\p{Lu}/u.test(m[0]) && !clauseInitial(sentence, m.index)) continue;
        if (KONJUNKTIV_SIGNALS.test(w)) return false;
        // damit + subject opens a purpose clause (damit sie für ihn beteten); damit + verb is an adverb (damit packte er).
        if (w === "damit" && words[k + 1] && (DAMIT_SUBJECT.test(norm(words[k + 1][0])) || DET.test(norm(words[k + 1][0])))) return false;
        // (L23, books check 24.10: the derived modal Konjunktiv I — als könne sie — is no sign for the weak -te form of
        // another clause: Sie baute sich vor den dreien auf …, … damit rechnete, Voldemort könne hereinplatzen)
        const finite = (verbAnalyses.get(w) || []).filter(r => r.kind === "finite" && !(r.tense === "Konjunktiv I" && MODAL_STEMS[norm(r.base)]));
        if (finite.length && finite.every(r => ["Konjunktiv II","Konjunktiv I"].includes(r.tense))) return false;
      }
      return true;
    }
    function formFeatures(word, candidate, resolution, context) {
      const form = norm(word), type = canonicalPos(candidate.pos), base = norm(candidate.lemma).replace(/^sich\s+/u, "");
      const k = candidate.construction;
      if (type === "Verb") {
        // L6 (23.10): werden + adjective / noun («становиться», no link — L29) keeps the tense of werden itself
        // (Sie wurde eine Königin, es ward immer größer: Präteritum).
        const becomeWerden = k?.id === "werden-become" && base === "werden";
        if (candidate.usage || k && !["separable-verb","reflexive-verb"].includes(k.id) && !becomeWerden || k?.confidence === "tentative") return null;
        // L4 review (23.10): the reflexive construction already writes «Konjunktiv II mit …» (trüge sich zu, sähe sich um) — not twice.
        if (k?.id === "reflexive-verb" && ["Perfekt","Plusquamperfekt","Konjunktiv II"].includes(k.tense)) return null;
        // L4 (links chat, 23.10.2026): a separable reflexive verb (stellte sich … hin, schaute sich um) reads its tense from
        // all its verb spans like a separable verb — the verb and the particle; the reflexive pronoun is no verb form.
        const spanForms = (k?.spans || []).filter(span => !reflexivePronouns.has(norm(span.text))).map(span => ({form:norm(span.text), start:span.start}));
        const separableReflexive = k?.id === "reflexive-verb" && spanForms.some(f => base.startsWith(f.form) && f.form !== base);
        const separableSpans = k?.id === "separable-verb" || separableReflexive;
        const forms = separableSpans ? spanForms : [{form, start:context?.tokenOffset}];
        const labels = new Set(), sources = new Map();
        let ownKonjunktiv = false;
        // To-do 19.10 (2.1, R-potter-03): a separated verb only the external dictionary knows takes the tense
        // of its simple verb (warf … zurück: warf of werfen); the particle is the span that is not the clicked verb form.
        const particle = separableSpans ? forms.map(f => f.form).find(f => base.startsWith(f) && f !== base) : null;
        const simple = particle ? base.slice(particle.length) : null;
        for (const {form:f, start} of forms) for (const row of verbAnalyses.get(f) || []) {
          if (norm(row.base) !== base && !(simple && norm(row.base) === simple)) continue;
          // The detached particle of a separable verb is no verb form of its own.
          if (separableSpans && row.kind === "infinitive") continue;
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
        // L34 (reference F12-G2g): a participle chosen as the verb by its sign after sein (waren von … geschickt) — «Partizip II».
        if (["participle-verb-sign","participle-default"].includes(resolution?.decision?.rule) && (labels.has("Partizip II") || labels.has("Partizip")) && !labels.has("Infinitiv") && resolution?.selected?.evidence !== "participle-default-verb-form") return {tense:"Partizip II"};
        // Weak -te forms (wohnte, spielte, lehnte … ab) are Präteritum and Konjunktiv II at once.
        // Step P1 (17.10.2026): read as Präteritum unless the sentence shows a Konjunktiv context.
        const weakForm = sources.get("Präteritum")?.form || form;
        if (labels.has("Präteritum") && [...labels].every(t => ["Präteritum","Konjunktiv II"].includes(t)) && /te(?:st|n|t)?$/u.test(weakForm)) {
          // Only Präteritum while the own table lists Konjunktiv II: its Konjunktiv II is another spelling (hatte / hätte).
          if (labels.size === 1 && ownKonjunktiv) return {tense:"Präteritum"};
          return weakPastIndicative(base, sources.get("Präteritum")?.start ?? context?.tokenOffset, context) ? {tense:"Präteritum"} : null;
        }
        if (labels.size !== 1 || !["Präteritum","Imperativ","Konjunktiv II"].includes(only)) return null;
        // An imperative opens its clause; elsewhere the same spelling is another form or another word.
        if (only === "Imperativ" && !clauseInitial(context?.sentence, sources.get(only)?.start ?? context?.tokenOffset)) return null;
        return {tense:only};
      }
      const entry = candidate.source === "main" ? candidate.item : null;
      if (type === "Nomen" && entry?.plural && !entry.plural_only && !entry.declension_forms && !candidate.usage) {
        const word = norm(entry.word), plural = norm(entry.plural);
        const plurals = new Set([plural, /[ns]$/u.test(plural) ? plural : plural + "n"]);
        const singulars = new Set([word, word + "s", word + "es", word + "e", word + "n", word + "en"]);
        if (plurals.has(form) && !singulars.has(form)) return {number:"plural"};
        // To-do 19.10 (2.6, R-potter-16): a plural equal to an old singular form (Punkte / dem Punkte) is plural
        // after a number above one or a plural quantifier right before it (zwanzig Punkte, viele Punkte).
        if (plurals.has(form) && Number.isInteger(context?.tokenOffset)) {
          const before = String(context.sentence || "").slice(0, context.tokenOffset);
          const prev = /([\p{L}\d]+)\s+$/u.exec(before)?.[1];
          if (prev && (/^(?:[2-9]|\d{2,})$/u.test(prev) || /^(?:zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|\p{L}+zehn|\p{L}*zig|\p{L}*hundert|\p{L}*tausend|viele|vielen|mehrere|mehreren|einige|einigen|wenige|wenigen|beide|beiden)$/u.test(norm(prev)))) return {number:"plural"};
        }
        return null;
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
    // To-do 19.10 (2.1, R-grimm-11): a verb only the external dictionary knows is a separable verb when the
    // separable index lists it with its particle (aufschreien, auf): daß sie aufschrie — «Trennbares Verb». Particles
    // that also make inseparable verbs (über-, um-, durch-, unter-, hinter-, wider-, wieder-, voll-) are left out
    // (übersetzen, umfahren), as are derived particle + verb entries (S2).
    const DOUBLE_PARTICLES = new Set(["über","um","durch","unter","hinter","wider","wieder","voll"]);
    // L44 (1) / F12-G4d (links chat, 23.10.2026): inside a verb group (durfte … aufwecken, ward aufgetan, wäre aufgegangen) the
    // mark stays when the clicked form itself begins with the particle — the joined spelling shows the verb.
    function externalSeparable(c, word) {
      if (c.source !== "fallback" || canonicalPos(c.pos) !== "Verb" || c.usage) return false;
      const lemma = norm(c.lemma);
      for (let n = 2; n < lemma.length - 2; n++) {
        const prefix = lemma.slice(0, n);
        if (DOUBLE_PARTICLES.has(prefix)) continue;
        if (c.construction && !norm(word || "").startsWith(prefix)) continue;
        if ((separableBases.get(lemma.slice(n)) || []).some(row => norm(row.prefix) === prefix && norm(row.entry.word) === lemma && !row.entry.derivedSeparable)) return true;
      }
      return false;
    }
    // To-do 3.8 (reference G4, user 18.10): the clicked modal of a modal group shows its mood when its own form table makes
    // it Konjunktiv II only (könnte, müsste, dürfte) or Präteritum and Konjunktiv II at once (sollte, wollte: «Präteritum /
    // Konjunktiv II», 12.1 p. 5); Präsens forms (kann) stay unmarked (MODAL-01). L5 (reference G4 addition, F12-G4c–e, user 23.10):
    // a Präteritum-only form (musste, konnte, durfte, mochte) — «Präteritum mit gehen»; the infinitive keeps «Modal mit gehen»;
    // a perfect infinitive (musste … gewesen sein, U-H08) is another construction and stays without the tense.
    // Reference A3: the reported-speech hint only for a form beside er / sie / es / man or a noun subject — not for a wish
    // opening the clause (Möge die Macht mit dir sein) and not with ich / du / ihr (review 24.10).
    function reportedSpeech(word, context) {
      const sentence = String(context?.sentence || ""), tokens = sharedTokens(sentence, "reportedSpeech"), at = clickedTokenIndex(tokens, context?.tokenOffset, word);
      if (at < 0 || /^\p{Lu}/u.test(word) && clauseInitial(sentence, tokens[at].index)) return false;
      if (/(?:est|et)$/u.test(norm(word))) return false;
      return ![tokens[at-1], tokens[at+1]].some(t => t && ["ich","du","ihr"].includes(norm(t[0])));
    }
    function modalMood(word, c) {
      if (c.construction?.id !== "modal-group" || canonicalPos(c.pos) !== "Verb") return null;
      const base = norm(c.lemma);
      if (!MODAL_BASES.has(base) || norm(c.construction.lemma || "") === base) return null;
      const tenses = new Set((verbAnalyses.get(norm(word)) || []).filter(r => r.kind === "finite" && norm(r.base) === base).map(r => r.tense));
      if (tenses.size === 1 && tenses.has("Konjunktiv II")) return "Konjunktiv II";
      if (tenses.size === 2 && tenses.has("Konjunktiv II") && tenses.has("Präteritum")) return "Präteritum / Konjunktiv II";
      if (tenses.size === 1 && tenses.has("Präteritum")) return "Präteritum";
      // L23 (reference A3, F12-A3c): a Konjunktiv I form (könne, solle) is never another tense of the modal.
      if (tenses.size === 1 && tenses.has("Konjunktiv I")) return "Konjunktiv I";
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
      const contractionCard = c => c.explanation?.kind === 'contraction' && c.construction?.id === 'preposition-article';
      if (resolution.candidates.some(c => !c.nounPhrase && !c.nounArticleLink && !c.construction &&
          (c.pos === 'article' || canonicalPos(c.pos) === 'Nomen') || contractionCard(c))) {
        const pair = await articleNounLink(word,context);
        if (pair) {
          resolution.candidates = resolution.candidates.map(c => pair.contraction && pair.clicked === 'article' && contractionCard(c)
            ? {...c,construction:{...c.construction,spans:pair.spans}} :
            c.nounPhrase || c.nounArticleLink || c.construction ? c :
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
        // C14 (17.10.2026): verbal nouns (das Flüstern) give derived_from {type:"Verb", word:"flüstern"}.
        const verb = /^(?:Partizip|Verb|Infinitiv)/u.test(from.type || '');
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
      // analysis of the form agrees; ambiguous forms (macht, schneller) stay unmarked; weak -te forms
      // (spielte) are Präteritum outside a Konjunktiv context (step P1, weakPastIndicative).
      resolution.candidates = resolution.candidates.map(c => {
        const features = {...formFeatures(word, c, resolution, context), ...(modalAsFullVerb(word, c, context) ? {fullVerb:true} : {}),
          ...(modalMood(word, c) ? {modalMood:modalMood(word, c), ...(modalMood(word, c) === "Konjunktiv I" && reportedSpeech(word, context) ? {reportedSpeech:true} : {})} : {}),
          ...(externalSeparable(c, word) ? {separable:true} : {})};
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
      // C21b: zu dritt — heading «zu dritt», meaning «втроём», both words highlighted.
      resolution.candidates = resolution.candidates.map(c => {
        const spans = c.source === "main" && c.item?.type === "numeral" ? collectiveFrame(word,context,c.item) : null;
        if (!spans) return c;
        const form = `zu ${spans[1].text}`;
        return {...c, formTranslation:{form, ru:c.item.collective.ru || "", en:c.item.collective.en || ""}, compound:{form,part:word,spans}};
      });
      repoint();
      // Enrich only after all morphology, ranking and selection are complete.
      if (window.BibliothekRussianTranslations)
        await window.BibliothekRussianTranslations.enrich({...resolution,candidates:resolution.candidates.filter(c=>!c.explanation)},window.DeutschTranslation?.getLang?.() || "en");
      observe('stage', {stage:'enrichment-complete'});
      return resolution;
    }
    // D4 (16.10.2026): at the first click in a sentence, request the external
    // dictionary parts of its words at once: the clicked word, verbs of our own
    // dictionary and words it does not know (with the ending hypotheses the
    // morphology checks for them). Words that the own dictionary answers by
    // itself (function words, prepositions, nouns, adverbs) are not requested.
    // Only the file caches of the fallback are filled; no fact of this resolver
    // is read or written here, so it changes the order of requests, not results.
    const warmedSentences = new Set();
    function warmSentence(sentence, clicked) {
      if (!fallback.warm || !sentence || warmedSentences.has(sentence)) return;
      if (warmedSentences.size >= 64) warmedSentences.delete(warmedSentences.values().next().value);
      warmedSentences.add(sentence);
      const words = sentence.match(/[\p{L}\p{M}]+/gu) || [];
      // KF1: a form of our own haben / sein card is not warmed — lower-case anywhere, capitalised only as the
      // first word (Hat er …? Wäre ich …): resolveInternal treats both as the own verb (no internalCapital).
      const ownAuxiliaryAt = (word,i) => ownAuxiliarySpelling(word) || i === 0 && ownAuxiliarySpelling(norm(word));
      const spellings = ownAuxiliaryAt(String(clicked || ''),String(clicked || '') === words[0] ? 0 : -1) ? [] : [String(clicked || '')];
      // A declined modifier before a capitalised word is checked together with
      // that noun (noun frames), both with their ending hypotheses.
      const frames = new Set();
      words.forEach((word,i) => {
        if (word[0] === norm(word)[0] && DECLINED_ENDING.test(word) && words[i+1] && words[i+1][0] !== norm(words[i+1])[0] &&
          !grammaticalWords.has(norm(word)) && !prepositions.has(norm(word))) frames.add(i).add(i+1);
      });
      words.forEach((word,i) => {
        const key = norm(word), own = forms.get(key) || [];
        if (grammaticalWords.has(key) || prepositions.has(key) || ownAuxiliaryAt(word,i)) return;
        const capital = word[0] !== key[0], wanted = word === clicked || frames.has(i);
        if (capital && i > 0 && !wanted) return;
        if (word.length > 1 && word === word.toUpperCase() && word !== clicked) return;
        const verbal = verbAnalyses.has(key) || lexicalSeparated(key) || zuForms.has(key) || own.some(e => e.type === 'Verb');
        if (own.length && !verbal && !wanted) return;
        spellings.push(word);
        if (capital) spellings.push(key);
        for (const ending of endings) if (key.endsWith(ending) && key.length > ending.length+1) {
          const stem = key.slice(0,-ending.length);
          spellings.push(stem,stem+'e');
        }
      });
      try { fallback.warm(spellings.filter(Boolean)).catch(() => {}); } catch (_) {}
    }
    // 3.16 / 3.21 (reference B1, B2, G15; 19.10.2026): constructions recorded in the cards' `match` blocks
    // (format: Documentation/WOERTERBUCH_EXPRESSIONS.md). A tap on any part of a found construction opens the
    // card of the record (weder … noch, so … dass, um … willen) with all parts highlighted; the words between the
    // parts keep their own cards. Not found — the normal card of the tapped word (fallback 4.8). Komparativ + als
    // (B2): als shows «здесь: чем» from its own record. Extra conditions of a part: `next: "comparative"`,
    // `not_after: [words]`, `clause_start: true`; of a pattern: `separated: true` (consecutive parts lie in
    // different parts of the sentence, i.e. a comma or other mark between them).
    // E1 (22.10.2026, expression vor sich hin): a part `reflexive: true` is any reflexive pronoun (vor mich / dich / sich / uns / euch hin).
    const CONSTRUCTION_REFLEXIVE = ["mich","dich","sich","uns","euch"];
    const constructionAnchors = (() => {
      const map = new Map();
      for (const entry of entries) for (const m of [].concat(entry.match || [])) {
        if (!m || !Array.isArray(m.parts) || m.order !== "fixed") continue;
        const anchor = m.parts[m.anchor];
        if (!anchor || anchor.optional || !anchor.form) continue;
        // Indexed by every word of every part: a tap on any part finds the record.
        for (const key of new Set(m.parts.flatMap(part => (part.reflexive ? CONSTRUCTION_REFLEXIVE : [].concat(part.form || [])).flatMap(alt => String(alt).split(/\s+/u).map(norm))))) {
          if (!map.has(key)) map.set(key, []);
          map.get(key).push({entry, m});
        }
      }
      return map;
    })();
    const irregularComparatives = new Set(["mehr","weniger","minder","eher","lieber","besser","höher","näher"]);
    // An undeclined comparative (kleiner, teurer, größer, mehr): own adjective cards give the form (field
    // comparative, otherwise positive + er; teuer → teurer, dunkel → dunkler); a capitalised word right after it
    // (ein kleiner Junge) makes it a declined positive, not a comparative.
    const comparativeForms = (() => {
      const set = new Set();
      for (const e of entries) if (e.type === "Adjektiv" && e.word && !/\s/u.test(e.word)) {
        const w = norm(e.word);
        set.add(e.comparative ? norm(e.comparative) : /(?:el|er)$/u.test(w) && w.length > 4 ? w.slice(0,-2) + w.slice(-1) + "er" : w.endsWith("e") ? w + "r" : w + "er");
      }
      return set;
    })();
    async function comparativeToken(tokens, i, sameClause) {
      const token = tokens[i];
      if (!token || /^[A-ZÄÖÜ]/u.test(token[0]) && i > 0) return false;
      const key = norm(token[0]);
      if (irregularComparatives.has(key)) return true;
      if (!comparativeForms.has(key)) return false;
      return !(tokens[i+1] && sameClause(i, i+1) && /^\p{Lu}/u.test(tokens[i+1][0]));
    }
    // A degree word after so (so geschwind, so viel, so große Freude): an adjective or adverb, not a finite verb
    // (so steige ich), a pronoun or a preposition (so hinter einem Baum).
    async function degreeToken(token) {
      if (!token || /^\p{Lu}/u.test(token[0]) || ["wie","als","dass","daß","ob","wenn"].includes(norm(token[0]))) return false;
      const own = forms.get(norm(token[0])) || [];
      if (own.some(e => ["Verb","Pronomen","preposition","article","Konjunktion"].includes(e.type))) return false;
      if (own.some(e => e.type === "Adjektiv" || e.type === "Adverb") || comparativeForms.has(norm(token[0]))) return true;
      try {
        const morph = await tokenMorphology(token,{discoverModifiers:true},'constructionAt');
        return morph.analyses.some(a => canonicalPos(a.pos) === "Adjektiv") && !morph.analyses.some(a => canonicalPos(a.pos) === "Verb" && a.kind !== "participle");
      } catch (_) { return false; }
    }
    async function constructionAt(word, context) {
      if (!Number.isInteger(context?.tokenOffset) || !constructionAnchors.size) return null;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'constructionAt');
      const index = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (index < 0) return null;
      const gap = i => i > 0 ? sentence.slice(tokens[i-1].index + tokens[i-1][0].length, tokens[i].index) : "";
      const clause = [], opening = [];
      // E3 (links chat, 22.10.2026; check of expressions 002–007): und / oder right before a finite verb starts another clause
      // (Die FDP hat erst zugestimmt und will jetzt nichts damit zu tun haben — hat is not a part of the expression).
      const finiteHere = i => /^\p{Ll}/u.test(tokens[i][0]) && (verbAnalyses.get(norm(tokens[i][0])) || []).some(a => a.kind === "finite");
      for (let i = 0, c = 0; i < tokens.length; i++) {
        if (i && /[,;:.!?…–—()"„“”«»]/u.test(gap(i))) c++;
        else if (i > 1 && COORDINATORS_WITHOUT_COMMA.includes(norm(tokens[i-1][0])) && finiteHere(i)) c++;
        clause.push(c); opening.push(!i || /[.!?:„“"«»]/u.test(gap(i)));
      }
      const keys = tokens.map(t => norm(t[0]));
      const same = (a,b) => clause[a] === clause[b];
      const upper = w => /^\p{Lu}/u.test(w);
      const occurrences = async (part, expression = false) => {
        const out = [];
        for (const alt of part.reflexive ? CONSTRUCTION_REFLEXIVE : [].concat(part.form || [])) {
          const raw = String(alt).trim().split(/\s+/u), words = raw.map(norm);
          for (let i = 0; i + words.length <= tokens.length; i++) {
            if (!words.every((w,k) => keys[i+k] === w && clause[i+k] === clause[i] &&
              (upper(raw[k]) === upper(tokens[i+k][0]) || !upper(raw[k]) && opening[i+k]))) continue;
            const last = i + words.length - 1;
            // (`clause_start_after`: one of these words may open the clause before the part — Und was hat er für ein Auto?, Mit was für Leuten)
            if (part.clause_start && i > 0 && clause[i-1] === clause[i] && !(part.clause_start_after && [].concat(part.clause_start_after).map(norm).includes(keys[i-1]) &&
              (i === 1 || clause[i-2] !== clause[i-1] || opening[i-1]))) continue;
            // E3: a word with an own conjunction card opening its clause and not followed by a finite verb is the conjunction
            // after a comma (…, damit ich nichts zu tun habe «чтобы» — not the expression; Damit hab ich nix zu tun! at the sentence start stays).
            if (expression && words.length === 1 && i > 0 && clause[i-1] !== clause[i] && !opening[i] && (forms.get(keys[i]) || []).some(e => e.type === "Konjunktion") &&
                !(tokens[i+1] && clause[i+1] === clause[i] && finiteHere(i+1))) continue;
            if (part.not_after && i > 0 && [].concat(part.not_after).map(norm).includes(keys[i-1])) continue;
            if (part.next === "comparative" && !(tokens[last+1] && clause[last+1] === clause[last] && await comparativeToken(tokens,last+1,same))) continue;
            if (part.next === "degree" && !(tokens[last+1] && clause[last+1] === clause[last] && await degreeToken(tokens[last+1]))) continue;
            if (part.not_next && tokens[last+1] && [].concat(part.not_next).map(norm).includes(keys[last+1])) continue;
            // 24.10.2026 (review of expression 031): `not_next_capital: true` — no capitalised word (a noun) right after the part in its clause
            // (eine Stunde nach dem anderen Termin — «другой», not «один за другим»; a list of nouns is never complete).
            if (part.not_next_capital && tokens[last+1] && clause[last+1] === clause[last] && upper(tokens[last+1][0])) continue;
            // 24.10.2026 (review of expression 028): `not_next_comparative: true` — no comparative right after the part (immer noch höher
            // «всё выше» — not «всё ещё»), unless als follows in the clause (Das ist immer noch besser als nichts «всё-таки лучше»).
            if (part.not_next_comparative && tokens[last+1] && clause[last+1] === clause[last] && await comparativeToken(tokens,last+1,same) &&
              !tokens.some((t,k) => k > last + 1 && clause[k] === clause[last] && keys[k] === "als")) continue;
            // An impersonal es in the clause (Wie ist's so traurig, dass …): the word takes its own dass-clause.
            if (part.not_next_impersonal && tokens[last+1] && [].concat(part.not_next_impersonal).map(norm).includes(keys[last+1]) &&
              tokens.some((t,k) => clause[k] === clause[i] && (keys[k] === "es" || /['’]s$/u.test(keys[k]) || keys[k] === "s" && /['’]$/u.test(gap(k))))) continue;
            if (part.clause_has && !tokens.some((t,k) => clause[k] === clause[i] && [].concat(part.clause_has).map(norm).includes(keys[k]))) continue;
            out.push(words.map((_,k) => i+k));
          }
        }
        return out.sort((a,b) => a[0]-b[0]);
      };
      const separableTwin = (m, flat) => {
        const particle = keys[flat.at(-1)], listed = new Set([].concat(m.not_separable_verb).map(norm));
        for (let k = flat[0] - 1; k >= 0 && clause[k] === clause[flat[0]]; k--) {
          // (a capitalised word inside the sentence is a noun, not a verb: legte das Buch vor sich hin — Buch is no buchen)
          if (upper(tokens[k][0]) && !opening[k]) continue;
          const own = (verbAnalyses.get(keys[k]) || []).filter(a => ["finite","imperative"].includes(a.kind));
          if (!own.length) continue;
          return own.some(a => listed.has(norm(a.base)) || listed.has(particle + norm(a.base)));
        }
        return false;
      };
      let best = null;
      for (const {entry, m} of constructionAnchors.get(keys[index]) || []) {
        const occ = [];
        // (only in expression records: so … dass, damit-pairs of conjunction records keep their conjunction parts)
        for (const part of m.parts) occ.push(await occurrences(part, entry.type === "Ausdruck"));
        if (!occ[m.anchor].length) continue;
        const inScope = (a,b) => m.scope === "sentence" || clause[a] === clause[b];
        const search = (p, prev, chosen) => {
          if (p === m.parts.length) {
            const flat = chosen.filter(Boolean).flat();
            if (!flat.includes(index) || !chosen[m.anchor]) return;
            if (m.scope === "adjacent" && flat.some((t,k) => k && t !== flat[k-1]+1)) return;
            // 24.10.2026 (review of expression 031): another occurrence of a part between it and the next part — the nearer one is the
            // partner (dem einen Riesen einen Stein nach dem andern: only the second einen belongs to nach dem andern).
            if (chosen.some((o,p) => o && (() => { const next = chosen.slice(p+1).find(Boolean);
              return next && occ[p].some(x => x[0] > o.at(-1) && x.at(-1) < next[0]); })())) return;
            // E1 (22.10.2026, reference C1 addition 21.10 p. 2): `not_separable_verb` — the last part closes the bracket of one of
            // these separable verbs (stellte es vor sich hin — hinstellen, not the expression): the nearest finite / imperative verb
            // before the pattern in its clause, with the last part as particle, is in the list.
            if (m.not_separable_verb && separableTwin(m, flat)) return;
            // G65 (24.10.2026, was für ein; corrected after the independent review): `before_frame_end: true` on a part — it does not
            // stand right after the closed verbal frame: the word right before it is an infinitive / participle (lowercase, no card of
            // its own as adjective, adverb, pronoun or article — not sein Vater, meinen Eltern, bestimmt, verdammt) and a finite verb
            // stands between the first part and it (Was würde er nicht alles geben für eine Nachricht — für «для»: no construction).
            // (user 24.10, next step: not dropped — offered in a choice, «für — для» first: Was hat sie gesagt für einen Unsinn! is «что за»)
            const afterFrame = m.parts.some((part,p) => part.before_frame_end && chosen[p] && (() => {
              const k = chosen[p][0] - 1;
              if (k <= flat[0] || clause[k] !== clause[chosen[p][0]] || upper(tokens[k][0])) return false;
              if ((forms.get(keys[k]) || []).some(e => e.type !== "Verb")) return false;
              if (!(verbAnalyses.get(keys[k]) || []).some(a => a.kind === "infinitive" || a.kind === "participle")) return false;
              for (let j = flat[0] + 1; j < k; j++) if (clause[j] === clause[k] && !(upper(tokens[j][0]) && !opening[j]) &&
                (verbAnalyses.get(keys[j]) || []).some(a => a.kind === "finite")) return true;
              return false;
            })());
            // E6 (links chat, 23.10.2026; user decision on 017 «wir sehen uns»): `clause_rest` — a white list: after the pattern up to
            // the end of its clause (punctuation, a new clause, und / oder / aber / denn / sondern) only these words (any case) or
            // numbers may stand; nothing at all is allowed too (Wir sehen uns!). Wir sehen uns morgen / am Montag / in drei Tagen —
            // yes; Wir sehen uns heute Fotos an, … gezwungen, … als Sieger, … nicht in der Lage — no.
            if (m.clause_rest && (() => {
              const allowed = new Set([].concat(m.clause_rest).map(norm));
              // `clause_rest_place` (user 23.10): after at least one listed word a place phrase is allowed too — one of these
              // prepositions, then up to two lowercase words (article, adjective) and a capitalised noun (heute Abend im Kino,
              // morgen beim Essen); without a word before it, no (in Hogwarts, im Spiegel).
              // Only after one of `clause_rest_place_after` (heute, morgen, gleich …; not wieder, noch: Wir sehen uns wieder im
              // Spiegel). `clause_rest_before_number`: such a word only right before a number (um acht, um 8 Uhr, um halb neun —
              // not the particle: … nach einer Wohnung um).
              const place = new Set([].concat(m.clause_rest_place || []).map(norm));
              const licence = new Set([].concat(m.clause_rest_place_after || []).map(norm));
              const beforeNumber = new Set([].concat(m.clause_rest_before_number || []).map(norm));
              const numberWord = k => k < tokens.length && (/^\d+$/u.test(keys[k]) || allowed.has(keys[k]) && /^(?:ein|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|halb|viertel)$/u.test(keys[k]));
              let licensed = flat.some(k => licence.has(keys[k]));
              let rest = 0;
              for (let k = flat.at(-1) + 1; k < tokens.length && clause[k] === clause[flat[0]]; k++) {
                if (CLAUSE_COORDINATORS.includes(keys[k])) break;
                // (digits are not tokens: um 8 Uhr — the number stands in the gap after um)
                if (beforeNumber.has(keys[k])) {
                  if (!(/^\s*\d/u.test(sentence.slice(tokens[k].index + tokens[k][0].length)) || k+1 < tokens.length && clause[k+1] === clause[k] && numberWord(k+1))) return true;
                  rest++; continue;
                }
                if (licence.has(keys[k])) licensed = true;
                if (licensed && place.has(keys[k])) {
                  let h = k + 1;
                  while (h < tokens.length && clause[h] === clause[k] && h - k <= 3 && !upper(tokens[h][0])) h++;
                  if (h < tokens.length && clause[h] === clause[k] && upper(tokens[h][0])) {
                    while (h + 1 < tokens.length && clause[h+1] === clause[k] && upper(tokens[h+1][0])) h++;
                    k = h; rest++; continue;
                  }
                  return true;
                }
                if (!allowed.has(keys[k]) && !/^\d+$/u.test(keys[k])) return true;
                rest++;
              }
              // `clause_rest_bare_end`: with nothing after the pattern only before these marks (Wir sehen uns! — the farewell;
              // Wir sehen uns. stays sehen, reference 5.13).
              if (!rest && m.clause_rest_bare_end) {
                const last = tokens[flat.at(-1)], tail = sentence.slice(last.index + last[0].length).trimStart();
                return ![].concat(m.clause_rest_bare_end).some(mark => tail.startsWith(mark));
              }
              return false;
            })()) return;
            // E5 (links chat, 23.10.2026; review of expressions 015–026): a new main clause right after an adjacent expression —
            // a finite verb follows it and the nearest finite verb before it, with the expression's first word, is a separable
            // verb (Er stand auf und davon wusste niemand — aufstehen; ging hin und zurück kam er nie): no expression. At the
            // clause start (Hin und wieder machte Onkel Vernon …) and before a finite verb at the end of a subordinate clause
            // (dass er ab und zu kommt — no verb before it) the expression stays.
            if (entry.type === "Ausdruck" && m.scope === "adjacent" && (() => {
              const after = flat.at(-1) + 1;
              // (a form that is also an infinitive or a participle — gehen ab und zu essen, haben … auf einmal verloren — is no proof of a new clause)
              if (!(after < tokens.length && clause[after] === clause[flat[0]] && !upper(tokens[after][0]) && finiteHere(after) &&
                !(verbAnalyses.get(keys[after]) || []).some(a => ["infinitive","participle"].includes(a.kind)))) return false;
              for (let k = flat[0] - 1; k >= 0 && clause[k] === clause[flat[0]]; k--) {
                const own = (verbAnalyses.get(keys[k]) || []).filter(a => ["finite","imperative"].includes(a.kind));
                if (!own.length || upper(tokens[k][0]) && k > 0 && !opening[k]) continue;
                return own.some(a => a.prefix && norm(a.prefix) === keys[flat[0]] ||
                  (separableBases.get(norm(a.base)) || []).some(row => norm(row.prefix) === keys[flat[0]] && !row.entry.derivedSeparable));
              }
              return false;
            })()) return;
            // E4 (links chat, 23.10.2026; check of expressions 015–019; the first, general version was dropped after the
            // independent review): `not_particle_at_end` — the clause of the expression's verb ends with one of these particles,
            // which make it another, separable verb (Wir sehen uns heute Fotos an — sich ansehen, not «увидимся»): no
            // expression. Only up to the next und / oder / aber / denn / sondern or another finite verb (Wir sehen uns morgen
            // und dann fängt der Kurs an — the expression stays).
            const particleAtEnd = list => {
              const listed = new Set([].concat(list).map(norm));
              let last = flat.at(-1);
              while (last + 1 < tokens.length && clause[last+1] === clause[flat[0]]) {
                const k = last + 1;
                if (CLAUSE_COORDINATORS.includes(keys[k]) || !upper(tokens[k][0]) && finiteHere(k)) return false;
                last = k;
              }
              // (review 24.10: an indefinite or negative noun phrase in between is what there is — Es gibt keinen Weg zurück,
              // Gibt es hier einen Weg heraus?; in the separable reading es is that object already)
              if (tokens.slice(flat.at(-1) + 1, last).some(t => /^k?ein(?:e|en|em|er|es)?$/u.test(norm(t[0])))) return false;
              return last > flat.at(-1) && listed.has(keys[last]) && !upper(tokens[last][0]);
            };
            if (m.not_particle_at_end && particleAtEnd(m.not_particle_at_end)) return;
            // E8 (links chat, 24.10.2026, user): `choice_particle_at_end` — a particle at the end that may be either reading
            // (Morgen gibt es frei «выходной» / Die Polizei gibt es frei — freigeben; Das Bild gibt es gut wieder — wiedergeben):
            // the expression is found but shown as a choice with the separable verb, not as the card.
            const choice = !!(m.choice_particle_at_end && particleAtEnd(m.choice_particle_at_end));
            const width = flat.at(-1) - flat[0], parts = chosen.filter(Boolean).length;
            // More recognised parts first (je … desto over a lone je + comparative), then the narrower one.
            if (!best || parts > best.parts || parts === best.parts && width < best.width) best = {entry, m, tokens:flat, width, parts, choice, afterFrame};
            return;
          }
          const part = m.parts[p];
          if (part.optional) search(p+1, prev, [...chosen, null]);
          for (const o of occ[p]) {
            if (prev && o[0] <= prev.at(-1)) continue;
            const first = chosen.find(Boolean);
            if (first && !inScope(first[0], o[0])) continue;
            if (m.separated && prev && clause[prev.at(-1)] === clause[o[0]]) continue;
            if (m.adjacent_clauses && prev && clause[o[0]] !== clause[prev.at(-1)] + 1) continue;
            search(p+1, o, [...chosen, o]);
            // A part after the first takes only its nearest occurrence (zwar … aver doch … doch: the second doch
            // is a particle, not the partner).
            if (prev) break;
          }
        };
        search(0, null, []);
      }
      const span = i => ({text:tokens[i][0],start:tokens[i].index,end:tokens[i].index + tokens[i][0].length});
      // E6 (links chat, 23.10.2026; user decision): in an expression record the word that satisfies `clause_has` is shown with it (geht … ein
      // und aus) — the nearest one in the clause of the pattern.
      if (best) {
        const shown = [...best.tokens];
        for (const part of best.m.parts) if (part.clause_has && best.entry.type === "Ausdruck") {
          const wanted = new Set([].concat(part.clause_has).map(norm));
          const near = tokens.map((t,k) => k).filter(k => clause[k] === clause[best.tokens[0]] && wanted.has(keys[k]) && !shown.includes(k))
            .sort((a,b) => Math.abs(a - best.tokens[0]) - Math.abs(b - best.tokens[0]))[0];
          if (near !== undefined) shown.push(near);
        }
        // G65 «was für ein» (user 24.10.2026: decision A, p. 1–5; then A / B after the second review). `split_choice` (parts apart:
        // was … für ein) and `adjacent_choice` (was für ein together) — the construction is sure, offered in a choice («für — для»
        // first) or dropped (für «для» only), by form:
        //  - the ein-form after für and the noun of its group: einem / einer / eines + noun, ein + masculine noun (an -er adjective
        //    between at most; own card, else the external gender) — not the Akkusativ für takes → sure (Was kriecht da für ein Käfer?);
        //    no noun after it (für eines der beiden, für einen von uns, ein paar Tage) → no case sign;
        //  - the main verb: the leftmost infinitive / participle of the verb group closing the clause (gekauft haben → kaufen, getan
        //    worden → tun, was du … getan hast → tun), else the first finite verb after was;
        //  - sein / werden / bleiben (a predicative in Nominativ): einen + noun (Akkusativ) → für «для» only (Was sind die Vorteile für
        //    einen Kunden?); ein + masculine → sure (Was ist dein Vater für ein Mensch?); otherwise sure only with das / es / dies (or
        //    nothing) between the verb and für and no predicative adjective in the clause (Was ist das für ein Ding? — sure; Was ist
        //    der Preis für ein Ticket?, Was ist für ein Kind gefährlich?, Was ist denn gut für ein Kind? — a choice);
        //  - haben → sure; any other verb → a choice (books and train: one to two places per verb — «для» first for all, p. 5);
        //  - together (adjacent_choice): sure at the start of a clause, after a preposition or a conjunction (Was für ein Tag!, Mit was
        //    für einem Auto, …, was für ein Auto er fährt); inside a clause sure only as an indirect question without the comma (a
        //    subject and a finite verb close the clause: Ich weiß nicht was für ein Auto er fährt) or by case; so was / noch was für
        //    → für «для» only (was = etwas); otherwise a choice (Hast du was für einen Kater?, Ich habe was für einen Freund gekauft).
        let choice = null;
        // split_bare_choice (user 24.10, next step): parts apart and no article after für — plural or uncountable (Was sind das für
        // Leute?, Was ist das für Wetter?, Was hörst du für Musik?): sure only with sein / werden / bleiben and das / es / dies (particles
        // allowed) between the verb and für, otherwise a choice; no noun after für — no construction.
        if (best.m.split_choice || best.m.adjacent_choice || best.m.split_bare_choice) {
          const bare = !!best.m.split_bare_choice;
          const first = best.tokens[0], c = clause[first];
          const furAt = best.tokens.find(k => keys[k] === "für"), einAt = bare ? furAt : furAt + 1;
          const own = k => forms.get(keys[k]) || [];
          const AUX_PARTICIPLE = {worden:"werden",geworden:"werden",gewesen:"sein"};
          const analyses = k => AUX_PARTICIPLE[keys[k]] ? [{kind:"participle",base:AUX_PARTICIPLE[keys[k]]}] : (verbAnalyses.get(keys[k]) || []);
          const lowerVerb = k => !upper(tokens[k][0]) && !own(k).some(e => e.type === "Adjektiv" || e.type === "Adverb") && analyses(k).length > 0;
          let last = -1; for (let k = first; k < tokens.length && clause[k] === c; k++) last = k;
          // the noun of the für group and its case sign
          let noun = -1;
          for (let k = einAt + 1; k <= last && k <= einAt + 3; k++) {
            if (upper(tokens[k][0])) { noun = k; break; }
            if (["der","die","das","des","dem","den","davon","von"].includes(keys[k])) break;
          }
          let caseSign = null;
          if (noun > 0) {
            const between = tokens.slice(einAt + 1, noun).map(t => norm(t[0]));
            if (["einem","einer","eines"].includes(keys[einAt])) caseSign = "not-akk";
            else if (keys[einAt] === "einen") caseSign = "akk";
            else if (keys[einAt] === "ein" && between.every(w => w.endsWith("er"))) {
              // only an unambiguous masculine: own cards all der without a note of another article (Joghurt «Также: das Joghurt»),
              // or, with no own card, the external dictionary with one gender only (not '?': several genders)
              const nouns = own(noun).filter(e => e.type === "Nomen");
              const ext = fallback.nounGender ? await fallback.nounGender(tokens[noun][0]).catch(() => null) : null;
              const other = new RegExp("\\b(?:das|die)\\s+" + String(tokens[noun][0]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}])", "u");
              const ownDer = nouns.length && nouns.every(e => e.article === "der" && !other.test(String(e.usage_note_ru || "") + " " + String(e.usage_note_en || "")));
              if (nouns.length ? ownDer : ext === "der") caseSign = "not-akk";
            }
          }
          // the main verb
          let main = null;
          // (inside the group a participle with an adjective card of its own counts too: geschickt hat, verlegt worden)
          // (a participle that is also an adjective or a 3rd person form counts: bezahlt, besorgt, reserviert, verhängt)
          { const group = []; for (let k = last; k > einAt && (lowerVerb(k) || !upper(tokens[k][0]) &&
              analyses(k).some(a => a.kind === "participle" || a.kind === "infinitive")); k--) group.unshift(k);
            const nf = group.find(k => analyses(k).some(a => a.kind === "infinitive" || a.kind === "participle"));
            const pick = nf !== undefined ? nf : group[0];
            if (pick !== undefined) main = analyses(pick).filter(a => nf === undefined || a.kind === "infinitive" || a.kind === "participle").map(a => norm(a.base));
            else for (let k = first + 1; k <= last; k++) if (clause[k] === c && !best.tokens.includes(k) && !(upper(tokens[k][0]) && !opening[k])) {
              const fin = (verbAnalyses.get(keys[k]) || []).filter(a => a.kind === "finite"); if (fin.length) { main = fin.map(a => norm(a.base)); break; } } }
          const copula = main && main.some(b => COPULAS.includes(b));
          const DET = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|(?:mein|dein|sein|ihr|unser|euer|eur|dies|jen|jed|kein)(?:e|en|em|er|es)?)$/u;
          // a predicative: an adjective (or am …sten) right before für with no das / es / dies between the verb and it (Was ist denn gut für
          // ein Kind? — not Was ist das eigentlich für ein Geräusch?), or after the noun group at the end of the clause (Was ist für ein Kind gefährlich?)
          const adjAt = k => !upper(tokens[k][0]) && own(k).some(e => e.type === "Adjektiv") || keys[k] === "am" && k + 1 <= last && /sten$/u.test(keys[k+1]);
          const predicative = () => {
            let k = furAt - 1; while (k > first && keys[k] === "am") k--;
            if (k > first && (adjAt(k) || /sten$/u.test(keys[k]) && keys[k-1] === "am")) {
              let pron = false; for (let j = first + 1; j < k; j++) if (WAS_FUER_PRONOUNS.includes(keys[j])) pron = true;
              if (!pron) return true;
            }
            if (noun > 0) for (let j = noun + 1; j <= last; j++) if (adjAt(j)) return true;
            return false;
          };
          let verdict;
          if (bare) {
            // a number right after für (für zehn Euro, für zwei Typen) — a price or «что за двое»: a choice
            const NUM = /^(?:zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|vierzig|fünfzig|hundert|tausend|paar|dutzend|\d+)$/u;
            if (noun < 0) verdict = "drop";
            else if (/\d/u.test(gap(furAt + 1)) || NUM.test(keys[furAt + 1] || "")) verdict = "choice";
            else {
              let vAt = -1; for (let k = first + 1; k < furAt; k++) if (clause[k] === c && (verbAnalyses.get(keys[k]) || []).some(a => a.kind === "finite") && !upper(tokens[k][0])) { vAt = k; break; }
              const mid = vAt < 0 ? [] : tokens.slice(vAt + 1, furAt).map((t,i) => vAt + 1 + i);
              const pron = mid.some(k => WAS_FUER_PRONOUNS.includes(keys[k]));
              const other = mid.some(k => !WAS_FUER_PRONOUNS.includes(keys[k]) && (upper(tokens[k][0]) || DET.test(keys[k])));
              // agreement: the verb agrees with the noun (Was sind das für Kinder? — not Was ist das für Kinder? «что это для детей»):
              // a singular finite verb is sure only with a noun that is singular by its own card (Wetter, Geld, Zeug)
              const SG = /^(?:ist|war|wäre|sei|wird|wurde|würde|bleibt|blieb|kann|könnte|muss|müsste|soll|sollte|mag|möchte|darf|dürfte|will|wollte)$/u;
              // (a form equal in singular and plural counts as singular only when not masculine — Wetter, Essen; a masculine one is a count
              // noun used bare only in the plural — Rentner, Lehrer)
              const nounSg = own(noun).some(e => e.type === "Nomen" && norm(e.word) === keys[noun] && e.plural_only !== true &&
                (norm(e.plural || "") !== keys[noun] || e.article !== "der"));
              const agree = vAt >= 0 && (!SG.test(keys[vAt]) || nounSg);
              // only adverbs and forms of the copula after the noun (Was sind das für Leute gewesen?) — not wie uns, a second noun group,
              // a relative clause (Was ist das für Kinder, die …? — a new clause anyway)
              let restOk = true;
              for (let k = noun + 1; k <= last; k++) if (!(own(k).some(e => e.type === "Adverb" || e.type === "adverb") ||
                analyses(k).some(a => COPULAS.includes(norm(a.base))))) { restOk = false; break; }
              verdict = copula && pron && !other && agree && restOk && !predicative() ? "sure" : "choice";
            }
          } else if (best.m.adjacent_choice) {
            const startOk = first === 0 || clause[first-1] !== c || opening[first] ||
              (forms.get(keys[first-1]) || []).some(e => e.type === "preposition" || e.type === "Konjunktion") ||
              ["und","aber","oder","doch","denn","sondern"].includes(keys[first-1]);
            // the clause after the für group has no subject of its own (Ich weiß, was für einen Hund gut ist; Was für einen Euro verkauft
            // wird, ist billig): was is the subject / object, für «для» is as likely — a choice; nothing after it (Was für ein Tag!) — sure
            const PRON = new Set(["ich","du","er","sie","es","wir","ihr","man","das","dies","dieses","jemand","niemand","alle","beide"]);
            const PREP = k => (forms.get(keys[k]) || []).some(e => e.type === "preposition");
            let rest = 0, subject = false;
            for (let k = (noun > 0 ? noun : einAt) + 1; k <= last; k++) {
              rest++;
              if (PRON.has(keys[k]) || DET.test(keys[k]) && k + 1 <= last && (upper(tokens[k+1][0]) || k + 2 <= last && upper(tokens[k+2][0])) ||
                upper(tokens[k][0]) && !PREP(k - 1) && !(k === noun + 1)) { subject = true; break; }
            }
            if (first > 0 && clause[first-1] === c && ["so","noch"].includes(keys[first-1])) verdict = "drop";
            else if (caseSign === "not-akk") verdict = "sure";
            else if (startOk) verdict = !rest || subject ? "sure" : "choice";
            else {
              // an indirect question without its comma: after the noun group a subject and a finite verb close the clause
              const fin = last > (noun > 0 ? noun : einAt) + 1 && !upper(tokens[last][0]) && (verbAnalyses.get(keys[last]) || []).some(a => a.kind === "finite");
              verdict = fin ? "sure" : "choice";
            }
          } else if (caseSign === "not-akk") verdict = "sure";
          // the ein-form used as a pronoun «один из» (für einen von uns, für eines der Zimmer, für einen davon) — no case sign: a choice
          else if (noun < 0 && (keys[einAt] === "einen" || ["von","davon","der","des","dem","den"].includes(keys[einAt+1] || ""))) verdict = "choice";
          else if (copula) {
            if (caseSign === "akk") verdict = "drop";
            else {
              let vAt = -1; for (let k = first + 1; k < furAt; k++) if (clause[k] === c && (verbAnalyses.get(keys[k]) || []).some(a => a.kind === "finite") && !upper(tokens[k][0])) { vAt = k; break; }
              // a noun group: a determiner with a capitalised noun after it before für (der Preis, deine Mutter — not das denn, das nur)
              let np = false;
              if (vAt >= 0) for (let k = vAt + 1; k < furAt && !np; k++) if (DET.test(keys[k]))
                for (let j = k + 1; j < furAt; j++) if (upper(tokens[j][0])) { np = true; break; }
              // a lowercase word closing the clause after the noun group that is no adverb of its own card — a participle or a
              // predicative the verb data does not know (Was wird für eine Strafe verhängt?): a choice
              const tail = noun > 0 && last > noun && !upper(tokens[last][0]) && (!own(last).length || own(last).some(e => e.type === "Adjektiv" || e.type === "Verb")) &&
                !analyses(last).some(a => COPULAS.includes(norm(a.base)));
              verdict = np || predicative() || tail ? "choice" : "sure";
            }
          } else if (main && main.some(b => b === "haben")) verdict = "sure";
          else verdict = "choice";
          // für after the closed verbal frame (before_frame_end): never sure — a choice, «für — для» first
          if (best.afterFrame && verdict === "sure") verdict = "choice";
          if (verdict === "drop") return null;
          if (verdict === "choice") choice = "preposition-first";
        }
        // (E8: best.choice — the expression or the separable verb of the same words; G65: «preposition-first»)
        return {entry:best.entry, id:"recorded-construction", spans:shown.sort((a,b) => a-b).map(span), ...(choice ? {choice} : best.choice ? {choice:true} : {})};
      }
      // B2: Komparativ + als in one part of the sentence (kleiner als, einen Kopf kleiner als, mehr Zeit als).
      if (keys[index] === "als" && index > 0) {
        const record = (lemmas.get("als") || []).find(e => e.type === "Konjunktion");
        for (let j = index - 1; record && j >= 0 && j >= index - 4 && clause[j] === clause[index]; j--) {
          if (["so","genauso","ebenso","sowohl","anders","nichts","niemand","kein","keine"].includes(keys[j])) break;
          // niemand mehr … als «никто, кроме» is not a comparison.
          if (await comparativeToken(tokens,j,same) && !(j > 0 && ["niemand","keiner","kein","keine","keinen","keinem"].includes(keys[j-1])))
            return {entry:record, id:"comparative-als", spans:[span(j), span(index)], translation:{ru:"здесь: чем", en:"here: than"}};
        }
      }
      return null;
    }
    // Reference 12.1 p. 3, C1 (user 18.10): an expression whose heading ends with a verb in the infinitive (sich auf den Weg
    // machen, nichts zu tun haben, auf etwas hinauswollen) is «Feste Wendung», other ready phrases (vor sich hin, es gibt)
    // «Ausdruck»; the tense only when established — from the expression's own verb in the text: Perfekt / Plusquamperfekt
    // with haben / sein and the participle among the parts, otherwise the one tense of its finite form (machte —
    // Präteritum); an infinitive (will … zu tun haben) or an unclear form gives no tense.
    // A weak Präteritum is also the Konjunktiv II form (machte): read as Präteritum, as a lone finite verb is.
    const oneTense = t => t.size === 1 ? [...t][0] : t.size === 2 && t.has("Präteritum") && t.has("Konjunktiv II") ? "Präteritum" : null;
    let ownVerbWords = null;
    function expressionGrammar(entry, spans, sentence = "") {
      const words = String(entry.word || "").trim().split(/\s+/u), last = norm(words.at(-1) || "");
      ownVerbWords ||= entries.filter(e => e.type === "Verb").map(e => norm(e.word).replace(/^sich\s+/u,"")).filter(w => !/\s/u.test(w));
      const base = ownVerbWords.includes(last) ? last : ownVerbWords.filter(w => w.length >= 4 && last.endsWith(w)).sort((a,b) => b.length - a.length)[0] || null;
      const fixed = !!base && /^\p{Ll}/u.test(words.at(-1) || "");
      // An Ausdruck with a finite verb in its heading (es gibt — geben) takes the same tense rules (hat es … gegeben — Perfekt).
      const headVerb = fixed ? base : (words.map(w => (verbAnalyses.get(norm(w)) || []).find(a => a.kind === "finite")).find(Boolean)?.base || null);
      const ofVerb = a => a.base === headVerb || (!!headVerb && headVerb.endsWith(a.base) && a.base.length >= 4);
      const partRows = (spans || []).map(span => verbAnalyses.get(norm(span.text)) || []);
      // The part of the sentence around the expression (up to punctuation): the auxiliary, the participle or werden may stand
      // outside the parts (hat sich auf den Weg gemacht; hat damit nichts zu tun gehabt).
      const clause = [];
      if (sentence && spans?.length) {
        const tokens = sharedTokens(sentence,'expressionGrammar'), first = Math.min(...spans.map(x => x.start)), lastAt = Math.max(...spans.map(x => x.end));
        const gap = (a,b) => sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index);
        let from = tokens.findIndex(t => t.index >= first), to = tokens.findIndex(t => t.index >= lastAt); if (to < 0) to = tokens.length;
        if (from >= 0) {
          while (from > 0 && !/[,;:.!?»«„“"–—]/u.test(gap(from-1,from))) from--;
          while (to < tokens.length && !/[,;:.!?»«„“"–—]/u.test(gap(to-1,to))) to++;
          for (let i = from; i < to; i++) clause.push({i, rows:verbAnalyses.get(norm(tokens[i][0])) || []});
        }
      }
      let tense = null;
      if (headVerb) {
        const participle = clause.find(t => t.rows.some(a => a.kind === "participle" && ofVerb(a)));
        if (participle) {
          // The auxiliary nearest the participle (Er war müde und hat sich … gemacht — hat).
          const aux = clause.filter(t => t !== participle && t.rows.some(a => a.kind === "finite" && PERFECT_AUXILIARIES.includes(a.base)))
            .sort((a,b) => Math.abs(a.i - participle.i) - Math.abs(b.i - participle.i))[0];
          const t = aux ? new Set(aux.rows.filter(a => a.kind === "finite" && PERFECT_AUXILIARIES.includes(a.base)).map(a => a.tense)) : new Set();
          // hätte / wäre … gegeben: the past subjunctive is shown as its mood (as the verb card does).
          tense = t.size === 1 && t.has("Präsens") ? "Perfekt" : oneTense(t) === "Präteritum" ? "Plusquamperfekt" : t.size === 1 && t.has("Konjunktiv II") ? "Konjunktiv II" : null;
        } else if (clause.some(t => t.rows.some(a => a.kind === "finite" && a.base === "werden" && a.tense === "Präsens")) &&
          partRows.some(r => r.some(a => a.kind === "infinitive" && ofVerb(a))) &&
          !clause.some(t => t.rows.some(a => a.kind === "finite" && modalLemmas.has(a.base)))) {
          tense = "Futur I";   // er wird sich auf den Weg machen
        } else {
          tense = oneTense(new Set(partRows.flatMap(r => r.filter(a => a.kind === "finite" && ofVerb(a)).map(a => a.tense))));
        }
      }
      // No verb in the heading (vor sich hin, im Hinblick auf): no tense.
      return {posLabel: fixed ? "Feste Wendung" : "Ausdruck", expressionTense: tense && tense !== "Präsens" ? tense : null};
    }
    async function applyConstruction(word, context, resolution) {
      let found = null, contracted = null;
      try { found = await constructionAt(word, context); } catch (_) { return resolution; }
      // 23.10.2026 (user; check Expr_002_013 p. 1): a contracted X's / X’s (gibt's, gab’s, Gibt’s; hat's … gegeben) is read as
      // «X es» for the expression search (es gibt) — every contraction of the sentence, whichever word is tapped; the
      // contracted word stays one highlighted word, as other contracted forms.
      if (!found && Number.isInteger(context?.tokenOffset)) {
        const sentence = String(context.sentence || "");
        const rx = /(?<![\p{L}])([\p{L}]+)['’]s(?![\p{L}])/gu, joins = [];
        let expanded = "", last = 0;
        for (const m of sentence.matchAll(rx)) {
          expanded += sentence.slice(last, m.index);
          joins.push({orig:m.index, word:m[0], at:expanded.length, half:m[1].length, end:expanded.length + m[1].length + 3});
          expanded += m[1] + " es"; last = m.index + m[0].length;
        }
        expanded += sentence.slice(last);
        // original offset → expanded offset (and back)
        const toExp = o => { let d = 0; for (const j of joins) if (o >= j.orig + j.word.length) d++; return o + d; };
        const fromExp = o => { let d = 0; for (const j of joins) if (o >= j.end) d++; return o - d; };
        const tapped = joins.find(j => j.orig === context.tokenOffset);
        if (joins.length) {
          const tapWord = tapped ? tapped.word.slice(0, tapped.half) : word;
          try { found = await constructionAt(tapWord, {...context, sentence:expanded, tokenOffset:toExp(context.tokenOffset)}); } catch (_) { found = null; }
          // Only an expression that keeps a contracted word whole: both its halves inside, or none of them.
          const whole = j => found.spans.some(x => x.start === j.at) === found.spans.some(x => x.start === j.at + j.half + 1);
          if (found && joins.every(whole) && joins.some(j => found.spans.some(x => x.start === j.at))) {
            contracted = {grammarSpans:found.spans, sentence:expanded};
            const spans = [];
            for (const x of found.spans) {
              const j = joins.find(j => x.start === j.at || x.start === j.at + j.half + 1);
              if (j) { if (x.start === j.at) spans.push({text:j.word, start:j.orig, end:j.orig + j.word.length}); }
              else spans.push({...x, start:fromExp(x.start), end:fromExp(x.end)});
            }
            found = {...found, spans};
          } else found = null;
        }
      }
      // A contraction split by the tokenizer (wird ' s) and found directly by a card block of its own: one span for the word.
      if (found && !contracted) {
        const sentence = String(context?.sentence || ""), spans = [];
        for (const x of found.spans) {
          const prev = spans.at(-1);
          if (prev && norm(x.text) === "s" && /^['’]$/u.test(sentence.slice(prev.end, x.start))) { spans[spans.length-1] = {...prev, text:sentence.slice(prev.start, x.end), end:x.end}; continue; }
          spans.push(x);
        }
        found = {...found, spans};
      }
      // E8: the particle of the separable verb tapped (Morgen gibt es frei — frei): the expression of its verb decides the choice too.
      if (!found && resolution?.selected?.construction?.id === "separable-verb" && Number.isInteger(context?.tokenOffset)) {
        const verb = (resolution.selected.construction.spans || []).find(x => x.start !== context.tokenOffset);
        // The verb read as if tapped (a contraction too: Gibt's morgen frei?), once.
        if (verb && !context.particleOf) {
          let other = null;
          try { other = await applyConstruction(verb.text, {...context, tokenOffset:verb.start, particleOf:true}, resolution); } catch (_) { other = null; }
          if (other && other !== resolution && other.status === "ambiguous" && other.evidence === "expression-or-separable-verb") return other;
        }
      }
      if (!found) return resolution;
      const candidate = {...mainCandidate(found.entry), ...(found.translation ? {translation:found.translation} : {}),
        construction:{id:found.id, label:found.entry.word, spans:found.spans}};
      if (found.entry.type === "Ausdruck") Object.assign(candidate, contracted ? expressionGrammar(found.entry, contracted.grammarSpans, contracted.sentence)
        : expressionGrammar(found.entry, found.spans, String(context?.sentence || "")));
      const rest = (resolution.candidates || []).filter(c => c.dictionaryId !== found.entry.id);
      // G65: a construction the form does not make sure (split_choice / adjacent_choice) is offered in a choice, the word's own reading first.
      if (found.choice === "preposition-first" && rest.length)
        return {...resolution, preferred:rest[0], selected:null, status:"ambiguous", candidates:[...rest.slice(0,1), candidate, ...rest.slice(1)]};
      const candidates = [candidate, ...rest];
      if (found.choice === true) {
        // Both readings in the window: the expression and the separable verb of the same words (not a bare geben).
        // (a contracted verb shows the verb in the window, not «Gibt's = Gibt + es»)
        const verbs = (resolution.candidates || []).filter(c => c.construction?.id === "separable-verb").map(({contraction, ...c}) => c);
        if (verbs.length) return {...resolution, preferred:null, selected:null, status:"ambiguous", evidence:"expression-or-separable-verb",
          candidates:[candidate, ...verbs]};
      }
      return {...resolution, preferred:candidate, selected:candidate, status:"resolved", candidates};
    }
    // G47 = reference C4 (approved 17.10 / 18.10; 3.22; user 23.10), part 1 — a joined form whose full verb is in no
    // dictionary (heraustropfte, hinabrutschen, hinabfiel): the directional particle is cut off, the rest must be a form of a
    // known verb (tropfte — tropfen). The card shows the parts, as G48 (user 23.10): «heraustropfen = heraus + tropfen»,
    // «heraus — наружу (сюда)» · «tropfen — капать; …», Verb · <tense>; the verb's meaning in the sentence is not guessed
    // (rutschen «буксовать», sausen «шуметь»). Only when nothing else was found for the word.
    // nach is not in the table: nach- verbs mostly mean «ещё раз / дополнительно» (nachschenken, nachzählen).
    const DIRECTIONAL = [["hinauf","наверх (туда)","up (away)"],["herauf","наверх (сюда)","up (towards)"],["hinunter","вниз (туда)","down (away)"],
      ["herunter","вниз (сюда)","down (towards)"],["hinab","вниз (туда)","down (away)"],["herab","вниз (сюда)","down (towards)"],
      ["hinein","внутрь (туда)","in (away)"],["herein","внутрь (сюда)","in (towards)"],["hinaus","наружу (туда)","out (away)"],
      ["heraus","наружу (сюда)","out (towards)"],["hinüber","на ту сторону","over, across"],["herüber","на эту сторону","over, across"],
      ["herum","вокруг; туда-сюда","around"],["umher","вокруг; туда-сюда","around"],["zurück","назад, обратно","back"],
      ["fort","прочь","away"],["weg","прочь","away"],["davon","прочь","away"],["voran","вперёд","ahead, forward"],["voraus","вперёд","ahead, forward"],
      ["vorwärts","вперёд","ahead, forward"],["empor","вверх","up(wards)"],["entlang","вдоль","along"]]
      .sort((a,b) => b[0].length - a[0].length);
    // The perfect / zu chain of the simple verb was found in the sentence with the particle cut off: its spans move back.
    function directionalSpans(construction, at, from, to) {
      if (!construction?.spans) return construction;
      const delta = to.length - from.length;
      return {...construction, spans:construction.spans.map(span => span.start === at ? {...span, text:to, end:at + to.length}
        : span.start > at ? {...span, start:span.start + delta, end:span.end + delta} : span)};
    }
    const DIRECTIONAL_CHAINS = new Set(["perfect-group","modal-group","lassen-infinitive","werden-passive","werden-future","modal-perfect-infinitive"]);
    function directionalOwnForm(entry, form) {
      const forms = new Set([entry.infinitive, entry.word].filter(Boolean).map(norm));
      const walk = v => { if (typeof v === "string") v.split(/[\s,/]+/u).forEach(x => x && forms.add(norm(x))); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
      let rows = entry.forms;
      if (typeof rows === "string") { try { rows = JSON.parse(rows.replace(/'/gu, '"')); } catch (_) { rows = null; } }
      walk(rows); walk(entry.lookup_forms); walk(entry.perfect_form);
      return forms.has(norm(form));
    }
    async function directionalParticle(word, context, result) {
      if (!result || (result.candidates || []).length || result.selected || !/^\p{Ll}/u.test(String(word)) || !Number.isInteger(context?.tokenOffset)) return result;
      const w = String(word), sentence = String(context.sentence || "");
      if (w !== norm(w) || sentence.slice(context.tokenOffset, context.tokenOffset + w.length) !== w) return result;
      const row = DIRECTIONAL.find(([p]) => w.startsWith(p) && w.length >= p.length + 3);
      if (!row) return result;
      const [particle, ru, en] = row, after = w.slice(particle.length);
      // hinunterzustoßen is stoßen, not zustoßen «случаться»: the form without zu comes first, and a zu- verb is not taken.
      for (const rest of [/^zu/u.test(after) ? after.slice(2) : null, after].filter(Boolean)) {
        const shifted = sentence.slice(0, context.tokenOffset) + rest + sentence.slice(context.tokenOffset + w.length);
        let inner = null;
        try { inner = await resolveWithDiagnostics(rest, {...context, sentence:shifted}); } catch (_) { inner = null; }
        const plain = c => norm(c.lemma).replace(/^sich\s+/u, "");
        // The verb chains of the simple verb carry over with their spans (könnte hineingucken «Modal mit hineingucken», ließ sie
        // hineinschauen, wurde hereingetragen, wird herausträufeln); a reflexive one does not (sich hinabbeugen: no card).
        const chain = c => !c.construction || DIRECTIONAL_CHAINS.has(c.construction.id);
        const verbs = (inner?.candidates || []).filter(c => canonicalPos(c.pos) === "Verb" && chain(c));
        // hinunterzustoßen: stoßen (two own cards — no card), never zustoßen «случаться» — a verb found without zu ends the search.
        const zuFound = rest !== after && (inner?.candidates || []).some(c => canonicalPos(c.pos) === "Verb");
        let chosen;
        if (/^ge/u.test(rest) && (verbAnalyses.get(rest) || []).some(a => a.kind === "participle" && a.base !== rest)) {
          // A participle (herabgefallen — ge-fallen): only the verb whose Partizip II it is (fallen, not gefallen «нравиться»).
          const rows = (verbAnalyses.get(rest) || []).filter(a => a.kind === "participle" && a.base !== rest);
          const bases = new Set(rows.map(a => a.base));
          if (bases.size !== 1) { if (zuFound) return result; continue; }
          const [base] = bases, ofBase = verbs.filter(c => plain(c) === base);
          chosen = ofBase.find(c => c.construction) || ofBase[0] || (rows[0]?.entry ? mainCandidate(rows[0].entry) : null);
        } else {
          // Two cards of one verb (treten «ступать» / «пинать») are both shown below; two different verbs are not guessed.
          chosen = inner?.selected && verbs.includes(inner.selected) ? inner.selected : new Set(verbs.map(plain)).size === 1 ? verbs.find(c => c.construction) || verbs[0] : null;
        }
        // A participle used as an adjective (emporhastend) is not taken (its card is the participle's own).
        if (!chosen || chosen.usage) { if (zuFound) return result; continue; }
        // weg sein, zurück sein, herum sein «кончиться» are two words (no verb *wegsein); zurückmusste — a modal: no card.
        if (/^(?:sein|haben|werden|können|müssen|dürfen|sollen|wollen|mögen|möchten)$/u.test(plain(chosen))) return result;
        // Another construction of the rest (sich hinabbeugen: reflexive, wollte hinausrennen: modal) is not carried over: no card.
        if ((inner?.candidates || []).some(c => !chain(c))) return result;
        // The own cards of the verb that list this form (an own card names its forms: geschleift is weak schleifen «тащить»,
        // not the card's strong schleifen «шлифовать», schliff / geschliffen — no card). Two cards of the verb (ziehen
        // «тянуть» / «переезжать», treten, stoßen) are both shown as parts, a line each (user 23.10): nothing is chosen.
        // A reflexive card (sich stoßen «удариться») is not one of them: a reflexive sentence gives no card above.
        const own = entries.filter(e => e.type === "Verb" && norm(e.word) === plain(chosen));
        let cards = [chosen];
        if (own.length) {
          const listing = own.filter(e => directionalOwnForm(e, rest));
          if (!listing.length) return result;
          // The auxiliary of the Perfekt narrows them when the cards name it (ist hinübergezogen — ziehen «переезжать», sein).
          const aux = chosen.construction?.id === "perfect-group" && chosen.construction.spans?.length === 2 ? (chosen.construction.spans || []).map(span => norm(span.text)).find(t => t !== rest) : null;
          const auxVerb = !aux ? null : SEIN_FINITE_WORD.test(aux) ? "sein"
            : HABEN_FINITE_WORD.test(aux) ? "haben" : null;
          const byAux = auxVerb ? listing.filter(e => new RegExp(`^${auxVerb}\\b`, "u").test(String(e.perfect_form || e.auxiliary || ""))) : [];
          cards = (byAux.length ? byAux : listing).map(e => chosen.source === "main" && chosen.dictionaryId === e.id ? chosen : mainCandidate(e));
          if (!cards.includes(chosen)) chosen = {...cards[0], ...(chosen.construction ? {construction:chosen.construction} : {}), ...(chosen.formFeatures ? {formFeatures:chosen.formFeatures} : {})};
        }
        // The full verb is in a dictionary (herabfallen, forttragen) but this form of it is not: the full verb's card is the
        // answer, with the tense found for the simple verb; two cards of it are not guessed.
        const whole = particle + plain(chosen);
        let full = null;
        try { full = await resolveWithDiagnostics(whole, {sentence:whole, tokenOffset:0}); } catch (_) { full = null; }
        // Two own cards of the simple verb (treten «ступать» / «пинать»): an external full verb (hinaustreten «выходить») may be
        // the other one (hat den Ball hinausgetreten «выбить»): the parts, with the cards of this form (review 23.10).
        const fulls = own.length > 1 ? [] : (full?.candidates || []).filter(c => plain(c) === whole && canonicalPos(c.pos) === "Verb" && !c.construction);
        if (new Set(fulls.map(c => window.BibliothekVocabulary.identity(c))).size > 1) return result;
        const construction = directionalSpans(chosen.construction, context.tokenOffset, rest, w);
        const bare = c => { const v = {...c}; delete v.construction; delete v.formFeatures; return v; };
        const verbList = cards.map(bare), verb = verbList[0];
        const formation = {kind:"particle-verb", particle:{form:particle, ru, en}, verb, verbs:verbList, lemma:whole, pos:"Verb"};
        // The meaning stored with a saved word (Wortschatz): the parts with their meanings, as on the card (G48).
        const translation = {en:window.BibliothekMeaningDisplay?.formationText?.(formation,"en") || "", ru:window.BibliothekMeaningDisplay?.formationText?.(formation,"ru") || ""};
        const simple = {source:"fallback", lemma:whole, pos:"verb", posLabel:"Verb", translation, formation,
          item:{word:whole, type:"Verb", translation_en:translation.en, translation_ru:translation.ru},
          ...(chosen.formFeatures ? {formFeatures:chosen.formFeatures} : {}), ...(construction ? {construction:{...construction, lemma:whole}} : {})};
        // English Wortschatz of an external full verb without an English meaning (herabfallen): the parts' text. A record whose
        // only meaning is a set phrase with the verb (hinabstoßen: «im Gleitflug hinabstoßen — снижаться на бреющем полёте»)
        // has no meaning of the verb itself: the parts too (review 23.10).
        const phraseOnly = text => { const parts = String(text || "").split(/;\s*/u).filter(Boolean);
          return parts.length > 0 && parts.every(part => / — /u.test(part) && norm(part.split(" — ")[0]).split(/\s+/u).includes(whole)); };
        const meaningOf = (f, l) => phraseOnly(f.translation?.[l]) ? "" : f.translation?.[l] || "";
        const filled = f => ({...f, translation:{en:meaningOf(f, "en") || translation.en, ru:meaningOf(f, "ru") || translation.ru}, directionalPhrase:{en:phraseOnly(f.translation?.en), ru:phraseOnly(f.translation?.ru)}});
        const candidate = fulls.length
          ? {...filled(fulls[0]), ...(chosen.formFeatures ? {formFeatures:chosen.formFeatures} : {}),
             ...(construction ? {construction:{...construction, lemma:fulls[0].lemma}} : {}), directionalSimple:simple, directionalFull:fulls[0]}
          : simple;
        return {...result, candidates:[candidate], preferred:candidate, selected:candidate, status:"resolved", unresolvedMeanings:[], evidence:"directional-particle"};
      }
      return result;
    }
    // E7 (24.10.2026, user; reference C8): a word cut off by a hyphen before a conjunction (Gold- und Silbermünzen, Leibes- und
    // Lebensstrafe, Gesichts-, Kiefer- und Pharynxmuskulatur, E-Mail- und Telefonkontakt, hin- und herbewegter) is the whole word
    // with the end of the last word: the stub replaces the first part of that word, tried from a short first part to a long one;
    // the first whole word known to a dictionary or to the word-formation analysis (G48) is taken (Ein- und Ausfuhrbestimmungen →
    // Einfuhrbestimmungen, not Ein + bestimmungen). The first part must be a word part itself (Silber, Lebens, Aus, her). The tap
    // is then read as that word in the sentence (links, tense); the highlight is the stub and the word that gave the end.
    // Not with a spaced hyphen (Gold - und) or none after it (Gold-und).
    const ELLIPSIS = /^[-‐‑]((?:,[ \t]+[\p{L}]+(?:[-‐‑][\p{L}]+)*[-‐‑])*)[ \t]+(?:und|oder|sowie|bzw\.|beziehungsweise|als[ \t]+auch|wie|noch|bis)[ \t]+([\p{L}]+)(?![-‐‑\p{L}])/u;
    const ELLIPSIS_LINKS = ["", "s", "es", "n", "en", "e", "er", "ens"];
    async function hyphenEllipsis(word, context) {
      const sentence = String(context?.sentence || ""), off = context?.tokenOffset, spelling = String(word || "");
      if (!Number.isInteger(off) || !/^[\p{L}]+$/u.test(spelling) || sentence.slice(off, off + spelling.length) !== spelling) return null;
      // The stub with its inner hyphens (E-Mail-): from the first part to the last one.
      let start = off, end = off + spelling.length;
      for (let m; (m = /([\p{L}]+)[-‐‑]$/u.exec(sentence.slice(0, start))); ) start = m.index;
      for (let m; (m = /^[-‐‑]([\p{L}]+)(?=[-‐‑])/u.exec(sentence.slice(end))); ) end += m[0].length;
      if (/[\p{L}\p{N}]$/u.test(sentence.slice(0, start))) return null;
      const m = ELLIPSIS.exec(sentence.slice(end));
      if (!m || !fallback?.wordParts) return null;
      const stub = sentence.slice(start, end), next = m[2], capital = /^\p{Lu}/u.test(next);
      const nextStart = end + m[0].length - next.length;
      // A capital stub before a small word only at the start of a sentence (Hin- und herbewegt); a small stub before a capital word never.
      if (/^\p{Lu}/u.test(stub) !== capital && !(capital === false && clauseInitial(sentence, start))) return null;
      try { wordFormationParts = await fallback.wordParts(); } catch (_) { return null; }
      wordFormationDict ||= wordFormationDictionary();
      wordFormationCore ||= createWordFormation(wordFormationDict);
      const n = norm(next);
      const word_ = async x => lemmas.has(x) || forms.has(x) || verbAnalyses.has(x) || (await wordFormationDict.readings(x)).length > 0;
      // A first part: a word, or a headword with a linking letter (Lebens = Leben + s; not «lebens» + s).
      const lemma_ = async x => lemmas.has(x) || (await wordFormationDict.readings(x)).some(r => !r.form);
      const known = async h => WORD_FORMATION_PARTICLES.has(h) || await word_(h) ||
        (await Promise.all(ELLIPSIS_LINKS.filter(l => l && h.endsWith(l) && h.length - l.length >= 2).map(l => lemma_(h.slice(0, h.length - l.length))))).some(Boolean);
      // A rest of the same kind as the next word: a noun for a capital word (Strafe, not the verb form trafe); a verb or adjective
      // form for a small word, also without its ending (her|bewegter: bewegt).
      const kind = async x => capital ? (await wordFormationDict.readings(x)).some(r => r.pos === "Nomen")
        : verbAnalyses.has(x) || (await wordFormationDict.readings(x)).some(r => r.pos === "Verb" || r.pos === "Adjektiv");
      const knownRest = async t => await kind(t) || !capital && await (async () => { for (const e of ["e","en","er","es","em"]) if (t.endsWith(e) && t.length - e.length >= 3 && await kind(t.slice(0, -e.length))) return true; return false; })();
      const nextEnd = nextStart + next.length;
      // The whole word stands where the coordinated group stood, the stubs before it too (Das Licht wurde ein-, aus- und
      // umgeschaltet → Das Licht wurde ausgeschaltet; ist ein- und ausgeschaltet worden → ist eingeschaltet worden): the chain is its own.
      const before = /(?:[\p{L}]+(?:[-‐‑][\p{L}]+)*[-‐‑],[ \t]+)+$/u.exec(sentence.slice(0, start));
      const groupStart = before ? before.index : start;
      const variant = tail => {
        const full = stub.includes("-") ? `${stub}-${capital ? capitalise(tail) : tail}` : stub + tail;
        const expanded = sentence.slice(0, groupStart) + full + sentence.slice(nextEnd);
        return {word:full, stub, cut:spelling, at:off, start, end, fullAt:groupStart, delta:groupStart + full.length - nextEnd, next, nextStart,
          context:{...context, sentence:expanded, tokenOffset:groupStart}};
      };
      // 1. A cut between two known parts of the next word, from the longest first part (review 24.10: Fahrrad|fahrer → Autofahrer, not
      // Fahr|radfahrer; Eisenbahn|brücke → Straßenbrücke; Frühjahrs|mode → Herbstmode); after a particle the rest need not be a word
      // (Aus|fuhrbestimmungen → Einfuhrbestimmungen). 2. Small words (adjectives, verbs) whose rest no dictionary lists as a word
      // (viel|zelligen): from the short first part, as the reference says (C8).
      const variants = [], seen = new Set(), add = t => { if (!seen.has(t)) { seen.add(t); variants.push(variant(t)); } };
      for (let k = n.length - 3; k >= 2; k--) {
        const head = n.slice(0, k), tail = n.slice(k);
        if (WORD_FORMATION_PARTICLES.has(head) ? true : await known(head) && await knownRest(tail)) add(tail);
      }
      if (!capital) for (let k = 2; k <= n.length - 3; k++) if (await known(n.slice(0, k))) add(n.slice(k));
      // «Part of a word» only when the next word is a particle and a known rest (ab|transportiert, her|bewegter), not after
      // any word that follows the conjunction (sah ihn an- und lächelte; hin- und zurück).
      let fragment = false;
      if (!stub.includes("-") && ((lemmas.get(norm(stub)) || []).some(e => !WORD_FORMATION_POS.has(e.type)) || WORD_FORMATION_PARTICLES.has(norm(stub))))
        // The next word itself a function word (hin- und zurück, an- und wieder) is no such word.
        if (!(lemmas.get(n) || []).some(e => !WORD_FORMATION_POS.has(e.type)))
        for (let k = 2; k <= n.length - 3 && !fragment; k++) if (!capital && WORD_FORMATION_PARTICLES.has(n.slice(0, k)) && await knownRest(n.slice(k))) fragment = true;
      if (variants.length || fragment) return {variants, fragment:fragment ? {partOnly:true, stub, start, next, nextStart, at:off, cut:spelling} : null};
      return null;
    }
    // Offsets of the expanded sentence back to the text: the whole word is the stub (each of its parts: E, Mail), the rest moves
    // back; the word that gave the end is highlighted with it. The line under the meaning (reference C8): «Gold- = Goldmünzen:
    // конец слова взят из Silbermünzen».
    function stubSpans(e) {
      const spans = [];
      for (const m of e.stub.matchAll(/[\p{L}]+/gu)) spans.push({text:m[0], start:e.start + m.index, end:e.start + m.index + m[0].length});
      return spans;
    }
    function ellipsisResult(result, e) {
      if (e.partOnly) {
        const text = {ru:`часть слова: ${e.stub}… — конец как в ${e.next}`, en:`part of a word: ${e.stub}… — ending as in ${e.next}`};
        const candidate = {source:"main", lemma:`${e.stub}-`, pos:"fragment", posLabel:"", translation:text, item:null, wordFragment:true,
          compound:{form:e.stub, part:e.cut, spans:[...stubSpans(e),
            {text:e.next, start:e.nextStart, end:e.nextStart + e.next.length}]}};
        return {candidates:[candidate], preferred:candidate, selected:candidate, status:"resolved", unresolvedMeanings:[], evidence:"hyphen-ellipsis",
          ellipsis:{stub:e.stub, next:e.next, partOnly:true}};
      }
      if (!result || result.status === "unresolved" || !result.selected) return null;
      const own = stubSpans(e), nextSpan = {text:e.next, start:e.nextStart, end:e.nextStart + e.next.length};
      const seen = new Map();
      const shift = x => {
        if (x.start === e.fullAt) return own;
        if (x.start > e.fullAt) return [{...x, start:x.start - e.delta, end:x.end - e.delta}];
        return [x];
      };
      const isSpan = x => x && typeof x === "object" && !Array.isArray(x) && Number.isInteger(x.start) && Number.isInteger(x.end) && typeof x.text === "string";
      // One mapped copy for each object (the same span list stands in the selected candidate and in the candidate list).
      const map = v => {
        if (!v || typeof v !== "object") return v;
        if (seen.has(v)) return seen.get(v);
        if (Array.isArray(v)) { const out = []; seen.set(v, out); for (const x of v) out.push(...(isSpan(x) ? shift(x) : [map(x)])); return out; }
        if (Object.getPrototypeOf(v) !== Object.prototype) return v;
        const out = {}; seen.set(v, out);
        for (const [k, x] of Object.entries(v)) out[k] = k === "entry" || k === "item" ? x : map(x);
        if (isSpan(out)) Object.assign(out, out.start === e.fullAt ? own.find(p => p.start === e.at) || own[0] : shift(out)[0]);
        return out;
      };
      const mapped = map(result);
      const mark = c => {
        if (!c) return c;
        const k = c.construction;
        if (k?.spans?.length) return {...c, construction:{...k, spans:[...k.spans.filter(x => !own.some(p => p.start === x.start)), ...own, nextSpan].sort((a, b) => a.start - b.start)}};
        return {...c, compound:{form:e.word, part:e.cut, spans:[...own, nextSpan]}};
      };
      const selected = mark(mapped.selected);
      return {...mapped, selected, preferred:mapped.preferred === mapped.selected ? selected : mapped.preferred,
        candidates:(mapped.candidates || []).map(c => c === mapped.selected ? selected : c),
        ellipsis:{stub:e.stub, word:e.word, next:e.next}};
    }
    // L55 (links chat, 24.10.2026; second resolver chat G59): the named «become» adjectives of L26 (bekannt) next to a finite
    // werden / sein of their clause — werden is «становиться» there (Im März 2010 wurde bekannt, dass …; Als es nun bekannt ward, daß …) —
    // are the adjective on their own tap too, not the choice with the participle of their verb (bekennen).
    const BECOME_ADJECTIVES = new Set(["bekannt"]);
    function becomeAdjective(word, context, result) {
      if (!result || result.status !== "ambiguous" || result.selected || !BECOME_ADJECTIVES.has(norm(word)) || !Number.isInteger(context?.tokenOffset)) return result;
      const adjective = (result.candidates || []).find(c => c.source === "main" && c.item && ["Adjektiv","Adverb"].includes(c.item.type) && norm(c.item.word) === norm(word));
      if (!adjective || !(result.candidates || []).some(c => norm(c.lemma).replace(/^sich\s+/u, "") === norm(adjective.item.participle_of || ""))) return result;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence, "becomeAdjective"), at = clickedTokenIndex(tokens, context.tokenOffset, word);
      if (at < 0) return result;
      const gap = (a, b) => sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index);
      let begin = at, end = at;
      while (begin > 0 && !/[,;:.!?»«„“"()–—]/u.test(gap(begin - 1, begin))) begin--;
      while (end + 1 < tokens.length && !/[,;:.!?»«„“"()–—]/u.test(gap(end, end + 1))) end++;
      const clause = tokens.slice(begin, end + 1).map(t => norm(t[0]));
      // A passive or perfect of werden (bekannt gegeben worden, bekannt geworden) is not this case.
      if (clause.some(w => w === "worden" || w === "geworden")) return result;
      // (finite sein too: nichts bekannt war — a state of bekennen makes no sense there either)
      if (!clause.some(w => (verbAnalyses.get(w) || []).some(a => PREDICATIVE_SEIN_WERDEN.includes(a.base) && a.kind === "finite"))) return result;
      return {...result, selected:adjective, preferred:adjective, status:"resolved", evidence:"become-adjective"};
    }
    // L52 (user 24.10.2026): a choice window whose clause has a reflexive pronoun shows the reflexive readings first
    // (Er traute sich zu waschen: sich trauen before trauen) — only the order of the window, nothing is chosen.
    function reflexiveFirst(word, context, result) {
      if (!result || result.selected || !(result.candidates || []).length || !Number.isInteger(context?.tokenOffset)) return result;
      const reflexive = c => /^sich\s/u.test(norm(c.lemma || "")) || c.construction?.id === "reflexive-verb";
      if (!result.candidates.some(reflexive) || result.candidates.every(reflexive)) return result;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence, "reflexiveFirst"), at = clickedTokenIndex(tokens, context.tokenOffset, word);
      if (at < 0) return result;
      const gap = (a, b) => sentence.slice(tokens[a].index + tokens[a][0].length, tokens[b].index);
      let begin = at, end = at;
      while (begin > 0 && !/[,;:.!?»«„“"()–—]/u.test(gap(begin - 1, begin))) begin--;
      while (end + 1 < tokens.length && !/[,;:.!?»«„“"()–—]/u.test(gap(end, end + 1))) end++;
      if (!tokens.slice(begin, end + 1).some((t, i) => begin + i !== at && reflexivePronouns.has(norm(t[0])))) return result;
      return {...result, candidates:[...result.candidates.filter(reflexive), ...result.candidates.filter(c => !reflexive(c))]};
    }
    function resolve(word, context) {
      sourceActivation++;clearPartialSources();
      const sentence=String(context?.sentence || '');
      warmSentence(sentence,word);
      const shared=sentenceContext(sentence);
      const active=activeContexts.get(sentence) || {context:shared,references:0,views:new Map()};
      active.references++;activeContexts.set(sentence,active);
      const release=()=>{if(--active.references===0)activeContexts.delete(sentence);if(!activeContexts.size)clearPartialSources();};
      const pipeline=(w,c)=>resolveWithDiagnostics(w,c).then(result=>applyConstruction(w,c,result)).then(result=>temporalSense(w,c,result)).then(result=>directionalParticle(w,c,result)).then(result=>becomeAdjective(w,c,result)).then(result=>reflexiveFirst(w,c,result));
      // E7: the first variant of a hyphen stub whose whole word is known; else «part of a word» for a function word, else as before.
      const known=r=>r&&r.status!=='unresolved'&&r.selected;
      const ellipsis=async e=>{for(const v of e.variants){let r=null;try{r=await pipeline(v.word,v.context);}catch(_){r=null;}if(known(r)){const x=ellipsisResult(r,v);if(x)return x;}}
        return e.fragment?ellipsisResult(null,e.fragment):pipeline(word,context);};
      const pending=hyphenEllipsis(word,context).then(e=>e?ellipsis(e):pipeline(word,context));
      return pending.then(result=>{release();return result;},error=>{release();throw error;});
    }
    // G40 (21.10.2026): a pronominal adverb whose own card also has a temporal meaning (darauf «на это …; после этого,
    // потом», hierauf) shows that meaning first only with an explicit sign: a time word right before it (bald, gleich,
    // kurz, nicht lange, tags, am Morgen, ein paar Tage darauf) when no verb of the clause governs auf (seit Jahren
    // darauf wartet). The card is not changed.
    const TEMPORAL_PART = /^(?:после этого|затем|потом)/u;
    const TIME_WORD = /^(?:bald|gleich|kurz|wenig|alsbald|sogleich|tags)$/u;
    // A time noun counts after a count or an article (ein paar Tage darauf, am Morgen darauf), not after seit (seit Jahren darauf wartet).
    const TIME_NOUN = /^(?:tage|tagen|jahre|wochen|monate|stunden|minuten|augenblicke?|augenblick|morgen|abend|nacht|tag|woche|jahr)$/u;
    const TIME_COUNT = /^(?:am|ein|eine|einen|einem|paar|einige|wenige|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|\d+)$/u;
    function temporalSense(word, context, result) {
      const c = result?.selected;
      if (!c || c.source !== "main" || !c.item || canonicalPos(c.pos) !== "Adverb" || !context || !Number.isInteger(context.tokenOffset)) return result;
      if (!/^(?:da|hier)r?auf$/u.test(norm(word))) return result;
      const parts = String(c.item.translation_ru || "").split(/;\s*/u), index = parts.findIndex(part => TEMPORAL_PART.test(part.trim()));
      if (index <= 0) return result;
      const sentence = String(context.sentence || ""), tokens = sharedTokens(sentence,'temporalSense');
      const at = clickedTokenIndex(tokens,context.tokenOffset,word);
      if (at < 0) return result;
      const before = at > 0 ? norm(tokens[at-1][0]) : "", gap = at > 0 ? sentence.slice(tokens[at-1].index + tokens[at-1][0].length, tokens[at].index) : "";
      const prev2 = at > 1 ? norm(tokens[at-2][0]) : "";
      let end = at + 1; while (end < tokens.length && !/[,;:.!?]/u.test(sentence.slice(tokens[end-1].index + tokens[end-1][0].length, tokens[end].index))) end++;
      let begin = at; while (begin > 0 && !/[,;:.!?»«„“"]/u.test(sentence.slice(tokens[begin-1].index + tokens[begin-1][0].length, tokens[begin].index))) begin--;
      // A verb of the clause that governs auf (warten auf, bestehen auf) keeps «на это» (Darauf hatte er gewartet).
      // Finite forms of reflexive and separable verbs too (freue mich darauf, weist darauf hin), via the verb index.
      // 21.10.2026 (WN batch G39/G40, reviews): a time phrase that opens the clause (Bald darauf kam er, Und gleich darauf …,
      // Ein paar Tage darauf …) decides on its own; inside the clause the time word may modify the verb (Er wies kurz darauf
      // hin, Ich möchte kurz darauf eingehen), so any verb of the clause that governs auf keeps «на это».
      const aufCard = e => (e?.complements || []).some(x => /(?:^|[\s/])auf\b/u.test(String(x.pattern || "")));
      const clauseWords = new Set(tokens.slice(begin,end).map(t => norm(t[0])));
      const LEAD = /^(?:schon|erst|noch|auch|jedoch|zeit|kurze|im|und|oder|aber|doch|da|so|dann|nun|als|wie|denn|bald|gleich|kurz|wenig|alsbald|sogleich|tags|nicht|lange|am|ein|eine|einen|einem|paar|einige|wenige|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|\d+|tage|tagen|jahre|wochen|monate|stunden|minuten|augenblicke?|augenblick|morgen|abend|nacht|tag|woche|jahr)$/u;
      const opensTime = tokens.slice(begin,at).every(t => LEAD.test(norm(t[0])));
      // Verbs whose auf is a side meaning of the card (kam kurz darauf zurück, trank gleich darauf, gab kurz darauf auf;
      // review 21.10) do not take darauf from the time word; es kommt darauf an does.
      const WEAK = /^(?:kommen|zurückkommen|ankommen|geben|trinken|sparen|verwenden|rechnen|stoßen)$/u;
      const governing = e => aufCard(e) && !(WEAK.test(norm(e?.infinitive || e?.word || "").replace(/^sich\s+/u,"")) &&
        !(norm(e?.infinitive || e?.word || "") === "ankommen" && clauseWords.has("es")));
      const governsAuf = !opensTime && tokens.slice(begin,end).some((t,i) => begin+i !== at && (
        (forms.get(norm(t[0])) || []).some(e => e.type === "Verb" && governing(e)) ||
        (verbAnalyses.get(norm(t[0])) || []).some(a => governing(a.entry) && (!a.detached || clauseWords.has(norm(a.prefix || ""))))));
      // Only a time word right before darauf (reviews 21.10: a sentence-initial «Darauf + verb» is mostly «на это» —
      // Darauf kommt es an, Darauf bin ich stolz — and stays as the card has it). A time noun with a count only when it
      // opens the clause (Ein paar Tage darauf hub …, Am Morgen darauf …), not a duration (zehn Jahre darauf hingearbeitet).
      const countAt = at - 2 >= begin ? at - 2 : -1;
      const opensClause = countAt === begin || countAt === begin + 1 && TIME_COUNT.test(norm(tokens[begin][0]));
      const sign = at > 0 && !/[,;:.!?»«„“"()–—]/u.test(gap) && (TIME_WORD.test(before) || before === "lange" && prev2 === "nicht" ||
        TIME_NOUN.test(before) && TIME_COUNT.test(prev2) && opensClause);
      if (!sign || governsAuf) return result;
      const selected = {...c, senseFirst:index, senseEvidence:"temporal-sign"};
      return {...result, selected, preferred:result.preferred === c ? selected : result.preferred,
        candidates:(result.candidates || []).map(x => x === c ? selected : x)};
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
      const spelling = /^\p{Lu}/u.test(word) && /^\p{Ll}/u.test(target) ? target[0].toUpperCase()+target.slice(1) : target;
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
      // C21b: zu of «zu dritt / zu dreien» opens the card of the numeral after it.
      if (norm(word) === "zu" && Number.isInteger(context?.tokenOffset)) {
        const sentence = String(context.sentence || ""), m = /^[ \t]+([\p{L}\p{M}]+)/u.exec(sentence.slice(context.tokenOffset+word.length));
        const at = m ? context.tokenOffset + word.length + m[0].length - m[1].length : null;
        if (m && (forms.get(norm(m[1])) || []).some(e => e.type === "numeral" && collectiveFrame(m[1],{...context,tokenOffset:at},e)))
          return resolvePublic(m[1],{...context,tokenOffset:at});
      }
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
