import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dilution, molar, rcfFromRpm, rpmFromRcf } from '../src/lib/calc';
import { parseDuration, fmt } from '../src/lib/fmt';
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
