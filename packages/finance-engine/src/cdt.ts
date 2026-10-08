import { addDays, isIsoDate } from './dates';
import { assertAmount, assertInteger, roundPeso } from './money';
import { eaFromPeriodRate, periodRateFromEA } from './rates';

/** Retención en la fuente sobre rendimientos financieros (Colombia): 4 % de los intereses. */
export const DEFAULT_WITHHOLDING = 0.04;
/** Gravamen a los movimientos financieros: 4 por mil. */
export const GMF_RATE = 0.004;

export interface CdtInput {
  amount: number;
  /** Plazo en días (los CDT en Colombia van de 30 días en adelante; aquí se permite desde 1). */
  days: number;
  /** Tasa efectiva anual, como fracción. */
  rateEA: number;
  /** Base de días del año para liquidar. Por defecto 365. */
  dayBase?: 360 | 365;
  /** Retención en la fuente sobre los intereses. Por defecto 4 %. */
  withholdingRate?: number;
  /**
   * Cobrar el 4×1000 (GMF) sobre el dinero que sale de la cuenta para abrir el CDT,
   * cuando la cuenta no está marcada como exenta.
   */
  gmf?: boolean;
  gmfRate?: number;
  /** Fecha de apertura (AAAA-MM-DD) para calcular el vencimiento. */
  startDate?: string;
}

export interface CdtResult {
  amount: number;
  days: number;
  rateEA: number;
  dayBase: 360 | 365;
  /** Tasa efectiva del período completo: (1 + EA)^(días/base) − 1. */
  periodRate: number;
  grossInterest: number;
  withholding: number;
  netInterest: number;
  gmf: number;
  /** Lo que realmente gana: intereses − retención − 4×1000. */
  netReturn: number;
  /** Lo que paga el banco al vencimiento: capital + intereses − retención. */
  maturityAmount: number;
  /** Rentabilidad efectiva anual después de retención y 4×1000. */
  netEA: number;
  maturityDate?: string;
}

export function simulateCdt(input: CdtInput): CdtResult {
  const amount = roundPeso(assertAmount(input.amount, 'El monto'));
  const days = assertInteger(input.days, 'El plazo en días', 1, 3650);
  const rateEA = assertAmount(input.rateEA, 'La tasa E.A.', { allowZero: true });
  const dayBase = input.dayBase ?? 365;
  if (dayBase !== 360 && dayBase !== 365) throw new RangeError('La base debe ser 360 o 365');
  const withholdingRate = input.withholdingRate ?? DEFAULT_WITHHOLDING;
  if (!Number.isFinite(withholdingRate) || withholdingRate < 0 || withholdingRate >= 1) {
    throw new RangeError('La retención debe estar entre 0 % y 100 %');
  }
  const gmfRate = input.gmfRate ?? GMF_RATE;
  if (input.startDate !== undefined && !isIsoDate(input.startDate)) {
    throw new RangeError(`Fecha inválida: ${input.startDate}`);
  }

  const periodRate = periodRateFromEA(rateEA, days, dayBase);
  const grossInterest = roundPeso(amount * periodRate);
  const withholding = roundPeso(grossInterest * withholdingRate);
  const netInterest = grossInterest - withholding;
  const gmf = input.gmf ? roundPeso(amount * gmfRate) : 0;
  const netReturn = netInterest - gmf;

  return {
    amount,
    days,
    rateEA,
    dayBase,
    periodRate,
    grossInterest,
    withholding,
    netInterest,
    gmf,
    netReturn,
    maturityAmount: amount + netInterest,
    netEA: eaFromPeriodRate(netReturn / amount, days, dayBase),
    maturityDate: input.startDate ? addDays(input.startDate, days) : undefined,
  };
}

export interface CdtTerm {
  days: number;
  rateEA: number;
}

export interface CdtTermComparison {
  results: CdtResult[];
  /** Índice con la mayor rentabilidad neta E.A. */
  bestNetEA: number;
  /** Índice con la mayor ganancia neta en pesos. */
  bestNetReturn: number;
}

/** Simula el mismo monto en varios plazos y marca el mejor. */
export function compareCdtTerms(
  base: Omit<CdtInput, 'days' | 'rateEA'>,
  terms: readonly CdtTerm[],
): CdtTermComparison {
  if (terms.length === 0) throw new RangeError('Se necesita al menos un plazo');
  const results = terms.map((t) => simulateCdt({ ...base, days: t.days, rateEA: t.rateEA }));
  return {
    results,
    bestNetEA: indexOfMax(results.map((r) => r.netEA)),
    bestNetReturn: indexOfMax(results.map((r) => r.netReturn)),
  };
}

export function indexOfMax(values: readonly number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v > (values[best] ?? -Infinity)) best = i;
  });
  return best;
}

export function indexOfMin(values: readonly number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v < (values[best] ?? Infinity)) best = i;
  });
  return best;
}
