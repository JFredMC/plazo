/** Fechas como texto ISO (AAAA-MM-DD), sin zonas horarias, para que el cronograma sea determinista. */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

/** Suma meses respetando el fin de mes: 31 de enero + 1 mes = 28 (o 29) de febrero. */
export function addMonths(iso: string, months: number): string {
  if (!isIsoDate(iso)) throw new RangeError(`Fecha inválida: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function addDays(iso: string, days: number): string {
  if (!isIsoDate(iso)) throw new RangeError(`Fecha inválida: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
