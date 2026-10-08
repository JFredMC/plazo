import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('Plazo', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('muestra la navegación y el aviso de resultados ilustrativos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('nav a')).toHaveLength(5);
    expect(el.querySelector('[data-testid="disclaimer"]')?.textContent).toContain('ilustrativos');
  });

  it('simula un crédito desde un enlace compartido', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      '/credito?p=libre-inversion&m=1000000&n=12&t=2&k=MV&s=f&sv=0&ci=0&cm=0&d=2026-10-07',
    );
    const el = harness.routeNativeElement!;
    expect(el.querySelector('[data-testid="payment"]')?.textContent?.trim()).toBe('$94.560');
    expect(el.querySelector('[data-testid="total-interest"]')?.textContent?.trim()).toBe(
      '$134.715',
    );
    expect(el.querySelectorAll('[data-testid="schedule"] tbody tr')).toHaveLength(12);
  });

  it('simula un CDT con retención del 4 %', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cdt?m=10000000&dias=365&t=12&b=365&r=4&g=0&d=2026-10-07');
    const el = harness.routeNativeElement!;
    expect(el.querySelector('[data-testid="withholding"]')?.textContent?.trim()).toBe('$48.000');
    expect(el.querySelector('[data-testid="maturity"]')?.textContent?.trim()).toBe('$11.152.000');
  });

  it('compara ofertas y marca la de menor costo efectivo', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/comparar');
    const el = harness.routeNativeElement!;
    expect(el.querySelectorAll('[data-testid="offer"]')).toHaveLength(3);
    expect(el.querySelectorAll('[data-testid="best"]')).toHaveLength(1);
  });
});
