let stream = null;
let rafId = null;
let ultimoTexto = '';
let ultimoTs = 0;

const MS_ANTIRREBOTE = 2500;

export const camaraActiva = () => stream !== null;

export async function iniciarCamara(video, canvas, onLeer) {
  if (stream) return;
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
  });
  video.srcObject = stream;
  await video.play();

  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tick = () => {
    if (!stream) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) {
        const ahora = Date.now();
        if (code.data !== ultimoTexto || ahora - ultimoTs > MS_ANTIRREBOTE) {
          ultimoTexto = code.data;
          ultimoTs = ahora;
          onLeer(code.data);
        }
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  tick();
}

export function pararCamara(video) {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  ultimoTexto = '';
  if (video) video.srcObject = null;
}