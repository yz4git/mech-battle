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

test('weapon reports account for every shot, hit and damage, including beam and melee attacks',()=>{
  const build=starterLoadout();build.weaponR=partId('laser');build.armL=partId('anvil');
  for(let seed=1;seed<=8;seed++){
    const r=fastForward(createBattle(build,0,{seed,tactic:'rush'}));
    assert.equal(r.weapons.reduce((n,w)=>n+w.damage,0),r.damage);
    const shots=r.weapons.reduce((n,w)=>n+w.shots,0),hits=r.weapons.reduce((n,w)=>n+w.hits,0);
    assert.equal(Math.round(hits/shots*100),r.accuracy);
    assert.ok(r.weapons.some(w=>getPart(w.id).kind==='laser'&&w.shots>0));
    assert.ok(r.weapons.every(w=>w.shots>=w.hits&&w.damage>=0));
  }
});

test('fitting compares the whole machine without changing the saved loadout',async()=>{
  const {compareBuild,analyzeBuild}=await import('../src/build-analysis.js');
  const build=starterLoadout(),original={...build},rows=compareBuild(build,'legs',partId('tank'));
  assert.deepEqual(build,original);
  assert.ok(rows.find(r=>r.label==='総重量').delta>0);
  assert.ok(rows.find(r=>r.label==='機動力').delta<0);
  const overloaded={...build,legs:partId('reverse'),body:partId('bulwark'),shoulderL:partId('cannon'),shoulderR:partId('cannon')};
  assert.ok(analyzeBuild(overloaded).notes.some(n=>n.tone==='danger'));
  const plain=statsFor(build);const melee=statsFor({...build,armL:partId('anvil')});assert.ok(melee.dps>plain.dps);
});

test('a damaged primary save falls back to the last valid backup',async()=>{
  const {loadState,persist,SAVE_KEY}=await import('../src/state.js');
  const storage=new Map(),old=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  try{
    const state=newState();state.credits=2345;state.name='BACKUP-07';assert.equal(persist(state),true);
    state.credits=3000;assert.equal(persist(state),true);storage.set(SAVE_KEY,'{broken');
    const recovered=loadState();assert.equal(recovered.name,'BACKUP-07');assert.equal(recovered.credits,2345);assert.deepEqual(recovered.build,state.build);
    assert.equal(persist(recovered),true);assert.equal(loadState().credits,2345);
  }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});

test('weapon comparison exposes DPS, fire interval and heat tradeoffs without changing the build',async()=>{
  const {compareWeapon}=await import('../src/build-analysis.js');
  const build=starterLoadout(),saved={...build},c=compareWeapon(build,'weaponR',partId('machinegun'));
  const row=key=>c.rows.find(r=>r.key===key);
  assert.equal(c.current.id,build.weaponR);
  assert.equal(row('damage').trend,-1);
  assert.equal(row('dps').trend,1);
  assert.equal(row('interval').trend,1);
  assert.equal(row('heat').trend,-1);
  assert.equal(row('energy').trend,-1);
  assert.deepEqual(build,saved);
});
test('unlimited ammo and an empty shoulder slot have meaningful comparison values',async()=>{
  const {compareWeapon}=await import('../src/build-analysis.js');
  const build=starterLoadout(),laser=partId('laser');
  const infinite=compareWeapon(build,'weaponR',laser).rows.find(r=>r.key==='ammo');
  assert.equal(infinite.after,Infinity);assert.equal(infinite.trend,1);
  const same=compareWeapon({...build,weaponR:laser},'weaponR',laser);
  assert.ok(same.rows.every(r=>r.delta===0&&r.trend===0));
  const empty=compareWeapon({...build,shoulderR:null},'shoulderR',partId('cannon'));
  assert.equal(empty.current,undefined);assert.ok(empty.rows.every(r=>r.before===null&&r.delta===null));
});
test('weapon comparison only selects compatible hands or shoulders and honors the selected side',async()=>{
  const {compareWeapon,weaponSlot}=await import('../src/build-analysis.js');
  const build=starterLoadout(),rifle=partId('rifle'),missile=partId('missile');
  assert.equal(weaponSlot(build,rifle,'body'),'weaponR');
  assert.equal(weaponSlot(build,rifle,'weaponL'),'weaponL');
  assert.equal(weaponSlot(build,missile,'weaponR'),'shoulderL');
  assert.equal(weaponSlot(build,missile,'shoulderR'),'shoulderR');
  assert.equal(compareWeapon(build,'weaponL',missile),null);
  assert.equal(compareWeapon(build,'shoulderL',rifle),null);
  assert.equal(compareWeapon(build,'weaponL',rifle).current.kind,'sword');
});
