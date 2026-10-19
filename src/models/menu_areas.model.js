// Áreas del menú (agrupación de módulos en el sidebar / Inicio) y accesos
// frecuentes del Inicio. Por empresa (BD del tenant) y POR PERFIL:
//   menu_areas.codperfil                  -> las áreas pertenecen a un perfil
//   menu_area_modulos (codperfil, codmenu) -> en qué área va cada módulo para ese perfil
//   menu_frecuentes   (codperfil, codmenu) -> accesos frecuentes del Inicio de ese perfil
import { createConectionPG } from "../helpers/connections.js";

const ASEGURAR = `
  CREATE TABLE IF NOT EXISTS menu_areas (
    cod SERIAL PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    icono VARCHAR(40),
    orden INT NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE menu_areas ADD COLUMN IF NOT EXISTS codperfil INT;
  CREATE INDEX IF NOT EXISTS idx_menu_areas_perfil ON menu_areas (codperfil);

  CREATE TABLE IF NOT EXISTS menu_area_modulos (
    codperfil INT NOT NULL,
    codmenu BIGINT NOT NULL,
    codarea INT NOT NULL,
    PRIMARY KEY (codperfil, codmenu)
  );

  -- Versión previa (global, sin perfil): se reemplaza por la versión por perfil.
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'menu_frecuentes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'menu_frecuentes' AND column_name = 'codperfil') THEN
      DROP TABLE menu_frecuentes;
    END IF;
  END $$;
  CREATE TABLE IF NOT EXISTS menu_frecuentes (
    codperfil INT NOT NULL,
    codmenu BIGINT NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    PRIMARY KEY (codperfil, codmenu)
  );
  ALTER TABLE usu_menu DROP COLUMN IF EXISTS codarea;
  DELETE FROM menu_areas WHERE codperfil IS NULL;
`;

export default class MenuAreasModel {
  static instance;
  static getInstance() {
    if (!MenuAreasModel.instance) MenuAreasModel.instance = new MenuAreasModel();
    return MenuAreasModel.instance;
  }

  #tenantAsegurado = new Set();

  // Abre una conexión del tenant, asegura la estructura (una vez por proceso y tenant) y la cierra siempre.
  #con = async (session, fn) => {
    const client = createConectionPG(session);
    await client.connect();
    try {
      const clave = `${session.host}:${session.basededatos}`;
      if (!this.#tenantAsegurado.has(clave)) {
        await client.query(ASEGURAR);
        this.#tenantAsegurado.add(clave);
      }
      return await fn(client);
    } finally {
      await client.end();
    }
  };

  // Módulos que un perfil puede ver, con el área que ese perfil les asignó.
  modulosDePerfil = (session, codperfil) =>
    this.#con(session, async (c) => {
      const { rows } = await c.query(
        `SELECT m.cod, m.nombre, m.nivel, m.orden, m.link, m.imagen, am.codarea
           FROM usu_menu m
           INNER JOIN usu_usuarioacceso pm ON pm.codmenu = m.cod
           LEFT JOIN menu_area_modulos am ON am.codmenu = m.cod AND am.codperfil = $2::int
          WHERE pm.codperfil = $1
          ORDER BY m.orden ASC, m.cod ASC`,
        [codperfil, codperfil],
      );
      return rows;
    });

  areas = (session, codperfil) =>
    this.#con(session, async (c) =>
      (await c.query("SELECT cod, nombre, icono, orden FROM menu_areas WHERE codperfil = $1 ORDER BY orden ASC, cod ASC", [codperfil])).rows,
    );

  frecuentes = (session, codperfil) =>
    this.#con(session, async (c) =>
      (await c.query("SELECT codmenu, orden FROM menu_frecuentes WHERE codperfil = $1 ORDER BY orden ASC", [codperfil])).rows,
    );

  crearArea = (session, codperfil, { nombre, icono, orden }) =>
    this.#con(session, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO menu_areas (codperfil, nombre, icono, orden)
         VALUES ($1, $2, $3, COALESCE($4, (SELECT COALESCE(MAX(orden), 0) + 1 FROM menu_areas WHERE codperfil = $1)))
         RETURNING cod, nombre, icono, orden`,
        [codperfil, nombre, icono ?? null, orden ?? null],
      );
      return rows[0];
    });

  actualizarArea = (session, cod, { nombre, icono, orden }) =>
    this.#con(session, async (c) => {
      const { rows } = await c.query(
        `UPDATE menu_areas
            SET nombre = COALESCE($2, nombre), icono = COALESCE($3, icono), orden = COALESCE($4, orden)
          WHERE cod = $1
          RETURNING cod, nombre, icono, orden`,
        [cod, nombre ?? null, icono ?? null, orden ?? null],
      );
      return rows[0] ?? null;
    });

  // Los módulos del área eliminada quedan sin área (no se borran).
  eliminarArea = (session, cod) =>
    this.#con(session, async (c) => {
      await c.query("BEGIN");
      try {
        await c.query("DELETE FROM menu_area_modulos WHERE codarea = $1", [cod]);
        const r = await c.query("DELETE FROM menu_areas WHERE cod = $1", [cod]);
        await c.query("COMMIT");
        return r.rowCount > 0;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    });

  // codarea = null deja el módulo suelto. Devuelve false si el área no es de ese perfil.
  asignarModuloAArea = (session, codperfil, codmenu, codarea) =>
    this.#con(session, async (c) => {
      if (codarea == null) {
        await c.query("DELETE FROM menu_area_modulos WHERE codperfil = $1 AND codmenu = $2", [codperfil, codmenu]);
        return { cod: codmenu, codarea: null };
      }
      const area = await c.query("SELECT 1 FROM menu_areas WHERE cod = $1 AND codperfil = $2", [codarea, codperfil]);
      if (area.rowCount === 0) return false;
      await c.query(
        `INSERT INTO menu_area_modulos (codperfil, codmenu, codarea) VALUES ($1, $2, $3)
         ON CONFLICT (codperfil, codmenu) DO UPDATE SET codarea = EXCLUDED.codarea`,
        [codperfil, codmenu, codarea],
      );
      return { cod: codmenu, codarea };
    });

  // Reemplaza la lista completa de accesos frecuentes del perfil (el orden del arreglo es el orden en pantalla).
  guardarFrecuentes = (session, codperfil, codmenus) =>
    this.#con(session, async (c) => {
      await c.query("BEGIN");
      try {
        await c.query("DELETE FROM menu_frecuentes WHERE codperfil = $1", [codperfil]);
        for (let i = 0; i < codmenus.length; i++) {
          await c.query("INSERT INTO menu_frecuentes (codperfil, codmenu, orden) VALUES ($1, $2, $3)", [codperfil, codmenus[i], i + 1]);
        }
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    });

  // Copia la configuración completa (áreas, módulos por área y frecuentes) de un perfil a otro,
  // reemplazando la del destino. Solo se copian módulos a los que el destino tiene acceso.
  copiarConfiguracion = (session, origen, destino) =>
    this.#con(session, async (c) => {
      await c.query("BEGIN");
      try {
        await c.query("DELETE FROM menu_area_modulos WHERE codperfil = $1", [destino]);
        await c.query("DELETE FROM menu_areas WHERE codperfil = $1", [destino]);
        await c.query("DELETE FROM menu_frecuentes WHERE codperfil = $1", [destino]);

        const mapa = new Map();
        const areas = (await c.query("SELECT cod, nombre, icono, orden FROM menu_areas WHERE codperfil = $1 ORDER BY orden, cod", [origen])).rows;
        for (const a of areas) {
          const r = await c.query("INSERT INTO menu_areas (codperfil, nombre, icono, orden) VALUES ($1, $2, $3, $4) RETURNING cod", [destino, a.nombre, a.icono, a.orden]);
          mapa.set(a.cod, r.rows[0].cod);
        }
        const accesos = (await c.query("SELECT codmenu::text AS codmenu FROM usu_usuarioacceso WHERE codperfil = $1", [destino])).rows.map((r) => r.codmenu);
        const permitido = new Set(accesos);

        const mods = (await c.query("SELECT codmenu, codarea FROM menu_area_modulos WHERE codperfil = $1", [origen])).rows;
        for (const m of mods) {
          if (!permitido.has(String(m.codmenu)) || !mapa.has(m.codarea)) continue;
          await c.query("INSERT INTO menu_area_modulos (codperfil, codmenu, codarea) VALUES ($1, $2, $3)", [destino, m.codmenu, mapa.get(m.codarea)]);
        }
        const frec = (await c.query("SELECT codmenu FROM menu_frecuentes WHERE codperfil = $1 ORDER BY orden", [origen])).rows;
        let orden = 1;
        for (const f of frec) {
          if (!permitido.has(String(f.codmenu))) continue;
          await c.query("INSERT INTO menu_frecuentes (codperfil, codmenu, orden) VALUES ($1, $2, $3)", [destino, f.codmenu, orden++]);
        }
        await c.query("COMMIT");
        return { areas: areas.length, modulos: mods.length, frecuentes: frec.length };
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    });
}
