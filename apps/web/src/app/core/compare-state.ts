import {
  SAMPLE_CDT_OFFERS,
  SAMPLE_LOAN_OFFERS,
  isRateKind,
  type AmortizationSystem,
  type CdtOffer,
  type LoanOffer,
  type RateKind,
} from '@plazo/finance-engine';
import { decodePayload, encodePayload, num, type Params } from './params';

export interface LoanOfferForm {
  name: string;
  rate: number;
  kind: RateKind;
  termMonths: number;
  system: AmortizationSystem;
  insurancePerMillion: number;
  upfrontFee: number;
  monthlyFee: number;
}

export interface CdtOfferForm {
  name: string;
  rate: number;
  days: number;
}

export interface CompareState {
  mode: 'credito' | 'cdt';
  principal: number;
  loans: LoanOfferForm[];
  amount: number;
  withholding: number;
  gmf: boolean;
  cdts: CdtOfferForm[];
}

export const MIN_OFFERS = 2;
export const MAX_OFFERS = 3;

export function compareDefaults(): CompareState {
  return {
    mode: 'credito',
    principal: 20_000_000,
    loans: SAMPLE_LOAN_OFFERS.map((o) => ({
      name: o.name,
      rate: Number((o.rate.value * 100).toFixed(4)),
      kind: o.rate.kind,
      termMonths: o.termMonths,
      system: o.system,
      insurancePerMillion: Math.round((o.lifeInsuranceRate ?? 0) * 1_000_000),
      upfrontFee: o.fees?.upfront ?? 0,
      monthlyFee: o.fees?.monthly ?? 0,
    })),
    amount: 10_000_000,
    withholding: 4,
    gmf: false,
    cdts: SAMPLE_CDT_OFFERS.map((o) => ({
      name: o.name,
      rate: Number((o.rateEA * 100).toFixed(4)),
      days: o.days,
    })),
  };
}

export function toLoanOffers(s: CompareState): LoanOffer[] {
  return s.loans.map((o, i) => ({
    id: String(i),
    name: o.name.trim() || `Oferta ${i + 1}`,
    rate: { value: o.rate / 100, kind: o.kind },
    termMonths: o.termMonths,
    system: o.system,
    lifeInsuranceRate: o.insurancePerMillion / 1_000_000,
    fees: { upfront: o.upfrontFee, monthly: o.monthlyFee },
  }));
}

export function toCdtOffers(s: CompareState): CdtOffer[] {
  return s.cdts.map((o, i) => ({
    id: String(i),
    name: o.name.trim() || `Oferta ${i + 1}`,
    rateEA: o.rate / 100,
    days: o.days,
  }));
}

export function compareToParams(s: CompareState): Record<string, string> {
  if (s.mode === 'credito') {
    return {
      modo: 'credito',
      m: String(s.principal),
      o: encodePayload(
        s.loans.map((o) => [
          o.name,
          o.rate,
          o.kind,
          o.termMonths,
          o.system === 'french' ? 'f' : 'c',
          o.insurancePerMillion,
          o.upfrontFee,
          o.monthlyFee,
        ]),
      ),
    };
  }
  return {
    modo: 'cdt',
    m: String(s.amount),
    r: String(s.withholding),
    g: s.gmf ? '1' : '0',
    o: encodePayload(s.cdts.map((o) => [o.name, o.rate, o.days])),
  };
}

const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const name = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 40) : '');

export function compareFromParams(params: Params): CompareState | null {
  if (params['modo'] !== 'credito' && params['modo'] !== 'cdt') return null;
  const d = compareDefaults();
  const raw = decodePayload(params['o']);
  const list = Array.isArray(raw) ? raw.filter(Array.isArray).slice(0, MAX_OFFERS) : [];
  if (params['modo'] === 'credito') {
    const loans = list
      .filter(
        (x: unknown[]) =>
          finite(x[1], 0, 1000) &&
          isRateKind(x[2]) &&
          finite(x[3], 1, 600) &&
          Number.isInteger(x[3]) &&
          finite(x[5], 0, 100_000) &&
          finite(x[6], 0, 1e13) &&
          finite(x[7], 0, 1e13),
      )
      .map((x: unknown[]): LoanOfferForm => ({
        name: name(x[0]),
        rate: x[1] as number,
        kind: x[2] as RateKind,
        termMonths: x[3] as number,
        system: x[4] === 'c' ? 'constant' : 'french',
        insurancePerMillion: x[5] as number,
        upfrontFee: x[6] as number,
        monthlyFee: x[7] as number,
      }));
    return {
      ...d,
      mode: 'credito',
      principal: num(params, 'm', d.principal, { min: 1, max: 1e13, integer: true }),
      loans: loans.length >= MIN_OFFERS ? loans : d.loans,
    };
  }
  const cdts = list
    .filter(
      (x: unknown[]) => finite(x[1], 0, 1000) && finite(x[2], 1, 3650) && Number.isInteger(x[2]),
    )
    .map((x: unknown[]): CdtOfferForm => ({
      name: name(x[0]),
      rate: x[1] as number,
      days: x[2] as number,
    }));
  return {
    ...d,
    mode: 'cdt',
    amount: num(params, 'm', d.amount, { min: 1, max: 1e13, integer: true }),
    withholding: num(params, 'r', d.withholding, { min: 0, max: 99 }),
    gmf: params['g'] === '1',
    cdts: cdts.length >= MIN_OFFERS ? cdts : d.cdts,
  };
}
