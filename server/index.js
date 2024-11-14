import crypto from 'crypto';
import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

//Servidor de socket.io
import { Server } from 'socket.io'
//Módulo para crear servidores HTTP
import { createServer } from 'node:http'
import { strict } from 'assert';

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
        user TEXT,
        iv TEXT
    )
`);
//Líneas necesarias para la encriptación
const algoritmo = 'aes-256-cbc';//Algoritmo para la encriptación
const key = crypto.randomBytes(32);//
const iv = crypto.randomBytes(16);//
var text;

//Siempre está escuchando cuando se conectan o desconectan los usuarios
//Un socket es una conexión en concreto
io.on('connection', async (socket) => {
    console.log('Se ha conectado un usuario');

    socket.on('chat message', async (msg) => {
        let result;
        const username = socket.handshake.auth.username ?? 'anonymous';
    
        //msg y username deben ser cadenas de texto
        const mensaje = msg ?? '';  // Si msg es undefined, usa una cadena vacía
        const user = username ?? 'anonymous';  // Si username es undefined, usa 'anonymous'
    
        //Función de encriptación para el mensaje y el nombre de usuario
        const encriptar = (text) => {
            if (typeof text !== 'string') {
                throw new Error('El texto debe ser una cadena');
            }
            const cipher = crypto.createCipheriv(algoritmo, key, iv);
            const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
            return {
                iv: iv.toString('hex'),
                encrypted: encrypted.toString('hex')
            };
        };
    
        // Encriptamos el mensaje y el nombre de usuario
        const encryptedMsg = encriptar(mensaje);
        const encryptedUsername = encriptar(user);
    
        try {
            // Inserta los datos encriptados y el iv en la base de datos
            result = await db.execute({
                sql: 'INSERT INTO messages (content, user, iv) VALUES (:msg, :username, :iv)',
                //Evita los SQL Injection 
                args: { 
                    msg: encryptedMsg.encrypted, 
                    username: encryptedUsername.encrypted, 
                    iv: encryptedMsg.iv
                } 
            });
        } catch (e) {
            console.error(e);
            return;
        }
    
        //Emite el mensaje encriptado a los demás usuarios
        io.emit('chat message', encryptedMsg.encrypted, result.lastInsertRowid.toString(), encryptedUsername.encrypted);
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
Código basado en 
https://www.youtube.com/watch?v=WpbBhTx5R9Q
https://www.youtube.com/watch?v=62P2rY_7Zc4
*/