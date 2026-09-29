// Reads the NanoDrop "export" CSV (one row per measurement, spectrum columns after the numbers).
export interface NdSample { name: string; conc: number; r280?: number; r230?: number }

function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const d = (first.match(/\t/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? '\t' : (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === d) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const num = (s?: string) => { const v = parseFloat((s ?? '').replace(',', '.')); return Number.isFinite(v) ? v : undefined; };

/** Samples with a name and a positive concentration; blanks are skipped. Falls back to "name, conc" lines. */
export function parseNanodropCsv(text: string): NdSample[] {
  const rows = parseCsv(text.trim());
  const h = rows.findIndex((r) => r.some((c) => /concentration/i.test(c)));
  const out: NdSample[] = [];
  if (h >= 0) {
    const head = rows[h].map((c) => c.trim().toLowerCase());
    const col = (re: RegExp) => head.findIndex((c) => re.test(c));
    const iName = col(/^sample name$/) >= 0 ? col(/^sample name$/) : col(/sample/), iConc = col(/^conc/), i280 = col(/^260\/280$/), i230 = col(/^260\/230$/);
    for (const r of rows.slice(h + 1)) {
      const name = (r[iName] ?? '').trim(), conc = num(r[iConc]);
      if (!name || /^blank$/i.test(name) || !(conc && conc > 0)) continue;
      out.push({ name, conc, r280: num(r[i280]), r230: num(r[i230]) });
    }
    return out;
  }
  for (const line of text.split(/\r?\n/)) { const cells = line.split(/[\t,;]/).map((c) => c.trim().replace(/^"|"$/g, '')).filter(Boolean); if (cells.length < 2) continue; const conc = num(cells[cells.length - 1]); if (conc && conc > 0) out.push({ name: cells.slice(0, -1).join(' '), conc }); }
  return out;
}
