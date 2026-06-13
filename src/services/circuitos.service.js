import CircuitosModel from "../models/circuitos.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

const model = CircuitosModel.getInstance();

export default class CircuitosService {
  static instance;

  static getInstance() {
    if (!CircuitosService.instance) {
      CircuitosService.instance = new CircuitosService();
    }
    return CircuitosService.instance;
  }

  crearCircuito = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      const created = await model.crearCircuito(payload, client);
      if (!created)
        return {
          success: false,
          data: null,
          message: "No se pudo crear el circuito.",
        };
      return {
        success: true,
        data: created,
        message: "Circuito creado correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error CircuitosService crearCircuito"), error);
      return {
        success: false,
        data: null,
        message: "Error al crear circuito.",
      };
    }
  };

  obtenerCircuitos = async (session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.obtenerCircuitos(client);
      return { success: true, data, message: "Circuitos obtenidos." };
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosService obtenerCircuitos"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener circuitos.",
      };
    }
  };

  obtenerCircuitosPorUCP = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      const data = await model.obtenerCircuitosPorUCP(payload, client);
      return { success: true, data, message: "Circuitos por UCP obtenidos." };
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosService obtenerCircuitosPorUCP"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener circuitos por UCP.",
      };
    }
  };

  actualizarCircuito = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      const updated = await model.actualizarCircuito(payload, client);
      if (!updated)
        return {
          success: false,
          data: null,
          message: "No se encontró el circuito.",
        };
      return {
        success: true,
        data: updated,
        message: "Circuito actualizado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosService actualizarCircuito"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al actualizar circuito.",
      };
    }
  };

  eliminarCircuito = async (payload, session) => {
    try {
      const client = createConectionPG(session);
      const deleted = await model.eliminarCircuito(payload, client);
      if (!deleted)
        return {
          success: false,
          data: null,
          message: "No se encontró el circuito.",
        };
      return {
        success: true,
        data: deleted,
        message: "Circuito eliminado correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error CircuitosService eliminarCircuito"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al eliminar circuito.",
      };
    }
  };
}
