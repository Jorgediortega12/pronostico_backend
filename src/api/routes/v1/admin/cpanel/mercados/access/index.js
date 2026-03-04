import MercadosService from "../../../../../../../services/mercados.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const mercadosService = MercadosService.getInstance();

export const listar = async (req, res) => {
  try {
    const result = await mercadosService.listar();
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const crear = async (req, res) => {
  const { nombre, nit, correo } = req.body;
  try {
    const result = await mercadosService.crear(
      nombre,

      nit,

      correo,
    );
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message, { data: result.info });
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const editar = async (req, res) => {
  const { uuid, nombre, nit, correo } = req.body;
  try {
    const result = await mercadosService.editar(uuid, nombre, nit, correo);
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message, { data: result.info });
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const buscar = async (req, res) => {
  const { uuid } = req.body;
  try {
    const result = await mercadosService.buscar(uuid);
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const listarM = async (req, res) => {
  try {
    const result = await mercadosService.listarM();
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

//crear acceso a base de datos para el mercado
export const accesosBD = async (req, res) => {
  const { uuid, proyecto, basededatos, host, usuario, contrasenia, puerto } =
    req.body;
  try {
    const result = await mercadosService.accesosBD(
      uuid,
      proyecto,
      basededatos,
      host,
      usuario,
      contrasenia,
      puerto,
    );
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message, { data: result.info });
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};
