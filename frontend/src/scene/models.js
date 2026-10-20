import * as THREE from '../../public/vendor/three.module.js';

// Original procedural fan-art: low-poly primitives, no downloaded character assets.
export function character(species, color, player=false) {
  const group = new THREE.Group();
  function ball(c, x,y,z, sx,sy,sz) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:1}));
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;
  }
  function cone(c,x,y,z,r,h, rotation=0) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(r,h,5),new THREE.MeshStandardMaterial({color:c,flatShading:true}));
    mesh.position.set(x,y,z);mesh.rotation.z=rotation;group.add(mesh);return mesh;
  }
  const body=player?'#e26f4d':color;
  ball(body,0,4,0,3.4,4.3,2.8);ball(player?'#edc8a2':color,0,9,0,3.4,3.2,3);
  ball('#303f3a',-1.2,9.5,2.7,.45,.65,.35);ball('#303f3a',1.2,9.5,2.7,.45,.65,.35);
  const leftFoot=ball(player?'#374e59':color,-2,1,1,1.5,1.1,2),rightFoot=ball(player?'#374e59':color,2,1,1,1.5,1.1,2);
  let leftArm,rightArm;
  if(player){ball('#f4f0dd',0,11.5,0,3.5,1,3.3);ball('#427566',0,5,-2.7,2.4,2.7,1.5);leftArm=ball('#edc8a2',-4,5,0,1,2,1);rightArm=ball('#edc8a2',4,5,0,1,2,1);}
  if(species==='Pikachu'){cone('#f5c842',-2,14,0,1.1,6,-.2);cone('#f5c842',2,14,0,1.1,6,.2);ball('#e65f48',-2.5,8.4,2.5,.8,.7,.4);ball('#e65f48',2.5,8.4,2.5,.8,.7,.4);cone('#d3a22e',4,5,-2,2,7,-.7);}
  if(species==='Bulbasaur'){ball('#4d8c57',0,6,-3,3.7,3,3);cone('#447a4b',0,9,-3,3,5);cone(color,-2,12,0,1,3);cone(color,2,12,0,1,3);}
  if(species==='Squirtle'){ball('#a5764e',0,4,-2,3.8,4,2);ball('#efd6a2',0,4,2.5,2.5,3,.7);ball(color,0,2,-5,1.8,1.8,1.8);}
  if(species==='Eevee'){cone(color,-2,14,0,1.7,7,-.25);cone(color,2,14,0,1.7,7,.25);ball('#efdab3',0,6,0,4,1.5,3.2);ball(color,2,4,-4,2,3,3);ball('#efdab3',2,5,-6,1.5,2,1.5);}
  if(species==='Jigglypuff'){ball(color,0,6,0,5,5,4);cone(color,-3,11,0,1.7,4);cone(color,3,11,0,1.7,4);ball('#58a1aa',-1.8,7,3.6,1,1.2,.5);ball('#58a1aa',1.8,7,3.6,1,1.2,.5);ball(color,0,11,2,1.7,1.7,1.7);}
  if(species==='Charizard'){cone('#4c8b91',-5,7,-1,4,10,.65);cone('#4c8b91',5,7,-1,4,10,-.65);cone(color,-2,12,0,1,4);cone(color,2,12,0,1,4);ball('#f4ce8e',0,4,2,2.2,3,1);ball(color,2,3,-4,1.5,1.5,4);cone('#ffd24b',2,5,-7,1.5,5);}
  if(species==='Snorlax'){ball(color,0,5,0,5,5.5,4);ball('#eee3bd',0,5,3,3.9,4,1.5);cone(color,-2,12,0,1.4,3);cone(color,2,12,0,1.4,3);}
  if(species==='Gengar'){cone(color,-3,12,0,2,5);cone(color,3,12,0,2,5);for(let i=-2;i<=2;i++)cone(color,i*1.3,8,-3,1.5,5);ball('#eb6874',-1.2,9.5,2.8,.6,.5,.3);ball('#eb6874',1.2,9.5,2.8,.6,.5,.3);ball('#eee8e1',0,7.7,2.8,1.6,.4,.4);}
  // Free movement can cross building footprints. Keep game characters readable
  // above map geometry, like map markers, while retaining their 3D lighting.
  group.traverse(obj=>{if(obj.isMesh){obj.renderOrder=20;obj.material.depthTest=false;}});
  const animated=group.children.map(mesh=>({mesh,position:mesh.position.clone(),scale:mesh.scale.clone(),rotation:mesh.rotation.clone()}));
  group.userData.animate=(time,moving,reduced)=>{
    const stride=moving&&!reduced?Math.sin(time*14):0;
    leftFoot.position.z=1+stride*1.8;rightFoot.position.z=1-stride*1.8;
    leftFoot.position.y=1+Math.max(0,stride)*1.1;rightFoot.position.y=1+Math.max(0,-stride)*1.1;
    if(player){leftArm.rotation.x=stride*.7;rightArm.rotation.x=-stride*.7;return;}
    if(reduced)return;
    for(const part of animated){
      if(species==='Charizard'&&part.mesh.geometry.type==='ConeGeometry'&&Math.abs(part.position.x)===5)part.mesh.rotation.z=part.rotation.z+Math.sin(time*4)*.28*Math.sign(part.position.x);
      if((species==='Pikachu'||species==='Eevee')&&part.position.y===14)part.mesh.rotation.z=part.rotation.z+Math.sin(time*2.4)*.07;
    }
  };
  return group;
}
