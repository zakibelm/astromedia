import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../utils/formatters';

describe('Utility Functions: formatDuration', () => {

  it('doit formater les durées en dessous de 60 secondes correctement', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(59999)).toBe('59s');
  });

  it('doit formater les durées en minutes et secondes', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(150000)).toBe('2m 30s');
  });

  it('doit gérer les cas limites', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(120000)).toBe('2m 0s');
  });

  it('doit gérer les millisecondes', () => {
    expect(formatDuration(1234)).toBe('1s');
  });
});