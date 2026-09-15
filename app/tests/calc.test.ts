import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dilution, intermediatePlan, molar, rcfFromRpm, rpmFromRcf } from '../src/lib/calc';
import { parseDuration, fmt, parseNum } from '../src/lib/fmt';
import { convert, autoUnit } from '../src/lib/units';

const vec = (name: string) => JSON.parse(readFileSync(new URL(`../../core/tests/vectors/${name}.json`, import.meta.url), 'utf8'));

describe('dilution vectors', () => {
  for (const c of vec('dilution').cases) {
    it(JSON.stringify(c), () => {
      const r = dilution({ c1: c.c1, c2: c.c2, v1: c.v1, v2: c.v2 });
      for (const [k, v] of Object.entries(c.expect)) expect((r as any)[k]).toBeCloseTo(v as number, 6);
    });
  }
  it('rejects two blanks', () => expect(() => dilution({ c1: 1 })).toThrow());
  it('rejects final > stock', () => expect(() => dilution({ c1: 1, c2: 2, v2: 10 })).toThrow());
});

describe('molar vectors', () => {
  for (const c of vec('molar').cases) {
    it(JSON.stringify(c), () => {
      const r = molar({ mass_g: c.mass_g, molarity_M: c.molarity_M, volume_L: c.volume_L, mw: c.mw });
      for (const [k, v] of Object.entries(c.expect)) expect((r as any)[k]).toBeCloseTo(v as number, 6);
    });
  }
});

describe('centrifuge vectors', () => {
  for (const c of vec('centrifuge').cases) {
    it(JSON.stringify(c), () => {
      if (c.expect.rcf !== undefined) expect(rcfFromRpm(c.rpm, c.r_cm) / c.expect.rcf).toBeCloseTo(1, 2);
      if (c.expect.rpm !== undefined) expect(rpmFromRcf(c.rcf, c.r_cm) / c.expect.rpm).toBeCloseTo(1, 2);
    });
  }
});

describe('units', () => {
  it('converts volume', () => expect(convert(1, 'mL', 'µL')).toBe(1000));
  it('converts % w/v to mg/mL', () => expect(convert(1, '%', 'mg/mL')).toBeCloseTo(10));
  it('auto-picks units', () => {
    expect(autoUnit(1.25e-6, 'volume')).toEqual({ value: 1.25, unit: 'µL' });
    expect(autoUnit(0.5, 'volume')).toEqual({ value: 500, unit: 'mL' });
  });
});

describe('fmt', () => {
  it('parses durations', () => {
    expect(parseDuration('5m')).toBe(300000);
    expect(parseDuration('1h30m')).toBe(5400000);
    expect(parseDuration('2:30')).toBe(150000);
    expect(parseDuration('15')).toBe(900000);
    expect(parseDuration('90s')).toBe(90000);
  });
  it('formats', () => {
    expect(fmt(998.75)).toBe('998.8');
    expect(fmt(12.5)).toBe('12.5');
    expect(fmt(0.05)).toBe('0.05');
    expect(fmt(1000)).toBe('1000');
  });
});

describe('exponent input', () => {
  it('parses lab notation', () => {
    for (const s of ['200000', '2e5', '2E5', '2×10^5', '2x10^5', '2*10^5', '2·10⁵', '2 x 10^5', '2×10⁵']) expect(parseNum(s)).toBe(200000);
    expect(parseNum('10^6')).toBe(1e6);
    expect(parseNum('0.5×10⁵')).toBe(50000);
    expect(parseNum('1,5e3')).toBe(1500);
  });
});

describe('intermediate dilution plan', () => {
  it('splits a 1:1000 pre-dilution into 1:100 then 1:10 and keeps the final concentration', () => {
    const r = dilution({ c1: 0.1, c2: 1e-6, v2: 100e-6 }); // 100 mM → 1 µM in 100 µL
    expect(r.v1).toBeCloseTo(1e-9, 15);
    const plan = intermediatePlan(r.v1, r.v2, 1e-6)!;
    expect(plan.factor).toBe(1000);
    expect(plan.steps.map((s) => s.factor)).toEqual([100, 10]);
    expect(plan.steps[0].stock).toBeCloseTo(2e-6, 12); expect(plan.steps[0].diluent).toBeCloseTo(198e-6, 12);
    expect(plan.final.stock).toBeCloseTo(1e-6, 12); expect(plan.final.diluent).toBeCloseTo(99e-6, 12);
    const cInt = 0.1 / plan.factor, cFinal = (cInt * plan.final.stock) / (plan.final.stock + plan.final.diluent);
    expect(cFinal).toBeCloseTo(1e-6, 12);
  });
  it('is not needed when the transfer is pipettable', () => {
    expect(intermediatePlan(10e-6, 1000e-6, 1e-6)).toBeUndefined();
  });
});
