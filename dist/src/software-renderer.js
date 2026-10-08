import * as T from '../vendor/three.module.min.js';

// A small CPU triangle renderer for browsers whose graphics context is disabled.
// Uses the same meshes, transforms, camera and combat animation as WebGL.
const srgb=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*Math.pow(Math.max(0,v),1/2.4)-.055));
const rgb=c=>`rgb(${srgb(Math.min(1,c.r))},${srgb(Math.min(1,c.g))},${srgb(Math.min(1,c.b))})`;
const planes=[v=>v[3]+v[0],v=>v[3]-v[0],v=>v[3]+v[1],v=>v[3]-v[1],v=>v[3]+v[2],v=>v[3]-v[2]];
function clip(poly){for(const plane of planes){if(!poly.length)break;const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=plane(a),db=plane(b);if(da>=0)next.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);next.push(a.map((n,k)=>n+(b[k]-n)*t));}}poly=next;}return poly;}
export class SoftwareRenderer{
  constructor(){this.domElement=document.createElement('canvas');this.domElement.dataset.renderer='software';this.ctx=this.domElement.getContext('2d',{alpha:false});this.shadowMap={enabled:false};this.last=0;this.mapColors=new WeakMap();this.shades=new Map();this.vp=new T.Matrix4();this.mv=new T.Matrix4();this.nm=new T.Matrix3();this.normal=new T.Vector3();this.light=new T.Vector3(.4,.8,.55).normalize();this.rim=new T.Vector3(-.7,.45,-.6).normalize();}
  setPixelRatio(){/* CPU rendering uses CSS pixels to keep memory bounded. */}
  setSize(w,h){const scale=Math.min(1,1000/w);this.width=w;this.height=h;this.domElement.width=Math.round(w*scale);this.domElement.height=Math.round(h*scale);}
  materialColor(m,normal){
    let base=m.color||new T.Color(0xffffff);
    if(m.map?.image?.getContext){if(!this.mapColors.has(m.map)){const d=m.map.image.getContext('2d').getImageData(1,1,1,1).data;this.mapColors.set(m.map,new T.Color(`rgb(${d[0]},${d[1]},${d[2]})`));}base=this.mapColors.get(m.map);}
    const lighting=m.isMeshBasicMaterial?1:.6+Math.max(0,normal.y)*.15+Math.max(0,normal.dot(this.light))*.9+Math.max(0,normal.dot(this.rim))*.35;
    const key=`${m.id}/${Math.round(lighting*16)}`;if(this.shades.has(key))return this.shades.get(key);
    const e=m.emissive,ei=m.emissiveIntensity||0,color=rgb({r:base.r*lighting+(e?.r||0)*ei,g:base.g*lighting+(e?.g||0)*ei,b:base.b*lighting+(e?.b||0)*ei});
    if(this.shades.size>4096)this.shades.clear();this.shades.set(key,color);return color;
  }
  render(scene,camera){
    const now=performance.now();if(now-this.last<120)return;this.last=now;
    const ctx=this.ctx,w=this.domElement.width,h=this.domElement.height;ctx.globalAlpha=1;ctx.fillStyle=rgb(scene.background||new T.Color(0x15252e));ctx.fillRect(0,0,w,h);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const faces=[];
    scene.traverseVisible(obj=>{
      if(!obj.isMesh||!obj.geometry.attributes.position)return;
      const g=obj.geometry,pos=g.attributes.position,idx=g.index,mat=obj.material;
      this.mv.multiplyMatrices(this.vp,obj.matrixWorld);this.nm.getNormalMatrix(obj.matrixWorld);const e=this.mv.elements;
      const projected=new Array(pos.count);
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),cx=e[0]*x+e[4]*y+e[8]*z+e[12],cy=e[1]*x+e[5]*y+e[9]*z+e[13],cz=e[2]*x+e[6]*y+e[10]*z+e[14],cw=e[3]*x+e[7]*y+e[11]*z+e[15];let code=0;if(cx<-cw)code|=1;if(cx>cw)code|=2;if(cy<-cw)code|=4;if(cy>cw)code|=8;if(cz<-cw)code|=16;if(cz>cw)code|=32;projected[i]=[cx,cy,cz,cw,code];}
      const count=idx?idx.count:pos.count;
      for(let i=0;i<count;i+=3){
        const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
        const pa=projected[ia],pb=projected[ib],pc=projected[ic];if(pa[4]&pb[4]&pc[4])continue;
        let poly=[pa,pb,pc];if(pa[4]|pb[4]|pc[4])poly=clip(poly);
        if(poly.length<3)continue;
        const points=poly.map(v=>[(v[0]/v[3]*.5+.5)*w,(-v[1]/v[3]*.5+.5)*h]);
        const area=(points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]);
        let m=mat;if(Array.isArray(mat)){const group=g.groups.find(group=>i>=group.start&&i<group.start+group.count);m=mat[group?.materialIndex||0];}
        if(area>=0&&m.side!==T.DoubleSide)continue;
        if(g.attributes.normal)this.normal.fromBufferAttribute(g.attributes.normal,ia).applyNormalMatrix(this.nm);else this.normal.set(0,1,0);
        faces.push({points,depth:poly.reduce((n,v)=>n+v[3],0)/poly.length,color:this.materialColor(m,this.normal),opacity:m.opacity??1});
      }
    });
    faces.sort((a,b)=>b.depth-a.depth);
    for(const f of faces){ctx.globalAlpha=f.opacity;ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(...f.points[0]);for(let i=1;i<f.points.length;i++)ctx.lineTo(...f.points[i]);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;
  }
}
