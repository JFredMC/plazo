import { isIsoDate, type CdtInput, type CdtTerm, SAMPLE_CDT_TERMS } from '@plazo/finance-engine';
import { decodePayload, encodePayload, num, short, type Params } from './params';

export interface CdtState {
  amount: number;
  days: number;
  /** Puntos porcentuales: 10,2 = 10,2 % E.A. */
  rate: number;
  dayBase: 360 | 365;
  /** Puntos porcentuales. */
  withholding: number;
  gmf: boolean;
  startDate: string;
  /** Tabla de plazos para comparar (tasas en puntos porcentuales). */
  terms: { days: number; rate: number }[];
}

export function cdtDefaults(startDate: string): CdtState {
  return {
    amount: 10_000_000,
    days: 360,
    rate: 10.2,
    dayBase: 365,
    withholding: 4,
    gmf: false,
    startDate,
    terms: SAMPLE_CDT_TERMS.map((t) => ({
      days: t.days,
      rate: Number((t.rateEA * 100).toFixed(4)),
    })),
  };
}

export function toCdtInput(s: CdtState): CdtInput {
  return {
    amount: s.amount,
    days: s.days,
    rateEA: s.rate / 100,
    dayBase: s.dayBase,
    withholdingRate: s.withholding / 100,
    gmf: s.gmf,
    startDate: s.startDate,
  };
}

export function cdtTerms(s: CdtState): CdtTerm[] {
  return s.terms.map((t) => ({ days: t.days, rateEA: t.rate / 100 }));
}

export function cdtToParams(s: CdtState): Record<string, string> {
  const p: Record<string, string> = {
    m: String(s.amount),
    dias: String(s.days),
    t: short(s.rate),
    b: String(s.dayBase),
    r: short(s.withholding),
    g: s.gmf ? '1' : '0',
    d: s.startDate,
  };
  const defaults = cdtDefaults(s.startDate).terms;
  if (JSON.stringify(s.terms) !== JSON.stringify(defaults)) {
    p['pz'] = encodePayload(s.terms.map((t) => [t.days, t.rate]));
  }
  return p;
}

export function cdtFromParams(params: Params, today: string): CdtState | null {
  if (params['m'] === undefined && params['dias'] === undefined) return null;
  const d = cdtDefaults(today);
  const rawTerms = decodePayload(params['pz']);
  let terms = d.terms;
  if (Array.isArray(rawTerms)) {
    const parsed = rawTerms
      .filter(
        (x): x is [number, number] =>
          Array.isArray(x) &&
          Number.isInteger(x[0]) &&
          x[0] >= 1 &&
          x[0] <= 3650 &&
          Number.isFinite(x[1]) &&
          x[1] >= 0 &&
          x[1] <= 1000,
      )
      .slice(0, 8)
      .map(([days, rate]) => ({ days, rate }));
    if (parsed.length) terms = parsed;
  }
  return {
    amount: num(params, 'm', d.amount, { min: 1, max: 1e13, integer: true }),
    days: num(params, 'dias', d.days, { min: 1, max: 3650, integer: true }),
    rate: num(params, 't', d.rate, { min: 0, max: 1000 }),
    dayBase: params['b'] === '360' ? 360 : 365,
    withholding: num(params, 'r', d.withholding, { min: 0, max: 99 }),
    gmf: params['g'] === '1',
    startDate: isIsoDate(params['d']) ? params['d'] : today,
    terms,
  };
}
