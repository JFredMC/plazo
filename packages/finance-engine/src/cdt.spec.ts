import { describe, expect, it } from 'vitest';
import { compareCdtTerms, simulateCdt } from './cdt';

describe('CDT', () => {
  it('$10.000.000 a 365 días al 12 % E.A.: intereses $1.200.000, retención 4 % = $48.000', () => {
    const r = simulateCdt({ amount: 10_000_000, days: 365, rateEA: 0.12 });
    expect(r.grossInterest).toBe(1_200_000);
    expect(r.withholding).toBe(48_000);
    expect(r.netInterest).toBe(1_152_000);
    expect(r.maturityAmount).toBe(11_152_000);
    expect(r.netReturn).toBe(1_152_000);
    expect(r.netEA).toBeCloseTo(0.1152, 10);
  });

  it('360 días en base 365: 1,12^(360/365) − 1', () => {
    const r = simulateCdt({ amount: 10_000_000, days: 360, rateEA: 0.12 });
    expect(r.grossInterest).toBe(1_182_626);
    expect(r.withholding).toBe(47_305); // 47.305,04
    expect(r.netInterest).toBe(1_135_321);
  });

  it('90 días en base 360', () => {
    const r = simulateCdt({ amount: 10_000_000, days: 90, rateEA: 0.12, dayBase: 360 });
    expect(r.grossInterest).toBe(287_373);
    expect(r.withholding).toBe(11_495); // 11.494,92
  });

  it('retención configurable (0 % para no declarantes con certificado, 7 % de ejemplo)', () => {
    expect(
      simulateCdt({ amount: 10_000_000, days: 365, rateEA: 0.12, withholdingRate: 0 }).withholding,
    ).toBe(0);
    expect(
      simulateCdt({ amount: 10_000_000, days: 365, rateEA: 0.12, withholdingRate: 0.07 })
        .withholding,
    ).toBe(84_000);
  });

  it('el 4×1000 resta $4 por cada $1.000 del monto y baja la rentabilidad neta', () => {
    const r = simulateCdt({ amount: 10_000_000, days: 365, rateEA: 0.12, gmf: true });
    expect(r.gmf).toBe(40_000);
    expect(r.netReturn).toBe(1_112_000);
    expect(r.maturityAmount).toBe(11_152_000); // el GMF no lo descuenta el banco del CDT
    expect(r.netEA).toBeCloseTo(0.1112, 10);
  });

  it('calcula la fecha de vencimiento', () => {
    expect(
      simulateCdt({ amount: 1_000_000, days: 180, rateEA: 0.1, startDate: '2026-10-07' })
        .maturityDate,
    ).toBe('2027-04-05');
  });

  it('valida entradas', () => {
    expect(() => simulateCdt({ amount: 0, days: 90, rateEA: 0.1 })).toThrow(RangeError);
    expect(() => simulateCdt({ amount: 1, days: 0, rateEA: 0.1 })).toThrow(RangeError);
    expect(() => simulateCdt({ amount: 1, days: 90, rateEA: -0.1 })).toThrow(RangeError);
    expect(() => simulateCdt({ amount: 1, days: 90, rateEA: 0.1, withholdingRate: 1 })).toThrow(
      RangeError,
    );
  });

  it('compara plazos y marca el de mejor rentabilidad neta', () => {
    const c = compareCdtTerms({ amount: 5_000_000 }, [
      { days: 90, rateEA: 0.09 },
      { days: 360, rateEA: 0.11 },
      { days: 720, rateEA: 0.1 },
    ]);
    expect(c.results).toHaveLength(3);
    expect(c.bestNetEA).toBe(1);
    expect(c.bestNetReturn).toBe(2); // más días, más pesos aunque la tasa sea menor
  });
});
