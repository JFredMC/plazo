import { labelEvery, niceTicks } from './scale';

describe('escalas de gráficas', () => {
  it('marcas redondas', () => {
    expect(niceTicks(20_000_000)).toEqual([0, 5e6, 1e7, 1.5e7, 2e7]);
    expect(niceTicks(7_300_000)).toEqual([0, 2e6, 4e6, 6e6, 8e6]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it('etiquetas del eje X sin montarse', () => {
    expect(labelEvery(49, 560)).toBe(5);
    expect(labelEvery(5, 560)).toBe(1);
  });
});
