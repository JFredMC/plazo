import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'credito' },
  {
    path: 'credito',
    title: 'Crédito · Plazo',
    loadComponent: () => import('./features/loan/loan-page').then((m) => m.LoanPage),
  },
  {
    path: 'cdt',
    title: 'CDT · Plazo',
    loadComponent: () => import('./features/cdt/cdt-page').then((m) => m.CdtPage),
  },
  {
    path: 'comparar',
    title: 'Comparar ofertas · Plazo',
    loadComponent: () => import('./features/compare/compare-page').then((m) => m.ComparePage),
  },
  {
    path: 'tasas',
    title: 'Conversor de tasas · Plazo',
    loadComponent: () => import('./features/rates/rates-page').then((m) => m.RatesPage),
  },
  {
    path: 'guardadas',
    title: 'Simulaciones guardadas · Plazo',
    loadComponent: () => import('./features/saved/saved-page').then((m) => m.SavedPage),
  },
  { path: '**', redirectTo: 'credito' },
];
