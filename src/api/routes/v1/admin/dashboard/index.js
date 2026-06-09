import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";
import carpetasRoutes from "./carpetas/index.js";
import configuracionRoutes from "./configuracion/index.js";
import sesionesRoutes from "./sesiones/index.js";
import MenuRoutes from "./menu/index.js";
import FactoresRoutes from "./factores/index.js";
import EpmRoutes from "./epm/index.js";
import CircuitosRoutes from "./circuitos/index.js";

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  router.use("/carpetas", carpetasRoutes());
  router.use("/configuracion", configuracionRoutes());
  router.use("/sesiones", sesionesRoutes());
  router.use("/menu", MenuRoutes());
  router.use("/factores", FactoresRoutes());
  router.use("/epm", EpmRoutes());
  router.use("/circuitos", CircuitosRoutes());
  return router;
}
