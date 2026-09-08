// Pure calculations. Every function here has a matching case in core/tests/vectors.

export interface DilutionInput { c1?: number; c2?: number; v1?: number; v2?: number }
export interface DilutionResult { c1: number; c2: number; v1: number; v2: number; diluent: number; factor: number; solved: keyof DilutionInput }

/** C1·V1 = C2·V2. Exactly one of the four must be undefined; it is solved. Concentrations share a unit, volumes share a unit. */
export function dilution(i: DilutionInput): DilutionResult {
  const missing = (['c1', 'c2', 'v1', 'v2'] as const).filter((k) => i[k] === undefined || Number.isNaN(i[k]));
  if (missing.length !== 1) throw new Error(missing.length === 0 ? 'Leave one field empty to solve it.' : 'Fill three fields.');
  const k = missing[0];
  let { c1, c2, v1, v2 } = i as Record<string, number>;
  switch (k) {
    case 'v1': v1 = (c2 * v2) / c1; break;
    case 'v2': v2 = (c1 * v1) / c2; break;
    case 'c1': c1 = (c2 * v2) / v1; break;
    case 'c2': c2 = (c1 * v1) / v2; break;
  }
  if (![c1, c2, v1, v2].every((x) => Number.isFinite(x) && x >= 0)) throw new Error('Check the numbers.');
  if (c2 > c1) throw new Error('Final concentration is higher than the stock.');
  return { c1, c2, v1, v2, diluent: v2 - v1, factor: c1 / c2, solved: k };
}

export interface MolarInput { mass_g?: number; molarity_M?: number; volume_L?: number; mw?: number }
/** mass = M · V · MW. Exactly one field undefined; it is solved. */
export function molar(i: MolarInput): Required<MolarInput> & { solved: keyof MolarInput } {
  const keys = ['mass_g', 'molarity_M', 'volume_L', 'mw'] as const;
  const missing = keys.filter((k) => i[k] === undefined || Number.isNaN(i[k]));
  if (missing.length !== 1) throw new Error(missing.length === 0 ? 'Leave one field empty to solve it.' : 'Fill three fields.');
  const k = missing[0];
  let { mass_g, molarity_M, volume_L, mw } = i as Record<string, number>;
  switch (k) {
    case 'mass_g': mass_g = molarity_M * volume_L * mw; break;
    case 'molarity_M': molarity_M = mass_g / (volume_L * mw); break;
    case 'volume_L': volume_L = mass_g / (molarity_M * mw); break;
    case 'mw': mw = mass_g / (molarity_M * volume_L); break;
  }
  if (![mass_g, molarity_M, volume_L, mw].every((x) => Number.isFinite(x) && x >= 0)) throw new Error('Check the numbers.');
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
  if (r >= lo && r <= hi) return { status: 'good', note: `Clean. ~${ideal} expected for ${kind}.` };
  if (r < lo) return { status: r < lo - 0.2 ? 'bad' : 'warn', note: 'Low: protein or phenol carry-over. Re-purify or accept for gels only.' };
  return { status: kind === 'RNA' ? 'warn' : 'warn', note: kind === 'RNA' ? 'High: usually fine for RNA. Check blank if > 2.2.' : 'High: RNA present in the DNA prep. Add RNase A if it matters.' };
}
export function verdict260230(r: number): Verdict {
  if (r >= 1.8 && r <= 2.3) return { status: 'good', note: '2.0–2.2 expected.' };
  if (r < 1.8) return { status: r < 1.5 ? 'bad' : 'warn', note: 'Low: guanidine salt, phenol, EDTA or carbohydrate. Extra wash or re-precipitate. qPCR and sequencing may suffer.' };
  return { status: 'warn', note: 'High: check the blank and the pedestal.' };
}
export function verdictConc(c: number): Verdict {
  if (c < 5) return { status: 'bad', note: 'Too low: ratios are meaningless below ~5 ng/µL.' };
  if (c < 20) return { status: 'warn', note: 'Low: ratios are noisy under ~20 ng/µL.' };
  if (c > 3000) return { status: 'warn', note: 'Very high: outside most pedestal ranges. Dilute and re-read.' };
  return { status: 'good', note: '' };
}
/** Volume (µL) that holds `amount_ng` at `conc` ng/µL. */
export function volumeForAmount(amount_ng: number, conc: number): number { return amount_ng / conc; }
/** Normalise a sample to `target` ng/µL in `finalVol` µL. */
export function normalize(conc: number, target: number, finalVol: number): { sample: number; water: number; ok: boolean } {
  const sample = (target * finalVol) / conc;
  return { sample, water: finalVol - sample, ok: sample <= finalVol };
}
