import * as THREE from 'three';
import {TAU} from './util.js';
import {SWORD,MACE} from './moves.js';

/* A weapon is held along +Y of the right hand.
   build() returns the weapon group plus two markers: `base` and `tip` bound the
   segment that is swept for hits. `radius` thickens that segment (a mace head is fat);
   `reach` tells the AI how far it can strike relative to a longsword. */
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
  mace:{name:'Flanged mace',moves:MACE,radius:.06,reach:.88,blunt:true,
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
};
