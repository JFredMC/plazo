/**
 * Formato colombiano sin depender de Intl (que cambia entre navegadores y versiones de ICU):
 * punto para miles, coma para decimales, $ pegado al número.
 */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** $1.234.567 (pesos enteros). */
export function formatCOP(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const n = Math.round(value);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${groupThousands(String(Math.abs(n)))}`;
}

/** $1,2 M · $350 mil · $900: versión corta para ejes de gráficas. */
export function formatCOPShort(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${formatNumber(abs / 1e9, abs >= 1e10 ? 0 : 1)} mil M`;
  if (abs >= 1e6) return `${sign}$${formatNumber(abs / 1e6, abs >= 1e7 ? 0 : 1)} M`;
  if (abs >= 1e3) return `${sign}$${formatNumber(abs / 1e3, 0)} mil`;
  return formatCOP(value);
}

/** 1.234,56 */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(decimals);
  const [int = '0', dec] = fixed.split('.');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return `${sign}${groupThousands(int)}${dec ? ',' + dec : ''}`;
}

/** 0.2399 → "23,99 %" */
export function formatPercent(fraction: number, decimals = 2): string {
  if (!Number.isFinite(fraction)) return '—';
  return `${formatNumber(fraction * 100, decimals)} %`;
}

/** Lee lo que escribe una persona: "$ 1.234.567", "1234567", "1.5 M" no; solo dígitos y separadores. */
export function parseCOP(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/** Lee un porcentaje con coma o punto decimal: "23,5" → 0.235 */
export function parsePercent(text: string): number | null {
  const clean = text.replace('%', '').trim().replace(/\s/g, '');
  if (!clean) return null;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized) / 100;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-07" → "7 oct 2026" */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** 18 → "1 año y 6 meses" */
export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 1 ? '1 año' : `${years} años`;
  const m = rest === 1 ? '1 mes' : `${rest} meses`;
  if (years === 0) return m;
  if (rest === 0) return y;
  return `${y} y ${m}`;
}
