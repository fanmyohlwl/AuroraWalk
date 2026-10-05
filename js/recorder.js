export class SceneRecorder extends EventTarget {
  constructor(getCanvas){super();this.getCanvas=getCanvas;this.active=false;this.result=null;this.elapsed=0;}
  static mimeType(){if(!globalThis.MediaRecorder)return null;return ['video/mp4;codecs=avc1.42001f','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||null;}
  async start({width=1920,height=1080,fps=30,duration=15,download=true}={}){
    if(this.active)throw new Error('已有录制正在进行');
    const mimeType=SceneRecorder.mimeType();if(!mimeType||!HTMLCanvasElement.prototype.captureStream)throw new Error('当前浏览器不支持画面录制，请使用新版 Chrome、Edge 或 Safari');
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<320||width>3840||height>3840||width*height>8294400)throw new Error('录制尺寸应在 320–3840 像素之间，总像素不超过 4K');
    if(!Number.isFinite(fps)||fps<1||fps>60||!Number.isFinite(duration)||duration<0||duration>180)throw new Error('帧率为 1–60 fps，时长为 0–180 秒');
    this.output=document.createElement('canvas');this.output.width=width;this.output.height=height;this.ctx=this.output.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;
    this.chunks=[];this.download=download;this.duration=duration||180;this.elapsed=0;this.result=null;
    this.draw();this.stream=this.output.captureStream(fps);this.recorder=new MediaRecorder(this.stream,{mimeType,videoBitsPerSecond:8000000});
    this.finished=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
    // Attach a handler immediately; programmatic callers can still await stop().
    this.finished.catch(()=>{});
    this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};
    this.recorder.onerror=e=>{this.finishError(e.error||new Error('视频编码失败'));};
    this.recorder.onstop=()=>{
      if(this.failed)return;this.cleanup();
      const blob=new Blob(this.chunks,{type:this.recorder.mimeType}),extension=this.recorder.mimeType.includes('mp4')?'mp4':'webm';
      this.result={blob,extension,width,height,fps,duration:this.elapsed};
      if(this.download){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aurora-walk-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      this.resolve(this.result);this.dispatchEvent(new CustomEvent('complete',{detail:this.result}));
    };
    this.failed=false;this.active=true;this.started=performance.now();this.recorder.start(250);
    this.timer=setTimeout(()=>this.stop(),this.duration*1000);
    this.dispatchEvent(new Event('start'));return {mimeType,width,height,fps,duration:this.duration};
  }
  draw(){if(!this.ctx)return;const source=this.getCanvas(),w=this.output.width,h=this.output.height;
    // Preserve geometry: alternate aspect ratios crop centrally, never stretch.
    const ratio=w/h,sr=source.width/source.height;let sx=0,sy=0,sw=source.width,sh=source.height;
    if(sr>ratio){sw=sh*ratio;sx=(source.width-sw)/2;}else{sh=sw/ratio;sy=(source.height-sh)/2;}
    this.ctx.drawImage(source,sx,sy,sw,sh,0,0,w,h);
    if(this.active)this.elapsed=(performance.now()-this.started)/1000;
  }
  stop(){if(this.active&&this.recorder.state!=='inactive'){clearTimeout(this.timer);this.recorder.stop();}return this.finished||Promise.resolve(this.result);}
  cleanup(){this.active=false;clearTimeout(this.timer);this.stream?.getTracks().forEach(t=>t.stop());}
  finishError(error){this.failed=true;this.cleanup();if(this.recorder?.state!=='inactive')this.recorder.stop();this.reject(error);this.dispatchEvent(new CustomEvent('error',{detail:error}));}
}
