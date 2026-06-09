import Joi from "joi";

const medidaSchema = Joi.object({
  flujo: Joi.string().required(),
  fecha: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  codigo_rpm: Joi.string().required(),

  p1: Joi.number().allow(null),
  p2: Joi.number().allow(null),
  p3: Joi.number().allow(null),
  p4: Joi.number().allow(null),
  p5: Joi.number().allow(null),
  p6: Joi.number().allow(null),
  p7: Joi.number().allow(null),
  p8: Joi.number().allow(null),
  p9: Joi.number().allow(null),
  p10: Joi.number().allow(null),
  p11: Joi.number().allow(null),
  p12: Joi.number().allow(null),
  p13: Joi.number().allow(null),
  p14: Joi.number().allow(null),
  p15: Joi.number().allow(null),
  p16: Joi.number().allow(null),
  p17: Joi.number().allow(null),
  p18: Joi.number().allow(null),
  p19: Joi.number().allow(null),
  p20: Joi.number().allow(null),
  p21: Joi.number().allow(null),
  p22: Joi.number().allow(null),
  p23: Joi.number().allow(null),
  p24: Joi.number().allow(null),
});

export default {
  guardarBarra: Joi.object({
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  consultarBarrasIndex_xMC: Joi.object().keys({
    mc: Joi.string().required(),
  }),

  actualizarBarra: Joi.object({
    id: Joi.number().optional(),
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  guardarAgrupacion: Joi.object({
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  consultarAgrupacionesIndex_xBarraId: Joi.object().keys({
    barra_id: Joi.number().required(),
  }),

  actualizarAgrupacion: Joi.object({
    id: Joi.number().optional(),
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  eliminarBarra: Joi.object({
    id: Joi.number().required(),
  }),
  eliminarAgrupacion: Joi.object({
    id: Joi.number().required(),
  }),
  eliminarMedidasRapido: Joi.object({
    medidas: Joi.array()
      .items(
        medidaSchema.keys({
          // para delete solo exigimos las claves
          p1: Joi.any().optional(),
          p2: Joi.any().optional(),
          p3: Joi.any().optional(),
          p4: Joi.any().optional(),
          p5: Joi.any().optional(),
          p6: Joi.any().optional(),
          p7: Joi.any().optional(),
          p8: Joi.any().optional(),
          p9: Joi.any().optional(),
          p10: Joi.any().optional(),
          p11: Joi.any().optional(),
          p12: Joi.any().optional(),
          p13: Joi.any().optional(),
          p14: Joi.any().optional(),
          p15: Joi.any().optional(),
          p16: Joi.any().optional(),
          p17: Joi.any().optional(),
          p18: Joi.any().optional(),
          p19: Joi.any().optional(),
          p20: Joi.any().optional(),
          p21: Joi.any().optional(),
          p22: Joi.any().optional(),
          p23: Joi.any().optional(),
          p24: Joi.any().optional(),
        }),
      )
      .min(1)
      .required(),
  }),
  insertarMedidasRapido: Joi.object({
    medidas: Joi.array().items(medidaSchema).min(1).required(),
  }),
  actualizarMedidasRapido: Joi.object({
    medidas: Joi.array().items(medidaSchema).min(1).required(),
  }),
  eliminarFechasIngresadasTodos: Joi.object({
    ucp: Joi.string().required(),
  }),

  guardarRangoFecha: Joi.object({
    fechaInicio: Joi.string().required(),
    fechaFinal: Joi.string().required(),
    ucp: Joi.string().required(),
    barra: Joi.string().required(),
    tipo_dia: Joi.string().required(),
    nro_dias: Joi.number().required(),
  }),

  consultarBarraNombre: Joi.object({
    barra: Joi.string().required(),
  }),

  consultarBarraFlujoNombreInicial: Joi.object({
    barra: Joi.string().required(),
    tipo: Joi.string().length(1).required(),
  }),
  consultarBarraFactorNombre: Joi.object({
    // Solo validar lo que viene del body
    codigo_rpm: Joi.array().items(Joi.string()).min(1).required(),
  }),
  consultarMedidasCalcularCompleto: Joi.object({
    fecha_inicial: Joi.string().required(),
    fecha_final: Joi.string().required(),
    mc: Joi.string().required(),
    barra: Joi.string().required(),
    tipo_dia: Joi.string().valid("ORDINARIO", "SABADO", "FESTIVO").required(),
    codigo_rpm: Joi.array().items(Joi.string()).min(1).required(),
    flujo: Joi.array().items(Joi.string()).min(1).required(),
    marcado: Joi.boolean().optional().default(false),
  }),
  exportarMedidasExcel: Joi.object({
    fecha_inicial: Joi.string().required(),
    fecha_final: Joi.string().required(),
    mc: Joi.string().required(),
    tipo_dia: Joi.string().valid("ORDINARIO", "SABADO", "FESTIVO").required(),
    tipo_energia: Joi.string().length(1).valid("A", "R").required(),
    marcado: Joi.boolean().optional().default(false),
  }),
  calculosCurvasTipicas: Joi.object({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    ucp: Joi.string().required(),
    tipo_dia: Joi.string().valid("ORDINARIO", "SABADO", "FESTIVO").required(),
    flujo_tipo: Joi.string().length(1).valid("A", "R").required(),
    n_max: Joi.number().required(),
    barra: Joi.string().required(),
  }),
  calculoFdaFdp: Joi.object({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    ucp: Joi.string().required(),
    tipo_dia: Joi.string().valid("ORDINARIO", "SABADO", "FESTIVO").required(),
    curvas_tipicas: Joi.array()
      .items(
        Joi.object({
          barra: Joi.string().required(),
          fecha: Joi.string().required(),
        }),
      )
      .required(),
  }),
  calcularMedidas: Joi.object({
    fecha_inicio: Joi.string().isoDate().required(),
    fecha_fin: Joi.string().isoDate().required(),
    e_ar: Joi.string().required(),
    ucp: Joi.string().required(),
  }),
  obtenerDatosCompletoBarra: Joi.object({
    barras: Joi.array().items(Joi.string()).min(1).required(),
    fecha_inicial: Joi.string().required(),
    fecha_final: Joi.string().required(),
    mc: Joi.string().required(),
    tipo_dia: Joi.string().valid("ORDINARIO", "SABADO", "FESTIVO").required(),
    flujo_tipo: Joi.string().valid("A", "R").required(),
    n_max: Joi.number().min(1).required(),
  }),

  guardarSesionReporteFactores: Joi.object({
    ucp: Joi.string().required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    usuario: Joi.string().required(),
    observacion: Joi.string().allow("", null),
    resultadosFdaFdp: Joi.array()
      .items(
        Joi.object({
          tipoDia: Joi.string()
            .valid("ORDINARIO", "SABADO", "FESTIVO")
            .required(),
          tipo: Joi.string().valid("FDA", "FDP").required(),
          barra: Joi.string().required(),
          periodos: Joi.object().required(),
        }),
      )
      .required(),
    sumasRef: Joi.array()
      .items(
        // ← reemplaza comboDataMap
        Joi.object({
          tipo_dia: Joi.string().required(),
          tipo_energia: Joi.string().required(),
          periodos: Joi.object().required(),
        }),
      )
      .required(),
  }),
  cargarArchivoVrSesionesFactores: Joi.object().keys({
    codcarpeta: Joi.number().required(),
  }),
  calculosCurvasTipicasCircuitos: Joi.object({
    medidas: Joi.array()
      .items(
        Joi.object({
          codigo_rpm: Joi.string().required(),
          circuito: Joi.string().required(),
          ucp: Joi.string().required(),
          fecha: Joi.string().required(), // YYYY-MM-DD
          flujo: Joi.string().required(), // "AE", "RE", etc.
          p1: Joi.number().required(),
          p2: Joi.number().required(),
          p3: Joi.number().required(),
          p4: Joi.number().required(),
          p5: Joi.number().required(),
          p6: Joi.number().required(),
          p7: Joi.number().required(),
          p8: Joi.number().required(),
          p9: Joi.number().required(),
          p10: Joi.number().required(),
          p11: Joi.number().required(),
          p12: Joi.number().required(),
          p13: Joi.number().required(),
          p14: Joi.number().required(),
          p15: Joi.number().required(),
          p16: Joi.number().required(),
          p17: Joi.number().required(),
          p18: Joi.number().required(),
          p19: Joi.number().required(),
          p20: Joi.number().required(),
          p21: Joi.number().required(),
          p22: Joi.number().required(),
          p23: Joi.number().required(),
          p24: Joi.number().required(),
        }),
      )
      .min(1)
      .required(),
    n_max: Joi.number().required(),
  }),
  guardarReporteDNA: Joi.object({
    ucp: Joi.string().required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    dna_total: Joi.number().required(),
    filas: Joi.array()
      .items(
        Joi.object({
          periodo: Joi.number().integer().min(1).max(24).required(),
          pro: Joi.number().required(),
          da: Joi.number().required(),
          dna: Joi.number().required(),
          dr: Joi.number().required(),
        }),
      )
      .length(24)
      .required(),
  }),
};
