// qPCR results: read a QuantStudio results export (or pasted "sample, gene, Ct" lines) and work out
// relative expression by the 2^-ΔΔCt method (Livak & Schmittgen 2001).
export interface CtWell { pos?: string; sample: string; target: string; ct: number | null; ntc?: boolean }

const norm = (s: string) => s.replace(/т/g, 't').replace(/["']/g, '').trim().toLowerCase(); // QuantStudio writes "Cт" with a Cyrillic т
const SAMPLE = ['sample name', 'sample'], TARGET = ['target name', 'target', 'gene', 'detector', 'detector name'], CT = ['ct', 'cq', 'cp'];
function split(line: string, d: string): string[] {
  if (!line.includes('"')) return line.split(d);
  const out: string[] = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out;
}
const num = (s: string): number | null => { const n = Number(s.replace(',', '.').trim()); return s.trim() !== '' && Number.isFinite(n) ? n : null; };

export function parseResults(text: string): CtWell[] {
  const lines = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const d = lines[i].includes('\t') ? '\t' : lines[i].includes(';') ? ';' : ',';
    const h = split(lines[i], d).map(norm);
    const si = h.findIndex((c) => SAMPLE.includes(c)), ti = h.findIndex((c) => TARGET.includes(c)), ci = h.findIndex((c) => CT.includes(c));
    if (si < 0 || ti < 0 || ci < 0) continue;
    const pi = h.indexOf('well position'), oi = h.indexOf('omit'), ki = h.indexOf('task');
    const out: CtWell[] = [];
    for (const line of lines.slice(i + 1)) {
      if (!line.trim()) { if (out.length) break; continue; }
      const c = split(line, d).map((x) => x.replace(/^"|"$/g, '').trim());
      const target = c[ti] ?? ''; if (!target) continue;
      if (oi >= 0 && /^(true|yes|1)$/i.test(c[oi] ?? '')) continue;
      const ntc = (ki >= 0 && /ntc/i.test(c[ki] ?? '')) || /^(ntc|no[\s-]?template|h2o|water|nfw)$/i.test(c[si] ?? '');
      out.push({ pos: pi >= 0 ? c[pi] : undefined, sample: c[si] || (ntc ? 'NTC' : ''), target, ct: num(c[ci] ?? ''), ntc });
    }
    return out.filter((w) => w.sample);
  }
  // plain lines: sample, gene, Ct
  const out: CtWell[] = [];
  for (const line of lines) {
    const c = line.split(/\t|;|,(?=\s*\S)/).map((x) => x.trim()); if (c.length < 3 || !c[0] || !c[1]) continue;
    const ct = num(c[2]); if (ct === null && !/undet|n\/?a|^-+$/i.test(c[2])) continue;
    out.push({ sample: c[0], target: c[1], ct, ntc: /^(ntc|no[\s-]?template|h2o|water|nfw)$/i.test(c[0]) });
  }
  return out;
}

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
export const uniq = (a: string[]) => [...new Set(a)];

export interface Cell { sample: string; target: string; n: number; undet: number; ct?: number; sd: number; dct?: number; ddct?: number; fold?: number; lo?: number; hi?: number }
export interface DdctOut { samples: string[]; targets: string[]; cells: Cell[]; warnings: string[] }

export function ddct(wells: CtWell[], refs: string[], control: string): DdctOut {
  const real = wells.filter((w) => !w.ntc);
  const samples = uniq(real.map((w) => w.sample)), all = uniq(real.map((w) => w.target));
  const warnings: string[] = [];
  const stat = new Map<string, { n: number; undet: number; ct?: number; sd: number }>();
  for (const s of samples) for (const t of all) {
    const ws = real.filter((w) => w.sample === s && w.target === t); if (!ws.length) continue;
    const cts = ws.filter((w) => w.ct !== null).map((w) => w.ct!);
    stat.set(`${s}\n${t}`, { n: cts.length, undet: ws.length - cts.length, ct: cts.length ? mean(cts) : undefined, sd: sd(cts) });
  }
  const get = (s: string, t: string) => stat.get(`${s}\n${t}`);
  const ref = (s: string) => {
    const r = refs.map((t) => get(s, t)); if (!refs.length || r.some((x) => x?.ct === undefined)) return undefined;
    return { ct: mean(r.map((x) => x!.ct!)), sd: Math.sqrt(r.reduce((a, x) => a + x!.sd ** 2, 0)) / r.length };
  };
  const targets = all.filter((t) => !refs.includes(t));
  const cells: Cell[] = [];
  for (const t of targets) {
    const cr = ref(control), cs = get(control, t);
    const base = cr && cs?.ct !== undefined ? cs.ct - cr.ct : undefined;
    for (const s of samples) {
      const st = get(s, t); if (!st) continue;
      const c: Cell = { sample: s, target: t, ...st };
      const r = ref(s);
      if (st.ct !== undefined && r) {
        c.dct = st.ct - r.ct;
        if (base !== undefined) {
          const e = Math.sqrt(st.sd ** 2 + r.sd ** 2);
          c.ddct = c.dct - base; c.fold = 2 ** -c.ddct; c.lo = 2 ** -(c.ddct + e); c.hi = 2 ** -(c.ddct - e);
        }
      }
      cells.push(c);
    }
  }
  for (const [k, v] of stat) {
    const [s, t] = k.split('\n');
    if (v.sd > 0.3) warnings.push(`${s} · ${t}: replicates spread (SD ${v.sd.toFixed(2)} Ct)`);
    if (v.undet) warnings.push(`${s} · ${t}: ${v.undet} undetermined well${v.undet > 1 ? 's' : ''}${v.n ? ', left out' : ''}`);
  }
  for (const w of wells.filter((x) => x.ntc && x.ct !== null && x.ct < 35)) warnings.push(`NTC · ${w.target}${w.pos ? ` (${w.pos})` : ''}: amplified at Ct ${w.ct!.toFixed(1)}`);
  if (!refs.length) warnings.push('Pick a reference gene.');
  else if (samples.length && !ref(control)) warnings.push(`No reference Ct for the control sample "${control}".`);
  return { samples, targets, cells, warnings };
}

export const guessRefs = (targets: string[]) => targets.filter((t) => /gapdh|actb|actin|^18s|hprt|tbp|b2m|ppia|rplp0|36b4|rpl\d|tubb|ubc|hmbs|gusb/i.test(t)).slice(0, 1);
export const guessControl = (samples: string[]) => samples.find((s) => /ctrl|control|^nt\b|^wt\b|mock|vehicle|dmso|untreated|^scr|sictrl|^ev\b|empty/i.test(s)) ?? samples[0] ?? '';

export function ddctText(o: DdctOut, refs: string[], control: string): string {
  const f = (n?: number, d = 2) => (n === undefined ? '' : n.toFixed(d));
  const rows = o.cells.map((c) => [c.target, c.sample, c.n, f(c.ct), f(c.sd), f(c.dct), f(c.ddct), f(c.fold, 3), f(c.lo, 3), f(c.hi, 3)].join('\t'));
  return [`Relative expression, 2^-ΔΔCt · reference: ${refs.join(' + ')} · control: ${control}`, ['Target', 'Sample', 'n', 'Ct mean', 'Ct SD', 'ΔCt', 'ΔΔCt', 'Fold', 'Fold low', 'Fold high'].join('\t'), ...rows].join('\n');
}
