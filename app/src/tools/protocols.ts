import { load, save } from '../lib/store';
import { fmt, parseDuration, mmss, parseNum } from '../lib/fmt';
import { timerEngine } from './timerEngine';
import { $, $$, esc, html, toast } from '../lib/dom';

interface Amount { amount: number; unit: string }
interface PerWell { name: string; all?: Amount; byFormat: Record<string, Amount> }
interface FmtLine { text: string; byFormat: Record<string, string> }
interface Step { title: string; body: string[]; timer?: string; warnings: string[]; notes: string[]; inputs: string[]; perWell: PerWell[]; fmtLines: FmtLine[] }
interface Protocol { id: string; title: string; short: string; duration?: string; tags: string[]; vessel?: string; formats: string[]; materials: string[]; scaling: string[]; note?: string; steps: Step[] }
interface Condition { name: string; wells: string; conc: string }
interface Run { format: string; inputs: Record<string, string>; conditions: Condition[]; skipped: number[] }

const RAW = import.meta.glob('@core/protocols/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

const parseAmount = (s: string): Amount | undefined => { const m = s.trim().match(/^([\d.]+)\s*(.*)$/); return m ? { amount: Number(m[1]), unit: m[2].trim() } : undefined; };
/** "Opti-MEM = 12-well 50 µL; 24-well 25 µL" or "25 µL Opti-MEM" */
function parsePerWell(s: string): PerWell {
  const eq = s.indexOf('=');
  if (eq < 0) { const m = s.match(/^([\d.]+)\s*([^\s\d]+)\s+(.*)$/); return m ? { name: m[3], all: { amount: Number(m[1]), unit: m[2] }, byFormat: {} } : { name: s, byFormat: {} }; }
  const name = s.slice(0, eq).trim(), byFormat: Record<string, Amount> = {};
  for (const part of s.slice(eq + 1).split(';')) { const m = part.trim().match(/^(\S+)\s+(.*)$/); if (!m) continue; const a = parseAmount(m[2]); if (a) byFormat[m[1]] = a; }
  return { name, byFormat };
}
function parseFmt(s: string): FmtLine {
  const eq = s.indexOf('='); const byFormat: Record<string, string> = {};
  if (eq >= 0) for (const part of s.slice(eq + 1).split(';')) { const m = part.trim().match(/^(\S+)\s+(.*)$/); if (m) byFormat[m[1]] = m[2]; }
  return { text: (eq >= 0 ? s.slice(0, eq) : s).trim(), byFormat };
}

function parse(id: string, src: string): Protocol {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm: Record<string, any> = {}; let body = src;
  if (m) {
    body = m[2]; let key = '';
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) { key = kv[1]; const v = kv[2]; fm[key] = v === '' ? [] : v.startsWith('[') ? v.replace(/^\[(.*)\]$/, '$1').split(',').map((s: string) => s.trim()).filter(Boolean) : v.replace(/^"(.*)"$/, '$1'); }
      else { const li = line.match(/^\s+-\s+"?(.*?)"?$/); if (li && Array.isArray(fm[key])) fm[key].push(li[1]); }
    }
  }
  const steps: Step[] = [];
  for (const chunk of body.split(/^## /m).slice(1)) {
    const [head, ...lines] = chunk.split('\n');
    const s: Step = { title: head.replace(/^\d+\.\s*/, '').trim(), body: [], warnings: [], notes: [], inputs: [], perWell: [], fmtLines: [] };
    for (const l of lines) {
      const t = l.trim(); if (!t || t.startsWith('<!--')) continue;
      const k = t.match(/^(timer|warning|note|input|per_well|fmt):\s*(.*)$/);
      if (!k) { s.body.push(t); continue; }
      if (k[1] === 'timer') s.timer = k[2]; else if (k[1] === 'warning') s.warnings.push(k[2]); else if (k[1] === 'note') s.notes.push(k[2]); else if (k[1] === 'input') s.inputs.push(k[2]); else if (k[1] === 'per_well') s.perWell.push(parsePerWell(k[2])); else s.fmtLines.push(parseFmt(k[2]));
    }
    steps.push(s);
  }
  const fromLines = new Set<string>(); for (const s of steps) { for (const p of s.perWell) Object.keys(p.byFormat).forEach((f) => fromLines.add(f)); for (const f of s.fmtLines) Object.keys(f.byFormat).forEach((x) => fromLines.add(x)); }
  const formats: string[] = Array.isArray(fm.formats) && fm.formats.length ? fm.formats : [...fromLines];
  return { id, title: fm.title ?? id, short: fm.short ?? fm.title ?? id, duration: fm.duration, tags: Array.isArray(fm.tags) ? fm.tags : [], vessel: fm.vessel, formats, materials: fm.materials ?? [], scaling: fm.scaling ?? [], note: fm.note, steps };
}
const PROTOCOLS = Object.entries(RAW).map(([p, s]) => parse(p.split('/').pop()!.replace(/\.md$/, ''), s));

const amountFor = (p: PerWell, format: string): Amount | undefined => p.byFormat[format] ?? p.all;
const isMass = (u: string) => /^(ng|µg|ug)$/i.test(u);
const toNg = (a: Amount) => (/^(µg|ug)$/i.test(a.unit) ? a.amount * 1000 : a.amount);
function timerRange(t: string): { ms: number; label: string } | undefined {
  const r = t.match(/^(\d+)-(\d+)\s*(m|h|s)$/);
  if (r) { const ms = parseDuration(r[1] + r[3]); return ms ? { ms, label: `${r[1]}–${r[2]} ${r[3] === 'm' ? 'min' : r[3]}` } : undefined; }
  const ms = parseDuration(t); return ms ? { ms, label: mmss(ms) } : undefined;
}
function runState(P: Protocol): Run {
  const r = load<Partial<Run> & { wells?: string }>(`protocol.${P.id}`, {});
  return { format: r.format && P.formats.includes(r.format) ? r.format : (P.vessel && P.formats.includes(P.vessel) ? P.vessel : P.formats[0] ?? ''), inputs: r.inputs ?? {}, conditions: r.conditions?.length ? r.conditions : [{ name: '', wells: r.wells ?? '', conc: '' }], skipped: r.skipped ?? [] };
}
const totalWells = (run: Run) => run.conditions.reduce((s, c) => s + (parseNum(c.wells) ?? 0), 0);
/** Volume line for one reagent in one condition's tube. */
function tubeLine(p: PerWell, run: Run, c: Condition): { name: string; text: string; ok: boolean } {
  const a = amountFor(p, run.format); const w = parseNum(c.wells) ?? 0;
  if (!a) return { name: p.name, text: '—', ok: false };
  if (!w) return { name: p.name, text: `${fmt(a.amount)} ${a.unit} / well`, ok: false };
  if (isMass(a.unit)) { const ng = toNg(a) * w; const conc = parseNum(c.conc); return conc ? { name: p.name, text: `${fmt(ng / conc, 3)} µL`, ok: true } : { name: p.name, text: `${fmt(ng)} ng`, ok: true }; }
  return { name: p.name, text: `${fmt(a.amount * w, 4)} ${a.unit}`, ok: true };
}
const inputField = (P: Protocol, run: Run, label: string) => `<span style="display:inline-flex;align-items:baseline;gap:8px;margin:4px 12px 0 0"><span class="cap" style="font-size:10px">${esc(label)}</span><input data-inp="${esc(label)}" type="text" value="${esc(run.inputs[label] ?? '')}" style="min-width:120px;min-height:36px;padding:0 8px;font-family:var(--mono);font-size:15px;color:var(--teal);background:transparent;border:0;border-bottom:2px dashed var(--teal);border-radius:0" /></span>`;

export function renderProtocols(main: HTMLElement) {
  const sub = (main.dataset.sub ?? '').split('/').filter(Boolean);
  const P = PROTOCOLS.find((p) => p.id === sub[0]);
  if (!P) return renderList(main);
  const step = sub[1] ? Number(sub[1]) : 0;
  if (step === 0) return renderSheet(main, P);
  renderStep(main, P, Math.min(step, P.steps.length));
}

function renderList(main: HTMLElement) {
  main.append(html`<div class="list" style="padding-top:10px">${PROTOCOLS.map((p) => `<a class="item" href="#/protocols/${p.id}" style="text-decoration:none;color:inherit;min-height:64px"><div class="grow"><div style="font-weight:700;font-size:17px">${esc(p.title)}</div><div class="muted" style="font-size:13px">${p.steps.length} steps${p.duration ? ` · ${esc(p.duration)}` : ''}${p.formats.length ? ` · ${esc(p.formats.join(', '))}` : p.vessel ? ` · ${esc(p.vessel)}` : ''}</div></div><span class="muted">›</span></a>`).join('')}</div>
    <div class="note">Protocols are plain Markdown files in <span class="mono">core/protocols/</span>. Add one there and it shows up here.</div>`);
}

// ---- the worksheet: the whole protocol on one page, like the paper ----
function renderSheet(main: HTMLElement, P: Protocol) {
  const run = runState(P);
  const persist = () => save(`protocol.${P.id}`, run);
  const hasTubes = P.steps.some((s) => s.perWell.length);
  main.append(html`
    <div style="padding-top:14px"><div style="font-family:var(--display);font-weight:700;font-size:26px;line-height:1.15">${esc(P.title)}</div>
      <div class="muted" style="margin-top:4px;font-size:14px">${P.duration ? esc(P.duration) : ''}${P.tags.length ? ` · ${esc(P.tags.join(', '))}` : ''}</div></div>
    ${P.formats.length ? `<div class="chips" id="formats" style="padding-top:10px">${P.formats.map((f) => `<button class="chip ${f === run.format ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}</button>`).join('')}</div>` : ''}
    ${P.note ? `<div class="note">${esc(P.note)}</div>` : ''}
    ${hasTubes ? `<div class="section"><div class="cap">Conditions</div><div id="conds"></div><div class="actions" style="margin-top:8px"><button class="btn" id="addc">+ Condition</button></div><div class="hint" style="text-transform:none;letter-spacing:0">Wells can be 4.5: half a well covers pipetting loss, like on the sheet. Plasmid ng/µL turns the DNA into µL.</div></div>` : ''}
    <div class="section"><div class="cap">Steps <span class="muted" style="letter-spacing:0;text-transform:none">· tap a number to cross a step out</span></div><div id="steps" class="list" style="margin-top:6px"></div></div>
    ${hasTubes ? `<div class="section"><div class="cap">Tubes</div><div id="tubes"></div></div>` : ''}
    ${P.materials.length ? `<div class="section"><div class="cap">Materials</div><div class="list">${P.materials.map((m) => `<div class="item" style="min-height:40px">${esc(m)}</div>`).join('')}</div></div>` : ''}
    <div class="actions" style="margin-top:20px"><a class="btn primary tall" href="#/protocols/${P.id}/1">Step by step</a><a class="btn" href="#/platemap">Plate map</a></div>
  `);
  function paintConds() {
    const box = main.querySelector('#conds'); if (!box) return;
    box.innerHTML = run.conditions.map((c, i) => `<div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <input data-c="${i}" data-f="name" value="${esc(c.name)}" placeholder="EV, WT…" style="flex:1 1 90px;min-width:80px;min-height:44px;padding:0 10px;font-weight:700" />
      <input data-c="${i}" data-f="wells" value="${esc(c.wells)}" placeholder="wells" inputmode="decimal" style="flex:0 0 66px;min-height:44px;padding:0 8px;font-family:var(--mono);text-align:right" />
      <input data-c="${i}" data-f="conc" value="${esc(c.conc)}" placeholder="ng/µL" inputmode="decimal" style="flex:0 0 78px;min-height:44px;padding:0 8px;font-family:var(--mono);text-align:right" />
      <button class="x" data-del="${i}" style="width:30px;height:40px;padding:0;border:0;background:transparent;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>`).join('') + `<div class="mono muted" style="font-size:12px;margin-top:6px;text-align:right">total ${fmt(totalWells(run), 4)} wells</div>`;
    $$<HTMLInputElement>(box, 'input[data-c]').forEach((inp) => inp.addEventListener('input', () => { (run.conditions[Number(inp.dataset.c)] as any)[inp.dataset.f!] = inp.value; persist(); paintSteps(); paintTubes(); box.querySelector('.mono.muted')!.textContent = `total ${fmt(totalWells(run), 4)} wells`; }));
    $$<HTMLElement>(box, '[data-del]').forEach((b) => b.addEventListener('click', () => { if (run.conditions.length > 1) { run.conditions.splice(Number(b.dataset.del), 1); persist(); paintConds(); paintSteps(); paintTubes(); } }));
  }
  function paintSteps() {
    const tw = totalWells(run);
    $(main, '#steps').innerHTML = P.steps.map((s, i) => {
      const n = i + 1, skipped = run.skipped.includes(n), tr = s.timer ? timerRange(s.timer) : undefined;
      const per = s.perWell.map((p) => { const a = amountFor(p, run.format); return `<div style="display:flex;justify-content:space-between;gap:10px;font-size:15px"><span>${esc(p.name)}</span><span class="mono">${a ? `${fmt(a.amount)} ${esc(a.unit)} / well` : '<span class="muted">—</span>'}${a && tw ? ` <b style="color:var(--orange)">→ ${isMass(a.unit) ? fmt(toNg(a) * tw) + ' ng' : fmt(a.amount * tw, 4) + ' ' + esc(a.unit)}</b>` : ''}</span></div>`; }).join('');
      const fl = s.fmtLines.map((f) => `<div style="font-size:16px">${esc(f.text)} <b>${f.byFormat[run.format] ? esc(f.byFormat[run.format]) : `<span class="muted">(not set for ${esc(run.format)})</span>`}</b></div>`).join('');
      return `<div class="item" style="align-items:flex-start;padding:10px 0;gap:10px;${skipped ? 'opacity:0.45' : ''}">
        <button data-skip="${n}" style="flex:0 0 36px;height:36px;border:var(--bw) solid var(--line);border-radius:18px;background:${skipped ? 'var(--line)' : 'var(--panel)'};color:${skipped ? 'var(--bg)' : 'inherit'};font-family:var(--mono);font-weight:700;cursor:pointer">${n}</button>
        <div class="grow" style="${skipped ? 'text-decoration:line-through' : ''}">
          <div style="font-weight:700;font-size:17px">${esc(s.title)}</div>
          ${s.body.map((b) => `<div style="font-size:16px">${esc(b)}</div>`).join('')}${fl}${per}
          ${s.warnings.map((w) => `<div style="font-size:14px;color:var(--orange);font-weight:700">${esc(w)}</div>`).join('')}
          ${s.notes.map((w) => `<div class="muted" style="font-size:14px">${esc(w)}</div>`).join('')}
          ${s.inputs.length ? `<div>${s.inputs.map((l) => inputField(P, run, l)).join('')}</div>` : ''}
          ${tr ? `<button class="chip" data-timer="${i}" style="margin-top:6px;min-height:36px;font-size:13px">Start timer · ${esc(tr.label)}</button>` : ''}
        </div></div>`;
    }).join('');
    $$<HTMLElement>(main, '[data-skip]').forEach((b) => b.addEventListener('click', () => { const n = Number(b.dataset.skip); run.skipped = run.skipped.includes(n) ? run.skipped.filter((x) => x !== n) : [...run.skipped, n]; persist(); paintSteps(); }));
    $$<HTMLInputElement>(main, '#steps input[data-inp]').forEach((i) => i.addEventListener('input', () => { run.inputs[i.dataset.inp!] = i.value; persist(); }));
    $$<HTMLElement>(main, '[data-timer]').forEach((b) => b.addEventListener('click', () => { const s = P.steps[Number(b.dataset.timer)]; const tr = timerRange(s.timer!)!; timerEngine.add(tr.ms, `${P.short} · ${s.title}`); timerEngine.requestNotifications(); toast(`Timer started · ${tr.label}`); }));
  }
  function paintTubes() {
    const box = main.querySelector('#tubes'); if (!box) return;
    const mixSteps = P.steps.filter((s) => s.perWell.length);
    box.innerHTML = run.conditions.map((c) => `<div class="result" style="margin-top:10px;padding:12px 14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:18px">${esc(c.name || 'Condition')}</b><span class="mono" style="font-size:13px;opacity:0.8">${c.wells ? `${esc(c.wells)} wells` : 'wells?'}${c.conc ? ` · ${esc(c.conc)} ng/µL` : ''}</span></div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(mixSteps.length, 2)}, minmax(0, 1fr));gap:12px;margin-top:8px">${mixSteps.map((s) => `<div><div class="cap" style="color:inherit;opacity:0.8;font-size:10px">${esc(s.title.replace(/:.*$/, ''))}</div>${s.perWell.map((p) => { const t = tubeLine(p, run, c); return `<div style="display:flex;justify-content:space-between;gap:6px;font-size:14px;margin-top:4px"><span>${esc(t.name)}</span><b class="mono" style="color:${t.ok ? 'var(--orange)' : 'inherit'};white-space:nowrap">${esc(t.text)}</b></div>`; }).join('')}</div>`).join('')}</div>
    </div>`).join('');
  }
  main.querySelector('#formats')?.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; run.format = b.dataset.f!; persist(); $$(main, '#formats .chip').forEach((x) => x.classList.toggle('on', x === b)); paintSteps(); paintTubes(); });
  main.querySelector('#addc')?.addEventListener('click', () => { run.conditions.push({ name: '', wells: run.conditions[0]?.wells ?? '', conc: '' }); persist(); paintConds(); paintTubes(); });
  paintConds(); paintSteps(); paintTubes();
}

// ---- one step per screen ----
function renderStep(main: HTMLElement, P: Protocol, n: number) {
  const run = runState(P); const s = P.steps[n - 1]; const tw = totalWells(run); const skipped = run.skipped.includes(n);
  const tr = s.timer ? timerRange(s.timer) : undefined;
  const mix = s.perWell.length ? `<div class="result" style="margin-top:16px;padding:12px 14px">
      <div style="display:flex;justify-content:space-between" class="cap"><span>Per well · ${esc(run.format)}</span><span style="color:var(--orange)">${tw ? `${fmt(tw, 4)} wells total` : '<a href="#/protocols/' + P.id + '">set conditions</a>'}</span></div>
      <div class="list" style="margin-top:4px">${s.perWell.map((p) => { const a = amountFor(p, run.format); return `<div class="item"><span class="grow">${esc(p.name)}</span><span class="mono muted" style="font-size:14px">${a ? `${fmt(a.amount)} ${esc(a.unit)}` : '—'}</span>${a && tw ? `<span class="mono" style="color:var(--orange);font-size:18px;min-width:80px;text-align:right">${isMass(a.unit) ? fmt(toNg(a) * tw) + ' ng' : fmt(a.amount * tw, 4) + ' ' + esc(a.unit)}</span>` : ''}</div>`; }).join('')}</div>
      ${run.conditions.length > 1 || run.conditions[0].conc ? `<div class="cap" style="margin-top:10px;color:inherit;opacity:0.8">Per tube</div>${run.conditions.map((c) => `<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:14px;margin-top:4px"><b style="min-width:60px">${esc(c.name || 'Cond.')}</b>${s.perWell.map((p) => { const t = tubeLine(p, run, c); return `<span>${esc(t.name)} <b class="mono" style="color:var(--orange)">${esc(t.text)}</b></span>`; }).join('')}</div>`).join('')}` : ''}
      ${s.inputs.map((l) => `<div style="margin-top:6px">${inputField(P, run, l)}</div>`).join('')}
    </div>` : s.inputs.map((l) => `<div style="margin-top:10px">${inputField(P, run, l)}</div>`).join('');
  main.append(html`
    <div style="padding-top:14px">
      <div style="display:flex;gap:4px">${P.steps.map((_, i) => `<div style="flex:1 1 0;height:4px;border-radius:2px;background:${i < n - 1 ? 'var(--teal)' : i === n - 1 ? 'var(--orange)' : 'var(--line-soft)'};${run.skipped.includes(i + 1) ? 'opacity:0.3' : ''}"></div>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px" class="mono muted"><a href="#/protocols/${P.id}" style="font-size:12px;color:var(--muted);text-decoration:none">${esc(P.short)} · step ${n} of ${P.steps.length}</a><span style="font-size:12px">${esc(run.format)}</span></div>
    </div>
    <div style="padding-top:18px;${skipped ? 'opacity:0.5' : ''}">
      ${skipped ? `<div class="cap" style="color:var(--orange)">Crossed out on this run</div>` : ''}
      <div style="font-family:var(--display);font-weight:700;font-size:30px;line-height:1.12;${skipped ? 'text-decoration:line-through' : ''}">${esc(s.title)}</div>
      ${s.body.map((b) => `<p style="font-size:19px;line-height:1.45;margin:12px 0 0">${esc(b)}</p>`).join('')}
      ${s.fmtLines.map((f) => `<p style="font-size:19px;line-height:1.45;margin:12px 0 0">${esc(f.text)} <b>${f.byFormat[run.format] ? esc(f.byFormat[run.format]) : `<span class="muted">(not set for ${esc(run.format)})</span>`}</b></p>`).join('')}
      ${s.warnings.map((w) => `<div class="note warn">${esc(w)}</div>`).join('')}
      ${mix}
      ${s.notes.map((w) => `<div class="note">${esc(w)}</div>`).join('')}
      ${tr ? `<div class="chips"><button class="chip" id="t-start" style="min-height:48px;font-size:16px">Start timer · ${esc(tr.label)}</button></div>` : ''}
    </div>
    <div class="actions" style="margin-top:28px">
      <a class="btn tall" href="#/protocols/${P.id}/${n - 1 || ''}" style="flex:1">Back</a>
      ${n < P.steps.length ? `<a class="btn primary tall" href="#/protocols/${P.id}/${n + 1}" style="flex:2">Next: ${esc(P.steps[n].title)}</a>` : `<a class="btn orange tall" href="#/protocols/${P.id}" style="flex:2">Done</a>`}
    </div>
  `);
  $$<HTMLInputElement>(main, 'input[data-inp]').forEach((i) => i.addEventListener('input', () => { run.inputs[i.dataset.inp!] = i.value; save(`protocol.${P.id}`, run); }));
  if (tr) $(main, '#t-start').addEventListener('click', () => { timerEngine.add(tr.ms, `${P.short} · ${s.title}`); timerEngine.requestNotifications(); toast(`Timer started · ${tr.label}`); });
}
