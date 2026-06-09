import multer from "multer";
import path from "path";
import os from "os";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname.replace(/\s+/g, ""));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".zip") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos .zip"), false);
  }
};

export const uploadZip = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB máx