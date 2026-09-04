// services/epm.service.js
import colors from "colors";
import Logger from "../helpers/logger.js";
import FactoresModel from "../models/factores.model.js";
import { createConectionPG } from "../helpers/connections.js";
import { obtenerConfigInterna } from "./epm_config.service.js";

const model = FactoresModel.getInstance();

const construirCodigoRpm = (estacion, nivelTension, campo) => {
  const est = estacion.replace(/^M/, "");
  const nt = nivelTension.replace(/\s+/g, "");
  const cam = campo.replace(/\s+/g, "");
  return `${est}${nt}${cam}`;
};

export const consultarEPM = async ({ consulta, desde, hasta, session }) => {
  try {
    const config = await obtenerConfigInterna();
    if (!config || !config.tenantId || !config.clientSecret) {
      throw new Error(
        "La API de EPM no está configurada — vaya a Configuración > EPM.",
      );
    }

    // ── PASO 1: Token Microsoft ─────────────────────────────
    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

    const tokenBody = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope,
      grant_type: "client_credentials",
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });

    const tokenData = await tokenRes.json();
    const microsoftToken = tokenData?.access_token;
    if (!microsoftToken) throw new Error("No se obtuvo el token de Microsoft");

    // ── PASO 2: Login EPM ───────────────────────────────────
    const loginRes = await fetch(config.loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        aplicacionOrigen: "sphaerai",
        Authorization: `Bearer ${microsoftToken}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      },
      body: JSON.stringify({}),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      throw new Error(`Login EPM failed: ${loginRes.status} - ${text}`);
    }

    const loginData = await loginRes.json();
    const epmToken = loginData?.accessToken;
    if (!epmToken) throw new Error("No se obtuvo el accessToken de EPM");

    // ── PASO 3: Consulta EPM ────────────────────────────────
    const url = new URL(`${config.consultaUrl}/${consulta}`);
    url.searchParams.append("desde", desde);
    url.searchParams.append("hasta", hasta);

    const consultaRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${epmToken}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Content-Type": "application/json",
      },
    });

    const datosEPM = await consultaRes.json();

    // ── PASO 4: Procesar y agrupar ──────────────────────────
    // Solo se agrupan/insertan mediciones de potencia (P activa, Q
    // reactiva) — el resto (ej. corriente "I T") se descarta acá, aunque
    // sigue viniendo completo en `datosEPM` (la respuesta cruda).
    const ELEMENTOS_VALIDOS = new Set(["P", "Q"]);

    const grupos = new Map();
    // cache "codigo_rpm||flujo" -> config de agrupación. Un mismo codigo_rpm
    // suele tener DOS agrupaciones (AE para P, R1 para Q) — cachear solo por
    // codigo_rpm mezclaba la config de una con los items de la otra.
    const mapaAgrupacion = new Map();

    for (const item of datosEPM) {
      const elemento = String(item.ELEMENTO ?? "").trim().toUpperCase();
      if (!ELEMENTOS_VALIDOS.has(elemento)) continue;

      const codigoRpm = construirCodigoRpm(
        item.ESTACION,
        item.NIVEL_TENSION,
        item.CAMPO,
      );

      // FECHA llega sin 'Z' (ej. "2026-06-01 01:00:00.000") — parsearla con
      // Date().getUTCHours() la interpreta como hora LOCAL del servidor y
      // la corre según su timezone (+5h en un server en Bogotá). Se toma la
      // hora tal cual aparece en el string, sin pasar por Date/timezone.
      const fechaDia = String(item.FECHA).slice(0, 10);
      const horaMatch = String(item.FECHA).match(/\s(\d{2}):/);
      const hora = horaMatch ? Number(horaMatch[1]) : 0;
      const periodo = hora + 1;

      // El elemento ya dice si es activa (P->AE) o reactiva (Q->R1) — se
      // busca la agrupación de ESE flujo puntual, no una cualquiera del
      // codigo_rpm, porque P y Q normalmente son agrupaciones distintas.
      const flujoEsperado = elemento === "Q" ? "R1" : "AE";
      const cacheKey = `${codigoRpm}||${flujoEsperado}`;

      let config;
      if (mapaAgrupacion.has(cacheKey)) {
        config = mapaAgrupacion.get(cacheKey);
      } else {
        const client = createConectionPG(session);
        const agrupacion = await model.consultarAgrupacion_xCodigoRpmYFlujo(
          codigoRpm,
          flujoEsperado,
          client,
        );
        config = {
          flujo: agrupacion?.flujo ?? flujoEsperado,
          dividirPor1000: agrupacion?.dividir_por_1000 ?? false,
          valorAbsoluto: agrupacion?.valor_absoluto ?? false,
        };
        mapaAgrupacion.set(cacheKey, config);
      }
      const { flujo, dividirPor1000, valorAbsoluto } = config;

      const key = `${codigoRpm}||${fechaDia}||${flujo}`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          flujo,
          fecha: fechaDia,
          codigo_rpm: codigoRpm,
          p1: 0,
          p2: 0,
          p3: 0,
          p4: 0,
          p5: 0,
          p6: 0,
          p7: 0,
          p8: 0,
          p9: 0,
          p10: 0,
          p11: 0,
          p12: 0,
          p13: 0,
          p14: 0,
          p15: 0,
          p16: 0,
          p17: 0,
          p18: 0,
          p19: 0,
          p20: 0,
          p21: 0,
          p22: 0,
          p23: 0,
          p24: 0,
        });
      }

      let valor = Number(item.INTEGRAL);
      if (valorAbsoluto) valor = Math.abs(valor);
      if (dividirPor1000) valor = valor / 1000;

      grupos.get(key)[`p${periodo}`] = valor;
    }

    const client2 = createConectionPG(session);
    // ── PASO 5: Insertar ────────────────────────────────────
    const medidas = Array.from(grupos.values());
    await model.insertarMedidasRapido(medidas, client2);

    return { success: true, insertadas: medidas.length, medidas, datosEPM };
  } catch (err) {
    Logger.error(colors.red("Error consultarEPM:"), err?.message);
    return { success: false, message: err.message || "Error consultando EPM" };
  }
};
