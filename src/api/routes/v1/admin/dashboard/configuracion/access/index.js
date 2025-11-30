import ConfiguracionService from "../../../../../../../services/configuracion.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConfiguracionService.getInstance();

export const buscarSaveDocumento = async (req, res) => {
  try {
    //tomamos el parametro
    const { aux3 } = req.params;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!aux3) {
      return responseError(200, "Parametro aux3 no proporcionado", 400, res);
    }

    const result = await service.buscarSaveDocumento(aux3);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarDiasPotencia = async (req, res) => {
  try {
    const { ucp } = req.params;

    if (!ucp) {
      return responseError(200, "Parametro ucp no proporcionado", 400, res);
    }
    const result = await service.cargarDiasPotencia(ucp);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarVersionSesion = async (req, res) => {
  try {
    const { nombre } = req.params;

    if (!nombre) {
      return responseError(200, "Parametro nombre no proporcionado", 400, res);
    }

    const result = await service.buscarVersionSesion(nombre);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarVersionSesion = async (req, res) => {
  try {
    const result = await service.agregarVersionSesion(req.body);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarDatosPronosticoxSesion = async (req, res) => {
  try {
    const result = await service.agregarDatosPronosticoxSesion();
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarDiaFestivo = async (req, res) => {
  try {
    //tomamos el parametro
    const { fecha, ucp } = req.params;

    if (!fecha || !ucp) {
      return responseError(
        200,
        "Parametro fecha o ucp no proporcionado",
        400,
        res
      );
    }

    const result = await service.buscarDiaFestivo(fecha, ucp);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarPotenciaDia = async (req, res) => {
  try {
    const { ucp, dia } = req.params;

    if (!ucp || !dia) {
      return responseError(
        200,
        "Parametros de ucp y dia no proporcionados",
        400,
        res
      );
    }

    const result = await service.buscarPotenciaDia(ucp, dia);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPeriodosxUCPDesdeFecha = async (req, res) => {
  try {
    const { ucp, fechaInicio } = req.params;

    if (!ucp || !fechaInicio) {
      return responseError(
        200,
        "Parametros de ucp y fechaInicio no proporcionados",
        400,
        res
      );
    }

    const result = await service.cargarPeriodosxUCPDesdeFecha(ucp, fechaInicio);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarVariablesClimaticasxUCPDesdeFecha = async (req, res) => {
  try {
    const { ucp, fechaInicio } = req.params;

    if (!ucp || !fechaInicio) {
      return responseError(
        200,
        "Parametros de ucp y fechaInicio no proporcionados",
        400,
        res
      );
    }

    const result = await service.cargarVariablesClimaticasxUCPDesdeFecha(
      ucp,
      fechaInicio
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
