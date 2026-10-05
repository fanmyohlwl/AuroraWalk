import { clamp, pathAt } from './simulation.js';
const rgba=(c,a)=>`rgba(${c.map(Math.round).join(',')},${a})`;
const poly=(ctx,points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();};
const sprites={
 reindeer:[
 '...a.........a............',
 '...aa.......aa............',
 '.a..a...a...a..a..........',
 '.aaaa...aa.aaaaa..........',
 '....aa...aaa..............',
 '.....a...a................',
 '......aaaa................',
 '.......aaa................',
 '.......cccc...............',
 '......cccecc..............',
 '.......cccccc.............',
 '.......ccbccc.............',
 '.......cbbcc..............',
 '......cbbbcc..............',
 '.....ccbbccc..............',
 '..ccccccbccccc............',
 '.cccccccccccccccc.........',
 'cccccbbccccccccccc........',
 'ccbbbbbbbbcccccccccc......',
 'ccbbbbbbbbbbccccccc.......',
 '.cbbbbbbbbbbcccccc........',
 '..ccccccccccccccc.........',
 '...cc.cc.....cc.cc........',
 '...cc.cc.....cc.cc........',
 '...cc..cc....cc..cc.......',
 '...dd..dd....dd..dd.......'],
 fox:[
 '.............a...a....',
 '.............aa.aa....',
 '.............ababa....',
 '............aaaeaa...',
 '............aaaaabdd.',
 '..aaaa....aaaaaaaa...',
 '.aaaaaa..aaaaaaabb...',
 'aaaaaaaabaaaaaabb....',
 'bbbbbaaaaaaaaabb.....',
 '.bbb..aaaaaaabb......',
 '......aaaaaaab.......',
 '.......aa..aa........',
 '.......dd..dd........'],
 hare:[
 '....bb...bb...',
 '....ba...ba...',
 '....ba...ba...',
 '....bb..bb....',
 '....bbbbbb....',
 '....bbebbb....',
 '....bbbbbb....',
 '.....bbbb.....',
 '..bbbbbbbbb...',
 '.bbbbbbbbbbb..',
 '.bbabbbbbbbb..',
 'bbbbbbbbbbbb..',
 '..bbbbbbbbbb..',
 '...cc....ccc..'],
 wolf:[
 '................a..a...',
 '...............aaaaa...',
 '...............aaaea...',
 '..............aaaaaabb.',
 '..aaaa......aaaaaabb...',
 '.aaaaaa..aaaaaaaabb....',
 'aaaaaaabaaaaaaaabb.....',
 '.aaaaaaaaaaaaaabb......',
 '..aaaaaaaaaaabb........',
 '....aaaaaaaaaa.........',
 '.....aa..aa..aa........',
 '.....aa..aa..aa........',
 '.....dd..dd..dd........'],
 owl:[
 '..a.........a..',
 '..aa.......aa..',
 '..aaaaaaaaaaa..',
 '..abbbbabbbba..',
 '..abebbabebba..',
 '..abbbbabbbba..',
 '...aaaacaaaa...',
 '..aaaaaaaaaaa..',
 '.aaabbbbbbaaaa.',
 '.aaabbabbbbaaa.',
 '.aaabbbbbbaaaa.',
 '..aaabbabaaaa..',
 '..aaaabaaaaaa..',
 '...aaaaaaaaa...',
 '....cc..cc.....']
};
const animalPalettes={reindeer:{a:'#c5ad8d',b:'#c3b396',c:'#89735e',d:'#3b3741',e:'#151f29'},fox:{a:'#cd7548',b:'#eddbc2',d:'#3c3942',e:'#17222b'},hare:{a:'#aab8c8',b:'#e2eaf2',c:'#99b0c3',e:'#1c293a'},wolf:{a:'#7d8b9e',b:'#bbc7d3',d:'#334256',e:'#e6d19b'},owl:{a:'#91a3b3',b:'#d7dee2',c:'#bc9361',e:'#232d3e'}};
function makeAnimal(type){const rows=sprites[type],canvas=document.createElement('canvas');canvas.width=Math.max(...rows.map(r=>r.length));canvas.height=rows.length;const c=canvas.getContext('2d');rows.forEach((r,y)=>[...r].forEach((p,x)=>{if(p!=='.'){c.fillStyle=animalPalettes[type][p]||'#fff';c.fillRect(x,y,1,1);}}));return canvas;}
function makeTree(variant){
 const canvas=document.createElement('canvas');canvas.width=48;canvas.height=96;const c=canvas.getContext('2d');
 c.fillStyle='#334856';c.fillRect(22,50,4,44);c.fillStyle='#536370';c.fillRect(25,69,2,23);
 const shades=['#132c36','#193541','#1e3f4a','#234653','#2a505c'];
 for(let tier=0;tier<7;tier++){
   const top=4+tier*10,wide=4+tier*2.9,bot=top+20;
   const left=24-wide,right=24+wide;
   poly(c,[[24,top],[right-3,bot-8],[right-3,bot-6],[right,bot-2],[right-1,bot],[27,bot-3],[24,bot],[21,bot-3],[left+1,bot],[left,bot-2],[left+3,bot-6],[left+3,bot-8]],shades[(tier+variant)%5]);
   // Snow shelves catch the colored light. Their irregular edges remain pixels.
   poly(c,[[24,top],[right-4,bot-10],[right-4,bot-8],[right-1,bot-5],[right-4,bot-3],[26,bot-9],[24,bot-6],[21,bot-9],[left+3,bot-3],[left+1,bot-5],[left+4,bot-8],[left+4,bot-10]],tier%2?'#aac7d4':'#c3dce3');
   c.fillStyle='#759dad';c.fillRect(Math.round(left+4),bot-6,Math.round(wide*.65),2);
   c.fillStyle='#e0ecea';c.fillRect(23,top,2,3);
 }
 return canvas;
}
export class ForestRenderer {
 constructor(canvas,world){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.world=world;this.trees=Array.from({length:10},(_,i)=>makeTree(i));this.animals=Object.fromEntries(Object.keys(sprites).map(k=>[k,makeAnimal(k)]));this.resize(768,432);}
 resize(w,h){this.canvas.width=Math.round(w);this.canvas.height=Math.round(h);this.w=this.canvas.width;this.h=this.canvas.height;this.ctx.imageSmoothingEnabled=false;this.world.viewAspect=this.w/this.h;}
 project(x,z,y=0){const depth=z-this.world.distance,s=this.h*.65/Math.max(1,depth),camera=pathAt(this.world.distance);return {x:this.w*.5+(x-camera)*s,y:this.h*.596+(2.4-y)*s,s,depth};}
 draw(){const c=this.ctx,w=this.w,h=this.h,world=this.world,t=world.time;
   const sky=c.createLinearGradient(0,0,0,h*.64);sky.addColorStop(0,'#030b1c');sky.addColorStop(.4,'#092239');sky.addColorStop(1,'#243e58');c.fillStyle=sky;c.fillRect(0,0,w,h);
   this.drawStars();this.drawAurora();
   // The moon is a small stepped pixel cluster, never a bright UI-like disc.
   c.fillStyle='#b5cedc';c.fillRect(Math.round(w*.88),Math.round(h*.13),6,8);c.fillRect(Math.round(w*.88)-2,Math.round(h*.13)+2,10,4);c.fillStyle='#17324b';c.fillRect(Math.round(w*.88)+4,Math.round(h*.13),3,5);
   this.drawHorizon();this.drawGround();
   const objects=[...world.trees.map(o=>({o,kind:'tree'})),...world.animals.map(o=>({o,kind:'animal'}))].sort((a,b)=>b.o.z-a.o.z);
   for(const {o,kind} of objects)kind==='tree'?this.drawTree(o):this.drawAnimal(o);
   this.drawSnow();
   // Ambient snow is sparse enough to leave the sky legible.
   for(const s of world.ambient){c.fillStyle=s.size===2?'#c1dce7a8':'#c1dce74a';c.fillRect(Math.floor(s.x*w),Math.floor(s.y*h),s.size,s.size);}
 }
 drawStars(){const c=this.ctx,w=this.w,h=this.h,t=this.world.time;for(const s of this.world.stars){c.fillStyle=`rgba(185,215,232,${.25+.35*(.5+.5*Math.sin(t*.5+s.phase))})`;c.fillRect(Math.floor(s.x*w),Math.floor(s.y*h),s.size,s.size);if(s.size===2){c.fillStyle='#b2d6e32f';c.fillRect(Math.floor(s.x*w)-2,Math.floor(s.y*h),6,1);}}}
 drawAurora(){
   const c=this.ctx,w=this.w,h=this.h,t=this.world.time,field=this.world.field;
   // A limited set of stepped shades, like the snow on each fir branch.
   // All geometry lands on a 3-pixel grid; no smooth gradient or fine ray mesh.
   const grid=3,shade=[.035,.07,.12,.19,.29,.43,.61,.79,1];
   c.save();c.globalCompositeOperation='screen';
   for(let j=2;j>=0;j--){
     const band=field.bands[j],color=this.world.colors[j],columns=Math.ceil(w/(grid*2));
     for(let col=0;col<columns;col++){
       const u=col/columns,i=Math.min(field.count-1,Math.floor(u*(field.count-1)));
       const sweeping=Math.sin(u*5.7+t*.085+j*1.65)*.057+Math.sin(u*15-t*.16+j)*.014;
       const base=Math.round((.365-j*.075+band.y[i]+sweeping)*h/grid)*grid;
       const energy=band.energy[i],fold=.62+.38*Math.pow(.5+.5*Math.sin(u*35+t*.24+j*3),2);
       const height=Math.round((.12+energy*.045+fold*.06+j*.01)*h/grid)*grid;
       const strength=Math.min(.63,(.33+energy*.22)*fold*(j===0?1:.78));
       const x=col*grid*2,top=base-height;
       for(let y=top;y<base;y+=grid){
         const progress=(y-top)/height,level=Math.min(8,Math.floor(progress*9));
         // Fixed pixel stippling softens the top without flickering noise.
         if(level<2&&(col+Math.floor(y/grid)+j)%3===0)continue;
         const texture=((col*7+Math.floor(y/grid)*3+j)%11===0)?.81:1;
         c.fillStyle=rgba(color,shade[level]*strength*texture);
         c.fillRect(x,y,grid*2,grid);
       }
       c.fillStyle=rgba(color,strength*.56);c.fillRect(x,base,grid*2,grid);
     }
   }
   c.restore();
 }
 drawHorizon(){const c=this.ctx,w=this.w,h=this.h;
   const mountain=[];for(let x=0;x<=w+8;x+=8)mountain.push([x,h*(.573+.016*Math.sin(x*.036)+.009*Math.sin(x*.092))]);poly(c,[[0,h*.64],...mountain,[w,h*.64]],'#29475c');
   for(let layer=0;layer<3;layer++)for(let x=-10;x<w+12;x+=6+layer*3){const top=h*.59-7-layer*3-((Math.sin(x*2.81+layer*8)+1)*8);const width=5+layer*2;poly(c,[[x,top],[x+width,h*.61],[x-width,h*.61]],['#25414f','#1e3947','#19313e'][layer]);}
 }
 drawGround(){
   const c=this.ctx,w=this.w,h=this.h,world=this.world;
   const g=c.createLinearGradient(0,h*.59,0,h);g.addColorStop(0,'#7b9aaf');g.addColorStop(.35,'#b1ccd9');g.addColorStop(1,'#c5dce4');c.fillStyle=g;c.fillRect(0,Math.floor(h*.601),w,h);
   // Continuous snow cover. Depth comes from drifts, footprints and trees,
   // with no colored road surface or hard borders through the clearing.
   c.save();c.globalCompositeOperation='soft-light';c.fillStyle=rgba(world.snowColor,.22);c.fillRect(0,h*.61,w,h*.39);c.restore();
   for(const s of world.ground){const p=this.project(s.x,s.z);if(p.depth<2||p.x<0||p.x>w||p.y>h)continue;const size=clamp(s.size*p.s,1,5);c.fillStyle=s.shade>.55?'#e1edf16e':'#7898b363';c.fillRect(Math.round(p.x),Math.round(p.y),Math.round(size*2.5),Math.max(1,Math.round(size*.4)));}
   for(let z=Math.ceil((world.distance+3)/1.8)*1.8;z<world.distance+70;z+=1.8){for(let side=-1;side<=1;side+=2){const p=this.project(pathAt(z)+side*.23,z+side*.35);if(p.y>h||p.depth<2.8)continue;c.fillStyle='#6c8da62b';c.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.round(p.s*.11)),Math.max(1,Math.round(p.s*.2)));}}
 }
 drawTree(tree){
   const c=this.ctx,p=this.project(tree.x,tree.z);if(p.depth<2)return;
   const hh=Math.round(tree.height*p.s),ww=Math.round(tree.width*p.s*1.25),x=Math.round(p.x-ww*.5),y=Math.round(p.y-hh);
   if(x>this.w+ww||x+ww<0)return;
   c.fillStyle='#446c8b25';poly(c,[[p.x-ww*.4,p.y],[p.x+ww*.4,p.y],[p.x+ww*.8,p.y+hh*.09],[p.x-ww*.3,p.y+hh*.08]],'#446c8b35');
   const wobble=Math.round(Math.sin(this.world.time*11+tree.phase)*tree.shake*ww*.015);
   c.save();c.globalAlpha=clamp(1-(p.depth-25)/230,.6,1);c.drawImage(this.trees[tree.variant],x+wobble,y,ww,hh);c.restore();
   c.fillStyle='#d9e8eb';c.fillRect(Math.round(p.x-ww*.14),Math.round(p.y-1),Math.max(2,Math.round(ww*.28)),2);
 }
 drawAnimal(animal){const c=this.ctx,p=this.project(animal.x,animal.z,animal.type==='owl'?animal.perch:0);if(p.depth<3)return;const sprite=this.animals[animal.type],hh=Math.max(3,Math.round(animal.size*p.s)),ww=Math.round(hh*sprite.width/sprite.height);if(p.x<-ww||p.x>this.w+ww)return;const bounce=animal.type==='hare'?Math.max(0,Math.sin(this.world.time*2.5+animal.phase))*p.s*.1:Math.sin(this.world.time*1.6+animal.phase)*.35;
   if(animal.type!=='owl'){const floor=this.project(animal.x,animal.z);c.fillStyle='#395c7d42';c.fillRect(Math.round(floor.x-ww*.4),Math.round(floor.y),ww,Math.max(1,Math.round(p.s*.09)));}else{c.fillStyle='#536b7a';c.fillRect(Math.round(p.x-ww*.6),Math.round(p.y),Math.round(ww*1.3),2);}
   c.save();c.translate(Math.round(p.x),Math.round(p.y-bounce));if(animal.side<0)c.scale(-1,1);c.drawImage(sprite,-Math.round(ww*.5),-hh,ww,hh);c.restore();
 }
 drawSnow(){const c=this.ctx;for(const s of this.world.snow){const p=this.project(s.x,s.z,s.y);if(p.depth<2||p.x<0||p.x>this.w||p.y<0||p.y>this.h)continue;const size=clamp(p.s*.045,1,3);c.fillStyle=s.age<2?'#e3f7fa':'#cfe6edbd';c.fillRect(Math.round(p.x),Math.round(p.y),Math.round(size),Math.round(size));}}
}
