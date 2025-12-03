import SesionService from "../../../../../../../services/sesion.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = SesionService.getInstance();

export const cargarDatosSesiones = async (req, res) => {
  try {
    const { codsuperior } = req.params;

    if (!codsuperior) {
      return responseError(
        200,
        "Parametro codsuperior no proporcionado",
        400,
        res
      );
    }

    const result = await service.cargarDatosSesiones(codsuperior);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.messasge);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarArchivosVrSesiones = async (req, res) => {
  try {
    const { codcarpeta } = req.params;

    if (!codcarpeta) {
      return responseError(
        200,
        "Parametro codcarpeta no proporcionado",
        400,
        res
      );
    }

    const result = await service.cargarArchivosVrSesiones(codcarpeta);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarVersionSesionCod = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return responseError(200, "Parametro codigo no proporcionado", 400, res);
    }

    const result = await service.buscarVersionSesionCod(codigo);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPeriodosSesion = async (req, res) => {
  try {
    const { codsesion, tipo } = req.params;

    if (!codsesion || !tipo) {
      return responseError(
        200,
        "Parametro codsesion y tipo no proporcionado",
        400,
        res
      );
    }

    const result = await service.cargarPeriodosSesion(codsesion, tipo);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPeriodosxUCPxFecha = async (req, res) => {
  try {
    const { ucp, fechainicio, fechafin } = req.params;

    if (!ucp || !fechainicio || !fechafin) {
      return responseError(
        200,
        "Parametros ucp o fechas no proporcionadas",
        400,
        res
      );
    }

    const result = await service.cargarPeriodosxUCPxFecha(
      ucp,
      fechainicio,
      fechafin
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarSesion = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return responseError(200, "Parametro codigo", 400, res);
    }

    const result = await service.cargarSesion(codigo);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const verificarUltimaActualizacionPorUcp = async (req, res) => {
  try {
    const result = await service.verificarUltimaActualizacionPorUcp();

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.messasge);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
