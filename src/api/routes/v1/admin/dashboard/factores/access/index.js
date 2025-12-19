import FactoresService from "../../../../../../../services/factores.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = FactoresService.getInstance();

export const guardarBarra = async (req, res) => {
  try {
    const result = await service.guardarBarra(req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const consultarBarrasIndex_xMC = async (req, res) => {
  try {
    //tomamos el parametro
    const { mc } = req.params;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!mc) {
      return responseError(200, "Parametro mc no proporcionado", 400, res);
    }

    const result = await service.consultarBarrasIndex_xMC(mc);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarBarra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.actualizarBarra(id, req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const guardarAgrupacion = async (req, res) => {
  try {
    const result = await service.insertarAgrupacion(req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const consultarAgrupacionesIndex_xBarraId = async (req, res) => {
  try {
    //tomamos el parametro
    const { barra_id } = req.params;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!barra_id) {
      return responseError(
        200,
        "Parametro barra_id no proporcionado",
        400,
        res
      );
    }

    const result = await service.consultarAgrupacionesIndex_xBarraId(barra_id);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarAgrupacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.actualizarAgrupacion(id, req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const eliminarBarra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.eliminarBarraConAgrupaciones(id);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const eliminarAgrupacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.eliminarAgrupacion(id);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};
