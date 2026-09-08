import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { canBalance, findBalanced, isBalanced, sum } from '../src/lib/rotor';

const vec = JSON.parse(readFileSync(new URL('../../core/tests/vectors/rotor.json', import.meta.url), 'utf8'));

describe('rotor vectors', () => {
  for (const c of vec.cases) {
    it(`n=${c.n} k=${c.k} possible=${c.expect.possible}`, () => {
      expect(canBalance(c.n, c.k)).toBe(c.expect.possible);
      const r = findBalanced(c.n, c.k, () => 0.5);
      if (c.expect.possible) { expect(r).not.toBeNull(); expect(r!.slots.length).toBe(c.k); expect(isBalanced(c.n, r!.slots)).toBe(true); expect(new Set(r!.slots).size).toBe(c.k); }
      else expect(r).toBeNull();
    });
  }
  it('finds every feasible k for common rotors', () => {
    for (const n of [6, 8, 12, 16, 18, 24, 30, 36]) for (let k = 0; k <= n; k++) {
      const r = findBalanced(n, k, () => 0.5);
      expect(!!r).toBe(canBalance(n, k));
      if (r) expect(isBalanced(n, r.slots)).toBe(true);
    }
  });
  it('sum of opposite slots is zero', () => expect(sum(12, [0, 6]).mag).toBeLessThan(1e-9));
});
