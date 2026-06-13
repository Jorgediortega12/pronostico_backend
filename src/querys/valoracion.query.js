export const ensureTables = `
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

  CREATE TABLE IF NOT EXISTS "SphaerAI_configuracion_ipp" (
    id              BIGSERIAL PRIMARY KEY,
    fecha_vigencia  TIMESTAMP,
    valor_ipp       DOUBLE PRECISION,
    descripcion     VARCHAR(200),
    usuario_id      INTEGER,
    fecha_registro  TIMESTAMP DEFAULT NOW()
  );

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
`;

// ── Ofertas ───────────────────────────────────────────────────────────────────
export const insertOferta = `
  INSERT INTO "SphaerAI_ofertas_valoracion"
    (nombre, ruta_archivo, usuario_id, numero_ofertas, energia_reserva,
     precios_reserva, energia_ofertada, precios_ofertados, tipos_oferta,
     tipo_periodo, anios_datos)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING id, nombre, numero_ofertas, fecha_carga, tipo_periodo
`;

export const getOfertaById = `
  SELECT id, nombre, ruta_archivo, fecha_carga, usuario_id, activo, numero_ofertas,
         energia_reserva, precios_reserva, energia_ofertada, precios_ofertados,
         tipos_oferta, tipo_periodo, anios_datos, meses_datos
  FROM "SphaerAI_ofertas_valoracion"
  WHERE id = $1
`;

export const listOfertas = `
  SELECT id, nombre, fecha_carga, numero_ofertas, activo, tipo_periodo
  FROM "SphaerAI_ofertas_valoracion"
  ORDER BY fecha_carga DESC
`;

export const listOfertasActivas = `
  SELECT id, nombre, fecha_carga, numero_ofertas, activo, tipo_periodo
  FROM "SphaerAI_ofertas_valoracion"
  WHERE activo = TRUE
  ORDER BY fecha_carga DESC
`;

// ── Escenarios ────────────────────────────────────────────────────────────────
export const insertEscenario = `
  INSERT INTO "SphaerAI_escenarios_valoracion"
    (nombre, oferta_id, usuario_id, ipp_base, numero_contratos_max,
     restricciones_adicionales, tamano_poblacion, numero_generaciones,
     tolerancia_funcion, generaciones_estancamiento)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING id, nombre, oferta_id, ipp_base, fecha_creacion
`;

export const getEscenarioById = `
  SELECT id, nombre, oferta_id, usuario_id, fecha_creacion, numero_contratos_max,
         ipp_base, restricciones_adicionales, tamano_poblacion, numero_generaciones,
         tolerancia_funcion, generaciones_estancamiento
  FROM "SphaerAI_escenarios_valoracion"
  WHERE id = $1
`;

export const listEscenarios = `
  SELECT id, nombre, oferta_id, usuario_id, fecha_creacion, numero_contratos_max,
         ipp_base, tamano_poblacion, numero_generaciones
  FROM "SphaerAI_escenarios_valoracion"
  ORDER BY fecha_creacion DESC
`;

export const listEscenariosByOferta = `
  SELECT id, nombre, oferta_id, usuario_id, fecha_creacion, numero_contratos_max,
         ipp_base, tamano_poblacion, numero_generaciones
  FROM "SphaerAI_escenarios_valoracion"
  WHERE oferta_id = $1
  ORDER BY fecha_creacion DESC
`;

export const deleteEscenario = `
  DELETE FROM "SphaerAI_escenarios_valoracion"
  WHERE id = $1
`;

export const updateEscenarioIpp = `
  UPDATE "SphaerAI_escenarios_valoracion"
  SET ipp_base = $2
  WHERE id = $1
`;

// ── Resultados ────────────────────────────────────────────────────────────────
export const insertResultado = `
  INSERT INTO "SphaerAI_resultados_optimizacion"
    (escenario_id, tipo_optimizacion, iteracion, porcentajes_contratos,
     porcentajes_por_periodo, energia_total_comprada, cobertura_porcentual,
     error_cuadratico_medio, tarifa_ponderada, costo_total, energia_mensual,
     costo_mensual, cobertura_mensual, energia_por_contrato_periodo,
     costo_por_contrato_periodo, tipos_contratos_utilizados)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  RETURNING id, escenario_id, fecha_ejecucion, tipo_optimizacion, iteracion
`;

export const getResultadoById = `
  SELECT id, escenario_id, fecha_ejecucion, tipo_optimizacion, iteracion,
         porcentajes_contratos, porcentajes_por_periodo, energia_total_comprada,
         cobertura_porcentual, error_cuadratico_medio, tarifa_ponderada, costo_total,
         energia_mensual, costo_mensual, cobertura_mensual,
         energia_por_contrato_periodo, costo_por_contrato_periodo,
         tipos_contratos_utilizados
  FROM "SphaerAI_resultados_optimizacion"
  WHERE id = $1
`;

export const getResultadosByEscenario = `
  SELECT id, escenario_id, fecha_ejecucion, tipo_optimizacion, iteracion,
         porcentajes_contratos, porcentajes_por_periodo, energia_total_comprada,
         cobertura_porcentual, error_cuadratico_medio, tarifa_ponderada, costo_total,
         energia_mensual, costo_mensual, cobertura_mensual,
         energia_por_contrato_periodo, costo_por_contrato_periodo,
         tipos_contratos_utilizados
  FROM "SphaerAI_resultados_optimizacion"
  WHERE escenario_id = $1
  ORDER BY cobertura_porcentual DESC
`;

export const getMejorResultadoByEscenario = `
  SELECT id, escenario_id, fecha_ejecucion, tipo_optimizacion, iteracion,
         porcentajes_contratos, porcentajes_por_periodo, energia_total_comprada,
         cobertura_porcentual, error_cuadratico_medio, tarifa_ponderada, costo_total,
         energia_mensual, costo_mensual, cobertura_mensual,
         energia_por_contrato_periodo, costo_por_contrato_periodo,
         tipos_contratos_utilizados
  FROM "SphaerAI_resultados_optimizacion"
  WHERE escenario_id = $1
  ORDER BY cobertura_porcentual DESC
  LIMIT 1
`;

export const getResultadosMultiobjByEscenario = `
  SELECT id, escenario_id, energia_total_comprada, tarifa_ponderada, cobertura_porcentual
  FROM "SphaerAI_resultados_optimizacion"
  WHERE escenario_id = $1 AND tipo_optimizacion = 'multiobjetivo'
`;

export const countResultadosByEscenario = `
  SELECT COUNT(*)::int AS total
  FROM "SphaerAI_resultados_optimizacion"
  WHERE escenario_id = $1
`;

export const deleteResultadosByEscenario = `
  DELETE FROM "SphaerAI_resultados_optimizacion"
  WHERE escenario_id = $1
`;

// ── Configuración IPP ─────────────────────────────────────────────────────────
export const insertConfiguracionIpp = `
  INSERT INTO "SphaerAI_configuracion_ipp"
    (fecha_vigencia, valor_ipp, descripcion, usuario_id)
  VALUES ($1, $2, $3, $4)
  RETURNING id
`;

export const listConfiguracionesIpp = `
  SELECT id, fecha_vigencia, valor_ipp, descripcion, usuario_id, fecha_registro
  FROM "SphaerAI_configuracion_ipp"
  ORDER BY fecha_vigencia DESC
`;

// ── Jobs de optimización (background) ──────────────────────────────────────────
export const upsertJobProcesando = `
  INSERT INTO "SphaerAI_optimizacion_jobs"
    (escenario_id, estado, tipo_optimizacion, fase, error, num_resultados, fecha_inicio, fecha_fin)
  VALUES ($1, 'procesando', $2, $3, NULL, 0, NOW(), NULL)
  ON CONFLICT (escenario_id) DO UPDATE SET
    estado = 'procesando',
    tipo_optimizacion = EXCLUDED.tipo_optimizacion,
    fase = EXCLUDED.fase,
    error = NULL,
    num_resultados = 0,
    fecha_inicio = NOW(),
    fecha_fin = NULL
  RETURNING escenario_id, estado, tipo_optimizacion, fase, fecha_inicio
`;

export const getJobByEscenario = `
  SELECT escenario_id, estado, tipo_optimizacion, fase, error, num_resultados, fecha_inicio, fecha_fin
  FROM "SphaerAI_optimizacion_jobs"
  WHERE escenario_id = $1
`;

export const updateJobFase = `
  UPDATE "SphaerAI_optimizacion_jobs"
  SET fase = $2
  WHERE escenario_id = $1
`;

export const completeJob = `
  UPDATE "SphaerAI_optimizacion_jobs"
  SET estado = 'completado', fase = $2, num_resultados = $3, fecha_fin = NOW()
  WHERE escenario_id = $1
`;

export const failJob = `
  UPDATE "SphaerAI_optimizacion_jobs"
  SET estado = 'error', error = $2, fase = 'Error', fecha_fin = NOW()
  WHERE escenario_id = $1
`;