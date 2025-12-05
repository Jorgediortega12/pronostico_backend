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

export const cargarPeriodosxUCPxUnaFechaxLimite = async (req, res) => {
  try {
    const { ucp, fechaInicio, limite } = req.params;

    if (!ucp || !fechaInicio || !limite) {
      return responseError(
        200,
        "Parametros de ucp, fechaInicio o limite no proporcionados",
        400,
        res
      );
    }

    const result = await service.cargarPeriodosxUCPxUnaFechaxLimite(
      ucp,
      fechaInicio,
      limite
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

export const cargarTodosLosDiasPotencia = async (req, res) => {
  try {
    const result = await service.cargarTodosLosDiasPotencia();

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarDiaPotencia = async (req, res) => {
  try {
    // asumo que envías los datos en req.body
    const {
      codigo,
      dia,
      potencia1,
      potencia2,
      potencia3,
      potencia4,
      potencia5,
      potencia6,
      potencia7,
      ucp,
    } = req.body;

    const result = await service.actualizarDiaPotencia({
      codigo,
      dia,
      potencia1,
      potencia2,
      potencia3,
      potencia4,
      potencia5,
      potencia6,
      potencia7,
      ucp,
    });

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const crearDiaPotencia = async (req, res) => {
  try {
    // Asumimos que el body ya pasó por validación Joi
    const {
      dia,
      potencia1,
      potencia2,
      potencia3,
      potencia4,
      potencia5,
      potencia6,
      potencia7,
      ucp,
    } = req.body;

    const payload = {
      dia: Number(dia),
      potencia1: Number(potencia1),
      potencia2: Number(potencia2),
      potencia3: Number(potencia3),
      potencia4: Number(potencia4),
      potencia5: Number(potencia5),
      potencia6: Number(potencia6),
      potencia7: Number(potencia7),
      ucp,
    };

    const result = await service.crearDiaPotencia(payload);

    if (!result.success) {
      return responseError(200, result.message, 400, res);
    }

    // devolver el objeto creado
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
// AGREGAR FUENTES
export const agregarUCPMedida = async (req, res) => {
  try {
    // Obtener campos del body (asumimos middleware Joi los validó)
    const {
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    } = req.body;

    const payload = {
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    };

    const result = await service.agregarUCPMedida(payload);

    if (!result.success) {
      // 400 bad request semántico, mantengo tu patrón de responseError (ajusta códigos si lo deseas)
      return responseError(200, result.message, 400, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
// CARGAR FUENTES
export const cargarFuentes = async (req, res) => {
  try {
    const result = await service.cargarFuentes();
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }
    // Devuelve array en data
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarUCPMedida = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    } = req.body;

    const payload = {
      codigo,
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    };

    const result = await service.actualizarUCPMedida(payload);

    if (!result.success) {
      return responseError(200, result.message, 400, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminarUCPMedida = async (req, res) => {
  try {
    const { codigo } = req.params;
    const codeNum = Number(codigo);
    if (Number.isNaN(codeNum)) {
      return responseError(200, "Código inválido", 400, res);
    }

    const result = await service.eliminarUCPMedida(codeNum);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarEquivalencias = async (req, res) => {
  try {
    const result = await service.cargarEquivalencias();
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarUCP = async (req, res) => {
  try {
    const { codpadre = 0, estado = 1 } = req.query;
    const result = await service.cargarUCP(Number(codpadre), Number(estado));
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error cargarUCP controller"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const editarMercadoCascade = async (req, res) => {
  try {
    const { mc, mcnuevo } = req.body;
    const result = await service.editarMercadoCascade(mc, mcnuevo);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error editarMercadoCascade controller"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
