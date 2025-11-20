// querys/pronosticos.query.js
export const crearPronostico = `
  INSERT INTO pronosticos (ucp, fecha, observacion,
    p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,
    p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24)
  VALUES (
    $1::text, $2::date, $3::text, $4::numeric, $5::numeric,
    $6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric,$11::numeric,$12::numeric,$13::numeric,$14::numeric,$15::numeric,$16::numeric,$17::numeric,
    $18::numeric,$19::numeric,$20::numeric,$21::numeric,$22::numeric,$23::numeric,$24::numeric,$25::numeric,$26::numeric,$27::numeric
  )
  RETURNING *;
`;

// Nota: el model para bulk construirá dinámicamente los inserts
