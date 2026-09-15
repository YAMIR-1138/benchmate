import { load, save } from '../lib/store';
import { showHandoff, qrSvg } from '../lib/handoff';
import { $, $$, copyText, esc, html, toast, vibrate } from '../lib/dom';

interface Well { s?: number; g?: number; d?: boolean }
type Fmt = 6 | 12 | 24 | 48 | 96 | 384;
type Kind = 'qpcr' | 'culture';
interface Plate { id: string; name: string; fmt: Fmt; kind?: Kind; note?: string; samples: string[]; genes: string[]; wells: Record<string, Well> }
const FMTS: Fmt[] = [6, 12, 24, 48, 96, 384];
const LAYERS: Record<Kind, [string, string]> = { qpcr: ['Samples', 'Genes'], culture: ['Cell line', 'Treatment'] };
type Mode = 'sample' | 'gene' | 'done';
type State = { plates: Plate[]; active: string; mode: Mode; curS: number; curG: number };
const S_COL = ['var(--orange)', 'var(--mustard)', 'var(--avocado)', '#c25b8a', '#5b7fc2', '#8a5bc2', '#b07a4a', '#4aa3b0', '#d2c15a', '#7f8f8c'];
const G_COL = ['var(--teal)', '#e0453a', '#3b5bd6', '#8a2bb5', '#1f8a4c', '#d9008f', '#00747a', '#ff7f00'];
const dims = (f: Fmt) => ({ 6: { rows: 2, cols: 3 }, 12: { rows: 3, cols: 4 }, 24: { rows: 4, cols: 6 }, 48: { rows: 6, cols: 8 }, 96: { rows: 8, cols: 12 }, 384: { rows: 16, cols: 24 } }[f]);
const GAP: Record<Fmt, number> = { 6: 8, 12: 6, 24: 5, 48: 3, 96: 3, 384: 1 };
const HDR = 24;
/** Well size that fits `width` px for a format. */
const fitCell = (f: Fmt, width: number) => { const { cols } = dims(f); return Math.max(10, Math.min(100, Math.floor((width - HDR - cols * GAP[f]) / cols))); };
const rn = (r: number) => String.fromCharCode(65 + r);
const wid = (r: number, c: number) => `${rn(r)}${c + 1}`;
const newPlate = (fmt: Fmt = 96, kind: Kind = 'qpcr'): Plate => ({ id: Math.random().toString(36).slice(2, 8), name: `${kind === 'culture' ? 'Culture' : 'Plate'} ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, fmt, kind, note: '', samples: kind === 'culture' ? ['Caco-2', 'HEK293'] : ['Ctrl', 'Sample 1', 'NTC'], genes: kind === 'culture' ? ['Untreated', 'Treated'] : ['GAPDH', 'Gene 1'], wells: {} });
const kindOf = (p: Plate): Kind => p.kind ?? 'qpcr';

export function renderPlateMap(main: HTMLElement) {
  const st = load<State>('platemap2', { plates: [newPlate()], active: '', mode: 'sample', curS: 0, curG: 0 });
  // migrate v1 maps
  const old = load<{ plates: { id: string; name: string; fmt: 96 | 384; labels: string[]; wells: Record<string, { l?: number; d?: boolean }> }[] } | null>('platemap', null);
  if (old && !st.plates.some((p) => old.plates.some((o) => o.id === p.id))) { for (const o of old.plates) st.plates.push({ id: o.id, name: o.name, fmt: o.fmt, samples: o.labels, genes: ['Gene 1'], wells: Object.fromEntries(Object.entries(o.wells).map(([k, w]) => [k, { s: w.l, d: w.d }])) }); try { localStorage.removeItem('bm:platemap'); } catch { /* ignore */ } }
  if (!st.plates.find((p) => p.id === st.active)) st.active = st.plates[0].id;
  const P = () => st.plates.find((p) => p.id === st.active)!;

  main.append(html`
    <div class="chips" id="plates" style="padding-top:14px"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px"><input id="pname" type="text" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px;font-weight:700" /><div class="seg-ctl" style="margin:0;flex:0 0 150px" id="kind"><button data-k="qpcr">qPCR</button><button data-k="culture">Culture</button></div></div>
    <div class="chips" id="fmt" style="padding-top:8px">${FMTS.map((f) => `<button class="chip" data-f="${f}" style="min-height:36px;padding:0 12px">${f}</button>`).join('')}</div>
    <input id="pnote" type="text" placeholder="note: seeded 15 Sep · P12 · 0.5 mL/well" style="width:100%;min-height:40px;padding:0 12px;margin-top:8px;font-size:14px" />
    <div class="seg-ctl" id="mode"><button data-m="sample">Samples</button><button data-m="gene">Genes</button><button data-m="done">Done</button></div>
    <div id="legend" class="chips"></div>
    <div style="display:flex;gap:8px;margin-top:8px" id="addrow"><input id="newlabel" type="text" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px" /><button class="btn" id="addlabel" style="flex:0 0 80px">Add</button></div>
    <div class="print" id="printblock">
      <div class="print-only" style="font-family:var(--mono);font-size:11px;margin-bottom:6px;color:#555"><span id="print-head"></span></div>
      <div class="print-flex" style="justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px"><div style="font-family:var(--display);font-weight:700;font-size:20px" id="print-title"></div><span class="pqr" id="pqr"></span></div>
      <div class="result" style="padding:6px;overflow-x:auto;touch-action:none;user-select:none;-webkit-user-select:none" id="gridbox"></div>
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px" class="mono screen-only"><span id="progress" style="font-size:14px"></span><span class="muted" style="font-size:12px;text-align:right">drag across wells for a block, or across the letters and numbers for whole lines</span></div>
    <div id="keys" style="margin-top:10px;font-size:13px"></div>
    </div>
    <div class="actions"><button class="btn primary" id="fullscreen">Full screen</button><button class="btn" id="share">Send to device</button><button class="btn" id="print">Print A4</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn" id="copy">Copy map</button><button class="btn" id="resetdone">Clear ticks</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn quiet" id="clear">Clear plate</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn" id="newplate">+ New plate</button><button class="btn quiet" id="delplate">Delete plate</button></div>
  `);
  const gridbox = $(main, '#gridbox'), legend = $(main, '#legend');
  const persist = () => save('platemap2', st);
  const cur = () => (st.mode === 'sample' ? st.curS : st.curG);

  function paintHeader() {
    const p = P();
    $(main, '#plates').innerHTML = st.plates.map((x) => `<button class="chip ${x.id === st.active ? 'on' : ''}" data-id="${x.id}">${esc(x.name)} <span class="mono" style="opacity:0.7">${x.fmt}</span></button>`).join('');
    $<HTMLInputElement>(main, '#pname').value = p.name; $<HTMLInputElement>(main, '#pnote').value = p.note ?? '';
    $$(main, '#fmt .chip').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.f) === p.fmt));
    $$(main, '#kind button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.k === kindOf(p)));
    const [L1, L2] = LAYERS[kindOf(p)];
    $$(main, '#mode button').forEach((b) => { const m = (b as HTMLElement).dataset.m; b.classList.toggle('on', m === st.mode); b.textContent = m === 'sample' ? L1 : m === 'gene' ? L2 : kindOf(p) === 'culture' ? 'Done' : 'Pipetted'; });
    $(main, '#addrow').hidden = st.mode === 'done';
    $<HTMLInputElement>(main, '#newlabel').placeholder = st.mode === 'sample' ? `new ${L1.toLowerCase()}` : `new ${L2.toLowerCase()}`;
    if (st.mode === 'done') { legend.innerHTML = `<span class="muted" style="font-size:14px;padding:6px 0">${kindOf(p) === 'culture' ? 'Tap or drag wells you have fed, treated or passaged. Tap again to untick.' : 'Tap or drag wells you have pipetted. Tap again to untick.'}</span>`; return; }
    const list = st.mode === 'sample' ? p.samples : p.genes, cols = st.mode === 'sample' ? S_COL : G_COL;
    legend.innerHTML = list.map((l, i) => `<button class="chip ${cur() === i ? 'on' : ''}" data-l="${i}" style="gap:8px">${st.mode === 'sample' ? `<span style="width:16px;height:16px;border-radius:8px;background:${cols[i % cols.length]};border:1.5px solid var(--line);display:inline-block"></span>` : `<span style="width:16px;height:16px;border-radius:8px;border:4px solid ${cols[i % cols.length]};display:inline-block;box-sizing:border-box"></span>`}${esc(l)}</button>`).join('') + `<button class="chip ${cur() === -1 ? 'on' : ''}" data-l="-1">eraser</button>`;
  }
  function gridHtml(cell: number, gap: number, fs: number) {
    const p = P(), { rows, cols } = dims(p.fmt);
    let h = `<div style="display:grid;grid-template-columns:${HDR}px repeat(${cols}, ${cell}px);gap:${gap}px;width:max-content;margin:0 auto">`;
    h += `<div></div>` + Array.from({ length: cols }, (_, c) => `<div class="hd" data-col="${c}" style="text-align:center;font-family:var(--mono);font-size:${fs}px;line-height:${cell}px;cursor:pointer;opacity:0.8">${c + 1}</div>`).join('');
    let done = 0, used = 0;
    for (let r = 0; r < rows; r++) {
      h += `<div class="hd" data-row="${r}" style="text-align:center;font-family:var(--mono);font-size:${fs}px;line-height:${cell}px;cursor:pointer;opacity:0.8">${rn(r)}</div>`;
      for (let c = 0; c < cols; c++) {
        const w = p.wells[wid(r, c)] ?? {}; const hasS = w.s !== undefined, hasG = w.g !== undefined; if (hasS || hasG) used++; if (w.d) done++;
        const fill = hasS ? S_COL[(w.s as number) % S_COL.length] : 'transparent';
        const ring = hasG ? G_COL[(w.g as number) % G_COL.length] : hasS ? 'var(--line)' : 'currentColor';
        const bw = hasG ? (p.fmt === 96 ? 4 : 3) : 2;
        const big = cell >= 36;
        const label = big && (hasS || hasG) ? `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;overflow:hidden;text-align:center;line-height:1.1;color:${hasS ? 'var(--key-ink)' : 'currentColor'}">${hasS ? `<span style="font-weight:700;font-size:${cell >= 70 ? 13 : cell >= 50 ? 11 : 9}px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.samples[w.s as number] ?? '')}</span>` : ''}${hasG && cell >= 50 ? `<span style="font-size:${cell >= 70 ? 11 : 9}px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0.85">${esc(p.genes[w.g as number] ?? '')}</span>` : ''}</div>` : '';
        const tick = w.d ? (big ? `<svg viewBox="0 0 24 24" style="position:absolute;right:2px;top:2px;width:${Math.max(14, cell / 4)}px;height:${Math.max(14, cell / 4)}px;stroke:${hasS ? 'var(--key-ink)' : 'currentColor'};fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 13l4 4L19 7"/></svg>` : `<svg viewBox="0 0 24 24" style="position:absolute;inset:-1px;stroke:${hasS ? 'var(--key-ink)' : 'currentColor'};fill:none;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round"><path d="M5 13l4 4L19 7"/></svg>`) : '';
        h += `<div class="w" data-r="${r}" data-c="${c}" style="width:${cell}px;height:${cell}px;border-radius:50%;border:${bw}px solid ${ring};background:${fill};opacity:${hasS || hasG ? 1 : 0.35};position:relative;box-sizing:border-box">${label}${tick}</div>`;
      }
    }
    return { html: h + '</div>', done, used, rows, cols };
  }
  function paintGrid() {
    const p = P();
    const cc = fitCell(p.fmt, (gridbox.clientWidth || 354) - 12), cg = GAP[p.fmt], cf = cc >= 36 ? 12 : cc >= 20 ? 11 : 8; const g = gridHtml(cc, cg, cf);
    gridbox.innerHTML = g.html;
    if (fsBox) { const b = fsCell(); fsBox.innerHTML = gridHtml(b.cell, b.gap, b.fs).html; $(overlay!, '#fs-progress').textContent = `${g.done} / ${g.used || g.rows * g.cols}`; }
    const { done, used, rows, cols } = g;
    $(main, '#progress').textContent = `${done} / ${used || rows * cols} ${kindOf(p) === 'culture' ? 'done' : 'pipetted'} · ${used} in use`;
    $(main, '#print-head').textContent = `TGGR Bench Mate · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    $(main, '#print-title').textContent = `${p.name} · ${p.fmt}-well${p.note ? ` · ${p.note}` : ''}`;
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
  let dragBox: HTMLElement = gridbox;
  const preview = () => {
    const rc = anchor && last ? rect(anchor, last) : null;
    $$<HTMLElement>(dragBox, '.w').forEach((w) => { const r = Number(w.dataset.r), c = Number(w.dataset.c); const on = !!rc && r >= rc.r1 && r <= rc.r2 && c >= rc.c1 && c <= rc.c2; w.style.boxShadow = on ? '0 0 0 3px var(--orange)' : ''; });
  };
  const finish = () => { if (!anchor || !last) return; const rc = rect(anchor, last); anchor = null; last = null; apply(ids(rc)); };
  function attachDrag(box: HTMLElement, canSelect: () => boolean) {
    box.addEventListener('pointerdown', (e) => { if (!canSelect()) return; const a = at(e.clientX, e.clientY); if (!a) return; e.preventDefault(); dragBox = box; anchor = a; last = a; box.setPointerCapture(e.pointerId); preview(); });
    box.addEventListener('pointermove', (e) => { if (!anchor) return; const a = at(e.clientX, e.clientY); if (!a) return; const b: Anchor = anchor.kind === 'w' ? (a.kind === 'w' ? a : anchor) : anchor.kind === 'row' ? { kind: 'row', r: a.r, c: 0 } : { kind: 'col', r: 0, c: a.c }; if (b.r !== last?.r || b.c !== last?.c) { last = b; preview(); } });
    box.addEventListener('pointerup', finish); box.addEventListener('pointercancel', () => { anchor = null; last = null; preview(); });
  }
  attachDrag(gridbox, () => true);

  // ---- full screen with zoom ----
  let overlay: HTMLElement | null = null, fsBox: HTMLElement | null = null, zoom = 1, fsMove = false;
  function fsCell() {
    const { rows } = dims(P().fmt);
    const f = P().fmt; const byW = fitCell(f, window.innerWidth - 20), byH = Math.floor((window.innerHeight - 130 - rows * GAP[f]) / rows);
    const cell = Math.max(10, Math.round(Math.min(byW, byH, 100) * zoom));
    return { cell, gap: GAP[f], fs: cell >= 36 ? 12 : cell >= 20 ? 11 : 8 };
  }
  function openFullscreen() {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:30;background:var(--bg);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)';
    overlay.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;padding:6px 10px;border-bottom:var(--bw) solid var(--line);background:var(--panel)">
        <div class="seg-ctl" id="fs-mode" style="margin:0"><button data-m="sample">Samples</button><button data-m="gene">Genes</button><button data-m="done">Pipetted</button></div>
        <div id="fs-legend" class="chips" style="padding:0;flex-wrap:nowrap;overflow-x:auto"></div></div>
      <div id="fs-scroll" style="flex:1 1 auto;overflow:auto;padding:8px;touch-action:none;user-select:none;-webkit-user-select:none"><div id="fs-grid" style="width:max-content;margin:0 auto"></div></div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));border-top:var(--bw) solid var(--line);background:var(--panel)">
        <button class="btn" id="fs-out" style="flex:0 0 48px;min-height:48px;padding:0;font-size:24px">−</button><span class="mono" id="fs-z" style="min-width:34px;text-align:center;font-size:14px">1×</span><button class="btn" id="fs-in" style="flex:0 0 48px;min-height:48px;padding:0;font-size:24px">+</button>
        <button class="btn" id="fs-move" style="flex:0 0 auto;min-height:48px;font-size:15px;padding:0 12px">Move</button>
        <span class="mono muted" id="fs-progress" style="flex:1 1 auto;text-align:center;font-size:12px"></span>
        <button class="btn orange" id="fs-close" style="flex:0 0 auto;min-height:48px;font-size:16px;padding:0 16px">Exit ✕</button></div>`;
    document.body.append(overlay);
    fsBox = $<HTMLElement>(overlay, '#fs-grid');
    const scroll = $<HTMLElement>(overlay, '#fs-scroll');
    attachDrag(scroll, () => !fsMove);
    const paintFs = () => { const [L1, L2] = LAYERS[kindOf(P())]; $$(overlay!, '#fs-mode button').forEach((b) => { const m = (b as HTMLElement).dataset.m; b.classList.toggle('on', m === st.mode); b.textContent = m === 'sample' ? L1 : m === 'gene' ? L2 : 'Done'; }); $(overlay!, '#fs-z').textContent = `${zoom}×`; $(overlay!, '#fs-move').classList.toggle('primary', fsMove); scroll.style.touchAction = fsMove ? 'auto' : 'none';
      const list = st.mode === 'sample' ? P().samples : P().genes, cols = st.mode === 'sample' ? S_COL : G_COL;
      $(overlay!, '#fs-legend').innerHTML = st.mode === 'done' ? '' : list.map((l, i) => `<button class="chip ${cur() === i ? 'on' : ''}" data-l="${i}" style="min-height:34px;font-size:13px;gap:6px">${st.mode === 'sample' ? `<span style="width:12px;height:12px;border-radius:6px;background:${cols[i % cols.length]};border:1.5px solid var(--line);display:inline-block"></span>` : `<span style="width:12px;height:12px;border-radius:6px;border:3px solid ${cols[i % cols.length]};display:inline-block;box-sizing:border-box"></span>`}${esc(l)}</button>`).join('') + `<button class="chip ${cur() === -1 ? 'on' : ''}" data-l="-1" style="min-height:34px;font-size:13px">eraser</button>`;
      paintGrid(); };
    $(overlay, '#fs-mode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.mode = b.dataset.m as Mode; persist(); paintHeader(); paintFs(); });
    $(overlay, '#fs-legend').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; if (st.mode === 'sample') st.curS = Number(b.dataset.l); else st.curG = Number(b.dataset.l); persist(); paintHeader(); paintFs(); });
    $(overlay, '#fs-in').addEventListener('click', () => { zoom = Math.min(4, +(zoom + 0.5).toFixed(1)); paintFs(); });
    $(overlay, '#fs-out').addEventListener('click', () => { zoom = Math.max(1, +(zoom - 0.5).toFixed(1)); paintFs(); });
    $(overlay, '#fs-move').addEventListener('click', () => { fsMove = !fsMove; paintFs(); });
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      try { if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined); } catch { /* ignore */ }
      try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
      document.removeEventListener('fullscreenchange', onFsChange); window.removeEventListener('popstate', onPop); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey);
      overlay?.remove(); overlay = null; fsBox = null; zoom = 1; fsMove = false; dragBox = gridbox; paintGrid();
    };
    // the phone's back gesture, the system's own "leave full screen", and Escape all close it
    const onFsChange = () => { if (!document.fullscreenElement) close(); };
    const onPop = () => close();
    const onResize = () => { if (overlay) paintFs(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    history.pushState({ fs: 1 }, '');
    $(overlay, '#fs-close').addEventListener('click', () => { if (history.state?.fs) history.back(); else close(); });
    window.addEventListener('popstate', onPop); window.addEventListener('resize', onResize); document.addEventListener('keydown', onKey);
    try { overlay.requestFullscreen?.().then(() => document.addEventListener('fullscreenchange', onFsChange)).catch(() => undefined); } catch { /* ignore */ }
    if (P().fmt === 384) try { (screen.orientation as any)?.lock?.('landscape').catch(() => undefined); } catch { /* ignore */ }
    paintFs();
  }
  $(main, '#fullscreen').addEventListener('click', openFullscreen);
  $(main, '#share').addEventListener('click', () => { const { id: _id, ...plate } = P(); void _id; showHandoff(`Send ${plate.name}`, { t: 'plate', v: 1, plate }); });
  $(main, '#print').addEventListener('click', async () => { const p = P(); const { id: _id, ...plate } = p; void _id; $(main, '#pqr').innerHTML = await qrSvg({ t: 'plate', v: 1, plate }); const [cc] = [fitCell(p.fmt, 700)]; gridbox.innerHTML = gridHtml(cc, GAP[p.fmt], cc >= 36 ? 12 : cc >= 20 ? 11 : 8).html; window.print(); setTimeout(paintGrid, 500); });

  $(main, '#plates').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.active = b.dataset.id!; st.curS = 0; st.curG = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#fmt').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; const f = Number(b.dataset.f) as Fmt; const p = P(); if (p.fmt === f) return; if (Object.keys(p.wells).length && !confirm('Changing the format clears the wells. Continue?')) return; p.fmt = f; p.wells = {}; persist(); paintHeader(); paintGrid(); });
  $(main, '#kind').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; const p = P(); const k = b.dataset.k as Kind; if (k === kindOf(p)) return; if (!Object.keys(p.wells).length) { const d = newPlate(p.fmt, k); p.samples = d.samples; p.genes = d.genes; st.curS = 0; st.curG = 0; } p.kind = k; persist(); paintHeader(); paintGrid(); });
  $<HTMLInputElement>(main, '#pnote').addEventListener('input', (e) => { P().note = (e.target as HTMLInputElement).value; persist(); });
  $(main, '#mode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.mode = b.dataset.m as Mode; persist(); paintHeader(); });
  legend.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; if (st.mode === 'sample') st.curS = Number(b.dataset.l); else st.curG = Number(b.dataset.l); persist(); paintHeader(); });
  const addLabel = () => { const i = $<HTMLInputElement>(main, '#newlabel'); const v = i.value.trim(); if (!v) return; const list = st.mode === 'sample' ? P().samples : P().genes; list.push(v); if (st.mode === 'sample') st.curS = list.length - 1; else st.curG = list.length - 1; i.value = ''; persist(); paintHeader(); };
  $(main, '#addlabel').addEventListener('click', addLabel);
  $<HTMLInputElement>(main, '#newlabel').addEventListener('keydown', (e) => { if (e.key === 'Enter') addLabel(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('input', (e) => { P().name = (e.target as HTMLInputElement).value; persist(); });
  $<HTMLInputElement>(main, '#pname').addEventListener('change', paintHeader);
  $(main, '#resetdone').addEventListener('click', () => { const p = P(); for (const id of Object.keys(p.wells)) { delete p.wells[id].d; if (p.wells[id].s === undefined && p.wells[id].g === undefined) delete p.wells[id]; } persist(); paintGrid(); });
  $(main, '#clear').addEventListener('click', () => { if (confirm('Clear all wells on this plate?')) { P().wells = {}; persist(); paintGrid(); } });
  $(main, '#newplate').addEventListener('click', () => { const p = newPlate(P().fmt, kindOf(P())); st.plates.push(p); st.active = p.id; st.curS = 0; st.curG = 0; persist(); paintHeader(); paintGrid(); });
  $(main, '#delplate').addEventListener('click', () => { if (st.plates.length === 1) { toast('Keep at least one plate'); return; } if (!confirm(`Delete ${P().name}?`)) return; st.plates = st.plates.filter((p) => p.id !== st.active); st.active = st.plates[0].id; persist(); paintHeader(); paintGrid(); });
  $(main, '#copy').addEventListener('click', async () => {
    const p = P(), { rows, cols } = dims(p.fmt);
    const lines = [`${p.name} (${p.fmt}-well${p.note ? `, ${p.note}` : ''})`, '\t' + Array.from({ length: cols }, (_, c) => c + 1).join('\t')];
    for (let r = 0; r < rows; r++) lines.push(rn(r) + '\t' + Array.from({ length: cols }, (_, c) => { const w = p.wells[wid(r, c)]; if (!w) return ''; return [w.s !== undefined ? p.samples[w.s] : '', w.g !== undefined ? p.genes[w.g] : ''].filter(Boolean).join(' / ') + (w.d ? ' ✓' : ''); }).join('\t'));
    if (await copyText(lines.join('\n'))) toast('Copied as a table');
  });
  paintHeader(); paintGrid();
  let rz: number | undefined;
  const onWinResize = () => { if (overlay) return; clearTimeout(rz); rz = window.setTimeout(paintGrid, 120); };
  window.addEventListener('resize', onWinResize);
  (main as any).__cleanup = () => { clearTimeout(rz); window.removeEventListener('resize', onWinResize); };
}
