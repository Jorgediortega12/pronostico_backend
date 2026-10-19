// Alertas (Gestión de Notificaciones) — categorías 'mape', 'demanda',
// 'periodo', 'evento', 'clima', 'modelo' y 'medida'.
// Autoprovisión perezosa por tenant (ver alertas.model.js#ensureTables),
// mismo patrón que cubrimiento.query.js#ensureCubrimientoTables.

export const ensureAlertasTables = `
  CREATE TABLE IF NOT EXISTS alertas_config (
    codigo SERIAL PRIMARY KEY,
    categoria VARCHAR(20) UNIQUE NOT NULL,
    umbral NUMERIC NOT NULL,
    ventana_dias INT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    canal_push BOOLEAN NOT NULL DEFAULT TRUE,
    canal_correo BOOLEAN NOT NULL DEFAULT FALSE,
    canal_sms BOOLEAN NOT NULL DEFAULT FALSE,
    destinatarios JSONB NOT NULL DEFAULT '[]',
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );

  ALTER TABLE alertas_config ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
  -- Solo la usa 'historico': días seguidos sobre el umbral (año anterior) a partir de los cuales la alerta es crítica.
  ALTER TABLE alertas_config ADD COLUMN IF NOT EXISTS dias_consecutivos INT;

  CREATE TABLE IF NOT EXISTS alertas (
    codigo SERIAL PRIMARY KEY,
    ucp VARCHAR NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    periodo_inicio INT,
    periodo_fin INT,
    descripcion TEXT NOT NULL,
    metrica_valor NUMERIC NOT NULL,
    metrica_label VARCHAR(30) NOT NULL,
    umbral NUMERIC NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'por_revisar',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    revisado_en TIMESTAMP,
    UNIQUE (ucp, categoria, fecha)
  );

  -- 'medida' genera una alerta por barra/medida (varias el mismo día en un
  -- mismo mercado), así que la unicidad pasó a incluir 'referencia'. Para el
  -- resto de categorías referencia es NULL y la unicidad sigue siendo
  -- (ucp, categoria, fecha), igual que antes.
  ALTER TABLE alertas ADD COLUMN IF NOT EXISTS referencia VARCHAR(200);
  ALTER TABLE alertas ADD COLUMN IF NOT EXISTS detalle JSONB;
  ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_ucp_categoria_fecha_key;
  CREATE UNIQUE INDEX IF NOT EXISTS alertas_ucp_categoria_fecha_ref_uq
    ON alertas (ucp, categoria, fecha, COALESCE(referencia, ''));

  CREATE TABLE IF NOT EXISTS alertas_historial (
    codigo SERIAL PRIMARY KEY,
    alerta_id INT NOT NULL REFERENCES alertas(codigo) ON DELETE CASCADE,
    tipo_evento VARCHAR(20) NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

export const seedAlertasConfigDefaults = `
  INSERT INTO alertas_config (categoria, umbral, ventana_dias, canal_push, dias_consecutivos)
  VALUES
    ('mape', 2.5, NULL, TRUE, NULL),
    ('demanda', 8, 30, TRUE, NULL),
    ('periodo', 3.0, 3, TRUE, NULL),
    ('evento', 0, 3, TRUE, NULL),
    ('clima', 4, 30, TRUE, NULL),
    ('modelo', 4, 7, TRUE, NULL),
    ('medida', 50, 14, TRUE, NULL),
    ('historico', 3.0, 7, TRUE, 2)
  ON CONFLICT (categoria) DO NOTHING
`;

// ─── Configuración ───────────────────────────────────────────────────────────

export const getAlertasConfig = `
  SELECT codigo, categoria, umbral, ventana_dias, dias_consecutivos, activo, canal_push, canal_correo,
         canal_sms, destinatarios, actualizado_en
  FROM alertas_config
  ORDER BY categoria
`;

export const updateAlertasConfigByCategoria = `
  UPDATE alertas_config
  SET umbral = $1,
      ventana_dias = $2,
      activo = $3,
      canal_push = $4,
      canal_correo = $5,
      canal_sms = $6,
      destinatarios = $7,
      dias_consecutivos = COALESCE($8, dias_consecutivos),
      actualizado_en = NOW()
  WHERE categoria = $9
  RETURNING codigo, categoria, umbral, ventana_dias, dias_consecutivos, activo, canal_push, canal_correo,
            canal_sms, destinatarios, actualizado_en
`;

// ─── Mercados (MC / ucp) ──────────────────────────────────────────────────────
// Mismo query que configuracion.query.js#cargarUCP — lista de mercados activos.

export const listarUcpActivos = `
  SELECT DISTINCT(aux2) AS mc
  FROM ucp
  WHERE codpadre = 2
    AND estado = 1
    AND aux2 IS NOT NULL
    AND aux2 <> ''
  ORDER BY aux2 ASC
`;

// ─── Datos fuente para el motor de cálculo ───────────────────────────────────

export const getUltimaFechaReal = `
  SELECT fecha FROM actualizaciondatos WHERE ucp = $1 ORDER BY fecha DESC LIMIT 1
`;

// La tabla "pronosticos" (plana, ucp+fecha+p1..p24) no la llena nada en
// este backend (la única query que le hace INSERT, crearPronostico, no la
// usa ningún service) — el pronóstico guardado de verdad vive en
// sesiones/sesiones_periodos (tipo='P'), que es lo que escribe "Guardar
// sesión" en Pronósticos. Si el mismo ucp+fecha tiene más de una sesión
// guardada (varias versiones), se toma la más reciente (mayor codigo).
export const getRealYPronosticoPorFecha = `
  SELECT
    a.fecha,
    a.p1 AS r1, a.p2 AS r2, a.p3 AS r3, a.p4 AS r4, a.p5 AS r5, a.p6 AS r6,
    a.p7 AS r7, a.p8 AS r8, a.p9 AS r9, a.p10 AS r10, a.p11 AS r11, a.p12 AS r12,
    a.p13 AS r13, a.p14 AS r14, a.p15 AS r15, a.p16 AS r16, a.p17 AS r17, a.p18 AS r18,
    a.p19 AS r19, a.p20 AS r20, a.p21 AS r21, a.p22 AS r22, a.p23 AS r23, a.p24 AS r24,
    sp.p1 AS f1, sp.p2 AS f2, sp.p3 AS f3, sp.p4 AS f4, sp.p5 AS f5, sp.p6 AS f6,
    sp.p7 AS f7, sp.p8 AS f8, sp.p9 AS f9, sp.p10 AS f10, sp.p11 AS f11, sp.p12 AS f12,
    sp.p13 AS f13, sp.p14 AS f14, sp.p15 AS f15, sp.p16 AS f16, sp.p17 AS f17, sp.p18 AS f18,
    sp.p19 AS f19, sp.p20 AS f20, sp.p21 AS f21, sp.p22 AS f22, sp.p23 AS f23, sp.p24 AS f24
  FROM actualizaciondatos a
  INNER JOIN sesiones s ON s.ucp = a.ucp
  INNER JOIN sesiones_periodos sp ON sp.codsesion = s.codigo AND sp.fecha = a.fecha AND sp.tipo = 'P'
  WHERE a.ucp = $1 AND a.fecha = $2
  ORDER BY s.codigo DESC
  LIMIT 1
`;

// Igual que getRealYPronosticoPorFecha, pero para un rango de fechas — un
// registro por fecha (DISTINCT ON, la sesión más reciente si hay varias).
// Usado por 'periodo' para revisar N días consecutivos de una vez.
export const getRealYPronosticoRango = `
  SELECT DISTINCT ON (a.fecha)
    a.fecha,
    a.p1 AS r1, a.p2 AS r2, a.p3 AS r3, a.p4 AS r4, a.p5 AS r5, a.p6 AS r6,
    a.p7 AS r7, a.p8 AS r8, a.p9 AS r9, a.p10 AS r10, a.p11 AS r11, a.p12 AS r12,
    a.p13 AS r13, a.p14 AS r14, a.p15 AS r15, a.p16 AS r16, a.p17 AS r17, a.p18 AS r18,
    a.p19 AS r19, a.p20 AS r20, a.p21 AS r21, a.p22 AS r22, a.p23 AS r23, a.p24 AS r24,
    sp.p1 AS f1, sp.p2 AS f2, sp.p3 AS f3, sp.p4 AS f4, sp.p5 AS f5, sp.p6 AS f6,
    sp.p7 AS f7, sp.p8 AS f8, sp.p9 AS f9, sp.p10 AS f10, sp.p11 AS f11, sp.p12 AS f12,
    sp.p13 AS f13, sp.p14 AS f14, sp.p15 AS f15, sp.p16 AS f16, sp.p17 AS f17, sp.p18 AS f18,
    sp.p19 AS f19, sp.p20 AS f20, sp.p21 AS f21, sp.p22 AS f22, sp.p23 AS f23, sp.p24 AS f24
  FROM actualizaciondatos a
  INNER JOIN sesiones s ON s.ucp = a.ucp
  INNER JOIN sesiones_periodos sp ON sp.codsesion = s.codigo AND sp.fecha = a.fecha AND sp.tipo = 'P'
  WHERE a.ucp = $1 AND a.fecha >= $2 AND a.fecha <= $3
  ORDER BY a.fecha, s.codigo DESC
`;

// Festivos configurados para un mercado desde una fecha en adelante (para
// el recordatorio de festivo próximo y para cruzar contra los nacionales
// calculados y detectar cuáles faltan).
export const getFestivosPorUcpDesde = `
  SELECT codigo, ucp, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, nombre
  FROM festivos
  WHERE ucp = $1 AND fecha >= $2
  ORDER BY fecha ASC
`;

// Festivo de un mercado por nombre dentro de un rango de fechas (p. ej. el
// mismo festivo del año anterior, que por la Ley Emiliani cambia de fecha).
export const getFestivoPorNombreEnRango = `
  SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, nombre
  FROM festivos
  WHERE ucp = $1 AND lower(nombre) = lower($2) AND fecha >= $3::date AND fecha <= $4::date
  ORDER BY fecha ASC
  LIMIT 1
`;

export const getTotalDiarioReal = `
  SELECT
    (p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14+p15+p16+p17+p18+p19+p20+p21+p22+p23+p24) AS total
  FROM actualizaciondatos
  WHERE ucp = $1 AND fecha = $2
  LIMIT 1
`;

export const getPromedioTotalDiarioTipico = `
  SELECT
    AVG(p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14+p15+p16+p17+p18+p19+p20+p21+p22+p23+p24) AS promedio,
    COUNT(*) AS muestras
  FROM actualizaciondatos
  WHERE ucp = $1
    AND fecha < $2
    AND fecha >= ($2::date - ($3 || ' days')::interval)
    AND EXTRACT(DOW FROM fecha) = EXTRACT(DOW FROM $2::date)
`;

// ─── Medidas (tabla medidas ↔ agrupaciones ↔ barras) ─────────────────────────
// Mismo cruce de medidas_factores.query.js: cada medida (codigo_rpm + flujo)
// pertenece a una barra a través de una agrupación activa. Se trabaja con el
// valor crudo de la medida — un cambio de signo en el dato fuente (p. ej.
// polaridad invertida en el medidor) es justo lo que se quiere detectar.

export const getUltimaFechaMedidasPorMc = `
  SELECT TO_CHAR(MAX(me.fecha), 'YYYY-MM-DD') AS fecha
  FROM medidas me
  INNER JOIN agrupaciones a
    ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  INNER JOIN barras b ON b.id = a.barra_id AND b.estado = 1
  WHERE b.mc = $1
`;

export const getMedidasVentanaPorMc = `
  SELECT
    b.barra, me.codigo_rpm, me.flujo,
    TO_CHAR(me.fecha, 'YYYY-MM-DD') AS fecha,
    me.p1, me.p2, me.p3, me.p4, me.p5, me.p6, me.p7, me.p8, me.p9, me.p10, me.p11, me.p12,
    me.p13, me.p14, me.p15, me.p16, me.p17, me.p18, me.p19, me.p20, me.p21, me.p22, me.p23, me.p24
  FROM medidas me
  INNER JOIN agrupaciones a
    ON a.codigo_rpm = me.codigo_rpm AND a.flujo = me.flujo AND a.estado = 1
  INNER JOIN barras b ON b.id = a.barra_id AND b.estado = 1
  WHERE b.mc = $1 AND me.fecha >= $2::date AND me.fecha <= $3::date
  ORDER BY b.barra, me.codigo_rpm, me.flujo, me.fecha
`;

// ¿Ya se avisó de esta misma medida dentro de la ventana? Evita repetir la
// alerta cada día mientras el cambio sigue "reciente" frente al histórico.
export const existeAlertaMedidaReciente = `
  SELECT 1 FROM alertas
  WHERE ucp = $1 AND categoria = 'medida' AND referencia = $2
    AND fecha >= $3::date AND fecha < $4::date
  LIMIT 1
`;

// ─── Clima (jano_proxy — conexión fija, no por sesión) ──────────────────────
// La temperatura no depende del día de la semana como la demanda, así que
// el "típico" acá es un promedio móvil de los últimos N días, sin filtrar
// por día de semana.

export const getTemperaturaPromedioPorFecha = `
  SELECT (p1_t+p2_t+p3_t+p4_t+p5_t+p6_t+p7_t+p8_t+p9_t+p10_t+p11_t+p12_t+p13_t
    +p14_t+p15_t+p16_t+p17_t+p18_t+p19_t+p20_t+p21_t+p22_t+p23_t+p24_t) / 24.0
    AS temp_promedio
  FROM datos_clima
  WHERE ucp = $1 AND fecha = $2
`;

export const getTemperaturaPromedioTipico = `
  SELECT
    AVG((p1_t+p2_t+p3_t+p4_t+p5_t+p6_t+p7_t+p8_t+p9_t+p10_t+p11_t+p12_t+p13_t
      +p14_t+p15_t+p16_t+p17_t+p18_t+p19_t+p20_t+p21_t+p22_t+p23_t+p24_t) / 24.0)
      AS promedio,
    COUNT(*) AS muestras
  FROM datos_clima
  WHERE ucp = $1
    AND fecha < $2
    AND fecha >= ($2::date - ($3 || ' days')::interval)
`;

// ─── Alertas ───────────────────────────────────────────────────────────────────

export const insertAlerta = `
  INSERT INTO alertas
    (ucp, categoria, fecha, periodo_inicio, periodo_fin, descripcion,
     metrica_valor, metrica_label, umbral, estado, referencia, detalle)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  ON CONFLICT DO NOTHING
  RETURNING *
`;

export const getAlertaByCodigo = `
  SELECT * FROM alertas WHERE codigo = $1
`;

export const marcarAlertaRevisada = `
  UPDATE alertas
  SET estado = 'revisado', revisado_en = NOW()
  WHERE codigo = $1
  RETURNING *
`;

export const insertHistorial = `
  INSERT INTO alertas_historial (alerta_id, tipo_evento, descripcion)
  VALUES ($1, $2, $3)
  RETURNING *
`;

export const getHistorialByAlertaId = `
  SELECT * FROM alertas_historial WHERE alerta_id = $1 ORDER BY creado_en ASC
`;
