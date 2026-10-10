import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,tick,fastForward} from '../src/simulation.js';
import {starterLoadout,partId} from '../src/parts.js';
import {CombatCinematography} from '../src/combat-cinematography.js';

test('a lateral evasion dash locks travel direction while aim keeps tracking',()=>{
 const b=createBattle(starterLoadout(),0,{seed:53,tactic:'fortress'}),[u,enemy]=b.units;
 u.x=0;u.z=0;enemy.x=0;enemy.z=8;u.boostCooldown=0;
 enemy.weapons.forEach(w=>{w.cd=.1;});tick(b);
 assert.ok(u.boost>0);assert.ok(Math.abs(u.vx)>u.stats.speed*2);assert.ok(Math.abs(u.vz)<.01);
 const direction=[u.dashX,u.dashZ],yaw=u.yaw;
 enemy.x=4;tick(b);
 assert.deepEqual([u.dashX,u.dashZ],direction);assert.notEqual(u.yaw,yaw);
 u.health.legs=0;tick(b);assert.equal(u.boost,0);assert.ok(u.move<=u.stats.speed*.28+.001);
});

test('rush melee attacks trigger a short disengagement instead of remaining face to face',()=>{
 const b=createBattle(starterLoadout(),0,{seed:95,tactic:'rush'}),[u,enemy]=b.units;
 u.x=0;u.z=0;enemy.x=0;enemy.z=2.7;
 u.weapons.find(w=>w.slot==='weaponL').cd=0;tick(b);
 assert.ok(b.events.some(e=>e.type==='fire'&&e.unit===0&&e.kind==='sword'));assert.ok(u.disengage>0);
});

test('all tactics and leg forms keep fast battles bounded, finite and deterministic',()=>{
 for(const tactic of ['balanced','rush','kite','fortress'])for(const legs of ['biped','reverse','quad','tank']){
  const build={...starterLoadout(),legs:partId(legs)},b=createBattle(build,4,{seed:578,tactic});let dashes=0;
  for(let n=0;n<2300&&!b.result;n++){tick(b);dashes+=b.events.filter(e=>e.type==='boost').length;
   for(const u of b.units){assert.ok([u.x,u.z,u.energy,u.vx,u.vz].every(Number.isFinite));assert.ok(Math.abs(u.x)<19&&Math.abs(u.z)<19);assert.ok(u.energy>=0&&u.energy<=u.stats.energy+.001);}
  }
  assert.ok(b.result);assert.ok(dashes>0);assert.deepEqual(b.result,fastForward(createBattle(build,4,{seed:578,tactic})));
 }
});

test('speed framing turns smoothly and stays bounded with reduced motion',()=>{
 const units=[{x:0,z:0,vx:20,vz:0,move:20},{x:0,z:9,vx:-20,vz:0,move:20}],c=new CombatCinematography();
 c.track(units,.1);units[1].x=9;units[1].z=0;const before=c.heading;c.track(units,.1);
 assert.ok(Math.abs(c.heading-before)<=.350001);
 const shot=c.composition(units,0,2);assert.ok(shot.fov>52&&shot.fov<=60);
 const calm=new CombatCinematography(true);calm.track(units,1);assert.ok(calm.composition(units,0,2).fov<=52);
});
