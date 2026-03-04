import UsuariosService from "../../../../../../../services/usuarios.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const usuariosService = UsuariosService.getInstance();

export const crear = async (req, res) => {
  const { perfil, correo, usuario, contrasenia, nombre } = req.body;
  try {
    const result = await usuariosService.crear(
      perfil,
      correo,
      usuario,
      contrasenia,
      nombre,
    );
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message, { data: result.info });
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const listar = async (req, res) => {
  try {
    const result = await usuariosService.listar();
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message, { data: result.info });
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const editar = async (req, res) => {
  const { perfil, nombre, usuario } = req.body;
  try {
    const result = await usuariosService.editar(perfil, nombre, usuario);
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};

export const estado = async (req, res) => {
  const { estado, usuario } = req.body;
  try {
    const result = await usuariosService.estado(estado, usuario);
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, true, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};
