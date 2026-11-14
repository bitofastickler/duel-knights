// Shared static-server / browser harness. Optional local Three.js mirror is only
// for offline tests; production continues to use the import map in index.html.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'};
export async function launchGame(query='?debug&silent',viewport={width:1280,height:800}){
  const server=http.createServer((req,res)=>{
    let f=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://x').pathname));
    if(f===ROOT)f=path.join(ROOT,'index.html');
    if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
    res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,
      args:['--use-gl=angle','--use-angle=swiftshader',...JSON.parse(process.env.CHROMIUM_ARGS||'[]')]});
    const page=await browser.newPage({viewport});
    if(process.env.THREE_ROOT)await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',route=>{
      const relative=new URL(route.request().url()).pathname.split('/three@0.160.0/')[1];
      return route.fulfill({path:path.join(process.env.THREE_ROOT,relative),contentType:'text/javascript'});
    });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/`;
    await page.goto(url+query);await page.waitForFunction(()=>window.__booted,null,{timeout:30000});
    return {browser,page,errors,url,async close(){await browser.close();await new Promise(resolve=>server.close(resolve));}};
  }catch(e){if(browser)await browser.close();server.close();throw e;}
}
