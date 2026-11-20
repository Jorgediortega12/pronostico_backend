// Constantes y tabla fija de la whitelist de la Mesa de ajustes (puro: sin I/O).
// Contrato: EPM/docs/work/ajustes/fase3/CONTRATO_BACKEND.md y replica_jamer/PLAN_IMPL.md §3 y §5.
// Nada de proxy genérico: cada ruta del intermedio mapea a UNA ruta fija de EPM.

export const PASOS = Object.freeze([
  "base",
  "referencia",
  "nivel",
  "forma",
  "especiales",
  "control",
]);

export const PERFILES = Object.freeze(["jamer", "jamer_modelo"]);

export const UCP_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Timeouts (ms): preview/run/PATCH base refrescan datos y llaman al modelo.
export const TIMEOUT_LARGO = 180_000;
export const TIMEOUT_CORTO = 30_000;

export const EPM_URL_DEFAULT = "http://127.0.0.1:8001";

// ruta del intermedio -> método -> ruta EPM (plantillas con :id/:version/:paso ya validados).
export const RUTAS_EPM = Object.freeze({
  preview: { metodo: "POST", epm: "/adjustments/preview", timeout: TIMEOUT_LARGO, exito: 200 },
  run: { metodo: "POST", epm: "/adjustments/run", timeout: TIMEOUT_LARGO, exito: 201 },
  aprobada: { metodo: "GET", epm: "/adjustments/aprobada", timeout: TIMEOUT_CORTO, exito: 200 },
  corrida: { metodo: "GET", epm: "/adjustments/:id", timeout: TIMEOUT_CORTO, exito: 200 },
  versiones: { metodo: "GET", epm: "/adjustments/:id/versiones", timeout: TIMEOUT_CORTO, exito: 200 },
  version: {
    metodo: "GET",
    epm: "/adjustments/:id/versiones/:version",
    timeout: TIMEOUT_CORTO,
    exito: 200,
  },
  patchPaso: {
    metodo: "PATCH",
    epm: "/adjustments/:id/steps/:paso",
    timeout: TIMEOUT_CORTO, // base + aplicado sube a TIMEOUT_LARGO (ver servicio)
    exito: 200,
  },
  aprobar: { metodo: "POST", epm: "/adjustments/:id/approve", timeout: TIMEOUT_CORTO, exito: 200 },
  analogos: { metodo: "POST", epm: "/adjustments/analogos", timeout: TIMEOUT_CORTO, exito: 200 },
  acumuladoAnual: {
    metodo: "GET",
    epm: "/adjustments/acumulado-anual",
    timeout: TIMEOUT_CORTO,
    exito: 200,
  },
});

// UCP habilitadas por defecto; se puede sobrescribir con AJUSTES_UCPS (JSON: [{ucp,nombre}]).
export const UCPS_DEFAULT = Object.freeze([
  { ucp: "Antioquia", nombre: "Antioquia" },
  { ucp: "Atlantico", nombre: "Atlántico" },
]);

export const MAX_DIAS_REALES = 120;
