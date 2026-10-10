import {writeFileSync} from 'node:fs';
import {createReferenceFrame} from '../src/reference-frame.js';
import {A11_TRACES} from '../src/a11-outlines.js';
import {getPart,starterLoadout} from '../src/parts.js';

const b=starterLoadout(),p=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,getPart(v)]));
const measure=detailed=>createReferenceFrame(b,p,1,false,[{color:null},{color:0xb7b9b5}],false,true,detailed,true).userData.referenceComparison;
const before=measure(false),after=measure(true);
function errors(node){
 const bounds=Object.keys(node.target).map(k=>Math.abs(node.bounds[k]-node.target[k]));
 const rows=node.rows.flatMap(r=>r.actual?r.target.map((v,i)=>Math.abs(v-r.actual[i])):[]);
 const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
 return {boundsMeanPx:mean(bounds),profileMeanPx:mean(rows),maxPx:Math.max(...bounds,...rows),missingRows:node.rows.filter(r=>!r.actual).length};
}
const comparison=Object.keys(A11_TRACES).map(key=>({key,before:errors(before[key]),after:errors(after[key])}));
const report={version:'1.7.0',source:'User supplied A-11 four-view sheet, manual trace',heightDatumPixels:573,
 componentCount:22,outlineVertices:Object.values(A11_TRACES).reduce((n,t)=>n+t.front.length+t.side.length,0),
 scalarChecks:572,definition:'22 components × (6 bounds + 5 row heights × 2 views × 2 edges). Whole component triangles, including detail plates; excludes antenna and transparent decals.',
 uncertainty:'Approximately 5–10 source pixels for visible edges; higher for hidden edges. Left components are mirrored with measured offsets. Side rows are vertically registered to each front component. Back silhouette is inferred from the rear view. Not a 3D scan or an image-similarity score.',
 summary:{boundsBefore:comparison.reduce((n,r)=>n+r.before.boundsMeanPx,0)/22,boundsAfter:comparison.reduce((n,r)=>n+r.after.boundsMeanPx,0)/22,
 profileBefore:comparison.reduce((n,r)=>n+r.before.profileMeanPx,0)/22,profileAfter:comparison.reduce((n,r)=>n+r.after.profileMeanPx,0)/22,
 missingBefore:comparison.reduce((n,r)=>n+r.before.missingRows,0),missingAfter:comparison.reduce((n,r)=>n+r.after.missingRows,0)},comparison,before,after};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outlineVertices:report.outlineVertices,scalarChecks:report.scalarChecks,summary:report.summary},null,2));
console.table(comparison.map(r=>({part:r.key,boundsBefore:r.before.boundsMeanPx.toFixed(1),boundsAfter:r.after.boundsMeanPx.toFixed(1),profileBefore:r.before.profileMeanPx.toFixed(1),profileAfter:r.after.profileMeanPx.toFixed(1),missingBefore:r.before.missingRows,missingAfter:r.after.missingRows})));
