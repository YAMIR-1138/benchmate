import { timerEngine, type Timer } from './timerEngine';
import { mmss, parseDuration } from '../lib/fmt';
import { $, $$, esc, html, toast } from '../lib/dom';
import { sevenSeg } from '../lib/sevenseg';

const PRESETS: [string, number][] = [['30 s', 30e3], ['1 min', 60e3], ['2 min', 120e3], ['5 min', 300e3], ['10 min', 600e3], ['15 min', 900e3], ['30 min', 1800e3], ['1 h', 3600e3]];
const R = 112, C = 2 * Math.PI * R;
const TICKS = Array.from({ length: 60 }, (_, i) => { const a = (i * 6 - 90) * Math.PI / 180, big = i % 5 === 0, r1 = big ? 122 : 126, r2 = 132; return `<line x1="${(134 + r1 * Math.cos(a)).toFixed(1)}" y1="${(134 + r1 * Math.sin(a)).toFixed(1)}" x2="${(134 + r2 * Math.cos(a)).toFixed(1)}" y2="${(134 + r2 * Math.sin(a)).toFixed(1)}" stroke="${big ? 'var(--text)' : 'var(--line-soft)'}" stroke-width="${big ? 2 : 1}"/>`; }).join('');

export function renderTimer(main: HTMLElement) {
  let focus: Timer | undefined = timerEngine.timers[0];
  main.append(html`
    <div class="ring">
      <svg class="dial" viewBox="0 0 268 268">${TICKS}<g transform="rotate(-90 134 134)"><circle cx="134" cy="134" r="${R}" fill="none" stroke="var(--line)" stroke-width="5"/><circle id="arc" cx="134" cy="134" r="${R}" fill="none" stroke="var(--orange)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></g></svg>
      <div class="in"><div class="t" id="big">${sevenSeg("00:00", { height: 74 })}</div><div class="l" id="lab">no timer</div><div class="s" id="sub"></div></div>
    </div>
    <div class="actions" id="ctl" style="padding:0 8px"></div>
    <div class="section"><div class="cap">Presets</div><div class="chips" id="presets"></div>
      <div class="custom"><input id="c-label" type="text" placeholder="label (optional)" /></div>
      <div class="custom"><input id="c-dur" type="text" inputmode="numeric" placeholder="5m · 1h30m · 2:30" /><button class="btn primary" id="c-go" style="flex:0 0 96px">Start</button></div>
    </div>
    <div class="section" id="all"><div class="cap">All timers</div><div class="list" id="list"></div></div>
    <div class="note" id="ios" hidden>On iPhone the alarm only sounds while BenchMate is open. The screen stays awake while a timer runs.</div>
  `);
  const presets = $(main, '#presets');
  presets.innerHTML = PRESETS.map(([l, ms]) => `<button class="chip" data-ms="${ms}">${l}</button>`).join('');
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  $(main, '#ios').hidden = !isIOS;

  const big = $(main, '#big'), lab = $(main, '#lab'), sub = $(main, '#sub'), arc = $(main, '#arc'), ctl = $(main, '#ctl'), list = $(main, '#list');

  function paint() {
    const ts = timerEngine.timers;
    if (focus && !ts.includes(focus)) focus = ts[0];
    if (!focus) focus = ts[0];
    if (!focus) { big.innerHTML = sevenSeg('00:00', { height: 74 }); big.classList.remove('done'); lab.textContent = 'no timer'; sub.textContent = ''; arc.setAttribute('stroke-dashoffset', String(C)); ctl.innerHTML = ''; }
    else {
      const rem = timerEngine.remaining(focus);
      big.innerHTML = sevenSeg(mmss(rem), { height: rem >= 3600000 ? 54 : 74 }); big.classList.toggle('done', focus.done);
      lab.textContent = focus.done ? `${focus.label} · done` : focus.label; sub.textContent = focus.endAt ? `of ${mmss(focus.durationMs)}` : focus.done ? '' : 'paused';
      arc.setAttribute('stroke-dashoffset', String(C * (rem / focus.durationMs)));
      ctl.innerHTML = focus.done ? `<button class="btn orange tall" data-a="dismiss">Dismiss</button><button class="btn tall" data-a="again">Again</button>`
        : focus.endAt ? `<button class="btn orange tall" data-a="pause" style="flex:2">Pause</button><button class="btn tall" data-a="reset">Reset</button>`
        : `<button class="btn primary tall" data-a="resume" style="flex:2">Resume</button><button class="btn tall" data-a="reset">Reset</button>`;
    }
    $(main, '#all').hidden = ts.length === 0;
    list.innerHTML = ts.map((t) => `<div class="item timer-row ${t.done ? 'done' : t.endAt ? '' : 'paused'}" data-id="${t.id}" style="cursor:pointer;${t === focus ? 'font-weight:700' : ''}"><span class="dot"></span><span class="grow">${esc(t.label)}</span><span class="t">${t.done ? 'done' : mmss(timerEngine.remaining(t))}</span><button class="x" data-x="${t.id}" aria-label="remove">×</button></div>`).join('');
  }
  const off = timerEngine.onChange(paint);
  (main as any).__cleanup = off;

  ctl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b || !focus) return;
    const a = b.dataset.a;
    if (a === 'pause') timerEngine.pause(focus); else if (a === 'resume') timerEngine.resume(focus); else if (a === 'reset') timerEngine.reset(focus);
    else if (a === 'dismiss') timerEngine.dismiss(focus); else if (a === 'again') { const d = focus.durationMs, l = focus.label; timerEngine.dismiss(focus); focus = timerEngine.add(d, l); }
    paint();
  });
  const startTimer = (ms: number, label: string) => { focus = timerEngine.add(ms, label || mmss(ms)); timerEngine.requestNotifications(); paint(); };
  presets.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return;
    startTimer(Number(b.dataset.ms), $<HTMLInputElement>(main, '#c-label').value.trim());
  });
  const go = () => {
    const ms = parseDuration($<HTMLInputElement>(main, '#c-dur').value);
    if (!ms) { toast('Try 5m, 1h30m or 2:30'); return; }
    startTimer(ms, $<HTMLInputElement>(main, '#c-label').value.trim()); $<HTMLInputElement>(main, '#c-dur').value = '';
  };
  $(main, '#c-go').addEventListener('click', go);
  $<HTMLInputElement>(main, '#c-dur').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  list.addEventListener('click', (e) => {
    const x = (e.target as HTMLElement).closest<HTMLElement>('[data-x]');
    if (x) { const t = timerEngine.timers.find((t) => t.id === x.dataset.x); if (t) timerEngine.remove(t); paint(); return; }
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-id]'); if (!row) return;
    focus = timerEngine.timers.find((t) => t.id === row.dataset.id); paint();
  });
  $$(main, '.chip, .btn').forEach((b) => b.addEventListener('pointerdown', () => timerEngine.unlockAudio(), { once: true }));
  paint();
}
