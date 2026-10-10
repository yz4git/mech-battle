import * as T from '../vendor/three.module.min.js';
import {finish} from './mech-surface.js?v=1.5.0';

const cache=new Map();
let compact=false;
export function setGeometryDetail(reduced=false){compact=reduced;}
const boxProfile=[[-.38,-.5],[.38,-.5],[.5,-.36],[.5,.32],[.34,.5],[-.34,.5],[-.5,.32],[-.5,-.36]];
export const profiles={
  plate:boxProfile,
  breast:[[-.38,-.46],[.19,-.56],[.5,-.18],[.45,.36],[.22,.51],[-.48,.28]],
  shoulder:[[-.48,-.23],[-.12,-.48],[.36,-.37],[.56,.05],[.4,.42],[-.33,.52],[-.55,.29]],
  shin:[[-.32,-.5],[.32,-.5],[.5,-.17],[.36,.44],[.12,.56],[-.3,.4],[-.47,-.09]],
  toe:[[-.48,-.5],[.48,-.5],[.49,-.06],[.3,.5],[-.3,.5],[-.49,-.06]],
  wedge:[[-.5,-.5],[.5,-.5],[.4,.33],[0,.55],[-.4,.33]],
  blade:[[-.16,-.5],[.16,-.5],[.23,.24],[0,.5],[-.23,.24]]
};
profiles.chest=[[-.28,-.5],[.3,-.5],[.5,-.2],[.44,.37],[.2,.5],[-.44,.4],[-.5,-.12]];
profiles.pauldrons=[[-.44,-.28],[-.1,-.5],[.36,-.39],[.5,-.05],[.44,.35],[.21,.5],[-.4,.43],[-.5,.14]];
profiles.greave=[[-.25,-.5],[.26,-.5],[.46,-.28],[.5,.22],[.27,.5],[-.34,.45],[-.48,.02]];
profiles.helmet=[[-.27,-.5],[.28,-.5],[.49,-.2],[.4,.3],[.12,.5],[-.33,.4],[-.47,.02]];
function mesh(parent,g,color,x,y,z,kind='paint'){
  const m=new T.Mesh(g,finish(color,kind));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
function uvPlanar(g){
  const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    uv[i*2]=(nx>ny&&nx>nz?p.getZ(i):p.getX(i))*.65+.37;
    uv[i*2+1]=(ny>nx&&ny>nz?p.getZ(i):p.getY(i))*.65+.41;
  }
  g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
}
// Broad planar armor faces, a sloped bevel belt and tapered side walls.
// Unlike a central pyramid, these surfaces keep the large machined faces of the reference.
export function shell(parent,w,h,d,x,y,z,color,profile='plate',inset=.15,taper=.84){
  const key=`shell:${w}:${h}:${d}:${profile}:${inset}:${taper}`;
  if(!cache.has(key)){
    const pts=profiles[profile],a=[],front=pts.map(([xx,yy])=>new T.Vector2(xx*w*(1-inset),yy*h*(1-inset)));
    const tri=(p,q,r)=>a.push(...p,...q,...r),ringZ=d*.25;
    for(const [i,j,k] of T.ShapeUtils.triangulateShape(front,[]))tri([front[i].x,front[i].y,d/2],[front[j].x,front[j].y,d/2],[front[k].x,front[k].y,d/2]);
    const back=pts.map(([xx,yy])=>new T.Vector2(xx*w*taper,yy*h*taper));
    for(const [i,j,k] of T.ShapeUtils.triangulateShape(back,[]))tri([back[k].x,back[k].y,-d/2],[back[j].x,back[j].y,-d/2],[back[i].x,back[i].y,-d/2]);
    for(let i=0;i<pts.length;i++){
      const j=(i+1)%pts.length,o=[pts[i][0]*w,pts[i][1]*h,ringZ],n=[pts[j][0]*w,pts[j][1]*h,ringZ],f=[front[i].x,front[i].y,d/2],nf=[front[j].x,front[j].y,d/2],b=[back[i].x,back[i].y,-d/2],nb=[back[j].x,back[j].y,-d/2];
      tri(o,n,nf);tri(o,nf,f);tri(b,nb,n);tri(b,n,o);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.computeVertexNormals();cache.set(key,uvPlanar(g));
  }
  return mesh(parent,cache.get(key),color,x,y,z);
}
export function panel(parent,w,h,d,x,y,z,color,profile='plate',bevel=.035){
  const key=`p:${w}:${h}:${d}:${profile}:${bevel}`;
  if(!cache.has(key)){
    const shape=new T.Shape(),points=profiles[profile];
    points.forEach(([xx,yy],i)=>i?shape.lineTo(xx*w,yy*h):shape.moveTo(xx*w,yy*h));shape.closePath();
    const b=Math.min(bevel,d*.2,w*.08,h*.08),g=new T.ExtrudeGeometry(shape,{depth:Math.max(.001,d-b*2),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});
    g.translate(0,0,-d/2+b);
    // A shallow central ridge produces real changing face normals, not a painted highlight.
    if(['breast','shin','wedge'].includes(profile)&&w>.4&&h>.5&&d>.18){
      const positions=[],p=g.attributes.position,n=g.attributes.normal;
      for(let i=0;i<p.count;i+=3){if(n.getZ(i)>.99&&p.getZ(i)>0)continue;for(let j=0;j<3;j++)positions.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j));}
      const ridge=d/2+Math.min(w,h)*.095;
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];positions.push(0,0,ridge,a[0]*w,a[1]*h,d/2,b[0]*w,b[1]*h,d/2);}
      const folded=new T.BufferGeometry();folded.setAttribute('position',new T.Float32BufferAttribute(positions,3));folded.computeVertexNormals();g.dispose();cache.set(key,uvPlanar(folded));
    }else cache.set(key,uvPlanar(g));
  }
  return mesh(parent,cache.get(key),color,x,y,z);
}
export function block(parent,w,h,d,x,y,z,color,kind='paint'){
  const key=`b:${w}:${h}:${d}`;if(!cache.has(key))cache.set(key,uvPlanar(new T.BoxGeometry(w,h,d)));
  return mesh(parent,cache.get(key),color,x,y,z,kind);
}
export function cyl(parent,r,len,x,y,z,color,axis='y',r2=r,kind='metal',segments=16){
  if(compact)segments=Math.min(segments,10);
  const key=`c:${r}:${r2}:${len}:${segments}`;if(!cache.has(key))cache.set(key,new T.CylinderGeometry(r,r2,len,segments,1));
  const m=mesh(parent,cache.get(key),color,x,y,z,kind);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m;
}
export function ring(parent,r,tube,x,y,z,color,axis='z'){
  const key=`t:${r}:${tube}:${compact}`;if(!cache.has(key))cache.set(key,new T.TorusGeometry(r,tube,compact?3:5,compact?12:20));
  const m=mesh(parent,cache.get(key),color,x,y,z,'metal');if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;return m;
}
export function bar(parent,a,b,r,color,kind='metal'){
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),len=delta.length();
  const m=cyl(parent,r,len,...av.clone().add(bv).multiplyScalar(.5).toArray(),color,'y',r,kind,10);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
export function piston(parent,a,b,r=.06){
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().lerp(bv,.57).toArray();
  bar(parent,a,b,r*.57,0xa9b1b1);bar(parent,a,mid,r,0x343c43);ring(parent,r*1.08,r*.18,...a,0x7a8387,'y');
}
export function bolts(parent,w,h,x,y,z,color=0x939b9d){
  if(compact)return;
  for(const sx of [-1,1])for(const sy of [-1,1]){
    cyl(parent,.024,.018,x+sx*w/2,y+sy*h/2,z,0x1a242b,'z',.024,'rubber',6);
    cyl(parent,.012,.025,x+sx*w/2,y+sy*h/2,z+.006,color,'z',.012,'metal',6);
  }
}
export function vent(parent,w,h,x,y,z){
  panel(parent,w,h,.055,x,y,z,0x0c151c,'plate',.009);
  const n=Math.max(3,Math.round(h/.08));for(let i=0;i<n;i++){
    const b=block(parent,w*.76,.018,.041,x,y-h*.34+i*h*.68/(n-1),z+.036,0x737e83,'metal');b.rotation.x=.35;
  }
}
export function light(parent,w,h,x,y,z,color){
  block(parent,w*1.22,h*1.9,.06,x,y,z-.012,0x11181d,'rubber');
  return block(parent,w,h,.019,x,y,z+.024,color,'light');
}
export function cable(parent,points,r=.032){
  const key=`hose:${r}:${JSON.stringify(points)}:${compact}`;
  if(!cache.has(key))cache.set(key,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),compact?6:12,r,compact?4:6,false));
  return mesh(parent,cache.get(key),0x18232a,0,0,0,'rubber');
}
const labelMaterials=new Map();
export function decal(parent,text,w,h,x,y,z,color='#222e34'){
  if(typeof document==='undefined')return;
  const key=text+color;
  if(!labelMaterials.has(key)){
    const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 76px monospace';ctx.fillText(text,128,87);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const m=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});m.userData.shared=true;labelMaterials.set(key,m);
  }
  const m=new T.Mesh(new T.PlaneGeometry(w,h),labelMaterials.get(key));m.position.set(x,y,z);parent.add(m);return m;
}
