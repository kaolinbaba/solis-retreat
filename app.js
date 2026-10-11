(function(){
  'use strict';
  const $=id=>document.getElementById(id),L=window.SolisLogic;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body,header=$('header'),menu=$('mobileNav'),menuButton=$('menuToggle');
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');}
  menuButton.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',e=>{if(!menu.hidden&&!header.contains(e.target))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
  addEventListener('resize',()=>{if(innerWidth>760)closeMenu();});
  const updateHeader=()=>header.classList.toggle('scrolled',window.scrollY>40);addEventListener('scroll',updateHeader,{passive:true});updateHeader();

  let motionPaused=reduced.matches,evening=false;
  function setMotion(paused){motionPaused=!!paused;window.SolisLandscape.setPaused(paused);$('motionToggle').setAttribute('aria-pressed',String(!paused));$('motionToggle').setAttribute('aria-label',paused?'Play landscape motion':'Pause landscape motion');$('motionLabel').textContent=paused?'Motion off':'Motion on';$('motionToggle').querySelector('path').setAttribute('d',paused?'M6 4l9 6-9 6Z':'M7 5v10M13 5v10');}
  $('motionToggle').addEventListener('click',()=>setMotion(!motionPaused));reduced.addEventListener('change',e=>setMotion(e.matches));setMotion(motionPaused);
  $('lightToggle').addEventListener('click',()=>{evening=!evening;window.SolisLandscape.setEvening(evening);$('lightToggle').setAttribute('aria-pressed',String(evening));$('lightToggle').setAttribute('aria-label',evening?'Switch to morning light':'Switch to evening light');$('lightLabel').textContent=evening?'Evening hush':'Morning light';});

  const rituals={dawn:{time:'THE FIRST LIGHT',title:'Begin softly.',description:'An unhurried breakfast, a quiet seat by the water, and a little gentle movement — whenever you feel ready.',note:'No alarm needed. Just the morning.',x:55,y:112},day:{time:'THE OPEN AFTERNOON',title:'Wander a little.',description:'Take the tree-lined path, stretch in the open air, or settle into a sheltered corner with a book. There is room for all of it.',note:'A little exploring. Plenty of space.',x:210,y:25},dusk:{time:'THE LAST OF THE LIGHT',title:'Let it settle.',description:'A seasonal table, a warm conversation, and an easy evening. Watch the light leave the water, with nothing left to hurry.',note:'The day can end gently.',x:365,y:112}};
  const tabs=[...document.querySelectorAll('[data-ritual]')];
  function chooseRitual(button,focus=false){const value=rituals[button.dataset.ritual];tabs.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});$('ritualPanel').setAttribute('aria-labelledby',button.id);$('ritualTime').textContent=value.time;$('ritualTitle').textContent=value.title;$('ritualDescription').textContent=value.description;$('ritualNote').textContent=value.note;$('sunMarker').setAttribute('cx',value.x);$('sunMarker').setAttribute('cy',value.y);if(focus)button.focus();}
  tabs.forEach((button,index)=>{button.addEventListener('click',()=>chooseRitual(button));button.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();chooseRitual(tabs[next],true);}});});

  let audio=null,master=null,soundOn=false,soundBusy=false,soundVersion=0,volume=40;
  function soundUI(){const toggle=$('soundToggle');toggle.setAttribute('aria-pressed',String(soundOn));toggle.setAttribute('aria-label',soundOn?'Turn ambient sound off':'Turn ambient sound on');$('soundLabel').textContent=soundOn?'Sound on':'Sound off';$('volumeControl').hidden=!soundOn;}
  function audioLevel(){return Math.pow(volume/100,1.3)*1.5;}
  function fadeAudio(level){const t=audio.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(level,t+(level>0?3.5:1.2));if(level>0&&ambient)ambient.wake();}
  /* ---- Solis soundscape: slow water at the shore, a few distant droplets, a warm evolving pad in a soft room.
     Everything breathes on the same 10-second cycle as the landscape. No melody, no rhythm, no claims. ---- */
  function SolisAmbient(ctx,out){
    const has=(o,k)=>o&&typeof o[k]==='function';
    const set=(param,v,t)=>{if(param&&param.setValueAtTime)param.setValueAtTime(v,t);else if(param)param.value=v;};
    const ramp=(param,v,t)=>{if(param&&param.linearRampToValueAtTime)param.linearRampToValueAtTime(v,t);else if(param)param.value=v;};
    const stopAt=(n,t)=>{try{if(has(n,'stop'))n.stop(t);}catch(e){}};
    const filter=(type,freq,q)=>{const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;if(f.Q&&q!=null)f.Q.value=q;return f;};
    const gain=v=>{const g=ctx.createGain();g.gain.value=v;return g;};
    const panTo=(node,pan,dest)=>{if(has(ctx,'createStereoPanner')){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(dest);}else node.connect(dest);};
    const lfo=(rate,depth,param)=>{const o=ctx.createOscillator(),g=gain(depth);o.frequency.value=rate;o.connect(g);g.connect(param);o.start();return o;};
    const rate=ctx.sampleRate;
    /* buffers */
    function brown(seconds){const len=Math.max(1,Math.floor(rate*seconds)),b=ctx.createBuffer(2,len,rate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let last=0;for(let i=0;i<len;i++){last=(last+0.02*(Math.random()*2-1))/1.02;d[i]=last*3.4;}}return b;}
    function room(seconds){const len=Math.max(1,Math.floor(rate*seconds)),b=ctx.createBuffer(2,len,rate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;for(let i=0;i<len;i++){const k=i/len;lp+=(Math.random()*2-1-lp)*(0.35-0.3*k);d[i]=lp*Math.pow(1-k,2.6);}}return b;}
    const water=brown(9);
    /* buses */
    const dry=gain(1);dry.connect(out);
    let wet=null;
    if(has(ctx,'createConvolver')){const c=ctx.createConvolver();c.buffer=room(5.5);const tone=filter('lowpass',2400,0.5);wet=gain(0.55);wet.connect(c);c.connect(tone);tone.connect(out);}
    const send=(node,amount)=>{if(wet&&amount>0){const g=gain(amount);node.connect(g);g.connect(wet);}};
    /* 1 · still-water bed: a low, rounded wash that rises and settles every 10 s */
    const bedSrc=ctx.createBufferSource();bedSrc.buffer=water;bedSrc.loop=true;
    const bedLow=filter('lowpass',460,0.4),bedHigh=filter('highpass',110,0.5),bed=gain(0.12);
    bedSrc.connect(bedHigh);bedHigh.connect(bedLow);bedLow.connect(bed);bed.connect(dry);send(bed,0.25);
    lfo(0.1,0.045,bed.gain);lfo(0.043,110,bedLow.frequency);bedSrc.start();
    /* 2 · the pad: soft triangle and sine voices, filtered warm, slowly moving through four open chords */
    const padFilter=filter('lowpass',620,0.6),pad=gain(0.0);padFilter.connect(pad);pad.connect(dry);send(pad,0.9);
    lfo(0.1,180,padFilter.frequency);
    const chords=[[73.42,110.0,185.0,277.18,329.63],[61.74,92.5,146.83,220.0,329.63],[49.0,73.42,123.47,185.0,220.0],[55.0,82.41,123.47,164.81,277.18]];
    let chordIndex=0,voices=[];
    function playChord(t){
      const notes=chords[chordIndex%chords.length];chordIndex++;
      voices.forEach(v=>{set(v.g.gain,v.peak,t);ramp(v.g.gain,0.0001,t+11);v.oscs.forEach(o=>stopAt(o,t+11.5));});
      voices=notes.map((f,i)=>{
        const peak=i===0?0.16:i===1?0.12:0.07,g=gain(0.0001);
        const a=ctx.createOscillator();a.type='triangle';a.frequency.value=f;
        const b=ctx.createOscillator();b.type='sine';b.frequency.value=f*1.0006;
        const bg=gain(0.8);a.connect(g);b.connect(bg);bg.connect(g);
        panTo(g,[-0.15,0.15,-0.4,0.4,0][i],padFilter);
        set(g.gain,0.0001,t);ramp(g.gain,peak,t+9);
        a.start(t);b.start(t);
        return {g,peak,oscs:[a,b]};
      });
    }
    /* 3 · lapping at the stones: irregular soft swells, each one a little different */
    function lap(t){
      const src=ctx.createBufferSource();src.buffer=water;
      const centre=320+Math.random()*380,band=filter('bandpass',centre,0.7),soft=filter('lowpass',1100,0.3),g=gain(0.0001);
      const peak=0.09+Math.random()*0.08,rise=0.7+Math.random()*0.5,fall=2.2+Math.random()*1.2;
      const lc=filter('highpass',140,0.5);src.connect(lc);lc.connect(band);band.connect(soft);soft.connect(g);panTo(g,Math.random()*1.2-0.6,dry);send(g,0.3);
      set(g.gain,0.0001,t);ramp(g.gain,peak,t+rise);ramp(g.gain,0.0001,t+rise+fall);
      if(band.frequency.linearRampToValueAtTime){set(band.frequency,centre,t);ramp(band.frequency,centre*0.7,t+rise+fall);}
      src.start(t,Math.random()*6);stopAt(src,t+rise+fall+0.2);
      /* a faint foam hush trailing the swell */
      const fz=ctx.createBufferSource();fz.buffer=water;const fb=filter('bandpass',1700+Math.random()*600,0.9),fg=gain(0.0001);
      fz.connect(fb);fb.connect(fg);panTo(fg,Math.random()*1.4-0.7,dry);send(fg,0.4);
      set(fg.gain,0.0001,t+rise*0.6);ramp(fg.gain,0.025+Math.random()*0.02,t+rise+0.3);ramp(fg.gain,0.0001,t+rise+fall*0.8);
      fz.start(t+rise*0.6,Math.random()*6);stopAt(fz,t+rise+fall);
    }
    /* 4 · distant droplets, mostly heard through the room */
    function drop(t){
      const o=ctx.createOscillator(),g=gain(0.0001),f0=520+Math.random()*420,lp=filter('lowpass',2600,0.4);
      o.type='sine';set(o.frequency,f0,t);ramp(o.frequency,f0*2.1,t+0.055);
      o.connect(lp);lp.connect(g);panTo(g,Math.random()*1.6-0.8,dry);send(g,1.4);
      set(g.gain,0.0001,t);ramp(g.gain,0.028,t+0.006);ramp(g.gain,0.0001,t+0.14);
      o.start(t);stopAt(o,t+0.2);
    }
    let timers=[],running=false;
    const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
    function lapLoop(){if(!running)return;lap(ctx.currentTime+0.05);later(lapLoop,2600+Math.random()*3200);}
    function dropLoop(){if(!running)return;const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)drop(ctx.currentTime+0.05+i*(0.18+Math.random()*0.35));later(dropLoop,5000+Math.random()*7000);}
    function chordLoop(){if(!running)return;playChord(ctx.currentTime+0.05);later(chordLoop,22000);}
    let started=false;
    return {
      wake(){if(running)return;running=true;if(!started){started=true;set(pad.gain,0.0,ctx.currentTime);ramp(pad.gain,0.95,ctx.currentTime+6);}chordLoop();later(lapLoop,900);later(dropLoop,3500);},
      sleep(){running=false;if(typeof clearTimeout==='function')timers.forEach(id=>clearTimeout(id));timers=[];},
      /* render helper for offline checks */
      schedule(from,to){set(pad.gain,0.95,from);let t=from;while(t<to){playChord(t);t+=22;}t=from+0.5;while(t<to){lap(t);t+=2.6+Math.random()*3.2;}t=from+3;while(t<to){drop(t);t+=5+Math.random()*7;}}
    };
  }
  window.SolisAmbient=SolisAmbient;
  let ambient=null;
  function buildAudio(){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Web Audio unavailable');audio=new Context();master=audio.createGain();master.gain.value=0;
    let out=master;
    if(typeof audio.createDynamicsCompressor==='function'){const comp=audio.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;comp.attack.value=0.05;comp.release.value=0.6;master.connect(comp);comp.connect(audio.destination);}
    else master.connect(audio.destination);
    const pre=audio.createGain();pre.gain.value=1;pre.connect(out);
    ambient=SolisAmbient(audio,pre);
  }
  $('soundToggle').addEventListener('click',async()=>{if(soundBusy)return;const version=++soundVersion;if(soundOn){soundOn=false;fadeAudio(0);if(ambient)ambient.sleep();soundUI();setTimeout(()=>{if(version===soundVersion&&!soundOn&&audio)audio.suspend().catch(()=>{});},1400);return;}soundBusy=true;$('soundToggle').disabled=true;try{if(!audio)buildAudio();await audio.resume();soundOn=true;fadeAudio(audioLevel());soundUI();$('audioStatus').textContent='Ambient sound on. Adjust the volume below.';}catch{soundOn=false;soundUI();$('audioStatus').textContent='Ambient sound is unavailable in this browser.';}finally{soundBusy=false;$('soundToggle').disabled=false;}});
  $('volume').addEventListener('input',e=>{volume=Math.max(0,Math.min(100,Number(e.target.value)||0));if(audio&&soundOn)fadeAudio(audioLevel());});
  document.addEventListener('visibilitychange',()=>{if(!audio)return;if(document.hidden)audio.suspend().catch(()=>{});else if(soundOn)audio.resume().then(()=>fadeAudio(audioLevel())).catch(()=>{});});
  addEventListener('pagehide',()=>{if(audio)audio.suspend().catch(()=>{});});soundUI();

  const dialog=$('bookingDialog'),form=$('bookingForm');let step=1,opener=null,plan=null;
  function readData(){return {arrival:$('arrival').value,departure:$('departure').value,guests:$('guests').value,name:$('guestName').value.trim(),email:$('guestEmail').value.trim(),interest:form.querySelector('input[name="interest"]:checked').value};}
  function updateDateBounds(){const today=L.isoDate();$('arrival').min=today;$('departure').min=L.addDays($('arrival').value)||L.addDays(today);}
  function showStep(number,focus=true){step=number;for(let i=1;i<=3;i++)$('bookingStep'+i).hidden=i!==number;$('bookingSuccess').hidden=true;form.hidden=false;$('bookingProgress').hidden=false;$('bookingProgress').setAttribute('aria-label',`Step ${number} of 3`);[...$('bookingProgress').children].forEach((el,index)=>{el.classList.toggle('active',index+1===number);if(index+1===number)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});if(focus){const target=number===1?$('arrival'):number===2?form.querySelector('input[name="interest"]:checked'):$('backDetails');target.focus();}}
  function clearErrors(){for(const id of ['arrival','departure','guestName','guestEmail']){$(id+'Error').textContent='';$(id).removeAttribute('aria-invalid');}}
  function applyErrors(errors){clearErrors();const entries=Object.entries(errors);for(const[id,message]of entries){const field=$(id);if($(id+'Error'))$(id+'Error').textContent=message;field.setAttribute('aria-invalid','true');}if(entries.length)$(entries[0][0]).focus();return entries.length===0;}
  function openBooking(trigger){closeMenu();if(dialog.open)return;opener=trigger.closest('#mobileNav')?menuButton:trigger;updateDateBounds();showStep(step,false);if(plan){form.hidden=true;$('bookingProgress').hidden=true;$('bookingSuccess').hidden=false;}dialog.showModal();body.classList.add('dialog-open','bookingDialog-open');if(plan)$('downloadPlan').focus();else if(step===1)$('arrival').focus();else if(step===2)$('guestName').focus();else $('backDetails').focus();}
  document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>openBooking(button)));
  $('closeBooking').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{body.classList.remove('dialog-open','bookingDialog-open');if(opener)opener.focus();});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  dialog.querySelector('.booking-brand').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();return;}if(e.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('a,button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  $('arrival').addEventListener('change',updateDateBounds);
  $('nextDates').addEventListener('click',()=>{updateDateBounds();if(applyErrors(L.validateDates(readData())))showStep(2);});
  $('backDates').addEventListener('click',()=>showStep(1));$('backDetails').addEventListener('click',()=>showStep(2));
  $('nextDetails').addEventListener('click',()=>{const data=readData();if(!applyErrors(L.validateDetails(data)))return;$('reviewDates').textContent=L.summary(data);$('reviewGuests').textContent=`${data.guests} ${data.guests==='1'?'guest':'guests'}`;$('reviewInterest').textContent=data.interest;$('reviewName').textContent=data.name;showStep(3);});
  form.addEventListener('submit',e=>{e.preventDefault();if(step===1){$('nextDates').click();return;}if(step===2){$('nextDetails').click();return;}const data=readData(),dateErrors=L.validateDates(data),detailErrors=L.validateDetails(data);if(Object.keys(dateErrors).length){showStep(1,false);applyErrors(dateErrors);return;}if(Object.keys(detailErrors).length){showStep(2,false);applyErrors(detailErrors);return;}plan=data;form.hidden=true;$('bookingProgress').hidden=true;$('bookingSuccess').hidden=false;$('successSummary').textContent=`${data.name}, your ${L.nights(data.arrival,data.departure)}-night sample stay is ready. ${L.formatDate(data.arrival)} – ${L.formatDate(data.departure)}. ${data.interest}.`;$('downloadPlan').focus();});
  $('downloadPlan').addEventListener('click',()=>{if(!plan)return;try{const blob=new Blob([L.planText(plan)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='solis-sample-stay.txt';body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('downloadStatus').textContent='Your sample plan download has been started.';}catch{$('downloadStatus').textContent='Download is unavailable. Your sample stay is still shown above.';}});
  $('restartBooking').addEventListener('click',()=>{plan=null;form.reset();clearErrors();updateDateBounds();$('downloadStatus').textContent='';showStep(1);});
  for(const id of ['arrival','departure','guestName','guestEmail'])$(id).addEventListener('input',()=>{$(id+'Error').textContent='';$(id).removeAttribute('aria-invalid');});
  updateDateBounds();
})();
