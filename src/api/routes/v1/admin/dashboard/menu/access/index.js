import { menuService } from "../../../../../../../services/menu.service.js";

class MenuController {
  async obtenerModulosPadres(req, res) {
    try {
      const { session } = req.user;
      const result = await menuService.obtenerModulosPadres(session);

      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener los módulos padres",
        error: error.message,
      });
    }
  }

  async obtenerPerfilesDisponibles(req, res) {
    try {
      const { session } = req.user;
      const result = await menuService.obtenerPerfilesDisponibles(session);

      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener los perfiles disponibles",
        error: error.message,
      });
    }
  }

  async obtenerModulosPorPerfil(req, res) {
    try {
      const { codperfil } = req.params;
      const { session } = req.user;
      if (!codperfil) {
        return res.status(400).json({
          success: false,
          message: "El código de perfil es requerido",
        });
      }

      const result = await menuService.obtenerModulosPorPerfil(
        parseInt(codperfil),
        session,
      );

      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener los módulos del perfil",
        error: error.message,
      });
    }
  }

  async asignarModuloAPerfil(req, res) {
    try {
      const { codPerfil, codMenu } = req.body;
      const { session } = req.user;
      if (!codPerfil || !codMenu) {
        return res.status(400).json({
          success: false,
          message: "El código de perfil y código de menú son requeridos",
        });
      }

      const result = await menuService.asignarModuloAPerfil(
        codPerfil,
        codMenu,
        session,
      );

      return res.status(201).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al asignar módulo al perfil",
        error: error.message,
      });
    }
  }

  async removerModuloDePerfil(req, res) {
    try {
      const { codPerfil, codMenu } = req.body;
      const { session } = req.user;
      if (!codPerfil || !codMenu) {
        return res.status(400).json({
          success: false,
          message: "El código de perfil y código de menú son requeridos",
        });
      }

      const result = await menuService.removerModuloDePerfil(
        codPerfil,
        codMenu,
        session,
      );

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al remover módulo del perfil",
        error: error.message,
      });
    }
  }

  async editarPerfil(req, res) {
    try {
      const { id } = req.params;
      const { nombre } = req.body;
      const { session } = req.user;
      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre del perfil es requerido",
        });
      }

      const result = await menuService.editarPerfil(
        parseInt(id),
        nombre,
        session,
      );

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Error al actualizar el perfil") {
        return res.status(404).json({
          success: false,
          message: "Perfil no encontrado",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al actualizar el perfil",
        error: error.message,
      });
    }
  }

  async eliminarPerfil(req, res) {
    try {
      const { id } = req.params;
      const { session } = req.user;
      const result = await menuService.eliminarPerfil(parseInt(id), session);

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Perfil no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al eliminar el perfil",
        error: error.message,
      });
    }
  }

  async crearModulo(req, res) {
    try {
      const { nombre, nivel, orden, link, imagen } = req.body;
      const { session } = req.user;
      const result = await menuService.crearModulo(
        nombre,
        nivel,
        orden,
        link,
        imagen,
        session,
      );

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Modulo no creado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al crear el modulo requerido",
        error: error.message,
      });
    }
  }

  async eliminarModulo(req, res) {
    try {
      const { cod } = req.params;
      const { session } = req.user;
      const result = await menuService.eliminarModulo(cod, session);

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "El modulo no fue eliminado correctamente") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al eliminar el modulo requerido",
        error: error.message,
      });
    }
  }
}

export default new MenuController();
