import ConvocatoriaService from "../../../../../../../services/convocatoria.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConvocatoriaService.getInstance();

const handleError = (res, err, accion) => {
  Logger.error(`[${accion}] ${err.message}`);
  if (err.statusCode) {
    return responseError(200, err.message, err.statusCode, res);
  }
  return InternalError(res);
};

// ─── Convocatorias ──────────────────────────────────────────────────────────────

export const listarConvocatorias = async (req, res) => {
  try {
    const convocatorias = await service.getConvocatorias();
    return SuccessResponse(res, { convocatorias }, "Convocatorias obtenidas correctamente");
  } catch (err) {
    return handleError(res, err, "listarConvocatorias");
  }
};

export const crearConvocatoria = async (req, res) => {
  try {
    const convocatoria = await service.crearConvocatoria(req.body);
    return SuccessResponse(res, { convocatoria }, "Convocatoria creada correctamente");
  } catch (err) {
    return handleError(res, err, "crearConvocatoria");
  }
};

// ─── Contratos ────────────────────────────────────────────────────────────────

export const listarContratos = async (req, res) => {
  try {
    const convocatoriaId = parseInt(req.params.convocatoria_id, 10);
    const contratos = await service.getContratos(convocatoriaId);
    return SuccessResponse(res, { contratos }, "Contratos obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarContratos");
  }
};

export const crearContrato = async (req, res) => {
  try {
    const contrato = await service.crearContrato(req.body);
    return SuccessResponse(res, { contrato }, "Contrato creado correctamente");
  } catch (err) {
    return handleError(res, err, "crearContrato");
  }
};

export const actualizarAgente = async (req, res) => {
  try {
    const agente = await service.actualizarAgente(req.body);
    return SuccessResponse(res, { agente }, "Agente actualizado correctamente");
  } catch (err) {
    return handleError(res, err, "actualizarAgente");
  }
};

export const obtenerAgente = async (req, res) => {
  try {
    const contratoCodigo = parseInt(req.params.contrato_codigo, 10);
    const agente = await service.getAgente(contratoCodigo);
    return SuccessResponse(res, { agente }, "Agente obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerAgente");
  }
};

export const obtenerContrato = async (req, res) => {
  try {
    const codigo = parseInt(req.params.codigo, 10);
    const contrato = await service.getContrato(codigo);
    return SuccessResponse(res, { contrato }, "Contrato obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerContrato");
  }
};

// ─── Archivos ─────────────────────────────────────────────────────────────────

export const listarArchivos = async (req, res) => {
  try {
    const contratoCodigo = parseInt(req.params.contrato_codigo, 10);
    const { carpeta } = req.params;
    const archivos = await service.listarArchivos(contratoCodigo, carpeta);
    return SuccessResponse(res, { archivos }, "Archivos obtenidos correctamente");
  } catch (err) {
    return handleError(res, err, "listarArchivos");
  }
};

export const descargarArchivo = async (req, res) => {
  try {
    const { carpeta } = req.params;
    const id = parseInt(req.params.id, 10);
    const { ruta, nombre } = await service.descargarArchivo(carpeta, id);
    return res.download(ruta, nombre);
  } catch (err) {
    return handleError(res, err, "descargarArchivo");
  }
};

export const subirArchivo = async (req, res) => {
  try {
    const registro = await service.subirArchivo(req.body, req.file);
    return SuccessResponse(res, { registro }, "Archivo subido correctamente");
  } catch (err) {
    return handleError(res, err, "subirArchivo");
  }
};

export const actualizarArchivo = async (req, res) => {
  try {
    const archivo = await service.actualizarArchivo(req.body, req.file);
    return SuccessResponse(res, { archivo }, "Archivo actualizado correctamente");
  } catch (err) {
    return handleError(res, err, "actualizarArchivo");
  }
};