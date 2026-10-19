export function keyboard(onCatch) {
  const keys = new Set();
  window.addEventListener('keydown', event => {
    if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (['w','a','s','d','e','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === 'e' && !event.repeat) onCatch();
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => keys.clear());
  return () => ({dx:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')), dy:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))});
}
