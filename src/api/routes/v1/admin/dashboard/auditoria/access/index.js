import AuditoriaService from "../../../../../../../services/auditoria.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = AuditoriaService.getInstance();

export const registrar = async (req, res) => {
  try {
    const { session } = req.user;
    const { usuario, modulo, accion, status } = req.body;
    const result = await service.registrar(session, { usuario, modulo, accion, status });
    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result.data, "Registro de auditoría guardado");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listar = async (req, res) => {
  try {
    const { session } = req.user;
    const { fecha_inicio, fecha_fin, usuario, modulo, page, limit } = req.query;
    const result = await service.listar(session, {
      fechaInicio: fecha_inicio || null,
      fechaFin: fecha_fin || null,
      usuario: usuario || null,
      modulo: modulo || null,
      page,
      limit,
    });
    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result, "Registros obtenidos correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
