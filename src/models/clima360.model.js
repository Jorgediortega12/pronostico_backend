import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Client } = pkg;
import { createConectionPG } from "../helpers/connections.js";
import * as clima from "../querys/clima_mapa.query.js";
import * as q from "../querys/clima360.query.js";
import { findOrCreateFolder } from "../utils/folders.js";
import { insertFileRecord } from "../utils/reportGenerator.js";

export default class Clima360Model {
  static instance;
  static getInstance() {
    if (!Clima360Model.instance) Clima360Model.instance = new Clima360Model();
    return Clima360Model.instance;
  }

  // jano_proxy (datos_clima) — conexión fija y compartida, no por tenant.
  #dbProxy = () =>
    new Client({
      user: process.env.POSTGRES_USER_PROXY,
      host: process.env.POSTGRES_HOST_PROXY || "localhost",
      database: process.env.POSTGRES_DB_PROXY,
      password: process.env.POSTGRES_PASSWORD_PROXY,
      port: process.env.POSTGRES_PORT_PROXY || 5432,
    });

  // Corre una función con una conexión del tenant abierta y la cierra siempre.
  #tenant = async (session, fn) => {
    const client = createConectionPG(session);
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  };

  // ids vacío -> todos los puntos activos
  puntosConActual = (session, ids = []) =>
    this.#tenant(session, async (c) => {
      await c.query(clima.agregarColumnasClimaActual);
      const { rows } = await c.query(q.puntosConActual, [ids]);
      return rows;
    });

  horaRango = (session, ids, desde, hasta) =>
    this.#tenant(session, async (c) => (await c.query(q.horaRango, [ids, desde, hasta])).rows);

  diaRango = (session, ids, desde) =>
    this.#tenant(session, async (c) => (await c.query(q.diaRango, [ids, desde])).rows);

  guardarAlertas = (session, alertas) =>
    this.#tenant(session, async (c) => {
      await c.query(q.asegurarTablaAlertas);
      for (const a of alertas) {
        await c.query(q.upsertAlerta, [a.id_punto, a.tipo, a.titulo, a.nivel, a.inicio, a.fin, a.descripcion, a.valor_max]);
      }
    });

  // `desde` = timestamp local (YYYY-MM-DDTHH:mm:ss): trae alertas que no hayan terminado antes.
  listarAlertas = (session, ids, desde) =>
    this.#tenant(session, async (c) => {
      await c.query(q.asegurarTablaAlertas);
      return (await c.query(q.listarAlertas, [desde, ids])).rows;
    });

  listarReportes = (session, limite = 30) =>
    this.#tenant(session, async (c) => {
      await c.query(q.asegurarTablaReportes);
      return (await c.query(q.listarReportes, [limite])).rows;
    });

  // Registra el archivo en Descargas (carpetas/archivos) y el reporte en clima_reportes.
  // Estructura de carpetas: Reportes › Clima › AAAA › Mes. `rutaArchivo` es la ruta
  // lógica "~/reportes/..." que usa Descargas para servir el archivo.
  registrarReporte = (session, { nombreArchivo, rutaArchivo, anio, mes, meta, tamano, usuarioId }) =>
    this.#tenant(session, async (c) => {
      await c.query(q.asegurarTablaReportes);
      const raiz = await findOrCreateFolder(c, "reportes", 0, 1);
      const clima = await findOrCreateFolder(c, "Clima", raiz.codigo, 2);
      const carpAnio = await findOrCreateFolder(c, String(anio), clima.codigo, 3);
      const carpMes = await findOrCreateFolder(c, mes, carpAnio.codigo, 4);
      const archivo = await insertFileRecord(c, { nombreArchivo, rutaArchivo, codcarpeta: carpMes.codigo });
      const { rows } = await c.query(q.insertarReporte, [
        meta.tipo, meta.titulo, meta.formato, nombreArchivo, archivo?.codigo ?? null,
        meta.desde ?? null, meta.hasta ?? null, meta.ciudades ?? null, tamano, usuarioId ?? null,
        new Date(), // hora local del servidor (NOW() de la BD está en UTC)
      ]);
      return { id: rows[0].id, codarchivo: archivo?.codigo ?? null };
    });

  // Histórico diario (24 periodos) de la ciudad de un punto en jano_proxy.
  historicoDiario = async (punto, desde, hasta) => {
    const client = this.#dbProxy();
    await client.connect();
    try {
      const { rows } = await client.query(q.historicoDiario, [
        punto.ucp ?? null,
        punto.accuweather_id ?? null,
        punto.openweather_id ?? null,
        desde,
        hasta,
      ]);
      return rows;
    } finally {
      await client.end();
    }
  };
}
