// Keep each pointer's tap state independent; a two-finger gesture never selects a part.
export class EditorGestures {
 constructor(){this.pointers=new Map();}
 down(id,x,y){this.pointers.set(id,{x,y,startX:x,startY:y,moved:false,suppressed:false});if(this.pointers.size>1)for(const p of this.pointers.values())p.suppressed=true;}
 move(id,x,y){const p=this.pointers.get(id);if(!p)return null;const active=[...this.pointers.values()],distance=()=>active.length>1?Math.hypot(active[0].x-active[1].x,active[0].y-active[1].y):0,oldDistance=distance(),dx=x-p.x,dy=y-p.y;p.x=x;p.y=y;if(Math.hypot(x-p.startX,y-p.startY)>5)p.moved=true;
  if(active.length>1){const next=distance();return {zoom:oldDistance>8&&next>8?oldDistance/next:1,dx:0,dy:0};}return {zoom:1,dx:p.suppressed?0:dx,dy:p.suppressed?0:dy};
 }
 up(id){const p=this.pointers.get(id);this.pointers.delete(id);return !!p&&!p.moved&&!p.suppressed;}
 cancel(id){this.pointers.delete(id);}
}
