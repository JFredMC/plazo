import { simulateLoan } from '@plazo/finance-engine';
import { fileName, summaryRows } from './export';

describe('exportación', () => {
  const result = simulateLoan({
    principal: 1_000_000,
    termMonths: 12,
    rate: { value: 0.02, kind: 'MV' },
    system: 'french',
    startDate: '2026-10-07',
    extraPayments: [{ month: 3, amount: 200_000, strategy: 'reduce-term' }],
  });

  it('nombre de archivo con fecha', () => {
    expect(fileName('credito', 'pdf', '2026-10-07')).toBe('plazo-credito-2026-10-07.pdf');
  });

  it('resumen del PDF con los datos clave en formato colombiano', () => {
    const rows = Object.fromEntries(
      summaryRows(result, { product: 'Libre inversión', rateText: '2,00 % M.V.', url: '' }),
    );
    expect(rows['Monto']).toBe('$1.000.000');
    expect(rows['Tasa pactada']).toBe('2,00 % M.V.');
    expect(rows['Equivale a']).toContain('26,82 % E.A.');
    expect(rows['Primer pago']).toBe('$94.560');
    expect(rows['Abonos extra']).toBe('$200.000');
    expect(rows['Termina']).toContain('10 cuotas');
  });
});
