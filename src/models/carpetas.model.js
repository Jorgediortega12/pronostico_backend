import carpetasQuery from '../querys/carpetas.query.js';
import Logger from '../helpers/logger.js';
import colors from 'colors';

export default class CarpetasModel {
  static instance;

  static getInstance() {
    if (!CarpetasModel.instance) {
      CarpetasModel.instance = new CarpetasModel();
    }
    return CarpetasModel.instance;
  }

  obtenerArbolCarpetas = async () => {
    try {
      const arbol = await carpetasQuery.obtenerArbolCarpetas();
      return arbol;
    } catch (error) {
      Logger.error(colors.red('Error CarpetasModel obtenerArbolCarpetas'), error);
      throw error;
    }
  };

  //obtenemos el codigo del archivo para poder descargarlo
  obtenerArchivoPorCodigo = async (codigoArchivo) => {
    try {
      const archivo = await carpetasQuery.obtenerArchivoPorCodigo(codigoArchivo);
      return archivo;
    } catch (error) {
      Logger.error(colors.red('Error CarpetasModel obtenerArchivoPorCodigo'), error);
      throw error;
    }
  };

  // Obtener información de una carpeta por código
  obtenerCarpetaPorCodigo = async (codigoCarpeta) => {
    try {
      const carpeta = await carpetasQuery.obtenerCarpetaPorCodigo(codigoCarpeta);
      return carpeta;
    } catch (error) {
      Logger.error(colors.red('Error CarpetasModel obtenerCarpetaPorCodigo'), error);
      throw error;
    }
  };

  // Obtener todos los archivos de una carpeta y sus subcarpetas
  obtenerArchivosDeCarpeta = async (codigoCarpeta) => {
    try {
      const archivos = await carpetasQuery.obtenerArchivosDeCarpeta(codigoCarpeta);
      return archivos;
    } catch (error) {
      Logger.error(colors.red('Error CarpetasModel obtenerArchivosDeCarpeta'), error);
      throw error;
    }
  };

  // Obtener todas las subcarpetas de una carpeta
  obtenerSubcarpetas = async (codigoCarpeta) => {
    try {
      const subcarpetas = await carpetasQuery.obtenerSubcarpetas(codigoCarpeta);
      return subcarpetas;
    } catch (error) {
      Logger.error(colors.red('Error CarpetasModel obtenerSubcarpetas'), error);
      throw error;
    }
  };
}
