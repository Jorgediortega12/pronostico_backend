import DnaIdoConfigModel from "../models/dna_ido_config.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = DnaIdoConfigModel.getInstance();

// 23505 = unique_violation, 23503 = foreign_key_violation
const mensajeErrorConfig = (error, defecto) => {
  if (error?.code === "23505") {
    return "Ya existe una configuración para ese mercado y esa empresa.";
  }
  return defecto;
};

const mensajeErrorEmpresa = (error, defecto) => {
  if (error?.code === "23505") {
    return "Ya existe una empresa con ese nombre.";
  }
  return defecto;
};

export default class DnaIdoConfigService {
  static instance;
  static getInstance() {
    if (!DnaIdoConfigService.instance) {
      DnaIdoConfigService.instance = new DnaIdoConfigService();
    }
    return DnaIdoConfigService.instance;
  }

  // ── Empresas ──────────────────────────────────────────────────────────
  crearEmpresa = async (session, payload) => {
    try {
      const created = await model.crearEmpresa(session, payload);
      if (!created)
        return {
          success: false,
          data: null,
          message: "No se pudo crear la empresa.",
        };
      return {
        success: true,
        data: created,
        message: "Empresa creada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DnaIdoConfigService crearEmpresa"), error);
      return {
        success: false,
        data: null,
        message: mensajeErrorEmpresa(error, "Error al crear la empresa."),
      };
    }
  };

  obtenerEmpresas = async (session) => {
    try {
      const data = await model.obtenerEmpresas(session);
      return { success: true, data, message: "Empresas obtenidas." };
    } catch (error) {
      Logger.error(
        colors.red("Error DnaIdoConfigService obtenerEmpresas"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener empresas.",
      };
    }
  };

  eliminarEmpresa = async (session, payload) => {
    try {
      const deleted = await model.eliminarEmpresa(session, payload);
      if (!deleted)
        return {
          success: false,
          data: null,
          message: "No se encontró la empresa.",
        };
      return {
        success: true,
        data: deleted,
        message:
          "Empresa eliminada correctamente (junto con sus mercados/municipios asociados).",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error DnaIdoConfigService eliminarEmpresa"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al eliminar la empresa.",
      };
    }
  };

  // ── Config ────────────────────────────────────────────────────────────
  crear = async (session, payload) => {
    try {
      const created = await model.crear(session, payload);
      if (!created)
        return {
          success: false,
          data: null,
          message: "No se pudo crear la configuración.",
        };
      return {
        success: true,
        data: created,
        message: "Configuración creada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DnaIdoConfigService crear"), error);
      return {
        success: false,
        data: null,
        message: mensajeErrorConfig(error, "Error al crear la configuración."),
      };
    }
  };

  obtenerTodos = async (session) => {
    try {
      const data = await model.obtenerTodos(session);
      return { success: true, data, message: "Configuraciones obtenidas." };
    } catch (error) {
      Logger.error(
        colors.red("Error DnaIdoConfigService obtenerTodos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener configuraciones.",
      };
    }
  };

  obtenerPorMC = async (session, payload) => {
    try {
      const data = await model.obtenerPorMC(session, payload);
      return {
        success: true,
        data,
        message: "Configuraciones por mercado obtenidas.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error DnaIdoConfigService obtenerPorMC"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener configuraciones por mercado.",
      };
    }
  };

  actualizar = async (session, payload) => {
    try {
      const updated = await model.actualizar(session, payload);
      if (!updated)
        return {
          success: false,
          data: null,
          message: "No se encontró la configuración.",
        };
      return {
        success: true,
        data: updated,
        message: "Configuración actualizada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DnaIdoConfigService actualizar"), error);
      return {
        success: false,
        data: null,
        message: mensajeErrorConfig(
          error,
          "Error al actualizar la configuración.",
        ),
      };
    }
  };

  eliminar = async (session, payload) => {
    try {
      const deleted = await model.eliminar(session, payload);
      if (!deleted)
        return {
          success: false,
          data: null,
          message: "No se encontró la configuración.",
        };
      return {
        success: true,
        data: deleted,
        message: "Configuración eliminada correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DnaIdoConfigService eliminar"), error);
      return {
        success: false,
        data: null,
        message: "Error al eliminar la configuración.",
      };
    }
  };
}
