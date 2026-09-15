import { describe, it, expect } from 'vitest';
import { fitCurve, curveInvert } from '../src/lib/calc';

describe('standard curve', () => {
  it('recovers an exact quadratic', () => {
    const pts = [0, 0.1, 0.25, 0.5, 1, 2].map((x) => ({ x, y: -0.05 * x * x + 0.9 * x + 0.1 }));
    const f = fitCurve(pts)!;
    expect(f.kind).toBe('quadratic'); expect(f.a).toBeCloseTo(-0.05, 6); expect(f.b).toBeCloseTo(0.9, 6); expect(f.c).toBeCloseTo(0.1, 6); expect(f.r2).toBeCloseTo(1, 6);
    expect(curveInvert(f, -0.05 * 0.7 * 0.7 + 0.9 * 0.7 + 0.1)!).toBeCloseTo(0.7, 6);
  });
  it('falls back to linear with few points', () => {
    const f = fitCurve([{ x: 0, y: 0.1 }, { x: 1, y: 1.1 }, { x: 2, y: 2.1 }])!;
    expect(f.kind).toBe('linear'); expect(f.b).toBeCloseTo(1, 6); expect(curveInvert(f, 0.6)!).toBeCloseTo(0.5, 6);
  });
  it('rejects too few points', () => expect(fitCurve([{ x: 1, y: 1 }])).toBeUndefined());
});
