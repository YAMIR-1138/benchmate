import { cdnaSample, rtMaster, verdict260230, verdict260280 } from '../lib/calc';
import { parseNanodropCsv } from '../lib/nanodropCsv';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { addLogWithNote } from '../lib/log';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';

interface Row { name: string; conc: string; r280?: number; r230?: number; on: boolean }
interface State { ng: string; vol: string; mix: string; rt: string; extra: string; rx: string; rows: Row[] }
const DEFAULT: State = { ng: '1000', vol: '15', mix: '4', rt: '1', extra: '10', rx: '', rows: [] };
const f2 = (x: number) => x.toFixed(2);
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
    <div class="actions" id="cd-acts" hidden><button class="btn" id="cd-copy">Copy table</button><button class="btn" id="cd-log">Add to log</button><button class="btn quiet" id="cd-clear">Clear</button></div>
  `);
  const persist = () => save('cdna', st);
  const n = (s: string) => parseNum(s) ?? 0;
  let summary = '';
  function paint() {
    const ng = n(st.ng), vol = n(st.vol), mix = n(st.mix), rt = n(st.rt);
    $(main, '#cd-total').textContent = `per tube ${f2(vol)} + ${f2(mix)} + ${f2(rt)} = ${f2(vol + mix + rt)} µL`;
    const plans = st.rows.map((r) => cdnaSample(n(r.conc), ng, vol));
    const tb = $(main, '#cd-table');
    tb.innerHTML = st.rows.length ? `<div style="overflow-x:auto"><table class="data" style="margin-top:10px"><tr style="text-transform:none"><th></th><th style="text-transform:none">sample</th><th style="text-align:right;text-transform:none">ng/µL</th><th></th><th style="text-align:right;text-transform:none">RNA µL</th><th style="text-align:right;text-transform:none">water µL</th></tr>
      ${st.rows.map((r, i) => { const p = plans[i], q = qc(r); return `<tr style="${r.on ? '' : 'opacity:0.4'}"><td><input type="checkbox" data-on="${i}" ${r.on ? 'checked' : ''} style="width:20px;height:20px" aria-label="include" /></td>
        <td><input data-i="${i}" data-f="name" value="${esc(r.name)}" style="width:84px;min-height:36px;padding:0 6px;font-weight:700" /></td>
        <td class="num"><input data-i="${i}" data-f="conc" value="${esc(r.conc)}" inputmode="decimal" style="width:84px;min-height:36px;padding:0 4px;font-family:var(--mono);font-size:14px;text-align:right" /></td>
        <td title="${esc(q.t)}"><span style="display:inline-block;width:12px;height:12px;border-radius:6px;border:1.5px solid var(--line);background:${q.c}"></span></td>
        <td class="num" style="font-size:18px;color:${p && !p.fits ? 'var(--danger)' : 'var(--orange)'}">${p ? (p.fits ? f2(p.rna) : '—') : ''}</td>
        <td class="num" style="font-size:18px">${p && p.fits ? f2(p.water) : ''}</td></tr>`; }).join('')}</table></div>` : `<div class="note">Import the NanoDrop export (.csv) or paste it. Blanks are skipped; names, concentrations and ratios come in.</div>`;
    $$<HTMLInputElement>(tb, 'input[data-i]').forEach((inp) => inp.addEventListener('change', () => { (st.rows[Number(inp.dataset.i)] as any)[inp.dataset.f!] = inp.value.trim(); persist(); paint(); }));
    $$<HTMLInputElement>(tb, 'input[data-on]').forEach((inp) => inp.addEventListener('change', () => { st.rows[Number(inp.dataset.on)].on = inp.checked; persist(); paint(); }));
    const on = st.rows.map((r, i) => ({ r, p: plans[i] })).filter((x) => x.r.on && x.p);
    const short = on.filter((x) => !x.p!.fits), tiny = on.filter((x) => x.p!.fits && x.p!.rna < 1);
    const minMax = on.length ? Math.min(...on.map((x) => x.p!.maxNg)) : 0;
    $(main, '#cd-warn').innerHTML = [
      short.length ? `<div class="note warn">${short.map((x) => `<b>${esc(x.r.name)}</b>`).join(', ')}: too dilute for ${fmt(ng)} ng in ${f2(vol)} µL (max ${Math.floor(x0(short))} ng). All samples fit up to ${Math.floor(minMax)} ng.</div>` : '',
      tiny.length ? `<div class="note">${tiny.map((x) => esc(x.r.name)).join(', ')}: under 1 µL of RNA. Dilute 1:10 in water first and take 10× the volume.</div>` : '',
    ].join('');
    function x0(list: typeof short) { return Math.min(...list.map((x) => x.p!.maxNg)); }
    const m = rtMaster(on.length, n(st.extra), mix, rt, n(st.rx) || undefined);
    const mb = $(main, '#cd-master'); mb.hidden = on.length === 0; $(main, '#cd-acts').hidden = st.rows.length === 0;
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
    summary = `cDNA · ${fmt(ng)} ng RNA per sample in ${f2(vol)} µL + ${f2(mix)} µL mix + ${f2(rt)} µL RT\nSample\tng/µL\tRNA µL\twater µL\n${lines.join('\n')}${on.length ? `\nMaster mix ×${m.rx}: reaction mix ${f2(m.mix)} µL, RT ${f2(m.rt)} µL` : ''}`;
  }
  const addRows = (list: { name: string; conc: number; r280?: number; r230?: number }[]) => { if (!list.length) { toast('No samples found'); return; } st.rows.push(...list.map((s) => ({ name: s.name, conc: String(s.conc), r280: s.r280, r230: s.r230, on: true }))); persist(); paint(); toast(`${list.length} samples added`); };
  $$<HTMLInputElement>(main, '.fields input[name]').forEach((i) => i.addEventListener('input', () => { (st as any)[i.name] = i.value; persist(); paint(); }));
  $<HTMLInputElement>(main, '#cd-file').addEventListener('change', async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; if (st.rows.length && confirm('Replace the current samples?')) st.rows = []; addRows(parseNanodropCsv(await f.text())); (e.target as HTMLInputElement).value = ''; });
  $(main, '#cd-paste').addEventListener('click', () => { const b = $(main, '#cd-pastebox'); b.hidden = !b.hidden; });
  $(main, '#cd-paste-go').addEventListener('click', () => { const t = $<HTMLTextAreaElement>(main, '#cd-pastetxt'); addRows(parseNanodropCsv(t.value)); t.value = ''; $(main, '#cd-pastebox').hidden = true; });
  $(main, '#cd-add').addEventListener('click', () => { st.rows.push({ name: `S${st.rows.length + 1}`, conc: '', on: true }); persist(); paint(); });
  $(main, '#cd-copy').addEventListener('click', async () => { if (await copyText(summary)) toast('Copied'); });
  $(main, '#cd-log').addEventListener('click', () => addLogWithNote('cdna', 'cDNA synthesis', summary));
  $(main, '#cd-clear').addEventListener('click', () => { if (confirm('Clear all samples?')) { st.rows = []; st.rx = ''; persist(); paint(); } });
  paint();
}
