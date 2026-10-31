import {animateCreature,personality} from './scene/personality.js';
import {icon,decorateIcons} from './icons.js';
decorateIcons();
import * as THREE from '../public/vendor/three.module.js';
import {request} from './api/client.js';
import {keyboard} from './controls/keyboard.js';
import {character} from './scene/models.js';
import {mapLayers} from './map/layers.js';
import {mediaFor} from './map/landmarks.js';
import {makePortraits} from './scene/portraits.js';
import {createEnvironment} from './scene/environment.js';
import {createSound} from './audio/sound.js';
import {createEffects,markerHalo} from './scene/effects.js';

const $=id=>document.getElementById(id);
const sound=createSound(),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion=()=>motionPreference.matches;
let world,state,map,models=[],landmarkLabels=[],portraits=new Map(),worldGroup;
let scene,actors,actorGroup,camera,renderer,player,ring,detectionRing,effects,environment;
let following=false,span=340,busy=false,catchBusy=false,capturing=null;
let selectedLandmark=null,destinationId=null,lastInput=performance.now(),previousFrame=0,walking=false,heading=0;
let visitBusy=false,movementTask=null;
let foundTimer;const discoveries=new Set();
let previousEligible=new Set(),previousDetected=new Set(),toastTimer,bannerTimer,lastScan=0,dustAt=0;
const cameraCenter=new THREE.Vector3(),panCenter=new THREE.Vector3(85,0,-20),touch={dx:0,dy:0};
function modalOpen(){return $('help-dialog').open||$('gis-dialog').open;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function soundLabel(){$('sound').innerHTML=icon(sound.enabled?'sound':'mute');$('sound').title=sound.enabled?'Mute sound':'Enable sound';$('sound').setAttribute('aria-label',$('sound').title);$('sound').setAttribute('aria-pressed',String(sound.enabled));}
soundLabel();$('volume').value=Math.round(sound.volume*100);
$('volume').oninput=()=>sound.setVolume(Number($('volume').value)/100);
$('sound').onclick=()=>{sound.toggle();soundLabel();sound.click();};
for(const [button,id] of [['help','help-dialog'],['open-gis','gis-dialog']]){
  $(button).onclick=()=>{sound.click();walking=false;$(id).showModal();};
  $(id).querySelectorAll('.dialog-close,.dialog-close-button').forEach(b=>b.onclick=()=>$(id).close());
  $(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
}
$('journal-toggle').onclick=()=>{const open=$('journal').classList.toggle('open');$('journal-toggle').setAttribute('aria-expanded',String(open));sound.click();};

function selectLandmark(id){
  const landmark=world.landmarks.find(p=>p.id===id);if(!landmark)return;
  selectedLandmark=id;const media=mediaFor(landmark);
  $('landmark-photo').src=media.image;$('landmark-photo').alt=media.caption;
  $('landmark-name').textContent=landmark.name;$('landmark-type').textContent=media.type;
  $('landmark-subtitle').textContent='PHOTO STOP';$('landmark-description').textContent=media.description;
  $('photo-caption').textContent=media.caption;$('photo-source').hidden=!media.source;
  if(media.source){$('photo-source').href=media.source;$('photo-source').textContent='Photo: '+media.credit+' ↗';}
  $('landmark-card').hidden=false;$('journal').classList.remove('open');$('journal-toggle').setAttribute('aria-expanded','false');
  updateLandmarks();sound.click();
}
function closeLandmark(){selectedLandmark=null;$('landmark-card').hidden=true;updateLandmarks();}
$('close-landmark').onclick=closeLandmark;
$('guide-landmark').onclick=()=>{
  destinationId=selectedLandmark;closeLandmark();setFollow(true);updateLandmarks();
  toast('Follow the arrow · straight-line direction');sound.click();
};
$('clear-destination').onclick=()=>{destinationId=null;updateLandmarks();};
function updateLandmarks(){
  const visited=new Set(state.visited||[]);
  $('visit-progress').textContent=world.landmarks.filter(p=>visited.has(p.id)).length+' / '+world.landmarks.length;
  for(const landmark of world.landmarks){
    const distance=Math.hypot(landmark.position[0]-state.position[0],landmark.position[1]-state.position[1]);
    const done=visited.has(landmark.id),near=distance<=world.config.landmark_visit_radius_m;
    const label=landmarkLabels.find(p=>p.id===landmark.id);
    if(label){label.element.classList.toggle('visited',done);label.element.classList.toggle('selected',selectedLandmark===landmark.id);
      label.element.classList.toggle('in-range',near&&!done);label.element.setAttribute('aria-label',landmark.name+', '+Math.round(distance)+' metres away'+(done?', visited':''));}
    const button=[...$('landmark-list').children].find(el=>el.dataset.id===landmark.id);
    if(button){button.classList.toggle('visited',done);button.classList.toggle('selected',selectedLandmark===landmark.id);
      button.querySelector('small').textContent=done?'✓ Visited':Math.round(distance)+' m';
      button.querySelector('.stop-chevron').textContent=done?'✓':'↗';}
    const pin=map.pins.find(p=>p.id===landmark.id);pin.material.color.set(done?'#a97bd4':'#44a9da');
    if(landmark.id===selectedLandmark){
      $('landmark-distance').textContent=Math.round(distance)+' m away';
      $('landmark-status').textContent=done?'VISITED':'UNVISITED';$('landmark-status').classList.toggle('visited',done);
      $('visit-range').textContent=world.config.landmark_visit_radius_m+' m check-in range';
      $('visit-landmark').disabled=done||!near||catchBusy||visitBusy;
      $('visit-landmark').textContent=done?'✓ Visited':near?'Check in':'Within '+world.config.landmark_visit_radius_m+' m to visit';
    }
  }
  const tracked=world.spawns.find(p=>'pokemon:'+p.id===destinationId&&!state.caught.includes(p.id)&&state.detected.includes(p.id));
  const destination=tracked?{position:[tracked.x,tracked.y],name:tracked.species}:world.landmarks.find(p=>p.id===destinationId);
  $('destination').hidden=!destination;
  if(destination){const dx=destination.position[0]-state.position[0],dy=destination.position[1]-state.position[1];
    $('destination-name').textContent=tracked?tracked.species:mediaFor(destination).short;
    $('destination-distance').textContent=Math.round(Math.hypot(dx,dy))+' m · straight-line';
    $('direction-arrow').style.transform='rotate('+Math.atan2(dx,dy)*180/Math.PI+'deg)';
  }
}
$('visit-landmark').onclick=async()=>{
  const id=selectedLandmark;if(!id||$('visit-landmark').disabled||visitBusy||catchBusy||(busy&&!movementTask))return;
  visitBusy=true;walking=false;updateLandmarks();
  try{await movementTask;const result=await request('landmarks/'+encodeURIComponent(id)+'/visit',{});state=result.state;
    if(result.newly_visited){
      sound.landmark();const pin=map.pins.find(p=>p.id===id);effects.burst(pin.marker.position,'#ad86d9');
      effects.scan(pin.marker.position,12,'#b48bd8');
      const el=landmarkLabels.find(p=>p.id===id).element;el.classList.add('just-visited');setTimeout(()=>el.classList.remove('just-visited'),1000);
      toast('✦ '+mediaFor(world.landmarks.find(p=>p.id===id)).short+' · stamp collected!');
      if(destinationId===id)destinationId=null;
    }updateUI();
  }catch(error){await recoverState(error);}finally{visitBusy=false;updateUI();}
};

function setup(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#c9e0bc');
  scene.add(new THREE.HemisphereLight('#ffffff','#9dbb95',2.5));
  const sun=new THREE.DirectionalLight('#fff3d5',2);sun.position.set(-160,350,180);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-420;sun.shadow.camera.right=420;
  sun.shadow.camera.top=420;sun.shadow.camera.bottom=-420;sun.shadow.camera.far=1200;sun.shadow.normalBias=.25;sun.shadow.bias=-.0003;
  sun.target.position.set(80,0,0);scene.add(sun,sun.target);
  // Draw the figurines after the map, with their own depth buffer. They remain
  // readable over tall footprints, while faces and limbs occlude correctly.
  actors=new THREE.Scene();actors.add(new THREE.HemisphereLight('#ffffff','#9dbb95',2.5));
  const actorSun=new THREE.DirectionalLight('#fff3d5',2);actorSun.position.copy(sun.position);actors.add(actorSun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:'#c1dda8',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
  camera=new THREE.OrthographicCamera(-400,400,300,-300,1,3000);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.autoClear=false;
  $('canvas-host').appendChild(renderer.domElement);
  effects=createEffects(actors,reducedMotion);
  player=character('Player','#ef9270',true);player.scale.setScalar(.65);actors.add(player);
  ring=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#439882',transparent:true,opacity:.7,depthTest:false}));
  ring.renderOrder=15;scene.add(ring);
  detectionRing=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#76a3a1',dashSize:2,gapSize:2,transparent:true,opacity:.55,depthTest:false}));
  detectionRing.renderOrder=15;scene.add(detectionRing);
  new ResizeObserver(resize).observe($('canvas-host'));
  let drag=null;
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(following){following=false;panCenter.copy(cameraCenter);followLabel();}
    const scale=(camera.right-camera.left)/$('canvas-host').clientWidth;
    panCenter.x-=dx*scale;panCenter.z-=dy*scale/0.87;
    panCenter.x=THREE.MathUtils.clamp(panCenter.x,environment.bounds.x0-80,environment.bounds.x1+80);
    panCenter.z=THREE.MathUtils.clamp(panCenter.z,-environment.bounds.y1-80,-environment.bounds.y0+80);
    drag.x=e.clientX;drag.y=e.clientY;
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{drag=null;});
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();span=THREE.MathUtils.clamp(span*Math.exp(e.deltaY*.001),90,1200);resize();},{passive:false});
}
function resize(){
  if(!renderer)return;const {clientWidth:w,clientHeight:h}=$('canvas-host');if(!w||!h)return;
  renderer.setSize(w,h);const fitted=span;
  camera.left=-fitted*w/h/2;camera.right=fitted*w/h/2;camera.top=fitted/2;camera.bottom=-fitted/2;camera.updateProjectionMatrix();
}
function overview(){
  following=false;const b=environment.bounds;panCenter.set((b.x0+b.x1)/2,0,-(b.y0+b.y1)/2);
  const host=$('canvas-host');span=Math.max(340,(b.x1-b.x0+100)*host.clientHeight/host.clientWidth);
  span=Math.min(span,1200);followLabel();resize();
}
function followLabel(){$('follow').innerHTML=icon(following?'map':'target')+'<small>'+(following?'Map':'Follow')+'</small>';$('follow').title=following?'Show whole map':'Follow player';$('follow').setAttribute('aria-label',$('follow').title);$('follow').setAttribute('aria-pressed',String(following));}
function setFollow(value){if(value){following=true;span=150;followLabel();resize();}else overview();}
function dispose(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
function install(data){
  world=data;state=data.state;selectedLandmark=null;destinationId=null;$('landmark-card').hidden=true;
  if(worldGroup){scene.remove(worldGroup);dispose(worldGroup);}
  if(actorGroup){actors.remove(actorGroup);dispose(actorGroup);}
  actorGroup=new THREE.Group();actors.add(actorGroup);
  worldGroup=new THREE.Group();map=mapLayers(world.layers,world.landmarks);worldGroup.add(map.group);
  environment=createEnvironment(world.layers,world.landmarks,world.spawns);worldGroup.add(environment.group);
  portraits=makePortraits(world.spawns);models=[];previousEligible=new Set(state.eligible);previousDetected=new Set();
  for(const spawn of world.spawns){const model=character(spawn.species,spawn.color);model.position.set(spawn.x,0,-spawn.y);model.scale.setScalar(.65);actorGroup.add(model);
    const halo=markerHalo(spawn.color);halo.position.set(spawn.x,0,-spawn.y);worldGroup.add(halo);models.push({spawn,model,halo});}
  scene.add(worldGroup);$('labels').replaceChildren();landmarkLabels=[];$('landmark-list').replaceChildren();
  for(const landmark of world.landmarks){
    const media=mediaFor(landmark),element=document.createElement('button');element.className='photo-pin';
    element.innerHTML='<span class="photo-disc"><img alt=""><span class="pin-check">✓</span></span><span class="pin-stem"></span><span class="pin-title"></span>';
    element.querySelector('img').src=media.image;element.querySelector('.pin-title').textContent=media.short;element.onclick=()=>selectLandmark(landmark.id);
    $('labels').appendChild(element);const pin=map.pins.find(p=>p.id===landmark.id);
    landmarkLabels.push({element,id:landmark.id,position:pin.marker.position.clone().add(new THREE.Vector3(0,17,0))});
    const button=document.createElement('button');button.className='landmark-list-item';button.dataset.id=landmark.id;button.setAttribute('aria-label',landmark.name);
    button.innerHTML='<img class="stop-thumbnail" alt=""><span class="stop-copy"><b></b><small></small></span><span class="stop-chevron">↗</span>';
    button.querySelector('img').src=media.image;button.querySelector('b').textContent=landmark.name;button.onclick=()=>selectLandmark(landmark.id);$('landmark-list').appendChild(button);
  }
  $('dex').replaceChildren();
  for(const s of world.spawns){
    const item=document.createElement('button');item.type='button';item.className='dex-item';item.dataset.id=s.id;item.style.setProperty('--species-color',s.color);
    item.innerHTML='<img class="dex-portrait" alt=""><span><b></b><small></small></span><span class="dex-status">○</span>';
    item.querySelector('img').src=portraits.get(s.id);item.querySelector('b').textContent=s.species;
    item.querySelector('small').textContent=s.kind+' · '+s.hint;item.title=s.species;item.setAttribute('aria-label','Find '+s.species);item.onclick=()=>{if(state.caught.includes(s.id)){toast(s.species+' · collected');return;}if(!state.detected.includes(s.id)){toast('Explore the map to detect '+s.species);return;}destinationId='pokemon:'+s.id;closeLandmark();setFollow(true);updateLandmarks();$('journal').classList.remove('open');$('journal-toggle').setAttribute('aria-expanded','false');sound.click();};$('dex').appendChild(item);
  }
  $('species-count').textContent=world.spawns.length+' SPECIES';
  $('detection-key').textContent=world.config.detection_radius_m+' m detection';$('capture-key').textContent=world.config.catch_radius_m+' m capture';
  $('help-detection').textContent=world.config.detection_radius_m;$('help-capture').textContent=world.config.catch_radius_m;
  $('radius').textContent=world.config.detection_radius_m+' m / '+world.config.catch_radius_m+' m';
  $('scenario-results').hidden=true;player.position.set(state.position[0],0,-state.position[1]);
  updateUI();setFollow(true);cameraCenter.set(player.position.x,0,player.position.z);
}
function updateUI(){
  const valid=world.spawns.filter(s=>state.caught.includes(s.id)).length;
  $('progress').textContent=valid+' / '+world.spawns.length;$('map-progress').textContent=valid+' / '+world.spawns.length;$('progress-fill').style.width=valid/world.spawns.length*100+'%';
  $('progress-note').textContent=valid===world.spawns.length?'Every discovery, a memory. Collection complete!':(world.spawns.length-valid)+' discoveries still out there.';
  for(const item of $('dex').children){const caught=state.caught.includes(item.dataset.id),detected=state.detected.includes(item.dataset.id),spawn=world.spawns.find(s=>s.id===item.dataset.id);item.dataset.species=spawn.species;item.style.setProperty('--type-color',personality(spawn.species).color);item.classList.toggle('undiscovered',!caught&&!detected);item.classList.toggle('detected',detected);item.title=caught?spawn.species+' · collected':detected?spawn.species+' · '+spawn.hint:spawn.species+' · Explore to find';item.querySelector('small').textContent=detected?spawn.hint:'';item.classList.toggle('caught',caught);item.setAttribute('aria-label',(caught?'Collected ':'Find ')+world.spawns.find(s=>s.id===item.dataset.id).species);item.querySelector('.dex-status').textContent=caught?'✓':state.detected.includes(item.dataset.id)?'◉':'○';}
  const available=world.spawns.filter(s=>!state.caught.includes(s.id)&&state.detected.includes(s.id)).map(s=>({...s,distance:Math.hypot(s.x-state.position[0],s.y-state.position[1])})).sort((a,b)=>a.distance-b.distance);
  const nearest=available[0],canCatch=state.eligible.length>0;
  $('encounter').querySelector('h3').textContent=nearest?nearest.species:valid===world.spawns.length?'Dex complete!':'Keep exploring';
  $('encounter').querySelector('p').textContent=nearest?Math.round(nearest.distance)+' m · '+nearest.hint:valid===world.spawns.length?'All Pokémon collected':'Move or scan to discover';
  $('encounter').dataset.species=nearest?.species||'';$('encounter').style.setProperty('--type-color',nearest?personality(nearest.species).color:'#83a498');
  $('encounter-eyebrow').textContent=canCatch?'READY':nearest?'NEARBY':'NO SIGNAL';
  $('encounter-portrait').hidden=!nearest;$('encounter-empty').hidden=!!nearest;
  if(nearest){const img=portraits.get(nearest.id);if($('encounter-portrait').getAttribute('src')!==img)$('encounter-portrait').src=img;}
  $('distance-fill').style.width=nearest?Math.max(0,1-nearest.distance/world.config.detection_radius_m)*100+'%':'0%';
  $('catch').disabled=!canCatch||catchBusy||visitBusy;$('catch-label').textContent=catchBusy?'Catching…':canCatch?'Catch':valid===world.spawns.length?'Complete!':nearest?'Get closer':'Explore';
  $('encounter').classList.toggle('in-range',canCatch&&!catchBusy);
  if(state.eligible.some(id=>!previousEligible.has(id)))sound.nearby();
  const newlyDetected=state.detected.filter(id=>!previousDetected.has(id));
  for(const id of newlyDetected){const entry=models.find(m=>m.spawn.id===id);if(!entry)continue;
    const now=performance.now()/1000;if(now-(entry.revealAt??-100)>8){entry.revealAt=now;effects.found(entry.model.position,entry.spawn.species);}
    if(!discoveries.has(id)){discoveries.add(id);showDiscovery(entry.spawn);}
  }
  previousEligible=new Set(state.eligible);previousDetected=new Set(state.detected);
  $('coordinates').textContent=state.coordinates[1].toFixed(5)+', '+state.coordinates[0].toFixed(5);
  ring.geometry.dispose();ring.geometry=new THREE.BufferGeometry().setFromPoints(state.buffer.map(([x,y])=>new THREE.Vector3(x,.7,-y)));
  detectionRing.geometry.dispose();detectionRing.geometry=new THREE.BufferGeometry().setFromPoints(state.detection_buffer.map(([x,y])=>new THREE.Vector3(x,.5,-y)));detectionRing.computeLineDistances();
  $('nearby-count').textContent=state.detected.length+' / '+state.eligible.length;updateLandmarks();
  for(const {spawn,model,halo} of models){model.visible=(state.detected.includes(spawn.id)&&!state.caught.includes(spawn.id))||capturing===spawn.id;halo.visible=model.visible&&!state.caught.includes(spawn.id);}
}
function showDiscovery(spawn){
  const theme=personality(spawn.species);$('found-portrait').src=portraits.get(spawn.id);$('found-name').textContent=spawn.species;
  $('found-place').textContent=spawn.hint;$('found-banner').dataset.species=spawn.species;$('found-banner').style.setProperty('--type-color',theme.color);
  $('found-banner').classList.add('visible');clearTimeout(foundTimer);foundTimer=setTimeout(()=>$('found-banner').classList.remove('visible'),3200);sound.species(spawn.species);
}
$('dismiss-found').onclick=()=>{$('found-banner').classList.remove('visible');clearTimeout(foundTimer);};
async function recoverState(error){
  // A dropped POST response does not prove that the server rejected the action.
  // Read its state without repeating a potentially successful mutation.
  try{state=(await request('world')).state;}catch{}
  toast(error.message);
}
async function doCatch(){
  if(!state||catchBusy||visitBusy||(busy&&!movementTask)||modalOpen()||!state.eligible.length)return;
  catchBusy=true;walking=false;$('found-banner').classList.remove('visible');closeLandmark();updateUI();
  try{
    await movementTask;
    const result=await request('catch',{});state=result.state;
    if(result.caught_pokemon){
      const pokemon=result.caught_pokemon;capturing=pokemon.id;sound.throw();updateUI();
      const entry=models.find(m=>m.spawn.id===pokemon.id);if(entry)await effects.capture(entry.model,player.position,pokemon.color,()=>{sound.impact();sound.species(pokemon.species,true);},pokemon.species);
      capturing=null;const complete=world.spawns.every(s=>state.caught.includes(s.id));
      if(complete)sound.complete();else sound.caught();
      $('capture-banner').dataset.species=pokemon.species;$('capture-banner').style.setProperty('--type-color',personality(pokemon.species).color);$('capture-banner').style.setProperty('--type-accent',personality(pokemon.species).accent);
      $('capture-portrait').src=portraits.get(pokemon.id);$('capture-name').textContent=complete?'Collection complete!':pokemon.species+' caught!';
      $('capture-note').textContent=complete?world.spawns.length+' / '+world.spawns.length+' collected':pokemon.kind;
      $('capture-banner').classList.add('visible');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>$('capture-banner').classList.remove('visible'),3000);
      const item=[...$('dex').children].find(el=>el.dataset.id===pokemon.id);item?.classList.add('just-caught');setTimeout(()=>item?.classList.remove('just-caught'),1300);
    }
  }catch(error){await recoverState(error);}finally{capturing=null;catchBusy=false;if(state)updateUI();}
}
const keys=keyboard(doCatch);
function input(){if(modalOpen())return {dx:0,dy:0};const k=keys();return {dx:Math.max(-1,Math.min(1,k.dx+touch.dx)),dy:Math.max(-1,Math.min(1,k.dy+touch.dy))};}
for(const button of document.querySelectorAll('#touch-controls button')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();touch.dx=Number(button.dataset.dx);touch.dy=Number(button.dataset.dy);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{touch.dx=0;touch.dy=0;});
}
window.addEventListener('blur',()=>{touch.dx=touch.dy=0;walking=false;});
async function tick(){
  const now=performance.now(),dt=Math.min((now-lastInput)/1000,.15);lastInput=now;
  if(!state||busy||catchBusy||visitBusy||document.hidden)return;
  const {dx,dy}=input();if(!dx&&!dy){walking=false;return;}
  busy=true;
  movementTask=(async()=>{
  try{const previous=state.position;state=await request('move',{dx,dy,dt});
    walking=Math.hypot(state.position[0]-previous[0],state.position[1]-previous[1])>.01;heading=Math.atan2(dx,-dy);updateUI();
  }catch(error){walking=false;toast('Connection paused. Check that the local Python server is running.');}finally{busy=false;}
  })();
  await movementTask;movementTask=null;
}
function frame(time){
  requestAnimationFrame(frame);if(!state||document.hidden)return;
  const dt=Math.min((time-previousFrame)/1000||.016,.05);previousFrame=time;const seconds=time/1000,direction=input();
  const moving=walking&&!catchBusy&&!visitBusy&&(direction.dx!==0||direction.dy!==0);
  const target=new THREE.Vector3(state.position[0],moving&&!reducedMotion()?Math.abs(Math.sin(seconds*14))*.5:0,-state.position[1]);
  player.position.lerp(target,reducedMotion()?1:1-Math.exp(-18*dt));
  const delta=Math.atan2(Math.sin(heading-player.rotation.y),Math.cos(heading-player.rotation.y));player.rotation.y+=delta*(1-Math.exp(-12*dt));
  player.userData.animate(seconds,moving,reducedMotion());
  if(moving){sound.step(seconds);if(seconds-dustAt>.2){effects.dust(player.position);dustAt=seconds;}}
  const center=following?new THREE.Vector3(player.position.x,0,player.position.z):panCenter;
  cameraCenter.lerp(center,reducedMotion()?1:1-Math.exp(-8*dt));camera.position.copy(cameraCenter).add(new THREE.Vector3(0,800,450));camera.lookAt(cameraCenter);camera.updateMatrixWorld();
  ring.material.opacity=reducedMotion()?.6:.5+Math.sin(seconds*2)*.12;
  for(const entry of models){const {spawn,model,halo}=entry;
    if(capturing!==spawn.id)animateCreature(entry,seconds,reducedMotion());
    halo.scale.setScalar(state.eligible.includes(spawn.id)&&!reducedMotion()?1+Math.sin(seconds*3)*.08:1);
  }
  if(!reducedMotion())for(const pin of map.pins){pin.jewel.rotation.y=seconds*.65;pin.jewel.position.y=3+Math.sin(seconds*2+pin.marker.position.x)*.5;}
  effects.update(dt);sound.ambience(seconds);
  const w=$('canvas-host').clientWidth,h=$('canvas-host').clientHeight;
  for(const label of landmarkLabels){const p=label.position.clone().project(camera);label.element.style.left=(p.x*.5+.5)*w+'px';label.element.style.top=(-p.y*.5+.5)*h+'px';label.element.hidden=Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1;}
  renderer.clear();renderer.render(scene,camera);renderer.clearDepth();renderer.render(actors,camera);
}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modalOpen()){if(selectedLandmark)closeLandmark();$('journal').classList.remove('open');$('journal-toggle').setAttribute('aria-expanded','false');}});
$('catch').onclick=doCatch;$('follow').onclick=()=>{sound.click();setFollow(!following);};
$('zoom-in').onclick=()=>{span=Math.max(90,span*.8);sound.click();resize();};
$('zoom-out').onclick=()=>{span=Math.min(1200,span*1.25);sound.click();resize();};
$('show-detection').onchange=()=>{detectionRing.visible=$('show-detection').checked;};
$('scan').onclick=()=>{
  if(!state||performance.now()-lastScan<1500)return;lastScan=performance.now();
  effects.scan(player.position,world.config.detection_radius_m,'#79c5c0');sound.scan();
  toast(state.detected.length?state.detected.length+' nearby Pokémon':'No signal · keep moving');
};
$('reload').onclick=async()=>{
  if(busy||catchBusy||visitBusy)return;busy=true;
  try{install(await request('reload',{}));toast('Scene reloaded · progress saved');sound.click();}
  catch(error){toast(error.message);}finally{busy=false;}
};
$('reset').onclick=async()=>{
  if(busy||catchBusy||visitBusy||!confirm('Reset your collection, visited stops and player position?'))return;
  busy=true;try{state=await request('reset',{});previousDetected=new Set();previousEligible=new Set();discoveries.clear();destinationId=null;updateUI();$('gis-dialog').close();overview();toast('A fresh expedition begins.');}
  catch(error){toast(error.message);}finally{busy=false;}
};
$('compare').onclick=async()=>{
  try{const rows=await request('scenarios'),panel=$('scenario-results');panel.replaceChildren();
    for(const row of rows){const line=document.createElement('div');line.textContent=row.detection_m+' m detection → '+row.unique_detected+' detected / '+row.unique_capturable+' capturable: '+(row.detected_ids.join(', ')||'none');panel.appendChild(line);}
    const note=document.createElement('small');note.textContent='Same current player position and all spawns, including caught ones. Straight-line proximity.';panel.appendChild(note);panel.hidden=false;
  }catch(error){toast(error.message);}
};
try{setup();install(await request('world'));$('loading').hidden=true;resize();requestAnimationFrame(frame);setInterval(tick,75);}
catch(error){$('loading').replaceChildren();const message=document.createElement('p');message.textContent='Could not open the map: '+error.message+'. Check the Python server and WebGL support.';$('loading').appendChild(message);console.error(error);}
