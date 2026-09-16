import FactDnaModel from "../models/fact_dna.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

export default class FactDnaService {
  static instance;

  static getInstance() {
    if (!FactDnaService.instance) {
      FactDnaService.instance = new FactDnaService();
    }
    return FactDnaService.instance;
  }

  #model = FactDnaModel.getInstance();

  async guardarFactDna({ ucp, tipo_dia, periodos }, session) {
    try {
      if (
        !ucp ||
        !tipo_dia ||
        !Array.isArray(periodos) ||
        periodos.length !== 24
      ) {
        return {
          success: false,
          message: "UCP, tipo_dia y 24 periodos son requeridos.",
        };
      }
      const client = createConectionPG(session);
      const row = await this.#model.upsertFactDna(
        { ucp, tipo_dia, periodos },
        client,
      );
      return { success: true, data: row };
    } catch (err) {
      Logger.error(colors.red("Error FactDnaService guardarFactDna"), err);
      return { success: false, message: err.message || "Error al guardar FACT DNA." };
    }
  }

  async getFactDna({ ucp, tipo_dia }, session) {
    try {
      const client = createConectionPG(session);
      const row = await this.#model.getFactDna(ucp, tipo_dia, client);
      return { success: true, data: row };
    } catch (err) {
      Logger.error(colors.red("Error FactDnaService getFactDna"), err);
      return { success: false, message: err.message || "Error al obtener FACT DNA." };
    }
  }
}
