import pkg from "pg";
const { Client } = pkg;
import Logger from "../helpers/logger.js";
import colors from "colors";
import dotenv from "dotenv";

dotenv.config();

export default class UserModel {
  static instance;

  static getInstance() {
    if (!UserModel.instance) {
      UserModel.instance = new UserModel();
    }
    return UserModel.instance;
  }

  // Conectar y desconectar cliente con logs
  async executeQuery(queryFn, queryName, client) {
    try {
      await client.connect();

      const result = await queryFn(client);

      await client.end();

      return result;
    } catch (error) {
      Logger.error(colors.red(`Error UserModel ${queryName}`), error);

      if (client) {
        await client.end().catch(() => {});
      }

      throw new Error("ERROR TECNICO");
    }
  }

  buscarUsuario = async (cod, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = `
      SELECT u.*, up.nombre as perfil
      FROM usu_usuario u
      INNER JOIN usu_usuarioperfil up ON u.codperfil = up.cod
      WHERE u.cod = $1
    `;

        const result = await client.query(consulta, [cod]);

        return result;
      },
      "buscarUsuario",
      client,
    );
  };

  buscarUsuarioxNickname = async (usuario, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = "SELECT * FROM usu_usuario WHERE usuario = $1";
        const result = await client.query(consulta, [usuario]);
        return result;
      },
      "buscarUsuarioxNickname",
      client,
    );
  };

  verificarUsuario = async (usuario, pass, client) => {
    try {
      await client.connect();

      const consulta = `
      SELECT u.*, up.nombre as perfil
      FROM usu_usuario u
      INNER JOIN usu_usuarioperfil up ON up.cod = u.codperfil
      WHERE usuario = $1 AND pass = MD5($2)
    `;

      const result = await client.query(consulta, [usuario, pass]);

      await client.end();

      return result;
    } catch (error) {
      Logger.error(colors.red("Error AuthModel verificarUsuario "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  agregarUsuarioPG = async (
    usuario,
    pass,
    identificacion,
    pnombre,
    snombre,
    papellido,
    sapellido,
    telefono,
    celular,
    email,
    codperfil,
    client,
  ) => {
    return this.executeQuery(
      async (client) => {
        const consulta = `
                INSERT INTO usu_usuario
                (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, email, telefono, celular, estado, codperfil)
                VALUES ($1, MD5($2), $3, $4, $5, $6, $7, $8, $9, $10, 'On', $11)
                RETURNING *
            `;
        const values = [
          usuario,
          pass,
          identificacion,
          pnombre.toUpperCase(),
          snombre.toUpperCase(),
          papellido.toUpperCase(),
          sapellido.toUpperCase(),
          email.toLowerCase(),
          telefono,
          celular,
          codperfil,
        ];
        const result = await client.query(consulta, values);
        return result;
      },
      "agregarUsuarioPG",
      client,
    );
  };

  eliminarUsuario = async (coduser, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = "DELETE FROM usu_usuario WHERE cod = $1";
        const result = await client.query(consulta, [coduser]);
        return result;
      },
      "eliminarUsuario",
      client,
    );
  };

  editarPass = async (codusuario, pass, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = "UPDATE usu_usuario SET pass = MD5($2) WHERE cod = $1";
        const result = await client.query(consulta, [codusuario, pass]);
        return result;
      },
      "editarPass",
      client,
    );
  };

  cargarUsuarios = async (client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = `
                SELECT u.*,
                       CONCAT_WS(' ', u.pnombre, u.snombre) as nombres,
                       CONCAT_WS(' ', u.papellido, u.sapellido) as apellidos
                FROM usu_usuario u
                INNER JOIN usu_usuarioperfil ur ON ur.cod = u.codperfil
                ORDER BY usuario ASC
            `;
        const result = await client.query(consulta);
        return result;
      },
      "cargarUsuarios",
      client,
    );
  };

  editarUsuario = async (
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
    cod,
    client,
  ) => {
    return this.executeQuery(
      async (client) => {
        const consulta = `
                UPDATE usu_usuario
                SET usuario = $1,
                    identificacion = $2,
                    pnombre = $3,
                    snombre = $4,
                    papellido = $5,
                    sapellido = $6,
                    email = $7,
                    telefono = $8,
                    celular = $9,
                    estado = $10,
                    codperfil = $11
                WHERE cod = $12
            `;
        const values = [
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
          cod,
        ];
        const result = await client.query(consulta, values);
        return result;
      },
      "editarUsuario",
      client,
    );
  };

  cargarPerfiles = async (session) => {
    return this.executeQuery(
      async (client) => {
        const consulta = "SELECT * FROM usu_usuarioperfil ORDER BY nombre ASC";
        const result = await client.query(consulta);
        return result;
      },
      "cargarPerfiles",
      session,
    );
  };

  buscarUsuarioxIdentificacion = async (identificacion, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta =
          "SELECT * FROM usu_usuario WHERE identificacion = $1 LIMIT 1";
        const result = await client.query(consulta, [identificacion]);
        return result;
      },
      "buscarUsuarioxIdentificacion",
      client,
    );
  };

  agregarPerfiles = async (nombreperfil, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta =
          "INSERT INTO usu_usuarioperfil (nombre) VALUES ($1) RETURNING *";
        const result = await client.query(consulta, [nombreperfil]);
        return result;
      },
      "agregarPerfiles",
      client,
    );
  };

  buscarImagenUsuario = async (cod) => {
    return this.executeQuery(async (client) => {
      const consulta = "SELECT * FROM usu_usuario WHERE cod = $1 LIMIT 1";
      const result = await client.query(consulta, [cod]);
      return result;
    }, "buscarImagenUsuario");
  };

  editarFotoPerfil = async (cod, foto, foto_path) => {
    return this.executeQuery(async (client) => {
      const consulta = `
                UPDATE usu_usuario
                SET foto = $2, foto_path = $3
                WHERE cod = $1
            `;
      const result = await client.query(consulta, [cod, foto, foto_path]);
      return result;
    }, "editarFotoPerfil");
  };

  borrarFotoPerfil = async (cod) => {
    return this.executeQuery(async (client) => {
      const consulta = `
                UPDATE usu_usuario
                SET foto = '', foto_path = ''
                WHERE cod = $1
            `;
      const result = await client.query(consulta, [cod]);
      return result;
    }, "borrarFotoPerfil");
  };

  editarPerfil = async (cod, nombre) => {
    return this.executeQuery(async (client) => {
      const consulta = `
                UPDATE usu_usuarioperfil
                SET nombre = $2
                WHERE cod = $1
            `;
      const result = await client.query(consulta, [cod, nombre]);
      return result;
    }, "editarPerfil");
  };

  eliminarPerfil = async (cod) => {
    return this.executeQuery(async (client) => {
      const consulta = "DELETE FROM usu_usuarioperfil WHERE cod = $1";
      const result = await client.query(consulta, [cod]);
      return result;
    }, "eliminarPerfil");
  };

  verificarUsuario2 = async (email, client) => {
    return this.executeQuery(
      async (client) => {
        const consulta = `
                SELECT cod FROM usu_usuario
                WHERE email = $1; 
            `;
        const result = await client.query(consulta, [email]);
        console.log(result);
        return result.rows.length > 0 ? result.rows[0].cod : null;
      },
      "verificarUsuario2",
      client,
    );
  };

  buscarBloqueoUsuario = async (usuario) => {
    return this.executeQuery(async (client) => {
      const consulta = "SELECT bloqueo FROM usu_usuario WHERE usuario = $1";
      const result = await client.query(consulta, [usuario]);
      return result;
    }, "buscarBloqueoUsuario");
  };

  actualizarBloqueoUsuario = async (usuario, bloqueo) => {
    return this.executeQuery(async (client) => {
      const consulta = `
                UPDATE usu_usuario
                SET bloqueo = $2
                WHERE usuario = $1
            `;
      const result = await client.query(consulta, [usuario, bloqueo]);
      return result;
    }, "actualizarBloqueoUsuario");
  };
}
