// Small original synthesized sounds. No recordings, downloads, or network calls.
export function createSound() {
  let context, master, enabled=true, stepAt=0;
  try { enabled=localStorage.getItem('fielddex-sound')!=='off'; } catch {}
  function unlock(){
    if(!enabled)return;
    try {
      if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=.22;master.connect(context.destination);}
      if(context.state==='suspended')context.resume().catch(()=>{});
    } catch { /* Audio is optional; gameplay still works. */ }
  }
  window.addEventListener('pointerdown',unlock);
  window.addEventListener('keydown',unlock);
  document.addEventListener('visibilitychange',()=>{if(context&&document.hidden)context.suspend().catch(()=>{});});
  function note(frequency,delay=0,duration=.12,type='sine',volume=.35,end=frequency){
    if(!enabled||!context||context.state!=='running')return;
    const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+duration+.02);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  return {
    get enabled(){return enabled;},
    toggle(){enabled=!enabled;if(master)master.gain.value=enabled?.22:0;if(enabled)unlock();try{localStorage.setItem('fielddex-sound',enabled?'on':'off');}catch{}return enabled;},
    step(time){if(time-stepAt<.3)return;stepAt=time;note(105,0,.065,'triangle',.13,65);},
    nearby(){note(660,0,.13);note(880,.12,.22);},
    throw(){note(320,0,.24,'sine',.3,1100);},
    caught(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,i*.105,.24,'triangle',.3));},
    complete(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>note(f,i*.15,.3,'triangle',.3));},
    click(){note(480,0,.065,'sine',.12,600);},
  };
}
