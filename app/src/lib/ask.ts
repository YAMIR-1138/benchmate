// The ask bar: type a bench question the way you would say it, get the number.
import { UNITS, autoUnit, convertTemp, familyOf, type Family } from './units';
import { fmt, parseDuration } from './fmt';

export type Answer =
  | { kind: 'calc'; title: string; value: string; detail?: string }
  | { kind: 'timer'; title: string; value: string; ms: number; label: string };

const CANON: Record<string, string> = {};
for (const f of Object.keys(UNITS) as Family[]) for (const u of Object.keys(UNITS[f])) CANON[u] ??= u;
const LOWER: Record<string, string> = {};
// case-insensitive fallbacks, concentration and volume first (phones type lower case)
for (const f of ['volume', 'molar', 'massconc', 'mass', 'fold', 'length', 'time'] as Family[]) for (const u of Object.keys(UNITS[f])) LOWER[u.toLowerCase()] ??= u;
export function unitOf(raw: string): string | undefined {
  const u = raw.replace(/μ/g, 'µ').replace(/(^|\/)u(?=[lgm])/gi, '$1µ').replace(/^mcg/i, 'µg');
  return CANON[u] ?? LOWER[u.toLowerCase()];
}
const TEMP: Record<string, string> = { c: '°C', f: '°F', k: 'K', '°c': '°C', '°f': '°F' };
const N = '(\\d+(?:[.,]\\d+)?(?:e[+-]?\\d+)?)', U = '([a-zµμ%°/]+)';
const n = (s: string) => Number(s.replace(',', '.'));
const vol = (base: number) => { const a = autoUnit(base, 'volume'); return `${fmt(a.value)} ${a.unit}`; };

/** + - * / ^ and brackets, no eval. */
export function arithmetic(src: string): number | undefined {
  const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.'); let i = 0;
  const atom = (): number => {
    if (s[i] === '(') { i++; const v = sum(); if (s[i] !== ')') throw 0; i++; return v; }
    if (s[i] === '-') { i++; return -atom(); }
    const m = /^\d+(\.\d+)?(e[+-]?\d+)?/i.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return Number(m[0]);
  };
  const pow = (): number => { const b = atom(); if (s[i] === '^') { i++; return b ** pow(); } return b; };
  const prod = (): number => { let v = pow(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : v / r; } return v; };
  const sum = (): number => { let v = prod(); while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const r = prod(); v = o === '+' ? v + r : v - r; } return v; };
  try { const v = sum(); return i === s.length && Number.isFinite(v) ? v : undefined; } catch { return undefined; }
}

export function ask(query: string): Answer | undefined {
  const q = query.trim().replace(/\s+/g, ' '); if (!q) return undefined;
  let m: RegExpExecArray | null;

  if (/^[\d\s.,+\-*/()×÷^e]+$/i.test(q) && /[+\-*/×÷^]/.test(q.slice(1))) {
    const v = arithmetic(q); if (v !== undefined) return { kind: 'calc', title: q, value: fmt(v, 6) };
  }

  // 1:10 in 500 µL
  if ((m = new RegExp(`^1 ?[:/] ?${N}(?: ?(?:in|of|for|to|,|→))? ?${N} ?${U}$`, 'i').exec(q))) {
    const f = n(m[1]), u = unitOf(m[3]);
    if (u && familyOf(u) === 'volume' && f > 1) {
      const total = n(m[2]) * UNITS.volume[u], stock = total / f;
      return { kind: 'calc', title: `1:${fmt(f)} dilution, ${fmt(n(m[2]))} ${u} total`, value: `${vol(stock)} stock`, detail: `+ ${vol(total - stock)} diluent` };
    }
  }

  // 37 C to F · 250 µL in mL
  if ((m = new RegExp(`^(-?${N.slice(1, -1)}) ?${U} ?(?:in|to|as|=|→|->) ?${U}\\??$`, 'i').exec(q))) {
    const v = n(m[1]), tf = TEMP[m[2].toLowerCase()], tt = TEMP[m[3].toLowerCase()];
    if (tf && tt) return { kind: 'calc', title: `${fmt(v)} ${tf}`, value: `${fmt(convertTemp(v, tf, tt), 4)} ${tt}` };
    let a = unitOf(m[2]), b = unitOf(m[3]);
    if (a && b && familyOf(a) !== familyOf(b)) { // "mm" typed in lower case: let the other unit decide the family
      const fb = familyOf(b)!, fa = familyOf(a)!;
      const a2 = Object.keys(UNITS[fb]).find((x) => x.toLowerCase() === m![2].toLowerCase()), b2 = Object.keys(UNITS[fa]).find((x) => x.toLowerCase() === m![3].toLowerCase());
      if (a2) a = a2; else if (b2) b = b2;
    }
    if (a && b && familyOf(a) === familyOf(b)) { const f = familyOf(a)!; return { kind: 'calc', title: `${fmt(v)} ${a}`, value: `${fmt(v * UNITS[f][a] / UNITS[f][b], 5)} ${b}` }; }
  }

  // 10x to 1x 50 mL · 5 mM from 1 M, 10 mL
  const qs = [...q.matchAll(new RegExp(`${N} ?${U}`, 'gi'))].map((x) => ({ v: n(x[1]), raw: x[2], u: unitOf(x[2]), at: x.index! })).filter((x) => x.u);
  const vols = qs.filter((x) => familyOf(x.u!) === 'volume');
  if (qs.length === 3 && vols.length === 1) {
    const cs = qs.filter((x) => x !== vols[0]).map((x) => { // metres make no sense next to a volume: read m, mm, µm, nm as molar
      if (familyOf(x.u!) === 'length') { const mol = Object.keys(UNITS.molar).find((k) => k.toLowerCase() === x.u!.toLowerCase()); if (mol) return { ...x, u: mol }; }
      return x;
    });
    const fam = familyOf(cs[0].u!)!;
    if (fam === familyOf(cs[1].u!) && (fam === 'molar' || fam === 'massconc' || fam === 'fold')) {
      const base = cs.map((c) => c.v * UNITS[fam][c.u!]);
      const from = / from /i.test(q) ? 1 : / (to|→|->|into) /i.test(q) ? 0 : base[0] >= base[1] ? 0 : 1;
      const c1 = base[from], c2 = base[1 - from], S = cs[from], T = cs[1 - from];
      const u = (x: typeof S) => (fam === 'fold' ? `${fmt(x.v)}×` : `${fmt(x.v)} ${x.u}`);
      const total = vols[0].v * UNITS.volume[vols[0].u!];
      if (c2 > c1) return { kind: 'calc', title: `${u(S)} → ${u(T)}`, value: 'stock is weaker than the target', detail: 'swap the two concentrations?' };
      const stock = total * c2 / c1;
      return { kind: 'calc', title: `${u(S)} → ${u(T)}, ${fmt(vols[0].v)} ${vols[0].u} total`, value: `${vol(stock)} stock`, detail: `+ ${vol(total - stock)} diluent · 1:${fmt(c1 / c2)}` };
    }
  }

  // timer 5m spin · 5 min spin · 1h30m
  if ((m = /^(?:timer|time|t) (.+)$/i.exec(q)) || (m = /^((?:\d+(?:\.\d+)?\s?(?:hr|h|min|m|sec|s)(?![a-zµ])\s?)+|\d+:\d{2}(?::\d{2})?)(.*)$/i.exec(q))) {
    const body = m.length === 2 ? m[1] : m[1] + '\u0000' + m[2];
    let dur: string, label: string;
    if (m.length === 2) { const p = /^((?:\d+(?:\.\d+)?\s?(?:hr|h|min|m|sec|s)(?![a-zµ])\s?)+|\d+:\d{2}(?::\d{2})?|\d+(?:\.\d+)?)\s*(.*)$/i.exec(body); if (!p) return undefined; dur = p[1]; label = p[2]; }
    else [dur, label] = body.split('\u0000');
    const ms = parseDuration(dur.trim());
    if (ms && ms > 0 && ms <= 100 * 3600000) { label = label.trim() || 'Timer'; return { kind: 'timer', title: `Timer · ${label}`, value: dur.trim().replace(/\s+/g, ' '), ms, label }; }
  }
  return undefined;
}
