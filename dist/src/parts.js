export const VERSION = '1.2.0';
export const MAKERS = [
  {id:'KAS',name:'カサネ重工',color:0x9ca4a7,accent:0xffbd69,shape:0,hp:1.08,weight:1.05,precision:1.0,power:1.0,tech:1.0,desc:'堅実な装甲と扱いやすい制御系'},
  {id:'VLT',name:'ヴォルト工廠',color:0x677b93,accent:0x7fcfff,shape:1,hp:.91,weight:.89,precision:1.08,power:.97,tech:1.1,desc:'軽量・高精度。電力効率を重視'},
  {id:'GRM',name:'グリム鉄鋼',color:0x8d7966,accent:0xff9b5d,shape:2,hp:1.18,weight:1.2,precision:.92,power:1.14,tech:.91,desc:'重量と引き換えに耐久と火力を確保'},
  {id:'SEN',name:'センドウ機械',color:0xa9a9a2,accent:0x9ff5da,shape:3,hp:.96,weight:.96,precision:1.13,power:.96,tech:1.06,desc:'精密照準と安定した冷却性能'},
  {id:'RDX',name:'レディックス',color:0x975f53,accent:0xff635d,shape:4,hp:1.04,weight:1.02,precision:.96,power:1.11,tech:.96,desc:'接近戦と衝撃力に特化'},
  {id:'NVA',name:'ノヴァ・システム',color:0x665e86,accent:0xc7adff,shape:5,hp:.88,weight:.93,precision:1.04,power:1.04,tech:1.17,desc:'高出力・高効率の電子機器'},
  {id:'BLK',name:'ブラックリッジ',color:0x525c64,accent:0xffd36e,shape:6,hp:1.14,weight:1.13,precision:1.03,power:1.06,tech:.94,desc:'重武装を支える安定したプラットフォーム'},
  {id:'ORC',name:'オルカ産業',color:0x538680,accent:0xa2f5f0,shape:7,hp:1.0,weight:.94,precision:.99,power:.99,tech:1.08,desc:'高い機動力とバランスのよい防御'}
];
export const FAMILIES = [
  {id:'bulwark',type:'body',name:'重装ボディ',code:'BW',hp:820,weight:34,draw:9,stability:15,handling:-3},
  {id:'striker',type:'body',name:'突撃ボディ',code:'ST',hp:640,weight:25,draw:10,stability:9,handling:2},
  {id:'wraith',type:'body',name:'偵察ボディ',code:'WR',hp:500,weight:18,draw:12,stability:4,handling:7},
  {id:'servo',type:'arm',name:'汎用アーム',code:'SV',hp:250,weight:8,draw:5,handling:9,stability:4},
  {id:'anvil',type:'arm',name:'剛力アーム',code:'AV',hp:330,weight:12,draw:6,handling:2,stability:10,melee:1.2},
  {id:'scope',type:'arm',name:'精密アーム',code:'SC',hp:210,weight:7,draw:7,handling:16,stability:1},
  {id:'biped',type:'legs',name:'二脚ユニット',code:'BP',hp:410,weight:20,draw:8,speed:3.6,capacity:139,stability:10},
  {id:'reverse',type:'legs',name:'逆関節ユニット',code:'RV',hp:320,weight:17,draw:11,speed:4.7,capacity:122,stability:4},
  {id:'quad',type:'legs',name:'四脚ユニット',code:'QD',hp:480,weight:30,draw:9,speed:3.0,capacity:177,stability:19},
  {id:'tank',type:'legs',name:'履帯ユニット',code:'TK',hp:580,weight:40,draw:7,speed:2.45,capacity:213,stability:27},
  {id:'fusion',type:'engine',name:'融合エンジン',code:'FU',weight:12,output:106,energy:110,cooling:20,thrust:1.0},
  {id:'vector',type:'engine',name:'推進エンジン',code:'VC',weight:10,output:84,energy:88,cooling:15,thrust:1.26},
  {id:'reactor',type:'engine',name:'高出力炉',code:'RC',weight:18,output:139,energy:150,cooling:27,thrust:.9},
  {id:'composite',type:'armor',name:'複合アーマー',code:'CP',weight:5,draw:0,hp:100,kinetic:13,thermal:12,explosive:11},
  {id:'reactive',type:'armor',name:'反応アーマー',code:'RA',weight:7,draw:1,hp:140,kinetic:16,thermal:5,explosive:23},
  {id:'ceramic',type:'armor',name:'耐熱アーマー',code:'CE',weight:4,draw:1,hp:85,kinetic:7,thermal:24,explosive:7},
  {id:'rifle',type:'weapon',name:'アサルトライフル',code:'AR',weight:7,draw:3,damage:44,range:18,minRange:2,interval:.62,accuracy:.83,heat:5,energyShot:1,stagger:8,ammo:200,damageType:'kinetic'},
  {id:'machinegun',type:'weapon',name:'マシンガン',code:'MG',weight:9,draw:4,damage:14,range:13,minRange:0,interval:.13,accuracy:.65,heat:2,energyShot:.3,stagger:3,ammo:650,damageType:'kinetic'},
  {id:'shotgun',type:'weapon',name:'散弾砲',code:'SG',weight:10,draw:3,damage:105,range:9,minRange:0,interval:1.42,accuracy:.91,heat:9,energyShot:2,stagger:25,ammo:70,damageType:'kinetic'},
  {id:'sniper',type:'weapon',name:'狙撃ライフル',code:'SR',weight:12,draw:4,damage:137,range:29,minRange:7,interval:2.38,accuracy:.9,heat:12,energyShot:4,stagger:24,ammo:44,damageType:'kinetic'},
  {id:'sword',type:'weapon',name:'振動ブレード',code:'VB',weight:5,draw:7,damage:136,range:3.7,minRange:0,interval:1.18,accuracy:.97,heat:7,energyShot:8,stagger:29,ammo:0,damageType:'thermal',melee:true},
  {id:'punch',type:'weapon',name:'パイルナックル',code:'PN',weight:7,draw:4,damage:197,range:3.2,minRange:0,interval:1.72,accuracy:.91,heat:6,energyShot:5,stagger:45,ammo:0,damageType:'kinetic',melee:true},
  {id:'missile',type:'weapon',name:'ミサイルポッド',code:'MP',weight:11,draw:6,damage:98,range:24,minRange:5,interval:2.75,accuracy:.88,heat:11,energyShot:7,stagger:21,ammo:40,damageType:'explosive',shoulder:true},
  {id:'cannon',type:'weapon',name:'ヘビーキャノン',code:'HC',weight:18,draw:4,damage:199,range:26,minRange:4,interval:3.15,accuracy:.77,heat:17,energyShot:3,stagger:40,ammo:34,damageType:'explosive',shoulder:true},
  {id:'laser',type:'weapon',name:'レーザーライフル',code:'LR',weight:8,draw:12,damage:79,range:22,minRange:1,interval:1.08,accuracy:.9,heat:11,energyShot:13,stagger:11,ammo:0,damageType:'thermal'},
  {id:'railgun',type:'weapon',name:'電磁レール砲',code:'RG',weight:15,draw:10,damage:166,range:30,minRange:6,interval:2.75,accuracy:.94,heat:17,energyShot:20,stagger:31,ammo:46,damageType:'kinetic',shoulder:true}
];
export const RARITIES = ['','量産','改良','精鋭','試作','特装'];
export const RARITY_COLORS = ['','#a7b4ba','#8de0bb','#88baff','#e9b464','#ef84b7'];
export const SLOT_DEFS = [
  {id:'body',name:'ボディ',type:'body',group:'frame'},
  {id:'armL',name:'左腕',type:'arm',group:'frame'},
  {id:'armR',name:'右腕',type:'arm',group:'frame'},
  {id:'legs',name:'脚',type:'legs',group:'frame'},
  {id:'engine',name:'エンジン',type:'engine',group:'frame'},
  {id:'armorBody',name:'胴装甲',type:'armor',group:'armor'},
  {id:'armorArmL',name:'左腕装甲',type:'armor',group:'armor'},
  {id:'armorArmR',name:'右腕装甲',type:'armor',group:'armor'},
  {id:'armorLegs',name:'脚装甲',type:'armor',group:'armor'},
  {id:'weaponL',name:'左手武器',type:'weapon',group:'weapon'},
  {id:'weaponR',name:'右手武器',type:'weapon',group:'weapon'},
  {id:'shoulderL',name:'左肩武器',type:'weapon',group:'weapon',shoulder:true,optional:true},
  {id:'shoulderR',name:'右肩武器',type:'weapon',group:'weapon',shoulder:true,optional:true}
];
export const PARTS = [];
for (let m=0;m<MAKERS.length;m++) for (let f=0;f<FAMILIES.length;f++) for (let mark=1;mark<=8;mark++) {
  const maker=MAKERS[m],family=FAMILIES[f],scale=1+(mark-1)*.12;
  const p={...family,id:`${maker.id}-${family.code}-${mark}`,kind:family.id,maker:m,family:f,mark,rarity:mark>=8?5:mark>=7?4:mark>=5?3:mark>=3?2:1,
    name:`${maker.id}-${family.code}${String(mark).padStart(2,'0')}`,title:family.name,price:Math.round((180+mark*mark*105+(family.damage||0)*4)*(.94+m*.025))};
  p.weight=+(family.weight*maker.weight*(1+(mark-1)*.014)).toFixed(1);
  if(family.hp)p.hp=Math.round(family.hp*maker.hp*scale);
  if(family.draw)p.draw=Math.round(family.draw/(maker.tech*(1+(mark-1)*.025)));
  if(family.damage)p.damage=Math.round(family.damage*maker.power*scale);
  if(family.accuracy)p.accuracy=Math.min(.98,+(family.accuracy*maker.precision).toFixed(3));
  if(family.output)p.output=Math.round(family.output*maker.tech*scale);
  if(family.energy)p.energy=Math.round(family.energy*maker.tech*scale);
  if(family.cooling)p.cooling=+(family.cooling*maker.tech*(1+(mark-1)*.08)).toFixed(1);
  if(family.thrust)p.thrust=+(family.thrust*(1+(mark-1)*.018)/Math.sqrt(maker.weight)).toFixed(2);
  if(family.capacity)p.capacity=Math.round(family.capacity*(.75+.25*maker.hp)*(1+(mark-1)*.038));
  if(family.speed)p.speed=+(family.speed/Math.sqrt(maker.weight)*(1+(mark-1)*.014)).toFixed(2);
  for(const k of ['kinetic','thermal','explosive'])if(family[k])p[k]=Math.round(family[k]*(.8+.2*maker.hp)*(1+(mark-1)*.06));
  p.handling=Math.round((family.handling||0)*maker.precision);
  p.stability=Math.round((family.stability||0)*(.7+.3*maker.hp));
  PARTS.push(Object.freeze(p));
}
export const PART_MAP = new Map(PARTS.map(p=>[p.id,p]));
export const getPart = id => PART_MAP.get(id);
export const accepts = (slot,p) => !!p&&p.type===slot.type&&(slot.type!=='weapon'||!!p.shoulder===!!slot.shoulder);
export const partId = (family,mark=1,maker=0) => `${MAKERS[maker].id}-${FAMILIES.find(f=>f.id===family).code}-${Math.max(1,Math.min(8,mark))}`;
export function starterLoadout(){return {
  body:partId('striker'),armL:partId('servo'),armR:partId('servo'),legs:partId('biped'),engine:partId('fusion'),
  armorBody:partId('composite'),armorArmL:partId('composite'),armorArmR:partId('composite'),armorLegs:partId('composite'),
  weaponL:partId('sword'),weaponR:partId('rifle'),shoulderL:partId('missile'),shoulderR:null
};}
export function statsFor(loadout){
  const p=Object.fromEntries(SLOT_DEFS.map(s=>[s.id,getPart(loadout[s.id])]));
  const all=Object.values(p).filter(Boolean);
  const weight=+all.reduce((n,x)=>n+x.weight,0).toFixed(1),draw=all.reduce((n,x)=>n+(x.draw||0),0);
  const capacity=p.legs?.capacity||1,output=p.engine?.output||1;
  const weightRatio=weight/capacity,powerRatio=draw/output;
  const speed=+(p.legs.speed*p.engine.thrust*Math.max(.35,1-Math.max(0,weightRatio-.55)*.42)*Math.min(1,1/powerRatio)).toFixed(2);
  const pools={body:p.body.hp+p.armorBody.hp,armL:p.armL.hp+p.armorArmL.hp,armR:p.armR.hp+p.armorArmR.hp,legs:p.legs.hp+p.armorLegs.hp};
  const resist=Object.fromEntries(Object.keys(pools).map(key=>{
    const a=p['armor'+key[0].toUpperCase()+key.slice(1)];return [key,{kinetic:a?.kinetic||0,thermal:a?.thermal||0,explosive:a?.explosive||0}];
  }));
  const weapons=['weaponL','weaponR','shoulderL','shoulderR'].map(slot=>({slot,part:p[slot]})).filter(x=>x.part);
  const handling=(p.armL.handling+p.armR.handling+p.body.handling)/2;
  const stability=all.reduce((n,x)=>n+(x.stability||0),0);
  const dps=Math.round(weapons.reduce((n,w)=>n+w.part.damage/w.part.interval*w.part.accuracy*(w.part.melee?(p[w.slot==='weaponL'?'armL':'armR'].melee||1):1),0));
  return {weight,draw,capacity,output,weightRatio,powerRatio,speed,pools,resist,weapons,handling,stability,dps,energy:p.engine.energy,cooling:p.engine.cooling,
    regen:Math.max(3,(output-draw)*.27),overweight:weightRatio>1,underpowered:powerRatio>1,
    armor:Math.round(Object.values(resist).reduce((n,r)=>n+r.kinetic+r.thermal+r.explosive,0)/12)};
}
export const TACTICS = [
  {id:'balanced',name:'適正距離',desc:'主武器の射程に合わせて攻防を切り替える'},
  {id:'rush',name:'接近強襲',desc:'近接武器を優先して一気に距離を詰める'},
  {id:'kite',name:'引き撃ち',desc:'距離を保って遠距離武器で削る'},
  {id:'fortress',name:'固定砲台',desc:'移動を抑えて照準精度と砲撃を重視'}
];
export const TARGETS = [{id:'body',name:'胴を狙う'},{id:'arms',name:'腕を狙う'},{id:'legs',name:'脚を狙う'}];
export const SECTORS = [
  {name:'灰の物流区',code:'ASH YARD',theme:'industrial',color:0x687575,description:'放棄された物流ターミナル。旧式機が残る。',families:['rifle','machinegun','sword','punch','shotgun'],boss:'鋼鉄の番犬'},
  {name:'沈黙の造船所',code:'DRY DOCK',theme:'dock',color:0x507b89,description:'造船クレーンの陰で、遠距離機が待ち構える。',families:['missile','sniper','rifle','quad','vector'],boss:'港湾の狙撃手'},
  {name:'砂塵の精錬所',code:'DUST FORGE',theme:'desert',color:0x937e5f,description:'重装甲と砲撃が支配する砂漠の精錬所。',families:['cannon','tank','bulwark','reactive','punch'],boss:'移動要塞バサルト'},
  {name:'白い通信基地',code:'WHITE ARRAY',theme:'snow',color:0x9caeaf,description:'氷原に張り巡らされた精密射撃の包囲網。',families:['sniper','reverse','railgun','scope','ceramic'],boss:'白銀のゴースト'},
  {name:'零号発電区',code:'ZERO GRID',theme:'power',color:0x596975,description:'高出力炉とエネルギー兵器の実験区域。',families:['laser','reactor','railgun','ceramic','wraith'],boss:'実験機ノヴァ'},
  {name:'深層鉄道廠',code:'DEEP WORKS',theme:'industrial',color:0x726a65,description:'近接機がひしめく地下鉄道の大修理工場。',families:['sword','punch','anvil','shotgun','fusion'],boss:'双刃の破砕者'},
  {name:'赤い封鎖線',code:'RED FRONT',theme:'desert',color:0x885e56,description:'ミサイルと重砲の交差する最終防衛線。',families:['missile','cannon','reactive','quad','bulwark'],boss:'赤い砲兵隊長'},
  {name:'天頂の廃都',code:'ZENITH',theme:'dock',color:0x617480,description:'特装機が集う廃都。最終契約が待つ。',families:['railgun','laser','sniper','vector','scope'],boss:'最終機アーク・ゼロ'}
];
export const MISSION_NAMES=['回収路の確保','哨戒機を排除','武装輸送隊','精鋭機を迎撃','区域制圧'];
export function missionInfo(index){const sector=Math.min(7,Math.floor(index/5)),step=index%5;return {...SECTORS[sector],sector,step,index,rank:sector+1,boss:step===4,title:step===4?SECTORS[sector].boss:MISSION_NAMES[step],credits:600+sector*400+step*120,rewards:step===4?4:3};}
export function enemyLoadout(index){
  const info=missionInfo(index),rank=Math.max(1,info.rank-(info.step===0?1:0)),maker=(info.sector*3+info.step+2)%8;
  const fam=info.sector===0?['rifle','punch','machinegun','shotgun','cannon'][info.step]:SECTORS[info.sector].families[info.step];
  const p=(f,m=rank)=>partId(f,m,maker),b=starterLoadout();
  const legs=['biped','reverse','tank','reverse','quad','biped','quad','reverse'][info.sector];
  const heavy=['tank','quad'].includes(legs);
  b.body=p(heavy?'bulwark':'striker');b.armL=p(info.sector===5?'anvil':'servo');b.armR=p(['sniper','railgun'].includes(fam)?'scope':'servo');b.legs=p(legs);b.engine=p(info.sector>=4?'reactor':'fusion');
  for(const k of ['armorBody','armorArmL','armorArmR','armorLegs'])b[k]=p(info.sector===4?'ceramic':heavy?'reactive':'composite');
  const main=getPart(p(fam)).type==='weapon'?fam:['rifle','sniper','cannon','sniper','laser','sword','missile','railgun'][info.sector];
  const mainP=getPart(p(main));b.weaponR=p(mainP.shoulder?'rifle':main);b.weaponL=p(info.sector===5?'punch':info.step===1?'sword':'rifle');
  b.shoulderL=(info.sector>0||info.step>=3)?p(mainP.shoulder?main:'missile'):null;
  b.shoulderR=info.boss?p(info.sector>=4?'railgun':'cannon'):null;
  if(index===0){b.weaponL=p('punch');b.armorBody=p('ceramic');}
  return b;
}
