import * as T from '../vendor/three.module.min.js';

const materials=new Map();
let coating,bump;
function surface(){
  if(coating||typeof document==='undefined')return coating;
  // Fine coating variation only: large armor plates must read as clean metal, not mottled stone.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f7f7f6';ctx.fillRect(0,0,256,256);let seed=14871;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1700;i++){const v=242+Math.floor(random()*10);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(random()*256,random()*256,1,1);}
  ctx.strokeStyle='rgba(54,61,64,.1)';ctx.lineWidth=.45;
  for(let i=0;i<25;i++){const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1+random()*5,y+.5);ctx.stroke();}
  coating=new T.CanvasTexture(canvas);coating.colorSpace=T.SRGBColorSpace;coating.wrapS=coating.wrapT=T.RepeatWrapping;coating.anisotropy=4;
  bump=coating.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
  return coating;
}
export function finish(color,kind='paint'){
  const key=`${color}:${kind}`;
  if(!materials.has(key)){
    const glow=kind==='light',metal=kind==='metal',rubber=kind==='rubber';
    const map=!glow&&!rubber?(surface()||null):null;
    const material=new T.MeshStandardMaterial({color,metalness:glow?.15:metal?.86:rubber?.12:.28,roughness:glow?.23:metal?.3:rubber?.85:.52,map,bumpMap:map?bump:null,bumpScale:metal?.003:.004,roughnessMap:map?bump:null,emissive:glow?color:0,emissiveIntensity:glow?1.35:0});
    material.userData.mechSurface=true;
    materials.set(key,material);
  }
  return materials.get(key);
}
export function palette(color){
  const base=new T.Color(color),neutral=new T.Color(0xb8bcbd);
  base.lerp(neutral,.52);
  return {paint:base.getHex(),light:base.clone().lerp(new T.Color(0xd0d3d0),.3).getHex(),shade:base.clone().multiplyScalar(.43).getHex(),frame:0x263039,black:0x111a20,steel:0x919b9f,trim:0xb7aca0};
}
