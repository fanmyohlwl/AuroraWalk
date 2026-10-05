import { ForestWorld, PALETTES } from './simulation.js';
import { ForestRenderer } from './renderer.js';
import { SceneRecorder } from './recorder.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),world=new ForestWorld(Math.floor(Math.random()*4294967296)),renderer=new ForestRenderer(canvas,world);
let paused=false,immersive=false,last=performance.now(),toastTimer,gestures=null;
const recorder=new SceneRecorder(()=>canvas);
function resize(){const aspect=innerWidth/innerHeight;const h=aspect<1?640:432;renderer.resize(Math.round(h*aspect),h);renderer.draw();}
resize();addEventListener('resize',resize);
function frame(now){const dt=Math.min((now-last)/1000,.08);last=now;if(!paused){const steps=Math.max(1,Math.ceil(dt/(1/60)));for(let i=0;i<steps;i++)world.update(dt/steps);}renderer.draw();if(recorder.active){recorder.draw();$('#record-time').textContent=`${String(Math.floor(recorder.elapsed/60)).padStart(2,'0')}:${String(Math.floor(recorder.elapsed%60)).padStart(2,'0')}`;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300);}
function palette(index){const name=world.setPalette(index);document.querySelectorAll('.swatch').forEach((el,i)=>{el.classList.toggle('active',i===world.palette);el.setAttribute('aria-pressed',String(i===world.palette));});toast(name);}
function surprise(type){const result=world.triggerEvent(type);toast(result==='snow'?'树梢落下一场小雪':'森林里来了一位新朋友');return result;}
function setPaused(value){paused=Boolean(value);$('#pause-button').setAttribute('aria-pressed',String(paused));$('#pause-button').setAttribute('aria-label',paused?'继续漫步':'暂停漫步');$('#pause-button').innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';}
function setImmersive(value){immersive=Boolean(value);$('#experience').classList.toggle('immersive',immersive);$('#show-button').hidden=!immersive;}
canvas.addEventListener('click',()=>palette(world.palette+1));canvas.addEventListener('pointermove',e=>{world.wind=(e.clientX/innerWidth-.5)*2;});canvas.addEventListener('pointerleave',()=>{world.wind=0;});
document.querySelectorAll('.swatch').forEach(el=>el.addEventListener('click',()=>palette(Number(el.dataset.palette))));
$('#pause-button').onclick=()=>setPaused(!paused);$('#surprise-button').onclick=()=>surprise();$('#hide-button').onclick=()=>setImmersive(true);$('#show-button').onclick=()=>setImmersive(false);
$('#help-button').onclick=()=>$('#help-dialog').showModal();
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
$('#fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('当前浏览器不支持全屏，可使用沉浸模式');}catch{toast('全屏未能开启，可使用沉浸模式');}};
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('dialog[open]'))return;const key=e.key.toLowerCase();if(key===' '&&e.target.closest('button'))return;if([' ','h','c','w'].includes(key))e.preventDefault();if(key===' ')setPaused(!paused);if(key==='h')setImmersive(!immersive);if(key==='c')palette(world.palette+1);if(key==='w')surprise();});
$('#record-button').onclick=()=>{if(recorder.active){toast('录制正在进行，点击顶部「结束录制」即可保存');return;}$('#record-support').textContent=SceneRecorder.mimeType()?`30 fps · ${SceneRecorder.mimeType().includes('mp4')?'MP4':'WebM'} · 录完自动下载`:'当前浏览器不支持录制，请使用新版 Chrome、Edge 或 Safari';$('#start-recording').disabled=!SceneRecorder.mimeType();$('#record-dialog').showModal();};
$('#start-recording').onclick=async()=>{const [width,height]=$('#record-size').value.split('x').map(Number);try{await recorder.start({width,height,duration:Number($('#record-duration').value)});$('#record-dialog').close();}catch(e){toast(e.message);}};
$('#stop-recording').onclick=()=>recorder.stop();
recorder.addEventListener('start',()=>{$('#record-indicator').hidden=false;$('#record-button').classList.add('recording');});recorder.addEventListener('complete',()=>{$('#record-indicator').hidden=true;$('#record-button').classList.remove('recording');toast('这段极光已经保存');});recorder.addEventListener('error',e=>{$('#record-indicator').hidden=true;toast(e.detail.message);});
async function toggleGestures(){
 if(gestures?.busy){gestures.stop();return;}
 if(gestures?.active){gestures.stop();return;}
 if(!gestures){const {GestureController}=await import('./gestures.js');gestures=new GestureController({onWave:()=>surprise(),toast});}
 await gestures.start();
}
$('#gesture-button').onclick=()=>toggleGestures().catch(e=>toast(e.message));$('#camera-close').onclick=()=>gestures?.stop();
addEventListener('pagehide',()=>{gestures?.stop();if(recorder.active)recorder.stop();});
window.auroraWalk=Object.freeze({
 get state(){return {...world.state(),paused,recording:recorder.active,gestures:!!gestures?.active};},
 pause:()=>setPaused(true),resume:()=>setPaused(false),setPalette:palette,triggerEvent:surprise,setImmersive,
 recording:{start:options=>recorder.start(options),stop:()=>recorder.stop(),get supported(){return !!SceneRecorder.mimeType();}},
 captureFrame:({width=1920,height=1080}={})=>{const out=document.createElement('canvas');out.width=width;out.height=height;const c=out.getContext('2d');c.imageSmoothingEnabled=false;const scale=Math.max(width/canvas.width,height/canvas.height);c.drawImage(canvas,(width-canvas.width*scale)/2,(height-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);return out.toDataURL('image/png');},
 enableGestures:async()=>{if(!gestures?.active)await toggleGestures();},disableGestures:()=>gestures?.stop()
});
if(matchMedia('(prefers-reduced-motion: reduce)').matches){setPaused(true);$('#interaction-hint').textContent='已暂停动画 · 点击播放开始漫步';}
