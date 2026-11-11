import { TOOLS, pins, toggleTheme, type Tool } from '../main';
import { icons } from '../lib/icons';
import { $, el, esc, toast } from '../lib/dom';
import { timerEngine } from './timerEngine';
import { mmss } from '../lib/fmt';
import { load } from '../lib/store';
import { ask } from '../lib/ask';
import { activeExp } from '../lib/log';
import { party } from '../lib/party';
import logo from '../assets/logo.png';

const HINTS = ['1:10 in 500 µL', '10x to 1x 50 mL', '5 min spin', '5 mM from 1 M 10 mL', '37 C to F', '250 µL in mL', '12 * 1.1', 'rotor'];
const RNA = 'roche-high-pure-rna';

/** The qPCR workflow, end to end: where each stage lives and whether it holds work. */
function flow(): { n: string; h: string; on: boolean }[] {
  const has = (k: string, f: (v: any) => boolean) => { const v = load<any>(k, null); return !!v && f(v); };
  return [
    { n: 'RNA prep', h: `#/protocols/${RNA}`, on: has(`protocol.${RNA}`, () => true) },
    { n: 'NanoDrop', h: '#/nanodrop', on: false },
    { n: 'cDNA', h: '#/cdna', on: has('cdna', (v) => v.rows?.length > 0) },
    { n: 'Plate', h: '#/platemap', on: has('platemap2', (v) => v.plates?.some((p: any) => Object.keys(p.wells ?? {}).length > 0)) },
    { n: 'Results', h: '#/results', on: has('ddct', (v) => v.wells?.length > 0) },
  ];
}

export function renderHome(app: HTMLElement, main: HTMLElement) {
  const brand = el('div', { class: 'brand phone' });
  brand.innerHTML = `
    <img src="${logo}" alt="TGGR Lab" />
    <div style="flex:1 1 auto"><div class="lab">TGGR</div><div class="word">Bench <b>Mate</b></div></div>
    <button class="iconbtn themebtn" aria-label="Toggle light/dark"></button>`;
  const tb = brand.querySelector<HTMLButtonElement>('.themebtn')!;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  tb.innerHTML = dark ? icons.sun : icons.moon;
  tb.onclick = toggleTheme;
  const img = brand.querySelector('img')!;
  img.addEventListener('click', () => { img.classList.remove('spin'); void img.offsetWidth; img.classList.add('spin'); const r = img.getBoundingClientRect(); party(r.left + r.width / 2, r.top + r.height / 2); });
  app.append(brand, el('div', { class: 'stripe' }));

  // ---- ask bar ----
  const askBox = el('div', { class: 'ask' });
  askBox.innerHTML = `<label class="askin">${icons.search}<input id="ask" type="search" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ask a quick calculation or find a tool" placeholder="Ask or find…  ${HINTS[Math.floor(Date.now() / 60000) % HINTS.length]}" /></label><div class="chips" id="hints" hidden>${HINTS.slice(0, 6).map((h) => `<button class="chip hint" type="button">${h}</button>`).join('')}</div><div id="ans" hidden></div>`;
  main.append(askBox);
  const input = $<HTMLInputElement>(askBox, '#ask'), ans = $(askBox, '#ans');

  // ---- now: running timers, the open experiment, where you were ----
  const now = el('div', { class: 'nowrow' });
  main.append(now);
  const recents = load<{ h: string; t: number }[]>('recent', []).filter((r) => Date.now() - r.t < 3 * 86400000).slice(0, 3);
  const exp = activeExp();
  function paintNow() {
    const run = timerEngine.timers.filter((t) => t.endAt || t.done).sort((a, b) => (a.done ? -1 : b.done ? 1 : a.endAt! - b.endAt!));
    const chips = run.slice(0, 3).map((t) => `<a class="chip nowc tim ${t.done ? 'done' : ''}" href="#/timer"><span class="dot"></span><span class="lbl">${esc(t.label)}</span><span class="mono">${t.done ? 'done' : mmss(timerEngine.remaining(t))}</span></a>`);
    if (exp) chips.push(`<a class="chip nowc" href="#/log">${icons.book}<span class="lbl">${esc(exp.name)}</span></a>`);
    for (const r of recents) {
      const [id, ...rest] = r.h.split('/'); const t = TOOLS.find((x) => x.id === id); if (!t) continue;
      chips.push(`<a class="chip nowc" href="#/${esc(r.h)}">${icons[t.icon]}<span class="lbl">${esc(t.name)}${id === 'protocols' && rest[1] ? ` · step ${esc(rest[1])}` : ''}</span></a>`);
    }
    now.hidden = !chips.length;
    now.innerHTML = chips.length ? `<span class="cap">Now</span>${chips.join('')}` : '';
  }
  paintNow();
  const off = timerEngine.onChange(() => { if (timerEngine.timers.some((t) => t.endAt || t.done) || now.querySelector('.tim')) paintNow(); });
  (main as any).__cleanup = off;

  // ---- qPCR workflow track ----
  const steps = flow();
  const track = el('div', { class: 'flow' });
  track.innerHTML = `<div class="cap">qPCR, start to finish</div><div class="flowrow">${steps.map((s, i) => `<a class="fstep ${s.on ? 'on' : ''}" href="${s.h}"><span class="fnode">${i + 1}</span><span class="fl">${s.n}</span></a>`).join('<span class="fline"></span>')}</div>`;
  main.append(track);

  // ---- tools ----
  const grid = el('div', { class: 'grid' });
  const none = el('div', { class: 'note' }, 'No tool by that name. Try a calculation like “1:10 in 500 µL”.'); none.hidden = true;
  main.append(grid, none);
  const pinned = pins();
  const ordered = [...TOOLS].sort((a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)));
  function paintGrid(list: Tool[]) {
    grid.innerHTML = '';
    list.forEach((t, i) => {
      const running = t.id === 'timer' ? timerEngine.timers.filter((x) => x.endAt).length : 0;
      const last = i === list.length - 1 && list.length % 2 === 1;
      const a = el('a', { class: `tile k${(i % 4) + 1}` + (last ? ' wide' : ''), href: `#/${t.id}` });
      const mark = `<span class="idx">${pinned.includes(t.id) ? '<span class="pinmark">★</span> ' : ''}${t.idx}</span>`;
      a.innerHTML = last ? `${icons[t.icon]}<div style="flex:1 1 auto"><div class="name">${t.name}</div><div class="sub">${t.sub}</div></div>${mark}` : `<div class="row">${icons[t.icon]}${mark}</div>
        <div><div class="name">${t.name}</div><div class="sub">${running ? `${running} running` : t.sub}</div></div>`;
      grid.append(a);
    });
  }
  paintGrid(ordered);

  let matches: Tool[] = ordered;
  function onAsk() {
    const q = input.value.trim(), a = ask(q);
    const lq = q.toLowerCase();
    matches = !q || a ? ordered : ordered.filter((t) => `${t.name} ${t.sub} ${t.kw ?? ''} ${t.id}`.toLowerCase().includes(lq));
    track.hidden = !!q; now.hidden = !!q || !now.innerHTML;
    ans.hidden = !a;
    if (a) ans.innerHTML = `<div class="result anscard"><div class="cap" style="color:inherit;opacity:0.8">${esc(a.title)}</div><div class="big"><span class="n">${esc(a.value)}</span></div>${a.kind === 'calc' && a.detail ? `<p>${esc(a.detail)}</p>` : ''}${a.kind === 'timer' ? '<div class="actions"><button class="btn orange" id="ans-go">Start timer</button></div>' : ''}</div>`;
    ans.querySelector('#ans-go')?.addEventListener('click', go);
    grid.hidden = !!a; none.hidden = !!a || matches.length > 0;
    if (!a) paintGrid(matches);
  }
  function go() {
    const a = ask(input.value);
    if (a?.kind === 'timer') { timerEngine.add(a.ms, a.label); timerEngine.requestNotifications(); toast(`Timer started · ${a.label}`); input.value = ''; onAsk(); paintNow(); input.blur(); }
    else if (!a && input.value.trim() && matches.length) location.hash = `#/${matches[0].id}`;
  }
  const hints = $(askBox, '#hints');
  const paintHints = () => { hints.hidden = !(document.activeElement === input && !input.value); };
  input.addEventListener('focus', paintHints); input.addEventListener('blur', () => setTimeout(paintHints, 150));
  hints.querySelectorAll<HTMLElement>('.hint').forEach((h) => { h.addEventListener('pointerdown', (e) => e.preventDefault()); h.addEventListener('click', () => { input.value = h.textContent!; input.focus(); onAsk(); paintHints(); }); });
  input.addEventListener('input', () => { onAsk(); paintHints(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });

  app.append(main);
  const foot = el('div', { class: 'foot' });
  foot.innerHTML = `<span>model BM-2 · v${__APP_VERSION__} · build ${__BUILD__.slice(5, 16)}</span><span>no ads · no accounts</span>`;
  app.append(foot);
  const credit = el('div', { class: 'credit' });
  credit.innerHTML = `made by <a href="https://yamir-1138.github.io/YAMIR-1138/" target="_blank" rel="noopener">Yamir</a> at TGGR Lab · <a href="https://yamir-1138.github.io/YAMIR-1138/" target="_blank" rel="noopener">more tools and projects</a> · built with <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude Code</a> · <a href="https://github.com/YAMIR-1138/benchmate" target="_blank" rel="noopener">source</a>`;
  app.append(credit);
}
