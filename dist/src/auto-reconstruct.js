import {rowIntervals,sectionDistance} from './cross-section.js?v=2.4.0';
import {refineRegistration} from './view-registration.js?v=2.4.0';
import {distanceField,sampleField,registerView,extractSurface} from './surface-reconstruction.js?v=2.4.0';
// Visual hull reconstruction. No remote inference; color is projected from source views.
export function segmentImage(image,threshold=35){
 const {width:w,height:h,data}=image,n=w*h,mask=new Uint8Array(n);let border=[[],[],[]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<3||y<3||x>=w-3||y>=h-3){const i=(y*w+x)*4;for(let c=0;c<3;c++)border[c].push(data[i+c]);}const bg=border.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]);
 for(let i=0;i<n;i++){const j=i*4,r=data[j],g=data[j+1],b=data[j+2],dist=Math.hypot(r-bg[0],g-bg[1],b-bg[2]);mask[i]=data[j+3]>100&&dist>threshold&&Math.max(r,g,b)>45?1:0;}
 // Remove detached grid flecks while retaining equipment, then close tiny panel gaps.
 const seen=new Uint8Array(n),queue=new Int32Array(n);
 for(let i=0;i<n;i++)if(mask[i]&&!seen[i]){let head=0,tail=1;queue[0]=i;seen[i]=1;while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}if(tail<Math.max(12,n*.0006))for(let k=0;k<tail;k++)mask[queue[k]]=0;}
 // Close panel seams before filling enclosed dark frame pixels, preserving gaps between limbs.
 const dilated=new Uint8Array(n),closed=new Uint8Array(n),radius=Math.max(1,Math.round(Math.min(w,h)/85));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let on=0;for(let dy=-radius;dy<=radius&&!on;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=Math.max(0,Math.min(w-1,x+dx)),yy=Math.max(0,Math.min(h-1,y+dy));if(mask[yy*w+xx]){on=1;break;}}dilated[y*w+x]=on;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let on=1;for(let dy=-radius;dy<=radius&&on;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=Math.max(0,Math.min(w-1,x+dx)),yy=Math.max(0,Math.min(h-1,y+dy));if(!dilated[yy*w+xx]){on=0;break;}}closed[y*w+x]=on;}
 const exterior=new Uint8Array(n);let head=0,tail=0;
 for(let i=0;i<n;i++){const x=i%w,y=Math.floor(i/w);if((x===0||y===0||x===w-1||y===h-1)&&!closed[i]){queue[tail++]=i;exterior[i]=1;}}
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!closed[j]&&!exterior[j]){exterior[j]=1;queue[tail++]=j;}}
 for(let i=0;i<n;i++)if(!exterior[i])closed[i]=1;

 let minX=w,maxX=0,minY=h,maxY=0,area=0;for(let i=0;i<n;i++)if(closed[i]){const x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);area++;}
 if(area<n*.015||maxY-minY<h*.2)throw Error('輪郭を抽出できません。背景との分離しきい値か切り出し範囲を調整してください');
 return {mask:closed,width:w,height:h,data,bounds:[minX,minY,maxX,maxY],aspect:image.aspect||1,area};
}
function pixel(v,x,y){const [a,b,c,d]=v.bounds;const px=Math.max(0,Math.min(v.width-1,Math.round(a+x*(c-a)))),py=Math.max(0,Math.min(v.height-1,Math.round(b+y*(d-b))));return py*v.width+px;}
export function reconstruct(images,{threshold=35,resolution=96,relief=.5,rounding=.65}={}){
 const views={};for(const key of ['front','left','right','back'])if(images[key])views[key]=distanceField(segmentImage(images[key],threshold));
 const front=views.front,side=views.left||views.right,back=views.back;
 const ny=resolution,nx=Math.round(resolution*.8),nz=Math.round(resolution*.6),fb=front.bounds;
 const registration={};for(const [name,v]of Object.entries(views))registration[name]=registerView(front,v);
 const alignedY=(name,y)=>1-(1-y)*registration[name].scale+(registration[name].shiftY||0);
 const width=(fb[2]-fb[0])/(fb[3]-fb[1])*front.aspect;
 const axis=v=>{const [a,b,c,d]=v.bounds,values=[];for(let y=Math.round(b+(d-b)*.65);y<Math.round(b+(d-b)*.94);y++){let sum=0,count=0;for(let x=a;x<=c;x++)if(v.mask[y*v.width+x]){sum+=x;count++;}if(count>3)values.push((sum/count-a)/(c-a));}values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)]||.5;};
 const frontAxis=axis(front),backAxis=back?axis(back):.5;
 const backWidth=back?(back.bounds[2]-back.bounds[0])/(back.bounds[3]-back.bounds[1])*back.aspect/registration.back.scale:width;
 const backMapping=back?refineRegistration(front,back,{scaleX:width/backWidth,shiftX:backAxis+(frontAxis-1)*width/backWidth,scaleY:registration.back.scale,mirror:true}):null;
 const backX=x=>backMapping?(1-x)*backMapping.scaleX+backMapping.shiftX:1-x;
 if(backMapping){registration.back={...registration.back,scale:backMapping.scaleY,shiftY:backMapping.shiftY,refinement:backMapping};}

 const sideWidths=['left','right'].filter(k=>views[k]).map(k=>{const v=views[k],b=v.bounds;return (b[2]-b[0])/(b[3]-b[1])*v.aspect/registration[k].scale;});
 const depth=side?sideWidths.reduce((a,b)=>a+b,0)/sideWidths.length:width*.55;
 const sideAxes={},sideDepths={};for(const key of ['left','right'])if(views[key]){const v=views[key],b=v.bounds;sideAxes[key]=axis(v);sideDepths[key]=(b[2]-b[0])/(b[3]-b[1])*v.aspect/registration[key].scale;}
 const sideMappings={};
 if(views.left&&views.right){const l=views.left,r=views.right,ratio=sideDepths.left/sideDepths.right;
  sideMappings.right=refineRegistration(l,r,{scaleX:ratio,shiftX:sideAxes.right+(sideAxes.left-1)*ratio,scaleY:registration.right.scale/registration.left.scale,mirror:true});
 }
 const sideX=(key,z)=>{if(key==='right'&&sideMappings.right){const p=sideMappings.right,lx=sideAxes.left-(z-.5)*depth/sideDepths.left;return (1-lx)*p.scaleX+p.shiftX;}return sideAxes[key]+(key==='left'?-1:1)*(z-.5)*depth/sideDepths[key];};
 const originalAlignedY=alignedY;
 const sideY=(key,y)=>key==='right'&&sideMappings.right?1-(1-originalAlignedY('left',y))*sideMappings.right.scaleY+sideMappings.right.shiftY:originalAlignedY(key,y);

 const roundingStrength=Math.max(0,Math.min(1,Number(rounding)||0));
 const sideDistance=(z,py)=>{const values=[];for(const key of ['left','right'])if(views[key])values.push(sampleField(views[key],sideX(key,z),sideY(key,py))/(views[key].bounds[3]-views[key].bounds[1]));return values.reduce((a,b)=>a+b,0)/values.length+.006;};
 const sections=side&&roundingStrength?Array.from({length:ny+1},(_,i)=>({front:rowIntervals(x=>sampleField(front,x,1-i/ny)),side:rowIntervals(z=>sideDistance(z,1-i/ny))})):null;
 const sectionPower=16-12*roundingStrength;
 const scale=v=>1/(v.bounds[3]-v.bounds[1]);
 const part=(x,y)=>{const side=x<frontAxis?'L':'R',cx=Math.abs(x-frontAxis);if(y>.84&&cx<.17)return 1;if(y>.77&&cx>.22)return side==='L'?14:15;if(y>.48){if(cx>.23)return y>.62?(side==='L'?3:4):(side==='L'?5:6);return 2;}if(cx>.37&&y>.15)return side==='L'?16:17;if(y>.41&&cx<.25)return 7;if(y>.23)return side==='L'?8:9;if(y>.09)return side==='L'?10:11;return side==='L'?12:13;};
 const field=(x,y,z)=>{
  if(x<0||x>1||y<0||y>1||z<0||z>1)return -Math.max(-x,x-1,-y,y-1,-z,z-1,.001);
  const py=1-y,f=sampleField(front,x,py)*scale(front);let shape=f;
  // Small disagreement tolerance avoids deleting limbs when the design sheet differs across views.
  if(back)shape=Math.min(shape,sampleField(back,backX(x),alignedY('back',py))*scale(back)+.045);
  if(side){shape=Math.min(shape,sideDistance(z,py));
   if(sections){const row=sections[Math.max(0,Math.min(ny,Math.round(y*ny)))];shape=Math.min(shape,sectionDistance(x,z,row.front,row.side,width,depth,sectionPower));}
  }else shape=Math.min(shape,(.43*Math.sqrt(Math.max(0,1-((x-.5)*1.7)**2))-Math.abs(z-.5))*depth);
  return shape;
 };
 const coordinates=(key,p)=>{const x=p[0]/width+frontAxis,py=1-p[1],z=p[2]/depth+.5;return {key,v:views[key],u:key==='back'?backX(x):key==='left'||key==='right'?sideX(key,z):x,y:key==='front'?py:key==='left'||key==='right'?sideY(key,py):alignedY('back',py)};};
 const projectPoint=(p,normal,center=p)=>{
  let preferred=normal[2]<0&&back?'back':'front';
  if(Math.abs(normal[0])>Math.abs(normal[2])*1.15){if(normal[0]<0&&views.left)preferred='left';if(normal[0]>0&&views.right)preferred='right';}
  const q=coordinates(preferred,center);let key=preferred;
  // A missing rifle or a view-specific occlusion must not project the sheet's background.
  if(sampleField(q.v,q.u,q.y)<.5){let best=-Infinity;const length=Math.hypot(...normal)||1;
   for(const candidate of Object.keys(views)){const a=coordinates(candidate,center),margin=sampleField(a.v,a.u,a.y);if(margin<.5)continue;const alignment={front:normal[2],back:-normal[2],left:-normal[0],right:normal[0]}[candidate]/length,value=alignment+Math.min(6,margin)*.02;if(value>best){best=value;key=candidate;}}
  }
  const a=coordinates(key,p);return {...a,u:Math.max(0,Math.min(1,a.u)),y:Math.max(0,Math.min(1,a.y))};
 };
 const color=(p,id,normal)=>{const {v,u,y}=projectPoint(p,normal),at=pixel(v,u,y)*4;return (v.data[at]<<16)|(v.data[at+1]<<8)|v.data[at+2];};
 const uv=(p,normal,center)=>{const {key,v,u,y}=projectPoint(p,normal,center),[a,b,c,d]=v.bounds,[tx,ty]={front:[0,0],back:[1,0],left:[0,1],right:[1,1]}[key];return [(tx+Math.max(.001,Math.min(.999,(a+u*(c-a)+.5)/v.width)))/2,1-(ty+Math.max(.001,Math.min(.999,(b+y*(d-b)+.5)/v.height)))/2];};
 const surface=extractSurface({nx,ny,nz,width,depth,originX:frontAxis,field,part,color,uv});
 // A conservative image-guided inset gives broad dark frame regions depth beneath light armor.
 // It is a depth prior, not a metric depth estimate; silhouette edges and thin equipment stay fixed.
 const reliefStrength=Math.max(0,Math.min(1,Number(relief)||0));
 if(reliefStrength){const normals=new Float32Array(surface.positions.length);
  for(let t=0;t<surface.triangles.length;t+=5){const ids=surface.triangles.slice(t,t+3),p=ids.map(i=>surface.positions.slice(i*3,i*3+3)),a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];for(const i of ids)for(let k=0;k<3;k++)normals[i*3+k]+=n[k];}
  for(let i=0;i<surface.positions.length;i+=3){const n=Array.from(normals.slice(i,i+3)),length=Math.hypot(...n)||1;if(Math.abs(n[2])/length<.7)continue;const p=surface.positions.slice(i,i+3),x=p[0]/width+frontAxis,y=1-p[1],key=n[2]<0&&back?'back':'front',v=views[key],xx=key==='back'?backX(x):x,yy=key==='back'?alignedY('back',y):y;
   const distance=sampleField(v,xx,yy);if(distance<4)continue;const [a,b,c,d]=v.bounds,cx=Math.round(a+xx*(c-a)),cy=Math.round(b+yy*(d-b));let luminosity=0,count=0;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const px=Math.max(0,Math.min(v.width-1,cx+dx)),py=Math.max(0,Math.min(v.height-1,cy+dy)),at=(py*v.width+px)*4;luminosity+=(v.data[at]*.2126+v.data[at+1]*.7152+v.data[at+2]*.0722);count++;}
   const inset=Math.max(0,Math.min(1,(115-luminosity/count)/75))*.014*reliefStrength*Math.min(1,(distance-4)/6);surface.positions[i+2]-=Math.sign(n[2])*inset;
  }
 }
 if(surface.filled<100||surface.triangles.length<30)throw Error('立体を作れません。切り出し範囲・輪郭を確認してください');
 const triangles=surface.triangles.length/5;
 const overlap=(projection,n,expected)=>{let intersection=0,union=0;for(let y=0;y<=ny;y++)for(let x=0;x<=n;x++){const a=projection[y*(n+1)+x]>0,b=expected(x/n,1-y/ny);if(a&&b)intersection++;if(a||b)union++;}return union?Math.round(intersection/union*1000)/10:0;};
 const fit={front:overlap(surface.frontProjection,nx,(x,y)=>sampleField(front,x,y)>0)};
 if(back)fit.back=overlap(surface.frontProjection,nx,(x,y)=>sampleField(back,backX(x),alignedY('back',y))>0);
 for(const key of ['left','right'])if(views[key])fit[key]=overlap(surface.sideProjection,nz,(x,y)=>sampleField(views[key],sideX(key,x),sideY(key,y))>0);

 return {version:2,grid:[nx,ny,nz],width,depth,positions:surface.positions.map(v=>Math.round(v*100000)/100000),triangles:surface.triangles,uvs:surface.uvs,filled:surface.filled,views:Object.keys(views).length,threshold,relief:reliefStrength,rounding:roundingStrength,registration,sideMappings,frontAxis,backAxis,fit,triangleCount:triangles};
}
