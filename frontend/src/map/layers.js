import * as THREE from '../../public/vendor/three.module.js';

export function polygon(geometry,color,height=0,opacity=1) {
  const rings=geometry.coordinates;
  const makeShape=ring=>{const s=new THREE.Shape();ring.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));return s;};
  const shape=makeShape(rings[0]);
  for(const ring of rings.slice(1)){const hole=new THREE.Path();ring.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));shape.holes.push(hole);}
  const geo=height?new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}):new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI/2);
  const options={color,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1};
  // Flat map colors stay bright and stable; only extruded buildings need lighting.
  const material=height?new THREE.MeshStandardMaterial({...options,roughness:1}):new THREE.MeshBasicMaterial({...options,toneMapped:false});
  return new THREE.Mesh(geo,material);
}
function road(coords,width,color,y){
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color,toneMapped:false});
  for(let i=1;i<coords.length;i++){
    const [ax,ay]=coords[i-1],[bx,by]=coords[i],length=Math.hypot(bx-ax,by-ay);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,length),material);
    mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-Math.atan2(bx-ax,by-ay);mesh.position.set((ax+bx)/2,y,-(ay+by)/2);group.add(mesh);
  }return group;
}
export function mapLayers(layers){
  const group=new THREE.Group(),habitats=new THREE.Group();
  // Separate horizontal surfaces to avoid coplanar depth flicker. Water writes
  // depth above land AND habitat fills, so neither can tint or cover a pond.
  for(const f of layers.landcover.features){const tags=f.properties;const water=tags.natural==='water'||tags.landuse==='reservoir';const residential=tags.landuse==='residential';const p=polygon(f.geometry,water?'#8dcddd':residential?'#e8eedc':'#d3e6ba');p.position.y=water?.22:residential?.02:.06;group.add(p);}
  for(const f of layers.paths.features){const major=['primary','secondary','tertiary','unclassified','residential'].includes(f.properties.highway);const width=major?10:5;group.add(road(f.geometry.coordinates,width+3,'#c5cdb7',.3));group.add(road(f.geometry.coordinates,width,'#faf7e9',.4));}
  for(const f of layers.buildings.features){let height=Number.parseFloat(f.properties.height)||Number.parseFloat(f.properties['building:levels'])*3.5||7;height=Math.min(Math.max(height,3),65);group.add(polygon(f.geometry,'#d4cebf',height));}
  for(const f of layers.habitats.features){const p=polygon(f.geometry,f.properties.color||'#8fb589',0,.16);p.position.y=.12;habitats.add(p);}
  group.add(habitats);
  const boundary=layers.play_area.features[0].geometry.coordinates[0].map(([x,y])=>new THREE.Vector3(x,.8,-y));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary),new THREE.LineDashedMaterial({color:'#8da17a',dashSize:10,gapSize:8})));group.children.at(-1).computeLineDistances();
  return {group,habitats};
}
