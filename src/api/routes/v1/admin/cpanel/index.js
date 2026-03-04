import { Router } from "express";
import mercadosRoutes from "./mercados/index.js";
import usuariosRoutes from "./usuarios/index.js";
const router = Router();

export default function () {
  router.use("/mercados", mercadosRoutes());
  router.use("/usuarios", usuariosRoutes());
  return router;
}
