import { describe, expect, it } from 'vitest';
import {
  convertRate,
  eaFromPeriodRate,
  equivalentRates,
  fromMonthly,
  monthlyRate,
  periodRateFromEA,
} from './rates';

describe('conversión de tasas', () => {
  it('12 % E.A. equivale a 0,948879 % M.V. y 11,386552 % N.M.V.', () => {
    // MV = 1,12^(1/12) − 1 ; NMV = 12 · MV
    const r = equivalentRates({ value: 0.12, kind: 'EA' });
    expect(r.MV).toBeCloseTo(0.009488792934583, 12);
    expect(r.NMV).toBeCloseTo(0.113865515214996, 12);
    expect(r.EA).toBeCloseTo(0.12, 12);
  });

  it('2 % M.V. equivale a 26,824179 % E.A. (1,02^12 − 1) y 24 % N.M.V.', () => {
    expect(convertRate({ value: 0.02, kind: 'MV' }, 'EA').value).toBeCloseTo(0.268241794562545, 12);
    expect(convertRate({ value: 0.02, kind: 'MV' }, 'NMV').value).toBeCloseTo(0.24, 12);
  });

  it('24 % N.M.V. es 2 % mensual, no 24 % efectivo', () => {
    expect(monthlyRate({ value: 0.24, kind: 'NMV' })).toBeCloseTo(0.02, 15);
    expect(convertRate({ value: 0.24, kind: 'NMV' }, 'EA').value).toBeCloseTo(
      0.268241794562545,
      12,
    );
  });

  it('ida y vuelta entre los tres tipos sin pérdida', () => {
    for (const kind of ['EA', 'NMV', 'MV'] as const) {
      const start = { value: 0.3, kind };
      const back = convertRate(convertRate(convertRate(start, 'MV'), 'NMV'), kind);
      expect(back.value).toBeCloseTo(0.3, 12);
    }
  });

  it('tasa cero se mantiene en cero', () => {
    expect(equivalentRates({ value: 0, kind: 'EA' })).toEqual({ EA: 0, NMV: 0, MV: 0 });
  });

  it('rechaza tasas negativas o tipos desconocidos', () => {
    expect(() => monthlyRate({ value: -0.1, kind: 'EA' })).toThrow(RangeError);
    expect(() => monthlyRate({ value: Number.NaN, kind: 'MV' })).toThrow(RangeError);
    // @ts-expect-error tipo inválido a propósito
    expect(() => monthlyRate({ value: 0.1, kind: 'TV' })).toThrow(RangeError);
    expect(() => fromMonthly(-1, 'EA')).toThrow(RangeError);
  });

  it('tasa por días desde E.A. y su inversa', () => {
    expect(periodRateFromEA(0.12, 365)).toBeCloseTo(0.12, 15);
    // 1,12^(360/365) − 1
    expect(periodRateFromEA(0.12, 360)).toBeCloseTo(0.118262607481285, 12);
    // base 360: 1,12^(90/360) − 1
    expect(periodRateFromEA(0.12, 90, 360)).toBeCloseTo(0.02873734472208, 12);
    expect(eaFromPeriodRate(periodRateFromEA(0.105, 180), 180)).toBeCloseTo(0.105, 12);
    expect(() => periodRateFromEA(0.1, 0)).toThrow(RangeError);
  });
});
