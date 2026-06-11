import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore } from './saveStore';
import type { SaveJson } from '../types/save';

const fakeSave = { dwellers: { dwellers: [] } } as unknown as SaveJson;

describe('saveStore isDemo flag', () => {
  beforeEach(() => {
    useSaveStore.getState().clear();
  });

  it('defaults to false', () => {
    expect(useSaveStore.getState().isDemo).toBe(false);
  });

  it('is false after a normal setSave', () => {
    useSaveStore.getState().setSave(fakeSave, 'Vault1.sav');
    expect(useSaveStore.getState().isDemo).toBe(false);
  });

  it('is true when setSave is called with isDemo', () => {
    useSaveStore.getState().setSave(fakeSave, 'demo.sav', { isDemo: true });
    expect(useSaveStore.getState().isDemo).toBe(true);
  });

  it('resets to false on clear', () => {
    useSaveStore.getState().setSave(fakeSave, 'demo.sav', { isDemo: true });
    useSaveStore.getState().clear();
    expect(useSaveStore.getState().isDemo).toBe(false);
  });
});
