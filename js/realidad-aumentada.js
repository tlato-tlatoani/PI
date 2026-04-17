// ═══════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN INICIAL
//  PARTICLE_CLIP : false → pantalla completa | true → recortado al frame
//  PARTICLE_TYPE : "auto" → colores del país  | "confeti" → colores fijos
// ═══════════════════════════════════════════════════════════════════════
let PARTICLE_CLIP = false;
let PARTICLE_TYPE = "auto";


// ───────────────────────────────────────────────────────────────────────
let seleccionActual   = null;
let datos             = {};
let playing           = false;
let confettiInterval  = null;
let confettiParticles = [];

// Colores fijos para modo "confeti"
const COLORES_CONFETI = ["#ff0000","#00c800","#ffffff","#ffd700","#ff69b4","#00bfff"];

// Colores por país (modo "auto") — deben coincidir con la clave del JSON
const COLORES_PAIS = {
  mexico:       ["#006847","#ffffff","#ce1126"],
  espana:       ["#c60b1e","#ffc400","#c60b1e"],
  japon:        ["#ffffff","#bc002d"],
  corea_del_sur:["#003478","#ffffff","#cd2e3a"],
  colombia:     ["#fcd116","#003087","#ce1126"],
  tunez:        ["#e70013","#ffffff"],
  uruguay:      ["#ffffff","#5aaad6","#fcd116"],
  sudafrica:    ["#007a4d","#ffb612","#de3831","#ffffff","#002395","#000000"],
  uzbekistan:   ["#1eb53a","#ffffff","#ce1126","#0099b5"],
};

function getColores() {
  if (PARTICLE_TYPE === "confeti") return COLORES_CONFETI;
  return COLORES_PAIS[seleccionActual] || COLORES_CONFETI;
}

// ───────────────────────────────────────────────────────────────────────
//  CARGA DE DATOS
// ───────────────────────────────────────────────────────────────────────
fetch("data/selecciones.json")
  .then(r => r.json())
  .then(json => { datos = json; console.log("Datos cargados"); });

// ───────────────────────────────────────────────────────────────────────
//  UI GENERAL
// ───────────────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────────────
//  SELECTOR FLOTANTE
// ───────────────────────────────────────────────────────────────────────
function inyectarCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

function crearSelectorUI() {
  if (document.getElementById("ps-wrap")) return;

  inyectarCSS("ps-styles", `
    #ps-wrap {
      position: fixed;
      bottom: 80px;
      right: 14px;
      z-index: 10000;
      display: none;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: inherit;
    }
    #ps-toggle {
      background: #7e3bed;
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 14px rgba(126,59,237,.5);
      letter-spacing: .04em;
    }
    #ps-toggle:hover { background: #6a2fd4; }

    #ps-panel {
      background: rgba(18,12,32,0.96);
      border: 1px solid rgba(126,59,237,.4);
      border-radius: 14px;
      padding: 14px;
      display: none;
      flex-direction: column;
      gap: 12px;
      min-width: 200px;
      box-shadow: 0 4px 28px rgba(0,0,0,.55);
    }
    #ps-panel.open { display: flex; }

    .ps-label {
      color: rgba(255,255,255,.4);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .ps-row {
      display: flex;
      gap: 7px;
    }

    .ps-btn {
      flex: 1;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 9px;
      color: #bbb;
      font-size: 12px;
      padding: 8px 6px;
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s;
      text-align: center;
      line-height: 1.4;
    }
    .ps-btn:hover { background: rgba(126,59,237,.2); border-color: rgba(126,59,237,.4); }
    .ps-btn.active {
      background: rgba(126,59,237,.55);
      border-color: #7e3bed;
      color: #fff;
      font-weight: 700;
    }
  `);

  const wrap   = document.createElement("div");
  wrap.id      = "ps-wrap";

  const panel  = document.createElement("div");
  panel.id     = "ps-panel";

  // ── Sección: Tipo de color ────────────────────────────────────────
  const lbl1 = document.createElement("div");
  lbl1.className = "ps-label";
  lbl1.textContent = "Color de partículas";

  const rowType = document.createElement("div");
  rowType.className = "ps-row";

  [["auto","🏳️ Color\ndel país"],["confeti","🎊 Confeti"]].forEach(([val, txt]) => {
    const b = document.createElement("button");
    b.className = "ps-btn" + (PARTICLE_TYPE === val ? " active" : "");
    b.dataset.type = val;
    // soporte salto de línea en el label
    b.innerHTML = txt.replace("\n","<br>");
    b.addEventListener("click", () => {
      PARTICLE_TYPE = val;
      rowType.querySelectorAll(".ps-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (playing) { detenerParticulas(); iniciarParticulas(); }
    });
    rowType.appendChild(b);
  });

  // ── Sección: Modo de pantalla ─────────────────────────────────────
  const lbl2 = document.createElement("div");
  lbl2.className = "ps-label";
  lbl2.textContent = "Área de efecto";

  const rowClip = document.createElement("div");
  rowClip.className = "ps-row";

  [["full","🖥️ Pantalla\ncompleta"],["clip","📷 Frame\ncámara"]].forEach(([val, txt]) => {
    const b = document.createElement("button");
    b.className = "ps-btn" + (
      (val === "clip" && PARTICLE_CLIP) || (val === "full" && !PARTICLE_CLIP) ? " active" : ""
    );
    b.innerHTML = txt.replace("\n","<br>");
    b.addEventListener("click", () => {
      PARTICLE_CLIP = (val === "clip");
      rowClip.querySelectorAll(".ps-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (playing) { detenerParticulas(); iniciarParticulas(); }
    });
    rowClip.appendChild(b);
  });

  panel.append(lbl1, rowType, lbl2, rowClip);

  // ── Toggle ────────────────────────────────────────────────────────
  const toggle  = document.createElement("button");
  toggle.id     = "ps-toggle";
  toggle.textContent = "✦ Partículas";

  toggle.addEventListener("click", e => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });
  document.addEventListener("click", e => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  wrap.append(panel, toggle);
  document.body.appendChild(wrap);
}

function mostrarSelectorUI(visible) {
  const w = document.getElementById("ps-wrap");
  if (w) w.style.display = visible ? "flex" : "none";
}

// ───────────────────────────────────────────────────────────────────────
//  TARGETS AR
// ───────────────────────────────────────────────────────────────────────
document.querySelectorAll("[mindar-image-target]").forEach((entity) => {

  entity.addEventListener("targetFound", () => {
    const clave = entity.dataset.clave;
    seleccionActual = clave;
    if (datos[clave]) {
      mostrarInfo(clave);
      crearExperiencia(entity, clave);
      document.getElementById("play-btn").classList.remove("hidden");
      crearSelectorUI();
      mostrarSelectorUI(true);
    }
  });

  entity.addEventListener("targetLost", () => {
    const container = entity.querySelector(".modelo-container");
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
    detenerParticulas();
    document.getElementById("info-card").classList.add("hidden");
    document.getElementById("play-btn").classList.add("hidden");
    document.getElementById("play-btn").innerText = "▶";
    mostrarSelectorUI(false);
    playing = false;
  });
});

// ───────────────────────────────────────────────────────────────────────
//  INFO CARD
// ───────────────────────────────────────────────────────────────────────
function mostrarInfo(clave) {
  const s = datos[clave];
  document.getElementById("info-card").classList.remove("hidden");
  document.getElementById("info-view").classList.remove("hidden");
  document.getElementById("trivia-view").classList.add("hidden");
  document.getElementById("card-nombre").innerText = s.nombre;
  document.getElementById("card-descripcion").innerText = s.descripcion;
}

// ───────────────────────────────────────────────────────────────────────
//  TRIVIA
// ───────────────────────────────────────────────────────────────────────
document.getElementById("trivia-btn").addEventListener("click", () => mostrarTrivia());
let ultimaPregunta = -1;

function mostrarTrivia() {
  const triviaArray = datos[seleccionActual].trivia;
  let randomIndex;

  do {
    randomIndex = Math.floor(Math.random() * triviaArray.length);
  } while (randomIndex === ultimaPregunta);

  ultimaPregunta = randomIndex;

  const trivia = triviaArray[randomIndex];

  document.getElementById("info-view").classList.add("hidden");
  document.getElementById("trivia-view").classList.remove("hidden");

  document.getElementById("trivia-view").innerHTML = `
    <h2>Trivia: ${trivia.pregunta}</h2>
    ${trivia.opciones.map((o, i) =>
      `<button class="answer" data-index="${i}">${o}</button>`
    ).join("")}
  `;

  activarEventosTrivia(trivia.correcta);
}

function activarEventosTrivia(correcto) {
  document.querySelectorAll(".answer").forEach(btn => {
    btn.addEventListener("click", () => {
      if (parseInt(btn.dataset.index) === correcto) {
        btn.style.backgroundColor = "#4CAF50";
        Swal.fire({ icon:"success", title:"¡Correcto!" })
          .then(() => mostrarInfo(seleccionActual));
      } else {
        btn.style.backgroundColor = "#f44336";
      }
    });
  });
}

// ───────────────────────────────────────────────────────────────────────
//  MODELO AR
// ───────────────────────────────────────────────────────────────────────
function crearExperiencia(entity, clave) {
  const container   = entity.querySelector(".modelo-container");
  container.innerHTML = "";

  const modelo      = document.createElement("a-gltf-model");
  const escalaFinal = datos[clave].scale || "0.3 0.3 0.3";

  modelo.setAttribute("src", datos[clave].modelo);
  modelo.setAttribute("scale", "0 0 0");
  modelo.setAttribute("position", "0 0.01 0");
  modelo.setAttribute("shadow", "cast:false; receive:false");
  modelo.id = "modelo-activo";

  modelo.setAttribute("animation__appear",
    `property:scale;from:0 0 0;to:${escalaFinal};dur:1000;easing:easeOutBack`);
  modelo.setAttribute("animation__levitate",
    "property:position;from:0 0 0;to:0 0.2 0;loop:true;dir:alternate;dur:2000;easing:easeInOutSine;startEvents:startAnim;pauseEvents:stopAnim");

  const rotador = document.createElement("a-entity");
  rotador.setAttribute("animation__rotate",
    "property:rotation;to:0 360 0;loop:true;dur:10000;easing:linear;startEvents:startAnim;pauseEvents:stopAnim");

  rotador.appendChild(modelo);
  container.appendChild(rotador);

  if (datos[clave].animacion)
    modelo.setAttribute("animation-mixer",
      `clip:${datos[clave].animacion};loop:repeat;timeScale:0`);
}

// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE PARTÍCULAS CSS
// ═══════════════════════════════════════════════════════════════════════

function iniciarParticulas() {
  detenerParticulas();
  if (PARTICLE_CLIP) iniciarClip();
  else               iniciarFull();
}

function detenerParticulas() {
  if (confettiInterval) { clearInterval(confettiInterval); confettiInterval = null; }
  confettiParticles.forEach(p => p.remove());
  confettiParticles = [];
  const w = document.getElementById("cf-clip-wrap");
  if (w) w.remove();
}

// ── Helpers ──────────────────────────────────────────────────────────
function getCameraRect() {
  const c = document.querySelector("a-scene canvas") || document.querySelector("canvas");
  if (!c) return { x:0, y:0, w:window.innerWidth, h:window.innerHeight, r:0 };
  const rect = c.getBoundingClientRect();
  // Intentamos leer el border-radius del canvas para replicarlo
  const br = parseFloat(getComputedStyle(c).borderRadius) || 0;
  return { x:rect.left, y:rect.top, w:rect.width, h:rect.height, r:br };
}

function crearParticula(parent, isAbsolute, maxW, maxH, cols, caida) {
  const p   = document.createElement("div");
  const sz  = Math.random()*10+6;
  const dur = Math.random()*2000+2000;
  const dl  = Math.random()*400;
  const br  = Math.random()>.5 ? "50%" : "2px";
  const col = cols[Math.floor(Math.random()*cols.length)];
  const x   = Math.random()*maxW;

  p.style.cssText = `
    position:${isAbsolute?"absolute":"fixed"};
    top:-20px;
    left:${x}px;
    width:${sz}px;
    height:${sz*(br==="2px"?1.8:1)}px;
    background:${col};
    border-radius:${br};
    opacity:1;
    z-index:9999;
    pointer-events:none;
    animation:ps-caer ${dur}ms ${dl}ms ease-in forwards;
    --caida:${caida}px;
    --d:${Math.random()*100-50}px;
    --g:${Math.random()*720-360}deg;
  `;
  parent.appendChild(p);
  confettiParticles.push(p);
  setTimeout(() => {
    p.remove();
    confettiParticles = confettiParticles.filter(x => x!==p);
  }, dur+dl+100);
}

// Keyframes compartidos (se inyectan una sola vez)
inyectarCSS("ps-keyframes", `
  @keyframes ps-caer {
    0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1 }
    80%  { opacity:1 }
    100% { transform:translateY(var(--caida)) translateX(var(--d)) rotate(var(--g)); opacity:0 }
  }
`);

// ── Pantalla completa ─────────────────────────────────────────────────
function iniciarFull() {
  const cols  = getColores();
  const caida = window.innerHeight + 40;
  function tick() {
    for (let i=0;i<8;i++)
      crearParticula(document.body, false, window.innerWidth, window.innerHeight, cols, caida);
  }
  for (let i=0;i<60;i++) setTimeout(()=>crearParticula(document.body,false,window.innerWidth,window.innerHeight,cols,caida), i*20);
  confettiInterval = setInterval(tick, 300);
}

// ── Recortado al frame de la cámara ──────────────────────────────────
function iniciarClip() {
  const cols = getColores();

  let wrap = document.getElementById("cf-clip-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.id = "cf-clip-wrap"; document.body.appendChild(wrap); }

  function syncWrap() {
    const {x,y,w,h,r} = getCameraRect();
    // Replicamos el border-radius del canvas (o usamos 16px como fallback para que se vea redondeado)
    const radius = r > 0 ? r : 16;
    wrap.style.cssText = `
      position:fixed;
      left:${x}px; top:${y}px;
      width:${w}px; height:${h}px;
      border-radius:${radius}px;
      overflow:hidden;
      pointer-events:none;
      z-index:9999;
    `;
    return {w, h};
  }

  function tick() {
    const {w,h} = syncWrap();
    for (let i=0;i<8;i++) crearParticula(wrap, true, w, h, cols, h+40);
  }

  const {w,h} = syncWrap();
  for (let i=0;i<60;i++) setTimeout(()=>{ const d=syncWrap(); crearParticula(wrap,true,d.w,d.h,cols,d.h+40); }, i*20);
  confettiInterval = setInterval(tick, 300);
}

// ═══════════════════════════════════════════════════════════════════════
//  BOTÓN PLAY
// ═══════════════════════════════════════════════════════════════════════
document.getElementById("play-btn").addEventListener("click", () => {
  const modelo = document.querySelector("#modelo-activo");
  if (!modelo) return;
  const rotador = modelo.parentElement;

  if (!playing) {
    rotador.emit("startAnim");
    modelo.emit("startAnim");
    if (modelo.components["animation-mixer"])
      modelo.setAttribute("animation-mixer", "timeScale", 1);
    iniciarParticulas();
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