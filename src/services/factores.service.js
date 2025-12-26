import FactoresModel from "../models/factores.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import path from "path";
import fs from "fs";

const model = FactoresModel.getInstance();

export default class FactoresService {
  static instance;

  static getInstance() {
    if (!FactoresService.instance) {
      FactoresService.instance = new FactoresService();
    }
    return FactoresService.instance;
  }
  guardarBarra = async (data) => {
    try {
      const res = await model.guardarBarra(data);
      return {
        success: true,
        data: res,
        message: "Barra creada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        data: null,
        message: "Error al crear la barra",
      };
    }
  };

  consultarBarrasIndex_xMC = async (mc) => {
    try {
      const res = await model.consultarBarrasIndex_xMC(mc);

      if (!res) {
        return {
          success: false,
          data: null,
          message: "Barras no encontradas.",
        };
      }

      return {
        success: true,
        data: res,
        message: "Barras obtenidas correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error FactoresService consultarBarrasIndex_xMC"),
        err
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las barras.",
      };
    }
  };

  actualizarBarra = async (id, data) => {
    try {
      await model.actualizarBarra(id, data);
      return {
        success: true,
        message: "Barra actualizada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al actualizar la barra",
      };
    }
  };

  guardarAgrupacion = async (data) => {
    try {
      const res = await model.guardarAgrupacion(data);
      return {
        success: true,
        data: res,
        message: "Agrupación creada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        data: null,
        message: "Error al crear la agrupación",
      };
    }
  };

  consultarAgrupacionesIndex_xBarraId = async (barra_id) => {
    try {
      const res = await model.consultarAgrupacionesIndex_xBarraId(barra_id);

      if (!res) {
        return {
          success: false,
          data: null,
          message: "Agrupaciones no encontradas.",
        };
      }

      return {
        success: true,
        data: res,
        message: "Agrupaciones obtenidas correctamente.",
      };
    } catch (err) {
      Logger.error(
        colors.red("Error FactoresService consultarAgrupacionesIndex_xBarraId"),
        err
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener las agrupaciones.",
      };
    }
  };

  actualizarAgrupacion = async (id, data) => {
    try {
      await model.actualizarAgrupacion(id, data);
      return {
        success: true,
        message: "Agrupación actualizada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al actualizar la agrupación",
      };
    }
  };

  eliminarBarraConAgrupaciones = async (id) => {
    try {
      await model.eliminarBarraConAgrupaciones(id);
      return {
        success: true,
        message: "Barra y agrupaciones eliminadas correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al eliminar la barra",
      };
    }
  };

  eliminarAgrupacion = async (id) => {
    try {
      await model.eliminarAgrupacion(id);
      return {
        success: true,
        message: "Agrupación eliminada correctamente",
      };
    } catch (err) {
      Logger.error(err);
      return {
        success: false,
        message: "Error al eliminar la agrupación",
      };
    }
  };

  eliminarRapido = async (data) => {
    try {
      await model.eliminarMedidasRapido(data);
      return { success: true, message: "Medidas eliminadas correctamente" };
    } catch {
      return { success: false, message: "Error al eliminar medidas" };
    }
  };

  actualizarRapido = async (data) => {
    try {
      await model.actualizarMedidasRapido(data);
      return { success: true, message: "Medidas actualizadas correctamente" };
    } catch {
      return { success: false, message: "Error al actualizar medidas" };
    }
  };

  insertarRapido = async (data) => {
    try {
      await model.insertarMedidasRapido(data);
      return { success: true, message: "Medidas insertadas correctamente" };
    } catch {
      return { success: false, message: "Error al insertar medidas" };
    }
  };

  descargarPlantillaMedidas = async () => {
    const filePath = path.join(
      process.cwd(),
      "Plantillas",
      "CargarMedidasPrimeGridt.xlsx"
    );

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        filePath: null,
        message: "La plantilla no existe en el servidor",
      };
    }

    return {
      success: true,
      filePath,
      filename: "CargarMedidasPrimeGridt.xlsx",
      message: "Plantilla obtenida correctamente",
    };
  };
}
