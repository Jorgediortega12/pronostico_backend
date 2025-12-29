import FactoresService from "../../../../../../../services/factores.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";
import xlsx from "xlsx";

const service = FactoresService.getInstance();

export const guardarBarra = async (req, res) => {
  try {
    const result = await service.guardarBarra(req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const consultarBarrasIndex_xMC = async (req, res) => {
  try {
    //tomamos el parametro
    const { mc } = req.params;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!mc) {
      return responseError(200, "Parametro mc no proporcionado", 400, res);
    }

    const result = await service.consultarBarrasIndex_xMC(mc);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarBarra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.actualizarBarra(id, req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const guardarAgrupacion = async (req, res) => {
  try {
    const result = await service.guardarAgrupacion(req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const consultarAgrupacionesIndex_xBarraId = async (req, res) => {
  try {
    //tomamos el parametro
    const { barra_id } = req.params;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!barra_id) {
      return responseError(
        200,
        "Parametro barra_id no proporcionado",
        400,
        res
      );
    }

    const result = await service.consultarAgrupacionesIndex_xBarraId(barra_id);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarAgrupacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.actualizarAgrupacion(id, req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const eliminarBarra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.eliminarBarraConAgrupaciones(id);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const eliminarAgrupacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return responseError(200, "Id no proporcionado", 400, res);
    }

    const result = await service.eliminarAgrupacion(id);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, null, result.message);
  } catch (err) {
    return InternalError(res);
  }
};

export const eliminarMedidasRapido = async (req, res) => {
  const result = await service.eliminarRapido(req.body.medidas);
  if (!result.success) return responseError(200, result.message, 500, res);
  return SuccessResponse(res, null, result.message);
};

export const actualizarMedidasRapido = async (req, res) => {
  const result = await service.actualizarRapido(req.body.medidas);
  if (!result.success) return responseError(200, result.message, 500, res);
  return SuccessResponse(res, null, result.message);
};

export const insertarMedidasRapido = async (req, res) => {
  const result = await service.insertarRapido(req.body.medidas);
  if (!result.success) return responseError(200, result.message, 500, res);
  return SuccessResponse(res, null, result.message);
};

export const cargarMedidasDesdeExcel = async (req, res) => {
  try {
    const { ucp } = req.body;

    if (!ucp) {
      return responseError(200, "UCP no proporcionado", 400, res);
    }

    if (!req.file) {
      return responseError(200, "Archivo no proporcionado", 400, res);
    }

    const filePath = req.file.path;

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const medidas = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 27) continue;

      const [mes, dia, año] = row[1].split("/");
      const fecha = `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;

      const medida = {
        flujo: row[0],
        fecha,
        codigo_rpm: row[2],
      };

      for (let p = 1; p <= 24; p++) {
        const val = row[p + 2];
        medida[`p${p}`] =
          val !== undefined && val !== ""
            ? Number(String(val).replace(",", "."))
            : null;
      }

      medidas.push(medida);
    }

    await service.eliminarRapido(medidas);
    await service.insertarRapido(medidas);

    return SuccessResponse(res, null, "Datos cargados correctamente");
  } catch (error) {
    console.error(error);
    return InternalError(res);
  }
};

export const descargarPlantillaMedidas = async (req, res) => {
  try {
    const result = await service.descargarPlantillaMedidas();

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return res.download(result.filePath, result.filename);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error al descargar la plantilla",
    });
  }
};

export const eliminarFechasIngresadasTodos = async (req, res) => {
  const { ucp } = req.params;
  const result = await service.eliminarFechasIngresadasTodos(ucp);
  return result.success
    ? SuccessResponse(res, null, result.message)
    : responseError(200, result.message, 500, res);
};

export const guardarRangoFecha = async (req, res) => {
  const result = await service.guardarRangoFecha(req.body);
  return result.success
    ? SuccessResponse(res, null, result.message)
    : responseError(200, result.message, 500, res);
};

export const reiniciarMedidas = async (req, res) => {
  const result = await service.reiniciarMedidas();
  return result.success
    ? SuccessResponse(res, null, result.message)
    : responseError(200, result.message, 500, res);
};

export const consultarBarraNombre = async (req, res) => {
  const { barra } = req.params;
  const result = await service.consultarBarraNombre(barra);
  return result.success
    ? SuccessResponse(res, result.data, "Consulta exitosa")
    : responseError(200, result.message, 500, res);
};

export const consultarBarraFlujoNombreInicial = async (req, res) => {
  const { barra, tipo } = req.params;
  const result = await service.consultarBarraFlujoNombreInicial(barra, tipo);
  return result.success
    ? SuccessResponse(res, result.data, "Consulta exitosa")
    : responseError(200, result.message, 500, res);
};

export const consultarBarraFactorNombre = async (req, res) => {
  try {
    const { barra, tipo } = req.params;
    const { codigo_rpm } = req.body;

    if (!Array.isArray(codigo_rpm) || codigo_rpm.length === 0) {
      return responseError(200, "codigo_rpm debe ser un arreglo", 400, res);
    }

    const result = await service.consultarBarraFactorNombre(
      barra,
      tipo,
      codigo_rpm
    );

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    return InternalError(res);
  }
};

export const consultarMedidasCalcularCompleto = async (req, res) => {
  try {
    const result = await service.consultarMedidasCalcularCompleto(req.body);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    return InternalError(res);
  }
};
