const videoElem = document.getElementById('video');
const outputElem = document.getElementById('output');

// 1. Definimos gesto “palma abierta” como “hola”
const { GestureDescription, Finger, FingerCurl, FingerDirection, GestureEstimator } = fp;
const holaGesture = new GestureDescription('hola');
for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  holaGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
  // Permitir también dirección ligeramente diagonal
  holaGesture.addDirection(finger, FingerDirection.VerticalUp, 0.8);
  holaGesture.addDirection(finger, FingerDirection.DiagonalUpLeft, 0.5);
  holaGesture.addDirection(finger, FingerDirection.DiagonalUpRight, 0.5);
}

// 2. Iniciar MediaPipe Hands
const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(onResults);

// 3. Iniciar cámara
const camera = new Camera(videoElem, {
  onFrame: async () => await hands.send({ image: videoElem }),
  width: 320, height: 240
});
camera.start();

// 4. Clasificador Fingerpose
const GE = new GestureEstimator([holaGesture]);
// Buffer circular para suavizar el texto
const lastGestures = [];
const BUFFER_SIZE = 5;

function onResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    outputElem.innerText = 'Acércate y saluda con la palma abierta';
    return;
  }
  // 5. **PASAR** el array original de landmarks, NO un array plano :contentReference[oaicite:5]{index=5}
  const landmarks = results.multiHandLandmarks[0];
  // Estimación con umbral ajustado (p.ej. 7.5 → 6) :contentReference[oaicite:6]{index=6}
  const estimation = GE.estimate(landmarks, 6.0);
  let gestureName = '—';
  if (estimation.gestures.length > 0) {
    const best = estimation.gestures.reduce((a, b) => a.score > b.score ? a : b);
    gestureName = best.name === 'hola' ? '¡Hola!' : best.name;
  }
  // 6. Suavizado: guardamos y mostramos la moda en el buffer :contentReference[oaicite:7]{index=7}
  lastGestures.push(gestureName);
  if (lastGestures.length > BUFFER_SIZE) lastGestures.shift();
  // Calculamos la moda
  const counts = lastGestures.reduce((c, g) => (c[g] = (c[g] || 0) + 1, c), {});
  const [mode] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  outputElem.innerText = mode;
}
