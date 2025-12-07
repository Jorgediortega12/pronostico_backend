import authService from '../../../../../services/auth.service.js';

class AuthController {

  async login(req, res) {
    try {
      const { usuario, password } = req.body;

      // Consumir el servicio de autenticacion
      const result = await authService.login(usuario, password);

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesion exitoso',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      // Manejo de errores específicos
      if (error.message === 'Usuario o contraseña incorrectos') {
        return res.status(401).json({
          success: false,
          message: 'Credenciales invalidas'
        });
      }

      if (error.message === 'Usuario bloqueado') {
        return res.status(403).json({
          success: false,
          message: 'Usuario bloqueado. Contacte al administrador'
        });
      }

      if (error.message === 'Usuario inactivo') {
        return res.status(403).json({
          success: false,
          message: 'Usuario inactivo. Contacte al administrador'
        });
      }

      // Error genérico
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar sesion',
        error: error.message
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
        message: 'Usuario registrado exitosamente',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      // Manejo de errores específicos
      if (error.message.includes('ya está registrado') || error.message.includes('ya está registrada')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      // Error genérico
      return res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.cod;
      const user = await authService.getUserById(userId);

      return res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfil',
        error: error.message
      });
    }
  }

  async verifyToken(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Token valido',
      user: req.user
    });
  }

  async changePassword(req, res) {
    try {
      const userId = req.user.cod;
      const { oldPassword, newPassword } = req.body;

      await authService.changePassword(userId, oldPassword, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      if (error.message === 'Contraseña actual incorrecta') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al cambiar contraseña',
        error: error.message
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
        message: 'Perfil actualizado exitosamente',
        user: updatedUser
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar perfil',
        error: error.message
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      const newToken = await authService.refreshToken(token);

      return res.status(200).json({
        success: true,
        message: 'Token renovado exitosamente',
        token: newToken
      });
    } catch (error) {
      if (error.message === 'Token inválido o expirado') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Usuario inactivo') {
        return res.status(403).json({
          success: false,
          message: 'Usuario inactivo. No se puede renovar el token'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al renovar token',
        error: error.message
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await authService.getAllUsers();

      return res.status(200).json({
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: users
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: error.message
      });
    }
  }

  async agregarPerfile(req, res) {
    try {
      const { nombrePerfil } = req.body;

      const result = await authService.agregarPerfile(nombrePerfil);

      return res.status(201).json({
        success: true,
        message: 'Perfil agregado exitosamente',
        data: result.perfil
      });
    } catch (error) {
      if (error.message === 'El nombre del perfil es requerido') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al agregar perfil',
        error: error.message
      });
    }
  }

  async getPerfiles(req, res) {
    try {
      const perfiles = await authService.getPerfiles();

      return res.status(200).json({
        success: true,
        message: 'Perfiles obtenidos exitosamente',
        data: perfiles
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfiles',
        error: error.message
      });
    }
  }

  async editarUsuario(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;

      const updatedUser = await authService.editarUsuario(parseInt(id), userData);

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser
      });
    } catch (error) {
      if (error.message === 'Usuario no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('ya está registrado') || error.message.includes('ya está registrada')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message
      });
    }
  }

  async eliminarUsuario(req, res) {
    try {
      const { id } = req.params;

      const result = await authService.eliminarUsuario(parseInt(id));

      return res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Usuario no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message
      });
    }
  }
}

export default new AuthController();