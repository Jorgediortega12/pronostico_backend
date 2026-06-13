// Crear circuito
export const crearCircuito = `
  INSERT INTO circuitos (ucp, circuito, codigo_rpm)
  VALUES ($1, $2, $3)
  RETURNING *;
`;

// Obtener todos los circuitos
export const obtenerCircuitos = `
  SELECT * FROM circuitos
  ORDER BY id ASC;
`;

// Obtener por UCP
export const obtenerCircuitosPorUCP = `
  SELECT * FROM circuitos
  WHERE ucp = $1
  ORDER BY id ASC;
`;

// Actualizar circuito
export const actualizarCircuito = `
  UPDATE circuitos
  SET ucp        = $1,
      circuito   = $2,
      codigo_rpm = $3
  WHERE id = $4
  RETURNING *;
`;

// Eliminar circuito (hard delete, la tabla no tiene estado)
export const eliminarCircuito = `
  DELETE FROM circuitos
  WHERE id = $1
  RETURNING *;
`;
