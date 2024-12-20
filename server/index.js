import express from 'express';//Es un framework para crear el Server en Node.js
import logger from 'morgan';//Hace un camino de trazas
import dotenv from 'dotenv';//Lectura de variables de entorno (.env)
import { createClient } from '@libsql/client';//Creación de clientes
//Servidor de socket.io
import { Server } from 'socket.io';//Permite la comunicación client-server-client
import https from 'https';
import fs from 'fs';
//Se importa el archivo de la encriptación
import { encriptar, desencriptar } from './encryption.js';

dotenv.config(); //Lee y carga las variables de entorno

const port = process.env.PORT ?? 3000;

//Carga de certificados SSL/TLS
const sslOptions = {
    //Certificados autofirmados por nosotros mismos
    key: fs.readFileSync('C:/Users/Jose/Desktop/Proyecto3DatosII/cert/private-key.pem'),
    cert: fs.readFileSync('C:/Users/Jose/Desktop/Proyecto3DatosII/cert/certificate.pem')
};

const app = express();
//Aquí se crea el servidor HTTP de Node.js
const httpsServer = https.createServer(sslOptions, app);
//Socket Input/Ouput, dirección bidireccional
const io = new Server(httpsServer, {
    //Evita la pérdida de información por unos segundos
    cors: {
        origin: "https://localhost:3000",
        methods: ["GET", "POST"]
    }
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
        ivContent TEXT,
        user TEXT,
        ivUser TEXT
    )
`);

//Siempre está escuchando cuando se conectan o desconectan los usuarios
//Un socket es una conexión en concreto
io.on('connection', async (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });

    //Manejo de mensajes entrantes
    socket.on('chat message', async (msg) => {
        console.log('Mensaje recibido del cliente:', msg);

        const username = socket.handshake.auth.username ?? 'anonymous';
        //msg y username deben ser cadenas de texto
        console.log('Nombre de usuario:', username);

        //Encriptación del mensaje y el nombre de usuario
        const encryptedMsg = encriptar(msg ?? '');//Si msg es undefined, usa una cadena vacía
        const encryptedUsername = encriptar(username);//Si username es undefined, usa 'anonymous'

        console.log('Mensaje encriptado:', encryptedMsg);
        console.log('Usuario encriptado:', encryptedUsername);

        try {
            //Inserta los datos encriptados y el iv en la base de datos
            const result = await db.execute({
                sql: 'INSERT INTO messages (content, ivContent, user, ivUser) VALUES (:msg, :ivContent, :username, :ivUser)',
                //Evita los SQL Injection 
                args: { 
                    msg: encryptedMsg.encrypted, 
                    ivContent: encryptedMsg.iv, 
                    username: encryptedUsername.encrypted, 
                    ivUser: encryptedUsername.iv 
                }
            });

            console.log('Mensaje guardado en la base de datos con ID:', result.lastInsertRowid);

            //Aquí se desencriptan los mensajes y nombres de usuario antes de emitirlos
            const decryptedMsg = desencriptar(encryptedMsg.encrypted, encryptedMsg.iv);
            const decryptedUsername = desencriptar(encryptedUsername.encrypted, encryptedUsername.iv);
            console.log('Mensaje desencriptado para emisión:', decryptedMsg);
            console.log('Usuario desencriptado para emisión:', decryptedUsername);
            //Emite los mensajes desencriptados a todos los usuarios
            io.emit('chat message', decryptedMsg, result.lastInsertRowid.toString(), decryptedUsername);
        } catch (e) {
            console.error('Error al guardar el mensaje:', e);
        }
    });

    //Recupera los mensajes sin conexión
    if (!socket.recovered) {
        try {
            const results = await db.execute({
                //Es donde se envía la información de la conexión
                //Recupera los mensajes
                sql: 'SELECT id, content, ivContent, user, ivUser FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });

            console.log('Mensajes recuperados de la base de datos:', results.rows);

            results.rows.forEach(row => {
                //Desencripta el mensaje y el nombre de usuario antes de enviarlos al cliente
                const decryptedContent = desencriptar(row.content, row.ivContent);
                const decryptedUser = desencriptar(row.user, row.ivUser);

                console.log('Mensaje desencriptado:', decryptedContent);
                console.log('Usuario desencriptado:', decryptedUser);
                //Cada línea que tengamos se va a emitir a nivel de Sockets
                //Es la información que se envía en cada mensaje a la BD
                //Muestra los mensajes antiguos
                //Emite los mensajes desencriptados desde la base de datos
                socket.emit('chat message', decryptedContent, row.id.toString(), decryptedUser);
            });
        } catch (e) {
            console.error('Error al recuperar mensajes:', e);
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

/*Escucha del puerto dado donde se conecta la página e 
inicia el servidor HTTPS
*/
httpsServer.listen(port, () => {
    console.log(`Servidor HTTPS corriendo en https://localhost:${port}`);
});

//Para Wireshark utilizar el filtro: tcp.port == 3000 en Adapter for loopack traffic capture
//Esto es para la creción del certificado: openssl req -nodes -new -x509 -keyout private-key.pem -out certificate.pem -days 365

/*
**Referencias**
Código basado en 
https://www.youtube.com/watch?v=WpbBhTx5R9Q
https://www.youtube.com/watch?v=62P2rY_7Zc4
*/