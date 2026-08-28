import DnaIdoConfigService from "../../../../../../../services/dna_ido_config.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = DnaIdoConfigService.getInstance();

// ── Empresas ────────────────────────────────────────────────────────────
export const crearEmpresa = async (req, res) => {
  try {
    const { nombre } = req.body;
    const { session } = req.user;
    const result = await service.crearEmpresa(session, { nombre });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtenerEmpresas = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.obtenerEmpresas(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.body;
    const { session } = req.user;
    const result = await service.eliminarEmpresa(session, { id });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ── Config ──────────────────────────────────────────────────────────────
export const crear = async (req, res) => {
  try {
    const { mc, empresa_id, municipios } = req.body;
    const { session } = req.user;
    const result = await service.crear(session, { mc, empresa_id, municipios });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtenerTodos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.obtenerTodos(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtenerPorMC = async (req, res) => {
  try {
    const { mc } = req.body;
    const { session } = req.user;
    const result = await service.obtenerPorMC(session, { mc });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizar = async (req, res) => {
  try {
    const { id, mc, empresa_id, municipios } = req.body;
    const { session } = req.user;
    const result = await service.actualizar(session, {
      id,
      mc,
      empresa_id,
      municipios,
    });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminar = async (req, res) => {
  try {
    const { id } = req.body;
    const { session } = req.user;
    const result = await service.eliminar(session, { id });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
