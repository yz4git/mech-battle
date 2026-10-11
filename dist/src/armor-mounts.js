// Seat detached thin armor against the body; isolated silhouette artifacts must
// not remain floating merely because a short bracket cannot reach them.
const cache=new WeakMap();
export function armorMounts(r){
 if(r.version!==2)return {mounts:[],discard:new Set(),positions:r.positions,shifted:0};if(cache.has(r))return cache.get(r);
 const positions=r.positions,count=positions.length/3,parent=Int32Array.from({length:count},(_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let t=0;t<r.triangles.length;t+=5){const a=root(r.triangles[t]);parent[root(r.triangles[t+1])]=a;parent[root(r.triangles[t+2])]=a;}
 const components=new Map(),parts=new Uint8Array(count);
 for(let t=0;t<r.triangles.length;t+=5){const k=root(r.triangles[t]);let c=components.get(k);if(!c){c={triangles:[],vertices:new Set()};components.set(k,c);}c.triangles.push(t);for(let j=0;j<3;j++){const id=r.triangles[t+j];c.vertices.add(id);parts[id]=r.triangles[t+3];}}
 const groups=[...components.values()].sort((a,b)=>b.triangles.length-a.triangles.length),main=groups[0],mounts=[],discard=new Set(),corrected=positions.slice();let shifted=0;if(!main)return {mounts,discard,positions:corrected,shifted};
 const point=i=>positions.slice(i*3,i*3+3),cell=.08,bins=new Map(),key=(x,y,z)=>`${x},${y},${z}`;
 for(const i of main.vertices){const p=point(i).map(v=>Math.floor(v/cell)),k=key(...p);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}
 for(const group of groups.slice(1)){
  const ids=[...group.vertices],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of ids){const p=point(i);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}}const extent=hi.map((v,k)=>v-lo[k]),span=Math.max(...extent);
  if(group.triangles.length<100&&span<.04){for(const t of group.triangles)discard.add(t);continue;}
  // Whole limbs keep their form. Detached plates are either seated or omitted.
  if(Math.min(...extent)>.045)continue;
  let contact=null,best=.12**2;
  for(const i of ids){const a=point(i),c=a.map(v=>Math.floor(v/cell));
   for(let z=-2;z<=2;z++)for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)for(const j of bins.get(key(c[0]+x,c[1]+y,c[2]+z))||[]){const b=point(j),d=b.reduce((sum,v,k)=>sum+(v-a[k])**2,0);if(d<best){best=d;contact={a,b};}}
  }
  if(!contact){for(const t of group.triangles)discard.add(t);continue;}
  const distance=Math.sqrt(best),delta=contact.b.map((v,k)=>v-contact.a[k]);
  // Slight penetration closes the contact instead of leaving two surfaces barely touching.
  if(distance>.00001){for(let k=0;k<3;k++)delta[k]*=1+.004/distance;for(const i of ids)for(let k=0;k<3;k++)corrected[i*3+k]+=delta[k];shifted++;}

 }
 const result={mounts,discard,positions:corrected,shifted};cache.set(r,result);return result;
}
