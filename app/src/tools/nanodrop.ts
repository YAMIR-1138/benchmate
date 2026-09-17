import { A260_FACTOR, verdict260230, verdict260280, verdictConc, type NAType } from '../lib/calc';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, esc, html } from '../lib/dom';
import { addLog } from '../lib/log';

type State = { kind: NAType; conc: string; r280: string; r230: string };
const light = (s: 'good' | 'warn' | 'bad') => { const c = s === 'good' ? 'var(--teal)' : s === 'warn' ? 'var(--mustard)' : 'var(--danger)'; return `<span style="display:inline-block;width:14px;height:14px;border-radius:7px;border:2px solid var(--line);background:${c};box-shadow:0 0 6px ${c};flex:0 0 auto"></span>`; };

const SOURCES: Record<string, { tag: string; title: string; url: string }> = {
  guide: { tag: 'Thermo guide', title: 'Thermo Scientific NanoDrop, Nucleic Acid Technical Guide', url: 'https://documents.thermofisher.com/TFS-Assets/CAD/Warranties/Thermo-Scientific-NanoDrop-Products-Nucleic-Acid-Technical-Guide-EN.pdf' },
  t123: { tag: 'Thermo T123', title: 'Thermo Scientific T123, Interpretation of Nucleic Acid 260/280 Ratios', url: 'https://documents.thermofisher.com/TFS-Assets/CAD/Product-Bulletins/T123-NanoDrop-Lite-Interpretation-of-Nucleic-Acid-260-280-Ratios.pdf' },
  faq: { tag: 'Thermo FAQ', title: 'Thermo Fisher, NanoDrop One FAQs', url: 'https://www.thermofisher.com/order/catalog/product/ND-ONE-W/faqs' },
  neb: { tag: 'NEB', title: 'New England Biolabs, A Practical Guide to Analyzing Nucleic Acid Concentration and Purity with Microvolume Spectrophotometers', url: 'https://www.neb.com/en/-/media/nebus/files/application-notes/technote_mvs_analysis_of_nucleic_acid_concentration_and_purity.pdf' },
};
const GUIDE: { title: string; rows: [string, string, string?][] }[] = [
  { title: 'What each number is', rows: [
    ['ng/µL', 'A260 × 50 (dsDNA), × 40 (RNA) or × 33 (ssDNA) for a 10 mm path. Everything that absorbs at 260 nm counts: degraded fragments, free nucleotides, RNA in a DNA prep.', 'guide'],
    ['260 / 280', '“A ratio of ~1.8 is generally accepted as pure for DNA; a ratio of ~2.0 is generally accepted as pure for RNA. If the ratio is appreciably lower in either case, it may indicate the presence of protein, phenol or other contaminants that absorb strongly at or near 280 nm.”', 'guide'],
    ['260 / 230', '“The 260/230 values for pure nucleic acid are often higher than the respective 260/280 values, commonly in the range of 1.8–2.2. If the ratio is appreciably lower, this may indicate the presence of co-purified contaminants.”', 'guide'],
  ] },
  { title: '260 / 280', rows: [
    ['< 1.7', '“Abnormal 260/280 ratios usually indicate that the sample is either contaminated by protein or a reagent such as phenol or that there was an issue with the measurement.” Check: the spectrum near 270 nm, the blank, the buffer.', 't123'],
    ['DNA > 2.0', 'RNA reads higher than DNA, so RNA in a DNA prep raises the ratio. Check: a gel for an RNA smear; RNase treatment if the next step is affected.', 't123'],
    ['RNA < 1.9', 'Possible causes: protein, genomic DNA. Check: a −RT control in qPCR; DNase treatment.', 't123'],
    ['± 0.1', '“Acidic solutions will under-represent the 260/280 ratio by 0.2–0.3, while a basic solution will over-represent the ratio by 0.2–0.3.” Water reads lower than TE.', 't123'],
  ] },
  { title: '260 / 230', rows: [
    ['< 1.8', '“A very high 230 nm absorbance value relative to the sample is indicative of contaminants such as carbohydrates, peptides, phenols, urea, humic acid or guanidine isothiocyanate in the sample.” Check: concentration first, then the blank. Remedies: extra ethanol-buffer wash, dry spin of the empty column, re-precipitation.', 'guide'],
    ['< 1.8 and < 20 ng/µL', 'At low concentration the 230 nm reading is mostly noise. Re-read a more concentrated sample before drawing conclusions.', 'neb'],
    ['> 2.3', 'Possible cause: blank mismatch. Check: re-blank with the elution buffer.', 'neb'],
  ] },
  { title: 'Spectrum', rows: [
    ['Ratios are not enough', '“Wavelength shifts in the trough or the sample peak may identify the sample to be of poor quality even if ratios fall within the pure range.”', 'faq'],
    ['Clean', 'Peak at 260, trough at 230, flat near zero from 320 nm.', 'neb'],
    ['Peak near 270', 'Consistent with phenol.', 'neb'],
    ['No trough at 230', 'Consistent with guanidine or other salt. The curve rises to the left.', 'neb'],
    ['Raised above 320', 'Turbidity, particles or a bubble. Re-pipette, re-read.', 'neb'],
    ['Negative', 'Blank higher than the sample. Clean the pedestal, re-blank.', 'neb'],
  ] },
  { title: 'Pedestal', rows: [
    ['Blank', 'Same buffer the sample is in. TE and Tris absorb slightly.', 'neb'],
    ['Wipe', 'Lint-free wipe on both pedestals between samples.', 'faq'],
    ['Volume', '1–2 µL, no bubbles. Close the arm promptly.', 'faq'],
    ['Repeat', 'Two readings within 5 %.', 'neb'],
    ['Scope', 'Quantity and gross contamination only. Integrity: gel or Bioanalyzer. dsDNA in a mixed sample: Qubit.', 'neb'],
  ] },
];

export function renderNanodrop(main: HTMLElement) {
  const st = load<State>('nanodrop', { kind: 'RNA', conc: '', r280: '', r230: '' });
  main.append(html`
    <div class="cap" style="padding-top:16px">Reading</div>
    <div class="seg-ctl" style="margin-top:8px" id="kind">${(['dsDNA', 'RNA', 'ssDNA'] as NAType[]).map((k) => `<button data-k="${k}" class="${st.kind === k ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="fields">
      <div class="field"><label for="nd-conc">Concentration</label><input id="nd-conc" name="conc" type="text" inputmode="decimal" value="${esc(st.conc)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">ng/µL</span></div>
      <div class="field"><label for="nd-280">260 / 280</label><input id="nd-280" name="r280" type="text" inputmode="decimal" value="${esc(st.r280)}" placeholder="—" /></div>
      <div class="field"><label for="nd-230">260 / 230</label><input id="nd-230" name="r230" type="text" inputmode="decimal" value="${esc(st.r230)}" placeholder="—" /></div>
    </div>
    <div class="result" id="qc" hidden><div class="list" id="verdicts"></div><div class="actions"><button class="btn" id="log">Add to log</button></div></div>
    <div class="note">Expected for ${'<b id="exp"></b>'}: 260/280 <b id="exp280"></b>, 260/230 <b>1.8–2.2</b>, factor <b id="expf"></b> ng/µL per A260.</div>
    <div class="note" style="margin-top:18px">Ratios are indicators, not a verdict. Quoted lines below are from Thermo Fisher's NanoDrop documents and NEB's technical note; each row links to its source.</div>
    <div id="guide"></div>
    <div class="section"><div class="cap">Sources</div><div class="list">${Object.values(SOURCES).map((x) => `<a class="item" href="${x.url}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;font-size:14px;min-height:44px"><span class="cite" style="margin:0 8px 0 0">${esc(x.tag)}</span><span class="grow">${esc(x.title)}</span></a>`).join('')}</div></div>
  `);
  const guide = $(main, '#guide');
  guide.innerHTML = GUIDE.map((g) => `<div class="section"><div class="cap">${esc(g.title)}</div><div class="list" style="margin-top:6px">${g.rows.map(([k, v, src]) => `<div class="item" style="align-items:flex-start;padding:10px 0;gap:10px"><div style="flex:0 0 108px;font-family:var(--display);font-weight:700;font-size:15px;line-height:1.25;padding-top:1px">${esc(k)}</div><div class="grow" style="font-size:15px;line-height:1.45">${esc(v)}${src && SOURCES[src] ? ` <a class="cite" href="${SOURCES[src].url}" target="_blank" rel="noopener">${esc(SOURCES[src].tag)}</a>` : ''}</div></div>`).join('')}</div></div>`).join('');
  const persist = () => { $$<HTMLInputElement>(main, 'input[name]').forEach((i) => ((st as any)[i.name] = i.value)); save('nanodrop', st); };
  let lines: string[] = [];
  function paint() {
    persist();
    $(main, '#exp').textContent = st.kind; $(main, '#exp280').textContent = st.kind === 'RNA' ? '~2.0' : '~1.8'; $(main, '#expf').textContent = String(A260_FACTOR[st.kind]);
    const c = parseNum(st.conc), r280 = parseNum(st.r280), r230 = parseNum(st.r230);
    const rows: string[] = []; lines = [];
    const row = (s: 'good' | 'warn' | 'bad', head: string, note: string) => { lines.push(`${head}: ${note}`); return `<div class="item" style="align-items:flex-start;padding:8px 0">${light(s)}<div class="grow"><b>${head}</b><div style="font-size:14px;opacity:0.85">${esc(note)}</div></div></div>`; };
    if (c) { const v = verdictConc(c); rows.push(row(v.status, `${fmt(c, 4)} ng/µL`, v.note || 'Within range.')); }
    if (r280) { const v = verdict260280(r280, st.kind); rows.push(row(v.status, `260/280 = ${fmt(r280, 3)}`, v.note)); }
    if (r230) { const v = verdict260230(r230); rows.push(row(v.status, `260/230 = ${fmt(r230, 3)}`, v.note)); }
    if (c && c < 20 && r230 && r230 < 1.8) rows.push(row('warn', 'Low 260/230 at low concentration', 'Possibly noise rather than contamination.'));
    $(main, '#qc').hidden = rows.length === 0; $(main, '#verdicts').innerHTML = rows.join('');
  }
  $(main, '#log').addEventListener('click', () => addLog('nanodrop', `NanoDrop · ${st.kind}`, [st.conc && `${st.conc} ng/µL`, st.r280 && `260/280 ${st.r280}`, st.r230 && `260/230 ${st.r230}`].filter(Boolean).join(', ') + '\n' + lines.join('\n')));
  $$(main, 'input[name]').forEach((i) => i.addEventListener('input', paint));
  $(main, '#kind').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.kind = b.dataset.k as NAType; $$(main, '#kind button').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
  paint();
}
