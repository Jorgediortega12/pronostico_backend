import MenuModel from '../models/menu.model.js';
import UserModel from '../models/user.model.js';
import Logger from '../helpers/logger.js';
import colors from 'colors';

const model = MenuModel.getInstance();
const userModel = UserModel.getInstance();

export default class MenuService {
  static instance;

  static getInstance() {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  obtenerModulosPadres = async () => {
    try {
      const result = await model.obtenerModulosPadres();

      if (!result || result.rows.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No hay módulos disponibles.'
        };
      }

      return {
        success: true,
        data: result.rows,
        message: 'Módulos obtenidos correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService obtenerModulosPadres'), err);
      throw new Error('ERROR TECNICO');
    }
  };

  obtenerPerfilesDisponibles = async () => {
    try {
      const result = await model.obtenerPerfilesDisponibles();

      if (!result || result.rows.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No hay perfiles disponibles.'
        };
      }

      return {
        success: true,
        data: result.rows,
        message: 'Perfiles obtenidos correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService obtenerPerfilesDisponibles'), err);
      throw err;
    }
  };

  obtenerModulosPorPerfil = async (codPerfil) => {
    try {
      if (!codPerfil) {
        throw new Error('El código de perfil es requerido');
      }

      const result = await model.obtenerModulosPorPerfil(codPerfil);

      if (!result || result.rows.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No hay módulos asignados a este perfil.'
        };
      }

      return {
        success: true,
        data: result.rows,
        message: 'Módulos del perfil obtenidos correctamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService obtenerModulosPorPerfil'), err);
      throw err;
    }
  };

  asignarModuloAPerfil = async (codPerfil, codMenu) => {
    try {
      if (!codPerfil || !codMenu) {
        throw new Error('El código de perfil y código de menú son requeridos');
      }

      const result = await model.asignarModuloAPerfil(codPerfil, codMenu);

      if (!result || result.rows.length === 0) {
        throw new Error('Error al asignar módulo al perfil');
      }

      return {
        success: true,
        data: result.rows[0],
        message: 'Módulo asignado al perfil exitosamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService asignarModuloAPerfil'), err);
      throw err;
    }
  };

  /**
   * Remover módulo de un perfil
   */
  removerModuloDePerfil = async (codPerfil, codMenu) => {
    try {
      if (!codPerfil || !codMenu) {
        throw new Error('El código de perfil y código de menú son requeridos');
      }

      const result = await model.removerModuloDePerfil(codPerfil, codMenu);

      if (!result || result.rowCount === 0) {
        throw new Error('Asignación no encontrada');
      }

      return {
        success: true,
        message: 'Módulo removido del perfil exitosamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService removerModuloDePerfil'), err);
      throw err;
    }
  };

  editarPerfil = async (codPerfil, nombre) => {
    try {
      if (!codPerfil || !nombre) {
        throw new Error('El código del perfil y el nombre son requeridos');
      }

      const result = await userModel.editarPerfil(codPerfil, nombre);

      if (!result || result.rowCount === 0) {
        throw new Error('Error al actualizar el perfil');
      }

      return {
        success: true,
        message: 'Perfil actualizado exitosamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService editarPerfil'), err);
      throw err;
    }
  };

  eliminarPerfil = async (codPerfil) => {
    try {
      if (!codPerfil) {
        throw new Error('El código del perfil es requerido');
      }

      const result = await userModel.eliminarPerfil(codPerfil);

      if (!result || result.rowCount === 0) {
        throw new Error('Perfil no encontrado');
      }

      return {
        success: true,
        message: 'Perfil eliminado exitosamente.'
      };
    } catch (err) {
      Logger.error(colors.red('Error MenuService eliminarPerfil'), err);
      throw err;
    }
  };
}

// Exportar instancia singleton
export const menuService = MenuService.getInstance();
