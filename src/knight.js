import * as THREE from 'three';
import {V} from './util.js';
import {scene} from './render.js';
import {tex,emblemCanvas,capeCanvas} from './textures.js';
import {WEAPONS} from './weapons.js';

/* ───────────────────────── knight model ─────────────────────────
   Every knight shares one skeleton; the look options change the armour.
   o: steel, rough, trim, mail, cloth, blade (colours) · emblem · helm ('plume'|'horned'|'crest'|'great')
      scale (whole body) · bulk (pauldron size) · weapon (key into WEAPONS)
      capeW, capeL (cape size; its design comes from the emblem, see CAPES in textures.js) */
export const HIP_Y=.88, UA=.29, FA=.27, TH=.45, SHN=.43, ANKLE=.07;
export const CHEST_OFF=V(0,.10,0), SH_R=V(-.25,.45,0), SH_L=V(.25,.45,0), HJ_L=V(.11,-.03,0), HJ_R=V(-.11,-.03,0);

export function buildKnight(o){
  const m={
    steel:new THREE.MeshStandardMaterial({color:o.steel,metalness:.82,roughness:o.rough,envMapIntensity:1.1}),
    trim:new THREE.MeshStandardMaterial({color:o.trim,metalness:.9,roughness:.35,envMapIntensity:1.2}),
    mail:new THREE.MeshStandardMaterial({color:o.mail,metalness:.45,roughness:.7,envMapIntensity:.6}),
    cloth:new THREE.MeshStandardMaterial({color:o.cloth,roughness:.85,metalness:0,envMapIntensity:.3,side:THREE.DoubleSide}),
    leather:new THREE.MeshStandardMaterial({color:0x2a1c12,roughness:.8,envMapIntensity:.3}),
    black:new THREE.MeshBasicMaterial({color:0x020202}),
    blade:new THREE.MeshStandardMaterial({color:o.blade,metalness:.95,roughness:.2,envMapIntensity:1.6,flatShading:true}),
  };
  const {steel,trim,mail,cloth,leather,black}=m;
  const add=(geo,mat,parent,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const me=new THREE.Mesh(geo,mat);me.position.set(x,y,z);me.rotation.set(rx,ry,rz);me.castShadow=true;me.receiveShadow=true;parent.add(me);return me;};
  const grp=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
  const cyl=(a,b,h,s=10)=>new THREE.CylinderGeometry(a,b,h,s), box=(x,y,z)=>new THREE.BoxGeometry(x,y,z), sph=(r,w=12,h=10)=>new THREE.SphereGeometry(r,w,h);
  const helm=o.helm||'plume',bulk=o.bulk||1,spiky=helm==='horned';

  const root=new THREE.Group();scene.add(root);
  const hips=grp(root,0,HIP_Y,0);
  const chest=grp(hips,0,.10,0);chest.rotation.order='YXZ';
  // pelvis
  add(cyl(.2,.17,.18,12),mail,hips,0,-.02,0).scale.z=.74;
  add(box(.25,.36,.02),cloth,hips,0,-.2,.135,-.06);add(box(.25,.36,.02),cloth,hips,0,-.2,-.135,.06);
  add(box(.05,.36,.022),trim,hips,0,-.2,.14,-.06);
  add(box(.03,.24,.19),steel,hips,.2,-.1,0,0,0,.2);add(box(.03,.24,.19),steel,hips,-.2,-.1,0,0,0,-.2);
  // torso
  add(cyl(.235,.195,.44,14),steel,chest,0,.2,0).scale.z=.72;
  add(sph(.2),steel,chest,0,.33,.015).scale.set(1.25,.8,.86);
  add(box(.2,.44,.02),cloth,chest,0,.19,.158);
  add(box(.045,.44,.024),trim,chest,0,.19,.16);add(box(.2,.045,.024),trim,chest,0,.3,.16);
  add(cyl(.205,.205,.06,14),leather,chest,0,-.01,0).scale.z=.75;add(box(.06,.07,.03),trim,chest,0,-.01,.155);
  add(cyl(.1,.135,.09,10),steel,chest,0,.5,0);
  // head
  const head=grp(chest,0,.55,0);head.rotation.order='YXZ';
  if(helm==='great'){ // flat-topped great helm with a cross of brass
    add(cyl(.15,.145,.32,14),steel,head,0,.17,0);
    add(cyl(.153,.153,.025,14),trim,head,0,.33,0);
    add(box(.25,.024,.03),black,head,0,.2,.146);
    add(box(.026,.24,.03),trim,head,0,.16,.15);add(box(.16,.026,.03),trim,head,0,.13,.15);
    for(let i=0;i<6;i++)add(box(.012,.012,.02),black,head,.045+(i%3)*.028,.07-((i/3)|0)*.03,.15);
  }else{
    add(cyl(.132,.142,.25,14),steel,head,0,.15,0);
    add(sph(.134,14,8),steel,head,0,.27,0).scale.y=.6;
    add(box(.21,.024,.03),black,head,0,.17,.128);
    add(box(.022,.2,.03),trim,head,0,.14,.135);add(cyl(.136,.146,.03,14),trim,head,0,.04,0);
    for(let i=0;i<4;i++)add(box(.012,.012,.02),black,head,.04+(i%2)*.035,.09-((i/2)|0)*.03,.136);
  }
  if(helm==='horned'){
    for(const s of [1,-1]){const h=grp(head,s*.12,.27,0);h.rotation.z=-s*.9;add(new THREE.ConeGeometry(.04,.3,7),trim,h,0,.14,0);
      const h2=grp(h,0,.26,0);h2.rotation.z=s*.75;add(new THREE.ConeGeometry(.028,.2,7),trim,h2,0,.08,0);}
    for(let i=0;i<5;i++){const a=(i-2)*.5;add(new THREE.ConeGeometry(.02,.11,5),trim,head,Math.sin(a)*.115,.37,Math.cos(a)*.115-.02);}
  }else if(helm==='plume'){
    for(let i=0;i<7;i++){const k=i/6;add(sph(.05-.02*k,8,6),cloth,head,0,.36+.06*Math.sin(k*2.6),.03-k*.3).scale.x=.55;}
    add(cyl(.02,.03,.08,6),trim,head,0,.335,.03);
  }else if(helm==='crest'){ // a low steel fin and a short horsehair tail
    add(box(.016,.06,.27),trim,head,0,.36,-.01);
    for(let i=0;i<5;i++){const k=i/4;add(sph(.034-.012*k,8,6),cloth,head,0,.3-.12*k,-.15-k*.06).scale.x=.6;}
  }
  if(o.eyes||helm==='horned'){ // glowing eye slits — they flare during a heavy windup
    const eyeM=new THREE.MeshBasicMaterial({color:new THREE.Color(6,.5,.2)}),z=helm==='great'?.144:.122,y=helm==='great'?.2:.17;
    add(sph(.014,6,6),eyeM,head,.042,y,z);add(sph(.014,6,6),eyeM,head,-.042,y,z);root.userData.eyes=eyeM;
  }
  // cape
  const CW=o.capeW||.42,CL=o.capeL||.78;
  const capeG=new THREE.PlaneGeometry(CW,CL,4,9);capeG.translate(0,-CL/2,0);
  const capeMat=new THREE.MeshStandardMaterial({map:tex(capeCanvas(o)),alphaTest:.5,roughness:.85,metalness:0,envMapIntensity:.3,side:THREE.DoubleSide});
  const cape=new THREE.Mesh(capeG,capeMat);cape.position.set(0,.47,-.165);cape.castShadow=true;chest.add(cape);
  // arms
  const arm=(s,SH)=>{
    const ua=grp(chest,SH.x,SH.y,SH.z);
    add(cyl(.062,.052,UA,10),mail,ua,0,-UA/2,0);
    const pa=add(sph(.105,12,8),steel,ua,s*.01,.01,0);pa.scale.set(bulk,.82*bulk,1.05*bulk);
    add(cyl(.108*bulk,.108*bulk,.02,12),trim,ua,s*.01,-.045,0);
    if(spiky)add(new THREE.ConeGeometry(.03,.14,6),trim,ua,s*.07,.1,0,0,0,-s*.6);
    const fa=grp(ua,0,-UA,0);add(sph(.062,10,8),steel,fa);add(cyl(.054,.044,.24,10),steel,fa,0,-.135,0);add(cyl(.057,.057,.025,10),trim,fa,0,-.04,0);
    const hand=grp(fa,0,-FA,0);add(box(.085,.1,.09),steel,hand);add(box(.09,.03,.095),trim,hand,0,-.045,0);
    return {ua,fa,hand};
  };
  const aR=arm(-1,SH_R),aL=arm(1,SH_L);
  // legs
  const leg=(s,HJ)=>{
    const th=grp(hips,HJ.x,HJ.y,HJ.z);add(cyl(.088,.07,TH,10),mail,th,0,-TH/2,0);add(box(.12,.28,.03),steel,th,0,-.2,.07);
    const sh=grp(th,0,-TH,0);add(sph(.076,10,8),steel,sh,0,0,.01);add(cyl(.066,.05,.4,10),steel,sh,0,-.22,0);add(cyl(.07,.07,.025,10),trim,sh,0,-.07,0);
    const ft=grp(sh,0,-SHN,0);add(box(.095,.075,.25),steel,ft,0,-.03,.055);add(box(.08,.05,.08),steel,ft,0,-.045,.2);
    return {th,sh,ft};
  };
  const lL=leg(1,HJ_L),lR=leg(-1,HJ_R);
  // weapon (grip along +Y of the hand)
  const W=WEAPONS[o.weapon||'sword'].build({add,grp,cyl,box,sph,m},aR.hand);
  // shield (faces +Z of the left hand)
  const shield=grp(aL.hand,0,.02,.075);
  const shp=new THREE.Shape();shp.moveTo(-.25,.28);shp.lineTo(.25,.28);shp.lineTo(.25,.02);shp.quadraticCurveTo(.24,-.22,0,-.38);shp.quadraticCurveTo(-.24,-.22,-.25,.02);shp.closePath();
  const et=tex(emblemCanvas(o.emblem));et.repeat.set(2,1/.66);et.offset.set(.5,.38/.66);
  const face=new THREE.Mesh(new THREE.ShapeGeometry(shp,10),new THREE.MeshStandardMaterial({map:et,roughness:.55,metalness:.25,envMapIntensity:.6}));face.position.z=.033;face.castShadow=true;shield.add(face);
  const body=add(new THREE.ExtrudeGeometry(shp,{depth:.03,bevelEnabled:false,curveSegments:10}),steel,shield);body.scale.set(1.05,1.05,1);body.position.y=-.002;
  add(sph(.05,10,8),trim,shield,0,-.02,.035).scale.z=.6;
  const shieldC=grp(shield,0,-.03,.02);
  const bones={root,hips,chest,head,cape,uaR:aR.ua,faR:aR.fa,hR:aR.hand,uaL:aL.ua,faL:aL.fa,hL:aL.hand,
    thL:lL.th,shL:lL.sh,ftL:lL.ft,thR:lR.th,shR:lR.sh,ftR:lR.ft,weapon:W.g,bBase:W.base,bTip:W.tip,shield,shieldC};
  // remember rest transforms so the ragdoll can be undone
  const rest=[];for(const k of ['hips','uaR','faR','hR','uaL','faL','hL','thL','shL','ftL','thR','shR','ftR','weapon']){const b=bones[k];rest.push({b,parent:b.parent,pos:b.position.clone()});}
  bones.rest=rest;bones.capeBase=capeG.attributes.position.array.slice();bones.capeLen=CL;
  if(o.scale)root.scale.setScalar(o.scale);
  return bones;
}
