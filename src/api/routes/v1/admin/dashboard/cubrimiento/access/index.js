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
    const { session } = req.user;
    const modelId = parseInt(req.query.model_id, 10);
    const data = await service.obtenerPronosticoDemanda(session, modelId);
    return SuccessResponse(res, data, "Pronóstico obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerPronosticoDemanda");
  }
};

export const listarModelosDisponibles = async (req, res) => {
  try {
    const { session, userId: tokenUserId } = req.user;
    const userId = tokenUserId ?? parseInt(req.params.user_id, 10);
    const data = await service.listarModelosDisponibles(session, userId);
    return SuccessResponse(res, data, "Modelos disponibles obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarModelosDisponibles");
  }
};

// ─── Procesar cubrimiento ──────────────────────────────────────────────────────

export const procesarCubrimiento = async (req, res) => {
  try {
    const { session } = req.user;
    const contratoId = parseInt(req.params.contrato_id, 10);
    const perfilId = parseInt(req.params.perfil_id, 10);
    const data = await service.procesarCubrimiento(session, contratoId, perfilId, req.body);
    return SuccessResponse(res, data, "Cubrimiento procesado correctamente");
  } catch (err) {
    return handleError(res, err, "procesarCubrimiento");
  }
};

export const procesarCubrimientoTodos = async (req, res) => {
  try {
    const { session } = req.user;
    const anio = parseInt(req.params.anio, 10);
    const perfilId = parseInt(req.params.perfil_id, 10);
    const data = await service.procesarCubrimientoTodos(session, anio, perfilId, req.body);
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
    const { session } = req.user;
    const contratos = await service.procesarArchivoContrato(session, req.file);
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
    const { session } = req.user;
    const anio = parseInt(req.params.anio, 10);
    const data = await service.obtenerContratosPorAnio(session, anio);
    return SuccessResponse(res, data, "Contratos obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarSicPorAnio");
  }
};

export const obtenerDetalleContrato = async (req, res) => {
  try {
    const { session } = req.user;
    const { sic } = req.params;
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerDetalleContrato(session, sic, anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Detalle de contrato obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleContrato");
  }
};

export const obtenerDetalleContratoTodos = async (req, res) => {
  try {
    const { session } = req.user;
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerDetalleContratoTodos(session, anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Detalle agregado obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalleContratoTodos");
  }
};

export const obtenerEnergiaContrato = async (req, res) => {
  try {
    const { session } = req.user;
    const { sic } = req.params;
    const anio = parseInt(req.params.anio, 10);
    const mesInicial = parseInt(req.params.mes_inicial, 10);
    const mesFinal = parseInt(req.params.mes_final, 10);
    const data = await service.obtenerEnergiaContrato(session, sic, anio, mesInicial, mesFinal);
    return SuccessResponse(res, data, "Energía de contrato obtenida correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerEnergiaContrato");
  }
};

// ─── Porcentaje de cubrimiento ──────────────────────────────────────────────────

export const guardarPorcentajeCubrimiento = async (req, res) => {
  try {
    const { session } = req.user;
    const data = await service.guardarPorcentajeCubrimiento(session, req.body);
    return SuccessResponse(res, data, "Porcentaje de cubrimiento guardado exitosamente");
  } catch (err) {
    return handleError(res, err, "guardarPorcentajeCubrimiento");
  }
};

export const obtenerPorcentajeCubrimiento = async (req, res) => {
  try {
    const { session } = req.user;
    const anio = parseInt(req.params.anio, 10);
    const data = await service.obtenerPorcentajeCubrimiento(session, anio);
    return SuccessResponse(res, data, "Porcentaje de cubrimiento obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerPorcentajeCubrimiento");
  }
};

export const guardarVersion = async (req, res) => {
  try {
    const { session, userId } = req.user;
    if (userId == null) {
      return responseError(
        200,
        "Sesión sin identificador de usuario. Vuelva a iniciar sesión.",
        401,
        res,
      );
    }
    const result = await service.guardarVersion(session, {
      ...req.body,
      user_id: userId,
    });
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    return handleError(res, err, "guardarVersion");
  }
};

export const listarVersiones = async (req, res) => {
  try {
    const { session, userId } = req.user;
    const data = await service.listVersions(session, userId);
    return SuccessResponse(res, data, "Versiones obtenidas correctamente");
  } catch (err) {
    return handleError(res, err, "listarVersiones");
  }
};

export const cargarVersion = async (req, res) => {
  try {
    const { session } = req.user;
    const versionId = parseInt(req.params.version_id, 10);
    const data = await service.loadVersion(session, versionId);
    return SuccessResponse(res, data, "Versión cargada correctamente");
  } catch (err) {
    return handleError(res, err, "cargarVersion");
  }
};