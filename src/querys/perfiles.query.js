// Query para obtener todos los módulos disponibles
export const GET_MODULOS_PADRES = `
  SELECT
    m.cod,
    m.nombre,
    m.nivel,
    m.orden,
    m.link,
    m.imagen
  FROM usu_menu m
  ORDER BY m.orden ASC
`;

// Query para obtener los perfiles disponibles
export const GET_PERFILES_DISPONIBLES = `
  SELECT
    cod,
    nombre
  FROM usu_usuarioperfil
  ORDER BY nombre ASC
`;

// Query para obtener los módulos asignados a un perfil específico
export const GET_MODULOS_POR_PERFIL = `
  SELECT
    m.cod,
    m.nombre,
    m.nivel,
    m.orden,
    m.link,
    m.imagen,
    up.nombre as perfil
  FROM usu_menu m
  INNER JOIN usu_usuarioacceso pm ON pm.codmenu = m.cod
  INNER JOIN usu_usuarioperfil up ON up.cod = pm.codperfil
  WHERE pm.codperfil = $1
  ORDER BY m.orden ASC
`;

// Query para asignar un módulo a un perfil
export const ASIGNAR_MODULO_A_PERFIL = `
  INSERT INTO usu_usuarioacceso (codperfil, codmenu)
  VALUES ($1, $2)
  RETURNING *
`;

// Query para remover un módulo de un perfil
export const REMOVER_MODULO_DE_PERFIL = `
  DELETE FROM usu_usuarioacceso
  WHERE codperfil = $1 AND codmenu = $2
`;