import { fitCurve, curveInvert, mean, type Fit } from '../lib/calc';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';
import { addLog } from '../lib/log';
import { sevenSeg } from '../lib/sevenseg';

interface Std { conc: string; a: string[] }
interface Sample { name: string; und: string[]; dil: string[] }
type State = { stds: Std[]; lysis: string[]; samples: Sample[]; dilution: string; loadUg: string; unit: 'µg/µL' };
const DEFAULT: State = { stds: [2, 1, 0.5, 0.25, 0.1, 0].map((c) => ({ conc: String(c), a: ['', '', ''] })), lysis: ['', ''], samples: [{ name: 'S1', und: ['', ''], dil: ['', ''] }, { name: 'S2', und: ['', ''], dil: ['', ''] }], dilution: '5', loadUg: '30', unit: 'µg/µL' };
const nums = (xs: string[]) => xs.map(parseNum).filter((v): v is number => v !== undefined && !Number.isNaN(v));
const cell = (v: string, attrs: string, w = 58) => `<input type="text" inputmode="decimal" value="${esc(v)}" ${attrs} placeholder="—" style="width:${w}px;min-height:38px;padding:0 4px;font-family:var(--mono);font-size:15px;text-align:right" />`;

export function renderBca(main: HTMLElement) {
  const st = load<State>('bca', DEFAULT);
  main.append(html`
    <div class="note" style="margin-top:14px">A562. Standards in triplicate minus the water blank; samples in duplicate, undiluted and diluted, minus the lysis-buffer blank. Quadratic fit, as on the sheet.</div>
    <div class="section"><div class="cap">Standards · mg/mL</div>
      <table class="data" id="stds"><tr><th>mg/mL</th><th style="text-align:right">A1</th><th style="text-align:right">A2</th><th style="text-align:right">A3</th><th style="text-align:right">mean − blank</th></tr></table>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px"><span class="grow" style="flex:1 1 auto">Lysis buffer blank</span>${cell(st.lysis[0], 'data-l="0"')}${cell(st.lysis[1], 'data-l="1"')}</div>
    </div>
    <div class="result" id="fit" hidden>
      <div style="display:flex;gap:12px;align-items:flex-start"><div id="chart" style="flex:0 0 150px"></div><div style="flex:1 1 auto;min-width:0"><div class="cap" style="color:inherit;opacity:0.8">Standard curve</div><div class="mono" id="eq" style="font-size:13px;margin-top:4px;word-break:break-word"></div><div class="mono" id="r2" style="font-size:14px;margin-top:6px"></div><div id="warn" style="font-size:13px;margin-top:6px"></div></div></div>
    </div>
    <div class="section"><div class="cap">Samples</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><span>Sample dilution 1 :</span>${cell(st.dilution, 'id="dil"', 48)}<span style="flex:1 1 auto"></span><span>µL for</span>${cell(st.loadUg, 'id="loadug"', 48)}<span>µg</span></div>
      <table class="data" id="smp"><tr><th>Sample</th><th style="text-align:right">undil A1</th><th style="text-align:right">A2</th><th style="text-align:right">1:<span id="dilh">5</span> A1</th><th style="text-align:right">A2</th></tr></table>
      <div class="actions"><button class="btn" id="add">+ Sample</button><button class="btn quiet" id="clear">Clear all</button></div>
    </div>
    <div class="section"><div class="cap">Plate guide · 96-well</div>
      <div class="muted" style="font-size:13px;margin-top:4px">Standards in triplicate down columns 1–3, lysis-buffer blanks in G1–G2, then each sample takes four wells in a row: undiluted twice, diluted twice.</div>
      <div class="result" id="guide" style="margin-top:10px;padding:8px;overflow-x:auto"></div>
      <div class="actions"><button class="btn primary" id="toplate">Open in Plate Map</button></div>
    </div>
    <div class="section" id="out" hidden><div class="cap">Results · µg/µL</div><div id="res"></div><div class="actions"><button class="btn" id="copy">Copy table</button><button class="btn" id="log">Add to log</button></div>
      <div class="note">Final = mean of the dilutions that fall inside the standard range. Red = above the top standard.</div></div>
  `);
  const persist = () => save('bca', st);
  const stdsT = $(main, '#stds'), smpT = $(main, '#smp');
  let fit: Fit | undefined, blank = 0, lysis = 0, top = 2, summary = '';

  function paintStds() {
    $$(stdsT, 'tr.s').forEach((r) => r.remove());
    st.stds.forEach((s, i) => {
      const m = mean(nums(s.a)); const tr = document.createElement('tr'); tr.className = 's';
      tr.innerHTML = `<td>${cell(s.conc, `data-s="${i}" data-f="conc"`, 54)}</td>${[0, 1, 2].map((k) => `<td class="num">${cell(s.a[k], `data-s="${i}" data-a="${k}"`, 56)}</td>`).join('')}<td class="num" id="sm-${i}">${Number.isFinite(m) ? fmt(m - blank, 3) : '—'}</td>`;
      stdsT.append(tr);
    });
    $$<HTMLInputElement>(stdsT, 'input').forEach((inp) => inp.addEventListener('input', () => { const s = st.stds[Number(inp.dataset.s)]; if (inp.dataset.f === 'conc') s.conc = inp.value; else s.a[Number(inp.dataset.a)] = inp.value; persist(); compute(); }));
  }
  function paintSamples() {
    $$(smpT, 'tr.r').forEach((r) => r.remove());
    st.samples.forEach((s, i) => {
      const tr = document.createElement('tr'); tr.className = 'r';
      tr.innerHTML = `<td><input data-i="${i}" data-f="name" value="${esc(s.name)}" style="width:54px;min-height:38px;padding:0 6px;font-weight:700" /></td>${[0, 1].map((k) => `<td class="num">${cell(s.und[k], `data-i="${i}" data-u="${k}"`, 54)}</td>`).join('')}${[0, 1].map((k) => `<td class="num">${cell(s.dil[k], `data-i="${i}" data-d="${k}"`, 54)}</td>`).join('')}`;
      smpT.append(tr);
    });
    $$<HTMLInputElement>(smpT, 'input').forEach((inp) => inp.addEventListener('input', () => { const s = st.samples[Number(inp.dataset.i)]; if (inp.dataset.f === 'name') s.name = inp.value; else if (inp.dataset.u !== undefined) s.und[Number(inp.dataset.u)] = inp.value; else s.dil[Number(inp.dataset.d)] = inp.value; persist(); compute(); }));
  }
  function chart(pts: { x: number; y: number }[], f: Fit, samples: { x: number; y: number; ok: boolean }[]) {
    const W = 150, H = 120, pad = 18; const xmax = Math.max(top, ...samples.map((s) => s.x)) * 1.05 || 1; const ymax = Math.max(...pts.map((p) => p.y), ...samples.map((s) => s.y), f.a * xmax * xmax + f.b * xmax + f.c) * 1.08 || 1;
    const X = (x: number) => pad + (x / xmax) * (W - pad - 4), Y = (y: number) => H - pad + 2 - (y / ymax) * (H - pad - 6);
    const curve = Array.from({ length: 41 }, (_, i) => { const x = (xmax * i) / 40; return `${X(x).toFixed(1)},${Y(f.a * x * x + f.b * x + f.c).toFixed(1)}`; }).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:150px;height:120px;display:block">
      <line x1="${pad}" y1="${Y(0)}" x2="${W - 2}" y2="${Y(0)}" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="${pad}" y1="${Y(0)}" x2="${pad}" y2="4" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      <polyline points="${curve}" fill="none" stroke="var(--teal)" stroke-width="2"/>
      ${pts.map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="currentColor"/>`).join('')}
      ${samples.map((s) => `<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="3.5" fill="${s.ok ? 'var(--orange)' : 'var(--danger)'}" stroke="currentColor" stroke-width="0.8"/>`).join('')}
      <text x="${W - 2}" y="${H - 4}" font-size="8" text-anchor="end" fill="currentColor" opacity="0.7">${fmt(xmax / 1.05, 2)} mg/mL</text><text x="${pad + 3}" y="10" font-size="8" fill="currentColor" opacity="0.7">A562</text></svg>`;
  }
  /** Well assignments in the sheet's order. */
  function layout() {
    const wells: Record<string, { label: string; kind: 'std' | 'blank' | 'lysis' | 'und' | 'dil'; s?: number }> = {};
    st.stds.forEach((sd, i) => { if (i > 7) return; const row = String.fromCharCode(65 + i); const c = parseNum(sd.conc); for (let k = 1; k <= 3; k++) wells[`${row}${k}`] = { label: c === 0 ? 'blank' : `${sd.conc} mg/mL`, kind: c === 0 ? 'blank' : 'std' }; });
    const lysRow = String.fromCharCode(65 + Math.min(st.stds.length, 7)); wells[`${lysRow}1`] = { label: 'lysis buffer', kind: 'lysis' }; wells[`${lysRow}2`] = { label: 'lysis buffer', kind: 'lysis' };
    st.samples.forEach((sm, i) => { const row = String.fromCharCode(65 + (i % 8)), c0 = 4 + Math.floor(i / 8) * 4; if (c0 + 3 > 12) return; wells[`${row}${c0}`] = { label: sm.name, kind: 'und', s: i }; wells[`${row}${c0 + 1}`] = { label: sm.name, kind: 'und', s: i }; wells[`${row}${c0 + 2}`] = { label: sm.name, kind: 'dil', s: i }; wells[`${row}${c0 + 3}`] = { label: sm.name, kind: 'dil', s: i }; });
    return wells;
  }
  function paintGuide() {
    const wells = layout(); const cell = 25, gap = 2; const dil = parseNum(st.dilution) || 5;
    let h = `<div style="display:grid;grid-template-columns:18px repeat(12, ${cell}px);gap:${gap}px;width:max-content;margin:0 auto"><div></div>${Array.from({ length: 12 }, (_, c) => `<div class="mono" style="text-align:center;font-size:9px;line-height:${cell}px;opacity:0.8">${c + 1}</div>`).join('')}`;
    for (let r = 0; r < 8; r++) {
      const R = String.fromCharCode(65 + r); h += `<div class="mono" style="text-align:center;font-size:9px;line-height:${cell}px;opacity:0.8">${R}</div>`;
      for (let c = 1; c <= 12; c++) {
        const w = wells[`${R}${c}`];
        const bg = !w ? 'transparent' : w.kind === 'std' ? 'var(--teal)' : w.kind === 'blank' ? 'var(--line-soft)' : w.kind === 'lysis' ? 'var(--mustard)' : w.kind === 'und' ? 'var(--orange)' : 'transparent';
        const border = w?.kind === 'dil' ? 'var(--orange)' : w ? 'var(--line)' : 'currentColor';
        const txt = !w ? '' : w.kind === 'std' ? w.label.replace(' mg/mL', '').replace(/^0\./, '.') : w.kind === 'blank' ? 'B' : w.kind === 'lysis' ? 'L' : (w.label || '').slice(0, 3);
        h += `<div title="${esc(w ? `${R}${c} · ${w.label}${w.kind === 'dil' ? ` 1:${dil}` : w.kind === 'und' ? ' undiluted' : ''}` : `${R}${c}`)}" style="width:${cell}px;height:${cell}px;border-radius:50%;border:${w?.kind === 'dil' ? 3 : 1.5}px solid ${border};background:${bg};opacity:${w ? 1 : 0.3};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:${w && w.kind !== 'dil' && w.kind !== 'blank' ? 'var(--key-ink)' : 'inherit'};box-sizing:border-box;overflow:hidden">${esc(txt)}</div>`;
      }
    }
    $(main, '#guide').innerHTML = h + '</div>' + `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:11px"><span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--teal)"></span> standard</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--line-soft)"></span> blank</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--mustard)"></span> lysis buffer</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--orange)"></span> sample undiluted</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;border:2.5px solid var(--orange);box-sizing:border-box"></span> sample 1:${dil}</span></div>`;
  }
  function compute() {
    paintGuide();
    const blankStd = st.stds.find((s) => parseNum(s.conc) === 0);
    blank = blankStd ? mean(nums(blankStd.a)) : 0; if (!Number.isFinite(blank)) blank = 0;
    lysis = mean(nums(st.lysis)); if (!Number.isFinite(lysis)) lysis = blank;
    st.stds.forEach((s, i) => { const m = mean(nums(s.a)); const el = main.querySelector(`#sm-${i}`); if (el) el.textContent = Number.isFinite(m) ? fmt(m - blank, 3) : '—'; });
    const pts = st.stds.map((s) => ({ x: parseNum(s.conc) ?? NaN, y: mean(nums(s.a)) - blank })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    top = Math.max(...pts.map((p) => p.x), 0);
    fit = fitCurve(pts);
    const fitBox = $(main, '#fit'); fitBox.hidden = !fit;
    const dil = parseNum(st.dilution) || 5; $(main, '#dilh').textContent = String(dil);
    const out = $(main, '#out'); const rows: string[] = []; const lines: string[] = []; const spts: { x: number; y: number; ok: boolean }[] = [];
    const loadUg = parseNum(st.loadUg) || 0;
    if (fit) {
      $(main, '#eq').textContent = fit.kind === 'quadratic' ? `A = ${fmt(fit.a, 3)}·c² + ${fmt(fit.b, 3)}·c + ${fmt(fit.c, 3)}` : `A = ${fmt(fit.b, 3)}·c + ${fmt(fit.c, 3)}`;
      $(main, '#r2').textContent = `R² = ${fmt(fit.r2, 4)} · ${fit.n} points`;
      $(main, '#warn').innerHTML = fit.r2 < 0.98 ? `<span style="color:var(--danger)">Poor fit. Check a standard.</span>` : fit.n < 4 ? `<span class="muted">Linear fit: fewer than 4 standards.</span>` : '';
      for (const s of st.samples) {
        const u = mean(nums(s.und)) - lysis, d = mean(nums(s.dil)) - lysis;
        const cu = Number.isFinite(u) ? curveInvert(fit, u) : undefined, cd = Number.isFinite(d) ? curveInvert(fit, d) : undefined;
        const okU = cu !== undefined && cu >= 0 && cu <= top, okD = cd !== undefined && cd >= 0 && cd <= top;
        const fu = cu !== undefined ? cu : undefined, fd = cd !== undefined ? cd * dil : undefined;
        const fin = okU && okD ? mean([fu!, fd!]) : okD ? fd : okU ? fu : undefined;
        if (cu !== undefined && Number.isFinite(u)) spts.push({ x: cu, y: u, ok: okU }); if (cd !== undefined && Number.isFinite(d)) spts.push({ x: cd, y: d, ok: okD });
        if (!Number.isFinite(u) && !Number.isFinite(d)) continue;
        rows.push(`<div class="item" style="gap:8px"><b style="min-width:44px">${esc(s.name)}</b>
          <span class="mono" style="font-size:13px;color:${okU ? 'inherit' : 'var(--danger)'}">${fu !== undefined ? fmt(fu, 3) : '—'}</span><span class="muted" style="font-size:11px">undil</span>
          <span class="mono" style="font-size:13px;color:${okD ? 'inherit' : 'var(--danger)'}">${fd !== undefined ? fmt(fd, 3) : '—'}</span><span class="muted" style="font-size:11px">1:${dil}</span>
          <span class="grow"></span><span style="color:var(--orange)">${fin !== undefined ? sevenSeg(fmt(fin, 3).slice(0, 5), { height: 22 }) : '<span class="mono" style="color:var(--danger)">out of range</span>'}</span>
          ${fin !== undefined && loadUg ? `<span class="mono" style="font-size:13px;min-width:62px;text-align:right">${fmt(loadUg / fin, 3)} µL</span>` : ''}</div>`);
        lines.push(`${s.name}\t${fu !== undefined ? fmt(fu, 3) : ''}\t${fd !== undefined ? fmt(fd, 3) : ''}\t${fin !== undefined ? fmt(fin, 3) : 'out of range'}\t${fin !== undefined && loadUg ? fmt(loadUg / fin, 3) : ''}`);
      }
      $(main, '#chart').innerHTML = chart(pts, fit, spts);
    }
    out.hidden = rows.length === 0;
    $(main, '#res').innerHTML = `<div class="list">${rows.join('')}</div>${rows.length ? `<div class="cap" style="margin-top:6px;font-size:9px">name · undiluted · 1:${dil} · final µg/µL · µL for ${loadUg} µg</div>` : ''}`;
    summary = `Sample\tundiluted µg/µL\t1:${dil} µg/µL\tfinal µg/µL\tµL for ${loadUg} µg\n${lines.join('\n')}`;
  }
  $$<HTMLInputElement>(main, 'input[data-l]').forEach((i) => i.addEventListener('input', () => { st.lysis[Number(i.dataset.l)] = i.value; persist(); compute(); }));
  $<HTMLInputElement>(main, '#dil').addEventListener('input', (e) => { st.dilution = (e.target as HTMLInputElement).value; persist(); compute(); });
  $<HTMLInputElement>(main, '#loadug').addEventListener('input', (e) => { st.loadUg = (e.target as HTMLInputElement).value; persist(); compute(); });
  $(main, '#add').addEventListener('click', () => { st.samples.push({ name: `S${st.samples.length + 1}`, und: ['', ''], dil: ['', ''] }); persist(); paintSamples(); compute(); });
  $(main, '#clear').addEventListener('click', () => { if (!confirm('Clear all readings?')) return; Object.assign(st, JSON.parse(JSON.stringify(DEFAULT))); persist(); paintStds(); paintSamples(); compute(); });
  $(main, '#copy').addEventListener('click', async () => { if (await copyText(summary)) toast('Copied'); });
  $(main, '#log').addEventListener('click', () => addLog('bca', 'BCA', `${$(main, '#eq').textContent}\n${summary}`));
  $(main, '#toplate').addEventListener('click', () => {
    const wells = layout(); const dil = parseNum(st.dilution) || 5;
    const samples = ['Standards', 'Blank', 'Lysis buffer', ...st.samples.map((x) => x.name || '?')], genes = ['undiluted', `1:${dil}`];
    const w: Record<string, { s?: number; g?: number }> = {};
    for (const [id, x] of Object.entries(wells)) w[id] = x.kind === 'std' ? { s: 0 } : x.kind === 'blank' ? { s: 1 } : x.kind === 'lysis' ? { s: 2 } : { s: 3 + (x.s ?? 0), g: x.kind === 'und' ? 0 : 1 };
    const pm = load<{ plates: any[]; active: string; mode: string; curS: number; curG: number }>('platemap2', { plates: [], active: '', mode: 'sample', curS: 0, curG: 0 });
    const plate = { id: Math.random().toString(36).slice(2, 8), name: `BCA ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, fmt: 96, kind: 'qpcr', note: 'standards ×3 in cols 1–3, samples ×2 undiluted + ×2 diluted', samples, genes, wells: w };
    pm.plates.push(plate); pm.active = plate.id; pm.mode = 'done'; save('platemap2', pm); location.hash = '#/platemap';
  });
  paintStds(); paintSamples(); compute();
}
