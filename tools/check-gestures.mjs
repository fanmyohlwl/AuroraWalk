import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.AURORA_NODE_MODULES?`${process.env.AURORA_NODE_MODULES}/playwright`:'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.AURORA_CHROME_PATH||undefined,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try {
const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>console.log('PAGE ERROR',e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.type(),m.text());});
await page.goto('http://127.0.0.1:8091');await page.waitForFunction(()=>window.auroraWalk);
for(const b of await page.locator('.controls button').all()){const box=await b.boundingBox();assert(box.x>=0&&box.x+box.width<=390);}console.log('All mobile controls are visible and fit.');
await page.locator('#gesture-button').click();
await page.waitForFunction(()=>document.querySelector('#gesture-label').textContent!=='Enable hand');
console.log('Waiting for real ml5 model with a synthetic camera stream');
await page.waitForFunction(()=>window.auroraWalk.state.gestures||document.querySelector('#gesture-label').textContent==='Enable hand',{},{timeout:115000});
console.log('Real model status',await page.locator('#camera-status').textContent(),await page.locator('#toast').textContent(),await page.evaluate(()=>window.auroraWalk.state));
if(await page.evaluate(()=>window.auroraWalk.state.gestures)){
 await page.waitForTimeout(2200);assert.equal(await page.evaluate(()=>window.auroraWalk.state.gestures),true);console.log('Real model live inference works with synthetic video, no real hand validation.');
 await page.locator('#camera-stop').click();assert.equal(await page.evaluate(()=>document.querySelector('#camera').srcObject),null);
}else console.log('REAL MODEL COULD NOT LOAD IN THIS TEST ENVIRONMENT');
await page.close();
const mock=await browser.newPage();
await mock.route('**/ml5@1.3.1/dist/ml5.min.js',route=>route.fulfill({contentType:'application/javascript',body:`window.ml5={handPose:()=>{let n=0;const xs=[.3,.4,.52,.65,.55,.42,.3,.42,.55,.66];return {ready:Promise.resolve(),detect:async()=>{const x=xs[Math.min(n++,xs.length-1)]*640;return [{confidence:1,keypoints:Array.from({length:21},()=>({x,y:210}))}]}}}};`}));
await mock.goto('http://127.0.0.1:8091');await mock.locator('#gesture-button').click();await mock.waitForFunction(()=>window.auroraWalk.state.eventCount>0);assert.equal(await mock.evaluate(()=>window.auroraWalk.state.eventCount),1);await mock.waitForTimeout(600);assert.equal(await mock.evaluate(()=>window.auroraWalk.state.eventCount),1);await mock.locator('#camera-stop').click();assert.equal(await mock.evaluate(()=>window.auroraWalk.state.gestures),false);assert.equal(await mock.evaluate(()=>document.querySelector('#camera').srcObject),null);console.log('Synthetic hand wave triggers one event; close releases camera.');
await mock.close();
const fail=await browser.newPage();await fail.route('**/ml5@1.3.1/dist/ml5.min.js',route=>route.abort());await fail.goto('http://127.0.0.1:8091');await fail.locator('#gesture-button').click();await fail.waitForFunction(()=>document.querySelector('#toast').textContent.includes('failed to load'));assert.equal(await fail.evaluate(()=>document.querySelector('#camera').srcObject),null);assert.equal(await fail.evaluate(()=>window.auroraWalk.state.gestures),false);console.log('Model network failure releases camera and leaves fallback usable.');
await fail.close();
}finally{await browser.close();}
