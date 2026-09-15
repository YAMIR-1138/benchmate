import { load, save } from '../lib/store';
import { fmt, parseDuration, mmss, parseNum, sci } from '../lib/fmt';
import { timerEngine } from './timerEngine';
import { $, $$, esc, html, toast } from '../lib/dom';

interface Amount { amount: number; unit: string }
interface PerWell { name: string; all?: Amount; byFormat: Record<string, Amount>; editable?: boolean; ratio?: { amount: number; unit: string; per: 'µg' | 'ng'; ref: string } }
interface FmtLine { text: string; byFormat: Record<string, string> }
interface Block { title: string; body: string[]; timer?: string; warnings: string[]; notes: string[]; inputs: string[]; blanks: string[]; hints: FmtLine[]; perWell: PerWell[]; fmtLines: FmtLine[] }
interface Step extends Block { subs: Block[] }
interface Protocol { id: string; title: string; short: string; duration?: string; tags: string[]; vessel?: string; formats: string[]; materials: string[]; scaling: string[]; note?: string; steps: Step[] }
interface Condition { name: string; wells: string; conc: string }
interface Run { format: string; inputs: Record<string, string>; amounts: Record<string, string>; conditions: Condition[]; skipped: number[] }

const RAW = import.meta.glob('@core/protocols/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

const newBlock = (title: string): Block => ({ title, body: [], warnings: [], notes: [], inputs: [], blanks: [], hints: [], perWell: [], fmtLines: [] });
const parseAmount = (s: string): Amount | undefined => { const m = s.trim().match(/^([\d.]+)\s*(.*)$/); return m ? { amount: Number(m[1]), unit: m[2].trim() } : undefined; };
function parsePerWell(raw: string): PerWell {
  const editable = /\|\s*editable\s*$/i.test(raw); const s = raw.replace(/\|\s*editable\s*$/i, '').trim();
  const eq = s.indexOf('=');
  if (eq >= 0) { const r = s.slice(eq + 1).trim().match(/^([\d.]+)\s*(\S+)\s+per\s+(µg|ug|ng)\s+(.+)$/i); if (r) return { name: s.slice(0, eq).trim(), byFormat: {}, editable, ratio: { amount: Number(r[1]), unit: r[2], per: /ng/i.test(r[3]) ? 'ng' : 'µg', ref: r[4].trim() } }; }
  const pw = parsePerWellPlain(s); pw.editable = editable; return pw;
}
function parsePerWellPlain(s: string): PerWell {
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
function feed(b: Block, t: string) {
  const k = t.match(/^(timer|warning|note|input|blank|hint|per_well|fmt):\s*(.*)$/);
  if (!k) { b.body.push(t); return; }
  if (k[1] === 'timer') b.timer = k[2]; else if (k[1] === 'warning') b.warnings.push(k[2]); else if (k[1] === 'note') b.notes.push(k[2]); else if (k[1] === 'input') b.inputs.push(k[2]); else if (k[1] === 'blank') b.blanks.push(k[2]); else if (k[1] === 'hint') b.hints.push(parseFmt(k[2])); else if (k[1] === 'per_well') b.perWell.push(parsePerWell(k[2])); else b.fmtLines.push(parseFmt(k[2]));
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
    const s: Step = { ...newBlock(head.replace(/^\d+\.\s*/, '').trim()), subs: [] };
    let cur: Block = s;
    for (const l of lines) {
      const t = l.trim(); if (!t || t.startsWith('<!--')) continue;
      if (t.startsWith('### ')) { cur = newBlock(t.slice(4).replace(/^[a-z]\.\s*/, '').trim()); s.subs.push(cur); continue; }
      feed(cur, t);
    }
    steps.push(s);
  }
  const found = new Set<string>();
  const walk = (b: Block) => { b.perWell.forEach((p) => Object.keys(p.byFormat).forEach((f) => found.add(f))); b.fmtLines.forEach((f) => Object.keys(f.byFormat).forEach((x) => found.add(x))); };
  steps.forEach((s) => { walk(s); s.subs.forEach(walk); });
  const formats: string[] = Array.isArray(fm.formats) && fm.formats.length ? fm.formats : [...found];
  return { id, title: fm.title ?? id, short: fm.short ?? fm.title ?? id, duration: fm.duration, tags: Array.isArray(fm.tags) ? fm.tags : [], vessel: fm.vessel, formats, materials: fm.materials ?? [], scaling: fm.scaling ?? [], note: fm.note, steps };
}
const PROTOCOLS = Object.entries(RAW).map(([p, s]) => parse(p.split('/').pop()!.replace(/\.md$/, ''), s));

let ALL: PerWell[] = [];
const baseAmount = (p: PerWell, run: Run): Amount | undefined => {
  const a = p.byFormat[run.format] ?? p.all; if (!a) return undefined;
  if (p.editable) { const o = parseNum(run.amounts[`${run.format}:${p.name}`] ?? ''); if (o !== undefined && !Number.isNaN(o)) return { amount: o, unit: a.unit }; }
  return a;
};
/** Amount per well after overrides and ratios. */
function amountFor(p: PerWell, run: Run): Amount | undefined {
  if (!p.ratio) return baseAmount(p, run);
  const ref = ALL.find((x) => x.name.toLowerCase() === p.ratio!.ref.toLowerCase()); const ra = ref ? baseAmount(ref, run) : undefined;
  if (!ra || !isMass(ra.unit)) return undefined;
  const ng = toNg(ra); return { amount: p.ratio.amount * (p.ratio.per === 'µg' ? ng / 1000 : ng), unit: p.ratio.unit };
}
const isMass = (u: string) => /^(ng|µg|ug)$/i.test(u);
const toNg = (a: Amount) => (/^(µg|ug)$/i.test(a.unit) ? a.amount * 1000 : a.amount);
const blocksWithMix = (P: Protocol): Block[] => P.steps.flatMap((s) => [s, ...s.subs]).filter((b) => b.perWell.length);
const setAll = (P: Protocol) => { ALL = blocksWithMix(P).flatMap((b) => b.perWell); };
function timerRange(t: string): { ms: number; label: string } | undefined {
  const r = t.match(/^(\d+)-(\d+)\s*(m|h|s)$/);
  if (r) { const ms = parseDuration(r[1] + r[3]); return ms ? { ms, label: `${r[1]}–${r[2]} ${r[3] === 'm' ? 'min' : r[3]}` } : undefined; }
  const ms = parseDuration(t); return ms ? { ms, label: mmss(ms) } : undefined;
}
function runState(P: Protocol): Run {
  const r = load<Partial<Run> & { wells?: string }>(`protocol.${P.id}`, {});
  setAll(P);
  return { format: r.format && P.formats.includes(r.format) ? r.format : (P.vessel && P.formats.includes(P.vessel) ? P.vessel : P.formats[0] ?? ''), inputs: r.inputs ?? {}, amounts: r.amounts ?? {}, conditions: r.conditions?.length ? r.conditions : [{ name: '', wells: r.wells ?? '', conc: '' }], skipped: r.skipped ?? [] };
}
const totalWells = (run: Run) => run.conditions.reduce((s, c) => s + (parseNum(c.wells) ?? 0), 0);
/** What goes in one tube for one reagent. DNA in ng becomes µL when the plasmid concentration is known. */
function tube(p: PerWell, run: Run, c: Condition): { text: string; calc?: string; tiny?: string } {
  const a = amountFor(p, run); const w = parseNum(c.wells) ?? 0;
  if (!a || !w) return { text: '' };
  if (isMass(a.unit)) {
    const ng = toNg(a) * w, conc = parseNum(c.conc);
    if (!conc) return { text: `${fmt(ng)} ng` };
    const ul = ng / conc;
    return { text: `${fmt(ul, 3)} µL`, calc: `${c.name || 'DNA'}: ${fmt(toNg(a))} ng × ${fmt(w, 4)} ÷ ${fmt(conc)} ng/µL = ${fmt(ul, 3)} µL`, tiny: ul < 1 ? `dilute the plasmid 1:10 and take ${fmt(ul * 10, 3)} µL` : undefined };
  }
  return { text: `${fmt(a.amount * w, 4)} ${a.unit}` };
}
const TUBE_SVG = `<svg viewBox="0 0 34 64" aria-hidden="true"><path d="M9 8 h16 l-1 4 h-14 z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 12 v34 q6 12 12 0 v-34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 3 l6 5" stroke="currentColor" stroke-width="1.6"/></svg>`;
const blankHtml = (label: string, run: Run) => `<span class="blank"><input class="pen" data-inp="${esc(label)}" value="${esc(run.inputs[label] ?? '')}" aria-label="${esc(label)}" /></span>`;
const filled = (v: string) => `<span class="blank"><span class="pen">${esc(v)}</span></span>`;

export function renderProtocols(main: HTMLElement) {
  const sub = (main.dataset.sub ?? '').split('/').filter(Boolean);
  const P = PROTOCOLS.find((p) => p.id === sub[0]);
  if (!P) return renderList(main);
  const step = sub[1] ? Number(sub[1]) : 0;
  if (step === 0) return renderPaper(main, P);
  renderStep(main, P, Math.min(step, P.steps.length));
}

function renderList(main: HTMLElement) {
  main.append(html`<div class="list" style="padding-top:10px">${PROTOCOLS.map((p) => `<a class="item" href="#/protocols/${p.id}" style="text-decoration:none;color:inherit;min-height:64px"><div class="grow"><div style="font-weight:700;font-size:17px">${esc(p.title)}</div><div class="muted" style="font-size:13px">${p.steps.length} steps${p.duration ? ` · ${esc(p.duration)}` : ''}${p.formats.length ? ` · ${esc(p.formats.join(', '))}` : p.vessel ? ` · ${esc(p.vessel)}` : ''}</div></div><span class="muted">›</span></a>`).join('')}</div>
    <div class="note">Protocols are plain Markdown files in <span class="mono">core/protocols/</span>. Add one there and it shows up here.</div>`);
}

// ---- the paper edition ----
function renderPaper(main: HTMLElement, P: Protocol) {
  const run = runState(P);
  const persist = () => save(`protocol.${P.id}`, run);
  const mixes = blocksWithMix(P);
  main.append(html`
    ${P.formats.length ? `<div class="chips" id="formats" style="padding-top:14px">${P.formats.map((f) => `<button class="chip ${f === run.format ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}</button>`).join('')}</div>` : ''}
    <div class="paper">
      <h2>${esc(P.title)}</h2>
      ${mixes.length ? `<div class="corner" id="corner"></div>` : ''}
      <ol id="steps"></ol>
      ${mixes.length ? `<div class="tubes" id="tubes"></div><div class="calc" id="calc"></div>` : ''}
    </div>
    <div class="actions" style="margin-top:16px"><a class="btn primary tall" href="#/protocols/${P.id}/1">Step by step</a><a class="btn" href="#/platemap">Plate map</a></div>
    ${P.materials.length ? `<div class="section"><div class="cap">Materials</div><div class="list">${P.materials.map((m) => `<div class="item" style="min-height:40px">${esc(m)}</div>`).join('')}</div></div>` : ''}
  `);
  const tw = () => totalWells(run);
  const blockHtml = (b: Block, idx: string): string => {
    const parts: string[] = [];
    const fl = b.fmtLines.map((f) => `${esc(f.text)} ${f.byFormat[run.format] ? `<b>${esc(f.byFormat[run.format])}</b>` : `<span class="muted">(not set for ${esc(run.format)})</span>`}`);
    const sentence = [...fl, ...b.body.map(esc)];
    const head = (sentence.length ? (sentence.every((x) => x.startsWith('(')) ? [esc(b.title), ...sentence] : sentence) : [esc(b.title)]).join(' ');
    const hints = b.hints.map((h) => { const v = Object.keys(h.byFormat).length ? h.byFormat[run.format] : ''; return v || !Object.keys(h.byFormat).length ? ` <span class="muted" style="font-size:14px">(${esc(h.text)} ${esc(v)})</span>` : ''; }).join('');
    parts.push(`<span class="txt">${head}</span>${b.blanks.map((l) => ' ' + blankHtml(l, run)).join('')}${hints}`);
    if (b.inputs.length) parts.push(`<ul>${b.inputs.map((l) => `<li><span class="txt">${esc(l)}:</span> ${blankHtml(l, run)}</li>`).join('')}</ul>`);
    if (b.perWell.length) parts.push(`<ul>${b.perWell.map((p) => { const a = amountFor(p, run); const w = tw(); const total = a && w ? (isMass(a.unit) ? `${fmt(toNg(a) * w)} ng` : `${fmt(a.amount * w, 4)} ${a.unit}`) : '';
      const lead = p.editable && a ? `<span class="blank" style="min-width:60px"><input class="pen" data-amt="${esc(p.name)}" value="${esc(run.amounts[`${run.format}:${p.name}`] ?? String(a.amount))}" inputmode="decimal" style="width:64px" /></span> ${esc(a.unit)} ` : p.ratio ? `<span class="muted" style="font-size:14px">${fmt(p.ratio.amount)} ${esc(p.ratio.unit)}/${p.ratio.per} ${esc(p.ratio.ref)} →</span> ${a ? `<b>${fmt(a.amount, 3)} ${esc(a.unit)}</b> ` : ''}` : a ? `${fmt(a.amount)} ${esc(a.unit)} ` : '';
      return `<li><span class="txt">${lead}${esc(p.name)} per well</span> ${total ? filled(total) : '<span class="blank">&nbsp;</span>'}</li>`; }).join('')}</ul>`);
    if (b.warnings.length) parts.push(b.warnings.map((w) => `<div style="color:var(--orange);font-weight:700;font-size:14px">${esc(w)}</div>`).join(''));
    if (b.notes.length) parts.push(b.notes.map((w) => `<div class="muted" style="font-size:14px">${esc(w)}</div>`).join(''));
    if (b.timer) { const tr = timerRange(b.timer); if (tr) parts.push(` <button class="chip" data-timer="${idx}" style="min-height:30px;font-size:12px;padding:0 10px;vertical-align:middle">timer ${esc(tr.label)}</button>`); }
    return parts.join('');
  };
  function paintSteps() {
    $(main, '#steps').innerHTML = P.steps.map((s, i) => {
      const n = i + 1, struck = run.skipped.includes(n);
      return `<li class="${struck ? 'struck' : ''}" style="list-style:none"><button class="num" data-skip="${n}" title="cross out">${n}.</button>${blockHtml(s, String(i))}${s.subs.length ? `<ol>${s.subs.map((b, j) => `<li>${blockHtml(b, `${i}.${j}`)}</li>`).join('')}</ol>` : ''}</li>`;
    }).join('');
    $$<HTMLElement>(main, '[data-skip]').forEach((b) => b.addEventListener('click', () => { const n = Number(b.dataset.skip); run.skipped = run.skipped.includes(n) ? run.skipped.filter((x) => x !== n) : [...run.skipped, n]; persist(); paintSteps(); }));
    $$<HTMLInputElement>(main, '#steps input[data-inp]').forEach((i) => i.addEventListener('input', () => { run.inputs[i.dataset.inp!] = i.value; persist(); paintCalc(); }));
    $$<HTMLInputElement>(main, '#steps input[data-amt]').forEach((i) => i.addEventListener('input', () => { run.amounts[`${run.format}:${i.dataset.amt}`] = i.value; persist(); const keep = i.dataset.amt; paintSteps(); paintTubes(); paintCalc(); const again = main.querySelector<HTMLInputElement>(`#steps input[data-amt="${keep}"]`); if (again) { again.focus(); const n = again.value.length; again.setSelectionRange(n, n); } }));
    $$<HTMLElement>(main, '[data-timer]').forEach((b) => b.addEventListener('click', () => { const [i, j] = b.dataset.timer!.split('.').map(Number); const blk = j === undefined || Number.isNaN(j) ? P.steps[i] : P.steps[i].subs[j]; const tr = timerRange(blk.timer!)!; timerEngine.add(tr.ms, `${P.short} · ${blk.title}`); timerEngine.requestNotifications(); toast(`Timer started · ${tr.label}`); }));
  }
  function paintCorner() {
    const box = main.querySelector('#corner'); if (!box) return;
    box.innerHTML = `<div class="row cap" style="font-size:10px"><span style="flex:1 1 auto">plasmid / condition</span><span style="flex:0 0 66px;text-align:right">ng/µL</span><span style="flex:0 0 58px;text-align:right">wells</span><span style="flex:0 0 26px"></span></div>` +
      run.conditions.map((c, i) => `<div class="row"><input class="pen" data-c="${i}" data-f="name" value="${esc(c.name)}" placeholder="EV" style="flex:1 1 0;width:0;min-width:0" /><input class="pen" data-c="${i}" data-f="conc" value="${esc(c.conc)}" placeholder="823" inputmode="decimal" style="flex:0 0 66px;width:66px;text-align:right" /><input class="pen" data-c="${i}" data-f="wells" value="${esc(c.wells)}" placeholder="4.5" inputmode="decimal" style="flex:0 0 58px;width:58px;text-align:right" /><button data-del="${i}" style="flex:0 0 26px;border:0;background:transparent;color:var(--muted);font-size:20px;cursor:pointer;padding:0">×</button></div>`).join('') +
      `<div class="row" style="justify-content:space-between"><button class="chip" id="addc" style="min-height:32px;font-size:12px">+ condition</button><span class="mono muted" style="font-size:12px">${fmt(tw(), 4)} wells total</span></div>`;
    $$<HTMLInputElement>(box, 'input[data-c]').forEach((inp) => inp.addEventListener('input', () => { (run.conditions[Number(inp.dataset.c)] as any)[inp.dataset.f!] = inp.value; persist(); paintSteps(); paintTubes(); paintCalc(); box.querySelector('.mono.muted')!.textContent = `${fmt(tw(), 4)} wells total`; }));
    $$<HTMLElement>(box, '[data-del]').forEach((b) => b.addEventListener('click', () => { if (run.conditions.length > 1) { run.conditions.splice(Number(b.dataset.del), 1); persist(); paintCorner(); paintSteps(); paintTubes(); paintCalc(); } }));
    box.querySelector('#addc')?.addEventListener('click', () => { run.conditions.push({ name: '', wells: run.conditions[0]?.wells ?? '', conc: '' }); persist(); paintCorner(); paintTubes(); paintCalc(); });
  }
  function paintTubes() {
    const box = main.querySelector('#tubes'); if (!box) return;
    box.innerHTML = run.conditions.map((c) => `<div class="cond"><div class="pen" style="font-size:20px;margin-bottom:2px">${esc(c.name || '')}${c.wells ? ` <span style="font-size:15px;opacity:0.8">${esc(c.wells)} wells</span>` : ''}</div><div class="pair">${mixes.map((m) => `<div class="tube">${TUBE_SVG}<div class="lines">${m.perWell.map((p) => { const t = tube(p, run, c); return `<div class="line"><span class="v"><span class="pen">${esc(t.text)}</span>&nbsp;</span><span>${esc(p.name)}</span></div>`; }).join('')}</div></div>`).join('')}</div></div>`).join('');
  }
  function paintCalc() {
    const box = main.querySelector('#calc'); if (!box) return;
    const lines: string[] = [];
    for (const c of run.conditions) for (const m of mixes) for (const p of m.perWell) { const t = tube(p, run, c); if (t.calc) lines.push(`<div><span class="pen" style="font-size:20px">${esc(t.calc)}</span>${t.tiny ? `<div style="font-size:13px;color:var(--orange)">${esc(t.tiny)}: under 1 µL is hard to pipette.</div>` : ''}</div>`); }
    const cellsIn = Object.entries(run.inputs).find(([k]) => /cells per well/i.test(k))?.[1]; const cpw = cellsIn ? parseNum(cellsIn) : undefined; const w = tw();
    if (cpw && w) lines.push(`<div><span class="pen" style="font-size:20px">cells: ${sci(cpw)} × ${fmt(w, 4)} wells = ${sci(cpw * w)}</span> <a href="#/plates" style="font-size:13px">seeding tool</a></div>`);
    box.innerHTML = lines.join('') || `<span class="muted" style="font-size:13px">Add plasmid ng/µL in the corner and the DNA volumes are worked out here.</span>`;
  }
  main.querySelector('#formats')?.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; run.format = b.dataset.f!; persist(); $$(main, '#formats .chip').forEach((x) => x.classList.toggle('on', x === b)); paintSteps(); paintTubes(); paintCalc(); });
  paintCorner(); paintSteps(); paintTubes(); paintCalc();
}

// ---- one step per screen ----
function renderStep(main: HTMLElement, P: Protocol, n: number) {
  const run = runState(P); const s = P.steps[n - 1]; const tw = totalWells(run); const skipped = run.skipped.includes(n);
  const blocks: Block[] = [s, ...s.subs];
  const tr = s.timer ? timerRange(s.timer) : undefined;
  const mixHtml = (b: Block) => b.perWell.length ? `<div class="result" style="margin-top:12px;padding:12px 14px">
      <div style="display:flex;justify-content:space-between" class="cap"><span>${esc(b.title)} · ${esc(run.format)}</span><span style="color:var(--orange)">${tw ? `${fmt(tw, 4)} wells` : '<a href="#/protocols/' + P.id + '">set conditions</a>'}</span></div>
      <div class="list" style="margin-top:4px">${b.perWell.map((p) => { const a = amountFor(p, run); return `<div class="item"><span class="grow">${esc(p.name)}</span><span class="mono muted" style="font-size:14px">${a ? `${fmt(a.amount)} ${esc(a.unit)}` : '—'}</span>${a && tw ? `<span class="mono" style="color:var(--orange);font-size:18px;min-width:80px;text-align:right">${isMass(a.unit) ? fmt(toNg(a) * tw) + ' ng' : fmt(a.amount * tw, 4) + ' ' + esc(a.unit)}</span>` : ''}</div>`; }).join('')}</div>
      ${run.conditions.length > 1 || run.conditions[0].conc ? `<div class="cap" style="margin-top:10px;color:inherit;opacity:0.8">Per tube</div>${run.conditions.map((c) => `<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:14px;margin-top:4px"><b style="min-width:60px">${esc(c.name || 'Cond.')}</b>${b.perWell.map((p) => { const t = tube(p, run, c); return `<span>${esc(p.name)} <b class="mono" style="color:var(--orange)">${esc(t.text)}</b></span>`; }).join('')}</div>`).join('')}` : ''}
    </div>` : '';
  main.append(html`
    <div style="padding-top:14px">
      <div style="display:flex;gap:4px">${P.steps.map((_, i) => `<div style="flex:1 1 0;height:4px;border-radius:2px;background:${i < n - 1 ? 'var(--teal)' : i === n - 1 ? 'var(--orange)' : 'var(--line-soft)'};${run.skipped.includes(i + 1) ? 'opacity:0.3' : ''}"></div>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px" class="mono muted"><a href="#/protocols/${P.id}" style="font-size:12px;color:var(--muted);text-decoration:none">${esc(P.short)} · step ${n} of ${P.steps.length}</a><span style="font-size:12px">${esc(run.format)}</span></div>
    </div>
    <div style="padding-top:18px;${skipped ? 'opacity:0.5' : ''}">
      ${skipped ? `<div class="cap" style="color:var(--orange)">Crossed out on this run</div>` : ''}
      <div style="font-family:var(--display);font-weight:700;font-size:30px;line-height:1.12;${skipped ? 'text-decoration:line-through' : ''}">${esc(s.title)}</div>
      ${blocks.map((b, bi) => `${bi > 0 ? `<div style="font-weight:700;font-size:20px;margin-top:16px">${String.fromCharCode(97 + bi - 1)}. ${esc(b.title)}</div>` : ''}
        ${b.fmtLines.map((f) => `<p style="font-size:19px;line-height:1.45;margin:10px 0 0">${esc(f.text)} <b>${f.byFormat[run.format] ? esc(f.byFormat[run.format]) : `<span class="muted">(not set for ${esc(run.format)})</span>`}</b></p>`).join('')}
        ${b.body.map((t) => `<p style="font-size:19px;line-height:1.45;margin:10px 0 0">${esc(t)}</p>`).join('')}
        ${b.warnings.map((w) => `<div class="note warn">${esc(w)}</div>`).join('')}
        ${mixHtml(b)}
        ${b.inputs.map((l) => `<div style="margin-top:10px;font-size:16px">${esc(l)}: ${blankHtml(l, run)}</div>`).join('')}
        ${b.notes.map((w) => `<div class="note">${esc(w)}</div>`).join('')}`).join('')}
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
