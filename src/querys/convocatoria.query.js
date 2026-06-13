// ─── Convocatorias ─────────────────────────────────────────────────────────────
export const getConvocatorias = `
  SELECT id, nombre, mercado, fecha_creacion, fecha_audiencia, estado
  FROM "SphaerAI_convocatorias"
  WHERE estado = 1
  ORDER BY fecha_audiencia
`;

export const insertConvocatoria = `
  INSERT INTO "SphaerAI_convocatorias" (nombre, mercado, fecha_audiencia)
  VALUES ($1, $2, $3)
  RETURNING id, nombre, mercado, fecha_creacion, fecha_audiencia, estado
`;

// ─── Contratos de convocatoria ───────────────────────────────────────────────────
export const getContratosByConvocatoria = `
  SELECT codigo, convocatoria_id, descripcion, fecha_inicio, fecha_fin, fecha_creacion,
         sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero, estado
  FROM "SphaerAI_contrato_convocatoria"
  WHERE convocatoria_id = $1 AND estado = 1
  ORDER BY fecha_creacion
`;

export const insertContrato = `
  INSERT INTO "SphaerAI_contrato_convocatoria" (convocatoria_id, descripcion, fecha_inicio, fecha_fin)
  VALUES ($1, $2, $3, $4)
  RETURNING codigo, convocatoria_id, descripcion, fecha_inicio, fecha_fin, fecha_creacion,
            sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero, estado
`;

export const getContratoByCodigo = `
  SELECT codigo, convocatoria_id, descripcion, fecha_inicio, fecha_fin, fecha_creacion,
         sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero, estado
  FROM "SphaerAI_contrato_convocatoria"
  WHERE codigo = $1
`;

export const getContratoActivoByCodigo = `
  SELECT codigo, convocatoria_id, descripcion, fecha_inicio, fecha_fin, fecha_creacion,
         sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero, estado
  FROM "SphaerAI_contrato_convocatoria"
  WHERE codigo = $1 AND estado = 1
`;

export const getAgenteByCodigo = `
  SELECT sic, agente, razon_s, nit, direccion, ciudad, telefono, codigo_tercero
  FROM "SphaerAI_contrato_convocatoria"
  WHERE codigo = $1 AND estado = 1
`;

// Campos del agente que se pueden actualizar (form -> columna)
export const CAMPOS_AGENTE = {
  SIC: "sic",
  AGENTE: "agente",
  RAZON_S: "razon_s",
  NIT: "nit",
  DIRECCION: "direccion",
  CIUDAD: "ciudad",
  TELEFONO: "telefono",
  CODIGO_TERCERO: "codigo_tercero",
};

// ─── Registro de categorías de archivos (carpeta -> tabla + columnas) ─────────────
// Lista blanca: el nombre de tabla nunca viene del usuario, solo de aquí.
// tipo: int | num | str | date  (para castear el valor del form)
export const CARPETAS = {
  preparacion_convocatoria: {
    tabla: "SphaerAI_preparacion_convoc",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  pliegos_consulta: {
    tabla: "SphaerAI_pliegos_consulta",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  preguntas_recibidas: {
    tabla: "SphaerAI_preguntas_recibidas",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
    ],
  },
  pliegos_definitivos: {
    tabla: "SphaerAI_pliegos_definitivos",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  oferta_reserva: {
    tabla: "SphaerAI_oferta_reserva",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  requisitos_habilitantes: {
    tabla: "SphaerAI_requisitos_habilitantes",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
    ],
  },
  publicacion_info_audiencia: {
    tabla: "SphaerAI_publicacion_info_audiencia",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
    ],
  },
  ofertas_cantidades_precios: {
    tabla: "SphaerAI_ofertas_cantidades_precios",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  valoracion_adjudicacion: {
    tabla: "SphaerAI_valoracion_adjudicacion",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
    ],
  },
  audiencia_publica: {
    tabla: "SphaerAI_audiencia_publica",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  contratos_firmados: {
    tabla: "SphaerAI_contratos_firmados",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
  reservas_presupuestales: {
    tabla: "SphaerAI_reservas_presupuestales",
    version: false,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
    ],
  },
  registro_asic: {
    tabla: "SphaerAI_registro_asic",
    version: true,
    campos: [
      { form: "CONTRATO_CODIGO", col: "contrato_codigo", tipo: "int", requerido: true },
      { form: "CODIGO_SIC", col: "codigo_sic", tipo: "num", requerido: true },
      { form: "NOMBRE_ARCHIVO", col: "nombre_archivo", tipo: "str", requerido: true },
      { form: "TIPO", col: "tipo", tipo: "str", requerido: true },
      { form: "PLANTILLA", col: "plantilla", tipo: "str", requerido: true },
      { form: "FECHA_INICIO", col: "fecha_inicio", tipo: "date", requerido: true },
    ],
  },
};

// Categorías que permiten reemplazo de archivo (igual que el origen)
export const CARPETAS_ACTUALIZABLES = {
  preparacion_convocatoria: ["nombre_archivo", "tipo", "fecha_inicio", "accion", "fecha_carga"],
  pliegos_consulta: ["nombre_archivo", "tipo", "fecha_inicio", "accion", "fecha_carga"],
};