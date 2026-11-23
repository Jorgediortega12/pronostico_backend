// Festivos de Colombia (Ley 51 de 1983, «Ley Emiliani»): los mismos días que da `holidays_co`, que usa el GMR original.
//  · Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
//  · Pasan al lunes siguiente (o se quedan si ya es lunes): 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
//  · Según la Pascua: Jueves y Viernes Santo (fijos); Ascensión, Corpus Christi y Sagrado Corazón (pasan al lunes).
// Todo en fechas de calendario "YYYY-MM-DD", sin horas ni zonas horarias.

const MS_DIA = 86_400_000;
const dos = (n) => String(n).padStart(2, "0");
const texto = (d) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
const fecha = (anio, mes, dia) => new Date(Date.UTC(anio, mes - 1, dia));
const sumarDias = (d, n) => new Date(d.getTime() + n * MS_DIA);

/** Lunes de esa semana o el siguiente: si ya es lunes, la misma fecha. */
const alLunes = (d) => sumarDias(d, (8 - d.getUTCDay()) % 7);

/** Domingo de Pascua (algoritmo gregoriano de Meeus/Jones/Butcher). */
export const domingoDePascua = (anio) => {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
};

/** Conjunto de festivos del año como textos "YYYY-MM-DD". */
export const festivosColombia = (anio) => {
  const pascua = domingoDePascua(anio);
  const lista = [
    // fijos
    fecha(anio, 1, 1), fecha(anio, 5, 1), fecha(anio, 7, 20), fecha(anio, 8, 7), fecha(anio, 12, 8), fecha(anio, 12, 25),
    // trasladables al lunes
    alLunes(fecha(anio, 1, 6)), alLunes(fecha(anio, 3, 19)), alLunes(fecha(anio, 6, 29)), alLunes(fecha(anio, 8, 15)),
    alLunes(fecha(anio, 10, 12)), alLunes(fecha(anio, 11, 1)), alLunes(fecha(anio, 11, 11)),
    // de Semana Santa
    sumarDias(pascua, -3), sumarDias(pascua, -2),
    alLunes(sumarDias(pascua, 39)), // Ascensión
    alLunes(sumarDias(pascua, 60)), // Corpus Christi
    alLunes(sumarDias(pascua, 68)), // Sagrado Corazón
  ];
  return new Set(lista.map(texto));
};
