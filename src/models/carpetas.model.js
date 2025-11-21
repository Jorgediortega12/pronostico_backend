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
}
