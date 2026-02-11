const video = document.getElementById('camera');
const canvas = document.getElementById('photo');
const button = document.getElementById('capture');
const card = document.getElementById('info-card');


const context = canvas.getContext('2d');

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);


const constraints = {
  video: isMobile
    ? { facingMode: { ideal: "environment" } }
    : true,
  audio: false
};


let cameraActive = false;


navigator.mediaDevices.getUserMedia(constraints)
  .then(stream => {
    video.srcObject = stream;
    cameraActive = true;
  })
  .catch(error => {
    console.error("No se pudo acceder a la cámara:", error);
  });


// --TOMAR FOTO--
button.addEventListener('click', () => {
  if (!cameraActive) {
    console.warn("La cámara no está activa");
    Swal.fire({
      icon: "error",
      title: "ERROR",
      text: "No se pudo acceder a la cámara. Por favor, verifica los permisos y vuelve a intentarlo."
    });
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0);

  video.style.display = 'none';
  canvas.hidden = false;
  card.classList.remove('hidden');

  attachTriviaEvent();
});


const closeBtn = document.getElementById('close-card');
const cardContent = document.getElementById('card-content');

closeBtn.addEventListener('click', resetCamera);

function attachTriviaEvent() {
  const triviaBtn = document.getElementById('trivia-btn');
  if (!triviaBtn) return;

  triviaBtn.addEventListener('click', () => {
    cardContent.innerHTML = `
      <h3>¿Cuántas veces ha sido México sede del Mundial?</h3>

      <button class="answer wrong">A) 1 vez</button>
      <button class="answer correct">B) 2 veces</button>
      <button class="answer wrong">C) 3 veces</button>
    `;

    attachAnswerEvents();
  });
}

function attachAnswerEvents() {
  document.querySelectorAll('.answer').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('correct')) {
        Swal.fire({
          icon: 'success',
          title: '¡Correcto!',
          text: 'Excelente, sigue escaneando escudos',
          confirmButtonText: 'Continuar'
        }).then(() => {
          resetCamera();
        });
      } else {
        btn.style.background = '#f44336';

        document.querySelector('.correct').style.background = '#4caf50';
      }
    });
  });
}


function resetCamera() {
  // mostrar cámara
  video.style.display = 'block';

  // ocultar foto
  canvas.hidden = true;

  // ocultar tarjeta
  card.classList.add('hidden');

  // restaurar contenido inicial
  cardContent.innerHTML = `
    <h2>Imagen escaneada</h2>
                <p>Información del país...</p>
                <button id="trivia-btn">Trivia</button>
  `;

  attachTriviaEvent();
}

//boton de ayuda
document.getElementById("help-btn").addEventListener("click", function() {
    Swal.fire({
        title: "¿Cómo usar MexScan?",
        html: `
            <p>1. Escanea una bandera o escudo.</p>
            <p>2. Consulta la información del país.</p>
            <p>3. Prueba la sección de trivia para aprender más.</p>
        `,
        icon: "info",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#7e3bed"
    });
});