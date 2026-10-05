import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GestureController,copyVideoFrame} from '../js/gestures.js';
import {t,setLanguage} from '../js/i18n.js';
import {ForestWorld} from '../js/simulation.js';
function fakeDOM(){
 const context=Object.fromEntries(['clearRect','drawImage','beginPath','moveTo','lineTo','stroke','arc','fill'].map(k=>[k,()=>{}]));
 const nodes=new Map();globalThis.document={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',hidden:false,width:640,height:480,videoWidth:640,videoHeight:480,readyState:2,getContext:()=>context,setAttribute(){},pause(){},srcObject:null});return nodes.get(selector);},querySelectorAll:()=>[],dispatchEvent(){},documentElement:{lang:'en'}};
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
test('camera metadata fixes zero element dimensions and preserves source aspect ratio',()=>{
 const draws=[],video={width:0,height:0,videoWidth:1280,videoHeight:720,readyState:2};
 const frame={width:640,height:480,getContext:()=>({drawImage:(...args)=>draws.push(args)})};
 assert.equal(copyVideoFrame(video,frame),true);
 assert.deepEqual([video.width,video.height,frame.width,frame.height],[1280,720,1280,720]);
 assert.deepEqual(draws[0],[video,0,0,1280,720]);
 video.readyState=1;assert.equal(copyVideoFrame(video,frame),false);assert.equal(draws.length,1);
 video.readyState=2;video.videoWidth=0;assert.equal(copyVideoFrame(video,frame),false);assert.equal(draws.length,1);
});
test('actual inference receives a sized canvas while the debug panel is closed',async()=>{
 const nodes=fakeDOM(),g=new GestureController({onWave(){},toast(){}});g.setDebug(false);
 const video=nodes.get('#camera');video.width=0;video.height=0;video.videoWidth=960;video.videoHeight=540;
 g.active=true;g.session=1;let input;
 g.model={detect:async frame=>{input=frame;return [];}};
 await g.detect(1);clearTimeout(g.timer);
 assert.equal(input,nodes.get('#camera-frame'));assert.equal(input.width,960);assert.equal(input.height,540);
 assert.equal(video.width,960);assert.equal(video.height,540);assert.equal(nodes.get('#debug-input').textContent,'960 × 540');
 assert.equal(nodes.get('#camera-panel').hidden,true);g.stop();delete globalThis.document;
});
test('invalid coordinates or NaN confidence cannot trigger a forest event',()=>{
 fakeDOM();let events=0;const g=new GestureController({onWave:()=>events++,toast(){}});
 const bad={confidence:NaN,keypoints:Array.from({length:21},()=>({x:NaN,y:NaN}))};
 for(let i=0;i<10;i++)g.receive([bad],10+i*.1);
 assert.equal(events,0);assert.equal(g.handCount,0);assert.equal(g.phase,'invalidPrediction');
 const low={confidence:NaN,keypoints:Array.from({length:21},()=>({x:400,y:200}))};
 for(let i=0;i<10;i++)g.receive([low],12+i*.1);
 assert.equal(events,0);assert.equal(g.phase,'lowConfidence');delete globalThis.document;
});
