import multer from "multer";
import path from "path";
import os from "os";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "")}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".kmz" || ext === ".kml") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos .kmz o .kml"), false);
  }
};

// Los KMZ de circuitos pueden pesar unos MB comprimidos.
export const uploadKmz = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB máx
});
