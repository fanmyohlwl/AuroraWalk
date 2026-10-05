import { ForestWorld } from './simulation.js';
import { ForestRenderer } from './renderer.js';
import { SceneRecorder } from './recorder.js';
import { t, language, setLanguage } from './i18n.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),world=new ForestWorld(Math.floor(Math.random()*4294967296)),renderer=new ForestRenderer(canvas,world);
let paused=false,immersive=false,last=performance.now(),toastTimer,gestures=null,gesturePromise=null,lastDebugRefresh=0;
const recorder=new SceneRecorder(()=>canvas);
function resize(){const aspect=innerWidth/innerHeight,h=aspect<1?640:432;renderer.resize(Math.round(h*aspect),h);renderer.draw();}
resize();addEventListener('resize',resize);
function frame(now){
 const dt=Math.min((now-last)/1000,.08);last=now;
 if(!paused){const steps=Math.max(1,Math.ceil(dt/(1/60)));for(let i=0;i<steps;i++)world.update(dt/steps);}renderer.draw();
 if(recorder.active){recorder.draw();$('#record-time').textContent=`${String(Math.floor(recorder.elapsed/60)).padStart(2,'0')}:${String(Math.floor(recorder.elapsed%60)).padStart(2,'0')}`;}
 if(gestures?.debug&&now-lastDebugRefresh>100){gestures.refresh(now/1000);lastDebugRefresh=now;}
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300);}
function palette(index){world.setPalette(index);document.querySelectorAll('.swatch').forEach((el,i)=>{el.classList.toggle('active',i===world.palette);el.setAttribute('aria-pressed',String(i===world.palette));});toast(t(`palette${world.palette}`));}
function surprise(type){const result=world.triggerEvent(type);toast(t(result));return result;}
function setPaused(value){paused=Boolean(value);$('#pause-button').setAttribute('aria-pressed',String(paused));$('#pause-button').setAttribute('aria-label',t(paused?'resume':'pause'));$('#pause-button').innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';}
function setImmersive(value){immersive=Boolean(value);$('#experience').classList.toggle('immersive',immersive);$('#show-button').hidden=!immersive;}
async function getGestures(){
 if(!gesturePromise)gesturePromise=import('./gestures.js').then(({GestureController})=>{gestures=new GestureController({onWave:()=>surprise(),toast,getSceneState:()=>world.state()});return gestures;});
 return gesturePromise;
}
async function toggleGestures(){const g=await getGestures();if(g.busy||g.active)g.stop();else await g.start();}
async function toggleDebug(){const g=await getGestures();g.setDebug(!g.debug);}
function recordSupport(){const mime=SceneRecorder.mimeType();$('#record-support').textContent=mime?t('recordSupport',{format:mime.includes('mp4')?'MP4':'WebM'}):t('recordUnsupported');$('#start-recording').disabled=!mime;}
function translateState(){
 setPaused(paused);$('#gesture-label').textContent=t(gestures?.busy?'gestureCancel':gestures?.active?'gestureActive':'gestureEnable');
 $('#interaction-hint').textContent=t(paused&&matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'hint');
 $('#camera-status').textContent=t('off');$('#debug-last').textContent=t(world.event||'none');
 for(const option of $('#record-size').options){const [w,h]=option.value.split('x');option.textContent=`${w} × ${h} · ${t(Number(w)>Number(h)?'landscape':'portrait')}`;}
 recordSupport();gestures?.refresh();$('#toast').classList.remove('visible');$('#toast').textContent='';
}
document.addEventListener('languagechange',translateState);$('#language-button').onclick=()=>setLanguage(language==='en'?'zh':'en');setLanguage('en');
canvas.addEventListener('click',()=>palette(world.palette+1));canvas.addEventListener('pointermove',e=>{world.wind=(e.clientX/innerWidth-.5)*2;});canvas.addEventListener('pointerleave',()=>{world.wind=0;});
document.querySelectorAll('.swatch').forEach(el=>el.addEventListener('click',()=>palette(Number(el.dataset.palette))));
$('#pause-button').onclick=()=>setPaused(!paused);$('#surprise-button').onclick=()=>surprise();$('#hide-button').onclick=()=>setImmersive(true);$('#show-button').onclick=()=>setImmersive(false);
$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#debug-button').onclick=()=>toggleDebug().catch(error=>toast(error.message));
$('#camera-close').onclick=()=>gestures?.setDebug(false);$('#camera-stop').onclick=()=>gestures?.stop();
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
$('#fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast(t('noFullscreen'));}catch{toast(t('noFullscreen'));}};
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('dialog[open]'))return;
 const key=e.key.toLowerCase();if(key===' '&&e.target.closest('button'))return;
 if([' ','h','c','w','d'].includes(key))e.preventDefault();
 if(key===' ')setPaused(!paused);if(key==='h')setImmersive(!immersive);if(key==='c')palette(world.palette+1);if(key==='w')surprise();if(key==='d')toggleDebug().catch(error=>toast(error.message));
});
$('#record-button').onclick=()=>{if(recorder.active){toast(t('recordBusy'));return;}recordSupport();$('#record-dialog').showModal();};
$('#start-recording').onclick=async()=>{const [width,height]=$('#record-size').value.split('x').map(Number);try{await recorder.start({width,height,duration:Number($('#record-duration').value)});$('#record-dialog').close();}catch(error){toast(error.message);}};
$('#stop-recording').onclick=()=>recorder.stop();
recorder.addEventListener('start',()=>{$('#record-indicator').hidden=false;$('#record-button').classList.add('recording');});
recorder.addEventListener('complete',()=>{$('#record-indicator').hidden=true;$('#record-button').classList.remove('recording');toast(t('recordSaved'));});
recorder.addEventListener('error',e=>{$('#record-indicator').hidden=true;toast(e.detail.message);});
$('#gesture-button').onclick=()=>toggleGestures().catch(error=>toast(error.message));
addEventListener('pagehide',()=>{gestures?.stop();if(recorder.active)recorder.stop();});
window.auroraWalk=Object.freeze({
 get state(){return {...world.state(),paused,recording:recorder.active,gestures:!!gestures?.active,debug:!!gestures?.debug,language};},
 get tracking(){return {phase:gestures?.phase||'off',hands:gestures?.handCount||0,confidence:gestures?.confidence??null,fps:gestures?.fps||0,cooldown:gestures?.wave.remaining(performance.now()/1000)||0};},
 pause:()=>setPaused(true),resume:()=>setPaused(false),setPalette:palette,triggerEvent:surprise,setImmersive,setLanguage,
 setDebug:async value=>(await getGestures()).setDebug(value),
 recording:{start:options=>recorder.start(options),stop:()=>recorder.stop(),get supported(){return !!SceneRecorder.mimeType();}},
 captureFrame:({width=1920,height=1080}={})=>{const out=document.createElement('canvas');out.width=width;out.height=height;const c=out.getContext('2d');c.imageSmoothingEnabled=false;const scale=Math.max(width/canvas.width,height/canvas.height);c.drawImage(canvas,(width-canvas.width*scale)/2,(height-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);return out.toDataURL('image/png');},
 enableGestures:async()=>{const g=await getGestures();if(!g.active&&!g.busy)await g.start();},disableGestures:()=>gestures?.stop()
});
if(matchMedia('(prefers-reduced-motion: reduce)').matches){setPaused(true);$('#interaction-hint').textContent=t('reduced');}
