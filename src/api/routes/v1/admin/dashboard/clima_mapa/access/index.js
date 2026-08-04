import ClimaMapaService from "../../../../../../../services/clima_mapa.service.js";
import { obtenerApiKeyOpenWeather } from "../../../../../../../services/clima_mapa_ingesta.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ClimaMapaService.getInstance();

export const listarPuntos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.listarPuntos(session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const crearPunto = async (req, res) => {
  try {
    const { session } = req.user;
    const { nombre, lat, lng, ucp, orden } = req.body;
    const result = await service.crearPunto(
      { nombre, lat, lng, ucp, orden },
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarPunto = async (req, res) => {
  try {
    const { session } = req.user;
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Parametro id no proporcionado", 400, res);
    }

    const { nombre, lat, lng, ucp, activo, orden } = req.body;
    const result = await service.actualizarPunto(
      { id, nombre, lat, lng, ucp, activo, orden },
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminarPunto = async (req, res) => {
  try {
    const { session } = req.user;
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Parametro id no proporcionado", 400, res);
    }

    const result = await service.eliminarPunto(id, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarHoraPorPunto = async (req, res) => {
  try {
    const { session } = req.user;
    const { id, fecha } = req.params;

    if (!id || !fecha) {
      return responseError(
        200,
        "Parametros id y fecha no proporcionados",
        400,
        res,
      );
    }

    const result = await service.cargarHoraPorPunto(id, fecha, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarDiaPorPunto = async (req, res) => {
  try {
    const { session } = req.user;
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Parametro id no proporcionado", 400, res);
    }

    const result = await service.cargarDiaPorPunto(id, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// Proxy de tiles de precipitación de OpenWeatherMap: la key nunca llega al
// frontend. Sin auth (montado bajo configuracionPublica) porque lo único
// que protege es la key/rate-limit de OWM, no datos de usuario, y las
// peticiones de tiles de Leaflet (<img>) no pueden llevar el header
// Authorization.
export const proxyTilePrecipitacion = async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const key = await obtenerApiKeyOpenWeather();
    const url = `https://tile.openweathermap.org/map/precipitation_new/${z}/${x}/${y}.png?appid=${key}`;
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=600");
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const ejecutarIngesta = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.ejecutarIngesta(session);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
