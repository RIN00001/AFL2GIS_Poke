// Run against tests/visual_preview.py and an isolated headless Edge with
// --remote-debugging-port=9229. Never point this at the user's live game server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const screenshotDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fielddex-browser-'));
(async () => {
  const tabs = await (await fetch('http://127.0.0.1:9229/json')).json();
  const tab = tabs.find(t => t.type === 'page' && t.url === 'http://127.0.0.1:8001/');
  assert(tab, 'Expected isolated preview on port 8001');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
  let serial = 0;
  const pending = new Map(), exceptions = [], remoteRequests = [], failedResponses = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params);
      if (exceptions.length<=3) console.error('Browser exception:',JSON.stringify(message.params));
    }
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedResponses.push(message.params.response.url);
    if (message.method === 'Network.requestWillBeSent') {
      const url=message.params.request.url;
      if (/^https?:/.test(url) && !url.startsWith('http://127.0.0.1:8001/')) remoteRequests.push(url);
    }
    if (pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  });
  const call = (method, params={}) => new Promise((resolve,reject) => {
    const id = ++serial; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));
  });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true, userGesture:true});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const started=Date.now();const t=setInterval(()=>{if(${expression}){clearInterval(t);resolve(true)}else if(Date.now()-started>15000){clearInterval(t);reject(new Error('UI timeout'))}},100)})`);
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function screenshot(name){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(screenshotDirectory,name+'.png'),Buffer.from(shot.data,'base64'));}
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  try {
    await call('Runtime.enable');await call('Page.enable');await call('Page.bringToFront');
    await call('Page.navigate',{url:'http://127.0.0.1:8001/'});await pause(500);
    await wait("document.getElementById('loading')?.hidden");
    await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
    await call('Network.setBlockedURLs',{urls:['https://*']});
    await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__audio={context:null,tones:0,noise:0};const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);window.__audio.context=this;}createOscillator(){window.__audio.tones++;return super.createOscillator();}createBufferSource(){window.__audio.noise++;return super.createBufferSource();}};`});
    await call('Emulation.setDeviceMetricsOverride', {width:1500,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate("localStorage.setItem('fielddex-sound','off');localStorage.setItem('fielddex-volume','0.35')");
    await fetch('http://127.0.0.1:8001/api/reset', {method:'POST'});
    await call('Page.reload');
    await new Promise(resolve=>setTimeout(resolve,500));
    await call('Page.bringToFront');
    await wait("document.getElementById('loading').hidden");
    assert.equal(await evaluate("document.querySelectorAll('.dex-item').length"),5);
    assert.equal(await evaluate("document.querySelectorAll('.photo-pin').length"),5);
    await wait("[...document.querySelectorAll('.photo-pin img,.dex-portrait,.stop-thumbnail')].every(i=>i.complete&&i.naturalWidth>0)");
    assert(await evaluate("(()=>{const r=document.getElementById('encounter').getBoundingClientRect();return !!document.elementFromPoint(r.x+130,r.y+70).closest('#encounter')})()"),'Pins must stay below the encounter card');
    await screenshot('website');
    await click('.dex-item[data-id="charizard"]');
    assert.equal(await evaluate("document.getElementById('destination').hidden"),true,'Undetected Pokemon must not reveal a direction');
    assert(!(await evaluate("document.querySelector('.dex-item[data-id=\"charizard\"]').title")).includes('Hokky'));
    await click('.dex-item[data-id="pikachu"]');
    assert.equal(await evaluate("document.getElementById('destination-name').textContent"),'Pikachu');
    await click('#clear-destination');
    assert.equal(await evaluate("document.querySelectorAll('.map-tools .ui-icon').length"),2);
    await click('#sound');await wait("window.__audio.context?.state==='running'");
    const tones=await evaluate('window.__audio.tones');await click('#scan');
    assert(await evaluate('window.__audio.tones')>tones,'Scan should synthesize audio');
    assert(!(await evaluate("document.getElementById('dex').textContent")).includes('Hokky Supermarket'));
    assert((await evaluate("document.querySelector('#encounter p').textContent")).includes('UC Main'));
    await click('#open-gis');
    await evaluate("document.getElementById('compare').click()");
    await wait("!document.getElementById('scenario-results').hidden");
    const comparison = await evaluate("document.getElementById('scenario-results').textContent");
    assert(comparison.includes('40 m detection') && comparison.includes('20 m detection'));
    assert(comparison.includes('pikachu'));
    const paused=await evaluate("document.getElementById('coordinates').textContent");
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await pause(300);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    assert.equal(await evaluate("document.getElementById('coordinates').textContent"),paused,'Dialogs should pause movement');
    await click('#gis-dialog .dialog-close');
    assert.equal(await evaluate("document.getElementById('progress').textContent"),'0 / 5');
    assert.equal(await evaluate("document.getElementById('catch').disabled"),true);
    await click('#landmark-list [data-id="UC Main Building"]');
    await wait("!document.getElementById('landmark-card').hidden");
    await evaluate("document.getElementById('visit-landmark').click()");
    await wait("document.getElementById('visit-progress').textContent==='1 / 5'");
    assert.equal(await evaluate("document.getElementById('visit-landmark').disabled"),true);
    assert.equal(await evaluate("document.querySelectorAll('.photo-pin.visited').length"),1);
    await wait("document.getElementById('landmark-photo').complete&&document.getElementById('landmark-photo').naturalWidth>0");
    assert((await evaluate("document.getElementById('photo-source').href")).startsWith('https://www.ciputra.ac.id/'));
    await screenshot('website_photo_stop');
    await evaluate("document.getElementById('close-landmark').click()");
    await click('#landmark-list [data-id="Hokky Supermarket"]');await click('#guide-landmark');
    assert.equal(await evaluate("document.getElementById('destination-name').textContent"),'Hokky');
    assert((await evaluate("document.getElementById('destination-distance').textContent")).includes('straight-line'));
    await click('#clear-destination');await click('#follow');await pause(650);await screenshot('website_whole_area');
    const beforeZoom=await evaluate("document.querySelector('.photo-pin').style.left");await click('#zoom-in');await pause(150);
    assert.notEqual(await evaluate("document.querySelector('.photo-pin').style.left"),beforeZoom);
    await click('#follow');await pause(300);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:750,y:300});
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:820,y:330});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:820,y:330});
    assert.equal(await evaluate("document.getElementById('follow').getAttribute('aria-pressed')"),'false');await click('#follow');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await new Promise(resolve=>setTimeout(resolve,650));
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await wait("!document.getElementById('catch').disabled");
    await evaluate("document.getElementById('catch').click()");
    await wait("document.getElementById('progress').textContent==='1 / 5'");
    await wait("document.getElementById('capture-banner').classList.contains('visible')");
    assert(await evaluate('window.__audio.noise')>0,'Steps, throws and impacts should synthesize noise');
    await pause(450);
    await screenshot('website_capture');
    const before = await evaluate("document.getElementById('coordinates').textContent");
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    await new Promise(resolve=>setTimeout(resolve,600));
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    const after = await evaluate("document.getElementById('coordinates').textContent");
    assert.notEqual(before,after,'Movement should update actual coordinates');
    await new Promise(resolve=>setTimeout(resolve,600));
    await evaluate("document.getElementById('reload').click()");
    await wait("document.getElementById('toast').textContent.includes('reloaded')");
    assert.equal(await evaluate("document.getElementById('progress').textContent"),'1 / 5');
    assert.equal(await evaluate("document.getElementById('visit-progress').textContent"),'1 / 5');
    assert.equal(exceptions.length,0,'No uncaught browser exceptions');
    await wait("!document.getElementById('capture-banner').classList.contains('visible')");
    assert.equal(await evaluate("document.getElementById('sound').getAttribute('aria-pressed')"),'true');
    await evaluate("document.getElementById('volume').value=20;document.getElementById('volume').dispatchEvent(new Event('input'));document.getElementById('sound').click()");
    assert.equal(await evaluate("localStorage.getItem('fielddex-volume')"),'0.2');
    await call('Page.reload');await pause(500);await wait("document.getElementById('loading').hidden");
    assert.equal(await evaluate("document.getElementById('sound').getAttribute('aria-pressed')"),'false');
    assert.equal(await evaluate("document.getElementById('volume').value"),'20');
    assert.equal(await evaluate("document.getElementById('progress').textContent"),'1 / 5');
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
    await new Promise(resolve=>setTimeout(resolve,500));
    assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Mobile should not overflow horizontally');
    await click('#follow');await pause(650);
    assert.equal(await evaluate("document.querySelectorAll('.photo-pin:not([hidden])').length"),5,'Whole area should show all five stops on a phone');
    await click('#follow');await pause(500);
    const mobile=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(screenshotDirectory,'website_mobile.png'),Buffer.from(mobile.data,'base64'));
    await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    const mobileBefore=await evaluate("document.getElementById('coordinates').textContent");
    const arrow=await evaluate("(()=>{const r=document.querySelector('#touch-controls [data-dy=\"1\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...arrow,id:1}]});await pause(400);
    await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(180);
    assert.notEqual(await evaluate("document.getElementById('coordinates').textContent"),mobileBefore,'Touch arrows should move the player');
    await click('#journal-toggle');assert.equal(await evaluate("document.getElementById('journal-toggle').getAttribute('aria-expanded')"),'true');
    await click('#landmark-list [data-id="Hokky Supermarket"]');
    assert.equal(await evaluate("document.getElementById('journal').classList.contains('open')"),false);
    await wait("document.getElementById('landmark-photo').complete&&document.getElementById('landmark-photo').naturalWidth>0");
    await screenshot('website_mobile_photo');await click('#close-landmark');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.photo-disc'),':after').animationName"),'none');
    const animationCheck=await evaluate(`(async()=>{
      const THREE=await import('/public/vendor/three.module.js');
      const {character}=await import('/src/scene/models.js');
      const {createEffects}=await import('/src/scene/effects.js');
      const {animateCreature,personalities}=await import('/src/scene/personality.js');
      const scene=new THREE.Scene();scene.background=new THREE.Color('#edf5e8');
      scene.add(new THREE.HemisphereLight('#fff','#93b6a3',2.5));
      const sun=new THREE.DirectionalLight('#fff3dd',2);sun.position.set(-10,40,70);scene.add(sun);
      const camera=new THREE.OrthographicCamera(-60,60,21,-21,.1,500);camera.position.set(48,48,95);camera.lookAt(48,4,0);
      const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,420);
      const entries=Object.entries(personalities).map(([species,theme],i)=>{
        const model=character(species,theme.color);model.position.set(i*24,0,0);model.scale.setScalar(.65);scene.add(model);
        return {model,spawn:{species,x:i*24,y:0},revealAt:0};
      });
      const baseline=scene.children.length,fx=createEffects(scene,()=>false);
      for(const e of entries){fx.found(e.model.position,e.spawn.species);animateCreature(e,.45,false);}
      for(let i=0;i<25;i++)fx.update(.02);
      renderer.render(scene,camera);const found=renderer.domElement.toDataURL('image/png');
      const noPositionDrift=entries.every(e=>e.model.position.x===e.spawn.x&&e.model.position.z===0);
      for(let i=0;i<100;i++)fx.update(.02);
      const discoveryClean=scene.children.length===baseline;
      let impacts=0;
      const captures=entries.map(e=>fx.capture(e.model,new THREE.Vector3(e.spawn.x-8,0,9),personalities[e.spawn.species].color,()=>impacts++,e.spawn.species));
      for(let i=0;i<47;i++)fx.update(.02);
      renderer.render(scene,camera);const capture=renderer.domElement.toDataURL('image/png');
      for(let i=0;i<220;i++)fx.update(.02);
      await Promise.all(captures);
      const finished=entries.every(e=>!e.model.visible&&Math.abs(e.model.scale.x-.65)<1e-9);
      const cleaned=scene.children.length===baseline;
      const reduced=createEffects(scene,()=>true);entries[0].model.visible=true;
      await reduced.capture(entries[0].model,new THREE.Vector3(), '#fff');
      const reducedFinished=!entries[0].model.visible&&scene.children.length===baseline;
      renderer.dispose();renderer.forceContextLoss();
      scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
      return {found,capture,noPositionDrift,discoveryClean,finished,cleaned,reducedFinished,impacts};
    })()`);
    for(const key of ['noPositionDrift','discoveryClean','finished','cleaned','reducedFinished'])assert(animationCheck[key],key);
    assert.equal(animationCheck.impacts,5,'Each species must finish impact exactly once');
    for(const name of ['found','capture'])fs.writeFileSync(path.join(screenshotDirectory,'species_'+name+'.png'),Buffer.from(animationCheck[name].split(',')[1],'base64'));
    // Deliberately delay replies to exercise races missed by normal local play.
    await fetch('http://127.0.0.1:8001/api/reset',{method:'POST'});
    await call('Page.reload');await pause(500);await wait("document.getElementById('loading').hidden");
    await evaluate(`window.__realFetch=window.fetch.bind(window);window.__requests=[];
      window.fetch=async(...args)=>{window.__requests.push(String(args[0]));const response=await window.__realFetch(...args);if(String(args[0]).endsWith('/visit'))await new Promise(r=>setTimeout(r,700));return response;};`);
    await click('#landmark-list [data-id="UC Main Building"]');
    const visitPosition=await evaluate("document.getElementById('coordinates').textContent");
    await click('#visit-landmark');await click('#reload');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await pause(200);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
    assert.equal(await evaluate("document.getElementById('coordinates').textContent"),visitPosition,'Movement must wait for pending check-in');
    assert.equal(await evaluate("window.__requests.includes('/api/reload')"),false,'Scene refresh must wait for check-in');
    await wait("document.getElementById('visit-progress').textContent==='1 / 5'");await click('#close-landmark');
    await evaluate('window.fetch=window.__realFetch');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await pause(500);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await wait("!document.getElementById('catch').disabled");
    await evaluate(`window.__movePending=false;window.__catchCalls=0;window.fetch=async(...args)=>{
      const url=String(args[0]);if(url==='/api/move')window.__movePending=true;
      const response=await window.__realFetch(...args);
      if(url==='/api/move'){await new Promise(r=>setTimeout(r,500));window.__movePending=false;}
      if(url==='/api/catch'){window.__catchCalls++;throw new TypeError('Simulated lost catch response');}
      return response;
    };`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await wait('window.__movePending');
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await click('#catch');
    await wait("document.getElementById('progress').textContent==='1 / 5'");
    assert.equal(await evaluate('window.__catchCalls'),1,'Lost POST response must be reconciled without repeating catch');
    assert.equal(await evaluate("document.getElementById('visit-progress').textContent"),'1 / 5');
    await evaluate('window.fetch=window.__realFetch');
    assert.equal(exceptions.length,0,JSON.stringify(exceptions));
    assert.equal(failedResponses.length,0,JSON.stringify(failedResponses));
    assert.equal(remoteRequests.length,0,'Gameplay must not request external services');
    console.log('PASS: all five species discovery/capture effects, cleanup, reduced motion, gated hints, local photos, check-ins, guides, pan/zoom, audio, capture, movement, reload, preferences and mobile controls; no external requests or browser errors.');
  } finally {
    await call('Browser.close');
    ws.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
