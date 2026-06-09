import multer from "multer";

// El archivo se guarda en disco DESPUÉS de conocer el id generado en la BD
// (igual que el origen Python), por eso se usa memoryStorage.
const storage = multer.memoryStorage();

export const uploadConvocatoria = multer({ storage });