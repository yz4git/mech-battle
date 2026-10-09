import * as T from '../vendor/three.module.min.js';
const decals=new Map();
function label(parent,text,w,h,x,y,z,color='#d5d9cc'){
  if(typeof document==='undefined')return;
  const key=text+color;let material=decals.get(key);
  if(!material){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const c=canvas.getContext('2d');c.fillStyle=color;c.font='bold 53px monospace';c.textAlign='center';c.fillText(text,128,65);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});material.userData.shared=true;decals.set(key,material);}
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);parent.add(mesh);
}
export function detailMech(root,p,kit){
  const {box,cylinder,lit,color,dark,steel,accent,width}=kit,d=root.userData;
  const shade=new T.Color(color).multiplyScalar(.72).getHex(),bright=new T.Color(color).multiplyScalar(1.17).getHex();
  // Layered breastplate and exposed structure make the chassis read as machinery.
  for(const side of [-1,1]){
    const plate=box(d.torso,width*.39,.29,.23,side*width*.27,.6,.49,bright,.065);plate.rotation.z=side*.16;plate.rotation.y=side*.2;
    const skirt=box(d.torso,.37,.52,.29,side*.46,-1.03,.45,color,.06);skirt.rotation.x=-.2;skirt.rotation.z=side*.12;
    cylinder(d.torso,.065,.59,side*.65,-.7,-.31,steel);cylinder(d.torso,.105,.24,side*.65,-.48,-.31,dark);
    box(d.torso,.18,.2,.38,side*.46,.62,-.37,dark,.025);
    const cheek=box(d.torso,.14,.23,.47,side*.3,1.01,.04,shade,.055);cheek.rotation.z=side*.15;
    for(let j=0;j<3;j++)box(d.torso,.055,.017,.13,side*.24,1.43,-.14+j*.16,steel,.005);
  }
  label(d.torso,'07',.32,.16,-width*.27,.56,.66);
  label(d.torso,p.body.name,.6,.2,0,-.37,.742);
  box(d.torso,.23,.13,.045,0,.3,.748,0x1c272a,.015);lit(d.torso,.03,.035,.008,.069,.3,.777,0xdb5940);
  // Different makers use different shoulder shell profiles and exposed actuators.
  for(const [slot,side] of [['armL',-1],['armR',1]]){
    const arm=d.arms[slot],shape=p[slot].maker%4;
    const shell=box(arm,shape===2?.95:.75,.16,shape===1?1.1:.91,side*.1,.49,-.07,bright,.08);shell.rotation.z=-side*.1;
    const edge=box(arm,.15,.67,.94,side*.49,.1,-.08,shade,.065);edge.rotation.z=side*.12;
    for(let i=0;i<3;i++)box(arm,.055,.26,.022,side*.24+(i-1)*.08,.2,.535,dark,.004);
    cylinder(arm,.075,.73,side*.26,-.56,-.24,steel);cylinder(arm,.11,.27,side*.26,-.37,-.24,dark);
    cylinder(arm,.17,.06,side*.32,-.94,.03,dark,'x');cylinder(arm,.073,.065,side*.35,-.94,.03,accent,'x');
    const brace=box(arm,.1,.53,.68,side*.29,-1.24,.14,shade,.04);brace.rotation.z=-side*.06;
    label(arm,slot==='armL'?'L-01':'R-02',.35,.13,0,-1.19,.614);
    for(let i=0;i<3;i++)box(arm,.065,.15,.13,(i-1)*.11,-1.86,.38,steel,.013);
  }
  if(!d.tank)for(let i=0;i<d.legs.length;i++){
    const leg=d.legs[i],side=i%2?1:-1;
    if(!d.quad&&!d.reverse){
      box(leg,.32,.23,.2,0,-.94,.48,shade,.035);
      const shin=box(leg,.14,.78,.27,side*.26,-1.56,.39,bright,.04);shin.rotation.z=side*.055;
      box(leg,.63,.12,.15,0,-1.78,.45,dark,.018);
      for(let j=0;j<3;j++)box(leg,.58,.028,.08,0,-2.055,.63+j*.12,shade,.01);
      cylinder(leg,.075,.69,-side*.24,-1.42,-.3,dark);cylinder(leg,.036,.85,-side*.24,-1.55,-.3,steel);
      label(leg,String(i+1).padStart(2,'0'),.2,.13,0,-1.32,.55);
    }
  }
  for(const [slot,gun]of Object.entries(d.guns)){
    const pWeapon=p[slot];if(!pWeapon||pWeapon.melee)continue;
    if(!pWeapon.shoulder){for(let i=0;i<4;i++)box(gun,.44,.035,.07,0,.23,.13+i*.18,dark,.008);box(gun,.08,.26,.55,-.26,-.1,.45,steel,.02);}
    if(pWeapon.kind==='cannon')for(let i=0;i<3;i++)cylinder(gun,.255,.12,0,0,1.6+i*.4,shade,'z');
  }
}
