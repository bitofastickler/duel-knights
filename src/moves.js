/* ───────────────────────── poses & attack data ─────────────────────────
   Hand targets live in a frame at the hips, axes aligned with the knight
   (+Z forward, +X the knight's left). rd = weapon direction, ld = shield normal.
   A pose is 18 numbers: rh(3) rd(3) lh(3) ld(3) cy cp cr hy hz sf. */
export const GUARD={rh:[-.30,.26,.30],rd:[.25,.82,.52],lh:[.20,.32,.40],ld:[.15,0,1],cy:-.25,cp:.04,cr:0,hy:0,hz:0,sf:0};
const TUCK={lh:[.27,.30,.22],ld:[.55,0,.83]};
export const P=(o={})=>{const s={...GUARD,...o};return Float32Array.of(...s.rh,...s.rd,...s.lh,...s.ld,s.cy,s.cp,s.cr,s.hy,s.hz,s.sf);};
export const K=(t,o,e=1)=>({t,p:P(o),e});
const A=(t,o,e=0)=>K(t,{...TUCK,...o},e);
export const POSE={
  guard:P(), block:P({cy:-.42,hy:-.07,cp:.08,lh:[.05,.42,.47],ld:[0,.05,1],rh:[-.34,.20,.12],rd:[.2,.9,.38]}),
  taunt:P({cy:.1,cp:-.03,hy:.02,rh:[-.44,.02,.15],rd:[-.45,-.6,.66],lh:[.38,.10,.12],ld:[.85,0,.5]}),
  victory:P({cy:0,cp:-.12,hy:.02,rh:[-.3,1.0,.02],rd:[.02,1,.04],lh:[.3,.2,.2],ld:[.6,0,.8]}),
  rest:P({cy:0,cp:0,rh:[-.34,.02,.1],rd:[-.1,-.75,.65],lh:[.3,.15,.22],ld:[.5,0,.86]}),
  stagger:P({cy:.3,cp:-.32,hy:-.05,rh:[-.6,.35,.05],rd:[-.75,.25,.6],lh:[.5,.25,.08],ld:[.9,0,.4]}),
  broken:P({cy:-.2,cp:-.28,hy:-.1,rh:[-.5,.1,.1],rd:[-.5,-.2,.84],lh:[.55,.5,.0],ld:[.95,.3,.1]}),
  dodge:P({cy:-.1,cp:.4,hy:-.24,rh:[-.32,.2,.2],rd:[-.3,.5,.8],lh:[.22,.25,.3],ld:[.2,0,1]}),
  parryPunch:P({cy:-.6,hy:-.05,cp:.1,lh:[-.02,.5,.56],ld:[-.25,.1,1],rh:[-.36,.3,.05],rd:[.1,.95,.3]}),
};
export const EASE=[u=>u,u=>u*u*(3-2*u),u=>1-(1-u)*(1-u),u=>u*u];
export const PARRY_WINDOW=.2;

/* An attack: wind/act/rec phase lengths (s), dmg, stamina cost, lunge speed,
   stun on hit, knockback, bs = stamina it drains from a blocker,
   chip = health it takes through a block, poise = time after which a heavy shrugs off light hits. */

/* the longsword — a three-cut chain and an overhead */
export const SWORD={
  l1:{kind:'light',next:'l2',wind:.28,act:.12,rec:.34,dmg:10,cost:11,lunge:2.4,stun:.30,kb:2.2,bs:13,chip:0,keys:[
    A(.28,{cy:-.7,cp:-.04,hy:-.03,rh:[-.50,.50,-.15],rd:[-.75,.50,-.43]},2),
    A(.34,{cy:-.05,cp:.1,rh:[-.25,.42,.42],rd:[-.50,.08,.86]},3),
    A(.37,{cy:.25,cp:.14,hz:.06,rh:[-.02,.38,.50],rd:[.12,0,.99]}),
    A(.40,{cy:.55,cp:.16,hy:-.06,hz:.08,sf:.15,rh:[.20,.34,.36],rd:[.78,-.08,.62]}),
    A(.50,{cy:.62,cp:.16,hy:-.06,hz:.08,sf:.15,rh:[.26,.30,.28],rd:[.86,-.12,.45]},2),K(.74,{})]},
  l2:{kind:'light',next:'l3',wind:.22,act:.12,rec:.36,dmg:11,cost:11,lunge:2.2,stun:.30,kb:2.2,bs:13,chip:0,keys:[
    A(.22,{cy:.6,cp:.05,rh:[.22,.48,.18],rd:[.78,.45,-.43]},2),
    A(.275,{cy:.15,cp:.1,rh:[0,.40,.48],rd:[.35,.05,.93]},3),
    A(.31,{cy:-.2,cp:.14,hz:.06,rh:[-.25,.36,.46],rd:[-.3,0,.95]}),
    A(.34,{cy:-.55,cp:.15,hy:-.05,hz:.08,rh:[-.50,.30,.22],rd:[-.85,-.08,.5]}),
    A(.44,{cy:-.62,cp:.15,hy:-.05,hz:.08,rh:[-.54,.27,.14],rd:[-.9,-.12,.38]},2),K(.70,{})]},
  l3:{kind:'light',next:null,wind:.26,act:.10,rec:.50,dmg:15,cost:13,lunge:3.2,stun:.36,kb:3.6,bs:16,chip:0,keys:[
    A(.26,{cy:-.6,hy:-.06,rh:[-.36,.34,-.02],rd:[.05,.04,1]},2),
    A(.33,{cy:.45,cp:.22,hy:-.12,hz:.22,sf:.3,rh:[-.08,.40,.56],rd:[.02,0,1]},3),
    A(.46,{cy:.45,cp:.22,hy:-.12,hz:.22,sf:.3,rh:[-.08,.40,.56],rd:[.02,0,1]}),K(.86,{})]},
  heavy:{kind:'heavy',next:null,wind:.62,act:.14,rec:.60,dmg:28,cost:26,lunge:3.0,stun:.62,kb:5.5,bs:42,chip:4,poise:.3,keys:[
    A(.26,{cy:-.35,cp:-.08,rh:[-.34,.75,-.02],rd:[-.2,.9,-.35]},1),
    A(.62,{cy:-.3,cp:-.22,hy:.03,rh:[-.26,1.02,-.14],rd:[-.12,.62,-.78]},2),
    A(.68,{cy:0,cp:.1,rh:[-.18,.95,.30],rd:[0,.75,.66]},3),
    A(.72,{cy:.1,cp:.3,hy:-.1,hz:.08,rh:[-.12,.62,.52],rd:[0,.15,.99]}),
    A(.76,{cy:.2,cp:.45,hy:-.18,hz:.12,sf:.25,rh:[-.08,.22,.50],rd:[.04,-.5,.86]}),
    A(.94,{cy:.2,cp:.45,hy:-.18,hz:.12,sf:.25,rh:[-.08,.22,.50],rd:[.04,-.5,.86]}),K(1.36,{})]},
};

/** stretch an attack's timing by f (keys and phases together) and override fields */
const slow=(a,f,o={})=>({...a,wind:a.wind*f,act:a.act*f,rec:a.rec*f,poise:a.poise&&a.poise*f,keys:a.keys.map(k=>({...k,t:k.t*f})),...o});

/* the flanged mace — shorter, slower, two swings instead of three.
   Every blow drains a guard hard and bleeds through the shield. */
const maceHeavy={...SWORD.heavy,keys:SWORD.heavy.keys.slice()};
maceHeavy.keys[1]=A(.62,{cy:-.4,cp:-.3,hy:.04,rh:[-.24,1.1,-.2],rd:[-.1,.4,-.91]},2); // hoisted higher behind the head
export const MACE={
  l1:slow(SWORD.l1,1.18,{dmg:12,cost:14,lunge:2.9,stun:.33,kb:3.2,bs:18,chip:1}),
  l2:slow(SWORD.l2,1.18,{next:null,dmg:14,cost:15,lunge:2.8,stun:.38,kb:3.8,bs:20,chip:1}),
  heavy:slow(maceHeavy,1.1,{dmg:30,cost:30,lunge:3.5,stun:.68,kb:6.8,bs:50,chip:5}),
};

/** a fighter's own copy of a moveset, scaled by their attack speed and damage */
export function buildMoves(base,{atkSpeed=1,dmg=1,heavyDmg=1}={}){
  const out={},f=1/atkSpeed;
  for(const id in base){const a=base[id];
    out[id]=slow(a,f,{dmg:a.dmg*dmg*(a.kind==='heavy'?heavyDmg:1)});}
  return out;
}
