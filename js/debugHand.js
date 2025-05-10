// Referencias a elementos
const videoElem = document.getElementById('video');
const canvasElem = document.getElementById('canvas');
const logElem = document.getElementById('log');
const ctx = canvasElem.getContext('2d');
ctx.save();
ctx.translate(canvas.width, 0);
ctx.scale(-1, 1);
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
ctx.restore();


// Ajustamos canvas al tamaño del vídeo
videoElem.addEventListener('loadedmetadata', () => {
  canvasElem.width = videoElem.videoWidth;
  canvasElem.height = videoElem.videoHeight;
});

// Inicializamos MediaPipe Hands
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);

// Iniciamos la cámara
const camera = new Camera(videoElem, {
  width: 640,
  height: 480,
  onFrame: async () => {
    await hands.send({ image: videoElem });
  }
});
camera.start()
  .then(() => logElem.innerText = 'Estado: cámara activa')
  .catch(err => {
    logElem.innerText = 'Error al acceder a la cámara';
    console.error(err);
  });

// Callback que dibuja landmarks y conexiones
function onResults(results) {
  // Limpiar canvas
  ctx.clearRect(0, 0, canvasElem.width, canvasElem.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    logElem.innerText = 'Estado: mano NO detectada';
    return;
  }

  logElem.innerText = 'Estado: mano detectada';

  // Dibujar la primera mano
  const landmarks = results.multiHandLandmarks[0];
  // Conexiones
  drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
    color: '#00FF00', lineWidth: 2
  });
  // Puntos
  drawLandmarks(ctx, landmarks, {
    color: '#FF0000', lineWidth: 1, radius: 4
  });

  // Log en consola para confirmar
  console.log('Landmarks detectados:', landmarks);
}
