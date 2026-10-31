import {elementalEffects} from './elemental.js';
import {captureReaction,personality} from './personality.js';
import * as THREE from '../../public/vendor/three.module.js';

export function createEffects(scene,reducedMotion){
  const effects=[],elements=elementalEffects(scene,reducedMotion);
  function material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:false,depthWrite:false});}
  function remove(effect){
    scene.remove(effect.group);const geometries=new Set(),materials=new Set();
    effect.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    const index=effects.indexOf(effect);if(index>=0)effects.splice(index,1);
  }
  function scan(position,radius,color='#82cdb5'){
    if(reducedMotion()||document.hidden)return;
    const group=new THREE.Group();group.position.set(position.x,.8,position.z);
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.95,1,80),material(color,.6));mesh.rotation.x=-Math.PI/2;mesh.renderOrder=16;group.add(mesh);
    scene.add(group);effects.push({group,radius,age:0,duration:1.6,type:'scan'});
  }
  function burst(position,color){
    if(reducedMotion()||document.hidden)return;
    const group=new THREE.Group();group.position.copy(position);group.position.y+=5;
    const geometry=new THREE.OctahedronGeometry(.8);
    for(let i=0;i<32;i++){
      const particle=new THREE.Mesh(geometry,material(i%3===0?'#fff7af':color));
      const a=i*2.39996;particle.userData.velocity=new THREE.Vector3(Math.cos(a)*(9+i%7),13+i%9,Math.sin(a)*(9+i%7));
      particle.renderOrder=31;group.add(particle);
    }
    scene.add(group);effects.push({group,age:0,duration:1.35,type:'burst'});scan(position,17,color);
  }
  function dust(position){
    if(reducedMotion()||effects.length>35)return;
    const group=new THREE.Group();group.position.copy(position);
    const geometry=new THREE.IcosahedronGeometry(.45,0);
    for(let i=0;i<3;i++){
      const p=new THREE.Mesh(geometry,material('#f9f1ca',.35));p.position.set((i-1)*.7,.3,0);
      p.userData.velocity=new THREE.Vector3((i-1)*1.4,1.5,1);group.add(p);
    }
    scene.add(group);effects.push({group,age:0,duration:.5,type:'dust'});
  }
  function capture(model,from,color,onImpact=()=>{},species='Eevee'){
    if(reducedMotion()||document.hidden){model.visible=false;return Promise.resolve();}
    const start=from.clone().add(new THREE.Vector3(0,6,0)),end=model.position.clone().add(new THREE.Vector3(0,6,0));
    const ball=new THREE.Group();
    for(const [c,theta] of [['#ef7662',0],['#fffdf4',Math.PI/2]]){
      const half=new THREE.Mesh(new THREE.SphereGeometry(1.9,20,10,0,Math.PI*2,theta,Math.PI/2),material(c));half.renderOrder=30;ball.add(half);
    }
    const band=new THREE.Mesh(new THREE.TorusGeometry(1.9,.2,6,24),material('#3e5655'));band.rotation.x=Math.PI/2;band.renderOrder=31;ball.add(band);
    const button=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),material('#fffcec'));button.position.set(0,0,1.9);button.renderOrder=32;ball.add(button);
    // The ball needs normal depth testing so its two halves form a solid sphere.
    ball.traverse(o=>{if(o.material){o.material.depthTest=true;o.material.depthWrite=true;o.material.transparent=false;}});
    scene.add(ball);const originalScale=new THREE.Vector3(.65,.65,.65),origin=model.position.clone(),rotation=model.rotation.clone();
    return new Promise(resolve=>{
      const effect={group:ball,model,start,end,originalScale,origin,rotation,species,age:0,duration:1.9,type:'capture',done:false,onImpact,impacted:false};
      effect.finish=()=>{if(effect.done)return;effect.done=true;clearTimeout(effect.timer);model.scale.copy(originalScale);model.position.copy(origin);model.rotation.copy(rotation);model.visible=false;elements.emit(end,species,true);scan(end,17,personality(species).color);remove(effect);resolve();};
      // Complete the transaction animation even when a background tab pauses frames.
      effect.timer=setTimeout(effect.finish,2400);effects.push(effect);
    });
  }
  function update(dt){
    elements.update(dt);
    for(const effect of [...effects]){
      effect.age+=dt;const t=Math.min(effect.age/effect.duration,1);
      if(reducedMotion()){if(effect.type==='capture')effect.finish();else remove(effect);continue;}
      if(effect.type==='capture'){
        captureReaction(effect.model,effect.species,t,effect.origin);
        const travel=Math.min(t/.45,1);effect.group.position.lerpVectors(effect.start,effect.end,travel);effect.group.position.y+=Math.sin(travel*Math.PI)*15;
        if(t<.45)effect.group.rotation.z+=dt*8;
        else {effect.group.rotation.z=Math.sin((t-.45)*38)*.25;effect.group.position.y=effect.end.y-4*Math.min((t-.45)/.15,1);}
        if(t>.43&&!effect.impacted){effect.impacted=true;effect.onImpact();elements.emit(effect.end,effect.species);scan(effect.end,10,personality(effect.species).color);}
        if(t>.4)effect.model.scale.copy(effect.originalScale).multiplyScalar(Math.max(.01,1-(t-.4)/.18));
        if(t>=1)effect.finish();
      }else if(effect.type==='scan'){
        effect.group.scale.setScalar(Math.max(.01,effect.radius*t));effect.group.children[0].material.opacity=.55*(1-t);
        if(t>=1)remove(effect);
      }else{
        for(const p of effect.group.children){
          p.position.addScaledVector(p.userData.velocity,dt);
          if(effect.type==='burst')p.userData.velocity.y-=dt*25;
          p.material.opacity=(effect.type==='dust'?.35:1)*(1-t);p.rotation.x+=dt*3;
        }
        if(t>=1)remove(effect);
      }
    }
  }
  return {capture,burst,scan,dust,update,found:(position,species)=>elements.emit(position,species)};
}
export function markerHalo(color){
  const group=new THREE.Group();
  const disc=new THREE.Mesh(new THREE.CircleGeometry(5.5,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.08,depthTest:false,depthWrite:false}));
  disc.rotation.x=-Math.PI/2;disc.position.y=.6;disc.renderOrder=14;group.add(disc);
  const rim=new THREE.Mesh(new THREE.RingGeometry(5.7,6,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
  rim.rotation.x=-Math.PI/2;rim.position.y=.7;rim.renderOrder=15;group.add(rim);return group;
}
