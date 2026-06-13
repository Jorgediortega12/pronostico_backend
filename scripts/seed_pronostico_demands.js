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
    port: Number(process.env.POSTGRES_PORT) || 5433,
  });

async function main() {
  const client = createClient();
  await client.connect();

  console.log("🚀 Migrando demandas de actualizaciondatos → PRONOSTICO_demands...");
  console.log(`   Host: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`);
  console.log(`   DB:   ${process.env.POSTGRES_DB}`);

  try {
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*) AS total FROM actualizaciondatos`
    );
    console.log(`\n📊 Registros en actualizaciondatos: ${countRows[0].total}`);

    if (Number(countRows[0].total) === 0) {
      console.log("⚠️  No hay datos en actualizaciondatos. Termina el proceso.");
      return;
    }

    await client.query("BEGIN");

    const result = await client.query(`
      INSERT INTO "PRONOSTICO_demands" (
        hora_1,  hora_2,  hora_3,  hora_4,  hora_5,  hora_6,
        hora_7,  hora_8,  hora_9,  hora_10, hora_11, hora_12,
        hora_13, hora_14, hora_15, hora_16, hora_17, hora_18,
        hora_19, hora_20, hora_21, hora_22, hora_23, hora_24,
        total,
        fecha,
        tipo_fecha,
        file_type
      )
      SELECT
        p1,  p2,  p3,  p4,  p5,  p6,
        p7,  p8,  p9,  p10, p11, p12,
        p13, p14, p15, p16, p17, p18,
        p19, p20, p21, p22, p23, p24,
        COALESCE(p1,0)+COALESCE(p2,0)+COALESCE(p3,0)+COALESCE(p4,0)+
        COALESCE(p5,0)+COALESCE(p6,0)+COALESCE(p7,0)+COALESCE(p8,0)+
        COALESCE(p9,0)+COALESCE(p10,0)+COALESCE(p11,0)+COALESCE(p12,0)+
        COALESCE(p13,0)+COALESCE(p14,0)+COALESCE(p15,0)+COALESCE(p16,0)+
        COALESCE(p17,0)+COALESCE(p18,0)+COALESCE(p19,0)+COALESCE(p20,0)+
        COALESCE(p21,0)+COALESCE(p22,0)+COALESCE(p23,0)+COALESCE(p24,0),
        fecha::timestamp,
        '0',
        'txf'
      FROM actualizaciondatos
      ON CONFLICT DO NOTHING
    `);

    await client.query("COMMIT");

    console.log(`\n✅ Migración completada: ${result.rowCount} registros insertados en PRONOSTICO_demands.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error durante la migración:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
