import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import UserModel from '../models/user.model.js';

class AuthService {
  constructor() {
    this.userModel = UserModel.getInstance();
  }

  async login(usuario, password) {
    try {
      // Buscar usuario por nickname
      const result = await this.userModel.verificarUsuario(usuario, password);

      if (!result || result.rows.length === 0) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      const user = result.rows[0];

      // Verificar si el usuario está bloqueado
      if (user.bloqueo && user.bloqueo !== '0' && user.bloqueo !== null) {
        throw new Error('Usuario bloqueado');
      }

      // Verificar si el usuario está activo
      if (user.estado !== 'On') {
        throw new Error('Usuario inactivo');
      }

      // Generar token JWT
      const token = this.generateToken(user);

      // Retornar usuario sin la contraseña
      const { pass, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      throw error;
    }
  }

  generateToken(user) {
    const payload = {
      cod: user.cod,
      usuario: user.usuario,
      email: user.email,
      pnombre: user.pnombre,
      snombre: user.snombre,
      papellido: user.papellido,
      sapellido: user.sapellido,
      perfil: user.perfil || user.codperfil,
      identificacion: user.identificacion
    };

    // Token expira en 24 horas
    const token = jwt.sign(payload, config.secretKey, {
      expiresIn: '24h'
    });

    return token;
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.secretKey);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  async register(userData) {
    try {
      const {
        usuario,
        password,
        identificacion,
        pnombre,
        snombre,
        papellido,
        sapellido,
        telefono,
        celular,
        email,
        codperfil
      } = userData;

      // Verificar si el usuario ya existe
      const existingUserByUsername = await this.userModel.buscarUsuarioxNickname(usuario);
      if (existingUserByUsername && existingUserByUsername.rows.length > 0) {
        throw new Error('El nombre de usuario ya está registrado');
      }

      // Verificar si el email ya existe
      const existingUserByEmail = await this.userModel.buscarUsuarioxNickname(email);
      if (existingUserByEmail && existingUserByEmail.rows.length > 0) {
        throw new Error('El email ya está registrado');
      }

      // Verificar si la identificación ya existe
      if (identificacion) {
        const existingUserByIdentificacion = await this.userModel.buscarUsuarioxIdentificacion(identificacion);
        if (existingUserByIdentificacion && existingUserByIdentificacion.rows.length > 0) {
          throw new Error('La identificación ya está registrada');
        }
      }

      // Agregar usuario
      const result = await this.userModel.agregarUsuarioPG(
        usuario,
        password,
        identificacion || '',
        pnombre || '',
        snombre || '',
        papellido || '',
        sapellido || '',
        telefono || '',
        celular || '',
        email,
        codperfil || '1' // Perfil por defecto
      );

      if (!result || result.rows.length === 0) {
        throw new Error('Error al crear el usuario');
      }

      const newUser = result.rows[0];

      // Generar token JWT
      const token = this.generateToken(newUser);

      // Retornar usuario sin la contraseña
      const { pass, ...userWithoutPassword } = newUser;

      return {
        success: true,
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      throw error;
    }
  }
   
  async getUserById(userId) {
    try {
      const result = await this.userModel.buscarUsuario(userId);

      if (!result || result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = result.rows[0];
      const { pass, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(usuario) {
    try {
      const result = await this.userModel.buscarUsuarioxNickname(usuario);

      if (!result || result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = result.rows[0];
      const { pass, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async changePassword(email, newPassword) {
    try {
      // Verificar la contraseña actual
      const verifyResult = await this.userModel.verificarUsuario2(email);
      console.log(verifyResult);

      if (!verifyResult || verifyResult.length === 0) {
        throw new Error('No se pudo cambiar la contraseña');
      }

      // Actualizar la contraseña
      const updateResult = await this.userModel.editarPass(verifyResult, newPassword);

      if (!updateResult || updateResult.rowCount === 0) {
        throw new Error('Error al actualizar la contraseña');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async changePasswordAuthenticated(userId, currentPassword, newPassword) {
    try {
      // Obtener el usuario por ID
      const userResult = await this.userModel.buscarUsuario(userId);

      if (!userResult || userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = userResult.rows[0];

      // Verificar que la contraseña actual sea correcta
      const verifyResult = await this.userModel.verificarUsuario(user.usuario, currentPassword);

      if (!verifyResult || verifyResult.rows.length === 0) {
        throw new Error('Contraseña actual incorrecta');
      }

      // buscamos el email del usuario para poder confirmar el cambio de contraseña
      const verifyUserId = await this.userModel.verificarUsuario2(user.email);

      if (!verifyUserId || verifyUserId.length === 0) {
        throw new Error('No se pudo cambiar la contraseña');
      }

      // Actualizar la contraseña
      const updateResult = await this.userModel.editarPass(verifyUserId, newPassword);

      if (!updateResult || updateResult.rowCount === 0) {
        throw new Error('Error al actualizar la contraseña');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userId, userData) {
    try {
      const {
        usuario,
        identificacion,
        pnombre,
        snombre,
        papellido,
        sapellido,
        email,
        telefono,
        celular,
        estado,
        codperfil
      } = userData;

      // Obtener datos actuales del usuario
      const currentUserResult = await this.userModel.buscarUsuario(userId);
      if (!currentUserResult || currentUserResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const currentUser = currentUserResult.rows[0];

      // Actualizar usuario
      const result = await this.userModel.editarUsuario(
        usuario || currentUser.usuario,
        identificacion || currentUser.identificacion,
        pnombre || currentUser.pnombre,
        snombre || currentUser.snombre,
        papellido || currentUser.papellido,
        sapellido || currentUser.sapellido,
        email || currentUser.email,
        telefono || currentUser.telefono,
        celular || currentUser.celular,
        estado || currentUser.estado,
        codperfil || currentUser.codperfil,
        userId
      );

      if (!result || result.rowCount === 0) {
        throw new Error('Error al actualizar el usuario');
      }

      // Obtener usuario actualizado
      const updatedUserResult = await this.userModel.buscarUsuario(userId);
      const updatedUser = updatedUserResult.rows[0];
      const { pass, ...userWithoutPassword } = updatedUser;

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async toggleUserBlock(usuario, bloqueo) {
    try {
      const result = await this.userModel.actualizarBloqueoUsuario(usuario, bloqueo);

      if (!result || result.rowCount === 0) {
        throw new Error('Error al actualizar el estado de bloqueo');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
  
  async refreshToken(token) {
    try {
      // Verificar el token actual
      const decoded = this.verifyToken(token);

      // Buscar usuario actualizado
      const result = await this.userModel.buscarUsuario(decoded.cod);

      if (!result || result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = result.rows[0];

      // Verificar si el usuario sigue activo
      if (user.estado !== 'On') {
        throw new Error('Usuario inactivo');
      }

      // Generar nuevo token
      const newToken = this.generateToken(user);

      return newToken;
    } catch (error) {
      throw error;
    }
  }

    async getAllUsers() {
    try {
      const result = await this.userModel.cargarUsuarios();

      if (!result || result.rows.length === 0) {
        return [];
      }

      // Remover contraseñas de todos los usuarios
      const usersWithoutPassword = result.rows.map(user => {
        const { pass, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return usersWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async getPerfiles() {
    try {
      const result = await this.userModel.cargarPerfiles();

      if (!result || result.rows.length === 0) {
        return [];
      }

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async agregarPerfile(nombrePerfil) {
    try {
      const response = await this.userModel.agregarPerfiles(nombrePerfil);
      if (!nombrePerfil) {
        throw new Error('Error al insertar un nuevo perfil');
      }

      return response.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async editarUsuario(userId, userData) {
    try {
      const {
        usuario,
        identificacion,
        pnombre,
        snombre,
        papellido,
        sapellido,
        email,
        telefono,
        celular,
        estado,
        codperfil
      } = userData;

      // Verificar que el usuario existe
      const existingUserResult = await this.userModel.buscarUsuario(userId);
      if (!existingUserResult || existingUserResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const currentUser = existingUserResult.rows[0];

      // Verificar si el nuevo nombre de usuario ya existe (si se está cambiando)
      if (usuario && usuario !== currentUser.usuario) {
        const userByUsername = await this.userModel.buscarUsuarioxNickname(usuario);
        if (userByUsername && userByUsername.rows.length > 0) {
          throw new Error('El nombre de usuario ya está registrado');
        }
      }

      // Verificar si la nueva identificación ya existe (si se está cambiando)
      if (identificacion && identificacion !== currentUser.identificacion) {
        const userByIdentificacion = await this.userModel.buscarUsuarioxIdentificacion(identificacion);
        if (userByIdentificacion && userByIdentificacion.rows.length > 0) {
          throw new Error('La identificación ya está registrada');
        }
      }

      // Actualizar usuario
      const result = await this.userModel.editarUsuario(
        usuario || currentUser.usuario,
        identificacion || currentUser.identificacion,
        pnombre || currentUser.pnombre,
        snombre || currentUser.snombre,
        papellido || currentUser.papellido,
        sapellido || currentUser.sapellido,
        email || currentUser.email,
        telefono || currentUser.telefono,
        celular || currentUser.celular,
        estado || currentUser.estado,
        codperfil || currentUser.codperfil,
        userId
      );

      if (!result || result.rowCount === 0) {
        throw new Error('Error al actualizar el usuario');
      }

      // Obtener usuario actualizado
      const updatedUserResult = await this.userModel.buscarUsuario(userId);
      const updatedUser = updatedUserResult.rows[0];
      const { pass, ...userWithoutPassword } = updatedUser;

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async eliminarUsuario(userId) {
    try {
      // Verificar que el usuario existe
      const existingUserResult = await this.userModel.buscarUsuario(userId);
      if (!existingUserResult || existingUserResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // Eliminar usuario
      const result = await this.userModel.eliminarUsuario(userId);

      if (!result || result.rowCount === 0) {
        throw new Error('Error al eliminar el usuario');
      }

      return {
        success: true,
        message: 'Usuario eliminado exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();