// ═══════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — cambia estos dos valores para personalizar
// ═══════════════════════════════════════════════════════════════════════
//  PARTICLE_FLAG:
//    1 → CSS sobre toda la pantalla
//    2 → CSS recortadas al frame de la cámara
//    3 → Partículas 3D con Three.js (sin imports extra, usa AFRAME.THREE)
//
//  PARTICLE_TYPE:
//    "auto"      → usa el tipo definido en el JSON de cada país
//    "confeti"   → siempre confeti (rojo, verde, blanco, dorado…)
// ═══════════════════════════════════════════════════════════════════════
let PARTICLE_FLAG = 3;
let PARTICLE_TYPE = "auto";

// ───────────────────────────────────────────────────────────────────────
let seleccionActual   = null;
let datos             = {};
let playing           = false;
let confettiInterval  = null;
let confettiParticles = [];

const COLORES = {
  confeti: ["#ff0000","#00c800","#ffffff","#ffd700","#ff69b4","#00bfff"],
  auto:    []   // se resuelve en tiempo de ejecución
};

// ───────────────────────────────────────────────────────────────────────
//  REGISTRO DEL COMPONENTE TICK (Three.js)
//  Se hace dentro de window.onload para garantizar que AFRAME ya existe.
// ───────────────────────────────────────────────────────────────────────
window.addEventListener("load", () => {

  // Evitar doble registro si el script se recarga (HMR, etc.)
  if (AFRAME.components["confeti3d-tick"]) return;

  AFRAME.registerComponent("confeti3d-tick", {
    tick() {
      const ref = window.__confeti3dRef;
      if (!ref || !ref.active) return;

      const { geometry, velocities, phases, COUNT } = ref;
      const pos  = geometry.attributes.position;

      for (let i = 0; i < COUNT; i++) {
        pos.array[i*3]   += velocities[i].x;
        pos.array[i*3+1] += velocities[i].y;
        pos.array[i*3+2] += velocities[i].z;
        phases[i] += 0.04;
        pos.array[i*3] += Math.sin(phases[i]) * 0.004;
        if (pos.array[i*3+1] < -1.0) {
          pos.array[i*3]   = (Math.random()-.5)*4;
          pos.array[i*3+1] = 3.5;
          pos.array[i*3+2] = (Math.random()-.5)*4;
        }
      }
      pos.needsUpdate = true;
    }
  });
});

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
//  SELECTOR FLOTANTE  (flag + tipo de partícula)
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
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(126,59,237,.45);
      letter-spacing: .03em;
    }
    #ps-toggle:hover { background: #6a2fd4; }

    #ps-panel {
      background: rgba(18,12,32,0.96);
      border: 1px solid rgba(126,59,237,.35);
      border-radius: 14px;
      padding: 12px;
      display: none;
      flex-direction: column;
      gap: 10px;
      min-width: 190px;
      box-shadow: 0 4px 24px rgba(0,0,0,.5);
    }
    #ps-panel.open { display: flex; }

    .ps-label {
      color: rgba(255,255,255,.45);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .ps-row {
      display: flex;
      gap: 6px;
    }

    .ps-btn {
      flex: 1;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      color: #ccc;
      font-size: 12px;
      padding: 6px 4px;
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s;
      text-align: center;
    }
    .ps-btn:hover { background: rgba(126,59,237,.25); }
    .ps-btn.active {
      background: rgba(126,59,237,.5);
      border-color: #7e3bed;
      color: #fff;
      font-weight: 600;
    }
  `);

  const wrap = document.createElement("div");
  wrap.id = "ps-wrap";

  // ── Panel ──
  const panel = document.createElement("div");
  panel.id = "ps-panel";

  // Sección: Modo de render
  const lbl1 = document.createElement("div");
  lbl1.className = "ps-label";
  lbl1.textContent = "Modo de render";

  const rowFlag = document.createElement("div");
  rowFlag.className = "ps-row";

  [["1","CSS global"],["2","CSS cámara"],["3","Three.js 3D"]].forEach(([val, txt]) => {
    const b = document.createElement("button");
    b.className = "ps-btn" + (PARTICLE_FLAG === +val ? " active" : "");
    b.dataset.flag = val;
    b.innerHTML = `<strong>${val}</strong><br><span style="font-size:10px">${txt}</span>`;
    b.addEventListener("click", () => {
      PARTICLE_FLAG = +val;
      rowFlag.querySelectorAll(".ps-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (playing) { const t = getTipo(); detenerParticulas(); iniciarParticulas(t); }
    });
    rowFlag.appendChild(b);
  });

  // Sección: Tipo de partícula
  const lbl2 = document.createElement("div");
  lbl2.className = "ps-label";
  lbl2.style.marginTop = "4px";
  lbl2.textContent = "Tipo de partícula";

  const rowType = document.createElement("div");
  rowType.className = "ps-row";

  [["auto","🔀 Auto"],["confeti","🎊 Confeti"]].forEach(([val, txt]) => {
    const b = document.createElement("button");
    b.className = "ps-btn" + (PARTICLE_TYPE === val ? " active" : "");
    b.dataset.type = val;
    b.textContent = txt;
    b.addEventListener("click", () => {
      PARTICLE_TYPE = val;
      rowType.querySelectorAll(".ps-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (playing) { const t = getTipo(); detenerParticulas(); iniciarParticulas(t); }
    });
    rowType.appendChild(b);
  });

  panel.append(lbl1, rowFlag, lbl2, rowType);

  // ── Botón toggle ──
  const toggle = document.createElement("button");
  toggle.id = "ps-toggle";
  toggle.textContent = "✦ Partículas";

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  wrap.append(panel, toggle);
  document.body.appendChild(wrap);
}

function mostrarSelectorUI(visible) {
  const w = document.getElementById("ps-wrap");
  if (w) w.style.display = visible ? "flex" : "none";
}

function getTipo() {
  if (PARTICLE_TYPE === "auto")
    return datos[seleccionActual]?.particulas || "confeti";
  return PARTICLE_TYPE;
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
  const tabla = document.getElementById("tabla-resultados");
  tabla.innerHTML = "";
  s.mejoresResultados.forEach(r => {
    tabla.innerHTML += `<tr><td>${r.anio}</td><td>${r.mundial}</td><td>${r.instancia}</td></tr>`;
  });
}

// ───────────────────────────────────────────────────────────────────────
//  TRIVIA
// ───────────────────────────────────────────────────────────────────────
document.getElementById("trivia-btn").addEventListener("click", () => mostrarTrivia());

function mostrarTrivia() {
  const trivia = datos[seleccionActual].trivia;
  document.getElementById("info-view").classList.add("hidden");
  document.getElementById("trivia-view").classList.remove("hidden");
  document.getElementById("trivia-view").innerHTML = `
    <h2>Trivia: ${trivia.pregunta}</h2>
    ${trivia.opciones.map((o,i) =>
      `<button class="answer" data-index="${i}">${o}</button>`
    ).join("")}`;
  activarEventosTrivia(trivia.correcta);
}

function activarEventosTrivia(correcto) {
  document.querySelectorAll(".answer").forEach(btn => {
    btn.addEventListener("click", () => {
      if (parseInt(btn.dataset.index) === correcto) {
        btn.style.backgroundColor = "#4CAF50";
        Swal.fire({ icon:"success", title:"¡Correcto!" }).then(() => mostrarInfo(seleccionActual));
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
  const container = entity.querySelector(".modelo-container");
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
//  SISTEMA DE PARTÍCULAS
// ═══════════════════════════════════════════════════════════════════════

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

// ── Flag 1 — CSS pantalla completa ────────────────────────────────────
function iniciarFlag1(tipo) {
  inyectarCSS("css-f1", `
    @keyframes caerF1 {
      0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1 }
      80%  { opacity:1 }
      100% { transform:translateY(${window.innerHeight+40}px) translateX(var(--d)) rotate(var(--g)); opacity:0 }
    }`);
  const cols = COLORES[tipo] || COLORES.confeti;
  function crearP() {
    const p = document.createElement("div");
    const sz = Math.random()*10+6, dur = Math.random()*2000+2000, dl = Math.random()*400;
    const br = Math.random()>.5 ? "50%" : "2px";
    p.style.cssText = `position:fixed;top:-20px;left:${Math.random()*window.innerWidth}px;
      width:${sz}px;height:${sz*(br==="2px"?1.8:1)}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};border-radius:${br};
      opacity:1;z-index:9999;pointer-events:none;
      animation:caerF1 ${dur}ms ${dl}ms ease-in forwards;
      --d:${Math.random()*100-50}px;--g:${Math.random()*720-360}deg;`;
    document.body.appendChild(p);
    confettiParticles.push(p);
    setTimeout(() => { p.remove(); confettiParticles = confettiParticles.filter(x=>x!==p); }, dur+dl+100);
  }
  for (let i=0;i<60;i++) setTimeout(crearP, i*20);
  confettiInterval = setInterval(() => { for(let i=0;i<8;i++) crearP(); }, 300);
}
function detenerFlag1() {
  clearInterval(confettiInterval); confettiInterval = null;
  confettiParticles.forEach(p=>p.remove()); confettiParticles = [];
}

// ── Flag 2 — CSS recortada al canvas ─────────────────────────────────
function getCameraRect() {
  const c = document.querySelector("a-scene canvas") || document.querySelector("canvas");
  if (!c) return { x:0, y:0, w:window.innerWidth, h:window.innerHeight };
  const r = c.getBoundingClientRect();
  return { x:r.left, y:r.top, w:r.width, h:r.height };
}
function iniciarFlag2(tipo) {
  inyectarCSS("css-f2", `
    @keyframes caerF2 {
      0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1 }
      80%  { opacity:1 }
      100% { transform:translateY(var(--c)) translateX(var(--d)) rotate(var(--g)); opacity:0 }
    }`);
  let wrap = document.getElementById("cf2-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.id="cf2-wrap"; document.body.appendChild(wrap); }
  function updWrap() {
    const {x,y,w,h}=getCameraRect();
    wrap.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;z-index:9999;`;
  }
  updWrap();
  const cols = COLORES[tipo] || COLORES.confeti;
  function crearP() {
    updWrap(); const {w,h}=getCameraRect();
    const p=document.createElement("div");
    const sz=Math.random()*10+6, dur=Math.random()*2000+2000, dl=Math.random()*400;
    const br=Math.random()>.5?"50%":"2px";
    p.style.cssText=`position:absolute;top:-20px;left:${Math.random()*w}px;
      width:${sz}px;height:${sz*(br==="2px"?1.8:1)}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};border-radius:${br};
      pointer-events:none;animation:caerF2 ${dur}ms ${dl}ms ease-in forwards;
      --c:${h+40}px;--d:${Math.random()*80-40}px;--g:${Math.random()*720-360}deg;`;
    wrap.appendChild(p);
    confettiParticles.push(p);
    setTimeout(()=>{ p.remove(); confettiParticles=confettiParticles.filter(x=>x!==p); }, dur+dl+100);
  }
  for(let i=0;i<60;i++) setTimeout(crearP, i*20);
  confettiInterval = setInterval(()=>{ for(let i=0;i<8;i++) crearP(); }, 300);
}
function detenerFlag2() {
  clearInterval(confettiInterval); confettiInterval=null;
  confettiParticles.forEach(p=>p.remove()); confettiParticles=[];
  const w=document.getElementById("cf2-wrap"); if(w) w.remove();
}

// ── Flag 3 — Three.js 3D ─────────────────────────────────────────────
function iniciarFlag3(tipo) {
  const sceneEl = document.querySelector("a-scene");

  function construir() {
    // Doble-check: si ya hay un sistema activo, limpiarlo primero
    detenerFlag3();

    const THREE      = AFRAME.THREE;
    const threeScene = sceneEl.object3D;
    const cols       = COLORES[tipo] || COLORES.confeti;
    const COUNT      = 300;

    const positions  = new Float32Array(COUNT*3);
    const colorsArr  = new Float32Array(COUNT*3);
    const velocities = [];
    const phases     = [];
    const tmpC       = new THREE.Color();

    for (let i=0; i<COUNT; i++) {
      positions[i*3]   = (Math.random()-.5)*4;
      positions[i*3+1] = Math.random()*3+0.5;
      positions[i*3+2] = (Math.random()-.5)*4;
      tmpC.set(cols[Math.floor(Math.random()*cols.length)]);
      colorsArr[i*3]   = tmpC.r;
      colorsArr[i*3+1] = tmpC.g;
      colorsArr[i*3+2] = tmpC.b;
      velocities.push({ x:(Math.random()-.5)*.018, y:-(Math.random()*.012+.006), z:(Math.random()-.5)*.018 });
      phases.push(Math.random()*Math.PI*2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colorsArr, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.07, vertexColors: true,
      transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.name  = "confeti3d";
    threeScene.add(points);

    window.__confeti3dRef = { geometry:geo, velocities, phases, COUNT, active:true };

    // setAttribute activa el tick (el componente ya fue registrado en window.onload)
    sceneEl.setAttribute("confeti3d-tick", "");
  }

  if (sceneEl.hasLoaded) {
    construir();
  } else {
    sceneEl.addEventListener("loaded", construir, { once:true });
  }
}

function detenerFlag3() {
  if (window.__confeti3dRef) {
    window.__confeti3dRef.active = false;
    window.__confeti3dRef = null;
  }
  const sceneEl = document.querySelector("a-scene");
  if (sceneEl) {
    const pts = sceneEl.object3D?.getObjectByName("confeti3d");
    if (pts) { sceneEl.object3D.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
    if (sceneEl.hasAttribute("confeti3d-tick")) sceneEl.removeAttribute("confeti3d-tick");
  }
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
    iniciarParticulas(getTipo());
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