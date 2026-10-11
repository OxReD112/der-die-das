/* Reader-only copy of the Pronomen reference. Exercise code remains independent. */
(() => {
  "use strict";
  const PERSONAL_ROWS=[
    ['ich','mich','mir','mein-'],['du','dich','dir','dein-'],['er','ihn','ihm','sein-'],
    ['sie','sie','ihr','ihr-'],['es','es','ihm','sein-'],['wir','uns','uns','unser-'],
    ['ihr','euch','euch','euer / eur-'],['sie','sie','ihnen','ihr-'],['Sie','Sie','Ihnen','Ihr-']
  ];
  const ENDINGS=[['Nom.','—','—','-e','-e'],['Akk.','-en','—','-e','-e'],['Dat.','-em','-em','-er','-en'],['Gen.','-es','-es','-er','-er']];
  const REFLEXIVE=[['ich','mich','mir'],['du','dich','dir'],['er/sie/es','sich','sich'],['wir','uns','uns'],['ihr','euch','euch'],['sie/Sie','sich','sich']];
  const excluded=item=>item?.wortschatz_excluded === true;
  const PERSONAL_GLOSSES={
    ich:['я','I'],mich:['меня','me'],mir:['мне','me'],meiner:['меня','me'],
    du:['ты','you'],dich:['тебя','you'],dir:['тебе','you'],deiner:['тебя','you'],
    er:['он','he'],ihn:['его','him'],ihm:['ему','him'],seiner:['его','him'],
    sie:['она / они / Вы','she / they / you'],es:['оно','it'],
    wir:['мы','we'],uns:['нас / нам','us'],unser:['нас','us'],
    ihr:['вы / ей','you / her'],euch:['вас / вам','you'],euer:['вас','you'],
    ihnen:['им / Вам','them / you'],ihrer:['её / их / Вас','her / them / you']
  };
  function isPronoun(candidate) {return candidate?.item?.type === 'Pronomen' || candidate?.item?.type === 'pronoun';}
  function meanings(item,form,lang) {
    const key=form.toLocaleLowerCase('de-DE'),ru=lang==='ru',id=Number(item.id?.split('-')[1]);
    if(id>=1&&id<=9)return (PERSONAL_GLOSSES[key] || [item.translation_ru,item.translation_en])[ru?0:1];
    if(id===10)return ru?'безличное «это»':'impersonal it';
    if(id>=11&&id<=18){
      const values={11:['мой','my'],12:['твой','your'],13:['его / свой','his / its / own'],14:['её','her'],15:['их','their'],16:['наш','our'],17:['ваш','your'],18:['Ваш','your']};
      return values[id][ru?0:1];
    }
    if(id===19){
      const reflex={mich:['себя','myself'],mir:['себе','myself'],dich:['себя','yourself'],dir:['себе','yourself'],uns:['себя / себе','ourselves'],euch:['себя / себе','yourselves'],sich:['себя / себе','oneself']};
      return (reflex[key] || reflex.sich)[ru?0:1];
    }
    const inflected={jemanden:['кого-то','someone'],jemandem:['кому-то','someone'],niemanden:['никого','nobody'],niemandem:['никому','nobody'],wen:['кого','whom'],wem:['кому','whom'],wessen:['чей / чья / чьё / чьи','whose']};
    if(inflected[key])return inflected[key][ru?0:1];
    return ru?item.translation_ru || item.translation_en:item.translation_en || item.translation_ru;
  }
  function brief(candidates,form,lang) {
    const values=candidates.flatMap(candidate=>String(meanings(candidate.item,form,lang) || '').split(/\s*(?:;|\/)\s*/)).filter(Boolean);
    return `${lang==='ru'?'Местоимение':'Pronoun'} · ${[...new Set(values)].join(' / ')}`;
  }
  function group(item) {
    if(item.id==='pronoun-010')return 'impersonal';
    if(item.id==='pronoun-019')return 'reflexive';
    if(item.id==='pronoun-037')return 'demonstrative';
    if(item.id==='pronoun-038')return 'relative';
    return 'personal';
  }
  function render(root,item,lang,clickedWord) {
    const ru=lang==='ru',kind=group(item);
    root.dataset.pronounReference=kind;
    const text=(tag,cls,value)=>{const node=document.createElement(tag);node.className=cls;node.textContent=value;return node;};
    const titles={personal:ru?'Личные и притяжательные местоимения':'Personal and possessive pronouns',reflexive:ru?'Возвратные местоимения':'Reflexive pronouns',demonstrative:ru?'Указательное местоимение der/die/das':'Demonstrative pronoun der/die/das',relative:ru?'Относительное местоимение der/die/das':'Relative pronoun der/die/das',impersonal:ru?'Безличное es':'Impersonal es'};
    const heading=text('h2','dictionary-headword',clickedWord || item.word);heading.id='sheet-word';root.append(heading);
    root.append(text('p','dictionary-pos',ru?'местоимение':'pronoun'),text('h3','pronoun-reference-title',titles[kind]));
    function table(title,columns,rows) {
      const section=text('section','dictionary-pronoun-forms','');
      if(title)section.append(text('h3','',title));
      const scroll=text('div','pronoun-reference-scroll','');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',title || titles[kind]);
      const table=text('table','dictionary-table',''),thead=document.createElement('thead'),header=document.createElement('tr');
      for(const column of columns){const cell=text('th','',column);cell.scope='col';header.append(cell);}thead.append(header);
      const tbody=document.createElement('tbody');
      for(const values of rows){const row=document.createElement('tr');values.forEach((value,index)=>{const cell=text(index ? 'td' : 'th','',value);if(!index)cell.scope='row';row.append(cell);});tbody.append(row);}
      table.append(thead,tbody);scroll.append(table);section.append(scroll);root.append(section);
    }
    function example(de,translation) { const node=text('p','dictionary-example',de);node.lang='de';const tr=text('span','dictionary-example-translation',translation);tr.lang=lang;node.append(tr);root.append(node); }
    if(kind==='personal') {
      table('', ['Nom.','Akk.','Dat.','Possessiv'],PERSONAL_ROWS);
      root.append(text('p','dictionary-detail',ru?'Притяжательное местоимение = основа + окончание: sein Auto · seinen Bruder · seiner Schwester · euer → eure, euren':'Possessive pronoun = stem + ending: sein Auto · seinen Bruder · seiner Schwester · euer → eure, euren'));
      table(ru?'Притяжательные окончания':'Possessive endings',['Kasus','Mask.','Neutr.','Fem.','Plural'],ENDINGS);
    } else if(kind==='reflexive') {
      table('', ['Personal','Akkusativ','Dativ'],REFLEXIVE);
      example('Ich wasche mich',ru?'Я моюсь.':'I wash myself.');
      example('Ich wasche mir die Hände',ru?'Я мою себе руки.':'I wash my hands.');
    } else if(kind==='impersonal') {
      root.append(text('p','dictionary-detail',ru?'Безличное es служит формальным подлежащим, например в предложениях о погоде. Оно не обозначает конкретный предмет.':'Impersonal es acts as a grammatical subject, for example in expressions about the weather. It does not refer to a particular thing.'));
      example('Es regnet',ru?'Идёт дождь.':'It is raining.');example('Es ist kalt',ru?'Холодно.':'It is cold.');
    } else {
      root.append(text('p','dictionary-detail',ru?item.usage_note_ru:item.usage_note_en));
      for(const forms of item.forms || [])table('', ['Kasus',...forms.columns],Object.entries(forms.rows).map(([name,values])=>[name,...values]));
      if(kind==='demonstrative')example('Welchen Mantel? — Den dort',ru?'Какое пальто? — То, вон там.':'Which coat? — That one over there.');
      else example('Der Mann, dem ich geholfen habe',ru?'Мужчина, которому я помог.':'The man I helped.');
    }
  }
  window.BibliothekPronounReference=Object.freeze({excluded,group,render,isPronoun,brief,meanings});
})();
