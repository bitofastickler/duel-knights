import {DEMO} from './util.js';

/* ───────────────────────── what the game remembers ─────────────────────────
   One JSON entry in localStorage. `fresh()` is the whole shape: a saved value is kept only where
   it has the same type as its default, so adding a field here is all a new feature needs, and a
   damaged or older save falls back to defaults field by field instead of failing.
   Bump VERSION only when an old save has to be converted (do it in `load`). */
const KEY='duel-knights',VERSION=1;
const fresh=()=>({
  v:VERSION,
  settings:{volume:1,muted:false,sens:1,quality:'auto'}, // volume 0–1 · mouse sensitivity multiplier · auto|high|medium|low
  diff:'knight',
  sel:{p:'caldwin',e:'varkos',arena:'courtyard'},
  record:{},                                             // matches fought as each knight: {id:{w,l}}
});
function merge(def,raw){
  if(!raw||typeof raw!=='object')return def;
  for(const k in def){
    const d=def[k],r=raw[k];
    if(d&&typeof d==='object')def[k]=merge(d,r);else if(typeof r===typeof d&&r===r)def[k]=r;
  }
  return def;
}
function load(){
  const d=fresh();
  try{
    const raw=JSON.parse(localStorage.getItem(KEY));merge(d,raw);
    for(const id in raw?.record||{}){const r=raw.record[id];if(r&&r.w>=0&&r.l>=0)d.record[id]={w:r.w|0,l:r.l|0};}
  }catch(e){} // no storage (private window, embedded frame) or an unreadable save: play on with defaults
  d.v=VERSION;return d;
}
export const Save={
  data:load(),
  /** call after changing anything in `data` */
  write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));}catch(e){}},
  /** count a finished match for the knight the player fought as (AI-vs-AI demo matches are not counted) */
  result(id,won){
    if(DEMO)return;
    const r=this.data.record[id]||(this.data.record[id]={w:0,l:0});r[won?'w':'l']++;this.write();
  },
  /** forget everything */
  wipe(){this.data=fresh();try{localStorage.removeItem(KEY);}catch(e){}},
};
