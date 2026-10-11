// Bounded affine refinement aligns drawings without hiding their remaining disagreement.
function maskAt(v,x,y){if(x<0||x>1||y<0||y>1)return 0;const [a,b,c,d]=v.bounds;return v.mask[Math.round(b+y*(d-b))*v.width+Math.round(a+x*(c-a))];}
export function refineRegistration(reference,target,{scaleX=1,shiftX=0,scaleY=1,shiftY=0,mirror=false}={}){
 const n=80,samples=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const xx=(x+.5)/n,yy=(y+.5)/n;samples.push([xx,yy,maskAt(reference,xx,yy)]);}
 const score=p=>{let intersection=0,union=0;for(const [x,y,a]of samples){const u=(mirror?1-x:x)*p.scaleX+p.shiftX,v=1-(1-y)*p.scaleY+p.shiftY,b=maskAt(target,u,v);if(a&&b)intersection++;if(a||b)union++;}return union?intersection/union:0;};
 const origin={scaleX,shiftX,scaleY,shiftY},p={...origin};const initialScore=score(p);let best=initialScore;
 for(let s=-4;s<=4;s++)for(let d=-6;d<=6;d++){const candidate={...origin,scaleX:origin.scaleX+s*.04,shiftX:origin.shiftX+d*.02},value=score(candidate);if(value>best){Object.assign(p,candidate);best=value;}}
 for(const step of [.04,.015,.005])for(let pass=0;pass<3;pass++){let changed=false;for(const key of ['shiftX','scaleX','scaleY','shiftY'])for(const sign of [-1,1]){const value=p[key]+sign*step,limit=key==='scaleX'?.18:key==='scaleY'?.09:key==='shiftY'?.035:.12;if(Math.abs(value-origin[key])>limit)continue;const candidate={...p,[key]:value},s=score(candidate);if(s>best+.0001){Object.assign(p,candidate);best=s;changed=true;}}if(!changed)break;}
 return {...p,mirror,initialScore:Math.round(initialScore*1000)/10,score:Math.round(best*1000)/10};
}
export function mapRegistered(p,x,y){return [(p.mirror?1-x:x)*p.scaleX+p.shiftX,1-(1-y)*p.scaleY+p.shiftY];}
