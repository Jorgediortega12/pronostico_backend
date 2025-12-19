import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.post(
    "/guardarBarra",
    validator(schema.guardarBarra),
    controllers.guardarBarra
  );

  // consultar barras por mc/ucp
  router.get(
    "/consultarBarrasIndex_xMC/:mc",
    validator(schema.consultarBarrasIndex_xMC),
    controllers.consultarBarrasIndex_xMC
  );

  router.put(
    "/actualizarBarra/:id",
    validator(schema.actualizarBarra),
    controllers.actualizarBarra
  );

  router.post(
    "/guardarAgrupacion",
    validator(schema.guardarAgrupacion),
    controllers.guardarAgrupacion
  );

  // consultar abrupaciones por el id de la barra
  router.get(
    "/consultarAgrupacionesIndex_xBarraId/:barra_id",
    validator(schema.consultarAgrupacionesIndex_xBarraId),
    controllers.consultarAgrupacionesIndex_xBarraId
  );

  router.put(
    "/actualizarAgrupacion/:id",
    validator(schema.actualizarAgrupacion),
    controllers.actualizarAgrupacion
  );

  router.delete(
    "/eliminarBarra/:id",
    validator(schema.eliminarBarra),
    controllers.eliminarBarra
  );

  router.delete(
    "/eliminarAgrupacion/:id",
    validator(schema.eliminarAgrupacion),
    controllers.eliminarAgrupacion
  );

  return router;
}
