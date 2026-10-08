import {
  formatCOP,
  formatDate,
  formatMonths,
  formatPercent,
  scheduleToCsv,
  type LoanResult,
} from '@plazo/finance-engine';
import { todayIso } from './storage';

export interface ScheduleMeta {
  /** Nombre del producto: «Libre inversión», «Vivienda»… */
  product: string;
  /** Tasa como la escribió la persona: «24,00 % E.A.» */
  rateText: string;
  url: string;
}

export const DISCLAIMER =
  'Resultados ilustrativos. No son una oferta, cotización ni asesoría financiera. ' +
  'La tasa, los seguros y los cargos reales los fija cada entidad.';

export function fileName(kind: string, ext: string, today = todayIso()): string {
  return `plazo-${kind}-${today}.${ext}`;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportScheduleCsv(result: LoanResult): void {
  const blob = new Blob([scheduleToCsv(result.rows)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, fileName('credito', 'csv'));
}

/** Filas de resumen que van arriba de la tabla en el PDF. */
export function summaryRows(result: LoanResult, meta: ScheduleMeta): [string, string][] {
  const rows: [string, string][] = [
    ['Crédito', meta.product],
    ['Monto', formatCOP(result.principal)],
    ['Plazo', `${result.termMonths} meses (${formatMonths(result.termMonths)})`],
    ['Tasa pactada', meta.rateText],
    [
      'Equivale a',
      `${formatPercent(result.rates.EA)} E.A. · ${formatPercent(result.rates.NMV)} N.M.V. · ${formatPercent(result.rates.MV, 4)} M.V.`,
    ],
    ['Sistema', result.system === 'french' ? 'Cuota fija (francés)' : 'Abono constante a capital'],
    ['Primer pago', formatCOP(result.firstPayment)],
    ['Total a pagar', formatCOP(result.totals.paid)],
    ['Intereses', formatCOP(result.totals.interest)],
    ['Seguros y cargos', formatCOP(result.totals.insurance + result.totals.fees)],
    ['Costo efectivo anual', result.effectiveCost ? formatPercent(result.effectiveCost.EA) : '-'],
    ['Termina', `${formatDate(result.payoffDate)} (${result.periods} cuotas)`],
  ];
  if (result.totals.extra > 0) rows.push(['Abonos extra', formatCOP(result.totals.extra)]);
  return rows;
}

export async function exportSchedulePdf(result: LoanResult, meta: ScheduleMeta): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const cyan: [number, number, number] = [8, 145, 178];
  const ink: [number, number, number] = [11, 18, 32];
  const muted: [number, number, number] = [90, 107, 133];

  // Encabezado
  doc.setFillColor(...ink);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Plazo', M, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Simulación de crédito · tabla de amortización', M, 48);
  doc.setTextColor(34, 211, 238);
  doc.text('por JFredDev', W - M, 30, { align: 'right' });
  doc.setTextColor(200, 210, 225);
  doc.text(`Generado el ${formatDate(todayIso())}`, W - M, 48, { align: 'right' });

  // Resumen en dos columnas
  const summary = summaryRows(result, meta);
  const half = Math.ceil(summary.length / 2);
  autoTable(doc, {
    startY: 80,
    margin: { left: M, right: M },
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 3, textColor: ink },
    columnStyles: {
      0: { textColor: muted, cellWidth: 110 },
      2: { textColor: muted, cellWidth: 110 },
      1: { fontStyle: 'bold' },
      3: { fontStyle: 'bold' },
    },
    body: Array.from({ length: half }, (_, i) => [
      summary[i]?.[0] ?? '',
      summary[i]?.[1] ?? '',
      summary[i + half]?.[0] ?? '',
      summary[i + half]?.[1] ?? '',
    ]),
  });

  const hasExtras = result.totals.extra > 0;
  const head = [
    'Cuota',
    'Fecha',
    'Saldo inicial',
    'Interés',
    'Capital',
    ...(hasExtras ? ['Abono extra'] : []),
    'Seguros y cargos',
    'Pago total',
    'Saldo final',
  ];
  const body = result.rows.map((r) => [
    String(r.period),
    formatDate(r.date),
    formatCOP(r.openingBalance),
    formatCOP(r.interest),
    formatCOP(r.principal),
    ...(hasExtras ? [r.extra ? formatCOP(r.extra) : ''] : []),
    formatCOP(r.insurance + r.fee),
    formatCOP(r.payment),
    formatCOP(r.closingBalance),
  ]);
  const add = (f: (r: LoanResult['rows'][number]) => number) =>
    result.rows.reduce((a, r) => a + f(r), 0);
  const foot = [
    'Totales',
    '',
    '',
    formatCOP(add((r) => r.interest)),
    formatCOP(add((r) => r.principal)),
    ...(hasExtras ? [formatCOP(add((r) => r.extra))] : []),
    formatCOP(add((r) => r.insurance + r.fee)),
    formatCOP(add((r) => r.payment)),
    '',
  ];

  const after =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;
  autoTable(doc, {
    startY: after + 12,
    margin: { left: M, right: M, bottom: 48 },
    head: [head],
    body,
    foot: [foot],
    showFoot: 'lastPage',
    styles: { fontSize: 8.5, cellPadding: 4, halign: 'right', textColor: ink },
    headStyles: { fillColor: cyan, textColor: 255, halign: 'right' },
    footStyles: { fillColor: [238, 242, 249], textColor: ink, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
    didParseCell: (data) => {
      if (data.column.index < 2) data.cell.styles.halign = 'left';
    },
    didDrawPage: () => {
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(DISCLAIMER, M, H - 26, { maxWidth: W - 2 * M - 80 });
      doc.text(meta.url.length > 140 ? 'https://jfredmc.github.io/plazo/' : meta.url, M, H - 14, {
        maxWidth: W - 2 * M - 80,
      });
      doc.text(`Página ${doc.getNumberOfPages()}`, W - M, H - 14, { align: 'right' });
    },
  });

  doc.save(fileName('credito', 'pdf'));
}
