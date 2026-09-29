// Plate setup for QuantStudio Design & Analysis (tested against a QuantStudio 5 / software 1.5.2 run):
// the same "[Sample Setup]" table the software writes with Export, which its Import Plate Setup reads back.
export interface QsPlate { name: string; fmt: number; samples: string[]; genes: string[]; wells: Record<string, { s?: number; g?: number }> }

const COLS = ['Well', 'Well Position', 'Sample Name', 'Sample Color', 'Biogroup Name', 'Biogroup Color', 'Target Name', 'Target Color', 'Task', 'Reporter', 'Quencher', 'Quantity', 'Comments'];
// distinct, readable colours for the software's plate view (it requires one per sample and target)
const PALETTE: [number, number, number][] = [[229, 118, 31], [31, 143, 146], [224, 169, 46], [140, 155, 59], [194, 91, 138], [91, 127, 194], [138, 91, 194], [176, 122, 74], [74, 163, 176], [210, 193, 90], [127, 143, 140], [224, 69, 58], [59, 91, 214], [138, 43, 181], [31, 138, 76], [217, 0, 143]];
const rgb = (i: number) => { const [r, g, b] = PALETTE[i % PALETTE.length]; return `"RGB(${r},${g},${b})"`; };
export const isNtc = (name: string) => /^\s*(ntc|no[\s-]?template|h2o|water|nfw)\s*$/i.test(name);

export function quantStudioSetup(p: QsPlate): { text: string; wells: number; skipped: number } {
  const dims = p.fmt === 384 ? { rows: 16, cols: 24 } : { rows: 8, cols: 12 };
  const block = p.fmt === 384 ? '384-Well Block' : '96-Well Block (0.2mL)';
  const clean = (s: string) => s.replace(/[\t\r\n"]/g, ' ').trim();
  const out = [
    `* Block Type = ${block}`,
    '* Chemistry = SYBR_GREEN',
    `* Experiment File Name = ${clean(p.name)}`,
    '* Experiment Type = Comparative Cт (ΔΔCт)',
    '* Instrument Type = QuantStudio™ 5 System',
    '* Passive Reference = ROX',
    '',
    '[Sample Setup]',
    COLS.join('\t'),
  ];
  let n = 0, skipped = 0;
  for (let r = 0; r < dims.rows; r++) for (let c = 0; c < dims.cols; c++) {
    const pos = `${String.fromCharCode(65 + r)}${c + 1}`, w = p.wells[pos];
    if (!w || (w.s === undefined && w.g === undefined)) continue;
    if (w.g === undefined) { skipped++; continue; } // the software needs a target for every used well
    const sName = w.s !== undefined ? clean(p.samples[w.s] ?? '') : '', ntc = isNtc(sName);
    out.push([r * dims.cols + c + 1, pos, ntc ? '' : sName, ntc || w.s === undefined ? '' : rgb(w.s), '', '', clean(p.genes[w.g] ?? ''), rgb(w.g + 7), ntc ? 'NTC' : 'UNKNOWN', 'SYBR', 'None', '', ''].join('\t'));
    n++;
  }
  return { text: out.join('\r\n') + '\r\n', wells: n, skipped };
}
