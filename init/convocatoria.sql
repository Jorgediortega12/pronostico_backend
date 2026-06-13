-- ── Núcleo ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_convocatorias" (
  id              BIGSERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  mercado         VARCHAR(100) NOT NULL,
  fecha_creacion  TIMESTAMP DEFAULT NOW(),
  fecha_audiencia TIMESTAMP NOT NULL,
  estado          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SphaerAI_contrato_convocatoria" (
  codigo          BIGSERIAL PRIMARY KEY,
  convocatoria_id INTEGER NOT NULL,
  descripcion     VARCHAR(250),
  fecha_inicio    TIMESTAMP NOT NULL,
  fecha_fin       TIMESTAMP NOT NULL,
  fecha_creacion  TIMESTAMP DEFAULT NOW(),
  sic             BIGINT,
  agente          VARCHAR(100),
  razon_s         VARCHAR(150),
  nit             BIGINT,
  direccion       VARCHAR(200),
  ciudad          VARCHAR(100),
  telefono        VARCHAR(50),
  codigo_tercero  BIGINT,
  estado          INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sphaerai_contrato_conv_convid ON "SphaerAI_contrato_convocatoria" (convocatoria_id);

-- ── Tablas de archivos por categoría ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_preparacion_convoc" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP NOT NULL DEFAULT NOW(),
  secuencia_id   BIGSERIAL,
  accion         VARCHAR(100) DEFAULT 'No aplica'
);

CREATE TABLE IF NOT EXISTS "SphaerAI_pliegos_consulta" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW(),
  accion         VARCHAR(100) DEFAULT 'No aplica'
);

CREATE TABLE IF NOT EXISTS "SphaerAI_preguntas_recibidas" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_pliegos_definitivos" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_oferta_reserva" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_requisitos_habilitantes" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_publicacion_info_audiencia" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_ofertas_cantidades_precios" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_valoracion_adjudicacion" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_audiencia_publica" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_contratos_firmados" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_reservas_presupuestales" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SphaerAI_registro_asic" (
  id             BIGSERIAL PRIMARY KEY,
  contrato_codigo BIGINT NOT NULL,
  codigo_sic     BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  plantilla      VARCHAR(100),
  fecha_inicio   TIMESTAMP NOT NULL,
  fecha_carga    TIMESTAMP DEFAULT NOW(),
  accion         VARCHAR(100) DEFAULT 'No aplica',
  version        INTEGER NOT NULL DEFAULT 1
);

-- Índice por contrato_codigo en todas las tablas de archivos
CREATE INDEX IF NOT EXISTS idx_prep_convoc_cc        ON "SphaerAI_preparacion_convoc" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_pliegos_consulta_cc   ON "SphaerAI_pliegos_consulta" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_preguntas_rec_cc      ON "SphaerAI_preguntas_recibidas" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_pliegos_def_cc        ON "SphaerAI_pliegos_definitivos" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_oferta_reserva_cc     ON "SphaerAI_oferta_reserva" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_requisitos_hab_cc     ON "SphaerAI_requisitos_habilitantes" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_pub_info_aud_cc       ON "SphaerAI_publicacion_info_audiencia" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_ofertas_cant_prec_cc  ON "SphaerAI_ofertas_cantidades_precios" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_valoracion_adj_cc     ON "SphaerAI_valoracion_adjudicacion" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_audiencia_pub_cc      ON "SphaerAI_audiencia_publica" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_contratos_firm_cc     ON "SphaerAI_contratos_firmados" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_reservas_pres_cc      ON "SphaerAI_reservas_presupuestales" (contrato_codigo);
CREATE INDEX IF NOT EXISTS idx_registro_asic_cc      ON "SphaerAI_registro_asic" (contrato_codigo);