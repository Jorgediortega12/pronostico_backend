import authService from "../../../../../services/auth.service.js";
import Logger from "../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../helpers/api.response.js";
class AuthController {
  async loginS(req, res) {
    const { usuario, password } = req.body;

    try {
      const verifyLogin = await authService.loginS(usuario, password);

      if (!verifyLogin.success)
        return responseError(200, verifyLogin.message, 404, res);

      return SuccessResponse(res, verifyLogin.user, verifyLogin.message);
    } catch (error) {
      Logger.error(error);
      return InternalError(res);
    }
  }

  async login(req, res) {
    try {
      const { uuid, usuario, password } = req.body; // ← agregar uuid

      const result = await authService.login(uuid, usuario, password);

      return res.status(200).json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
          token: result.token,
          user: result.user,
        },
      });
    } catch (error) {
      if (error.message === "Mercado no encontrado.") {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (
        error.message === "Este mercado no tiene base de datos configurada."
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.message === "Usuario o contraseña incorrectos") {
        return res
          .status(401)
          .json({ success: false, message: "Credenciales inválidas" });
      }
      if (error.message === "Usuario bloqueado") {
        return res.status(403).json({
          success: false,
          message: "Usuario bloqueado. Contacte al administrador",
        });
      }
      if (error.message === "Usuario inactivo") {
        return res.status(403).json({
          success: false,
          message: "Usuario inactivo. Contacte al administrador",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al iniciar sesión",
        error: error.message,
      });
    }
  }

  async register(req, res) {
    try {
      const userData = req.body;

      // Consumir el servicio de autenticacion para registrar
      const result = await authService.register(userData);

      return res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          token: result.token,
          user: result.user,
        },
      });
    } catch (error) {
      // Manejo de errores específicos
      if (
        error.message.includes("ya está registrado") ||
        error.message.includes("ya está registrada")
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      // Error genérico
      return res.status(500).json({
        success: false,
        message: "Error al registrar usuario",
        error: error.message,
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.cod;
      const user = await authService.getUserById(userId);

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener perfil",
        error: error.message,
      });
    }
  }

  async verifyToken(req, res) {
    return res.status(200).json({
      success: true,
      message: "Token valido",
      user: req.user,
    });
  }

  async changePassword(req, res) {
    try {
      const { email, newPassword } = req.body;
      await authService.changePassword(email, newPassword);

      return res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      if (error.message === "Contraseña actual incorrecta") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al cambiar contraseña",
        error: error.message,
      });
    }
  }

  async changePasswordAuth(req, res) {
    try {
      //esto seria para obtener el codigo del usuario en cuestion
      const userId = req.user.cod;
      //extraemos parametros
      const { currentPassword, newPassword } = req.body;

      await authService.changePasswordAuthenticated(
        userId,
        currentPassword,
        newPassword,
      );

      return res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      if (error.message === "Contraseña actual incorrecta") {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        });
      }

      if (error.message === "Usuario no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al cambiar contraseña",
        error: error.message,
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.cod;
      const userData = req.body;

      const updatedUser = await authService.updateProfile(userId, userData);

      return res.status(200).json({
        success: true,
        message: "Perfil actualizado exitosamente",
        user: updatedUser,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar perfil",
        error: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      const newToken = await authService.refreshToken(token);

      return res.status(200).json({
        success: true,
        message: "Token renovado exitosamente",
        token: newToken,
      });
    } catch (error) {
      if (error.message === "Token inválido o expirado") {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message === "Usuario inactivo") {
        return res.status(403).json({
          success: false,
          message: "Usuario inactivo. No se puede renovar el token",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al renovar token",
        error: error.message,
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await authService.getAllUsers();

      return res.status(200).json({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: users,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener usuarios",
        error: error.message,
      });
    }
  }

  async agregarPerfile(req, res) {
    try {
      const { nombrePerfil } = req.body;

      const result = await authService.agregarPerfile(nombrePerfil);

      return res.status(201).json({
        success: true,
        message: "Perfil agregado exitosamente",
        data: result.perfil,
      });
    } catch (error) {
      if (error.message === "El nombre del perfil es requerido") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al agregar perfil",
        error: error.message,
      });
    }
  }

  async getPerfiles(req, res) {
    try {
      const perfiles = await authService.getPerfiles();

      return res.status(200).json({
        success: true,
        message: "Perfiles obtenidos exitosamente",
        data: perfiles,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener perfiles",
        error: error.message,
      });
    }
  }

  async editarUsuario(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;

      const updatedUser = await authService.editarUsuario(
        parseInt(id),
        userData,
      );

      return res.status(200).json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: updatedUser,
      });
    } catch (error) {
      if (error.message === "Usuario no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error.message.includes("ya está registrado") ||
        error.message.includes("ya está registrada")
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al actualizar usuario",
        error: error.message,
      });
    }
  }

  async eliminarUsuario(req, res) {
    try {
      const { id } = req.params;

      const result = await authService.eliminarUsuario(parseInt(id));

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Usuario no encontrado") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error al eliminar usuario",
        error: error.message,
      });
    }
  }
}

export default new AuthController();
