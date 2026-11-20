// Saving, settings and the pause menu.
// node tests/save.mjs -- optional SAVE_SHOTS=/path for review captures.
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
const state=()=>page.evaluate(()=>{const D=window.__duel;return {p:D.player.char.id,e:D.enemy.char.id,arena:D.game.sel.arena,diff:D.game.diff,phase:D.game.phase,paused:D.game.paused};});
const visible=id=>page.locator(id).isVisible();
const slide=(id,v)=>page.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},v);
const shot=async name=>{if(process.env.SAVE_SHOTS){fs.mkdirSync(process.env.SAVE_SHOTS,{recursive:true});await page.screenshot({path:`${process.env.SAVE_SHOTS}/${name}.png`});}};
try{
  await boot();
  assert.equal(await saved(),null,'nothing is written until something changes');
  // picks and difficulty come back on the next visit; a link still wins over them
  await page.locator('#pCards [data-id="ysolde"]').click();await page.locator('#eCards [data-id="brann"]').click();
  await page.locator('[data-arena="starfall"]').click();await page.locator('#diffs [data-d="warlord"]').click();
  await boot();
  assert.deepEqual(await state(),{p:'ysolde',e:'brann',arena:'starfall',diff:'warlord',phase:'title',paused:false});
  assert.equal(await page.locator('#diffs .sel').getAttribute('data-d'),'warlord');
  await boot('?debug&silent&p=corvin&arena=wyrmfire');
  assert.equal((await state()).p,'corvin');assert.equal((await state()).arena,'wyrmfire');assert.equal((await saved()).sel.p,'ysolde');
  await boot();
  // settings: each control is applied at once and kept
  await page.locator('#setBtn').click();assert.equal(await visible('#settings'),true);
  await slide('#optVol',40);await slide('#optSens',150);await page.locator('#optGfx [data-q="low"]').click();
  assert.equal(await page.locator('#optVolOut').textContent(),'40%');assert.equal(await page.locator('#optSensOut').textContent(),'150%');
  assert.deepEqual((await saved()).settings,{volume:.4,muted:false,sens:1.5,quality:'low'});
  assert.equal(await page.evaluate(()=>window.__duel.gfx.bloomOn),false,'low turns the bloom pass off');
  await page.locator('#optGfx [data-q="high"]').click();
  assert.equal(await page.evaluate(()=>window.__duel.gfx.bloomOn===!!window.__duel.gfx.composer),true,'and high brings it back');
  await page.keyboard.press('KeyM');assert.equal(await page.locator('#optVolOut').textContent(),'Muted');assert.equal((await saved()).settings.muted,true);
  await slide('#optVol',45);assert.equal((await saved()).settings.muted,false,'moving the volume unmutes');
  await shot('settings');
  await page.keyboard.press('Enter');assert.equal((await state()).phase,'title','Enter on the settings screen does not start a match');
  await page.keyboard.press('Escape');assert.equal(await visible('#settings'),false);
  await boot();
  assert.deepEqual((await saved()).settings,{volume:.45,muted:false,sens:1.5,quality:'high'});
  assert.equal(await page.locator('#optGfx .sel').getAttribute('data-q'),'high');assert.equal(await page.locator('#optSens').inputValue(),'150');
  // a finished match is counted for the knight you fought as, and shown beside them
  await page.locator('#begin').click();
  await page.evaluate(()=>{const D=window.__duel;D.game.score=[3,1];D.game.endMatch();});
  await page.locator('#again').click();
  await page.evaluate(()=>{const D=window.__duel;D.game.score=[2,3];D.game.endMatch();});
  assert.deepEqual((await saved()).record,{ysolde:{w:1,l:1}});
  await page.getByRole('button',{name:'Home',exact:true}).click();
  assert.match(await page.locator('#pBio .arm').textContent(),/won 1, lost 1/);assert.doesNotMatch(await page.locator('#eBio .arm').textContent(),/won/);
  assert.match(await page.locator('#pBio .own').textContent(),/The Long Thorn/);
  await shot('title');
  // the pause menu: resume, settings, leave. Leaving a fight is not counted as a loss.
  await page.locator('#begin').click();await page.evaluate(()=>{const D=window.__duel;for(let i=0;i<220;i++)D.step(1/90);});
  assert.equal((await state()).phase,'fight');
  await page.keyboard.press('KeyP');assert.equal(await visible('#pause'),true);assert.equal((await state()).paused,true);
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__duel.inp.blockPressed),false,'keys do not reach the fight while paused');
  await shot('pause');
  await page.locator('#pauseSet').click();assert.equal(await visible('#settings'),true);
  await page.locator('#setBack').click();assert.equal(await visible('#settings'),false);assert.equal(await visible('#pause'),true);
  await page.locator('#resume').click();assert.equal((await state()).paused,false);assert.equal(await visible('#pause'),false);
  await page.keyboard.press('KeyP');await page.locator('#pauseSet').click();await page.keyboard.press('KeyP');
  assert.equal(await visible('#settings'),false,'unpausing closes the settings too');assert.equal((await state()).paused,false);
  await page.keyboard.press('KeyP');await page.locator('#quit').click();
  assert.deepEqual([(await state()).phase,(await state()).paused,await visible('#pause'),await visible('#title')],['title',false,false,true]);
  assert.deepEqual((await saved()).record,{ysolde:{w:1,l:1}});
  // a damaged save is repaired field by field
  await page.evaluate(()=>localStorage.setItem('duel-knights',JSON.stringify({settings:{volume:'loud',sens:1.2,quality:7},diff:'emperor',sel:{p:'nobody',arena:'moon'},record:{brann:{w:2,l:0},x:'y'}})));
  await boot();
  assert.deepEqual(await state(),{p:'caldwin',e:'varkos',arena:'courtyard',diff:'knight',phase:'title',paused:false});
  assert.equal(await page.locator('#optVol').inputValue(),'100');assert.equal(await page.locator('#optSens').inputValue(),'120');assert.equal(await page.locator('#optGfx .sel').getAttribute('data-q'),'auto');
  await page.locator('#pCards [data-id="brann"]').click();assert.match(await page.locator('#pBio .arm').textContent(),/won 2, lost 0/);
  // erasing asks twice, then starts clean
  await page.locator('#setBtn').click();await page.locator('#wipe').click();
  assert.notEqual(await saved(),null);assert.match(await page.locator('#wipe').textContent(),/Click again/);
  await page.locator('#wipe').click();await page.waitForFunction(()=>window.__booted&&window.__duel&&!localStorage.getItem('duel-knights'));
  assert.equal((await state()).p,'caldwin');
  // with storage blocked the game still runs, on defaults
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}});});
  await boot();await page.locator('#pCards [data-id="sigrun"]').click();await page.locator('#setBtn').click();await slide('#optVol',20);
  assert.equal((await state()).p,'sigrun');assert.equal(await page.locator('#optVolOut').textContent(),'20%');
  assert.deepEqual(errors,[]);console.log('PASS: saved picks, settings, match record, pause menu, damaged and blocked saves');
}finally{await run.close();}
