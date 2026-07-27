// Ingesta de clima para el módulo "Mapa Climático": trae clima actual y
// pronóstico (OpenWeatherMap, plan gratis: /weather + /forecast de 5
// días/bloques de 3h) por cada punto activo, y lo guarda en
// clima_mapa_actual / clima_mapa_hora / clima_mapa_dia.
//
// No depende de una sesión HTTP (se ejecuta por cron o manualmente) — usa
// una conexión fija a la BD vía las variables POSTGRES_* del .env, igual
// que scripts/create_valoracion_tables.js.

import pkg from "pg";
const { Pool } = pkg;
import cron from "node-cron";
import dotenv from "dotenv";
import Logger from "../helpers/logger.js";
import colors from "colors";
import * as querys from "../querys/clima_mapa.query.js";

dotenv.config();

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

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
// Se cachea unos minutos en memoria para no consultarla en cada tile/punto;
// si por lo que sea no está en la BD, cae de respaldo a la env var.
let cacheKey = { valor: null, expira: 0 };

export async function obtenerApiKeyOpenWeather() {
  const ahora = Date.now();
  if (cacheKey.valor && ahora < cacheKey.expira) return cacheKey.valor;

  const result = await pool.query(querys.buscarKeyOpenWeather);
  const valor = result.rows[0]?.aux || process.env.OPENWEATHER_API_KEY || "";
  cacheKey = { valor, expira: ahora + 5 * 60 * 1000 };
  return valor;
}

async function obtenerPuntosActivos() {
  const result = await pool.query(querys.puntosActivos);
  return result.rows;
}

async function traerClimaActual(lat, lng) {
  const key = await obtenerApiKeyOpenWeather();
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap /weather respondió ${res.status}`);
  }
  return res.json();
}

async function traerPronostico(lat, lng) {
  const key = await obtenerApiKeyOpenWeather();
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

async function ingerirPunto(punto) {
  const { id, lat, lng } = punto;

  const actual = await traerClimaActual(lat, lng);
  await pool.query(querys.upsertActual, [
    id,
    new Date((actual.dt ?? Date.now() / 1000) * 1000),
    actual.main?.temp ?? null,
    actual.main?.feels_like ?? null,
    actual.wind?.speed ?? null,
    actual.weather?.[0]?.icon ?? null,
    actual.weather?.[0]?.description ?? null,
    actual.main?.humidity ?? null,
  ]);

  const pronostico = await traerPronostico(lat, lng);
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

    await pool.query(querys.upsertHora, [
      id,
      fecha,
      JSON.stringify(bloquesJson),
    ]);

    const temps = bloques.map((b) => b.main?.temp).filter((t) => t != null);
    const pops = bloques.map((b) => b.pop ?? 0);
    const medio = bloqueDelMediodia(bloques);

    await pool.query(querys.upsertDia, [
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

// Ejecuta la ingesta para todos los puntos activos. Un punto que falle
// (coordenadas inválidas, timeout, etc.) se registra en `failed` y no
// interrumpe a los demás.
export async function ejecutarIngestaClimaMapa() {
  const puntos = await obtenerPuntosActivos();
  const succeeded = [];
  const failed = [];

  for (const punto of puntos) {
    try {
      await ingerirPunto(punto);
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
}

let cronTask = null;

export async function initClimaMapaCron() {
  const key = await obtenerApiKeyOpenWeather();
  if (!key) {
    Logger.warn(
      colors.yellow(
        "[CLIMA_MAPA] No se encontró key de OpenWeatherMap (tabla ucp codigo=12 ni env) — cron de ingesta NO se activa.",
      ),
    );
    return;
  }

  if (cronTask) {
    cronTask.stop();
  }

  cronTask = cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        await ejecutarIngestaClimaMapa();
      } catch (error) {
        Logger.error(colors.red("[CLIMA_MAPA] Error en cron de ingesta"), error);
      }
    },
    { timezone: "America/Bogota" },
  );

  Logger.info("[CLIMA_MAPA] Cron de ingesta programado: */15 * * * *");
}
