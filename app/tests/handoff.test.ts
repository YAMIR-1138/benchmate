import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { b41, unb41, packWells, unpackWells, encode, decode } from '../src/lib/handoff';
import { qpcrLayout } from '../src/lib/qpcrLayout';

describe('base-41 codes', () => {
  it('round-trips arbitrary bytes, odd and even lengths', () => {
    for (const len of [0, 1, 2, 3, 57, 250, 1001]) {
      const b = Uint8Array.from({ length: len }, (_, i) => (i * 97 + len * 13) % 256);
      const s = b41(b); expect(s).toMatch(/^[0-9A-Z$*+\-.]*$/); expect([...unb41(s)]).toEqual([...b]);
    }
    expect([...unb41(b41(Uint8Array.from([255, 255, 0, 0, 255]))) ]).toEqual([255, 255, 0, 0, 255]);
  });
  it('rejects damaged codes instead of importing garbage', () => { expect(() => unb41('ab')).toThrow(); expect(() => unb41('...')).toThrow(); });
});

describe('plate wells as runs', () => {
  it('a regular qPCR plate packs to one run per row and unpacks identically', () => {
    const wells = qpcrLayout(13, 3, 3, 384);
    const r = packWells(wells, 384);
    expect(r.split('_').length).toBe(9);
    expect(unpackWells(r, 384)).toEqual(wells);
  });
  it('irregular plates with ticks, genes only and samples only survive', () => {
    const wells = { A1: { s: 0, g: 1, d: true }, A2: { s: 0, g: 1 }, A3: { s: 2 }, B5: { g: 0 }, B6: { g: 0, d: true }, C1: { d: true }, H12: { s: 5, g: 2 }, A4: { s: 1, g: 1 } } as Record<string, { s?: number; g?: number; d?: boolean }>;
    expect(unpackWells(packWells(wells, 96), 96)).toEqual(wells);
    expect(unpackWells(packWells({}, 96), 96)).toEqual({});
  });
});

describe('hand-off codes', () => {
  const plate = { name: 'qPCR', fmt: 384, kind: 'qpcr', samples: ['A', 'B'], genes: ['hprt'], wells: { A1: { s: 0, g: 0, d: true }, A2: { s: 1, g: 0 } } };
  it('encode → decode gives the same plate back, as a Q code', async () => {
    const code = await encode({ t: 'plate', v: 1, plate });
    expect(code[0]).toBe('Q');
    const p = await decode(code);
    expect(p).toEqual({ t: 'plate', v: 1, plate });
  });
  it('cDNA sheets round-trip too', async () => {
    const cdna = { ng: '1000', rows: [{ name: 'Ev 1', conc: '300.559', on: true, w: true }] };
    expect(await decode(await encode({ t: 'cdna', v: 1, cdna }))).toEqual({ t: 'cdna', v: 1, cdna });
  });
  it('still reads the older z-codes printed before this change', async () => {
    const old = { t: 'run', v: 1, id: 'lipofectamine-3000', run: { format: '12-well' } };
    const z = zlib.deflateRawSync(Buffer.from(JSON.stringify(old)));
    const code = 'z' + z.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await decode(code)).toEqual(old);
  });
});
