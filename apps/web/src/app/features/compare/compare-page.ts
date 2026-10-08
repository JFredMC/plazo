import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  RATE_LABELS,
  compareCdtOffers,
  compareLoanOffers,
  formatCOP,
  type CdtOfferComparison,
  type LoanOfferComparison,
  type RateKind,
} from '@plazo/finance-engine';
import {
  MAX_OFFERS,
  MIN_OFFERS,
  compareDefaults,
  compareFromParams,
  compareToParams,
  toCdtOffers,
  toLoanOffers,
  type CdtOfferForm,
  type CompareState,
  type LoanOfferForm,
} from '../../core/compare-state';
import { SavedStore } from '../../core/saved.store';
import { readJson } from '../../core/storage';
import { copyText, shareUrl, syncParamsToUrl } from '../../core/url-state';
import { BarChart, type BarSeries } from '../../shared/bar-chart';
import { MoneyInput } from '../../shared/money-input';
import { CopPipe, PctPipe } from '../../shared/pipes';
import { SaveDialog } from '../../shared/save-dialog';
import { Toast } from '../../shared/toast';

const LAST_KEY = 'plazo:last-comparar';
const NEW_NAMES = ['Oferta A', 'Oferta B', 'Oferta C'];

@Component({
  selector: 'app-compare-page',
  imports: [MoneyInput, SaveDialog, BarChart, CopPipe, PctPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
})
export class ComparePage {
  private readonly saved = inject(SavedStore);
  private readonly toast = inject(Toast);
  protected readonly kinds: RateKind[] = ['EA', 'NMV', 'MV'];
  protected readonly rateLabels = RATE_LABELS;
  protected readonly min = MIN_OFFERS;
  protected readonly max = MAX_OFFERS;
  protected readonly state = signal<CompareState>(this.initialState());
  protected readonly params = computed(() => compareToParams(this.state()));

  protected readonly loans = computed<LoanOfferComparison | null>(() => {
    try {
      return compareLoanOffers(this.state().principal, toLoanOffers(this.state()));
    } catch {
      return null;
    }
  });
  protected readonly loanError = computed(() => {
    try {
      compareLoanOffers(this.state().principal, toLoanOffers(this.state()));
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'Revisa los datos';
    }
  });

  protected readonly cdts = computed<CdtOfferComparison | null>(() => {
    const s = this.state();
    try {
      return compareCdtOffers(s.amount, toCdtOffers(s), {
        withholdingRate: s.withholding / 100,
        gmf: s.gmf,
      });
    } catch {
      return null;
    }
  });

  protected readonly loanChart = computed<{ labels: string[]; series: BarSeries[] }>(() => {
    const c = this.loans();
    if (!c) return { labels: [], series: [] };
    return {
      labels: c.offers.map((o) => o.offer.name),
      series: [
        {
          name: 'Intereses',
          color: 'var(--interest)',
          values: c.offers.map((o) => o.result.totals.interest),
        },
        {
          name: 'Seguros y cargos',
          color: 'var(--muted)',
          values: c.offers.map((o) => o.result.totals.insurance + o.result.totals.fees),
        },
      ],
    };
  });

  protected readonly cdtChart = computed<{ labels: string[]; series: BarSeries[] }>(() => {
    const c = this.cdts();
    if (!c) return { labels: [], series: [] };
    return {
      labels: c.offers.map((o) => o.offer.name),
      series: [
        {
          name: 'Ganancia neta',
          color: 'var(--accent)',
          values: c.offers.map((o) => o.result.netReturn),
        },
        {
          name: 'Retención y 4×1000',
          color: 'var(--bad)',
          values: c.offers.map((o) => o.result.withholding + o.result.gmf),
        },
      ],
    };
  });

  constructor() {
    syncParamsToUrl(() => this.params(), LAST_KEY);
  }

  private initialState(): CompareState {
    const route = inject(ActivatedRoute);
    return (
      compareFromParams(route.snapshot.queryParams) ??
      compareFromParams(readJson<Record<string, string>>(LAST_KEY, {})) ??
      compareDefaults()
    );
  }

  protected patch(p: Partial<CompareState>): void {
    this.state.update((s) => ({ ...s, ...p }));
  }

  protected num(event: Event): number {
    const v = (event.target as HTMLInputElement).value.replace(',', '.');
    return v.trim() === '' ? Number.NaN : Number(v);
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected updateLoan(i: number, p: Partial<LoanOfferForm>): void {
    this.state.update((s) => ({
      ...s,
      loans: s.loans.map((o, j) => (j === i ? { ...o, ...p } : o)),
    }));
  }

  protected updateCdt(i: number, p: Partial<CdtOfferForm>): void {
    this.state.update((s) => ({
      ...s,
      cdts: s.cdts.map((o, j) => (j === i ? { ...o, ...p } : o)),
    }));
  }

  protected addOffer(): void {
    const s = this.state();
    if (s.mode === 'credito' && s.loans.length < MAX_OFFERS) {
      const last = s.loans.at(-1)!;
      this.patch({ loans: [...s.loans, { ...last, name: NEW_NAMES[s.loans.length] ?? 'Oferta' }] });
    } else if (s.mode === 'cdt' && s.cdts.length < MAX_OFFERS) {
      const last = s.cdts.at(-1)!;
      this.patch({ cdts: [...s.cdts, { ...last, name: NEW_NAMES[s.cdts.length] ?? 'Oferta' }] });
    }
  }

  protected removeOffer(i: number): void {
    const s = this.state();
    if (s.mode === 'credito' && s.loans.length > MIN_OFFERS) {
      this.patch({ loans: s.loans.filter((_, j) => j !== i) });
    } else if (s.mode === 'cdt' && s.cdts.length > MIN_OFFERS) {
      this.patch({ cdts: s.cdts.filter((_, j) => j !== i) });
    }
  }

  protected reset(): void {
    const d = compareDefaults();
    this.state.set({ ...d, mode: this.state().mode });
  }

  protected async share(): Promise<void> {
    const url = shareUrl(this.params());
    if (await copyText(url)) this.toast.show('Enlace copiado: quien lo abra verá esta comparación');
    else prompt('Copia este enlace', url);
  }

  protected readonly defaultName = computed(() =>
    this.state().mode === 'credito'
      ? `Comparar créditos ${formatCOP(this.state().principal)}`
      : `Comparar CDT ${formatCOP(this.state().amount)}`,
  );

  protected save(name: string): void {
    const s = this.state();
    let summary: string;
    if (s.mode === 'credito') {
      const c = this.loans();
      const best = c?.offers[c.bestEffectiveCost];
      summary = `${s.loans.length} ofertas de crédito por ${formatCOP(s.principal)}${best ? ' · mejor: ' + best.offer.name : ''}`;
    } else {
      const c = this.cdts();
      const best = c?.offers[c.bestNetEA];
      summary = `${s.cdts.length} CDT por ${formatCOP(s.amount)}${best ? ' · mejor: ' + best.offer.name : ''}`;
    }
    this.saved.save({ kind: 'comparar', name, summary, params: this.params() });
    this.toast.show('Comparación guardada en este navegador');
  }
}
