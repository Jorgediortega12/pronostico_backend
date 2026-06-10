// routes/convocatoria.routes.js (gestión de contratos)
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import { uploadConvocatoria } from "../../../../../../middleware/uploadConvocatoria.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // ── Convocatorias ────────────────────────────────────────────────────────
  router.get("/", controllers.listarConvocatorias);
  router.post("/", validator(schema.crearConvocatoria), controllers.crearConvocatoria);

  // ── Contratos (rutas estáticas / más específicas primero) ─────────────────
  router.post("/contratos", validator(schema.crearContrato), controllers.crearContrato);
  router.put("/contratos/agente", validator(schema.actualizarAgente), controllers.actualizarAgente);
  router.get(
    "/contratos/agente/:contrato_codigo",
    validatorParamsQuery(schema.agentePorCodigo),
    controllers.obtenerAgente,
  );
  router.get(
    "/contratos/get/:codigo",
    validatorParamsQuery(schema.contratoPorCodigo),
    controllers.obtenerContrato,
  );

  // ── Archivos ───────────────────────────────────────────────────────────────
  router.post("/contratos/archivo", uploadConvocatoria.single("ARCHIVO"), controllers.subirArchivo);
  router.put(
    "/contratos/archivo/actualizar",
    uploadConvocatoria.single("ARCHIVO"),
    controllers.actualizarArchivo,
  );
  router.get(
    "/contratos/archivos/download/:carpeta/:id",
    validatorParamsQuery(schema.descargarArchivo),
    controllers.descargarArchivo,
  );
  router.get(
    "/contratos/archivos/:contrato_codigo/:carpeta",
    validatorParamsQuery(schema.listarArchivos),
    controllers.listarArchivos,
  );

  // ── Param genérico al final para no colisionar con las rutas anteriores ────
  router.get(
    "/contratos/:convocatoria_id",
    validatorParamsQuery(schema.contratosPorConvocatoria),
    controllers.listarContratos,
  );

  return router;
}