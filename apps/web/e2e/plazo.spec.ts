import { expect, test, type Page } from '@playwright/test';

/** Simulación de referencia: $1.000.000 a 12 meses al 2 % M.V. (cuota $94.560, intereses $134.715). */
const LOAN = 'credito?p=libre-inversion&m=1000000&n=12&t=2&k=MV&s=f&sv=0&ci=0&cm=0&d=2026-10-07';
const CDT = 'cdt?m=10000000&dias=365&t=12&b=365&r=4&g=0&d=2026-10-07';

const text = (page: Page, id: string) => page.getByTestId(id).first();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e')) {
      localStorage.clear();
      sessionStorage.setItem('e2e', '1');
    }
  });
});

test('crédito: cuota, tabla y aviso de resultados ilustrativos', async ({ page }) => {
  await page.goto(LOAN);
  await expect(text(page, 'payment')).toHaveText('$94.560');
  await expect(text(page, 'total-interest')).toHaveText('$134.715');
  await expect(page.getByTestId('schedule').locator('tbody tr')).toHaveCount(12);
  await expect(page.getByTestId('disclaimer')).toContainText('Resultados ilustrativos');
});

test('crédito: cambiar el tipo de tasa la convierte y la cuota no cambia', async ({ page }) => {
  await page.goto(LOAN);
  await page.getByTestId('kind-EA').click();
  await expect(page.getByTestId('rate')).toHaveValue('26.8242');
  await expect(text(page, 'payment')).toHaveText('$94.560');
  await page.getByTestId('kind-NMV').click();
  await expect(page.getByTestId('rate')).toHaveValue('24');
});

test('crédito: un abono extra muestra el ahorro y acorta el plazo', async ({ page }) => {
  await page.goto(LOAN + '&x=3:200000:p');
  await expect(page.getByTestId('savings')).toContainText('2 meses menos');
  await expect(page.getByTestId('schedule').locator('tbody tr')).toHaveCount(10);
  await expect(text(page, 'total-interest')).toHaveText('$99.452');
});

test('crédito: los cambios quedan en la URL y sobreviven a recargar', async ({ page }) => {
  await page.goto('credito');
  await page.getByTestId('product-tarjeta').click();
  await page.getByTestId('term').fill('12');
  await expect(page).toHaveURL(/p=tarjeta/);
  await expect(page).toHaveURL(/n=12/);
  await page.reload();
  await expect(page.getByTestId('term')).toHaveValue('12');
  await expect(page.getByTestId('product-tarjeta')).toHaveAttribute('aria-pressed', 'true');
});

test('CDT: retención del 4 % y 4×1000', async ({ page }) => {
  await page.goto(CDT);
  await expect(text(page, 'withholding')).toHaveText('$48.000');
  await expect(text(page, 'maturity')).toHaveText('$11.152.000');
  await page.getByTestId('cdt-gmf').check();
  await expect(text(page, 'gmf')).toHaveText('$40.000');
  await expect(text(page, 'net-return')).toHaveText('$1.112.000');
  await expect(page.getByTestId('terms').locator('tbody tr')).toHaveCount(5);
});

test('comparador: marca la mejor oferta de crédito y de CDT', async ({ page }) => {
  await page.goto('comparar');
  await expect(page.getByTestId('offer')).toHaveCount(3);
  await expect(page.getByTestId('best')).toHaveCount(1);
  await expect(page.getByTestId('verdict')).toContainText('costo efectivo');
  await page.getByTestId('mode-cdt').click();
  await expect(page.getByTestId('best')).toHaveText('Mejor rentabilidad');
});

test('conversor de tasas: 24 % N.M.V. = 26,82 % E.A.', async ({ page }) => {
  await page.goto('tasas');
  await expect(page.getByTestId('conv-EA')).toHaveText('26,82 %');
  await expect(page.getByTestId('conv-MV')).toHaveText('2,0000 %');
});

test('guardar una simulación y abrirla desde Guardadas', async ({ page }) => {
  await page.goto(LOAN);
  await page.getByTestId('save').click();
  await page.getByTestId('save-name').fill('Mi crédito de prueba');
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('toast')).toContainText('guardada');
  await page.getByTestId('nav-guardadas').click();
  await expect(page.getByTestId('saved-list')).toContainText('Mi crédito de prueba');
  await page.getByTestId('saved-open').click();
  await expect(page).toHaveURL(/credito\?/);
  await expect(text(page, 'payment')).toHaveText('$94.560');
});

test('exporta la tabla a PDF y a CSV', async ({ page, isMobile }) => {
  test.skip(isMobile, 'las descargas se prueban en escritorio');
  await page.goto(LOAN);
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-pdf').click(),
  ]);
  expect(pdf.suggestedFilename()).toMatch(/^plazo-credito-\d{4}-\d{2}-\d{2}\.pdf$/);
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-csv').click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
});

test('marca JFredDev discreta que abre el portafolio en otra pestaña', async ({ page }) => {
  await page.goto('');
  const brand = page.getByTestId('brand');
  await expect(brand).toBeVisible();
  await expect(brand).toHaveAttribute('href', 'https://jfredmc.github.io/portfolio/');
  await expect(brand).toHaveAttribute('target', '_blank');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.jpg$/);
});

test('tema claro y oscuro se recuerda', async ({ page }) => {
  await page.goto('credito');
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByTestId('theme-toggle').click();
  await expect(html).not.toHaveAttribute('data-theme', before ?? '');
  const after = await html.getAttribute('data-theme');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', after ?? '');
});

test('en móvil hay un resumen fijo con el pago', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo móvil');
  await page.goto(LOAN);
  await expect(page.locator('.mobile-summary')).toContainText('$94.560');
});
