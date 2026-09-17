import { Router } from "express";
import validator, {
  ValidationSource,
} from "../../../../../middleware/validator.js";
import { uploadExcel } from "../../../../../../middleware/uploadExcel.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/procesar",
    uploadExcel.single("consumo"),
    validator(schema.procesar),
    controllers.procesar,
  );

  router.post(
    "/guardar",
    validator(schema.guardar),
    controllers.guardar,
  );

  router.get(
    "/cargar",
    validator(schema.cargar, ValidationSource.QUERY),
    controllers.cargar,
  );

  router.post(
    "/actualizar-estado",
    validator(schema.actualizarEstado),
    controllers.actualizarEstado,
  );

  router.post(
    "/pronosticar",
    validator(schema.pronosticar),
    controllers.pronosticar,
  );

  return router;
}
