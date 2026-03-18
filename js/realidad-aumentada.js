// ════════════════════════════════════════════════════════════════════
//  FLAG DE MODO DE PARTÍCULAS
//  1 → CSS sobre toda la pantalla
//  2 → CSS recortadas dentro del frame de la cámara
//  3 → Partículas 3D con Three.js dentro de la escena A-Frame
// ════════════════════════════════════════════════════════════════════
const PARTICLE_FLAG = 2;

// ════════════════════════════════════════════════════════════════════
//  REGISTRO ÚNICO DEL COMPONENTE TICK (Flag 3)
//  Debe estar aquí, en el top-level, para que A-Frame solo lo vea UNA vez.
//  La referencia al sistema activo se guarda en window.__confeti3dRef
// ════════════════════════════════════════════════════════════════════
AFRAME.registerComponent("confeti3d-tick", {
  tick() {
    const ref = window.__confeti3dRef;
    if (!ref || !ref.active) return;

    const { geometry, velocities, phases, COUNT } = ref;
    const pos  = geometry.attributes.position;
    const YMIN = -1.0;
    const YMAX =  3.5;

    for (let i = 0; i < COUNT; i++) {
      pos.array[i * 3]     += velocities[i].x;
      pos.array[i * 3 + 1] += velocities[i].y;
      pos.array[i * 3 + 2] += velocities[i].z;

      phases[i] += 0.04;
      pos.array[i * 3] += Math.sin(phases[i]) * 0.004;

      if (pos.array[i * 3 + 1] < YMIN) {
        pos.array[i * 3]     = (Math.random() - 0.5) * 4;
        pos.array[i * 3 + 1] = YMAX;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 4;
      }
    }
    pos.needsUpdate = true;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
let seleccionActual = null;
let datos           = {};
let playing         = false;

// Flag 1 & 2
let confettiInterval  = null;
let confettiParticles = [];

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

const TIPOS_LABEL = {
  confeti:     "🎊 Confeti",
  petalos:     "🌸 Pétalos",
  hojas:       "🍃 Hojas",
  polvo:       "✨ Polvo",
  humo:        "💨 Humo",
  luciernagas: "🌟 Luciérnagas",
  musica:      "🎵 Música",
};

// ─── Tipo de partícula seleccionado por el usuario ────────────────────────────
// null = usar el definido en el JSON del país; si el usuario elige, se override
let tipoParticula = null;

// ─── Carga de datos ───────────────────────────────────────────────────────────
fetch("data/selecciones.json")
  .then(r => r.json())
  .then(json => { datos = json; console.log("Datos cargados"); });

// ─── UI general ───────────────────────────────────────────────────────────────
document.getElementById("close-card")
  .addEventListener("click", () =>
    document.getElementById("info-card").classList.add("hidden"));

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

// ─────────────────────────────────────────────────────────────────────────────
//  SELECTOR DE TIPO DE PARTÍCULAS
//  Aparece flotando junto al botón de play cuando se detecta un target
// ─────────────────────────────────────────────────────────────────────────────
function crearSelectorParticulas() {
  if (document.getElementById("particle-selector")) return;

  // Inyectar estilos del selector
  const style = document.createElement("style");
  style.textContent = `
    #particle-selector-wrap {
      position: fixed;
      bottom: 80px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    #particle-toggle-btn {
      background: rgba(30,30,40,0.85);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      backdrop-filter: blur(6px);
      white-space: nowrap;
    }
    #particle-selector {
      background: rgba(20,20,30,0.9);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      overflow: hidden;
      backdrop-filter: blur(8px);
      display: none;
      flex-direction: column;
      min-width: 155px;
    }
    #particle-selector.open { display: flex; }
    .particle-opt {
      background: none;
      border: none;
      color: #ddd;
      padding: 9px 16px;
      text-align: left;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .particle-opt:hover    { background: rgba(255,255,255,0.1); }
    .particle-opt.selected { background: rgba(126,59,237,0.45); color: #fff; }
  `;
  document.head.appendChild(style);

  // Wrapper
  const wrap = document.createElement("div");
  wrap.id = "particle-selector-wrap";

  // Menú de opciones
  const menu = document.createElement("div");
  menu.id = "particle-selector";

  // Opción "Auto" (usa el del JSON)
  const autoOpt = document.createElement("button");
  autoOpt.className = "particle-opt selected";
  autoOpt.dataset.tipo = "";
  autoOpt.textContent = "🔀 Auto (país)";
  menu.appendChild(autoOpt);

  Object.entries(TIPOS_LABEL).forEach(([tipo, label]) => {
    const btn = document.createElement("button");
    btn.className = "particle-opt";
    btn.dataset.tipo = tipo;
    btn.textContent = label;
    menu.appendChild(btn);
  });

  // Botón de toggle
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "particle-toggle-btn";
  toggleBtn.textContent = "✨ Partículas";

  toggleBtn.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  // Selección de opción
  menu.addEventListener("click", (e) => {
    const btn = e.target.closest(".particle-opt");
    if (!btn) return;

    menu.querySelectorAll(".particle-opt").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");

    tipoParticula = btn.dataset.tipo || null;
    toggleBtn.textContent = tipoParticula
      ? `✨ ${TIPOS_LABEL[tipoParticula]}`
      : "✨ Partículas";

    menu.classList.remove("open");

    // Si ya estaba reproduciendo, reiniciar con el nuevo tipo
    if (playing) {
      const tipo = tipoParticula || datos[seleccionActual]?.particulas || "confeti";
      iniciarParticulas(tipo);
    }
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) menu.classList.remove("open");
  });

  wrap.appendChild(menu);
  wrap.appendChild(toggleBtn);
  document.body.appendChild(wrap);
}

function mostrarSelectorParticulas(visible) {
  const wrap = document.getElementById("particle-selector-wrap");
  if (wrap) wrap.style.display = visible ? "flex" : "none";
}

// ─── Targets AR ───────────────────────────────────────────────────────────────
document.querySelectorAll("[mindar-image-target]").forEach((entity) => {

  entity.addEventListener("targetFound", () => {
    const clave = entity.dataset.clave;
    seleccionActual = clave;
    if (datos[clave]) {
      mostrarInfo(clave);
      crearExperiencia(entity, clave);
      document.getElementById("play-btn").classList.remove("hidden");
      crearSelectorParticulas();
      mostrarSelectorParticulas(true);
    }
  });

  entity.addEventListener("targetLost", () => {
    const container = entity.querySelector(".modelo-container");
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
    detenerParticulas();
    document.getElementById("info-card").classList.add("hidden");
    document.getElementById("play-btn").classList.add("hidden");
    document.getElementById("play-btn").innerText = "▶";
    mostrarSelectorParticulas(false);
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
function inyectarCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

function iniciarFlag1(tipo) {
  inyectarCSS("confeti-styles-f1", `
    @keyframes caerF1 {
      0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1; }
      80%  { opacity:1; }
      100% { transform:translateY(${window.innerHeight+40}px) translateX(var(--deriva)) rotate(var(--giro)); opacity:0; }
    }
  `);
  const colores = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;
  function crearP() {
    const p   = document.createElement("div");
    const tam = Math.random()*10+6, dur = Math.random()*2000+2000, delay = Math.random()*400;
    const br  = Math.random()>.5?"50%":"2px";
    p.style.cssText = `position:fixed;top:-20px;left:${Math.random()*window.innerWidth}px;
      width:${tam}px;height:${tam*(br==="2px"?1.8:1)}px;
      background:${colores[Math.floor(Math.random()*colores.length)]};border-radius:${br};
      opacity:1;z-index:9999;pointer-events:none;
      animation:caerF1 ${dur}ms ${delay}ms ease-in forwards;
      --deriva:${Math.random()*100-50}px;--giro:${Math.random()*720-360}deg;`;
    document.body.appendChild(p);
    confettiParticles.push(p);
    setTimeout(()=>{ p.remove(); confettiParticles=confettiParticles.filter(x=>x!==p); }, dur+delay+100);
  }
  for(let i=0;i<60;i++) setTimeout(()=>crearP(), i*20);
  confettiInterval = setInterval(()=>{ for(let i=0;i<8;i++) crearP(); }, 300);
}

function detenerFlag1() {
  if(confettiInterval){ clearInterval(confettiInterval); confettiInterval=null; }
  confettiParticles.forEach(p=>p.remove());
  confettiParticles=[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG 2 — CSS recortadas al canvas de A-Frame
// ─────────────────────────────────────────────────────────────────────────────
function getCameraRect() {
  const canvas = document.querySelector("a-scene canvas") || document.querySelector("canvas");
  if(!canvas) return { x:0, y:0, w:window.innerWidth, h:window.innerHeight };
  const r = canvas.getBoundingClientRect();
  return { x:r.left, y:r.top, w:r.width, h:r.height };
}

function iniciarFlag2(tipo) {
  inyectarCSS("confeti-styles-f2", `
    @keyframes caerF2 {
      0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1; }
      80%  { opacity:1; }
      100% { transform:translateY(var(--caida)) translateX(var(--deriva)) rotate(var(--giro)); opacity:0; }
    }
  `);
  let wrapper = document.getElementById("confeti-wrapper-f2");
  if(!wrapper){ wrapper=document.createElement("div"); wrapper.id="confeti-wrapper-f2"; document.body.appendChild(wrapper); }

  function actualizarWrapper(){
    const {x,y,w,h}=getCameraRect();
    wrapper.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;z-index:9999;`;
  }
  actualizarWrapper();

  const colores = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;
  function crearP(){
    actualizarWrapper();
    const {w,h}=getCameraRect();
    const p=document.createElement("div");
    const tam=Math.random()*10+6, dur=Math.random()*2000+2000, delay=Math.random()*400;
    const br=Math.random()>.5?"50%":"2px";
    p.style.cssText=`position:absolute;top:-20px;left:${Math.random()*w}px;
      width:${tam}px;height:${tam*(br==="2px"?1.8:1)}px;
      background:${colores[Math.floor(Math.random()*colores.length)]};border-radius:${br};
      pointer-events:none;
      animation:caerF2 ${dur}ms ${delay}ms ease-in forwards;
      --caida:${h+40}px;--deriva:${Math.random()*80-40}px;--giro:${Math.random()*720-360}deg;`;
    wrapper.appendChild(p);
    confettiParticles.push(p);
    setTimeout(()=>{ p.remove(); confettiParticles=confettiParticles.filter(x=>x!==p); }, dur+delay+100);
  }
  for(let i=0;i<60;i++) setTimeout(()=>crearP(), i*20);
  confettiInterval = setInterval(()=>{ for(let i=0;i<8;i++) crearP(); }, 300);
}

function detenerFlag2() {
  if(confettiInterval){ clearInterval(confettiInterval); confettiInterval=null; }
  confettiParticles.forEach(p=>p.remove());
  confettiParticles=[];
  const w=document.getElementById("confeti-wrapper-f2");
  if(w) w.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG 3 — Partículas 3D con Three.js (renderer interno de A-Frame)
//  El componente "confeti3d-tick" está registrado UNA SOLA VEZ arriba.
//  El estado del sistema se comparte vía window.__confeti3dRef.
// ─────────────────────────────────────────────────────────────────────────────
function iniciarFlag3(tipo) {
  const sceneEl = document.querySelector("a-scene");

  function construir() {
    const THREE      = AFRAME.THREE;
    const threeScene = sceneEl.object3D;
    const colores    = COLORES_CONFETI[tipo] || COLORES_CONFETI.confeti;
    const COUNT      = 300;

    const geometry  = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colorsArr = new Float32Array(COUNT * 3);
    const velocities = [];
    const phases     = [];
    const tmpColor   = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      positions[i*3]   = (Math.random()-.5)*4;
      positions[i*3+1] = Math.random()*3+0.5;
      positions[i*3+2] = (Math.random()-.5)*4;

      tmpColor.set(colores[Math.floor(Math.random()*colores.length)]);
      colorsArr[i*3]   = tmpColor.r;
      colorsArr[i*3+1] = tmpColor.g;
      colorsArr[i*3+2] = tmpColor.b;

      velocities.push({
        x: (Math.random()-.5)*0.018,
        y: -(Math.random()*0.012+0.006),
        z: (Math.random()-.5)*0.018,
      });
      phases.push(Math.random()*Math.PI*2);
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

    // Compartir estado con el componente tick via window
    window.__confeti3dRef = { geometry, velocities, phases, COUNT, active: true };

    // Activar tick (solo setAttribute — el componente ya está registrado)
    sceneEl.setAttribute("confeti3d-tick", "");
  }

  // Esperar a que el renderer esté listo si aún no lo está
  if (sceneEl.renderer) {
    construir();
  } else {
    sceneEl.addEventListener("renderstart", construir, { once: true });
  }
}

function detenerFlag3() {
  // Desactivar el tick primero
  if (window.__confeti3dRef) {
    window.__confeti3dRef.active = false;
    window.__confeti3dRef = null;
  }

  // Quitar el Points de la escena Three.js
  const sceneEl    = document.querySelector("a-scene");
  const threeScene = sceneEl?.object3D;
  if (threeScene) {
    const points = threeScene.getObjectByName("confeti3d");
    if (points) {
      threeScene.remove(points);
      points.geometry.dispose();
      points.material.dispose();
    }
  }

  // Quitar el atributo del componente tick (sin des-registrarlo)
  if (sceneEl && sceneEl.hasAttribute("confeti3d-tick")) {
    sceneEl.removeAttribute("confeti3d-tick");
  }
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

    const tipo = tipoParticula || datos[seleccionActual]?.particulas || "confeti";
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