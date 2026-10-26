// Run against tests/visual_preview.py and an isolated headless Edge with
// --remote-debugging-port=9229. Never point this at the user's live game server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const tabs = await (await fetch('http://127.0.0.1:9229/json')).json();
  const tab = tabs.find(t => t.type === 'page' && t.url === 'http://127.0.0.1:8001/');
  assert(tab, 'Expected isolated preview on port 8001');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
  let serial = 0;
  const pending = new Map(), exceptions = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params);
    if (pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  });
  const call = (method, params={}) => new Promise((resolve,reject) => {
    const id = ++serial; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));
  });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const started=Date.now();const t=setInterval(()=>{if(${expression}){clearInterval(t);resolve(true)}else if(Date.now()-started>15000){clearInterval(t);reject(new Error('UI timeout'))}},100)})`);
  try {
    await call('Runtime.enable');
    await call('Emulation.setDeviceMetricsOverride', {width:1500,height:1000,deviceScaleFactor:1,mobile:false});
    await fetch('http://127.0.0.1:8001/api/reset', {method:'POST'});
    await call('Page.reload');
    await new Promise(resolve=>setTimeout(resolve,500));
    await wait("document.getElementById('loading').hidden");
    assert.equal(await evaluate("document.querySelectorAll('.dex-item').length"),8);
    assert((await evaluate("document.getElementById('dex').textContent")).includes('Charizard ada di Hokky Supermarket'));
    await evaluate("document.getElementById('compare').click()");
    await wait("!document.getElementById('scenario-results').hidden");
    const comparison = await evaluate("document.getElementById('scenario-results').textContent");
    assert(comparison.includes('30 m radius') && comparison.includes('60 m radius'));
    assert(comparison.includes('squirtle_01'));
    assert.equal(await evaluate("document.getElementById('progress').textContent"),'0 / 8');
    await evaluate("document.getElementById('catch').click()");
    await wait("document.getElementById('progress').textContent==='1 / 8'");
    await wait("!document.getElementById('catch').textContent.startsWith('Catching')");
    const before = await evaluate("document.getElementById('coordinates').textContent");
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    await new Promise(resolve=>setTimeout(resolve,600));
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    const after = await evaluate("document.getElementById('coordinates').textContent");
    assert.notEqual(before,after,'Movement should update actual coordinates');
    await evaluate("document.getElementById('reload').click()");
    await wait("document.getElementById('toast').textContent.includes('reloaded')");
    assert.equal(await evaluate("document.getElementById('progress').textContent"),'1 / 8');
    assert.equal(exceptions.length,0,'No uncaught browser exceptions');
    const shot = await call('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('outputs/game_gis.png',Buffer.from(shot.data,'base64'));
    console.log('PASS: 8 hints, scenario comparison, catch, movement, reload/preserved collection, no browser exceptions.');
  } finally {
    await call('Browser.close');
    ws.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
