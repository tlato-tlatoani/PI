// ════════════════════════════════════════════════════════════════════
//  FLAG DE MODO DE PARTÍCULAS
//  1 → CSS sobre toda la pantalla (comportamiento original)
//  2 → CSS recortadas dentro del frame de la cámara
//  3 → Partículas 3D con Three.js dentro de la escena A-Frame
// ════════════════════════════════════════════════════════════════════
const PARTICLE_FLAG = 3;


// ─────────────────────────────────────────────────────────────────────────────
let seleccionActual = null;
let datos = {};
let playing = false;

// Flag 1 & 2
let confettiInterval = null;
let confettiParticles = [];

// Flag 3
let threeConfetti = null;

// ─── Colores por tipo ─────────────────────────────────────────────────────────
const COLORES_CONFETI = {
  confeti:     ["#ff0000", "#00c800", "#ffffff", "#ffd700", "#ff69b4", "#00bfff"],
  polvo:       ["#bfa27a", "#d4b896", "#c9a87c"],
  petalos:     ["#ffb7c5", "#ffc0cb", "#ff91a4", "#ffd1dc"],
  hojas:       ["#4CAF50", "#8BC34A", "#66BB6A", "#33691E"],
  humo:        ["#cccccc", "#dddddd", "#bbbbbb"],
  luciernagas: ["#ffff99", "#fff176", "#ffffcc"],
  musica:      ["#ffcc00", "#ffffff", "#ff9900", "#ffee44"],
};

// ─── Carga de datos ───────────────────────────────────────────────────────────
fetch("data/selecciones.json")
  .then(r => r.json())
  .then(json => { datos = json; console.log("Datos cargados"); });

// ─── UI general ───────────────────────────────────────────────────────────────
document.getElementById('close-card')
  .addEventListener('click', () =>
    document.getElementById("info-card").classList.add('hidden'));

document.getElementById("help-btn").addEventListener("click", () => {
  Swal.fire({
    title: "¿Cómo usar MexScan?",
    html: `<p>1. Escanea un escudo.</p>
           <p>2. Consulta la información del país.</p>
           <p>3. Prueba la sección de trivia para aprender más.</p>`,
    icon: "info",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#7e3bed"
  });
});

// ─── Targets AR ───────────────────────────────────────────────────────────────
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
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
    detenerParticulas();
    document.getElementById("info-card").classList.add("hidden");
    document.getElementById("play-btn").classList.add("hidden");
    document.getElementById("play-btn").innerText = "▶";
    playing = false;
  });
});

// ─── Info card ────────────────────────────────────────────────────────────────
function mostrarInfo(clave) {
  const s = datos[clave];
  document.getElementById("info-card").classList.remove("hidden");
  document.getElementById("info-view").classList.remove("hidden");
  document.getElementById("trivia-view").classList.add("hidden");
  document.getElementById("card-nombre").innerText = s.nombre;
  document.getElementById("card-descripcion").innerText = s.descripcion;
  const tabla = document.getElementById("tabla-resultados");
  tabla.innerHTML = "";
  s.mejoresResultados.forEach(r => {
    tabla.innerHTML += `<tr><td>${r.anio}</td><td>${r.mundial}</td><td>${r.instancia}</td></tr>`;
  });
}

// ─── Trivia ───────────────────────────────────────────────────────────────────
document.getElementById("trivia-btn").addEventListener("click", () => mostrarTrivia());

function mostrarTrivia() {
  const trivia = datos[seleccionActual].trivia;
  document.getElementById("info-view").classList.add("hidden");
  document.getElementById("trivia-view").classList.remove("hidden");
  document.getElementById("trivia-view").innerHTML = `
    <h2>Trivia: ${trivia.pregunta}</h2>
    ${trivia.opciones.map((o, i) =>
      `<button class="answer" data-index="${i}">${o}</button>`
    ).join("")}`;
  activarEventosTrivia(trivia.correcta);
}

function activarEventosTrivia(indiceCorrecto) {
  document.querySelectorAll(".answer").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index);
      if (idx === indiceCorrecto) {
        btn.style.backgroundColor = "#4CAF50";
        Swal.fire({ icon: "success", title: "¡Correcto!" }).then(volverAInformacion);
      } else {
        btn.style.backgroundColor = "#f44336";
      }
    });
  });
}

function volverAInformacion() { mostrarInfo(seleccionActual); }

// ─── Modelo AR ────────────────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
//  DESPACHADOR DE PARTÍCULAS
// ═════════════════════════════════════════════════════════════════════════════

function iniciarParticulas(tipo) {
  detenerParticulas();
  if      (PARTICLE_FLAG === 1) iniciarFlag1(tipo);
  else if (PARTICLE_FLAG === 2) iniciarFlag2(tipo);
  else if (PARTICLE_FLAG === 3) iniciarFlag3(tipo);
}

function detenerParticulas() {
  if      (PARTICLE_FLAG === 1) detenerFlag1();
  else if (PARTICLE_FLAG === 2) detenerFlag2();
  else if (PARTICLE_FLAG === 3) detenerFlag3();
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG 1 — CSS en toda la pantalla
// ─────────────────────────────────────────────────────────────────────────────
function inyectarEstilosCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

function iniciarFlag1(tipo) {
  inyectarEstilosCSS("confeti-styles-f1", `
    @keyframes caerF1 {
      0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity:1; }
      80%  { opacity:1; }
      100% { transform: translateY(${window.innerHeight + 40}px) translateX(var(--deriva)) rotate(var(--giro)); opacity:0; }
    }
  `);

  const colores = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;

  function crearP() {
    const p = document.createElement("div");
    const color = colores[Math.floor(Math.random() * colores.length)];
    const tam = Math.random() * 10 + 6;
    const dur = Math.random() * 2000 + 2000;
    const delay = Math.random() * 400;
    const br = Math.random() > .5 ? "50%" : "2px";

    p.style.cssText = `
      position:fixed; top:-20px;
      left:${Math.random() * window.innerWidth}px;
      width:${tam}px; height:${tam * (br === "2px" ? 1.8 : 1)}px;
      background:${color}; border-radius:${br};
      opacity:1; z-index:9999; pointer-events:none;
      animation: caerF1 ${dur}ms ${delay}ms ease-in forwards;
      --deriva:${Math.random() * 100 - 50}px;
      --giro:${Math.random() * 720 - 360}deg;
    `;
    document.body.appendChild(p);
    confettiParticles.push(p);
    setTimeout(() => {
      p.remove();
      confettiParticles = confettiParticles.filter(x => x !== p);
    }, dur + delay + 100);
  }

  for (let i = 0; i < 60; i++) setTimeout(() => crearP(), i * 20);
  confettiInterval = setInterval(() => { for (let i = 0; i < 8; i++) crearP(); }, 300);
}

function detenerFlag1() {
  if (confettiInterval) { clearInterval(confettiInterval); confettiInterval = null; }
  confettiParticles.forEach(p => p.remove());
  confettiParticles = [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG 2 — CSS recortadas al área del canvas de A-Frame
// ─────────────────────────────────────────────────────────────────────────────
function getCameraRect() {
  const canvas = document.querySelector("a-scene canvas") || document.querySelector("canvas");
  if (!canvas) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  const r = canvas.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function iniciarFlag2(tipo) {
  inyectarEstilosCSS("confeti-styles-f2", `
    @keyframes caerF2 {
      0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity:1; }
      80%  { opacity:1; }
      100% { transform: translateY(var(--caida)) translateX(var(--deriva)) rotate(var(--giro)); opacity:0; }
    }
  `);

  // Contenedor recortado al canvas
  let wrapper = document.getElementById("confeti-wrapper-f2");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "confeti-wrapper-f2";
    document.body.appendChild(wrapper);
  }

  function actualizarWrapper() {
    const { x, y, w, h } = getCameraRect();
    wrapper.style.cssText = `
      position:fixed; left:${x}px; top:${y}px;
      width:${w}px; height:${h}px;
      overflow:hidden; pointer-events:none; z-index:9999;
    `;
  }
  actualizarWrapper();

  const colores = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;

  function crearP() {
    actualizarWrapper();
    const { w, h } = getCameraRect();
    const p = document.createElement("div");
    const color = colores[Math.floor(Math.random() * colores.length)];
    const tam = Math.random() * 10 + 6;
    const dur = Math.random() * 2000 + 2000;
    const delay = Math.random() * 400;
    const br = Math.random() > .5 ? "50%" : "2px";

    p.style.cssText = `
      position:absolute; top:-20px;
      left:${Math.random() * w}px;
      width:${tam}px; height:${tam * (br === "2px" ? 1.8 : 1)}px;
      background:${color}; border-radius:${br};
      pointer-events:none;
      animation: caerF2 ${dur}ms ${delay}ms ease-in forwards;
      --caida:${h + 40}px;
      --deriva:${Math.random() * 80 - 40}px;
      --giro:${Math.random() * 720 - 360}deg;
    `;
    wrapper.appendChild(p);
    confettiParticles.push(p);
    setTimeout(() => {
      p.remove();
      confettiParticles = confettiParticles.filter(x => x !== p);
    }, dur + delay + 100);
  }

  for (let i = 0; i < 60; i++) setTimeout(() => crearP(), i * 20);
  confettiInterval = setInterval(() => { for (let i = 0; i < 8; i++) crearP(); }, 300);
}

function detenerFlag2() {
  if (confettiInterval) { clearInterval(confettiInterval); confettiInterval = null; }
  confettiParticles.forEach(p => p.remove());
  confettiParticles = [];
  const w = document.getElementById("confeti-wrapper-f2");
  if (w) w.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG 3 — Partículas 3D con Three.js (renderer interno de A-Frame)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Sin cargar Three.js extra: A-Frame lo expone en AFRAME.THREE.
  Creamos un sistema Points con BufferGeometry y lo actualizamos
  cada frame mediante un componente A-Frame registrado al vuelo.
  Las partículas caen en el espacio 3D alrededor del origen (donde
  está el modelo detectado) y se reciclan al llegar abajo.
*/

function iniciarFlag3(tipo) {
  const sceneEl = document.querySelector("a-scene");

  // Si el renderer aún no está listo, esperamos el evento
  if (!sceneEl.renderer) {
    sceneEl.addEventListener("renderstart", () => iniciarFlag3(tipo), { once: true });
    return;
  }

  const THREE      = AFRAME.THREE;
  const threeScene = sceneEl.object3D;
  const colores    = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;

  const COUNT = 300;

  const geometry  = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colorsArr = new Float32Array(COUNT * 3);
  const velocities = [];
  const phases     = [];   // para oscilación tipo aleteo

  const tmpColor = new THREE.Color();

  for (let i = 0; i < COUNT; i++) {
    // Posición inicial: distribuidas en un volumen sobre el modelo
    positions[i * 3]     = (Math.random() - 0.5) * 4;   // X [-2, 2]
    positions[i * 3 + 1] = Math.random() * 3 + 0.5;      // Y [0.5, 3.5]
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;   // Z

    // Color aleatorio del array del tipo
    tmpColor.set(colores[Math.floor(Math.random() * colores.length)]);
    colorsArr[i * 3]     = tmpColor.r;
    colorsArr[i * 3 + 1] = tmpColor.g;
    colorsArr[i * 3 + 2] = tmpColor.b;

    // Velocidad de caída + deriva lateral
    velocities.push({
      x: (Math.random() - 0.5) * 0.018,
      y: -(Math.random() * 0.012 + 0.006),  // gravedad suave
      z: (Math.random() - 0.5) * 0.018,
    });

    phases.push(Math.random() * Math.PI * 2);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color",    new THREE.BufferAttribute(colorsArr, 3));

  const material = new THREE.PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name  = "confeti3d";
  threeScene.add(points);

  // Nombre único para el componente tick (evita colisión si se llama varias veces)
  const compName = "confeti3d-tick";

  // Si ya existía un componente previo, lo quitamos
  if (sceneEl.components[compName]) sceneEl.removeAttribute(compName);

  AFRAME.registerComponent(compName, {
    tick(time) {
      if (!points.parent) {
        sceneEl.removeAttribute(compName);
        return;
      }

      const pos  = geometry.attributes.position;
      const YMIN = -1.0;   // Y mínima antes de reciclar
      const YMAX =  3.5;   // Y de reaparición

      for (let i = 0; i < COUNT; i++) {
        // Actualizar posición
        pos.array[i * 3]     += velocities[i].x;
        pos.array[i * 3 + 1] += velocities[i].y;
        pos.array[i * 3 + 2] += velocities[i].z;

        // Aleteo: oscilación horizontal en X
        phases[i] += 0.04;
        pos.array[i * 3] += Math.sin(phases[i]) * 0.004;

        // Reciclar partícula cuando llega al fondo
        if (pos.array[i * 3 + 1] < YMIN) {
          pos.array[i * 3]     = (Math.random() - 0.5) * 4;
          pos.array[i * 3 + 1] = YMAX;
          pos.array[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
      }

      pos.needsUpdate = true;
    }
  });

  sceneEl.setAttribute(compName, "");

  threeConfetti = { points, threeScene, compName, sceneEl };
}

function detenerFlag3() {
  if (!threeConfetti) return;
  const { points, threeScene, compName, sceneEl } = threeConfetti;
  threeScene.remove(points);
  points.geometry.dispose();
  points.material.dispose();
  if (sceneEl.components[compName]) sceneEl.removeAttribute(compName);
  threeConfetti = null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  BOTÓN PLAY
// ═════════════════════════════════════════════════════════════════════════════
document.getElementById("play-btn").addEventListener("click", () => {
  const modelo = document.querySelector("#modelo-activo");
  if (!modelo) return;

  const rotador = modelo.parentElement;

  if (!playing) {
    rotador.emit("startAnim");
    modelo.emit("startAnim");

    if (modelo.components["animation-mixer"])
      modelo.setAttribute("animation-mixer", "timeScale", 1);

    const tipo = datos[seleccionActual]?.particulas || "confeti";
    iniciarParticulas(tipo);

    document.getElementById("play-btn").innerText = "⏸";

  } else {
    rotador.emit("stopAnim");
    modelo.emit("stopAnim");

    if (modelo.components["animation-mixer"])
      modelo.setAttribute("animation-mixer", "timeScale", 0);

    detenerParticulas();

    document.getElementById("play-btn").innerText = "▶";
  }

  playing = !playing;
});