import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Hora a la que termina el "día actual" para editar pronósticos (la lee Pronósticos y la fija Configuración).
  router.get("/hora_fin_dia", controllers.obtenerHoraFinDia);
  router.post(
    "/hora_fin_dia",
    validator(schema.guardarHoraFinDia),
    controllers.guardarHoraFinDia,
  );
  return router;
}
