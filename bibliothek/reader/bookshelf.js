(() => {
  "use strict";
  window.BibliothekBookshelf={create({root,onOpen,onDelete,describe}) {
    let dispose=()=>{}, selectedId=null, current=[];
    const hash=value=>Array.from(String(value)).reduce((sum,c)=>(Math.imul(sum,31)+c.codePointAt(0))>>>0,0);
    function update(books) {
      dispose(); current=books;
      root.replaceChildren();
      if(!books.length)return;
      const controller=new AbortController(), listen=(el,type,fn,opts={})=>el.addEventListener(type,fn,{...opts,signal:controller.signal});
      root.innerHTML='<div class="shelf-stage" aria-label="Bücherregal"></div><div class="caption"><h2><button type="button" class="shelf-title"></button></h2><div class="caption-author" hidden></div><div class="details"></div><div class="caption-actions"><button type="button" class="book-delete" aria-label="Delete book">×</button></div></div><div class="navigation"><button type="button" class="arrow prev" aria-label="Previous book">←</button><span class="count" aria-live="polite"></span><button type="button" class="arrow next" aria-label="Next book">→</button></div>';
      root.querySelector('.book-delete').innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7m3.5 0-.8 13h-11L5.9 7M10 10.5v6m4-6v6"/></svg>';
      const stage=root.querySelector('.shelf-stage');
      let selected=Math.max(0,books.findIndex(book=>book.id===selectedId));
      selectedId=books[selected].id;
      const settings={height:root.clientWidth<600?190:250,gap:3,centerGap:root.clientWidth<600?28:56,tilt:0,enlarge:.04,forward:20,duration:520};
      const palette=['#e6e4dc','#3c4140','#d5d4ce','#aab4b6','#565d60'];
      const paletteInk=['#283331','#eeeae0','#293331','#24332f','#efede5'];
      const hashes=books.map(b=>hash(b.id));
      // Balance the palette across this shelf and avoid identical adjacent generated covers.
      const counts=palette.map(()=>0);let previousColor=-1;
      const colors=hashes.map(h=>{
        const available=counts.map((count,index)=>({count,index})).filter(c=>c.index!==previousColor);
        const least=Math.min(...available.map(c=>c.count));
        const choices=available.filter(c=>c.count===least);
        const color=choices[h%choices.length].index;counts[color]++;previousColor=color;return color;
      });
      const mobile=root.clientWidth<600;
      const thicknesses=books.map(b=>Math.round((mobile?28:22)+Math.min(b.wordCount||0,140000)/140000*(mobile?22:28)));
      const heightFactors=hashes.map(h=>.88+(h%8)*.03);
      const coverRatios=books.map(b=>Number.isFinite(b.coverAspectRatio)&&b.coverAspectRatio>0?b.coverAspectRatio:.68);
      function size(i){
        const standardHeight=settings.height*heightFactors[i],ratio=coverRatios[i];
        const height=Math.min(standardHeight*.68/ratio,settings.height*1.09);
        return {height,width:height*ratio};
      }
      // Measure normal wrapped text before rotating the whole label. Safari's vertical
      // text column metrics can clip a second line despite the predicted column width.
      const titleProbe=document.createElement('span');titleProbe.setAttribute('aria-hidden','true');
      titleProbe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;display:block;white-space:normal;overflow-wrap:anywhere;letter-spacing:.2px;padding:0;border:0;writing-mode:horizontal-tb;box-sizing:content-box;';
      root.append(titleProbe);
      function titleThickness(i){
        const base=Math.round((mobile?28:22)+Math.min(books[i].wordCount||0,140000)/140000*(mobile?22:28));
        if(!mobile)return base;
        titleProbe.style.width=Math.max(36,size(i).height-52)+'px';titleProbe.textContent=books[i].title;
        titleProbe.style.font='400 12px/14px Arial';const sans=titleProbe.offsetHeight;
        titleProbe.style.font='400 12px/14px Georgia';const height=Math.max(sans,titleProbe.offsetHeight);
        return Math.max(base,height+8);
      }
      thicknesses.forEach((_,i)=>thicknesses[i]=titleThickness(i));
      function refreshThickness(){
        thicknesses.forEach((_,i)=>{
          thicknesses[i]=titleThickness(i);
          nodes[i].style.setProperty('--thickness',thicknesses[i]+'px');
          nodes[i].style.setProperty('--half-thickness',thicknesses[i]/2+'px');
        });
      }
      const leanAngles=hashes.map(h=>h%5===0?-3:h%7===0?2.5:0);
      const closedWidth=i=>thicknesses[i]+size(i).height*Math.abs(Math.sin(leanAngles[i]*Math.PI/180));
      let dragged=false, suppressClickUntil=0;
      const nodes=books.map((b,i)=>{
        const started=!b.completed&&Boolean(b.readingStarted||Number(b.position)>0||Number(b.chapterIndex)>0);
        const el=document.createElement('button');el.type='button';el.className='book';el.setAttribute('aria-label',b.title+(started?', begonnen':''));
        const color=colors[i];
        el.style.setProperty('--cover',palette[color]);el.style.setProperty('--cover-ink',paletteInk[color]);
        el.style.setProperty('--thickness',thicknesses[i]+'px');el.style.setProperty('--half-thickness',thicknesses[i]/2+'px');
        const designs=b.title.length<=24?['letter','title','orbits','frame']:['letter','orbits','frame'];
        el.dataset.coverDesign=designs[hashes[i]%designs.length];
        const coverFont=b.title.length>60?17:b.title.length>22?19:el.dataset.coverDesign==='title'?33:25;
        // Keep whole words intact where possible, including within the inset frame.
        titleProbe.style.whiteSpace='nowrap';titleProbe.style.width='max-content';titleProbe.style.font=`400 ${coverFont}px Georgia`;
        let widestWord=0;
        for(const word of b.title.split(/\s+/)){titleProbe.textContent=word;widestWord=Math.max(widestWord,titleProbe.offsetWidth);}
        titleProbe.style.whiteSpace='normal';
        const coverSpace=170-(el.dataset.coverDesign==='frame'?45:33);
        el.style.setProperty('--cover-title-size',Math.max(14,Math.min(coverFont,coverFont*coverSpace/Math.max(1,widestWord)))+'px');
        el.dataset.long=String(b.title.length>22);el.dataset.extraLong=String(b.title.length>60);el.dataset.mark=['bars','ring','diamond','dot'][hashes[i]%4];
        el.dataset.spine=b.title.length<10?'short':thicknesses[i]>40?'wide':hashes[i]%2?'serif':'regular';
        el.innerHTML='<div class="volume"><div class="spine"><div class="spine-mark" aria-hidden="true"></div><span class="spine-title"></span></div><div class="page-edge" aria-hidden="true"><span></span><span></span><span></span></div><div class="front"><div class="cover-title"></div><div class="cover-art" aria-hidden="true"><span class="cover-initial"></span><span class="cover-orbit"></span><span class="cover-orbit secondary"></span><span class="cover-sphere"></span><span class="cover-sphere small"></span></div><div class="author"></div></div></div>';
        el.querySelector('.spine-title').textContent=b.title;el.querySelector('.cover-title').textContent=b.title;
        el.querySelector('.author').textContent=b.author||'';
        el.querySelector('.cover-initial').textContent=Array.from(b.title.trim())[0]?.toLocaleUpperCase('de')||'A';
        if(started){
          el.style.setProperty('--bookmark-angle',(hashes[i]%2?7:-6)+'deg');
          const ribbon=document.createElement('span');ribbon.className='reading-ribbon';ribbon.setAttribute('aria-hidden','true');
          el.querySelector('.volume').append(ribbon);
        }
        if(/^data:image\/(webp|png|jpeg);base64,/.test(b.coverThumbnail||'')){
          const image=document.createElement('img');image.className='cover-image';image.alt='';image.draggable=false;image.src=b.coverThumbnail;
          listen(image,'load',()=>{
            // Sample a small image: edge pixels carry more of the cover's background color.
            try{
              coverRatios[i]=image.naturalWidth/image.naturalHeight;refreshThickness();
              if(motion===null&&settleTimer===null)positions=restingPositions(selected);render();
              const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
              const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,32,32);
              const pixels=ctx.getImageData(0,0,32,32).data,bins=new Map();
              for(let n=0;n<pixels.length;n+=4){
                if(pixels[n+3]<128)continue;
                const r=pixels[n],g=pixels[n+1],b=pixels[n+2],x=(n/4)%32,y=Math.floor(n/128);
                const weight=x<6||x>25||y<4||y>27?3:1;
                const key=[r>>5,g>>5,b>>5].join(',');const bin=bins.get(key)||{weight:0,r:0,g:0,b:0};
                bin.weight+=weight;bin.r+=r*weight;bin.g+=g*weight;bin.b+=b*weight;bins.set(key,bin);
              }
              const dominant=[...bins.values()].sort((a,b)=>b.weight-a.weight)[0];
              if(dominant){
                const rgb=['r','g','b'].map(c=>Math.round(dominant[c]/dominant.weight));
                el.style.setProperty('--cover',`rgb(${rgb.join(',')})`);
                el.style.setProperty('--cover-ink',rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150?'#24302e':'#f2efe5');
              }
            }catch(_){/* Keep the palette fallback if the cover cannot be sampled. */}
          });
          listen(image,'error',()=>{image.remove();el.style.setProperty('--cover',palette[color]);el.style.setProperty('--cover-ink',paletteInk[color]);});el.querySelector('.front').append(image);
        }
        listen(el,'click',()=>{if(dragged||performance.now()<suppressClickUntil)return;if(i===selected&&motion===null&&settleTimer===null)onOpen(b);else choose(i);});
        stage.append(el);return el;
      });
      let weights=books.map((_,i)=>i===selected?1:0);
    function restingPositions(index){
      const width=size(index).width*(1+settings.enlarge)*1200/(1200-settings.forward);
      const result=books.map(()=>0);
      let edge=width/2+settings.centerGap;
      for(let i=index+1;i<books.length;i++){result[i]=edge+settings.gap+closedWidth(i)/2;edge=result[i]+closedWidth(i)/2;}
      edge=-width/2-settings.centerGap;
      for(let i=index-1;i>=0;i--){result[i]=edge-settings.gap-closedWidth(i)/2;edge=result[i]-closedWidth(i)/2;}
      return result;
    }
    let positions=restingPositions(selected);
    let motion=null;
    let settleTimer=null;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    function render(){

      const geometry=weights.map((weight,i)=>{
        const {height,width}=size(i);
        const lean=leanAngles[i]*(1-weight);
        const angle=90*(1-weight);
        const scale=1+settings.enlarge*weight;
        const z=-width/2+(width/2-thicknesses[i]/2+settings.forward)*weight;
        const radians=angle*Math.PI/180;
        const perspectiveScale=1200/(1200-z-width/2*Math.sin(radians));
        const footprint=(width*Math.cos(radians)+thicknesses[i]*Math.sin(radians))*scale*perspectiveScale;
        return {weight,angle,scale,z,footprint,width,height,lean};
      });
      nodes.forEach((node,i)=>{
        const g=geometry[i];
        node.style.setProperty('--book-scale',String(g.height/250));
        node.style.setProperty('--spine-label-length',Math.max(36,g.height-52)+'px');
        node.style.setProperty('--bookmark-turn',(-18*(1-g.weight))+'deg');

        node.style.width=g.footprint+'px';node.style.height=g.height+'px';node.style.top=(settings.height+58-g.height)+'px';
        node.style.transform=`translateX(${positions[i]-g.footprint/2}px) rotateZ(${g.lean}deg)`;
        node.style.zIndex=String(Math.round(20+g.weight*20));node.setAttribute('aria-pressed',String(i===selected));
        const volume=node.querySelector('.volume');
        volume.style.width=g.width+'px';volume.style.marginLeft=(g.footprint-g.width)/2+'px';
        volume.style.transform=`translateZ(${g.z}px) rotateX(${settings.tilt*g.weight}deg) rotateY(${g.angle}deg) scale(${g.scale})`;
        node.querySelector('.front').style.visibility=g.weight>.001?'visible':'hidden';
      });
      const book=books[selected];
      if(root.querySelector('.shelf-title').textContent!==book.title)root.querySelector('.shelf-title').textContent=book.title;
      const captionAuthor=root.querySelector('.caption-author');
      if(captionAuthor.textContent!==(book.author||''))captionAuthor.textContent=book.author||'';
      captionAuthor.hidden=!book.author;
      const details=describe(book);
      if(root.querySelector('.details').textContent!==details)root.querySelector('.details').textContent=details;
      root.querySelector('.book-delete').setAttribute('aria-label',`„${book.title}“ löschen`);
      root.querySelector('.count').textContent=(selected+1)+' / '+books.length;root.querySelector('.prev').disabled=selected===0;root.querySelector('.next').disabled=selected===books.length-1;
    }
    function choose(index,force=false){
      if(settleTimer!==null){clearTimeout(settleTimer);settleTimer=null;}
      const next=Math.max(0,Math.min(books.length-1,index));
      if(next===selected&&!force)return;
      if(motion!==null)cancelAnimationFrame(motion);
      selected=next;
      const from=weights.slice();const target=books.map((_,i)=>i===selected?1:0);
      const fromPositions=positions.slice();const targetPositions=restingPositions(selected);
      if(reducedMotion.matches){weights=target;positions=targetPositions;render();motion=null;}
      else{
        const start=performance.now();
        const duration=settings.duration;
        function step(now){
          const t=Math.min(1,(now-start)/duration);
          const ease=1-Math.pow(1-t,3);
          weights=from.map((value,i)=>value+(target[i]-value)*ease);
          positions=fromPositions.map((value,i)=>value+(targetPositions[i]-value)*ease);
          render();motion=t<1?requestAnimationFrame(step):null;
        }
        motion=requestAnimationFrame(step);
      }
      selectedId=books[selected].id;
    }
    listen(root.querySelector('.prev'),'click',()=>choose(selected-1));listen(root.querySelector('.next'),'click',()=>choose(selected+1));
    listen(root,'keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();choose(selected+(event.key==='ArrowRight'?1:-1));}});
    let wheelPosition=selected,lastWheelTime=-Infinity,lastWheelSelection=selected;
    listen(stage,'wheel',event=>{
      if(event.ctrlKey)return;
      event.preventDefault();
      const now=performance.now();
      // Scrub the actual pose, not just a succession of selected indices.
      if(now-lastWheelTime>180||selected!==lastWheelSelection)wheelPosition=selected;
      lastWheelTime=now;
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
      wheelPosition=Math.max(0,Math.min(books.length-1,wheelPosition+delta*unit/180));
      if(motion!==null){cancelAnimationFrame(motion);motion=null;}
      if(settleTimer!==null)clearTimeout(settleTimer);
      const lower=Math.floor(wheelPosition),upper=Math.min(books.length-1,lower+1);
      const fraction=wheelPosition-lower;
      weights=books.map((_,i)=>i===lower?1-fraction:i===upper?fraction:0);
      const lowerPositions=restingPositions(lower),upperPositions=restingPositions(upper);
      positions=lowerPositions.map((value,i)=>value+(upperPositions[i]-value)*fraction);
      selected=Math.round(wheelPosition);
      lastWheelSelection=selected;
      if(reducedMotion.matches){choose(selected,true);return;}
      render();
      settleTimer=setTimeout(()=>{
        settleTimer=null;
        choose(Math.round(wheelPosition),true);
      },160);
    },{passive:false});

      listen(root.querySelector('.shelf-title'),'click',()=>onOpen(books[selected]));
      listen(root.querySelector('.book-delete'),'click',e=>onDelete(books[selected],e.currentTarget));
      function scrub(value) {
        wheelPosition=Math.max(0,Math.min(books.length-1,value));
        if(motion!==null){cancelAnimationFrame(motion);motion=null;}clearTimeout(settleTimer);settleTimer=null;
        const lower=Math.floor(wheelPosition),upper=Math.min(books.length-1,lower+1),fraction=wheelPosition-lower;
        weights=books.map((_,i)=>i===lower?1-fraction:i===upper?fraction:0);
        const a=restingPositions(lower),b=restingPositions(upper);positions=a.map((x,i)=>x+(b[i]-x)*fraction);
        selected=Math.round(wheelPosition);
        if(reducedMotion.matches){weights=books.map((_,i)=>i===selected?1:0);positions=restingPositions(selected);}
        render();
      }
      let touch=null;
      listen(stage,'pointerdown',e=>{if(e.pointerType==='mouse')return;touch={id:e.pointerId,x:e.clientX,y:e.clientY,position:selected,horizontal:false};dragged=false;});
      listen(stage,'pointermove',e=>{
        if(!touch||touch.id!==e.pointerId)return;
        const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
        if(!touch.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){touch=null;return;}if(Math.abs(dx)<10)return;touch.horizontal=true;stage.setPointerCapture(e.pointerId);}
        dragged=true;scrub(touch.position-dx/90);
      });
      const release=()=>{if(touch?.horizontal){choose(selected,true);suppressClickUntil=performance.now()+250;}touch=null;dragged=false;};
      listen(stage,'pointerup',release);listen(stage,'pointercancel',release);
      function fit() {
        if(!root.clientWidth)return;
        const parentStyle=getComputedStyle(root.parentElement);
        const reserved=parseFloat(parentStyle.paddingTop)+parseFloat(parentStyle.paddingBottom);
        const footer=Math.max(140,root.querySelector('.caption').offsetHeight)+root.querySelector('.navigation').offsetHeight;
        const height=Math.min(root.clientWidth<600?190:250,Math.max(130,root.parentElement.clientHeight-reserved-footer-90));
        stage.style.height=(height+90)+'px';
        const centerGap=root.clientWidth<600?28:56;
        if(Math.abs(settings.height-height)<1&&settings.centerGap===centerGap)return;
        settings.height=height;settings.centerGap=centerGap;refreshThickness();
        if(motion!==null){cancelAnimationFrame(motion);motion=null;}clearTimeout(settleTimer);settleTimer=null;
        weights=books.map((_,i)=>i===selected?1:0);positions=restingPositions(selected);render();
      }
      // Observe the fixed application frame, not the caption-driven shelf height.
      // Changing the selected title must never reset the in-progress pose.
      const observer=new ResizeObserver(fit);observer.observe(root.parentElement);
      dispose=()=>{controller.abort();observer.disconnect();clearTimeout(settleTimer);if(motion!==null)cancelAnimationFrame(motion);};
      render();fit();
    }
    return {update,pause:()=>{dispose();},resume:()=>update(current)};
  }};
})();
