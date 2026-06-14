import { describe, it, expect } from 'vitest';
import { registerLegendaryDiscovery } from './survivalGuide';

describe('registerLegendaryDiscovery', () => {
  it('adds an N-prefixed entry to an empty collection', () => {
    expect(registerLegendaryDiscovery([], 'L_Jericho')).toEqual(['NL_Jericho']);
  });

  it('appends without dropping existing entries', () => {
    expect(registerLegendaryDiscovery(['NL_Preston'], 'L_Jericho')).toEqual(['NL_Preston', 'NL_Jericho']);
  });

  it('does not duplicate when already collected (N prefix)', () => {
    const list = ['NL_Jericho'];
    expect(registerLegendaryDiscovery(list, 'L_Jericho')).toEqual(['NL_Jericho']);
  });

  it('does not duplicate when already viewed (O prefix)', () => {
    const list = ['OL_AlistairTenpenny'];
    expect(registerLegendaryDiscovery(list, 'L_AlistairTenpenny')).toEqual(['OL_AlistairTenpenny']);
  });

  it('matches uniqueData with spaces correctly', () => {
    const list = ['NL_Abraham Washington'];
    expect(registerLegendaryDiscovery(list, 'L_Abraham Washington')).toEqual(['NL_Abraham Washington']);
  });
});
