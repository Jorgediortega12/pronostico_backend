
CREATE TABLE IF NOT EXISTS "SphaerAI_ofertas_valoracion" (
  id                BIGSERIAL PRIMARY KEY,
  nombre            VARCHAR(200),
  ruta_archivo      TEXT,
  fecha_carga       TIMESTAMP DEFAULT NOW(),
  usuario_id        INTEGER,
  activo            BOOLEAN DEFAULT TRUE,

  numero_ofertas    INTEGER,
  energia_reserva   TEXT,   
  precios_reserva   TEXT,  
  energia_ofertada  TEXT,   
  precios_ofertados TEXT,  
  tipos_oferta      TEXT,   

 
  tipo_periodo      VARCHAR(10) DEFAULT 'mensual', 
  anios_datos       TEXT,   
  meses_datos       TEXT    
);

CREATE TABLE IF NOT EXISTS "SphaerAI_escenarios_valoracion" (
  id                          BIGSERIAL PRIMARY KEY,
  nombre                      VARCHAR(200),
  oferta_id                   INTEGER NOT NULL,
  usuario_id                  INTEGER,
  fecha_creacion              TIMESTAMP DEFAULT NOW(),


  numero_contratos_max        INTEGER,
  ipp_base                    DOUBLE PRECISION DEFAULT 1.0,
  restricciones_adicionales   TEXT,

  tamano_poblacion            INTEGER DEFAULT 500,
  numero_generaciones         INTEGER DEFAULT 200,
  tolerancia_funcion          DOUBLE PRECISION DEFAULT 1e-8,
  generaciones_estancamiento  INTEGER DEFAULT 50,

  CONSTRAINT fk_escenario_oferta
    FOREIGN KEY (oferta_id)
    REFERENCES "SphaerAI_ofertas_valoracion" (id)
    ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_escenario_valoracion_oferta
  ON "SphaerAI_escenarios_valoracion" (oferta_id);

CREATE TABLE IF NOT EXISTS "SphaerAI_resultados_optimizacion" (
  id                            BIGSERIAL PRIMARY KEY,
  escenario_id                  INTEGER NOT NULL,
  fecha_ejecucion               TIMESTAMP DEFAULT NOW(),

  tipo_optimizacion             VARCHAR(50),   
  iteracion                     INTEGER,


  porcentajes_contratos         TEXT,          
  porcentajes_por_periodo       TEXT,         


  energia_total_comprada        DOUBLE PRECISION,
  cobertura_porcentual          DOUBLE PRECISION,
  error_cuadratico_medio        DOUBLE PRECISION,
  tarifa_ponderada              DOUBLE PRECISION,
  costo_total                   DOUBLE PRECISION,


  energia_mensual               TEXT,
  costo_mensual                 TEXT,
  cobertura_mensual             TEXT,
  energia_por_contrato_periodo  TEXT,
  costo_por_contrato_periodo    TEXT,
  tipos_contratos_utilizados    TEXT,

  CONSTRAINT fk_resultado_escenario
    FOREIGN KEY (escenario_id)
    REFERENCES "SphaerAI_escenarios_valoracion" (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resultado_optimizacion_escenario
  ON "SphaerAI_resultados_optimizacion" (escenario_id);

CREATE TABLE IF NOT EXISTS "SphaerAI_optimizacion_jobs" (
  id                BIGSERIAL PRIMARY KEY,
  escenario_id      INTEGER NOT NULL UNIQUE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'procesando',
  tipo_optimizacion VARCHAR(50),
  fase              VARCHAR(200),
  error             TEXT,
  num_resultados    INTEGER DEFAULT 0,
  fecha_inicio      TIMESTAMP DEFAULT NOW(),
  fecha_fin         TIMESTAMP,
  CONSTRAINT fk_job_escenario
    FOREIGN KEY (escenario_id)
    REFERENCES "SphaerAI_escenarios_valoracion" (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SphaerAI_configuracion_ipp" (
  id              BIGSERIAL PRIMARY KEY,
  fecha_vigencia  TIMESTAMP,
  valor_ipp       DOUBLE PRECISION,
  descripcion     VARCHAR(200),
  usuario_id      INTEGER,
  fecha_registro  TIMESTAMP DEFAULT NOW()
);