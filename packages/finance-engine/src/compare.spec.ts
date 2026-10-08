import { describe, expect, it } from 'vitest';
import { compareCdtOffers, compareLoanOffers } from './compare';
import { SAMPLE_CDT_OFFERS, SAMPLE_LOAN_OFFERS } from './products';

describe('comparador', () => {
  it('ordena ofertas de crédito por costo efectivo, cuota y total pagado', () => {
    const c = compareLoanOffers(10_000_000, [
      { id: 'a', name: 'A', rate: { value: 0.24, kind: 'EA' }, termMonths: 36, system: 'french' },
      {
        id: 'b',
        name: 'B',
        rate: { value: 0.22, kind: 'EA' },
        termMonths: 36,
        system: 'french',
        fees: { upfront: 600_000 },
      },
      { id: 'c', name: 'C', rate: { value: 0.25, kind: 'EA' }, termMonths: 60, system: 'french' },
    ]);
    expect(c.offers).toHaveLength(3);
    // B tiene menor tasa pero el cobro inicial la encarece por encima de A.
    expect(c.offers[1]!.result.effectiveCost!.EA).toBeGreaterThan(0.24);
    expect(c.bestEffectiveCost).toBe(0);
    expect(c.lowestFirstPayment).toBe(2); // más plazo, menor cuota
    expect(c.lowestTotalPaid).toBe(0);
  });

  it('ordena CDT por rentabilidad neta', () => {
    const c = compareCdtOffers(10_000_000, SAMPLE_CDT_OFFERS, { gmf: true });
    expect(c.offers).toHaveLength(3);
    expect(c.bestNetEA).toBe(2);
    expect(c.bestNetReturn).toBe(2);
  });

  it('las ofertas de ejemplo simulan sin errores', () => {
    const c = compareLoanOffers(20_000_000, SAMPLE_LOAN_OFFERS);
    for (const { result } of c.offers) {
      expect(result.rows.at(-1)!.closingBalance).toBe(0);
      expect(result.effectiveCost!.EA).toBeGreaterThan(result.rates.EA);
    }
  });
});
