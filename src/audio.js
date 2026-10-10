export class BattleAudio{
  constructor(enabled=true){this.enabled=enabled;this.ctx=null;this.nextBeat=0;this.beat=0;this.noise=null;this.footstepAt=[0,0];this.motorAt=[0,0];this.spatial=[];}
  async start(){
    if(!this.enabled)return;
    try{
      if(!this.ctx){
        const AudioCtx=window.AudioContext||window.webkitAudioContext;this.ctx=new AudioCtx();
        this.master=this.ctx.createGain();this.master.gain.value=.16;
        this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-17;this.compressor.knee.value=16;this.compressor.ratio.value=5;this.compressor.attack.value=.003;this.compressor.release.value=.18;
        this.master.connect(this.compressor);this.compressor.connect(this.ctx.destination);
        this.echo=this.ctx.createDelay(.3);this.echo.delayTime.value=.095;const filter=this.ctx.createBiquadFilter(),room=this.ctx.createGain();filter.type='lowpass';filter.frequency.value=1400;room.gain.value=.13;this.master.connect(this.echo);this.echo.connect(filter);filter.connect(room);room.connect(this.compressor);
        this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state==='suspended')await this.ctx.resume();
    }catch{}
  }
  wire(node,pan){
    if(this.ctx.createStereoPanner){const p=this.ctx.createStereoPanner();p.pan.value=Math.max(-.75,Math.min(.75,pan));node.connect(p);p.connect(this.master);return p;}
    node.connect(this.master);return null;
  }
  tone(freq,duration=.15,gain=.4,type='sine',slide=0,pan=0,delay=0){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain*(this.eventLevel??1),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);const p=this.wire(g,pan);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};
  }
  hiss(duration=.15,gain=.3,freq=1700,pan=0,delay=0){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+delay,n=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noise;filter.type='bandpass';filter.frequency.setValueAtTime(freq,t);filter.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.35),t+duration);filter.Q.value=.65;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain*(this.eventLevel??1),t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(filter);filter.connect(g);const p=this.wire(g,pan);n.start(t);n.stop(t+duration);n.onended=()=>{n.disconnect();filter.disconnect();g.disconnect();p?.disconnect();};
  }
  boom(pan=0,scale=1){this.tone(82,.42,.8*scale,'sine',29,pan);this.tone(147,.23,.28*scale,'triangle',38,pan);this.hiss(.5,.62*scale,470,pan);this.hiss(.12,.28*scale,2300,pan);this.hiss(.26,.15*scale,600,pan,.08);}
  events(events,spatial=[]){this.spatial=spatial||[];spatial=this.spatial;
    let shots=0,hits=0;
    for(const e of events){
      const pan=spatial[e.unit]?.pan??(e.unit===0?-.24:.24);this.eventLevel=spatial[e.unit]?.level??1;
      if(e.type==='fire'&&shots++<4){
        if(e.kind==='sword'){this.hiss(.25,.35,2800,pan);this.tone(780,.22,.16,'sine',190,pan);this.tone(150,.14,.19,'triangle',65,pan);}
        else if(e.kind==='punch'){this.tone(140,.2,.45,'triangle',32,pan);this.hiss(.12,.32,1500,pan);this.tone(650,.09,.14,'square',120,pan,.03);}
        else if(e.kind==='laser'){this.tone(1700,.17,.15,'sawtooth',480,pan);this.tone(2100,.13,.08,'sine',740,pan);this.hiss(.12,.15,3400,pan);}
        else if(e.kind==='railgun'){this.hiss(.11,.5,4200,pan);this.tone(1600,.21,.17,'sawtooth',90,pan);this.tone(70,.3,.48,'sine',29,pan);}
        else if(e.kind==='missile'){this.hiss(.36,.34,950,pan);this.tone(140,.2,.18,'sawtooth',54,pan);this.hiss(.19,.18,1300,pan,.045);}
        else if(e.kind==='cannon'){this.boom(pan,.8);this.hiss(.12,.25,3300,pan);}
        else if(e.kind==='shotgun'){this.tone(120,.23,.48,'triangle',35,pan);this.hiss(.18,.5,1500,pan);this.hiss(.09,.16,3400,pan,.025);}
        else if(e.kind==='sniper'){this.hiss(.14,.48,2700,pan);this.tone(105,.21,.34,'triangle',34,pan);this.hiss(.1,.12,850,pan,.07);}
        else{this.tone(e.kind==='machinegun'?170:145,e.kind==='machinegun'?.065:.12,.25,'triangle',55,pan);this.hiss(e.kind==='machinegun'?.045:.08,.34,2600,pan);}
      }
      if(e.type==='hit'&&hits++<3){if(e.kind==='cannon'||e.kind==='missile')this.boom(pan,.55);else{this.hiss(.065,.15,1800,pan);this.tone(e.kind==='laser'?870:310,.06,.12,'triangle',110,pan);}}
      if(e.type==='destroy'){this.boom(pan,1);this.boom(-pan,.6);this.tone(42,.75,.32,'sine',24,pan,.06);}
      if(e.type==='break'){this.boom(pan,.65);this.hiss(.3,.3,1300,pan);}
      if(e.type==='boost'){this.hiss(.24,.17,1600,pan);this.tone(130,.22,.12,'sawtooth',310,pan);}
      if(e.type==='stagger'){this.tone(430,.16,.2,'triangle',220,pan);this.hiss(.15,.19,1400,pan);}
    }
  }
  update(battle){this.eventLevel=1;
    if(!this.enabled||!this.ctx||this.ctx.state!=='running'||!battle||battle.result)return;
    const t=this.ctx.currentTime;
    for(const u of battle.units){
      if(u.dead)continue;const pan=this.spatial[u.id]?.pan??(u.id===0?-.24:.24);this.eventLevel=this.spatial[u.id]?.level??1;
      if(u.move>.3&&u.boost<=0&&!this.spatial[u.id]?.tracked&&t>=this.footstepAt[u.id]){this.footstepAt[u.id]=t+Math.max(.22,.65/u.move);this.tone(68,.12,.13,'sine',32,pan);this.hiss(.09,.085,400,pan);this.hiss(.055,.035,2400,pan,.025);}
      if(t>=this.motorAt[u.id]){this.motorAt[u.id]=t+.65;this.tone(u.boost>0?76:44,.72,u.move>.3?.04:.022,'sawtooth',u.boost>0?120:38,pan);this.hiss(.6,.015,240,pan);}
    }
    this.eventLevel=1;if(t<this.nextBeat)return;
    const urgent=battle.units[0].health.body/battle.units[0].stats.pools.body<.35;this.nextBeat=t+(urgent?.33:.42);
    const notes=[55,55,65.4,55,73.4,55,82.4,65.4];this.tone(notes[this.beat%8],.32,.1,'triangle');
    if(this.beat%2===0)this.tone(85,.14,.14,'sine',35);else this.hiss(.065,.045,3500);
    if(this.beat%4===0)this.tone(110,.6,.035,'sine');this.beat++;
  }
  result(won){for(let i=0;i<4;i++)setTimeout(()=>{this.tone(won?[330,440,660,880][i]:[220,165,110,82][i],.4,.2,'triangle');if(won)this.tone([165,220,330,440][i],.5,.08,'sine');},i*120);}
  setEnabled(enabled){this.enabled=enabled;if(this.master)this.master.gain.value=enabled?.16:0;if(enabled)this.start();}
}
