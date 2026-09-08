import vessels from '@core/data/vessels.json';
import { hemocytometer, seedPlan } from '../lib/calc';
import { fmt, fmtInt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, esc, html } from '../lib/dom';
import { sevenSeg } from '../lib/sevenseg';

type Vessel = { id: string; name: string; wells: number; area_cm2: number; working_volume_ml: [number, number] };
const V = vessels.vessels as Vessel[];
type State = { countMode: 'hemo' | 'direct'; counted: string; squares: string; dilution: string; dead: string; direct: string; volume: string; id: string; perWell: string; density: string; wells: string; wellVol: string; by: 'well' | 'cm2' };

export function renderPlates(main: HTMLElement) {
  const st = load<State>('plates2', { countMode: 'hemo', counted: '', squares: '4', dilution: '2', dead: '', direct: '', volume: '', id: '24-well', perWell: '50000', density: '', wells: '', wellVol: '', by: 'well' });
  const counters = load<{ counters: { id: string; name: string; n: number }[]; active: string }>('counter', { counters: [], active: '' });
  const active = counters.counters.find((c) => c.id === counters.active);
  main.append(html`
    <div class="cap" style="padding-top:16px">1 · Count</div>
    <div class="seg-ctl" style="margin-top:8px" id="cmode"><button data-m="hemo" class="${st.countMode === 'hemo' ? 'on' : ''}">Hemocytometer</button><button data-m="direct" class="${st.countMode === 'direct' ? 'on' : ''}">I know cells/mL</button></div>
    <div class="fields" id="hemo">
      <div class="field"><label for="p-counted">Cells counted <span class="muted" style="font-weight:400">(live)</span></label><input id="p-counted" name="counted" type="text" inputmode="numeric" value="${esc(st.counted)}" placeholder="—" />${active ? `<button class="chip" id="use-counter" style="min-height:40px;font-size:12px">${esc(active.name)}: ${active.n}</button>` : ''}</div>
      <div class="field"><label for="p-dead">Dead <span class="muted" style="font-weight:400">(optional)</span></label><input id="p-dead" name="dead" type="text" inputmode="numeric" value="${esc(st.dead)}" placeholder="—" /></div>
      <div class="field"><label for="p-squares">Large squares counted</label><input id="p-squares" name="squares" type="text" inputmode="numeric" value="${esc(st.squares)}" /></div>
      <div class="field"><label for="p-dil">Dilution <span class="muted" style="font-weight:400">(1:2 with trypan = 2)</span></label><input id="p-dil" name="dilution" type="text" inputmode="decimal" value="${esc(st.dilution)}" /><span class="unit" style="border:0;background:transparent;box-shadow:none">×</span></div>
    </div>
    <div class="fields" id="direct" hidden>
      <div class="field"><label for="p-direct">Suspension</label><input id="p-direct" name="direct" type="text" inputmode="decimal" value="${esc(st.direct)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">cells/mL</span></div>
    </div>
    <div class="fields" style="padding-top:12px"><div class="field"><label for="p-vol">Suspension volume you have <span class="muted" style="font-weight:400">(optional)</span></label><input id="p-vol" name="volume" type="text" inputmode="decimal" value="${esc(st.volume)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">mL</span></div></div>
    <div class="result" id="count-out" hidden style="display:flex;align-items:center;gap:14px"><div id="count-seg"></div><div><div class="cap" style="color:inherit;opacity:0.8;text-transform:none">cells / mL</div><div id="count-note" style="font-size:14px"></div></div></div>

    <div class="cap" style="padding-top:26px">2 · Seed</div>
    <div class="fields" style="padding-top:8px">
      <div class="field"><label for="p-v">Vessel</label><select id="p-v" name="id" class="unit" style="min-width:150px">${V.map((v) => `<option value="${v.id}" ${v.id === st.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="seg-ctl" style="margin-top:0" id="by"><button data-b="well" class="${st.by === 'well' ? 'on' : ''}">cells per well</button><button data-b="cm2" class="${st.by === 'cm2' ? 'on' : ''}">cells per cm²</button></div>
      <div class="field" id="f-well"><label for="p-pw">Cells per well</label><input id="p-pw" name="perWell" type="text" inputmode="numeric" value="${esc(st.perWell)}" placeholder="—" /></div>
      <div class="field" id="f-cm2" hidden><label for="p-d">Density</label><input id="p-d" name="density" type="text" inputmode="numeric" value="${esc(st.density)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">/cm²</span></div>
      <div class="field"><label for="p-w">Wells to seed</label><input id="p-w" name="wells" type="text" inputmode="numeric" value="${esc(st.wells)}" placeholder="—" /></div>
      <div class="field"><label for="p-wv">Volume per well <span class="muted" style="font-weight:400" id="wv-hint"></span></label><input id="p-wv" name="wellVol" type="text" inputmode="decimal" value="${esc(st.wellVol)}" placeholder="—" /><span class="unit" style="border:0;background:transparent;box-shadow:none">mL</span></div>
    </div>
    <div class="result" id="plan" hidden>
      <div class="cap" style="color:inherit;opacity:0.8">Per well</div>
      <div class="big o"><span class="n" id="pl-susp"></span><span class="u">µL cells</span><span class="n" id="pl-med" style="margin-left:12px"></span><span class="u">µL medium</span></div>
      <div class="cap" style="color:inherit;opacity:0.8;margin-top:14px">Master mix · + 10 %</div>
      <p id="pl-mix" style="margin-top:6px;font-size:18px"></p>
      <p id="pl-check" style="font-size:15px"></p>
    </div>
    <div class="section"><div class="cap">Growth areas</div>
      <table class="data"><tr><th>Vessel</th><th style="text-align:right">cm²</th><th style="text-align:right">Volume</th></tr>
        ${V.map((v) => `<tr data-id="${v.id}" style="cursor:pointer"><td>${esc(v.name)}</td><td class="num">${v.area_cm2}</td><td class="num muted">${v.working_volume_ml[0]}–${v.working_volume_ml[1]} mL</td></tr>`).join('')}
      </table>
      <div class="note">${esc(vessels.note)}</div>
    </div>
  `);
  const persist = () => { $$<HTMLInputElement | HTMLSelectElement>(main, 'input[name], select[name]').forEach((i) => ((st as any)[i.name] = i.value)); save('plates2', st); };
  const cellsPerMl = (): number | undefined => {
    if (st.countMode === 'direct') { const d = parseNum(st.direct); return d && d > 0 ? d : undefined; }
    const n = parseNum(st.counted), sq = parseNum(st.squares) || 4, dil = parseNum(st.dilution) || 1;
    return n && n > 0 ? hemocytometer(n, sq, dil) : undefined;
  };
  function paint() {
    persist();
    $(main, '#hemo').hidden = st.countMode !== 'hemo'; $(main, '#direct').hidden = st.countMode !== 'direct';
    $(main, '#f-well').hidden = st.by !== 'well'; $(main, '#f-cm2').hidden = st.by !== 'cm2';
    const v = V.find((x) => x.id === st.id)!;
    $(main, '#wv-hint').textContent = `(${v.working_volume_ml[0]}–${v.working_volume_ml[1]} mL typical)`;
    const c = cellsPerMl(); const co = $(main, '#count-out'); co.hidden = c === undefined;
    if (c !== undefined) {
      $(main, '#count-seg').innerHTML = sevenSeg(c >= 1e6 ? `${fmt(c / 1e6, 3)}` : fmt(c, 3), { height: 34 }) ;
      const dead = parseNum(st.dead), live = parseNum(st.counted), vol = parseNum(st.volume);
      const parts: string[] = [];
      if (c >= 1e6) parts.push(`× 10⁶`);
      if (st.countMode === 'hemo' && dead && live) parts.push(`viability ${fmt((live / (live + dead)) * 100, 3)} %`);
      if (vol) parts.push(`${fmtInt(c * vol)} cells in ${fmt(vol)} mL`);
      $(main, '#count-note').textContent = parts.join(' · ') || `${fmtInt(c)} cells/mL`;
    }
    const wells = parseNum(st.wells), wellVol = parseNum(st.wellVol) || v.working_volume_ml[0];
    const perWell = st.by === 'well' ? parseNum(st.perWell) : (parseNum(st.density) ?? 0) * v.area_cm2;
    const plan = $(main, '#plan'); plan.hidden = !(c && perWell && wells);
    if (!c || !perWell || !wells) return;
    const p = seedPlan({ cellsPerMl: c, cellsPerWell: perWell, wells, wellVolume_mL: wellVol, available_mL: parseNum(st.volume) || undefined });
    $(main, '#pl-susp').textContent = fmt(p.suspPerWell_mL * 1000, 3); $(main, '#pl-med').textContent = fmt(p.mediumPerWell_mL * 1000, 3);
    $(main, '#pl-mix').innerHTML = `Mix <b>${fmt(p.totalSusp_mL, 3)} mL</b> cells + <b>${fmt(p.totalMedium_mL, 3)} mL</b> medium, dispense <b>${fmt(wellVol, 3)} mL</b> per well × ${wells}.`;
    const over = p.suspPerWell_mL > wellVol;
    $(main, '#pl-check').innerHTML = over ? `<span style="color:var(--danger)">Suspension is too dilute: ${fmt(p.suspPerWell_mL * 1000, 3)} µL of cells does not fit in ${fmt(wellVol * 1000, 3)} µL. Spin down and resuspend in less.</span>`
      : p.available !== undefined ? (p.enough ? `You have ${fmtInt(p.available)} cells, you need ${fmtInt(p.totalCells)}. <span style="color:var(--teal)">Enough</span>, ${fmtInt(p.available - p.totalCells)} spare.` : `<span style="color:var(--danger)">Short: you have ${fmtInt(p.available)} cells, you need ${fmtInt(p.totalCells)}.</span> Enough for ${Math.floor(p.available / perWell)} wells.`)
      : `${fmtInt(p.totalCells)} cells in total (${fmtInt(perWell)} per well${st.by === 'cm2' ? `, ${v.area_cm2} cm²` : ''}).`;
  }
  $$(main, 'input[name], select[name]').forEach((i) => i.addEventListener('input', paint));
  $(main, '#cmode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.countMode = b.dataset.m as State['countMode']; $$(main, '#cmode button').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
  $(main, '#by').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.by = b.dataset.b as State['by']; $$(main, '#by button').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
  main.querySelector('#use-counter')?.addEventListener('click', () => { $<HTMLInputElement>(main, '#p-counted').value = String(active!.n); paint(); });
  $(main, 'table').addEventListener('click', (e) => { const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]'); if (!tr) return; $<HTMLSelectElement>(main, '#p-v').value = tr.dataset.id!; paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  paint();
}
