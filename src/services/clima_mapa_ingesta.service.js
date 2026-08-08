// Ingesta de clima para el módulo "Mapa Climático": trae clima actual y
// pronóstico (OpenWeatherMap, plan gratis: /weather + /forecast de 5
// días/bloques de 3h) por cada punto activo, y lo guarda en
// clima_mapa_actual / clima_mapa_hora / clima_mapa_dia.
//
// Multi-tenant: cada empresa tiene su propia BD (clima_mapa_puntos vive
// ahí, con la columna ucp identificando el mercado dentro de esa empresa).
// ejecutarIngestaClimaMapa recibe la `session` del usuario logueado (igual
// que el resto de clima_mapa.service.js) y se conecta con
// createConectionPG(session) — NO es una operación global/pública, sólo
// actualiza los puntos de la empresa de quien la ejecuta.

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import Logger from "../helpers/logger.js";
import colors from "colors";
import * as querys from "../querys/clima_mapa.query.js";
import { createConectionPG } from "../helpers/connections.js";

dotenv.config();

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

// Pool fijo (vía .env) usado ÚNICAMENTE por el proxy público de tiles
// climáticos (proxyTileClima) — un <img src> no puede llevar
// sesión/Authorization, así que esa ruta no puede resolver la key por
// empresa. La ingesta de puntos NO usa este pool (ver ejecutarIngestaClimaMapa).
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// La key de OpenWeatherMap ya vive en la tabla ucp (codigo=12, "Key API
// Pronóstico") — la misma que usa jano-proxy para su ingesta de datos_clima.
// Se cachea unos minutos en memoria para no consultarla en cada tile; si no
// está en la BD, cae de respaldo a la env var. Sólo para el proxy público.
let cacheKey = { valor: null, expira: 0 };

export async function obtenerApiKeyOpenWeather() {
  const ahora = Date.now();
  if (cacheKey.valor && ahora < cacheKey.expira) return cacheKey.valor;

  const result = await pool.query(querys.buscarKeyOpenWeather);
  const valor = result.rows[0]?.aux || process.env.OPENWEATHER_API_KEY || "";
  cacheKey = { valor, expira: ahora + 5 * 60 * 1000 };
  return valor;
}

async function traerClimaActual(lat, lng, key) {
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap /weather respondió ${res.status}`);
  }
  return res.json();
}

async function traerPronostico(lat, lng, key) {
  const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap /forecast respondió ${res.status}`);
  }
  return res.json();
}

// Agrupa los bloques de 3h del /forecast por fecha (YYYY-MM-DD)
function agruparPorFecha(list) {
  const porFecha = new Map();
  for (const item of list ?? []) {
    const fecha = String(item.dt_txt ?? "").slice(0, 10);
    if (!fecha) continue;
    if (!porFecha.has(fecha)) porFecha.set(fecha, []);
    porFecha.get(fecha).push(item);
  }
  return porFecha;
}

// Bloque más cercano al mediodía, usado para el ícono/descripción del día
function bloqueDelMediodia(bloques) {
  return bloques.reduce((mejor, actual) => {
    const horaActual = Number(String(actual.dt_txt).slice(11, 13));
    const horaMejor = Number(String(mejor.dt_txt).slice(11, 13));
    return Math.abs(horaActual - 12) < Math.abs(horaMejor - 12)
      ? actual
      : mejor;
  }, bloques[0]);
}

// client = conexión ya abierta (createConectionPG(session).connect()) a la
// BD de la empresa dueña del punto — ingerirPunto sólo lee/escribe ahí.
async function ingerirPunto(punto, client, key) {
  const { id, lat, lng } = punto;

  const actual = await traerClimaActual(lat, lng, key);
  await client.query(querys.upsertActual, [
    id,
    new Date((actual.dt ?? Date.now() / 1000) * 1000),
    actual.main?.temp ?? null,
    actual.main?.feels_like ?? null,
    actual.wind?.speed ?? null,
    actual.weather?.[0]?.icon ?? null,
    actual.weather?.[0]?.description ?? null,
    actual.main?.humidity ?? null,
  ]);

  const pronostico = await traerPronostico(lat, lng, key);
  const grupos = agruparPorFecha(pronostico.list);

  for (const [fecha, bloques] of grupos) {
    const bloquesJson = bloques.map((b) => ({
      hora: String(b.dt_txt).slice(11, 16),
      temp: b.main?.temp ?? null,
      pop: b.pop ?? null,
      icon: b.weather?.[0]?.icon ?? null,
      icon_des: b.weather?.[0]?.description ?? null,
      rain: b.rain?.["3h"] ?? 0,
      viento: b.wind?.speed ?? null,
    }));

    await client.query(querys.upsertHora, [id, fecha, JSON.stringify(bloquesJson)]);

    const temps = bloques.map((b) => b.main?.temp).filter((t) => t != null);
    const pops = bloques.map((b) => b.pop ?? 0);
    const medio = bloqueDelMediodia(bloques);

    await client.query(querys.upsertDia, [
      id,
      fecha,
      medio.weather?.[0]?.icon ?? null,
      medio.weather?.[0]?.description ?? null,
      temps.length ? Math.max(...temps) : null,
      temps.length ? Math.min(...temps) : null,
      pops.length ? Math.max(...pops) : null,
    ]);
  }
}

// Ejecuta la ingesta para los puntos activos de LA EMPRESA del usuario
// logueado — `session` son las credenciales de su propia BD (igual que
// listarPuntos/crearPunto/etc. en clima_mapa.service.js), no una operación
// global. Un punto que falle (coordenadas inválidas, timeout, etc.) se
// registra en `failed` y no interrumpe a los demás.
export async function ejecutarIngestaClimaMapa(session) {
  const client = createConectionPG(session);
  await client.connect();
  try {
    const keyResult = await client.query(querys.buscarKeyOpenWeather);
    const key =
      keyResult.rows[0]?.aux || process.env.OPENWEATHER_API_KEY || "";

    const puntosResult = await client.query(querys.puntosActivos);
    const puntos = puntosResult.rows;
    const succeeded = [];
    const failed = [];

    for (const punto of puntos) {
      try {
        await ingerirPunto(punto, client, key);
        succeeded.push({ id: punto.id, nombre: punto.nombre });
      } catch (error) {
        Logger.error(
          colors.red(
            `Error ingiriendo clima para el punto ${punto.nombre} (id=${punto.id})`,
          ),
          error,
        );
        failed.push({
          id: punto.id,
          nombre: punto.nombre,
          error: error.message,
        });
      }
      // pequeño respiro entre puntos, sobra margen contra el límite de OWM
      // (60 llamadas/min en el plan gratis) sin necesidad de throttling agresivo
      await sleep(200);
    }

    Logger.info(
      `[CLIMA_MAPA] Ingesta completada: ${succeeded.length} ok, ${failed.length} fallidos`,
    );

    return { succeeded, failed, total: puntos.length };
  } finally {
    await client.end();
  }
}

// NOTA: el cron automático (cada 15 min) que existía aquí se retiró — este
// módulo es multi-tenant y un cron sin request HTTP no tiene sesión de la
// cual derivar a qué empresa conectarse. Por ahora la actualización es sólo
// manual vía "Actualizar ahora" (ejecutarIngestaClimaMapa(session), arriba).
// Si se retoma la automatización, hay que decidir la estrategia (recorrer
// todas las empresas vía MercadosService.listar(), como resolveSessionByUcp,
// o algún otro mecanismo) antes de volver a llamarlo desde loaders/index.js.
