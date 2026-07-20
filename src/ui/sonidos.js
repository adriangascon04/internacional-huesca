// ============================================================================
//  src/ui/sonidos.js  ·  Sonidos y vibración de confirmación/rechazo.
// ============================================================================
let ctx = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export function playSonido(tipo) {
  try {
    const c = getCtx();
    const notas =
      tipo === 'ok'
        ? [
            [880, 0, 0.11],
            [1318.5, 0.1, 0.16],
          ]
        : [
            [220, 0, 0.16],
            [180, 0.18, 0.22],
          ];
    const onda = tipo === 'ok' ? 'sine' : 'square';
    const vol = tipo === 'ok' ? 0.35 : 0.25;
    notas.forEach(([freq, delay, dur]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = onda;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      const t0 = c.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    });
  } catch {
    /* navegador bloquea audio sin interacción: se ignora */
  }
}

/**
 * Vibración corta para reforzar el resultado del escaneo (útil con ruido de
 * ambiente en la puerta). iOS Safari no soporta navigator.vibrate: se ignora
 * en silencio, igual que el audio cuando el navegador lo bloquea.
 */
export function vibrar(tipo) {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate(tipo === 'ok' ? 80 : [60, 60, 60]);
  } catch {
    /* sin soporte de vibración: se ignora */
  }
}
