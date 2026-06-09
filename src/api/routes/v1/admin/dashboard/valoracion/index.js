// routes/valoracion.routes.js
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import { uploadValoracion } from "../../../../../../middleware/uploadValoracion.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // ── Ofertas ──────────────────────────────────────────────────────────────────
  router.post("/ofertas/cargar", uploadValoracion.single("archivo"), controllers.cargarOferta);
  router.get("/ofertas", validatorParamsQuery(schema.listarOfertas), controllers.listarOfertas);
  router.get(
    "/ofertas/:oferta_id",
    validatorParamsQuery(schema.ofertaId),
    controllers.obtenerDetalleOferta,
  );

  // ── Escenarios ────────────────────────────────────────────────────────────────
  router.post("/escenarios", validator(schema.crearEscenario), controllers.crearEscenario);
  router.get("/escenarios", validatorParamsQuery(schema.listarEscenarios), controllers.listarEscenarios);
  router.get(
    "/escenarios/:escenario_id",
    validatorParamsQuery(schema.escenarioId),
    controllers.obtenerEscenario,
  );
  router.delete(
    "/escenarios/:escenario_id",
    validatorParamsQuery(schema.escenarioId),
    controllers.eliminarEscenario,
  );
  router.get(
    "/escenarios/:escenario_id/resumen",
    validatorParamsQuery(schema.escenarioId),
    controllers.obtenerResumenEscenario,
  );

  // ── Optimización ────────────────────────────────────────────────────────────────
  router.post("/optimizar", validator(schema.ejecutarOptimizacion), controllers.ejecutarOptimizacion);
  router.get(
    "/optimizar/estado/:escenario_id",
    validatorParamsQuery(schema.escenarioId),
    controllers.verificarEstadoOptimizacion,
  );

  // ── Resultados ────────────────────────────────────────────────────────────────────
  router.get(
    "/resultados/detalle-contratos/:resultado_id",
    validatorParamsQuery(schema.resultadoId),
    controllers.obtenerDetalleContratos,
  );
  router.get(
    "/resultados/analisis-detallado/:resultado_id",
    validatorParamsQuery(schema.resultadoId),
    controllers.obtenerAnalisisDetallado,
  );
  router.get(
    "/resultados/detalle/:resultado_id",
    validatorParamsQuery(schema.resultadoId),
    controllers.obtenerDetalleResultado,
  );
  router.get(
    "/resultados/:escenario_id",
    validatorParamsQuery(schema.escenarioId),
    controllers.obtenerResultadosEscenario,
  );

  // ── Comparación / IPP ──────────────────────────────────────────────────────────────
  router.post("/comparar", validator(schema.comparar), controllers.compararEscenarios);
  router.put("/ipp/actualizar", validator(schema.actualizarIpp), controllers.actualizarIpp);
  router.post("/ipp/configuracion", validator(schema.configuracionIpp), controllers.guardarConfiguracionIpp);
  router.get("/ipp/configuracion", controllers.listarConfiguracionesIpp);

  // ── Gráficas ───────────────────────────────────────────────────────────────────────
  router.get(
    "/graficas/comparacion/pareto",
    validatorParamsQuery(schema.graficaPareto),
    controllers.obtenerGraficaPareto,
  );
  router.get(
    "/graficas/:escenario_id/cobertura",
    validatorParamsQuery(schema.escenarioId),
    controllers.obtenerGraficaCobertura,
  );

  // ── Exportación ─────────────────────────────────────────────────────────────────────
  router.post("/exportar/excel", validator(schema.exportar), controllers.exportarExcel);
  router.post("/exportar/json", validator(schema.exportar), controllers.exportarJson);

  return router;
}