import { Injectable, signal } from '@angular/core';
import { readJson, writeJson } from './storage';

export type SavedKind = 'credito' | 'cdt' | 'comparar';

export interface SavedSimulation {
  id: string;
  kind: SavedKind;
  name: string;
  summary: string;
  params: Record<string, string>;
  savedAt: string;
}

const KEY = 'plazo:saved';
export const MAX_SAVED = 50;

function isSaved(x: unknown): x is SavedSimulation {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    (s['kind'] === 'credito' || s['kind'] === 'cdt' || s['kind'] === 'comparar') &&
    typeof s['name'] === 'string' &&
    typeof s['summary'] === 'string' &&
    typeof s['savedAt'] === 'string' &&
    !!s['params'] &&
    typeof s['params'] === 'object'
  );
}

/** Simulaciones guardadas en este navegador (localStorage). */
@Injectable({ providedIn: 'root' })
export class SavedStore {
  private readonly _items = signal<SavedSimulation[]>(this.load());
  readonly items = this._items.asReadonly();

  private load(): SavedSimulation[] {
    const raw = readJson<unknown>(KEY, []);
    return Array.isArray(raw) ? raw.filter(isSaved).slice(0, MAX_SAVED) : [];
  }

  save(entry: Omit<SavedSimulation, 'id' | 'savedAt'>): SavedSimulation {
    const item: SavedSimulation = {
      ...entry,
      name: entry.name.trim().slice(0, 60) || 'Simulación',
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      savedAt: new Date().toISOString(),
    };
    this._items.update((list) => [item, ...list].slice(0, MAX_SAVED));
    writeJson(KEY, this._items());
    return item;
  }

  remove(id: string): void {
    this._items.update((list) => list.filter((x) => x.id !== id));
    writeJson(KEY, this._items());
  }

  clear(): void {
    this._items.set([]);
    writeJson(KEY, []);
  }
}
