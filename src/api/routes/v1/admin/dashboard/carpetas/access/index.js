import CarpetasService from '../../../../../../../services/carpetas.service.js';
import Logger from '../../../../../../../helpers/logger.js';
import {
  SuccessResponse,
  InternalError,
  responseError,
} from '../../../../../../../helpers/api.response.js';
import { comprimirArchivosYCarpetas } from '../../../../../../../helpers/zipHelper.js';
import fs from 'fs';
import path from 'path';

const service = CarpetasService.getInstance();

export const obtenerArbolCarpetas = async (req, res) => {
  try {
    const result = await service.obtenerArbolCarpetas();
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const descargarArchivo = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return responseError(200, 'Código de archivo no proporcionado', 400, res);
    }

    const result = await service.obtenerArchivoPorCodigo(parseInt(codigo));

    if (!result || !result.success || !result.data) {
      return responseError(200, result?.message || 'Archivo no encontrado', 404, res);
    }

    const archivo = result.data;

    // Validar que el archivo tiene path
    if (!archivo.path) {
      Logger.error('Archivo sin path:', archivo);
      return responseError(200, 'El archivo no tiene una ruta válida', 500, res);
    }

    // Expandir ~ si la ruta comienza con ello
    let rutaArchivo = archivo.path;
    if (rutaArchivo.startsWith('~/')) {
      rutaArchivo = path.join(process.cwd(), rutaArchivo.substring(2));
    }
    rutaArchivo = path.resolve(rutaArchivo);

    // Verificar si el archivo existe
    if (!fs.existsSync(rutaArchivo)) {
      Logger.error('Archivo no encontrado en:', rutaArchivo);
      return responseError(200, 'Archivo no encontrado en el sistema de archivos', 404, res);
    }

    // Obtener el nombre del archivo sin espacios
    const nombreArchivoDescarga = archivo.nombrearchivo.replace(/ /g, '_');

    // Configurar headers para la descarga
    res.setHeader('Content-Type', archivo.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivoDescarga}"`);

    // Obtener tamaño del archivo
    const stats = fs.statSync(rutaArchivo);
    res.setHeader('Content-Length', stats.size);

    // Enviar el archivo usando streaming
    const fileStream = fs.createReadStream(rutaArchivo);

    fileStream.on('open', () => {
      fileStream.pipe(res);
    });

    fileStream.on('error', (error) => {
      Logger.error('Error al leer el archivo:', error);
      if (!res.headersSent) {
        return responseError(200, 'Error al leer el archivo', 500, res);
      }
    });

    fileStream.on('end', () => {
      Logger.info(`Archivo descargado exitosamente: ${archivo.nombrearchivo}`);
    });

  } catch (err) {
    Logger.error('Error en descargarArchivo:', err);
    if (!res.headersSent) {
      return InternalError(res);
    }
  }
};

export const verArchivo = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return responseError(200, 'Código de archivo no proporcionado', 400, res);
    }

    const result = await service.obtenerArchivoPorCodigo(parseInt(codigo));

    if (!result || !result.success || !result.data) {
      return responseError(200, result?.message || 'Archivo no encontrado', 404, res);
    }

    const archivo = result.data;

    // Validar que el archivo tiene path
    if (!archivo.path) {
      Logger.error('Archivo sin path:', archivo);
      return responseError(200, 'El archivo no tiene una ruta válida', 500, res);
    }

    // Expandir ~ si la ruta comienza con ello
    let rutaArchivo = archivo.path;
    if (rutaArchivo.startsWith('~/')) {
      rutaArchivo = path.join(process.cwd(), rutaArchivo.substring(2));
    }
    rutaArchivo = path.resolve(rutaArchivo);

    // Verificar si el archivo existe
    if (!fs.existsSync(rutaArchivo)) {
      Logger.error('Archivo no encontrado en:', rutaArchivo);
      return responseError(200, 'Archivo no encontrado en el sistema de archivos', 404, res);
    }

    // Obtener el nombre del archivo sin espacios
    const nombreArchivoDescarga = archivo.nombrearchivo.replace(/ /g, '_');

    // Determinar Content-Type basado en la extensión del archivo
    let contentType = archivo.contentType || 'application/octet-stream';
    const extension = path.extname(archivo.nombrearchivo).toLowerCase();

    // Forzar text/plain para archivos .txt
    if (extension === '.txt') {
      contentType = 'text/plain; charset=utf-8';
    }

    // Log para debugging
    Logger.info(`Sirviendo archivo: ${archivo.nombrearchivo}`);
    Logger.info(`Ruta física: ${rutaArchivo}`);
    Logger.info(`Content-Type: ${contentType}`);

    // Configurar headers para visualización en línea (inline en lugar de attachment)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivoDescarga}"`);

    // Headers de seguridad adicionales
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Obtener tamaño del archivo
    const stats = fs.statSync(rutaArchivo);
    res.setHeader('Content-Length', stats.size);

    // Enviar el archivo usando streaming
    const fileStream = fs.createReadStream(rutaArchivo);

    fileStream.on('open', () => {
      fileStream.pipe(res);
    });

    fileStream.on('error', (error) => {
      Logger.error('Error al leer el archivo:', error);
      if (!res.headersSent) {
        return responseError(200, 'Error al leer el archivo', 500, res);
      }
    });

    fileStream.on('end', () => {
      Logger.info(`Archivo visualizado exitosamente: ${archivo.nombrearchivo}`);
    });

  } catch (err) {
    Logger.error('Error en verArchivo:', err);
    if (!res.headersSent) {
      return InternalError(res);
    }
  }
};

export const descargarCarpeta = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return responseError(200, 'Código de carpeta no proporcionado', 400, res);
    }

    const result = await service.obtenerCarpetaConArchivos(parseInt(codigo));

    if (!result || !result.success || !result.data) {
      return responseError(200, result?.message || 'Carpeta no encontrada', 404, res);
    }

    const { carpeta, archivos, subcarpetas } = result.data;

    // Nombre del archivo ZIP
    const nombreZip = `${carpeta.nombre.replace(/ /g, '_')}.zip`;

    Logger.info(`Iniciando compresión de carpeta: ${carpeta.nombre} (${archivos?.length || 0} archivos, ${subcarpetas?.length || 0} carpetas)`);

    // Comprimir archivos y carpetas (incluyendo vacías)
    await comprimirArchivosYCarpetas(archivos, subcarpetas, carpeta, res, nombreZip);

    Logger.info(`Carpeta descargada exitosamente: ${carpeta.nombre}`);

  } catch (err) {
    Logger.error('Error en descargarCarpeta:', err);
    if (!res.headersSent) {
      return InternalError(res);
    }
  }
};
