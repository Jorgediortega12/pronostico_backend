export const listarPuntosConClima = `
  SELECT p.id, p.nombre, p.lat, p.lng, p.ucp, p.activo, p.orden,
         a.fecha, a.stemp, a.sensacion, a.vel_viento, a.icon, a.icon_des, a.humedad
  FROM clima_mapa_puntos p
  LEFT JOIN clima_mapa_actual a ON a.id_punto = p.id
  ORDER BY p.orden ASC, p.nombre ASC
`;

export const crearPunto = `
  INSERT INTO clima_mapa_puntos (nombre, lat, lng, ucp, orden)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

export const actualizarPunto = `
  UPDATE clima_mapa_puntos
  SET nombre = $2, lat = $3, lng = $4, ucp = $5, activo = $6, orden = $7
  WHERE id = $1
  RETURNING *
`;

export const eliminarPunto = `DELETE FROM clima_mapa_puntos WHERE id = $1`;

// fecha se castea a texto (to_char) para que siempre viaje como "YYYY-MM-DD"
// plano — si se deja como DATE, el driver de pg lo serializa como
// Date/ISO con hora y zona horaria, corriendo el día visualmente.
export const horaPorPunto = `
  SELECT id_punto, to_char(fecha, 'YYYY-MM-DD') AS fecha, bloques, actualizado_en
  FROM clima_mapa_hora
  WHERE id_punto = $1 AND fecha = $2
`;

export const diaPorPunto = `
  SELECT id_punto, to_char(fecha, 'YYYY-MM-DD') AS fecha, icon, icon_des, stemp_dia, stemp_noche, pop_max, actualizado_en
  FROM clima_mapa_dia
  WHERE id_punto = $1
  ORDER BY fecha ASC
`;

export const puntosActivos = `
  SELECT id, nombre, lat, lng
  FROM clima_mapa_puntos
  WHERE activo = TRUE
`;

// Key de OpenWeatherMap ya usada por jano-proxy (tabla ucp, codigo=12,
// "Key API Pronóstico") — se reutiliza en vez de pedir una nueva.
export const buscarKeyOpenWeather = `SELECT aux FROM ucp WHERE codigo = 12`;

export const upsertActual = `
  INSERT INTO clima_mapa_actual (id_punto, fecha, stemp, sensacion, vel_viento, icon, icon_des, humedad)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id_punto) DO UPDATE SET
    fecha = EXCLUDED.fecha,
    stemp = EXCLUDED.stemp,
    sensacion = EXCLUDED.sensacion,
    vel_viento = EXCLUDED.vel_viento,
    icon = EXCLUDED.icon,
    icon_des = EXCLUDED.icon_des,
    humedad = EXCLUDED.humedad,
    actualizado_en = NOW()
`;

export const upsertHora = `
  INSERT INTO clima_mapa_hora (id_punto, fecha, bloques)
  VALUES ($1, $2, $3)
  ON CONFLICT (id_punto, fecha) DO UPDATE SET
    bloques = EXCLUDED.bloques,
    actualizado_en = NOW()
`;

export const upsertDia = `
  INSERT INTO clima_mapa_dia (id_punto, fecha, icon, icon_des, stemp_dia, stemp_noche, pop_max)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (id_punto, fecha) DO UPDATE SET
    icon = EXCLUDED.icon,
    icon_des = EXCLUDED.icon_des,
    stemp_dia = EXCLUDED.stemp_dia,
    stemp_noche = EXCLUDED.stemp_noche,
    pop_max = EXCLUDED.pop_max,
    actualizado_en = NOW()
`;
