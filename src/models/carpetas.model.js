import carpetasQuery from "../querys/carpetas.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

export default class CarpetasModel {
  static instance;

  static getInstance() {
    if (!CarpetasModel.instance) {
      CarpetasModel.instance = new CarpetasModel();
    }
    return CarpetasModel.instance;
  }

  obtenerArbolCarpetas = async (client) => {
    try {
      await client.connect(); // abrir conexión
      const arbol = await carpetasQuery.obtenerArbolCarpetas(client);
      return arbol;
    } catch (error) {
      Logger.error(
        colors.red("Error CarpetasModel obtenerArbolCarpetas"),
        error,
      );
      throw error;
    } finally {
      await client.end(); // cerrar conexión
    }
  };

  //obtenemos el codigo del archivo para poder descargarlo
  obtenerArchivoPorCodigo = async (codigoArchivo, client) => {
    try {
      await client.connect(); // abrir conexión
      const archivo = await carpetasQuery.obtenerArchivoPorCodigo(
        codigoArchivo,
        client,
      );
      return archivo;
    } catch (error) {
      Logger.error(
        colors.red("Error CarpetasModel obtenerArchivoPorCodigo"),
        error,
      );
      throw error;
    } finally {
      await client.end(); // cerrar conexión
    }
  };

  // Obtener información de una carpeta por código
  obtenerCarpetaPorCodigo = async (codigoCarpeta, client) => {
    try {
      await client.connect(); // abrir conexión
      const carpeta = await carpetasQuery.obtenerCarpetaPorCodigo(
        codigoCarpeta,
        client,
      );
      return carpeta;
    } catch (error) {
      Logger.error(
        colors.red("Error CarpetasModel obtenerCarpetaPorCodigo"),
        error,
      );
      throw error;
    } finally {
      client.end(); // cerrar conexión
    }
  };

  // Obtener todos los archivos de una carpeta y sus subcarpetas
  obtenerArchivosDeCarpeta = async (codigoCarpeta, client) => {
    try {
      const archivos = await carpetasQuery.obtenerArchivosDeCarpeta(
        codigoCarpeta,
        client,
      );
      return archivos;
    } catch (error) {
      Logger.error(
        colors.red("Error CarpetasModel obtenerArchivosDeCarpeta"),
        error,
      );
      throw error;
    } finally {
      client.end(); // cerrar conexión
    }
  };

  // Obtener todas las subcarpetas de una carpeta
  obtenerSubcarpetas = async (codigoCarpeta, client) => {
    try {
      await client.connect(); // abrir conexión
      const subcarpetas = await carpetasQuery.obtenerSubcarpetas(
        codigoCarpeta,
        client,
      );
      return subcarpetas;
    } catch (error) {
      Logger.error(colors.red("Error CarpetasModel obtenerSubcarpetas"), error);
      throw error;
    } finally {
      client.end(); // cerrar conexión
    }
  };
}
