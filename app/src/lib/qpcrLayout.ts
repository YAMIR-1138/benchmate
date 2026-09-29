// qPCR plate from a sample list: one block per gene, technical replicates in adjacent rows, samples across.
// If there are more samples than columns they are split evenly over row groups (13 → 7 + 6, not 12 + 1).
export type QFmt = 96 | 384;
const GRID: Record<QFmt, { rows: number; cols: number }> = { 96: { rows: 8, cols: 12 }, 384: { rows: 16, cols: 24 } };
const wid = (r: number, c: number) => `${String.fromCharCode(65 + r)}${c + 1}`;

export function qpcrRows(nSamples: number, nGenes: number, reps: number, fmt: QFmt): number {
  const groups = Math.ceil(nSamples / GRID[fmt].cols);
  return nGenes * reps * groups;
}
/** Smallest plate that fits, or undefined when even 384 is too small. */
export function pickFormat(nSamples: number, nGenes: number, reps: number): QFmt | undefined {
  return ([96, 384] as QFmt[]).find((f) => qpcrRows(nSamples, nGenes, reps, f) <= GRID[f].rows);
}
export function qpcrLayout(nSamples: number, nGenes: number, reps: number, fmt: QFmt): Record<string, { s: number; g: number }> {
  const { cols } = GRID[fmt]; const groups = Math.max(1, Math.ceil(nSamples / cols)); const per = Math.ceil(nSamples / groups);
  const wells: Record<string, { s: number; g: number }> = {}; let row = 0;
  for (let g = 0; g < nGenes; g++)
    for (let k = 0; k < groups; k++)
      for (let r = 0; r < reps; r++, row++)
        for (let i = k * per; i < Math.min(nSamples, (k + 1) * per); i++) wells[wid(row, i - k * per)] = { s: i, g };
  return wells;
}
/** cDNA made from `ng` RNA in `tubeUl` µL, diluted to `target` ng/µL for qPCR: the factor and the water to add per tube. */
export function cdnaDilution(ng: number, tubeUl: number, target: number) {
  const conc = ng / tubeUl; if (!(conc > 0) || !(target > 0)) return undefined;
  const factor = conc / target;
  return { conc, factor, water: factor > 1 ? Math.round(tubeUl * (factor - 1) * 100) / 100 : 0 };
}
