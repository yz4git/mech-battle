import * as T from '../vendor/three.module.min.js';
import {getPart,MAKERS} from './parts.js?v=1.0.0';
import {COVERS} from './simulation.js?v=1.0.0';
import {SoftwareRenderer} from './software-renderer.js?v=1.0.0';

const geometries=new Map(),materials=new Map();
const dark=0x242d31,joint=0x151d21,steel=0x667279;
export const PAINTS=[{name:'メーカー',color:null},{name:'アッシュ',color:0xabb3b4},{name:'サンド',color:0x9b8764},{name:'オキサイド',color:0x95534b},{name:'ネイビー',color:0x4d647c},{name:'グラファイト',color:0x50585c}];
function mat(color,metal=.65,rough=.53,glow=false){const key=`${color}-${metal}-${rough}-${glow}`;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:glow?color:0,emissiveIntensity:glow?1.65:0}));return materials.get(key);}
function geo(w,h,d,cut=.1){const key=`b${w},${h},${d},${cut}`;if(!geometries.has(key)){
  const c=Math.min(cut,w*.22,h*.22),s=new T.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.lineTo(w/2,-h/2+c);s.lineTo(w/2,h/2-c);s.lineTo(w/2-c,h/2);s.lineTo(-w/2+c,h/2);s.lineTo(-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(.01,d-.06),steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.028,bevelThickness:.03,curveSegments:1});g.translate(0,0,-d/2+.03);geometries.set(key,g);
}return geometries.get(key);}
function box(parent,w,h,d,x,y,z,color,cut=.1){const mesh=new T.Mesh(geo(w,h,d,cut),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,r,h,x,y,z,color,axis='y',r2=r){const key=`c${r},${h},${r2}`;if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(r,r2,h,10));const m=new T.Mesh(geometries.get(key),mat(color));m.position.set(x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;m.castShadow=true;parent.add(m);return m;}
function lit(parent,w,h,d,x,y,z,color){const m=box(parent,w,h,d,x,y,z,color,.01);m.material=mat(color,.25,.3,true);return m;}
function stripes(parent,x,y,z,color,count=3){for(let i=0;i<count;i++)box(parent,.06,.24,.013,x+i*.095,y,z,color,.01);}
function armorPlate(parent,p,w,h,d,x,y,z,color){
  if(!p)return;
  const group=new T.Group();group.position.set(x,y,z);parent.add(group);
  const c=new T.Color(color).multiplyScalar(p.id.includes('-CE-')?1.12:.97).getHex();
  box(group,w,h,d,0,0,0,c,.16);
  if(p.id.includes('-RA-'))for(let i=0;i<3;i++)box(group,w*.26,h*.65,d*.4,(i-1)*w*.29,0,d*.65,dark,.035);
  else if(p.id.includes('-CE-')){box(group,w*.82,.035,.015,0,h*.22,d*.54,0xc1c8c5,.01);box(group,w*.82,.035,.015,0,-h*.22,d*.54,0xc1c8c5,.01);}
  else box(group,w*.68,.06,.018,0,-h*.27,d*.54,dark,.01);
  for(const dx of [-1,1])cylinder(group,.027,.018,dx*w*.35,h*.31,d*.58,steel,'z');
  return group;
}
function weapon(parent,p,left,accent){
  const group=new T.Group();parent.add(group);if(!p)return group;
  const color=MAKERS[p.maker].color,side=left?-1:1;
  if(p.id.includes('-VB-')){
    box(group,.22,.21,.6,0,-.06,.25,dark);box(group,.18,.14,2.05,0,-.04,1.48,steel,.045);lit(group,.04,.16,1.94,-.095,-.04,1.48,accent);box(group,.58,.12,.13,0,-.04,.48,color,.035);
  }else if(p.id.includes('-PN-')){
    box(group,.52,.4,.82,0,-.06,.5,color);for(let i=0;i<3;i++)cylinder(group,.065,.4,(i-1)*.14,-.02,1.08,steel,'z');cylinder(group,.1,.93,0,-.17,.62,dark,'z');stripes(group,-.15,.11,.93,accent);
  }else if(p.id.includes('-MP-')){
    box(group,.82,.83,1.18,0,0,0,color,.16);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){cylinder(group,.105,.07,x*.23,y*.23,.62,joint,'z');cylinder(group,.055,.025,x*.23,y*.23,.67,0xb18d6e,'z');}box(group,.6,.13,.9,0,.47,0,dark);stripes(group,-.16,.36,.615,accent,2);
  }else{
    const sniper=p.id.includes('-SR-'),cannon=p.id.includes('-HC-'),rail=p.id.includes('-RG-'),mg=p.id.includes('-MG-'),laser=p.id.includes('-LR-'),sg=p.id.includes('-SG-');
    const len=cannon?2.85:sniper?2.68:rail?2.5:mg?1.72:1.45;
    box(group,cannon?.61:.42,cannon?.5:.4,1.15,0,0,.48,color,.08);
    if(mg){for(let i=0;i<4;i++)cylinder(group,.055,len,.12*Math.sin(i*Math.PI/2),.12*Math.cos(i*Math.PI/2),1.1,dark,'z');cylinder(group,.17,.16,0,0,1.96,steel,'z');cylinder(group,.32,.4,side*.27,-.2,.45,dark,'x');}
    else if(rail){for(const x of [-.18,.18]){box(group,.13,.17,len,x,0,1.5,dark,.04);lit(group,.035,.06,len*.8,x,.1,1.6,accent);}box(group,.6,.1,.36,0,.15,.6,color);}
    else {cylinder(group,cannon?.2:sg?.145:.085,len,0,0,1.05,dark,'z');cylinder(group,cannon?.26:.12,.25,0,0,1.05+len/2,steel,'z');cylinder(group,cannon?.165:.069,.02,0,0,1.19+len/2,joint,'z');}
    if(sniper){cylinder(group,.11,.55,0,.33,.55,dark,'z');lit(group,.1,.1,.025,0,.33,.84,accent);}
    if(laser){lit(group,.2,.16,.6,0,.23,.57,accent);for(const x of [-.28,.28])box(group,.09,.28,.8,x,0,.62,dark);}
    if(!cannon&&!rail)box(group,.24,.53,.3,0,-.32,.27,dark,.035);
    stripes(group,-.1,.115,1.075,accent,2);
  }
  return group;
}
export function makeMech(build,paint=0,enemy=false){
  const root=new T.Group(),p=Object.fromEntries(Object.entries(build).map(([k,v])=>[k,getPart(v)]));
  const maker=MAKERS[p.body.maker],color=PAINTS[paint]?.color??maker.color,accent=enemy?0xff865d:maker.accent;
  const tank=p.legs.id.includes('-TK-'),quad=p.legs.id.includes('-QD-'),reverse=p.legs.id.includes('-RV-'),heavy=p.body.id.includes('-BW-'),recon=p.body.id.includes('-WR-');
  const cy=tank?2.65:quad?3.3:3.55,width=heavy?1.75:recon?1.27:1.55;
  const torso=new T.Group();torso.position.y=cy;root.add(torso);
  const chest=box(torso,width,1.47,.95,0,0,0,color,.23);chest.rotation.x=-.05;
  box(torso,width*.73,.43,1.08,0,-.65,0,dark,.12);box(torso,width*.6,.52,.25,0,.2,.58,color,.13);
  const plate=armorPlate(torso,p.armorBody,width*.94,.63,.19,0,-.22,.62,color);if(plate)plate.rotation.x=.13;
  for(const side of [-1,1]){
    const vent=box(torso,.3,.48,.18,side*width*.39,.25,.6,dark,.04);vent.rotation.z=side*.18;
    for(let i=0;i<4;i++)box(torso,.19,.027,.04,side*width*.39,.1+i*.09,.71,steel,.01);
    lit(torso,.075,.2,.045,side*width*.49,-.17,.67,accent);
    box(torso,.17,.48,.4,side*width*.51,-.45,0,dark);
  }
  box(torso,.72,.18,.73,0,.88,-.03,dark);
  const head=box(torso,recon?.55:.67,.53,.62,0,1.18,.02,color,.13);head.rotation.x=.05;
  box(torso,.72,.17,.14,0,1.19,.4,joint,.045);lit(torso,.48,.047,.018,0,1.21,.48,accent);
  box(torso,.31,.12,.73,0,1.51,-.05,dark,.025);
  cylinder(torso,.025,.72,maker.shape%2?.38:-.36,1.66,-.16,steel);
  if(maker.shape%3===0)cylinder(torso,.025,.42,.31,1.57,-.13,steel);
  stripes(torso,-.2,.28,.724,accent,Math.min(4,p.body.mark));
  const backpack=new T.Group();backpack.position.set(0,.05,-.79);torso.add(backpack);
  box(backpack,.9,.95,.5,0,0,0,dark);box(backpack,.67,.61,.06,0,.12,-.29,MAKERS[p.engine.maker].color);
  const jets=[];for(const side of [-1,1]){
    const reactor=p.engine.id.includes('-RC-'),r=reactor?.22:.17;
    cylinder(backpack,r,.72,side*.58,-.05,0,dark,'y');cylinder(backpack,r+.045,.16,side*.58,-.42,0,steel);lit(backpack,.13,.13,.1,side*.58,-.47,0,accent);
    const flame=new T.Mesh(new T.ConeGeometry(r*.7,.95,8),new T.MeshBasicMaterial({color:0x81dfff,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending}));flame.rotation.z=Math.PI;flame.position.set(side*.58,-.89,0);flame.visible=false;backpack.add(flame);jets.push(flame);
  }
  if(p.engine.id.includes('-VC-'))for(const side of [-1,1])box(backpack,.17,.7,.43,side*.84,.1,0,color,.045);
  const arms={},guns={},shoulders={};
  for(const [slot,side] of [['armL',-1],['armR',1]]){
    const ap=p[slot],ac=PAINTS[paint]?.color??MAKERS[ap.maker].color,anvil=ap.id.includes('-AV-'),precision=ap.id.includes('-SC-');
    const arm=new T.Group();arm.position.set(side*(width/2+.39),.34,0);torso.add(arm);arms[slot]=arm;
    cylinder(arm,.27,.43,0,0,0,joint,'x');box(arm,anvil?.93:.79,.55,.91,side*.08,.14,-.04,ac,.13);
    armorPlate(arm,p[slot==='armL'?'armorArmL':'armorArmR'],.58,.32,.13,side*.08,.11,.49,ac);
    box(arm,precision?.38:.48,.82,.5,0,-.53,0,dark,.09);cylinder(arm,.235,.55,0,-.92,.02,steel,'x');
    box(arm,anvil?.59:.49,.8,.66,0,-1.26,.15,ac,.1);armorPlate(arm,p[slot==='armL'?'armorArmL':'armorArmR'],.37,.38,.12,0,-1.24,.53,ac);
    box(arm,.36,.27,.34,0,-1.83,.17,joint);lit(arm,.035,.3,.035,side*.255,-1.28,.5,accent);
    const wp=slot==='armL'?'weaponL':'weaponR',gun=weapon(arm,p[wp],side<0,accent);gun.position.set(0,-1.67,.43);guns[wp]=gun;
    const shoulder=slot==='armL'?'shoulderL':'shoulderR';if(p[shoulder]){const pod=new T.Group();pod.position.set(side*(width/2+.5),.98,-.17);torso.add(pod);cylinder(pod,.12,.35,0,0,0,dark);const w=weapon(pod,p[shoulder],side<0,accent);w.position.y=.4;shoulders[shoulder]=pod;guns[shoulder]=w;}
  }
  const hips=new T.Group();hips.position.set(0,cy-1.12,0);root.add(hips);box(hips,1.07,.52,.77,0,0,0,dark);for(const side of [-1,1])box(hips,.42,.5,.36,side*.6,-.03,.39,color,.07);
  const legPivots=[];
  if(tank){
    box(root,2.4,.53,2.8,0,1.03,0,MAKERS[p.legs.maker].color,.2);box(root,1.43,.39,2.13,0,1.45,-.1,dark);
    for(const side of [-1,1]){
      const track=new T.Group();track.position.set(side*1.27,.61,0);root.add(track);box(track,.67,.85,3.14,0,0,0,joint,.23);
      box(track,.72,.11,2.63,0,.47,0,color,.04);
      for(let i=0;i<7;i++){cylinder(track,.24,.7,0,-.01,-1.15+i*.38,steel,'x');for(const y of [-.39,.39])box(track,.74,.1,.13,0,y,-1.23+i*.4,dark,.01);}
      armorPlate(track,p.armorLegs,.6,.34,.13,0,.11,1.6,color);
    }
  }else{
    const sides=quad?[[-1,-1],[-1,1],[1,-1],[1,1]]:[[-1,0],[1,0]];
    for(let i=0;i<sides.length;i++){
      const [side,fore]=sides[i],leg=new T.Group();leg.position.set(side*(quad?.89:.53),cy-1.1,quad?fore*.64:0);root.add(leg);legPivots.push(leg);
      const lc=PAINTS[paint]?.color??MAKERS[p.legs.maker].color;
      cylinder(leg,.23,.44,0,0,0,joint,'x');
      if(quad){
        const upper=box(leg,.5,.93,.65,side*.37,-.36,fore*.34,lc);upper.rotation.z=side*.8;upper.rotation.x=-fore*.3;
        cylinder(leg,.22,.56,side*.64,-.7,fore*.62,steel,'x');const shin=box(leg,.37,1.32,.43,side*.81,-1.33,fore*.75,dark);shin.rotation.z=-side*.2;
        box(leg,.75,.24,.9,side*.96,-2.04,fore*.92,lc);armorPlate(leg,p.armorLegs,.45,.46,.17,side*.72,-.78,fore*.62+.31,lc);
      }else if(reverse){
        const upper=box(leg,.57,.93,.58,0,-.43,.28,lc);upper.rotation.x=-.42;cylinder(leg,.22,.64,0,-.94,.51,steel,'x');
        const lower=box(leg,.34,1.25,.4,0,-1.48,.18,dark);lower.rotation.x=.54;cylinder(leg,.14,.5,0,-2.01,-.12,steel,'x');
        box(leg,.63,.23,.93,0,-2.16,.14,lc);armorPlate(leg,p.armorLegs,.5,.55,.15,0,-.66,.69,lc);
      }else{
        box(leg,.54,.94,.64,0,-.43,0,lc,.13);cylinder(leg,.235,.63,0,-.94,.03,steel,'x');box(leg,.61,1.06,.65,0,-1.52,.03,lc,.12);
        box(leg,.78,.3,1.17,0,-2.14,.24,dark,.12);box(leg,.68,.14,.78,0,-2,.45,lc,.06);armorPlate(leg,p.armorLegs,.55,.54,.18,0,-1.35,.44,lc);
        cylinder(leg,.055,.83,side*.31,-1.5,-.31,steel);
      }
      lit(leg,.13,.035,.027,quad?side*.8:0,-1.16,quad?fore*.75+.25:.44,accent);
    }
  }
  root.userData={torso,arms,guns,shoulders,legs:legPivots,jets,tank,quad,reverse,accent,cy,build,phase:Math.random()*6.28};
  return root;
}
function groundTexture(theme){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  const base=theme==='desert'?'#5d5143':theme==='snow'?'#99a6a5':theme==='dock'?'#384b51':'#3b4547';c.fillStyle=base;c.fillRect(0,0,512,512);
  let seed=23179;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5000;i++){const v=Math.floor(random()*60)+45;c.fillStyle=`rgba(${v},${v+4},${v+6},${random()*.14})`;c.fillRect(random()*512,random()*512,random()*8+1,random()*6+1);}
  c.strokeStyle='rgba(9,16,20,.25)';c.lineWidth=2;for(let i=0;i<=512;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
  const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(7,7);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function floorMark(parent,text,x,z,width=5){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#bec2a7';ctx.font='bold 95px monospace';ctx.textAlign='center';ctx.fillText(text,256,98);const texture=new T.CanvasTexture(canvas);const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.38,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.018,z);parent.add(m);}
export class MechScene{
  constructor(holder){
    this.holder=holder;this.time=0;this.mode='hangar';this.angle=.68;this.drag=false;this.cameraMode=0;this.effects=[];this.projectiles=new Map();this.unitModels=[];this.dirty=true;this.lastSoftwareFrame=0;this.lastBattleTime=-1;
    try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{this.renderer=new SoftwareRenderer();}
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    holder.prepend(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','装備を反映した機体の3Dビュー。指で回転');
    this.scene=new T.Scene();this.scene.background=new T.Color(0x101b23);this.scene.fog=new T.Fog(0x101b23,27,85);
    this.camera=new T.PerspectiveCamera(42,1,.15,150);this.camera.position.set(6.1,5.8,7.2);this.camera.lookAt(0,2.6,0);this.scene.add(new T.HemisphereLight(0xc9e2ee,0x39403b,2.6));
    this.key=new T.DirectionalLight(0xffe8c6,4.0);this.key.position.set(7,13,9);this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);this.key.shadow.camera.left=-20;this.key.shadow.camera.right=20;this.key.shadow.camera.top=20;this.key.shadow.camera.bottom=-20;this.key.shadow.normalBias=.025;this.scene.add(this.key);
    const rim=new T.DirectionalLight(0x7ac5ec,2.7);rim.position.set(-7,6,-8);this.scene.add(rim);this.scene.add(new T.AmbientLight(0xc7d4d8,.45));
    this.environment=new T.Group();this.scene.add(this.environment);this.makeEnvironment('hangar');
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(holder);this.resize();
    const canvas=this.renderer.domElement;canvas.style.touchAction='none';
    canvas.addEventListener('pointerdown',e=>{this.drag=true;this.px=e.clientX;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(this.drag){this.angle-=(e.clientX-this.px)*.009;this.px=e.clientX;this.dirty=true;}});
    canvas.addEventListener('pointerup',()=>this.drag=false);canvas.addEventListener('pointercancel',()=>this.drag=false);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;});
  }
  resize(){const w=this.holder.clientWidth,h=this.holder.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
  clearEnvironment(){this.environment.traverse(obj=>{if(obj.isMesh&&obj.material?.map){obj.material.map.dispose();obj.material.dispose();obj.geometry.dispose();}});this.environment.clear();}
  makeEnvironment(theme){if(this.theme===theme)return;this.theme=theme;this.clearEnvironment();const env=this.environment;
    const floor=new T.Mesh(new T.PlaneGeometry(110,110,22,22),new T.MeshStandardMaterial({map:groundTexture(theme),roughness:.94,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;env.add(floor);
    if(theme==='hangar'){
      const pad=new T.Mesh(new T.CylinderGeometry(3.7,3.8,.15,48),mat(0x4e585b,.7,.7));pad.position.y=.075;pad.receiveShadow=true;env.add(pad);
      const ring=new T.Mesh(new T.TorusGeometry(3.6,.03,4,64),mat(0xd9b46c));ring.rotation.x=Math.PI/2;ring.position.y=.16;env.add(ring);
      floorMark(env,'BAY 07',0,5.15,5.3);floorMark(env,'CAUTION',-5.5,0,3.5);
      for(let i=0;i<18;i++){const x=-8+i*.9;box(env,.44,.02,1.1,x,.013,6.3,i%2?0x252d30:0xb59959,.01);}
      for(const x of [-9,9]){box(env,.38,12,.42,x,6,-7,dark);box(env,.42,10,.38,x,5,5,dark);box(env,.24,.55,18,x,8,-.3,steel);lit(env,.045,5,.08,x,4,-6.77,0xa5dded);}
      box(env,20,11,.5,0,5.5,-9.5,0x2d3b43);for(let i=-4;i<=4;i++){box(env,.08,8,.1,i*2.3,4.5,-9.2,steel);box(env,1.75,2.3,.13,i*2.3,2,-9.15,0x38494f);}
      for(const x of [-6,0,6]){box(env,.23,.23,15,x,9,-1,dark);lit(env,.18,.035,3,x,8.84,0,0xd6e7e8);}
      box(env,4.5,.38,.58,0,8,-5.5,0xb3945f);box(env,.5,2,.45,0,6.8,-5.5,dark);cylinder(env,.13,4.8,0,4.2,-5.5,steel);
      for(const x of [-7,7]){box(env,1.8,.85,1.6,x,.43,-5.5,0x576361);box(env,1.45,.7,1.3,x,.35,-3.5,0x3d4e57);box(env,1.4,.85,1.4,x,.43,-7.5,0x7d7766);}
    }else{
      for(const c of COVERS){box(env,c.r*1.4,2.4,c.r*1.45,c.x,1.2,c.z,theme==='desert'?0x77644e:0x596871,.12);box(env,c.r*1.5,.15,c.r*1.5,c.x,2.45,c.z,dark,.04);for(let i=0;i<3;i++)box(env,.12,1.2,.025,c.x+(i-1)*.45,1.3,c.z+c.r*.73,0xa89967,.01);}
      for(let i=0;i<14;i++){
        const x=-34+i*5.2,z=-26-(i%3)*5,h=3+(i*7%9);const color=theme==='snow'?0x778c98:theme==='desert'?0x67513e:0x324854;
        box(env,3.5,h,4.5,x,h/2,z,color,.03);box(env,3.65,.2,4.6,x,h+.1,z,dark,.03);for(let j=0;j<3;j++)lit(env,.35,.15,.025,x-1+j,2+(i%3)*.5,z+2.27,0x7094a1);
      }
      for(const side of [-1,1]){
        box(env,.35,8,24,side*23,4,0,0x2b3b42);for(let j=-2;j<=2;j++){cylinder(env,.18,9,side*23.5,5,j*8,steel);lit(env,.12,.2,.2,side*22.4,3.6,j*8,0xd8ab64);}
        if(theme==='dock'){box(env,.45,18,.6,side*20,9,-17,0x786c50);box(env,11,.45,.6,side*17,17,-17,0x786c50);box(env,.12,9,.12,side*13,12.5,-17,steel);}
        if(theme==='power')for(let j=0;j<3;j++){cylinder(env,1.2,8,side*21,4,-13+j*9,dark);lit(env,.1,6,.1,side*19.8,4,-13+j*9,0x73dadf);}
      }
      for(const z of [-18,18]){box(env,36,.2,.3,0,.1,z,0x8e846b);for(let x=-16;x<=16;x+=2)box(env,.8,.015,.32,x,.011,z>0?16:-16,0xa49e85,.01);}
      floorMark(env,'SECTOR / 07',0,0,7);
    }
  }
  setHangar(build,paint=0){this.mode='hangar';this.makeEnvironment('hangar');this.setModels([build],paint);this.clearEffects();}
  setMission(build,enemy,theme,paint=0){this.mode='mission';this.makeEnvironment(theme);this.setModels([build,enemy],paint);this.unitModels[0].position.set(-4,0,-5);this.unitModels[0].rotation.y=.32;this.unitModels[1].position.set(4,0,5);this.unitModels[1].rotation.y=Math.PI+.32;this.clearEffects();}
  setBattle(b,paint=0){this.mode='battle';this.makeEnvironment(b.info.theme);this.setModels(b.units.map(u=>u.build),paint);this.clearEffects();this.battle=b;}
  setModels(builds,paint){this.unitModels.forEach(m=>this.scene.remove(m));this.unitModels=builds.map((b,i)=>{const m=makeMech(b,i===0?paint:0,i!==0);this.scene.add(m);return m;});this.dirty=true;}
  clearEffects(){for(const e of this.effects){this.scene.remove(e.mesh);if(e.mesh.material?.transparent)e.mesh.material.dispose();}this.effects=[];for(const mesh of this.projectiles.values()){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}this.projectiles.clear();}
  burst(x,z,big=false,color=0xffad59){
    for(let i=0;i<(big?26:6);i++){
      const isSmoke=big&&i>15,key=isSmoke?'smoke':'spark';if(!geometries.has(key))geometries.set(key,new T.IcosahedronGeometry(1,0));
      const material=isSmoke?new T.MeshBasicMaterial({color:0x3e4547,transparent:true,opacity:.5,depthWrite:false}):new T.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending});
      const mesh=new T.Mesh(geometries.get(key),material),angle=i*2.399;mesh.position.set(x,big?2.5:2+Math.sin(i)*.5,z);mesh.scale.setScalar(isSmoke?.5:big?.15:.055);this.scene.add(mesh);
      this.effects.push({mesh,life:isSmoke?2.5:big?1.1:.45,total:isSmoke?2.5:big?1.1:.45,vx:Math.sin(angle)*(big?5:2),vz:Math.cos(angle)*(big?5:2),vy:big?2+i%4:1,smoke:isSmoke});
    }
  }
  consumeEvents(events){for(const e of events){if(e.type==='hit')this.burst(e.x,e.z,e.kind==='cannon'||e.kind==='missile',e.kind==='laser'?0x85e9ff:0xffc285);if(e.type==='destroy')this.burst(e.x,e.z,true,0xff8645);if(e.type==='break')this.burst(e.x,e.z,true,0xffbf77);}}
  animateMech(model,u,dt){
    const d=model.userData;
    if(u){model.position.set(u.x,0,u.z);model.rotation.y=u.yaw;model.rotation.z=u.dead?Math.min(.65,(this.time-(model.userData.deathAt??=this.time))*.5):0;
      model.position.y=u.dead?-.2:0;d.torso.rotation.z=u.stun>0?Math.sin(this.time*35)*.04:0;
      d.arms.armL.visible=u.health.armL>0;d.arms.armR.visible=u.health.armR>0;
      const step=this.time*u.move*2.4;d.legs.forEach((leg,i)=>leg.rotation.x=u.health.legs<=0?-.15:Math.sin(step+i*Math.PI)*(u.move>0?.2:.015));
      if(u.move>0&&!d.tank)d.torso.position.y=d.cy+Math.abs(Math.sin(step))*.06;
      for(const [slot,arm] of [['weaponL',d.arms.armL],['weaponR',d.arms.armR]]){
        const p=getPart(u.build[slot]),pose=u.firePose[slot]||0;
        arm.rotation.x=p.melee?(p.id.includes('-VB-')?-.45-Math.sin((.42-pose)/.42*Math.PI)*1.25:-Math.sin(pose/.42*Math.PI)*1.3):-.12+(pose>0?.13:0);
        arm.rotation.z=p.melee&&pose>0?(slot==='weaponL'?1:-1)*Math.sin(pose/.42*Math.PI)*.65:(slot==='weaponL'?.03:-.03);
      }
      for(const slot of ['shoulderL','shoulderR'])if(d.shoulders[slot])d.shoulders[slot].rotation.x=(u.firePose[slot]||0)>0?-.16:0;
      d.jets.forEach(j=>{j.visible=u.boost>0;j.scale.y=1+Math.sin(this.time*55)*.22;});
    }else{
      d.torso.position.y=d.cy+Math.sin(this.time*1.4)*.015;d.arms.armL.rotation.x=-.08;d.arms.armR.rotation.x=-.08;
    }
  }
  render(dt,b=null){if(this.contextLost)return;this.time+=dt;
    const software=this.renderer instanceof SoftwareRenderer;
    if(software){const now=performance.now();if(now-this.lastSoftwareFrame<130)return;if(this.mode!=='battle'&&!this.dirty)return;if(this.mode==='battle'&&b?.time===this.lastBattleTime&&!this.effects.length&&!this.dirty)return;dt=Math.min(.2,(now-this.lastSoftwareFrame)/1000||dt);this.lastSoftwareFrame=now;this.lastBattleTime=b?.time;}
    this.unitModels.forEach((m,i)=>this.animateMech(m,this.mode==='battle'?b?.units[i]:null,dt));
    if(this.mode==='battle'&&b){
      const ids=new Set(b.projectiles.map(p=>p.id));for(const [id,m]of this.projectiles)if(!ids.has(id)){this.scene.remove(m);m.geometry.dispose();m.material.dispose();this.projectiles.delete(id);}
      for(const p of b.projectiles){let m=this.projectiles.get(p.id);if(!m){const beam=p.kind==='laser'||p.kind==='railgun';m=new T.Mesh(beam?new T.CylinderGeometry(p.kind==='laser'?.034:.055,p.kind==='laser'?.034:.055,1,5):new T.SphereGeometry(p.kind==='missile'?.11:.065,6,4),new T.MeshBasicMaterial({color:p.kind==='laser'?0x82e9ff:p.kind==='railgun'?0xb0dfff:0xffcc7b}));this.scene.add(m);this.projectiles.set(p.id,m);}
        if(p.kind==='laser'||p.kind==='railgun'){const a=new T.Vector3(p.ax,2.2,p.az),end=new T.Vector3(p.kind==='laser'?p.tx:p.x,2.2,p.kind==='laser'?p.tz:p.z),delta=end.clone().sub(a);m.position.copy(a.add(end).multiplyScalar(.5));m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
        else m.position.set(p.x,p.kind==='missile'?2.8+Math.sin((1-p.life/p.total)*Math.PI)*3.7:2.3,p.z);
      }
    }
    for(const e of this.effects){e.life-=dt;e.mesh.position.x+=e.vx*dt;e.mesh.position.z+=e.vz*dt;e.mesh.position.y+=e.vy*dt;e.vy-=dt*(e.smoke?-1:6);e.mesh.material.opacity=Math.max(0,e.life/e.total)*(e.smoke?.4:1);if(e.smoke)e.mesh.scale.addScalar(dt*.8);}
    this.effects=this.effects.filter(e=>{if(e.life>0)return true;this.scene.remove(e.mesh);e.mesh.material.dispose();return false;});
    let target=new T.Vector3(0,this.holder.clientHeight<380?2.05:2.6,0),r=9.2+Math.max(0,1.3-this.camera.aspect)*3.5,height=5.8,angle=this.angle;
    if(this.mode!=='hangar'){
      if(this.mode==='battle'&&b){const [a,c]=b.units;target.set((a.x+c.x)/2,1.8,(a.z+c.z)/2);const spread=Math.hypot(a.x-c.x,a.z-c.z);r=Math.max(15,spread*.55+10)+Math.max(0,1-this.camera.aspect)*4;height=this.cameraMode===1?32:Math.max(13,r*.75);angle=this.angle+Math.PI;
        if(this.camera.aspect<.85){angle=Math.atan2(c.x-a.x,c.z-a.z)+Math.PI+Math.max(-.4,Math.min(.4,this.angle-.68));if(this.cameraMode===1){height=Math.max(35,spread*1.2+16);r=7;}}
      }
      else{target.set(0,1.4,0);r=22+Math.max(0,1-this.camera.aspect)*8;height=15;angle=this.angle+Math.PI;}
    }
    const pos=new T.Vector3(target.x+Math.sin(angle)*r,height,target.z+Math.cos(angle)*r);
    if(this.mode==='battle'&&b){
      const previous=this.camera.position.clone();
      for(let attempt=0;attempt<12;attempt++){
        this.camera.position.copy(pos);this.camera.lookAt(target);this.camera.updateMatrixWorld(true);let outside=false;
        for(const u of b.units)for(const dx of [-2.4,2.4])for(const dz of [-2.2,2.2])for(const y of [.2,5.8]){const q=new T.Vector3(u.x+dx,y,u.z+dz).project(this.camera);if(Math.abs(q.x)>.86||q.y>.58||q.y<-.65)outside=true;}
        if(!outside)break;pos.sub(target).multiplyScalar(1.1).add(target);
      }
      this.camera.position.copy(previous);
    }
    if(software)this.camera.position.copy(pos);else this.camera.position.lerp(pos,Math.min(1,dt*6));this.camera.lookAt(target);
    this.renderer.render(this.scene,this.camera);this.dirty=false;
  }
}
