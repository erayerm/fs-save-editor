import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { decodeSav, encodeSav } from './savFile';

const FIXTURE = 'tests/fixtures/Vault1.sav';

describe('savFile', () => {
  it.skipIf(!existsSync(FIXTURE))('decodes a real .sav into JSON with dwellers', async () => {
    const text = readFileSync(FIXTURE, 'utf8');
    const data = await decodeSav(text);
    expect(data).toBeTruthy();
    expect(Array.isArray(data.dwellers.dwellers)).toBe(true);
    expect(data.dwellers.dwellers.length).toBeGreaterThan(0);
  });

  it.skipIf(!existsSync(FIXTURE))('round-trips a real .sav (re-decoded content matches original)', async () => {
    const text = readFileSync(FIXTURE, 'utf8').trim();
    const data = await decodeSav(text);
    const reEncoded = await encodeSav(data);
    const dataBack = await decodeSav(reEncoded);
    expect(dataBack).toEqual(data);
  });
});
