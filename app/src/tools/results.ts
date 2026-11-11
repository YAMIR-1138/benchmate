import { $, $$, copyText, esc, html, toast } from '../lib/dom';
import { load, save } from '../lib/store';
import { addLogWithNote } from '../lib/log';
import { ddct, ddctText, guessControl, guessRefs, parseResults, uniq, type CtWell } from '../lib/ddct';
import { party } from '../lib/party';

interface State { wells: CtWell[]; refs: string[]; control: string; file?: string }
const EXAMPLE = [['siCtrl', 'GAPDH', [17.9, 18.0, 18.1]], ['siCtrl', 'IL6', [26.4, 26.5, 26.3]], ['siCtrl', 'TNF', [24.0, 24.2, 24.1]],
  ['LPS 2 h', 'GAPDH', [18.0, 18.1, 18.0]], ['LPS 2 h', 'IL6', [22.9, 23.0, 23.2]], ['LPS 2 h', 'TNF', [21.2, 21.1, 21.9]],
  ['LPS 6 h', 'GAPDH', [18.2, 18.1, 18.2]], ['LPS 6 h', 'IL6', [21.0, 21.1, 20.9]], ['LPS 6 h', 'TNF', [23.1, 23.0, 23.2]]] as [string, string, number[]][];
const fold = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));

export function renderResults(main: HTMLElement) {
  const st = load<State>('ddct', { wells: [], refs: [], control: '' });
  const persist = () => save('ddct', st);
  main.append(html`<div id="rs"></div><input type="file" id="rs-file" accept=".txt,.csv,.tsv,text/plain,text/csv" hidden />`);
  const box = $(main, '#rs'), file = $<HTMLInputElement>(main, '#rs-file');

  function take(text: string, name?: string) {
    const wells = parseResults(text);
    if (!wells.length) { toast('No sample / target / Ct columns found'); return; }
    st.wells = wells; st.file = name;
    const real = wells.filter((w) => !w.ntc);
    st.refs = guessRefs(uniq(real.map((w) => w.target))); st.control = guessControl(uniq(real.map((w) => w.sample)));
    persist(); paint(); party();
  }
  file.addEventListener('change', async () => { const f = file.files?.[0]; if (f) take(await f.text(), f.name); file.value = ''; });

  function paint() {
    if (!st.wells.length) {
      box.innerHTML = `<div class="note" style="margin-top:16px">Bring in the Ct values and get fold change by 2<sup>−ΔΔCt</sup>: each gene against a reference gene, each sample against a control sample.<br><br>From QuantStudio: export the <b>Results</b> table as <b>.txt</b> or <b>.csv</b> (not .xls). Or paste lines of <span class="mono">sample, gene, Ct</span>.</div>
        <div class="actions"><button class="btn primary" id="imp">Import results file</button><button class="btn" id="pst">Paste</button></div>
        <div id="pbox" hidden style="margin-top:10px"><textarea id="ptxt" rows="6" placeholder="sample, gene, Ct  (one well per line; tab, comma or semicolon)" style="width:100%;font-family:var(--mono);font-size:14px;padding:10px;border-radius:10px"></textarea><div class="actions"><button class="btn primary" id="pgo">Read</button></div></div>
        <div class="actions"><button class="btn quiet" id="demo">Try it with example data</button></div>`;
      $(box, '#imp').addEventListener('click', () => file.click());
      $(box, '#pst').addEventListener('click', () => { $(box, '#pbox').hidden = false; $<HTMLTextAreaElement>(box, '#ptxt').focus(); });
      $(box, '#pgo').addEventListener('click', () => take($<HTMLTextAreaElement>(box, '#ptxt').value));
      $(box, '#demo').addEventListener('click', () => take(EXAMPLE.flatMap(([s, g, cts]) => cts.map((c) => `${s}\t${g}\t${c}`)).join('\n'), 'example data'));
      return;
    }
    const real = st.wells.filter((w) => !w.ntc), samples = uniq(real.map((w) => w.sample)), genes = uniq(real.map((w) => w.target));
    const o = ddct(st.wells, st.refs, st.control);
    box.innerHTML = `
      <div class="mono muted" style="margin-top:14px;font-size:13px">${st.file ? esc(st.file) + ' · ' : ''}${st.wells.length} wells · ${samples.length} samples · ${genes.length} genes</div>
      <div class="cap" style="margin-top:14px">Reference gene</div>
      <div class="chips">${genes.map((g) => `<button class="chip ${st.refs.includes(g) ? 'on' : ''}" data-ref="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="cap" style="margin-top:14px">Control sample</div>
      <div class="chips">${samples.map((s) => `<button class="chip ${st.control === s ? 'on' : ''}" data-ctl="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      ${o.targets.map((t) => {
        const cs = o.cells.filter((c) => c.target === t), max = Math.max(1, ...cs.map((c) => c.hi ?? c.fold ?? 0)) * 1.08;
        return `<div class="fcard"><div class="fhead"><b>${esc(t)}</b><span class="mono muted">fold vs ${esc(st.control)}</span></div>
          <div class="fbars" style="--one:${(100 / max).toFixed(2)}%">${cs.map((c) => `<div class="frow ${c.sample === st.control ? 'ctl' : c.fold !== undefined && c.fold < 1 ? 'down' : 'up'}">
            <span class="fname">${esc(c.sample)}</span>
            <span class="ftrack">${c.fold !== undefined ? `<span class="fbar" style="width:${(c.fold / max * 100).toFixed(2)}%"></span><span class="fwh" style="left:${(c.lo! / max * 100).toFixed(2)}%;width:${((c.hi! - c.lo!) / max * 100).toFixed(2)}%"></span>` : ''}</span>
            <span class="fval">${c.fold !== undefined ? '×' + fold(c.fold) : '—'}</span>
            <span class="fsub">Ct ${c.ct !== undefined ? c.ct.toFixed(2) : 'undet.'}${c.n > 1 ? ` ± ${c.sd.toFixed(2)}` : ''} · n ${c.n}${c.ddct !== undefined ? ` · ΔΔCt ${c.ddct.toFixed(2)}` : ''}</span>
          </div>`).join('')}</div></div>`;
      }).join('')}
      ${!o.targets.length ? '<div class="note">Every gene is marked as a reference. Untick one to see its fold change.</div>' : ''}
      ${o.warnings.length ? `<div class="note warn"><b>Worth a look</b>${o.warnings.map((w) => `<div>${esc(w)}</div>`).join('')}</div>` : ''}
      <div class="note">Bars show 2<sup>−ΔΔCt</sup>; whiskers are ± 1 SD of ΔCt carried through. Undetermined wells are left out of the mean. With several reference genes their Ct values are averaged.</div>
      <div class="actions"><button class="btn primary" id="copy">Copy table</button><button class="btn" id="log">Add to log</button></div>
      <div class="actions"><button class="btn" id="imp">Import another</button><button class="btn quiet" id="clear">Clear</button></div>`;
    $$<HTMLElement>(box, '[data-ref]').forEach((b) => b.addEventListener('click', () => { const g = b.dataset.ref!; st.refs = st.refs.includes(g) ? st.refs.filter((x) => x !== g) : [...st.refs, g]; persist(); paint(); }));
    $$<HTMLElement>(box, '[data-ctl]').forEach((b) => b.addEventListener('click', () => { st.control = b.dataset.ctl!; persist(); paint(); }));
    $(box, '#copy').addEventListener('click', async () => toast((await copyText(ddctText(o, st.refs, st.control))) ? 'Copied, paste into a spreadsheet' : 'Copy failed'));
    $(box, '#log').addEventListener('click', () => addLogWithNote('qPCR results', `Fold change · ${o.targets.join(', ')}`, ddctText(o, st.refs, st.control)));
    $(box, '#imp').addEventListener('click', () => file.click());
    $(box, '#clear').addEventListener('click', () => { st.wells = []; st.refs = []; st.control = ''; st.file = undefined; persist(); paint(); });
  }
  paint();
}
