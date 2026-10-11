// A continuous signed silhouette field and surface-nets extraction replace exposed voxel cubes.
export function distanceField(view){
 const {mask,width:w,height:h}=view,n=w*h;
 const transform=target=>{const a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=mask[i]===target?0:1e6;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let d=a[i];if(x)d=Math.min(d,a[i-1]+1);if(y)d=Math.min(d,a[i-w]+1);if(x&&y)d=Math.min(d,a[i-w-1]+Math.SQRT2);if(x<w-1&&y)d=Math.min(d,a[i-w+1]+Math.SQRT2);a[i]=d;}
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;let d=a[i];if(x<w-1)d=Math.min(d,a[i+1]+1);if(y<h-1)d=Math.min(d,a[i+w]+1);if(x<w-1&&y<h-1)d=Math.min(d,a[i+w+1]+Math.SQRT2);if(x&&y<h-1)d=Math.min(d,a[i+w-1]+Math.SQRT2);a[i]=d;}return a;
 };
 const inside=transform(0),outside=transform(1),field=new Float32Array(n);for(let i=0;i<n;i++)field[i]=mask[i]?inside[i]-.5:.5-outside[i];return {...view,field};
}
export function sampleField(v,x,y){if(x<0||x>1||y<0||y>1)return -Math.max(Math.abs(x-.5)-.5,Math.abs(y-.5)-.5,.001)*Math.max(v.width,v.height);const [a,b,c,d]=v.bounds;const px=a+x*(c-a),py=b+y*(d-b),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;const at=(xx,yy)=>v.field[Math.min(v.height-1,Math.max(0,yy))*v.width+Math.min(v.width-1,Math.max(0,xx))];return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;}
export function silhouetteAnchor(v){const [x0,y0,x1,y1]=v.bounds,rows=[];let peak=0;for(let y=y0;y<=y1;y++){let count=0;for(let x=x0;x<=x1;x++)count+=v.mask[y*v.width+x];rows.push(count);peak=Math.max(peak,count);}for(let i=0;i<rows.length-3;i++)if(rows.slice(i,i+4).every(n=>n>peak*.16))return i/(y1-y0);return 0;}
export function registerView(front,view){const fa=silhouetteAnchor(front),va=silhouetteAnchor(view);return {scale:(1-va)/Math.max(.1,1-fa),anchor:va,referenceAnchor:fa};}
export function extractSurface({nx,ny,nz,width,depth,originX=.5,field,part,color}){
 const sx=nx+3,sy=ny+3,sz=nz+3,index=(x,y,z)=>(z*sy+y)*sx+x,samples=new Float32Array(sx*sy*sz);let filled=0;const frontProjection=new Uint8Array((nx+1)*(ny+1)),sideProjection=new Uint8Array((nz+1)*(ny+1));
 for(let z=0;z<sz;z++)for(let y=0;y<sy;y++)for(let x=0;x<sx;x++){const fx=(x-1)/nx,fy=(y-1)/ny,fz=(z-1)/nz;const value=field(fx,fy,fz);samples[index(x,y,z)]=value;if(value>0){filled++;if(x>=1&&x<=nx+1&&y>=1&&y<=ny+1&&z>=1&&z<=nz+1){frontProjection[(y-1)*(nx+1)+x-1]=1;sideProjection[(y-1)*(nz+1)+z-1]=1;}}}
 const cx=sx-1,cy=sy-1,cz=sz-1,cell=(x,y,z)=>(z*cy+y)*cx+x,ids=new Int32Array(cx*cy*cz);ids.fill(-1);const positions=[];
 const corners=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
 for(let z=0;z<cz;z++)for(let y=0;y<cy;y++)for(let x=0;x<cx;x++){
  const values=corners.map(c=>samples[index(x+c[0],y+c[1],z+c[2])]);let positive=0;for(const v of values)if(v>0)positive++;if(positive===0||positive===8)continue;
  const sum=[0,0,0];let count=0;for(const [a,b]of edges)if((values[a]>0)!==(values[b]>0)){const t=values[a]/(values[a]-values[b]);for(let k=0;k<3;k++)sum[k]+=corners[a][k]+(corners[b][k]-corners[a][k])*t;count++;}
  ids[cell(x,y,z)]=positions.length/3;positions.push(((x-1+sum[0]/count)/nx-originX)*width,(y-1+sum[1]/count)/ny,((z-1+sum[2]/count)/nz-.5)*depth);
 }
 const triangles=[];
 const emit=(list,outwardPositive)=>{if(list.some(i=>i<0))return;if(!outwardPositive)list.reverse();for(const indexes of [[0,1,2],[0,2,3]]){const a=indexes.map(i=>list[i]);const p=a.map(i=>positions.slice(i*3,i*3+3)),mid=[0,1,2].map(k=>(p[0][k]+p[1][k]+p[2][k])/3);const id=part(mid[0]/width+originX,mid[1]);const u=p[1].map((v,k)=>v-p[0][k]),v=p[2].map((v,k)=>v-p[0][k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];triangles.push(...a,id,color(mid,id,normal));}};
 // Each sign-changing lattice edge owns one dual quad. Winding points from inside to outside.
 for(let z=1;z<sz-1;z++)for(let y=1;y<sy-1;y++)for(let x=0;x<sx-1;x++){const a=samples[index(x,y,z)];if((a>0)!==(samples[index(x+1,y,z)]>0))emit([ids[cell(x,y-1,z-1)],ids[cell(x,y,z-1)],ids[cell(x,y,z)],ids[cell(x,y-1,z)]],a>0);}
 for(let z=1;z<sz-1;z++)for(let y=0;y<sy-1;y++)for(let x=1;x<sx-1;x++){const a=samples[index(x,y,z)];if((a>0)!==(samples[index(x,y+1,z)]>0))emit([ids[cell(x-1,y,z-1)],ids[cell(x-1,y,z)],ids[cell(x,y,z)],ids[cell(x,y,z-1)]],a>0);}
 for(let z=0;z<sz-1;z++)for(let y=1;y<sy-1;y++)for(let x=1;x<sx-1;x++){const a=samples[index(x,y,z)];if((a>0)!==(samples[index(x,y,z+1)]>0))emit([ids[cell(x-1,y-1,z)],ids[cell(x,y-1,z)],ids[cell(x,y,z)],ids[cell(x-1,y,z)]],a>0);}

 return {positions,triangles,filled,frontProjection,sideProjection};
}
