import * as T from '../vendor/three.module.min.js';

const UP=new T.Vector3(0,1,0),warm=0xffb354,ice=0x77e7ff;
function effectTexture(kind){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  if(kind==='smoke'){
    let seed=419;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<28;i++){const x=35+random()*58,y=35+random()*58,r=14+random()*29,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.13)');g.addColorStop(.45,'rgba(220,224,224,.09)');g.addColorStop(1,'rgba(180,185,185,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}
  }else{
    const g=ctx.createRadialGradient(64,64,0,64,64,63);
    if(kind==='ring'){g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.68,'rgba(255,255,255,0)');g.addColorStop(.8,'rgba(255,255,255,.1)');g.addColorStop(.89,'rgba(255,255,255,.9)');g.addColorStop(.95,'rgba(255,255,255,.25)');g.addColorStop(1,'rgba(255,255,255,0)');}
    else if(kind==='scorch'){g.addColorStop(0,'rgba(30,25,20,.7)');g.addColorStop(.35,'rgba(30,25,20,.6)');g.addColorStop(.75,'rgba(30,25,20,.12)');g.addColorStop(1,'rgba(30,25,20,0)');}
    else{g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.13,'rgba(255,255,255,1)');g.addColorStop(.32,'rgba(255,255,255,.6)');g.addColorStop(.62,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');}
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    if(kind==='flare'){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(17,63,94,2);ctx.fillRect(63,37,2,54);}
  }
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}
function particleBatch(parent,limit,map,additive){
  const g=new T.BufferGeometry(),positions=new Float32Array(limit*12),colors=new Float32Array(limit*16),uv=new Float32Array(limit*8),indices=new Uint16Array(limit*6);
  for(let i=0;i<limit;i++){uv.set([0,0,1,0,1,1,0,1],i*8);indices.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);}
  g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('color',new T.BufferAttribute(colors,4).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(indices,1));g.setDrawRange(0,0);
  const mesh=new T.Mesh(g,new T.MeshBasicMaterial({color:0xffffff,map,vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending,toneMapped:false}));mesh.frustumCulled=false;parent.add(mesh);
  return {mesh,g,positions,colors,limit};
}

// Bounded pools and two billboard draw calls; all effects use the gameplay event stream.
export class CombatEffects{
  constructor(scene,holder,{software=false,reducedMotion=false}={}){
    this.scene=scene;this.holder=holder;this.software=software;this.reducedMotion=reducedMotion;this.limit=software?144:360;this.particles=[];this.seed=8173;this.time=0;this.combo={hits:0,damage:0,last:-9};
    this.root=new T.Group();scene.add(this.root);
    this.maps={glow:effectTexture('flare'),smoke:effectTexture('smoke'),ring:effectTexture('ring'),scorch:effectTexture('scorch')};
    this.batches={glow:particleBatch(this.root,this.limit,this.maps.glow,true),smoke:particleBatch(this.root,this.limit,this.maps.smoke,false)};
    this.plane=new T.PlaneGeometry(1,1);this.beamGeo=new T.CylinderGeometry(1,1,1,6);this.fragmentGeo=new T.IcosahedronGeometry(1,0);this.arcGeo=new T.TorusGeometry(1.5,.065,3,32,Math.PI*1.32);
    this.shockGeo=new T.SphereGeometry(1,16,8);this.shocks=Array.from({length:4},()=>{const mesh=new T.Mesh(this.shockGeo,new T.MeshBasicMaterial({color:0xffdfb5,transparent:true,opacity:0,depthWrite:false}));mesh.visible=false;this.root.add(mesh);return{mesh,life:0};});this.aftershocks=[];this.lastStride=[0,0];this.wreckAt=[0,0];
    this.rings=Array.from({length:8},()=>this.surface(this.maps.ring,true));this.scorches=Array.from({length:8},()=>this.surface(this.maps.scorch,false));this.beams=Array.from({length:10},()=>this.makeBeam());
    this.arcs=Array.from({length:6},()=>{const mesh=new T.Mesh(this.arcGeo,new T.MeshBasicMaterial({color:ice,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));mesh.visible=false;this.root.add(mesh);return {mesh,life:0};});
    this.fragments=Array.from({length:software?12:24},()=>{const mesh=new T.Mesh(this.fragmentGeo,new T.MeshStandardMaterial({color:0x7e8c91,metalness:.7,roughness:.48,transparent:true}));mesh.visible=false;this.root.add(mesh);return {mesh,life:0};});
    this.lights=software?[]:Array.from({length:4},()=>{const light=new T.PointLight(warm,0,13,2);scene.add(light);return {light,life:0};});
    this.banner=document.createElement('div');this.banner.className='combat-callout';this.banner.setAttribute('aria-hidden','true');holder.append(this.banner);
    this.vignette=document.createElement('div');this.vignette.className='combat-impact-vignette';this.vignette.setAttribute('aria-hidden','true');holder.append(this.vignette);
    this.right=new T.Vector3();this.up=new T.Vector3();this.corner=new T.Vector3();this.dustAt=[0,0];this.vignetteStrength=0;this.bannerLife=0;
  }
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  pick(pool){return pool.find(p=>p.life<=0)||pool.reduce((a,b)=>a.life<b.life?a:b);}
  surface(map,additive){const mesh=new T.Mesh(this.plane,new T.MeshBasicMaterial({map,color:0xffffff,transparent:true,depthWrite:false,side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending,toneMapped:false}));mesh.visible=false;mesh.rotation.x=-Math.PI/2;this.root.add(mesh);return {mesh,life:0};}
  makeBeam(){const group=new T.Group(),core=new T.Mesh(this.beamGeo,new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})),halo=new T.Mesh(this.beamGeo,core.material.clone());group.add(halo,core);group.visible=false;this.root.add(group);return {group,core,halo,life:0};}
  reset(){
    this.particles.length=0;this.time=0;this.combo={hits:0,damage:0,last:-9};this.dustAt=[0,0];this.lastStride=[0,0];this.wreckAt=[0,0];this.aftershocks=[];
    for(const batch of Object.values(this.batches))batch.g.setDrawRange(0,0);
    for(const pool of [this.rings,this.scorches,this.arcs,this.fragments,this.shocks])for(const p of pool){p.life=0;p.mesh.visible=false;}
    for(const p of this.beams){p.life=0;p.group.visible=false;}for(const p of this.lights){p.life=0;p.light.intensity=0;}
    this.bannerLife=0;this.banner.style.opacity='0';this.vignetteStrength=0;this.vignette.style.opacity='0';
  }
  active(){return this.aftershocks.length>0||this.particles.length>0||this.bannerLife>0||this.vignetteStrength>.005||[...this.rings,...this.beams,...this.arcs,...this.fragments,...this.lights,...this.shocks].some(p=>p.life>0);}
  particle(type,position,options={}){
    if(this.particles.length>=this.limit){const smoke=this.particles.findIndex(p=>p.type==='smoke');this.particles.splice(smoke>=0?smoke:0,1);}
    const p={type,position:position.clone(),velocity:new T.Vector3(),life:.45,size:.18,grow:0,gravity:0,drag:1,stretch:1,color:new T.Color(warm),opacity:1,fresh:true,...options};
    if(typeof p.color==='number')p.color=new T.Color(p.color);p.total=p.life;this.particles.push(p);return p;
  }
  flash(pos,size=1,color=warm){this.particle('glow',pos,{size,life:.14,color,opacity:.72,grow:-size*.7});this.particle('glow',pos,{size:size*.3,life:.09,color:0xfff4d2});}
  spark(pos,count=12,color=warm,speed=8){
    count=Math.ceil(count*(this.software?.6:1));
    for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,v=2+this.random()*speed;this.particle('glow',pos,{color,size:.045+this.random()*.05,life:.3+this.random()*.4,velocity:new T.Vector3(Math.sin(a)*v,1.5+this.random()*6,Math.cos(a)*v),gravity:11,drag:.5,stretch:3+this.random()*4});}
  }
  smoke(pos,count=6,size=.7,color=0x9a958a){
    count=Math.ceil(count*(this.software?.65:1));
    for(let i=0;i<count;i++){const a=this.random()*Math.PI*2;this.particle('smoke',pos.clone().add(new T.Vector3(Math.sin(a)*.25,this.random()*.5,Math.cos(a)*.25)),{size:size*(.7+this.random()*.6),life:1.2+this.random()*.7,grow:size*.9,color,opacity:.75,velocity:new T.Vector3(Math.sin(a)*.6,1+this.random(),Math.cos(a)*.6),drag:.8});}
  }
  ring(pos,size=4,color=warm,vertical=false){const p=this.pick(this.rings);p.mesh.visible=true;p.mesh.position.copy(pos);p.mesh.material.color.setHex(color);p.mesh.rotation.set(vertical?0:-Math.PI/2,0,0);p.size=size;p.life=p.total=.48;p.fresh=true;p.vertical=vertical;p.mesh.scale.setScalar(.15);}
  scorch(pos,size){const p=this.pick(this.scorches);p.mesh.visible=true;p.mesh.position.set(pos.x,.028+this.random()*.008,pos.z);p.mesh.scale.setScalar(size);p.mesh.rotation.z=this.random()*6.28;p.life=p.total=12;p.mesh.material.opacity=.65;}
  illuminate(pos,color=warm,intensity=10){if(!this.lights.length)return;const p=this.pick(this.lights);p.light.position.copy(pos);p.light.color.setHex(color);p.power=intensity;p.life=p.total=.3;p.fresh=true;}
  beam(a,b,color=ice,width=.035,life=.2){
    const p=this.pick(this.beams),d=b.clone().sub(a),length=d.length();if(length<.01)return;
    p.group.visible=true;p.group.position.copy(a).add(b).multiplyScalar(.5);p.group.quaternion.setFromUnitVectors(UP,d.normalize());p.core.scale.set(width,length,width);p.halo.scale.set(width*4,length,width*4);p.core.material.color.setHex(color);p.halo.material.color.setHex(color);p.life=p.total=life;p.fresh=true;
  }
  debris(pos,count=5){for(let i=0;i<count;i++){const p=this.pick(this.fragments);p.mesh.visible=true;p.mesh.position.copy(pos);p.mesh.scale.set(.08+this.random()*.14,.08+this.random()*.2,.08+this.random()*.12);p.mesh.material.opacity=1;p.mesh.rotation.set(this.random()*6,this.random()*6,this.random()*6);p.velocity=new T.Vector3((this.random()-.5)*9,3+this.random()*6,(this.random()-.5)*9);p.spin=new T.Vector3(this.random()*7,this.random()*7,this.random()*7);p.life=p.total=1.7+this.random();p.fresh=true;}}
  shockwave(pos,size=5){const p=this.pick(this.shocks);p.mesh.visible=true;p.mesh.position.copy(pos);p.mesh.scale.setScalar(.1);p.size=size;p.life=p.total=.38;p.fresh=true;}
  groundBurst(pos,size=1.5){
    const ground=new T.Vector3(pos.x,.16,pos.z);for(let i=0;i<(this.software?5:9);i++){const a=this.random()*6.28;this.particle('smoke',ground,{size:.42*size,life:1.1,grow:.5*size,color:0x8b8273,opacity:.42,velocity:new T.Vector3(Math.sin(a)*size*2,.3,Math.cos(a)*size*2),drag:2.2});}
  }
  impact(pos,kind,big=false){
    const energy=kind==='laser'||kind==='railgun',color=energy?ice:warm,radius=big?2.5:energy?1.1:.75;
    this.flash(pos,radius,color);this.spark(pos,big?34:kind==='punch'?22:12,color,big?11:7);
    if(big){for(let i=0;i<7;i++){const a=i*Math.PI*2/7,burst=pos.clone().add(new T.Vector3(Math.sin(a)*1.05,.3+this.random()*.55,Math.cos(a)*1.05));this.particle('glow',burst,{size:1.55,life:.55+this.random()*.2,grow:1.2,color:i%2?0xff702b:0xffd77a,opacity:.85,velocity:new T.Vector3(Math.sin(a)*2,1+this.random()*2,Math.cos(a)*2)});}this.smoke(pos,11,1.4,0x746e63);this.debris(pos,this.software?4:8);this.ring(new T.Vector3(pos.x,.045,pos.z),7,color);this.scorch(pos,3.2);this.shockwave(pos,4.4);this.groundBurst(pos,1.4);}
    else if(energy){this.ring(pos,2.1,color,true);this.smoke(pos,2,.4,0x93bbc5);}
    else this.smoke(pos,3,.5);
    this.illuminate(pos,color,big?18:6);
  }
  callout(title,subtitle='',color='#f2c77e'){
    this.banner.replaceChildren();const label=document.createElement('strong'),sub=document.createElement('small');label.textContent=title;sub.textContent=subtitle;this.banner.append(label,sub);this.banner.style.color=color;this.bannerLife=1.1;this.banner.style.opacity='1';
  }
  point(model,slot){
    const d=model.userData,world=model.position.clone();
    if(slot==='armL'||slot==='armR'){d.arms[slot].updateWorldMatrix(true,false);return d.arms[slot].getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.7,.2));}
    world.y=slot==='legs'?1.3:d.cy+.05;return world;
  }
  consume(events,models,battle){
    for(const e of events){
      const model=models[e.unit];if(!model)continue;
      if(battle){const u=battle.units[e.unit];model.position.x=u.x;model.position.z=u.z;model.rotation.y=u.yaw;model.updateMatrixWorld(true);}
      if(e.type==='fire'){
        const gun=model.userData.guns[e.slot];if(!gun)continue;gun.updateWorldMatrix(true,false);
        const a=gun.localToWorld(gun.userData.muzzle?.clone()||new T.Vector3(0,0,2)),target=models[1-e.unit],b=target?this.point(target,'body'):a.clone().add(new T.Vector3(0,0,12));
        const energy=e.kind==='laser'||e.kind==='railgun',heavy=e.kind==='cannon'||e.kind==='railgun',melee=e.kind==='sword'||e.kind==='punch';
        if(e.kind==='sword'){
          const arc=this.pick(this.arcs);arc.mesh.visible=true;arc.mesh.position.copy(a).lerp(b,.4);arc.mesh.material.color.setHex(ice);arc.life=arc.total=.34;arc.fresh=true;arc.mesh.scale.setScalar(1.15);this.spark(a,7,ice,4);
        }else if(e.kind==='punch'){this.beam(a,b,warm,.09,.16);this.ring(b,1.9,warm,true);}
        else{
          this.flash(a,heavy?1.7:e.kind==='missile'?1.25:e.kind==='shotgun'?1.2:.65,energy?ice:warm);this.illuminate(a,energy?ice:warm,heavy?10:4);
          if(e.kind==='missile'){this.smoke(a,5,.65,0xa8aba6);this.spark(a,9,0xffcd7c,5);}
          else if(e.kind==='shotgun'){const end=a.clone().lerp(b,.16);for(let i=0;i<4;i++)this.beam(a,end.clone().add(new T.Vector3((i-1.5)*.15,(this.random()-.5)*.3,0)),warm,.02,.10);this.smoke(a,3,.4);}
          else{if(energy)this.beam(a,b,ice,heavy?.06:.045,heavy?.28:.22);if(energy)this.spark(a,8,ice,2);else this.smoke(a,1,.27);}
        }
        if(heavy&&!melee)this.ring(a,.9,energy?ice:warm,true);
      }
      if(e.type==='hit'){
        const pos=this.point(model,e.slot),big=e.kind==='missile'||e.kind==='cannon';
        // Put contact effects on the exposed armor, rather than inside the torso.
        const source=battle?.units[e.from];if(source){const dx=source.x-pos.x,dz=source.z-pos.z,length=Math.hypot(dx,dz)||1,offset=e.slot==='body'?.9:e.slot==='legs'?.65:.55;pos.x+=dx/length*offset;pos.z+=dz/length*offset;}
        this.impact(pos,e.kind,big);
        if(e.from===0){if(this.time-this.combo.last>1.35)this.combo={hits:0,damage:0,last:this.time};this.combo.hits++;this.combo.damage+=e.amount;this.combo.last=this.time;if(big||this.combo.hits>1)this.callout(`${this.combo.hits} HIT / ${this.combo.damage} DAMAGE`,big?'爆発命中 / EXPLOSIVE IMPACT':'連続命中 / TARGET LOCK');}
        if(e.unit===0)this.vignetteStrength=Math.min(.32,this.vignetteStrength+(big?.22:.08));
      }
      if(e.type==='miss'){const pos=new T.Vector3(e.x,.15,e.z);this.groundBurst(pos,.45);this.spark(pos,5,warm,3);this.scorch(pos,.65);}
      if(e.type==='boost'){const pos=model.position.clone();pos.y=.32;this.smoke(pos,6,1,0x9ba7ab);this.flash(pos,1.3,ice);this.ring(pos,3.8,0x9ce5f6);}
      if(e.type==='break'||e.type==='destroy'){
        const pos=this.point(model,e.type==='destroy'?'body':e.slot);this.impact(pos,'cannon',true);this.debris(pos,e.type==='destroy'?8:5);
        if(e.type==='destroy'){this.flash(pos,3.0,0xffd493);this.shockwave(pos,6.5);this.groundBurst(pos,2.2);for(const delay of [.18,.38,.65])this.aftershocks.push({at:this.time+delay,position:pos.clone(),scale:1-delay});this.smoke(pos,16,2,0x5c6467);this.ring(new T.Vector3(e.x,.05,e.z),10,0xffab63);this.callout(e.unit===1?'HOSTILE DESTROYED':'CORE LOST',e.unit===1?'敵機撃破 / CORE DETONATION':'自機大破 / SIGNAL LOST');}
        else this.callout('ARMOR BREAK',`${e.unit===1?'敵機':'自機'} / ${{armL:'左腕破壊',armR:'右腕破壊',legs:'脚部破壊'}[e.slot]}`);
      }
      if(e.type==='stagger'){this.ring(this.point(model,'body'),2.8,0xffffff,true);this.callout('STAGGER',e.unit===1?'敵機の姿勢を崩した':'自機の姿勢が崩れた');}
    }
  }
  missileTrail(pos){this.particle('glow',pos,{size:.55,life:.24,color:0xffb85e,opacity:.75,grow:-.8});this.particle('smoke',pos,{size:.32,life:.95,grow:.6,color:0xaeb3b1,opacity:.75,velocity:new T.Vector3(0,.3,0)});}
  update(dt,camera,models,battle){
    dt=Math.min(.2,Math.max(0,dt));this.time+=dt;
    camera.updateMatrixWorld(true);this.right.setFromMatrixColumn(camera.matrixWorld,0);this.up.setFromMatrixColumn(camera.matrixWorld,1);
    if(dt>0&&battle&&!battle.result)for(let i=0;i<battle.units.length;i++){
      const u=battle.units[i];if(u.dead||u.move<.3||this.time<this.dustAt[i])continue;this.dustAt[i]=this.time+(u.boost>0?.055:.18);
      const pos=new T.Vector3(u.x,.2,u.z);
      this.particle('smoke',pos,{size:u.boost>0?1:.42,life:.7,grow:.7,color:0x88918a,opacity:.45,velocity:new T.Vector3(-u.vx*.12,.15,-u.vz*.12)});
      if(u.boost>0){pos.y=models[i].userData.cy-.7;const pace=Math.hypot(u.vx,u.vz)||1;pos.x-=u.vx/pace*.9;pos.z-=u.vz/pace*.9;this.particle('glow',pos,{color:ice,size:.65,life:.28,stretch:5,velocity:new T.Vector3(-u.vx*.45,0,-u.vz*.45)});for(const side of [-1,1]){const streak=pos.clone().add(new T.Vector3(u.vz/pace*side*.45,-.6,-u.vx/pace*side*.45));this.particle('glow',streak,{color:0xbbf5ff,size:.13,life:.2,stretch:9,opacity:.55,velocity:new T.Vector3(-u.vx*.6,0,-u.vz*.6)});}}
    }
    if(dt>0){
      for(const burst of this.aftershocks.filter(p=>p.at<=this.time)){const pos=burst.position.clone().add(new T.Vector3((this.random()-.5)*1.8,this.random()*1.6,(this.random()-.5)*1.8));this.flash(pos,burst.scale*1.7);this.spark(pos,8,warm,5);this.smoke(pos,3,.8,0x5d6062);}
      this.aftershocks=this.aftershocks.filter(p=>p.at>this.time);
      if(battle)for(let i=0;i<battle.units.length;i++){
        const u=battle.units[i],model=models[i];
        if(u.dead){if(this.time>=this.wreckAt[i]){this.wreckAt[i]=this.time+.34;const pos=new T.Vector3(u.x,2.8,u.z);this.smoke(pos,1,.8,0x4f5356);this.particle('glow',pos,{size:.09,color:0xffa252,life:1.4,velocity:new T.Vector3((this.random()-.5)*.5,1.6,(this.random()-.5)*.5)});}continue;}
        if(u.move<.3||u.boost>0||model.userData.tank)continue;
        const stride=Math.floor((model.userData.walkPhase||0)/Math.PI);
        if(stride!==this.lastStride[i]){this.lastStride[i]=stride;const side=stride%2?1:-1,foot=new T.Vector3(u.x+Math.cos(u.yaw)*side*.65,.17,u.z-Math.sin(u.yaw)*side*.65);this.groundBurst(foot,.34);this.scorch(foot,.48);}
      }
    }
    for(const p of this.particles){const step=p.fresh?(p.fresh=false,Math.min(dt,.016)):dt;p.life-=step;p.velocity.multiplyScalar(Math.exp(-p.drag*step));p.velocity.y-=p.gravity*step;p.position.addScaledVector(p.velocity,step);p.size=Math.max(.01,p.size+p.grow*step);if(p.position.y<.05){p.position.y=.05;p.velocity.y=Math.abs(p.velocity.y)*.2;}}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const pool of [this.rings,this.beams,this.arcs,this.fragments,this.lights,this.scorches,this.shocks])for(const p of pool){
      if(p.life<=0)continue;const step=p.fresh?(p.fresh=false,Math.min(dt,.016)):dt;p.life-=step;const fade=Math.max(0,p.life/p.total);
      if(pool===this.shocks){p.mesh.scale.setScalar(.15+p.size*(1-fade));p.mesh.material.opacity=fade*fade*.09;}
      else if(pool===this.rings){p.mesh.scale.setScalar(.3+p.size*(1-fade));p.mesh.material.opacity=fade*.65;if(p.vertical)p.mesh.quaternion.copy(camera.quaternion);}
      else if(pool===this.beams){p.core.material.opacity=fade*.85;p.halo.material.opacity=fade*.17;}
      else if(pool===this.arcs){p.mesh.quaternion.copy(camera.quaternion);p.mesh.rotateZ(-.8+(1-fade)*2);p.mesh.material.opacity=fade*.9;}
      else if(pool===this.lights)p.light.intensity=p.power*fade;
      else if(pool===this.scorches)p.mesh.material.opacity=fade*.65;
      else{p.velocity.y-=12*step;p.mesh.position.addScaledVector(p.velocity,step);p.mesh.rotation.x+=p.spin.x*step;p.mesh.rotation.y+=p.spin.y*step;p.mesh.rotation.z+=p.spin.z*step;if(p.mesh.position.y<.12){p.mesh.position.y=.12;p.velocity.y=Math.abs(p.velocity.y)*.25;p.velocity.x*=.65;p.velocity.z*=.65;}p.mesh.material.opacity=Math.min(1,fade*3);}
      if(p.life<=0){if(p.mesh)p.mesh.visible=false;if(p.group)p.group.visible=false;if(p.light)p.light.intensity=0;}
    }
    this.writeBatch(this.batches.glow,this.particles.filter(p=>p.type==='glow'),camera);
    this.writeBatch(this.batches.smoke,this.particles.filter(p=>p.type==='smoke'),camera);
    this.bannerLife=Math.max(0,this.bannerLife-dt);this.banner.style.opacity=String(Math.min(1,this.bannerLife*4));
    this.banner.style.top=`${(this.holder.querySelector('#battle-hud')?.offsetHeight||80)+19}px`;
    this.vignetteStrength=Math.max(0,this.vignetteStrength-dt*.55);this.vignette.style.opacity=String(this.vignetteStrength);
    this.holder.dataset.fxParticles=String(this.particles.length);
  }
  writeBatch(batch,particles,camera){
    // Sort smoke within the batch, while sparks use additive blending.
    if(batch===this.batches.smoke)particles.sort((a,b)=>b.position.distanceToSquared(camera.position)-a.position.distanceToSquared(camera.position));
    let n=0;for(const p of particles){
      if(n>=batch.limit)break;const fade=p.life/p.total,alpha=p.opacity*(p.type==='glow'?Math.pow(fade,.7):Math.min(1,fade*2.2));
      const angle=p.stretch>1?Math.atan2(p.velocity.dot(this.up),p.velocity.dot(this.right)):0,cs=Math.cos(angle),sn=Math.sin(angle),sx=p.size*(p.stretch||1),sy=p.size;
      for(let j=0;j<4;j++){const x=(j===0||j===3?-.5:.5)*sx,y=(j<2?-.5:.5)*sy;
        this.corner.copy(p.position).addScaledVector(this.right,x*cs-y*sn).addScaledVector(this.up,x*sn+y*cs);this.corner.toArray(batch.positions,(n*4+j)*3);batch.colors.set([p.color.r,p.color.g,p.color.b,alpha],(n*4+j)*4);
      }n++;
    }
    batch.g.setDrawRange(0,n*6);batch.g.attributes.position.needsUpdate=true;batch.g.attributes.color.needsUpdate=true;
  }
}
