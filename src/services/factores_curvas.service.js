import FactoresCurvasModel from "../models/factores_curvas.model.js";
import { createConectionPG } from "../helpers/connections.js";
import Logger from "../helpers/logger.js";
import {
  MODOS_FP,
  PERIODOS,
  TIPOS_DIA,
  codigoDestino,
  convertirAPQ,
  fpDePQ,
  reactivaDeActivaYFp,
  redondear,
  resolverFp,
  sumarPeriodos,
  validarPeriodos,
} from "../utils/factoresCurvas.js";

const modelo = FactoresCurvasModel.getInstance();

const MAX_COMPONENTES = 20;
const DIAS_HISTORIA_POR_DEFECTO = 120;
const ESPERA_COMPLETAR_MS = 30000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const errorHttp = (statusCode, message, extra = {}) => Object.assign(new Error(message), { statusCode }, extra);
const texto = (v) => (typeof v === "string" ? v.trim() : "");
const fechaONull = (v, etiqueta) => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !FECHA.test(v) || Number.isNaN(Date.parse(v))) throw errorHttp(400, `${etiqueta} no es una fecha válida (AAAA-MM-DD).`);
  return v;
};
const restarDias = (iso, dias) => new Date(Date.parse(iso) - dias * 86400000).toISOString().slice(0, 10);

/**
 * Curvas típicas cargadas (Factores de distribución): una barra nueva, o una carga que se traslada de unas barras a otra, no tiene historial
 * de medidas pero sí su curva típica por tipo de día. Aquí se validan y guardan esas curvas y se «materializan» como medidas normales con
 * códigos RPM reservados (CT-<componente>-D suma al destino; CT-<componente>-O resta al origen), así el resto del módulo las lee igual que
 * cualquier otra medida. Ver src/utils/factoresCurvas.js.
 */
export default class FactoresCurvasService {
  static instance;
  static getInstance() {
    if (!FactoresCurvasService.instance) FactoresCurvasService.instance = new FactoresCurvasService();
    return FactoresCurvasService.instance;
  }

  #completando = new Map(); // clave -> { hasta: ms, promesa }

  #pool = async (session) => {
    await modelo.asegurarTablas(session);
    return createConectionPG(session);
  };

  // ── Consulta ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Grupos del mercado, con un resumen de cada componente (sin las 24 columnas de cada curva). */
  listar = async (mc, session) => {
    if (!texto(mc)) throw errorHttp(400, "Indica el mercado.");
    const pool = await this.#pool(session);
    const grupos = await modelo.listarGrupos(pool, mc);
    return { grupos: grupos.map((g) => this.#resumen(g)) };
  };

  detalle = async (id, session) => {
    const pool = await this.#pool(session);
    const g = await modelo.obtenerGrupo(pool, Number(id));
    if (!g) throw errorHttp(404, "El grupo de curvas no existe.");
    return this.#completo(g);
  };

  /**
   * Factor de potencia típico de una barra por tipo de día, a partir de sus medidas reales (promedio de P y Q de los días del rango).
   * body: { mc, barra, fecha_inicial?, fecha_final? } (por defecto, los últimos 120 días de medidas del mercado).
   */
  fpDeBarra = async (body, session) => {
    const pool = await this.#pool(session);
    const { barra, rango } = await this.#barraYRango(pool, body);
    const historia = await this.#historiaFp(pool, barra, rango, body.mc);
    return { barra: barra.barra, rango, tipos: historia };
  };

  /** Valida y calcula todo (MW, MVAr, suma del destino, avisos) sin guardar nada. */
  previsualizar = async (body, session) => {
    const pool = await this.#pool(session);
    const p = await this.#preparar(body, pool);
    return this.#vista(p);
  };

  // ── Cambios ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Crea o reemplaza un grupo de curvas (body.id lo reemplaza). Deja las medidas listas para todo el calendario del mercado. */
  guardar = async (body, session) => {
    const pool = await this.#pool(session);
    const p = await this.#preparar(body, pool);
    const id = await modelo.transaccion(session, async (tx) => {
      let destinoId = p.grupo.destino_barra_id;
      if (p.destinoACrear) {
        const existe = await modelo.barraPorNombre(tx, p.destinoACrear.barra, p.grupo.mc);
        if (existe) throw errorHttp(409, `Ya existe una barra llamada «${p.destinoACrear.barra}».`);
        destinoId = (await modelo.crearBarra(tx, { ...p.destinoACrear, mc: p.grupo.mc })).id;
      }
      const datos = { ...p.grupo, destino_barra_id: destinoId };
      let grupoId = p.id;
      if (grupoId) {
        const previo = await modelo.obtenerGrupo(tx, grupoId);
        if (!previo) throw errorHttp(404, "El grupo de curvas no existe.");
        await modelo.retirar(tx, await modelo.idsDeComponentes(tx, grupoId));
        await modelo.borrarComponentes(tx, grupoId);
        await modelo.actualizarGrupo(tx, grupoId, datos);
      } else {
        grupoId = await modelo.insertarGrupo(tx, datos);
      }
      const componenteIds = [];
      for (const c of p.componentes) componenteIds.push(await modelo.insertarComponente(tx, grupoId, c));
      if (datos.habilitar === 1) await this.#materializar(tx, datos, p.componentes, componenteIds);
      return grupoId;
    });
    this.#completando.clear();
    return this.detalle(id, session);
  };

  /** Habilitar o deshabilitar: deshabilitado, las medidas y agrupaciones de la curva se retiran (los datos quedan guardados). */
  habilitar = async (id, habilitar, session) => {
    const pool = await this.#pool(session);
    const g = await modelo.obtenerGrupo(pool, Number(id));
    if (!g) throw errorHttp(404, "El grupo de curvas no existe.");
    const nuevo = habilitar ? 1 : 0;
    await modelo.transaccion(session, async (tx) => {
      await modelo.cambiarHabilitar(tx, g.id, nuevo);
      const ids = g.componentes.map((c) => c.id);
      await modelo.retirar(tx, ids);
      if (nuevo === 1) {
        for (const c of g.componentes) {
          await modelo.materializarComponente(tx, { mc: g.mc, componenteId: c.id, destinoBarraId: g.destino_barra_id, origenBarraId: c.origen_barra_id, descontar: g.descontar, vigencia: { desde: g.vigente_desde, hasta: g.vigente_hasta } });
        }
      }
    });
    this.#completando.clear();
    return this.detalle(g.id, session);
  };

  eliminar = async (id, session) => {
    const pool = await this.#pool(session);
    const g = await modelo.obtenerGrupo(pool, Number(id));
    if (!g) throw errorHttp(404, "El grupo de curvas no existe.");
    await modelo.transaccion(session, async (tx) => {
      await modelo.retirar(tx, g.componentes.map((c) => c.id));
      await modelo.eliminarGrupo(tx, g.id);
    });
    this.#completando.clear();
    return { id: g.id };
  };

  /**
   * Vuelve a dejar las medidas de las curvas al día. Sin `forzar` solo agrega las fechas que faltan (por ejemplo, días de medidas
   * ingresados después de cargar las curvas); con `forzar` rehace todas.
   */
  sincronizar = async ({ mc, fecha_inicial, fecha_final, forzar = false }, session) => {
    const pool = await this.#pool(session);
    const grupos = (await modelo.listarGrupos(pool, mc)).filter((g) => g.habilitar === 1);
    let filas = 0;
    for (const g of grupos) {
      for (const c of g.componentes) {
        const r = await modelo.materializarComponente(pool, {
          mc,
          componenteId: c.id,
          destinoBarraId: g.destino_barra_id,
          origenBarraId: c.origen_barra_id,
          descontar: g.descontar,
          vigencia: { desde: g.vigente_desde, hasta: g.vigente_hasta },
          rango: { desde: fecha_inicial ?? null, hasta: fecha_final ?? null },
          sobrescribir: Boolean(forzar),
        });
        filas += r;
      }
    }
    this.#completando.clear();
    return { grupos: grupos.length, filas };
  };

  /**
   * Para los cálculos: si hay curvas cargadas y faltan fechas del rango pedido, las agrega. Nunca lanza (un fallo aquí no debe impedir
   * el cálculo) y no repite el trabajo dentro de una ventana corta. Devuelve cuántas filas agregó.
   */
  completarSiHaceFalta = async (mc, desde, hasta, session) => {
    try {
      if (!mc || !desde || !hasta) return 0;
      const clave = `${session.host}:${session.basededatos}|${mc}|${desde}|${hasta}`;
      const previo = this.#completando.get(clave);
      if (previo && previo.hasta > Date.now()) return previo.promesa;
      const promesa = this.#completar(mc, desde, hasta, session).catch((err) => {
        Logger.error(`[factores_curvas.completar] ${err.message}`);
        this.#completando.delete(clave);
        return 0;
      });
      this.#completando.set(clave, { hasta: Date.now() + ESPERA_COMPLETAR_MS, promesa });
      return promesa;
    } catch (err) {
      Logger.error(`[factores_curvas.completarSiHaceFalta] ${err.message}`);
      return 0;
    }
  };

  #completar = async (mc, desde, hasta, session) => {
    const pool = await this.#pool(session);
    const activos = await modelo.codigosActivos(pool, mc);
    let agregadas = 0;
    for (const a of activos) {
      const vigencia = { desde: a.vigente_desde, hasta: a.vigente_hasta };
      if ((await modelo.faltanFechas(pool, mc, desde, hasta, codigoDestino(a.componente_id), vigencia)) === 0) continue;
      agregadas += await modelo.materializarComponente(pool, {
        mc,
        componenteId: a.componente_id,
        destinoBarraId: a.destino_barra_id,
        origenBarraId: a.origen_barra_id,
        descontar: a.descontar,
        vigencia,
        rango: { desde, hasta },
        sobrescribir: false,
      });
    }
    return agregadas;
  };

  /**
   * Para las pantallas que editan barras, agrupaciones y medidas: si el código o la agrupación es de una curva cargada, se lo impide
   * (se administran desde «Curvas cargadas»). Lanza 409.
   */
  exigirNoCurva = (codigo, accion = "modificar") => {
    if (/^CT-\d+-[DO]$/.test(String(codigo ?? ""))) {
      throw errorHttp(409, `No se puede ${accion} «${codigo}»: es una curva cargada. Se administra desde «Curvas cargadas».`);
    }
  };

  /** No se puede borrar una barra mientras tenga curvas cargadas (como destino o como origen). Lanza 409. */
  exigirBarraSinCurvas = async (barraId, session) => {
    const pool = await this.#pool(session);
    const grupos = await modelo.gruposQueUsanBarra(pool, Number(barraId));
    if (grupos.length) throw errorHttp(409, `La barra tiene curvas cargadas (${grupos.map((g) => `«${g.nombre}»`).join(", ")}). Elimina primero esas curvas.`);
  };

  /** Lanza 409 si el id de agrupación es de una curva cargada. */
  exigirAgrupacionNoCurva = async (agrupacionId, session, accion) => {
    const pool = await this.#pool(session);
    const a = await modelo.agrupacionPorId(pool, Number(agrupacionId));
    if (a) this.exigirNoCurva(a.codigo_rpm, accion);
  };

  // ── Internos ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  #materializar = async (tx, grupo, componentes, componenteIds) => {
    for (let i = 0; i < componentes.length; i++) {
      await modelo.materializarComponente(tx, {
        mc: grupo.mc,
        componenteId: componenteIds[i],
        destinoBarraId: grupo.destino_barra_id,
        origenBarraId: componentes[i].origen_barra_id,
        descontar: grupo.descontar,
        vigencia: { desde: grupo.vigente_desde, hasta: grupo.vigente_hasta },
      });
    }
  };

  #barraYRango = async (db, { mc, barra, fecha_inicial, fecha_final }) => {
    if (!texto(mc) || !texto(barra)) throw errorHttp(400, "Indica el mercado y la barra.");
    const b = await modelo.barraPorNombre(db, barra, mc);
    if (!b) throw errorHttp(404, `La barra «${barra}» no existe en ${mc}.`);
    let hasta = fechaONull(fecha_final, "La fecha final");
    let desde = fechaONull(fecha_inicial, "La fecha inicial");
    if (!hasta) hasta = (await modelo.ultimaFecha(db, mc)) ?? new Date().toISOString().slice(0, 10);
    if (!desde) desde = restarDias(hasta, DIAS_HISTORIA_POR_DEFECTO);
    if (desde > hasta) throw errorHttp(400, "La fecha inicial no puede ser posterior a la final.");
    return { barra: b, rango: { desde, hasta } };
  };

  /** { TIPO_DIA: { dias, p, q, fp } } con los promedios de la barra; solo los tipos de día que tienen medidas completas. */
  #historiaFp = async (db, barra, rango, mc) => {
    const prom = await modelo.promedioPorTipoDia(db, barra.id, rango.desde, rango.hasta, mc);
    const salida = {};
    for (const tipo of TIPOS_DIA) {
      const a = prom[tipo]?.A;
      const r = prom[tipo]?.R;
      if (!a || !r) continue;
      salida[tipo] = { dias: Math.min(a.dias, r.dias), p: a.valores.map((v) => redondear(v)), q: r.valores.map((v) => redondear(v)), fp: fpDePQ(a.valores, r.valores) };
    }
    return salida;
  };

  /** Valida todo el cuerpo y deja listo lo que se guarda: grupo, componentes con sus curvas S, P y Q, y avisos. No escribe nada. */
  #preparar = async (body, db) => {
    const b = body ?? {};
    const mc = texto(b.mc);
    const nombre = texto(b.nombre);
    if (!mc) throw errorHttp(400, "Indica el mercado.");
    if (!nombre) throw errorHttp(400, "Indica un nombre para el grupo de curvas.");
    if (nombre.length > 150) throw errorHttp(400, "El nombre admite hasta 150 caracteres.");
    const observaciones = texto(b.observaciones).slice(0, 2000);
    const vigente_desde = fechaONull(b.vigente_desde, "El inicio de la vigencia");
    const vigente_hasta = fechaONull(b.vigente_hasta, "El fin de la vigencia");
    if (vigente_desde && vigente_hasta && vigente_desde > vigente_hasta) throw errorHttp(400, "La vigencia termina antes de empezar.");
    const id = b.id ? Number(b.id) : null;
    const avisos = [];

    // Barra destino: una existente o una nueva (se crea al guardar).
    let destino = null;
    let destinoACrear = null;
    if (b.destino?.crear) {
      const nuevo = texto(b.destino.crear.barra);
      if (!nuevo) throw errorHttp(400, "Indica el nombre de la barra nueva.");
      if (nuevo.length > 100) throw errorHttp(400, "El nombre de la barra admite hasta 100 caracteres.");
      if (await modelo.barraPorNombre(db, nuevo, mc)) throw errorHttp(409, `Ya existe una barra llamada «${nuevo}». Elígela como destino.`);
      destinoACrear = { barra: nuevo, descripcion: texto(b.destino.crear.descripcion), nivel_tension: b.destino.crear.nivel_tension ?? null, observaciones: texto(b.destino.crear.observaciones) };
      avisos.push(`Se creará la barra «${nuevo}».`);
    } else {
      const nombreDestino = texto(b.destino?.barra);
      if (!nombreDestino) throw errorHttp(400, "Indica la barra destino (o crea una nueva).");
      destino = await modelo.barraPorNombre(db, nombreDestino, mc);
      if (!destino) throw errorHttp(404, `La barra destino «${nombreDestino}» no existe en ${mc}.`);
    }

    const lista = Array.isArray(b.componentes) ? b.componentes : [];
    if (lista.length === 0) throw errorHttp(400, "Agrega al menos una curva.");
    if (lista.length > MAX_COMPONENTES) throw errorHttp(400, `Un grupo admite hasta ${MAX_COMPONENTES} curvas.`);
    const descontar = b.descontar === undefined ? true : Boolean(b.descontar);

    const componentes = [];
    const vistos = new Set();
    for (const [i, c] of lista.entries()) componentes.push(await this.#componente(db, c, i, { mc, destino, destinoNombre: destino?.barra ?? destinoACrear.barra, vistos, avisos, descontar }));

    // La misma carga no puede sumarse dos veces a un destino por dos grupos distintos.
    if (destino) {
      const origenIds = componentes.map((c) => c.origen_barra_id).filter(Boolean);
      if (origenIds.length) {
        const duplicados = await modelo.origenesDuplicados(db, mc, destino.id, id, origenIds);
        if (duplicados.length) throw errorHttp(409, `«${duplicados[0].origen}» ya se traslada a ${destino.barra} en el grupo «${duplicados[0].nombre}». Edita ese grupo en vez de crear otro.`);
      }
    }

    return {
      id,
      grupo: { mc, nombre, destino_barra_id: destino?.id ?? null, descontar, habilitar: b.habilitar === undefined || b.habilitar ? 1 : 0, vigente_desde, vigente_hasta, observaciones },
      destinoACrear,
      destinoNombre: destino?.barra ?? destinoACrear.barra,
      componentes,
      avisos,
    };
  };

  #componente = async (db, c, i, ctx) => {
    const etiqueta = `Curva ${i + 1}`;
    const unidad = c?.unidad === "MW" ? "MW" : c?.unidad === "MVA" ? "MVA" : null;
    if (!unidad) throw errorHttp(400, `${etiqueta}: la unidad debe ser MVA o MW.`);

    // Barra de origen (de la que se traslada); vacía = curva propia del destino, no hay nada que restar.
    let origen = null;
    const nombreOrigen = texto(c.origen_barra);
    if (nombreOrigen) {
      origen = await modelo.barraPorNombre(db, nombreOrigen, ctx.mc);
      if (!origen) throw errorHttp(404, `${etiqueta}: la barra de origen «${nombreOrigen}» no existe en ${ctx.mc}.`);
      if (origen.id === ctx.destino?.id || origen.barra === ctx.destinoNombre) throw errorHttp(400, `${etiqueta}: la barra de origen no puede ser la misma que el destino.`);
      if (ctx.vistos.has(origen.id)) throw errorHttp(400, `La barra de origen «${origen.barra}» está repetida.`);
      ctx.vistos.add(origen.id);
    } else if (!ctx.descontar) {
      // sin origen y sin restar: es una curva propia del destino
    }
    const nombre = origen ? origen.barra : `curva ${i + 1}`;

    // Curvas por tipo de día: las 3 son obligatorias (si no, ese tipo de día quedaría sin la barra).
    const curvasEntrada = c.curvas ?? {};
    const principal = {};
    for (const tipo of TIPOS_DIA) {
      const r = validarPeriodos(curvasEntrada[tipo], `${etiqueta} (${nombre}), ${tipo}`);
      if (r.error) throw errorHttp(400, r.error);
      principal[tipo] = r.valores;
    }

    // Factor de potencia por tipo de día: lo indicado, o el de la historia de una barra (por defecto, la de origen).
    const fpEntrada = c.fp ?? {};
    const modo = fpEntrada.modo;
    const reactivaEntrada = c.reactiva ?? null;
    const necesitaFp = unidad === "MVA" || !reactivaEntrada;
    let fpPorTipo = null;
    let fpBarra = null;
    let rango = null;
    if (necesitaFp) {
      if (!MODOS_FP.includes(modo)) throw errorHttp(400, `${etiqueta} (${nombre}): indica el factor de potencia (fijo, por periodo o el de una barra).`);
      let historia = null;
      if (modo === "BARRA") {
        const nombreRef = texto(fpEntrada.barra) || origen?.barra;
        if (!nombreRef) throw errorHttp(400, `${etiqueta}: indica de qué barra se toma el factor de potencia.`);
        const ref = await this.#barraYRango(db, { mc: ctx.mc, barra: nombreRef, fecha_inicial: fpEntrada.fecha_inicial, fecha_final: fpEntrada.fecha_final });
        historia = await this.#historiaFp(db, ref.barra, ref.rango, ctx.mc);
        fpBarra = ref.barra;
        rango = ref.rango;
        for (const tipo of TIPOS_DIA) {
          if (!historia[tipo]) throw errorHttp(400, `${etiqueta}: la barra «${ref.barra.barra}» no tiene medidas completas de ${tipo} entre ${ref.rango.desde} y ${ref.rango.hasta}; elige otro rango o indica el factor de potencia.`);
        }
      }
      fpPorTipo = {};
      for (const tipo of TIPOS_DIA) {
        const periodos = modo === "PERIODO" ? (Array.isArray(fpEntrada.periodos) ? fpEntrada.periodos : fpEntrada.periodos?.[tipo]) : null;
        const r = resolverFp({ modo, valor: fpEntrada.valor, periodos, historia: historia?.[tipo]?.fp }, `${etiqueta} (${nombre}), ${tipo}: el factor de potencia`);
        if (r.error) throw errorHttp(400, r.error);
        fpPorTipo[tipo] = r.fp;
      }
    }

    // Reactiva dada (solo con MW) o derivada.
    const curvas = {};
    for (const tipo of TIPOS_DIA) {
      let p;
      let q;
      let s = null;
      if (unidad === "MVA") {
        s = principal[tipo];
        ({ p, q } = convertirAPQ(s, fpPorTipo[tipo]));
      } else {
        p = principal[tipo];
        if (reactivaEntrada) {
          const rq = validarPeriodos(reactivaEntrada[tipo], `${etiqueta} (${nombre}), reactiva de ${tipo}`);
          if (rq.error) throw errorHttp(400, rq.error);
          q = rq.valores;
        } else {
          q = reactivaDeActivaYFp(p, fpPorTipo[tipo]);
        }
        s = p.map((v, k) => redondear(Math.hypot(v, q[k])));
      }
      curvas[tipo] = { S: s, P: p, Q: q };
    }

    // Aviso útil: lo que se resta a una barra de origen no debería superar su demanda típica (quedaría negativa).
    if (origen && ctx.descontar) {
      try {
        const ref = await this.#barraYRango(db, { mc: ctx.mc, barra: origen.barra });
        const historia = await modelo.promedioPorTipoDia(db, origen.id, ref.rango.desde, ref.rango.hasta, ctx.mc);
        for (const tipo of TIPOS_DIA) {
          const base = historia[tipo]?.A?.valores;
          if (!base) continue;
          const periodo = curvas[tipo].P.findIndex((v, k) => v > base[k]);
          if (periodo >= 0) ctx.avisos.push(`${origen.barra} (${tipo}): lo que se traslada supera su demanda promedio del periodo ${periodo + 1} (${curvas[tipo].P[periodo]} frente a ${redondear(base[periodo], 2)} MW). Revisa la curva o la unidad.`);
        }
      } catch (err) {
        Logger.warn(`[factores_curvas] no se pudo comparar con la demanda de ${origen.barra}: ${err.message}`);
      }
    }

    return {
      origen_barra_id: origen?.id ?? null,
      origen_barra: origen?.barra ?? null,
      unidad,
      fp_modo: necesitaFp ? modo : null,
      fp_valor: modo === "FIJO" ? Number(fpPorTipo.ORDINARIO[0]) : null,
      fp_barra_id: fpBarra?.id ?? null,
      fp_desde: rango?.desde ?? null,
      fp_hasta: rango?.hasta ?? null,
      curvas,
    };
  };

  /** Lo que ve la pantalla antes de guardar: curvas calculadas, suma del destino, y avisos. */
  #vista = (p) => {
    const destino = {};
    for (const tipo of TIPOS_DIA) {
      destino[tipo] = { P: sumarPeriodos(p.componentes.map((c) => c.curvas[tipo].P)), Q: sumarPeriodos(p.componentes.map((c) => c.curvas[tipo].Q)) };
      destino[tipo].S = destino[tipo].P.map((v, k) => redondear(Math.hypot(v, destino[tipo].Q[k])));
      destino[tipo].fp = fpDePQ(destino[tipo].P, destino[tipo].Q);
    }
    return {
      nombre: p.grupo.nombre,
      destino: p.destinoNombre,
      destino_nuevo: Boolean(p.destinoACrear),
      descontar: p.grupo.descontar,
      componentes: p.componentes.map((c) => ({ origen: c.origen_barra, unidad: c.unidad, fp_modo: c.fp_modo, curvas: c.curvas })),
      suma_destino: destino,
      avisos: p.avisos,
    };
  };

  #resumen = (g) => ({
    id: g.id,
    mc: g.mc,
    nombre: g.nombre,
    destino: g.destino,
    destino_barra_id: g.destino_barra_id,
    descontar: g.descontar,
    habilitar: g.habilitar,
    vigente_desde: g.vigente_desde,
    vigente_hasta: g.vigente_hasta,
    observaciones: g.observaciones,
    actualizado_en: g.actualizado_en,
    componentes: g.componentes.map((c) => ({
      id: c.id,
      origen: c.origen,
      unidad: c.unidad,
      fp_modo: c.fp_modo,
      fp_valor: c.fp_valor,
      fp_barra: c.fp_barra,
      fp_desde: c.fp_desde,
      fp_hasta: c.fp_hasta,
      pico_mw: Object.fromEntries(TIPOS_DIA.map((t) => [t, c.curvas[t]?.P ? redondear(Math.max(...c.curvas[t].P), 3) : null])),
    })),
  });

  #completo = (g) => {
    const resumen = this.#resumen(g);
    const destino = {};
    for (const tipo of TIPOS_DIA) {
      const ps = g.componentes.map((c) => c.curvas[tipo]?.P).filter(Boolean);
      const qs = g.componentes.map((c) => c.curvas[tipo]?.Q).filter(Boolean);
      if (!ps.length) continue;
      const P = sumarPeriodos(ps);
      const Q = sumarPeriodos(qs);
      destino[tipo] = { P, Q, S: P.map((v, k) => redondear(Math.hypot(v, Q[k]))), fp: fpDePQ(P, Q) };
    }
    return { ...resumen, componentes: resumen.componentes.map((r, i) => ({ ...r, curvas: g.componentes[i].curvas })), suma_destino: destino, periodos: PERIODOS.length };
  };
}
