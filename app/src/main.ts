import './styles.css';
import { icons } from './lib/icons';
import { load, save } from './lib/store';
import { el, esc, toast } from './lib/dom';
import { mmss } from './lib/fmt';
import { renderHome } from './tools/home';
import { renderDilution } from './tools/dilution';
import { renderMolar } from './tools/molar';
import { renderConvert } from './tools/convert';
import { renderTimer } from './tools/timer';
import { renderCounter } from './tools/counter';
import { renderLadders } from './tools/ladders';
import { renderPlates } from './tools/plates';
import { renderProtocols } from './tools/protocols';
import { renderSpinZero } from './tools/spinzero';
import { renderNanodrop } from './tools/nanodrop';
import { renderLuciferase } from './tools/luciferase';
import { renderPlateMap } from './tools/platemap';
import { renderBca } from './tools/bca';
import { renderLog } from './tools/log';
import { renderCdna } from './tools/cdna';
import { renderResults } from './tools/results';
import { timerEngine } from './tools/timerEngine';
import logo from './assets/logo.png';
import { renderImport } from './tools/importer';
import { setupUpdates } from './update';

export interface Tool { kw?: string; id: string; idx: string; name: string; sub: string; icon: keyof typeof icons; render: (main: HTMLElement) => void; soon?: boolean }

export const TOOLS: Tool[] = [
  { id: 'dilution', kw: 'c1v1 stock dilute working', idx: '01', name: 'Dilution', sub: 'C1V1 = C2V2', icon: 'drop', render: renderDilution },
  { id: 'molar', kw: 'molarity weight mw grams powder', idx: '02', name: 'Molar', sub: 'mass · mol · M', icon: 'scale', render: renderMolar },
  { id: 'convert', kw: 'units rpm rcf temperature bp', idx: '03', name: 'Convert', sub: 'units, ×g ↔ rpm, DNA, A260', icon: 'swap', render: renderConvert },
  { id: 'timer', kw: 'alarm countdown stopwatch', idx: '04', name: 'Timer', sub: 'alarms, presets', icon: 'clock', render: renderTimer },
  { id: 'counter', kw: 'colony cells tally click', idx: '05', name: 'Counter', sub: 'colonies, cells', icon: 'tally', render: renderCounter },
  { id: 'plates', kw: 'seed hemocytometer cells density', idx: '06', name: 'Seeding', sub: 'count → plate', icon: 'plate', render: renderPlates },
  { id: 'platemap', kw: 'qpcr 96 384 layout master mix quantstudio', idx: '07', name: 'Plate Map', sub: 'qPCR and culture, 6 to 384', icon: 'grid', render: renderPlateMap },
  { id: 'spinzero', kw: 'centrifuge balance rotor tubes', idx: '08', name: 'ΣpinZero', sub: 'balance the rotor', icon: 'rotor', render: renderSpinZero },
  { id: 'ladders', kw: 'marker gel bp kda size', idx: '09', name: 'Ladders', sub: 'DNA · RNA · protein', icon: 'lanes', render: renderLadders },
  { id: 'nanodrop', kw: '260 280 230 purity rna dna', idx: '10', name: 'NanoDrop', sub: 'ratios and concentration', icon: 'drop2', render: renderNanodrop },
  { id: 'cdna', kw: 'reverse transcription rt rna', idx: '11', name: 'cDNA', sub: 'NanoDrop CSV → RNA, water, RT mix', icon: 'rt', render: renderCdna },
  { id: 'bca', kw: 'protein standard curve absorbance', idx: '12', name: 'BCA', sub: 'standard curve → µg/µL', icon: 'curve', render: renderBca },
  { id: 'luciferase', kw: 'reporter firefly renilla', idx: '13', name: 'Luciferase', sub: 'firefly / Renilla, fold', icon: 'flame', render: renderLuciferase },
  { id: 'results', kw: 'ddct delta ct fold expression analysis qpcr', idx: '14', name: 'qPCR Results', sub: 'Ct → fold change, ΔΔCt', icon: 'bars', render: renderResults },
  { id: 'log', kw: 'notes experiment export notebook', idx: '15', name: 'Log', sub: 'experiments, export', icon: 'book', render: renderLog },
  { id: 'protocols', kw: 'rna extraction roche worksheet western transfection', idx: '16', name: 'Protocols', sub: 'interactive worksheets, print, hand-off', icon: 'list', render: renderProtocols },
];

export const pins = () => load<string[]>('pins', []);

// ---- theme ----
type Theme = 'auto' | 'light' | 'dark';
function applyTheme(t: Theme) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
function isDark(): boolean {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
export function toggleTheme() {
  const next: Theme = isDark() ? 'light' : 'dark';
  save('theme', next); applyTheme(next);
  document.querySelectorAll('.themebtn').forEach((b) => (b.innerHTML = isDark() ? icons.sun : icons.moon));
}
applyTheme(load<Theme>('theme', 'auto'));

// ---- shell ----
export function header(title: string, idx?: string, right?: HTMLElement): HTMLElement {
  const h = el('div', { class: 'top' });
  h.append(el('a', { class: 'back', href: '#/', 'aria-label': 'Home', html: icons.back }));
  const h1 = el('h1'); h1.textContent = title;
  if (idx) h1.append(el('span', { class: 'idx' }, idx));
  h.append(h1);
  if (right) h.append(right);
  return h;
}

const app = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

// ---- wide layout (iPad, desktop): a persistent tool rail on the left ----
const rail = el('aside', { class: 'rail' });
const content = el('div', { class: 'content' });
app.append(rail, content);
function paintRail(active: string) {
  const dark = isDark();
  rail.innerHTML = `<a class="rbrand" href="#/"><img src="${logo}" alt="" /><span><span class="rlab">TGGR</span><span class="rword">Bench <b>Mate</b></span></span></a>
    <nav>${TOOLS.map((t) => `<a class="navk ${t.id === active ? 'on' : ''}" href="#/${t.id}">${icons[t.icon]}<span>${t.name}</span><span class="idx">${t.idx}</span></a>`).join('')}</nav>
    <div class="rfoot"><button class="iconbtn themebtn" aria-label="Toggle light/dark">${dark ? icons.sun : icons.moon}</button><span class="mono" title="build ${__BUILD__}">model BM-1 · v${__APP_VERSION__} · ${__BUILD__.slice(5, 10)}</span></div>`;
  rail.querySelector<HTMLButtonElement>('.themebtn')!.onclick = toggleTheme;
}

// ---- running-timer strip: label + countdown, tap to open the timer ----
const strip = el('a', { class: 'tstrip', href: '#/timer' });
strip.hidden = true;
app.append(strip);
function paintStrip() {
  const id = location.hash.replace(/^#\/?/, '').split('/')[0];
  const ts = timerEngine.timers.filter((t) => t.endAt || t.done);
  const show = ts.length > 0 && id !== 'timer' && id !== '';
  strip.hidden = !show; document.body.classList.toggle('has-strip', show);
  if (!show) return;
  const done = ts.find((t) => t.done);
  const t = done ?? ts.filter((x) => x.endAt).sort((a, b) => a.endAt! - b.endAt!)[0];
  strip.classList.toggle('done', !!done);
  strip.innerHTML = `<span class="dot"></span><span class="lbl">${esc(t.label)}</span><span class="t">${done ? 'done' : mmss(timerEngine.remaining(t))}</span>${ts.length > 1 ? `<span class="more">+${ts.length - 1}</span>` : ''}`;
}
timerEngine.onChange(paintStrip);

function route() {
  cleanup?.(); cleanup = undefined;
  const hash = location.hash.replace(/^#\/?/, '');
  const [id, ...rest] = hash.split('/');
  content.innerHTML = '';
  const main = el('main');
  const tool = TOOLS.find((t) => t.id === id);
  paintRail(tool?.id ?? '');
  if (id === 'import') {
    content.append(header('Import', undefined), el('div', { class: 'stripe' }));
    renderImport(main, rest.join('/'));
  } else if (!tool) {
    renderHome(content, main);
  } else {
    const star = el('button', { class: 'iconbtn pinbtn', 'aria-label': 'Pin to the top of the home screen', html: icons.star });
    const paintStar = () => { const on = pins().includes(tool.id); star.classList.toggle('on', on); star.setAttribute('aria-pressed', String(on)); };
    star.onclick = () => { const p = pins(); save('pins', p.includes(tool.id) ? p.filter((x) => x !== tool.id) : [...p, tool.id]); paintStar(); toast(pins().includes(tool.id) ? 'Pinned to the top of home' : 'Unpinned'); };
    paintStar();
    content.append(header(tool.name, tool.idx, star));
    save('recent', [{ h: hash, t: Date.now() }, ...load<{ h: string; t: number }[]>('recent', []).filter((r) => r.h.split('/')[0] !== tool.id)].slice(0, 4));
    content.append(el('div', { class: 'stripe' }));
    (main as any).dataset.sub = rest.join('/');
    content.append(main); // attach first so tools can measure their width on the first paint
    tool.render(main);
  }
  cleanup = (main as any).__cleanup;
  if (!main.isConnected) content.append(main);
  paintStrip();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
timerEngine.start();
route();
setupUpdates();
