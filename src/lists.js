import {ROSTER} from './characters.js';

/* ───────────────────────── the lists: a tournament ─────────────────────────
   Eight seats, three fights. The player sits in seat 0 and the reigning champion, when someone else holds the
   title, in seat 7: the far end of the other half, so the two can only meet in the final. The champion wins
   every bout the player does not see; the other knights' bouts are a coin toss. With seven entrants seat 6 is
   empty and seat 7 goes through unopposed.

   Only rules live here. Everything works on the saved data (see save.js): `champion`, `past`, `titles`,
   `lists`, and the run in progress, which is plain JSON so it can be left and come back to:
     p        the player's knight          base     the difficulty the player chose
     seats    eight knight ids, or null for the empty seat
     boss     is seat 7 the reigning champion?
     defending  does the player's own knight hold the title?
     round    0–2, the stage the player is at
     w        per stage, the seat that won each bout
     done     null while it runs, then 'won' or 'lost' */
export const STAGES=[
  {name:'Quarter-final',arena:'courtyard'},
  {name:'Semi-final',arena:'starfall'},
  {name:'Final',arena:'wyrmfire'},
];
const LEVELS=['squire','knight','warlord'];
/** each stage is a step harder than the last, around the difficulty the player chose */
export const stageDiff=(base,round)=>LEVELS[Math.min(2,Math.max(0,Math.max(0,LEVELS.indexOf(base))+round-1))];

const shuffle=(a,rnd)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/** seat the knights and start a run (it is not saved until the caller stores it) */
export function newRun(data,p,base,rnd=Math.random){
  const c=data.champion,defending=c.id===p&&c.mine,boss=c.id&&!defending?c.id:null;
  // the champion is an entrant of their own. Their knight does not also enter as a challenger, unless the
  // player has picked that same knight, in which case the two of them are different people in the same arms.
  const o=shuffle(ROSTER.map(k=>k.id).filter(id=>id!==p&&(id!==boss||boss===p)),rnd);
  const seats=[p,o[0],o[1],o[2],o[3],o[4],boss&&o.length>5?o[5]:null,boss||o[5]];
  data.lists.entered++;
  return {p,base,seats,boss:!!boss,defending,round:0,w:[[],[],[]],done:null};
}
/** the two seats of bout m at a stage */
const pair=(run,r,m)=>{const from=r?run.w[r-1]:[0,1,2,3,4,5,6,7];return [from[m*2],from[m*2+1]];};
/** the bout the player is about to fight */
export function bout(run){
  const r=run.round,seat=pair(run,r,0)[1];
  return {stage:STAGES[r],round:r,e:run.seats[seat],arena:STAGES[r].arena,diff:stageDiff(run.base,r),champion:run.boss&&seat===7};
}
/** decide every bout of stage r that has no winner yet */
function settle(run,r,rnd){
  for(let m=0;m<4>>r;m++){
    if(run.w[r][m]!==undefined)continue;
    const [a,b]=pair(run,r,m);
    run.w[r][m]=run.seats[a]==null?b:run.seats[b]==null?a:run.boss&&b===7?b:rnd()<.5?a:b;
  }
}
/** the player's bout is over: fill in the rest and, when the lists end, settle the title. Returns the run. */
export function report(data,run,won,rnd=Math.random){
  const r=run.round,[me,foe]=pair(run,r,0);
  run.w[r][0]=won?me:foe;settle(run,r,rnd);
  if(won&&r<2){run.round++;return run;}
  if(!won)for(let s=r+1;s<3;s++)settle(run,s,rnd); // out: the lists go on without the player
  const seat=run.w[2][0],id=run.seats[seat],c=data.champion;
  run.done=won?'won':'lost';
  if(won){data.lists.won++;data.titles[id]=(data.titles[id]||0)+1;}
  if(won?run.defending:run.boss&&seat===7)c.defences++; // the title stays where it was
  else{
    if(c.id){data.past.unshift({id:c.id,mine:c.mine,defences:c.defences});data.past.length=Math.min(data.past.length,8);}
    data.champion={id,mine:won,defences:0};
  }
  return run;
}
/** is this saved run one the current game can pick up? (an edited save, or a roster that has since changed) */
export function validRun(run){
  const known=id=>ROSTER.some(k=>k.id===id),seat=v=>Number.isInteger(v)&&v>=0&&v<8;
  return !!run&&typeof run==='object'&&known(run.p)&&LEVELS.includes(run.base)&&run.done===null&&[0,1,2].includes(run.round)
    &&Array.isArray(run.seats)&&run.seats.length===8&&run.seats[0]===run.p&&run.seats.every((id,i)=>id===null?i===6:known(id))
    &&Array.isArray(run.w)&&run.w.length===3&&run.w.every((w,r)=>Array.isArray(w)&&w.length===(r<run.round?4>>r:0)&&w.every(seat))
    &&run.w.slice(0,run.round).every(w=>w[0]===0);
}
/** who sits in each bout, for drawing the bracket: per stage, a list of [seat,seat] with the winning seat (or undefined) */
export function bracket(run){
  return [0,1,2].map(r=>Array.from({length:4>>r},(_,m)=>{
    const known=r===0||run.w[r-1].length>m*2+1;
    return {seats:known?pair(run,r,m):[undefined,undefined],won:run.w[r][m]};
  }));
}
