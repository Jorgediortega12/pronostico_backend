import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get(
    "/cargarDatosSesiones/:codsuperior",
    validator(schema.cargarDatosSesiones),
    controllers.cargarDatosSesiones
  );

  router.get(
    "/cargarArchivoVrSesiones/:codcarpeta",
    validator(schema.cargarArchivoVrSesiones),
    controllers.cargarArchivosVrSesiones
  );

  router.get(
    "/buscarVersionSesionCod/:codigo",
    validator(schema.buscarVersionSesionCod),
    controllers.buscarVersionSesionCod
  );

  router.get(
    "/cargarPeriodosSesion/:codsesion/:tipo",
    validator(schema.cargarPeriodosSesion),
    controllers.cargarPeriodosSesion
  );

  router.get(
    "/cargarPeriodosxUCPxFecha/:ucp/:fechainicio/:fechafin",
    validator(schema.cargarPeriodosxUCPxFecha),
    controllers.cargarPeriodosxUCPxFecha
  );
  router.get(
    "/cargarSesion/:codigo",
    validator(schema.buscarVersionSesionCod),
    controllers.cargarSesion
  );
  router.get(
    "/verificarUltimaActualizacionPorUcp",
    controllers.verificarUltimaActualizacionPorUcp
  );
  return router;
}
