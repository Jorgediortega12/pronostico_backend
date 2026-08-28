import * as circuitosGeoService from "../../../../../../../services/circuitos_geo.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

export const cargar = async (req, res) => {
  try {
    const { departamento } = req.body;
    const archivo = req.file;
    if (!archivo) {
      return responseError(200, "Debe adjuntar el archivo KMZ/KML.", 400, res);
    }

    const result = await circuitosGeoService.cargarCircuitosDepartamento(
      departamento,
      archivo.path,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Circuitos cargados correctamente.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtener = async (req, res) => {
  try {
    const { departamento } = req.params;
    const result = await circuitosGeoService.obtenerCircuitosDepartamento(departamento);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Consulta completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listarDepartamentos = async (req, res) => {
  try {
    const result = await circuitosGeoService.listarDepartamentosCargados();
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Consulta completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
