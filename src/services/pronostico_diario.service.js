// Pronóstico en temporalidad diaria — módulo nuevo, separado del horario
// (actualizaciondatos, P1-P24). Acá cada mercado tiene UN solo valor por
// día (TOTAL), no 24 periodos. Ver issue "Desarrollar módulo pronostico en
// la Temporalidad Diaria" para el análisis completo (arquitectura del
// modelo Python, formato del archivo, decisiones pendientes).
//
// A diferencia del módulo horario, la carga es un archivo POR MERCADO (una
// sola hoja, columnas VARIABLE/FECHA/TIPO DIA/TOTAL — mismo formato que
// cada hoja del archivo de ejemplo "datos_diarios_territorios_formateado.xlsx"),
// no un archivo con una hoja por mercado.

import ExcelJS from "exceljs";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

// Por ahora solo se importa esta variable — el archivo de ejemplo no trae
// ninguna otra. Si más adelante llegan más variables (ej. climáticas) por
// esta misma vía, ver la issue: el plan es seguir tomando clima de la
// ingesta ya existente (jano-proxy), no de este archivo.
const VARIABLE_DEMANDA_REAL = "Demanda_Real";

async function crearTablaActualizacionDiaria(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS actualizaciondatos_diario (
      codigo SERIAL PRIMARY KEY,
      ucp VARCHAR NOT NULL,
      fecha DATE NOT NULL,
      total DOUBLE PRECISION,
      tipo_dia VARCHAR,
      estado VARCHAR DEFAULT 'Tipico',
      observacion TEXT DEFAULT '',
      actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (ucp, fecha)
    );
  `);
}

// Guarda (INSERT/UPDATE por fecha) un arreglo ya armado de
// {fecha, tipoDia, total} — usado tanto por importarConsumoDiario (parsea
// el archivo del lado del servidor) como por guardarConsumoDiario (recibe
// filas ya parseadas/validadas del lado del cliente, mismo flujo
// Cargar->Validar->Actualizar que usa Update_data.tsx).
async function guardarFilasDiarias(client, ucpNombre, filas) {
  await client.query("BEGIN");
  let insertados = 0;
  let actualizados = 0;
  for (const { fecha, tipoDia, total } of filas) {
    const res = await client.query(
      `INSERT INTO actualizaciondatos_diario (ucp, fecha, total, tipo_dia)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ucp, fecha) DO UPDATE SET
         total = EXCLUDED.total,
         tipo_dia = EXCLUDED.tipo_dia,
         actualizado_en = NOW()
       RETURNING (xmax = 0) AS insertado`,
      [ucpNombre, fecha, total, tipoDia],
    );
    if (res.rows[0].insertado) insertados++;
    else actualizados++;
  }
  await client.query("COMMIT");

  const fechasOrdenadas = filas.map((f) => f.fecha).sort();
  return {
    diasGuardados: filas.length,
    diasInsertados: insertados,
    diasActualizados: actualizados,
    fechaMinima: fechasOrdenadas[0] ?? null,
    fechaMaxima: fechasOrdenadas[fechasOrdenadas.length - 1] ?? null,
  };
}

// ── 1a. Importar archivo de consumo diario del lado del servidor ────────────
// (un mercado por archivo) — parsea Y guarda de una. Se mantiene por si
// alguna integración lo sigue llamando directo; el flujo de la UI
// (Cargar->Validar->Actualizar) usa parsearArchivoDiario + guardarConsumoDiario.
export const importarConsumoDiario = async (rutaArchivo, ucpNombre, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    const { filas, filasLeidas } = await parsearArchivoDiario(rutaArchivo);

    if (filas.length === 0) {
      throw new Error(
        `No se encontraron filas de "${VARIABLE_DEMANDA_REAL}" con fecha y total en el archivo.`,
      );
    }

    const resultado = await guardarFilasDiarias(client, ucpNombre, filas);
    return { filasLeidas, ...resultado };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 1b. Parsear el archivo SIN guardar — para el paso "Validar" de la UI ────
export async function parsearArchivoDiario(rutaArchivo) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(rutaArchivo);
  const sheet = workbook.worksheets[0];

  const filas = [];
  let filasLeidas = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    filasLeidas++;

    const variable = row.getCell(1).value;
    const fechaCell = row.getCell(2).value;
    const tipoDia = row.getCell(4).value;
    const total = row.getCell(5).value;

    if (variable !== VARIABLE_DEMANDA_REAL) return;
    if (!fechaCell || total == null) return;

    const fechaISO =
      fechaCell instanceof Date
        ? fechaCell.toISOString().slice(0, 10)
        : String(fechaCell).slice(0, 10);

    filas.push({
      fecha: fechaISO,
      tipoDia: tipoDia ? String(tipoDia).trim() : null,
      total: Number(total),
    });
  });

  return { filas, filasLeidas };
}

// ── 1c. Guardar filas ya validadas del lado del cliente (paso "Actualizar") ─
export const guardarConsumoDiario = async (ucpNombre, filas, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    if (!Array.isArray(filas) || filas.length === 0) {
      throw new Error("No hay filas para guardar.");
    }
    return await guardarFilasDiarias(client, ucpNombre, filas);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 2. Cargar datos diarios guardados (para la tabla/gráfico) ───────────────
export const cargarDatosDiarios = async (ucpNombre, fechaInicio, fechaFin, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    const res = await client.query(
      `SELECT codigo, ucp, fecha, total, tipo_dia, estado, observacion
       FROM actualizaciondatos_diario
       WHERE ucp = $1 AND fecha >= $2 AND fecha <= $3
       ORDER BY fecha`,
      [ucpNombre, fechaInicio, fechaFin],
    );
    return res.rows;
  } finally {
    await client.end();
  }
};

// ── 3. Editar tipicidad/observación de un día ya guardado ───────────────────
export const actualizarEstadoDemandaDiaria = async (
  codigo,
  estado,
  observacion,
  session,
) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    const res = await client.query(
      `UPDATE actualizaciondatos_diario SET estado = $2, observacion = $3
       WHERE codigo = $1
       RETURNING *`,
      [codigo, estado, observacion],
    );
    return res.rows[0] ?? null;
  } finally {
    await client.end();
  }
};

// ── 4. Pronóstico diario (llama al servicio Python /predict-daily) ─────────
// Mismo servicio ML que ya usa Pronósticos horario (callPredict en
// pronosticos.service.js) — mismos hosts/puerto — pero pegándole al
// endpoint /predict-daily (sin desagregación horaria, ver análisis de la
// issue "Desarrollar módulo pronostico en la Temporalidad Diaria").
export const obtenerPronosticoDiario = async (
  ucpNombre,
  fechaInicio,
  nDias,
  forceRetrain = false,
) => {
  const hostsToTry = ["127.0.0.1", "localhost"];
  const port = 8001;
  const timeoutMs = 600000;

  const requestBody = {
    ucp: ucpNombre,
    start_date: fechaInicio,
    n_days: nDias,
    force_retrain: forceRetrain,
  };

  for (const host of hostsToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `http://${host}:${port}/predict-daily`;
      Logger.info(
        colors.cyan(`obtenerPronosticoDiario: Ejecutando ${url} para UCP ${ucpNombre}`),
      );

      const res = await fetch(url, {
        method: "POST",
        headers: { accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const statusCode = res.status;
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        Logger.warn(
          colors.yellow(
            `obtenerPronosticoDiario: HTTP ${statusCode} desde ${host}:${port}`,
          ),
        );
        return { success: false, statusCode, data: json };
      }

      Logger.info(
        colors.green(`obtenerPronosticoDiario: Predicción exitosa desde ${host}:${port}`),
      );
      return { success: true, statusCode, data: json };
    } catch (err) {
      clearTimeout(timer);
      const msg =
        err?.name === "AbortError"
          ? `timeout (${timeoutMs}ms)`
          : err?.message || err;
      Logger.warn(
        colors.yellow(
          `obtenerPronosticoDiario: error conectando a ${host}:${port} — ${msg}`,
        ),
      );
    }
  }

  Logger.error(
    colors.red(`obtenerPronosticoDiario: Falló en todos los hosts para ${ucpNombre}`),
  );
  return { success: false, statusCode: 0, data: null };
};
