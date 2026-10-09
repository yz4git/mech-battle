import {getPart,MAKERS,SLOT_DEFS,TACTICS} from './parts.js?v=1.2.0';
import {analyzeBuild,compareBuild,combatAdvice} from './build-analysis.js?v=1.2.0';
const value=n=>Number.isInteger(n)?n.toLocaleString('ja-JP'):n.toFixed(1);
export function fittingPanel(build,slot,id){
  if(!id)return '';
  const p=getPart(id),s=analyzeBuild({...build,[slot]:id}),rows=compareBuild(build,slot,id);
  return `<div class="fitting-panel" role="region" aria-label="試着中の性能比較"><div class="fitting-heading"><div><small>FITTING / ${SLOT_DEFS.find(s=>s.id===slot).name}</small><strong>${p.name} <span>${p.title}</span></strong></div><button class="close-button" data-action="cancel-fit" aria-label="試着をやめる">×</button></div><div class="comparison-grid">${rows.map(r=>`<div><small>${r.label}</small><b>${value(r.after)} <i>${r.unit}</i></b><span class="${r.delta*r.better>0?'plus':r.delta*r.better<0?'minus':'unchanged'}">${r.delta?(r.delta>0?'+':'')+value(r.delta):'±0'}</span></div>`).join('')}</div>${s.stats.overweight||s.stats.underpowered?'<p class="fit-warning">積載・電力に注意。この構成では性能が低下します。</p>':''}<div class="fitting-actions"><span>現在の装備との差</span><button class="button primary" data-action="apply-fit">このパーツを装備</button></div></div>`;
}
export function buildBrief(build,tactic){
  const a=analyzeBuild(build,tactic),s=a.stats;
  return `<div class="build-brief"><div><span class="eyebrow">BUILD PROFILE</span><strong>${a.role}</strong></div><span class="build-score">${s.dps}<small> 推定 AP/s</small></span></div><div class="resource-meters">${[['積載',s.weight,s.capacity,'t'],['電力',s.draw,s.output,'']].map(([name,n,max,unit])=>`<div class="resource-meter ${n>max?'over':''}"><span>${name}<b>${value(n)} / ${value(max)} ${unit}</b></span><i><em style="width:${Math.min(100,n/max*100)}%"></em></i></div>`).join('')}</div>`;
}
export function diagnosticPanel(build,tactic){
  const a=analyzeBuild(build,tactic);
  return `<div class="diagnostics"><div class="section-label"><h3>機体診断</h3><span>BUILD CHECK</span></div>${a.notes.length?a.notes.map(n=>`<p class="diagnostic ${n.tone}">${n.text}</p>`).join(''):'<p class="diagnostic good">この構成は積載と電力の範囲内です。</p>'}<div class="thermal-balance"><span>最大発熱 / 冷却 <b>${a.heat.toFixed(1)} / ${a.stats.cooling}</b></span><span>射撃消費 / 回復 <b>${a.energy.toFixed(1)} / ${a.stats.regen.toFixed(1)}</b></span></div><p class="hint">全武器を連続使用した場合の目安。実戦では射程・命中・装甲により変わります。</p></div>`;
}
export function debrief(result,build,tactic){
  const weapons=result.weapons||[],max=Math.max(1,...weapons.map(w=>w.damage));
  return `<details class="debrief"><summary>戦闘レポート<span>命中 ${result.accuracy||0}% ・ ${value(result.damage||0)} DAMAGE</span></summary><div class="summary-badges"><span>総ダメージ ${value(result.damage||0)}</span><span>命中率 ${result.accuracy||0}%</span><span>部位破壊 ${result.broken?.length||0}</span></div>${weapons.map(w=>`<div class="weapon-report"><span>${SLOT_DEFS.find(s=>s.id===w.slot).name}<b>${getPart(w.id)?.title||w.id}</b></span><div><i style="width:${w.damage/max*100}%"></i></div><strong>${value(w.damage)}</strong><small>${w.hits} / ${w.shots} HIT</small></div>`).join('')}<p class="debrief-advice">${combatAdvice(result,build,tactic)}</p></details>`;
}
export function weaponStatus(unit){
  return unit.weapons.map(w=>{
    const disabled=w.slot==='weaponL'&&unit.health.armL<=0||w.slot==='weaponR'&&unit.health.armR<=0;
    const cooling=w.cd>0,ready=!disabled&&!cooling&&w.ammo>0&&unit.energy>=w.part.energyShot&&unit.heat<94;
    return `<div class="weapon-state ${disabled?'disabled':ready?'ready':''}"><small>${SLOT_DEFS.find(s=>s.id===w.slot).name}</small><b>${w.part.title}</b><span>${disabled?'OFFLINE':w.ammo===0?'EMPTY':unit.heat>=94?'OVERHEAT':unit.energy<w.part.energyShot?'CHARGING':cooling?`${w.cd.toFixed(1)} s`:'READY'}</span><i><em style="width:${disabled?0:Math.max(0,100-w.cd/w.part.interval*100)}%"></em></i><small>${Number.isFinite(w.ammo)?w.ammo+' ROUNDS':'∞'}</small></div>`;
  }).join('');
}
