import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";
import demandaRoutes from "./demanda/index.js";
import carpetasRoutes from "./carpetas/index.js";
import configuracionRoutes from "./configuracion/index.js";
import sesionesRoutes from "./sesiones/index.js";
import MenuRoutes from "./menu/index.js";
import FactoresRoutes from "./factores/index.js";
import EpmRoutes from "./epm/index.js";
import analysisRoutes from "./analysis/index.js";
import cronRoutes from "./cron/index.js";
import ademRoutes from "./adem/index.js";
import cubrimientoRoutes from "./cubrimiento/index.js";
import mpmRoutes from "./mpm/index.js";
import convocatoriaRoutes from "./convocatoria/index.js";
import valoracionRoutes from "./valoracion/index.js";

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  router.use("/demanda", demandaRoutes());
  router.use("/carpetas", carpetasRoutes());
  router.use("/configuracion", configuracionRoutes());
  router.use("/sesiones", sesionesRoutes());
  router.use("/menu", MenuRoutes());
  router.use("/factores", FactoresRoutes());
  router.use("/epm", EpmRoutes());
  router.use("/analysis", analysisRoutes());
  router.use("/cron", cronRoutes());
  router.use("/adem", ademRoutes());
  router.use("/cubrimiento", cubrimientoRoutes());
  router.use("/mpm", mpmRoutes());
  router.use("/convocatoria", convocatoriaRoutes());
  router.use("/valoracion", valoracionRoutes());
  return router;
}
