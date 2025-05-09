const videoElem = document.getElementById('video');
const outputElem = document.getElementById('output');

// 1. Definimos gesto “palma abierta” como “hola”
const { GestureDescription, Finger, FingerCurl, FingerDirection, GestureEstimator } = fp;
const holaGesture = new GestureDescription('hola');
for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  holaGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
  // dirección opcional: palma hacia la cámara
  holaGesture.addDirection(finger, FingerDirection.VerticalUp, 0.8);
}

// 2. Iniciar MediaPipe Hands
const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);

// 3. Iniciar cámara y stream
const camera = new Camera(videoElem, {
  onFrame: async () => await hands.send({ image: videoElem }),
  width: 320,
  height: 240
});
camera.start();

// 4. Clasificador Fingerpose
const GE = new GestureEstimator([holaGesture]);

function onResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    outputElem.innerText = 'Acércate y saluda con la palma abierta';
    return;
  }
  // obtenemos landmarks para clasificar
  const landmarks3D = results.multiHandLandmarks[0].map(p => [p.x, p.y, p.z]).flat();
  // estimamos el gesto
  const estimation = GE.estimate(landmarks3D, 7.5);
  if (estimation.gestures.length > 0) {
    // elegimos el gesto con mayor confianza
    const best = estimation.gestures.reduce((a, b) => a.score > b.score ? a : b);
    outputElem.innerText = best.name === 'hola' ? '¡Hola!' : best.name;
  } else {
    outputElem.innerText = '—';
  }
}
