
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

    if (datos[clave]) {
        mostrarInfo(clave);
    }

    });

    entity.addEventListener("targetLost", () => {
        document.getElementById("info-card").classList.add("hidden");
    });

});

//Rellenar info card
function mostrarInfo(clave) {

    seleccionActual = clave;
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

//mostrar trivia

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