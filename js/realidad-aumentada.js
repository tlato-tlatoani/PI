const card = document.getElementById('info-card');
const cardContent = document.getElementById('card-content');
const closeBtn = document.getElementById('close-card');


document.addEventListener("DOMContentLoaded", () => {
    const sceneEl = document.querySelector('a-scene');
    const targetEl = document.querySelector('a-entity[mindar-image-target]');

    // evento cuando encuentra la imagen
    targetEl.addEventListener("targetFound", event => {
        console.log("¡Objetivo detectado!");
        card.classList.remove('hidden');
    });

    // Evento cuando se pierde la imagen
    targetEl.addEventListener("targetLost", event => {
        console.log("Objetivo perdido");
    });
});


function attachTriviaEvent() {
    const triviaBtn = document.getElementById('trivia-btn');
    if (triviaBtn) {
        triviaBtn.addEventListener('click', () => {
            cardContent.innerHTML = `
                <h2>Trivia: ¿En qué año ganó México su primer oro olímpico?</h2>
                <button class="answer">2008</button>
                <button class="answer correct">2012</button>
                <button class="answer">2016</button>
            `;
            attachAnswerEvents();
        });
    }
}

function attachAnswerEvents() {
    document.querySelectorAll('.answer').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('correct')) {
                Swal.fire({ icon: 'success', title: '¡Correcto!' }).then(() => resetUI());
            } else {
                btn.style.background = '#f44336';
            }
        });
    });
}

function resetUI() {
    card.classList.add('hidden');
    cardContent.innerHTML = `
        <h2>Imagen escaneada</h2>
        <p>Información del país...</p>
        <button id="trivia-btn">Trivia</button>
    `;
    attachTriviaEvent();
}

closeBtn.addEventListener('click', () => card.classList.add('hidden'));
attachTriviaEvent();

//boton de ayuda
document.getElementById("help-btn").addEventListener("click", function() {
    Swal.fire({
        title: "¿Cómo usar MexScan?",
        html: `
            <p>1. Escanea una bandera o escudo.</p>
            <p>2. Consulta la información del país.</p>
            <p>3. Prueba la sección de trivia para aprender más.</p>
        `,
        icon: "info",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#7e3bed"
    });
});