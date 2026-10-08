import { effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { writeJson } from './storage';

/**
 * Mantiene la URL al día con los parámetros de la simulación (enlace compartible) y guarda la
 * última simulación de cada pantalla en localStorage.
 */
export function syncParamsToUrl(params: () => Record<string, string>, storageKey: string): void {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  effect(() => {
    const p = params();
    writeJson(storageKey, p);
    void router.navigate([], { relativeTo: route, queryParams: p, replaceUrl: true });
  });
}

export function shareUrl(params: Record<string, string>): string {
  const url = new URL(location.href);
  url.search = new URLSearchParams(params).toString();
  url.hash = '';
  return url.toString();
}

/** Copia el enlace; si el navegador no deja, devuelve false para mostrarlo de otra forma. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
