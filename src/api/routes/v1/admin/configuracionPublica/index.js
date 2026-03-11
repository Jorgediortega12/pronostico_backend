import { Router } from "express";
import validator from "../../../../middleware/validator.js";
import schema from "../dashboard/configuracion/access/schema.js";
import * as controllers from "../dashboard/configuracion/access/index.js";
const router = Router();

export default function () {
  // traer datos de historicos desde fechaInicio hasta el más reciente
  router.get(
    "/cargarPeriodosxUCPDesdeFecha/:ucp/:fechaInicio",
    validator(schema.cargarPeriodosxUCPDesdeFecha),
    controllers.cargarPeriodosxUCPDesdeFecha,
  );

  // traer datos climas desde fechaInicio hasta el más reciente
  router.get(
    "/cargarVariablesClimaticasxUCPDesdeFecha/:ucp/:fechaInicio",
    validator(schema.cargarPeriodosxUCPDesdeFecha),
    controllers.cargarVariablesClimaticasxUCPDesdeFecha,
  );

  // routes/festivos.ts
  router.get(
    "/listarFestivos/:fechaInicio/:fechaFin/:ucp",
    validator(schema.listarFestivosPorRango),
    controllers.listarFestivosPorRango,
  );
  return router;
}
