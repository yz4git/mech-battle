import {getPart,statsFor,SLOT_DEFS,accepts} from './parts.js?v=1.4.0';

export function weaponSlot(build,id,preferred){
  const p=getPart(id),slots=SLOT_DEFS.filter(s=>s.type==='weapon'&&accepts(s,p));
  return slots.find(s=>s.id===preferred)?.id||slots.find(s=>s.id==='weaponR')?.id||slots[0]?.id||null;
}

export function compareWeapon(build,slot,id){
  const def=SLOT_DEFS.find(s=>s.id===slot),candidate=getPart(id);
  if(!def||def.type!=='weapon'||!accepts(def,candidate))return null;
  const current=getPart(build[slot]);
  const metrics=[
    ['damage','威力',p=>p.damage,1,''],
    ['dps','単体DPS',p=>p.damage/p.interval,1,'/s'],
    ['range','最大射程',p=>p.range,1,'m'],
    ['minRange','最短射程',p=>p.minRange,-1,'m'],
    ['interval','攻撃間隔',p=>p.interval,-1,'s'],
    ['accuracy','基礎命中',p=>p.accuracy*100,1,'%'],
    ['stagger','衝撃',p=>p.stagger,1,''],
    ['weight','重量',p=>p.weight,-1,'t'],
    ['heat','発熱 / 秒',p=>p.heat/p.interval,-1,''],
    ['energy','射撃電力 / 秒',p=>p.energyShot/p.interval,-1,''],
    ['draw','装備消費電力',p=>p.draw||0,-1,''],
    ['ammo','弾数',p=>p.ammo||Infinity,1,'']
  ];
  const rows=metrics.map(([key,label,read,better,unit])=>{
    const before=current?read(current):null,after=read(candidate);
    const delta=before===null?null:after===before?0:after-before;
    const trend=delta===null||delta===0?0:Math.sign(delta)*better;
    return {key,label,before,after,delta,trend,unit};
  });
  return {slot,def,current,candidate,rows};
}

// Estimates deliberately exclude range, enemy armor and maneuvering.
export function analyzeBuild(build,tactic='balanced'){
  const stats=statsFor(build),weapons=stats.weapons;
  const heat=weapons.reduce((n,w)=>n+w.part.heat/w.part.interval,0);
  const energy=weapons.reduce((n,w)=>n+w.part.energyShot/w.part.interval,0);
  const melee=weapons.filter(w=>w.part.melee),ranged=weapons.filter(w=>!w.part.melee);
  const sustain=Math.min(1,stats.cooling/Math.max(1,heat),stats.regen/Math.max(1,energy));
  const notes=[];
  if(stats.overweight)notes.push({tone:'danger',text:`積載を ${(stats.weight-stats.capacity).toFixed(1)} t 超過。脚を変更するか軽量化してください。`});
  if(stats.underpowered)notes.push({tone:'danger',text:`出力が ${stats.draw-stats.output} 不足。高出力エンジンに変更すると攻撃と移動が改善します。`});
  if(heat>stats.cooling*1.2)notes.push({tone:'warning',text:'連続攻撃で熱が蓄積します。冷却性能か武器の発熱を見直しましょう。'});
  if(energy>stats.regen*1.2)notes.push({tone:'warning',text:'射撃の消費がエネルギー回復を上回ります。高出力エンジンか実弾武器が有効です。'});
  if(melee.length&&tactic==='kite')notes.push({tone:'warning',text:'引き撃ちでは近接武器が届きにくくなります。接近強襲で剣や拳を活かせます。'});
  if(!ranged.length&&tactic==='fortress')notes.push({tone:'warning',text:'近接武器だけの固定砲台は攻撃機会が減ります。接近強襲を選びましょう。'});
  const role=melee.length===weapons.length?'近接格闘型':getPart(build.legs).kind==='tank'?'重装砲撃型':ranged.some(w=>w.part.kind==='sniper'||w.part.kind==='railgun')?'長距離狙撃型':melee.length?'近接・射撃複合型':'射撃制圧型';
  return {stats,heat,energy,sustain,role,notes};
}

export function compareBuild(build,slot,id){
  const before=statsFor(build),after=statsFor({...build,[slot]:id}),pool={armL:'armL',armR:'armR',legs:'legs',armorBody:'body',armorArmL:'armL',armorArmR:'armR',armorLegs:'legs'}[slot]||'body';
  const armor=slot.startsWith('armor')?['kinetic','thermal','explosive'].map((key,i)=>({label:['実弾軽減','熱軽減','爆発軽減'][i],before:before.resist[pool][key],after:after.resist[pool][key],better:1,unit:'%'})):[];
  return [
    {label:pool==='body'?'胴耐久':'部位耐久',before:before.pools[pool],after:after.pools[pool],better:1,unit:'AP'},
    {label:'推定火力',before:before.dps,after:after.dps,better:1,unit:'/s'},
    {label:'機動力',before:before.speed,after:after.speed,better:1,unit:'m/s'},
    {label:'総重量',before:before.weight,after:after.weight,better:-1,unit:'t'},
    {label:'電力余裕',before:before.output-before.draw,after:after.output-after.draw,better:1,unit:''},
    {label:'冷却',before:before.cooling,after:after.cooling,better:1,unit:'/s'},...armor
  ].map(row=>({...row,delta:+(row.after-row.before).toFixed(2)}));
}

export function combatAdvice(result,build,tactic){
  const analysis=analyzeBuild(build,tactic);
  if(analysis.notes.length)return analysis.notes[0].text;
  if(result.ownBroken?.includes('armR')||result.ownBroken?.includes('armL'))return '腕の損失で手持ち武器が停止しました。腕の耐久・部位アーマーや肩武器を見直せます。';
  if(result.ownBroken?.includes('legs'))return '脚の破壊で機動力が低下しました。脚アーマーを厚くすると距離を維持しやすくなります。';
  if(result.weapons?.some(w=>getPart(w.id)?.melee&&w.shots===0))return '近接武器を使用しませんでした。接近強襲に切り替えると、剣や拳の間合いまで踏み込みます。';
  if(result.accuracy<50)return '命中率が低めでした。照準性能の高い腕、固定砲台の作戦、脚狙いが有効です。';
  if(result.timeout)return '時間切れまで交戦しました。胴への集中攻撃や武器の射程をそろえる構成を試せます。';
  return result.won?'回収パーツを試着し、重量・機動力・火力の変化を確認できます。':'敵の主武装に合うアーマーと、間合いを変える作戦を試しましょう。';
}
