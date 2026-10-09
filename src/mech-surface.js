import * as T from '../vendor/three.module.min.js';

const materials=new Map();
let coating,bump;
function surface(){
  if(coating||typeof document==='undefined')return coating;
  bump=new T.Texture();bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.anisotropy=4;
  coating=new T.TextureLoader().load(new URL('../assets/armor-coating-v1.2.webp',import.meta.url).href,texture=>{bump.image=texture.image;bump.needsUpdate=true;window.dispatchEvent(new Event('mech-material-ready'));});
  coating.colorSpace=T.SRGBColorSpace;coating.wrapS=coating.wrapT=T.RepeatWrapping;coating.anisotropy=4;
  return coating;
}
export function finish(color,kind='paint'){
  const key=`${color}:${kind}`;
  if(!materials.has(key)){
    const glow=kind==='light',metal=kind==='metal',rubber=kind==='rubber';
    const map=!glow&&!rubber?(surface()||null):null;
    const material=new T.MeshStandardMaterial({color,metalness:glow?.15:metal?.86:rubber?.12:.55,roughness:glow?.23:metal?.32:rubber?.85:.61,map,bumpMap:map?bump:null,bumpScale:metal?.009:.023,roughnessMap:map?bump:null,emissive:glow?color:0,emissiveIntensity:glow?1.35:0});
    material.userData.mechSurface=true;
    materials.set(key,material);
  }
  return materials.get(key);
}
export function palette(color){
  const base=new T.Color(color),neutral=new T.Color(0xadb4b7);
  base.lerp(neutral,.4);
  return {paint:base.getHex(),light:base.clone().lerp(new T.Color(0xd0d3d0),.3).getHex(),shade:base.clone().multiplyScalar(.56).getHex(),frame:0x263039,black:0x111a20,steel:0x919b9f,trim:0xb7aca0};
}
