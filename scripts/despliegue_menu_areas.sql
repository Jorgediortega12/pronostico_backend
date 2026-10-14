-- Menú por áreas (feat/menu-areas). Ejecutar en la BD de CADA empresa.
-- Es idempotente: se puede correr más de una vez. El backend también lo crea solo
-- la primera vez que alguien usa el menú; este script es para tenerlo listo antes.

BEGIN;

-- Áreas del menú, una configuración por perfil
CREATE TABLE IF NOT EXISTS menu_areas (
  cod SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  icono VARCHAR(40),
  orden INT NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  codperfil INT
);
CREATE INDEX IF NOT EXISTS idx_menu_areas_perfil ON menu_areas (codperfil);

-- En qué área va cada módulo para cada perfil
CREATE TABLE IF NOT EXISTS menu_area_modulos (
  codperfil INT NOT NULL,
  codmenu BIGINT NOT NULL,
  codarea INT NOT NULL,
  PRIMARY KEY (codperfil, codmenu)
);

-- Accesos frecuentes del Inicio por perfil
CREATE TABLE IF NOT EXISTS menu_frecuentes (
  codperfil INT NOT NULL,
  codmenu BIGINT NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  PRIMARY KEY (codperfil, codmenu)
);

COMMIT;
