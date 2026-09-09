// Verificación de SOLO LECTURA — no modifica nada, no ejecuta INSERT/UPDATE/
// DELETE/ALTER en ningún lado. Pensado para correr en el servidor de
// producción (usa las mismas variables de entorno que el backend real:
// POSTGRES_*_PROXY para jano_proxy, Redis para descubrir las empresas y
// sus credenciales, igual que hace climaController.js/mercadosService).
//
// Qué confirma:
//   1. Que las tablas nuevas (config_ciudades_clima, catalogo_ciudades_clima,
//      owm_ciudades_co, ciudad_id en datos_clima) existen en jano_proxy.
//   2. Que NINGÚN mercado tiene ciudad_id todavía -- si es así, desplegar el
//      código no cambia nada para ningún mercado existente (todos siguen
//      por el camino de "fallback", igual que hoy).
//   3. Por cada empresa activa en Redis: que clima_mapa_puntos y
//      circuitos_geo existen en su propia BD (o avisa si falta alguna).
//
// Uso: node scripts/verificar_antes_de_migrar.mjs

import "dotenv/config";
import pg from "pg";
import RedisModel from "../src/models/redis.model.js";
import { createConectionPG } from "../src/helpers/connections.js";

const linea = () => console.log("─".repeat(70));

const existeTabla = async (client, nombre) => {
  const r = await client.query(`SELECT to_regclass('public.${nombre}') AS existe`);
  return !!r.rows[0].existe;
};

const existeColumna = async (client, tabla, columna) => {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [tabla, columna],
  );
  return r.rowCount > 0;
};

async function verificarJanoProxy() {
  linea();
  console.log("1. JANO_PROXY");
  linea();

  const client = new pg.Client({
    user: process.env.POSTGRES_USER_PROXY,
    host: process.env.POSTGRES_HOST_PROXY || "localhost",
    database: process.env.POSTGRES_DB_PROXY,
    password: process.env.POSTGRES_PASSWORD_PROXY,
    port: process.env.POSTGRES_PORT_PROXY || 5432,
  });
  await client.connect();

  for (const tabla of [
    "config_ciudades_clima",
    "catalogo_ciudades_clima",
    "owm_ciudades_co",
    "datos_clima",
  ]) {
    const existe = await existeTabla(client, tabla);
    console.log(`  ${existe ? "✓" : "✗ FALTA"}  tabla ${tabla}`);
  }

  const tieneCiudadIdConfig = await existeColumna(client, "config_ciudades_clima", "ciudad_id");
  const tieneCiudadIdDatos = await existeColumna(client, "datos_clima", "ciudad_id");
  console.log(`  ${tieneCiudadIdConfig ? "✓" : "✗ FALTA"}  config_ciudades_clima.ciudad_id`);
  console.log(`  ${tieneCiudadIdDatos ? "✓" : "✗ FALTA"}  datos_clima.ciudad_id`);

  if (await existeTabla(client, "config_ciudades_clima")) {
    const configs = await client.query(
      `SELECT db_empresa, ucp, ciudad_nombre, ciudad_id FROM config_ciudades_clima ORDER BY db_empresa, ucp`,
    );
    console.log(`\n  Mercados ya configurados en config_ciudades_clima: ${configs.rowCount}`);
    console.table(configs.rows);
    const conCiudadId = configs.rows.filter((r) => r.ciudad_id !== null);
    if (conCiudadId.length === 0) {
      console.log("  ✓ Ninguno tiene ciudad_id todavía -- desplegar el código no");
      console.log("    cambia el comportamiento de ningún mercado existente.");
    } else {
      console.log(`  ⚠ ${conCiudadId.length} mercado(s) YA tienen ciudad_id -- revisa que sea intencional:`);
      console.table(conCiudadId);
    }
  }

  if (await existeTabla(client, "catalogo_ciudades_clima")) {
    const cat = await client.query(`SELECT COUNT(*) FROM catalogo_ciudades_clima`);
    console.log(`\n  Filas en catalogo_ciudades_clima: ${cat.rows[0].count}`);
  }

  if (await existeTabla(client, "datos_clima")) {
    const resumen = await client.query(`
      SELECT ucp, ciudad_id, COUNT(*) AS filas, MAX(fecha) AS ultima_fecha
      FROM datos_clima GROUP BY ucp, ciudad_id ORDER BY ucp
    `);
    console.log(`\n  Resumen de datos_clima por ucp (${resumen.rowCount} grupos):`);
    console.table(resumen.rows);
  }

  await client.end();
}

async function verificarEmpresas() {
  linea();
  console.log("2. EMPRESAS (Redis + BD de cada una)");
  linea();

  const redisModel = RedisModel.getInstance();
  const keys = await redisModel.keys("mercados*");
  console.log(`  Empresas encontradas en Redis: ${keys.length}`);

  for (const key of keys) {
    const raw = await redisModel.get(key);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const mercado = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    const session = mercado.accesos;

    console.log(`\n  --- ${mercado.nombre ?? key} (${session?.basededatos ?? "sin accesos"}) ---`);
    if (!session?.basededatos) {
      console.log("    ⚠ Sin accesos a BD configurados todavía -- se omite.");
      continue;
    }

    const client = createConectionPG(session);
    try {
      await client.connect();

      const tieneClimaMapa = await existeTabla(client, "clima_mapa_puntos");
      console.log(`    ${tieneClimaMapa ? "✓" : "✗ FALTA"}  clima_mapa_puntos`);
      if (tieneClimaMapa) {
        const colCiudad = await existeColumna(client, "clima_mapa_puntos", "ciudad_nombre");
        console.log(`    ${colCiudad ? "✓" : "✗ FALTA"}  clima_mapa_puntos.ciudad_nombre/accuweather_id/openweather_id`);
        const puntos = await client.query(`SELECT COUNT(*) FROM clima_mapa_puntos`);
        console.log(`      puntos cargados: ${puntos.rows[0].count}`);
      }

      const tieneCircuitos = await existeTabla(client, "circuitos_geo");
      console.log(`    ${tieneCircuitos ? "✓" : "✗ FALTA"}  circuitos_geo`);
      if (tieneCircuitos) {
        const deps = await client.query(
          `SELECT departamento, COUNT(*) FROM circuitos_geo GROUP BY departamento`,
        );
        console.log(`      departamentos/puntos con circuitos: ${deps.rowCount}`);
      }

      const ucps = await client.query(
        `SELECT DISTINCT(aux2) AS mc FROM ucp WHERE codpadre=$1 AND estado=$2 AND aux2 IS NOT NULL AND aux2 <> ''`,
        ["2", "1"],
      );
      console.log(`      mercados (UCP) activos: ${ucps.rowCount} -> ${ucps.rows.map((r) => r.mc).join(", ")}`);
    } catch (err) {
      console.log(`    ✗ Error conectando/consultando: ${err.message}`);
    } finally {
      await client.end();
    }
  }
}

async function main() {
  try {
    await verificarJanoProxy();
    await verificarEmpresas();
    linea();
    console.log("Listo -- ningún dato fue modificado, esto solo leyó.");
  } catch (err) {
    console.error("Error fatal:", err);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode ?? 0);
  }
}

main();
