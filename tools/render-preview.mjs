// Render the exact animation engine without a browser, camera or UI.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {ForestWorld} from '../js/simulation.js';
import {ForestRenderer} from '../js/renderer.js';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.AURORA_NODE_MODULES?`${process.env.AURORA_NODE_MODULES}/@napi-rs/canvas`:'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
for(const [name,w,h,outW,outH]of [['desktop',768,432,1536,864],['mobile',296,640,592,1280]]){
 const world=new ForestWorld(58031),canvas=createCanvas(w,h),renderer=new ForestRenderer(canvas,world);renderer.resize(w,h);
 for(let i=0;i<240;i++)world.update(1/60);renderer.draw();
 const output=createCanvas(outW,outH),ctx=output.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,0,0,outW,outH);
 await writeFile(new URL(`../media/preview-${name}.png`,import.meta.url),output.toBuffer('image/png'));
 console.log(`Rendered current ${name} scene.`);
}
