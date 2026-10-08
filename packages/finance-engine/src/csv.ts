import type { AmortizationRow } from './loan';

export const SCHEDULE_COLUMNS = [
  'Cuota',
  'Fecha',
  'Saldo inicial',
  'Interés',
  'Capital',
  'Cuota crédito',
  'Seguro',
  'Cargos',
  'Abono extra',
  'Pago total',
  'Saldo final',
] as const;

function cell(value: string | number): string {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV listo para Excel en español: separador punto y coma, números sin separador de miles
 * (Excel los reconoce como números) y BOM para que respete las tildes.
 */
export function scheduleToCsv(rows: readonly AmortizationRow[], { bom = true } = {}): string {
  const lines = [SCHEDULE_COLUMNS.join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.period,
        r.date ?? '',
        r.openingBalance,
        r.interest,
        r.principal,
        r.installment,
        r.insurance,
        r.fee,
        r.extra,
        r.payment,
        r.closingBalance,
      ]
        .map(cell)
        .join(';'),
    );
  }
  return (bom ? '\uFEFF' : '') + lines.join('\r\n') + '\r\n';
}
