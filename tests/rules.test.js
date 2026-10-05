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
test('wave needs two direction changes, filters stillness, and observes cooldown',()=>{
 let count=0;const d=new WaveDetector(()=>count++);
 for(let i=0;i<20;i++)d.feed(.5+Math.sin(i)*.006,.45,i*.1);assert.equal(count,0);
 d.reset();const xs=[.3,.4,.52,.65,.55,.42,.3,.42,.55,.66];xs.forEach((x,i)=>d.feed(x,.45,3+i*.1));assert.equal(count,1);
 xs.forEach((x,i)=>d.feed(x,.45,4+i*.1));assert.equal(count,1);
 d.reset();xs.forEach((x,i)=>d.feed(x,.45,8+i*.1));assert.equal(count,2);
});
test('missing-hand resets partial wave, and colors reach target without a hard cut',()=>{
 let count=0;const d=new WaveDetector(()=>count++);d.feed(.3,.5,0);d.feed(.65,.5,.1);d.feed(.3,.5,.2);d.missing(1);d.feed(.65,.5,1.1);assert.equal(count,0);
 const w=new ForestWorld(91),initial=w.colors[0][0];w.setPalette(2);assert.equal(w.colors[0][0],initial);for(let i=0;i<240;i++)w.update(1/60);assert(w.colors[0][0]>250);
});
