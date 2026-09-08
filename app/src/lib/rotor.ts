// Centrifuge rotor balancing. A set of tubes is balanced when the unit vectors of their slots sum to zero.
// Same idea as ΣpinZero (github.com/YAMIR-1138/SpinZero): balanced sets are built from regular p-gons for primes p | n.

const EPS = 1e-6;

export function primeFactors(n: number): number[] {
  const out: number[] = []; let d = 2, m = n;
  while (m > 1) { while (m % d === 0) { if (!out.includes(d)) out.push(d); m /= d; } d++; if (d * d > m && m > 1) { if (!out.includes(m)) out.push(m); break; } }
  return out;
}

/** Vector sum of the slots (unit vectors). */
export function sum(n: number, slots: Iterable<number>): { x: number; y: number; mag: number } {
  let x = 0, y = 0;
  for (const s of slots) { const a = (2 * Math.PI * s) / n; x += Math.cos(a); y += Math.sin(a); }
  return { x, y, mag: Math.hypot(x, y) };
}
export const isBalanced = (n: number, slots: Iterable<number>) => sum(n, slots).mag < EPS;

/** Can k be written as a non-negative combination of the primes dividing n? */
function inSemigroup(k: number, primes: number[]): boolean {
  const ok = new Array<boolean>(k + 1).fill(false); ok[0] = true;
  for (let i = 1; i <= k; i++) for (const p of primes) if (i >= p && ok[i - p]) { ok[i] = true; break; }
  return ok[k];
}
/** Sivek's theorem: k tubes balance in n slots iff both k and n−k are sums of primes dividing n. */
export function canBalance(n: number, k: number): boolean {
  if (k < 0 || k > n) return false;
  if (k === 0 || k === n) return true;
  const p = primeFactors(n);
  return inSemigroup(k, p) && inSemigroup(n - k, p);
}

function shuffle<T>(a: T[], rnd: () => number): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Disjoint union of regular p-gons (cycles) with k slots in total. Randomised so repeated calls give different layouts. */
function byCycles(n: number, k: number, rnd: () => number): number[] | null {
  const primes = primeFactors(n);
  const cycles: Record<number, number[][]> = {};
  for (const p of primes) { const step = n / p; cycles[p] = shuffle(Array.from({ length: step }, (_, i) => Array.from({ length: p }, (_, j) => (i + j * step) % n)), rnd); }
  const decomps: Record<number, number>[] = [];
  (function dec(rem: number, idx: number, cur: Record<number, number>) {
    if (idx === primes.length) { if (rem === 0) decomps.push({ ...cur }); return; }
    const p = primes[idx];
    for (let c = 0; c <= Math.min(Math.floor(rem / p), n / p); c++) { cur[p] = c; dec(rem - c * p, idx + 1, cur); }
  })(k, 0, {});
  shuffle(decomps, rnd);
  for (const d of decomps) {
    const used = new Set<number>(); const chosen: number[] = [];
    const pick = (idx: number): boolean => {
      if (idx === primes.length) return chosen.length === k;
      const p = primes[idx], want = d[p] ?? 0;
      const go = (start: number, left: number): boolean => {
        if (left === 0) return pick(idx + 1);
        for (let i = start; i < cycles[p].length; i++) {
          const c = cycles[p][i]; if (c.some((s) => used.has(s))) continue;
          c.forEach((s) => used.add(s)); chosen.push(...c);
          if (go(i + 1, left - 1)) return true;
          c.forEach((s) => used.delete(s)); chosen.length -= p;
        }
        return false;
      };
      return go(0, want);
    };
    if (pick(0)) return chosen.sort((a, b) => a - b);
  }
  return null;
}

/** Depth-first search with the |Σ| ≤ remaining pruning. Used when cycles alone cannot do it (n with 3+ primes). */
function bySearch(n: number, k: number, budget = 400000): number[] | null {
  const cos = Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * i) / n));
  const sin = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i) / n));
  const pick: number[] = []; let nodes = 0;
  const dfs = (i: number, left: number, x: number, y: number): boolean => {
    if (++nodes > budget) return false;
    if (left === 0) return Math.hypot(x, y) < EPS;
    if (n - i < left) return false;
    if (Math.hypot(x, y) > left + EPS) return false;
    for (let s = i; s < n; s++) { pick.push(s); if (dfs(s + 1, left - 1, x + cos[s], y + sin[s])) return true; pick.pop(); }
    return false;
  };
  if (k === 0) return [];
  pick.push(0);
  return dfs(1, k - 1, cos[0], sin[0]) ? pick.slice() : null;
}

export interface Arrangement { slots: number[]; how: 'cycles' | 'search' }
/** Find a balanced arrangement of k tubes in n slots, or null. */
export function findBalanced(n: number, k: number, rnd: () => number = Math.random): Arrangement | null {
  if (!canBalance(n, k)) return null;
  if (k === 0) return { slots: [], how: 'cycles' };
  if (k === n) return { slots: Array.from({ length: n }, (_, i) => i), how: 'cycles' };
  const c = byCycles(n, k, rnd); if (c) return { slots: c, how: 'cycles' };
  const s = bySearch(n, k); if (s) return { slots: s, how: 'search' };
  return null;
}

export function rotate(n: number, slots: number[], by = 1): number[] { return slots.map((s) => (s + by) % n).sort((a, b) => a - b); }
