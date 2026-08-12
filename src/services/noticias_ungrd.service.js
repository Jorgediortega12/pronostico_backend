import * as cheerio from "cheerio";
import Logger from "../helpers/logger.js";
import colors from "colors";

const UNGRD_ORIGEN = "https://portal.gestiondelriesgo.gov.co";
const UNGRD_URL = `${UNGRD_ORIGEN}/`;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

// El portal de UNGRD es SharePoint. Se probó primero el feed RSS oficial de
// su repositorio documental (repositorio.gestiondelriesgo.gov.co, colección
// "Boletines de prensa") pero está desactualizado por meses frente a las
// noticias reales del home — así que se scrapea el webpart de noticias del
// home directamente, verificado contra el HTML en vivo:
//
// <li class="dfwp-item ..."><div class="item otherNews">
//   <div class="dateTime"><span>Bogotá, </span>agosto 10, 2026</div>
//   <div class="link-item"><a href="https://portal..../Paginas/Noticias/2026/....aspx">Título</a></div>
//   <div class="image-area-left"><a href="..."><img src="/PublishingImages/..."></a></div>
//   <div class="description"><p>Resumen...</p></div>
// </div></li>
//
// El home sólo trae ~4 noticias (no hay paginación real hacia noticias
// vivas, el "MÁS NOTICIAS" del sitio lleva al repositorio desactualizado).

const MESES_ES = {
  enero: "01", febrero: "02", marzo: "03", abril: "04",
  mayo: "05", junio: "06", julio: "07", agosto: "08",
  septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

const absolutizarUrl = (posibleRelativa) => {
  const limpia = (posibleRelativa ?? "").trim();
  if (!limpia) return null;
  return limpia.startsWith("/") ? `${UNGRD_ORIGEN}${limpia}` : limpia;
};

// "Bogotá, agosto 10, 2026" -> { fecha: "10 agosto, 2026", fechaIso: "2026-08-10" }
const parsearFecha = (textoCrudo) => {
  const texto = (textoCrudo ?? "").replace(/\s+/g, " ").trim();
  const match =
    /([a-záéíóúñ]+)\s+(\d{1,2}),?\s+(\d{4})/i.exec(texto);
  if (!match) return { fecha: texto || null, fechaIso: null };

  const [, mesTexto, dia, anio] = match;
  const mes = MESES_ES[mesTexto.toLowerCase()];
  const fechaIso = mes
    ? `${anio}-${mes}-${dia.padStart(2, "0")}`
    : null;
  const fecha = `${dia} ${mesTexto}, ${anio}`;
  return { fecha, fechaIso };
};

const parsearNoticias = (html) => {
  const $ = cheerio.load(html);
  const noticias = [];

  $(".item.otherNews").each((_, el) => {
    const item = $(el);
    const enlaceTitulo = item.find(".link-item a").first();
    const titulo = enlaceTitulo.text().trim();
    const url = absolutizarUrl(enlaceTitulo.attr("href"));
    if (!titulo || !url) return;

    const { fecha, fechaIso } = parsearFecha(
      item.find(".dateTime").first().text(),
    );
    const resumen =
      item.find(".description p").first().text().replace(/\s+/g, " ").trim() ||
      null;
    const imagen = absolutizarUrl(
      item.find(".image-area-left img").first().attr("src"),
    );

    noticias.push({
      fuente: "UNGRD",
      titulo,
      url,
      fecha,
      fechaIso,
      resumen,
      imagen,
      tags: [],
    });
  });

  return noticias;
};

let cache = { data: [], timestamp: 0 };

const scrapearUngrd = async () => {
  const response = await fetch(UNGRD_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!response.ok) {
    throw new Error(`UNGRD respondió ${response.status}`);
  }
  const html = await response.text();
  return parsearNoticias(html);
};

export default class NoticiasUngrdService {
  static instance;

  static getInstance() {
    if (!NoticiasUngrdService.instance) {
      NoticiasUngrdService.instance = new NoticiasUngrdService();
    }
    return NoticiasUngrdService.instance;
  }

  obtenerNoticias = async (limite = 5) => {
    const ahora = Date.now();
    if (cache.data.length > 0 && ahora - cache.timestamp < CACHE_TTL_MS) {
      return {
        success: true,
        data: cache.data.slice(0, limite),
        message: "Noticias obtenidas desde caché",
      };
    }

    try {
      const noticias = await scrapearUngrd();
      if (noticias.length > 0) {
        cache = { data: noticias, timestamp: ahora };
        return {
          success: true,
          data: noticias.slice(0, limite),
          message: "Noticias obtenidas correctamente",
        };
      }
      throw new Error("No se encontraron noticias en el HTML de UNGRD");
    } catch (error) {
      Logger.error(colors.red("Error NoticiasUngrdService obtenerNoticias"), error);
      if (cache.data.length > 0) {
        return {
          success: true,
          data: cache.data.slice(0, limite),
          message: "No se pudo actualizar UNGRD, se muestran noticias en caché",
        };
      }
      return {
        success: false,
        data: null,
        message: "No se pudo consultar las noticias de UNGRD",
      };
    }
  };
}
