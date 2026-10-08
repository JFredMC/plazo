import { addMonths, isIsoDate } from './dates';
import { irr } from './irr';
import { assertAmount, assertInteger, roundPeso, sum } from './money';
import { equivalentRates, fromMonthly, monthlyRate, type Rate, type RateKind } from './rates';

/**
 * - `french`: sistema francés, cuota fija (capital + interés constante).
 * - `constant`: abono constante a capital; la cuota baja mes a mes (típico de tarjeta de crédito).
 */
export type AmortizationSystem = 'french' | 'constant';

/** Qué hacer con un abono extraordinario: acortar el plazo o bajar la cuota. */
export type ExtraStrategy = 'reduce-term' | 'reduce-installment';

export interface ExtraPayment {
  /** Mes en el que se hace el abono (después de pagar la cuota de ese mes). */
  month: number;
  amount: number;
  strategy: ExtraStrategy;
}

export interface LifeInsurance {
  /** Fracción mensual, p. ej. 0.0012 = $1.200 por millón al mes. */
  monthlyRate: number;
  /** Sobre el saldo de cada mes (lo usual) o sobre el monto inicial. */
  base?: 'balance' | 'initial';
}

export interface LoanFees {
  /** Cobro único al desembolso (estudio de crédito, avalúo…). Se descuenta del dinero recibido. */
  upfront?: number;
  /** Cobro fijo mensual (cuota de manejo, seguro del bien…). */
  monthly?: number;
}

export interface LoanInput {
  principal: number;
  termMonths: number;
  rate: Rate;
  system: AmortizationSystem;
  lifeInsurance?: LifeInsurance;
  fees?: LoanFees;
  extraPayments?: readonly ExtraPayment[];
  /** Fecha de desembolso (AAAA-MM-DD). La primera cuota vence un mes después. */
  startDate?: string;
}

export interface AmortizationRow {
  period: number;
  date?: string;
  openingBalance: number;
  interest: number;
  principal: number;
  /** Cuota del crédito: interés + capital. */
  installment: number;
  insurance: number;
  fee: number;
  extra: number;
  /** Lo que sale del bolsillo ese mes: cuota + seguro + cargos + abono extra. */
  payment: number;
  closingBalance: number;
}

export interface LoanTotals {
  principal: number;
  interest: number;
  insurance: number;
  /** Cargos mensuales + cobro inicial. */
  fees: number;
  extra: number;
  /** Todo lo pagado, incluido el cobro inicial. */
  paid: number;
}

export interface LoanResult {
  principal: number;
  termMonths: number;
  system: AmortizationSystem;
  monthlyRate: number;
  rates: Record<RateKind, number>;
  rows: AmortizationRow[];
  /** Meses que realmente dura el crédito (menos que el plazo si hay abonos que lo acortan). */
  periods: number;
  /** Cuota del crédito del primer mes (sin seguros ni cargos). */
  firstInstallment: number;
  /** Primer pago total (cuota + seguro + cargos), sin abonos extra. */
  firstPayment: number;
  /** Pago total más alto, sin abonos extra. */
  maxPayment: number;
  totals: LoanTotals;
  /** Intereses + seguros + cargos: lo que cuesta el crédito además del capital. */
  totalCost: number;
  /**
   * Costo efectivo: la TIR de lo recibido (monto − cobro inicial) contra todos los pagos.
   * Incluye seguros y cargos, por eso es mayor o igual a la tasa pactada.
   */
  effectiveCost: { monthly: number; EA: number } | null;
  payoffDate?: string;
}

/** Cuota fija del sistema francés: P · i / (1 − (1 + i)^−n). Sin redondear. */
export function annuityPayment(principal: number, monthly: number, months: number): number {
  if (months <= 0) throw new RangeError('El plazo debe ser mayor que 0');
  if (monthly === 0) return principal / months;
  return (principal * monthly) / (1 - Math.pow(1 + monthly, -months));
}

function normalizeExtras(
  extras: readonly ExtraPayment[] | undefined,
  term: number,
): Map<number, ExtraPayment[]> {
  const byMonth = new Map<number, ExtraPayment[]>();
  for (const e of extras ?? []) {
    assertInteger(e.month, 'El mes del abono', 1, term);
    assertAmount(e.amount, 'El abono extraordinario', { allowZero: true });
    if (e.strategy !== 'reduce-term' && e.strategy !== 'reduce-installment') {
      throw new RangeError(`Estrategia de abono desconocida: ${String(e.strategy)}`);
    }
    if (e.amount === 0) continue;
    const list = byMonth.get(e.month) ?? [];
    list.push(e);
    byMonth.set(e.month, list);
  }
  return byMonth;
}

export function simulateLoan(input: LoanInput): LoanResult {
  const principal = roundPeso(assertAmount(input.principal, 'El monto'));
  const term = assertInteger(input.termMonths, 'El plazo', 1, 600);
  if (input.system !== 'french' && input.system !== 'constant') {
    throw new RangeError(`Sistema de amortización desconocido: ${String(input.system)}`);
  }
  const i = monthlyRate(input.rate);
  const insuranceRate = input.lifeInsurance
    ? assertAmount(input.lifeInsurance.monthlyRate, 'La tasa del seguro', { allowZero: true })
    : 0;
  const insuranceBase = input.lifeInsurance?.base ?? 'balance';
  const upfront = roundPeso(
    assertAmount(input.fees?.upfront ?? 0, 'El cobro inicial', { allowZero: true }),
  );
  const monthlyFee = roundPeso(
    assertAmount(input.fees?.monthly ?? 0, 'El cargo mensual', { allowZero: true }),
  );
  if (upfront >= principal) throw new RangeError('El cobro inicial no puede superar el monto');
  if (input.startDate !== undefined && !isIsoDate(input.startDate)) {
    throw new RangeError(`Fecha inválida: ${input.startDate}`);
  }
  const extras = normalizeExtras(input.extraPayments, term);

  let installment = roundPeso(annuityPayment(principal, i, term));
  let slice = roundPeso(principal / term);
  let balance = principal;
  const rows: AmortizationRow[] = [];

  for (let k = 1; k <= term && balance > 0; k++) {
    const opening = balance;
    const interest = roundPeso(opening * i);
    let capital: number;
    if (input.system === 'french') {
      capital = k === term || installment - interest >= opening ? opening : installment - interest;
    } else {
      capital = k === term ? opening : Math.min(opening, slice);
    }
    // Una cuota que no alcanza a cubrir el interés no amortiza (no ocurre con cuotas bien calculadas).
    capital = Math.max(0, capital);
    balance = opening - capital;

    let extra = 0;
    for (const e of extras.get(k) ?? []) {
      const amount = Math.min(roundPeso(e.amount), balance);
      if (amount <= 0) continue;
      balance -= amount;
      extra += amount;
      if (e.strategy === 'reduce-installment' && balance > 0) {
        const remaining = term - k;
        installment = roundPeso(annuityPayment(balance, i, remaining));
        slice = roundPeso(balance / remaining);
      }
    }

    const insurance = roundPeso(
      (insuranceBase === 'initial' ? principal : opening) * insuranceRate,
    );
    const credit = interest + capital;
    rows.push({
      period: k,
      date: input.startDate ? addMonths(input.startDate, k) : undefined,
      openingBalance: opening,
      interest,
      principal: capital,
      installment: credit,
      insurance,
      fee: monthlyFee,
      extra,
      payment: credit + insurance + monthlyFee + extra,
      closingBalance: balance,
    });
  }

  const totals: LoanTotals = {
    principal: sum(rows.map((r) => r.principal + r.extra)),
    interest: sum(rows.map((r) => r.interest)),
    insurance: sum(rows.map((r) => r.insurance)),
    fees: sum(rows.map((r) => r.fee)) + upfront,
    extra: sum(rows.map((r) => r.extra)),
    paid: sum(rows.map((r) => r.payment)) + upfront,
  };

  const monthlyCost = irr([principal - upfront, ...rows.map((r) => -r.payment)], i || 0.01);
  const first = rows[0];
  const regular = rows.map((r) => r.payment - r.extra);

  return {
    principal,
    termMonths: term,
    system: input.system,
    monthlyRate: i,
    rates: equivalentRates(input.rate),
    rows,
    periods: rows.length,
    firstInstallment: first?.installment ?? 0,
    firstPayment: first ? first.payment - first.extra : 0,
    maxPayment: regular.length ? Math.max(...regular) : 0,
    totals,
    totalCost: totals.interest + totals.insurance + totals.fees,
    effectiveCost:
      monthlyCost === null ? null : { monthly: monthlyCost, EA: fromMonthly(monthlyCost, 'EA') },
    payoffDate: rows.at(-1)?.date,
  };
}

/** Cuánto se ahorra un plan con abonos frente al mismo crédito sin abonos. */
export function extraPaymentSavings(input: LoanInput): {
  withoutExtras: LoanResult;
  withExtras: LoanResult;
  interestSaved: number;
  costSaved: number;
  monthsSaved: number;
} {
  const withoutExtras = simulateLoan({ ...input, extraPayments: [] });
  const withExtras = simulateLoan(input);
  return {
    withoutExtras,
    withExtras,
    interestSaved: withoutExtras.totals.interest - withExtras.totals.interest,
    costSaved: withoutExtras.totalCost - withExtras.totalCost,
    monthsSaved: withoutExtras.periods - withExtras.periods,
  };
}

/** Capital e intereses pagados por año del crédito (para gráficas). */
export function yearlyBreakdown(rows: readonly AmortizationRow[]): {
  year: number;
  principal: number;
  interest: number;
  insurance: number;
  fees: number;
  closingBalance: number;
}[] {
  const out: {
    year: number;
    principal: number;
    interest: number;
    insurance: number;
    fees: number;
    closingBalance: number;
  }[] = [];
  for (const r of rows) {
    const year = Math.ceil(r.period / 12);
    let bucket = out[year - 1];
    if (!bucket) {
      bucket = { year, principal: 0, interest: 0, insurance: 0, fees: 0, closingBalance: 0 };
      out[year - 1] = bucket;
    }
    bucket.principal += r.principal + r.extra;
    bucket.interest += r.interest;
    bucket.insurance += r.insurance;
    bucket.fees += r.fee;
    bucket.closingBalance = r.closingBalance;
  }
  return out;
}
