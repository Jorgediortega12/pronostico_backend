import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import colors from "colors";
import Logger from "../helpers/logger.js";
import authRoutes from "../api/routes/v1/auth/index.js";
import adminRoutes from "../api/routes/v1/admin/index.js";

import { fileURLToPath } from "url";

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (app) => {
  // Middlewares
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // SERVIR IMAGENES - DEBE IR ANTES DE LAS RUTAS
  // Subir dos niveles desde src/loaders/ hasta la raíz
  const imagenesPath = path.join(__dirname, "../../Imagenes");
  app.use("/Imagenes", express.static(imagenesPath));
  Logger.info(colors.cyan(`📁 Sirviendo imágenes desde: ${imagenesPath}`));

  // Health check
  app.get("/", (req, res) => {
    res.json({
      message: "Pronostico Backend API",
      status: "running",
      version: "1.0.0",
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "OK",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes v1
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/admin", adminRoutes());

  // Error handling middleware
  app.use((err, req, res, next) => {
    Logger.error(colors.red("Error en la aplicación:"), err.stack);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Ruta no encontrada",
    });
  });

  Logger.info(colors.green("✓ Express loaded"));
};
