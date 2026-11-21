import {$,clamp,angDiff,V,params,DEMO} from './util.js';
import {renderer,scene,camera,canvas,gfx} from './render.js';
import {Snd} from './audio.js';
import {FX} from './fx.js';
import {WALL_R,ARENAS,arenaId,buildArena,buildEmbers,updateEnvironment,setBannerEmblems,setArenaQuality} from './arena.js';
import {emblemCanvas} from './textures.js';
import {Fighter} from './fighter.js';
import {WEAPONS} from './weapons.js';
import {DIFF,Brain} from './brain.js';
import {ROSTER,CHARACTERS} from './characters.js';
import {initCombat,sweep} from './combat.js';
import {Save} from './save.js';
import {newRun,bout as nextBout,report,bracket,validRun} from './lists.js';

buildArena(params.get('arena')||Save.data.sel.arena);buildEmbers(); // a link's choice wins over the remembered one

const ui={hud:$('#hud'),pHp:$('#pHp'),pGhost:$('#pGhost'),pSt:$('#pSt'),eHp:$('#eHp'),eGhost:$('#eGhost'),eSt:$('#eSt'),pStBar:$('#pStBar'),
  callout:$('#callout'),banner:$('#banner'),round:$('#roundLabel'),vig:$('#vig'),focus:$('#focus'),help:$('#help'),pName:$('#pName'),eName:$('#eName'),arena:$('#arenaLabel')};
const ROMAN=['I','II','III','IV','V'];
const inp={keys:{},light:false,heavy:false,dodge:false,blockPressed:false,aim:0,pitch:.24,locked:false,noLock:false,focus:false,mx:0};
const pick=(id,fallback)=>CHARACTERS[id]?id:fallback;
let player=null,enemy=null;
// the lists: drop anything in the save that this roster cannot make sense of
if(!validRun(Save.data.run))Save.data.run=null;
if(!CHARACTERS[Save.data.champion.id])Save.data.champion={id:'',mine:false,defences:0};
Save.data.past=Save.data.past.filter(c=>CHARACTERS[c.id]);
let run=Save.data.run,shown=null; // the tournament in progress, and the one on the bracket screen (it may be over)

const game={
  phase:'title',paused:false,mode:!DEMO&&Save.data.mode==='lists'?'lists':'duel',bout:null,diff:DIFF[Save.data.diff]?Save.data.diff:'knight',round:1,score:[0,0],timer:0,time:0,vig:0,winner:null,stats:null,camYaw:0,orbit:ARENAS.find(a=>a.id===arenaId()).orbit,
  sel:{p:pick(params.get('p'),pick(Save.data.sel.p,'caldwin')),e:pick(params.get('e'),pick(Save.data.sel.e,'varkos')),arena:arenaId()},
  callout(t){ui.callout.textContent=t;ui.callout.classList.remove('go');void ui.callout.offsetWidth;ui.callout.classList.add('go');},
  banner(big,sub=''){ui.banner.children[0].textContent=big;ui.banner.children[1].textContent=sub;ui.banner.classList.toggle('on',!!big);},
  stamFail(){Snd.fail();ui.pStBar.classList.remove('fail');void ui.pStBar.offsetWidth;ui.pStBar.classList.add('fail');},
  pips(){for(const [el,n] of [[$('#pPips'),this.score[0]],[$('#ePips'),this.score[1]]]){el.innerHTML='';for(let i=0;i<3;i++){const d=document.createElement('div');d.className='pip'+(i<n?' on':'');el.appendChild(d);}}},
  /** a duel between the picks, or, with `bout` set, the next fight of the lists */
  startMatch(){
    const b=this.bout;if(b){buildArena(b.arena);ui.arena.textContent=ARENAS.find(a=>a.id===b.arena).name;}
    makeFighters();
    this.score=[0,0];this.round=1;this.stats={hits:[0,0],parries:[0,0],dmg:[0,0],blocks:[0,0]};
    enemy.brain=new Brain(enemy,player,DIFF[b?b.diff:this.diff]);
    player.brain=DEMO?new Brain(player,enemy,DIFF.knight):null;
    for(const id of ['#title','#how','#end','#lists'])$(id).classList.add('hidden');ui.hud.classList.remove('off');
    ui.help.style.opacity='';clearTimeout(this.helpT);this.helpT=setTimeout(()=>ui.help.style.opacity=0,14000);
    this.startRound();
  },
  startRound(){
    player.reset(V(0,0,-3.3),0);enemy.reset(V(0,0,3.3),Math.PI);
    enemy.brain.reset();player.brain&&player.brain.reset();
    inp.aim=0;inp.pitch=.24;this.camYaw=0;this.phase='intro';this.timer=0;this.winner=null;
    ui.round.textContent='Round '+ROMAN[this.round-1];this.pips();
    this.banner('Round '+ROMAN[this.round-1],this.score[0]===2&&this.score[1]===2?'Final round':this.bout?this.bout.stage.name+(this.bout.champion?' · the champion':''):'First to three');this.gonged=false;
  },
  endRound(winner){
    this.phase='roundEnd';this.timer=0;this.winner=winner;this.score[winner===player?0:1]++;
    winner.victory=true;
  },
  endMatch(){
    this.phase='matchEnd';const win=this.score[0]>this.score[1],L=enemy.char.lines;
    $('#endTitle').textContent=win?'Victory':'Defeat';$('#endSub').textContent=win?L.fall:L.win;
    const s=this.stats;$('#stats').innerHTML=[['Rounds won',this.score],['Blows landed',s.hits],['Parries',s.parries],['Blocks',s.blocks],['Damage dealt',s.dmg.map(Math.round)]]
      .map(([n,v])=>`<span>${v[0]}</span><span>${n}</span><span>${v[1]}</span>`).join('');
    Save.result(player.char.id,win);syncDiffButtons();
    if(this.bout){ // the lists: the rest of the stage is decided, and the title if this ended them
      shown=report(Save.data,run,win);if(run.done)run=Save.data.run=null;Save.write();
      if(shown.done==='won'){$('#endTitle').textContent='Champion';$('#endSub').textContent='The lists are yours';}
      $('#onward').textContent=shown.done?'See the lists':'Onward';
    }
    $('#end').dataset.mode=this.bout?'lists':'duel';
    $('#end').classList.remove('hidden');ui.hud.classList.add('off');this.banner('');
    if(document.pointerLockElement)document.exitPointerLock();Snd.horn(win);
  },
  /** back to the knight and arena selection screen */
  toTitle(){
    this.phase='title';setPause(false);this.banner('');
    $('#end').classList.add('hidden');$('#lists').classList.add('hidden');ui.hud.classList.add('off');$('#title').classList.remove('hidden');
    if(document.pointerLockElement)document.exitPointerLock();
    if(this.bout){this.bout=null;buildArena(this.sel.arena);refreshArena();} // a tournament bout was fought elsewhere: back to the chosen arena
    refreshMode();refreshSelect(); // stands the picks at the centre again, and shows the record with the match just fought
  },
  onEvent(src,type,data){const o=src.other;if(o.brain)o.brain.notify(type,data);},
};
initCombat(game);

/* ── fighters ──
   Rebuilt only when the pick changes. Picking the same knight on both sides
   dresses the foe in that knight's alternate colours. */
/** who stands opposite: the bout's foe, the pick, or on the title screen of the lists the champion to be unseated */
function foeId(){
  if(game.bout)return game.bout.e;
  const c=Save.data.champion;
  return game.mode==='lists'&&c.id&&!(c.mine&&c.id===game.sel.p)?c.id:game.sel.e;
}
function makeFighters(){
  const pc=CHARACTERS[game.sel.p],ec=CHARACTERS[foeId()],mirror=pc===ec;
  if(!player||player.char!==pc){player&&player.dispose();player=new Fighter(pc,true);}
  if(!enemy||enemy.char!==ec||enemy.mirror!==mirror){enemy&&enemy.dispose();enemy=new Fighter(ec,false,mirror?ec.alt:{});enemy.mirror=mirror;}
  player.other=enemy;enemy.other=player;
  player.emit=(t,d)=>game.onEvent(player,t,d);enemy.emit=(t,d)=>game.onEvent(enemy,t,d);
  player.onStamFail=()=>game.stamFail();
  ui.pName.innerHTML=`${pc.name}<small>${pc.title}</small>`;ui.eName.innerHTML=`<small>${ec.title}</small>${ec.name}`;
  setBannerEmblems(pc.look.emblem,ec.look.emblem);
}
/** on the title screen the two picks face off at the centre of the ring */
function placeForTitle(){player.reset(V(0,0,-1.25),0);enemy.reset(V(0,0,1.25),Math.PI);}

/* ── knight select ── */
const pips=n=>`<span class="meter">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;
function buildSelect(){
  for(const [side,el] of [['p',$('#pCards')],['e',$('#eCards')]]){
    el.innerHTML=ROSTER.map(c=>{const label=`${c.name}, ${c.title} (${WEAPONS[c.weapon].name})`;
      return `<button class="card" data-id="${c.id}" title="${label}" aria-label="${label}"><img alt="" src="${emblemCanvas(c.look.emblem).toDataURL()}"></button>`;}).join('');
    el.addEventListener('click',e=>{const b=e.target.closest('.card');if(!b)return;Snd.init();Snd.click();game.sel[side]=b.dataset.id;refreshSelect();remember();});
  }
  $('#arenaCards').innerHTML=ARENAS.map(a=>`<button class="arena-card ${a.id}" data-arena="${a.id}" aria-pressed="false" aria-describedby="arenaDescription">
    <span class="arena-sigil" aria-hidden="true">${a.sigil}</span>
    <span><small>${a.tag}</small><b>${a.name}</b></span><span class="arena-check" aria-hidden="true">✓</span></button>`).join('');
  $('#arenaCards').addEventListener('click',e=>{
    const b=e.target.closest('[data-arena]');if(!b)return;
    Snd.init();Snd.click();selectArena(b.dataset.arena);remember();
  });
  refreshArena();refreshSelect();
}
function selectArena(id){
  if(game.phase!=='title'||!ARENAS.some(a=>a.id===id))return;
  game.sel.arena=id;game.orbit=ARENAS.find(a=>a.id===id).orbit;buildArena(id);setBannerEmblems(player.char.look.emblem,enemy.char.look.emblem);refreshArena();
}
function refreshArena(){
  const a=ARENAS.find(a=>a.id===game.sel.arena);
  document.querySelectorAll('[data-arena]').forEach(b=>{const on=b.dataset.arena===a.id;b.classList.toggle('sel',on);b.setAttribute('aria-pressed',on);});
  $('#arenaDescription').textContent=a.description;ui.arena.textContent=a.name;
}
/** keep the picks and the difficulty for the next visit */
function remember(){Object.assign(Save.data.sel,game.sel);Save.data.diff=game.diff;Save.data.mode=game.mode;Save.write();}

/* ── the lists (rules in lists.js) ── the mode switch and champion card on the title screen, and the bracket screen */
const emblems={},emblem=id=>emblems[id]||(emblems[id]=emblemCanvas(CHARACTERS[id].look.emblem).toDataURL());
const full=id=>`${CHARACTERS[id].name}, ${CHARACTERS[id].title}`,times=n=>n===1?'once':n===2?'twice':n+' times';
const DIFF_NAME={squire:'Squire',knight:'Knight',warlord:'Warlord'};
function refreshMode(){
  $('#title').dataset.mode=game.mode;
  document.querySelectorAll('#modes button').forEach(b=>{const on=b.dataset.m===game.mode;b.classList.toggle('sel',on);b.setAttribute('aria-pressed',on);});
  const c=Save.data.champion,L=Save.data.lists,past=Save.data.past;
  $('#listsCard').innerHTML=`<div class="pickLabel">The lists</div>
    ${c.id?`<div class="champ"><img alt="" src="${emblem(c.id)}"><div><small>${c.mine?'Your champion':'Reigning champion'}</small><b>${full(c.id)}</b>
      <span>${c.defences?`Has kept the title ${times(c.defences)}`:'Newly crowned'}</span></div></div>`
      :`<div class="champ"><div><small>Reigning champion</small><b>The title is vacant</b><span>Win the lists to take it</span></div></div>`}
    <p>Eight seats and three fights: the Courtyard, the Cloister, then the Crucible. Each is a step harder than the last${c.id?', and the champion waits in the final':''}.</p>
    ${past.length?`<p class="past">Before ${c.mine?'you':'them'}: ${past.slice(0,4).map(q=>`<img alt="${full(q.id)}" title="${full(q.id)}${q.mine?' (yours)':''}" src="${emblem(q.id)}">`).join('')}</p>`:''}
    ${L.entered?`<div class="arm">Entered ${times(L.entered)} · won ${times(L.won).replace('0 times','never')}</div>`:''}`;
  const at=run&&nextBout(run);
  $('#begin').textContent=game.mode!=='lists'?'Enter the ring':run?'Return to the lists':'Enter the lists';
  $('#runNote').innerHTML=game.mode==='lists'&&run?`${full(run.p)} · ${at.stage.name} next <button class="link" id="abandon">Abandon</button>`:'';
}
/** the bracket: every bout by stage, then what happens next */
function showLists(r){
  shown=r;const B=bracket(r),names=['Quarter-finals','Semi-finals','Final'];
  const seat=(i,b)=>{
    if(i===undefined)return `<div class="seat tbd">To be decided</div>`;
    const id=r.seats[i];if(id==null)return `<div class="seat bye">No challenger</div>`;
    const tag=i===0?'You':r.boss&&i===7?'Champion':'';
    return `<div class="seat${i===0?' me':''}${b.won===i?' won':b.won!==undefined?' lost':''}"><img alt="" src="${emblem(id)}"><span>${CHARACTERS[id].name}</span>${tag?`<small>${tag}</small>`:''}</div>`;
  };
  $('#bracket').innerHTML=B.map((col,s)=>`<div class="col"><h4>${names[s]}</h4><div class="bouts">${col.map(b=>`<div class="bout${!r.done&&s===r.round&&b.seats[0]===0?' next':''}">${seat(b.seats[0],b)}${seat(b.seats[1],b)}</div>`).join('')}</div></div>`).join('');
  const c=Save.data.champion;
  if(!r.done){
    const b=nextBout(r),a=ARENAS.find(a=>a.id===b.arena);
    $('#listsTitle').textContent='The Lists';$('#listsTag').textContent=`${b.stage.name} · ${a.name}`;
    $('#listsNote').innerHTML=`You meet <b>${full(b.e)}</b>${b.champion?', the reigning champion':''}. ${DIFF_NAME[b.diff]} difficulty, first to three rounds.`;
    $('#listsGo').textContent='To the ring';$('#listsHome').textContent='Leave for now';
  }else if(r.done==='won'){
    $('#listsTitle').textContent='Champion';$('#listsTag').textContent='The lists are yours';
    $('#listsNote').innerHTML=`<b>${full(c.id)}</b> holds the title${c.defences?`, and has kept it ${times(c.defences)}`:''}.`;
    $('#listsGo').textContent='Home';$('#listsHome').textContent='';
  }else{
    $('#listsTitle').textContent='The Lists';$('#listsTag').textContent='You are out';
    $('#listsNote').innerHTML=`<b>${full(c.id)}</b> ${c.defences?'keeps':'takes'} the title.`;
    $('#listsGo').textContent='Enter again';$('#listsHome').textContent='Home';
  }
  $('#listsHome').classList.toggle('hidden',!$('#listsHome').textContent);
  for(const id of ['#title','#end'])$(id).classList.add('hidden');ui.hud.classList.add('off');$('#lists').classList.remove('hidden');$('#listsGo').focus();
}
/** begin a run, or pick up the one in progress as the knight who entered it */
function enterLists(){
  if(!run){run=Save.data.run=newRun(Save.data,game.sel.p,game.diff);Save.write();}
  if(game.sel.p!==run.p){game.sel.p=run.p;refreshSelect();}
  showLists(run);
}
$('#modes').addEventListener('click',e=>{const m=e.target.dataset.m;if(!m||m===game.mode)return;Snd.init();Snd.click();game.mode=m;refreshMode();refreshSelect();remember();});
$('#runNote').addEventListener('click',e=>{if(e.target.id!=='abandon')return;Snd.click();run=Save.data.run=null;Save.write();refreshMode();});
$('#listsGo').addEventListener('click',()=>{
  Snd.init();Snd.click();
  if(!shown.done){game.bout=nextBout(run);fight();}
  else if(shown.done==='won')game.toTitle();
  else{if(game.phase!=='title')game.toTitle();enterLists();}
});
$('#listsHome').addEventListener('click',()=>{Snd.click();game.toTitle();});
const SLOT={l1:'First light blow',l2:'Second light blow',l3:'Third light blow',heavy:'Heavy attack'};
function refreshSelect(){
  for(const side of ['p','e']){
    document.querySelectorAll(`#${side}Cards .card`).forEach(b=>{const on=b.dataset.id===game.sel[side];b.classList.toggle('sel',on);b.setAttribute('aria-pressed',on);});
    const c=CHARACTERS[game.sel[side]],r=c.rating,rec=side==='p'&&Save.data.record[c.id],won=side==='p'&&Save.data.titles[c.id],
      crown=side==='p'&&Save.data.champion.mine&&Save.data.champion.id===c.id;
    // a blow of the knight's own, in place of one of the weapon's usual attacks
    const own=Object.entries(c.moves||{}).map(([slot,m])=>`<div class="own"><b>${m.name}</b>${SLOT[slot]} · ${m.tip}</div>`).join('');
    $(`#${side}Bio`).innerHTML=`<h3>${c.name}<small>${c.title}</small></h3><div class="arm">${WEAPONS[c.weapon].name}${rec?` · won ${rec.w}, lost ${rec.l}`:''}${crown?' · champion':won?` · ${won} title${won>1?'s':''}`:''}</div><p>${c.blurb}</p>${own}
      <div class="meters"><span>Health</span>${pips(r.health)}<span>Power</span>${pips(r.power)}<span>Speed</span>${pips(r.speed)}<span>Guard</span>${pips(r.guard)}</div>`;
  }
  if(game.phase==='title'){makeFighters();placeForTitle();}
}
function syncDiffButtons(){document.querySelectorAll('.diffs button').forEach(b=>b.classList.toggle('sel',b.dataset.d===game.diff));}

if(DEMO||params.has('debug'))window.__duel={game,FX,inp,renderer,scene,camera,gfx,selectArena,setArenaQuality,step:dt=>step(dt),begin:()=>begin(),
  get player(){return player;},get enemy(){return enemy;},get run(){return run;},select(p,e){game.sel.p=pick(p,game.sel.p);game.sel.e=pick(e,game.sel.e);refreshSelect();},
  /** pin the camera (for screenshots); call with no arguments to release it */
  cam(p,l){camHold=p?{p:V(...p),l:V(...l)}:null;}};

/* ── input ── */
function tryLock(){if(inp.noLock||document.pointerLockElement)return;try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{inp.noLock=true;});}catch(e){inp.noLock=true;}}
document.addEventListener('pointerlockchange',()=>{
  const was=inp.locked;inp.locked=document.pointerLockElement===canvas;
  if(was&&!inp.locked&&(game.phase==='fight'||game.phase==='intro'||game.phase==='roundEnd'))setPause(true);
});
document.addEventListener('pointerlockerror',()=>{inp.noLock=true;});
function setPause(p){game.paused=p;$('#pause').classList.toggle('hidden',!p);if(!p)showSettings(false);}
$('#resume').addEventListener('click',()=>{Snd.click();setPause(false);tryLock();});
$('#quit').addEventListener('click',()=>{Snd.click();game.toTitle();});

/* ── settings ── kept in the save, applied here. Reached from the title screen and from the pause menu. */
const QUALITY={high:2,medium:1,low:0},S=Save.data.settings;
const isOpen=id=>!$(id).classList.contains('hidden');
function showSettings(on){$('#settings').classList.toggle('hidden',!on);if(on){disarm();$('#setBack').focus();}}
const disarm=()=>{const w=$('#wipe');delete w.dataset.sure;w.textContent='Erase saved data';}; // the erase button, back to asking first
/** a fixed level, or 'auto': start at full detail and let the frame-rate watch in frame() lower it */
function setQuality(name){
  autoQ=!(name in QUALITY);applyQuality(autoQ?2:QUALITY[name]);fpsAcc=fpsN=0;
  document.querySelectorAll('#optGfx button').forEach(b=>{const on=b.dataset.q===(autoQ?'auto':name);b.classList.toggle('sel',on);b.setAttribute('aria-pressed',on);});
}
function applyQuality(q){
  quality=q;gfx.pixelRatio=q===2?Math.min(devicePixelRatio||1,2):1;renderer.setPixelRatio(gfx.pixelRatio);gfx.composer&&gfx.composer.setPixelRatio(gfx.pixelRatio);
  gfx.bloomOn=!!gfx.composer&&q>0;setArenaQuality(q);
}
function syncSettings(){
  Snd.volume(S.volume);Snd.mute(S.muted);
  $('#optVol').value=Math.round(S.volume*100);$('#optVolOut').textContent=S.muted?'Muted':Math.round(S.volume*100)+'%';
  $('#optSens').value=Math.round(S.sens*100);$('#optSensOut').textContent=Math.round(S.sens*100)+'%';
}
function toggleMute(){S.muted=!S.muted;syncSettings();Save.write();}
$('#optVol').addEventListener('input',e=>{S.volume=clamp(e.target.value/100,0,1);S.muted=false;syncSettings();Save.write();});
$('#optVol').addEventListener('change',()=>{Snd.init();Snd.clang(.8);}); // let go of the slider: hear the new level
$('#optSens').addEventListener('input',e=>{S.sens=clamp(e.target.value/100,.4,2);syncSettings();Save.write();});
$('#optGfx').addEventListener('click',e=>{const q=e.target.dataset.q;if(!q)return;Snd.init();Snd.click();S.quality=q;setQuality(q);Save.write();});
for(const id of ['#setBtn','#pauseSet'])$(id).addEventListener('click',()=>{Snd.init();Snd.click();showSettings(true);});
$('#setBack').addEventListener('click',()=>{Snd.click();showSettings(false);});
$('#wipe').addEventListener('click',e=>{ // asks once more, then starts over from a clean page
  if(e.target.dataset.sure){Save.wipe();location.reload();return;}
  e.target.dataset.sure=1;e.target.textContent='Erase settings and records? Click again';setTimeout(disarm,4000);
});

addEventListener('mousemove',e=>{
  if(inp.locked){ // clamp: some browsers report one huge bogus delta right after locking
    if(!inp.focus)inp.aim-=clamp(e.movementX,-160,160)*.0026*S.sens;inp.pitch=clamp(inp.pitch+clamp(e.movementY,-160,160)*.0018*S.sens,-.05,.75);}
  inp.mx=(e.clientX/innerWidth)*2-1;
});
const inMenu=()=>game.phase==='title'||game.phase==='matchEnd';
/** is the key going to a button that will act on it itself? (one just hidden can still hold the focus for a moment) */
const onButton=e=>{const b=e.target.closest('button');return !!b&&b.getClientRects().length>0;};
addEventListener('mousedown',e=>{
  if(inMenu()||game.paused)return;
  if(!inp.locked)tryLock();
  if(e.button===0)inp.light=true;else if(e.button===2)inp.heavy=true;
});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
  if(e.repeat)return;const k=e.code;inp.keys[k]=true;
  if(k==='KeyM')toggleMute();
  if(k==='Escape'&&isOpen('#settings')){showSettings(false);return;}
  // Let native buttons handle Tab, Space and Enter on selection/help screens.
  if(inMenu()){
    if(isOpen('#settings'))return;
    if(isOpen('#lists')){if(k==='Enter'&&!onButton(e)){e.preventDefault();$('#listsGo').click();}if(k==='Escape')game.toTitle();return;}
    if((k==='Enter'||k==='KeyR')&&game.phase==='matchEnd'&&!onButton(e)){e.preventDefault();again();} // (the screen it opens focuses a button: this key must not press it too)
    if(k==='Escape'&&game.phase==='matchEnd')game.toTitle();
    if(k==='Enter'&&game.phase==='title'&&!isOpen('#how')&&!onButton(e)){e.preventDefault();begin();}
    return;
  }
  if(k==='KeyP'){setPause(!game.paused);if(!game.paused)tryLock();}
  if(game.paused)return; // the pause menu's buttons and sliders take the keys
  if(['Space','ShiftLeft','ShiftRight','KeyW','KeyA','KeyS','KeyD','Tab'].includes(k))e.preventDefault();
  if(k==='Space')inp.blockPressed=true;
  if(k==='ShiftLeft'||k==='ShiftRight')inp.dodge=true;
  if(k==='KeyJ')inp.light=true;if(k==='KeyK')inp.heavy=true;
  if(k==='KeyQ'||k==='Tab'){inp.focus=!inp.focus;ui.focus.classList.toggle('on',inp.focus);ui.focus.textContent=inp.focus?'Q · Focused':'Q · Focus';}
});
addEventListener('keyup',e=>{inp.keys[e.code]=false;});
addEventListener('blur',()=>{inp.keys={};if(game.phase==='fight'&&!DEMO)setPause(true);});
function fight(){tryLock();setPause(false);game.startMatch();}
/** the title screen's main button: a duel, or into the lists */
function begin(){Snd.init();Snd.click();if(game.mode==='lists')enterLists();else fight();}
/** after a match: the same duel again, or back to the bracket */
function again(){Snd.init();Snd.click();if(game.bout)showLists(shown);else fight();}
$('#begin').addEventListener('click',begin);$('#again').addEventListener('click',again);$('#onward').addEventListener('click',again);
$('#menu').addEventListener('click',()=>{Snd.click();game.toTitle();});
$('#howBtn').addEventListener('click',()=>{Snd.init();Snd.click();$('#how').classList.remove('hidden');});
$('#howBack').addEventListener('click',()=>{Snd.click();$('#how').classList.add('hidden');});
for(const id of ['#diffs','#diffs2'])$(id).addEventListener('click',e=>{const d=e.target.dataset.d;if(!d)return;game.diff=d;Snd.init();Snd.click();syncDiffButtons();remember();});

function playerIntent(dt){
  const I=player.intent,k=inp.keys,toE=Math.atan2(enemy.pos.x-player.pos.x,enemy.pos.z-player.pos.z);
  if(inp.focus&&enemy.state!=='dead')inp.aim+=angDiff(inp.aim,toE)*(1-Math.exp(-12*dt));
  else if(!inp.locked&&Math.abs(inp.mx)>.14)inp.aim-=Math.sign(inp.mx)*(Math.abs(inp.mx)-.14)*3.4*dt; // no pointer lock: steer by cursor offset
  const f=(k.KeyW?1:0)-(k.KeyS?1:0),r=(k.KeyD?1:0)-(k.KeyA?1:0),sn=Math.sin(inp.aim),cs=Math.cos(inp.aim);
  let mx=sn*f-cs*r,mz=cs*f+sn*r;const m=Math.hypot(mx,mz);if(m>1){mx/=m;mz/=m;}
  I.mx=mx;I.mz=mz;I.face=inp.aim;I.block=!!(k.Space||k.KeyL);
  I.light=inp.light;I.heavy=inp.heavy;I.dodge=inp.dodge;I.blockPressed=inp.blockPressed;
  inp.light=inp.heavy=inp.dodge=inp.blockPressed=false;
}
const idle=f=>{const I=f.intent;I.mx=I.mz=0;I.block=I.light=I.heavy=I.dodge=I.blockPressed=I.taunt=false;};

/* ── simulation step ── */
function step(dt){
  game.time+=dt;game.timer+=dt;
  const fight=game.phase==='fight';
  if(fight){if(player.brain)player.brain.update(dt);else playerIntent(dt);enemy.brain.update(dt);}
  else{
    idle(player);idle(enemy);inp.light=inp.heavy=inp.dodge=inp.blockPressed=false;
    if(game.phase==='intro'||game.phase==='roundEnd'){ // you may still look around
      if(!inp.locked&&!player.brain&&Math.abs(inp.mx)>.14&&game.phase==='intro')inp.aim-=Math.sign(inp.mx)*(Math.abs(inp.mx)-.14)*3.4*dt;
      player.intent.face=player.brain?player.yaw:inp.aim;enemy.intent.face=Math.atan2(player.pos.x-enemy.pos.x,player.pos.z-enemy.pos.z);
    }else if(game.phase==='title'){player.intent.face=0;enemy.intent.face=Math.PI;}
  }
  for(const f of [player,enemy]){
    f.pBlade[0].copy(f.blade[0]);f.pBlade[1].copy(f.blade[1]);
    f.update(dt);
  }
  // bodies cannot overlap
  if(player.state!=='dead'&&enemy.state!=='dead'){
    const dx=enemy.pos.x-player.pos.x,dz=enemy.pos.z-player.pos.z,d=Math.hypot(dx,dz)||1e-3,min=.41*(player.root.scale.x+enemy.root.scale.x);
    if(d<min){const push=(min-d)/2;player.pos.x-=dx/d*push;player.pos.z-=dz/d*push;enemy.pos.x+=dx/d*push;enemy.pos.z+=dz/d*push;}
  }
  for(const f of [player,enemy]){
    if(f.ragdoll)f.ragdoll.update(dt);else f.animate(dt);
    f.root.updateMatrixWorld(true);
    if(!f.ragdoll)f.readBlade();
  }
  if(fight){ // random order, so neither side always wins a same-instant trade
    const [f1,f2]=Math.random()<.5?[player,enemy]:[enemy,player];
    sweep(f1,f2);if(game.phase==='fight')sweep(f2,f1);}
  // flow
  if(game.phase==='intro'){
    if(game.timer>1.5&&!game.gonged){game.gonged=true;Snd.gong();game.banner('Fight','');}
    if(game.timer>2.1){game.phase='fight';game.banner('');}
  }else if(game.phase==='roundEnd'){
    const won=game.winner===player,over=game.score[0]>=3||game.score[1]>=3;
    if(game.timer>1.3&&game.timer<1.3+dt*1.5)game.banner(won?'Round won':'Round lost',over?'':`${game.score[0]} — ${game.score[1]}`);
    if(game.timer>4.2){if(over)game.endMatch();else{game.round++;game.startRound();}}
  }
}

/* ── per-frame visuals ── */
const camPos=V(0,3,-8),camLook=V(0,1.2,0),_cp=V(),_cl=V(),_a=V();
let camHold=null;
function updateCamera(dt,real){
  if(camHold){camera.position.copy(camHold.p);camera.lookAt(camHold.l);return;}
  const ph=game.phase;
  if(ph==='title'||ph==='matchEnd'){
    game.orbit+=real*.11;const c=ph==='matchEnd'&&game.winner?game.winner.pos:_cl.set(0,0,0);
    _cp.set(c.x+Math.sin(game.orbit)*6.6,2.1+Math.sin(game.orbit*.7)*.5,c.z+Math.cos(game.orbit)*6.6);
    camPos.lerp(_cp,1-Math.exp(-2*real));camLook.lerp(_cl.set(c.x,1.15,c.z),1-Math.exp(-2*real));
  }else{
    const yaw=player.brain?player.yaw:inp.aim;game.camYaw+=angDiff(game.camYaw,yaw)*(1-Math.exp(-(player.brain?3:16)*real));
    const sn=Math.sin(game.camYaw),cs=Math.cos(game.camYaw),dist=3.9*Math.sqrt(player.root.scale.x),pit=inp.pitch;
    const P_=player.ragdoll?player.b.hips.position:player.pos;
    _cp.set(P_.x-sn*dist*Math.cos(pit)-cs*.95,1.7+dist*Math.sin(pit),P_.z-cs*dist*Math.cos(pit)+sn*.95);
    const r=Math.hypot(_cp.x,_cp.z),mx=WALL_R-.9;if(r>mx){_cp.x*=mx/r;_cp.z*=mx/r;}
    _cl.set(P_.x+sn*2.6,1.25-pit*.9,P_.z+cs*2.6);
    if(ph==='roundEnd'&&game.winner===enemy)_cl.lerp(enemy.pos,.5).setY(1.1);
    camPos.lerp(_cp,1-Math.exp(-14*real));camLook.lerp(_cl,1-Math.exp(-14*real));
  }
  const tr=FX.trauma*FX.trauma,t=performance.now()*.001;
  camera.position.set(camPos.x+Math.sin(t*61)*tr*.22,camPos.y+Math.sin(t*73+1)*tr*.2,camPos.z+Math.sin(t*67+2)*tr*.22);
  camera.lookAt(camLook);camera.rotateZ(Math.sin(t*53)*tr*.035);
  const fov=56+FX.fovKick;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
}
function updateHud(real){
  const bar=(el,v,max)=>el.style.transform=`scaleX(${Math.max(0,v)/max})`;
  bar(ui.pHp,player.hp,player.maxHp);bar(ui.pGhost,player.ghost,player.maxHp);bar(ui.pSt,player.stam,player.maxSt);
  bar(ui.eHp,enemy.hp,enemy.maxHp);bar(ui.eGhost,enemy.ghost,enemy.maxHp);bar(ui.eSt,enemy.stam,enemy.maxSt);
  game.vig=Math.max(0,game.vig-real*1.6);
  const low=game.phase==='fight'&&player.hp<player.maxHp*.3?(.25+.12*Math.sin(game.time*5)):0;
  ui.vig.style.opacity=Math.max(game.vig,low);
}
function updateTrails(){
  for(const f of [player,enemy]){
    let s=0,hot=false;
    if(f.state==='attack'){s=f.phase==='active'?1:f.phase==='wind'?(f.st>f.atk.wind-.08?.5:0):Math.max(0,.6-(f.st-f.atk.wind-f.atk.act)*5);hot=f.atk.kind==='heavy'&&!f.atk.charged;if(f.atk.shield)s=0;} // a charged blow keeps the knight's own colour, to match its glow
    _a.lerpVectors(f.blade[0],f.blade[1],.35);f.trail.push(_a,f.blade[1],f.ragdoll?0:s,hot);
    const ey=f.root.userData.eyes; // glowing eyes flare during a heavy windup
    if(ey){const k=f.state==='attack'&&f.atk.kind==='heavy'&&f.phase==='wind'?1:0;ey.color.setRGB(6+k*14,.5+k*2,.2);}
    const ch=f.root.userData.charge; // a charged blow: the head kindles through the windup, flares as it is loosed, then cools
    if(ch){const a=f.atk,on=f.state==='attack'&&a.charged&&!f.ragdoll;
      const k=!on?0:f.phase==='wind'?Math.pow(f.st/a.wind,2.2)*.8:f.phase==='active'?1.8:Math.max(0,1.2-(f.st-a.wind-a.act)*5);
      ch.emissiveIntensity+=(k*3.2-ch.emissiveIntensity)*.3;}
  }
}

/* ── main loop ── */
let last=performance.now(),fpsAcc=0,fpsN=0,quality=2,autoQ=true;
function frame(now){
  requestAnimationFrame(frame);
  const real=Math.min(.05,(now-last)/1000);last=now;
  if(!game.paused){
    let dt=FX.time(real);
    for(let n=Math.ceil(dt/(1/90));n>0&&dt>0;n--){const h=Math.min(dt,1/90);step(h);dt-=h;}
    const sdt=real*(game.phase==='roundEnd'&&game.timer<1.2?.4:1);
    FX.update(sdt,real);updateTrails();
    Snd.tick(real,game.phase==='fight',1-Math.min(player.hp/player.maxHp,enemy.hp/enemy.maxHp));
  }
  updateEnvironment(real,now*.001);updateCamera(real,real);updateHud(real);
  if(gfx.composer&&gfx.bloomOn)gfx.composer.render();else renderer.render(scene,camera);
  // adaptive quality: shed cost if the machine is struggling
  fpsAcc+=real;fpsN++;
  if(fpsAcc>3){const fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;
    if(autoQ&&fps<38&&quality>0)applyQuality(quality-1);}
}
buildSelect();refreshMode();syncDiffButtons();game.pips();syncSettings();setQuality(S.quality);
window.__booted=true;
if(DEMO)begin();
requestAnimationFrame(frame);
