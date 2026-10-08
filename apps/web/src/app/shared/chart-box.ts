import { DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/** Ancho real del contenedor para dibujar el SVG en píxeles (texto nítido en móvil y escritorio). */
export function observeWidth(host: () => ElementRef<HTMLElement> | undefined, fallback = 640) {
  const width = signal(0);
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const el = host()?.nativeElement;
    if (!el) return;
    const measure = () => width.set(Math.round(el.clientWidth) || fallback);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}
