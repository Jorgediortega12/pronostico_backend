import ConfiguracionService from '../../../../../../../services/configuracion.service.js';
import Logger from '../../../../../../../helpers/logger.js';
import {
    SuccessResponse,
    InternalError,
    responseError,
} from '../../../../../../../helpers/api.response.js';

const service = ConfiguracionService.getInstance();

export const buscarSaveDocumento = async (req, res) => {
    try {

        //tomamos el parametro
        const { aux3 } = req.params;

        //sino teneemos el parametro lo que lanzamos es un errro
        if (!aux3) {
            return responseError(200, 'Parametro aux3 no proporcionado', 400, res);
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
            return responseError(200, 'Parametro ucp no proporcionado', 400, res);
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
}

export const buscarVersionSesion = async (req, res) => {
    try {
        const { nombre } = req.params;

        if (!nombre) {
            return responseError(200, 'Parametro nombre no proporcionado', 400, res);
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
}

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
}

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
}