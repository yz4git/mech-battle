import {projectionTexture} from './projection-texture.js?v=2.4.0';
import * as T from '../vendor/three.module.min.js';
const names=['','helmet','torso','armL','armR','forearmL','forearmR','hips','legL','legR','shinL','shinR','bootL','bootR','shoulderL','shoulderR','weaponL','weaponR'];
export function makeReconstructedModel(r,height=4.8){
 const root=new T.Group(),nodes={},[nx,ny,nz]=r.grid;root.name='rig';
 const pivots={helmet:[0,.85,0],torso:[0,.55,0],hips:[0,.44,0],armL:[-.32*r.width,.75,0],armR:[.32*r.width,.75,0],forearmL:[-.32*r.width,.61,0],forearmR:[.32*r.width,.61,0],legL:[-.18*r.width,.43,0],legR:[.18*r.width,.43,0],shinL:[-.18*r.width,.24,0],shinR:[.18*r.width,.24,0],bootL:[-.18*r.width,.09,0],bootR:[.18*r.width,.09,0],shoulderL:[-.32*r.width,.8,0],shoulderR:[.32*r.width,.8,0],weaponL:[-.42*r.width,.43,0],weaponR:[.42*r.width,.43,0]};
 for(const key of Object.keys(pivots))pivots[key]=pivots[key].map(v=>v*height);
 for(const name of names.slice(1)){const g=new T.Group();g.name=name;g.position.fromArray(pivots[name]);root.add(g);nodes[name]=g;}
 root.updateMatrixWorld(true);
 for(const side of ['L','R']){nodes.torso.attach(nodes[`arm${side}`]);nodes[`arm${side}`].attach(nodes[`forearm${side}`]);nodes.hips.attach(nodes[`leg${side}`]);nodes[`leg${side}`].attach(nodes[`shin${side}`]);nodes[`shin${side}`].attach(nodes[`boot${side}`]);}nodes.torso.attach(nodes.helmet);for(const side of ['L','R']){nodes.torso.attach(nodes[`shoulder${side}`]);nodes[`forearm${side}`].attach(nodes[`weapon${side}`]);}root.updateMatrixWorld(true);
 const map=projectionTexture(r.atlas);
 const buckets=new Map();const corners=[[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]];
 if(r.version===2){
  for(let t=0;t<r.triangles.length;t+=5){const id=r.triangles[t+3],name=names[id],bucket=buckets.get(name)||{p:[],c:[],keys:[],uv:[]};const color=new T.Color(r.triangles[t+4]),pivot=pivots[name];
   for(let i=0;i<3;i++){const index=r.triangles[t+i];for(let k=0;k<3;k++)bucket.p.push(r.positions[index*3+k]*height-pivot[k]);bucket.c.push(color.r,color.g,color.b);bucket.keys.push(index);if(r.uvs){const offset=t/5*6+i*2;bucket.uv.push(r.uvs[offset]/65535,r.uvs[offset+1]/65535);}}buckets.set(name,bucket);
  }
 }else for(const [x,y,z,d,id,rgb]of r.faces){const name=names[id],bucket=buckets.get(name)||{p:[],c:[]};const color=new T.Color(rgb);for(const i of [0,1,2,0,2,3]){const q=corners[d][i],p=[((x+q[0])/nx-.5)*r.width,(y+q[1])/ny,((z+q[2])/nz-.5)*r.depth],pivot=pivots[name];bucket.p.push(...p.map((v,i)=>v*height-pivot[i]));bucket.c.push(color.r,color.g,color.b);}buckets.set(name,bucket);}
 for(const [name,b]of buckets){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));if(b.uv?.length)g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeVertexNormals();if(b.keys)creaseNormals(g,b.keys);g.userData.owned=true;const m=new T.Mesh(g,new T.MeshStandardMaterial({map:map||null,vertexColors:!map,metalness:map?.18:.35,roughness:map?.72:.65}));nodes[name].add(m);}
 return {root,nodes};
}
function creaseNormals(g,keys){
 const p=g.attributes.position,n=g.attributes.normal,adjacency=new Map();for(let i=0;i<keys.length;i++){const list=adjacency.get(keys[i])||[];list.push(i);adjacency.set(keys[i],list);}
 const source=n.array.slice();for(let i=0;i<keys.length;i++){let x=0,y=0,z=0;for(const j of adjacency.get(keys[i])){if(source[i*3]*source[j*3]+source[i*3+1]*source[j*3+1]+source[i*3+2]*source[j*3+2]>.65){x+=source[j*3];y+=source[j*3+1];z+=source[j*3+2];}}const length=Math.hypot(x,y,z)||1;n.setXYZ(i,x/length,y/length,z/length);}n.needsUpdate=true;
}
export function validateReconstruction(raw){
 if(![1,2].includes(raw?.version)||!Array.isArray(raw.grid)||raw.grid.length!==3||raw.grid.some(v=>!Number.isInteger(v)||v<8||v>160)||!Number.isFinite(raw.width)||!Number.isFinite(raw.depth)||raw.width<.05||raw.width>4||raw.depth<.05||raw.depth>4)throw Error('自動生成データが不正です');
 if(raw.version===1){if(!Array.isArray(raw.faces)||raw.faces.length>200000)throw Error('自動生成メッシュが不正です');for(const f of raw.faces)if(!Array.isArray(f)||f.length!==6||f.some(v=>!Number.isInteger(v))||f.slice(0,3).some((v,i)=>v<0||v>=raw.grid[i])||f[3]<0||f[3]>5||f[4]<1||f[4]>13||f[5]<0||f[5]>0xffffff)throw Error('自動生成メッシュが不正です');}
 else{if(!Array.isArray(raw.positions)||raw.positions.length<9||raw.positions.length%3||raw.positions.length>1500000||!Array.isArray(raw.triangles)||raw.triangles.length<15||raw.triangles.length%5||raw.triangles.length>2500000||raw.positions.some(v=>!Number.isFinite(v)||Math.abs(v)>5))throw Error('連続表面データが不正です');const count=raw.positions.length/3;for(let i=0;i<raw.triangles.length;i+=5){const t=raw.triangles.slice(i,i+5);if(t.some(v=>!Number.isInteger(v))||t.slice(0,3).some(v=>v<0||v>=count)||t[3]<1||t[3]>17||t[4]<0||t[4]>0xffffff)throw Error('連続表面の三角形が不正です');}}
 if(raw.atlas&&(!(typeof raw.atlas==='string')||raw.atlas.length>8000000||!/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(raw.atlas)))throw Error('テクスチャデータが不正です');
 if(raw.uvs&&(!Array.isArray(raw.uvs)||raw.uvs.length!==raw.triangles.length/5*6||raw.uvs.some(v=>!Number.isInteger(v)||v<0||v>65535)))throw Error('テクスチャ座標が不正です');
 return raw;
}
