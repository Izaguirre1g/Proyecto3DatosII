import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { Server } from 'socket.io';
import https from 'https';
import fs from 'fs';
import { encriptar, desencriptar } from './encryption.js';

dotenv.config(); // Carga las variables de entorno

const port = process.env.PORT ?? 3000;

// Carga de certificados SSL/TLS
const sslOptions = {
    key: fs.readFileSync('C:/Users/araya/curso-node-js/clase-6/cert/private-key.pem'),
    cert: fs.readFileSync('C:/Users/araya/curso-node-js/clase-6/cert/certificate.pem')
};

const app = express();
const httpsServer = https.createServer(sslOptions, app);
const io = new Server(httpsServer, {
    cors: {
        origin: "https://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Base de datos
const db = createClient({
    url: "libsql://fleet-gravity-araya.turso.io",
    authToken: process.env.DB_TOKEN
});

// Crear tabla si no existe
await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        ivContent TEXT,
        user TEXT,
        ivUser TEXT
    )
`);

io.on('connection', async (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });

    // Manejo de mensajes entrantes
    socket.on('chat message', async (msg) => {
        console.log('Mensaje recibido del cliente:', msg);

        const username = socket.handshake.auth.username ?? 'anonymous';
        console.log('Nombre de usuario:', username);

        const encryptedMsg = encriptar(msg ?? '');
        const encryptedUsername = encriptar(username);

        console.log('Mensaje encriptado:', encryptedMsg);
        console.log('Usuario encriptado:', encryptedUsername);

        try {
            const result = await db.execute({
                sql: 'INSERT INTO messages (content, ivContent, user, ivUser) VALUES (:msg, :ivContent, :username, :ivUser)',
                args: { 
                    msg: encryptedMsg.encrypted, 
                    ivContent: encryptedMsg.iv, 
                    username: encryptedUsername.encrypted, 
                    ivUser: encryptedUsername.iv 
                }
            });

            console.log('Mensaje guardado en la base de datos con ID:', result.lastInsertRowid);

            // Emitir el mensaje desencriptado
            const decryptedMsg = desencriptar(encryptedMsg.encrypted, encryptedMsg.iv);
            const decryptedUsername = desencriptar(encryptedUsername.encrypted, encryptedUsername.iv);
            console.log('Mensaje desencriptado para emisión:', decryptedMsg);
            console.log('Usuario desencriptado para emisión:', decryptedUsername);

            io.emit('chat message', decryptedMsg, result.lastInsertRowid.toString(), decryptedUsername);
        } catch (e) {
            console.error('Error al guardar el mensaje:', e);
        }
    });

    // Recuperar mensajes anteriores
    if (!socket.recovered) {
        try {
            const results = await db.execute({
                sql: 'SELECT id, content, ivContent, user, ivUser FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });

            console.log('Mensajes recuperados de la base de datos:', results.rows);

            results.rows.forEach(row => {
                const decryptedContent = desencriptar(row.content, row.ivContent);
                const decryptedUser = desencriptar(row.user, row.ivUser);

                console.log('Mensaje desencriptado:', decryptedContent);
                console.log('Usuario desencriptado:', decryptedUser);

                socket.emit('chat message', decryptedContent, row.id.toString(), decryptedUser);
            });
        } catch (e) {
            console.error('Error al recuperar mensajes:', e);
        }
    }
});

app.use(logger('dev'));
app.use(express.static('client'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

// Iniciar el servidor HTTPS
httpsServer.listen(port, () => {
    console.log(`Servidor HTTPS corriendo en https://localhost:${port}`);
});
