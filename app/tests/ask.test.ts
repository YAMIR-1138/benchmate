import { describe, expect, it } from 'vitest';
import { arithmetic, ask } from '../src/lib/ask';
import { ddct, guessControl, guessRefs, parseResults } from '../src/lib/ddct';

describe('ask bar', () => {
  it('does arithmetic without eval', () => {
    expect(arithmetic('2+3*4')).toBe(14);
    expect(arithmetic('(2+3)*4')).toBe(20);
    expect(arithmetic('2^3^2')).toBe(512);
    expect(arithmetic('alert(1)')).toBeUndefined();
    expect(ask('12 * 1.1')?.value).toBe('13.2');
  });
  it('ratio dilutions', () => {
    const a = ask('1:10 in 500 µL')!; expect(a.value).toBe('50 µL stock'); expect((a as any).detail).toBe('+ 450 µL diluent');
    expect(ask('1/1000 20 ml')?.value).toBe('20 µL stock');
  });
  it('stock to working', () => {
    expect(ask('10x to 1x 50 ml')?.value).toBe('5 mL stock');
    expect(ask('5 mM from 1 M 10 mL')?.value).toBe('50 µL stock');
    expect(ask('1 m to 5 mm in 10 ml')?.value).toBe('50 µL stock');
    expect(ask('100 ng/ul to 10 ng/ul 200 ul')?.value).toBe('20 µL stock');
    expect(ask('1 mM to 1 M 10 mL')?.value).toMatch(/weaker/);
  });
  it('conversions', () => {
    expect(ask('250 ul in ml')?.value).toBe('0.25 mL');
    expect(ask('37 C to F')?.value).toBe('98.6 °F');
    expect(ask('0.5 mg to ug')?.value).toBe('500 µg');
    expect(ask('5 mm to um')?.value).toBe('5000 µm');
    expect(ask('5 mm to cm')?.value).toBe('0.5 cm');
  });
  it('timers', () => {
    const t = ask('5 min spin') as any; expect(t.kind).toBe('timer'); expect(t.ms).toBe(300000); expect(t.label).toBe('spin');
    expect((ask('timer 90s') as any).ms).toBe(90000);
    expect((ask('t 15 block') as any).ms).toBe(900000);
    expect((ask('1h30m') as any).ms).toBe(5400000);
    expect(ask('dilution')).toBeUndefined();
  });
});

describe('ΔΔCt', () => {
  const qs = ['* Block Type = 384-Well Block', '', '[Results]',
    'Well\tWell Position\tOmit\tSample Name\tTarget Name\tTask\tReporter\tQuencher\tCT\tCt Mean',
    '1\tA1\tfalse\tctrl\tGAPDH\tUNKNOWN\tSYBR\tNone\t18.0\t18',
    '2\tA2\tfalse\tctrl\tGAPDH\tUNKNOWN\tSYBR\tNone\t18.2\t18',
    '3\tA3\tfalse\tctrl\tIL6\tUNKNOWN\tSYBR\tNone\t25.1\t25',
    '4\tA4\tfalse\tctrl\tIL6\tUNKNOWN\tSYBR\tNone\t25.1\t25',
    '5\tA5\tfalse\tLPS\tGAPDH\tUNKNOWN\tSYBR\tNone\t18.1\t18',
    '6\tA6\tfalse\tLPS\tGAPDH\tUNKNOWN\tSYBR\tNone\t18.1\t18',
    '7\tA7\tfalse\tLPS\tIL6\tUNKNOWN\tSYBR\tNone\t22.1\t22',
    '8\tA8\tfalse\tLPS\tIL6\tUNKNOWN\tSYBR\tNone\tUndetermined\t22',
    '9\tA9\ttrue\tLPS\tIL6\tUNKNOWN\tSYBR\tNone\t30\t22',
    '10\tA10\tfalse\t\tIL6\tNTC\tSYBR\tNone\t31.5\t',
    '', 'Analysis Type = Singleplex'].join('\r\n');
  it('reads a QuantStudio results export', () => {
    const w = parseResults(qs);
    expect(w.length).toBe(9); // the omitted well is dropped
    expect(w[7].ct).toBeNull();
    expect(w[8].ntc).toBe(true);
  });
  it('reads Design & Analysis csv and plain lines', () => {
    expect(parseResults('"Well","Well Position","Sample","Target","Cq"\n1,"A1","a, b","ACTB",20.5\n').at(0)).toMatchObject({ sample: 'a, b', target: 'ACTB', ct: 20.5 });
    expect(parseResults('ctrl\tGAPDH\t18,5\nctrl\tIL6\tUndetermined').length).toBe(2);
  });
  it('fold change', () => {
    const w = parseResults(qs), o = ddct(w, ['GAPDH'], 'ctrl');
    expect(o.targets).toEqual(['IL6']);
    const c = o.cells.find((x) => x.sample === 'ctrl')!, l = o.cells.find((x) => x.sample === 'LPS')!;
    expect(c.fold).toBeCloseTo(1); expect(l.ddct).toBeCloseTo(-3); expect(l.fold).toBeCloseTo(8);
    expect(l.lo!).toBeLessThanOrEqual(l.fold!); expect(l.undet).toBe(1);
    expect(o.warnings.some((x) => /NTC/.test(x))).toBe(true);
    expect(o.warnings.some((x) => /undetermined/.test(x))).toBe(true);
  });
  it('guesses', () => { expect(guessRefs(['IL6', 'Gapdh'])).toEqual(['Gapdh']); expect(guessControl(['LPS', 'siCtrl'])).toBe('siCtrl'); });
});
