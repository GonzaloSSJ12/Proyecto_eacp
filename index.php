<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>LSA Live Translator</title>
  <style>video{width:320px;height:240px;}#output{font-size:2rem;margin-top:1rem;}</style>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.20.0/dist/tf.min.js"></script>
</head>
<body>
  <video id="video" autoplay playsinline></video>
  <div id="output">Cargando modelo…</div>
  <script>
    const video = document.getElementById('video');
    const output = document.getElementById('output');
    let model;
    // 1. Cargar modelo TF.js (exportado desde OpenHands)
    tf.loadLayersModel('model/model.json').then(m => {
      model = m;
      output.innerText = 'Modelo cargado. Iniciando cámara…';
      startCamera();
    });
    // 2. Iniciar cámara
    function startCamera(){
      navigator.mediaDevices.getUserMedia({video:true})
        .then(stream => {
          video.srcObject = stream;
          initHands();
        });
    }
    // 3. Configurar MediaPipe Hands
    function initHands(){
      const hands = new Hands({locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
      hands.setOptions({maxNumHands:1, minDetectionConfidence:0.7});
      hands.onResults(onResults);
      const cam = new Camera(video, {onFrame:()=>hands.send({image:video}), width:320, height:240});
      cam.start();
    }
    // 4. Al recibir landmarks, predecir y mostrar palabra
    function onResults(results){
      if(!results.multiHandLandmarks) return;
      // Extraer vector [x1,y1,z1,...,x21,y21,z21]
      const lm = results.multiHandLandmarks[0].flatMap(p=>[p.x,p.y,p.z]);
      tf.tidy(()=>{
        const input = tf.tensor([lm]);
        const pred = model.predict(input);
        const idx = pred.argMax(-1).dataSync()[0];
        const labels = ['hola','adiós','gracias','porfa']; // según tu modelo
        output.innerText = labels[idx] || 'No reconocido';
      });
    }
  </script>
</body>
</html>
