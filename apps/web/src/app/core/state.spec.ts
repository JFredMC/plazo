import { decodePayload, encodePayload } from './params';
import { loanDefaults, loanFromParams, loanToParams, parseExtras, toLoanInput } from './loan-state';
import { cdtDefaults, cdtFromParams, cdtToParams, toCdtInput } from './cdt-state';
import { compareDefaults, compareFromParams, compareToParams } from './compare-state';

const TODAY = '2026-10-07';

describe('enlace compartible: crédito', () => {
  it('ida y vuelta conserva toda la simulación', () => {
    const s = {
      ...loanDefaults('vehiculo', TODAY),
      rate: 1.3,
      kind: 'MV' as const,
      system: 'constant' as const,
      insuranceBase: 'initial' as const,
      extras: [
        { month: 6, amount: 2_000_000, strategy: 'reduce-term' as const },
        { month: 12, amount: 1_000_000, strategy: 'reduce-installment' as const },
      ],
    };
    expect(loanFromParams(loanToParams(s), TODAY)).toEqual(s);
  });

  it('sin parámetros devuelve null para usar lo último o los valores de ejemplo', () => {
    expect(loanFromParams({}, TODAY)).toBeNull();
  });

  it('valores raros caen a los del producto y se acotan', () => {
    const s = loanFromParams(
      { p: 'tarjeta', m: 'abc', n: '9999', t: '-5', k: 'XX', d: '2026-02-31' },
      TODAY,
    )!;
    const d = loanDefaults('tarjeta', TODAY);
    expect(s.principal).toBe(d.principal);
    expect(s.termMonths).toBe(600);
    expect(s.rate).toBe(0);
    expect(s.kind).toBe(d.kind);
    expect(s.startDate).toBe(TODAY);
  });

  it('abonos: ignora entradas inválidas y ordena por mes', () => {
    expect(parseExtras('12:500:c,x,0:1:p,3:100:p,99:5:p,4:-1:p', 24)).toEqual([
      { month: 3, amount: 100, strategy: 'reduce-term' },
      { month: 12, amount: 500, strategy: 'reduce-installment' },
    ]);
  });

  it('convierte a la entrada del motor (tasa en fracción, seguro por millón)', () => {
    const input = toLoanInput(loanDefaults('libre-inversion', TODAY));
    expect(input.rate).toEqual({ value: 0.24, kind: 'EA' });
    expect(input.lifeInsurance?.monthlyRate).toBeCloseTo(0.0012, 12);
  });
});

describe('enlace compartible: CDT', () => {
  it('ida y vuelta, incluida la tabla de plazos editada', () => {
    const s = {
      ...cdtDefaults(TODAY),
      amount: 25_000_000,
      gmf: true,
      dayBase: 360 as const,
      terms: [
        { days: 60, rate: 8.5 },
        { days: 400, rate: 11.25 },
      ],
    };
    expect(cdtFromParams(cdtToParams(s), TODAY)).toEqual(s);
    expect(cdtToParams(cdtDefaults(TODAY))['pz']).toBeUndefined();
  });

  it('retención en fracción para el motor', () => {
    expect(toCdtInput(cdtDefaults(TODAY)).withholdingRate).toBeCloseTo(0.04, 12);
  });
});

describe('enlace compartible: comparador', () => {
  it('créditos con nombres con tildes', () => {
    const s = compareDefaults();
    s.loans[0]!.name = 'Cooperativa Ñandú';
    expect(compareFromParams(compareToParams(s))).toEqual(s);
  });

  it('CDT', () => {
    const s = { ...compareDefaults(), mode: 'cdt' as const, gmf: true, withholding: 7 };
    expect(compareFromParams(compareToParams(s))).toEqual(s);
  });

  it('carga útil dañada vuelve a las ofertas de ejemplo', () => {
    const s = compareFromParams({ modo: 'credito', o: '%%%' })!;
    expect(s.loans).toEqual(compareDefaults().loans);
    expect(decodePayload('no-es-base64!')).toBeUndefined();
    expect(decodePayload(encodePayload({ a: 'é' }))).toEqual({ a: 'é' });
  });
});
