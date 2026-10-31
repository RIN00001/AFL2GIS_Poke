import * as THREE from '../../public/vendor/three.module.js';

// Every analytical footprint comes from the manual notebook export. Small
// architectural details and landscaping are original illustrative decoration.
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.86});}
function box(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function flatPolygon(geometry,color,opacity=1){const shape=new THREE.Shape();geometry.coordinates[0].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1}));}
function sign(parent,label,x,y,z,w,h,color='#355d4c'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff7db';ctx.font='bold 46px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,68,480);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));mesh.position.set(x,y,z);parent.add(mesh);
}
function road(group,coords,width,color,height){
  const mat=new THREE.MeshBasicMaterial({color});
  for(let i=1;i<coords.length;i++){
    const [ax,ay]=coords[i-1],[bx,by]=coords[i],len=Math.hypot(bx-ax,by-ay);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,len),mat);
    mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-Math.atan2(bx-ax,by-ay);
    mesh.position.set((ax+bx)/2,height,-(ay+by)/2);group.add(mesh);
  }
  // Round joins seal corners; casing and surface occupy separate heights.
  for(const [x,y] of coords){const cap=new THREE.Mesh(new THREE.CircleGeometry(width/2,16),mat);cap.rotation.x=-Math.PI/2;cap.position.set(x,height,-y);group.add(cap);}
}
export function mapLayers(layers,landmarks){
  const group=new THREE.Group(),pins=[];
  for(const f of layers.areas.features.filter(f=>f.properties.role==='use_area')){const patch=flatPolygon(f.geometry,'#d9e3d1');patch.position.y=.04;group.add(patch);}
  for(const p of layers.paths.features)road(group,p.geometry.coordinates,p.properties.width_m+1.1,'#a9c5a5',.16);
  for(const p of layers.paths.features)road(group,p.geometry.coordinates,p.properties.width_m,'#fbfdf1',.22);
  for(const f of layers.areas.features.filter(f=>f.properties.role==='building_footprint')){
    const building=f.properties.role==='building_footprint';
    const patch=flatPolygon(f.geometry,building?'#f3e8cd':'#d9e3d1');patch.position.y=.3;group.add(patch);
    if(building){
      const shape=new THREE.Shape();f.geometry.coordinates[0].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
      const height=f.properties.id===1?8:f.properties.id===2?14:f.properties.id===3?18:6;
      const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);
      const roof={1:'#dfbb79',2:'#87b2b8',3:'#a6b3c6',14:'#ccab94'}[f.properties.id]||'#b8cabb';
      const model=new THREE.Mesh(geo,[material(roof),material('#f3eddb')]);model.castShadow=true;model.receiveShadow=true;group.add(model);
      const pts=f.geometry.coordinates[0];
      for(let i=1;i<pts.length;i++){
        const [a,b]=[pts[i-1],pts[i]],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        for(let d=3;d<len-2;d+=5)for(let h=3;h<height-1;h+=4){
          const t=d/len,x=a[0]+(b[0]-a[0])*t,n=a[1]+(b[1]-a[1])*t;
          const pane=box(group,x,h,-n,2.5,1.9,.15,'#85aeb1');pane.rotation.y=Math.atan2(b[1]-a[1],b[0]-a[0]);
        }
      }
    }
  }
  for(const landmark of landmarks){
    const [x,n]=landmark.position;
    const material=new THREE.MeshBasicMaterial({color:'#4aaad9',transparent:true,opacity:.75,depthTest:false,depthWrite:false});
    const marker=new THREE.Group();
    const baseY=landmark.style==='new'?16:landmark.style==='main'?10:landmark.style==='market'?8:1;
    marker.position.set(x,baseY,-n);
    const jewel=new THREE.Mesh(new THREE.OctahedronGeometry(1.7),material);jewel.position.y=3;marker.add(jewel);
    const halo=new THREE.Mesh(new THREE.RingGeometry(3.1,3.6,40),material);halo.rotation.x=-Math.PI/2;halo.position.y=.25;marker.add(halo);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,7,6),material);beam.position.y=3.5;marker.add(beam);
    marker.renderOrder=22;marker.traverse(o=>{o.renderOrder=22;});group.add(marker);
    pins.push({id:landmark.id,marker,jewel,halo,material});
    if(landmark.style==='loop'){for(const dx of [-4,4])box(group,x+dx,2,-n,.5,4,.5,'#648477');box(group,x,4.4,-n,11,.8,5,'#6c99a8');sign(group,'UC LOOP',x,3,-n+3,10,2);}
    if(landmark.style==='market')sign(group,'HOKKY',x,5,-n,13,3,'#4c714e');
  }
  const border=layers.play_area.features[0].geometry.coordinates[0].map(([x,y])=>new THREE.Vector3(x,.3,-y));
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(border),new THREE.LineDashedMaterial({color:'#8b9f7b',dashSize:4,gapSize:3}));line.computeLineDistances();group.add(line);
  return {group,pins};
}
