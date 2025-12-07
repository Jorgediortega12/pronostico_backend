import pool from '../config/database.js';

/**
 * Clase para manejar las consultas relacionadas con usuarios
 */
class UserQuery {
  constructor() {
    this.pool = pool;
  }

  async buscarUsuario(cod) {
    try {
      const consulta = `
        SELECT u.*, up.nombre as perfil
        FROM usu_usuario u
        INNER JOIN usu_usuarioperfil up ON u.codperfil = up.cod
        WHERE u.cod = $1
      `;
      const result = await this.pool.query(consulta, [cod]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en buscarUsuario:', error);
      throw error;
    }
  }

  async buscarUsuarioxNickname(usuario) {
    try {
      const consulta = 'SELECT * FROM usu_usuario WHERE usuario = $1';
      const result = await this.pool.query(consulta, [usuario]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en buscarUsuarioxNickname:', error);
      throw error;
    }
  }

  async verificarUsuario(usuario, pass) {
    try {
      const consulta = `
        SELECT u.*, up.nombre as perfil
        FROM usu_usuario u
        INNER JOIN usu_usuarioperfil up ON up.cod = u.codperfil
        WHERE usuario = $1 AND pass = MD5($2)
      `;
      const result = await this.pool.query(consulta, [usuario, pass]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en verificarUsuario:', error);
      throw error;
    }
  }

  async agregarUsuario(userData) {
    const {
      usuario,
      pass,
      identificacion,
      pnombre,
      snombre,
      papellido,
      sapellido,
      telefono,
      celular,
      email
    } = userData;

    try {
      const consulta = `
        INSERT INTO usu_usuario 
        (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, email, telefono, celular)
        VALUES ($1, MD5($2), $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING cod
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
        celular
      ];
      const result = await this.pool.query(consulta, values);
      return result.rows[0].cod;
    } catch (error) {
      console.error('Error en agregarUsuario:', error);
      throw error;
    }
  }

  async agregarUsuarioBool(userData) {
    const {
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
      dane = ''
    } = userData;

    try {
      const consulta = `
        INSERT INTO usu_usuario
        (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, email, telefono, celular, estado, dane)
        VALUES ($1, MD5($2), $3, $4, $5, $6, $7, $8, $9, $10, 'On', $11)
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
        dane === '' ? '0' : dane
      ];
      await this.pool.query(consulta, values);
      return true;
    } catch (error) {
      console.error('Error en agregarUsuarioBool:', error);
      return false;
    }
  }

  async agregarUsuarioPG(userData) {
    const {
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
      estado,
      codperfil
    } = userData;

    try {
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
        codperfil
      ];
      const result = await this.pool.query(consulta, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en agregarUsuarioPG:', error);
      throw error;
    }
  }

  async eliminarUsuario(coduser) {
    try {
      const consulta = 'DELETE FROM usu_usuario WHERE cod = $1';
      await this.pool.query(consulta, [coduser]);
      return true;
    } catch (error) {
      console.error('Error en eliminarUsuario:', error);
      return false;
    }
  }

  async editarPass(codusuario, pass) {
    try {
      const consulta = 'UPDATE usu_usuario SET pass = MD5($2) WHERE cod = $1';
      await this.pool.query(consulta, [codusuario, pass]);
      return true;
    } catch (error) {
      console.error('Error en editarPass:', error);
      return false;
    }
  }

  async cargarUsuarios() {
    try {
      const consulta = `
        SELECT u.*,
               CONCAT_WS(' ', u.pnombre, u.snombre) as nombres,
               CONCAT_WS(' ', u.papellido, u.sapellido) as apellidos
        FROM usu_usuario u
        INNER JOIN usu_usuarioperfil ur ON ur.cod = u.codperfil
        ORDER BY usuario ASC
      `;
      const result = await this.pool.query(consulta);
      return result.rows;
    } catch (error) {
      console.error('Error en cargarUsuarios:', error);
      return [];
    }
  }

  async cargarUsuariosBusq(codperfil) {
    try {
      const consulta = `
        SELECT u.*,
               CONCAT_WS(' ', u.pnombre, u.snombre) as nombres,
               CONCAT_WS(' ', u.papellido, u.sapellido) as apellidos
        FROM usu_usuario u
        INNER JOIN usu_usuarioperfil ur ON ur.cod = u.codperfil
        WHERE u.codperfil = $1
        ORDER BY usuario ASC
      `;
      const result = await this.pool.query(consulta, [codperfil]);
      return result.rows;
    } catch (error) {
      console.error('Error en cargarUsuariosBusq:', error);
      return [];
    }
  }

  async editarUsuario(userData) {
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
      cod
    } = userData;

    try {
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
        cod
      ];
      await this.pool.query(consulta, values);
      return true;
    } catch (error) {
      console.error('Error en editarUsuario:', error);
      return false;
    }
  }

  async cargarPerfiles() {
    try {
      const consulta = 'SELECT * FROM usu_usuarioperfil ORDER BY nombre ASC';
      const result = await this.pool.query(consulta);
      return result.rows;
    } catch (error) {
      console.error('Error en cargarPerfiles:', error);
      return [];
    }
  }

  async buscarUsuarioxIdentificacion(identificacion) {
    try {
      const consulta = 'SELECT * FROM usu_usuario WHERE identificacion = $1 LIMIT 1';
      const result = await this.pool.query(consulta, [identificacion]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en buscarUsuarioxIdentificacion:', error);
      throw error;
    }
  }

  async agregarPerfiles(nombreperfil) {
    try {
      const consulta = 'INSERT INTO usu_usuarioperfil (nombre) VALUES ($1)';
      await this.pool.query(consulta, [nombreperfil]);
      return true;
    } catch (error) {
      console.error('Error en agregarPerfiles:', error);
      return false;
    }
  }

  async buscarImagenUsuario(cod) {
    try {
      const consulta = 'SELECT * FROM usu_usuario WHERE cod = $1 LIMIT 1';
      const result = await this.pool.query(consulta, [cod]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en buscarImagenUsuario:', error);
      throw error;
    }
  }

  async editarFotoPerfil(cod, foto, foto_path) {
    try {
      const consulta = `
        UPDATE usu_usuario
        SET foto = $2, foto_path = $3
        WHERE cod = $1
      `;
      await this.pool.query(consulta, [cod, foto, foto_path]);
      return true;
    } catch (error) {
      console.error('Error en editarFotoPerfil:', error);
      return false;
    }
  }

  async borrarFotoPerfil(cod) {
    try {
      const consulta = `
        UPDATE usu_usuario
        SET foto = '', foto_path = ''
        WHERE cod = $1
      `;
      await this.pool.query(consulta, [cod]);
      return true;
    } catch (error) {
      console.error('Error en borrarFotoPerfil:', error);
      return false;
    }
  }

  async editarPerfil(cod, nombre) {
    try {
      const consulta = `
        UPDATE usu_usuarioperfil
        SET nombre = $2
        WHERE cod = $1
      `;
      await this.pool.query(consulta, [cod, nombre]);
      return true;
    } catch (error) {
      console.error('Error en editarPerfil:', error);
      return false;
    }
  }

  async eliminarPerfil(cod) {
    try {
      const consulta = 'DELETE FROM usu_usuarioperfil WHERE cod = $1';
      await this.pool.query(consulta, [cod]);
      return true;
    } catch (error) {
      console.error('Error en eliminarPerfil:', error);
      return false;
    }
  }

  async verificarUsuario2(codusuario, pass) {
    try {
      const consulta = `
        SELECT * FROM usu_usuario
        WHERE cod = $1 AND pass = MD5($2)
      `;
      const result = await this.pool.query(consulta, [codusuario, pass]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en verificarUsuario2:', error);
      throw error;
    }
  }

  async buscarBloqueoUsuario(usuario) {
    try {
      const consulta = 'SELECT bloqueo FROM usu_usuario WHERE usuario = $1';
      const result = await this.pool.query(consulta, [usuario]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error en buscarBloqueoUsuario:', error);
      throw error;
    }
  }

  async actualizarBloqueoUsuario(usuario, bloqueo) {
    try {
      const consulta = `
        UPDATE usu_usuario
        SET bloqueo = $2
        WHERE usuario = $1
      `;
      await this.pool.query(consulta, [usuario, bloqueo]);
      return true;
    } catch (error) {
      console.error('Error en actualizarBloqueoUsuario:', error);
      return false;
    }
  }
}

export default new UserQuery();