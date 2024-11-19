import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

// Función para obtener o generar un nombre de usuario
const getUsername = async () => {
    const username = localStorage.getItem('username');
    if (username) return username;

    const res = await fetch('https://random-data-api.com/api/users/random_user');
    const { username: randomUsername } = await res.json();
    localStorage.setItem('username', randomUsername);
    return randomUsername;
};

const username = await getUsername();

// Conexión al servidor WebSocket
const socket = io('https://localhost:3000', { // Cambia por tu dominio o dirección
    auth: { username, serverOffset: 0 }
});

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Confirmar conexión al servidor
socket.on('connect', () => {
    console.log('Conectado al servidor con ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('Error de conexión:', err);
});

// Escucha de mensajes
socket.on('chat message', (msg, serverOffset, username) => {
    console.log('Mensaje recibido del servidor:', { msg, serverOffset, username });

    const item = `<li>
        <p>${msg}</p>
        <small>${username}</small>
    </li>`;
    messages.insertAdjacentHTML('beforeend', item);
    socket.auth.serverOffset = serverOffset;
    messages.scrollTop = messages.scrollHeight;
});

// Enviar mensaje
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        console.log('Enviando mensaje:', input.value);
        socket.emit('chat message', input.value);
        input.value = ''; // Limpiar el input
    }
});
