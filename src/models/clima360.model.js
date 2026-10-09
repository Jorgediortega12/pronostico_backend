import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Client } = pkg;
import { createConectionPG } from "../helpers/connections.js";
import * as clima from "../querys/clima_mapa.query.js";
import * as q from "../querys/clima360.query.js";

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
