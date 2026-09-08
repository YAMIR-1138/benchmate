import { load, save } from '../lib/store';
import { $, esc, html, vibrate } from '../lib/dom';

interface Counter { id: string; name: string; n: number }
type State = { counters: Counter[]; active: string };

export function renderCounter(main: HTMLElement) {
  const st = load<State>('counter', { counters: [{ id: 'a', name: 'Plate 1', n: 0 }], active: 'a' });
  main.append(html`
    <div class="count-head"><input id="name" type="text" style="text-align:center;font-size:14px;letter-spacing:0.15em;text-transform:uppercase;color:var(--teal);background:transparent;border:0;min-height:36px;width:100%" /><div class="n" id="n">0</div><div class="mono muted" id="others" style="font-size:13px"></div></div>
    <div class="tapzone" id="tap"><div class="big">tap anywhere</div><div class="cap">+1</div></div>
    <div class="actions"><button class="btn tall" id="minus">−1</button><button class="btn tall quiet" id="reset">Reset</button><button class="btn tall orange" id="next" style="flex:1.4">Next</button></div>
    <div class="chips" id="chips" style="padding-top:14px"></div>
  `);
  const cur = () => st.counters.find((c) => c.id === st.active) ?? st.counters[0];
  const nEl = $(main, '#n'), name = $<HTMLInputElement>(main, '#name'), chips = $(main, '#chips'), others = $(main, '#others');
  function paint() {
    const c = cur(); st.active = c.id; save('counter', st);
    nEl.textContent = String(c.n); name.value = c.name;
    others.textContent = st.counters.filter((x) => x !== c).map((x) => `${x.name}: ${x.n}`).join(' · ');
    chips.innerHTML = st.counters.map((x) => `<button class="chip ${x === c ? 'on' : ''}" data-id="${x.id}">${esc(x.name)} <span class="mono">${x.n}</span></button>`).join('') + (st.counters.length > 1 ? `<button class="chip" id="del" style="color:var(--danger)">remove</button>` : '');
  }
  $(main, '#tap').addEventListener('pointerdown', (e) => { e.preventDefault(); cur().n++; vibrate(15); paint(); });
  $(main, '#minus').addEventListener('click', () => { cur().n = Math.max(0, cur().n - 1); vibrate(30); paint(); });
  $(main, '#reset').addEventListener('click', () => { if (cur().n === 0 || confirm(`Reset ${cur().name} to 0?`)) { cur().n = 0; paint(); } });
  $(main, '#next').addEventListener('click', () => {
    const m = cur().name.match(/^(.*?)(\d+)$/);
    const nm = m ? `${m[1]}${Number(m[2]) + 1}` : `${cur().name} 2`;
    const c = { id: Math.random().toString(36).slice(2, 8), name: nm, n: 0 }; st.counters.push(c); st.active = c.id; paint();
  });
  name.addEventListener('input', () => { cur().name = name.value; save('counter', st); });
  name.addEventListener('change', paint);
  chips.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return;
    if (b.id === 'del') { if (confirm(`Remove ${cur().name}?`)) { st.counters = st.counters.filter((x) => x.id !== st.active); st.active = st.counters[0].id; paint(); } return; }
    st.active = b.dataset.id!; paint();
  });
  paint();
}
