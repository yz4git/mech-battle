import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js';
import {createMech} from '../src/mech-model.js';
import {shell,profiles} from '../src/mech-geometry.js';
import {a11Plate,A11_CONTOURS} from '../src/reference-frame.js';
import {PARTS,FAMILIES,SLOT_DEFS,accepts,starterLoadout} from '../src/parts.js';

test('armor shells have outward front and rear faces and finite surface coordinates',()=>{
  for(const profile of Object.keys(profiles)){
    const {geometry:g}=shell(new T.Group(),1,1,.5,0,0,0,0xffffff,profile);
    for(const name of ['position','normal','uv'])assert.ok([...g.attributes[name].array].every(Number.isFinite),`${profile}/${name}`);
    const p=g.attributes.position,n=g.attributes.normal;let front=0,back=0;
    for(let i=0;i<p.count;i+=3){
      const z=[0,1,2].map(j=>p.getZ(i+j));
      if(z.every(v=>Math.abs(v-.25)<1e-6)){assert.ok(n.getZ(i)>.99,profile);front++;}
      if(z.every(v=>Math.abs(v+.25)<1e-6)){assert.ok(n.getZ(i)<-.99,profile);back++;}
    }
    assert.ok(front&&back,profile);
  }
});

test('dedicated A11 plates keep inclined front and back surfaces separated with outward normals',()=>{
  for(const profile of Object.keys(A11_CONTOURS))for(const slope of [-.48,0,.2]){
    const {geometry:g}=a11Plate(new T.Group(),profile,.7,.9,.055,0,0,0,0xffffff,{slope});
    const p=g.attributes.position,n=g.attributes.normal;let volume=0;
    for(let i=0;i<p.count;i+=3){
      const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
      assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-8,profile);
      volume+=a.dot(b.clone().cross(c))/6;
      assert.ok(Number.isFinite(n.getZ(i)),profile);
    }
    assert.ok(volume>0,`${profile} has inverted winding`);
    const z=p.getZ(0)-slope*p.getY(0);assert.ok(Math.abs(z-.0275)<1e-6,profile);
  }
});

test('all 26 part families render valid full and reduced meshes within floor and camera bounds',()=>{
  for(const f of Object.values(FAMILIES))for(const reduced of [false,true]){
    const part=PARTS.find(p=>p.kind===f.id),build=starterLoadout();
    const slot=SLOT_DEFS.find(s=>accepts(s,part));assert.ok(slot,f.id);build[slot.id]=part.id;
    const root=createMech(build,0,false,[{color:null}],reduced);let meshes=0;
    root.traverse(m=>{if(!m.isMesh)return;meshes++;for(const name of ['position','normal','uv']){assert.ok(m.geometry.attributes[name],`${f.id}/${name}`);assert.ok([...m.geometry.attributes[name].array].every(Number.isFinite),`${f.id}/${name}`);}});
    assert.ok(meshes>0,f.id);const bounds=new T.Box3().setFromObject(root);
    assert.ok(bounds.min.y>=-.02,`${f.id} penetrates floor`);assert.ok(bounds.max.y<6.4,`${f.id} exceeds camera bounds`);
  }
});
