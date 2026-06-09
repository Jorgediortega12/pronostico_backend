import ValoracionService from "../../../../../../../services/valoracion.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ValoracionService.getInstance();

// Traduce un error del service a respuesta HTTP (respeta statusCode de negocio).
const handleError = (res, err, accion) => {
  Logger.error(`[${accion}] ${err.message}`);
  if (err.statusCode) {
    return responseError(200, err.message, err.statusCode, res);
  }
  return InternalError(res);
};

// ─── Ofertas ──────────────────────────────────────────────────────────────────

export const cargarOferta = async (req, res) => {
  try {
    const usuarioId = req.body?.usuario_id ? parseInt(req.body.usuario_id, 10) : null;
    const data = await service.procesarArchivoOferta(req.file, usuarioId);
    return SuccessResponse(res, data, "Archivo procesado correctamente");
  } catch (err) {
    return handleError(res, err, "cargarOferta");
  }
};

export const listarOfertas = async (req, res) => {
  try {
    const activas = req.query.activas === undefined ? true : req.query.activas !== "false";
    const data = await service.listarOfertas(activas);
    return SuccessResponse(res, data, "Ofertas obtenidas correctamente");
  } catch (err) {
    return handleError(res, err, "listarOfertas");
  }
};

export const obtenerDetalleOferta = async (req, res) => {
  try {
    const ofertaId = parseInt(req.params.oferta_id, 10);
    const data = await service.obtenerDetalleOferta(ofertaId);
    return SuccessResponse(res, data, "Detalle de oferta obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleOferta");
  }
};

// ─── Escenarios ─────────────────────────────────────────────────────────────────

export const crearEscenario = async (req, res) => {
  try {
    const data = await service.crearEscenario(req.body);
    return SuccessResponse(res, data, "Escenario creado correctamente");
  } catch (err) {
    return handleError(res, err, "crearEscenario");
  }
};

export const listarEscenarios = async (req, res) => {
  try {
    const ofertaId = req.query.oferta_id ? parseInt(req.query.oferta_id, 10) : null;
    const data = await service.listarEscenariosSimplificado(ofertaId);
    return SuccessResponse(res, data, "Escenarios obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarEscenarios");
  }
};

export const obtenerEscenario = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.obtenerEscenario(escenarioId);
    return SuccessResponse(res, data, "Escenario obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerEscenario");
  }
};

export const eliminarEscenario = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.eliminarEscenario(escenarioId);
    return SuccessResponse(res, data, "Escenario eliminado correctamente");
  } catch (err) {
    return handleError(res, err, "eliminarEscenario");
  }
};

export const obtenerResumenEscenario = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.obtenerResumenEscenario(escenarioId);
    return SuccessResponse(res, data, "Resumen obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerResumenEscenario");
  }
};

// ─── Optimización ───────────────────────────────────────────────────────────────

export const ejecutarOptimizacion = async (req, res) => {
  try {
    const escenarioId = parseInt(req.body.escenario_id, 10);
    const tipo = req.body.tipo_optimizacion || "completa";
    // Se lanza en background; el progreso se consulta vía /optimizar/estado/:escenario_id.
    const data = await service.iniciarOptimizacion(escenarioId, tipo);
    return res.status(202).json({
      success: true,
      message: "Optimización iniciada. Consulte el estado en /optimizar/estado/:escenario_id",
      data,
    });
  } catch (err) {
    return handleError(res, err, "ejecutarOptimizacion");
  }
};

export const verificarEstadoOptimizacion = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.verificarEstadoOptimizacion(escenarioId);
    return SuccessResponse(res, data, "Estado obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "verificarEstadoOptimizacion");
  }
};

// ─── Resultados ─────────────────────────────────────────────────────────────────

export const obtenerResultadosEscenario = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.obtenerResultadosEscenario(escenarioId);
    return SuccessResponse(res, data, "Resultados obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerResultadosEscenario");
  }
};

export const obtenerDetalleContratos = async (req, res) => {
  try {
    const resultadoId = parseInt(req.params.resultado_id, 10);
    const data = await service.obtenerDetalleContratosPorPeriodo(resultadoId);
    return SuccessResponse(res, data, "Detalle de contratos obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleContratos");
  }
};

export const obtenerAnalisisDetallado = async (req, res) => {
  try {
    const resultadoId = parseInt(req.params.resultado_id, 10);
    const data = await service.obtenerAnalisisDetallado(resultadoId);
    return SuccessResponse(res, data, "Análisis detallado obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerAnalisisDetallado");
  }
};

export const obtenerDetalleResultado = async (req, res) => {
  try {
    const resultadoId = parseInt(req.params.resultado_id, 10);
    const data = await service.obtenerDetallesResultado(resultadoId);
    return SuccessResponse(res, data, "Detalle de resultado obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleResultado");
  }
};

// ─── Comparación / IPP ────────────────────────────────────────────────────────────

export const compararEscenarios = async (req, res) => {
  try {
    const data = await service.compararEscenarios(req.body.escenario_ids);
    return SuccessResponse(res, data, "Comparación realizada correctamente");
  } catch (err) {
    return handleError(res, err, "compararEscenarios");
  }
};

export const actualizarIpp = async (req, res) => {
  try {
    const { escenario_id, nuevo_ipp } = req.body;
    const data = await service.actualizarIpp(escenario_id, nuevo_ipp);
    return SuccessResponse(res, data, "IPP actualizado correctamente");
  } catch (err) {
    return handleError(res, err, "actualizarIpp");
  }
};

export const guardarConfiguracionIpp = async (req, res) => {
  try {
    const data = await service.guardarConfiguracionIpp(req.body);
    return SuccessResponse(res, data, "Configuración IPP guardada correctamente");
  } catch (err) {
    return handleError(res, err, "guardarConfiguracionIpp");
  }
};

export const listarConfiguracionesIpp = async (req, res) => {
  try {
    const data = await service.listarConfiguracionesIpp();
    return SuccessResponse(res, data, "Configuraciones IPP obtenidas correctamente");
  } catch (err) {
    return handleError(res, err, "listarConfiguracionesIpp");
  }
};

// ─── Gráficas ───────────────────────────────────────────────────────────────────

export const obtenerGraficaCobertura = async (req, res) => {
  try {
    const escenarioId = parseInt(req.params.escenario_id, 10);
    const data = await service.obtenerGraficaCobertura(escenarioId);
    return SuccessResponse(res, data, "Gráfica obtenida correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerGraficaCobertura");
  }
};

export const obtenerGraficaPareto = async (req, res) => {
  try {
    const data = await service.obtenerGraficaPareto(req.query.escenario_ids);
    return SuccessResponse(res, data, "Gráfica obtenida correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerGraficaPareto");
  }
};

// ─── Exportación ──────────────────────────────────────────────────────────────────

export const exportarExcel = async (req, res) => {
  try {
    const buffer = await service.exportarResultados(req.body.escenario_ids, "excel");
    const filename = `valoracion_ofertas_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  } catch (err) {
    return handleError(res, err, "exportarExcel");
  }
};

export const exportarJson = async (req, res) => {
  try {
    const data = await service.exportarResultados(req.body.escenario_ids, "json");
    return SuccessResponse(res, data, "Exportación JSON generada correctamente");
  } catch (err) {
    return handleError(res, err, "exportarJson");
  }
};