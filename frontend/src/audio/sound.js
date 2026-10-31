import {personality} from '../scene/personality.js';
// Original synthesized cues only. Audio is unlocked by user interaction.
export function createSound(){
  let context,master,enabled=false,volume=.35,stepAt=0,ambientAt=0;
  try{enabled=localStorage.getItem('fielddex-sound')==='on';volume=Number(localStorage.getItem('fielddex-volume')??.35);if(!Number.isFinite(volume))volume=.35;volume=Math.max(0,Math.min(1,volume));}catch{}
  function apply(){if(master)master.gain.setTargetAtTime(enabled?volume*.24:0,context.currentTime,.025);}
  function unlock(){if(!enabled)return;try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);}if(context.state==='suspended')context.resume().catch(()=>{});apply();}catch{}}
  window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
  document.addEventListener('visibilitychange',()=>{if(context&&document.hidden)context.suspend().catch(()=>{});else unlock();});
  function note(f,delay=0,duration=.12,type='sine',gain=.3,end=f){if(!enabled||!context||context.state!=='running')return;const osc=context.createOscillator(),env=context.createGain(),at=context.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(gain,at+.012);env.gain.exponentialRampToValueAtTime(.001,at+duration);osc.connect(env);env.connect(master);osc.start(at);osc.stop(at+duration+.03);osc.onended=()=>{osc.disconnect();env.disconnect();};}
  function noise(duration=.09,gain=.1,frequency=1400){
    if(!enabled||!context||context.state!=='running')return;
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),env=context.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;env.gain.setValueAtTime(gain,context.currentTime);
    env.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);source.connect(filter);filter.connect(env);env.connect(master);
    source.start();source.onended=()=>{source.disconnect();filter.disconnect();env.disconnect();};
  }
  return {get enabled(){return enabled;},get volume(){return volume;},
    toggle(){enabled=!enabled;unlock();apply();try{localStorage.setItem('fielddex-sound',enabled?'on':'off');}catch{}return enabled;},
    setVolume(value){volume=Math.max(0,Math.min(1,value));apply();try{localStorage.setItem('fielddex-volume',String(volume));}catch{}},
    step(t){if(t-stepAt<.34)return;stepAt=t;note(115,0,.05,'triangle',.07,70);noise(.055,.07,650);},
    ambience(t){if(!enabled||!context||context.state!=='running'||t-ambientAt<12)return;ambientAt=t;note(1800,0,.12,'sine',.025,2600);note(2400,.17,.13,'sine',.018,1700);},
    species(name,capture=false){const notes=personality(name).notes;notes.forEach((f,i)=>note(f,capture?i*.1:i*.085,capture?.24:.15,name==='Pikachu'?'triangle':'sine',.13,capture?f*.75:f*1.1));if(name==='Squirtle')noise(.16,.06,2200);if(name==='Charizard')noise(.25,.09,600);},
    discover(){note(523,0,.25,'sine',.12);note(1047,.09,.36,'sine',.1);},
    scan(){note(170,0,.4,'sine',.14,620);note(920,.3,.16,'sine',.09);noise(.32,.04,1200);},
    impact(){note(180,0,.13,'triangle',.23,70);noise(.09,.13,2000);},
    nearby(){note(660,0,.12,'sine',.2);note(880,.12,.2,'sine',.18);},
    landmark(){[523,659,784,1047,1319].forEach((f,i)=>note(f,i*.075,.3,'sine',.16));noise(.16,.07,3000);},
    throw(){note(290,0,.35,'sine',.16,1200);noise(.28,.16,3500);},
    caught(){[523,659,784,1047].forEach((f,i)=>note(f,i*.11,.32,'triangle',.18));note(261,.28,.45,'sine',.1);},
    complete(){[523,659,784,1047,1319].forEach((f,i)=>note(f,i*.15,.3,'triangle',.2));},
    click(){note(490,0,.05,'sine',.08,620);}
  };
}
