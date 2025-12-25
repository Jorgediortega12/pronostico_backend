import multer from "multer";
import fs from "fs";
import path from "path";

const medidasPath = path.join(process.cwd(), "Medidas");

// Crear carpeta si no existe
if (!fs.existsSync(medidasPath)) {
  fs.mkdirSync(medidasPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, medidasPath);
  },
  filename: (req, file, cb) => {
    // 🔥 MISMO NOMBRE ORIGINAL (como .NET)
    cb(null, file.originalname.replace(/\s+/g, ""));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".xls" || ext === ".xlsx") {
    cb(null, true);
  } else {
    cb(new Error("Extensión no válida"), false);
  }
};

export const uploadExcel = multer({ storage, fileFilter });
