import * as T from '../vendor/three.module.min.js';

// Remove rigid helper pivots before batching; keep every gameplay joint intact.
export function flattenRigidGroups(parent){
  for(const child of [...parent.children])if(child.isGroup){
    flattenRigidGroups(child);
    if(child.userData.articulated)continue;
    child.updateMatrix();
    for(const object of [...child.children]){object.applyMatrix4(child.matrix);parent.add(object);}
    parent.remove(child);
  }
}

// Keep articulated groups, weapon pivots and transparent effects independent.
// Merge only rigid siblings sharing one material, reducing mobile draw calls.
export function batchRigidMeshes(group){
  for(const child of [...group.children])if(child.isGroup)batchRigidMeshes(child);
  const buckets=new Map();
  for(const child of group.children){
    if(!child.isMesh||child.userData.animated||Array.isArray(child.material)||child.material.transparent)continue;
    const key=child.material;const list=buckets.get(key)||[];list.push(child);buckets.set(key,list);
  }
  for(const [material,meshes]of buckets){
    if(meshes.length<2)continue;
    const sources=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);return g;});
    const count=sources.reduce((n,g)=>n+g.attributes.position.count,0),geometry=new T.BufferGeometry();
    for(const [name,size]of [['position',3],['normal',3],['uv',2]]){
      const array=new Float32Array(count*size);let offset=0;
      for(const g of sources){if(g.attributes[name])array.set(g.attributes[name].array,offset);offset+=g.attributes.position.count*size;}
      geometry.setAttribute(name,new T.BufferAttribute(array,size));
    }
    geometry.userData.owned=true;geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,material);mesh.castShadow=meshes.some(m=>m.castShadow);mesh.receiveShadow=meshes.some(m=>m.receiveShadow);group.add(mesh);
    for(const original of meshes)group.remove(original);for(const g of sources)g.dispose();
  }
}
