
const videos = [
  "assets/videos/mexico.mp4",
  "assets/videos/colombia.mp4",
  "assets/videos/corea.mp4",
  "assets/videos/uruguay.mp4",
  "assets/videos/tunez.mp4",
  "assets/videos/uzbekistan.mp4",
  "assets/videos/japon.mp4",
  "assets/videos/espana.mp4",
  "assets/videos/sudafrica.mp4"
];

let currentIndex = 0;
const videoElement = document.getElementById("mainVideo");

document.getElementById("nextVideo").addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % videos.length;
  cambiarVideo();
});

document.getElementById("prevVideo").addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + videos.length) % videos.length;
  cambiarVideo();
});

function cambiarVideo() {
  videoElement.src = videos[currentIndex];
  videoElement.load();
  videoElement.play();
}


const video = document.getElementById("mainVideo");
const filterSelect = document.getElementById("filterSelect");

filterSelect.addEventListener("change", () => {
  video.style.filter = filterSelect.value;
});

//boton de ayuda
document.getElementById("help-btn").addEventListener("click", function () {
  Swal.fire({
    title: "¿Cómo usar MexScan?",
    html: `
            <p>1. Elige un video.</p>
            <p>2. Selecciona el filtro que mas te guste.</p>
            <p>3. Descarga el video editado.</p>
        `,
    icon: "info",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#7e3bed"
  });
});

const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

downloadBtn.addEventListener("click", () => {

  video.pause();
  video.currentTime = 0; // iniciar desde el principio

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.filter = filterSelect.value;

  const stream = canvas.captureStream();
  const recorder = new MediaRecorder(stream);

  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = () => {

    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "video-editado.webm";
    a.click();

    URL.revokeObjectURL(url);
  };

  recorder.start();
  Swal.fire({
    title: "Procesando video...",
    text: "El video se está exportando con el filtro",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });
  video.play();

  function drawFrame() {

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!video.ended) {
      requestAnimationFrame(drawFrame);
    } else {
      recorder.stop();
      Swal.close();
    }

  }

  drawFrame();

});