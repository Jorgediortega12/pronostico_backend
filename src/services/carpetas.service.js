import CarpetasModel from '../models/carpetas.model.js';
import Logger from '../helpers/logger.js';
import colors from 'colors';

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
  obtenerArbolCarpetas = async () => {
    try {
      const arbol = await model.obtenerArbolCarpetas();
      return {
        success: true,
        data: arbol,
        message: 'Árbol de carpetas obtenido correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error CarpetasService obtenerArbolCarpetas'), err);
      throw new Error('ERROR TECNICO');
    }
  };
}
