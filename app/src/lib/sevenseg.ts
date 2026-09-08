// Seven-segment display rendered as inline SVG. Digits, colon, dot, minus, space.
//   a
// f   b
//   g
// e   c
//   d
const SEG: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
};
// segment polygons for a 10×18 cell (slightly slanted for the classic look)
const P: Record<string, string> = {
  a: '1.2,0 8.8,0 7,1.9 3,1.9', b: '9.4,0.5 9.4,8.5 7.5,7.3 7.5,2.2', c: '9.4,9.5 9.4,17.5 7.5,15.8 7.5,10.7', d: '1.2,18 8.8,18 7,16.1 3,16.1',
  e: '0.6,9.5 0.6,17.5 2.5,15.8 2.5,10.7', f: '0.6,0.5 0.6,8.5 2.5,7.3 2.5,2.2', g: '1.4,9 2.8,8.1 7.2,8.1 8.6,9 7.2,9.9 2.8,9.9',
};
export function sevenSeg(text: string, opts: { height?: number; ghost?: number } = {}): string {
  const h = opts.height ?? 64, ghost = opts.ghost ?? 0.045;
  const cells: string[] = []; let x = 0;
  for (const ch of text) {
    if (ch === ':') { cells.push(`<g transform="translate(${x},0)"><circle cx="2.2" cy="5" r="1.5" fill="currentColor"/><circle cx="2.2" cy="13" r="1.5" fill="currentColor"/></g>`); x += 5; continue; }
    if (ch === '.') { cells.push(`<g transform="translate(${x},0)"><circle cx="1.6" cy="17" r="1.3" fill="currentColor"/></g>`); x += 4; continue; }
    const on = SEG[ch] ?? '';
    const segs = Object.keys(P).map((k) => `<polygon points="${P[k]}" fill="currentColor" opacity="${on.includes(k) ? 1 : ghost}"/>`).join('');
    cells.push(`<g transform="translate(${x},0) skewX(-4)">${segs}</g>`); x += 12;
  }
  const w = x - 2;
  return `<svg class="seg" viewBox="-1 -0.5 ${w + 2} 19" style="height:${h}px;width:auto;display:block" aria-label="${text}">${cells.join('')}</svg>`;
}
