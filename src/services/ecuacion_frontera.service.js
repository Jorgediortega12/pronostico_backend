// Fallback de consumo por "ecuación de frontera" (3er nivel de prioridad,
// después de PrimeGrid y SCADA): dado un archivo de ecuación (código de
// frontera + signo por UCP) y un archivo de consumo horario por frontera,
// calcula el consumo diario y lo guarda en actualizaciondatos — sólo en las
// fechas donde ese UCP no tenga ya un dato de otra fuente.
//
// Misma lógica que los scripts standalone (scripts/importar_ecuacion_frontera.js,
// importar_consumo_horario_frontera.js, calcular_consumo_ecuacion_frontera.js),
// reutilizada aquí para exponerla vía API — ver esos scripts para uso por
// línea de comandos.

import ExcelJS from "exceljs";
import pkg from "pg";
const { Client } = pkg;
import Logger from "../helpers/logger.js";
import colors from "colors";

const NOMBRE_FUENTE = "ECUACION FRONTERA";
const cols = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

async function resolverCodigoUcp(client, ucpNombre) {
  const res = await client.query("SELECT codigo FROM ucp WHERE aux2 = $1", [
    ucpNombre,
  ]);
  if (res.rowCount === 0) {
    throw new Error(`No se encontró el mercado "${ucpNombre}" en la tabla ucp (aux2)`);
  }
  return res.rows[0].codigo;
}

async function obtenerOCrearFuente(client) {
  const existe = await client.query(
    "SELECT codigo FROM ucp WHERE nombre = $1 AND codpadre = 0",
    [NOMBRE_FUENTE],
  );
  if (existe.rowCount > 0) return existe.rows[0].codigo;
  const creado = await client.query(
    "INSERT INTO ucp (nombre, codpadre, estado) VALUES ($1, 0, 1) RETURNING codigo",
    [NOMBRE_FUENTE],
  );
  return creado.rows[0].codigo;
}

async function crearTablaFlujoDatosHorarios(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS flujo_datos_horarios (
      id SERIAL PRIMARY KEY,
      id_flujo INTEGER NOT NULL REFERENCES flujo(id),
      fecha DATE NOT NULL,
      ${cols.map((c) => `${c} DOUBLE PRECISION`).join(",\n      ")},
      actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (id_flujo, fecha)
    );
  `);
}

// ── 1. Ecuación de frontera (código + signo -> flujo/equivalencia_flujo) ────
export const importarEcuacion = async (rutaArchivo, ucpNombre) => {
  const client = createClient();
  await client.connect();
  try {
    const codigoUcp = await resolverCodigoUcp(client, ucpNombre);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(rutaArchivo);
    const sheet = workbook.worksheets[0];

    const filas = [];
    sheet.eachRow((row) => {
      const codigo = row.getCell(4).value;
      const signo = row.getCell(5).value;
      if (typeof codigo === "string" && /^Frt\d+$/i.test(codigo.trim())) {
        filas.push({ codigo: codigo.trim(), signo: String(signo).trim() });
      }
    });
    if (filas.length === 0) {
      throw new Error(
        "No se encontraron filas con código de frontera (columna D, formato 'FrtNNNNN') en el archivo.",
      );
    }

    await client.query("BEGIN");
    const codigoFuente = await obtenerOCrearFuente(client);

    let flujosCreados = 0;
    let equivalenciasNuevas = 0;
    let equivalenciasActualizadas = 0;
    for (const fila of filas) {
      const signoValor = fila.signo === "+" ? 1 : fila.signo === "-" ? -1 : null;
      if (signoValor === null) continue;

      let flujoResult = await client.query(
        "SELECT id FROM flujo WHERE nombre = $1 AND codigo_fuente = $2",
        [fila.codigo, codigoFuente],
      );
      let idFlujo;
      if (flujoResult.rowCount > 0) {
        idFlujo = flujoResult.rows[0].id;
      } else {
        const nuevo = await client.query(
          "INSERT INTO flujo (nombre, codigo_fuente) VALUES ($1, $2) RETURNING id",
          [fila.codigo, codigoFuente],
        );
        idFlujo = nuevo.rows[0].id;
        flujosCreados++;
      }

      const upsert = await client.query(
        `INSERT INTO equivalencia_flujo (codigo_ucp, id_flujo, valor)
         VALUES ($1, $2, $3)
         ON CONFLICT (codigo_ucp, id_flujo) DO UPDATE SET valor = EXCLUDED.valor, estado = 1
         RETURNING (xmax = 0) AS insertado`,
        [codigoUcp, idFlujo, signoValor],
      );
      if (upsert.rows[0].insertado) equivalenciasNuevas++;
      else equivalenciasActualizadas++;
    }
    await client.query("COMMIT");

    return {
      codigoUcp,
      codigosLeidos: filas.length,
      flujosCreados,
      equivalenciasNuevas,
      equivalenciasActualizadas,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 2. Consumo horario por frontera -> flujo_datos_horarios ─────────────────
export const importarConsumoHorario = async (rutaArchivo) => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaFlujoDatosHorarios(client);

    const flujosResult = await client.query("SELECT id, nombre FROM flujo");
    const flujoPorCodigo = new Map(
      flujosResult.rows.map((f) => [f.nombre.toUpperCase(), f.id]),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(rutaArchivo);
    const sheet = workbook.worksheets[0];

    const acumulado = new Map();
    let filasLeidas = 0;
    let filasUsadas = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      filasLeidas++;

      const codImport = row.getCell(2).value;
      const codExport = row.getCell(3).value;
      const fechaCell = row.getCell(4).value;
      const hora = row.getCell(5).value;
      const activaImport = row.getCell(6).value;
      const activaExport = row.getCell(8).value;

      if (!fechaCell || !hora) return;
      const fechaISO =
        fechaCell instanceof Date
          ? fechaCell.toISOString().slice(0, 10)
          : String(fechaCell).slice(0, 10);
      const periodo = Number(hora);
      if (!(periodo >= 1 && periodo <= 24)) return;

      const registrar = (codigo, valor) => {
        if (!codigo) return;
        const idFlujo = flujoPorCodigo.get(String(codigo).trim().toUpperCase());
        if (!idFlujo) return;
        filasUsadas++;
        const clave = `${idFlujo}|${fechaISO}`;
        if (!acumulado.has(clave)) {
          acumulado.set(clave, { idFlujo, fecha: fechaISO, periodos: {} });
        }
        acumulado.get(clave).periodos[periodo] = Number(valor) || 0;
      };

      registrar(codImport, activaImport);
      registrar(codExport, activaExport);
    });

    if (acumulado.size === 0) {
      throw new Error(
        "Ninguna fila del archivo de consumo coincidió con un código de frontera conocido — ¿importaste primero el archivo de ecuación para este mercado?",
      );
    }

    const insertQuery = `
      INSERT INTO flujo_datos_horarios (id_flujo, fecha, ${cols.join(", ")})
      VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")})
      ON CONFLICT (id_flujo, fecha) DO UPDATE SET
        ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")},
        actualizado_en = NOW();
    `;

    await client.query("BEGIN");
    let procesados = 0;
    for (const { idFlujo, fecha, periodos } of acumulado.values()) {
      const valores = [idFlujo, fecha, ...cols.map((_, i) => periodos[i + 1] ?? null)];
      await client.query(insertQuery, valores);
      procesados++;
    }
    await client.query("COMMIT");

    return { filasLeidas, filasUsadas, diasFlujoGuardados: procesados };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 3. Calcular (Σ signo × horario, kWh->MWh) y guardar en actualizaciondatos
export const calcularYGuardar = async (ucpNombre) => {
  const client = createClient();
  await client.connect();
  try {
    const codigoUcp = await resolverCodigoUcp(client, ucpNombre);

    const calculo = await client.query(
      `
      SELECT
        fd.fecha,
        ${cols.map((c) => `SUM(ef.valor * fd.${c}) / 1000.0 AS ${c}`).join(",\n        ")}
      FROM equivalencia_flujo ef
      JOIN flujo_datos_horarios fd ON fd.id_flujo = ef.id_flujo
      WHERE ef.codigo_ucp = $1 AND ef.estado = 1
      GROUP BY fd.fecha
      ORDER BY fd.fecha;
      `,
      [codigoUcp],
    );

    let insertados = 0;
    let saltados = 0;
    await client.query("BEGIN");
    for (const row of calculo.rows) {
      const fechaISO = row.fecha.toISOString().slice(0, 10);
      const existe = await client.query(
        "SELECT 1 FROM actualizaciondatos WHERE ucp = $1 AND fecha = $2",
        [ucpNombre, fechaISO],
      );
      if (existe.rowCount > 0) {
        saltados++;
        continue;
      }
      const valoresCols = cols.map((c) => row[c]);
      await client.query(
        `INSERT INTO actualizaciondatos (ucp, fecha, ${cols.join(", ")}, estado, observacion)
         VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")}, 'Tipico', 'Calculado desde ecuación de frontera (fallback)')`,
        [ucpNombre, fechaISO, ...valoresCols],
      );
      insertados++;
    }
    await client.query("COMMIT");

    return { diasCalculados: calculo.rowCount, diasInsertados: insertados, diasSaltados: saltados };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── Orquestador: corre los 3 pasos en secuencia ──────────────────────────────
export const procesarEcuacionYConsumo = async (
  rutaEcuacion,
  rutaConsumo,
  ucpNombre,
) => {
  try {
    const ecuacion = await importarEcuacion(rutaEcuacion, ucpNombre);
    const consumo = await importarConsumoHorario(rutaConsumo);
    const calculo = await calcularYGuardar(ucpNombre);
    return { success: true, ecuacion, consumo, calculo };
  } catch (error) {
    Logger.error(colors.red("Error procesarEcuacionYConsumo"), error);
    return { success: false, message: error.message };
  }
};
