const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('¡Un nuevo jugador se ha conectado con ID:', socket.id);

    // Evento: Unirse a sala
    socket.on('unirse_sala', (roomCode) => {
        socket.join(roomCode);
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                leaderId: socket.id,
                difficulty: 'easy',
                players: [socket.id],
                answers: {}
            };
            socket.emit('asignar_lider', true);
        } else {
            rooms[roomCode].players.push(socket.id);
            socket.emit('asignar_lider', false);
        }
        io.to(roomCode).emit('actualizar_sala', rooms[roomCode]);
    });

    // Sincronizar las correcciones de palabras
    socket.on('cambiar_estado_palabra', (data) => {
        const { roomCode, targetPlayerId, index, status, points, textBadge } = data;
        console.log(`[Servidor] Cambio recibido en sala ${roomCode} para el jugador ${targetPlayerId}`);
        if (rooms[roomCode]) {
            io.to(roomCode).emit('sincronizar_estado_palabra', {
                targetPlayerId,
                index,
                status,
                points,
                textBadge
            });
        }
    });

    // Abandonar sala
    socket.on('abandonar_sala', ({ roomCode }) => {
        removerJugadorDeSala(socket, roomCode);
    });

    // Enviar respuestas
    socket.on('enviar_respuestas', ({ roomCode, respuestas }) => {
        if (!rooms[roomCode]) return;
        
        rooms[roomCode].answers[socket.id] = respuestas;

        if (Object.keys(rooms[roomCode].answers).length === rooms[roomCode].players.length) {
            io.to(roomCode).emit('fase_revision', rooms[roomCode].answers);
            rooms[roomCode].answers = {};
        }
    });

    // Cambiar dificultad
    socket.on('cambiar_dificultad', ({ roomCode, difficulty }) => {
        if (rooms[roomCode] && rooms[roomCode].leaderId === socket.id) {
            rooms[roomCode].difficulty = difficulty;
            io.to(roomCode).emit('dificultad_actualizada', difficulty);
        }
    });

    // Girar ruleta
    socket.on('girar_ruleta_sala', ({ roomCode }) => {
        if (rooms[roomCode] && rooms[roomCode].leaderId === socket.id) {
            const diff = rooms[roomCode].difficulty;
            const difficultyLetters = {
                easy: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V'],
                medium: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'Z'],
                hard: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Y', 'Z']
            };
            const letters = difficultyLetters[diff] || difficultyLetters.easy;
            const letraAleatoria = letters[Math.floor(Math.random() * letters.length)];
            io.to(roomCode).emit('iniciar_cuenta_regresiva', letraAleatoria);
        }
    });

    // Basta para todos
    socket.on('basta_para_todos', ({ roomCode }) => {
        io.to(roomCode).emit('juego_terminado_sala');
    });

    // Chat
    socket.on('enviar_mensaje_chat', ({ roomCode, message, sender }) => {
        io.to(roomCode).emit('recibir_mensaje_chat', { message, sender });
    });

    // Sugerir palabra (MOVIDO ADENTRO PARA FUNCIONAR)
    socket.on('sugerir_palabra', (data) => {
        console.log(`========================================`);
        console.log(`💡 ¡NUEVA SUGERENCIA DE PALABRA RECIBIDA!`);
        console.log(`📂 Categoría: ${data.categoria}`);
        console.log(`🔠 Letra: ${data.letra}`);
        console.log(`✍️ Palabra: ${data.palabra}`);
        console.log(`========================================`);
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        for (const roomCode in rooms) {
            if (rooms[roomCode].players.includes(socket.id)) {
                removerJugadorDeSala(socket, roomCode);
            }
        }
    });
});

// Función auxiliar para quitar al jugador
function removerJugadorDeSala(socket, roomCode) {
    socket.leave(roomCode);
    if (!rooms[roomCode]) return;

    rooms[roomCode].players = rooms[roomCode].players.filter(id => id !== socket.id);
    
    if (rooms[roomCode].answers && rooms[roomCode].answers[socket.id]) {
        delete rooms[roomCode].answers[socket.id];
    }

    if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
    } else {
        if (rooms[roomCode].leaderId === socket.id) {
            rooms[roomCode].leaderId = rooms[roomCode].players[0];
            io.to(rooms[roomCode].leaderId).emit('asignar_lider', true);
        }
        io.to(roomCode).emit('actualizar_sala', rooms[roomCode]);
    }
}

server.listen(3000, () => {
    console.log('¡Servidor activo en http://localhost:3000 !');
});