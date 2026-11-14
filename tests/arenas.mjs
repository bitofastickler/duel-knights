// UI, arena lifecycle and render-budget regression checks (no FPS assumptions).
// node tests/arenas.mjs -- optional ARENA_SHOTS=/path for review captures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchGame} from './browser.mjs';
const run=await launchGame(),{page,errors,url}=run;
const selected=()=>page.locator('[data-arena][aria-pressed="true"]').getAttribute('data-arena');
const state=()=>page.evaluate(()=>({arena:window.__duel.game.sel.arena,phase:window.__duel.game.phase,p:window.__duel.player.char.id,e:window.__duel.enemy.char.id}));
const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const measure=()=>page.evaluate(()=>{
  const D=window.__duel;D.setArenaQuality(2);D.camera.position.set(0,3.4,-9);D.camera.lookAt(0,2.8,5);D.renderer.info.autoReset=false;D.renderer.info.reset();
  D.renderer.render(D.scene,D.camera);
  const result={...D.renderer.info.render,...D.renderer.info.memory,pointLights:0,shadowLights:0,arenas:0};
  D.scene.traverse(o=>{if(o.isPointLight){result.pointLights++;if(o.castShadow)result.shadowLights++;}if(o.name.startsWith('arena:'))result.arenas++;});
  D.renderer.info.autoReset=true;return result;
});
try{
  assert.equal(await selected(),'courtyard');
  await page.evaluate(()=>{window.__duel.inp.noLock=true;window.__duel.cam([0,3.4,-9],[0,2.8,5]);});
  const baseline=await measure();
  await page.locator('[data-arena="starfall"]').click();await settle();
  assert.equal(await selected(),'starfall');
  const starfall=await measure();
  assert.ok(starfall.calls<=baseline.calls,`Draw calls: ${starfall.calls} > ${baseline.calls}`);
  assert.ok(starfall.triangles<=baseline.triangles,`Triangles: ${starfall.triangles} > ${baseline.triangles}`);
  assert.ok(starfall.shadowLights<baseline.shadowLights);
  console.log('Render budget:',JSON.stringify({courtyard:baseline,starfall}));
  // Choosing every knight leaves the selected arena intact and updates heraldry.
  for(const side of ['p','e'])for(const id of ['caldwin','varkos','ysolde','brann']){
    await page.locator(`#${side}Cards [data-id="${id}"]`).click();assert.equal((await state())[side],id);assert.equal(await selected(),'starfall');
  }
  await page.locator('[data-arena="courtyard"]').focus();await page.keyboard.press('Enter');
  assert.equal(await selected(),'courtyard');assert.equal((await state()).phase,'title');
  await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('data-arena'),'starfall');
  await page.keyboard.press('Space');assert.equal(await selected(),'starfall');assert.equal((await state()).phase,'title');
  await page.locator('#howBtn').click();assert.equal(await page.locator('#how').isVisible(),true);
  await page.locator('#howBack').click();assert.equal(await selected(),'starfall');
  await page.locator('#begin').click();assert.equal((await state()).arena,'starfall');
  assert.ok(['intro','fight'].includes((await state()).phase));
  await page.evaluate(()=>{const D=window.__duel;D.game.score=[3,1];D.game.endMatch();});
  await page.locator('#again').click();assert.equal((await state()).arena,'starfall');
  await page.evaluate(()=>{const D=window.__duel;D.game.score=[3,1];D.game.endMatch();});
  await page.locator('#menu').click();assert.equal((await state()).phase,'title');
  console.log('Selection, keyboard and rematch checks passed');
  // Old roots and resources must disappear, even after repeated switches.
  const memory=[];
  for(let i=0;i<6;i++){
    for(const id of ['courtyard','starfall']){await page.locator(`[data-arena="${id}"]`).click();await settle();}
    memory.push(await measure());assert.equal(memory.at(-1).arenas,1);
  }
  assert.equal(memory.at(-1).geometries,memory[0].geometries);
  assert.equal(memory.at(-1).textures,memory[0].textures);
  console.log('Repeated switching: stable GPU resource counts');
  // Adaptive quality stays reduced when loading another arena.
  await page.evaluate(()=>window.__duel.setArenaQuality(0));
  for(const id of ['courtyard','starfall']){
    await page.locator(`[data-arena="${id}"]`).click();
    assert.equal(await page.evaluate(()=>{let n=0;window.__duel.scene.traverse(o=>{if(o.isPointLight&&o.castShadow)n++;});return n;}),0);
  }
  // Both arena choices and the start button remain reachable on short/narrow screens.
  for(const [width,height] of [[1440,900],[1280,720],[800,600],[390,844]]){
    await page.setViewportSize({width,height});
    for(const selector of ['[data-arena="courtyard"]','[data-arena="starfall"]','#begin']){
      const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();
      assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=height+1,`${selector} clipped at ${width}x${height}`);
    }
    if(process.env.ARENA_SHOTS){fs.mkdirSync(process.env.ARENA_SHOTS,{recursive:true});await page.screenshot({path:`${process.env.ARENA_SHOTS}/menu-${width}.png`});}
  }
  await page.goto(url+'?debug&silent&arena=starfall&p=ysolde&e=brann');await page.waitForFunction(()=>window.__booted);
  assert.equal(await selected(),'starfall');assert.equal((await state()).p,'ysolde');assert.equal((await state()).e,'brann');
  await page.goto(url+'?debug&silent&arena=unknown');await page.waitForFunction(()=>window.__booted);assert.equal(await selected(),'courtyard');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({courtyard:baseline,starfall,stableMemory:memory.at(-1),checks:'UI, keyboard, rematch, repeated disposal, quality, viewports, URLs: PASS'},null,2));
}finally{await run.close();}
