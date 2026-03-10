import jwt from "jsonwebtoken";

import { signToken } from "../helpers/signToken.js";
import { createConectionPG } from "../helpers/connections.js";

import config from "../config/index.js";
import UserModel from "../models/user.model.js";
import RedisModel from "../models/redis.model.js";
import { createToken } from "../helpers/index.js";

class AuthService {
  constructor() {
    this.userModel = UserModel.getInstance();
    this.redisModel = RedisModel.getInstance();
  }

  //Verificando login superadmin
  loginS = async (usuario, password) => {
    try {
      //Key: usuario_perfil_estado_usuario
      const resultKeys = await this.redisModel.keys(`usuarios_*_1_${usuario}`);

      if (resultKeys.length == 0)
        return {
          success: false,
          message: "Este usuario no se encuentra registrado en el sistema.",
        };

      const getInfoData = await this.redisModel.get(resultKeys[0]);
      const data = JSON.parse(getInfoData);
      if (data.contrasenia !== password)
        return {
          success: false,
          message: "Intente nuevamente, las contraseñas no son válidas.",
        };

      delete data.contrasenia;
      const token = signToken({ data, email: data.correo });
      return {
        success: true,
        message: "Datos del usuario.",
        user: { user: data, token },
      };
    } catch (error) {
      Logger.error(colors.red("Error LoginService verifyLoginS "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  async login(uuid, usuario, password) {
    try {
      // 1. Buscar el mercado en Redis por uuid
      const resultKeys = await this.redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length === 0) {
        throw new Error("Mercado no encontrado.");
      }

      const getInfoData = await this.redisModel.get(resultKeys[0]);
      const raw = JSON.parse(getInfoData);
      const mercado = typeof raw === "string" ? JSON.parse(raw) : raw;

      // 2. Verificar que el mercado tiene accesos configurados
      if (!mercado.accesos) {
        throw new Error("Este mercado no tiene base de datos configurada.");
      }

      // 3. Crear conexión dinámica a la BD del mercado
      const client = createConectionPG(mercado.accesos);

      // 4. Verificar usuario/contraseña contra la BD del mercado
      const result = await this.userModel.verificarUsuario(
        usuario,
        password,
        client,
      );
      if (!result || result.rows.length === 0) {
        throw new Error("Usuario o contraseña incorrectos");
      }

      const user = result.rows[0];

      // 5. Validaciones de estado
      if (user.bloqueo && user.bloqueo !== "0" && user.bloqueo !== null) {
        throw new Error("Usuario bloqueado");
      }
      if (user.estado !== "On") {
        throw new Error("Usuario inactivo");
      }

      // 6. Generar token incluyendo info del mercado
      const token = this.generateToken(user, mercado);

      const { pass, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        user: {
          ...userWithoutPassword,
          uuid_mercado: mercado.uuid,
          nombre_mercado: mercado.nombre,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  generateToken(user, mercado) {
    const timeStamp = new Date().getTime();

    // Encriptar los accesos de BD del mercado (igual que instituciones)
    const token = createToken(mercado.accesos, user, timeStamp);

    // El payload público del token solo lleva info del usuario y mercado
    // Las credenciales van encriptadas dentro de dataEncrypt
    return token;
  }

  // Datos de usuario sin credenciales que van en la respuesta al frontend
  // buildUserResponse(user, mercado) {
  //   return {
  //     cod:            user.cod,
  //     usuario:        user.usuario,
  //     email:          user.email,
  //     pnombre:        user.pnombre,
  //     snombre:        user.snombre,
  //     papellido:      user.papellido,
  //     sapellido:      user.sapellido,
  //     perfil:         user.perfil || user.codperfil,
  //     identificacion: user.identificacion,
  //     uuid_mercado:   mercado.uuid,
  //     nombre_mercado: mercado.nombre,
  //   };
  // }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.secretKey);
      return decoded;
    } catch (error) {
      throw new Error("Token inválido o expirado");
    }
  }

  async register(userData, session) {
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
        codperfil,
        uuid,
      } = userData;

      // 1. Buscar el mercado en Redis por uuid
      const resultKeys = await this.redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length === 0) {
        throw new Error("Mercado no encontrado.");
      }

      const getInfoData = await this.redisModel.get(resultKeys[0]);
      const raw = JSON.parse(getInfoData);
      const mercado = typeof raw === "string" ? JSON.parse(raw) : raw;

      // 2. Verificar que el mercado tiene accesos configurados
      if (!mercado.accesos) {
        throw new Error("Este mercado no tiene base de datos configurada.");
      }

      const client = createConectionPG(session);

      // Verificar si el usuario ya existe
      const existingUserByUsername =
        await this.userModel.buscarUsuarioxNickname(usuario, client);
      if (existingUserByUsername && existingUserByUsername.rows.length > 0) {
        throw new Error("El nombre de usuario ya está registrado");
      }

      // const client2 = createConectionPG(session);
      // // Verificar si el email ya existe
      // const existingUserByEmail = await this.userModel.buscarUsuarioxNickname(
      //   email,
      //   client2,
      // );
      // if (existingUserByEmail && existingUserByEmail.rows.length > 0) {
      //   throw new Error("El email ya está registrado");
      // }

      // Verificar si la identificación ya existe
      if (identificacion) {
        const client3 = createConectionPG(session);
        const existingUserByIdentificacion =
          await this.userModel.buscarUsuarioxIdentificacion(
            identificacion,
            client3,
          );
        if (
          existingUserByIdentificacion &&
          existingUserByIdentificacion.rows.length > 0
        ) {
          throw new Error("La identificación ya está registrada");
        }
      }
      const client4 = createConectionPG(session);
      // Agregar usuario
      const result = await this.userModel.agregarUsuarioPG(
        usuario,
        password,
        identificacion || "",
        pnombre || "",
        snombre || "",
        papellido || "",
        sapellido || "",
        telefono || "",
        celular || "",
        email,
        codperfil || "1", // Perfil por defecto
        client4,
      );

      if (!result || result.rows.length === 0) {
        throw new Error("Error al crear el usuario");
      }

      const newUser = result.rows[0];

      // Generar token JWT
      const token = this.generateToken(newUser, mercado);

      // Retornar usuario sin la contraseña
      const { pass, ...userWithoutPassword } = newUser;

      return {
        success: true,
        token,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId, session) {
    try {
      const client = createConectionPG(session);
      const result = await this.userModel.buscarUsuario(userId, client);

      if (!result || result.rows.length === 0) {
        throw new Error("Usuario no encontrado");
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
        throw new Error("No se pudo cambiar la contraseña");
      }

      // Actualizar la contraseña
      const updateResult = await this.userModel.editarPass(
        verifyResult,
        newPassword,
      );

      if (!updateResult || updateResult.rowCount === 0) {
        throw new Error("Error al actualizar la contraseña");
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async changePasswordAuthenticated(
    userId,
    currentPassword,
    newPassword,
    session,
  ) {
    try {
      const client1 = createConectionPG(session);
      // Obtener el usuario por ID
      const userResult = await this.userModel.buscarUsuario(userId, client1);

      if (!userResult || userResult.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const user = userResult.rows[0];

      const client2 = createConectionPG(session);
      // Verificar que la contraseña actual sea correcta
      const verifyResult = await this.userModel.verificarUsuario(
        user.usuario,
        currentPassword,
        client2,
      );

      if (!verifyResult || verifyResult.rows.length === 0) {
        throw new Error("Contraseña actual incorrecta");
      }

      const client3 = createConectionPG(session);

      // buscamos el email del usuario para poder confirmar el cambio de contraseña
      const verifyUserId = await this.userModel.verificarUsuario2(
        user.email,
        client3,
      );

      if (!verifyUserId || verifyUserId.length === 0) {
        throw new Error("No se pudo cambiar la contraseña");
      }

      const client4 = createConectionPG(session);
      // Actualizar la contraseña
      const updateResult = await this.userModel.editarPass(
        verifyUserId,
        newPassword,
        client4,
      );

      if (!updateResult || updateResult.rowCount === 0) {
        throw new Error("Error al actualizar la contraseña");
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
        codperfil,
      } = userData;

      // Obtener datos actuales del usuario
      const currentUserResult = await this.userModel.buscarUsuario(userId);
      if (!currentUserResult || currentUserResult.rows.length === 0) {
        throw new Error("Usuario no encontrado");
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
        userId,
      );

      if (!result || result.rowCount === 0) {
        throw new Error("Error al actualizar el usuario");
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
      const result = await this.userModel.actualizarBloqueoUsuario(
        usuario,
        bloqueo,
      );

      if (!result || result.rowCount === 0) {
        throw new Error("Error al actualizar el estado de bloqueo");
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(token, uuid) {
    try {
      // 1. Buscar el mercado en Redis por uuid
      const resultKeys = await this.redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length === 0) {
        throw new Error("Mercado no encontrado.");
      }

      const getInfoData = await this.redisModel.get(resultKeys[0]);
      const raw = JSON.parse(getInfoData);
      const mercado = typeof raw === "string" ? JSON.parse(raw) : raw;

      // 2. Verificar que el mercado tiene accesos configurados
      if (!mercado.accesos) {
        throw new Error("Este mercado no tiene base de datos configurada.");
      }

      // Verificar el token actual
      const decoded = this.verifyToken(token);

      // Buscar usuario actualizado
      const result = await this.userModel.buscarUsuario(decoded.cod);

      if (!result || result.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const user = result.rows[0];

      // Verificar si el usuario sigue activo
      if (user.estado !== "On") {
        throw new Error("Usuario inactivo");
      }

      // Generar nuevo token
      const newToken = this.generateToken(user, mercado);

      return newToken;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(session) {
    try {
      const client = createConectionPG(session);
      const result = await this.userModel.cargarUsuarios(client);

      if (!result || result.rows.length === 0) {
        return [];
      }

      // Remover contraseñas de todos los usuarios
      const usersWithoutPassword = result.rows.map((user) => {
        const { pass, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return usersWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async getPerfiles(session) {
    try {
      const client = createConectionPG(session);
      const result = await this.userModel.cargarPerfiles(client);

      if (!result || result.rows.length === 0) {
        return [];
      }

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async agregarPerfile(nombrePerfil, session) {
    try {
      const client = createConectionPG(session);
      const response = await this.userModel.agregarPerfiles(
        nombrePerfil,
        client,
      );
      if (!nombrePerfil) {
        throw new Error("Error al insertar un nuevo perfil");
      }

      return response.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async editarUsuario(userId, userData, session) {
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
        codperfil,
      } = userData;

      const client = createConectionPG(session);
      // Verificar que el usuario existe
      const existingUserResult = await this.userModel.buscarUsuario(
        userId,
        client,
      );
      if (!existingUserResult || existingUserResult.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const currentUser = existingUserResult.rows[0];

      // Verificar si el nuevo nombre de usuario ya existe (si se está cambiando)
      if (usuario && usuario !== currentUser.usuario) {
        const client2 = createConectionPG(session);
        const userByUsername = await this.userModel.buscarUsuarioxNickname(
          usuario,
          client2,
        );
        if (userByUsername && userByUsername.rows.length > 0) {
          throw new Error("El nombre de usuario ya está registrado");
        }
      }

      // Verificar si la nueva identificación ya existe (si se está cambiando)
      if (identificacion && identificacion !== currentUser.identificacion) {
        const client3 = createConectionPG(session);
        const userByIdentificacion =
          await this.userModel.buscarUsuarioxIdentificacion(
            identificacion,
            client3,
          );
        if (userByIdentificacion && userByIdentificacion.rows.length > 0) {
          throw new Error("La identificación ya está registrada");
        }
      }

      const client4 = createConectionPG(session);
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
        userId,
        client4,
      );

      if (!result || result.rowCount === 0) {
        throw new Error("Error al actualizar el usuario");
      }

      const client5 = createConectionPG(session);
      // Obtener usuario actualizado
      const updatedUserResult = await this.userModel.buscarUsuario(
        userId,
        client5,
      );
      const updatedUser = updatedUserResult.rows[0];
      const { pass, ...userWithoutPassword } = updatedUser;

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async eliminarUsuario(userId, session) {
    try {
      const client = createConectionPG(session);
      // Verificar que el usuario existe
      const existingUserResult = await this.userModel.buscarUsuario(
        userId,
        client,
      );
      if (!existingUserResult || existingUserResult.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const client2 = createConectionPG(session);
      // Eliminar usuario
      const result = await this.userModel.eliminarUsuario(userId, client2);

      if (!result || result.rowCount === 0) {
        throw new Error("Error al eliminar el usuario");
      }

      return {
        success: true,
        message: "Usuario eliminado exitosamente",
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
