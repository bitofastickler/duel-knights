import * as THREE from 'three';
import {TAU} from './util.js';
import {P,SWORD,MACE,SPEAR,AXE} from './moves.js';

/* A weapon is held along +Y of the right hand.
   build() returns the weapon group plus two markers: `base` and `tip` bound the
   segment that is swept for hits. `radius` thickens that segment (a mace head is fat);
   `reach` tells the AI how far it can strike relative to a longsword.
   `poses` (optional) replaces stances from POSE (moves.js) that do not suit the weapon. */
export const WEAPONS={
  sword:{name:'Longsword',moves:SWORD,radius:0,reach:1,blunt:false,
    build({add,grp,cyl,box,sph,m},hand){
      const g=grp(hand);
      add(cyl(.016,.018,.2,8),m.leather,g);add(sph(.03,8,6),m.trim,g,0,-.125,0);
      add(box(.03,.03,.26),m.trim,g,0,.11,0);add(box(.04,.04,.05),m.trim,g,0,.11,0);
      const bl=add(new THREE.CylinderGeometry(.018,.032,.92,4),m.blade,g,0,.585,0);bl.scale.x=.3;
      const tip=add(new THREE.ConeGeometry(.018,.09,4),m.blade,g,0,1.09,0);tip.scale.x=.3;
      return {g,base:grp(g,0,.18,0),tip:grp(g,0,1.13,0)};
    }},
  mace:{name:'Mace',moves:MACE,radius:.052,reach:.88,blunt:true,
    build({add,grp,cyl,sph,box,m},hand){
      const g=grp(hand);
      add(cyl(.018,.02,.2,8),m.leather,g);add(sph(.03,8,6),m.trim,g,0,-.125,0);
      add(cyl(.03,.03,.03,8),m.trim,g,0,.11,0);
      add(cyl(.017,.02,.6,8),m.steel,g,0,.41,0);                 // haft
      add(cyl(.026,.026,.03,8),m.trim,g,0,.7,0);                 // collar under the head
      add(sph(.055,10,8),m.blade,g,0,.79,0);                      // core
      for(let i=0;i<7;i++){const f=grp(g,0,.79,0);f.rotation.y=i/7*TAU;  // flanges
        add(box(.014,.17,.05),m.blade,f,0,0,.058);}
      add(new THREE.ConeGeometry(.022,.08,6),m.blade,g,0,.9,0);   // crown spike
      return {g,base:grp(g,0,.42,0),tip:grp(g,0,.88,0)};
    }},
  // long enough to bury its point in the ground from a sword's resting stances, so it is carried upright instead
  spear:{name:'Spear',moves:SPEAR,radius:.012,reach:1.3,blunt:false,
    poses:{rest:P({cy:0,cp:0,rh:[-.37,.2,.12],rd:[-.05,1,.07],lh:[.3,.15,.22],ld:[.5,0,.86]}),
      taunt:P({cy:.1,cp:-.03,hy:.02,rh:[-.46,.12,.14],rd:[-.32,.9,.28],lh:[.38,.10,.12],ld:[.85,0,.5]})},
    build({add,grp,cyl,box,m},hand){
      const g=grp(hand);
      add(cyl(.015,.017,1.6,8),m.leather,g,0,.4,0);                      // ash haft
      add(new THREE.ConeGeometry(.02,.07,6),m.trim,g,0,-.43,0,Math.PI);   // butt spike
      add(cyl(.021,.021,.2,8),m.trim,g);                                  // grip binding
      add(cyl(.016,.024,.09,8),m.trim,g,0,1.2,0);                         // socket
      add(box(.014,.014,.13),m.trim,g,0,1.17,0);                          // lugs
      const sock=add(new THREE.CylinderGeometry(.05,.016,.07,4),m.blade,g,0,1.265,0);sock.scale.x=.3;
      const head=add(new THREE.ConeGeometry(.05,.27,4),m.blade,g,0,1.435,0);head.scale.x=.3;
      add(box(.004,.07,.17),m.cloth,g,0,1.1,-.1);add(box(.004,.04,.07),m.cloth,g,0,1.085,-.21); // pennon
      return {g,base:grp(g,0,.5,0),tip:grp(g,0,1.56,0)};
    }},
  axe:{name:'War axe',moves:AXE,radius:.035,reach:.95,blunt:false,
    build({add,grp,cyl,sph,m},hand){
      const g=grp(hand);
      add(cyl(.017,.02,.9,8),m.leather,g,0,.33,0);add(sph(.028,8,6),m.trim,g,0,-.125,0);
      add(cyl(.022,.022,.2,8),m.trim,g);
      add(cyl(.026,.026,.13,8),m.trim,g,0,.7,0);                          // eye of the head
      // bearded blade: its edge leads a downward chop (the hand's −Z)
      const b=new THREE.Shape();b.moveTo(0,.64);b.lineTo(.05,.645);b.quadraticCurveTo(.11,.6,.15,.47);b.quadraticCurveTo(.215,.66,.165,.84);
      b.quadraticCurveTo(.11,.75,.05,.745);b.lineTo(0,.76);b.closePath();
      const bg=new THREE.ExtrudeGeometry(b,{depth:.014,bevelEnabled:false,curveSegments:8});bg.translate(0,0,-.007);
      add(bg,m.blade,g,0,0,0,0,Math.PI/2,0);
      add(new THREE.ConeGeometry(.02,.09,5),m.blade,g,0,.7,.06,Math.PI/2,0,0);   // back spike
      add(new THREE.ConeGeometry(.018,.07,5),m.trim,g,0,.815,0);
      return {g,base:grp(g,0,.36,0),tip:grp(g,0,.74,-.13)};
    }},
};
