import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";
import carpetasRoutes from "./carpetas/index.js";

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  router.use("/carpetas", carpetasRoutes());
  return router;
}
