import CarpetasModel from '../models/carpetas.model.js';
import Logger from '../helpers/logger.js';
import colors from 'colors';

const model = CarpetasModel.getInstance();

export default class CarpetasService {
  static instance;

  static getInstance() {
    if (!CarpetasService.instance) {
      CarpetasService.instance = new CarpetasService();
    }
    return CarpetasService.instance;
  }

  /**
   * Obtener árbol completo de carpetas con jerarquía
   */
  obtenerArbolCarpetas = async () => {
    try {
      const arbol = await model.obtenerArbolCarpetas();
      return {
        success: true,
        data: arbol,
        message: 'Árbol de carpetas obtenido correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error CarpetasService obtenerArbolCarpetas'), err);
      throw new Error('ERROR TECNICO');
    }
  };

  /**
   * Obtener información de un archivo para descarga
   */
  obtenerArchivoPorCodigo = async (codigoArchivo) => {
    try {
      const archivo = await model.obtenerArchivoPorCodigo(codigoArchivo);

      if (!archivo) {
        return {
          success: false,
          data: null,
          message: 'Archivo no encontrado.'
        };
      }

      return {
        success: true,
        data: archivo,
        message: 'Archivo obtenido correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error CarpetasService obtenerArchivoPorCodigo'), err);
      return {
        success: false,
        data: null,
        message: 'Error al obtener el archivo.'
      };
    }
  };

  /**
   * Obtener información de una carpeta y sus archivos para descarga
   */
  obtenerCarpetaConArchivos = async (codigoCarpeta) => {
    try {
      const carpeta = await model.obtenerCarpetaPorCodigo(codigoCarpeta);

      if (!carpeta) {
        return {
          success: false,
          data: null,
          message: 'Carpeta no encontrada.'
        };
      }

      const archivos = await model.obtenerArchivosDeCarpeta(codigoCarpeta);
      const subcarpetas = await model.obtenerSubcarpetas(codigoCarpeta);

      return {
        success: true,
        data: {
          carpeta,
          archivos,
          subcarpetas
        },
        message: 'Carpeta, archivos y subcarpetas obtenidos correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error CarpetasService obtenerCarpetaConArchivos'), err);
      return {
        success: false,
        data: null,
        message: 'Error al obtener la carpeta.'
      };
    }
  };
}
