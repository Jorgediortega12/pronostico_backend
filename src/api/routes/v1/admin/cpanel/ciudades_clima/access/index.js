import ConfigCiudadesClimaService from "../../../../../../../services/config_ciudades_clima.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConfigCiudadesClimaService.getInstance();

// Administración de TODAS las ciudades de clima (sueltas en
// catalogo_ciudades_clima + ya atadas a un mercado en
// config_ciudades_clima) — vive bajo cpanel (no dashboard) porque no
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
    const { id, origen } = req.params;
    if (!["catalogo", "mercado"].includes(origen)) {
      return responseError(200, "Origen de la ciudad inválido", 400, res);
    }
    const result = await service.actualizarCatalogoCiudad(
      origen,
      id,
      req.body,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
