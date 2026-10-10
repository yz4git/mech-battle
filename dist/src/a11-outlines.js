import * as T from '../vendor/three.module.min.js';
import {finish} from './mech-surface.js?v=1.8.0';
import {block,cyl,ring,bar,decal,shell} from './mech-geometry.js?v=1.8.0';

// Hand-traced armor boundaries on the user's four-view sheet, in source pixels.
// Front datum: helmet=155, sole=728, axis=225. Side forward points left, datum=905.
// The drawing contains perspective/asymmetry; these are measured design controls,
// not a claim of a photogrammetric reconstruction. Occluded edges are estimated.
const mirror=points=>points.map(([x,y])=>[450-x,y]);
const shoulder=[[307,219],[318,205],[351,194],[374,194],[387,205],[392,232],[378,253],[339,269],[317,258]];
const forearm=[[340,321],[357,313],[381,316],[391,337],[398,382],[387,402],[361,406],[349,391],[342,354]];
const thigh=[[239,399],[267,393],[292,408],[300,444],[292,474],[273,493],[251,484],[239,449]];
const knee=[[277,482],[300,484],[316,505],[312,531],[286,542],[271,518]];
const shin=[[285,527],[311,523],[333,542],[343,586],[340,620],[323,636],[301,629],[286,590]];
const ankle=[[297,633],[324,624],[351,639],[367,660],[362,680],[330,686],[303,672]];
const boot=[[292,691],[305,671],[331,674],[343,685],[374,689],[393,716],[396,728],[284,728],[284,715]];
const side={
 head:[[900,154],[929,155],[943,171],[947,195],[928,215],[906,219],[879,204],[875,184],[888,166]],
 shoulder:[[912,196],[950,191],[979,207],[978,234],[956,259],[928,264],[902,245],[899,222]],
 chest:[[870,223],[907,217],[932,232],[936,278],[915,308],[889,318],[857,300],[837,265],[845,244]],
 forearm:[[932,313],[954,309],[973,331],[980,372],[968,414],[943,422],[922,403],[915,359]],
 thigh:[[885,399],[916,400],[925,426],[917,470],[901,491],[878,486],[865,448],[869,415]],
 knee:[[881,484],[910,484],[927,503],[922,528],[899,541],[874,527],[865,505]],
 shin:[[901,522],[937,527],[956,548],[957,581],[947,615],[924,640],[902,633],[887,599],[880,563],[887,538]],
 ankle:[[916,632],[946,634],[965,660],[956,681],[923,690],[900,675],[903,648]],
 boot:[[846,698],[880,675],[905,670],[928,682],[946,699],[951,718],[944,728],[823,728],[827,715]],
 skirt:[[883,341],[913,334],[935,346],[936,377],[917,399],[884,388],[865,367]],
 pelvis:[[881,333],[908,330],[924,353],[916,398],[900,429],[885,422],[874,379]],
 back:[[917,216],[952,214],[971,229],[971,285],[956,313],[922,317],[908,297],[908,238]]
};
export const A11_TRACES={
 helmet:{front:[[217,155],[238,156],[251,172],[259,188],[251,207],[238,219],[220,220],[205,210],[199,188],[203,172]],side:side.head},
 shoulderL:{front:mirror(shoulder).map(([x,y])=>[x+18,y]),side:side.shoulder},shoulderR:{front:shoulder,side:side.shoulder},
 breastL:{front:[[166,230],[191,232],[201,249],[193,282],[180,302],[156,291],[146,267],[153,243]],side:side.chest},
 breastR:{front:[[246,232],[273,229],[290,245],[296,266],[285,291],[270,305],[246,293],[237,268]],side:side.chest},
 sternum:{front:[[190,233],[232,231],[246,252],[237,292],[223,316],[205,319],[187,294],[183,262]],side:side.chest},
 forearmL:{front:mirror(forearm).map(([x,y])=>[x+10,y-2]),side:side.forearm},forearmR:{front:forearm,side:side.forearm},
 thighL:{front:mirror(thigh),side:side.thigh},thighR:{front:thigh,side:side.thigh},
 kneeL:{front:mirror(knee),side:side.knee},kneeR:{front:knee,side:side.knee},
 shinL:{front:mirror(shin),side:side.shin},shinR:{front:shin,side:side.shin},
 ankleL:{front:mirror(ankle),side:side.ankle},ankleR:{front:ankle,side:side.ankle},
 bootL:{front:mirror(boot),side:side.boot},bootR:{front:boot,side:side.boot},
 skirtL:{front:[[153,344],[177,335],[199,347],[195,381],[168,396],[146,381],[145,360]],side:side.skirt},
 skirtR:{front:[[234,346],[267,335],[289,346],[287,379],[261,397],[239,382]],side:side.skirt},
 pelvis:{front:[[195,339],[228,338],[237,362],[232,408],[219,431],[205,428],[193,398],[189,360]],side:side.pelvis},
 back:{front:[[182,222],[245,222],[258,237],[255,302],[239,321],[190,316],[177,298],[177,240]],side:side.back}
};
const limits=p=>({minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))});
function span(poly,y){
 const xs=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(Math.abs(a[1]-b[1])<1e-7){if(Math.abs(y-a[1])<1e-6)xs.push(a[0],b[0]);continue;}if(y>=Math.min(a[1],b[1])-1e-6&&y<=Math.max(a[1],b[1])+1e-6)xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
 return xs.length?[Math.min(...xs),Math.max(...xs)]:null;
}
function adjusted(key,{spread=1,width=1}={}){
 const t=A11_TRACES[key],f=limits(t.front),s=limits(t.side),cx=(f.minX+f.maxX)/2;
 return {front:t.front.map(([x,y])=>[225+(cx-225)*spread+(x-cx)*width,y]),side:t.side.map(([x,y])=>[x,f.minY+(y-s.minY)*(f.maxY-f.minY)/(s.maxY-s.minY)])};
}
function world(parent,x,y,z){const g=new T.Group();parent.add(g);parent.updateWorldMatrix(true,false);g.matrixAutoUpdate=false;g.matrix.copy(parent.matrixWorld.clone().invert().multiply(new T.Matrix4().makeTranslation(x,y,z)));return g;}
function surface(t,y,ctx){const b=limits(t.side),row=span(t.side,Math.max(b.minY,Math.min(b.maxY,y)));return(905-(row?row[0]:b.minX))*ctx.unit+.035;}
function mark(parent,t,ctx,x,y,w,h,color,depth=.022,offset=.013){const g=world(parent,(x-225)*ctx.unit,ctx.floor+(728-y)*ctx.unit,surface(t,y,ctx)+offset);block(g,w*ctx.unit,h*ctx.unit,depth,0,0,0,color);return g;}
export function loftArmor(parent,key,ctx,color,options={}){
 const t=adjusted(key,options),f=limits(t.front),ys=[...new Set([...t.front,...t.side].map(p=>p[1]))].sort((a,b)=>b-a),rings=[],vertices=[];
 for(const y of ys){const fx=span(t.front,y),sz=span(t.side,y);if(!fx||!sz)continue;
  const x0=(fx[0]-225)*ctx.unit,x1=(fx[1]-225)*ctx.unit,z0=(905-sz[1])*ctx.unit,z1=(905-sz[0])*ctx.unit,wy=ctx.floor+(728-y)*ctx.unit;
  const dx=Math.max(.0002,x1-x0),dz=Math.max(.0002,z1-z0),cx=(x0+x1)/2,cz=(z0+z1)/2,l=cx-dx/2,r=cx+dx/2,b=cz-dz/2,a=cz+dz/2,c=Math.min(.035,dx*.14,dz*.14);
  rings.push([[l+c,wy,a],[r-c,wy,a],[r,wy,a-c],[r,wy,b+c],[r-c,wy,b],[l+c,wy,b],[l,wy,b+c],[l,wy,a-c]]);
 }
 const tri=(a,b,c)=>vertices.push(...a,...b,...c);
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){const k=(i+1)%8;tri(rings[j][i],rings[j][k],rings[j+1][k]);tri(rings[j][i],rings[j+1][k],rings[j+1][i]);}
 for(const [ring,flip]of [[rings[0],true],[rings.at(-1),false]]){const mid=ring.reduce((v,p)=>v.map((x,i)=>x+p[i]/8),[0,0,0]);for(let i=0;i<8;i++){const j=(i+1)%8;flip?tri(mid,ring[j],ring[i]):tri(mid,ring[i],ring[j]);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const pos=geometry.attributes.position,n=geometry.attributes.normal,uv=[];
 for(let i=0;i<pos.count;i++){uv.push((Math.abs(n.getX(i))>Math.abs(n.getZ(i))?pos.getZ(i):pos.getX(i))*.8+.5,pos.getY(i)*.8+.5);}
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));parent.updateWorldMatrix(true,false);geometry.applyMatrix4(parent.matrixWorld.clone().invert());geometry.userData.owned=true;
 const mesh=new T.Mesh(geometry,finish(options.frameColor??color));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.outlineKey=key;parent.add(mesh);
 // The actual boundary samples are measured again after construction, before batching.
 mesh.userData.rings=rings;return{mesh,trace:t};
}
function clear(g){
 const keep=[];g.updateWorldMatrix(true,true);g.traverse(m=>{if(m.userData.animated)keep.push([m,m.matrixWorld.clone()]);});
 for(const child of [...g.children])g.remove(child);
 const inv=g.matrixWorld.clone().invert();for(const [m,matrix]of keep){g.add(m);inv.clone().multiply(matrix).decompose(m.position,m.quaternion,m.scale);}
}
function decorate(parent,key,trace,ctx,c,accent){
 const f=limits(trace.front),cx=(f.minX+f.maxX)/2,cy=(f.minY+f.maxY)/2;
 for(const [x,y]of [[f.minX+8,f.minY+9],[f.maxX-8,f.maxY-11]]){if(!span(trace.front,y))continue;const g=world(parent,(x-225)*ctx.unit,ctx.floor+(728-y)*ctx.unit,surface(trace,y,ctx)+.016);cyl(g,.018,.012,0,0,0,c.frame,'z',.018,'metal',6);}
 if(key.startsWith('breast')){const y=264,x=cx;mark(parent,trace,ctx,x,y,27,21,c.black);for(const dy of [-4,4]){const g=mark(parent,trace,ctx,x,y+dy,21,2,accent,.008,.045);g.children[0].material=finish(accent,'sensor');}mark(parent,trace,ctx,cx+8,293,5,9,accent,.008);}
 if(key.startsWith('shoulder')){const g=world(parent,(cx-225)*ctx.unit,ctx.floor+(728-cy)*ctx.unit,surface(trace,cy,ctx)+.024);decal(g,key.endsWith('R')?'03':'07',.22,.17,0,0,0);}
 if(key.startsWith('forearm')){mark(parent,trace,ctx,cx,cy,21,31,c.light);mark(parent,trace,ctx,cx+9,cy-19,3,11,c.frame);}
 if(key.startsWith('knee')){const g=mark(parent,trace,ctx,cx,cy+12,23,3,accent,.008);g.children[0].material=finish(accent,'sensor');}
 if(key.startsWith('thigh')||key.startsWith('shin')){const y=f.minY+(f.maxY-f.minY)*.2,edges=span(trace.front,y);if(edges)mark(parent,trace,ctx,(edges[0]+edges[1])/2,y,edges[1]-edges[0]-9,2,c.shade,.014);}
 if(key.startsWith('boot')){mark(parent,trace,ctx,cx,718,39,9,c.shade,.03);for(const x of [cx-15,cx+15])mark(parent,trace,ctx,x,726,10,2,c.black,.018);}
 if(key==='helmet'){
  mark(parent,trace,ctx,228,193,40,12,c.black,.014);mark(parent,trace,ctx,228,209,18,16,c.shade,.02);mark(parent,trace,ctx,228,181,34,8,c.light,.04);
  const visor=world(parent,0,0,surface(trace,192,ctx)+.035);for(const [a,b]of [[209,228],[228,247]]){const y1=a===228?193:189,y2=b===228?193:189,m=bar(visor,[(a-225)*ctx.unit,ctx.floor+(728-y1)*ctx.unit,0],[(b-225)*ctx.unit,ctx.floor+(728-y2)*ctx.unit,0],.014,accent);if(m?.material)m.material=finish(accent,'sensor');}
  const antenna=world(parent,0,0,0);bar(antenna,[(234-225)*ctx.unit,ctx.floor+(728-155)*ctx.unit,-.12],[(236-225)*ctx.unit,ctx.floor+(728-85)*ctx.unit,-.19],.012,c.steel).userData.measureExclude=true;
 }
 if(key==='sternum')mark(parent,trace,ctx,cx,293,27,21,c.shade,.02);
 if(key==='back')for(const x of [cx-22,cx+22]){const rear=world(parent,(x-225)*ctx.unit,ctx.floor+(728-270)*ctx.unit,(905-limits(trace.side).maxX)*ctx.unit-.012);rear.matrix.multiply(new T.Matrix4().makeRotationY(Math.PI));block(rear,.115,.58,.035,0,0,0,c.frame);const sensor=block(rear,.027,.37,.009,0,0,.024,accent,'light');sensor.material=finish(accent,'sensor');}
 if(key==='pelvis'){mark(parent,trace,ctx,216,354,23,22,0xb77b38,.024);const g=mark(parent,trace,ctx,216,346,18,2,accent,.008);g.children[0].material=finish(accent,'sensor');}
}
function machining(parent,key,t,ctx,c,accent){
 const f=limits(t.front),cx=(f.minX+f.maxX)/2,cy=(f.minY+f.maxY)/2,w=f.maxX-f.minX,h=f.maxY-f.minY;
 const plate=(x,y,pw,ph,color=c.paint,profile='plate',tilt=0)=>{const g=world(parent,(x-225)*ctx.unit,ctx.floor+(728-y)*ctx.unit,Math.max(...[y-ph/2,y,y+ph/2].map(row=>surface(t,row,ctx)))+.068);const m=shell(g,pw*ctx.unit,ph*ctx.unit,.055,0,0,0,color,profile,.12,.88);m.rotation.x=tilt*.2;return g;};
 const seam=(a,b)=>{const g=world(parent,0,0,0);bar(g,[(a[0]-225)*ctx.unit,ctx.floor+(728-a[1])*ctx.unit,surface(t,a[1],ctx)+.061],[(b[0]-225)*ctx.unit,ctx.floor+(728-b[1])*ctx.unit,surface(t,b[1],ctx)+.061],.006,c.frame);};
 if(/shoulder|forearm|shin|ankle|back/.test(key)){
  const sb=limits(t.side),sideWidth=sb.maxX-sb.minX,sign=key.endsWith('L')?-1:1;
  for(const sideSign of key==='helmet'||key==='back'?[-1,1]:[sign]){
   const edge=span(t.front,cy);const x=((sideSign>0?edge[1]:edge[0])-225)*ctx.unit+sideSign*.009;
   const g=world(parent,x,ctx.floor+(728-cy)*ctx.unit,(905-(sb.minX+sb.maxX)/2)*ctx.unit);
   const rot=new T.Group();rot.rotation.y=sideSign*Math.PI/2;g.add(rot);
   shell(rot,sideWidth*ctx.unit*.50,h*ctx.unit*.50,.045,0,0,0,c.paint,key.startsWith('boot')?'toe':key.startsWith('shin')?'shin':'plate',.14,.85);
   for(const a of [-1,1])for(const b of [-1,1]){cyl(rot,.019,.014,a*sideWidth*ctx.unit*.16,b*h*ctx.unit*.16,.034,c.black,'z',.019,'rubber',6);}
   if(key.startsWith('forearm')||key==='back'){block(rot,sideWidth*ctx.unit*.25,h*ctx.unit*.24,.018,0,0,.049,c.black);for(let i=-1;i<=1;i++)block(rot,sideWidth*ctx.unit*.21,.015,.021,0,i*.04,.061,c.steel);}
  }
 }
 const screw=(x,y)=>{const g=world(parent,(x-225)*ctx.unit,ctx.floor+(728-y)*ctx.unit,surface(t,y,ctx)+.092);cyl(g,.019,.011,0,0,0,c.black,'z',.019,'rubber',6);cyl(g,.008,.016,0,0,.008,c.steel,'z',.008,'metal',6);};
 if(key.startsWith('shoulder')){
  plate(cx,cy,w*.83,h*.67,c.paint,'shoulder',-.11);plate(cx, f.minY+7,w*.55,7,c.light,'plate',-.28);
  seam([cx-w*.32,cy+h*.21],[cx+w*.22,cy+h*.27]);for(const dx of [-.29,.28])screw(cx+w*dx,cy-h*.16);
  const g=world(parent,(cx-225)*ctx.unit,ctx.floor+(728-cy)*ctx.unit,surface(t,cy,ctx)+.099);decal(g,key.endsWith('R')?'03':'07',.24,.18,0,0,0);
 }else if(key==='helmet'){
  plate(228,174,29,17,c.light,'wedge',-.23);plate(211,192,10,25,c.paint,'plate',.1);plate(247,192,10,25,c.paint,'plate',.1);plate(228,211,16,15,c.paint,'wedge',.18);
  seam([208,176],[212,184]);seam([246,176],[243,184]);screw(208,199);screw(249,199);
 }else if(key==='sternum'){
  plate(cx,252,w*.65,32,c.paint,'chest',-.13);plate(cx,299,25,25,c.shade,'wedge',.14);seam([197,267],[230,267]);screw(199,241);screw(230,241);
 }else if(key.startsWith('breast')){
  plate(cx,241,w*.70,17,c.light,'plate',-.24);plate(cx,289,w*.52,23,c.paint,'wedge',.16);
  for(const dx of [-.25,.25])screw(cx+w*dx,249);
 }else if(key.startsWith('forearm')){
  plate(cx,cy,w*.68,h*.70,c.paint,'shin',.1);plate(cx,cy+7,w*.42,h*.3,c.light,'plate');
  for(const dy of [-.29,.27])for(const dx of [-.22,.22])screw(cx+w*dx,cy+h*dy);
  seam([cx-w*.23,cy-h*.13],[cx+w*.23,cy-h*.13]);
 }else if(key.startsWith('thigh')){
  plate(cx,cy,w*.69,h*.81,c.paint,'shin',-.13);seam([cx-w*.25,cy-h*.2],[cx+w*.24,cy-h*.26]);screw(cx-w*.21,cy-h*.31);screw(cx+w*.2,cy-h*.31);
 }else if(key.startsWith('shin')){
  plate(cx,cy,w*.68,h*.81,c.paint,'shin',.10);plate(cx,cy+5,w*.28,h*.47,c.light,'plate');
  for(const dy of [-.3,.28])for(const dx of [-.22,.22])screw(cx+w*dx,cy+h*dy);
  seam([cx-w*.22,cy-h*.12],[cx+w*.23,cy-h*.16]);
 }else if(key.startsWith('knee')){
  plate(cx,cy-4,w*.76,h*.64,c.paint,'plate',-.28);const g=mark(parent,t,ctx,cx,cy+8,w*.53,3,accent,.008,.105);g.children[0].material=finish(accent,'sensor');
 }else if(key.startsWith('ankle')){
  plate(cx,cy-1,w*.74,h*.54,c.paint,'plate',-.25);mark(parent,t,ctx,cx,cy+9,w*.56,7,c.black,.022,.08);
 }else if(key.startsWith('boot')){
  plate(cx,703,w*.69,24,c.paint,'toe',-.38);for(const dx of [-.24,0,.24])plate(cx+w*dx,723,w*.20,10,c.shade,'plate',.13);
  seam([cx-w*.31,711],[cx+w*.31,711]);screw(cx-w*.27,700);screw(cx+w*.27,700);
 }else if(key.startsWith('skirt')){
  plate(cx,cy,w*.75,h*.71,c.paint,'plate',.18);screw(cx-w*.22,cy-h*.22);screw(cx+w*.22,cy-h*.22);seam([cx-w*.27,cy+h*.15],[cx+w*.22,cy+h*.20]);
 }else if(key==='pelvis'){
  plate(cx,397,19,39,c.shade,'wedge',.07);const g=mark(parent,t,ctx,216,354,18,17,accent,.02,.08);g.children[0].material=finish(accent,'sensor');
 }
}

export function refineA11(nodes,ctx,c,accent,sx){
 for(const [key,g]of Object.entries(nodes)){if(!A11_TRACES[key])continue;clear(g);const palette=g.userData.colors??c,arm=/shoulder|forearm/.test(key),spread=/breast|shoulder|forearm/.test(key)?sx:1;
  const result=loftArmor(g,key,ctx,key==='pelvis'?palette.shade:palette.paint,{spread,width:arm?(g.userData.partWidth??1):1,frameColor:palette.paint});decorate(g,key,result.trace,ctx,palette,accent);machining(g,key,result.trace,ctx,palette,accent);
  if(g.userData.partArmor?.kind==='reactive'){const b=limits(result.trace.front),cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;for(const dx of [-7,7])mark(g,result.trace,ctx,cx+dx,cy,11,16,palette.shade,.045);}
  result.mesh.name='measure:'+({helmet:'helmet',sternum:'chest',breastL:'chest',breastR:'chest',shoulderL:'shoulder',shoulderR:'shoulder',pelvis:'pelvis',skirtL:'pelvis',skirtR:'pelvis',bootL:'foot',bootR:'foot'}[key]??key);
  if(key.startsWith('shin')){
   const sign=key.endsWith('R')?1:-1,front=limits(result.trace.front),x=(sign>0?front.maxX:front.minX)-225;
   for(const [py,px,r]of [[548,940,13],[595,930,11]]){const hub=world(g,x*ctx.unit+sign*.025,ctx.floor+(728-py)*ctx.unit,(905-px)*ctx.unit);cyl(hub,r*ctx.unit,.034,0,0,0,c.black,'x',r*ctx.unit,'rubber');ring(hub,r*ctx.unit*.84,.018,sign*.026,0,0,c.steel,'x');cyl(hub,r*ctx.unit*.46,.017,sign*.04,0,0,c.frame,'x');}
  }
 }
}

// Bounds and row profiles use the rendered triangles, not target coordinates.
// Diagnostics are opt-in to avoid adding mobile assembly work every frame.
export function compareA11Nodes(nodes,ctx){
 const result={};for(const [key,parent]of Object.entries(nodes)){if(!A11_TRACES[key])continue;parent.updateWorldMatrix(true,true);const triangles=[];
  let hasOutline=false;parent.traverse(m=>{if(m.userData.outlineKey)hasOutline=true;});
  parent.traverse(m=>{if(!m.isMesh||!m.visible||m.material.transparent||m.userData.measureExclude||(key==='helmet'&&!hasOutline&&!m.name.startsWith('measure:')))return;const p=m.geometry.attributes.position,idx=m.geometry.index,n=idx?idx.count:p.count;for(let i=0;i<n;i+=3)triangles.push([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(m.matrixWorld)));});
  const box=new T.Box3();for(const t of triangles)for(const v of t)box.expandByPoint(v);if(box.isEmpty())continue;
  const unit=ctx.unit,axis=225,floor=ctx.floor,point=v=>({x:axis+v.x/unit,y:728-(v.y-floor)/unit,z:905-v.z/unit});
  const b0=point(box.min),b1=point(box.max),bounds={left:b0.x,right:b1.x,top:b1.y,bottom:b0.y,forward:b1.z,rear:b0.z};
  const profile=(view,y)=>{const wy=floor+(728-y)*unit,values=[];for(const tri of triangles)for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if(Math.abs(a.y-b.y)<1e-7){if(Math.abs(wy-a.y)<1e-6)values.push(view==='front'?a.x:a.z,view==='front'?b.x:b.z);continue;}if(wy>=Math.min(a.y,b.y)-1e-6&&wy<=Math.max(a.y,b.y)+1e-6)values.push((view==='front'?a.x:a.z)+(wy-a.y)*(view==='front'?b.x-a.x:b.z-a.z)/(b.y-a.y));}
   if(!values.length)return null;const lo=Math.min(...values),hi=Math.max(...values);return view==='front'?[225+lo/unit,225+hi/unit]:[905-hi/unit,905-lo/unit];};
  const trace=adjusted(key),f=limits(trace.front),sideBounds=limits(trace.side),rows=[];
  for(const view of ['front','side'])for(const fraction of [.15,.35,.5,.65,.85]){const y=f.minY+(f.maxY-f.minY)*fraction,target=span(trace[view],y),actual=profile(view,y);rows.push({view,fraction,y,target,actual});}
  result[key]={bounds,target:{left:f.minX,right:f.maxX,top:f.minY,bottom:f.maxY,forward:sideBounds.minX,rear:sideBounds.maxX},rows};
 }return result;
}
