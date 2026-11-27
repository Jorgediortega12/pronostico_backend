import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Agente ADEM con el que se calcula la demanda al cargar archivos (null = automático)
  router.get("/", controllers.obtener);
  router.put("/", validator(schema.actualizar), controllers.actualizar);
  return router;
}
