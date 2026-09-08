import vessels from '@core/data/vessels.json';
import { seeding } from '../lib/calc';
import { fmt, fmtInt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, esc, html } from '../lib/dom';

type Vessel = { id: string; name: string; wells: number; area_cm2: number; working_volume_ml: [number, number] };
const V = vessels.vessels as Vessel[];

export function renderPlates(main: HTMLElement) {
  const st = load<{ id: string; density: string; susp: string; wells: string }>('plates', { id: '24-well', density: '', susp: '', wells: '' });
  main.append(html`
    <div class="fields">
      <div class="field"><label for="p-v">Vessel</label><select id="p-v" name="id" class="unit" style="min-width:140px">${V.map((v) => `<option value="${v.id}" ${v.id === st.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="p-d">Seeding density</label><input id="p-d" name="density" type="text" inputmode="decimal" value="${esc(st.density)}" placeholder="—" /><span class="unit" style="border:0;background:transparent">cells/cm²</span></div>
      <div class="field"><label for="p-s">Suspension count</label><input id="p-s" name="susp" type="text" inputmode="decimal" value="${esc(st.susp)}" placeholder="—" /><span class="unit" style="border:0;background:transparent">cells/mL</span></div>
      <div class="field"><label for="p-w">Wells to seed</label><input id="p-w" name="wells" type="text" inputmode="numeric" value="${esc(st.wells)}" placeholder="—" /><span class="unit" style="border:0;background:transparent">wells</span></div>
    </div>
    <div class="result" id="res" hidden>
      <div class="big o"><span class="n" id="cells"></span><span class="u">cells per well</span></div>
      <div class="big t" style="margin-top:6px" id="volrow" hidden><span class="n" id="vol"></span><span class="u">µL suspension per well</span></div>
      <p id="total" class="muted"></p>
    </div>
    <div class="section"><div class="cap">Growth areas</div>
      <table class="data"><tr><th>Vessel</th><th style="text-align:right">cm²</th><th style="text-align:right">Volume</th></tr>
        ${V.map((v) => `<tr data-id="${v.id}" style="cursor:pointer"><td>${esc(v.name)}</td><td class="num">${v.area_cm2}</td><td class="num muted">${v.working_volume_ml[0]}–${v.working_volume_ml[1]} mL</td></tr>`).join('')}
      </table>
      <div class="note">${esc(vessels.note)}</div>
    </div>
  `);
  function paint() {
    $$<HTMLInputElement | HTMLSelectElement>(main, 'input, select').forEach((i) => ((st as any)[i.name] = i.value)); save('plates', st);
    const v = V.find((x) => x.id === st.id)!; const d = parseNum(st.density), s = parseNum(st.susp), w = parseNum(st.wells);
    const res = $(main, '#res'); res.hidden = !d;
    if (!d) return;
    const r = seeding(d, v.area_cm2, s || undefined);
    $(main, '#cells').textContent = fmtInt(r.cells);
    $(main, '#volrow').hidden = r.volume_mL === undefined;
    if (r.volume_mL !== undefined) $(main, '#vol').textContent = fmt(r.volume_mL * 1000);
    $(main, '#total').textContent = w ? `${w} wells: ${fmtInt(r.cells * w)} cells${r.volume_mL !== undefined ? `, ${fmt(r.volume_mL * w * 1.1)} mL suspension with 10 % extra` : ''}.` : `${v.name}: ${v.area_cm2} cm² per well.`;
  }
  $$(main, 'input, select').forEach((i) => i.addEventListener('input', paint));
  $(main, 'table').addEventListener('click', (e) => { const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]'); if (!tr) return; $<HTMLSelectElement>(main, '#p-v').value = tr.dataset.id!; paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  paint();
}
