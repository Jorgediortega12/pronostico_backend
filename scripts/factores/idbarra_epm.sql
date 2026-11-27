-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Factores de distribución · ID de barra de EPM (columna IDBARRA del reporte)
--
-- 1) Agrega la columna barras.idbarra (el código de la barra en el sistema de EPM, p. ej. CrgAma11).
-- 2) Asigna los 67 códigos del archivo «Factores MC-Antioquia.xlsx» (por nombre de barra) a las barras ACTIVAS del mercado.
-- 3) Muestra qué quedó sin código y si hay códigos repetidos.
--
-- Es idempotente (se puede ejecutar varias veces). Solo escribe en barras.idbarra: no toca nada más.
-- Si INDUSTR1 todavía no existe en la base (primero se ejecuta cargar_industriales_epm.sql), su código se asigna cuando exista:
-- basta con volver a ejecutar este archivo.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- 1) Columna
ALTER TABLE barras ADD COLUMN IF NOT EXISTS idbarra VARCHAR(30);

-- 2) Códigos de EPM
DO $idbarra$
DECLARE
  v_mc text := 'Antioquia';   -- mercado al que pertenecen estas barras
  v_n  int;
BEGIN
  UPDATE barras b
     SET idbarra = m.idbarra
    FROM (VALUES
    ('AMAGA__1', 'CrgAma11'),
    ('ANCONSU1', 'CrgAne11'),
    ('ANCONSU4', 'CrgAne41'),
    ('ANTIOQ41', 'CrgAnt41'),
    ('APRTADO1', 'CrgApt11'),
    ('BARBOSA1', 'CrgBbo11'),
    ('BELEN__1', 'CrgBel11'),
    ('BELLO__1', 'CrgBll11'),
    ('BELLO_21', 'CrgBll21'),
    ('BOLOMBO1', 'CrgBlo11'),
    ('CALDAS_1', 'CrgCad11'),
    ('CAUCAS71', 'CrgCau71'),
    ('CAUCAS72', 'CrgCau72'),
    ('CAUCAS73', 'CrgCau73'),
    ('CABANAS1', 'CrgCbs11'),
    ('CAUCHER1', 'CrgCch1'),
    ('COCORNA1', 'CrgCco11'),
    ('LACEJA_1', 'CrgCej11'),
    ('CENTRAL1', 'CrgCen11'),
    ('CHORODO1', 'CrgChr11'),
    ('CHOROD41', 'CrgChr41'),
    ('COLOMBI1', 'CrgClb11'),
    ('CALIZAS1', 'CrgClz11'),
    ('CORDOVA1', 'CrgCor11'),
    ('CRUZADA1', 'CrgCru11'),
    ('CASTILL1', 'CrgCst11'),
    ('ENVIGAD1', 'CrgEnv11'),
    ('ENVIGA12', 'CrgEnv12'),
    ('ENVIGAD4', 'CrgEnv41'),
    ('GIRARDT1', 'CrgGta11'),
    ('GUATAPE1', 'CrgGtp11'),
    ('GUADALU4', 'CrgGu421'),
    ('GUAYABA1', 'CrgGya11'),
    ('HISPANI1', 'CrgHis11'),
    ('HORIZON1', 'CrgHrz11'),
    ('INDUSTR1', 'CrgIdu11'),
    ('ITAGUI_1', 'CrgItg11'),
    ('S_JERON1', 'CrgJer11'),
    ('LAGUNA11', 'CrgLgu11'),
    ('MALENA_2', 'CrgMal21'),
    ('MORICHE1', 'CrgMche1'),
    ('MIRAFLO1', 'CrgMir11'),
    ('NCOLONI1', 'CrgNCo11'),
    ('NSROSA11', 'CrgNsr11'),
    ('ORIENTE1', 'CrgOri11'),
    ('ORIENTE4', 'CrgOri41'),
    ('PTOANT_1', 'CrgPAn11'),
    ('P_BLANC1', 'CrgPbl11'),
    ('PTO_INM1', 'CrgPIn11'),
    ('PLAYAS_4', 'CrgPly41'),
    ('POBLADO1', 'CrgPob11'),
    ('PORCE__1', 'CrgPor11'),
    ('PTO_NAR1', 'CrgPtn11'),
    ('RIO_CLA1', 'CrgRcl11'),
    ('RIOGRAN4', 'CrgRgr41'),
    ('RIONEGR1', 'CrgRng11'),
    ('RODEO__1', 'CrgRod11'),
    ('SALTEPM4', 'CrgSl421'),
    ('SN_DIEG1', 'CrgSnd11'),
    ('SONSON_1', 'CrgSon11'),
    ('TEXAS__1', 'CrgTex11'),
    ('TIGRE__1', 'CrgTig11'),
    ('URABA__1', 'CrgUrb11'),
    ('V_HERMO1', 'CrgVhm11'),
    ('YARUMAL1', 'CrgYar11'),
    ('YMALII11', 'CrgYII11'),
    ('ZAMORA_1', 'CrgZam11')
    ) AS m(barra, idbarra)
   WHERE b.barra = m.barra AND b.mc = v_mc AND b.estado = 1
     AND b.idbarra IS DISTINCT FROM m.idbarra;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'ID de barra asignado o corregido en % barras.', v_n;
END
$idbarra$;

-- 3) Comprobaciones
-- 3a) Barras activas del mercado SIN código (lo normal es 0 filas):
SELECT id, barra FROM barras WHERE mc = 'Antioquia' AND estado = 1 AND (idbarra IS NULL OR idbarra = '') ORDER BY id;

-- 3b) Códigos repetidos entre barras activas del mercado (lo normal es 0 filas):
SELECT idbarra, count(*) AS barras, string_agg(barra || ' (id ' || id || ')', ', ') AS cuales
FROM barras WHERE mc = 'Antioquia' AND estado = 1 AND idbarra IS NOT NULL
GROUP BY idbarra HAVING count(*) > 1;

-- 3c) Resumen:
SELECT count(*) AS barras_activas, count(idbarra) AS con_idbarra FROM barras WHERE mc = 'Antioquia' AND estado = 1;
