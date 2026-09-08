import { molar } from '../lib/calc';
import { UNITS, toBase, fromBase, autoUnit } from '../lib/units';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast, unitSelect } from '../lib/dom';

const REAGENTS: [string, number][] = [
  ['NaCl', 58.44], ['KCl', 74.55], ['Tris base', 121.14], ['Tris·HCl', 157.60], ['EDTA·2Na·2H₂O', 372.24],
  ['Glucose', 180.16], ['Sucrose', 342.30], ['Glycine', 75.07], ['SDS', 288.37], ['NaOH', 40.00],
  ['MgCl₂·6H₂O', 203.30], ['CaCl₂', 110.98], ['HEPES', 238.30], ['DTT', 154.25], ['IPTG', 238.31], ['Imidazole', 68.08],
];
type State = { mw: string; vol: string; conc: string; mass: string; uvol: string; uconc: string; umass: string };

export function renderMolar(main: HTMLElement) {
  const st = load<State>('molar', { mw: '', vol: '', conc: '', mass: '', uvol: 'mL', uconc: 'mM', umass: 'mg' });
  main.append(html`
    <div class="fields">
      <div class="field" data-k="mw"><label for="f-mw">Molecular weight<small></small></label><input id="f-mw" name="mw" type="text" inputmode="decimal" value="${esc(st.mw)}" placeholder="—" /><span class="unit" style="border:0;background:transparent">g/mol</span></div>
      <div class="field" data-k="conc"><label for="f-conc">Concentration<small></small></label><input id="f-conc" name="conc" type="text" inputmode="decimal" value="${esc(st.conc)}" placeholder="—" />${unitSelect('uconc', Object.keys(UNITS.molar), st.uconc)}</div>
      <div class="field" data-k="vol"><label for="f-vol">Volume<small></small></label><input id="f-vol" name="vol" type="text" inputmode="decimal" value="${esc(st.vol)}" placeholder="—" />${unitSelect('uvol', Object.keys(UNITS.volume), st.uvol)}</div>
      <div class="field" data-k="mass"><label for="f-mass">Mass<small></small></label><input id="f-mass" name="mass" type="text" inputmode="decimal" value="${esc(st.mass)}" placeholder="—" />${unitSelect('umass', Object.keys(UNITS.mass), st.umass)}</div>
      <div class="hint">Leave one field empty. It gets solved.</div>
    </div>
    <div class="error" hidden></div>
    <div class="result" hidden>
      <div class="big o"><span class="n" id="r-n"></span><span class="u" id="r-u"></span></div>
      <p id="r-text"></p>
      <div class="actions"><button class="btn" id="copy">Copy</button><button class="btn quiet" id="clear">Clear</button></div>
    </div>
    <div class="section"><div class="cap">Common reagents</div><div class="chips" id="reagents"></div></div>
  `);
  const chips = $(main, '#reagents');
  chips.innerHTML = REAGENTS.map(([n, m]) => `<button class="chip" data-mw="${m}">${esc(n)} <span class="muted mono">${m}</span></button>`).join('');
  const inputs = $$<HTMLInputElement>(main, 'input'), selects = $$<HTMLSelectElement>(main, 'select');
  const errBox = $(main, '.error'), res = $(main, '.result');
  let sentence = '';

  function compute() {
    for (const i of inputs) (st as any)[i.name] = i.value;
    for (const s of selects) (st as any)[s.name] = s.value;
    save('molar', st);
    $$(main, '.field').forEach((f) => { f.classList.remove('solved'); $(f, 'small').textContent = ''; });
    errBox.hidden = true; res.hidden = true;
    const mw = parseNum(st.mw), conc = parseNum(st.conc), vol = parseNum(st.vol), mass = parseNum(st.mass);
    if ([mw, conc, vol, mass].filter((x) => x !== undefined).length < 3) return;
    try {
      const r = molar({
        mw, molarity_M: conc === undefined ? undefined : toBase(conc, st.uconc),
        volume_L: vol === undefined ? undefined : toBase(vol, st.uvol),
        mass_g: mass === undefined ? undefined : toBase(mass, st.umass),
      });
      const keyMap = { mass_g: 'mass', molarity_M: 'conc', volume_L: 'vol', mw: 'mw' } as const;
      const k = keyMap[r.solved];
      const f = $(main, `.field[data-k="${k}"]`); f.classList.add('solved'); $(f, 'small').textContent = 'solved';
      let n: string, u: string, text: string;
      if (r.solved === 'mass_g') {
        const a = autoUnit(r.mass_g, 'mass', ['g', 'mg', 'µg']); n = fmt(a.value); u = a.unit;
        text = `Weigh <strong>${n} ${u}</strong> and bring to <strong>${st.vol} ${st.uvol}</strong> for ${st.conc} ${st.uconc}.`;
      } else if (r.solved === 'molarity_M') {
        const a = autoUnit(r.molarity_M, 'molar'); n = fmt(a.value); u = a.unit;
        text = `<strong>${st.mass} ${st.umass}</strong> in <strong>${st.vol} ${st.uvol}</strong> gives <strong>${n} ${u}</strong>.`;
      } else if (r.solved === 'volume_L') {
        const a = autoUnit(r.volume_L, 'volume', ['L', 'mL', 'µL']); n = fmt(a.value); u = a.unit;
        text = `Dissolve <strong>${st.mass} ${st.umass}</strong> in <strong>${n} ${u}</strong> for ${st.conc} ${st.uconc}.`;
      } else {
        n = fmt(r.mw); u = 'g/mol'; text = `Molecular weight <strong>${n} g/mol</strong>.`;
      }
      const unitOf = { mass_g: st.umass, molarity_M: st.uconc, volume_L: st.uvol, mw: 'g/mol' } as const;
      const baseVal = (r as any)[r.solved] as number;
      $(f, 'input').setAttribute('placeholder', r.solved === 'mw' ? fmt(baseVal) : fmt(fromBase(baseVal, unitOf[r.solved])));
      $(main, '#r-n').textContent = n; $(main, '#r-u').textContent = u;
      $(main, '#r-text').innerHTML = text; sentence = text.replace(/<[^>]+>/g, '');
      res.hidden = false;
    } catch (e) { errBox.textContent = (e as Error).message; errBox.hidden = false; }
  }
  inputs.forEach((i) => i.addEventListener('input', compute));
  selects.forEach((s) => s.addEventListener('change', compute));
  chips.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return;
    $$<HTMLInputElement>(main, 'input[name=mw]')[0].value = b.dataset.mw!; compute();
  });
  $(main, '#copy').addEventListener('click', async () => { if (await copyText(sentence)) toast('Copied'); });
  $(main, '#clear').addEventListener('click', () => { inputs.forEach((i) => (i.value = '')); compute(); inputs[0].focus(); });
  compute();
}
