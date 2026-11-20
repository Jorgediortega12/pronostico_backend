// Utilidades de prueba: app Express mínima con la ruta de ajustes, usuario simulado y EPM simulado.
import express from "express";
import { crearRouterAjustes } from "../src/api/routes/v1/admin/dashboard/ajustes/index.js";
import {
  crearServicioAjustes,
  fijarServicioAjustes,
} from "../src/services/ajustes.service.js";

export const UUID = "123e4567-e89b-42d3-a456-426614174000";

/** fetch simulado de EPM: registra llamadas y responde `respuesta(url, init)`. */
export function epmFalso(respuesta = () => ({ status: 200, json: { ok: true } })) {
  const llamadas = [];
  const fetch = async (url, init) => {
    llamadas.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    const r = respuesta(url, init, llamadas.length);
    if (r instanceof Error) throw r;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => (r.texto ?? JSON.stringify(r.json ?? null)),
    };
  };
  return { fetch, llamadas };
}

export const modeloFalso = (extra = {}) => ({
  nombreUsuario: async () => "Analista Prueba",
  sesionEmitida: async () => null,
  ultimoRealHasta: async () => null,
  periodosSesion: async () => [],
  reales: async () => [],
  ...extra,
});

/** Levanta la app con un servicio inyectado. Devuelve { url, cerrar, llamadas }. */
export async function levantar({ epm = epmFalso(), model = modeloFalso(), env = {}, user } = {}) {
  const servicio = crearServicioAjustes({
    fetch: epm.fetch,
    model,
    conectar: () => ({}),
    env: { EPM_AJUSTES_URL: "http://epm.test:8001", AJUSTES_SERVICE_TOKEN: "tok-servicio", ...env },
  });
  fijarServicioAjustes(servicio);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user ?? { userId: 7, session: { host: "x" } };
    next();
  });
  app.use("/ajustes", crearRouterAjustes());
  const server = await new Promise((r) => {
    const s = app.listen(0, "127.0.0.1", () => r(s));
  });
  const url = `http://127.0.0.1:${server.address().port}/ajustes`;
  return {
    url,
    llamadas: epm.llamadas,
    cerrar: () => {
      fijarServicioAjustes(null);
      return new Promise((r) => server.close(r));
    },
  };
}

export const pedir = async (base, metodo, ruta, body) => {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json() };
};

export const curva = (v = 1000) => Array.from({ length: 24 }, (_, i) => v + i);
