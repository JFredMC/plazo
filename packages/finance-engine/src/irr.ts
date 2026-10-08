/**
 * Tasa interna de retorno por período de una serie de flujos (índice = período).
 * Newton-Raphson con respaldo por bisección; devuelve null si no hay cambio de signo.
 */
export function irr(cashflows: readonly number[], guess = 0.01): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((c) => c > 0);
  const hasNegative = cashflows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return null;

  const npv = (r: number): number => {
    let total = 0;
    let factor = 1;
    for (const c of cashflows) {
      total += c / factor;
      factor *= 1 + r;
    }
    return total;
  };
  const dnpv = (r: number): number => {
    let total = 0;
    for (let t = 1; t < cashflows.length; t++) {
      total -= (t * (cashflows[t] ?? 0)) / Math.pow(1 + r, t + 1);
    }
    return total;
  };

  let r = guess;
  for (let iter = 0; iter < 50; iter++) {
    const f = npv(r);
    const d = dnpv(r);
    if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
    const next = r - f / d;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }

  // Bisección en un rango amplio.
  let lo = -0.99;
  let hi = 1;
  let flo = npv(lo);
  let fhi = npv(hi);
  while (flo * fhi > 0 && hi < 1e6) {
    hi *= 2;
    fhi = npv(hi);
  }
  if (flo * fhi > 0) return null;
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-14) return mid;
    if (flo * fm < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
