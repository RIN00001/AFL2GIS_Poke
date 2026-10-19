import * as THREE from '../public/vendor/three.module.js';
import {request} from './api/client.js';
import {keyboard} from './controls/keyboard.js';
import {character} from './scene/models.js';
import {mapLayers} from './map/layers.js';

const $=id=>document.getElementById(id);
let world,state,map,models=[],landmarkLabels=[],following=true,span=420,busy=false,catchBusy=false,lastInput=performance.now(),toastTimer;
let scene,camera,renderer,player,ring,worldGroup;
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function setup(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#e4e9d8');scene.add(new THREE.HemisphereLight('#fff9e5','#a3b596',2.6));
  const sun=new THREE.DirectionalLight('#fff8df',2.1);sun.position.set(-200,500,250);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.MeshStandardMaterial({color:'#e0e7d2'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.1;scene.add(ground);
  camera=new THREE.OrthographicCamera(-400,400,300,-300,1,4000);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;$('canvas-host').appendChild(renderer.domElement);
  player=character('Player','#ed835a',true);scene.add(player);
  ring=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#548c73',depthTest:false}));ring.renderOrder=15;scene.add(ring);
  new ResizeObserver(resize).observe($('canvas-host'));
}
function resize(){if(!renderer)return;const {clientWidth:w,clientHeight:h}=$('canvas-host');renderer.setSize(w,h);camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
function dispose(group){group.traverse(obj=>{obj.geometry?.dispose();if(obj.material){for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose();}});}
function install(data){
  world=data;state=data.state;
  if(worldGroup){scene.remove(worldGroup);dispose(worldGroup);}
  worldGroup=new THREE.Group();map=mapLayers(world.layers);worldGroup.add(map.group);models=[];
  for(const spawn of world.spawns){const model=character(spawn.species,spawn.color);model.position.set(spawn.x,0,-spawn.y);worldGroup.add(model);models.push({spawn,model});}
  scene.add(worldGroup);$('labels').replaceChildren();landmarkLabels=[];
  for(const landmark of world.landmarks){const element=document.createElement('div');element.className='landmark-label';element.textContent=(landmark.id==='hospital'?'✚  ':'◈  ')+landmark.name;$('labels').appendChild(element);landmarkLabels.push({element,position:new THREE.Vector3(landmark.position[0],22,-landmark.position[1])});}
  $('dex').replaceChildren();
  for(const s of world.spawns){const item=document.createElement('div');item.className='dex-item';item.dataset.id=s.id;const orb=document.createElement('span');orb.className='orb';orb.style.background=s.color;const text=document.createElement('span');const b=document.createElement('b');b.textContent=s.species;const small=document.createElement('small');small.textContent=s.kind;text.append(b,small);item.append(orb,text);$('dex').appendChild(item);}
  document.querySelector('.section-label span').textContent=`${world.spawns.length} SPECIES`;
  map.habitats.visible=$('show-habitats').checked;
  $('radius').textContent=`${world.config.catch_radius_m} m`;
  $('scenario-results').hidden=true;
  updateUI();
}
function updateUI(){
  const valid=world.spawns.filter(s=>state.caught.includes(s.id)).length;
  $('progress').textContent=`${valid} / ${world.spawns.length}`;$('progress-fill').style.width=`${valid/world.spawns.length*100}%`;
  $('progress-note').textContent=valid===world.spawns.length?'Collection complete. What a field day!':`${world.spawns.length-valid} discoveries still out there.`;
  for(const item of $('dex').children)item.classList.toggle('caught',state.caught.includes(item.dataset.id));
  const available=world.spawns.filter(s=>!state.caught.includes(s.id)).map(s=>({...s,distance:Math.hypot(s.x-state.position[0],s.y-state.position[1])})).sort((a,b)=>a.distance-b.distance);
  const nearest=available[0];
  $('encounter').querySelector('h3').textContent=nearest?nearest.species:'Collection complete!';
  $('encounter').querySelector('p').textContent=nearest?`${Math.round(nearest.distance)} m away · ${nearest.kind}\n${nearest.habitats.join(' / ')||'Outside habitat zones'}`:'Eight discoveries, one great expedition.';
  const canCatch=state.eligible.length>0;$('catch').disabled=!canCatch||catchBusy;$('catch').textContent=canCatch?'E  ·  Catch Pokémon':nearest?'Move closer to catch':'All Pokémon collected';
  $('coordinates').textContent=`${state.coordinates[1].toFixed(5)}, ${state.coordinates[0].toFixed(5)}`;
  const points=state.buffer.map(([x,y])=>new THREE.Vector3(x,1,-y));ring.geometry.dispose();ring.geometry=new THREE.BufferGeometry().setFromPoints(points);
  for(const {spawn,model} of models)model.visible=!state.caught.includes(spawn.id);
}
async function doCatch(){if(!state||catchBusy||busy)return;catchBusy=true;try{const result=await request('catch',{});state=result.state;toast(result.caught_pokemon?`${result.caught_pokemon.species} added to your Pokédex!`:'Get closer to a Pokémon first.');updateUI();}catch(e){toast(e.message);}finally{catchBusy=false;if(state)updateUI();}}
const input=keyboard(doCatch);
async function tick(){
  const now=performance.now(),dt=Math.min((now-lastInput)/1000,.15);lastInput=now;
  if(!state||busy||catchBusy||document.hidden)return;
  const {dx,dy}=input();if(!dx&&!dy)return;
  busy=true;
  try{state=await request('move',{dx,dy,dt});player.rotation.y=Math.atan2(dx,-dy);updateUI();}catch(e){toast('Local server disconnected. Start the Python server again.');}finally{busy=false;}
}
function frame(time){
  requestAnimationFrame(frame);if(!state)return;
  const target=new THREE.Vector3(state.position[0],0,-state.position[1]);player.position.lerp(target,.3);
  const center=following?player.position:new THREE.Vector3(170,0,-210);
  camera.position.copy(center).add(new THREE.Vector3(0,700,530));camera.lookAt(center);
  for(const {model} of models)model.position.y=.5+Math.sin(time*.002+model.position.x)*.5;
  const w=$('canvas-host').clientWidth,h=$('canvas-host').clientHeight;
  for(const label of landmarkLabels){const p=label.position.clone().project(camera);label.element.style.left=`${(p.x*.5+.5)*w}px`;label.element.style.top=`${(-p.y*.5+.5)*h}px`;label.element.hidden=Math.abs(p.x)>1||Math.abs(p.y)>1;}
  renderer.render(scene,camera);
}
$('catch').onclick=doCatch;
$('follow').onclick=()=>{following=!following;span=following?420:1500;$('follow').textContent=following?'View whole area':'Follow player';resize();};
$('zoom-in').onclick=()=>{span=Math.max(160,span*.8);resize();};$('zoom-out').onclick=()=>{span=Math.min(2000,span*1.25);resize();};
$('show-habitats').onchange=()=>{if(map)map.habitats.visible=$('show-habitats').checked;};
$('reload').onclick=async()=>{if(busy||catchBusy)return;busy=true;try{install(await request('reload',{}));toast('Python spawns, settings, and GIS layers reloaded.');}catch(e){toast(e.message);}finally{busy=false;}};
$('reset').onclick=async()=>{if(busy||catchBusy||!confirm('Reset all caught Pokémon and return to campus?'))return;busy=true;try{state=await request('reset',{});updateUI();toast('A fresh expedition begins.');}catch(e){toast(e.message);}finally{busy=false;}};
$('compare').onclick=async()=>{try{const rows=await request('scenarios');const panel=$('scenario-results');panel.replaceChildren();for(const r of rows){const line=document.createElement('div');line.textContent=`${r.radius_m} m radius → ${r.unique_catchable} unique spawn(s): ${r.spawn_ids.join(', ')||'none'}`;panel.appendChild(line);}const note=document.createElement('small');note.textContent='Same current player position and all spawns, including caught ones. Straight-line distance, not walking access.';panel.appendChild(note);panel.hidden=false;}catch(e){toast(e.message);}};
try{setup();install(await request('world'));$('loading').hidden=true;resize();requestAnimationFrame(frame);setInterval(tick,75);}catch(e){$('loading').textContent=`Could not start: ${e.message}. Check the local Python server and WebGL support.`;console.error(e);}
