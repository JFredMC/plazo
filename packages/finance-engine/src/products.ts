import type { CdtTerm } from './cdt';
import type { CdtOffer, LoanOffer } from './compare';
import type { AmortizationSystem } from './loan';
import type { Rate } from './rates';

/**
 * Valores de ejemplo para arrancar la simulación. Son ilustrativos: no corresponden a la oferta
 * vigente de ninguna entidad real. Las entidades de las ofertas son ficticias.
 */
export type LoanProductId = 'libre-inversion' | 'vehiculo' | 'vivienda' | 'tarjeta';

export interface LoanProduct {
  id: LoanProductId;
  label: string;
  description: string;
  principal: number;
  termMonths: number;
  minTerm: number;
  maxTerm: number;
  rate: Rate;
  system: AmortizationSystem;
  /** Seguro de vida deudores en pesos por cada millón de saldo, al mes. */
  insurancePerMillion: number;
  upfrontFee: number;
  monthlyFee: number;
  /** Nombre del cargo mensual en este producto. */
  monthlyFeeLabel: string;
}

export const LOAN_PRODUCTS: readonly LoanProduct[] = [
  {
    id: 'libre-inversion',
    label: 'Libre inversión',
    description: 'Crédito de consumo para lo que necesites, con cuota fija.',
    principal: 20_000_000,
    termMonths: 48,
    minTerm: 6,
    maxTerm: 84,
    rate: { value: 0.24, kind: 'EA' },
    system: 'french',
    insurancePerMillion: 1_200,
    upfrontFee: 0,
    monthlyFee: 0,
    monthlyFeeLabel: 'Otros cargos mensuales',
  },
  {
    id: 'vehiculo',
    label: 'Vehículo',
    description: 'Financiación de carro o moto; el seguro todo riesgo va como cargo mensual.',
    principal: 60_000_000,
    termMonths: 60,
    minTerm: 12,
    maxTerm: 84,
    rate: { value: 0.17, kind: 'EA' },
    system: 'french',
    insurancePerMillion: 1_100,
    upfrontFee: 350_000,
    monthlyFee: 220_000,
    monthlyFeeLabel: 'Seguro todo riesgo (mensual)',
  },
  {
    id: 'vivienda',
    label: 'Vivienda',
    description: 'Crédito hipotecario en pesos con cuota fija y seguro de incendio y terremoto.',
    principal: 200_000_000,
    termMonths: 180,
    minTerm: 60,
    maxTerm: 360,
    rate: { value: 0.125, kind: 'EA' },
    system: 'french',
    insurancePerMillion: 650,
    upfrontFee: 900_000,
    monthlyFee: 48_000,
    monthlyFeeLabel: 'Seguro de incendio y terremoto',
  },
  {
    id: 'tarjeta',
    label: 'Tarjeta de crédito',
    description: 'Compra diferida a cuotas: abono constante a capital más cuota de manejo.',
    principal: 3_000_000,
    termMonths: 24,
    minTerm: 1,
    maxTerm: 48,
    rate: { value: 0.0195, kind: 'MV' },
    system: 'constant',
    insurancePerMillion: 0,
    upfrontFee: 0,
    monthlyFee: 32_000,
    monthlyFeeLabel: 'Cuota de manejo',
  },
];

export function getLoanProduct(id: string): LoanProduct | undefined {
  return LOAN_PRODUCTS.find((p) => p.id === id);
}

/** Pesos por millón al mes → fracción mensual. $1.200 por millón = 0,12 %. */
export function perMillionToRate(perMillion: number): number {
  return perMillion / 1_000_000;
}

export const SAMPLE_LOAN_OFFERS: readonly LoanOffer[] = [
  {
    id: 'ceiba',
    name: 'Banco Ceiba',
    rate: { value: 0.235, kind: 'EA' },
    termMonths: 48,
    system: 'french',
    lifeInsuranceRate: 0.0015,
    fees: { upfront: 250_000 },
  },
  {
    id: 'guayacan',
    name: 'Guayacán Financiera',
    rate: { value: 0.0172, kind: 'MV' },
    termMonths: 48,
    system: 'french',
    lifeInsuranceRate: 0.001,
  },
  {
    id: 'arrecife',
    name: 'Cooperativa Arrecife',
    rate: { value: 0.2, kind: 'NMV' },
    termMonths: 60,
    system: 'french',
    lifeInsuranceRate: 0.0011,
    fees: { monthly: 9_000 },
  },
];

export const SAMPLE_CDT_OFFERS: readonly CdtOffer[] = [
  { id: 'ceiba', name: 'Banco Ceiba', rateEA: 0.104, days: 360 },
  { id: 'guayacan', name: 'Guayacán Financiera', rateEA: 0.109, days: 360 },
  { id: 'arrecife', name: 'Cooperativa Arrecife', rateEA: 0.112, days: 540 },
];

/** Tabla de tasas por plazo para comparar plazos de CDT (ilustrativa). */
export const SAMPLE_CDT_TERMS: readonly CdtTerm[] = [
  { days: 90, rateEA: 0.092 },
  { days: 180, rateEA: 0.097 },
  { days: 360, rateEA: 0.102 },
  { days: 540, rateEA: 0.1 },
  { days: 720, rateEA: 0.098 },
];
