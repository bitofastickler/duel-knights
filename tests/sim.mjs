// AI-vs-AI smoke test and balance table.
//   node tests/sim.mjs [matchesPerPairing=6]
// Serves the repo, opens the game in headless Chromium (Playwright), and for every
// pairing of knights runs whole matches with both sides on the "knight" AI, stepping
// the simulation as fast as it will go. Fails on any page error or a match that never ends.
import {launchGame} from './browser.mjs';
const N=+(process.argv[2]||6),arena=process.argv[3]||'courtyard';
const run=await launchGame('?demo&silent&arena='+encodeURIComponent(arena),{width:800,height:500});
const {page,errors}=run;
console.log('Arena: '+arena);
const ids=await page.evaluate(()=>[...document.querySelectorAll('#pCards .card')].map(b=>b.dataset.id));

const table={};let failed=false;
for(const p of ids)for(const e of ids){
  const r={wins:0,rounds:[0,0],secs:0,stuck:0};
  for(let m=0;m<N;m++){
    await page.evaluate(([p,e])=>{const D=window.__duel;D.game.toTitle();D.select(p,e);D.begin();D.simT=0;},[p,e]);
    // step in short chunks and let the page breathe between them; one long blocking
    // loop lets native memory pile up until the renderer crashes
    let res;
    do{res=await page.evaluate(()=>{const D=window.__duel;for(let i=0;i<1800&&D.game.phase!=='matchEnd'&&D.simT<900;i++){D.step(1/90);D.simT+=1/90;}
        return {done:D.game.phase==='matchEnd',t:D.simT,score:D.game.score.slice()};});
      await page.waitForTimeout(5);
    }while(!res.done&&res.t<900);
    if(!res.done){r.stuck++;continue;}
    r.secs+=res.t;r.rounds[0]+=res.score[0];r.rounds[1]+=res.score[1];if(res.score[0]>res.score[1])r.wins++;
  }
  table[p]=table[p]||{};table[p][e]=r;
  if(r.stuck)failed=true;
  process.stdout.write(`${p.padEnd(8)} vs ${e.padEnd(8)} wins ${r.wins}/${N}  rounds ${r.rounds[0]}-${r.rounds[1]}  avg ${(r.secs/Math.max(1,N-r.stuck)).toFixed(0)}s${r.stuck?`  STUCK ${r.stuck}`:''}\n`);
}
// combine both sides: X beats Y when X wins on the left or Y loses on the left
const rate=(x,y)=>(table[x][y].wins+(N-table[y][x].stuck-table[y][x].wins))/(2*N-table[x][y].stuck-table[y][x].stuck);
console.log('\nMatch win rate of each row knight against each column, both sides combined:');
console.log(''.padEnd(10)+ids.map(i=>i.padStart(9)).join('')+'   overall');
for(const p of ids){let sum=0;
  const row=ids.map(e=>{if(p===e)return '-'.padStart(9);const v=rate(p,e);sum+=v;return (Math.round(v*100)+'%').padStart(9);}).join('');
  console.log(p.padEnd(10)+row+(Math.round(sum/(ids.length-1)*100)+'%').padStart(10));}
const mir=ids.map(i=>table[i][i]).reduce((a,r)=>a+r.wins,0)/(ids.length*N);
console.log(`Left side won ${Math.round(mir*100)}% of mirror matches (50% means no side bias).`);
if(errors.length){console.log('\nPage errors:\n'+[...new Set(errors)].join('\n'));failed=true;}
await run.close();
process.exit(failed?1:0);
