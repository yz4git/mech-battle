import {writeFileSync} from 'node:fs';
import {createReferenceFrame} from '../src/reference-frame.js';
import {getPart,starterLoadout} from '../src/parts.js';

// Manually located on the supplied 1448 x 1086 front elevation. Joint centers
// obscured by armor carry roughly ±5px uncertainty. Do not use antenna height.
const pixels={helmetTop:155,chin:219,sole:728,head:[200,260],headSide:[875,946],shoulder:[76,392],chest:[146,296],pelvis:[145,289],
 shoulderY:249,elbowY:313,wristY:413,hipY:398,kneeY:511,ankleY:657};
const h=pixels.sole-pixels.helmetTop;
const width=k=>(pixels[k][1]-pixels[k][0])/h*100,y=k=>(pixels.sole-pixels[k])/h*100;
const reference={headWidth:width('head'),headHeight:(pixels.chin-pixels.helmetTop)/h*100,headDepth:width('headSide'),shoulderWidth:width('shoulder'),chestWidth:width('chest'),pelvisWidth:width('pelvis'),
 shoulderHeight:y('shoulderY'),elbowHeight:y('elbowY'),wristHeight:y('wristY'),hipHeight:y('hipY'),kneeHeight:y('kneeY'),ankleHeight:y('ankleY')};
const b=starterLoadout(),p=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,getPart(v)]));
const measure=fit=>createReferenceFrame(b,p,1,false,[{color:null},{color:0xb7b9b5}],false,fit).userData.proportions;
const before=measure(false),after=measure(true),report={pixels,reference,before,after,uncertaintyPercent:5/h*100};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.table(Object.keys(reference).map(k=>({metric:k,reference:reference[k].toFixed(2),before:before[k].toFixed(2),after:after[k].toFixed(2),errorBefore:Math.abs(before[k]-reference[k]).toFixed(2),errorAfter:Math.abs(after[k]-reference[k]).toFixed(2)})));
