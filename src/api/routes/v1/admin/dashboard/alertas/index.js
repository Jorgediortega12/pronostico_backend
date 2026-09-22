import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/", validatorParamsQuery(schema.listarAlertas), controllers.listarAlertas);
  router.post("/evaluar-ahora", controllers.evaluarAhora);

  router.get("/config", controllers.obtenerConfig);
  router.put(
    "/config/:categoria",
    validatorParamsQuery(schema.categoriaParam),
    validator(schema.actualizarConfig),
    controllers.actualizarConfig,
  );

  router.get("/:codigo", validatorParamsQuery(schema.codigoParam), controllers.obtenerDetalle);
  router.post("/:codigo/revisar", validatorParamsQuery(schema.codigoParam), controllers.marcarRevisada);

  return router;
}
