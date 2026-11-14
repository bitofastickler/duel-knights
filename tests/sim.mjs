// AI-vs-AI smoke test and balance table.
//   node tests/sim.mjs [matchesPerPairing=6]
// Serves the repo, opens the game in headless Chromium (Playwright), and for every
// pairing of knights runs whole matches with both sides on the "knight" AI, stepping
// the simulation as fast as it will go. Fails on any page error or a match that never ends.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const N=+(process.argv[2]||6);
const TYPES={'.html':'text/html','.js':'text/javascript','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const f=path.join(ROOT,decodeURIComponent(new URL(req.url,'http://x').pathname));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){
    const idx=path.join(f,'index.html');if(fs.existsSync(idx)){res.writeHead(200,{'content-type':'text/html'});return res.end(fs.readFileSync(idx));}
    res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));
}).listen(0);
const url=`http://localhost:${server.address().port}/`;

const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:800,height:500}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url+'?demo');
await page.waitForFunction(()=>window.__booted,null,{timeout:30000});
const ids=await page.evaluate(()=>[...document.querySelectorAll('#pCards .card')].map(b=>b.dataset.id));

const table={};let failed=false;
for(const p of ids)for(const e of ids){
  const r=await page.evaluate(([p,e,N])=>{
    const D=window.__duel,out={wins:0,rounds:[0,0],secs:0,stuck:0};
    for(let m=0;m<N;m++){
      D.game.toTitle();D.select(p,e);D.begin();
      let t=0;while(D.game.phase!=='matchEnd'&&t<900){D.step(1/90);t+=1/90;}
      if(D.game.phase!=='matchEnd'){out.stuck++;continue;}
      out.secs+=t;out.rounds[0]+=D.game.score[0];out.rounds[1]+=D.game.score[1];if(D.game.score[0]>D.game.score[1])out.wins++;
    }
    return out;
  },[p,e,N]);
  table[p]=table[p]||{};table[p][e]=r;
  if(r.stuck)failed=true;
  process.stdout.write(`${p.padEnd(8)} vs ${e.padEnd(8)} wins ${r.wins}/${N}  rounds ${r.rounds[0]}-${r.rounds[1]}  avg ${(r.secs/Math.max(1,N-r.stuck)).toFixed(0)}s${r.stuck?`  STUCK ${r.stuck}`:''}\n`);
}
console.log('\nRow knight\'s match win rate against each column (mirror matches on the diagonal):');
console.log(''.padEnd(10)+ids.map(i=>i.padStart(9)).join('')+'   overall');
for(const p of ids){let w=0,n=0;
  const row=ids.map(e=>{const r=table[p][e];if(p!==e){w+=r.wins;n+=N;}return (Math.round(r.wins/N*100)+'%').padStart(9);}).join('');
  console.log(p.padEnd(10)+row+(Math.round(w/n*100)+'%').padStart(10));}
if(errors.length){console.log('\nPage errors:\n'+[...new Set(errors)].join('\n'));failed=true;}
await browser.close();server.close();
process.exit(failed?1:0);
