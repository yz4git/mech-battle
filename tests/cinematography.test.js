import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatCinematography} from '../src/combat-cinematography.js';
import {createBattle,tick} from '../src/simulation.js';
import {starterLoadout} from '../src/parts.js';

test('presentation timing changes viewing pace without changing deterministic combat',()=>{
 const run=present=>{const b=createBattle(starterLoadout(),0,{seed:8842}),c=new CombatCinematography();
  for(let n=0;n<5000&&!b.result;n++){tick(b,1/30);if(present){c.consume(b.events,b.units);c.update(1/30);}}
  return b.result;
 };
 assert.deepEqual(run(true),run(false));
});

test('heavy impacts decay and respect pause, accelerated viewing and reduced motion',()=>{
 const units=[{x:0,z:-3},{x:0,z:3}],c=new CombatCinematography();
 c.consume([{type:'hit',unit:1,from:0,kind:'cannon'}],units);assert.ok(c.playbackScale(1)<1);assert.equal(c.playbackScale(2),1);
 c.update(0);assert.ok(c.playbackScale(1)<1);c.update(.1);assert.equal(c.playbackScale(1),1);
 c.update(2);assert.ok(c.pulse<.00001);assert.equal(c.reactions[1].life,0);
 const calm=new CombatCinematography(true);calm.consume([{type:'break',unit:1}],units);assert.equal(calm.playbackScale(),1);assert.equal(calm.composition(units,0,2).roll,0);
});

test('all camera modes stay finite across close, separated and portrait fights',()=>{
 const c=new CombatCinematography();
 for(const distance of [0,2,12,45])for(const aspect of [.46,1,2.16])for(const mode of [0,1,2]){
  const shot=c.composition([{x:0,z:0},{x:distance,z:distance}],mode,aspect);
  assert.ok(Object.values(shot.target).every(Number.isFinite));
  for(const k of ['radius','height','angle','fov','roll','kick'])assert.ok(Number.isFinite(shot[k]),k);
  assert.ok(shot.radius>0&&shot.height>0&&shot.fov>=40&&shot.fov<=52);
 }
});
