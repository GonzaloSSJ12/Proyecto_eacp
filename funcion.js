const classifier = knnClassifier.create();
let isTraining = false;
let currentGesture = null;
let trainingStartTime = 0;
let lastDetection = '';

const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('overlay');
const ctx = canvasElement.getContext('2d');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress');
const translationsEl = document.getElementById('translations');

let camera = null;
let facingMode = 'user'; // 'user' (frontal) o 'environment' (trasera)
let resolution = { width: 640, height: 480 };

const isDetecting = true; // Detección automática siempre

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

videoElement.addEventListener('loadedmetadata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.7,
});

hands.onResults((results) => {
  resizeCanvas();
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach((landmarks, i) => {
      const handLabel = results.multiHandedness[i].label.toLowerCase();

      // Dibuja conexiones y puntos de la mano
      window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
        color: handLabel === 'left' ? '#00AAFF' : '#00FF00',
        lineWidth: 2,
      });
      window.drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });

      // Dibuja letra "L" o "R" en la muñeca
      const wrist = landmarks[0];
      const label = handLabel === 'left' ? 'L' : 'R';
      const x = wrist.x * canvasElement.width + 10;
      const y = wrist.y * canvasElement.height + 5;
      ctx.fillStyle = 'black';
      ctx.font = '20px Arial';
      ctx.fillText(label, x, y);

      // Procesar gesto (entrenar o detectar)
      processGesture(landmarks, handLabel);
    });
  }
});

function startCamera() {
  if (camera) camera.stop();

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    facingMode: facingMode,
    width: resolution.width,
    height: resolution.height,
  });

  camera.start();
}

startCamera();

async function processGesture(landmarks, handLabel) {
  const features = getNormalizedFeatures(landmarks);
  const labelWithHand = `${currentGesture || ''}_${handLabel}`;

  if (isTraining) {
    const elapsed = Date.now() - trainingStartTime;
    const progress = Math.min((elapsed / 3000) * 100, 100);
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (elapsed <= 3000) {
      classifier.addExample(tf.tensor2d(features, [1, 63]), labelWithHand);
    } else {
      isTraining = false;
      if (progressContainer) progressContainer.style.display = 'none';
      const btn = document.getElementById('trainBtn');
      if (btn) btn.disabled = false;
      if (translationsEl) translationsEl.innerHTML += `<div>✅ ${currentGesture} entrenado (izq./der.)</div>`;
      saveModel();
    }
  }

  if (isDetecting) {
    try {
      const result = await classifier.predictClass(tf.tensor2d(features, [1, 63]));
      if (result.confidences[result.label] > 0.9) {
        handleDetection(result.label);
      }
    } catch (e) {
      // Puede lanzar error si no hay ejemplos entrenados, se ignora
    }
  }
}

function getNormalizedFeatures(landmarks) {
  const wrist = landmarks[0];
  const relativeLandmarks = landmarks.map((l) => ({
    x: l.x - wrist.x,
    y: l.y - wrist.y,
    z: l.z - wrist.z,
  }));

  const maxVal = Math.max(
    ...relativeLandmarks.flatMap((l) => [Math.abs(l.x), Math.abs(l.y), Math.abs(l.z)])
  );

  return relativeLandmarks.flatMap((l) => [l.x / maxVal, l.y / maxVal, l.z / maxVal]);
}

function startTraining() {
  currentGesture = document.getElementById('gestureName').value.trim();
  if (!currentGesture) return alert('Ingrese nombre del gesto');

  const btn = document.getElementById('trainBtn');
  if (btn) btn.disabled = true;
  document.getElementById('gestureName').value = '';

  if (progressContainer) progressContainer.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';

  isTraining = true;
  trainingStartTime = Date.now();
}

function handleDetection(gesture) {
  if (gesture !== lastDetection) {
    if (translationsEl) {
      translationsEl.innerHTML += `<div>${gesture}</div>`;
      translationsEl.scrollTop = translationsEl.scrollHeight;
    }
    lastDetection = gesture;
  }
}

function clearTranslations() {
  if (translationsEl) translationsEl.innerHTML = '';
  lastDetection = '';
}

function toggleCamera() {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  startCamera();
}

async function saveModel() {
  const dataset = classifier.getClassifierDataset();
  const datasetObj = {};
  Object.keys(dataset).forEach((key) => {
    datasetObj[key] = Array.from(dataset[key].dataSync());
  });
  localStorage.setItem('gestureModel', JSON.stringify(datasetObj));
}

async function loadModel() {
  const savedModel = localStorage.getItem('gestureModel');
  if (savedModel) {
    const dataset = JSON.parse(savedModel);
    Object.keys(dataset).forEach((key) => {
      const tensor = tf.tensor2d(dataset[key], [dataset[key].length / 63, 63]);
      classifier.addDataset(tensor, key);
    });
  }
}

loadModel();
