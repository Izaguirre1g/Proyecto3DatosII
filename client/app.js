 //Importación directa de Socket.io
 import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

 // Mueve la función getUsername antes de inicializar el socket
 //Genera los users de manera random
 const getUsername = async () => {
   const username = localStorage.getItem('username');
   if (username) {
     return username;
   }
   //Utiliza una API de usuarios random
   const res = await fetch('https://random-data-api.com/api/users/random_user');
   const { username: randomUsername } = await res.json();
   localStorage.setItem('username', randomUsername);
   return randomUsername;
 };

 const username = await getUsername();

 const socket = io({
   //Identifica el último chat, lo que envía en el mensaje
   auth: {
     username,
     serverOffset: 0
   }
 });
 //Formulario, submit
 const form = document.getElementById('form');
 //Para leer la información del mensaje
 const input = document.getElementById('input');
 //Guarda los mensajes
 const messages = document.getElementById('messages');

 /*Cuando se reciba un mensaje en el socket de chatMessag se crea un nuevo item
 Lo que hace es mostrar nuestro mensaje en la pantalla de chat
 */
 socket.on('chat message', (msg, serverOffset, username) => {
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

 form.addEventListener('submit', (e) => {
   e.preventDefault(); // Evita que el formulario haga un GET
   //Si hay algún valor en el input
   if (input.value) {
     //Si hay un mensaje lo emite, se envía al servidor
     socket.emit('chat message', input.value);
     //Limpia el campo de mensajes (input clean)
     input.value = '';
   }
 });