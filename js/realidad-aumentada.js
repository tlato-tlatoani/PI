let seleccionActual = null;
let datos = {};
let playing = false;
let confettiInterval = null;
let confettiParticles = [];

fetch("data/selecciones.json")
  .then(response => response.json())
  .then(json => {
    datos = json;
    console.log("Datos cargados");
  });

// ─── Cerrar info card ────────────────────────────────────────────────────────
const closeBtn = document.getElementById('close-card');
closeBtn.addEventListener('click', () =>
  document.getElementById("info-card").classList.add('hidden')
);

// ─── Botón de ayuda ──────────────────────────────────────────────────────────
document.getElementById("help-btn").addEventListener("click", function () {
  Swal.fire({
    title: "¿Cómo usar MexScan?",
    html: `
      <p>1. Escanea un escudo.</p>
      <p>2. Consulta la información del país.</p>
      <p>3. Prueba la sección de trivia para aprender más.</p>
    `,
    icon: "info",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#7e3bed"
  });
});

// ─── Detectar targets ────────────────────────────────────────────────────────
document.querySelectorAll("[mindar-image-target]").forEach((entity) => {

  entity.addEventListener("targetFound", () => {
    const clave = entity.dataset.clave;
    seleccionActual = clave;

    if (datos[clave]) {
      mostrarInfo(clave);
      crearExperiencia(entity, clave);
      document.getElementById("play-btn").classList.remove("hidden");
    }
  });

  entity.addEventListener("targetLost", () => {
    const container = entity.querySelector(".modelo-container");
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }

    detenerConfeti();

    document.getElementById("info-card").classList.add("hidden");
    document.getElementById("play-btn").classList.add("hidden");
    document.getElementById("play-btn").innerText = "▶";
    playing = false;
  });

});

// ─── Rellenar info card ───────────────────────────────────────────────────────
function mostrarInfo(clave) {
  const seleccion = datos[clave];

  document.getElementById("info-card").classList.remove("hidden");
  document.getElementById("info-view").classList.remove("hidden");
  document.getElementById("trivia-view").classList.add("hidden");

  document.getElementById("card-nombre").innerText = seleccion.nombre;
  document.getElementById("card-descripcion").innerText = seleccion.descripcion;

  const tabla = document.getElementById("tabla-resultados");
  tabla.innerHTML = "";

  seleccion.mejoresResultados.forEach(resultado => {
    tabla.innerHTML += `
      <tr>
        <td>${resultado.anio}</td>
        <td>${resultado.mundial}</td>
        <td>${resultado.instancia}</td>
      </tr>
    `;
  });
}

// ─── Trivia ───────────────────────────────────────────────────────────────────
document.getElementById("trivia-btn").addEventListener("click", () => mostrarTrivia());

function mostrarTrivia() {
  const seleccion = datos[seleccionActual];
  const trivia = seleccion.trivia;

  document.getElementById("info-view").classList.add("hidden");
  document.getElementById("trivia-view").classList.remove("hidden");

  const triviaView = document.getElementById("trivia-view");
  triviaView.innerHTML = `
    <h2>Trivia: ${trivia.pregunta}</h2>
    ${trivia.opciones.map((opcion, index) => `
      <button class="answer" data-index="${index}">${opcion}</button>
    `).join("")}
  `;

  activarEventosTrivia(trivia.correcta);
}

function activarEventosTrivia(indiceCorrecto) {
  document.querySelectorAll(".answer").forEach(btn => {
    btn.addEventListener("click", () => {
      const indexSeleccionado = parseInt(btn.dataset.index);

      if (indexSeleccionado === indiceCorrecto) {
        btn.style.backgroundColor = "#4CAF50";
        Swal.fire({ icon: "success", title: "¡Correcto!" }).then(() => {
          volverAInformacion();
        });
      } else {
        btn.style.backgroundColor = "#f44336";
      }
    });
  });
}

function volverAInformacion() {
  mostrarInfo(seleccionActual);
}

// ─── Crear experiencia AR ─────────────────────────────────────────────────────
function crearExperiencia(entity, clave) {
  const container = entity.querySelector(".modelo-container");
  container.innerHTML = "";

  const modelo = document.createElement("a-gltf-model");
  const escalaFinal = datos[clave].scale || "0.3 0.3 0.3";

  modelo.setAttribute("src", datos[clave].modelo);
  modelo.setAttribute("scale", "0 0 0");
  modelo.setAttribute("position", "0 0.01 0");
  modelo.setAttribute("shadow", "cast:false; receive:false");
  modelo.id = "modelo-activo";

  modelo.setAttribute("animation__appear",
    `property: scale; from: 0 0 0; to: ${escalaFinal}; dur: 1000; easing: easeOutBack`);

  modelo.setAttribute("animation__levitate",
    "property: position; from: 0 0 0; to: 0 0.2 0; loop: true; dir: alternate; dur: 2000; easing: easeInOutSine; startEvents: startAnim; pauseEvents: stopAnim");

  const rotador = document.createElement("a-entity");
  rotador.setAttribute("animation__rotate",
    "property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear; startEvents: startAnim; pauseEvents: stopAnim");

  rotador.appendChild(modelo);
  container.appendChild(rotador);

  if (datos[clave].animacion) {
    modelo.setAttribute("animation-mixer",
      `clip:${datos[clave].animacion}; loop: repeat; timeScale: 0`);
  }
}

// ─── Sistema de confeti CSS ───────────────────────────────────────────────────

const COLORES_CONFETI = {
  confeti:     ["#ff0000", "#00c800", "#ffffff", "#ffd700", "#ff69b4", "#00bfff"],
  polvo:       ["#bfa27a", "#d4b896", "#c9a87c"],
  petalos:     ["#ffb7c5", "#ffc0cb", "#ff91a4", "#ffd1dc"],
  hojas:       ["#4CAF50", "#8BC34A", "#66BB6A", "#33691E"],
  humo:        ["#cccccc", "#dddddd", "#bbbbbb"],
  luciernagas: ["#ffff99", "#fff176", "#ffffcc"],
  musica:      ["#ffcc00", "#ffffff", "#ff9900", "#ffee44"],
};

function crearParticula(tipo) {
  const colores = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;
  const color = colores[Math.floor(Math.random() * colores.length)];

  const p = document.createElement("div");
  p.classList.add("confeti-particle");

  // Posición aleatoria en X dentro del viewport
  const xInicio = Math.random() * window.innerWidth;
  const tamano = Math.random() * 10 + 6; // 6–16px
  const duracion = Math.random() * 2000 + 2000; // 2–4s
  const delay = Math.random() * 400;
  const giro = Math.random() * 720 - 360;
  const deriva = Math.random() * 100 - 50; // deriva horizontal

  // Formas variadas
  const formas = ["square", "circle", "rect"];
  const forma = formas[Math.floor(Math.random() * formas.length)];

  p.style.cssText = `
    position: fixed;
    top: -20px;
    left: ${xInicio}px;
    width: ${forma === "rect" ? tamano * 0.5 : tamano}px;
    height: ${forma === "rect" ? tamano * 1.8 : tamano}px;
    background: ${color};
    border-radius: ${forma === "circle" ? "50%" : forma === "rect" ? "2px" : "2px"};
    opacity: 1;
    z-index: 9999;
    pointer-events: none;
    animation: caerConfeti ${duracion}ms ${delay}ms ease-in forwards;
    --deriva: ${deriva}px;
    --giro: ${giro}deg;
  `;

  document.body.appendChild(p);
  confettiParticles.push(p);

  // Limpiar cuando termina la animación
  setTimeout(() => {
    p.remove();
    confettiParticles = confettiParticles.filter(x => x !== p);
  }, duracion + delay + 100);
}

function inyectarEstilosConfeti() {
  if (document.getElementById("confeti-styles")) return;

  const style = document.createElement("style");
  style.id = "confeti-styles";
  style.textContent = `
    @keyframes caerConfeti {
      0% {
        transform: translateY(0) translateX(0) rotate(0deg);
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        transform: translateY(${window.innerHeight + 40}px) translateX(var(--deriva)) rotate(var(--giro));
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function iniciarConfeti(tipo) {
  inyectarEstilosConfeti();
  detenerConfeti(); // limpiar si ya había uno

  const tipoFinal = tipo || "confeti";

  // Ráfaga inicial
  for (let i = 0; i < 60; i++) {
    setTimeout(() => crearParticula(tipoFinal), i * 20);
  }

  // Seguir emitiendo partículas mientras play esté activo
  confettiInterval = setInterval(() => {
    for (let i = 0; i < 8; i++) crearParticula(tipoFinal);
  }, 300);
}

function detenerConfeti() {
  if (confettiInterval) {
    clearInterval(confettiInterval);
    confettiInterval = null;
  }
  // Eliminar partículas existentes
  confettiParticles.forEach(p => p.remove());
  confettiParticles = [];
}

// ─── Botón Play ───────────────────────────────────────────────────────────────
const btn = document.getElementById("play-btn");

btn.addEventListener("click", () => {
  const modelo = document.querySelector("#modelo-activo");
  if (!modelo) return;

  const rotador = modelo.parentElement;

  if (!playing) {
    // Iniciar animaciones del modelo
    rotador.emit("startAnim");
    modelo.emit("startAnim");

    if (modelo.components["animation-mixer"]) {
      modelo.setAttribute("animation-mixer", "timeScale", 1);
    }

    // Iniciar confeti con el tipo definido en el JSON (o confeti por defecto)
    const tipo = datos[seleccionActual]?.particulas || "confeti";
    iniciarConfeti(tipo);

    btn.innerText = "⏸";

  } else {
    // Pausar animaciones del modelo
    rotador.emit("stopAnim");
    modelo.emit("stopAnim");

    if (modelo.components["animation-mixer"]) {
      modelo.setAttribute("animation-mixer", "timeScale", 0);
    }

    // Detener confeti
    detenerConfeti();

    btn.innerText = "▶";
  }

  playing = !playing;
});