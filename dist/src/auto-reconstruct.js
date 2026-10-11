// Visual hull reconstruction. No remote inference; color is projected from source views.
export function segmentImage(image,threshold=35){
 const {width:w,height:h,data}=image,n=w*h,mask=new Uint8Array(n);let bg=[0,0,0],count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<3||y<3||x>=w-3||y>=h-3){const i=(y*w+x)*4;for(let c=0;c<3;c++)bg[c]+=data[i+c];count++;}bg=bg.map(v=>v/count);
 for(let i=0;i<n;i++){const j=i*4,r=data[j],g=data[j+1],b=data[j+2],dist=Math.hypot(r-bg[0],g-bg[1],b-bg[2]);mask[i]=data[j+3]>100&&dist>threshold&&Math.max(r,g,b)>45?1:0;}
 // Remove detached grid flecks while retaining equipment, then close tiny panel gaps.
 const seen=new Uint8Array(n),queue=new Int32Array(n);
 for(let i=0;i<n;i++)if(mask[i]&&!seen[i]){let head=0,tail=1;queue[0]=i;seen[i]=1;while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}if(tail<Math.max(12,n*.0006))for(let k=0;k<tail;k++)mask[queue[k]]=0;}
 // Close panel seams before filling enclosed dark frame pixels, preserving gaps between limbs.
 const dilated=new Uint8Array(n),closed=new Uint8Array(n),radius=2;
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
export function reconstruct(images,{threshold=35,resolution=64}={}){
 const front=segmentImage(images.front,threshold),side=images.left?segmentImage(images.left,threshold):null,back=images.back?segmentImage(images.back,threshold):null;
 const ny=resolution,nx=Math.round(resolution*.72),nz=Math.round(resolution*.42),fb=front.bounds,sb=side?.bounds;
 const width=(fb[2]-fb[0])/(fb[3]-fb[1])*front.aspect,depth=side?(sb[2]-sb[0])/(sb[3]-sb[1])*side.aspect:width*.55;
 const voxels=new Uint8Array(nx*ny*nz),color=new Uint32Array(voxels.length),index=(x,y,z)=>(y*nz+z)*nx+x;
 const part=(x,y)=>{const t=y/ny,side=x<nx/2?'L':'R',cx=Math.abs((x+.5)/nx-.5);if(t>.84)return 1;if(t>.48){if(cx>.23)return t>.62?(side==='L'?3:4):(side==='L'?5:6);return 2;}if(t>.41&&cx<.25)return 7;if(t>.23)return side==='L'?8:9;if(t>.09)return side==='L'?10:11;return side==='L'?12:13;};
 let filled=0;for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const fx=(x+.5)/nx,fy=1-(y+.5)/ny,fp=pixel(front,fx,fy);if(!front.mask[fp])continue;for(let z=0;z<nz;z++){const fz=(z+.5)/nz;if(side&&!side.mask[pixel(side,1-fz,fy)])continue;if(!side&&Math.abs(fz-.5)>.43*Math.sqrt(Math.max(0,1-((fx-.5)*1.7)**2)))continue;const k=index(x,y,z);voxels[k]=part(x,y);const source=back&&z<nz/2?back:front,p=pixel(source,source===back?1-fx:fx,fy)*4;const rgb=[0,1,2].map(c=>Math.round(source.data[p+c]/32)*32);color[k]=(Math.min(255,rgb[0])<<16)|(Math.min(255,rgb[1])<<8)|Math.min(255,rgb[2]);filled++;}}
 if(filled<100)throw Error('立体を作れません。正面と側面の切り出し・輪郭を確認してください');
 // Surface-only quads; hidden interior faces are omitted, with seams retained between joints.
 const faces=[];
 const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const k=index(x,y,z),id=voxels[k];if(!id)continue;for(let d=0;d<6;d++){const [dx,dy,dz]=dirs[d],xx=x+dx,yy=y+dy,zz=z+dz;const other=xx>=0&&xx<nx&&yy>=0&&yy<ny&&zz>=0&&zz<nz?voxels[index(xx,yy,zz)]:0;if(other!==id)faces.push([x,y,z,d,id,color[k]]);}}
 return {version:1,grid:[nx,ny,nz],width,depth,faces,filled,views:side?2:1,threshold};
}
