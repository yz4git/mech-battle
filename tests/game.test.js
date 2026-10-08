import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTS,FAMILIES,SLOT_DEFS,getPart,partId,accepts,statsFor,starterLoadout,enemyLoadout,missionInfo} from '../src/parts.js';
import {createBattle,tick,fastForward} from '../src/simulation.js';
import {newState,normalizeState,settleBattle,unlockedMission,shopOffers} from '../src/state.js';

test('1,664 collectible parts have unique IDs, complete stats and legal equipment slots',()=>{
  assert.equal(PARTS.length,1664);assert.equal(new Set(PARTS.map(p=>p.id)).size,1664);
  for(const p of PARTS){assert.ok(p.weight>0);assert.ok(SLOT_DEFS.some(s=>accepts(s,p)),p.id);assert.ok(Number.isFinite(p.price));assert.equal(p.kind,FAMILIES[p.family].id);if(p.type==='weapon'){assert.ok(p.damage>0&&p.interval>0&&p.range>p.minRange);assert.ok(p.accuracy>0&&p.accuracy<=1);}}
});
test('all 40 enemy builds have compatible parts and valid battle outcomes',()=>{
  for(let index=0;index<40;index++){const build=enemyLoadout(index);for(const slot of SLOT_DEFS)assert.ok(slot.optional&&build[slot.id]===null||accepts(slot,getPart(build[slot.id])),`${index}/${slot.id}`);const s=statsFor(build);assert.ok(s.speed>0&&s.pools.body>0);const result=fastForward(createBattle(starterLoadout(),index,{seed:90+index}));assert.ok(result&&result.time<=75.1);assert.ok(Number.isFinite(result.damage));}
});
test('frame rate and accelerated viewing do not change a deterministic combat outcome',()=>{
  const a=createBattle(starterLoadout(),2,{seed:38471}),b=createBattle(starterLoadout(),2,{seed:38471});
  const result=fastForward(a);while(!b.result){for(let frame=0;frame<4&&!b.result;frame++)tick(b,1/30);}assert.deepEqual(b.result,result);
});
test('first mission is winnable without purchases across 20 seeds',()=>{
  let wins=0;for(let seed=1;seed<=20;seed++)if(fastForward(createBattle(starterLoadout(),0,{seed})).won)wins++;
  assert.ok(wins>=16,`${wins}/20 starter wins`);
});
test('broken arms disable their handheld weapons while shoulder weapons remain available',()=>{
  const b=createBattle(starterLoadout(),0,{seed:36});b.units[0].x=0;b.units[0].z=0;b.units[1].x=0;b.units[1].z=8;b.units[0].health.armL=0;b.units[0].health.armR=0;
  const fired=[];for(let i=0;i<150&&!b.result;i++){tick(b);fired.push(...b.events.filter(e=>e.type==='fire'&&e.unit===0).map(e=>e.slot));}
  assert.ok(!fired.includes('weaponL')&&!fired.includes('weaponR'));assert.ok(fired.includes('shoulderL'));
});
test('missiles and lasers retain their distinct projectile behavior',()=>{
  const build=starterLoadout();build.weaponR=partId('laser');const b=createBattle(build,0,{seed:5});b.units[1].z=6;const kinds=new Set();let laserHit=false;
  for(let i=0;i<200&&!b.result;i++){tick(b);for(const p of b.projectiles)kinds.add(p.kind);if(b.events.some(e=>e.type==='hit'&&e.kind==='laser'))laserHit=true;}
  assert.ok(kinds.has('missile'));assert.ok(kinds.has('laser'));assert.ok(laserHit);
});
test('each battle grants salvage exactly once and victory unlocks the next mission',()=>{
  const state=newState(),seed=711;state.pending={seed,index:0};const result={won:true,time:15,health:50};const before=state.credits,drops=settleBattle(state,result,0,seed);
  assert.equal(drops.drops.length,3);assert.equal(unlockedMission(state),1);assert.ok(state.credits>before);const credits=state.credits,inventory=state.inventory.length;
  assert.equal(settleBattle(state,result,0,seed),null);assert.equal(state.credits,credits);assert.equal(state.inventory.length,inventory);
});
test('defeat yields a recovery part and keeps progression locked',()=>{
  const state=newState();state.pending={seed:12,index:0};const r=settleBattle(state,{won:false,time:10,health:0},0,12);
  assert.equal(r.drops.length,1);assert.ok(r.credits>0);assert.equal(unlockedMission(state),0);assert.equal(state.wins,0);
});
test('save imports repair invalid builds and reject incompatible schemas',()=>{
  assert.throws(()=>normalizeState({schema:9}));const original=newState(),raw={...original,build:{body:partId('rifle'),weaponR:'not-real'},inventory:['unknown'],credits:-4,mission:39,pending:{seed:5}};
  const cleaned=normalizeState(raw);assert.equal(cleaned.credits,0);assert.equal(cleaned.mission,0);assert.equal(cleaned.pending,null);for(const s of SLOT_DEFS)assert.ok(s.optional&&!cleaned.build[s.id]||accepts(s,getPart(cleaned.build[s.id])));assert.ok(cleaned.inventory.every(getPart));
});
test('shop stock spans assembly categories and contains only unowned valid parts',()=>{
  const state=newState(),offers=shopOffers(state);assert.equal(offers.length,12);assert.ok(offers.every(p=>!state.inventory.includes(p.id)));assert.deepEqual(new Set(offers.map(p=>p.type)),new Set(['body','arm','legs','engine','armor','weapon']));
});
