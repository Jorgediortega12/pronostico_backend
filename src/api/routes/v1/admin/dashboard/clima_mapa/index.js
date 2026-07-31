import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/puntos", controllers.listarPuntos);
  router.post("/puntos", validator(schema.crearPunto), controllers.crearPunto);
  router.put(
    "/puntos/:id",
    validator(schema.actualizarPunto),
    controllers.actualizarPunto,
  );
  router.delete("/puntos/:id", controllers.eliminarPunto);

  router.get("/puntos/:id/hora/:fecha", controllers.cargarHoraPorPunto);
  router.get("/puntos/:id/dia", controllers.cargarDiaPorPunto);

  router.post("/ingesta/ejecutar", controllers.ejecutarIngesta);

  return router;
}
