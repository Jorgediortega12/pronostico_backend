import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/crearCircuito",
    validator(schema.crearCircuito),
    controllers.crearCircuito,
  );
  router.get("/obtenerCircuitos", controllers.obtenerCircuitos);
  router.post(
    "/obtenerCircuitosPorUCP",
    validator(schema.obtenerCircuitosPorUCP),
    controllers.obtenerCircuitosPorUCP,
  );
  router.post(
    "/actualizarCircuito",
    validator(schema.actualizarCircuito),
    controllers.actualizarCircuito,
  );
  router.post(
    "/eliminarCircuito",
    validator(schema.eliminarCircuito),
    controllers.eliminarCircuito,
  );
  return router;
}
