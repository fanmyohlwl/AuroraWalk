import { WaveDetector } from './simulation.js';
const CDN='https://cdn.jsdelivr.net/npm/ml5@1.3.1/dist/ml5.min.js';
let libraryPromise;
function loadLibrary(){
 if(globalThis.ml5?.handPose)return Promise.resolve(globalThis.ml5);
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=CDN;script.async=true;script.crossOrigin='anonymous';
   const timer=setTimeout(()=>{script.remove();libraryPromise=null;reject(new Error('ml5 加载超时，请检查网络后重试。你也可以点击「森林惊喜」'));},30000);
   script.onload=()=>{clearTimeout(timer);if(globalThis.ml5?.handPose)resolve(globalThis.ml5);else{libraryPromise=null;reject(new Error('手势库未能初始化'));}};
   script.onerror=()=>{clearTimeout(timer);script.remove();libraryPromise=null;reject(new Error('ml5 加载失败，请检查网络后重试。你也可以点击「森林惊喜」'));};document.head.appendChild(script);
 });return libraryPromise;
}
const timeout=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
export class GestureController {
 constructor({onWave,toast}){
  this.onWave=onWave;this.toast=toast;this.active=false;this.busy=false;this.session=0;this.model=null;
  this.video=document.querySelector('#camera');this.panel=document.querySelector('#camera-panel');this.overlay=document.querySelector('#hand-overlay');this.status=document.querySelector('#camera-status');this.button=document.querySelector('#gesture-button');this.label=document.querySelector('#gesture-label');
  this.wave=new WaveDetector(()=>{onWave();this.status.textContent='挥手收到 · 森林醒来了一下';});
 }
 async start(){
  if(this.busy||this.active)return;
  if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){this.toast('手势需要 HTTPS 或 localhost。现在可以点击「森林惊喜」互动');return;}
  const token=++this.session;this.busy=true;this.panel.hidden=false;this.label.textContent='取消加载';this.button.setAttribute('aria-pressed','true');this.status.textContent='请允许摄像头访问';
  try{
    const cameraRequest=navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user',frameRate:{ideal:15,max:24}},audio:false});
    // A camera permission prompt can outlive cancellation: close late streams.
    cameraRequest.then(stream=>{if(token!==this.session)stream.getTracks().forEach(t=>t.stop());},()=>{});
    const stream=await timeout(cameraRequest,90000,'摄像头等待超时，请允许访问后重试');
    if(token!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
    this.stream=stream;this.video.srcObject=stream;await this.video.play();
    if(token!==this.session)return;
    this.status.textContent='正在加载 ml5 手势识别…';const ml5=await loadLibrary();if(token!==this.session)return;
    if(!this.model){
      this.modelReady=new Promise((resolve,reject)=>{
        this.model=ml5.handPose({maxHands:1,modelType:'lite',runtime:'tfjs',flipped:false},resolve);
        // Older pinned versions signal readiness through the callback; newer
        // releases also expose .ready. Never start inference before either.
        if(this.model?.then)this.model.then(resolve,reject);
        else if(this.model.ready?.then)this.model.ready.then(resolve,reject);
      });
    }
    await timeout(this.modelReady,75000,'手势模型加载超时，请检查网络后重试');if(token!==this.session)return;
    // ml5 1.3.x without p5 returns a Promise of the model instance.
    this.model=await timeout(Promise.resolve(this.model),75000,'手势模型加载超时，请检查网络后重试');if(token!==this.session)return;
    this.active=true;this.busy=false;this.label.textContent='手势已开启';this.status.textContent='把手伸进画面，左右挥一挥';this.wave.reset();this.detect(token);
  }catch(error){
    if(token!==this.session)return;
    this.model=null;this.stop();
    const errors={NotAllowedError:'摄像头未获授权。你可以点击「森林惊喜」，或允许访问后重试',NotFoundError:'未找到摄像头。你可以点击「森林惊喜」',NotReadableError:'摄像头正被占用，请关闭其他使用摄像头的应用后重试'};
    this.toast(errors[error.name]||error.message||'手势未能开启，请重试');
  }
 }
 async detect(token){
  if(!this.active||token!==this.session)return;
  const started=performance.now();
  try{
    const hands=await this.model.detect(this.video);if(token!==this.session)return;
    this.receive(hands,performance.now()/1000);
  }catch(error){if(token!==this.session)return;console.warn('ml5 HandPose inference failed:',error);this.stop();this.toast('手势识别暂时中断，请重新开启。仍可使用「森林惊喜」');return;}
  if(this.active&&token===this.session)this.timer=setTimeout(()=>this.detect(token),Math.max(0,100-(performance.now()-started)));
 }
 receive(hands,time){
  const c=this.overlay.getContext('2d');c.clearRect(0,0,320,240);
  const hand=hands.find(h=>(h.confidence??1)>.65);
  if(!hand?.keypoints?.length){this.wave.missing(time);this.status.textContent='把手伸进画面，左右挥一挥';return;}
  const width=this.video.videoWidth||640,height=this.video.videoHeight||480;
  const palm=[0,5,9,13,17].map(i=>hand.keypoints[i]).filter(Boolean);
  const x=palm.reduce((s,p)=>s+p.x,0)/palm.length/width,y=palm.reduce((s,p)=>s+p.y,0)/palm.length/height;
  this.wave.feed(x,y,time);if(time-this.wave.lastWave>1.5)this.status.textContent='已看见手掌 · 左右挥一挥';
  c.fillStyle='#b9ffe0';for(const p of hand.keypoints){c.beginPath();c.arc((1-p.x/width)*320,p.y/height*240,2,0,Math.PI*2);c.fill();}
 }
 stop(){++this.session;clearTimeout(this.timer);this.active=false;this.busy=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.panel.hidden=true;this.label.textContent='开启手势';this.button.setAttribute('aria-pressed','false');this.wave.reset();}
}
