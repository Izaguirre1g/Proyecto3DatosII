import crypto from 'crypto';

//Algoritmo y claves de encriptación
const algoritmo = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

//Función de encriptación
export const encriptar = (text) => {
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

//Función de desencriptación

