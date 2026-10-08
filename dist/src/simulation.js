import {statsFor,getPart,missionInfo,enemyLoadout} from './parts.js?v=1.0.0';

export function rngFrom(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const COVERS=[{x:-8,z:-3,r:2},{x:7,z:4,r:2.1},{x:-4,z:8,r:1.55},{x:4,z:-9,r:1.55}];
export function lineBlocked(a,b){return COVERS.some(c=>{const dx=b.x-a.x,dz=b.z-a.z;const t=clamp(((c.x-a.x)*dx+(c.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(a.x+dx*t-c.x,a.z+dz*t-c.z)<c.r+.18;});}
export function createBattle(loadout,index,{seed=Date.now(),tactic='balanced',target='body',opponent=null}={}){
  const info=missionInfo(index),random=rngFrom(seed),enemy=opponent||enemyLoadout(index);
  const makeUnit=(id,build,x,z,ai,aim)=>{
    const stats=statsFor(build);
    return {id,build:{...build},stats,x,z,vx:0,vz:0,yaw:id===0?0:Math.PI,health:{...stats.pools},energy:stats.energy,heat:0,stagger:0,stun:0,
      dead:false,boost:0,move:0,tactic:ai,target:aim,firePose:{},weapons:stats.weapons.map(w=>({...w,cd:.3+random()*.8,ammo:w.part.ammo||Infinity})),damage:0,hits:0,shots:0,broken:[],armorFlash:0};
  };
  const enemyTactic=index===0?'balanced':info.sector===5?'rush':info.sector===2?'fortress':info.sector===3?'kite':['balanced','rush','kite','fortress','balanced'][info.step];
  return {time:0,seed,index,random,units:[makeUnit(0,loadout,0,-12,tactic,target),makeUnit(1,enemy,0,12,enemyTactic,info.boss?'arms':'body')],projectiles:[],events:[],log:[],result:null,serial:0,info};
}
function event(b,type,data){const e={id:++b.serial,type,time:b.time,...data};b.events.push(e);if(['break','stagger','end'].includes(type)){b.log.unshift(e);b.log.length=Math.min(12,b.log.length);}return e;}
function armorKey(slot){return slot==='body'?'armorBody':slot==='legs'?'armorLegs':slot==='armL'?'armorArmL':'armorArmR';}
function chooseHit(b,shooter,enemy){
  const r=b.random();
  if(shooter.target==='arms'&&r<.7){const alive=['armL','armR'].filter(k=>enemy.health[k]>0);if(alive.length)return alive[Math.floor(b.random()*alive.length)];}
  if(shooter.target==='legs'&&r<.65&&enemy.health.legs>0)return 'legs';
  if(r>.76){const alive=['armL','armR','legs'].filter(k=>enemy.health[k]>0);if(alive.length)return alive[Math.floor(b.random()*alive.length)];}
  return 'body';
}
function damage(b,shooter,enemy,weapon,slot,mult=1,sourceSlot=null){
  if(enemy.dead)return;
  if(enemy.health[slot]<=0)slot='body';
  const armor=getPart(enemy.build[armorKey(slot)]);
  const resist=clamp(armor?.[weapon.damageType]||0,0,48);
  const armBonus=weapon.melee?(getPart(shooter.build[sourceSlot==='weaponL'?'armL':'armR'])?.melee||1):1;
  const amount=Math.max(1,Math.round(weapon.damage*(1-resist/100)*mult*armBonus*(.9+b.random()*.2)));
  enemy.health[slot]=Math.max(0,enemy.health[slot]-amount);shooter.damage+=amount;shooter.hits++;enemy.armorFlash=.14;
  enemy.stagger+=weapon.stagger*(slot==='legs'?1.35:1);
  event(b,'hit',{unit:enemy.id,from:shooter.id,slot,amount,x:enemy.x,z:enemy.z,kind:weapon.kind});
  if(enemy.health[slot]<=0&&slot!=='body'&&!enemy.broken.includes(slot)){
    enemy.broken.push(slot);event(b,'break',{unit:enemy.id,slot,x:enemy.x,z:enemy.z});
    if(slot==='legs'){enemy.stun=Math.max(enemy.stun,.8);}else enemy.stun=Math.max(enemy.stun,.32);
  }
  if(enemy.health.body<=0){enemy.dead=true;event(b,'destroy',{unit:enemy.id,x:enemy.x,z:enemy.z});}
  else if(enemy.stagger>68+enemy.stats.stability){enemy.stagger=0;enemy.stun=.7;event(b,'stagger',{unit:enemy.id,x:enemy.x,z:enemy.z});}
}
function move(b,u,enemy,dt){
  const s=u.stats,d=dist(u,enemy),dx=enemy.x-u.x,dz=enemy.z-u.z;
  u.yaw=Math.atan2(dx,dz);
  u.stun=Math.max(0,u.stun-dt);u.heat=Math.max(0,u.heat-s.cooling*dt);u.energy=Math.min(s.energy,u.energy+s.regen*dt);u.stagger=Math.max(0,u.stagger-dt*12);
  u.armorFlash=Math.max(0,u.armorFlash-dt);for(const k in u.firePose)u.firePose[k]=Math.max(0,u.firePose[k]-dt);
  if(u.dead||u.stun>0){u.move=0;u.vx=0;u.vz=0;u.boost=Math.max(0,u.boost-dt);return;}
  const live=u.weapons.filter(w=>!((w.slot==='weaponL'&&u.health.armL<=0)||(w.slot==='weaponR'&&u.health.armR<=0))&&w.ammo>0);
  const hand=live.find(w=>w.slot==='weaponR')||live[0];
  const melee=live.find(w=>w.part.melee);
  let desired=hand?hand.part.range*.64:3;
  if(u.tactic==='rush')desired=melee?melee.part.range*.68:Math.min(6,desired);
  if(u.tactic==='kite')desired=Math.max(8,...live.filter(w=>!w.part.melee).map(w=>w.part.range*.76));
  if(u.tactic==='fortress')desired=Math.max(10,...live.map(w=>w.part.range*.67));
  const blocked=lineBlocked(u,enemy);
  let forward=d>desired+1?1:d<desired-1?-1:0;
  let strafe=Math.sin(b.time*.85+u.id*2.7)>.05?1:-1;
  if(u.tactic==='fortress'&&!blocked){strafe=0;if(d<desired+1)forward=0;}
  else if(u.tactic==='rush'&&!blocked)strafe*=.14;
  else strafe*=blocked?1:.5;
  if(blocked&&Math.abs(forward)<.2)forward=.4;
  const len=d||1;
  let mx=dx/len*forward+dz/len*strafe,mz=dz/len*forward-dx/len*strafe;
  const ml=Math.hypot(mx,mz);if(ml>0){mx/=ml;mz/=ml;}
  if(u.boost<=0&&u.health.legs>0&&u.energy>27&&u.heat<68&&(u.tactic==='rush'&&d>desired+5||u.tactic==='kite'&&d<desired-3||b.random()<dt*.24)){
    u.boost=.46;u.energy-=12;u.heat+=4;event(b,'boost',{unit:u.id});
  }
  u.boost=Math.max(0,u.boost-dt);
  const speed=s.speed*(u.health.legs<=0?.28:1)*(u.boost>0?2.3:1)*(u.heat>90?.6:1);
  u.vx=mx*speed;u.vz=mz*speed;u.x=clamp(u.x+u.vx*dt,-16,16);u.z=clamp(u.z+u.vz*dt,-16,16);
  for(const c of COVERS){const od=Math.hypot(u.x-c.x,u.z-c.z),radius=c.r+1.13;if(od<radius){u.x=c.x+(u.x-c.x)/(od||1)*radius;u.z=c.z+(u.z-c.z)/(od||1)*radius;}}
  const od=dist(u,enemy);if(od<2.15){u.x=enemy.x+(u.x-enemy.x)/(od||1)*2.15;u.z=enemy.z+(u.z-enemy.z)/(od||1)*2.15;}
  u.move=ml>0?speed:0;
}
function fire(b,u,enemy,dt){
  for(const w of u.weapons){
    w.cd=Math.max(0,w.cd-dt);if(u.dead||u.stun>0||w.cd>0||u.heat>=94||w.ammo<=0||enemy.dead)continue;
    if((w.slot==='weaponL'&&u.health.armL<=0)||(w.slot==='weaponR'&&u.health.armR<=0))continue;
    const p=w.part,d=dist(u,enemy);if(d>p.range+.6||d<p.minRange)continue;
    if(!p.melee&&p.kind!=='missile'&&lineBlocked(u,enemy))continue;
    if(u.energy<p.energyShot)continue;
    u.energy-=p.energyShot;u.heat+=p.heat;w.cd=p.interval*(u.stats.underpowered?1+u.stats.powerRatio*.5:1);w.ammo--;
    u.firePose[w.slot]=p.melee?.42:.18;u.shots++;
    let accuracy=p.accuracy+u.stats.handling*.002+(u.tactic==='fortress'?.075:0)-(u.move>0?.025:0)-(enemy.boost>0?.16:0);
    if(enemy.health.legs<=0)accuracy+=.08;
    accuracy=clamp(accuracy*(1-Math.max(0,d/p.range-.65)*.42),.15,.99);
    const slot=chooseHit(b,u,enemy),hit=b.random()<accuracy;
    event(b,'fire',{unit:u.id,slot:w.slot,kind:p.kind,x:u.x,z:u.z});
    if(p.melee){if(hit)damage(b,u,enemy,p,slot,1,w.slot);else event(b,'miss',{unit:enemy.id,x:enemy.x,z:enemy.z});}
    else if(p.kind==='laser'){if(hit)damage(b,u,enemy,p,slot);b.projectiles.push({id:++b.serial,from:u.id,kind:p.kind,part:p,slot,x:u.x,z:u.z,ax:u.x,az:u.z,tx:enemy.x,tz:enemy.z,life:.12,total:.12,visual:true,hit});}
    else{
      const total=p.kind==='missile'?d/18:d/(p.kind==='railgun'?160:75);
      const tx=enemy.x+(p.kind==='missile'?0:enemy.vx*total),tz=enemy.z+(p.kind==='missile'?0:enemy.vz*total);
      b.projectiles.push({id:++b.serial,from:u.id,kind:p.kind,part:p,slot,x:u.x,z:u.z,ax:u.x,az:u.z,tx:tx+(hit?0:(b.random()-.5)*5),tz:tz+(hit?0:(b.random()-.5)*5),life:total,total,hit});
    }
  }
}
export function tick(b,dt=1/30){
  if(b.result)return b.result;
  dt=clamp(dt,.001,.05);b.events=[];b.time+=dt;
  for(let i=0;i<2;i++)move(b,b.units[i],b.units[1-i],dt);
  // Alternate attack order at each tick so simultaneous exchanges do not favor one side.
  const first=Math.floor(b.time*30)%2;fire(b,b.units[first],b.units[1-first],dt);fire(b,b.units[1-first],b.units[first],dt);
  for(const p of b.projectiles){
    p.life-=dt;const enemy=b.units[1-p.from];
    if(p.kind==='missile'){p.tx=enemy.x;p.tz=enemy.z;}
    const t=clamp(1-p.life/Math.max(.001,p.total),0,1);p.x=p.ax+(p.tx-p.ax)*t;p.z=p.az+(p.tz-p.az)*t;
    if(p.life<=0&&!p.visual){if(p.hit&&!enemy.dead&&(p.kind==='missile'||Math.hypot(p.tx-enemy.x,p.tz-enemy.z)<2.1))damage(b,b.units[p.from],enemy,p.part,p.slot);else event(b,'miss',{unit:enemy.id,x:p.tx,z:p.tz});}
  }
  b.projectiles=b.projectiles.filter(p=>p.life>0);
  if(b.units.some(u=>u.dead)||b.time>=75){
    const ratios=b.units.map(u=>u.health.body/u.stats.pools.body),won=b.units[1].dead&&!b.units[0].dead||!b.units[0].dead&&!b.units[1].dead&&ratios[0]>ratios[1];
    b.result={won,time:+b.time.toFixed(1),timeout:b.time>=75,damage:Math.round(b.units[0].damage),accuracy:b.units[0].shots?Math.round(b.units[0].hits/b.units[0].shots*100):0,health:Math.round(ratios[0]*100),broken:[...b.units[1].broken],seed:b.seed};
    event(b,'end',{won});return b.result;
  }
  return null;
}
export function fastForward(b){for(let i=0;i<2300&&!b.result;i++)tick(b,1/30);return b.result;}
