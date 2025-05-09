// Referencias a elementos
const videoElem = document.getElementById('video');
const canvasElem = document.getElementById('canvas');
const ctx = canvasElem.getContext('2d');

// Configurar cámara
const camera = new Camera(videoElem, {
  onFrame: async () => { await hands.send({image: videoElem}); },
  width: 640, height: 480
});
camera.start();  // Inicia stream :contentReference[oaicite:5]{index=5}

// Instancia de MediaPipe Hands
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);  // Callback para procesar resultados :contentReference[oaicite:6]{index=6}

// Función que dibuja landmarks y conexiones
function onResults(results) {
  // Limpiar canvas
  ctx.clearRect(0, 0, canvasElem.width, canvasElem.height);

  if (!results.multiHandLandmarks) return;

  // Por cada mano detectada (solo 1 en este caso)
  for (const landmarks of results.multiHandLandmarks) {
    // Dibujar conexiones entre puntos
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
      color: '#00FF00', lineWidth: 2
    });
    // Dibujar puntos individuales
    drawLandmarks(ctx, landmarks, {
      color: '#FF0000', lineWidth: 1, radius: 4
    });
  }
}
