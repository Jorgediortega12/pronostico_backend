import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

// Ciudad origen en datos_clima. Por defecto "Atlantico" (única serie con
// histórico completo). Se puede sobreescribir: node seed_clima_csv.js <ucp>
const UCP = process.argv[2] || "Atlantico";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT) || 5433,
  });

// Mapeo de columnas: PRONOSTICO_climates.t{i}/h{i}/v{i} <- datos_clima.p{i}_t/h/v
const buildColumns = () => {
  const dest = [];
  const src = [];
  for (const suf of ["t", "h", "v"]) {
    for (let i = 1; i <= 24; i++) {
      dest.push(`${suf}${i}`);
      src.push(`p${i}_${suf}`);
    }
  }
  dest.push("fecha");
  src.push("fecha");
  return { dest, src };
};

async function main() {
  const client = createClient();
  await client.connect();

  const { dest, src } = buildColumns();

  // INSERT ... SELECT idempotente: omite fechas ya presentes en destino.
  const insertSQL = `
    INSERT INTO "PRONOSTICO_climates" (${dest.join(", ")})
    SELECT ${src.join(", ")}
    FROM datos_clima dc
    WHERE dc.ucp = $1
      AND dc.fecha NOT IN (SELECT fecha FROM "PRONOSTICO_climates")
    ORDER BY dc.fecha`;

  try {
    const { rows: before } = await client.query(
      `SELECT COUNT(*)::int n, MIN(fecha) mn, MAX(fecha) mx
       FROM datos_clima WHERE ucp = $1`,
      [UCP]
    );
    console.log(`📦 Origen datos_clima (ucp='${UCP}'): ${before[0].n} filas`);
    if (before[0].n === 0) {
      console.log("⚠️  No hay datos para esa ciudad. Nada que cargar.");
      return;
    }
    console.log(`   Rango: ${before[0].mn} → ${before[0].mx}`);

    await client.query("BEGIN");
    const res = await client.query(insertSQL, [UCP]);
    await client.query("COMMIT");

    const { rows: after } = await client.query(
      `SELECT COUNT(*)::int n, MIN(fecha) mn, MAX(fecha) mx FROM "PRONOSTICO_climates"`
    );

    console.log(`\n✅ Carga completada:`);
    console.log(`   - Filas insertadas: ${res.rowCount}`);
    console.log(`   - Total en PRONOSTICO_climates: ${after[0].n}`);
    console.log(`   - Rango destino: ${after[0].mn} → ${after[0].mx}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error, rollback:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("🔌 Conexión cerrada");
  }
}

main();
