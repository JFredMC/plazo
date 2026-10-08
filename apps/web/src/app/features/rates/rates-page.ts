import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RATE_LABELS, equivalentRates, type RateKind } from '@plazo/finance-engine';
import { PctPipe } from '../../shared/pipes';

const EXAMPLES: { value: number; kind: RateKind; note: string }[] = [
  { value: 0.24, kind: 'NMV', note: '24 % N.M.V. no es 24 % al año: es 2 % cada mes.' },
  { value: 0.0195, kind: 'MV', note: 'Una tasa mensual de tarjeta, llevada a año.' },
  { value: 0.12, kind: 'EA', note: 'Una tasa de vivienda en E.A., llevada a mes.' },
];

@Component({
  selector: 'app-rates-page',
  imports: [PctPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .converter {
      display: grid;
      grid-template-columns: minmax(260px, 360px) 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .converter {
        grid-template-columns: 1fr;
      }
    }
    .out {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 560px) {
      .out {
        grid-template-columns: 1fr;
      }
    }
    .out .kpi.from {
      border-color: var(--accent);
    }
    .out .v {
      font-size: 22px;
    }
    .formulas {
      margin-top: 16px;
      display: grid;
      gap: 6px;
      font-size: 13px;
    }
    code {
      font-family: var(--font-mono);
      background: var(--raised);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 1px 6px;
    }
    .examples {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .examples button {
      text-align: left;
      height: auto;
      padding: 12px;
      display: grid;
      gap: 4px;
      white-space: normal;
      justify-content: start;
    }
    .examples small {
      color: var(--muted);
      font-weight: 500;
    }
  `,
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h2>Conversor de tasas</h2>
          <p>
            En Colombia te pueden dar la misma tasa de tres formas. Escribe una y mira sus
            equivalentes. Para comparar créditos o inversiones, usa siempre la E.A.
          </p>
        </div>
      </header>

      <div class="converter">
        <form class="card" (submit)="$event.preventDefault()" aria-label="Tasa a convertir">
          <div class="field">
            <label for="conv-rate">Tasa</label>
            <div class="suffix">
              <input
                id="conv-rate"
                type="number"
                class="num"
                min="0"
                step="0.01"
                [value]="value()"
                (input)="setValue($event)"
                data-testid="conv-rate"
              />
              <span>%</span>
            </div>
          </div>
          <div class="field">
            <span class="label" id="conv-kind">Tipo</span>
            <div class="seg" role="group" aria-labelledby="conv-kind">
              @for (k of kinds; track k) {
                <button
                  type="button"
                  [attr.aria-pressed]="kind() === k"
                  (click)="kind.set(k)"
                  [attr.data-testid]="'conv-kind-' + k"
                >
                  {{ labels[k].short }}
                </button>
              }
            </div>
            <span class="hint">{{ labels[kind()].long }}</span>
          </div>
        </form>

        <div class="stack">
          <section class="card" aria-live="polite">
            @if (rates(); as r) {
              <div class="out">
                @for (k of kinds; track k) {
                  <div class="kpi" [class.from]="k === kind()">
                    <div class="k">{{ labels[k].long }}</div>
                    <div class="v" [attr.data-testid]="'conv-' + k">
                      {{ r[k] | pct: (k === 'MV' ? 4 : 2) }}
                    </div>
                    <div class="d">{{ labels[k].short }}</div>
                  </div>
                }
              </div>
            } @else {
              <div class="alert" role="alert">Escribe una tasa mayor o igual a 0.</div>
            }
            <div class="formulas muted">
              <div><code>M.V. = (1 + E.A.)^(1/12) − 1</code></div>
              <div><code>N.M.V. = 12 × M.V.</code></div>
              <div><code>E.A. = (1 + M.V.)^12 − 1</code></div>
            </div>
          </section>

          <section class="card">
            <h3>Ejemplos</h3>
            <div class="examples">
              @for (e of examples; track e.note) {
                <button type="button" class="btn" (click)="load(e.value, e.kind)">
                  <span
                    >{{ e.value | pct: (e.kind === 'MV' ? 2 : 0) }} {{ labels[e.kind].short }}</span
                  >
                  <small>{{ e.note }}</small>
                </button>
              }
            </div>
          </section>
        </div>
      </div>
    </section>
  `,
})
export class RatesPage {
  protected readonly kinds: RateKind[] = ['EA', 'NMV', 'MV'];
  protected readonly labels = RATE_LABELS;
  protected readonly examples = EXAMPLES;
  protected readonly value = signal(24);
  protected readonly kind = signal<RateKind>('NMV');
  protected readonly rates = computed(() => {
    try {
      return equivalentRates({ value: this.value() / 100, kind: this.kind() });
    } catch {
      return null;
    }
  });

  protected setValue(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.value.set(raw.trim() === '' ? Number.NaN : Number(raw));
  }

  protected load(value: number, kind: RateKind): void {
    this.value.set(Number((value * 100).toFixed(4)));
    this.kind.set(kind);
  }
}
