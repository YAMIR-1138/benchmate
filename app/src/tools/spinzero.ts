import { canBalance, findBalanced, isBalanced, primeFactors, rotate, sum } from '../lib/rotor';
import { load, save } from '../lib/store';
import { $, $$, html, toast, vibrate } from '../lib/dom';
import { sevenSeg } from '../lib/sevenseg';

const ROTORS = [6, 8, 12, 16, 18, 24, 30, 36];
type State = { n: number; k: number; mode: 'auto' | 'manual'; slots: number[] };

export function renderSpinZero(main: HTMLElement) {
  const st = load<State>('spinzero', { n: 24, k: 5, mode: 'auto', slots: [] });
  main.append(html`
    <div class="seg-ctl" id="mode"><button data-m="auto" class="${st.mode === 'auto' ? 'on' : ''}">Balance for me</button><button data-m="manual" class="${st.mode === 'manual' ? 'on' : ''}">I'll place them</button></div>
    <div class="section" style="padding-top:14px"><div class="cap">Rotor slots</div><div class="chips" id="rotors"></div></div>
    <div class="fields" id="kfield">
      <div class="field"><label for="sz-k">Tubes to spin</label>
        <button class="btn" id="k-minus" style="flex:0 0 48px;min-height:44px;padding:0">−</button>
        <input id="sz-k" type="text" inputmode="numeric" value="${st.k}" style="width:70px" />
        <button class="btn" id="k-plus" style="flex:0 0 48px;min-height:44px;padding:0">+</button>
      </div>
    </div>
    <div id="rotor" style="margin-top:16px"></div>
    <div class="result" style="margin-top:14px;padding:12px 16px;display:flex;align-items:center;gap:14px">
      <div id="sigma"></div>
      <div style="flex:1 1 auto"><div class="cap" style="color:inherit;opacity:0.8">Σ spin</div><div id="status" style="font-family:var(--display);font-size:20px;line-height:1.15"></div></div>
    </div>
    <div class="actions" id="acts"></div>
    <div class="note" id="why"></div>
  `);
  const rotorBox = $(main, '#rotor'), kIn = $<HTMLInputElement>(main, '#sz-k'), rotors = $(main, '#rotors'), acts = $(main, '#acts');

  function persist() { save('spinzero', st); }
  function auto(reshuffle = false) {
    const r = findBalanced(st.n, st.k, reshuffle ? Math.random : () => 0.5);
    st.slots = r ? r.slots : [];
    return !!r;
  }
  function paintRotors() {
    rotors.innerHTML = ROTORS.map((n) => `<button class="chip ${n === st.n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('') + `<input id="sz-n" type="text" inputmode="numeric" placeholder="other" value="${ROTORS.includes(st.n) ? '' : st.n}" style="width:76px;min-height:42px;padding:0 10px;font-family:var(--mono);text-align:center" />`;
    $<HTMLInputElement>(main, '#sz-n').addEventListener('change', (e) => { const v = Number((e.target as HTMLInputElement).value); if (v >= 2 && v <= 96) { st.n = Math.round(v); st.k = Math.min(st.k, st.n); st.slots = []; kIn.value = String(st.k); if (st.mode === 'auto') auto(); paintRotors(); paint(); } });
  }
  function drawRotor() {
    const n = st.n, R = 150, ring = 104, sr = Math.max(6, Math.min(15, (Math.PI * ring) / n * 0.7));
    const filled = new Set(st.slots);
    const v = sum(n, st.slots);
    const scale = 40; const ax = R + v.x * scale, ay = R + v.y * scale;
    const slots = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2; const x = R + ring * Math.cos(a), y = R + ring * Math.sin(a);
      const on = filled.has(i);
      return `<g class="slot" data-i="${i}" style="cursor:${st.mode === 'manual' ? 'pointer' : 'default'}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sr}" fill="${on ? 'var(--orange)' : 'var(--lcd)'}" stroke="var(--line)" stroke-width="2.5"/>
        ${on ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(sr * 0.45).toFixed(1)}" fill="var(--line)" opacity="0.35"/>` : ''}
        ${n <= 24 ? `<text x="${(R + (ring + sr + 11) * Math.cos(a)).toFixed(1)}" y="${(R + (ring + sr + 11) * Math.sin(a) + 3.5).toFixed(1)}" font-size="10" font-family="var(--mono)" text-anchor="middle" fill="var(--muted)">${i + 1}</text>` : ''}
      </g>`;
    }).join('');
    const balanced = st.slots.length > 0 && v.mag < 1e-6;
    const arrow = st.slots.length && !balanced ? `<line x1="${R}" y1="${R}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="var(--danger)" stroke-width="4" stroke-linecap="round"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="6" fill="var(--danger)"/>` : '';
    rotorBox.innerHTML = `<svg viewBox="0 0 300 300" style="width:100%;max-width:340px;display:block;margin:0 auto">
      <circle cx="${R}" cy="${R}" r="138" fill="var(--panel)" stroke="var(--line)" stroke-width="3"/>
      <circle cx="${R}" cy="${R}" r="${ring}" fill="none" stroke="var(--line-soft)" stroke-width="1.5" stroke-dasharray="3 5"/>
      <circle cx="${R}" cy="${R}" r="18" fill="var(--panel)" stroke="var(--line)" stroke-width="3"/>
      <circle cx="${R}" cy="${R}" r="4" fill="${balanced ? 'var(--teal)' : 'var(--line)'}"/>
      ${arrow}${slots}
    </svg>`;
    if (st.mode === 'manual') $$(rotorBox, '.slot').forEach((g) => g.addEventListener('pointerdown', (e) => { e.preventDefault(); const i = Number((g as HTMLElement).dataset.i); const idx = st.slots.indexOf(i); if (idx >= 0) st.slots.splice(idx, 1); else st.slots.push(i); st.slots.sort((a, b) => a - b); st.k = st.slots.length; kIn.value = String(st.k); vibrate(10); paint(); }));
  }
  function paint() {
    persist();
    $$(main, '#mode button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.m === st.mode));
    $$(rotors, '.chip').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.n) === st.n));
    drawRotor();
    const v = sum(st.n, st.slots), possible = canBalance(st.n, st.k);
    const balanced = st.slots.length > 0 && isBalanced(st.n, st.slots);
    const sigma = $(main, '#sigma'), status = $(main, '#status'), why = $(main, '#why');
    sigma.innerHTML = sevenSeg(balanced || st.slots.length === 0 ? '0.00' : v.mag.toFixed(2).slice(0, 5), { height: 34 });
    if (st.slots.length === 0) { status.textContent = st.mode === 'manual' ? 'Tap slots to place tubes' : possible ? 'Ready' : `${st.k} tubes cannot balance in ${st.n}`; }
    else if (balanced) status.textContent = `Balanced · ${st.slots.length} tube${st.slots.length === 1 ? '' : 's'} in ${st.n}`;
    else status.textContent = st.mode === 'manual' ? 'Off balance' : 'No arrangement found';
    status.style.color = balanced ? 'var(--teal)' : st.slots.length ? 'var(--danger)' : 'inherit';
    const primes = primeFactors(st.n);
    why.innerHTML = possible
      ? `Slots used: <span class="mono">${st.slots.map((s) => s + 1).join(', ') || '—'}</span>. A ${st.n}-slot rotor balances any set built from regular ${primes.map((p) => `${p}-gons`).join(' and ')}.`
      : `${st.k} tubes cannot be balanced in ${st.n} slots. Both the tubes and the empty slots must be sums of ${primes.join(' and ')}. Add a balance tube: ${[st.k + 1, st.k + 2, st.k - 1].filter((x) => x > 0 && x <= st.n && canBalance(st.n, x)).slice(0, 2).join(' or ') || 'none nearby'} works.`;
    acts.innerHTML = st.mode === 'auto'
      ? `<button class="btn primary" id="another">Another layout</button><button class="btn" id="turn">Turn</button>`
      : `<button class="btn primary" id="fix">Balance it</button><button class="btn quiet" id="clear">Clear</button>`;
    acts.querySelector('#another')?.addEventListener('click', () => { if (!auto(true)) toast('Not possible'); paint(); });
    acts.querySelector('#turn')?.addEventListener('click', () => { st.slots = rotate(st.n, st.slots); paint(); });
    acts.querySelector('#fix')?.addEventListener('click', () => { st.k = st.slots.length || st.k; if (!auto(true)) toast(`${st.k} tubes cannot balance in ${st.n}`); kIn.value = String(st.k); paint(); });
    acts.querySelector('#clear')?.addEventListener('click', () => { st.slots = []; paint(); });
  }
  const setK = (k: number) => { st.k = Math.max(0, Math.min(st.n, Math.round(k))); kIn.value = String(st.k); if (st.mode === 'auto') auto(); paint(); };
  $(main, '#k-minus').addEventListener('click', () => setK(st.k - 1));
  $(main, '#k-plus').addEventListener('click', () => setK(st.k + 1));
  kIn.addEventListener('input', () => { const v = Number(kIn.value); if (Number.isFinite(v)) { st.k = Math.max(0, Math.min(st.n, Math.round(v))); if (st.mode === 'auto') auto(); paint(); } });
  rotors.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; st.n = Number(b.dataset.n); st.k = Math.min(st.k, st.n); kIn.value = String(st.k); st.slots = st.mode === 'auto' ? [] : st.slots.filter((s) => s < st.n); if (st.mode === 'auto') auto(); paintRotors(); paint(); });
  $(main, '#mode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; st.mode = b.dataset.m as State['mode']; if (st.mode === 'auto') auto(); paint(); });
  if (st.mode === 'auto' && st.slots.length === 0) auto();
  paintRotors(); paint();
}
