// Pure calculations. Every function here has a matching case in core/tests/vectors.

export interface DilutionInput { c1?: number; c2?: number; v1?: number; v2?: number }
export interface DilutionResult { c1: number; c2: number; v1: number; v2: number; diluent: number; factor: number; solved: keyof DilutionInput }

/** C1·V1 = C2·V2. Exactly one of the four must be undefined; it is solved. Concentrations share a unit, volumes share a unit. */
export function dilution(i: DilutionInput): DilutionResult {
  const missing = (['c1', 'c2', 'v1', 'v2'] as const).filter((k) => i[k] === undefined || Number.isNaN(i[k]));
  if (missing.length !== 1) throw new Error(missing.length === 0 ? 'All four are filled. Clear the one to solve.' : 'Fill three fields.');
  const k = missing[0];
  let { c1, c2, v1, v2 } = i as Record<string, number>;
  switch (k) {
    case 'v1': v1 = (c2 * v2) / c1; break;
    case 'v2': v2 = (c1 * v1) / c2; break;
    case 'c1': c1 = (c2 * v2) / v1; break;
    case 'c2': c2 = (c1 * v1) / v2; break;
  }
  if (![c1, c2, v1, v2].every((x) => Number.isFinite(x) && x >= 0)) throw new Error('Negative or invalid value.');
  if (c2 > c1) throw new Error('Final concentration is higher than the stock.');
  return { c1, c2, v1, v2, diluent: v2 - v1, factor: c1 / c2, solved: k };
}

/** When the stock transfer is below what a pipette can do, pre-dilute in steps of at most 1:100. All volumes in litres. */
export interface StepPlan { factor: number; steps: { factor: number; stock: number; diluent: number }[]; final: { stock: number; diluent: number } }
export function intermediatePlan(v1: number, v2: number, min: number): StepPlan | undefined {
  if (!(v1 > 0) || !(min > 0) || v1 >= min) return undefined;
  let D = 1; while (v1 * D < min && D < 1e9) D *= 10;
  const transfer = v1 * D;
  if (transfer >= v2) return undefined;
  const a = Math.max(min, 2e-6);
  const steps: StepPlan['steps'] = []; let rem = D;
  while (rem > 1) { const f = Math.min(rem, 100); rem /= f; steps.push({ factor: f, stock: a, diluent: a * (f - 1) }); }
  return { factor: D, steps, final: { stock: transfer, diluent: v2 - transfer } };
}

export interface MolarInput { mass_g?: number; molarity_M?: number; volume_L?: number; mw?: number }
/** mass = M · V · MW. Exactly one field undefined; it is solved. */
export function molar(i: MolarInput): Required<MolarInput> & { solved: keyof MolarInput } {
  const keys = ['mass_g', 'molarity_M', 'volume_L', 'mw'] as const;
  const missing = keys.filter((k) => i[k] === undefined || Number.isNaN(i[k]));
  if (missing.length !== 1) throw new Error(missing.length === 0 ? 'All four are filled. Clear the one to solve.' : 'Fill three fields.');
  const k = missing[0];
  let { mass_g, molarity_M, volume_L, mw } = i as Record<string, number>;
  switch (k) {
    case 'mass_g': mass_g = molarity_M * volume_L * mw; break;
    case 'molarity_M': molarity_M = mass_g / (volume_L * mw); break;
    case 'volume_L': volume_L = mass_g / (molarity_M * mw); break;
    case 'mw': mw = mass_g / (molarity_M * volume_L); break;
  }
  if (![mass_g, molarity_M, volume_L, mw].every((x) => Number.isFinite(x) && x >= 0)) throw new Error('Negative or invalid value.');
  return { mass_g, molarity_M, volume_L, mw, solved: k };
}

/** RCF (×g) = 1.118e-5 · r(cm) · rpm² */
export function rcfFromRpm(rpm: number, r_cm: number): number { return 1.118e-5 * r_cm * rpm * rpm; }
export function rpmFromRcf(rcf: number, r_cm: number): number { return Math.sqrt(rcf / (1.118e-5 * r_cm)); }

const AVOGADRO = 6.02214076e23;
/** Average mass per nucleotide (pair). */
export const NA_MASS = { dsDNA: 660, ssDNA: 330, RNA: 340 } as const;
export type NAKind = keyof typeof NA_MASS;

export function pmolFromNg(ng: number, length: number, kind: NAKind): number { return (ng * 1e3) / (length * NA_MASS[kind]); }
export function ngFromPmol(pmol: number, length: number, kind: NAKind): number { return (pmol * length * NA_MASS[kind]) / 1e3; }
export function copiesFromNg(ng: number, length: number, kind: NAKind): number { return (ng * 1e-9 / (length * NA_MASS[kind])) * AVOGADRO; }
export function ngFromCopies(copies: number, length: number, kind: NAKind): number { return (copies / AVOGADRO) * length * NA_MASS[kind] * 1e9; }

/** µg/mL per absorbance unit at 260 nm, 1 cm path. */
export const A260_FACTOR = { dsDNA: 50, ssDNA: 33, RNA: 40 } as const;
export function concFromA260(a260: number, kind: keyof typeof A260_FACTOR, dilutionFactor = 1): number { return a260 * A260_FACTOR[kind] * dilutionFactor; }

/** Cells to seed: density (cells/cm²) × area (cm²). Volume of suspension = cells / (cells per mL). */
export function seeding(densityPerCm2: number, areaCm2: number, suspensionCellsPerMl?: number) {
  const cells = densityPerCm2 * areaCm2;
  return { cells, volume_mL: suspensionCellsPerMl ? cells / suspensionCellsPerMl : undefined };
}

/** Master mix: per-well amount × wells × (1 + extra). */
export function masterMix(perWell: number, wells: number, extra = 0.1): number { return perWell * wells * (1 + extra); }

// ---- cell counting & seeding ----
/** Hemocytometer: cells/mL = (cells counted / large squares counted) × dilution factor × 10⁴. */
export function hemocytometer(cellsCounted: number, squares: number, dilution = 1): number { return (cellsCounted / squares) * dilution * 1e4; }

export interface SeedPlan { cellsPerWell: number; suspPerWell_mL: number; mediumPerWell_mL: number; wells: number; totalCells: number; totalSusp_mL: number; totalMedium_mL: number; extra: number; enough: boolean; available?: number }
/** From a suspension concentration to a dispensing plan. Volumes include `extra` (default 10 %). */
export function seedPlan(o: { cellsPerMl: number; cellsPerWell: number; wells: number; wellVolume_mL: number; available_mL?: number; extra?: number }): SeedPlan {
  const extra = o.extra ?? 0.1, f = 1 + extra;
  const suspPerWell = o.cellsPerWell / o.cellsPerMl;
  const mediumPerWell = Math.max(0, o.wellVolume_mL - suspPerWell);
  const available = o.available_mL !== undefined ? o.available_mL * o.cellsPerMl : undefined;
  return {
    cellsPerWell: o.cellsPerWell, suspPerWell_mL: suspPerWell, mediumPerWell_mL: mediumPerWell, wells: o.wells,
    totalCells: o.cellsPerWell * o.wells, totalSusp_mL: suspPerWell * o.wells * f, totalMedium_mL: mediumPerWell * o.wells * f, extra,
    enough: available === undefined ? true : available >= o.cellsPerWell * o.wells, available,
  };
}

// ---- nucleic acid QC (NanoDrop) ----
export type NAType = 'dsDNA' | 'RNA' | 'ssDNA';
export interface Verdict { status: 'good' | 'warn' | 'bad'; note: string }
export function verdict260280(r: number, kind: NAType): Verdict {
  const [lo, hi, ideal] = kind === 'RNA' ? [1.9, 2.15, 2.0] : [1.75, 2.0, 1.8];
  if (r >= lo && r <= hi) return { status: 'good', note: `Within range (~${ideal} for ${kind}).` };
  if (r < lo) return { status: r < lo - 0.2 ? 'bad' : 'warn', note: 'Low: possibly protein or phenol. Check the spectrum near 270 nm and the blank.' };
  return { status: kind === 'RNA' ? 'warn' : 'warn', note: kind === 'RNA' ? (r > 2.2 ? 'High: possibly a blank mismatch.' : 'Slightly high: common for RNA.') : 'High: possibly RNA in the prep.' };
}
export function verdict260230(r: number): Verdict {
  if (r >= 1.8 && r <= 2.3) return { status: 'good', note: 'Within range (1.8–2.2).' };
  if (r < 1.8) return { status: r < 1.5 ? 'bad' : 'warn', note: 'Low: possibly salt, phenol or a dilute sample. Check the concentration and the blank first.' };
  return { status: 'warn', note: 'High: possibly a blank mismatch.' };
}
export function verdictConc(c: number): Verdict {
  if (c < 5) return { status: 'bad', note: 'Below 5 ng/µL: ratios not reliable.' };
  if (c < 20) return { status: 'warn', note: 'Below 20 ng/µL: ratios are noisy.' };
  if (c > 3000) return { status: 'warn', note: 'Above the pedestal range. Dilute and re-read.' };
  return { status: 'good', note: '' };
}
/** Volume (µL) that holds `amount_ng` at `conc` ng/µL. */
export function volumeForAmount(amount_ng: number, conc: number): number { return amount_ng / conc; }
/** Normalise a sample to `target` ng/µL in `finalVol` µL. */
export function normalize(conc: number, target: number, finalVol: number): { sample: number; water: number; ok: boolean } {
  const sample = (target * finalVol) / conc;
  return { sample, water: finalVol - sample, ok: sample <= finalVol };
}

// ---- standard curves (BCA) ----
export interface Fit { kind: 'quadratic' | 'linear'; a: number; b: number; c: number; r2: number; n: number }
/** Least-squares fit y = a·x² + b·x + c (quadratic when ≥ 4 points, else linear with a = 0). */
export function fitCurve(points: { x: number; y: number }[]): Fit | undefined {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 2) return undefined;
  const quad = pts.length >= 4;
  // normal equations
  const S = (fx: (p: { x: number; y: number }) => number) => pts.reduce((s, p) => s + fx(p), 0);
  let a = 0, b: number, c: number;
  if (quad) {
    const m = [
      [S((p) => p.x ** 4), S((p) => p.x ** 3), S((p) => p.x ** 2), S((p) => p.x ** 2 * p.y)],
      [S((p) => p.x ** 3), S((p) => p.x ** 2), S((p) => p.x), S((p) => p.x * p.y)],
      [S((p) => p.x ** 2), S((p) => p.x), pts.length, S((p) => p.y)],
    ];
    for (let i = 0; i < 3; i++) {
      let piv = i; for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
      [m[i], m[piv]] = [m[piv], m[i]];
      if (Math.abs(m[i][i]) < 1e-12) return undefined;
      for (let r = 0; r < 3; r++) if (r !== i) { const f = m[r][i] / m[i][i]; for (let k = i; k < 4; k++) m[r][k] -= f * m[i][k]; }
    }
    a = m[0][3] / m[0][0]; b = m[1][3] / m[1][1]; c = m[2][3] / m[2][2];
  } else {
    const n = pts.length, sx = S((p) => p.x), sy = S((p) => p.y), sxx = S((p) => p.x * p.x), sxy = S((p) => p.x * p.y);
    const d = n * sxx - sx * sx; if (Math.abs(d) < 1e-12) return undefined;
    b = (n * sxy - sx * sy) / d; c = (sy - b * sx) / n;
  }
  const ybar = S((p) => p.y) / pts.length;
  const ssTot = S((p) => (p.y - ybar) ** 2), ssRes = S((p) => (p.y - (a * p.x * p.x + b * p.x + c)) ** 2);
  return { kind: quad ? 'quadratic' : 'linear', a, b, c, r2: ssTot > 0 ? 1 - ssRes / ssTot : 1, n: pts.length };
}
/** Concentration for an absorbance on the fitted curve (the root on the rising branch). */
export function curveInvert(f: Fit, y: number): number | undefined {
  if (f.kind === 'linear' || Math.abs(f.a) < 1e-12) return Math.abs(f.b) < 1e-12 ? undefined : (y - f.c) / f.b;
  const disc = f.b * f.b - 4 * f.a * (f.c - y);
  if (disc < 0) return undefined;
  const r1 = (-f.b + Math.sqrt(disc)) / (2 * f.a), r2 = (-f.b - Math.sqrt(disc)) / (2 * f.a);
  const cands = [r1, r2].filter((x) => x >= -1e-9);
  if (!cands.length) return undefined;
  // pick the root where the curve is rising (2ax + b > 0)
  const rising = cands.filter((x) => 2 * f.a * x + f.b > 0);
  return (rising.length ? rising : cands).sort((p, q) => p - q)[0];
}
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
