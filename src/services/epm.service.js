// services/epm.service.js
import colors from "colors";
import Logger from "../helpers/logger.js";
import FactoresModel from "../models/factores.model.js";
import { createConectionPG } from "../helpers/connections.js";

const model = FactoresModel.getInstance();

const construirCodigoRpm = (estacion, nivelTension, campo) => {
  const est = estacion.replace(/^M/, "");
  const nt = nivelTension.replace(/\s+/g, "");
  const cam = campo.replace(/\s+/g, "");
  return `${est}${nt}${cam}`;
};

const mapearFlujo = (nombre) => {
  if (nombre === "MVAr") return "R1";
  return "AE";
};

export const consultarEPM = async ({ consulta, desde, hasta, session }) => {
  try {
    // ── PASO 1: Token Microsoft ─────────────────────────────
    const tokenUrl = `https://login.microsoftonline.com/${process.env.EPM_TENANT_ID}/oauth2/v2.0/token`;

    const tokenBody = new URLSearchParams({
      client_id: process.env.EPM_CLIENT_ID,
      client_secret: process.env.EPM_CLIENT_SECRET,
      scope: process.env.EPM_SCOPE,
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
    const loginRes = await fetch(process.env.EPM_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        aplicacionOrigen: "sphaerai",
        Authorization: `Bearer ${microsoftToken}`,
        "Ocp-Apim-Subscription-Key": process.env.EPM_SUBSCRIPTION_KEY,
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
    const url = new URL(`${process.env.EPM_CONSULTA_URL}/${consulta}`);
    url.searchParams.append("desde", desde);
    url.searchParams.append("hasta", hasta);

    const consultaRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${epmToken}`,
        "Ocp-Apim-Subscription-Key": process.env.EPM_SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
      },
    });

    const datosEPM = await consultaRes.json();

    // ── PASO 4: Procesar y agrupar ──────────────────────────
    const grupos = new Map();
    const mapaFlujo = new Map(); // cache para no consultar el mismo codigo_rpm dos veces

    for (const item of datosEPM) {
      const codigoRpm = construirCodigoRpm(
        item.ESTACION,
        item.NIVEL_TENSION,
        item.CAMPO,
      );

      const fechaCompleta = new Date(item.FECHA);
      const fechaDia = fechaCompleta.toISOString().split("T")[0];
      const hora = fechaCompleta.getUTCHours();
      const periodo = hora + 1;

      // Buscar flujo en cache o en BD
      let flujo;
      if (mapaFlujo.has(codigoRpm)) {
        flujo = mapaFlujo.get(codigoRpm);
      } else {
        const client = createConectionPG(session);
        const agrupacion = await model.consultarAgrupacion_xCodigoRpm(
          codigoRpm,
          client,
        );
        flujo = agrupacion ? agrupacion.flujo : mapearFlujo(item.NOMBRE);
        mapaFlujo.set(codigoRpm, flujo);
      }

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

      grupos.get(key)[`p${periodo}`] = item.INTEGRAL;
    }

    const client2 = createConectionPG(session);
    // ── PASO 5: Insertar ────────────────────────────────────
    const medidas = Array.from(grupos.values());
    await model.insertarMedidasRapido(medidas, client2);

    return { success: true, insertadas: medidas.length };
  } catch (err) {
    Logger.error(colors.red("Error consultarEPM:"), err?.message);
    return { success: false, message: err.message || "Error consultando EPM" };
  }
};
