export const PALETTES = [
  {name:'苔原绿', colors:[[91,255,162],[45,212,192],[149,125,239]], snow:[135,237,196]},
  {name:'暮光紫', colors:[[180,136,255],[103,130,245],[241,135,225]], snow:[184,166,247]},
  {name:'绯红夜', colors:[[255,114,145],[239,87,175],[255,181,144]], snow:[246,159,184]},
  {name:'冰川蓝', colors:[[95,239,249],[79,157,255],[174,174,255]], snow:[136,211,244]}
];
export function seededRandom(seed=58031){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const pathAt=d=>1.3*Math.sin(d*.012)+.55*Math.sin(d*.035+1.5);

// Every cell talks only to its two neighbors. Light enters locally, travels,
// softens, and fades. The large folds are the collective result of those rules.
export class AuroraField {
  constructor(random, count=180){
    this.random=random; this.count=count; this.time=0; this.exciteIn=0;
    this.bands=Array.from({length:3},(_,b)=>({
      y:Float32Array.from({length:count},(_,i)=>.08*Math.sin(i*.043+b*1.9)+.025*Math.sin(i*.1+b)),
      v:new Float32Array(count), energy:Float32Array.from({length:count},(_,i)=>.5+.3*Math.sin(i*.085+b)),
      next:new Float32Array(count)
    }));
  }
  excite(x=.5,amount=1){
    for(const band of this.bands) for(let i=0;i<this.count;i++) {
      const q=(i/(this.count-1)-x)/.09;
      band.energy[i]=clamp(band.energy[i]+Math.exp(-q*q)*amount,0,2.6);
      band.v[i]+=Math.exp(-q*q)*.035*amount;
    }
  }
  update(dt,wind=0){
    this.time+=dt;this.exciteIn-=dt;
    if(this.exciteIn<=0){this.excite(this.random(),.5+this.random()*.4);this.exciteIn=1.7+this.random()*3;}
    const t=this.time;
    this.bands.forEach((b,j)=>{
      for(let i=0;i<this.count;i++){
        const l=Math.max(0,i-1),r=Math.min(this.count-1,i+1);
        const lap=b.y[l]+b.y[r]-2*b.y[i];
        const force=Math.sin(i*.055-t*.34+j*2)*.010+Math.sin(i*.112+t*.23+j)*.005;
        b.v[i]+=(lap*20-b.y[i]*.15+force+wind*.001)*dt;
        b.v[i]*=Math.exp(-.72*dt);
        b.next[i]=clamp(b.energy[i]+((b.energy[l]+b.energy[r]-2*b.energy[i])*7-.09*(b.energy[i]-.35))*dt,.1,2.6);
      }
      for(let i=0;i<this.count;i++){b.y[i]=clamp(b.y[i]+b.v[i]*dt,-.19,.19);b.energy[i]=b.next[i];}
    });
  }
}

export const SPECIES=['reindeer','fox','hare','wolf','owl'];
export class ForestWorld {
  constructor(seed=58031){
    this.random=seededRandom(seed);this.seed=seed;this.time=0;this.distance=0;this.wind=0;this.speed=2.2;
    this.field=new AuroraField(this.random);this.palette=0;this.colors=PALETTES[0].colors.map(c=>[...c]);this.snowColor=[...PALETTES[0].snow];
    this.trees=[];this.animals=[];this.snow=[];this.eventCount=0;this.event=null;this.nextAnimal=8;
    this.stars=Array.from({length:180},()=>({x:this.random(),y:this.random()*.57,size:this.random()>.96?2:1,phase:this.random()*6.28}));
    for(let i=0;i<155;i++)this.trees.push(this.makeTree(9+this.random()*152));
    this.ground=Array.from({length:680},()=>({z:this.random()*150+2,x:(this.random()-.5)*72,size:.03+this.random()*.08,shade:this.random()}));
    this.ambient=Array.from({length:65},()=>({x:this.random(),y:this.random(),size:this.random()>.9?2:1,speed:.015+this.random()*.023,phase:this.random()*7}));
    this.spawnAnimal('reindeer',33,-1);this.spawnAnimal('fox',22,1);this.spawnAnimal('hare',43,-1);this.spawnAnimal('owl',58,1);
  }
  makeTree(z){const r=this.random,side=r()<.5?-1:1;return {z:this.distance+z,x:pathAt(this.distance+z)+side*(3.15+r()*26),height:4.4+r()*5.9,width:1.9+r()*2.6,variant:Math.floor(r()*10),shake:0,phase:r()*7};}
  setPalette(index){this.palette=((index%PALETTES.length)+PALETTES.length)%PALETTES.length;this.field.excite(.3+this.random()*.4,.7);return PALETTES[this.palette].name;}
  spawnAnimal(species,depth=24+this.random()*35,side=this.random()<.5?-1:1){
    const type=species||SPECIES[Math.floor(this.random()*SPECIES.length)],z=this.distance+depth;
    const sizes={reindeer:1.8,fox:.73,hare:.46,wolf:1.1,owl:.52};
    const a={type,z,x:pathAt(z)+side*(2.75+this.random()*2.6),size:sizes[type]*(.82+this.random()*.35),side,phase:this.random()*7,vx:side*-.05,life:0,flock:this.random()};
    if(type==='owl'){
      const tree=this.trees.filter(t=>t.z-this.distance>15&&t.z-this.distance<70&&Math.abs(t.x-pathAt(t.z))<11).sort((a,b)=>Math.abs(a.z-z)-Math.abs(b.z-z))[0];
      if(tree){a.x=tree.x+side*tree.width*.26;a.z=tree.z;a.perch=tree.height*.47;}
      else a.perch=1.7+this.random()*2.5;
    }
    this.animals.push(a);if(this.animals.length>16)this.animals.shift();return a;
  }
  triggerEvent(type){
    type=type||(this.random()<.5?'snow':'animal');this.eventCount++;this.event=type;
    this.field.excite(.25+this.random()*.5,.5);
    if(type==='animal'){
      const species=SPECIES[Math.floor(this.random()*SPECIES.length)],side=this.random()<.5?-1:1;
      this.spawnAnimal(species,18+this.random()*10,side);
      if(species==='reindeer'||species==='hare')this.spawnAnimal(species,28+this.random()*5,side);
    }else{
      const trees=this.trees.filter(t=>t.z-this.distance>8&&t.z-this.distance<55).sort((a,b)=>a.z-b.z).slice(0,15);
      for(const t of trees){t.shake=1;for(let i=0;i<20;i++)this.snow.push({x:t.x+(this.random()-.5)*t.width,z:t.z+(this.random()-.5)*1.4,y:t.height*(.3+this.random()*.65),vx:(this.random()-.5)*.4,vy:.05+this.random()*.3,phase:this.random()*6,age:0});}
      if(this.snow.length>900)this.snow=this.snow.slice(-900);
    }
    return type;
  }
  update(dt){
    this.time+=dt;this.distance+=this.speed*dt;this.field.update(dt,this.wind);
    const mix=1-Math.exp(-dt*1.4),p=PALETTES[this.palette];
    this.colors.forEach((c,i)=>c.forEach((v,j)=>c[j]+=(p.colors[i][j]-v)*mix));this.snowColor.forEach((v,j)=>this.snowColor[j]+=(p.snow[j]-v)*mix);
    for(const t of this.trees){if(t.z-this.distance<2)Object.assign(t,this.makeTree(145+this.random()*18));t.shake=Math.max(0,t.shake-dt*.55);}
    for(const s of this.ground){if(s.z-this.distance<1.8){s.z+=150;s.x=pathAt(s.z)+(this.random()-.5)*72;}}
    // Nearby animals gently align their heading and leave a little space.
    const velocities=this.animals.map(a=>{
      if(a.type==='owl')return 0;
      let align=0,separate=0,count=0;
      for(const b of this.animals){if(a===b||a.type!==b.type)continue;const dx=a.x-b.x,dz=a.z-b.z,dist=Math.hypot(dx,dz);if(dist<8){align+=b.vx;count++;if(dist<2.2)separate+=dx/(dist*dist+.4);}}
      let v=a.vx;if(count)v+=(align/count-v)*dt*.8;v+=separate*dt*.13;
      const edge=pathAt(a.z),off=a.x-edge;
      if(Math.abs(off)<2.6)v+=Math.sign(off||a.side)*dt*.14;
      if(Math.abs(off)>6.3)v-=Math.sign(off)*dt*.12;
      return clamp(v,-.28,.28);
    });
    this.animals.forEach((a,i)=>{a.vx=velocities[i];a.x+=a.vx*dt;a.life+=dt;});
    this.animals=this.animals.filter(a=>a.z-this.distance>3);
    this.nextAnimal-=dt;if(this.nextAnimal<=0){this.spawnAnimal();this.nextAnimal=7+this.random()*9;}
    for(const s of this.snow){s.age+=dt;s.vy+=dt*.6;s.y-=s.vy*dt;s.x+=(s.vx+this.wind*.18+Math.sin(this.time*1.5+s.phase)*.12)*dt;}
    this.snow=this.snow.filter(s=>s.y>0&&s.age<12&&s.z-this.distance>2);
    for(const s of this.ambient){s.y=(s.y+s.speed*dt)%1;s.x=(s.x+(this.wind*.006+.003*Math.sin(this.time*.4+s.phase))*dt+1)%1;}
  }
  state(){return {seed:this.seed,time:this.time,distance:this.distance,palette:this.palette,animals:this.animals.length,snowParticles:this.snow.length,eventCount:this.eventCount,lastEvent:this.event};}
}

// A wave is a left-right-left (or right-left-right) motion, not merely a hand
// appearing. Distances are normalized, so it behaves across camera sizes.
export class WaveDetector {
  constructor(onWave){this.onWave=onWave;this.reset();this.lastWave=-Infinity;}
  reset(){this.samples=[];this.direction=0;this.turns=0;this.extreme=null;this.lastSeen=-Infinity;this.began=null;}
  feed(x,y,time){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(time-this.lastSeen>.45||(this.began!==null&&time-this.began>1.5))this.reset();this.lastSeen=time;
    this.samples.push({x,y,time});this.samples=this.samples.filter(s=>time-s.time<1.5);
    if(this.extreme===null)this.extreme=x;
    const n=this.samples.length;if(n<2)return;
    const dx=x-this.extreme;
    if(this.direction===0&&Math.abs(dx)>.09){this.direction=Math.sign(dx);this.extreme=x;this.turns=0;this.began=time;}
    else if(this.direction!==0){
      if((x-this.extreme)*this.direction>0)this.extreme=x;
      else if(Math.abs(dx)>.11){this.direction*=-1;this.extreme=x;this.turns++;}
    }
    const xs=this.samples.map(s=>s.x),ys=this.samples.map(s=>s.y);
    if(this.turns>=2&&Math.max(...xs)-Math.min(...xs)>.19&&Math.max(...ys)-Math.min(...ys)<.3&&time-this.lastWave>3.5){this.lastWave=time;this.reset();this.onWave();}
  }
  missing(time){if(time-this.lastSeen>.45)this.reset();}
}
