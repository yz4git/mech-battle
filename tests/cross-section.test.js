import test from 'node:test';import assert from 'node:assert/strict';
import {rowIntervals,sectionDistance} from '../src/cross-section.js';
test('rounded section removes unsupported box corners while retaining axial extents and gaps',()=>{
 const spans=rowIntervals(x=>x>.1&&x<.3||x>.7&&x<.9?1:-1,200),side=[[.1,.9]];
 assert.equal(spans.length,2);assert.ok(sectionDistance(.5,.5,spans,side,1,1)<0);
 assert.ok(sectionDistance(.2,.89,spans,side,1,1)>0);
 assert.ok(sectionDistance(.29,.88,spans,side,1,1)<0);
 assert.ok(sectionDistance(.11,.5,spans,side,1,1)>0);
});
