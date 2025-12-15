import ActualizacionService from "../../../services/actualizacion.service.js";
import {
  SuccessResponse,
  responseError,
  InternalError,
} from "../../../helpers/api.response.js";

const service = ActualizacionService.getInstance();

export const obtenerEstadoActualizacion = async (req, res) => {
  try {
    const { ucp } = req.params;
    const result = await service.obtenerEstadoActualizacion(ucp);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, "Estado obtenido");
  } catch {
    return InternalError(res);
  }
};

export const ejecutarActualizacionClima = async (_, res) => {
  try {
    const result = await service.ejecutarActualizacionClima();
    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }
    return SuccessResponse(res, null, result.message);
  } catch {
    return InternalError(res);
  }
};

export const ejecutarActualizacionHistorica = async (req, res) => {
  try {
    const { ucp, fechainicio, fechafin } = req.body;
    const result = await service.ejecutarActualizacionHistorica(
      ucp,
      fechainicio,
      fechafin
    );

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch {
    return InternalError(res);
  }
};
