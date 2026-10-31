import * as THREE from '../../public/vendor/three.module.js';
import {personality} from './personality.js';

function geometry(motif){
 if(motif==='bubble')return new THREE.TorusGeometry(.7,.09,5,18);
 if(motif==='ember')return new THREE.ConeGeometry(.5,1.8,5);
 const s=new THREE.Shape();
 if(motif==='spark'){
  [[0,1.8],[-.8,.1],[-.1,.1],[-.4,-1.6],[1,.4],[.2,.4]].forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 }else if(motif==='leaf'){
  s.moveTo(0,-1);s.quadraticCurveTo(-1.6,.4,0,1.5);s.quadraticCurveTo(1.6,.4,0,-1);
 }else{
  for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.4:1.1;i?s.lineTo(Math.sin(a)*r,Math.cos(a)*r):s.moveTo(0,r);}
 }
 s.closePath();return new THREE.ShapeGeometry(s);
}

export function elementalEffects(scene,reduced){
 const active=[];
 function remove(fx){scene.remove(fx.group);fx.geo.dispose();fx.group.children.forEach(p=>p.material.dispose());active.splice(active.indexOf(fx),1);}
 function emit(position,species,celebrate=false){
  if(reduced()||document.hidden)return;
  const theme=personality(species),group=new THREE.Group(),geo=geometry(theme.motif);
  group.position.copy(position);group.position.y+=4;
  const count=celebrate?30:18;
  for(let i=0;i<count;i++){
   const p=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%3?theme.color:theme.accent,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false}));
   p.userData.angle=i*2.39996;p.userData.seed=i/count;p.renderOrder=32;p.rotation.x=-.5;group.add(p);
  }
  scene.add(group);active.push({group,geo,theme,age:0,duration:celebrate?1.8:1.5});
 }
 function update(dt){
  for(const fx of [...active]){
   fx.age+=dt;const t=fx.age/fx.duration;
   if(t>=1||reduced()){remove(fx);continue;}
   fx.group.children.forEach(p=>{
    const a=p.userData.angle,n=p.userData.seed;
    const orbit=fx.theme.motif==='leaf'||fx.theme.motif==='bubble';
    const angle=a+(orbit?t*3:0),radius=2+t*(orbit?7:14)*(1+n*.3);
    p.position.set(Math.cos(angle)*radius,Math.sin(t*Math.PI)*(4+n*5)+(fx.theme.motif==='ember'?t*8:0),Math.sin(angle)*radius);
    p.rotation.z=a+t*(fx.theme.motif==='spark'?1:3);p.scale.setScalar((.5+Math.sin(t*Math.PI))*(fx.theme.motif==='bubble'?1.5:1));p.material.opacity=Math.min(1,t*6)*(1-t);
   });
  }
 }
 return {emit,update};
}
