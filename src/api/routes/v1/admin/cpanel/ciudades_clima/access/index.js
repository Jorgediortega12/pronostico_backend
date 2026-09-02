import ConfigCiudadesClimaService from "../../../../../../../services/config_ciudades_clima.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConfigCiudadesClimaService.getInstance();

// Administración del catálogo suelto de ciudades de clima
// (catalogo_ciudades_clima) — vive bajo cpanel (no dashboard) porque no
// depende de una sesión de BD de mercado: el superadmin no tiene una, y
// dashboard exige sessionDecrypt para todas sus rutas.
export const listarCatalogo = async (req, res) => {
  try {
    const result = await service.listarCatalogoCompleto();
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.actualizarCatalogoCiudad(id, req.body);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
