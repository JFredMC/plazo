import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  compareCdtTerms,
  formatCOP,
  formatPercent,
  simulateCdt,
  type CdtResult,
  type CdtTermComparison,
} from '@plazo/finance-engine';
import {
  cdtDefaults,
  cdtFromParams,
  cdtTerms,
  cdtToParams,
  toCdtInput,
  type CdtState,
} from '../../core/cdt-state';
import { SavedStore } from '../../core/saved.store';
import { readJson, todayIso } from '../../core/storage';
import { copyText, shareUrl, syncParamsToUrl } from '../../core/url-state';
import { MoneyInput } from '../../shared/money-input';
import { CopPipe, FechaPipe, PctPipe } from '../../shared/pipes';
import { SaveDialog } from '../../shared/save-dialog';
import { Toast } from '../../shared/toast';

const LAST_KEY = 'plazo:last-cdt';
export const DAY_SHORTCUTS = [90, 180, 360, 540, 720];

@Component({
  selector: 'app-cdt-page',
  imports: [MoneyInput, SaveDialog, CopPipe, PctPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cdt-page.html',
  styleUrl: './cdt-page.css',
})
export class CdtPage {
  private readonly saved = inject(SavedStore);
  private readonly toast = inject(Toast);
  protected readonly shortcuts = DAY_SHORTCUTS;
  protected readonly state = signal<CdtState>(this.initialState());
  protected readonly params = computed(() => cdtToParams(this.state()));

  protected readonly outcome = computed<
    { ok: true; result: CdtResult } | { ok: false; error: string }
  >(() => {
    try {
      return { ok: true, result: simulateCdt(toCdtInput(this.state())) };
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

  protected readonly breakdown = computed(() => {
    const r = this.result();
    if (!r) return [];
    const total = r.amount + r.grossInterest || 1;
    return [
      { cls: 'c-principal', label: 'Capital', value: r.amount, pct: (r.amount / total) * 100 },
      {
        cls: 'c-interest',
        label: 'Intereses netos',
        value: r.netInterest,
        pct: (r.netInterest / total) * 100,
      },
      {
        cls: 'c-tax',
        label: 'Retención',
        value: r.withholding,
        pct: (r.withholding / total) * 100,
      },
    ];
  });

  protected readonly terms = computed<CdtTermComparison | null>(() => {
    const s = this.state();
    try {
      return compareCdtTerms(
        {
          amount: s.amount,
          dayBase: s.dayBase,
          withholdingRate: s.withholding / 100,
          gmf: s.gmf,
        },
        cdtTerms(s),
      );
    } catch {
      return null;
    }
  });
  protected readonly maxTermReturn = computed(() =>
    Math.max(1, ...(this.terms()?.results.map((r) => r.netReturn) ?? [1])),
  );

  constructor() {
    syncParamsToUrl(() => this.params(), LAST_KEY);
  }

  private initialState(): CdtState {
    const today = todayIso();
    const route = inject(ActivatedRoute);
    return (
      cdtFromParams(route.snapshot.queryParams, today) ??
      cdtFromParams(readJson<Record<string, string>>(LAST_KEY, {}), today) ??
      cdtDefaults(today)
    );
  }

  protected patch(p: Partial<CdtState>): void {
    this.state.update((s) => ({ ...s, ...p }));
  }

  protected num(event: Event): number {
    const v = (event.target as HTMLInputElement).value.replace(',', '.');
    return v.trim() === '' ? Number.NaN : Number(v);
  }

  protected updateTerm(index: number, p: Partial<{ days: number; rate: number }>): void {
    this.state.update((s) => ({
      ...s,
      terms: s.terms.map((t, i) => (i === index ? { ...t, ...p } : t)),
    }));
  }

  /** Usa la fila de la tabla como simulación principal. */
  protected useTerm(index: number): void {
    const t = this.state().terms[index];
    if (t) this.patch({ days: t.days, rate: t.rate });
  }

  protected reset(): void {
    this.state.set(cdtDefaults(this.state().startDate));
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
    () => `CDT ${formatCOP(this.state().amount)} a ${this.state().days} días`,
  );

  protected save(name: string): void {
    const r = this.result();
    if (!r) return;
    const s = this.state();
    this.saved.save({
      kind: 'cdt',
      name,
      summary: `${formatCOP(s.amount)} a ${s.days} días · ${formatPercent(s.rate / 100)} E.A. · ganancia neta ${formatCOP(r.netReturn)}`,
      params: this.params(),
    });
    this.toast.show('Simulación guardada en este navegador');
  }
}
