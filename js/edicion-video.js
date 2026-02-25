
  const videos = [
    "videos/mexico.mp4",
    "videos/colombia.mp4",
    "videos/corea.mp4",
    "videos/uruguay.mp4",
    "videos/tunez.mp4",
    "videos/uzbekistan.mp4",
    "videos/japon.mp4",
    "videos/espana.mp4",
    "videos/sudafrica.mp4"
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
document.getElementById("help-btn").addEventListener("click", function() {
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