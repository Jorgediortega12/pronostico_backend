import CarpetasModel from "../models/carpetas.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

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
  obtenerArbolCarpetas = async (session) => {
    try {
      const client = createConectionPG(session);
      const arbol = await model.obtenerArbolCarpetas(client);
      return {
        success: true,
        data: arbol,
        message: "Árbol de carpetas obtenido correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error CarpetasService obtenerArbolCarpetas"),
        err,
      );
      throw new Error("ERROR TECNICO");
    }
  };

  /**
   * Obtener información de un archivo para descarga
   */
  obtenerArchivoPorCodigo = async (codigoArchivo, session) => {
    try {
      const client = createConectionPG(session);
      const archivo = await model.obtenerArchivoPorCodigo(
        codigoArchivo,
        client,
      );

      if (!archivo) {
        return {
          success: false,
          data: null,
          message: "Archivo no encontrado.",
        };
      }

      return {
        success: true,
        data: archivo,
        message: "Archivo obtenido correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error CarpetasService obtenerArchivoPorCodigo"),
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener el archivo.",
      };
    }
  };

  /**
   * Obtener información de una carpeta y sus archivos para descarga
   */
  obtenerCarpetaConArchivos = async (codigoCarpeta, session) => {
    try {
      const client = createConectionPG(session);
      const carpeta = await model.obtenerCarpetaPorCodigo(
        codigoCarpeta,
        client,
      );

      if (!carpeta) {
        return {
          success: false,
          data: null,
          message: "Carpeta no encontrada.",
        };
      }
      const client2 = createConectionPG(session);
      const archivos = await model.obtenerArchivosDeCarpeta(
        codigoCarpeta,
        client2,
      );
      const client3 = createConectionPG(session);
      const subcarpetas = await model.obtenerSubcarpetas(
        codigoCarpeta,
        client3,
      );

      return {
        success: true,
        data: {
          carpeta,
          archivos,
          subcarpetas,
        },
        message: "Carpeta, archivos y subcarpetas obtenidos correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error CarpetasService obtenerCarpetaConArchivos"),
        err,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener la carpeta.",
      };
    }
  };
}
