import crypto from 'crypto';

//Algoritmo y claves de encriptación
const algoritmo = 'aes-256-cbc';
const key = crypto.randomBytes(32);
//const iv = crypto.randomBytes(16);

//Función de encriptación
export const encriptar = (text) => {
    if (typeof text !== 'string') {
        throw new Error('El texto debe ser una cadena');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algoritmo, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted.toString('hex')
    };
};

//Función de desencriptación

export const desencriptar = (encryptedText, iv) => {
    const ivBuffer = Buffer.from(iv, 'hex'); // Convertir el IV de hexadecimal a buffer
    const encryptedBuffer = Buffer.from(encryptedText, 'hex'); // Convertir el texto encriptado a buffer
    const decipher = crypto.createDecipheriv(algoritmo, key, ivBuffer); // Crear el decodificador
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString(); // Desencriptar el mensaje
    return decrypted.toString(); // Convertir el resultado a string
};
