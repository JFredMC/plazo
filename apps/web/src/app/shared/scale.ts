/** Escala "bonita" para ejes: 0 a un máximo redondo con 3 a 5 marcas. */
export function niceTicks(max: number, target = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/** Cada cuántos puntos poner una etiqueta en el eje X para que no se monten. */
export function labelEvery(count: number, width: number, minGap = 56): number {
  if (count <= 1) return 1;
  const fit = Math.max(1, Math.floor(width / minGap));
  return Math.max(1, Math.ceil(count / fit));
}
