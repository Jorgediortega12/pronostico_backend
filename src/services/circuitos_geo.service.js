// Carga y consulta de circuitos eléctricos (líneas) y sus puntos (fusibles,
// seccionadores, interruptores, etc.) por departamento, a partir de
// archivos KMZ/KML (Google Earth) — para pintarlos como capa en el Mapa
// Climático. Cada Placemark del KML se guarda como una fila con su
// geometría en GeoJSON (MultiLineString para circuitos, Point para el
// resto).

import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import pkg from "pg";
const { Client } = pkg;
import Logger from "../helpers/logger.js";
import colors from "colors";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

const crearTablaSiNoExiste = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS circuitos_geo (
      id SERIAL PRIMARY KEY,
      departamento VARCHAR(100) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      subestacion VARCHAR(255),
      nivel_tension VARCHAR(50),
      propiedad VARCHAR(100),
      tipo VARCHAR(100),
      circuito_relacionado VARCHAR(255),
      geometria JSONB NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  // Por si la tabla ya existía de antes de agregar tipo/circuito_relacionado.
  await client.query(`ALTER TABLE circuitos_geo ADD COLUMN IF NOT EXISTS tipo VARCHAR(100);`);
  await client.query(
    `ALTER TABLE circuitos_geo ADD COLUMN IF NOT EXISTS circuito_relacionado VARCHAR(255);`,
  );
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_circuitos_geo_departamento
    ON circuitos_geo (departamento);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_circuitos_geo_nombre
    ON circuitos_geo (departamento, nombre);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_circuitos_geo_relacionado
    ON circuitos_geo (departamento, circuito_relacionado);
  `);
};

const asArray = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);

// "<b>Circuito:</b> CALAMAR 2<br/>..." -> "CALAMAR 2"
const extraerCampo = (descripcion, etiqueta) => {
  if (!descripcion) return null;
  const m = descripcion.match(new RegExp(`<b>${etiqueta}:?</b>\\s*([^<]*)`, "i"));
  return m ? m[1].trim() : null;
};

// "-74.95,10.12,12 -74.95,10.13,12" -> [[-74.95,10.12],[-74.95,10.13]]
const parsearCoordenadas = (coordText) => {
  if (!coordText) return [];
  return coordText
    .trim()
    .split(/\s+/)
    .map((tupla) => {
      const [lon, lat] = tupla.split(",").map(Number);
      return [lon, lat];
    })
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
};

const extraerLineStrings = (placemark) => {
  const lineStrings = [
    ...asArray(placemark.LineString),
    ...asArray(placemark.MultiGeometry?.LineString),
  ];
  return lineStrings
    .map((ls) => parsearCoordenadas(ls.coordinates))
    .filter((coords) => coords.length >= 2);
};

const extraerPunto = (placemark) => {
  const point = placemark.Point ?? placemark.MultiGeometry?.Point;
  if (!point?.coordinates) return null;
  const [coords] = parsearCoordenadas(point.coordinates);
  return coords ?? null;
};

const recolectarPlacemarks = (nodo, acumulador) => {
  if (!nodo) return;
  asArray(nodo.Placemark).forEach((p) => acumulador.push(p));
  asArray(nodo.Folder).forEach((f) => recolectarPlacemarks(f, acumulador));
};

export const parsearKmz = (rutaArchivo) => {
  const buffer = fs.readFileSync(rutaArchivo);
  let kmlTexto;

  if (rutaArchivo.toLowerCase().endsWith(".kml")) {
    kmlTexto = buffer.toString("utf-8");
  } else {
    const zip = new AdmZip(buffer);
    const entradaKml = zip
      .getEntries()
      .find((e) => e.entryName.toLowerCase().endsWith(".kml"));
    if (!entradaKml) throw new Error("El KMZ no contiene ningún archivo .kml");
    kmlTexto = zip.readAsText(entradaKml, "utf-8");
  }

  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
  const doc = parser.parse(kmlTexto);
  const documentNode = doc?.kml?.Document;
  if (!documentNode) throw new Error("Formato KML inválido: no se encontró <Document>");

  const placemarks = [];
  recolectarPlacemarks(documentNode, placemarks);

  const circuitos = [];
  for (const p of placemarks) {
    const coordinates = extraerLineStrings(p);
    if (coordinates.length > 0) {
      const descripcion = p.description ?? "";
      circuitos.push({
        nombre: (p.name ?? "").toString().trim() || "(sin nombre)",
        subestacion: extraerCampo(descripcion, "Subestaci[oó]n"),
        nivel_tension: extraerCampo(descripcion, "Nivel de Tensi[oó]n"),
        propiedad: extraerCampo(descripcion, "Propiedad"),
        tipo: "Circuito",
        circuito_relacionado: null,
        geometria: { type: "MultiLineString", coordinates },
      });
      continue;
    }

    // Sin línea: si tiene <Point>, se guarda su ubicación + los campos que
    // permiten identificarlo y relacionarlo con su circuito (fusibles,
    // seccionadores, interruptores, etc.) — sin el resto de la ficha
    // técnica del KML.
    const punto = extraerPunto(p);
    if (punto) {
      const descripcion = p.description ?? "";
      circuitos.push({
        nombre: (p.name ?? "").toString().trim() || "(sin nombre)",
        subestacion: extraerCampo(descripcion, "NOMBRE SUBESTACION"),
        nivel_tension: extraerCampo(descripcion, "TENSION"),
        propiedad: null,
        tipo: extraerCampo(descripcion, "Tipo de entidad"),
        circuito_relacionado: extraerCampo(descripcion, "NOMBRE CIRCUITO/LINEA"),
        geometria: { type: "Point", coordinates: punto },
      });
    }
  }

  return circuitos;
};

export const cargarCircuitosDepartamento = async (departamento, rutaArchivo) => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaSiNoExiste(client);

    const circuitos = parsearKmz(rutaArchivo);
    if (circuitos.length === 0) {
      return { success: false, message: "No se encontraron circuitos ni puntos en el archivo." };
    }

    await client.query("BEGIN");
    // Reemplaza lo que hubiera antes para este departamento.
    await client.query("DELETE FROM circuitos_geo WHERE departamento = $1", [departamento]);

    const TAM_LOTE = 500;
    for (let i = 0; i < circuitos.length; i += TAM_LOTE) {
      const lote = circuitos.slice(i, i + TAM_LOTE);
      const valores = [];
      const parametros = [];
      lote.forEach((c, idx) => {
        const base = idx * 8;
        valores.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`,
        );
        parametros.push(
          departamento,
          c.nombre,
          c.subestacion,
          c.nivel_tension,
          c.propiedad,
          c.tipo,
          c.circuito_relacionado,
          JSON.stringify(c.geometria),
        );
      });
      await client.query(
        `INSERT INTO circuitos_geo
         (departamento, nombre, subestacion, nivel_tension, propiedad, tipo, circuito_relacionado, geometria)
         VALUES ${valores.join(", ")}`,
        parametros,
      );
    }
    await client.query("COMMIT");

    const totalLineas = circuitos.filter((c) => c.geometria.type === "MultiLineString").length;
    const totalPuntos = circuitos.filter((c) => c.geometria.type === "Point").length;
    return {
      success: true,
      departamento,
      totalCircuitos: circuitos.length,
      totalLineas,
      totalPuntos,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    Logger.error(colors.red("Error cargarCircuitosDepartamento"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
    fs.unlink(rutaArchivo, () => {});
  }
};

export const obtenerCircuitosDepartamento = async (departamento) => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaSiNoExiste(client);
    const res = await client.query(
      `SELECT nombre, subestacion, nivel_tension, propiedad, tipo, circuito_relacionado, geometria
       FROM circuitos_geo WHERE departamento = $1`,
      [departamento],
    );
    const features = res.rows.map((row) => ({
      type: "Feature",
      properties: {
        nombre: row.nombre,
        subestacion: row.subestacion,
        nivel_tension: row.nivel_tension,
        propiedad: row.propiedad,
        tipo: row.tipo,
        circuito_relacionado: row.circuito_relacionado,
      },
      geometry: row.geometria,
    }));
    return {
      success: true,
      data: { type: "FeatureCollection", features },
    };
  } catch (err) {
    Logger.error(colors.red("Error obtenerCircuitosDepartamento"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
  }
};

export const listarDepartamentosCargados = async () => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaSiNoExiste(client);
    const res = await client.query(
      `SELECT
        departamento,
        COUNT(*) FILTER (WHERE geometria->>'type' = 'MultiLineString') as total_lineas,
        COUNT(*) FILTER (WHERE geometria->>'type' = 'Point') as total_puntos,
        MAX(creado_en) as actualizado_en
       FROM circuitos_geo GROUP BY departamento ORDER BY departamento`,
    );
    return { success: true, data: res.rows };
  } catch (err) {
    Logger.error(colors.red("Error listarDepartamentosCargados"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
  }
};

// Búsqueda liviana por nombre (circuitos y puntos) para el panel de
// búsqueda del mapa — devuelve solo lo necesario para listar y volar hasta
// ahí (primera coordenada como "ubicación representativa").
export const buscarCircuitos = async (departamento, texto) => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaSiNoExiste(client);
    const res = await client.query(
      `SELECT nombre, tipo, circuito_relacionado, geometria
       FROM circuitos_geo
       WHERE departamento = $1 AND nombre ILIKE $2
       ORDER BY (geometria->>'type' = 'MultiLineString') DESC, nombre
       LIMIT 50`,
      [departamento, `%${texto}%`],
    );
    const resultados = res.rows.map((row) => ({
      nombre: row.nombre,
      tipo: row.geometria.type === "MultiLineString" ? "Circuito" : row.tipo,
      circuito_relacionado: row.circuito_relacionado,
      esCircuito: row.geometria.type === "MultiLineString",
      ubicacion:
        row.geometria.type === "MultiLineString"
          ? row.geometria.coordinates[0]?.[0]
          : row.geometria.coordinates,
    }));
    return { success: true, data: resultados };
  } catch (err) {
    Logger.error(colors.red("Error buscarCircuitos"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
  }
};

// Puntos relacionados a un circuito (para "desplegar" sus relaciones en el
// panel de búsqueda) — matchea por el nombre exacto del circuito, tal como
// viene en "NOMBRE CIRCUITO/LINEA" en el KML original.
export const obtenerPuntosDeCircuito = async (departamento, nombreCircuito) => {
  const client = createClient();
  await client.connect();
  try {
    await crearTablaSiNoExiste(client);
    const res = await client.query(
      `SELECT nombre, tipo, geometria
       FROM circuitos_geo
       WHERE departamento = $1 AND circuito_relacionado = $2
       ORDER BY nombre
       LIMIT 500`,
      [departamento, nombreCircuito],
    );
    const resultados = res.rows.map((row) => ({
      nombre: row.nombre,
      tipo: row.tipo,
      esCircuito: false,
      ubicacion: row.geometria.coordinates,
    }));
    return { success: true, data: resultados };
  } catch (err) {
    Logger.error(colors.red("Error obtenerPuntosDeCircuito"), err);
    return { success: false, message: err.message };
  } finally {
    await client.end();
  }
};
