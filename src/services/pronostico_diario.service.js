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

// ── 1. Importar archivo de consumo diario (un mercado por archivo) ──────────
export const importarConsumoDiario = async (rutaArchivo, ucpNombre, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);

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

    if (filas.length === 0) {
      throw new Error(
        `No se encontraron filas de "${VARIABLE_DEMANDA_REAL}" con fecha y total en el archivo.`,
      );
    }

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
      filasLeidas,
      diasGuardados: filas.length,
      diasInsertados: insertados,
      diasActualizados: actualizados,
      fechaMinima: fechasOrdenadas[0] ?? null,
      fechaMaxima: fechasOrdenadas[fechasOrdenadas.length - 1] ?? null,
    };
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
