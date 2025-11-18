import pkg from 'pg';
const { Client } = pkg;
import Logger from '../helpers/logger.js';
import colors from 'colors';
import dotenv from 'dotenv';

dotenv.config();

export default class UserModel {

    static instance;

    static getInstance() {
        if (!UserModel.instance) {
            UserModel.instance = new UserModel();
        }
        return UserModel.instance;
    }

    // Crear cliente de PostgreSQL
    createClient() {
        return new Client({
            user: process.env.POSTGRES_USER,
            host: process.env.POSTGRES_HOST || 'localhost',
            database: process.env.POSTGRES_DB,
            password: process.env.POSTGRES_PASSWORD,
            port: process.env.POSTGRES_PORT || 5432,
        });
    }

    // Conectar y desconectar cliente con logs
    async executeQuery(queryFn, queryName) {
        const client = this.createClient();
        try {
            await client.connect();
            Logger.info(`${colors.magenta('[  DB  ]')} *** [${colors.blue(client.processID)}]${colors.green('[  OPEN ]')} Conexión Client Pool PostgreSQL iniciada.`);

            const result = await queryFn(client);

            await client.end();
            Logger.info(`${colors.magenta('[  DB  ]')} *** [${colors.blue(client.processID)}]${colors.green('[  OPEN ]')} Conexión Client Pool PostgreSQL finalizada.`);

            return result;
        } catch (error) {
            Logger.error(colors.red(`Error UserModel ${queryName} `), error);
            if (client) {
                await client.end().catch((err) =>
                    Logger.error('Error durante la desconexión', err.stack)
                );
            }
            throw new Error('ERROR TECNICO');
        }
    }

    buscarUsuario = async (cod) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                SELECT u.*, up.nombre as perfil
                FROM usu_usuario u
                INNER JOIN usu_usuarioperfil up ON u.codperfil = up.cod
                WHERE u.cod = $1
            `;
            const result = await client.query(consulta, [cod]);
            return result;
        }, 'buscarUsuario');
    }

    buscarUsuarioxNickname = async (usuario) => {
        return this.executeQuery(async (client) => {
            const consulta = 'SELECT * FROM usu_usuario WHERE usuario = $1';
            const result = await client.query(consulta, [usuario]);
            return result;
        }, 'buscarUsuarioxNickname');
    }

    verificarUsuario = async (usuario, pass) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                SELECT u.*, up.nombre as perfil
                FROM usu_usuario u
                INNER JOIN usu_usuarioperfil up ON up.cod = u.codperfil
                WHERE usuario = $1 AND pass = MD5($2)
            `;
            const result = await client.query(consulta, [usuario, pass]);
            return result;
        }, 'verificarUsuario');
    }

    agregarUsuario = async (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, telefono, celular, email) => {
        return this.executeQuery(async (client) => {
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
            const result = await client.query(consulta, values);
            return result;
        }, 'agregarUsuario');
    }

    agregarUsuarioBool = async (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, telefono, celular, email, dane = '') => {
        return this.executeQuery(async (client) => {
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
            const result = await client.query(consulta, values);
            return result;
        }, 'agregarUsuarioBool');
    }

    agregarUsuarioPG = async (usuario, pass, identificacion, pnombre, snombre, papellido, sapellido, telefono, celular, email, codperfil) => {
        return this.executeQuery(async (client) => {
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
            const result = await client.query(consulta, values);
            return result;
        }, 'agregarUsuarioPG');
    }

    eliminarUsuario = async (coduser) => {
        return this.executeQuery(async (client) => {
            const consulta = 'DELETE FROM usu_usuario WHERE cod = $1';
            const result = await client.query(consulta, [coduser]);
            return result;
        }, 'eliminarUsuario');
    }


    editarPass = async (codusuario, pass) => {
        return this.executeQuery(async (client) => {
            const consulta = 'UPDATE usu_usuario SET pass = MD5($2) WHERE cod = $1';
            const result = await client.query(consulta, [codusuario, pass]);
            return result;
        }, 'editarPass');
    }

    cargarUsuarios = async () => {
        return this.executeQuery(async (client) => {
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
        }, 'cargarUsuarios');
    }

    cargarUsuariosBusq = async (codperfil) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                SELECT u.*,
                       CONCAT_WS(' ', u.pnombre, u.snombre) as nombres,
                       CONCAT_WS(' ', u.papellido, u.sapellido) as apellidos
                FROM usu_usuario u
                INNER JOIN usu_usuarioperfil ur ON ur.cod = u.codperfil
                WHERE u.codperfil = $1
                ORDER BY usuario ASC
            `;
            const result = await client.query(consulta, [codperfil]);
            return result;
        }, 'cargarUsuariosBusq');
    }

    editarUsuario = async (usuario, identificacion, pnombre, snombre, papellido, sapellido, email, telefono, celular, estado, codperfil, cod) => {
        return this.executeQuery(async (client) => {
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
            const result = await client.query(consulta, values);
            return result;
        }, 'editarUsuario');
    }

    cargarPerfiles = async () => {
        return this.executeQuery(async (client) => {
            const consulta = 'SELECT * FROM usu_usuarioperfil ORDER BY nombre ASC';
            const result = await client.query(consulta);
            return result;
        }, 'cargarPerfiles');
    }

    buscarUsuarioxIdentificacion = async (identificacion) => {
        return this.executeQuery(async (client) => {
            const consulta = 'SELECT * FROM usu_usuario WHERE identificacion = $1 LIMIT 1';
            const result = await client.query(consulta, [identificacion]);
            return result;
        }, 'buscarUsuarioxIdentificacion');
    }

    agregarPerfiles = async (nombreperfil) => {
        return this.executeQuery(async (client) => {
            const consulta = 'INSERT INTO usu_usuarioperfil (nombre) VALUES ($1)';
            const result = await client.query(consulta, [nombreperfil]);
            return result;
        }, 'agregarPerfiles');
    }

    buscarImagenUsuario = async (cod) => {
        return this.executeQuery(async (client) => {
            const consulta = 'SELECT * FROM usu_usuario WHERE cod = $1 LIMIT 1';
            const result = await client.query(consulta, [cod]);
            return result;
        }, 'buscarImagenUsuario');
    }

    editarFotoPerfil = async (cod, foto, foto_path) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                UPDATE usu_usuario
                SET foto = $2, foto_path = $3
                WHERE cod = $1
            `;
            const result = await client.query(consulta, [cod, foto, foto_path]);
            return result;
        }, 'editarFotoPerfil');
    }

    borrarFotoPerfil = async (cod) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                UPDATE usu_usuario
                SET foto = '', foto_path = ''
                WHERE cod = $1
            `;
            const result = await client.query(consulta, [cod]);
            return result;
        }, 'borrarFotoPerfil');
    }

    eliminarPerfil = async (cod) => {
        return this.executeQuery(async (client) => {
            const consulta = 'DELETE FROM usu_usuarioperfil WHERE cod = $1';
            const result = await client.query(consulta, [cod]);
            return result;
        }, 'eliminarPerfil');
    }

    verificarUsuario2 = async (codusuario, pass) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                SELECT * FROM usu_usuario
                WHERE cod = $1 AND pass = MD5($2)
            `;
            const result = await client.query(consulta, [codusuario, pass]);
            return result;
        }, 'verificarUsuario2');
    }

    buscarBloqueoUsuario = async (usuario) => {
        return this.executeQuery(async (client) => {
            const consulta = 'SELECT bloqueo FROM usu_usuario WHERE usuario = $1';
            const result = await client.query(consulta, [usuario]);
            return result;
        }, 'buscarBloqueoUsuario');
    }

    actualizarBloqueoUsuario = async (usuario, bloqueo) => {
        return this.executeQuery(async (client) => {
            const consulta = `
                UPDATE usu_usuario
                SET bloqueo = $2
                WHERE usuario = $1
            `;
            const result = await client.query(consulta, [usuario, bloqueo]);
            return result;
        }, 'actualizarBloqueoUsuario');
    }
}