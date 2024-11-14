import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

//Servidor de socket.io
import { Server } from 'socket.io'
//Módulo para crear servidores HTTP
import { createServer } from 'node:http'

dotenv.config();//Lee la variable de entorno

const port = process.env.PORT ?? 3000;
const app = express();
//Aquí se crea el servidor HTTP de Node.js
const server = createServer(app);
//Socket Input/Ouput, dirección bidireccional
const io = new Server(server, {
    //Evita la pérdida de información por unos segundos
    connectionStateRecovery: {}
});
//Crea la conexión con Turso (Base de datos)
const db = createClient({
    url: "libsql://distinct-maximum-alchemist-krypto.turso.io",
    authToken: process.env.DB_TOKEN
});
//Creación de una tabla en SQL
await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        user TEXT
    )
`);
//Siempre está escuchando cuando se conectan o desconectan los usuarios
//Un socket es una conexión en concreto
io.on('connection', async (socket) => {
    console.log('Se ha conectado un usuario');

    socket.on('disconnect', () => {
        console.log('Se ha desconectado un usuario');
    });
     /**Prepara al servidor para que cuando reciba mensajes realice una acción en concreto
     */
    socket.on('chat message', async (msg) => {
        //Intenta registrar los mensajes en la base de datos
        let result;
        //Obtiene el username
        const username = socket.handshake.auth.username ?? 'anonymous';
        try {
            result = await db.execute({
                sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
                args: { msg, username }//Evita los SQL Injection 
            });
        } catch (e) {
            console.error(e);
            return;
        }
        //Realiza un broadcast para todos los usuarios conectados
        //id convertida en un string
        io.emit('chat message', msg, result.lastInsertRowid.toString(), username);
    });
    //Recupera los mensajes sin conexión
    if (!socket.recovered) {
        try {
            const results = await db.execute({
                //Es donde se envía la información de la conexión
                //Recupera los mensajes
                sql: 'SELECT id, content, user FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });

            results.rows.forEach(row => {
                //Cada línea que tengamos se va a emitir a nivel de Sockets
                //Es la información que se envía en cada mensaje a la BD
                socket.emit('chat message', row.content, row.id.toString(), row.user);
            });
        } catch (e) {
            console.error(e);
        }
    }
});

app.use(logger('dev'));

//Sirve archivos estáticos desde la carpeta 'client'
app.use(express.static('client'));

app.get('/', (req, res) => {
    //Indica desde donde se ha inicializado el proceso
    res.sendFile(process.cwd() + '/client/index.html');
});
//Escucha del puerto dado donde se conecta la página
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


/*
**Referencias**
Código basado en https://www.youtube.com/watch?v=WpbBhTx5R9Q
*/