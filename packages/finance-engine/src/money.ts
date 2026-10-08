/**
 * Pesos colombianos: los montos se manejan en pesos enteros. Redondeo "half away from zero",
 * el que usan las tablas de amortización de la banca (0,5 sube).
 */
export function roundPeso(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError(`Monto inválido: ${value}`);
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function assertAmount(value: number, label: string, { allowZero = false } = {}): number {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new RangeError(
      `${label} debe ser un número ${allowZero ? 'mayor o igual a' : 'mayor que'} 0`,
    );
  }
  return value;
}

export function assertInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}
