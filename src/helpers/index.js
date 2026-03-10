import jwt from "jsonwebtoken";
import crypto from "crypto-js";
import { secretKey } from "../config/index.js";

const encrypt = (val, password) => crypto.AES.encrypt(val, password).toString();

export const decrypt = (encrypted, password) => {
  const decipher = crypto.AES.decrypt(encrypted, password);
  return decipher.toString(crypto.enc.Utf8);
};

// Crea el token con las credenciales de BD encriptadas dentro
// igual que instituciones: encrypt(JSON.stringify(accesos), timeStamp + KEYS_TOKEN)
export const createToken = (accesos, user, timeStamp) => {
  const key = `${timeStamp}${process.env.KEYS_TOKEN}`;
  const dataEncrypt = encrypt(JSON.stringify(accesos), key);

  return jwt.sign({ dataEncrypt, timeStamp }, secretKey, { expiresIn: "12h" });
};

// Desencripta la session del token (mismo patrón que instituciones)
export const decodeInfo = (dataEncrypt, timeStamp) => {
  const data = decrypt(dataEncrypt, `${timeStamp}${process.env.KEYS_TOKEN}`);
  return data;
};
