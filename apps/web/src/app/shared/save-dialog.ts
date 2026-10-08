import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** Diálogo para ponerle nombre a una simulación antes de guardarla. */
@Component({
  selector: 'app-save-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--surface);
      color: var(--text);
      padding: 20px;
      width: min(420px, 100% - 32px);
      box-shadow: var(--shadow);
    }
    dialog::backdrop {
      background: rgb(3 7 15 / 0.6);
      backdrop-filter: blur(3px);
    }
    h2 {
      margin-bottom: 4px;
    }
    p {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 14px;
    }
    .toolbar {
      justify-content: flex-end;
      margin-top: 16px;
    }
  `,
  template: `
    <dialog #dlg (close)="opened.set(false)" aria-labelledby="save-title">
      <form method="dialog" (submit)="submit($event)">
        <h2 id="save-title">Guardar simulación</h2>
        <p>Queda en este navegador. Puedes abrirla luego desde «Guardadas».</p>
        <label class="sr-only" for="save-name">Nombre</label>
        <input
          #name
          id="save-name"
          type="text"
          maxlength="60"
          [value]="defaultName()"
          data-testid="save-name"
          autocomplete="off"
        />
        <div class="toolbar">
          <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
          <button type="submit" class="btn primary" data-testid="save-confirm">
            <i class="bi bi-bookmark-check" aria-hidden="true"></i> Guardar
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class SaveDialog {
  readonly defaultName = input('');
  readonly confirmed = output<string>();
  protected readonly opened = signal(false);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly name = viewChild.required<ElementRef<HTMLInputElement>>('name');

  open(): void {
    const d = this.dlg().nativeElement;
    this.name().nativeElement.value = this.defaultName();
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
    this.opened.set(true);
    queueMicrotask(() => this.name().nativeElement.select());
  }

  close(): void {
    const d = this.dlg().nativeElement;
    if (typeof d.close === 'function') d.close();
    else d.removeAttribute('open');
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.confirmed.emit(this.name().nativeElement.value);
    this.close();
  }
}
