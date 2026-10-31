import * as THREE from '../../public/vendor/three.module.js';
import {character} from './models.js';

// Render the actual in-game miniatures once; no sprite service or network needed.
export function makePortraits(spawns) {
  const portraits=new Map(), scene=new THREE.Scene();
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(144,144);renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight('#ffffff','#a6b5b0',2.6));
  const light=new THREE.DirectionalLight('#fff3df',2);light.position.set(-8,20,20);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(12,13,32);camera.lookAt(0,7,0);
  for(const spawn of spawns){
    const model=character(spawn.species,spawn.color);scene.add(model);
    renderer.render(scene,camera);portraits.set(spawn.id,renderer.domElement.toDataURL('image/png'));
    scene.remove(model);model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  }
  renderer.dispose();renderer.forceContextLoss();return portraits;
}
