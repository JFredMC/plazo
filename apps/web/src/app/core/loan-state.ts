import {
  LOAN_PRODUCTS,
  getLoanProduct,
  isIsoDate,
  perMillionToRate,
  type AmortizationSystem,
  type ExtraPayment,
  type ExtraStrategy,
  type LoanInput,
  type LoanProductId,
  type RateKind,
} from '@plazo/finance-engine';
import { num, oneOf, short, type Params } from './params';

export interface LoanState {
  product: LoanProductId;
  principal: number;
  termMonths: number;
  /** En puntos porcentuales, tal como se escribe: 24 = 24 %. */
  rate: number;
  kind: RateKind;
  system: AmortizationSystem;
  insurancePerMillion: number;
  insuranceBase: 'balance' | 'initial';
  upfrontFee: number;
  monthlyFee: number;
  startDate: string;
  extras: ExtraPayment[];
}

const PRODUCT_IDS = LOAN_PRODUCTS.map((p) => p.id);
const KINDS: readonly RateKind[] = ['EA', 'NMV', 'MV'];
export const MAX_EXTRAS = 24;

export function loanDefaults(productId: LoanProductId, startDate: string): LoanState {
  const p = getLoanProduct(productId) ?? LOAN_PRODUCTS[0]!;
  return {
    product: p.id,
    principal: p.principal,
    termMonths: p.termMonths,
    rate: Number((p.rate.value * 100).toFixed(4)),
    kind: p.rate.kind,
    system: p.system,
    insurancePerMillion: p.insurancePerMillion,
    insuranceBase: 'balance',
    upfrontFee: p.upfrontFee,
    monthlyFee: p.monthlyFee,
    startDate,
    extras: [],
  };
}

export function toLoanInput(s: LoanState): LoanInput {
  return {
    principal: s.principal,
    termMonths: s.termMonths,
    rate: { value: s.rate / 100, kind: s.kind },
    system: s.system,
    lifeInsurance: s.insurancePerMillion
      ? { monthlyRate: perMillionToRate(s.insurancePerMillion), base: s.insuranceBase }
      : undefined,
    fees: { upfront: s.upfrontFee, monthly: s.monthlyFee },
    extraPayments: s.extras.filter((e) => e.month <= s.termMonths && e.amount > 0),
    startDate: s.startDate,
  };
}

/** Parámetros cortos para el enlace compartible. */
export function loanToParams(s: LoanState): Record<string, string> {
  const p: Record<string, string> = {
    p: s.product,
    m: String(s.principal),
    n: String(s.termMonths),
    t: short(s.rate),
    k: s.kind,
    s: s.system === 'french' ? 'f' : 'c',
    sv: String(s.insurancePerMillion),
    ci: String(s.upfrontFee),
    cm: String(s.monthlyFee),
    d: s.startDate,
  };
  if (s.insuranceBase === 'initial') p['sb'] = 'i';
  if (s.extras.length) {
    p['x'] = s.extras
      .map((e) => `${e.month}:${e.amount}:${e.strategy === 'reduce-term' ? 'p' : 'c'}`)
      .join(',');
  }
  return p;
}

export function parseExtras(raw: string | undefined, maxMonth: number): ExtraPayment[] {
  if (!raw) return [];
  const out: ExtraPayment[] = [];
  for (const part of raw.split(',').slice(0, MAX_EXTRAS)) {
    const [m, a, s] = part.split(':');
    const month = Number(m);
    const amount = Number(a);
    if (!Number.isInteger(month) || month < 1 || month > maxMonth) continue;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e13) continue;
    const strategy: ExtraStrategy = s === 'c' ? 'reduce-installment' : 'reduce-term';
    out.push({ month, amount: Math.round(amount), strategy });
  }
  return out.sort((x, y) => x.month - y.month);
}

/** Estado desde la URL; null si la URL no trae una simulación de crédito. */
export function loanFromParams(params: Params, today: string): LoanState | null {
  if (params['m'] === undefined && params['p'] === undefined) return null;
  const product = oneOf(params, 'p', PRODUCT_IDS, 'libre-inversion');
  const d = loanDefaults(product, today);
  const termMonths = num(params, 'n', d.termMonths, { min: 1, max: 600, integer: true });
  return {
    product,
    principal: num(params, 'm', d.principal, { min: 1, max: 1e13, integer: true }),
    termMonths,
    rate: num(params, 't', d.rate, { min: 0, max: 1000 }),
    kind: oneOf(params, 'k', KINDS, d.kind),
    system: params['s'] === 'c' ? 'constant' : params['s'] === 'f' ? 'french' : d.system,
    insurancePerMillion: num(params, 'sv', d.insurancePerMillion, { min: 0, max: 100_000 }),
    insuranceBase: params['sb'] === 'i' ? 'initial' : 'balance',
    upfrontFee: num(params, 'ci', d.upfrontFee, { min: 0, max: 1e13, integer: true }),
    monthlyFee: num(params, 'cm', d.monthlyFee, { min: 0, max: 1e13, integer: true }),
    startDate: isIsoDate(params['d']) ? params['d'] : today,
    extras: parseExtras(params['x'], termMonths),
  };
}
