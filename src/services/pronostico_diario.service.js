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
import moment from "moment";
import path from "path";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";
import { getOrCreateDiarioMonthFolder, monthNameSpanish } from "../utils/folders.js";
import { generateXlsxDiarioToFolder } from "../utils/reportGeneratorDiario.js";
import { insertFileRecord } from "../utils/reportGenerator.js";

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

// ── 1d. Última actualización por mercado (mismo patrón que el horario:
// sesion.service.js -> verificarUltimaActualizacionPorUcp) ─────────────────
export const ultimaActualizacionPorUcp = async (session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    const res = await client.query(
      `SELECT DISTINCT ON (ucp) *
       FROM actualizaciondatos_diario
       ORDER BY ucp, fecha DESC`,
    );
    return res.rows;
  } finally {
    await client.end();
  }
};

// ── 1e. Histórico diario completo desde una fecha (sin cota superior) —
// consumido por el servicio Python (epm) para entrenar el modelo diario.
// Mismo rol que configuracion.query.js -> cargarPeriodosxUCPDesdeFecha para
// el módulo horario, pero sobre actualizaciondatos_diario (fecha/total en
// vez de p1..p24) ───────────────────────────────────────────────────────
export const cargarHistoricoDiarioDesdeFecha = async (
  ucpNombre,
  fechaInicio,
  session,
) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    const res = await client.query(
      `SELECT fecha, total, tipo_dia
       FROM actualizaciondatos_diario
       WHERE LOWER(ucp) = LOWER($1) AND fecha >= $2
       ORDER BY fecha ASC`,
      [ucpNombre, fechaInicio],
    );
    return res.rows;
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

function addDaysISO(startISO, days) {
  const dateStr = startISO.includes("T") ? startISO : `${startISO}T00:00:00Z`;
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + Number(days));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── 4. Pronóstico diario (llama al servicio Python /predict-daily) ─────────
// Mismo servicio ML que ya usa Pronósticos horario (callPredict en
// pronosticos.service.js) — mismos hosts/puerto — pero pegándole al
// endpoint /predict-daily (sin desagregación horaria, ver análisis de la
// issue "Desarrollar módulo pronostico en la Temporalidad Diaria").
//
// Dos modos, igual que el horario (pronosticos.service.js -> play()):
//
// - Pronosticar (modoReentreno=false): `fechaInicio` es el primer día que
//   el usuario quiere pronosticar (editable, cualquier fecha, incluso
//   pasada para backtesting) y se traduce a `end_date = fechaInicio - 1
//   día` — el corte de histórico que decide dónde termina el dato real y
//   empieza la predicción (ver run_automated_pipeline en epm/src/api/
//   main.py, mismo mecanismo que /predict-with-base-curve vía
//   derived_end_date). nDias = tamaño exacto del rango pedido.
//
// - Reentreno (modoReentreno=true): igual que play() cuando fecha_fin es
//   null → usa /predict (no /predict-with-base-curve): `fechaInicio` es
//   el piso del histórico de ENTRENAMIENTO (start_date, no end_date) y
//   nDias queda fijo en 30 — reentrenar con "todo el histórico" (un
//   rango de cientos de días) no puede mandarse como nDias porque el
//   pronóstico en sí sigue limitado a 90 días (ver Joi schema); acá solo
//   importa desde cuándo se toma el histórico para entrenar, el
//   pronóstico resultante es solo un vistazo de 30 días con el modelo ya
//   reentrenado.
export const obtenerPronosticoDiario = async (
  ucpNombre,
  fechaInicio,
  nDias,
  forceRetrain = false,
  modoReentreno = false,
) => {
  const hostsToTry = ["127.0.0.1", "localhost"];
  const port = 8001;
  const timeoutMs = 600000;

  const requestBody = modoReentreno
    ? {
        ucp: ucpNombre,
        start_date: fechaInicio,
        n_days: 30,
        force_retrain: true,
      }
    : {
        ucp: ucpNombre,
        end_date: addDaysISO(fechaInicio, -1),
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

// ── 5. Sesiones de Pronóstico Diario — mismo patrón que sesiones/
// sesiones_periodos del módulo horario (configuracion.query.js): una fila
// "sesión" (una versión de una corrida exportada) y N filas "período" (una
// por día), marcadas tipo='P' si es pronóstico o tipo='D' si es histórico
// — el mismo histórico que se veía en el gráfico al momento de exportar,
// no uno vuelto a consultar después. A diferencia del horario no hay
// P1-P24: cada período diario es un solo valor (demanda_total).
async function crearTablasSesionDiaria(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sesiones_diario (
      codigo SERIAL PRIMARY KEY,
      fecha TIMESTAMP NOT NULL DEFAULT NOW(),
      ucp VARCHAR NOT NULL,
      fechainicio DATE NOT NULL,
      fechafin DATE NOT NULL,
      nombre VARCHAR NOT NULL,
      version INT NOT NULL DEFAULT 1,
      usuario VARCHAR,
      nombrearchivo VARCHAR,
      observacion TEXT DEFAULT '',
      codcarpeta INT
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS sesiones_diario_periodos (
      codigo SERIAL PRIMARY KEY,
      codsesion INT NOT NULL REFERENCES sesiones_diario(codigo) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      dia_semana VARCHAR,
      demanda_total DOUBLE PRECISION,
      is_festivo BOOLEAN DEFAULT FALSE,
      is_weekend BOOLEAN DEFAULT FALSE,
      tipo VARCHAR NOT NULL
    );
  `);
}

// ── 6. Exportar — equivalente diario de exportarBulk (pronosticos.service.js):
// genera el archivo físico en la carpeta de mes/Descargas ("Pronósticos
// diarios") y guarda la corrida como sesión: una fila en sesiones_diario
// (versionada por nombre = UCP+DIARIO+dd+mm) más una fila por día en
// sesiones_diario_periodos — tipo='P' por cada día pronosticado, tipo='D'
// por cada día del histórico real que ya estaba guardado en
// actualizaciondatos_diario dentro del mismo rango.
export const exportarPronosticoDiario = async (
  ucpNombre,
  fechaInicio,
  fechaFin,
  predicciones,
  usuario,
  observacion,
  session,
) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaActualizacionDiaria(client);
    await crearTablasSesionDiaria(client);

    const mInicio = moment(fechaInicio, "YYYY-MM-DD");
    const dd = mInicio.format("DD");
    const mm = mInicio.format("MM");
    const yyyy = mInicio.format("YYYY");
    const monthName = monthNameSpanish(Number(mm));
    const fileBaseName = `MC${ucpNombre}DIARIO${dd}${mm}`;
    const nombreSesion = `${ucpNombre}DIARIO${dd}${mm}`;

    const reportDirPhysicalRoot =
      process.env.REPORT_DIR || path.join(process.cwd(), "reportes");

    const folderInfo = await getOrCreateDiarioMonthFolder(
      client,
      ucpNombre,
      yyyy,
      monthName,
      reportDirPhysicalRoot,
    );

    const xlsxResult = await generateXlsxDiarioToFolder({
      predicciones,
      ucp: ucpNombre,
      folderPhysical: folderInfo.folderPathPhysical,
      fileBaseName,
    });

    const rutaBD = `${folderInfo.folderPathLogical}/${xlsxResult.xlsxName}`;
    await insertFileRecord(client, {
      nombreArchivo: xlsxResult.xlsxName,
      rutaArchivo: rutaBD,
      codcarpeta: folderInfo.codcarpeta,
    });

    const historico = await client.query(
      `SELECT fecha, total, tipo_dia
       FROM actualizaciondatos_diario
       WHERE ucp = $1 AND fecha >= $2 AND fecha <= $3
       ORDER BY fecha`,
      [ucpNombre, fechaInicio, fechaFin],
    );

    const prevVersion = await client.query(
      `SELECT MAX(version) AS maxversion FROM sesiones_diario WHERE nombre = $1`,
      [nombreSesion],
    );
    const version = Number(prevVersion.rows[0]?.maxversion ?? 0) + 1;

    await client.query("BEGIN");
    try {
      const insertRes = await client.query(
        `INSERT INTO sesiones_diario
           (ucp, fechainicio, fechafin, nombre, version, usuario, nombrearchivo, observacion, codcarpeta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING codigo`,
        [
          ucpNombre,
          fechaInicio,
          fechaFin,
          nombreSesion,
          version,
          usuario,
          xlsxResult.xlsxName,
          observacion || "",
          folderInfo.codcarpeta,
        ],
      );
      const codsesion = insertRes.rows[0].codigo;

      for (const p of predicciones) {
        await client.query(
          `INSERT INTO sesiones_diario_periodos
             (codsesion, fecha, dia_semana, demanda_total, is_festivo, is_weekend, tipo)
           VALUES ($1,$2,$3,$4,$5,$6,'P')`,
          [
            codsesion,
            p.fecha,
            p.dia_semana ?? null,
            p.demanda_total,
            !!p.is_festivo,
            !!p.is_weekend,
          ],
        );
      }
      for (const h of historico.rows) {
        await client.query(
          `INSERT INTO sesiones_diario_periodos
             (codsesion, fecha, dia_semana, demanda_total, is_festivo, is_weekend, tipo)
           VALUES ($1,$2,$3,$4,false,false,'D')`,
          [codsesion, h.fecha, h.tipo_dia ?? null, h.total],
        );
      }
      await client.query("COMMIT");

      return {
        success: true,
        message: `Pronóstico exportado a Descargas → Pronósticos diarios → ${ucpNombre} → ${yyyy} → ${monthName}`,
        nombre: nombreSesion,
        version,
        archivo: xlsxResult.xlsxName,
        codigo: codsesion,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } finally {
    await client.end();
  }
};

// ── 7. Listar versiones guardadas dentro de una carpeta de mes — mismo rol
// que cargarArchivoVrSesiones para el módulo horario: solo el header de
// sesiones_diario (los períodos se piden aparte al elegir versión, ver
// cargarEjecucionPorCodigo) ─────────────────────────────────────────────
export const listarEjecucionesPorCarpeta = async (codcarpeta, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablasSesionDiaria(client);
    const res = await client.query(
      `SELECT codigo, ucp, fechainicio AS fecha_inicio, fechafin AS fecha_fin,
              nombre, version, nombrearchivo, observacion, fecha AS creado_en
       FROM sesiones_diario
       WHERE codcarpeta = $1
       ORDER BY nombre ASC, version ASC`,
      [codcarpeta],
    );
    return res.rows;
  } finally {
    await client.end();
  }
};

// ── 8. Cargar una ejecución/versión puntual por código — equivalente diario
// de cargarSesion (sesion.service.js): trae el header de sesiones_diario
// más sus períodos, separados en predicciones (tipo='P') e histórico
// (tipo='D') para que "Cargar Pronóstico" restaure el snapshot completo
// (gráfico + tabla) tal cual quedó al exportar, sin re-consultar el
// histórico real actual ────────────────────────────────────────────────
export const cargarEjecucionPorCodigo = async (codigo, session) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablasSesionDiaria(client);
    const header = await client.query(
      `SELECT codigo, ucp, fechainicio AS fecha_inicio, fechafin AS fecha_fin,
              nombre, version, nombrearchivo, observacion, fecha AS creado_en
       FROM sesiones_diario WHERE codigo = $1`,
      [codigo],
    );
    if (header.rows.length === 0) return null;

    const periodos = await client.query(
      `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, dia_semana, demanda_total,
              is_festivo, is_weekend, tipo
       FROM sesiones_diario_periodos
       WHERE codsesion = $1
       ORDER BY fecha ASC`,
      [codigo],
    );

    const predicciones = periodos.rows
      .filter((p) => p.tipo === "P")
      .map((p) => ({
        fecha: p.fecha,
        dia_semana: p.dia_semana,
        demanda_total: Number(p.demanda_total),
        is_festivo: p.is_festivo,
        is_weekend: p.is_weekend,
      }));

    const historico = periodos.rows
      .filter((p) => p.tipo === "D")
      .map((p) => ({
        fecha: p.fecha,
        tipo_dia: p.dia_semana,
        total: Number(p.demanda_total),
      }));

    return { ...header.rows[0], predicciones, historico };
  } finally {
    await client.end();
  }
};
