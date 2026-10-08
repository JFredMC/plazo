import { describe, expect, it } from 'vitest';
import { scheduleToCsv } from './csv';
import { addDays, addMonths, isIsoDate } from './dates';
import {
  formatCOP,
  formatCOPShort,
  formatDate,
  formatMonths,
  formatNumber,
  formatPercent,
  parseCOP,
  parsePercent,
} from './format';
import { irr } from './irr';
import { simulateLoan } from './loan';
import { roundPeso } from './money';
import { LOAN_PRODUCTS, getLoanProduct, perMillionToRate } from './products';

describe('formato colombiano', () => {
  it('pesos con punto de miles', () => {
    expect(formatCOP(1234567)).toBe('$1.234.567');
    expect(formatCOP(-1500)).toBe('-$1.500');
    expect(formatCOP(999.5)).toBe('$1.000');
    expect(formatCOP(Number.NaN)).toBe('—');
  });

  it('versión corta para ejes', () => {
    expect(formatCOPShort(1_500_000)).toBe('$1,5 M');
    expect(formatCOPShort(25_000_000)).toBe('$25 M');
    expect(formatCOPShort(350_000)).toBe('$350 mil');
    expect(formatCOPShort(2_000_000_000)).toBe('$2,0 mil M');
  });

  it('números y porcentajes con coma decimal', () => {
    expect(formatNumber(1234.5, 2)).toBe('1.234,50');
    expect(formatPercent(0.2399)).toBe('23,99 %');
    expect(formatPercent(0.009488792934583, 4)).toBe('0,9489 %');
  });

  it('lee montos y porcentajes escritos a mano', () => {
    expect(parseCOP('$ 1.234.567')).toBe(1234567);
    expect(parseCOP('abc')).toBeNull();
    expect(parsePercent('23,5')).toBeCloseTo(0.235, 12);
    expect(parsePercent('1.95 %')).toBeCloseTo(0.0195, 12);
    expect(parsePercent('x')).toBeNull();
  });

  it('fechas y plazos legibles', () => {
    expect(formatDate('2026-10-07')).toBe('7 oct 2026');
    expect(formatMonths(18)).toBe('1 año y 6 meses');
    expect(formatMonths(24)).toBe('2 años');
    expect(formatMonths(1)).toBe('1 mes');
  });
});

describe('utilidades', () => {
  it('redondeo de pesos', () => {
    expect(roundPeso(2.5)).toBe(3);
    expect(roundPeso(-2.5)).toBe(-3);
    expect(roundPeso(-0.2)).toBe(0);
    expect(() => roundPeso(Infinity)).toThrow(RangeError);
  });

  it('fechas', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(isIsoDate('2026-02-29')).toBe(false);
  });

  it('TIR de flujos conocidos', () => {
    expect(irr([-1000, 1100])).toBeCloseTo(0.1, 10);
    expect(irr([-1000, 0, 1210])).toBeCloseTo(0.1, 10);
    expect(irr([100, 100])).toBeNull();
  });

  it('productos de ejemplo bien formados', () => {
    expect(LOAN_PRODUCTS.map((p) => p.id)).toEqual([
      'libre-inversion',
      'vehiculo',
      'vivienda',
      'tarjeta',
    ]);
    expect(getLoanProduct('tarjeta')!.system).toBe('constant');
    expect(perMillionToRate(1_200)).toBeCloseTo(0.0012, 12);
    for (const p of LOAN_PRODUCTS) {
      expect(p.termMonths).toBeGreaterThanOrEqual(p.minTerm);
      expect(p.termMonths).toBeLessThanOrEqual(p.maxTerm);
    }
  });
});

describe('CSV', () => {
  it('Excel en español: punto y coma, BOM y una fila por cuota', () => {
    const r = simulateLoan({
      principal: 1_000_000,
      termMonths: 2,
      rate: { value: 0.02, kind: 'MV' },
      system: 'french',
      startDate: '2026-10-07',
    });
    const csv = scheduleToCsv(r.rows);
    expect(csv.startsWith('\uFEFFCuota;Fecha;Saldo inicial')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('1;2026-11-07;1000000;20000;495050;515050;0;0;0;515050;504950');
    expect(scheduleToCsv(r.rows, { bom: false }).startsWith('Cuota')).toBe(true);
  });
});
