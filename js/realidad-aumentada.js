
let seleccionActual = null;

let datos = {};

fetch("data/selecciones.json")
  .then(response => response.json())
  .then(json => {
    datos = json;
    console.log("Datos cargados");
  });

//cerrar info card
const closeBtn = document.getElementById('close-card');
closeBtn.addEventListener('click', () => card.classList.add('hidden'));

//boton de ayuda
document.getElementById("help-btn").addEventListener("click", function() {
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


//Detectar targets y mostrar informacion
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
        container.innerHTML = "";

        const particulas = entity.querySelector(".particulas");

        if(particulas){
            particulas.remove();
        }

        document.getElementById("info-card").classList.add("hidden");
        document.getElementById("play-btn").classList.add("hidden");
    });

});

//Rellenar info card
function mostrarInfo(clave) {

    const seleccion = datos[clave];

    document.getElementById("info-card").classList.remove("hidden");

    // Mostrar vista info y ocultar trivia
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

// Mostrar trivia
document.getElementById("trivia-btn").addEventListener("click", () => {
    mostrarTrivia();
});

function mostrarTrivia() {

    const seleccion = datos[seleccionActual];
    const trivia = seleccion.trivia;

    document.getElementById("info-view").classList.add("hidden");
    document.getElementById("trivia-view").classList.remove("hidden");

    const triviaView = document.getElementById("trivia-view");

    triviaView.innerHTML = `
        <h2>Trivia: ${trivia.pregunta}</h2>
        ${trivia.opciones.map((opcion, index) => `
        <button class="answer" data-index="${index}">
            ${opcion}
        </button>
        `).join("")}
    `;


    activarEventosTrivia(trivia.correcta);
}

//respuesta correcta
function activarEventosTrivia(indiceCorrecto) {

  document.querySelectorAll(".answer").forEach(btn => {

    btn.addEventListener("click", () => {

      const indexSeleccionado = parseInt(btn.dataset.index);

      if (indexSeleccionado === indiceCorrecto) {

        btn.style.backgroundColor = "#4CAF50"; // verde

        Swal.fire({
          icon: "success",
          title: "¡Correcto!"
        }).then(() => {
          volverAInformacion();
        });

      } else { btn.style.backgroundColor = "#f44336"; }

    });

  });

}

function volverAInformacion() {
  mostrarInfo(seleccionActual);
}

// Cargar modelo
function crearExperiencia(entity, clave){

  const container = entity.querySelector(".modelo-container");
  container.innerHTML = "";

  const modelo = document.createElement("a-gltf-model");

  modelo.setAttribute("src", datos[clave].modelo);
  modelo.setAttribute("scale", datos[clave].scale || "0.3 0.3 0.3");
  modelo.setAttribute("position","0 0 0");
  modelo.id = "modelo-activo";
  modelo.setAttribute(
  "animation__appear",
  `property: scale; from:0 0 0; to:${datos[clave].scale}; dur:1000; easing:easeOutBack`
  );

  // ROTACION PARA TODOS
  const rotador = document.createElement("a-entity");

  rotador.setAttribute(
    "animation",
    "property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear; autoplay: false"
  );

  rotador.appendChild(modelo);
  container.appendChild(rotador);

  // ANIMACION GLB SOLO SI EXISTE
  if(datos[clave].animacion){
      modelo.setAttribute(
        "animation-mixer",
        `clip: ${datos[clave].animacion}; loop: repeat; timeScale: 1`
      );
  }

  crearParticulas(entity, datos[clave].particulas);

}

// Sistema de particulas

function crearParticulas(entity, tipo){

  const p = document.createElement("a-entity");
  p.classList.add("particulas");

  p.setAttribute("position","0 0.5 0");

  if(tipo === "confeti"){

    p.setAttribute("particle-system",
      "particleCount:250; color:#00ff00,#ffffff,#ff0000; velocityValue:0 1 0; velocitySpread:1 1 1; size:0.3; maxAge:2");

  }

  if(tipo === "polvo"){

    p.setAttribute("particle-system",
      "particleCount:120; color:#bfa27a; velocityValue:0 0.2 0; size:0.4");

    p.setAttribute("position","0 0 0");

  }

  if(tipo === "petalos"){

    p.setAttribute("particle-system",
      "particleCount:150; color:#ffb7c5,#ffc0cb; velocityValue:0 0.2 0; velocitySpread:1 0 1; size:0.4");

  }

  if(tipo === "hojas"){

    p.setAttribute("particle-system",
      "particleCount:120; color:#4CAF50,#8BC34A; velocityValue:0 0.15 0");

  }

  if(tipo === "humo"){

    p.setAttribute("particle-system",
      "particleCount:90; color:#dddddd; velocityValue:0 0.5 0; size:0.5");

  }

  if(tipo === "luciernagas"){

    p.setAttribute("particle-system",
      "particleCount:80; color:#ffff99,#fff176; size:0.2");

  }

  if(tipo === "musica"){

    p.setAttribute("particle-system",
      "particleCount:100; color:#ffcc00,#ffffff; velocityValue:0 0.3 0");

  }

  entity.appendChild(p);

}

// Boton de play-stop

const btn = document.getElementById("play-btn");
let playing = false;

btn.addEventListener("click", ()=>{

  const modelo = document.querySelector("#modelo-activo");
  const rotador = modelo.parentElement;

  console.log(modelo);
  if(!modelo) return;

  const anim = rotador.components.animation;
  const mixer = modelo.components["animation-mixer"];

  console.log(anim);
  console.log(mixer);
  if(!playing){

      if(anim) anim.play();

      if(mixer) mixer.playAction();

      btn.innerText="⏸";

  }else{

      if(anim) anim.pause();

      if(mixer) mixer.stopAction();

      btn.innerText="▶";

  }

  playing = !playing;

});