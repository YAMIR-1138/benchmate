import { load, save } from '../lib/store';
import { masterMix } from '../lib/calc';
import { fmt, parseDuration, mmss } from '../lib/fmt';
import { timerEngine } from './timerEngine';
import { $, $$, esc, html, toast } from '../lib/dom';

interface Step { title: string; body: string[]; timer?: string; warnings: string[]; notes: string[]; inputs: string[]; perWell: string[] }
interface Protocol { id: string; title: string; short: string; duration?: string; tags: string[]; vessel?: string; materials: string[]; scaling: string[]; note?: string; steps: Step[] }

const RAW = import.meta.glob('@core/protocols/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function parse(id: string, src: string): Protocol {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm: Record<string, any> = {}; let body = src;
  if (m) {
    body = m[2]; let key = '';
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) { key = kv[1]; fm[key] = kv[2] === '' ? [] : kv[2].replace(/^\[(.*)\]$/, '$1').replace(/^"(.*)"$/, '$1'); if (key === 'tags' && typeof fm[key] === 'string') fm[key] = fm[key].split(',').map((s: string) => s.trim()); }
      else { const li = line.match(/^\s+-\s+"?(.*?)"?$/); if (li && Array.isArray(fm[key])) fm[key].push(li[1]); }
    }
  }
  const steps: Step[] = [];
  for (const chunk of body.split(/^## /m).slice(1)) {
    const [head, ...lines] = chunk.split('\n');
    const s: Step = { title: head.replace(/^\d+\.\s*/, '').trim(), body: [], warnings: [], notes: [], inputs: [], perWell: [] };
    for (const l of lines) {
      const t = l.trim(); if (!t) continue;
      const k = t.match(/^(timer|warning|note|input|per_well):\s*(.*)$/);
      if (!k) { s.body.push(t); continue; }
      if (k[1] === 'timer') s.timer = k[2]; else if (k[1] === 'warning') s.warnings.push(k[2]); else if (k[1] === 'note') s.notes.push(k[2]); else if (k[1] === 'input') s.inputs.push(k[2]); else s.perWell.push(k[2]);
    }
    steps.push(s);
  }
  return { id, title: fm.title ?? id, short: fm.short ?? fm.title ?? id, duration: fm.duration, tags: fm.tags ?? [], vessel: fm.vessel, materials: fm.materials ?? [], scaling: fm.scaling ?? [], note: fm.note, steps };
}
const PROTOCOLS = Object.entries(RAW).map(([p, s]) => parse(p.split('/').pop()!.replace(/\.md$/, ''), s));

/** "25 µL Opti-MEM" → {amount:25, unit:'µL', name:'Opti-MEM'}; ranges and unparsable lines return undefined amount. */
function parsePerWell(s: string) {
  const m = s.match(/^([\d.]+)\s*([^\s\d]+)\s+(.*)$/);
  return m ? { amount: Number(m[1]), unit: m[2], name: m[3] } : { amount: undefined, unit: '', name: s };
}
function timerRange(t: string): { ms: number; label: string } | undefined {
  const r = t.match(/^(\d+)-(\d+)\s*(m|h|s)$/);
  if (r) { const ms = parseDuration(r[1] + r[3]); return ms ? { ms, label: `${r[1]}–${r[2]} ${r[3] === 'm' ? 'min' : r[3]}` } : undefined; }
  const ms = parseDuration(t); return ms ? { ms, label: mmss(ms) } : undefined;
}

export function renderProtocols(main: HTMLElement) {
  const sub = (main.dataset.sub ?? '').split('/').filter(Boolean);
  const pid = sub[0]; const P = PROTOCOLS.find((p) => p.id === pid);
  if (!P) return renderList(main);
  const step = sub[1] ? Number(sub[1]) : 0;
  if (step === 0) return renderOverview(main, P);
  renderStep(main, P, Math.min(step, P.steps.length));
}

function renderList(main: HTMLElement) {
  main.append(html`<div class="list" style="padding-top:10px">${PROTOCOLS.map((p) => `<a class="item" href="#/protocols/${p.id}" style="text-decoration:none;color:inherit;min-height:64px"><div class="grow"><div style="font-weight:700;font-size:17px">${esc(p.title)}</div><div class="muted" style="font-size:13px">${p.steps.length} steps${p.duration ? ` · ${esc(p.duration)}` : ''}${p.vessel ? ` · ${esc(p.vessel)}` : ''}</div></div><span class="muted">›</span></a>`).join('')}</div>
    <div class="note">Protocols are plain Markdown files in <span class="mono">core/protocols/</span>. Add one there and it shows up here.</div>`);
}

function runState(P: Protocol) { return load<{ wells: string; inputs: Record<string, string> }>(`protocol.${P.id}`, { wells: '', inputs: {} }); }

function renderOverview(main: HTMLElement, P: Protocol) {
  const st = runState(P);
  main.append(html`
    <div style="padding-top:14px"><div style="font-family:var(--serif);font-size:28px;line-height:1.15">${esc(P.title)}</div>
      <div class="muted" style="margin-top:6px">${P.steps.length} steps${P.duration ? ` · ${esc(P.duration)}` : ''}${P.tags.length ? ` · ${esc(P.tags.join(', '))}` : ''}</div></div>
    ${P.steps.some((s) => s.perWell.length) ? `<div class="fields"><div class="field"><label for="wells">Wells this run<small>master mix = wells × amount + 10 %</small></label><input id="wells" type="text" inputmode="numeric" value="${esc(st.wells)}" placeholder="—" /></div></div>` : ''}
    ${P.note ? `<div class="note">${esc(P.note)}</div>` : ''}
    ${P.materials.length ? `<div class="section"><div class="cap">Materials</div><div class="list">${P.materials.map((m) => `<div class="item">${esc(m)}</div>`).join('')}</div></div>` : ''}
    ${P.scaling.length ? `<div class="section"><div class="cap">Other plates</div><div class="list">${P.scaling.map((m) => `<div class="item muted" style="font-size:14px">${esc(m)}</div>`).join('')}</div></div>` : ''}
    <div class="section"><div class="cap">Steps</div><div class="list">${P.steps.map((s, i) => `<a class="item" href="#/protocols/${P.id}/${i + 1}" style="text-decoration:none;color:inherit"><span class="mono muted" style="width:28px">${i + 1}</span><span class="grow">${esc(s.title)}</span>${s.timer ? `<span class="mono muted" style="font-size:12px">${esc(s.timer)}</span>` : ''}</a>`).join('')}</div></div>
    <div class="actions" style="margin-top:20px"><a class="btn primary tall" href="#/protocols/${P.id}/1">Start</a></div>
  `);
  main.querySelector<HTMLInputElement>('#wells')?.addEventListener('input', (e) => { st.wells = (e.target as HTMLInputElement).value; save(`protocol.${P.id}`, st); });
}

function renderStep(main: HTMLElement, P: Protocol, n: number) {
  const st = runState(P); const s = P.steps[n - 1]; const wells = Number(st.wells) || 0;
  const tr = s.timer ? timerRange(s.timer) : undefined;
  const mix = s.perWell.length ? `<div class="result" style="margin-top:16px;padding:12px 14px">
      <div style="display:flex;justify-content:space-between" class="cap"><span>Per well</span><span style="color:var(--orange)">${wells ? `${wells} wells + 10 %` : '<a href="#/protocols/' + P.id + '">set wells</a>'}</span></div>
      <div class="list" style="margin-top:4px">${s.perWell.map((pw) => { const p = parsePerWell(pw); return `<div class="item"><span class="grow">${esc(p.name)}</span><span class="mono muted" style="font-size:14px">${p.amount !== undefined ? `${fmt(p.amount)} ${esc(p.unit)}` : ''}</span>${wells && p.amount !== undefined ? `<span class="mono" style="color:var(--orange);font-size:18px;min-width:80px;text-align:right">${fmt(masterMix(p.amount, wells))} ${esc(p.unit)}</span>` : ''}</div>`; }).join('')}</div>
      ${s.inputs.map((inp) => `<div style="display:flex;align-items:center;gap:10px;min-height:44px;margin-top:6px"><span class="cap" style="flex:0 0 auto">${esc(inp)}</span><input data-inp="${esc(inp)}" type="text" value="${esc(st.inputs[inp] ?? '')}" style="flex:1 1 auto;min-height:40px;padding:0 10px;font-family:var(--mono);color:var(--teal);background:transparent;border:0;border-bottom:1px dashed var(--teal);border-radius:0" /></div>`).join('')}
    </div>` : s.inputs.map((inp) => `<div style="display:flex;align-items:center;gap:10px;min-height:44px;margin-top:10px"><span class="cap" style="flex:0 0 auto">${esc(inp)}</span><input data-inp="${esc(inp)}" type="text" value="${esc(st.inputs[inp] ?? '')}" style="flex:1 1 auto;min-height:40px;padding:0 10px;font-family:var(--mono);color:var(--teal);background:transparent;border:0;border-bottom:1px dashed var(--teal);border-radius:0" /></div>`).join('');
  main.append(html`
    <div style="padding-top:14px">
      <div style="display:flex;gap:4px">${P.steps.map((_, i) => `<div style="flex:1 1 0;height:4px;border-radius:2px;background:${i < n - 1 ? 'var(--teal)' : i === n - 1 ? 'var(--orange)' : 'var(--line)'}"></div>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px" class="mono muted"><a href="#/protocols/${P.id}" style="font-size:12px;color:var(--muted);text-decoration:none">${esc(P.short)} · step ${n} of ${P.steps.length}</a><span style="font-size:12px">${esc(P.vessel ?? '')}</span></div>
    </div>
    <div style="padding-top:18px">
      <div style="font-family:var(--serif);font-size:32px;line-height:1.12">${esc(s.title)}</div>
      ${s.body.map((b) => `<p style="font-size:19px;line-height:1.45;margin:12px 0 0">${esc(b)}</p>`).join('')}
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
  $$<HTMLInputElement>(main, 'input[data-inp]').forEach((i) => i.addEventListener('input', () => { st.inputs[i.dataset.inp!] = i.value; save(`protocol.${P.id}`, st); }));
  if (tr) $(main, '#t-start').addEventListener('click', () => { timerEngine.add(tr.ms, `${P.short} · ${s.title}`); timerEngine.requestNotifications(); toast(`Timer started · ${tr.label}`); });
}
