import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Buscar documento guardado por aux3
  router.get(
    "/buscarSaveDocumento/:aux3",
    validator(schema.buscarSaveDocumento),
    controllers.buscarSaveDocumento
  );

  //cargar dias potencia
  router.get(
    "/cargarDiasPotencia/:ucp",
    validator(schema.cargarDiasPotencia),
    controllers.cargarDiasPotencia
  );

  // buscar versiones sesion
  router.get(
    "/buscarVersionesSesion/:nombre",
    validator(schema.buscarVersioneSesion),
    controllers.buscarVersionSesion
  );

  // Buscar dias festivos
  router.get(
    "/buscarDiaFestivo/:fecha/:ucp",
    validator(schema.buscarDiaFestivo),
    controllers.buscarDiaFestivo
  );

  //cargar dias potencias
  router.get("/cargarDiasPotencias/:ucp/:dia", controllers.cargarDiasPotencias);
  return router;
}
