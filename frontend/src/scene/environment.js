import * as THREE from '../../public/vendor/three.module.js';

// Decorative landscaping only. These meshes never change GIS or movement rules.
export function createEnvironment(layers, landmarks, spawns) {
  const group=new THREE.Group();
  const ring=layers.play_area.features[0].geometry.coordinates[0];
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const bounds={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};
  function inside(x,y,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
  }return hit;}
  function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;
    return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
  let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const trunkGeo=new THREE.CylinderGeometry(.5,.7,4,5),leafGeo=new THREE.IcosahedronGeometry(3.4,1);
  const trunkMat=new THREE.MeshStandardMaterial({color:'#ac956e',roughness:1});
  const greens=['#75b67e','#8fc28b','#6faf83','#a4ce91'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  for(let i=0;i<480&&group.children.length<115;i++){
    const x=bounds.x0+random()*(bounds.x1-bounds.x0),y=bounds.y0+random()*(bounds.y1-bounds.y0);
    if(!inside(x,y,ring)||layers.areas.features.some(f=>inside(x,y,f.geometry.coordinates[0])))continue;
    if(layers.paths.features.some(f=>f.geometry.coordinates.slice(1).some((b,j)=>segmentDistance(x,y,f.geometry.coordinates[j],b)<f.properties.width_m/2+6)))continue;
    if(landmarks.some(p=>Math.hypot(p.position[0]-x,p.position[1]-y)<12)||spawns.some(p=>Math.hypot(p.x-x,p.y-y)<12))continue;
    const tree=new THREE.Group(),height=.7+random()*.65;tree.position.set(x,0,-y);tree.scale.setScalar(height);
    const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.position.y=2;tree.add(trunk);
    const crown=new THREE.Mesh(leafGeo,greens[i%4]);crown.position.y=6;crown.scale.y=1.25;crown.castShadow=true;tree.add(crown);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(3,12),new THREE.MeshBasicMaterial({color:'#537d58',transparent:true,opacity:.09,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.03;tree.add(shadow);group.add(tree);
  }
  return {group,bounds};
}
