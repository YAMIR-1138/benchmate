/** Format a number for the bench: up to 4 significant digits, no exponent unless huge or tiny. */
export function fmt(n: number, sig = 4): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e7 || abs < 1e-4) return n.toExponential(Math.max(0, sig - 1)).replace(/\.?0+e/, 'e');
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(abs)));
  const s = n.toFixed(Math.min(digits, 10));
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function fmtInt(n: number): string { return Math.round(n).toLocaleString('en-US'); }

export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const p = (x: number) => x.toString().padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** Parse "5m", "1h30m", "90s", "2:30", "15" (minutes) into ms. */
export function parseDuration(s: string): number | undefined {
  const t = s.trim().toLowerCase();
  if (!t) return undefined;
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(t)) {
    const parts = t.split(':').map(Number);
    const sec = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    return sec * 1000;
  }
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t) * 60000;
  let ms = 0, matched = false;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(h|hr|m|min|s|sec)/g)) {
    matched = true;
    const v = Number(m[1]);
    ms += m[2].startsWith('h') ? v * 3600000 : m[2].startsWith('m') ? v * 60000 : v * 1000;
  }
  return matched ? ms : undefined;
}
