import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { formatNumber, parseCOP } from '@plazo/finance-engine';

/** Campo de pesos que pone los puntos de miles mientras se escribe. */
@Component({
  selector: 'app-money',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prefix">
      <span aria-hidden="true">$</span>
      <input
        type="text"
        inputmode="numeric"
        class="num"
        autocomplete="off"
        placeholder="0"
        [id]="inputId()"
        [value]="display()"
        [attr.aria-label]="label() || null"
        [attr.aria-invalid]="invalid() || null"
        [attr.data-testid]="testId() || null"
        (input)="onInput($event)"
      />
    </div>
  `,
})
export class MoneyInput {
  readonly value = model.required<number>();
  readonly inputId = input<string>('');
  readonly label = input<string>('');
  readonly testId = input<string>('');
  readonly invalid = input(false);
  protected readonly display = computed(() => (this.value() ? formatNumber(this.value()) : ''));

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const fromEnd = el.value.length - (el.selectionStart ?? el.value.length);
    const n = Math.min(parseCOP(el.value) ?? 0, 1e13);
    const formatted = n ? formatNumber(n) : '';
    el.value = formatted;
    const pos = Math.max(0, formatted.length - fromEnd);
    el.setSelectionRange?.(pos, pos);
    this.value.set(n);
  }
}
