import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { LoanResult } from '@plazo/finance-engine';
import { CopPipe, FechaPipe } from '../../shared/pipes';

const PREVIEW = 24;

@Component({
  selector: 'app-amortization-table',
  imports: [CopPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .foot {
      display: flex;
      justify-content: center;
      margin-top: 10px;
    }
    td.extra {
      color: var(--accent-2);
    }
    .note-upfront {
      font-size: 12px;
      margin-top: 8px;
    }
    caption {
      text-align: left;
    }
  `,
  template: `
    <div class="table-wrap" tabindex="0" aria-label="Tabla de amortización, se puede desplazar">
      <table class="data" data-testid="schedule">
        <caption class="sr-only">
          Tabla de amortización mes a mes
        </caption>
        <thead>
          <tr>
            <th scope="col">Cuota</th>
            <th scope="col">Fecha</th>
            <th scope="col">Saldo inicial</th>
            <th scope="col">Interés</th>
            <th scope="col">Capital</th>
            @if (hasExtras()) {
              <th scope="col">Abono extra</th>
            }
            @if (hasCharges()) {
              <th scope="col">Seguros y cargos</th>
            }
            <th scope="col">Pago total</th>
            <th scope="col">Saldo final</th>
          </tr>
        </thead>
        <tbody>
          @for (r of visible(); track r.period) {
            <tr [class.has-extra]="r.extra > 0">
              <td>{{ r.period }}</td>
              <td>{{ r.date | fecha }}</td>
              <td>{{ r.openingBalance | cop }}</td>
              <td>{{ r.interest | cop }}</td>
              <td>{{ r.principal | cop }}</td>
              @if (hasExtras()) {
                <td class="extra">{{ r.extra ? (r.extra | cop) : '' }}</td>
              }
              @if (hasCharges()) {
                <td>{{ r.insurance + r.fee | cop }}</td>
              }
              <td>{{ r.payment | cop }}</td>
              <td>{{ r.closingBalance | cop }}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Totales</td>
            <td>{{ foot().interest | cop }}</td>
            <td>{{ foot().principal | cop }}</td>
            @if (hasExtras()) {
              <td>{{ foot().extra | cop }}</td>
            }
            @if (hasCharges()) {
              <td>{{ foot().charges | cop }}</td>
            }
            <td>{{ foot().payment | cop }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    @if (foot().upfront > 0) {
      <p class="muted note-upfront">
        Además, el cobro inicial de {{ foot().upfront | cop }} se descuenta al desembolso.
      </p>
    }
    @if (result().rows.length > preview) {
      <div class="foot">
        <button type="button" class="btn sm" (click)="all.set(!all())" data-testid="toggle-rows">
          {{
            all()
              ? 'Ver solo las primeras ' + preview
              : 'Ver las ' + result().rows.length + ' cuotas'
          }}
        </button>
      </div>
    }
  `,
})
export class AmortizationTable {
  readonly result = input.required<LoanResult>();
  protected readonly preview = PREVIEW;
  protected readonly all = signal(false);
  protected readonly visible = computed(() =>
    this.all() ? this.result().rows : this.result().rows.slice(0, PREVIEW),
  );
  protected readonly foot = computed(() => {
    const rows = this.result().rows;
    const add = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
    const monthlyFees = add((r) => r.fee);
    return {
      interest: add((r) => r.interest),
      principal: add((r) => r.principal),
      extra: add((r) => r.extra),
      charges: add((r) => r.insurance + r.fee),
      payment: add((r) => r.payment),
      upfront: this.result().totals.fees - monthlyFees,
    };
  });
  protected readonly hasExtras = computed(() => this.result().totals.extra > 0);
  protected readonly hasCharges = computed(
    () => this.result().totals.insurance + this.result().totals.fees > 0,
  );
}
