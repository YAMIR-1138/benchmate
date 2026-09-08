import { load, save } from '../lib/store';
import { $, $$, esc, html } from '../lib/dom';

interface Band { size: number; ng?: number; percent?: number; reference?: boolean; color?: string }
interface Ladder { id: string; name: string; type: 'dna' | 'rna' | 'protein'; vendor: string; catalog: string; unit: string; approximate?: boolean; load?: { amount_ng: number; gel: string }; bands: Band[]; views?: string[] }

const LADDERS = Object.values(import.meta.glob('@core/data/ladders/*.json', { eager: true, import: 'default' })) as Ladder[];
const TYPES = [['dna', 'DNA'], ['rna', 'RNA'], ['protein', 'Protein']] as const;
const BAND_COLOR: Record<string, string> = { blue: '#3b7dd8', orange: '#e8912b', green: '#7fc94a' };

export function renderLadders(main: HTMLElement) {
  const st = load<{ type: string; id: string }>('ladders', { type: 'dna', id: '' });
  main.append(html`
    <div class="seg" id="types">${TYPES.map(([k, l]) => `<button data-t="${k}" class="${st.type === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="chips" id="picks"></div>
    <div id="lane"></div>
  `);
  const picks = $(main, '#picks'), lane = $(main, '#lane');
  function list() { return LADDERS.filter((l) => l.type === st.type); }
  function paint() {
    save('ladders', st);
    const ls = list(); if (!ls.some((l) => l.id === st.id)) st.id = ls[0]?.id ?? '';
    picks.innerHTML = ls.map((l) => `<button class="chip ${l.id === st.id ? 'on' : ''}" data-id="${l.id}">${esc(l.name.replace(/ (DNA|RNA|Protein) Ladder$/i, ''))}</button>`).join('');
    const L = ls.find((l) => l.id === st.id); lane.innerHTML = '';
    if (!L) return;
    const sizes = L.bands.map((b) => b.size), top = Math.log10(Math.max(...sizes)), bot = Math.log10(Math.min(...sizes));
    const H = 380, pad = 26, W = 300;
    const y = (s: number) => pad + ((top - Math.log10(s)) / (top - bot)) * H;
    const hasNg = L.bands.some((b) => b.ng !== undefined);
    const bands = L.bands.map((b) => {
      const yy = y(b.size), th = b.reference ? 7 : 4;
      const fill = b.color ? BAND_COLOR[b.color] ?? '#ccc' : b.reference ? 'var(--text)' : 'var(--muted)';
      return `<rect x="14" y="${(yy - th / 2).toFixed(1)}" width="62" height="${th}" rx="2" fill="${fill}" ${b.color ? '' : 'opacity="0.95"'}/>
        <text x="94" y="${(yy + 4).toFixed(1)}" font-size="13" font-family="var(--mono)" font-weight="${b.reference ? '700' : '400'}" fill="${b.reference ? 'var(--text)' : 'var(--muted)'}">${L.approximate ? '~' : ''}${b.size.toLocaleString('en-US')}</text>
        ${b.ng !== undefined ? `<text x="180" y="${(yy + 4).toFixed(1)}" font-size="13" font-family="var(--mono)" fill="${b.reference ? 'var(--orange)' : 'var(--muted)'}">${b.ng}</text>` : ''}`;
    }).join('');
    lane.innerHTML = `
      <div style="display:flex;align-items:baseline;justify-content:space-between;padding-top:14px"><div><div style="font-size:17px;font-weight:700">${esc(L.name)}</div><div class="mono muted" style="font-size:12px">${esc(L.catalog)} · ${esc(L.vendor)}</div></div></div>
      <div style="margin-top:10px;border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden">
        <svg viewBox="0 0 ${W} ${H + 2 * pad}" style="width:100%;display:block">
          <rect x="8" y="8" width="74" height="${H + 2 * pad - 16}" rx="6" fill="#0a1414"/>
          <text x="94" y="14" font-size="9" letter-spacing="2" fill="var(--muted)">${esc(L.unit.toUpperCase())}</text>
          ${hasNg ? `<text x="180" y="14" font-size="9" letter-spacing="2" fill="var(--muted)">NG / ${L.load?.amount_ng ?? ''} NG</text>` : ''}
          ${bands}
        </svg>
      </div>
      ${L.load ? `<div class="note">${esc(L.load.amount_ng / 1000)} µg per lane · ${esc(L.load.gel)}</div>` : ''}
      ${L.approximate ? `<div class="note">Prestained protein ladders: apparent sizes vary with gel system. Values are approximate.</div>` : ''}`;
  }
  $(main, '#types').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return;
    st.type = b.dataset.t!; $$(main, '#types button').forEach((x) => x.classList.toggle('on', x === b)); paint();
  });
  picks.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.id = b.dataset.id!; paint(); });
  paint();
}
