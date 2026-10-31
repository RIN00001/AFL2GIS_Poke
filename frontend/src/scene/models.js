import * as THREE from '../../public/vendor/three.module.js';

// Original procedural miniatures. No downloaded meshes, textures or recordings.
export function character(species,color,player=false){
  const group=new THREE.Group(),parts={eyes:[],cheeks:[]},wings=[];
  const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.8});
  function sphere(c,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
  function cone(c,x,y,z,r,h,rz=0){const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,8),mat(c));m.position.set(x,y,z);m.rotation.z=rz;group.add(m);return m;}
  function eye(x,y,z,scale=1){parts.eyes.push(sphere('#263c36',x,y,z,.42*scale,.62*scale,.27*scale));sphere('#fffef4',x-.1*scale,y+.2*scale,z+.23*scale,.13*scale,.16*scale,.08*scale);}
  function ears(c,y=12){const l=cone(c,-2,y,0,1.1,5,-.2),r=cone(c,2,y,0,1.1,5,.2);parts.ears=[l,r];}
  const bodyColor=player?'#e88455':color;
  if(species==='Bulbasaur'){
    sphere(color,0,3,0,4,2.8,4.5);sphere(color,0,5,3.5,3.8,3,3);
    for(const x of [-2.7,2.7])for(const z of [-2,3])sphere(color,x,1,z,1.4,1.4,1.5);
    parts.bulb=sphere('#448b5d',0,6,-1.8,3.6,2.8,3.4);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;cone('#579c66',Math.cos(a)*1.5,8,-1.8+Math.sin(a)*1.5,1.8,4,.2*Math.cos(a));}
    cone(color,-2.5,8,3,1.1,2.7);cone(color,2.5,8,3,1.1,2.7);eye(-1.5,5.5,6.1);eye(1.5,5.5,6.1);
    for(const [x,y,z] of [[-3,4,3],[-2,3,-1],[2.8,4,2]])sphere('#397d67',x,y,z,.7,.5,.45);
  }else{
    sphere(bodyColor,0,4,0,3.3,4,2.6);sphere(player?'#edc9a4':color,0,9,0,3.2,3,2.9);
    eye(-1.15,9.3,2.65);eye(1.15,9.3,2.65);
    sphere('#8e6655',0,8,2.95,.3,.18,.15);
    parts.leftFoot=sphere(player?'#425e63':color,-1.8,1,1,1.4,1,1.8);
    parts.rightFoot=sphere(player?'#425e63':color,1.8,1,1,1.4,1,1.8);
    parts.leftArm=sphere(player?'#edc9a4':color,-3.4,5,0,.85,1.8,1);
    parts.rightArm=sphere(player?'#edc9a4':color,3.4,5,0,.85,1.8,1);
  }
  if(player){
    sphere('#325b4b',0,5,-2.5,2.4,2.7,1.3);sphere('#e5d6ac',0,11.4,0,3.5,.8,3.2);sphere('#f1e5c6',0,12,0,2.6,1.2,2.6);
    sphere('#375947',0,4,2.45,2,1.8,.25);sphere('#eac06c',0,5,2.8,.5,.5,.15);
  }
  if(species==='Pikachu'){
    ears(color,13.4);cone('#3d4740',-2.6,15.2,0,.7,1.7,-.2);cone('#3d4740',2.6,15.2,0,.7,1.7,.2);
    parts.cheeks.push(sphere('#ef7056',-2.45,8.3,2.35,.75,.65,.32),sphere('#ef7056',2.45,8.3,2.35,.75,.65,.32));
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(1.7,2);shape.lineTo(.7,3.7);shape.lineTo(4.3,6);shape.lineTo(3.6,8);shape.lineTo(7,8);shape.lineTo(6,4.8);shape.lineTo(3,3.3);shape.lineTo(3.8,1.5);shape.closePath();
    const tail=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:false}),mat('#dab23c'));tail.position.set(2.4,2,-3);tail.rotation.y=.4;group.add(tail);parts.tail=tail;
    for(const y of [3,5])sphere('#9c753b',0,y,-2.6,2,.4,.2);
  }
  if(species==='Squirtle'){
    sphere('#966c49',0,4,-2.1,3.8,3.9,1.8);sphere('#e9d5a3',0,4,2.35,2.4,3,.6);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(3.1,.35,8,24),mat('#e5d3a8'));rim.position.set(0,4,-2.5);group.add(rim);
    for(const y of [2.5,4,5.5])sphere('#c0ac7e',0,y,2.92,2,.08,.08);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,2,-3),new THREE.Vector3(1,2,-6),new THREE.Vector3(3,3,-7),new THREE.Vector3(3.5,5,-6),new THREE.Vector3(2,5.5,-5.5)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,20,.65,8,false),mat(color)));
  }
  if(species==='Eevee'){
    ears(color,14);cone('#795c49',-2,14.2,.25,.7,3.5,-.2);cone('#795c49',2,14.2,.25,.7,3.5,.2);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;sphere('#eedcba',Math.cos(a)*2.6,6.1+Math.sin(a)*.35,Math.sin(a)*2.1,1.4,1.2,1.4);}
    const tail=sphere(color,2.7,4,-4.1,2,2.8,3);tail.rotation.x=-.5;parts.tail=tail;parts.tailTip=sphere('#eedcba',3,6,-6,1.6,1.7,1.7);
    sphere('#e2cba7',0,8,2.7,1.3,.7,.45);sphere('#533f34',0,8.4,3.1,.32,.24,.2);
  }
  if(species==='Charizard'){
    sphere('#f4d39c',0,4,2.25,2.1,3,.55);sphere(color,0,8.5,2.5,2,1.3,2);sphere('#a75d39',0,9,4.1,.3,.2,.15);
    cone(color,-1.9,12,0,.8,3);cone(color,1.9,12,0,.8,3);
    for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*2.7,7,-1.8);const vertices=new Float32Array([0,0,0,side*6,6,-2,side*8,0,-1,0,0,0,side*8,0,-1,side*4,-3,0]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));geo.computeVertexNormals();const membrane=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#478e94',side:THREE.DoubleSide,roughness:.9}));wing.add(membrane);const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(side*6,6,-2),new THREE.Vector3(side*8,0,-1),new THREE.Vector3(side*4,-3,0)]),new THREE.LineBasicMaterial({color:'#da8750'}));wing.add(outline);group.add(wing);wings.push({wing,side});}
    sphere(color,1,2,-4,1.5,1.3,3.4);const flame=cone('#f4b643',1,4,-7,1.5,4);cone('#fff0a6',1,4,-6.9,.75,2.5);parts.flame=flame;
  }
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.renderOrder=20;}});
  group.userData.animate=(t,moving,reduced)=>{
    const stride=moving&&!reduced?Math.sin(t*13):0;
    if(parts.leftFoot){parts.leftFoot.position.z=1+stride*1.4;parts.rightFoot.position.z=1-stride*1.4;parts.leftFoot.position.y=1+Math.max(0,stride)*.7;parts.rightFoot.position.y=1+Math.max(0,-stride)*.7;}
    if(player){parts.leftArm.rotation.x=stride*.6;parts.rightArm.rotation.x=-stride*.6;}
    const blink=!reduced&&Math.sin(t*1.7)>.995?.12:1;
    parts.eyes.forEach(eye=>eye.scale.y=.62*blink);
    if(parts.tail){parts.tail.rotation.z=reduced?0:Math.sin(t*(species==='Eevee'?5:3))*.16;}
    if(parts.tailTip)parts.tailTip.position.x=3+(reduced?0:Math.sin(t*5)*.35);
    if(parts.bulb)parts.bulb.rotation.z=reduced?0:Math.sin(t*1.6)*.06;
    for(const cheek of parts.cheeks){cheek.material.emissive.set('#ed9532');cheek.material.emissiveIntensity=reduced?0:.12+Math.max(0,Math.sin(t*4))*.35;}
    if(reduced)return;
    if(!player&&parts.leftArm){const speed=species==='Squirtle'?3:2;parts.leftArm.rotation.z=Math.sin(t*speed)*.2;parts.rightArm.rotation.z=-Math.sin(t*speed)*.2;}
    for(const {wing,side} of wings)wing.rotation.y=Math.sin(t*3.3)*.2*side;
    if(parts.ears)parts.ears.forEach((ear,i)=>ear.rotation.z=(i?1:-1)*(.2+Math.sin(t*2)*.04));
    if(parts.flame)parts.flame.scale.setScalar(1+Math.sin(t*7)*.07);
  };
  return group;
}
