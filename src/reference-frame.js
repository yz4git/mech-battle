import * as T from '../vendor/three.module.min.js';
import {MAKERS} from './parts.js?v=1.7.0';
import {finish,palette} from './mech-surface.js?v=1.7.0';
import {block,cyl,ring,bar,piston,bolts,vent,cable,decal,setGeometryDetail} from './mech-geometry.js?v=1.7.0';
import {makeWeapon} from './mech-weapons.js?v=1.7.0';
import {refineA11,compareA11Nodes} from './a11-outlines.js?v=1.7.0';
import {batchRigidMeshes,flattenRigidGroups} from './mesh-batch.js?v=1.7.0';

// Dedicated A-11 control contours: no shared octagonal armor silhouette.
// XY is front elevation. Each contour is counter-clockwise; Z builds the actual side volume.
export const A11_CONTOURS={
 breast:[[-.42,-.36],[-.12,-.49],[.32,-.35],[.45,.18],[.31,.48],[-.33,.43],[-.48,.18]],
 sternum:[[-.19,-.49],[.19,-.49],[.27,-.16],[.3,.42],[-.25,.46],[-.3,.04]],
 shoulder:[[-.37,-.4],[.2,-.49],[.5,-.14],[.41,.35],[-.19,.5],[-.49,.28],[-.5,-.11]],
 shoulderSide:[[-.41,-.3],[.07,-.48],[.44,-.17],[.45,.24],[.19,.46],[-.41,.35]],
 forearm:[[-.29,-.49],[.24,-.44],[.41,-.14],[.4,.42],[.17,.5],[-.3,.39],[-.43,-.1]],
 thigh:[[-.27,-.48],[.24,-.49],[.38,-.24],[.38,.45],[-.34,.49],[-.4,-.03]],
 skirt:[[-.38,-.49],[.45,-.27],[.36,.48],[-.35,.43],[-.48,.08]],
 knee:[[-.36,-.45],[.32,-.47],[.43,-.13],[.35,.43],[-.28,.5],[-.45,.14]],
 shin:[[-.26,-.48],[.29,-.47],[.4,-.13],[.24,.48],[-.24,.5],[-.46,.13]],
 calfSide:[[-.38,-.43],[.06,-.5],[.41,-.21],[.49,.16],[.24,.46],[-.24,.5],[-.46,.14],[-.44,-.16]],
 ankle:[[-.46,-.28],[.28,-.48],[.48,-.08],[.29,.42],[-.3,.5],[-.46,.05]],
 jaw:[[-.16,-.46],[.16,-.46],[.38,-.1],[.31,.4],[-.33,.43],[-.4,-.03]],
 helmet:[[-.42,-.27],[-.19,-.49],[.21,-.45],[.43,-.18],[.36,.19],[.13,.48],[-.19,.46],[-.43,.16]],
 boot:[[-.45,-.45],[.44,-.45],[.49,-.03],[.24,.46],[-.28,.47],[-.48,.04]],
 rect:[[-.47,-.5],[.47,-.5],[.5,-.43],[.5,.44],[.44,.5],[-.44,.5],[-.5,.43],[-.5,-.43]]
};
const shapes=new Map();
// Calibration uses the supplied front elevation, excluding the antenna and weapons.
// Keep segment endpoints explicit: changing one global scale cannot fix joint heights.
export const A11_CALIBRATION={torsoWidth:.715,headWidth:.68,headHeight:.875,headDepth:.846,headDrop:.0594,chestWidth:.96,chestHeight:.72,chestLift:.12,hipWidth:.9,hipLift:.3,legHipX:.45,
 armY:[[0,0],[-.97,-.53],[-1.94,-1.39],[-2.3,-1.85]],
 legY:[[0,0],[-1.15,-1],[-2.31,-2.28],[-2.526,-2.83]]};
function remapY(y,knots){
 let i=0;while(i<knots.length-2&&y<knots[i+1][0])i++;
 const [a,b]=knots[i],[c,d]=knots[i+1];return b+(y-a)*(d-b)/(c-a);
}
// Deform rigid surfaces in joint-local space before batching. Weapon geometry keeps
// its own scale and muzzle coordinates; only its attachment position is moved.
function fitSegments(joint,knots,excluded=[]){
 excluded=[...excluded,...joint.children.filter(g=>g.userData.rigidJoint)];
 joint.updateWorldMatrix(true,true);const inverse=joint.matrixWorld.clone().invert();
 joint.traverse(mesh=>{
  if(!mesh.isMesh||excluded.some(g=>{for(let o=mesh;o;o=o.parent)if(o===g)return true;return false;}))return;
  const transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),back=transform.clone().invert();
  const original=mesh.geometry,g=original.clone(),p=g.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(transform);v.y=remapY(v.y,knots);v.applyMatrix4(back);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();g.computeBoundingSphere();g.userData.owned=true;mesh.geometry=g;
 });
 for(const g of excluded)g.position.y=remapY(g.position.y,knots);
}
function measurements(root,torso,arms,legs,calibrated){
 root.updateMatrixWorld(true);const boxes={};
 root.traverse(m=>{if(!m.isMesh||!m.name.startsWith('measure:'))return;const key=m.name.slice(8),b=new T.Box3().setFromObject(m,true);(boxes[key]??=new T.Box3()).union(b);});
 const floor=boxes.foot.min.y,top=boxes.helmet.max.y,height=top-floor;
 const headBox=(boxes.head??boxes.helmet).clone().union(boxes.helmet);boxes.head??=headBox;
 const point=(joint,y)=>new T.Vector3(0,y,0).applyMatrix4(joint.matrixWorld).y;
 const norm=y=>(y-floor)/height*100,width=key=>(boxes[key].max.x-boxes[key].min.x)/height*100;
 return {height,floor,helmetTop:top,shoulderWidth:width('shoulder'),headWidth:width('head'),headHeight:(headBox.max.y-headBox.min.y)/height*100,headDepth:(headBox.max.z-headBox.min.z)/height*100,chestWidth:width('chest'),pelvisWidth:width('pelvis'),
  shoulderHeight:norm(point(arms.armL,0)),elbowHeight:norm(point(arms.armL,calibrated?A11_CALIBRATION.armY[1][1]:-.97)),wristHeight:norm(point(arms.armL,calibrated?A11_CALIBRATION.armY[2][1]:-1.94)),
  hipHeight:norm(point(legs[0],0)),kneeHeight:norm(point(legs[0],calibrated?A11_CALIBRATION.legY[1][1]:-1.15)),ankleHeight:norm(point(legs[0],calibrated?A11_CALIBRATION.legY[2][1]:-2.31))};
}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
export function a11Plate(parent,shape,w,h,d,x,y,z,color,{slope=0,bevel=.045,taper=.86}={}){
 const key=[shape,w,h,d,slope,bevel,taper].join(':');
 if(!shapes.has(key)){
  const outline=A11_CONTOURS[shape],vertices=[],inner=outline.map(([a,b])=>new T.Vector2(a*w*(1-bevel),b*h*(1-bevel)));
  const front=(i)=>[inner[i].x,inner[i].y,d*.5+slope*inner[i].y];
  const back=(i)=>[outline[i][0]*w*taper,outline[i][1]*h*taper,-d*.5+slope*outline[i][1]*h*taper];
  const edge=(i)=>[outline[i][0]*w,outline[i][1]*h,d*.5-Math.min(.06,d*.25)+slope*outline[i][1]*h];
  const tri=(a,b,c)=>vertices.push(...a,...b,...c);
  for(const [i,j,k] of T.ShapeUtils.triangulateShape(inner,[])){tri(front(i),front(j),front(k));tri(back(k),back(j),back(i));}
  for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;tri(edge(i),edge(j),front(j));tri(edge(i),front(j),front(i));tri(back(i),back(j),edge(j));tri(back(i),edge(j),edge(i));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv[i*2]=(nx>nz?p.getZ(i):p.getX(i))*.8+.5;uv[i*2+1]=(ny>nz?p.getZ(i):p.getY(i))*.8+.5;}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));shapes.set(key,g);
 }
 const mesh=new T.Mesh(shapes.get(key),finish(color));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function hinge(parent,x,y,z,r,w,c){
 const joint=group(parent,x,y,z);joint.userData.rigidJoint=true;
 cyl(joint,r,w,0,0,0,c.black,'x',r,'rubber');
 for(const s of [-1,1]){cyl(joint,r*.82,.027,s*(w/2+.015),0,0,c.steel,'x');ring(joint,r*.68,.018,s*(w/2+.035),0,0,c.frame,'x');cyl(joint,r*.35,.034,s*(w/2+.05),0,0,c.black,'x');}
}

function led(parent,w,h,x,y,z,accent){
 block(parent,w+.06,h+.06,.048,x,y,z-.015,0x0c1116,'rubber');
 const m=block(parent,w,h,.012,x,y,z+.017,accent,'light');m.material=finish(accent,'sensor');return m;
}
function warnings(parent,x,y,z,s=1){
 decal(parent,'△',.095*s,.1*s,x,y,z,'#b78645');decal(parent,'CAUTION',.14*s,.026*s,x,y-.07*s,z,'#49525a');
}
function moduleArmor(parent,p,w,h,x,y,z,c){
 if(!p)return;const g=group(parent,x,y,z);
 if(p.kind==='reactive')for(const s of [-1,1])a11Plate(g,'rect',w*.44,h,.095,s*w*.25,0,0,c.shade);
 else a11Plate(g,'rect',w,h,.035,0,0,0,p.kind==='ceramic'?c.light:c.paint);
 bolts(g,w*.65,h*.65,0,0,.06);
}
function referenceFoot(parent,c,accent,s){
 const g=group(parent,0,-2.526,.12);g.rotation.z=-s*.2;
 // Long low toe and a high heel: side elevation matters more than extra surface polygons.
 block(g,.65,.13,1.21,0,-.015,.1,c.black,'rubber').name='measure:sole';
 const boot=a11Plate(g,'boot',.75,.41,.85,0,.18,.12,c.paint,{slope:-.48});boot.rotation.x=-.24;
 for(const s of [-1,1]){
  const toe=a11Plate(g,'rect',.29,.25,.45,s*.19,.095,.66,c.shade,{slope:-.36});toe.rotation.x=-.32;
  block(g,.24,.055,.11,s*.19,-.006,.85,c.frame);bolts(g,.15,.11,s*.19,.11,.9);
  const flank=group(g,s*.38,.2,-.14);flank.rotation.y=s*Math.PI/2;
  a11Plate(flank,'ankle',.41,.36,.11,0,0,0,c.paint);cyl(flank,.13,.03,0,0,.08,0xae8141,'z',.13,'paint',6);
 }
 const heel=group(g,0,.22,-.49);heel.rotation.y=Math.PI;a11Plate(heel,'rect',.56,.36,.13,0,0,0,c.paint);led(heel,.29,.052,0,.05,.1,accent);
 g.traverse(m=>{if(m.isMesh)m.name='measure:foot';});return g;
}
function referenceLeg(root,s,cy,p,c,accent,nodes){
 const leg=group(root,s*.61,cy-1.22,0);leg.rotation.z=s*.2;
 hinge(leg,0,0,0,.22,.49,c);const thighGroup=group(leg);nodes[s<0?'thighL':'thighR']=thighGroup;block(thighGroup,.34,.9,.38,0,-.56,-.07,c.frame);
 const thigh=a11Plate(thighGroup,'thigh',.67,1.03,.3,-s*.025,-.52,.2,c.shade,{slope:-.09});thigh.rotation.z=s*.06;
 a11Plate(thighGroup,'thigh',.58,.88,.055,-s*.025,-.5,.385,c.paint,{slope:-.09});
 block(thighGroup,.37,.075,.045,0,-.07,.355,c.frame);
 bolts(thighGroup,.32,.69,-s*.025,-.52,.36);block(thighGroup,.32,.045,.04,0,-.86,.368,c.shade);
 const thighBack=group(thighGroup,0,-.54,-.26);thighBack.rotation.y=Math.PI;a11Plate(thighBack,'thigh',.48,.81,.17,0,0,0,c.paint);vent(thighBack,.22,.12,0,-.22,.1);
 piston(thighGroup,[s*.22,-.13,-.2],[s*.27,-1,-.27],.052);
 hinge(leg,0,-1.15,.015,.21,.69,c);
 const kneeGroup=group(leg);nodes[s<0?'kneeL':'kneeR']=kneeGroup;
 const knee=a11Plate(kneeGroup,'knee',.55,.48,.32,0,-1.12,.3,c.light,{slope:-.21});knee.rotation.x=-.1;
 led(kneeGroup,.25,.042,0,-1.24,.49,accent);bolts(kneeGroup,.26,.2,0,-1.1,.49);
 const shinGroup=group(leg);nodes[s<0?'shinL':'shinR']=shinGroup;shinGroup.userData.partArmor=p.armorLegs;
 // Recessed tibia; outer calf housing has a separate scalloped silhouette and axle discs.
 block(shinGroup,.33,1.05,.38,0,-1.83,-.015,c.frame);
 const shin=a11Plate(shinGroup,'shin',.77,1.07,.28,-s*.055,-1.82,.245,c.shade,{slope:.17});shin.rotation.z=-s*.055;
 a11Plate(shinGroup,'shin',.59,.88,.055,-s*.055,-1.79,.435,c.paint,{slope:.17});
 bolts(shinGroup,.26,.67,-s*.07,-1.81,.412);
 const calf=group(shinGroup,s*.3,-1.78,-.11);calf.rotation.y=s*Math.PI/2;
 a11Plate(calf,'calfSide',.88,.99,.21,0,0,0,c.paint,{slope:.08});
 a11Plate(calf,'rect',.28,.3,.06,.18,.23,.135,c.light);warnings(calf,.15,.21,.18);
 for(const [y,r] of [[-.03,.19],[.35,.12]]){cyl(calf,r,.046,-.17,y,.14,c.black,'z',r,'rubber');ring(calf,r*.86,.019,-.17,y,.177,c.steel);cyl(calf,r*.48,.018,-.17,y,.197,c.frame,'z');}
 const rear=group(shinGroup,0,-1.83,-.37);rear.rotation.y=Math.PI;a11Plate(rear,'shin',.45,.77,.13,0,0,0,c.paint);vent(rear,.2,.17,0,.12,.085);
 piston(shinGroup,[s*.27,-1.29,-.24],[s*.26,-2.29,-.33],.058);
 hinge(leg,0,-2.31,-.06,.165,.54,c);const ankleGroup=group(leg);nodes[s<0?'ankleL':'ankleR']=ankleGroup;a11Plate(ankleGroup,'ankle',.5,.32,.23,0,-2.31,.19,c.paint);
 moduleArmor(leg,p.armorLegs,.23,.31,-s*.08,-1.68,.432,c);leg.userData.foot=referenceFoot(leg,c,accent,s);nodes[s<0?'bootL':'bootR']=leg.userData.foot;return leg;
}
export function createReferenceFrame(build,p,paint,enemy,paints,reduced,calibrated=true,detailed=true,captureComparison=false){
 setGeometryDetail(reduced);
 const root=new T.Group(),cy=4.07,heavy=p.body.kind==='bulwark',recon=p.body.kind==='wraith',sx=heavy?1.16:recon?.9:1;
 const colors=part=>palette(paints[paint]?.color??MAKERS[part.maker].color),c=colors(p.body),accent=enemy?0xff7834:0xff8b22;
 const nodes={},torso=group(root,0,cy,0),arms={},guns={},shoulders={},legs=[],jets=[];
 // Upper torso is a sloping wedge, not a flat box. Leave dark undercuts beneath the breast armor.
 block(torso,1.24*sx,.89,.66,0,.08,-.11,c.frame);
 block(torso,.55,.46,.46,0,-.69,-.015,c.black,'rubber');
 for(let i=0;i<3;i++)block(torso,.54-i*.035,.055,.53,0,-.55-i*.13,.02,c.frame);
 const core=group(torso);nodes.sternum=core;core.userData.partArmor=p.armorBody;
 const middle=a11Plate(core,'sternum',.84*sx,1.02,.3,0,.04,.46,c.shade,{slope:-.23});middle.name='measure:chest';
 a11Plate(core,'sternum',.77*sx,.53,.09,0,.31,.59,c.paint,{slope:-.23});
 a11Plate(core,'rect',.34,.33,.065,0,-.23,.684,c.shade,{slope:-.23});
 for(const s of [-1,1]){
  const breast=group(torso,s*.53*sx,.14,.18);breast.rotation.y=s*.19;nodes[s<0?'breastL':'breastR']=breast;
  a11Plate(breast,'breast',.89*sx,.96,.5,0,0,0,c.paint,{slope:-.32}).name='measure:chest';
  // Narrow raised top panel follows the same rake as the breast plane.
  a11Plate(breast,'breast',.76*sx,.3,.035,0,-.28,.368,c.shade,{slope:-.32});
  const top=a11Plate(breast,'rect',.43,.22,.025,-s*.035,.29,.18,c.light,{slope:-.32});
  block(breast,.36,.26,.03,s*.025,-.01,.279,c.black,'rubber');
  for(const y of [-.075,.025])led(breast,.28,.024,s*.025,y,.307,accent);
  bolts(breast,.56,.09,0,.35,.163);warnings(breast,-s*.27,.21,.201,.65);
  const lower=group(torso,s*.62*sx,-.29,.11);lower.rotation.y=s*.38;lower.rotation.z=-s*.25;
  a11Plate(lower,'breast',.47,.43,.3,0,0,0,c.shade);led(lower,.08,.105,0,-.06,.19,accent);
  a11Plate(torso,'rect',.3,.15,.62,s*.64*sx,.61,-.05,c.paint);
  block(torso,.14,.37,.19,s*.6,.64,-.19,c.frame);warnings(torso,s*.6,.73,-.08,.6);
  piston(torso,[s*.5,-.37,-.15],[s*.31,-.95,.03],.068);
  cable(torso,[[s*.64,.04,-.34],[s*.75,-.25,-.36],[s*.47,-.68,-.25]],.035);
  moduleArmor(torso,p.armorBody,.23,.32,s*.42,-.2,.49,c);
 }
 const chestObjects=[...torso.children];
 // Helmet: long brow, recessed amber slit, separate cheek guards and pointed chin.
 cyl(torso,.125,.21,0,.67,-.06,c.steel);const head=group(torso,0,.98,-.025);nodes.helmet=head;
 a11Plate(head,'helmet',.62,.56,.46,0,.035,-.08,c.paint,{slope:-.3}).name='measure:helmet';
 block(head,.4,.115,.1,0,-.047,.21,c.black,'rubber');led(head,.36,.037,0,-.04,.269,accent);
 const brow=a11Plate(head,'rect',.48,.13,.27,0,.084,.2,c.light,{slope:-.36});brow.rotation.x=.14;
 a11Plate(head,'jaw',.29,.26,.21,0,-.21,.16,c.paint,{slope:.1});
 for(const s of [-1,1]){
  const cheek=group(head,s*.267,-.12,.025);cheek.rotation.y=s*Math.PI/2;
  a11Plate(cheek,'jaw',.37,.34,.12,0,0,0,c.light,{slope:.2});cyl(cheek,.087,.025,-.07,.05,.08,c.frame,'z');cyl(cheek,.043,.03,-.07,.05,.1,c.steel,'z');
  block(head,.045,.12,.08,s*.12,-.26,.255,c.frame);
 }
 head.traverse(m=>{if(m.isMesh&&m.name!=='measure:helmet')m.name='measure:head';});
 bar(head,[.12,.25,-.17],[.17,1.18,-.25],.013,c.steel);a11Plate(head,'rect',.13,.2,.24,.12,.28,-.16,c.paint);bolts(head,.32,.13,0,.2,.135);
 // Rectangular rear engine plate and two tall glowing radiator channels.
 const ec=colors(p.engine),back=group(torso,0,.09,-.63);nodes.back=back;back.userData.colors=ec;
 block(back,.87,1.02,.39,0,0,-.08,ec.frame);const backFace=group(back,0,0,-.32);backFace.rotation.y=Math.PI;
 a11Plate(backFace,'rect',.77,.94,.15,0,0,0,ec.paint);a11Plate(backFace,'rect',.33,.46,.09,0,-.22,.12,ec.shade);
 bolts(backFace,.55,.63,0,0,.104);warnings(backFace,0,.2,.11,.8);
 for(const s of [-1,1]){
  const engine=group(back,s*.5,-.01,-.06);
  a11Plate(engine,'rect',.23,.88,.37,0,0,0,ec.frame);
  const radiator=group(engine,0,.06,-.22);radiator.rotation.y=Math.PI;
  a11Plate(radiator,'rect',.23,.64,.08,0,0,0,ec.paint);led(radiator,.036,.36,0,0,.067,accent);
  cyl(engine,.135,.23,0,-.54,.02,ec.steel,'y',.11);cyl(engine,.095,.015,0,-.664,.02,ec.black,'y',.095,'rubber');
  const flame=new T.Mesh(new T.ConeGeometry(.1,.76,8),new T.MeshBasicMaterial({color:0x99dfff,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));flame.geometry.userData.owned=true;flame.userData.animated=true;flame.position.set(0,-1.05,.02);flame.rotation.z=Math.PI;flame.visible=false;engine.add(flame);jets.push(flame);
  if(p.engine.kind==='vector')a11Plate(back,'skirt',.23,.6,.25,s*.75,.15,0,ec.light);
 }
 for(const [slot,s] of [['armL',-1],['armR',1]]){
  const ap=p[slot],ac=colors(ap),anvil=ap.kind==='anvil',precision=ap.kind==='scope',aw=anvil?1.18:precision?.89:1;
  const arm=group(torso,s*(.94*sx+.26),.35,-.045);arms[slot]=arm;
  hinge(arm,0,0,0,.245,.57,ac);
  const cap=group(arm,s*.2,.15,-.01);cap.rotation.z=-s*.16;nodes[s<0?'shoulderL':'shoulderR']=cap;cap.userData.partWidth=aw;cap.userData.colors=ac;
  a11Plate(cap,'shoulder',.91*aw,.69,.67,0,0,0,ac.paint,{slope:-.18}).name='measure:shoulder';
  // One continuous shoulder face; the seam stays at its edge instead of nested octagons.
  bolts(cap,.54,.35,0,.02,.36);decal(cap,s<0?'07':'03',.31,.22,s*.03,.025,.355);warnings(cap,-s*.27,.08,.341,.55);
  const outer=group(cap,s*.435*aw,.02,-.015);outer.rotation.y=s*Math.PI/2;
  a11Plate(outer,'shoulderSide',.64,.59,.11,0,0,0,ac.paint).name='measure:shoulder';led(outer,.027,.15,0,.08,.082,accent);
  const shoulderBack=group(cap,0,0,-.36);shoulderBack.rotation.y=Math.PI;a11Plate(shoulderBack,'shoulder',.78*aw,.58,.09,0,0,0,ac.paint);bolts(shoulderBack,.48,.31,0,0,.065);
  block(arm,.29,.58,.32,0,-.52,-.03,ac.frame);
  a11Plate(arm,'thigh',.41*aw,.61,.2,0,-.49,.16,ac.paint);bolts(arm,.2,.37,0,-.49,.282);
  const upperBack=group(arm,0,-.49,-.19);upperBack.rotation.y=Math.PI;a11Plate(upperBack,'thigh',.32,.5,.12,0,0,0,ac.paint);
  piston(arm,[s*.2,-.24,-.19],[s*.19,-.85,-.18],.048);
  hinge(arm,0,-.97,.035,.18,.46,ac);
  const fore=group(arm);nodes[s<0?'forearmL':'forearmR']=fore;fore.userData.colors=ac;fore.userData.partWidth=aw;fore.userData.partArmor=p[slot==='armL'?'armorArmL':'armorArmR'];
  block(fore,.28,.72,.32,0,-1.43,.055,ac.frame);
  a11Plate(fore,'forearm',.57*aw,.84,.38,0,-1.43,.19,ac.shade,{slope:.12});
  a11Plate(fore,'forearm',.48*aw,.7,.055,0,-1.41,.401,ac.paint,{slope:.12});
  a11Plate(fore,'rect',.31,.35,.055,-s*.035,-1.48,.399,ac.light);bolts(fore,.26,.52,0,-1.44,.419);
  const foreSide=group(fore,s*.26*aw,-1.43,.025);foreSide.rotation.y=s*Math.PI/2;a11Plate(foreSide,'forearm',.39,.72,.12,0,0,0,ac.paint);vent(foreSide,.16,.2,0,-.1,.085);
  const foreBack=group(fore,0,-1.44,-.18);foreBack.rotation.y=Math.PI;a11Plate(foreBack,'forearm',.4,.68,.15,0,0,0,ac.paint);a11Plate(foreBack,'rect',.22,.23,.04,0,.09,.103,ac.light);
  moduleArmor(fore,p[slot==='armL'?'armorArmL':'armorArmR'],.24,.32,0,-1.42,.437,ac);
  cyl(arm,.115,.2,0,-1.94,.07,ac.steel);block(arm,.29,.25,.3,0,-2.05,.1,ac.black,'rubber');
  for(let i=0;i<4;i++){a11Plate(arm,'rect',.059,.16,.095,-.105+i*.07,-2.16,.22,ac.paint);block(arm,.059,.09,.11,-.105+i*.07,-2.25,.14,ac.frame);}
  a11Plate(arm,'rect',.078,.16,.13,-s*.19,-2.1,.19,ac.paint);
  const ws=s<0?'weaponL':'weaponR',gun=makeWeapon(arm,p[ws],accent,{reference:true});gun.position.set(0,-2.03,.29);gun.scale.setScalar(p[ws]?.kind==='sword'?.64:.75);guns[ws]=gun;
  const ss=s<0?'shoulderL':'shoulderR';if(p[ss]){const pod=group(torso,s*(.94*sx+.23),p[ss].kind==='missile'?.7:1.05,-.77);shoulders[ss]=pod;hinge(pod,0,0,0,.15,.29,ac);block(pod,.23,.27,.27,0,.13,0,ac.frame);const w=makeWeapon(pod,p[ss],accent);w.position.y=p[ss].kind==='missile'?.35:.49;if(p[ss].kind==='missile')w.scale.setScalar(.82);guns[ss]=w;}
 }
 const hips=group(root,0,cy-1.12,0),lc=colors(p.legs);
 const pelvis=group(hips);nodes.pelvis=pelvis;
 block(pelvis,.85,.37,.59,0,.065,-.015,c.frame);
 a11Plate(pelvis,'sternum',.58,.71,.22,0,-.13,.32,c.shade,{slope:.12});
 a11Plate(pelvis,'rect',.28,.24,.075,0,.17,.483,0xb77b38);led(pelvis,.19,.037,0,.2,.538,accent);
 for(const s of [-1,1]){
  const skirt=group(hips,s*.41,-.1,.15);skirt.rotation.y=s*.21;skirt.rotation.z=s*.13;nodes[s<0?'skirtL':'skirtR']=skirt;a11Plate(skirt,'skirt',.62,.59,.22,0,0,0,c.paint,{slope:.16});bolts(skirt,.32,.31,0,0,.159);
  const side=group(hips,s*.63,-.07,-.03);side.rotation.y=s*Math.PI/2;a11Plate(side,'skirt',.57,.46,.17,0,0,0,c.paint);
  const rear=group(hips,s*.34,-.09,-.35);rear.rotation.y=Math.PI;a11Plate(rear,'skirt',.47,.47,.12,0,0,0,c.paint);
  legs.push(referenceLeg(root,s,cy,p,lc,accent,nodes));
 }
 hips.traverse(m=>{if(m.isMesh)m.name='measure:pelvis';});
 if(calibrated){
  const k=A11_CALIBRATION;torso.scale.x=k.torsoWidth;
  const chest=group(torso);for(const object of chestObjects)chest.add(object);chest.scale.set(k.chestWidth,k.chestHeight,1);chest.position.y=k.chestLift;
  head.scale.set(k.headWidth/k.torsoWidth,k.headHeight,k.headDepth);head.position.y-=k.headDrop;
  hips.scale.x=k.hipWidth;hips.position.y+=k.hipLift;
  for(const arm of Object.values(arms))fitSegments(arm,k.armY,[...Object.values(guns)].filter(g=>g.parent===arm));
  for(const leg of legs){leg.position.x=Math.sign(leg.position.x)*k.legHipX;leg.position.y+=k.hipLift;fitSegments(leg,k.legY,[leg.userData.foot]);}
  // Pod size is independent of torso width; its mount moves inwards with the shoulder.
  for(const pod of Object.values(shoulders))pod.scale.x=1/k.torsoWidth;
 }
 root.userData={torso,arms,guns,shoulders,legs,jets,tank:false,quad:false,reverse:false,accent,cy,build,phase:0,referenceFrame:true};
 const datum=measurements(root,torso,arms,legs,calibrated),ctx={floor:datum.floor,unit:datum.height/573};
 if(calibrated&&detailed){
  arms.armL.position.x=-1.4*sx;arms.armR.position.x=1.5*sx;arms.armL.rotation.z=-.08;arms.armR.rotation.z=.11;
  for(const child of [...hips.children])if(!Object.values(nodes).includes(child))hips.remove(child);
  refineA11(nodes,ctx,c,accent,sx);
  for(const [slot,pod]of Object.entries(shoulders)){if(p[slot]?.kind==='missile'){pod.position.x=Math.sign(pod.position.x)*1.63*sx;pod.position.z=-.91;const w=guns[slot];w.position.y=.39;w.scale.set(.52,.47,.55);}}
 }
 root.userData.proportions=measurements(root,torso,arms,legs,calibrated);
 if(captureComparison)root.userData.referenceComparison=compareA11Nodes(nodes,ctx);
 for(const g of [torso,...Object.values(arms),...Object.values(guns),...Object.values(shoulders),...legs])g.userData.articulated=true;
 flattenRigidGroups(root);batchRigidMeshes(root);
 const local=new Map();root.traverse(o=>{if(!o.isMesh||o.material.userData.shared||o.material.isMeshBasicMaterial)return;let m=local.get(o.material);if(!m){m=o.material.clone();m.userData.baseEmissive=m.emissive.clone();m.userData.baseIntensity=m.emissiveIntensity;local.set(o.material,m);}o.material=m;});root.userData.materials=[...local.values()];setGeometryDetail(false);return root;
}
