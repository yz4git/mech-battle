// Presentation state only. Combat rules, RNG and damage are independent of this.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class CombatCinematography{
 constructor(reducedMotion=false){this.reducedMotion=reducedMotion;this.reset();}
 reset(){this.clock=0;this.pulse=0;this.recoil=0;this.hold=0;this.cooldown=0;this.reactions=[{life:0,power:0,dx:0,dz:0},{life:0,power:0,dx:0,dz:0}];}
 consume(events,units){
  for(const e of events){
   const heavy=['cannon','missile','railgun'].includes(e.kind),melee=['sword','punch'].includes(e.kind);
   if(e.type==='fire'&&e.unit===0)this.recoil=Math.max(this.recoil,heavy?.55:melee?.24:.08);
   if(['hit','break','destroy','stagger'].includes(e.type)){
    const power=e.type==='destroy'?1:e.type==='break'?.7:heavy?.55:melee?.4:.12;
    this.pulse=Math.max(this.pulse,power);
    const u=units[e.unit],source=units[e.from??1-e.unit];
    if(u&&source){const d=Math.hypot(u.x-source.x,u.z-source.z)||1;this.reactions[e.unit]={life:.32,power,dx:(u.x-source.x)/d,dz:(u.z-source.z)/d};}
    // A short heavy-impact hold at normal speed; no repeated machine-gun stalls.
    if(!this.reducedMotion&&this.cooldown===0&&(e.type==='break'||heavy&&e.type==='hit'||melee&&e.type==='hit')){this.hold=.075;this.cooldown=.55;}
   }
  }
 }
 update(dt){
  this.clock+=dt;this.hold=Math.max(0,this.hold-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  this.pulse*=Math.exp(-dt*6);this.recoil*=Math.exp(-dt*14);
  for(const r of this.reactions)r.life=Math.max(0,r.life-dt);
 }
 playbackScale(speed=1){return speed===1&&!this.reducedMotion&&this.hold>0?.22:1;}
 composition(units,mode,aspect,orbit=0){
  const [a,b]=units,spread=Math.hypot(a.x-b.x,a.z-b.z),line=Math.atan2(b.x-a.x,b.z-a.z),close=1-clamp((spread-4)/18,0,1);
  let x=(a.x+b.x)/2,z=(a.z+b.z)/2,y=2.65,r=Math.max(9.6,spread*.61+5.4),height=4.9+spread*.085;
  let angle=line+Math.PI*.5+.32+orbit;
  if(!this.reducedMotion)angle+=Math.sin(this.clock*.13)*.075;
  if(mode===1){height=Math.max(27,spread*.65+19);r=9;y=1.4;}
  if(mode===2){angle=line+Math.PI+.55+orbit;x=a.x*.62+b.x*.38;z=a.z*.62+b.z*.38;r=Math.max(10,spread*.68+6);height=5.2;y=2.8;}
  if(aspect<.85){angle=line+Math.PI+clamp(orbit,-.35,.35);height=mode===1?35:Math.max(11,r*.62);r+=5;y=1.2;}
  const movement=this.reducedMotion?0:this.pulse;
  return {target:{x,y,z},radius:r,height,angle,fov:mode===1?43:48+close*2,
   roll:mode===1?0:Math.sin(this.clock*31)*movement*.007,
   kick:mode===1?0:movement*.085+this.recoil*.045};
 }
}
