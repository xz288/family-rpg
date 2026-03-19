/* sound.js — Game audio engine (Web Audio API, no samples)
   Extracts synthesis from town-amblence-music.html, dark-forest-music.html,
   dark-forest-boss-music.html, party-request-sound.html, party-joined-sound.html */

const SoundEngine = (() => {
  let _ctx = null;

  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ─── TOWN AMBIENCE ───────────────────────────────────────────────────────────
  const TownTrack = (() => {
    let playing = false;
    let masterGain = null;
    const gains = {};
    const vols = { drone:0.8, pad:0.6, wind:0.45, melody:0.55, pulse:0.4, bell:0.7 };
    const bellInterval = 12;
    let liveNodes = [];
    let melodyTimer = null, pulseTimer = null, bellTimer = null, sharedReverb = null;
    const mood = { root:41.2, padSemi:[0,7,12,19], scale:[0,2,3,5,7,8,10], tempo:0.38 };

    function semToHz(base, semi) { return base * Math.pow(2, semi / 12); }

    function makeReverb(ctx, dur=3, decay=2) {
      const len = ctx.sampleRate * dur;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c=0;c<2;c++) {
        const d = buf.getChannelData(c);
        for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, decay);
      }
      const conv = ctx.createConvolver(); conv.buffer = buf; return conv;
    }

    function getReverb(ctx) {
      if (!sharedReverb) sharedReverb = makeReverb(ctx, 3.5, 1.8);
      return sharedReverb;
    }

    function startDrone(ctx) {
      const rev = getReverb(ctx); rev.connect(gains.drone);
      const freqs = [mood.root, mood.root*2, mood.root*3];
      freqs.forEach((f,i) => {
        const osc=ctx.createOscillator(), gn=ctx.createGain(), filt=ctx.createBiquadFilter();
        filt.type='lowpass'; filt.frequency.value=280+i*80;
        osc.type = i===0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.frequency.setTargetAtTime(f*1.0015, ctx.currentTime+3, 5);
        osc.frequency.setTargetAtTime(f*0.999,  ctx.currentTime+9, 5);
        gn.gain.setValueAtTime(i===0 ? 0.55 : 0.18, ctx.currentTime);
        osc.connect(filt); filt.connect(gn); gn.connect(rev);
        osc.start(); liveNodes.push(osc);
      });
    }

    function startPad(ctx) {
      const rev = makeReverb(ctx, 5, 1.4); rev.connect(gains.pad);
      mood.padSemi.forEach((semi,i) => {
        const freq=semToHz(mood.root*2, semi);
        const osc=ctx.createOscillator(), gn=ctx.createGain(), filt=ctx.createBiquadFilter();
        filt.type='lowpass'; filt.frequency.value=600; filt.Q.value=1.2;
        osc.type = i%2===0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (i - mood.padSemi.length/2) * 3.5;
        gn.gain.setValueAtTime(0, ctx.currentTime);
        gn.gain.linearRampToValueAtTime(0.22, ctx.currentTime+2.5);
        osc.connect(filt); filt.connect(gn); gn.connect(rev);
        osc.start(); liveNodes.push(osc);
      });
    }

    function startWind(ctx) {
      const bufLen = ctx.sampleRate * 4;
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let b0=0,b1=0,b2=0;
      for (let i=0;i<bufLen;i++) {
        const w=Math.random()*2-1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
        data[i]=(b0+b1+b2+w*0.5362)*0.11;
      }
      const src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true;
      const bp1=ctx.createBiquadFilter(); bp1.type='bandpass'; bp1.frequency.value=320; bp1.Q.value=0.6;
      const bp2=ctx.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=820; bp2.Q.value=0.4;
      const wgn=ctx.createGain(); wgn.gain.setValueAtTime(0.45, ctx.currentTime);
      const lfo=ctx.createOscillator(); lfo.frequency.value=0.08;
      const lfog=ctx.createGain(); lfog.gain.value=0.18;
      lfo.connect(lfog); lfog.connect(wgn.gain); lfo.start();
      liveNodes.push(lfo);
      src.connect(bp1); src.connect(bp2); bp1.connect(wgn); bp2.connect(wgn); wgn.connect(gains.wind);
      src.start(); liveNodes.push(src);
    }

    function scheduleMelody(ctx) {
      if (!playing) return;
      const scale=mood.scale, root=mood.root*4;
      const phrase=[scale[0],scale[2],scale[4],scale[3],scale[1],scale[3],scale[2],scale[0]];
      const noteLen=1.0/mood.tempo*0.55;
      let t=ctx.currentTime+0.1;
      const rev=makeReverb(ctx, 4, 1.6); rev.connect(gains.melody);
      phrase.forEach((semi,i) => {
        const freq=semToHz(root,semi);
        const osc=ctx.createOscillator(), gn=ctx.createGain();
        osc.type='triangle'; osc.frequency.value=freq; osc.detune.value=(Math.random()-0.5)*8;
        const on=t+i*noteLen, off=on+noteLen*0.85;
        gn.gain.setValueAtTime(0,on); gn.gain.linearRampToValueAtTime(0.35,on+0.05); gn.gain.setTargetAtTime(0,off,0.3);
        osc.connect(gn); gn.connect(rev); osc.start(on); osc.stop(off+1.5); liveNodes.push(osc);
      });
      const totalDur=phrase.length*noteLen*1000;
      const rest=(2+Math.random()*4)*1000;
      melodyTimer=setTimeout(()=>scheduleMelody(_getCtx()), totalDur+rest);
    }

    function schedulePulse(ctx) {
      if (!playing) return;
      const period=1.0/mood.tempo;
      function beat() {
        if (!playing) return;
        const osc=ctx.createOscillator(), gn=ctx.createGain(), filt=ctx.createBiquadFilter();
        filt.type='lowpass'; filt.frequency.value=120; osc.type='sine';
        osc.frequency.value=mood.root*1.5;
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(0.7,ctx.currentTime+0.02);
        gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.38);
        osc.connect(filt); filt.connect(gn); gn.connect(gains.pulse);
        osc.start(); osc.stop(ctx.currentTime+0.4); liveNodes.push(osc);
        pulseTimer=setTimeout(beat, period*1000);
      }
      beat();
    }

    function ringBell(ctx) {
      if (!playing) return;
      const rev=makeReverb(ctx, 6, 0.8); rev.connect(gains.bell);
      const bellFreq=semToHz(mood.root*8, mood.scale[4]);
      [1,2.756,5.404].forEach((partial,i) => {
        const osc=ctx.createOscillator(), gn=ctx.createGain();
        osc.type='sine'; osc.frequency.value=bellFreq*partial;
        gn.gain.setValueAtTime(0,ctx.currentTime);
        gn.gain.linearRampToValueAtTime(i===0?0.6:0.25/(i+1), ctx.currentTime+0.01);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+(5-i*1.2));
        osc.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+6); liveNodes.push(osc);
      });
    }

    function scheduleBell(ctx) {
      if (!playing) return;
      ringBell(ctx);
      bellTimer=setTimeout(()=>scheduleBell(_getCtx()), bellInterval*1000);
    }

    function start() {
      const ctx=_getCtx();
      if (playing) return;
      playing=true;
      masterGain=ctx.createGain(); masterGain.gain.value=0.72; masterGain.connect(ctx.destination);
      ['drone','pad','wind','melody','pulse','bell'].forEach(k => {
        gains[k]=ctx.createGain(); gains[k].gain.value=vols[k]*0.85; gains[k].connect(masterGain);
      });
      startDrone(ctx); startPad(ctx); startWind(ctx); scheduleMelody(ctx); schedulePulse(ctx);
      setTimeout(()=>scheduleBell(_getCtx()), 3000+Math.random()*4000);
    }

    function stop() {
      playing=false;
      const now=_ctx ? _ctx.currentTime : 0;
      liveNodes.forEach(n=>{ try{ if(n.gain) n.gain.setTargetAtTime(0,now,0.3); if(n.stop) n.stop(now+1); }catch(e){} });
      liveNodes=[]; clearTimeout(melodyTimer); clearTimeout(pulseTimer); clearTimeout(bellTimer);
      sharedReverb=null;
      if (masterGain) { try{ masterGain.gain.setTargetAtTime(0,now,0.3); }catch(e){} masterGain=null; }
      Object.keys(gains).forEach(k=>delete gains[k]);
    }

    return { start, stop };
  })();

  // ─── FOREST AMBIENCE ─────────────────────────────────────────────────────────
  const ForestTrack = (() => {
    let playing=false, masterGain=null;
    const gains={};
    const vols={ rumble:.75, fdrone:.65, fwind:.70, creature:.55, whisper:.50, wisp:.45, howl:.40 };
    let liveNodes=[], scheduledTimers=[];
    const depth={ rootHz:36.7, atonality:0.2, creatureRate:8, wispRate:12, howlRate:20 };

    function makeReverb(ctx,dur=4,decay=1.6){
      const len=ctx.sampleRate*dur, buf=ctx.createBuffer(2,len,ctx.sampleRate);
      for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); }
      const cv=ctx.createConvolver(); cv.buffer=buf; return cv;
    }

    function makePinkNoise(ctx,seconds=3){
      const len=ctx.sampleRate*seconds, buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
      let b0=0,b1=0,b2=0,b3=0,b4=0;
      for(let i=0;i<len;i++){ const w=Math.random()*2-1; b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.96900*b2+w*.1538520; b3=.86650*b3+w*.3104856; b4=.55000*b4+w*.5329522; d[i]=(b0+b1+b2+b3+b4+w*.0168980)*0.1; }
      return buf;
    }

    function startRumble(ctx){
      const rev=makeReverb(ctx,5,2); rev.connect(gains.rumble);
      [1,1.33].forEach((ratio,i)=>{
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='lowpass'; filt.frequency.value=90; osc.type='sine';
        osc.frequency.value=depth.rootHz*ratio;
        osc.frequency.setTargetAtTime(depth.rootHz*ratio*1.002,ctx.currentTime+4,6);
        osc.frequency.setTargetAtTime(depth.rootHz*ratio*0.998,ctx.currentTime+10,6);
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(i===0?.55:.28,ctx.currentTime+3);
        const lfo=ctx.createOscillator(); lfo.frequency.value=0.12+i*.05;
        const lg=ctx.createGain(); lg.gain.value=0.12;
        lfo.connect(lg); lg.connect(gn.gain); lfo.start(); liveNodes.push(lfo);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc);
      });
    }

    function startForestDrone(ctx){
      const rev=makeReverb(ctx,6,1.4); rev.connect(gains.fdrone);
      const baseFreqs=[depth.rootHz*4, depth.rootHz*4*Math.pow(2,(7+depth.atonality*4)/12), depth.rootHz*4*Math.pow(2,(10+depth.atonality*2)/12), depth.rootHz*4*Math.pow(2,3/12)];
      baseFreqs.forEach((f,i)=>{
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='bandpass'; filt.frequency.value=f*1.2; filt.Q.value=0.8;
        osc.type=i%2===0?'sawtooth':'triangle'; osc.frequency.value=f; osc.detune.value=(Math.random()-.5)*depth.atonality*40;
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(0.18/(i+1),ctx.currentTime+4+i);
        const lfo=ctx.createOscillator(); lfo.frequency.value=0.04+i*.02+Math.random()*.03;
        const lg=ctx.createGain(); lg.gain.value=f*0.004;
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(); liveNodes.push(lfo);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc);
      });
    }

    function startForestWind(ctx){
      const noiseBuf=makePinkNoise(ctx,5);
      [{freq:180,Q:0.5,gain:0.55},{freq:600,Q:0.7,gain:0.38},{freq:2200,Q:1.2,gain:0.22}].forEach((b,i)=>{
        const src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true;
        const filt=ctx.createBiquadFilter(); filt.type='bandpass'; filt.frequency.value=b.freq; filt.Q.value=b.Q;
        const gn=ctx.createGain(); gn.gain.setValueAtTime(b.gain,ctx.currentTime);
        const lfo=ctx.createOscillator(); lfo.frequency.value=0.06+i*.04;
        const lg=ctx.createGain(); lg.gain.value=b.gain*.5;
        lfo.connect(lg); lg.connect(gn.gain); lfo.start(); liveNodes.push(lfo);
        src.connect(filt); filt.connect(gn); gn.connect(gains.fwind); src.start(); liveNodes.push(src);
      });
    }

    function scheduleCreature(ctx){
      if(!playing) return;
      const delay=(depth.creatureRate*.5+Math.random()*depth.creatureRate)*1000;
      const t=setTimeout(()=>{
        if(!playing) return;
        const type=Math.floor(Math.random()*4), rev=makeReverb(ctx,3,1.8); rev.connect(gains.creature);
        if(type===0){
          for(let i=0;i<3;i++){ const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type='sine'; osc.frequency.value=800+Math.random()*1200; const on=ctx.currentTime+i*.12; gn.gain.setValueAtTime(0,on); gn.gain.linearRampToValueAtTime(.4,on+.01); gn.gain.exponentialRampToValueAtTime(.001,on+.08); osc.connect(gn); gn.connect(rev); osc.start(on); osc.stop(on+.1); liveNodes.push(osc); }
        } else if(type===1){
          const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(180+Math.random()*80,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(90+Math.random()*40,ctx.currentTime+1.2); gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(.5,ctx.currentTime+.15); gn.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+1.4); osc.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+1.5); liveNodes.push(osc);
        } else if(type===2){
          const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type='square'; osc.frequency.value=120+Math.random()*80; gn.gain.setValueAtTime(.5,ctx.currentTime); gn.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.06); osc.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+.1); liveNodes.push(osc);
        } else {
          const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter(); filt.type='bandpass'; filt.frequency.value=1800; filt.Q.value=2; osc.type='sawtooth'; osc.frequency.setValueAtTime(900,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1800,ctx.currentTime+.3); osc.frequency.exponentialRampToValueAtTime(400,ctx.currentTime+.7); gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(.35,ctx.currentTime+.05); gn.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.8); osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+1); liveNodes.push(osc);
        }
        scheduleCreature(_getCtx());
      }, delay);
      scheduledTimers.push(t);
    }

    function scheduleWhisper(ctx){
      if(!playing) return;
      const delay=(8+Math.random()*12)*1000;
      const t=setTimeout(()=>{
        if(!playing) return;
        const noiseBuf=makePinkNoise(ctx,2), src=ctx.createBufferSource(); src.buffer=noiseBuf;
        const rev=makeReverb(ctx,4,1.2);
        const f1=ctx.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=700;  f1.Q.value=8;
        const f2=ctx.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=1200; f2.Q.value=6;
        const f3=ctx.createBiquadFilter(); f3.type='bandpass'; f3.frequency.value=2500; f3.Q.value=5;
        const gn=ctx.createGain(); gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(.6,ctx.currentTime+.4); gn.gain.setTargetAtTime(0,ctx.currentTime+1.2,.4);
        const lfo=ctx.createOscillator(); lfo.frequency.value=3.5+Math.random()*2;
        const lg=ctx.createGain(); lg.gain.value=300; lfo.connect(lg); lg.connect(f1.frequency); lfo.start(); setTimeout(()=>{ try{lfo.stop();}catch(e){} },2000); liveNodes.push(lfo);
        rev.connect(gains.whisper); src.connect(f1); src.connect(f2); src.connect(f3); f1.connect(gn); f2.connect(gn); f3.connect(gn); gn.connect(rev);
        src.start(); src.stop(ctx.currentTime+2.5); liveNodes.push(src);
        scheduleWhisper(_getCtx());
      }, delay);
      scheduledTimers.push(t);
    }

    function scheduleWisp(ctx,idx){
      if(!playing) return;
      const delay=(depth.wispRate*.4+Math.random()*depth.wispRate)*1000;
      const t=setTimeout(()=>{
        if(!playing) return;
        const rev=makeReverb(ctx,5,.9); rev.connect(gains.wisp);
        const osc=ctx.createOscillator(),gn=ctx.createGain();
        osc.type='sine';
        const wispFreqs=[523,587,659,698,784,880,988,1047];
        const baseF=wispFreqs[Math.floor(Math.random()*wispFreqs.length)];
        osc.frequency.value=baseF;
        const lfo=ctx.createOscillator(); lfo.frequency.value=5+Math.random()*3;
        const lg=ctx.createGain(); lg.gain.value=baseF*.003; lfo.connect(lg); lg.connect(osc.frequency); lfo.start();
        const dur=2+Math.random()*3;
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(.3,ctx.currentTime+.5); gn.gain.setTargetAtTime(0,ctx.currentTime+dur*.6,.5);
        osc.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+dur+1); liveNodes.push(osc); liveNodes.push(lfo);
        setTimeout(()=>{ try{lfo.stop();}catch(e){} },(dur+.5)*1000);
        scheduleWisp(_getCtx(),idx);
      }, delay);
      scheduledTimers.push(t);
    }

    function scheduleHowl(ctx){
      if(!playing) return;
      const delay=(depth.howlRate*.5+Math.random()*depth.howlRate)*1000;
      const t=setTimeout(()=>{
        if(!playing) return;
        const rev=makeReverb(ctx,7,.7); rev.connect(gains.howl);
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='bandpass'; filt.frequency.value=380; filt.Q.value=2.5; osc.type='sawtooth';
        const baseF=120+Math.random()*80;
        osc.frequency.setValueAtTime(baseF,ctx.currentTime); osc.frequency.linearRampToValueAtTime(baseF*1.6,ctx.currentTime+.8); osc.frequency.exponentialRampToValueAtTime(baseF*.7,ctx.currentTime+2.4);
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(.45,ctx.currentTime+.3); gn.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+2.8);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); osc.stop(ctx.currentTime+3); liveNodes.push(osc);
        scheduleHowl(_getCtx());
      }, delay);
      scheduledTimers.push(t);
    }

    function start(){
      const ctx=_getCtx();
      if(playing) return;
      playing=true;
      masterGain=ctx.createGain(); masterGain.gain.value=0.78; masterGain.connect(ctx.destination);
      ['rumble','fdrone','fwind','creature','whisper','wisp','howl'].forEach(k=>{ gains[k]=ctx.createGain(); gains[k].gain.value=vols[k]*.9; gains[k].connect(masterGain); });
      startRumble(ctx); startForestDrone(ctx); startForestWind(ctx);
      scheduleCreature(ctx); scheduleWhisper(ctx);
      for(let i=0;i<5;i++) scheduleWisp(ctx,i);
      scheduleHowl(ctx);
    }

    function stop(){
      playing=false;
      const now=_ctx?_ctx.currentTime:0;
      liveNodes.forEach(n=>{ try{ if(n.stop) n.stop(now+.8); }catch(e){} });
      liveNodes=[];
      scheduledTimers.forEach(t=>clearTimeout(t)); scheduledTimers=[];
      if(masterGain){ try{ masterGain.gain.setTargetAtTime(0,now,.3); }catch(e){} masterGain=null; }
      Object.keys(gains).forEach(k=>delete gains[k]);
    }

    return { start, stop };
  })();

  // ─── BOSS FIGHT MUSIC ────────────────────────────────────────────────────────
  const BossTrack = (() => {
    let playing=false, masterGain=null, compressor=null, analyserNode=null;
    const gains={};
    const vols={ drums:.9, aria:.75, choir:.7, brass:.65, strings:.6, organ:.55, bass:.8 };
    let bpm=88, beatInterval=60/88;
    let liveNodes=[], scheduledTimers=[];
    let nextBeatTime=0, beatCount=0, drumStep=0, lookaheadTimer=null, ariaTimer=null;
    let drumReverb=null, stringsReverb=null, ariaReverb=null;
    let choirNodes=[];
    let currentPhase='approach';

    const phases={
      approach:{ rootHz:55, scale:[0,2,3,5,7,8,10], bpmMult:1,   drumPattern:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], chordsemi:[0,3,7,10],  ariaActive:true, chordsSwing:false },
      combat:  { rootHz:55, scale:[0,2,3,5,7,8,10], bpmMult:1.18,drumPattern:[1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0], chordsemi:[0,3,7,10],  ariaActive:true, chordsSwing:false },
      rage:    { rootHz:51.9,scale:[0,1,3,5,6,8,10],bpmMult:1.4, drumPattern:[1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0], chordsemi:[0,1,6,10],  ariaActive:true, chordsSwing:true  },
      final:   { rootHz:48.9,scale:[0,1,2,6,7,8,11],bpmMult:1.6, drumPattern:[1,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1], chordsemi:[0,1,6,11],  ariaActive:true, chordsSwing:true  },
    };

    const LOOKAHEAD=0.12, SCHEDULE_MS=35;

    function semToHz(base,semi){ return base*Math.pow(2,semi/12); }

    function makeReverb(ctx,dur=2.5,decay=2){
      const len=ctx.sampleRate*dur, buf=ctx.createBuffer(2,len,ctx.sampleRate);
      for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); }
      const cv=ctx.createConvolver(); cv.buffer=buf; return cv;
    }

    function getDrumRev(ctx){ if(!drumReverb) drumReverb=makeReverb(ctx,1.2,3); return drumReverb; }
    function getStringsRev(ctx){ if(!stringsReverb) stringsReverb=makeReverb(ctx,3,1.8); return stringsReverb; }
    function getAriaRev(ctx){ if(!ariaReverb) ariaReverb=makeReverb(ctx,4,1.5); return ariaReverb; }

    function scheduleDrum(ctx,time,step){
      const phase=phases[currentPhase], pat=phase.drumPattern, beat=pat[step%16];
      const isKick=step%8===0||(step%8===4&&phase.chordsSwing), isSnare=step%8===4;

      if(beat===0) return;

      if(isKick){
        const osc=ctx.createOscillator(),gn=ctx.createGain();
        osc.type='sine'; osc.frequency.setValueAtTime(phase.rootHz*1.5,time); osc.frequency.exponentialRampToValueAtTime(phase.rootHz*.5,time+.12);
        gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(1.1,time+.005); gn.gain.exponentialRampToValueAtTime(.001,time+.45);
        osc.connect(gn); gn.connect(getDrumRev(ctx)); getDrumRev(ctx).connect(gains.drums); osc.start(time); osc.stop(time+.5); liveNodes.push(osc);
        const click=ctx.createOscillator(),cg=ctx.createGain(); click.type='square'; click.frequency.value=120; cg.gain.setValueAtTime(.7,time); cg.gain.exponentialRampToValueAtTime(.001,time+.03); click.connect(cg); cg.connect(gains.drums); click.start(time); click.stop(time+.04); liveNodes.push(click);
      }
      if(isSnare){
        const snareLen=ctx.sampleRate*.18, snBuf=ctx.createBuffer(1,snareLen,ctx.sampleRate), d=snBuf.getChannelData(0);
        for(let i=0;i<snareLen;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/snareLen,1.5);
        const snSrc=ctx.createBufferSource(); snSrc.buffer=snBuf;
        const snFilt=ctx.createBiquadFilter(); snFilt.type='bandpass'; snFilt.frequency.value=2200; snFilt.Q.value=.8;
        const snGn=ctx.createGain(); snGn.gain.setValueAtTime(.8,time); snGn.gain.exponentialRampToValueAtTime(.001,time+.22);
        snSrc.connect(snFilt); snFilt.connect(snGn); snGn.connect(gains.drums); snSrc.start(time); liveNodes.push(snSrc);
        const st=ctx.createOscillator(),sg=ctx.createGain(); st.type='triangle'; st.frequency.setValueAtTime(200,time); st.frequency.exponentialRampToValueAtTime(100,time+.08); sg.gain.setValueAtTime(.4,time); sg.gain.exponentialRampToValueAtTime(.001,time+.1); st.connect(sg); sg.connect(gains.drums); st.start(time); st.stop(time+.12); liveNodes.push(st);
      }
      if(step%2===0||phase.chordsSwing){
        const hhLen=ctx.sampleRate*.05, hhBuf=ctx.createBuffer(1,hhLen,ctx.sampleRate), hd=hhBuf.getChannelData(0);
        for(let i=0;i<hhLen;i++) hd[i]=(Math.random()*2-1);
        const hhSrc=ctx.createBufferSource(); hhSrc.buffer=hhBuf;
        const hhFilt=ctx.createBiquadFilter(); hhFilt.type='highpass'; hhFilt.frequency.value=8000;
        const hhGn=ctx.createGain(); hhGn.gain.setValueAtTime(.25,time); hhGn.gain.exponentialRampToValueAtTime(.001,time+.05);
        hhSrc.connect(hhFilt); hhFilt.connect(hhGn); hhGn.connect(gains.drums); hhSrc.start(time); liveNodes.push(hhSrc);
      }
    }

    function scheduleBassNote(ctx,time,phase){
      const rev=makeReverb(ctx,1.5,2.5); rev.connect(gains.bass);
      [1,2].forEach((oct,i)=>{ const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type='sawtooth'; osc.frequency.value=phase.rootHz*oct; const filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=180; const dur=beatInterval*1.8; gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(i===0?.6:.3,time+.02); gn.gain.setTargetAtTime(0,time+dur*.6,.15); osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(time); osc.stop(time+dur+.3); liveNodes.push(osc); });
    }

    function scheduleStringsChord(ctx,time,step,phase){
      const rev=getStringsRev(ctx); rev.connect(gains.strings);
      const progressions=[[0,3,7,10],[5,8,12,15],[7,10,14,17],[8,11,15,20]];
      const chord=progressions[Math.floor((step/16)%progressions.length)];
      chord.forEach((semi,i)=>{ const freq=semToHz(phase.rootHz*4,semi); const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type='triangle'; osc.frequency.value=freq; osc.detune.value=(Math.random()-.5)*8; const dur=beatInterval*3.8; gn.gain.setValueAtTime(0,time+i*.01); gn.gain.linearRampToValueAtTime(.18,time+i*.01+.08); gn.gain.setTargetAtTime(0,time+dur*.8,.2); osc.connect(gn); gn.connect(rev); osc.start(time+i*.01); osc.stop(time+dur+.4); liveNodes.push(osc); });
    }

    function scheduleBrassStab(ctx,time,phase){
      const rev=makeReverb(ctx,1.8,2.2); rev.connect(gains.brass);
      const stabFreqs=[semToHz(phase.rootHz*4,phase.chordsemi[1]),semToHz(phase.rootHz*4,phase.chordsemi[2]),semToHz(phase.rootHz*8,phase.chordsemi[0])];
      stabFreqs.forEach((f,i)=>{ const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=1800; osc.type='sawtooth'; osc.frequency.value=f; osc.detune.value=i*8; gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(.28/(i+1),time+.025); gn.gain.exponentialRampToValueAtTime(.001,time+beatInterval*.9); osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(time); osc.stop(time+beatInterval+.2); liveNodes.push(osc); });
    }

    function scheduleOrganChord(ctx,time,phase){
      const rev=makeReverb(ctx,4,1.4); rev.connect(gains.organ);
      phase.chordsemi.forEach((semi,i)=>{ [4,8].forEach(oct=>{ const f=semToHz(phase.rootHz*oct,semi); const osc=ctx.createOscillator(),gn=ctx.createGain(); osc.type=i%2===0?'square':'sawtooth'; osc.frequency.value=f; const filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=900; const dur=beatInterval*7.8; gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(.08/(i+1),time+.15); gn.gain.setTargetAtTime(0,time+dur*.7,.4); osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(time); osc.stop(time+dur+.5); liveNodes.push(osc); }); });
    }

    function scheduleHarmony(ctx,time,step){
      const phase=phases[currentPhase];
      if(step%16===0||step%16===8) scheduleBassNote(ctx,time,phase);
      if(step%16===0) scheduleStringsChord(ctx,time,step,phase);
      if(step%16===8) scheduleBrassStab(ctx,time,phase);
      if(step%32===0) scheduleOrganChord(ctx,time,phase);
    }

    function scheduler(ctx){
      if(!playing) return;
      const stepDur=beatInterval/4;
      while(nextBeatTime < ctx.currentTime+LOOKAHEAD){
        scheduleDrum(ctx,nextBeatTime,drumStep);
        scheduleHarmony(ctx,nextBeatTime,drumStep);
        drumStep++;
        nextBeatTime+=stepDur;
      }
      lookaheadTimer=setTimeout(()=>scheduler(_getCtx()),SCHEDULE_MS);
    }

    function scheduleAria(ctx){
      if(!playing) return;
      const phase=phases[currentPhase];
      if(!phase.ariaActive){ ariaTimer=setTimeout(()=>scheduleAria(_getCtx()),4000); return; }
      const rev=getAriaRev(ctx); rev.connect(gains.aria);
      const scale=phase.scale, rootHz=phase.rootHz*8;
      const phrase=[scale[0],scale[2],scale[4],scale[6%scale.length],scale[3],scale[5%scale.length],scale[2],scale[0]];
      const noteDur=beatInterval*1.8;
      phrase.forEach((semi,i)=>{
        const freq=semToHz(rootHz,semi), on=ctx.currentTime+.1+i*noteDur, off=on+noteDur*.82;
        [1,2,3,4,5,6].forEach((p,pi)=>{
          const ampEnv=[1,.4,.25,.15,.1,.08];
          const osc=ctx.createOscillator(),gn=ctx.createGain();
          const f1=ctx.createBiquadFilter(); f1.type='peaking'; f1.frequency.value=800; f1.Q.value=3; f1.gain.value=8;
          const f2=ctx.createBiquadFilter(); f2.type='peaking'; f2.frequency.value=1200; f2.Q.value=4; f2.gain.value=5;
          osc.type='sine'; osc.frequency.value=freq*p;
          if(pi===0){ const vib=ctx.createOscillator(); vib.frequency.value=5.5; const vg=ctx.createGain(); vg.gain.value=freq*.012; vib.connect(vg); vg.connect(osc.frequency); vib.start(on); vib.stop(off+.3); liveNodes.push(vib); }
          gn.gain.setValueAtTime(0,on); gn.gain.linearRampToValueAtTime(ampEnv[pi]*.55,on+.08); gn.gain.setTargetAtTime(ampEnv[pi]*.45,on+.12,.3); gn.gain.exponentialRampToValueAtTime(.001,off+.15);
          osc.connect(f1); f1.connect(f2); f2.connect(gn); gn.connect(rev); osc.start(on); osc.stop(off+.4); liveNodes.push(osc);
        });
      });
      const totalMs=phrase.length*noteDur*1000, restMs=(1+Math.random()*2)*beatInterval*1000;
      ariaTimer=setTimeout(()=>scheduleAria(_getCtx()),totalMs+restMs);
      scheduledTimers.push(ariaTimer);
    }

    function startChoir(ctx){
      stopChoir();
      const phase=phases[currentPhase], rev=makeReverb(ctx,5,1.6); rev.connect(gains.choir);
      [{freq:phase.rootHz*2,type:'sawtooth',gain:.22},{freq:semToHz(phase.rootHz*2,phase.chordsemi[1]),type:'triangle',gain:.18},{freq:semToHz(phase.rootHz*4,phase.chordsemi[0]),type:'triangle',gain:.14}].forEach((p,i)=>{
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='bandpass'; filt.frequency.value=400+i*200; filt.Q.value=1.2;
        osc.type=p.type; osc.frequency.value=p.freq; osc.detune.value=(i-1)*6;
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(p.gain,ctx.currentTime+2.5+i*.5);
        const lfo=ctx.createOscillator(); lfo.frequency.value=.07+i*.03; const lg=ctx.createGain(); lg.gain.value=p.gain*.3; lfo.connect(lg); lg.connect(gn.gain); lfo.start();
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc); liveNodes.push(lfo); choirNodes.push(osc); choirNodes.push(lfo);
      });
    }

    function stopChoir(){ choirNodes.forEach(n=>{ try{n.stop();}catch(e){} }); choirNodes=[]; }

    function start(){
      const ctx=_getCtx();
      if(playing) return;
      playing=true;
      compressor=ctx.createDynamicsCompressor(); compressor.threshold.value=-14; compressor.knee.value=6; compressor.ratio.value=4; compressor.attack.value=.003; compressor.release.value=.25;
      masterGain=ctx.createGain(); masterGain.gain.value=0.82;
      masterGain.connect(compressor); compressor.connect(ctx.destination);
      ['drums','aria','choir','brass','strings','organ','bass'].forEach(k=>{ gains[k]=ctx.createGain(); gains[k].gain.value=vols[k]*.88; gains[k].connect(masterGain); });
      currentPhase='approach';
      drumStep=0; nextBeatTime=ctx.currentTime+.05;
      startChoir(ctx); scheduler(ctx); scheduleAria(ctx);
    }

    function setPhase(phase){
      if(!phases[phase]) return;
      currentPhase=phase;
      const phObj=phases[phase];
      bpm=Math.max(60,Math.min(160,Math.round(88*phObj.bpmMult)));
      beatInterval=60/bpm;
      if(playing){
        const ctx=_getCtx();
        stopChoir(); setTimeout(()=>startChoir(_getCtx()),300);
        clearTimeout(ariaTimer); setTimeout(()=>scheduleAria(_getCtx()),400);
      }
    }

    function stop(){
      playing=false;
      clearTimeout(lookaheadTimer); clearTimeout(ariaTimer);
      scheduledTimers.forEach(t=>clearTimeout(t)); scheduledTimers=[];
      stopChoir();
      const now=_ctx?_ctx.currentTime:0;
      liveNodes.forEach(n=>{ try{ n.stop(now+.3); }catch(e){} }); liveNodes=[];
      drumReverb=null; stringsReverb=null; ariaReverb=null;
      if(masterGain){ try{ masterGain.gain.setTargetAtTime(0,now,.3); }catch(e){} masterGain=null; }
      Object.keys(gains).forEach(k=>delete gains[k]);
    }

    return { start, stop, setPhase };
  })();

  // ─── ONE-SHOT SOUNDS ─────────────────────────────────────────────────────────
  function playPartyRequest() {
    const ctx=_getCtx();
    const freqs=[700,801,917,1049], noteLen=0.13, gap=0.018;
    const t0=ctx.currentTime+0.02;
    const master=ctx.createGain(); master.gain.value=1.0; master.connect(ctx.destination);
    freqs.forEach((freq,i)=>{
      const on=t0+i*(noteLen+gap), off=on+noteLen;
      const osc=ctx.createOscillator(), gn=ctx.createGain();
      osc.type='triangle'; osc.frequency.setValueAtTime(freq,on);
      gn.gain.setValueAtTime(0,on); gn.gain.linearRampToValueAtTime(0.75,on+0.012); gn.gain.exponentialRampToValueAtTime(0.001,off+0.04);
      osc.connect(gn); gn.connect(master); osc.start(on); osc.stop(off+0.08);
    });
  }

  function playPartyJoined() {
    const ctx=_getCtx(), t=ctx.currentTime;
    const master=ctx.createGain(); master.gain.value=1.0; master.connect(ctx.destination);
    const osc=ctx.createOscillator(), gn=ctx.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(583,t); osc.frequency.exponentialRampToValueAtTime(332,t+0.165);
    gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(0.85,t+0.030); gn.gain.exponentialRampToValueAtTime(0.001,t+0.165);
    osc.connect(gn); gn.connect(master); osc.start(t); osc.stop(t+0.215);
  }

  // ─── DESERT AMBIENCE ─────────────────────────────────────────────────────────
  // Ported from desert-saharrrra-music.html (DOM/UI stripped, synthesis preserved)
  // Hijaz scale · Oud melody · Tabla rhythm · Sandy wind · Heat shimmer · Drone
  const DesertTrack = (() => {
    let playing = false, masterGain = null;
    const gains = {};
    const vols = { shimmer:.70, oud:.65, wind:.75, tabla:.60, drone:.55, hum:.40 };
    let liveNodes = [], scheduledTimers = [];
    let lookaheadTimer = null, oudTimer = null, sharedRev = null;

    const HIJAZ    = [0, 1, 4, 5, 7, 8, 10];
    const ROOT_HZ  = 146.8;  // D3 — Hijaz root
    const BPM      = 72;
    const TABLA_PAT = [1,0,2,0, 3,0,1,0, 0,2,0,3, 1,0,2,3]; // midday doumbek

    function semToHz(base, semi) { return base * Math.pow(2, semi / 12); }

    function makeRev(ctx, dur=3, decay=1.8) {
      const len = ctx.sampleRate * dur, buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c=0;c<2;c++) { const d=buf.getChannelData(c); for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); }
      const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
    }
    function getRev(ctx) { if (!sharedRev) sharedRev = makeRev(ctx, 3.5, 1.6); return sharedRev; }

    function startShimmer(ctx) {
      const rev = makeRev(ctx, 2, 2.5); rev.connect(gains.shimmer);
      const baseF = ROOT_HZ * 8;
      [0, 0.7, -0.5, 1.1, -0.9, 0.3].forEach((offset, i) => {
        const osc = ctx.createOscillator(), gn = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = baseF + offset;
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.03 + i*0.007 + Math.random()*0.01; lg.gain.value = 0.6 + Math.random()*0.4;
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(); liveNodes.push(lfo);
        gn.gain.setValueAtTime(0, ctx.currentTime);
        gn.gain.linearRampToValueAtTime(0.12/(i+1), ctx.currentTime+3+i);
        osc.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc);
      });
    }

    function scheduleOud(ctx) {
      if (!playing) return;
      const rev = getRev(ctx); rev.connect(gains.oud);
      const phraseLen = 3 + Math.floor(Math.random()*3);
      const phrase = [];
      for (let i=0;i<phraseLen;i++) {
        const deg = HIJAZ[Math.floor(Math.random()*HIJAZ.length)];
        phrase.push(semToHz(ROOT_HZ * (Math.random()>0.75 ? 2 : 1), deg));
      }
      const noteDur = 0.18 + Math.random()*0.12, noteGap = 0.28 + Math.random()*0.55;
      phrase.forEach((freq, i) => {
        const on = ctx.currentTime + 0.05 + i*(noteDur+noteGap);
        const body=ctx.createOscillator(), bg=ctx.createGain();
        body.type='triangle'; body.frequency.value=freq;
        bg.gain.setValueAtTime(0,on); bg.gain.linearRampToValueAtTime(0.55,on+0.006); bg.gain.exponentialRampToValueAtTime(0.001,on+noteDur*3.5);
        body.connect(bg); bg.connect(rev); body.start(on); body.stop(on+noteDur*4); liveNodes.push(body);
        const pluck=ctx.createOscillator(), pg=ctx.createGain(), pf=ctx.createBiquadFilter();
        pf.type='bandpass'; pf.frequency.value=freq*3.5; pf.Q.value=3; pluck.type='sawtooth'; pluck.frequency.value=freq;
        pg.gain.setValueAtTime(0.4,on); pg.gain.exponentialRampToValueAtTime(0.001,on+0.04);
        pluck.connect(pf); pf.connect(pg); pg.connect(rev); pluck.start(on); pluck.stop(on+0.05); liveNodes.push(pluck);
        const buzz=ctx.createOscillator(), bzg=ctx.createGain();
        buzz.type='sine'; buzz.frequency.value=freq*2.003;
        bzg.gain.setValueAtTime(0,on); bzg.gain.linearRampToValueAtTime(0.12,on+0.008); bzg.gain.exponentialRampToValueAtTime(0.001,on+noteDur*2.5);
        buzz.connect(bzg); bzg.connect(rev); buzz.start(on); buzz.stop(on+noteDur*3); liveNodes.push(buzz);
      });
      const restMs = (phrase.length*(noteDur+noteGap) + 2.5 + Math.random()*5) * 1000;
      oudTimer = setTimeout(() => scheduleOud(_getCtx()), restMs);
      scheduledTimers.push(oudTimer);
    }

    function startSandyWind(ctx) {
      const makeSand = (dur) => {
        const len=ctx.sampleRate*dur, buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
        for (let i=0;i<len;i++) d[i]=Math.random()*2-1; return buf;
      };
      const src1=ctx.createBufferSource(); src1.buffer=makeSand(5); src1.loop=true;
      const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2800;
      const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=4200; bp.Q.value=0.7;
      const gn1=ctx.createGain(); gn1.gain.value=0.35;
      [0.07, 0.13].forEach((f,i) => { const lfo=ctx.createOscillator(),lg=ctx.createGain(); lfo.frequency.value=f; lg.gain.value=i===0?0.22:0.12; lfo.connect(lg); lg.connect(gn1.gain); lfo.start(); liveNodes.push(lfo); });
      src1.connect(hp); hp.connect(bp); bp.connect(gn1); gn1.connect(gains.wind); src1.start(); liveNodes.push(src1);
      const src2=ctx.createBufferSource(); src2.buffer=makeSand(4); src2.loop=true;
      const lp2=ctx.createBiquadFilter(); lp2.type='bandpass'; lp2.frequency.value=380; lp2.Q.value=0.5;
      const gn2=ctx.createGain(); gn2.gain.value=0.28;
      const lfo3=ctx.createOscillator(),lg3=ctx.createGain(); lfo3.frequency.value=0.05; lg3.gain.value=0.18;
      lfo3.connect(lg3); lg3.connect(gn2.gain); lfo3.start(); liveNodes.push(lfo3);
      src2.connect(lp2); lp2.connect(gn2); gn2.connect(gains.wind); src2.start(); liveNodes.push(src2);
    }

    function scheduleTablaNote(ctx, time, type) {
      const rev = makeRev(ctx, 0.8, 3); rev.connect(gains.tabla);
      if (type===1) {
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='lowpass'; filt.frequency.value=280; osc.type='sine';
        osc.frequency.setValueAtTime(ROOT_HZ*1.5,time); osc.frequency.exponentialRampToValueAtTime(ROOT_HZ*0.8,time+0.12);
        gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(0.85,time+0.008); gn.gain.exponentialRampToValueAtTime(0.001,time+0.5);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(time); osc.stop(time+0.55); liveNodes.push(osc);
      } else if (type===2) {
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='bandpass'; filt.frequency.value=800; filt.Q.value=2.5; osc.type='triangle';
        osc.frequency.setValueAtTime(ROOT_HZ*4,time); osc.frequency.exponentialRampToValueAtTime(ROOT_HZ*3,time+0.08);
        gn.gain.setValueAtTime(0,time); gn.gain.linearRampToValueAtTime(0.6,time+0.005); gn.gain.exponentialRampToValueAtTime(0.001,time+0.22);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(time); osc.stop(time+0.28); liveNodes.push(osc);
        const click=ctx.createOscillator(),cg=ctx.createGain(); click.type='square'; click.frequency.value=1200;
        cg.gain.setValueAtTime(0.3,time); cg.gain.exponentialRampToValueAtTime(0.001,time+0.025);
        click.connect(cg); cg.connect(gains.tabla); click.start(time); click.stop(time+0.03); liveNodes.push(click);
      } else if (type===3) {
        const len=Math.floor(ctx.sampleRate*0.06), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
        for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
        const src=ctx.createBufferSource(); src.buffer=buf;
        const filt=ctx.createBiquadFilter(); filt.type='highpass'; filt.frequency.value=3500;
        const gn=ctx.createGain(); gn.gain.setValueAtTime(0.55,time); gn.gain.exponentialRampToValueAtTime(0.001,time+0.07);
        src.connect(filt); filt.connect(gn); gn.connect(gains.tabla); src.start(time); liveNodes.push(src);
        const rim=ctx.createOscillator(),rg=ctx.createGain(); rim.type='sine'; rim.frequency.value=ROOT_HZ*8;
        rg.gain.setValueAtTime(0.2,time); rg.gain.exponentialRampToValueAtTime(0.001,time+0.06);
        rim.connect(rg); rg.connect(gains.tabla); rim.start(time); rim.stop(time+0.08); liveNodes.push(rim);
      }
    }

    let tablaStep=0, nextTablaTime=0;
    function tablaScheduler(ctx) {
      if (!playing) return;
      const stepDur = (60/BPM)/4;
      while (nextTablaTime < ctx.currentTime+0.10) {
        const type = TABLA_PAT[tablaStep%16];
        if (type>0) scheduleTablaNote(ctx, nextTablaTime, type);
        tablaStep++; nextTablaTime += stepDur;
      }
      lookaheadTimer = setTimeout(() => tablaScheduler(_getCtx()), 30);
    }

    function startDrone(ctx) {
      const rev=makeRev(ctx,4,1.4); rev.connect(gains.drone);
      [1,1.5,2,3].forEach((ratio,i) => {
        const osc=ctx.createOscillator(),gn=ctx.createGain(),filt=ctx.createBiquadFilter();
        filt.type='bandpass'; filt.frequency.value=ROOT_HZ*ratio*1.5; filt.Q.value=1.5;
        osc.type=i<2?'sawtooth':'triangle'; osc.frequency.value=ROOT_HZ*ratio; osc.detune.value=(Math.random()-.5)*6;
        const lfo=ctx.createOscillator(),lg=ctx.createGain(); lfo.frequency.value=0.05+i*0.02; lg.gain.value=ROOT_HZ*ratio*0.003;
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(); liveNodes.push(lfo);
        gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(i===0?0.35:0.12/i,ctx.currentTime+4+i);
        osc.connect(filt); filt.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc);
      });
    }

    function startThroatHum(ctx) {
      const rev=makeRev(ctx,3,1.2); rev.connect(gains.hum);
      const osc=ctx.createOscillator(),gn=ctx.createGain();
      const f1=ctx.createBiquadFilter(); f1.type='peaking'; f1.frequency.value=500; f1.Q.value=4; f1.gain.value=8;
      const f2=ctx.createBiquadFilter(); f2.type='peaking'; f2.frequency.value=1600; f2.Q.value=5; f2.gain.value=5;
      osc.type='sawtooth'; osc.frequency.value=ROOT_HZ;
      const vib=ctx.createOscillator(),vg=ctx.createGain(); vib.frequency.value=5; vg.gain.value=ROOT_HZ*0.008;
      vib.connect(vg); vg.connect(osc.frequency); vib.start(); liveNodes.push(vib);
      const sw=ctx.createOscillator(),sl=ctx.createGain(); sw.frequency.value=0.04; sl.gain.value=0.15;
      sw.connect(sl); sl.connect(gn.gain); sw.start(); liveNodes.push(sw);
      gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(0.3,ctx.currentTime+5);
      osc.connect(f1); f1.connect(f2); f2.connect(gn); gn.connect(rev); osc.start(); liveNodes.push(osc);
    }

    function start() {
      const ctx = _getCtx();
      if (playing) return;
      playing = true;
      masterGain = ctx.createGain(); masterGain.gain.value = 0.82; masterGain.connect(ctx.destination);
      ['shimmer','oud','wind','tabla','drone','hum'].forEach(k => {
        gains[k] = ctx.createGain(); gains[k].gain.value = vols[k]*0.88; gains[k].connect(masterGain);
      });
      startShimmer(ctx); startSandyWind(ctx); startDrone(ctx); startThroatHum(ctx); scheduleOud(ctx);
      tablaStep = 0; nextTablaTime = ctx.currentTime + 0.1; tablaScheduler(ctx);
    }

    function stop() {
      playing = false;
      clearTimeout(lookaheadTimer); clearTimeout(oudTimer);
      scheduledTimers.forEach(t => clearTimeout(t)); scheduledTimers = [];
      const now = _ctx ? _ctx.currentTime : 0;
      liveNodes.forEach(n => { try { n.stop(now+0.4); } catch(e) {} });
      liveNodes = []; sharedRev = null;
      if (masterGain) { try { masterGain.gain.setTargetAtTime(0, now, 0.3); } catch(e) {} masterGain = null; }
      Object.keys(gains).forEach(k => delete gains[k]);
    }

    return { start, stop };
  })();

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────
  let _active = null;

  function play(track) {
    if (_active === track) return; // already playing
    if (_active) {
      if (_active === 'town')   TownTrack.stop();
      if (_active === 'forest') ForestTrack.stop();
      if (_active === 'boss')   BossTrack.stop();
      if (_active === 'desert') DesertTrack.stop();
    }
    _active = track;
    if (track === 'town')   TownTrack.start();
    if (track === 'forest') ForestTrack.start();
    if (track === 'boss')   BossTrack.start();
    if (track === 'desert') DesertTrack.start();
    if (!track)             _active = null;
  }

  function stop() { play(null); }

  function setBossPhase(phase) { BossTrack.setPhase(phase); }

  return { play, stop, setBossPhase, playPartyRequest, playPartyJoined };
})();
