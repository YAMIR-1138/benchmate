// Unit tables. Values are the factor to the family's base unit.
export type Family = 'volume' | 'mass' | 'molar' | 'massconc' | 'length' | 'time' | 'fold';

export const UNITS: Record<Family, Record<string, number>> = {
  volume: { L: 1, mL: 1e-3, 'µL': 1e-6, nL: 1e-9 },
  mass: { kg: 1e3, g: 1, mg: 1e-3, 'µg': 1e-6, ng: 1e-9, pg: 1e-12 },
  molar: { M: 1, mM: 1e-3, 'µM': 1e-6, nM: 1e-9, pM: 1e-12 },
  // base: g/L (= mg/mL). '%' is % w/v: 1 % = 10 g/L.
  massconc: { '%': 10, 'g/L': 1, 'mg/mL': 1, 'µg/mL': 1e-3, 'ng/µL': 1e-3, 'ng/mL': 1e-6, 'pg/µL': 1e-6 },
  length: { m: 1, cm: 1e-2, mm: 1e-3, 'µm': 1e-6, nm: 1e-9 },
  time: { h: 3600, min: 60, s: 1 },
  fold: { X: 1 },
};

export const FAMILY_LABEL: Record<Family, string> = {
  volume: 'Volume', mass: 'Mass', molar: 'Molar concentration', massconc: 'Mass concentration',
  length: 'Length', time: 'Time', fold: 'Fold (X)',
};

export function familyOf(unit: string): Family | undefined {
  for (const f of Object.keys(UNITS) as Family[]) if (unit in UNITS[f]) return f;
  return undefined;
}

export function toBase(value: number, unit: string): number {
  const f = familyOf(unit);
  if (!f) throw new Error(`unknown unit ${unit}`);
  return value * UNITS[f][unit];
}

/** Strip float noise (1000.0000000000001 → 1000). */
export function clean(n: number): number { return Number.isFinite(n) ? Number(n.toPrecision(12)) : n; }

export function fromBase(value: number, unit: string): number {
  const f = familyOf(unit);
  if (!f) throw new Error(`unknown unit ${unit}`);
  return clean(value / UNITS[f][unit]);
}

export function convert(value: number, from: string, to: string): number {
  if (familyOf(from) !== familyOf(to)) throw new Error(`cannot convert ${from} to ${to}`);
  return fromBase(toBase(value, from), to);
}

/** Pick the unit in a family that shows the value with the fewest digits (value in base units). */
export function autoUnit(baseValue: number, family: Family, prefer?: string[]): { value: number; unit: string } {
  const table = UNITS[family];
  const names = (prefer ?? Object.keys(table)).filter((u) => u in table);
  const abs = Math.abs(baseValue);
  if (abs === 0) return { value: 0, unit: names[names.length - 1] };
  // largest unit where value >= 1
  const sorted = [...names].sort((a, b) => table[b] - table[a]);
  for (const u of sorted) {
    const v = abs / table[u];
    if (v >= 1) return { value: clean(baseValue / table[u]), unit: u };
  }
  const u = sorted[sorted.length - 1];
  return { value: clean(baseValue / table[u]), unit: u };
}

// Temperature is affine, handled apart from the tables.
export const TEMP_UNITS = ['°C', '°F', 'K'] as const;
export function convertTemp(value: number, from: string, to: string): number {
  let c: number;
  if (from === '°C') c = value; else if (from === '°F') c = (value - 32) * 5 / 9; else c = value - 273.15;
  if (to === '°C') return c; if (to === '°F') return c * 9 / 5 + 32; return c + 273.15;
}
