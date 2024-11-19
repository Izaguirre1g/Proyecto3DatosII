import dotenv from 'dotenv';//Necesario para la lectura del archivo.env
import crypto from 'crypto';//API que permite utilizar algoritmos de encriptación
//Lee la variable de enterno
dotenv.config();

/*
 * Para utilizar crypto se necesitan tres datos importantes
 * -Algoritmo: algoritmo escogido para la encriptación
 * -Key: la clave es el "secreto" que se utiliza para encriptar y desencriptar los datos. 
 * Sin la clave correcta, es imposible (o extremadamente difícil) desencriptar los datos. Es un buffer de datos
 * -iv: es un valor adicional que se utiliza junto con la clave para aumentar la seguridad.
 */

//Muestra los algoritmos disponibles en crypto
//console.log(crypto.getCipher());

//Este es el algoritmo utilizado para la encriptación
const algoritmo = 'aes-256-cbc';
//Si esta clave cambia en cada llamada la desencriptación no funcionará debido a que faltarán elementos del dato
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); //Clave fija cargada desde .env

//Función de encriptación
export const encriptar = (text) => {
    if (typeof text !== 'string') {
        throw new Error('El texto debe ser una cadena');
    }
    //Valor inicial necesario para la desencriptación
    const iv = crypto.randomBytes(16);
    //Encripta el dato recibido
    const cipher = crypto.createCipheriv(algoritmo, key, iv);
    //Se concatenan los buffers de key e iv con el dato encriptado
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    //Retorna un objeto necesario para la desencriptación
    //Tiene un formato hexadecimal para facilidad de lectura
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted.toString('hex')
    };
};

//Función de desencriptación
export const desencriptar = (encryptedText, iv) => {
    //Convierte el iv de hexadecimal a buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    //Convierte el texto encriptado a buffer
    const encryptedBuffer = Buffer.from(encryptedText, 'hex');
    //Crea el decodificador
    const decipher = crypto.createDecipheriv(algoritmo, key, ivBuffer);
    //Desencripta el mensaje
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    //Convierte el resultado a string
    return decrypted.toString();
};
