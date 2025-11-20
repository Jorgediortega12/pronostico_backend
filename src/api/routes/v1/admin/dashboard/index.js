import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  return router;
}
