import { A260_FACTOR, normalize, verdict260230, verdict260280, verdictConc, volumeForAmount, type NAType } from '../lib/calc';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';
import { sevenSeg } from '../lib/sevenseg';

interface Sample { name: string; conc: string }
type State = { kind: NAType; conc: string; a260: string; r280: string; r230: string; need: string; needUnit: 'ng' | 'µg'; target: string; final: string; samples: Sample[] };

const light = (s: 'good' | 'warn' | 'bad') => `<span style="display:inline-block;width:14px;height:14px;border-radius:7px;border:2px solid var(--line);background:${s === 'good' ? 'var(--teal)' : s === 'warn' ? 'var(--mustard)' : 'var(--danger)'};box-shadow:0 0 6px ${s === 'good' ? 'var(--teal)' : s === 'warn' ? 'var(--mustard)' : 'var(--danger)'}"></span>`;

export function renderNanodrop(main: HTMLElement) {
  const st = load<State>('nanodrop', { kind: 'RNA', conc: '', a260: '', r280: '', r230: '', need: '1', needUnit: 'µg', target: '50', final: '20', samples: [{ name: 'S1', conc: '' }, { name: 'S2', conc: '' }] });
  main.append(html`
    <div class="seg-ctl" id="kind">${(['dsDNA', 'RNA', 'ssDNA'] as NAType[]).map((k) => `<button data-k="${k}" class="${st.kind === k ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="fields">
      <div class="field"><label for="nd-conc">Concentration <span class="muted" style="font-weight:400">(from the reading)</span></label><input id="nd-conc" name="conc" type="text" inputmode="decimal" value="${esc(st.conc)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">ng/µL</span></div>
      <div class="field"><label for="nd-a260">…or A260</label><input id="nd-a260" name="a260" type="text" inputmode="decimal" value="${esc(st.a260)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none" id="factor"></span></div>
      <div class="field"><label for="nd-280">260 / 280</label><input id="nd-280" name="r280" type="text" inputmode="decimal" value="${esc(st.r280)}" placeholder="—" /></div>
      <div class="field"><label for="nd-230">260 / 230</label><input id="nd-230" name="r230" type="text" inputmode="decimal" value="${esc(st.r230)}" placeholder="—" /></div>
    </div>
    <div class="result" id="qc" hidden>
      <div style="display:flex;align-items:center;gap:14px"><div id="conc-seg"></div><div><div class="cap" style="color:inherit;opacity:0.8;text-transform:none">ng/µL</div><div id="conc-note" style="font-size:14px"></div></div></div>
      <div class="list" style="margin-top:10px" id="verdicts"></div>
    </div>

    <div class="section"><div class="cap">Take an amount</div>
      <div class="fields" style="padding-top:8px">
        <div class="field"><label for="nd-need">I need</label><input id="nd-need" name="need" type="text" inputmode="decimal" value="${esc(st.need)}" /><select class="unit" name="needUnit"><option ${st.needUnit === 'ng' ? 'selected' : ''}>ng</option><option ${st.needUnit === 'µg' ? 'selected' : ''}>µg</option></select></div>
      </div>
      <div class="result" id="take" hidden><div class="big o"><span class="n" id="take-n"></span><span class="u">µL of sample</span></div><p id="take-note"></p></div>
    </div>

    <div class="section"><div class="cap">Normalise samples</div>
      <div class="fields" style="padding-top:8px">
        <div class="field"><label for="nd-target">Target</label><input id="nd-target" name="target" type="text" inputmode="decimal" value="${esc(st.target)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">ng/µL</span></div>
        <div class="field"><label for="nd-final">Final volume each</label><input id="nd-final" name="final" type="text" inputmode="decimal" value="${esc(st.final)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">µL</span></div>
      </div>
      <table class="data" id="norm"><tr><th>Sample</th><th style="text-align:right;text-transform:none">ng/µL</th><th style="text-align:right;text-transform:none">Sample µL</th><th style="text-align:right;text-transform:none">Water µL</th></tr></table>
      <div class="actions"><button class="btn" id="add">+ Add</button><button class="btn" id="copy">Copy</button><button class="btn quiet" id="clear">Clear</button></div>
      <div class="note">A sample too dilute to reach the target shows in red: take all of it, or concentrate it.</div>
    </div>
  `);
  const persist = () => { $$<HTMLInputElement | HTMLSelectElement>(main, 'input[name], select[name]').forEach((i) => ((st as any)[i.name] = i.value)); save('nanodrop', st); };
  const conc = (): number | undefined => {
    const c = parseNum(st.conc); if (c && c > 0) return c;
    const a = parseNum(st.a260); if (a && a > 0) return a * A260_FACTOR[st.kind];
    return undefined;
  };
  function paintQC() {
    $(main, '#factor').textContent = `× ${A260_FACTOR[st.kind]}`;
    const c = conc(); const qc = $(main, '#qc'); qc.hidden = c === undefined;
    if (c === undefined) return;
    $(main, '#conc-seg').innerHTML = sevenSeg(fmt(c, 4).slice(0, 6), { height: 34 });
    const vc = verdictConc(c); $(main, '#conc-note').innerHTML = vc.note ? `${light(vc.status)} ${esc(vc.note)}` : `${light('good')} In range.`;
    const rows: string[] = [];
    const r280 = parseNum(st.r280), r230 = parseNum(st.r230);
    if (r280) { const v = verdict260280(r280, st.kind); rows.push(`<div class="item" style="align-items:flex-start;padding:8px 0">${light(v.status)}<div class="grow"><b>260/280 = ${fmt(r280, 3)}</b><div style="font-size:14px;opacity:0.85">${esc(v.note)}</div></div></div>`); }
    if (r230) { const v = verdict260230(r230); rows.push(`<div class="item" style="align-items:flex-start;padding:8px 0">${light(v.status)}<div class="grow"><b>260/230 = ${fmt(r230, 3)}</b><div style="font-size:14px;opacity:0.85">${esc(v.note)}</div></div></div>`); }
    if (!r280 && !r230) rows.push(`<div class="item" style="font-size:14px;opacity:0.8">Enter the two ratios for a purity check.</div>`);
    $(main, '#verdicts').innerHTML = rows.join('');
  }
  function paintTake() {
    const c = conc(), need = parseNum(st.need); const box = $(main, '#take');
    box.hidden = !(c && need); if (!c || !need) return;
    const ng = st.needUnit === 'µg' ? need * 1000 : need; const v = volumeForAmount(ng, c);
    $(main, '#take-n').textContent = fmt(v, 4);
    $(main, '#take-note').textContent = v < 0.5 ? `Under 0.5 µL is hard to pipette accurately. Dilute first: ${fmt(c / 10, 3)} ng/µL would need ${fmt(v * 10, 3)} µL.` : `${fmt(ng)} ng at ${fmt(c, 4)} ng/µL.`;
  }
  function paintNorm() {
    const t = parseNum(st.target), f = parseNum(st.final); const tbl = $(main, '#norm');
    $$(tbl, 'tr.s').forEach((r) => r.remove());
    st.samples.forEach((s, i) => {
      const c = parseNum(s.conc); const r = c && t && f ? normalize(c, t, f) : undefined;
      const tr = document.createElement('tr'); tr.className = 's';
      tr.innerHTML = `<td><input data-i="${i}" data-f="name" value="${esc(s.name)}" style="width:64px;min-height:40px;padding:0 8px;font-weight:700" /></td>
        <td class="num"><input data-i="${i}" data-f="conc" type="text" inputmode="decimal" value="${esc(s.conc)}" placeholder="—" style="width:78px;min-height:40px;padding:0 8px;font-family:var(--mono);text-align:right" /></td>
        <td class="num" style="font-size:18px;color:${r && !r.ok ? 'var(--danger)' : 'var(--orange)'}">${r ? (r.ok ? fmt(r.sample, 3) : `all ${fmt(f!, 3)}`) : '—'}</td>
        <td class="num" style="font-size:18px">${r ? (r.ok ? fmt(r.water, 3) : '0') : '—'}</td>`;
      tbl.append(tr);
    });
    $$<HTMLInputElement>(tbl, 'input[data-i]').forEach((inp) => inp.addEventListener('input', () => { const s = st.samples[Number(inp.dataset.i)]; (s as any)[inp.dataset.f!] = inp.value; save('nanodrop', st); if (inp.dataset.f === 'conc') { const t = parseNum(st.target), f = parseNum(st.final), c = parseNum(inp.value); const tds = inp.closest('tr')!.querySelectorAll('td'); const r = c && t && f ? normalize(c, t, f) : undefined; tds[2].textContent = r ? (r.ok ? fmt(r.sample, 3) : `all ${fmt(f!, 3)}`) : '—'; tds[2].style.color = r && !r.ok ? 'var(--danger)' : 'var(--orange)'; tds[3].textContent = r ? (r.ok ? fmt(r.water, 3) : '0') : '—'; } }));
  }
  const all = () => { persist(); paintQC(); paintTake(); paintNorm(); };
  $$(main, 'input[name], select[name]').forEach((i) => i.addEventListener('input', all));
  $(main, '#kind').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.kind = b.dataset.k as NAType; $$(main, '#kind button').forEach((x) => x.classList.toggle('on', x === b)); all(); });
  $(main, '#add').addEventListener('click', () => { st.samples.push({ name: `S${st.samples.length + 1}`, conc: '' }); paintNorm(); save('nanodrop', st); });
  $(main, '#clear').addEventListener('click', () => { st.samples = [{ name: 'S1', conc: '' }, { name: 'S2', conc: '' }]; paintNorm(); save('nanodrop', st); });
  $(main, '#copy').addEventListener('click', async () => {
    const t = parseNum(st.target), f = parseNum(st.final);
    const lines = st.samples.map((s) => { const c = parseNum(s.conc); const r = c && t && f ? normalize(c, t, f) : undefined; return `${s.name}\t${s.conc}\t${r ? (r.ok ? fmt(r.sample, 3) : 'all') : ''}\t${r ? (r.ok ? fmt(r.water, 3) : '0') : ''}`; });
    if (await copyText(`Sample\tng/µL\tSample µL\tWater µL\n${lines.join('\n')}`)) toast('Copied');
  });
  all();
}
