// Configuración (encriptada) de las credenciales de la API externa EPM.
// Antes vivían en variables de entorno (EPM_TENANT_ID, EPM_CLIENT_SECRET,
// etc.) — ahora se guardan en BD, con el secreto/clave encriptados, y se
// configuran desde Configuración > EPM.

import crypto from "crypto-js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import * as model from "../models/epm_config.model.js";

// Marcador que el formulario muestra en vez del valor real de un campo
// secreto ya configurado — si el usuario guarda sin tocarlo, se conserva
// el valor encriptado existente en vez de sobrescribirlo con esto.
export const MASCARA_SECRETO = "••••••••";

const clavePrincipal = () => {
  const clave = process.env.EPM_CONFIG_ENCRYPTION_KEY;
  if (!clave) {
    throw new Error(
      "EPM_CONFIG_ENCRYPTION_KEY no está configurada — no se puede encriptar/desencriptar la config de EPM.",
    );
  }
  return clave;
};

const encriptar = (texto) =>
  crypto.AES.encrypt(texto, clavePrincipal()).toString();

const desencriptar = (textoEncriptado) => {
  const bytes = crypto.AES.decrypt(textoEncriptado, clavePrincipal());
  return bytes.toString(crypto.enc.Utf8);
};

// Para el formulario en Configuración: nunca devuelve el secreto real.
export const obtenerConfigParaFormulario = async () => {
  const client = model.createClient();
  try {
    await client.connect();
    await model.crearTablaSiNoExiste(client);
    const fila = await model.obtenerEpmConfig(client);
    return {
      success: true,
      data: {
        tenant_id: fila?.tenant_id ?? "",
        client_id: fila?.client_id ?? "",
        client_secret: fila?.client_secret_enc ? MASCARA_SECRETO : "",
        scope: fila?.scope ?? "",
        login_url: fila?.login_url ?? "",
        consulta_url: fila?.consulta_url ?? "",
        subscription_key: fila?.subscription_key_enc ? MASCARA_SECRETO : "",
        configurado: !!fila,
      },
    };
  } catch (error) {
    Logger.error(colors.red("Error epm_config obtenerConfigParaFormulario"), error);
    return { success: false, message: "Error al obtener la configuración de EPM." };
  } finally {
    await client.end();
  }
};

// Para uso interno (epm.service.js): valores reales, desencriptados.
export const obtenerConfigInterna = async () => {
  const client = model.createClient();
  try {
    await client.connect();
    await model.crearTablaSiNoExiste(client);
    const fila = await model.obtenerEpmConfig(client);
    if (!fila) return null;
    return {
      tenantId: fila.tenant_id,
      clientId: fila.client_id,
      clientSecret: fila.client_secret_enc
        ? desencriptar(fila.client_secret_enc)
        : null,
      scope: fila.scope,
      loginUrl: fila.login_url,
      consultaUrl: fila.consulta_url,
      subscriptionKey: fila.subscription_key_enc
        ? desencriptar(fila.subscription_key_enc)
        : null,
    };
  } finally {
    await client.end();
  }
};

export const guardarConfig = async (payload) => {
  const client = model.createClient();
  try {
    await client.connect();
    await model.crearTablaSiNoExiste(client);
    const actual = await model.obtenerEpmConfig(client);

    // Si el campo secreto viene vacío o con la máscara, se conserva el
    // valor encriptado que ya había — si no, se encripta el nuevo.
    const resolverSecreto = (valorNuevo, encActual) => {
      if (!valorNuevo || valorNuevo === MASCARA_SECRETO) {
        return encActual ?? null;
      }
      return encriptar(valorNuevo);
    };

    const guardado = await model.guardarEpmConfig(client, {
      tenant_id: payload.tenant_id,
      client_id: payload.client_id,
      client_secret_enc: resolverSecreto(
        payload.client_secret,
        actual?.client_secret_enc,
      ),
      scope: payload.scope,
      login_url: payload.login_url,
      consulta_url: payload.consulta_url,
      subscription_key_enc: resolverSecreto(
        payload.subscription_key,
        actual?.subscription_key_enc,
      ),
    });
    return { success: true, data: guardado };
  } catch (error) {
    Logger.error(colors.red("Error epm_config guardarConfig"), error);
    return { success: false, message: "Error al guardar la configuración de EPM." };
  } finally {
    await client.end();
  }
};
