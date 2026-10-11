import {distanceField,sampleField,registerView,extractSurface} from './surface-reconstruction.js?v=2.2.0';
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
export function reconstruct(images,{threshold=35,resolution=96}={}){
 const views={};for(const key of ['front','left','right','back'])if(images[key])views[key]=distanceField(segmentImage(images[key],threshold));
 const front=views.front,side=views.left||views.right,back=views.back;
 const ny=resolution,nx=Math.round(resolution*.8),nz=Math.round(resolution*.6),fb=front.bounds;
 const registration={};for(const [name,v]of Object.entries(views))registration[name]=registerView(front,v);
 const alignedY=(name,y)=>1-(1-y)*registration[name].scale;
 const width=(fb[2]-fb[0])/(fb[3]-fb[1])*front.aspect;
 const axis=v=>{const [a,b,c,d]=v.bounds,values=[];for(let y=Math.round(b+(d-b)*.65);y<Math.round(b+(d-b)*.94);y++){let sum=0,count=0;for(let x=a;x<=c;x++)if(v.mask[y*v.width+x]){sum+=x;count++;}if(count>3)values.push((sum/count-a)/(c-a));}values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)]||.5;};
 const frontAxis=axis(front),backAxis=back?axis(back):.5;
 const backWidth=back?(back.bounds[2]-back.bounds[0])/(back.bounds[3]-back.bounds[1])*back.aspect/registration.back.scale:width;
 const backX=x=>backAxis-(x-frontAxis)*width/backWidth;
 const sideWidths=['left','right'].filter(k=>views[k]).map(k=>{const v=views[k],b=v.bounds;return (b[2]-b[0])/(b[3]-b[1])*v.aspect/registration[k].scale;});
 const depth=side?sideWidths.reduce((a,b)=>a+b,0)/sideWidths.length:width*.55;
 const sideAxes={},sideDepths={};for(const key of ['left','right'])if(views[key]){const v=views[key],b=v.bounds;sideAxes[key]=axis(v);sideDepths[key]=(b[2]-b[0])/(b[3]-b[1])*v.aspect/registration[key].scale;}
 const sideX=(key,z)=>sideAxes[key]+(key==='left'?-1:1)*(z-.5)*depth/sideDepths[key];
 const scale=v=>1/(v.bounds[3]-v.bounds[1]);
 const part=(x,y)=>{const side=x<frontAxis?'L':'R',cx=Math.abs(x-frontAxis);if(y>.84&&cx<.17)return 1;if(y>.77&&cx>.22)return side==='L'?14:15;if(y>.48){if(cx>.23)return y>.62?(side==='L'?3:4):(side==='L'?5:6);return 2;}if(cx>.37&&y>.15)return side==='L'?16:17;if(y>.41&&cx<.25)return 7;if(y>.23)return side==='L'?8:9;if(y>.09)return side==='L'?10:11;return side==='L'?12:13;};
 const field=(x,y,z)=>{
  if(x<0||x>1||y<0||y>1||z<0||z>1)return -Math.max(-x,x-1,-y,y-1,-z,z-1,.001);
  const py=1-y,f=sampleField(front,x,py)*scale(front);let shape=f;
  // Small disagreement tolerance avoids deleting limbs when the design sheet differs across views.
  if(back)shape=Math.min(shape,sampleField(back,backX(x),alignedY('back',py))*scale(back)+.045);
  if(side){const distances=[];if(views.left)distances.push(sampleField(views.left,sideX('left',z),alignedY('left',py))*scale(views.left));if(views.right)distances.push(sampleField(views.right,sideX('right',z),alignedY('right',py))*scale(views.right));
   const average=distances.reduce((a,b)=>a+b,0)/distances.length;
   // Averaged left/right signed fields use both side silhouettes without a harsh double intersection.
   shape=Math.min(shape,average+.006);
  }else shape=Math.min(shape,(.43*Math.sqrt(Math.max(0,1-((x-.5)*1.7)**2))-Math.abs(z-.5))*depth);
  return shape;
 };
 const color=(p,id,normal)=>{
  const x=p[0]/width+frontAxis,py=1-p[1],z=p[2]/depth+.5;let key=normal[2]<0&&back?'back':'front';
  // Choose projection by surface orientation, not by its position within the robot.
  if(Math.abs(normal[0])>Math.abs(normal[2])*1.15){if(normal[0]<0&&views.left)key='left';if(normal[0]>0&&views.right)key='right';}
  const v=views[key],u=key==='back'?backX(x):key==='left'?sideX('left',z):key==='right'?sideX('right',z):x,y=key==='front'?py:alignedY(key,py);
  const at=pixel(v,Math.max(0,Math.min(1,u)),Math.max(0,Math.min(1,y)))*4;
  // Preserve 24-bit source color; the former 32-level quantization erased markings and light strips.
  return (v.data[at]<<16)|(v.data[at+1]<<8)|v.data[at+2];
 };
 const surface=extractSurface({nx,ny,nz,width,depth,originX:frontAxis,field,part,color});
 if(surface.filled<100||surface.triangles.length<30)throw Error('立体を作れません。切り出し範囲・輪郭を確認してください');
 const triangles=surface.triangles.length/5;
 const overlap=(projection,n,expected)=>{let intersection=0,union=0;for(let y=0;y<=ny;y++)for(let x=0;x<=n;x++){const a=projection[y*(n+1)+x]>0,b=expected(x/n,1-y/ny);if(a&&b)intersection++;if(a||b)union++;}return union?Math.round(intersection/union*1000)/10:0;};
 const fit={front:overlap(surface.frontProjection,nx,(x,y)=>sampleField(front,x,y)>0)};
 if(back)fit.back=overlap(surface.frontProjection,nx,(x,y)=>sampleField(back,backX(x),alignedY('back',y))>0);
 for(const key of ['left','right'])if(views[key])fit[key]=overlap(surface.sideProjection,nz,(x,y)=>sampleField(views[key],sideX(key,x),alignedY(key,y))>0);

 return {version:2,grid:[nx,ny,nz],width,depth,positions:surface.positions.map(v=>Math.round(v*100000)/100000),triangles:surface.triangles,filled:surface.filled,views:Object.keys(views).length,threshold,registration,frontAxis,backAxis,fit,triangleCount:triangles};
}
