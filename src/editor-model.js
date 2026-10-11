import * as T from '../vendor/three.module.min.js';
import {makeReconstructedModel,validateReconstruction} from './reconstructed-model.js?v=2.4.0';
import {createReferenceFrame} from './reference-frame.js?v=2.0.0';
import {batchRigidMeshes} from './mesh-batch.js?v=1.9.0';
import {starterLoadout,getPart} from './parts.js?v=1.9.0';
export const EDITOR_KEY='mech-forge-v1';
export const freshProject=()=>({schema:'mech-forge/1',name:'A-11 STANDARD',height:4.8,paint:'#b8b9b5',transforms:{},plates:[]});
const vec=(v,base,min,max)=>Array.from({length:3},(_,i)=>Number.isFinite(v?.[i])?Math.max(min,Math.min(max,v[i])):base);
export function normalizeProject(raw){
 if(raw?.schema!=='mech-forge/1')throw Error('MECH FORGE用JSONを選んでください');
 const p=freshProject();p.name=String(raw.name||p.name).slice(0,60);p.height=Math.max(1,Math.min(20,Number(raw.height)||4.8));p.paint=/^#[\da-f]{6}$/i.test(raw.paint)?raw.paint:p.paint;
 for(const [key,v]of Object.entries(raw.transforms||{}).slice(0,200))p.transforms[key]={position:vec(v.position,0,-10,10),rotation:vec(v.rotation,0,-180,180),scale:vec(v.scale,1,.1,3),visible:v.visible!==false};
 p.plates=(Array.isArray(raw.plates)?raw.plates:[]).slice(0,100).map((v,i)=>({id:/^plate_[a-z0-9_]+$/i.test(v.id)?v.id:`plate_${i}`,parent:String(v.parent||'torso'),points:(v.points||[]).slice(0,64).map(a=>vec(a,0,-3,3).slice(0,2)),depth:Math.max(.01,Math.min(2,Number(v.depth)||.12)),bevel:Math.max(0,Math.min(.1,Number(v.bevel)||.02)),color:/^#[\da-f]{6}$/i.test(v.color)?v.color:p.paint})).filter(v=>v.points.length>=3);
 if(raw.reconstruction)p.reconstruction=validateReconstruction(raw.reconstruction);
 return p;
}
export function makeEditorModel(project){
 const build=starterLoadout(),parts=Object.fromEntries(Object.entries(build).map(([k,v])=>[k,getPart(v)]));
 const generated=project.reconstruction?makeReconstructedModel(project.reconstruction,project.height):null;
 const root=generated?.root||createReferenceFrame(build,parts,0,false,[{color:new T.Color(project.paint).getHex()}],false,true,true,false,true);
 const nodes=generated?.nodes||root.userData.editorNodes;
 // Place elbow and knee pivots where the mechanical hinges are, without moving the rest mesh.
 if(!generated)for(const side of ['L','R']){
  const arm=nodes[`arm${side}`],fore=nodes[`forearm${side}`],leg=nodes[`leg${side}`],shin=nodes[`shin${side}`],boot=nodes[`boot${side}`];
  if(fore){pivot(fore,new T.Vector3(0,-.97,0));if(nodes[`weapon${side}`])fore.attach(nodes[`weapon${side}`]);
   // Fingers, wrist and hand are rigid to the forearm.
   for(const o of [...arm.children])if(o.isMesh&&o.position.y<-1.8)fore.attach(o);
  }
  if(shin){pivot(shin,new T.Vector3(0,-1.15,0));if(boot)shin.attach(boot);if(nodes[`ankle${side}`])shin.attach(nodes[`ankle${side}`]);if(nodes[`knee${side}`])shin.attach(nodes[`knee${side}`]);}
 }
 if(!generated)for(const [name,node]of Object.entries(nodes)){
  if(!['torso','hips','armL','armR','legL','legR','forearmL','forearmR','shinL','shinR'].includes(name)){
   root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(node);if(!box.isEmpty())pivot(node,node.worldToLocal(box.getCenter(new T.Vector3())));
  }
 }
 for(const plate of project.plates){const parent=nodes[plate.parent]||root,shape=new T.Shape(plate.points.map(([x,y])=>new T.Vector2(x,y)));
  const geometry=new T.ExtrudeGeometry(shape,{depth:plate.depth,bevelEnabled:plate.bevel>0,bevelSize:Math.min(plate.bevel,plate.depth*.2),bevelThickness:Math.min(plate.bevel,plate.depth*.2),bevelSegments:1,steps:1,curveSegments:1});
  geometry.translate(0,0,-plate.depth/2);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:plate.color,metalness:.45,roughness:.55}));const g=new T.Group();g.name=plate.id;g.add(mesh);parent.add(g);nodes[plate.id]=g;
 }
 batchRigidMeshes(root);
 const bases={};for(const [name,node]of Object.entries(nodes)){bases[name]={position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone()};}
 applyTransforms(nodes,bases,project);
 const bounds=new T.Box3().setFromObject(root),unit=project.height/(bounds.max.y-bounds.min.y);const wrapper=new T.Group();wrapper.name='MECH';wrapper.scale.setScalar(unit);root.position.y=-bounds.min.y;root.name='rig';wrapper.add(root);
 return {root:wrapper,rig:root,nodes,bases};
}
function pivot(node,point){const offset=point.clone();node.position.add(offset.clone().applyQuaternion(node.quaternion).multiply(node.scale));for(const child of node.children)child.position.sub(offset);node.updateMatrixWorld(true);}
export function applyTransforms(nodes,bases,p){for(const [name,node]of Object.entries(nodes)){const base=bases[name],v=p.transforms[name];node.position.copy(base.position);node.rotation.copy(base.rotation);node.scale.copy(base.scale);node.visible=v?.visible!==false;if(v){node.position.add(new T.Vector3(...v.position));node.rotation.x+=T.MathUtils.degToRad(v.rotation[0]);node.rotation.y+=T.MathUtils.degToRad(v.rotation[1]);node.rotation.z+=T.MathUtils.degToRad(v.rotation[2]);node.scale.multiply(new T.Vector3(...v.scale));}}}
export function cleanExport(model){
 const saved=new Map();model.traverse(o=>{saved.set(o,o.userData);o.userData={};});
 let copy;try{copy=model.clone(true);}finally{for(const [o,data] of saved)o.userData=data;}
 copy.traverse(o=>{o.name=o.name||'armor';});copy.userData={schema:'mech-forge/1',units:'meters',upAxis:'Y',forwardAxis:'+Z',rig:'rigid node hierarchy'};return copy;
}
export function modelStats(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {triangles,meshes};}
export function disposeModel(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(!o.isMesh)return;gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});for(const g of gs)if(g.userData.owned)g.dispose();for(const m of ms)if(!m.userData.shared)m.dispose();}
