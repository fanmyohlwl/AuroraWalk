import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GestureController} from '../js/gestures.js';
import {t,setLanguage} from '../js/i18n.js';
import {ForestWorld} from '../js/simulation.js';
function fakeDOM(){
 const context=Object.fromEntries(['clearRect','beginPath','moveTo','lineTo','stroke','arc','fill'].map(k=>[k,()=>{}]));
 const nodes=new Map();globalThis.document={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',hidden:false,videoWidth:640,videoHeight:480,getContext:()=>context,setAttribute(){},pause(){},srcObject:null});return nodes.get(selector);},querySelectorAll:()=>[],dispatchEvent(){},documentElement:{lang:'en'}};
 return nodes;
}
test('35% confidence acceptance exposes landmarks/stats and triggers on hand presence',()=>{
 const nodes=fakeDOM();setLanguage('en');const world=new ForestWorld(92),g=new GestureController({onWave:()=>world.triggerEvent('animal'),toast(){},getSceneState:()=>world.state()});
 const hand=(confidence,x=.5)=>({confidence,keypoints:Array.from({length:21},()=>({x:x*640,y:220}))});
 for(let i=0;i<12;i++)g.receive([hand(.34)],10+i*.1);assert.equal(world.eventCount,0);assert.equal(g.phase,'lowConfidence');
 for(let i=0;i<32;i++)g.receive([hand(.4)],12+i*.1);assert.equal(world.eventCount,1);assert.equal(nodes.get('#debug-confidence').textContent,'40%');assert.equal(nodes.get('#debug-hands').textContent,'1');assert.equal(nodes.get('#debug-events').textContent,'1');
 g.receive([hand(.4,.56)],15.2);assert.equal(world.eventCount,2);
 g.receive([],15.3);assert.equal(nodes.get('#debug-hands').textContent,'0');assert.equal(g.phase,'noHand');
 g.setDebug(true);assert.equal(nodes.get('#camera-panel').hidden,false);assert.equal(g.active,false);
 g.stop();assert.equal(nodes.get('#camera-panel').hidden,false);assert.equal(nodes.get('#camera').srcObject,null);
 setLanguage('zh');g.refresh();assert.equal(nodes.get('#gesture-label').textContent,'开启手势');assert.equal(t('recordStart'),'开始录制');setLanguage('en');assert.equal(t('recordStart'),'Start recording');
 delete globalThis.document;
});
