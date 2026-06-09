import pkg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

const CVS_DIR = path.resolve("scripts/cvs");

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
  if (!m) return String(raw).trim(); // ya viene como ISO u otro formato aceptado
  const dd = m[1].padStart(2, "0");
  const mon = MONTHS[m[2].toUpperCase()];
  if (!mon) return null;
  let yyyy = m[3];
  if (yyyy.length === 2)
    yyyy = parseInt(yyyy, 10) >= 50 ? `19${yyyy}` : `20${yyyy}`;
  return `${yyyy}-${mon}-${dd}`;
};

const toInt = (v) => (v === "" || v == null ? null : parseInt(String(v), 10));
const toFloat = (v) => (v === "" || v == null ? null : parseFloat(String(v)));
const toText = (v) => (v === "" || v == null ? null : String(v));
const toBool = (v) => {
  if (v === "" || v == null) return true;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "t" || s === "si" || s === "sí";
};

const leerCSV = (archivo) => {
  const ruta = path.join(CVS_DIR, archivo);
  if (!fs.existsSync(ruta)) throw new Error(`No existe el CSV: ${ruta}`);
  return parse(fs.readFileSync(ruta, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
};

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  });

// Inserta filas con id explícito; ON CONFLICT (id) DO NOTHING para idempotencia.
const insertar = async (client, tabla, columnas, filas) => {
  const cols = columnas.map((c) => c.dest);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO "${tabla}" (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
  let insertados = 0;
  for (const fila of filas) {
    const valores = columnas.map((c) => c.map(fila[c.src]));
    const res = await client.query(sql, valores);
    insertados += res.rowCount;
  }
  return insertados;
};

const resetSequence = async (client, tabla) => {
  await client.query(
    `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'),
       COALESCE((SELECT MAX(id) FROM "${tabla}"), 1), true)`,
  );
};

async function main() {
  const client = createClient();
  await client.connect();
  console.log("📊 Conectado a la base de datos");

  // ── Mapeos columna CSV → columna tabla ──────────────────────────────────────
  const OFERTAS = [
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

  const ESCENARIOS = [
    { src: "ID", dest: "id", map: toInt },
    { src: "NOMBRE", dest: "nombre", map: toText },
    { src: "OFERTA_ID", dest: "oferta_id", map: toInt },
    { src: "USUARIO_ID", dest: "usuario_id", map: toInt },
    { src: "FECHA_CREACION", dest: "fecha_creacion", map: parseFecha },
    { src: "NUMERO_CONTRATOS_MAX", dest: "numero_contratos_max", map: toInt },
    { src: "IPP_BASE", dest: "ipp_base", map: toFloat },
    {
      src: "RESTRICCIONES_ADICIONALES",
      dest: "restricciones_adicionales",
      map: toText,
    },
    { src: "TAMANO_POBLACION", dest: "tamano_poblacion", map: toInt },
    { src: "NUMERO_GENERACIONES", dest: "numero_generaciones", map: toInt },
    { src: "TOLERANCIA_FUNCION", dest: "tolerancia_funcion", map: toFloat },
    {
      src: "GENERACIONES_ESTANCAMIENTO",
      dest: "generaciones_estancamiento",
      map: toInt,
    },
  ];

  const RESULTADOS = [
    { src: "ID", dest: "id", map: toInt },
    { src: "ESCENARIO_ID", dest: "escenario_id", map: toInt },
    { src: "FECHA_EJECUCION", dest: "fecha_ejecucion", map: parseFecha },
    { src: "TIPO_OPTIMIZACION", dest: "tipo_optimizacion", map: toText },
    { src: "ITERACION", dest: "iteracion", map: toInt },
    {
      src: "PORCENTAJES_CONTRATOS",
      dest: "porcentajes_contratos",
      map: toText,
    },
    {
      src: "PORCENTAJES_POR_PERIODO",
      dest: "porcentajes_por_periodo",
      map: toText,
    },
    {
      src: "ENERGIA_TOTAL_COMPRADA",
      dest: "energia_total_comprada",
      map: toFloat,
    },
    { src: "COBERTURA_PORCENTUAL", dest: "cobertura_porcentual", map: toFloat },
    {
      src: "ERROR_CUADRATICO_MEDIO",
      dest: "error_cuadratico_medio",
      map: toFloat,
    },
    { src: "TARIFA_PONDERADA", dest: "tarifa_ponderada", map: toFloat },
    { src: "COSTO_TOTAL", dest: "costo_total", map: toFloat },
    { src: "ENERGIA_MENSUAL", dest: "energia_mensual", map: toText },
    { src: "COSTO_MENSUAL", dest: "costo_mensual", map: toText },
    { src: "COBERTURA_MENSUAL", dest: "cobertura_mensual", map: toText },
    {
      src: "ENERGIA_POR_CONTRATO_PERIODO",
      dest: "energia_por_contrato_periodo",
      map: toText,
    },
    {
      src: "COSTO_POR_CONTRATO_PERIODO",
      dest: "costo_por_contrato_periodo",
      map: toText,
    },
    {
      src: "TIPOS_CONTRATOS_UTILIZADOS",
      dest: "tipos_contratos_utilizados",
      map: toText,
    },
  ];

  try {
    const ofertas = leerCSV("oferta_valoracion.csv");
    const escenarios = leerCSV("escenario_valoraacion.csv");
    const resultados = leerCSV("resultado_optimizacion.csv");
    console.log(
      `📄 CSV leídos → ofertas: ${ofertas.length}, escenarios: ${escenarios.length}, resultados: ${resultados.length}`,
    );

    await client.query("BEGIN");

    // Orden obligatorio por las FK: ofertas → escenarios → resultados.
    const nOf = await insertar(
      client,
      "SphaerAI_ofertas_valoracion",
      OFERTAS,
      ofertas,
    );
    console.log(`  ✓ Ofertas insertadas:    ${nOf}/${ofertas.length}`);

    const nEs = await insertar(
      client,
      "SphaerAI_escenarios_valoracion",
      ESCENARIOS,
      escenarios,
    );
    console.log(`  ✓ Escenarios insertados: ${nEs}/${escenarios.length}`);

    const nRe = await insertar(
      client,
      "SphaerAI_resultados_optimizacion",
      RESULTADOS,
      resultados,
    );
    console.log(`  ✓ Resultados insertados: ${nRe}/${resultados.length}`);

    // Evitar colisiones de id en futuras inserciones desde la app.
    await resetSequence(client, "SphaerAI_ofertas_valoracion");
    await resetSequence(client, "SphaerAI_escenarios_valoracion");
    await resetSequence(client, "SphaerAI_resultados_optimizacion");

    await client.query("COMMIT");
    console.log("\n✅ Migración completada y secuencias ajustadas.");
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
