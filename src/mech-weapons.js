import * as T from '../vendor/three.module.min.js';
import {MAKERS} from './parts.js?v=1.8.0';
import {palette} from './mech-surface.js?v=1.8.0';
import {panel,shell,block,cyl,ring,bolts,vent,light,decal} from './mech-geometry.js?v=1.8.0';

export function makeWeapon(parent,p,accent,options={}){
  const g=new T.Group();parent.add(g);if(!p)return g;
  const c=palette(MAKERS[p.maker].color),kind=p.kind;
  if(options.reference&&kind!=='missile')Object.assign(c,{paint:0x4d5559,light:0x747b7e,shade:0x242c32,frame:0x171f26,steel:0x8e979b});
  if(kind==='missile'){
    shell(g,1.1,1.02,1.4,0,0,-.12,c.shade,'plate',.11);
    shell(g,1.17,1.03,.14,0,0,.61,c.paint,'plate',.09);
    for(const x of [-.31,0,.31])for(const y of [-.24,.12]){
      cyl(g,.142,.09,x,y+.06,.703,0x090e12,'z',.142,'rubber');
      ring(g,.149,.021,x,y+.06,.755,c.steel);
      cyl(g,.076,.015,x,y+.06,.742,0x273037,'z',.076,'rubber');
    }
    for(const s of [-1,1]){
      panel(g,.13,.89,1.08,s*.53,0,-.11,c.light);
      block(g,.03,.65,.11,s*.609,0,-.26,c.frame);
      light(g,.026,.27,s*.47,0,.709,accent);
      for(const z of [-.56,.22])cyl(g,.042,.06,s*.62,.27,z,c.steel,'x',.042,'metal',6);
    }
    shell(g,.92,.15,1.2,0,.55,-.08,c.paint,'plate',.12);
    const rear=new T.Group();rear.position.z=-.825;rear.rotation.y=Math.PI;g.add(rear);vent(rear,.58,.23,0,-.24,0);bolts(rear,.73,.57,0,.05,0);
    bolts(g,.78,.7,0,0,.713);decal(g,'06',.21,.13,.26,.32,.69);
    g.userData.muzzle=new T.Vector3(0,0,.78);return g;
  }
  if(kind==='sword'){
    panel(g,.38,.35,.76,0,0,.05,c.frame);panel(g,.48,.22,.42,0,.14,.16,c.paint);
    panel(g,.83,.16,.2,0,0,.54,c.light);
    const blade=panel(g,.4,2.68,.105,0,0,1.96,c.steel,'blade',.013);blade.rotation.x=Math.PI/2;
    const spine=panel(g,.16,2.48,.07,0,.064,1.91,c.shade,'blade',.008);spine.rotation.x=Math.PI/2;
    block(g,.025,.035,2.27,-.075,.083,1.82,accent,'light');
    for(const s of [-1,1])cyl(g,.055,.1,s*.22,.03,.39,c.steel,'x');
    bolts(g,.3,.18,0,0,.43);g.userData.muzzle=new T.Vector3(0,0,2.7);return g;
  }
  if(kind==='punch'){
    panel(g,.66,.49,.95,0,-.03,.4,c.paint);panel(g,.74,.39,.15,0,.03,.98,c.light);
    for(const x of [-.24,-.08,.08,.24]){cyl(g,.068,.63,x,.06,.97,c.steel,'z');ring(g,.083,.016,x,.06,.99,c.frame);}
    for(const s of [-1,1]){cyl(g,.13,.84,s*.28,-.2,.45,c.frame,'z');cyl(g,.06,.56,s*.28,-.2,1.02,c.steel,'z');}
    vent(g,.33,.21,0,.08,.969);g.userData.muzzle=new T.Vector3(0,0,1.4);return g;
  }
  const cannon=kind==='cannon',sniper=kind==='sniper',rail=kind==='railgun',mg=kind==='machinegun',laser=kind==='laser',shotgun=kind==='shotgun';
  const length=cannon?3.25:sniper?3.45:rail?3.2:mg?2.63:2.65;
  panel(g,cannon?.63:.45,cannon?.61:.45,1.4,0,0,.34,c.shade);
  shell(g,cannon?.71:.5,.2,1.17,0,.23,.32,c.paint,'plate',.12);
  for(const side of [-1,1]){
    const receiver=new T.Group();receiver.position.set(side*(cannon?.36:.265),.03,.31);receiver.rotation.y=side*Math.PI/2;g.add(receiver);
    shell(receiver,1.08,cannon?.48:.36,.09,0,0,0,c.paint,'chest',.13);
    bolts(receiver,.57,.2,0,0,.065);decal(receiver,'03',.19,.085,0,.03,.071);
  }
  for(const s of [-1,1]){
    panel(g,.07,.29,.73,s*(cannon?.34:.25),0,.25,c.light);
    for(let i=0;i<3;i++)block(g,.024,.13,.07,s*(cannon?.39:.3),.01,.03+i*.19,c.black,'rubber');
  }
  panel(g,.26,.19,.67,0,.03,-.59,c.frame);
  panel(g,.35,.45,.17,0,0,-.91,c.shade);
  block(g,.14,.34,.18,0,-.33,.02,c.black,'rubber');
  if(!cannon&&!rail){const mag=panel(g,.23,.56,.31,0,-.41,.57,c.frame);mag.rotation.x=-.19;for(let i=0;i<3;i++)block(g,.245,.026,.26,0,-.3-i*.12,.57,c.shade);}
  if(mg){
    for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a)*.135,y=Math.cos(a)*.135;cyl(g,.051,1.75,x,y,1.97,c.steel,'z');cyl(g,.031,.025,x,y,2.86,c.black,'z');}
    for(const z of [1.2,2.06,2.68])cyl(g,.22,.13,0,0,z,c.frame,'z');
    cyl(g,.33,.49,.32,-.09,.36,c.frame,'x');cyl(g,.25,.52,.34,-.09,.36,c.light,'x');
  }else if(rail){
    for(const s of [-1,1]){
      panel(g,.16,.24,2.47,s*.19,.01,1.75,c.paint);
      block(g,.033,.06,2.2,s*.11,.02,1.8,accent,'light');
      for(let i=0;i<6;i++)block(g,.25,.32,.1,s*.2,0,.85+i*.32,c.frame);
    }
    panel(g,.7,.1,.45,0,.17,.7,c.light);
  }else{
    const radius=cannon?.145:shotgun?.11:.064;
    cyl(g,radius,length-.5,0,0,1.53,c.steel,'z');
    shell(g,cannon?.56:.38,cannon?.48:.33,1.12,0,.035,1.38,c.frame,'plate',.12);
    if(!cannon)for(const side of [-1,1])shell(g,.095,.28,1.48,side*.19,.015,1.74,c.paint,'plate',.12);
    for(let i=0;i<5;i++){
      block(g,cannon?.53:.37,.045,.07,0,.23,1.02+i*.18,c.paint);
      for(const s of [-1,1])block(g,.02,.15,.085,s*(cannon?.27:.19),.01,1.02+i*.18,c.black,'rubber');
    }
    const tip=1.53+(length-.5)/2;
    cyl(g,radius*1.72,.25,0,0,tip,c.frame,'z');ring(g,radius*1.45,.028,0,0,tip+.137,c.steel);
    cyl(g,radius*.96,.012,0,0,tip+.144,c.black,'z',radius*.96,'rubber');
    if(cannon)for(const s of [-1,1]){cyl(g,.071,1.73,s*.26,-.18,1.25,c.frame,'z');cyl(g,.035,1.14,s*.26,-.18,2.15,c.steel,'z');}
  }
  if(options.reference&&kind==='rifle'){
    shell(g,.32,.26,1.64,0,.08,1.81,c.paint,'plate',.045);
    block(g,.039,.025,1.37,-.12,.224,1.83,accent,'light');
    for(const z of [.7,1.4,2.1])block(g,.37,.035,.045,0,.254,z,c.frame);
  }else for(let i=0;i<7;i++)block(g,.21,.029,.06,0,.327,-.06+i*.15,c.steel,'metal');
  if(sniper){cyl(g,.11,.72,0,.44,.18,c.frame,'z');ring(g,.11,.018,0,.44,.56,c.steel);cyl(g,.077,.022,0,.44,.567,accent,'z',.077,'light');}
  else {panel(g,.13,.16,.21,0,.39,.05,c.frame);light(g,.045,.035,0,.39,.17,accent);}
  if(laser){for(const s of [-1,1]){panel(g,.15,.43,.95,s*.32,0,.49,c.paint);block(g,.025,.12,.65,s*.412,0,.49,accent,'light');}cyl(g,.07,.3,0,0,2.86,accent,'z',.07,'light');}
  bolts(g,.28,.24,0,0,1.055);decal(g,'CAUTION',.24,.055,0,.18,1.062,'#c2ad78');
  g.userData.muzzle=new T.Vector3(0,0,mg?2.88:rail?3.02:laser?3.04:1.53+(length-.5)/2+.16);return g;
}
