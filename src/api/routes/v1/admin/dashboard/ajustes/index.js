import { Router } from "express";
import schema from "./access/schema.js";
import { validar, validarParamsDelPaso } from "./access/validar.js";
import * as controllers from "./access/index.js";

// Mesa de ajustes: proxy con whitelist hacia EPM (/adjustments/*). Contrato:
// EPM/docs/work/ajustes/fase3/CONTRATO_BACKEND.md. Auth de usuario y sesión ya vienen del padre (/dashboard).
const Q = "query";
const P = "params";

export function crearRouterAjustes() {
  const router = Router();

  router.get("/ucps", controllers.ucps);
  router.get("/pronostico-emitido", validar(schema.pronosticoEmitido, Q), controllers.pronosticoEmitido);
  router.get("/reales", validar(schema.reales, Q), controllers.reales);
  router.post("/preview", validar(schema.preview), controllers.preview);
  router.post("/run", validar(schema.run), controllers.run);
  router.get("/aprobada", validar(schema.aprobada, Q), controllers.aprobada);
  router.get("/acumulado-anual", validar(schema.acumuladoAnual, Q), controllers.acumuladoAnual);
  router.get("/aprendizaje-error", validar(schema.aprendizajeError, Q), controllers.aprendizajeError);
  router.post("/analogos", validar(schema.analogos), controllers.analogos);

  router.get("/corridas/:id", validar(schema.corridaParams, P), controllers.corrida);
  router.get("/corridas/:id/versiones", validar(schema.corridaParams, P), controllers.versiones);
  router.get("/corridas/:id/versiones/:version", validar(schema.versionParams, P), controllers.version);
  router.patch(
    "/corridas/:id/pasos/:paso",
    validar(schema.pasoParams, P),
    validar(schema.patchPaso),
    validarParamsDelPaso,
    controllers.patchPaso,
  );
  router.post("/corridas/:id/aprobar", validar(schema.corridaParams, P), validar(schema.aprobar), controllers.aprobar);

  return router;
}

export default function () {
  return crearRouterAjustes();
}
