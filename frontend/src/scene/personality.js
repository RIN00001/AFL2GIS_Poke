// Presentation only: animation never changes the GIS position or catch rules.
export const personalities={
 Pikachu:{color:'#edbc30',accent:'#fff3a3',motif:'spark',label:'Electric',notes:[880,1320,1760]},
 Squirtle:{color:'#369fda',accent:'#bcefff',motif:'bubble',label:'Water',notes:[392,587,784]},
 Bulbasaur:{color:'#54a875',accent:'#d2f29d',motif:'leaf',label:'Grass',notes:[330,440,660]},
 Eevee:{color:'#ba8955',accent:'#ffe7bd',motif:'star',label:'Normal',notes:[659,784,988]},
 Charizard:{color:'#ed8050',accent:'#ffe09c',motif:'ember',label:'Fire',notes:[196,294,587]}
};
export const personality=species=>personalities[species]||personalities.Eevee;

export function animateCreature(entry,time,reduced){
 const {model,spawn}=entry,age=time-(entry.revealAt??-100),reveal=!reduced&&age>=0&&age<1.6;
 const t=time+spawn.x*.013,s=reduced?0:Math.sin(t*2);
 model.position.y=reduced?0:.5;model.rotation.set(0,0,0);model.scale.setScalar(.65);
 model.userData.animate(t,false,reduced);
 if(reduced)return;
 switch(spawn.species){
  case 'Pikachu': model.position.y+=Math.max(0,Math.sin(t*3))*.9;model.rotation.z=s*.035;break;
  case 'Squirtle': model.rotation.y=Math.sin(t*1.3)*.3;model.rotation.z=s*.045;break;
  case 'Bulbasaur': model.scale.y=.65*(1+Math.sin(t*1.6)*.035);model.rotation.x=s*.025;break;
  case 'Eevee': model.position.y+=Math.max(0,Math.sin(t*2.5))*.55;model.rotation.y=Math.sin(t*1.2)*.25;break;
  case 'Charizard': model.position.y+=1.4+Math.sin(t*2.3)*.8;model.rotation.x=Math.sin(t*2.3)*.04;break;
 }
 if(reveal){
  const u=age/1.6,envelope=Math.sin(Math.PI*u);
  switch(spawn.species){
   case 'Pikachu':model.position.y+=Math.abs(Math.sin(u*Math.PI*2))*5;model.rotation.z=Math.sin(u*18)*.12*envelope;break;
   case 'Squirtle':model.rotation.y+=u*Math.PI*2;model.position.y+=envelope*2;break;
   case 'Bulbasaur':model.scale.set(.65*(1+envelope*.2),.65*(1-envelope*.18),.65*(1+envelope*.2));model.position.y+=Math.sin(u*Math.PI)*1.2;break;
   case 'Eevee':model.position.y+=Math.abs(Math.sin(u*Math.PI*3))*3;model.rotation.z=Math.sin(u*Math.PI*3)*.14;break;
   case 'Charizard':model.position.y+=envelope*7;model.rotation.y+=Math.sin(u*Math.PI)*.6;break;
  }
 }
}

export function captureReaction(model,species,u,origin){
 const reaction=Math.sin(Math.min(1,u/.42)*Math.PI);
 model.position.copy(origin);model.rotation.set(0,0,0);
 model.userData.animate(u*7,false,false);
 switch(species){
  case 'Pikachu':model.position.y+=reaction*5;model.rotation.z=Math.sin(u*45)*.18*reaction;break;
  case 'Squirtle':model.rotation.y=u*Math.PI*5;model.rotation.x=reaction*.65;break;
  case 'Bulbasaur':model.rotation.z=Math.sin(u*22)*.12*reaction;model.position.y+=reaction*1.8;break;
  case 'Eevee':model.position.y+=Math.abs(Math.sin(u*13))*reaction*5;model.rotation.y=-reaction*.7;break;
  case 'Charizard':model.position.y+=reaction*8;model.rotation.x=-reaction*.3;model.rotation.y=reaction*.65;break;
 }
}
