import * as cheerio from "cheerio";
import Logger from "../helpers/logger.js";
import colors from "colors";

const IDEAM_ORIGEN = "https://www.ideam.gov.co";
const IDEAM_URL = `${IDEAM_ORIGEN}/sala-de-prensa/noticias`;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

// Estructura real del listado (Drupal Views), verificada contra el HTML en
// vivo — no es una suposición genérica de CMS:
//
// <div class="row noticias mb-4">
//   <div class="col-md-3 ..."><img src="/sites/default/files/..."></div>
//   <div class="col-md-9">
//     <time datetime="2026-08-09T12:00:00Z" class="datetime">9 Agosto, 2026</time>
//     <h2 class="h5 mt-2"><a href="/sala-de-prensa/noticia/...">Título</a></h2>
//     <p>Resumen...</p>
//     <div class="lista--tags"><a>Tag</a>...</div>
//   </div>
// </div>
//
// Si IDEAM cambia este markup, sólo hay que ajustar los selectores de acá.
const absolutizarUrl = (posibleRelativa) => {
  const limpia = (posibleRelativa ?? "").trim();
  if (!limpia) return null;
  return limpia.startsWith("/") ? `${IDEAM_ORIGEN}${limpia}` : limpia;
};

const parsearNoticias = (html) => {
  const $ = cheerio.load(html);
  const noticias = [];

  $(".row.noticias.mb-4").each((_, el) => {
    const item = $(el);
    const enlaceTitulo = item.find("h2.h5 a").first();
    const titulo = enlaceTitulo.text().trim();
    const url = absolutizarUrl(enlaceTitulo.attr("href"));
    if (!titulo || !url) return; // fila sin datos usables, se descarta

    const tiempo = item.find("time.datetime").first();
    const fechaIso = tiempo.attr("datetime") ?? null;
    const fecha = tiempo.text().trim() || null;

    const resumen =
      item.find(".col-md-9 > p").first().text().replace(/\s+/g, " ").trim() ||
      null;
    const imagen = absolutizarUrl(item.find(".col-md-3 img").first().attr("src"));
    const tags = item
      .find(".lista--tags a")
      .map((__, a) => $(a).text().trim())
      .get()
      .filter(Boolean);

    noticias.push({ fuente: "IDEAM", titulo, url, fecha, fechaIso, resumen, imagen, tags });
  });

  return noticias;
};

let cache = { data: [], timestamp: 0 };

const scrapearIdeam = async () => {
  const response = await fetch(IDEAM_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!response.ok) {
    throw new Error(`IDEAM respondió ${response.status}`);
  }
  const html = await response.text();
  return parsearNoticias(html);
};

export default class NoticiasIdeamService {
  static instance;

  static getInstance() {
    if (!NoticiasIdeamService.instance) {
      NoticiasIdeamService.instance = new NoticiasIdeamService();
    }
    return NoticiasIdeamService.instance;
  }

  // Caché en memoria (30 min) + fallback a la última copia buena si IDEAM
  // falla o cambia su markup — así una caída de IDEAM no rompe el panel.
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
      const noticias = await scrapearIdeam();
      if (noticias.length > 0) {
        cache = { data: noticias, timestamp: ahora };
        return {
          success: true,
          data: noticias.slice(0, limite),
          message: "Noticias obtenidas correctamente",
        };
      }
      // Página cargó pero no matcheó nada — probable cambio de markup en
      // IDEAM. Se reporta como error para no cachear una lista vacía.
      throw new Error("No se encontraron noticias en el HTML de IDEAM");
    } catch (error) {
      Logger.error(colors.red("Error NoticiasIdeamService obtenerNoticias"), error);
      if (cache.data.length > 0) {
        return {
          success: true,
          data: cache.data.slice(0, limite),
          message: "No se pudo actualizar IDEAM, se muestran noticias en caché",
        };
      }
      return {
        success: false,
        data: null,
        message: "No se pudo consultar las noticias de IDEAM",
      };
    }
  };
}
