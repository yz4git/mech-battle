import * as T from '../vendor/three.module.min.js';

// Bounded-resolution, depth-buffered fallback. Uses exactly the gameplay meshes.
// It stays idle in the garage; transparent surfaces depth-test without depth-writing.
const srgb=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*Math.pow(Math.max(0,v),1/2.4)-.055));
const channel=v=>Math.min(255,Math.max(0,srgb(v)));
const planes=[v=>v[3]+v[0],v=>v[3]-v[0],v=>v[3]+v[1],v=>v[3]-v[1],v=>v[3]+v[2],v=>v[3]-v[2]];
function clip(poly){for(const plane of planes){if(!poly.length)break;const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=plane(a),db=plane(b);if(da>=0)next.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);next.push(a.map((n,k)=>n+(b[k]-n)*t));}}poly=next;}return poly;}
export class SoftwareRenderer{
  constructor(){this.domElement=document.createElement('canvas');this.domElement.dataset.renderer='software';this.ctx=this.domElement.getContext('2d',{alpha:false});this.shadowMap={enabled:false};this.textures=new WeakMap();this.vp=new T.Matrix4();this.mv=new T.Matrix4();this.nm=new T.Matrix3();this.normal=new T.Vector3();this.light=new T.Vector3(.4,.8,.55).normalize();this.rim=new T.Vector3(-.7,.45,-.6).normalize();}
  setPixelRatio(){}
  setSize(w,h){const scale=Math.min(1,840/w,640/h);this.domElement.width=Math.round(w*scale);this.domElement.height=Math.round(h*scale);this.frame=this.ctx.createImageData(this.domElement.width,this.domElement.height);this.pixels=new Uint32Array(this.frame.data.buffer);this.depth=new Float32Array(this.pixels.length);}
  texture(map){if(!map?.image?.getContext)return null;if(!this.textures.has(map)){const image=map.image;this.textures.set(map,{width:image.width,height:image.height,data:image.getContext('2d').getImageData(0,0,image.width,image.height).data});}return this.textures.get(map);}
  render(scene,camera){
    const started=performance.now();
    const ctx=this.ctx,w=this.domElement.width,h=this.domElement.height,bg=scene.background||new T.Color(0x15252e),background=[channel(bg.r),channel(bg.g),channel(bg.b)];
    this.pixels.fill(0xff000000|(background[2]<<16)|(background[1]<<8)|background[0]);this.depth.fill(Infinity);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const transparent=[];
    scene.traverseVisible(obj=>{
      if(!obj.isMesh||!obj.geometry.attributes.position)return;
      const g=obj.geometry,pos=g.attributes.position,uv=g.attributes.uv,idx=g.index;
      this.mv.multiplyMatrices(this.vp,obj.matrixWorld);this.nm.getNormalMatrix(obj.matrixWorld);const e=this.mv.elements,projected=new Array(pos.count);
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);projected[i]=[e[0]*x+e[4]*y+e[8]*z+e[12],e[1]*x+e[5]*y+e[9]*z+e[13],e[2]*x+e[6]*y+e[10]*z+e[14],e[3]*x+e[7]*y+e[11]*z+e[15],uv?.getX(i)||0,uv?.getY(i)||0];}
      const count=idx?idx.count:pos.count;
      for(let i=0;i<count;i+=3){
        const ids=[idx?idx.getX(i):i,idx?idx.getX(i+1):i+1,idx?idx.getX(i+2):i+2];
        let poly=ids.map(id=>projected[id]);
        if(planes.some(plane=>poly.every(v=>plane(v)<0)))continue;
        if(planes.some(plane=>poly.some(v=>plane(v)<0)))poly=clip(poly);
        if(poly.length<3)continue;
        let m=obj.material;if(Array.isArray(m)){const group=g.groups.find(group=>i>=group.start&&i<group.start+group.count);m=m[group?.materialIndex||0];}
        if(!m||m.visible===false||m.opacity===0)continue;
        if(g.attributes.normal)this.normal.fromBufferAttribute(g.attributes.normal,ids[0]).applyNormalMatrix(this.nm);else this.normal.set(0,1,0);
        const lighting=m.isMeshBasicMaterial?1:.27+Math.max(0,this.normal.y)*.15+Math.max(0,this.normal.dot(this.light))*.9+Math.max(0,this.normal.dot(this.rim))*.32;
        const color=m.color||new T.Color(0xffffff),glow=m.emissive,ei=m.emissiveIntensity||0;
        const shade=[channel(color.r*lighting+(glow?.r||0)*ei),channel(color.g*lighting+(glow?.g||0)*ei),channel(color.b*lighting+(glow?.b||0)*ei)];
        const points=poly.map(v=>[(v[0]/v[3]*.5+.5)*w,(-v[1]/v[3]*.5+.5)*h,v[2]/v[3],1/v[3],v[4]/v[3],v[5]/v[3]]);
        const tex=this.texture(m.map);
        for(let k=1;k<points.length-1;k++){
          const tri={points:[points[0],points[k],points[k+1]],shade,m,tex,depth:poly.reduce((n,v)=>n+v[3],0)/poly.length};
          if(m.transparent)transparent.push(tri);else this.triangle(tri,w,h,background,scene.fog);
        }
      }
    });
    transparent.sort((a,b)=>b.depth-a.depth);for(const tri of transparent)this.triangle(tri,w,h,background,scene.fog);
    ctx.putImageData(this.frame,0,0);this.domElement.dataset.renderMs=(performance.now()-started).toFixed(1);
  }
  triangle({points:[a,b,c],shade,m,tex,depth},w,h,bg,fog){
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<.01||area>=0&&m.side!==T.DoubleSide)return;
    const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(w-1,Math.ceil(Math.max(a[0],b[0],c[0]))),minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(h-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    const ax=(b[1]-c[1])/area,ay=(c[0]-b[0])/area,bx=(c[1]-a[1])/area,by=(a[0]-c[0])/area;
    const fogFactor=fog?Math.max(0,Math.min(.94,(depth-fog.near)/(fog.far-fog.near))):0;
    const r=shade[0]*(1-fogFactor)+bg[0]*fogFactor,g=shade[1]*(1-fogFactor)+bg[1]*fogFactor,blue=shade[2]*(1-fogFactor)+bg[2]*fogFactor;
    for(let y=minY;y<=maxY;y++){
      let u=((b[0]-(minX+.5))*(c[1]-(y+.5))-(b[1]-(y+.5))*(c[0]-(minX+.5)))/area;
      let v=((c[0]-(minX+.5))*(a[1]-(y+.5))-(c[1]-(y+.5))*(a[0]-(minX+.5)))/area;
      for(let x=minX;x<=maxX;x++,u+=ax,v+=bx){
        const t=1-u-v;if(u<-.00001||v<-.00001||t<-.00001)continue;
        const z=u*a[2]+v*b[2]+t*c[2],pixel=y*w+x;if(z>this.depth[pixel]+.000001)continue;
        let rr=r,gg=g,bb=blue,alpha=m.opacity??1;
        if(tex){const iw=u*a[3]+v*b[3]+t*c[3],tu=(u*a[4]+v*b[4]+t*c[4])/iw,tv=(u*a[5]+v*b[5]+t*c[5])/iw;
          const repeat=m.map.repeat,tx=((tu*repeat.x)%1+1)%1,ty=((tv*repeat.y)%1+1)%1,ti=(Math.min(tex.height-1,Math.floor((1-ty)*tex.height))*tex.width+Math.min(tex.width-1,Math.floor(tx*tex.width)))*4;
          rr*=tex.data[ti]/255;gg*=tex.data[ti+1]/255;bb*=tex.data[ti+2]/255;alpha*=tex.data[ti+3]/255;
        }
        if(alpha<.02)continue;
        if(alpha<1){const old=this.pixels[pixel];rr=rr*alpha+(old&255)*(1-alpha);gg=gg*alpha+((old>>8)&255)*(1-alpha);bb=bb*alpha+((old>>16)&255)*(1-alpha);}
        this.pixels[pixel]=0xff000000|(Math.round(bb)<<16)|(Math.round(gg)<<8)|Math.round(rr);
        if(m.depthWrite!==false)this.depth[pixel]=z;
      }
    }
  }
}
