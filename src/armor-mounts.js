// Silhouette intersection can leave detached armor shells. Mount nearby shells with
// short frame brackets; retain distant equipment rather than guessing long bridges.
const cache=new WeakMap();
export function armorMounts(r){
 if(r.version!==2)return {mounts:[],discard:new Set()};if(cache.has(r))return cache.get(r);
 const positions=r.positions,count=positions.length/3,parent=Int32Array.from({length:count},(_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let t=0;t<r.triangles.length;t+=5){const a=root(r.triangles[t]);parent[root(r.triangles[t+1])]=a;parent[root(r.triangles[t+2])]=a;}
 const components=new Map(),parts=new Uint8Array(count);
 for(let t=0;t<r.triangles.length;t+=5){const k=root(r.triangles[t]);let c=components.get(k);if(!c){c={triangles:[],vertices:new Set()};components.set(k,c);}c.triangles.push(t);for(let j=0;j<3;j++){const id=r.triangles[t+j];c.vertices.add(id);parts[id]=r.triangles[t+3];}}
 const groups=[...components.values()].sort((a,b)=>b.triangles.length-a.triangles.length),main=groups[0],mounts=[],discard=new Set();if(!main)return {mounts,discard};
 const point=i=>positions.slice(i*3,i*3+3),cell=.06,bins=new Map(),key=(x,y,z)=>`${x},${y},${z}`;
 for(const i of main.vertices){const p=point(i).map(v=>Math.floor(v/cell)),k=key(...p);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}
 for(const group of groups.slice(1)){
  const ids=[...group.vertices],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of ids){const p=point(i);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}}const extent=hi.map((v,k)=>v-lo[k]),span=Math.max(...extent);
  if(group.triangles.length<100&&span<.04){for(const t of group.triangles)discard.add(t);continue;}
  // Brackets are limited to thin shells close to the body, not complete detached limbs.
  if(Math.min(...extent)>.045)continue;
  const candidates=[];for(const i of ids){const a=point(i),c=a.map(v=>Math.floor(v/cell));let closest=null,best=.055**2;
   for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)for(const j of bins.get(key(c[0]+x,c[1]+y,c[2]+z))||[]){const b=point(j),d=b.reduce((sum,v,k)=>sum+(v-a[k])**2,0);if(d<best){best=d;closest=b;}}
   if(closest&&best>.000004)candidates.push({a,b:closest,part:parts[i],distance:Math.sqrt(best)});
  }
  candidates.sort((a,b)=>a.distance-b.distance);const chosen=[];
  for(const candidate of candidates){if(chosen.every(m=>Math.hypot(...m.a.map((v,k)=>v-candidate.a[k]))>Math.min(.06,span*.3))){chosen.push(candidate);mounts.push(candidate);}if(chosen.length>=Math.min(4,Math.max(2,Math.ceil(span/.12))))break;}
 }
 const result={mounts,discard};cache.set(r,result);return result;
}
