// Calcula el consumo diario de un UCP a partir de la ecuación de frontera
// (Σ signo_i × valor_horario_i, por período) y lo guarda en
// actualizaciondatos — SOLO para las fechas donde ese UCP todavía no tiene
// ningún dato (fallback real: nunca pisa lo que ya haya llegado por XM
// oficial / PrimeGrid / SCADA).
//
// Uso: node scripts/calcular_consumo_ecuacion_frontera.js <codigo_ucp> <ucp_nombre>
// Ej:  node scripts/calcular_consumo_ecuacion_frontera.js 151 Antioquia

import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

const cols = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);

async function main() {
  const [codigoUcpArg, ucpNombre] = process.argv.slice(2);
  if (!codigoUcpArg || !ucpNombre) {
    console.log(
      "Uso: node scripts/calcular_consumo_ecuacion_frontera.js <codigo_ucp> <ucp_nombre>",
    );
    process.exit(1);
  }
  const codigoUcp = parseInt(codigoUcpArg, 10);

  const client = createClient();
  await client.connect();

  try {
    // Σ valor(signo) * pN horario, agrupado por fecha — sólo fronteras
    // activas (estado=1) de la ecuación de este UCP. El Excel de origen
    // trae la energía en kWh; actualizaciondatos (y todo lo demás en esta
    // app) trabaja en MWh, de ahí el /1000 — verificado comparando el
    // resultado contra datos reales ya cargados (sin esto salía ~1000x).
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
    console.log(`📊 ${calculo.rowCount} días calculados a partir de la ecuación de frontera`);

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
        continue; // ya hay dato (XM/PrimeGrid/SCADA) — no se pisa
      }

      // "estado" es clasificación de tipo de día (Tipico/festivo/atípico),
      // no la fuente del dato — se deja igual que el resto de filas para no
      // romper lógica downstream que lo lee. La procedencia real queda en
      // "observacion".
      const valoresCols = cols.map((c) => row[c]);
      await client.query(
        `INSERT INTO actualizaciondatos (ucp, fecha, ${cols.join(", ")}, estado, observacion)
         VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")}, 'Tipico', 'Calculado desde ecuación de frontera (fallback)')`,
        [ucpNombre, fechaISO, ...valoresCols],
      );
      insertados++;
    }
    await client.query("COMMIT");

    console.log(`✅ Días insertados (antes no había dato): ${insertados}`);
    console.log(`⏭️  Días saltados (ya tenían dato de otra fuente): ${saltados}`);
    console.log("🎉 Cálculo y carga completados.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
