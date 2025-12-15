import { Router } from "express";
import validator from "../../../middleware/validator.js";
import schema from "./schema.js";
import * as controller from "./controller.js";

const router = Router();

export default function () {
  router.get(
    "/estado/:ucp",
    validator(schema.obtenerEstadoActualizacion),
    controller.obtenerEstadoActualizacion
  );

  router.post(
    "/clima/ejecutar",
    validator(schema.ejecutarActualizacionClima),
    controller.ejecutarActualizacionClima
  );

  router.post(
    "/historica/ejecutar",
    validator(schema.ejecutarActualizacionHistorica),
    controller.ejecutarActualizacionHistorica
  );

  return router;
}
