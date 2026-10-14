import MenuAreasModel from "../models/menu_areas.model.js";

const model = MenuAreasModel.getInstance();

const MAX_FRECUENTES = 6;

// Toda la configuración (áreas, módulo → área, accesos frecuentes) es por perfil.
export default class MenuAreasService {
  static instance;
  static getInstance() {
    if (!MenuAreasService.instance) MenuAreasService.instance = new MenuAreasService();
    return MenuAreasService.instance;
  }

  // Estructura del menú para un perfil: áreas con sus módulos (solo los permitidos),
  // módulos sin área y accesos frecuentes (solo los que el perfil puede ver).
  estructura = async (session, codperfil) => {
    const [modulos, areas, frecuentes] = await Promise.all([
      model.modulosDePerfil(session, codperfil),
      model.areas(session, codperfil),
      model.frecuentes(session, codperfil),
    ]);

    const porCod = new Map(modulos.map((m) => [String(m.cod), m]));
    const modulo = (m) => ({ cod: String(m.cod), nombre: m.nombre, link: m.link, imagen: m.imagen, orden: m.orden, codarea: m.codarea });

    const conArea = areas
      .map((a) => ({
        cod: a.cod,
        nombre: a.nombre,
        icono: a.icono,
        orden: a.orden,
        modulos: modulos.filter((m) => m.codarea === a.cod).map(modulo),
      }))
      .filter((a) => a.modulos.length > 0); // un área sin módulos visibles para este perfil no se muestra

    const codAreas = new Set(areas.map((a) => a.cod));
    const sinArea = modulos.filter((m) => m.codarea == null || !codAreas.has(m.codarea)).map(modulo);

    return {
      areas: conArea,
      sin_area: sinArea,
      frecuentes: frecuentes.map((f) => porCod.get(String(f.codmenu))).filter(Boolean).map(modulo),
    };
  };

  // Configuración de un perfil para la pantalla de administración: solo se listan
  // los módulos a los que ese perfil tiene acceso.
  configuracion = async (session, codperfil) => {
    const [areas, frecuentes, modulos] = await Promise.all([
      model.areas(session, codperfil),
      model.frecuentes(session, codperfil),
      model.modulosDePerfil(session, codperfil),
    ]);
    const permitidos = new Set(modulos.map((m) => String(m.cod)));
    return {
      codperfil,
      areas,
      frecuentes: frecuentes.map((f) => String(f.codmenu)).filter((cod) => permitidos.has(cod)),
      max_frecuentes: MAX_FRECUENTES,
      modulos: modulos.map((m) => ({ cod: String(m.cod), nombre: m.nombre, link: m.link, orden: m.orden, codarea: m.codarea })),
    };
  };

  crearArea = (session, codperfil, datos) => model.crearArea(session, codperfil, datos);
  actualizarArea = (session, cod, datos) => model.actualizarArea(session, cod, datos);
  eliminarArea = (session, cod) => model.eliminarArea(session, cod);
  asignarModuloAArea = (session, codperfil, codmenu, codarea) => model.asignarModuloAArea(session, codperfil, codmenu, codarea);

  guardarFrecuentes = async (session, codperfil, codmenus) => {
    const modulos = await model.modulosDePerfil(session, codperfil);
    const permitidos = new Set(modulos.map((m) => String(m.cod)));
    const unicos = [...new Set(codmenus.map(String))].filter((cod) => permitidos.has(cod)).slice(0, MAX_FRECUENTES);
    await model.guardarFrecuentes(session, codperfil, unicos);
    return unicos;
  };

  copiarConfiguracion = (session, origen, destino) => model.copiarConfiguracion(session, origen, destino);
}
