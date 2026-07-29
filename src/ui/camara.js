// ============================================================================
//  src/ui/camara.js  ·  Captura de vídeo y lectura continua de QR.
//
//  RENDIMIENTO — por qué está escrito así. Decodificar un QR cuesta en
//  proporción al número de píxeles del fotograma, y jsQR es JavaScript puro
//  que corre en el hilo principal. Leyendo a resolución nativa (1080p ≈ 2 Mpx)
//  cada intento tarda cientos de ms: solo salían 2-6 intentos por segundo y el
//  portero apuntaba el carnet y tardaba uno o dos segundos en oír el pitido,
//  además de trabar la vista previa. Tres decisiones lo arreglan:
//
//    1. `BarcodeDetector` nativo cuando el navegador lo trae (Chrome/Android,
//       que es lo que se usa en la puerta): decodifica fuera del hilo
//       principal y acepta el <video> directamente, sin canvas ni copia de
//       píxeles. Es el camino rápido.
//    2. Sin él (Safari/iOS, escritorio viejo) se REDUCE el fotograma a
//       `LADO_MAX` px antes de pasarlo a jsQR. A 640 px cuesta del orden de
//       10x menos y sigue leyendo de sobra un QR de carnet a distancia de
//       puerta.
//    3. El canvas solo se redimensiona cuando cambia el tamaño del vídeo:
//       asignar `canvas.width` reinicia el búfer y el estado del contexto, así
//       que hacerlo en cada fotograma tiraba por tierra `willReadFrequently`.
//
//  El bucle es continuo: mientras la cámara está abierta se lee un QR tras
//  otro sin que el operador tenga que cerrar y reabrir nada. Solo para cuando
//  se llama a `pararCamara`.
// ============================================================================

let stream = null;
let rafId = null;
let ultimoTexto = '';
let ultimoTs = 0;

/** No se vuelve a avisar del MISMO código hasta que pasa este tiempo. */
const MS_ANTIRREBOTE = 2500;

/** Lado mayor al que se reduce el fotograma para el camino jsQR. */
const LADO_MAX = 640;

export const camaraActiva = () => stream !== null;

export async function iniciarCamara(video, canvas, onLeer) {
  if (stream) return;
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      // Pedir 720p evita que el móvil entregue 1080p/4K, que no aporta nada
      // para leer un QR y multiplica el coste de cada intento.
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  video.srcObject = stream;
  await video.play();

  // `detector` es mutable: si el detector nativo existe pero falla en este
  // dispositivo, se anula y el bucle sigue con jsQR en vez de reventar.
  let detector = crearDetector();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tick = async () => {
    rafId = null;
    if (!stream) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      let texto = '';
      if (detector) {
        try {
          texto = await leerNativo(detector, video);
        } catch {
          detector = null; // Este navegador lo anuncia pero no lo soporta.
        }
      }
      if (!detector) texto = leerConJsQr(ctx, canvas, video);
      // El aviso se espera a propósito: mientras se registra el acceso no
      // tiene sentido seguir quemando CPU decodificando, y así el fichaje
      // (que va a la red) no compite con el decodificador.
      if (texto) await emitir(texto, onLeer);
    }

    // Puede haberse parado la cámara durante los `await` de arriba.
    if (stream) rafId = requestAnimationFrame(tick);
  };
  tick();
}

export function pararCamara(video) {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  ultimoTexto = '';
  ultimoTs = 0;
  if (video) video.srcObject = null;
}

/** Detector nativo de QR, o null si el navegador no lo trae. */
function crearDetector() {
  if (typeof BarcodeDetector === 'undefined') return null;
  try {
    return new BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

async function leerNativo(detector, video) {
  const codigos = await detector.detect(video);
  return codigos[0]?.rawValue || '';
}

/**
 * Camino de reserva: reduce el fotograma y lo decodifica con jsQR. Devuelve ''
 * si no hay nada que leer (o si jsQR, que llega por CDN con `defer`, todavía
 * no ha cargado: son unos ms y el siguiente fotograma ya lo tendrá).
 */
function leerConJsQr(ctx, canvas, video) {
  if (typeof jsQR !== 'function') return '';
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return '';

  const escala = Math.min(1, LADO_MAX / Math.max(vw, vh));
  const w = Math.round(vw * escala);
  const h = Math.round(vh * escala);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  return jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || '';
}

/** Avisa de un código leído, saltándose las repeticiones del mismo QR. */
async function emitir(texto, onLeer) {
  const ahora = Date.now();
  if (texto === ultimoTexto && ahora - ultimoTs < MS_ANTIRREBOTE) return;
  ultimoTexto = texto;
  ultimoTs = ahora;
  await onLeer(texto);
}
