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
  a: '1.4,0 8.6,0 7.4,1.4 2.6,1.4', b: '9,0.6 9,8.4 7.6,7.4 7.6,2', c: '9,9.6 9,17.4 7.6,16 7.6,10.6', d: '1.4,18 8.6,18 7.4,16.6 2.6,16.6',
  e: '1,9.6 1,17.4 2.4,16 2.4,10.6', f: '1,0.6 1,8.4 2.4,7.4 2.4,2', g: '1.6,9 2.8,8.3 7.2,8.3 8.4,9 7.2,9.7 2.8,9.7',
};
export function sevenSeg(text: string, opts: { height?: number; ghost?: number } = {}): string {
  const h = opts.height ?? 64, ghost = opts.ghost ?? 0.09;
  const cells: string[] = []; let x = 0;
  for (const ch of text) {
    if (ch === ':') { cells.push(`<g transform="translate(${x},0)"><circle cx="2" cy="5" r="1.3" fill="currentColor"/><circle cx="2" cy="13" r="1.3" fill="currentColor"/></g>`); x += 4.5; continue; }
    if (ch === '.') { cells.push(`<g transform="translate(${x},0)"><circle cx="1.6" cy="17" r="1.3" fill="currentColor"/></g>`); x += 4; continue; }
    const on = SEG[ch] ?? '';
    const segs = Object.keys(P).map((k) => `<polygon points="${P[k]}" fill="currentColor" opacity="${on.includes(k) ? 1 : ghost}"/>`).join('');
    cells.push(`<g transform="translate(${x},0) skewX(-4)">${segs}</g>`); x += 12;
  }
  const w = x - 2;
  return `<svg class="seg" viewBox="-1 -0.5 ${w + 2} 19" style="height:${h}px;width:auto;display:block" aria-label="${text}">${cells.join('')}</svg>`;
}
