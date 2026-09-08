import { UNITS, FAMILY_LABEL, convert, TEMP_UNITS, convertTemp, type Family } from '../lib/units';
import { rcfFromRpm, rpmFromRcf, pmolFromNg, copiesFromNg, ngFromPmol, concFromA260, type NAKind } from '../lib/calc';
import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, esc, html, unitSelect } from '../lib/dom';

const CATS = ['volume', 'mass', 'molar', 'massconc', 'length', 'time', 'temperature', 'centrifuge', 'dna', 'a260'] as const;
type Cat = typeof CATS[number];
const LABEL: Record<Cat, string> = { ...FAMILY_LABEL as any, temperature: 'Temperature', centrifuge: '×g ↔ rpm', dna: 'DNA / RNA amount', a260: 'A260 → concentration' };
type State = { cat: Cat; vals: Record<string, string> };

export function renderConvert(main: HTMLElement) {
  const st = load<State>('convert', { cat: 'volume', vals: {} });
  main.append(html`
    <div class="chips" id="cats" style="padding-top:14px"></div>
    <div id="body"></div>
  `);
  const cats = $(main, '#cats'), body = $(main, '#body');
  function renderCats() {
    cats.innerHTML = CATS.map((c) => `<button class="chip ${c === st.cat ? 'on' : ''}" data-cat="${c}">${LABEL[c]}</button>`).join('');
  }
  cats.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return;
    st.cat = b.dataset.cat as Cat; save('convert', st); renderCats(); renderBody();
  });
  const v = (k: string, d = '') => st.vals[k] ?? d;
  const persist = () => { $$<HTMLInputElement | HTMLSelectElement>(body, 'input, select').forEach((i) => (st.vals[st.cat + '.' + i.name] = i.value)); save('convert', st); };
  const g = (k: string) => st.vals[st.cat + '.' + k];

  function renderBody() {
    body.innerHTML = '';
    const c = st.cat;
    if (c === 'temperature' || c in UNITS) {
      const units = c === 'temperature' ? [...TEMP_UNITS] : Object.keys(UNITS[c as Family]);
      body.append(html`
        <div class="fields">
          <div class="field"><label for="c-in">Value</label><input id="c-in" name="in" type="text" inputmode="decimal" value="${esc(v(c + '.in', '1'))}" />${unitSelect('u', units, v(c + '.u', units[Math.min(1, units.length - 1)]))}</div>
        </div>
        <table class="data" id="out"></table>`);
      const out = $(body, '#out');
      const upd = () => {
        persist();
        const x = parseNum(g('in') ?? ''); const from = g('u')!;
        out.innerHTML = units.filter((u) => u !== from).map((u) => {
          const y = x === undefined || Number.isNaN(x) ? undefined : c === 'temperature' ? convertTemp(x, from, u) : convert(x, from, u);
          return `<tr><td class="num" style="font-size:20px">${y === undefined ? '—' : fmt(y, 6)}</td><td>${esc(u)}</td></tr>`;
        }).join('');
      };
      $$(body, 'input, select').forEach((i) => i.addEventListener('input', upd)); upd();
      return;
    }
    if (c === 'centrifuge') {
      body.append(html`
        <div class="fields">
          <div class="field"><label for="c-r">Rotor radius <span class="muted">(centre to tube bottom)</span></label><input id="c-r" name="r" type="text" inputmode="decimal" value="${esc(v(c + '.r', '8.5'))}" /><span class="unit" style="border:0;background:transparent">cm</span></div>
          <div class="field"><label for="c-rpm">Speed</label><input id="c-rpm" name="rpm" type="text" inputmode="decimal" value="${esc(v(c + '.rpm', ''))}" /><span class="unit" style="border:0;background:transparent">rpm</span></div>
          <div class="field"><label for="c-rcf">Force</label><input id="c-rcf" name="rcf" type="text" inputmode="decimal" value="${esc(v(c + '.rcf', ''))}" /><span class="unit" style="border:0;background:transparent">×g</span></div>
          <div class="hint">Type in either speed or force. The other follows.</div>
        </div>
        <div class="note">Rotor radius is on the rotor's datasheet, or measure from the axis to the bottom of the tube. A typical microcentrifuge rotor is about 8.5 cm; a swing-bucket plate rotor 10 to 16 cm.</div>`);
      const r = $<HTMLInputElement>(body, '[name=r]'), rpm = $<HTMLInputElement>(body, '[name=rpm]'), rcf = $<HTMLInputElement>(body, '[name=rcf]');
      const calc = (src: 'rpm' | 'rcf') => {
        const rr = parseNum(r.value); if (!rr) return;
        if (src === 'rpm') { const x = parseNum(rpm.value); rcf.value = x ? fmt(rcfFromRpm(x, rr), 4) : ''; }
        else { const x = parseNum(rcf.value); rpm.value = x ? fmt(rpmFromRcf(x, rr), 4) : ''; }
        persist();
      };
      let last: 'rpm' | 'rcf' = g('last') === 'rcf' ? 'rcf' : 'rpm';
      rpm.addEventListener('input', () => { last = 'rpm'; st.vals[c + '.last'] = last; calc('rpm'); });
      rcf.addEventListener('input', () => { last = 'rcf'; st.vals[c + '.last'] = last; calc('rcf'); });
      r.addEventListener('input', () => calc(last));
      return;
    }
    if (c === 'dna') {
      body.append(html`
        <div class="seg" id="kind">${(['dsDNA', 'ssDNA', 'RNA'] as NAKind[]).map((k) => `<button data-k="${k}" class="${(g('kind') ?? 'dsDNA') === k ? 'on' : ''}">${k}</button>`).join('')}</div>
        <div class="fields">
          <div class="field"><label for="c-len">Length</label><input id="c-len" name="len" type="text" inputmode="decimal" value="${esc(v(c + '.len', ''))}" /><span class="unit" style="border:0;background:transparent" id="lenu">bp</span></div>
          <div class="field"><label for="c-ng">Amount</label><input id="c-ng" name="ng" type="text" inputmode="decimal" value="${esc(v(c + '.ng', ''))}" /><span class="unit" style="border:0;background:transparent">ng</span></div>
          <div class="field"><label for="c-pmol">Amount</label><input id="c-pmol" name="pmol" type="text" inputmode="decimal" value="${esc(v(c + '.pmol', ''))}" /><span class="unit" style="border:0;background:transparent">pmol</span></div>
        </div>
        <div class="result"><div class="big t"><span class="n" id="copies">—</span><span class="u">copies</span></div><p class="muted" id="dna-note"></p></div>`);
      const kindSeg = $(body, '#kind'), len = $<HTMLInputElement>(body, '[name=len]'), ng = $<HTMLInputElement>(body, '[name=ng]'), pmol = $<HTMLInputElement>(body, '[name=pmol]');
      const kind = (): NAKind => (g('kind') as NAKind) ?? 'dsDNA';
      const upd = (src: 'ng' | 'pmol') => {
        const L = parseNum(len.value); if (!L) return;
        if (src === 'ng') { const x = parseNum(ng.value); pmol.value = x ? fmt(pmolFromNg(x, L, kind())) : ''; }
        else { const x = parseNum(pmol.value); ng.value = x ? fmt(ngFromPmol(x, L, kind())) : ''; }
        const n = parseNum(ng.value);
        $(body, '#copies').textContent = n ? fmt(copiesFromNg(n, L, kind()), 3) : '—';
        $(body, '#dna-note').textContent = `${kind()}: ${kind() === 'dsDNA' ? 660 : kind() === 'ssDNA' ? 330 : 340} g/mol per ${kind() === 'dsDNA' ? 'base pair' : 'nucleotide'}.`;
        persist();
      };
      let last: 'ng' | 'pmol' = 'ng';
      ng.addEventListener('input', () => { last = 'ng'; upd('ng'); }); pmol.addEventListener('input', () => { last = 'pmol'; upd('pmol'); });
      len.addEventListener('input', () => upd(last));
      kindSeg.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return;
        st.vals[c + '.kind'] = b.dataset.k!; $$(kindSeg, 'button').forEach((x) => x.classList.toggle('on', x === b));
        $(body, '#lenu').textContent = b.dataset.k === 'dsDNA' ? 'bp' : 'nt'; upd(last);
      });
      upd('ng');
      return;
    }
    if (c === 'a260') {
      body.append(html`
        <div class="seg" id="kind">${(['dsDNA', 'ssDNA', 'RNA'] as const).map((k) => `<button data-k="${k}" class="${(g('kind') ?? 'dsDNA') === k ? 'on' : ''}">${k}</button>`).join('')}</div>
        <div class="fields">
          <div class="field"><label for="c-a">A260</label><input id="c-a" name="a" type="text" inputmode="decimal" value="${esc(v(c + '.a', ''))}" /></div>
          <div class="field"><label for="c-d">Dilution factor</label><input id="c-d" name="d" type="text" inputmode="decimal" value="${esc(v(c + '.d', '1'))}" /><span class="unit" style="border:0;background:transparent">×</span></div>
        </div>
        <div class="result"><div class="big o"><span class="n" id="conc">—</span><span class="u">ng/µL</span></div><p class="muted" id="a-note"></p></div>`);
      const upd = () => {
        persist();
        const kind = (g('kind') ?? 'dsDNA') as 'dsDNA' | 'ssDNA' | 'RNA';
        const a = parseNum(g('a') ?? ''), d = parseNum(g('d') ?? '') || 1;
        $(body, '#conc').textContent = a ? fmt(concFromA260(a, kind, d)) : '—';
        $(body, '#a-note').textContent = `1 A260 unit = ${{ dsDNA: 50, ssDNA: 33, RNA: 40 }[kind]} µg/mL ${kind}, 1 cm path.`;
      };
      $$(body, 'input').forEach((i) => i.addEventListener('input', upd));
      $(body, '#kind').addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return;
        st.vals[c + '.kind'] = b.dataset.k!; $$(body, '#kind button').forEach((x) => x.classList.toggle('on', x === b)); upd();
      });
      upd();
    }
  }
  renderCats(); renderBody();
}
