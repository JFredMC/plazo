/** Lectura defensiva de parámetros de URL: cualquier valor raro cae al valor por defecto. */
export type Params = Readonly<Record<string, string | undefined>>;

export function num(
  params: Params,
  key: string,
  fallback: number,
  { min = -Infinity, max = Infinity, integer = false } = {},
): number {
  const raw = params[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const v = integer ? Math.round(n) : n;
  return Math.min(max, Math.max(min, v));
}

export function oneOf<T extends string>(
  params: Params,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params[key];
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

/** Redondea para que la URL no lleve 23.999999999. */
export function short(n: number, decimals = 6): string {
  return String(Number(n.toFixed(decimals)));
}

/** JSON en base64url, admite tildes y eñes. */
export function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePayload(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
