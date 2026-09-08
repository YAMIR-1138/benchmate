import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hemocytometer, seedPlan, normalize, verdict260280, verdict260230 } from '../src/lib/calc';
const vec = JSON.parse(readFileSync(new URL('../../core/tests/vectors/cells.json', import.meta.url), 'utf8'));

describe('cells', () => {
  for (const c of vec.hemocytometer) it(`hemo ${c.counted}/${c.squares}×${c.dilution}`, () => expect(hemocytometer(c.counted, c.squares, c.dilution)).toBeCloseTo(c.expect.cellsPerMl, 3));
  for (const c of vec.seed) it('seed plan', () => { const r = seedPlan(c) as any; for (const [k, v] of Object.entries(c.expect)) expect(r[k]).toBeCloseTo(v as number, 6); });
  for (const c of vec.normalize) it(`normalize ${c.conc}→${c.target}`, () => { const r = normalize(c.conc, c.target, c.finalVol) as any; for (const [k, v] of Object.entries(c.expect)) typeof v === 'boolean' ? expect(r[k]).toBe(v) : expect(r[k]).toBeCloseTo(v as number, 6); });
  it('ratios', () => {
    expect(verdict260280(1.85, 'dsDNA').status).toBe('good');
    expect(verdict260280(1.5, 'dsDNA').status).toBe('bad');
    expect(verdict260280(2.05, 'RNA').status).toBe('good');
    expect(verdict260230(2.1).status).toBe('good');
    expect(verdict260230(1.2).status).toBe('bad');
  });
});
