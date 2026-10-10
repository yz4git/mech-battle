import * as T from '../vendor/three.module.min.js';
import {getPart,MAKERS} from './parts.js?v=1.6.0';
import {COVERS} from './simulation.js?v=1.6.0';
import {batchRigidMeshes} from './mesh-batch.js?v=1.6.0';
import {createMech} from './mech-model.js?v=1.6.0';
import {SoftwareRenderer} from './software-renderer.js?v=1.6.0';
import {CombatEffects} from './combat-effects.js?v=1.6.0';

const geometries=new Map(),materials=new Map();
const dark=0x20272a,joint=0x11191d,steel=0x79848a;
let surfaceMap,contactShadow;
function shadowMaterial(){if(contactShadow)return contactShadow;const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,5,32,32,31);g.addColorStop(0,'rgba(0,0,0,.62)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);contactShadow=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false});contactShadow.userData.shared=true;return contactShadow;}
function paintSurface(){if(surfaceMap||typeof document==='undefined')return surfaceMap;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f0f0ef';ctx.fillRect(0,0,128,128);let seed=1743;for(let i=0;i<1100;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%128;seed=(seed*1664525+1013904223)>>>0;const y=seed%128;ctx.fillStyle=i%4?'#e4e4e3':'#bbbbba';ctx.fillRect(x,y,i%4?1:3,1);}surfaceMap=new T.CanvasTexture(c);surfaceMap.wrapS=surfaceMap.wrapT=T.RepeatWrapping;surfaceMap.colorSpace=T.SRGBColorSpace;return surfaceMap;}
export const PAINTS=[{name:'メーカー',color:null},{name:'アッシュ',color:0xabb3b4},{name:'サンド',color:0x9b8764},{name:'オキサイド',color:0x95534b},{name:'ネイビー',color:0x4d647c},{name:'グラファイト',color:0x50585c}];
function mat(color,metal=.48,rough=.64,glow=false){const key=`${color}-${metal}-${rough}-${glow}`;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,map:glow?null:(paintSurface()||null),emissive:glow?color:0,emissiveIntensity:glow?1.65:0}));return materials.get(key);}
function geo(w,h,d,cut=.1){const key=`b${w},${h},${d},${cut}`;if(!geometries.has(key)){
  if(cut<=.02){const g=new T.BoxGeometry(w,h,d);geometries.set(key,g);return g;}
  const c=Math.min(cut,w*.22,h*.22),s=new T.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.lineTo(w/2,-h/2+c);s.lineTo(w/2,h/2-c);s.lineTo(w/2-c,h/2);s.lineTo(-w/2+c,h/2);s.lineTo(-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(.01,d-.06),steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.028,bevelThickness:.03,curveSegments:1});g.translate(0,0,-d/2+.03);geometries.set(key,g);
}return geometries.get(key);}
function box(parent,w,h,d,x,y,z,color,cut=.1){const mesh=new T.Mesh(geo(w,h,d,cut),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}

function cylinder(parent,r,h,x,y,z,color,axis='y',r2=r){const key=`c${r},${h},${r2}`;if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(r,r2,h,10));const m=new T.Mesh(geometries.get(key),mat(color));m.position.set(x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;m.castShadow=true;parent.add(m);return m;}
function lit(parent,w,h,d,x,y,z,color){const m=box(parent,w,h,d,x,y,z,color,.01);m.material=mat(color,.25,.3,true);return m;}
export function makeMech(build,paint=0,enemy=false,reduced=false){
  const root=createMech(build,paint,enemy,PAINTS,reduced),{tank,quad}=root.userData;
  if(typeof document!=='undefined'){const shadow=new T.Mesh(new T.PlaneGeometry(quad||tank?6.3:4,quad||tank?5.6:3.4),shadowMaterial());shadow.rotation.x=-Math.PI/2;shadow.position.y=.163;root.add(shadow);}
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
    this.holder=holder;this.tags=[];this.popups=[];this.feedback=document.createElement('div');this.feedback.className='combat-feedback';this.feedback.setAttribute('aria-hidden','true');holder.append(this.feedback);this.time=0;this.mode='hangar';this.angle=.52;this.zoom=1;this.shake=0;this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.drag=false;this.cameraMode=0;this.projectiles=new Map();this.unitModels=[];this.dirty=true;this.lastSoftwareFrame=0;this.lastBattleTime=-1;
    try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{this.renderer=new SoftwareRenderer();}
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.13;
    holder.prepend(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','装備を反映した機体の3Dビュー。指で回転');
    this.scene=new T.Scene();this.scene.background=new T.Color(0x101b23);this.scene.fog=new T.Fog(0x101b23,27,85);
    this.camera=new T.PerspectiveCamera(42,1,.15,150);this.camera.position.set(6.1,5.8,7.2);this.camera.lookAt(0,2.6,0);this.scene.add(new T.HemisphereLight(0xc9e2ee,0x39403b,1.35));
    this.key=new T.DirectionalLight(0xffe8c6,4.0);this.key.position.set(7,13,9);this.key.castShadow=true;this.key.shadow.mapSize.set(2048,2048);this.key.shadow.camera.left=-20;this.key.shadow.camera.right=20;this.key.shadow.camera.top=20;this.key.shadow.camera.bottom=-20;this.key.shadow.normalBias=.025;this.key.shadow.bias=-.0002;this.scene.add(this.key);
    const rim=new T.DirectionalLight(0x7ac5ec,2.7);rim.position.set(-7,6,-8);this.scene.add(rim);this.scene.add(new T.AmbientLight(0xc7d4d8,.25));this.fill=new T.DirectionalLight(0xbdcede,.85);this.scene.add(this.fill);
    if(!(this.renderer instanceof SoftwareRenderer)){
      const faces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,64);g.addColorStop(0,i===2?'#d6dad0':'#536877');g.addColorStop(.45,'#20333e');g.addColorStop(1,'#0d171f');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);ctx.fillStyle='#d0d6ce';ctx.fillRect(10,8,42,5);return c;});const envMap=new T.CubeTexture(faces);envMap.colorSpace=T.SRGBColorSpace;envMap.needsUpdate=true;this.scene.environment=envMap;this.scene.environmentIntensity=.65;
    }
    this.environment=new T.Group();this.scene.add(this.environment);this.makeEnvironment('hangar');
    this.fx=new CombatEffects(this.scene,holder,{software:this.renderer instanceof SoftwareRenderer,reducedMotion:this.reducedMotion});
    window.addEventListener('mech-material-ready',()=>{this.dirty=true;});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(holder);this.resize();
    const canvas=this.renderer.domElement;canvas.style.touchAction='none';canvas.addEventListener('wheel',e=>{if(this.mode!=='hangar')return;e.preventDefault();this.zoom=Math.max(.72,Math.min(1.35,this.zoom+e.deltaY*.001));this.dirty=true;},{passive:false});
    canvas.addEventListener('pointerdown',e=>{this.drag=true;this.px=e.clientX;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(this.drag){this.angle-=(e.clientX-this.px)*.009;this.px=e.clientX;this.dirty=true;}});
    canvas.addEventListener('pointerup',()=>this.drag=false);canvas.addEventListener('pointercancel',()=>this.drag=false);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;});
  }
  resize(){const w=this.holder.clientWidth,h=this.holder.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
  clearEnvironment(){const sharedGeometry=new Set(geometries.values()),sharedMaterial=new Set(materials.values());this.environment.traverse(obj=>{if(!obj.isMesh)return;if(!sharedGeometry.has(obj.geometry))obj.geometry.dispose();if(!sharedMaterial.has(obj.material)&&!obj.material.userData.shared){obj.material.map?.dispose();obj.material.dispose();}});this.environment.clear();}
  makeEnvironment(theme){if(this.theme===theme)return;this.theme=theme;this.clearEnvironment();this.perimeter=[];const env=this.environment;
    this.scene.background.setHex(theme==='hangar'?0x10171c:theme==='desert'?0x6f6559:theme==='snow'?0x778a92:0x34434a);this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=theme==='hangar'?27:50;this.scene.fog.far=theme==='hangar'?85:145;
    const floor=new T.Mesh(new T.PlaneGeometry(110,110,22,22),new T.MeshStandardMaterial({map:groundTexture(theme),roughness:.94,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;env.add(floor);
    if(theme==='hangar'){
      const pad=new T.Mesh(new T.CylinderGeometry(3.7,3.8,.15,48),mat(0x4e585b,.7,.7));pad.position.y=.075;pad.receiveShadow=true;env.add(pad);
      const ring=new T.Mesh(new T.TorusGeometry(3.6,.03,4,64),mat(0xd9b46c));ring.rotation.x=Math.PI/2;ring.position.y=.16;env.add(ring);
      floorMark(env,'BAY 07',0,5.15,5.3);
      for(const x of [-4.7,4.7]){box(env,.045,.012,14,x,.012,-.2,0x969689,.005);for(let i=0;i<7;i++){box(env,.6,.02,.08,x,.02,-3+i*.5,0x282f31,.005);}}
      for(const x of [-5.8,5.8]){box(env,1.1,.1,9,x,.05,-.3,0x1d292e,.01);for(let i=0;i<18;i++)box(env,.94,.03,.045,x,.11,-4.5+i*.48,0x53646b,.005);}
      for(const x of [-3.8,3.8]){box(env,.3,6,.35,x,3,-5.7,0x414d50,.01);box(env,.5,.6,.5,x,.35,-5.7,0x7b6b42,.01);for(let i=0;i<7;i++)box(env,.34,.07,.39,x,.55+i*.17,-5.7,i%2?0x252c2e:0xb59b59,.005);lit(env,.07,4,.035,x,3,-5.49,0xdbe9e6);}
      box(env,6.7,5,.2,0,2.5,-9.15,0x19272e,.01);for(let i=0;i<7;i++)box(env,6.5,.025,.08,0,.5+i*.65,-8.99,0x3d4b51,.005);floorMark(env,'CAUTION',-5.5,0,3.5);
      for(let i=0;i<18;i++){const x=-8+i*.9;box(env,.44,.02,1.1,x,.013,6.3,i%2?0x252d30:0xb59959,.01);}
      for(const x of [-9,9]){box(env,.38,12,.42,x,6,-7,dark);box(env,.42,10,.38,x,5,5,dark);box(env,.24,.55,18,x,8,-.3,steel);lit(env,.045,5,.08,x,4,-6.77,0xa5dded);}
      box(env,20,11,.5,0,5.5,-9.5,0x2d3b43);for(let i=-4;i<=4;i++){box(env,.08,8,.1,i*2.3,4.5,-9.2,steel);box(env,1.75,2.3,.13,i*2.3,2,-9.15,0x38494f);}
      for(const x of [-6,0,6]){box(env,.23,.23,15,x,9,-1,dark);lit(env,.18,.035,3,x,8.84,0,0xd6e7e8);}
      box(env,4.5,.38,.58,0,8,-5.5,0xb3945f);box(env,.5,2,.45,0,6.8,-5.5,dark);cylinder(env,.13,4.8,0,4.2,-5.5,steel);
      for(const x of [-7,7]){box(env,1.8,.85,1.6,x,.43,-5.5,0x576361);box(env,1.45,.7,1.3,x,.35,-3.5,0x3d4e57);box(env,1.4,.85,1.4,x,.43,-7.5,0x7d7766);}
    }else{
      for(const c of COVERS){box(env,c.r*1.4,2.4,c.r*1.45,c.x,1.2,c.z,theme==='desert'?0x77644e:0x596871,.12);box(env,c.r*1.5,.15,c.r*1.5,c.x,2.45,c.z,dark,.04);for(let i=0;i<3;i++)box(env,.12,1.2,.025,c.x+(i-1)*.45,1.3,c.z+c.r*.73,0xa89967,.01);}
      for(const c of COVERS){
        const w=c.r*1.4,d=c.r*1.45;
        for(const side of [-1,1]){
          box(env,w+.08,.16,d+.08,c.x,.2,c.z,0x293338,.01);
          for(let j=0;j<7;j++){box(env,.065,1.85,.04,c.x-w*.42+j*w*.14,1.28,c.z+side*(d/2+.03),0x83918b,.008);box(env,.04,1.85,.065,c.x+side*(w/2+.03),1.28,c.z-d*.42+j*d*.14,0x687b80,.008);}
          box(env,.29,.42,.04,c.x+side*w*.38,2.04,c.z+d/2+.06,0xc6a26a,.01);
          box(env,.04,.42,.29,c.x+w/2+.06,2.04,c.z+side*d*.38,0xc6a26a,.01);
        }
      }
      for(const side of [-1,1])for(let i=0;i<5;i++){
        const x=side*(19.8+(i%2)*1.2),z=-13+i*6.7;
        box(env,1.5,1.2,2.7,x,.6,z,i%2?0x5e685e:0x726a54,.05);box(env,1.6,.12,2.8,x,1.26,z,dark,.01);
        for(let j=0;j<3;j++)box(env,.04,.75,.12,x-side*.78,.67,z+(j-1)*.76,steel,.01);
      }
      for(let i=0;i<14;i++){
        const x=-34+i*5.2,z=-26-(i%3)*5,h=3+(i*7%9);const color=theme==='snow'?0x778c98:theme==='desert'?0x67513e:0x324854;
        box(env,3.5,h,4.5,x,h/2,z,color,.03);box(env,3.65,.2,4.6,x,h+.1,z,dark,.03);for(let j=0;j<3;j++)lit(env,.35,.15,.025,x-1+j,2+(i%3)*.5,z+2.27,0x7094a1);
      }
      for(const side of [-1,1]){
        const edge=new T.Group();env.add(edge);this.perimeter.push({side,group:edge});
        box(edge,.35,8,24,side*23,4,0,0x2b3b42);for(let j=-2;j<=2;j++){cylinder(edge,.18,9,side*23.5,5,j*8,steel);lit(edge,.12,.2,.2,side*22.4,3.6,j*8,0xd8ab64);}
        if(theme==='dock'){box(edge,.45,18,.6,side*20,9,-17,0x786c50);box(edge,11,.45,.6,side*17,17,-17,0x786c50);box(edge,.12,9,.12,side*13,12.5,-17,steel);}
        if(theme==='power')for(let j=0;j<3;j++){cylinder(edge,1.2,8,side*21,4,-13+j*9,dark);lit(edge,.1,6,.1,side*19.8,4,-13+j*9,0x73dadf);}
      }
      for(const z of [-18,18]){box(env,36,.2,.3,0,.1,z,0x8e846b);for(let x=-16;x<=16;x+=2)box(env,.8,.015,.32,x,.011,z>0?16:-16,0xa49e85,.01);}
      floorMark(env,'SECTOR / 07',0,0,7);
    }
    // Keep architecture outside the inspection orbit so a rear view cannot be hidden by a column.
    if(theme==='hangar')for(const object of env.children){
      const radius=Math.hypot(object.position.x,object.position.z);
      if(object.isMesh&&object.position.y>.7&&radius>3){
        const scale=Math.max(2.5,22/radius);object.position.x*=scale;object.position.z*=scale;
        object.geometry.computeBoundingBox();const size=object.geometry.boundingBox.getSize(new T.Vector3());
        if(size.x>5&&size.y>2&&size.z<1)object.scale.x*=2.4;
      }
    }
    batchRigidMeshes(env);
  }
  setHangar(build,paint=0){this.mode='hangar';this.makeEnvironment('hangar');this.setModels([build],paint);this.clearEffects();}
  setMission(build,enemy,theme,paint=0){this.mode='mission';this.makeEnvironment(theme);this.setModels([build,enemy],paint);this.unitModels[0].position.set(-4,0,-5);this.unitModels[0].rotation.y=.32;this.unitModels[1].position.set(4,0,5);this.unitModels[1].rotation.y=Math.PI+.32;this.clearEffects();}
  setBattle(b,paint=0){this.mode='battle';this.makeEnvironment(b.info.theme);this.setModels(b.units.map(u=>u.build),paint);this.clearEffects();this.battle=b;this.tags=b.units.map(u=>{const el=document.createElement('span');el.className=`unit-tag ${u.id?'hostile':'friendly'}`;el.textContent=u.id?'敵機':'自機';this.feedback.append(el);return el;});}
  setModels(builds,paint){this.unitModels.forEach(m=>{this.scene.remove(m);m.userData.materials?.forEach(x=>x.dispose());m.traverse(o=>{if(o.isMesh&&(o.geometry.type==='PlaneGeometry'||o.geometry.userData.owned))o.geometry.dispose();if(o.isMesh&&o.material.transparent&&!o.material.userData.shared)o.material.dispose();});});this.unitModels=builds.map((b,i)=>{const m=makeMech(b,i===0?paint:0,i!==0,this.renderer instanceof SoftwareRenderer&&this.mode!=='hangar');this.scene.add(m);return m;});this.dirty=true;}
  clearEffects(){this.tags=[];this.popups=[];this.feedback.replaceChildren();this.fx.reset();for(const mesh of this.projectiles.values()){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}this.projectiles.clear();}
  consumeEvents(events){
    this.fx.consume(events,this.unitModels,this.battle);
    for(const e of events){
      if(e.type==='hit'){const big=e.kind==='cannon'||e.kind==='missile';this.shake=Math.min(2.4,this.shake+(big?.7:.1));this.popup(e,`${e.amount}`,e.unit===0?'received':'damage');}
      if(e.type==='fire'&&(e.kind==='cannon'||e.kind==='railgun'))this.shake=Math.max(this.shake,.3);
      if(e.type==='destroy'||e.type==='break'){this.shake=e.type==='destroy'?2.5:1.4;this.popup(e,e.type==='destroy'?'CORE DESTROYED':({armL:'LEFT ARM LOST',armR:'RIGHT ARM LOST',legs:'LEGS DISABLED'}[e.slot]),'part-break');}
    }
  }
  popup(e,text,kind){if(this.popups.length>=14){this.popups.shift().el.remove();}const el=document.createElement('span');el.className=`combat-number ${kind}`;el.textContent=text;this.feedback.append(el);this.popups.push({el,x:e.x,z:e.z,life:1.1,total:1.1,y:kind==='part-break'?5.3:3.5});}

  animateMech(model,u,dt){
    const d=model.userData;
    for(const m of d.materials||[]){m.emissive.copy(m.userData.baseEmissive);m.emissiveIntensity=m.userData.baseIntensity;if(u?.armorFlash>0){m.emissive.setHex(0xff6f32);m.emissiveIntensity=.6;}}
    if(u){model.position.set(u.x,0,u.z);model.rotation.y=u.yaw;model.rotation.z=u.dead?Math.min(.65,(this.time-(model.userData.deathAt??=this.time))*.5):0;
      model.position.y=u.dead?-.2:0;d.torso.rotation.z=u.stun>0?Math.sin(this.time*35)*.04:0;
      for(const [slot,gun] of Object.entries(d.guns)){
        gun.userData.restZ??=gun.position.z;gun.position.z=gun.userData.restZ-(getPart(u.build[slot])?.melee?0:Math.min(1,(u.firePose[slot]||0)/.18)*.15);
        if(slot==='weaponL'||slot==='weaponR')gun.rotation.x=0;
      }
      d.arms.armL.visible=u.health.armL>0;d.arms.armR.visible=u.health.armR>0;
      d.walkPhase=(d.walkPhase||0)+dt*u.move*2.7;const step=d.walkPhase;d.legs.forEach((leg,i)=>leg.rotation.x=u.health.legs<=0?-.15:Math.sin(step+i*Math.PI)*(u.move>0?.24:.008));
      d.torso.position.y=d.cy+(u.move>0&&!d.tank?Math.abs(Math.sin(step))*.09:0);d.torso.rotation.x=u.boost>0?.1:0;
      for(const [slot,arm] of [['weaponL',d.arms.armL],['weaponR',d.arms.armR]]){
        const p=getPart(u.build[slot]),pose=u.firePose[slot]||0;
        const target=this.battle?.units[1-u.id],range=target?Math.hypot(target.x-u.x,target.z-u.z):15,targetHeight=this.unitModels[1-u.id]?.userData.cy||d.cy;
        const aim=-Math.atan2(targetHeight-(d.cy-1.62),Math.max(2,range));
        arm.rotation.x=p.melee?(p.id.includes('-VB-')?-.45-Math.sin((.42-pose)/.42*Math.PI)*1.25:-Math.sin(pose/.42*Math.PI)*1.3):aim+(pose>0?.045:0);
        arm.rotation.z=p.melee&&pose>0?(slot==='weaponL'?1:-1)*Math.sin(pose/.42*Math.PI)*.65:(slot==='weaponL'?.03:-.03);
      }
      for(const slot of ['shoulderL','shoulderR'])if(d.shoulders[slot]){
        const target=this.battle?.units[1-u.id],range=target?Math.hypot(target.x-u.x,target.z-u.z):15,height=this.unitModels[1-u.id]?.userData.cy||d.cy;
        d.shoulders[slot].rotation.x=Math.atan2(d.cy+1.18-height,Math.max(2,range))+((u.firePose[slot]||0)>0?-.06:0);
      }
      d.jets.forEach(j=>{j.visible=u.boost>0;j.scale.y=1+Math.sin(this.time*55)*.22;});
    }else{
      d.torso.position.y=d.cy+Math.sin(this.time*1.4)*.009;d.arms.armL.rotation.x=-.035;d.arms.armR.rotation.x=-.035;
      for(const slot of ['weaponL','weaponR'])if(d.guns[slot])d.guns[slot].rotation.x=d.tank?.025:d.quad?.28:d.referenceFrame?1.16:.62;
    }
  }
  render(dt,b=null){if(this.contextLost||dt===0&&!this.dirty)return;const frozen=dt===0;this.time+=dt;
    const software=this.renderer instanceof SoftwareRenderer;
    if(software){const now=performance.now();if(now-this.lastSoftwareFrame<130)return;if(this.mode!=='battle'&&!this.dirty)return;if(this.mode==='battle'&&b?.time===this.lastBattleTime&&!this.fx.active()&&!this.popups.length&&!this.dirty)return;dt=frozen?0:Math.min(.2,(now-this.lastSoftwareFrame)/1000||dt);this.lastSoftwareFrame=now;this.lastBattleTime=b?.time;}
    this.unitModels.forEach((m,i)=>this.animateMech(m,this.mode==='battle'?b?.units[i]:null,dt));
    if(this.mode==='battle'&&b){
      const ids=new Set(b.projectiles.map(p=>p.id));for(const [id,m]of this.projectiles)if(!ids.has(id)){this.scene.remove(m);m.geometry.dispose();m.material.dispose();this.projectiles.delete(id);}
      for(const p of b.projectiles){
        // Energy weapons already have a core + halo beam in the effects pool.
        if(p.kind==='laser'||p.kind==='railgun')continue;
        let m=this.projectiles.get(p.id);
        if(!m){
          m=new T.Mesh(p.kind==='missile'?new T.ConeGeometry(.11,.55,6):new T.CylinderGeometry(p.kind==='cannon'?.065:.028,p.kind==='cannon'?.065:.028,.85,4),new T.MeshBasicMaterial({color:0xffcc7b}));
          const gun=this.unitModels[p.from]?.userData.guns[p.sourceSlot];
          if(gun){gun.updateWorldMatrix(true,false);m.userData.origin=gun.localToWorld(gun.userData.muzzle?.clone()||new T.Vector3(0,0,2));}else m.userData.origin=new T.Vector3(p.ax,2.3,p.az);
          this.scene.add(m);this.projectiles.set(p.id,m);
        }
        const t=1-p.life/p.total,origin=m.userData.origin;m.position.copy(origin).lerp(new T.Vector3(p.tx,2.2,p.tz),t);if(p.kind==='missile')m.position.y+=Math.sin(t*Math.PI)*3.7;
        m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(p.tx-p.ax,p.kind==='missile'?Math.cos(t*Math.PI)*3.7*Math.PI:0,p.tz-p.az).normalize());
        if(p.kind==='missile'&&this.time-(m.userData.lastSmoke||0)>.055){m.userData.lastSmoke=this.time;this.fx.missileTrail(m.position);}
      }
    }
    let target=new T.Vector3(0,this.holder.clientHeight<380?2.3:2.5,0),r=(11.1+Math.max(0,1.3-this.camera.aspect)*3.5)*this.zoom,height=this.mode==='hangar'?4.25:5.15,angle=this.angle;
    if(this.mode!=='hangar'){
      if(this.mode==='battle'&&b){const [a,c]=b.units;target.set((a.x+c.x)/2,1.8,(a.z+c.z)/2);const spread=Math.hypot(a.x-c.x,a.z-c.z);r=Math.max(14,spread*.58+8)+Math.max(0,1-this.camera.aspect)*4;height=this.cameraMode===1?32:Math.max(8,spread*.17+7);angle=Math.atan2(c.x-a.x,c.z-a.z)+Math.PI*.5+.24+this.angle-.52;
        if(this.cameraMode===2){target.y=2.6;r=Math.max(10,spread*.48+7);height=Math.max(6.8,spread*.12+5.5);angle=Math.atan2(c.x-a.x,c.z-a.z)+Math.PI*.64+this.angle-.52;}
        if(this.camera.aspect<.85){target.y=.35;height=this.cameraMode===1?32:Math.max(13,r*.65);angle=Math.atan2(c.x-a.x,c.z-a.z)+Math.PI+Math.max(-.4,Math.min(.4,this.angle-.52));if(this.cameraMode===1){height=Math.max(35,spread*1.2+16);r=7;}}
      }
      else{target.set(0,1.4,0);r=22+Math.max(0,1-this.camera.aspect)*8;height=15;angle=this.angle+Math.PI;}
    }
    const pos=new T.Vector3(target.x+Math.sin(angle)*r,height,target.z+Math.cos(angle)*r);this.camera.clearViewOffset();
    if(this.mode==='battle'&&b){
      const previous=this.camera.position.clone(),portrait=this.camera.aspect<.85;
      const lowerLimit=portrait?1-2*(this.holder.clientHeight-(this.holder.querySelector('#scene-bottom')?.offsetHeight||210)-16)/this.holder.clientHeight:-.56,upperLimit=portrait?.68:.58;
      if(portrait)this.camera.setViewOffset(this.holder.clientWidth,this.holder.clientHeight,0,(upperLimit+lowerLimit)*this.holder.clientHeight/4,this.holder.clientWidth,this.holder.clientHeight);
      for(let attempt=0;attempt<12;attempt++){
        this.camera.position.copy(pos);this.camera.lookAt(target);this.camera.updateMatrixWorld(true);let outside=false;
        for(const u of b.units)for(const dx of [-2.4,2.4])for(const dz of [-2.2,2.2])for(const y of [.15,6.35]){const q=new T.Vector3(u.x+dx,y,u.z+dz).project(this.camera);if(Math.abs(q.x)>.86||q.y>upperLimit||q.y<lowerLimit)outside=true;}
        if(!outside)break;pos.sub(target).multiplyScalar(1.1).add(target);
      }
      this.camera.position.copy(previous);
    }
    if(software)this.camera.position.copy(pos);else this.camera.position.lerp(pos,frozen?1:Math.min(1,dt*6));this.camera.lookAt(target);
    if(this.shake>0&&!this.reducedMotion&&this.mode==='battle'){this.camera.position.x+=Math.sin(this.time*91)*this.shake*.06;this.camera.position.y+=Math.cos(this.time*73)*this.shake*.04;this.shake=Math.max(0,this.shake-dt*5);}
    // Hide the near perimeter when the camera crosses it; combat cover stays solid.
    for(const edge of this.perimeter)edge.group.visible=this.mode!=='battle'||edge.side*this.camera.position.x<18;
    this.fill.position.copy(this.camera.position);if(software){const lowCost=this.mode==='battle';if(this.renderer.lowCost!==lowCost){this.renderer.lowCost=lowCost;this.renderer.setSize(this.holder.clientWidth,this.holder.clientHeight);}this.renderer.shadowFocus.copy(target);this.renderer.shadowSpan=this.mode==='hangar'?14:52;}this.fx.update(frozen?0:dt,this.camera,this.unitModels,this.mode==='battle'?b:null);this.renderer.render(this.scene,this.camera);if(b&&this.mode==='battle'){const top=(this.holder.querySelector('#battle-hud')?.offsetHeight||90)+30;this.tags.forEach((el,i)=>{const u=b.units[i],p=new T.Vector3(u.x,6,u.z).project(this.camera);el.style.left=`${(p.x*.5+.5)*this.holder.clientWidth}px`;el.style.top=`${Math.max(top,(-p.y*.5+.5)*this.holder.clientHeight-18)}px`;el.style.opacity=u.dead?'0':'1';});}for(const p of this.popups){p.life-=dt;const v=new T.Vector3(p.x,p.y+(1-p.life/p.total)*1.5,p.z).project(this.camera);p.el.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*this.holder.clientWidth}px,${(-v.y*.5+.5)*this.holder.clientHeight}px)`;p.el.style.opacity=String(Math.min(1,p.life*2));}this.popups=this.popups.filter(p=>{if(p.life>0)return true;p.el.remove();return false;});this.dirty=false;
  }
}
