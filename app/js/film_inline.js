/* =========================================================================
   THE FILM, PLAYED LIVE.

   It was an embedded MP4 until the diagnostics came back saying the browser
   supported both codecs and still refused to load either a blob or a data
   URL — a sandboxed viewer blocking media, which no re-encoding fixes. So the
   film is not a video any more. This is the same deterministic renderer that
   produced the MP4, running in the page: renderFrame(t) draws the complete
   frame for absolute time t, and a rAF loop walks t forward.

   Nothing to decode, nothing to fetch, nothing a sandbox can block — and it
   costs 37 KB of source instead of 5 MB of base64, so the film ships in every
   copy of this file including the project one.

   Wrapped in an IIFE because it declares W, H, S, text() and other names the
   application also uses.
   ========================================================================= */
window.FILM = (function () {

/* ==========================================================================
   ANGEL SWARM — deterministic cinematic renderer.
   renderFrame(t) draws the complete frame for absolute time t (seconds).
   Nothing depends on wall-clock, so frames can be captured one at a time.
   ========================================================================== */
const W = 1920, H = 1080;          // logical design space
const SS = 2;                       // supersample factor — 3840x2160 backing store
const cv  = document.createElement('canvas'); cv.width=W*SS; cv.height=H*SS;
const ctx = cv.getContext('2d');
const outC = document.createElement('canvas'); outC.width=W; outC.height=H;
const octx = outC.getContext('2d');
octx.imageSmoothingEnabled = true;
octx.imageSmoothingQuality = 'high';

const C = {
  bg:'#05080d', ink:'#e6eef8', dim:'#8ea3ba', faint:'#4d5f74',
  angel:'#31d68a', current:'#f0813f', red:'#ff4257', amber:'#ffb340',
  blue:'#5bb4ff', white:'#ffffff'
};
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const SANS = 'ui-sans-serif, -apple-system, "Segoe UI", Inter, Roboto, sans-serif';

/* ------------------------------------------------------------- helpers -- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=(t)=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOut=(t)=>1-Math.pow(1-t,3);
const easeIn=(t)=>t*t*t;
// deterministic pseudo-random
function rnd(i){ let x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); }

/* Every caption in the first cut appeared, held for a beat and was gone before
   it could be read. HOLD stretches the plateau of every timing window without
   touching when things appear or how fast anything moves — so the reveals keep
   their snap and the frame stays up long enough to land. Scene durations below
   are stretched by the same factor. */
const HOLD = 1.55;
function fadeWin(t,start,dur,inD,outD){
  dur = dur * HOLD;
  const u=t-start;
  if(u<0||u>dur) return 0;
  const a = inD? clamp(u/inD,0,1):1;
  const b = outD? clamp((dur-u)/outD,0,1):1;
  return Math.min(a,b);
}

function text(str,x,y,{size=40,font=SANS,color=C.ink,align='left',weight='400',alpha=1,ls=0,baseline='alphabetic'}={}){
  ctx.save(); ctx.globalAlpha*=alpha;
  ctx.fillStyle=color; ctx.textAlign=ls?'left':align; ctx.textBaseline=baseline;
  ctx.font=`${weight} ${size}px ${font}`;
  if(ls){
    let total=0; for(const ch of str) total+=ctx.measureText(ch).width+ls;
    total-=ls;
    let cx = align==='center'? x-total/2 : align==='right'? x-total : x;
    for(const ch of str){ ctx.fillText(ch,cx,y); cx+=ctx.measureText(ch).width+ls; }
  } else ctx.fillText(str,x,y);
  ctx.restore();
}

function measure(str,size,font,weight,ls){
  ctx.font=`${weight||'400'} ${size}px ${font||SANS}`;
  if(!ls) return ctx.measureText(str).width;
  let total=0; for(const ch of str) total+=ctx.measureText(ch).width+ls;
  return total-ls;
}

/* typewriter reveal */
function typed(str,prog){
  const n=Math.floor(clamp(prog,0,1)*str.length);
  return str.slice(0,n);
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

/* ------------------------------------------------------------ chrome ---- */
function grid(alpha,t){
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.strokeStyle='rgba(90,130,165,0.10)'; ctx.lineWidth=1;
  const step=60, off=(t*6)%step;
  for(let x=-step+off;x<W+step;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=-step+off;y<H+step;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();
}
function vignette(){
  const g=ctx.createRadialGradient(W/2,H/2,H*0.30,W/2,H/2,H*0.92);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.72)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
function scanlines(alpha){ /* removed — it destroyed vertical resolution */ }
function cornerBrackets(alpha,label,t){
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.strokeStyle='rgba(120,160,195,0.45)'; ctx.lineWidth=2;
  const m=52,L=34;
  const pts=[[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]];
  for(const [x,y,dx,dy] of pts){
    ctx.beginPath(); ctx.moveTo(x+dx*L,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*L); ctx.stroke();
  }
  if(label){
    text(label, m+6, m-12, {size:15,font:MONO,color:'rgba(140,175,205,0.6)',ls:3});
    const blink = (Math.floor(t*1.6)%2)?1:0.25;
    ctx.globalAlpha*=blink;
    ctx.fillStyle=C.red; ctx.beginPath(); ctx.arc(W-m-8,m-17,5,0,7); ctx.fill();
    ctx.globalAlpha/=blink;
    text('REC', W-m-22, m-12, {size:14,font:MONO,color:'rgba(255,90,110,0.85)',align:'right',ls:2});
  }
  ctx.restore();
}
function radarSweep(cx,cy,r,t,alpha){
  ctx.save(); ctx.globalAlpha=alpha;
  for(let i=1;i<=4;i++){
    ctx.beginPath(); ctx.arc(cx,cy,r*i/4,0,7);
    ctx.strokeStyle='rgba(49,214,138,0.13)'; ctx.lineWidth=1; ctx.stroke();
  }
  const a=(t*0.62)%(Math.PI*2);
  const g=ctx.createConicGradient? null:null;
  for(let k=0;k<28;k++){
    const aa=a-k*0.028;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(aa)*r, cy+Math.sin(aa)*r);
    ctx.strokeStyle=`rgba(49,214,138,${0.16*(1-k/28)})`; ctx.lineWidth=2; ctx.stroke();
  }
  ctx.restore();
}

/* Lower-third source citation */
function source(str,alpha){
  if(alpha<=0) return;
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.fillStyle='rgba(130,170,205,0.6)'; ctx.fillRect(150,H-106,3,30);
  text(str,166,H-86,{size:18,font:MONO,color:'rgba(160,190,215,0.70)'});
  ctx.restore();
}

/* ============================== SCENE TABLE ============================== */
/* start, dur (seconds) */
/* DURATIONS ARE THE SOURCE OF TRUTH, STARTS ARE DERIVED.
   Every start used to be written out by hand beside its duration, so
   lengthening one scene meant editing nine numbers and the total, and getting
   one wrong desynchronises renderFrame's dispatch from the scene's own clock
   silently — the scene simply draws at the wrong u. The order and the lengths
   are declared once and the starts are added up. */
const ORDER = [
  ['open',      14],
  /* THE QUOTE IS THE ARGUMENT, so it is held long enough to be read twice and
     sat with. It was on screen 5.4 s; it is on screen 9.0 s. The scene grew
     to carry that and the blood standard that follows it. */
  ['golden',    17],
  ['title',     16],   /* logo lands late, strapline holds to the cut */
  ['whatis',    29],   /* three cards, long enough to actually read   */
  ['deadline',  20],
  /* THE SCENE THIS FILM WAS MISSING. The deadline scene explains what the
     number is. Nothing explained how it ARRIVES, which is the first question
     anyone who works in tactical medicine asks. It arrives over the telemetry
     the force already carries, and the film says so before it shows tasking
     acting on it. */
  ['telemetry', 18],
  ['tasking',   23],
  ['coldchain', 14],
  ['result',    21],
  ['close',     23]    /* ends on a held card, no fade                */
];
const S = {};
(function(){ let at = 0; for (const [k, d] of ORDER) { S[k] = { t: at, d: d }; at += d; } })();
const TOTAL = ORDER.reduce((n, x) => n + x[1], 0);

/* ============================== SCENE 1: OPEN ============================ */
function sceneOpen(t){
  const u=t-S.open.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.5,t);
  radarSweep(W/2,H/2,760,t,clamp(u/2,0,1)*0.75);

  /* HOLD stretches every window, which drove these two statements on top of
     one another. They are consecutive statements, so gate them explicitly:
     stat 1 owns the frame until CUT, then stat 2 does. */
  const CUT = 7.2;
  // Stat 1
  const a1 = u < CUT ? fadeWin(u,0.6,(CUT-1.0)/HOLD,0.7,0.8) : 0;
  if(a1>0){
    const big='87%';
    text(big,W/2,H/2-40,{size:210,font:MONO,weight:'800',color:C.red,align:'center',alpha:a1});
    text('OF BATTLEFIELD DEATHS HAPPEN BEFORE',W/2,H/2+52,{size:30,color:C.ink,align:'center',alpha:a1,ls:5,weight:'600'});
    text('THE CASUALTY EVER REACHES A DOCTOR',W/2,H/2+100,{size:30,color:C.ink,align:'center',alpha:a1,ls:5,weight:'600'});
    source('Eastridge et al., J Trauma Acute Care Surg 2012 — 4,596 battlefield fatalities',a1);
  }
  // Stat 2
  const a2 = u >= CUT ? fadeWin(u,CUT,(S.open.d-CUT-0.5)/HOLD,0.7,0.9) : 0;
  if(a2>0){
    text('ONE IN FOUR OF THEM',W/2,H/2-90,{size:34,color:C.dim,align:'center',alpha:a2,ls:6,weight:'600'});
    text('COULD HAVE LIVED',W/2,H/2+10,{size:112,font:MONO,weight:'800',color:C.white,align:'center',alpha:a2,ls:4});
    text('90% OF THEM BLED TO DEATH',W/2,H/2+92,{size:28,color:C.red,align:'center',alpha:a2,ls:5,weight:'600'});
  }
  cornerBrackets(clamp(u/1.4,0,1)*0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette(); scanlines(0.05);
}

/* ========================= SCENE 2: GOLDEN HOUR GONE ===================== */
function sceneGolden(t){
  const u=t-S.golden.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.35,t);

  // A clock face whose hand sweeps then the dial breaks
  const cx=W/2, cy=H/2-30, R=190;
  const app=clamp(u/1.0,0,1);
  ctx.save(); ctx.globalAlpha=app;
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7);
  ctx.strokeStyle='rgba(150,185,215,0.30)'; ctx.lineWidth=3; ctx.stroke();
  for(let i=0;i<60;i++){
    const a=i/60*Math.PI*2-Math.PI/2, big=i%5===0;
    const r1=R-(big?20:10), r2=R;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
    ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);
    ctx.strokeStyle=big?'rgba(160,195,225,0.55)':'rgba(160,195,225,0.22)';
    ctx.lineWidth=big?3:1.5; ctx.stroke();
  }
  // sweeping hand — accelerates, showing time running away
  const sweep=easeIn(clamp(u/4.2,0,1))*Math.PI*2*2.2;
  const ha=-Math.PI/2+sweep;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(ha)*(R-34),cy+Math.sin(ha)*(R-34));
  ctx.strokeStyle=C.red; ctx.lineWidth=5; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,8,0,7); ctx.fillStyle=C.red; ctx.fill();
  // "GOLDEN HOUR" struck through
  text('GOLDEN HOUR',cx,cy+8,{size:44,font:MONO,weight:'800',color:'rgba(230,238,248,0.9)',align:'center',ls:4,baseline:'middle'});
  const strike=clamp((u-3.4)/0.7,0,1);
  if(strike>0){
    const wdt=measure('GOLDEN HOUR',44,MONO,'800',4);
    ctx.strokeStyle=C.red; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(cx-wdt/2-14,cy+6); ctx.lineTo(cx-wdt/2-14+(wdt+28)*strike,cy+6); ctx.stroke();
  }
  ctx.restore();

  /* HELD. This is the sentence the whole film is answering, and it went by
     in five seconds. Nine now — long enough to read it twice and sit with
     what 72 hours means for a man who has under an hour. */
  const a1=fadeWin(u,4.3,5.8,0.6,0.9);
  if(a1>0){
    text('"We expect casualty evacuation to be delayed',W/2,H-282,{size:34,color:C.ink,align:'center',alpha:a1});
    text('greater than 72 hours, maybe even longer."',W/2,H-236,{size:34,color:C.ink,align:'center',alpha:a1});
    text('COL JASON CORLEY  //  DIRECTOR, ARMED SERVICES BLOOD PROGRAM  //  JUNE 2026',
         W/2,H-186,{size:16,font:MONO,color:C.faint,align:'center',alpha:a1,ls:3});
  }
  /* SIXTY MINUTES WAS NEVER THE BLOOD NUMBER. The Golden Hour is a Secretary
     of Defense mandate for EVACUATING a casualty to a treatment facility. The
     standard for getting blood INTO one is in DoD's own clinical guideline and
     it is shorter. Both figures are real; only one of them is about blood. */
  const a3=fadeWin(u,11.4,3.4,0.6,0.8);
  if(a3>0){
    text('AND SIXTY MINUTES WAS NEVER THE STANDARD FOR BLOOD',W/2,H-244,
         {size:26,font:MONO,color:'#ffd24a',align:'center',alpha:a3,ls:4,weight:'700'});
    text('THE GUIDELINE SAYS 36 MINUTES  ·  44% OF THESE CASUALTIES ARE ALREADY INSIDE IT',
         W/2,H-196,{size:19,font:MONO,color:C.dim,align:'center',alpha:a3,ls:2});
    source('JTS CPG ID 18, Damage Control Resuscitation, 12 Jul 2019 — "ideally within 36 minutes of injury"',a3*0.9);
  }
  cornerBrackets(0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette(); scanlines(0.05);
}

/* ============================== SCENE 3: TITLE ========================== */
function sceneTitle(t){
  const u=t-S.title.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);
  radarSweep(W/2,H/2,900,t,0.5);

  const a0=fadeWin(u,0,(S.title.d-0.5)/HOLD,0.5,0.8);
  // Line 1 / line 2 typewriter
  const p1=clamp((u-0.3)/1.5,0,1), p2=clamp((u-2.0)/1.5,0,1);
  text(typed('WE HAVE AUTONOMY FOR TAKING LIVES.',p1),W/2,H/2-170,
       {size:40,font:MONO,color:C.dim,align:'center',alpha:a0,ls:3,weight:'600'});
  text(typed('WE HAVE NONE FOR SAVING THEM.',p2),W/2,H/2-112,
       {size:40,font:MONO,color:C.red,align:'center',alpha:a0,ls:3,weight:'700'});

  // Logo build
  /* The logo used to arrive on the heels of the second line. Give the words
     time to be read first. */
  const la=clamp((u-6.2)/1.3,0,1);
  if(la>0){
    const size=lerp(96,116,easeOut(la));
    ctx.save(); ctx.globalAlpha=a0*la;
    const g=ctx.createLinearGradient(W/2-460,0,W/2+460,0);
    g.addColorStop(0,'#eafff7'); g.addColorStop(.55,'#31d68a'); g.addColorStop(1,'#3aa8ff');
    text('ANGEL SWARM',W/2,H/2+30,{size,font:MONO,weight:'800',color:g,align:'center',ls:14});
    ctx.restore();
    // underline sweep
    const uw=clamp((u-7.1)/1.0,0,1);
    ctx.save(); ctx.globalAlpha=a0;
    const lw=760*easeOut(uw);
    const lg=ctx.createLinearGradient(W/2-lw/2,0,W/2+lw/2,0);
    lg.addColorStop(0,'rgba(49,214,138,0)'); lg.addColorStop(.5,'rgba(49,214,138,0.95)'); lg.addColorStop(1,'rgba(58,168,255,0)');
    ctx.fillStyle=lg; ctx.fillRect(W/2-lw/2,H/2+58,lw,3);
    ctx.restore();
  }
  /* Strapline appears under the logo and stays until the cut. */
  const sa=fadeWin(u,8.2,(S.title.d-8.4)/HOLD,0.7,0.9);
  text('THE TASKING BRAIN FOR AUTONOMOUS MEDICAL DRONES',W/2,H/2+124,
       {size:24,color:C.dim,align:'center',alpha:sa,ls:7,weight:'600'});
  vignette(); scanlines(0.05);
}

/* ========================= SCENE 3b: WHAT IT IS =========================
   Before any mechanism, say plainly what the thing is and what it is for.
   Three cards and an arrow: the soldier has a clock, the software reads every
   clock and decides, the aircraft that already exist do the flying.
   ====================================================================== */
function sceneWhatIs(t){
  const u=t-S.whatis.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.34,t);

  const WI_END = S.whatis.d - 0.6;            // everything holds to the cut
  const head=fadeWin(u,0,WI_END/HOLD,0.6,0.9);
  text('SO WHAT IS IT?',150,132,{size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  const p1=clamp((u-0.5)/2.2,0,1);
  text(typed('ANGEL SWARM IS NOT AN AIRCRAFT.',p1),W/2,268,
       {size:44,font:MONO,color:C.dim,align:'center',alpha:head,ls:3,weight:'600'});
  const p2=clamp((u-2.6)/2.6,0,1);
  text(typed('IT IS THE PART THAT DECIDES WHERE THEY GO.',p2),W/2,332,
       {size:44,font:MONO,color:C.white,align:'center',alpha:head,ls:3,weight:'700'});

  const BW=470, BH=304, BY=418, GAP=60;
  const x0=(W-(BW*3+GAP*2))/2;
  const blocks=[
    { at:5.0, col:C.blue, line:'rgba(91,180,255,0.45)', tag:'1  ·  THE WOUNDED SOLDIER',
      big:'HAS A CLOCK',
      body:'A sensor reads the pulse in his finger and says how many minutes he has before his body gives out. Not a guess. A number, 18 minutes ahead on average.' },
    { at:6.9, col:C.angel, line:'rgba(49,214,138,0.45)', tag:'2  ·  ANGEL SWARM',
      big:'READS EVERY CLOCK',
      body:'Software, and only software. It sees every casualty\u2019s deadline at once, knows what each drone can carry and reach, and works out who is reached first, with what.' },
    { at:8.8, col:C.amber, line:'rgba(255,179,64,0.45)', tag:'3  ·  THE AIRCRAFT',
      big:'ALREADY EXIST',
      body:'Resupply drones are bought and flying today. Nothing new has to be invented. What is missing is the thing that tells them which soldier to reach first.' }
  ];

  blocks.forEach((b,i)=>{
    const a=fadeWin(u,b.at,(WI_END-b.at)/HOLD,0.75,1.0)*head;
    if(a<=0) return;
    const bx=x0+i*(BW+GAP);
    const rise=lerp(26,0,easeOut(clamp((u-b.at)/0.8,0,1)));
    ctx.save(); ctx.globalAlpha=a; ctx.translate(0,rise);
    ctx.fillStyle='rgba(9,15,23,0.88)'; roundRect(bx,BY,BW,BH,14); ctx.fill();
    ctx.strokeStyle=b.line; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=b.col; ctx.fillRect(bx+28,BY+32,54,4);
    ctx.restore();

    text(b.tag,bx+28,BY+rise+76,{size:17,font:MONO,color:b.col,ls:3,weight:'700',alpha:a});
    text(b.big,bx+28,BY+rise+130,{size:38,font:MONO,color:C.white,ls:1,weight:'800',alpha:a});

    const words=b.body.split(' ');
    let line='', ly=BY+rise+182;
    ctx.font='400 21px '+SANS;
    for(const w of words){
      const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>BW-58 && line){
        text(line,bx+28,ly,{size:21,font:SANS,color:C.dim,alpha:a}); line=w; ly+=31;
      } else line=test;
    }
    if(line) text(line,bx+28,ly,{size:21,font:SANS,color:C.dim,alpha:a});

    if(i<2){
      const aa=fadeWin(u,b.at+1.4,(WI_END-b.at-1.4)/HOLD,0.5,1.0)*head;
      if(aa>0){
        ctx.save(); ctx.globalAlpha=aa*0.85;
        const ax=bx+BW+12, ay=BY+BH/2;
        ctx.strokeStyle='rgba(150,185,215,0.65)'; ctx.lineWidth=2.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+GAP-22,ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax+GAP-32,ay-8); ctx.lineTo(ax+GAP-22,ay); ctx.lineTo(ax+GAP-32,ay+8);
        ctx.stroke(); ctx.restore();
      }
    }
  });

  const pa=fadeWin(u,10.6,(WI_END-10.6)/HOLD,0.8,1.0)*head;
  if(pa>0){
    ctx.save(); ctx.globalAlpha=pa;
    ctx.fillStyle='rgba(255,66,87,0.08)'; roundRect(x0,BY+BH+42,BW*3+GAP*2,110,12); ctx.fill();
    ctx.strokeStyle='rgba(255,66,87,0.36)'; ctx.lineWidth=2; ctx.stroke();
    ctx.restore();
    text('THE PROBLEM IT SOLVES',x0+36,BY+BH+84,
         {size:16,font:MONO,color:C.red,alpha:pa,ls:4,weight:'700'});
    text('Today a person picks who gets the next aircraft, from a paper triage card, not knowing how long anyone actually has.',
         x0+36,BY+BH+128,{size:24,font:SANS,color:C.ink,alpha:pa});
  }

  cornerBrackets(0.8,'ANGEL SWARM // WHAT IT IS',t);
  vignette();
}

/* ===================== SCENE 4: PHYSIOLOGICAL DEADLINE ================== */
function sceneDeadline(t){
  const u=t-S.deadline.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);

  const head=fadeWin(u,0,13,0.6,0.8);
  text('01  /  THE WEARABLE DOESN’T REPORT. IT PREDICTS.',150,132,
       {size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  // ---- Left: vital signs look normal, then crash (the trap) ----
  const boxA={x:150,y:210,w:740,h:330};
  ctx.save(); ctx.globalAlpha=head;
  ctx.strokeStyle='rgba(120,150,180,0.22)'; ctx.lineWidth=1.5;
  roundRect(boxA.x,boxA.y,boxA.w,boxA.h,8); ctx.stroke();
  text('VITAL SIGNS  //  WHAT TRIAGE SEES TODAY',boxA.x+22,boxA.y+38,
       {size:16,font:MONO,color:C.faint,ls:3});

  // ECG-ish trace, normal until a late collapse
  const prog=clamp((u-0.8)/8.5,0,1);
  const crashAt=0.74;
  ctx.beginPath();
  const y0=boxA.y+190;
  for(let i=0;i<=Math.floor(prog*700);i++){
    const px=boxA.x+30+i, f=i/700;
    let amp=1;
    if(f>crashAt) amp=Math.max(0.05,1-(f-crashAt)/(1-crashAt)*1.25);
    const beat=((i%46)/46);
    let v=0;
    if(beat<0.08) v=-Math.sin(beat/0.08*Math.PI)*0.28;
    else if(beat<0.16) v=Math.sin((beat-0.08)/0.08*Math.PI)*1.0;
    else if(beat<0.26) v=-Math.sin((beat-0.16)/0.10*Math.PI)*0.34;
    else v=Math.sin(beat*10)*0.03;
    const py=y0 - v*78*amp;
    i? ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.strokeStyle=prog>crashAt?C.red:'#63e39a'; ctx.lineWidth=2.6; ctx.stroke();

  const crashA=clamp((u-7.4)/0.5,0,1);
  const normA=fadeWin(u,1.6,5.4,0.5,0.6)*(1-crashA);
  if(normA>0){
    text('HR 88    BP 122/78    SpO2 98%',boxA.x+30,boxA.y+256,
         {size:25,font:MONO,color:'#9fe8c4',alpha:normA*head});
    text('READS AS STABLE',boxA.x+30,boxA.y+292,
         {size:16,font:MONO,color:C.faint,alpha:normA*head,ls:3});
  }
  if(crashA>0){
    text('HR 141   BP 68/40   DECOMPENSATED',boxA.x+30,boxA.y+256,
         {size:25,font:MONO,color:C.red,alpha:crashA*head});
    text('NO WARNING — THE CRASH IS THE FIRST SIGN',boxA.x+30,boxA.y+292,
         {size:16,font:MONO,color:C.red,alpha:crashA*head,ls:3});
  }
  ctx.restore();

  // ---- Right: compensatory reserve falls early ----
  const boxB={x:1030,y:210,w:740,h:330};
  const bA=fadeWin(u,2.6,10.4,0.7,0.8);
  if(bA>0){
    ctx.save(); ctx.globalAlpha=bA;
    ctx.strokeStyle='rgba(49,214,138,0.35)'; ctx.lineWidth=1.5;
    roundRect(boxB.x,boxB.y,boxB.w,boxB.h,8); ctx.stroke();
    text('COMPENSATORY RESERVE  //  WHAT ANGEL SWARM SEES',boxB.x+22,boxB.y+38,
         {size:16,font:MONO,color:C.angel,ls:3});

    const p=clamp((u-3.0)/6.4,0,1);
    const PX=boxB.x+60, PY=boxB.y+96, PW=470, PH=150;   // plot rect
    ctx.strokeStyle='rgba(120,150,180,0.20)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PX,PY); ctx.lineTo(PX,PY+PH); ctx.lineTo(PX+PW,PY+PH); ctx.stroke();
    // threshold band
    ctx.fillStyle='rgba(255,66,87,0.12)';
    ctx.fillRect(PX,PY+PH-0.40*PH,PW,0.40*PH);
    text('40%  COLLAPSE THRESHOLD',PX+8,PY+PH-0.40*PH-9,{size:13,font:MONO,color:'rgba(255,120,140,0.85)',ls:2});

    ctx.beginPath();
    for(let i=0;i<=Math.floor(p*PW);i++){
      const f=i/PW;
      const v=clamp(1-Math.pow(f,1.35)*1.02,0,1);
      const px=PX+i, py=PY+PH-v*PH;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    const vNow=clamp(1-Math.pow(p,1.35)*1.02,0,1);
    const vcol=vNow<0.4?C.red:vNow<0.7?C.amber:C.angel;
    ctx.strokeStyle=vcol; ctx.lineWidth=3.4; ctx.stroke();
    const hx=PX+p*PW, hy=PY+PH-vNow*PH;
    ctx.beginPath(); ctx.arc(hx,hy,7,0,7); ctx.fillStyle=vcol; ctx.fill();

    text(Math.round(vNow*100)+'%',boxB.x+boxB.w-34,PY+66,
         {size:66,font:MONO,weight:'800',color:vcol,align:'right'});
    text('RESERVE REMAINING',boxB.x+boxB.w-34,PY+96,{size:13,font:MONO,color:C.faint,align:'right',ls:2});
    text('PREDICTS COLLAPSE 18.3 ± 7.9 MIN AHEAD',boxB.x+30,boxB.y+292,
         {size:16,font:MONO,color:'#9fe8c4',ls:3});
    ctx.restore();
  }

  // ---- The countdown payoff ----
  const cA=fadeWin(u,6.6,6.4,0.7,0.9);
  if(cA>0){
    const mins=Math.max(0,19-Math.floor((u-6.6)*1.6));
    ctx.save(); ctx.globalAlpha=cA;
    const bw=980,bx=W/2-bw/2,by=640;
    ctx.fillStyle='rgba(60,8,16,0.55)'; roundRect(bx,by,bw,120,10); ctx.fill();
    ctx.strokeStyle='rgba(255,66,87,0.7)'; ctx.lineWidth=2; ctx.stroke();
    text('CASUALTY 14  //  PREDICTED COLLAPSE IN',bx+34,by+50,{size:24,font:MONO,color:'#ffb9c2',ls:3});
    text(mins+' MIN',bx+bw-34,by+78,{size:74,font:MONO,weight:'800',color:C.red,align:'right'});
    ctx.restore();
  }
  const dA=fadeWin(u,8.6,4.4,0.7,0.9);
  if(dA>0){
    text('ONE CLOCK EACH, NOT ONE HOUR FOR ALL.',W/2,850,
         {size:38,color:C.dim,align:'center',alpha:dA,ls:4,weight:'600'});
    text('IT BECOMES A SCHEDULING PROBLEM.',W/2,906,
         {size:44,color:C.white,align:'center',alpha:dA,ls:4,weight:'700'});
    text('AND SCHEDULING PROBLEMS HAVE OPTIMAL ANSWERS.',W/2,958,
         {size:24,color:C.angel,align:'center',alpha:dA,ls:5,weight:'600'});
  }
  source('Compensatory Reserve Measurement, U.S. Army Institute of Surgical Research — lead time 18.30 ± 7.94 min, Ortiz et al., Front Bioeng Biotechnol 2026;14:1756626',head*0.9);
  cornerBrackets(0.7,'ANGEL SWARM // MECHANISM',t);
  vignette(); scanlines(0.05);
}

/* ========================= SCENE 5: THE TASKING ========================= */
/* A small deterministic tableau: casualties with deadlines, three aircraft,
   constraints being checked, routes snapping into place. */
const CAS=[
  {x:1360,y:392,dl:11,tier:'ASM (buddy)',need:'HEM KIT',cls:'IMM'},
  {x:1560,y:596,dl:38,tier:'CLS',need:'PLASMA',cls:'DEL'},
  {x:1240,y:700,dl:19,tier:'Combat Medic',need:'BLOOD',cls:'IMM'},
  {x:1620,y:318,dl:74,tier:'ASM (buddy)',need:'HEM KIT',cls:'DEL'},
  {x:1420,y:812,dl:9, tier:'CLS',need:'PLASMA',cls:'IMM'}
];
const AIR=[{x:880,y:420,id:'TRV-2'},{x:850,y:640,id:'M25-4'},{x:900,y:840,id:'FVR-7'}];
const ASSIGN=[{a:0,c:[0,3]},{a:1,c:[4]},{a:2,c:[2]}];


/* ========================= SCENE 5b: TELEMETRY ==========================
   How the reading gets there.

   Every other scene in this film describes what the system DOES with a
   physiological deadline. None of them said where the number came from, and
   for most of this prototype's life the answer was that it came from the
   simulation's own memory — which demonstrates the tasking logic and
   demonstrates nothing about acquisition. This scene exists because that hole
   is now closed, and because a film that shows tasking without showing
   acquisition invites exactly the question it cannot answer.

   The beat structure is deliberate: devices report, the count climbs, and
   then THE FEED IS CUT and the tasking keeps running. The cut is the point.
   ======================================================================== */
function sceneTelemetry(t){
  const u=t-S.telemetry.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.26,t);
  const head=fadeWin(u,0,S.telemetry.d-0.5,0.6,0.8);
  text('02b /  THE READING HAS TO GET THERE.',150,132,
       {size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  /* ---- the three tiers, drawn as a chain ---- */
  const chain=fadeWin(u,0.5,S.telemetry.d-1.2,0.7,0.8);
  if(chain>0){
    ctx.save(); ctx.globalAlpha=chain;
    const tiers=[
      ['MONITOR ON THE SOLDIER','compensatory reserve, at the edge',C.red],
      ['TACTICAL NETWORK','the feed the force already carries',C.blue],
      ['ANGEL SWARM','decides here, on this tier',C.angel]
    ];
    const bw=520, gap=80, x0=W/2-(bw*3+gap*2)/2, y0=232;
    for(let i=0;i<3;i++){
      const app=clamp((u-0.7-i*0.55)/0.6,0,1);
      if(app<=0) continue;
      const bx=x0+i*(bw+gap);
      ctx.save(); ctx.globalAlpha=chain*app;
      ctx.fillStyle='rgba(12,22,32,0.82)'; roundRect(bx,y0,bw,116,10); ctx.fill();
      ctx.strokeStyle=tiers[i][2]; ctx.lineWidth=2; ctx.stroke();
      text(tiers[i][0],bx+26,y0+50,{size:24,font:MONO,color:tiers[i][2],ls:2,weight:'700'});
      text(tiers[i][1],bx+26,y0+86,{size:18,font:MONO,color:C.faint,ls:1});
      ctx.restore();
      if(i<2){
        const fa=clamp((u-1.05-i*0.55)/0.5,0,1);
        if(fa>0){
          ctx.save(); ctx.globalAlpha=chain*fa;
          ctx.strokeStyle='rgba(140,175,210,0.55)'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(bx+bw+14,y0+58); ctx.lineTo(bx+bw+gap-14,y0+58); ctx.stroke();
          text('▶',bx+bw+gap-20,y0+66,{size:20,font:MONO,color:'rgba(140,175,210,0.75)'});
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  /* ---- the wire format, named ---- */
  const fmt=fadeWin(u,3.0,S.telemetry.d-3.6,0.6,0.8);
  if(fmt>0){
    text('CURSOR ON TARGET  ·  THE FORMAT TAK ALREADY CARRIES',W/2,412,
         {size:26,font:MONO,color:C.dim,align:'center',alpha:fmt,ls:3,weight:'600'});
    text('A WEARABLE THAT REACHES ATAK OR BATDOK REACHES THIS',W/2,452,
         {size:20,font:MONO,color:C.faint,align:'center',alpha:fmt,ls:2});
  }

  /* ---- the live counter, then the cut ---- */
  const CUT=10.2;                         /* the feed dies here */
  const live=fadeWin(u,4.6,S.telemetry.d-5.2,0.6,0.9);
  if(live>0){
    const on = u<CUT;
    const ramp=clamp((u-4.8)/3.0,0,1);
    const dev=Math.round(lerp(0,125,easeOut(ramp)));
    const rate=on?(6.2*ramp):0;
    const bx=W/2-560, by=520, bw=1120, bh=176;
    ctx.save(); ctx.globalAlpha=live;
    ctx.fillStyle='rgba(8,18,26,0.86)'; roundRect(bx,by,bw,bh,10); ctx.fill();
    ctx.strokeStyle=on?'rgba(49,214,138,0.65)':'rgba(255,66,87,0.75)'; ctx.lineWidth=2; ctx.stroke();

    /* the pulsing state dot — the one thing on screen that changes colour */
    const pulse=on?(0.55+0.45*Math.abs(Math.sin(u*3.1))):1;
    ctx.fillStyle=on?C.angel:C.red; ctx.globalAlpha=live*pulse;
    ctx.beginPath(); ctx.arc(bx+40,by+46,11,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=live;

    text(on?'LINK LIVE':'LINK DOWN',bx+68,by+56,
         {size:28,font:MONO,color:on?C.angel:C.red,ls:3,weight:'800'});
    text(on?(dev+' DEVICES REPORTING'):'0 DEVICES REPORTING',bx+340,by+56,
         {size:24,font:MONO,color:C.ink,ls:2,weight:'600'});
    text(on?(rate.toFixed(1)+' MSG/S'):'FEED CUT',bx+820,by+56,
         {size:24,font:MONO,color:on?C.dim:C.red,ls:2,weight:'600'});

    /* a running strip of arriving readings */
    for(let i=0;i<26;i++){
      const bxx=bx+34+i*42;
      const seed=rnd(i*7+Math.floor(u*2));
      const hgt=on?(16+seed*54):(6+rnd(i*13)*10);
      ctx.fillStyle=on?'rgba(49,214,138,'+(0.30+seed*0.5)+')':'rgba(120,140,160,0.22)';
      roundRect(bxx,by+150-hgt,22,hgt,3); ctx.fill();
    }
    ctx.restore();

    if(!on){
      const gone=clamp((u-CUT)/0.5,0,1);
      text('THE TASKING LAYER KEEPS RUNNING ON LAST-KNOWN STATE.',W/2,760,
           {size:32,color:C.white,align:'center',alpha:gone*live,ls:3,weight:'700'});
      text('THAT IS THE BEHAVIOUR THE WHOLE CONCEPT RESTS ON.',W/2,806,
           {size:22,font:MONO,color:C.dim,align:'center',alpha:gone*live,ls:3});
    } else {
      const on2=fadeWin(u,6.4,3.2,0.6,0.6);
      if(on2>0){
        text('NO DEPENDENCY ON ENTERPRISE REACHBACK TO DECIDE.',W/2,772,
             {size:26,font:MONO,color:C.angel,align:'center',alpha:on2*live,ls:3,weight:'700'});
      }
    }
  }

  source('Cursor on Target over the tactical network  ·  BATDOK and ATAK are the existing integration surface  ·  prototype detail extension, not a ratified schema',head*0.9);
  cornerBrackets(0.7,'ANGEL SWARM // TELEMETRY INGEST',t);
  vignette(); scanlines(0.05);
}

function sceneTasking(t){
  const u=t-S.tasking.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.28,t);

  const head=fadeWin(u,0,15,0.6,0.8);
  text('02  /  EVERY CASUALTY IS A DEADLINE. EVERY AIRCRAFT IS A CONSTRAINT.',150,132,
       {size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  // Launch point
  const lpA=clamp(u/0.8,0,1);
  ctx.save(); ctx.globalAlpha=head*lpA;
  roundRect(790,300,190,700,10); ctx.strokeStyle='rgba(49,214,138,0.20)'; ctx.lineWidth=1.5; ctx.stroke();
  text('FORWARD LAUNCH POINT',790,286,{size:14,font:MONO,color:C.faint,ls:3});
  ctx.restore();

  // Casualties appear
  CAS.forEach((c,i)=>{
    const a=fadeWin(u,0.5+i*0.32,14,0.45,0.8)*head;
    if(a<=0) return;
    ctx.save(); ctx.globalAlpha=a;
    const elapsed=Math.max(0,u-(0.5+i*0.32));
    const left=Math.max(0,c.dl-elapsed*1.15);
    const frac=clamp(left/c.dl,0,1);
    const col=frac<0.4?C.red:frac<0.7?C.amber:C.blue;
    // ring
    ctx.beginPath(); ctx.arc(c.x,c.y,26,0,7);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=5; ctx.stroke();
    ctx.beginPath(); ctx.arc(c.x,c.y,26,-Math.PI/2,-Math.PI/2+frac*Math.PI*2);
    ctx.strokeStyle=col; ctx.lineWidth=5; ctx.stroke();
    ctx.beginPath(); ctx.arc(c.x,c.y,11,0,7); ctx.fillStyle=col; ctx.fill();
    // countdown
    text(Math.round(left)+' MIN',c.x+40,c.y-6,{size:24,font:MONO,weight:'700',color:col,baseline:'middle'});
    text(c.tier.toUpperCase(),c.x+40,c.y+20,{size:14,font:MONO,color:C.faint,ls:2,baseline:'middle'});
    ctx.restore();
  });

  // Aircraft + routes snapping in
  const rA=clamp((u-4.2)/0.9,0,1);
  AIR.forEach((d,i)=>{
    const a=fadeWin(u,1.6+i*0.25,14,0.4,0.8)*head;
    if(a<=0) return;
    ctx.save(); ctx.globalAlpha=a;
    // route
    if(rA>0){
      const asg=ASSIGN[i];
      let px=d.x,py=d.y;
      ctx.setLineDash([9,8]); ctx.strokeStyle=`rgba(49,214,138,${0.75*rA})`; ctx.lineWidth=2.2;
      ctx.beginPath(); ctx.moveTo(px,py);
      asg.c.forEach(ci=>{ ctx.lineTo(lerp(px,CAS[ci].x,rA), lerp(py,CAS[ci].y,rA)); px=CAS[ci].x; py=CAS[ci].y; });
      ctx.stroke(); ctx.setLineDash([]);
    }
    // airframe
    const tgt=CAS[ASSIGN[i].c[0]];
    const ang=Math.atan2(tgt.y-d.y,tgt.x-d.x);
    const fly=clamp((u-5.4)/6.0,0,1)*0.55;
    const dx=lerp(d.x,tgt.x,fly), dy=lerp(d.y,tgt.y,fly);
    ctx.translate(dx,dy); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(26,0); ctx.lineTo(-17,15); ctx.lineTo(-8,0); ctx.lineTo(-17,-15); ctx.closePath();
    ctx.fillStyle=C.angel; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2; ctx.stroke();
    ctx.rotate(-ang);
    text(d.id,34,-14,{size:17,font:MONO,weight:'700',color:'#eaf4ff'});
    text(CAS[ASSIGN[i].c[0]].need,34,10,{size:15,font:MONO,color:'#bfe9d4'});
    ctx.restore();
  });

  // Constraint checklist
  const items=[
    ['ARRIVES BEFORE PHYSIOLOGICAL COLLAPSE', 5.6],
    ['RESPONDER ON SCENE IS TRAINED TO ADMINISTER IT', 6.5],
    ['COLD CHAIN INTACT ON ARRIVAL', 7.4],
    ['TXA INSIDE THE 3-HOUR WINDOW', 8.3],
    ['UNIT ACTUALLY IN STOCK AT THE LAUNCH POINT', 9.2],
    ['ROUTE SURVIVES THE THREAT ENVELOPE', 10.1]
  ];
  const cl=fadeWin(u,5.2,9.4,0.5,0.9)*head;
  if(cl>0){
    ctx.save(); ctx.globalAlpha=cl;
    text('CONSTRAINTS CHECKED, PER LEG, AT ARRIVAL TIME',150,236,{size:15,font:MONO,color:C.faint,ls:3});
    items.forEach((it,i)=>{
      const on=u>it[1];
      const ia=clamp((u-it[1])/0.35,0,1);
      const y=290+i*46;
      ctx.globalAlpha=cl*(0.28+0.72*ia);
      // check box
      ctx.strokeStyle=on?C.angel:'rgba(120,150,180,0.35)'; ctx.lineWidth=2;
      roundRect(152,y-16,22,22,4); ctx.stroke();
      if(on){
        ctx.strokeStyle=C.angel; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(157,y-5); ctx.lineTo(162,y+1); ctx.lineTo(170,y-11); ctx.stroke();
      }
      text(it[0],188,y+1,{size:15.5,font:MONO,color:on?'#cfe3f4':C.faint,ls:0.5,baseline:'middle'});
    });
    ctx.restore();
  }

  const fin=fadeWin(u,11.2,3.8,0.7,0.9);
  if(fin>0){
    ctx.save(); ctx.globalAlpha=fin;
    ctx.fillStyle='rgba(6,20,14,0.72)'; roundRect(150,880,1620,116,10); ctx.fill();
    ctx.strokeStyle='rgba(49,214,138,0.55)'; ctx.lineWidth=2; ctx.stroke();
    text('SOLVE FOR MAXIMUM EXPECTED LIVES SAVED. RE-SOLVE EVERY FEW SECONDS.',
         W/2,928,{size:30,font:MONO,weight:'700',color:'#9df3c9',align:'center',ls:2});
    text('AS CASUALTIES DETERIORATE, AIRCRAFT ARE LOST, AND NEW WOUNDED APPEAR.',
         W/2,968,{size:19,font:MONO,color:C.dim,align:'center',ls:2});
    ctx.restore();
  }
  cornerBrackets(0.7,'ANGEL SWARM // TASKING',t);
  vignette(); scanlines(0.05);
}

/* ========================== SCENE 6: COLD CHAIN ========================= */
function sceneCold(t){
  const u=t-S.coldchain.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.28,t);
  const head=fadeWin(u,0,9,0.6,0.8);
  text('03  /  THE CARGO EXPIRES IN FLIGHT.',150,132,{size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  // thermometer
  const p=clamp((u-0.6)/4.0,0,1);
  const temp=lerp(3.2,12.4,p);
  const bx=W/2-380, by=300, bw=760, bh=64;
  ctx.save(); ctx.globalAlpha=head;
  roundRect(bx,by,bw,bh,32); ctx.fillStyle='rgba(20,32,44,0.8)'; ctx.fill();
  ctx.strokeStyle='rgba(120,150,180,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
  // safe band 1-10 of 0-16 scale
  const sx=bx+(1/16)*bw, sw=((10-1)/16)*bw;
  ctx.fillStyle='rgba(49,214,138,0.16)'; roundRect(sx,by,sw,bh,0); ctx.fill();
  text('TRANSFUSABLE BAND  1–10 °C',sx+14,by-16,{size:16,font:MONO,color:'rgba(120,230,180,0.85)',ls:2});
  // marker
  const mx=bx+(temp/16)*bw;
  ctx.fillStyle=temp>10?C.red:C.angel;
  roundRect(mx-4,by-12,8,bh+24,4); ctx.fill();
  text(temp.toFixed(1)+' °C',mx,by+bh+52,{size:44,font:MONO,weight:'800',
       color:temp>10?C.red:C.angel,align:'center'});
  ctx.restore();

  const warn=clamp((u-2.9)/0.4,0,1);
  if(warn>0){
    text('WHOLE BLOOD WOULD ARRIVE OUTSIDE THE BAND',W/2,470,
         {size:30,color:C.red,align:'center',alpha:warn*head,ls:3,weight:'700'});
    text('TODAY THE TEMPERATURE LOGGER IS READ AFTER THE PACKAGE LANDS.',W/2,516,
         {size:20,font:MONO,color:C.dim,align:'center',alpha:warn*head,ls:2});
  }

  const swap=fadeWin(u,4.3,4.6,0.6,0.9);
  if(swap>0){
    ctx.save(); ctx.globalAlpha=swap;
    const cw=1180, cx0=W/2-cw/2, cy0=600;
    ctx.fillStyle='rgba(6,20,26,0.75)'; roundRect(cx0,cy0,cw,180,10); ctx.fill();
    ctx.strokeStyle='rgba(111,220,240,0.6)'; ctx.lineWidth=2; ctx.stroke();
    text('ANGEL SWARM SUBSTITUTES IN FLIGHT',cx0+36,cy0+52,
         {size:24,font:MONO,color:'#6fdcf0',ls:3,weight:'700'});
    // blood -> plasma
    text('WHOLE BLOOD',cx0+36,cy0+112,{size:30,font:MONO,color:'rgba(255,120,140,0.55)'});
    const wdt=measure('WHOLE BLOOD',30,MONO,'400',0);
    ctx.strokeStyle=C.red; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(cx0+34,cy0+103); ctx.lineTo(cx0+38+wdt,cy0+103); ctx.stroke();
    text('→',cx0+70+wdt,cy0+112,{size:30,font:MONO,color:C.dim});
    text('FREEZE-DRIED PLASMA',cx0+120+wdt,cy0+112,{size:30,font:MONO,color:'#9df3c9',weight:'700'});
    text('NO COLD CHAIN  ·  RECONSTITUTES IN 1–5 MIN  ·  UNIT PRESERVED',
         cx0+36,cy0+152,{size:17,font:MONO,color:C.faint,ls:2});
    ctx.restore();
  }
  source('JTS, Aerial Delivery of Fresh and Stored Blood Products, 1 Dec 2025  ·  EZPLAZ freeze-dried plasma, FDA-licensed 29 Jul 2026',head*0.9);
  cornerBrackets(0.7,'ANGEL SWARM // COLD CHAIN',t);
  vignette(); scanlines(0.05);
}

/* ============================ SCENE 7: RESULT =========================== */
function sceneResult(t){
  const u=t-S.result.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.25,t);
  const head=fadeWin(u,0,14,0.6,0.8);
  text('04  /  SAME BATTLE. SAME AIRCRAFT. SAME BLOOD.',150,132,
       {size:22,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  // Two panels
  const p=clamp((u-0.6)/7.0,0,1);
  const panels=[
    {x:170,label:'ANGEL SWARM',col:C.angel,deaths:23,saved:'reached in time',waste:0,blood:0},
    {x:1010,label:'CURRENT — TRIAGE & PROXIMITY',col:C.current,deaths:34,saved:'reached in time',waste:45,blood:28}
  ];
  panels.forEach((pn,pi)=>{
    const a=fadeWin(u,0.3+pi*0.25,13.4,0.5,0.8)*head;
    if(a<=0) return;
    ctx.save(); ctx.globalAlpha=a;
    const pw=740, ph=530, py=196;
    ctx.fillStyle='rgba(10,16,22,0.6)'; roundRect(pn.x,py,pw,ph,10); ctx.fill();
    ctx.strokeStyle=pn.col+'66'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=pn.col; ctx.fillRect(pn.x,py,pw,4);
    text(pn.label,pn.x+30,py+56,{size:26,font:MONO,weight:'800',color:pn.col,ls:4});

    // deterministic casualty field
    const N=64;
    for(let i=0;i<N;i++){
      const gx=pn.x+70+(i%8)*82, gy=py+118+Math.floor(i/8)*40;
      const dieThresh = pi===0? 0.31 : 0.48;
      const r=rnd(i*3.7+pi*11);
      const resolved = p > (i+1)/N;
      if(!resolved){
        ctx.beginPath(); ctx.arc(gx,gy,7,0,7); ctx.fillStyle='rgba(91,180,255,0.45)'; ctx.fill();
      } else if(r<dieThresh){
        ctx.strokeStyle=C.red; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(gx-7,gy-7); ctx.lineTo(gx+7,gy+7);
        ctx.moveTo(gx+7,gy-7); ctx.lineTo(gx-7,gy+7); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(gx,gy,7,0,7);
        ctx.fillStyle='rgba(45,190,110,0.30)'; ctx.fill();
        ctx.strokeStyle='rgba(61,220,132,0.85)'; ctx.lineWidth=1.6; ctx.stroke();
      }
    }
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pn.x+30,py+ph-128); ctx.lineTo(pn.x+pw-30,py+ph-128); ctx.stroke();
    const n=Math.round(pn.deaths*p);
    text(String(n),pn.x+30,py+ph-46,{size:76,font:MONO,weight:'800',color:pn.col});
    const nw=measure(String(n),76,MONO,'800',0);
    text('DIED OF',pn.x+40+nw,py+ph-72,{size:17,font:MONO,color:C.dim,ls:2});
    text('SURVIVABLE WOUNDS',pn.x+40+nw,py+ph-48,{size:17,font:MONO,color:C.dim,ls:2});
    text(`${Math.round(pn.waste*p)} WASTED SORTIES   ${Math.round(pn.blood*p)} BLOOD UNITS LOST`,
         pn.x+30,py+ph-16,{size:15,font:MONO,color:C.faint,ls:1});
    ctx.restore();
  });

  // Verdict
  const v=fadeWin(u,7.6,6.4,0.7,0.9);
  if(v>0){
    ctx.save(); ctx.globalAlpha=v;
    ctx.fillStyle='rgba(6,20,14,0.8)'; roundRect(170,730,1580,200,12); ctx.fill();
    ctx.strokeStyle='rgba(49,214,138,0.6)'; ctx.lineWidth=2; ctx.stroke();
    const grow=easeOut(clamp((u-7.9)/1.1,0,1));
    text(Math.round(28*grow)+'',260,860,{size:104,font:MONO,weight:'800',color:'#4ff0a3',align:'center'});
    text('UNITS OF BLOOD NOT DESTROYED',420,814,{size:34,color:C.white,ls:3,weight:'700'});
    text('95% OF DELIVERIES REACH SOMEONE WHO CAN USE THEM, AGAINST 34%',
         420,856,{size:19,font:MONO,color:C.dim,ls:2});
    text('18% FEWER PREVENTABLE DEATHS  ·  BETTER IN 40 OF 40 PAIRED RUNS  ·  95% CI 15–20%',
         420,892,{size:19,font:MONO,color:'#9df3c9',ls:2});
    ctx.restore();
  }
  cornerBrackets(0.7,'ANGEL SWARM // RESULT',t);
  vignette(); scanlines(0.05);
}

/* ============================= SCENE 8: CLOSE =========================== */
function sceneClose(t){
  const u=t-S.close.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);
  radarSweep(W/2,H/2,900,t,0.45);

  /* The card is composed low so the emblem and the two policy lines have room
     above it. Once they have been read, the whole thing rises until ANGEL
     SWARM sits on the centre line, and holds there for the rest of the film —
     no fade. The last thing on screen is the name. */
  const RISE_AT = 11.0, RISE_DUR = 1.8;
  const rise = easeOut(clamp((u - RISE_AT) / RISE_DUR, 0, 1));
  const LIFT = 300;                       // puts the wordmark on H/2
  const dy = -LIFT * rise;
  const upper = 1 - rise;                 // the material above it clears out
  ctx.save();
  ctx.translate(0, dy);

  // Protective emblem
  const eA=fadeWin(u,0.2,5.6,0.7,0.8)*upper;
  if(eA>0){
    ctx.save(); ctx.globalAlpha=eA;
    const cx=W/2, cy=390;
    for(let i=0;i<3;i++){
      const ph=((t*0.5)+i/3)%1;
      ctx.beginPath(); ctx.arc(cx,cy,60+ph*130,0,7);
      ctx.strokeStyle=`rgba(255,255,255,${0.30*(1-ph)})`; ctx.lineWidth=2; ctx.stroke();
    }
    roundRect(cx-52,cy-52,104,104,12); ctx.fillStyle='rgba(10,18,26,0.9)'; ctx.fill();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle=C.red;
    ctx.fillRect(cx-30,cy-10,60,20); ctx.fillRect(cx-10,cy-30,20,60);
    ctx.restore();
    text('MACHINE-READABLE PROTECTIVE EMBLEM',W/2,520,
         {size:22,font:MONO,color:C.dim,align:'center',alpha:eA,ls:5,weight:'600'});
    text('EVERY MEDICAL AIRFRAME BROADCASTS IT. THE SYSTEM REFUSES TO ARM ONE.',
         W/2,558,{size:18,font:MONO,color:C.faint,align:'center',alpha:eA,ls:2});
  }

  const gA=fadeWin(u,4.6,5.2,0.7,0.8)*upper;
  if(gA>0){
    text('THE MACHINE PROPOSES.  A HUMAN DECIDES.',W/2,672,
         {size:32,color:C.white,align:'center',alpha:gA,ls:4,weight:'700'});
    text('EVERY DECISION LOGGED WITH THE PHYSIOLOGY THAT PRODUCED IT.',W/2,716,
         {size:20,font:MONO,color:C.dim,align:'center',alpha:gA,ls:2});
  }

  /* Once up, it stays up: no out-fade on the wordmark block. */
  const lA=clamp((u-7.6)/1.2,0,1);
  if(lA>0){
    ctx.save(); ctx.globalAlpha=lA;
    const g=ctx.createLinearGradient(W/2-440,0,W/2+440,0);
    g.addColorStop(0,'#eafff7'); g.addColorStop(.55,'#31d68a'); g.addColorStop(1,'#3aa8ff');
    text('ANGEL SWARM',W/2,880,{size:92,font:MONO,weight:'800',color:g,align:'center',ls:12});
    ctx.restore();
    text('THE GOLDEN HOUR IS GONE.  ONE CLOCK EACH.',W/2,940,
         {size:26,font:MONO,color:'rgba(215,232,245,0.92)',align:'center',ls:6,weight:'700',alpha:lA});
    text('NDIA GLOBAL DEFENSE HACKATHON 2026  //  DHA COMBAT SUPPORT',
         W/2,986,{size:19,font:MONO,color:C.faint,align:'center',alpha:lA,ls:5});
  }
  ctx.restore();
  vignette(); scanlines(0.05);
}

/* ============================== DISPATCHER ============================== */

/* =========================================================================
   THE SIXTY-SECOND CUT.

   A hackathon slot is five minutes and it includes questions. A 3m15s film
   spends most of that, so this is a separate edit rather than a trim of the
   long one: different beats, different pacing, and it has to stand alone
   with no one narrating over it.

   It reuses every primitive above — same palette, same type, same grid,
   brackets and sweep — so the two films are unmistakably the same object.
   What it does not reuse is HOLD, the long film's 1.55x dwell multiplier.
   Sixty seconds has no room for dwell, so win() below is fadeWin without it
   and every duration here is real seconds.

   The order is the argument: what is happening, why the clock everyone knows
   is the wrong clock, what nobody is asking, what we ask instead, what
   changed, and the name.
   ========================================================================= */
function win(t,start,dur,inD,outD){
  const u=t-start;
  if(u<0||u>dur) return 0;
  const a = inD ? clamp(u/inD,0,1) : 1;
  const b = outD ? clamp((dur-u)/outD,0,1) : 1;
  return Math.min(a,b);
}
const Q = [
  ['fact',    9],
  ['clock',  11],
  ['gap',     8],
  ['ask',    11],
  ['result', 12],
  ['name',    9]
];
const QS = {};
(function(){ let at=0; for(const [k,d] of Q){ QS[k]={t:at,d:d}; at+=d; } })();
const SHORT_TOTAL = Q.reduce((n,x)=>n+x[1],0);

/* ---------------------------------------------------------- 1 · THE FACT */
function qFact(t){
  const u=t-QS.fact.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.5,t);
  radarSweep(W/2,H/2,760,t,clamp(u/1.2,0,1)*0.7);
  const a1=win(u,0.4,4.4,0.5,0.6);
  if(a1>0){
    text('87%',W/2,H/2-30,{size:230,font:MONO,weight:'800',color:C.red,align:'center',alpha:a1});
    text('OF BATTLEFIELD DEATHS HAPPEN BEFORE',W/2,H/2+66,{size:32,color:C.ink,align:'center',alpha:a1,ls:5,weight:'600'});
    text('THE CASUALTY EVER REACHES A DOCTOR',W/2,H/2+114,{size:32,color:C.ink,align:'center',alpha:a1,ls:5,weight:'600'});
  }
  const a2=win(u,4.4,4.2,0.5,0.6);
  if(a2>0){
    text('ONE IN FOUR OF THEM',W/2,H/2-96,{size:36,color:C.dim,align:'center',alpha:a2,ls:6,weight:'600'});
    text('COULD HAVE LIVED',W/2,H/2+14,{size:126,font:MONO,weight:'800',color:C.white,align:'center',alpha:a2,ls:4});
    text('NINE IN TEN OF THOSE BLED TO DEATH',W/2,H/2+100,{size:30,color:C.red,align:'center',alpha:a2,ls:5,weight:'600'});
  }
  source('Eastridge et al., J Trauma Acute Care Surg 2012 — 4,596 battlefield fatalities',Math.max(a1,a2)*0.95);
  cornerBrackets(clamp(u/1.2,0,1)*0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette();
}

/* ------------------------------------------- 2 · THE CLOCK IS THE WRONG ONE */
function qClock(t){
  const u=t-QS.clock.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.35,t);
  const cx=W/2, cy=H/2-70, R=165;
  const app=clamp(u/0.8,0,1);
  ctx.save(); ctx.globalAlpha=app;
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7);
  ctx.strokeStyle='rgba(150,185,215,0.30)'; ctx.lineWidth=3; ctx.stroke();
  for(let i=0;i<60;i++){
    const a=i/60*Math.PI*2-Math.PI/2, big=i%5===0;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*(R-(big?18:9)),cy+Math.sin(a)*(R-(big?18:9)));
    ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);
    ctx.strokeStyle=big?'rgba(160,195,225,0.55)':'rgba(160,195,225,0.22)';
    ctx.lineWidth=big?3:1.5; ctx.stroke();
  }
  const ha=-Math.PI/2+easeIn(clamp(u/2.6,0,1))*Math.PI*2*2.2;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(ha)*(R-30),cy+Math.sin(ha)*(R-30));
  ctx.strokeStyle=C.red; ctx.lineWidth=5; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,8,0,7); ctx.fillStyle=C.red; ctx.fill();
  text('GOLDEN HOUR',cx,cy+8,{size:40,font:MONO,weight:'800',color:'rgba(230,238,248,0.9)',align:'center',ls:4,baseline:'middle'});
  const strike=clamp((u-2.2)/0.5,0,1);
  if(strike>0){
    const wdt=measure('GOLDEN HOUR',40,MONO,'800',4);
    ctx.strokeStyle=C.red; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(cx-wdt/2-14,cy+6); ctx.lineTo(cx-wdt/2-14+(wdt+28)*strike,cy+6); ctx.stroke();
  }
  ctx.restore();
  /* The quote is the reason this film exists. It gets the longest single
     hold in sixty seconds. */
  const a1=win(u,2.9,5.4,0.5,0.7);
  if(a1>0){
    text('"We expect casualty evacuation to be delayed',W/2,H-300,{size:36,color:C.ink,align:'center',alpha:a1});
    text('greater than 72 hours, maybe even longer."',W/2,H-252,{size:36,color:C.ink,align:'center',alpha:a1});
    text('COL JASON CORLEY  //  DIRECTOR, ARMED SERVICES BLOOD PROGRAM  //  JUNE 2026',
         W/2,H-200,{size:17,font:MONO,color:C.faint,align:'center',alpha:a1,ls:3});
  }
  const a2=win(u,8.0,2.9,0.5,0.6);
  if(a2>0){
    text('AND SIXTY MINUTES WAS NEVER THE STANDARD FOR BLOOD',W/2,H-278,
         {size:28,font:MONO,color:'#ffd24a',align:'center',alpha:a2,ls:4,weight:'700'});
    text('THE GUIDELINE SAYS 36 MINUTES',W/2,H-226,
         {size:22,font:MONO,color:C.dim,align:'center',alpha:a2,ls:3});
    source('JTS CPG ID 18, Damage Control Resuscitation, 12 Jul 2019 — "ideally within 36 minutes of injury"',a2*0.9);
  }
  cornerBrackets(0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette();
}

/* ------------------------------------------------ 3 · WHAT NOBODY IS ASKING */
function qGap(t){
  const u=t-QS.gap.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.35,t);
  radarSweep(W/2,H/2,820,t,0.4);
  const a1=win(u,0.3,3.6,0.5,0.6);
  if(a1>0){
    text('TODAY THE AIRCRAFT THAT GOES',W/2,H/2-120,
         {size:52,color:C.ink,align:'center',alpha:a1,ls:3,weight:'600'});
    text('IS THE ONE THAT IS CLOSEST',W/2,H/2-52,
         {size:52,color:C.ink,align:'center',alpha:a1,ls:3,weight:'600'});
  }
  const a2=win(u,3.4,4.3,0.5,0.7);
  if(a2>0){
    text('NOTHING ASKS HOW LONG',W/2,H/2+50,
         {size:64,font:MONO,weight:'800',color:C.red,align:'center',alpha:a2,ls:4});
    text('THIS SOLDIER HAS',W/2,H/2+130,
         {size:64,font:MONO,weight:'800',color:C.red,align:'center',alpha:a2,ls:4});
    /* The strongest defensible claim in the whole solution, and it is a
       negative one: doctrine names the function, the cell, the inputs and the
       launch authority, and never names the rule that picks the aircraft. */
    text('NO DOCTRINE NAMES THE RULE THAT PICKS IT',W/2,H/2+218,
         {size:22,font:MONO,color:C.dim,align:'center',alpha:a2,ls:3});
    source('JP 4-02 names the function and the authority · ATP 4-02.2 names the precedence · neither names the assignment',a2*0.9);
  }
  cornerBrackets(0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette();
}

/* --------------------------------------------------- 4 · WHAT WE ASK INSTEAD */
function qAsk(t){
  const u=t-QS.ask.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);
  const head=win(u,0.1,10.8,0.4,0.5);
  text('EVERY CASUALTY IS A DEADLINE',150,140,
       {size:24,font:MONO,color:C.angel,alpha:head,ls:5,weight:'700'});

  /* One casualty, one falling reserve, one number. */
  const bx=250, by=250, bw=1420, bh=430;
  const ca=win(u,0.5,10.2,0.5,0.6);
  if(ca>0){
    ctx.save(); ctx.globalAlpha=ca;
    ctx.fillStyle='rgba(10,16,22,0.65)'; roundRect(bx,by,bw,bh,12); ctx.fill();
    ctx.strokeStyle='rgba(91,180,255,0.45)'; ctx.lineWidth=2; ctx.stroke();
    text('CAS-018  //  A/1-27 IN  //  NORTH ISLET',bx+40,by+64,
         {size:26,font:MONO,color:C.blue,ls:3,weight:'700'});
    text('NON-COMPRESSIBLE TORSO HAEMORRHAGE',bx+40,by+104,
         {size:19,font:MONO,color:C.faint,ls:2});

    /* compensatory reserve, falling */
    const prog=clamp((u-1.0)/6.2,0,1)*0.82;   /* stops critical, not dead */
    const gx=bx+40, gy=by+160, gw=bw-80, gh=26;
    ctx.fillStyle='rgba(255,255,255,0.07)'; roundRect(gx,gy,gw,gh,5); ctx.fill();
    const res=1-prog*0.92;
    const col = res>0.6?C.angel : res>0.3?C.amber : C.red;
    ctx.fillStyle=col; roundRect(gx,gy,gw*res,gh,5); ctx.fill();
    ctx.strokeStyle='rgba(255,66,87,0.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(gx+gw*0.30,gy-8); ctx.lineTo(gx+gw*0.30,gy+gh+8); ctx.stroke();
    text('COMPENSATORY RESERVE',gx,gy-18,{size:17,font:MONO,color:C.faint,ls:3});
    text('30% — COLLAPSE THRESHOLD',gx+gw*0.30+12,gy+gh+30,{size:16,font:MONO,color:'rgba(255,66,87,0.8)',ls:2});
    text(Math.round(res*100)+'%',gx+gw+0,gy-18,{size:20,font:MONO,color:col,align:'right',ls:2,weight:'700'});

    /* the number the tasking layer actually uses */
    const na=win(u,2.2,8.4,0.5,0.6);
    if(na>0){
      const mins=Math.max(0,Math.round((1-prog)*24));
      text('TIME TO COLLAPSE',bx+40,by+330,{size:19,font:MONO,color:C.faint,ls:3,alpha:na});
      text(String(mins).padStart(2,'0')+':00',bx+40,by+398,
           {size:78,font:MONO,weight:'800',color:mins<10?C.red:C.amber,ls:2,alpha:na});
      /* 49 characters of 30px sans with 2px tracking measures 980px in a
         960px box — it crossed the card border. 27px clears it by 68px. */
      text('A SENSOR READS THE PULSE AND SAYS HOW LONG HE HAS',bx+430,by+352,
           {size:27,color:C.ink,ls:2,weight:'600',alpha:na});
      text('18 MINUTES AHEAD, WITH VITAL SIGNS STILL NORMAL',
           bx+430,by+394,{size:20,font:MONO,color:C.dim,ls:2,alpha:na});
    }
    ctx.restore();
  }
  const fa=win(u,7.4,3.4,0.5,0.6);
  if(fa>0){
    text('TASKING RUNS AGAINST THE DEADLINE, NOT THE DISTANCE',W/2,H-150,
         {size:38,color:C.white,align:'center',alpha:fa,ls:3,weight:'700'});
  }
  source('Compensatory Reserve Measurement, U.S. Army Institute of Surgical Research — 18.30 ± 7.94 min, Ortiz et al., Front Bioeng Biotechnol 2026',head*0.9);
  cornerBrackets(0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette();
}

/* ------------------------------------------------------------- 5 · RESULT */
function qResult(t){
  const u=t-QS.result.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);
  const head=win(u,0.1,11.8,0.4,0.5);
  text('SAME CASUALTIES.  SAME AIRCRAFT.  SAME BLOOD.',W/2,140,
       {size:26,font:MONO,color:C.angel,align:'center',alpha:head,ls:5,weight:'700'});

  const arms=[
    {x:200,label:'ANGEL SWARM',col:C.angel,n:23,sub:'20 SORTIES  ·  0 UNITS DESTROYED'},
    {x:1020,label:'CURRENT — TRIAGE & PROXIMITY',col:C.current,n:34,sub:'38 SORTIES  ·  28 UNITS DESTROYED'}
  ];
  arms.forEach((p,i)=>{
    const a=win(u,0.5+i*0.3,11.0,0.5,0.6);
    if(a<=0) return;
    ctx.save(); ctx.globalAlpha=a;
    const pw=700, ph=360, py=210;
    ctx.fillStyle='rgba(10,16,22,0.6)'; roundRect(p.x,py,pw,ph,10); ctx.fill();
    ctx.strokeStyle=p.col+'66'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=p.col; ctx.fillRect(p.x,py,pw,4);
    text(p.label,p.x+30,py+54,{size:24,font:MONO,weight:'800',color:p.col,ls:3});
    const grow=easeOut(clamp((u-1.2-i*0.2)/1.4,0,1));
    /* Deaths are red on both arms. The comparison is carried by the size of
       the number and the length of the bar, never by making one of them a
       colour that reads as good news. */
    text(String(Math.round(p.n*grow)),p.x+30,py+230,
         {size:150,font:MONO,weight:'800',color:C.red,ls:2});
    text('DIED OF',p.x+300,py+178,{size:26,color:C.ink,ls:2,weight:'600'});
    text('SURVIVABLE WOUNDS',p.x+300,py+214,{size:26,color:C.ink,ls:2,weight:'600'});
    const bw2=(pw-60)*(p.n/34)*grow;
    ctx.fillStyle='rgba(255,255,255,0.07)'; roundRect(p.x+30,py+262,pw-60,14,4); ctx.fill();
    ctx.fillStyle=C.red; roundRect(p.x+30,py+262,bw2,14,4); ctx.fill();
    text(p.sub,p.x+30,py+320,{size:18,font:MONO,color:C.faint,ls:2});
    ctx.restore();
  });

  const va=win(u,3.6,8.0,0.6,0.7);
  if(va>0){
    ctx.save(); ctx.globalAlpha=va;
    ctx.fillStyle='rgba(6,20,14,0.8)'; roundRect(200,626,1520,190,12); ctx.fill();
    ctx.strokeStyle='rgba(49,214,138,0.6)'; ctx.lineWidth=2; ctx.stroke();
    const g2=easeOut(clamp((u-3.9)/1.1,0,1));
    text(String(Math.round(11*g2)),300,760,{size:112,font:MONO,weight:'800',color:'#4ff0a3',align:'center'});
    text('FEWER DEAD OF SURVIVABLE WOUNDS',430,714,{size:36,color:C.white,ls:3,weight:'700'});
    text('THE ONLY DIFFERENCE BETWEEN THE TWO RUNS IS WHICH AIRCRAFT WAS SENT WHERE',
         430,756,{size:20,font:MONO,color:C.dim,ls:2});
    text('18% FEWER ON AVERAGE  ·  BETTER IN 40 OF 40 PAIRED RUNS  ·  95% CI 15–20%',
         430,792,{size:20,font:MONO,color:'#9df3c9',ls:2});
    ctx.restore();
  }
  source('JOA CORAL · seed 42 · 125 casualties · common random numbers · synthetic data',head*0.9);
  cornerBrackets(0.85,'ANGEL SWARM // RESULT',t);
  vignette();
}

/* --------------------------------------------------------------- 6 · NAME */
function qName(t){
  const u=t-QS.name.t;
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  grid(0.3,t);
  radarSweep(W/2,H/2,900,t,0.45);
  const ga=win(u,0.3,8.6,0.6,0);
  if(ga>0){
    text('THE MACHINE PROPOSES.  A HUMAN DECIDES.',W/2,H/2-120,
         {size:34,color:C.white,align:'center',alpha:ga,ls:4,weight:'700'});
    text('EVERY DECISION LOGGED WITH THE PHYSIOLOGY THAT PRODUCED IT',W/2,H/2-72,
         {size:20,font:MONO,color:C.dim,align:'center',alpha:ga,ls:2});
  }
  const la=clamp((u-1.6)/1.1,0,1);
  if(la>0){
    ctx.save(); ctx.globalAlpha=la;
    const g=ctx.createLinearGradient(W/2-440,0,W/2+440,0);
    g.addColorStop(0,'#eafff7'); g.addColorStop(.55,'#31d68a'); g.addColorStop(1,'#3aa8ff');
    text('ANGEL SWARM',W/2,H/2+50,{size:104,font:MONO,weight:'800',color:g,align:'center',ls:12});
    ctx.restore();
    text('PHYSIOLOGICAL-DEADLINE BLOOD SUPPORT',W/2,H/2+112,
         {size:26,font:MONO,color:'rgba(215,232,245,0.92)',align:'center',ls:6,weight:'700',alpha:la});
    text('NDIA GLOBAL DEFENSE HACKATHON 2026  //  DHA COMBAT SUPPORT',
         W/2,H/2+180,{size:19,font:MONO,color:C.faint,align:'center',alpha:la,ls:5});
  }
  cornerBrackets(0.85,'ANGEL SWARM // DHA COMBAT SUPPORT',t);
  vignette();
}

function renderShort(t){
  ctx.setTransform(SS,0,0,SS,0,0);
  ctx.save(); ctx.globalAlpha=1;
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  if(t<QS.clock.t) qFact(t);
  else if(t<QS.gap.t) qClock(t);
  else if(t<QS.ask.t) qGap(t);
  else if(t<QS.result.t) qAsk(t);
  else if(t<QS.name.t) qResult(t);
  else qName(t);
  if(t<0.7){ ctx.globalAlpha=1-t/0.7; ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); }
  ctx.restore();
  octx.clearRect(0,0,1920,1080);
  octx.drawImage(cv,0,0,1920,1080);
}

function renderFrame(t){
  ctx.setTransform(SS,0,0,SS,0,0);
  ctx.save();
  ctx.globalAlpha=1;
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  if(t<S.golden.t) sceneOpen(t);
  else if(t<S.title.t) sceneGolden(t);
  else if(t<S.whatis.t) sceneTitle(t);
  else if(t<S.deadline.t) sceneWhatIs(t);
  else if(t<S.telemetry.t) sceneDeadline(t);
  else if(t<S.tasking.t) sceneTelemetry(t);
  else if(t<S.coldchain.t) sceneTasking(t);
  else if(t<S.result.t) sceneCold(t);
  else if(t<S.close.t) sceneResult(t);
  else sceneClose(t);

  // global fade in/out
  if(t<0.8){ ctx.globalAlpha=1-t/0.8; ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); }
  /* No out-fade. The film ends on the held title card, not on black. */
  ctx.restore();
  // downsample 3840x2160 -> 1920x1080 : 2x supersampled antialiasing
  octx.clearRect(0,0,1920,1080);
  octx.drawImage(cv,0,0,1920,1080);
}



  return { renderFrame: renderFrame, TOTAL: TOTAL,
           renderShort: renderShort, SHORT_TOTAL: SHORT_TOTAL,
           canvas: outC };
})();
