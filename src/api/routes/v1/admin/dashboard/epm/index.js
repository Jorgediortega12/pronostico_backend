// routes/epm.routes.js
import { Router } from "express";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import validator from "../../../../../middleware/validator.js";
import * as schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get(
    "/consultarEPM/:consulta",
    validatorParamsQuery(schema.consultarEPM),
    controllers.consultarEPM,
  );
  router.get("/config", controllers.obtenerConfigEpm);
  router.put(
    "/config",
    validator(schema.guardarConfigEpm),
    controllers.guardarConfigEpm,
  );
  return router;
}
