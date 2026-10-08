import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LOAN_PRODUCTS,
  RATE_LABELS,
  convertRate,
  equivalentRates,
  formatCOP,
  formatMonths,
  formatPercent,
  getLoanProduct,
  simulateLoan,
  yearlyBreakdown,
  type ExtraPayment,
  type LoanProductId,
  type LoanResult,
  type RateKind,
} from '@plazo/finance-engine';
import {
  MAX_EXTRAS,
  loanDefaults,
  loanFromParams,
  loanToParams,
  toLoanInput,
  type LoanState,
} from '../../core/loan-state';
import { SavedStore } from '../../core/saved.store';
import { readJson, todayIso } from '../../core/storage';
import { copyText, shareUrl, syncParamsToUrl } from '../../core/url-state';
import { BarChart, type BarSeries } from '../../shared/bar-chart';
import { LineChart, type LineSeries } from '../../shared/line-chart';
import { MoneyInput } from '../../shared/money-input';
import { SaveDialog } from '../../shared/save-dialog';
import { CopPipe, FechaPipe, MesesPipe, PctPipe } from '../../shared/pipes';
import { Toast } from '../../shared/toast';
import { AmortizationTable } from './amortization-table';

const LAST_KEY = 'plazo:last-credito';

type Outcome = { ok: true; result: LoanResult; base: LoanResult } | { ok: false; error: string };

@Component({
  selector: 'app-loan-page',
  imports: [
    LowerCasePipe,
    MoneyInput,
    SaveDialog,
    LineChart,
    BarChart,
    AmortizationTable,
    CopPipe,
    PctPipe,
    FechaPipe,
    MesesPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-page.html',
  styleUrl: './loan-page.css',
})
export class LoanPage {
  private readonly saved = inject(SavedStore);
  private readonly toast = inject(Toast);
  protected readonly products = LOAN_PRODUCTS;
  protected readonly kinds: RateKind[] = ['EA', 'NMV', 'MV'];
  protected readonly rateLabels = RATE_LABELS;
  protected readonly maxExtras = MAX_EXTRAS;

  protected readonly state = signal<LoanState>(this.initialState());
  protected readonly product = computed(
    () => getLoanProduct(this.state().product) ?? LOAN_PRODUCTS[0]!,
  );
  protected readonly params = computed(() => loanToParams(this.state()));

  protected readonly outcome = computed<Outcome>(() => {
    try {
      const input = toLoanInput(this.state());
      const result = simulateLoan(input);
      const base = input.extraPayments?.length
        ? simulateLoan({ ...input, extraPayments: [] })
        : result;
      return { ok: true, result, base };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Revisa los datos' };
    }
  });

  protected readonly result = computed(() => {
    const o = this.outcome();
    return o.ok ? o.result : null;
  });
  protected readonly error = computed(() => {
    const o = this.outcome();
    return o.ok ? '' : o.error;
  });

  protected readonly equivalents = computed(() => {
    const s = this.state();
    try {
      return equivalentRates({ value: s.rate / 100, kind: s.kind });
    } catch {
      return null;
    }
  });

  protected readonly lastPayment = computed(() => {
    const o = this.outcome();
    if (!o.ok) return 0;
    const last = o.result.rows.at(-1);
    return last ? last.payment - last.extra : 0;
  });

  protected readonly savings = computed(() => {
    const o = this.outcome();
    if (!o.ok || o.result === o.base) return null;
    return {
      interest: o.base.totals.interest - o.result.totals.interest,
      cost: o.base.totalCost - o.result.totalCost,
      months: o.base.periods - o.result.periods,
    };
  });

  protected readonly composition = computed(() => {
    const o = this.outcome();
    if (!o.ok) return [];
    const t = o.result.totals;
    const total = t.paid || 1;
    return [
      {
        cls: 'c-principal',
        label: 'Capital',
        value: t.principal,
        pct: (t.principal / total) * 100,
      },
      { cls: 'c-interest', label: 'Intereses', value: t.interest, pct: (t.interest / total) * 100 },
      {
        cls: 'c-other',
        label: 'Seguros y cargos',
        value: t.insurance + t.fees,
        pct: ((t.insurance + t.fees) / total) * 100,
      },
    ];
  });

  protected readonly balanceSeries = computed<LineSeries[]>(() => {
    const o = this.outcome();
    if (!o.ok) return [];
    const toSeries = (r: LoanResult) => [r.principal, ...r.rows.map((x) => x.closingBalance)];
    const series: LineSeries[] = [
      { name: 'Saldo', color: 'var(--accent)', values: toSeries(o.result), area: true },
    ];
    if (o.result !== o.base) {
      series.push({
        name: 'Sin abonos',
        color: 'var(--muted)',
        values: toSeries(o.base),
        dashed: true,
      });
    }
    return series;
  });

  protected readonly years = computed(() => {
    const o = this.outcome();
    return o.ok ? yearlyBreakdown(o.result.rows) : [];
  });
  protected readonly yearLabels = computed(() => this.years().map((y) => `Año ${y.year}`));
  protected readonly yearSeries = computed<BarSeries[]>(() => [
    { name: 'Capital', color: 'var(--accent)', values: this.years().map((y) => y.principal) },
    { name: 'Intereses', color: 'var(--interest)', values: this.years().map((y) => y.interest) },
    {
      name: 'Seguros y cargos',
      color: 'var(--muted)',
      values: this.years().map((y) => y.insurance + y.fees),
    },
  ]);

  protected readonly monthLabel = (i: number): string =>
    i === 0 ? 'Desembolso' : i % 12 === 0 ? `Año ${i / 12}` : `Mes ${i}`;

  constructor() {
    syncParamsToUrl(() => this.params(), LAST_KEY);
  }

  private initialState(): LoanState {
    const today = todayIso();
    const route = inject(ActivatedRoute);
    return (
      loanFromParams(route.snapshot.queryParams, today) ??
      loanFromParams(readJson<Record<string, string>>(LAST_KEY, {}), today) ??
      loanDefaults('libre-inversion', today)
    );
  }

  protected patch(p: Partial<LoanState>): void {
    this.state.update((s) => ({ ...s, ...p }));
  }

  protected num(event: Event): number {
    const v = (event.target as HTMLInputElement).value.replace(',', '.');
    return v.trim() === '' ? Number.NaN : Number(v);
  }

  protected selectProduct(id: LoanProductId): void {
    this.state.update((s) => ({ ...loanDefaults(id, s.startDate) }));
  }

  protected resetProduct(): void {
    this.selectProduct(this.state().product);
  }

  /** Al cambiar el tipo de tasa convertimos el valor para que el crédito siga siendo el mismo. */
  protected setKind(kind: RateKind): void {
    const s = this.state();
    if (s.kind === kind) return;
    try {
      const v = convertRate({ value: s.rate / 100, kind: s.kind }, kind).value * 100;
      this.patch({ kind, rate: Number(v.toFixed(4)) });
    } catch {
      this.patch({ kind });
    }
  }

  protected setTerm(value: number): void {
    if (!Number.isFinite(value)) return;
    const termMonths = Math.round(value);
    this.state.update((s) => ({
      ...s,
      termMonths,
      extras: s.extras.filter((e) => e.month <= termMonths),
    }));
  }

  protected addExtra(): void {
    const s = this.state();
    if (s.extras.length >= MAX_EXTRAS) return;
    const month = Math.min(s.termMonths, (s.extras.at(-1)?.month ?? 0) + 12);
    const amount = Math.max(100_000, Math.round(s.principal / 10 / 100_000) * 100_000);
    this.patch({ extras: [...s.extras, { month, amount, strategy: 'reduce-term' }] });
  }

  /** La prima de servicios llega en junio y diciembre: abonarla cada 6 meses. */
  protected addPrima(): void {
    const s = this.state();
    const amount = Math.max(500_000, Math.round(s.principal / 40 / 100_000) * 100_000);
    const extras: ExtraPayment[] = [];
    for (let m = 6; m < s.termMonths && extras.length < MAX_EXTRAS; m += 6) {
      extras.push({ month: m, amount, strategy: 'reduce-term' });
    }
    this.patch({ extras });
    this.toast.show(`Abono de ${formatCOP(amount)} cada 6 meses`);
  }

  protected updateExtra(index: number, p: Partial<ExtraPayment>): void {
    this.state.update((s) => ({
      ...s,
      extras: s.extras.map((e, i) => (i === index ? { ...e, ...p } : e)),
    }));
  }

  protected removeExtra(index: number): void {
    this.state.update((s) => ({ ...s, extras: s.extras.filter((_, i) => i !== index) }));
  }

  protected toResults(): void {
    document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected async share(): Promise<void> {
    const url = shareUrl(this.params());
    if (await copyText(url)) this.toast.show('Enlace copiado: quien lo abra verá esta simulación');
    else prompt('Copia este enlace', url);
  }

  protected readonly defaultName = computed(
    () => `${this.product().label} ${formatCOP(this.state().principal)}`,
  );

  protected save(name: string): void {
    const o = this.outcome();
    if (!o.ok) return;
    const s = this.state();
    this.saved.save({
      kind: 'credito',
      name,
      summary: `${formatCOP(s.principal)} a ${formatMonths(s.termMonths)} · ${formatPercent(s.rate / 100)} ${RATE_LABELS[s.kind].short} · cuota ${formatCOP(o.result.firstPayment)}`,
      params: this.params(),
    });
    this.toast.show('Simulación guardada en este navegador');
  }
}
