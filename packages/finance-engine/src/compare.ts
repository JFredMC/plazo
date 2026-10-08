import { indexOfMax, indexOfMin, simulateCdt, type CdtResult } from './cdt';
import { simulateLoan, type AmortizationSystem, type LoanFees, type LoanResult } from './loan';
import type { Rate } from './rates';

export interface LoanOffer {
  id: string;
  name: string;
  rate: Rate;
  termMonths: number;
  system: AmortizationSystem;
  /** Seguro de vida, fracción mensual sobre el saldo. */
  lifeInsuranceRate?: number;
  fees?: LoanFees;
}

export interface LoanOfferComparison {
  offers: { offer: LoanOffer; result: LoanResult }[];
  /** Menor costo efectivo anual: la forma justa de comparar ofertas con plazos o cargos distintos. */
  bestEffectiveCost: number;
  lowestFirstPayment: number;
  lowestTotalPaid: number;
}

export function compareLoanOffers(
  principal: number,
  offers: readonly LoanOffer[],
): LoanOfferComparison {
  if (offers.length < 1) throw new RangeError('Se necesita al menos una oferta');
  const results = offers.map((offer) => ({
    offer,
    result: simulateLoan({
      principal,
      termMonths: offer.termMonths,
      rate: offer.rate,
      system: offer.system,
      lifeInsurance: offer.lifeInsuranceRate ? { monthlyRate: offer.lifeInsuranceRate } : undefined,
      fees: offer.fees,
    }),
  }));
  return {
    offers: results,
    bestEffectiveCost: indexOfMin(results.map((r) => r.result.effectiveCost?.EA ?? Infinity)),
    lowestFirstPayment: indexOfMin(results.map((r) => r.result.firstPayment)),
    lowestTotalPaid: indexOfMin(results.map((r) => r.result.totals.paid)),
  };
}

export interface CdtOffer {
  id: string;
  name: string;
  rateEA: number;
  days: number;
}

export interface CdtOfferComparison {
  offers: { offer: CdtOffer; result: CdtResult }[];
  bestNetEA: number;
  bestNetReturn: number;
}

export function compareCdtOffers(
  amount: number,
  offers: readonly CdtOffer[],
  options: { withholdingRate?: number; gmf?: boolean; dayBase?: 360 | 365 } = {},
): CdtOfferComparison {
  if (offers.length < 1) throw new RangeError('Se necesita al menos una oferta');
  const results = offers.map((offer) => ({
    offer,
    result: simulateCdt({ amount, days: offer.days, rateEA: offer.rateEA, ...options }),
  }));
  return {
    offers: results,
    bestNetEA: indexOfMax(results.map((r) => r.result.netEA)),
    bestNetReturn: indexOfMax(results.map((r) => r.result.netReturn)),
  };
}
