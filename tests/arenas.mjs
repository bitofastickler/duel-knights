// UI, arena lifecycle and render-budget regression checks (no FPS assumptions).
// node tests/arenas.mjs -- optional ARENA_SHOTS=/path for review captures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchGame} from './browser.mjs';
const run=await launchGame(),{page,errors,url}=run;
const ids=['courtyard','starfall','wyrmfire'];
const selected=()=>page.locator('[data-arena][aria-pressed="true"]').getAttribute('data-arena');
const state=()=>page.evaluate(()=>({arena:window.__duel.game.sel.arena,phase:window.__duel.game.phase,p:window.__duel.player.char.id,e:window.__duel.enemy.char.id}));
// Render explicitly for deterministic comparisons and to avoid burning software-GPU
// time between UI actions. The separate sim test runs the real animation loop.
async function manualFrames(){
  await page.evaluate(()=>new Promise(resolve=>{
    const raf=requestAnimationFrame;requestAnimationFrame=()=>0;
    raf(()=>{requestAnimationFrame=raf;window.__duel.inp.noLock=true;resolve();});
  }));
}
async function draw(view=0,quality=null){
  return page.evaluate(async({view,quality})=>{
    const D=window.__duel,{updateEnvironment}=await import('/src/arena.js');
    if(quality!==null)D.setArenaQuality(quality);
    const views=[[[0,3.4,-9],[0,2.8,5]],[[8,3.4,0],[0,2.8,0]],[[-6,3.4,5],[0,2.8,0]]];
    D.camera.position.set(...views[view][0]);D.camera.lookAt(...views[view][1]);
    D.step(1/90);updateEnvironment(1/60,4);D.renderer.info.autoReset=false;D.renderer.info.reset();D.renderer.render(D.scene,D.camera);
    const result={...D.renderer.info.render,...D.renderer.info.memory,pointLights:0,shadowLights:0,arenas:0};
    D.scene.traverse(o=>{if(o.isPointLight){result.pointLights++;if(o.castShadow)result.shadowLights++;}if(o.name.startsWith('arena:'))result.arenas++;});
    D.renderer.info.autoReset=true;return result;
  },{view,quality});
}
try{
  await manualFrames();
  assert.deepEqual(await page.locator('[data-arena]').evaluateAll(els=>els.map(e=>e.dataset.arena)),ids);
  assert.equal(await selected(),'courtyard');
  const budget={};
  for(const id of ids){
    await page.locator(`[data-arena="${id}"]`).click();assert.equal(await selected(),id);budget[id]=[];
    for(let view=0;view<3;view++)budget[id].push(await draw(view,2));
  }
  for(const id of ['starfall','wyrmfire'])for(let view=0;view<3;view++){
    const b=budget.courtyard[view],r=budget[id][view];
    assert.ok(r.calls<=b.calls,`${id}, view ${view}: ${r.calls} calls > ${b.calls}`);
    assert.ok(r.triangles<=b.triangles,`${id}, view ${view}: ${r.triangles} triangles > ${b.triangles}`);
    assert.ok(r.shadowLights<b.shadowLights);
  }
  console.log('Render budgets (three cameras):',JSON.stringify(budget));
  // The entire current roster, including newer weapons, works with the new arena.
  const knights=await page.locator('#pCards .card').evaluateAll(els=>els.map(e=>e.dataset.id));
  for(const side of ['p','e'])for(const id of knights){
    await page.locator(`#${side}Cards [data-id="${id}"]`).click();assert.equal((await state())[side],id);assert.equal(await selected(),'wyrmfire');
  }
  await page.locator('[data-arena="courtyard"]').focus();await page.keyboard.press('Enter');
  assert.equal(await selected(),'courtyard');assert.equal((await state()).phase,'title');
  for(const id of ['starfall','wyrmfire']){
    await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('data-arena'),id);
    await page.keyboard.press('Space');assert.equal(await selected(),id);assert.equal((await state()).phase,'title');
  }
  await page.locator('#howBtn').click();assert.equal(await page.locator('#how').isVisible(),true);
  await page.locator('#howBack').click();assert.equal(await selected(),'wyrmfire');
  // Start, rematch and Home keep the chosen arena in every setting.
  for(const id of ids){
    await page.locator(`[data-arena="${id}"]`).click();await page.locator('#begin').click();
    assert.equal((await state()).arena,id);assert.equal((await state()).phase,'intro');
    await page.evaluate(()=>{const D=window.__duel;D.game.score=[3,1];D.game.endMatch();});
    await page.locator('#again').click();assert.equal((await state()).arena,id);
    await page.evaluate(()=>{const D=window.__duel;D.game.score=[1,3];D.game.endMatch();});
    await page.getByRole('button',{name:'Home',exact:true}).click();assert.equal((await state()).phase,'title');
  }
  console.log('All knights, keyboard selection, rematches and Home passed');
  const memory={};
  for(let cycle=0;cycle<4;cycle++)for(const id of ids){
    await page.locator(`[data-arena="${id}"]`).click();const r=await draw(0,2);assert.equal(r.arenas,1);
    if(cycle===0)memory[id]=r;
    else{assert.equal(r.geometries,memory[id].geometries,`${id}: geometry leak`);assert.equal(r.textures,memory[id].textures,`${id}: texture leak`);}
  }
  const before=await page.evaluate(()=>window.__duel.scene.children.find(o=>o.name==='arena:wyrmfire').uuid);
  await page.locator('[data-arena="wyrmfire"]').click();
  assert.equal(await page.evaluate(()=>window.__duel.scene.children.find(o=>o.name==='arena:wyrmfire').uuid),before,'Same selection should not rebuild the arena');
  await page.evaluate(()=>window.__duel.setArenaQuality(0));
  for(const id of ids){await page.locator(`[data-arena="${id}"]`).click();assert.equal((await draw()).shadowLights,0);}
  console.log('Four switching cycles: stable GPU resources; quality settings retained');
  for(const [width,height] of [[1440,900],[1280,720],[1024,768],[800,600],[390,844]]){
    await page.setViewportSize({width,height});await draw();
    for(const selector of [...ids.map(id=>`[data-arena="${id}"]`),'#begin']){
      const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();
      assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=height+1,`${selector} clipped at ${width}x${height}`);
      if(selector!=='#begin')assert.ok(await el.evaluate(e=>e.scrollWidth<=e.clientWidth),`${selector} text clipped at ${width}px`);
    }
    if(process.env.ARENA_SHOTS){fs.mkdirSync(process.env.ARENA_SHOTS,{recursive:true});await page.screenshot({path:`${process.env.ARENA_SHOTS}/three-arenas-${width}.png`});}
  }
  for(const id of ids){
    await page.goto(url+`?debug&silent&arena=${id}&p=ysolde&e=brann`);await page.waitForFunction(()=>window.__booted);await manualFrames();
    assert.equal(await selected(),id);assert.equal((await state()).p,'ysolde');assert.equal((await state()).e,'brann');
  }
  await page.goto(url+'?debug&silent&arena=unknown');await page.waitForFunction(()=>window.__booted);assert.equal(await selected(),'courtyard');
  assert.deepEqual(errors,[]);console.log('PASS: all three arenas, resource disposal, render budgets, viewports, keyboard and direct links');
}finally{await run.close();}
