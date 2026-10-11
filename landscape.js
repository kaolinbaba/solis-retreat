(function(){
  'use strict';
  /* Solis living landscape.
     The photograph is never repainted; every effect is a displacement or a light layer on top of it:
     perspective-correct water swell, refraction over the shallow stones, glints on bright reflections,
     drifting horizon mist, slow light shafts, wind in the leaves, a 10-second "breath" and cursor ripples. */
  const canvas=document.getElementById('landscapeCanvas'),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let gl,program,texture,ready=false,frame=0,last=0,time=0,paused=motionPreference.matches,evening=false,eveningMix=0,contextLost=false;
  let imageW=1536,imageH=1024;
  const uniforms={},MAX_RIPPLES=8,ripples=[];
  const look={x:0,y:0,tx:0,ty:0};
  const vertex='attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
  const fragment=`#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  varying vec2 v_uv;
  uniform sampler2D u_image;uniform vec2 u_resolution;uniform vec2 u_imageSize;uniform float u_time;uniform float u_evening;
  uniform vec2 u_look;uniform vec4 u_ripples[${MAX_RIPPLES}];
  const float H=0.618;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
  float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}
  /* top edge of the mossy shore rocks, bottom-left of the photograph (bottom-based uv) */
  float rockTop(float x){
    float y=mix(0.453,0.414,smoothstep(0.0,0.065,x));
    y=mix(y,0.326,smoothstep(0.065,0.13,x));
    y=mix(y,0.316,smoothstep(0.13,0.195,x));
    y=mix(y,0.219,smoothstep(0.195,0.31,x));
    y=mix(y,-0.05,smoothstep(0.31,0.35,x));
    return y;}
  vec2 toWorld(vec2 p){float below=max(H-p.y,0.004);float z=0.06/below;return vec2((p.x-0.5)*z*3.0,z);}
  void main(){
    float t=u_time;
    float breath=0.5+0.5*sin(t*0.6283);           /* one slow breath every 10 s */
    float viewRatio=u_resolution.x/u_resolution.y,imageRatio=u_imageSize.x/u_imageSize.y;
    vec2 scale=vec2(1.0);
    if(viewRatio>imageRatio)scale.y=imageRatio/viewRatio;else scale.x=viewRatio/imageRatio;
    float zoom=1.035+0.014*breath;
    vec2 half=0.5*scale/zoom;
    vec2 center=vec2(0.5,0.56)+u_look*vec2(0.012,0.008);
    center=clamp(center,half+0.003,1.0-half-0.003);
    vec2 p=(v_uv-0.5)*scale/zoom+center;

    /* ---- masks ---- */
    float below=H-p.y;
    float rock=smoothstep(-0.006,0.006,rockTop(p.x)-p.y);
    float water=smoothstep(0.0,0.014,below)*(1.0-rock);
    float depth=clamp(below/0.6,0.0,1.0);
    float gust=0.55+0.45*noise(vec2(t*0.18,3.0));

    vec2 disp=vec2(0.0);
    vec2 slope=vec2(0.0);
    vec2 w=toWorld(p);
    float z=w.y;
    if(water>0.0){
      float swell=0.72+0.28*breath;
      float near=smoothstep(3.0,0.9,z),mid=smoothstep(8.0,2.0,z);
      vec2 d1=normalize(vec2(0.15,1.0)),d2=normalize(vec2(-0.3,0.95)),d3=normalize(vec2(0.5,0.86)),d4=normalize(vec2(-0.6,0.8));
      slope+=d1*cos(dot(d1,w)*14.0+t*1.05)*0.70;
      slope+=d2*cos(dot(d2,w)*23.0+t*1.55)*0.62;
      slope+=d3*cos(dot(d3,w)*37.0+t*2.25)*0.55*mid;
      slope+=d4*cos(dot(d4,w)*61.0+t*3.05)*0.45*near;
      /* wind-driven chop */
      vec2 q=w*vec2(9.0,6.0)+vec2(t*0.35,t*0.55);
      float n0=noise(q),nx=noise(q+vec2(0.15,0.0)),ny=noise(q+vec2(0.0,0.15));
      slope+=vec2(nx-n0,ny-n0)*9.0*mid;
      slope*=swell;
      /* cursor ripples */
      for(int i=0;i<${MAX_RIPPLES};i++){
        vec4 r=u_ripples[i];
        if(r.w<=0.0)continue;
        float age=t-r.z;
        if(age<0.0||age>6.0)continue;
        vec2 rw=toWorld(r.xy);
        vec2 dv=(w-rw)*vec2(1.0,2.2);
        float dist=length(dv);
        float radius=age*0.32*max(rw.y,0.25);
        float x=(dist-radius)/max(rw.y,0.25);
        float ring=sin(x*70.0)*exp(-x*x*260.0)*exp(-age*0.75)*r.w;
        slope+=normalize(dv+1e-4)*ring*2.4;
      }
      float amp=0.00042*pow(1.0/max(z,0.1),0.85);
      disp=vec2(slope.x*0.55,slope.y)*amp*water;
    }

    /* ---- wind in the foliage ---- */
    float leaves=smoothstep(0.76,0.84,p.y)*smoothstep(0.27,0.18,p.x);
    disp+=vec2(sin(t*1.15+p.x*22.0+p.y*9.0),cos(t*0.92+p.y*27.0))*vec2(0.0019,0.0012)*leaves*gust;
    float pinesL=smoothstep(0.6,0.66,p.y)*smoothstep(0.24,0.17,p.x)*(1.0-leaves);
    float pinesR=smoothstep(0.6,0.66,p.y)*smoothstep(0.86,0.9,p.x);
    disp.x+=sin(t*0.75+p.x*34.0)*0.0008*(pinesL+pinesR)*clamp((p.y-0.6)*3.0,0.0,1.0)*gust;
    float ferns=smoothstep(0.14,0.06,p.x)*smoothstep(0.04,0.1,p.y)*smoothstep(0.34,0.26,p.y);
    disp+=vec2(sin(t*1.6+p.x*45.0+p.y*20.0),cos(t*1.3+p.x*30.0))*0.0016*ferns*gust;

    vec2 sp=clamp(p+disp,0.002,0.998);
    vec3 col=texture2D(u_image,sp).rgb;
    float lum=dot(col,vec3(0.299,0.587,0.114));

    if(water>0.0){
      /* caustic light over the shallow stones */
      float shallow=smoothstep(0.32,0.5,below)*smoothstep(0.28,0.36,p.x);
      vec2 cq=w*vec2(26.0,18.0);
      float c1=noise(cq+vec2(t*0.45,t*0.3)),c2=noise(cq*1.13-vec2(t*0.38,-t*0.27));
      float caus=pow(1.0-abs(c1-c2),9.0);
      col+=caus*shallow*water*vec3(0.95,0.93,0.82)*0.16*(1.0-0.6*u_evening);
      /* glints on bright reflections */
      float band=smoothstep(0.012,0.05,below)*smoothstep(0.42,0.2,below);
      vec2 gq=w*vec2(46.0,110.0)+vec2(t*0.7,t*1.6);
      float g=smoothstep(0.80,0.97,noise(gq))*smoothstep(0.55,0.95,noise(gq*0.37+t*0.2));
      col+=g*band*water*smoothstep(0.5,0.85,lum)*mix(vec3(1.0,0.9,0.74),vec3(1.0,0.72,0.48),u_evening)*0.42;
      /* reflections darken a touch on wave faces, lighten on crests */
      col*=1.0+slope.y*0.035*water*(1.0-depth*0.5);
    }

    /* ---- horizon mist ---- */
    float band=exp(-pow((p.y-H-0.012)/0.034,2.0));
    float wisp=fbm(vec2(p.x*3.2+t*0.018,p.y*14.0-t*0.012));
    float wisp2=fbm(vec2(p.x*7.0-t*0.03,p.y*22.0+t*0.02));
    float mist=band*smoothstep(0.32,0.78,wisp*0.65+wisp2*0.5)*(0.30+0.08*breath);
    float low=exp(-pow((below-0.05)/0.05,2.0))*water*smoothstep(0.45,0.8,fbm(vec2(p.x*4.0-t*0.025,below*30.0)))*0.14;
    vec3 mistCol=mix(vec3(0.88,0.89,0.86),vec3(0.62,0.58,0.70),u_evening);
    col=mix(col,mistCol,clamp(mist+low,0.0,0.6));

    /* ---- slow light from the low sun, upper left ---- */
    vec2 sun=vec2(0.17,0.77);
    vec2 sv=(p-sun)*vec2(imageRatio,1.0);
    float sd=length(sv);
    float ang=atan(sv.y,sv.x);
    float rays=pow(noise(vec2(ang*9.0,t*0.06))*0.6+noise(vec2(ang*23.0,-t*0.045))*0.4,2.2);
    float shafts=rays*exp(-sd*2.2)*smoothstep(0.0,0.35,sd)*(1.0-u_evening*0.85);
    col+=vec3(1.0,0.86,0.62)*shafts*0.11;
    col+=vec3(1.0,0.83,0.58)*exp(-sd*7.0)*(0.05+0.035*breath)*(1.0-u_evening*0.7);

    /* ---- breath of light and evening grade ---- */
    col*=0.985+0.03*breath;
    vec3 dusk=col*vec3(0.80,0.79,0.95);
    dusk=mix(dusk,dusk*vec3(1.15,0.92,0.82),smoothstep(0.55,0.95,lum)*0.6);
    col=mix(col,dusk*0.92,u_evening);
    vec2 vq=v_uv-0.5;
    col*=1.0-dot(vq,vq)*0.28;
    gl_FragColor=vec4(col,1.0);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Landscape shader unavailable');return s;}
  function resize(){if(!gl||!ready)return;const ratio=Math.min(window.devicePixelRatio||1,1.5),width=Math.min(2000,Math.round(innerWidth*ratio)),height=Math.min(1400,Math.round(innerHeight*ratio));canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);gl.uniform2f(uniforms.u_resolution,width,height);draw();}
  function draw(){
    if(!ready||contextLost)return;
    gl.uniform1f(uniforms.u_time,time);gl.uniform1f(uniforms.u_evening,eveningMix);gl.uniform2f(uniforms.u_look,look.x,look.y);
    const data=new Float32Array(MAX_RIPPLES*4);ripples.forEach((r,i)=>{data[i*4]=r.x;data[i*4+1]=r.y;data[i*4+2]=r.t;data[i*4+3]=r.s;});
    gl.uniform4fv(uniforms.u_ripples,data);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function tick(now){
    frame=0;if(paused||document.hidden||!ready||contextLost)return;
    const dt=Math.min((now-last)/1000,0.1);last=now;time+=dt;
    eveningMix+=((evening?1:0)-eveningMix)*(1-Math.exp(-dt*0.9));
    look.x+=(look.tx-look.x)*(1-Math.exp(-dt*1.6));look.y+=(look.ty-look.y)*(1-Math.exp(-dt*1.6));
    for(let i=ripples.length-1;i>=0;i--)if(time-ripples[i].t>6)ripples.splice(i,1);
    draw();frame=requestAnimationFrame(tick);
  }
  function stop(){if(frame)cancelAnimationFrame(frame);frame=0;}
  function start(){stop();last=performance.now();if(ready&&!paused&&!document.hidden&&!contextLost)frame=requestAnimationFrame(tick);}
  function setPaused(value){paused=!!value;document.body.classList.toggle('motion-paused',paused);if(paused)stop();else start();}
  function setEvening(value){evening=!!value;document.body.classList.toggle('evening',evening);if(paused){eveningMix=evening?1:0;draw();}}
  /* map a screen point to photograph coordinates, mirroring the shader */
  function toImage(clientX,clientY){
    const vw=innerWidth,vh=innerHeight,viewRatio=vw/vh,imageRatio=imageW/imageH;let sx=1,sy=1;
    if(viewRatio>imageRatio)sy=imageRatio/viewRatio;else sx=viewRatio/imageRatio;
    const breath=0.5+0.5*Math.sin(time*0.6283),zoom=1.035+0.014*breath;
    const u=clientX/vw,v=1-clientY/vh,hx=0.5*sx/zoom,hy=0.5*sy/zoom;
    const cx=Math.min(Math.max(0.5+look.x*0.012,hx+0.003),1-hx-0.003),cy=Math.min(Math.max(0.56+look.y*0.008,hy+0.003),1-hy-0.003);
    return {x:(u-0.5)*sx/zoom+cx,y:(v-0.5)*sy/zoom+cy};
  }
  function isWater(pt){if(pt.y>0.612)return false;const x=pt.x;
    const top=x<0.065?0.453-(0.039*x/0.065):x<0.13?0.414-0.088*(x-0.065)/0.065:x<0.195?0.326-0.01*(x-0.13)/0.065:x<0.31?0.316-0.097*(x-0.195)/0.115:x<0.35?0.219*(1-(x-0.31)/0.04):-1;
    return pt.y>top+0.01;}
  function ripple(clientX,clientY,strength){
    if(!ready||paused)return false;const pt=toImage(clientX,clientY);if(!isWater(pt))return false;
    ripples.push({x:pt.x,y:pt.y,t:time,s:Math.max(0.05,Math.min(1,strength==null?1:strength))});
    while(ripples.length>MAX_RIPPLES)ripples.shift();
    return true;
  }
  function setLook(nx,ny){look.tx=Math.max(-1,Math.min(1,nx));look.ty=Math.max(-1,Math.min(1,ny));}
  window.SolisLandscape={setPaused,setEvening,ripple,setLook,isWaterAt:(x,y)=>ready&&isWater(toImage(x,y)),get paused(){return paused;},get ready(){return ready;}};
  document.body.classList.toggle('motion-paused',paused);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;stop();canvas.classList.remove('ready');});
  document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('page-hidden',document.hidden);if(document.hidden)stop();else start();});
  addEventListener('resize',resize);
  /* touch screens: a tap on open water leaves a ripple */
  addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const el=e.target;if(el&&el.closest&&el.closest('.content-section,.site-footer,dialog,a,button,.atmosphere-bar'))return;ripple(e.clientX,e.clientY,0.85);},{passive:true});
  try{
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Landscape program unavailable');gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const name of ['u_image','u_resolution','u_imageSize','u_time','u_evening','u_look'])uniforms[name]=gl.getUniformLocation(program,name);
    uniforms.u_ripples=gl.getUniformLocation(program,'u_ripples[0]')||gl.getUniformLocation(program,'u_ripples');
    const image=new Image();image.onload=()=>{try{imageW=image.naturalWidth;imageH=image.naturalHeight;texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(uniforms.u_image,0);gl.uniform2f(uniforms.u_imageSize,imageW,imageH);ready=true;resize();canvas.classList.add('ready');start();}catch{canvas.classList.remove('ready');ready=false;}};image.src=window.SOLIS_LAKE_SRC||'assets/lake.webp';
  }catch{canvas.classList.remove('ready');}
})();
