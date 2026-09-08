import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast, vibrate } from '../lib/dom';

interface Well { s?: number; g?: number; d?: boolean }
interface Plate { id: string; name: string; fmt: 96 | 384; samples: string[]; genes: string[]; wells: Record<string, Well> }
type Mode = 'sample' | 'gene' | 'done';
type State = { plates: Plate[]; active: string; mode: Mode; curS: number; curG: number };
const S_COL = ['var(--orange)', 'var(--mustard)', 'var(--avocado)', '#c25b8a', '#5b7fc2', '#8a5bc2', '#b07a4a', '#4aa3b0', '#d2c15a', '#7f8f8c'];
const G_COL = ['var(--teal)', '#e0453a', '#3b5bd6', '#8a2bb5', '#1f8a4c', '#d9008f', '#00747a', '#ff7f00'];
const dims = (f: 96 | 384) => (f === 96 ? { rows: 8, cols: 12 } : { rows: 16, cols: 24 });
const rn = (r: number) => String.fromCharCode(65 + r);
const wid = (r: number, c: number) => `${rn(r)}${c + 1}`;
const newPlate = (fmt: 96 | 384 = 96): Plate => ({ id: Math.random().toString(36).slice(2, 8), name: `Plate ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, fmt, samples: ['Ctrl', 'Sample 1', 'NTC'], genes: ['GAPDH', 'Gene 1'], wells: {} });

export function renderPlateMap(main: HTMLElement) {
  const st = load<State>('platemap2', { plates: [newPlate()], active: '', mode: 'sample', curS: 0, curG: 0 });
  // migrate v1 maps
  const old = load<{ plates: { id: string; name: string; fmt: 96 | 384; labels: string[]; wells: Record<string, { l?: number; d?: boolean }> }[] } | null>('platemap', null);
  if (old && !st.plates.some((p) => old.plates.some((o) => o.id === p.id))) { for (const o of old.plates) st.plates.push({ id: o.id, name: o.name, fmt: o.fmt, samples: o.labels, genes: ['Gene 1'], wells: Object.fromEntries(Object.entries(o.wells).map(([k, w]) => [k, { s: w.l, d: w.d }])) }); try { localStorage.removeItem('bm:platemap'); } catch { /* ignore */ } }
  if (!st.plates.find((p) => p.id === st.active)) st.active = st.plates[0].id;
  const P = () => st.plates.find((p) => p.id === st.active)!;

  main.append(html`
    <div class="chips" id="plates" style="padding-top:14px"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px"><input id="pname" type="text" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px;font-weight:700" /><div class="seg-ctl" style="margin:0;flex:0 0 124px" id="fmt"><button data-f="96">96</button><button data-f="384">384</button></div></div>
    <div class="seg-ctl" id="mode"><button data-m="sample">Samples</button><button data-m="gene">Genes</button><button data-m="done">Pipetted</button></div>
    <div id="legend" class="chips"></div>
    <div style="display:flex;gap:8px;margin-top:8px" id="addrow"><input id="newlabel" type="text" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px" /><button class="btn" id="addlabel" style="flex:0 0 80px">Add</button></div>
    <div class="result" style="padding:6px;touch-action:none;user-select:none;-webkit-user-select:none" id="gridbox"></div>
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px" class="mono"><span id="progress" style="font-size:14px"></span><span class="muted" style="font-size:12px;text-align:right">drag across wells for a block, or across the letters and numbers for whole lines</span></div>
    <div id="keys" style="margin-top:10px;font-size:13px"></div>
    <div class="actions"><button class="btn" id="copy">Copy map</button><button class="btn" id="resetdone">Clear ticks</button><button class="btn quiet" id="clear">Clear plate</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn" id="newplate">+ New plate</button><button class="btn quiet" id="delplate">Delete plate</button></div>
  `);
  const gridbox = $(main, '#gridbox'), legend = $(main, '#legend');
  const persist = () => save('platemap2', st);
  const cur = () => (st.mode === 'sample' ? st.curS : st.curG);

  function paintHeader() {
    const p = P();
    $(main, '#plates').innerHTML = st.plates.map((x) => `<button class="chip ${x.id === st.active ? 'on' : ''}" data-id="${x.id}">${esc(x.name)} <span class="mono" style="opacity:0.7">${x.fmt}</span></button>`).join('');
    $<HTMLInputElement>(main, '#pname').value = p.name;
    $$(main, '#fmt button').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.f) === p.fmt));
    $$(main, '#mode button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.m === st.mode));
    $(main, '#addrow').hidden = st.mode === 'done';
    $<HTMLInputElement>(main, '#newlabel').placeholder = st.mode === 'sample' ? 'new sample (treatment, time point…)' : 'new gene / primer pair';
    if (st.mode === 'done') { legend.innerHTML = `<span class="muted" style="font-size:14px;padding:6px 0">Tap or drag wells you have pipetted. Tap again to untick.</span>`; return; }
    const list = st.mode === 'sample' ? p.samples : p.genes, cols = st.mode === 'sample' ? S_COL : G_COL;
    legend.innerHTML = list.map((l, i) => `<button class="chip ${cur() === i ? 'on' : ''}" data-l="${i}" style="gap:8px">${st.mode === 'sample' ? `<span style="width:16px;height:16px;border-radius:8px;background:${cols[i % cols.length]};border:1.5px solid var(--line);display:inline-block"></span>` : `<span style="width:16px;height:16px;border-radius:8px;border:4px solid ${cols[i % cols.length]};display:inline-block;box-sizing:border-box"></span>`}${esc(l)}</button>`).join('') + `<button class="chip ${cur() === -1 ? 'on' : ''}" data-l="-1">eraser</button>`;
  }
  function paintGrid() {
    const p = P(), { rows, cols } = dims(p.fmt); const cell = p.fmt === 96 ? 22 : 13, gap = p.fmt === 96 ? 3 : 1, fs = p.fmt === 96 ? 11 : 8;
    let h = `<div style="display:grid;grid-template-columns:${cell}px repeat(${cols}, ${cell}px);gap:${gap}px;width:max-content;margin:0 auto">`;
    h += `<div></div>` + Array.from({ length: cols }, (_, c) => `<div class="hd" data-col="${c}" style="text-align:center;font-family:var(--mono);font-size:${fs}px;line-height:${cell}px;cursor:pointer;opacity:0.8">${c + 1}</div>`).join('');
    let done = 0, used = 0;
    for (let r = 0; r < rows; r++) {
      h += `<div class="hd" data-row="${r}" style="text-align:center;font-family:var(--mono);font-size:${fs}px;line-height:${cell}px;cursor:pointer;opacity:0.8">${rn(r)}</div>`;
      for (let c = 0; c < cols; c++) {
        const w = p.wells[wid(r, c)] ?? {}; const hasS = w.s !== undefined, hasG = w.g !== undefined; if (hasS || hasG) used++; if (w.d) done++;
        const fill = hasS ? S_COL[(w.s as number) % S_COL.length] : 'transparent';
        const ring = hasG ? G_COL[(w.g as number) % G_COL.length] : hasS ? 'var(--line)' : 'currentColor';
        const bw = hasG ? (p.fmt === 96 ? 4 : 3) : 2;
        h += `<div class="w" data-r="${r}" data-c="${c}" style="width:${cell}px;height:${cell}px;border-radius:50%;border:${bw}px solid ${ring};background:${fill};opacity:${hasS || hasG ? 1 : 0.35};position:relative;box-sizing:border-box">${w.d ? `<svg viewBox="0 0 24 24" style="position:absolute;inset:-1px;stroke:${hasS ? 'var(--key-ink)' : 'currentColor'};fill:none;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round"><path d="M5 13l4 4L19 7"/></svg>` : ''}</div>`;
      }
    }
    gridbox.innerHTML = h + '</div>';
    $(main, '#progress').textContent = `${done} / ${used || rows * cols} pipetted · ${used} in use`;
    const usedS = new Set<number>(), usedG = new Set<number>();
    for (const w of Object.values(p.wells)) { if (w.s !== undefined) usedS.add(w.s); if (w.g !== undefined) usedG.add(w.g); }
    $(main, '#keys').innerHTML = [...usedS].sort((a, b) => a - b).map((i) => `<span style="display:inline-flex;align-items:center;gap:5px;margin:0 12px 6px 0"><span style="width:12px;height:12px;border-radius:6px;background:${S_COL[i % S_COL.length]};border:1.5px solid var(--line)"></span>${esc(p.samples[i] ?? '?')}</span>`).join('')
      + [...usedG].sort((a, b) => a - b).map((i) => `<span style="display:inline-flex;align-items:center;gap:5px;margin:0 12px 6px 0"><span style="width:12px;height:12px;border-radius:6px;border:3px solid ${G_COL[i % G_COL.length]};box-sizing:border-box"></span>${esc(p.genes[i] ?? '?')}</span>`).join('');
  }
  function apply(ids: string[]) {
    const p = P(); const k = st.mode === 'sample' ? 's' : 'g';
    const tidy = (id: string) => { const w = p.wells[id]; if (w && w.s === undefined && w.g === undefined && !w.d) delete p.wells[id]; };
    if (st.mode === 'done') { const all = ids.every((id) => p.wells[id]?.d); for (const id of ids) { p.wells[id] = { ...(p.wells[id] ?? {}), d: !all }; if (all) delete p.wells[id].d; tidy(id); } }
    else if (cur() === -1) { for (const id of ids) { if (p.wells[id]) { delete (p.wells[id] as any)[k]; tidy(id); } } }
    else { const all = ids.every((id) => (p.wells[id] as any)?.[k] === cur()); for (const id of ids) { if (all) { delete (p.wells[id] as any)[k]; tidy(id); } else p.wells[id] = { ...(p.wells[id] ?? {}), [k]: cur() }; } }
    vibrate(8); persist(); paintGrid();
  }

  // ---- drag selection ----
  type Anchor = { kind: 'w' | 'row' | 'col'; r: number; c: number };
  let anchor: Anchor | null = null, last: Anchor | null = null;
  const at = (x: number, y: number): Anchor | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null; if (!el) return null;
    const w = el.closest<HTMLElement>('.w'); if (w) return { kind: 'w', r: Number(w.dataset.r), c: Number(w.dataset.c) };
    const hd = el.closest<HTMLElement>('.hd'); if (!hd) return null;
    return hd.dataset.row !== undefined ? { kind: 'row', r: Number(hd.dataset.row), c: 0 } : { kind: 'col', r: 0, c: Number(hd.dataset.col) };
  };
  const rect = (a: Anchor, b: Anchor) => {
    const { rows, cols } = dims(P().fmt);
    if (a.kind === 'row') return { r1: Math.min(a.r, b.r), r2: Math.max(a.r, b.r), c1: 0, c2: cols - 1 };
    if (a.kind === 'col') return { r1: 0, r2: rows - 1, c1: Math.min(a.c, b.c), c2: Math.max(a.c, b.c) };
    return { r1: Math.min(a.r, b.r), r2: Math.max(a.r, b.r), c1: Math.min(a.c, b.c), c2: Math.max(a.c, b.c) };
  };
  const ids = (rc: { r1: number; r2: number; c1: number; c2: number }) => { const out: string[] = []; for (let r = rc.r1; r <= rc.r2; r++) for (let c = rc.c1; c <= rc.c2; c++) out.push(wid(r, c)); return out; };
  const preview = () => {
    const rc = anchor && last ? rect(anchor, last) : null;
    $$<HTMLElement>(gridbox, '.w').forEach((w) => { const r = Number(w.dataset.r), c = Number(w.dataset.c); const on = !!rc && r >= rc.r1 && r <= rc.r2 && c >= rc.c1 && c <= rc.c2; w.style.boxShadow = on ? '0 0 0 3px var(--orange)' : ''; });
  };
  gridbox.addEventListener('pointerdown', (e) => { const a = at(e.clientX, e.clientY); if (!a) return; e.preventDefault(); anchor = a; last = a; gridbox.setPointerCapture(e.pointerId); preview(); });
  gridbox.addEventListener('pointermove', (e) => { if (!anchor) return; const a = at(e.clientX, e.clientY); if (!a) return; const b: Anchor = anchor.kind === 'w' ? (a.kind === 'w' ? a : anchor) : anchor.kind === 'row' ? { kind: 'row', r: a.r, c: 0 } : { kind: 'col', r: 0, c: a.c }; if (b.r !== last?.r || b.c !== last?.c) { last = b; preview(); } });
  const finish = () => { if (!anchor || !last) return; const rc = rect(anchor, last); anchor = null; last = null; apply(ids(rc)); };
  gridbox.addEventListener('pointerup', finish); gridbox.addEventListener('pointercancel', () => { anchor = null; last = null; preview(); });

  $(main, '#plates').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.active = b.dataset.id!; st.curS = 0; st.curG = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#fmt').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; const f = Number(b.dataset.f) as 96 | 384; const p = P(); if (p.fmt === f) return; if (Object.keys(p.wells).length && !confirm('Changing the format clears the wells. Continue?')) return; p.fmt = f; p.wells = {}; persist(); paintHeader(); paintGrid(); });
  $(main, '#mode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.mode = b.dataset.m as Mode; persist(); paintHeader(); });
  legend.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; if (st.mode === 'sample') st.curS = Number(b.dataset.l); else st.curG = Number(b.dataset.l); persist(); paintHeader(); });
  const addLabel = () => { const i = $<HTMLInputElement>(main, '#newlabel'); const v = i.value.trim(); if (!v) return; const list = st.mode === 'sample' ? P().samples : P().genes; list.push(v); if (st.mode === 'sample') st.curS = list.length - 1; else st.curG = list.length - 1; i.value = ''; persist(); paintHeader(); };
  $(main, '#addlabel').addEventListener('click', addLabel);
  $<HTMLInputElement>(main, '#newlabel').addEventListener('keydown', (e) => { if (e.key === 'Enter') addLabel(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('input', (e) => { P().name = (e.target as HTMLInputElement).value; persist(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('change', paintHeader);
  $(main, '#resetdone').addEventListener('click', () => { const p = P(); for (const id of Object.keys(p.wells)) { delete p.wells[id].d; if (p.wells[id].s === undefined && p.wells[id].g === undefined) delete p.wells[id]; } persist(); paintGrid(); });
  $(main, '#clear').addEventListener('click', () => { if (confirm('Clear all wells on this plate?')) { P().wells = {}; persist(); paintGrid(); } });
  $(main, '#newplate').addEventListener('click', () => { const p = newPlate(P().fmt); st.plates.push(p); st.active = p.id; st.curS = 0; st.curG = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#delplate').addEventListener('click', () => { if (st.plates.length === 1) { toast('Keep at least one plate'); return; } if (!confirm(`Delete ${P().name}?`)) return; st.plates = st.plates.filter((p) => p.id !== st.active); st.active = st.plates[0].id; persist(); paintHeader(); paintGrid(); });
  $(main, '#copy').addEventListener('click', async () => {
    const p = P(), { rows, cols } = dims(p.fmt);
    const lines = [`${p.name} (${p.fmt})`, '\t' + Array.from({ length: cols }, (_, c) => c + 1).join('\t')];
    for (let r = 0; r < rows; r++) lines.push(rn(r) + '\t' + Array.from({ length: cols }, (_, c) => { const w = p.wells[wid(r, c)]; if (!w) return ''; return [w.s !== undefined ? p.samples[w.s] : '', w.g !== undefined ? p.genes[w.g] : ''].filter(Boolean).join(' / ') + (w.d ? ' ✓' : ''); }).join('\t'));
    if (await copyText(lines.join('\n'))) toast('Copied as a table');
  });
  paintHeader(); paintGrid();
}
