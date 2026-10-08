import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SavedStore, type SavedSimulation } from '../../core/saved.store';

const LABEL: Record<SavedSimulation['kind'], { text: string; icon: string; path: string }> = {
  credito: { text: 'Crédito', icon: 'bi-house-door', path: '/credito' },
  cdt: { text: 'CDT', icon: 'bi-piggy-bank', path: '/cdt' },
  comparar: { text: 'Comparación', icon: 'bi-layout-three-columns', path: '/comparar' },
};

@Component({
  selector: 'app-saved-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    li {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
      font-size: 18px;
      flex: none;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .info h3 {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info p {
      color: var(--muted);
      font-size: 12.5px;
    }
    .empty {
      text-align: center;
      padding: 40px 16px;
    }
    .empty i {
      font-size: 32px;
      color: var(--accent);
    }
    .empty p {
      color: var(--muted);
      margin: 8px 0 16px;
    }
    @media (max-width: 560px) {
      li {
        flex-wrap: wrap;
      }
      .info {
        flex-basis: calc(100% - 60px);
      }
      li .toolbar {
        margin-left: 56px;
      }
    }
  `,
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h2>Simulaciones guardadas</h2>
          <p>Se guardan solo en este navegador. Ábrelas para seguir ajustándolas o compartirlas.</p>
        </div>
        @if (store.items().length) {
          <button type="button" class="btn danger" (click)="clear()">
            <i class="bi bi-trash3" aria-hidden="true"></i> Borrar todas
          </button>
        }
      </header>

      @if (store.items().length) {
        <ul data-testid="saved-list">
          @for (s of store.items(); track s.id) {
            <li class="card">
              <span class="icon"
                ><i class="bi" [class]="label[s.kind].icon" aria-hidden="true"></i
              ></span>
              <div class="info">
                <h3>{{ s.name }}</h3>
                <p>{{ label[s.kind].text }} · {{ s.summary }}</p>
                <p>Guardada el {{ when(s.savedAt) }}</p>
              </div>
              <div class="toolbar">
                <button
                  type="button"
                  class="btn sm primary"
                  (click)="open(s)"
                  data-testid="saved-open"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  class="btn sm icon danger"
                  (click)="store.remove(s.id)"
                  [attr.aria-label]="'Borrar ' + s.name"
                >
                  <i class="bi bi-trash3" aria-hidden="true"></i>
                </button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <div class="card empty" data-testid="saved-empty">
          <i class="bi bi-bookmark" aria-hidden="true"></i>
          <p>Aún no tienes simulaciones guardadas.</p>
          <a class="btn primary" routerLink="/credito">Simular un crédito</a>
        </div>
      }
    </section>
  `,
})
export class SavedPage {
  protected readonly store = inject(SavedStore);
  private readonly router = inject(Router);
  protected readonly label = LABEL;

  protected open(s: SavedSimulation): void {
    void this.router.navigate([LABEL[s.kind].path], { queryParams: s.params });
  }

  protected clear(): void {
    if (confirm('¿Borrar todas las simulaciones guardadas en este navegador?')) this.store.clear();
  }

  protected when(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const months = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    const hh = d.getHours();
    const h12 = hh % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h12}:${mm} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
  }
}
