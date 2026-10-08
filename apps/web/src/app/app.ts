import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SavedStore } from './core/saved.store';
import { ThemeStore } from './core/theme.store';
import { Toast } from './shared/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly theme = inject(ThemeStore);
  protected readonly saved = inject(SavedStore);
  protected readonly toast = inject(Toast);
  protected readonly year = new Date().getFullYear();
  protected readonly nav = [
    { path: '/credito', label: 'Crédito', icon: 'bi-house-door' },
    { path: '/cdt', label: 'CDT', icon: 'bi-piggy-bank' },
    { path: '/comparar', label: 'Comparar', icon: 'bi-layout-three-columns' },
    { path: '/tasas', label: 'Tasas', icon: 'bi-percent' },
    { path: '/guardadas', label: 'Guardadas', icon: 'bi-bookmark' },
  ];
}
