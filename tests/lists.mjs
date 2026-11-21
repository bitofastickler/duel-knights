// The lists: the tournament's rules, its screens, and the champion it leaves behind.
// node tests/lists.mjs -- optional LISTS_SHOTS=/path for review captures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchGame} from './browser.mjs';
const run=await launchGame(),{page,errors,url}=run;
// The render loop is stopped after boot: nothing here needs a frame, and a software GPU is slow to draw them.
const boot=async(query='?debug&silent')=>{
  await page.goto(url+query);await page.waitForFunction(()=>window.__booted);
  await page.evaluate(()=>new Promise(resolve=>{const raf=requestAnimationFrame;requestAnimationFrame=()=>0;raf(()=>{window.__duel.inp.noLock=true;resolve();});}));
};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('duel-knights')));
const state=()=>page.evaluate(async()=>{const D=window.__duel,{arenaId}=await import('/src/arena.js');
  return {phase:D.game.phase,p:D.player.char.id,e:D.enemy.char.id,arena:arenaId(),react:D.enemy.brain&&D.enemy.brain.cfg.react[0],mirror:!!D.enemy.mirror,run:D.run&&JSON.parse(JSON.stringify(D.run))};});
const visible=id=>page.locator(id).isVisible();
const text=id=>page.locator(id).textContent();
const finish=(mine,theirs)=>page.evaluate(([a,b])=>{const D=window.__duel;D.game.score=[a,b];D.game.endMatch();},[mine,theirs]);
const shot=async name=>{if(process.env.LISTS_SHOTS){fs.mkdirSync(process.env.LISTS_SHOTS,{recursive:true});await page.screenshot({path:`${process.env.LISTS_SHOTS}/${name}.png`});}};
const REACT={squire:.30,knight:.20,warlord:.13}; // the quickest reaction of each difficulty (brain.js) tells them apart
/** fight the bout on the bracket screen and force its result; returns what was fought */
async function fight(win){
  await page.locator('#listsGo').click();const s=await state();assert.equal(s.phase,'intro');
  await finish(win?3:1,win?1:3);return s;
}
try{
  // ── the rules, on a save of their own: a few thousand runs with random picks and results
  await boot();
  const broken=await page.evaluate(async()=>{
    const L=await import('/src/lists.js'),ids=[...document.querySelectorAll('#pCards .card')].map(b=>b.dataset.id);let bad=[];
    for(let t=0;t<3000&&!bad.length;t++){
      const d={champion:{id:'',mine:false,defences:0},past:[],titles:{},lists:{entered:0,won:0}};
      for(let k=0;k<6;k++){
        const p=ids[Math.random()*ids.length|0],was={...d.champion},r=L.newRun(d,p,'knight'),own=was.id===p&&was.mine,boss=!!was.id&&!own;
        const check=(ok,why)=>{if(!ok)bad.push(why+' '+JSON.stringify({was,r}));};
        check(L.validRun(r),'new run is valid');check(r.boss===boss&&r.defending===own,'who holds the title');
        check(!boss||r.seats[7]===was.id,'the champion sits in seat 7');
        check(r.seats.filter(x=>x===null).length===(boss&&was.id===p?0:1)&&r.seats[6]===null===!(boss&&was.id===p),'one empty seat unless the champion makes eight');
        check(new Set(r.seats.slice(0,7).filter(Boolean)).size===r.seats.slice(0,7).filter(Boolean).length,'no challenger enters twice');
        while(!r.done){const b=L.bout(r);check(!!b.e,'a foe every stage');check(b.champion===(boss&&r.round===2),'the champion is met in the final and only there');
          L.report(d,r,Math.random()<.6);if(!r.done)check(L.validRun(JSON.parse(JSON.stringify(r))),'a run in progress survives saving');}
        const c=d.champion;
        if(r.done==='won')check(c.id===p&&c.mine&&c.defences===(own?was.defences+1:0)&&d.titles[p]>0,'a win takes or keeps the title');
        else if(boss)check(c.id===was.id&&c.mine===was.mine&&c.defences===was.defences+1,'the champion keeps the title when the player falls');
        else check(!!c.id&&!c.mine&&c.defences===0,'someone else takes a vacant or lost title');
        check(d.past.length<=8,'history is capped');
      }
    }
    return bad.slice(0,3);
  });
  assert.deepEqual(broken,[]);
  assert.deepEqual(await page.evaluate(async()=>{const L=await import('/src/lists.js');return ['squire','knight','warlord'].map(b=>[0,1,2].map(r=>L.stageDiff(b,r)));}),
    [['squire','squire','knight'],['squire','knight','warlord'],['knight','warlord','warlord']]);
  console.log('Rules: seating, the champion\'s path and the title hold over 18,000 random runs');

  // ── a first run with the title vacant: win all three
  await page.locator('#pCards [data-id="ysolde"]').click();
  assert.equal(await visible('#listsCard'),false);
  await page.locator('#modes [data-m="lists"]').click();
  assert.deepEqual([await visible('#listsCard'),await visible('#eCards'),await visible('#arenaCards')],[true,false,false]);
  assert.match(await text('#listsCard'),/The title is vacant/);assert.equal(await text('#begin'),'Enter the lists');
  await shot('title-vacant');
  await page.locator('#begin').click();assert.equal(await visible('#lists'),true);
  let s=await state();
  assert.equal(s.run.seats[0],'ysolde');assert.equal(s.run.seats[6],null);assert.equal(s.run.boss,false);
  assert.equal(await page.locator('#bracket .seat').count(),14);assert.equal(await page.locator('#bracket .seat.bye').count(),1);assert.equal(await page.locator('#bracket .seat.tbd').count(),6);
  assert.match(await text('#listsTag'),/Quarter-final · Ashen Courtyard/);assert.match(await text('#listsNote'),/Squire difficulty/);
  assert.equal((await saved()).lists.entered,1);assert.deepEqual((await saved()).run,s.run);
  await shot('bracket-start');
  let f=await fight(true);
  assert.deepEqual([f.p,f.e,f.arena,f.react],['ysolde',s.run.seats[1],'courtyard',REACT.squire]);
  assert.deepEqual([await visible('#onward'),await visible('#again'),await visible('#diffs2')],[true,false,false]);
  assert.equal(await text('#endTitle'),'Victory');
  await page.locator('#onward').click();
  assert.match(await text('#listsTag'),/Semi-final · Starfall Cloister/);assert.equal(await page.locator('#bracket .seat.tbd').count(),2);
  assert.equal(await page.locator('#bracket .bout.next').count(),1);
  await shot('bracket-semi');
  // leave, close the game, come back: the run is where it was
  await page.locator('#listsHome').click();assert.equal((await state()).phase,'title');assert.equal(await text('#begin'),'Return to the lists');
  await boot();
  assert.equal(await page.locator('#title').getAttribute('data-mode'),'lists');assert.match(await text('#runNote'),/Ysolde, the Thorn · Semi-final next/);
  await page.locator('#pCards [data-id="brann"]').click(); // a different pick does not change who is in the lists
  await page.locator('#begin').click();s=await state();assert.equal(s.p,'ysolde');assert.equal(s.run.round,1);
  // walking out of a bout leaves the run at that bout
  await page.locator('#listsGo').click();await page.evaluate(()=>{const D=window.__duel;for(let i=0;i<220;i++)D.step(1/90);});
  await page.keyboard.press('KeyP');await page.locator('#quit').click();
  assert.equal((await state()).run.round,1);assert.equal((await state()).arena,(await saved()).sel.arena,'home is the chosen arena again');
  await page.locator('#begin').click();
  f=await fight(true);assert.deepEqual([f.arena,f.react,f.e],['starfall',REACT.knight,s.run.seats[s.run.w[0][1]]]);
  await page.keyboard.press('Enter');assert.equal(await visible('#lists'),true,'Enter after a bout goes back to the bracket');
  assert.match(await text('#listsTag'),/Final · Wyrmfire Crucible/);
  f=await fight(true);assert.deepEqual([f.arena,f.react],['wyrmfire',REACT.warlord]);
  assert.equal(await text('#endTitle'),'Champion');assert.equal(await text('#onward'),'See the lists');
  let d=await saved();
  assert.deepEqual([d.champion,d.titles,d.lists,d.run,d.past],[{id:'ysolde',mine:true,defences:0},{ysolde:1},{entered:1,won:1},null,[]]);
  assert.deepEqual(d.record.ysolde,{w:3,l:0});
  await page.locator('#onward').click();assert.equal(await text('#listsTitle'),'Champion');assert.equal(await page.locator('#bracket .seat.tbd').count(),0);
  await shot('bracket-champion');
  await page.locator('#listsGo').click();assert.equal((await state()).phase,'title');
  assert.match(await text('#listsCard'),/Your champion.*Ysolde, the Thorn.*Newly crowned/s);assert.match(await text('#pBio .arm'),/champion/);
  await shot('title-champion');

  // ── as another knight: your old champion is the one to beat, and keeps the title if you fall
  await page.locator('#pCards [data-id="brann"]').click();await page.locator('#diffs [data-d="warlord"]').click();await page.locator('#begin').click();
  s=await state();
  assert.deepEqual([s.run.boss,s.run.defending,s.run.seats[7],s.run.seats[6]],[true,false,'ysolde',null]);
  assert.equal(s.run.seats.filter(x=>x==='ysolde').length,1);assert.equal(await page.locator('#bracket .seat small').filter({hasText:'Champion'}).count(),1);
  f=await fight(true);assert.equal(f.react,REACT.knight);await page.locator('#onward').click();
  f=await fight(true);assert.equal(f.react,REACT.warlord);await page.locator('#onward').click();
  assert.match(await text('#listsNote'),/Ysolde, the Thorn, the reigning champion/);
  f=await fight(false);assert.equal(f.e,'ysolde');
  assert.equal(await text('#endTitle'),'Defeat');await page.locator('#onward').click();
  assert.match(await text('#listsTag'),/You are out/);assert.match(await text('#listsNote'),/Ysolde, the Thorn keeps the title/);
  d=await saved();assert.deepEqual([d.champion,d.lists,d.run],[{id:'ysolde',mine:true,defences:1},{entered:2,won:1},null]);
  // "Enter again" starts a fresh run straight from the bracket screen
  await page.locator('#listsGo').click();s=await state();assert.equal(await visible('#lists'),true);assert.equal(s.run.round,0);assert.equal(s.run.p,'brann');
  assert.equal((await saved()).lists.entered,3);
  // fall in the first bout: the rest is played out without you and the champion still stands
  f=await fight(false);await page.locator('#onward').click();
  assert.equal(await page.locator('#bracket .seat.tbd').count(),0);assert.equal((await saved()).champion.defences,2);
  await page.locator('#listsHome').click();
  assert.match(await text('#listsCard'),/Has kept the title twice/);

  // ── defending: your own champion enters as you, and losing hands the title on
  await page.locator('#pCards [data-id="ysolde"]').click();await page.locator('#begin').click();
  s=await state();assert.deepEqual([s.run.boss,s.run.defending,s.run.seats[6]],[false,true,null]);
  await fight(false);d=await saved();
  assert.equal(d.champion.mine,false);assert.notEqual(d.champion.id,'');assert.deepEqual(d.past,[{id:'ysolde',mine:true,defences:2}]);
  const holder=d.champion.id;
  await page.locator('#onward').click();assert.match(await text('#listsNote'),/takes the title/);await page.locator('#listsHome').click();
  assert.match(await text('#listsCard'),/Reigning champion/);assert.equal(await page.locator('#listsCard .past img').count(),1);
  assert.equal((await state()).e,holder===(await state()).p?(await saved()).sel.e:holder,'the champion stands opposite on the home screen');
  // the same knight as a champion who is not yours: both enter, and meet in each other's colours
  await page.locator(`#pCards [data-id="${holder}"]`).click();await page.locator('#begin').click();
  s=await state();assert.deepEqual([s.run.boss,s.run.seats[0],s.run.seats[7],s.run.seats.includes(null)],[true,holder,holder,false]);
  await fight(true);await page.locator('#onward').click();await fight(true);await page.locator('#onward').click();
  f=await fight(true);assert.deepEqual([f.e,f.mirror],[holder,true]);
  d=await saved();assert.deepEqual(d.champion,{id:holder,mine:true,defences:0});assert.deepEqual(d.past[0],{id:holder,mine:false,defences:0});
  await page.getByRole('button',{name:'Home',exact:true}).click();assert.equal((await state()).phase,'title');

  // ── abandoning a run, switching back to duels, and a save this game cannot use
  await page.locator('#begin').click();await page.locator('#listsHome').click();assert.notEqual((await saved()).run,null);
  await page.locator('#abandon').click();assert.equal((await saved()).run,null);assert.equal(await text('#begin'),'Enter the lists');
  await page.locator('#modes [data-m="duel"]').click();
  assert.deepEqual([await visible('#listsCard'),await visible('#eCards'),await visible('#arenaCards'),await text('#begin')],[false,true,true,'Enter the ring']);
  await page.locator('#begin').click();await finish(3,0);assert.deepEqual([await visible('#again'),await visible('#onward')],[true,false]);
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('duel-knights'));d.mode='lists';d.run={p:'nobody',seats:[1,2],round:9};d.champion={id:'ghost',mine:true,defences:4};d.past=[{id:'ghost'},{id:'brann',mine:1,defences:2},7];
    localStorage.setItem('duel-knights',JSON.stringify(d));});
  await boot();
  assert.equal((await state()).run,null);assert.match(await text('#listsCard'),/The title is vacant/);assert.equal(await page.locator('#listsCard .past img').count(),1);
  for(const [width,height] of [[1280,720],[800,600],[390,844]]){
    await page.setViewportSize({width,height});await page.locator('#begin').evaluate(e=>e.scrollIntoView({block:'center'}));
    let b=await page.locator('#begin').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1,`#begin clipped at ${width}px`);
    await page.locator('#begin').click();await page.locator('#listsGo').evaluate(e=>e.scrollIntoView({block:'center'}));
    b=await page.locator('#listsGo').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=height+1,`#listsGo clipped at ${width}x${height}`);
    assert.ok(await page.locator('#bracket').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`bracket overflows at ${width}px`);
    await shot('bracket-'+width);await page.keyboard.press('Escape');assert.equal((await state()).phase,'title');
  }
  assert.deepEqual(errors,[]);console.log('PASS: a vacant title won, resumed runs, the champion as final foe, defending, a mirror final, abandoning, small screens');
}finally{await run.close();}
