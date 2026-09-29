import { cdnaSample, rtMaster, verdict260230, verdict260280, type CdnaSample } from '../lib/calc';
import { parseNanodropCsv } from '../lib/nanodropCsv';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { addLogWithNote } from '../lib/log';
import { $, $$, copyText, esc, html, toast, vibrate } from '../lib/dom';

interface Row { name: string; conc: string; r280?: number; r230?: number; on: boolean; w?: boolean; r?: boolean }
interface State { ng: string; vol: string; mix: string; rt: string; extra: string; rx: string; rows: Row[] }
const DEFAULT: State = { ng: '1000', vol: '15', mix: '4', rt: '1', extra: '10', rx: '', rows: [] };
const f2 = (x: number) => x.toFixed(2);
const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
/** A volume that doubles as a "done" toggle: tap once when that liquid is in the tube. */
const tick = (i: number, k: 'w' | 'r', v: string, done: boolean, colour: string, label: string) => `<button class="cdtick ${done ? 'on' : ''}" data-tk="${i}" data-k="${k}" aria-pressed="${done}" aria-label="${label} added" style="--c:${colour}"><span class="lb">${label}</span><span class="v">${v}</span><span class="u">µL</span><span class="bx">${done ? TICK : ''}</span></button>`;
const qc = (r: Row): { c: string; t: string } => {
  const v = [r.r280 !== undefined ? verdict260280(r.r280, 'RNA') : undefined, r.r230 !== undefined ? verdict260230(r.r230) : undefined].filter(Boolean) as { status: string; note: string }[];
  if (!v.length) return { c: 'transparent', t: 'no ratios' };
  const s = v.some((x) => x.status === 'bad') ? 'bad' : v.some((x) => x.status === 'warn') ? 'warn' : 'good';
  return { c: s === 'good' ? 'var(--teal)' : s === 'warn' ? 'var(--mustard)' : 'var(--danger)', t: `260/280 ${r.r280 ?? '—'} · 260/230 ${r.r230 ?? '—'}` };
};

export function renderCdna(main: HTMLElement) {
  const st = load<State>('cdna', DEFAULT);
  main.append(html`
    <div class="actions" style="padding-top:14px"><label class="btn primary" for="cd-file" style="cursor:pointer">Import CSV</label><input id="cd-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden /><button class="btn" id="cd-paste">Paste</button><button class="btn" id="cd-add">+ Sample</button></div>
    <div id="cd-pastebox" hidden style="margin-top:10px"><textarea id="cd-pastetxt" rows="5" placeholder="Paste the NanoDrop export, or one sample per line: name, ng/µL" style="width:100%;box-sizing:border-box;font-family:var(--mono);font-size:14px;padding:10px;border:var(--bw) solid var(--line);border-radius:10px;background:var(--lcd);color:var(--lcd-ink)"></textarea><div class="actions"><button class="btn primary" id="cd-paste-go">Add samples</button></div></div>
    <div class="fields" style="padding-top:12px">
      <div class="field"><label for="cd-ng">RNA per sample</label><input id="cd-ng" name="ng" type="text" inputmode="decimal" value="${esc(st.ng)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">ng</span></div>
      <div class="field"><label for="cd-vol">RNA + water</label><input id="cd-vol" name="vol" type="text" inputmode="decimal" value="${esc(st.vol)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">µL</span></div>
      <div class="field"><label for="cd-mix">Reaction mix per tube</label><input id="cd-mix" name="mix" type="text" inputmode="decimal" value="${esc(st.mix)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">µL</span></div>
      <div class="field"><label for="cd-rt">Reverse transcriptase per tube</label><input id="cd-rt" name="rt" type="text" inputmode="decimal" value="${esc(st.rt)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">µL</span></div>
      <div class="hint" id="cd-total" style="text-transform:none;letter-spacing:0.08em"></div>
    </div>
    <div id="cd-table"></div>
    <div id="cd-warn"></div>
    <div class="result" id="cd-master" hidden></div>
    <div class="actions" id="cd-acts" hidden><button class="btn primary" id="cd-print">Print A4</button><button class="btn" id="cd-copy">Copy table</button><button class="btn" id="cd-log">Add to log</button></div>
    <div class="actions" id="cd-acts2" hidden style="margin-top:8px"><button class="btn quiet" id="cd-clear">Clear samples</button></div>
    <div class="print print-only cdsheet" id="cd-sheet"></div>
  `);
  const persist = () => save('cdna', st);
  const n = (s: string) => parseNum(s) ?? 0;
  let summary = '';
  function paint() {
    const ng = n(st.ng), vol = n(st.vol), mix = n(st.mix), rt = n(st.rt);
    $(main, '#cd-total').textContent = `per tube ${f2(vol)} + ${f2(mix)} + ${f2(rt)} = ${f2(vol + mix + rt)} µL`;
    const plans = st.rows.map((r) => cdnaSample(n(r.conc), ng, vol));
    const tb = $(main, '#cd-table');
    tb.innerHTML = st.rows.length ? `<div class="cdlist">${st.rows.map((r, i) => { const p = plans[i], q = qc(r); return `<div class="cdrow" style="${r.on ? '' : 'opacity:0.4'}">
        <div class="cdtop"><input type="checkbox" data-on="${i}" ${r.on ? 'checked' : ''} aria-label="include" /><input data-i="${i}" data-f="name" value="${esc(r.name)}" aria-label="sample" class="cdname" /><input data-i="${i}" data-f="conc" value="${esc(r.conc)}" inputmode="decimal" aria-label="ng/µL" class="cdconc" /><span class="mono muted" style="font-size:11px;white-space:nowrap">ng/µL</span><span title="${esc(q.t)}" class="cddot" style="background:${q.c}"></span></div>
        ${p ? (p.fits ? `<div class="cdbot">${tick(i, 'w', f2(p.water), !!r.w, 'var(--text)', 'water')}${tick(i, 'r', f2(p.rna), !!r.r, 'var(--orange)', 'RNA')}</div>` : `<div class="cdbot" style="color:var(--danger);font-size:14px">too dilute for ${fmt(ng)} ng (max ${Math.floor(p.maxNg)} ng)</div>`) : ''}</div>`; }).join('')}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:6px"><span class="mono muted grow" id="cd-prog" style="font-size:13px"></span><button class="chip" id="cd-untick" style="min-height:34px;font-size:12px">clear ticks</button></div>` : `<div class="note">Import the NanoDrop export (.csv) or paste it. Blanks are skipped; names, concentrations and ratios come in.</div>`;
    $$<HTMLInputElement>(tb, 'input[data-i]').forEach((inp) => inp.addEventListener('change', () => { (st.rows[Number(inp.dataset.i)] as any)[inp.dataset.f!] = inp.value.trim(); persist(); paint(); }));
    $$<HTMLElement>(tb, '[data-tk]').forEach((b) => b.addEventListener('click', () => { const row = st.rows[Number(b.dataset.tk)]; const k = b.dataset.k as 'w' | 'r'; row[k] = !row[k]; vibrate(10); persist(); paint(); }));
    tb.querySelector('#cd-untick')?.addEventListener('click', () => { st.rows.forEach((r) => { r.w = false; r.r = false; }); persist(); paint(); });
    $$<HTMLInputElement>(tb, 'input[data-on]').forEach((inp) => inp.addEventListener('change', () => { st.rows[Number(inp.dataset.on)].on = inp.checked; persist(); paint(); }));
    const on = st.rows.map((r, i) => ({ r, p: plans[i] })).filter((x) => x.r.on && x.p);
    const doable = on.filter((x) => x.p!.fits); const prog = tb.querySelector('#cd-prog'); if (prog) prog.textContent = `water ${doable.filter((x) => x.r.w).length}/${doable.length} · RNA ${doable.filter((x) => x.r.r).length}/${doable.length}`;
    const short = on.filter((x) => !x.p!.fits), tiny = on.filter((x) => x.p!.fits && x.p!.rna < 1);
    const minMax = on.length ? Math.min(...on.map((x) => x.p!.maxNg)) : 0;
    $(main, '#cd-warn').innerHTML = [
      short.length ? `<div class="note warn">${short.map((x) => `<b>${esc(x.r.name)}</b>`).join(', ')}: too dilute for ${fmt(ng)} ng in ${f2(vol)} µL (max ${Math.floor(x0(short))} ng). All samples fit up to ${Math.floor(minMax)} ng.</div>` : '',
      tiny.length ? `<div class="note">${tiny.map((x) => esc(x.r.name)).join(', ')}: under 1 µL of RNA. Dilute 1:10 in water first and take 10× the volume.</div>` : '',
    ].join('');
    function x0(list: typeof short) { return Math.min(...list.map((x) => x.p!.maxNg)); }
    const m = rtMaster(on.length, n(st.extra), mix, rt, n(st.rx) || undefined);
    const mb = $(main, '#cd-master'); mb.hidden = on.length === 0; $(main, '#cd-acts').hidden = st.rows.length === 0; $(main, '#cd-acts2').hidden = st.rows.length === 0;
    if (on.length) {
      mb.innerHTML = `<div class="cap" style="color:inherit;opacity:0.8">Master mix · ${on.length} sample${on.length === 1 ? '' : 's'}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:14px">reactions × <input id="cd-rx" value="${esc(st.rx)}" placeholder="${rtMaster(on.length, n(st.extra), mix, rt).rx}" inputmode="numeric" style="width:52px;min-height:36px;text-align:right;font-family:var(--mono)" /> <span class="muted">(${on.length} + <input id="cd-extra" value="${esc(st.extra)}" inputmode="decimal" style="width:40px;min-height:32px;text-align:right;font-family:var(--mono)" /> %, rounded up)</span></div>
        <div class="list" style="margin-top:8px"><div class="item"><span class="grow">Reaction mix</span><span class="mono muted" style="font-size:13px;white-space:nowrap">${f2(mix)} × ${m.rx}</span><span class="mono" style="font-size:22px;color:var(--orange);min-width:92px;text-align:right;white-space:nowrap">${f2(m.mix)} µL</span></div>
        <div class="item"><span class="grow">Reverse transcriptase</span><span class="mono muted" style="font-size:13px;white-space:nowrap">${f2(rt)} × ${m.rx}</span><span class="mono" style="font-size:22px;color:var(--orange);min-width:92px;text-align:right;white-space:nowrap">${f2(m.rt)} µL</span></div></div>
        <p style="margin:8px 0 0">Mix, then add <b>${f2(mix + rt)} µL</b> to each tube of ${f2(vol)} µL RNA + water.</p>`;
      const rx = $<HTMLInputElement>(mb, '#cd-rx'), ex = $<HTMLInputElement>(mb, '#cd-extra');
      rx.addEventListener('change', () => { st.rx = rx.value.trim(); persist(); paint(); });
      ex.addEventListener('change', () => { st.extra = ex.value.trim(); persist(); paint(); });
    }
    const lines = on.map((x) => `${x.r.name}\t${x.r.conc}\t${x.p!.fits ? f2(x.p!.rna) : 'too dilute'}\t${x.p!.fits ? f2(x.p!.water) : ''}`);
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const box = (on: boolean) => `<span class="pbox">${on ? TICK : ''}</span>`;
    $(main, '#cd-sheet').innerHTML = `<div class="phead"><b>cDNA synthesis</b><span>${esc(date)}</span></div>
      <div class="pset">${fmt(ng)} ng RNA per sample · RNA + water to ${f2(vol)} µL · then ${f2(mix)} µL reaction mix + ${f2(rt)} µL reverse transcriptase · ${f2(vol + mix + rt)} µL per tube</div>
      <table class="ptab"><tr><th>#</th><th>sample</th><th class="r">ng/µL</th><th class="r">water µL</th><th></th><th class="r">RNA µL</th><th></th></tr>
      ${on.map((x, k) => { const p = x.p as CdnaSample; return `<tr><td class="r">${k + 1}</td><td>${esc(x.r.name)}</td><td class="r">${esc(x.r.conc)}</td>${p.fits ? `<td class="r b">${f2(p.water)}</td><td>${box(!!x.r.w)}</td><td class="r b">${f2(p.rna)}</td><td>${box(!!x.r.r)}</td>` : `<td colspan="4" class="r">too dilute (max ${Math.floor(p.maxNg)} ng)</td>`}</tr>`; }).join('')}</table>
      ${on.length ? `<div class="pmix"><b>Master mix × ${m.rx}</b> (${on.length} samples + ${fmt(n(st.extra))} %)<div class="pmrow"><span>Reaction mix</span><span>${f2(mix)} × ${m.rx}</span><b>${f2(m.mix)} µL</b>${box(false)}</div><div class="pmrow"><span>Reverse transcriptase</span><span>${f2(rt)} × ${m.rx}</span><b>${f2(m.rt)} µL</b>${box(false)}</div><div style="margin-top:4px">Add ${f2(mix + rt)} µL to each tube.</div></div>` : ''}
      <div class="pfoot">TGGR Bench Mate · cDNA</div>`;
    summary = `cDNA · ${fmt(ng)} ng RNA per sample in ${f2(vol)} µL + ${f2(mix)} µL mix + ${f2(rt)} µL RT\nSample\tng/µL\tRNA µL\twater µL\n${lines.join('\n')}${on.length ? `\nMaster mix ×${m.rx}: reaction mix ${f2(m.mix)} µL, RT ${f2(m.rt)} µL` : ''}`;
  }
  const addRows = (list: { name: string; conc: number; r280?: number; r230?: number }[]) => { if (!list.length) { toast('No samples found'); return; } st.rows.push(...list.map((s) => ({ name: s.name, conc: String(s.conc), r280: s.r280, r230: s.r230, on: true }))); persist(); paint(); toast(`${list.length} samples added`); };
  $$<HTMLInputElement>(main, '.fields input[name]').forEach((i) => i.addEventListener('input', () => { (st as any)[i.name] = i.value; persist(); paint(); }));
  $<HTMLInputElement>(main, '#cd-file').addEventListener('change', async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; if (st.rows.length && confirm('Replace the current samples?')) st.rows = []; addRows(parseNanodropCsv(await f.text())); (e.target as HTMLInputElement).value = ''; });
  $(main, '#cd-paste').addEventListener('click', () => { const b = $(main, '#cd-pastebox'); b.hidden = !b.hidden; });
  $(main, '#cd-paste-go').addEventListener('click', () => { const t = $<HTMLTextAreaElement>(main, '#cd-pastetxt'); addRows(parseNanodropCsv(t.value)); t.value = ''; $(main, '#cd-pastebox').hidden = true; });
  $(main, '#cd-add').addEventListener('click', () => { st.rows.push({ name: `S${st.rows.length + 1}`, conc: '', on: true }); persist(); paint(); });
  $(main, '#cd-print').addEventListener('click', () => window.print());
  $(main, '#cd-copy').addEventListener('click', async () => { if (await copyText(summary)) toast('Copied'); });
  $(main, '#cd-log').addEventListener('click', () => addLogWithNote('cdna', 'cDNA synthesis', summary));
  $(main, '#cd-clear').addEventListener('click', () => { if (confirm('Clear all samples?')) { st.rows = []; st.rx = ''; persist(); paint(); } });
  paint();
}
