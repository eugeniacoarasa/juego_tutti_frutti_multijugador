/**
 * ==========================================
 * CONFIGURACIÓN Y DATOS GLOBALES DEL JUEGO
 * ==========================================
 */

// Categorías disponibles según el nivel de dificultad seleccionado
const difficultyCategories = {
    easy: [
        { id: 'paises', name: 'Países' },
        { id: 'frutas', name: 'Frutas' },
        { id: 'animales', name: 'Animales' },
        { id: 'colores', name: 'Colores' },
        { id: 'nombre', name: 'Nombre (Persona)' }
    ],
    medium: [
        { id: 'paises', name: 'Países' },
        { id: 'frutas', name: 'Frutas' },
        { id: 'animales', name: 'Animales' },
        { id: 'colores', name: 'Colores' },
        { id: 'nombre', name: 'Nombre (Persona)' },
        { id: 'ropa', name: 'Ropa' },
        { id: 'marcas', name: 'Marcas' }
    ],
    hard: [
        { id: 'paises', name: 'Países' },
        { id: 'frutas', name: 'Frutas' },
        { id: 'animales', name: 'Animales' },
        { id: 'colores', name: 'Colores' },
        { id: 'nombre', name: 'Nombre (Persona)' },
        { id: 'ropa', name: 'Ropa' },
        { id: 'marcas', name: 'Marcas' },
        { id: 'comida', name: 'Comida' },
        { id: 'profesiones', name: 'Profesiones' }
    ]
};

// Letras habilitadas en la ruleta para cada dificultad
const difficultyLetters = {
    easy: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V'],
    medium: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'Z'],
    hard: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Y', 'Z']
};

let currentDifficulty = 'easy';
let wheelLetters = difficultyLetters.easy;
const wheelColors = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8c5ff'];

let selectedLetter = 'A';
let timerInterval = null;
let timeLeft = 60;
let finalScore = 0;
let evaluatedResults = [];
let currentRotation = 0;
let soundEnabled = true;
let confettiRunning = false;

// Conexión Socket.io para el modo multijugador
const socket = io();
let isMultiplayer = false;
let isLeader = false;
let currentRoom = '';

/**
 * ==========================================
 * SISTEMA DE AUDIO Y EFECTOS VISUALES
 * ==========================================
 */

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'spin') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    } catch (e) { console.log("Audio bloqueado."); }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.querySelectorAll('.soundIcon').forEach(icon => {
        icon.className = soundEnabled ? "fa-solid fa-volume-high soundIcon" : "fa-solid fa-volume-xmark soundIcon";
    });
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        document.querySelectorAll('.fullscreenIcon').forEach(i => i.className = "fa-solid fa-compress fullscreenIcon");
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        document.querySelectorAll('.fullscreenIcon').forEach(i => i.className = "fa-solid fa-expand fullscreenIcon");
    }
}

// Gestión de Modales de Alerta y Ayuda
function openHelpModal() { document.getElementById('helpModal').style.display = 'flex'; }
function closeHelpModal() { document.getElementById('helpModal').style.display = 'none'; }

function showCustomModal(title, message, buttons) {
    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalMessage').innerHTML = message;
    const btnContainer = document.getElementById('customModalButtons');
    btnContainer.innerHTML = '';
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = `neon-btn small-btn ${b.className || ''}`;
        btn.textContent = b.text;
        btn.onclick = () => { closeCustomModal(); if (b.onClick) b.onClick(); };
        btnContainer.appendChild(btn);
    });
    document.getElementById('customModal').style.display = 'flex';
}
function closeCustomModal() { document.getElementById('customModal').style.display = 'none'; }
function showAlertModal(title, message) { showCustomModal(title, message, [{ text: '¡ENTENDIDO!' }]); }

// Efectos de Confeti
function startContinuousConfetti() {
    if (typeof confetti === 'undefined') return;
    confettiRunning = true;
    (function frame() {
        if (!confettiRunning) return;
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#ff007f', '#00ffff', '#7928ca'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#ff007f', '#00ffff', '#7928ca'] });
        requestAnimationFrame(frame);
    }());
}

function stopContinuousConfetti() { confettiRunning = false; }
function triggerModalExplosion() {
    if (typeof confetti === 'undefined') return;
    confetti({ particleCount: 500, spread: 150, origin: { x: 0.5, y: 0.5 }, colors: ['#ff007f', '#00ffff', '#7928ca', '#ffff00', '#00ffcc'], zIndex: 99999 });
}

// Control de pantallas de la interfaz
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function confirmAbandon() {
    showCustomModal("Abandonar Partida", "¿Estás seguro de que deseas abandonar la partida?", [
        { text: 'Cancelar', className: 'secondary-btn' },
        { text: 'Aceptar', onClick: () => { 
            if (timerInterval) clearInterval(timerInterval); 
            stopContinuousConfetti(); 

            // Notificar al servidor que abandonamos la sala multijugador
            if (isMultiplayer && currentRoom) {
                socket.emit('abandonar_sala', { roomCode: currentRoom });
                currentRoom = '';
                isMultiplayer = false;
            }

            switchScreen('screen-welcome'); 
        } }
    ]);
}
/**
 * ==========================================
 * NAVEGACIÓN Y SALAS MULTIJUGADOR
 * ==========================================
 */

function goToModeSelect() {
    isMultiplayer = false;
    switchScreen('screen-mode-select');
}

function startSoloMode() {
    isMultiplayer = false;
    isLeader = true;
    goToWheelScreen();
}

function goToMultiplayerLobby() {
    isMultiplayer = true;
    switchScreen('screen-multi-lobby');
}

function joinRoom() {
    const input = document.getElementById('roomCodeInput');
    const code = input.value.trim().toUpperCase();
    if (!code) {
        showAlertModal("Atención", "Ingresa un código de sala válido.");
        return;
    }
    currentRoom = code;
    socket.emit('unirse_sala', code);
}

socket.on('asignar_lider', (leaderStatus) => {
    isLeader = leaderStatus;
    updateLobbyUI();
});

socket.on('asignar_lider_nuevo', (newLeaderId) => {
    if (socket.id === newLeaderId) {
        isLeader = true;
        showAlertModal("¡Nuevo Rol!", "Ahora eres el líder de la sala.");
    }
    updateLobbyUI();
});

socket.on('actualizar_sala', (roomData) => {
    const statusDiv = document.getElementById('lobbyStatus');
    const roleText = isLeader ? '👑 Eres el Líder' : '👥 Eres Invitado';
    statusDiv.innerHTML = `Sala: <strong>${currentRoom}</strong> | ${roleText} | Jugadores: ${roomData.players.length}<br><br>
        <button class="neon-btn small-btn" onclick="goToWheelScreenFromLobby()">Ir a Ruleta de Sala</button>`;
});

/**
 * ==========================================
 * FASE DE REVISIÓN CRUZADA Y RESULTADOS
 * ==========================================
 */

let currentRoomAnswers = {};
let multiplayerResultsState = {};

// Escucha el evento del servidor cuando todos los jugadores envían sus respuestas o se pulsa Basta
socket.on('fase_revision', (data) => {
    currentRoomAnswers = data;
    closeCustomModal(); 
    
    if (isMultiplayer) {
        multiplayerResultsState = {};
        const currentCategories = difficultyCategories[currentDifficulty];
        
        // Inicializa el estado de las respuestas de cada jugador de la sala
        Object.keys(data).forEach(pId => {
            multiplayerResultsState[pId] = [];
            currentCategories.forEach(cat => {
                const word = data[pId][cat.id] || '';
                const cleanVal = word.trim().toUpperCase();
                let status = 'correct';
                let points = 10;
                let textBadge = 'Correcta (+10)';

                if (cleanVal === '' || !cleanVal.startsWith(selectedLetter)) {
                    status = 'incorrect';
                    points = 0;
                    textBadge = 'Incorrecta (0)';
                }

                multiplayerResultsState[pId].push({
                    category: cat.name,
                    word: word || '(Vacío)',
                    status: status,
                    points: points,
                    textBadge: textBadge
                });
            });
        });

        renderMultiplayerResults();

        const chatSec = document.getElementById('chatSection');
        if (chatSec) chatSec.style.display = 'block';

        playSound('success');
        startContinuousConfetti();
        switchScreen('screen-results');
    } else {
        processResultsAndShow(); // Modo solitario clásico
    }
});

// Renderiza dinámicamente las listas de palabras en formato de columnas paralelas (Lado a Lado)
function renderMultiplayerResults() {
    const myId = socket.id;
    const playerIds = Object.keys(multiplayerResultsState);
    const rivalIds = playerIds.filter(id => id !== myId);

    // Actualiza tu puntaje total en tiempo real
    if (multiplayerResultsState[myId]) {
        finalScore = multiplayerResultsState[myId].reduce((acc, curr) => acc + curr.points, 0);
    }
    document.getElementById('totalScoreText').textContent = `Puntaje Total: ${finalScore} pts`;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    // Contenedor principal en formato Flexbox de dos columnas (Lado a Lado)
    let htmlContent = `<div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; width: 100%; max-height: 380px; overflow-y: auto; padding: 5px;">`;

    // --- COLUMNA IZQUIERDA: TUS RESPUESTAS ---
    htmlContent += `<div style="flex: 1; min-width: 260px; background: rgba(255,255,255,0.35); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,0,127,0.3);">
        <h4 style="color: #ff007f; margin-bottom: 8px; text-align: center; font-size: 0.95rem;">👑 Tus Respuestas</h4>`;
    
    if (multiplayerResultsState[myId]) {
        multiplayerResultsState[myId].forEach((res, index) => {
            const clickableStyle = res.word !== '(Vacío)' ? 'cursor: pointer;' : '';
            htmlContent += `
                <div class="result-item" style="background: rgba(255,255,255,0.85); margin-bottom: 6px; padding: 6px 10px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${res.category}:</strong> ${res.word}</div>
                    <span class="badge ${res.status}" style="${clickableStyle} font-size: 0.7rem; padding: 3px 6px;" onclick="cycleWordStatus('${myId}', ${index})" title="Haz clic para cambiar">${res.textBadge} ✏️</span>
                </div>`;
        });
    }
    htmlContent += `</div>`;

    // --- COLUMNA DERECHA: RESPUESTAS DE LOS RIVALES ---
    rivalIds.forEach(rivalId => {
        htmlContent += `<div style="flex: 1; min-width: 260px; background: rgba(255,255,255,0.35); padding: 10px; border-radius: 12px; border: 1px solid rgba(0,255,255,0.3);">
            <h4 style="color: #00ffff; margin-bottom: 8px; text-align: center; text-shadow: 1px 1px 2px #000; font-size: 0.95rem;">⚔️ Rival (${rivalId.substr(0,4)})</h4>`;
        
        multiplayerResultsState[rivalId].forEach((res, index) => {
            const clickableStyle = res.word !== '(Vacío)' ? 'cursor: pointer;' : '';
            htmlContent += `
                <div class="result-item" style="background: rgba(255,255,255,0.85); margin-bottom: 6px; padding: 6px 10px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${res.category}:</strong> ${res.word}</div>
                    <span class="badge ${res.status}" style="${clickableStyle} font-size: 0.7rem; padding: 3px 6px;" onclick="cycleWordStatus('${rivalId}', ${index})" title="Haz clic para cambiar">${res.textBadge} ✏️</span>
                </div>`;
        });
        htmlContent += `</div>`;
    });

    htmlContent += `</div>`; // Cierre del contenedor de columnas
    resultsList.innerHTML = htmlContent;
}

function cycleWordStatus(playerId, index) {
    const item = multiplayerResultsState[playerId][index];
    if (item.word === '(Vacío)') return;

    if (item.status === 'correct') {
        item.status = 'rare';
        item.points = 15;
        item.textBadge = '¡Rara! (+15)';
    } else if (item.status === 'rare') {
        item.status = 'repetida';
        item.points = 5;
        item.textBadge = 'Repetida (+5)';
    } else if (item.status === 'repetida') {
        item.status = 'incorrect';
        item.points = 0;
        item.textBadge = 'Incorrecta (0)';
    } else {
        item.status = 'correct';
        item.points = 10;
        item.textBadge = 'Correcta (+10)';
    }

    renderMultiplayerResults();

    // Sincronizar en tiempo real con los demás jugadores si es multijugador
    if (isMultiplayer) {
        console.log("Enviando cambio de palabra al servidor...", { roomCode: currentRoom, targetPlayerId: playerId, index });
        socket.emit('cambiar_estado_palabra', {
            roomCode: currentRoom,
            targetPlayerId: playerId,
            index: index,
            status: item.status,
            points: item.points,
            textBadge: item.textBadge
        });
    }
}

// Receptor de sincronización en tiempo real
socket.on('sincronizar_estado_palabra', (data) => {
    console.log("¡Evento sincronizar_estado_palabra recibido!", data);
    const { targetPlayerId, index, status, points, textBadge } = data;
    if (multiplayerResultsState[targetPlayerId] && multiplayerResultsState[targetPlayerId][index]) {
        multiplayerResultsState[targetPlayerId][index].status = status;
        multiplayerResultsState[targetPlayerId][index].points = points;
        multiplayerResultsState[targetPlayerId][index].textBadge = textBadge;
        renderMultiplayerResults(); // Refresca la pantalla para todos en tiempo real
    } else {
        console.log("No se encontró el estado local para actualizar:", targetPlayerId, index);
    }
});

// ✅ AGREGA ESTO AQUÍ EN SCRIPT.JS (para que el navegador reciba la actualización)
socket.on('sincronizar_estado_palabra', (data) => {
    const { targetPlayerId, index, status, points, textBadge } = data;
    if (multiplayerResultsState[targetPlayerId] && multiplayerResultsState[targetPlayerId][index]) {
        multiplayerResultsState[targetPlayerId][index].status = status;
        multiplayerResultsState[targetPlayerId][index].points = points;
        multiplayerResultsState[targetPlayerId][index].textBadge = textBadge;
        renderMultiplayerResults(); // Refresca la pantalla para todos en tiempo real
    }
});
/**
 * ==========================================
 * CONFIGURACIÓN DE RULETA Y LOBBY
 * ==========================================
 */

function updateLobbyUI() {
    const diffContainer = document.getElementById('difficultyContainer');
    const spinBtn = document.getElementById('spinBtn');
    const wheelTitle = document.getElementById('wheelTitle');
    const wheelSubtitle = document.getElementById('wheelSubtitle');

    if (isMultiplayer) {
        if (isLeader) {
            if (diffContainer) diffContainer.style.display = 'flex';
            if (spinBtn) { spinBtn.style.display = 'block'; spinBtn.disabled = false; }
            if (wheelTitle) wheelTitle.textContent = "Gira la Ruleta (Líder)";
            if (wheelSubtitle) wheelSubtitle.textContent = "Elige la dificultad y gira para todos los jugadores.";
        } else {
            if (diffContainer) diffContainer.style.display = 'none';
            if (spinBtn) { spinBtn.style.display = 'none'; spinBtn.disabled = true; }
            if (wheelTitle) wheelTitle.textContent = "Esperando al Líder";
            if (wheelSubtitle) wheelSubtitle.textContent = "El líder está configurando la partida...";
        }
    }
}

function goToWheelScreenFromLobby() {
    switchScreen('screen-wheel');
    initWheel();
}

function setDifficulty(level) {
    currentDifficulty = level;
    wheelLetters = difficultyLetters[level];
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${level}`).classList.add('active');
    initWheel();

    if (isMultiplayer && isLeader) {
        socket.emit('cambiar_dificultad', { roomCode: currentRoom, difficulty: level });
    }
}

socket.on('dificultad_actualizada', (diff) => {
    currentDifficulty = diff;
    wheelLetters = difficultyLetters[diff];
    initWheel();
});

function initWheel() {
    const wheel = document.getElementById('fairWheel');
    if (!wheel) return;
    wheel.innerHTML = ''; 
    const totalSlices = wheelLetters.length;
    const sliceDeg = 360 / totalSlices;
    const wheelSize = wheel.clientWidth || 300;
    const radius = (wheelSize / 2) - 28; 

    let gradientStops = [];
    for (let i = 0; i < totalSlices; i++) {
        const color = wheelColors[i % wheelColors.length];
        gradientStops.push(`${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`);
    }
    wheel.style.background = `conic-gradient(${gradientStops.join(', ')})`;

    wheelLetters.forEach((letter, index) => {
        const angleDeg = index * sliceDeg + (sliceDeg / 2);
        const angleRad = (angleDeg - 90) * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        const spot = document.createElement('div');
        spot.className = 'wheel-letter-spot';
        spot.style.left = `calc(50% + ${x}px)`;
        spot.style.top = `calc(50% + ${y}px)`;
        spot.textContent = letter;
        wheel.appendChild(spot);
    });
}

function goToWheelScreen() {
    switchScreen('screen-wheel');
    initWheel();
    updateLobbyUI();
}

function spinWheel() {
    if (isMultiplayer && !isLeader) return;

    const btn = document.getElementById('spinBtn');
    if (btn) btn.disabled = true;
    playSound('spin');

    const randomIndex = Math.floor(Math.random() * wheelLetters.length);
    selectedLetter = wheelLetters[randomIndex];

    const sliceDeg = 360 / wheelLetters.length;
    const targetAngle = 360 - (randomIndex * sliceDeg + sliceDeg / 2);
    currentRotation += 1440 + targetAngle; 

    const wheel = document.getElementById('fairWheel');
    if (wheel) wheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        if (btn) btn.disabled = false;
        playSound('success');
        
        if (isMultiplayer && isLeader) {
            socket.emit('girar_ruleta_sala', { roomCode: currentRoom });
        } else if (!isMultiplayer) {
            startGameWithLetter(selectedLetter);
        }
    }, 4100);
}

socket.on('iniciar_cuenta_regresiva', (letra) => {
    selectedLetter = letra;
    switchScreen('screen-countdown');
    
    let count = 15;
    const timerElem = document.getElementById('countdownTimerNum');
    const msgElem = document.getElementById('countdownMessage');
    msgElem.textContent = `¡Letra elegida: ${letra}! Preparados, listos...`;
    timerElem.textContent = count;

    const cdInterval = setInterval(() => {
        count--;
        if (count > 0) {
            timerElem.textContent = count;
        } else {
            clearInterval(cdInterval);
            msgElem.textContent = "¡COMIENZA!";
            timerElem.textContent = "YA!";
            setTimeout(() => {
                startGameWithLetter(selectedLetter);
            }, 1000);
        }
    }, 1000);
});

/**
 * ==========================================
 * DESARROLLO DE LA PARTIDA Y CRONÓMETRO
 * ==========================================
 */

function startGameWithLetter(letter) {
    document.getElementById('displayLetter').textContent = letter;
    const formContainer = document.getElementById('categoriesForm');
    formContainer.innerHTML = '';
    const currentCategories = difficultyCategories[currentDifficulty];

    currentCategories.forEach(cat => {
        formContainer.innerHTML += `
            <div class="category-group">
                <label>${cat.name}</label>
                <input type="text" id="cat_${cat.id}" placeholder="Escribe con '${letter}'..." autocomplete="off" oninput="this.value = this.value.toUpperCase()">
            </div>
        `;
    });

    switchScreen('screen-game');
    startTimer();
}

function startTimer() {
    timeLeft = 60;
    document.getElementById('timerCountdown').textContent = timeLeft;
    document.getElementById('timerBar').style.width = '100%';

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerCountdown').textContent = timeLeft;
        document.getElementById('timerBar').style.width = (timeLeft / 60 * 100) + '%';

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitGame();
        }
    }, 1000);
}

// Se ejecuta al hacer clic en el botón "¡BASTA!" para detener la partida a todos simultáneamente
function gritarBasta() {
    if (timerInterval) clearInterval(timerInterval);

    if (isMultiplayer) {
        socket.emit('basta_para_todos', { roomCode: currentRoom });
    } else {
        processResultsAndShow();
    }
}

// El servidor avisa que el juego terminó y recolecta las respuestas locales
socket.on('juego_terminado_sala', () => {
    if (timerInterval) clearInterval(timerInterval);

    const currentCategories = difficultyCategories[currentDifficulty];
    const misRespuestas = {};
    
    currentCategories.forEach(cat => {
        const input = document.getElementById(`cat_${cat.id}`);
        misRespuestas[cat.id] = input ? input.value.trim().toUpperCase() : '';
    });

    if (isMultiplayer) {
        socket.emit('enviar_respuestas', { roomCode: currentRoom, respuestas: misRespuestas });
        showCustomModal("¡BASTA!", "¡Se acabó el tiempo o alguien cantó Basta! Esperando la revisión...", []);
    } else {
        processResultsAndShow();
    }
});

function submitGame() {
    gritarBasta();
}

// Procesamiento de resultados en modo solitario (offline)
function processResultsAndShow() {
    if (timerInterval) clearInterval(timerInterval);
    evaluatedResults = [];
    const currentCategories = difficultyCategories[currentDifficulty];

    currentCategories.forEach(cat => {
        const inputElement = document.getElementById(`cat_${cat.id}`);
        const inputVal = inputElement ? inputElement.value.trim() : '';
        const cleanVal = inputVal.toUpperCase();

        if (cleanVal === '') {
            evaluatedResults.push({ category: cat.name, word: '(Vacío)', status: 'incorrect', points: 0, textBadge: 'Sin responder' });
        } else if (!cleanVal.startsWith(selectedLetter)) {
            evaluatedResults.push({ category: cat.name, word: inputVal, status: 'incorrect', points: 0, textBadge: 'Letra incorrecta' });
        } else {
            const isRare = cleanVal.length >= 7 || ['X', 'Z', 'W', 'K', 'Y'].includes(cleanVal[0]);
            const points = isRare ? 15 : 10;
            evaluatedResults.push({ category: cat.name, word: inputVal, status: isRare ? 'rare' : 'correct', points: points, textBadge: isRare ? '¡Rara! (+15)' : 'Correcta (+10)' });
        }
    });

    calculateTotalScore();
    playSound('success');
    startContinuousConfetti();
    showResultsScreen();
}

function toggleResultStatus(index) {
    const res = evaluatedResults[index];
    if (res.word === '(Vacío)') return;

    if (res.status === 'correct') {
        res.status = 'rare'; res.points = 15; res.textBadge = '¡Rara! (+15)';
    } else if (res.status === 'rare') {
        res.status = 'repetida'; res.points = 5; res.textBadge = 'Repetida (+5)';
    } else if (res.status === 'repetida') {
        res.status = 'incorrect'; res.points = 0; res.textBadge = 'Incorrecta (0)';
    } else {
        res.status = 'correct'; res.points = 10; res.textBadge = 'Correcta (+10)';
    }

    calculateTotalScore();
    showResultsScreen();
}

function calculateTotalScore() {
    finalScore = evaluatedResults.reduce((acc, curr) => acc + curr.points, 0);
}

function showResultsScreen() {
    document.getElementById('totalScoreText').textContent = `Puntaje Total: ${finalScore} pts`;
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    evaluatedResults.forEach((res, index) => {
        const clickableStyle = res.word !== '(Vacío)' ? 'cursor: pointer;' : '';
        resultsList.innerHTML += `
            <div class="result-item">
                <div><strong>${res.category}:</strong> ${res.word}</div>
                <span class="badge ${res.status}" style="${clickableStyle}" onclick="toggleResultStatus(${index})" title="Haz clic para cambiar">${res.textBadge} ✏️</span>
            </div>
        `;
    });

    const chatSec = document.getElementById('chatSection');
    chatSec.style.display = isMultiplayer ? 'block' : 'none';

    switchScreen('screen-results');
}

/**
 * ==========================================
 * SISTEMA DE CHAT Y PODIO (HIGHSCORES)
 * ==========================================
 */

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const sender = isLeader ? 'Líder' : 'Jugador';
    socket.emit('enviar_mensaje_chat', { roomCode: currentRoom, message: msg, sender: sender });
    input.value = '';
}

socket.on('recibir_mensaje_chat', (data) => {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML += `<div><strong>${data.sender}:</strong> ${data.message}</div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
});

function resetGame() {
    stopContinuousConfetti();

    if (isMultiplayer && currentRoom) {
        socket.emit('abandonar_sala', { roomCode: currentRoom });
        currentRoom = '';
        isMultiplayer = false;
    }

    document.getElementById('saveScoreSection').innerHTML = `
        <p class="score-prompt">Guarda tus iniciales en el podio:</p>
        <div class="initials-box">
            <input type="text" id="playerInitials" maxlength="3" placeholder="ABC">
            <button class="neon-btn small-btn" onclick="saveScore()">Guardar</button>
        </div>
    `;
    switchScreen('screen-welcome');
}

function getHighScores() {
    try {
        const scores = localStorage.getItem('basta_highscores');
        return scores ? JSON.parse(scores) : [];
    } catch (e) { return []; }
}

function saveScore() {
    const initialsInput = document.getElementById('playerInitials');
    const initials = initialsInput ? initialsInput.value.toUpperCase() : '';
    if (!initials || initials.length < 2) {
        showAlertModal("Atención", "Por favor ingresa al menos 2 iniciales.");
        return;
    }

    stopContinuousConfetti();
    triggerModalExplosion();

    let highScores = getHighScores();
    highScores.push({ initials: initials, score: finalScore, date: new Date().toLocaleDateString() });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);
    localStorage.setItem('basta_highscores', JSON.stringify(highScores));

    showLeaderboardModal(highScores, initials);
    document.getElementById('saveScoreSection').innerHTML = '<p style="color: #ff007f; font-weight:700;">¡Guardado en el Podio!</p>';
}

function showLeaderboardModal(scores = null, highlightInitials = '') {
    const currentScores = scores || getHighScores();
    let htmlContent = `<div style="max-height: 240px; overflow-y: auto; width: 100%; margin: 10px 0;">`;
    if (currentScores.length === 0) {
        htmlContent += `<p style="text-align: center; color: #666; padding: 20px;">Aún no hay récords guardados.</p>`;
    } else {
        htmlContent += `<table style="width: 100%; border-collapse: collapse; text-align: left; color: #333; font-size: 0.95rem;">
            <thead><tr style="border-bottom: 2px solid #ff007f; color: #ff007f;"><th style="padding: 6px;">#</th><th style="padding: 6px;">Iniciales</th><th style="padding: 6px; text-align: right;">Puntaje</th></tr></thead><tbody>`;
        currentScores.forEach((entry, index) => {
            const isHighlight = entry.initials === highlightInitials && entry.score === finalScore;
            const rowStyle = isHighlight ? 'background: rgba(255, 0, 127, 0.35); font-weight: bold; color: #ff007f;' : 'color: #333;';
            let rankDisplay = `${index + 1}`;
            if (index === 0) rankDisplay = '🥇 1';
            if (index === 1) rankDisplay = '🥈 2';
            if (index === 2) rankDisplay = '🥉 3';
            htmlContent += `<tr style="border-bottom: 1px solid rgba(0,0,0,0.1); ${rowStyle}"><td style="padding: 6px;">${rankDisplay}</td><td style="padding: 6px;">${entry.initials}</td><td style="padding: 6px; text-align: right;">${entry.score} pts</td></tr>`;
        });
        htmlContent += `</tbody></table>`;
    }
    htmlContent += `</div>`;
    showCustomModal("🏆 TOP 10 - MEJORES PUNTAJES 🏆", htmlContent, [{ text: 'Volver al Menú', onClick: () => resetGame() }]);
}