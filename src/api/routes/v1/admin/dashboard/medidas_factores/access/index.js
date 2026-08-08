import MedidasFactoresService from "../../../../../../../services/medidas_factores.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = MedidasFactoresService.getInstance();

export const listar = async (req, res) => {
  try {
    const { session } = req.user;
    const {
      mc,
      barraId,
      codigoRpm,
      flujo,
      fechaInicio,
      fechaFin,
      page,
      limit,
      sortBy,
      sortDir,
    } = req.query;

    const result = await service.listar(session, {
      mc,
      barraId: barraId ? Number(barraId) : null,
      codigoRpm: codigoRpm || null,
      flujo: flujo || null,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      page,
      limit,
      sortBy: sortBy || null,
      sortDir: sortDir || null,
    });

    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result, "Medidas obtenidas correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

const leerFiltrosInversion = (query) => {
  const { mc, fechaInicio, fechaFin, barraId, codigoRpm, flujo } = query;
  return {
    mc,
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    barraId: barraId ? Number(barraId) : null,
    codigoRpm: codigoRpm || null,
    flujo: flujo || null,
  };
};

// Vista previa (GET, no modifica nada): cuántas filas/fechas con algún
// periodo negativo hay en el rango — se muestra antes de confirmar.
export const contarSignoNegativo = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.contarSignoNegativo(
      session,
      leerFiltrosInversion(req.query),
    );
    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result.data, "Conteo obtenido correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// Aplica la inversión de signo — requiere confirmación explícita desde el
// frontend (se llama sólo después de que el usuario ve el conteo y confirma).
export const invertirSignoNegativo = async (req, res) => {
  try {
    const { session } = req.user;
    const { mc, fechaInicio, fechaFin, barraId, codigoRpm, flujo } = req.body;
    const result = await service.invertirSignoNegativo(session, {
      mc,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      barraId: barraId ? Number(barraId) : null,
      codigoRpm: codigoRpm || null,
      flujo: flujo || null,
    });
    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result.data, "Signo invertido correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
