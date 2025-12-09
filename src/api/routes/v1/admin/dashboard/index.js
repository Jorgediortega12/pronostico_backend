import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";
import carpetasRoutes from "./carpetas/index.js";
import configuracionRoutes from "./configuracion/index.js";
import sesionesRoutes from "./sesiones/index.js";
import MenuRoutes from "./menu/index.js"

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  router.use("/carpetas", carpetasRoutes());
  router.use("/configuracion", configuracionRoutes());
  router.use("/sesiones", sesionesRoutes());
  router.use("/menu", MenuRoutes());
  return router;
}
