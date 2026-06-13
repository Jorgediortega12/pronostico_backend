import multer from "multer";
import fs from "fs";
import path from "path";

const contratosPath = path.join(process.cwd(), "contratos");

// Crear carpeta si no existe
if (!fs.existsSync(contratosPath)) {
  fs.mkdirSync(contratosPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, contratosPath);
  },
  filename: (req, file, cb) => {
    // {timestamp}_{originalname} (replica el comportamiento del origen Python)
    const ts = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 15)
      .replace(/(\d{8})(\d{6})/, "$1_$2");
    cb(null, `${ts}_${file.originalname.replace(/\s+/g, "")}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".xls" || ext === ".xlsx") {
    cb(null, true);
  } else {
    cb(new Error("Extensión no válida. Solo se permiten archivos .xls o .xlsx"), false);
  }
};

export const uploadContrato = multer({ storage, fileFilter });