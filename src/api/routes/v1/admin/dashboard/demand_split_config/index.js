import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Configuración global de división de mercado (fecha límite + porcentaje)
  router.get("/", controllers.obtener);
  router.put("/", validator(schema.actualizar), controllers.actualizar);
  return router;
}
