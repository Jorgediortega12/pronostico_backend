import CubrimientoService from "../../../../../../../services/cubrimiento.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = CubrimientoService.getInstance();

// Traduce un error del service a respuesta HTTP (respeta statusCode de negocio).
const handleError = (res, err, accion) => {
  Logger.error(`[${accion}] ${err.message}`);
  if (err.statusCode) {
    return responseError(200, err.message, err.statusCode, res);
  }
  return InternalError(res);
};

// ─── Pronóstico / modelos ──────────────────────────────────────────────────────

export const obtenerPronosticoDemanda = async (req, res) => {
  try {
    const modelId = parseInt(req.query.model_id, 10);
    const data = await service.obtenerPronosticoDemanda(modelId);
    return SuccessResponse(res, data, "Pronóstico obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerPronosticoDemanda");
  }
};

export const listarModelosDisponibles = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10);
    const sessionId = parseInt(req.params.session_id, 10);
    const data = await service.listarModelosDisponibles(userId, sessionId);
    return SuccessResponse(res, data, "Modelos disponibles obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarModelosDisponibles");
  }
};

// ─── Procesar cubrimiento ──────────────────────────────────────────────────────

export const procesarCubrimiento = async (req, res) => {
  try {
    const contratoId = parseInt(req.params.contrato_id, 10);
    const perfilId = parseInt(req.params.perfil_id, 10);
    const data = await service.procesarCubrimiento(contratoId, perfilId, req.body);
    return SuccessResponse(res, data, "Cubrimiento procesado correctamente");
  } catch (err) {
    return handleError(res, err, "procesarCubrimiento");
  }
};

export const procesarCubrimientoTodos = async (req, res) => {
  try {
    const anio = parseInt(req.params.anio, 10);
    const perfilId = parseInt(req.params.perfil_id, 10);
    const data = await service.procesarCubrimientoTodos(anio, perfilId, req.body);
    return SuccessResponse(res, data, "Cubrimiento agregado procesado correctamente");
  } catch (err) {
    return handleError(res, err, "procesarCubrimientoTodos");
  }
};

export const listarAniosDisponibles = async (req, res) => {
  // Los contratos se cargan dinámicamente por el usuario (igual que el origen).
  return SuccessResponse(res, [], "Años disponibles obtenidos correctamente");
};

// ─── Contratos ──────────────────────────────────────────────────────────────────

export const cargarContrato = async (req, res) => {
  try {
    const contratos = await service.procesarArchivoContrato(req.file);
    return SuccessResponse(
      res,
      { contratos },
      "Archivo procesado correctamente"
    );
  } catch (err) {
    return handleError(res, err, "cargarContrato");
  }
};

export const listarSicPorAnio = async (req, res) => {
  try {
    const anio = parseInt(req.params.anio, 10);
    const data = await service.obtenerContratosPorAnio(anio);
    return SuccessResponse(res, data, "Contratos obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarSicPorAnio");
  }
};

export const obtenerDetalleContrato = async (req, res) => {
  try {
    const { sic } = req.params;
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerDetalleContrato(sic, anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Detalle de contrato obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleContrato");
  }
};

export const obtenerDetalleContratoTodos = async (req, res) => {
  try {
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerDetalleContratoTodos(anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Detalle agregado obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleContratoTodos");
  }
};

export const obtenerEnergiaContrato = async (req, res) => {
  try {
    const { sic } = req.params;
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerEnergiaContrato(sic, anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Energía de contrato obtenida correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerEnergiaContrato");
  }
};

// ─── Porcentaje de cubrimiento ──────────────────────────────────────────────────

export const guardarPorcentajeCubrimiento = async (req, res) => {
  try {
    const data = await service.guardarPorcentajeCubrimiento(req.body);
    return SuccessResponse(res, data, "Porcentaje de cubrimiento guardado exitosamente");
  } catch (err) {
    return handleError(res, err, "guardarPorcentajeCubrimiento");
  }
};

export const obtenerPorcentajeCubrimiento = async (req, res) => {
  try {
    const anio = parseInt(req.params.anio, 10);
    const data = await service.obtenerPorcentajeCubrimiento(anio);
    return SuccessResponse(res, data, "Porcentaje de cubrimiento obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerPorcentajeCubrimiento");
  }
};