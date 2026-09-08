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
