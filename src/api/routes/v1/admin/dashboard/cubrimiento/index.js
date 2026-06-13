// routes/cubrimiento.routes.js
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import { uploadContrato } from "../../../../../../middleware/uploadContrato.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // ── Pronóstico / modelos ──────────────────────────────────────────────────
  router.get(
    "/pronostico-demanda",
    validatorParamsQuery(schema.pronosticoDemanda),
    controllers.obtenerPronosticoDemanda,
  );
  router.get(
    "/modelos-disponibles/:user_id/:session_id",
    validatorParamsQuery(schema.modelosDisponibles),
    controllers.listarModelosDisponibles,
  );

  // ── Procesar cubrimiento ────────────────────────────────────────────────────
  router.post(
    "/procesar/:contrato_id/:perfil_id",
    validatorParamsQuery(schema.procesarParams),
    validator(schema.procesar),
    controllers.procesarCubrimiento,
  );
  router.post(
    "/procesar-todos/:anio/:perfil_id",
    validatorParamsQuery(schema.procesarTodosParams),
    validator(schema.procesarTodos),
    controllers.procesarCubrimientoTodos,
  );
  router.get("/anios-disponibles", controllers.listarAniosDisponibles);

  // ── Contratos ───────────────────────────────────────────────────────────────
  router.post(
    "/contratos/cargar",
    uploadContrato.single("archivo"),
    controllers.cargarContrato,
  );
  router.get(
    "/contratos/sic/:anio",
    validatorParamsQuery(schema.sicPorAnio),
    controllers.listarSicPorAnio,
  );
  router.get(
    "/contratos/detalle/:sic/:anio/:mes_inicial/:mes_final",
    validatorParamsQuery(schema.detalleContrato),
    controllers.obtenerDetalleContrato,
  );
  router.get(
    "/contratos/detalle-todos/:anio/:mes_inicial/:mes_final",
    validatorParamsQuery(schema.detalleContratoTodos),
    controllers.obtenerDetalleContratoTodos,
  );
  router.get(
    "/contratos/energia/:sic/:anio/:mes_inicial/:mes_final",
    validatorParamsQuery(schema.energiaContrato),
    controllers.obtenerEnergiaContrato,
  );

  // ── Porcentaje de cubrimiento ────────────────────────────────────────────────
  router.post(
    "/porcentaje-cubrimiento",
    validator(schema.guardarPorcentaje),
    controllers.guardarPorcentajeCubrimiento,
  );
  router.get(
    "/porcentaje-cubrimiento/:anio",
    validatorParamsQuery(schema.porcentajePorAnio),
    controllers.obtenerPorcentajeCubrimiento,
  );

  return router;
}