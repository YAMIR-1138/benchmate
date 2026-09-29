import { describe, it, expect } from 'vitest';
import { cdnaSample, rtMaster } from '../src/lib/calc';
import { parseNanodropCsv } from '../src/lib/nanodropCsv';

const CSV = `"Sample Number","Sample Name","Concentration","Units","Factor","A260","Pathlength (mm)","260/280","260/280 Alert","260/230","260/230 Alert","Date/Time","220","221",
"0","BLANK","","","","","","","","","","2026-09-28 13:45","","",
"1","Ev 1","300.559","","40","7.514","10","2.100","OK","2.263","OK","2026-09-28 13:46","3.89131","3.71363",
"10","Wt ap 2","805.519","","40","20.138","10","2.110","OK","2.235","OK","2026-09-28 13:54","9.80336","9.54390",
"11"," Mut ap 1","485.669","","40","12.142","10","2.098","OK","2.232","OK","2026-09-28 13:55","6.23660","5.96408",
`;

describe('NanoDrop CSV', () => {
  it('reads name, concentration and ratios, skips the blank, trims names', () => {
    const s = parseNanodropCsv(CSV);
    expect(s.map((x) => x.name)).toEqual(['Ev 1', 'Wt ap 2', 'Mut ap 1']);
    expect(s[0]).toEqual({ name: 'Ev 1', conc: 300.559, r280: 2.1, r230: 2.263 });
  });
  it('accepts plain "name, conc" lines', () => {
    expect(parseNanodropCsv('A, 120\nB\t55.5')).toEqual([{ name: 'A', conc: 120 }, { name: 'B', conc: 55.5 }]);
  });
});

describe('cDNA volumes', () => {
  it('1000 ng in 15 µL, two decimals that add up', () => {
    expect(cdnaSample(300.559, 1000, 15)).toMatchObject({ rna: 3.33, water: 11.67, fits: true });
    expect(cdnaSample(805.519, 1000, 15)).toMatchObject({ rna: 1.24, water: 13.76, fits: true });
    const s = cdnaSample(485.669, 1000, 15)!; expect(s.rna + s.water).toBeCloseTo(15, 10);
  });
  it('flags a sample too dilute for the target', () => {
    expect(cdnaSample(50, 1000, 15)).toMatchObject({ fits: false, maxNg: 750 });
  });
  it('master mix: 12 samples + 10 % = 14 reactions of 4 + 1 µL', () => {
    expect(rtMaster(12, 10, 4, 1)).toEqual({ rx: 14, mix: 56, rt: 14, total: 70 });
    expect(rtMaster(10, 10, 4, 1)).toMatchObject({ rx: 11 });
    expect(rtMaster(12, 10, 4, 1, 13)).toMatchObject({ rx: 13, mix: 52 });
  });
});

import { cdnaDilution, pickFormat, qpcrLayout, qpcrRows } from '../src/lib/qpcrLayout';
describe('qPCR plate from cDNA samples', () => {
  it('12 samples + NTC, 2 genes, duplicates: fits a 96 plate in 8 rows, 13 split 7 + 6', () => {
    expect(qpcrRows(13, 2, 2, 96)).toBe(8);
    expect(pickFormat(13, 2, 2)).toBe(96);
    const w = qpcrLayout(13, 2, 2, 96);
    expect(Object.keys(w).length).toBe(13 * 2 * 2);
    expect(w.A1).toEqual({ s: 0, g: 0 }); expect(w.B1).toEqual({ s: 0, g: 0 }); // replicate below
    expect(w.A7).toEqual({ s: 6, g: 0 }); expect(w.A8).toBeUndefined();         // 7 in the first group
    expect(w.C1).toEqual({ s: 7, g: 0 }); expect(w.C6).toEqual({ s: 12, g: 0 }); // 6 in the second
    expect(w.E1).toEqual({ s: 0, g: 1 }); expect(w.H6).toEqual({ s: 12, g: 1 }); // second gene fills E–H
  });
  it('3 genes do not fit 96, so 384', () => {
    expect(pickFormat(13, 3, 2)).toBe(384);
    expect(Object.keys(qpcrLayout(13, 3, 2, 384)).length).toBe(78);
  });
  it('1000 ng in 20 µL to 10 ng/µL is 1:5, 80 µL water', () => {
    expect(cdnaDilution(1000, 20, 10)).toEqual({ conc: 50, factor: 5, water: 80 });
  });
});
