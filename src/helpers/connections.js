import { Pool } from "pg";
import colors from "colors";
import Logger from "../helpers/logger.js";

// Cache de pools por mercado para reutilizarlos
const mercadosPools = new Map();

export const createConectionPG = (credentials) => {
  // Crear una key única para este pool basada en las credenciales
  const poolKey = `${credentials.host}:${credentials.basededatos}:${credentials.usuario}`;

  // Si ya existe un pool para esta mercado, reutilizarlo
  if (!mercadosPools.has(poolKey)) {
    const newPool = new Pool({
      user: credentials.usuario,
      password: credentials.contrasenia,
      host: credentials.host,
      database: credentials.basededatos,
      port: +credentials.puerto || 5432,
      max: 25,
      // Conexiones idle más de 30s se reciclan — antes eran 100s, tiempo
      // suficiente para que un firewall/balanceador intermedio las cierre
      // del lado del servidor sin que el pool se entere, dejando un cliente
      // "zombi" que cuelga (y eventualmente da timeout) en el próximo query.
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // más tiempo para esperar conexión disponible
      // TCP keepalive: mantiene el socket vivo para que nada intermedio lo
      // considere inactivo y lo cierre en silencio.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    newPool.on("error", (err, client) => {
      Logger.error(`Pool error para ${poolKey}:`, err);
    });

    mercadosPools.set(poolKey, newPool);
    Logger.info(
      colors.green(`✓ Nuevo pool creado para: ${credentials.basededatos}`),
    );
  }

  const pool = mercadosPools.get(poolKey);
  let poolClient = null;

  return {
    async connect() {
      if (!poolClient) {
        poolClient = await pool.connect();
      }
    },

    async query(...args) {
      if (!poolClient) {
        return pool.query(...args);
      }
      return poolClient.query(...args);
    },

    async end() {
      if (poolClient) {
        poolClient.release();
        poolClient = null;
      }
    },

    get processID() {
      return poolClient ? poolClient.processID : null;
    },
  };
};

// Función para limpiar pools (útil para testing o restart)
export const closeAllPools = async () => {
  for (const [key, pool] of mercadosPools.entries()) {
    await pool.end();
    Logger.info(`Pool cerrado: ${key}`);
  }
  mercadosPools.clear();
};
