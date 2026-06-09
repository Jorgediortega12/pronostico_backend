import pkg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

const CSV = path.resolve("scripts/cvs/oferta_valoracion.csv");

const MONTHS = {
  ENE: "01",
  JAN: "01",
  FEB: "02",
  MAR: "03",
  ABR: "04",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DIC: "12",
  DEC: "12",
};

// "04-JUN-25" → "2025-06-04"
const parseFecha = (raw) => {
  if (!raw || !String(raw).trim()) return null;
  const m = String(raw)
    .trim()
    .match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return String(raw).trim();
  const dd = m[1].padStart(2, "0");
  const mon = MONTHS[m[2].toUpperCase()];
  if (!mon) return null;
  let yyyy = m[3];
  if (yyyy.length === 2)
    yyyy = parseInt(yyyy, 10) >= 50 ? `19${yyyy}` : `20${yyyy}`;
  return `${yyyy}-${mon}-${dd}`;
};

const toInt = (v) => (v === "" || v == null ? null : parseInt(String(v), 10));
const toText = (v) => (v === "" || v == null ? null : String(v));
const toBool = (v) => {
  if (v === "" || v == null) return true;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "t" || s === "si" || s === "sí";
};

// columna CSV → columna tabla
const COLS = [
  { src: "ID", dest: "id", map: toInt },
  { src: "NOMBRE", dest: "nombre", map: toText },
  { src: "RUTA_ARCHIVO", dest: "ruta_archivo", map: toText },
  { src: "FECHA_CARGA", dest: "fecha_carga", map: parseFecha },
  { src: "USUARIO_ID", dest: "usuario_id", map: toInt },
  { src: "ACTIVO", dest: "activo", map: toBool },
  { src: "NUMERO_OFERTAS", dest: "numero_ofertas", map: toInt },
  { src: "ENERGIA_RESERVA", dest: "energia_reserva", map: toText },
  { src: "PRECIOS_RESERVA", dest: "precios_reserva", map: toText },
  { src: "ENERGIA_OFERTADA", dest: "energia_ofertada", map: toText },
  { src: "PRECIOS_OFERTADOS", dest: "precios_ofertados", map: toText },
  { src: "TIPOS_OFERTA", dest: "tipos_oferta", map: toText },
  { src: "TIPO_PERIODO", dest: "tipo_periodo", map: toText },
  { src: "años_datos", dest: "anios_datos", map: toText },
  { src: "MESES_DATOS", dest: "meses_datos", map: toText },
];

const TABLA = "SphaerAI_ofertas_valoracion";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  });

async function main() {
  if (!fs.existsSync(CSV)) throw new Error(`No existe el CSV: ${CSV}`);
  const filas = parse(fs.readFileSync(CSV, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });

  const cols = COLS.map((c) => c.dest);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  // UPSERT: si la oferta ya existe (id), refresca sus columnas con el CSV.
  const updates = cols
    .filter((c) => c !== "id")
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const sql = `INSERT INTO "${TABLA}" (${cols.join(", ")})
               VALUES (${placeholders})
               ON CONFLICT (id) DO UPDATE SET ${updates}`;

  const client = createClient();
  await client.connect();
  console.log(`📊 Conectado. Migrando ${filas.length} ofertas → ${TABLA}`);

  try {
    await client.query("BEGIN");
    let n = 0;
    for (const fila of filas) {
      const valores = COLS.map((c) => c.map(fila[c.src]));
      await client.query(sql, valores);
      n++;
    }
    // Ajustar la secuencia para no colisionar con ids futuros desde la app.
    await client.query(
      `SELECT setval(pg_get_serial_sequence('"${TABLA}"', 'id'),
         COALESCE((SELECT MAX(id) FROM "${TABLA}"), 1), true)`,
    );
    await client.query("COMMIT");
    console.log(`\n✅ Ofertas migradas/actualizadas: ${n}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error, rollback:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("🔌 Conexión cerrada");
  }
}

main();
