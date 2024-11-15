import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
//Servidor de socket.io
import { Server } from 'socket.io';
//Módulo para crear servidores HTTP
import { createServer } from 'node:http';
import { encriptar, desencriptar } from './encryption.js';//Se importa el archivo de la encriptación

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
        ivContent TEXT,
        user TEXT,
        ivUser TEXT
    )
`);

//Siempre está escuchando cuando se conectan o desconectan los usuarios
//Un socket es una conexión en concreto
io.on('connection', async (socket) => {
    console.log('Se ha conectado un usuario.');

    socket.on('disconnect', () => {
        console.log('Se ha desconectado un usuario.')
    });

    socket.on('chat message', async (msg) => {
        let result;
        const username = socket.handshake.auth.username ?? 'anonymous';
        //msg y username deben ser cadenas de texto
        const mensaje = msg ?? '';//Si msg es undefined, usa una cadena vacía
        const user = username ?? 'anonymous';//Si username es undefined, usa 'anonymous'

        //Encriptación del mensaje y el nombre de usuario
        const encryptedMsg = encriptar(mensaje);
        const encryptedUsername = encriptar(user);
        console.log('Mensaje encriptado:', encryptedMsg);
        console.log('Usuario encriptado:', encryptedUsername);
        try {
            //Inserta los datos encriptados y el iv en la base de datos
            result = await db.execute({
                sql: 'INSERT INTO messages (content, ivContent, user, ivUser) VALUES (:msg, :ivContent, :username, :ivUser)',
                //Evita los SQL Injection 
                args: { 
                    msg: encryptedMsg.encrypted, 
                    ivContent: encryptedMsg.iv,
                    username: encryptedUsername.encrypted, 
                    ivUser: encryptedUsername.iv
                } 
            });
        } catch (e) {
            console.error(e);
            return;
        }

      
        // Aquí se desencriptan los mensajes y nombres de usuario antes de emitirlos
        const decryptedMsg = desencriptar(encryptedMsg.encrypted, encryptedMsg.iv);
        const decryptedUsername = desencriptar(encryptedUsername.encrypted, encryptedUsername.iv);

        //Emite los mensajes desencriptados a todos los usuarios
        io.emit('chat message', decryptedMsg, result.lastInsertRowid.toString(), decryptedUsername);


        //io.emit('chat message', encryptedMsg.encrypted, result.lastInsertRowid.toString(), encryptedUsername.encrypted);
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

            results.rows.forEach(row => {
                console.log('Fila recuperada de la base de datos:', row);
                console.log('Contenido desencriptado:', desencriptar(row.content, row.ivContent));
                console.log('Usuario desencriptado:', desencriptar(row.user, row.ivUser));

                //Desencripta el mensaje y el nombre de usuario antes de enviarlos al cliente
                const decryptedContent = desencriptar(row.content, row.ivContent);
                const decryptedUser = desencriptar(row.user,row.ivUser );
                
                //Cada línea que tengamos se va a emitir a nivel de Sockets
                //Es la información que se envía en cada mensaje a la BD
                //Muestra los mensajes antiguos
                //Emite los mensajes desencriptados desde la base de datos
                socket.emit('chat message', decryptedContent, row.id.toString(), decryptedUser);
                
                //socket.emit('chat message', row.content, row.id.toString(), row.user);
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