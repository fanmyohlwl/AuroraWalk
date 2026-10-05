import { WaveDetector } from './simulation.js';
import { t } from './i18n.js';
const CDN='https://cdn.jsdelivr.net/npm/ml5@1.3.1/dist/ml5.min.js';
let libraryPromise;
function loadLibrary(){
 if(globalThis.ml5?.handPose)return Promise.resolve(globalThis.ml5);
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=CDN;script.async=true;script.crossOrigin='anonymous';
   const timer=setTimeout(()=>{script.remove();libraryPromise=null;reject(new Error('libraryTimeout'));},30000);
   script.onload=()=>{clearTimeout(timer);if(globalThis.ml5?.handPose)resolve(globalThis.ml5);else{libraryPromise=null;reject(new Error('libraryInit'));}};
   script.onerror=()=>{clearTimeout(timer);script.remove();libraryPromise=null;reject(new Error('libraryError'));};document.head.appendChild(script);
 });return libraryPromise;
}
const timeout=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
const connections=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
const confidence=h=>{const value=h.confidence??h.score??1;return Number.isFinite(value)?value:0;};
// ml5's video preprocessing uses element.width/height, not just videoWidth/Height.
// Capture an unmirrored, explicitly sized frame; mirror only its debug display.
export function copyVideoFrame(video,frame){
 const width=video.videoWidth,height=video.videoHeight;
 if(video.readyState<2||!width||!height)return false;
 video.width=width;video.height=height;
 if(frame.width!==width)frame.width=width;if(frame.height!==height)frame.height=height;
 frame.getContext('2d').drawImage(video,0,0,width,height);return true;
}
export class GestureController {
 constructor({onWave,toast,getSceneState}){
  this.onWave=onWave;this.toast=toast;this.getSceneState=getSceneState;this.active=false;this.busy=false;this.session=0;this.model=null;
  this.phase='off';this.handCount=0;this.confidence=null;this.fps=0;this.lastFrame=null;this.debug=false;this.lastError=null;this.frameReady=false;this.backend=null;
  this.video=document.querySelector('#camera');this.frame=document.querySelector('#camera-frame');this.panel=document.querySelector('#camera-panel');this.overlay=document.querySelector('#hand-overlay');this.status=document.querySelector('#camera-status');this.button=document.querySelector('#gesture-button');this.label=document.querySelector('#gesture-label');
  this.wave=new WaveDetector(reason=>{onWave();this.phase='handTrigger';this.reason=reason;});
  this.refresh();
 }
 setDebug(value){this.debug=Boolean(value);this.panel.hidden=!this.debug;document.querySelector('#debug-button').setAttribute('aria-pressed',String(this.debug));this.refresh();}
 setPhase(key){this.phase=key;this.refresh();}
 async start(){
  if(this.busy||this.active)return;
  if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){this.toast(t('secureCamera'));return;}
  const token=++this.session;this.busy=true;this.lastError=null;this.button.setAttribute('aria-pressed','true');this.setPhase('permission');
  try{
    const cameraRequest=navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user',frameRate:{ideal:24,max:30}},audio:false});
    cameraRequest.then(stream=>{if(token!==this.session)stream.getTracks().forEach(track=>track.stop());},()=>{});
    const stream=await timeout(cameraRequest,90000,'cameraTimeout');
    if(token!==this.session){stream.getTracks().forEach(track=>track.stop());return;}
    this.stream=stream;this.video.srcObject=stream;await this.video.play();this.frameReady=copyVideoFrame(this.video,this.frame);
    if(token!==this.session)return;
    this.setPhase('loading');const ml5=await loadLibrary();if(token!==this.session)return;
    if(!this.model){
      this.modelReady=new Promise((resolve,reject)=>{
        this.model=ml5.handPose({maxHands:2,modelType:'lite',runtime:'tfjs',flipped:false},resolve);
        if(this.model?.then)this.model.then(resolve,reject);
        else if(this.model.ready?.then)this.model.ready.then(resolve,reject);
      });
    }
    await timeout(this.modelReady,75000,'modelTimeout');if(token!==this.session)return;
    this.model=await timeout(Promise.resolve(this.model),75000,'modelTimeout');if(token!==this.session)return;
    this.backend=ml5.tf?.getBackend?.()||'tfjs';
    this.active=true;this.busy=false;this.lastFrame=null;this.fps=0;this.wave.reset();this.setPhase('ready');this.detect(token);
  }catch(error){
    if(token!==this.session)return;
    this.model=null;this.stop();
    const keys={NotAllowedError:'cameraDenied',NotFoundError:'cameraMissing',NotReadableError:'cameraBusy'};
    this.lastError=keys[error.name]||error.message||'gestureFailed';this.setPhase('error');this.toast(t(this.lastError));
  }
 }
 async detect(token){
  if(!this.active||token!==this.session)return;
  const started=performance.now();
  try{
    this.frameReady=copyVideoFrame(this.video,this.frame);
    if(this.frameReady){
      const hands=await this.model.detect(this.frame);if(token!==this.session)return;
      this.receive(hands,performance.now()/1000);
    }else this.setPhase('waitingFrame');
  }catch(error){if(token!==this.session)return;console.warn('ml5 HandPose inference failed:',error);this.stop();this.lastError='inferenceFailed';this.setPhase('error');this.toast(t(this.lastError));return;}
  if(this.active&&token===this.session)this.timer=setTimeout(()=>this.detect(token),Math.max(0,80-(performance.now()-started)));
 }
 receive(hands,time){
  if(this.lastFrame!==null){const instant=1/Math.max(.001,time-this.lastFrame);this.fps=this.fps?this.fps*.7+instant*.3:instant;}this.lastFrame=time;
  const c=this.overlay.getContext('2d');c.clearRect(0,0,320,240);
  const invalid=hands.some(h=>!h.keypoints?.length||h.keypoints.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)));
  hands=hands.filter(h=>h.keypoints?.length&&h.keypoints.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  this.handCount=hands.length;this.confidence=hands.length?Math.max(...hands.map(confidence)):null;
  const width=this.frame.width||640,height=this.frame.height||480;
  for(const h of hands){
    const points=h.keypoints||[];c.strokeStyle=confidence(h)>=.35?'#b9ffe0':'#ffd09e';c.fillStyle=c.strokeStyle;c.lineWidth=1.5;
    for(const chain of connections){c.beginPath();let begun=false;for(const index of chain){const p=points[index];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const x=(1-p.x/width)*320,y=p.y/height*240;if(!begun){c.moveTo(x,y);begun=true;}else c.lineTo(x,y);}c.stroke();}
    for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;c.beginPath();c.arc((1-p.x/width)*320,p.y/height*240,2.5,0,Math.PI*2);c.fill();}
  }
  const hand=hands.filter(h=>confidence(h)>=.35&&h.keypoints?.length).sort((a,b)=>confidence(b)-confidence(a))[0];
  if(!hand){this.wave.missing(time);this.phase=hands.length?'lowConfidence':invalid?'invalidPrediction':'noHand';this.refresh(time);return;}
  const palm=[0,5,9,13,17].map(i=>hand.keypoints[i]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(!palm.length){this.wave.missing(time);this.phase='noHand';this.refresh(time);return;}
  const x=palm.reduce((s,p)=>s+p.x,0)/palm.length/width,y=palm.reduce((s,p)=>s+p.y,0)/palm.length/height;
  const before=this.wave.lastWave;this.wave.feed(x,y,time);
  if(this.wave.lastWave===before)this.phase=this.wave.remaining(time)>0?'cooldown':'handSeen';
  this.refresh(time);
 }
 refresh(time=performance.now()/1000){
  this.label.textContent=t(this.busy?'gestureCancel':this.active?'gestureActive':'gestureEnable');
  this.status.textContent=this.phase==='error'&&this.lastError?t(this.lastError):t(this.phase);
  document.querySelector('#camera-placeholder').hidden=this.frameReady;document.querySelector('#camera-stop').hidden=!(this.active||this.busy);
  document.querySelector('#debug-hands').textContent=String(this.handCount);
  document.querySelector('#debug-confidence').textContent=this.confidence===null?'—':`${Number((this.confidence*100).toFixed(1))}%`;
  document.querySelector('#debug-fps').textContent=this.fps?`${this.fps.toFixed(1)} fps`:'—';
  document.querySelector('#debug-input').textContent=this.frameReady?`${this.frame.width} × ${this.frame.height}`:'—';
  document.querySelector('#debug-backend').textContent=this.backend||'—';
  document.querySelector('#debug-cooldown').textContent=`${this.wave.remaining(time).toFixed(1)} s`;
  const state=this.getSceneState?.();document.querySelector('#debug-events').textContent=String(state?.eventCount||0);document.querySelector('#debug-last').textContent=state?.lastEvent?t(state.lastEvent):t('none');
  if(this.active||this.busy)document.querySelector('#interaction-hint').textContent=this.status.textContent;
 }
 stop(){
  ++this.session;clearTimeout(this.timer);this.active=false;this.busy=false;this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;this.video.pause();this.video.srcObject=null;
  this.button.setAttribute('aria-pressed','false');this.wave.reset();this.handCount=0;this.confidence=null;this.fps=0;this.lastFrame=null;this.phase='off';this.lastError=null;this.frameReady=false;this.backend=null;
  this.frame.getContext('2d').clearRect(0,0,this.frame.width,this.frame.height);
  this.overlay.getContext('2d').clearRect(0,0,320,240);document.querySelector('#interaction-hint').textContent=t('hint');this.refresh();
 }
}
