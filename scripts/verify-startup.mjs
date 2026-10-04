import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Real production app + intentionally stalled local Auth service. No hosted
// credentials or private data. This exercises an installed client's cookie.
const base = 'http://127.0.0.1:3006';
let authRequests = 0;
const sockets = new Set();
const auth = createServer(() => { authRequests++; /* deliberately never respond */ });
auth.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
await new Promise(resolve => auth.listen(3007, '127.0.0.1', resolve));
const server = spawn(process.execPath, ['--require', './scripts/fixtures/stalled-auth.cjs', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3006'], {
  env: {...process.env, APP_ORIGIN:base, RESERVE_DEV_PREVIEW:'false', DATABASE_URL:'postgres://test:test@127.0.0.1:1/test'},
  stdio:['ignore','pipe','pipe'],
});
let browser, log='';
server.stdout.on('data', data => log+=data); server.stderr.on('data', data => log+=data);
try {
  await new Promise((resolve,reject) => { server.stdout.on('data', data => { if(String(data).includes('Ready')) resolve(); }); server.on('exit', () => reject(Error(log))); setTimeout(() => reject(Error('Startup timeout')), 30000).unref(); });
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true});
  const payload = Buffer.from(JSON.stringify({access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'11111111-1111-1111-1111-111111111111'}})).toString('base64url');
  await context.addCookies([{name:'sb-wfbiytzlaokchfaxgwtt-auth-token',value:'base64-'+payload,url:base}]);
  const page = await context.newPage(); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const response = await page.goto(base+'/', {waitUntil:'commit'});
  assert.equal(response.status(),200);
  await page.getByRole('heading',{name:'Opening the Reserve.',exact:true}).waitFor({timeout:1500});
  await page.getByRole('link',{name:'Enter the Reserve',exact:true}).waitFor({timeout:7000});
  assert.ok(authRequests>0,'Must actually exercise stalled auth');
  await page.getByRole('link',{name:'Enter immediately',exact:true}).click();
  await page.getByRole('heading',{name:'Welcome to the Reserve.',exact:true}).waitFor({timeout:7000});
  await page.goto(base+'/enter');
  await page.getByRole('heading',{name:'Welcome to the Reserve.',exact:true}).waitFor({timeout:7000});
  assert.equal(new URL(page.url()).pathname,'/home');
  assert.deepEqual(errors,[]);
  console.log('PASS visible first-paint entrance, stalled auth fallback, threshold navigation, and installed /enter launch');
} finally {
  await browser?.close(); server.kill('SIGTERM'); sockets.forEach(socket=>socket.destroy()); auth.close();
}
