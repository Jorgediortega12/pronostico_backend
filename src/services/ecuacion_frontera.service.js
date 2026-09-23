// Fallback de consumo por "ecuación de frontera" (3er nivel de prioridad,
// después de PrimeGrid y SCADA): dado un archivo de ecuación (código de
// frontera + signo por UCP) y un archivo de consumo horario por frontera,
// calcula el consumo diario y lo guarda en su propia tabla (respaldo_frontera,
// ver helpers/respaldoFronteraData.js) — nunca en actualizaciondatos, para no
// competir con la demanda oficial de otras fuentes (Loyal/SCADA/PrimeGrid).
//
// Misma lógica que los scripts standalone (scripts/importar_ecuacion_frontera.js,
// importar_consumo_horario_frontera.js, calcular_consumo_ecuacion_frontera.js),
// reutilizada aquí para exponerla vía API — ver esos scripts para uso por
// línea de comandos.

import ExcelJS from "exceljs";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";
import PronosticosService from "./pronosticos.service.js";
import { guardarRespaldoFrontera } from "../helpers/respaldoFronteraData.js";

const pronosticosService = PronosticosService.getInstance();

const NOMBRE_FUENTE = "ECUACION FRONTERA";
const cols = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);

// ── Corrección de sesgo Pronóstico vs Respaldo ───────────────────────────────
// El cálculo crudo de ecuación de frontera puede quedar sistemáticamente por
// encima o por debajo de lo que arroja el modelo de pronóstico. Se estima un
// factor multiplicativo único (walk-forward, ventana móvil de los últimos
// DIAS_VENTANA_CORRECCION días ya cerrados) comparando, hora a hora, el
// pronóstico del modelo contra el cálculo crudo de esos mismos días, y se
// aplica ese factor a TODO el cálculo de Respaldo — incluidos días futuros
// que el modelo de pronóstico todavía no cubre. factor=1 (sin corregir) si
// no hay suficiente superposición o falla el modelo de pronóstico.
const DIAS_VENTANA_CORRECCION = 30;
const VENTANA_CACHE_MS = 24 * 60 * 60 * 1000; // recalcular como máximo 1 vez/día por mercado — correr el modelo de pronóstico es costoso
const cacheFactorCorreccion = new Map(); // ucpNombre -> {factor, diasUsados, calculadoEn}

// Limpia el caché del factor de corrección. Hay que llamarla cada vez que
// cambian los datos de entrada del cálculo crudo (nuevo archivo de consumo
// horario o de ecuación importado) — si no, el factor queda calculado sobre
// datos que ya no existen (p.ej. días que antes tenían consumo y ahora no)
// hasta que expire el TTL de 24h, mostrando un Respaldo con un sesgo que no
// corresponde a los datos actuales. `flujo_datos_horarios` no está separado
// por mercado, así que un archivo de consumo puede afectar el factor de
// varios mercados a la vez — más simple y seguro limpiar todo el caché.
function invalidarCacheFactorCorreccion() {
  cacheFactorCorreccion.clear();
}

async function calcularRawPromedioPorFecha(client, codigoUcp, fechaInicio, fechaFin) {
  const res = await client.query(
    `
    SELECT
      fd.fecha,
      COUNT(*) AS filas,
      ${cols.map((c) => `SUM(ef.valor * fd.${c}) / 1000.0 AS ${c}`).join(",\n      ")}
    FROM equivalencia_flujo ef
    JOIN flujo_datos_horarios fd ON fd.id_flujo = ef.id_flujo
    WHERE ef.codigo_ucp = $1 AND ef.estado = 1
      AND fd.fecha >= $2 AND fd.fecha <= $3
    GROUP BY fd.fecha
    ORDER BY fd.fecha;
    `,
    [codigoUcp, fechaInicio, fechaFin],
  );
  return res.rows;
}

// Días con muchos menos circuitos reportando que lo normal (archivo de
// consumo incompleto para esa fecha) distorsionan el factor de corrección:
// el crudo de ese día sale artificialmente bajo, lo que dispara el cociente
// Pronóstico/crudo para esas 24 horas muy por encima del resto — y como el
// factor es un solo promedio compartido por toda la ventana, ese día
// arrastra hacia arriba la corrección de TODOS los demás días. Se descartan
// del cálculo del factor los días cuya cantidad de circuitos (`filas`) esté
// muy por debajo de la mediana de la ventana.
const UMBRAL_COBERTURA_MINIMA = 0.7; // 70% de la mediana de circuitos/día
function filtrarDiasConCoberturaSuficiente(crudoRows) {
  if (crudoRows.length === 0) return crudoRows;
  const conteos = crudoRows.map((r) => Number(r.filas)).sort((a, b) => a - b);
  const mediana = conteos[Math.floor(conteos.length / 2)];
  if (!mediana) return crudoRows;
  return crudoRows.filter(
    (r) => Number(r.filas) >= mediana * UMBRAL_COBERTURA_MINIMA,
  );
}

async function obtenerFactorCorreccionRespaldo(client, codigoUcp, ucpNombre, session) {
  const cacheado = cacheFactorCorreccion.get(ucpNombre);
  if (cacheado && Date.now() - cacheado.calculadoEn < VENTANA_CACHE_MS) {
    return cacheado;
  }

  const hoy = new Date();
  const fechaFinVentana = new Date(hoy);
  fechaFinVentana.setDate(fechaFinVentana.getDate() - 1); // ayer — hoy puede venir incompleto
  const fechaInicioVentana = new Date(fechaFinVentana);
  fechaInicioVentana.setDate(
    fechaInicioVentana.getDate() - DIAS_VENTANA_CORRECCION,
  );
  const fechaInicioISO = fechaInicioVentana.toISOString().slice(0, 10);
  const fechaFinISO = fechaFinVentana.toISOString().slice(0, 10);

  let resultado = { factor: 1, diasUsados: 0, calculadoEn: Date.now() };
  let calculoExitoso = false;
  try {
    const [crudoRows, playRes] = await Promise.all([
      calcularRawPromedioPorFecha(client, codigoUcp, fechaInicioISO, fechaFinISO),
      pronosticosService.play(
        ucpNombre,
        fechaInicioISO,
        fechaFinISO,
        false,
        true,
        [],
        session,
      ),
    ]);

    const crudoRowsConfiables = filtrarDiasConCoberturaSuficiente(crudoRows);

    if (playRes?.success && playRes.data?.pronosticosTabla?.length && crudoRowsConfiables.length) {
      const pronoPorFecha = new Map(
        playRes.data.pronosticosTabla.map((p) => [p.fecha, p]),
      );
      const ratios = [];
      const fechasUsadas = new Set();
      for (const row of crudoRowsConfiables) {
        const fechaISO = row.fecha.toISOString().slice(0, 10);
        const prono = pronoPorFecha.get(fechaISO);
        if (!prono) continue;
        for (const c of cols) {
          const crudo = Number(row[c]);
          const pronoVal = Number(prono[c]);
          if (crudo > 0 && Number.isFinite(pronoVal)) {
            ratios.push(pronoVal / crudo);
          }
        }
        fechasUsadas.add(fechaISO);
      }
      if (ratios.length > 0) {
        resultado = {
          factor: ratios.reduce((a, b) => a + b, 0) / ratios.length,
          diasUsados: fechasUsadas.size,
          calculadoEn: Date.now(),
        };
        calculoExitoso = true;
      }
    }
  } catch (err) {
    Logger.warn(
      colors.yellow(
        `No se pudo calcular el factor de corrección de Respaldo para ${ucpNombre}, se usa 1 (sin corregir): ${err.message}`,
      ),
    );
  }

  // Solo se cachea un cálculo que realmente encontró superposición — si
  // falló (o no hubo días en común esta vez) se usa 1 sin corregir para
  // ESTA respuesta, pero no se guarda: así una falla transitoria (el
  // modelo de pronóstico tardó, un timeout, etc.) no queda "pegada" 24h
  // en vez de reintentarse en la próxima llamada.
  if (calculoExitoso) {
    cacheFactorCorreccion.set(ucpNombre, resultado);
  }
  return resultado;
}

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
export const importarEcuacion = async (rutaArchivo, ucpNombre, session) => {
  const client = createConectionPG(session);
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
    invalidarCacheFactorCorreccion();

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
export const importarConsumoHorario = async (rutaArchivo, session) => {
  const client = createConectionPG(session);
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

    // Rango de fechas cubierto por el archivo — para que el frontend pueda
    // precargar el rango de "Traer datos actualizados" sin que el usuario
    // tenga que volver a escribirlo a mano.
    const fechasArchivo = Array.from(
      new Set(Array.from(acumulado.values()).map((v) => v.fecha)),
    ).sort();
    const fechaMinima = fechasArchivo[0] ?? null;
    const fechaMaxima = fechasArchivo[fechasArchivo.length - 1] ?? null;

    invalidarCacheFactorCorreccion();

    return {
      filasLeidas,
      filasUsadas,
      diasFlujoGuardados: procesados,
      fechaMinima,
      fechaMaxima,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 3. Calcular (Σ signo × horario, kWh->MWh) y guardar en respaldo_frontera
// Guarda TODAS las fechas calculadas, sin importar si esa fecha ya tiene
// demanda real en `actualizaciondatos` — esta fuente es solo respaldo, vive
// en su propia tabla y nunca compite por la misma fila que la demanda
// oficial de otras fuentes (Loyal/SCADA/PrimeGrid). Pronóstico la usa como
// relleno de su histórico donde no haya demanda real (ver
// obtenerRespaldoGuardado, consumido desde pronosticos.service.js).
// fechaInicio/fechaFin (opcionales, 'YYYY-MM-DD') acotan qué fechas se
// calculan y guardan — sin ellas se comporta como antes (todo el rango
// disponible). Sirven para poder excluir a propósito los últimos días
// cuando llegan con muchos menos circuitos reportando de lo normal (el
// crudo de esos días sale artificialmente bajo, ver
// filtrarDiasConCoberturaSuficiente más arriba) sin tener que esperar a que
// se complete el reporte para no guardar un Respaldo mal escalado.
export const calcularYGuardar = async (
  ucpNombre,
  session,
  fechaInicio,
  fechaFin,
) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    const codigoUcp = await resolverCodigoUcp(client, ucpNombre);

    const condiciones = ["ef.codigo_ucp = $1", "ef.estado = 1"];
    const params = [codigoUcp];
    if (fechaInicio) {
      params.push(fechaInicio);
      condiciones.push(`fd.fecha >= $${params.length}`);
    }
    if (fechaFin) {
      params.push(fechaFin);
      condiciones.push(`fd.fecha <= $${params.length}`);
    }

    const calculo = await client.query(
      `
      SELECT
        fd.fecha,
        ${cols.map((c) => `SUM(ef.valor * fd.${c}) / 1000.0 AS ${c}`).join(",\n        ")}
      FROM equivalencia_flujo ef
      JOIN flujo_datos_horarios fd ON fd.id_flujo = ef.id_flujo
      WHERE ${condiciones.join(" AND ")}
      GROUP BY fd.fecha
      ORDER BY fd.fecha;
      `,
      params,
    );

    const { factor: factorCorreccion, diasUsados: diasUsadosCorreccion } =
      await obtenerFactorCorreccionRespaldo(client, codigoUcp, ucpNombre, session);

    const filas = calculo.rows.map((row) => ({
      fecha: row.fecha.toISOString().slice(0, 10),
      valores: cols.map((c) => Number(row[c]) * factorCorreccion),
    }));

    await client.query("BEGIN");
    await guardarRespaldoFrontera(client, ucpNombre, filas, factorCorreccion);
    await client.query("COMMIT");

    return {
      diasCalculados: calculo.rowCount,
      diasGuardados: filas.length,
      factorCorreccion,
      diasUsadosCorreccion,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
};

// ── 3b. Calcular SIN guardar, para una fuente "DA API EPM" ──────────────────
// A diferencia de calcularYGuardar, esto NO escribe en actualizaciondatos —
// solo devuelve todos los días desde fechaInicio en adelante para los que
// haya consumo de frontera configurado (sin límite superior: si el archivo
// que disparó esto llega hasta el día 15 pero hay frontera calculable hasta
// el 17, igual se devuelve hasta el 17). Por cada día: si ya existe dato de
// otra fuente en actualizaciondatos se devuelve ESE valor real
// (esRespaldo=false, nunca se recalcula ni se pisa); si no existe, se
// devuelve el valor calculado por ecuación de frontera (esRespaldo=true). La
// escritura real a la DB sigue a cargo del flujo normal de "Guardar" que ya
// usan todas las fuentes en Actualización de datos.
export const calcularRespaldoSinGuardar = async (
  ucpNombre,
  fechaInicio,
  session,
) => {
  const client = createConectionPG(session);
  await client.connect();
  try {
    const codigoUcp = await resolverCodigoUcp(client, ucpNombre);

    // Sin /1000 acá: esto queda en kWh crudo (igual que el archivo de
    // consumo). La conversión a MWh la hace el frontend con la "Escala"
    // configurada en la fuente "DA API EPM" (Configuración > Fuentes), NO
    // acá — así queda centralizada en el mismo mecanismo que ya usa el
    // resto de fuentes, en vez de un /1000 fijo en el backend. Ver
    // calcularYGuardar más abajo: ese SÍ mantiene el /1000 porque inserta
    // directo a la DB sin pasar por el frontend.
    const calculo = await client.query(
      `
      SELECT
        fd.fecha,
        ${cols.map((c) => `SUM(ef.valor * fd.${c}) AS ${c}`).join(",\n        ")}
      FROM equivalencia_flujo ef
      JOIN flujo_datos_horarios fd ON fd.id_flujo = ef.id_flujo
      WHERE ef.codigo_ucp = $1 AND ef.estado = 1
        AND fd.fecha >= $2
      GROUP BY fd.fecha
      ORDER BY fd.fecha;
      `,
      [codigoUcp, fechaInicio],
    );

    const { factor: factorCorreccion, diasUsados: diasUsadosCorreccion } =
      await obtenerFactorCorreccionRespaldo(client, codigoUcp, ucpNombre, session);

    const dias = [];
    let diasReales = 0;
    let diasRespaldo = 0;
    for (const row of calculo.rows) {
      const fechaISO = row.fecha.toISOString().slice(0, 10);
      const existente = await client.query(
        `SELECT ${cols.join(", ")} FROM actualizaciondatos WHERE ucp = $1 AND fecha = $2`,
        [ucpNombre, fechaISO],
      );
      // El valor recién calculado por ecuación de frontera va siempre en
      // periodosCalculados, exista o no ya un dato real guardado — así el
      // frontend puede mostrarlo como serie de comparación aunque ese día
      // ya tenga demanda oficial (que sigue siendo la fuente de verdad en
      // `periodos`, sin tocar). Ya corregido por el sesgo vs Pronóstico.
      const periodosCalculados = cols.map(
        (c) => Number(row[c]) * factorCorreccion,
      );

      if (existente.rowCount > 0) {
        // Ya había fila en actualizaciondatos — el respaldo ya no se guarda
        // ahí (vive en respaldo_frontera, tabla aparte), así que cualquier
        // fila encontrada acá es siempre demanda real de otra fuente.
        diasReales++;
        dias.push({
          fecha: fechaISO,
          periodos: cols.map((c) => Number(existente.rows[0][c])),
          esRespaldo: false,
          periodosCalculados,
        });
      } else {
        diasRespaldo++;
        dias.push({
          fecha: fechaISO,
          periodos: periodosCalculados,
          esRespaldo: true,
          periodosCalculados,
        });
      }
    }

    return {
      success: true,
      diasReales,
      diasRespaldo,
      dias,
      factorCorreccion,
      diasUsadosCorreccion,
    };
  } catch (err) {
    Logger.error(colors.red("Error calcularRespaldoSinGuardar"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
  }
};

// ── Orquestador: importa ecuación (opcional) + consumo ───────────────────────
// rutaEcuacion es opcional — el archivo de ecuación (códigos Frt + signo)
// casi no cambia entre cargas; si ya se subió antes para este mercado, no
// hace falta volver a subirlo cada vez que llega un archivo de consumo
// nuevo. Si no hay ecuación configurada aún, importarConsumoHorario lo
// detecta solo (0 códigos coinciden) y lanza un mensaje claro.
//
// A propósito NO llama a calcularYGuardar: cargar el archivo solo deja el
// consumo horario listo (en flujo_datos_horarios) para que el usuario vea
// la línea de Respaldo calculada (vista previa, vía calcularRespaldoSinGuardar)
// y decida guardarla con el botón "Actualizar Respaldo" — mismo patrón de
// "cargar -> previsualizar -> confirmar" que ya usan PrimeGrid/Loyal, en vez
// de guardar en actualizaciondatos de una al subir el archivo.
export const procesarEcuacionYConsumo = async (
  rutaEcuacion,
  rutaConsumo,
  ucpNombre,
  session,
) => {
  try {
    const ecuacion = rutaEcuacion
      ? await importarEcuacion(rutaEcuacion, ucpNombre, session)
      : null;
    const consumo = await importarConsumoHorario(rutaConsumo, session);
    return { success: true, ecuacion, consumo };
  } catch (error) {
    Logger.error(colors.red("Error procesarEcuacionYConsumo"), error);
    return { success: false, message: error.message };
  }
};

// ── Guardar solo la ecuación (códigos Frt + signo), sin consumo ─────────────
// Para el panel "Ecuación frontera (opcional)": configurarla una vez por
// mercado, sin necesidad de subir también un archivo de consumo horario.
export const guardarSoloEcuacion = async (rutaEcuacion, ucpNombre, session) => {
  try {
    const ecuacion = await importarEcuacion(rutaEcuacion, ucpNombre, session);
    return { success: true, ecuacion };
  } catch (error) {
    Logger.error(colors.red("Error guardarSoloEcuacion"), error);
    return { success: false, message: error.message };
  }
};

// ── Guardar solo el Respaldo (recalcula y guarda contra lo que YA esté en
// flujo_datos_horarios/equivalencia_flujo) — sin subir ningún archivo. Para
// re-guardar después de ajustar algo, o simplemente persistir lo que ya se
// venía viendo en "Traer datos actualizados".
export const guardarSoloRespaldo = async (
  ucpNombre,
  session,
  fechaInicio,
  fechaFin,
) => {
  try {
    const calculo = await calcularYGuardar(
      ucpNombre,
      session,
      fechaInicio,
      fechaFin,
    );
    return { success: true, calculo };
  } catch (error) {
    Logger.error(colors.red("Error guardarSoloRespaldo"), error);
    return { success: false, message: error.message };
  }
};
