import pkg from "pg";
const { Client } = pkg;
import * as querys from "../querys/epm_config.query.js";

// Config compartida por toda la app (no por mercado) — misma convención de
// conexión directa a la BD principal que usa circuitos_geo.
export const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

export const crearTablaSiNoExiste = async (client) => {
  await client.query(querys.crearTablaEpmConfig);
};

export const obtenerEpmConfig = async (client) => {
  const { rows } = await client.query(querys.obtenerEpmConfig);
  return rows[0] ?? null;
};

export const guardarEpmConfig = async (client, valores) => {
  const {
    tenant_id,
    client_id,
    client_secret_enc,
    scope,
    login_url,
    consulta_url,
    subscription_key_enc,
  } = valores;
  const { rows } = await client.query(querys.upsertEpmConfig, [
    tenant_id ?? null,
    client_id ?? null,
    client_secret_enc ?? null,
    scope ?? null,
    login_url ?? null,
    consulta_url ?? null,
    subscription_key_enc ?? null,
  ]);
  return rows[0];
};
