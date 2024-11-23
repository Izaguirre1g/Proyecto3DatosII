//Importación directa de Socket.io
import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

//Genera los users de manera random
//Función para obtener o generar un nombre de usuario
const getUsername = async () => {
    const username = localStorage.getItem('username');
    if (username) return username;
    //Utiliza una API de usuarios random
    const res = await fetch('https://random-data-api.com/api/users/random_user');
    const { username: randomUsername } = await res.json();
    localStorage.setItem('username', randomUsername);
    return randomUsername;
};

const username = await getUsername();

//Conexión al servidor WebSocket
const socket = io('https://localhost:3000', {
    //Identifica el último chat, lo que envía en el mensaje
    auth: { 
      username, 
      serverOffset: 0 }
});

//Formulario, submit
const form = document.getElementById('form');
//Para leer la información del mensaje
const input = document.getElementById('input');
//Guarda los mensajes
const messages = document.getElementById('messages');

//Confirmar conexión al servidor
socket.on('connect', () => {
    console.log('Conectado al servidor con ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('Error de conexión:', err);
});
/*Cuando se reciba un mensaje en el socket de chatMessag se crea un nuevo item
Lo que hace es mostrar nuestro mensaje en la pantalla de chat
*/
//Escucha de mensajes
socket.on('chat message', (msg, serverOffset, username) => {
    console.log('Mensaje recibido del servidor:', { msg, serverOffset, username });
    //Una lista
    const item = `<li>
        <p>${msg}</p>
        <small>${username}</small>
    </li>`;
    messages.insertAdjacentHTML('beforeend', item);
    socket.auth.serverOffset = serverOffset;
    //Realiza un scroll hacia abajo cuando llega un nuev mensaje
    messages.scrollTop = messages.scrollHeight;
});

//Envia mensaje
form.addEventListener('submit', (e) => {
    e.preventDefault();//Evita que el formulario haga un GET
    if (input.value) {
        console.log('Enviando mensaje:', input.value);
        //Si hay un mensaje lo emite, se envía al servidor
        socket.emit('chat message', input.value);
        //Limpia el campo de mensajes (input clean)
        input.value = '';
    }
});