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
    uploadExcel.fields([
      { name: "ecuacion", maxCount: 1 },
      { name: "consumo", maxCount: 1 },
    ]),
    validator(schema.procesar),
    controllers.procesar,
  );

  router.post(
    "/guardar-ecuacion",
    uploadExcel.fields([{ name: "ecuacion", maxCount: 1 }]),
    validator(schema.guardarEcuacion),
    controllers.guardarEcuacion,
  );

  router.post(
    "/guardar-respaldo",
    validator(schema.guardarRespaldo),
    controllers.guardarRespaldo,
  );

  router.get(
    "/calcular-respaldo",
    validator(schema.calcularRespaldo, ValidationSource.QUERY),
    controllers.calcularRespaldo,
  );

  return router;
}
