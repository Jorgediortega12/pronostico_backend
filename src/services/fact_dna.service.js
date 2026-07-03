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

  async guardarFactDna({ ucp, periodos }, session) {
    try {
      if (!ucp || !Array.isArray(periodos) || periodos.length !== 24) {
        return { success: false, message: "UCP y 24 periodos son requeridos." };
      }
      const client = createConectionPG(session);
      const row = await this.#model.upsertFactDna({ ucp, periodos }, client);
      return { success: true, data: row };
    } catch (err) {
      Logger.error(colors.red("Error FactDnaService guardarFactDna"), err);
      return { success: false, message: err.message || "Error al guardar FACT DNA." };
    }
  }

  async getFactDna({ ucp }, session) {
    try {
      const client = createConectionPG(session);
      const row = await this.#model.getFactDna(ucp, client);
      return { success: true, data: row };
    } catch (err) {
      Logger.error(colors.red("Error FactDnaService getFactDna"), err);
      return { success: false, message: err.message || "Error al obtener FACT DNA." };
    }
  }
}
