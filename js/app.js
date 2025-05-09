// js/app.js

const videoElem = document.getElementById('video');
const statusElem = document.getElementById('status');
const outputElem = document.getElementById('output');

// Import Fingerpose classes
const {
  GestureDescription,
  Finger,
  FingerCurl,
  FingerDirection,
  GestureEstimator
} = fp;

// 1. Definimos gesto “palma abierta” como “hola”
const holaGesture = new GestureDescription('hola');
for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  holaGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
  holaGesture.addDirection(finger, FingerDirection.VerticalUp, 0.8);
  holaGesture.addDirection(finger, FingerDirection.DiagonalUpLeft, 0.5);
  holaGesture.addDirection(finger, FingerDirection.DiagonalUpRight, 0.5);
}

// 2. Iniciar MediaPipe Hands
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);

// 3. Iniciar cámara
const camera = new Camera(videoElem, {
  onFrame: async () => {
    statusElem.innerText = 'Estado: procesando frame...';
    await hands.send({ image: videoElem });
  },
  width: 320,
  height: 240
});
camera.start().then(() => {
  statusElem.innerText = 'Estado: cámara activa';
}).catch(err => {
  statusElem.innerText = 'Error al acceder a la cámara';
  console.error(err);
});

// 4. Clasificador Fingerpose
const GE = new GestureEstimator([holaGesture]);
const lastGestures = [];
const BUFFER_SIZE = 5;

function onResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    statusElem.innerText = 'Estado: mano no detectada';
    outputElem.innerText = 'Traducción: —';
    return;
  }
  statusElem.innerText = 'Estado: mano detectada';

  // 5. Pasar array original de landmarks
  const landmarks = results.multiHandLandmarks[0];

  // 6. Estimación con umbral ajustado
  const estimation = GE.estimate(landmarks, 6.0);
  let gestureName = '—';
  if (estimation.gestures.length > 0) {
    const best = estimation.gestures.reduce((a, b) => (a.score > b.score ? a : b));
    gestureName = best.name === 'hola' ? '¡Hola!' : best.name;
  }

  // 7. Suavizado con buffer
  lastGestures.push(gestureName);
  if (lastGestures.length > BUFFER_SIZE) lastGestures.shift();
  const counts = lastGestures.reduce((c, g) => ((c[g] = (c[g] || 0) + 1), c), {});
  const [mode] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  outputElem.innerText = `Traducción: ${mode}`;
}
