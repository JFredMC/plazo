import { describe, expect, it } from 'vitest';
import {
  annuityPayment,
  extraPaymentSavings,
  simulateLoan,
  yearlyBreakdown,
  type LoanInput,
} from './loan';

const base: LoanInput = {
  principal: 1_000_000,
  termMonths: 12,
  rate: { value: 0.02, kind: 'MV' },
  system: 'french',
};

describe('cuota fija (sistema francés)', () => {
  it('fórmula de anualidad: $1.000.000 a 12 meses al 2 % M.V. = $94.559,60', () => {
    expect(annuityPayment(1_000_000, 0.02, 12)).toBeCloseTo(94_559.5966, 4);
    expect(annuityPayment(1_200_000, 0, 12)).toBe(100_000);
  });

  it('primera fila calculada a mano', () => {
    const r = simulateLoan(base);
    expect(r.rows[0]).toMatchObject({
      period: 1,
      openingBalance: 1_000_000,
      interest: 20_000, // 1.000.000 · 2 %
      principal: 74_560, // 94.560 − 20.000
      installment: 94_560,
      closingBalance: 925_440,
    });
  });

  it('la última cuota absorbe el redondeo y deja saldo cero', () => {
    const r = simulateLoan(base);
    expect(r.periods).toBe(12);
    expect(r.rows.slice(0, 11).every((row) => row.installment === 94_560)).toBe(true);
    expect(r.rows[11]).toMatchObject({ interest: 1_854, principal: 92_701, installment: 94_555 });
    expect(r.rows[11]!.closingBalance).toBe(0);
    expect(r.totals.principal).toBe(1_000_000);
    expect(r.totals.interest).toBe(134_715);
  });

  it('$10.000.000 al 1 % M.V. en 12 meses: cuota $888.488 y última $888.485', () => {
    const r = simulateLoan({ ...base, principal: 10_000_000, rate: { value: 0.01, kind: 'MV' } });
    expect(r.firstInstallment).toBe(888_488);
    expect(r.rows[10]!.closingBalance).toBe(879_688);
    expect(r.rows[11]).toMatchObject({ interest: 8_797, principal: 879_688, installment: 888_485 });
    expect(r.totals.interest).toBe(661_853);
  });

  it('acepta la tasa en E.A. y la convierte a mensual', () => {
    const r = simulateLoan({ ...base, rate: { value: 0.268241794562545, kind: 'EA' } });
    expect(r.monthlyRate).toBeCloseTo(0.02, 10);
    expect(r.firstInstallment).toBe(94_560);
  });

  it('con tasa cero reparte el capital en partes iguales', () => {
    const r = simulateLoan({
      ...base,
      principal: 1_000_000,
      termMonths: 3,
      rate: { value: 0, kind: 'EA' },
    });
    expect(r.rows.map((x) => x.installment)).toEqual([333_333, 333_333, 333_334]);
    expect(r.totals.interest).toBe(0);
  });

  it('las fechas respetan fin de mes', () => {
    const r = simulateLoan({ ...base, termMonths: 3, startDate: '2026-01-31' });
    expect(r.rows.map((x) => x.date)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(r.payoffDate).toBe('2026-04-30');
  });
});

describe('abono constante a capital', () => {
  it('$1.200.000 en 12 meses al 2 %: capital $100.000 fijo e intereses $156.000', () => {
    const r = simulateLoan({ ...base, principal: 1_200_000, system: 'constant' });
    expect(r.rows.every((row) => row.principal === 100_000)).toBe(true);
    expect(r.rows[0]!.installment).toBe(124_000);
    expect(r.rows[11]!.installment).toBe(102_000);
    // 2 % · 100.000 · (12 + 11 + … + 1) = 2.000 · 78
    expect(r.totals.interest).toBe(156_000);
  });

  it('cuando el capital no es divisible, la última cuota lleva el ajuste', () => {
    const r = simulateLoan({ ...base, principal: 1_000_000, termMonths: 3, system: 'constant' });
    expect(r.rows.map((x) => x.principal)).toEqual([333_333, 333_333, 333_334]);
  });
});

describe('abonos extraordinarios', () => {
  it('reducir plazo: misma cuota y termina en el mes 10', () => {
    const r = simulateLoan({
      ...base,
      extraPayments: [{ month: 3, amount: 200_000, strategy: 'reduce-term' }],
    });
    expect(r.rows[2]).toMatchObject({ extra: 200_000, closingBalance: 571_817, payment: 294_560 });
    expect(r.rows[3]!.installment).toBe(94_560);
    expect(r.periods).toBe(10);
    expect(r.rows[9]).toMatchObject({ interest: 949, principal: 47_463, installment: 48_412 });
    expect(r.totals.interest).toBe(99_452);
    expect(r.totals.principal).toBe(1_000_000);
  });

  it('reducir cuota: recalcula la anualidad sobre el saldo y los meses que faltan', () => {
    const r = simulateLoan({
      ...base,
      extraPayments: [{ month: 3, amount: 200_000, strategy: 'reduce-installment' }],
    });
    expect(r.periods).toBe(12);
    // anualidad de 571.817 a 9 meses al 2 % = 70.055,8…
    expect(r.rows[3]!.installment).toBe(70_056);
    expect(r.rows[11]!.installment).toBe(70_059);
    expect(r.totals.interest).toBe(114_187);
  });

  it('abono constante: reducir plazo y reducir cuota', () => {
    const p = { ...base, principal: 1_200_000, system: 'constant' as const };
    const term = simulateLoan({
      ...p,
      extraPayments: [{ month: 4, amount: 300_000, strategy: 'reduce-term' }],
    });
    expect(term.periods).toBe(9);
    expect(term.totals.interest).toBe(114_000);
    const inst = simulateLoan({
      ...p,
      extraPayments: [{ month: 4, amount: 300_000, strategy: 'reduce-installment' }],
    });
    expect(inst.periods).toBe(12);
    expect(inst.rows[4]!.principal).toBe(62_500);
    expect(inst.totals.interest).toBe(129_000);
  });

  it('un abono mayor al saldo cancela el crédito sin pasarse', () => {
    const r = simulateLoan({
      ...base,
      extraPayments: [{ month: 2, amount: 99_000_000, strategy: 'reduce-term' }],
    });
    expect(r.periods).toBe(2);
    expect(r.rows[1]!.closingBalance).toBe(0);
    expect(r.totals.principal).toBe(1_000_000);
  });

  it('calcula el ahorro frente al plan sin abonos', () => {
    const s = extraPaymentSavings({
      ...base,
      extraPayments: [{ month: 3, amount: 200_000, strategy: 'reduce-term' }],
    });
    expect(s.interestSaved).toBe(134_715 - 99_452);
    expect(s.monthsSaved).toBe(2);
  });

  it('valida el mes del abono', () => {
    expect(() =>
      simulateLoan({ ...base, extraPayments: [{ month: 13, amount: 1, strategy: 'reduce-term' }] }),
    ).toThrow(RangeError);
  });
});

describe('seguros, cargos y costo efectivo', () => {
  it('sin seguros ni cargos, el costo efectivo es la misma tasa pactada', () => {
    const r = simulateLoan({
      ...base,
      rate: { value: 0.24, kind: 'EA' },
      termMonths: 36,
      principal: 15_000_000,
    });
    expect(r.effectiveCost!.EA).toBeCloseTo(0.24, 5);
    expect(r.totalCost).toBe(r.totals.interest);
  });

  it('seguro de vida sobre saldo: $1.200 por millón', () => {
    const r = simulateLoan({ ...base, lifeInsurance: { monthlyRate: 0.0012 } });
    expect(r.rows[0]!.insurance).toBe(1_200);
    expect(r.rows[1]!.insurance).toBe(1_111); // 925.440 · 0,0012 = 1.110,5 → 1.111
    expect(r.firstPayment).toBe(94_560 + 1_200);
  });

  it('seguro sobre el monto inicial es constante', () => {
    const r = simulateLoan({ ...base, lifeInsurance: { monthlyRate: 0.0012, base: 'initial' } });
    expect(new Set(r.rows.map((x) => x.insurance))).toEqual(new Set([1_200]));
  });

  it('cargos inicial y mensual suben el costo total y el costo efectivo', () => {
    const r = simulateLoan({ ...base, fees: { upfront: 50_000, monthly: 10_000 } });
    expect(r.totals.fees).toBe(50_000 + 12 * 10_000);
    expect(r.totalCost).toBe(134_715 + 170_000);
    expect(r.totals.paid).toBe(1_000_000 + 134_715 + 170_000);
    expect(r.effectiveCost!.EA).toBeGreaterThan(r.rates.EA);
    // TIR: recibe 950.000 y paga 104.560 durante 11 meses y 104.555 al final.
    const m = r.effectiveCost!.monthly;
    let npv = 950_000;
    r.rows.forEach((row, k) => (npv -= row.payment / Math.pow(1 + m, k + 1)));
    expect(Math.abs(npv)).toBeLessThan(0.01);
  });

  it('valida entradas', () => {
    expect(() => simulateLoan({ ...base, principal: 0 })).toThrow(RangeError);
    expect(() => simulateLoan({ ...base, termMonths: 0 })).toThrow(RangeError);
    expect(() => simulateLoan({ ...base, termMonths: 1.5 })).toThrow(RangeError);
    expect(() => simulateLoan({ ...base, fees: { upfront: 1_000_000 } })).toThrow(RangeError);
    expect(() => simulateLoan({ ...base, startDate: '2026-02-30' })).toThrow(RangeError);
  });
});

describe('resumen por año', () => {
  it('agrupa capital e intereses por año y cuadra con los totales', () => {
    const r = simulateLoan({ ...base, termMonths: 30 });
    const years = yearlyBreakdown(r.rows);
    expect(years).toHaveLength(3);
    expect(years.reduce((a, y) => a + y.principal, 0)).toBe(1_000_000);
    expect(years.reduce((a, y) => a + y.interest, 0)).toBe(r.totals.interest);
    expect(years[2]!.closingBalance).toBe(0);
  });
});
