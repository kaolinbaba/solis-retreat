(function(){
  'use strict';
  /* Solis cursor: a small sun-dot with a water-droplet lens that trails it.
     Over the lake it breathes and leaves a soft wake; over links it opens like a halo.
     Fine pointers only. Text fields keep the system caret; dialogs fall back to the system cursor. */
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
  if(!finePointer.matches)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const body=document.body;
  const root=document.createElement('div');
  root.className='solis-cursor';root.setAttribute('aria-hidden','true');
  root.innerHTML='<span class="sc-lens"><span class="sc-glass"><span class="sc-echo"></span><span class="sc-horizon"></span></span></span><span class="sc-dotw"><span class="sc-dot"></span></span>';
  body.appendChild(root);
  const lens=root.querySelector('.sc-lens'),dot=root.querySelector('.sc-dotw');
  body.classList.add('has-solis-cursor');

  const pos={x:innerWidth/2,y:innerHeight/2},ring={x:pos.x,y:pos.y};
  let visible=false,lastWake={x:0,y:0},raf=0,stateKey='';
  const interactive='a,button,summary,label,[role="tab"],[data-book],input[type="range"],select';
  const textual='input:not([type="range"]):not([type="radio"]):not([type="checkbox"]),textarea,[contenteditable="true"]';

  function overScene(target){
    if(!target||!target.closest)return false;
    if(target.closest('.content-section,.site-footer,.site-header.scrolled,.atmosphere-bar button,.volume-control,dialog'))return false;
    return true;
  }
  function setState(target){
    const dialogOpen=!!document.querySelector('dialog[open]');
    const isText=!!(target&&target.closest&&target.closest(textual));
    const isLink=!isText&&!!(target&&target.closest&&target.closest(interactive));
    const water=!isLink&&!isText&&overScene(target)&&window.SolisLandscape&&window.SolisLandscape.isWaterAt&&window.SolisLandscape.isWaterAt(pos.x,pos.y);
    const key=[dialogOpen,isText,isLink,water].join();
    if(key===stateKey)return;stateKey=key;
    root.classList.toggle('is-hidden',dialogOpen||isText);
    root.classList.toggle('is-link',isLink);
    root.classList.toggle('on-water',!!water);
    body.classList.toggle('solis-cursor-off',dialogOpen);
  }
  function loop(){
    const k=reduced.matches?1:0.17;
    ring.x+=(pos.x-ring.x)*k;ring.y+=(pos.y-ring.y)*k;
    dot.style.transform=`translate3d(${pos.x}px,${pos.y}px,0)`;
    lens.style.transform=`translate3d(${ring.x}px,${ring.y}px,0)`;
    if(Math.abs(pos.x-ring.x)>0.1||Math.abs(pos.y-ring.y)>0.1)raf=requestAnimationFrame(loop);else raf=0;
  }
  function kick(){if(!raf)raf=requestAnimationFrame(loop);}
  addEventListener('pointermove',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    pos.x=e.clientX;pos.y=e.clientY;
    if(!visible){visible=true;root.classList.add('is-visible');ring.x=pos.x;ring.y=pos.y;}
    setState(e.target);kick();
    if(window.SolisLandscape&&window.SolisLandscape.setLook&&!reduced.matches)window.SolisLandscape.setLook(pos.x/innerWidth*2-1,pos.y/innerHeight*2-1);
    if(root.classList.contains('on-water')&&!reduced.matches){
      const dx=pos.x-lastWake.x,dy=pos.y-lastWake.y;
      if(dx*dx+dy*dy>110*110){lastWake={x:pos.x,y:pos.y};window.SolisLandscape.ripple(pos.x,pos.y,0.32);}
    }
  },{passive:true});
  document.addEventListener('mouseleave',()=>{visible=false;root.classList.remove('is-visible');});
  document.documentElement.addEventListener('mouseleave',()=>{visible=false;root.classList.remove('is-visible');});
  addEventListener('blur',()=>{visible=false;root.classList.remove('is-visible');});
  addEventListener('pointerdown',e=>{if(e.pointerType&&e.pointerType!=='mouse')return;root.classList.add('is-down');},{passive:true});
  addEventListener('pointerup',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    root.classList.remove('is-down');
    if(root.classList.contains('is-hidden'))return;
    if(!reduced.matches){
      const s=document.createElement('span');s.className='sc-splash';s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';
      root.appendChild(s);s.addEventListener('animationend',()=>s.remove());setTimeout(()=>s.remove(),1600);
    }
    if(root.classList.contains('on-water')&&window.SolisLandscape)window.SolisLandscape.ripple(e.clientX,e.clientY,1);
  },{passive:true});
  /* dialogs open in the browser's top layer, above any page element, so hand back the system cursor */
  new MutationObserver(()=>setState(document.elementFromPoint(pos.x,pos.y))).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('scroll',()=>{if(visible)setState(document.elementFromPoint(pos.x,pos.y));},{passive:true});
})();
