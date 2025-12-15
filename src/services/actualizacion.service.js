import ConfiguracionModel from "../models/configuracion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = ConfiguracionModel.getInstance();

export default class ActualizacionService {
  static instance;
  static getInstance() {
    if (!ActualizacionService.instance) {
      ActualizacionService.instance = new ActualizacionService();
    }
    return ActualizacionService.instance;
  }

  cargarExcelActualizacion = async (filas) => {
    try {
      for (const fila of filas) {
        const { flujo, fecha, codrpm, ...periodos } = fila;

        const existe = await model.buscarUCPActualizacionDatos(codrpm, fecha);

        const payload = {
          ucp: codrpm,
          fecha,
          observacion: `Carga Excel Flujo ${flujo}`,
          ...periodos,
          estado: this.#estadoPorFlujo(flujo),
          festivo: false,
        };

        if (!existe) {
          await model.agregarUCPActualizacionDatos(payload);
        } else {
          await model.actualizarUCPActualizacionDatos(payload);
        }
      }

      return { success: true, message: "Excel procesado correctamente" };
    } catch (error) {
      Logger.error(colors.red("Error cargarExcelActualizacion"), error);
      return { success: false, message: "Error procesando Excel" };
    }
  };

  #estadoPorFlujo = (flujo) => {
    switch (flujo) {
      case "R1":
        return "A";
      case "AE":
        return "E";
      case "AS":
        return "S";
      default:
        return "P";
    }
  };
}
