// Acceso a la tabla `respaldo_frontera` — guarda el cálculo de "ecuación de
// frontera" (fuente "DA API EPM") por su cuenta, separado de
// `actualizaciondatos` (que solo debe contener demanda oficial de las demás
// fuentes: Loyal, SCADA, PrimeGrid). Antes el respaldo se insertaba en
// `actualizaciondatos` marcando la fila con una observación especial y
// saltando las fechas que ya tenían dato — eso ya no aplica: acá se guardan
// TODAS las fechas calculadas, sin importar si esa fecha ya tiene demanda
// real en otra tabla, porque nunca compite por la misma fila.
//
// Vive en un módulo aparte (no dentro de ecuacion_frontera.service.js ni de
// pronosticos.service.js) para que ambos servicios puedan importarlo sin
// crear un import circular entre ellos.

import { createConectionPG } from "./connections.js";

const cols = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);

export async function crearTablaRespaldoFrontera(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS respaldo_frontera (
      ucp VARCHAR NOT NULL,
      fecha DATE NOT NULL,
      ${cols.map((c) => `${c} DOUBLE PRECISION`).join(",\n      ")},
      factor_correccion DOUBLE PRECISION,
      actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ucp, fecha)
    );
  `);
}

// Guarda (INSERT o UPDATE) el respaldo calculado para TODAS las fechas de
// `filas` — sin excepciones, sin importar si esa fecha tiene o no demanda
// real en `actualizaciondatos` (esta tabla es independiente).
export async function guardarRespaldoFrontera(
  client,
  ucpNombre,
  filas, // [{ fecha: 'YYYY-MM-DD', valores: number[24] }]
  factorCorreccion,
) {
  await crearTablaRespaldoFrontera(client);
  for (const { fecha, valores } of filas) {
    await client.query(
      `INSERT INTO respaldo_frontera (ucp, fecha, ${cols.join(", ")}, factor_correccion, actualizado_en)
       VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")}, $${cols.length + 3}, NOW())
       ON CONFLICT (ucp, fecha) DO UPDATE SET
         ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(",\n         ")},
         factor_correccion = EXCLUDED.factor_correccion,
         actualizado_en = NOW()`,
      [ucpNombre, fecha, ...valores, factorCorreccion],
    );
  }
}

// Lee el respaldo ya guardado para un mercado en un rango de fechas — usado
// por Pronóstico (pronosticos.service.js) para completar su histórico donde
// no haya demanda real, sin importar si la fecha tiene o no dato oficial en
// otra fuente. Administra su propia conexión (recibe `session`, no
// `client`) para que quien la llame no tenga que abrir una conexión aparte
// solo para esto.
export async function obtenerRespaldoGuardado(
  session,
  ucpNombre,
  fechaInicio,
  fechaFin,
) {
  const client = createConectionPG(session);
  await client.connect();
  try {
    await crearTablaRespaldoFrontera(client);
    const res = await client.query(
      `SELECT fecha, ${cols.join(", ")}, factor_correccion
       FROM respaldo_frontera
       WHERE ucp = $1 AND fecha >= $2 AND fecha <= $3
       ORDER BY fecha`,
      [ucpNombre, fechaInicio, fechaFin],
    );
    return res.rows;
  } finally {
    await client.end();
  }
}
