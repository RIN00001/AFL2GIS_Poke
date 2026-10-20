import * as THREE from '../../public/vendor/three.module.js';

export function createEffects(scene, reducedMotion) {
  const effects=[];
  function material(color){return new THREE.MeshBasicMaterial({color,transparent:true,depthTest:false,depthWrite:false});}
  function burst(position,color){
    if(reducedMotion())return;
    const group=new THREE.Group();group.position.copy(position);group.position.y+=6;
    const geometry=new THREE.OctahedronGeometry(.8);
    for(let i=0;i<24;i++){
      const particle=new THREE.Mesh(geometry,material(i%3===0?'#fff6b5':color));
      const angle=i*2.39996;particle.userData.velocity=new THREE.Vector3(Math.cos(angle)*(8+i%5),10+i%8,Math.sin(angle)*(8+i%5));particle.renderOrder=31;group.add(particle);
    }
    scene.add(group);effects.push({group,age:0,duration:1.2,type:'burst'});
  }
  function capture(model, from, color){
    if(reducedMotion()||document.hidden)return Promise.resolve();
    const start=from.clone().add(new THREE.Vector3(0,8,0)),end=model.position.clone().add(new THREE.Vector3(0,7,0));
    const ball=new THREE.Group();
    for(const [color,theta] of [['#ed7257',0],['#fff9e7',Math.PI/2]]){
      const half=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,8,0,Math.PI*2,theta,Math.PI/2),material(color));half.renderOrder=30;ball.add(half);
    }
    const band=new THREE.Mesh(new THREE.TorusGeometry(1.6,.18,6,20),material('#344e45'));band.rotation.x=Math.PI/2;band.renderOrder=31;ball.add(band);scene.add(ball);
    const originalScale=model.scale.clone();
    return new Promise(resolve=>{
      const effect={group:ball,model,start,end,originalScale,age:0,duration:.95,type:'capture',done:false};
      effect.finish=()=>{if(effect.done)return;effect.done=true;model.scale.copy(originalScale);model.visible=false;burst(end,color);remove(effect);resolve();};
      // Finish even if requestAnimationFrame pauses in a background tab.
      effect.timer=setTimeout(effect.finish,1100);effects.push(effect);
    });
  }
  function remove(effect){
    scene.remove(effect.group);const geometries=new Set(),materials=new Set();effect.group.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);if(obj.material)materials.add(obj.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    const index=effects.indexOf(effect);if(index>=0)effects.splice(index,1);
  }
  function update(dt){
    for(const effect of [...effects]){
      effect.age+=dt;const t=Math.min(effect.age/effect.duration,1);
      if(effect.type==='capture'){
        const travel=Math.min(t/.6,1);effect.group.position.lerpVectors(effect.start,effect.end,travel);effect.group.position.y+=Math.sin(travel*Math.PI)*20;effect.group.rotation.z+=dt*9;
        if(t>.55)effect.model.scale.copy(effect.originalScale).multiplyScalar(Math.max(.02,1-(t-.55)/.35));
        if(t>=1) {clearTimeout(effect.timer);effect.finish();}
      }else{
        for(const p of effect.group.children){p.position.addScaledVector(p.userData.velocity,dt);p.userData.velocity.y-=dt*24;p.material.opacity=1-t;p.rotation.x+=dt*3;p.rotation.z+=dt*2;}
        if(t>=1)remove(effect);
      }
    }
  }
  return {capture,burst,update};
}

export function markerHalo(color){
  const group=new THREE.Group();
  const disc=new THREE.Mesh(new THREE.CircleGeometry(7,32),new THREE.MeshBasicMaterial({color:'#304a3e',transparent:true,opacity:.12,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.85;group.add(disc);
  const rim=new THREE.Mesh(new THREE.RingGeometry(7.5,8,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));rim.rotation.x=-Math.PI/2;rim.position.y=1;group.add(rim);
  return group;
}
