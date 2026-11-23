import DemandSplitConfigModel from "../models/demand_split_config.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = DemandSplitConfigModel.getInstance();

export default class DemandSplitConfigService {
  static instance;
  static getInstance() {
    if (!DemandSplitConfigService.instance) {
      DemandSplitConfigService.instance = new DemandSplitConfigService();
    }
    return DemandSplitConfigService.instance;
  }

  obtener = async (session) => {
    try {
      const config = await model.obtener(session);
      if (!config)
        return {
          success: false,
          data: null,
          message: "No se pudo obtener la configuración de división de mercado.",
        };
      return {
        success: true,
        data: config,
        message: "Configuración de división de mercado.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DemandSplitConfigService obtener"), error);
      return {
        success: false,
        data: null,
        message: "Error al obtener la configuración de división de mercado.",
      };
    }
  };

  actualizar = async (session, payload) => {
    try {
      const config = await model.actualizar(session, payload);
      if (!config)
        return {
          success: false,
          data: null,
          message: "No se pudo actualizar la configuración de división de mercado.",
        };
      return {
        success: true,
        data: config,
        message: "Configuración de división de mercado actualizada.",
      };
    } catch (error) {
      Logger.error(colors.red("Error DemandSplitConfigService actualizar"), error);
      return {
        success: false,
        data: null,
        message: "Error al actualizar la configuración de división de mercado.",
      };
    }
  };
}
