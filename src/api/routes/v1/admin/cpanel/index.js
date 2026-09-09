import { Router } from "express";
import mercadosRoutes from "./mercados/index.js";
import usuariosRoutes from "./usuarios/index.js";
import ciudadesClimaRoutes from "./ciudades_clima/index.js";
const router = Router();

export default function () {
  router.use("/mercados", mercadosRoutes());
  router.use("/usuarios", usuariosRoutes());
  router.use("/ciudades_clima", ciudadesClimaRoutes());
  return router;
}
