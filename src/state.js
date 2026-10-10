import {PARTS,getPart,partId,FAMILIES,SLOT_DEFS,accepts,starterLoadout,missionInfo} from './parts.js?v=1.9.0';
import {rngFrom} from './simulation.js?v=1.9.0';
export const SAVE_KEY='mech-battle-iron-salvage-v1';
export function newState(){const inventory=FAMILIES.map(f=>partId(f.id));for(const f of ['striker','scope','reverse','fusion','rifle','sword','laser','composite'])inventory.push(partId(f,1,1));return {
  schema:1,name:'CINDER-01',credits:1800,inventory:[...new Set(inventory)],build:starterLoadout(),presets:[null,null,null],
  mission:0,completed:[],tactic:'balanced',target:'body',paint:0,battles:0,wins:0,shopSeed:348218,pending:null,lastResult:null,sound:true
};}
export function normalizeState(raw){
  if(!raw||typeof raw!=='object'||raw.schema!==1)throw new Error('対応するセーブデータではありません');
  const base=newState(),state={...base};
  state.name=typeof raw.name==='string'?raw.name.slice(0,20):base.name;
  state.credits=Math.round(Math.max(0,Math.min(99999999,Number(raw.credits)||0)));
  state.inventory=[...new Set([...(Array.isArray(raw.inventory)?raw.inventory:[]).filter(id=>getPart(id)),...Object.values(starterLoadout()).filter(Boolean)])];
  const cleanBuild=build=>Object.fromEntries(SLOT_DEFS.map(slot=>{
    const id=build?.[slot.id],p=getPart(id);return [slot.id,slot.optional&&id==null?null:accepts(slot,p)&&state.inventory.includes(id)?id:base.build[slot.id]];
  }));
  state.build=cleanBuild(raw.build);state.presets=base.presets.map((_,i)=>raw.presets?.[i]?cleanBuild(raw.presets[i]):null);
  state.mission=Math.round(Math.max(0,Math.min(39,Number(raw.mission)||0)));
  state.completed=[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<40))];
  state.mission=Math.min(state.mission,unlockedMission(state));
  state.tactic=['balanced','rush','kite','fortress'].includes(raw.tactic)?raw.tactic:'balanced';
  state.target=['body','arms','legs'].includes(raw.target)?raw.target:'body';
  for(const key of ['battles','wins'])state[key]=Math.round(Math.max(0,Math.min(9999999,Number(raw[key])||0)));
  state.paint=Math.round(Math.max(0,Math.min(5,Number(raw.paint)||0)));state.shopSeed=Number(raw.shopSeed)>>>0||base.shopSeed;
  state.sound=raw.sound!==false;
  // Rewards are never re-applied from imported or stale pending battles.
  state.pending=null;state.lastResult=null;
  return state;
}
export function loadState(){
  for(const key of [SAVE_KEY,`${SAVE_KEY}-backup`]){
    try{const raw=localStorage.getItem(key);if(raw)return normalizeState(JSON.parse(raw));}catch{}
  }
  return newState();
}
export function persist(state){
  try{
    const old=localStorage.getItem(SAVE_KEY);
    if(old){try{normalizeState(JSON.parse(old));localStorage.setItem(`${SAVE_KEY}-backup`,old);}catch{}}
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));return true;
  }catch{return false;}
}
export function unlockedMission(state){let i=0;while(i<39&&state.completed.includes(i))i++;return i;}
export function shopOffers(state){
  const random=rngFrom(state.shopSeed),rank=Math.min(8,Math.floor(unlockedMission(state)/5)+2);
  const offers=[];
  // Include every part category so a new pilot can always assemble a viable machine.
  const types=['body','arm','legs','engine','armor','weapon','weapon','weapon','weapon','legs','armor','weapon'];
  for(const type of types){const pool=PARTS.filter(p=>p.type===type&&p.mark<=rank&&!state.inventory.includes(p.id)&&!offers.includes(p.id));if(pool.length)offers.push(pool[Math.floor(random()*pool.length)].id);}
  return offers.map(getPart);
}
export function settleBattle(state,result,index,seed){
  if(!state.pending||state.pending.seed!==seed)return null;
  const random=rngFrom(seed^0xABCDEF),info=missionInfo(index);
  const drops=[],count=result.won?info.rewards:1;
  let credits=result.won?info.credits:Math.round(info.credits*.25);
  for(let i=0;i<count;i++){
    const rank=Math.min(8,Math.max(1,info.rank+(result.won&&random()<.3?1:0)));
    let pool=PARTS.filter(p=>p.mark===rank&&(i!==0||info.families.includes(p.id.split('-')[1])||info.families.includes(FAMILIES[p.family].id)));
    if(!pool.length)pool=PARTS.filter(p=>p.mark===rank);
    const unowned=pool.filter(p=>!state.inventory.includes(p.id)),p=(unowned.length?unowned:pool)[Math.floor(random()*(unowned.length||pool.length))];
    const duplicate=state.inventory.includes(p.id);if(duplicate)credits+=Math.round(p.price*.25);else state.inventory.push(p.id);
    drops.push({id:p.id,duplicate});
  }
  state.pending=null;state.battles++;if(result.won){state.wins++;if(!state.completed.includes(index))state.completed.push(index);state.mission=Math.min(39,unlockedMission(state));}
  state.credits+=credits;state.shopSeed=(seed*1664525+1013904223)>>>0;
  state.lastResult={...result,index,credits,drops};return state.lastResult;
}
