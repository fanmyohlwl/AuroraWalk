import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForestWorld,WaveDetector} from '../js/simulation.js';
test('five-minute walk remains finite with bounded objects and clean snow recovery',()=>{
 const w=new ForestWorld(7281);w.triggerEvent('snow');assert(w.snow.length>0);
 for(let i=0;i<18000;i++)w.update(1/60);
 assert.equal(w.trees.length,155);assert(w.animals.length<=16);assert.equal(w.snow.length,0);
 for(const band of w.field.bands)for(const key of ['y','v','energy'])assert([...band[key]].every(Number.isFinite));
 assert(w.trees.every(t=>t.z>w.distance));assert(Math.abs(w.distance-660)<.001);
 const before=w.animals.length;w.triggerEvent('animal');assert(w.animals.length>before);
});
test('brief hand presence triggers once; holding and jitter do not keep triggering',()=>{
 const reasons=[],d=new WaveDetector(reason=>reasons.push(reason));
 for(let i=0;i<80;i++)d.feed(.5+Math.sin(i)*.006,.45,i*.1);
 assert.deepEqual(reasons,['presence']);
});
test('small movement in either axis triggers after cooldown, without a reversal',()=>{
 for(const axis of ['x','y']){
  let count=0;const d=new WaveDetector(()=>count++);
  for(let i=0;i<=24;i++)d.feed(.5,.45,i*.1);assert.equal(count,1);
  for(let i=25;i<30;i++)d.feed(axis==='x'?.55:.5,axis==='y'?.50:.45,i*.1);
  assert.equal(count,2);assert(d.remaining(3)>0);
 }
});
test('brief tracking dropout does not re-trigger; a genuine hand re-entry does',()=>{
 let count=0;const d=new WaveDetector(()=>count++);
 for(let i=0;i<28;i++)d.feed(.5,.45,i*.1);assert.equal(count,1);
 d.missing(3);d.feed(.5,.45,3.1);d.feed(.5,.45,3.35);assert.equal(count,1);
 d.missing(4.2);d.feed(.5,.45,4.3);d.feed(.5,.45,4.55);assert.equal(count,2);
});
test('colors transition smoothly and malformed coordinates do not fire',()=>{
 let count=0;const d=new WaveDetector(()=>count++);d.feed(NaN,.5,0);d.feed(.5,Infinity,.3);assert.equal(count,0);
 const w=new ForestWorld(91),initial=w.colors[0][0];w.setPalette(2);assert.equal(w.colors[0][0],initial);for(let i=0;i<240;i++)w.update(1/60);assert(w.colors[0][0]>250);
});
