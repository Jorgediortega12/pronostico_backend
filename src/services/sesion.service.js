import SesionModel from "../models/sesion.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = SesionModel.getInstance();

export default class SesionService {
    static instance;

    static getInstance() {
        if (!SesionService.instance) {
            SesionService.instance = new SesionService();
        }
        return SesionService.instance;
    }

    cargarDatosSesiones = async (codsuperior) => {
        try {
            const datosSesiones = await model.cargarDatosSesiones(codsuperior);

            if (!datosSesiones) {
                return {
                    success: false,
                    data: null,
                    message: 'No se pudieron cargar los datos de las sesiones'
                }
            }

            return {
                success: true,
                data: datosSesiones,
                message: 'Carga de datos por sesiones cargadas exitosamente'
            }
        } catch (error) {
            Logger.error(colors.red('Error SesionServices cargarDatosSesiones'));
            return {
                success: false,
                data: null,
                message: 'Error al cargar los datos por sesiones'
            }
        }
    }

    cargarArchivosVrSesiones = async (codcarpeta) => {
        try {
            const archivosVrSesiones = await model.cargarArchivosVrSesiones(codcarpeta);

            if (!archivosVrSesiones) {
                return {
                    success: false,
                    data: null,
                    message: 'No se pudo cargar los archivos de versiones por sesiones'
                }
            }

            return {
                success: true,
                data: archivosVrSesiones,
                messasge: 'Archivos de versiones de sesiones cargados exitosamente'
            }
        } catch (error) {
            Logger.error(colors.red("Error SesionServices cargarArchivosVrSesiones"));
            return {
                success: false,
                data: null,
                messasge: 'Error al cargar los archivos por versiones de sesiones'
            }
        }
    }

    buscarVersionSesionCod = async (codigo) => {
        try {
            const versionSesionCod = await model.buscarVersionSesionCod(codigo);

            if (!versionSesionCod) {
                return {
                    success: false,
                    data: null,
                    message: 'Error al buscar version de sesiones por codigo'
                }
            }

            return {
                success: true,
                data: versionSesionCod,
                message: 'La busqueda de version de sesion por codigo fue exitosa'
            }
        } catch (error) {
            Logger.error(colors.red('Error sesionServices buscarVersionSesionCod'));
            return {
                success: false,
                data: null,
                message: 'Error al buscar la version de la sesion por codigo'
            }
        }
    }

    cargarPeriodosSesion = async (codsesion, tipo) => {
        try {
            const sesionesPeriodos = await model.cargarPeriodosSesion(codsesion, tipo);

            if (!sesionesPeriodos) {
                return {
                    success: false,
                    data: null,
                    message: 'Error al obtener la sesiones por periodos'
                }
            }

            return {
                success: true,
                data: sesionesPeriodos,
                message: 'Se obtuvieron las sesiones por periodo correctamente'
            }
        } catch (error) {
            Logger.error(colors.red('Error sesionServices obtenerSesionesPeriodos'));
            return {
                success: false,
                data: null,
                message: 'Error al obtener las sesiones por periodos'
            }
        }
    }

    cargarPeriodosxUCPxFecha = async (ucp, fecha) => {
        try {
            const actualizacionDatos = await model.cargarPeriodosxUCPxFecha(ucp, fecha);

            if (!actualizacionDatos) {
                return {
                    success: false,
                    data: null,
                    message: 'No se pudo obtener la actualizacion de datos'
                }
            }

            return {
                success: true,
                data: actualizacionDatos,
                message: 'Obtener actualizacion de datos exitosa'
            }
        } catch (error) {
            Logger.error(colors.red('Error sesionServices obtenerActualizacionDatos')); 
            return {
                success: false, 
                data: null, 
                message: 'No se pudieron obtener la actualizacion de datos'
            }
        }
    }
}