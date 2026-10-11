import * as T from '../vendor/three.module.min.js';
const names=['','helmet','torso','armL','armR','forearmL','forearmR','hips','legL','legR','shinL','shinR','bootL','bootR'];
export function makeReconstructedModel(r,height=4.8){
 const root=new T.Group(),nodes={},[nx,ny,nz]=r.grid;root.name='rig';
 const pivots={helmet:[0,.85,0],torso:[0,.55,0],hips:[0,.44,0],armL:[-.32*r.width,.75,0],armR:[.32*r.width,.75,0],forearmL:[-.32*r.width,.61,0],forearmR:[.32*r.width,.61,0],legL:[-.18*r.width,.43,0],legR:[.18*r.width,.43,0],shinL:[-.18*r.width,.24,0],shinR:[.18*r.width,.24,0],bootL:[-.18*r.width,.09,0],bootR:[.18*r.width,.09,0]};
 for(const key of Object.keys(pivots))pivots[key]=pivots[key].map(v=>v*height);
 for(const name of names.slice(1)){const g=new T.Group();g.name=name;g.position.fromArray(pivots[name]);root.add(g);nodes[name]=g;}
 root.updateMatrixWorld(true);
 for(const side of ['L','R']){nodes.torso.attach(nodes[`arm${side}`]);nodes[`arm${side}`].attach(nodes[`forearm${side}`]);nodes.hips.attach(nodes[`leg${side}`]);nodes[`leg${side}`].attach(nodes[`shin${side}`]);nodes[`shin${side}`].attach(nodes[`boot${side}`]);}nodes.torso.attach(nodes.helmet);root.updateMatrixWorld(true);
 const buckets=new Map();const corners=[[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]];
 for(const [x,y,z,d,id,rgb]of r.faces){const name=names[id],bucket=buckets.get(name)||{p:[],c:[]};const color=new T.Color(rgb);for(const i of [0,1,2,0,2,3]){const q=corners[d][i],p=[((x+q[0])/nx-.5)*r.width,(y+q[1])/ny,((z+q[2])/nz-.5)*r.depth],pivot=pivots[name];bucket.p.push(...p.map((v,i)=>v*height-pivot[i]));bucket.c.push(color.r,color.g,color.b);}buckets.set(name,bucket);}
 for(const [name,b]of buckets){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.userData.owned=true;const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,metalness:.35,roughness:.65}));nodes[name].add(m);}
 return {root,nodes};
}
export function validateReconstruction(raw){if(raw?.version!==1||!Array.isArray(raw.grid)||raw.grid.length!==3||raw.grid.some(v=>!Number.isInteger(v)||v<8||v>160)||!Number.isFinite(raw.width)||!Number.isFinite(raw.depth)||raw.width<.05||raw.width>4||raw.depth<.05||raw.depth>4||!Array.isArray(raw.faces)||raw.faces.length>200000)throw Error('自動生成データが不正です');for(const f of raw.faces)if(!Array.isArray(f)||f.length!==6||f.some(v=>!Number.isInteger(v))||f.slice(0,3).some((v,i)=>v<0||v>=raw.grid[i])||f[3]<0||f[3]>5||f[4]<1||f[4]>13||f[5]<0||f[5]>0xffffff)throw Error('自動生成メッシュが不正です');return raw;}
