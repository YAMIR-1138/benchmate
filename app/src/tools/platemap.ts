import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast, vibrate } from '../lib/dom';

interface Well { l?: number; d?: boolean }
interface Plate { id: string; name: string; fmt: 96 | 384; labels: string[]; wells: Record<string, Well> }
type State = { plates: Plate[]; active: string; mode: 'label' | 'done'; cur: number };
const COLORS = ['var(--orange)', 'var(--teal)', 'var(--mustard)', 'var(--avocado)', '#c25b8a', '#5b7fc2', '#8a5bc2', '#b07a4a'];
const dims = (f: 96 | 384) => (f === 96 ? { rows: 8, cols: 12 } : { rows: 16, cols: 24 });
const rowName = (r: number) => String.fromCharCode(65 + r);
const newPlate = (fmt: 96 | 384 = 96): Plate => ({ id: Math.random().toString(36).slice(2, 8), name: `Plate ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, fmt, labels: ['Sample 1', 'NTC'], wells: {} });

export function renderPlateMap(main: HTMLElement) {
  const st = load<State>('platemap', { plates: [newPlate()], active: '', mode: 'label', cur: 0 });
  if (!st.plates.find((p) => p.id === st.active)) st.active = st.plates[0].id;
  const P = () => st.plates.find((p) => p.id === st.active)!;
  main.append(html`
    <div class="chips" id="plates" style="padding-top:14px"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px"><input id="pname" type="text" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px;font-weight:700" /><div class="seg-ctl" style="margin:0;flex:0 0 124px" id="fmt"><button data-f="96">96</button><button data-f="384">384</button></div></div>
    <div class="seg-ctl" id="mode"><button data-m="label">Assign</button><button data-m="done">Mark pipetted</button></div>
    <div id="legend" class="chips"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input id="newlabel" type="text" placeholder="new label (sample, primer, NTC…)" style="flex:1 1 auto;min-height:44px;padding:0 12px" /><button class="btn" id="addlabel" style="flex:0 0 80px">Add</button></div>
    <div class="result" style="padding:8px;overflow-x:auto" id="gridbox"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px" class="mono"><span id="progress"></span><span class="muted" style="font-size:12px">tap a row letter or column number for the whole line</span></div>
    <div class="actions"><button class="btn" id="copy">Copy map</button><button class="btn" id="resetdone">Clear ticks</button><button class="btn quiet" id="clear">Clear plate</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn" id="newplate">+ New plate</button><button class="btn quiet" id="delplate">Delete plate</button></div>
  `);
  const gridbox = $(main, '#gridbox'), legend = $(main, '#legend');
  const persist = () => save('platemap', st);

  function paintHeader() {
    const p = P();
    $(main, '#plates').innerHTML = st.plates.map((x) => `<button class="chip ${x.id === st.active ? 'on' : ''}" data-id="${x.id}">${esc(x.name)} <span class="mono" style="opacity:0.7">${x.fmt}</span></button>`).join('');
    $<HTMLInputElement>(main, '#pname').value = p.name;
    $$(main, '#fmt button').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.f) === p.fmt));
    $$(main, '#mode button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.m === st.mode));
    legend.innerHTML = p.labels.map((l, i) => `<button class="chip ${st.mode === 'label' && st.cur === i ? 'on' : ''}" data-l="${i}" style="gap:8px"><span style="width:14px;height:14px;border-radius:7px;background:${COLORS[i % COLORS.length]};border:1.5px solid var(--line);display:inline-block"></span>${esc(l)}</button>`).join('') + `<button class="chip ${st.mode === 'label' && st.cur === -1 ? 'on' : ''}" data-l="-1">eraser</button>`;
  }
  function paintGrid() {
    const p = P(), { rows, cols } = dims(p.fmt); const cell = p.fmt === 96 ? 22 : 18, gap = p.fmt === 96 ? 3 : 2;
    let h = `<div style="display:grid;grid-template-columns:${cell}px repeat(${cols}, ${cell}px);gap:${gap}px;width:max-content">`;
    h += `<div></div>` + Array.from({ length: cols }, (_, c) => `<div class="hd" data-col="${c}" style="text-align:center;font-family:var(--mono);font-size:${p.fmt === 96 ? 12 : 10}px;line-height:${cell}px;cursor:pointer;color:inherit;opacity:0.8">${c + 1}</div>`).join('');
    let done = 0, used = 0;
    for (let r = 0; r < rows; r++) {
      h += `<div class="hd" data-row="${r}" style="text-align:center;font-family:var(--mono);font-size:${p.fmt === 96 ? 12 : 10}px;line-height:${cell}px;cursor:pointer;color:inherit;opacity:0.8">${rowName(r)}</div>`;
      for (let c = 0; c < cols; c++) {
        const id = `${rowName(r)}${c + 1}`, w = p.wells[id] ?? {}; const has = w.l !== undefined; if (has) used++; if (w.d) done++;
        const bg = has ? COLORS[(w.l as number) % COLORS.length] : 'transparent';
        h += `<div class="w" data-id="${id}" style="width:${cell}px;height:${cell}px;border-radius:50%;border:2px solid ${has ? 'var(--line)' : 'currentColor'};background:${bg};opacity:${has ? 1 : 0.35};position:relative;cursor:pointer">${w.d ? `<svg viewBox="0 0 24 24" style="position:absolute;inset:2px;stroke:${has ? 'var(--key-ink)' : 'currentColor'};fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 13l4 4L19 7"/></svg>` : ''}</div>`;
      }
    }
    gridbox.innerHTML = h + '</div>';
    $(main, '#progress').textContent = `${done} / ${used || rows * cols} pipetted · ${used} wells assigned`;
  }
  function apply(ids: string[]) {
    const p = P();
    if (st.mode === 'done') { const allDone = ids.every((id) => p.wells[id]?.d); for (const id of ids) { p.wells[id] = { ...(p.wells[id] ?? {}), d: !allDone }; if (!p.wells[id].d && p.wells[id].l === undefined) delete p.wells[id]; } }
    else if (st.cur === -1) { for (const id of ids) delete p.wells[id]; }
    else { const allSame = ids.every((id) => p.wells[id]?.l === st.cur); for (const id of ids) { if (allSame) { const w = p.wells[id]; delete w.l; if (!w.d) delete p.wells[id]; } else p.wells[id] = { ...(p.wells[id] ?? {}), l: st.cur }; } }
    vibrate(8); persist(); paintGrid();
  }
  gridbox.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement; const w = t.closest<HTMLElement>('.w'); const p = P(), { rows, cols } = dims(p.fmt);
    if (w) { e.preventDefault(); apply([w.dataset.id!]); return; }
    const hd = t.closest<HTMLElement>('.hd'); if (!hd) return; e.preventDefault();
    if (hd.dataset.row !== undefined) apply(Array.from({ length: cols }, (_, c) => `${rowName(Number(hd.dataset.row))}${c + 1}`));
    else apply(Array.from({ length: rows }, (_, r) => `${rowName(r)}${Number(hd.dataset.col) + 1}`));
  });
  $(main, '#plates').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.active = b.dataset.id!; st.cur = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#fmt').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; const f = Number(b.dataset.f) as 96 | 384; const p = P(); if (p.fmt === f) return; if (Object.keys(p.wells).length && !confirm('Changing the format clears the wells. Continue?')) return; p.fmt = f; p.wells = {}; persist(); paintHeader(); paintGrid(); });
  $(main, '#mode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.mode = b.dataset.m as State['mode']; persist(); paintHeader(); });
  legend.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.cur = Number(b.dataset.l); st.mode = 'label'; persist(); paintHeader(); });
  $(main, '#addlabel').addEventListener('click', () => { const i = $<HTMLInputElement>(main, '#newlabel'); const v = i.value.trim(); if (!v) return; P().labels.push(v); st.cur = P().labels.length - 1; st.mode = 'label'; i.value = ''; persist(); paintHeader(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('input', (e) => { P().name = (e.target as HTMLInputElement).value; persist(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('change', paintHeader);
  $(main, '#resetdone').addEventListener('click', () => { const p = P(); for (const id of Object.keys(p.wells)) { delete p.wells[id].d; if (p.wells[id].l === undefined) delete p.wells[id]; } persist(); paintGrid(); });
  $(main, '#clear').addEventListener('click', () => { if (confirm('Clear all wells on this plate?')) { P().wells = {}; persist(); paintGrid(); } });
  $(main, '#newplate').addEventListener('click', () => { const p = newPlate(P().fmt); st.plates.push(p); st.active = p.id; st.cur = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#delplate').addEventListener('click', () => { if (st.plates.length === 1) { toast('Keep at least one plate'); return; } if (!confirm(`Delete ${P().name}?`)) return; st.plates = st.plates.filter((p) => p.id !== st.active); st.active = st.plates[0].id; persist(); paintHeader(); paintGrid(); });
  $(main, '#copy').addEventListener('click', async () => {
    const p = P(), { rows, cols } = dims(p.fmt);
    const lines = [`${p.name} (${p.fmt})`, '\t' + Array.from({ length: cols }, (_, c) => c + 1).join('\t')];
    for (let r = 0; r < rows; r++) lines.push(rowName(r) + '\t' + Array.from({ length: cols }, (_, c) => { const w = p.wells[`${rowName(r)}${c + 1}`]; return w?.l === undefined ? '' : `${p.labels[w.l]}${w.d ? ' ✓' : ''}`; }).join('\t'));
    if (await copyText(lines.join('\n'))) toast('Copied as a table');
  });
  paintHeader(); paintGrid();
}
