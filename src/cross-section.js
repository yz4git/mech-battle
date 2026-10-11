// Rounded cross sections are a shape prior: silhouettes do not measure hidden corners.
// Separate row intervals keep the space between legs and detached equipment open.
export function rowIntervals(sample,n=192){
 const spans=[];let start=null;
 for(let i=0;i<=n;i++){const on=sample(i/n)>0;if(on&&start===null)start=i;if(start!==null&&(!on||i===n)){const end=on?i:i-1;spans.push([(start-.5)/n,(end+.5)/n]);start=null;}}
 return spans;
}
export function sectionDistance(x,z,front,side,width,depth,power=4){
 let best=-1;
 for(const [a,b]of front)for(const [c,d]of side){const rx=(b-a)/2,rz=(d-c)/2;if(rx<=0||rz<=0)continue;const u=Math.abs((x-(a+b)/2)/rx),v=Math.abs((z-(c+d)/2)/rz);best=Math.max(best,(1-Math.pow(u**power+v**power,1/power))*Math.min(rx*width,rz*depth));}
 return best;
}
