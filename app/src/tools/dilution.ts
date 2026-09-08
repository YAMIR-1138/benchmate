import { dilution } from '../lib/calc';
import { UNITS, familyOf, toBase, autoUnit, type Family } from '../lib/units';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast, unitSelect } from '../lib/dom';

const CONC_UNITS = [...Object.keys(UNITS.molar), ...Object.keys(UNITS.massconc), 'X'];
const VOL_UNITS = Object.keys(UNITS.volume);
type State = { c1: string; c2: string; v1: string; v2: string; uc1: string; uc2: string; uv1: string; uv2: string };
type Recent = { text: string; result: string };

export function renderDilution(main: HTMLElement) {
  const st = load<State>('dilution', { c1: '', c2: '', v1: '', v2: '', uc1: 'mM', uc2: 'µM', uv1: 'µL', uv2: 'µL' });
  const recents = load<Recent[]>('dilution.recent', []);
  const field = (k: 'c1' | 'c2' | 'v1' | 'v2', label: string, units: string[], unit: string) => `
    <div class="field" data-k="${k}">
      <label for="f-${k}">${label}<small></small></label>
      <input id="f-${k}" name="${k}" type="text" inputmode="decimal" value="${esc(st[k])}" placeholder="—" />
      ${unitSelect('u' + k, units, unit)}
    </div>`;
  main.append(html`
    <div class="fields">
      ${field('c1', 'Stock concentration', CONC_UNITS, st.uc1)}
      ${field('c2', 'Final concentration', CONC_UNITS, st.uc2)}
      ${field('v2', 'Final volume', VOL_UNITS, st.uv2)}
      ${field('v1', 'Stock volume', VOL_UNITS, st.uv1)}
      <div class="hint">Leave one field empty. It gets solved.</div>
    </div>
    <div class="error" hidden></div>
    <div class="result" hidden>
      <div class="big o"><span class="n" id="r-v1"></span><span class="u" id="r-v1u"></span></div>
      <div class="big t" style="margin-top:6px"><span class="n" id="r-dil"></span><span class="u" id="r-dilu"></span></div>
      <p id="r-text"></p>
      <div class="actions"><button class="btn" id="copy">Copy</button><button class="btn quiet" id="clear">Clear</button></div>
    </div>
    <div class="section" id="recent" hidden><div class="cap">Recent</div><div class="list"></div></div>
  `);

  const inputs = $$<HTMLInputElement>(main, 'input');
  const selects = $$<HTMLSelectElement>(main, 'select');
  const errBox = $(main, '.error'), res = $(main, '.result');
  let sentence = '';

  function compute() {
    for (const i of inputs) (st as any)[i.name] = i.value;
    for (const s of selects) (st as any)[s.name] = s.value;
    save('dilution', st);
    $$(main, '.field').forEach((f) => { f.classList.remove('solved'); $(f, 'small').textContent = ''; });
    errBox.hidden = true; res.hidden = true;
    const c1 = parseNum(st.c1), c2 = parseNum(st.c2), v1 = parseNum(st.v1), v2 = parseNum(st.v2);
    const filled = [c1, c2, v1, v2].filter((x) => x !== undefined).length;
    if (filled < 3) return;
    try {
      const fc1 = familyOf(st.uc1) as Family, fc2 = familyOf(st.uc2) as Family;
      if (fc1 !== fc2) throw new Error('Stock and final concentration need the same kind of unit (both molar, or both mass/volume).');
      const r = dilution({
        c1: c1 === undefined ? undefined : toBase(c1, st.uc1),
        c2: c2 === undefined ? undefined : toBase(c2, st.uc2),
        v1: v1 === undefined ? undefined : toBase(v1, st.uv1),
        v2: v2 === undefined ? undefined : toBase(v2, st.uv2),
      });
      const f = $(main, `.field[data-k="${r.solved}"]`);
      f.classList.add('solved'); $(f, 'small').textContent = 'solved';
      const solvedUnit = (st as any)['u' + r.solved] as string;
      const solvedBase = (r as any)[r.solved] as number;
      const solvedVal = solvedBase / (UNITS[familyOf(solvedUnit) as Family][solvedUnit]);
      $(f, 'input').setAttribute('placeholder', fmt(solvedVal));
      const a = autoUnit(r.v1, 'volume', ['mL', 'µL']);
      const b = autoUnit(r.diluent, 'volume', ['mL', 'µL']);
      $(main, '#r-v1').textContent = fmt(a.value, 5); $(main, '#r-v1u').textContent = `${a.unit} stock`;
      $(main, '#r-dil').textContent = fmt(b.value, 5); $(main, '#r-dilu').textContent = `${b.unit} diluent`;
      const c2disp = fmt(r.c2 / UNITS[fc2][st.uc2]);
      sentence = `Add ${fmt(a.value, 5)} ${a.unit} of stock to ${fmt(b.value, 5)} ${b.unit} of diluent for ${c2disp} ${st.uc2}. Dilution 1 : ${fmt(r.factor)}.`;
      $(main, '#r-text').innerHTML = `Add <strong>${fmt(a.value, 5)} ${a.unit}</strong> of stock to <strong>${fmt(b.value, 5)} ${b.unit}</strong> of diluent. Dilution factor 1 : ${fmt(r.factor)}.`;
      res.hidden = false;
    } catch (e) {
      errBox.textContent = (e as Error).message; errBox.hidden = false;
    }
  }
  function renderRecent() {
    const box = $(main, '#recent'); box.hidden = recents.length === 0;
    $(box, '.list').innerHTML = recents.map((r) => `<div class="item"><span class="grow muted">${esc(r.text)}</span><span class="num">${esc(r.result)}</span></div>`).join('');
  }
  inputs.forEach((i) => i.addEventListener('input', compute));
  selects.forEach((s) => s.addEventListener('change', compute));
  $(main, '#copy').addEventListener('click', async () => {
    if (await copyText(sentence)) toast('Copied');
    const text = `${st.c1} ${st.uc1} → ${st.c2} ${st.uc2} · ${st.v2} ${st.uv2}`;
    recents.unshift({ text, result: `${$(main, '#r-v1').textContent} ${$(main, '#r-v1u').textContent!.split(' ')[0]}` });
    recents.splice(5); save('dilution.recent', recents); renderRecent();
  });
  $(main, '#clear').addEventListener('click', () => { inputs.forEach((i) => (i.value = '')); compute(); inputs[0].focus(); });
  renderRecent(); compute();
}
