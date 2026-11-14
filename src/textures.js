import * as THREE from 'three';
import {rand,TAU} from './util.js';

export function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function tex(c,srgb=true){const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
export const softTex=(()=>{const c=cv(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return tex(c);})();

export function groundCanvas(){
  const s=1024,c=cv(s,s),g=c.getContext('2d'),cx=s/2;g.fillStyle='#121110';g.fillRect(0,0,s,s);
  let r=58;while(r<s*.72){const w=rand(34,46),n=Math.max(6,Math.round(TAU*(r+w/2)/rand(58,88))),off=rand(TAU);
    for(let i=0;i<n;i++){const a0=off+i/n*TAU,a1=off+(i+1)/n*TAU,pad=2.2/(r+w/2);
      g.fillStyle=`hsl(${rand(24,40)},${rand(5,11)}%,${rand(19,33)}%)`;
      g.beginPath();g.arc(cx,cx,r+w-2,a0+pad,a1-pad);g.arc(cx,cx,r+2,a1-pad,a0+pad,true);g.closePath();g.fill();}
    r+=w;}
  g.fillStyle='#2b2620';g.beginPath();g.arc(cx,cx,56,0,TAU);g.fill();
  g.strokeStyle='#6b5327';g.lineWidth=3;g.beginPath();g.arc(cx,cx,50,0,TAU);g.stroke();
  g.fillStyle='#57431f';g.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU,rr=i%2?15:44;g.lineTo(cx+Math.cos(a)*rr,cx+Math.sin(a)*rr);}g.closePath();g.fill();
  for(let i=0;i<16000;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.09)':'rgba(255,240,220,.035)';g.fillRect(rand(s),rand(s),rand(1,3),rand(1,3));}
  for(let i=0;i<22;i++){const x=rand(s),y=rand(s),rr=rand(25,90),gr=g.createRadialGradient(x,y,0,x,y,rr);
    gr.addColorStop(0,i%4?'rgba(6,4,3,.4)':'rgba(70,8,4,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-rr,y-rr,rr*2,rr*2);}
  return c;
}
export function brickCanvas(){
  const s=512,c=cv(s,s),g=c.getContext('2d');g.fillStyle='#0c0b0b';g.fillRect(0,0,s,s);
  const rows=8,h=s/rows;for(let y=0;y<rows;y++){let x=-(y%2)*64-rand(20);while(x<s){const w=rand(90,150);
    g.fillStyle=`hsl(${rand(20,35)},${rand(5,10)}%,${rand(13,25)}%)`;g.fillRect(x+2,y*h+2,w-4,h-4);
    if(x+w>s){g.fillRect(x+2-s,y*h+2,w-4,h-4);}x+=w;}}
  for(let i=0;i<7000;i++){g.fillStyle=Math.random()<.6?'rgba(0,0,0,.1)':'rgba(255,240,220,.03)';g.fillRect(rand(s),rand(s),2,2);}
  return c;
}

/* ── heraldry: each knight's arms, painted on a 256² canvas ──
   `banner` is the cloth colour used for that knight's banners in the arena. */
const star=(g,x,y,r1,r2)=>{g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2,r=i%2?r2:r1;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.fill();};
export const EMBLEMS={
  azure:{banner:'#173d8c',paint(g){
    g.fillStyle='#1c4aa6';g.fillRect(0,0,256,256);
    g.fillStyle='#e9e2cf';g.beginPath();g.moveTo(0,150);g.lineTo(128,60);g.lineTo(256,150);g.lineTo(256,196);g.lineTo(128,106);g.lineTo(0,196);g.closePath();g.fill();
    g.fillStyle='#d9b76c';star(g,128,46,25,10);star(g,128,205,20,8);
  }},
  ashen:{banner:'#6e0f0d',paint(g){
    g.fillStyle='#17090a';g.fillRect(0,0,256,256);
    g.fillStyle='#8f1512';g.beginPath();g.moveTo(128,0);g.lineTo(256,0);g.lineTo(256,256);g.lineTo(128,256);g.closePath();g.fill();
    g.fillStyle='#b9b2a6';g.beginPath();g.moveTo(66,150);g.lineTo(60,80);g.lineTo(94,116);g.lineTo(128,62);g.lineTo(162,116);g.lineTo(196,80);g.lineTo(190,150);g.closePath();g.fill();
    g.fillRect(66,158,124,12);
  }},
  thorn:{banner:'#18422a',paint(g){ // a thorned bend with a red rose
    g.fillStyle='#1b4a2c';g.fillRect(0,0,256,256);
    g.save();g.translate(128,128);g.rotate(-Math.PI/4);g.fillStyle='#d6d2c4';g.fillRect(-190,-13,380,26);
    for(let i=-6;i<=6;i++){const x=i*30;g.beginPath();g.moveTo(x-7,-12);g.lineTo(x+3,-32);g.lineTo(x+7,-12);g.fill();
      g.beginPath();g.moveTo(x+8,12);g.lineTo(x+18,32);g.lineTo(x+22,12);g.fill();}
    g.restore();
    g.fillStyle='#b3261e';for(let i=0;i<5;i++){const a=i/5*TAU-Math.PI/2;g.beginPath();g.arc(128+Math.cos(a)*15,128+Math.sin(a)*15,15,0,TAU);g.fill();}
    g.fillStyle='#d9b76c';g.beginPath();g.arc(128,128,9,0,TAU);g.fill();
  }},
  bell:{banner:'#5e3d12',paint(g){ // a black bell, cracked in gold
    g.fillStyle='#7a5418';g.fillRect(0,0,256,256);
    g.fillStyle='#5b3d10';for(let i=0;i<8;i++)g.fillRect(i*32,0,16,256);
    g.fillStyle='#17120e';g.beginPath();g.moveTo(92,176);g.quadraticCurveTo(94,84,128,72);g.quadraticCurveTo(162,84,164,176);
    g.lineTo(184,198);g.lineTo(72,198);g.closePath();g.fill();
    g.beginPath();g.arc(128,212,13,0,TAU);g.fill();
    g.strokeStyle='#17120e';g.lineWidth=8;g.beginPath();g.arc(128,64,11,0,TAU);g.stroke();
    g.strokeStyle='#e0b85a';g.lineWidth=5;g.beginPath();g.moveTo(128,78);g.lineTo(118,108);g.lineTo(136,126);g.lineTo(120,152);g.lineTo(134,174);g.lineTo(126,196);g.stroke();
  }},
};
export function emblemCanvas(kind){
  const c=cv(256,256),g=c.getContext('2d');(EMBLEMS[kind]||EMBLEMS.azure).paint(g);
  for(let i=0;i<500;i++){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(rand(256),rand(256),rand(1,8),1);}
  return c;
}
export function bannerTex(kind){
  const c=cv(128,256),g=c.getContext('2d');g.clearRect(0,0,128,256);
  g.fillStyle=(EMBLEMS[kind]||EMBLEMS.azure).banner;g.beginPath();g.moveTo(0,0);g.lineTo(128,0);g.lineTo(128,256);g.lineTo(64,214);g.lineTo(0,256);g.closePath();g.fill();
  g.strokeStyle='#b9954a';g.lineWidth=7;g.stroke();g.drawImage(emblemCanvas(kind),24,50,80,80);
  return tex(c);
}

/* ── capes: painted per knight from their look (cloth/trim colours) ──
   The canvas is 128×256, top = collar. Capes are seen from behind (the back face
   of the plane), so painters draw mirrored. Anything left transparent is cut away
   (alphaTest), which is how the hems get their shapes. */
const css=n=>'#'+n.toString(16).padStart(6,'0');
const shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();};
const W=128,H=256;
function folds(g,cloth){ // base cloth with soft vertical folds and weave noise
  g.fillStyle=css(cloth);g.fillRect(0,0,W,H);
  for(let x=0;x<W;x+=16){const gr=g.createLinearGradient(x,0,x+16,0);
    gr.addColorStop(0,'rgba(0,0,0,.18)');gr.addColorStop(.5,'rgba(255,255,255,.05)');gr.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=gr;g.fillRect(x,0,16,H);}
  const sh=g.createLinearGradient(0,0,0,H);sh.addColorStop(0,'rgba(0,0,0,.25)');sh.addColorStop(.15,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.2)');
  g.fillStyle=sh;g.fillRect(0,0,W,H);
  for(let i=0;i<2500;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.08)':'rgba(255,255,255,.035)';g.fillRect(rand(W),rand(H),1,rand(1,3));}
}
const CAPES={
  azure(g,o){ // a clean cape, gold-bordered, with the chevron and stars
    g.beginPath();g.moveTo(0,0);g.lineTo(W,0);g.lineTo(W,H-14);g.quadraticCurveTo(W/2,H+6,0,H-14);g.closePath();g.clip();
    folds(g,o.cloth);
    g.strokeStyle=css(o.trim);g.lineWidth=5;g.beginPath();g.moveTo(9,0);g.lineTo(9,H-20);g.quadraticCurveTo(W/2,H-4,W-9,H-20);g.lineTo(W-9,0);g.stroke();
    g.lineWidth=1.5;g.beginPath();g.moveTo(16,0);g.lineTo(16,H-28);g.quadraticCurveTo(W/2,H-12,W-16,H-28);g.lineTo(W-16,0);g.stroke();
    g.fillStyle='#e9e2cf';g.beginPath();g.moveTo(26,118);g.lineTo(64,86);g.lineTo(102,118);g.lineTo(102,134);g.lineTo(64,102);g.lineTo(26,134);g.closePath();g.fill();
    g.fillStyle=css(o.trim);star(g,64,66,13,5);star(g,64,160,10,4);
  },
  ashen(g,o){ // tattered, scorched to black at the hem, a pale crown at the shoulders
    g.beginPath();g.moveTo(0,0);g.lineTo(W,0);let y=H-40;g.lineTo(W,y);
    for(let x=W;x>0;x-=rand(6,14)){y=H-rand(2,46);g.lineTo(x,y);g.lineTo(x-rand(2,5),y-rand(8,22));}
    g.lineTo(0,H-30);g.closePath();g.clip();
    folds(g,o.cloth);
    const ash=g.createLinearGradient(0,H*.55,0,H);ash.addColorStop(0,'rgba(10,6,5,0)');ash.addColorStop(.7,'rgba(10,6,5,.75)');ash.addColorStop(1,'rgba(4,3,3,.95)');
    g.fillStyle=ash;g.fillRect(0,0,W,H);
    for(let i=0;i<60;i++){g.fillStyle=`rgba(255,${(rand(90,160))|0},40,${rand(.25,.7)})`;g.fillRect(rand(W),rand(H*.8,H),rand(1,2.5),rand(1,2.5));}
    g.fillStyle=css(o.trim);g.fillRect(0,10,W,3);
    g.fillStyle='rgba(205,198,186,.8)';g.beginPath();g.moveTo(38,76);g.lineTo(35,40);g.lineTo(52,58);g.lineTo(64,30);g.lineTo(76,58);g.lineTo(93,40);g.lineTo(90,76);g.closePath();g.fill();
    g.fillRect(38,80,52,6);
  },
  thorn(g,o){ // short, dagged into leaves, a silver thorn vine down each side and a red rose
    const tongues=5,tw=W/tongues;
    g.beginPath();g.moveTo(0,0);g.lineTo(W,0);g.lineTo(W,H-46);
    for(let i=tongues-1;i>=0;i--){const x0=(i+1)*tw,x1=i*tw;g.quadraticCurveTo(x0-2,H-14,(x0+x1)/2,H-2);g.quadraticCurveTo(x1+2,H-14,x1,H-46);}
    g.closePath();g.clip();
    folds(g,o.cloth);
    const vine=css(o.trim);g.strokeStyle=vine;g.fillStyle=vine;g.lineWidth=3;
    for(const x0 of [12,W-12]){g.beginPath();for(let y=0;y<=H-40;y+=4)g.lineTo(x0+Math.sin(y*.09)*5,y);g.stroke();
      for(let y=10;y<H-46;y+=18){const x=x0+Math.sin(y*.09)*5,s=(y/18)%2?1:-1;g.beginPath();g.moveTo(x,y-3);g.lineTo(x+s*9,y-6);g.lineTo(x,y+3);g.fill();}}
    for(let i=0;i<tongues;i++){const cx=(i+.5)*tw;g.lineWidth=1.5;g.beginPath();g.moveTo(cx,H-40);g.lineTo(cx,H-14);g.stroke();}
    g.fillStyle='#b3261e';for(let i=0;i<5;i++){const a=i/5*TAU-Math.PI/2;g.beginPath();g.arc(64+Math.cos(a)*8,64+Math.sin(a)*8,8,0,TAU);g.fill();}
    g.fillStyle='#d9b76c';g.beginPath();g.arc(64,64,5,0,TAU);g.fill();
  },
  bell(g,o){ // heavy cloth in broad pales, a studded brass hem and the cracked bell
    g.beginPath();g.moveTo(0,0);g.lineTo(W,0);g.lineTo(W,H-4);g.lineTo(0,H-4);g.closePath();g.clip();
    folds(g,o.cloth);
    g.fillStyle='rgba(0,0,0,.2)';for(let i=0;i<4;i++)g.fillRect(i*32+16,0,16,H);
    const brass=css(o.trim);g.fillStyle=shade(o.trim,.55);g.fillRect(0,H-34,W,30);g.fillStyle=brass;g.fillRect(0,H-34,W,4);g.fillRect(0,H-8,W,4);
    for(let x=10;x<W;x+=18){g.beginPath();g.arc(x,H-19,4,0,TAU);g.fill();}
    g.fillStyle='#17120e';g.beginPath();g.moveTo(46,128);g.quadraticCurveTo(47,78,64,72);g.quadraticCurveTo(81,78,82,128);g.lineTo(92,140);g.lineTo(36,140);g.closePath();g.fill();
    g.beginPath();g.arc(64,148,7,0,TAU);g.fill();g.lineWidth=4;g.strokeStyle='#17120e';g.beginPath();g.arc(64,67,6,0,TAU);g.stroke();
    g.strokeStyle=brass;g.lineWidth=3;g.beginPath();g.moveTo(64,76);g.lineTo(58,92);g.lineTo(68,104);g.lineTo(59,118);g.lineTo(66,138);g.stroke();
  },
};
export function capeCanvas(o){
  const c=cv(W,H),g=c.getContext('2d');
  g.translate(W,0);g.scale(-1,1); // seen from behind
  (CAPES[o.emblem]||CAPES.azure)(g,o);
  return c;
}
