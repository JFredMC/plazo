import { TestBed } from '@angular/core/testing';
import { MAX_SAVED, SavedStore } from './saved.store';

describe('SavedStore', () => {
  beforeEach(() => localStorage.clear());

  it('guarda, persiste y borra', () => {
    const store = TestBed.inject(SavedStore);
    const item = store.save({ kind: 'cdt', name: '  Mi CDT ', summary: 'x', params: { m: '1' } });
    expect(item.name).toBe('Mi CDT');
    expect(JSON.parse(localStorage.getItem('plazo:saved')!)).toHaveLength(1);
    store.remove(item.id);
    expect(store.items()).toHaveLength(0);
  });

  it('ignora datos dañados en localStorage', () => {
    localStorage.setItem('plazo:saved', '[{"id":1},"x",null]');
    expect(TestBed.inject(SavedStore).items()).toEqual([]);
  });

  it('limita la cantidad de simulaciones', () => {
    const store = TestBed.inject(SavedStore);
    for (let i = 0; i < MAX_SAVED + 5; i++) {
      store.save({ kind: 'credito', name: `n${i}`, summary: '', params: {} });
    }
    expect(store.items()).toHaveLength(MAX_SAVED);
    expect(store.items()[0]!.name).toBe(`n${MAX_SAVED + 4}`);
  });
});
