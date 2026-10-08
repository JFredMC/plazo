/**
 * Tasas de interés en la notación colombiana. Todas se expresan como fracción: 0.24 = 24 %.
 *
 * - E.A.   efectiva anual: lo que crece $1 en un año con capitalización.
 * - N.M.V. nominal anual mes vencido: 12 veces la tasa mensual (no capitaliza).
 * - M.V.   mensual vencida: la tasa efectiva de cada mes.
 *
 * Relaciones: MV = (1 + EA)^(1/12) − 1, NMV = 12 · MV, EA = (1 + MV)^12 − 1.
 */
export type RateKind = 'EA' | 'NMV' | 'MV';

export interface Rate {
  /** Fracción, p. ej. 0.24 para 24 %. */
  value: number;
  kind: RateKind;
}

export const RATE_KINDS: readonly RateKind[] = ['EA', 'NMV', 'MV'];

export const RATE_LABELS: Record<RateKind, { short: string; long: string }> = {
  EA: { short: 'E.A.', long: 'Efectiva anual' },
  NMV: { short: 'N.M.V.', long: 'Nominal mes vencido' },
  MV: { short: 'M.V.', long: 'Mensual vencida' },
};

export function isRateKind(value: unknown): value is RateKind {
  return value === 'EA' || value === 'NMV' || value === 'MV';
}

function assertRate(rate: Rate): void {
  if (!isRateKind(rate.kind))
    throw new RangeError(`Tipo de tasa desconocido: ${String(rate.kind)}`);
  if (!Number.isFinite(rate.value) || rate.value < 0) {
    throw new RangeError('La tasa debe ser un número mayor o igual a 0');
  }
}

/** Tasa efectiva mensual equivalente. */
export function monthlyRate(rate: Rate): number {
  assertRate(rate);
  switch (rate.kind) {
    case 'MV':
      return rate.value;
    case 'NMV':
      return rate.value / 12;
    case 'EA':
      return Math.pow(1 + rate.value, 1 / 12) - 1;
  }
}

/** Expresa una tasa efectiva mensual en el tipo pedido. */
export function fromMonthly(mv: number, kind: RateKind): number {
  if (!Number.isFinite(mv) || mv <= -1) throw new RangeError('Tasa mensual inválida');
  switch (kind) {
    case 'MV':
      return mv;
    case 'NMV':
      return mv * 12;
    case 'EA':
      return Math.pow(1 + mv, 12) - 1;
  }
}

export function convertRate(rate: Rate, to: RateKind): Rate {
  return { value: fromMonthly(monthlyRate(rate), to), kind: to };
}

/** La misma tasa en los tres tipos. */
export function equivalentRates(rate: Rate): Record<RateKind, number> {
  const mv = monthlyRate(rate);
  return { EA: fromMonthly(mv, 'EA'), NMV: fromMonthly(mv, 'NMV'), MV: mv };
}

/** Tasa efectiva para un plazo en días a partir de una E.A.: (1 + EA)^(días / base) − 1. */
export function periodRateFromEA(ea: number, days: number, dayBase: 360 | 365 = 365): number {
  if (!Number.isFinite(ea) || ea <= -1) throw new RangeError('Tasa E.A. inválida');
  if (!Number.isFinite(days) || days <= 0) throw new RangeError('El plazo debe ser mayor que 0');
  return Math.pow(1 + ea, days / dayBase) - 1;
}

/** E.A. equivalente a una tasa efectiva ganada en `days` días. */
export function eaFromPeriodRate(
  periodRate: number,
  days: number,
  dayBase: 360 | 365 = 365,
): number {
  if (!Number.isFinite(periodRate) || periodRate <= -1) throw new RangeError('Tasa inválida');
  if (!Number.isFinite(days) || days <= 0) throw new RangeError('El plazo debe ser mayor que 0');
  return Math.pow(1 + periodRate, dayBase / days) - 1;
}
