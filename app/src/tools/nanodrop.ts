import { A260_FACTOR, verdict260230, verdict260280, verdictConc, type NAType } from '../lib/calc';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, esc, html } from '../lib/dom';

type State = { kind: NAType; conc: string; r280: string; r230: string };
const light = (s: 'good' | 'warn' | 'bad') => { const c = s === 'good' ? 'var(--teal)' : s === 'warn' ? 'var(--mustard)' : 'var(--danger)'; return `<span style="display:inline-block;width:14px;height:14px;border-radius:7px;border:2px solid var(--line);background:${c};box-shadow:0 0 6px ${c};flex:0 0 auto"></span>`; };

const GUIDE: { title: string; rows: [string, string][] }[] = [
  { title: 'The three numbers', rows: [
    ['ng/µL', 'A260 × 50 for dsDNA, × 40 for RNA, × 33 for ssDNA. It counts everything that absorbs at 260 nm: your sample, degraded fragments, free nucleotides, and contaminating RNA in a DNA prep. It cannot tell them apart.'],
    ['260 / 280', 'Purity against protein and phenol. Aim for ~1.8 (DNA) or ~2.0 (RNA). Protein absorbs at 280 nm and pulls the ratio down. Phenol peaks near 270 nm and does the same.'],
    ['260 / 230', 'Purity against everything that absorbs at 230 nm: guanidine salts from the lysis buffer, phenol, EDTA, carbohydrates, TRIzol carry-over. Aim for 2.0 to 2.2. This is the ratio that goes wrong most often.'],
  ] },
  { title: 'When 260/280 is off', rows: [
    ['Below 1.7', 'Protein or phenol carry-over. Usually fine for a gel or a restriction digest. For enzymatic work re-purify: column, or phenol/chloroform then ethanol.'],
    ['DNA above 2.0', 'RNA in the DNA prep. The concentration is overestimated. Add RNase A, or accept it if the RNA does not matter for the next step.'],
    ['RNA below 1.9', 'Protein or DNA carry-over. DNase treat if genomic DNA is a concern for qPCR.'],
    ['Small changes', 'The ratio is not very sensitive: 1.8 vs 1.9 tells you nothing. Buffer pH and salt shift it by 0.2 to 0.3. Water reads lower than TE.'],
  ] },
  { title: 'When 260/230 is off', rows: [
    ['Below 1.8', 'Chaotropic salt (guanidine) from a column kit, phenol, or the sample is simply dilute. Extra wash with the ethanol buffer, spin the empty column dry, or ethanol-precipitate. qPCR and RT are inhibited by it; ligations and sequencing libraries suffer.'],
    ['Low but concentration is also low', 'Under ~20 ng/µL the 230 nm reading is mostly noise. Do not chase it. Re-read a concentrated sample before deciding.'],
    ['Above 2.3', 'Usually a blank problem: blank with the same buffer you eluted in.'],
  ] },
  { title: 'Reading the curve', rows: [
    ['Clean', 'One peak at 260 nm, a trough at 230 nm, flat and near zero from 320 nm on.'],
    ['Peak shifted to ~270', 'Phenol.'],
    ['No trough at 230', 'Guanidine or other salt. The curve climbs to the left.'],
    ['Raised baseline past 320 nm', 'Turbidity, particles, or a bubble on the pedestal. Wipe, re-pipette, re-read.'],
    ['Negative values', 'The blank was dirtier than the sample. Clean the pedestal and blank again.'],
  ] },
  { title: 'Habits that fix most bad readings', rows: [
    ['Blank in the elution buffer', 'Not water, unless you eluted in water. TE and Tris both absorb a little.'],
    ['Wipe, do not rub', 'Lint-free wipe on both pedestals between every sample. Water then a dry wipe.'],
    ['1 to 2 µL, no bubbles', 'A bubble reads as a raised baseline. Fresh tip, touch the drop to the pedestal, close the arm within seconds so it does not evaporate.'],
    ['Re-read twice', 'Two readings within 5 % of each other, or wipe and repeat.'],
    ['Trust it for what it is', 'Good for quantity and for catching gross contamination. For RNA integrity use a gel or Bioanalyzer. For accurate dsDNA in a mixed sample use Qubit.'],
  ] },
];

export function renderNanodrop(main: HTMLElement) {
  const st = load<State>('nanodrop', { kind: 'RNA', conc: '', r280: '', r230: '' });
  main.append(html`
    <div class="cap" style="padding-top:16px">Check a reading</div>
    <div class="seg-ctl" style="margin-top:8px" id="kind">${(['dsDNA', 'RNA', 'ssDNA'] as NAType[]).map((k) => `<button data-k="${k}" class="${st.kind === k ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="fields">
      <div class="field"><label for="nd-conc">Concentration</label><input id="nd-conc" name="conc" type="text" inputmode="decimal" value="${esc(st.conc)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">ng/µL</span></div>
      <div class="field"><label for="nd-280">260 / 280</label><input id="nd-280" name="r280" type="text" inputmode="decimal" value="${esc(st.r280)}" placeholder="—" /></div>
      <div class="field"><label for="nd-230">260 / 230</label><input id="nd-230" name="r230" type="text" inputmode="decimal" value="${esc(st.r230)}" placeholder="—" /></div>
    </div>
    <div class="result" id="qc" hidden><div class="list" id="verdicts"></div></div>
    <div class="note">Expected for ${'<b id="exp"></b>'}: 260/280 <b id="exp280"></b>, 260/230 <b>2.0–2.2</b>, factor <b id="expf"></b> ng/µL per A260.</div>
    <div id="guide"></div>
  `);
  const guide = $(main, '#guide');
  guide.innerHTML = GUIDE.map((g) => `<div class="section"><div class="cap">${esc(g.title)}</div><div class="list" style="margin-top:6px">${g.rows.map(([k, v]) => `<div class="item" style="align-items:flex-start;padding:10px 0;gap:10px"><div style="flex:0 0 108px;font-family:var(--display);font-weight:700;font-size:15px;line-height:1.25;padding-top:1px">${esc(k)}</div><div class="grow" style="font-size:15px;line-height:1.45">${esc(v)}</div></div>`).join('')}</div></div>`).join('');
  const persist = () => { $$<HTMLInputElement>(main, 'input[name]').forEach((i) => ((st as any)[i.name] = i.value)); save('nanodrop', st); };
  function paint() {
    persist();
    $(main, '#exp').textContent = st.kind; $(main, '#exp280').textContent = st.kind === 'RNA' ? '~2.0' : '~1.8'; $(main, '#expf').textContent = String(A260_FACTOR[st.kind]);
    const c = parseNum(st.conc), r280 = parseNum(st.r280), r230 = parseNum(st.r230);
    const rows: string[] = [];
    const row = (s: 'good' | 'warn' | 'bad', head: string, note: string) => `<div class="item" style="align-items:flex-start;padding:8px 0">${light(s)}<div class="grow"><b>${head}</b><div style="font-size:14px;opacity:0.85">${esc(note)}</div></div></div>`;
    if (c) { const v = verdictConc(c); rows.push(row(v.status, `${fmt(c, 4)} ng/µL`, v.note || 'In the reliable range.')); }
    if (r280) { const v = verdict260280(r280, st.kind); rows.push(row(v.status, `260/280 = ${fmt(r280, 3)}`, v.note)); }
    if (r230) { const v = verdict260230(r230); rows.push(row(v.status, `260/230 = ${fmt(r230, 3)}`, v.note)); }
    if (c && c < 20 && r230 && r230 < 1.8) rows.push(row('warn', 'Low 260/230 at low concentration', 'Probably noise rather than contamination. Concentrate or re-read before re-purifying.'));
    $(main, '#qc').hidden = rows.length === 0; $(main, '#verdicts').innerHTML = rows.join('');
  }
  $$(main, 'input[name]').forEach((i) => i.addEventListener('input', paint));
  $(main, '#kind').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.kind = b.dataset.k as NAType; $$(main, '#kind button').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
  paint();
}
