// Aplica la configuración de una agrupación (dividir_por_1000, factor,
// valor_absoluto) sobre un valor crudo de medida, en ese orden. `medidas`
// guarda siempre el valor tal cual lo manda la API — este ajuste se hace
// al leer/usar el dato, no al insertarlo, para que un cambio de config se
// refleje al instante sin tener que resincronizar.
export const aplicarConfigAgrupacion = (
  valorCrudo,
  { factor, dividir_por_1000, valor_absoluto },
) => {
  let valor = Number(valorCrudo) || 0;
  if (dividir_por_1000) valor = valor / 1000;
  valor = valor * (Number(factor) || 1);
  if (valor_absoluto) valor = Math.abs(valor);
  return valor;
};
