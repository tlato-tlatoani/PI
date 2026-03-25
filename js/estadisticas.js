
let datos = {};

fetch("data/selecciones.json")
  .then(r => r.json())
  .then(json => { datos = json; console.log("Datos cargados"); });

const headers = document.querySelectorAll('.pais-header');

headers.forEach(header => {
  header.addEventListener('click', () => {
    const pais = header.parentElement;
    const contenido = pais.querySelector('.pais-contenido');
    const clave = pais.dataset.clave;

    const yaEstaActivo = pais.classList.contains('activo');

    // cerrar todos
    document.querySelectorAll('.pais').forEach(p => {
      p.classList.remove('activo');
    });

    if (yaEstaActivo) return;

    pais.classList.add('activo');

    if (contenido.dataset.cargado) return;

    const s = datos[clave];

    // construir filas resultados
    let filasResultados = "";
    s.mejoresResultados.forEach(r => {
      filasResultados += `
        <tr>
          <td>${r.anio}</td>
          <td>${r.mundial}</td>
          <td>${r.instancia}</td>
        </tr>`;
    });

    // construir filas goleadores
    let filasGoleadores = "";
    s.goleadores.forEach(g => {
      filasGoleadores += `
        <tr>
          <td>${g.nombre}</td>
          <td>${g.goles}</td>
          <td>${g.partidos}</td>
        </tr>`;
    });

    // insertar el HTML
    contenido.innerHTML = `
      <p>Mundiales en los que ha participado: 
        <span class="participaciones">${s.participaciones}</span>
      </p>

      <h2>Mejores resultados</h2>
      <table>
        <thead>
          <tr>
            <th>Año</th>
            <th>Mundial</th>
            <th>Instancia</th>
          </tr>
        </thead>
        <tbody>
          ${filasResultados}
        </tbody>
      </table>

      <h2>Mejores goleadores</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Goles</th>
            <th>Partidos</th>
          </tr>
        </thead>
        <tbody>
          ${filasGoleadores}
        </tbody>
      </table>
    `;

    contenido.dataset.cargado = "true";
  });
});


// ───────────────────────────────────────────────────────────────────────
//  BOTON DE AYUDA
// ───────────────────────────────────────────────────────────────────────

document.getElementById("help-btn").addEventListener("click", () => {
  Swal.fire({
    title: "Estadísticas",
    html: `<p>Da click en el ▼ para ver las estadísticas de las selecciones de cada país.</p>`,
    icon: "info",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#7e3bed"
  });
});
