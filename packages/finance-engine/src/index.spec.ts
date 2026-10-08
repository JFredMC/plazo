import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from './index';

describe('finance-engine', () => {
  it('exporta su versión', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });
});
