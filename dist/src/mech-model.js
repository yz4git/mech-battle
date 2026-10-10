import * as T from '../vendor/three.module.min.js';
import {getPart,MAKERS} from './parts.js?v=1.8.0';
import {palette} from './mech-surface.js?v=1.8.0';
import {panel,shell,block,cyl,ring,bar,piston,bolts,vent,light,cable,decal,setGeometryDetail} from './mech-geometry.js?v=1.8.0';
import {makeWeapon} from './mech-weapons.js?v=1.8.0';
import {batchRigidMeshes,flattenRigidGroups} from './mesh-batch.js?v=1.8.0';
import {createReferenceFrame} from './reference-frame.js?v=1.8.0';

function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function joint(parent,x,y,z,r,width){
  cyl(parent,r,width,x,y,z,0x1b242b,'x',r,'rubber');
  for(const s of [-1,1]){cyl(parent,r*.85,.035,x+s*width/2,y,z,0x55636b,'x');ring(parent,r*.67,.03,x+s*(width/2+.025),y,z,0x9ca3a4,'x');cyl(parent,r*.34,.05,x+s*(width/2+.04),y,z,0x263038,'x',r*.34,'metal',8);}
}
function extraArmor(parent,p,w,h,x,y,z,c){
  if(!p)return;
  const g=group(parent,x,y,z);
  if(p.kind==='reactive'||p.id.includes('-RA-')){
    panel(g,w,h,.07,0,0,0,c.shade);
    for(const s of [-1,1]){panel(g,w*.43,h*.91,.12,s*w*.245,0,.08,c.paint);bolts(g,w*.25,h*.62,s*w*.245,0,.15);}
  }else{
    panel(g,w,h,.1,0,0,0,p.id.includes('-CE-')?c.light:c.paint,'wedge',.018);bolts(g,w*.56,h*.63,0,0,.065);
    block(g,w*.35,.012,.014,0,-h*.27,.065,c.shade);
  }
  return g;
}
function foot(parent,x,y,z,c,w=.84){
  const g=group(parent,x,y,z);
  shell(g,w,.22,1.36,0,-.04,.18,c.black,'plate',.12);
  const upper=shell(g,w*.94,.38,.91,0,.18,.16,c.paint,'toe',.12);upper.rotation.x=-.22;
  for(const side of [-1,1]){
    shell(g,w*.42,.25,.5,side*w*.255,.055,.66,c.light,'plate',.11);
    block(g,w*.34,.052,.13,side*w*.255,-.05,.86,c.frame);
    const heel=group(g,side*w*.5,.17,-.17);heel.rotation.y=side*Math.PI/2;
    shell(heel,.35,.29,.09,0,0,0,c.shade,'helmet',.13);cyl(heel,.092,.02,0,0,.06,0xb88d53,'z',.092,'paint',6);
  }
  const back=group(g,0,.23,-.55);back.rotation.y=Math.PI;
  shell(back,w*.8,.32,.2,0,0,0,c.paint,'plate',.13);light(back,w*.38,.057,0,0,.13,0xffa847);
  bolts(g,w*.6,.16,0,.14,.827);
}
function legDetail(leg,c,armor,side,accent){
  joint(leg,0,0,0,.23,.6);
  shell(leg,.6,.98,.59,0,-.52,-.01,c.frame,'greave',.12);
  const thigh=shell(leg,.56,.84,.22,0,-.49,.28,c.paint,'chest',.12);thigh.rotation.x=-.08;
  shell(leg,.35,.59,.085,-side*.09,-.49,.43,c.light,'plate',.13);
  bolts(leg,.3,.42,-side*.06,-.47,.477);
  const thighRear=group(leg,0,-.49,-.32);thighRear.rotation.y=Math.PI;
  shell(thighRear,.5,.76,.17,0,0,0,c.paint,'chest',.13);shell(thighRear,.23,.43,.055,side*.08,0,.11,c.light,'plate',.12);bolts(thighRear,.29,.43,0,0,.105);
  piston(leg,[side*.25,-.12,-.29],[side*.25,-.92,-.24],.067);
  cable(leg,[[0,-.13,-.32],[side*.14,-.47,-.43],[side*.12,-.9,-.28]],.03);
  joint(leg,0,-1.15,.11,.24,.71);
  const knee=shell(leg,.66,.53,.3,0,-1.13,.39,c.light,'greave',.13);knee.rotation.x=-.12;
  light(leg,.31,.051,0,-1.24,.556,accent);bolts(leg,.36,.23,0,-1.1,.56);
  const shin=shell(leg,.72,1.1,.64,0,-1.84,.025,c.paint,'greave',.14);shin.rotation.x=.08;
  shell(leg,.4,.84,.12,-side*.08,-1.81,.397,c.light,'greave',.12);
  const outer=group(leg,side*.35,-1.8,-.015);outer.rotation.y=side*Math.PI/2;
  shell(outer,.63,1.02,.24,0,0,0,c.paint,'greave',.13);
  shell(outer,.33,.4,.06,0,.17,.16,c.light,'plate',.15);
  cyl(outer,.12,.032,0,-.19,.17,c.frame,'z');ring(outer,.105,.019,0,-.19,.193,c.steel);
  const rear=group(leg,0,-1.87,-.33);rear.rotation.y=Math.PI;
  shell(rear,.46,.81,.12,0,0,0,c.shade,'greave',.13);vent(rear,.27,.25,0,.05,.09);
  extraArmor(leg,armor,.34,.46,-side*.09,-1.62,.46,c);
  piston(leg,[side*.3,-1.3,-.27],[side*.27,-2.32,-.3],.067);
  joint(leg,0,-2.38,-.02,.17,.64);
  shell(leg,.45,.29,.39,0,-2.35,.18,c.shade,'plate',.15);
  foot(leg,0,-2.63,.11,c);
  decal(leg,side<0?'01':'02',.16,.085,-side*.08,-1.74,.54);
}

export function createMech(build,paint,enemy,paints,reduced=false){
  setGeometryDetail(reduced);
  const root=new T.Group(),p=Object.fromEntries(Object.entries(build).map(([k,v])=>[k,getPart(v)]));
  if(p.legs.kind==='biped')return createReferenceFrame(build,p,paint,enemy,paints,reduced);
  const maker=MAKERS[p.body.maker],color=paints[paint]?.color??maker.color,c=palette(color),accent=enemy?0xff7951:0xff9e3e;
  const tank=p.legs.kind==='tank',quad=p.legs.kind==='quad',reverse=p.legs.kind==='reverse',heavy=p.body.id.includes('-BW-'),recon=p.body.id.includes('-WR-');
  const cy=tank?3.4:quad?3.25:4.07,width=heavy?2.05:recon?1.5:1.77;
  const torso=group(root,0,cy,0);
  // Narrow load-bearing spine is visible through the gaps between the armor shells.
  panel(torso,width*.66,1.11,.97,0,-.04,-.03,c.frame,'wedge');
  cyl(torso,.34,.81,0,-.83,-.02,c.black,'y',.27,'rubber');
  for(let j=0;j<4;j++)panel(torso,.67-j*.035,.105,.67,0,-.61-j*.14,.01,j%2?c.frame:c.shade);
  const core=shell(torso,width*.38,1.2,.47,0,.04,.57,c.paint,'chest',.14);core.rotation.x=-.13;
  shell(torso,width*.27,.52,.12,0,.39,.855,c.light,'chest',.12);
  vent(torso,width*.18,.16,0,-.16,.916);
  for(const s of [-1,1]){
    const chest=shell(torso,width*.49,1.02,.56,s*width*.32,.16,.33,c.light,'chest',.13);chest.rotation.y=s*.22;chest.rotation.z=-s*.065;chest.rotation.x=.18;
    const rib=shell(torso,width*.34,.58,.56,s*width*.33,-.38,.12,c.shade,'chest',.15);rib.rotation.y=s*.34;
    vent(torso,.34,.24,s*width*.35,.12,.725);for(let i=0;i<2;i++)light(torso,.25,.032,s*width*.35,.09+i*.095,.783,accent);
    panel(torso,.39,.18,.86,s*.63,.73,-.07,c.paint);
    bar(torso,[s*.51,.72,-.4],[s*.39,-.38,-.46],.07,c.steel);
    piston(torso,[s*.6,-.47,-.17],[s*.36,-1.02,.1],.082);
    cable(torso,[[s*.69,.08,-.46],[s*.89,-.28,-.49],[s*.55,-.73,-.33]],.046);
    bolts(torso,.17,.44,s*width*.31,.13,.653);
    const plate=extraArmor(torso,p.armorBody,width*.29,.44,s*width*.28,-.31,.639,c);if(plate)plate.rotation.y=s*.2;
  }
  // Small recessed sensor head; the collar, jaw and sensor glass are separate layers.
  cyl(torso,.16,.25,0,.77,-.1,c.steel);
  const head=group(torso,0,.99,-.035);
  shell(head,recon?.53:.62,.46,.68,0,.055,-.005,c.paint,'helmet',.17);
  panel(head,.47,.17,.15,0,-.08,.34,c.black,'wedge',.014);
  light(head,recon?.35:.41,.049,0,-.025,.445,accent);shell(head,.43,.14,.14,0,.095,.387,c.light,'helmet',.14);
  shell(head,.25,.25,.16,0,-.2,.3,c.paint,'helmet',.13);
  for(const s of [-1,1]){panel(head,.13,.29,.36,s*.29,-.1,.01,c.light,'wedge',.016);cyl(head,.092,.085,s*.31,.05,-.08,c.frame,'x');cyl(head,.041,.09,s*.33,.05,-.08,c.steel,'x');}
  panel(head,.15,.08,.48,0,.28,-.03,c.shade);bar(head,[.23,.18,-.22],[.41,1.2,-.49],.016,c.steel);
  decal(torso,'07',.2,.12,-.58,.47,.648);
  decal(torso,p.body.name,.42,.065,0,.16,.942,'#323e43');
  // Engine is a proper removable backpack with recessed exhaust nozzles and radiator fins.
  const ec=palette(paints[paint]?.color??MAKERS[p.engine.maker].color),back=group(torso,0,.02,-.78),jets=[];
  panel(back,.91,1.12,.5,0,0,-.02,ec.frame);
  shell(back,.69,.94,.2,0,.04,-.36,ec.paint,'plate',.12);
  const rear=group(back,0,0,-.46);rear.rotation.y=Math.PI;
  vent(rear,.42,.27,0,.19,.025);bolts(rear,.43,.63,0,0,.021);decal(rear,'EXHAUST',.3,.064,0,-.19,.06,'#d0b378');
  for(const s of [-1,1]){
    const engine=group(back,s*(p.engine.id.includes('-RC-')?.58:.5),.02,-.09);
    panel(engine,.38,.85,.59,0,.08,0,ec.paint);
    for(let j=0;j<5;j++)block(engine,.34,.034,.68,0,.05+j*.1,0,ec.shade);
    cyl(engine,.21,.37,0,-.44,0,ec.steel,'y',.14);
    cyl(engine,.153,.023,0,-.635,0,ec.black,'y',.153,'rubber');ring(engine,.176,.033,0,-.63,0,ec.frame,'y');
    cyl(engine,.128,.09,0,-.21,-.337,ec.black,'z',.128,'rubber');ring(engine,.148,.032,0,-.21,-.394,ec.steel);cyl(engine,.048,.018,0,-.21,-.403,0x42677c,'z');
    const flame=new T.Mesh(new T.ConeGeometry(.12,.92,10),new T.MeshBasicMaterial({color:0x98ddff,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));flame.userData.animated=true;flame.geometry.userData.owned=true;flame.position.set(0,-1.08,0);flame.rotation.z=Math.PI;flame.visible=false;engine.add(flame);jets.push(flame);
    if(p.engine.id.includes('-VC-')){const fin=panel(back,.16,.94,.58,s*.88,.16,-.15,ec.light,'wedge');fin.rotation.z=-s*.16;}
  }
  const arms={},guns={},shoulders={};
  for(const [slot,s] of [['armL',-1],['armR',1]]){
    const ap=p[slot],ac=palette(paints[paint]?.color??MAKERS[ap.maker].color),anvil=ap.id.includes('-AV-'),precision=ap.id.includes('-SC-'),aw=anvil?1.21:precision?.82:1.0;
    const arm=group(torso,s*(width*.5+(tank?.49:.31)),.36,tank?.21:-.01);arms[slot]=arm;
    joint(arm,0,0,0,.3,.58);
    const shoulder=shell(arm,aw*1.07,.94,.82,s*.2,.23,.015,ac.paint,'pauldrons',.14);shoulder.rotation.z=-s*.12;
    const front=shell(arm,aw*.9,.64,.12,s*.22,.26,.486,ac.light,'pauldrons',.09);front.rotation.z=-s*.12;
    const flank=group(arm,s*(aw*.64),.24,.015);flank.rotation.y=s*Math.PI/2;
    shell(flank,.67,.73,.16,0,0,0,ac.paint,'pauldrons',.12);bolts(flank,.37,.38,0,0,.11);decal(flank,'03',.25,.17,0,.09,.112);
    const shoulderRear=group(arm,s*.2,.2,-.46);shoulderRear.rotation.y=Math.PI;
    shell(shoulderRear,aw*.8,.6,.13,0,0,0,ac.paint,'pauldrons',.12);vent(shoulderRear,.27,.16,0,-.05,.09);
    extraArmor(arm,p[slot==='armL'?'armorArmL':'armorArmR'],aw*.51,.29,s*.23,.22,.538,ac);
    decal(arm,s<0?'07':'03',.27,.18,s*.25,.25,.61);
    bolts(arm,aw*.6,.38,s*.18,.2,.528);
    panel(arm,precision?.31:.4,.63,.43,0,-.55,-.025,ac.frame,'wedge');
    const upper=shell(arm,anvil?.56:.46,.63,.23,0,-.48,.27,ac.paint,'chest',.13);upper.rotation.x=-.11;
    const upperRear=group(arm,0,-.52,-.26);upperRear.rotation.y=Math.PI;
    shell(upperRear,anvil?.48:.38,.53,.13,0,0,0,ac.paint,'chest',.13);
    piston(arm,[s*.22,-.22,-.25],[s*.22,-.95,-.25],.064);
    cable(arm,[[-s*.2,-.11,-.13],[-s*.32,-.48,-.28],[-s*.2,-.92,-.12]],.034);
    joint(arm,0,-.99,.015,.19,.51);
    shell(arm,anvil?.77:.62,.91,.65,0,-1.43,.085,ac.paint,'greave',.13);
    shell(arm,.32,.7,.12,s*.12,-1.4,.453,ac.light,'greave',.13);
    extraArmor(arm,p[slot==='armL'?'armorArmL':'armorArmR'],.29,.46,-s*.06,-1.35,.435,ac);
    vent(arm,.12,.31,-s*.22,-1.47,.444);bolts(arm,.35,.5,0,-1.43,.43);
    const foreRear=group(arm,0,-1.43,-.28);foreRear.rotation.y=Math.PI;
    shell(foreRear,.43,.72,.14,0,0,0,ac.shade,'greave',.12);shell(foreRear,.23,.44,.06,0,.07,.1,ac.paint,'plate',.12);
    cyl(arm,.15,.18,0,-1.94,.08,ac.steel);panel(arm,.32,.25,.33,0,-2.05,.08,ac.frame);
    for(let j=0;j<4;j++){
      panel(arm,.064,.14,.14,-.12+j*.08,-2.16,.25,ac.shade,'plate',.007);
      panel(arm,.064,.1,.13,-.12+j*.08,-2.24,.18,ac.frame,'plate',.007);
    }
    panel(arm,.085,.19,.15,-s*.2,-2.09,.21,ac.shade,'plate',.009);
    const ws=s<0?'weaponL':'weaponR',gun=makeWeapon(arm,p[ws],accent);gun.position.set(0,-2.03,.29);guns[ws]=gun;
    const ss=s<0?'shoulderL':'shoulderR';if(p[ss]){
      const pod=group(torso,s*(width*.5+.27),.99,-.37);shoulders[ss]=pod;
      joint(pod,0,0,0,.16,.36);panel(pod,.27,.28,.4,0,.15,0,ac.frame);
      const w=makeWeapon(pod,p[ss],accent);w.position.y=.52;guns[ss]=w;
    }
  }
  const hips=group(root,0,cy-1.12,0),lc=palette(paints[paint]?.color??MAKERS[p.legs.maker].color);
  panel(hips,.94,.39,.76,0,.05,0,c.frame);shell(hips,.39,.62,.3,0,-.07,.49,c.paint,'chest',.15);shell(hips,.3,.24,.07,0,.18,.67,0xbe8c45,'plate',.15);light(hips,.17,.042,0,.21,.714,accent);
  for(const s of [-1,1]){const skirt=shell(hips,.59,.67,.24,s*.49,-.15,.37,c.light,'chest',.12);skirt.rotation.y=s*.23;skirt.rotation.z=s*.14;bolts(hips,.2,.24,s*.47,-.06,.54);const hip=panel(hips,.23,.49,.75,s*.65,-.01,-.01,c.paint,'wedge');hip.rotation.z=s*.15;}
  const legs=[];
  if(tank){
    cyl(root,.73,.34,0,2.02,-.03,lc.frame);ring(root,.69,.045,0,2.18,-.03,lc.steel,'y');
    panel(root,2.56,.53,2.9,0,1.26,-.07,lc.paint);panel(root,1.5,.42,2.3,0,1.66,-.17,lc.frame);
    for(const s of [-1,1]){
      const track=group(root,s*1.3,.61,0);
      panel(track,.78,.81,3.32,0,0,0,lc.black);
      for(let j=0;j<8;j++){joint(track,0,-.01,-1.25+j*.36,.22,.8);}
      for(let j=0;j<16;j++)for(const yy of [-.37,.36]){block(track,.87,.082,.14,0,yy,-1.43+j*.19,lc.shade);block(track,.59,.044,.095,0,yy+(yy<0?-.055:.055),-1.43+j*.19,lc.frame);}
      panel(track,.88,.15,2.91,0,.51,-.04,lc.paint);
      for(let j=0;j<4;j++){const skirt=panel(track,.1,.6,.64,s*.49,.15,-1.11+j*.74,lc.light);skirt.rotation.z=-s*.12;}
      extraArmor(track,p.armorLegs,.66,.41,0,.07,1.735,lc);light(track,.22,.07,0,.26,1.82,accent);
      for(const z of [-1.42,1.42])ring(track,.29,.053,s*.44,0,z,lc.steel,'x');
    }
    vent(root,.72,.3,0,1.35,1.46);
  }else if(quad){
    panel(hips,1.59,.38,1.66,0,-.2,-.01,lc.frame);
    for(const s of [-1,1])for(const f of [-1,1]){
      const leg=group(root,s*.68,cy-1.14,f*.61);legs.push(leg);joint(leg,0,0,0,.24,.49);
      const upper=panel(leg,.63,.9,.59,s*.42,-.31,f*.21,lc.paint,'wedge');upper.rotation.z=s*.72;upper.rotation.x=-f*.27;
      joint(leg,s*.8,-.67,f*.41,.22,.57);
      const shin=panel(leg,.43,1.08,.59,s*1.02,-1.24,f*.56,lc.light,'shin');shin.rotation.z=-s*.22;
      piston(leg,[s*.32,-.08,-f*.01],[s*.95,-1.41,f*.52],.075);
      cable(leg,[[s*.05,-.16,0],[s*.62,-.58,f*.14],[s*.9,-1.15,f*.45]],.042);
      extraArmor(leg,p.armorLegs,.39,.49,s*.84,-.66,f*.41+.32,lc);
      foot(leg,s*1.16,-1.83,f*.68,lc,.61);
      light(leg,.14,.035,s*1.04,-1.21,f*.56+.36,accent);
    }
  }else if(reverse){
    for(const s of [-1,1]){
      const leg=group(root,s*.56,cy-1.12,0);legs.push(leg);joint(leg,0,0,0,.23,.51);
      const upper=panel(leg,.54,1.04,.52,0,-.5,.29,lc.paint,'wedge');upper.rotation.x=-.44;
      joint(leg,0,-1.02,.52,.24,.61);extraArmor(leg,p.armorLegs,.43,.49,0,-.83,.82,lc);light(leg,.17,.036,0,-1.05,.79,accent);
      const shin=panel(leg,.34,1.29,.37,0,-1.63,.12,lc.frame,'shin');shin.rotation.x=.52;
      piston(leg,[s*.2,-.74,.46],[s*.2,-2.15,-.25],.075);
      panel(leg,.19,.76,.28,s*.23,-1.48,.22,lc.light,'wedge').rotation.x=.52;
      joint(leg,0,-2.21,-.27,.14,.46);panel(leg,.28,.45,.37,0,-2.41,-.11,lc.paint,'wedge');
      foot(leg,0,-2.63,.16,lc,.61);
    }
  }else for(const s of [-1,1]){const leg=group(root,s*.65,cy-1.12,0);legs.push(leg);legDetail(leg,lc,p.armorLegs,s,accent);leg.rotation.z=-s*.045;}
  root.userData={torso,arms,guns,shoulders,legs,jets,tank,quad,reverse,accent,cy,build,phase:0};
  for(const g of [torso,...Object.values(arms),...Object.values(guns),...Object.values(shoulders),...legs])g.userData.articulated=true;
  flattenRigidGroups(root);
  batchRigidMeshes(root);
  const local=new Map();root.traverse(o=>{if(!o.isMesh||o.material.userData.shared||o.material.isMeshBasicMaterial)return;let m=local.get(o.material);if(!m){m=o.material.clone();m.userData.baseEmissive=m.emissive.clone();m.userData.baseIntensity=m.emissiveIntensity;local.set(o.material,m);}o.material=m;});root.userData.materials=[...local.values()];
  setGeometryDetail(false);
  return root;
}
