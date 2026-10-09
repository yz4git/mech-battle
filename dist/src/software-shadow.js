import * as T from '../vendor/three.module.min.js';

// A small directional depth map keeps the CPU fallback visually consistent with WebGL.
// This is only used when WebGL is unavailable; it does not add a GPU render pass.
export class SoftwareShadow{
  constructor(){this.size=256;this.depth=new Float32Array(this.size*this.size);this.camera=new T.OrthographicCamera(-6,6,6,-6,.1,70);this.matrix=new T.Matrix4();this.mvp=new T.Matrix4();}
  update(scene,focus,span){
    const resolution=span<20?512:256;if(resolution!==this.size){this.size=resolution;this.depth=new Float32Array(resolution*resolution);}
    const c=this.camera;c.left=c.bottom=-span/2;c.right=c.top=span/2;c.position.copy(focus).add(new T.Vector3(16,32,22));c.lookAt(focus);c.updateProjectionMatrix();c.updateMatrixWorld();
    this.matrix.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse);this.depth.fill(Infinity);
    const size=this.size,depth=this.depth;
    scene.traverseVisible(o=>{
      if(!o.isMesh||!o.castShadow||o.material.transparent)return;
      if(span<20&&!o.material.userData.mechSurface)return;
      const g=o.geometry,p=g.attributes.position,idx=g.index;if(!p)return;
      this.mvp.multiplyMatrices(this.matrix,o.matrixWorld);const e=this.mvp.elements,v=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);v[i*3]=(e[0]*x+e[4]*y+e[8]*z+e[12])*.5*size+size/2;v[i*3+1]=-(e[1]*x+e[5]*y+e[9]*z+e[13])*.5*size+size/2;v[i*3+2]=e[2]*x+e[6]*y+e[10]*z+e[14];}
      for(let i=0;i<(idx?.count||p.count);i+=3){
        const a=(idx?idx.getX(i):i)*3,b=(idx?idx.getX(i+1):i+1)*3,c=(idx?idx.getX(i+2):i+2)*3;
        const ax=v[a],ay=v[a+1],bx=v[b],by=v[b+1],cx=v[c],cy=v[c+1],area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.01)continue;
        const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(size-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(size-1,Math.ceil(Math.max(ay,by,cy)));
        const du=(by-cy)/area,dv=(cy-ay)/area;
        for(let y=y0;y<=y1;y++){
          let u=((bx-x0-.5)*(cy-y-.5)-(by-y-.5)*(cx-x0-.5))/area,vv=((cx-x0-.5)*(ay-y-.5)-(cy-y-.5)*(ax-x0-.5))/area;
          for(let x=x0;x<=x1;x++,u+=du,vv+=dv){const t=1-u-vv;if(u<0||vv<0||t<0)continue;const z=u*v[a+2]+vv*v[b+2]+t*v[c+2],j=y*size+x;if(z<depth[j])depth[j]=z;}
        }
      }
    });
  }
  visibility(x,y,z){
    const size=this.size,xx=(x*.5+.5)*size,yy=(-y*.5+.5)*size;
    if(xx<1||yy<1||xx>=size-2||yy>=size-2)return 1;
    const ix=Math.floor(xx),iy=Math.floor(yy),d=this.depth;let hits=0;
    for(const dx of [-1,1])for(const dy of [-1,1])if(z-.0045<=d[(iy+dy)*size+ix+dx])hits++;
    return .48+hits*.13;
  }
}
