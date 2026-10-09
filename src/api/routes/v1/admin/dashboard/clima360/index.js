import { Router } from "express";
import validator, { ValidationSource } from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

// UI "Clima 360°" del Mapa climático: ciudades = puntos activos del mapa.
export default function () {
  router.get("/ciudades", controllers.ciudades);
  router.get("/resumen", validator(schema.resumen, ValidationSource.QUERY), controllers.resumen);
  router.get("/comparador", validator(schema.rango, ValidationSource.QUERY), controllers.comparador);
  router.get("/historico", validator(schema.rango, ValidationSource.QUERY), controllers.historico);
  router.get(
    "/pronostico/:id",
    validator(schema.idParam, ValidationSource.PARAM),
    validator(schema.pronostico, ValidationSource.QUERY),
    controllers.pronostico,
  );
  router.get("/alertas", validator(schema.ids, ValidationSource.QUERY), controllers.alertas);
  router.post("/reporte", validator(schema.reporte), controllers.reporte);
  return router;
}
